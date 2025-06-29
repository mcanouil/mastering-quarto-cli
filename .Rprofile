source("renv/activate.R")

if (!nzchar(Sys.getenv("CI"))) {
  message(R.version.string)
  message("Config '~/.Rprofile' was loaded!")
  Sys.setenv(CHROMOTE_CHROME = "/Applications/Brave\ Browser.app/Contents/MacOS/Brave\ Browser")
  options(width = 150, menu.graphics = FALSE)
}

options(
  webshot.quiet = TRUE,
  renv.config.pak.enabled = !nzchar(Sys.getenv("CI")),
  renv.config.cache.enabled = !nzchar(Sys.getenv("CI"))
)
