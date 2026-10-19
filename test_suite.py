#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
ModulerCraft Pro - Automated Integration Test Suite
Validates database, cost calculator, nesting waste minimization,
CNC DXF generation, and CSV cut reports.
"""

import unittest
import json
import os
import sqlite3

from database import init_db, get_db, hash_password
from cost_calculator import calculate_design_cost, decompose_module_into_panels
from nesting_engine import NestingEngine
from dxf_engine import generate_panel_dxf, generate_sheet_nesting_dxf, generate_csv_cut_report

class TestModulerCraftPro(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        init_db()

    def test_01_database_seed_data(self):
        conn = get_db()
        c = conn.cursor()

        # Verify admin user
        c.execute("SELECT email, role FROM users WHERE role = 'admin'")
        admin = c.fetchone()
        self.assertIsNotNone(admin)
        self.assertEqual(admin['email'], 'admin@modulercraft.com')

        # Verify pricing matrix
        c.execute("SELECT COUNT(*) FROM pricing_matrix")
        price_count = c.fetchone()[0]
        self.assertGreater(price_count, 15, "Pricing matrix should have comprehensive items")

        # Verify system settings
        c.execute("SELECT value FROM system_settings WHERE key = 'profit_margin_percent'")
        margin = float(c.fetchone()[0])
        self.assertEqual(margin, 35.0)

        # Verify sample designs
        c.execute("SELECT reference_code FROM designs WHERE reference_code = 'TR-8421'")
        design = c.fetchone()
        self.assertIsNotNone(design)

        conn.close()

    def test_02_panel_decomposition_and_bom(self):
        mod = {
            "id": "TEST-MOD",
            "name": "3 Çekmeceli Alt Dolap",
            "category": "base",
            "w": 600,
            "d": 600,
            "h": 720,
            "drawers": 3
        }
        panels = decompose_module_into_panels(mod, {})
        # Should have 2 sides, 1 bottom, 2 stretchers, 1 back, 3 drawer fronts, 6 drawer box sides
        self.assertGreaterEqual(len(panels), 7)

        # Verify sides
        sides = [p for p in panels if 'Yan' in p['name']]
        self.assertEqual(len(sides), 2)
        self.assertEqual(sides[0]['length'], 720)
        self.assertEqual(sides[0]['width'], 600)
        self.assertTrue(sides[0]['has_groove'])

    def test_03_cost_calculator(self):
        sample_design = {
            "category": "kitchen",
            "modules": [
                {"id": "MOD-1", "name": "3 Çekmeceli Alt Dolap", "category": "base", "w": 600, "d": 600, "h": 720, "drawers": 3},
                {"id": "MOD-2", "name": "Ankastre Fırın Alt Modülü", "category": "base", "w": 600, "d": 600, "h": 720, "drawers": 1, "shelves": 1},
                {"id": "MOD-3", "name": "Eviye Alt Dolabı (2 Kapak)", "category": "base", "w": 900, "d": 600, "h": 720, "hinges": 4, "shelves": 1},
                {"id": "MOD-4", "name": "Çift Kapaklı Üst Dolap", "category": "wall", "w": 900, "d": 350, "h": 720, "hinges": 4, "shelves": 2}
            ],
            "materials": {
                "body_material": "mdf_18mm_standart",
                "door_material": "mdf_18mm_highgloss",
                "back_panel": "back_4mm_standart",
                "countertop_material": "tezgah_cimstone",
                "countertop_length_meters": 2.1,
                "sink_material": "evye_paslanmaz"
            },
            "appliances": [
                {"key": "firin_ankastre", "qty": 1}
            ]
        }

        calc = calculate_design_cost(sample_design)
        self.assertIn('financials', calc)
        fin = calc['financials']

        self.assertGreater(fin['subtotal_materials'], 0)
        self.assertGreater(fin['labor_cost'], 0)
        self.assertGreater(fin['base_cost'], 0)
        self.assertGreater(fin['profit_amount'], 0)
        self.assertGreater(fin['grand_total'], fin['base_cost'])

        # Margin should be exactly 35% of base cost
        expected_profit = round(fin['base_cost'] * 0.35, 2)
        self.assertAlmostEqual(fin['profit_amount'], expected_profit, delta=1.0)

    def test_04_2d_nesting_waste_minimization(self):
        sample_panels = [
            {"part_code": "P1", "name": "Yan Panel", "length": 720, "width": 560, "qty": 4, "thickness": 18, "material_type": "body"},
            {"part_code": "P2", "name": "Alt Tabla", "length": 564, "width": 560, "qty": 2, "thickness": 18, "material_type": "body"},
            {"part_code": "P3", "name": "Raf", "length": 562, "width": 540, "qty": 4, "thickness": 18, "material_type": "body"},
            {"part_code": "P4", "name": "Kapak", "length": 716, "width": 596, "qty": 2, "thickness": 18, "material_type": "door"}
        ]

        engine = NestingEngine(sheet_width=2800, sheet_height=2100, kerf=4.0)
        nesting = engine.nest(sample_panels)

        self.assertIn('overall_summary', nesting)
        summary = nesting['overall_summary']
        self.assertGreater(summary['total_sheets'], 0)
        self.assertEqual(summary['total_panels_packed'], 12)
        self.assertLess(summary['waste_percentage'], 100.0)
        self.assertGreater(summary['efficiency_percentage'], 0.0)

        # Check sheets
        body_group = nesting['groups'].get('body_18mm')
        self.assertIsNotNone(body_group)
        self.assertGreater(len(body_group['sheets']), 0)

        first_sheet = body_group['sheets'][0]
        self.assertGreater(len(first_sheet['placed_panels']), 0)

    def test_05_pegasus_honda_benk_cnc_dxf_export(self):
        panel = {
            "part_code": "TEST-Y1",
            "name": "Sol Yan Panel",
            "length": 720,
            "width": 560,
            "thickness": 18,
            "has_hinge_holes": True,
            "has_minifix": True,
            "has_shelf_holes": True,
            "has_groove": True
        }

        dxf_str = generate_panel_dxf(panel)
        self.assertTrue(dxf_str.startswith("0\nSECTION\n2\nHEADER\n"))
        self.assertTrue(dxf_str.endswith("0\nEOF\n"))

        # Verify CNC layers are present in ASCII DXF
        self.assertIn("KESIM_KONTUR", dxf_str)
        self.assertIn("MENTESE_DELIK_35MM", dxf_str)
        self.assertIn("RAF_DELIK_5MM", dxf_str)
        self.assertIn("MINIFIX_15MM", dxf_str)
        self.assertIn("ARKALIK_KANAL_4MM", dxf_str)

    def test_06_opticut_csv_cut_list(self):
        panels = [
            {"part_code": "P1", "mod_name": "Alt Dolap", "name": "Yan Panel", "length": 720, "width": 560, "thickness": 18, "qty": 2, "material_type": "18mm MDFlam", "pvc_thick": 0.8, "pvc_length": 2, "pvc_width": 1, "has_hinge_holes": True, "has_minifix": True, "has_shelf_holes": True}
        ]
        csv_str = generate_csv_cut_report(panels, "TR-TEST-99")
        self.assertIn("Proje_Referans;Parca_Kodu", csv_str)
        self.assertIn("TR-TEST-99;P1;Alt Dolap;Yan Panel;2;720;560;18", csv_str)
        self.assertIn("PVC 0.8mm", csv_str)

    def test_07_customer_access_lockout_and_expiry(self):
        from datetime import datetime, timedelta
        conn = get_db()
        c = conn.cursor()

        test_phone = "05329998877"
        c.execute("DELETE FROM customer_access_locks WHERE phone = ?", (test_phone,))
        conn.commit()

        # 1. New session: 72 hours granted
        expires_at = (datetime.now() + timedelta(hours=72)).strftime('%Y-%m-%d %H:%M:%S')
        c.execute("""
        INSERT INTO customer_access_locks (phone, customer_name, expires_at, is_locked)
        VALUES (?, 'Test Müşteri', ?, 0)
        """, (test_phone, expires_at))
        conn.commit()

        c.execute("SELECT * FROM customer_access_locks WHERE phone = ?", (test_phone,))
        row = dict(c.fetchone())
        self.assertEqual(row['is_locked'], 0)
        self.assertEqual(row['extension_count'], 0)

        # 2. Simulate appointment submission lock
        c.execute("""
        UPDATE customer_access_locks
        SET is_locked = 1, locked_reason = 'appointment_submitted', active_reference_code = 'TR-9999'
        WHERE phone = ?
        """, (test_phone,))
        conn.commit()

        c.execute("SELECT is_locked, locked_reason, active_reference_code FROM customer_access_locks WHERE phone = ?", (test_phone,))
        locked_row = dict(c.fetchone())
        self.assertEqual(locked_row['is_locked'], 1)
        self.assertEqual(locked_row['locked_reason'], 'appointment_submitted')
        self.assertEqual(locked_row['active_reference_code'], 'TR-9999')

        # 3. Simulate Admin 72h extension and unlock
        new_expires = (datetime.now() + timedelta(hours=72)).strftime('%Y-%m-%d %H:%M:%S')
        c.execute("""
        UPDATE customer_access_locks
        SET is_locked = 0, locked_reason = NULL, expires_at = ?, extension_count = extension_count + 1
        WHERE phone = ?
        """, (new_expires, test_phone))
        conn.commit()

        c.execute("SELECT is_locked, extension_count FROM customer_access_locks WHERE phone = ?", (test_phone,))
        unlocked_row = dict(c.fetchone())
        self.assertEqual(unlocked_row['is_locked'], 0)
        self.assertEqual(unlocked_row['extension_count'], 1)

        c.execute("DELETE FROM customer_access_locks WHERE phone = ?", (test_phone,))
        conn.commit()
        conn.close()

    def test_08_appointment_slots_and_email_notification(self):
        from server import get_nearest_appointment_slots, dispatch_email_notification

        # 1. Test Nearest 3 Slots calculation
        slots = get_nearest_appointment_slots()
        self.assertEqual(len(slots), 3, "System must provide exactly 3 nearest working slots")
        for s in slots:
            self.assertIn('date', s)
            self.assertIn('time_slot', s)
            self.assertIn('full_label', s)

        # 2. Test Email Dispatcher & Database Persistence
        test_email = "musteri_test@example.com"
        res = dispatch_email_notification(
            to_email=test_email,
            recipient_name="Mehmet Bey",
            ref_code="TR-TEST-12",
            email_type="appointment_requested",
            app_date=slots[0]['date'],
            app_slot=slots[0]['time_slot'],
            admin_notes="Özel kör köşe talebi"
        )
        self.assertEqual(res['status'], 'sent')

        conn = get_db()
        c = conn.cursor()
        c.execute("SELECT * FROM email_notifications WHERE reference_code = 'TR-TEST-12'")
        mail_row = dict(c.fetchone())
        self.assertEqual(mail_row['recipient_email'], test_email)
        self.assertEqual(mail_row['email_type'], 'appointment_requested')
        self.assertIn("TR-TEST-12", mail_row['body_html'])

        c.execute("DELETE FROM email_notifications WHERE reference_code = 'TR-TEST-12'")
        conn.commit()
        conn.close()

if __name__ == '__main__':
    unittest.main()


