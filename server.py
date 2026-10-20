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
from datetime import datetime, timedelta
from http.server import HTTPServer, BaseHTTPRequestHandler
from socketserver import ThreadingMixIn

from database import get_db, init_db, hash_password
from cost_calculator import calculate_design_cost
from nesting_engine import NestingEngine
from dxf_engine import generate_panel_dxf, generate_sheet_nesting_dxf, generate_csv_cut_report

PORT = int(os.environ.get('PORT', 8080))
STATIC_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "public")
if not os.path.exists(STATIC_DIR):
    STATIC_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "static")

# In-memory session token store (mirrored with SQLite sessions table for serverless)
SESSIONS = {}

def save_session(token: str, user_data: dict):
    SESSIONS[token] = user_data
    try:
        conn = get_db()
        c = conn.cursor()
        c.execute("""
        CREATE TABLE IF NOT EXISTS sessions (
            token TEXT PRIMARY KEY,
            user_id INTEGER NOT NULL,
            data_json TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id)
        );
        """)
        c.execute("INSERT OR REPLACE INTO sessions (token, user_id, data_json) VALUES (?, ?, ?)",
                  (token, user_data['id'], json.dumps(user_data, ensure_ascii=False)))
        conn.commit()
        conn.close()
    except Exception as e:
        print("save_session error:", e)

def generate_reference_code(category: str = "kitchen") -> str:
    prefix = "TR"
    rand_digits = "".join(random.choices(string.digits, k=4))
    return f"{prefix}-{rand_digits}"

def get_nearest_appointment_slots():
    conn = get_db()
    c = conn.cursor()
    c.execute("SELECT value FROM system_settings WHERE key = 'appointment_working_days'")
    row_days = c.fetchone()
    c.execute("SELECT value FROM system_settings WHERE key = 'appointment_daily_slots'")
    row_slots = c.fetchone()
    conn.close()

    TR_MONTHS = ["", "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"]
    TR_DAYS = ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi", "Pazar"]

    working_days = ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"]
    if row_days:
        try:
            working_days = json.loads(row_days[0])
        except Exception:
            pass

    daily_slots = ["10:00 - 12:00 (Sabah)", "13:30 - 15:30 (Öğle)", "16:00 - 18:00 (Akşamüstü)"]
    if row_slots:
        try:
            daily_slots = json.loads(row_slots[0])
        except Exception:
            pass

    suggested = []
    curr = datetime.now() + timedelta(days=1)
    for _ in range(14):
        day_name = TR_DAYS[curr.weekday()]
        if day_name in working_days:
            date_str = curr.strftime("%Y-%m-%d")
            friendly_date = f"{curr.day} {TR_MONTHS[curr.month]} {day_name}"
            for slot in daily_slots:
                clean_time = slot.split('(')[0].strip()
                suggested.append({
                    "date": date_str,
                    "day_name": day_name,
                    "time_slot": slot,
                    "date_label": friendly_date,
                    "time_label": clean_time,
                    "full_label": f"{friendly_date} • {clean_time}"
                })
                if len(suggested) >= 3:
                    break
        if len(suggested) >= 3:
            break
        curr += timedelta(days=1)

    return suggested

def dispatch_email_notification(to_email, recipient_name, ref_code, email_type, app_date, app_slot, admin_notes='', extra_info=None):
    if not to_email:
        return {"status": "skipped", "message": "E-posta adresi girilmedi."}

    if email_type == 'appointment_requested':
        subject = f"📅 Randevu Talebiniz Alındı: Proje {ref_code} - ModulerCraft Pro"
        headline = "Randevu & Teklif Talebiniz Başarıyla Alındı"
        status_badge_color = "#f59e0b"
        status_text = "⏳ Yönetici İncelemesinde (Talep Alındı)"
        message_intro = f"Sayın <strong>{recipient_name or 'Değerli Müşterimiz'}</strong>,<br>3D özel mobilya tasarımınız onaylı olarak fabrikamıza aktarılmış ve randevu talebiniz sıraya alınmıştır."
        details_box = f"""
        <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:16px; margin:20px 0;">
            <p style="margin:0 0 8px 0; font-size:14px; color:#475569;"><strong>Proje Referans Kodu:</strong> <span style="font-family:monospace; color:#0284c7; font-weight:700;">{ref_code}</span></p>
            <p style="margin:0 0 8px 0; font-size:14px; color:#475569;"><strong>Talep Edilen Randevu Tarihi:</strong> {app_date or 'En Yakın Mesai Dilimi'}</p>
            <p style="margin:0 0 8px 0; font-size:14px; color:#475569;"><strong>Saat Aralığı:</strong> {app_slot or 'Belirlenmedi'}</p>
            <p style="margin:0; font-size:14px; color:#475569;"><strong>Durum:</strong> <span style="color:#f59e0b; font-weight:700;">Yönetici İncelemesinde</span></p>
        </div>
        """
        extra_note = """
        <div style="background:#f0fdf4; border-left:4px solid #10b981; padding:12px; margin-bottom:20px; font-size:13px; color:#166534; line-height:1.5;">
            ✨ <strong>Randevu Görüşmesinde Birlikte Belirlenecekler:</strong><br>
            • Kör köşe akıllı donanımları (fasulye sepet, döner sepet vb.)<br>
            • Çekmece içi organizatörler, kaşıklık ve kulp seçenekleri<br>
            • Fabrika net maliyeti ve size özel fiyat teklifi
        </div>
        """
    else:
        subject = f"✅ Randevunuz Onaylandı: Proje {ref_code} - ModulerCraft Pro"
        headline = "Randevunuz Fabrika Yöneticimiz Tarafından Onaylandı!"
        status_badge_color = "#10b981"
        status_text = "🟢 Kesinleşti & Planlandı"
        message_intro = f"Sayın <strong>{recipient_name or 'Değerli Müşterimiz'}</strong>,<br><strong>{ref_code}</strong> referans kodlu özel mobilya projeniz için randevunuz teyit edilmiştir."
        admin_note_html = f'<p style="margin:8px 0 0 0; font-size:13px; color:#0369a1; background:#e0f2fe; padding:8px; border-radius:4px;"><strong>Yönetici Notu:</strong> {admin_notes}</p>' if admin_notes else ''
        details_box = f"""
        <div style="background:#f8fafc; border:1px solid #10b981; border-radius:8px; padding:16px; margin:20px 0;">
            <p style="margin:0 0 8px 0; font-size:14px; color:#475569;"><strong>Proje Referans Kodu:</strong> <span style="font-family:monospace; color:#0284c7; font-weight:700;">{ref_code}</span></p>
            <p style="margin:0 0 8px 0; font-size:15px; color:#0f172a;"><strong>Kesinleşen Randevu Tarihi:</strong> <span style="color:#10b981; font-weight:700;">{app_date}</span></p>
            <p style="margin:0 0 8px 0; font-size:15px; color:#0f172a;"><strong>Randevu Saati:</strong> <span style="color:#10b981; font-weight:700;">{app_slot}</span></p>
            {admin_note_html}
        </div>
        """
        extra_note = """
        <div style="background:#f0fdf4; border-left:4px solid #10b981; padding:12px; margin-bottom:20px; font-size:13px; color:#166534; line-height:1.5;">
            📍 <strong>Görüşme Hazırlığı:</strong> Uzmanımız randevu saatinde malzeme numuneleri ve kör köşe aksesuar kataloğu ile birlikte projenizi sunacaktır.
        </div>
        """

    body_html = f"""<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><title>{subject}</title></head>
<body style="margin:0; padding:0; background-color:#f1f5f9; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color:#f1f5f9; padding:24px 0;">
        <tr>
            <td align="center">
                <table width="600" border="0" cellspacing="0" cellpadding="0" style="background:#ffffff; border-radius:10px; overflow:hidden; box-shadow:0 4px 12px rgba(0,0,0,0.08);">
                    <tr>
                        <td style="background:#0f172a; padding:24px 32px; text-align:left;">
                            <h1 style="color:#38bdf8; margin:0; font-size:22px; letter-spacing:0.5px;">ModulerCraft Pro</h1>
                            <p style="color:#94a3b8; margin:4px 0 0 0; font-size:12px;">Özel Mobilya Tasarım & CNC Fabrika Entegrasyonu</p>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:32px; text-align:left;">
                            <span style="display:inline-block; background:{status_badge_color}; color:#ffffff; font-size:12px; font-weight:700; padding:4px 10px; border-radius:20px; margin-bottom:12px;">{status_text}</span>
                            <h2 style="color:#0f172a; margin:0 0 16px 0; font-size:18px;">{headline}</h2>
                            <p style="color:#334155; font-size:14px; line-height:1.6; margin:0 0 16px 0;">
                                {message_intro}
                            </p>
                            {details_box}
                            {extra_note}
                            <p style="color:#64748b; font-size:13px; line-height:1.5; margin:0 0 20px 0;">
                                🔒 <strong>Güvenlik & Durum Takip:</strong> Tasarımınız kilitlenmiştir. Web aplikasyonumuz üzerinden <strong>{ref_code}</strong> referans kodunuz ile dilediğiniz an canlı durumunuzu sorgulayabilirsiniz.
                            </p>
                        </td>
                    </tr>
                    <tr>
                        <td style="background:#f8fafc; border-top:1px solid #e2e8f0; padding:20px 32px; text-align:center; font-size:12px; color:#94a3b8;">
                            Bu e-posta ModulerCraft Pro sistemi tarafından otomatik olarak oluşturulmuştur.<br>
                            Sorularınız veya değişiklik talepleriniz için fabrika yöneticimiz ile iletişime geçebilirsiniz.
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>"""

    try:
        conn = get_db()
        c = conn.cursor()
        c.execute("""
        INSERT INTO email_notifications (recipient_email, recipient_name, reference_code, email_type, subject, body_html, status)
        VALUES (?, ?, ?, ?, ?, ?, 'sent')
        """, (to_email, recipient_name, ref_code, email_type, subject, body_html))
        conn.commit()
        conn.close()
    except Exception as e:
        print(f"Error saving email to DB: {e}")

    print(f"📧 [EMAIL DISPATCHED] To: {to_email} | Subject: {subject} | Ref: {ref_code}")
    return {"status": "sent", "subject": subject, "recipient": to_email}

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
            if token in SESSIONS:
                return SESSIONS[token]
            try:
                conn = get_db()
                c = conn.cursor()
                c.execute("SELECT data_json FROM sessions WHERE token = ?", (token,))
                row = c.fetchone()
                conn.close()
                if row:
                    user_data = json.loads(row['data_json'])
                    SESSIONS[token] = user_data
                    return user_data
            except Exception as e:
                print("get_auth_user error:", e)
        return None

    def get_parsed_path(self):
        matched = (
            self.headers.get('x-matched-path') or 
            self.headers.get('x-forwarded-uri') or 
            self.headers.get('x-original-url') or 
            self.headers.get('x-rewrite-url')
        )
        if matched:
            parsed = urllib.parse.urlparse(matched)
            return parsed.path, urllib.parse.parse_qs(parsed.query)

        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        query = urllib.parse.parse_qs(parsed.query)

        if path.startswith('/api/index') or path == '/api':
            if '_route' in query:
                r = query['_route'][0].lstrip('/')
                return f"/api/{r}", query
            if 'path' in query:
                r = query['path'][0].lstrip('/')
                return f"/api/{r}", query

        return path, query

    def do_GET(self):
        path, query = self.get_parsed_path()

        # Health & Status Route
        if path == '/api/health':
            return self.send_json({
                "status": "ok",
                "app": "ModulerCraft Pro",
                "version": "2.0.0",
                "platform": "vercel" if os.environ.get("VERCEL") else "local"
            }, 200)

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

        elif path == '/api/catalog/modules':
            cat = query.get('category', ['kitchen'])[0]
            conn = get_db()
            c = conn.cursor()
            c.execute("SELECT * FROM module_templates WHERE category = ? ORDER BY sort_order, id", (cat,))
            rows = c.fetchall()
            conn.close()

            groups_map = {
                'base': {'groupKey': 'base', 'title': 'Alt Dolaplar (Base)', 'icon': '🗄️', 'open': True, 'items': []},
                'wall': {'groupKey': 'wall', 'title': 'Üst Dolaplar (Wall)', 'icon': '📦', 'open': True, 'items': []},
                'tall': {'groupKey': 'tall', 'title': 'Boy Dolaplar & Kiler (Tall)', 'icon': '🧊', 'open': False, 'items': []},
                'appliance': {'groupKey': 'appliance', 'title': 'Ankastre Cihazlar', 'icon': '🔌', 'open': False, 'items': []}
            }
            for r in rows:
                gk = r['group_key']
                if gk not in groups_map:
                    groups_map[gk] = {'groupKey': gk, 'title': gk.capitalize(), 'icon': '📁', 'open': False, 'items': []}

                item = {
                    'type': r['key'],
                    'name': r['name'],
                    'category': r['group_key'],
                    'icon': r['icon'],
                    'w': r['default_w'],
                    'd': r['default_d'],
                    'h': r['default_h'],
                    'allowed_widths': json.loads(r['allowed_widths_json']),
                    'allow_custom_width': bool(r['allow_custom_width']),
                    'desc': r['description'] or ''
                }
                groups_map[gk]['items'].append(item)

            res_groups = [g for g in groups_map.values() if len(g['items']) > 0]
            return self.send_json({"groups": res_groups})

        elif path == '/api/admin/module-templates':
            conn = get_db()
            c = conn.cursor()
            c.execute("SELECT * FROM module_templates ORDER BY category, sort_order, id")
            items = []
            for r in c.fetchall():
                it = dict(r)
                it['allowed_widths'] = json.loads(r['allowed_widths_json'])
                items.append(it)
            conn.close()
            return self.send_json({"module_templates": items})

        elif path == '/api/catalog/materials':
            conn = get_db()
            c = conn.cursor()
            c.execute("SELECT * FROM wizard_materials WHERE is_active = 1 ORDER BY category, sort_order, id")
            rows = [dict(r) for r in c.fetchall()]
            conn.close()

            countertops = [r for r in rows if r['category'] == 'countertop']
            cabinets = [r for r in rows if r['category'] == 'cabinet']
            return self.send_json({
                "materials": {
                    "countertop": countertops,
                    "cabinet": cabinets
                }
            })

        elif path == '/api/admin/materials':
            conn = get_db()
            c = conn.cursor()
            c.execute("SELECT * FROM wizard_materials ORDER BY category, sort_order, id")
            items = [dict(r) for r in c.fetchall()]
            conn.close()
            return self.send_json({"materials": items})

        elif path == '/api/admin/locks':
            user = self.get_auth_user()
            if not user or user.get('role') != 'admin':
                return self.send_json({"error": "Yönetici yetkisi gereklidir."}, 403)
            conn = get_db()
            c = conn.cursor()
            c.execute("SELECT * FROM customer_access_locks ORDER BY id DESC")
            items = [dict(r) for r in c.fetchall()]
            conn.close()
            return self.send_json({"locks": items})

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

        elif path == '/api/appointments/suggested-slots':
            slots = get_nearest_appointment_slots()
            return self.send_json({"slots": slots})

        elif path == '/api/admin/schedule-settings':
            conn = get_db()
            c = conn.cursor()
            c.execute("SELECT key, value FROM system_settings WHERE key IN ('appointment_working_days', 'appointment_daily_slots')")
            rows = dict(c.fetchall())
            conn.close()
            try:
                working_days = json.loads(rows.get('appointment_working_days', '["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"]'))
            except Exception:
                working_days = ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"]
            try:
                daily_slots = json.loads(rows.get('appointment_daily_slots', '["10:00 - 12:00 (Sabah)", "13:30 - 15:30 (Öğle)", "16:00 - 18:00 (Akşamüstü)"]'))
            except Exception:
                daily_slots = ["10:00 - 12:00 (Sabah)", "13:30 - 15:30 (Öğle)", "16:00 - 18:00 (Akşamüstü)"]
            return self.send_json({
                "working_days": working_days,
                "daily_slots": daily_slots
            })

        elif path.startswith('/api/admin/emails/'):
            ref_code = path.split('/')[-1].upper()
            conn = get_db()
            c = conn.cursor()
            c.execute("SELECT * FROM email_notifications WHERE reference_code = ? ORDER BY id DESC", (ref_code,))
            items = [dict(r) for r in c.fetchall()]
            conn.close()
            return self.send_json({"emails": items})

        # Static Files Serving
        return self.serve_static(path)

    def do_POST(self):
        path, query = self.get_parsed_path()
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
            save_session(token, user_data)
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
            save_session(token, user_data)
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

        # Customer Access Check (Anti-Abuse 72-Hour Timer & Lockout)
        elif path == '/api/customer/check-access':
            phone = body.get('phone', '').strip().replace(' ', '').replace('-', '').replace('(', '').replace(')', '')
            if not phone:
                return self.send_json({"error": "Telefon numarası gereklidir."}, 400)

            conn = get_db()
            c = conn.cursor()
            c.execute("SELECT * FROM customer_access_locks WHERE phone = ?", (phone,))
            row = c.fetchone()

            if not row:
                conn.close()
                return self.send_json({
                    "exists": False,
                    "is_locked": False,
                    "remaining_hours": 72,
                    "remaining_seconds": 72 * 3600
                })

            lock = dict(row)
            try:
                expires_at = datetime.strptime(lock['expires_at'], '%Y-%m-%d %H:%M:%S')
            except Exception:
                try:
                    expires_at = datetime.fromisoformat(lock['expires_at'])
                except Exception:
                    expires_at = datetime.now() + timedelta(hours=72)

            now = datetime.now()
            if now > expires_at and not lock['is_locked']:
                c.execute("UPDATE customer_access_locks SET is_locked = 1, locked_reason = 'expired' WHERE phone = ?", (phone,))
                conn.commit()
                lock['is_locked'] = 1
                lock['locked_reason'] = 'expired'

            diff = (expires_at - now).total_seconds()
            rem_secs = max(0, int(diff))
            rem_hours = max(0, int(rem_secs / 3600))
            conn.close()

            return self.send_json({
                "exists": True,
                "phone": phone,
                "customer_name": lock['customer_name'],
                "is_locked": bool(lock['is_locked']),
                "locked_reason": lock['locked_reason'],
                "expires_at": lock['expires_at'],
                "remaining_hours": rem_hours,
                "remaining_seconds": rem_secs,
                "active_reference_code": lock['active_reference_code']
            })

        # Start or update 72-hour design session for customer phone
        elif path == '/api/customer/init-session':
            phone = body.get('phone', '').strip().replace(' ', '').replace('-', '').replace('(', '').replace(')', '')
            cust_name = body.get('customer_name', '').strip()
            if not phone:
                return self.send_json({"error": "Telefon numarası gereklidir."}, 400)

            conn = get_db()
            c = conn.cursor()
            c.execute("SELECT * FROM customer_access_locks WHERE phone = ?", (phone,))
            row = c.fetchone()

            if not row:
                expires_at = (datetime.now() + timedelta(hours=72)).strftime('%Y-%m-%d %H:%M:%S')
                c.execute("""
                INSERT INTO customer_access_locks (phone, customer_name, expires_at, is_locked)
                VALUES (?, ?, ?, 0)
                """, (phone, cust_name, expires_at))
                conn.commit()
                conn.close()
                return self.send_json({
                    "success": True,
                    "is_new": True,
                    "is_locked": False,
                    "remaining_hours": 72,
                    "remaining_seconds": 72 * 3600,
                    "expires_at": expires_at
                })

            lock = dict(row)
            try:
                expires_at = datetime.strptime(lock['expires_at'], '%Y-%m-%d %H:%M:%S')
            except Exception:
                try:
                    expires_at = datetime.fromisoformat(lock['expires_at'])
                except Exception:
                    expires_at = datetime.now() + timedelta(hours=72)

            now = datetime.now()
            if now > expires_at and not lock['is_locked']:
                c.execute("UPDATE customer_access_locks SET is_locked = 1, locked_reason = 'expired' WHERE phone = ?", (phone,))
                conn.commit()
                lock['is_locked'] = 1
                lock['locked_reason'] = 'expired'

            diff = (expires_at - now).total_seconds()
            rem_secs = max(0, int(diff))
            rem_hours = max(0, int(rem_secs / 3600))
            conn.close()

            return self.send_json({
                "success": True,
                "is_new": False,
                "is_locked": bool(lock['is_locked']),
                "locked_reason": lock['locked_reason'],
                "remaining_hours": rem_hours,
                "remaining_seconds": rem_secs,
                "expires_at": lock['expires_at'],
                "active_reference_code": lock['active_reference_code']
            })

        # Customer Portal: Save Design & Request Quote (Locks Design & Phone Access!)
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
            appointment_date = body.get('appointment_date', '').strip()
            appointment_time_slot = body.get('appointment_time_slot', '').strip()

            ref_code = generate_reference_code(category)

            conn = get_db()
            c = conn.cursor()
            c.execute("""
            INSERT INTO designs (
                reference_code, user_id, customer_name, customer_phone, customer_email, customer_city,
                category, layout_type, room_width, room_depth, room_height,
                room_config_json, modules_json, appliances_json, materials_json,
                notes, appointment_date, appointment_time_slot, status, is_locked
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'quote_requested', 1)
            """, (
                ref_code, user_id, customer_name, customer_phone, customer_email, customer_city,
                category, layout_type, room_w, room_d, room_h,
                room_config_json, modules_json, appliances_json, materials_json,
                notes, appointment_date, appointment_time_slot
            ))

            # Strictly Lock Customer Phone Access upon Appointment Request
            clean_phone = customer_phone.replace(' ', '').replace('-', '').replace('(', '').replace(')', '')
            if clean_phone:
                expires_at = (datetime.now() + timedelta(hours=72)).strftime('%Y-%m-%d %H:%M:%S')
                c.execute("""
                INSERT INTO customer_access_locks (phone, customer_name, expires_at, is_locked, locked_reason, active_reference_code)
                VALUES (?, ?, ?, 1, 'appointment_submitted', ?)
                ON CONFLICT(phone) DO UPDATE SET
                    is_locked = 1,
                    locked_reason = 'appointment_submitted',
                    active_reference_code = ?,
                    customer_name = ?,
                    updated_at = CURRENT_TIMESTAMP
                """, (clean_phone, customer_name, expires_at, ref_code, ref_code, customer_name))

            conn.commit()
            conn.close()

            # Dispatch Initial Appointment Request Email Notification
            if customer_email:
                dispatch_email_notification(
                    to_email=customer_email,
                    recipient_name=customer_name,
                    ref_code=ref_code,
                    email_type='appointment_requested',
                    app_date=appointment_date,
                    app_slot=appointment_time_slot,
                    admin_notes=notes
                )

            # STRICT BUSINESS RULE: Return reference code and confirmation, DO NOT return price to customer!
            return self.send_json({
                "success": True,
                "reference_code": ref_code,
                "is_locked": True,
                "message": "Tasarımınız kilitlenerek fabrikamıza iletildi.",
                "customer_name": customer_name,
                "status": "quote_requested"
            })

        # Customer Live Status Tracker (By Reference Code or Phone)
        elif path == '/api/customer/track-status':
            identifier = body.get('identifier', '').strip().upper()
            if not identifier:
                return self.send_json({"error": "Lütfen referans kodunuzu veya telefon numaranızı giriniz."}, 400)

            clean_phone = identifier.replace(' ', '').replace('-', '').replace('(', '').replace(')', '')
            conn = get_db()
            c = conn.cursor()
            c.execute("""
            SELECT * FROM designs
            WHERE reference_code = ? OR customer_phone LIKE ?
            ORDER BY id DESC LIMIT 1
            """, (identifier, f"%{clean_phone[-8:]}%" if len(clean_phone) >= 7 else "NOMATCH"))
            row = c.fetchone()

            if not row:
                conn.close()
                return self.send_json({"error": "Belirtilen referans kodu veya telefon ile kayıtlı tasarım bulunamadı."}, 404)

            d = dict(row)
            # Find latest email notification
            c.execute("SELECT email_type, subject, created_at FROM email_notifications WHERE reference_code = ? ORDER BY id DESC LIMIT 1", (d['reference_code'],))
            email_row = c.fetchone()
            latest_email = dict(email_row) if email_row else None
            conn.close()

            status_labels = {
                "quote_requested": "⏳ Randevu Talebiniz Alındı (Yönetici İncelemesinde)",
                "appointment_confirmed": "🟢 Randevunuz Fabrika Yöneticisi Tarafından Onaylandı",
                "reviewed": "📋 Teklif ve Randevu Hazırlandı",
                "approved": "✅ Müşteri Tarafından Onaylandı",
                "in_production": "🚀 Fabrika Üretiminde (CNC İmalat)"
            }

            return self.send_json({
                "success": True,
                "reference_code": d['reference_code'],
                "customer_name": d['customer_name'],
                "customer_phone": d['customer_phone'],
                "customer_email": d['customer_email'],
                "category": d['category'],
                "status": d['status'],
                "status_label": status_labels.get(d['status'], d['status']),
                "appointment_date": d['appointment_date'],
                "appointment_time_slot": d['appointment_time_slot'],
                "admin_notes": d['admin_notes'] or '',
                "is_locked": bool(d.get('is_locked', 1)),
                "created_at": d['created_at'],
                "latest_email": latest_email
            })

        # Admin: Confirm / Adjust Appointment and Send Official Email
        elif path == '/api/admin/appointments/confirm':
            user = self.get_auth_user()
            if not user or user.get('role') != 'admin':
                return self.send_json({"error": "Sadece yönetici randevu onaylayabilir."}, 403)

            ref_code = body.get('reference_code', '').strip().upper()
            confirmed_date = body.get('confirmed_date', '').strip()
            confirmed_slot = body.get('confirmed_slot', '').strip()
            admin_notes = body.get('admin_notes', '').strip()

            if not ref_code:
                return self.send_json({"error": "Referans kodu gereklidir."}, 400)

            conn = get_db()
            c = conn.cursor()
            c.execute("SELECT * FROM designs WHERE reference_code = ?", (ref_code,))
            row = c.fetchone()
            if not row:
                conn.close()
                return self.send_json({"error": "Tasarım bulunamadı."}, 404)

            d = dict(row)
            date_to_use = confirmed_date or d['appointment_date'] or datetime.now().strftime("%Y-%m-%d")
            slot_to_use = confirmed_slot or d['appointment_time_slot'] or "10:00 - 12:00"

            c.execute("""
            UPDATE designs
            SET status = 'appointment_confirmed',
                appointment_date = ?,
                appointment_time_slot = ?,
                admin_notes = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE reference_code = ?
            """, (date_to_use, slot_to_use, admin_notes, ref_code))
            conn.commit()
            conn.close()

            # Dispatch confirmation email
            email_res = dispatch_email_notification(
                to_email=d['customer_email'],
                recipient_name=d['customer_name'],
                ref_code=ref_code,
                email_type='appointment_confirmed',
                app_date=date_to_use,
                app_slot=slot_to_use,
                admin_notes=admin_notes
            )

            return self.send_json({
                "success": True,
                "message": f"Randevu ({date_to_use} {slot_to_use}) onaylandı ve müşteriye e-posta iletildi.",
                "reference_code": ref_code,
                "email_status": email_res.get('status')
            })

        # Admin: Update Working Schedule Settings
        elif path == '/api/admin/schedule-settings':
            user = self.get_auth_user()
            if not user or user.get('role') != 'admin':
                return self.send_json({"error": "Yönetici yetkisi gereklidir."}, 403)

            working_days = body.get('working_days', [])
            daily_slots = body.get('daily_slots', [])

            conn = get_db()
            c = conn.cursor()
            c.execute("""
            INSERT INTO system_settings (key, value, description)
            VALUES ('appointment_working_days', ?, 'Yönetici randevu mesai günleri')
            ON CONFLICT(key) DO UPDATE SET value = ?
            """, (json.dumps(working_days, ensure_ascii=False), json.dumps(working_days, ensure_ascii=False)))

            c.execute("""
            INSERT INTO system_settings (key, value, description)
            VALUES ('appointment_daily_slots', ?, 'Günlük randevu saat blokları')
            ON CONFLICT(key) DO UPDATE SET value = ?
            """, (json.dumps(daily_slots, ensure_ascii=False), json.dumps(daily_slots, ensure_ascii=False)))

            conn.commit()
            conn.close()
            return self.send_json({"success": True, "message": "Mesai ve randevu takvim ayarları güncellendi."})

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

        # Admin: Update Module Template Dimensions and Permissions
        elif path == '/api/admin/module-templates':
            user = self.get_auth_user()
            if not user or user.get('role') != 'admin':
                return self.send_json({"error": "Yönetici yetkisi gereklidir."}, 403)

            key = body.get('key')
            if not key:
                return self.send_json({"error": "Modül anahtarı gereklidir."}, 400)

            allowed_widths = body.get('allowed_widths')
            allow_custom_width = 1 if body.get('allow_custom_width') else 0
            name = body.get('name')
            default_w = body.get('default_w')
            default_d = body.get('default_d')
            default_h = body.get('default_h')

            conn = get_db()
            c = conn.cursor()
            if allowed_widths is not None:
                c.execute("""
                UPDATE module_templates 
                SET allowed_widths_json = ?, allow_custom_width = ?,
                    name = COALESCE(?, name),
                    default_w = COALESCE(?, default_w),
                    default_d = COALESCE(?, default_d),
                    default_h = COALESCE(?, default_h)
                WHERE key = ?
                """, (json.dumps(allowed_widths), allow_custom_width, name, default_w, default_d, default_h, key))
            else:
                c.execute("""
                UPDATE module_templates 
                SET allow_custom_width = ?,
                    name = COALESCE(?, name),
                    default_w = COALESCE(?, default_w),
                    default_d = COALESCE(?, default_d),
                    default_h = COALESCE(?, default_h)
                WHERE key = ?
                """, (allow_custom_width, name, default_w, default_d, default_h, key))
            conn.commit()
            conn.close()
            return self.send_json({"success": True, "message": "Modül şablonu ve ölçü kısıtlamaları kaydedildi."})

        # Admin: Save or Update Wizard Material
        elif path == '/api/admin/materials':
            user = self.get_auth_user()
            if not user or user.get('role') != 'admin':
                return self.send_json({"error": "Yönetici yetkisi gereklidir."}, 403)

            mat_id = body.get('id')
            category = body.get('category', 'countertop')
            key = body.get('key', '').strip().lower()
            name = body.get('name', '').strip()
            color_hex = body.get('color_hex', '#ffffff')
            texture_type = body.get('texture_type', 'stone')
            roughness = float(body.get('roughness', 0.25))
            metalness = float(body.get('metalness', 0.05))
            description = body.get('description', '')
            is_active = 1 if body.get('is_active', True) else 0
            sort_order = int(body.get('sort_order', 0))

            if not name:
                return self.send_json({"error": "Malzeme adı gereklidir."}, 400)

            if not key:
                import re
                key = re.sub(r'[^a-z0-9_]', '_', name.lower())

            conn = get_db()
            c = conn.cursor()
            if mat_id:
                c.execute("""
                UPDATE wizard_materials
                SET category = ?, key = ?, name = ?, color_hex = ?, texture_type = ?,
                    roughness = ?, metalness = ?, description = ?, is_active = ?, sort_order = ?
                WHERE id = ?
                """, (category, key, name, color_hex, texture_type, roughness, metalness, description, is_active, sort_order, mat_id))
            else:
                c.execute("""
                INSERT OR REPLACE INTO wizard_materials
                (category, key, name, color_hex, texture_type, roughness, metalness, description, is_active, sort_order)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (category, key, name, color_hex, texture_type, roughness, metalness, description, is_active, sort_order))

            conn.commit()
            conn.close()
            return self.send_json({"success": True, "message": "Malzeme başarıyla kaydedildi."})

        # Admin: Delete Wizard Material
        elif path == '/api/admin/materials/delete':
            user = self.get_auth_user()
            if not user or user.get('role') != 'admin':
                return self.send_json({"error": "Yönetici yetkisi gereklidir."}, 403)

            mat_id = body.get('id')
            if not mat_id:
                return self.send_json({"error": "Malzeme ID gereklidir."}, 400)

            conn = get_db()
            c = conn.cursor()
            c.execute("DELETE FROM wizard_materials WHERE id = ?", (mat_id,))
            conn.commit()
            conn.close()
            return self.send_json({"success": True, "message": "Malzeme başarıyla silindi."})

        # Admin: Unlock or Extend 72h Design Window
        elif path == '/api/admin/locks/extend':
            user = self.get_auth_user()
            if not user or user.get('role') != 'admin':
                return self.send_json({"error": "Yönetici yetkisi gereklidir."}, 403)

            phone = body.get('phone', '').strip().replace(' ', '').replace('-', '').replace('(', '').replace(')', '')
            extra_hours = int(body.get('extra_hours', 72))
            unlock_design = bool(body.get('unlock_design', True))

            if not phone:
                return self.send_json({"error": "Telefon numarası gereklidir."}, 400)

            new_expires = (datetime.now() + timedelta(hours=extra_hours)).strftime('%Y-%m-%d %H:%M:%S')

            conn = get_db()
            c = conn.cursor()
            c.execute("""
            UPDATE customer_access_locks
            SET is_locked = 0,
                locked_reason = NULL,
                expires_at = ?,
                extension_count = extension_count + 1,
                updated_at = CURRENT_TIMESTAMP
            WHERE phone = ?
            """, (new_expires, phone))

            if unlock_design:
                c.execute("UPDATE designs SET is_locked = 0 WHERE customer_phone LIKE ?", (f"%{phone[-8:]}%",))

            conn.commit()
            conn.close()
            return self.send_json({"success": True, "message": f"{phone} için {extra_hours} saat ek revize süresi tanımlandı ve kilit kaldırıldı."})

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
            self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
            self.send_header('Pragma', 'no-cache')
            self.send_header('Expires', '0')
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
