#!/usr/bin/env bash

if [ -z "${QUARTO_PROJECT_RENDER_ALL}" ]; then
  exit 0
fi

HTML_FILES=$(echo "${QUARTO_PROJECT_OUTPUT_FILES}" | tr ' ' '\n' | grep -E '\.html$')

SLIDES_FILES=""
for HTML_FILE in ${HTML_FILES}; do
  if grep -q '<div class="reveal">' "${HTML_FILE}"; then
    SLIDES_FILES="${SLIDES_FILES} ${HTML_FILE}"
  fi
done

SLIDES_FILES=$(echo "${SLIDES_FILES}" | xargs)

for SLIDES_PATH in ${SLIDES_FILES}; do
  echo "Processing ${SLIDES_PATH}"
  
  PDF_AUTHOR=$(grep -o '<meta name="author" content="[^"]*"' "${SLIDES_PATH}" | sed 's/<meta name="author" content="\(.*\)"/\1/')
  PDF_TITLE=$(grep -o '<title>.*</title>' "${SLIDES_PATH}" | sed 's/<title>\(.*\)<\/title>/\1/')
  
  npx -y decktape reveal \
    --chrome-arg=--no-sandbox \
    --chrome-arg=--disable-setuid-sandbox \
    --size "1920x1080" \
    --load-pause 2000 \
    --pdf-author "${PDF_AUTHOR}" \
    --pdf-title "${PDF_TITLE}" \
    "${SLIDES_PATH}" "${SLIDES_PATH%.html}.pdf"
done
