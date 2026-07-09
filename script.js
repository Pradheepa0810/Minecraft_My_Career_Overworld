(function () {
  const WORLD_SCALE = 5;
  const WORLD_MARGIN = 42;

  const state = {
    resume: null,
    path: [],
    pathSet: new Set(),
    stageNodeById: new Map(),
    pathIndexByCoordinate: new Map(),
    roadSet: new Set(),
    stagesById: new Map(),
    currentStep: 0,
    visitedStageIds: new Set(),
    modalOpen: false,
    focusReturnTarget: null,
    tileButtons: [],
    reducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    walkResetTimer: null,
    cameraTimer: null,
    entityTimer: null,
    dayNightTimer: null,
    isCameraAnimating: false,
    headerCollapsed: false,
    modalType: null,
    modalIndex: -1,
    worldSeed: 92873,
    worldBounds: { minX: -50, maxX: 50, minY: -50, maxY: 50 },
    landmarks: [],
    landmarkByKey: new Map(),
    easterEggs: [],
    easterByKey: new Map(),
    entities: [],
    audio: {
      initialized: false,
      context: null,
      master: null,
      ambience: [],
      muted: false,
      volume: 0.65
    }
  };

  const sectionBlueprints = [
    { id: "about", buildingName: "Spawn House", icon: "leadership", biome: "plains" },
    { id: "education", buildingName: "Library", icon: "architecture", biome: "birch-forest" },
    { id: "experience", buildingName: "Village Hall", icon: "code", biome: "village" },
    { id: "skills", buildingName: "Enchanting Room", icon: "systems", biome: "oak-forest" },
    { id: "projects", buildingName: "Redstone Workshop", icon: "model", biome: "laboratory" },
    { id: "certifications", buildingName: "Ancient Temple", icon: "safety", biome: "temple" },
    { id: "awards", buildingName: "Beacon Monument", icon: "gear", biome: "mountain" },
    { id: "contact", buildingName: "Next Opportunity", icon: "leadership", biome: "nether" }
  ];

  const keyToDirection = {
    ArrowUp: "up",
    ArrowDown: "down",
    ArrowLeft: "left",
    ArrowRight: "right",
    w: "up",
    a: "left",
    s: "down",
    d: "right",
    W: "up",
    A: "left",
    S: "down",
    D: "right"
  };

  const iconMatchers = [
    { test: /(ISO|safety|FMEA|Fault|FTA|ASPICE)/i, icon: "safety" },
    { test: /(SysML|MBSE|System Composer|architecture|requirements|traceability)/i, icon: "architecture" },
    { test: /(AUTOSAR|software|embedded|MISRA|ECU|communication)/i, icon: "code" },
    { test: /(MATLAB|Simulink|Stateflow|Simscape|model)/i, icon: "model" },
    { test: /(performance|trade-off|analysis|control)/i, icon: "systems" },
    { test: /(lead|mentor|leadership|review)/i, icon: "leadership" }
  ];

  const elements = {
    playerName: document.getElementById("playerName"),
    playerTitle: document.getElementById("playerTitle"),
    playerTagline: document.getElementById("playerTagline"),
    mapViewport: document.getElementById("mapViewport"),
    mapGrid: document.getElementById("mapGrid"),
    entityLayer: document.getElementById("entityLayer"),
    particleLayer: document.getElementById("particleLayer"),
    dayNightOverlay: document.querySelector(".day-night-overlay"),
    chunkFlash: document.getElementById("chunkFlash"),
    avatar: document.getElementById("avatar"),
    avatarSprite: document.getElementById("avatarSprite"),
    progressHud: document.getElementById("progressHud"),
    onboarding: document.getElementById("onboarding"),
    startJourney: document.getElementById("startJourney"),
    infoModal: document.getElementById("infoModal"),
    closeModal: document.getElementById("closeModal"),
    modalIcon: document.getElementById("modalIcon"),
    modalEyebrow: document.getElementById("modalEyebrow"),
    modalTitle: document.getElementById("modalTitle"),
    modalMeta: document.getElementById("modalMeta"),
    modalBody: document.getElementById("modalBody"),
    modalActions: document.getElementById("modalActions"),
    guidePopup: document.getElementById("guidePopup"),
    guideTarget: document.getElementById("guideTarget"),
    guideArrow: document.getElementById("guideArrow"),
    guideText: document.getElementById("guideText"),
    muteAudio: document.getElementById("muteAudio"),
    volumeSlider: document.getElementById("volumeSlider")
  };

  document.addEventListener("DOMContentLoaded", init);

  async function init() {
    wireEvents();

    try {
      const resume = await loadResumeData();
      state.resume = normalizeResume(resume);
      state.stagesById = new Map(state.resume.stages.map((stage) => [stage.id, stage]));

      const expandedPath = expandResumePath(state.resume.path);
      state.path = expandedPath;
      rebuildPathIndexes();
      computeWorldBounds();
      buildLandmarks();
      buildRoadNetwork();
      buildEasterEggs();
      initEntities();

      populateHero();
      renderVisibleWindow();
      updateProgressHud();
      updateAvatarLabel();
      updateGuide();
      startDayNightCycle();
      startEntityTicker();
      elements.mapViewport.focus();
    } catch (error) {
      renderLoadError(error);
    }
  }

  function wireEvents() {
    document.addEventListener("keydown", handleGlobalKeydown);

    document.querySelectorAll("[data-direction]").forEach((button) => {
      button.addEventListener("click", () => {
        dismissOnboarding();
        collapseHeader();
        ensureAudioStarted();
        attemptMoveByDirection(button.dataset.direction);
      });
    });

    elements.startJourney.addEventListener("click", () => {
      dismissOnboarding();
      ensureAudioStarted();
    });

    elements.avatar.addEventListener("click", () => {
      const node = state.path[state.currentStep];
      if (node && node.type === "stage") {
        openStageModal(node.stageId);
      } else if (node && node.type === "present") {
        openPresentModal();
      }
    });

    elements.closeModal.addEventListener("click", closeModal);
    elements.infoModal.addEventListener("click", (event) => {
      const target = event.target;
      if (target instanceof HTMLElement && target.dataset.close === "true") {
        closeModal();
      }
    });
    elements.infoModal.addEventListener("keydown", trapFocus);

    window.addEventListener("resize", () => {
      renderVisibleWindow();
      updateAdjacentTileStates();
    });

    window.addEventListener("scroll", () => {
      if (window.scrollY > 12) {
        collapseHeader();
      }
    }, { passive: true });

    elements.muteAudio.addEventListener("click", () => {
      state.audio.muted = !state.audio.muted;
      elements.muteAudio.classList.toggle("is-muted", state.audio.muted);
      elements.muteAudio.textContent = state.audio.muted ? "Unmute" : "Mute";
      applyAudioState();
    });

    elements.volumeSlider.addEventListener("input", () => {
      state.audio.volume = Number(elements.volumeSlider.value) / 100;
      applyAudioState();
    });
  }

  async function loadResumeData() {
    const loaders = [loadViaFetch, loadViaXmlHttpRequest, loadViaIframe];
    let lastError = null;

    for (const loader of loaders) {
      try {
        return await loader("resume.json");
      } catch (error) {
        lastError = error;
      }
    }

    throw lastError || new Error("Unable to load resume data.");
  }

  async function loadViaFetch(url) {
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) {
      throw new Error("Fetch failed with status " + response.status);
    }
    return response.json();
  }

  function loadViaXmlHttpRequest(url) {
    return new Promise((resolve, reject) => {
      const request = new XMLHttpRequest();
      request.open("GET", url, true);
      request.overrideMimeType("application/json");
      request.onreadystatechange = function () {
        if (request.readyState !== 4) {
          return;
        }

        if ((request.status >= 200 && request.status < 300) || (request.status === 0 && request.responseText)) {
          try {
            resolve(JSON.parse(request.responseText));
          } catch (error) {
            reject(error);
          }
          return;
        }

        reject(new Error("XMLHttpRequest could not load resume.json"));
      };
      request.onerror = () => reject(new Error("XMLHttpRequest network error."));
      request.send();
    });
  }

  function loadViaIframe(url) {
    return new Promise((resolve, reject) => {
      const iframe = document.createElement("iframe");
      iframe.hidden = true;
      iframe.src = url;

      const cleanup = () => {
        if (iframe.parentNode) {
          iframe.parentNode.removeChild(iframe);
        }
      };

      iframe.onload = () => {
        try {
          const documentText = iframe.contentDocument && iframe.contentDocument.documentElement
            ? iframe.contentDocument.documentElement.textContent
            : "";

          if (!documentText || !documentText.trim()) {
            throw new Error("Iframe fallback returned empty content.");
          }

          resolve(JSON.parse(documentText));
        } catch (error) {
          reject(error);
        } finally {
          cleanup();
        }
      };

      iframe.onerror = () => {
        cleanup();
        reject(new Error("Iframe fallback could not open resume.json."));
      };

      document.body.appendChild(iframe);
    });
  }

  function normalizeResume(resume) {
    const normalized = { ...resume };
    normalized.path = Array.isArray(resume.path) ? resume.path : [];
    normalized.stages = Array.isArray(resume.stages) ? resume.stages : [];
    normalized.coreCompetencies = Array.isArray(resume.coreCompetencies) ? resume.coreCompetencies : [];
    normalized.certifications = Array.isArray(resume.certifications) ? resume.certifications : [];
    normalized.education = Array.isArray(resume.education) ? resume.education : [];
    normalized.contact = resume.contact || {};
    normalized.present = resume.present || {};
    return normalized;
  }

  function expandResumePath(rawPath) {
    const expanded = [];
    const pushNode = (node) => {
      expanded.push({
        x: node.x,
        y: node.y,
        type: node.type,
        stageId: node.stageId,
        icon: node.icon
      });
    };

    if (!rawPath.length) {
      return expanded;
    }

    const scaled = rawPath.map((node) => ({
      ...node,
      x: node.x * WORLD_SCALE,
      y: node.y * WORLD_SCALE
    }));

    for (let i = 0; i < scaled.length - 1; i += 1) {
      const current = scaled[i];
      const next = scaled[i + 1];

      if (i === 0) {
        pushNode(current);
      }

      let cx = current.x;
      let cy = current.y;
      const dx = Math.sign(next.x - current.x);
      const dy = Math.sign(next.y - current.y);

      while (cx !== next.x || cy !== next.y) {
        if (cx !== next.x) {
          cx += dx;
        } else if (cy !== next.y) {
          cy += dy;
        }

        const isEnd = cx === next.x && cy === next.y;
        if (isEnd) {
          pushNode(next);
        } else {
          expanded.push({ x: cx, y: cy, type: "walk" });
        }
      }
    }

    return expanded;
  }

  function rebuildPathIndexes() {
    state.pathSet = new Set();
    state.pathIndexByCoordinate = new Map();
    state.stageNodeById = new Map();

    state.path.forEach((node, index) => {
      const key = `${node.x},${node.y}`;
      state.pathSet.add(key);
      state.pathIndexByCoordinate.set(key, { index, node });
      if (node.type === "stage" && node.stageId) {
        state.stageNodeById.set(node.stageId, { x: node.x, y: node.y, index });
      }
    });
  }

  function computeWorldBounds() {
    const xs = state.path.map((node) => node.x);
    const ys = state.path.map((node) => node.y);

    const minX = Math.min.apply(null, xs) - WORLD_MARGIN;
    const maxX = Math.max.apply(null, xs) + WORLD_MARGIN;
    const minY = Math.min.apply(null, ys) - WORLD_MARGIN;
    const maxY = Math.max.apply(null, ys) + WORLD_MARGIN;

    state.worldBounds = { minX, maxX, minY, maxY };
  }

  function buildLandmarks() {
    const offsets = [
      { x: -8, y: -6 },
      { x: 9, y: -5 },
      { x: -9, y: 5 },
      { x: 8, y: 6 },
      { x: -7, y: 7 },
      { x: 10, y: -3 },
      { x: -10, y: 2 },
      { x: 7, y: -8 }
    ];

    state.landmarks = [];
    state.landmarkByKey = new Map();

    sectionBlueprints.forEach((section, idx) => {
      const sample = getPathSamplePoint(idx, sectionBlueprints.length);
      const offset = offsets[idx % offsets.length];
      const preferred = {
        x: sample.x + offset.x,
        y: sample.y + offset.y
      };
      const size = idx % 2 === 0 ? 5 : 3;
      const half = Math.floor(size / 2);
      const anchor = findNearbyPlacement(preferred.x, preferred.y, half + 10, (x, y) => canPlaceStructure(x, y, size));
      const landmark = {
        ...section,
        x: clamp(anchor.x, state.worldBounds.minX + 5, state.worldBounds.maxX - 5),
        y: clamp(anchor.y, state.worldBounds.minY + 5, state.worldBounds.maxY - 5),
        size,
        intro: `${section.buildingName}: discover ${titleCase(section.id)}.`
      };

      state.landmarks.push(landmark);

      for (let oy = -half; oy <= half; oy += 1) {
        for (let ox = -half; ox <= half; ox += 1) {
          const lx = landmark.x + ox;
          const ly = landmark.y + oy;
          const key = `${lx},${ly}`;
          state.landmarkByKey.set(key, {
            landmark,
            ox,
            oy,
            edge: Math.abs(ox) === half || Math.abs(oy) === half,
            center: ox === 0 && oy === 0
          });
        }
      }
    });
  }

  function buildRoadNetwork() {
    state.roadSet = new Set();

    const points = state.landmarks.map((landmark) => ({ x: landmark.x, y: landmark.y }));
    const start = state.path.find((node) => node.type === "start") || state.path[0];
    const present = state.path.find((node) => node.type === "present") || state.path[state.path.length - 1];
    points.unshift({ x: start.x, y: start.y });
    points.push({ x: present.x, y: present.y });

    for (let i = 0; i < points.length - 1; i += 1) {
      carveRoad(points[i], points[i + 1]);
    }

    state.path.forEach((node) => state.roadSet.add(`${node.x},${node.y}`));
  }

  function carveRoad(a, b) {
    let x = a.x;
    let y = a.y;
    state.roadSet.add(`${x},${y}`);

    while (x !== b.x || y !== b.y) {
      if (x !== b.x) {
        x += Math.sign(b.x - x);
      }
      if (y !== b.y && hash2d(x, y, 703) > 0.45) {
        y += Math.sign(b.y - y);
      } else if (y !== b.y && x === b.x) {
        y += Math.sign(b.y - y);
      }

      state.roadSet.add(`${x},${y}`);
      state.roadSet.add(`${x + 1},${y}`);
      state.roadSet.add(`${x - 1},${y}`);
    }
  }

  function buildEasterEggs() {
    const facts = [
      { name: "Diamond Ore", fact: "I enjoy solving system architecture trade-offs under tight constraints." },
      { name: "Emerald Ore", fact: "Mentoring engineers is one of my favorite parts of leadership." },
      { name: "Chest", fact: "My career combines MBSE structure with practical embedded software delivery." },
      { name: "Music Disc", fact: "I love converting complex requirements into clean, testable flows." },
      { name: "Golden Apple", fact: "Functional safety and reliability are always at the center of my decisions." },
      { name: "Secret Cave", fact: "I thrive on cross-functional collaboration between systems and algorithm teams." }
    ];

    state.easterEggs = [];
    state.easterByKey = new Map();

    facts.forEach((item, index) => {
      const sample = getPathSamplePoint(index, facts.length);
      const dx = Math.round((hash2d(index * 5, index * 7, 43) - 0.5) * 10);
      const dy = Math.round((hash2d(index * 11, index * 13, 67) - 0.5) * 10);
      const preferredX = sample.x + (dx === 0 ? 4 : dx);
      const preferredY = sample.y + (dy === 0 ? -4 : dy);
      const found = findNearbyPlacement(preferredX, preferredY, 8, (x, y) => {
        const key = `${x},${y}`;
        return !state.pathSet.has(key) && !state.landmarkByKey.has(key) && !state.easterByKey.has(key);
      });
      const x = clamp(found.x, state.worldBounds.minX + 2, state.worldBounds.maxX - 2);
      const y = clamp(found.y, state.worldBounds.minY + 2, state.worldBounds.maxY - 2);
      const egg = { ...item, x, y, icon: "gear" };
      state.easterEggs.push(egg);
      state.easterByKey.set(`${x},${y}`, egg);
    });
  }

  function getPathSamplePoint(index, total) {
    const maxIndex = Math.max(0, state.path.length - 1);
    const ratio = (index + 1) / (total + 1);
    const sampledIndex = clamp(Math.round(maxIndex * ratio), 0, maxIndex);
    return state.path[sampledIndex] || state.path[0];
  }

  function canPlaceStructure(centerX, centerY, size) {
    const half = Math.floor(size / 2);
    for (let oy = -half; oy <= half; oy += 1) {
      for (let ox = -half; ox <= half; ox += 1) {
        const x = centerX + ox;
        const y = centerY + oy;
        if (x < state.worldBounds.minX + 2 || x > state.worldBounds.maxX - 2 || y < state.worldBounds.minY + 2 || y > state.worldBounds.maxY - 2) {
          return false;
        }

        const key = `${x},${y}`;
        if (state.pathSet.has(key) || state.landmarkByKey.has(key)) {
          return false;
        }
      }
    }

    return true;
  }

  function findNearbyPlacement(startX, startY, maxRadius, predicate) {
    const clampedStartX = clamp(startX, state.worldBounds.minX + 2, state.worldBounds.maxX - 2);
    const clampedStartY = clamp(startY, state.worldBounds.minY + 2, state.worldBounds.maxY - 2);

    for (let radius = 0; radius <= maxRadius; radius += 1) {
      for (let oy = -radius; oy <= radius; oy += 1) {
        for (let ox = -radius; ox <= radius; ox += 1) {
          if (Math.max(Math.abs(ox), Math.abs(oy)) !== radius) {
            continue;
          }

          const x = clamp(clampedStartX + ox, state.worldBounds.minX + 2, state.worldBounds.maxX - 2);
          const y = clamp(clampedStartY + oy, state.worldBounds.minY + 2, state.worldBounds.maxY - 2);

          if (predicate(x, y)) {
            return { x, y };
          }
        }
      }
    }

    return { x: clampedStartX, y: clampedStartY };
  }

  function initEntities() {
    const passiveKinds = ["sheep", "cow", "pig", "chicken", "rabbit", "bee"];

    for (let i = 0; i < 18; i += 1) {
      const spawn = findEntitySpawn(i + 19);
      state.entities.push({
        id: `passive-${i}`,
        type: passiveKinds[i % passiveKinds.length],
        x: spawn.x,
        y: spawn.y,
        homeX: spawn.x,
        homeY: spawn.y,
        dir: ["up", "down", "left", "right"][i % 4],
        pause: 0,
        graze: 0
      });
    }

    const creeperSpawn = findEntitySpawn(901);
    state.entities.push({
      id: "creeper-1",
      type: "creeper",
      x: creeperSpawn.x,
      y: creeperSpawn.y,
      homeX: creeperSpawn.x,
      homeY: creeperSpawn.y,
      dir: "down",
      pause: 0,
      chase: false
    });

    state.landmarks.forEach((landmark, index) => {
      const villagerRole = landmark.id === "education"
        ? "Librarian"
        : landmark.id === "projects"
          ? "Engineer"
          : landmark.id === "certifications"
            ? "Priest"
            : "Villager";

      state.entities.push({
        id: `villager-${landmark.id}`,
        type: "villager",
        x: landmark.x + (index % 2 === 0 ? 2 : -2),
        y: landmark.y + 2,
        homeX: landmark.x,
        homeY: landmark.y,
        dir: "down",
        pause: 0,
        role: villagerRole
      });
    });
  }

  function findEntitySpawn(seed) {
    for (let attempt = 0; attempt < 200; attempt += 1) {
      const x = Math.round(lerp(state.worldBounds.minX + 2, state.worldBounds.maxX - 2, hash2d(seed, attempt, 99)));
      const y = Math.round(lerp(state.worldBounds.minY + 2, state.worldBounds.maxY - 2, hash2d(seed + 27, attempt, 101)));
      if (isMobWalkable(x, y)) {
        return { x, y };
      }
    }

    return { x: state.path[0].x, y: state.path[0].y };
  }

  function isMobWalkable(x, y) {
    if (x < state.worldBounds.minX || x > state.worldBounds.maxX || y < state.worldBounds.minY || y > state.worldBounds.maxY) {
      return false;
    }

    const key = `${x},${y}`;
    if (state.landmarkByKey.has(key)) {
      return false;
    }

    const terrain = getTerrainInfo(x, y);
    return terrain.biome !== "river" && terrain.biome !== "nether-lava";
  }

  function populateHero() {
    elements.playerName.textContent = state.resume.name || "Unknown Player";
    elements.playerTitle.textContent = state.resume.title || "";
    elements.playerTagline.textContent = state.resume.tagline || "";
  }

  function getCameraCells() {
    const value = getComputedStyle(document.documentElement).getPropertyValue("--camera-cells").trim();
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 13;
  }

  function getTileSize() {
    const value = getComputedStyle(document.documentElement).getPropertyValue("--tile-size").trim();
    return Number.parseFloat(value) || 52;
  }

  function renderVisibleWindow() {
    const currentNode = state.path[state.currentStep];
    if (!currentNode) {
      return;
    }

    const cells = getCameraCells();
    const radius = Math.floor(cells / 2);

    elements.mapGrid.style.gridTemplateColumns = `repeat(${cells}, var(--tile-size))`;
    elements.mapGrid.style.gridTemplateRows = `repeat(${cells}, var(--tile-size))`;
    elements.mapGrid.innerHTML = "";
    elements.mapGrid.style.transform = "translate(-50%, -50%)";
    elements.entityLayer.innerHTML = "";
    state.tileButtons = [];

    for (let row = 0; row < cells; row += 1) {
      for (let column = 0; column < cells; column += 1) {
        const worldX = currentNode.x + (column - radius);
        const worldY = currentNode.y + (row - radius);
        const key = `${worldX},${worldY}`;
        const pathLookup = state.pathIndexByCoordinate.get(key);
        const landmarkTile = state.landmarkByKey.get(key);
        const easter = state.easterByKey.get(key);

        let tile = document.createElement("div");
        if (pathLookup || landmarkTile || easter) {
          tile = document.createElement("button");
          tile.type = "button";
        }

        tile.className = "tile";
        const terrain = getTerrainInfo(worldX, worldY);
        tile.style.setProperty("--elev", String(terrain.elevation));

        const surface = document.createElement("div");
        surface.className = "tile-surface";
        tile.appendChild(surface);

        if (pathLookup) {
          setupPathTile(tile, pathLookup);
        } else if (landmarkTile) {
          setupLandmarkTile(tile, landmarkTile);
        } else if (easter) {
          setupEasterTile(tile, easter);
        } else {
          setupTerrainTile(tile, terrain);
        }

        const distanceFromCenter = Math.max(Math.abs(column - radius), Math.abs(row - radius));
        if (distanceFromCenter >= radius - 1) {
          const fog = document.createElement("div");
          fog.className = "tile-fog";
          tile.appendChild(fog);
        }

        tile.style.gridColumn = String(column + 1);
        tile.style.gridRow = String(row + 1);
        elements.mapGrid.appendChild(tile);
      }
    }

    renderEntities();
    updateAdjacentTileStates();
  }

  function setupPathTile(tile, lookup) {
    tile.classList.add("walkable", "tile-path");
    tile.dataset.index = String(lookup.index);
    tile.dataset.tileType = lookup.node.type;
    tile.ariaLabel = getTileLabel(lookup.index, lookup.node);

    tile.addEventListener("click", () => {
      dismissOnboarding();
      collapseHeader();
      ensureAudioStarted();
      const destinationIndex = Number(tile.dataset.index);
      if (Math.abs(destinationIndex - state.currentStep) === 1) {
        moveToStep(destinationIndex);
      } else if (destinationIndex === state.currentStep) {
        if (lookup.node.type === "stage") {
          openStageModal(lookup.node.stageId);
        } else if (lookup.node.type === "present") {
          openPresentModal();
        }
      }
    });

    if (lookup.node.type === "stage") {
      tile.classList.add("tile-stage");
      const stage = state.stagesById.get(lookup.node.stageId);
      const beam = document.createElement("div");
      beam.className = "stage-beam";
      tile.appendChild(beam);

      const badge = document.createElement("img");
      badge.className = "stage-badge";
      badge.alt = "";
      badge.src = `assets/icons/${lookup.node.icon || "gear"}.svg`;
      tile.appendChild(badge);

      if (stage) {
        const label = document.createElement("div");
        label.className = "stage-label";
        label.textContent = stage.company;
        tile.appendChild(label);
      }

      if (state.visitedStageIds.has(lookup.node.stageId)) {
        const marker = document.createElement("div");
        marker.className = "tile-marker";
        const image = document.createElement("img");
        image.alt = "";
        image.src = "assets/decor/torch.svg";
        marker.appendChild(image);
        tile.appendChild(marker);
      }
    }

    state.tileButtons.push(tile);
  }

  function setupLandmarkTile(tile, landmarkTile) {
    const landmark = landmarkTile.landmark;
    tile.classList.add("tile-building", "tile-landmark", `tile-landmark-${landmark.id}`);
    tile.ariaLabel = `${landmark.buildingName} landmark`;
    const isEndPortal = landmark.id === "contact";

    if (isEndPortal) {
      tile.classList.add("building-portal");
      if (landmarkTile.center) {
        tile.classList.add("portal-core");
      } else {
        tile.classList.add("portal-frame");
      }
    } else {
      if (landmarkTile.oy < -1) {
        tile.classList.add("building-roof");
      } else {
        tile.classList.add("building-wall");
      }

      if (landmarkTile.center) {
        tile.classList.add("building-door");
      } else if (!landmarkTile.edge && Math.abs(landmarkTile.ox) === 1) {
        tile.classList.add("building-window");
      }
    }

    if (landmarkTile.center) {
      const beacon = document.createElement("div");
      beacon.className = isEndPortal ? "landmark-beacon portal-beacon" : "landmark-beacon";
      tile.appendChild(beacon);

      const sign = document.createElement("div");
      sign.className = "landmark-sign";
      sign.textContent = landmark.buildingName;
      tile.appendChild(sign);
    }

    tile.addEventListener("click", () => {
      dismissOnboarding();
      collapseHeader();
      ensureAudioStarted();
      mineAndOpenLandmark(tile, landmark);
    });
  }

  function setupEasterTile(tile, easter) {
    tile.classList.add("tile-stone-b", "tile-easter");
    tile.ariaLabel = `${easter.name} easter egg`;

    const badge = document.createElement("div");
    badge.className = "easter-badge";
    badge.textContent = "*";
    tile.appendChild(badge);

    tile.addEventListener("click", () => {
      dismissOnboarding();
      collapseHeader();
      ensureAudioStarted();
      openEasterModal(easter);
    });
  }

  function setupTerrainTile(tile, terrain) {
    tile.setAttribute("aria-hidden", "true");
    tile.classList.add(terrain.tileClass);

    const key = `${terrain.x},${terrain.y}`;
    if (state.roadSet.has(key)) {
      tile.classList.add("tile-path", "road-tile");
    }

    const decor = chooseDecor(terrain);
    if (decor) {
      tile.appendChild(createDecorNode(decor));
    }
  }

  function mineAndOpenLandmark(tile, landmark) {
    if (state.modalOpen) {
      return;
    }

    tile.classList.add("breaking");
    triggerChunkFlash();
    playUiTone(260, 0.05, 0.09);

    window.setTimeout(() => {
      tile.classList.remove("breaking");
      openLandmarkModal(landmark.id, landmark);
    }, state.reducedMotion ? 20 : 280);
  }

  function openLandmarkModal(id, landmark) {
    const resume = state.resume;
    if (id === "contact") {
      openPresentModal();
      return;
    }

    let bodySections = [];
    let meta = "Landmark Region";

    if (id === "about") {
      bodySections = [
        createParagraphSection("Profile", `${resume.title}. ${resume.tagline}.`),
        createFactsSection("Core Focus", resume.coreCompetencies.slice(0, 10))
      ];
      meta = "Spawn Plains";
    } else if (id === "education") {
      bodySections = [createFactsSection("Education", resume.education || [])];
      meta = "Library District";
    } else if (id === "experience") {
      bodySections = [createExperienceSection(resume.stages || [])];
      meta = "Village Region";
    } else if (id === "skills") {
      bodySections = [createSkillsSection(resume.coreCompetencies || [])];
      meta = "Enchanting Region";
    } else if (id === "projects") {
      const highlights = (resume.stages || []).flatMap((stage) => (stage.achievements || []).slice(0, 1));
      bodySections = [createListSection("Project Highlights", highlights)];
      meta = "Redstone Region";
    } else if (id === "certifications") {
      bodySections = [createFactsSection("Certifications", resume.certifications || [])];
      meta = "Temple Region";
    } else if (id === "awards") {
      bodySections = [createListSection("Recognition", [
        "Progression from Software Engineer to Senior Algorithm Engineer.",
        "Architecture and safety technical leadership in steer-by-wire programs.",
        "Mentored multidisciplinary engineers in MBD and AUTOSAR practices."
      ])];
      meta = "Beacon Region";
    }

    renderModal({
      icon: landmark.icon || "gear",
      eyebrow: landmark.buildingName,
      title: titleCase(id),
      meta,
      bodySections,
      actions: []
    });
  }

  function openEasterModal(easter) {
    renderModal({
      icon: "gear",
      eyebrow: "Easter Egg",
      title: easter.name,
      meta: "Hidden Discovery",
      bodySections: [createParagraphSection("Fun Fact", easter.fact)],
      actions: []
    });
  }

  function createExperienceSection(stages) {
    const section = document.createElement("section");
    section.className = "modal-section";
    const heading = document.createElement("h3");
    heading.textContent = "Experience Timeline";
    section.appendChild(heading);

    stages.forEach((stage) => {
      const line = document.createElement("p");
      line.textContent = `${stage.company}: ${stage.role} (${stage.startDate} - ${stage.endDate})`;
      section.appendChild(line);
    });

    return section;
  }

  function getTerrainInfo(x, y) {
    const riverWave = Math.abs(
      Math.sin((x + state.worldSeed) * 0.08) +
      0.45 * Math.sin((x + y) * 0.11) -
      0.55 * Math.cos((y - state.worldSeed) * 0.09)
    );

    const noise = fractalNoise(x * 0.05, y * 0.05, 4);
    const elevNoise = fractalNoise(x * 0.12, y * 0.12, 3);

    let biome = "plains";
    if (riverWave < 0.2) {
      biome = "river";
    } else if (noise < 0.12) {
      biome = "mountain";
    } else if (noise < 0.31) {
      biome = "plains";
    } else if (noise < 0.46) {
      biome = "flower-meadow";
    } else if (noise < 0.62) {
      biome = "oak-forest";
    } else if (noise < 0.74) {
      biome = "birch-forest";
    } else if (noise < 0.87) {
      biome = "village";
    } else {
      biome = "laboratory";
    }

    const nearbyLandmark = nearestLandmark(x, y, 10);
    if (nearbyLandmark) {
      biome = nearbyLandmark.biome;
    }

    let tileClass = "tile-plains-a";
    const variant = hash2d(x, y, 711);

    if (biome === "river") {
      tileClass = variant > 0.8 ? "tile-pond" : "tile-river";
    } else if (biome === "mountain") {
      tileClass = variant > 0.5 ? "tile-stone-a" : "tile-stone-b";
    } else if (biome === "flower-meadow") {
      tileClass = "tile-flowerfield";
    } else if (biome === "oak-forest") {
      tileClass = variant > 0.5 ? "tile-forestfloor" : "tile-podzol";
    } else if (biome === "birch-forest") {
      tileClass = variant > 0.5 ? "tile-birchfloor" : "tile-podzol";
    } else if (biome === "village") {
      tileClass = variant > 0.5 ? "tile-coarse-dirt" : "tile-dirt-b";
    } else if (biome === "laboratory") {
      tileClass = variant > 0.6 ? "tile-gravel" : "tile-stone-b";
    } else if (biome === "temple") {
      tileClass = "tile-sand";
    } else if (biome === "mountain") {
      tileClass = "tile-stone-a";
    } else if (biome === "nether") {
      tileClass = "tile-nether";
    } else {
      tileClass = variant > 0.5 ? "tile-plains-a" : "tile-plains-b";
    }

    const elevationBoost = biome === "mountain" ? 1.3 : biome === "village" ? 0.2 : 0;
    const elevation = clamp(Math.floor(elevNoise * 4 + elevationBoost), 0, 4);

    return { x, y, biome, tileClass, elevation };
  }

  function nearestLandmark(x, y, radius) {
    let best = null;
    let bestDist = Number.POSITIVE_INFINITY;

    state.landmarks.forEach((landmark) => {
      const dx = x - landmark.x;
      const dy = y - landmark.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < radius && dist < bestDist) {
        bestDist = dist;
        best = landmark;
      }
    });

    return best;
  }

  function chooseDecor(terrain) {
    const roll = hash2d(terrain.x, terrain.y, 59);
    const roll2 = hash2d(terrain.x, terrain.y, 83);

    if (terrain.biome === "oak-forest") {
      if (roll > 0.55) {
        return "tree-oak";
      }
      if (roll > 0.48) {
        return "bush";
      }
      if (roll > 0.42) {
        return "mushroom";
      }
    }

    if (terrain.biome === "birch-forest") {
      if (roll > 0.58) {
        return "tree-birch";
      }
      if (roll > 0.46) {
        return "tallgrass";
      }
      if (roll > 0.43) {
        return "bee-nest";
      }
    }

    if (terrain.biome === "flower-meadow") {
      if (roll > 0.48) {
        return "flower";
      }
      if (roll > 0.4) {
        return "tallgrass";
      }
      if (roll > 0.37) {
        return "pumpkin";
      }
    }

    if (terrain.biome === "village") {
      if (roll > 0.82) {
        return "farm";
      }
      if (roll > 0.74) {
        return "wheat";
      }
      if (roll > 0.66) {
        return "fence";
      }
      if (roll > 0.58) {
        return "lantern";
      }
      if (roll > 0.54) {
        return "hay";
      }
    }

    if (terrain.biome === "mountain") {
      if (roll > 0.72) {
        return "rock";
      }
      if (roll > 0.62) {
        return "pebble";
      }
      if (roll > 0.56) {
        return "log";
      }
    }

    if (terrain.biome === "river") {
      if (roll > 0.73) {
        return "lily";
      }
      if (roll > 0.64) {
        return "reed";
      }
      if (roll > 0.57 && roll2 > 0.45) {
        return "bridge";
      }
      if (roll > 0.52) {
        return "pond";
      }
    }

    if (terrain.biome === "plains") {
      if (roll > 0.75) {
        return "tallgrass";
      }
      if (roll > 0.68) {
        return "flower";
      }
      if (roll > 0.63) {
        return "bush";
      }
      if (roll > 0.59) {
        return "campfire";
      }
    }

    if (terrain.biome === "laboratory") {
      if (roll > 0.7) {
        return "cobble";
      }
      if (roll > 0.62) {
        return "torch";
      }
      if (roll > 0.56) {
        return "redstone";
      }
    }

    if (terrain.biome === "temple") {
      if (roll > 0.68) {
        return "torch";
      }
      if (roll > 0.58) {
        return "rock";
      }
    }

    if (terrain.biome === "nether") {
      if (roll > 0.66) {
        return "torch";
      }
      if (roll > 0.58) {
        return "mushroom";
      }
      if (roll > 0.53) {
        return "cobble";
      }
    }

    return null;
  }

  function createDecorNode(type) {
    const node = document.createElement("div");
    node.className = `decor decor-${type}`;

    if (type === "tree-oak" || type === "tree-birch") {
      node.classList.add("decor-tree");
      const tone = type === "tree-oak" ? "oak" : "birch";
      ["leaf-a", "leaf-b", "leaf-c"].forEach((cls) => {
        const leaf = document.createElement("div");
        leaf.className = `leaf-block ${cls} ${tone}`;
        node.appendChild(leaf);
      });
      const trunk = document.createElement("div");
      trunk.className = `trunk ${tone}`;
      node.appendChild(trunk);
    }

    return node;
  }

  function renderEntities() {
    const currentNode = state.path[state.currentStep];
    const cells = getCameraCells();
    const radius = Math.floor(cells / 2);
    const tileSize = getTileSize();

    elements.entityLayer.innerHTML = "";

    state.entities.forEach((entity) => {
      const dx = entity.x - currentNode.x;
      const dy = entity.y - currentNode.y;
      if (Math.abs(dx) > radius + 1 || Math.abs(dy) > radius + 1) {
        return;
      }

      const px = (dx + radius + 0.5) * tileSize;
      const py = (dy + radius + 0.5) * tileSize;

      const wrapper = document.createElement("div");
      wrapper.className = `entity entity-${entity.type} dir-${entity.dir || "down"}`;
      wrapper.style.left = `${px}px`;
      wrapper.style.top = `${py}px`;

      const shadow = document.createElement("div");
      shadow.className = "entity-shadow";
      const body = document.createElement("div");
      body.className = "entity-body";
      const head = document.createElement("div");
      head.className = "entity-head";
      const legs = document.createElement("div");
      legs.className = "entity-legs";

      wrapper.appendChild(shadow);
      wrapper.appendChild(body);
      wrapper.appendChild(head);
      wrapper.appendChild(legs);

      elements.entityLayer.appendChild(wrapper);
    });
  }

  function startEntityTicker() {
    if (state.reducedMotion) {
      return;
    }

    state.entityTimer = window.setInterval(() => {
      const player = state.path[state.currentStep];

      state.entities.forEach((entity, index) => {
        if (entity.pause > 0) {
          entity.pause -= 1;
          return;
        }

        if (entity.type === "sheep" && hash2d(entity.x, entity.y, index + state.currentStep) > 0.85) {
          entity.graze = 2;
        }

        if (entity.graze && entity.graze > 0) {
          entity.graze -= 1;
          return;
        }

        let candidates = [
          { x: entity.x + 1, y: entity.y, dir: "right" },
          { x: entity.x - 1, y: entity.y, dir: "left" },
          { x: entity.x, y: entity.y + 1, dir: "down" },
          { x: entity.x, y: entity.y - 1, dir: "up" }
        ];

        if (entity.type === "creeper") {
          const dist = manhattan(entity.x, entity.y, player.x, player.y);
          entity.chase = dist <= 6;
          if (entity.chase) {
            candidates = sortToward(candidates, player.x, player.y);
          }
        }

        if (entity.type === "villager") {
          if (manhattan(entity.x, entity.y, entity.homeX, entity.homeY) > 4) {
            candidates = sortToward(candidates, entity.homeX, entity.homeY);
          }
        }

        const moved = candidates.find((step) => isMobWalkable(step.x, step.y));
        if (moved) {
          entity.x = moved.x;
          entity.y = moved.y;
          entity.dir = moved.dir;
        }

        if (hash2d(entity.x, entity.y, state.currentStep + index * 11) > 0.8) {
          entity.pause = 1;
        }
      });

      if (hash2d(player.x, player.y, state.currentStep + 2001) > 0.68) {
        emitAmbientParticles(player.x, player.y);
      }

      renderEntities();
    }, 900);
  }

  function startDayNightCycle() {
    let phase = 0;
    const sun = document.querySelector(".sun-block");

    state.dayNightTimer = window.setInterval(() => {
      phase += 0.0022;
      const daylight = (Math.sin(phase) + 1) * 0.5;
      const overlay = 0.36 * (1 - daylight) + 0.04;
      const topBlue = Math.round(66 + daylight * 62);
      const bottomBlue = Math.round(106 + daylight * 96);

      elements.dayNightOverlay.style.background = `rgba(12, 20, 44, ${overlay.toFixed(3)})`;
      document.body.style.background = `linear-gradient(180deg, rgb(126, ${topBlue}, 238), rgb(217, ${bottomBlue}, 255))`;

      if (sun) {
        const vertical = 16 + Math.sin(phase) * 9;
        sun.style.transform = `translateY(${vertical}px)`;
      }
    }, 120);
  }

  function moveToStep(nextStep) {
    const previousNode = state.path[state.currentStep];
    const nextNode = state.path[nextStep];

    if (!nextNode || state.modalOpen || state.isCameraAnimating) {
      return;
    }

    const direction = getDirection(previousNode, nextNode);
    setAvatarWalkSprite(direction);
    elements.avatar.classList.add("walking");
    state.isCameraAnimating = true;

    setAvatarStepOffset(direction, 0.18);

    emitMoveParticles(nextNode);
    playFootstepTone(nextNode);

    window.clearTimeout(state.cameraTimer);
    state.cameraTimer = window.setTimeout(() => {
      state.currentStep = nextStep;
      renderVisibleWindow();
      updateProgressHud();
      updateAvatarLabel();
      updateGuide();
      maybeOpenContextPanel(nextNode);
      window.requestAnimationFrame(() => {
        setAvatarStepOffset(direction, 0);
      });

      window.setTimeout(() => {
        state.isCameraAnimating = false;
        resetAvatarToIdle();
      }, state.reducedMotion ? 0 : 90);
    }, state.reducedMotion ? 0 : 110);
  }

  function setAvatarStepOffset(direction, distanceFactor) {
    if (state.reducedMotion) {
      elements.avatar.style.setProperty("--avatar-step-x", "0px");
      elements.avatar.style.setProperty("--avatar-step-y", "0px");
      return;
    }

    const distance = Math.round(getTileSize() * distanceFactor);
    let offsetX = 0;
    let offsetY = 0;

    if (direction === "left") {
      offsetX = -distance;
    } else if (direction === "right") {
      offsetX = distance;
    } else if (direction === "up") {
      offsetY = -distance;
    } else if (direction === "down") {
      offsetY = distance;
    }

    elements.avatar.style.setProperty("--avatar-step-x", `${offsetX}px`);
    elements.avatar.style.setProperty("--avatar-step-y", `${offsetY}px`);
  }

  function emitMoveParticles(node) {
    const terrain = getTerrainInfo(node.x, node.y);
    const cells = getCameraCells();
    const tileSize = getTileSize();
    const center = Math.floor(cells / 2) + 0.5;
    const baseX = center * tileSize;
    const baseY = center * tileSize + tileSize * 0.22;

    const className = terrain.biome === "river"
      ? "particle-water"
      : terrain.biome === "mountain"
        ? "particle-stone"
        : terrain.biome === "village" || terrain.biome === "laboratory"
          ? "particle-dust"
          : "particle-grass";

    for (let i = 0; i < 6; i += 1) {
      const p = document.createElement("div");
      p.className = `particle ${className}`;
      p.style.left = `${baseX + randomSigned(i * 3 + state.currentStep) * 14}px`;
      p.style.top = `${baseY + randomSigned(i * 7 + state.currentStep) * 8}px`;
      p.style.animationDelay = `${i * 22}ms`;
      elements.particleLayer.appendChild(p);
      window.setTimeout(() => p.remove(), 460);
    }
  }

  function emitAmbientParticles(playerX, playerY) {
    const cells = getCameraCells();
    const tileSize = getTileSize();
    const center = Math.floor(cells / 2) + 0.5;

    const kinds = ["particle-grass", "particle-dust", "particle-stone"];
    const p = document.createElement("div");
    p.className = `particle ${kinds[Math.floor(hash2d(playerX, playerY, 3901) * kinds.length)]}`;
    p.style.left = `${center * tileSize + randomSigned(playerX + 29) * tileSize * 2.2}px`;
    p.style.top = `${center * tileSize + randomSigned(playerY + 53) * tileSize * 1.5}px`;
    elements.particleLayer.appendChild(p);
    window.setTimeout(() => p.remove(), 460);
  }

  function maybeOpenContextPanel(node) {
    if (node.type === "stage") {
      state.visitedStageIds.add(node.stageId);
      triggerChunkFlash();
      renderVisibleWindow();
      openStageModal(node.stageId);
      return;
    }

    if (node.type === "present") {
      triggerChunkFlash();
      openPresentModal();
    }
  }

  function triggerChunkFlash() {
    elements.chunkFlash.classList.remove("active");
    void elements.chunkFlash.offsetWidth;
    elements.chunkFlash.classList.add("active");
    window.setTimeout(() => elements.chunkFlash.classList.remove("active"), 420);
  }

  function updateProgressHud() {
    const stageIndexes = state.path
      .map((node, index) => ({ node, index }))
      .filter((entry) => entry.node.type === "stage");
    const total = stageIndexes.length || 1;
    const currentOrdinal = Math.max(
      1,
      stageIndexes.filter((entry) => entry.index <= state.currentStep).length || 1
    );
    elements.progressHud.textContent = `Stage ${Math.min(currentOrdinal, total)} of ${total}`;
  }

  function updateGuide() {
    const hint = getGuideHint();
    if (!hint) {
      return;
    }

    elements.guideTarget.textContent = hint.target;
    elements.guideArrow.textContent = hint.arrow;
    elements.guideText.textContent = hint.text;
    elements.guidePopup.classList.toggle("is-finale", hint.isFinale);
  }

  function getGuideHint() {
    const currentNode = state.path[state.currentStep];
    if (!currentNode) {
      return null;
    }

    if (currentNode.type === "present") {
      return {
        target: "Next Opportunity Reached",
        arrow: "◎ Destination Complete",
        text: "Shepherd: you made it to the Next Opportunity. Click the portal or your avatar to reopen the finale.",
        isFinale: true
      };
    }

    const targetIndex = findNextObjectiveIndex(state.currentStep + 1);
    if (targetIndex < 0) {
      return {
        target: "Explore",
        arrow: "▶ Wander",
        text: "Shepherd: roam the overworld and revisit any role or hidden find you like.",
        isFinale: false
      };
    }

    const targetNode = state.path[targetIndex];
    const immediateNode = state.path[Math.min(state.currentStep + 1, state.path.length - 1)];
    const direction = immediateNode ? getDirection(currentNode, immediateNode) : "right";
    const stepsAway = Math.max(1, targetIndex - state.currentStep);
    const arrow = `${getDirectionArrow(direction)} ${titleCase(direction)}`;

    if (targetNode.type === "present") {
      return {
        target: "Next Opportunity",
        arrow,
        text: `Shepherd: follow the glowing path ${stepsAway} block${stepsAway === 1 ? "" : "s"} to reach the Next Opportunity finale.`,
        isFinale: true
      };
    }

    const stage = state.stagesById.get(targetNode.stageId);
    if (!stage) {
      return null;
    }

    return {
      target: stage.role,
      arrow,
      text: `Shepherd: head ${direction} and stay on the glowing path for ${stepsAway} block${stepsAway === 1 ? "" : "s"} to reach ${stage.company}.`,
      isFinale: false
    };
  }

  function findNextObjectiveIndex(startIndex) {
    for (let index = startIndex; index < state.path.length; index += 1) {
      const node = state.path[index];
      if (node.type === "stage" || node.type === "present") {
        return index;
      }
    }

    return -1;
  }

  function getDirectionArrow(direction) {
    if (direction === "left") {
      return "◀";
    }
    if (direction === "right") {
      return "▶";
    }
    if (direction === "up") {
      return "▲";
    }
    return "▼";
  }

  function updateAvatarLabel() {
    const node = state.path[state.currentStep];
    if (!node) {
      return;
    }
    elements.avatar.ariaLabel = getTileLabel(state.currentStep, node);
  }

  function updateAdjacentTileStates() {
    state.tileButtons.forEach((tile) => {
      if (!(tile instanceof HTMLButtonElement) || !tile.dataset.index) {
        return;
      }

      const index = Number(tile.dataset.index);
      const adjacent = Math.abs(index - state.currentStep) === 1;
      tile.classList.toggle("is-adjacent", adjacent);
      tile.disabled = !adjacent && index !== state.currentStep;
    });
  }

  function handleGlobalKeydown(event) {
    if (event.key === "Escape" && state.modalOpen) {
      closeModal();
      return;
    }

    if (elements.onboarding.classList.contains("hidden") === false && keyToDirection[event.key]) {
      dismissOnboarding();
    }

    if (state.modalOpen || state.isCameraAnimating) {
      return;
    }

    const direction = keyToDirection[event.key];
    if (!direction) {
      return;
    }

    event.preventDefault();
    collapseHeader();
    ensureAudioStarted();
    attemptMoveByDirection(direction);
  }

  function attemptMoveByDirection(direction) {
    const previousNode = state.path[state.currentStep - 1];
    const currentNode = state.path[state.currentStep];
    const nextNode = state.path[state.currentStep + 1];

    if (!currentNode) {
      return;
    }

    if (nextNode && getDirection(currentNode, nextNode) === direction) {
      moveToStep(state.currentStep + 1);
      return;
    }

    if (previousNode && getDirection(currentNode, previousNode) === direction) {
      moveToStep(state.currentStep - 1);
    }
  }

  function getDirection(fromNode, toNode) {
    if (!fromNode || !toNode) {
      return "down";
    }

    if (toNode.x > fromNode.x) {
      return "right";
    }
    if (toNode.x < fromNode.x) {
      return "left";
    }
    if (toNode.y > fromNode.y) {
      return "down";
    }
    return "up";
  }

  function setAvatarWalkSprite(direction) {
    elements.avatarSprite.src = `assets/avatar/walk-${direction}.svg`;
  }

  function resetAvatarToIdle() {
    window.clearTimeout(state.walkResetTimer);
    state.walkResetTimer = window.setTimeout(() => {
      elements.avatarSprite.src = "assets/avatar/idle.svg";
      elements.avatar.classList.remove("walking");
    }, state.reducedMotion ? 0 : 170);
  }

  function getTileLabel(index, node) {
    if (node.type === "stage") {
      const stage = state.stagesById.get(node.stageId);
      return stage ? `${stage.company}, ${stage.role}` : `Career stage ${index + 1}`;
    }
    if (node.type === "present") {
      return "Present day checkpoint";
    }
    if (node.type === "start") {
      return "Starting point";
    }
    return `Path step ${index + 1}`;
  }

  function openStageModal(stageId) {
    const stage = state.stagesById.get(stageId);
    if (!stage) {
      return;
    }

    state.modalType = "stage";
    state.modalIndex = state.path.findIndex((node) => node.stageId === stageId);

    const bodySections = [
      createListSection("Achievements", stage.achievements || []),
      createSkillsSection(stage.skills || [])
    ];

    renderModal({
      icon: stage.icon || "gear",
      eyebrow: stage.company,
      title: stage.role,
      meta: `${stage.startDate} - ${stage.endDate}`,
      bodySections,
      actions: []
    });
  }

  function openPresentModal() {
    const resume = state.resume;
    const actions = [
      createActionLink("Email", resume.contact.email ? `mailto:${resume.contact.email}` : ""),
      createActionLink("Call", resume.contact.phone ? `tel:${resume.contact.phone.replace(/\s+/g, "")}` : ""),
      createActionLink("LinkedIn", resume.contact.linkedin || ""),
      createActionLink("Resume PDF", resume.contact.resumePdf || "")
    ];

    const bodySections = [
      createParagraphSection(resume.present.headline || "You reached the present!", resume.present.message || "Currently shaping safety-critical systems and open to meaningful conversations."),
      createFactsSection("Core Competencies", resume.coreCompetencies || []),
      createFactsSection("Certifications", resume.certifications || []),
      createFactsSection("Education", resume.education || [])
    ];

    renderModal({
      icon: resume.present.icon || "leadership",
      eyebrow: "Present Day",
      title: resume.present.title || "You reached the present!",
      meta: resume.title || "",
      bodySections,
      actions
    });
  }

  function createListSection(title, items) {
    const section = document.createElement("section");
    section.className = "modal-section";
    const heading = document.createElement("h3");
    heading.textContent = title;
    section.appendChild(heading);

    const list = document.createElement("ul");
    items.forEach((item) => {
      const bullet = document.createElement("li");
      bullet.textContent = item;
      list.appendChild(bullet);
    });
    section.appendChild(list);
    return section;
  }

  function createSkillsSection(skills) {
    const section = document.createElement("section");
    section.className = "modal-section";
    const heading = document.createElement("h3");
    heading.textContent = "Skills";
    section.appendChild(heading);

    const container = document.createElement("div");
    container.className = "skills-grid";

    skills.forEach((skill) => {
      const badge = document.createElement("div");
      badge.className = "skill-chip";
      const image = document.createElement("img");
      image.alt = "";
      image.src = `assets/icons/${resolveIconForSkill(skill)}.svg`;
      const label = document.createElement("span");
      label.textContent = skill;
      badge.appendChild(image);
      badge.appendChild(label);
      container.appendChild(badge);
    });

    section.appendChild(container);
    return section;
  }

  function createFactsSection(title, items) {
    const section = document.createElement("section");
    section.className = "modal-section";
    const heading = document.createElement("h3");
    heading.textContent = title;
    section.appendChild(heading);

    const container = document.createElement("div");
    container.className = "facts-grid";

    items.forEach((item) => {
      const badge = document.createElement("div");
      badge.className = "fact-chip";
      const image = document.createElement("img");
      image.alt = "";
      image.src = `assets/icons/${resolveIconForSkill(item)}.svg`;
      const label = document.createElement("span");
      label.textContent = item;
      badge.appendChild(image);
      badge.appendChild(label);
      container.appendChild(badge);
    });

    section.appendChild(container);
    return section;
  }

  function createParagraphSection(title, text) {
    const section = document.createElement("section");
    section.className = "modal-section";
    const heading = document.createElement("h3");
    heading.textContent = title;
    section.appendChild(heading);
    const paragraph = document.createElement("p");
    paragraph.textContent = text;
    section.appendChild(paragraph);
    return section;
  }

  function createActionLink(label, href) {
    return { label, href };
  }

  function resolveIconForSkill(skill) {
    const match = iconMatchers.find((entry) => entry.test.test(skill));
    return match ? match.icon : "gear";
  }

  function renderModal(config) {
    state.modalOpen = true;
    state.focusReturnTarget = document.activeElement;
    elements.modalIcon.src = `assets/icons/${config.icon}.svg`;
    elements.modalEyebrow.textContent = config.eyebrow;
    elements.modalTitle.textContent = config.title;
    elements.modalMeta.textContent = config.meta;
    elements.modalBody.innerHTML = "";
    elements.modalActions.innerHTML = "";

    config.bodySections.forEach((section) => {
      elements.modalBody.appendChild(section);
    });

    config.actions.forEach((action) => {
      if (action.href) {
        const anchor = document.createElement("a");
        anchor.href = action.href;
        if (/^https?:/i.test(action.href)) {
          anchor.target = "_blank";
          anchor.rel = "noreferrer";
        }
        anchor.textContent = action.label;
        elements.modalActions.appendChild(anchor);
      } else {
        const placeholder = document.createElement("span");
        placeholder.textContent = `${action.label} unavailable`;
        placeholder.setAttribute("aria-disabled", "true");
        elements.modalActions.appendChild(placeholder);
      }
    });

    elements.infoModal.classList.remove("hidden");
    elements.closeModal.focus();
    playUiTone(460, 0.07, 0.09);
  }

  function closeModal() {
    if (!state.modalOpen) {
      return;
    }

    state.modalOpen = false;
    elements.infoModal.classList.add("hidden");

    if (state.focusReturnTarget instanceof HTMLElement) {
      state.focusReturnTarget.focus();
    } else {
      elements.mapViewport.focus();
    }
  }

  function trapFocus(event) {
    if (event.key !== "Tab") {
      return;
    }

    const focusable = Array.from(elements.infoModal.querySelectorAll("button, [href], [tabindex]:not([tabindex='-1'])"))
      .filter((node) => !node.hasAttribute("disabled"));

    if (focusable.length === 0) {
      return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  function dismissOnboarding() {
    elements.onboarding.classList.add("hidden");
    collapseHeader();
  }

  function collapseHeader() {
    if (state.headerCollapsed) {
      return;
    }
    state.headerCollapsed = true;
    document.body.classList.add("compact-header");
  }

  function ensureAudioStarted() {
    if (state.audio.initialized) {
      return;
    }

    try {
      const AudioContextRef = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextRef) {
        return;
      }

      const context = new AudioContextRef();
      const master = context.createGain();
      master.gain.value = state.audio.volume * 0.06;
      master.connect(context.destination);

      const wind = context.createOscillator();
      wind.type = "triangle";
      wind.frequency.value = 110;
      const windGain = context.createGain();
      windGain.gain.value = 0.16;
      wind.connect(windGain);
      windGain.connect(master);
      wind.start();

      const stream = context.createOscillator();
      stream.type = "sine";
      stream.frequency.value = 262;
      const streamGain = context.createGain();
      streamGain.gain.value = 0.07;
      stream.connect(streamGain);
      streamGain.connect(master);
      stream.start();

      state.audio.initialized = true;
      state.audio.context = context;
      state.audio.master = master;
      state.audio.ambience = [wind, stream];
      applyAudioState();
    } catch (_error) {
      // ignore audio init failures
    }
  }

  function applyAudioState() {
    if (!state.audio.initialized || !state.audio.master) {
      return;
    }

    const value = state.audio.muted ? 0 : state.audio.volume * 0.06;
    state.audio.master.gain.setTargetAtTime(value, state.audio.context.currentTime, 0.06);
  }

  function playFootstepTone(node) {
    if (!state.audio.initialized || state.audio.muted) {
      return;
    }

    const terrain = getTerrainInfo(node.x, node.y);
    const freq = terrain.biome === "mountain"
      ? 220
      : terrain.biome === "river"
        ? 320
        : terrain.biome === "village"
          ? 250
          : 280;

    playUiTone(freq, 0.04, 0.05);
  }

  function playUiTone(freq, duration, gain) {
    if (!state.audio.initialized || state.audio.muted) {
      return;
    }

    const context = state.audio.context;
    const osc = context.createOscillator();
    const amp = context.createGain();

    osc.type = "square";
    osc.frequency.value = freq;
    amp.gain.value = gain;

    osc.connect(amp);
    amp.connect(state.audio.master);

    const now = context.currentTime;
    amp.gain.setValueAtTime(gain, now);
    amp.gain.exponentialRampToValueAtTime(0.001, now + duration);
    osc.start(now);
    osc.stop(now + duration + 0.01);
  }

  function renderLoadError(error) {
    elements.mapGrid.innerHTML = "";
    const banner = document.createElement("div");
    banner.className = "error-banner inventory-frame";
    const title = document.createElement("h2");
    title.textContent = "Unable to load resume data";
    const detail = document.createElement("p");
    detail.textContent = error && error.message
      ? error.message
      : "Check that resume.json exists and contains valid JSON.";
    banner.appendChild(title);
    banner.appendChild(detail);
    elements.mapGrid.appendChild(banner);
  }

  function hash2d(x, y, salt) {
    const value = Math.sin((x * 127.1 + y * 311.7 + state.worldSeed * 0.013 + salt * 17.31)) * 43758.5453;
    return value - Math.floor(value);
  }

  function fractalNoise(x, y, octaves) {
    let total = 0;
    let amplitude = 0.5;
    let frequency = 1;
    let sum = 0;

    for (let i = 0; i < octaves; i += 1) {
      const nx = x * frequency;
      const ny = y * frequency;
      total += amplitude * hash2d(Math.floor(nx * 87), Math.floor(ny * 79), i * 19 + 5);
      sum += amplitude;
      amplitude *= 0.5;
      frequency *= 2;
    }

    return total / Math.max(sum, 0.0001);
  }

  function randomSigned(seedShift) {
    return hash2d(seedShift * 3, seedShift * 11, 29) * 2 - 1;
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function titleCase(text) {
    return String(text || "")
      .replace(/[-_]/g, " ")
      .split(" ")
      .filter(Boolean)
      .map((part) => part[0].toUpperCase() + part.slice(1))
      .join(" ");
  }

  function manhattan(ax, ay, bx, by) {
    return Math.abs(ax - bx) + Math.abs(ay - by);
  }

  function sortToward(candidates, tx, ty) {
    return candidates.slice().sort((a, b) => {
      const da = manhattan(a.x, a.y, tx, ty);
      const db = manhattan(b.x, b.y, tx, ty);
      return da - db;
    });
  }
})();
