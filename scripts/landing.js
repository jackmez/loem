import { animate } from "motion";
import { createLightCursor } from "./shared/light-cursor.js";
import {
  BASE_IMAGE_PATHS,
  BG_MOTION_DURATION,
  BG_SCENES,
  CAMERA_WOBBLE_SPIN,
  CAMERA_WOBBLE_X_RATIO,
  CAMERA_WOBBLE_Y_RATIO,
  CARD_REVEAL_DURATION,
  CARD_SIZE_BOOST,
  CARD_TRANSITION_OPACITY_DROP,
  CARDS_PER_SECTION,
  CENTER_DEPTH,
  CENTER_SLIDE_DISTANCE_RATIO,
  CENTER_STEPS,
  CENTER_VIDEO_FALLBACK_PATH,
  CENTER_VIDEO_PATH,
  CORNER_BOOST_X_SOFT,
  CORNER_BOOST_X_STRONG,
  CORNER_BOOST_Y_SOFT,
  CORNER_BOOST_Y_STRONG,
  COS_TILT_X,
  HORIZONTAL_SPREAD,
  IDLE_DRIFT_DELAY,
  IDLE_DRIFT_RAMP_DURATION,
  IDLE_DRIFT_X_RATIO,
  IDLE_DRIFT_Y_RATIO,
  IDLE_START_DELTA,
  MOTION_TARGET_EPSILON,
  PHASE_PER_SECTION,
  PHI,
  SCROLL_EASE,
  SCROLL_MOTION_DURATION,
  SECTION_TITLES,
  SIN_TILT_X,
  TOTAL_TURNS,
  WORLD_RADIUS,
} from "./landing/config.js";
import {
  blendScene,
  clamp,
  paletteColor,
  smoothstep,
} from "./landing/utils.js";

const canvas = document.getElementById("c");
const lightCursor = document.getElementById("lightCursor");
const scrollSnap = document.getElementById("scrollSnap");
const topChrome = document.getElementById("topChrome");
const finalActions = document.getElementById("finalActions");
const loadingProgress = document.getElementById("loadingProgress");
const ctx = canvas.getContext("2d", { desynchronized: true });

function navigateWithDissolve(href) {
  if (href === window.location.pathname) return;
  document.body.classList.add("page-out");
  setTimeout(() => {
    window.location.href = href;
  }, 520);
}

// Keep section count in sync with titles.
scrollSnap.innerHTML = SECTION_TITLES.map(
  (title) => `<section class="snap-section" aria-label="${title}"></section>`,
).join("");

let W = 0;
let H = 0;
let cx = 0;
let cy = 0;
let scrollProgress = 0;
const scrollState = {
  renderProgress: 0,
  bgProgress: 0,
  currentSpin: 0,
};
let scrollMotionAnimation = null;
let backgroundMotionAnimation = null;
let scrollMotionFrame = null;
let lastMotionTarget = 0;
let idleTime = 0;
let initialAssetsLoaded = 0;
let initialAssetsTotal = 0;
const initialAssetPromises = [];
const cardRevealState = { progress: 0 };
let cardRevealAnimation = null;
let lastBackgroundProgress = null;
const cameraWobble = {
  targetX: 0,
  targetY: 0,
  x: 0,
  y: 0,
};

function updateDynamicBackground() {
  const sceneProgress = clamp(scrollState.bgProgress, 0, 1);
  if (
    lastBackgroundProgress !== null &&
    Math.abs(sceneProgress - lastBackgroundProgress) < 0.0005
  )
    return;
  lastBackgroundProgress = sceneProgress;

  const sceneFloat = sceneProgress * (BG_SCENES.length - 1);
  const fromIndex = clamp(Math.floor(sceneFloat), 0, BG_SCENES.length - 1);
  const toIndex = Math.min(fromIndex + 1, BG_SCENES.length - 1);
  const scene = blendScene(
    BG_SCENES[fromIndex],
    BG_SCENES[toIndex],
    smoothstep(sceneFloat - fromIndex),
  );

  document.body.style.background = [
    `radial-gradient(circle at ${scene.glowX.toFixed(2)}% ${scene.glowY.toFixed(2)}%, ${paletteColor(scene.glowBlend, scene.glowAlpha)} 0%, ${paletteColor(scene.glowBlend + 0.08, scene.glowAlpha * 0.5)} ${scene.glowSize.toFixed(2)}%, ${paletteColor(scene.glowBlend + 0.12, 0)} 74%)`,
    `linear-gradient(115deg, ${paletteColor(scene.leftEdge, 0.72)} 0%, ${paletteColor(scene.left, 0.72)} 18%, ${paletteColor(scene.center, 0.72)} 48%, ${paletteColor(scene.right, 0.72)} 78%, ${paletteColor(scene.rightEdge, 0.72)} 100%)`,
    `linear-gradient(90deg, ${paletteColor(scene.leftEdge)} 0%, ${paletteColor((scene.left + scene.center) * 0.5)} 36%, ${paletteColor((scene.center + scene.right) * 0.5)} 64%, ${paletteColor(scene.rightEdge)} 100%)`,
  ].join(", ");
}

function resize() {
  const dpr = window.devicePixelRatio || 1;
  W = window.innerWidth;
  H = window.innerHeight;
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  canvas.style.width = `${W}px`;
  canvas.style.height = `${H}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "medium";
  cx = W / 2;
  cy = H / 2;
}

function getScrollMax() {
  return Math.max(1, scrollSnap.scrollHeight - scrollSnap.clientHeight);
}

function updateScrollProgress() {
  scrollProgress = scrollSnap.scrollTop / getScrollMax();
}

function updateLoadingProgress() {
  if (!loadingProgress || initialAssetsTotal === 0) return;
  const progress = clamp(initialAssetsLoaded / initialAssetsTotal, 0, 1);
  loadingProgress.style.transform = `scaleX(${progress.toFixed(3)})`;
}

function trackInitialAsset(promise) {
  initialAssetsTotal += 1;
  updateLoadingProgress();
  const tracked = promise
    .catch(() => {})
    .finally(() => {
      initialAssetsLoaded += 1;
      updateLoadingProgress();
    });
  initialAssetPromises.push(tracked);
  return tracked;
}

function revealLandingWhenReady() {
  Promise.all(initialAssetPromises).finally(() => {
    document.body.classList.add("page-in");
    requestAnimationFrame(() => {
      document.body.classList.remove("page-loading");
      cardRevealAnimation?.stop();
      cardRevealState.progress = 0;
      cardRevealAnimation = animate(
        cardRevealState,
        { progress: 1 },
        {
          duration: CARD_REVEAL_DURATION,
          ease: SCROLL_EASE,
        },
      );
    });
  });
}

function syncScrollStateToProgress() {
  scrollMotionAnimation?.stop();
  backgroundMotionAnimation?.stop();
  scrollMotionFrame = null;
  lastMotionTarget = scrollProgress;
  scrollState.renderProgress = scrollProgress;
  scrollState.bgProgress = scrollProgress;
  scrollState.currentSpin = scrollProgress * Math.PI * 2 * TOTAL_TURNS;
}

function animateScrollStateToProgress() {
  if (Math.abs(scrollProgress - lastMotionTarget) < MOTION_TARGET_EPSILON)
    return;
  lastMotionTarget = scrollProgress;
  const targetSpin = scrollProgress * Math.PI * 2 * TOTAL_TURNS;

  scrollMotionAnimation?.stop();
  backgroundMotionAnimation?.stop();

  scrollMotionAnimation = animate(
    scrollState,
    {
      renderProgress: scrollProgress,
      currentSpin: targetSpin,
    },
    {
      duration: SCROLL_MOTION_DURATION,
      ease: SCROLL_EASE,
    },
  );

  backgroundMotionAnimation = animate(
    scrollState,
    { bgProgress: scrollProgress },
    {
      duration: BG_MOTION_DURATION,
      ease: SCROLL_EASE,
    },
  );
}

function scheduleScrollMotion() {
  if (scrollMotionFrame !== null) return;

  scrollMotionFrame = requestAnimationFrame(() => {
    scrollMotionFrame = null;
    animateScrollStateToProgress();
  });
}

function sectionPhase(index) {
  return index * PHASE_PER_SECTION;
}

function updateFinalActions(sectionFloat) {
  const threshold = SECTION_TITLES.length - 1.05;
  const inFinalZone = sectionFloat >= threshold;

  if (inFinalZone && !finalActionsReady) {
    if (finalActionsDelayConsumed) {
      finalActionsReady = true;
    } else if (!finalActionsDelayStarted) {
      finalActionsDelayStarted = true;
      finalActionsDelayTimer = setTimeout(() => {
        finalActionsReady = true;
        finalActionsDelayConsumed = true;
      }, 2000);
    }
  }

  if (!inFinalZone) {
    finalActionsReady = false;
    finalActionsDelayStarted = false;
    if (finalActionsDelayTimer) {
      clearTimeout(finalActionsDelayTimer);
      finalActionsDelayTimer = null;
    }
  }

  const isVisible = inFinalZone && finalActionsReady;
  finalActions.classList.toggle("is-visible", isVisible);
  finalActions.setAttribute("aria-hidden", isVisible ? "false" : "true");
}

function updateFinalActionsPosition() {
  // Keep CTA row anchored right under the final center logo.
  const targetH = clamp(H * 0.144, 54, 144);
  const y = cy + targetH / 2 + clamp(H * 0.055, 26, 56);
  finalActions.style.top = `${Math.round(y)}px`;
}

function updateTopChrome(sectionFloat) {
  const threshold = SECTION_TITLES.length - 1.05;
  const isHidden = sectionFloat >= threshold;
  topChrome.classList.toggle("is-hidden", isHidden);
  topChrome.setAttribute("aria-hidden", isHidden ? "true" : "false");
}

function createImageAsset(path) {
  const img = new Image();
  img.decoding = "async";
  img.loading = "eager";
  img.src = encodeURI(path);
  trackInitialAsset(
    img.decode
      ? img.decode()
      : new Promise((resolve) => {
          img.addEventListener("load", resolve, { once: true });
          img.addEventListener("error", resolve, { once: true });
        }),
  );
  return img;
}

const baseAssets = BASE_IMAGE_PATHS.map((path) => createImageAsset(path));
if (document.fonts?.ready) {
  trackInitialAsset(document.fonts.ready);
}
const centerVideoAsset = document.createElement("video");
centerVideoAsset.src = CENTER_VIDEO_PATH;
centerVideoAsset.muted = true;
centerVideoAsset.playsInline = true;
centerVideoAsset.preload = "auto";
centerVideoAsset.loop = false;
centerVideoAsset.addEventListener("error", () => {
  if (centerVideoAsset.src.includes(CENTER_VIDEO_FALLBACK_PATH)) return;
  centerVideoAsset.src = CENTER_VIDEO_FALLBACK_PATH;
  centerVideoAsset.load();
});

let wasInLastSection = false;
let centerVideoHasPlayedOnce = false;
let finalActionsReady = false;
let finalActionsDelayStarted = false;
let finalActionsDelayTimer = null;
let finalActionsDelayConsumed = false;
const videoKeyCanvas = document.createElement("canvas");
const videoKeyCtx = videoKeyCanvas.getContext("2d", {
  willReadFrequently: true,
});

const particles = Array.from({ length: CARDS_PER_SECTION }, (_, i) => {
  // Use midpoint sampling so first/last cards are not stuck on the poles.
  const y = 1 - ((i + 0.5) / CARDS_PER_SECTION) * 2;
  const r = Math.sqrt(Math.max(0, 1 - y * y));
  const theta = PHI * i;
  const baseW = 148 + (i % 4) * 16;
  const baseH = baseW * (1.25 + (i % 3) * 0.08);
  const edgeSeed = (i * 17 + 11) % 12;
  let orbitX = 1;
  let orbitY = 1;
  if (edgeSeed < 4) {
    orbitX = CORNER_BOOST_X_STRONG;
    orbitY = CORNER_BOOST_Y_STRONG;
  } else if (edgeSeed < 7) {
    orbitX = CORNER_BOOST_X_SOFT;
    orbitY = CORNER_BOOST_Y_SOFT;
  }
  return {
    x: r * Math.cos(theta),
    y: y * 0.66,
    z: r * Math.sin(theta),
    baseW,
    baseH,
    orbitX,
    orbitY,
    slot: i,
  };
});

const baseMediaOrder = (() => {
  const total = baseAssets.length;
  return Array.from({ length: CARDS_PER_SECTION }, (_, slot) => {
    const imageIndex = slot % total;
    return {
      img: baseAssets[imageIndex],
      assetPath: BASE_IMAGE_PATHS[imageIndex],
      flipX: slot % 3 === 0,
      flipY: slot % 5 === 0,
    };
  });
})();

function createSectionMedia() {
  const media = baseMediaOrder.map((item) => ({ ...item }));
  if (media[0]) {
    media[0] = {
      ...media[0],
      flipX: false,
      flipY: false,
    };
  }
  if (media[3]) {
    media[3] = {
      ...media[3],
      flipX: false,
      flipY: false,
    };
  }
  if (media[2]) {
    media[2] = {
      ...media[2],
      shiftXPx: -300,
    };
  }
  if (media[6]) {
    media[6] = {
      ...media[6],
      shiftXPx: 620,
      shiftYPx: -70,
    };
  }
  // Keep this one non-mirrored.
  media.forEach((entry, index) => {
    if (entry.assetPath && entry.assetPath.includes("Frame 2090055643.jpg")) {
      media[index] = {
        ...entry,
        flipX: false,
        flipY: false,
      };
    }
    if (
      entry.assetPath &&
      entry.assetPath.includes(
        "loreworld_1768413242_3810047991433109308_65923060496 9.jpg",
      )
    ) {
      media[index] = {
        ...entry,
        shiftXPx: (entry.shiftXPx || 0) + 180,
        shiftYPx: (entry.shiftYPx || 0) - 170,
      };
    }
  });
  return media;
}

const sectionMedia = SECTION_TITLES.map(() => createSectionMedia());

function drawCard(media, sx, sy, w, h, opacity, blur) {
  if (opacity < 0.01) return;
  ctx.save();
  ctx.globalAlpha = opacity;
  const cardBlur = media.disableBlur ? 0 : blur;
  if (cardBlur > 0.2) ctx.filter = `blur(${cardBlur.toFixed(2)}px)`;
  const hw = w / 2;
  const hh = h / 2;
  if (!media.transparentBg) {
    ctx.fillStyle = "#d9d2c8";
    ctx.fillRect(sx - hw, sy - hh, w, h);
  }
  ctx.save();
  ctx.beginPath();
  ctx.rect(sx - hw, sy - hh, w, h);
  ctx.clip();
  const img = media.img;
  const loaded = img && img.complete && img.naturalWidth > 0;
  if (loaded) {
    const s =
      media.fitMode === "contain"
        ? Math.min(w / img.naturalWidth, h / img.naturalHeight)
        : Math.max(w / img.naturalWidth, h / img.naturalHeight);
    const drawW = img.naturalWidth * s;
    const drawH = img.naturalHeight * s;

    if (media.flipX || media.flipY) {
      ctx.translate(sx, sy);
      ctx.scale(media.flipX ? -1 : 1, media.flipY ? -1 : 1);
      ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
    } else {
      ctx.drawImage(img, sx - drawW / 2, sy - drawH / 2, drawW, drawH);
    }
  } else {
    ctx.fillStyle = media.transparentBg ? "rgba(255,255,255,0.35)" : "#c8c1b6";
    ctx.fillRect(sx - hw, sy - hh, w, h);
    if (media.transparentBg) {
      ctx.strokeStyle = "rgba(0, 0, 0, 0.24)";
      ctx.lineWidth = 1;
      ctx.strokeRect(sx - hw, sy - hh, w, h);
    }
  }

  ctx.restore();
  ctx.restore();
}

function projectLayer(
  sectionIndex,
  spinRad,
  phaseOffset,
  layerAlpha,
  idleAmount,
) {
  const wobbleSpin = cameraWobble.x * CAMERA_WOBBLE_SPIN;
  const cosS = Math.cos(spinRad + phaseOffset + wobbleSpin);
  const sinS = Math.sin(spinRad + phaseOffset + wobbleSpin);
  const R = Math.min(W, H) * WORLD_RADIUS;
  const wobbleX = cameraWobble.x * clamp(W * CAMERA_WOBBLE_X_RATIO, 10, 34);
  const wobbleY = cameraWobble.y * clamp(H * CAMERA_WOBBLE_Y_RATIO, 8, 26);

  return particles.map((p) => {
    const rx = p.x * cosS - p.z * sinS;
    const ry = p.y;
    const rz = p.x * sinS + p.z * cosS;
    const fy = ry * COS_TILT_X - rz * SIN_TILT_X;
    const fz = ry * SIN_TILT_X + rz * COS_TILT_X;

    const rawSx = cx + rx * R * HORIZONTAL_SPREAD * p.orbitX;
    const rawSy = cy + fy * R * p.orbitY;
    const depth = (fz + 1) / 2;
    const media = sectionMedia[sectionIndex][p.slot];
    const shiftX = (media.shiftXRatio || 0) * W + (media.shiftXPx || 0);
    const shiftY = (media.shiftYRatio || 0) * H + (media.shiftYPx || 0);
    const mediaScale = media.scale || 1;
    const sizeF = (0.38 + depth * 0.95) * CARD_SIZE_BOOST;
    const w = p.baseW * sizeF * mediaScale;
    const h = p.baseH * sizeF * mediaScale;
    const slotSeed = p.slot * 0.91 + 0.37;
    const idleWaveX =
      Math.sin(idleTime * 0.36 + slotSeed) *
      clamp(W * IDLE_DRIFT_X_RATIO, 0.8, 3.2) *
      idleAmount;
    const idleWaveY =
      Math.cos(idleTime * 0.42 + slotSeed * 1.3) *
      clamp(H * IDLE_DRIFT_Y_RATIO, 0.8, 3.0) *
      idleAmount;
    const depthWobble = 0.38 + depth * 0.72;
    const sx = rawSx + shiftX + idleWaveX - wobbleX * depthWobble;
    const sy = rawSy + shiftY + idleWaveY - wobbleY * depthWobble;

    const boostedDepth = clamp(depth + (media.layerBoost || 0), 0, 1);
    const renderDepth = media.forceFront ? 2 + boostedDepth : boostedDepth;
    const nt = smoothstep(boostedDepth);
    const opacity = clamp((media.forceOpacity ?? 1) * layerAlpha, 0, 1);
    const blur = 0;

    return {
      sx,
      sy,
      w,
      h,
      depth: renderDepth,
      opacity,
      blur,
      media,
    };
  });
}

function onScroll() {
  updateScrollProgress();
  scheduleScrollMotion();
}

function onWheel() {
  requestAnimationFrame(() => {
    updateScrollProgress();
    scheduleScrollMotion();
  });
}

const lightCursorController = createLightCursor(lightCursor, {
  onRender(state) {
    cameraWobble.targetX = clamp((state.x - cx) / Math.max(1, W * 0.5), -1, 1);
    cameraWobble.targetY = clamp((state.y - cy) / Math.max(1, H * 0.5), -1, 1);
  },
});

function renderLightCursor() {
  lightCursorController.render();
  cameraWobble.x += (cameraWobble.targetX - cameraWobble.x) * 0.08;
  cameraWobble.y += (cameraWobble.targetY - cameraWobble.y) * 0.08;
}

document.querySelectorAll(".js-nav").forEach((link) => {
  link.addEventListener("click", (event) => {
    const href = link.getAttribute("href");
    if (!href) return;
    event.preventDefault();
    navigateWithDissolve(href);
  });
});

function buildCenteredLines(text, maxWidth) {
  const words = text.split(/\s+/);
  let line = "";
  const lines = [];
  for (let i = 0; i < words.length; i += 1) {
    const testLine = line ? `${line} ${words[i]}` : words[i];
    if (ctx.measureText(testLine).width > maxWidth && line) {
      lines.push(line);
      line = words[i];
    } else {
      line = testLine;
    }
  }
  if (line) {
    lines.push(line);
  }
  return lines;
}

function drawCenterStep(step, centerX, alpha) {
  if (!step || alpha < 0.01) return;
  ctx.save();
  ctx.globalAlpha = clamp(alpha, 0, 1);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "rgba(17, 17, 17, 0.98)";
  ctx.shadowColor = "rgba(0,0,0,0.08)";
  ctx.shadowBlur = 8;

  if (step.type === "video") {
    const video = centerVideoAsset;
    const loaded =
      video &&
      video.readyState >= 2 &&
      video.videoWidth > 0 &&
      video.videoHeight > 0;
    if (loaded) {
      const targetW = clamp(W * 0.32, 180, 460);
      const targetH = clamp(H * 0.22, 110, 320);
      const scale = Math.min(
        targetW / video.videoWidth,
        targetH / video.videoHeight,
      );
      const drawW = video.videoWidth * scale;
      const drawH = video.videoHeight * scale;
      // Key out near-white at display size to avoid processing full source frames.
      const keyW = Math.max(1, Math.round(drawW));
      const keyH = Math.max(1, Math.round(drawH));
      if (videoKeyCanvas.width !== keyW || videoKeyCanvas.height !== keyH) {
        videoKeyCanvas.width = keyW;
        videoKeyCanvas.height = keyH;
      }
      videoKeyCtx.clearRect(0, 0, keyW, keyH);
      videoKeyCtx.drawImage(video, 0, 0, keyW, keyH);
      const frame = videoKeyCtx.getImageData(0, 0, keyW, keyH);
      const px = frame.data;
      for (let i = 0; i < px.length; i += 4) {
        const r = px[i];
        const g = px[i + 1];
        const b = px[i + 2];
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const brightness = (r + g + b) / 3;
        const saturation = max - min;
        if (brightness > 225 && saturation < 36) {
          px[i + 3] = 0;
        } else if (brightness > 205 && saturation < 52) {
          const keep = clamp((225 - brightness) / 20, 0, 1);
          px[i + 3] = Math.round(px[i + 3] * keep);
        }
      }
      videoKeyCtx.putImageData(frame, 0, 0);
      ctx.drawImage(
        videoKeyCanvas,
        centerX - drawW / 2,
        cy - drawH / 2,
        drawW,
        drawH,
      );
    }
    ctx.restore();
    return;
  }

  const text = (step.text || "").trim();
  const fontSize = clamp(W * 0.0213, 16, 38);
  const lineHeight = Math.round(fontSize * 1.1);
  const maxWidth = clamp(W * 0.72, 320, 1060);
  ctx.font = `300 ${fontSize}px "Test Martina Plantijn", Georgia, "Times New Roman", serif`;
  const lines = buildCenteredLines(text, maxWidth);
  const startY = cy - ((lines.length - 1) * lineHeight) / 2;
  lines.forEach((line, idx) => {
    ctx.fillText(line, centerX, startY + idx * lineHeight);
  });
  ctx.restore();
}

function drawCenterTransition(currentIndex, nextIndex, mix) {
  const currentStep = CENTER_STEPS[currentIndex];
  const nextStep = CENTER_STEPS[nextIndex];
  const slideDistance = clamp(W * CENTER_SLIDE_DISTANCE_RATIO, 180, 460);
  const inShift = slideDistance * (1 - mix);
  const outShift = slideDistance * mix;
  const currentX = cx - outShift;
  const nextX = cx + inShift;

  drawCenterStep(currentStep, currentX, 1 - mix);
  if (nextIndex !== currentIndex) {
    drawCenterStep(nextStep, nextX, mix);
  }
}

function drawCenterStepper(sectionFloat) {
  const totalSteps = SECTION_TITLES.length;
  if (totalSteps <= 1) return;

  const progress = clamp(sectionFloat / (totalSteps - 1), 0, 1);
  const fadeOutStart = totalSteps - 1.15;
  const alpha =
    sectionFloat >= fadeOutStart
      ? clamp(
          (totalSteps - 1 - sectionFloat) / (totalSteps - 1 - fadeOutStart),
          0,
          1,
        )
      : 1;
  if (alpha <= 0.001) return;
  const trackW = clamp(W * 0.12, 110, 230);
  const trackH = 2;
  const x = cx - trackW / 2;
  const y = H - clamp(H * 0.085, 54, 92) - trackH;
  const fillW = Math.max(2, trackW * progress);
  const fillGradient = ctx.createLinearGradient(x, y, x + trackW, y);
  fillGradient.addColorStop(0, "#7886FA");
  fillGradient.addColorStop(1, "#27160F");

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = "rgba(39, 22, 15, 0.16)";
  ctx.fillRect(x, y, trackW, trackH);
  ctx.fillStyle = fillGradient;
  ctx.fillRect(x, y, fillW, trackH);
  ctx.restore();
}

function getFinalCardsExitProgress(sectionFloat) {
  const lastIndex = SECTION_TITLES.length - 1;
  const start = lastIndex - 0.9;
  const end = lastIndex;
  const t = clamp((sectionFloat - start) / Math.max(0.001, end - start), 0, 1);
  return smoothstep(t);
}

function updateCenterVideoPlayback(sectionFloat) {
  const lastIndex = SECTION_TITLES.length - 1;
  const arrivedLastSection = sectionFloat >= lastIndex - 0.02;

  if (arrivedLastSection && !wasInLastSection && !centerVideoHasPlayedOnce) {
    centerVideoAsset
      .play()
      .then(() => {
        centerVideoHasPlayedOnce = true;
      })
      .catch(() => {});
  }
  wasInLastSection = arrivedLastSection;
}

function applyFinalCardsExit(card, exitProgress) {
  if (exitProgress <= 0.001) return card;
  const dx = card.sx - cx;
  const dy = card.sy - cy;
  const outward = 0.06 + exitProgress * 0.1;
  const upLift = clamp(H * 0.03, 16, 34) * exitProgress;
  return {
    ...card,
    sx: card.sx + dx * outward * exitProgress,
    sy: card.sy + dy * outward * exitProgress - upLift,
    opacity: card.opacity * (1 - exitProgress),
    blur: exitProgress * 0.35,
  };
}

function renderCardForExit(card, exitProgress) {
  return exitProgress <= 0.001 ? card : applyFinalCardsExit(card, exitProgress);
}

function drawCardPass(cards, exitProgress, drawFront) {
  for (let i = 0; i < cards.length; i += 1) {
    const card = renderCardForExit(cards[i], exitProgress);
    const isFront = card.depth >= CENTER_DEPTH;
    if (isFront !== drawFront) continue;
    drawCard(
      card.media,
      card.sx,
      card.sy,
      card.w,
      card.h,
      card.opacity,
      card.blur,
    );
  }
}

let lastTime = performance.now();
function frame(now) {
  const dt = Math.min(now - lastTime, 50);
  lastTime = now;

  const renderProgress = scrollState.renderProgress;
  const currentSpin = scrollState.currentSpin;
  renderLightCursor();
  const settleDelta = Math.abs(scrollProgress - renderProgress);
  const isIdle = settleDelta < IDLE_START_DELTA;
  idleTime = isIdle ? idleTime + dt * 0.001 : 0;
  const idleRamp = clamp(
    (idleTime - IDLE_DRIFT_DELAY) / IDLE_DRIFT_RAMP_DURATION,
    0,
    1,
  );
  const idleAmount = isIdle ? smoothstep(idleRamp) : 0;

  const sectionFloat = renderProgress * (SECTION_TITLES.length - 1);
  const currentIndex = Math.floor(sectionFloat);
  const nextIndex = Math.min(currentIndex + 1, SECTION_TITLES.length - 1);
  const mix = smoothstep(sectionFloat - currentIndex);
  const transitionOpacity =
    1 -
    CARD_TRANSITION_OPACITY_DROP *
      Math.sin(Math.PI * clamp(sectionFloat - currentIndex, 0, 1));
  const cardLayerAlpha =
    smoothstep(cardRevealState.progress) * transitionOpacity;
  updateFinalActions(sectionFloat);
  updateFinalActionsPosition();
  updateTopChrome(sectionFloat);
  updateCenterVideoPlayback(sectionFloat);
  updateDynamicBackground();
  const phaseCurrent = sectionPhase(currentIndex);
  const phaseNext = sectionPhase(nextIndex);
  const blendedPhase = phaseCurrent + (phaseNext - phaseCurrent) * mix;
  const allCards = projectLayer(
    0,
    currentSpin,
    blendedPhase,
    cardLayerAlpha,
    idleAmount,
  ).sort((a, b) => a.depth - b.depth);
  const finalCardsExit = getFinalCardsExitProgress(sectionFloat);

  ctx.clearRect(0, 0, W, H);

  drawCardPass(allCards, finalCardsExit, false);

  drawCenterTransition(currentIndex, nextIndex, mix);
  drawCenterStepper(sectionFloat);

  drawCardPass(allCards, finalCardsExit, true);

  requestAnimationFrame(frame);
}

resize();
updateScrollProgress();
syncScrollStateToProgress();
scrollSnap.addEventListener("scroll", onScroll, { passive: true });
scrollSnap.addEventListener("wheel", onWheel, { passive: true });
window.addEventListener("resize", () => {
  resize();
  updateScrollProgress();
  syncScrollStateToProgress();
});
requestAnimationFrame(() => {
  updateScrollProgress();
  syncScrollStateToProgress();
});
revealLandingWhenReady();
requestAnimationFrame(frame);
