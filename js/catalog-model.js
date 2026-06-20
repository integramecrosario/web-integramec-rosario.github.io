// Modelo de datos y render compartido entre editor.js y viewer.js.

export const LIMITS = {
  MIN_PAGES: 1,
  MAX_PAGES: 15,
  MAX_ARTICLES: 40,
};

export function buildGradient(colors) {
  const list = (colors || []).filter(Boolean);
  if (list.length === 0) return "#1a1a1a";
  if (list.length === 1) return list[0];
  return `linear-gradient(135deg, ${list.join(", ")})`;
}

export function formatPrice(price) {
  const n = Number(price) || 0;
  return "$ " + n.toLocaleString("es-AR");
}

export function buildWhatsAppUrl(whatsapp, description, price) {
  const text = `Hola, estoy interesado en: ${description} - Precio: ${formatPrice(price)}`;
  return `https://wa.me/${whatsapp}?text=${encodeURIComponent(text)}`;
}

export function generateArticleId() {
  return "a" + Math.random().toString(36).slice(2, 9);
}

export function createEmptyArticle() {
  return {
    id: generateArticleId(),
    photo: "",
    description: "Nuevo artículo",
    price: 0,
    position: { top: 10, left: 10, width: 30, height: 35 },
  };
}

export function createDefaultCatalog() {
  const pages = [{ number: 1, articles: [] }];
  return {
    global: {
      whatsapp: "",
      logo: "",
      headerTitle: "Mi Catálogo",
      headerSubtitle: "",
      colors: ["#2b2b3d", "#4ecdc4", "#ffe66d"],
    },
    pages,
  };
}

export function countArticles(catalog) {
  return catalog.pages.reduce((sum, p) => sum + p.articles.length, 0);
}

export function renumberPages(catalog) {
  catalog.pages.forEach((page, idx) => {
    page.number = idx + 1;
  });
}

export function buildBackgroundStyle(global) {
  return buildGradient(global.colors);
}

export function validateCatalog(catalog) {
  const errors = [];
  if (!catalog.global.whatsapp) errors.push("Falta el número de WhatsApp.");
  if (!catalog.global.colors || catalog.global.colors.length === 0) {
    errors.push("Elegí al menos 1 color de fondo.");
  }
  if (catalog.pages.length < LIMITS.MIN_PAGES || catalog.pages.length > LIMITS.MAX_PAGES) {
    errors.push(`El catálogo debe tener entre ${LIMITS.MIN_PAGES} y ${LIMITS.MAX_PAGES} páginas.`);
  }
  if (countArticles(catalog) > LIMITS.MAX_ARTICLES) {
    errors.push(`No puede haber más de ${LIMITS.MAX_ARTICLES} artículos en total.`);
  }
  return errors;
}

export function renderArticleCard(article, global, mode = "viewer", photoSrc = article.photo) {
  const card = document.createElement("div");
  card.className = "article-card";
  card.dataset.articleId = article.id;
  card.style.top = `${article.position.top}%`;
  card.style.left = `${article.position.left}%`;
  card.style.width = `${article.position.width}%`;
  card.style.height = `${article.position.height}%`;

  if (photoSrc) {
    const img = document.createElement("img");
    img.className = "article-photo";
    img.src = photoSrc;
    img.alt = article.description || "";
    img.draggable = false;
    card.appendChild(img);
  } else {
    const placeholder = document.createElement("div");
    placeholder.className = "article-photo article-photo-placeholder";
    placeholder.textContent = "Sin foto";
    card.appendChild(placeholder);
  }

  const info = document.createElement("div");
  info.className = "article-info";
  const desc = document.createElement("p");
  desc.className = "article-description";
  desc.textContent = article.description || "";
  const price = document.createElement("p");
  price.className = "article-price";
  price.textContent = formatPrice(article.price);
  info.append(desc, price);
  card.appendChild(info);

  if (mode === "viewer") {
    const cta = document.createElement("a");
    cta.className = "article-cta";
    cta.href = buildWhatsAppUrl(global.whatsapp, article.description, article.price);
    cta.target = "_blank";
    cta.rel = "noopener";
    cta.textContent = "Consultar";
    card.appendChild(cta);
  } else {
    const editBtn = document.createElement("button");
    editBtn.type = "button";
    editBtn.className = "article-edit-btn";
    editBtn.textContent = "✎";
    editBtn.setAttribute("aria-label", "Editar artículo");
    card.appendChild(editBtn);

    const resizeHandle = document.createElement("div");
    resizeHandle.className = "article-resize-handle";
    resizeHandle.setAttribute("aria-label", "Redimensionar artículo");
    card.appendChild(resizeHandle);
  }

  return card;
}

export function renderPage(page, global, totalPages, mode = "viewer") {
  const pageEl = document.createElement("section");
  pageEl.className = "a4-page";
  pageEl.dataset.pageNumber = String(page.number);

  const header = document.createElement("header");
  header.className = "page-header";
  if (global.logo) {
    const logo = document.createElement("img");
    logo.className = "page-logo";
    logo.src = global.logo;
    logo.alt = "Logo";
    header.appendChild(logo);
  }
  const headerText = document.createElement("div");
  headerText.className = "page-header-text";
  const title = document.createElement("p");
  title.className = "page-header-title";
  title.textContent = global.headerTitle || "";
  const subtitle = document.createElement("p");
  subtitle.className = "page-header-subtitle";
  subtitle.textContent = global.headerSubtitle || "";
  headerText.append(title, subtitle);
  header.appendChild(headerText);
  pageEl.appendChild(header);

  const canvas = document.createElement("div");
  canvas.className = "page-canvas";
  page.articles.forEach((article) => {
    canvas.appendChild(renderArticleCard(article, global, mode, article.photo));
  });
  pageEl.appendChild(canvas);

  const footer = document.createElement("footer");
  footer.className = "page-footer";
  footer.textContent = `Página ${page.number} de ${totalPages}`;
  pageEl.appendChild(footer);

  return pageEl;
}
