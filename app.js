"use strict";

const COLORS = [
  { name: "CYAN", value: "#22e7ec", glow: "rgba(34, 231, 236, 0.6)" },
  { name: "AMBER", value: "#ffd24a", glow: "rgba(255, 210, 74, 0.65)" },
  { name: "VIOLET", value: "#ff4c8c", glow: "rgba(255, 76, 140, 0.62)" }
];
const MODES = {
  training: { duration: 1.62, speed: 0.8 },
  relay: { duration: 1.3, speed: 1 },
  overdrive: { duration: 1.03, speed: 1.3 }
};
const AI_MESSAGES = {
  1: "Первый ретранслятор принят. Память снова движется.",
  4: "Четыре узла синхронизированы. Я слышу северный маяк.",
  8: "Пакет памяти раскрывается: моё имя PULSE-9.",
  14: "Связь почти стабильна. Не сбивай ритм.",
  22: "Ты ведёшь сигнал дальше любой расчётной дистанции."
};
const STORAGE = {
  best: "neonPulseBest",
  pilot: "neonPulsePilot",
  scores: "neonPulseScores",
  legacyBest: "chromaRelayBest",
  legacyPilot: "chromaRelayPilot",
  legacyScores: "chromaRelayScores",
};
const RANKS = [
  { min: 24, name: "S" },
  { min: 16, name: "A" },
  { min: 9, name: "B" },
  { min: 4, name: "C" },
  { min: 0, name: "D" }
];
const ZONES = [
  { className: "zone-0", name: "MIDNIGHT LINK" },
  { className: "zone-1", name: "MAGENTA STORM" },
  { className: "zone-2", name: "CYAN SURGE" },
  { className: "zone-3", name: "GOLDEN DAWN" },
];
const MUSIC = {
  menu: "./%D0%93%D0%BB%D0%B0%D0%B2%D0%BD%D0%B0%D1%8F%D0%A1%D1%82%D1%80%D0%B0%D0%BD%D0%B8%D1%86%D0%B0%D0%9C%D0%A3%D0%97.mp3",
  game: [
    "./%D1%84%D0%BE%D0%BD1.mp3",
    "./%D1%84%D0%BE%D0%BD2.mp3",
    "./%D1%84%D0%BE%D0%BD3.mp3",
  ],
};

const canvas = document.querySelector("#gameCanvas");
const ctx = canvas.getContext("2d");
const elements = {
  world: document.querySelector("#world"),
  startScreen: document.querySelector("#startScreen"),
  hud: document.querySelector("#hud"),
  score: document.querySelector("#score"),
  best: document.querySelector("#best"),
  speed: document.querySelector("#speed"),
  signalChip: document.querySelector("#signalChip"),
  signalName: document.querySelector("#signalName"),
  aiMessage: document.querySelector("#aiMessage"),
  modeControl: document.querySelector("#modeControl"),
  modeTrigger: document.querySelector("#modeTrigger"),
  modeValue: document.querySelector("#modeValue"),
  modeMenu: document.querySelector("#modeMenu"),
  briefing: document.querySelector("#briefingModal"),
  result: document.querySelector("#resultModal"),
  resultLabel: document.querySelector("#resultLabel"),
  resultTitle: document.querySelector("#resultTitle"),
  resultCopy: document.querySelector("#resultCopy"),
  finalScore: document.querySelector("#finalScore"),
  finalBest: document.querySelector("#finalBest"),
  finalRank: document.querySelector("#finalRank"),
  thirdResultLabel: document.querySelector("#thirdResultLabel"),
  lostOrb: document.querySelector("#lostOrb"),
  launchButton: document.querySelector("#launchButton"),
  soundButton: document.querySelector("#soundButton"),
  pilotName: document.querySelector("#pilotName"),
  leaderboardList: document.querySelector("#leaderboardList"),
  rivalBoard: document.querySelector("#rivalBoard"),
  rivalScore: document.querySelector("#rivalScore"),
  rivalState: document.querySelector("#rivalState"),
  briefMode: document.querySelector("#briefMode"),
  launchCountdown: document.querySelector("#launchCountdown"),
  countdownValue: document.querySelector("#countdownValue")
};

function loadBest() {
  try {
    return Number(localStorage.getItem(STORAGE.best) || localStorage.getItem(STORAGE.legacyBest) || 0);
  } catch (error) {
    return 0;
  }
}

function saveBest(value) {
  try {
    localStorage.setItem(STORAGE.best, String(value));
  } catch (error) {
    // Private browsing can block storage; the current run still works.
  }
}

function loadPilot() {
  try {
    return localStorage.getItem(STORAGE.pilot) || localStorage.getItem(STORAGE.legacyPilot) || "PLAYER";
  } catch (error) {
    return "PLAYER";
  }
}

function savePilot(value) {
  try {
    localStorage.setItem(STORAGE.pilot, value);
  } catch (error) {
    // The current session can still use the typed callsign.
  }
}

function loadLeaderboard() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE.scores) || localStorage.getItem(STORAGE.legacyScores) || "[]");
    return Array.isArray(stored) ? stored : [];
  } catch (error) {
    return [];
  }
}

function saveLeaderboard(entries) {
  try {
    localStorage.setItem(STORAGE.scores, JSON.stringify(entries));
  } catch (error) {
    // Results still show after a run if persistent storage is unavailable.
  }
}

const state = {
  mode: "relay",
  pendingVariant: "solo",
  variant: "solo",
  running: false,
  preview: true,
  pausedForRules: false,
  score: 0,
  best: loadBest(),
  ballColor: 0,
  nextLanding: 1,
  checkedLanding: 0,
  runtime: 0,
  launchDuration: 3,
  launchDelay: 0,
  zone: 0,
  lastFrame: 0,
  duration: MODES.relay.duration,
  baseDuration: MODES.relay.duration,
  speedBoosted: false,
  aiScore: 0,
  aiMisses: 0,
  rivalFlash: 0,
  rivalSuccessful: true,
  padSpacing: 188,
  ballX: 0,
  topY: 0,
  jump: 190,
  padHeight: 130,
  pads: new Map(),
  particles: [],
  trail: [],
  leaderboard: loadLeaderboard(),
  pulse: 0,
  flash: 0,
  sound: true,
  audio: null,
  musicTrack: null,
  musicType: "",
  lastGameTrack: -1,
  frameId: null
};

function resizeCanvas() {
  const ratio = Math.min(2, Math.max(1, window.devicePixelRatio || 1));
  const width = window.innerWidth;
  const height = window.innerHeight;
  const compact = width <= 700 || height <= 560;
  canvas.width = width * ratio;
  canvas.height = height * ratio;
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  if (compact) {
    const bottomReserve = width <= 700 ? Math.max(150, height * 0.22) : 98;
    state.ballX = Math.max(72, Math.min(width * 0.29, 122));
    state.padSpacing = Math.max(96, Math.min(width * 0.29, 137));
    state.padHeight = Math.max(72, Math.min(height * 0.15, 108));
    state.topY = height - state.padHeight - bottomReserve;
    state.jump = Math.max(72, Math.min(height * 0.2, 133));
  } else {
    state.ballX = Math.max(130, Math.min(width * 0.28, 355));
    state.padSpacing = Math.max(135, Math.min(width * 0.165, 198));
    state.padHeight = Math.max(90, Math.min(height * 0.18, 143));
    state.topY = height - state.padHeight - Math.max(145, height * 0.18);
    state.jump = Math.max(130, Math.min(height * 0.3, 220));
  }
}

function color(index) {
  return COLORS[index];
}

function randomColor(previous = -1) {
  let selected = Math.floor(Math.random() * COLORS.length);
  while (selected === previous) selected = Math.floor(Math.random() * COLORS.length);
  return selected;
}

function ensureAudio() {
  if (!state.sound) return null;
  const AudioEngine = window.AudioContext || window.webkitAudioContext;
  if (!AudioEngine) return null;
  if (!state.audio) state.audio = new AudioEngine();
  if (state.audio.state === "suspended") state.audio.resume();
  return state.audio;
}

function playTone(kind) {
  const audio = ensureAudio();
  if (!audio) return;
  const tones = {
    rotate: [360, 0.04, "triangle"],
    land: [740, 0.07, "sine"],
    fail: [118, 0.52, "sawtooth"],
    begin: [530, 0.14, "sine"],
    boost: [980, 0.25, "triangle"]
  };
  const setup = tones[kind];
  const oscillator = audio.createOscillator();
  const gain = audio.createGain();
  oscillator.type = setup[2];
  oscillator.frequency.value = setup[0];
  if (kind === "fail") {
    oscillator.frequency.exponentialRampToValueAtTime(48, audio.currentTime + setup[1]);
  }
  gain.gain.setValueAtTime(kind === "fail" ? 0.16 : 0.09, audio.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + setup[1]);
  oscillator.connect(gain);
  gain.connect(audio.destination);
  oscillator.start();
  oscillator.stop(audio.currentTime + setup[1]);
}

function stopMusic() {
  if (!state.musicTrack) return;
  state.musicTrack.pause();
  state.musicTrack.currentTime = 0;
  state.musicTrack = null;
  state.musicType = "";
}

function tryPlayMusic() {
  if (!state.musicTrack || !state.sound) return;
  const playback = state.musicTrack.play();
  if (playback) playback.catch(() => {
    // Browsers may wait for the first interaction before allowing menu music.
  });
}

function setMusicTrack(source, type, volume) {
  stopMusic();
  if (!state.sound) return;
  state.musicTrack = new Audio(source);
  state.musicTrack.loop = true;
  state.musicTrack.preload = "auto";
  state.musicTrack.volume = volume;
  state.musicType = type;
  tryPlayMusic();
}

function startMenuMusic() {
  if (state.running || !state.sound) return;
  if (state.musicType === "menu" && state.musicTrack) {
    tryPlayMusic();
    return;
  }
  setMusicTrack(MUSIC.menu, "menu", 0.3);
}

function pickGameTrack() {
  let index = Math.floor(Math.random() * MUSIC.game.length);
  while (MUSIC.game.length > 1 && index === state.lastGameTrack) {
    index = Math.floor(Math.random() * MUSIC.game.length);
  }
  state.lastGameTrack = index;
  return MUSIC.game[index];
}

function startMusic() {
  if ((!state.running && !state.pausedForRules) || !state.sound) return;
  setMusicTrack(pickGameTrack(), "game", 0.36);
  if (state.pausedForRules) pauseMusic();
}

function pauseMusic() {
  if (state.musicTrack) state.musicTrack.pause();
}

function resumeMusic() {
  if (state.sound && state.musicTrack) tryPlayMusic();
}

function getPad(index) {
  if (!state.pads.has(index)) {
    state.pads.set(index, {
      index,
      color: Math.floor(Math.random() * COLORS.length),
      burst: 0,
      fall: -1,
      activated: false,
      effect: index % 3
    });
  }
  return state.pads.get(index);
}

function setAiMessage(message) {
  elements.aiMessage.textContent = message;
}

function updateSignal() {
  const current = color(state.ballColor);
  elements.signalChip.style.background = current.value;
  elements.signalChip.style.boxShadow = `0 0 15px ${current.value}`;
  elements.signalName.textContent = current.name;
}

function setScore() {
  elements.score.textContent = String(state.score);
  elements.best.textContent = String(state.best);
  const displayedSpeed = MODES[state.mode].speed * (state.baseDuration / state.duration);
  elements.speed.textContent = `x${displayedSpeed.toFixed(1)}`;
  elements.speed.classList.toggle("boosted", state.speedBoosted);
  elements.rivalScore.textContent = String(state.aiScore);
}

function applyZone(score) {
  const zone = Math.floor(score / 10) % ZONES.length;
  ZONES.forEach((entry) => elements.world.classList.remove(entry.className));
  elements.world.classList.add(ZONES[zone].className);
  state.zone = zone;
}

function renderLeaderboard() {
  elements.leaderboardList.innerHTML = "";
  if (state.leaderboard.length === 0) {
    const empty = document.createElement("li");
    empty.className = "empty";
    empty.textContent = "Сыграй первую передачу";
    elements.leaderboardList.append(empty);
    return;
  }
  state.leaderboard.forEach((entry, index) => {
    const row = document.createElement("li");
    const place = document.createElement("b");
    const identity = document.createElement("span");
    const score = document.createElement("strong");
    const mode = document.createElement("small");
    place.textContent = String(index + 1).padStart(2, "0");
    identity.textContent = entry.name;
    mode.textContent = entry.variant === "duel" ? " VS AI" : " SOLO";
    identity.append(mode);
    score.textContent = String(entry.score);
    row.append(place, identity, score);
    elements.leaderboardList.append(row);
  });
}

function recordScore() {
  const typed = elements.pilotName.value.trim().toUpperCase().slice(0, 12) || "PLAYER";
  elements.pilotName.value = typed;
  savePilot(typed);
  state.leaderboard = [...state.leaderboard, { name: typed, score: state.score, variant: state.variant }]
    .sort((left, right) => right.score - left.score)
    .slice(0, 5);
  saveLeaderboard(state.leaderboard);
  renderLeaderboard();
}

function prepareGame(variant) {
  state.pendingVariant = variant;
  elements.briefMode.textContent = variant === "duel"
    ? "Против AI: продержись 20 башен и обгони виртуального соперника на фоновой дорожке."
    : "Соло: продержись как можно дольше и поставь локальный рекорд.";
  openRules(true);
}

function closeModeMenu() {
  elements.modeControl.classList.remove("open");
  elements.modeMenu.classList.add("hidden");
  elements.modeTrigger.setAttribute("aria-expanded", "false");
}

function toggleModeMenu() {
  const opening = elements.modeMenu.classList.contains("hidden");
  if (opening) {
    elements.modeControl.classList.add("open");
    elements.modeMenu.classList.remove("hidden");
    elements.modeTrigger.setAttribute("aria-expanded", "true");
    return;
  }
  closeModeMenu();
}

function selectMode(mode) {
  state.mode = mode;
  const labels = {
    training: "Обучение",
    relay: "Поток",
    overdrive: "Overdrive",
  };
  elements.modeValue.textContent = labels[mode];
  elements.modeMenu.querySelectorAll("button[data-mode]").forEach((button) => {
    const selected = button.dataset.mode === mode;
    button.classList.toggle("selected", selected);
    button.setAttribute("aria-selected", String(selected));
  });
  closeModeMenu();
}

function beginGame() {
  stopMusic();
  state.variant = state.pendingVariant;
  state.duration = MODES[state.mode].duration;
  state.baseDuration = state.duration;
  state.speedBoosted = false;
  state.aiScore = 0;
  state.aiMisses = 0;
  state.rivalFlash = 0;
  state.rivalSuccessful = true;
  state.running = true;
  state.preview = false;
  state.pausedForRules = false;
  state.score = 0;
  state.ballColor = randomColor();
  state.nextLanding = 0;
  state.checkedLanding = -1;
  state.runtime = -1;
  state.launchDelay = state.launchDuration;
  state.pads = new Map();
  state.particles = [];
  state.trail = [];
  state.flash = 0;
  getPad(0);
  applyZone(0);
  elements.startScreen.classList.remove("active");
  elements.hud.classList.remove("hidden");
  elements.result.classList.add("hidden");
  elements.briefing.classList.add("hidden");
  elements.countdownValue.textContent = String(state.launchDuration);
  elements.launchCountdown.classList.remove("hidden");
  elements.rivalBoard.classList.toggle("hidden", state.variant !== "duel");
  elements.rivalState.classList.remove("miss");
  elements.rivalState.textContent = "SYNC";
  setAiMessage(state.variant === "duel"
    ? "AI подключён. Настрой первую башню до конца отсчёта."
    : "Канал открыт. Настрой первую башню до конца отсчёта.");
  updateSignal();
  setScore();
  playTone("begin");
  startMusic();
}

function goToMenu() {
  stopMusic();
  state.running = false;
  state.preview = true;
  state.runtime = 0;
  state.launchDelay = 0;
  state.pads = new Map();
  state.ballColor = 0;
  getPad(0).color = 0;
  applyZone(0);
  elements.startScreen.classList.add("active");
  elements.hud.classList.add("hidden");
  elements.result.classList.add("hidden");
  elements.rivalBoard.classList.add("hidden");
  elements.launchCountdown.classList.add("hidden");
  startMenuMusic();
}

function openRules(launch) {
  elements.launchButton.hidden = !launch;
  if (state.running && !launch) {
    state.pausedForRules = true;
    state.running = false;
    pauseMusic();
  }
  elements.briefing.classList.remove("hidden");
}

function closeRules() {
  elements.briefing.classList.add("hidden");
  if (state.pausedForRules) {
    state.running = true;
    state.pausedForRules = false;
    state.lastFrame = performance.now();
    resumeMusic();
  }
}

function padPosition(index) {
  return state.ballX + index * state.padSpacing - state.runtime * state.padSpacing;
}

function activeTargetIndex() {
  return Math.floor(state.runtime) + 1;
}

function changePad(index, directColor) {
  if (!state.running) return;
  const pad = getPad(index);
  if (index <= state.checkedLanding) return;
  pad.color = directColor === undefined ? (pad.color + 1) % COLORS.length : directColor;
  pad.burst = 1;
  pad.activated = true;
  playTone("rotate");
}

function cycleUpcomingPad(directColor) {
  changePad(activeTargetIndex(), directColor);
}

function addParticles(x, y, selectedColor, amount) {
  for (let index = 0; index < amount; index += 1) {
    const angle = Math.random() * Math.PI * 2;
    const velocity = 1 + Math.random() * 3.4;
    state.particles.push({
      x,
      y,
      dx: Math.cos(angle) * velocity,
      dy: Math.sin(angle) * velocity,
      size: 2 + Math.random() * 4,
      life: 1,
      color: color(selectedColor).value
    });
  }
}

function testLanding(index) {
  const pad = getPad(index);
  advanceRival();
  if (pad.color !== state.ballColor) {
    endGame(pad);
    return;
  }
  state.score += 1;
  state.best = Math.max(state.best, state.score);
  saveBest(state.best);
  pad.burst = 1.3;
  pad.fall = 0;
  addParticles(state.ballX, state.topY - 8, state.ballColor, 16);
  playTone("land");
  if (state.score === 10) {
    state.speedBoosted = true;
    state.duration = state.baseDuration * 0.76;
    applyZone(state.score);
    setAiMessage("MAGENTA STORM: после 10 башен поток ускорен. Держи ритм!");
    playTone("boost");
  } else if (state.score > 0 && state.score % 10 === 0) {
    applyZone(state.score);
    setAiMessage(`${ZONES[state.zone].name}: среда перестроена после ${state.score} башен.`);
    playTone("boost");
  } else if (AI_MESSAGES[state.score]) {
    setAiMessage(AI_MESSAGES[state.score]);
  } else if (state.score % 5 === 0) {
    setAiMessage("Сигнал стабилен. Держи ритм и читай цвет сферы.");
  }
  state.ballColor = randomColor(state.ballColor);
  getPad(index + 1);
  updateSignal();
  setScore();
  if (state.variant === "duel" && state.score >= 20) finishDuel();
}

function rank(score) {
  return RANKS.find((item) => score >= item.min).name;
}

function endGame(pad) {
  state.running = false;
  state.flash = 1;
  stopMusic();
  playTone("fail");
  addParticles(state.ballX, state.topY - 8, state.ballColor, 28);
  elements.result.classList.remove("hidden");
  elements.resultLabel.textContent = "SIGNAL LOST";
  elements.resultTitle.textContent = state.variant === "duel" ? "AI забирает раунд" : "Цвет не совпал";
  elements.resultCopy.textContent = state.variant === "duel"
    ? `Твоя сфера была ${color(state.ballColor).name}, а башня приняла ${color(pad.color).name}. Результат: ты ${state.score}, AI ${state.aiScore}.`
    : `Сфера была ${color(state.ballColor).name}, а ретранслятор принял ${color(pad.color).name}. AI сохранил ${state.score} фрагментов памяти.`;
  elements.finalScore.textContent = String(state.score);
  elements.finalBest.textContent = String(state.best);
  elements.thirdResultLabel.textContent = state.variant === "duel" ? "AI" : "Ранг";
  elements.finalRank.textContent = state.variant === "duel" ? String(state.aiScore) : rank(state.score);
  elements.lostOrb.style.background = color(state.ballColor).value;
  elements.lostOrb.style.boxShadow = `0 0 36px ${color(state.ballColor).glow}`;
  recordScore();
}

function advanceRival() {
  if (state.variant !== "duel") return;
  const modePenalty = state.mode === "overdrive" ? 0.09 : state.mode === "training" ? -0.04 : 0;
  const chance = (state.speedBoosted ? 0.78 : 0.9) - modePenalty;
  state.rivalSuccessful = Math.random() < chance;
  state.rivalFlash = 1;
  if (state.rivalSuccessful) {
    state.aiScore += 1;
    elements.rivalState.classList.remove("miss");
    elements.rivalState.textContent = "MATCH";
  } else {
    state.aiMisses += 1;
    elements.rivalState.classList.add("miss");
    elements.rivalState.textContent = "MISS";
  }
}

function finishDuel() {
  if (!state.running) return;
  state.running = false;
  stopMusic();
  playTone("boost");
  elements.result.classList.remove("hidden");
  const won = state.score > state.aiScore;
  addParticles(state.ballX, state.topY - 8, state.ballColor, 34);
  elements.lostOrb.style.background = color(state.ballColor).value;
  elements.lostOrb.style.boxShadow = `0 0 36px ${color(state.ballColor).glow}`;
  elements.resultLabel.textContent = "RACE COMPLETE";
  elements.resultTitle.textContent = won ? "Ты обогнал AI" : "Идеальная ничья";
  elements.resultCopy.textContent = won
    ? `PULSE-9 выбирает твою линию: ${state.score} против ${state.aiScore}. AI ошибся ${state.aiMisses} раз.`
    : `Ты и AI синхронизировали по ${state.score} башен. Это редкая идеальная передача.`;
  elements.finalScore.textContent = String(state.score);
  elements.finalBest.textContent = String(state.best);
  elements.thirdResultLabel.textContent = "AI";
  elements.finalRank.textContent = String(state.aiScore);
  recordScore();
}

function update(delta) {
  state.pulse += delta;
  if (state.running) {
    if (state.launchDelay > 0) {
      state.launchDelay = Math.max(0, state.launchDelay - delta);
      state.runtime = -(state.launchDelay / state.launchDuration);
      elements.countdownValue.textContent = String(Math.max(1, Math.ceil(state.launchDelay)));
      if (state.launchDelay === 0) {
        elements.launchCountdown.classList.add("hidden");
        state.checkedLanding = 0;
        testLanding(0);
      }
    } else {
      const previous = Math.floor(state.runtime);
      state.runtime += delta / state.duration;
      const current = Math.floor(state.runtime);
      if (current > previous) {
        state.checkedLanding = current;
        testLanding(current);
      }
    }
  } else if (state.preview) {
    state.runtime += delta * 0.5;
  }
  state.particles.forEach((particle) => {
    particle.x += particle.dx * delta * 60;
    particle.y += particle.dy * delta * 60;
    particle.dy += delta * 2.7;
    particle.life -= delta * 2.4;
  });
  state.particles = state.particles.filter((particle) => particle.life > 0);
  state.pads.forEach((pad) => {
    pad.burst = Math.max(0, pad.burst - delta * 3);
    if (pad.fall >= 0) pad.fall += delta * 2.35;
  });
  state.trail.forEach((point) => {
    point.life -= delta * 4.1;
  });
  state.trail = state.trail.filter((point) => point.life > 0);
  state.rivalFlash = Math.max(0, state.rivalFlash - delta * 3.4);
  state.flash = Math.max(0, state.flash - delta * 3.2);
}

function drawPillarSignal(x, top, width, height, pad, selected) {
  if (!pad.activated) return;
  const band = Math.min(height - 30, 190);
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.fillStyle = selected.value;
  ctx.strokeStyle = selected.value;
  if (pad.effect === 0) {
    for (let index = 0; index < 6; index += 1) {
      const travel = (state.pulse * 48 + index * 34) % band;
      const y = top + band - travel + 18;
      const radius = 3 + (index % 3) * 2;
      ctx.globalAlpha = 0.22 + (1 - travel / band) * 0.22;
      ctx.beginPath();
      ctx.arc(x + Math.sin(state.pulse * 3 + index) * width * 0.22, y, radius, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (pad.effect === 1) {
    for (let index = 0; index < 5; index += 1) {
      const y = top + 30 + index * 31;
      const spin = state.pulse * (1.4 + index * 0.16) + index;
      ctx.save();
      ctx.translate(x + Math.sin(spin) * width * 0.17, y);
      ctx.rotate(spin);
      ctx.globalAlpha = 0.24 + (index % 2) * 0.1;
      ctx.beginPath();
      ctx.moveTo(0, -7);
      ctx.lineTo(7, 6);
      ctx.lineTo(-7, 6);
      ctx.closePath();
      ctx.stroke();
      ctx.restore();
    }
  } else {
    for (let index = 0; index < 5; index += 1) {
      const y = top + 24 + index * 30;
      const sweep = (Math.sin(state.pulse * 3.1 + index * 0.72) + 1) * 0.5;
      const left = x - width * 0.28 + sweep * width * 0.22;
      ctx.globalAlpha = 0.17 + sweep * 0.23;
      ctx.fillRect(left, y, width * 0.36, 8);
      ctx.globalAlpha = 0.32;
      ctx.fillRect(x + width * 0.06 - sweep * width * 0.18, y, width * 0.17, 8);
    }
  }
  ctx.restore();
}

function drawPillar(x, pad, width) {
  const fall = pad.fall < 0 ? 0 : Math.min(1, pad.fall);
  if (fall >= 1) return;
  const collapse = 1 - Math.pow(1 - fall, 2);
  const top = state.topY + collapse * (state.padHeight * 0.92);
  const selected = color(pad.color);
  const gradient = ctx.createLinearGradient(0, top, 0, window.innerHeight);
  gradient.addColorStop(0, selected.value);
  gradient.addColorStop(0.68, selected.value);
  gradient.addColorStop(1, "rgba(18, 13, 49, 0.55)");
  ctx.save();
  ctx.shadowColor = selected.glow;
  ctx.globalAlpha = 1 - collapse * 0.64;
  ctx.shadowBlur = 13 + pad.burst * 22;
  ctx.fillStyle = gradient;
  ctx.beginPath();
  const left = x - width / 2;
  const height = window.innerHeight - top + 20;
  const radius = 14;
  ctx.moveTo(left + radius, top);
  ctx.lineTo(left + width - radius, top);
  ctx.quadraticCurveTo(left + width, top, left + width, top + radius);
  ctx.lineTo(left + width, top + height);
  ctx.lineTo(left, top + height);
  ctx.lineTo(left, top + radius);
  ctx.quadraticCurveTo(left, top, left + radius, top);
  ctx.closePath();
  ctx.fill();
  ctx.save();
  ctx.clip();
  drawPillarSignal(x, top, width, height, pad, selected);
  ctx.restore();
  ctx.globalAlpha = 0.18;
  ctx.fillStyle = "#ffffff";
  for (let row = top + 18; row < window.innerHeight; row += 27) {
    ctx.fillRect(x - width / 2 + 13, row, width - 26, 2);
  }
  ctx.restore();
}

function drawBall() {
  const progress = state.launchDelay > 0 ? 1 - state.launchDelay / state.launchDuration : null;
  const phase = progress === null ? ((state.runtime % 1) + 1) % 1 : 0.5 + progress * 0.5;
  const y = state.topY - 22 - Math.sin(phase * Math.PI) * state.jump;
  const selected = color(state.ballColor);
  const lift = Math.sin(phase * Math.PI);
  if (state.running) {
    state.trail.unshift({ x: state.ballX, y, color: selected.value, life: 1 });
    state.trail = state.trail.slice(0, 22);
  }
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  state.trail.forEach((point, index) => {
    const intensity = point.life * (1 - index / 26);
    ctx.globalAlpha = intensity * 0.44;
    ctx.fillStyle = point.color;
    ctx.beginPath();
    ctx.arc(point.x, point.y, Math.max(3, 16 - index * 0.55), 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.restore();
  ctx.save();
  const contact = Math.max(0, 1 - Math.min(phase, 1 - phase) / 0.13);
  ctx.translate(state.ballX, y + contact * 3);
  ctx.scale(1 + contact * 0.15 - lift * 0.03, 1 - contact * 0.18 + lift * 0.05);
  ctx.shadowColor = selected.glow;
  ctx.shadowBlur = 27;
  ctx.fillStyle = selected.value;
  ctx.beginPath();
  ctx.arc(0, 0, 20, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 0.76;
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(-6, -7, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawRivalLane() {
  if (state.variant !== "duel" || elements.startScreen.classList.contains("active") || window.innerWidth <= 700) return;
  const width = window.innerWidth;
  const phase = ((state.runtime % 1) + 1) % 1;
  const baseY = Math.max(195, state.topY - state.jump - 70);
  const startX = width * 0.56;
  const segmentWidth = 56;
  const spacing = 76;
  const offset = phase * spacing;
  ctx.save();
  ctx.globalAlpha = 0.28 + state.rivalFlash * 0.16;
  ctx.font = "700 10px Segoe UI";
  ctx.letterSpacing = "3px";
  ctx.fillStyle = "rgba(220, 201, 255, 0.76)";
  ctx.fillText("AI GHOST LANE", startX - 9, baseY - 51);
  for (let index = 0; index < 6; index += 1) {
    const x = startX + index * spacing - offset;
    const tone = COLORS[(index + Math.floor(state.runtime + 1)) % COLORS.length];
    ctx.fillStyle = tone.value;
    ctx.shadowColor = tone.glow;
    ctx.shadowBlur = 13;
    ctx.fillRect(x, baseY, segmentWidth, 37);
  }
  const orbX = startX + spacing;
  const orbY = baseY - 11 - Math.sin(phase * Math.PI) * 65;
  ctx.fillStyle = state.rivalSuccessful ? "#bfa0ff" : "#ff4c8c";
  ctx.shadowColor = state.rivalSuccessful ? "rgba(191, 160, 255, 0.7)" : "rgba(255, 76, 140, 0.7)";
  ctx.shadowBlur = 22;
  ctx.beginPath();
  ctx.arc(orbX, orbY, 12, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function draw() {
  const width = window.innerWidth;
  const height = window.innerHeight;
  ctx.clearRect(0, 0, width, height);
  drawRivalLane();
  const pillarWidth = Math.max(74, Math.min(state.padSpacing - 24, 150));
  const centralIndex = Math.floor(state.runtime);
  for (let index = Math.max(0, centralIndex - 2); index <= centralIndex + Math.ceil(width / state.padSpacing) + 2; index += 1) {
    const x = padPosition(index);
    const pad = getPad(index);
    if (x > -pillarWidth && x < width + pillarWidth) drawPillar(x, pad, pillarWidth);
  }
  if (!elements.startScreen.classList.contains("active")) drawBall();
  state.particles.forEach((particle) => {
    ctx.save();
    ctx.globalAlpha = particle.life;
    ctx.fillStyle = particle.color;
    ctx.fillRect(particle.x, particle.y, particle.size, particle.size);
    ctx.restore();
  });
  if (state.flash > 0) {
    ctx.fillStyle = `rgba(255, 56, 115, ${state.flash * 0.2})`;
    ctx.fillRect(0, 0, width, height);
  }
}

function frame(now) {
  const delta = Math.min((now - state.lastFrame) / 1000 || 0, 0.04);
  state.lastFrame = now;
  update(delta);
  draw();
  state.frameId = requestAnimationFrame(frame);
}

function hitTestAndCycle(event) {
  if (!state.running) return;
  const rect = canvas.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;
  if (y < state.topY - 10) return;
  const current = Math.floor(state.runtime);
  const pillarWidth = Math.max(74, Math.min(state.padSpacing - 24, 150));
  for (let index = current + 1; index <= current + 7; index += 1) {
    if (Math.abs(x - padPosition(index)) <= pillarWidth / 2) {
      changePad(index);
      return;
    }
  }
}

document.querySelector("#startButton").addEventListener("click", () => prepareGame("solo"));
document.querySelector("#duelButton").addEventListener("click", () => prepareGame("duel"));
document.querySelector("#launchButton").addEventListener("click", beginGame);
document.querySelector("#rulesButton").addEventListener("click", () => openRules(false));
document.querySelector("#closeRulesButton").addEventListener("click", closeRules);
document.querySelector("#againButton").addEventListener("click", beginGame);
document.querySelector("#menuButton").addEventListener("click", goToMenu);
elements.soundButton.addEventListener("click", () => {
  state.sound = !state.sound;
  elements.soundButton.textContent = `Музыка: ${state.sound ? "вкл" : "выкл"}`;
  elements.soundButton.setAttribute("aria-pressed", String(state.sound));
  if (state.sound) {
    playTone("rotate");
    if (state.running || state.pausedForRules) {
      startMusic();
    } else {
      startMenuMusic();
    }
  } else {
    stopMusic();
  }
});
elements.pilotName.addEventListener("change", () => {
  const clean = elements.pilotName.value.trim().toUpperCase().slice(0, 12) || "PLAYER";
  elements.pilotName.value = clean;
  savePilot(clean);
});
elements.modeTrigger.addEventListener("click", toggleModeMenu);
elements.modeMenu.addEventListener("click", (event) => {
  const option = event.target.closest("button[data-mode]");
  if (option) selectMode(option.dataset.mode);
});
document.addEventListener("click", (event) => {
  if (!elements.modeControl.contains(event.target)) closeModeMenu();
});
document.addEventListener("keydown", (event) => {
  if (event.code === "Escape") closeModeMenu();
});
canvas.addEventListener("pointerdown", hitTestAndCycle);
document.querySelector("#touchControls").addEventListener("pointerdown", (event) => {
  const button = event.target.closest("button[data-color]");
  if (!button || !state.running) return;
  event.preventDefault();
  cycleUpcomingPad(Number(button.dataset.color));
});
window.addEventListener("keydown", (event) => {
  if (event.code === "Digit1") cycleUpcomingPad(0);
  if (event.code === "Digit2") cycleUpcomingPad(1);
  if (event.code === "Digit3") cycleUpcomingPad(2);
  if (event.code === "Space" && state.running) {
    event.preventDefault();
    cycleUpcomingPad();
  }
});
window.addEventListener("resize", resizeCanvas);
window.addEventListener("pointerdown", startMenuMusic, { once: true, capture: true });
window.addEventListener("keydown", startMenuMusic, { once: true, capture: true });

resizeCanvas();
elements.pilotName.value = loadPilot();
selectMode(state.mode);
renderLeaderboard();
getPad(0);
startMenuMusic();
state.lastFrame = performance.now();
state.frameId = requestAnimationFrame(frame);
