#!/bin/bash

# Telegram Bot テストスクリプト

TOKEN="8401202439:AAHwPAMl26dYPi7J6N2LV_o32VKb2T0BtbI"
CHAT_ID="-4796493812"

echo "🤖 Telegram Botテストメッセージを送信中..."
echo ""

curl -X POST "https://api.telegram.org/bot${TOKEN}/sendMessage" \
  -H "Content-Type: application/json" \
  -d "{
    \"chat_id\": ${CHAT_ID},
    \"text\": \"🤖 Bot設定が完了しました！\n\n📊 売上日報ファイルを送信してください。\nExcelファイル(.xlsx)またはPDFファイル(.pdf)に対応しています。\n\n✅ 自動処理が開始されます。\"
  }"

echo ""
echo ""
echo "✅ メッセージ送信完了"
echo "Telegramグループを確認してください: CROSS ROPPONNGI 経理 日報"
