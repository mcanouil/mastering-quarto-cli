#!/usr/bin/env bash

set -e

if [ -z "${QUARTO_PROJECT_RENDER_ALL}" ]; then
  exit 0
fi

CHROME_PATH_ARG=""
if [ -n "${QUARTO_CHROMIUM}" ]; then
  CHROME_PATH_ARG="--chrome-path=${QUARTO_CHROMIUM}"
fi

QUARTO_OUTPUT_DIRECTORY=${OUTPUT_DIRECTORY:-"_site"}

HTML_FILES=$(echo "${QUARTO_PROJECT_OUTPUT_FILES}" | tr ' ' '\n' | grep -E '\.html$' || true)

if [ -z "${HTML_FILES}" ]; then
  exit 0
fi

SLIDES_FILES=""
for HTML_FILE in ${HTML_FILES}; do
  if grep -q '<div class="reveal">' "${HTML_FILE}"; then
    SLIDES_FILES="${SLIDES_FILES} ${HTML_FILE}"
  fi
done

SLIDES_FILES=$(echo "${SLIDES_FILES}" | xargs)

if [ "${CI}" == "true" ] && [ -n "${SLIDES_FILES}" ]; then
  mkdir -p release_assets
fi

for SLIDES_PATH in ${SLIDES_FILES}; do
  echo "Processing ${SLIDES_PATH}"

  PDF_AUTHOR=$(grep -o '<meta name="author" content="[^"]*"' "${SLIDES_PATH}" | sed 's/<meta name="author" content="\(.*\)"/\1/')
  PDF_TITLE=$(grep -o '<title>.*</title>' "${SLIDES_PATH}" | sed 's/<title>\(.*\)<\/title>/\1/')

  sed "s/el.parentElement.parentElement.parentElement;/el.parentElement.parentElement.parentElement.parentElement;/g;" "${SLIDES_PATH}" > "${SLIDES_PATH}.decktape.html"

  npx -y decktape reveal \
    "${CHROME_PATH_ARG}" \
    --chrome-arg="--no-sandbox" \
    --chrome-arg="--disable-setuid-sandbox" \
    --size "1920x1080" \
    --screenshots \
    --screenshots-format png \
    --screenshots-directory . \
    --slides 1 \
    "${SLIDES_PATH}.decktape.html" index.pdf

  rm -f index.pdf
  mv -f index_1_1920x1080.png "${SLIDES_PATH%.html}.png"

  npx -y decktape reveal \
    "${CHROME_PATH_ARG}" \
    --chrome-arg="--no-sandbox" \
    --chrome-arg="--disable-setuid-sandbox" \
    --size "1920x1080" \
    --pause 2000 \
    --load-pause 2000 \
    --fragments \
    --pdf-author "${PDF_AUTHOR}" \
    --pdf-title "${PDF_TITLE}" \
    "${SLIDES_PATH}.decktape.html" "${SLIDES_PATH%.html}.pdf"

  rm -f "${SLIDES_PATH}.decktape.html"

  # Move the generated PDF to a file named after the current directory, in the same output directory
  if [ "${CI}" == "true" ]; then
    SLIDES_OUTPUT_DIRECTORY=$(dirname "${SLIDES_PATH}")
    SLIDES_PATH_NO_EXT="${SLIDES_PATH%.html}"
    SLIDES_BASENAME=$(basename "${SLIDES_PATH_NO_EXT}")
    if [ "${SLIDES_BASENAME}" = "index" ]; then
      OUTPUT_NAME=$(basename "${SLIDES_OUTPUT_DIRECTORY}")
      if [ "${OUTPUT_NAME}" = "${QUARTO_OUTPUT_DIRECTORY}" ]; then
        OUTPUT_NAME=$(basename "$(pwd)")
      fi
      if [ "${SLIDES_PATH_NO_EXT}" != "${SLIDES_OUTPUT_DIRECTORY}/${OUTPUT_NAME}" ]; then
        cp -f "${SLIDES_PATH_NO_EXT}.pdf" "${SLIDES_OUTPUT_DIRECTORY}/${OUTPUT_NAME}.pdf"
        cp -f "${SLIDES_PATH_NO_EXT}.png" "${SLIDES_OUTPUT_DIRECTORY}/${OUTPUT_NAME}.png"
      fi
    else
      OUTPUT_NAME="${SLIDES_BASENAME}"
      if [ "${SLIDES_PATH_NO_EXT}" != "${SLIDES_OUTPUT_DIRECTORY}/${OUTPUT_NAME}" ]; then
        mv -f "${SLIDES_PATH_NO_EXT}.pdf" "${SLIDES_OUTPUT_DIRECTORY}/${OUTPUT_NAME}.pdf"
        mv -f "${SLIDES_PATH_NO_EXT}.png" "${SLIDES_OUTPUT_DIRECTORY}/${OUTPUT_NAME}.png"
      fi
    fi

    cp -f "${SLIDES_OUTPUT_DIRECTORY}/${OUTPUT_NAME}.pdf" release_assets/
    cp -f "${SLIDES_OUTPUT_DIRECTORY}/${OUTPUT_NAME}.png" release_assets/
  fi
done
