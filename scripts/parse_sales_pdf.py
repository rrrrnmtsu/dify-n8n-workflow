#!/usr/bin/env python3
"""
売上日報PDF解析スクリプト

PDFから売上データを抽出してPostgreSQLに保存
"""

import sys
import re
import os
from datetime import datetime
import psycopg2
from psycopg2.extras import RealDictCursor

# PDFテキスト抽出用
try:
    import PyPDF2
except ImportError:
    print("PyPDF2がインストールされていません: pip install PyPDF2")
    sys.exit(1)


class SalesReportParser:
    """売上日報PDFパーサー"""

    def __init__(self, pdf_path):
        self.pdf_path = pdf_path
        self.text = ""
        self.data = {}

    def extract_text(self):
        """PDFからテキストを抽出"""
        try:
            with open(self.pdf_path, 'rb') as file:
                pdf_reader = PyPDF2.PdfReader(file)
                for page in pdf_reader.pages:
                    self.text += page.extract_text()
            return True
        except Exception as e:
            print(f"PDFテキスト抽出エラー: {e}")
            return False

    def parse_date(self):
        """営業日を抽出"""
        # パターン: 2025年10月18日
        pattern = r'(\d{4})年(\d{1,2})月(\d{1,2})日'
        match = re.search(pattern, self.text)

        if match:
            year, month, day = match.groups()
            self.data['business_date'] = f"{year}-{month.zfill(2)}-{day.zfill(2)}"
        else:
            # ファイル名から抽出を試みる
            filename = os.path.basename(self.pdf_path)
            pattern = r'(\d{4})(\d{2})(\d{2})'
            match = re.search(pattern, filename)
            if match:
                year, month, day = match.groups()
                self.data['business_date'] = f"{year}-{month}-{day}"
            else:
                self.data['business_date'] = None

    def parse_customer_count(self):
        """来客数を抽出"""
        # パターン: 男性 75 女性 51 24
        pattern = r'男性\s+(\d+)\s+女性\s+(\d+)'
        match = re.search(pattern, self.text)

        if match:
            male, female = match.groups()
            self.data['male_count'] = int(male)
            self.data['female_count'] = int(female)

            # 合計（別の数値が記載されている場合があるため計算）
            self.data['total_customers'] = self.data['male_count'] + self.data['female_count']
        else:
            self.data['male_count'] = None
            self.data['female_count'] = None
            self.data['total_customers'] = None

    def parse_sales(self):
        """売上金額を抽出"""
        # 総売上パターン: ¥1,854,200 または 1,854,200
        patterns = [
            r'総売上[^\d]*¥?([\d,]+)',
            r'総売上[^\d]*([\d,]+)',
            r'営業合計[^\d]*¥?([\d,]+)',
        ]

        for pattern in patterns:
            match = re.search(pattern, self.text)
            if match:
                amount = match.group(1).replace(',', '')
                self.data['total_sales'] = int(amount)
                break
        else:
            self.data['total_sales'] = None

        # セクション売上の抽出
        sections = {
            'floor_sales': [r'フロア[^\d]*([\d,]+)', r'FRONT[^\d]*([\d,]+)'],
            'vip_sales': [r'VIP[^\d]*([\d,]+)'],
            'party_sales': [r'PARTY[^\d]*([\d,]+)'],
        }

        for key, patterns in sections.items():
            for pattern in patterns:
                matches = re.findall(pattern, self.text)
                if matches:
                    # 最大値を採用（複数マッチする場合）
                    amounts = [int(m.replace(',', '')) for m in matches]
                    self.data[key] = max(amounts)
                    break
            else:
                self.data[key] = None

    def parse_all(self):
        """全データを解析"""
        if not self.extract_text():
            return False

        self.parse_date()
        self.parse_customer_count()
        self.parse_sales()

        return True

    def get_data(self):
        """解析結果を取得"""
        return self.data


def save_to_database(data, file_info):
    """PostgreSQLにデータを保存"""

    # 環境変数から接続情報取得
    db_config = {
        'host': os.getenv('POSTGRES_HOST', 'localhost'),
        'port': os.getenv('POSTGRES_PORT', '5432'),
        'database': os.getenv('POSTGRES_DB', 'dify'),
        'user': os.getenv('POSTGRES_USER', 'postgres'),
        'password': os.getenv('POSTGRES_PASSWORD', 'difyai123456')
    }

    try:
        conn = psycopg2.connect(**db_config)
        cursor = conn.cursor(cursor_factory=RealDictCursor)

        # sales_dataテーブルに挿入
        insert_query = """
        INSERT INTO sales_data (
            business_date,
            male_count,
            female_count,
            total_customers,
            floor_sales,
            vip_sales,
            party_sales,
            total_sales,
            source_file_name,
            source_file_type,
            processed_at,
            status
        ) VALUES (
            %(business_date)s,
            %(male_count)s,
            %(female_count)s,
            %(total_customers)s,
            %(floor_sales)s,
            %(vip_sales)s,
            %(party_sales)s,
            %(total_sales)s,
            %(file_name)s,
            %(file_type)s,
            NOW(),
            'processed'
        )
        RETURNING id;
        """

        insert_data = {
            **data,
            'file_name': file_info['file_name'],
            'file_type': file_info['file_type']
        }

        cursor.execute(insert_query, insert_data)
        record_id = cursor.fetchone()['id']

        conn.commit()
        cursor.close()
        conn.close()

        print(f"✅ データベース保存成功 (ID: {record_id})")
        return record_id

    except Exception as e:
        print(f"❌ データベース保存エラー: {e}")
        return None


def main():
    """メイン処理"""

    if len(sys.argv) < 2:
        print("使用方法: python parse_sales_pdf.py <pdf_file_path>")
        sys.exit(1)

    pdf_path = sys.argv[1]

    if not os.path.exists(pdf_path):
        print(f"❌ ファイルが見つかりません: {pdf_path}")
        sys.exit(1)

    print(f"📄 PDF解析開始: {pdf_path}")

    # PDFを解析
    parser = SalesReportParser(pdf_path)

    if not parser.parse_all():
        print("❌ PDF解析失敗")
        sys.exit(1)

    data = parser.get_data()

    print("\n📊 抽出されたデータ:")
    print(f"  営業日: {data.get('business_date')}")
    print(f"  来客数: 男性 {data.get('male_count')}名, 女性 {data.get('female_count')}名, 合計 {data.get('total_customers')}名")
    print(f"  総売上: ¥{data.get('total_sales'):,}" if data.get('total_sales') else "  総売上: 未検出")
    print(f"  フロア売上: ¥{data.get('floor_sales'):,}" if data.get('floor_sales') else "  フロア売上: 未検出")
    print(f"  VIP売上: ¥{data.get('vip_sales'):,}" if data.get('vip_sales') else "  VIP売上: 未検出")
    print(f"  PARTY売上: ¥{data.get('party_sales'):,}" if data.get('party_sales') else "  PARTY売上: 未検出")

    # ファイル情報
    file_info = {
        'file_name': os.path.basename(pdf_path),
        'file_type': 'pdf'
    }

    # データベースに保存
    print("\n💾 データベースに保存中...")
    record_id = save_to_database(data, file_info)

    if record_id:
        print(f"\n🎉 処理完了！レコードID: {record_id}")
        sys.exit(0)
    else:
        print("\n❌ 処理失敗")
        sys.exit(1)


if __name__ == "__main__":
    main()
