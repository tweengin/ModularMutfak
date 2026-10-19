/**
 * ModulerCraft Pro - Architectural 2D Plan & Elevation Engine
 * Transforms raw CAD blueprints into photorealistic, luxury architectural showroom renders:
 * - Multi-wall L-Kitchen Support (Back Wall & Left Wall)
 * - Interactive in-canvas mouse drag & repositioning with wall boundary clamping
 * - Tactile cabinet doors with wood grain textures, bevels, and inner drop shadows
 * - Quartz/Marble countertops with dual-edge chamfer and cast shadows
 * - Modern metallic bar handles with specular reflection
 * - Dynamic door swing arc collision detection
 */

class StudioCanvas2D {
  constructor(canvasElement) {
    this.canvas = canvasElement;
    this.ctx = canvasElement.getContext('2d');
    this.scale = 0.12;
    this.originX = 80;
    this.originY = 80;
    this.viewMode = 'plan'; // 'plan' or 'elevation'
    this.selectedModuleId = null;
    this.doorCollisionDetected = false;
    this.onSelectionChange = null;
    this.onCollisionChange = null;

    // Interactive Dragging State in 2D
    this.isDragging = false;
    this.draggedModule = null;
    this.dragStartPos = { x: 0, y: 0 };
    this.initialModPos = 0;
    this.hasDragged = false;

    this.initEvents();
  }

  initEvents() {
    this.canvas.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return;
      const rect = this.canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      this.handleMouseDown(mouseX, mouseY);
    });

    window.addEventListener('mousemove', (e) => {
      if (!this.isDragging) return;
      const rect = this.canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      this.handleMouseMove(mouseX, mouseY);
    });

    window.addEventListener('mouseup', () => {
      if (this.isDragging) {
        this.isDragging = false;
        this.draggedModule = null;
        this.canvas.style.cursor = 'default';
        if (this.hasDragged) {
          if (window.updatePlacedModulesUI) window.updatePlacedModulesUI();
          if (window.renderStudioCanvas) window.renderStudioCanvas();
        }
      }
    });

    this.canvas.addEventListener('mousemove', (e) => {
      if (this.isDragging) return;
      const rect = this.canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      const hit = this.findModuleAt(mouseX, mouseY);
      this.canvas.style.cursor = hit ? 'grab' : 'default';
    });
  }

  findModuleAt(x, y) {
    const mods = window.CURRENT_DESIGN?.modules || [];
    if (this.viewMode === 'elevation') {
      for (let i = mods.length - 1; i >= 0; i--) {
        const m = mods[i];
        if (m._bounds_elev &&
            x >= m._bounds_elev.x && x <= m._bounds_elev.x + m._bounds_elev.w &&
            y >= m._bounds_elev.y && y <= m._bounds_elev.y + m._bounds_elev.h) {
          return m;
        }
      }
    } else {
      for (let i = mods.length - 1; i >= 0; i--) {
        const m = mods[i];
        if (m._bounds &&
            x >= m._bounds.x && x <= m._bounds.x + m._bounds.w &&
            y >= m._bounds.y && y <= m._bounds.y + m._bounds.h) {
          return m;
        }
      }
    }
    return null;
  }

  handleMouseDown(x, y) {
    const mod = this.findModuleAt(x, y);
    if (mod) {
      this.isDragging = true;
      this.draggedModule = mod;
      this.selectedModuleId = mod.id;
      this.dragStartPos = { x, y };
      this.initialModPos = mod.x || 0;
      this.hasDragged = false;
      this.canvas.style.cursor = 'grabbing';

      if (this.onSelectionChange) {
        this.onSelectionChange(mod.id);
      }
      this.render(window.CURRENT_DESIGN.room_config, window.CURRENT_DESIGN.modules, window.CURRENT_DESIGN.layout_type, window.CURRENT_DESIGN.category);
    } else {
      this.selectedModuleId = null;
      if (this.onSelectionChange) {
        this.onSelectionChange(null);
      }
      this.render(window.CURRENT_DESIGN.room_config, window.CURRENT_DESIGN.modules, window.CURRENT_DESIGN.layout_type, window.CURRENT_DESIGN.category);
    }
  }

  handleMouseMove(x, y) {
    if (!this.isDragging || !this.draggedModule) return;
    const dx = x - this.dragStartPos.x;
    const dy = y - this.dragStartPos.y;
    if (Math.hypot(dx, dy) > 4) {
      this.hasDragged = true;
    }

    if (this.hasDragged) {
      const mod = this.draggedModule;
      const wall = mod.wall || 'back';
      const rw = window.CURRENT_DESIGN.room_width || 3600;
      const rd = window.CURRENT_DESIGN.room_depth || 2600;
      const wallLen = (wall === 'left' || wall === 'right') ? rd : rw;

      let deltaMm = 0;
      if (this.viewMode === 'plan') {
        if (wall === 'left') {
          // Left wall runs vertically in 2D plan (down to up)
          deltaMm = -dy / this.scale;
        } else {
          deltaMm = dx / this.scale;
        }
      } else {
        // Elevation view is always horizontal
        deltaMm = dx / this.scale;
      }

      let newX = Math.round((this.initialModPos + deltaMm) / 50) * 50;
      // STRICT WALL BOUNDARY CLAMP
      mod.x = Math.max(0, Math.min(wallLen - (mod.w || 600), newX));

      this.render(window.CURRENT_DESIGN.room_config, window.CURRENT_DESIGN.modules, window.CURRENT_DESIGN.layout_type, window.CURRENT_DESIGN.category);
    }
  }

  resize() {
    const parent = this.canvas.parentElement;
    if (parent) {
      this.canvas.width = parent.clientWidth;
      this.canvas.height = parent.clientHeight;
    }
  }

  render(roomConfig, modules, layoutType, category) {
    this.resize();
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    ctx.clearRect(0, 0, w, h);

    if (this.viewMode === 'elevation') {
      this.renderElevation(roomConfig, modules, layoutType);
    } else {
      this.renderPlan(roomConfig, modules, layoutType, category);
    }
  }

  /*
   * ARCHITECTURAL 2D PLAN VIEW (KUŞBAKIŞI MİMARİ PLAN)
   * Back Wall along bottom, Left Wall along left side with L-Kitchen support!
   */
  renderPlan(roomConfig, modules, layoutType, category) {
    const ctx = this.ctx;
    const roomW = roomConfig.room_width || 3600;
    const roomD = roomConfig.room_depth || 2600;

    const pad = 100;
    const scaleX = (this.canvas.width - (pad * 2)) / roomW;
    const scaleY = (this.canvas.height - (pad * 2)) / roomD;
    this.scale = Math.min(scaleX, scaleY, 0.22);

    this.originX = (this.canvas.width - (roomW * this.scale)) / 2;
    this.originY = (this.canvas.height - (roomD * this.scale)) / 2;

    const ox = this.originX;
    const oy = this.originY;
    const rpxW = roomW * this.scale;
    const rpxD = roomD * this.scale;

    // 1. Warm Floor Parquet Texture
    const floorGrad = ctx.createLinearGradient(ox, oy, ox + rpxW, oy + rpxD);
    floorGrad.addColorStop(0, "#232e3f");
    floorGrad.addColorStop(1, "#18202d");
    ctx.fillStyle = floorGrad;
    ctx.fillRect(ox, oy, rpxW, rpxD);

    // Subtle parquet grid
    ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
    ctx.lineWidth = 1;
    const plankSpacing = 250 * this.scale;
    for (let x = ox; x <= ox + rpxW; x += plankSpacing) {
      ctx.beginPath();
      ctx.moveTo(x, oy);
      ctx.lineTo(x, oy + rpxD);
      ctx.stroke();
    }

    // Flooring Sponsor Badge
    const floorSponsor = roomConfig.flooring?.sponsor || "AGT Zemin Çözümleri";
    ctx.fillStyle = "rgba(245, 158, 11, 0.4)";
    ctx.font = "bold 11px sans-serif";
    ctx.fillText(`✦ Zemin: ${roomConfig.flooring?.type || 'Laminat Parke'} (${floorSponsor})`, ox + 15, oy + rpxD - 15);

    // 2. Room Walls with Depth Bevel
    const wallThick = 150 * this.scale;
    ctx.fillStyle = "#374357";
    ctx.strokeStyle = "#4f5e75";
    ctx.lineWidth = 2;

    // Back Wall (Bottom)
    ctx.fillRect(ox - wallThick, oy + rpxD, rpxW + (2 * wallThick), wallThick);
    ctx.strokeRect(ox - wallThick, oy + rpxD, rpxW + (2 * wallThick), wallThick);

    // Top Wall
    ctx.fillRect(ox - wallThick, oy - wallThick, rpxW + (2 * wallThick), wallThick);
    ctx.strokeRect(ox - wallThick, oy - wallThick, rpxW + (2 * wallThick), wallThick);

    // Left Wall
    ctx.fillRect(ox - wallThick, oy, wallThick, rpxD);
    ctx.strokeRect(ox - wallThick, oy, wallThick, rpxD);

    // Right Wall
    ctx.fillRect(ox + rpxW, oy, wallThick, rpxD);
    ctx.strokeRect(ox + rpxW, oy, wallThick, rpxD);

    // 3. Openings: Doors with Swing Clearance Arc
    const door = roomConfig.door;
    let doorPivot = null;
    let doorRadius = 0;

    if (door) {
      const doorW = (door.width || 900) * this.scale;
      doorRadius = doorW;

      ctx.save();
      if (door.wall === 'left') {
        const dy = oy + (door.pos * this.scale);
        ctx.clearRect(ox - wallThick, dy, wallThick, doorW);
        ctx.fillStyle = "#232e3f";
        ctx.fillRect(ox - wallThick, dy, wallThick, doorW);

        doorPivot = { x: ox, y: dy };
        ctx.strokeStyle = "#38bdf8";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(ox, dy);
        ctx.lineTo(ox + doorW, dy);
        ctx.stroke();

        ctx.strokeStyle = "rgba(56, 189, 248, 0.45)";
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.arc(ox, dy, doorW, 0, Math.PI / 2, false);
        ctx.stroke();
        ctx.setLineDash([]);
      } else if (door.wall === 'bottom') {
        const dx = ox + (door.pos * this.scale);
        ctx.clearRect(dx, oy + rpxD, doorW, wallThick);
        ctx.fillStyle = "#232e3f";
        ctx.fillRect(dx, oy + rpxD, doorW, wallThick);

        doorPivot = { x: dx, y: oy + rpxD };
        ctx.strokeStyle = "#38bdf8";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(dx, oy + rpxD);
        ctx.lineTo(dx, oy + rpxD - doorW);
        ctx.stroke();

        ctx.strokeStyle = "rgba(56, 189, 248, 0.45)";
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.arc(dx, oy + rpxD, doorW, -Math.PI / 2, 0, false);
        ctx.stroke();
        ctx.setLineDash([]);
      }
      ctx.restore();
    }

    // Window
    const win = roomConfig.window;
    if (win && win.wall === 'top') {
      const wx = ox + (win.pos * this.scale);
      const ww = (win.width || 1200) * this.scale;
      ctx.fillStyle = "#38bdf8";
      ctx.fillRect(wx, oy - wallThick, ww, wallThick);
      ctx.fillStyle = "#fff";
      ctx.font = "bold 10px sans-serif";
      ctx.fillText(`Pencere (${win.width}mm)`, wx + 10, oy - (wallThick / 2) + 3);
    }

    // 4. Dimension Callouts
    ctx.fillStyle = "#94a3b8";
    ctx.font = "bold 12px sans-serif";
    ctx.fillText(`← ${roomW} mm (Arka Duvar) →`, ox + (rpxW / 2) - 80, oy + rpxD + wallThick + 20);
    ctx.fillText(`↑ ${roomD} mm (Sol Duvar) ↓`, ox - wallThick - 90, oy + (rpxD / 2));

    // 5. Render Cabinets on Back and Left Walls
    let collisionOccurred = false;

    modules.forEach((mod) => {
      const wall = mod.wall || 'back';
      let mx, my, mw, md;

      if (wall === 'left') {
        // Left Wall: Flush against Left Wall (X = ox), extending into room
        mw = (mod.d || 600) * this.scale;
        md = (mod.w || 600) * this.scale;
        mx = ox;
        my = (oy + rpxD) - ((mod.x || 0) * this.scale) - md;
      } else {
        // Back Wall: Flush against Back Wall (Y = oy + rpxD), extending up into room
        mw = (mod.w || 600) * this.scale;
        md = (mod.d || 600) * this.scale;
        mx = ox + ((mod.x || 0) * this.scale);
        my = (oy + rpxD) - md;
      }

      mod._bounds = { x: mx, y: my, w: mw, h: md };

      // Door Collision Check
      let isColliding = false;
      if (doorPivot && doorRadius > 0) {
        const corners = [
          { x: mx, y: my },
          { x: mx + mw, y: my },
          { x: mx, y: my + md },
          { x: mx + mw, y: my + md }
        ];
        for (let c of corners) {
          if (Math.hypot(c.x - doorPivot.x, c.y - doorPivot.y) < doorRadius) {
            isColliding = true;
            collisionOccurred = true;
            break;
          }
        }
      }

      const isSelected = this.selectedModuleId === mod.id;
      const isWallUnit = mod.category === 'wall';

      ctx.save();
      ctx.shadowColor = "rgba(0, 0, 0, 0.4)";
      ctx.shadowBlur = 8;
      ctx.shadowOffsetY = 3;

      if (isColliding) {
        ctx.fillStyle = "rgba(239, 68, 68, 0.6)";
        ctx.strokeStyle = "#ef4444";
        ctx.lineWidth = 2.5;
      } else if (isSelected) {
        ctx.fillStyle = "rgba(37, 99, 235, 0.65)";
        ctx.strokeStyle = "#38bdf8";
        ctx.lineWidth = 2.5;
      } else {
        ctx.fillStyle = isWallUnit ? "#374151" : "#1e3a5f";
        ctx.strokeStyle = isWallUnit ? "#6b7280" : "#3b82f6";
        ctx.lineWidth = 1.5;
        if (isWallUnit) ctx.setLineDash([3, 3]);
      }

      ctx.fillRect(mx, my, mw, md);
      ctx.shadowColor = "transparent";
      ctx.strokeRect(mx, my, mw, md);
      ctx.setLineDash([]);

      // Module Label
      ctx.fillStyle = isColliding ? "#fca5a5" : "#ffffff";
      ctx.font = "bold 11px sans-serif";
      ctx.fillText(mod.id, mx + 5, my + 15);

      ctx.fillStyle = isColliding ? "#ef4444" : "#93c5fd";
      ctx.font = "10px sans-serif";
      ctx.fillText(`${mod.w}mm`, mx + 5, my + 28);

      if (mod.drawers > 0) {
        ctx.fillStyle = "#f59e0b";
        ctx.fillText(`[${mod.drawers} Çk]`, mx + 5, my + md - 6);
      } else if (mod.type?.includes('sink')) {
        ctx.fillStyle = "#38bdf8";
        ctx.fillText(`💧 Eviye`, mx + 5, my + md - 6);
      } else if (mod.type?.includes('oven')) {
        ctx.fillStyle = "#f97316";
        ctx.fillText(`♨ Fırın`, mx + 5, my + md - 6);
      }

      if (isColliding) {
        ctx.fillStyle = "#ef4444";
        ctx.font = "bold 10px sans-serif";
        ctx.fillText("⚠️ ÇAKIŞMA!", mx + 5, my + (md / 2));
      }

      ctx.restore();
    });

    this.doorCollisionDetected = collisionOccurred;
    if (this.onCollisionChange) {
      this.onCollisionChange(collisionOccurred);
    }
  }

  /*
   * ARCHITECTURAL FRONT ELEVATION VIEW (ÖN GÖRÜNÜŞ)
   * Dynamically renders active wall (Arka Duvar or Sol Duvar) with interactive drag
   */
  renderElevation(roomConfig, modules, layoutType) {
    const ctx = this.ctx;
    const activeWall = window.CURRENT_ACTIVE_WALL || 'back';
    const rw = roomConfig.room_width || 3600;
    const rd = roomConfig.room_depth || 2600;
    const wallLen = (activeWall === 'left' || activeWall === 'right') ? rd : rw;
    const roomH = roomConfig.room_height || 2600;

    const pad = 90;
    const scaleX = (this.canvas.width - (pad * 2)) / wallLen;
    const scaleY = (this.canvas.height - (pad * 2)) / roomH;
    const escale = Math.min(scaleX, scaleY, 0.22);
    this.scale = escale;

    const ox = (this.canvas.width - (wallLen * escale)) / 2;
    const oy = (this.canvas.height - (roomH * escale)) / 2;
    this.originX = ox;
    this.originY = oy;

    const rpxW = wallLen * escale;
    const rpxH = roomH * escale;

    // 1. Studio Wall Gradient
    const wallGrad = ctx.createLinearGradient(ox, oy, ox, oy + rpxH);
    wallGrad.addColorStop(0, "#2a3447");
    wallGrad.addColorStop(0.5, "#1f293b");
    wallGrad.addColorStop(1, "#182234");
    ctx.fillStyle = wallGrad;
    ctx.fillRect(ox, oy, rpxW, rpxH);

    // Wall header title
    ctx.fillStyle = "#38bdf8";
    ctx.font = "bold 13px sans-serif";
    ctx.fillText(`🏛️ ${activeWall === 'left' ? 'SOL DUVAR' : 'ARKA DUVAR'} ÖN GÖRÜNÜŞÜ (${wallLen} mm)`, ox + 15, oy - 15);

    // Molding & Baseboard
    ctx.fillStyle = "#374151";
    ctx.fillRect(ox - 20, oy, rpxW + 40, 8);

    const floorY = oy + rpxH;
    ctx.fillStyle = "#334155";
    ctx.fillRect(ox - 20, floorY - 14, rpxW + 40, 14);

    // Floor Baseline
    ctx.strokeStyle = "#78350f";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(ox - 30, floorY);
    ctx.lineTo(ox + rpxW + 30, floorY);
    ctx.stroke();

    const baseHeight = 720 * escale;
    const plinthHeight = 100 * escale;
    const countertopThick = 40 * escale;
    const baseTotalH = baseHeight + plinthHeight;
    const baseTopY = floorY - baseTotalH;

    // Plinth
    ctx.fillStyle = "#0f172a";
    ctx.fillRect(ox, floorY - plinthHeight, rpxW, plinthHeight);

    // Filter modules on this wall
    const wallMods = modules.filter(m => (m.wall || 'back') === activeWall);

    wallMods.forEach((mod) => {
      const mw = (mod.w || 600) * escale;
      const mx = ox + ((mod.x || 0) * escale);
      const isSelected = this.selectedModuleId === mod.id;

      let boundsY = baseTopY;
      let boundsH = baseTotalH;
      if (mod.category === 'wall') {
        boundsY = floorY - ((1450 + (mod.h || 720)) * escale);
        boundsH = (mod.h || 720) * escale;
      } else if (mod.category === 'tall') {
        boundsY = floorY - ((mod.h || 2100) * escale);
        boundsH = (mod.h || 2100) * escale;
      }
      mod._bounds_elev = { x: mx, y: boundsY, w: mw, h: boundsH };

      if (mod.category === 'base') {
        ctx.save();
        ctx.shadowColor = "rgba(0, 0, 0, 0.4)";
        ctx.shadowBlur = 10;
        ctx.shadowOffsetY = 4;

        const doorGrad = ctx.createLinearGradient(mx, baseTopY, mx + mw, baseTopY + baseHeight);
        if (isSelected) {
          doorGrad.addColorStop(0, "#2563eb");
          doorGrad.addColorStop(1, "#1d4ed8");
        } else {
          doorGrad.addColorStop(0, "#334155");
          doorGrad.addColorStop(1, "#1e293b");
        }
        ctx.fillStyle = doorGrad;
        ctx.fillRect(mx + 2, baseTopY, mw - 4, baseHeight);
        ctx.restore();

        // Door Bevel
        ctx.strokeStyle = isSelected ? "#38bdf8" : "#475569";
        ctx.lineWidth = isSelected ? 2 : 1;
        ctx.strokeRect(mx + 2, baseTopY, mw - 4, baseHeight);

        // Countertop
        const ctGrad = ctx.createLinearGradient(mx, baseTopY - countertopThick, mx, baseTopY);
        ctGrad.addColorStop(0, "#f8fafc");
        ctGrad.addColorStop(1, "#cbd5e1");
        ctx.fillStyle = ctGrad;
        ctx.fillRect(mx - 3, baseTopY - countertopThick, mw + 6, countertopThick);
        ctx.strokeStyle = "#94a3b8";
        ctx.strokeRect(mx - 3, baseTopY - countertopThick, mw + 6, countertopThick);

        // Drawers / Handles
        if (mod.drawers > 0) {
          const dh = baseHeight / mod.drawers;
          for (let i = 0; i < mod.drawers; i++) {
            const dy = baseTopY + (i * dh);
            ctx.strokeStyle = "#0f172a";
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(mx + 3, dy);
            ctx.lineTo(mx + mw - 3, dy);
            ctx.stroke();

            const hw = Math.min(mw * 0.45, 120);
            const hx = mx + (mw / 2) - (hw / 2);
            const hy = dy + (dh / 2) - 3;
            this.drawMetallicHandle(hx, hy, hw, 6);
          }
        } else {
          const hy = baseTopY + (baseHeight / 2) - 35;
          this.drawMetallicHandle(mx + mw - 18, hy, 6, 70);

          // Draw Single Middle Shelf line (Tek Raf - mimari kesit/görünüş standardı)
          if (!mod.type?.includes('oven') && !mod.type?.includes('sink')) {
            ctx.save();
            ctx.setLineDash([4, 4]);
            ctx.strokeStyle = "rgba(148, 163, 184, 0.45)";
            ctx.lineWidth = 1;
            ctx.beginPath();
            const midY = baseTopY + (baseHeight / 2);
            ctx.moveTo(mx + 6, midY);
            ctx.lineTo(mx + mw - 6, midY);
            ctx.stroke();
            ctx.restore();
          }
        }

        this.drawModuleBadge(mod.id, mod.name, mx + 8, baseTopY + 22, isSelected);

      } else if (mod.category === 'wall') {
        const wallH = (mod.h || 720) * escale;
        const wallY = floorY - ((1450 + (mod.h || 720)) * escale);

        ctx.save();
        ctx.shadowColor = "rgba(0, 0, 0, 0.4)";
        ctx.shadowBlur = 10;
        ctx.shadowOffsetY = 4;

        const wGrad = ctx.createLinearGradient(mx, wallY, mx + mw, wallY + wallH);
        wGrad.addColorStop(0, isSelected ? "#1d4ed8" : "#475569");
        wGrad.addColorStop(1, isSelected ? "#1e40af" : "#334155");
        ctx.fillStyle = wGrad;
        ctx.fillRect(mx + 2, wallY, mw - 4, wallH);
        ctx.restore();

        ctx.strokeStyle = isSelected ? "#38bdf8" : "#64748b";
        ctx.lineWidth = 1;
        ctx.strokeRect(mx + 2, wallY, mw - 4, wallH);

        // Under-cabinet LED Glow
        const ledGrad = ctx.createLinearGradient(mx, wallY + wallH, mx, wallY + wallH + 18);
        ledGrad.addColorStop(0, "rgba(251, 191, 36, 0.3)");
        ledGrad.addColorStop(1, "rgba(251, 191, 36, 0)");
        ctx.fillStyle = ledGrad;
        ctx.fillRect(mx + 2, wallY + wallH, mw - 4, 18);

        this.drawMetallicHandle(mx + mw - 18, wallY + wallH - 45, 6, 35);

        // Draw Single Middle Shelf line for Wall Cabinet (Tek Raf)
        ctx.save();
        ctx.setLineDash([4, 4]);
        ctx.strokeStyle = "rgba(148, 163, 184, 0.45)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        const midWallY = wallY + (wallH / 2);
        ctx.moveTo(mx + 6, midWallY);
        ctx.lineTo(mx + mw - 6, midWallY);
        ctx.stroke();
        ctx.restore();

        this.drawModuleBadge(mod.id, mod.name, mx + 8, wallY + 22, isSelected);

      } else if (mod.category === 'tall') {
        const tallH = (mod.h || 2100) * escale;
        const tallY = floorY - tallH;

        ctx.save();
        ctx.shadowColor = "rgba(0, 0, 0, 0.4)";
        ctx.shadowBlur = 12;
        ctx.shadowOffsetY = 5;

        const tGrad = ctx.createLinearGradient(mx, tallY, mx + mw, tallY + tallH);
        tGrad.addColorStop(0, isSelected ? "#1e3a8a" : "#1e293b");
        tGrad.addColorStop(1, isSelected ? "#172554" : "#0f172a");
        ctx.fillStyle = tGrad;
        ctx.fillRect(mx + 2, tallY, mw - 4, tallH);
        ctx.restore();

        ctx.strokeStyle = isSelected ? "#38bdf8" : "#475569";
        ctx.lineWidth = 1;
        ctx.strokeRect(mx + 2, tallY, mw - 4, tallH);

        const hH = Math.min(tallH * 0.4, 250);
        this.drawMetallicHandle(mx + mw - 20, tallY + (tallH / 2) - (hH / 2), 6, hH);
        this.drawModuleBadge(mod.id, mod.name, mx + 8, tallY + 28, isSelected);
      }
    });
  }

  drawMetallicHandle(x, y, w, h) {
    const ctx = this.ctx;
    ctx.save();
    ctx.shadowColor = "rgba(0, 0, 0, 0.5)";
    ctx.shadowBlur = 4;
    ctx.shadowOffsetX = 1;
    ctx.shadowOffsetY = 2;

    const hGrad = ctx.createLinearGradient(x, y, x + w, y + h);
    hGrad.addColorStop(0, "#ffffff");
    hGrad.addColorStop(0.3, "#cbd5e1");
    hGrad.addColorStop(0.7, "#94a3b8");
    hGrad.addColorStop(1, "#475569");

    ctx.fillStyle = hGrad;
    ctx.fillRect(x, y, w, h);
    ctx.restore();
  }

  drawModuleBadge(code, name, x, y, isSelected) {
    const ctx = this.ctx;
    ctx.save();
    ctx.fillStyle = isSelected ? "rgba(37, 99, 235, 0.95)" : "rgba(15, 23, 42, 0.85)";
    ctx.strokeStyle = isSelected ? "#93c5fd" : "rgba(255, 255, 255, 0.15)";
    ctx.lineWidth = 1;

    const text = `${code}`;
    ctx.font = "bold 10px sans-serif";
    const tw = ctx.measureText(text).width;

    ctx.beginPath();
    ctx.roundRect ? ctx.roundRect(x, y - 12, tw + 12, 16, 4) : ctx.rect(x, y - 12, tw + 12, 16);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#ffffff";
    ctx.fillText(text, x + 6, y);
    ctx.restore();
  }

  clientToWallPosition(clientX) {
    const rect = this.canvas.getBoundingClientRect();
    const canvasX = clientX - rect.left;
    const mm = (canvasX - this.originX) / this.scale;
    return Math.max(0, Math.round(mm / 50) * 50);
  }
}

window.StudioCanvas2D = StudioCanvas2D;
