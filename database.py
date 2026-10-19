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

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "modulercraft.db")

def hash_password(password: str) -> str:
    salt = "mc_salt_2026_x89"
    return hashlib.sha256((password + salt).encode('utf-8')).hexdigest()

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL;")
    conn.execute("PRAGMA foreign_keys=ON;")
    return conn

def init_db():
    conn = get_db()
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

    conn.commit()

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
        ('token_per_design_export', '1', 'Profesyonel proje çıktısı için gereken jeton')
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

    conn.close()

if __name__ == '__main__':
    init_db()
    print("ModulerCraft Pro Database successfully initialized.")
