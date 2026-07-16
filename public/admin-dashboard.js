import {
  ADMIN_EMAIL,
  deleteAchievement,
  deletePortfolioItem,
  getSession,
  isConfigured,
  loadSiteData,
  saveAchievement,
  saveContent,
  savePortfolioItem,
  signOut,
  uploadPublicFile
} from "./alvya-supabase.js";

const state = {
  content: {},
  achievements: [],
  items: [],
  editingAchievementId: null
};

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

function stop(event) {
  event.preventDefault();
  event.stopImmediatePropagation();
}

function setStatus(message) {
  const banner = $(".banner");
  if (banner) banner.textContent = message;
}

function textValue(key) {
  return state.content[key]?.value?.text || "";
}

function mediaValue(key) {
  return state.content[key]?.value || {};
}

function getContentEls() {
  return {
    more_about: $("#more-about textarea"),
    studio_alyx: $("#studio-alyx textarea"),
    biography: $("#biography textarea"),
    achievements_intro: $("#achievements > label textarea")
  };
}

function fillCopy() {
  const els = getContentEls();
  Object.entries(els).forEach(([key, el]) => {
    if (el) el.value = textValue(key);
  });

  const photo = mediaValue("bio_photo");
  const slot = $(".bio-photo");
  if (slot && photo.url) {
    slot.innerHTML = `<img src="${photo.url}" alt="" style="width:100%;height:100%;object-fit:cover;">`;
  }
}

function renderStats() {
  const stats = $$(".stat .v");
  const animation = state.items.filter((item) => item.category === "animation").length;
  const digital = state.items.filter((item) => item.category === "digital").length;
  const traditional = state.items.filter((item) => item.category === "traditional").length;
  if (stats[0]) stats[0].textContent = animation;
  if (stats[1]) stats[1].textContent = digital;
  if (stats[2]) stats[2].textContent = traditional;
}

function renderAchievements() {
  const rows = $("#ach-rows");
  if (!rows) return;
  rows.innerHTML = state.achievements.map((item) => `
    <div class="row" data-id="${item.id}">
      <div class="yr">${item.year || ""}</div>
      <div class="ttl">${item.title || "Untitled"}<div class="desc">${item.description || ""}</div></div>
      <div class="acts"><button class="icon-btn ach-edit">Edit</button><button class="icon-btn danger ach-del">Delete</button></div>
    </div>
  `).join("");
}

function openAchievementForm(item) {
  state.editingAchievementId = item?.id || null;
  $("#ach-form-title").textContent = item ? "Edit Achievement" : "Add Achievement";
  $("#ach-year").value = item?.year || "";
  $("#ach-title").value = item?.title || "";
  $("#ach-desc").value = item?.description || "";
  $("#ach-form").classList.add("open");
  $("#ach-form").scrollIntoView({ behavior: "smooth", block: "center" });
}

function closeAchievementForm() {
  state.editingAchievementId = null;
  $("#ach-form").classList.remove("open");
}

function respInput(value = "") {
  return `<div class="resp-item"><input type="text" value="${String(value).replace(/"/g, "&quot;")}" placeholder="Responsibility bullet..." /><button class="resp-remove" title="Remove">x</button></div>`;
}

function fwItemHTML(item = {}, index = 0) {
  const responsibilities = item.responsibilities?.length ? item.responsibilities : [""];
  const mediaLabel = item.media_url ? `<video src="${item.media_url}" style="width:100%;height:100%;object-fit:cover;" muted></video>` : "+ Upload Video";
  return `
    <div class="fw-item" data-id="${item.id || ""}" data-media-url="${item.media_url || ""}" data-media-path="${item.media_path || ""}" data-media-type="${item.media_type || ""}">
      <div class="fw-head">
        <h3>Animation Work <em>#${String(index + 1).padStart(2, "0")}</em></h3>
        <div class="acts"><button class="icon-btn fw-collapse">Collapse</button><button class="icon-btn danger fw-remove">Remove</button></div>
      </div>
      <label class="field"><span class="lbl">Title</span><input class="fw-title-input" type="text" value="${String(item.title || "").replace(/"/g, "&quot;")}" placeholder="Project title" /></label>
      <label class="field"><span class="lbl">Description</span><textarea class="fw-desc-input" placeholder="Project description...">${item.description || ""}</textarea></label>
      <label class="field"><span class="lbl">Responsibilities</span><div class="resp-list">${responsibilities.map(respInput).join("")}</div><button class="btn ghost sm resp-add">+ Add Bullet</button></label>
      <label class="field"><span class="lbl">Video</span><div class="video-slot add">${mediaLabel}</div></label>
      <div class="actions-row"><button class="btn fw-save">Save Item</button><button class="btn ghost fw-discard">Discard</button></div>
    </div>`;
}

function renderAnimation() {
  const list = $("#fw-list");
  if (!list) return;
  const items = state.items.filter((item) => item.category === "animation");
  list.innerHTML = items.map(fwItemHTML).join("") || fwItemHTML({}, 0);
}

function renderGallery(category) {
  const panel = document.getElementById(category);
  const thumbs = $(".thumbs", panel);
  if (!thumbs) return;
  const items = state.items.filter((item) => item.category === category);
  thumbs.innerHTML = `<div class="thumb add">+ Add</div>` + items.map((item) => `
    <div class="thumb" data-id="${item.id}" data-media-path="${item.media_path || ""}">
      <img src="${item.media_url}" alt="${item.title || ""}" style="width:100%;height:100%;object-fit:cover;">
      <button class="icon-btn danger gal-del" style="position:absolute;bottom:8px;right:8px;background:#000;">Delete</button>
    </div>
  `).join("");
}

function renderAll() {
  fillCopy();
  renderStats();
  renderAchievements();
  renderAnimation();
  renderGallery("digital");
  renderGallery("traditional");
}

async function refresh() {
  const data = await loadSiteData();
  state.content = data.content;
  state.achievements = data.achievements;
  state.items = data.items;
  renderAll();
}

async function saveText(key) {
  const el = getContentEls()[key];
  await saveContent(key, { text: el.value.trim() });
  await refresh();
  setStatus("Saved.");
}

async function chooseFile(accept) {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = accept;
    input.onchange = () => resolve(input.files?.[0] || null);
    input.click();
  });
}

async function uploadBioPhoto() {
  const file = await chooseFile("image/*");
  if (!file) return;
  setStatus("Uploading biography photo...");
  const uploaded = await uploadPublicFile(file, "bio");
  await saveContent("bio_photo", { url: uploaded.url, path: uploaded.path });
  await refresh();
  setStatus("Biography photo uploaded.");
}

async function saveAnimationItem(itemEl) {
  setStatus("Saving animation work...");
  const file = itemEl.__pendingVideo || null;
  let mediaUrl = itemEl.dataset.mediaUrl || null;
  let mediaPath = itemEl.dataset.mediaPath || null;
  if (file) {
    const uploaded = await uploadPublicFile(file, "animation");
    mediaUrl = uploaded.url;
    mediaPath = uploaded.path;
  }
  const responsibilities = $$(".resp-item input", itemEl).map((input) => input.value.trim()).filter(Boolean);
  await savePortfolioItem({
    id: itemEl.dataset.id || null,
    category: "animation",
    title: $(".fw-title-input", itemEl).value.trim(),
    description: $(".fw-desc-input", itemEl).value.trim(),
    responsibilities,
    media_url: mediaUrl,
    media_path: mediaPath,
    media_type: mediaUrl ? "video" : null,
    sort_order: $$(".fw-item", $("#fw-list")).indexOf(itemEl)
  });
  await refresh();
  setStatus("Animation work saved.");
}

async function uploadGalleryImage(category) {
  const file = await chooseFile("image/*");
  if (!file) return;
  setStatus(`Uploading ${category} image...`);
  const uploaded = await uploadPublicFile(file, category);
  await savePortfolioItem({
    category,
    title: file.name.replace(/\.[^.]+$/, ""),
    description: "",
    responsibilities: [],
    media_url: uploaded.url,
    media_path: uploaded.path,
    media_type: "image",
    sort_order: state.items.filter((item) => item.category === category).length
  });
  await refresh();
  setStatus("Image uploaded.");
}

async function handleClick(event) {
  const target = event.target;

  if (target.closest(".top-right a")) {
    stop(event);
    await signOut();
    window.location.href = "/admin-login.html";
    return;
  }

  if (target.closest("#more-about .btn:not(.ghost)")) { stop(event); await saveText("more_about"); return; }
  if (target.closest("#studio-alyx .btn:not(.ghost)")) { stop(event); await saveText("studio_alyx"); return; }
  if (target.closest("#biography .btn.sm")) { stop(event); await uploadBioPhoto(); return; }
  if (target.closest("#biography .btn:not(.ghost)")) { stop(event); await saveText("biography"); return; }
  if (target.closest("#achievements > .actions-row .btn")) { stop(event); await saveText("achievements_intro"); return; }

  if (target.id === "ach-add") { stop(event); openAchievementForm(null); return; }
  if (target.id === "ach-cancel") { stop(event); closeAchievementForm(); return; }
  if (target.id === "ach-save") {
    stop(event);
    await saveAchievement({
      id: state.editingAchievementId,
      year: $("#ach-year").value,
      title: $("#ach-title").value.trim(),
      description: $("#ach-desc").value.trim(),
      sort_order: state.editingAchievementId
        ? state.achievements.findIndex((item) => item.id === state.editingAchievementId)
        : state.achievements.length
    });
    closeAchievementForm();
    await refresh();
    setStatus("Achievement saved.");
    return;
  }

  const achRow = target.closest("#ach-rows .row");
  if (achRow && target.classList.contains("ach-edit")) {
    stop(event);
    openAchievementForm(state.achievements.find((item) => item.id === achRow.dataset.id));
    return;
  }
  if (achRow && target.classList.contains("ach-del")) {
    stop(event);
    if (confirm("Delete this achievement?")) {
      await deleteAchievement(achRow.dataset.id);
      await refresh();
      setStatus("Achievement deleted.");
    }
    return;
  }

  if (target.id === "fw-add") {
    stop(event);
    const item = document.createElement("div");
    item.innerHTML = fwItemHTML({}, $$(".fw-item", $("#fw-list")).length);
    $("#fw-list").appendChild(item.firstElementChild);
    return;
  }

  if (target.classList.contains("resp-add")) {
    stop(event);
    target.previousElementSibling.insertAdjacentHTML("beforeend", respInput());
    return;
  }
  if (target.classList.contains("resp-remove")) {
    stop(event);
    target.closest(".resp-item").remove();
    return;
  }

  const fwItem = target.closest(".fw-item");
  if (fwItem && target.closest(".video-slot")) {
    stop(event);
    const file = await chooseFile("video/*");
    if (!file) return;
    fwItem.__pendingVideo = file;
    target.closest(".video-slot").textContent = file.name;
    return;
  }
  if (fwItem && target.classList.contains("fw-save")) { stop(event); await saveAnimationItem(fwItem); return; }
  if (fwItem && target.classList.contains("fw-discard")) { stop(event); await refresh(); return; }
  if (fwItem && target.classList.contains("fw-remove")) {
    stop(event);
    if (!confirm("Remove this Animation Work item?")) return;
    if (fwItem.dataset.id) {
      await deletePortfolioItem({
        id: fwItem.dataset.id,
        media_path: fwItem.dataset.mediaPath
      });
      await refresh();
    } else {
      fwItem.remove();
    }
    setStatus("Animation work removed.");
    return;
  }

  const digitalPanel = target.closest("#digital");
  const traditionalPanel = target.closest("#traditional");
  if ((digitalPanel || traditionalPanel) && (target.closest(".panel-head .btn") || target.closest(".thumb.add"))) {
    stop(event);
    await uploadGalleryImage(digitalPanel ? "digital" : "traditional");
    return;
  }
  if (target.classList.contains("gal-del")) {
    stop(event);
    const thumb = target.closest(".thumb");
    const item = state.items.find((row) => row.id === thumb.dataset.id);
    if (item && confirm("Delete this image?")) {
      await deletePortfolioItem(item);
      await refresh();
      setStatus("Image deleted.");
    }
  }
}

async function boot() {
  if (!isConfigured()) {
    setStatus("Supabase is not configured. Add your project URL and anon key.");
    return;
  }

  try {
    const session = await getSession();
    if (!session) {
      window.location.href = "/admin-login.html";
      return;
    }
    if (session.user?.email !== ADMIN_EMAIL) {
      await signOut();
      window.location.href = "/admin-login.html";
      return;
    }
    $(".who").textContent = `Signed in as ${session.user.email}`;
    setStatus("Connected to Supabase.");
    await refresh();
    document.addEventListener("click", handleClick, true);
  } catch (error) {
    setStatus(error.message || "Admin dashboard failed to load.");
  }
}

boot();
