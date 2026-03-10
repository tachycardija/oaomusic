const tg = window.Telegram.WebApp;

tg.ready();
tg.expand();

// Сообщаем Telegram что готовы
tg.setHeaderColor("secondary_bg_color");
tg.setBackgroundColor("bg_color");

// Определяем тему (dark / light) и выставляем CSS-переменные
function applyTheme() {
  const isDark = tg.colorScheme === "dark";
  const root   = document.documentElement;

  // Separator — в тёмной теме делаем светлее
  root.style.setProperty("--sep",      isDark ? "rgba(255,255,255,.10)" : "rgba(60,60,67,.12)");
  // Hover треков
  root.style.setProperty("--track-hover", isDark ? "rgba(255,255,255,.06)" : "rgba(0,0,0,.04)");
  // Тень карточек
  root.style.setProperty("--shadow",   isDark ? "rgba(0,0,0,.4)"  : "rgba(0,0,0,.08)");
  // Оверлей шита
  root.style.setProperty("--overlay",  isDark ? "rgba(0,0,0,.6)"  : "rgba(0,0,0,.4)");
  // Toast фон
  root.style.setProperty("--toast-bg", isDark ? "rgba(255,255,255,.15)" : "rgba(20,20,20,.88)");
  root.style.setProperty("--toast-color", isDark ? "#fff" : "#fff");

  // Акцент — берём из кнопки Telegram если доступен
  if (tg.themeParams?.button_color) {
    root.style.setProperty("--accent",      tg.themeParams.button_color);
    root.style.setProperty("--accent-soft", hexToRgba(tg.themeParams.button_color, .13));
    root.style.setProperty("--btn-bg",      tg.themeParams.button_color);
  }
  if (tg.themeParams?.button_text_color) {
    root.style.setProperty("--btn-text", tg.themeParams.button_text_color);
  }
  if (tg.themeParams?.destructive_text_color) {
    root.style.setProperty("--red",      tg.themeParams.destructive_text_color);
    root.style.setProperty("--red-soft", hexToRgba(tg.themeParams.destructive_text_color, .12));
  }

  root.setAttribute("data-theme", isDark ? "dark" : "light");
}

function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1,3),16);
  const g = parseInt(hex.slice(3,5),16);
  const b = parseInt(hex.slice(5,7),16);
  return `rgba(${r},${g},${b},${alpha})`;
}

// Применить сразу и при смене темы
applyTheme();
tg.onEvent("themeChanged", applyTheme);
