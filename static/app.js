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
    // 1. BASE MODULE SUB-ACCORDIONS
    {
      groupKey: 'base_drawer',
      category: 'base',
      title: 'Çekmeceli & Raylı Alt Dolaplar',
      icon: '🗄️',
      open: true,
      items: [
        { type: 'base_drawer_3', name: '3 Çekmeceli Alt Dolap', category: 'base', w: 600, d: 600, h: 720, drawers: 3, hinges: 0, icon: '🗄️', desc: 'Frenli tandem raylı 3 çekmece' },
        { type: 'base_bottle_pullout', name: 'Raylı Dar Şişelik / Yağdanlık', category: 'base', w: 200, d: 600, h: 720, drawers: 1, hinges: 0, allowed_widths: [150, 200, 250], icon: '🍾', desc: 'Frenli raylı 2 katlı paslanmaz tel şişelik' }
      ]
    },
    {
      groupKey: 'base_doors',
      category: 'base',
      title: 'Kapaklı & Eviye Alt Dolapları',
      icon: '🚪',
      open: true,
      items: [
        { type: 'base_standard', name: 'Standart Tek Kapak Alt Dolap', category: 'base', w: 500, d: 600, h: 720, drawers: 0, hinges: 2, icon: '🚪', desc: '1 ayarlı raflı tek kapak' },
        { type: 'base_double', name: 'Çift Kapaklı Geniş Alt Dolap', category: 'base', w: 800, d: 600, h: 720, drawers: 0, hinges: 4, icon: '🚪', desc: 'Geniş tencere depolama' },
        { type: 'base_sink', name: 'Eviye Alt Dolabı (2 Kapak)', category: 'base', w: 900, d: 600, h: 720, drawers: 0, hinges: 4, icon: '💧', desc: 'Inox tek göz evye & kuğu batarya altı' }
      ]
    },
    {
      groupKey: 'base_appliances',
      category: 'base',
      title: 'Pişirme & Bulaşık Modülleri',
      icon: '♨️',
      open: true,
      items: [
        { type: 'base_oven', name: 'Ankastre Fırın & Ocak Modülü', category: 'base', w: 600, d: 600, h: 720, drawers: 1, hinges: 0, icon: '♨️', desc: 'Fırın boşluğu ve alt çekmece' },
        { type: 'base_dishwasher', name: 'Bulaşık Makinesi Paneli', category: 'base', w: 600, d: 600, h: 720, drawers: 0, hinges: 0, icon: '🍽️', desc: '60cm tam ankastre kapağı' }
      ]
    },
    {
      groupKey: 'base_corners',
      category: 'base',
      title: 'Köşe Alt Dolapları',
      icon: '📐',
      open: true,
      items: [
        { type: 'base_corner_l', name: '90° L-Köşe Alt Dolap', category: 'base', w: 900, d: 900, h: 720, drawers: 0, hinges: 2, icon: '📐', desc: '90° L köşe dönüş dolabı (Tek Raflı)' },
        { type: 'base_corner_v', name: 'V-Köşe (45° Diyagonal) Alt Dolap', category: 'base', w: 900, d: 900, h: 720, drawers: 0, hinges: 2, icon: '📐', desc: '45° pahlı diyagonal köşe dolabı (Tek Raflı)' },
        { type: 'base_corner_straight', name: 'Düz Kör Köşe Alt Dolap', category: 'base', w: 1000, d: 600, h: 720, drawers: 0, hinges: 2, icon: '📐', desc: 'Düz kör köşe dönüş dolabı (Tek Raflı)' }
      ]
    },
    {
      groupKey: 'base_open',
      category: 'base',
      title: 'Açık Raflı Alt Modüller',
      icon: '📚',
      open: true,
      items: [
        { type: 'base_open_shelf', name: 'Açık Raflı Alt Modül (Kapaksız)', category: 'base', w: 400, d: 600, h: 720, isOpenShelf: true, shelfCount: 1, drawers: 0, hinges: 0, icon: '📚', desc: '1-3 ayarlı raflı açık alt modül' }
      ]
    },

    // 2. WALL MODULE SUB-ACCORDIONS
    {
      groupKey: 'wall_doors',
      category: 'wall',
      title: 'Kapaklı Asma Dolaplar',
      icon: '📦',
      open: true,
      items: [
        { type: 'wall_single', name: 'Tek Kapaklı Üst Dolap', category: 'wall', w: 500, d: 350, h: 720, drawers: 0, hinges: 2, icon: '📦', desc: 'Dar alan üst depolama' },
        { type: 'wall_double', name: 'Çift Kapaklı Üst Dolap', category: 'wall', w: 800, d: 350, h: 720, drawers: 0, hinges: 4, icon: '📦', desc: 'Standart çift kapaklı üst' }
      ]
    },
    {
      groupKey: 'wall_glass',
      category: 'wall',
      title: 'Camlı & Kalkar Kapaklar',
      icon: '🪟',
      open: true,
      items: [
        { type: 'wall_glass', name: 'Camlı Yatay Kalkar Dolap', category: 'wall', w: 900, d: 350, h: 720, drawers: 0, hinges: 2, icon: '🪟', desc: 'Buzlu cam insets & aventos' }
      ]
    },
    {
      groupKey: 'wall_hood',
      category: 'wall',
      title: 'Aspiratör & Davlumbaz',
      icon: '💨',
      open: true,
      items: [
        { type: 'wall_hood', name: 'Davlumbaz Üstü Aspiratör Dolabı', category: 'wall', w: 600, d: 350, h: 720, drawers: 0, hinges: 2, icon: '💨', desc: 'Karbon filtreli gömme aspiratör' },
        { type: 'wall_hood_chimney', name: 'Açık Paslanmaz Çelik T-Davlumbaz', category: 'wall', w: 600, d: 450, h: 720, drawers: 0, hinges: 0, icon: '🌪️', desc: 'Inox T-tipi açık baca davlumbaz' }
      ]
    },
    {
      groupKey: 'wall_corners',
      category: 'wall',
      title: 'Köşe Üst Dolapları',
      icon: '📐',
      open: true,
      items: [
        { type: 'wall_corner_l', name: '90° L-Köşe Üst Dolabı', category: 'wall', w: 650, d: 650, h: 720, drawers: 0, hinges: 2, icon: '📐', desc: '90° L köşe üst asma (Tek Raflı)' },
        { type: 'wall_corner_v', name: 'V-Köşe (45° Diyagonal) Üst Dolap', category: 'wall', w: 650, d: 650, h: 720, drawers: 0, hinges: 2, icon: '📐', desc: '45° pahlı diyagonal köşe üst dolabı (Tek Raflı)' },
        { type: 'wall_corner_straight', name: 'Düz Kör Köşe Üst Dolap', category: 'wall', w: 650, d: 350, h: 720, drawers: 0, hinges: 2, icon: '📐', desc: 'Düz kör köşe üst dolap (Tek Raflı)' }
      ]
    },
    {
      groupKey: 'wall_open',
      category: 'wall',
      title: 'Açık Raflı Asma Modüller',
      icon: '📚',
      open: true,
      items: [
        { type: 'wall_open_shelf', name: 'Açık Raflı Üst Modül (Kapaksız)', category: 'wall', w: 400, d: 350, h: 720, isOpenShelf: true, shelfCount: 2, drawers: 0, hinges: 0, icon: '📚', desc: '1-3 ayarlı raflı açık üst modül' }
      ]
    },

    // 3. TALL MODULE SUB-ACCORDIONS
    {
      groupKey: 'tall_cooling',
      category: 'tall',
      title: 'Buzdolabı Kabinleri',
      icon: '🧊',
      open: true,
      items: [
        { type: 'tall_fridge', name: 'No-Frost Buzdolabı Kabini', category: 'tall', w: 700, d: 600, h: 2100, drawers: 0, hinges: 2, icon: '🧊', desc: 'Buzdolabı üstü kiler dolabı' }
      ]
    },
    {
      groupKey: 'tall_pantry',
      category: 'tall',
      title: 'Boy Kiler & Fırın Üniteleri',
      icon: '🚪',
      open: true,
      items: [
        { type: 'tall_oven_microwave', name: 'Ankastre Fırın & Mikrodalga Boy Kileri', category: 'tall', w: 600, d: 600, h: 2100, drawers: 2, hinges: 2, allowed_widths: [600], icon: '♨️', desc: 'Göz hizası fırın + mikrodalga ve alt/üst depolama kileri' },
        { type: 'tall_pantry_2d', name: '2 Kapaklı Erzak Boy Kileri', category: 'tall', w: 600, d: 600, h: 2100, drawers: 0, hinges: 4, allowed_widths: [450, 600], icon: '🚪', desc: '5 raflı tam boy kiler' }
      ]
    },

    // 4. APPLIANCE SUB-ACCORDIONS
    {
      groupKey: 'app_cooking',
      category: 'appliance',
      title: 'Pişirme & Havalandırma Cihazları',
      icon: '♨️',
      open: true,
      items: [
        { type: 'app_oven', name: 'Multifonksiyonel Ankastre Fırın', category: 'base', w: 600, d: 600, h: 600, icon: '♨️', desc: 'Dijital programlı siyah cam' }
      ]
    },
    {
      groupKey: 'app_wet',
      category: 'appliance',
      title: 'Yıkama & Eviye Sistemleri',
      icon: '💧',
      open: true,
      items: [
        { type: 'app_sink', name: 'Paslanmaz Çelik Eviye & Kuğu Batarya', category: 'base', w: 860, d: 500, h: 200, icon: '💧', desc: 'Krom kuğu bataryalı tek göz Inox' }
      ]
    },
    {
      groupKey: 'app_cooling',
      category: 'appliance',
      title: 'Soğutma Cihazları',
      icon: '🧊',
      open: true,
      items: [
        { type: 'app_fridge', name: 'Kombi No-Frost Buzdolabı', category: 'tall', w: 700, d: 600, h: 1850, icon: '🧊', desc: 'A++ Inox çift kapılı buzdolabı' }
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
      checkScreenResolutionAdvisory();
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

// 2026 SHOWROOM LIGHTING & ATMOSPHERE MODES
window.cycleLightingMode = function() {
  if (!canvas3D || !canvas3D.setLightingMode) return;
  const modes = ['daylight', 'evening_warm', 'showroom_lux'];
  const cur = canvas3D.currentLightingMode || 'daylight';
  const nextIdx = (modes.indexOf(cur) + 1) % modes.length;
  const nextMode = modes[nextIdx];
  canvas3D.setLightingMode(nextMode);

  const btn = document.getElementById('btn-lighting-mode');
  const modeInfo = {
    daylight: { icon: '☀️', label: 'Gündüz Doğal Işık (5500K)', color: '#f59e0b' },
    evening_warm: { icon: '🌙', label: 'Sıcak Akşam & Gizli Tezgah LED', color: '#f97316' },
    showroom_lux: { icon: '💎', label: 'Lüks Showroom Spotları (PBR Yansıma)', color: '#38bdf8' }
  };
  const info = modeInfo[nextMode] || modeInfo.daylight;
  if (btn) {
    btn.textContent = info.icon;
    btn.style.color = info.color;
  }
  showToast(`✨ Aydınlatma Modu: ${info.icon} ${info.label}`, 'info');
};

// SMART HANDLE DIRECTION (AKILLI KULP YÖNÜ DEĞİŞTİRME)
window.toggleSelectedHandleSide = function() {
  if (!canvas3D) return;
  const selId = canvas3D.selectedModuleId || window.CURRENT_SELECTED_MODULE_ID;
  if (!selId) {
    showToast("Önce kulp yönünü değiştirmek istediğiniz dolaba tıklayınız", "info");
    return;
  }
  const mod = (window.CURRENT_DESIGN.modules || []).find(m => m.id === selId);
  if (!mod) return;

  const curSide = mod.handle_side || canvas3D.getSmartHandleSide(mod, 3600);
  mod.handle_side = (curSide === 'left') ? 'right' : 'left';
  canvas3D.render(window.CURRENT_ROOM_DIMS, window.CURRENT_DESIGN.modules, window.CURRENT_ROOM_DIMS?.layout_type, window.CURRENT_DESIGN.materials);
  showToast(`🔁 ${mod.name}: Kulp açılış yönü ${mod.handle_side === 'left' ? 'SOL' : 'SAĞ'} olarak ayarlandı`, 'info');
};

// RESPONSIVE WIDE SCREEN ADVISORY BANNER
window.dismissScreenAdvisory = function() {
  const banner = document.getElementById('screen-recommendation-banner');
  if (banner) banner.style.display = 'none';
  sessionStorage.setItem('mc_screen_advisory_dismissed', '1');
};

function checkScreenResolutionAdvisory() {
  if (sessionStorage.getItem('mc_screen_advisory_dismissed')) return;
  if (window.innerWidth < 1024) {
    const banner = document.getElementById('screen-recommendation-banner');
    if (banner) banner.style.display = 'flex';
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

// Visual SVG Illustration Generator for 2026 Modular Kitchen Catalog
function getModuleVisualSVG(type, name) {
  // Shared isometric defs for gradients and shadow filter
  const defs = `<defs>
    <linearGradient id="isoTop" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#f8fafc"/>
      <stop offset="100%" stop-color="#e8eef4"/>
    </linearGradient>
    <linearGradient id="isoFront" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#f0f4f8"/>
      <stop offset="100%" stop-color="#e2e8f0"/>
    </linearGradient>
    <linearGradient id="isoSide" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#dce4ec"/>
      <stop offset="100%" stop-color="#cbd5e1"/>
    </linearGradient>
    <linearGradient id="isoCounter" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#a0aec0"/>
      <stop offset="100%" stop-color="#94a3b8"/>
    </linearGradient>
    <linearGradient id="isoDark" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#1e293b"/>
      <stop offset="100%" stop-color="#0f172a"/>
    </linearGradient>
    <linearGradient id="isoGlass" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#e0f2fe" stop-opacity="0.7"/>
      <stop offset="100%" stop-color="#bae6fd" stop-opacity="0.4"/>
    </linearGradient>
    <linearGradient id="isoFridge" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#f1f5f9"/>
      <stop offset="100%" stop-color="#e2e8f0"/>
    </linearGradient>
    <filter id="isoShadow" x="-10%" y="-10%" width="130%" height="140%">
      <feDropShadow dx="1.5" dy="2" stdDeviation="1.5" flood-color="#000000" flood-opacity="0.1"/>
    </filter>
    <filter id="isoShadowSm" x="-10%" y="-10%" width="130%" height="140%">
      <feDropShadow dx="0.8" dy="1" stdDeviation="0.8" flood-color="#000000" flood-opacity="0.08"/>
    </filter>
  </defs>`;

  // 1. BASE MODULES
  if (type === 'base_drawer_3') {
    return `<svg viewBox="0 0 80 60" width="100%" height="100%">
      ${defs}
      <g filter="url(#isoShadow)">
        <!-- Süpürgelik -->
        <rect x="14" y="53" width="50" height="4" rx="0.5" fill="#64748b"/>
        <!-- Yan yüzey (sağ) -->
        <polygon points="64,13 70,10 70,53 64,56" fill="url(#isoSide)" stroke="#b0bec5" stroke-width="0.4"/>
        <!-- Ön yüzey (gövde) -->
        <rect x="14" y="13" width="50" height="40" rx="1" fill="url(#isoFront)" stroke="#b0bec5" stroke-width="0.6"/>
        <!-- Üst yüzey (tezgah) -->
        <polygon points="12,13 64,13 70,10 18,10" fill="url(#isoCounter)" stroke="#8899a6" stroke-width="0.5"/>
        <!-- Tezgah öne bakan kenar -->
        <line x1="12" y1="13" x2="64" y2="13" stroke="#8899a6" stroke-width="0.8"/>
        <!-- Çekmece bölümleri -->
        <line x1="14" y1="26" x2="64" y2="26" stroke="#b0bec5" stroke-width="0.7"/>
        <line x1="14" y1="39" x2="64" y2="39" stroke="#b0bec5" stroke-width="0.7"/>
        <!-- Çekmece olukları (hafif gölge çizgisi) -->
        <line x1="16" y1="27" x2="62" y2="27" stroke="#cbd5e1" stroke-width="0.3"/>
        <line x1="16" y1="40" x2="62" y2="40" stroke="#cbd5e1" stroke-width="0.3"/>
        <!-- Kulplar (yatay) -->
        <line x1="31" y1="19.5" x2="47" y2="19.5" stroke="#475569" stroke-width="2" stroke-linecap="round"/>
        <line x1="31" y1="32.5" x2="47" y2="32.5" stroke="#475569" stroke-width="2" stroke-linecap="round"/>
        <line x1="31" y1="46" x2="47" y2="46" stroke="#475569" stroke-width="2" stroke-linecap="round"/>
        <!-- Kulp gölgeleri -->
        <line x1="31" y1="20.5" x2="47" y2="20.5" stroke="#000" stroke-width="0.5" stroke-linecap="round" opacity="0.06"/>
        <line x1="31" y1="33.5" x2="47" y2="33.5" stroke="#000" stroke-width="0.5" stroke-linecap="round" opacity="0.06"/>
        <line x1="31" y1="47" x2="47" y2="47" stroke="#000" stroke-width="0.5" stroke-linecap="round" opacity="0.06"/>
      </g>
    </svg>`;
  }

  if (type === 'base_bottle_pullout') {
    return `<svg viewBox="0 0 80 60" width="100%" height="100%">
      ${defs}
      <g filter="url(#isoShadow)">
        <!-- Süpürgelik -->
        <rect x="28" y="53" width="26" height="4" rx="0.5" fill="#64748b"/>
        <!-- Yan yüzey -->
        <polygon points="54,13 60,10 60,53 54,56" fill="url(#isoSide)" stroke="#b0bec5" stroke-width="0.4"/>
        <!-- Ön yüzey -->
        <rect x="26" y="13" width="28" height="40" rx="1" fill="url(#isoFront)" stroke="#b0bec5" stroke-width="0.6"/>
        <!-- Üst yüzey (tezgah) -->
        <polygon points="24" y="13" x="54" y="13" x="60" y="10" x="30" y="10"/>
        <polygon points="24,13 54,13 60,10 30,10" fill="url(#isoCounter)" stroke="#8899a6" stroke-width="0.5"/>
        <!-- Dikey kulp -->
        <line x1="30" y1="18" x2="30" y2="34" stroke="#475569" stroke-width="2" stroke-linecap="round"/>
        <line x1="31" y1="18" x2="31" y2="34" stroke="#000" stroke-width="0.5" stroke-linecap="round" opacity="0.06"/>
        <!-- Şişe ikonları -->
        <rect x="37" y="19" width="5" height="12" rx="2" fill="#10b981" opacity="0.8"/>
        <rect x="37" y="16" width="5" height="4" rx="1.5" fill="#10b981" opacity="0.5"/>
        <rect x="44" y="22" width="5" height="12" rx="2" fill="#f59e0b" opacity="0.8"/>
        <rect x="44" y="19" width="5" height="4" rx="1.5" fill="#f59e0b" opacity="0.5"/>
        <rect x="37" y="38" width="5" height="12" rx="2" fill="#ef4444" opacity="0.8"/>
        <rect x="37" y="35" width="5" height="4" rx="1.5" fill="#ef4444" opacity="0.5"/>
      </g>
    </svg>`;
  }

  if (type === 'base_standard') {
    return `<svg viewBox="0 0 80 60" width="100%" height="100%">
      ${defs}
      <g filter="url(#isoShadow)">
        <!-- Süpürgelik -->
        <rect x="14" y="53" width="50" height="4" rx="0.5" fill="#64748b"/>
        <!-- Yan yüzey -->
        <polygon points="64,13 70,10 70,53 64,56" fill="url(#isoSide)" stroke="#b0bec5" stroke-width="0.4"/>
        <!-- Ön yüzey -->
        <rect x="14" y="13" width="50" height="40" rx="1" fill="url(#isoFront)" stroke="#b0bec5" stroke-width="0.6"/>
        <!-- Üst yüzey (tezgah) -->
        <polygon points="12,13 64,13 70,10 18,10" fill="url(#isoCounter)" stroke="#8899a6" stroke-width="0.5"/>
        <!-- Kapak çerçeve ince oluk -->
        <rect x="16" y="15" width="46" height="36" rx="0.5" fill="none" stroke="#cbd5e1" stroke-width="0.4"/>
        <!-- Dikey kulp -->
        <line x1="58" y1="26" x2="58" y2="42" stroke="#475569" stroke-width="2" stroke-linecap="round"/>
        <line x1="59" y1="26" x2="59" y2="42" stroke="#000" stroke-width="0.5" stroke-linecap="round" opacity="0.06"/>
      </g>
    </svg>`;
  }

  if (type === 'base_double') {
    return `<svg viewBox="0 0 80 60" width="100%" height="100%">
      ${defs}
      <g filter="url(#isoShadow)">
        <!-- Süpürgelik -->
        <rect x="14" y="53" width="50" height="4" rx="0.5" fill="#64748b"/>
        <!-- Yan yüzey -->
        <polygon points="64,13 70,10 70,53 64,56" fill="url(#isoSide)" stroke="#b0bec5" stroke-width="0.4"/>
        <!-- Ön yüzey -->
        <rect x="14" y="13" width="50" height="40" rx="1" fill="url(#isoFront)" stroke="#b0bec5" stroke-width="0.6"/>
        <!-- Üst yüzey (tezgah) -->
        <polygon points="12,13 64,13 70,10 18,10" fill="url(#isoCounter)" stroke="#8899a6" stroke-width="0.5"/>
        <!-- Orta çizgi (çift kapak) -->
        <line x1="39" y1="14" x2="39" y2="52" stroke="#b0bec5" stroke-width="0.8"/>
        <!-- Sol kapak oluk -->
        <rect x="16" y="15" width="21" height="36" rx="0.5" fill="none" stroke="#cbd5e1" stroke-width="0.3"/>
        <!-- Sağ kapak oluk -->
        <rect x="41" y="15" width="21" height="36" rx="0.5" fill="none" stroke="#cbd5e1" stroke-width="0.3"/>
        <!-- Çift dikey kulp -->
        <line x1="36" y1="28" x2="36" y2="40" stroke="#475569" stroke-width="2" stroke-linecap="round"/>
        <line x1="42" y1="28" x2="42" y2="40" stroke="#475569" stroke-width="2" stroke-linecap="round"/>
        <!-- Kulp gölge -->
        <line x1="37" y1="28" x2="37" y2="40" stroke="#000" stroke-width="0.5" stroke-linecap="round" opacity="0.06"/>
        <line x1="43" y1="28" x2="43" y2="40" stroke="#000" stroke-width="0.5" stroke-linecap="round" opacity="0.06"/>
      </g>
    </svg>`;
  }

  if (type === 'base_sink') {
    return `<svg viewBox="0 0 80 60" width="100%" height="100%">
      ${defs}
      <g filter="url(#isoShadow)">
        <!-- Süpürgelik -->
        <rect x="14" y="53" width="50" height="4" rx="0.5" fill="#64748b"/>
        <!-- Yan yüzey -->
        <polygon points="64,13 70,10 70,53 64,56" fill="url(#isoSide)" stroke="#b0bec5" stroke-width="0.4"/>
        <!-- Ön yüzey -->
        <rect x="14" y="13" width="50" height="40" rx="1" fill="url(#isoFront)" stroke="#b0bec5" stroke-width="0.6"/>
        <!-- Üst yüzey (tezgah) - evye havuzlu -->
        <polygon points="12,13 64,13 70,10 18,10" fill="url(#isoCounter)" stroke="#8899a6" stroke-width="0.5"/>
        <!-- Evye havuzu (tezgah üstünde) -->
        <rect x="24" y="7" width="28" height="6" rx="2" fill="#94a3b8" stroke="#7a8a9a" stroke-width="0.6"/>
        <rect x="27" y="8.5" width="10" height="3.5" rx="1" fill="#78909c" opacity="0.7"/>
        <rect x="39" y="8.5" width="10" height="3.5" rx="1" fill="#78909c" opacity="0.7"/>
        <!-- Çeşme -->
        <path d="M38 8 Q38 2 43 2 Q46 2 46 5 L46 7" fill="none" stroke="#475569" stroke-width="1.8" stroke-linecap="round"/>
        <!-- Su damlası -->
        <circle cx="46" cy="8.5" r="0.6" fill="#0284c7" opacity="0.6"/>
        <!-- Orta çizgi (çift kapak altında) -->
        <line x1="39" y1="14" x2="39" y2="52" stroke="#b0bec5" stroke-width="0.7"/>
        <!-- Kulplar -->
        <line x1="36" y1="28" x2="36" y2="40" stroke="#475569" stroke-width="2" stroke-linecap="round"/>
        <line x1="42" y1="28" x2="42" y2="40" stroke="#475569" stroke-width="2" stroke-linecap="round"/>
      </g>
    </svg>`;
  }

  if (type === 'base_oven' || type === 'app_oven') {
    return `<svg viewBox="0 0 80 60" width="100%" height="100%">
      ${defs}
      <g filter="url(#isoShadow)">
        <!-- Süpürgelik -->
        <rect x="14" y="53" width="50" height="4" rx="0.5" fill="#64748b"/>
        <!-- Yan yüzey -->
        <polygon points="64,12 70,9 70,53 64,56" fill="#1a2332" stroke="#334155" stroke-width="0.4"/>
        <!-- Ön yüzey (koyu fırın gövdesi) -->
        <rect x="14" y="12" width="50" height="41" rx="1" fill="url(#isoDark)" stroke="#475569" stroke-width="0.8"/>
        <!-- Üst panel (düğmeler) -->
        <rect x="14" y="9" width="50" height="4" fill="#1e293b" stroke="#334155" stroke-width="0.3"/>
        <polygon points="12,12 64,12 70,9 18,9" fill="#2d3a4a" stroke="#475569" stroke-width="0.4"/>
        <!-- Kırmızı düğmeler -->
        <circle cx="24" cy="11" r="1.8" fill="#ef4444"/>
        <circle cx="30" cy="11" r="1.8" fill="#ef4444"/>
        <circle cx="48" cy="11" r="1.8" fill="#ef4444"/>
        <circle cx="54" cy="11" r="1.8" fill="#ef4444"/>
        <!-- Düğme parlama -->
        <circle cx="23.5" cy="10.5" r="0.5" fill="#fff" opacity="0.3"/>
        <circle cx="29.5" cy="10.5" r="0.5" fill="#fff" opacity="0.3"/>
        <circle cx="47.5" cy="10.5" r="0.5" fill="#fff" opacity="0.3"/>
        <circle cx="53.5" cy="10.5" r="0.5" fill="#fff" opacity="0.3"/>
        <!-- Fırın cam kapak -->
        <rect x="19" y="18" width="40" height="26" rx="2" fill="#1e293b" stroke="#64748b" stroke-width="0.7"/>
        <rect x="21" y="20" width="36" height="22" rx="1.5" fill="#263040" opacity="0.9"/>
        <!-- Cam yansıma -->
        <line x1="23" y1="38" x2="33" y2="22" stroke="#fff" stroke-width="1" stroke-linecap="round" opacity="0.12"/>
        <line x1="28" y1="40" x2="40" y2="24" stroke="#fff" stroke-width="0.6" stroke-linecap="round" opacity="0.08"/>
        <!-- Fırın ızgaraları -->
        <line x1="23" y1="26" x2="55" y2="26" stroke="#94a3b8" stroke-width="0.8" opacity="0.5"/>
        <line x1="23" y1="31" x2="55" y2="31" stroke="#94a3b8" stroke-width="0.8" opacity="0.5"/>
        <line x1="23" y1="36" x2="55" y2="36" stroke="#94a3b8" stroke-width="0.6" opacity="0.4"/>
        <!-- Alt kulp (yatay) -->
        <line x1="30" y1="48" x2="48" y2="48" stroke="#94a3b8" stroke-width="1.8" stroke-linecap="round"/>
      </g>
    </svg>`;
  }

  if (type === 'base_dishwasher') {
    return `<svg viewBox="0 0 80 60" width="100%" height="100%">
      ${defs}
      <g filter="url(#isoShadow)">
        <!-- Süpürgelik -->
        <rect x="14" y="53" width="50" height="4" rx="0.5" fill="#64748b"/>
        <!-- Yan yüzey -->
        <polygon points="64,13 70,10 70,53 64,56" fill="url(#isoSide)" stroke="#b0bec5" stroke-width="0.4"/>
        <!-- Ön yüzey (metalik) -->
        <rect x="14" y="13" width="50" height="40" rx="1" fill="url(#isoFront)" stroke="#b0bec5" stroke-width="0.6"/>
        <!-- Üst yüzey (tezgah) -->
        <polygon points="12,13 64,13 70,10 18,10" fill="url(#isoCounter)" stroke="#8899a6" stroke-width="0.5"/>
        <!-- Üst kontrol paneli (koyu) -->
        <rect x="16" y="15" width="46" height="6" fill="#1e293b" rx="1"/>
        <!-- Yeşil LED -->
        <circle cx="21" cy="18" r="1.2" fill="#10b981"/>
        <circle cx="21" cy="18" r="2" fill="#10b981" opacity="0.2"/>
        <!-- Panel gösterge çizgileri -->
        <line x1="28" y1="17" x2="34" y2="17" stroke="#64748b" stroke-width="0.6"/>
        <line x1="28" y1="19" x2="38" y2="19" stroke="#64748b" stroke-width="0.6"/>
        <!-- Yatay kulp -->
        <line x1="28" y1="26" x2="50" y2="26" stroke="#475569" stroke-width="2.2" stroke-linecap="round"/>
        <line x1="28" y1="27" x2="50" y2="27" stroke="#000" stroke-width="0.5" stroke-linecap="round" opacity="0.06"/>
        <!-- Metalik yüzey efekti -->
        <line x1="16" y1="35" x2="62" y2="35" stroke="#e2e8f0" stroke-width="0.3" opacity="0.5"/>
        <line x1="16" y1="45" x2="62" y2="45" stroke="#e2e8f0" stroke-width="0.3" opacity="0.5"/>
        <!-- Marka plaketi -->
        <rect x="34" y="40" width="10" height="3" rx="0.5" fill="#e2e8f0" opacity="0.5"/>
      </g>
    </svg>`;
  }

  if (type && type.startsWith('base_corner')) {
    return `<svg viewBox="0 0 80 60" width="100%" height="100%">
      ${defs}
      <g filter="url(#isoShadow)">
        <!-- Süpürgelik L -->
        <polygon points="14,52 62,52 62,46 44,46 44,56 14,56" fill="#64748b"/>
        <!-- L gövde ön yüzey -->
        <polygon points="14,13 62,13 62,30 44,30 44,52 14,52" fill="url(#isoFront)" stroke="#b0bec5" stroke-width="0.6"/>
        <!-- Üst yüzey (L-şekil tezgah) -->
        <polygon points="12,13 62,13 68,10 18,10" fill="url(#isoCounter)" stroke="#8899a6" stroke-width="0.5"/>
        <polygon points="62,13 62,30 68,27 68,10" fill="url(#isoSide)" stroke="#b0bec5" stroke-width="0.4"/>
        <!-- Sağ dikey yan yüzey -->
        <polygon points="44,30 44,52 50,49 50,27" fill="url(#isoSide)" stroke="#b0bec5" stroke-width="0.4"/>
        <!-- Üst L uzantı -->
        <polygon points="44,30 50,27 68,27 62,30" fill="url(#isoCounter)" stroke="#8899a6" stroke-width="0.3"/>
        <!-- 90° etiketi -->
        <text x="30" y="36" font-size="9" font-weight="bold" fill="#0284c7" font-family="sans-serif">90°</text>
        <!-- Köşe açı göstergesi -->
        <path d="M42 32 L42 28 L38 28" fill="none" stroke="#0284c7" stroke-width="0.8" opacity="0.6"/>
      </g>
    </svg>`;
  }

  if (type === 'base_open_shelf') {
    return `<svg viewBox="0 0 80 60" width="100%" height="100%">
      ${defs}
      <g filter="url(#isoShadow)">
        <!-- Süpürgelik -->
        <rect x="14" y="53" width="50" height="4" rx="0.5" fill="#64748b"/>
        <!-- Yan yüzey -->
        <polygon points="64,13 70,10 70,53 64,56" fill="url(#isoSide)" stroke="#b0bec5" stroke-width="0.4"/>
        <!-- Ön yüzey (açık raf - iç görünüm) -->
        <rect x="14" y="13" width="50" height="40" rx="1" fill="#edf2f7" stroke="#b0bec5" stroke-width="0.6"/>
        <!-- Üst yüzey (tezgah) -->
        <polygon points="12,13 64,13 70,10 18,10" fill="url(#isoCounter)" stroke="#8899a6" stroke-width="0.5"/>
        <!-- Arka duvar (hafif koyu) -->
        <rect x="15" y="14" width="48" height="38" rx="0.5" fill="#e2e8f0" opacity="0.5"/>
        <!-- Raf çizgileri -->
        <line x1="15" y1="27" x2="63" y2="27" stroke="#94a3b8" stroke-width="1.2"/>
        <line x1="15" y1="40" x2="63" y2="40" stroke="#94a3b8" stroke-width="1.2"/>
        <!-- Raf gölgeleri -->
        <line x1="15" y1="28" x2="63" y2="28" stroke="#000" stroke-width="0.4" opacity="0.06"/>
        <line x1="15" y1="41" x2="63" y2="41" stroke="#000" stroke-width="0.4" opacity="0.06"/>
        <!-- Raf üstü dekor (küçük detaylar) -->
        <rect x="20" y="22" width="6" height="5" rx="0.5" fill="#cbd5e1" opacity="0.6"/>
        <rect x="30" y="20" width="4" height="7" rx="0.5" fill="#cbd5e1" opacity="0.5"/>
      </g>
    </svg>`;
  }

  // 2. WALL MODULES
  if (type === 'wall_single') {
    return `<svg viewBox="0 0 80 60" width="100%" height="100%">
      ${defs}
      <g filter="url(#isoShadowSm)">
        <!-- Yan yüzey -->
        <polygon points="64,12 70,9 70,52 64,55" fill="url(#isoSide)" stroke="#b0bec5" stroke-width="0.4"/>
        <!-- Ön yüzey -->
        <rect x="14" y="12" width="50" height="43" rx="1" fill="url(#isoFront)" stroke="#b0bec5" stroke-width="0.6"/>
        <!-- Üst yüzey -->
        <polygon points="12,12 64,12 70,9 18,9" fill="url(#isoTop)" stroke="#b0bec5" stroke-width="0.4"/>
        <!-- Alt yüzey kenarı -->
        <line x1="14" y1="55" x2="64" y2="55" stroke="#94a3b8" stroke-width="0.5"/>
        <!-- Kapak oluk -->
        <rect x="16" y="14" width="46" height="39" rx="0.5" fill="none" stroke="#dce4ec" stroke-width="0.4"/>
        <!-- Dikey kulp -->
        <line x1="57" y1="30" x2="57" y2="44" stroke="#475569" stroke-width="2" stroke-linecap="round"/>
        <line x1="58" y1="30" x2="58" y2="44" stroke="#000" stroke-width="0.5" stroke-linecap="round" opacity="0.06"/>
      </g>
    </svg>`;
  }

  if (type === 'wall_double') {
    return `<svg viewBox="0 0 80 60" width="100%" height="100%">
      ${defs}
      <g filter="url(#isoShadowSm)">
        <!-- Yan yüzey -->
        <polygon points="64,12 70,9 70,52 64,55" fill="url(#isoSide)" stroke="#b0bec5" stroke-width="0.4"/>
        <!-- Ön yüzey -->
        <rect x="14" y="12" width="50" height="43" rx="1" fill="url(#isoFront)" stroke="#b0bec5" stroke-width="0.6"/>
        <!-- Üst yüzey -->
        <polygon points="12,12 64,12 70,9 18,9" fill="url(#isoTop)" stroke="#b0bec5" stroke-width="0.4"/>
        <!-- Orta çizgi -->
        <line x1="39" y1="13" x2="39" y2="54" stroke="#b0bec5" stroke-width="0.8"/>
        <!-- Sol kapak oluk -->
        <rect x="16" y="14" width="21" height="39" rx="0.5" fill="none" stroke="#dce4ec" stroke-width="0.3"/>
        <!-- Sağ kapak oluk -->
        <rect x="41" y="14" width="21" height="39" rx="0.5" fill="none" stroke="#dce4ec" stroke-width="0.3"/>
        <!-- Çift kulp -->
        <line x1="36" y1="30" x2="36" y2="44" stroke="#475569" stroke-width="2" stroke-linecap="round"/>
        <line x1="42" y1="30" x2="42" y2="44" stroke="#475569" stroke-width="2" stroke-linecap="round"/>
        <line x1="37" y1="30" x2="37" y2="44" stroke="#000" stroke-width="0.5" stroke-linecap="round" opacity="0.06"/>
        <line x1="43" y1="30" x2="43" y2="44" stroke="#000" stroke-width="0.5" stroke-linecap="round" opacity="0.06"/>
      </g>
    </svg>`;
  }

  if (type === 'wall_glass') {
    return `<svg viewBox="0 0 80 60" width="100%" height="100%">
      ${defs}
      <g filter="url(#isoShadowSm)">
        <!-- Yan yüzey -->
        <polygon points="64,12 70,9 70,50 64,53" fill="url(#isoSide)" stroke="#b0bec5" stroke-width="0.4"/>
        <!-- Ön yüzey (çerçeve) -->
        <rect x="14" y="12" width="50" height="41" rx="1" fill="url(#isoFront)" stroke="#b0bec5" stroke-width="0.6"/>
        <!-- Üst yüzey -->
        <polygon points="12,12 64,12 70,9 18,9" fill="url(#isoTop)" stroke="#b0bec5" stroke-width="0.4"/>
        <!-- Cam panel -->
        <rect x="18" y="16" width="42" height="33" rx="1.5" fill="url(#isoGlass)" stroke="#7dd3fc" stroke-width="0.8"/>
        <!-- Cam yansıma efektleri -->
        <line x1="22" y1="44" x2="36" y2="20" stroke="#ffffff" stroke-width="1.5" stroke-linecap="round" opacity="0.25"/>
        <line x1="28" y1="46" x2="44" y2="22" stroke="#ffffff" stroke-width="0.8" stroke-linecap="round" opacity="0.15"/>
        <!-- İkinci yansıma -->
        <line x1="46" y1="44" x2="54" y2="26" stroke="#ffffff" stroke-width="0.5" stroke-linecap="round" opacity="0.1"/>
        <!-- Alt yatay kulp -->
        <line x1="30" y1="50" x2="48" y2="50" stroke="#475569" stroke-width="2" stroke-linecap="round"/>
        <line x1="30" y1="51" x2="48" y2="51" stroke="#000" stroke-width="0.5" stroke-linecap="round" opacity="0.06"/>
        <!-- Cam çerçeve raf (ortada) -->
        <line x1="19" y1="32" x2="59" y2="32" stroke="#7dd3fc" stroke-width="0.5" opacity="0.5"/>
      </g>
    </svg>`;
  }

  if (type === 'wall_hood') {
    return `<svg viewBox="0 0 80 60" width="100%" height="100%">
      ${defs}
      <g filter="url(#isoShadow)">
        <!-- Üst dolap bölümü - Yan yüzey -->
        <polygon points="64,10 70,7 70,40 64,43" fill="url(#isoSide)" stroke="#b0bec5" stroke-width="0.4"/>
        <!-- Üst dolap ön yüzey -->
        <rect x="14" y="10" width="50" height="33" rx="1" fill="url(#isoFront)" stroke="#b0bec5" stroke-width="0.6"/>
        <!-- Dolap üst yüzey -->
        <polygon points="12,10 64,10 70,7 18,7" fill="url(#isoTop)" stroke="#b0bec5" stroke-width="0.4"/>
        <!-- Orta çizgi (çift kapak) -->
        <line x1="39" y1="11" x2="39" y2="42" stroke="#b0bec5" stroke-width="0.7"/>
        <!-- Davlumbaz gövdesi -->
        <polygon points="14,43 64,43 68,46 10,46" fill="#cbd5e1" stroke="#94a3b8" stroke-width="0.6"/>
        <rect x="10" y="46" width="60" height="8" rx="1" fill="#b0bec5" stroke="#8899a6" stroke-width="0.6"/>
        <!-- Davlumbaz yan -->
        <polygon points="68,46 74,43 74,54 68,54" fill="#9aa8b8" stroke="#8899a6" stroke-width="0.3"/>
        <!-- Davlumbaz alt ızgara -->
        <line x1="16" y1="50" x2="64" y2="50" stroke="#8899a6" stroke-width="1" stroke-dasharray="3,2"/>
        <line x1="16" y1="52" x2="64" y2="52" stroke="#8899a6" stroke-width="0.6" stroke-dasharray="2,2"/>
        <!-- Davlumbaz ışığı -->
        <circle cx="39" cy="48" r="1.5" fill="#fbbf24" opacity="0.6"/>
      </g>
    </svg>`;
  }

  if (type === 'wall_hood_chimney') {
    return `<svg viewBox="0 0 80 60" width="100%" height="100%">
      ${defs}
      <g filter="url(#isoShadow)">
        <!-- Baca (üst kısım) -->
        <rect x="33" y="4" width="14" height="30" fill="#94a3b8" stroke="#7a8a9a" stroke-width="0.6"/>
        <!-- Baca yan yüzey -->
        <polygon points="47,4 53,1 53,31 47,34" fill="#849aaa" stroke="#7a8a9a" stroke-width="0.3"/>
        <!-- Baca üst -->
        <polygon points="33,4 47,4 53,1 39,1" fill="#a0b0be" stroke="#7a8a9a" stroke-width="0.3"/>
        <!-- Piramidal davlumbaz gövdesi -->
        <polygon points="10,48 68,48 60,38 18,38" fill="#cbd5e1" stroke="#8899a6" stroke-width="0.8"/>
        <!-- Davlumbaz yan -->
        <polygon points="68,48 74,45 66,35 60,38" fill="#b0bec5" stroke="#8899a6" stroke-width="0.4"/>
        <!-- Davlumbaz üst -->
        <polygon points="18,38 60,38 66,35 24,35" fill="#dce4ec" stroke="#8899a6" stroke-width="0.3"/>
        <!-- Alt kenar -->
        <rect x="8" y="48" width="62" height="5" rx="1" fill="#8899a6" stroke="#7a8a9a" stroke-width="0.5"/>
        <!-- Alt ızgara/filtre -->
        <line x1="14" y1="50" x2="64" y2="50" stroke="#64748b" stroke-width="0.8" stroke-dasharray="2,1.5"/>
        <!-- LED ışıklar -->
        <circle cx="30" cy="50" r="1" fill="#fbbf24" opacity="0.5"/>
        <circle cx="48" cy="50" r="1" fill="#fbbf24" opacity="0.5"/>
      </g>
    </svg>`;
  }

  if (type && type.startsWith('wall_corner')) {
    return `<svg viewBox="0 0 80 60" width="100%" height="100%">
      ${defs}
      <g filter="url(#isoShadowSm)">
        <!-- L-şekilli ön yüzey -->
        <polygon points="14,10 64,10 64,30 44,30 44,50 14,50" fill="url(#isoFront)" stroke="#b0bec5" stroke-width="0.6"/>
        <!-- Üst yüzey L -->
        <polygon points="12,10 64,10 70,7 18,7" fill="url(#isoTop)" stroke="#b0bec5" stroke-width="0.4"/>
        <!-- Sağ yan yüzey (üst kısım) -->
        <polygon points="64,10 70,7 70,27 64,30" fill="url(#isoSide)" stroke="#b0bec5" stroke-width="0.4"/>
        <!-- Sağ yan yüzey (alt çıkıntı) -->
        <polygon points="44,30 50,27 50,47 44,50" fill="url(#isoSide)" stroke="#b0bec5" stroke-width="0.4"/>
        <!-- L üst uzantı -->
        <polygon points="44,30 50,27 70,27 64,30" fill="url(#isoTop)" stroke="#b0bec5" stroke-width="0.3"/>
        <!-- 90° etiketi -->
        <text x="28" y="34" font-size="9" font-weight="bold" fill="#0284c7" font-family="sans-serif">90°</text>
        <!-- Köşe açı gösterge -->
        <path d="M42 32 L42 28 L38 28" fill="none" stroke="#0284c7" stroke-width="0.8" opacity="0.6"/>
      </g>
    </svg>`;
  }

  if (type === 'wall_open_shelf') {
    return `<svg viewBox="0 0 80 60" width="100%" height="100%">
      ${defs}
      <g filter="url(#isoShadowSm)">
        <!-- Yan yüzey -->
        <polygon points="64,10 70,7 70,54 64,57" fill="url(#isoSide)" stroke="#b0bec5" stroke-width="0.4"/>
        <!-- Ön yüzey (açık raf) -->
        <rect x="14" y="10" width="50" height="47" rx="1" fill="#edf2f7" stroke="#b0bec5" stroke-width="0.6"/>
        <!-- Üst yüzey -->
        <polygon points="12,10 64,10 70,7 18,7" fill="url(#isoTop)" stroke="#b0bec5" stroke-width="0.4"/>
        <!-- Arka duvar -->
        <rect x="15" y="11" width="48" height="45" rx="0.5" fill="#e2e8f0" opacity="0.4"/>
        <!-- Raf çizgileri -->
        <line x1="15" y1="24" x2="63" y2="24" stroke="#94a3b8" stroke-width="1.2"/>
        <line x1="15" y1="38" x2="63" y2="38" stroke="#94a3b8" stroke-width="1.2"/>
        <line x1="15" y1="50" x2="63" y2="50" stroke="#94a3b8" stroke-width="1"/>
        <!-- Raf gölgeleri -->
        <line x1="15" y1="25" x2="63" y2="25" stroke="#000" stroke-width="0.4" opacity="0.05"/>
        <line x1="15" y1="39" x2="63" y2="39" stroke="#000" stroke-width="0.4" opacity="0.05"/>
        <!-- Raf dekor objeleri -->
        <rect x="20" y="27" width="5" height="10" rx="0.5" fill="#cbd5e1" opacity="0.5"/>
        <rect x="28" y="30" width="4" height="7" rx="0.5" fill="#cbd5e1" opacity="0.4"/>
        <circle cx="44" cy="33" r="3" fill="#cbd5e1" opacity="0.4"/>
      </g>
    </svg>`;
  }

  // 3. TALL MODULES
  if (type === 'tall_fridge' || type === 'app_fridge') {
    return `<svg viewBox="0 0 80 60" width="100%" height="100%">
      ${defs}
      <g filter="url(#isoShadow)">
        <!-- Süpürgelik -->
        <rect x="22" y="55" width="34" height="3" rx="0.5" fill="#64748b"/>
        <!-- Yan yüzey -->
        <polygon points="56,5 64,2 64,55 56,58" fill="#cbd5e1" stroke="#b0bec5" stroke-width="0.4"/>
        <!-- Ön yüzey (buzdolabı gövdesi) -->
        <rect x="20" y="5" width="36" height="50" rx="2" fill="url(#isoFridge)" stroke="#94a3b8" stroke-width="0.8"/>
        <!-- Üst yüzey -->
        <polygon points="18,5 56,5 64,2 26,2" fill="#f1f5f9" stroke="#b0bec5" stroke-width="0.4"/>
        <!-- Dondurucu bölüm (üst) -->
        <rect x="21" y="6" width="34" height="14" fill="#f8fafc" stroke="#b0bec5" stroke-width="0.5"/>
        <!-- Alt buzdolabı bölüm -->
        <rect x="21" y="21" width="34" height="33" fill="#f8fafc" stroke="#b0bec5" stroke-width="0.5"/>
        <!-- Ayırıcı çizgi -->
        <line x1="21" y1="20" x2="55" y2="20" stroke="#94a3b8" stroke-width="1"/>
        <!-- Ekran paneli -->
        <rect x="25" y="25" width="10" height="8" rx="1" fill="#0f172a" stroke="#334155" stroke-width="0.5"/>
        <!-- Ekran ışığı -->
        <rect x="26" y="26" width="8" height="4" rx="0.5" fill="#0284c7" opacity="0.4"/>
        <text x="30" y="29" font-size="3" fill="#7dd3fc" text-anchor="middle" font-family="sans-serif">-18°</text>
        <!-- Kulp (dondurucu) -->
        <line x1="52" y1="9" x2="52" y2="17" stroke="#475569" stroke-width="1.8" stroke-linecap="round"/>
        <!-- Kulp (buzdolabı) -->
        <line x1="52" y1="24" x2="52" y2="40" stroke="#475569" stroke-width="1.8" stroke-linecap="round"/>
        <!-- Kulp gölgeleri -->
        <line x1="53" y1="9" x2="53" y2="17" stroke="#000" stroke-width="0.5" stroke-linecap="round" opacity="0.06"/>
        <line x1="53" y1="24" x2="53" y2="40" stroke="#000" stroke-width="0.5" stroke-linecap="round" opacity="0.06"/>
        <!-- Marka plaketi -->
        <rect x="36" y="36" width="10" height="2.5" rx="0.5" fill="#cbd5e1" opacity="0.6"/>
      </g>
    </svg>`;
  }

  if (type === 'tall_pantry_2d') {
    return `<svg viewBox="0 0 80 60" width="100%" height="100%">
      ${defs}
      <g filter="url(#isoShadow)">
        <!-- Süpürgelik -->
        <rect x="22" y="55" width="34" height="3" rx="0.5" fill="#64748b"/>
        <!-- Yan yüzey -->
        <polygon points="56,5 64,2 64,55 56,58" fill="url(#isoSide)" stroke="#b0bec5" stroke-width="0.4"/>
        <!-- Ön yüzey -->
        <rect x="20" y="5" width="36" height="50" rx="1" fill="url(#isoFront)" stroke="#b0bec5" stroke-width="0.6"/>
        <!-- Üst yüzey -->
        <polygon points="18,5 56,5 64,2 26,2" fill="url(#isoTop)" stroke="#b0bec5" stroke-width="0.4"/>
        <!-- Üst kapak bölümü -->
        <line x1="20" y1="22" x2="56" y2="22" stroke="#b0bec5" stroke-width="0.8"/>
        <!-- Orta çizgi (çift kapak) -->
        <line x1="38" y1="6" x2="38" y2="54" stroke="#b0bec5" stroke-width="0.7"/>
        <!-- Sol kapak olukları -->
        <rect x="22" y="7" width="14" height="14" rx="0.3" fill="none" stroke="#dce4ec" stroke-width="0.3"/>
        <rect x="22" y="24" width="14" height="29" rx="0.3" fill="none" stroke="#dce4ec" stroke-width="0.3"/>
        <!-- Sağ kapak olukları -->
        <rect x="40" y="7" width="14" height="14" rx="0.3" fill="none" stroke="#dce4ec" stroke-width="0.3"/>
        <rect x="40" y="24" width="14" height="29" rx="0.3" fill="none" stroke="#dce4ec" stroke-width="0.3"/>
        <!-- Kulplar (üst) -->
        <line x1="35" y1="11" x2="35" y2="18" stroke="#475569" stroke-width="1.5" stroke-linecap="round"/>
        <line x1="41" y1="11" x2="41" y2="18" stroke="#475569" stroke-width="1.5" stroke-linecap="round"/>
        <!-- Kulplar (alt) -->
        <line x1="35" y1="30" x2="35" y2="44" stroke="#475569" stroke-width="1.5" stroke-linecap="round"/>
        <line x1="41" y1="30" x2="41" y2="44" stroke="#475569" stroke-width="1.5" stroke-linecap="round"/>
      </g>
    </svg>`;
  }

  if (type === 'tall_oven_microwave') {
    return `<svg viewBox="0 0 80 60" width="100%" height="100%">
      ${defs}
      <g filter="url(#isoShadow)">
        <!-- Süpürgelik -->
        <rect x="22" y="55" width="34" height="3" rx="0.5" fill="#64748b"/>
        <!-- Yan yüzey -->
        <polygon points="56,5 64,2 64,55 56,58" fill="url(#isoSide)" stroke="#b0bec5" stroke-width="0.4"/>
        <!-- Ön yüzey (gövde) -->
        <rect x="20" y="5" width="36" height="50" rx="1" fill="url(#isoFront)" stroke="#b0bec5" stroke-width="0.6"/>
        <!-- Üst yüzey -->
        <polygon points="18,5 56,5 64,2 26,2" fill="url(#isoTop)" stroke="#b0bec5" stroke-width="0.4"/>
        <!-- Üst dolap bölümü -->
        <rect x="21" y="6" width="34" height="8" fill="url(#isoFront)" stroke="#b0bec5" stroke-width="0.4"/>
        <line x1="52" y1="8" x2="52" y2="12" stroke="#475569" stroke-width="1.2" stroke-linecap="round"/>
        <!-- Mikrodalga (orta-üst) -->
        <rect x="22" y="16" width="32" height="11" rx="1" fill="#1e293b" stroke="#475569" stroke-width="0.6"/>
        <rect x="24" y="17.5" width="22" height="8" rx="0.8" fill="#263040"/>
        <!-- Mikrodalga cam yansıma -->
        <line x1="26" y1="24" x2="32" y2="18" stroke="#fff" stroke-width="0.5" opacity="0.15"/>
        <!-- Mikrodalga kontrol -->
        <rect x="48" y="18" width="4" height="6" rx="0.5" fill="#334155"/>
        <circle cx="50" cy="20" r="1" fill="#94a3b8"/>
        <!-- Fırın (orta-alt) -->
        <rect x="22" y="29" width="32" height="15" rx="1" fill="#0f172a" stroke="#475569" stroke-width="0.6"/>
        <rect x="24" y="31" width="28" height="11" rx="0.8" fill="#1a2536"/>
        <!-- Fırın cam yansıma -->
        <line x1="26" y1="40" x2="34" y2="32" stroke="#fff" stroke-width="0.6" opacity="0.12"/>
        <!-- Fırın ızgaralar -->
        <line x1="26" y1="35" x2="50" y2="35" stroke="#475569" stroke-width="0.5" opacity="0.6"/>
        <line x1="26" y1="38" x2="50" y2="38" stroke="#475569" stroke-width="0.5" opacity="0.5"/>
        <!-- Fırın kulp -->
        <line x1="30" y1="44" x2="46" y2="44" stroke="#94a3b8" stroke-width="1.5" stroke-linecap="round"/>
        <!-- Alt dolap bölümü -->
        <line x1="20" y1="46" x2="56" y2="46" stroke="#b0bec5" stroke-width="0.7"/>
        <line x1="52" y1="48" x2="52" y2="53" stroke="#475569" stroke-width="1.2" stroke-linecap="round"/>
      </g>
    </svg>`;
  }

  // 4. APPLIANCES
  if (type === 'app_sink') {
    return `<svg viewBox="0 0 80 60" width="100%" height="100%">
      ${defs}
      <g filter="url(#isoShadow)">
        <!-- Tezgah yüzeyi -->
        <polygon points="10,22 66,22 72,18 16,18" fill="url(#isoCounter)" stroke="#8899a6" stroke-width="0.5"/>
        <!-- Tezgah ön yüzey -->
        <rect x="10" y="22" width="56" height="24" rx="1.5" fill="#cbd5e1" stroke="#94a3b8" stroke-width="0.7"/>
        <!-- Tezgah yan yüzey -->
        <polygon points="66,22 72,18 72,44 66,46" fill="#b0bec5" stroke="#94a3b8" stroke-width="0.3"/>
        <!-- Evye havuzu (gömme, tezgah üstünde) -->
        <rect x="18" y="15" width="28" height="7" rx="2" fill="#78909c" stroke="#607d8b" stroke-width="0.6"/>
        <!-- Sol havuz -->
        <rect x="20" y="16.5" width="11" height="4.5" rx="1" fill="#607d8b" opacity="0.7"/>
        <!-- Sağ havuz -->
        <rect x="33" y="16.5" width="11" height="4.5" rx="1" fill="#607d8b" opacity="0.7"/>
        <!-- Su gideri -->
        <circle cx="25.5" cy="19" r="1" fill="#546e7a"/>
        <circle cx="38.5" cy="19" r="1" fill="#546e7a"/>
        <!-- Çeşme gövdesi -->
        <path d="M50 17 Q50 7 55 7 Q59 7 59 11 L59 15" fill="none" stroke="#475569" stroke-width="2.2" stroke-linecap="round"/>
        <!-- Çeşme ucu -->
        <circle cx="59" cy="15.5" r="1" fill="#475569"/>
        <!-- Su damlası -->
        <ellipse cx="59" cy="17.5" rx="0.5" ry="0.8" fill="#0284c7" opacity="0.5"/>
        <!-- Çeşme kolu -->
        <line x1="48" y1="10" x2="52" y2="10" stroke="#475569" stroke-width="1.5" stroke-linecap="round"/>
      </g>
    </svg>`;
  }

  // Fallback icon
  return `<svg viewBox="0 0 80 60" width="100%" height="100%">
    <rect x="15" y="12" width="50" height="40" rx="2" fill="#f8fafc" stroke="#94a3b8" stroke-width="1"/>
    <text x="40" y="36" font-size="16" text-anchor="middle" fill="#64748b">📦</text>
  </svg>`;
}

// Visual Module Catalog Generator with 2-Column Visual Cards
async function loadCategoryModules(catKey) {
  const container = document.getElementById('studio-module-catalog');
  if (!container) return;

  const groups = ADEKO_MODULE_GROUPS[catKey] || ADEKO_MODULE_GROUPS.kitchen;

  // Ensure default width options for all modules
  groups.forEach(grp => {
    grp.items.forEach(m => {
      if (!m.allowed_widths) {
        if (m.type === 'base_standard' || m.type === 'wall_single') m.allowed_widths = [300, 400, 450, 500, 600];
        else if (m.type === 'base_double' || m.type === 'wall_double') m.allowed_widths = [600, 800, 900, 1000];
        else if (m.type === 'base_drawer_3') m.allowed_widths = [400, 450, 600, 800, 900];
        else if (m.type === 'base_bottle_pullout') m.allowed_widths = [150, 200, 250];
        else if (m.type === 'base_sink' || m.type === 'wall_glass') m.allowed_widths = [600, 800, 900, 1000];
        else if (m.type === 'wall_hood' || m.type === 'wall_hood_chimney') m.allowed_widths = [600, 900];
        else if (m.type === 'tall_pantry_2d' || m.type === 'tall_oven_microwave') m.allowed_widths = [450, 600];
        else m.allowed_widths = [m.w || 600];
      }
      if (m.allow_custom_width === undefined) {
        m.allow_custom_width = !['base_drawer_3', 'base_bottle_pullout', 'base_oven', 'base_dishwasher', 'wall_hood', 'wall_hood_chimney', 'tall_oven_microwave'].includes(m.type);
      }
      m.selected_w = m.selected_w || m.w || m.allowed_widths[0];
      m.w = m.selected_w;
    });
  });

  window.CURRENT_CATALOG_GROUPS = groups;
  renderFlyoutCategory(window.CURRENT_FLYOUT_KEY || 'base');
}

function renderCatalogModulesDOM(groups, appendOnly = false) {
  const container = document.getElementById('studio-module-catalog');
  if (!container) return;

  if (!appendOnly) {
    container.innerHTML = '';
  }
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
          <span class="acc-arrow">${grp.open ? '▲' : '▼'}</span>
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
      item.title = `${m.name} - Tuvale sürükleyip bırakın veya + Ekle butonuna basın`;

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
      item.innerHTML = renderVisualModuleCardInner(m, remSpace);

      contentDiv.appendChild(item);
    });
  });
}

function renderVisualModuleCardInner(m, remSpace) {
  const widths = m.allowed_widths || [m.w || 600];
  const curW = m.selected_w || m.w || widths[0];
  const svgHtml = getModuleVisualSVG(m.type, m.name);

  let widthOptions = '';
  widths.forEach(w => {
    const wCm = Math.round(w / 10);
    const fits = w <= remSpace;
    widthOptions += `<option value="${w}" ${w === curW ? 'selected' : ''} ${fits ? '' : 'disabled'}>${wCm} cm ${fits ? '' : '(Dolu)'}</option>`;
  });

  return `
    <div class="vcard-preview-box" title="Tuvale sürükleyin">
      ${svgHtml}
    </div>
    <div class="vcard-title" title="${m.name}">${m.name}</div>
    <div class="vcard-ctrl-row" onclick="event.stopPropagation()">
      <select class="vcard-width-select" onchange="event.stopPropagation(); selectModuleWidth('${m.type}', parseInt(this.value))" title="Genişlik Değiştir">
        ${widthOptions}
      </select>
      <button type="button" class="vcard-add-btn" onclick="event.stopPropagation(); addModuleToDesign(getModuleTemplate('${m.type}'))" title="Tuvale Yerleştir">
        + Ekle
      </button>
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

      // Update visual card width select options
      const card = document.getElementById(`catalog-card-${m.type}`);
      if (card) {
        const sel = card.querySelector('.vcard-width-select');
        if (sel) {
          const curW = m.selected_w || m.w || (m.allowed_widths ? m.allowed_widths[0] : 600);
          const widths = m.allowed_widths || [m.w || 600];
          let optHtml = '';
          widths.forEach(w => {
            const wCm = Math.round(w / 10);
            const fits = w <= remSpace;
            optHtml += `<option value="${w}" ${w === curW ? 'selected' : ''} ${fits ? '' : 'disabled'}>${wCm} cm ${fits ? '' : '(Dolu)'}</option>`;
          });
          sel.innerHTML = optHtml;
        }

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
  if (!grp) return;
  const wasOpen = grp.classList.contains('open');
  if (wasOpen) {
    grp.classList.remove('open');
  } else {
    grp.classList.add('open');
  }
  const arrow = grp.querySelector('.acc-arrow');
  if (arrow) {
    arrow.textContent = wasOpen ? '▼' : '▲';
  }
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
        if (ghostInfo.hasCollision) {
          const added = addModuleToDesign(modTemplate, ghostInfo.pos, ghostInfo.wall);
          if (added && typeof added === 'object') {
            added.hasCollision = true;
          }
          if (canvas3D.updateAllCollisions) canvas3D.updateAllCollisions();
          canvas3D.render(window.CURRENT_ROOM_DIMS, window.CURRENT_DESIGN.modules, window.CURRENT_ROOM_DIMS?.layout_type, window.CURRENT_DESIGN.materials);
          showToast(`⚠️ Çakışma Uyarısı: Modül başka bir dolabın üzerine bırakıldı! Lütfen kaydırarak düzeltiniz.`, 'warning');
        } else if (!ghostInfo.isValid) {
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
  return newMod;
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

window.getActiveStudioWallHeight = function() {
  const wallMod = window.CURRENT_DESIGN?.modules?.find(m => m.category === 'wall');
  return wallMod?.h || 720;
};

window.toggleCatalogFlyout = function(catKey) {
  const drawer = document.getElementById('studio-flyout-drawer');
  if (!drawer) return;

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

  const searchWrap = document.querySelector('.flyout-search-wrap');

  // SPECIAL CATEGORY: MATERIALS & FINISHES (IN LEFT FLYOUT DRAWER)
  if (catKey === 'materials') {
    if (searchWrap) searchWrap.style.display = 'none';
    const titleElem = document.getElementById('flyout-title');
    const iconElem = document.getElementById('flyout-icon');
    if (titleElem) titleElem.textContent = 'Malzeme & Renkler';
    if (iconElem) iconElem.textContent = '🎨';
    renderFlyoutMaterials();

    setTimeout(() => {
      if (canvas3D) canvas3D.onWindowResize();
      if (canvas2D) renderActiveCanvas();
    }, 260);
    return;
  }

  if (searchWrap) searchWrap.style.display = 'block';

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
  const container = document.getElementById('studio-module-catalog');
  if (!container) return;

  if (catKey === 'materials') {
    renderFlyoutMaterials();
    return;
  }

  const allGroups = ADEKO_MODULE_GROUPS[window.CURRENT_CATEGORY] || ADEKO_MODULE_GROUPS.kitchen;

  // Filter groups for this specific category
  let filtered = allGroups;
  if (catKey && catKey !== 'search' && catKey !== 'all') {
    filtered = allGroups.filter(g =>
      g.category === catKey ||
      g.groupKey === catKey ||
      g.groupKey.startsWith(catKey + '_') ||
      (catKey === 'appliance' && (g.category === 'appliance' || g.groupKey.startsWith('app_')))
    );
  }

  const mapped = filtered.map(g => ({ ...g, open: true }));

  container.innerHTML = '';

  // 1. IF WALL: PREPEND UPPER CABINET HEIGHT SELECTOR AT VERY TOP
  if (catKey === 'wall') {
    const curH = getActiveStudioWallHeight();
    const widget = document.createElement('div');
    widget.className = 'flyout-wall-height-widget';
    widget.id = 'flyout-wall-height-widget';
    widget.innerHTML = `
      <div class="fwh-header">
        <div class="fwh-title"><span>📏</span> Üst Dolap Net Yüksekliği</div>
        <span class="fwh-badge" id="fwh-active-badge">${Math.round(curH / 10)} cm</span>
      </div>
      <div class="fwh-btn-group">
        <button type="button" class="fwh-btn ${curH === 720 ? 'active' : ''}" id="fwh-btn-720" onclick="setStudioWallHeight(720)">
          <strong>70 cm</strong>
          <small>Standart (1 Raf)</small>
        </button>
        <button type="button" class="fwh-btn ${curH === 800 ? 'active' : ''}" id="fwh-btn-800" onclick="setStudioWallHeight(800)">
          <strong>80 cm</strong>
          <small>Geniş (1 Raf)</small>
        </button>
        <button type="button" class="fwh-btn ${curH === 900 ? 'active' : ''}" id="fwh-btn-900" onclick="setStudioWallHeight(900)">
          <strong>90 cm</strong>
          <small>Tavana (2 Raf)</small>
        </button>
      </div>
    `;
    container.appendChild(widget);
  }

  // 2. SMART GAP FILLER ASSISTANT BANNER (SEÇENEK B)
  const cap = getWallCapacity(window.CURRENT_ACTIVE_WALL || 'back');
  const remSpace = (catKey === 'wall') ? cap.wallRemaining : cap.baseRemaining;
  if (remSpace >= 250) {
    const gapPill = document.createElement('div');
    gapPill.style.cssText = 'background:#f0fdf4; border:1px solid #bbf7d0; border-radius:8px; padding:8px 12px; display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;';
    gapPill.innerHTML = `
      <div>
        <strong style="font-size:11px; color:#166534; display:block;">✨ Kalan Boşluk: ${Math.round(remSpace / 10)} cm</strong>
        <span style="font-size:10px; color:#15803d;">${window.CURRENT_ACTIVE_WALL === 'left' ? 'Sol Duvar' : 'Arka Duvar'}</span>
      </div>
      <button class="smart-gap-pill-btn" onclick="autoFillActiveWallGap('${window.CURRENT_ACTIVE_WALL || 'back'}', '${catKey}')" title="Kalan boşluğu otomatik standart modülle doldur">
        Tamamla ⚡
      </button>
    `;
    container.appendChild(gapPill);
  }

  // 3. RENDER SUB-ACCORDION GROUPS
  renderCatalogModulesDOM(mapped, true);
  updateCatalogDimensionPills();
}

function renderFlyoutFiltered(keyword) {
  const allGroups = window.CURRENT_CATALOG_GROUPS || ADEKO_MODULE_GROUPS[window.CURRENT_CATEGORY] || ADEKO_MODULE_GROUPS.kitchen;
  if (!keyword) {
    const mapped = allGroups.map(g => ({ ...g, open: true }));
    renderCatalogModulesDOM(mapped, false);
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
  renderCatalogModulesDOM(filtered, false);
}

// SMART GAP FILLER ASSISTANT (SEÇENEK B) — Loop ile tüm boşluğu tamamlar
window.autoFillActiveWallGap = function(targetWall, targetCat) {
  if (window.CURRENT_DESIGN_LOCKED) {
    showToast("🔒 Tasarımınız kilitlidir. Değişiklik yapılamaz.", "error");
    return;
  }
  const wall = targetWall || window.CURRENT_ACTIVE_WALL || 'back';
  const isUpper = (targetCat === 'wall');

  // İlk kontrol
  const capInit = getWallCapacity(wall);
  const remInit = isUpper ? capInit.wallRemaining : capInit.baseRemaining;
  if (remInit < 100) {
    showToast(`ℹ️ ${wall === 'left' ? 'Sol Duvar' : 'Arka Duvar'} zaten tam dolu (Kalan: ${Math.round(remInit / 10)} cm).`, 'info');
    return;
  }

  // Loop ile boşluk bitene kadar modül ekle
  let addedCount = 0;
  let safety = 20;
  while (safety-- > 0) {
    const cap = getWallCapacity(wall);
    const rem = isUpper ? cap.wallRemaining : cap.baseRemaining;
    if (rem < 100) break;

    let templateType, chosenW;
    if (rem >= 900) { templateType = isUpper ? 'wall_double' : 'base_double'; chosenW = 900; }
    else if (rem >= 800) { templateType = isUpper ? 'wall_double' : 'base_double'; chosenW = 800; }
    else if (rem >= 600) { templateType = isUpper ? 'wall_double' : 'base_double'; chosenW = 600; }
    else if (rem >= 500) { templateType = isUpper ? 'wall_single' : 'base_standard'; chosenW = 500; }
    else if (rem >= 450) { templateType = isUpper ? 'wall_single' : 'base_standard'; chosenW = 450; }
    else if (rem >= 400) { templateType = isUpper ? 'wall_single' : 'base_standard'; chosenW = 400; }
    else if (rem >= 300) { templateType = isUpper ? 'wall_single' : 'base_standard'; chosenW = 300; }
    else if (rem >= 150 && !isUpper) { templateType = 'base_bottle_pullout'; chosenW = rem; }
    else { templateType = isUpper ? 'wall_single' : 'base_standard'; chosenW = rem; }

    const tmpl = getModuleTemplate(templateType);
    if (!tmpl) break;
    const clone = JSON.parse(JSON.stringify(tmpl));
    clone.selected_w = chosenW;
    clone.w = chosenW;
    if (isUpper) {
      clone.h = getActiveStudioWallHeight();
      clone.shelves = (clone.h >= 900) ? 2 : 1;
      clone.shelfCount = clone.shelves;
    }
    addModuleToDesign(clone, null, wall);
    addedCount++;
  }
  if (addedCount > 0) {
    showToast(`✨ ${addedCount} modül eklenerek boşluk tamamlandı!`, 'success');
  }
};

// AUTO-FILL ALL GAPS — Tüm duvarlarda hem alt hem üst modül boşluklarını tamamlar
window.autoFillAllGaps = function() {
  if (window.CURRENT_DESIGN_LOCKED) {
    showToast("🔒 Tasarımınız kilitlidir. Değişiklik yapılamaz.", "error");
    return;
  }
  ['back', 'left'].forEach(function(wall) {
    fillWallGapLoop(wall, 'base');
    fillWallGapLoop(wall, 'wall');
  });
};

function fillWallGapLoop(wall, catKey) {
  const isUpper = (catKey === 'wall');
  let safety = 20;
  while (safety-- > 0) {
    const cap = getWallCapacity(wall);
    const rem = isUpper ? cap.wallRemaining : cap.baseRemaining;
    if (rem < 100) break;

    let templateType, chosenW;
    if (rem >= 900) { templateType = isUpper ? 'wall_double' : 'base_double'; chosenW = 900; }
    else if (rem >= 800) { templateType = isUpper ? 'wall_double' : 'base_double'; chosenW = 800; }
    else if (rem >= 600) { templateType = isUpper ? 'wall_double' : 'base_double'; chosenW = 600; }
    else if (rem >= 500) { templateType = isUpper ? 'wall_single' : 'base_standard'; chosenW = 500; }
    else if (rem >= 400) { templateType = isUpper ? 'wall_single' : 'base_standard'; chosenW = 400; }
    else if (rem >= 300) { templateType = isUpper ? 'wall_single' : 'base_standard'; chosenW = 300; }
    else if (rem >= 150 && !isUpper) { templateType = 'base_bottle_pullout'; chosenW = rem; }
    else { templateType = isUpper ? 'wall_single' : 'base_standard'; chosenW = rem; }

    const tmpl = getModuleTemplate(templateType);
    if (!tmpl) break;
    const clone = JSON.parse(JSON.stringify(tmpl));
    clone.selected_w = chosenW;
    clone.w = chosenW;
    if (isUpper) {
      clone.h = getActiveStudioWallHeight();
      clone.shelves = (clone.h >= 900) ? 2 : 1;
      clone.shelfCount = clone.shelves;
    }
    addModuleToDesign(clone, null, wall);
  }
}

// RENDER MATERIALS & FINISHES IN THE LEFT FLYOUT DRAWER (NORDIC LIGHT THEME)
function renderFlyoutMaterials() {
  const container = document.getElementById('studio-module-catalog');
  if (!container) return;

  const mats = window.CURRENT_DESIGN?.materials || {
    body_material: 'mdf_18mm_standart',
    door_material: 'mdf_18mm_highgloss',
    countertop_material: 'tezgah_cimstone'
  };

  container.innerHTML = `
    <div class="flyout-materials-view">
      <!-- 1. Gövde Malzemesi -->
      <div class="flyout-mat-card">
        <div class="flyout-mat-title">
          <span>🪵</span> Gövde Malzemesi (18mm E1)
        </div>
        <select class="flyout-mat-select" id="flyout-mat-body" onchange="updateStudioMaterial('body_material', this.value)">
          <option value="mdf_18mm_standart" ${mats.body_material === 'mdf_18mm_standart' ? 'selected' : ''}>18mm MDFlam Standart (Kaşmir Gri)</option>
          <option value="mdf_18mm_highgloss" ${mats.body_material === 'mdf_18mm_highgloss' ? 'selected' : ''}>18mm MDFlam Beyaz Meşe</option>
          <option value="mdf_18mm_antrasit" ${mats.body_material === 'mdf_18mm_antrasit' ? 'selected' : ''}>18mm Mat Füme / Antrasit</option>
        </select>
        <div class="flyout-mat-chips">
          <div class="flyout-mat-chip ${mats.body_material==='mdf_18mm_standart'?'active':''}" onclick="setStudioMaterialPreset('body_material', 'mdf_18mm_standart')">
            <span class="flyout-mat-swatch" style="background:#cbd5e1;"></span> Kaşmir Gri
          </div>
          <div class="flyout-mat-chip ${mats.body_material==='mdf_18mm_highgloss'?'active':''}" onclick="setStudioMaterialPreset('body_material', 'mdf_18mm_highgloss')">
            <span class="flyout-mat-swatch" style="background:#f1f5f9;"></span> Beyaz Meşe
          </div>
        </div>
      </div>

      <!-- 2. Kapak Malzemesi & Finish -->
      <div class="flyout-mat-card">
        <div class="flyout-mat-title">
          <span>🚪</span> Kapak Malzemesi & Yüzey Finish
        </div>
        <select class="flyout-mat-select" id="flyout-mat-door" onchange="updateStudioMaterial('door_material', this.value)">
          <option value="mdf_18mm_highgloss" ${mats.door_material === 'mdf_18mm_highgloss' ? 'selected' : ''}>18mm High-Gloss Akrilik Parlak Beyaz</option>
          <option value="mdf_18mm_lake" ${mats.door_material === 'mdf_18mm_lake' ? 'selected' : ''}>18mm İpek Mat Lake Boya (Özel İmalat)</option>
          <option value="mdf_18mm_standart" ${mats.door_material === 'mdf_18mm_standart' ? 'selected' : ''}>18mm Mat Antrasit MDFlam</option>
          <option value="mdf_18mm_wood" ${mats.door_material === 'mdf_18mm_wood' ? 'selected' : ''}>18mm Doğal Meşe Ahşap</option>
        </select>
        <div class="flyout-mat-chips">
          <div class="flyout-mat-chip ${mats.door_material==='mdf_18mm_highgloss'?'active':''}" onclick="setStudioMaterialPreset('door_material', 'mdf_18mm_highgloss')">
            <span class="flyout-mat-swatch" style="background:#ffffff; border:1px solid #cbd5e1;"></span> Akrilik Beyaz
          </div>
          <div class="flyout-mat-chip ${mats.door_material==='mdf_18mm_lake'?'active':''}" onclick="setStudioMaterialPreset('door_material', 'mdf_18mm_lake')">
            <span class="flyout-mat-swatch" style="background:#64748b;"></span> Mat Lake
          </div>
          <div class="flyout-mat-chip ${mats.door_material==='mdf_18mm_standart'?'active':''}" onclick="setStudioMaterialPreset('door_material', 'mdf_18mm_standart')">
            <span class="flyout-mat-swatch" style="background:#1e293b;"></span> Antrasit
          </div>
        </div>
      </div>

      <!-- 3. Tezgah Malzemesi -->
      <div class="flyout-mat-card">
        <div class="flyout-mat-title">
          <span>🔪</span> Tezgah Çözümü
        </div>
        <select class="flyout-mat-select" id="flyout-mat-countertop" onchange="updateStudioMaterial('countertop_material', this.value)">
          <option value="tezgah_cimstone" ${mats.countertop_material === 'tezgah_cimstone' ? 'selected' : ''}>Çimstone Calacatta Kuvars Tezgah</option>
          <option value="tezgah_granit" ${mats.countertop_material === 'tezgah_granit' ? 'selected' : ''}>Doğal Granit Tezgah (Siyah)</option>
          <option value="tezgah_porselen" ${mats.countertop_material === 'tezgah_porselen' ? 'selected' : ''}>Ultra Kompakt Porselen Tezgah</option>
          <option value="tezgah_masif" ${mats.countertop_material === 'tezgah_masif' ? 'selected' : ''}>Masif Meşe Yağlı Ahşap Tezgah</option>
          <option value="tezgah_laminat" ${mats.countertop_material === 'tezgah_laminat' ? 'selected' : ''}>Postforming Laminat Tezgah</option>
        </select>
        <div class="flyout-mat-chips">
          <div class="flyout-mat-chip ${mats.countertop_material==='tezgah_cimstone'?'active':''}" onclick="setStudioMaterialPreset('countertop_material', 'tezgah_cimstone')">
            <span class="flyout-mat-swatch" style="background:#f8fafc; border:1px solid #cbd5e1;"></span> Calacatta Kuvars
          </div>
          <div class="flyout-mat-chip ${mats.countertop_material==='tezgah_granit'?'active':''}" onclick="setStudioMaterialPreset('countertop_material', 'tezgah_granit')">
            <span class="flyout-mat-swatch" style="background:#0f172a;"></span> Siyah Granit
          </div>
          <div class="flyout-mat-chip ${mats.countertop_material==='tezgah_porselen'?'active':''}" onclick="setStudioMaterialPreset('countertop_material', 'tezgah_porselen')">
            <span class="flyout-mat-swatch" style="background:#e2e8f0;"></span> Porselen
          </div>
        </div>
      </div>

      <!-- 4. Tezgah Arası Seramik & Işık -->
      <div class="flyout-mat-card" style="display:flex; justify-content:space-between; align-items:center;">
        <div>
          <div class="flyout-mat-title" style="margin-bottom:2px;"><span>💡</span> Tezgah Arası Işık / Ton</div>
          <span style="font-size:10px; color:#64748b;">Açık Porselen Seramik ↔ Koyu Taş</span>
        </div>
        <button type="button" class="btn btn-outline btn-sm" onclick="toggleBacksplashTone()" style="font-size:11px; padding:5px 12px; border-radius:999px; background:#f8fafc; font-weight:700;">
          Tonu Değiştir 🔄
        </button>
      </div>

      <!-- 5. Fabrika Güvence Notu -->
      <div class="flyout-mat-note">
        🔒 <strong>1. Sınıf Fabrika İmalatı:</strong> AGT E1 Normu MDFlam, Blum / Samet frenli raylar ve Çimstone tezgah. Dinamik fiyat teklifiniz randevuda detaylandırılır.
      </div>

      <!-- 6. Kaydet & Randevu Al Butonu -->
      <button class="flyout-mat-cta-btn" onclick="openSubmitQuoteModal()">
        <span>📅</span> Tasarımı Kaydet & Randevu Al
      </button>
    </div>
  `;
}

window.updateStudioMaterial = function(key, val) {
  if (!window.CURRENT_DESIGN.materials) window.CURRENT_DESIGN.materials = {};
  window.CURRENT_DESIGN.materials[key] = val;

  const altElem = document.getElementById(`mat-${key.replace('_material', '')}`);
  if (altElem) altElem.value = val;

  if (canvas3D) {
    canvas3D.render(window.CURRENT_DESIGN.room_config, window.CURRENT_DESIGN.modules, window.CURRENT_DESIGN.layout_type, window.CURRENT_DESIGN.materials);
  }
  showToast(`🎨 Malzeme güncellendi.`, 'info');
};

window.setStudioMaterialPreset = function(key, val) {
  updateStudioMaterial(key, val);
  const selectElem = document.getElementById(`flyout-mat-${key.replace('_material', '')}`);
  if (selectElem) selectElem.value = val;
  renderFlyoutMaterials();
};

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

function fillBaseWallSpan(startX, endX, wallKey, nextModId, generatedModules) {
  const span = endX - startX;
  if (span < 150) return;

  const widths = partitionSpanToStandardWidths(span);
  let curPos = startX;

  widths.forEach(cw => {
    let modType = 'base_standard';
    let modName = 'Standart Tek Kapak Alt Dolap';
    let hinges = 2;

    if (cw >= 800) {
      modType = 'base_double';
      modName = 'Çift Kapaklı Geniş Alt Dolap';
      hinges = 4;
    } else if (cw <= 250) {
      modType = 'base_bottle_pullout';
      modName = 'Raylı Şişelik / Yağdanlık Alt Dolap';
      hinges = 0;
    }

    generatedModules.push({
      id: nextModId(),
      type: modType,
      name: modName,
      category: 'base',
      wall: wallKey,
      w: cw,
      d: 600,
      h: 720,
      x: curPos,
      hinges: hinges
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

  // Update Flyout Widget Active Button & Badge
  const badge = document.getElementById('fwh-active-badge');
  if (badge) badge.textContent = `${Math.round(heightVal / 10)} cm`;
  document.querySelectorAll('.fwh-btn').forEach(btn => btn.classList.remove('active'));
  document.getElementById(`fwh-btn-${heightVal}`)?.classList.add('active');

  // Update Y height label on all wall module cards in catalog
  document.querySelectorAll('[id^="dim-txt-wall_"]').forEach(el => {
    const parts = el.textContent.split('|');
    el.textContent = `${parts[0] || 'D: 350mm'} | Y: ${heightVal}mm`;
  });
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

    // 6. Fill remaining base space with standard modular cabinets (Zero gaps)
    fillBaseWallSpan(curX, rw, 'back', nextModId, generatedModules);
    curX = rw;

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

    // Base: Fill remaining on Back Wall (Zero gaps to wall edge)
    fillBaseWallSpan(backX, rw, 'back', nextModId, generatedModules);
    backX = rw;

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

    // 3. Fill remaining base on Left Wall between drawers and tall fridge (Zero gaps)
    fillBaseWallSpan(leftZ, fridgeStartLeft, 'left', nextModId, generatedModules);
    leftZ = fridgeStartLeft;

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

  // Sihirbaz sonrası otomatik boşluk tamamlama
  setTimeout(function() { autoFillAllGaps(); }, 300);
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

  // Populate Quick Project Summary Strip
  const dimsEl = document.getElementById('modal-summary-dims');
  const modCountEl = document.getElementById('modal-summary-mod-count');
  if (dimsEl && window.CURRENT_ROOM_DIMS) {
    dimsEl.textContent = `Mutfak ${Math.round(window.CURRENT_ROOM_DIMS.width / 10)} × ${Math.round(window.CURRENT_ROOM_DIMS.depth / 10)} cm`;
  }
  if (modCountEl && window.CURRENT_DESIGN && window.CURRENT_DESIGN.modules) {
    modCountEl.textContent = `${window.CURRENT_DESIGN.modules.length} Modül`;
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
// APPOINTMENT SLOTS (NEAREST 3) & STATUS TRACKING (LIGHT NORDIC THEME)
// ==========================================
async function loadSuggestedAppointmentSlots() {
  const container = document.getElementById('nearest-slots-container');
  if (!container) return;

  container.innerHTML = '<div style="color:#64748b; font-size:0.8rem; grid-column:1/-1;">Uygun randevu saatleri yükleniyor...</div>';
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
           onclick="selectAppointmentSlot(this, '${s.date}', '${s.time_slot}')">
        <div class="slot-tag">Seçenek ${idx + 1}</div>
        <div class="slot-date">${s.date_label}</div>
        <div class="slot-time">⏰ ${s.time_label}</div>
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
    c.classList.remove('selected');
  });

  if (element) {
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


