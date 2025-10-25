#!/bin/bash

# Dify PDF Parser テストスクリプト

set -e

# カラー出力
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Dify PDF Parser テスト${NC}"
echo -e "${GREEN}========================================${NC}"

# 環境変数チェック
if [ -z "$DIFY_API_KEY" ]; then
    echo -e "${YELLOW}警告: DIFY_API_KEY が設定されていません${NC}"
    echo "手動でAPI Keyを入力してください:"
    read -r DIFY_API_KEY
fi

# Dify API エンドポイント
DIFY_URL="${DIFY_URL:-http://localhost:5001}"
DIFY_APP_ID="${DIFY_APP_ID:-}"

# テストデータ（実際のPDFから抽出したテキスト）
TEST_TEXT="CROSS ROPPONGI 2025年10月18日(土)
男性 75 女性 51 24
人数 75 51 24
セクション 項目 金額
FRONT 48,500 13,500 1,500 33,500
BAR 1 106,500 38,900 2,000 65,600
BAR 3 8,200 8,200
BAR 4 94,000 44,000 6,800 43,200
フロア 1,246,600 1,094,000 10,300 142,300
PARTY 478,000 478,000
PARTY VIP 129,600 129,600
総売上 ¥1,854,200"

echo -e "\n${YELLOW}テストデータ:${NC}"
echo "$TEST_TEXT"

# Dify API ヘルスチェック
echo -e "\n${YELLOW}1. Dify API ヘルスチェック...${NC}"
HEALTH_RESPONSE=$(curl -s "$DIFY_URL/health")
echo "Response: $HEALTH_RESPONSE"

if echo "$HEALTH_RESPONSE" | jq -e '.status == "ok"' > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Dify API は正常に稼働しています${NC}"
else
    echo -e "${RED}❌ Dify API に接続できません${NC}"
    exit 1
fi

# アプリケーション確認
echo -e "\n${YELLOW}2. Dify アプリケーション確認...${NC}"

if [ -z "$DIFY_APP_ID" ]; then
    echo -e "${RED}DIFY_APP_ID が設定されていません${NC}"
    echo ""
    echo "次の手順でアプリケーションを作成してください:"
    echo "1. http://localhost:3000 にアクセス"
    echo "2. 「アプリを作成」→「Agent」を選択"
    echo "3. アプリ名: Sales Report Parser"
    echo "4. dify-apps/sales-report-parser-config.md のプロンプトを設定"
    echo "5. APIタブでAPI Keyを生成"
    echo "6. .env に以下を追加:"
    echo "   DIFY_API_KEY=<your_api_key>"
    echo "   DIFY_APP_ID=<your_app_id>"
    echo ""
    exit 1
fi

# Chat Messages API テスト
echo -e "\n${YELLOW}3. PDF解析APIテスト...${NC}"

RESPONSE=$(curl -s -X POST "$DIFY_URL/v1/chat-messages" \
  -H "Authorization: Bearer $DIFY_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "inputs": {
      "input_text": "'"$TEST_TEXT"'",
      "file_name": "20251018CROSSROPPONGI_日報.pdf",
      "file_type": "pdf"
    },
    "response_mode": "blocking",
    "user": "test-script"
  }')

echo "Raw Response:"
echo "$RESPONSE" | jq '.'

# レスポンス解析
if echo "$RESPONSE" | jq -e '.answer' > /dev/null 2>&1; then
    echo -e "\n${GREEN}✅ APIレスポンス成功${NC}"

    ANSWER=$(echo "$RESPONSE" | jq -r '.answer')
    echo -e "\n${YELLOW}抽出されたデータ:${NC}"
    echo "$ANSWER" | jq '.' || echo "$ANSWER"

    # データ検証
    echo -e "\n${YELLOW}4. データ検証...${NC}"

    # business_dateチェック
    if echo "$ANSWER" | jq -e '.business_date' > /dev/null 2>&1; then
        BUSINESS_DATE=$(echo "$ANSWER" | jq -r '.business_date')
        echo -e "${GREEN}✅ 営業日: $BUSINESS_DATE${NC}"
    else
        echo -e "${RED}❌ 営業日が抽出されていません${NC}"
    fi

    # total_salesチェック
    if echo "$ANSWER" | jq -e '.total_sales' > /dev/null 2>&1; then
        TOTAL_SALES=$(echo "$ANSWER" | jq -r '.total_sales')
        echo -e "${GREEN}✅ 総売上: ¥$TOTAL_SALES${NC}"

        # 期待値との比較
        if [ "$TOTAL_SALES" = "1854200" ]; then
            echo -e "${GREEN}✅ 金額が正確に抽出されています${NC}"
        else
            echo -e "${YELLOW}⚠️  期待値: 1854200, 実際: $TOTAL_SALES${NC}"
        fi
    else
        echo -e "${RED}❌ 総売上が抽出されていません${NC}"
    fi

    # male_countチェック
    if echo "$ANSWER" | jq -e '.male_count' > /dev/null 2>&1; then
        MALE_COUNT=$(echo "$ANSWER" | jq -r '.male_count')
        echo -e "${GREEN}✅ 男性客数: $MALE_COUNT名${NC}"
    else
        echo -e "${RED}❌ 男性客数が抽出されていません${NC}"
    fi

    echo -e "\n${GREEN}========================================${NC}"
    echo -e "${GREEN}テスト完了！${NC}"
    echo -e "${GREEN}========================================${NC}"

else
    echo -e "\n${RED}❌ APIエラー${NC}"
    echo "$RESPONSE" | jq '.message // .error' || echo "$RESPONSE"
    exit 1
fi
