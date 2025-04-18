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
  --slides 1-1 \
  --size "1920x1080" \
  "https://quarto.org/" quarto-org.pdf && rm -f quarto-org.pdf

npx -y decktape \
  --chrome-arg=--no-sandbox \
  --chrome-arg=--disable-setuid-sandbox \
  --screenshots \
  --screenshots-format png \
  --screenshots-directory ./assets/screenshots/ \
  --slides 1-1 \
  --size "1920x1920" \
  "https://pandoc.org/" pandoc-org.pdf && rm -f pandoc-org.pdf

npx -y decktape \
  --chrome-arg=--no-sandbox \
  --chrome-arg=--disable-setuid-sandbox \
  --screenshots \
  --screenshots-format png \
  --screenshots-directory ./assets/screenshots/ \
  --slides 1-1 \
  --size "1920x1080" \
  "https://quarto.org/docs/download/" quarto-download.pdf && rm -f quarto-download.pdf

npx -y decktape \
  --chrome-arg=--no-sandbox \
  --chrome-arg=--disable-setuid-sandbox \
  --screenshots \
  --screenshots-format png \
  --screenshots-directory ./assets/screenshots/ \
  --slides 1-1 \
  --size "1920x1080" \
  "https://brew.sh/" quarto-homebrew.pdf && rm -f quarto-homebrew.pdf

npx -y decktape \
  --chrome-arg=--no-sandbox \
  --chrome-arg=--disable-setuid-sandbox \
  --screenshots \
  --screenshots-format png \
  --screenshots-directory ./assets/screenshots/ \
  --slides 1-1 \
  --size "1920x1080" \
  "https://community.chocolatey.org/" quarto-chocolatey.pdf && rm -f quarto-chocolatey.pdf
