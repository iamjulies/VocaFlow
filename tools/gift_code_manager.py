#!/usr/bin/env python3
"""
VocaFlow Publisher Gift Code Manager
Chương trình dành riêng cho Nhà Phát Hành VocaFlow để tạo và quản lý mã quà tặng trên Cloud.
"""

import sys
import json
import urllib.request
import urllib.error
from datetime import datetime

FIREBASE_RTDB_URL = "https://vocaflow-e866c-default-rtdb.asia-southeast1.firebasedatabase.app"

def list_gift_codes():
    print("\n" + "="*50)
    print("📋 DANH SÁCH MÃ QUÀ TẶNG VOCAFLOW TRÊN CLOUD:")
    print("="*50)
    try:
        url = f"{FIREBASE_RTDB_URL}/giftCodes.json"
        req = urllib.request.Request(url, headers={"User-Agent": "VocaFlow-Publisher-Tool"})
        with urllib.request.urlopen(req) as res:
            if res.status == 200:
                data = json.loads(res.read().decode('utf-8'))
                if not data:
                    print("⚠️ Chưa có mã quà tặng nào trên Cloud.")
                    return
                print(f"{'MÃ CODE':<20} | {'GỢI Ý':<8} | {'ĐIỂM':<8} | {'NGÀY TẠO'}")
                print("-" * 55)
                for code_key, code_data in data.items():
                    if not code_data: continue
                    code = code_data.get('code', code_key)
                    hints = code_data.get('hints', 0)
                    points = code_data.get('points', 0)
                    created = code_data.get('createdAt', '')[:10]
                    print(f"{code:<20} | +{hints:<7} | +{points:<7} | {created}")
    except Exception as e:
        print(f"❌ Lỗi kết nối Cloud: {e}")

def create_gift_code(code_name: str, hints: int, points: int):
    clean_code = code_name.strip().upper()
    if not clean_code:
        print("❌ Tên mã code không được để trống!")
        return

    payload = {
        "code": clean_code,
        "hints": int(hints),
        "points": int(points),
        "isActive": True,
        "createdAt": datetime.utcnow().isoformat() + "Z"
    }

    try:
        url = f"{FIREBASE_RTDB_URL}/giftCodes/{clean_code}.json"
        req = urllib.request.Request(
            url,
            data=json.dumps(payload).encode('utf-8'),
            headers={"Content-Type": "application/json"},
            method="PUT"
        )
        with urllib.request.urlopen(req) as res:
            if res.status in (200, 201):
                print(f"\n🎉 ĐÃ PHÁT HÀNH THÀNH CÔNG MÃ: {clean_code}")
                print(f"🎁 Phần thưởng: +{hints} Lượt Gợi Ý AI & +{points} Điểm Ví")
                print("✨ Bất kỳ người dùng nào trên toàn cầu nhập mã này đều sẽ nhận được quà ngay lập tức!")
    except Exception as e:
        print(f"❌ Lỗi phát hành mã: {e}")

def delete_gift_code(code_name: str):
    clean_code = code_name.strip().upper()
    try:
        url = f"{FIREBASE_RTDB_URL}/giftCodes/{clean_code}.json"
        req = urllib.request.Request(url, method="DELETE")
        with urllib.request.urlopen(req) as res:
            if res.status in (200, 204):
                print(f"\n🗑️ Đã xóa mã '{clean_code}' khỏi Cloud thành công!")
    except Exception as e:
        print(f"❌ Lỗi xóa mã: {e}")

def interactive_menu():
    while True:
        print("\n" + "="*50)
        print("👑 VOCAFLOW PUBLISHER GIFT CODE STUDIO")
        print("="*50)
        print("1. Xem danh sách tất cả mã đang hoạt động")
        print("2. Tạo mã quà tặng mới lên Cloud")
        print("3. Xóa mã quà tặng khỏi Cloud")
        print("4. Thoát")
        choice = input("\n👉 Chọn thao tác (1-4): ").strip()

        if choice == '1':
            list_gift_codes()
        elif choice == '2':
            code = input("Nhập tên mã (vd: HOCVIEN2026, SUMMER50): ").strip()
            try:
                hts = int(input("Số lượt gợi ý tặng (vd: 50): ").strip() or "0")
                pts = int(input("Số điểm ví tặng (vd: 200): ").strip() or "0")
                create_gift_code(code, hts, pts)
            except ValueError:
                print("❌ Số điểm/gợi ý phải là số nguyên!")
        elif choice == '3':
            code = input("Nhập mã cần xóa: ").strip()
            delete_gift_code(code)
        elif choice == '4':
            print("Tạm biệt Nhà Phát Hành!")
            break
        else:
            print("Lựa chọn không hợp lệ.")

if __name__ == '__main__':
    if len(sys.argv) > 1:
        cmd = sys.argv[1].lower()
        if cmd == "list":
            list_gift_codes()
        elif cmd == "create" and len(sys.argv) >= 5:
            create_gift_code(sys.argv[2], int(sys.argv[3]), int(sys.argv[4]))
        elif cmd == "delete" and len(sys.argv) >= 3:
            delete_gift_code(sys.argv[2])
        else:
            print("Cách dùng:")
            print("  python gift_code_manager.py list")
            print("  python gift_code_manager.py create <CODE> <HINTS> <POINTS>")
            print("  python gift_code_manager.py delete <CODE>")
    else:
        interactive_menu()
