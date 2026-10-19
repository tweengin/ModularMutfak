/**
 * ModulerCraft Pro - Admin Panel Logic (Manager / Eşinizin Paneli)
 * - Dynamic Pricing Matrix & System Settings
 * - Reference Code Lookup & Automated BOM Cost Calculator
 * - Quotation generator and margin adjustment
 * - Production / CNC Export: Live 2D Nesting Canvas, Pegasus/Honda Benk DXF, and OptiCut CSV
 */

const AdminPanel = {
  pricingMatrix: [],
  settings: {},
  moduleTemplates: [],
  materials: [],
  currentDesign: null,
  currentCostResult: null,
  adminCanvas2D: null,
  current2DMode: 'plan',

  async init() {
    await this.loadPricingMatrix();
    await this.loadSettings();
    await this.loadModuleTemplates();
    await this.loadMaterials();
    await this.loadDesignsList();
  },

  async loadPricingMatrix() {
    try {
      const res = await fetch('/api/admin/pricing-matrix');
      const data = await res.json();
      this.pricingMatrix = data.pricing_matrix || [];
      this.renderPricingTable();
    } catch (e) {
      console.error("Error loading pricing matrix:", e);
    }
  },

  async loadSettings() {
    try {
      const res = await fetch('/api/admin/settings');
      const data = await res.json();
      this.settings = data.settings || {};
      this.renderSettingsForm();
    } catch (e) {
      console.error("Error loading settings:", e);
    }
  },

  async loadDesignsList() {
    try {
      const token = localStorage.getItem('mc_token');
      const res = await fetch('/api/admin/designs', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      this.renderDesignsTable(data.designs || []);
    } catch (e) {
      console.error("Error loading designs:", e);
    }
  },

  renderPricingTable() {
    const tbody = document.getElementById('pricing-matrix-tbody');
    if (!tbody) return;

    tbody.innerHTML = '';
    this.pricingMatrix.forEach((item) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong style="color:#fff;">${item.item_name}</strong><br><small style="color:#94a3b8;">${item.category.toUpperCase()} | ${item.supplier || '-'}</small></td>
        <td><span class="badge badge-info">${item.unit}</span></td>
        <td>
          <input type="number" step="0.5" class="matrix-input" id="price-${item.item_key}" value="${item.unit_price}"> ₺
        </td>
        <td>
          <button class="btn btn-outline btn-sm" onclick="AdminPanel.saveItemPrice('${item.item_key}')">Kaydet</button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  },

  renderSettingsForm() {
    const marginInp = document.getElementById('setting-margin');
    const laborInp = document.getElementById('setting-labor');
    const transportInp = document.getElementById('setting-transport');
    const vatInp = document.getElementById('setting-vat');

    if (marginInp && this.settings.profit_margin_percent) {
      marginInp.value = this.settings.profit_margin_percent.value;
    }
    if (laborInp && this.settings.labor_cost_per_module) {
      laborInp.value = this.settings.labor_cost_per_module.value;
    }
    if (transportInp && this.settings.transport_assembly_fee) {
      transportInp.value = this.settings.transport_assembly_fee.value;
    }
    if (vatInp && this.settings.vat_tax_percent) {
      vatInp.value = this.settings.vat_tax_percent.value;
    }
  },

  async saveItemPrice(key) {
    const inp = document.getElementById(`price-${key}`);
    if (!inp) return;
    const newPrice = parseFloat(inp.value);
    const token = localStorage.getItem('mc_token');

    try {
      const res = await fetch('/api/admin/pricing-matrix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ items: [{ item_key: key, unit_price: newPrice }] })
      });
      const data = await res.json();
      if (data.success) {
        showToast("Fiyat güncellendi ve kaydedildi.");
        // If current design is open, recalculate
        if (this.currentDesign) {
          this.calculateDesignCost(this.currentDesign.reference_code);
        }
      }
    } catch (e) {
      alert("Fiyat güncellenirken hata oluştu.");
    }
  },

  async saveSystemSettings() {
    const margin = document.getElementById('setting-margin').value;
    const labor = document.getElementById('setting-labor').value;
    const transport = document.getElementById('setting-transport').value;
    const vat = document.getElementById('setting-vat').value;
    const token = localStorage.getItem('mc_token');

    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          settings: {
            profit_margin_percent: margin,
            labor_cost_per_module: labor,
            transport_assembly_fee: transport,
            vat_tax_percent: vat
          }
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast("Sistem parametreleri başarıyla güncellendi.");
        if (this.currentDesign) {
          this.calculateDesignCost(this.currentDesign.reference_code);
        }
      }
    } catch (e) {
      alert("Ayarlar kaydedilemedi.");
    }
  },

  renderDesignsTable(designs) {
    const tbody = document.getElementById('admin-designs-tbody');
    if (!tbody) return;

    tbody.innerHTML = '';
    designs.forEach((d) => {
      const tr = document.createElement('tr');
      const statusBadge = d.status === 'in_production'
        ? '<span class="badge badge-success">Üretimde (CNC)</span>'
        : (d.status === 'reviewed' ? '<span class="badge badge-warning">Teklif Verildi</span>' : '<span class="badge badge-info">Fiyat Bekliyor</span>');

      tr.innerHTML = `
        <td><strong style="color:#38bdf8; font-family:monospace; font-size:1rem;">${d.reference_code}</strong></td>
        <td>
          <strong>${d.customer_name}</strong><br>
          <small style="color:#94a3b8;">${d.customer_phone || ''} | ${d.customer_city || ''}</small>
          ${d.appointment_date ? `<br><span style="color:#10b981; font-size:0.75rem; font-weight:700;">📅 ${d.appointment_date} (${d.appointment_time_slot || ''})</span>` : ''}
        </td>
        <td><span class="badge badge-info">${d.category?.toUpperCase()}</span></td>
        <td>${d.quote_price > 0 ? (d.quote_price.toLocaleString('tr-TR') + ' ₺') : 'Hesaplanmadı'}</td>
        <td>${statusBadge}</td>
        <td>
          <button class="btn btn-primary btn-sm" onclick="AdminPanel.inspectDesign('${d.reference_code}')">Maliyeti İncele & CNC</button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  },

  async lookupReferenceCode() {
    const code = document.getElementById('admin-ref-search').value.trim().toUpperCase();
    if (!code) {
      alert("Lütfen referans kodunu giriniz (örn: TR-8421)");
      return;
    }
    await this.inspectDesign(code);
  },

  async inspectDesign(referenceCode) {
    const token = localStorage.getItem('mc_token');
    try {
      const res = await fetch(`/api/designs/reference/${referenceCode}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.error) {
        alert(data.error);
        return;
      }
      this.currentDesign = data.design;
      await this.calculateDesignCost(referenceCode);

      // Scroll to inspection card
      document.getElementById('cost-inspection-section')?.scrollIntoView({ behavior: 'smooth' });
    } catch (e) {
      alert("Tasarım yüklenirken hata oluştu.");
    }
  },

  async calculateDesignCost(referenceCode) {
    const token = localStorage.getItem('mc_token');
    try {
      const res = await fetch(`/api/admin/design/${referenceCode}/cost`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      this.currentCostResult = data.cost_calculation;
      this.renderCostBreakdown(data.cost_calculation, this.currentDesign);
    } catch (e) {
      console.error("Cost calculation error:", e);
    }
  },

  renderCostBreakdown(calc, design) {
    const container = document.getElementById('cost-inspection-section');
    if (!container) return;
    container.style.display = 'block';

    document.getElementById('inspect-ref-code').textContent = design.reference_code;
    document.getElementById('inspect-customer-name').textContent = design.customer_name;
    document.getElementById('inspect-category').textContent = design.category.toUpperCase();
    document.getElementById('inspect-phone').textContent = design.customer_phone;
    const appText = design.appointment_date 
      ? `📅 Tercih Edilen Randevu: ${design.appointment_date} (${design.appointment_time_slot || 'Saat belirtilmedi'})` 
      : 'Randevu tarihi belirtilmedi';
    document.getElementById('inspect-notes').innerHTML = `${design.notes || 'Müşteri notu yok.'}<br><strong style="color:#10b981; display:inline-block; margin-top:4px;">${appText}</strong>`;

    // BOM Items Table
    const tbody = document.getElementById('bom-items-tbody');
    tbody.innerHTML = '';
    calc.items.forEach((it) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong>${it.name}</strong></td>
        <td>${it.qty} ${it.unit}</td>
        <td>${it.unit_price.toLocaleString('tr-TR')} ₺</td>
        <td><strong>${it.total.toLocaleString('tr-TR')} ₺</strong></td>
      `;
      tbody.appendChild(tr);
    });

    // Financials
    const fin = calc.financials;
    document.getElementById('cost-materials-subtotal').textContent = `${fin.subtotal_materials.toLocaleString('tr-TR')} ₺`;
    document.getElementById('cost-labor').textContent = `${fin.labor_cost.toLocaleString('tr-TR')} ₺`;
    document.getElementById('cost-transport').textContent = `${fin.transport_assembly_fee.toLocaleString('tr-TR')} ₺`;
    document.getElementById('cost-base-production').textContent = `${fin.base_cost.toLocaleString('tr-TR')} ₺`;
    document.getElementById('cost-profit-margin').textContent = `%${fin.margin_percent} (${fin.profit_amount.toLocaleString('tr-TR')} ₺)`;
    document.getElementById('cost-net-total').textContent = `${fin.net_total.toLocaleString('tr-TR')} ₺`;
    document.getElementById('cost-vat').textContent = `%${fin.vat_percent} (${fin.vat_amount.toLocaleString('tr-TR')} ₺)`;
    document.getElementById('cost-grand-total').textContent = `${fin.grand_total.toLocaleString('tr-TR')} ₺`;

    // Editable Offer Price input
    const offerInp = document.getElementById('admin-offer-price');
    if (offerInp) {
      offerInp.value = design.quote_price > 0 ? design.quote_price : fin.grand_total;
    }

    this.renderAdmin2D();
  },

  async updateQuoteOffer() {
    if (!this.currentDesign) return;
    const refCode = this.currentDesign.reference_code;
    const finalPrice = parseFloat(document.getElementById('admin-offer-price').value);
    const adminNotes = document.getElementById('admin-offer-notes').value;
    const token = localStorage.getItem('mc_token');

    try {
      const res = await fetch(`/api/admin/design/${refCode}/quote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ quote_price: finalPrice, admin_notes: adminNotes, status: 'reviewed' })
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Fiyat teklifi (${finalPrice.toLocaleString('tr-TR')} ₺) kaydedildi.`);
        this.loadDesignsList();
      }
    } catch (e) {
      alert("Teklif güncellenemedi.");
    }
  },

  async sendToProductionAndNesting() {
    if (!this.currentDesign) return;
    const refCode = this.currentDesign.reference_code;
    const finalPrice = parseFloat(document.getElementById('admin-offer-price').value);
    const token = localStorage.getItem('mc_token');

    if (!confirm(`Proje (${refCode}) üretime aktarılacak ve CNC Nesting haritaları oluşturulacak. Devam edilsin mi?`)) {
      return;
    }

    try {
      // 1. Transition design to production
      await fetch(`/api/admin/design/${refCode}/send-to-production`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ final_price: finalPrice })
      });

      // 2. Run Nesting Optimization
      const nestingRes = await fetch(`/api/admin/design/${refCode}/nesting`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ sheet_width: 2800, sheet_height: 2100, saw_kerf: 4.0 })
      });
      const nestingData = await nestingRes.json();

      showToast("Proje üretime gönderildi! CNC Nesting haritası hazırlandı.");
      this.renderNestingResults(nestingData.nesting);

      // Show download buttons
      document.getElementById('cnc-export-buttons').style.display = 'flex';
      this.loadDesignsList();
    } catch (e) {
      alert("Üretime aktarılırken hata oluştu: " + e.message);
    }
  },

  renderNestingResults(nesting) {
    const container = document.getElementById('nesting-visual-container');
    if (!container) return;
    container.innerHTML = '';
    container.style.display = 'block';

    const sum = nesting.overall_summary;
    const summaryCard = document.createElement('div');
    summaryCard.className = 'nesting-sheet-card';
    summaryCard.innerHTML = `
      <h3 style="margin-bottom:0.75rem; color:#38bdf8;">✦ 2D Nesting Optimizasyon Raporu (Fire Minimizasyonu)</h3>
      <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap:1rem; font-size:0.9rem;">
        <div><strong>Gereken Plaka Sayısı:</strong> <span style="color:#10b981; font-weight:800; font-size:1.1rem;">${sum.total_sheets} Adet</span></div>
        <div><strong>Toplam Parça Adedi:</strong> ${sum.total_panels_packed} Adet</div>
        <div><strong>Plaka Boyutu:</strong> ${sum.sheet_standard_w} x ${sum.sheet_standard_h} mm</div>
        <div><strong>Testere Payı (Kerf):</strong> ${sum.saw_kerf} mm</div>
        <div><strong>Fire Oranı (Waste %):</strong> <span style="color:#ef4444; font-weight:800;">%${sum.waste_percentage}</span></div>
        <div><strong>Verimlilik (Efficiency %):</strong> <span style="color:#10b981; font-weight:800;">%${sum.efficiency_percentage}</span></div>
      </div>
    `;
    container.appendChild(summaryCard);

    // Draw Visual Nesting Plates on HTML5 Canvases
    Object.keys(nesting.groups).forEach((gkey) => {
      const grp = nesting.groups[gkey];
      grp.sheets.forEach((sheet) => {
        const sheetCard = document.createElement('div');
        sheetCard.className = 'nesting-sheet-card';
        sheetCard.innerHTML = `
          <div class="sheet-meta-bar">
            <span><strong>Plaka #${sheet.sheet_number}</strong> (${gkey} | ${sheet.width}x${sheet.height}mm)</span>
            <span>Yerleşen Parça: <strong>${sheet.placed_panels.length} Adet</strong></span>
          </div>
          <canvas id="nesting-canvas-${gkey}-${sheet.sheet_number}" width="840" height="630" style="width:100%; height:auto; background:#0f172a; border:1px solid #475569; border-radius:4px;"></canvas>
        `;
        container.appendChild(sheetCard);

        setTimeout(() => {
          this.drawNestingCanvas(`nesting-canvas-${gkey}-${sheet.sheet_number}`, sheet);
        }, 50);
      });
    });
  },

  drawNestingCanvas(canvasId, sheet) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const cw = canvas.width;
    const ch = canvas.height;

    ctx.clearRect(0, 0, cw, ch);

    const sw = sheet.width || 2800;
    const sh = sheet.height || 2100;
    const scale = Math.min((cw - 40) / sw, (ch - 40) / sh);
    const ox = (cw - (sw * scale)) / 2;
    const oy = (ch - (sh * scale)) / 2;

    // Draw Plate Boundary
    ctx.fillStyle = "#1e293b";
    ctx.strokeStyle = "#38bdf8";
    ctx.lineWidth = 2;
    ctx.fillRect(ox, oy, sw * scale, sh * scale);
    ctx.strokeRect(ox, oy, sw * scale, sh * scale);

    // Palette for distinct panels
    const colors = ["#2563eb", "#059669", "#d97706", "#7c3aed", "#db2777", "#0891b2", "#4f46e5", "#b45309"];

    // Draw Nested Panels
    sheet.placed_panels.forEach((p, idx) => {
      const px = ox + (p.x * scale);
      const py = oy + (p.y * scale);
      const pw = p.w * scale;
      const ph = p.h * scale;

      const col = colors[idx % colors.length];
      ctx.fillStyle = col;
      ctx.fillRect(px, py, pw, ph);
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 1;
      ctx.strokeRect(px, py, pw, ph);

      // Text label inside panel
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 10px sans-serif";
      ctx.fillText(p.id, px + 5, py + 14);
      if (ph > 35) {
        ctx.font = "9px sans-serif";
        ctx.fillText(`${intOrDec(p.w)}x${intOrDec(p.h)}mm`, px + 5, py + 26);
      }
    });

    // Draw Usable Offcuts (Fire / Kalan Parçalar)
    sheet.usable_offcuts?.forEach((off) => {
      const oxPos = ox + (off.x * scale);
      const oyPos = oy + (off.y * scale);
      const ow = off.w * scale;
      const oh = off.h * scale;

      ctx.fillStyle = "rgba(100, 116, 139, 0.25)";
      ctx.fillRect(oxPos, oyPos, ow, oh);
      ctx.strokeStyle = "#94a3b8";
      ctx.setLineDash([3, 3]);
      ctx.strokeRect(oxPos, oyPos, ow, oh);
      ctx.setLineDash([]);

      if (ow > 60 && oh > 25) {
        ctx.fillStyle = "#94a3b8";
        ctx.font = "9px sans-serif";
        ctx.fillText(`Kalan: ${Math.round(off.w)}x${Math.round(off.h)}`, oxPos + 6, oyPos + 14);
      }
    });

    function intOrDec(v) { return Math.round(v); }
  },

  downloadDXF() {
    if (!this.currentDesign) return;
    const ref = this.currentDesign.reference_code;
    window.location.href = `/api/admin/design/${ref}/export/dxf`;
  },

  downloadCSV() {
    if (!this.currentDesign) return;
    const ref = this.currentDesign.reference_code;
    window.location.href = `/api/admin/design/${ref}/export/csv`;
  },

  async loadModuleTemplates() {
    try {
      const res = await fetch('/api/admin/module-templates');
      const data = await res.json();
      this.moduleTemplates = data.module_templates || [];
      this.renderModuleTemplatesList();
    } catch (e) {
      console.error("Error loading module templates:", e);
    }
  },

  renderModuleTemplatesList() {
    const container = document.getElementById('admin-module-templates-list');
    if (!container) return;
    container.innerHTML = '';

    this.moduleTemplates.forEach(tpl => {
      const card = document.createElement('div');
      card.style = 'background:rgba(255,255,255,0.03); border:1px solid #334155; border-radius:6px; padding:0.75rem;';
      const widthsStr = (tpl.allowed_widths || []).join(', ');

      card.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.4rem;">
          <div style="display:flex; align-items:center; gap:0.4rem;">
            <span style="font-size:1.2rem;">${tpl.icon || '🗄️'}</span>
            <strong>${tpl.name}</strong>
            <span class="badge badge-info" style="font-size:0.7rem;">${(tpl.group_key || 'base').toUpperCase()}</span>
          </div>
          <button class="btn btn-primary btn-sm" style="padding:0.25rem 0.6rem; font-size:0.75rem;" onclick="AdminPanel.saveModuleTemplate('${tpl.key}')">Kaydet 💾</button>
        </div>

        <div style="display:grid; grid-template-columns: 2fr 1fr; gap:0.5rem; font-size:0.8rem;">
          <div>
            <label style="color:#94a3b8; font-size:0.75rem;">Müşteriye İzin Verilen Ebatlar (mm - virgülle ayırın):</label>
            <input type="text" id="tpl-widths-${tpl.key}" class="form-control" value="${widthsStr}" style="padding:0.25rem 0.5rem; font-size:0.8rem;">
          </div>
          <div>
            <label style="color:#94a3b8; font-size:0.75rem;">Özel Ölçü Yetkisi:</label>
            <select id="tpl-custom-${tpl.key}" class="form-control" style="padding:0.25rem 0.5rem; font-size:0.8rem;">
              <option value="1" ${tpl.allow_custom_width ? 'selected' : ''}>Açık (Müşteri Yazabilir)</option>
              <option value="0" ${!tpl.allow_custom_width ? 'selected' : ''}>Kapalı (Sadece Hazır Ebat)</option>
            </select>
          </div>
        </div>
      `;
      container.appendChild(card);
    });
  },

  async saveModuleTemplate(key) {
    const widthsInput = document.getElementById(`tpl-widths-${key}`);
    const customSelect = document.getElementById(`tpl-custom-${key}`);
    if (!widthsInput || !customSelect) return;

    const widths = widthsInput.value.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n) && n > 0);
    const allowCustom = customSelect.value === '1';

    try {
      const token = localStorage.getItem('mc_token');
      const res = await fetch('/api/admin/module-templates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          key,
          allowed_widths: widths,
          allow_custom_width: allowCustom
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast("Modül ölçü kuralları kaydedildi! Müşteri arayüzüne anında yansıyacaktır.");
        await this.loadModuleTemplates();
        if (window.loadCategoryModules) {
          window.loadCategoryModules(window.CURRENT_CATEGORY || 'kitchen');
        }
      } else {
        alert(data.error || "Güncelleme başarısız.");
      }
    } catch (e) {
      alert("Hata oluştu.");
    }
  },

  set2DView(mode) {
    this.current2DMode = mode;
    document.getElementById('admin-tab-plan')?.classList.toggle('active', mode === 'plan');
    document.getElementById('admin-tab-elevation')?.classList.toggle('active', mode === 'elevation');

    if (this.adminCanvas2D && this.currentDesign) {
      this.adminCanvas2D.viewMode = mode;
      this.adminCanvas2D.render(
        this.currentDesign.room_config,
        this.currentDesign.modules,
        this.currentDesign.layout_type,
        this.currentDesign.category
      );
    }
  },

  renderAdmin2D() {
    const box = document.getElementById('admin-2d-canvas-box');
    const canvas = document.getElementById('admin-canvas2d-viewport');
    if (!box || !canvas || !this.currentDesign) return;

    box.style.display = 'block';
    if (!this.adminCanvas2D) {
      this.adminCanvas2D = new StudioCanvas2D(canvas);
    }
    this.adminCanvas2D.viewMode = this.current2DMode || 'plan';
    this.adminCanvas2D.render(
      this.currentDesign.room_config,
      this.currentDesign.modules,
      this.currentDesign.layout_type,
      this.currentDesign.category
    );
  },

  /*
   * DYNAMIC WIZARD MATERIALS MANAGEMENT (Countertops & Cabinet Finishes)
   */
  async loadMaterials() {
    try {
      const res = await fetch('/api/admin/materials');
      const data = await res.json();
      this.materials = data.materials || [];
      this.renderMaterialsTable();
    } catch (e) {
      console.error("Error loading materials:", e);
    }
  },

  renderMaterialsTable() {
    const list = document.getElementById('admin-materials-list');
    if (!list) return;

    list.innerHTML = '';
    const countertops = this.materials.filter(m => m.category === 'countertop');
    const cabinets = this.materials.filter(m => m.category === 'cabinet');

    const renderGroup = (title, icon, items) => {
      const groupEl = document.createElement('div');
      groupEl.style.marginBottom = '1rem';
      groupEl.innerHTML = `
        <div style="font-size:0.85rem; font-weight:700; color:#cbd5e1; margin-bottom:0.4rem; display:flex; align-items:center; gap:6px;">
          <span>${icon}</span> <span>${title}</span> (${items.length})
        </div>
      `;
      items.forEach(m => {
        const itemEl = document.createElement('div');
        itemEl.style.background = '#1e293b';
        itemEl.style.border = '1px solid #334155';
        itemEl.style.borderRadius = '6px';
        itemEl.style.padding = '0.6rem 0.85rem';
        itemEl.style.display = 'flex';
        itemEl.style.justifyContent = 'space-between';
        itemEl.style.alignItems = 'center';
        itemEl.style.marginBottom = '0.4rem';

        itemEl.innerHTML = `
          <div style="display:flex; align-items:center; gap:10px;">
            <div style="width:24px; height:24px; border-radius:50%; background:${m.color_hex}; border:2px solid #475569; box-shadow:0 0 6px rgba(0,0,0,0.5);"></div>
            <div>
              <strong style="font-size:0.85rem; color:#f8fafc;">${m.name}</strong>
              <div style="font-size:0.7rem; color:#94a3b8;">${m.key} | Doku: ${m.texture_type} | ${m.is_active ? '<span style="color:#10b981;">● Aktif</span>' : '<span style="color:#ef4444;">○ Pasif</span>'}</div>
            </div>
          </div>
          <div style="display:flex; gap:6px;">
            <button class="btn btn-outline btn-sm" onclick="AdminPanel.openEditMaterialModal(${m.id})">✏️ Düzenle</button>
            <button class="btn btn-danger btn-sm" onclick="AdminPanel.deleteMaterial(${m.id})">🗑️</button>
          </div>
        `;
        groupEl.appendChild(itemEl);
      });
      list.appendChild(groupEl);
    };

    renderGroup('Tezgah Malzemeleri', '🪨', countertops);
    renderGroup('Modül / Kapak Malzemeleri', '🚪', cabinets);
  },

  openNewMaterialModal() {
    document.getElementById('admin-mat-modal-title').textContent = '➕ Yeni Malzeme Ekle';
    document.getElementById('mat-modal-id').value = '';
    document.getElementById('mat-modal-category').value = 'countertop';
    document.getElementById('mat-modal-name').value = '';
    document.getElementById('mat-modal-key').value = '';
    document.getElementById('mat-modal-color').value = '#f8fafc';
    document.getElementById('mat-modal-color-hex').value = '#f8fafc';
    document.getElementById('mat-modal-texture').value = 'stone';
    document.getElementById('mat-modal-desc').value = '';
    document.getElementById('mat-modal-active').checked = true;
    document.getElementById('mat-modal-delete-btn').style.display = 'none';

    document.getElementById('admin-material-modal').style.display = 'flex';
  },

  openEditMaterialModal(matId) {
    const mat = this.materials.find(m => m.id === matId);
    if (!mat) return;

    document.getElementById('admin-mat-modal-title').textContent = '✏️ Malzemeyi Düzenle';
    document.getElementById('mat-modal-id').value = mat.id;
    document.getElementById('mat-modal-category').value = mat.category;
    document.getElementById('mat-modal-name').value = mat.name;
    document.getElementById('mat-modal-key').value = mat.key;
    document.getElementById('mat-modal-color').value = mat.color_hex;
    document.getElementById('mat-modal-color-hex').value = mat.color_hex;
    document.getElementById('mat-modal-texture').value = mat.texture_type;
    document.getElementById('mat-modal-desc').value = mat.description || '';
    document.getElementById('mat-modal-active').checked = Boolean(mat.is_active);
    document.getElementById('mat-modal-delete-btn').style.display = 'block';

    document.getElementById('admin-material-modal').style.display = 'flex';
  },

  closeMaterialModal() {
    document.getElementById('admin-material-modal').style.display = 'none';
  },

  async saveMaterialModal() {
    const token = localStorage.getItem('mc_token');
    const id = document.getElementById('mat-modal-id').value;
    const category = document.getElementById('mat-modal-category').value;
    const name = document.getElementById('mat-modal-name').value.trim();
    const key = document.getElementById('mat-modal-key').value.trim();
    const color_hex = document.getElementById('mat-modal-color').value;
    const texture_type = document.getElementById('mat-modal-texture').value;
    const description = document.getElementById('mat-modal-desc').value.trim();
    const is_active = document.getElementById('mat-modal-active').checked ? 1 : 0;

    if (!name) {
      alert("Lütfen malzeme adını giriniz.");
      return;
    }

    try {
      const res = await fetch('/api/admin/materials', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          id: id ? parseInt(id) : null,
          category,
          name,
          key,
          color_hex,
          texture_type,
          description,
          is_active
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast("Malzeme başarıyla kaydedildi!");
        this.closeMaterialModal();
        await this.loadMaterials();
        if (window.loadActiveCatalogMaterials) {
          window.loadActiveCatalogMaterials();
        }
      } else {
        alert(data.error || "Hata oluştu.");
      }
    } catch (e) {
      alert("Sunucu hatası.");
    }
  },

  async deleteMaterialFromModal() {
    const id = document.getElementById('mat-modal-id').value;
    if (id) {
      await this.deleteMaterial(parseInt(id));
      this.closeMaterialModal();
    }
  },

  async deleteMaterial(matId) {
    if (!confirm("Bu malzemeyi silmek istediğinize emin misiniz?")) return;
    const token = localStorage.getItem('mc_token');
    try {
      const res = await fetch('/api/admin/materials/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ id: matId })
      });
      const data = await res.json();
      if (data.success) {
        showToast("Malzeme silindi.");
        await this.loadMaterials();
        if (window.loadActiveCatalogMaterials) {
          window.loadActiveCatalogMaterials();
        }
      } else {
        alert(data.error || "Silinemedi.");
      }
    } catch (e) {
      alert("Hata oluştu.");
    }
  }
};

window.AdminPanel = AdminPanel;
