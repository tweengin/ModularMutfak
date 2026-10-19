#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
ModulerCraft Pro - CNC DXF & CSV Cut Report Generator
Pegasus Cad-Cam and Honda Benk CNC compatible DXF generator.
Generates R12/R2000 compliant ASCII DXF files with dedicated machining layers:
- KESIM_KONTUR (Outer profile routing)
- MENTESE_DELIK_35MM (Hinge cup bores)
- RAF_DELIK_5MM (32mm system shelf pin holes)
- MINIFIX_15MM (Minifix cam holes)
- KAVELA_8MM (Dowel holes)
- ARKALIK_KANAL_4MM (Back panel groove)
- YAZI_ETIKET (Operator visual labels)
"""

import io
import csv
from typing import List, Dict, Any

class DXFWriter:
    def __init__(self):
        self.entities = []
        self.layers = {
            "0": 7,                     # White/Black
            "KESIM_KONTUR": 1,          # Red (Outer cut path)
            "MENTESE_DELIK_35MM": 5,    # Blue (35mm hinge bore)
            "RAF_DELIK_5MM": 3,         # Green (5mm shelf holes)
            "MINIFIX_15MM": 4,          # Cyan (15mm minifix cam)
            "KAVELA_8MM": 6,            # Magenta (8mm dowel)
            "ARKALIK_KANAL_4MM": 2,     # Yellow (Back groove)
            "YAZI_ETIKET": 8            # Dark Gray (Label/Text)
        }

    def add_line(self, x1: float, y1: float, x2: float, y2: float, layer: str = "KESIM_KONTUR"):
        self.entities.append({
            "type": "LINE", "layer": layer,
            "x1": round(x1, 3), "y1": round(y1, 3),
            "x2": round(x2, 3), "y2": round(y2, 3)
        })

    def add_rect(self, x: float, y: float, w: float, h: float, layer: str = "KESIM_KONTUR"):
        # 4 lines forming a closed rectangle
        self.add_line(x, y, x + w, y, layer)
        self.add_line(x + w, y, x + w, y + h, layer)
        self.add_line(x + w, y + h, x, y + h, layer)
        self.add_line(x, y + h, x, y, layer)

    def add_circle(self, cx: float, cy: float, radius: float, layer: str):
        self.entities.append({
            "type": "CIRCLE", "layer": layer,
            "cx": round(cx, 3), "cy": round(cy, 3), "r": round(radius, 3)
        })

    def add_text(self, text: str, x: float, y: float, height: float = 20.0, layer: str = "YAZI_ETIKET"):
        self.entities.append({
            "type": "TEXT", "layer": layer,
            "text": str(text), "x": round(x, 3), "y": round(y, 3), "h": round(height, 2)
        })

    def export_dxf(self) -> str:
        """
        Builds AutoCAD Release 12 / 2000 compliant ASCII DXF string.
        """
        buf = io.StringIO()
        
        # 1. HEADER SECTION
        buf.write("0\nSECTION\n2\nHEADER\n")
        buf.write("9\n$ACADVER\n1\nAC1009\n") # R12 DXF - maximum compatibility with Pegasus/Honda Benk
        buf.write("9\n$INSUNITS\n70\n4\n")   # Millimeters
        buf.write("0\nENDSEC\n")

        # 2. TABLES SECTION
        buf.write("0\nSECTION\n2\nTABLES\n")
        
        # Layer table
        buf.write("0\nTABLE\n2\nLAYER\n70\n" + str(len(self.layers)) + "\n")
        for lname, lcolor in self.layers.items():
            buf.write("0\nLAYER\n2\n" + lname + "\n70\n0\n62\n" + str(lcolor) + "\n6\nCONTINUOUS\n")
        buf.write("0\nENDSEC\n")

        # 3. ENTITIES SECTION
        buf.write("0\nSECTION\n2\nENTITIES\n")
        for ent in self.entities:
            etype = ent['type']
            layer = ent['layer']
            if etype == "LINE":
                buf.write(f"0\nLINE\n8\n{layer}\n10\n{ent['x1']}\n20\n{ent['y1']}\n30\n0.0\n11\n{ent['x2']}\n21\n{ent['y2']}\n31\n0.0\n")
            elif etype == "CIRCLE":
                buf.write(f"0\nCIRCLE\n8\n{layer}\n10\n{ent['cx']}\n20\n{ent['cy']}\n30\n0.0\n40\n{ent['r']}\n")
            elif etype == "TEXT":
                buf.write(f"0\nTEXT\n8\n{layer}\n10\n{ent['x']}\n20\n{ent['y']}\n30\n0.0\n40\n{ent['h']}\n1\n{ent['text']}\n")
        buf.write("0\nENDSEC\n")

        # 4. EOF
        buf.write("0\nEOF\n")
        return buf.getvalue()

def generate_panel_dxf(panel: Dict[str, Any]) -> str:
    """
    Generates a standalone CNC DXF for an individual panel with all drilling/routing features.
    """
    dxf = DXFWriter()
    l = float(panel.get('length', 600))
    w = float(panel.get('width', 400))
    pid = panel.get('part_code', 'P')
    pname = panel.get('name', 'Panel')

    # 1. Outer profile cut
    dxf.add_rect(0, 0, l, w, layer="KESIM_KONTUR")

    # 2. Text Label
    dxf.add_text(f"{pid}: {pname} ({int(l)}x{int(w)}mm)", 30, w / 2, height=18.0, layer="YAZI_ETIKET")

    # 3. Hinge Pot Holes (35mm dia, 13mm depth) on door or side panel
    if panel.get('has_hinge_holes', False):
        if 'Kapak' in pname:
            # 22.5mm from edge, 100mm from top/bottom
            dxf.add_circle(100.0, 22.5, 17.5, layer="MENTESE_DELIK_35MM")
            dxf.add_circle(l - 100.0, 22.5, 17.5, layer="MENTESE_DELIK_35MM")
            if l > 1200:
                dxf.add_circle(l / 2.0, 22.5, 17.5, layer="MENTESE_DELIK_35MM")
        elif 'Yan' in pname:
            # Hinge base plate mounting holes (5mm or 3.5mm)
            dxf.add_circle(100.0, 37.0, 2.5, layer="RAF_DELIK_5MM")
            dxf.add_circle(100.0, 37.0 + 32.0, 2.5, layer="RAF_DELIK_5MM")
            dxf.add_circle(l - 100.0, 37.0, 2.5, layer="RAF_DELIK_5MM")
            dxf.add_circle(l - 100.0, 37.0 + 32.0, 2.5, layer="RAF_DELIK_5MM")

    # 4. Shelf holes (5mm dia, 32mm system raster) for side panels
    if panel.get('has_shelf_holes', False) and 'Yan' in pname:
        # Rows at front (37mm) and back (50mm)
        start_y = 150.0
        end_y = l - 150.0
        cur_y = start_y
        while cur_y <= end_y:
            dxf.add_circle(cur_y, 37.0, 2.5, layer="RAF_DELIK_5MM")
            dxf.add_circle(cur_y, w - 50.0, 2.5, layer="RAF_DELIK_5MM")
            cur_y += 32.0  # System 32mm

    # 5. Minifix 15mm & Dowel 8mm holes
    if panel.get('has_minifix', False):
        if 'Yan' in pname:
            # Dowel and minifix pin holes on side panels
            dxf.add_circle(18.0 + 9.0, 50.0, 4.0, layer="KAVELA_8MM")
            dxf.add_circle(18.0 + 9.0, w - 50.0, 4.0, layer="KAVELA_8MM")
            dxf.add_circle(l - (18.0 + 9.0), 50.0, 4.0, layer="KAVELA_8MM")
            dxf.add_circle(l - (18.0 + 9.0), w - 50.0, 4.0, layer="KAVELA_8MM")
        elif 'Tabla' in pname:
            # 15mm Minifix Cam holes (34mm from edge)
            dxf.add_circle(34.0, 50.0, 7.5, layer="MINIFIX_15MM")
            dxf.add_circle(34.0, w - 50.0, 7.5, layer="MINIFIX_15MM")
            dxf.add_circle(l - 34.0, 50.0, 7.5, layer="MINIFIX_15MM")
            dxf.add_circle(l - 34.0, w - 50.0, 7.5, layer="MINIFIX_15MM")

    # 6. Back Panel Groove (4mm wide, 10mm from back edge)
    if panel.get('has_groove', False):
        dxf.add_line(0, 10.0, l, 10.0, layer="ARKALIK_KANAL_4MM")
        dxf.add_line(0, 14.0, l, 14.0, layer="ARKALIK_KANAL_4MM")

    return dxf.export_dxf()

def generate_sheet_nesting_dxf(sheet: Dict[str, Any], material_name: str = "18mm_MDFlam") -> str:
    """
    Generates a full sheet Nesting CNC DXF compatible with Pegasus Cad-Cam & Honda Benk CNC.
    Draws the sheet boundary, all placed panel profiles, toolpaths, drilling operations, and labels.
    """
    dxf = DXFWriter()
    sw = float(sheet.get('width', 2800))
    sh = float(sheet.get('height', 2100))
    snum = sheet.get('sheet_number', 1)

    # 1. Sheet outer perimeter
    dxf.add_rect(0, 0, sw, sh, layer="0")
    dxf.add_text(f"PLAKA NO: {snum} | MALZEME: {material_name} | {int(sw)}x{int(sh)}mm | PEGASUS/HONDA BENK CNC", 30, sh - 35, height=24.0, layer="YAZI_ETIKET")

    # 2. Placed Panels
    for p in sheet.get('placed_panels', []):
        px = float(p['x'])
        py = float(p['y'])
        pw = float(p['w'])
        ph = float(p['h'])
        pid = p.get('id', 'P')
        pname = p.get('name', 'Parca')
        mod_name = p.get('mod_name', '')

        # Panel cutting profile
        dxf.add_rect(px, py, pw, ph, layer="KESIM_KONTUR")

        # Label in center of panel
        dxf.add_text(f"[{pid}] {pname}", px + 15, py + (ph / 2) + 10, height=14.0, layer="YAZI_ETIKET")
        dxf.add_text(f"{int(pw)}x{int(ph)} | {mod_name}", px + 15, py + (ph / 2) - 10, height=11.0, layer="YAZI_ETIKET")

        # Add hinge bores if door
        if 'Kapak' in pname:
            if pw > ph:
                dxf.add_circle(px + 100, py + 22.5, 17.5, layer="MENTESE_DELIK_35MM")
                dxf.add_circle(px + pw - 100, py + 22.5, 17.5, layer="MENTESE_DELIK_35MM")
            else:
                dxf.add_circle(px + 22.5, py + 100, 17.5, layer="MENTESE_DELIK_35MM")
                dxf.add_circle(px + 22.5, py + ph - 100, 17.5, layer="MENTESE_DELIK_35MM")

    # 3. Offcuts (Kalan Parcalar)
    for off in sheet.get('usable_offcuts', []):
        ox = float(off['x'])
        oy = float(off['y'])
        ow = float(off['w'])
        oh = float(off['h'])
        dxf.add_text(f"FIRE/KALAN: {int(ow)}x{int(oh)}mm", ox + 10, oy + (oh / 2), height=14.0, layer="YAZI_ETIKET")

    return dxf.export_dxf()

def generate_csv_cut_report(panels: List[Dict[str, Any]], reference_code: str = "TR-0000") -> str:
    """
    Generates industry standard CSV cut list compatible with OptiCut, Ardis,
    WoodWOP, Excel, and panel sizing saws.
    """
    output = io.StringIO()
    writer = csv.writer(output, delimiter=';')
    
    # Header
    writer.writerow([
        "Proje_Referans",
        "Parca_Kodu",
        "Modul",
        "Parca_Adi",
        "Adet",
        "Boy_mm",
        "En_mm",
        "Kalinlik_mm",
        "Malzeme_Tipi",
        "Kenar_Bandi_Boy1",
        "Kenar_Bandi_Boy2",
        "Kenar_Bandi_En1",
        "Kenar_Bandi_En2",
        "Mentese_Delik",
        "Minifix_Delik",
        "Raf_Delik",
        "CNC_Program"
    ])

    for p in panels:
        pvc_t = p.get('pvc_thick', 0.8)
        pvc_str = f"PVC {pvc_t}mm" if pvc_t > 0 else "-"
        pvc_len = int(p.get('pvc_length', 0))
        pvc_wid = int(p.get('pvc_width', 0))

        b1 = pvc_str if pvc_len >= 1 else "-"
        b2 = pvc_str if pvc_len >= 2 else "-"
        e1 = pvc_str if pvc_wid >= 1 else "-"
        e2 = pvc_str if pvc_wid >= 2 else "-"

        writer.writerow([
            reference_code,
            p.get('part_code', 'P'),
            p.get('mod_name', 'Modül'),
            p.get('name', 'Panel'),
            p.get('qty', 1),
            int(p.get('length', 600)),
            int(p.get('width', 400)),
            int(p.get('thickness', 18)),
            p.get('material_type', 'Gövde MDFlam'),
            b1, b2, e1, e2,
            "EVET (35mm)" if p.get('has_hinge_holes') else "YOK",
            "EVET (15mm)" if p.get('has_minifix') else "YOK",
            "EVET (5mm)" if p.get('has_shelf_holes') else "YOK",
            f"CNC_{p.get('part_code', 'P')}.DXF"
        ])

    return output.getvalue()

if __name__ == '__main__':
    # Test DXF generation
    test_panel = {
        "part_code": "MOD1-Y1",
        "name": "Sol Yan Panel",
        "length": 720,
        "width": 560,
        "thickness": 18,
        "has_hinge_holes": True,
        "has_minifix": True,
        "has_shelf_holes": True,
        "has_groove": True
    }
    dxf_content = generate_panel_dxf(test_panel)
    print("DXF Generation Test Successful. DXF Length:", len(dxf_content), "chars")
    csv_content = generate_csv_cut_report([test_panel], "TR-TEST")
    print("CSV Cut Report Test Successful. Rows:\n", csv_content)
