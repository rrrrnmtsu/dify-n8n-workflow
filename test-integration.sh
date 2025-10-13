#!/bin/bash

# Dify & n8n 統合テストスクリプト

set -e

echo "========================================"
echo "Dify & n8n 統合テスト"
echo "========================================"
echo ""

# カラーコード
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# サービス状態確認
echo "📋 ステップ1: サービス状態確認"
echo "----------------------------------------"

echo -n "Dify API: "
if curl -s -o /dev/null -w "%{http_code}" http://localhost:5001/health 2>/dev/null | grep -q "200\|405"; then
    echo -e "${GREEN}✓ 稼働中${NC}"
else
    echo -e "${RED}✗ 停止中${NC}"
    echo "エラー: Dify APIが応答しません"
    exit 1
fi

echo -n "Dify Web: "
if curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 2>/dev/null | grep -q "200\|301\|302\|307"; then
    echo -e "${GREEN}✓ 稼働中${NC}"
else
    echo -e "${RED}✗ 停止中${NC}"
    echo "エラー: Dify Webが応答しません"
    exit 1
fi

echo -n "n8n: "
if curl -s http://localhost:5678/healthz 2>/dev/null | grep -q "ok"; then
    echo -e "${GREEN}✓ 稼働中${NC}"
else
    echo -e "${RED}✗ 停止中${NC}"
    echo "エラー: n8nが応答しません"
    exit 1
fi

echo ""
echo -e "${GREEN}すべてのサービスが正常に稼働しています！${NC}"
echo ""

# 次のステップ案内
echo "========================================"
echo "📝 次のステップ"
echo "========================================"
echo ""
echo "1️⃣  n8nでWebhookワークフローをインポート"
echo "   URL: http://localhost:5678"
echo "   ファイル: examples/simple-webhook-test.json"
echo ""
echo "2️⃣  ワークフローを保存して有効化（Activeトグルをオン）"
echo ""
echo "3️⃣  Webhookテストを実行:"
echo "   ./scripts/test-webhook.sh"
echo ""
echo "4️⃣  Difyでアプリを作成してAPIキーを取得"
echo "   URL: http://localhost:3000"
echo "   アプリタイプ: Chatbot または Workflow"
echo ""
echo "5️⃣  n8nでDify API呼び出しワークフローをインポート"
echo "   ファイル: examples/simple-dify-api-test.json"
echo "   APIキーを設定して実行"
echo ""
echo "6️⃣  Dify → n8n連携テスト"
echo "   DifyのワークフローでHTTP Requestノードを使用"
echo "   URL: http://n8n:5678/webhook/dify-test"
echo ""
echo "========================================"
echo "📚 詳細はドキュメントを参照"
echo "========================================"
echo "- QUICKSTART.md"
echo "- docs/testing-guide.md"
echo ""
