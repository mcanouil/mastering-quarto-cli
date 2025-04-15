#!/usr/bin/env bash

show_help() {
  echo "Usage: $0 [--what/-w all|r|python|julia] [--force/-f] [--help/-h]"
  echo "  --what/-w: Specify what to initialise (default: all)."
  echo "    all: Initialise R (renv) and Python (uv)."
  echo "    r: Initialise R (renv)."
  echo "    python: Initialise Python (uv)."
  echo "  --force/-f: Force initialisation regardless of existing files."
  echo "  --help/-h: Show this help message."
}

initialise_r() {
  if [ "$FORCE" = true ] || [ ! -f "renv.lock" ]; then
    if grep -q 'source("renv/activate.R")' .Rprofile; then
      sed -i '' '/source("renv\/activate.R")/d' .Rprofile
    fi
    Rscript -e 'renv::init(bare = FALSE)'
    Rscript -e 'renv::install(c("rmarkdown", "prompt", "languageserver", "lintr", "styler", "cli"))'
    Rscript -e 'renv::snapshot(type = "all")'
  fi
}

initialise_uv() {
  if [ "$FORCE" = true ] || [ ! -f "uv.lock" ]; then
    uv init --no-package --vcs none --bare --no-readme --author-from none
    uv venv
    source .venv/bin/activate
    uv add jupyter papermill
    uv sync
  fi
}

WHAT="all"
FORCE=false

while [[ "$#" -gt 0 ]]; do
  case $1 in
    --what|-w)
      WHAT="$2"
      shift
      ;;
    --force|-f)
      FORCE=true
      ;;
    --help|-h)
      show_help
      exit 0
      ;;
    *)
      echo "Unknown parameter passed: $1"
      show_help
      exit 1
      ;;
  esac
  shift
done

case $WHAT in
  all)
    initialise_r
    initialise_uv
    ;;
  r)
    initialise_r
    ;;
  python)
    initialise_uv
    ;;
  *)
    echo "Unknown option for --what: $WHAT"
    show_help
    exit 1
    ;;
esac
