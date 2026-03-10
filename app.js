/* ════════════════════════════════════════
   LOADER
════════════════════════════════════════ */
const loaderEl    = document.getElementById("loader");
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
let prevPage = "page1";

function goTo(id, isBack = false) {
  const cur = document.querySelector(".page.active");
  if (cur) prevPage = cur.id;
  document.querySelectorAll(".page").forEach(p => p.classList.remove("active", "back-in"));
  const next = document.getElementById(id);
  next.classList.add("active");
  if (isBack) next.classList.add("back-in");
}

document.getElementById("goToPlaylists").addEventListener("click", () => {
  updateFavCount();
  renderCustomPlaylistBlocks();
  goTo("page2");
});
document.getElementById("backToSearch").addEventListener("click",    () => goTo("page1", true));
document.getElementById("backToPlaylists").addEventListener("click", () => goTo("page2", true));
document.getElementById("backFromArtist").addEventListener("click",  () => goTo(prevPage, true));


/* ════════════════════════════════════════
   SOURCE TABS (поиск)
════════════════════════════════════════ */
let activeSource = "deezer";

document.querySelectorAll(".source-tab").forEach(tab => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".source-tab").forEach(t => t.classList.remove("active"));
    tab.classList.add("active");
    activeSource = tab.dataset.src;
    // Сбросить результаты
    document.getElementById("results").innerHTML = "";
    document.getElementById("emptyState").style.display = "flex";
    document.getElementById("searchInput").value = "";
    document.getElementById("clearSearch").classList.add("hidden");
  });
});


/* ════════════════════════════════════════
   SEARCH
════════════════════════════════════════ */
const searchInput  = document.getElementById("searchInput");
const clearBtn     = document.getElementById("clearSearch");
const resultsEl    = document.getElementById("results");
const emptyEl      = document.getElementById("emptyState");
const searchLoader = document.getElementById("searchLoader");
let   searchTimer  = null;

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

  searchTimer = setTimeout(() => doSearch(q.trim()), 380);
});

clearBtn.addEventListener("click", () => {
  searchInput.value = "";
  clearBtn.classList.add("hidden");
  resultsEl.innerHTML = "";
  emptyEl.style.display = "flex";
  searchInput.focus();
});

async function doSearch(q) {
  if (activeSource === "vk" || activeSource === "sc") {
    searchLoader.classList.add("hidden");
    resultsEl.innerHTML = `
      <div class="stub-banner">
        <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        <div>
          <div class="stub-banner__title">Скоро будет доступно</div>
          <div class="stub-banner__sub">Поиск через ${activeSource === "vk" ? "ВКонтакте" : "SoundCloud"} подключится после интеграции бота</div>
        </div>
      </div>`;
    return;
  }

  // Deezer
  try {
    const tracks = await withTimeout(deezerSearch(q, 25), 8000);
    searchLoader.classList.add("hidden");
    renderTracks(tracks, resultsEl);
  } catch (e) {
    searchLoader.classList.add("hidden");
    if (e.message === "timeout") {
      resultsEl.innerHTML = `<div class="msg-empty">Попробуй чуть позже…</div>`;
    } else {
      resultsEl.innerHTML = `<div class="msg-empty">Ошибка поиска. Проверь соединение.</div>`;
    }
  }
}


/* ════════════════════════════════════════
   TIMEOUT HELPER
════════════════════════════════════════ */
function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), ms))
  ]);
}


/* ════════════════════════════════════════
   DEEZER API  (debounced, cached)
════════════════════════════════════════ */
let dzCbIdx = 0;
const dzCache = new Map();

function deezerJSONP(url) {
  if (dzCache.has(url)) return Promise.resolve(dzCache.get(url));
  return new Promise((resolve, reject) => {
    const cb = `_dz${dzCbIdx++}`;
    const s  = document.createElement("script");
    s.src    = `${url}&output=jsonp&callback=${cb}`;
    const t  = setTimeout(() => { cleanup(); reject(new Error("timeout")); }, 8000);
    window[cb] = (d) => { cleanup(); dzCache.set(url, d); resolve(d); };
    s.onerror  = () => { cleanup(); reject(new Error("net")); };
    function cleanup() { clearTimeout(t); delete window[cb]; s.remove(); }
    document.head.appendChild(s);
  });
}

async function deezerSearch(q, limit = 20) {
  const d = await deezerJSONP(`https://api.deezer.com/search?q=${encodeURIComponent(q)}&limit=${limit}`);
  return d.data || [];
}

async function deezerArtistTracks(artistId) {
  const d = await deezerJSONP(`https://api.deezer.com/artist/${artistId}/top?limit=20`);
  return d.data || [];
}

async function deezerArtistInfo(artistId) {
  const d = await deezerJSONP(`https://api.deezer.com/artist/${artistId}?`);
  return d;
}


/* ════════════════════════════════════════
   STORAGE
════════════════════════════════════════ */
const LS_FAV = "oao_favorites";
const LS_PL  = "oao_playlists";

function getFavs() { try { return JSON.parse(localStorage.getItem(LS_FAV) || "[]"); } catch { return []; } }
function getPls()  { try { return JSON.parse(localStorage.getItem(LS_PL)  || "[]"); } catch { return []; } }
function saveFavs(a){ localStorage.setItem(LS_FAV, JSON.stringify(a)); }
function savePls(a) { localStorage.setItem(LS_PL,  JSON.stringify(a)); }

function isFav(id) { return getFavs().some(t => t.id === id); }
function addToFav(track) {
  const f = getFavs(); if (!f.find(t => t.id === track.id)) { f.unshift(track); saveFavs(f); } updateFavCount();
}
function removeFromFav(id) { saveFavs(getFavs().filter(t => t.id !== id)); updateFavCount(); }

function addToPl(name, track) {
  const pls = getPls(), pl = pls.find(p => p.name === name);
  if (!pl || pl.tracks.find(t => t.id === track.id)) return;
  pl.tracks.unshift(track); savePls(pls);
}

function updateFavCount() {
  const n = getFavs().length;
  document.getElementById("favCount").textContent = `${n} ${plWord(n)}`;
}

function plWord(n) {
  if (n % 10 === 1 && n % 100 !== 11) return "трек";
  if ([2,3,4].includes(n%10) && ![12,13,14].includes(n%100)) return "трека";
  return "треков";
}


/* ════════════════════════════════════════
   RENDER TRACKS
════════════════════════════════════════ */
function renderTracks(tracks, container, opts = {}) {
  container.innerHTML = "";
  if (!tracks.length) {
    container.innerHTML = `<div class="msg-empty">Ничего не найдено</div>`;
    return;
  }

  if (opts.title) {
    const h = document.createElement("div");
    h.className = "section-header"; h.textContent = opts.title;
    container.appendChild(h);
  }

  const group = document.createElement("div");
  group.className = "tracks-group";
  container.appendChild(group);

  tracks.forEach(track => {
    const liked   = isFav(track.id);
    const hasPrev = !!track.preview;
    const el = document.createElement("div");
    el.className = "track"; el.dataset.trackId = track.id;

    el.innerHTML = `
      <img class="cover" src="${track.album?.cover_medium || ''}"
           onerror="this.src='https://e-cdns-images.dzcdn.net/images/cover/no-cover.jpg'" alt="">
      <div class="trackMeta">
        <div class="trackTitle">${escHtml(track.title)}</div>
        <div class="trackArtist artist-link" data-artist-id="${track.artist.id}" data-artist-name="${escAttr(track.artist.name)}">${escHtml(track.artist.name)}</div>
      </div>
      <div class="trackActions">
        <button class="icon-btn icon-btn--like ${liked ? "liked" : ""}" aria-label="Лайк">
          <svg viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
        </button>
        <button class="icon-btn icon-btn--share" aria-label="Поделиться">
          <svg viewBox="0 0 24 24"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
        </button>
        <button class="icon-btn icon-btn--send" aria-label="В бот">
          <svg viewBox="0 0 24 24"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22,2 15,22 11,13 2,9"/></svg>
        </button>
        ${hasPrev
          ? `<button class="preview-btn"><svg viewBox="0 0 24 24"><polygon points="5,3 19,12 5,21"/></svg></button>`
          : `<div class="no-preview">—</div>`}
      </div>`;

    group.appendChild(el);

    // АРТИСТ — клик
    el.querySelector(".artist-link").addEventListener("click", () => {
      openArtistPage(track.artist.id, track.artist.name);
    });

    // ЛАЙК
    el.querySelector(".icon-btn--like").addEventListener("click", (e) => {
      e.stopPropagation();
      if (isFav(track.id)) {
        removeFromFav(track.id);
        el.querySelector(".icon-btn--like").classList.remove("liked");
        showToast("Убрано из Избранных");
        return;
      }
      const pls = getPls();
      if (!pls.length) {
        addToFav(track);
        el.querySelector(".icon-btn--like").classList.add("liked");
        window.Telegram?.WebApp?.HapticFeedback?.impactOccurred("light");
        showToast("Добавлено в Избранные");
      } else {
        openAddSheet(track, el.querySelector(".icon-btn--like"));
      }
    });

    // ПОДЕЛИТЬСЯ
    el.querySelector(".icon-btn--share").addEventListener("click", () => {
      shareTrack(track);
    });

    // ОТПРАВИТЬ В БОТ (заглушка)
    el.querySelector(".icon-btn--send").addEventListener("click", () => {
      showToast("Скоро: отправка трека в бот");
      /* TODO: подключить после интеграции бота
      window.Telegram?.WebApp?.sendData(JSON.stringify({ action:"request_track", id: String(track.id), title: track.title, artist: track.artist.name }));
      */
    });

    // ПРЕВЬЮ
    if (hasPrev) {
      el.querySelector(".preview-btn").addEventListener("click", () => {
        playTrack(track.preview, track.title, track.artist.name, track.album?.cover_medium, track, el.querySelector(".preview-btn"));
      });
    }
  });
}


/* ════════════════════════════════════════
   SHARE TRACK
════════════════════════════════════════ */
function shareTrack(track) {
  const tg = window.Telegram?.WebApp;
  const text = `Слушаю на данный момент: ${track.artist.name} — ${track.title}`;
  if (tg) {
    try {
      tg.switchInlineQuery(text, ["users"]);
    } catch {
      showToast("Поделиться доступно только в Telegram");
    }
  } else {
    showToast("Поделиться доступно только в Telegram");
  }
}


/* ════════════════════════════════════════
   ARTIST PAGE
════════════════════════════════════════ */
async function openArtistPage(artistId, artistName) {
  document.getElementById("artistPageName").textContent = artistName;
  document.getElementById("artistHeader").innerHTML = `<div class="loader-wrap"><div class="spin"></div></div>`;
  document.getElementById("artistTracks").innerHTML = "";
  goTo("page4");

  try {
    const [info, topTracks] = await Promise.all([
      withTimeout(deezerArtistInfo(artistId), 8000),
      withTimeout(deezerArtistTracks(artistId), 8000)
    ]);

    document.getElementById("artistHeader").innerHTML = `
      <div class="artist-header">
        <img class="artist-header__img" src="${info.picture_medium || ''}" alt="${escHtml(artistName)}"
             onerror="this.style.display='none'">
        <div class="artist-header__info">
          <div class="artist-header__name">${escHtml(info.name || artistName)}</div>
          <div class="artist-header__fans">${info.nb_fan ? formatFans(info.nb_fan) + " слушателей" : ""}</div>
        </div>
      </div>`;

    if (topTracks.length) {
      const container = document.getElementById("artistTracks");
      const h = document.createElement("div");
      h.className = "section-header"; h.textContent = "Популярные треки";
      container.appendChild(h);
      renderTracks(topTracks, container);
    }
  } catch {
    document.getElementById("artistHeader").innerHTML = `<div class="msg-empty">Попробуй чуть позже…</div>`;
  }
}

function formatFans(n) {
  if (n >= 1000000) return (n/1000000).toFixed(1) + "M";
  if (n >= 1000)    return (n/1000).toFixed(0) + "K";
  return String(n);
}


/* ════════════════════════════════════════
   ADD-TO SHEET
════════════════════════════════════════ */
const sheetOverlay = document.getElementById("sheetOverlay");
const addSheet     = document.getElementById("addSheet");
const sheetList    = document.getElementById("sheetList");
const sheetTitle   = document.getElementById("sheetTitle");

function openAddSheet(track, likeBtn) {
  const pls = getPls();
  sheetTitle.textContent = "Добавить в…";
  sheetList.innerHTML = `
    <div class="sheet-item" id="sheet-fav">
      <div class="sheet-item__icon sheet-item__icon--fav">
        <svg viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
      </div>
      <div><div class="sheet-item__label">Избранные</div></div>
    </div>
    ${pls.map(p => `
    <div class="sheet-item" data-pl="${escAttr(p.name)}">
      <div class="sheet-item__icon sheet-item__icon--blue">
        <svg viewBox="0 0 24 24"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
      </div>
      <div><div class="sheet-item__label">${escHtml(p.name)}</div><div class="sheet-item__sub">${p.tracks.length} ${plWord(p.tracks.length)}</div></div>
    </div>`).join("")}`;

  sheetOverlay.classList.remove("hidden");
  addSheet.classList.remove("hidden");

  document.getElementById("sheet-fav").onclick = () => {
    addToFav(track); likeBtn?.classList.add("liked");
    closeSheet(); showToast("Добавлено в Избранные");
    window.Telegram?.WebApp?.HapticFeedback?.impactOccurred("light");
  };
  sheetList.querySelectorAll("[data-pl]").forEach(el => {
    el.onclick = () => {
      addToPl(el.dataset.pl, track); likeBtn?.classList.add("liked");
      closeSheet(); showToast(`Добавлено в «${el.dataset.pl}»`);
    };
  });
}

function closeSheet() {
  sheetOverlay.classList.add("hidden");
  addSheet.classList.add("hidden");
}
document.getElementById("sheetCancel").addEventListener("click", closeSheet);
sheetOverlay.addEventListener("click", closeSheet);


/* ════════════════════════════════════════
   FAB — плюс кнопка
════════════════════════════════════════ */
const fabSheetOverlay  = document.getElementById("fabSheetOverlay");
const fabSheet         = document.getElementById("fabSheet");
const createSheetOvl   = document.getElementById("createSheetOverlay");
const createSheet      = document.getElementById("createSheet");
const importSheetOvl   = document.getElementById("importSheetOverlay");
const importSheetEl    = document.getElementById("importSheet");

document.getElementById("fabBtn").addEventListener("click", () => {
  fabSheetOverlay.classList.remove("hidden");
  fabSheet.classList.remove("hidden");
});

function closeFabSheet() {
  fabSheetOverlay.classList.add("hidden");
  fabSheet.classList.add("hidden");
}
document.getElementById("fabSheetCancel").addEventListener("click", closeFabSheet);
fabSheetOverlay.addEventListener("click", closeFabSheet);

// Создать плейлист
document.getElementById("fabCreateBtn").addEventListener("click", () => {
  closeFabSheet();
  setTimeout(() => {
    createSheetOvl.classList.remove("hidden");
    createSheet.classList.remove("hidden");
    document.getElementById("newPlaylistName").focus();
  }, 150);
});

function closeCreateSheet() {
  createSheetOvl.classList.add("hidden");
  createSheet.classList.add("hidden");
  document.getElementById("newPlaylistName").value = "";
}
document.getElementById("createSheetCancel").addEventListener("click", closeCreateSheet);
createSheetOvl.addEventListener("click", closeCreateSheet);

document.getElementById("createPlaylistBtn").addEventListener("click", () => {
  const name = document.getElementById("newPlaylistName").value.trim();
  if (!name) { showToast("Введи название"); return; }
  const pls = getPls();
  if (pls.find(p => p.name === name)) { showToast("Такой плейлист уже есть"); return; }
  pls.push({ name, tracks: [], created: Date.now() });
  savePls(pls);
  closeCreateSheet();
  renderCustomPlaylistBlocks();
  showToast(`Плейлист «${name}» создан`);
});

// Импорт плейлиста
document.getElementById("fabImportBtn").addEventListener("click", () => {
  closeFabSheet();
  setTimeout(() => {
    importSheetOvl.classList.remove("hidden");
    importSheetEl.classList.remove("hidden");
  }, 150);
});

function closeImportSheet() {
  importSheetOvl.classList.add("hidden");
  importSheetEl.classList.add("hidden");
}
document.getElementById("importSheetCancel").addEventListener("click", closeImportSheet);
importSheetOvl.addEventListener("click", closeImportSheet);

// Import sheet seg tabs
document.querySelectorAll("#importSheet .seg-tab").forEach(tab => {
  tab.addEventListener("click", () => {
    document.querySelectorAll("#importSheet .seg-tab").forEach(t => t.classList.remove("active"));
    document.querySelectorAll("#importSheet .import-pane").forEach(p => p.classList.remove("active"));
    tab.classList.add("active");
    document.getElementById(`ipane-${tab.dataset.src}`).classList.add("active");
  });
});

// Spotify — заглушка
document.getElementById("importSpotifyBtn").addEventListener("click", () => {
  document.getElementById("importSpotifyResult").innerHTML =
    `<div class="msg-empty">Импорт из Spotify будет доступен после подключения бота</div>`;
});

// SoundCloud → Deezer
document.getElementById("importScBtn").addEventListener("click", async () => {
  const url = document.getElementById("importScUrl").value.trim();
  const res = document.getElementById("importScResult");
  if (!url) { showToast("Вставь ссылку"); return; }
  const q = url.replace(/\/$/, "").split("/").pop().replace(/-/g, " ");
  res.innerHTML = `<div class="msg-empty"><div class="spin" style="margin:0 auto 8px"></div>Ищем…</div>`;
  try {
    const tracks = await withTimeout(deezerSearch(q, 12), 8000);
    res.innerHTML = "";
    renderTracks(tracks, res, { title: "Найдено в Deezer" });
  } catch {
    res.innerHTML = `<div class="msg-empty">Попробуй чуть позже…</div>`;
  }
});

// VK → Deezer
document.getElementById("importVkBtn").addEventListener("click", async () => {
  const q   = document.getElementById("importVkQuery").value.trim();
  const res = document.getElementById("importVkResult");
  if (!q) { showToast("Введи запрос"); return; }
  res.innerHTML = `<div class="msg-empty"><div class="spin" style="margin:0 auto 8px"></div>Ищем…</div>`;
  try {
    const tracks = await withTimeout(deezerSearch(q, 15), 8000);
    res.innerHTML = "";
    renderTracks(tracks, res, { title: "Найдено в Deezer" });
  } catch {
    res.innerHTML = `<div class="msg-empty">Попробуй чуть позже…</div>`;
  }
});


/* ════════════════════════════════════════
   PLAYLIST BLOCKS (page 2)
════════════════════════════════════════ */
// Избранные — аккордеон
document.getElementById("plFav").querySelector(".pl-block__row").addEventListener("click", () => {
  const block = document.getElementById("plFav");
  const isOpen = block.classList.contains("open");
  document.querySelectorAll(".pl-block").forEach(b => b.classList.remove("open"));
  if (!isOpen) { block.classList.add("open"); renderFavList(); }
});

function renderFavList() {
  const favs = getFavs();
  const c    = document.getElementById("favTracks");
  c.innerHTML = "";
  if (!favs.length) { c.innerHTML = `<div class="msg-empty">Нет избранных треков</div>`; return; }
  renderTracks(favs, c);
}

function renderCustomPlaylistBlocks() {
  const container = document.getElementById("customPlaylistBlocks");
  const pls = getPls();
  container.innerHTML = "";

  pls.forEach((p, i) => {
    const block = document.createElement("div");
    block.className = "pl-block";
    block.innerHTML = `
      <div class="pl-block__row">
        <div class="pl-block__artwork pl-block__artwork--blue">
          <svg viewBox="0 0 24 24"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
        </div>
        <div class="pl-block__info">
          <div class="pl-block__name">${escHtml(p.name)}</div>
          <div class="pl-block__sub">${p.tracks.length} ${plWord(p.tracks.length)}</div>
        </div>
        <button class="icon-btn" style="color:var(--red)" data-del="${i}" aria-label="Удалить">
          <svg viewBox="0 0 24 24"><polyline points="3,6 5,6 21,6"/><path d="M19,6l-1,14H6L5,6"/><path d="M9,6V4h6v2"/></svg>
        </button>
        <svg class="pl-block__chev" viewBox="0 0 24 24"><polyline points="9,18 15,12 9,6"/></svg>
      </div>
      <div class="pl-block__body">
        <div class="pl-block__inner pl-tracks-${i}"></div>
      </div>`;

    // Раскрыть
    block.querySelector(".pl-block__row .pl-block__info").addEventListener("click", () => {
      const isOpen = block.classList.contains("open");
      document.querySelectorAll(".pl-block").forEach(b => b.classList.remove("open"));
      if (!isOpen) {
        block.classList.add("open");
        const c = block.querySelector(`.pl-tracks-${i}`);
        c.innerHTML = "";
        const tracks = getPls()[i]?.tracks || [];
        if (!tracks.length) { c.innerHTML = `<div class="msg-empty">Плейлист пуст</div>`; }
        else renderTracks(tracks, c);
      }
    });
    block.querySelector(".pl-block__artwork").addEventListener("click", () => {
      block.querySelector(".pl-block__info").click();
    });

    // Удалить
    block.querySelector("[data-del]").addEventListener("click", (e) => {
      e.stopPropagation();
      const pls = getPls(), name = pls[i].name;
      pls.splice(i, 1); savePls(pls);
      renderCustomPlaylistBlocks();
      showToast(`«${name}» удалён`);
    });

    container.appendChild(block);
  });
}


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
let   activeBtn    = null;
let   currentTrack = null;

function playTrack(url, title, artist, cover, trackObj, btn) {
  if (activeBtn === btn && !audio.paused) { audio.pause(); setPlaying(false); return; }
  if (activeBtn === btn && audio.paused)  { audio.play();  setPlaying(true);  return; }
  activeBtn?.classList.remove("playing");
  activeBtn    = btn;
  currentTrack = trackObj;
  btn.classList.add("playing");
  audio.src = url; audio.play();
  playerCover.src          = cover || "";
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

// Поделиться из плеера
document.getElementById("playerShareBtn").addEventListener("click", () => {
  if (currentTrack) shareTrack(currentTrack);
});


/* ════════════════════════════════════════
   TOAST
════════════════════════════════════════ */
let toastTimer = null;
function showToast(msg) {
  let t = document.getElementById("toast");
  if (!t) {
    t = document.createElement("div"); t.id = "toast";
    t.style.cssText = `position:fixed;bottom:96px;left:50%;transform:translateX(-50%) translateY(10px);
      background:var(--toast-bg,rgba(20,20,20,.88));color:#fff;padding:9px 18px;border-radius:20px;
      font-size:14px;font-family:inherit;pointer-events:none;opacity:0;
      transition:opacity .18s,transform .18s;white-space:nowrap;z-index:999;
      backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);`;
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.style.opacity = "1"; t.style.transform = "translateX(-50%) translateY(0)";
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    t.style.opacity = "0"; t.style.transform = "translateX(-50%) translateY(10px)";
  }, 2200);
}


/* ════════════════════════════════════════
   HELPERS
════════════════════════════════════════ */
function escHtml(s) {
  return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}
function escAttr(s) { return String(s).replace(/"/g,"&quot;"); }
