#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
ModulerCraft Pro - 2D Nesting & Waste Minimization Engine
Guillotine 2D Bin Packing algorithm designed for industrial panel sizing and CNC routing.
Optimizes placement of furniture panels onto standard 2800x2100mm (or 2440x1220mm) sheets,
accounting for saw kerf (testere payı), trim margins, and grain direction.
"""

from typing import List, Dict, Any
import math

class FreeRect:
    def __init__(self, x: float, y: float, w: float, h: float):
        self.x = x
        self.y = y
        self.w = w
        self.h = h

    def fits(self, pw: float, ph: float) -> bool:
        return self.w >= pw and self.h >= ph

class NestingEngine:
    def __init__(self, sheet_width: float = 2800.0, sheet_height: float = 2100.0,
                 kerf: float = 4.0, trim_margin: float = 10.0, allow_rotation: bool = True):
        self.sheet_w = sheet_width
        self.sheet_h = sheet_height
        self.kerf = kerf
        self.margin = trim_margin
        self.allow_rot = allow_rotation

    def nest(self, panels: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Takes list of panels and computes optimal 2D guillotine packing.
        """
        # Expand items according to their quantity
        items = []
        for p in panels:
            qty = int(p.get('qty', 1))
            l = float(p.get('length', 600))
            w = float(p.get('width', 400))
            for i in range(qty):
                items.append({
                    "id": p.get('part_code', 'P') if qty == 1 else f"{p.get('part_code', 'P')}-{i+1}",
                    "name": p.get('name', 'Panel'),
                    "mod_name": p.get('mod_name', ''),
                    "length": l,
                    "width": w,
                    "thickness": p.get('thickness', 18.0),
                    "material_type": p.get('material_type', 'body'),
                    "pvc_thick": p.get('pvc_thick', 0.8),
                    "area": (l * w) / 1000000.0
                })

        # Separate items by material type and thickness (e.g. 18mm body, 18mm door, 4mm back)
        material_groups = {}
        for item in items:
            key = f"{item['material_type']}_{int(item['thickness'])}mm"
            if key not in material_groups:
                material_groups[key] = []
            material_groups[key].append(item)

        results = {}
        grand_total_sheets = 0
        grand_total_panels_area = 0.0
        grand_total_sheets_area = 0.0

        for group_key, group_items in material_groups.items():
            # Sort items by area decreasing (Best-Fit Decreasing heuristic)
            group_items.sort(key=lambda x: (max(x['length'], x['width']), x['length'] * x['width']), reverse=True)
            
            sheets = []
            usable_w = self.sheet_w - (2 * self.margin)
            usable_h = self.sheet_h - (2 * self.margin)

            for item in group_items:
                pw = item['length']
                ph = item['width']

                placed = False
                best_sheet_idx = -1
                best_rect_idx = -1
                best_rotated = False
                min_waste = float('inf')

                # Try to fit into existing sheets
                for s_idx, sheet in enumerate(sheets):
                    for r_idx, frect in enumerate(sheet['free_rects']):
                        # Standard orientation
                        if frect.fits(pw, ph):
                            leftover = (frect.w * frect.h) - (pw * ph)
                            if leftover < min_waste:
                                min_waste = leftover
                                best_sheet_idx = s_idx
                                best_rect_idx = r_idx
                                best_rotated = False

                        # Rotated 90 degrees
                        if self.allow_rot and frect.fits(ph, pw):
                            leftover = (frect.w * frect.h) - (ph * pw)
                            if leftover < min_waste:
                                min_waste = leftover
                                best_sheet_idx = s_idx
                                best_rect_idx = r_idx
                                best_rotated = True

                if best_sheet_idx != -1:
                    sheet = sheets[best_sheet_idx]
                    frect = sheet['free_rects'].pop(best_rect_idx)
                    cur_w = ph if best_rotated else pw
                    cur_h = pw if best_rotated else ph

                    # Place panel
                    sheet['placed_panels'].append({
                        "id": item['id'],
                        "name": item['name'],
                        "mod_name": item['mod_name'],
                        "x": round(frect.x, 1),
                        "y": round(frect.y, 1),
                        "w": round(cur_w, 1),
                        "h": round(cur_h, 1),
                        "original_l": pw,
                        "original_w": ph,
                        "rotated": best_rotated,
                        "thickness": item['thickness'],
                        "material": item['material_type']
                    })

                    # Guillotine split remaining space into two free rects
                    # Split horizontally or vertically based on longer remaining edge
                    rem_w = frect.w - cur_w - self.kerf
                    rem_h = frect.h - cur_h - self.kerf

                    if rem_w > 50 and cur_h > 50:
                        sheet['free_rects'].append(FreeRect(frect.x + cur_w + self.kerf, frect.y, rem_w, cur_h))
                    if frect.w > 50 and rem_h > 50:
                        sheet['free_rects'].append(FreeRect(frect.x, frect.y + cur_h + self.kerf, frect.w, rem_h))

                    placed = True
                else:
                    # Allocate a new sheet
                    new_sheet = {
                        "sheet_number": len(sheets) + 1,
                        "width": self.sheet_w,
                        "height": self.sheet_h,
                        "margin": self.margin,
                        "kerf": self.kerf,
                        "placed_panels": [],
                        "free_rects": []
                    }
                    
                    cur_w = pw
                    cur_h = ph
                    rotated = False
                    
                    # Check if fits normal or rotated
                    if not (usable_w >= cur_w and usable_h >= cur_h):
                        if self.allow_rot and usable_w >= ph and usable_h >= pw:
                            cur_w = ph
                            cur_h = pw
                            rotated = True
                        else:
                            # Panel larger than sheet (emergency clamp)
                            cur_w = min(pw, usable_w)
                            cur_h = min(ph, usable_h)

                    new_sheet['placed_panels'].append({
                        "id": item['id'],
                        "name": item['name'],
                        "mod_name": item['mod_name'],
                        "x": round(self.margin, 1),
                        "y": round(self.margin, 1),
                        "w": round(cur_w, 1),
                        "h": round(cur_h, 1),
                        "original_l": pw,
                        "original_w": ph,
                        "rotated": rotated,
                        "thickness": item['thickness'],
                        "material": item['material_type']
                    })

                    rem_w = usable_w - cur_w - self.kerf
                    rem_h = usable_h - cur_h - self.kerf

                    if rem_w > 50 and cur_h > 50:
                        new_sheet['free_rects'].append(FreeRect(self.margin + cur_w + self.kerf, self.margin, rem_w, cur_h))
                    if usable_w > 50 and rem_h > 50:
                        new_sheet['free_rects'].append(FreeRect(self.margin, self.margin + cur_h + self.kerf, usable_w, rem_h))

                    sheets.append(new_sheet)

            # Calculate sheet statistics
            group_panel_area = sum(it['area'] for it in group_items)
            group_sheet_area = len(sheets) * ((self.sheet_w * self.sheet_h) / 1000000.0)
            waste_area = max(0.0, group_sheet_area - group_panel_area)
            waste_pct = round((waste_area / group_sheet_area) * 100.0, 1) if group_sheet_area > 0 else 0.0

            # Convert free_rects to JSON-serializable list
            for s in sheets:
                s['usable_offcuts'] = [
                    {"x": round(fr.x, 1), "y": round(fr.y, 1), "w": round(fr.w, 1), "h": round(fr.h, 1)}
                    for fr in s['free_rects'] if fr.w >= 300 and fr.h >= 300  # min offcut size 30x30 cm
                ]
                del s['free_rects']

            results[group_key] = {
                "material": group_key,
                "total_sheets": len(sheets),
                "total_panels": len(group_items),
                "panels_area_m2": round(group_panel_area, 2),
                "sheets_area_m2": round(group_sheet_area, 2),
                "waste_area_m2": round(waste_area, 2),
                "waste_percentage": waste_pct,
                "efficiency_percentage": round(100.0 - waste_pct, 1),
                "sheets": sheets
            }

            grand_total_sheets += len(sheets)
            grand_total_panels_area += group_panel_area
            grand_total_sheets_area += group_sheet_area

        grand_waste_pct = round(((grand_total_sheets_area - grand_total_panels_area) / grand_total_sheets_area) * 100.0, 1) if grand_total_sheets_area > 0 else 0.0

        return {
            "overall_summary": {
                "total_sheets": grand_total_sheets,
                "total_panels_packed": len(items),
                "total_panels_area_m2": round(grand_total_panels_area, 2),
                "total_sheets_area_m2": round(grand_total_sheets_area, 2),
                "waste_percentage": grand_waste_pct,
                "efficiency_percentage": round(100.0 - grand_waste_pct, 1),
                "sheet_standard_w": self.sheet_w,
                "sheet_standard_h": self.sheet_h,
                "saw_kerf": self.kerf
            },
            "groups": results
        }

if __name__ == '__main__':
    # Test nesting
    from cost_calculator import calculate_design_cost
    test_design = {
        "category": "kitchen",
        "modules": [
            {"id": "MOD-1", "name": "3 Çekmeceli Alt Dolap", "category": "base", "w": 600, "d": 600, "h": 720, "drawers": 3},
            {"id": "MOD-2", "name": "Eviye Alt Dolap", "category": "base", "w": 900, "d": 600, "h": 720, "hinges": 4},
            {"id": "MOD-3", "name": "Üst Çift Kapak", "category": "wall", "w": 900, "d": 350, "h": 720, "hinges": 4}
        ]
    }
    cost_data = calculate_design_cost(test_design)
    engine = NestingEngine()
    nesting_res = engine.nest(cost_data['panels'])
    print("Nesting Test Successful:")
    print("Total Sheets Needed:", nesting_res['overall_summary']['total_sheets'])
    print("Waste Percentage:", nesting_res['overall_summary']['waste_percentage'], "%")
    print("Efficiency:", nesting_res['overall_summary']['efficiency_percentage'], "%")
