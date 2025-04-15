#!/usr/bin/env bash

if [ -z "${QUARTO_PROJECT_RENDER_ALL}" ]; then
  exit 0
fi

SLIDES_FILES=$(echo "${QUARTO_PROJECT_OUTPUT_FILES}" | tr ' ' '\n' | grep -E 'slides\.html$')

for SLIDES_PATH in ${SLIDES_FILES}; do
  echo "Processing ${SLIDES_PATH}"
  SLIDES_DIR=$(dirname "${SLIDES_PATH}")
  
  PDF_AUTHOR=$(grep -o '<meta name="author" content="[^"]*"' "${SLIDES_PATH}" | sed 's/<meta name="author" content="\(.*\)"/\1/')
  PDF_TITLE=$(grep -o '<title>.*</title>' "${SLIDES_PATH}" | sed 's/<title>\(.*\)<\/title>/\1/')
  
  npx -y decktape reveal \
    --chrome-arg=--no-sandbox \
    --chrome-arg=--disable-setuid-sandbox \
    --size "1920x1080" \
    --load-pause 2000 \
    --pdf-author "${PDF_AUTHOR}" \
    --pdf-title "${PDF_TITLE}" \
    "${SLIDES_PATH}" "${SLIDES_DIR}/slides.pdf"
done
