let currentLevel = parseInt(localStorage.getItem("level")) || 1;
let selectedTube = null;
let hintsLeft = 3;
let soundEnabled = true;
let isPaused = false;

const MAX_TUBES = 15;
const MAX_COLORS_PER_TUBE = 4;

const COLOR_SET = [
  '#ff3864','#00e5a0','#4da3ff',
  '#ffd166','#c77dff','#ff9f1c'
];

let tubesData = [];

const pourSound  = document.getElementById("pour-sound");
const winSound   = document.getElementById("win-sound");
const wrongSound = document.getElementById("wrong-sound");

const container  = document.getElementById("tube-container");
const pauseBtn   = document.getElementById("pause-button");
const overlayBtn = document.getElementById("pause-overlay-btn");

/* ====================== MENIU ====================== */

document.getElementById("start-game").onclick = () => {
  document.getElementById("main-menu").style.display = "none";
  initializeLevel(currentLevel);
};

document.getElementById("reset-progress").onclick = () => {
  localStorage.clear();
  location.reload();
};

document.getElementById("toggle-sound").onclick = function(){
  soundEnabled = !soundEnabled;
  this.textContent = soundEnabled ? "🔊 Sunet: ON" : "🔇 Sunet: OFF";
};

/* ====================== GENERARE LEVEL ====================== */

function generateLevel(level) {

  let colors;
  let emptyTubes;

  if (level <= 10) {
    colors = 3;
    emptyTubes = 3;
  } else if (level <= 25) {
    colors = 4;
    emptyTubes = 3;
  } else if (level <= 50) {
    colors = 5;
    emptyTubes = 2;
  } else {
    colors = 6;
    emptyTubes = 2;
  }

  let tubes = Math.min(colors + emptyTubes, MAX_TUBES);

  let pool = [];
  for (let c = 0; c < colors; c++) {
    for (let i = 0; i < 4; i++) pool.push(c);
  }

  pool.sort(() => Math.random() - 0.5);

  let setup = [];
  for (let i = 0; i < colors; i++) {
    setup.push(pool.splice(0, 4));
  }

  while (setup.length < tubes) {
    setup.push([]);
  }

  return setup;
}

/* ====================== INIT LEVEL ====================== */

function initializeLevel(level) {
  selectedTube = null;
  hintsLeft = 3;
  isPaused = false;

  document.getElementById("game-container").classList.remove("paused");
  pauseBtn.textContent = "⏸ Pauză";
  overlayBtn.style.display = "none";

  tubesData = generateLevel(level);

  document.getElementById("level-display").textContent = "Nivel " + level;
  document.getElementById("hint-left").textContent = `💡 Hinturi: ${hintsLeft}`;
  document.getElementById("win-message").style.display = "none";
  document.getElementById("confetti-container").innerHTML = "";

  renderTubes(true);
}

/* ====================== RENDER ====================== */

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

      /* Drag & Drop */
      tube.draggable = true;
      tube.addEventListener("dragstart", () => selectedTube = i);
      tube.addEventListener("dragover", e => e.preventDefault());
      tube.addEventListener("drop", () => dropTube(i));

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

/* ====================== GAMEPLAY ====================== */

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
  }

  renderTubes();
}

function dropTube(i) {
  if (isPaused) return;

  if (canMove(selectedTube, i)) {
    pour(selectedTube, i);
  } else {
    shakeTube(i);
  }

  renderTubes();
}

function canMove(from, to) {
  if (from === to) return false;
  if (!tubesData[from]?.length) return false;
  if (tubesData[to].length >= 4) return false;

  const cFrom = tubesData[from].at(-1);
  const cTo   = tubesData[to].at(-1);

  return cTo == null || cFrom === cTo;
}

function pour(from, to) {
  const color = tubesData[from].at(-1);

  while (
    tubesData[from].at(-1) === color &&
    tubesData[to].length < 4
  ) {
    tubesData[to].push(tubesData[from].pop());
  }

  if (soundEnabled) {
    pourSound.currentTime = 0;
    pourSound.play();
  }

  selectedTube = null;
  checkWin();
}

function shakeTube(i) {
  const tube = container.children[i];
  tube.classList.add("shake");

  if (navigator.vibrate) navigator.vibrate(150);

  if (soundEnabled) {
    wrongSound.currentTime = 0;
    wrongSound.play();
  }

  setTimeout(() => tube.classList.remove("shake"), 300);
  selectedTube = null;
}

/* ====================== HINT ====================== */

document.getElementById("hint-button").onclick = () => {
  if (hintsLeft <= 0 || isPaused) return;

  for (let i = 0; i < tubesData.length; i++) {
    for (let j = 0; j < tubesData.length; j++) {
      if (canMove(i, j)) {
        pour(i, j);
        hintsLeft--;
        document.getElementById("hint-left").textContent =
          `💡 Hinturi: ${hintsLeft}`;
        renderTubes();
        return;
      }
    }
  }
};

/* ====================== WIN ====================== */

function checkWin() {
  const win = tubesData.every(t =>
    t.length === 0 ||
    (t.length === 4 && t.every(c => c === t[0]))
  );

  if (win) {
    document.getElementById("win-message").style.display = "block";
    if (soundEnabled) winSound.play();
    confetti();
    currentLevel++;
    localStorage.setItem("level", currentLevel);
  }
}

/* ====================== CONFETTI ====================== */

function confetti() {
  const container = document.getElementById("confetti-container");
  container.innerHTML = "";

  for (let i = 0; i < 250; i++) {
    const c = document.createElement("div");
    c.className = "confetti";
    c.style.background = COLOR_SET[Math.random() * COLOR_SET.length | 0];
    c.style.left = Math.random() * 100 + "vw";
    c.style.animationDuration = (Math.random() * 2 + 2) + "s";
    container.appendChild(c);
  }
}

/* ====================== PAUSE / CONTINUĂ ====================== */

pauseBtn.onclick = () => {
  isPaused = !isPaused;
  document.getElementById("game-container").classList.toggle("paused", isPaused);
  pauseBtn.textContent = isPaused ? "▶ Continuă" : "⏸ Pauză";
  overlayBtn.style.display = isPaused ? "block" : "none";
};

overlayBtn.onclick = () => {
  isPaused = false;
  document.getElementById("game-container").classList.remove("paused");
  pauseBtn.textContent = "⏸ Pauză";
  overlayBtn.style.display = "none";
};

/* ====================== ALTE BUTOANE ====================== */

document.getElementById("restart-button").onclick = () => {
  initializeLevel(currentLevel);
};

document.getElementById("next-level-button").onclick = () => {
  initializeLevel(currentLevel);
};
