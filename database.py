#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
ModulerCraft Pro - Database Engine & ORM
Multi-user support, dynamic pricing matrix, design storage, order management.
"""

import sqlite3
import hashlib
import json
import os
import time
import shutil

IS_VERCEL = bool(os.environ.get("VERCEL") or os.environ.get("VERCEL_ENV") or os.environ.get("AWS_LAMBDA_FUNCTION_NAME"))

if IS_VERCEL:
    DB_PATH = "/tmp/modulercraft.db"
else:
    DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "modulercraft.db")

def ensure_db_exists():
    if IS_VERCEL and not os.path.exists(DB_PATH):
        seed_db = os.path.join(os.path.dirname(os.path.abspath(__file__)), "modulercraft.db")
        if os.path.exists(seed_db):
            try:
                shutil.copyfile(seed_db, DB_PATH)
            except Exception as e:
                print("Could not copy seed DB to /tmp:", e)
        if not os.path.exists(DB_PATH):
            init_db()

def hash_password(password: str) -> str:
    salt = "mc_salt_2026_x89"
    return hashlib.sha256((password + salt).encode('utf-8')).hexdigest()

def get_db():
    if IS_VERCEL:
        ensure_db_exists()
    conn = sqlite3.connect(DB_PATH, timeout=15)
    conn.row_factory = sqlite3.Row
    try:
        if IS_VERCEL:
            conn.execute("PRAGMA journal_mode=MEMORY;")
        else:
            conn.execute("PRAGMA journal_mode=WAL;")
        conn.execute("PRAGMA foreign_keys=ON;")
    except Exception:
        pass
    return conn

def init_db():
    if IS_VERCEL:
        os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    conn = sqlite3.connect(DB_PATH, timeout=15)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()

    # Users Table
    c.execute("""
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        full_name TEXT NOT NULL,
        phone TEXT,
        role TEXT NOT NULL DEFAULT 'customer', -- 'customer', 'professional', 'admin'
        tokens_balance INTEGER NOT NULL DEFAULT 0,
        company_name TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """)

    # Designs Table
    c.execute("""
    CREATE TABLE IF NOT EXISTS designs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        reference_code TEXT UNIQUE NOT NULL,
        user_id INTEGER,
        customer_name TEXT NOT NULL,
        customer_phone TEXT NOT NULL,
        customer_email TEXT,
        customer_city TEXT DEFAULT 'İstanbul',
        category TEXT NOT NULL, -- 'kitchen', 'portmanto', 'bedroom', 'children'
        layout_type TEXT NOT NULL, -- 'single_wall', 'l_right', 'l_left', 'u_shape'
        room_width INTEGER NOT NULL, -- in mm (e.g. 3600)
        room_depth INTEGER NOT NULL, -- in mm (e.g. 2800)
        room_height INTEGER NOT NULL, -- in mm (e.g. 2600)
        room_config_json TEXT NOT NULL, -- doors, windows, flooring, sponsor
        modules_json TEXT NOT NULL, -- array of cabinet modules with dimensions & positions
        appliances_json TEXT NOT NULL, -- selected appliances
        materials_json TEXT NOT NULL, -- body color, door finish, handle type, countertop type
        notes TEXT,
        appointment_date TEXT,
        appointment_time_slot TEXT,
        status TEXT NOT NULL DEFAULT 'quote_requested', -- 'draft', 'quote_requested', 'reviewed', 'approved', 'in_production', 'completed'
        quote_price REAL DEFAULT 0.0,
        admin_notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
    );
    """)

    # Dynamic Pricing Matrix
    c.execute("""
    CREATE TABLE IF NOT EXISTS pricing_matrix (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        category TEXT NOT NULL, -- 'panel', 'countertop', 'hardware', 'appliance', 'edge_band', 'sink'
        item_key TEXT UNIQUE NOT NULL,
        item_name TEXT NOT NULL,
        unit TEXT NOT NULL, -- 'm2', 'meter', 'piece', 'set'
        unit_price REAL NOT NULL,
        supplier TEXT,
        description TEXT,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """)

    # System Settings (Margins, labor, taxes)
    c.execute("""
    CREATE TABLE IF NOT EXISTS system_settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        description TEXT
    );
    """)

    # Orders Table
    c.execute("""
    CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        design_id INTEGER NOT NULL,
        reference_code TEXT NOT NULL,
        final_price REAL NOT NULL,
        cost_breakdown_json TEXT NOT NULL,
        payment_status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'paid'
        production_status TEXT NOT NULL DEFAULT 'ready', -- 'ready', 'nesting_generated', 'sent_to_cnc', 'completed'
        admin_id INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (design_id) REFERENCES designs (id)
    );
    """)

    # Token Transactions
    c.execute("""
    CREATE TABLE IF NOT EXISTS token_transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        amount INTEGER NOT NULL,
        transaction_type TEXT NOT NULL, -- 'purchase', 'spend', 'bonus'
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
    );
    """)

    # Serverless Sessions Table
    c.execute("""
    CREATE TABLE IF NOT EXISTS sessions (
        token TEXT PRIMARY KEY,
        user_id INTEGER NOT NULL,
        data_json TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
    );
    """)

    # Module Templates Table (Admin-managed module catalog and allowed dimensions)
    c.execute("""
    CREATE TABLE IF NOT EXISTS module_templates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        key TEXT UNIQUE NOT NULL,
        category TEXT NOT NULL DEFAULT 'kitchen',
        group_key TEXT NOT NULL DEFAULT 'base',
        name TEXT NOT NULL,
        icon TEXT NOT NULL DEFAULT '🗄️',
        default_w INTEGER NOT NULL,
        default_d INTEGER NOT NULL,
        default_h INTEGER NOT NULL,
        allowed_widths_json TEXT NOT NULL,
        allow_custom_width INTEGER NOT NULL DEFAULT 1,
        description TEXT,
        sort_order INTEGER DEFAULT 0
    );
    """)

    # Wizard Materials Table (Countertops & Cabinet Finishes managed by Admin)
    c.execute("""
    CREATE TABLE IF NOT EXISTS wizard_materials (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        category TEXT NOT NULL, -- 'countertop' or 'cabinet'
        key TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        color_hex TEXT NOT NULL DEFAULT '#ffffff',
        texture_type TEXT NOT NULL DEFAULT 'matte', -- 'stone', 'marble', 'wood', 'acrylic', 'matte', 'glossy'
        roughness REAL NOT NULL DEFAULT 0.3,
        metalness REAL NOT NULL DEFAULT 0.05,
        description TEXT,
        is_active INTEGER NOT NULL DEFAULT 1,
        sort_order INTEGER DEFAULT 0
    );
    """)

    # Customer Access Locks Table (Anti-Abuse, 72-Hour Timer & Freezing)
    c.execute("""
    CREATE TABLE IF NOT EXISTS customer_access_locks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        phone TEXT UNIQUE NOT NULL,
        customer_name TEXT,
        first_access_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP NOT NULL,
        is_locked INTEGER NOT NULL DEFAULT 0,
        locked_reason TEXT, -- 'appointment_submitted', 'expired', 'admin_frozen'
        active_reference_code TEXT,
        extension_count INTEGER DEFAULT 0,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """)

    # Email Notifications Log Table
    c.execute("""
    CREATE TABLE IF NOT EXISTS email_notifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        recipient_email TEXT NOT NULL,
        recipient_name TEXT,
        reference_code TEXT,
        email_type TEXT NOT NULL, -- 'appointment_requested', 'appointment_confirmed'
        subject TEXT NOT NULL,
        body_html TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'sent',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """)

    # Safe schema migration for appointment and lock columns
    try:
        c.execute("ALTER TABLE designs ADD COLUMN appointment_date TEXT;")
    except Exception:
        pass
    try:
        c.execute("ALTER TABLE designs ADD COLUMN appointment_time_slot TEXT;")
    except Exception:
        pass
    try:
        c.execute("ALTER TABLE designs ADD COLUMN is_locked INTEGER DEFAULT 0;")
    except Exception:
        pass

    conn.commit()
    seed_module_templates(conn)
    seed_wizard_materials(conn)

    # Seed Default Admin & Users
    c.execute("SELECT COUNT(*) FROM users")
    if c.fetchone()[0] == 0:
        # Admin account
        c.execute("""
        INSERT INTO users (email, password_hash, full_name, phone, role, tokens_balance, company_name)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (
            'admin@modulercraft.com',
            hash_password('admin123'),
            'Yönetici (Eşinizin Paneli)',
            '0532 000 00 01',
            'admin',
            999,
            'ModulerCraft Atölye ve Fabrika'
        ))

        # Professional interior designer account
        c.execute("""
        INSERT INTO users (email, password_hash, full_name, phone, role, tokens_balance, company_name)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (
            'mimar@tasarim.com',
            hash_password('mimar123'),
            'Mimar Selin Korkmaz',
            '0533 111 22 33',
            'professional',
            35,
            'Artisan İç Mimarlık & Proje'
        ))

        # Standard customer account
        c.execute("""
        INSERT INTO users (email, password_hash, full_name, phone, role, tokens_balance, company_name)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (
            'ahmet.yilmaz@gmail.com',
            hash_password('musteri123'),
            'Ahmet Yılmaz',
            '0555 444 33 22',
            'customer',
            0,
            ''
        ))
        conn.commit()

    # Seed Dynamic Pricing Matrix
    default_pricing = [
        # Panels & Sheets
        ('panel', 'mdf_18mm_standart', '18mm MDFlam Standart (Gövde & Kapak)', 'm2', 720.0, 'Kastamonu Entegre / Yıldız Entegre', 'Standart mobilya gövdesi ve kapaklar için 1. sınıf melamin kaplı yonga/MDF levha'),
        ('panel', 'mdf_18mm_highgloss', '18mm MDF High-Gloss / Akrilik Kapak', 'm2', 1150.0, 'AGT', 'Yüksek parlaklıkta akrilik veya pet kaplı çizilmez kapak paneli'),
        ('panel', 'mdf_18mm_lake', '18mm Ham MDF + İpek Mat Lake Boya', 'm2', 1650.0, 'Özel İmalat Lake', 'CNC kanallı veya düz ipek mat poliüretan lake kapak'),
        ('panel', 'back_4mm_standart', '4mm Arkalık MDFlam (Standart)', 'm2', 130.0, 'Kastamonu Entegre', 'Dolap arkalıkları ve çekmece dipleri için tek/çift yüzlü 4mm'),
        ('panel', 'back_5mm_opsiyonel', '5mm Arkalık MDFlam (Opsiyonel)', 'm2', 170.0, 'Yıldız Entegre', 'Ekstra rijit arkalık paneli'),
        ('panel', 'back_8mm_opsiyonel', '8mm Arkalık MDFlam (Ağır Hizmet)', 'm2', 260.0, 'Kastamonu Entegre', 'Duvara asma dolaplar ve ağır modüller için mukavemetli arkalık'),

        # Edge Banding (PVC)
        ('edge_band', 'pvc_08mm_govde', '0.8mm PVC Kenar Bandı (Gövde)', 'meter', 12.0, 'Roma Plastik', 'Gövde parçalarının kenar izolasyonu'),
        ('edge_band', 'pvc_20mm_kapak', '2.0mm PVC Kenar Bandı (Kapak)', 'meter', 24.0, 'Roma Plastik', 'Kapakların darbe dayanımlı radiuslu kenar bandı'),

        # Countertops (Tezgah - linear meter)
        ('countertop', 'tezgah_cimstone', 'Çimstone Kompoze Kuvars Tezgah', 'meter', 4200.0, 'Çimstone', 'Kuvars esaslı leke tutmaz 20mm/40mm pahlı mutfak tezgahı'),
        ('countertop', 'tezgah_granit', 'Doğal Granit Tezgah (Siyah / Gri)', 'meter', 4900.0, 'Doğaltaş Madencilik', 'Doğal taş yüksek ısı dayanımlı granit tezgah'),
        ('countertop', 'tezgah_porselen', 'Porselen Levha Tezgah (Laminam / Dekton)', 'meter', 6800.0, 'İthal Porselen', 'Ultra kompakt çizilmez ve yanmaz porselen tezgah'),
        ('countertop', 'tezgah_masif', 'Masif Meşe Ağacı Yağlı Tezgah', 'meter', 3500.0, 'Yerli Masif Panel', 'Doğal ahşap sıcak dokulu organik mutfak tezgahı'),
        ('countertop', 'tezgah_laminat', 'Damlalıklı Laminat Tezgah (Ekonomik)', 'meter', 1350.0, 'Gentaş / Kronospan', 'HPL laminat kaplı HDF suya dayanıklı postforming tezgah'),

        # Hardware & Accessories
        ('hardware', 'mentese_frenli', 'Frenli Tas Menteşe (Yumuşak Kapanır)', 'piece', 48.0, 'Samet / Blum', '110 derece açılımlı entegre fren mekanizmalı menteşe'),
        ('hardware', 'cekmece_ray_tandem', 'Gizli Frenli Çekmece Rayı (Tandem 45cm)', 'set', 340.0, 'Samet / Blum', 'Kısmi veya tam açılımlı yavaşlatıcılı gizli ray takımı'),
        ('hardware', 'kulp_modern', 'Modern Metal / Alüminyum Profil Kulp', 'piece', 65.0, 'Hafele / Çebi', 'Eloksallı alüminyum veya mat siyah kulp'),
        ('hardware', 'minifix_baglanti', 'Minifix Mil + Gövde + Kavela Takımı', 'set', 14.0, 'Hafele / Samet', 'CNC montajlı gizli gövde kilit bağlantı elemanı'),
        ('hardware', 'baza_ayagi_10cm', 'Ayarlı Baza Ayağı (100mm)', 'piece', 22.0, 'Yerli Plastik Kalıp', 'Su ve rutubet teması engelleyici yükseklik ayarlı ayak'),
        ('hardware', 'aluminyum_baza', 'Alüminyum Süpürgelik Baza Profili', 'meter', 190.0, 'Kızıltepe Profil', 'Dolap altı sızdırmaz contalı metalik süpürgelik'),
        ('hardware', 'aventos_kalkar_kapak', 'Aventos HF Çift Kanat Katlanır Kalkar Kapak Mekanizması', 'set', 1850.0, 'Blum Aventos', 'Üst dolaplar için elektrikli/mekanik amortisörlü kalkar sistem'),

        # Sinks & Plumbing
        ('sink', 'evye_paslanmaz', 'Paslanmaz Çelik Evye (Tek Gözlü + Damlalıklı)', 'piece', 1850.0, 'Teka / Franke', 'Krom nikel AISI 304 paslanmaz tezgah altı/üstü evye'),
        ('sink', 'evye_granit', 'Granit Kompozit Evye (Antrasit / Siyah)', 'piece', 3900.0, 'Franke / Blanco', 'Kuvars kompozit çizilmeye dayanıklı estetik evye'),
        ('sink', 'batarya_mutfak', 'Döner Borulu Spiral Başlıklı Mutfak Bataryası', 'piece', 1650.0, 'E.C.A / Artema', 'Pirinç gövde krom/mat siyah sıcak-soğuk batarya'),

        # Appliances (Beyaz Eşya)
        ('appliance', 'buzdolabi_kombi', 'No-Frost Kombi Tipi Buzdolabı (Genişlik 70cm)', 'piece', 29500.0, 'Bosch / Siemens', 'A++ enerji sınıfı alttan donduruculu'),
        ('appliance', 'firin_ankastre', 'Multifonksiyonel Ankastre Fırın', 'piece', 17800.0, 'Siemens / Bosch', 'Turbo fanlı dijital programlı siyah cam ankastre fırın'),
        ('appliance', 'ocak_ankastre', '4 Gözlü Gazlı / İndüksiyonlu Ankastre Ocak', 'piece', 10500.0, 'Siemens / Franke', 'Gaz emniyetli temperli cam yüzey ankastre ocak'),
        ('appliance', 'davlumbaz_egimli', '60cm Dokunmatik Eğimli Siyah Cam Davlumbaz', 'piece', 11900.0, 'Franke / Silverline', 'Yüksek emiş debili karbon filtreli duvar davlumbazı'),
        ('appliance', 'bulasik_ankastre', 'Tam Ankastre Bulaşık Makinesi', 'piece', 19500.0, 'Bosch / Siemens', '6 programlı sessiz motorlu mobilya kapaklı ankastre'),
        ('appliance', 'camasir_makinesi', '9 kg 1200 Devir Çamaşır Makinesi', 'piece', 21000.0, 'Bosch / Beko', 'Inverter motorlu enerji tasarruflu'),
        ('appliance', 'mikrodalga_ankastre', 'Gömme Ankastre Mikrodalga Fırın', 'piece', 8500.0, 'Siemens / Teka', 'Izgaralı paslanmaz çelik çerçeveli'),
        ('appliance', 'kahve_makinesi', 'Otomatik Espresso & Kahve Makinesi', 'piece', 24000.0, 'DeLonghi / Siemens', 'Dahili değirmenli tam otomatik')
    ]

    for p in default_pricing:
        c.execute("""
        INSERT OR IGNORE INTO pricing_matrix (category, item_key, item_name, unit, unit_price, supplier, description)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        """, p)

    # Seed System Settings
    default_settings = [
        ('profit_margin_percent', '35.0', 'Fabrika net kar marjı yüzdesi (%)'),
        ('labor_cost_per_module', '480.0', 'Modül başına montaj ve atölye işçilik maliyeti (TL)'),
        ('min_labor_cost', '2500.0', 'Minimum işçilik alt limiti (TL)'),
        ('transport_assembly_fee', '3200.0', 'Şehir içi nakliye ve profesyonel kurulum ücreti (TL)'),
        ('vat_tax_percent', '20.0', 'KDV Vergisi Oranı (%)'),
        ('token_price_try', '250.0', '1 Profesyonel Tasarım Jetonu Bedeli (TL)'),
        ('token_per_design_export', '1', 'Profesyonel proje çıktısı için gereken jeton'),
        ('appointment_working_days', '["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"]', 'Yönetici randevu kabul edilen mesai günleri'),
        ('appointment_daily_slots', '["10:00 - 12:00 (Sabah)", "13:30 - 15:30 (Öğle)", "16:00 - 18:00 (Akşamüstü)"]', 'Günlük randevu saat blokları')
    ]

    for s in default_settings:
        c.execute("""
        INSERT OR IGNORE INTO system_settings (key, value, description)
        VALUES (?, ?, ?)
        """, s)

    # Seed Sample Designs if none exist
    c.execute("SELECT COUNT(*) FROM designs")
    if c.fetchone()[0] == 0:
        # Sample Kitchen Design
        kitchen_modules = [
            {"id": "MOD-01", "type": "base_drawer_3", "name": "3 Çekmeceli Alt Dolap", "category": "base", "w": 600, "d": 600, "h": 720, "x": 0, "y": 0, "wall": "bottom", "hinges": 0, "drawers": 3, "shelves": 0},
            {"id": "MOD-02", "type": "base_oven", "name": "Ankastre Fırın Alt Modülü", "category": "base", "w": 600, "d": 600, "h": 720, "x": 600, "y": 0, "wall": "bottom", "hinges": 0, "drawers": 1, "shelves": 1},
            {"id": "MOD-03", "type": "base_dishwasher", "name": "Bulaşık Makinesi Boşluğu", "category": "base", "w": 600, "d": 600, "h": 720, "x": 1200, "y": 0, "wall": "bottom", "hinges": 0, "drawers": 0, "shelves": 0},
            {"id": "MOD-04", "type": "base_sink", "name": "Eviye Alt Dolabı (2 Kapak)", "category": "base", "w": 900, "d": 600, "h": 720, "x": 1800, "y": 0, "wall": "bottom", "hinges": 4, "drawers": 0, "shelves": 1},
            {"id": "MOD-05", "type": "base_standard", "name": "Standart Raf Alt Dolap (1 Kapak)", "category": "base", "w": 500, "d": 600, "h": 720, "x": 2700, "y": 0, "wall": "bottom", "hinges": 2, "drawers": 0, "shelves": 2},
            {"id": "MOD-06", "type": "wall_hood", "name": "Davlumbaz Üst Dolap Modülü", "category": "wall", "w": 600, "d": 350, "h": 720, "x": 600, "y": 0, "wall": "bottom", "hinges": 2, "drawers": 0, "shelves": 1},
            {"id": "MOD-07", "type": "wall_double", "name": "Çift Kapaklı Üst Dolap", "category": "wall", "w": 900, "d": 350, "h": 720, "x": 1800, "y": 0, "wall": "bottom", "hinges": 4, "drawers": 0, "shelves": 2},
            {"id": "MOD-08", "type": "wall_single", "name": "Tek Kapaklı Üst Dolap", "category": "wall", "w": 500, "d": 350, "h": 720, "x": 2700, "y": 0, "wall": "bottom", "hinges": 2, "drawers": 0, "shelves": 2},
            {"id": "MOD-09", "type": "tall_fridge", "name": "Buzdolabı Üstü Kiler Dolabı", "category": "tall", "w": 700, "d": 600, "h": 2100, "x": 3200, "y": 0, "wall": "bottom", "hinges": 4, "drawers": 0, "shelves": 4}
        ]
        room_conf = {
            "door": {"wall": "left", "pos": 500, "width": 900, "swing": "inward_right"},
            "window": {"wall": "top", "pos": 1200, "width": 1200, "sill_height": 950},
            "flooring": {"type": "AGT Parke Doğal Meşe", "sponsor": "AGT Zemin Sistemleri"},
            "wall_color": "#F3F4F6"
        }
        appliances_selected = [
            {"key": "buzdolabi_kombi", "name": "No-Frost Buzdolabı", "qty": 1},
            {"key": "firin_ankastre", "name": "Multifonksiyonel Ankastre Fırın", "qty": 1},
            {"key": "ocak_ankastre", "name": "Ankastre Ocak", "qty": 1},
            {"key": "davlumbaz_egimli", "name": "Eğimli Cam Davlumbaz", "qty": 1},
            {"key": "bulasik_ankastre", "name": "Ankastre Bulaşık Makinesi", "qty": 1}
        ]
        materials_selected = {
            "body_material": "mdf_18mm_standart",
            "door_material": "mdf_18mm_highgloss",
            "back_panel": "back_4mm_standart",
            "body_color": "Kaşmir Gri",
            "door_color": "Mat Antrasit / Meşe",
            "countertop_material": "tezgah_cimstone",
            "countertop_color": "Çimstone Calacatta",
            "sink_material": "evye_granit",
            "handle_type": "kulp_modern",
            "countertop_length_meters": 3.9
        }

        c.execute("""
        INSERT INTO designs (
            reference_code, user_id, customer_name, customer_phone, customer_email, customer_city,
            category, layout_type, room_width, room_depth, room_height,
            room_config_json, modules_json, appliances_json, materials_json,
            notes, status, quote_price, admin_notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            'TR-8421',
            3,
            'Ahmet Yılmaz',
            '0555 444 33 22',
            'ahmet.yilmaz@gmail.com',
            'İstanbul / Kadıköy',
            'kitchen',
            'single_wall',
            4000,
            2800,
            2600,
            json.dumps(room_conf),
            json.dumps(kitchen_modules),
            json.dumps(appliances_selected),
            json.dumps(materials_selected),
            'Ada tezgah düşünmüyoruz, ankastre fırın boy dolapta değil tezgah altında olsun.',
            'quote_requested',
            0.0,
            'Müşteri randevu istedi. Haftaya keşif yapılacak.'
        ))

        # Sample Portmanto Design
        portmanto_modules = [
            {"id": "PRT-01", "type": "hall_shoe_bench", "name": "Oturmalı Ayakkabılık ve Askılık", "category": "base", "w": 1000, "d": 450, "h": 500, "x": 0, "y": 0, "wall": "bottom", "hinges": 2, "drawers": 2, "shelves": 2},
            {"id": "PRT-02", "type": "hall_mirror_cabinet", "name": "Boy Aynalı Gizli Dolap", "category": "tall", "w": 600, "d": 450, "h": 2200, "x": 1000, "y": 0, "wall": "bottom", "hinges": 4, "drawers": 0, "shelves": 5},
            {"id": "PRT-03", "type": "hall_coat_wardrobe", "name": "2 Kapaklı Askılıklı Portmanto", "category": "tall", "w": 1000, "d": 600, "h": 2200, "x": 1600, "y": 0, "wall": "bottom", "hinges": 4, "drawers": 2, "shelves": 3}
        ]
        portmanto_conf = {
            "door": {"wall": "right", "pos": 300, "width": 900, "swing": "inward_left"},
            "window": None,
            "flooring": {"type": "Bien Seramik Granit Zemin", "sponsor": "Bien Seramik"},
            "wall_color": "#E5E7EB"
        }
        portmanto_materials = {
            "body_material": "mdf_18mm_standart",
            "door_material": "mdf_18mm_standart",
            "back_panel": "back_4mm_standart",
            "body_color": "Antrasit",
            "door_color": "Ceviz Dokulu MDFlam",
            "handle_type": "kulp_modern"
        }
        c.execute("""
        INSERT INTO designs (
            reference_code, user_id, customer_name, customer_phone, customer_email, customer_city,
            category, layout_type, room_width, room_depth, room_height,
            room_config_json, modules_json, appliances_json, materials_json,
            notes, status, quote_price, admin_notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            'TR-5932',
            2,
            'Selin Korkmaz (İç Mimar)',
            '0533 111 22 33',
            'mimar@tasarim.com',
            'İzmir / Karşıyaka',
            'portmanto',
            'single_wall',
            2800,
            2000,
            2500,
            json.dumps(portmanto_conf),
            json.dumps(portmanto_modules),
            json.dumps([]),
            json.dumps(portmanto_materials),
            'Giriş antresi için lüks portmanto ve gizli ayna modülü.',
            'reviewed',
            48500.0,
            'Fiyat teklifi hazırlandı, müşteri onay bekliyor.'
        ))

        conn.commit()

def seed_module_templates(conn):
    c = conn.cursor()
    c.execute("SELECT COUNT(*) FROM module_templates")
    if c.fetchone()[0] == 0:
        templates = [
            # Kitchen - Base
            ('base_standard', 'kitchen', 'base', 'Standart Tek Kapak Alt Dolap', '🚪', 500, 600, 720, json.dumps([300, 400, 450, 500, 600]), 1, '1 ayarlı raflı tek kapak', 1),
            ('base_double', 'kitchen', 'base', 'Çift Kapaklı Geniş Alt Dolap', '🚪', 800, 600, 720, json.dumps([600, 800, 900, 1000]), 1, 'Geniş tencere depolama', 2),
            ('base_drawer_3', 'kitchen', 'base', '3 Çekmeceli Alt Dolap', '🗄️', 600, 600, 720, json.dumps([400, 450, 600, 800, 900]), 0, 'Frenli tandem raylı 3 çekmece', 3),
            ('base_sink', 'kitchen', 'base', 'Eviye Alt Dolabı (2 Kapak)', '💧', 900, 600, 720, json.dumps([600, 800, 900, 1000]), 0, 'Paslanmaz/granit eviye altı', 4),
            ('base_oven', 'kitchen', 'base', 'Ankastre Fırın & Ocak Modülü', '♨️', 600, 600, 720, json.dumps([600, 900]), 0, 'Fırın boşluğu ve alt çekmece', 5),
            ('base_dishwasher', 'kitchen', 'base', 'Bulaşık Makinesi Paneli', '🍽️', 600, 600, 720, json.dumps([450, 600]), 0, 'Tam ankastre bulaşık makinesi kapağı', 6),
            ('base_corner_straight', 'kitchen', 'base', 'Düz Kör Köşe Alt Dolap', '📐', 1000, 600, 720, json.dumps([1000, 1050]), 0, 'Düz kör köşe dönüş dolabı (Tek Raflı)', 7),
            ('base_corner_l', 'kitchen', 'base', '90° L-Köşe Alt Dolap', '📐', 900, 900, 720, json.dumps([900, 950]), 0, '90° L köşe dönüş dolabı (Tek Raflı)', 8),
            ('base_corner_v', 'kitchen', 'base', 'V-Köşe (45° Diyagonal) Alt Dolap', '📐', 900, 900, 720, json.dumps([900, 950]), 0, '45° pahlı diyagonal köşe dolabı (Tek Raflı)', 9),
            
            # Kitchen - Wall
            ('wall_single', 'kitchen', 'wall', 'Tek Kapaklı Üst Dolap', '📦', 500, 350, 720, json.dumps([300, 400, 500, 600]), 1, 'Dar alan üst depolama', 10),
            ('wall_double', 'kitchen', 'wall', 'Çift Kapaklı Üst Dolap', '📦', 800, 350, 720, json.dumps([600, 800, 900, 1000]), 1, '2 ayarlı raflı standart üst dolap', 11),
            ('wall_glass', 'kitchen', 'wall', 'Camlı Yatay Kalkar Dolap', '🪟', 900, 350, 720, json.dumps([600, 800, 900, 1000]), 0, 'Buzlu cam insets & Aventos mekanizma', 12),
            ('wall_hood', 'kitchen', 'wall', 'Davlumbaz Üstü Aspiratör Dolabı', '💨', 600, 350, 720, json.dumps([600, 900]), 0, 'Karbon filtreli gömme aspiratör kabini', 13),
            ('wall_corner_straight', 'kitchen', 'wall', 'Düz Kör Köşe Üst Dolap', '📐', 650, 350, 720, json.dumps([650]), 0, 'Düz kör köşe üst dolap (Tek Raflı)', 14),
            ('wall_corner_l', 'kitchen', 'wall', '90° L-Köşe Üst Dolabı', '📐', 650, 650, 720, json.dumps([650]), 0, '90° L köşe üst asma (Tek Raflı)', 15),
            ('wall_corner_v', 'kitchen', 'wall', 'V-Köşe (45° Diyagonal) Üst Dolap', '📐', 650, 650, 720, json.dumps([650]), 0, '45° pahlı diyagonal köşe üst dolabı (Tek Raflı)', 16),

            # Kitchen - Tall
            ('tall_pantry_2d', 'kitchen', 'tall', '2 Kapaklı Erzak Boy Kileri', '🚪', 600, 600, 2100, json.dumps([450, 600]), 1, '5 raflı tam boy kiler', 20),
            ('tall_oven_pantry', 'kitchen', 'tall', 'Ankastre Fırın & Mikrodalga Boy', '♨️', 600, 600, 2100, json.dumps([600]), 0, 'Göz hizası fırın boy ünitesi', 21),
            ('tall_fridge', 'kitchen', 'tall', 'No-Frost Buzdolabı Kabini', '🧊', 700, 600, 2100, json.dumps([700, 750, 900]), 1, 'Buzdolabı üstü kiler dolabı', 22),

            # Portmanto
            ('hall_shoe_bench', 'portmanto', 'base', 'Oturmalı Minderli Ayakkabılık', '👞', 1000, 450, 500, json.dumps([800, 1000, 1200]), 1, 'Minderli oturma alanı ve ayakkabılık', 30),
            ('hall_mirror_cabinet', 'portmanto', 'tall', 'Boy Aynalı Gizli Dolap', '🪞', 600, 450, 2200, json.dumps([500, 600, 800]), 1, 'Dış yüzeyi tam boy ayna kaplı saklama alanı', 31),
            ('hall_coat_wardrobe', 'portmanto', 'tall', '2 Kapaklı Askılıklı Portmanto', '🧥', 1000, 600, 2200, json.dumps([800, 1000, 1200]), 1, 'Askılık borusu ve şapkalık raflı', 32)
        ]
        c.executemany("""
        INSERT OR REPLACE INTO module_templates (key, category, group_key, name, icon, default_w, default_d, default_h, allowed_widths_json, allow_custom_width, description, sort_order)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, templates)
        conn.commit()

def seed_wizard_materials(conn):
    c = conn.cursor()
    c.execute("SELECT COUNT(*) FROM wizard_materials")
    if c.fetchone()[0] == 0:
        materials = [
            # Countertops (Tezgah)
            ('countertop', 'cimstone', 'Çimstone Tezgah', '#f8fafc', 'stone', 0.18, 0.05, 'Kuvars esaslı leke tutmaz pürüzsüz açık renk kompozit tezgah', 1, 1),
            ('countertop', 'granite', 'Granit Tezgah', '#334155', 'stone', 0.25, 0.10, 'Doğal taş yüksek ısı dayanımlı benekli antrasit/siyah granit tezgah', 1, 2),
            ('countertop', 'porcelain', 'Porselen Tezgah', '#e2e8f0', 'marble', 0.15, 0.02, 'Ultra kompakt çizilmez ve yanmaz geniş porselen levha tezgah', 1, 3),

            # Cabinets (Modül Kapak & Gövde)
            ('cabinet', 'mdflam', 'MDFlam Kapak & Gövde', '#c89a68', 'wood', 0.40, 0.0, 'Doğal mat ahşap dokulu dayanıklı melamin yüzey', 1, 1),
            ('cabinet', 'acrylic', 'Akrilik Parlak Kapak', '#ffffff', 'acrylic', 0.08, 0.15, 'Yüksek parlaklıklı çizilmez akrilik lake yüzey', 1, 2)
        ]
        c.executemany("""
        INSERT OR IGNORE INTO wizard_materials (category, key, name, color_hex, texture_type, roughness, metalness, description, is_active, sort_order)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, materials)
        conn.commit()

if __name__ == '__main__':
    init_db()
    print("ModulerCraft Pro Database successfully initialized.")
