#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
WORKER_DIR="$SCRIPT_DIR/worker"
CONFIG="$WORKER_DIR/wrangler.dev.toml"

node "$SCRIPT_DIR/scripts/validate-environment-config.mjs" "$CONFIG" dev

BUCKET="$(awk -F'"' '/^bucket_name[[:space:]]*=/{print $2; exit}' "$CONFIG")"
if [[ -z "$BUCKET" || "$BUCKET" != *dev* ]]; then
  echo "Refusing deployment: isolated dev R2 bucket was not found." >&2
  exit 1
fi

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
    (cd "$WORKER_DIR" && npx wrangler r2 object put "$BUCKET/$prefix/$filename" --file "$file_path" --content-type "$content_type" --remote)
  done
}

upload_directory "$SCRIPT_DIR/static" "static"
upload_directory "$SCRIPT_DIR/admin-preview" "admin-preview"
(cd "$WORKER_DIR" && npx wrangler deploy --config "$CONFIG")

echo "Isolated development deployment completed."
