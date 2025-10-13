#!/usr/bin/env bash
set -euo pipefail

# ルートディレクトリ判定
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
ENV_FILE="${ROOT_DIR}/.env"

# .env が存在する場合は読み込む（コメントは無視）
if [[ -f "${ENV_FILE}" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "${ENV_FILE}"
  set +a
fi

# n8n 接続設定
HOST="${N8N_HOST:-localhost}"
PORT="${N8N_PORT:-5678}"
USE_BASIC_AUTH="${N8N_BASIC_AUTH_ACTIVE:-true}"
USERNAME="${N8N_USER:-${N8N_BASIC_AUTH_USER:-admin}}"
PASSWORD="${N8N_PASSWORD:-${N8N_BASIC_AUTH_PASSWORD:-admin_password}}"

WEBHOOK_PATH="${N8N_WEBHOOK_PATH:-/webhook/dify-event}"
WEBHOOK_URL="http://${HOST}:${PORT}${WEBHOOK_PATH}"

# デフォルトペイロード
default_timestamp="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
default_payload=$(printf '{"conversation_id":"test-run","user_input":"Codex テスト","agent_output":"疎通確認完了","timestamp":"%s"}' "${default_timestamp}")
PAYLOAD="${JSON_PAYLOAD:-$default_payload}"

echo "POST ${WEBHOOK_URL}"
if [[ "${USE_BASIC_AUTH}" == "true" ]]; then
  echo "  using basic auth for user: ${USERNAME}"
fi
echo "  payload: ${PAYLOAD}"

curl_args=(
  "-sS"
  "-f"
  "-X" "POST"
  "-H" "Content-Type: application/json"
  "-d" "${PAYLOAD}"
  "${WEBHOOK_URL}"
)

if [[ "${USE_BASIC_AUTH}" == "true" ]]; then
  curl_args=("-u" "${USERNAME}:${PASSWORD}" "${curl_args[@]}")
fi

if ! curl "${curl_args[@]}"; then
  echo
  echo "Webhook 送信に失敗しました。n8n の起動状態と認証情報を確認してください。" >&2
  exit 1
fi

echo
