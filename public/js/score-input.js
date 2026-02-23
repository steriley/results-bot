// Vanilla JS module to attach to score input elements rendered by DateGroup
// Responsibilities:
// - Initialize inputs from localStorage
// - Validate and persist changes (debounced)
// - Emit `user:prediction:changed` CustomEvent on window

const PREFIX = 'userPrediction:';

function storageKey(gameId) {
  return `${PREFIX}${gameId}`;
}

function loadPrediction(gameId) {
  try {
    const raw = localStorage.getItem(storageKey(gameId));
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function savePrediction(gameId, home, away) {
  const payload = { home: Number(home), away: Number(away) };
  localStorage.setItem(storageKey(gameId), JSON.stringify(payload));
  window.dispatchEvent(
    new CustomEvent('user:prediction:changed', {
      detail: { gameId, ...payload },
    }),
  );
}

function clamp(v, min, max) {
  const n = Number(v);
  if (Number.isNaN(n)) return min;
  return Math.max(min, Math.min(max, n));
}

function init() {
  const inputs = Array.from(document.querySelectorAll('input[data-game-id]'));
  if (!inputs.length) return;

  const games = {};
  inputs.forEach((inp) => {
    const gameId = inp.getAttribute('data-game-id');
    const side = inp.getAttribute('data-side');
    if (!gameId || !side) return;
    games[gameId] = games[gameId] || { home: null, away: null };
    if (side === 'home') games[gameId].home = inp;
    if (side === 'away') games[gameId].away = inp;
  });

  Object.keys(games).forEach((gameId) => {
    const inputHome = games[gameId].home;
    const inputAway = games[gameId].away;
    if (!inputHome || !inputAway) return;

    const existing = loadPrediction(gameId);
    if (existing) {
      inputHome.value = existing.home ?? '';
      inputAway.value = existing.away ?? '';
    }

    let timeout = null;
    function scheduleSave() {
      if (timeout) clearTimeout(timeout);
      timeout = setTimeout(() => {
        const home = clamp(inputHome.value, 0, 20);
        const away = clamp(inputAway.value, 0, 20);
        inputHome.value = home;
        inputAway.value = away;
        savePrediction(gameId, home, away);
      }, 350);
    }

    inputHome.addEventListener('input', scheduleSave);
    inputAway.addEventListener('input', scheduleSave);
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

export {};
