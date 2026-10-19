#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
ModulerCraft Pro - Cost & BOM Calculation Engine
Decomposes modular furniture into exact physical panels, hardware, countertops,
and calculates precise costs based on dynamic pricing matrix and admin margins.
"""

import json
from database import get_db

def decompose_module_into_panels(mod, materials):
    """
    Decomposes a cabinet module into standard industrial manufacturing panels:
    - Left/Right Sides (Yanlar)
    - Bottom Panel (Alt Tabla)
    - Top Stretchers or Top Panel (Üst Kuşak / Üst Tabla)
    - Shelves (Raflar)
    - Back Panel (Arkalık)
    - Doors (Kapaklar)
    - Drawers (Çekmeceler)
    """
    w = float(mod.get('w', 600))
    d = float(mod.get('d', 600))
    h = float(mod.get('h', 720))
    cat = mod.get('category', 'base')
    mod_type = mod.get('type', 'base_standard')
    mod_id = mod.get('id', 'MOD')
    mod_name = mod.get('name', 'Modül')
    
    t_body = 18.0  # 18mm body thickness
    t_back = 4.0   # 4mm back panel default
    
    panels = []
    
    # 1. Sides (Sol Yan & Sağ Yan)
    # Dimensions: Height x Depth
    panels.append({
        "mod_id": mod_id, "mod_name": mod_name, "part_code": f"{mod_id}-Y1",
        "name": "Sol Yan", "qty": 1, "length": h, "width": d, "thickness": t_body,
        "material_type": "body", "pvc_length": 2, "pvc_width": 1, "pvc_thick": 0.8,
        "has_hinge_holes": True if cat in ['base', 'wall', 'tall'] else False,
        "has_minifix": True, "has_shelf_holes": True, "has_groove": True
    })
    panels.append({
        "mod_id": mod_id, "mod_name": mod_name, "part_code": f"{mod_id}-Y2",
        "name": "Sağ Yan", "qty": 1, "length": h, "width": d, "thickness": t_body,
        "material_type": "body", "pvc_length": 2, "pvc_width": 1, "pvc_thick": 0.8,
        "has_hinge_holes": True if cat in ['base', 'wall', 'tall'] else False,
        "has_minifix": True, "has_shelf_holes": True, "has_groove": True
    })
    
    # Inner width between two side panels
    inner_w = max(0, w - (2 * t_body))
    
    # 2. Bottom Panel (Alt Tabla)
    panels.append({
        "mod_id": mod_id, "mod_name": mod_name, "part_code": f"{mod_id}-AT",
        "name": "Alt Tabla", "qty": 1, "length": inner_w, "width": d, "thickness": t_body,
        "material_type": "body", "pvc_length": 1, "pvc_width": 0, "pvc_thick": 0.8,
        "has_hinge_holes": False, "has_minifix": True, "has_shelf_holes": False, "has_groove": True
    })
    
    # 3. Top Panel / Stretchers (Üst Tabla veya Üst Kuşaklar)
    if cat == 'base':
        # Base cabinets use 2 stretchers (Ön Kuşak & Arka Kuşak) ~100mm wide
        stretcher_w = 100.0
        panels.append({
            "mod_id": mod_id, "mod_name": mod_name, "part_code": f"{mod_id}-K1",
            "name": "Ön Üst Kuşak", "qty": 1, "length": inner_w, "width": stretcher_w, "thickness": t_body,
            "material_type": "body", "pvc_length": 1, "pvc_width": 0, "pvc_thick": 0.8,
            "has_hinge_holes": False, "has_minifix": True, "has_shelf_holes": False, "has_groove": False
        })
        panels.append({
            "mod_id": mod_id, "mod_name": mod_name, "part_code": f"{mod_id}-K2",
            "name": "Arka Üst Kuşak", "qty": 1, "length": inner_w, "width": stretcher_w, "thickness": t_body,
            "material_type": "body", "pvc_length": 0, "pvc_width": 0, "pvc_thick": 0.8,
            "has_hinge_holes": False, "has_minifix": True, "has_shelf_holes": False, "has_groove": False
        })
    else:
        # Wall and tall cabinets have a solid top panel
        panels.append({
            "mod_id": mod_id, "mod_name": mod_name, "part_code": f"{mod_id}-UT",
            "name": "Üst Tabla", "qty": 1, "length": inner_w, "width": d, "thickness": t_body,
            "material_type": "body", "pvc_length": 1, "pvc_width": 0, "pvc_thick": 0.8,
            "has_hinge_holes": False, "has_minifix": True, "has_shelf_holes": False, "has_groove": True
        })
    
    # 4. Shelves (Raflar - Standart Tek Orta Raf)
    has_drawers = int(mod.get('drawers', 0)) > 0
    is_appliance = any(k in mod.get('type', '') for k in ['oven', 'dishwasher'])
    default_shelves = 0 if (has_drawers or is_appliance) else 1
    num_shelves = int(mod.get('shelves', default_shelves))
    if num_shelves > 0:
        shelf_depth = max(0, d - 20)  # recessed shelf
        panels.append({
            "mod_id": mod_id, "mod_name": mod_name, "part_code": f"{mod_id}-RF",
            "name": "Ayarlı Raf", "qty": num_shelves, "length": inner_w - 2, "width": shelf_depth, "thickness": t_body,
            "material_type": "body", "pvc_length": 1, "pvc_width": 0, "pvc_thick": 0.8,
            "has_hinge_holes": False, "has_minifix": False, "has_shelf_holes": False, "has_groove": False
        })
        
    # 5. Back Panel (Arkalık 4mm)
    # fits inside 8mm grooves on sides, top and bottom (or rabetted)
    back_w = inner_w + 16.0
    back_h = h - 16.0
    panels.append({
        "mod_id": mod_id, "mod_name": mod_name, "part_code": f"{mod_id}-ARK",
        "name": "Arkalık Paneli", "qty": 1, "length": back_h, "width": back_w, "thickness": t_back,
        "material_type": "back", "pvc_length": 0, "pvc_width": 0, "pvc_thick": 0.0,
        "has_hinge_holes": False, "has_minifix": False, "has_shelf_holes": False, "has_groove": False
    })
    
    # 6. Doors or Drawer Fronts
    drawers_cnt = int(mod.get('drawers', 0))
    if drawers_cnt > 0:
        drawer_front_h = (h - 20) / drawers_cnt
        for i in range(drawers_cnt):
            panels.append({
                "mod_id": mod_id, "mod_name": mod_name, "part_code": f"{mod_id}-CO{i+1}",
                "name": f"Çekmece Önü {i+1}", "qty": 1, "length": w - 4, "width": drawer_front_h - 4, "thickness": t_body,
                "material_type": "door", "pvc_length": 2, "pvc_width": 2, "pvc_thick": 2.0,
                "has_hinge_holes": False, "has_minifix": False, "has_shelf_holes": False, "has_groove": False
            })
            # Add drawer box sides (16mm or 18mm)
            panels.append({
                "mod_id": mod_id, "mod_name": mod_name, "part_code": f"{mod_id}-CY{i+1}",
                "name": f"Çekmece Kasası", "qty": 2, "length": 450, "width": 120, "thickness": t_body,
                "material_type": "body", "pvc_length": 1, "pvc_width": 0, "pvc_thick": 0.8,
                "has_hinge_holes": False, "has_minifix": False, "has_shelf_holes": False, "has_groove": True
            })
    elif 'double' in mod_type or w >= 800:
        # Double door
        door_w = (w / 2.0) - 3.0
        door_h = h - 4.0
        panels.append({
            "mod_id": mod_id, "mod_name": mod_name, "part_code": f"{mod_id}-KP1",
            "name": "Sol Kapak", "qty": 1, "length": door_h, "width": door_w, "thickness": t_body,
            "material_type": "door", "pvc_length": 2, "pvc_width": 2, "pvc_thick": 2.0,
            "has_hinge_holes": True, "has_minifix": False, "has_shelf_holes": False, "has_groove": False
        })
        panels.append({
            "mod_id": mod_id, "mod_name": mod_name, "part_code": f"{mod_id}-KP2",
            "name": "Sağ Kapak", "qty": 1, "length": door_h, "width": door_w, "thickness": t_body,
            "material_type": "door", "pvc_length": 2, "pvc_width": 2, "pvc_thick": 2.0,
            "has_hinge_holes": True, "has_minifix": False, "has_shelf_holes": False, "has_groove": False
        })
    elif mod_type not in ['base_dishwasher', 'base_oven', 'tall_fridge_open']:
        # Single door
        door_w = w - 4.0
        door_h = h - 4.0
        panels.append({
            "mod_id": mod_id, "mod_name": mod_name, "part_code": f"{mod_id}-KP",
            "name": "Kapak", "qty": 1, "length": door_h, "width": door_w, "thickness": t_body,
            "material_type": "door", "pvc_length": 2, "pvc_width": 2, "pvc_thick": 2.0,
            "has_hinge_holes": True, "has_minifix": False, "has_shelf_holes": False, "has_groove": False
        })
        
    return panels

def calculate_design_cost(design_dict, custom_matrix_overrides=None, custom_settings_overrides=None):
    """
    Computes complete itemized Bill of Materials (BOM), material m2, hardware counts,
    and financial costing using dynamic pricing matrix and system settings.
    """
    conn = get_db()
    c = conn.cursor()
    
    # Load Pricing Matrix
    c.execute("SELECT item_key, item_name, unit, unit_price FROM pricing_matrix")
    pricing = {row['item_key']: dict(row) for row in c.fetchall()}
    if custom_matrix_overrides:
        for k, v in custom_matrix_overrides.items():
            if k in pricing:
                pricing[k]['unit_price'] = float(v)

    # Load System Settings
    c.execute("SELECT key, value FROM system_settings")
    settings = {row['key']: row['value'] for row in c.fetchall()}
    if custom_settings_overrides:
        settings.update(custom_settings_overrides)
        
    conn.close()

    # Parse Design JSONs
    modules = design_dict.get('modules', [])
    if isinstance(modules, str):
        try:
            modules = json.loads(modules)
        except Exception:
            modules = []
            
    appliances = design_dict.get('appliances', [])
    if isinstance(appliances, str):
        try:
            appliances = json.loads(appliances)
        except Exception:
            appliances = []
            
    materials = design_dict.get('materials', {})
    if isinstance(materials, str):
        try:
            materials = json.loads(materials)
        except Exception:
            materials = {}

    # Decompose All Modules into Individual Panels
    all_panels = []
    total_hinges = 0
    total_drawers = 0
    total_handles = 0
    total_legs = 0
    total_minifix_sets = 0
    base_modules_length_m = 0.0
    
    for mod in modules:
        cat = mod.get('category', 'base')
        w = float(mod.get('w', 600))
        
        if cat == 'base':
            total_legs += 4
            base_modules_length_m += (w / 1000.0)
            
        d_cnt = int(mod.get('drawers', 0))
        h_cnt = int(mod.get('hinges', 0))
        
        # If user didn't explicitly set hinges, estimate based on doors
        if d_cnt > 0:
            total_drawers += d_cnt
            total_handles += d_cnt
        elif 'double' in mod.get('type', '') or w >= 800:
            h_cnt = max(h_cnt, 4)
            total_hinges += h_cnt
            total_handles += 2
        elif mod.get('type') not in ['base_dishwasher', 'base_oven']:
            h_cnt = max(h_cnt, 2 if float(mod.get('h', 720)) < 1000 else 4)
            total_hinges += h_cnt
            total_handles += 1
            
        total_minifix_sets += 8  # 8 minifix joints per standard module
        
        panels = decompose_module_into_panels(mod, materials)
        all_panels.extend(panels)
        
    # Aggregate Surface Area & PVC Kenar Bandı
    body_m2 = 0.0
    door_m2 = 0.0
    back_m2 = 0.0
    pvc_08_meters = 0.0
    pvc_20_meters = 0.0
    
    for p in all_panels:
        # area in m2
        area = (p['length'] / 1000.0) * (p['width'] / 1000.0) * p['qty']
        mtype = p['material_type']
        
        if mtype == 'body':
            body_m2 += area
        elif mtype == 'door':
            door_m2 += area
        elif mtype == 'back':
            back_m2 += area
            
        # PVC lengths in meters
        pvc_len_m = (p['length'] / 1000.0) * p['pvc_length'] * p['qty']
        pvc_wid_m = (p['width'] / 1000.0) * p['pvc_width'] * p['qty']
        tot_pvc_m = pvc_len_m + pvc_wid_m
        
        if p['pvc_thick'] >= 2.0:
            pvc_20_meters += tot_pvc_m
        elif p['pvc_thick'] > 0:
            pvc_08_meters += tot_pvc_m

    # Pricing calculations
    body_mat_key = materials.get('body_material', 'mdf_18mm_standart')
    door_mat_key = materials.get('door_material', 'mdf_18mm_highgloss')
    back_mat_key = materials.get('back_panel', 'back_4mm_standart')
    
    price_body_m2 = pricing.get(body_mat_key, {}).get('unit_price', 720.0)
    price_door_m2 = pricing.get(door_mat_key, {}).get('unit_price', 1150.0)
    price_back_m2 = pricing.get(back_mat_key, {}).get('unit_price', 130.0)
    price_pvc_08 = pricing.get('pvc_08mm_govde', {}).get('unit_price', 12.0)
    price_pvc_20 = pricing.get('pvc_20mm_kapak', {}).get('unit_price', 24.0)

    # Cost Line Items
    items = []
    
    cost_body = round(body_m2 * price_body_m2, 2)
    items.append({
        "category": "panel", "name": f"Gövde Malzemesi ({pricing.get(body_mat_key, {}).get('item_name', '18mm MDFlam')})",
        "qty": round(body_m2, 2), "unit": "m²", "unit_price": price_body_m2, "total": cost_body
    })
    
    cost_door = round(door_m2 * price_door_m2, 2)
    items.append({
        "category": "panel", "name": f"Kapak Malzemesi ({pricing.get(door_mat_key, {}).get('item_name', '18mm MDF Kapak')})",
        "qty": round(door_m2, 2), "unit": "m²", "unit_price": price_door_m2, "total": cost_door
    })
    
    cost_back = round(back_m2 * price_back_m2, 2)
    items.append({
        "category": "panel", "name": f"Arkalık ({pricing.get(back_mat_key, {}).get('item_name', '4mm MDF')})",
        "qty": round(back_m2, 2), "unit": "m²", "unit_price": price_back_m2, "total": cost_back
    })
    
    cost_pvc_08 = round(pvc_08_meters * price_pvc_08, 2)
    items.append({
        "category": "edge_band", "name": "0.8mm PVC Kenar Bandı (Gövde)",
        "qty": round(pvc_08_meters, 1), "unit": "metre", "unit_price": price_pvc_08, "total": cost_pvc_08
    })
    
    cost_pvc_20 = round(pvc_20_meters * price_pvc_20, 2)
    items.append({
        "category": "edge_band", "name": "2.0mm PVC Kenar Bandı (Kapak)",
        "qty": round(pvc_20_meters, 1), "unit": "metre", "unit_price": price_pvc_20, "total": cost_pvc_20
    })
    
    # Hardware Items
    price_hinge = pricing.get('mentese_frenli', {}).get('unit_price', 48.0)
    cost_hinge = round(total_hinges * price_hinge, 2)
    items.append({
        "category": "hardware", "name": "Samet/Blum Frenli Tas Menteşe",
        "qty": total_hinges, "unit": "adet", "unit_price": price_hinge, "total": cost_hinge
    })
    
    price_drawer = pricing.get('cekmece_ray_tandem', {}).get('unit_price', 340.0)
    cost_drawer = round(total_drawers * price_drawer, 2)
    if total_drawers > 0:
        items.append({
            "category": "hardware", "name": "Gizli Frenli Tandem Çekmece Rayı",
            "qty": total_drawers, "unit": "takım", "unit_price": price_drawer, "total": cost_drawer
        })
        
    price_handle = pricing.get('kulp_modern', {}).get('unit_price', 65.0)
    cost_handle = round(total_handles * price_handle, 2)
    if total_handles > 0:
        items.append({
            "category": "hardware", "name": "Modern Kulp",
            "qty": total_handles, "unit": "adet", "unit_price": price_handle, "total": cost_handle
        })
        
    price_legs = pricing.get('baza_ayagi_10cm', {}).get('unit_price', 22.0)
    cost_legs = round(total_legs * price_legs, 2)
    if total_legs > 0:
        items.append({
            "category": "hardware", "name": "Ayarlı Baza Ayağı",
            "qty": total_legs, "unit": "adet", "unit_price": price_legs, "total": cost_legs
        })
        
    price_minifix = pricing.get('minifix_baglanti', {}).get('unit_price', 14.0)
    cost_minifix = round(total_minifix_sets * price_minifix, 2)
    items.append({
        "category": "hardware", "name": "Minifix Bağlantı Elemanı ve Kavelalar",
        "qty": total_minifix_sets, "unit": "set", "unit_price": price_minifix, "total": cost_minifix
    })
    
    # Countertop & Plinth
    countertop_mat_key = materials.get('countertop_material')
    countertop_len = float(materials.get('countertop_length_meters', base_modules_length_m))
    if countertop_mat_key and countertop_len > 0 and design_dict.get('category') == 'kitchen':
        p_c = pricing.get(countertop_mat_key, {}).get('unit_price', 4200.0)
        c_cost = round(countertop_len * p_c, 2)
        items.append({
            "category": "countertop", "name": pricing.get(countertop_mat_key, {}).get('item_name', 'Mutfak Tezgahı'),
            "qty": round(countertop_len, 2), "unit": "metre", "unit_price": p_c, "total": c_cost
        })
        
        # Plinth (Baza)
        p_b = pricing.get('aluminyum_baza', {}).get('unit_price', 190.0)
        b_cost = round(countertop_len * p_b, 2)
        items.append({
            "category": "hardware", "name": "Alüminyum Baza Süpürgelik Profili",
            "qty": round(countertop_len, 2), "unit": "metre", "unit_price": p_b, "total": b_cost
        })
        
    # Sink & Faucet
    sink_key = materials.get('sink_material')
    if sink_key and sink_key in pricing:
        p_sink = pricing[sink_key]['unit_price']
        items.append({
            "category": "sink", "name": pricing[sink_key]['item_name'],
            "qty": 1, "unit": "adet", "unit_price": p_sink, "total": p_sink
        })
        
    # Appliances
    for app in appliances:
        key = app.get('key')
        qty = int(app.get('qty', 1))
        if key in pricing:
            p_app = pricing[key]['unit_price']
            items.append({
                "category": "appliance", "name": pricing[key]['item_name'],
                "qty": qty, "unit": "adet", "unit_price": p_app, "total": round(p_app * qty, 2)
            })

    # Raw Material & Hardware Subtotal
    subtotal_materials = sum(it['total'] for it in items)
    
    # Labor Calculation
    labor_per_mod = float(settings.get('labor_cost_per_module', 480.0))
    min_labor = float(settings.get('min_labor_cost', 2500.0))
    module_count = max(len(modules), 1)
    labor_cost = max(min_labor, round(module_count * labor_per_mod, 2))
    
    # Transport & Assembly
    transport_fee = float(settings.get('transport_assembly_fee', 3200.0))
    
    # Total Base Production Cost (Hammadde + İşçilik + Nakliye)
    base_cost = subtotal_materials + labor_cost + transport_fee
    
    # Profit Margin
    margin_pct = float(settings.get('profit_margin_percent', 35.0))
    profit_amount = round(base_cost * (margin_pct / 100.0), 2)
    
    # Net Selling Price before VAT
    net_total = round(base_cost + profit_amount, 2)
    
    # VAT
    vat_pct = float(settings.get('vat_tax_percent', 20.0))
    vat_amount = round(net_total * (vat_pct / 100.0), 2)
    
    grand_total = round(net_total + vat_amount, 2)
    
    return {
        "panel_count": len(all_panels),
        "panels": all_panels,
        "summary": {
            "body_m2": round(body_m2, 2),
            "door_m2": round(door_m2, 2),
            "back_m2": round(back_m2, 2),
            "total_m2": round(body_m2 + door_m2 + back_m2, 2),
            "pvc_08_meters": round(pvc_08_meters, 1),
            "pvc_20_meters": round(pvc_20_meters, 1),
            "hinges": total_hinges,
            "drawers": total_drawers,
            "handles": total_handles,
            "legs": total_legs,
            "modules_count": module_count
        },
        "items": items,
        "financials": {
            "subtotal_materials": subtotal_materials,
            "labor_cost": labor_cost,
            "transport_assembly_fee": transport_fee,
            "base_cost": base_cost,
            "margin_percent": margin_pct,
            "profit_amount": profit_amount,
            "net_total": net_total,
            "vat_percent": vat_pct,
            "vat_amount": vat_amount,
            "grand_total": grand_total
        }
    }

if __name__ == '__main__':
    # Test calculation
    test_design = {
        "category": "kitchen",
        "modules": [
            {"id": "MOD-1", "name": "3 Çekmeceli Alt Dolap", "category": "base", "w": 600, "d": 600, "h": 720, "drawers": 3},
            {"id": "MOD-2", "name": "Eviye Alt Dolap", "category": "base", "w": 900, "d": 600, "h": 720, "hinges": 4}
        ],
        "materials": {
            "body_material": "mdf_18mm_standart",
            "door_material": "mdf_18mm_highgloss",
            "countertop_material": "tezgah_cimstone",
            "countertop_length_meters": 1.5
        },
        "appliances": []
    }
    res = calculate_design_cost(test_design)
    print("Test Calculation Successful:")
    print("Total Panels:", res['panel_count'])
    print("Grand Total TRY:", res['financials']['grand_total'])
