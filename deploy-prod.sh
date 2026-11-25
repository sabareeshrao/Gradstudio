#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
WORKER_DIR="$SCRIPT_DIR/worker"
STATIC_DIR="$SCRIPT_DIR/static"
ADMIN_DIR="$SCRIPT_DIR/admin-preview"
R2_BUCKET="learning-simulations"

if [[ "${1:-}" != "--confirm-production" ]]; then
  echo "Refusing production deployment: pass --confirm-production from the protected release workflow." >&2
  exit 1
fi

CURRENT_SHA="$(git -C "$SCRIPT_DIR" rev-parse HEAD)"
if [[ -z "${GRADSTUDIO_PRODUCTION_RELEASE_SHA:-}" || "$GRADSTUDIO_PRODUCTION_RELEASE_SHA" != "$CURRENT_SHA" ]]; then
  echo "Refusing production deployment: GRADSTUDIO_PRODUCTION_RELEASE_SHA must equal $CURRENT_SHA." >&2
  exit 1
fi

if [[ -n "$(git -C "$SCRIPT_DIR" status --porcelain)" ]]; then
  echo "Refusing production deployment from a dirty working tree." >&2
  exit 1
fi

case "${GRADSTUDIO_PRODUCTION_RELEASE_CLASS:-}" in
  initial-cutover)
    [[ "${GRADSTUDIO_INITIAL_CUTOVER_AUTHORIZED:-}" == "true" ]] || { echo "Initial cutover has not been explicitly authorized." >&2; exit 1; }
    ;;
  sensitive)
    [[ "${GRADSTUDIO_SENSITIVE_CHANGE_APPROVED:-}" == "true" ]] || { echo "Sensitive production change lacks protected approval." >&2; exit 1; }
    ;;
  routine)
    [[ "${GRADSTUDIO_PRODUCTION_CUTOVER_COMPLETE:-}" == "true" ]] || { echo "Routine automatic deployment is disabled until initial cutover completes." >&2; exit 1; }
    ;;
  *)
    echo "GRADSTUDIO_PRODUCTION_RELEASE_CLASS must be initial-cutover, sensitive, or routine." >&2
    exit 1
    ;;
esac

upload_directory() {
  local source_dir="$1"
  local prefix="$2"
  for file_path in "$source_dir"/*; do
    [[ -f "$file_path" ]] || continue
    local filename content_type
    filename="$(basename "$file_path")"
    content_type="application/octet-stream"
    case "$filename" in
      *.html) content_type="text/html" ;;
      *.css) content_type="text/css" ;;
      *.js) content_type="application/javascript" ;;
      *.json) content_type="application/json" ;;
      *.png) content_type="image/png" ;;
      *.jpg|*.jpeg) content_type="image/jpeg" ;;
      *.svg) content_type="image/svg+xml" ;;
      *.ico) content_type="image/x-icon" ;;
    esac
    (cd "$WORKER_DIR" && npx wrangler r2 object put "$R2_BUCKET/$prefix/$filename" --file "$file_path" --content-type "$content_type" --remote)
  done
}

upload_directory "$STATIC_DIR" "static"
upload_directory "$ADMIN_DIR" "admin-preview"
(cd "$WORKER_DIR" && npx wrangler deploy)

echo "Production deployment completed for $CURRENT_SHA."
