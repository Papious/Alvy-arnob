import { isConfigured, loadSiteData, mediaValue, submitContactMessage, textValue } from "./alvya-supabase.js";

const esc = (value) => String(value || "").replace(/[&<>"']/g, (ch) => ({
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;"
}[ch]));

function textToHtml(value) {
  return esc(value).replace(/\n{2,}/g, "<br><br>").replace(/\n/g, "<br>");
}

function applyCopy(content) {
  const moreAbout = textValue(content.more_about);
  const studio = textValue(content.studio_alyx);
  const bio = textValue(content.biography);
  const bioPhoto = mediaValue(content.bio_photo);
  const achIntro = textValue(content.achievements_intro);

  if (moreAbout) {
    document.querySelectorAll(".more-about").forEach((section) => {
      if (section.querySelector(".studio-alyx-label")) return;
      const body = section.querySelector(".more-about-body");
      if (body) body.textContent = moreAbout;
    });
  }

  if (studio) {
    document.querySelectorAll(".more-about").forEach((section) => {
      if (!section.querySelector(".studio-alyx-label")) return;
      const body = section.querySelector(".more-about-body");
      if (body) body.textContent = studio;
    });
  }

  if (bio) {
    const body = document.querySelector("#page-about .bio-body");
    if (body) body.innerHTML = textToHtml(bio);
  }

  if (bioPhoto.url) {
    const photo = document.querySelector("#page-about .bio-dp");
    if (photo) {
      photo.innerHTML = "";
      photo.style.backgroundImage = `url("${bioPhoto.url}")`;
    }
  }

  if (achIntro) {
    const lede = document.querySelector(".ach-lede");
    if (lede) lede.textContent = achIntro;
  }
}

function renderAchievements(achievements) {
  if (!achievements.length) return;
  const list = document.querySelector(".ach-list");
  if (!list) return;
  list.innerHTML = achievements.map((item) => `
    <details class="ach-row">
      <summary>
        <div class="ach-row-main">
          <span class="ach-row-year">${esc(item.year || "")}</span>
          <span class="ach-row-title">${esc(item.title)}</span>
        </div>
        <span class="ach-row-icon" aria-hidden="true"></span>
      </summary>
      <div class="ach-row-body">${esc(item.description)}</div>
    </details>
  `).join("");
}

function renderAnimation(items) {
  const animation = items.filter((item) => item.category === "animation");
  if (!animation.length) return;

  const list = document.querySelector("#page-featured .fw-list");
  if (list) {
    list.innerHTML = animation.map((item) => {
      const media = item.media_url
        ? `<video src="${esc(item.media_url)}" controls preload="metadata" playsinline></video>`
        : `<span class="fw-placeholder">Media placeholder</span>`;
      const responsibilities = (item.responsibilities || []).map((resp) => `<li>${esc(resp)}</li>`).join("");
      return `
        <article class="fw-item rev-up">
          <div class="fw-media">${media}</div>
          <div class="fw-details">
            <h3 class="fw-title">${esc(item.title)}</h3>
            <p class="fw-desc">${esc(item.description)}</p>
            <div class="fw-resp-label">Responsibilities</div>
            <ul class="fw-resp-list">${responsibilities}</ul>
          </div>
        </article>
      `;
    }).join("");
  }

  const videos = animation.filter((item) => item.media_url).slice(0, 3);
  const banner = document.getElementById("feat-banner");
  const dots = document.getElementById("feat-banner-d");
  if (banner && dots && videos.length) {
    banner.querySelectorAll(".feat-slide").forEach((slide) => slide.remove());
    videos.forEach((item, index) => {
      const slide = document.createElement("div");
      slide.className = `feat-slide${index === 0 ? " act" : ""}`;
      slide.dataset.idx = String(index);
      slide.innerHTML = `<video src="${esc(item.media_url)}" muted loop playsinline preload="auto"${index === 0 ? " autoplay" : ""}></video>`;
      banner.insertBefore(slide, banner.querySelector(".feat-banner-gradient"));
    });
    dots.innerHTML = videos.map((_, index) => `<div class="c-dot${index === 0 ? " act" : ""}" onclick="feBGo(event,${index})"></div>`).join("");
  }
}

function placeholder() {
  return `<svg width="80" height="80"><use href="#ph" /></svg>`;
}

function renderGallery(category, items) {
  const galleryItems = items.filter((item) => item.category === category && item.media_url);
  if (!galleryItems.length) return;

  const page = document.getElementById(category === "digital" ? "page-digital" : "page-traditional");
  const wrap = page?.querySelector(".gal-wrap");
  if (wrap) {
    const cells = galleryItems.map((item) => `
      <div class="gal-item rev-up">
        <img src="${esc(item.media_url)}" alt="${esc(item.title || `${category} artwork`)}">
        <div class="gal-overlay"><span>View Artwork</span></div>
      </div>
    `);
    while (cells.length % 3) cells.push(`<div class="gal-item rev-up">${placeholder()}</div>`);
    const rows = [];
    for (let i = 0; i < cells.length; i += 3) rows.push(`<div class="gal-3">${cells.slice(i, i + 3).join("")}</div>`);
    wrap.innerHTML = rows.join("");
  }

  const track = document.getElementById(category === "digital" ? "c-dig-t" : "c-trad-t");
  const dots = document.getElementById(category === "digital" ? "c-dig-d" : "c-trad-d");
  const carouselId = category === "digital" ? "c-dig" : "c-trad";
  const previewItems = galleryItems.slice(0, 3);
  if (track && dots && previewItems.length) {
    const slides = previewItems.map((item) => `
      <div class="carousel-slide">
        <img src="${esc(item.media_url)}" alt="${esc(item.title || `${category} artwork`)}" style="width:100%;height:100%;object-fit:cover;display:block;">
      </div>
    `);
    while (slides.length < 3) slides.push(`<div class="carousel-slide">${placeholder()}</div>`);
    track.innerHTML = slides.join("");
    dots.innerHTML = slides.map((_, index) => `<div class="c-dot${index === 0 ? " act" : ""}" onclick="cGo('${carouselId}',${index})"></div>`).join("");
  }
}

function renderHeroSlides(slides) {
  const container = document.getElementById("parallaxBg");
  if (!container || !slides.length) return;

  container.innerHTML = slides.map((slide, index) => `
    <div class="hero-slide-layer${index === 0 ? " act" : ""}" style="background-image:url('${esc(slide.image_url)}')"></div>
  `).join("");
  container.style.backgroundImage = "none";

  if (slides.length < 2) return;
  let activeIndex = 0;
  setInterval(() => {
    const layers = container.querySelectorAll(".hero-slide-layer");
    if (!layers.length) return;
    layers[activeIndex].classList.remove("act");
    activeIndex = (activeIndex + 1) % layers.length;
    layers[activeIndex].classList.add("act");
  }, 6000);
}

function wireContactForm() {
  const btn = document.getElementById("ct-submit-btn");
  if (!btn || btn.dataset.wired) return;
  btn.dataset.wired = "true";

  btn.addEventListener("click", async (event) => {
    event.preventDefault();
    const status = document.getElementById("ct-status");
    const fields = {
      first_name: document.getElementById("ct-first-name")?.value.trim() || "",
      last_name: document.getElementById("ct-last-name")?.value.trim() || "",
      email: document.getElementById("ct-email")?.value.trim() || "",
      phone: document.getElementById("ct-phone")?.value.trim() || "",
      message: document.getElementById("ct-message")?.value.trim() || ""
    };

    if (!fields.email || !fields.message) {
      if (status) status.textContent = "Please add your email and a short message.";
      return;
    }

    try {
      btn.disabled = true;
      if (status) status.textContent = "Sending...";
      await submitContactMessage(fields);
      if (status) status.textContent = "Thanks — your message has been sent. I'll get back to you soon.";
      ["ct-first-name", "ct-last-name", "ct-email", "ct-phone", "ct-message"].forEach((id) => {
        const el = document.getElementById(id);
        if (el) el.value = "";
      });
    } catch (error) {
      console.warn("Contact form submit failed:", error);
      if (status) status.textContent = "Something went wrong sending your message. Please try again.";
    } finally {
      btn.disabled = false;
    }
  });
}

async function initPortfolio() {
  wireContactForm();
  if (!isConfigured()) return;
  try {
    const data = await loadSiteData();
    applyCopy(data.content);
    renderAchievements(data.achievements);
    renderAnimation(data.items);
    renderGallery("digital", data.items);
    renderGallery("traditional", data.items);
    renderHeroSlides(data.heroSlides);
    if (typeof window.wireGallery === "function") window.wireGallery();
    if (typeof window.feBUpdate === "function") window.feBUpdate();
  } catch (error) {
    console.warn("Supabase portfolio load failed:", error);
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initPortfolio);
} else {
  initPortfolio();
}
