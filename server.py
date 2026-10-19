#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
ModulerCraft Pro - Full-Stack Application Server
Multi-threaded HTTP server with RESTful APIs, SQLite WAL persistence,
Dynamic Pricing Matrix, Nesting Engine, and CNC DXF/CSV Exports.
Compatible with standard Python 3.9+ environments and cPanel Passenger/WSGI.
"""

import sys
import os
import json
import urllib.parse
import mimetypes
import random
import string
from http.server import HTTPServer, BaseHTTPRequestHandler
from socketserver import ThreadingMixIn

from database import get_db, init_db, hash_password
from cost_calculator import calculate_design_cost
from nesting_engine import NestingEngine
from dxf_engine import generate_panel_dxf, generate_sheet_nesting_dxf, generate_csv_cut_report

PORT = int(os.environ.get('PORT', 8080))
STATIC_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "static")

# Simple in-memory session token store (token -> {user_id, email, role, full_name})
SESSIONS = {}

def generate_reference_code(category: str = "kitchen") -> str:
    prefix = "TR"
    rand_digits = "".join(random.choices(string.digits, k=4))
    return f"{prefix}-{rand_digits}"

class ThreadedHTTPServer(ThreadingMixIn, HTTPServer):
    daemon_threads = True

class ModulerCraftHandler(BaseHTTPRequestHandler):
    def end_headers(self):
        # Enable CORS for development & API flexibility
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Content-Length', '0')
        self.end_headers()

    def send_json(self, data, status=200):
        body = json.dumps(data, ensure_ascii=False).encode('utf-8')
        self.send_response(status)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def send_file_download(self, content_str, filename, content_type='application/octet-stream'):
        body = content_str.encode('utf-8')
        self.send_response(200)
        self.send_header('Content-Type', content_type)
        self.send_header('Content-Disposition', f'attachment; filename="{filename}"')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def read_json_body(self):
        try:
            content_length = int(self.headers.get('Content-Length', 0))
            if content_length > 0:
                raw = self.rfile.read(content_length).decode('utf-8')
                return json.loads(raw)
        except Exception as e:
            print("Error parsing json body:", e)
        return {}

    def get_auth_user(self):
        auth_header = self.headers.get('Authorization', '')
        if auth_header.startswith('Bearer '):
            token = auth_header.split(' ', 1)[1].strip()
            return SESSIONS.get(token)
        return None

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        query = urllib.parse.parse_qs(parsed.query)

        # API Routes
        if path == '/api/auth/me':
            user = self.get_auth_user()
            if not user:
                return self.send_json({"authenticated": False}, 200)
            # Fetch fresh token balance
            conn = get_db()
            c = conn.cursor()
            c.execute("SELECT tokens_balance FROM users WHERE id = ?", (user['id'],))
            row = c.fetchone()
            if row:
                user['tokens_balance'] = row['tokens_balance']
            conn.close()
            return self.send_json({"authenticated": True, "user": user}, 200)

        elif path == '/api/categories':
            return self.send_json({
                "categories": [
                    {
                        "id": "kitchen",
                        "title": "Mutfak (Kitchen)",
                        "subtitle": "Özel Tasarım Modüler Mutfak Dolapları & Tezgah",
                        "icon": "kitchen",
                        "description": "Alt dolaplar, çekmeceler, kiler boy dolapları, aspiratör modülleri ve ankastre beyaz eşya entegrasyonu.",
                        "standard_depths": {"base": 600, "wall": 350, "tall": 600},
                        "standard_heights": {"base": 720, "wall": 720, "tall": 2100}
                    },
                    {
                        "id": "portmanto",
                        "title": "Portmanto & Antre",
                        "subtitle": "Giriş Holü, Boy Aynalı Dolaplar & Ayakkabılık",
                        "icon": "hall",
                        "description": "Gizli askılık alanları, minderli oturma bench'i, çekmeceli ayakkabılık ve boy aynalı depolama dolapları.",
                        "standard_depths": {"base": 450, "tall": 550},
                        "standard_heights": {"base": 500, "tall": 2200}
                    },
                    {
                        "id": "bedroom",
                        "title": "Yatak Odası (Bedroom)",
                        "subtitle": "Gardırop, Şifonyer, Komodin & Makyaj Masası",
                        "icon": "bed",
                        "description": "Geniş iç hacimli sürgülü/menteşeli gardıroplar, komodinler, aynalı makyaj masası ve şifonyer üniteleri.",
                        "standard_depths": {"wardrobe": 600, "nightstand": 400, "vanity": 450},
                        "standard_heights": {"wardrobe": 2200, "nightstand": 500, "vanity": 780}
                    },
                    {
                        "id": "children",
                        "title": "Çocuk & Genç Odası",
                        "subtitle": "Ergonomik Çalışma Masası, Gardırop & Kitaplık",
                        "icon": "child",
                        "description": "Güvenli köşe tasarımlı gardırop, geniş çekmeceli çalışma masası, ergonomik kitaplık ve komodin.",
                        "standard_depths": {"wardrobe": 550, "desk": 600, "nightstand": 400},
                        "standard_heights": {"wardrobe": 2000, "desk": 750, "nightstand": 450}
                    }
                ]
            })

        elif path.startswith('/api/designs/reference/'):
            ref_code = path.split('/')[-1].upper()
            conn = get_db()
            c = conn.cursor()
            c.execute("SELECT * FROM designs WHERE reference_code = ?", (ref_code,))
            row = c.fetchone()
            conn.close()

            if not row:
                return self.send_json({"error": "Tasarım bulunamadı (Geçersiz referans kodu)"}, 404)

            design = dict(row)
            design['room_config'] = json.loads(design['room_config_json'])
            design['modules'] = json.loads(design['modules_json'])
            design['appliances'] = json.loads(design['appliances_json'])
            design['materials'] = json.loads(design['materials_json'])

            # Security rule: Public/Customer cannot see prices or cutting details unless authenticated admin or tokenized pro
            user = self.get_auth_user()
            is_admin_or_pro = user and (user.get('role') in ['admin', 'professional'])

            if not is_admin_or_pro:
                # Strip internal calculations for customer view
                design['admin_notes'] = None
                if design['status'] == 'quote_requested':
                    design['quote_price'] = None  # Customer sees "Teklif Hazırlanıyor"

            return self.send_json({"design": design, "authorized_view": is_admin_or_pro})

        elif path == '/api/designs/my':
            user = self.get_auth_user()
            if not user:
                return self.send_json({"error": "Giriş yapmalısınız"}, 401)
            conn = get_db()
            c = conn.cursor()
            c.execute("SELECT id, reference_code, customer_name, category, layout_type, status, quote_price, created_at FROM designs WHERE user_id = ? ORDER BY id DESC", (user['id'],))
            rows = [dict(r) for r in c.fetchall()]
            conn.close()
            return self.send_json({"designs": rows})

        # --- ADMIN ROUTES ---
        elif path == '/api/admin/designs':
            user = self.get_auth_user()
            if not user or user.get('role') not in ['admin', 'professional']:
                return self.send_json({"error": "Yetkisiz erişim. Yönetici girişi gereklidir."}, 403)
            conn = get_db()
            c = conn.cursor()
            c.execute("SELECT * FROM designs ORDER BY id DESC")
            designs = [dict(r) for r in c.fetchall()]
            conn.close()
            return self.send_json({"designs": designs})

        elif path.startswith('/api/admin/design/') and path.endswith('/cost'):
            # Calculate cost breakdown for admin
            ref_code = path.split('/')[4].upper()
            conn = get_db()
            c = conn.cursor()
            c.execute("SELECT * FROM designs WHERE reference_code = ?", (ref_code,))
            row = c.fetchone()
            conn.close()
            if not row:
                return self.send_json({"error": "Tasarım bulunamadı"}, 404)

            design = dict(row)
            design['modules'] = json.loads(design['modules_json'])
            design['appliances'] = json.loads(design['appliances_json'])
            design['materials'] = json.loads(design['materials_json'])

            cost_result = calculate_design_cost(design)
            return self.send_json({"reference_code": ref_code, "cost_calculation": cost_result})

        elif path == '/api/admin/pricing-matrix':
            conn = get_db()
            c = conn.cursor()
            c.execute("SELECT * FROM pricing_matrix ORDER BY category, id")
            items = [dict(r) for r in c.fetchall()]
            conn.close()
            return self.send_json({"pricing_matrix": items})

        elif path == '/api/admin/settings':
            conn = get_db()
            c = conn.cursor()
            c.execute("SELECT * FROM system_settings")
            settings = {r['key']: {"value": r['value'], "description": r['description']} for r in c.fetchall()}
            conn.close()
            return self.send_json({"settings": settings})

        elif path.startswith('/api/admin/design/') and '/export/dxf' in path:
            # Download CNC DXF file
            ref_code = path.split('/')[4].upper()
            conn = get_db()
            c = conn.cursor()
            c.execute("SELECT * FROM designs WHERE reference_code = ?", (ref_code,))
            row = c.fetchone()
            conn.close()
            if not row:
                return self.send_json({"error": "Tasarım bulunamadı"}, 404)

            design = dict(row)
            design['modules'] = json.loads(design['modules_json'])
            design['materials'] = json.loads(design['materials_json'])

            cost_res = calculate_design_cost(design)
            nesting = NestingEngine().nest(cost_res['panels'])

            # Generate sheet DXF for the primary 18mm sheet
            sheet_groups = nesting.get('groups', {})
            primary_sheet = None
            mat_label = "18mm_MDFlam"
            for gkey, grp in sheet_groups.items():
                if grp.get('sheets'):
                    primary_sheet = grp['sheets'][0]
                    mat_label = gkey
                    break

            if primary_sheet:
                dxf_content = generate_sheet_nesting_dxf(primary_sheet, mat_label)
            else:
                dxf_content = generate_panel_dxf(cost_res['panels'][0] if cost_res['panels'] else {})

            return self.send_file_download(dxf_content, f"ModulerCraft_{ref_code}_CNC_Pegasus.dxf", "application/dxf")

        elif path.startswith('/api/admin/design/') and '/export/csv' in path:
            # Download CSV Cut List
            ref_code = path.split('/')[4].upper()
            conn = get_db()
            c = conn.cursor()
            c.execute("SELECT * FROM designs WHERE reference_code = ?", (ref_code,))
            row = c.fetchone()
            conn.close()
            if not row:
                return self.send_json({"error": "Tasarım bulunamadı"}, 404)

            design = dict(row)
            design['modules'] = json.loads(design['modules_json'])
            design['materials'] = json.loads(design['materials_json'])

            cost_res = calculate_design_cost(design)
            csv_content = generate_csv_cut_report(cost_res['panels'], ref_code)
            return self.send_file_download(csv_content, f"ModulerCraft_{ref_code}_Kesim_Listesi.csv", "text/csv; charset=utf-8")

        # Static Files Serving
        return self.serve_static(path)

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        body = self.read_json_body()

        # Auth Register
        if path == '/api/auth/register':
            email = body.get('email', '').strip().lower()
            password = body.get('password', '')
            full_name = body.get('full_name', '').strip()
            phone = body.get('phone', '').strip()
            role = body.get('role', 'customer')
            company_name = body.get('company_name', '').strip()

            if not email or not password or not full_name:
                return self.send_json({"error": "Lütfen e-posta, şifre ve isim alanlarını doldurunuz."}, 400)

            conn = get_db()
            c = conn.cursor()
            c.execute("SELECT id FROM users WHERE email = ?", (email,))
            if c.fetchone():
                conn.close()
                return self.send_json({"error": "Bu e-posta adresi zaten kayıtlıdır."}, 400)

            # Assign 25 bonus tokens to professional architects upon registration
            initial_tokens = 25 if role == 'professional' else 0

            c.execute("""
            INSERT INTO users (email, password_hash, full_name, phone, role, tokens_balance, company_name)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (email, hash_password(password), full_name, phone, role, initial_tokens, company_name))
            new_id = c.lastrowid

            if initial_tokens > 0:
                c.execute("""
                INSERT INTO token_transactions (user_id, amount, transaction_type, description)
                VALUES (?, ?, 'bonus', 'İç Mimar Hoşgeldin Paketi (25 Jeton)')
                """, (new_id, initial_tokens))

            conn.commit()
            conn.close()

            # Create session
            token = "mc_tok_" + "".join(random.choices(string.ascii_letters + string.digits, k=32))
            user_data = {
                "id": new_id, "email": email, "full_name": full_name,
                "phone": phone, "role": role, "tokens_balance": initial_tokens,
                "company_name": company_name
            }
            SESSIONS[token] = user_data
            return self.send_json({"success": True, "token": token, "user": user_data})

        # Auth Login
        elif path == '/api/auth/login':
            email = body.get('email', '').strip().lower()
            password = body.get('password', '')

            conn = get_db()
            c = conn.cursor()
            c.execute("SELECT * FROM users WHERE email = ? AND password_hash = ?", (email, hash_password(password)))
            user_row = c.fetchone()
            conn.close()

            if not user_row:
                return self.send_json({"error": "Geçersiz e-posta veya şifre!"}, 401)

            user_data = dict(user_row)
            del user_data['password_hash']

            token = "mc_tok_" + "".join(random.choices(string.ascii_letters + string.digits, k=32))
            SESSIONS[token] = user_data
            return self.send_json({"success": True, "token": token, "user": user_data})

        # Token Purchase (for Professional users / architects)
        elif path == '/api/tokens/buy':
            user = self.get_auth_user()
            if not user:
                return self.send_json({"error": "Lütfen önce giriş yapınız."}, 401)

            token_qty = int(body.get('amount', 10))
            description = f"{token_qty} Adet Profesyonel Tasarım & CNC Jeton Paketi Satın Alma"

            conn = get_db()
            c = conn.cursor()
            c.execute("UPDATE users SET tokens_balance = tokens_balance + ? WHERE id = ?", (token_qty, user['id']))
            c.execute("""
            INSERT INTO token_transactions (user_id, amount, transaction_type, description)
            VALUES (?, ?, 'purchase', ?)
            """, (user['id'], token_qty, description))
            conn.commit()

            c.execute("SELECT tokens_balance FROM users WHERE id = ?", (user['id'],))
            new_balance = c.fetchone()[0]
            conn.close()

            user['tokens_balance'] = new_balance
            return self.send_json({"success": True, "new_balance": new_balance, "message": f"{token_qty} jeton hesabınıza yüklendi."})

        # Customer Portal: Save Design & Request Quote
        elif path == '/api/designs':
            user = self.get_auth_user()
            user_id = user['id'] if user else None

            customer_name = body.get('customer_name', '').strip() or (user['full_name'] if user else 'Değerli Müşterimiz')
            customer_phone = body.get('customer_phone', '').strip() or (user['phone'] if user else '')
            customer_email = body.get('customer_email', '').strip() or (user['email'] if user else '')
            customer_city = body.get('customer_city', 'İstanbul')
            category = body.get('category', 'kitchen')
            layout_type = body.get('layout_type', 'single_wall')

            room_w = int(body.get('room_width', 3600))
            room_d = int(body.get('room_depth', 2600))
            room_h = int(body.get('room_height', 2600))

            room_config_json = json.dumps(body.get('room_config', {}), ensure_ascii=False)
            modules_json = json.dumps(body.get('modules', []), ensure_ascii=False)
            appliances_json = json.dumps(body.get('appliances', []), ensure_ascii=False)
            materials_json = json.dumps(body.get('materials', {}), ensure_ascii=False)
            notes = body.get('notes', '')

            ref_code = generate_reference_code(category)

            conn = get_db()
            c = conn.cursor()
            c.execute("""
            INSERT INTO designs (
                reference_code, user_id, customer_name, customer_phone, customer_email, customer_city,
                category, layout_type, room_width, room_depth, room_height,
                room_config_json, modules_json, appliances_json, materials_json,
                notes, status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'quote_requested')
            """, (
                ref_code, user_id, customer_name, customer_phone, customer_email, customer_city,
                category, layout_type, room_w, room_d, room_h,
                room_config_json, modules_json, appliances_json, materials_json,
                notes
            ))
            conn.commit()
            conn.close()

            # STRICT BUSINESS RULE: Return reference code and confirmation, DO NOT return price to customer!
            return self.send_json({
                "success": True,
                "reference_code": ref_code,
                "message": "Tasarımınız başarıyla kaydedildi ve randevu/teklif talebiniz yöneticimize iletildi.",
                "customer_name": customer_name,
                "status": "quote_requested"
            })

        # Admin: Set Quote & Review
        elif path.startswith('/api/admin/design/') and path.endswith('/quote'):
            user = self.get_auth_user()
            if not user or user.get('role') != 'admin':
                return self.send_json({"error": "Sadece yönetici yetkisi ile fiyat teklifi sunulabilir."}, 403)

            ref_code = path.split('/')[4].upper()
            quote_price = float(body.get('quote_price', 0.0))
            admin_notes = body.get('admin_notes', '')
            status = body.get('status', 'reviewed')

            conn = get_db()
            c = conn.cursor()
            c.execute("""
            UPDATE designs
            SET quote_price = ?, admin_notes = ?, status = ?, updated_at = CURRENT_TIMESTAMP
            WHERE reference_code = ?
            """, (quote_price, admin_notes, status, ref_code))
            conn.commit()
            conn.close()

            return self.send_json({"success": True, "reference_code": ref_code, "quote_price": quote_price, "status": status})

        # Admin: Send To Production (On Payment/Approval)
        elif path.startswith('/api/admin/design/') and path.endswith('/send-to-production'):
            user = self.get_auth_user()
            if not user or user.get('role') != 'admin':
                return self.send_json({"error": "Sadece yönetici üretime aktarabilir."}, 403)

            ref_code = path.split('/')[4].upper()
            final_price = float(body.get('final_price', 0.0))

            conn = get_db()
            c = conn.cursor()
            c.execute("SELECT * FROM designs WHERE reference_code = ?", (ref_code,))
            row = c.fetchone()
            if not row:
                conn.close()
                return self.send_json({"error": "Tasarım bulunamadı"}, 404)

            design = dict(row)
            design['modules'] = json.loads(design['modules_json'])
            design['materials'] = json.loads(design['materials_json'])

            # Calculate cost breakdown to freeze into order record
            cost_res = calculate_design_cost(design)

            c.execute("""
            UPDATE designs
            SET status = 'in_production', quote_price = ?, updated_at = CURRENT_TIMESTAMP
            WHERE reference_code = ?
            """, (final_price or cost_res['financials']['grand_total'], ref_code))

            c.execute("""
            INSERT INTO orders (design_id, reference_code, final_price, cost_breakdown_json, payment_status, production_status, admin_id)
            VALUES (?, ?, ?, ?, 'paid', 'nesting_generated', ?)
            """, (
                design['id'],
                ref_code,
                final_price or cost_res['financials']['grand_total'],
                json.dumps(cost_res['financials'], ensure_ascii=False),
                user['id']
            ))
            conn.commit()
            conn.close()

            return self.send_json({
                "success": True,
                "reference_code": ref_code,
                "status": "in_production",
                "message": "Proje üretim bandına aktarıldı. CNC Nesting ve DXF dosyaları hazırlandı."
            })

        # Admin: Run Nesting Optimization
        elif path.startswith('/api/admin/design/') and path.endswith('/nesting'):
            ref_code = path.split('/')[4].upper()
            conn = get_db()
            c = conn.cursor()
            c.execute("SELECT * FROM designs WHERE reference_code = ?", (ref_code,))
            row = c.fetchone()
            conn.close()
            if not row:
                return self.send_json({"error": "Tasarım bulunamadı"}, 404)

            design = dict(row)
            design['modules'] = json.loads(design['modules_json'])
            design['materials'] = json.loads(design['materials_json'])

            sheet_w = float(body.get('sheet_width', 2800.0))
            sheet_h = float(body.get('sheet_height', 2100.0))
            kerf = float(body.get('saw_kerf', 4.0))

            cost_res = calculate_design_cost(design)
            nesting_engine = NestingEngine(sheet_width=sheet_w, sheet_height=sheet_h, kerf=kerf)
            nesting_data = nesting_engine.nest(cost_res['panels'])

            return self.send_json({
                "reference_code": ref_code,
                "nesting": nesting_data,
                "panel_count": len(cost_res['panels'])
            })

        # Admin: Update Pricing Matrix Unit Prices
        elif path == '/api/admin/pricing-matrix':
            user = self.get_auth_user()
            if not user or user.get('role') != 'admin':
                return self.send_json({"error": "Yönetici yetkisi gereklidir."}, 403)

            updates = body.get('items', [])
            conn = get_db()
            c = conn.cursor()
            for it in updates:
                c.execute("""
                UPDATE pricing_matrix
                SET unit_price = ?, supplier = ?, updated_at = CURRENT_TIMESTAMP
                WHERE item_key = ?
                """, (float(it['unit_price']), it.get('supplier', ''), it['item_key']))
            conn.commit()
            conn.close()
            return self.send_json({"success": True, "message": "Fiyat matrisi güncellendi."})

        # Admin: Update System Settings (Margins, labor)
        elif path == '/api/admin/settings':
            user = self.get_auth_user()
            if not user or user.get('role') != 'admin':
                return self.send_json({"error": "Yönetici yetkisi gereklidir."}, 403)

            settings = body.get('settings', {})
            conn = get_db()
            c = conn.cursor()
            for k, v in settings.items():
                c.execute("UPDATE system_settings SET value = ? WHERE key = ?", (str(v), k))
            conn.commit()
            conn.close()
            return self.send_json({"success": True, "message": "Sistem ayarları güncellendi."})

        return self.send_json({"error": "Endpoint not found"}, 404)

    def serve_static(self, path):
        if path == '/' or path == '':
            path = '/index.html'

        file_path = os.path.join(STATIC_DIR, path.lstrip('/'))
        if not os.path.exists(file_path) or os.path.isdir(file_path):
            file_path = os.path.join(STATIC_DIR, 'index.html')

        mime_type, _ = mimetypes.guess_type(file_path)
        if not mime_type:
            mime_type = 'text/plain'

        try:
            with open(file_path, 'rb') as f:
                content = f.read()
            self.send_response(200)
            self.send_header('Content-Type', f"{mime_type}; charset=utf-8" if 'text' in mime_type or 'javascript' in mime_type or 'json' in mime_type else mime_type)
            self.send_header('Content-Length', str(len(content)))
            self.end_headers()
            self.wfile.write(content)
        except Exception as e:
            self.send_response(500)
            self.end_headers()
            self.wfile.write(f"Error reading file: {e}".encode('utf-8'))

def run_server():
    init_db()
    server_address = ('0.0.0.0', PORT)
    httpd = ThreadedHTTPServer(server_address, ModulerCraftHandler)
    print(f"============================================================")
    print(f"  ModulerCraft Pro Server started successfully on port {PORT}")
    print(f"  Access URL: http://localhost:{PORT}")
    print(f"  Admin Login: admin@modulercraft.com / admin123")
    print(f"  Pro User:    mimar@tasarim.com / mimar123")
    print(f"============================================================")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down server...")
        httpd.server_close()

if __name__ == '__main__':
    run_server()
