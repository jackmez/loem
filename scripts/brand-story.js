import { animate } from "motion";
import { createLightCursor } from "./shared/light-cursor.js";

const lightCursor = document.getElementById("lightCursor");
const scenes = Array.from(document.querySelectorAll("[data-scene]"));
const parallaxImages = Array.from(document.querySelectorAll("[data-parallax]"));
const collectionItems = Array.from(
  document.querySelectorAll(".collection-item"),
);
const overviewItems = Array.from(
  document.querySelectorAll(".brand-overview__item"),
);
const brandOverview = document.querySelector(".brand-overview");
const emWhiteVideo = document.getElementById("emWhiteVideo");
const emVideoSection = document.querySelector(".em-video-section");
const autoplayVideos = Array.from(
  document.querySelectorAll(".js-autoplay-video"),
);
const flowVideos = Array.from(document.querySelectorAll(".js-flow-video"));
const lightCursorController = createLightCursor(lightCursor);
const SCROLL_EASE = [0.16, 1, 0.3, 1];
const SCROLL_MOTION_DURATION = 0.46;
const SCROLL_TARGET_EPSILON = 0.5;
const scrollState = {
  y: window.scrollY || 0,
};
let scrollMotionAnimation = null;
let scrollMotionFrame = null;
let lastScrollTarget = scrollState.y;
let emVideoPlayedOnce = false;
let emWasInSection = false;
let emPlayPending = false;

function playEmVideoOnceWhenReady() {
  if (!emWhiteVideo || emVideoPlayedOnce || emPlayPending) return;
  emPlayPending = true;

  const doPlay = () => {
    emWhiteVideo.currentTime = 0;
    emWhiteVideo
      .play()
      .then(() => {
        emVideoPlayedOnce = true;
        emPlayPending = false;
      })
      .catch(() => {
        emPlayPending = false;
      });
  };

  if (emWhiteVideo.readyState >= 2) {
    doPlay();
  } else {
    const onReady = () => {
      emWhiteVideo.removeEventListener("loadeddata", onReady);
      doPlay();
    };
    emWhiteVideo.addEventListener("loadeddata", onReady, { once: true });
    emWhiteVideo.load();
  }
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}
function smoothstep(v) {
  const t = clamp(v, 0, 1);
  return t * t * (3 - 2 * t);
}

function getVirtualRect(element) {
  const rect = element.getBoundingClientRect();
  const scrollDelta = (window.scrollY || 0) - scrollState.y;
  return {
    top: rect.top + scrollDelta,
    bottom: rect.bottom + scrollDelta,
    height: rect.height,
  };
}

function animateScrollMotion() {
  const target = window.scrollY || 0;
  if (Math.abs(target - lastScrollTarget) < SCROLL_TARGET_EPSILON) return;

  lastScrollTarget = target;
  scrollMotionAnimation?.stop();
  scrollMotionAnimation = animate(
    scrollState,
    { y: target },
    {
      duration: SCROLL_MOTION_DURATION,
      ease: SCROLL_EASE,
    },
  );
}

function scheduleScrollMotion() {
  if (scrollMotionFrame !== null) return;
  scrollMotionFrame = requestAnimationFrame(() => {
    scrollMotionFrame = null;
    animateScrollMotion();
  });
}

function updateScenesAndParallax(now) {
  lightCursorController.render();

  const vh = window.innerHeight || 1;
  const t = now * 0.001;

  scenes.forEach((scene, sceneIndex) => {
    const rect = getVirtualRect(scene);
    const local = clamp((vh - rect.top) / (vh + rect.height), 0, 1);

    // Text arrives earlier than image.
    const textIn = smoothstep((local - 0.07) / 0.36);
    const textOut = smoothstep((local - 0.62) / 0.34);
    const textVisible = textIn * (1 - textOut);
    const textEntryStart = sceneIndex === 0 ? 320 : 220;
    const textY = (1 - textIn) * textEntryStart - textOut * 210;

    const imgIn = smoothstep((local - 0.18) / 0.38);
    const imgOut = smoothstep((local - 0.62) / 0.32);
    const imgVisible = imgIn * (1 - imgOut);
    const imgY = (1 - imgIn) * 300 - imgOut * 260;
    const flowVideoY = (0.5 - local) * 22;
    const flowVideoScale = 1.022 - Math.abs(local - 0.5) * 0.012;

    scene.style.setProperty("--text-y", `${textY.toFixed(2)}px`);
    scene.style.setProperty("--text-o", `${textVisible.toFixed(3)}`);
    scene.style.setProperty("--media-y", `${imgY.toFixed(2)}px`);
    scene.style.setProperty("--media-o", `${imgVisible.toFixed(3)}`);
    scene.style.setProperty("--scene-local", local.toFixed(3));
    scene.style.setProperty("--flow-video-y", `${flowVideoY.toFixed(2)}px`);
    scene.style.setProperty(
      "--flow-video-scale",
      flowVideoScale.toFixed(4),
    );
  });

  const collectionScene = document
    .querySelector(".collections")
    ?.closest("[data-scene]");
  if (collectionScene && collectionItems.length) {
    const rect = getVirtualRect(collectionScene);
    const local = clamp((vh - rect.top) / (vh + rect.height), 0, 1);
    const revealProgress = smoothstep((local - 0.02) / 0.54);

    collectionItems.forEach((item, index) => {
      const threshold =
        0.1 + (index / Math.max(1, collectionItems.length - 1)) * 0.24;
      const itemProgress = smoothstep((revealProgress - threshold) / 0.18);
      const itemY = (1 - itemProgress) * (42 + index * 4);
      item.style.setProperty("--collection-o", itemProgress.toFixed(3));
      item.style.setProperty("--collection-y", `${itemY.toFixed(2)}px`);
    });
  }

  if (overviewItems.length) {
    overviewItems.forEach((item, index) => {
      const rect = getVirtualRect(item);
      const local = clamp((vh - rect.top) / (vh + rect.height), 0, 1);
      const reveal = smoothstep((local - 0.02) / 0.28);
      const drift = (1 - reveal) * (index % 2 === 0 ? 26 : 34);
      item.style.setProperty("--overview-o", reveal.toFixed(3));
      item.style.setProperty("--overview-y", `${drift.toFixed(2)}px`);
    });
  }

  parallaxImages.forEach((img, idx) => {
    const depth = Number(img.dataset.parallax || 0.2);
    const isWhatWeDo = img.classList.contains("what-we-do__image-wrap");
    const isHeroLeft = img.classList.contains("hero-left");
    const isHeroCenter = img.classList.contains("hero-center");
    const isPhiloMain = img.classList.contains("philo-main");
    const isPhiloSide = img.classList.contains("philo-side");
    const rect = getVirtualRect(img);
    const centerY = rect.top + rect.height * 0.5;
    const centerOffset = (centerY - vh * 0.5) / vh;

    const moveBoost = isPhiloSide
      ? 2.8
      : isWhatWeDo
        ? 0.68
        : isPhiloMain
        ? 1.45
        : isHeroCenter
          ? 2.2
          : isHeroLeft
            ? 0.45
            : 1;
    const flowBoost = isPhiloSide
      ? 2.5
      : isWhatWeDo
        ? 0.55
        : isPhiloMain
        ? 1.35
        : isHeroCenter
          ? 2.4
          : isHeroLeft
            ? 0.4
            : 1;
    const xDir = isPhiloSide
      ? 1
      : isWhatWeDo
        ? -1
        : isPhiloMain
        ? -1
        : isHeroCenter
          ? 1
          : isHeroLeft
            ? -1
            : 1;

    const scrollShiftY = -centerOffset * depth * 130 * moveBoost;
    const mouseShiftX = 0;
    const mouseShiftY = 0;
    const flowX =
      Math.sin(t * 0.6 + idx * 1.37) * depth * 5.5 * flowBoost * xDir;
    const flowY = Math.cos(t * 0.73 + idx * 1.11) * depth * 7.5 * flowBoost;

    img.style.setProperty("--px", `${(mouseShiftX + flowX).toFixed(2)}px`);
    img.style.setProperty(
      "--py",
      `${(scrollShiftY + mouseShiftY + flowY).toFixed(2)}px`,
    );
  });

  if (emWhiteVideo && emVideoSection) {
    const rect = getVirtualRect(emVideoSection);
    const inSection = rect.top < vh * 0.72 && rect.bottom > vh * 0.28;

    // Same pattern as index: trigger only on section entry, play once.
    if (inSection && !emWasInSection && !emVideoPlayedOnce) {
      playEmVideoOnceWhenReady();
    }
    emWasInSection = inSection;
  }

  requestAnimationFrame(updateScenesAndParallax);
}

document.addEventListener("DOMContentLoaded", () => {
  requestAnimationFrame(() => document.body.classList.add("page-in"));
  scrollState.y = window.scrollY || 0;
  lastScrollTarget = scrollState.y;
  requestAnimationFrame(updateScenesAndParallax);

  if (emWhiteVideo) {
    emWhiteVideo.load();
    emWhiteVideo.pause();
    emWhiteVideo.currentTime = 0;
  }

  [...autoplayVideos, ...flowVideos].forEach((video) => {
    video.muted = true;
    video.defaultMuted = true;
    video.playsInline = true;
    video.loop = true;
    video.autoplay = true;
    video.load();
    const tryPlay = () => video.play().catch(() => {});
    video.addEventListener("canplay", tryPlay, { once: true });
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            tryPlay();
          } else {
            video.pause();
          }
        });
      },
      { threshold: 0.35 },
    );
    observer.observe(video);
  });
});

window.addEventListener("scroll", scheduleScrollMotion, { passive: true });
window.addEventListener(
  "resize",
  () => {
    scrollMotionAnimation?.stop();
    scrollState.y = window.scrollY || 0;
    lastScrollTarget = scrollState.y;
  },
  { passive: true },
);

document.querySelectorAll(".js-nav").forEach((link) => {
  link.addEventListener("click", (event) => {
    const href = link.getAttribute("href");
    if (!href) return;
    event.preventDefault();
    if (href === window.location.pathname) return;
    document.body.classList.add("page-out");
    setTimeout(() => {
      window.location.href = href;
    }, 520);
  });
});
