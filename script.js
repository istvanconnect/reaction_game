const INITIAL_READY_VIEW = Object.freeze({
  badge: "HOW TO PLAY",
  overline: "FIRST, GET READY",
  title: "Wait. Then react.",
  copy: "Click anywhere in this game panel or press Space to start. Wait for green, then react. An early response cancels the round.",
  action: "Start round",
  ariaLabel: "Game instructions. Click anywhere in this panel or press Space to start.",
  announcement: "Instructions: click anywhere in the game panel or press Space to start. Wait for green before reacting.",
  keyPrimary: "CLICK ANYWHERE",
  keySecondary: "SPACE TO START"
});

const STATES = Object.freeze({
  ready: {
    badge: "STANDBY",
    overline: "READY WHEN YOU ARE",
    title: "Ready for another round.",
    copy: "Click anywhere in this panel or press Space to start again. Wait for green before reacting.",
    action: "Start round",
    ariaLabel: "Ready. Click anywhere in this panel or press Space to start another round.",
    announcement: "Ready for another round.",
    keyPrimary: "CLICK PANEL",
    keySecondary: "SPACE TO START"
  },
  waiting: {
    badge: "WAITING",
    overline: "SIGNAL INCOMING",
    title: "Wait for green.",
    copy: "Stay still and stay ready. React only when the signal appears.",
    action: "Waiting for signal",
    ariaLabel: "Reaction area. Wait for green. Do not react yet.",
    announcement: "Waiting for green. Do not react yet.",
    keyPrimary: "CLICK / TAP",
    keySecondary: "SPACE"
  },
  active: {
    badge: "SIGNAL LIVE",
    overline: "REACT NOW",
    title: "GO!",
    copy: "Click, tap, or press Space now.",
    action: "Signal is live",
    ariaLabel: "Green signal active. Click, tap, or press Space now.",
    announcement: "Green signal. React now.",
    keyPrimary: "CLICK / TAP",
    keySecondary: "SPACE"
  },
  falseStart: {
    badge: "FALSE START",
    overline: "FALSE START DETECTED",
    title: "Too soon! Try again.",
    copy: "That attempt doesn't count. Reset your focus and wait for green.",
    action: "Try again",
    ariaLabel: "False start. That attempt was cancelled. Click the panel or press Space to try again.",
    announcement: "Too soon. This attempt was cancelled. Click the panel or press Space to try again.",
    keyPrimary: "CLICK PANEL",
    keySecondary: "SPACE TO RETRY"
  },
  result: {
    badge: "RECORDED",
    overline: "YOUR REACTION TIME",
    title: "Reaction captured.",
    copy: "A clean response. Play again to try for a new session best.",
    action: "Play again",
    ariaLabel: "Last reaction result. Click the panel or press Space to play again.",
    announcement: "Reaction recorded.",
    keyPrimary: "CLICK PANEL",
    keySecondary: "SPACE TO REPLAY"
  }
});

const REACTION_RATINGS = Object.freeze([
  { key: "amazing", label: "Amazing", range: "< 150 ms", max: 149, description: "Exceptional speed for a visual cue." },
  { key: "veryGood", label: "Very good", range: "150–199 ms", max: 199, description: "Faster than typical visual responses." },
  { key: "good", label: "Good", range: "200–249 ms", max: 249, description: "A quick, solid response." },
  { key: "average", label: "Average", range: "250–350 ms", max: 350, description: "Around the common range for visual tests." },
  { key: "belowAverage", label: "Below average", range: "> 350 ms", max: Infinity, description: "Slower than typical; practice and focus can help." }
]);

const STATE_COLORS = Object.freeze({
  ready: 0x60a5fa,
  waiting: 0xf87171,
  active: 0x86efac,
  result: 0x60a5fa,
  falseStart: 0xf87171
});

const BEST_STORAGE_KEY = "reflex.best.v1";
const MIN_WAIT_MS = 1500;
const MAX_WAIT_MS = 4000;

const gamePanel = document.querySelector("#gamePanel");
const sceneCanvas = document.querySelector("#sceneCanvas");
const reactionArea = document.querySelector("#reactionArea");
const primaryAction = document.querySelector("#primaryAction");
const primaryActionLabel = document.querySelector("#primaryActionLabel");
const stateBadgeText = document.querySelector("#stateBadgeText");
const roundNumber = document.querySelector("#roundNumber");
const stageOverline = document.querySelector("#stageOverline");
const stageTitle = document.querySelector("#stageTitle");
const scoreRating = document.querySelector("#scoreRating");
const stageCopy = document.querySelector("#stageCopy");
const stageKeys = document.querySelector("#stageKeys");
const keyHintPrimary = document.querySelector("#keyHintPrimary");
const keyHintSecondary = document.querySelector("#keyHintSecondary");
const ratingGuide = document.querySelector("#ratingGuide");
const ratingItems = [...document.querySelectorAll(".rating-item")];
const sessionBestValue = document.querySelector("#sessionBestValue");
const bestSubtitle = document.querySelector("#bestSubtitle");
const liveStatus = document.querySelector("#liveStatus");

let gameState = "ready";
let hasStartedOnce = false;
let roundTimeoutId = null;
let roundToken = 0;
let roundCount = 0;
let signalStartedAt = null;
let latestResultMs = null;
let sessionBestMs = readSessionBest();
let sceneRuntime = null;
let sceneGeneration = 0;
let preferredReducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)") ?? { matches: false };

renderBestScore();
renderGameState("ready", { announce: false });
initializeScene();

primaryAction.addEventListener("click", (event) => {
  // Keep this separate from the panel-wide click handler so a button click starts only one round.
  event.stopPropagation();
  if (!["ready", "falseStart", "result"].includes(gameState)) return;
  startRound();
  reactionArea.focus({ preventScroll: true });
});

// The whole game panel is the interaction surface. Before a round it starts/restarts;
// during waiting it detects a false start; on green it records the first reaction.
gamePanel.addEventListener("click", (event) => {
  if (event.target instanceof Element && event.target.closest("#primaryAction")) return;

  if (["ready", "falseStart", "result"].includes(gameState)) {
    startRound();
    reactionArea.focus({ preventScroll: true });
    return;
  }

  handleReactionInput();
});

document.addEventListener("keydown", (event) => {
  if (event.repeat || (event.code !== "Space" && event.code !== "Enter")) return;

  const target = event.target;
  // Let enabled controls use their native keyboard activation. If a button is disabled
  // during a live round, the global shortcut can still register Space/Enter as an input.
  const enabledInteractiveTarget = target instanceof Element
    && target.closest("button:not(:disabled), a, input, textarea, select, [contenteditable='true']");
  if (enabledInteractiveTarget) return;

  if (["ready", "falseStart", "result"].includes(gameState)) {
    event.preventDefault();
    // Do not move focus during Space keydown: that could turn the same keypress
    // into a synthetic button click on keyup in some browsers.
    startRound();
    return;
  }

  if (gameState === "waiting" || gameState === "active") {
    event.preventDefault();
    handleReactionInput();
  }
});

function startRound() {
  hasStartedOnce = true;
  cancelPendingRound();
  roundToken += 1;
  const thisRoundToken = roundToken;

  signalStartedAt = null;
  latestResultMs = null;
  renderBestScore();
  roundCount += 1;
  roundNumber.textContent = String(roundCount).padStart(2, "0");
  renderGameState("waiting");

  // The random delay is deliberately not displayed as a countdown.
  const waitDuration = MIN_WAIT_MS + Math.random() * (MAX_WAIT_MS - MIN_WAIT_MS);
  roundTimeoutId = window.setTimeout(() => {
    activateSignal(thisRoundToken);
  }, waitDuration);
}

function activateSignal(thisRoundToken) {
  if (thisRoundToken !== roundToken || gameState !== "waiting") return;

  roundTimeoutId = null;
  // This timestamp is the logical signal onset. Rendering and animation do not affect it.
  signalStartedAt = performance.now();
  renderGameState("active");
}

function handleReactionInput() {
  if (gameState === "waiting") {
    recordFalseStart();
    return;
  }

  if (gameState !== "active" || signalStartedAt === null) return;

  // Capture the first valid input timestamp before updating any UI or scene state.
  const reactedAt = performance.now();
  const measuredMs = Math.max(0, Math.round(reactedAt - signalStartedAt));

  cancelPendingRound();
  roundToken += 1;
  signalStartedAt = null;
  latestResultMs = measuredMs;

  const isNewBest = sessionBestMs === null || measuredMs < sessionBestMs;
  if (isNewBest) {
    sessionBestMs = measuredMs;
    writeSessionBest(sessionBestMs);
  }

  renderBestScore();
  renderGameState("result");
  const rating = getReactionRating(measuredMs);
  stageTitle.textContent = `${measuredMs} ms`;
  stageCopy.textContent = isNewBest
    ? `New session best. ${rating.description}`
    : rating.description;
  bestSubtitle.textContent = isNewBest ? "New personal session best" : "Your fastest valid response";
  liveStatus.textContent = isNewBest
    ? `Reaction time ${measuredMs} milliseconds. Rating: ${rating.label}. New session best.`
    : `Reaction time ${measuredMs} milliseconds. Rating: ${rating.label}.`;
}

function recordFalseStart() {
  if (gameState !== "waiting") return;

  cancelPendingRound();
  roundToken += 1;
  signalStartedAt = null;
  latestResultMs = null;
  renderGameState("falseStart");
}

function cancelPendingRound() {
  if (roundTimeoutId !== null) {
    window.clearTimeout(roundTimeoutId);
    roundTimeoutId = null;
  }
}

function renderGameState(nextState, options = {}) {
  const { announce = true } = options;
  if (!Object.hasOwn(STATES, nextState)) return;

  gameState = nextState;
  const view = nextState === "ready" && !hasStartedOnce ? INITIAL_READY_VIEW : STATES[nextState];

  gamePanel.dataset.state = nextState;
  stateBadgeText.textContent = view.badge;
  stageOverline.textContent = view.overline;
  stageTitle.textContent = nextState === "result" && latestResultMs !== null
    ? `${latestResultMs} ms`
    : view.title;
  stageCopy.textContent = view.copy;
  reactionArea.setAttribute("aria-label", view.ariaLabel);
  primaryActionLabel.textContent = view.action;
  primaryAction.disabled = nextState === "waiting" || nextState === "active";
  stageKeys.hidden = hasStartedOnce;
  keyHintPrimary.textContent = view.keyPrimary;
  keyHintSecondary.textContent = view.keySecondary;
  ratingGuide.hidden = nextState !== "result" || latestResultMs === null;
  scoreRating.hidden = nextState !== "result" || latestResultMs === null;
  if (nextState === "result" && latestResultMs !== null) {
    scoreRating.textContent = getReactionRating(latestResultMs).label.toUpperCase();
  } else {
    scoreRating.textContent = "";
  }
  ratingItems.forEach((item) => {
    const isCurrent = nextState === "result" && latestResultMs !== null && item.dataset.rating === getReactionRating(latestResultMs).key;
    item.classList.toggle("is-current", isCurrent);
    if (isCurrent) item.setAttribute("aria-current", "true");
    else item.removeAttribute("aria-current");
  });

  if (announce) liveStatus.textContent = view.announcement;
  setSceneState(nextState);
}

function getReactionRating(milliseconds) {
  return REACTION_RATINGS.find((rating) => milliseconds <= rating.max) ?? REACTION_RATINGS[REACTION_RATINGS.length - 1];
}

function renderBestScore() {
  sessionBestValue.textContent = sessionBestMs === null ? "—" : String(sessionBestMs);
  bestSubtitle.textContent = sessionBestMs === null
    ? "Your fastest valid response"
    : "Fastest valid response this session";
}

function readSessionBest() {
  try {
    const stored = window.sessionStorage.getItem(BEST_STORAGE_KEY);
    if (stored === null) return null;
    const parsed = Number(stored);
    return Number.isFinite(parsed) && parsed >= 0 && parsed <= 60000 ? parsed : null;
  } catch {
    // Storage can be blocked by browser privacy settings; gameplay still works without it.
    return null;
  }
}

function writeSessionBest(value) {
  try {
    window.sessionStorage.setItem(BEST_STORAGE_KEY, String(value));
  } catch {
    // Best-score persistence is optional; the in-memory value remains available for this page.
  }
}

function setSceneState(nextState) {
  if (!sceneRuntime) return;

  const colorHex = STATE_COLORS[nextState] ?? STATE_COLORS.ready;
  sceneRuntime.targetColor.setHex(colorHex);
  sceneRuntime.targetRingColors = sceneRuntime.ringMaterials.map((_, index) => {
    const target = new sceneRuntime.THREE.Color(colorHex);
    return target.lerp(new sceneRuntime.THREE.Color(0xffffff), index === 0 ? 0.42 : index === 1 ? 0.2 : 0.04);
  });
  sceneRuntime.state = nextState;
  sceneRuntime.pulseStartedAt = nextState === "active" ? performance.now() : null;

  if (preferredReducedMotion.matches || document.hidden) {
    renderStaticScene();
  }
}

async function initializeScene() {
  const generationAtStart = ++sceneGeneration;

  try {
    // Dynamic import is intentional: if the CDN or WebGL fails, gameplay code above remains active.
    const THREE = await import("three");
    if (generationAtStart !== sceneGeneration) return;

    const renderer = new THREE.WebGLRenderer({
      canvas: sceneCanvas,
      alpha: true,
      antialias: true,
      powerPreference: "low-power"
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    renderer.setClearColor(0x0b1020, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.95;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
    camera.position.set(0, 0, 7.2);

    const ambientLight = new THREE.AmbientLight(0x8ba7d0, 1.35);
    scene.add(ambientLight);

    const keyLight = new THREE.PointLight(0x60a5fa, 12, 18, 2);
    keyLight.position.set(-2.5, 2.8, 4.2);
    scene.add(keyLight);

    const rimLight = new THREE.PointLight(0x31568e, 8, 15, 2);
    rimLight.position.set(2.7, -1.9, -2.2);
    scene.add(rimLight);

    const coreGroup = new THREE.Group();
    coreGroup.position.set(0, 0.02, 0);
    scene.add(coreGroup);

    const coreMaterial = new THREE.MeshStandardMaterial({
      color: STATE_COLORS.ready,
      emissive: STATE_COLORS.ready,
      emissiveIntensity: 0.34,
      metalness: 0.55,
      roughness: 0.27
    });
    const coreMesh = new THREE.Mesh(new THREE.IcosahedronGeometry(0.77, 2), coreMaterial);
    coreGroup.add(coreMesh);

    const shellMaterial = new THREE.MeshBasicMaterial({
      color: STATE_COLORS.ready,
      wireframe: true,
      transparent: true,
      opacity: 0.13,
      depthWrite: false
    });
    const shellMesh = new THREE.Mesh(new THREE.IcosahedronGeometry(0.94, 1), shellMaterial);
    coreGroup.add(shellMesh);

    const ringGroup = new THREE.Group();
    ringGroup.rotation.set(0.25, 0.08, -0.18);
    coreGroup.add(ringGroup);

    const ringMaterials = [
      new THREE.MeshStandardMaterial({ color: 0x9ecbff, emissive: 0x376da9, emissiveIntensity: 0.38, metalness: 0.5, roughness: 0.3 }),
      new THREE.MeshStandardMaterial({ color: 0x77a9e8, emissive: 0x234a80, emissiveIntensity: 0.32, metalness: 0.58, roughness: 0.34 }),
      new THREE.MeshStandardMaterial({ color: 0xaac8f4, emissive: 0x305b91, emissiveIntensity: 0.25, metalness: 0.38, roughness: 0.4 })
    ];
    const ringSpecs = [
      { radius: 1.18, tube: 0.018, rotation: [1.12, 0.16, 0.28], speed: 0.13 },
      { radius: 1.42, tube: 0.012, rotation: [0.28, 1.05, -0.35], speed: -0.09 },
      { radius: 1.62, tube: 0.008, rotation: [1.47, 0.72, 0.42], speed: 0.06 }
    ];
    const ringMeshes = ringSpecs.map((spec, index) => {
      const mesh = new THREE.Mesh(new THREE.TorusGeometry(spec.radius, spec.tube, 8, 96), ringMaterials[index]);
      mesh.rotation.set(...spec.rotation);
      mesh.userData.rotationSpeed = spec.speed;
      ringGroup.add(mesh);
      return mesh;
    });

    const satelliteGroup = new THREE.Group();
    coreGroup.add(satelliteGroup);
    const satelliteMaterials = [
      new THREE.MeshStandardMaterial({ color: 0xb4d4ff, emissive: 0x27476f, emissiveIntensity: 0.24, metalness: 0.45, roughness: 0.32 }),
      new THREE.MeshStandardMaterial({ color: 0x7198cb, emissive: 0x203d66, emissiveIntensity: 0.2, metalness: 0.5, roughness: 0.38 })
    ];
    const satelliteSpecs = [
      { x: -1.82, y: 0.9, z: 0.12, size: 0.12, type: "octa" },
      { x: 1.86, y: 0.62, z: -0.32, size: 0.09, type: "sphere" },
      { x: 1.45, y: -1.1, z: 0.3, size: 0.13, type: "octa" },
      { x: -1.5, y: -1.05, z: -0.45, size: 0.075, type: "sphere" },
      { x: 0.2, y: 1.8, z: -0.15, size: 0.075, type: "octa" }
    ];
    const satellites = satelliteSpecs.map((spec, index) => {
      const geometry = spec.type === "octa"
        ? new THREE.OctahedronGeometry(spec.size, 0)
        : new THREE.SphereGeometry(spec.size, 12, 10);
      const mesh = new THREE.Mesh(geometry, satelliteMaterials[index % satelliteMaterials.length]);
      mesh.position.set(spec.x, spec.y, spec.z);
      mesh.userData = {
        baseX: spec.x,
        baseY: spec.y,
        baseZ: spec.z,
        phase: index * 1.27,
        rotationSpeed: 0.14 + index * 0.035
      };
      satelliteGroup.add(mesh);
      return mesh;
    });

    sceneRuntime = {
      THREE,
      renderer,
      scene,
      camera,
      keyLight,
      rimLight,
      coreGroup,
      coreMaterial,
      shellMaterial,
      ringGroup,
      ringMeshes,
      ringMaterials,
      satellites,
      satelliteMaterials,
      targetColor: new THREE.Color(STATE_COLORS[gameState] ?? STATE_COLORS.ready),
      targetRingColors: ringMaterials.map((material) => material.color.clone()),
      state: gameState,
      pulseStartedAt: null,
      lastFrameAt: 0,
      frameId: null,
      resizeObserver: null,
      handleResize: null
    };

    const handleResize = () => resizeScene();
    sceneRuntime.handleResize = handleResize;
    window.addEventListener("resize", handleResize, { passive: true });
    if ("ResizeObserver" in window) {
      sceneRuntime.resizeObserver = new ResizeObserver(handleResize);
      sceneRuntime.resizeObserver.observe(gamePanel);
    }

    sceneCanvas.addEventListener("webglcontextlost", onWebGLContextLost, false);
    gamePanel.classList.remove("scene-fallback");
    resizeScene();
    setSceneState(gameState);
    startSceneLoop();
  } catch (error) {
    if (generationAtStart !== sceneGeneration) return;
    gamePanel.classList.add("scene-fallback");
    console.warn("REFLEX 3D scene unavailable. The reaction timer is still ready to play.", error);
  }
}

function resizeScene() {
  if (!sceneRuntime) return;

  const bounds = gamePanel.getBoundingClientRect();
  const width = Math.max(1, Math.round(bounds.width));
  const height = Math.max(1, Math.round(bounds.height));

  sceneRuntime.camera.aspect = width / height;
  sceneRuntime.camera.updateProjectionMatrix();
  sceneRuntime.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  sceneRuntime.renderer.setSize(width, height, false);

  if (preferredReducedMotion.matches || document.hidden) renderStaticScene();
}

function startSceneLoop() {
  if (!sceneRuntime || sceneRuntime.contextLost || document.hidden || preferredReducedMotion.matches || sceneRuntime.frameId !== null) return;
  sceneRuntime.lastFrameAt = performance.now();
  sceneRuntime.frameId = window.requestAnimationFrame(animateScene);
}

function stopSceneLoop() {
  if (!sceneRuntime || sceneRuntime.frameId === null) return;
  window.cancelAnimationFrame(sceneRuntime.frameId);
  sceneRuntime.frameId = null;
}

function animateScene(now) {
  if (!sceneRuntime || document.hidden || preferredReducedMotion.matches) {
    if (sceneRuntime) sceneRuntime.frameId = null;
    return;
  }

  const runtime = sceneRuntime;
  runtime.frameId = window.requestAnimationFrame(animateScene);
  const delta = Math.min(Math.max((now - runtime.lastFrameAt) / 1000, 0), 0.05);
  runtime.lastFrameAt = now;

  runtime.coreGroup.rotation.y += delta * 0.16;
  runtime.coreGroup.rotation.x += delta * 0.055;
  runtime.ringGroup.rotation.y += delta * 0.035;

  for (const ring of runtime.ringMeshes) {
    ring.rotation.z += delta * ring.userData.rotationSpeed;
  }
  for (const satellite of runtime.satellites) {
    const data = satellite.userData;
    satellite.rotation.x += delta * data.rotationSpeed;
    satellite.rotation.y += delta * data.rotationSpeed * 0.8;
    satellite.position.y = data.baseY + Math.sin(now * 0.00048 + data.phase) * 0.055;
  }

  applySceneColors(1 - Math.exp(-delta * 3.2));

  if (runtime.state === "active" && runtime.pulseStartedAt !== null) {
    const elapsed = now - runtime.pulseStartedAt;
    const pulse = elapsed < 640 ? 1 + Math.sin((elapsed / 640) * Math.PI) * 0.045 : 1;
    runtime.coreGroup.scale.setScalar(pulse);
  } else {
    runtime.coreGroup.scale.lerp(new runtime.THREE.Vector3(1, 1, 1), 1 - Math.exp(-delta * 4));
  }

  runtime.renderer.render(runtime.scene, runtime.camera);
}

function applySceneColors(lerpAmount) {
  if (!sceneRuntime) return;
  const runtime = sceneRuntime;
  runtime.coreMaterial.color.lerp(runtime.targetColor, lerpAmount);
  runtime.coreMaterial.emissive.lerp(runtime.targetColor, lerpAmount);
  runtime.shellMaterial.color.lerp(runtime.targetColor, lerpAmount);
  runtime.keyLight.color.lerp(runtime.targetColor, lerpAmount);
  runtime.rimLight.color.lerp(runtime.targetColor, lerpAmount * 0.55);
  runtime.ringMaterials.forEach((material, index) => {
    material.color.lerp(runtime.targetRingColors[index], lerpAmount);
    material.emissive.lerp(runtime.targetRingColors[index], lerpAmount * 0.5);
  });
  const emissiveTarget = runtime.state === "active" ? 0.72 : runtime.state === "waiting" || runtime.state === "falseStart" ? 0.46 : 0.32;
  runtime.coreMaterial.emissiveIntensity += (emissiveTarget - runtime.coreMaterial.emissiveIntensity) * lerpAmount;
}

function renderStaticScene() {
  if (!sceneRuntime || document.hidden) return;
  applySceneColors(1);
  sceneRuntime.renderer.render(sceneRuntime.scene, sceneRuntime.camera);
}

function onMotionPreferenceChange() {
  if (preferredReducedMotion.matches) {
    stopSceneLoop();
    if (sceneRuntime) {
      sceneRuntime.coreGroup.rotation.set(0, 0, 0);
      sceneRuntime.ringGroup.rotation.set(0.25, 0.08, -0.18);
      sceneRuntime.ringMeshes.forEach((ring, index) => {
        const rotations = [
          [1.12, 0.16, 0.28],
          [0.28, 1.05, -0.35],
          [1.47, 0.72, 0.42]
        ];
        ring.rotation.set(...rotations[index]);
      });
      sceneRuntime.satellites.forEach((satellite) => {
        satellite.position.set(satellite.userData.baseX, satellite.userData.baseY, satellite.userData.baseZ);
      });
      sceneRuntime.coreGroup.scale.setScalar(1);
    }
    renderStaticScene();
  } else {
    startSceneLoop();
  }
}

function onWebGLContextLost(event) {
  event.preventDefault();
  if (sceneRuntime) sceneRuntime.contextLost = true;
  gamePanel.classList.add("scene-fallback");
  stopSceneLoop();
  console.warn("REFLEX WebGL context was lost. Falling back to CSS visuals.");
}

function disposeScene() {
  sceneGeneration += 1;
  if (!sceneRuntime) return;

  const runtime = sceneRuntime;
  stopSceneLoop();
  runtime.resizeObserver?.disconnect();
  if (runtime.handleResize) window.removeEventListener("resize", runtime.handleResize);
  sceneCanvas.removeEventListener("webglcontextlost", onWebGLContextLost, false);

  runtime.scene.traverse((object) => {
    if (object.geometry) object.geometry.dispose();
    if (object.material) {
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      materials.forEach((material) => material.dispose());
    }
  });
  runtime.renderer.dispose();
  sceneRuntime = null;
  gamePanel.classList.add("scene-fallback");
}

document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    stopSceneLoop();
    // Don't let a signal become active while the user cannot see it in a background tab.
    if (gameState === "waiting" || gameState === "active") {
      cancelPendingRound();
      roundToken += 1;
      signalStartedAt = null;
      latestResultMs = null;
      renderGameState("ready");
      stageCopy.textContent = "Round paused because the tab was hidden. Start again when you're ready.";
      liveStatus.textContent = "Round paused because the tab was hidden. Press Start round to begin again.";
    }
  } else {
    if (preferredReducedMotion.matches) renderStaticScene();
    else startSceneLoop();
  }
});

if (typeof preferredReducedMotion.addEventListener === "function") {
  preferredReducedMotion.addEventListener("change", onMotionPreferenceChange);
} else if (typeof preferredReducedMotion.addListener === "function") {
  preferredReducedMotion.addListener(onMotionPreferenceChange);
}

window.addEventListener("pagehide", disposeScene);
window.addEventListener("pageshow", (event) => {
  if (event.persisted) initializeScene();
});
