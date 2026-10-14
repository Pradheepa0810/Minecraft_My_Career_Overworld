(function () {
  const WORLD_SCALE = 5;
  const WORLD_MARGIN = 42;
  const LOAD_TIMEOUT_MS = 8000;

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
    discoveredCompetencies: new Set(),
    foundEasterEggs: new Set(),
    blocksTraveled: 0,
    journeyCompleted: false,
    finalePending: false,
    finaleShown: false,
    finaleAnimating: false,
    toastTimer: null,
    toastQueue: [],
    activeToast: null,
    loading: false,
    readingDuringLoad: false,
    pendingPlainHtml: null,
    modalOpen: false,
    modalClosing: false,
    blockedHintTimer: null,
    focusReturnTarget: null,
    tileButtons: [],
    tileCache: new Map(),
    lightCache: new Map(),
    entityCache: new Map(),
    contentTiles: new Map(),
    dialogueCache: new Map(),
    avatarImages: [],
    secretImages: [],
    resizeFrame: null,
    resizePending: false,
    reducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    walkResetTimer: null,
    cameraTimer: null,
    entityTimer: null,
    dayNightTimer: null,
    daylight: 1,
    lastMovementAt: 0,
    ambientTick: 0,
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
      birds: new Set(),
      birdTimer: null,
      footstepBuffer: null,
      muted: false,
      volume: 0.35
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
    appShell: document.querySelector(".app-shell"),
    plainResume: document.getElementById("plainResume"),
    plainResumeContent: document.getElementById("plainResumeContent"),
    returnToGame: document.getElementById("returnToGame"),
    printResume: document.getElementById("printResume"),
    playerName: document.getElementById("playerName"),
    playerTitle: document.getElementById("playerTitle"),
    playerTagline: document.getElementById("playerTagline"),
    mapViewport: document.getElementById("mapViewport"),
    mapGrid: document.getElementById("mapGrid"),
    lightLayer: document.getElementById("lightLayer"),
    entityLayer: document.getElementById("entityLayer"),
    dialogueLayer: document.getElementById("dialogueLayer"),
    contentShortcut: document.getElementById("contentShortcut"),
    contentShortcutLabel: document.getElementById("contentShortcutLabel"),
    particleLayer: document.getElementById("particleLayer"),
    dayNightOverlay: document.querySelector(".day-night-overlay"),
    chunkFlash: document.getElementById("chunkFlash"),
    avatar: document.getElementById("avatar"),
    avatarSprite: document.getElementById("avatarSprite"),
    progressHud: document.getElementById("progressHud"),
    competencyHearts: document.getElementById("competencyHearts"),
    competencyCount: document.getElementById("competencyCount"),
    secretCount: document.getElementById("secretCount"),
    resumeXp: document.getElementById("resumeXp"),
    xpFill: document.getElementById("xpFill"),
    revisitCheckpoint: document.getElementById("revisitCheckpoint"),
    discoveryToast: document.getElementById("discoveryToast"),
    movementHint: document.getElementById("movementHint"),
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
    secretHint: document.getElementById("secretHint"),
    secretHintText: document.getElementById("secretHintText"),
    revealNearbySecret: document.getElementById("revealNearbySecret"),
    viewResume: document.getElementById("viewResume"),
    skipTour: document.getElementById("skipTour"),
    roleShortcut: document.getElementById("roleShortcut"),
    downloadResume: document.getElementById("downloadResume"),
    loadStatus: document.getElementById("loadStatus"),
    loadStatusTitle: document.getElementById("loadStatusTitle"),
    loadStatusText: document.getElementById("loadStatusText"),
    retryLoad: document.getElementById("retryLoad"),
    muteAudio: document.getElementById("muteAudio"),
    volumeSlider: document.getElementById("volumeSlider")
  };

  document.addEventListener("DOMContentLoaded", () => {
    preloadAvatarSprites();
    wireEvents();
    init();
  });

  async function init() {
    if (state.loading) return;
    state.loading = true;
    state.readingDuringLoad = elements.plainResume.contains(document.activeElement) || document.body.classList.contains("plain-mode");
    const retrying = !elements.retryLoad.hidden;
    elements.appShell.inert = !elements.onboarding.classList.contains("hidden");
    elements.loadStatus.hidden = false;
    elements.loadStatus.classList.remove("is-error");
    elements.loadStatusTitle.textContent = "Loading resume…";
    elements.loadStatusText.textContent = "Preparing the career journey and resume shortcuts.";
    elements.retryLoad.hidden = !retrying;
    elements.retryLoad.textContent = retrying ? "Loading…" : "Retry loading";
    elements.retryLoad.setAttribute("aria-disabled", "true");
    elements.loadStatus.setAttribute("aria-busy", "true");
    elements.startJourney.disabled = true;

    try {
      const resume = await loadResumeData();
      validateResume(resume);
      state.resume = normalizeResume(resume);
      state.secretImages = Array.from(new Set(state.resume.easterEggs.map((egg) => egg.icon || "gear"))).map((icon) => {
        const image = new Image();
        image.src = `assets/icons/${icon}.svg`;
        if (typeof image.decode === "function") image.decode().catch(() => {});
        return image;
      });
      if (!window.ResumeRenderer) throw new Error("Missing resume-renderer.js. The static plain resume is still available.");
      const html = window.ResumeRenderer.render(state.resume);
      if (elements.plainResumeContent.contains(document.activeElement)) {
        state.pendingPlainHtml = html;
      } else {
        elements.plainResumeContent.innerHTML = html;
      }
      state.stagesById = new Map(state.resume.stages.map((stage) => [stage.id, stage]));
      populateResumeNavigation();

      const expandedPath = expandResumePath(state.resume.path);
      state.path = expandedPath;
      rebuildPathIndexes();
      computeWorldBounds();
      buildLandmarks();
      buildRoadNetwork();
      buildEasterEggs();
      initEntities();
      buildOptionalContent();

      populateHero();
      renderVisibleWindow();
      updateProgressHud();
      updateAvatarLabel();
      updateGuide();
      startDayNightCycle();
      startEntityTicker();
      elements.loadStatus.hidden = true;
      elements.startJourney.disabled = false;
      elements.returnToGame.disabled = false;
      const keepReading = state.readingDuringLoad || elements.plainResume.contains(document.activeElement);
      if (keepReading) {
        document.body.classList.add("plain-mode");
        elements.onboarding.classList.add("hidden");
        elements.appShell.inert = false;
      }
      document.body.classList.add("game-ready");
      if (keepReading) {
        if (!elements.plainResume.contains(document.activeElement)) elements.plainResume.focus({ preventScroll: true });
      } else if (!elements.onboarding.classList.contains("hidden")) {
        elements.startJourney.focus();
      } else {
        elements.mapViewport.focus();
      }
    } catch (error) {
      renderLoadError(error);
    } finally {
      state.loading = false;
      elements.loadStatus.removeAttribute("aria-busy");
      elements.retryLoad.removeAttribute("aria-disabled");
      elements.retryLoad.textContent = "Retry loading";
    }
  }

  function wireEvents() {
    elements.revealNearbySecret.addEventListener("click", () => {
      const egg = state.easterByKey.get(elements.revealNearbySecret.dataset.coordinate);
      if (!egg || state.modalOpen || state.isCameraAnimating) return;
      dismissOnboarding();
      openEasterModal(egg);
    });
    document.addEventListener("visibilitychange", () => { if (document.hidden) stopBirdsong(); });
    elements.contentShortcut.addEventListener("change", () => {
      const value = elements.contentShortcut.value;
      elements.contentShortcut.value = "";
      if (!value || !state.resume) return;
      const [type, index] = value.split(":");
      dismissOnboarding();
      openOptionalContent(type, Number(index));
    });
    const noteReading = () => { if (state.loading) state.readingDuringLoad = true; };
    elements.plainResume.addEventListener("focusin", noteReading);
    elements.plainResume.addEventListener("pointerdown", noteReading);
    window.addEventListener("scroll", () => {
      if (state.loading && window.scrollY > 0) state.readingDuringLoad = true;
    }, { passive: true });
    elements.printResume.hidden = false;
    elements.printResume.addEventListener("click", () => window.print());
    elements.returnToGame.addEventListener("click", () => {
      if (!state.resume) return;
      if (state.pendingPlainHtml !== null) {
        elements.plainResumeContent.innerHTML = state.pendingPlainHtml;
        state.pendingPlainHtml = null;
      }
      document.body.classList.remove("plain-mode");
      window.scrollTo(0, 0);
      elements.mapViewport.focus({ preventScroll: true });
    });
    // Audio is only initialized from a trusted gesture on an interactive control.
    const audioGesture = (event) => {
      if (!event.isTrusted || !(event.target instanceof HTMLElement)) return;
      if (event.type === "keydown" && !["Enter", " ", ...Object.keys(keyToDirection)].includes(event.key)) return;
      if (event.target.closest("button, select, input, #mapViewport") && !state.audio.muted) ensureAudioStarted();
    };
    document.addEventListener("pointerdown", audioGesture, true);
    document.addEventListener("keydown", audioGesture, true);
    document.addEventListener("keydown", handleGlobalKeydown);
    elements.retryLoad.addEventListener("click", init);
    elements.revisitCheckpoint.addEventListener("change", () => {
      const id = elements.revisitCheckpoint.value;
      const destination = state.stageNodeById.get(id);
      elements.revisitCheckpoint.value = "";
      if (!destination || !state.visitedStageIds.has(id) || state.modalOpen || state.isCameraAnimating) return;
      dismissOnboarding();
      state.currentStep = destination.index;
      renderVisibleWindow();
      updateAvatarLabel();
      updateGuide();
      openStageModal(id);
    });

    [elements.viewResume, elements.skipTour].forEach((button) => {
      button.addEventListener("click", () => {
        if (!state.resume) return;
        dismissOnboarding();
        openResumeModal();
      });
    });
    elements.roleShortcut.addEventListener("change", () => {
      const stageId = elements.roleShortcut.value;
      if (!stageId || !state.stagesById.has(stageId)) return;
      dismissOnboarding();
      openStageModal(stageId);
      elements.roleShortcut.value = "";
    });

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
    elements.onboarding.addEventListener("keydown", trapFocus);

    window.addEventListener("resize", scheduleResize);

    elements.muteAudio.addEventListener("click", () => {
      state.audio.muted = !state.audio.muted;
      elements.muteAudio.classList.toggle("is-muted", state.audio.muted);
      elements.muteAudio.textContent = state.audio.muted ? "Unmute" : "Mute";
      elements.muteAudio.setAttribute("aria-pressed", String(state.audio.muted));
      elements.muteAudio.setAttribute("aria-label", state.audio.muted ? "Unmute all audio" : "Mute all audio");
      if (!state.audio.muted) ensureAudioStarted();
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
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), LOAD_TIMEOUT_MS);
    try {
      const response = await fetch(url, { cache: "no-store", signal: controller.signal });
      if (!response.ok) throw new Error("Fetch failed with status " + response.status);
      return await response.json();
    } finally {
      window.clearTimeout(timer);
    }
  }

  function loadViaXmlHttpRequest(url) {
    return new Promise((resolve, reject) => {
      const request = new XMLHttpRequest();
      request.open("GET", url, true);
      request.overrideMimeType("application/json");
      request.timeout = LOAD_TIMEOUT_MS;
      request.ontimeout = () => reject(new Error("Resume loading timed out."));
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
      const timer = window.setTimeout(() => {
        cleanup();
        reject(new Error("Resume fallback loading timed out."));
      }, LOAD_TIMEOUT_MS);

      const cleanup = () => {
        window.clearTimeout(timer);
        iframe.onload = null;
        iframe.onerror = null;
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

  function validateResume(resume) {
    if (!window.ResumeValidator) throw new Error("Missing resume-validator.js. Include it alongside the website files.");
    const errors = window.ResumeValidator.validate(resume);
    if (errors.length) throw new Error("Invalid resume data:\n" + errors.map((error, index) => `${index + 1}. ${error}`).join("\n"));
  }

  function normalizeResume(resume) {
    const normalized = { ...resume };
    normalized.path = Array.isArray(resume.path) ? resume.path : [];
    normalized.stages = Array.isArray(resume.stages) ? resume.stages : [];
    normalized.coreCompetencies = Array.isArray(resume.coreCompetencies) ? resume.coreCompetencies : [];
    normalized.certifications = Array.isArray(resume.certifications) ? resume.certifications : [];
    normalized.education = Array.isArray(resume.education) ? resume.education : [];
    normalized.recognition = Array.isArray(resume.recognition) ? resume.recognition : [];
    normalized.easterEggs = Array.isArray(resume.easterEggs) ? resume.easterEggs : [];
    normalized.contact = resume.contact || {};
    normalized.present = resume.present || {};
    ["patchNotes", "projects", "testimonials"].forEach((field) => {
      normalized[field] = Array.isArray(resume[field]) ? resume[field] : [];
    });
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

    const present = state.path[state.path.length - 1];
    const portalAnchor = [{ x: 0, y: -3 }, { x: 3, y: 0 }, { x: 0, y: 3 }, { x: -3, y: 0 }]
      .map((offset) => ({ x: present.x + offset.x, y: present.y + offset.y }))
      .find((point) => canPlaceStructure(point.x, point.y, 3));
    if (!portalAnchor) throw new Error("The present checkpoint needs space for a portal two blocks away.");
    const orderedSections = [sectionBlueprints[sectionBlueprints.length - 1], ...sectionBlueprints.slice(0, -1)];
    orderedSections.forEach((section) => {
      const idx = sectionBlueprints.indexOf(section);
      const sample = getPathSamplePoint(idx, sectionBlueprints.length);
      const offset = offsets[idx % offsets.length];
      const preferred = {
        x: sample.x + offset.x,
        y: sample.y + offset.y
      };
      const size = idx % 2 === 0 ? 5 : 3;
      const half = Math.floor(size / 2);
      const anchor = section.id === "contact" ? portalAnchor : findNearbyPlacement(preferred.x, preferred.y, half + 10, (x, y) =>
        canPlaceStructure(x, y, size) && state.path.some((node) => Math.max(Math.abs(x - node.x), Math.abs(y - node.y)) <= half + 3)
      );
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
    state.landmarks.sort((a, b) => sectionBlueprints.findIndex((section) => section.id === a.id) - sectionBlueprints.findIndex((section) => section.id === b.id));
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
    const facts = state.resume.easterEggs;

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
        const visibleFromRoute = state.path.some((node) => Math.max(Math.abs(x - node.x), Math.abs(y - node.y)) <= 3);
        return visibleFromRoute && !state.pathSet.has(key) && !state.landmarkByKey.has(key) && !state.easterByKey.has(key);
      });
      const x = clamp(found.x, state.worldBounds.minX + 2, state.worldBounds.maxX - 2);
      const y = clamp(found.y, state.worldBounds.minY + 2, state.worldBounds.maxY - 2);
      const egg = { ...item, x, y, icon: item.icon || "gear" };
      state.easterEggs.push(egg);
      state.easterByKey.set(`${x},${y}`, egg);
    });
  }

  function buildOptionalContent() {
    state.contentTiles.clear();
    elements.contentShortcut.replaceChildren(new Option("Choose content", ""));
    const addOption = (label, type, index) => elements.contentShortcut.appendChild(new Option(label, `${type}:${index}`));
    if (state.resume.patchNotes.length) addOption("Game Updates", "patchNotes", 0);
    state.resume.projects.forEach((project, index) => {
      addOption(project.title, "projects", index);
      const landmark = state.landmarks.find((item) => item.id === "projects");
      const anchor = project.stageId ? state.stageNodeById.get(project.stageId) : landmark;
      const preferred = state.path.reduce((best, node) => manhattan(node.x, node.y, anchor.x, anchor.y) < manhattan(best.x, best.y, anchor.x, anchor.y) ? node : best, state.path[0]);
      const valid = (x, y) => {
        const key = `${x},${y}`;
        return !state.pathSet.has(key) && !state.landmarkByKey.has(key) && !state.easterByKey.has(key) && !state.contentTiles.has(key) && state.path.some((node) => Math.max(Math.abs(x - node.x), Math.abs(y - node.y)) <= 3);
      };
      const point = findNearbyPlacement(preferred.x + 2, preferred.y + 2, 16, valid);
      if (valid(point.x, point.y)) state.contentTiles.set(`${point.x},${point.y}`, { project, index });
    });
    const villagers = state.entities.filter((entity) => entity.type === "villager");
    state.resume.testimonials.forEach((item, index) => {
      addOption(`Reference: ${item.author}`, "testimonials", index);
      if (villagers.length) {
        const stageAnchor = item.stageId && state.stageNodeById.get(item.stageId);
        const candidates = villagers.filter((entity) => !entity.testimonialIndexes);
        const villager = stageAnchor && candidates.length
          ? candidates.reduce((best, entity) => manhattan(entity.x, entity.y, stageAnchor.x, stageAnchor.y) < manhattan(best.x, best.y, stageAnchor.x, stageAnchor.y) ? entity : best)
          : villagers[index % villagers.length];
        if (!villager.testimonialIndexes) {
          const anchor = stageAnchor || villager;
          const route = state.path.reduce((best, node) => manhattan(node.x, node.y, anchor.x, anchor.y) < manhattan(best.x, best.y, anchor.x, anchor.y) ? node : best, state.path[0]);
          const valid = (x, y) => isMobWalkable(x, y) && !state.pathSet.has(`${x},${y}`) && manhattan(x, y, route.x, route.y) === 1;
          const point = findNearbyPlacement(route.x, route.y, 3, valid);
          if (valid(point.x, point.y)) {
            villager.x = point.x;
            villager.y = point.y;
            villager.homeX = point.x;
            villager.homeY = point.y;
          }
        }
        if (!villager.testimonialIndexes) villager.testimonialIndexes = [];
        villager.testimonialIndexes.push(index);
      }
    });
    const hasContent = elements.contentShortcut.options.length > 1;
    elements.contentShortcut.hidden = !hasContent;
    elements.contentShortcutLabel.hidden = !hasContent;
  }

  function openOptionalContent(type, index) {
    if (!state.resume || !["patchNotes", "projects", "testimonials"].includes(type)) return;
    const item = state.resume[type][index];
    if (!item) return;
    let title;
    let sections;
    const actions = [];
    if (type === "patchNotes") {
      title = "Game Updates";
      sections = state.resume.patchNotes.map((note) => {
        const section = createListSection(`${note.version} — ${note.title}`, note.notes);
        const date = document.createElement("p");
        date.textContent = note.date;
        section.insertBefore(date, section.children[1]);
        return section;
      });
    } else if (type === "projects") {
      title = item.title;
      sections = [createParagraphSection("Project", item.summary), createFactsSection("Tags", item.tags)];
      actions.push(createActionLink("View project", window.ResumeRenderer.safeUrl(item.link)));
    } else {
      title = item.author;
      sections = [createParagraphSection(item.role || "Reference", item.quote)];
      if (item.sourceUrl) actions.push(createActionLink("Source", window.ResumeRenderer.safeUrl(item.sourceUrl)));
    }
    renderModal({ icon: "gear", eyebrow: type === "projects" ? "Project Chest" : "Resume Content", title, meta: "", bodySections: sections, actions });
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

  function preloadAvatarSprites() {
    state.avatarImages = ["idle", "walk-up", "walk-down", "walk-left", "walk-right"].map((name) => {
      const image = new Image();
      image.src = `assets/avatar/${name}.svg`;
      if (typeof image.decode === "function") image.decode().catch(() => {});
      return image;
    });
  }

  function scheduleResize() {
    state.resizePending = true;
    if (state.resizeFrame !== null) return;
    state.resizeFrame = window.requestAnimationFrame(() => {
      state.resizeFrame = null;
      if (state.isCameraAnimating) return;
      state.resizePending = false;
      renderVisibleWindow();
    });
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

  function syncCloudParallax(node) {
    const clouds = document.querySelector(".cloud-layer");
    const origin = state.path[0];
    if (!clouds || !origin || !node) return;
    clouds.style.transform = state.reducedMotion ? "translate(0px, 0px)"
      : `translate(${(origin.x - node.x) * 0.6}px, ${(origin.y - node.y) * 0.6}px)`;
  }

  function renderVisibleWindow() {
    const currentNode = state.path[state.currentStep];
    if (!currentNode) {
      return;
    }
    syncCloudParallax(currentNode);

    const cells = getCameraCells();
    const radius = Math.floor(cells / 2);
    const activeTile = elements.mapGrid.contains(document.activeElement) ? document.activeElement : null;
    const focusedCoordinate = activeTile ? activeTile.dataset.coordinate : null;

    elements.mapGrid.style.gridTemplateColumns = `repeat(${cells}, var(--tile-size))`;
    elements.mapGrid.style.gridTemplateRows = `repeat(${cells}, var(--tile-size))`;
    elements.mapGrid.style.transform = "translate(-50%, -50%)";
    const visibleKeys = new Set();
    const lightKeys = new Set();
    state.tileButtons = [];

    for (let row = 0; row < cells; row += 1) {
      for (let column = 0; column < cells; column += 1) {
        const worldX = currentNode.x + (column - radius);
        const worldY = currentNode.y + (row - radius);
        const key = `${worldX},${worldY}`;
        const pathLookup = state.pathIndexByCoordinate.get(key);
        const landmarkTile = state.landmarkByKey.get(key);
        const easter = state.easterByKey.get(key);
        const content = state.contentTiles.get(key);

        visibleKeys.add(key);
        let tile = state.tileCache.get(key);
        if (!tile) {
          tile = document.createElement("div");
          if (pathLookup || landmarkTile || easter || content) {
            tile = document.createElement("button");
            tile.type = "button";
          }

          tile.className = "tile";
          tile.dataset.coordinate = key;
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
          } else if (content) {
            tile.classList.add("tile-path", "tile-project-chest");
            tile.ariaLabel = `Project chest: ${content.project.title}`;
            const chest = document.createElement("span");
            chest.className = "project-chest-art";
            chest.setAttribute("aria-hidden", "true");
            tile.appendChild(chest);
            tile.addEventListener("click", () => {
              dismissOnboarding();
              openOptionalContent("projects", content.index);
            });
          } else {
            setupTerrainTile(tile, terrain);
          }
          state.tileCache.set(key, tile);
          elements.mapGrid.appendChild(tile);
        }
        if (pathLookup) {
          state.tileButtons.push(tile);
          if (lookupVisited(pathLookup) && !tile.querySelector(".tile-marker")) {
            const marker = document.createElement("div");
            marker.className = "tile-marker";
            const image = document.createElement("img");
            image.alt = "";
            image.src = "assets/decor/torch.svg";
            marker.appendChild(image);
            tile.appendChild(marker);
          }
        }

        const distanceFromCenter = Math.max(Math.abs(column - radius), Math.abs(row - radius));
        const existingFog = tile.querySelector(".tile-fog");
        if (distanceFromCenter >= radius - 1 && !existingFog) {
          const fog = document.createElement("div");
          fog.className = "tile-fog";
          tile.appendChild(fog);
        } else if (distanceFromCenter < radius - 1 && existingFog) {
          existingFog.remove();
        }

        tile.style.gridColumn = String(column + 1);
        tile.style.gridRow = String(row + 1);
        if (tile.querySelector(".decor-torch, .decor-lantern, .decor-campfire, .landmark-beacon, .stage-beam, .tile-marker")) {
          lightKeys.add(key);
          let light = state.lightCache.get(key);
          if (!light) {
            light = document.createElement("div");
            light.className = "world-light";
            state.lightCache.set(key, light);
            elements.lightLayer.appendChild(light);
          }
          light.style.left = `calc(${column + 0.5} * var(--tile-size))`;
          light.style.top = `calc(${row + 0.5} * var(--tile-size))`;
        }
      }
    }

    [[state.tileCache, visibleKeys], [state.lightCache, lightKeys]].forEach(([cache, keys]) => {
      cache.forEach((node, key) => {
        if (!keys.has(key)) { node.remove(); cache.delete(key); }
      });
    });
    // Keep keyboard reading order aligned with grid order while retaining nodes.
    let cursor = elements.mapGrid.firstElementChild;
    for (let row = 0; row < cells; row += 1) {
      for (let column = 0; column < cells; column += 1) {
        const tile = state.tileCache.get(`${currentNode.x + column - radius},${currentNode.y + row - radius}`);
        if (tile !== cursor) elements.mapGrid.insertBefore(tile, cursor);
        cursor = tile.nextElementSibling;
      }
    }
    renderEntities();
    updateAdjacentTileStates();
    updateSecretHint();
    if (focusedCoordinate) {
      const replacement = Array.from(elements.mapGrid.querySelectorAll("button")).find((button) => button.dataset.coordinate === focusedCoordinate && !button.disabled);
      (replacement || elements.mapViewport).focus({ preventScroll: true });
    }
  }

  function lookupVisited(lookup) {
    return lookup.node.type === "stage" && state.visitedStageIds.has(lookup.node.stageId);
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
    if (easter.icon && easter.icon !== "gear") {
      badge.classList.add("easter-item-icon");
      const image = document.createElement("img");
      image.src = `assets/icons/${easter.icon}.svg`;
      image.alt = "";
      image.width = 32;
      image.height = 32;
      image.loading = "eager";
      badge.appendChild(image);
    } else {
      badge.textContent = "*";
    }
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
      if (resume.patchNotes.length) {
        const section = document.createElement("section");
        section.className = "modal-section";
        const button = document.createElement("button");
        button.className = "primary-button";
        button.type = "button";
        button.textContent = "Game Updates";
        button.addEventListener("click", () => openOptionalContent("patchNotes", 0));
        section.appendChild(button);
        bodySections.push(section);
      }
      meta = "Redstone Region";
    } else if (id === "certifications") {
      bodySections = [createFactsSection("Certifications", resume.certifications || [])];
      meta = "Temple Region";
    } else if (id === "awards") {
      bodySections = [createListSection("Recognition", resume.recognition)];
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
    if (id === "about") recordCompetencies(resume.coreCompetencies.slice(0, 10));
    if (id === "skills") recordCompetencies(resume.coreCompetencies);
  }

  function openEasterModal(easter) {
    const key = `${easter.x},${easter.y}`;
    const firstDiscovery = !state.foundEasterEggs.has(key);
    state.foundEasterEggs.add(key);
    renderModal({
      icon: easter.icon || "gear",
      eyebrow: "Easter Egg",
      title: easter.name,
      meta: "Hidden Discovery",
      bodySections: [createParagraphSection("Fun Fact", easter.fact)],
      actions: []
    });
    elements.modalIcon.classList.add("discovery-icon");
    updateProgressHud();
    if (firstDiscovery) showDiscoveryToast(`Secret found: ${easter.name} — ${state.foundEasterEggs.size}/${state.easterEggs.length}`, "secret");
    updateSecretHint();
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
    // Keep travel roads clear and water decor appropriate to water.
    if (state.roadSet.has(`${terrain.x},${terrain.y}`)) return null;
    if (terrain.biome !== "river") {
      let nearestRegion = null;
      let nearestDistance = Infinity;
      state.resume.stages.forEach((stage) => {
        const anchor = state.stageNodeById.get(stage.id);
        if (!stage.region || !anchor) return;
        const distance = Math.hypot(terrain.x - anchor.x, terrain.y - anchor.y);
        if (distance < stage.region.radius && distance < nearestDistance) {
          nearestRegion = stage.region;
          nearestDistance = distance;
        }
      });
      if (nearestRegion && nearestRegion.decor.length) {
        const cluster = hash2d(Math.floor(terrain.x / 3), Math.floor(terrain.y / 3), 457);
        const density = nearestRegion.density * (0.5 + cluster);
        return roll < density ? nearestRegion.decor[Math.floor(roll2 * nearestRegion.decor.length)] : null;
      }
    }

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
    if (!currentNode) return;
    const cells = getCameraCells();
    const radius = Math.floor(cells / 2);
    const tileSize = getTileSize();

    const visibleIds = new Set();

    state.entities.forEach((entity) => {
      const dx = entity.x - currentNode.x;
      const dy = entity.y - currentNode.y;
      if (Math.abs(dx) > radius + 1 || Math.abs(dy) > radius + 1) {
        return;
      }

      const px = (dx + radius + 0.5) * tileSize;
      const py = (dy + radius + 0.5) * tileSize;

      visibleIds.add(entity.id);
      let wrapper = state.entityCache.get(entity.id);
      if (!wrapper) {
        wrapper = document.createElement("div");
        wrapper.dataset.entityId = entity.id;

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
        state.entityCache.set(entity.id, wrapper);
      }
      const className = `entity entity-${entity.type} dir-${entity.dir || "down"}`;
      if (wrapper.className !== className) wrapper.className = className;
      if (wrapper.style.left !== `${px}px`) wrapper.style.left = `${px}px`;
      if (wrapper.style.top !== `${py}px`) wrapper.style.top = `${py}px`;
    });
    state.entityCache.forEach((node, id) => {
      if (!visibleIds.has(id)) { node.remove(); state.entityCache.delete(id); }
    });
    const dialogueIds = new Set();
    state.entities.forEach((entity) => {
      if (!entity.testimonialIndexes || manhattan(entity.x, entity.y, currentNode.x, currentNode.y) > 1) return;
      entity.testimonialIndexes.forEach((index) => {
        const item = state.resume.testimonials[index];
        const key = `${entity.id}:${index}`;
        dialogueIds.add(key);
        let button = state.dialogueCache.get(key);
        if (!button) {
          button = document.createElement("button");
          button.type = "button";
          button.className = "villager-dialogue";
          button.textContent = `Read reference: ${item.author}`;
          button.addEventListener("click", () => openOptionalContent("testimonials", index));
          elements.dialogueLayer.appendChild(button);
          state.dialogueCache.set(key, button);
        }
        button.style.left = `${(entity.x - currentNode.x + radius + 0.5) * tileSize}px`;
        button.style.top = `${(entity.y - currentNode.y + radius - 0.5) * tileSize - entity.testimonialIndexes.indexOf(index) * 48}px`;
      });
    });
    state.dialogueCache.forEach((node, id) => {
      if (!dialogueIds.has(id) && node !== document.activeElement) { node.remove(); state.dialogueCache.delete(id); }
    });
  }

  function startEntityTicker() {
    if (state.reducedMotion) {
      return;
    }

    state.entityTimer = window.setInterval(() => {
      if (state.isCameraAnimating || document.body.classList.contains("plain-mode")) return;
      const player = state.path[state.currentStep];

      state.entities.forEach((entity, index) => {
        if (entity.testimonialIndexes) return;
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

      emitAmbientParticles(player.x, player.y);

      renderEntities();
    }, 900);
  }

  function startDayNightCycle() {
    window.clearInterval(state.dayNightTimer);
    const sun = document.querySelector(".sun-block");
    if (sun) {
      sun.style.removeProperty("left");
      sun.style.removeProperty("top");
      sun.style.removeProperty("transform");
    }
    const started = performance.now();
    const update = () => {
      const seconds = ((performance.now() - started) / 1000) % 42;
      // Day occupies seconds 0–30, night 30–42; one-second fades
      // straddle the boundaries without moving the sun or camera.
      let darkness = 0;
      if (seconds >= 29.5 && seconds < 30.5) darkness = seconds - 29.5;
      else if (seconds >= 30.5 && seconds < 41.5) darkness = 1;
      else if (seconds >= 41.5) darkness = 42.5 - seconds;
      else if (seconds < 0.5 && performance.now() - started >= 42000) darkness = 0.5 - seconds;
      state.daylight = state.reducedMotion ? 1 : 1 - darkness;
      if (state.daylight < 0.65) stopBirdsong();
      const night = 1 - state.daylight;
      elements.mapViewport.style.setProperty("--night-strength", night.toFixed(3));
      elements.mapViewport.style.setProperty("--glow-size", (1.5 + night * 2.5).toFixed(3));
      elements.dayNightOverlay.style.background = `rgba(12, 20, 44, ${(0.04 + night * 0.38).toFixed(3)})`;
      document.body.style.background = `linear-gradient(180deg, rgb(${Math.round(126 - night * 102)}, ${Math.round(192 - night * 166)}, ${Math.round(238 - night * 187)}), rgb(${Math.round(217 - night * 172)}, ${Math.round(242 - night * 183)}, ${Math.round(255 - night * 166)}))`;
      if (sun) {
        sun.style.opacity = String(state.daylight);
      }
    };
    update();
    if (!state.reducedMotion) state.dayNightTimer = window.setInterval(update, 200);
  }

  async function moveToStep(nextStep) {
    const previousNode = state.path[state.currentStep];
    const nextNode = state.path[nextStep];

    if (!nextNode || state.modalOpen || state.isCameraAnimating || state.finaleAnimating) {
      return;
    }

    const direction = getDirection(previousNode, nextNode);
    setAvatarWalkSprite(direction);
    elements.avatar.classList.add("walking");
    state.isCameraAnimating = true;
    state.lastMovementAt = performance.now();
    stopBirdsong();

    emitMoveParticles(nextNode);
    playFootstepTone(nextNode);

    const animations = [];
    if (!state.reducedMotion && typeof elements.mapGrid.animate === "function") {
      const dx = (nextNode.x - previousNode.x) * getTileSize();
      const dy = (nextNode.y - previousNode.y) * getTileSize();
      [elements.mapGrid, elements.lightLayer, elements.entityLayer, elements.dialogueLayer, elements.particleLayer].forEach((layer) => {
        animations.push(layer.animate([
          { transform: "translate(-50%, -50%)" },
          { transform: `translate(calc(-50% - ${dx}px), calc(-50% - ${dy}px))` }
        ], { duration: 280, easing: "cubic-bezier(0.25, 0.1, 0.25, 1)", fill: "forwards" }));
      });
      syncCloudParallax(nextNode);
      await Promise.all(animations.map((animation) => animation.finished.catch(() => {})));
    }

    // Rebuild at the destination and remove completed offsets in the same frame.
    // CSS transitions must not animate this coordinate rebase backwards.
    state.currentStep = nextStep;
    state.blocksTraveled += 1;
    if (nextNode.type === "present") state.journeyCompleted = true;
    renderVisibleWindow();
    animations.forEach((animation) => animation.cancel());
    elements.particleLayer.replaceChildren();
    state.isCameraAnimating = false;
    if (state.resizePending) scheduleResize();
    updateProgressHud();
    updateAvatarLabel();
    updateGuide();
    if (!state.modalOpen) maybeOpenContextPanel(nextNode);
    resetAvatarToIdle();
  }

  function emitMoveParticles(node) {
    if (state.reducedMotion) return;
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
    if (state.reducedMotion || document.hidden || state.modalOpen || elements.particleLayer.childElementCount >= 16) return;
    const cells = getCameraCells();
    const tileSize = getTileSize();
    const center = Math.floor(cells / 2) + 0.5;

    state.ambientTick += 1;
    const night = state.daylight < 0.35;
    const seed = state.ambientTick;
    const p = document.createElement("div");
    p.className = `particle ${night ? "particle-firefly" : "particle-leaf"}`;
    p.style.left = `${center * tileSize + randomSigned(playerX + seed * 29) * tileSize * 3}px`;
    p.style.top = `${center * tileSize + randomSigned(playerY + seed * 53) * tileSize * 2}px`;
    elements.particleLayer.appendChild(p);
    window.setTimeout(() => p.remove(), 4200);
  }

  function maybeOpenContextPanel(node) {
    if (node.type === "stage") {
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
    if (state.reducedMotion) return;
    elements.chunkFlash.classList.remove("active");
    void elements.chunkFlash.offsetWidth;
    elements.chunkFlash.classList.add("active");
    window.setTimeout(() => elements.chunkFlash.classList.remove("active"), 420);
  }

  function updateProgressHud() {
    if (!state.resume) return;
    const total = state.resume.stages.length;
    const viewed = state.visitedStageIds.size;
    const percentage = total ? Math.round(viewed / total * 100) : 0;
    elements.progressHud.textContent = `Roles viewed: ${viewed}/${total}`;
    elements.xpFill.style.width = `${percentage}%`;
    elements.resumeXp.setAttribute("aria-valuenow", String(percentage));
    elements.resumeXp.setAttribute("aria-valuetext", `${viewed} of ${total} roles viewed`);
    const competencyTotal = new Set(state.resume.coreCompetencies).size;
    const explored = state.discoveredCompetencies.size;
    const hearts = competencyTotal ? Math.round(explored / competencyTotal * 5) : 0;
    elements.competencyHearts.textContent = "❤".repeat(hearts) + "♡".repeat(5 - hearts);
    elements.competencyCount.textContent = `Competencies explored: ${explored}/${competencyTotal}`;
    elements.secretCount.textContent = `Secrets found: ${state.foundEasterEggs.size}/${state.easterEggs.length}`;
    const previousSelection = elements.revisitCheckpoint.value;
    elements.revisitCheckpoint.replaceChildren(new Option(viewed ? "Choose a viewed checkpoint" : "View a role to unlock revisit", ""));
    state.resume.stages.filter((stage) => state.visitedStageIds.has(stage.id)).forEach((stage) => {
      elements.revisitCheckpoint.appendChild(new Option(`${stage.role} — ${stage.company}`, stage.id));
    });
    elements.revisitCheckpoint.disabled = viewed === 0;
    elements.revisitCheckpoint.value = previousSelection;
  }

  function recordCompetencies(items) {
    const core = new Set(state.resume.coreCompetencies);
    items.forEach((item) => { if (core.has(item)) state.discoveredCompetencies.add(item); });
    updateProgressHud();
  }

  function recordRoleView(stage, notify = true) {
    const firstView = !state.visitedStageIds.has(stage.id);
    state.visitedStageIds.add(stage.id);
    recordCompetencies(stage.skills || []);
    if (firstView && notify) showDiscoveryToast(`Role viewed: ${stage.role} — ${state.visitedStageIds.size}/${state.resume.stages.length}`);
  }

  function showDiscoveryToast(message, kind = "achievement") {
    if (state.activeToast === message || state.toastQueue.some((toast) => toast.message === message)) return;
    state.toastQueue.push({ message, kind });
    if (state.toastTimer === null) displayNextToast();
  }

  function displayNextToast() {
    const toast = state.toastQueue.shift();
    if (!toast) { state.toastTimer = null; return; }
    state.activeToast = toast.message;
    elements.discoveryToast.textContent = toast.message;
    elements.discoveryToast.classList.add("is-visible");
    playUiTone(toast.kind === "secret" ? 740 : 620, 0.12, 0.06);
    state.toastTimer = window.setTimeout(() => {
      elements.discoveryToast.classList.remove("is-visible");
      elements.discoveryToast.textContent = "";
      state.activeToast = null;
      state.toastTimer = window.setTimeout(displayNextToast, 350);
    }, 4000);
  }

  function positionGuideAwayFromSecrets() {
    const panel = elements.guidePopup;
    const viewport = elements.mapViewport.getBoundingClientRect();
    const width = panel.offsetWidth;
    const height = panel.offsetHeight;
    if (!width || !height) return;
    const tiles = Array.from(elements.mapGrid.querySelectorAll(".tile-easter, .tile-stage")).map((tile) => ({ rect: tile.getBoundingClientRect(), weight: tile.classList.contains("tile-easter") ? 20 : 2 }));
    tiles.push({ rect: elements.avatar.getBoundingClientRect(), weight: 4 });
    const hotbar = elements.mapViewport.querySelector(".hotbar");
    if (hotbar) tiles.push({ rect: hotbar.getBoundingClientRect(), weight: 10 });
    const padding = 8;
    const corners = [
      { right: padding, top: padding },
      { left: padding, top: padding },
      { right: padding, bottom: 76 },
      { left: padding, bottom: 76 }
    ];
    const maxLeft = Math.max(padding, elements.mapViewport.clientWidth - width - padding);
    const maxTop = Math.max(padding, elements.mapViewport.clientHeight - height - padding);
    [padding, (padding + maxLeft) / 2, maxLeft].forEach((left) => {
      [padding, (padding + maxTop) / 2, maxTop].forEach((top) => corners.push({ left, top }));
    });
    const scored = corners.map((corner) => {
      const x = corner.left !== undefined ? viewport.left + corner.left : viewport.right - corner.right - width;
      const y = corner.top !== undefined ? viewport.top + corner.top : viewport.bottom - corner.bottom - height;
      const overlap = tiles.reduce((sum, item) => sum + item.weight * Math.max(0, Math.min(x + width, item.rect.right) - Math.max(x, item.rect.left)) * Math.max(0, Math.min(y + height, item.rect.bottom) - Math.max(y, item.rect.top)), 0);
      return { corner, overlap };
    });
    scored.sort((a, b) => a.overlap - b.overlap);
    const corner = scored[0].corner;
    ["left", "right", "top", "bottom"].forEach((side) => {
      panel.style[side] = corner[side] === undefined ? "auto" : `${corner[side]}px`;
    });
  }

  function updateSecretHint() {
    const player = state.path[state.currentStep];
    if (!player) return;
    const radius = Math.floor(getCameraCells() / 2);
    const nearby = state.easterEggs
      .filter((egg) => !state.foundEasterEggs.has(`${egg.x},${egg.y}`) && Math.max(Math.abs(egg.x - player.x), Math.abs(egg.y - player.y)) <= radius - 1)
      .sort((a, b) => manhattan(a.x, a.y, player.x, player.y) - manhattan(b.x, b.y, player.x, player.y))[0];
    const key = nearby ? `${nearby.x},${nearby.y}` : "";
    state.tileCache.forEach((tile, coordinate) => {
      tile.classList.toggle("secret-nudge", coordinate === key);
    });
    const focusOnButton = document.activeElement === elements.revealNearbySecret;
    if (!nearby) {
      elements.secretHint.hidden = true;
      elements.secretHintText.textContent = "";
      delete elements.revealNearbySecret.dataset.coordinate;
      if (focusOnButton) elements.mapViewport.focus({ preventScroll: true });
      positionGuideAwayFromSecrets();
      return;
    }
    elements.secretHint.hidden = false;
    const dx = nearby.x - player.x, dy = nearby.y - player.y;
    const direction = [dy < 0 ? "above" : dy > 0 ? "below" : "", dx < 0 ? "left" : dx > 0 ? "right" : ""].filter(Boolean).join(" and ");
    const text = `Secret nearby ${direction}! Click or tap the sparkling tile, or choose Open Secret. No need to leave the path.`;
    if (elements.secretHintText.textContent !== text) elements.secretHintText.textContent = text;
    elements.revealNearbySecret.dataset.coordinate = key;
    positionGuideAwayFromSecrets();
  }

  function updateGuide() {
    const hint = getGuideHint();
    if (!hint) {
      return;
    }

    if (elements.guideTarget.textContent !== hint.target) elements.guideTarget.textContent = hint.target;
    if (elements.guideArrow.textContent !== hint.arrow) elements.guideArrow.textContent = hint.arrow;
    elements.guideText.textContent = hint.text;
    elements.guidePopup.classList.toggle("is-finale", hint.isFinale);
    positionGuideAwayFromSecrets();
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
    if (!state.resume) return;
    if (event.key === "Escape" && state.modalOpen) {
      closeModal();
      return;
    }

    if (event.key === "Escape" && !elements.onboarding.classList.contains("hidden")) {
      dismissOnboarding();
      return;
    }

    if (event.target instanceof HTMLElement && event.target.closest("input, select, textarea, [contenteditable='true']")) {
      return;
    }

    if (elements.onboarding.classList.contains("hidden") && !(event.target instanceof HTMLElement && event.target.closest("#mapViewport"))) return;

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
    if (state.modalOpen || state.isCameraAnimating || state.finaleAnimating) return;
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
      return;
    }
    window.clearTimeout(state.blockedHintTimer);
    const onward = nextNode || previousNode;
    elements.movementHint.textContent = onward
      ? `Stay on the path: try ${getDirection(currentNode, onward)}.`
      : "Use View Resume to read directly.";
    state.blockedHintTimer = window.setTimeout(() => { elements.movementHint.textContent = ""; }, 2500);
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

  function populateResumeNavigation() {
    elements.roleShortcut.replaceChildren(new Option("Choose a role", ""));
    state.resume.stages.forEach((stage) => {
      const option = document.createElement("option");
      option.value = stage.id;
      option.textContent = `${stage.role} — ${stage.company}`;
      elements.roleShortcut.appendChild(option);
    });
    elements.viewResume.disabled = false;
    elements.skipTour.disabled = false;
    elements.roleShortcut.disabled = false;

    const pdf = String(state.resume.contact.resumePdf || "").trim();
    elements.downloadResume.removeAttribute("href");
    elements.downloadResume.setAttribute("aria-disabled", "true");
    if (pdf && (!/^[a-z][a-z\d+.-]*:/i.test(pdf) || /^https?:/i.test(pdf)) && !pdf.startsWith("//")) {
      elements.downloadResume.href = pdf;
      elements.downloadResume.target = "_blank";
      elements.downloadResume.rel = "noopener noreferrer";
      elements.downloadResume.removeAttribute("aria-disabled");
    }
  }

  function openResumeModal() {
    stopBirdsong();
    const resume = state.resume;
    document.body.classList.add("plain-mode");
    elements.plainResume.focus({ preventScroll: true });
    window.scrollTo(0, 0);
    resume.stages.forEach((stage) => recordRoleView(stage, false));
    recordCompetencies(resume.coreCompetencies);
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
    recordRoleView(stage);
  }

  function openPresentModal() {
    const resume = state.resume;
    state.finalePending = state.journeyCompleted && !state.finaleShown && Boolean(resume.present.candidateTitle);
    const actions = [
      createActionLink("Email", resume.contact.email ? `mailto:${resume.contact.email}` : ""),
      createActionLink("Call", resume.contact.phone ? `tel:${resume.contact.phone.replace(/\s+/g, "")}` : ""),
      createActionLink("LinkedIn", resume.contact.linkedin || ""),
      createActionLink("Resume PDF", resume.contact.resumePdf || "")
    ];

    const bodySections = [
      createParagraphSection(resume.present.headline || "Current Focus", resume.present.message || ""),
      createFactsSection("Core Competencies", resume.coreCompetencies || []),
      createFactsSection("Certifications", resume.certifications || []),
      createFactsSection("Education", resume.education || [])
    ];
    if (state.journeyCompleted) {
      bodySections.push(createListSection("Journey Summary", [
        `Roles viewed: ${state.visitedStageIds.size}/${resume.stages.length}`,
        `Secrets found: ${state.foundEasterEggs.size}/${state.easterEggs.length}`,
        `Blocks traveled on foot: ${state.blocksTraveled}`,
        "Exploration is optional. Resume and contact actions remain available at any time."
      ]));
      const section = document.createElement("section");
      section.className = "modal-section";
      const button = document.createElement("button");
      button.type = "button";
      button.className = "primary-button";
      button.textContent = "Share my run";
      button.addEventListener("click", openRunShare);
      section.appendChild(button);
      bodySections.push(section);
    }

    renderModal({
      icon: resume.present.icon || "leadership",
      eyebrow: "Present Day",
      title: resume.present.title || "You reached the present!",
      meta: resume.title || "",
      bodySections,
      actions
    });
    recordCompetencies(resume.coreCompetencies);
  }

  function openRunShare() {
    if (!state.resume || !state.journeyCompleted) return;
    // Share is an optional branch; do not trigger the shepherd sequence on closing it.
    state.finalePending = false;
    const stats = {
      roles: state.visitedStageIds.size, totalRoles: state.resume.stages.length,
      secrets: state.foundEasterEggs.size, totalSecrets: state.easterEggs.length,
      blocks: state.blocksTraveled
    };
    const section = document.createElement("section");
    section.className = "modal-section run-share";
    const summary = document.createElement("p");
    summary.textContent = `${stats.roles}/${stats.totalRoles} roles viewed, ${stats.secrets}/${stats.totalSecrets} secrets found, ${stats.blocks} blocks walked.`;
    section.appendChild(summary);
    const canvas = document.createElement("canvas");
    canvas.setAttribute("role", "img");
    canvas.setAttribute("aria-label", `${state.resume.name}. ${summary.textContent}`);
    try {
      window.ResumeShareCard.renderCanvas(canvas, state.resume, stats);
      section.appendChild(canvas);
    } catch (_) {
      section.appendChild(document.createTextNode("Image rendering could not start. Your run summary is shown above."));
      renderModal({ icon: "gear", eyebrow: "Journey Summary", title: "Share my run", meta: "", bodySections: [section], actions: [] });
      return;
    }
    const controls = document.createElement("div");
    controls.className = "run-share-controls";
    const status = document.createElement("p");
    status.setAttribute("role", "status");
    status.setAttribute("aria-live", "polite");
    const blobPromise = new Promise((resolve, reject) => {
      canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("PNG encoding failed")), "image/png");
    });
    blobPromise.catch(() => { status.textContent = "PNG encoding failed. Try reopening this card."; });
    const addButton = (label, handler) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "primary-button";
      button.textContent = label;
      button.addEventListener("click", handler);
      controls.appendChild(button);
      return button;
    };
    addButton("Download PNG", async () => {
      try {
        const blob = await blobPromise;
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = "career-run.png";
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.setTimeout(() => URL.revokeObjectURL(url), 60000);
        status.textContent = "PNG download requested.";
      } catch (_) { status.textContent = "Download could not start. Try reopening this card."; }
    });
    const canCopy = window.isSecureContext && navigator.clipboard && typeof navigator.clipboard.write === "function" && typeof window.ClipboardItem === "function";
    const copy = addButton("Copy image", async () => {
      try {
        await navigator.clipboard.write([new ClipboardItem({ "image/png": blobPromise })]);
        status.textContent = "Image copied.";
      } catch (_) { status.textContent = "Image copy was blocked. Use Download PNG instead."; }
    });
    copy.disabled = !canCopy;
    const share = addButton("Share image", async () => {
      try {
        const file = new File([await blobPromise], "career-run.png", { type: "image/png" });
        const data = { title: state.resume.name || "Career run", text: summary.textContent, files: [file] };
        if (!navigator.canShare || !navigator.canShare({ files: [file] })) {
          status.textContent = "Image sharing is not supported here. Use Download PNG instead.";
          return;
        }
        await navigator.share(data);
        status.textContent = "Share completed.";
      } catch (error) { status.textContent = error.name === "AbortError" ? "Sharing cancelled." : "Sharing was blocked. Use Download PNG instead."; }
    });
    share.disabled = !window.isSecureContext || typeof navigator.share !== "function";
    if (!canCopy || share.disabled) status.textContent = "Some sharing actions are not supported by this browser. Download PNG is available.";
    section.appendChild(controls);
    section.appendChild(status);
    renderModal({ icon: "gear", eyebrow: "Journey Summary", title: "Share my run", meta: "", bodySections: [section], actions: [] });
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
    elements.modalIcon.classList.remove("discovery-icon");
    stopBirdsong();
    if (!state.modalOpen) state.focusReturnTarget = document.activeElement;
    state.modalOpen = true;
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
        placeholder.textContent = action.label;
        placeholder.setAttribute("role", "link");
        placeholder.setAttribute("aria-disabled", "true");
        elements.modalActions.appendChild(placeholder);
      }
    });

    elements.infoModal.classList.remove("hidden");
    elements.appShell.inert = true;
    elements.closeModal.focus();
    playUiTone(460, 0.07, 0.09);
  }

  async function closeModal() {
    if (!state.modalOpen || state.modalClosing) {
      return;
    }
    state.modalClosing = true;
    playUiTone(330, 0.06, 0.045);
    const card = elements.infoModal.querySelector(".modal-card");
    if (!state.reducedMotion && typeof card.animate === "function") {
      const animation = card.animate([
        { opacity: 1, transform: "translateY(0)" },
        { opacity: 0, transform: "translateY(4px)" }
      ], { duration: 100, easing: "ease-in", fill: "forwards" });
      await animation.finished.catch(() => {});
      elements.infoModal.classList.add("hidden");
      animation.cancel();
    }
    state.modalOpen = false;
    state.modalClosing = false;
    elements.infoModal.classList.add("hidden");
    elements.appShell.inert = false;

    if (state.focusReturnTarget instanceof HTMLElement && state.focusReturnTarget.isConnected && !state.focusReturnTarget.closest(".hidden") && !state.focusReturnTarget.hasAttribute("disabled")) {
      state.focusReturnTarget.focus();
    } else {
      elements.mapViewport.focus();
    }
    if (state.finalePending) {
      state.finalePending = false;
      await enterNextOpportunity();
    }
  }

  async function enterNextOpportunity() {
    if (state.finaleShown || state.finaleAnimating) return;
    state.finaleShown = true;
    state.finaleAnimating = true;
    stopBirdsong();
    const footstepTimer = state.reducedMotion ? null : window.setInterval(() => playFootstepTone(state.path[state.currentStep]), 260);
    playFootstepTone(state.path[state.currentStep]);
    const portal = elements.mapGrid.querySelector(".portal-core");
    const portrait = elements.guidePopup.querySelector(".guide-portrait");
    const traveler = portrait.cloneNode(true);
    traveler.classList.add("shepherd-traveler");
    traveler.setAttribute("aria-hidden", "true");
    const from = portrait.getBoundingClientRect();
    const to = portal ? portal.getBoundingClientRect() : elements.avatar.getBoundingClientRect();
    traveler.style.left = `${from.left}px`;
    traveler.style.top = `${from.top}px`;
    document.body.appendChild(traveler);
    try {
      if (!state.reducedMotion && typeof traveler.animate === "function") {
        const animation = traveler.animate([
          { transform: "translate(0, 0) scale(1)", opacity: 1 },
          { transform: `translate(${to.left + to.width / 2 - from.left - from.width / 2}px, ${to.top + to.height / 2 - from.top - from.height / 2}px) scale(0.15)`, opacity: 0 }
        ], { duration: 1100, easing: "ease-in-out", fill: "forwards" });
        await animation.finished.catch(() => {});
      }
    } finally {
      window.clearInterval(footstepTimer);
      state.lastMovementAt = performance.now();
      traveler.remove();
      state.finaleAnimating = false;
    }
    if (state.modalOpen || !state.resume) return;
    const resume = state.resume;
    renderModal({
      icon: resume.present.icon || "leadership",
      eyebrow: "Next Opportunity",
      title: resume.present.candidateTitle,
      meta: resume.title || "",
      bodySections: [createParagraphSection("Let's connect", resume.present.candidateMessage || "")],
      actions: [
        createActionLink("Email", resume.contact.email ? `mailto:${resume.contact.email}` : ""),
        createActionLink("LinkedIn", resume.contact.linkedin || ""),
        createActionLink("Resume PDF", resume.contact.resumePdf || "")
      ]
    });
  }

  function trapFocus(event) {
    if (event.key !== "Tab") {
      return;
    }

    const dialog = event.currentTarget;
    const focusable = Array.from(dialog.querySelectorAll("button, [href], [tabindex]:not([tabindex='-1'])"))
      .filter((node) => !node.hasAttribute("disabled") && !node.hidden && node.getClientRects().length > 0);

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
    const wasOpen = !elements.onboarding.classList.contains("hidden");
    elements.onboarding.classList.add("hidden");
    elements.appShell.inert = false;
    collapseHeader();
    if (wasOpen) elements.mapViewport.focus({ preventScroll: true });
  }

  function collapseHeader() {
    if (state.headerCollapsed) {
      return;
    }
    state.headerCollapsed = true;
    document.body.classList.add("compact-header");
  }

  function ensureAudioStarted() {
    if (state.audio.muted || (navigator.userActivation && !navigator.userActivation.isActive)) return;
    if (state.audio.initialized) {
      if (state.audio.context.state === "suspended") state.audio.context.resume().catch(() => {});
      return;
    }

    try {
      const AudioContextRef = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextRef) {
        return;
      }

      const context = new AudioContextRef();
      const master = context.createGain();
      master.gain.value = state.audio.volume * 0.45;
      master.connect(context.destination);

      const wind = context.createOscillator();
      wind.type = "triangle";
      wind.frequency.value = 110;
      const windGain = context.createGain();
      windGain.gain.value = 0.04;
      wind.connect(windGain);
      windGain.connect(master);
      wind.start();

      const stream = context.createOscillator();
      stream.type = "sine";
      stream.frequency.value = 262;
      const streamGain = context.createGain();
      streamGain.gain.value = 0.02;
      stream.connect(streamGain);
      streamGain.connect(master);
      stream.start();

      state.audio.initialized = true;
      state.audio.context = context;
      state.audio.master = master;
      state.audio.ambience = [wind, stream];
      state.audio.birdTimer = window.setInterval(playIdleBirdsong, 2600);
      applyAudioState();
    } catch (_error) {
      // ignore audio init failures
    }
  }

  function applyAudioState() {
    if (state.audio.muted || state.audio.volume === 0) stopBirdsong();
    if (!state.audio.initialized || !state.audio.master) {
      return;
    }

    const value = state.audio.muted ? 0 : state.audio.volume * 0.45;
    state.audio.master.gain.setTargetAtTime(value, state.audio.context.currentTime, 0.06);
  }

  function stopBirdsong() {
    state.audio.birds.forEach((oscillator) => {
      try { oscillator.stop(); } catch (_) { /* Already ended. */ }
    });
    state.audio.birds.clear();
  }

  function playIdleBirdsong() {
    if (!state.resume || !state.audio.initialized || state.audio.muted || state.audio.volume === 0 || state.audio.context.state !== "running" || document.hidden || state.daylight < 0.65 || state.isCameraAnimating || state.finaleAnimating || state.modalOpen || performance.now() - state.lastMovementAt < 1000 || document.body.classList.contains("plain-mode") || !elements.onboarding.classList.contains("hidden")) {
      stopBirdsong();
      return;
    }
    if (state.audio.birds.size) return;
    const context = state.audio.context;
    for (let i = 0; i < 3; i += 1) {
      const osc = context.createOscillator();
      const amp = context.createGain();
      const time = context.currentTime + i * 0.19;
      const frequency = 1800 + Math.random() * 900;
      osc.type = "sine";
      osc.frequency.setValueAtTime(frequency, time);
      osc.frequency.exponentialRampToValueAtTime(frequency * 1.35, time + 0.06);
      osc.frequency.exponentialRampToValueAtTime(frequency * 0.85, time + 0.15);
      amp.gain.setValueAtTime(0.001, time);
      amp.gain.linearRampToValueAtTime(0.1, time + 0.02);
      amp.gain.exponentialRampToValueAtTime(0.001, time + 0.17);
      osc.connect(amp);
      amp.connect(state.audio.master);
      state.audio.birds.add(osc);
      osc.onended = () => { state.audio.birds.delete(osc); osc.disconnect(); amp.disconnect(); };
      osc.start(time);
      osc.stop(time + 0.18);
    }
  }

  function playFootstepTone(node) {
    if (!node || !state.audio.initialized || state.audio.muted || state.audio.volume === 0 || state.audio.context.state !== "running") return;
    const context = state.audio.context;
    if (!state.audio.footstepBuffer) {
      const buffer = context.createBuffer(1, Math.ceil(context.sampleRate * 0.12), context.sampleRate);
      const samples = buffer.getChannelData(0);
      for (let i = 0; i < samples.length; i += 1) samples[i] = Math.random() * 2 - 1;
      state.audio.footstepBuffer = buffer;
    }
    const source = context.createBufferSource();
    const filter = context.createBiquadFilter();
    const amp = context.createGain();
    source.buffer = state.audio.footstepBuffer;
    filter.type = "lowpass";
    filter.frequency.value = getTerrainInfo(node.x, node.y).biome === "mountain" ? 1100 : 650;
    const time = context.currentTime;
    amp.gain.setValueAtTime(0.32, time);
    amp.gain.exponentialRampToValueAtTime(0.001, time + 0.12);
    source.connect(filter); filter.connect(amp); amp.connect(state.audio.master);
    source.onended = () => { source.disconnect(); filter.disconnect(); amp.disconnect(); };
    source.start(time);
    source.stop(time + 0.12);
  }

  function playUiTone(freq, duration, gain) {
    if (!state.audio.initialized || state.audio.muted || state.audio.volume === 0 || state.audio.context.state !== "running") {
      return;
    }

    const context = state.audio.context;
    const osc = context.createOscillator();
    const amp = context.createGain();

    osc.type = "triangle";
    osc.frequency.value = freq;
    amp.gain.value = gain;

    osc.connect(amp);
    amp.connect(state.audio.master);

    const now = context.currentTime;
    amp.gain.setValueAtTime(gain, now);
    amp.gain.exponentialRampToValueAtTime(0.001, now + duration);
    osc.start(now);
    osc.stop(now + duration + 0.01);
    osc.onended = () => { osc.disconnect(); amp.disconnect(); };
  }

  function renderLoadError(error) {
    stopBirdsong();
    state.resume = null;
    document.body.classList.remove("game-ready");
    elements.returnToGame.disabled = true;
    state.path = [];
    state.currentStep = 0;
    state.visitedStageIds.clear();
    state.discoveredCompetencies.clear();
    state.foundEasterEggs.clear();
    state.blocksTraveled = 0;
    state.journeyCompleted = false;
    state.finalePending = false;
    state.finaleShown = false;
    window.clearTimeout(state.toastTimer);
    state.toastTimer = null;
    state.toastQueue = [];
    state.activeToast = null;
    elements.discoveryToast.classList.remove("is-visible");
    elements.discoveryToast.textContent = "";
    elements.revisitCheckpoint.disabled = true;
    window.clearInterval(state.entityTimer);
    window.clearInterval(state.dayNightTimer);
    state.entities = [];
    elements.mapGrid.replaceChildren();
    elements.entityLayer.replaceChildren();
    elements.lightLayer.replaceChildren();
    state.tileCache.clear();
    state.lightCache.clear();
    state.entityCache.clear();
    state.contentTiles.clear();
    state.dialogueCache.clear();
    elements.dialogueLayer.replaceChildren();
    elements.contentShortcut.hidden = true;
    elements.contentShortcutLabel.hidden = true;
    [elements.viewResume, elements.skipTour, elements.roleShortcut, elements.startJourney].forEach((control) => { control.disabled = true; });
    elements.downloadResume.removeAttribute("href");
    elements.downloadResume.setAttribute("aria-disabled", "true");
    elements.onboarding.classList.add("hidden");
    elements.appShell.inert = false;
    elements.loadStatus.hidden = false;
    elements.loadStatus.classList.add("is-error");
    elements.loadStatusTitle.textContent = "Unable to load resume";
    elements.loadStatusText.textContent = `${error && error.message ? error.message : "Loading failed."} Check that resume.json exists beside index.html, fix any reported data issue, then retry.`;
    elements.retryLoad.hidden = false;
    if (!elements.plainResume.contains(document.activeElement) && !state.readingDuringLoad) elements.retryLoad.focus();
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
