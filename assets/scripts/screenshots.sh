#!/usr/bin/env bash

if [ -z "${QUARTO_PROJECT_RENDER_ALL}" ]; then
  exit 0
fi

npx -y decktape \
  --chrome-arg=--no-sandbox \
  --chrome-arg=--disable-setuid-sandbox \
  --screenshots \
  --screenshots-format png \
  --screenshots-directory ./assets/screenshots/ \
  --size "1920x1080" \
  "https://quarto.org/" quarto-org.pdf && rm -f quarto-org.pdf
