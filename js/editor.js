import * as Model from "./catalog-model.js";

const SUPPORTS_FS_ACCESS = "showDirectoryPicker" in window;

const state = {
  catalog: Model.createDefaultCatalog(),
  currentPageIndex: 0,
  editingArticleId: null,
  imagesDirHandle: null,
  previewUrls: new Map(), // articleId -> objectURL, solo para preview en el editor
  logoPreviewUrl: null,
};

const el = {
  whatsapp: document.getElementById("inputWhatsapp"),
  logo: document.getElementById("inputLogo"),
  logoFile: document.getElementById("inputLogoFile"),
  headerTitle: document.getElementById("inputHeaderTitle"),
  headerSubtitle: document.getElementById("inputHeaderSubtitle"),
  color1: document.getElementById("color1"),
  color2: document.getElementById("color2"),
  color3: document.getElementById("color3"),
  enable2: document.getElementById("enable2"),
  enable3: document.getElementById("enable3"),
  prevPage: document.getElementById("prevPage"),
  nextPage: document.getElementById("nextPage"),
  pageIndicator: document.getElementById("pageIndicator"),
  footerPreview: document.getElementById("footerPreview"),
  addPage: document.getElementById("addPage"),
  removePage: document.getElementById("removePage"),
  articleCount: document.getElementById("articleCount"),
  addArticle: document.getElementById("addArticle"),
  exportBtn: document.getElementById("exportBtn"),
  importInput: document.getElementById("importInput"),
  statusMsg: document.getElementById("statusMsg"),
  pageCanvas: document.getElementById("pageCanvas"),
  folderStatus: document.getElementById("folderStatus"),
  connectFolderBtn: document.getElementById("connectFolderBtn"),
  tabButtons: Array.from(document.querySelectorAll(".tab-btn")),
  tabPanels: Array.from(document.querySelectorAll(".tab-panel")),
  modal: document.getElementById("articleModal"),
  modalPhoto: document.getElementById("modalPhoto"),
  modalPhotoFile: document.getElementById("modalPhotoFile"),
  modalDescription: document.getElementById("modalDescription"),
  modalPrice: document.getElementById("modalPrice"),
  modalDelete: document.getElementById("modalDelete"),
  modalCancel: document.getElementById("modalCancel"),
  modalSave: document.getElementById("modalSave"),
};

function currentPage() {
  return state.catalog.pages[state.currentPageIndex];
}

function setStatus(message, type = "") {
  el.statusMsg.textContent = message;
  el.statusMsg.classList.remove("is-error", "is-success");
  if (type) el.statusMsg.classList.add(type);
}

function syncGlobalFormFromState() {
  const g = state.catalog.global;
  el.whatsapp.value = g.whatsapp;
  el.logo.value = g.logo;
  el.headerTitle.value = g.headerTitle;
  el.headerSubtitle.value = g.headerSubtitle;
  el.color1.value = g.colors[0] || "#2b2b3d";
  el.color2.value = g.colors[1] || "#4ecdc4";
  el.color3.value = g.colors[2] || "#ffe66d";
  el.enable2.checked = g.colors.length >= 2;
  el.enable3.checked = g.colors.length >= 3;
}

function recomputeColors() {
  const colors = [el.color1.value];
  if (el.enable2.checked) colors.push(el.color2.value);
  if (el.enable3.checked) colors.push(el.color3.value);
  state.catalog.global.colors = colors;
  applyGradient();
}

function applyGradient() {
  document.documentElement.style.setProperty(
    "--catalog-gradient",
    Model.buildBackgroundStyle(state.catalog.global)
  );
}

function updatePageNav() {
  const total = state.catalog.pages.length;
  el.pageIndicator.textContent = `Página ${state.currentPageIndex + 1} / ${total}`;
  el.prevPage.disabled = state.currentPageIndex === 0;
  el.nextPage.disabled = state.currentPageIndex === total - 1;
  el.addPage.disabled = total >= Model.LIMITS.MAX_PAGES;
  el.removePage.disabled = total <= Model.LIMITS.MIN_PAGES;
  el.footerPreview.textContent = `Página ${state.currentPageIndex + 1} de ${total}`;
}

function updateArticleCount() {
  const count = Model.countArticles(state.catalog);
  el.articleCount.textContent = String(count);
  el.addArticle.disabled = count >= Model.LIMITS.MAX_ARTICLES;
}

// --- Tabs ---

function setActiveTab(tabName) {
  el.tabButtons.forEach((btn) => btn.classList.toggle("is-active", btn.dataset.tab === tabName));
  el.tabPanels.forEach((panel) => {
    panel.hidden = panel.dataset.tab !== tabName;
  });
}

el.tabButtons.forEach((btn) => {
  btn.addEventListener("click", () => setActiveTab(btn.dataset.tab));
});

// --- Carpeta de imágenes (File System Access API) ---

if (!SUPPORTS_FS_ACCESS) {
  el.connectFolderBtn.disabled = true;
  el.folderStatus.textContent = "Tu navegador no soporta guardado automático (usá Chrome o Edge). Copiá las fotos a mano en /images.";
}

el.connectFolderBtn.addEventListener("click", async () => {
  try {
    state.imagesDirHandle = await window.showDirectoryPicker({ id: "catalogo-images", mode: "readwrite" });
    el.folderStatus.textContent = `Carpeta de imágenes: ✓ ${state.imagesDirHandle.name}`;
    el.folderStatus.classList.add("is-connected");
  } catch {
    // el usuario canceló el selector, no hacemos nada
  }
});

async function persistImageFile(file) {
  const targetPath = `images/${file.name}`;
  if (!state.imagesDirHandle) {
    setStatus(`Conectá la carpeta de imágenes (arriba) para guardar "${file.name}" automáticamente, o copiala a mano a /images.`);
    return targetPath;
  }
  try {
    const fileHandle = await state.imagesDirHandle.getFileHandle(file.name, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(file);
    await writable.close();
    setStatus(`"${file.name}" guardada en /images.`, "is-success");
  } catch (err) {
    setStatus(`No se pudo guardar "${file.name}" automáticamente: ${err.message}`, "is-error");
  }
  return targetPath;
}

// --- Render ---

function renderCanvas() {
  const page = currentPage();
  const effectiveGlobal = { ...state.catalog.global, logo: state.logoPreviewUrl || state.catalog.global.logo };
  const effectivePage = {
    ...page,
    articles: page.articles.map((article) =>
      state.previewUrls.has(article.id) ? { ...article, photo: state.previewUrls.get(article.id) } : article
    ),
  };

  const rendered = Model.renderPage(effectivePage, effectiveGlobal, state.catalog.pages.length, "editor");
  el.pageCanvas.replaceWith(rendered);
  rendered.id = "pageCanvas";
  el.pageCanvas = rendered;

  const canvasArea = rendered.querySelector(".page-canvas");
  page.articles.forEach((article) => {
    const cardEl = canvasArea.querySelector(`[data-article-id="${article.id}"]`);
    attachDrag(cardEl, article, canvasArea);
    attachResize(cardEl, article, canvasArea);
    cardEl.querySelector(".article-edit-btn").addEventListener("click", (e) => {
      e.stopPropagation();
      openArticleModal(article);
    });
  });

  updateArticleCount();
}

function attachDrag(cardEl, article, canvasEl) {
  cardEl.addEventListener("pointerdown", (e) => {
    if (e.target.closest(".article-edit-btn") || e.target.closest(".article-resize-handle")) return;
    e.preventDefault();
    cardEl.setPointerCapture(e.pointerId);
    cardEl.classList.add("is-dragging");

    const canvasRect = canvasEl.getBoundingClientRect();
    const startX = e.clientX;
    const startY = e.clientY;
    const startLeftPx = (article.position.left / 100) * canvasRect.width;
    const startTopPx = (article.position.top / 100) * canvasRect.height;
    const widthPx = (article.position.width / 100) * canvasRect.width;
    const heightPx = (article.position.height / 100) * canvasRect.height;

    function onMove(ev) {
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      const leftPx = Math.min(Math.max(0, startLeftPx + dx), canvasRect.width - widthPx);
      const topPx = Math.min(Math.max(0, startTopPx + dy), canvasRect.height - heightPx);
      cardEl.style.left = `${(leftPx / canvasRect.width) * 100}%`;
      cardEl.style.top = `${(topPx / canvasRect.height) * 100}%`;
    }

    function onUp(ev) {
      cardEl.releasePointerCapture(ev.pointerId);
      cardEl.classList.remove("is-dragging");
      article.position.left = parseFloat(cardEl.style.left);
      article.position.top = parseFloat(cardEl.style.top);
      cardEl.removeEventListener("pointermove", onMove);
      cardEl.removeEventListener("pointerup", onUp);
    }

    cardEl.addEventListener("pointermove", onMove);
    cardEl.addEventListener("pointerup", onUp);
  });
}

function attachResize(cardEl, article, canvasEl) {
  const handle = cardEl.querySelector(".article-resize-handle");
  if (!handle) return;

  handle.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    e.stopPropagation();
    handle.setPointerCapture(e.pointerId);
    cardEl.classList.add("is-resizing");

    const canvasRect = canvasEl.getBoundingClientRect();
    const startX = e.clientX;
    const startY = e.clientY;
    const startWidthPx = (article.position.width / 100) * canvasRect.width;
    const startHeightPx = (article.position.height / 100) * canvasRect.height;
    const leftPx = (article.position.left / 100) * canvasRect.width;
    const topPx = (article.position.top / 100) * canvasRect.height;
    const maxWidthPx = canvasRect.width - leftPx;
    const maxHeightPx = canvasRect.height - topPx;
    const minWidthPx = canvasRect.width * 0.08;
    const minHeightPx = canvasRect.height * 0.08;

    function onMove(ev) {
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      const widthPx = Math.min(Math.max(startWidthPx + dx, minWidthPx), maxWidthPx);
      const heightPx = Math.min(Math.max(startHeightPx + dy, minHeightPx), maxHeightPx);
      cardEl.style.width = `${(widthPx / canvasRect.width) * 100}%`;
      cardEl.style.height = `${(heightPx / canvasRect.height) * 100}%`;
    }

    function onUp(ev) {
      handle.releasePointerCapture(ev.pointerId);
      cardEl.classList.remove("is-resizing");
      article.position.width = parseFloat(cardEl.style.width);
      article.position.height = parseFloat(cardEl.style.height);
      handle.removeEventListener("pointermove", onMove);
      handle.removeEventListener("pointerup", onUp);
    }

    handle.addEventListener("pointermove", onMove);
    handle.addEventListener("pointerup", onUp);
  });
}

function openArticleModal(article) {
  state.editingArticleId = article.id;
  el.modalPhoto.value = article.photo;
  el.modalDescription.value = article.description;
  el.modalPrice.value = article.price;
  el.modal.hidden = false;
}

function closeArticleModal() {
  state.editingArticleId = null;
  el.modal.hidden = true;
}

function findArticleById(id) {
  for (const page of state.catalog.pages) {
    const article = page.articles.find((a) => a.id === id);
    if (article) return { article, page };
  }
  return null;
}

el.color1.addEventListener("input", recomputeColors);
el.color2.addEventListener("input", recomputeColors);
el.color3.addEventListener("input", recomputeColors);
el.enable2.addEventListener("change", recomputeColors);
el.enable3.addEventListener("change", recomputeColors);

el.whatsapp.addEventListener("input", () => {
  state.catalog.global.whatsapp = el.whatsapp.value.trim();
});
el.logo.addEventListener("input", () => {
  state.catalog.global.logo = el.logo.value.trim();
  state.logoPreviewUrl = null;
  renderCanvas();
});
el.logoFile.addEventListener("change", async () => {
  const file = el.logoFile.files[0];
  if (!file) return;
  state.logoPreviewUrl = URL.createObjectURL(file);
  renderCanvas();
  const path = await persistImageFile(file);
  el.logo.value = path;
  state.catalog.global.logo = path;
});
el.headerTitle.addEventListener("input", () => {
  state.catalog.global.headerTitle = el.headerTitle.value;
  renderCanvas();
});
el.headerSubtitle.addEventListener("input", () => {
  state.catalog.global.headerSubtitle = el.headerSubtitle.value;
  renderCanvas();
});

el.prevPage.addEventListener("click", () => {
  if (state.currentPageIndex > 0) {
    state.currentPageIndex -= 1;
    updatePageNav();
    renderCanvas();
  }
});
el.nextPage.addEventListener("click", () => {
  if (state.currentPageIndex < state.catalog.pages.length - 1) {
    state.currentPageIndex += 1;
    updatePageNav();
    renderCanvas();
  }
});
el.addPage.addEventListener("click", () => {
  if (state.catalog.pages.length >= Model.LIMITS.MAX_PAGES) return;
  state.catalog.pages.push({ number: state.catalog.pages.length + 1, articles: [] });
  state.currentPageIndex = state.catalog.pages.length - 1;
  updatePageNav();
  renderCanvas();
});
el.removePage.addEventListener("click", () => {
  if (state.catalog.pages.length <= Model.LIMITS.MIN_PAGES) return;
  state.catalog.pages.splice(state.currentPageIndex, 1);
  Model.renumberPages(state.catalog);
  state.currentPageIndex = Math.min(state.currentPageIndex, state.catalog.pages.length - 1);
  updatePageNav();
  renderCanvas();
});

el.addArticle.addEventListener("click", () => {
  if (Model.countArticles(state.catalog) >= Model.LIMITS.MAX_ARTICLES) return;
  const article = Model.createEmptyArticle();
  currentPage().articles.push(article);
  renderCanvas();
  openArticleModal(article);
});

el.modalPhotoFile.addEventListener("change", async () => {
  const file = el.modalPhotoFile.files[0];
  if (!file) return;
  const found = findArticleById(state.editingArticleId);
  if (!found) return;
  state.previewUrls.set(found.article.id, URL.createObjectURL(file));
  const path = await persistImageFile(file);
  el.modalPhoto.value = path;
});

el.modalCancel.addEventListener("click", closeArticleModal);

el.modalSave.addEventListener("click", () => {
  const found = findArticleById(state.editingArticleId);
  if (!found) return;
  const { article } = found;
  article.photo = el.modalPhoto.value.trim();
  article.description = el.modalDescription.value.trim();
  article.price = Number(el.modalPrice.value) || 0;
  closeArticleModal();
  renderCanvas();
});

el.modalDelete.addEventListener("click", () => {
  const found = findArticleById(state.editingArticleId);
  if (!found) return;
  state.previewUrls.delete(found.article.id);
  found.page.articles = found.page.articles.filter((a) => a.id !== found.article.id);
  closeArticleModal();
  renderCanvas();
});

el.exportBtn.addEventListener("click", () => {
  const errors = Model.validateCatalog(state.catalog);
  if (errors.length > 0) {
    setStatus(errors.join("\n"), "is-error");
    return;
  }
  const json = JSON.stringify(state.catalog, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "catalogo.json";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  setStatus("catalogo.json exportado correctamente.", "is-success");
});

el.importInput.addEventListener("change", () => {
  const file = el.importInput.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(reader.result);
      if (!parsed.global || !Array.isArray(parsed.pages)) {
        throw new Error("Estructura inválida");
      }
      state.catalog = parsed;
      state.currentPageIndex = 0;
      state.previewUrls.clear();
      state.logoPreviewUrl = null;
      syncGlobalFormFromState();
      applyGradient();
      updatePageNav();
      renderCanvas();
      setStatus("Catálogo cargado correctamente.", "is-success");
    } catch (err) {
      setStatus("No se pudo leer el archivo: " + err.message, "is-error");
    }
  };
  reader.readAsText(file);
});

syncGlobalFormFromState();
applyGradient();
updatePageNav();
renderCanvas();
