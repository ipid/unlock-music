#!/bin/sh

set -ex

cd "$(git rev-parse --show-toplevel)"

if [ -z "$GITEA_API_KEY" ]; then
  echo "GITEA_API_KEY is empty, skip upload."
  exit 0
fi

URL_BASE="$DRONE_GITEA_SERVER/api/packages/${DRONE_REPO_NAMESPACE}/generic/${DRONE_REPO_NAME}-build"

for ZIP_NAME in *.zip; do
  UPLOAD_URL="${URL_BASE}/${DRONE_BUILD_NUMBER}/${ZIP_NAME}"
  sha256sum "${ZIP_NAME}"
  curl -sLifu "um-release-bot:$GITEA_API_KEY" -T "${ZIP_NAME}" "${UPLOAD_URL}"
  echo "Uploaded to: ${UPLOAD_URL}"
done
