/**
 * ModulerCraft Pro - ADeko 3D Perspective Showroom Engine (Three.js WebGL)
 * Recreates authentic ADeko 14 Pro CAD/CAM perspective 3D kitchen environment:
 * - 100% True 3D Depth: Base cabinets 600mm deep, Wall cabinets 350mm deep, Tall units 2100mm high
 * - Cabinets positioned flush against Back Wall (Z = 0) and Left Wall (X = 0)
 * - Multi-wall L-Kitchen support with 90° corner transitions
 * - Wall boundary enforcement: Cabinets strictly clamped within room dimensions (no void overflow)
 * - Interactive in-scene 3D drag & repositioning: Grab and slide any base/wall cabinet directly with mouse!
 * - Automatic OrbitControls freeze while dragging modules; re-enabled on release
 * - 360° unrestricted OrbitControls (mouse drag, wheel zoom, pan, presets)
 * - Photorealistic ADeko materials: Natural Oak wood grain, frosted glass insets,
 *   Calacatta quartz countertops, stainless steel sink with 3D faucet, built-in oven & cooktop, tall fridge
 * - 3D Raycaster Drag & Drop with Live Ghost Shadow and Snap Guidelines
 */

class StudioCanvas3D {
  constructor(canvasElement) {
    this.canvas = canvasElement;
    this.container = canvasElement.parentElement;

    // Internal state
    this.roomConfig = null;
    this.modules = [];
    this.materials = {};
    this.selectedModuleId = null;

    // Multi-wall snap planes
    this.planeZ = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0); // Back wall plane (Z = 0)
    this.planeX = new THREE.Plane(new THREE.Vector3(1, 0, 0), 0); // Left wall plane (X = 0)

    // Drag & Drop Ghost State (Palette -> Canvas)
    this.ghostMesh = null;
    this.ghostSnapPos = 0;
    this.ghostTargetWall = 'back';
    this.ghostIsValid = true;

    // In-Scene Interactive Module Dragging State (Inside 3D Viewport)
    this.isDraggingCabinet = false;
    this.draggedModule = null;
    this.dragOffset = 0;
    this.hasMovedCabinet = false;
    this.pointerDownPos = { x: 0, y: 0 };

    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    // Callbacks
    this.onModuleSelected = null;
    this.onModuleMoved = null;

    // Procedural Materials Cache
    this.matCache = {};
    this.backsplashTone = 'light';

    this.initThree();
    this.setupProceduralTextures();
    this.initControls();
    this.animate();
  }

  initThree() {
    const w = this.container.clientWidth || 900;
    const h = this.container.clientHeight || 600;

    // 1. Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x94a3b8);

    // 2. Camera (ADeko Natural Perspective Camera)
    this.camera = new THREE.PerspectiveCamera(40, w / h, 10, 30000);
    this.camera.position.set(2800, 2100, 4800);

    // 3. WebGL Renderer
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      powerPreference: "high-performance"
    });
    this.renderer.setSize(w, h);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;

    // 4. OrbitControls (360° Mouse Orbit)
    this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.maxPolarAngle = Math.PI / 2 - 0.02; // Prevents camera going beneath the floor
    this.controls.minDistance = 600;
    this.controls.maxDistance = 14000;
    this.controls.target.set(1800, 950, 400);

    // 5. High-End Showroom Lighting (Studio PBR Warm Neutral)
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.70);
    this.scene.add(ambientLight);

    // Key Directional Light (Warm showroom track daylight)
    const dirLight = new THREE.DirectionalLight(0xfffaf0, 0.95);
    dirLight.position.set(3000, 4500, 3500);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.camera.near = 500;
    dirLight.shadow.camera.far = 10000;
    const d = 3500;
    dirLight.shadow.camera.left = -d;
    dirLight.shadow.camera.right = d;
    dirLight.shadow.camera.top = d;
    dirLight.shadow.camera.bottom = -d;
    dirLight.shadow.bias = -0.0005;
    this.scene.add(dirLight);

    // Rim / Edge Accent Light (Opposite angle to highlight marble bevels & acrylic reflections)
    const rimLight = new THREE.DirectionalLight(0xe0f2fe, 0.45);
    rimLight.position.set(-2500, 3200, -2000);
    this.scene.add(rimLight);

    // Overhead Spotlights
    const spot1 = new THREE.PointLight(0xffedd5, 0.65, 4500);
    spot1.position.set(1200, 2400, 800);
    this.scene.add(spot1);

    const spot2 = new THREE.PointLight(0xffedd5, 0.65, 4500);
    spot2.position.set(2400, 2400, 800);
    this.scene.add(spot2);

    // Under-Cabinet Architectural Warm Glow (LED Strip simulation)
    const underCabLight = new THREE.PointLight(0xfef3c7, 0.35, 3000);
    underCabLight.position.set(1800, 1450, 250);
    this.scene.add(underCabLight);

    this.roomGroup = new THREE.Group();
    this.cabinetsGroup = new THREE.Group();
    this.helperGroup = new THREE.Group();
    this.dimensionGroup = new THREE.Group();
    this.scene.add(this.roomGroup);
    this.scene.add(this.cabinetsGroup);
    this.scene.add(this.helperGroup);
    this.scene.add(this.dimensionGroup);
    this.showRulers = true;

    // Resize listeners: window and container ResizeObserver
    window.addEventListener('resize', () => this.onWindowResize());
    if (typeof ResizeObserver !== 'undefined' && this.container) {
      this.resizeObserver = new ResizeObserver(() => this.onWindowResize());
      this.resizeObserver.observe(this.container);
    }
  }

  setupProceduralTextures() {
    // 1. Natural Organic Oak Wood Texture + Bump Map
    const woodCanvas = document.createElement('canvas');
    woodCanvas.width = 1024;
    woodCanvas.height = 1024;
    const wctx = woodCanvas.getContext('2d');
    wctx.fillStyle = "#c89a68";
    wctx.fillRect(0, 0, 1024, 1024);

    // Natural wood growth rings & grain waves
    for (let i = 0; i < 700; i++) {
      const alpha = 0.04 + Math.random() * 0.12;
      const isDark = Math.random() > 0.3;
      wctx.strokeStyle = isDark ? `rgba(120, 75, 35, ${alpha})` : `rgba(230, 185, 130, ${alpha * 0.7})`;
      wctx.lineWidth = 1 + Math.random() * 2.5;
      wctx.beginPath();
      const y = Math.random() * 1024;
      const wave = Math.random() * 25 - 12;
      wctx.moveTo(0, y);
      wctx.bezierCurveTo(300, y + wave, 700, y - wave, 1024, y + (wave * 0.5));
      wctx.stroke();
    }
    const woodTex = new THREE.CanvasTexture(woodCanvas);
    woodTex.wrapS = THREE.RepeatWrapping;
    woodTex.wrapT = THREE.RepeatWrapping;
    woodTex.repeat.set(1.5, 1.5);

    // Companion Wood Bump Map (pore tactile depth)
    const woodBumpCanvas = document.createElement('canvas');
    woodBumpCanvas.width = 512;
    woodBumpCanvas.height = 512;
    const wbctx = woodBumpCanvas.getContext('2d');
    wbctx.fillStyle = "#808080";
    wbctx.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 400; i++) {
      wbctx.strokeStyle = Math.random() > 0.5 ? "rgba(40, 40, 40, 0.15)" : "rgba(220, 220, 220, 0.15)";
      wbctx.lineWidth = 1 + Math.random();
      wbctx.beginPath();
      const y = Math.random() * 512;
      wbctx.moveTo(0, y);
      wbctx.lineTo(512, y + Math.random() * 6 - 3);
      wbctx.stroke();
    }
    const woodBumpTex = new THREE.CanvasTexture(woodBumpCanvas);
    woodBumpTex.wrapS = THREE.RepeatWrapping;
    woodBumpTex.wrapT = THREE.RepeatWrapping;
    this.woodTex = woodTex;
    this.woodBumpTex = woodBumpTex;

    // 2. High-End Calacatta Porcelain Marble Texture (Flowing Smoky & Gold Veins)
    const porcCanvas = document.createElement('canvas');
    porcCanvas.width = 1024;
    porcCanvas.height = 1024;
    const pctx = porcCanvas.getContext('2d');
    pctx.fillStyle = "#ffffff";
    pctx.fillRect(0, 0, 1024, 1024);

    // Soft marble clouding
    const grad = pctx.createLinearGradient(0, 0, 1024, 1024);
    grad.addColorStop(0, "rgba(241, 245, 249, 0.4)");
    grad.addColorStop(0.5, "rgba(255, 255, 255, 0.8)");
    grad.addColorStop(1, "rgba(241, 245, 249, 0.4)");
    pctx.fillStyle = grad;
    pctx.fillRect(0, 0, 1024, 1024);

    // Primary & secondary marble veins
    const drawVein = (startX, startY, endX, endY, color, width) => {
      pctx.strokeStyle = color;
      pctx.lineWidth = width;
      pctx.beginPath();
      pctx.moveTo(startX, startY);
      const cp1x = startX + (endX - startX) * 0.35 + (Math.random() * 80 - 40);
      const cp1y = startY + (endY - startY) * 0.35 + (Math.random() * 80 - 40);
      const cp2x = startX + (endX - startX) * 0.70 + (Math.random() * 80 - 40);
      const cp2y = startY + (endY - startY) * 0.70 + (Math.random() * 80 - 40);
      pctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, endX, endY);
      pctx.stroke();

      // Micro branch
      if (Math.random() > 0.4) {
        pctx.lineWidth = width * 0.45;
        pctx.beginPath();
        pctx.moveTo(cp1x, cp1y);
        pctx.lineTo(cp1x + Math.random() * 90 - 45, cp1y + Math.random() * 90 - 45);
        pctx.stroke();
      }
    };

    // Major Grey Veins
    for (let i = 0; i < 7; i++) {
      const alpha = 0.18 + Math.random() * 0.22;
      drawVein(Math.random() * 300, 0, 600 + Math.random() * 424, 1024, `rgba(71, 85, 105, ${alpha})`, 2 + Math.random() * 4);
    }
    // Subtle Champagne Gold Micro-Veins
    for (let i = 0; i < 5; i++) {
      drawVein(Math.random() * 400, 0, 500 + Math.random() * 524, 1024, "rgba(180, 140, 75, 0.18)", 1.2 + Math.random() * 2);
    }

    const porcelainTex = new THREE.CanvasTexture(porcCanvas);
    porcelainTex.wrapS = THREE.RepeatWrapping;
    porcelainTex.wrapT = THREE.RepeatWrapping;
    porcelainTex.repeat.set(2, 2);
    this.porcelainTex = porcelainTex;

    // 3. Çimstone White Quartz Texture (Fine Sparkling Quartz Grains & Subtle Mineral Matrix)
    const cimCanvas = document.createElement('canvas');
    cimCanvas.width = 512;
    cimCanvas.height = 512;
    const cctx = cimCanvas.getContext('2d');
    cctx.fillStyle = "#f8fafc";
    cctx.fillRect(0, 0, 512, 512);

    for (let i = 0; i < 1500; i++) {
      const isSparkle = Math.random() > 0.85;
      cctx.fillStyle = isSparkle ? "rgba(255, 255, 255, 0.95)" : (Math.random() > 0.5 ? "rgba(203, 213, 225, 0.35)" : "rgba(148, 163, 184, 0.25)");
      const s = isSparkle ? 1.5 : (1 + Math.random() * 2);
      cctx.fillRect(Math.random() * 512, Math.random() * 512, s, s);
    }
    const cimstoneTex = new THREE.CanvasTexture(cimCanvas);
    cimstoneTex.wrapS = THREE.RepeatWrapping;
    cimstoneTex.wrapT = THREE.RepeatWrapping;
    cimstoneTex.repeat.set(3, 3);
    this.cimstoneTex = cimstoneTex;

    // 4. Nero Star Galaxy Granite Texture (Deep Charcoal with Multi-Layered Sparkling Minerals)
    const gCanvas = document.createElement('canvas');
    gCanvas.width = 512;
    gCanvas.height = 512;
    const gctx = gCanvas.getContext('2d');
    gctx.fillStyle = "#18181b";
    gctx.fillRect(0, 0, 512, 512);

    // Multi-frequency mineral particles
    for (let i = 0; i < 2200; i++) {
      const r = Math.random();
      if (r > 0.92) {
        gctx.fillStyle = "rgba(255, 255, 255, 0.85)"; // Reflective quartz sparkle
      } else if (r > 0.80) {
        gctx.fillStyle = "rgba(217, 119, 6, 0.55)"; // Bronze mica mineral
      } else if (r > 0.40) {
        gctx.fillStyle = "rgba(113, 113, 122, 0.35)"; // Feldspar matrix
      } else {
        gctx.fillStyle = "rgba(39, 39, 42, 0.6)"; // Deep black grains
      }
      const sz = 1.2 + Math.random() * 2.8;
      gctx.fillRect(Math.random() * 512, Math.random() * 512, sz, sz);
    }
    const graniteTex = new THREE.CanvasTexture(gCanvas);
    graniteTex.wrapS = THREE.RepeatWrapping;
    graniteTex.wrapT = THREE.RepeatWrapping;
    graniteTex.repeat.set(3, 3);
    this.graniteTex = graniteTex;

    // 5. Glossy Ceramic Floor Tile Texture
    const tileCanvas = document.createElement('canvas');
    tileCanvas.width = 512;
    tileCanvas.height = 512;
    const tctx = tileCanvas.getContext('2d');
    tctx.fillStyle = "#f1f5f9";
    tctx.fillRect(0, 0, 512, 512);
    tctx.fillStyle = "rgba(226, 232, 240, 0.6)";
    for (let i = 0; i < 400; i++) {
      tctx.fillRect(Math.random() * 512, Math.random() * 512, 2, 2);
    }
    tctx.strokeStyle = "#94a3b8";
    tctx.lineWidth = 4;
    tctx.strokeRect(0, 0, 512, 512);
    const tileTex = new THREE.CanvasTexture(tileCanvas);
    tileTex.wrapS = THREE.RepeatWrapping;
    tileTex.wrapT = THREE.RepeatWrapping;
    tileTex.repeat.set(5, 4);

    // PBR Physical Materials Cache (Photorealistic Showroom Shaders)
    this.matCache = {
      // Cabinet Door Materials
      acrylicGloss: new THREE.MeshPhysicalMaterial({
        color: 0xffffff,
        roughness: 0.02,
        metalness: 0.04,
        clearcoat: 1.0, // Maximum mirror automotive lacquer clearcoat
        clearcoatRoughness: 0.02,
        reflectivity: 0.98,
        ior: 1.50
      }),
      woodOak: new THREE.MeshPhysicalMaterial({
        color: 0xc89a68,
        map: woodTex,
        bumpMap: woodBumpTex,
        bumpScale: 0.02,
        roughness: 0.38,
        metalness: 0.02,
        clearcoat: 0.18,
        clearcoatRoughness: 0.30
      }),

      // Countertop Materials
      countertopCimstone: new THREE.MeshPhysicalMaterial({
        color: 0xf8fafc,
        map: cimstoneTex,
        roughness: 0.12,
        metalness: 0.04,
        clearcoat: 0.88,
        clearcoatRoughness: 0.05,
        reflectivity: 0.92,
        ior: 1.52
      }),
      countertopPorcelain: new THREE.MeshPhysicalMaterial({
        color: 0xffffff,
        map: porcelainTex,
        roughness: 0.06,
        metalness: 0.02,
        clearcoat: 0.96,
        clearcoatRoughness: 0.03,
        reflectivity: 0.96,
        ior: 1.55
      }),
      countertopGranite: new THREE.MeshPhysicalMaterial({
        color: 0x27272a,
        map: graniteTex,
        roughness: 0.16,
        metalness: 0.24, // Metallic mineral sparkle under spotlights
        clearcoat: 0.86,
        clearcoatRoughness: 0.08,
        reflectivity: 0.88
      }),

      // Hardware & Architecture
      plinthAlu: new THREE.MeshPhysicalMaterial({ color: 0x64748b, roughness: 0.28, metalness: 0.75, clearcoat: 0.3 }),
      frostedGlass: new THREE.MeshPhysicalMaterial({ color: 0xf8fafc, roughness: 0.15, transmission: 0.7, transparent: true, opacity: 0.75 }),
      handleChrome: new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.04, metalness: 0.98, clearcoat: 1.0 }),
      ovenGlass: new THREE.MeshPhysicalMaterial({ color: 0x090d16, roughness: 0.04, metalness: 0.85, clearcoat: 0.98 }),
      fridgeInox: new THREE.MeshPhysicalMaterial({ color: 0xe2e8f0, roughness: 0.26, metalness: 0.45, clearcoat: 0.2 }),
      sinkSteel: new THREE.MeshPhysicalMaterial({ color: 0xb0bec5, roughness: 0.20, metalness: 0.92, clearcoat: 0.40 }),
      floorTile: new THREE.MeshPhysicalMaterial({ map: tileTex, roughness: 0.20, metalness: 0.10, clearcoat: 0.65 }),
      wallPaint: new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.85, metalness: 0.0 }),
      wallBacksplash: new THREE.MeshPhysicalMaterial({ color: 0x475569, roughness: 0.25, metalness: 0.05, clearcoat: 0.5 }),
      wallBacksplashLight: new THREE.MeshPhysicalMaterial({
        color: 0xf8fafc,
        map: porcelainTex,
        roughness: 0.08,
        metalness: 0.02,
        clearcoat: 0.94,
        clearcoatRoughness: 0.04,
        reflectivity: 0.95
      }),
      wallBacksplashDark: new THREE.MeshPhysicalMaterial({
        color: 0x334155,
        map: graniteTex,
        roughness: 0.18,
        metalness: 0.16,
        clearcoat: 0.75,
        clearcoatRoughness: 0.08,
        reflectivity: 0.88
      }),
      ledStripMat: new THREE.MeshStandardMaterial({
        color: 0xffffff,
        emissive: 0xfff0c2,
        emissiveIntensity: 2.2,
        roughness: 0.1
      }),
      wallBorderMat: new THREE.LineBasicMaterial({ color: 0x3b82f6, linewidth: 3 }),
      ghostValidMat: new THREE.MeshStandardMaterial({ color: 0x0284c7, transparent: true, opacity: 0.45 }),
      ghostInvalidMat: new THREE.MeshStandardMaterial({ color: 0xef4444, transparent: true, opacity: 0.55 }),
      ghostWireMat: new THREE.LineBasicMaterial({ color: 0x38bdf8, linewidth: 2 }),
      ghostWireInvalidMat: new THREE.LineBasicMaterial({ color: 0xf87171, linewidth: 2 }),
      selectedMat: new THREE.MeshPhysicalMaterial({ color: 0x0284c7, roughness: 0.2, metalness: 0.15, clearcoat: 0.8 })
    };
  }

  setBacksplashTone(tone) {
    this.backsplashTone = (tone === 'dark') ? 'dark' : 'light';
    const mat = (this.backsplashTone === 'dark') ? this.matCache.wallBacksplashDark : this.matCache.wallBacksplashLight;
    if (this.backsplashMeshBack) this.backsplashMeshBack.material = mat;
    if (this.backsplashMeshLeft) this.backsplashMeshLeft.material = mat;
    if (this.backWallMesh) this.backWallMesh.material = mat;
  }

  getDoorMaterial(isSelected = false) {
    if (isSelected) return this.matCache.selectedMat;
    const key = (this.materials?.door_material || this.materials?.cabinet_material || 'mdflam').toLowerCase();
    if (this.matCache['door_' + key]) return this.matCache['door_' + key];

    const catalog = window.ACTIVE_CATALOG_MATERIALS?.cabinet || [];
    const found = catalog.find(m => (m.key || '').toLowerCase() === key);
    if (found) {
      const isAcrylic = (found.texture_type === 'acrylic' || key.includes('acrylic') || key.includes('akrilik'));
      const mat = new THREE.MeshPhysicalMaterial({
        color: new THREE.Color(found.color_hex || (isAcrylic ? '#ffffff' : '#c89a68')),
        roughness: isAcrylic ? 0.02 : (typeof found.roughness === 'number' ? found.roughness : 0.38),
        metalness: isAcrylic ? 0.04 : (typeof found.metalness === 'number' ? found.metalness : 0.02),
        clearcoat: isAcrylic ? 1.0 : 0.18,
        clearcoatRoughness: isAcrylic ? 0.02 : 0.30,
        reflectivity: isAcrylic ? 0.98 : 0.50
      });
      if (!isAcrylic && this.woodTex) {
        mat.map = this.woodTex;
        mat.bumpMap = this.woodBumpTex;
        mat.bumpScale = 0.02;
      }
      this.matCache['door_' + key] = mat;
      return mat;
    }

    if (key.includes('acrylic') || key.includes('akrilik')) {
      return this.matCache.acrylicGloss;
    }
    return this.matCache.woodOak;
  }

  getCountertopMaterial() {
    const key = (this.materials?.countertop_material || 'cimstone').toLowerCase();
    if (this.matCache['ct_' + key]) return this.matCache['ct_' + key];

    const catalog = window.ACTIVE_CATALOG_MATERIALS?.countertop || [];
    const found = catalog.find(m => (m.key || '').toLowerCase() === key);
    if (found) {
      const isPorcelain = (found.texture_type === 'marble' || key.includes('porcelain') || key.includes('porselen'));
      const isGranite = (key.includes('granite') || key.includes('granit'));
      
      const mat = new THREE.MeshPhysicalMaterial({
        color: new THREE.Color(found.color_hex || (isGranite ? '#27272a' : '#f8fafc')),
        roughness: isPorcelain ? 0.06 : (isGranite ? 0.16 : 0.12),
        metalness: isGranite ? 0.24 : 0.03,
        clearcoat: isPorcelain ? 0.96 : 0.88,
        clearcoatRoughness: isPorcelain ? 0.03 : 0.06,
        reflectivity: 0.92,
        ior: isPorcelain ? 1.55 : 1.52
      });

      if (isPorcelain && this.porcelainTex) {
        mat.map = this.porcelainTex;
      } else if (isGranite && this.graniteTex) {
        mat.map = this.graniteTex;
      } else if (this.cimstoneTex) {
        mat.map = this.cimstoneTex;
      }

      this.matCache['ct_' + key] = mat;
      return mat;
    }

    if (key.includes('granite') || key.includes('granit')) {
      return this.matCache.countertopGranite;
    } else if (key.includes('porcelain') || key.includes('porselen')) {
      return this.matCache.countertopPorcelain;
    }
    return this.matCache.countertopCimstone;
  }

  onWindowResize() {
    if (!this.container) return;
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    if (w <= 0 || h <= 0) return;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h, false);
    if (this.canvas) {
      this.canvas.width = w * Math.min(window.devicePixelRatio, 2);
      this.canvas.height = h * Math.min(window.devicePixelRatio, 2);
    }
  }

  /*
   * IN-SCENE 3D INTERACTION CONTROLS
   * Handles raycasting, hover cursor, clicking to select, and smooth 3D dragging
   */
  initControls() {
    const dom = this.renderer.domElement;

    dom.addEventListener('pointermove', (e) => {
      this.updateAngleDisplay();
      this.handlePointerMove(e);
    });

    dom.addEventListener('pointerdown', (e) => {
      this.handlePointerDown(e);
    });

    window.addEventListener('pointerup', (e) => {
      this.handlePointerUp(e);
    });
  }

  handlePointerDown(e) {
    if (e.button !== 0) return; // Only primary left-click
    const dom = this.renderer.domElement;
    const rect = dom.getBoundingClientRect();
    this.pointerDownPos = { x: e.clientX, y: e.clientY };
    this.hasMovedCabinet = false;

    this.mouse.x = ((e.clientX - rect.left) / dom.clientWidth) * 2 - 1;
    this.mouse.y = -((e.clientY - rect.top) / dom.clientHeight) * 2 + 1;
    this.raycaster.setFromCamera(this.mouse, this.camera);

    const intersects = this.raycaster.intersectObjects(this.cabinetsGroup.children, true);
    if (intersects.length > 0) {
      // Find root module group
      let obj = intersects[0].object;
      let targetMod = null;
      while (obj && obj !== this.cabinetsGroup) {
        if (obj.userData && obj.userData.module) {
          targetMod = obj.userData.module;
          break;
        }
        obj = obj.parent;
      }

      if (targetMod) {
        this.selectedModuleId = targetMod.id;
        if (window.CURRENT_DESIGN_LOCKED) {
          this.isDraggingCabinet = false;
          this.draggedModule = null;
          this.controls.enabled = true;
          dom.style.cursor = 'default';
        } else {
          this.isDraggingCabinet = true;
          this.draggedModule = targetMod;
          this.controls.enabled = false; // FREEZE CAMERA ROTATION!
          dom.style.cursor = 'grabbing';
        }

        // Calculate offset along wall
        const wall = targetMod.wall || 'back';
        const plane = (wall === 'left') ? this.planeX : this.planeZ;
        const hit = new THREE.Vector3();
        if (this.raycaster.ray.intersectPlane(plane, hit)) {
          this.dragOffset = (wall === 'left') ? (hit.z - (targetMod.x || 0)) : (hit.x - (targetMod.x || 0));
        } else {
          this.dragOffset = (targetMod.w || 600) / 2;
        }

        // Render selection highlight
        this.render(this.roomConfig, this.modules, this.roomConfig?.layout_type, this.materials);

        if (this.onModuleSelected) {
          this.onModuleSelected(targetMod);
        }
      }
    } else {
      // Clicked empty space - deselect if didn't drag
      if (!this.isDraggingCabinet) {
        this.selectedModuleId = null;
        this.render(this.roomConfig, this.modules, this.roomConfig?.layout_type, this.materials);
        if (this.onModuleSelected) {
          this.onModuleSelected(null);
        }
      }
    }
  }

  handlePointerMove(e) {
    const dom = this.renderer.domElement;
    const rect = dom.getBoundingClientRect();
    this.mouse.x = ((e.clientX - rect.left) / dom.clientWidth) * 2 - 1;
    this.mouse.y = -((e.clientY - rect.top) / dom.clientHeight) * 2 + 1;
    this.raycaster.setFromCamera(this.mouse, this.camera);

    if (this.isDraggingCabinet && this.draggedModule) {
      const dist = Math.hypot(e.clientX - this.pointerDownPos.x, e.clientY - this.pointerDownPos.y);
      if (dist > 4) {
        this.hasMovedCabinet = true;
      }

      if (this.hasMovedCabinet) {
        const mod = this.draggedModule;
        const wall = mod.wall || 'back';
        const rw = this.roomConfig?.room_width || 3600;
        const rd = this.roomConfig?.room_depth || 2600;
        const wallLen = (wall === 'left' || wall === 'right') ? rd : rw;
        const plane = (wall === 'left') ? this.planeX : this.planeZ;
        const hit = new THREE.Vector3();

        if (this.raycaster.ray.intersectPlane(plane, hit)) {
          let rawPos = (wall === 'left') ? (hit.z - this.dragOffset) : (hit.x - this.dragOffset);
          let snapped = Math.round(rawPos / 50) * 50;

          // Snap to neighbor cabinet edges (within 80mm)
          const isUpper = mod.category === 'wall';
          const neighbors = this.modules.filter(m => m.id !== mod.id && (m.wall || 'back') === wall && (isUpper ? m.category === 'wall' : m.category !== 'wall'));
          for (let n of neighbors) {
            const rEdge = (n.x || 0) + (n.w || 600);
            const lEdge = (n.x || 0) - (mod.w || 600);
            if (Math.abs(snapped - rEdge) < 80) {
              snapped = rEdge;
              break;
            } else if (Math.abs(snapped - lEdge) < 80) {
              snapped = lEdge;
              break;
            }
          }

          // STRICT CLAMP TO WALL BOUNDARY!
          // Cabinets can NEVER overflow the wall end!
          const mw = mod.w || 600;
          const isAtBoundary = (snapped < 0 || snapped > wallLen - mw);
          mod.x = Math.max(0, Math.min(wallLen - mw, snapped));

          // Fast live re-render
          this.render(this.roomConfig, this.modules, this.roomConfig?.layout_type, this.materials);

          // Update floating coordinate badge
          if (isAtBoundary) {
            this.showDragPill(`⛔ ${mod.name}: Duvar sınırına ulaşıldı! (${mod.x} mm)`, true);
          } else {
            this.showDragPill(`↔ ${mod.id}: ${mod.name} | ${wall === 'left' ? 'Sol Duvar' : 'Arka Duvar'} Konumu: ${mod.x} mm`, false);
          }
        }
      }
    } else {
      // Hover mode check for grab cursor
      const intersects = this.raycaster.intersectObjects(this.cabinetsGroup.children, true);
      if (intersects.length > 0) {
        dom.style.cursor = window.CURRENT_DESIGN_LOCKED ? 'pointer' : 'grab';
      } else {
        dom.style.cursor = 'default';
      }
    }
  }

  handlePointerUp(e) {
    const dom = this.renderer.domElement;
    if (this.isDraggingCabinet) {
      this.isDraggingCabinet = false;
      this.controls.enabled = true; // RE-ENABLE ORBIT CONTROLS!
      dom.style.cursor = 'default';
      this.hideDragPill();

      if (this.draggedModule && this.hasMovedCabinet) {
        if (this.onModuleMoved) {
          this.onModuleMoved(this.draggedModule);
        }
      }
      this.draggedModule = null;
    }
  }

  showDragPill(text, isWarning = false) {
    const pill = document.getElementById('canvas-drag-pill');
    const txt = document.getElementById('canvas-drag-text');
    if (pill && txt) {
      txt.textContent = text;
      pill.style.display = 'flex';
      if (isWarning) {
        pill.style.background = '#ef4444';
        pill.style.borderColor = '#b91c1c';
        pill.style.boxShadow = '0 4px 16px rgba(239, 68, 68, 0.4)';
      } else {
        pill.style.background = '';
        pill.style.borderColor = '';
        pill.style.boxShadow = '';
      }
    }
  }

  hideDragPill() {
    const pill = document.getElementById('canvas-drag-pill');
    if (pill) {
      pill.style.display = 'none';
      pill.style.background = '';
      pill.style.borderColor = '';
      pill.style.boxShadow = '';
    }
  }

  updateAngleDisplay() {
    const dir = new THREE.Vector3();
    this.camera.getWorldDirection(dir);
    let deg = Math.round((Math.atan2(dir.x, dir.z) * 180) / Math.PI);
    if (deg < 0) deg += 360;

    const angleElem = document.getElementById('status-angle-display');
    if (angleElem) {
      angleElem.textContent = `360° AÇI: ${deg}°`;
    }
  }

  animate() {
    requestAnimationFrame(() => this.animate());
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }

  /*
   * BUILD ROOM: Back Wall at Z = 0, Left Wall at X = 0, Floor at Y = 0
   * Multi-wall visual boundary guides prevent overflowing past wall ends!
   */
  buildRoom(rw, rd, rh) {
    while (this.roomGroup.children.length > 0) {
      this.roomGroup.remove(this.roomGroup.children[0]);
    }

    // 1. Floor Plane (XZ Plane, Y = 0)
    const floorGeo = new THREE.PlaneGeometry(rw, rd);
    const floorMesh = new THREE.Mesh(floorGeo, this.matCache.floorTile);
    floorMesh.rotation.x = -Math.PI / 2;
    floorMesh.position.set(rw / 2, 0, rd / 2);
    floorMesh.receiveShadow = true;
    this.roomGroup.add(floorMesh);

    // 2. Back Wall (XY Plane at Z = 0)
    const currentBsMat = (this.backsplashTone === 'dark') ? this.matCache.wallBacksplashDark : this.matCache.wallBacksplashLight;
    const backWallGeo = new THREE.PlaneGeometry(rw, rh);
    const backWallMesh = new THREE.Mesh(backWallGeo, this.matCache.wallPaint);
    backWallMesh.position.set(rw / 2, rh / 2, 0);
    backWallMesh.receiveShadow = true;
    this.roomGroup.add(backWallMesh);

    // Dedicated Backsplash Panel on Back Wall (between Y=860 and Y=1500, height 640mm)
    const backBsGeo = new THREE.PlaneGeometry(rw, 640);
    const backBsMesh = new THREE.Mesh(backBsGeo, currentBsMat);
    backBsMesh.position.set(rw / 2, 860 + 320, 1.5);
    backBsMesh.receiveShadow = true;
    this.roomGroup.add(backBsMesh);
    this.backsplashMeshBack = backBsMesh;

    // Back Wall Boundary Line at X = rw (Wall End)
    const bwEndGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(rw, 0, 0),
      new THREE.Vector3(rw, rh, 0)
    ]);
    const bwEndLine = new THREE.Line(bwEndGeo, this.matCache.wallBorderMat);
    this.roomGroup.add(bwEndLine);

    // 3. Left Wall (YZ Plane at X = 0)
    const leftWallGeo = new THREE.PlaneGeometry(rd, rh);
    const leftWallMesh = new THREE.Mesh(leftWallGeo, this.matCache.wallPaint);
    leftWallMesh.rotation.y = Math.PI / 2;
    leftWallMesh.position.set(0, rh / 2, rd / 2);
    leftWallMesh.receiveShadow = true;
    this.roomGroup.add(leftWallMesh);

    // Dedicated Backsplash Panel on Left Wall (between Y=860 and Y=1500, height 640mm)
    const leftBsGeo = new THREE.PlaneGeometry(rd, 640);
    const leftBsMesh = new THREE.Mesh(leftBsGeo, currentBsMat);
    leftBsMesh.rotation.y = Math.PI / 2;
    leftBsMesh.position.set(1.5, 860 + 320, rd / 2);
    leftBsMesh.receiveShadow = true;
    this.roomGroup.add(leftBsMesh);
    this.backsplashMeshLeft = leftBsMesh;

    // Left Wall Boundary Line at Z = rd (Wall End)
    const lwEndGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, rd),
      new THREE.Vector3(0, rh, rd)
    ]);
    const lwEndLine = new THREE.Line(lwEndGeo, this.matCache.wallBorderMat);
    this.roomGroup.add(lwEndLine);
    this.backWallMesh = backWallMesh;
    this.leftWallMesh = leftWallMesh;
    this.bwEndLine = bwEndLine;
    this.lwEndLine = lwEndLine;

    // 4. Baseboards (Süpürgelikler)
    const baseboardGeoBack = new THREE.BoxGeometry(rw, 80, 15);
    const baseboardMeshBack = new THREE.Mesh(baseboardGeoBack, this.matCache.plinthAlu);
    baseboardMeshBack.position.set(rw / 2, 40, 7.5);
    this.roomGroup.add(baseboardMeshBack);

    const baseboardGeoLeft = new THREE.BoxGeometry(15, 80, rd);
    const baseboardMeshLeft = new THREE.Mesh(baseboardGeoLeft, this.matCache.plinthAlu);
    baseboardMeshLeft.position.set(7.5, 40, rd / 2);
    this.roomGroup.add(baseboardMeshLeft);
  }

  /*
   * RENDER CABINETS WITH TRUE 3D DEPTH ON BACK AND LEFT WALLS
   */
  render(roomConfig, modules, layoutType, materials) {
    this.roomConfig = roomConfig;
    this.modules = modules || [];
    this.materials = materials || {};

    const rw = roomConfig.room_width || 3600;
    const rd = roomConfig.room_depth || 2600;
    const rh = roomConfig.room_height || 2600;

    // 1. Build room walls & floor
    this.buildRoom(rw, rd, rh);

    // 2. Clear old cabinets & helpers
    while (this.cabinetsGroup.children.length > 0) {
      this.cabinetsGroup.remove(this.cabinetsGroup.children[0]);
    }
    while (this.helperGroup.children.length > 0) {
      this.helperGroup.remove(this.helperGroup.children[0]);
    }
    if (this.dimensionGroup) {
      while (this.dimensionGroup.children.length > 0) {
        this.dimensionGroup.remove(this.dimensionGroup.children[0]);
      }
    }

    // 3. Populate Cabinets
    this.modules.forEach(mod => {
      const meshGroup = this.createCabinet3D(mod);
      if (meshGroup) {
        this.cabinetsGroup.add(meshGroup);

        // Highlight selected module with glowing BoxHelper
        if (this.selectedModuleId === mod.id) {
          const boxHelper = new THREE.BoxHelper(meshGroup, 0x38bdf8);
          boxHelper.material.linewidth = 2;
          this.helperGroup.add(boxHelper);
        }
      }
    });

    // 4. Render 3D Dimension Rulers
    if (this.showRulers && this.renderDimensionRulers) {
      this.renderDimensionRulers(rw, rd, rh);
    }
  }

  /*
   * CREATE SOLID 3D CABINET MESH WITH TRUE DEPTH (600mm / 350mm)
   * Built in local coordinates centered at (0, y, z), then placed on Back Wall or Left Wall!
   */
  createCabinet3D(mod) {
    const group = new THREE.Group();
    const mw = mod.w || 600;
    const md = mod.d || 600;
    const mh = mod.h || 720;
    const wall = mod.wall || 'back';
    const isSelected = (this.selectedModuleId === mod.id);
    const bodyMat = this.getDoorMaterial(isSelected);

    const isCornerV = mod.type?.includes('corner_v');
    const isCornerL = mod.type === 'base_corner_l' || mod.type === 'wall_corner_l';
    const isCornerStraight = mod.type?.includes('corner_straight') || (mod.name && mod.name.toLowerCase().includes('düz kör'));

    if (mod.category === 'base') {
      const plinthH = 100;
      const bodyH = 720;
      const ctThick = 40;

      if (isCornerV) {
        // --- 1. V-KÖŞE (45° DİYAGONAL PAHLI KÖŞE DOLAP: 900x900 mm) ---
        const vW = mw; // 900
        const vD = md; // 900

        // Plinth (V-cut)
        const plinthShape = new THREE.Shape();
        plinthShape.moveTo(-vW/2 + 20, -vD/2 + 20);
        plinthShape.lineTo(vW/2 - 20, -vD/2 + 20);
        plinthShape.lineTo(vW/2 - 20, vD/2 - 320);
        plinthShape.lineTo(vW/2 - 320, vD/2 - 20);
        plinthShape.lineTo(-vW/2 + 20, vD/2 - 20);
        plinthShape.closePath();

        const pGeo = new THREE.ExtrudeGeometry(plinthShape, { depth: plinthH, bevelEnabled: false });
        pGeo.rotateX(Math.PI / 2);
        const plinthMesh = new THREE.Mesh(pGeo, this.matCache.plinthAlu);
        plinthMesh.position.set(0, plinthH, 0);
        group.add(plinthMesh);

        // Body (V-cut Extrusion)
        const bodyShape = new THREE.Shape();
        bodyShape.moveTo(-vW/2, -vD/2);
        bodyShape.lineTo(vW/2, -vD/2);
        bodyShape.lineTo(vW/2, vD/2 - 300);
        bodyShape.lineTo(vW/2 - 300, vD/2);
        bodyShape.lineTo(-vW/2, vD/2);
        bodyShape.closePath();

        const bGeo = new THREE.ExtrudeGeometry(bodyShape, { depth: bodyH, bevelEnabled: false });
        bGeo.rotateX(Math.PI / 2);
        const bodyMesh = new THREE.Mesh(bGeo, bodyMat);
        bodyMesh.position.set(0, plinthH + bodyH, 0);
        bodyMesh.castShadow = true;
        bodyMesh.receiveShadow = true;
        group.add(bodyMesh);

        // Countertop (V-cut with 20mm overhang on front diagonal and returns)
        const ctShape = new THREE.Shape();
        ctShape.moveTo(-vW/2 - 2, -vD/2 - 2);
        ctShape.lineTo(vW/2 + 2, -vD/2 - 2);
        ctShape.lineTo(vW/2 + 2, vD/2 - 280);
        ctShape.lineTo(vW/2 - 280, vD/2 + 2);
        ctShape.lineTo(-vW/2 - 2, vD/2 + 2);
        ctShape.closePath();

        const ctGeo = new THREE.ExtrudeGeometry(ctShape, { depth: ctThick, bevelEnabled: false });
        ctGeo.rotateX(Math.PI / 2);
        const ctMesh = new THREE.Mesh(ctGeo, this.getCountertopMaterial());
        ctMesh.position.set(0, plinthH + bodyH + ctThick, 0);
        ctMesh.castShadow = true;
        ctMesh.receiveShadow = true;
        group.add(ctMesh);

        // Diagonal 45° Door Frame & Panel
        const diagDoorW = Math.hypot(300, 300); // ~424mm
        const doorGeo = new THREE.BoxGeometry(diagDoorW - 8, bodyH - 12, 18);
        const doorMesh = new THREE.Mesh(doorGeo, bodyMat);
        doorMesh.position.set(vW/2 - 150, plinthH + bodyH / 2, vD/2 - 150);
        doorMesh.rotation.y = -Math.PI / 4;
        group.add(doorMesh);

        // Diagonal Handle
        const handle = this.createHandle3D(12, 90, false);
        handle.position.set(vW/2 - 150, plinthH + bodyH / 2, vD/2 - 150);
        handle.rotation.y = -Math.PI / 4;
        handle.translateZ(14);
        group.add(handle);

        // Middle Shelf (Tek Raf - Standart 18mm MDFlam)
        const sShape = new THREE.Shape();
        sShape.moveTo(-vW/2 + 18, -vD/2 + 18);
        sShape.lineTo(vW/2 - 18, -vD/2 + 18);
        sShape.lineTo(vW/2 - 18, vD/2 - 310);
        sShape.lineTo(vW/2 - 310, vD/2 - 18);
        sShape.lineTo(-vW/2 + 18, vD/2 - 18);
        sShape.closePath();
        const sGeo = new THREE.ExtrudeGeometry(sShape, { depth: 18, bevelEnabled: false });
        sGeo.rotateX(Math.PI / 2);
        const shelfMesh = new THREE.Mesh(sGeo, this.matCache.woodOak);
        shelfMesh.position.set(0, plinthH + bodyH / 2 + 9, 0);
        group.add(shelfMesh);

      } else if (isCornerL) {
        // --- 2. 90° L-KÖŞE DOLABI (900x900 mm) ---
        const plinthGeo = new THREE.BoxGeometry(mw - 30, plinthH, md - 70);
        const plinthMesh = new THREE.Mesh(plinthGeo, this.matCache.plinthAlu);
        plinthMesh.position.set(0, plinthH / 2, (md - 70) / 2 + 40);
        group.add(plinthMesh);

        // Body Box
        const bodyGeo = new THREE.BoxGeometry(mw, bodyH, md);
        const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
        bodyMesh.position.set(0, plinthH + bodyH / 2, md / 2);
        bodyMesh.castShadow = true;
        bodyMesh.receiveShadow = true;
        group.add(bodyMesh);

        // Countertop
        const ctDepth = md + 20;
        const ctGeo = new THREE.BoxGeometry(mw + 4, ctThick, ctDepth);
        const ctMesh = new THREE.Mesh(ctGeo, this.getCountertopMaterial());
        ctMesh.position.set(0, plinthH + bodyH + ctThick / 2, ctDepth / 2);
        group.add(ctMesh);

        // Bi-fold 90° Door representation
        const d1 = new THREE.Mesh(new THREE.BoxGeometry(mw * 0.45, bodyH - 10, 18), bodyMat);
        d1.position.set(-mw * 0.22, plinthH + bodyH / 2, md + 2);
        group.add(d1);

        const d2 = new THREE.Mesh(new THREE.BoxGeometry(mw * 0.45, bodyH - 10, 18), bodyMat);
        d2.position.set(mw * 0.22, plinthH + bodyH / 2, md + 2);
        group.add(d2);

        const h1 = this.createHandle3D(12, 90, false);
        h1.position.set(10, plinthH + bodyH / 2, md + 12);
        group.add(h1);

        // Middle Shelf (Tek Raf)
        const shelfGeo = new THREE.BoxGeometry(mw - 36, 18, md - 40);
        const shelfMesh = new THREE.Mesh(shelfGeo, this.matCache.woodOak);
        shelfMesh.position.set(0, plinthH + bodyH / 2, md / 2 - 10);
        group.add(shelfMesh);

      } else if (isCornerStraight) {
        // --- 3. DÜZ KÖR KÖŞE DOLABI (1000/1050 mm) ---
        const plinthGeo = new THREE.BoxGeometry(mw - 30, plinthH, md - 70);
        const plinthMesh = new THREE.Mesh(plinthGeo, this.matCache.plinthAlu);
        plinthMesh.position.set(0, plinthH / 2, (md - 70) / 2 + 40);
        group.add(plinthMesh);

        // Body Box
        const bodyGeo = new THREE.BoxGeometry(mw, bodyH, md);
        const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
        bodyMesh.position.set(0, plinthH + bodyH / 2, md / 2);
        bodyMesh.castShadow = true;
        bodyMesh.receiveShadow = true;
        group.add(bodyMesh);

        // Countertop
        const ctDepth = md + 20;
        const ctGeo = new THREE.BoxGeometry(mw + 4, ctThick, ctDepth);
        const ctMesh = new THREE.Mesh(ctGeo, this.getCountertopMaterial());
        ctMesh.position.set(0, plinthH + bodyH + ctThick / 2, ctDepth / 2);
        group.add(ctMesh);

        // Blind Filler Panel on left 600mm
        const blindGeo = new THREE.BoxGeometry(600, bodyH - 10, 18);
        const blindMesh = new THREE.Mesh(blindGeo, this.matCache.plinthAlu);
        blindMesh.position.set(-mw / 2 + 300, plinthH + bodyH / 2, md + 2);
        group.add(blindMesh);

        // Active Door on right (400mm)
        const doorW = mw - 600;
        const doorGeo = new THREE.BoxGeometry(doorW - 8, bodyH - 10, 18);
        const doorMesh = new THREE.Mesh(doorGeo, bodyMat);
        doorMesh.position.set(-mw / 2 + 600 + doorW / 2, plinthH + bodyH / 2, md + 4);
        group.add(doorMesh);

        const h = this.createHandle3D(12, 90, false);
        h.position.set(mw / 2 - 30, plinthH + bodyH / 2, md + 14);
        group.add(h);

        // Middle Shelf (Tek Raf - Standart 18mm MDFlam)
        const shelfGeo = new THREE.BoxGeometry(mw - 36, 18, md - 40);
        const shelfMesh = new THREE.Mesh(shelfGeo, this.matCache.woodOak);
        shelfMesh.position.set(0, plinthH + bodyH / 2, md / 2 - 10);
        group.add(shelfMesh);

      } else {
        // --- STANDART ALT DOLAPLAR ---
        const plinthGeo = new THREE.BoxGeometry(mw - 30, plinthH, md - 70);
        const plinthMesh = new THREE.Mesh(plinthGeo, this.matCache.plinthAlu);
        plinthMesh.position.set(0, plinthH / 2, (md - 70) / 2 + 40);
        plinthMesh.castShadow = true;
        plinthMesh.receiveShadow = true;
        group.add(plinthMesh);

        const isOpen = mod.isOpenShelf || mod.type?.includes('open_shelf');
        if (isOpen) {
          // OPEN SHELF BASE CABINET (Kapaksız Alt Dolap - İçi ve Rafları Görünür)
          const t = 18;
          const leftP = new THREE.Mesh(new THREE.BoxGeometry(t, bodyH, md), bodyMat);
          leftP.position.set(-mw / 2 + t / 2, plinthH + bodyH / 2, md / 2);
          group.add(leftP);

          const rightP = new THREE.Mesh(new THREE.BoxGeometry(t, bodyH, md), bodyMat);
          rightP.position.set(mw / 2 - t / 2, plinthH + bodyH / 2, md / 2);
          group.add(rightP);

          const botP = new THREE.Mesh(new THREE.BoxGeometry(mw - 2 * t, t, md), bodyMat);
          botP.position.set(0, plinthH + t / 2, md / 2);
          group.add(botP);

          const backP = new THREE.Mesh(new THREE.BoxGeometry(mw - 2 * t, bodyH - t, 8), bodyMat);
          backP.position.set(0, plinthH + (bodyH + t) / 2, 4);
          group.add(backP);

          const shelfCount = Math.max(1, Math.min(3, parseInt(mod.shelfCount) || 1));
          const spacing = (bodyH - t) / (shelfCount + 1);
          for (let s = 1; s <= shelfCount; s++) {
            const sY = plinthH + t + s * spacing;
            const shelfMesh = new THREE.Mesh(new THREE.BoxGeometry(mw - 2 * t, 18, md - 20), this.matCache.woodOak);
            shelfMesh.position.set(0, sY, md / 2);
            group.add(shelfMesh);
          }
        } else {
          // CLOSED BASE CABINET (Kapaklı Modül - İçi Kapalı, Dıştan Görünmez)
          const bodyGeo = new THREE.BoxGeometry(mw, bodyH, md);
          const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
          bodyMesh.position.set(0, plinthH + bodyH / 2, md / 2);
          bodyMesh.castShadow = true;
          bodyMesh.receiveShadow = true;
          group.add(bodyMesh);
        }

        const ctDepth = md + 20;
        const ctGeo = new THREE.BoxGeometry(mw + 4, ctThick, ctDepth);
        const ctMesh = new THREE.Mesh(ctGeo, this.getCountertopMaterial());
        ctMesh.position.set(0, plinthH + bodyH + ctThick / 2, ctDepth / 2);
        ctMesh.castShadow = true;
        ctMesh.receiveShadow = true;
        group.add(ctMesh);

        // DETAILS: Oven, Cooktop, Sink, Drawers, or Standard Doors
        if (!isOpen) {
          if (mod.type?.includes('oven')) {
            const ovenMesh = this.createOvenMesh(mw, bodyH, md);
            ovenMesh.position.set(0, plinthH + bodyH / 2, md + 2);
            group.add(ovenMesh);

            const cooktopMesh = this.createCooktopMesh(mw, ctDepth);
            cooktopMesh.position.set(0, plinthH + bodyH + ctThick + 2, ctDepth / 2);
            group.add(cooktopMesh);

          } else if (mod.type?.includes('sink')) {
            const sinkMesh = this.createSinkMesh(mw, ctDepth);
            sinkMesh.position.set(0, plinthH + bodyH + ctThick + 2, ctDepth / 2);
            group.add(sinkMesh);

          } else if (mod.drawers > 0) {
            const dh = bodyH / mod.drawers;
            for (let i = 0; i < mod.drawers; i++) {
              const dy = plinthH + (i * dh) + (dh / 2);
              const handleMesh = this.createHandle3D(Math.min(mw * 0.45, 140), 12, true);
              handleMesh.position.set(0, dy, md + 10);
              group.add(handleMesh);
            }
          } else {
            // Standard Single or Double Door (Kapaklar Kapalı)
            const handleMesh = this.createHandle3D(12, 90, false);
            handleMesh.position.set(mw / 2 - 25, plinthH + bodyH / 2, md + 10);
            group.add(handleMesh);
          }
        }
      }

    } else if (mod.category === 'wall') {
      // WALL CABINET (Depth: 350mm, Height: 720mm, Z: 0 to 350 FLUSH AGAINST WALL)
      const wallH = mod.h || 720;
      const wallZ = 1450;

      if (isCornerV) {
        // V-Corner Wall (650x650 mm)
        const vW = mw || 650;
        const vD = md || 650;
        const vShape = new THREE.Shape();
        vShape.moveTo(-vW/2, -vD/2);
        vShape.lineTo(vW/2, -vD/2);
        vShape.lineTo(vW/2, vD/2 - 250);
        vShape.lineTo(vW/2 - 250, vD/2);
        vShape.lineTo(-vW/2, vD/2);
        vShape.closePath();

        const vGeo = new THREE.ExtrudeGeometry(vShape, { depth: wallH, bevelEnabled: false });
        vGeo.rotateX(Math.PI / 2);
        const bodyMesh = new THREE.Mesh(vGeo, bodyMat);
        bodyMesh.position.set(0, wallZ + wallH, 0);
        group.add(bodyMesh);

        // Middle Shelf
        const sGeo = new THREE.ExtrudeGeometry(vShape, { depth: 18, bevelEnabled: false });
        sGeo.rotateX(Math.PI / 2);
        const sMesh = new THREE.Mesh(sGeo, this.matCache.woodOak);
        sMesh.position.set(0, wallZ + wallH / 2 + 9, 0);
        group.add(sMesh);

        const hMesh = this.createHandle3D(10, 60, false);
        hMesh.position.set(vW/2 - 125, wallZ + wallH / 2, vD/2 - 125);
        hMesh.rotation.y = -Math.PI / 4;
        hMesh.translateZ(12);
        // Automatic under-cabinet architectural LED for corner wall cabinet
        const ledStripGeoCorner = new THREE.BoxGeometry(vW - 40, 4, 12);
        const ledStripMeshCorner = new THREE.Mesh(ledStripGeoCorner, this.matCache.ledStripMat);
        ledStripMeshCorner.position.set(0, wallZ - 2, vD / 2 - 100);
        group.add(ledStripMeshCorner);

        const ledDownLightCorner = new THREE.PointLight(0xffedd5, 0.45, 900, 2);
        ledDownLightCorner.position.set(0, wallZ - 15, vD / 2 - 100);
        group.add(ledDownLightCorner);

      } else {
        const isOpen = mod.isOpenShelf || mod.type?.includes('open_shelf');
        if (isOpen) {
          // OPEN SHELF WALL CABINET (Kapaksız Üst Dolap - İçi ve Rafları Görünür)
          const t = 18;
          const leftP = new THREE.Mesh(new THREE.BoxGeometry(t, wallH, md), bodyMat);
          leftP.position.set(-mw / 2 + t / 2, wallZ + wallH / 2, md / 2);
          group.add(leftP);

          const rightP = new THREE.Mesh(new THREE.BoxGeometry(t, wallH, md), bodyMat);
          rightP.position.set(mw / 2 - t / 2, wallZ + wallH / 2, md / 2);
          group.add(rightP);

          const topP = new THREE.Mesh(new THREE.BoxGeometry(mw - 2 * t, t, md), bodyMat);
          topP.position.set(0, wallZ + wallH - t / 2, md / 2);
          group.add(topP);

          const botP = new THREE.Mesh(new THREE.BoxGeometry(mw - 2 * t, t, md), bodyMat);
          botP.position.set(0, wallZ + t / 2, md / 2);
          group.add(botP);

          const backP = new THREE.Mesh(new THREE.BoxGeometry(mw - 2 * t, wallH - 2 * t, 8), bodyMat);
          backP.position.set(0, wallZ + wallH / 2, 4);
          group.add(backP);

          const shelfCount = Math.max(1, Math.min(3, parseInt(mod.shelfCount) || 2));
          const spacing = (wallH - 2 * t) / (shelfCount + 1);
          for (let s = 1; s <= shelfCount; s++) {
            const sY = wallZ + t + s * spacing;
            const shelfMesh = new THREE.Mesh(new THREE.BoxGeometry(mw - 2 * t, 18, md - 10), this.matCache.woodOak);
            shelfMesh.position.set(0, sY, md / 2);
            group.add(shelfMesh);
          }
        } else {
          // CLOSED WALL CABINET (Kapaklı Üst Dolap - İçi Kapalı, Dıştan Görünmez)
          const bodyGeo = new THREE.BoxGeometry(mw, wallH, md);
          const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
          bodyMesh.position.set(0, wallZ + wallH / 2, md / 2);
          bodyMesh.castShadow = true;
          bodyMesh.receiveShadow = true;
          group.add(bodyMesh);

          if (mod.type?.includes('glass')) {
            const glassGeo = new THREE.BoxGeometry(mw * 0.8, wallH * 0.45, 8);
            const glassMesh = new THREE.Mesh(glassGeo, this.matCache.frostedGlass);
            glassMesh.position.set(0, wallZ + wallH / 2, md + 4);
            group.add(glassMesh);
          }

          const handleMesh = this.createHandle3D(60, 10, true);
          handleMesh.position.set(0, wallZ + 35, md + 10);
          group.add(handleMesh);
        }

        // AUTOMATIC ARCHITECTURAL UNDER-CABINET LED LIGHTING
        // Subtle recessed LED strip profile at the bottom of upper cabinet
        const ledStripGeo = new THREE.BoxGeometry(mw - 24, 4, 12);
        const ledStripMesh = new THREE.Mesh(ledStripGeo, this.matCache.ledStripMat);
        ledStripMesh.position.set(0, wallZ - 2, md / 2);
        group.add(ledStripMesh);

        // Soft warm downward projection onto countertop & backsplash
        const ledDownLight = new THREE.PointLight(0xffedd5, 0.45, 900, 2);
        ledDownLight.position.set(0, wallZ - 15, md / 2);
        group.add(ledDownLight);
      }

    } else if (mod.category === 'tall') {
      // TALL CABINET / FRIDGE (Depth: 600mm, Height: 2100mm, Z: 0 to 600 FLUSH AGAINST WALL)
      const tallH = mod.h || 2100;
      const isFridge = mod.type?.includes('fridge');
      const mat = isFridge ? this.matCache.fridgeInox : bodyMat;

      const bodyGeo = new THREE.BoxGeometry(mw, tallH, md);
      const bodyMesh = new THREE.Mesh(bodyGeo, mat);
      bodyMesh.position.set(0, tallH / 2, md / 2);
      bodyMesh.castShadow = true;
      bodyMesh.receiveShadow = true;
      group.add(bodyMesh);

      if (isFridge) {
        const splitGeo = new THREE.BoxGeometry(mw, 4, 10);
        const splitMesh = new THREE.Mesh(splitGeo, this.matCache.plinthAlu);
        splitMesh.position.set(0, tallH * 0.4, md + 2);
        group.add(splitMesh);

        const h1 = this.createHandle3D(8, 120, false);
        h1.position.set(mw / 2 - 25, tallH * 0.4 + 90, md + 10);
        group.add(h1);

        const h2 = this.createHandle3D(8, 120, false);
        h2.position.set(mw / 2 - 25, tallH * 0.4 - 90, md + 10);
        group.add(h2);
      } else {
        const h = this.createHandle3D(10, 240, false);
        h.position.set(mw / 2 - 25, tallH / 2, md + 10);
        group.add(h);

        // Middle Shelves for Pantry
        for (let si = 1; si <= 3; si++) {
          const sMesh = new THREE.Mesh(new THREE.BoxGeometry(mw - 36, 18, md - 40), this.matCache.woodOak);
          sMesh.position.set(0, (tallH / 4) * si, md / 2 - 10);
          group.add(sMesh);
        }
      }
    }

    // TAG OBJECTS FOR PRECISE RAYCAST INTERACTION
    group.userData = { moduleId: mod.id, module: mod, isCabinet: true };
    group.traverse(child => {
      if (child.isMesh) {
        child.userData = { moduleId: mod.id, module: mod, parentCabinet: group };
      }
    });

    // POSITION & ORIENT GROUP ON BACK WALL OR LEFT WALL
    if (wall === 'left') {
      group.position.set(0, 0, (mod.x || 0) + mw / 2);
      group.rotation.y = Math.PI / 2;
    } else if (wall === 'right') {
      const rw = this.roomConfig?.room_width || 3600;
      group.position.set(rw, 0, (mod.x || 0) + mw / 2);
      group.rotation.y = -Math.PI / 2;
    } else {
      group.position.set((mod.x || 0) + mw / 2, 0, 0);
      group.rotation.y = 0;
    }

    return group;
  }

  createHandle3D(w, h, horizontal = true) {
    const group = new THREE.Group();
    const handleGeo = new THREE.CylinderGeometry(4, 4, horizontal ? w : h, 16);
    const handleMesh = new THREE.Mesh(handleGeo, this.matCache.handleChrome);
    if (horizontal) {
      handleMesh.rotation.z = Math.PI / 2;
    }
    handleMesh.castShadow = true;
    group.add(handleMesh);

    const pinGeo = new THREE.CylinderGeometry(3, 3, 14, 12);
    const p1 = new THREE.Mesh(pinGeo, this.matCache.handleChrome);
    p1.rotation.x = Math.PI / 2;
    p1.position.set(horizontal ? -w / 2 + 8 : 0, horizontal ? 0 : -h / 2 + 8, -7);
    group.add(p1);

    const p2 = new THREE.Mesh(pinGeo, this.matCache.handleChrome);
    p2.rotation.x = Math.PI / 2;
    p2.position.set(horizontal ? w / 2 - 8 : 0, horizontal ? 0 : h / 2 - 8, -7);
    group.add(p2);

    return group;
  }

  createOvenMesh(mw, bodyH, md) {
    const group = new THREE.Group();
    const glassGeo = new THREE.BoxGeometry(mw * 0.88, bodyH * 0.82, 10);
    const glassMesh = new THREE.Mesh(glassGeo, this.matCache.ovenGlass);
    group.add(glassMesh);

    const h = this.createHandle3D(mw * 0.65, 8, true);
    h.position.set(0, bodyH * 0.3, 12);
    group.add(h);

    return group;
  }

  createCooktopMesh(mw, ctDepth) {
    const group = new THREE.Group();
    const cookGeo = new THREE.BoxGeometry(mw * 0.8, 6, ctDepth * 0.75);
    const cookMesh = new THREE.Mesh(cookGeo, this.matCache.ovenGlass);
    group.add(cookMesh);
    return group;
  }

  createSinkMesh(mw, ctDepth) {
    const group = new THREE.Group();
    const sinkGeo = new THREE.BoxGeometry(mw * 0.8, 4, ctDepth * 0.75);
    const sinkMesh = new THREE.Mesh(sinkGeo, this.matCache.sinkSteel);
    group.add(sinkMesh);

    const faucetGroup = new THREE.Group();
    const stemGeo = new THREE.CylinderGeometry(5, 5, 80, 16);
    const stemMesh = new THREE.Mesh(stemGeo, this.matCache.handleChrome);
    stemMesh.position.set(0, 40, -ctDepth * 0.22);
    faucetGroup.add(stemMesh);

    const archGeo = new THREE.TorusGeometry(35, 5, 12, 24, Math.PI);
    const archMesh = new THREE.Mesh(archGeo, this.matCache.handleChrome);
    archMesh.position.set(0, 80, -ctDepth * 0.22 + 35);
    archMesh.rotation.y = Math.PI / 2;
    faucetGroup.add(archMesh);

    group.add(faucetGroup);
    return group;
  }

  /*
   * DRAG & DROP FROM PALETTE: LIVE GHOST SHADOW ON BACK OR LEFT WALL
   * Turns RED if exceeding wall capacity to signal invalid placement!
   */
  setGhostModule(moduleTemplate, clientX, clientY) {
    if (!moduleTemplate) return;

    const rect = this.canvas.getBoundingClientRect();
    this.mouse.x = ((clientX - rect.left) / this.canvas.width) * 2 - 1;
    this.mouse.y = -((clientY - rect.top) / this.canvas.height) * 2 + 1;
    this.raycaster.setFromCamera(this.mouse, this.camera);

    const rw = this.roomConfig?.room_width || 3600;
    const rd = this.roomConfig?.room_depth || 2600;
    const mw = moduleTemplate.w || 600;
    const md = moduleTemplate.d || 600;
    const mh = moduleTemplate.h || 720;

    // Determine target wall: check active wall or raycast intersection proximity
    let targetWall = window.CURRENT_ACTIVE_WALL || 'back';
    const hitBack = new THREE.Vector3();
    const hitLeft = new THREE.Vector3();
    const hasHitBack = this.raycaster.ray.intersectPlane(this.planeZ, hitBack);
    const hasHitLeft = this.raycaster.ray.intersectPlane(this.planeX, hitLeft);

    if (hasHitLeft && hitLeft.x <= 400 && hitLeft.z >= 0 && hitLeft.z <= rd) {
      targetWall = 'left';
    } else if (hasHitBack && hitBack.z <= 400 && hitBack.x >= 0 && hitBack.x <= rw) {
      targetWall = 'back';
    }

    this.ghostTargetWall = targetWall;
    const wallLen = (targetWall === 'left') ? rd : rw;
    const hitPoint = (targetWall === 'left') ? hitLeft : hitBack;

    let rawPos = (targetWall === 'left') ? (hitPoint.z - mw / 2) : (hitPoint.x - mw / 2);
    let bestSnapPos = Math.round(rawPos / 50) * 50;

    // Check snap with existing modules on this wall
    const isUpper = moduleTemplate.category === 'wall';
    const wallMods = this.modules.filter(m => (m.wall || 'back') === targetWall && (isUpper ? m.category === 'wall' : m.category !== 'wall'));
    for (let m of wallMods) {
      const rEdge = (m.x || 0) + (m.w || 600);
      const lEdge = (m.x || 0) - mw;
      if (Math.abs(rawPos - rEdge) < 120) {
        bestSnapPos = rEdge;
        break;
      } else if (Math.abs(rawPos - lEdge) < 120) {
        bestSnapPos = lEdge;
        break;
      }
    }

    // VALIDATION: Does it fit on the wall?
    const isValid = (bestSnapPos >= 0) && (bestSnapPos + mw <= wallLen);
    this.ghostIsValid = isValid;
    this.ghostSnapPos = Math.max(0, Math.min(wallLen - mw, bestSnapPos));

    const gz = moduleTemplate.category === 'wall' ? 1450 : (moduleTemplate.category === 'base' ? 100 : 0);

    // Create or update ghost mesh
    if (!this.ghostMesh) {
      this.ghostMesh = new THREE.Group();
      const boxGeo = new THREE.BoxGeometry(mw, mh, md);
      const mesh = new THREE.Mesh(boxGeo, isValid ? this.matCache.ghostValidMat : this.matCache.ghostInvalidMat);
      const edges = new THREE.EdgesGeometry(boxGeo);
      const wire = new THREE.LineSegments(edges, isValid ? this.matCache.ghostWireMat : this.matCache.ghostWireInvalidMat);
      this.ghostMesh.add(mesh);
      this.ghostMesh.add(wire);
      this.scene.add(this.ghostMesh);
    } else {
      // Update material color based on validity
      this.ghostMesh.children[0].material = isValid ? this.matCache.ghostValidMat : this.matCache.ghostInvalidMat;
      this.ghostMesh.children[1].material = isValid ? this.matCache.ghostWireMat : this.matCache.ghostWireInvalidMat;
    }

    // Orient ghost
    if (targetWall === 'left') {
      this.ghostMesh.position.set(md / 2, gz + mh / 2, this.ghostSnapPos + mw / 2);
      this.ghostMesh.rotation.y = Math.PI / 2;
    } else {
      this.ghostMesh.position.set(this.ghostSnapPos + mw / 2, gz + mh / 2, md / 2);
      this.ghostMesh.rotation.y = 0;
    }

    this.ghostMesh.visible = true;
  }

  clearGhostModule() {
    if (this.ghostMesh) {
      this.ghostMesh.visible = false;
      this.scene.remove(this.ghostMesh);
      this.ghostMesh = null;
    }
  }

  getGhostSnapPosition() {
    return {
      pos: this.ghostSnapPos,
      wall: this.ghostTargetWall,
      isValid: this.ghostIsValid
    };
  }

  // Camera presets
  setPreset(type) {
    const rw = this.roomConfig?.room_width || 3600;
    const rd = this.roomConfig?.room_depth || 2600;

    if (type === 'front') {
      this.camera.position.set(rw / 2, 1200, 4800);
      this.controls.target.set(rw / 2, 1000, 300);
      this.controls.autoRotate = false;
    } else if (type === 'left_wall') {
      this.camera.position.set(rw + 800, 1400, rd / 2);
      this.controls.target.set(0, 1000, rd / 2);
      this.controls.autoRotate = false;
    } else if (type === 'showroom') {
      this.camera.position.set(rw * 0.95, 1800, 4200);
      this.controls.target.set(rw / 2, 900, 300);
      this.controls.autoRotate = false;
    } else if (type === 'top') {
      this.camera.position.set(rw / 2, 5500, rd / 2);
      this.controls.target.set(rw / 2, 0, rd / 2);
      this.controls.autoRotate = false;
    } else if (type === 'reset') {
      this.camera.position.set(2800, 2100, 4800);
      this.controls.target.set(rw / 2, 950, 400);
      this.controls.autoRotate = false;
    } else if (type === 'auto') {
      this.controls.autoRotate = !this.controls.autoRotate;
    }
    this.controls.update();
  }

  /*
   * VISUAL BOUNDARY WARNING
   * Flashes the active wall with glowing red warning mesh and canvas red border pulse
   */
  flashBoundaryWarning(wall) {
    const rw = this.roomConfig?.room_width || 3600;
    const rd = this.roomConfig?.room_depth || 2600;
    const rh = this.roomConfig?.room_height || 2600;

    const isLeft = (wall === 'left');
    const warningGeo = isLeft
      ? new THREE.PlaneGeometry(rd, rh)
      : new THREE.PlaneGeometry(rw, rh);
    const warningMat = new THREE.MeshBasicMaterial({
      color: 0xef4444,
      transparent: true,
      opacity: 0.35,
      side: THREE.DoubleSide
    });
    const warningMesh = new THREE.Mesh(warningGeo, warningMat);
    if (isLeft) {
      warningMesh.rotation.y = Math.PI / 2;
      warningMesh.position.set(2, rh / 2, rd / 2);
    } else {
      warningMesh.position.set(rw / 2, rh / 2, 2);
    }
    this.scene.add(warningMesh);

    if (this.canvas) {
      this.canvas.style.transition = 'box-shadow 0.15s ease, outline 0.15s ease';
      this.canvas.style.outline = '4px solid #ef4444';
      this.canvas.style.boxShadow = '0 0 25px rgba(239, 68, 68, 0.7)';
    }

    let count = 0;
    const flashTimer = setInterval(() => {
      count++;
      warningMesh.visible = !warningMesh.visible;
      if (count >= 6) {
        clearInterval(flashTimer);
        this.scene.remove(warningMesh);
        warningGeo.dispose();
        warningMat.dispose();
        if (this.canvas) {
          this.canvas.style.outline = '';
          this.canvas.style.boxShadow = '';
        }
      }
    }, 150);
  }

  /*
   * 3D INTERACTIVE DIMENSION RULER SYSTEM (ADeko CAD Style)
   * Displays dynamic dimension brackets, cabinet widths, wall gaps and remaining space.
   */
  toggleRulers() {
    this.showRulers = !this.showRulers;
    if (this.dimensionGroup) {
      this.dimensionGroup.visible = this.showRulers;
    }
    return this.showRulers;
  }

  createDimensionSprite(text, isRemaining = false, isGap = false) {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');

    const bgColor = isRemaining ? 'rgba(6, 78, 59, 0.94)' : (isGap ? 'rgba(120, 53, 15, 0.94)' : 'rgba(15, 23, 42, 0.92)');
    const borderColor = isRemaining ? '#10b981' : (isGap ? '#f59e0b' : '#38bdf8');
    const textColor = isRemaining ? '#34d399' : (isGap ? '#fbbf24' : '#e0f2fe');

    ctx.fillStyle = bgColor;
    ctx.beginPath();
    ctx.roundRect(4, 4, 248, 56, 14);
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = borderColor;
    ctx.stroke();

    ctx.fillStyle = textColor;
    ctx.font = 'bold 22px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 128, 32);

    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    const spriteMat = new THREE.SpriteMaterial({ map: texture, depthTest: false });
    const sprite = new THREE.Sprite(spriteMat);
    sprite.scale.set(280, 70, 1);
    return sprite;
  }

  renderDimensionRulers(rw, rd, rh) {
    const walls = ['back', 'left'];

    walls.forEach(wall => {
      const isLeft = (wall === 'left');
      const wallLen = isLeft ? rd : rw;

      // Filter base/tall modules on this wall, sorted by position X
      const mods = this.modules
        .filter(m => (m.wall || 'back') === wall && m.category !== 'wall')
        .sort((a, b) => (a.x || 0) - (b.x || 0));

      if (mods.length === 0) return;

      const rulerY = 960; // Just above 860mm countertop
      const rulerDist = 700; // Directly in front of 600mm base cabinets

      const lineMat = new THREE.LineBasicMaterial({
        color: 0x38bdf8,
        linewidth: 2,
        depthTest: false
      });
      const gapLineMat = new THREE.LineBasicMaterial({
        color: 0xf59e0b,
        linewidth: 2,
        depthTest: false
      });
      const remLineMat = new THREE.LineBasicMaterial({
        color: 0x10b981,
        linewidth: 2,
        depthTest: false
      });

      // 1. Initial Wall Gap (if first module starts after x > 30)
      const first = mods[0];
      if ((first.x || 0) > 30) {
        const gapW = first.x;
        const pts = [];
        if (isLeft) {
          pts.push(new THREE.Vector3(rulerDist, rulerY, 0));
          pts.push(new THREE.Vector3(rulerDist, rulerY, gapW));
        } else {
          pts.push(new THREE.Vector3(0, rulerY, rulerDist));
          pts.push(new THREE.Vector3(gapW, rulerY, rulerDist));
        }
        const geo = new THREE.BufferGeometry().setFromPoints(pts);
        this.dimensionGroup.add(new THREE.Line(geo, gapLineMat));

        const sp = this.createDimensionSprite(`📐 Boşluk: ${Math.round(gapW / 10)} cm`, false, true);
        if (isLeft) sp.position.set(rulerDist, rulerY + 50, gapW / 2);
        else sp.position.set(gapW / 2, rulerY + 50, rulerDist);
        this.dimensionGroup.add(sp);
      }

      // 2. Each module's dimension bracket
      mods.forEach((m, idx) => {
        const mx = m.x || 0;
        const mw = m.w || 600;
        const mEnd = mx + mw;

        // Module dimension line
        const pts = [];
        if (isLeft) {
          pts.push(new THREE.Vector3(rulerDist, rulerY, mx));
          pts.push(new THREE.Vector3(rulerDist, rulerY, mEnd));
        } else {
          pts.push(new THREE.Vector3(mx, rulerY, rulerDist));
          pts.push(new THREE.Vector3(mEnd, rulerY, rulerDist));
        }
        const geo = new THREE.BufferGeometry().setFromPoints(pts);
        this.dimensionGroup.add(new THREE.Line(geo, lineMat));

        // Dimension text sprite
        const sp = this.createDimensionSprite(`↔ ${Math.round(mw / 10)} cm`);
        sp.scale.set(Math.min(mw * 0.75, 240), 60, 1);
        if (isLeft) sp.position.set(rulerDist, rulerY + 45, mx + mw / 2);
        else sp.position.set(mx + mw / 2, rulerY + 45, rulerDist);
        this.dimensionGroup.add(sp);

        // Gap between this module and next
        if (idx < mods.length - 1) {
          const next = mods[idx + 1];
          const gap = (next.x || 0) - mEnd;
          if (gap > 30) {
            const gapPts = [];
            if (isLeft) {
              gapPts.push(new THREE.Vector3(rulerDist, rulerY, mEnd));
              gapPts.push(new THREE.Vector3(rulerDist, rulerY, next.x));
            } else {
              gapPts.push(new THREE.Vector3(mEnd, rulerY, rulerDist));
              gapPts.push(new THREE.Vector3(next.x, rulerY, rulerDist));
            }
            const gapGeo = new THREE.BufferGeometry().setFromPoints(gapPts);
            this.dimensionGroup.add(new THREE.Line(gapGeo, gapLineMat));

            const gapSp = this.createDimensionSprite(`↔ Boşluk: ${Math.round(gap / 10)} cm`, false, true);
            if (isLeft) gapSp.position.set(rulerDist, rulerY + 50, mEnd + gap / 2);
            else gapSp.position.set(mEnd + gap / 2, rulerY + 50, rulerDist);
            this.dimensionGroup.add(gapSp);
          }
        }
      });

      // 3. Remaining space to wall end
      const last = mods[mods.length - 1];
      const lastEnd = (last.x || 0) + (last.w || 600);
      const remaining = wallLen - lastEnd;
      if (remaining > 30) {
        const remPts = [];
        if (isLeft) {
          remPts.push(new THREE.Vector3(rulerDist, rulerY, lastEnd));
          remPts.push(new THREE.Vector3(rulerDist, rulerY, wallLen));
        } else {
          remPts.push(new THREE.Vector3(lastEnd, rulerY, rulerDist));
          remPts.push(new THREE.Vector3(wallLen, rulerY, rulerDist));
        }
        const remGeo = new THREE.BufferGeometry().setFromPoints(remPts);
        this.dimensionGroup.add(new THREE.Line(remGeo, remLineMat));

        const remSp = this.createDimensionSprite(`✅ Kalan: ${Math.round(remaining / 10)} cm`, true, false);
        if (isLeft) remSp.position.set(rulerDist, rulerY + 50, lastEnd + remaining / 2);
        else remSp.position.set(lastEnd + remaining / 2, rulerY + 50, rulerDist);
        this.dimensionGroup.add(remSp);
      }
    });
  }
}

window.StudioCanvas3D = StudioCanvas3D;
