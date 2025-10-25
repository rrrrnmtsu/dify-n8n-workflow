# CROSS ROPPONGI 売上日報自動化システム v2 - 完全ドキュメント

**作成日**: 2025-10-23
**最終更新**: 2025-10-23
**バージョン**: v2.0 (拡張版)
**ステータス**: ✅ 本番稼働中

---

## 📋 目次

1. [システム概要](#システム概要)
2. [v2での変更点](#v2での変更点)
3. [アーキテクチャ](#アーキテクチャ)
4. [ワークフロー詳細](#ワークフロー詳細)
5. [技術仕様](#技術仕様)
6. [データマッピング](#データマッピング)
7. [運用方法](#運用方法)
8. [トラブルシューティング](#トラブルシューティング)

---

## システム概要

### 目的
CROSS ROPPONGIの売上日報Excelファイルを、TelegramからGoogle Sheetsに自動同期し、6つのシートに分類して保存するシステム。

### 主な機能
- ✅ Telegramグループから自動的にExcelファイル取得
- ✅ **100項目以上のデータ**を自動抽出・解析
- ✅ **6つのGoogle Sheetsシート**に並列同期（UPSERT）
- ✅ 決済別・VIP・VVIP・未収・未収回収データを構造化
- ✅ 処理完了をTelegramに通知
- ✅ 重複処理防止機能（5分制限）
- ✅ 毎朝8:30に自動実行

### 対象ファイル形式
**ファイル名**: `yyyymmddCROSSROPPONGI.xlsx`
**例**: `20251023CROSSROPPONGI.xlsx`

**Excelシート構造**:
- シート名: 日付の「日」部分（例: 23日 → `23`）
- セル配置: 固定レイアウト（詳細は技術仕様参照）

---

## v2での変更点

### 追加されたデータ抽出機能

| # | シート名 | 用途 | データ形式 |
|---|---------|------|-----------|
| 1 | **決済別** | エリア毎の決済別金額 | 10エリア × 7決済方法 |
| 2 | **VIPリスト** | VIP利用顧客リスト | 顧客名・金額（最大23件） |
| 3 | **VVIPリスト** | VVIP利用顧客リスト | 顧客名・金額（最大24件） |
| 4 | **未収リスト** | 未収金顧客リスト | 顧客名・金額・担当者（最大7件） |
| 5 | **未収回収リスト** | 未収金回収リスト | 顧客名・金額・担当者（最大7件） |

### アーキテクチャの変更

**v1**: 1つのGoogle Sheetsシート（Sheet1）に基本データのみ保存

**v2**:
- **並列処理**: Parse Excel via APIノードから6つのシートに同時書き込み
- **効率化**: 1回のExcel解析で全データを抽出
- **構造化**: データ種別ごとにシートを分離

---

## アーキテクチャ

### システム構成図（v2）

```
┌─────────────────────────────────────────────────────────────┐
│                     Telegram Group                          │
│          (CROSS ROPPONNGI 経理 日報)                       │
│                 Chat ID: -4796493812                        │
└────────────────────┬────────────────────────────────────────┘
                     │
                     │ Excelファイルアップロード
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                      n8n Workflow v2                        │
│              (毎朝8:30自動実行)                            │
│                                                             │
│  Schedule Trigger → Get Telegram Updates                   │
│         ↓                                                   │
│  Filter Excel Files (重複チェック・5分制限)               │
│         ↓                                                   │
│  Download Excel → Parse Excel via API                      │
│         ↓                                                   │
│    ┌────┴────┬────────┬────────┬────────┬────────┐        │
│    ▼         ▼        ▼        ▼        ▼        ▼        │
│  Sheet1  決済別   VIPリスト VVIPリスト 未収  未収回収     │
│    │         │        │        │        │        │        │
│    └────┬────┴────────┴────────┴────────┴────────┘        │
│         ▼                                                   │
│  Send Success Message → Telegram                           │
└─────────────────────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                   Google Sheets (6シート)                   │
│   Spreadsheet ID: 14ACKU8Rl9ZHtlNvSHeyHr2BSqunRmFAB1nJ7... │
│   ├─ Sheet1: 基本情報・売上サマリー                        │
│   ├─ 決済別: エリア別決済データ                            │
│   ├─ VIPリスト: VIP顧客データ                              │
│   ├─ VVIPリスト: VVIP顧客データ                            │
│   ├─ 未収リスト: 未収金データ                              │
│   └─ 未収回収リスト: 回収データ                            │
└─────────────────────────────────────────────────────────────┘
```

### Docker構成

```yaml
services:
  - n8n: ワークフロー自動化エンジン (Port: 5678)
  - excel-parser: Excel解析API v2 (Port: 5002→5000)
  - postgres: データベース
  - redis: キャッシュ
```

---

## ワークフロー詳細

### 全体フロー

1. **Schedule Trigger** (毎朝8:30 JST)
2. **Get Telegram Updates** - 最新のTelegramメッセージ取得
3. **Filter Excel Files** - Excelファイルのフィルタリング・重複チェック
4. **Get File Path** - ファイルパス取得
5. **Download Excel** - Excelファイルダウンロード
6. **Code (Filename Fix)** - バイナリファイル名修正
7. **Parse Excel via API** - Excel Parser APIで解析（1回のみ）
8. **並列処理ブランチ（6系統）**:
   - **系統1**: Sync to Google Sheets (Sheet1) - 既存の基本データ
   - **系統2**: Transform 決済別 Data → Filter → Sync to 決済別シート
   - **系統3**: Transform VIPリスト Data → Filter → Sync to VIPリスト
   - **系統4**: Transform VVIPリスト Data → Filter → Sync to VVIPリスト
   - **系統5**: Transform 未収リスト Data → Filter → Sync to 未収リスト
   - **系統6**: Transform 未収回収リスト Data → Filter → Sync to 未収回収リスト
9. **Set** - 通知データ準備
10. **Send Success Message** - Telegram通知送信

### 並列処理の仕組み

**Parse Excel via API**ノードから6つの処理が同時に実行されます：

```
Parse Excel via API
    ↓
    ├─→ [既存] Sync to Google Sheets (Sheet1)
    │
    ├─→ Transform 決済別 Data (Code)
    │       ↓
    │   Filter Empty 決済別リスト (IF)
    │       ↓
    │   Sync to 決済別シート (Google Sheets)
    │
    ├─→ Transform VIPリスト Data (Code)
    │       ↓
    │   Filter Empty VIPリスト (IF)
    │       ↓
    │   Sync to VIPリスト (Google Sheets)
    │
    ├─→ Transform VVIPリスト Data (Code)
    │       ↓
    │   Filter Empty VVIPリスト (IF)
    │       ↓
    │   Sync to VVIPリスト (Google Sheets)
    │
    ├─→ Transform 未収リスト Data (Code)
    │       ↓
    │   Filter Empty 未収リスト (IF)
    │       ↓
    │   Sync to 未収リスト (Google Sheets)
    │
    └─→ Transform 未収回収リスト Data (Code)
            ↓
        Filter Empty 未収回収リスト (IF)
            ↓
        Sync to 未収回収リスト (Google Sheets)
```

---

## 技術仕様

### Excel Parser API v2

**エンドポイント**: `http://excel-parser:5000/parse`

**新規追加されたレスポンスフィールド**:

```json
{
  "payment_methods": {
    "front": {
      "cash": 数値,
      "credit": 数値,
      "quicpay": 数値,
      "airpay_qr": 数値,
      "zentoshin": 数値,
      "jppoint": 数値,
      "receivable": 数値
    },
    "cloak": { ... },
    "locker": { ... },
    "bar1": { ... },
    "bar2": { ... },
    "bar3": { ... },
    "bar4": { ... },
    "vip": { ... },
    "vvip": { ... },
    "party": { ... }
  },
  "vip_list": [
    {
      "customer_name": "顧客名",
      "amount": 金額
    }
  ],
  "vvip_list": [ ... ],
  "uncollected_list": [
    {
      "customer_name": "顧客名",
      "amount": 金額,
      "person_in_charge": "担当者"
    }
  ],
  "collected_list": [ ... ]
}
```

---

## データマッピング

### 1. 決済別シート

**Excelセル位置 → Google Sheetsカラム**

| エリア | 現金 | クレジット | QUICPAY | AirPayQR | 全東進 | JPpoint | 未収 |
|--------|------|-----------|---------|----------|--------|---------|------|
| FRONT | P5 | G5 | H5 | I5 | J5 | M5 | N5 |
| CLOAK | P10 | G10 | H10 | I10 | J10 | M10 | N10 |
| LOCKER | P14 | G14 | H14 | I14 | J14 | M14 | N14 |
| BAR1 | P15 | G15 | H15 | I15 | J15 | M15 | N15 |
| BAR2 | P16 | G16 | H16 | I16 | J16 | M16 | N16 |
| BAR3 | P17 | G17 | H17 | I17 | J17 | M17 | N17 |
| BAR4 | P18 | G18 | H18 | I18 | J18 | M18 | N18 |
| VIP | P32 | G32 | H32 | I32 | J32 | M32 | N32 |
| VVIP | P33 | G33 | H33 | I33 | J33 | M33 | N33 |
| PARTY | P48 | G48 | H48 | I48 | J48 | M48 | N48 |

**Google Sheetsカラム構成**:
```
ユニークキー | 営業日 | エリア | 現金 | クレジット | QUICPAY | AirPayQR | 全東進 | JPpoint | 未収
```

**UPSERT設定**: `ユニークキー` (形式: `YYYY-MM-DD_エリア名`)

---

### 2. VIPリストシート

**Excelセル位置**:
- 顧客名: `AA5:AA27` (最大23件)
- 金額: `AB5:AB27`

**Google Sheetsカラム構成**:
```
ユニークキー | 営業日 | 顧客名 | 金額
```

**UPSERT設定**: `ユニークキー` (形式: `YYYY-MM-DD_顧客名`)

---

### 3. VVIPリストシート

**Excelセル位置**:
- 顧客名: `AA29:AA52` (最大24件)
- 金額: `AB29:AB52`

**Google Sheetsカラム構成**:
```
ユニークキー | 営業日 | 顧客名 | 金額
```

**UPSERT設定**: `ユニークキー` (形式: `YYYY-MM-DD_顧客名`)

---

### 4. 未収リストシート

**Excelセル位置**:
- 顧客名: `H54:I60` (最大7件)
- 金額: `J54:J60`
- 担当者: `K54:K60`

**Google Sheetsカラム構成**:
```
ユニークキー | 営業日 | 顧客名 | 金額 | 担当者
```

**UPSERT設定**: `ユニークキー` (形式: `YYYY-MM-DD_顧客名`)

---

### 5. 未収回収リストシート

**Excelセル位置**:
- 顧客名: `O54:P60` (最大7件)
- 金額: `Q54:Q60`
- 担当者: `R54:R60`

**Google Sheetsカラム構成**:
```
ユニークキー | 営業日 | 顧客名 | 金額 | 担当者
```

**UPSERT設定**: `ユニークキー` (形式: `YYYY-MM-DD_顧客名`)

---

## 運用方法

### 日次運用

1. **8:25頃**: PCを起動
2. **8:30**: ワークフローが自動実行
3. **8:35頃**: Telegramに完了通知が届く
4. **確認**: Google Sheetsで6つのシートにデータが同期されていることを確認

### データ確認ポイント

#### Sheet1（基本データ）
- 営業日、総来客数、総売上などの基本情報
- セクション別売上（FRONT、BAR1-4、VIP、VVIP、PARTY）

#### 決済別シート
- **10エリア分のデータ**が10行追加されているか
- 各エリアの7種類の決済方法データが記録されているか

#### VIPリスト・VVIPリスト
- 顧客名と金額が正しく記録されているか
- 空データの日は0件（ヘッダーのみ）

#### 未収リスト・未収回収リスト
- 顧客名、金額、担当者が正しく記録されているか
- 空データの日は0件（ヘッダーのみ）

### 週次確認

- n8n Executionsタブでエラーがないか確認
- Google Sheetsのデータ整合性確認
- 重複データがないか確認（ユニークキーで検索）

---

## トラブルシューティング

### エラー1: "Code doesn't return items properly"

**原因**: Transformノードでデータが空の場合に空配列を返している

**解決策**:
- 各Transformノードで空データ時にダミーデータ（`_skip: true`）を返す
- IFノードで`_skip: false`のデータのみフィルタリング

### エラー2: "Wrong type: 'false' is a boolean but was expecting a string"

**原因**: IFノードの型変換設定が無効

**解決策**:
- 各IFノード（Filter Empty）で以下を設定：
  - Options → **Convert types where required** ✅

### エラー3: Google Sheetsに決済別データが1行しか書き込まれない

**原因**: Column to Match Onが営業日のみで、エリアが考慮されていない

**解決策**:
- ユニークキー（`YYYY-MM-DD_エリア名`）を使用
- Google Sheetsの1列目に「ユニークキー」カラムを追加

### エラー4: VIPリストが空の日にエラー

**原因**: データが0件の場合の処理が未実装

**解決策**:
- Transformノードでダミーデータを返す
- IFノードでフィルタリング

---

## システム仕様まとめ

### 抽出データ項目数

| カテゴリ | 項目数 |
|---------|--------|
| 基本情報 | 23項目 (v1) |
| 決済別データ | 70項目 (10エリア × 7決済) |
| VIPリスト | 最大23件 |
| VVIPリスト | 最大24件 |
| 未収リスト | 最大7件 |
| 未収回収リスト | 最大7件 |
| **合計** | **約150項目** |

### Google Sheetsシート構成

| # | シート名 | 行数（1日あたり） | 用途 |
|---|---------|------------------|------|
| 1 | Sheet1 | 1行 | 基本情報・売上サマリー |
| 2 | 決済別 | 10行 | エリア別決済データ |
| 3 | VIPリスト | 0-23行 | VIP顧客データ |
| 4 | VVIPリスト | 0-24行 | VVIP顧客データ |
| 5 | 未収リスト | 0-7行 | 未収金データ |
| 6 | 未収回収リスト | 0-7行 | 回収データ |

### 処理性能

- **Excel解析**: 1回のみ（約2-3秒）
- **Google Sheets書き込み**: 並列6系統（各1-2秒）
- **合計処理時間**: 約5-10秒/ファイル

---

## 今後の拡張案

### フェーズ3候補

1. **データ分析ダッシュボード**
   - Looker Studio連携
   - 決済方法別トレンド分析
   - VIP顧客のリピート率分析

2. **アラート機能**
   - 未収金が一定額を超えたら通知
   - 売上が前日比で大幅減少したら通知

3. **自動レポート生成**
   - 週次・月次サマリーレポート
   - PDF形式でのエクスポート

4. **VPS移行**
   - 24/7稼働環境への移行
   - さくらVPS / ConoHa VPS推奨

---

**ドキュメント作成者**: Claude Code
**最終確認日**: 2025-10-23
**バージョン**: v2.0
