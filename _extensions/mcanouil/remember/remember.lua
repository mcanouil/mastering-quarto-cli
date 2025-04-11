--[[
# MIT License
#
# Copyright (c) 2025 Mickaël Canouil
#
# Permission is hereby granted, free of charge, to any person obtaining a copy
# of this software and associated documentation files (the "Software"), to deal
# in the Software without restriction, including without limitation the rights
# to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
# copies of the Software, and to permit persons to whom the Software is
# furnished to do so, subject to the following conditions:
#
# The above copyright notice and this permission notice shall be included in all
# copies or substantial portions of the Software.
#
# THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
# IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
# FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
# AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
# LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
# OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
# SOFTWARE.
]]

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
