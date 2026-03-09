/* ════════════════════════════════════════
   LOADER
════════════════════════════════════════ */
const loaderEl = document.getElementById("loader");
const loaderVideo = document.getElementById("loaderVideo");

function hideLoader() {
  if (loaderEl.style.display === "none") return;
  loaderEl.style.opacity = "0";
  setTimeout(() => loaderEl.style.display = "none", 420);
}
setTimeout(hideLoader, 5000);
loaderVideo.addEventListener("ended", hideLoader);


/* ════════════════════════════════════════
   NAVIGATION
════════════════════════════════════════ */
let pageStack = ["page1"];

function goTo(id, back = false) {
  document.querySelectorAll(".page").forEach(p => p.classList.remove("active", "back-in"));
  const el = document.getElementById(id);
  el.classList.add("active");
  if (back) el.classList.add("back-in");
  pageStack = back ? pageStack.slice(0, -1) : [...pageStack, id];
}

document.getElementById("goToPlaylists").addEventListener("click", () => {
  updateFavCount();
  renderCustomPlaylists();
  goTo("page2");
});
document.getElementById("backToSearch").addEventListener("click", () => goTo("page1", true));
document.getElementById("backToPlaylists").addEventListener("click", () => goTo("page2", true));


/* ════════════════════════════════════════
   SEARCH
════════════════════════════════════════ */
const searchInput  = document.getElementById("searchInput");
const clearBtn     = document.getElementById("clearSearch");
const resultsEl    = document.getElementById("results");
const emptyEl      = document.getElementById("emptyState");
const searchLoader = document.getElementById("searchLoader");
let searchTimer    = null;

searchInput.addEventListener("input", () => {
  const q = searchInput.value;
  clearBtn.classList.toggle("hidden", !q);
  clearTimeout(searchTimer);

  if (q.trim().length < 2) {
    resultsEl.innerHTML = "";
    searchLoader.classList.add("hidden");
    emptyEl.style.display = "flex";
    return;
  }
  emptyEl.style.display = "none";
  resultsEl.innerHTML = "";
  searchLoader.classList.remove("hidden");

  searchTimer = setTimeout(async () => {
    try {
      const data = await deezerSearch(q.trim(), 25);
      searchLoader.classList.add("hidden");
      renderTracks(data, resultsEl);
    } catch {
      searchLoader.classList.add("hidden");
      resultsEl.innerHTML = `<div class="msg-empty">Ошибка поиска. Проверь соединение.</div>`;
    }
  }, 380);
});

clearBtn.addEventListener("click", () => {
  searchInput.value = "";
  clearBtn.classList.add("hidden");
  resultsEl.innerHTML = "";
  emptyEl.style.display = "flex";
  searchInput.focus();
});


/* ════════════════════════════════════════
   DEEZER API
════════════════════════════════════════ */
let dzCbIdx = 0;
function deezerJSONP(url) {
  return new Promise((resolve, reject) => {
    const cb = `_dz${dzCbIdx++}`;
    const s  = document.createElement("script");
    s.src    = `${url}&output=jsonp&callback=${cb}`;
    const t  = setTimeout(() => { cleanup(); reject(new Error("timeout")); }, 8000);
    window[cb] = (d) => { cleanup(); resolve(d); };
    s.onerror  = () => { cleanup(); reject(new Error("net")); };
    function cleanup() { clearTimeout(t); delete window[cb]; s.remove(); }
    document.head.appendChild(s);
  });
}
async function deezerSearch(q, limit = 20) {
  const d = await deezerJSONP(`https://api.deezer.com/search?q=${encodeURIComponent(q)}&limit=${limit}`);
  return d.data || [];
}


/* ════════════════════════════════════════
   FAVORITES & PLAYLISTS  (localStorage)
════════════════════════════════════════ */
const LS_FAV = "oao_favorites";
const LS_PL  = "oao_playlists";

function getFavs()  { try { return JSON.parse(localStorage.getItem(LS_FAV) || "[]"); } catch { return []; } }
function getPls()   { try { return JSON.parse(localStorage.getItem(LS_PL)  || "[]"); } catch { return []; } }
function saveFavs(a){ localStorage.setItem(LS_FAV, JSON.stringify(a)); }
function savePls(a) { localStorage.setItem(LS_PL,  JSON.stringify(a)); }

function isFav(id)  { return getFavs().some(t => t.id === id); }

function addToFav(track) {
  const favs = getFavs();
  if (!favs.find(t => t.id === track.id)) { favs.unshift(track); saveFavs(favs); }
  updateFavCount();
}
function removeFromFav(id) {
  saveFavs(getFavs().filter(t => t.id !== id));
  updateFavCount();
}

function addToPlaylist(plName, track) {
  const pls = getPls();
  const pl  = pls.find(p => p.name === plName);
  if (!pl) return;
  if (!pl.tracks.find(t => t.id === track.id)) pl.tracks.unshift(track);
  savePls(pls);
}
function removeFromPlaylist(plName, id) {
  const pls = getPls();
  const pl  = pls.find(p => p.name === plName);
  if (!pl) return;
  pl.tracks = pl.tracks.filter(t => t.id !== id);
  savePls(pls);
}

function updateFavCount() {
  const n = getFavs().length;
  document.getElementById("favCount").textContent = `${n} ${pl(n)}`;
}
function pl(n) {
  if (n % 10 === 1 && n % 100 !== 11) return "трек";
  if ([2,3,4].includes(n%10) && ![12,13,14].includes(n%100)) return "трека";
  return "треков";
}


/* ════════════════════════════════════════
   ADD-TO-PLAYLIST SHEET
════════════════════════════════════════ */
const sheetOverlay = document.getElementById("sheetOverlay");
const addSheet     = document.getElementById("addSheet");
const sheetList    = document.getElementById("sheetList");
const sheetCancel  = document.getElementById("sheetCancel");
let pendingTrack   = null;

function openAddSheet(track) {
  pendingTrack = track;
  const pls    = getPls();

  sheetList.innerHTML = `
    <!-- ИЗБРАННЫЕ -->
    <div class="sheet-item" id="sheet-fav">
      <div class="sheet-item__icon sheet-item__icon--fav">
        <svg viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
      </div>
      <div>
        <div class="sheet-item__label">Избранные</div>
        <div class="sheet-item__sub">${getFavs().length} ${pl(getFavs().length)}</div>
      </div>
    </div>
    ${pls.map(p => `
    <div class="sheet-item" data-pl="${escAttr(p.name)}">
      <div class="sheet-item__icon sheet-item__icon--pl">
        <svg viewBox="0 0 24 24"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
      </div>
      <div>
        <div class="sheet-item__label">${escHtml(p.name)}</div>
        <div class="sheet-item__sub">${p.tracks.length} ${pl(p.tracks.length)}</div>
      </div>
    </div>`).join("")}
  `;

  sheetOverlay.classList.remove("hidden");
  addSheet.classList.remove("hidden");

  document.getElementById("sheet-fav").addEventListener("click", () => {
    addToFav(pendingTrack);
    closeSheet();
    showToast("Добавлено в Избранные");
    // Обновить лайк-кнопку в треке
    refreshLikeBtn(pendingTrack.id);
  });

  sheetList.querySelectorAll("[data-pl]").forEach(el => {
    el.addEventListener("click", () => {
      addToPlaylist(el.dataset.pl, pendingTrack);
      closeSheet();
      showToast(`Добавлено в «${el.dataset.pl}»`);
      refreshLikeBtn(pendingTrack.id);
    });
  });
}

function closeSheet() {
  sheetOverlay.classList.add("hidden");
  addSheet.classList.add("hidden");
  pendingTrack = null;
}

sheetCancel.addEventListener("click", closeSheet);
sheetOverlay.addEventListener("click", closeSheet);


/* ════════════════════════════════════════
   RENDER TRACKS
════════════════════════════════════════ */
function renderTracks(tracks, container, opts = {}) {
  container.innerHTML = "";
  if (!tracks.length) {
    container.innerHTML = `<div class="msg-empty">Ничего не найдено</div>`;
    return;
  }

  // Если не в block-режиме — оборачиваем в карточку
  const useGroup = opts.noGroup !== true;

  if (opts.title) {
    const h = document.createElement("div");
    h.className = "section-header";
    h.textContent = opts.title;
    container.appendChild(h);
  }

  const group = useGroup ? document.createElement("div") : container;
  if (useGroup) { group.className = "tracks-group"; container.appendChild(group); }

  tracks.forEach(track => {
    const liked = isFav(track.id);
    const hasPrev = !!track.preview;
    const el = document.createElement("div");
    el.className = "track";
    el.dataset.trackId = track.id;

    el.innerHTML = `
      <img class="cover" src="${track.album.cover_medium}"
           onerror="this.src='https://e-cdns-images.dzcdn.net/images/cover/no-cover.jpg'" alt="">
      <div class="trackMeta">
        <div class="trackTitle">${escHtml(track.title)}</div>
        <div class="trackArtist">${escHtml(track.artist.name)}</div>
      </div>
      <div class="trackActions">

        <!-- ЛАЙК / ADD -->
        <button class="icon-btn icon-btn--like ${liked ? "liked" : ""}" aria-label="В избранное">
          <svg viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
        </button>

        <!-- ОТПРАВИТЬ В БОТ -->
        <button class="icon-btn icon-btn--send" aria-label="Отправить в бот">
          <svg viewBox="0 0 24 24"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22,2 15,22 11,13 2,9"/></svg>
        </button>

        <!-- ПРЕВЬЮ -->
        ${hasPrev
          ? `<button class="preview-btn" aria-label="Слушать"><svg viewBox="0 0 24 24"><polygon points="5,3 19,12 5,21"/></svg></button>`
          : `<div class="no-preview">—</div>`}

      </div>
    `;

    group.appendChild(el);

    // ── ЛАЙК → открыть шит выбора
    el.querySelector(".icon-btn--like").addEventListener("click", (e) => {
      e.stopPropagation();
      const pls = getPls();

      if (liked || isFav(track.id)) {
        // уже лайкнут — убрать из избранного
        removeFromFav(track.id);
        el.querySelector(".icon-btn--like").classList.remove("liked");
        showToast("Убрано из Избранных");
        return;
      }

      if (pls.length === 0) {
        // нет кастомных плейлистов — сразу в избранное
        addToFav(track);
        el.querySelector(".icon-btn--like").classList.add("liked");
        window.Telegram?.WebApp?.HapticFeedback?.impactOccurred("light");
        showToast("Добавлено в Избранные");
        return;
      }

      // Есть плейлисты — показать шит
      openAddSheet(track);
    });

    // ── ОТПРАВИТЬ В БОТ (заглушка)
    el.querySelector(".icon-btn--send").addEventListener("click", () => {
      showToast("Скоро: отправка в бот");
      /* TODO: раскомментировать после интеграции бота
      const tg = window.Telegram?.WebApp;
      if (tg) tg.sendData(JSON.stringify({ action:"request_track", id: String(track.id), title: track.title, artist: track.artist.name }));
      */
    });

    // ── ПРЕВЬЮ
    if (hasPrev) {
      el.querySelector(".preview-btn").addEventListener("click", () => {
        playTrack(track.preview, track.title, track.artist.name, track.album.cover_medium, el.querySelector(".preview-btn"));
      });
    }
  });
}

// Обновить иконку лайка по id (без ре-рендера)
function refreshLikeBtn(trackId) {
  document.querySelectorAll(`.track[data-track-id="${trackId}"] .icon-btn--like`).forEach(btn => {
    btn.classList.toggle("liked", isFav(trackId));
  });
}


/* ════════════════════════════════════════
   PLAYLIST BLOCKS — ACCORDION (page 2)
════════════════════════════════════════ */
["plFav","plNew","plImport"].forEach(id => {
  const block  = document.getElementById(id);
  const row    = block.querySelector(".pl-block__row");
  row.addEventListener("click", () => {
    const isOpen = block.classList.contains("open");
    document.querySelectorAll(".pl-block").forEach(b => b.classList.remove("open"));
    if (!isOpen) {
      block.classList.add("open");
      if (id === "plFav") renderFavList();
      if (id === "plNew") renderCustomPlaylists();
    }
  });
});

function renderFavList() {
  const favs = getFavs();
  const container = document.getElementById("favTracks");
  container.innerHTML = "";
  if (!favs.length) {
    container.innerHTML = `<div class="msg-empty">Нет избранных треков</div>`;
    return;
  }
  renderTracks(favs, container, { noGroup: false });
}


/* ════════════════════════════════════════
   CUSTOM PLAYLISTS
════════════════════════════════════════ */
document.getElementById("createPlaylistBtn").addEventListener("click", () => {
  const name = document.getElementById("newPlaylistName").value.trim();
  if (!name) { showToast("Введи название плейлиста"); return; }
  const pls = getPls();
  if (pls.find(p => p.name === name)) { showToast("Такой плейлист уже есть"); return; }
  pls.push({ name, tracks: [], created: Date.now() });
  savePls(pls);
  document.getElementById("newPlaylistName").value = "";
  renderCustomPlaylists();
  showToast(`Плейлист «${name}» создан`);
});

function renderCustomPlaylists() {
  const container = document.getElementById("customPlaylists");
  const pls = getPls();
  container.innerHTML = "";

  if (!pls.length) {
    container.innerHTML = `<div class="msg-empty">Нет созданных плейлистов</div>`;
    return;
  }

  pls.forEach((p, i) => {
    const row = document.createElement("div");
    row.className = "cp-row";
    row.innerHTML = `
      <div class="cp-artwork">
        <svg viewBox="0 0 24 24"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
      </div>
      <div class="cp-info">
        <div class="cp-name">${escHtml(p.name)}</div>
        <div class="cp-sub">${p.tracks.length} ${pl(p.tracks.length)}</div>
      </div>
      <button class="icon-btn" data-del="${i}" aria-label="Удалить" style="color:var(--red)">
        <svg viewBox="0 0 24 24"><polyline points="3,6 5,6 21,6"/><path d="M19,6l-1,14H6L5,6"/><path d="M9,6V4h6v2"/></svg>
      </button>
    `;

    // Открыть плейлист
    row.querySelector(".cp-info").addEventListener("click", () => openPlaylistPage(p.name));
    row.querySelector(".cp-artwork").addEventListener("click", () => openPlaylistPage(p.name));

    // Удалить
    row.querySelector("[data-del]").addEventListener("click", (e) => {
      e.stopPropagation();
      const pls = getPls();
      const name = pls[i].name;
      pls.splice(i, 1);
      savePls(pls);
      renderCustomPlaylists();
      showToast(`«${name}» удалён`);
    });

    container.appendChild(row);
  });
}


/* ════════════════════════════════════════
   PAGE 3 — PLAYLIST VIEW
════════════════════════════════════════ */
let currentPlaylistName = "";

function openPlaylistPage(name) {
  currentPlaylistName = name;
  document.getElementById("page3Title").textContent = name;
  renderPlaylistPage();
  goTo("page3");
}

function renderPlaylistPage() {
  const pls   = getPls();
  const pl3   = pls.find(p => p.name === currentPlaylistName);
  const empty = document.getElementById("page3Empty");
  const cont  = document.getElementById("page3Tracks");

  cont.innerHTML = "";
  if (!pl3 || !pl3.tracks.length) {
    empty.classList.remove("hidden");
    return;
  }
  empty.classList.add("hidden");
  renderTracks(pl3.tracks, cont);
}


/* ════════════════════════════════════════
   IMPORT TABS
════════════════════════════════════════ */
document.querySelectorAll(".seg-tab").forEach(tab => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".seg-tab").forEach(t => t.classList.remove("active"));
    document.querySelectorAll(".import-pane").forEach(p => p.classList.remove("active"));
    tab.classList.add("active");
    document.getElementById(`pane-${tab.dataset.src}`).classList.add("active");
  });
});

// Spotify — заглушка
document.getElementById("spotifyImportBtn").addEventListener("click", () => {
  const url = document.getElementById("spotifyUrl").value.trim();
  const res = document.getElementById("spotifyResult");
  if (!url) { showToast("Вставь ссылку"); return; }
  res.innerHTML = `<div class="msg-empty">Импорт из Spotify будет доступен после подключения бота.</div>`;
  /* TODO: tg.sendData({ action:"import_spotify", url }); */
});

// SoundCloud → поиск в Deezer
document.getElementById("scImportBtn").addEventListener("click", async () => {
  const url = document.getElementById("scUrl").value.trim();
  const res = document.getElementById("scResult");
  if (!url) { showToast("Вставь ссылку"); return; }
  const q = url.replace(/\/$/, "").split("/").pop().replace(/-/g, " ");
  res.innerHTML = `<div class="msg-empty"><div class="spin" style="margin:0 auto 8px"></div>Ищем «${q}»…</div>`;
  try {
    const tracks = await deezerSearch(q, 12);
    res.innerHTML = "";
    renderTracks(tracks, res, { title: "Найдено в Deezer" });
  } catch {
    res.innerHTML = `<div class="msg-empty">Ошибка поиска</div>`;
  }
});

// VK → поиск в Deezer
document.getElementById("vkImportBtn").addEventListener("click", async () => {
  const q   = document.getElementById("vkQuery").value.trim();
  const res = document.getElementById("vkResult");
  if (!q) { showToast("Введи запрос"); return; }
  res.innerHTML = `<div class="msg-empty"><div class="spin" style="margin:0 auto 8px"></div>Ищем…</div>`;
  try {
    const tracks = await deezerSearch(q, 15);
    res.innerHTML = "";
    renderTracks(tracks, res, { title: "Найдено в Deezer" });
  } catch {
    res.innerHTML = `<div class="msg-empty">Ошибка поиска</div>`;
  }
});


/* ════════════════════════════════════════
   PLAYER
════════════════════════════════════════ */
const audio        = document.getElementById("audioPlayer");
const playerBar    = document.getElementById("playerBar");
const playerCover  = document.getElementById("playerCover");
const playerTitle  = document.getElementById("playerTitle");
const playerArtist = document.getElementById("playerArtist");
const playPauseBtn = document.getElementById("playPauseBtn");
const playIcon     = document.getElementById("playIcon");
const pauseIcon    = document.getElementById("pauseIcon");
let activeBtn      = null;

function playTrack(url, title, artist, cover, btn) {
  if (activeBtn === btn && !audio.paused) { audio.pause(); setPlaying(false); return; }
  if (activeBtn === btn && audio.paused)  { audio.play();  setPlaying(true);  return; }
  activeBtn?.classList.remove("playing");
  activeBtn = btn;
  btn.classList.add("playing");
  audio.src = url; audio.play();
  playerCover.src = cover;
  playerTitle.textContent  = title;
  playerArtist.textContent = artist;
  playerBar.classList.remove("hidden");
  setPlaying(true);
}
function setPlaying(v) {
  playIcon.classList.toggle("hidden", v);
  pauseIcon.classList.toggle("hidden", !v);
}
playPauseBtn.addEventListener("click", () => {
  if (audio.paused) { audio.play(); setPlaying(true);  activeBtn?.classList.add("playing"); }
  else              { audio.pause(); setPlaying(false); activeBtn?.classList.remove("playing"); }
});
audio.addEventListener("ended", () => { setPlaying(false); activeBtn?.classList.remove("playing"); });


/* ════════════════════════════════════════
   TOAST
════════════════════════════════════════ */
let toastTimer = null;
function showToast(msg) {
  let t = document.getElementById("toast");
  if (!t) {
    t = document.createElement("div");
    t.id = "toast";
    t.style.cssText = `
      position:fixed; bottom:90px; left:50%;
      transform:translateX(-50%) translateY(10px);
      background:var(--toast-bg, rgba(20,20,20,.88));
      color:var(--toast-color, #fff);
      padding:9px 18px; border-radius:20px;
      font-size:14px; font-family:inherit;
      pointer-events:none; opacity:0;
      transition:opacity .18s, transform .18s;
      white-space:nowrap; z-index:999;
      backdrop-filter:blur(16px); -webkit-backdrop-filter:blur(16px);
    `;
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.style.opacity = "1";
  t.style.transform = "translateX(-50%) translateY(0)";
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    t.style.opacity = "0";
    t.style.transform = "translateX(-50%) translateY(10px)";
  }, 2200);
}


/* ════════════════════════════════════════
   HELPERS
════════════════════════════════════════ */
function escHtml(s) {
  return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}
function escAttr(s) { return String(s).replace(/"/g,"&quot;"); }
