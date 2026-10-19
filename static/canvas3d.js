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

    // 5. Lighting (Warm interior ADeko showroom studio)
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.75);
    this.scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xfff7ed, 0.9);
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
    this.scene.add(dirLight);

    // Overhead Spotlights
    const spot1 = new THREE.PointLight(0xffedd5, 0.55, 3500);
    spot1.position.set(1200, 2300, 700);
    this.scene.add(spot1);

    const spot2 = new THREE.PointLight(0xffedd5, 0.55, 3500);
    spot2.position.set(2400, 2300, 700);
    this.scene.add(spot2);

    // Groups for dynamic geometry
    this.roomGroup = new THREE.Group();
    this.cabinetsGroup = new THREE.Group();
    this.helperGroup = new THREE.Group();
    this.scene.add(this.roomGroup);
    this.scene.add(this.cabinetsGroup);
    this.scene.add(this.helperGroup);

    // Resize listener
    window.addEventListener('resize', () => this.onWindowResize());
  }

  setupProceduralTextures() {
    // 1. Natural Oak Wood Texture
    const woodCanvas = document.createElement('canvas');
    woodCanvas.width = 512;
    woodCanvas.height = 512;
    const wctx = woodCanvas.getContext('2d');
    wctx.fillStyle = "#c89a68";
    wctx.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 500; i++) {
      wctx.strokeStyle = `rgba(138, 90, 48, ${0.05 + Math.random() * 0.12})`;
      wctx.lineWidth = 1 + Math.random() * 2;
      wctx.beginPath();
      const y = Math.random() * 512;
      wctx.moveTo(0, y);
      wctx.bezierCurveTo(150, y + Math.random() * 10 - 5, 350, y + Math.random() * 10 - 5, 512, y);
      wctx.stroke();
    }
    const woodTex = new THREE.CanvasTexture(woodCanvas);
    woodTex.wrapS = THREE.RepeatWrapping;
    woodTex.wrapT = THREE.RepeatWrapping;

    // 2. Glossy Tile Floor Texture
    const tileCanvas = document.createElement('canvas');
    tileCanvas.width = 256;
    tileCanvas.height = 256;
    const tctx = tileCanvas.getContext('2d');
    tctx.fillStyle = "#e2e8f0";
    tctx.fillRect(0, 0, 256, 256);
    tctx.fillStyle = "rgba(203, 213, 225, 0.5)";
    for (let i = 0; i < 200; i++) {
      tctx.fillRect(Math.random() * 256, Math.random() * 256, 2, 2);
    }
    tctx.strokeStyle = "#94a3b8";
    tctx.lineWidth = 4;
    tctx.strokeRect(0, 0, 256, 256);
    const tileTex = new THREE.CanvasTexture(tileCanvas);
    tileTex.wrapS = THREE.RepeatWrapping;
    tileTex.wrapT = THREE.RepeatWrapping;
    tileTex.repeat.set(6, 4);

    // Common Materials
    this.matCache = {
      woodOak: new THREE.MeshStandardMaterial({ map: woodTex, roughness: 0.35, metalness: 0.05 }),
      countertopQuartz: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.15, metalness: 0.05 }),
      plinthAlu: new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.4, metalness: 0.6 }),
      frostedGlass: new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.2, transparent: true, opacity: 0.65 }),
      handleChrome: new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.15, metalness: 0.9 }),
      ovenGlass: new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.1, metalness: 0.8 }),
      fridgeInox: new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.3, metalness: 0.4 }),
      sinkSteel: new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.25, metalness: 0.85 }),
      floorTile: new THREE.MeshStandardMaterial({ map: tileTex, roughness: 0.25, metalness: 0.15 }),
      wallPaint: new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.8, metalness: 0.0 }),
      wallBacksplash: new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.7, metalness: 0.05 }),
      wallBorderMat: new THREE.LineBasicMaterial({ color: 0x3b82f6, linewidth: 3 }),
      ghostValidMat: new THREE.MeshStandardMaterial({ color: 0x0284c7, transparent: true, opacity: 0.45 }),
      ghostInvalidMat: new THREE.MeshStandardMaterial({ color: 0xef4444, transparent: true, opacity: 0.55 }),
      ghostWireMat: new THREE.LineBasicMaterial({ color: 0x38bdf8, linewidth: 2 }),
      ghostWireInvalidMat: new THREE.LineBasicMaterial({ color: 0xf87171, linewidth: 2 }),
      selectedMat: new THREE.MeshStandardMaterial({ color: 0x3b82f6, roughness: 0.3, metalness: 0.1 })
    };
  }

  onWindowResize() {
    if (!this.container) return;
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
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
        this.isDraggingCabinet = true;
        this.draggedModule = targetMod;
        this.controls.enabled = false; // FREEZE CAMERA ROTATION!
        dom.style.cursor = 'grabbing';

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
        dom.style.cursor = 'grab';
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
    const backWallGeo = new THREE.PlaneGeometry(rw, rh);
    const backWallMesh = new THREE.Mesh(backWallGeo, this.matCache.wallBacksplash);
    backWallMesh.position.set(rw / 2, rh / 2, 0);
    backWallMesh.receiveShadow = true;
    this.roomGroup.add(backWallMesh);

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
    const isSelected = this.selectedModuleId === mod.id;

    const bodyMat = isSelected ? this.matCache.selectedMat : this.matCache.woodOak;

    if (mod.category === 'base') {
      // BASE CABINET (Depth: 600mm)
      const plinthH = 100;
      const plinthGeo = new THREE.BoxGeometry(mw - 30, plinthH, md - 70);
      const plinthMesh = new THREE.Mesh(plinthGeo, this.matCache.plinthAlu);
      plinthMesh.position.set(0, plinthH / 2, (md - 70) / 2 + 40);
      plinthMesh.castShadow = true;
      plinthMesh.receiveShadow = true;
      group.add(plinthMesh);

      // Cabinet Body (Height: 720mm, Depth: 600mm, from Z = 0 to Z = 600)
      const bodyH = 720;
      const bodyGeo = new THREE.BoxGeometry(mw, bodyH, md);
      const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
      bodyMesh.position.set(0, plinthH + bodyH / 2, md / 2);
      bodyMesh.castShadow = true;
      bodyMesh.receiveShadow = true;
      group.add(bodyMesh);

      // White Quartz Countertop (Thickness: 40mm, Depth: 620mm with 20mm front overhang!)
      const ctThick = 40;
      const ctDepth = md + 20;
      const ctGeo = new THREE.BoxGeometry(mw + 4, ctThick, ctDepth);
      const ctMesh = new THREE.Mesh(ctGeo, this.matCache.countertopQuartz);
      ctMesh.position.set(0, plinthH + bodyH + ctThick / 2, ctDepth / 2);
      ctMesh.castShadow = true;
      ctMesh.receiveShadow = true;
      group.add(ctMesh);

      // DETAILS: Oven, Cooktop, Sink, Drawers, or Handles
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
        const handleMesh = this.createHandle3D(12, 90, false);
        handleMesh.position.set(mw / 2 - 25, plinthH + bodyH / 2, md + 10);
        group.add(handleMesh);
      }

    } else if (mod.category === 'wall') {
      // WALL CABINET (Depth: 350mm, Height: 720mm, Z: 0 to 350 FLUSH AGAINST WALL)
      const wallH = mod.h || 720;
      const wallZ = 1450;
      const bodyGeo = new THREE.BoxGeometry(mw, wallH, md);
      const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
      bodyMesh.position.set(0, wallZ + wallH / 2, md / 2);
      bodyMesh.castShadow = true;
      bodyMesh.receiveShadow = true;
      group.add(bodyMesh);

      // Frosted Glass Inset on Door
      const glassGeo = new THREE.BoxGeometry(mw * 0.8, wallH * 0.45, 8);
      const glassMesh = new THREE.Mesh(glassGeo, this.matCache.frostedGlass);
      glassMesh.position.set(0, wallZ + wallH / 2, md + 4);
      group.add(glassMesh);

      // Horizontal Bar Handle
      const handleMesh = this.createHandle3D(60, 10, true);
      handleMesh.position.set(0, wallZ + 35, md + 10);
      group.add(handleMesh);

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
}

window.StudioCanvas3D = StudioCanvas3D;
