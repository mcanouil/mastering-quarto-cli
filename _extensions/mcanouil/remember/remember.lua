--- @module remember
--- @license MIT
--- @copyright 2026 Mickaël Canouil
--- @author Mickaël Canouil

--- Extension name constant
local EXTENSION_NAME = 'remember'

--- Load required modules
local utils = require(quarto.utils.resolve_path('_modules/utils.lua'):gsub('%.lua$', ''))

-- ============================================================================
-- PUBLIC FUNCTIONS
-- ============================================================================

--- Inject dependencies for HTML-based formats
--- @param meta table Document metadata
--- @return table Modified metadata
local function inject_dependencies(meta)
  -- Only process for HTML and RevealJS formats
  if quarto.doc.is_format('html:js') then
    utils.ensure_html_dependency({
      name = 'remember',
      version = '1.0.0',
      scripts = { 'remember.js' },
      stylesheets = { 'remember.css' }
    })
  end

  return meta
end

-- ============================================================================
-- FILTER EXPORT
-- ============================================================================

--- Pandoc filter configuration
return {
  { Meta = inject_dependencies }
}
