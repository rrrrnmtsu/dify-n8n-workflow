# セッション5: Dify統合 - ブランチポイント

**ブランチ日時**: 2025-10-20 11:05
**親セッション**: セッション4（Privacy Mode解決とデータ処理実装完了）
**ブランチ理由**: Difyアプリケーション作成の手順確認中

---

## 📍 現在の状況

### 完了した作業

1. ✅ **タスク計画作成**
   - n8n完全自動化のTodoリスト作成
   - 5つのステップを定義

2. ✅ **Dify API動作確認**
   - Health check成功: `{"status": "ok", "version": "1.9.1"}`
   - Dify APIは正常稼働中

3. ✅ **ドキュメント作成**
   - [`dify-apps/sales-report-parser-config.md`](dify-apps/sales-report-parser-config.md)
   - Difyアプリケーションの詳細設計書
   - プロンプト、変数設定、テストケースを含む

4. ✅ **テストスクリプト作成**
   - [`scripts/test_dify_pdf_parser.sh`](scripts/test_dify_pdf_parser.sh)
   - Dify API自動テストツール
   - 実データでの検証用

---

## 🔄 現在の作業

### ユーザーの質問

**「プロンプトはどこに入力しますか？」**
↓
**「アプリ情報を編集するの『説明』入力欄ですか？」**

### 判明した問題

ユーザーはDifyの**アプリ情報編集画面**（名前・説明・アイコン設定）を見ている可能性が高い。

**正しい場所**:
- Chatbotアプリ: 左側の「INSTRUCTIONS」テキストエリア
- Agentアプリ: 中央のフロー内「LLM」ノードのSystem Prompt

---

## 🎯 次のステップ（2つの選択肢）

### オプションA: Difyアプリ作成を継続

**手順**:
1. ユーザーの現在画面を確認
2. Chatbotアプリ作成を推奨（より簡単）
3. INSTRUCTIONSにプロンプト入力
4. API Key取得
5. テストスクリプト実行

**所要時間**: 15-20分

---

### オプションB: Dify不使用の簡易実装

Difyアプリ作成が複雑な場合、**Difyを使わない実装**に切り替え：

**代替案**:
- n8n Code Nodeで直接PDF解析
- Claude APIまたはOpenAI APIを直接呼び出し
- シンプルな正規表現パーサー

**メリット**:
- セットアップが簡単
- n8nワークフローのみで完結

**デメリット**:
- プロンプト管理が分散
- Difyの利点（バージョン管理、テスト、監視）が使えない

---

## 📊 進捗状況

```
マイルストーン5: n8n完全自動化
├─ Dify AI動作確認 ✅ 100%
├─ 設計ドキュメント作成 ✅ 100%
├─ テストスクリプト作成 ✅ 100%
├─ Difyアプリ作成 🔄 10% ← 現在ここ
├─ n8n連携実装 ⏳ 0%
├─ エラーハンドリング ⏳ 0%
└─ 実ファイルテスト ⏳ 0%
```

**全体進捗**: 52% (前回50% + 2%)

---

## 💾 作成したファイル（このセッション）

1. **dify-apps/sales-report-parser-config.md**
   - Difyアプリの完全な設計書
   - プロンプト、変数、テストケース
   - n8n統合方法

2. **scripts/test_dify_pdf_parser.sh**
   - Dify API自動テストスクリプト
   - 実データでの検証
   - 結果の自動比較

3. **SESSION_5_BRANCH.md** (このファイル)
   - ブランチポイントの記録
   - 現状と選択肢の整理

---

## 🔀 ブランチ後の推奨アクション

### パターン1: Difyを継続（推奨）

**理由**:
- 長期的にはメンテナンス性が高い
- プロンプトの管理が容易
- 監視・ログ機能が使える

**次のアクション**:
```
1. ユーザーにDifyの画面スクリーンショットを依頼
   または
2. 具体的な画面要素（ボタン、タブ名）を確認
   ↓
3. 正確な手順を提示
   ↓
4. アプリ作成完了
```

---

### パターン2: Difyスキップ（短期的解決）

**理由**:
- すぐに動くものが必要
- Difyの学習コストを避けたい
- シンプルな実装で十分

**次のアクション**:
```
1. n8n Code NodeでClaude API直接呼び出し
   ↓
2. 正規表現ベースの簡易パーサー追加
   ↓
3. 動作確認
   ↓
4. 後でDifyに移行可能
```

---

## 🎓 学習事項（このセッション）

### Dify UIの複雑性

**発見**:
- Agentアプリ: プロンプト入力場所が分かりづらい
- Chatbotアプリ: より直感的なUI
- 「説明」欄とプロンプト入力欄の混同

**対策**:
- 最初からChatbotアプリを推奨
- スクリーンショット付きの手順書作成
- UIの各要素を明確に説明

---

## 📞 次のセッション開始時の推奨質問

ユーザーに以下を確認：

1. **Difyアプリ作成を続けますか？**
   - はい → Chatbotアプリでの作成手順を詳しく説明
   - いいえ → Dify不使用の実装に切り替え

2. **現在のDify画面を確認できますか？**
   - 画面要素（タブ、ボタン）を教えてもらう
   - または、画面説明を聞く

3. **時間的制約はありますか？**
   - すぐに動くものが必要 → パターン2
   - じっくり構築したい → パターン1

---

## 🔧 技術的詳細（参考）

### Dify API構造

```bash
# Health Check
GET http://localhost:5001/health

# Chat Messages (Chatbot/Agentで使用)
POST http://localhost:5001/v1/chat-messages
Headers:
  Authorization: Bearer {API_KEY}
Body:
  {
    "inputs": {...},
    "response_mode": "blocking",
    "user": "n8n"
  }
```

### n8n統合例

```javascript
// HTTP Request Node
{
  "method": "POST",
  "url": "http://dify-api:5001/v1/chat-messages",
  "headers": {
    "Authorization": "Bearer {{$env.DIFY_API_KEY}}"
  },
  "body": {
    "inputs": {
      "input_text": "{{$json.pdf_text}}"
    }
  }
}
```

---

## 📝 メモ

- ユーザーは`airregi-analytics/GOOGLE_SHEETS_SETUP.md`も開いていた
- Google Sheets連携への関心もあり
- 段階的な実装が望ましい

---

**ブランチポイント保存完了**

次回セッション開始時、このファイルを参照して作業を再開してください。
