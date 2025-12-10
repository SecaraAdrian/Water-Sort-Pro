// SETĂRI PRINCIPALE
const MAX_TUBES = 15;
const COLORS_PER_TUBE = 4;

// Hinturi – regenerare
const HINT_INTERVAL_MS = 10 * 60 * 1000; // 10 minute
const MAX_HINTS = 7;

// Culori lichid
const COLOR_SET = [
  "#ff3864", "#00e5a0", "#4da3ff",
  "#ffd166", "#c77dff", "#ff9f1c"
];

let currentLevel = parseInt(localStorage.getItem("level")) || 1;
let tubesData = [];
let selectedTube = null;
let hintsLeft = 3;
let soundEnabled = true;
let isPaused = false;
let lastHintTime = parseInt(localStorage.getItem("lastHintTime")) || null;

// ELEMENTE DOM
const pourSound  = document.getElementById("pour-sound");
const winSound   = document.getElementById("win-sound");
const wrongSound = document.getElementById("wrong-sound");

const container       = document.getElementById("tube-container");
const pauseBtn        = document.getElementById("pause-button");
const overlayBtn      = document.getElementById("pause-overlay-btn");
const hintLeftEl      = document.getElementById("hint-left");
const levelDisplayEl  = document.getElementById("level-display");
const winMessageEl    = document.getElementById("win-message");
const notificationBar = document.getElementById("notification-bar");
const extraHintBtn    = document.getElementById("extra-hint-btn");

// ================= TEMA LIGHT / DARK =================




// ================= NOTIFICĂRI ÎN JOC =================

function showNotification(message, duration = 3000) {
  if (!notificationBar) return;
  notificationBar.textContent = message;
  notificationBar.classList.add("visible");
  setTimeout(() => {
    notificationBar.classList.remove("visible");
  }, duration);
}

// ================= SALVARE / ÎNCĂRCARE STATE =================

function saveGameState() {
  const state = {
    level: currentLevel,
    tubesData,
    hintsLeft,
    lastHintTime
  };
  localStorage.setItem("gameState", JSON.stringify(state));
  if (typeof lastHintTime === "number") {
    localStorage.setItem("lastHintTime", String(lastHintTime));
  }
}

function loadGameState() {
  try {
    const raw = localStorage.getItem("gameState");
    if (!raw) return null;
    const state = JSON.parse(raw);
    if (!state || typeof state !== "object") return null;
    return state;
  } catch (e) {
    return null;
  }
}

// ================= MENIU =================

document.getElementById("start-game").onclick = () => {
  document.getElementById("main-menu").style.display = "none";
  initializeLevel(currentLevel, true);
};

document.getElementById("reset-progress").onclick = () => {
  localStorage.clear();
  currentLevel = 1;
  hintsLeft = 3;
  lastHintTime = null;
  showNotification("Progres resetat. Pornim de la nivelul 1.");
  initializeLevel(currentLevel, false);
};

document.getElementById("toggle-sound").onclick = function () {
  soundEnabled = !soundEnabled;
  this.textContent = soundEnabled ? "🔊 Sunet: ON" : "🔇 Sunet: OFF";
};

// ================= DIFICULTATE PROGRESIVĂ =================

function generateLevel(level) {
  let colors, emptyTubes;

  if (level <= 10) {
    colors = 3;
    emptyTubes = 3;
  } else if (level <= 25) {
    colors = 4;
    emptyTubes = 3;
  } else if (level <= 50) {
    colors = 5;
    emptyTubes = 2;
  } else if (level <= 75) {
    colors = 6;
    emptyTubes = 2;
  } else {
    colors = 7;
    emptyTubes = 2;
  }

  let tubes = Math.min(colors + emptyTubes, MAX_TUBES);

  const pool = [];
  for (let c = 0; c < colors; c++) {
    for (let i = 0; i < COLORS_PER_TUBE; i++) {
      pool.push(c);
    }
  }

  const shuffleTimes =
    level <= 25 ? 1 :
    level <= 50 ? 2 :
    level <= 75 ? 3 : 4;

  for (let s = 0; s < shuffleTimes; s++) {
    pool.sort(() => Math.random() - 0.5);
  }

  const setup = [];
  for (let i = 0; i < colors; i++) {
    setup.push(pool.splice(0, COLORS_PER_TUBE));
  }

  while (setup.length < tubes) {
    setup.push([]);
  }

  return setup;
}

// ================= INIT LEVEL =================

function updateHintUI() {
  hintLeftEl.textContent = `💡 Hinturi: ${hintsLeft}`;
}

function initializeLevel(level, useSaved = true) {
  selectedTube = null;
  isPaused = false;

  const gameContainer = document.getElementById("game-container");
  gameContainer.classList.remove("paused");
  pauseBtn.textContent = "⏸ Pauză";
  overlayBtn.style.display = "none";

  let state = null;
  if (useSaved) {
    state = loadGameState();
  }

  if (state && state.level === level && Array.isArray(state.tubesData)) {
    tubesData = state.tubesData;
    hintsLeft =
      typeof state.hintsLeft === "number"
        ? Math.max(state.hintsLeft, 3)
        : Math.max(hintsLeft || 3, 3);
    lastHintTime =
      typeof state.lastHintTime === "number"
        ? state.lastHintTime
        : Date.now();
    showNotification(`Continuăm nivelul ${level}`);
  } else {
    tubesData = generateLevel(level);
    hintsLeft = Math.max(hintsLeft || 3, 3);
    lastHintTime = Date.now();
  }

  levelDisplayEl.textContent = "Nivel " + level;
  updateHintUI();
  winMessageEl.style.display = "none";
  document.getElementById("confetti-container").innerHTML = "";

  renderTubes(true);
  saveGameState();
  checkHintRegen();
  updateOrientationHint();
}

// ================= RENDER =================

function renderTubes(initial = false) {
  if (initial) {
    container.innerHTML = "";

    tubesData.forEach((_, i) => {
      const tube = document.createElement("div");
      tube.className = "test-tube";

      const stack = document.createElement("div");
      stack.className = "liquid-stack";
      tube.appendChild(stack);

      tube.onclick = () => handleTubeClick(i);

      container.appendChild(tube);
    });
  }

  [...container.children].forEach((tubeEl, i) => {
    const stack = tubeEl.querySelector(".liquid-stack");
    stack.innerHTML = "";

    tubesData[i].forEach(color => {
      const part = document.createElement("div");
      part.className = "liquid";
      part.style.background = COLOR_SET[color];
      stack.appendChild(part);
    });

    tubeEl.classList.toggle("selected", selectedTube === i);
  });
}

// ================= GAMEPLAY =================

function handleTubeClick(i) {
  if (isPaused) return;

  if (selectedTube === null) {
    if (tubesData[i].length) {
      selectedTube = i;
    }
  } else {
    if (canMove(selectedTube, i)) {
      pour(selectedTube, i);
    } else {
      shakeTube(i);
    }
    selectedTube = null;
  }

  renderTubes();
  saveGameState();
}

function canMove(from, to) {
  if (from === to) return false;
  if (!tubesData[from] || !tubesData[from].length) return false;
  if (tubesData[to].length >= COLORS_PER_TUBE) return false;

  const cFrom = tubesData[from][tubesData[from].length - 1];
  const cTo   = tubesData[to][tubesData[to].length - 1];

  return cTo == null || cFrom === cTo;
}

function pour(from, to) {
  const color = tubesData[from][tubesData[from].length - 1];

  while (
    tubesData[from].length &&
    tubesData[from][tubesData[from].length - 1] === color &&
    tubesData[to].length < COLORS_PER_TUBE
  ) {
    tubesData[to].push(tubesData[from].pop());
  }

  if (soundEnabled) {
    try {
      pourSound.currentTime = 0;
      pourSound.play();
    } catch (e) {}
  }

  checkWin();
}

function shakeTube(i) {
  const tube = container.children[i];
  if (!tube) return;

  tube.classList.add("shake");

  if (navigator.vibrate) navigator.vibrate(150);

  if (soundEnabled) {
    try {
      wrongSound.currentTime = 0;
      wrongSound.play();
    } catch (e) {}
  }

  setTimeout(() => tube.classList.remove("shake"), 300);
}

// ================= HINTURI – REGENERARE =================

function checkHintRegen() {
  const now = Date.now();
  if (!lastHintTime) {
    lastHintTime = now;
    saveGameState();
    return;
  }

  if (hintsLeft >= MAX_HINTS) return;

  const diff = now - lastHintTime;
  if (diff < HINT_INTERVAL_MS) return;

  const gained = Math.floor(diff / HINT_INTERVAL_MS);
  if (gained <= 0) return;

  const oldHints = hintsLeft;
  hintsLeft = Math.min(MAX_HINTS, hintsLeft + gained);
  lastHintTime = now;
  updateHintUI();
  saveGameState();

  const added = hintsLeft - oldHints;
  if (added > 0) {
    showNotification(
      `Ai primit ${added} hint${added > 1 ? "uri" : ""} noi!`
    );

    if ("Notification" in window && Notification.permission === "granted") {
      try {
        new Notification("Water Sort Pro", {
          body: "Ai primit hinturi noi!"
        });
      } catch (e) {}
    }
  }
}

setInterval(checkHintRegen, 60 * 1000);

// ================= SMART HINT =================

document.getElementById("hint-button").onclick = () => {
  if (isPaused) return;

  if (hintsLeft <= 0) {
    showNotification("Nu mai ai hinturi. Folosește +💡 pentru a primi unul.");
    return;
  }

  // 1) Mutare care finalizează un tub
  for (let from = 0; from < tubesData.length; from++) {
    const fromColor = tubesData[from][tubesData[from].length - 1];
    if (fromColor === undefined) continue;

    for (let to = 0; to < tubesData.length; to++) {
      if (canMove(from, to)) {
        const future = [...tubesData[to], fromColor];
        if (
          future.length === COLORS_PER_TUBE &&
          future.every(c => c === future[0])
        ) {
          applyHintMove(from, to);
          return;
        }
      }
    }
  }

  // 2) Mutare care eliberează un tub amestecat
  for (let from = 0; from < tubesData.length; from++) {
    const fromColor = tubesData[from][tubesData[from].length - 1];
    if (fromColor === undefined) continue;

    const uniqueColors = new Set(tubesData[from]);
    if (uniqueColors.size > 1) {
      for (let to = 0; to < tubesData.length; to++) {
        if (canMove(from, to)) {
          applyHintMove(from, to);
          return;
        }
      }
    }
  }

  // 3) Prima mutare validă
  for (let i = 0; i < tubesData.length; i++) {
    for (let j = 0; j < tubesData.length; j++) {
      if (canMove(i, j)) {
        applyHintMove(i, j);
        return;
      }
    }
  }

  showNotification("Nu există mutări logice pentru hint.");
};

function applyHintMove(from, to) {
  hintsLeft--;
  updateHintUI();
  pour(from, to);
  renderTubes();
  saveGameState();
  showNotification("Hint folosit");
}

// +💡 – pentru viitor AdMob
extraHintBtn.onclick = () => {
  if (hintsLeft >= MAX_HINTS) {
    showNotification("Ai deja numărul maxim de hinturi.");
    return;
  }

  hintsLeft++;
  updateHintUI();
  saveGameState();
  showNotification(
    "Hint bonus adăugat! (Aici se va integra AdMob Rewarded în versiunea finală)"
  );
};

// ================= WIN =================

function checkWin() {
  const win = tubesData.every(t =>
    t.length === 0 ||
    (t.length === COLORS_PER_TUBE && t.every(c => c === t[0]))
  );

  if (win) {
    winMessageEl.style.display = "block";

    if (soundEnabled) {
      try {
        winSound.currentTime = 0;
        winSound.play();
      } catch (e) {}
    }

    confetti();

    currentLevel++;
    localStorage.setItem("level", currentLevel);
    saveGameState();
  }
}

// ================= CONFETTI =================

function confetti() {
  const ctn = document.getElementById("confetti-container");
  ctn.innerHTML = "";

  const confettiCount = 220;

  for (let i = 0; i < confettiCount; i++) {
    const c = document.createElement("div");
    c.className = "confetti";
    c.style.background =
      COLOR_SET[Math.floor(Math.random() * COLOR_SET.length)];
    c.style.left = Math.random() * 100 + "vw";
    c.style.animationDuration = (Math.random() * 2 + 2) + "s";
    ctn.appendChild(c);
  }
}

// ================= ORIENTARE CONTROLATĂ (logic) =================

function updateOrientationHint() {
  const isLandscape = window.matchMedia("(orientation: landscape)").matches;
  if (currentLevel >= 40 && !isLandscape) {
    showNotification(
      "Pentru nivelurile mari e mai ușor în modul landscape (rotește telefonul).",
      4500
    );
  }
}

window.addEventListener("orientationchange", updateOrientationHint);
window.addEventListener("resize", updateOrientationHint);

// ================= PAUZĂ / CONTINUĂ =================

pauseBtn.onclick = () => {
  isPaused = !isPaused;
  const gameContainer = document.getElementById("game-container");
  gameContainer.classList.toggle("paused", isPaused);
  pauseBtn.textContent = isPaused ? "▶ Continuă" : "⏸ Pauză";
  overlayBtn.style.display = isPaused ? "block" : "none";
};

overlayBtn.onclick = () => {
  isPaused = false;
  const gameContainer = document.getElementById("game-container");
  gameContainer.classList.remove("paused");
  pauseBtn.textContent = "⏸ Pauză";
  overlayBtn.style.display = "none";
};

// ================= ALTE BUTOANE =================

document.getElementById("restart-button").onclick = () => {
  initializeLevel(currentLevel, false);
};

document.getElementById("next-level-button").onclick = () => {
  initializeLevel(currentLevel, false);
};
