import * as Model from "./catalog-model.js";

const DESKTOP_QUERY = "(min-width: 1024px)";
const SWIPE_THRESHOLD = 50;

const app = document.getElementById("app");

const state = {
  catalog: null,
  currentIndex: 0,
  isDesktop: window.matchMedia(DESKTOP_QUERY).matches,
};

async function init() {
  try {
    const res = await fetch("catalogo.json", { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    state.catalog = await res.json();
  } catch (err) {
    renderError(err);
    return;
  }

  document.documentElement.style.setProperty(
    "--catalog-gradient",
    Model.buildBackgroundStyle(state.catalog.global)
  );

  buildShell();
  renderCurrent();

  window.matchMedia(DESKTOP_QUERY).addEventListener("change", (e) => {
    state.isDesktop = e.matches;
    state.currentIndex = state.isDesktop
      ? state.currentIndex - (state.currentIndex % 2)
      : state.currentIndex;
    applyModeClass();
    renderCurrent();
  });

  window.addEventListener("keydown", (e) => {
    if (e.key === "ArrowRight") goTo(state.currentIndex + getStep());
    if (e.key === "ArrowLeft") goTo(state.currentIndex - getStep());
  });
}

function renderError(err) {
  app.innerHTML = `<p class="viewer-error">No se pudo cargar el catálogo (catalogo.json).<br>Servilo desde un servidor local (ej. "npx serve .") y volvé a intentar.<br><small>${err.message}</small></p>`;
}

let frameEl;
let prevBtn;
let nextBtn;

function buildShell() {
  app.innerHTML = "";
  applyModeClass();

  frameEl = document.createElement("div");
  frameEl.className = "viewer-frame";
  app.appendChild(frameEl);

  const nav = document.createElement("div");
  nav.className = "viewer-nav";

  prevBtn = document.createElement("button");
  prevBtn.type = "button";
  prevBtn.textContent = "←";
  prevBtn.setAttribute("aria-label", "Página anterior");
  prevBtn.addEventListener("click", () => goTo(state.currentIndex - getStep()));

  nextBtn = document.createElement("button");
  nextBtn.type = "button";
  nextBtn.textContent = "→";
  nextBtn.setAttribute("aria-label", "Página siguiente");
  nextBtn.addEventListener("click", () => goTo(state.currentIndex + getStep()));

  nav.append(prevBtn, nextBtn);
  app.appendChild(nav);

  let touchStartX = null;
  app.addEventListener("touchstart", (e) => {
    touchStartX = e.changedTouches[0].clientX;
  });
  app.addEventListener("touchend", (e) => {
    if (touchStartX === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX;
    if (dx > SWIPE_THRESHOLD) goTo(state.currentIndex - getStep());
    else if (dx < -SWIPE_THRESHOLD) goTo(state.currentIndex + getStep());
    touchStartX = null;
  });
}

function applyModeClass() {
  app.classList.remove("mode-desktop", "mode-mobile");
  app.classList.add(state.isDesktop ? "mode-desktop" : "mode-mobile");
}

function getStep() {
  return state.isDesktop ? 2 : 1;
}

function getTotalPages() {
  return state.catalog.pages.length;
}

function clampIndex(index) {
  const total = getTotalPages();
  const step = getStep();
  if (index < 0) return 0;
  const lastValidStart = step === 2 ? total - (total % 2 === 0 ? 2 : 1) : total - 1;
  return Math.min(index, Math.max(0, lastValidStart));
}

function renderCurrent() {
  frameEl.innerHTML = "";
  const total = getTotalPages();
  const step = getStep();
  for (let i = state.currentIndex; i < Math.min(state.currentIndex + step, total); i++) {
    const page = state.catalog.pages[i];
    frameEl.appendChild(Model.renderPage(page, state.catalog.global, total, "viewer"));
  }
  prevBtn.disabled = state.currentIndex <= 0;
  nextBtn.disabled = state.currentIndex + step >= total;
}

function goTo(newIndex) {
  const clamped = clampIndex(newIndex);
  if (clamped === state.currentIndex) return;
  frameEl.classList.add("is-leaving");
  setTimeout(() => {
    state.currentIndex = clamped;
    renderCurrent();
    frameEl.classList.remove("is-leaving");
    frameEl.classList.add("is-entering");
    requestAnimationFrame(() => {
      frameEl.classList.remove("is-entering");
    });
  }, 220);
}

init();
