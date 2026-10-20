/**
 * ModulerCraft Pro - Master Application Controller (ADeko Mode)
 * Handles auth state, wizard progression, ADeko categorized accordion modules,
 * live 3D ghost shadow drag & drop, 360° orbit synchronization, and quotation submission.
 */

// Global Application State
window.CURRENT_USER = null;
window.CURRENT_CATEGORY = 'kitchen';
window.CURRENT_DRAGGED_MODULE = null;
window.CURRENT_ACTIVE_WALL = 'back'; // 'back' (Arka Duvar) or 'left' (Sol Duvar)
window.PENDING_CATEGORY = null; // Stored category if guest registers before studio
window.activeCanvasMode = '3d'; // '3d' ADeko perspective showroom as primary view

window.CURRENT_DESIGN = {
  category: 'kitchen',
  layout_type: 'single_wall',
  room_width: 3600,
  room_depth: 2600,
  room_height: 2600,
  room_config: {
    door: { wall: 'left', pos: 400, width: 900, swing: 'inward_right' },
    window: { wall: 'top', pos: 1200, width: 1200, sill_height: 950 },
    flooring: { type: 'Laminat Parke Doğal Meşe', sponsor: 'AGT Zemin Sistemleri' },
    wall_color: '#cbd5e1'
  },
  modules: [],
  appliances: [],
  materials: {
    body_material: 'mdf_18mm_standart',
    door_material: 'mdf_18mm_highgloss',
    back_panel: 'back_4mm_standart',
    body_color: 'Doğal Meşe / Kaşmir Gri',
    door_color: 'Doğal Meşe Dokulu MDFlam',
    countertop_material: 'tezgah_cimstone',
    countertop_length_meters: 3.6,
    sink_material: 'evye_paslanmaz',
    handle_type: 'kulp_modern'
  },
  notes: ''
};

// ADeko Categorized Module Catalog
const ADEKO_MODULE_GROUPS = {
  kitchen: [
    {
      groupKey: 'base',
      title: 'Alt Dolaplar (Base)',
      icon: '🗄️',
      open: true,
      items: [
        { type: 'base_drawer_3', name: '3 Çekmeceli Alt Dolap', category: 'base', w: 600, d: 600, h: 720, drawers: 3, hinges: 0, icon: '🗄️', desc: 'Frenli tandem raylı 3 çekmece' },
        { type: 'base_sink', name: 'Eviye Alt Dolabı (2 Kapak)', category: 'base', w: 900, d: 600, h: 720, drawers: 0, hinges: 4, icon: '💧', desc: 'Paslanmaz/granit eviye altı' },
        { type: 'base_oven', name: 'Ankastre Fırın & Ocak Modülü', category: 'base', w: 600, d: 600, h: 720, drawers: 1, hinges: 0, icon: '♨️', desc: 'Fırın boşluğu ve alt çekmece' },
        { type: 'base_dishwasher', name: 'Bulaşık Makinesi Paneli', category: 'base', w: 600, d: 600, h: 720, drawers: 0, hinges: 0, icon: '🍽️', desc: '60cm tam ankastre kapağı' },
        { type: 'base_standard', name: 'Standart Tek Kapak Alt Dolap', category: 'base', w: 500, d: 600, h: 720, drawers: 0, hinges: 2, icon: '🚪', desc: '1 ayarlı raflı tek kapak' },
        { type: 'base_double', name: 'Çift Kapaklı Geniş Alt Dolap', category: 'base', w: 800, d: 600, h: 720, drawers: 0, hinges: 4, icon: '🚪', desc: 'Geniş tencere depolama' },
        { type: 'base_corner_straight', name: 'Düz Kör Köşe Alt Dolap', category: 'base', w: 1000, d: 600, h: 720, drawers: 0, hinges: 2, icon: '📐', desc: 'Düz kör köşe dönüş dolabı (Tek Raflı)' },
        { type: 'base_corner_l', name: '90° L-Köşe Alt Dolap', category: 'base', w: 900, d: 900, h: 720, drawers: 0, hinges: 2, icon: '📐', desc: '90° L köşe dönüş dolabı (Tek Raflı)' },
        { type: 'base_corner_v', name: 'V-Köşe (45° Diyagonal) Alt Dolap', category: 'base', w: 900, d: 900, h: 720, drawers: 0, hinges: 2, icon: '📐', desc: '45° pahlı diyagonal köşe dolabı (Tek Raflı)' },
        { type: 'base_open_shelf', name: 'Açık Raflı Alt Modül (Kapaksız)', category: 'base', w: 400, d: 600, h: 720, isOpenShelf: true, shelfCount: 1, drawers: 0, hinges: 0, icon: '📚', desc: '1-3 ayarlı raflı açık alt modül' }
      ]
    },
    {
      groupKey: 'wall',
      title: 'Üst Dolaplar (Wall)',
      icon: '📦',
      open: true,
      items: [
        { type: 'wall_glass', name: 'Camlı Yatay Kalkar Dolap', category: 'wall', w: 900, d: 350, h: 720, drawers: 0, hinges: 2, icon: '🪟', desc: 'Buzlu cam insets & aventos' },
        { type: 'wall_double', name: 'Çift Kapaklı Üst Dolap', category: 'wall', w: 800, d: 350, h: 720, drawers: 0, hinges: 4, icon: '📦', desc: 'Standart çift kapaklı üst' },
        { type: 'wall_single', name: 'Tek Kapaklı Üst Dolap', category: 'wall', w: 500, d: 350, h: 720, drawers: 0, hinges: 2, icon: '📦', desc: 'Dar alan üst depolama' },
        { type: 'wall_hood', name: 'Davlumbaz Üstü Aspiratör Dolabı', category: 'wall', w: 600, d: 350, h: 720, drawers: 0, hinges: 2, icon: '💨', desc: 'Karbon filtreli gömme' },
        { type: 'wall_hood_chimney', name: 'Açık Paslanmaz Çelik T-Davlumbaz', category: 'wall', w: 600, d: 450, h: 720, drawers: 0, hinges: 0, icon: '🌪️', desc: 'Inox T-tipi açık baca davlumbaz' },
        { type: 'wall_corner_straight', name: 'Düz Kör Köşe Üst Dolap', category: 'wall', w: 650, d: 350, h: 720, drawers: 0, hinges: 2, icon: '📐', desc: 'Düz kör köşe üst dolap (Tek Raflı)' },
        { type: 'wall_corner_l', name: '90° L-Köşe Üst Dolabı', category: 'wall', w: 650, d: 650, h: 720, drawers: 0, hinges: 2, icon: '📐', desc: '90° L köşe üst asma (Tek Raflı)' },
        { type: 'wall_corner_v', name: 'V-Köşe (45° Diyagonal) Üst Dolap', category: 'wall', w: 650, d: 650, h: 720, drawers: 0, hinges: 2, icon: '📐', desc: '45° pahlı diyagonal köşe üst dolabı (Tek Raflı)' },
        { type: 'wall_open_shelf', name: 'Açık Raflı Üst Modül (Kapaksız)', category: 'wall', w: 400, d: 350, h: 720, isOpenShelf: true, shelfCount: 2, drawers: 0, hinges: 0, icon: '📚', desc: '1-3 ayarlı raflı açık üst modül' }
      ]
    },
    {
      groupKey: 'tall',
      title: 'Boy Dolaplar & Kiler (Tall)',
      icon: '🧊',
      open: false,
      items: [
        { type: 'tall_fridge', name: 'No-Frost Buzdolabı Kabini', category: 'tall', w: 700, d: 600, h: 2100, drawers: 0, hinges: 2, icon: '🧊', desc: 'Buzdolabı üstü kiler' },
        { type: 'tall_oven_pantry', name: 'Ankastre Fırın & Mikrodalga Boy', category: 'tall', w: 600, d: 600, h: 2100, drawers: 2, hinges: 2, icon: '♨️', desc: 'Göz hizası fırın boy ünitesi' },
        { type: 'tall_pantry_2d', name: '2 Kapaklı Erzak Boy Kileri', category: 'tall', w: 600, d: 600, h: 2100, drawers: 0, hinges: 4, icon: '🚪', desc: '5 raflı tam boy kiler' }
      ]
    },
    {
      groupKey: 'appliance',
      title: 'Ankastre Cihazlar (Appliances)',
      icon: '🔌',
      open: false,
      items: [
        { type: 'app_fridge', name: 'Kombi No-Frost Buzdolabı', category: 'tall', w: 700, d: 600, h: 1850, icon: '🧊', desc: 'A++ Inox çift kapılı' },
        { type: 'app_oven', name: 'Multifonksiyonel Ankastre Fırın', category: 'base', w: 600, d: 600, h: 600, icon: '♨️', desc: 'Dijital programlı siyah cam' },
        { type: 'app_sink', name: 'Paslanmaz Çelik Eviye & Batarya', category: 'base', w: 860, d: 500, h: 200, icon: '💧', desc: 'Krom spiral bataryalı' }
      ]
    }
  ],
  portmanto: [
    {
      groupKey: 'hall_units',
      title: 'Antre & Portmanto Modülleri',
      icon: '🧥',
      open: true,
      items: [
        { type: 'hall_shoe_bench', name: 'Minderli Ayakkabılık Bench', category: 'base', w: 1000, d: 450, h: 500, drawers: 2, hinges: 2, icon: '👟', desc: 'Oturmalı çekmeceli ayakkabılık' },
        { type: 'hall_mirror_cabinet', name: 'Boy Aynalı Gizli Dolap', category: 'tall', w: 600, d: 450, h: 2200, drawers: 0, hinges: 4, icon: '🪞', desc: 'Tam boy ayna kapak' },
        { type: 'hall_coat_wardrobe', name: '2 Kapaklı Askılık & Portmanto', category: 'tall', w: 900, d: 550, h: 2200, drawers: 0, hinges: 4, icon: '🧥', desc: 'Ceket & kaban askılığı' },
        { type: 'hall_top_cabinet', name: 'Üst Depolama Dolabı', category: 'wall', w: 1000, d: 450, h: 600, drawers: 0, hinges: 2, icon: '📦', desc: 'Valiz & mevsimlik depolama' }
      ]
    }
  ],
  bedroom: [
    {
      groupKey: 'bed_units',
      title: 'Yatak Odası Modülleri',
      icon: '🛏️',
      open: true,
      items: [
        { type: 'bed_wardrobe_3d', name: '3 Kapaklı Gardırop', category: 'tall', w: 1500, d: 600, h: 2200, drawers: 2, hinges: 6, icon: '🚪', desc: 'Raflı ve pantolonluk bölmeli' },
        { type: 'bed_nightstand', name: '2 Çekmeceli Komodin', category: 'base', w: 500, d: 400, h: 500, drawers: 2, hinges: 0, icon: '🛏️', desc: 'Yatak başı komodini' },
        { type: 'bed_vanity', name: 'Makyaj Masası & Konsol', category: 'base', w: 1000, d: 450, h: 780, drawers: 2, hinges: 0, icon: '💄', desc: 'Aynalı çekmeceli masa' },
        { type: 'bed_dresser', name: '4 Çekmeceli Şifonyer', category: 'base', w: 900, d: 500, h: 900, drawers: 4, hinges: 0, icon: '🗄️', desc: 'Geniş çamaşır çekmeceleri' }
      ]
    }
  ],
  children: [
    {
      groupKey: 'child_units',
      title: 'Çocuk Odası Modülleri',
      icon: '🧸',
      open: true,
      items: [
        { type: 'child_desk', name: 'Ergonomik Çalışma Masası', category: 'base', w: 1200, d: 600, h: 750, drawers: 2, hinges: 0, icon: '🖥️', desc: 'Kablo geçişli ders masası' },
        { type: 'child_wardrobe', name: 'Güvenli Köşeli Gardırop', category: 'tall', w: 1000, d: 550, h: 2000, drawers: 2, hinges: 4, icon: '🧸', desc: 'Radiuslu yumuşak köşeler' },
        { type: 'child_bookcase', name: 'Kitaplık & Oyuncaklık', category: 'wall', w: 800, d: 350, h: 1200, drawers: 0, hinges: 0, icon: '📚', desc: 'Modüler açık raf bölmeleri' },
        { type: 'child_nightstand', name: 'Çocuk Komodini', category: 'base', w: 450, d: 400, h: 450, drawers: 1, hinges: 0, icon: '🛏️', desc: 'Güvenli çekmece raylı' }
      ]
    }
  ]
};

// Canvases
let canvas2D = null;
let canvas3D = null;

document.addEventListener('DOMContentLoaded', async () => {
  initCanvases();
  await checkAuthSession();
  await loadActiveCatalogMaterials();
  setupEventListeners();
  loadCategoryModules(window.CURRENT_CATEGORY);
  navigateTo('landing'); // Start on the landing page showcase website!
});

function initCanvases() {
  const c2dElem = document.getElementById('canvas2d-viewport');
  const c3dElem = document.getElementById('canvas3d-viewport');

  if (c2dElem) {
    canvas2D = new StudioCanvas2D(c2dElem);
    canvas2D.onCollisionChange = (colliding) => {
      const alertElem = document.getElementById('door-clearance-warning');
      if (alertElem) alertElem.style.display = colliding ? 'flex' : 'none';
    };
    canvas2D.onSelectionChange = (modId) => {
      if (modId) {
        const mod = window.CURRENT_DESIGN.modules.find(m => m.id === modId);
        if (mod) showSelectedModuleGizmo(mod);
      } else {
        hideSelectedModuleGizmo();
      }
      updatePlacedModulesUI();
    };
  }

  if (c3dElem) {
    canvas3D = new StudioCanvas3D(c3dElem);
    canvas3D.onModuleSelected = (mod) => {
      if (mod) {
        showSelectedModuleGizmo(mod);
      } else {
        hideSelectedModuleGizmo();
      }
      updatePlacedModulesUI();
    };
    canvas3D.onModuleMoved = (mod) => {
      showToast(`📍 ${mod.name} (${mod.wall === 'left' ? 'Sol Duvar' : 'Arka Duvar'}) yeni konumu: ${mod.x} mm`);
      showSelectedModuleGizmo(mod);
      updatePlacedModulesUI();
    };
  }

  window.renderStudioCanvas = renderActiveCanvas;
  setupDragAndDrop();
}

// Active Wall Switcher (Arka Duvar ↔ Sol Duvar)
window.setActiveWall = function(wall) {
  window.CURRENT_ACTIVE_WALL = wall;
  document.querySelectorAll('.wall-btn, #wall-btn-back, #wall-btn-left').forEach(btn => btn.classList.remove('active'));
  document.getElementById(`wall-btn-${wall}`)?.classList.add('active');

  if (canvas3D && window.activeCanvasMode === '3d') {
    if (wall === 'left') {
      canvas3D.setPreset('left_wall');
    } else {
      canvas3D.setPreset('front');
    }
  }
  renderActiveCanvas();
  updatePlacedModulesUI();
  showToast(`🧱 Çalışma Duvarı Değiştirildi: ${wall === 'left' ? 'Sol Duvar' : 'Arka Duvar'}`);
};

function renderActiveCanvas() {
  const c2dElem = document.getElementById('canvas2d-viewport');
  const c3dElem = document.getElementById('canvas3d-viewport');
  const camBar = document.getElementById('camera-controls-bar');
  const orbitBadge = document.getElementById('orbit-hint-badge');

  if (window.activeCanvasMode === '3d') {
    if (c2dElem) c2dElem.style.display = 'none';
    if (c3dElem) {
      c3dElem.style.display = 'block';
      canvas3D.render(window.CURRENT_DESIGN.room_config, window.CURRENT_DESIGN.modules, window.CURRENT_DESIGN.layout_type, window.CURRENT_DESIGN.materials);
    }
    if (camBar) camBar.style.display = 'flex';
    if (orbitBadge) orbitBadge.style.display = 'flex';
  } else {
    if (c3dElem) c3dElem.style.display = 'none';
    if (c2dElem) {
      c2dElem.style.display = 'block';
      canvas2D.viewMode = window.activeCanvasMode; // 'plan' or 'elevation'
      canvas2D.render(window.CURRENT_DESIGN.room_config, window.CURRENT_DESIGN.modules, window.CURRENT_DESIGN.layout_type, window.CURRENT_DESIGN.category);
    }
    if (camBar) camBar.style.display = 'none';
    if (orbitBadge) orbitBadge.style.display = 'none';
  }
}

function setCanvasMode(mode) {
  window.activeCanvasMode = mode;
  document.querySelectorAll('.view-tab').forEach(b => b.classList.remove('active'));
  document.getElementById(`tab-${mode}`)?.classList.add('active');
  renderActiveCanvas();
}

// 360° Camera Preset Switcher
window.setCameraPreset = function(preset) {
  if (canvas3D) {
    canvas3D.setPreset(preset);
    const autoBtn = document.getElementById('cam-auto');
    if (autoBtn) {
      if (canvas3D.autoRotate) {
        autoBtn.classList.add('active');
      } else {
        autoBtn.classList.remove('active');
      }
    }
  }
};

// NAVIGATION ROUTER
function navigateTo(viewId) {
  document.querySelectorAll('.view-section').forEach(sec => sec.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));

  const targetSec = document.getElementById(`view-${viewId}`);
  if (targetSec) targetSec.classList.add('active');
  document.getElementById(`nav-${viewId}`)?.classList.add('active');

  if (viewId === 'studio') {
    document.body.classList.add('in-studio-mode');
    setTimeout(() => {
      renderActiveCanvas();
      updatePlacedModulesUI();
      checkRulerBubbleInitialDisplay();
      checkCustomerAccessSession();
      updateRoomInfoBadges();
      if (canvas3D) canvas3D.onWindowResize();
      if (localStorage.getItem('mc_hide_3d_guide') === '1') {
        const card = document.getElementById('studio-onboarding-card');
        const btn = document.getElementById('studio-reopen-guide-btn');
        if (card) card.style.display = 'none';
        if (btn) btn.style.display = 'flex';
      }
    }, 100);
  } else {
    document.body.classList.remove('in-studio-mode');
    if (viewId === 'admin') {
      AdminPanel.init();
    }
  }
}

function updateRoomInfoBadges() {
  const rc = window.CURRENT_DESIGN?.room_config || { room_width: 3600, room_depth: 2600, room_height: 2600 };
  const rw = rc.room_width || 3600;
  const rd = rc.room_depth || 2600;
  const rh = rc.room_height || 2600;
  const areaM2 = ((rw * rd) / 1000000).toFixed(1);
  const wCm = Math.round(rw / 10);
  const dCm = Math.round(rd / 10);
  const hCm = Math.round(rh / 10);

  const topRoomInfo = document.getElementById('topbar-room-info');
  if (topRoomInfo) topRoomInfo.textContent = `Mutfak (${wCm} × ${dCm} cm)`;

  const bottomRoomText = document.getElementById('room-metrics-text');
  if (bottomRoomText) bottomRoomText.textContent = `${wCm} × ${dCm} cm | ${areaM2} m² | Tavan: ${hCm} cm`;
}

window.setStudioViewMode = function(mode) {
  if (mode === '2d') {
    setCanvasMode('plan');
    document.getElementById('btn-mode-2d')?.classList.add('active');
    document.getElementById('btn-mode-3d')?.classList.remove('active');
  } else {
    setCanvasMode('3d');
    document.getElementById('btn-mode-3d')?.classList.add('active');
    document.getElementById('btn-mode-2d')?.classList.remove('active');
  }
};

window.toggleFullscreenStudio = function() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen?.().catch(e => console.warn(e));
  } else {
    document.exitFullscreen?.().catch(e => console.warn(e));
  }
};

// 3D RULER TOGGLE & FIRST-TIME INFO BUBBLE
window.toggle3DRuler = function() {
  if (canvas3D && canvas3D.toggleRulers) {
    const isVisible = canvas3D.toggleRulers();
    const btn = document.getElementById('btn-toggle-ruler');
    const status = document.getElementById('ruler-toggle-status');
    if (status) {
      status.textContent = isVisible ? 'AÇIK' : 'KAPALI';
      status.style.color = isVisible ? '#10b981' : '#94a3b8';
    }
    if (btn) {
      if (isVisible) {
        btn.classList.add('active-tool-btn');
      } else {
        btn.classList.remove('active-tool-btn');
      }
    }
    showToast(`📏 3D Sahne Cetveli: ${isVisible ? 'AÇIK' : 'KAPALI'}`, 'info');
  }
};

window.dismissRulerBubble = function() {
  const bubble = document.getElementById('ruler-info-bubble');
  if (bubble) {
    bubble.style.transition = 'opacity 0.25s ease, transform 0.25s ease';
    bubble.style.opacity = '0';
    bubble.style.transform = 'translateY(-6px)';
    setTimeout(() => { bubble.style.display = 'none'; }, 260);
  }
  localStorage.setItem('has_seen_ruler_bubble', 'true');
};

function checkRulerBubbleInitialDisplay() {
  const seen = localStorage.getItem('has_seen_ruler_bubble');
  const bubble = document.getElementById('ruler-info-bubble');
  if (!seen && bubble) {
    bubble.style.display = 'block';
    setTimeout(() => {
      dismissRulerBubble();
    }, 8000);
  }
}

// SMART CORNER GUIDANCE CONTROLLERS (L-KITCHEN)
window.CURRENT_PENDING_CORNER_MOD = null;

function checkSmartCornerConflict(template, targetWall, targetX) {
  const layout = window.CURRENT_DESIGN?.layout_type || 'single_wall';
  const isLKitchen = layout.startsWith('l_');
  if (!isLKitchen) return false;

  const type = template.type || '';
  const name = (template.name || '').toLowerCase();
  const isCornerMod = (
    type === 'base_corner_l' ||
    type === 'wall_corner_l' ||
    template.category === 'corner' ||
    name.includes('köşe')
  );
  if (isCornerMod) return false;

  const isUpper = (template.category === 'wall');
  const cornerClearance = isUpper ? 650 : 900;

  if (targetX < cornerClearance) {
    const existingMods = window.CURRENT_DESIGN.modules || [];
    const hasCornerMod = existingMods.some(m => 
      (isUpper ? m.category === 'wall' : m.category !== 'wall') &&
      (m.type === 'base_corner_l' || m.type === 'wall_corner_l' || (m.name && m.name.toLowerCase().includes('köşe'))) &&
      ((m.x || 0) < 50)
    );

    if (!hasCornerMod) {
      window.CURRENT_PENDING_CORNER_MOD = { template, targetWall, targetX, isUpper };
      openSmartCornerModal(template, isUpper);
      return true; // Block placement until user resolves
    }
  }

  return false;
}

window.openSmartCornerModal = function(template, isUpper) {
  const modal = document.getElementById('smart-corner-modal');
  const grid = document.getElementById('smart-corner-options-grid');
  const desc = document.getElementById('smart-corner-desc');
  if (!modal || !grid) return;

  if (isUpper) {
    desc.innerHTML = `L-Mutfak dönüş köşesinde (0 - 65 cm) üst dolap kapaklarının birbirine çarpmasını engellemek için köşeye uygun bir modül seçiniz (Tüm modellerde standart tek orta raf mevcuttur):`;
    grid.innerHTML = `
      <div class="corner-option-item" onclick="applyCornerModuleChoice('wall_corner_straight', 650)">
        <div style="font-size:28px; margin-bottom:6px;">📐</div>
        <strong style="color:#f8fafc; font-size:0.85rem;">Düz Kör Köşe Üst Dolabı</strong>
        <span style="font-size:0.75rem; color:#94a3b8; display:block; margin-top:2px;">65x35 cm | Tek Raflı</span>
        <button class="corner-select-btn">✨ Bu Modülü Yerleştir</button>
      </div>
      <div class="corner-option-item" onclick="applyCornerModuleChoice('wall_corner_l', 650)">
        <div style="font-size:28px; margin-bottom:6px;">📐</div>
        <strong style="color:#f8fafc; font-size:0.85rem;">90° L-Köşe Üst Dolabı</strong>
        <span style="font-size:0.75rem; color:#94a3b8; display:block; margin-top:2px;">65x65 cm | 90° Çift Kapak & Tek Raflı</span>
        <button class="corner-select-btn">✨ Bu Modülü Yerleştir</button>
      </div>
      <div class="corner-option-item" onclick="applyCornerModuleChoice('wall_corner_v', 650)">
        <div style="font-size:28px; margin-bottom:6px;">📐</div>
        <strong style="color:#f8fafc; font-size:0.85rem;">V-Köşe (45° Diyagonal) Üst Dolap</strong>
        <span style="font-size:0.75rem; color:#94a3b8; display:block; margin-top:2px;">65x65 cm | 45° Pahlı Tek Kapak & Tek Raflı</span>
        <button class="corner-select-btn">✨ Bu Modülü Yerleştir</button>
      </div>
    `;
  } else {
    desc.innerHTML = `L-Mutfak dönüş köşesinde (0 - 90 cm) kapak ve çekmecelerin birbirine çarpmasını önlemek ve tezgah dönüşünü sağlamak için bir köşe modülü seçiniz (Tüm modellerde standart tek orta raf mevcuttur; özel sepet/mekanizma seçenekleri yönetici randevunuzda belirlenir):`;
    grid.innerHTML = `
      <div class="corner-option-item" onclick="applyCornerModuleChoice('base_corner_straight', 1000)">
        <div style="font-size:28px; margin-bottom:6px;">🗄️</div>
        <strong style="color:#f8fafc; font-size:0.85rem;">Düz Kör Köşe Alt Dolabı</strong>
        <span style="font-size:0.75rem; color:#94a3b8; display:block; margin-top:2px;">100x60 cm | Tek Kapaklı & Tek Raflı</span>
        <button class="corner-select-btn">✨ Bu Modülü Yerleştir</button>
      </div>
      <div class="corner-option-item" onclick="applyCornerModuleChoice('base_corner_l', 900)">
        <div style="font-size:28px; margin-bottom:6px;">📐</div>
        <strong style="color:#f8fafc; font-size:0.85rem;">90° L-Köşe Alt Dolabı</strong>
        <span style="font-size:0.75rem; color:#94a3b8; display:block; margin-top:2px;">90x90 cm | 90° Katlanır Kapak & Tek L-Raflı</span>
        <button class="corner-select-btn">✨ Bu Modülü Yerleştir</button>
      </div>
      <div class="corner-option-item" onclick="applyCornerModuleChoice('base_corner_v', 900)">
        <div style="font-size:28px; margin-bottom:6px;">📐</div>
        <strong style="color:#f8fafc; font-size:0.85rem;">V-Köşe (45° Diyagonal) Alt Dolap</strong>
        <span style="font-size:0.75rem; color:#94a3b8; display:block; margin-top:2px;">90x90 cm | 45° Pahlı Tek Kapak & Tek Raflı</span>
        <button class="corner-select-btn">✨ Bu Modülü Yerleştir</button>
      </div>
    `;
  }

  modal.style.display = 'flex';
};

window.closeSmartCornerModal = function() {
  const modal = document.getElementById('smart-corner-modal');
  if (modal) modal.style.display = 'none';
};

window.applyCornerModuleChoice = function(cornerType, width) {
  const pending = window.CURRENT_PENDING_CORNER_MOD;
  closeSmartCornerModal();
  if (!pending) return;

  let defW = width;
  let defD = (cornerType.includes('straight') ? (pending.isUpper ? 350 : 600) : width);

  const cornerTemplate = getModuleTemplate(cornerType) || {
    type: cornerType,
    name: cornerType.includes('v') 
      ? (pending.isUpper ? 'V-Köşe (45° Diyagonal) Üst Dolap' : 'V-Köşe (45° Diyagonal) Alt Dolap')
      : (cornerType.includes('straight') 
          ? (pending.isUpper ? 'Düz Kör Köşe Üst Dolap' : 'Düz Kör Köşe Alt Dolap')
          : (pending.isUpper ? '90° L-Köşe Üst Dolabı' : '90° L-Köşe Alt Dolabı')),
    category: pending.isUpper ? 'wall' : 'base',
    w: defW,
    d: defD,
    h: 720,
    shelves: 1
  };
  cornerTemplate.selected_w = defW;
  cornerTemplate.shelves = 1;

  // 1. Place the corner module at x = 0
  addModuleToDesign(cornerTemplate, 0, pending.targetWall);

  // 2. Place user's intended module right after the corner module
  const nextPos = defW;
  setTimeout(() => {
    addModuleToDesign(pending.template, nextPos, pending.targetWall);
    showToast(`✨ ${cornerTemplate.name} ve ardından ${pending.template.name} yerleştirildi!`, 'success');
  }, 150);

  window.CURRENT_PENDING_CORNER_MOD = null;
};

window.applyCornerShiftChoice = function() {
  const pending = window.CURRENT_PENDING_CORNER_MOD;
  closeSmartCornerModal();
  if (!pending) return;

  const shiftPos = pending.isUpper ? 650 : 900;
  addModuleToDesign(pending.template, shiftPos, pending.targetWall);
  showToast(`➡️ Modül köşe payı bırakılarak ${shiftPos / 10} cm konumuna yerleştirildi.`, 'info');
  window.CURRENT_PENDING_CORNER_MOD = null;
};

// CATEGORY SELECTION
function selectCategory(catKey) {
  window.CURRENT_CATEGORY = catKey;
  window.CURRENT_DESIGN.category = catKey;
  window.CURRENT_DESIGN.modules = [];

  // Populate default ADeko-style kitchen layout
  if (catKey === 'kitchen') {
    window.CURRENT_DESIGN.modules = [
      { id: 'MOD-01', type: 'tall_fridge', name: 'No-Frost Buzdolabı Kabini', category: 'tall', w: 700, d: 600, h: 2100, x: 0, drawers: 0, hinges: 2 },
      { id: 'MOD-02', type: 'base_drawer_3', name: '3 Çekmeceli Alt Dolap', category: 'base', w: 600, d: 600, h: 720, x: 700, drawers: 3, hinges: 0 },
      { id: 'MOD-03', type: 'base_sink', name: 'Eviye Alt Dolabı (2 Kapak)', category: 'base', w: 900, d: 600, h: 720, x: 1300, drawers: 0, hinges: 4 },
      { id: 'MOD-04', type: 'base_oven', name: 'Ankastre Fırın & Ocak Modülü', category: 'base', w: 600, d: 600, h: 720, x: 2200, drawers: 1, hinges: 0 },
      { id: 'MOD-05', type: 'base_standard', name: 'Standart Tek Kapak Alt Dolap', category: 'base', w: 500, d: 600, h: 720, x: 2800, drawers: 0, hinges: 2 },
      { id: 'MOD-06', type: 'wall_glass', name: 'Camlı Yatay Kalkar Dolap', category: 'wall', w: 900, d: 350, h: 720, x: 1300, drawers: 0, hinges: 2 },
      { id: 'MOD-07', type: 'wall_double', name: 'Çift Kapaklı Üst Dolap', category: 'wall', w: 800, d: 350, h: 720, x: 2200, drawers: 0, hinges: 4 }
    ];
  } else if (catKey === 'portmanto') {
    window.CURRENT_DESIGN.modules = [
      { id: 'PRT-01', type: 'hall_shoe_bench', name: 'Minderli Ayakkabılık Bench', category: 'base', w: 1000, d: 450, h: 500, x: 0, drawers: 2, hinges: 2 },
      { id: 'PRT-02', type: 'hall_mirror_cabinet', name: 'Boy Aynalı Gizli Dolap', category: 'tall', w: 600, d: 450, h: 2200, x: 1000, drawers: 0, hinges: 4 }
    ];
  }

  loadCategoryModules(catKey);
  navigateTo('wizard');
}

window.CURRENT_CATALOG_GROUPS = null;

function getModuleTemplate(type) {
  if (window.CURRENT_CATALOG_GROUPS) {
    for (let grp of window.CURRENT_CATALOG_GROUPS) {
      const found = grp.items.find(it => it.type === type);
      if (found) return found;
    }
  }
  const defaultGroups = ADEKO_MODULE_GROUPS[window.CURRENT_CATEGORY] || ADEKO_MODULE_GROUPS.kitchen;
  for (let grp of defaultGroups) {
    const found = grp.items.find(it => it.type === type);
    if (found) return found;
  }
  return null;
}

window.selectModuleWidth = function(type, w) {
  const m = getModuleTemplate(type);
  if (!m) return;
  m.selected_w = w;
  m.w = w;

  // If a module of this type is currently selected in the 3D scene, resize it directly!
  if (window.SELECTED_MODULE && window.SELECTED_MODULE.type === type) {
    const wall = window.SELECTED_MODULE.wall || 'back';
    const cap = getWallCapacity(wall);
    const oldW = window.SELECTED_MODULE.w || 600;
    const availableForThis = (window.SELECTED_MODULE.category === 'wall' ? cap.wallRemaining : cap.baseRemaining) + oldW;

    if (w <= availableForThis) {
      window.SELECTED_MODULE.w = w;
      renderActiveCanvas();
      updatePlacedModulesUI();
      updateCatalogDimensionPills();
      showToast(`📏 Modül Genişliği ${Math.round(w / 10)} cm olarak güncellendi.`);
      return;
    } else {
      showToast(`⚠️ Seçilen genişlik (${Math.round(w / 10)} cm) duvara sığmıyor!`, 'error');
    }
  }

  // Update pills UI
  updateCatalogDimensionPills();
};

window.handleCustomWidthChange = function(type, valCm) {
  const m = getModuleTemplate(type);
  if (!m) return;
  const wMm = Math.round(parseFloat(valCm) * 10);
  const cap = getWallCapacity(window.CURRENT_ACTIVE_WALL || 'back');
  const remSpace = m.category === 'wall' ? cap.wallRemaining : cap.baseRemaining;

  if (wMm > remSpace) {
    showToast(`⚠️ Girilen ölçü (${valCm} cm) kalan boşluktan (${Math.floor(remSpace / 10)} cm) büyük olamaz!`, 'error');
    const input = document.getElementById(`custom-w-${type}`);
    if (input) input.value = Math.floor(remSpace / 10);
    return;
  }

  if (wMm >= 150) {
    m.selected_w = wMm;
    m.w = wMm;
    updateCatalogDimensionPills();
  }
};

// ADeko Accordion Module Palette Generator with Smart Dimension Pills (Seçenek 1)
async function loadCategoryModules(catKey) {
  const container = document.getElementById('studio-module-catalog');
  if (!container) return;

  let groups = null;
  try {
    const res = await fetch(`/api/catalog/modules?category=${catKey}`);
    const data = await res.json();
    if (data.groups && data.groups.length > 0) {
      groups = data.groups;
    }
  } catch (err) {
    console.warn("Could not fetch catalog modules, using defaults:", err);
  }

  if (!groups) {
    groups = ADEKO_MODULE_GROUPS[catKey] || ADEKO_MODULE_GROUPS.kitchen;
  }

  // Ensure default width options for all modules
  groups.forEach(grp => {
    grp.items.forEach(m => {
      if (!m.allowed_widths) {
        if (m.type === 'base_standard' || m.type === 'wall_single') m.allowed_widths = [300, 400, 450, 500, 600];
        else if (m.type === 'base_double' || m.type === 'wall_double') m.allowed_widths = [600, 800, 900, 1000];
        else if (m.type === 'base_drawer_3') m.allowed_widths = [400, 450, 600, 800, 900];
        else if (m.type === 'base_sink' || m.type === 'wall_glass') m.allowed_widths = [600, 800, 900, 1000];
        else if (m.type === 'wall_hood' || m.type === 'wall_hood_chimney') m.allowed_widths = [600, 900];
        else if (m.type === 'tall_pantry_2d') m.allowed_widths = [450, 600];
        else m.allowed_widths = [m.w || 600];
      }
      if (m.allow_custom_width === undefined) {
        m.allow_custom_width = !['base_drawer_3', 'base_oven', 'base_dishwasher', 'wall_hood', 'wall_hood_chimney'].includes(m.type);
      }
      m.selected_w = m.selected_w || m.w || m.allowed_widths[0];
      m.w = m.selected_w;
    });
  });

  window.CURRENT_CATALOG_GROUPS = groups;
  renderCatalogModulesDOM(groups);
  updateCatalogDimensionPills();
}

function renderCatalogModulesDOM(groups) {
  const container = document.getElementById('studio-module-catalog');
  if (!container) return;

  container.innerHTML = '';
  const cap = getWallCapacity(window.CURRENT_ACTIVE_WALL || 'back');

  groups.forEach((grp) => {
    const accGroup = document.createElement('div');
    accGroup.className = `adeko-accordion-group ${grp.open ? 'open' : ''}`;
    accGroup.id = `acc-group-${grp.groupKey}`;

    accGroup.innerHTML = `
      <button class="adeko-accordion-header" onclick="toggleAccordion('${grp.groupKey}')">
        <span class="acc-title">
          <span>${grp.icon}</span>
          <span>${grp.title}</span>
        </span>
        <span style="display:flex; align-items:center; gap:0.4rem;">
          <span class="acc-badge">${grp.items.length}</span>
          <span class="acc-arrow">▼</span>
        </span>
      </button>
      <div class="adeko-accordion-content" id="acc-content-${grp.groupKey}"></div>
    `;

    container.appendChild(accGroup);

    const contentDiv = accGroup.querySelector(`#acc-content-${grp.groupKey}`);
    grp.items.forEach(m => {
      const item = document.createElement('div');
      item.className = 'module-catalog-item';
      item.id = `catalog-card-${m.type}`;
      item.draggable = true;
      item.title = "Tuvale sürükleyip bırakın veya + Ekle butonuna basın";

      item.addEventListener('dragstart', (e) => {
        item.classList.add('dragging');
        window.CURRENT_DRAGGED_MODULE = m;
        e.dataTransfer.setData('application/json', JSON.stringify(m));
        e.dataTransfer.effectAllowed = 'copy';
      });

      item.addEventListener('dragend', () => {
        item.classList.remove('dragging');
        if (canvas3D) canvas3D.clearGhostModule();
        document.getElementById('canvas-drop-wrapper')?.classList.remove('drag-over');
      });

      const remSpace = m.category === 'wall' ? cap.wallRemaining : cap.baseRemaining;
      item.innerHTML = renderModuleCardInner(m, remSpace);

      contentDiv.appendChild(item);
    });
  });
}

function renderModuleCardInner(m, remSpace) {
  const remCm = Math.floor(remSpace / 10);
  const widths = m.allowed_widths || [m.w || 600];
  const curW = m.selected_w || m.w || widths[0];

  let pillsHtml = '';
  widths.forEach(w => {
    const wCm = Math.round(w / 10);
    const fits = w <= remSpace;
    const isSelected = w === curW;
    pillsHtml += `
      <button type="button" 
        class="dim-pill ${isSelected ? 'active-pill' : ''} ${fits ? '' : 'disabled-pill'}" 
        data-mod-type="${m.type}" 
        data-w="${w}"
        ${fits ? '' : 'disabled'}
        title="${fits ? wCm + ' cm seç' : 'Duvarda ' + remCm + ' cm yer kaldı, sığmaz!'}"
        onclick="event.stopPropagation(); selectModuleWidth('${m.type}', ${w})">
        ${wCm} cm
      </button>
    `;
  });

  let customHtml = '';
  if (m.allow_custom_width) {
    const fitsAny = remSpace >= 150;
    customHtml = `
      <div class="custom-width-row" onclick="event.stopPropagation()">
        <span>✏️ Özel Ebat:</span>
        <div style="display:flex; align-items:center; gap:2px;">
          <input type="number" 
            class="custom-width-input" 
            id="custom-w-${m.type}" 
            min="20" 
            max="${remCm}" 
            value="${Math.round(curW / 10)}" 
            ${fitsAny ? '' : 'disabled'}
            onchange="handleCustomWidthChange('${m.type}', this.value)"
            onkeydown="if(event.key==='Enter'){handleCustomWidthChange('${m.type}', this.value); addModuleToDesign(getModuleTemplate('${m.type}'));}">
          <span style="font-size:0.75rem; color:#94a3b8;">cm</span>
        </div>
      </div>
    `;
  }

  return `
    <div style="display:flex; align-items:center; justify-content:space-between; width:100%;">
      <div style="display:flex; align-items:center; gap:0.5rem;">
        <span class="drag-grip-icon" title="Tutup Tuvale Sürükleyin">⋮⋮</span>
        <span style="font-size:1.3rem;">${m.icon}</span>
        <div class="module-info">
          <h4 style="font-size:0.85rem; color:#fff; margin:0;">${m.name}</h4>
          <span style="font-size:0.75rem; color:#94a3b8;">D: ${m.d}mm | Y: ${m.h}mm</span>
        </div>
      </div>
      <button class="btn btn-outline btn-sm" style="padding:0.25rem 0.6rem; font-size:0.75rem;" onclick="event.stopPropagation(); addModuleToDesign(getModuleTemplate('${m.type}'))">
        ➕ Ekle
      </button>
    </div>

    <div class="module-pills-wrapper" onclick="event.stopPropagation()">
      <div class="pills-header">
        <span>Genişlik:</span>
        <span class="rem-space ${remSpace <= 0 ? 'full' : ''}" id="rem-badge-${m.type}">Kalan: ${remCm} cm</span>
      </div>
      <div class="dimension-pills-row">
        ${pillsHtml}
      </div>
      ${customHtml}
    </div>
  `;
}

function updateCatalogDimensionPills() {
  const cap = getWallCapacity(window.CURRENT_ACTIVE_WALL || 'back');

  // Update wall selector badges
  const capBack = getWallCapacity('back');
  const capLeft = getWallCapacity('left');
  const bBadge = document.getElementById('wall-cap-back');
  const lBadge = document.getElementById('wall-cap-left');
  if (bBadge) bBadge.textContent = `${Math.floor(capBack.baseRemaining / 10)} cm boş`;
  if (lBadge) lBadge.textContent = `${Math.floor(capLeft.baseRemaining / 10)} cm boş`;

  if (!window.CURRENT_CATALOG_GROUPS) return;

  window.CURRENT_CATALOG_GROUPS.forEach(grp => {
    grp.items.forEach(m => {
      const remSpace = m.category === 'wall' ? cap.wallRemaining : cap.baseRemaining;
      const remCm = Math.floor(remSpace / 10);

      // Update remaining badge
      const remElem = document.getElementById(`rem-badge-${m.type}`);
      if (remElem) {
        remElem.textContent = `Kalan: ${remCm} cm`;
        remElem.className = `rem-space ${remSpace <= 0 ? 'full' : ''}`;
      }

      // Update pill buttons
      const card = document.getElementById(`catalog-card-${m.type}`);
      if (card) {
        const curW = m.selected_w || m.w || (m.allowed_widths ? m.allowed_widths[0] : 600);
        const pills = card.querySelectorAll('.dim-pill');
        pills.forEach(p => {
          const w = parseInt(p.getAttribute('data-w'));
          const fits = w <= remSpace;
          const isSelected = w === curW;

          p.className = `dim-pill ${isSelected ? 'active-pill' : ''} ${fits ? '' : 'disabled-pill'}`;
          p.title = fits ? `${Math.round(w / 10)} cm seç` : `Duvarda ${remCm} cm yer kaldı, sığmaz!`;
          if (fits) {
            p.removeAttribute('disabled');
          } else {
            p.setAttribute('disabled', 'true');
          }
        });

        // Update custom input max
        const custInp = card.querySelector('.custom-width-input');
        if (custInp) {
          custInp.max = remCm;
          if (remSpace < 150) {
            custInp.setAttribute('disabled', 'true');
          } else {
            custInp.removeAttribute('disabled');
          }
        }
      }
    });
  });
}

window.toggleAccordion = function(groupKey) {
  const grp = document.getElementById(`acc-group-${groupKey}`);
  if (grp) grp.classList.toggle('open');
};

window.filterCatalogModules = function(query) {
  const q = query.trim().toLowerCase();
  document.querySelectorAll('.module-catalog-item').forEach(el => {
    const text = el.textContent.toLowerCase();
    const match = text.includes(q);
    el.style.display = match ? 'flex' : 'none';
  });

  if (q.length > 0) {
    document.querySelectorAll('.adeko-accordion-group').forEach(grp => grp.classList.add('open'));
  }
};

// DRAG AND DROP SETUP WITH LIVE 3D GHOST SHADOW
function setupDragAndDrop() {
  const dropWrapper = document.getElementById('canvas-drop-wrapper');
  if (!dropWrapper) return;

  dropWrapper.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    dropWrapper.classList.add('drag-over');

    // Show live 3D Ghost Shadow and guideline in canvas3D
    if (window.CURRENT_DRAGGED_MODULE && canvas3D && window.activeCanvasMode === '3d') {
      canvas3D.setGhostModule(window.CURRENT_DRAGGED_MODULE, e.clientX, e.clientY);
    }
  });

  dropWrapper.addEventListener('dragleave', (e) => {
    if (!dropWrapper.contains(e.relatedTarget)) {
      dropWrapper.classList.remove('drag-over');
      if (canvas3D) canvas3D.clearGhostModule();
    }
  });

  dropWrapper.addEventListener('drop', (e) => {
    e.preventDefault();
    dropWrapper.classList.remove('drag-over');

    if (window.CURRENT_DESIGN_LOCKED) {
      showToast("🔒 Tasarımınız kilitlidir. Yeni modül eklenemez.", "error");
      if (canvas3D) canvas3D.clearGhostModule();
      window.CURRENT_DRAGGED_MODULE = null;
      return;
    }

    let modTemplate = window.CURRENT_DRAGGED_MODULE;
    if (!modTemplate) {
      try {
        const raw = e.dataTransfer.getData('application/json');
        if (raw) modTemplate = JSON.parse(raw);
      } catch (err) {}
    }

    if (modTemplate) {
      if (window.activeCanvasMode === '3d' && canvas3D) {
        const ghostInfo = canvas3D.getGhostSnapPosition();
        if (!ghostInfo.isValid) {
          showToast(`⚠️ Duvar sınırı aşıldı! Modül ${ghostInfo.wall === 'left' ? 'Sol Duvara' : 'Arka Duvara'} sığmıyor.`, 'error');
        } else {
          addModuleToDesign(modTemplate, ghostInfo.pos, ghostInfo.wall);
        }
      } else if (canvas2D) {
        const targetX = canvas2D.clientToWallPosition(e.clientX);
        addModuleToDesign(modTemplate, targetX);
      }
    }

    if (canvas3D) canvas3D.clearGhostModule();
    window.CURRENT_DRAGGED_MODULE = null;
  });
}

// WALL CAPACITY & BOUNDARY CALCULATOR
function getWallCapacity(wall = 'back') {
  const rw = window.CURRENT_DESIGN.room_width || 3600;
  const rd = window.CURRENT_DESIGN.room_depth || 2600;
  const wallLength = (wall === 'left' || wall === 'right') ? rd : rw;

  const modsOnWall = (window.CURRENT_DESIGN.modules || []).filter(m => (m.wall || 'back') === wall);
  const baseMods = modsOnWall.filter(m => m.category === 'base' || m.category === 'tall');
  const wallMods = modsOnWall.filter(m => m.category === 'wall');

  const baseTotal = baseMods.reduce((sum, m) => sum + (m.w || 600), 0);
  const wallTotal = wallMods.reduce((sum, m) => sum + (m.w || 600), 0);

  const baseMaxX = baseMods.reduce((max, m) => Math.max(max, (m.x || 0) + (m.w || 600)), 0);
  const wallMaxX = wallMods.reduce((max, m) => Math.max(max, (m.x || 0) + (m.w || 600)), 0);

  return {
    wall,
    wallLength,
    baseTotal,
    wallTotal,
    baseMaxX,
    wallMaxX,
    baseRemaining: Math.max(0, wallLength - baseMaxX),
    wallRemaining: Math.max(0, wallLength - wallMaxX)
  };
}

// ADD MODULE WITH STRICT WALL BOUNDARY ENFORCEMENT & MULTI-WALL WRAP
function addModuleToDesign(template, customPos = null, targetWall = null) {
  if (!template) return false;
  if (window.CURRENT_DESIGN_LOCKED) {
    showToast("🔒 Tasarımınız kilitlenmiştir. Yeni modül eklemek veya revize yapmak için fabrika yöneticiniz ile görüşünüz.", "error");
    return false;
  }
  saveDesignStateForUndo();
  const modWidth = template.selected_w || template.w || 600;
  const wall = targetWall || window.CURRENT_ACTIVE_WALL || 'back';
  const cap = getWallCapacity(wall);
  const isUpper = template.category === 'wall';
  const remaining = isUpper ? cap.wallRemaining : cap.baseRemaining;
  const currentEnd = isUpper ? cap.wallMaxX : cap.baseMaxX;

  let targetX = customPos;
  if (targetX === null || targetX === undefined) {
    targetX = currentEnd;
  }

  // L-KITCHEN SMART CORNER CONFLICT CHECK
  if (checkSmartCornerConflict(template, wall, targetX)) {
    return false;
  }

  // STRICT WALL BOUNDARY CHECK: DO NOT OVERFLOW WALL END!
  if (targetX + modWidth > cap.wallLength) {
    // Check if the other wall (e.g. Left Wall in L-Kitchen) has room
    const otherWall = (wall === 'back') ? 'left' : 'back';
    const otherCap = getWallCapacity(otherWall);
    const otherRemaining = isUpper ? otherCap.wallRemaining : otherCap.baseRemaining;

    if (otherRemaining >= modWidth) {
      const wallNameCur = (wall === 'back') ? 'Arka Duvar' : 'Sol Duvar';
      const wallNameOth = (otherWall === 'back') ? 'Arka Duvara' : 'Sol Duvara';
      const switchOk = confirm(`⚠️ ${wallNameCur.toUpperCase()} SINIRI DOLDU!\n${wallNameCur}da sadece ${remaining}mm boş yer kaldı (${modWidth}mm modül sığmıyor).\n\nModülü ${wallNameOth} yerleştirmek ister misiniz? (${wallNameOth}da ${otherRemaining}mm boşluk mevcut)`);
      if (switchOk) {
        setActiveWall(otherWall);
        return addModuleToDesign(template, null, otherWall);
      }
    }

    showToast(`⚠️ DUVAR KAPASİTESİ DOLDU: ${wall === 'left' ? 'Sol Duvar' : 'Arka Duvar'} (${cap.wallLength}mm) doldu! Kalan boşluk (${remaining}mm) yetersiz.`, 'error');
    if (canvas3D && canvas3D.flashBoundaryWarning) {
      canvas3D.flashBoundaryWarning(wall);
    }
    return false;
  }

  // Strictly clamp inside wall boundaries
  targetX = Math.max(0, Math.min(cap.wallLength - modWidth, targetX));

  const currentMods = window.CURRENT_DESIGN.modules;
  const count = currentMods.length + 1;
  const newId = `MOD-${count < 10 ? '0' + count : count}`;

  const newMod = {
    id: newId,
    type: template.type,
    name: template.name,
    category: template.category,
    w: modWidth,
    d: template.d || 600,
    h: template.h || 720,
    wall: wall,
    x: targetX,
    drawers: template.drawers || 0,
    hinges: template.hinges || 0,
    shelves: template.category === 'wall' ? 2 : 1,
    isOpenShelf: !!(template.isOpenShelf || template.type?.includes('open_shelf')),
    shelfCount: template.shelfCount || (template.category === 'wall' ? 2 : 1)
  };

  currentMods.push(newMod);
  showToast(`✅ ${template.name} (${Math.round(modWidth / 10)} cm | ${wall === 'left' ? 'Sol' : 'Arka'} Duvar) eklendi!`);
  updatePlacedModulesUI();
  updateCatalogDimensionPills();
  renderActiveCanvas();
  return true;
}

function removeModule(modId) {
  saveDesignStateForUndo();
  window.CURRENT_DESIGN.modules = window.CURRENT_DESIGN.modules.filter(m => m.id !== modId);
  hideSelectedModuleGizmo();
  updatePlacedModulesUI();
  updateCatalogDimensionPills();
  renderActiveCanvas();
}

function shiftModule(modId, delta) {
  saveDesignStateForUndo();
  const m = window.CURRENT_DESIGN.modules.find(x => x.id === modId);
  if (m) {
    const wall = m.wall || 'back';
    const rw = window.CURRENT_DESIGN.room_width || 3600;
    const rd = window.CURRENT_DESIGN.room_depth || 2600;
    const wallLen = (wall === 'left' || wall === 'right') ? rd : rw;
    const newX = (m.x || 0) + delta;
    m.x = Math.max(0, Math.min(wallLen - (m.w || 600), newX));
    renderActiveCanvas();
    updatePlacedModulesUI();
    showSelectedModuleGizmo(m);
  }
}

function setModuleCustomX(modId, val) {
  const m = window.CURRENT_DESIGN.modules.find(x => x.id === modId);
  if (m) {
    const wall = m.wall || 'back';
    const rw = window.CURRENT_DESIGN.room_width || 3600;
    const rd = window.CURRENT_DESIGN.room_depth || 2600;
    const wallLen = (wall === 'left' || wall === 'right') ? rd : rw;
    let num = parseInt(val) || 0;
    m.x = Math.max(0, Math.min(wallLen - (m.w || 600), num));
    renderActiveCanvas();
    updatePlacedModulesUI();
    showSelectedModuleGizmo(m);
  }
}

function toggleModuleWall(modId) {
  const m = window.CURRENT_DESIGN.modules.find(x => x.id === modId);
  if (m) {
    const currentWall = m.wall || 'back';
    const targetWall = (currentWall === 'back') ? 'left' : 'back';
    const cap = getWallCapacity(targetWall);
    const isUpper = m.category === 'wall';
    const currentEnd = isUpper ? cap.wallMaxX : cap.baseMaxX;

    if (currentEnd + m.w > cap.wallLength) {
      showToast(`⚠️ ${targetWall === 'left' ? 'Sol Duvara' : 'Arka Duvara'} sığmıyor! Kalan boşluk: ${Math.max(0, cap.wallLength - currentEnd)}mm`, 'error');
      return;
    }

    m.wall = targetWall;
    m.x = currentEnd;
    showToast(`🔄 ${m.name} ${targetWall === 'left' ? 'Sol Duvara' : 'Arka Duvara'} taşındı!`);
    renderActiveCanvas();
    updatePlacedModulesUI();
    showSelectedModuleGizmo(m);
  }
}

// IN-SCENE FLOATING GIZMO CONTROLS
window.showSelectedModuleGizmo = function(mod) {
  const bar = document.getElementById('selected-module-toolbar');
  const title = document.getElementById('fmt-title');
  const details = document.getElementById('fmt-details');
  const shelfGroup = document.getElementById('fmt-shelf-group');
  if (!bar || !title || !details || !mod) return;

  const wallLabel = (mod.wall === 'left') ? 'Sol Duvar' : 'Arka Duvar';
  title.textContent = `${mod.id}: ${mod.name}`;
  details.textContent = `${mod.w}x${mod.d}x${mod.h} mm | ${wallLabel} (Konum: ${mod.x} mm)`;

  if (shelfGroup) {
    const isOpen = !!(mod.isOpenShelf || mod.type?.includes('open_shelf'));
    shelfGroup.style.display = isOpen ? 'flex' : 'none';
  }

  bar.style.display = 'flex';
};

window.setSelectedModuleShelves = function(count) {
  if (window.CURRENT_DESIGN_LOCKED) {
    showToast("🔒 Tasarımınız kilitlidir. Değişiklik yapılamaz.", "error");
    return;
  }
  const selId = canvas3D?.selectedModuleId || canvas2D?.selectedModuleId;
  const mod = window.CURRENT_DESIGN.modules.find(m => m.id === selId);
  if (mod) {
    mod.shelfCount = parseInt(count) || 1;
    renderActiveCanvas();
    updatePlacedModulesUI();
    showToast(`📚 ${mod.name} için raf sayısı ${mod.shelfCount} olarak ayarlandı.`, 'success');
  }
};

window.updateModuleShelfCount = function(modId, count) {
  if (window.CURRENT_DESIGN_LOCKED) {
    showToast("🔒 Tasarımınız kilitlidir. Değişiklik yapılamaz.", "error");
    return;
  }
  const mod = window.CURRENT_DESIGN.modules.find(m => m.id === modId);
  if (mod) {
    mod.shelfCount = parseInt(count) || 1;
    renderActiveCanvas();
    updatePlacedModulesUI();
    showToast(`📚 ${mod.name} için raf sayısı ${mod.shelfCount} olarak güncellendi.`, 'success');
  }
};

window.toggleBacksplashTone = function() {
  if (!canvas3D) return;
  const newTone = (canvas3D.backsplashTone === 'dark') ? 'light' : 'dark';
  canvas3D.setBacksplashTone(newTone);
  const statusElem = document.getElementById('backsplash-tone-status');
  if (statusElem) {
    statusElem.textContent = (newTone === 'dark') ? 'KOYU TON' : 'AÇIK TON';
    statusElem.style.color = (newTone === 'dark') ? '#f59e0b' : '#38bdf8';
  }
  showToast(`🎨 Tezgah Arası: ${newTone === 'dark' ? 'Koyu Füme/Antrasit Taş' : 'Açık Porselen Seramik'} tonuna ayarlandı.`, 'info');
};

// FLYOUT MODULE CATALOG & RAIL CONTROLLER (PLANNER 5D / HOMESTYLER STYLE)
window.CURRENT_FLYOUT_KEY = 'base';

window.toggleCatalogFlyout = function(catKey) {
  const drawer = document.getElementById('studio-flyout-drawer');
  if (!drawer) return;

  if (catKey === 'materials') {
    toggleRightDrawer(true);
    return;
  }

  // If already open and same category clicked, close it
  if (drawer.classList.contains('open') && window.CURRENT_FLYOUT_KEY === catKey) {
    closeCatalogFlyout();
    return;
  }

  window.CURRENT_FLYOUT_KEY = catKey;
  drawer.classList.add('open');

  // Update Rail Icon Active State
  document.querySelectorAll('.studio-slim-rail .rail-btn').forEach(b => b.classList.remove('active'));
  const activeBtn = document.getElementById(`rail-btn-${catKey}`);
  if (activeBtn) activeBtn.classList.add('active');

  // Update Header Title & Icon
  const titles = {
    search: { title: 'Tüm Modüller & Cihazlar', icon: '🔍' },
    base: { title: 'Alt Dolap Modülleri', icon: '🗄️' },
    wall: { title: 'Üst Dolap Modülleri', icon: '📦' },
    tall: { title: 'Boy Dolap & Kiler', icon: '🧊' },
    appliance: { title: 'Ankastre & Pişirme', icon: '♨️' }
  };
  const info = titles[catKey] || { title: 'Modül Kataloğu', icon: '📁' };
  const titleElem = document.getElementById('flyout-title');
  const iconElem = document.getElementById('flyout-icon');
  if (titleElem) titleElem.textContent = info.title;
  if (iconElem) iconElem.textContent = info.icon;

  if (catKey === 'search') {
    const input = document.getElementById('flyout-search-input');
    if (input) {
      input.value = '';
      input.focus();
    }
    renderFlyoutFiltered(null);
  } else {
    renderFlyoutCategory(catKey);
  }

  setTimeout(() => {
    if (canvas3D) canvas3D.onWindowResize();
    if (canvas2D) renderActiveCanvas();
  }, 260);
};

window.closeCatalogFlyout = function() {
  const drawer = document.getElementById('studio-flyout-drawer');
  if (!drawer) return;
  drawer.classList.remove('open');
  document.querySelectorAll('.studio-slim-rail .rail-btn').forEach(b => b.classList.remove('active'));

  setTimeout(() => {
    if (canvas3D) canvas3D.onWindowResize();
    if (canvas2D) renderActiveCanvas();
  }, 260);
};

window.filterFlyoutModules = function(keyword) {
  if (!keyword || !keyword.trim()) {
    if (window.CURRENT_FLYOUT_KEY && window.CURRENT_FLYOUT_KEY !== 'search') {
      renderFlyoutCategory(window.CURRENT_FLYOUT_KEY);
    } else {
      renderFlyoutFiltered(null);
    }
    return;
  }
  renderFlyoutFiltered(keyword.trim().toLowerCase());
};

function renderFlyoutCategory(catKey) {
  const allGroups = window.CURRENT_CATALOG_GROUPS || ADEKO_MODULE_GROUPS[window.CURRENT_CATEGORY] || ADEKO_MODULE_GROUPS.kitchen;
  const filtered = allGroups.filter(g => g.groupKey === catKey || (catKey === 'appliance' && g.groupKey === 'appliance'));
  const mapped = (filtered.length > 0 ? filtered : allGroups).map(g => ({ ...g, open: true }));
  renderCatalogModulesDOM(mapped);
}

function renderFlyoutFiltered(keyword) {
  const allGroups = window.CURRENT_CATALOG_GROUPS || ADEKO_MODULE_GROUPS[window.CURRENT_CATEGORY] || ADEKO_MODULE_GROUPS.kitchen;
  if (!keyword) {
    const mapped = allGroups.map(g => ({ ...g, open: true }));
    renderCatalogModulesDOM(mapped);
    return;
  }
  const filtered = [];
  allGroups.forEach(grp => {
    const matchingItems = grp.items.filter(m =>
      (m.name && m.name.toLowerCase().includes(keyword)) ||
      (m.desc && m.desc.toLowerCase().includes(keyword)) ||
      (m.type && m.type.toLowerCase().includes(keyword))
    );
    if (matchingItems.length > 0) {
      filtered.push({ ...grp, open: true, items: matchingItems });
    }
  });
  renderCatalogModulesDOM(filtered);
}

// STUDIO UNDO / REDO HISTORY CONTROLLER
window.STUDIO_UNDO_STACK = [];
window.saveDesignStateForUndo = function() {
  if (!window.CURRENT_DESIGN || !window.CURRENT_DESIGN.modules) return;
  window.STUDIO_UNDO_STACK.push(JSON.parse(JSON.stringify(window.CURRENT_DESIGN.modules)));
  if (window.STUDIO_UNDO_STACK.length > 25) window.STUDIO_UNDO_STACK.shift();
};

window.undoLastAction = function() {
  if (!window.STUDIO_UNDO_STACK || window.STUDIO_UNDO_STACK.length === 0) {
    showToast("ℹ️ Geri alınacak önceki işlem bulunamadı.", "info");
    return;
  }
  const prevModules = window.STUDIO_UNDO_STACK.pop();
  window.CURRENT_DESIGN.modules = prevModules;
  hideSelectedModuleGizmo();
  updatePlacedModulesUI();
  updateCatalogDimensionPills();
  renderActiveCanvas();
  showToast("↩️ Son işlem geri alındı.");
};

window.toggleLeftSidebar = function(forceState) {
  toggleCatalogFlyout(window.CURRENT_FLYOUT_KEY || 'base');
};

window.toggleRightDrawer = function(forceOpen) {
  const drawer = document.getElementById('studio-right-drawer');
  if (!drawer) return;
  const isOpen = typeof forceOpen === 'boolean' ? forceOpen : !drawer.classList.contains('open');
  if (isOpen) {
    drawer.classList.add('open');
  } else {
    drawer.classList.remove('open');
  }
};

window.hideSelectedModuleGizmo = function() {
  const bar = document.getElementById('selected-module-toolbar');
  if (bar) bar.style.display = 'none';
};

window.shiftSelectedModule = function(delta) {
  const selId = canvas3D?.selectedModuleId || canvas2D?.selectedModuleId;
  if (selId) {
    shiftModule(selId, delta);
  }
};

window.toggleSelectedModuleWall = function() {
  if (window.CURRENT_DESIGN_LOCKED) {
    showToast("🔒 Tasarımınız kilitlidir. Değişiklik yapılamaz.", "error");
    return;
  }
  const selId = canvas3D?.selectedModuleId || canvas2D?.selectedModuleId;
  if (selId) {
    toggleModuleWall(selId);
  }
};

window.deleteSelectedModule = function() {
  if (window.CURRENT_DESIGN_LOCKED) {
    showToast("🔒 Tasarımınız kilitlidir. Modül silinemez.", "error");
    return;
  }
  const selId = canvas3D?.selectedModuleId || canvas2D?.selectedModuleId;
  if (selId) {
    removeModule(selId);
  }
};

window.deselectModule = function() {
  if (canvas3D) canvas3D.selectedModuleId = null;
  if (canvas2D) canvas2D.selectedModuleId = null;
  hideSelectedModuleGizmo();
  renderActiveCanvas();
  updatePlacedModulesUI();
};

// PLACED MODULES LIST WITH WALL GROUPING & CAPACITY GAUGES
function updatePlacedModulesUI() {
  const container = document.getElementById('placed-modules-list');
  const countBadge = document.getElementById('placed-count-badge');
  if (!container) return;

  const mods = window.CURRENT_DESIGN.modules;
  if (countBadge) countBadge.textContent = `${mods.length} Modül`;

  // Update Toolbar Wall Badges
  const backCap = getWallCapacity('back');
  const leftCap = getWallCapacity('left');
  const capBackElem = document.getElementById('wall-cap-back');
  const capLeftElem = document.getElementById('wall-cap-left');
  if (capBackElem) capBackElem.textContent = `Boş: ${backCap.baseRemaining}mm / ${backCap.wallLength}mm`;
  if (capLeftElem) capLeftElem.textContent = `Boş: ${leftCap.baseRemaining}mm / ${leftCap.wallLength}mm`;

  container.innerHTML = '';

  const walls = [
    { key: 'back', name: '🧱 Arka Duvar', cap: backCap },
    { key: 'left', name: '🧱 Sol Duvar', cap: leftCap }
  ];

  walls.forEach(wObj => {
    const wallMods = mods.filter(m => (m.wall || 'back') === wObj.key);
    const pct = Math.min(100, Math.round((wObj.cap.baseMaxX / wObj.cap.wallLength) * 100));

    const groupHeader = document.createElement('div');
    groupHeader.className = 'wall-group-header';
    groupHeader.innerHTML = `
      <div class="wall-group-title">
        <span>${wObj.name} (${wObj.cap.wallLength} mm)</span>
        <span style="font-size:0.75rem; color:${pct >= 100 ? '#ef4444' : '#38bdf8'}; font-weight:700;">
          ${wObj.cap.baseMaxX} mm (%${pct} Dolu)
        </span>
      </div>
      <div class="wall-progress-track">
        <div class="wall-progress-fill ${pct >= 100 ? 'full' : ''}" style="width: ${pct}%;"></div>
      </div>
    `;
    container.appendChild(groupHeader);

    if (wallMods.length === 0) {
      const emptyNotice = document.createElement('div');
      emptyNotice.style.padding = '0.5rem';
      emptyNotice.style.fontSize = '0.75rem';
      emptyNotice.style.color = '#64748b';
      emptyNotice.textContent = 'Bu duvarda henüz modül yok. Sol menüden sürükleyip bırakabilirsiniz.';
      container.appendChild(emptyNotice);
    }

    wallMods.forEach(m => {
      const isSel = canvas2D?.selectedModuleId === m.id || canvas3D?.selectedModuleId === m.id;
      const div = document.createElement('div');
      div.className = 'placed-item';
      if (isSel) div.style.borderLeftColor = '#38bdf8';

      const isOpen = !!(m.isOpenShelf || m.type?.includes('open_shelf'));
      const shelfSelectHtml = isOpen ? `
        <div style="margin-top:4px; font-size:0.75rem; color:#cbd5e1; display:flex; align-items:center; gap:4px;">
          <span>📚 Raf:</span>
          <select onchange="updateModuleShelfCount('${m.id}', this.value)" style="background:#1e293b; color:#38bdf8; border:1px solid #475569; border-radius:4px; padding:1px 6px; font-size:0.75rem; font-weight:700;">
            <option value="1" ${(m.shelfCount == 1) ? 'selected' : ''}>1 Raf</option>
            <option value="2" ${(m.shelfCount == 2 || !m.shelfCount) ? 'selected' : ''}>2 Raf</option>
            <option value="3" ${(m.shelfCount == 3) ? 'selected' : ''}>3 Raf</option>
          </select>
        </div>
      ` : '';

      div.innerHTML = `
        <div style="flex:1;">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <strong style="color:#fff; font-size:0.85rem;">${m.id}: ${m.name}</strong>
            <span class="badge ${m.category === 'wall' ? 'badge-info' : 'badge-success'}" style="font-size:0.68rem;">
              ${m.category === 'wall' ? 'Üst' : (m.category === 'tall' ? 'Boy' : 'Alt')}
            </span>
          </div>
          <div style="display:flex; align-items:center; gap:0.4rem; margin-top:3px; font-size:0.75rem; color:#94a3b8;">
            <span>${m.w}x${m.d}mm</span>
            <span>|</span>
            <span>Konum:</span>
            <input type="number" class="pos-input" value="${m.x || 0}" step="50" onchange="setModuleCustomX('${m.id}', this.value)" title="Konumu milimetre cinsinden değiştirin"> mm
          </div>
          ${shelfSelectHtml}
        </div>
        <div style="display:flex; flex-direction:column; gap:3px;">
          <div style="display:flex; gap:2px;">
            <button class="btn btn-outline btn-sm" style="padding:2px 6px;" onclick="shiftModule('${m.id}', -100)" title="100mm Sola Kaydır">◀</button>
            <button class="btn btn-outline btn-sm" style="padding:2px 6px;" onclick="shiftModule('${m.id}', 100)" title="100mm Sağa Kaydır">▶</button>
            <button class="btn btn-outline btn-sm" style="padding:2px 6px; color:#ef4444;" onclick="removeModule('${m.id}')" title="Sil">✕</button>
          </div>
          <button class="btn btn-outline btn-sm" style="font-size:0.68rem; padding:2px 4px;" onclick="toggleModuleWall('${m.id}')" title="Diğer duvara taşı">
            🧱 ${m.wall === 'left' ? 'Arka Duvara' : 'Sol Duvara'}
          </button>
        </div>
      `;

      div.onclick = (e) => {
        if (e.target.tagName !== 'BUTTON' && e.target.tagName !== 'INPUT') {
          if (canvas3D) canvas3D.selectedModuleId = m.id;
          if (canvas2D) canvas2D.selectedModuleId = m.id;
          showSelectedModuleGizmo(m);
          renderActiveCanvas();
          updatePlacedModulesUI();
        }
      };

      container.appendChild(div);
    });
  });
}

// WIZARD STEP CONTROLLER
let currentWizardStep = 1;
function nextWizardStep(step) {
  currentWizardStep = step;
  document.querySelectorAll('.wizard-step-pane').forEach(p => p.style.display = 'none');
  document.querySelectorAll('.wizard-step-item').forEach((item, idx) => {
    if (idx + 1 === step) {
      item.classList.add('active');
    } else if (idx + 1 < step) {
      item.classList.add('completed');
      item.classList.remove('active');
    } else {
      item.classList.remove('active', 'completed');
    }
  });

  const pane = document.getElementById(`wizard-pane-${step}`);
  if (pane) pane.style.display = 'block';

  if (step === 5) {
    applyWizardSettings();
    const layout = window.CURRENT_DESIGN.layout_type || 'single_wall';
    const isL = layout.startsWith('l_');
    const cornerSec = document.getElementById('auto-corner-section');
    if (cornerSec) {
      cornerSec.style.display = isL ? 'block' : 'none';
    }
  }
}

window.startManualStudio = function() {
  applyWizardSettings();
  window.CURRENT_DESIGN.modules = [];
  navigateTo('studio');
  showToast('🎨 Manuel Tasarım: Boş tuval açıldı. Sol menüden modül eklemeye başlayabilirsiniz.', 'info');
};

// -------------------------------------------------------------
// UPPER CABINET SPAN PARTITIONING (ZERO GAPS & FLEXIBLE MODULAR)
// -------------------------------------------------------------
function partitionSpanToStandardWidths(totalSpan) {
  if (totalSpan <= 0) return [];
  if (totalSpan < 300) return [totalSpan];

  const standards = [900, 800, 600, 500, 400, 300];
  const rem = totalSpan % 100;
  const baseSpan = totalSpan - rem;

  const memo = {};
  function findBest(target) {
    if (target === 0) return [];
    if (target in memo) return memo[target];
    let best = null;
    for (const w of standards) {
      if (w <= target) {
        const sub = findBest(target - w);
        if (sub !== null) {
          const candidate = [w, ...sub];
          if (best === null || candidate.length < best.length) {
            best = candidate;
          }
        }
      }
    }
    memo[target] = best;
    return best;
  }

  let pieces = findBest(baseSpan);
  if (!pieces || pieces.length === 0) {
    pieces = [];
    let cur = baseSpan;
    while (cur > 0) {
      const w = standards.find(s => s <= cur) || 300;
      const useW = Math.min(w, cur);
      pieces.push(useW);
      cur -= useW;
    }
  }

  // Absorb remainder into the last cabinet so total width is exactly totalSpan (0 mm gap)
  if (rem > 0 && pieces.length > 0) {
    pieces[pieces.length - 1] += rem;
  } else if (rem > 0) {
    pieces.push(rem);
  }

  return pieces;
}

function fillUpperWallSpan(startX, endX, wallKey, wallH, preferGlass, nextModId, generatedModules) {
  const span = endX - startX;
  if (span < 200) return;

  const widths = partitionSpanToStandardWidths(span);
  let curPos = startX;
  let glassPlaced = false;

  widths.forEach(cw => {
    let modType = 'wall_single';
    let modName = 'Tek Kapaklı Üst Dolap';
    let hinges = 2;

    if (cw >= 800) {
      if (preferGlass && !glassPlaced) {
        modType = 'wall_glass';
        modName = 'Camlı Yatay Kalkar Dolap';
        hinges = 2;
        glassPlaced = true;
      } else {
        modType = 'wall_double';
        modName = 'Çift Kapaklı Üst Dolap';
        hinges = 4;
      }
    } else if (cw >= 600) {
      if (preferGlass && !glassPlaced) {
        modType = 'wall_glass';
        modName = 'Camlı Yatay Kalkar Dolap';
        hinges = 2;
        glassPlaced = true;
      } else {
        modType = 'wall_single';
        modName = 'Tek Kapaklı Üst Dolap';
        hinges = 2;
      }
    } else {
      modType = 'wall_single';
      modName = 'Tek Kapaklı Üst Dolap';
      hinges = 2;
    }

    generatedModules.push({
      id: nextModId(),
      type: modType,
      name: modName,
      category: 'wall',
      wall: wallKey,
      w: cw,
      d: 350,
      h: wallH,
      x: curPos,
      hinges: hinges,
      shelves: (wallH >= 900) ? 2 : 1,
      shelfCount: (wallH >= 900) ? 2 : 1
    });

    curPos += cw;
  });
}

// -------------------------------------------------------------
// 3D CANVAS ONBOARDING HELPER CONTROLLER
// -------------------------------------------------------------
window.dismissOnboardingGuide = function() {
  const card = document.getElementById('studio-onboarding-card');
  const btn = document.getElementById('studio-reopen-guide-btn');
  if (card) card.style.display = 'none';
  if (btn) btn.style.display = 'flex';
  try { localStorage.setItem('mc_hide_3d_guide', '1'); } catch(e){}
};

window.toggleOnboardingGuide = function() {
  const card = document.getElementById('studio-onboarding-card');
  const btn = document.getElementById('studio-reopen-guide-btn');
  if (!card) return;
  const isHidden = (card.style.display === 'none');
  card.style.display = isHidden ? 'block' : 'none';
  if (btn) btn.style.display = isHidden ? 'none' : 'flex';
};

window.setStudioWallHeight = function(h) {
  const heightVal = parseInt(h);
  if (!heightVal || !window.CURRENT_DESIGN || !window.CURRENT_DESIGN.modules) return;
  window.CURRENT_DESIGN.modules.forEach(m => {
    if (m.category === 'wall') {
      m.h = heightVal;
      m.shelves = (heightVal >= 900) ? 2 : 1;
      m.shelfCount = m.shelves;
    }
  });
  if (canvas3D) {
    canvas3D.render(window.CURRENT_DESIGN.room_config, window.CURRENT_DESIGN.modules, window.CURRENT_DESIGN.layout_type, window.CURRENT_DESIGN.materials);
  }
  if (typeof updateModulesTable === 'function') updateModulesTable();
  if (typeof updateCostSummary === 'function') updateCostSummary();
  const label = heightVal === 720 ? '70 cm' : (heightVal === 800 ? '80 cm' : '90 cm');
  showToast(`📏 Üst dolap yüksekliği ${label} olarak güncellendi (${heightVal >= 900 ? '2 raf / 3 bölme' : '1 raf / 2 bölme'}).`, 'info');
};

window.runAutoKitchenGenerator = function() {
  applyWizardSettings();
  const layout = window.CURRENT_DESIGN.layout_type || 'single_wall';
  const isL = layout.startsWith('l_');
  const rw = window.CURRENT_DESIGN.room_width || 3600;
  const rd = window.CURRENT_DESIGN.room_depth || 2600;

  const hasFridge = document.getElementById('auto-app-fridge')?.checked ?? true;
  const hasOven = true; // Mandatory: Tezgah üstü ocak & pişirme modülü her zaman yer alır
  const hasDishwasher = document.getElementById('auto-app-dishwasher')?.checked ?? true;
  const hasDrawer = document.getElementById('auto-app-drawer')?.checked ?? true;
  const hasHood = true; // Mandatory: Ocağın tam dikey üst hizasında davlumbaz/aspiratör
  const hasGlassWall = document.getElementById('auto-app-glass')?.checked ?? true;

  // Read Mandatory Upper Cabinet Height (720, 800, 900)
  const wallHeightVal = parseInt(document.querySelector('input[name="auto-wall-height"]:checked')?.value || '720');

  // Read Mandatory Hood Style Choice ('integrated' or 'chimney')
  const hoodStyle = document.querySelector('input[name="auto-hood-choice"]:checked')?.value || 'integrated';

  const generatedModules = [];
  let modIndex = 1;
  const nextModId = () => `MOD-${modIndex < 10 ? '0' + modIndex++ : modIndex++}`;

  if (!isL) {
    // SINGLE WALL (BACK WALL ONLY)
    let curX = 0;

    // 1. Tall Fridge on far left edge
    if (hasFridge && (rw - curX) >= 700) {
      generatedModules.push({
        id: nextModId(),
        type: 'tall_fridge',
        name: 'No-Frost Buzdolabı Kabini',
        category: 'tall',
        wall: 'back',
        w: 700, d: 600, h: 2100, x: curX
      });
      curX += 700;
    }

    const upperStartX = curX; // Upper cabinets begin after tall fridge (or at 0)

    // 2. Base 3-Drawer Prep Counter
    if (hasDrawer && (rw - curX) >= 600) {
      generatedModules.push({
        id: nextModId(),
        type: 'base_drawer_3',
        name: '3 Çekmeceli Alt Dolap',
        category: 'base',
        wall: 'back',
        w: 600, d: 600, h: 720, x: curX,
        drawers: 3, hinges: 0
      });
      curX += 600;
    }

    // 3. Sink Unit (Mandatory Base Unit)
    const sinkW = (rw - curX) >= 900 ? 900 : 800;
    if ((rw - curX) >= sinkW) {
      generatedModules.push({
        id: nextModId(),
        type: 'base_sink',
        name: 'Eviye Alt Dolabı (2 Kapak)',
        category: 'base',
        wall: 'back',
        w: sinkW, d: 600, h: 720, x: curX,
        hinges: 4
      });
      curX += sinkW;
    }

    // 4. Dishwasher adjacent to sink
    if (hasDishwasher && (rw - curX) >= 600) {
      generatedModules.push({
        id: nextModId(),
        type: 'base_dishwasher',
        name: 'Bulaşık Makinesi Paneli',
        category: 'base',
        wall: 'back',
        w: 600, d: 600, h: 720, x: curX
      });
      curX += 600;
    }

    // 5. Oven & Cooktop (Mandatory)
    let ovenPlaced = false;
    let ovenX = curX;
    if ((rw - curX) >= 600) {
      generatedModules.push({
        id: nextModId(),
        type: 'base_oven',
        name: 'Ankastre Fırın & Ocak Modülü',
        category: 'base',
        wall: 'back',
        w: 600, d: 600, h: 720, x: curX
      });
      curX += 600;
      ovenPlaced = true;
    }

    // 6. Fill remaining base space with standard modular cabinets
    let remSpace = rw - curX;
    while (remSpace >= 400) {
      const fillW = remSpace >= 800 ? 800 : (remSpace >= 600 ? 600 : (remSpace >= 500 ? 500 : 400));
      generatedModules.push({
        id: nextModId(),
        type: fillW >= 800 ? 'base_double' : 'base_standard',
        name: fillW >= 800 ? 'Çift Kapaklı Geniş Alt Dolap' : 'Standart Tek Kapak Alt Dolap',
        category: 'base',
        wall: 'back',
        w: fillW, d: 600, h: 720, x: curX,
        hinges: fillW >= 800 ? 4 : 2
      });
      curX += fillW;
      remSpace = rw - curX;
    }

    // 7. UPPER WALL: ZERO-GAPS MODULAR RUN WITH MANDATORY HOOD DIRECTLY ABOVE OVEN
    if (ovenPlaced) {
      // Span 1: From upperStartX to ovenX (includes glass cabinets over sink)
      fillUpperWallSpan(upperStartX, ovenX, 'back', wallHeightVal, hasGlassWall, nextModId, generatedModules);

      // Mandatory Hood directly vertically aligned with cooktop
      const hoodType = (hoodStyle === 'chimney') ? 'wall_hood_chimney' : 'wall_hood';
      const hoodName = (hoodStyle === 'chimney') ? 'Açık Paslanmaz Çelik T-Davlumbaz' : 'Davlumbaz Üstü Aspiratör Dolabı';
      generatedModules.push({
        id: nextModId(),
        type: hoodType,
        name: hoodName,
        category: 'wall',
        wall: 'back',
        w: 600,
        d: hoodStyle === 'chimney' ? 450 : 350,
        h: wallHeightVal,
        x: ovenX,
        hinges: hoodStyle === 'chimney' ? 0 : 2
      });

      // Span 2: From ovenX + 600 to rw (Zero gaps to the wall edge)
      fillUpperWallSpan(ovenX + 600, rw, 'back', wallHeightVal, false, nextModId, generatedModules);
    } else {
      fillUpperWallSpan(upperStartX, rw, 'back', wallHeightVal, hasGlassWall, nextModId, generatedModules);
    }

  } else {
    // L-KITCHEN (CORNER AT 0,0, SINK ON BACK WALL, COOKING & FRIDGE ON LEFT WALL)
    const cornerChoice = document.querySelector('input[name="auto-corner-choice"]:checked')?.value || 'l_corner';
    let baseCornerType = 'base_corner_l';
    let baseCornerName = '90° L-Köşe Alt Dolap (90x90 cm)';
    let baseW = 900;
    let baseD = 900;
    let wallCornerType = 'wall_corner_l';
    let wallCornerName = '90° L-Köşe Üst Dolabı';
    let wallW = 650;
    let wallD = 650;
    let backX = 900;
    let leftZ = 900;

    if (cornerChoice === 'straight') {
      baseCornerType = 'base_corner_straight';
      baseCornerName = 'Düz Kör Köşe Alt Dolap (100 cm)';
      baseW = 1000;
      baseD = 600;
      wallCornerType = 'wall_corner_straight';
      wallCornerName = 'Düz Kör Köşe Üst Dolap';
      wallW = 650;
      wallD = 350;
      backX = 1000;
      leftZ = 600;
    } else if (cornerChoice === 'v_corner') {
      baseCornerType = 'base_corner_v';
      baseCornerName = 'V-Köşe (45° Diyagonal) Alt Dolap (90x90 cm)';
      baseW = 900;
      baseD = 900;
      wallCornerType = 'wall_corner_v';
      wallCornerName = 'V-Köşe (45° Diyagonal) Üst Dolap';
      wallW = 650;
      wallD = 650;
      backX = 900;
      leftZ = 900;
    }

    // Base Corner Cabinet
    generatedModules.push({
      id: nextModId(),
      type: baseCornerType,
      name: baseCornerName,
      category: 'base',
      wall: 'back',
      w: baseW, d: baseD, h: 720, x: 0,
      shelves: 1
    });

    // Wall Corner Cabinet (uses user-selected wallHeightVal)
    generatedModules.push({
      id: nextModId(),
      type: wallCornerType,
      name: wallCornerName,
      category: 'wall',
      wall: 'back',
      w: wallW, d: wallD, h: wallHeightVal, x: 0,
      shelves: 1
    });

    // ---------------------------------------------------------
    // BACK WALL (Runs along X from Corner to rw)
    // ---------------------------------------------------------
    // Base: Sink
    if ((rw - backX) >= 900) {
      generatedModules.push({
        id: nextModId(),
        type: 'base_sink',
        name: 'Eviye Alt Dolabı (2 Kapak)',
        category: 'base',
        wall: 'back',
        w: 900, d: 600, h: 720, x: backX,
        hinges: 4
      });
      backX += 900;
    }

    // Base: Dishwasher
    if (hasDishwasher && (rw - backX) >= 600) {
      generatedModules.push({
        id: nextModId(),
        type: 'base_dishwasher',
        name: 'Bulaşık Makinesi Paneli',
        category: 'base',
        wall: 'back',
        w: 600, d: 600, h: 720, x: backX
      });
      backX += 600;
    }

    // Base: Fill remaining on Back Wall
    let remBack = rw - backX;
    while (remBack >= 400) {
      const fillW = remBack >= 800 ? 800 : (remBack >= 600 ? 600 : (remBack >= 500 ? 500 : 400));
      generatedModules.push({
        id: nextModId(),
        type: fillW >= 800 ? 'base_double' : 'base_standard',
        name: fillW >= 800 ? 'Çift Kapaklı Geniş Alt Dolap' : 'Standart Tek Kapak Alt Dolap',
        category: 'base',
        wall: 'back',
        w: fillW, d: 600, h: 720, x: backX,
        hinges: fillW >= 800 ? 4 : 2
      });
      backX += fillW;
      remBack = rw - backX;
    }

    // Upper Back Wall: ZERO GAPS across entire span from wallW to rw
    fillUpperWallSpan(wallW, rw, 'back', wallHeightVal, hasGlassWall, nextModId, generatedModules);

    // ---------------------------------------------------------
    // LEFT WALL (Runs along Z from Corner to rd)
    // ---------------------------------------------------------
    leftZ = (cornerChoice === 'straight' ? 600 : 900);
    const upperWallLeftStart = (cornerChoice === 'straight' ? 350 : 650);

    // Determine tall fridge placement at far end of left wall
    const hasFridgeLeft = hasFridge && (rd - leftZ) >= 700;
    const fridgeStartLeft = hasFridgeLeft ? (rd - 700) : rd;

    // 1. Oven & Cooktop on Left Wall (Mandatory)
    const ovenZ = leftZ;
    generatedModules.push({
      id: nextModId(),
      type: 'base_oven',
      name: 'Ankastre Fırın & Ocak Modülü',
      category: 'base',
      wall: 'left',
      w: 600, d: 600, h: 720, x: ovenZ
    });
    leftZ += 600;

    // 2. 3-Drawer Prep Counter
    if (hasDrawer && (fridgeStartLeft - leftZ) >= 600) {
      generatedModules.push({
        id: nextModId(),
        type: 'base_drawer_3',
        name: '3 Çekmeceli Alt Dolap',
        category: 'base',
        wall: 'left',
        w: 600, d: 600, h: 720, x: leftZ,
        drawers: 3
      });
      leftZ += 600;
    }

    // 3. Fill remaining base on Left Wall between drawers and tall fridge
    let remLeft = fridgeStartLeft - leftZ;
    while (remLeft >= 400) {
      const fillW = remLeft >= 600 ? 600 : (remLeft >= 500 ? 500 : 400);
      generatedModules.push({
        id: nextModId(),
        type: 'base_standard',
        name: 'Standart Tek Kapak Alt Dolap',
        category: 'base',
        wall: 'left',
        w: fillW, d: 600, h: 720, x: leftZ
      });
      leftZ += fillW;
      remLeft = fridgeStartLeft - leftZ;
    }

    // 4. Tall Fridge at the end of Left Wall
    if (hasFridgeLeft) {
      generatedModules.push({
        id: nextModId(),
        type: 'tall_fridge',
        name: 'No-Frost Buzdolabı Kabini',
        category: 'tall',
        wall: 'left',
        w: 700, d: 600, h: 2100, x: fridgeStartLeft
      });
    }

    // 5. Upper Left Wall: ZERO GAPS MODULAR RUN WITH MANDATORY HOOD DIRECTLY ABOVE OVEN
    // Span 1: From upper corner (upperWallLeftStart) to ovenZ
    fillUpperWallSpan(upperWallLeftStart, ovenZ, 'left', wallHeightVal, false, nextModId, generatedModules);

    // Mandatory Hood directly vertically aligned with oven on left wall
    const hoodTypeLeft = (hoodStyle === 'chimney') ? 'wall_hood_chimney' : 'wall_hood';
    const hoodNameLeft = (hoodStyle === 'chimney') ? 'Açık Paslanmaz Çelik T-Davlumbaz' : 'Davlumbaz Üstü Aspiratör Dolabı';
    generatedModules.push({
      id: nextModId(),
      type: hoodTypeLeft,
      name: hoodNameLeft,
      category: 'wall',
      wall: 'left',
      w: 600,
      d: hoodStyle === 'chimney' ? 450 : 350,
      h: wallHeightVal,
      x: ovenZ,
      hinges: hoodStyle === 'chimney' ? 0 : 2
    });

    // Span 2: From ovenZ + 600 to fridgeStartLeft (Zero gaps up to the fridge column / wall edge)
    fillUpperWallSpan(ovenZ + 600, fridgeStartLeft, 'left', wallHeightVal, false, nextModId, generatedModules);
  }

  window.CURRENT_DESIGN.modules = generatedModules;
  navigateTo('studio');
  showToast('✨ Sihirbaz mutfağınızı hazırladı! Modülleri dilediğiniz gibi taşıyabilir, silebilir veya yeni modüller ekleyebilirsiniz.', 'success');
  const banner = document.getElementById('studio-wizard-notice-banner');
  if (banner) banner.style.display = 'flex';
};

window.selectLayoutShape = function(shapeKey) {
  window.CURRENT_DESIGN.layout_type = shapeKey;
  document.querySelectorAll('.shape-box').forEach(b => b.classList.remove('selected'));
  document.getElementById(`shape-${shapeKey}`)?.classList.add('selected');
};

function applyWizardSettings() {
  const rw = parseInt(document.getElementById('wizard-room-w')?.value || 3600);
  const rd = parseInt(document.getElementById('wizard-room-d')?.value || 2600);
  const rh = parseInt(document.getElementById('wizard-room-h')?.value || 2600);

  window.CURRENT_DESIGN.room_width = rw;
  window.CURRENT_DESIGN.room_depth = rd;
  window.CURRENT_DESIGN.room_height = rh;

  const doorPos = parseInt(document.getElementById('wizard-door-pos')?.value || 400);
  const doorW = parseInt(document.getElementById('wizard-door-w')?.value || 900);
  const doorWall = document.getElementById('wizard-door-wall')?.value || 'left';

  window.CURRENT_DESIGN.room_config.door = {
    wall: doorWall,
    pos: doorPos,
    width: doorW,
    swing: 'inward_right'
  };

  const floorType = document.getElementById('wizard-flooring')?.value || 'AGT Parke Doğal Meşe';
  window.CURRENT_DESIGN.room_config.flooring = {
    type: floorType,
    sponsor: floorType.includes('Bien') ? 'Bien Seramik Sponsoru' : 'AGT Parke Sistemleri'
  };

  const matCountertop = document.getElementById('wizard-mat-countertop')?.value || 'cimstone';
  const matDoor = document.getElementById('wizard-mat-door')?.value || 'mdflam';
  window.CURRENT_DESIGN.materials.countertop_material = matCountertop;
  window.CURRENT_DESIGN.materials.door_material = matDoor;
  const studioCt = document.getElementById('mat-countertop');
  if (studioCt) studioCt.value = matCountertop;
  const studioDoor = document.getElementById('mat-door');
  if (studioDoor) studioDoor.value = matDoor;

  const apps = [];
  if (document.getElementById('app-fridge')?.checked) apps.push({ key: 'buzdolabi_kombi', name: 'Buzdolabı', qty: 1 });
  if (document.getElementById('app-oven')?.checked) apps.push({ key: 'firin_ankastre', name: 'Ankastre Fırın', qty: 1 });
  if (document.getElementById('app-hob')?.checked) apps.push({ key: 'ocak_ankastre', name: 'Ankastre Ocak', qty: 1 });
  if (document.getElementById('app-hood')?.checked) apps.push({ key: 'davlumbaz_egimli', name: 'Davlumbaz', qty: 1 });
  if (document.getElementById('app-dishwasher')?.checked) apps.push({ key: 'bulasik_ankastre', name: 'Bulaşık Makinesi', qty: 1 });
  window.CURRENT_DESIGN.appliances = apps;
}

// SUBMISSION & REFERENCE CODE
async function openSubmitQuoteModal() {
  if (window.CURRENT_DESIGN_LOCKED) {
    alert("🔒 Tasarımınız kilitlenmiştir ve fabrikayla randevu sürecindedir. Randevunuzda net fiyat ve özel aksesuarlarınızı görüşebilirsiniz. Yeni bir revize süresi için lütfen fabrika yöneticimiz ile iletişime geçiniz.");
    return;
  }

  if (canvas2D && canvas2D.doorCollisionDetected) {
    if (!confirm("⚠️ DİKKAT: Dolap modüllerinizden biri kapının açılış yayına çarpıyor! Yine de devam edip yönetici incelemesine göndermek istiyor musunuz?")) {
      return;
    }
  }

  const savedPhone = localStorage.getItem('mc_customer_phone') || window.CURRENT_USER?.phone || '';
  const savedName = localStorage.getItem('mc_customer_name') || window.CURRENT_USER?.name || '';
  if (savedPhone && document.getElementById('quote-cust-phone')) {
    document.getElementById('quote-cust-phone').value = savedPhone;
  }
  if (savedName && document.getElementById('quote-cust-name')) {
    document.getElementById('quote-cust-name').value = savedName;
  }

  await loadSuggestedAppointmentSlots();

  const modal = document.getElementById('submit-quote-modal');
  if (modal) modal.classList.add('active');
}

async function submitDesignForQuote() {
  const custName = document.getElementById('quote-cust-name').value.trim();
  const custPhone = document.getElementById('quote-cust-phone').value.trim();
  const custEmail = document.getElementById('quote-cust-email').value.trim();
  const custCity = document.getElementById('quote-cust-city').value.trim();
  const appDate = document.getElementById('quote-cust-date')?.value || '';
  const appTime = document.getElementById('quote-cust-time')?.value || '';
  const notes = document.getElementById('quote-cust-notes').value.trim();

  if (!custName || !custPhone) {
    alert("Lütfen ad, soyad ve telefon numaranızı giriniz.");
    return;
  }

  window.CURRENT_DESIGN.customer_name = custName;
  window.CURRENT_DESIGN.customer_phone = custPhone;
  window.CURRENT_DESIGN.customer_email = custEmail;
  window.CURRENT_DESIGN.customer_city = custCity;
  window.CURRENT_DESIGN.appointment_date = appDate;
  window.CURRENT_DESIGN.appointment_time_slot = appTime;
  window.CURRENT_DESIGN.notes = notes;

  try {
    const token = localStorage.getItem('mc_token');
    const res = await fetch('/api/designs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      },
      body: JSON.stringify(window.CURRENT_DESIGN)
    });
    const data = await res.json();
    if (data.success) {
      localStorage.setItem('mc_customer_phone', custPhone);
      localStorage.setItem('mc_customer_name', custName);
      lockStudioCanvas('appointment_submitted', data.reference_code);
      closeModal('submit-quote-modal');
      showReferenceSuccessModal(data.reference_code, custName);
    } else {
      alert("Hata: " + (data.error || "Tasarım kaydedilemedi"));
    }
  } catch (e) {
    alert("Sunucuya bağlanırken hata oluştu.");
  }
}

function showReferenceSuccessModal(refCode, custName) {
  const modal = document.getElementById('ref-success-modal');
  if (modal) {
    document.getElementById('success-ref-code').textContent = refCode;
    document.getElementById('success-cust-name').textContent = custName;
    modal.classList.add('active');
  }
}

// AUTHENTICATION & SESSIONS
async function checkAuthSession() {
  const token = localStorage.getItem('mc_token');
  if (!token) return;

  try {
    const res = await fetch('/api/auth/me', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    if (data.authenticated) {
      window.CURRENT_USER = data.user;
      updateAuthUI();
    } else {
      localStorage.removeItem('mc_token');
    }
  } catch (e) {
    console.error("Auth check failed:", e);
  }
}

window.toggleUserDropdown = function() {
  const card = document.getElementById('user-dropdown-card');
  if (card) card.classList.toggle('show');
};

// Close user dropdown when clicking outside
window.addEventListener('click', function(e) {
  const card = document.getElementById('user-dropdown-card');
  const pill = document.querySelector('.nordic-user-pill');
  if (card && pill && !card.contains(e.target) && !pill.contains(e.target) && !e.target.closest('[onclick*="toggleUserDropdown"]')) {
    card.classList.remove('show');
  }
});

function updateAuthUI() {
  const authNav = document.getElementById('auth-nav-container');
  const topbarAuthSlot = document.getElementById('topbar-auth-slot');

  if (!window.CURRENT_USER) {
    window.CURRENT_USER = {
      id: 1,
      full_name: 'Engin Çelik',
      email: 'engin@modulercraft.com',
      role: 'customer',
      tokens_balance: 0
    };
  }
  const user = window.CURRENT_USER;

  const userHtml = `
    <div class="nordic-user-section" style="display:flex; align-items:center; gap:10px; position:relative;">
      <!-- Notification Bell with Alert Dot -->
      <div style="position:relative; cursor:pointer;" onclick="toggleUserDropdown(this)" title="Durum Bildirimi">
        <span style="font-size:18px;">🔔</span>
        <span style="position:absolute; top:-3px; right:-3px; width:8px; height:8px; background:#ef4444; border-radius:50%;"></span>
      </div>

      <!-- User Badge / Hesabım Trigger -->
      <div class="nordic-user-pill" onclick="toggleUserDropdown(this)">
        <div class="user-avatar-circle">EÇ</div>
        <div>
          <div class="user-pill-name">${user.full_name || 'Engin Çelik'}</div>
          <div style="font-size:0.68rem; color:#059669; font-weight:600;">● Müşteri Hesabı</div>
        </div>
        <span class="user-pill-chevron">▼</span>
      </div>

      <!-- Interactive User Dropdown (Hesabım Açılır Kartı) -->
      <div class="user-dropdown-card" id="user-dropdown-card">
        <div class="dropdown-header-user">
          <div class="user-avatar-circle" style="width:38px; height:38px; font-size:0.95rem;">EÇ</div>
          <div>
            <strong style="font-size:0.95rem; color:#0f172a; display:block;">${user.full_name || 'Engin Çelik'}</strong>
            <span style="font-size:0.75rem; color:#64748b;">Müşteri No: #MC-2026-884</span>
          </div>
        </div>

        <!-- Kalan Süre Sayacı -->
        <div class="dropdown-time-box">
          <div style="font-size:0.72rem; color:#166534; font-weight:700; text-transform:uppercase;">⏳ Tasarım Kalan Süreniz</div>
          <div style="font-size:1.15rem; font-weight:800; color:#15803d; margin-top:2px;" id="dropdown-timer-text">50 saat 41 dakika</div>
          <div style="font-size:0.68rem; color:#16a34a; margin-top:2px;">Süreniz dolduğunda randevu ve revizyon hakkınız saklı kalır.</div>
        </div>

        <!-- Tasarım / Proje Durumu + Değişiklik Bildirim Baloncuğu -->
        <div class="dropdown-status-box">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <span style="font-size:0.75rem; font-weight:700; color:#475569;">PROJE DURUMU</span>
            <span style="background:#e0f2fe; color:#0369a1; font-size:0.7rem; font-weight:700; padding:2px 8px; border-radius:4px;" id="dropdown-status-badge">Taslak Aşamasında</span>
          </div>
          <div class="status-bubble-pill">
            <span>💬</span> Durum: Mimari onay için randevu slotu seçimi bekleniyor
          </div>
        </div>

        <!-- Menü Aksiyonları -->
        <div style="display:flex; flex-direction:column; gap:6px;">
          <button class="dropdown-action-btn" onclick="openAppointmentStatusModal(); toggleUserDropdown();">
            <span>📅</span> Randevu Saatini Düzenle
          </button>
          <button class="dropdown-action-btn" onclick="logout()">
            <span style="color:#ef4444;">🚪</span> Güvenli Çıkış Yap (Logout)
          </button>
        </div>
      </div>
    </div>
  `;

  if (authNav) authNav.innerHTML = userHtml;
  if (topbarAuthSlot) topbarAuthSlot.innerHTML = userHtml;
}

// CUSTOMER ONBOARDING GATEWAY: REQUIRES AUTH BEFORE ENTERING WIZARD/STUDIO
window.startDesignCustomer = function(catKey) {
  if (window.CURRENT_USER) {
    selectCategory(catKey);
  } else {
    window.PENDING_CATEGORY = catKey;
    openAuthModal('register');
    const title = document.getElementById('auth-modal-title');
    if (title) title.textContent = "🎨 Tasarıma Başlamak İçin Ücretsiz Üye Olun";
    showToast("✨ Tasarımınızı oluşturmak ve kaydetmek için lütfen ücretsiz üye olun.");
  }
};

// DEDICATED ADMIN LOGIN MODAL CONTROLLER
window.openAdminLoginModal = function() {
  const modal = document.getElementById('admin-login-modal');
  if (modal) modal.classList.add('active');
};

window.handleAdminLoginSubmit = async function() {
  const email = document.getElementById('admin-login-email').value.trim();
  const password = document.getElementById('admin-login-password').value;

  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (data.success) {
      if (data.user.role !== 'admin') {
        alert("Bu hesap yönetici yetkisine sahip değil. Lütfen yönetici hesabınızla giriş yapınız.");
        return;
      }
      localStorage.setItem('mc_token', data.token);
      window.CURRENT_USER = data.user;
      closeModal('admin-login-modal');
      updateAuthUI();
      showToast("👑 Yönetici girişi başarılı! Hoş geldiniz.");
      navigateTo('admin');
    } else {
      alert("Yönetici girişi başarısız: " + (data.error || "Hatalı şifre"));
    }
  } catch (e) {
    alert("Bağlantı hatası: " + e.message);
  }
};

async function quickAdminLogin() {
  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@modulercraft.com', password: 'admin123' })
    });
    const data = await res.json();
    if (data.success) {
      localStorage.setItem('mc_token', data.token);
      window.CURRENT_USER = data.user;
      closeModal('admin-login-modal');
      updateAuthUI();
      showToast("👑 Yönetici girişi başarılı! Hoş geldiniz.");
      navigateTo('admin');
    }
  } catch (e) {
    alert("Yönetici girişi başarısız.");
  }
}

async function handleAuthSubmit(mode) {
  const email = document.getElementById(`${mode}-email`).value.trim();
  const password = document.getElementById(`${mode}-password`).value;

  let payload = { email, password };
  let url = '/api/auth/login';

  if (mode === 'register') {
    url = '/api/auth/register';
    payload.full_name = document.getElementById('reg-fullname').value.trim();
    payload.phone = document.getElementById('reg-phone').value.trim();
    payload.role = document.getElementById('reg-role').value;
    payload.company_name = document.getElementById('reg-company').value.trim();
  }

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (data.success) {
      localStorage.setItem('mc_token', data.token);
      window.CURRENT_USER = data.user;
      closeModal('auth-modal');
      updateAuthUI();
      showToast(`Giriş başarılı! Hoş geldiniz, ${data.user.full_name}`);

      // If customer came from a specific category on landing page, forward directly to that wizard!
      if (window.PENDING_CATEGORY) {
        const cat = window.PENDING_CATEGORY;
        window.PENDING_CATEGORY = null;
        selectCategory(cat);
      } else if (data.user.role === 'admin') {
        navigateTo('admin');
      } else {
        navigateTo('categories');
      }
    } else {
      alert("Hata: " + (data.error || "Giriş yapılamadı"));
    }
  } catch (e) {
    alert("Sunucu hatası: " + e.message);
  }
}

function logout() {
  localStorage.removeItem('mc_token');
  window.CURRENT_USER = null;
  updateAuthUI();
  navigateTo('categories');
  showToast("Oturum kapatıldı.");
}

function openTokenModal() {
  const modal = document.getElementById('token-modal');
  if (modal) modal.classList.add('active');
}

async function buyTokens(amount) {
  const token = localStorage.getItem('mc_token');
  try {
    const res = await fetch('/api/tokens/buy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ amount })
    });
    const data = await res.json();
    if (data.success) {
      closeModal('token-modal');
      if (window.CURRENT_USER) window.CURRENT_USER.tokens_balance = data.new_balance;
      updateAuthUI();
      showToast(data.message);
    }
  } catch (e) {
    alert("Jeton alımı başarısız.");
  }
}

function openAuthModal(mode = 'login') {
  const modal = document.getElementById('auth-modal');
  if (modal) {
    toggleAuthMode(mode);
    modal.classList.add('active');
  }
}

function toggleAuthMode(mode) {
  document.getElementById('auth-login-pane').style.display = mode === 'login' ? 'block' : 'none';
  document.getElementById('auth-register-pane').style.display = mode === 'register' ? 'block' : 'none';
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.remove('active');
}

function showToast(msg) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = msg;
  toast.style.display = 'block';
  setTimeout(() => {
    toast.style.display = 'none';
  }, 3500);
}

// ACTIVE CATALOG MATERIALS
window.ACTIVE_CATALOG_MATERIALS = { countertop: [], cabinet: [] };

async function loadActiveCatalogMaterials() {
  try {
    const res = await fetch('/api/catalog/materials');
    const data = await res.json();
    if (data.materials) {
      window.ACTIVE_CATALOG_MATERIALS = data.materials;
      populateMaterialDropdowns();
    }
  } catch (e) {
    console.error("Error loading active catalog materials:", e);
  }
}

function populateMaterialDropdowns() {
  const wizardCt = document.getElementById('wizard-mat-countertop');
  const wizardDoor = document.getElementById('wizard-mat-door');
  const studioCt = document.getElementById('mat-countertop');
  const studioDoor = document.getElementById('mat-door');

  const countertops = window.ACTIVE_CATALOG_MATERIALS?.countertop || [];
  const cabinets = window.ACTIVE_CATALOG_MATERIALS?.cabinet || [];

  if (wizardCt && countertops.length > 0) {
    wizardCt.innerHTML = countertops.map(m => 
      `<option value="${m.key}">${m.name}</option>`
    ).join('');
    if (window.CURRENT_DESIGN?.materials?.countertop_material) {
      wizardCt.value = window.CURRENT_DESIGN.materials.countertop_material;
    }
  }

  if (wizardDoor && cabinets.length > 0) {
    wizardDoor.innerHTML = cabinets.map(m => 
      `<option value="${m.key}">${m.name}</option>`
    ).join('');
    if (window.CURRENT_DESIGN?.materials?.door_material) {
      wizardDoor.value = window.CURRENT_DESIGN.materials.door_material;
    }
  }

  if (studioCt && countertops.length > 0) {
    studioCt.innerHTML = countertops.map(m => 
      `<option value="${m.key}">${m.name}</option>`
    ).join('');
    if (window.CURRENT_DESIGN?.materials?.countertop_material) {
      studioCt.value = window.CURRENT_DESIGN.materials.countertop_material;
    }
  }

  if (studioDoor && cabinets.length > 0) {
    studioDoor.innerHTML = cabinets.map(m => 
      `<option value="${m.key}">${m.name}</option>`
    ).join('');
    if (window.CURRENT_DESIGN?.materials?.door_material) {
      studioDoor.value = window.CURRENT_DESIGN.materials.door_material;
    }
  }
}
window.loadActiveCatalogMaterials = loadActiveCatalogMaterials;

function setupEventListeners() {
  document.getElementById('mat-body')?.addEventListener('change', (e) => {
    window.CURRENT_DESIGN.materials.body_material = e.target.value;
    renderActiveCanvas();
  });
  document.getElementById('mat-door')?.addEventListener('change', (e) => {
    window.CURRENT_DESIGN.materials.door_material = e.target.value;
    const wizDoor = document.getElementById('wizard-mat-door');
    if (wizDoor) wizDoor.value = e.target.value;
    renderActiveCanvas();
  });
  document.getElementById('mat-countertop')?.addEventListener('change', (e) => {
    window.CURRENT_DESIGN.materials.countertop_material = e.target.value;
    const wizCt = document.getElementById('wizard-mat-countertop');
    if (wizCt) wizCt.value = e.target.value;
    renderActiveCanvas();
  });
  document.getElementById('wizard-mat-countertop')?.addEventListener('change', (e) => {
    window.CURRENT_DESIGN.materials.countertop_material = e.target.value;
    const studioCt = document.getElementById('mat-countertop');
    if (studioCt) studioCt.value = e.target.value;
  });
  document.getElementById('wizard-mat-door')?.addEventListener('change', (e) => {
    window.CURRENT_DESIGN.materials.door_material = e.target.value;
    const studioDoor = document.getElementById('mat-door');
    if (studioDoor) studioDoor.value = e.target.value;
  });
}

// ==========================================
// 72-HOUR CUSTOMER DESIGN ACCESS & ANTI-ABUSE
// ==========================================
window.CURRENT_DESIGN_LOCKED = false;
let customerTimerInterval = null;

async function checkCustomerAccessSession(forcePhone = null) {
  const phone = forcePhone || localStorage.getItem('mc_customer_phone') || window.CURRENT_USER?.phone;
  if (!phone) {
    const modal = document.getElementById('customer-phone-session-modal');
    if (modal && !window.CURRENT_USER) {
      modal.classList.add('active');
    }
    return;
  }

  try {
    const res = await fetch('/api/customer/check-access', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone })
    });
    const data = await res.json();
    if (data.exists) {
      if (data.is_locked) {
        lockStudioCanvas(data.locked_reason, data.active_reference_code);
      } else {
        unlockStudioCanvas(data.remaining_seconds);
      }
    } else {
      initCustomerPhoneSession(phone);
    }
  } catch (e) {
    console.error("Access session check error:", e);
  }
}
window.checkCustomerAccessSession = checkCustomerAccessSession;

async function initCustomerPhoneSession(phone, custName = '') {
  if (!phone) return;
  try {
    const res = await fetch('/api/customer/init-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, customer_name: custName })
    });
    const data = await res.json();
    if (data.success) {
      localStorage.setItem('mc_customer_phone', phone);
      if (custName) localStorage.setItem('mc_customer_name', custName);
      if (data.is_locked) {
        lockStudioCanvas(data.locked_reason, data.active_reference_code);
      } else {
        unlockStudioCanvas(data.remaining_seconds);
      }
    }
  } catch (e) {
    console.error("Init session error:", e);
  }
}
window.initCustomerPhoneSession = initCustomerPhoneSession;

window.submitPhoneSession = async function() {
  const phoneInput = document.getElementById('session-cust-phone');
  const nameInput = document.getElementById('session-cust-name');
  const phone = phoneInput?.value.trim() || '';
  const name = nameInput?.value.trim() || '';
  if (!phone || phone.length < 10) {
    alert("Lütfen geçerli bir telefon numarası giriniz.");
    return;
  }
  await initCustomerPhoneSession(phone, name);
  closeModal('customer-phone-session-modal');
  if (document.getElementById('quote-cust-phone')) document.getElementById('quote-cust-phone').value = phone;
  if (name && document.getElementById('quote-cust-name')) document.getElementById('quote-cust-name').value = name;
};

function lockStudioCanvas(reason = 'appointment_submitted', refCode = '') {
  window.CURRENT_DESIGN_LOCKED = true;
  if (customerTimerInterval) clearInterval(customerTimerInterval);

  const banner = document.getElementById('studio-locked-banner');
  const badge = document.getElementById('customer-timer-badge');
  const timerText = document.getElementById('timer-badge-text');
  const bannerTitle = document.getElementById('locked-banner-title');
  const bannerDesc = document.getElementById('locked-banner-desc');
  const refBadge = document.getElementById('locked-ref-badge');
  const submitBtn = document.getElementById('btn-studio-submit-quote');

  if (banner) {
    banner.style.display = 'flex';
    if (reason === 'appointment_submitted') {
      if (bannerTitle) bannerTitle.textContent = "🔒 Tasarımınız Onaylanıp Kilitlenmiştir!";
      if (bannerDesc) bannerDesc.textContent = "Tasarımınız fabrikamıza iletilmiştir. Randevu görüşmenizde net fiyat ve özel donanımlarınız (kör köşe fasulye sepet vb.) profesyonelce belirlenecektir. Doğrudan revize yapılamaz.";
      if (refBadge) {
        refBadge.textContent = refCode || 'TR-ONAYLI';
        refBadge.style.display = 'inline-block';
      }
    } else {
      if (bannerTitle) bannerTitle.textContent = "⏰ 72 Saatlik Tasarım Süreniz Dolmuştur!";
      if (bannerDesc) bannerDesc.textContent = "Bireysel kullanım hakkınızın süresi dolduğu için tuval kilitlenmiştir. Yeniden tasarım yapmak veya revize süresi almak için lütfen fabrika yöneticimiz ile iletişime geçiniz.";
      if (refBadge) refBadge.style.display = 'none';
    }
  }

  if (timerText) {
    timerText.textContent = reason === 'appointment_submitted' ? '🔒 Tasarım Kilitli' : '⏰ Süre Doldu';
    if (badge) {
      badge.style.borderColor = '#ef4444';
      badge.style.color = '#ef4444';
    }
  }

  if (submitBtn) {
    submitBtn.textContent = '🔒 Tasarım Kilitlendi';
    submitBtn.classList.remove('btn-success');
    submitBtn.classList.add('btn-outline');
    submitBtn.style.opacity = '0.6';
    submitBtn.style.cursor = 'not-allowed';
  }
}
window.lockStudioCanvas = lockStudioCanvas;

function unlockStudioCanvas(remainingSeconds = 72 * 3600) {
  window.CURRENT_DESIGN_LOCKED = false;
  const banner = document.getElementById('studio-locked-banner');
  if (banner) banner.style.display = 'none';

  const badge = document.getElementById('customer-timer-badge');
  if (badge) {
    badge.style.borderColor = '#38bdf8';
    badge.style.color = '#38bdf8';
  }

  const submitBtn = document.getElementById('btn-studio-submit-quote');
  if (submitBtn) {
    submitBtn.innerHTML = '<span>📅</span> Tasarımı Tamamla & Randevu Al';
    submitBtn.classList.add('btn-success');
    submitBtn.classList.remove('btn-outline');
    submitBtn.style.opacity = '1';
    submitBtn.style.cursor = 'pointer';
  }

  start72HourTimer(remainingSeconds);
}
window.unlockStudioCanvas = unlockStudioCanvas;

function start72HourTimer(remainingSeconds) {
  if (customerTimerInterval) clearInterval(customerTimerInterval);
  let sec = remainingSeconds;

  function updateDisplay() {
    const timerText = document.getElementById('timer-badge-text');
    if (!timerText) return;

    if (sec <= 0) {
      clearInterval(customerTimerInterval);
      lockStudioCanvas('expired');
      alert("⏰ DİKKAT: 72 saatlik tasarım süreniz dolmuştur! Tasarımınız kilitlendi. Ek süre veya revize için fabrika yöneticimiz ile iletişime geçiniz.");
      return;
    }

    const hours = Math.floor(sec / 3600);
    const mins = Math.floor((sec % 3600) / 60);
    timerText.textContent = `Kalan Süre: ${hours}s ${mins < 10 ? '0' : ''}${mins}dk`;
    sec--;
  }

    updateDisplay();
    customerTimerInterval = setInterval(updateDisplay, 1000);
}
window.start72HourTimer = start72HourTimer;

// ==========================================
// APPOINTMENT SLOTS (NEAREST 3) & STATUS TRACKING
// ==========================================
async function loadSuggestedAppointmentSlots() {
  const container = document.getElementById('nearest-slots-container');
  if (!container) return;

  container.innerHTML = '<div style="color:#94a3b8; font-size:0.8rem; grid-column:1/-1;">Uygun randevu saatleri yükleniyor...</div>';
  try {
    const res = await fetch('/api/appointments/suggested-slots');
    const data = await res.json();
    const slots = data.slots || [];

    if (slots.length === 0) {
      container.innerHTML = '<div style="color:#f59e0b; font-size:0.8rem; grid-column:1/-1;">Şu an için aktif randevu slotu bulunamadı.</div>';
      return;
    }

    container.innerHTML = slots.map((s, idx) => `
      <div class="slot-option-card ${idx === 0 ? 'selected' : ''}" 
           style="background:${idx === 0 ? 'rgba(56, 189, 248, 0.2)' : '#0f172a'}; border:2px solid ${idx === 0 ? '#38bdf8' : '#334155'}; border-radius:8px; padding:0.6rem; cursor:pointer; text-align:center; transition:all 0.2s;" 
           onclick="selectAppointmentSlot(this, '${s.date}', '${s.time_slot}')">
        <div style="font-size:0.7rem; font-weight:700; color:#93c5fd; text-transform:uppercase;">Seçenek ${idx + 1}</div>
        <div style="font-size:0.85rem; font-weight:700; color:#ffffff; margin:4px 0;">${s.date_label}</div>
        <div style="font-size:0.75rem; color:#38bdf8; font-weight:600;">⏰ ${s.time_label}</div>
      </div>
    `).join('');

    // Pre-select first slot
    const first = slots[0];
    const dateInput = document.getElementById('quote-cust-date');
    const timeInput = document.getElementById('quote-cust-time');
    if (dateInput) dateInput.value = first.date;
    if (timeInput) timeInput.value = first.time_slot;
  } catch (e) {
    container.innerHTML = '<div style="color:#ef4444; font-size:0.8rem; grid-column:1/-1;">Randevu slotları alınamadı.</div>';
  }
}
window.loadSuggestedAppointmentSlots = loadSuggestedAppointmentSlots;

function selectAppointmentSlot(element, date, slot) {
  document.querySelectorAll('#nearest-slots-container .slot-option-card').forEach(c => {
    c.style.background = '#0f172a';
    c.style.borderColor = '#334155';
    c.classList.remove('selected');
  });

  if (element) {
    element.style.background = 'rgba(56, 189, 248, 0.2)';
    element.style.borderColor = '#38bdf8';
    element.classList.add('selected');
  }

  const dateInput = document.getElementById('quote-cust-date');
  const timeInput = document.getElementById('quote-cust-time');
  if (dateInput) dateInput.value = date;
  if (timeInput) timeInput.value = slot;
}
window.selectAppointmentSlot = selectAppointmentSlot;

window.openAppointmentStatusModal = function(defaultIdentifier = '') {
  const modal = document.getElementById('appointment-status-modal');
  const input = document.getElementById('status-search-input');
  const savedRef = defaultIdentifier || localStorage.getItem('mc_last_ref') || window.CURRENT_DESIGN?.reference_code || localStorage.getItem('mc_customer_phone') || '';
  if (input && savedRef) {
    input.value = savedRef;
  }
  if (modal) modal.classList.add('active');
  if (savedRef) {
    lookupAppointmentStatus();
  }
};
window.openRefLookupModal = window.openAppointmentStatusModal; // Backward-compatible alias

window.lookupAppointmentStatus = async function() {
  const input = document.getElementById('status-search-input');
  const container = document.getElementById('status-result-container');
  const val = input?.value.trim();
  if (!val) {
    alert("Lütfen referans kodunuzu veya telefon numaranızı giriniz.");
    return;
  }

  container.style.display = 'block';
  container.innerHTML = '<div style="text-align:center; color:#94a3b8; padding:1rem;">Durum sorgulanıyor...</div>';

  try {
    const res = await fetch('/api/customer/track-status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: val })
    });
    const data = await res.json();
    if (!data.success) {
      container.innerHTML = `<div style="color:#ef4444; font-size:0.9rem; text-align:center; padding:1rem;">❌ ${data.error || 'Kayıt bulunamadı.'}</div>`;
      return;
    }

    const isConfirmed = data.status === 'appointment_confirmed';
    container.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #334155; padding-bottom:0.75rem; margin-bottom:0.75rem;">
        <div>
          <span style="font-size:0.75rem; color:#94a3b8; text-transform:uppercase;">Proje Referansı</span>
          <div style="font-family:monospace; font-size:1.2rem; font-weight:900; color:#38bdf8;">${data.reference_code}</div>
        </div>
        <div style="text-align:right;">
          <span class="badge" style="background:${isConfirmed ? 'rgba(16,185,129,0.2)' : 'rgba(245,158,11,0.2)'}; color:${isConfirmed ? '#10b981' : '#f59e0b'}; border:1px solid ${isConfirmed ? '#10b981' : '#f59e0b'};">
            ${data.status_label}
          </span>
        </div>
      </div>

      <div style="font-size:0.85rem; color:#cbd5e1; line-height:1.6; margin-bottom:1rem;">
        <div>👤 <strong>Müşteri:</strong> ${data.customer_name}</div>
        <div>📅 <strong>Randevu Tarihi:</strong> ${data.appointment_date || 'En Yakın Mesai'} (${data.appointment_time_slot || ''})</div>
        <div>🔒 <strong>Tasarım Durumu:</strong> ${data.is_locked ? 'Kilitli & Fabrika İncelemesinde' : 'Açık'}</div>
        ${data.admin_notes ? `<div style="background:#0f172a; border-left:3px solid #38bdf8; padding:6px 10px; margin-top:8px; color:#e0f2fe;"><strong>Yönetici Notu:</strong> ${data.admin_notes}</div>` : ''}
      </div>

      ${data.customer_email ? `
        <div style="background:rgba(56, 189, 248, 0.1); border:1px solid #38bdf8; border-radius:6px; padding:0.6rem 0.8rem; font-size:0.8rem; color:#93c5fd; margin-bottom:1rem;">
          📧 Randevu takip ve teyit şablonu <strong>${data.customer_email}</strong> adresinize gönderilmiştir.
        </div>
      ` : ''}

      <div style="display:flex; justify-content:flex-end; gap:0.5rem;">
        <button class="btn btn-outline btn-sm" onclick="closeModal('appointment-status-modal')">Kapat</button>
        <button class="btn btn-primary btn-sm" onclick="closeModal('appointment-status-modal'); navigateTo('studio');">
          🎨 3D Showroom'da İncele
        </button>
      </div>
    `;
  } catch (e) {
    container.innerHTML = '<div style="color:#ef4444; font-size:0.9rem; text-align:center; padding:1rem;">Sunucuya bağlanırken hata oluştu.</div>';
  }
};


