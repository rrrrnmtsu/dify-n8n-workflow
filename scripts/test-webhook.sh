#!/bin/bash

# n8n Webhook テストスクリプト

# カラーコード
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo "========================================"
echo "n8n Webhook テスト"
echo "========================================"
echo ""

# Webhookパスを設定（必要に応じて変更）
WEBHOOK_PATH="${1:-dify-test}"
WEBHOOK_URL="http://localhost:5678/webhook/${WEBHOOK_PATH}"

echo -e "${BLUE}Webhook URL:${NC} ${WEBHOOK_URL}"
echo ""

# テストデータを送信
echo "📤 テストデータを送信中..."
echo ""

TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "${WEBHOOK_URL}" \
  -H "Content-Type: application/json" \
  -d '{
    "source": "manual-test",
    "message": "Hello from test script!",
    "timestamp": "'"${TIMESTAMP}"'",
    "test_data": {
      "user": "test-user",
      "action": "webhook-test",
      "priority": "normal"
    }
  }' 2>&1)

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)

echo "HTTP Status Code: ${HTTP_CODE}"
echo ""

if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✓ Webhook呼び出し成功！${NC}"
    echo ""
    echo "レスポンス:"
    echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
    echo ""
    echo -e "${GREEN}次のステップ:${NC}"
    echo "1. n8nのWeb UI (http://localhost:5678) を開く"
    echo "2. 左メニューから「Executions」をクリック"
    echo "3. 最新の実行履歴を確認"
elif [ "$HTTP_CODE" = "404" ]; then
    echo -e "${RED}✗ Webhook未登録${NC}"
    echo ""
    echo -e "${YELLOW}対処方法:${NC}"
    echo "1. n8n (http://localhost:5678) にアクセス"
    echo "2. 「Workflows」→「Import from File」を選択"
    echo "3. examples/simple-webhook-test.json をインポート"
    echo "4. ワークフローを保存"
    echo "5. 右上のトグルスイッチで「Active」に切り替え"
    echo "6. このスクリプトを再実行"
else
    echo -e "${RED}✗ エラーが発生しました${NC}"
    echo ""
    echo "レスポンス:"
    echo "$BODY"
fi

echo ""
echo "========================================"
