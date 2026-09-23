--- Remember - Filter
--- @module "remember"
--- @license MIT
--- @copyright 2026 Mickaël Canouil
--- @author Mickaël Canouil
--- @brief Persist scroll position and slide indices across visits.
--- @description Injects `remember.js` and `remember.css` for HTML-based
--- formats, plus a small bootstrap script that exposes the resolved Quarto
--- project type (book, website, or default) and per-extension options to
--- the client. The project type is read deterministically from
--- `QUARTO_EXECUTE_INFO` so the client never has to guess from theme-specific
--- DOM selectors.

--- Extension name constant
local EXTENSION_NAME = 'remember'

--- Load modules
local html_mod = require(quarto.utils.resolve_path('_vendor/quarto-lua-modules/html.lua'):gsub('%.lua$', ''))
local log = require(quarto.utils.resolve_path('_vendor/quarto-lua-modules/logging.lua'):gsub('%.lua$', ''))
local schema = require(quarto.utils.resolve_path('_vendor/quarto-wizard/schema.lua'):gsub('%.lua$', ''))
local check = require(quarto.utils.resolve_path('_vendor/quarto-lua-modules/schema-check.lua'):gsub('%.lua$', ''))

--- The schema check, built once and reused by the whole render. It reads
--- `_schema.yml` on the way in and checks the document configuration once.
---
--- The validator is injected rather than required by the check module, so the
--- two vendored sources stay independent of where the other was placed.
---
--- The extension contributes a filter and no shortcodes, so the check runs from
--- the `Meta` handler of that filter, before the handler reads its first option.
--- There is nowhere else it could run.
---
--- A schema that cannot be read is reported by the module as an error and the
--- render carries on: a configuration file must not stop a document.
local checker = check.new(schema, EXTENSION_NAME)

-- ============================================================================
-- HELPER FUNCTIONS (PRIVATE)
-- ============================================================================

--- Resolve the Quarto project type from `QUARTO_EXECUTE_INFO`.
--- Returns one of `"book"`, `"website"`, or `"default"`.
--- `"default"` covers single documents and any project whose type is neither
--- a book nor a website. When the file cannot be read or parsed, the function
--- logs a warning and returns `"default"` so detection degrades safely.
--- @return string project_type One of `"book"`, `"website"`, or `"default"`
local function resolve_project_type()
  local path = os.getenv('QUARTO_EXECUTE_INFO')
  if not path or path == '' then
    return 'default'
  end

  local file = io.open(path, 'r')
  if not file then
    log.log_warning(EXTENSION_NAME,
      "Could not open QUARTO_EXECUTE_INFO at '" .. path .. "'; assuming a single-document project.")
    return 'default'
  end

  local content = file:read('*a')
  file:close()

  if not content or content == '' then
    log.log_warning(EXTENSION_NAME,
      "QUARTO_EXECUTE_INFO is empty; assuming a single-document project.")
    return 'default'
  end

  local ok, info = pcall(quarto.json.decode, content)
  if not ok or type(info) ~= 'table' then
    log.log_warning(EXTENSION_NAME,
      "Could not parse QUARTO_EXECUTE_INFO; assuming a single-document project.")
    return 'default'
  end

  local format_meta = info['format'] and info['format']['metadata']
  if type(format_meta) ~= 'table' then
    return 'default'
  end

  if format_meta['book'] then return 'book' end
  if format_meta['website'] then return 'website' end
  return 'default'
end

--- Normalise a resolved list option to a list of strings.
--- The schema accepts a string or a list, and the validator returns whichever
--- the document wrote, so a single entry becomes a one item list here.
--- @param value string|table<integer, string>|nil The resolved option value
--- @return table<integer, string> The list of string values (possibly empty)
local function as_string_list(value)
  if value == nil then return {} end

  if type(value) ~= 'table' then
    local entry = tostring(value)
    return entry ~= '' and { entry } or {}
  end

  local result = {}
  for _, item in ipairs(value) do
    local entry = tostring(item)
    if entry ~= '' then result[#result + 1] = entry end
  end
  return result
end

--- Encode a Lua value as a JSON literal suitable for inlining in a
--- `<script>` block. The result never contains the substring `</`, so
--- it cannot prematurely terminate the script element.
--- @param value any Any value `quarto.json.encode` accepts
--- @return string JSON literal with `</` neutralised
local function encode_for_script(value)
  local encoded = quarto.json.encode(value)
  -- Defensive: prevent the literal "</" from closing the <script> early.
  return (encoded:gsub('</', '<\\/'))
end

--- Build the bootstrap `<script>` that hands the resolved options to the
--- client. The payload is intentionally minimal: project type, the
--- page-exclusion list, and the separate-chapter-state flag.
--- @param project_type string One of `"book"`, `"website"`, or `"default"`
--- @param page_exclude table<integer, string> Paths/patterns to skip
--- @param separate_chapter_state boolean Whether to store chapter and
---   scroll position under independent keys
--- @return string Raw HTML containing the bootstrap script
local function build_bootstrap_script(project_type, page_exclude, separate_chapter_state)
  local payload = {
    ['project-type'] = project_type,
    ['page-exclude'] = page_exclude,
    ['separate-chapter-state'] = separate_chapter_state,
  }
  return string.format(
    '<script id="quarto-remember-config" type="application/json">%s</script>',
    encode_for_script(payload)
  )
end

-- ============================================================================
-- PUBLIC FUNCTIONS
-- ============================================================================

--- Inject dependencies and the bootstrap configuration for HTML-based formats.
--- @param meta table Document metadata
--- @return table Modified metadata
local function inject_dependencies(meta)
  if not quarto.doc.is_format('html:js') then
    return meta
  end

  checker:options(meta)

  html_mod.ensure_html_dependency({
    name = EXTENSION_NAME,
    version = '1.0.0',
    scripts = { 'remember.js' },
    stylesheets = { 'remember.css' },
  })

  local project_type = resolve_project_type()
  -- The schema decides both values, so `separate-chapter-state: no` turns the
  -- feature off. Reading the document itself left it on.
  local page_exclude = as_string_list(checker:option('page-exclude'))
  local separate_chapter_state = checker:option('separate-chapter-state') == true

  local script = build_bootstrap_script(project_type, page_exclude, separate_chapter_state)
  quarto.doc.include_text('in-header', script)

  return meta
end

-- ============================================================================
-- FILTER EXPORT
-- ============================================================================

--- Pandoc filter configuration
return {
  { Meta = inject_dependencies },
}
