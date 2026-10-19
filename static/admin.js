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
  currentDesign: null,
  currentCostResult: null,

  async init() {
    await this.loadPricingMatrix();
    await this.loadSettings();
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
        <td><strong>${d.customer_name}</strong><br><small style="color:#94a3b8;">${d.customer_phone || ''} | ${d.customer_city || ''}</small></td>
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
    document.getElementById('inspect-city').textContent = design.customer_city || 'İstanbul';
    document.getElementById('inspect-notes').textContent = design.notes || 'Müşteri notu yok.';

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
  }
};

window.AdminPanel = AdminPanel;
