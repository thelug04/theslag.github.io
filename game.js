const canvas = document.getElementById("runner-canvas");
const ctx = canvas.getContext("2d");
const scoreValue = document.getElementById("score-value");
const bestValue = document.getElementById("best-value");
const cdsValue = document.getElementById("cds-value");
const musicUnlock = document.getElementById("music-unlock");
const musicStatus = document.getElementById("music-status");
const pixelAudioPlayer = document.getElementById("pixel-audio-player");
const albumPlayer = document.getElementById("album-player");
const musicPlayButton = document.getElementById("music-play-button");
const musicSeek = document.getElementById("music-seek");
const musicTime = document.getElementById("music-time");
const overlay = document.getElementById("game-overlay");
const gameStateLabel = document.getElementById("game-state-label");
const startButton = document.getElementById("start-button");
const pauseButton = document.getElementById("pause-button");
const jumpButton = document.getElementById("jump-button");
const duckButton = document.getElementById("duck-button");
const soundButton = document.getElementById("sound-button");

const SPRITES = {
  player: {
    src: "assets/sprites/agonrun-32.png",
    frameWidth: 32,
    frameHeight: 32,
    frames: 6,
    columns: 6
  },
  playerDuck: {
    src: "assets/sprites/agondown-32.png"
  },
  coneObstacle: {
    src: "assets/sprites/cono-32.png"
  },
  fenceObstacle: {
    src: "assets/sprites/valla-32.png"
  },
  flyingObstacle: {
    src: "assets/sprites/ccrmfly-32.png",
    frameWidth: 32,
    frameHeight: 32,
    frames: 2,
    columns: 2
  },
  cdCollectible: {
    src: "assets/sprites/cds-32.png",
    frameWidth: 32,
    frameHeight: 32,
    frames: 6,
    columns: 3
  }
};

let WIDTH = 960;
const HEIGHT = 360;
const GROUND_Y = 286;
const BEST_SCORE_KEY = "theslag_runner_best";
const SOUND_STORAGE_KEY = "theslag_sound_enabled";
const MUSIC_UNLOCK_KEY = "theslag_runner_music_unlocked";
const GRAVITY = 2600;
const JUMP_SPEED = -920;
const BASE_SPEED = 360;
const MAX_SPEED = 820;
const SPEED_RAMP = 0.5;
const FIRST_OBSTACLE_DELAY = 1.8;
const DIFFICULTY_SCORE_CAP = 1200;
const SPRITE_SOURCE_SIZE = 32;
const SPRITE_SCALE = 4;
const SPRITE_SIZE = SPRITE_SOURCE_SIZE * SPRITE_SCALE;
const FLYING_HIGH_Y = GROUND_Y - 162;
const FLYING_LOW_Y = GROUND_Y - 112;
const FLYING_WOBBLE = 2;
const CD_WOBBLE = 5;
const CD_FRAME_DURATION = 120;
const MAX_CDS = 5;
const GROUND_OBSTACLE_GAP = { min: 2 * SPRITE_SCALE, max: 3 * SPRITE_SCALE };
const CD_LANES = [
  { name: "low", y: GROUND_Y - SPRITE_SIZE - 6 },
  { name: "mid", y: GROUND_Y - SPRITE_SIZE - 64 },
  { name: "high", y: GROUND_Y - SPRITE_SIZE - 112 }
];
const CD_HITBOX = {
  x: 8 * SPRITE_SCALE,
  y: 7 * SPRITE_SCALE,
  width: 16 * SPRITE_SCALE,
  height: 18 * SPRITE_SCALE
};
const GAME_OVER_MESSAGES = [
  { maxScore: 1000, text: "weon malo" },
  { maxScore: 2000, text: "ya po, casi" },
  { maxScore: 3500, text: "ta piola" },
  { maxScore: 5000, text: "ojo, vai prendio" },
  { maxScore: 7500, text: "se puso brigido" },
  { maxScore: 10000, text: "maquina total" },
  { maxScore: Infinity, text: "el wn bueno wn" }
];
const GROUND_OBSTACLE_TYPES = {
  cone: {
    sprite: "coneObstacle",
    visual: {
      x: 11 * SPRITE_SCALE,
      y: 20 * SPRITE_SCALE,
      width: 10 * SPRITE_SCALE,
      height: 12 * SPRITE_SCALE
    },
    hitbox: {
      x: 1 * SPRITE_SCALE,
      y: 1 * SPRITE_SCALE,
      width: 8 * SPRITE_SCALE,
      height: 10 * SPRITE_SCALE
    }
  },
  fence: {
    sprite: "fenceObstacle",
    visual: {
      x: 4 * SPRITE_SCALE,
      y: 18 * SPRITE_SCALE,
      width: 24 * SPRITE_SCALE,
      height: 14 * SPRITE_SCALE
    },
    hitbox: {
      x: 0,
      y: 1 * SPRITE_SCALE,
      width: 24 * SPRITE_SCALE,
      height: 12 * SPRITE_SCALE
    }
  }
};

const colors = {
  background: "#f8f6ef",
  ink: "#111111",
  paleInk: "#57514a",
  shade: "#000000",
  gold: "#f7d18f",
  red: "#f34d43",
  green: "#4d7e52",
  blue: "#a4dada"
};

const loadedSprites = {};
const player = {
  x: 92,
  y: GROUND_Y - SPRITE_SIZE,
  width: SPRITE_SIZE,
  height: SPRITE_SIZE,
  duckWidth: SPRITE_SIZE,
  duckHeight: SPRITE_SIZE,
  hitbox: {
    x: 7 * SPRITE_SCALE,
    y: 10 * SPRITE_SCALE,
    width: 17 * SPRITE_SCALE,
    height: 22 * SPRITE_SCALE
  },
  duckHitbox: {
    x: 7 * SPRITE_SCALE,
    y: 13 * SPRITE_SCALE,
    width: 16 * SPRITE_SCALE,
    height: 19 * SPRITE_SCALE
  },
  velocityY: 0,
  grounded: true,
  ducking: false
};

let bestScore = readBestScore();
let score = 0;
let distance = 0;
let speed = BASE_SPEED;
let state = "ready";
let lastTime = 0;
let nextObstacleIn = 0.9;
let nextCdIn = 2.4;
let nextScoreSoundAt = 100;
let groundOffset = 0;
let shakeTimer = 0;
let obstacles = [];
let collectibles = [];
let clouds = [];
let cdsCollected = 0;
let musicUnlocked = readMusicUnlockState();
let soundEnabled = readSoundState();
let audioContext = null;

function configureCanvas() {
  const nextWidth = window.matchMedia("(max-width: 768px)").matches ? 640 : 960;
  const ratio = nextWidth / WIDTH;

  if (canvas.width !== nextWidth || canvas.height !== HEIGHT) {
    obstacles.forEach((obstacle) => {
      obstacle.x *= ratio;
    });

    clouds.forEach((cloud) => {
      cloud.x *= ratio;
    });

    collectibles.forEach((collectible) => {
      collectible.x *= ratio;
    });

    WIDTH = nextWidth;
    canvas.width = WIDTH;
    canvas.height = HEIGHT;
  }
}

configureCanvas();

Object.entries(SPRITES).forEach(([name, sprite]) => {
  const image = new Image();
  image.onload = () => {
    loadedSprites[name] = {
      image,
      crop: sprite.crop || null,
      sourceX: sprite.sourceX || 0,
      sourceY: sprite.sourceY || 0,
      frameWidth: sprite.frameWidth || null,
      frameHeight: sprite.frameHeight || null,
      frameCrop: sprite.frameCrop || null,
      frames: sprite.frames || 1,
      columns: sprite.columns || sprite.frames || 1,
      ready: true
    };
    drawScene();
  };
  image.onerror = () => {
    loadedSprites[name] = { image: null, crop: null, ready: false };
  };
  image.src = sprite.src;
});

function formatScore(value) {
  return String(Math.max(0, Math.floor(value))).padStart(5, "0");
}

function randomBetween(min, max) {
  return Math.random() * (max - min) + min;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function lerp(start, end, amount) {
  return start + (end - start) * amount;
}

function getGroundObstacleCount(difficulty) {
  if (score < 180) return 1;

  const roll = Math.random();
  const tripleChance = score > 640 ? lerp(0.02, 0.11, difficulty) : 0;
  const doubleChance = lerp(0.1, 0.28, difficulty);

  if (roll < tripleChance) return 3;
  if (roll < tripleChance + doubleChance) return 2;
  return 1;
}

function pickGroundObstacleType(count, hasFence) {
  const canUseFence = score > 120 && count < 3 && !hasFence;
  const fenceChance = count === 1 ? 0.42 : 0.22;
  return canUseFence && Math.random() < fenceChance
    ? GROUND_OBSTACLE_TYPES.fence
    : GROUND_OBSTACLE_TYPES.cone;
}

function createGroundObstacleGroup(difficulty) {
  const count = getGroundObstacleCount(difficulty);
  const segments = [];
  let width = 0;
  let height = 0;
  let hasFence = false;

  for (let index = 0; index < count; index += 1) {
    const type = pickGroundObstacleType(count, hasFence);
    segments.push({
      x: width,
      y: 0,
      sprite: type.sprite,
      drawOffsetX: -type.visual.x,
      drawOffsetY: 0,
      drawWidth: SPRITE_SIZE,
      drawHeight: SPRITE_SIZE,
      visualY: type.visual.y,
      width: type.visual.width,
      height: type.visual.height,
      hitbox: type.hitbox
    });
    width += type.visual.width;
    height = Math.max(height, SPRITE_SIZE);
    hasFence = hasFence || type.sprite === GROUND_OBSTACLE_TYPES.fence.sprite;

    if (index < count - 1) {
      width += randomBetween(GROUND_OBSTACLE_GAP.min, GROUND_OBSTACLE_GAP.max);
    }
  }

  return { width, height, segments };
}

function getDifficulty() {
  return clamp(score / DIFFICULTY_SCORE_CAP, 0, 1);
}

function scheduleNextObstacle() {
  const difficulty = getDifficulty();
  const minInterval = lerp(1.55, 0.72, difficulty);
  const maxInterval = lerp(2.35, 1.18, difficulty);
  nextObstacleIn = randomBetween(minInterval, maxInterval);
}

function scheduleNextCd(isFirst = false) {
  const difficulty = getDifficulty();
  const minInterval = isFirst ? 1.7 : lerp(3.1, 2.1, difficulty);
  const maxInterval = isFirst ? 3.8 : lerp(5.6, 3.6, difficulty);
  nextCdIn = randomBetween(minInterval, maxInterval);
}

function readBestScore() {
  try {
    const savedScore = Number(localStorage.getItem(BEST_SCORE_KEY) || 0);
    return Number.isFinite(savedScore) ? savedScore : 0;
  } catch (error) {
    return 0;
  }
}

function saveBestScore(value) {
  try {
    localStorage.setItem(BEST_SCORE_KEY, String(value));
  } catch (error) {
    return;
  }
}

function readSoundState() {
  try {
    return localStorage.getItem(SOUND_STORAGE_KEY) !== "0";
  } catch (error) {
    return true;
  }
}

function saveSoundState() {
  try {
    localStorage.setItem(SOUND_STORAGE_KEY, soundEnabled ? "1" : "0");
  } catch (error) {
    return;
  }
}

function readMusicUnlockState() {
  try {
    return localStorage.getItem(MUSIC_UNLOCK_KEY) === "1";
  } catch (error) {
    return false;
  }
}

function saveMusicUnlockState() {
  try {
    localStorage.setItem(MUSIC_UNLOCK_KEY, musicUnlocked ? "1" : "0");
  } catch (error) {
    return;
  }
}

function renderSoundButton() {
  if (!soundButton) return;
  soundButton.textContent = soundEnabled ? "SFX" : "OFF";
  soundButton.setAttribute("aria-pressed", String(soundEnabled));
  soundButton.setAttribute("aria-label", soundEnabled ? "Silenciar sonido" : "Activar sonido");
  soundButton.title = soundEnabled ? "Silenciar sonido" : "Activar sonido";
}

function renderMusicUnlock() {
  if (!musicUnlock) return;
  musicUnlock.classList.toggle("is-unlocked", musicUnlocked);
  musicUnlock.classList.toggle("is-locked", !musicUnlocked);

  if (musicStatus) {
    musicStatus.hidden = musicUnlocked;
    musicStatus.textContent = musicUnlocked ? "" : "Consigue los cds para desbloquear";
  }

  if (pixelAudioPlayer) {
    pixelAudioPlayer.setAttribute("aria-disabled", String(!musicUnlocked));
  }

  if (musicPlayButton) {
    musicPlayButton.disabled = !musicUnlocked;
  }

  if (musicSeek) {
    musicSeek.disabled = !musicUnlocked || !albumPlayer || !Number.isFinite(albumPlayer.duration);
  }

  if (albumPlayer) {
    albumPlayer.preload = musicUnlocked ? "metadata" : "none";
    if (!musicUnlocked) {
      albumPlayer.pause();
      albumPlayer.currentTime = 0;
    }
    if (musicUnlocked && !albumPlayer.currentSrc) {
      albumPlayer.load();
    }
  }

  renderAlbumPlayer();
}

function formatTrackTime(value) {
  const safeValue = Number.isFinite(value) && value > 0 ? value : 0;
  const minutes = Math.floor(safeValue / 60);
  const seconds = Math.floor(safeValue % 60);
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function renderAlbumPlayer() {
  if (!albumPlayer) return;

  const duration = Number.isFinite(albumPlayer.duration) ? albumPlayer.duration : 0;
  const currentTime = Number.isFinite(albumPlayer.currentTime) ? albumPlayer.currentTime : 0;
  const progress = duration > 0 ? clamp((currentTime / duration) * 100, 0, 100) : 0;

  if (musicPlayButton) {
    musicPlayButton.textContent = albumPlayer.paused ? ">" : "II";
    musicPlayButton.setAttribute("aria-label", albumPlayer.paused ? "Reproducir Just Me" : "Pausar Just Me");
  }

  if (musicSeek) {
    musicSeek.max = String(duration || 100);
    musicSeek.value = String(duration > 0 ? currentTime : 0);
    musicSeek.style.setProperty("--progress", `${progress}%`);
    musicSeek.disabled = !musicUnlocked || duration <= 0;
  }

  if (musicTime) {
    musicTime.textContent = `${formatTrackTime(currentTime)} / ${formatTrackTime(duration)}`;
  }
}

function toggleAlbumPlayback() {
  if (!musicUnlocked || !albumPlayer) return;

  if (albumPlayer.paused) {
    albumPlayer.play().catch(() => {
      renderAlbumPlayer();
    });
  } else {
    albumPlayer.pause();
  }

  renderAlbumPlayer();
}

function seekAlbumTrack() {
  if (!musicUnlocked || !albumPlayer || !musicSeek) return;
  albumPlayer.currentTime = Number(musicSeek.value) || 0;
  renderAlbumPlayer();
}

function getAudioContext() {
  if (!audioContext) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return null;
    audioContext = new AudioContextClass();
  }

  if (audioContext.state === "suspended") {
    audioContext.resume();
  }

  return audioContext;
}

function playTone(ctx, frequency, duration, options = {}) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  const start = ctx.currentTime + (options.delay || 0);
  const endFrequency = options.endFrequency || frequency;

  osc.type = options.type || "square";
  osc.frequency.setValueAtTime(frequency, start);

  if (endFrequency !== frequency) {
    osc.frequency.exponentialRampToValueAtTime(endFrequency, start + duration);
  }

  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(options.volume || 0.05, start + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(start);
  osc.stop(start + duration + 0.03);
}

function playGameSound(type) {
  if (!soundEnabled) return;

  const ctx = getAudioContext();
  if (!ctx) return;

  const sounds = {
    start: () => {
      playTone(ctx, 330, 0.08, { volume: 0.04 });
      playTone(ctx, 494, 0.09, { delay: 0.07, volume: 0.045 });
    },
    resume: () => playTone(ctx, 420, 0.08, { volume: 0.04, endFrequency: 620 }),
    pause: () => playTone(ctx, 260, 0.08, { volume: 0.035, endFrequency: 180 }),
    jump: () => playTone(ctx, 360, 0.13, { volume: 0.055, endFrequency: 720 }),
    duck: () => playTone(ctx, 210, 0.08, { type: "triangle", volume: 0.045, endFrequency: 140 }),
    collect: () => {
      playTone(ctx, 520, 0.07, { type: "triangle", volume: 0.045 });
      playTone(ctx, 780, 0.09, { delay: 0.05, type: "triangle", volume: 0.05 });
    },
    unlock: () => {
      playTone(ctx, 392, 0.08, { type: "triangle", volume: 0.045 });
      playTone(ctx, 523, 0.08, { delay: 0.07, type: "triangle", volume: 0.05 });
      playTone(ctx, 659, 0.1, { delay: 0.14, type: "triangle", volume: 0.055 });
      playTone(ctx, 784, 0.14, { delay: 0.22, type: "square", volume: 0.04 });
    },
    score: () => {
      playTone(ctx, 660, 0.06, { volume: 0.035 });
      playTone(ctx, 880, 0.08, { delay: 0.05, volume: 0.04 });
    },
    hit: () => {
      playTone(ctx, 170, 0.24, { type: "sawtooth", volume: 0.075, endFrequency: 55 });
      playTone(ctx, 90, 0.16, { delay: 0.04, type: "square", volume: 0.04, endFrequency: 45 });
    }
  };

  sounds[type]?.();
}

function updateHud() {
  scoreValue.textContent = formatScore(score);
  bestValue.textContent = formatScore(bestScore);
  cdsValue.textContent = `${musicUnlocked ? MAX_CDS : cdsCollected}/${MAX_CDS}`;
}

function toggleSound() {
  soundEnabled = !soundEnabled;
  saveSoundState();
  renderSoundButton();

  if (soundEnabled) {
    playGameSound("start");
  }
}

function getGameOverMessage() {
  return GAME_OVER_MESSAGES.find((message) => score < message.maxScore)?.text || "FIN";
}

function unlockMusicPlayer() {
  if (musicUnlocked) {
    playGameSound("collect");
    return;
  }

  cdsCollected = MAX_CDS;
  musicUnlocked = true;
  saveMusicUnlockState();
  renderMusicUnlock();
  updateHud();
  playGameSound("unlock");
}

function setOverlay(nextState) {
  if (nextState === "playing") {
    overlay.classList.add("is-hidden");
  } else {
    overlay.classList.remove("is-hidden");
  }

  const labels = {
    ready: "READY",
    paused: "PAUSA",
    over: "FIN"
  };

  const buttons = {
    ready: "Jugar",
    paused: "Seguir",
    over: "Otra vez"
  };

  gameStateLabel.textContent = nextState === "over" ? getGameOverMessage() : labels[nextState] || "";
  startButton.textContent = buttons[nextState] || "Jugar";
  pauseButton.textContent = nextState === "paused" ? ">" : "II";
  pauseButton.setAttribute("aria-label", nextState === "paused" ? "Continuar" : "Pausar");
  pauseButton.disabled = nextState === "ready" || nextState === "over";
}

function resetGame() {
  score = 0;
  distance = 0;
  speed = BASE_SPEED;
  nextObstacleIn = FIRST_OBSTACLE_DELAY;
  scheduleNextCd(true);
  nextScoreSoundAt = 100;
  groundOffset = 0;
  shakeTimer = 0;
  obstacles = [];
  collectibles = [];
  cdsCollected = musicUnlocked ? MAX_CDS : 0;
  clouds = [
    { x: WIDTH * 0.22, y: 70, width: 72, speed: 22 },
    { x: WIDTH * 0.58, y: 44, width: 92, speed: 16 },
    { x: WIDTH * 0.84, y: 96, width: 64, speed: 26 }
  ];
  player.y = GROUND_Y - player.height;
  player.velocityY = 0;
  player.grounded = true;
  player.ducking = false;
  updateHud();
}

function startGame() {
  const wasPaused = state === "paused";

  if (state === "ready" || state === "over") {
    resetGame();
  }

  state = "playing";
  setOverlay(state);
  lastTime = performance.now();
  playGameSound(wasPaused ? "resume" : "start");
}

function togglePause() {
  if (state === "playing") {
    state = "paused";
    setOverlay(state);
    playGameSound("pause");
  } else if (state === "paused") {
    startGame();
  }
}

function endGame() {
  state = "over";
  shakeTimer = 0.28;
  bestScore = Math.max(bestScore, score);
  saveBestScore(bestScore);
  updateHud();
  setOverlay(state);
  playGameSound("hit");
}

function jump() {
  if (state !== "playing") {
    startGame();
    return;
  }

  if (!player.grounded) return;
  player.velocityY = JUMP_SPEED;
  player.grounded = false;
  player.ducking = false;
  playGameSound("jump");
}

function setDuck(isDucking) {
  if (state !== "playing") return;

  if (isDucking && !player.grounded && player.velocityY < 700) {
    player.velocityY += 420;
  }

  const nextDucking = isDucking && player.grounded;
  if (nextDucking && !player.ducking) {
    playGameSound("duck");
  }
  player.ducking = nextDucking;
}

function spawnObstacle() {
  const difficulty = getDifficulty();
  const flyingProgress = clamp((score - 500) / 700, 0, 1);
  const flying = score > 500 && Math.random() < lerp(0.08, 0.32, flyingProgress);
  const flyingLane = flying && Math.random() < 0.5 ? "high" : "low";

  if (!flying) {
    const groundGroup = createGroundObstacleGroup(difficulty);
    obstacles.push({
      x: WIDTH + 36,
      y: GROUND_Y - groundGroup.height,
      width: groundGroup.width,
      height: groundGroup.height,
      kind: "groundObstacle",
      lane: "ground",
      segments: groundGroup.segments,
      wiggle: randomBetween(0, Math.PI * 2)
    });
    return;
  }

  const width = SPRITE_SIZE;
  const height = SPRITE_SIZE;

  obstacles.push({
    x: WIDTH + 36,
    y: flyingLane === "high" ? FLYING_HIGH_Y : FLYING_LOW_Y,
    width,
    height,
    kind: "flyingObstacle",
    lane: flyingLane,
    wiggle: randomBetween(0, Math.PI * 2)
  });
}

function getCdLane() {
  const roll = Math.random();
  if (roll < 0.46) return CD_LANES[0];
  if (roll < 0.8) return CD_LANES[1];
  return CD_LANES[2];
}

function getCdSpawnX() {
  let x = WIDTH + randomBetween(100, 280);

  obstacles.forEach((obstacle) => {
    const obstacleRight = obstacle.x + obstacle.width;
    const centerDistance = Math.abs((obstacle.x + obstacle.width / 2) - (x + SPRITE_SIZE / 2));

    if (obstacleRight > WIDTH - 80 && centerDistance < 190) {
      x = Math.max(x, obstacleRight + randomBetween(150, 240));
    }
  });

  return x;
}

function spawnCollectible() {
  if (cdsCollected >= MAX_CDS || collectibles.length > 0) return;

  const lane = getCdLane();
  collectibles.push({
    x: getCdSpawnX(),
    y: lane.y,
    width: SPRITE_SIZE,
    height: SPRITE_SIZE,
    lane: lane.name,
    wiggle: randomBetween(0, Math.PI * 2)
  });
}

function updateGame(delta) {
  distance += speed * delta;
  score = Math.floor(distance / 12);

  if (score >= nextScoreSoundAt) {
    playGameSound("score");
    while (score >= nextScoreSoundAt) {
      nextScoreSoundAt += 100;
    }
  }

  speed = Math.min(MAX_SPEED, BASE_SPEED + score * SPEED_RAMP);
  groundOffset = (groundOffset + speed * delta) % 48;

  const currentHeight = player.ducking ? player.duckHeight : player.height;
  const targetGroundY = GROUND_Y - currentHeight;

  player.velocityY += GRAVITY * delta;
  player.y += player.velocityY * delta;

  if (player.y >= targetGroundY) {
    player.y = targetGroundY;
    player.velocityY = 0;
    player.grounded = true;
  } else {
    player.grounded = false;
  }

  nextObstacleIn -= delta;
  if (nextObstacleIn <= 0) {
    spawnObstacle();
    scheduleNextObstacle();
  }

  if (cdsCollected < MAX_CDS && collectibles.length === 0) {
    nextCdIn -= delta;
    if (nextCdIn <= 0) {
      spawnCollectible();
      scheduleNextCd();
    }
  }

  obstacles = obstacles.filter((obstacle) => {
    obstacle.x -= speed * delta;
    obstacle.wiggle += delta * 8;
    return obstacle.x + obstacle.width > -30;
  });

  collectibles = collectibles.filter((collectible) => {
    collectible.x -= speed * delta;
    collectible.wiggle += delta * 7;

    if (collidesWithCollectible(collectible)) {
      cdsCollected = Math.min(MAX_CDS, cdsCollected + 1);
      if (cdsCollected >= MAX_CDS) {
        unlockMusicPlayer();
      } else {
        playGameSound("collect");
      }
      return false;
    }

    return collectible.x + collectible.width > -30;
  });

  clouds.forEach((cloud) => {
    cloud.x -= cloud.speed * delta;
    if (cloud.x < -cloud.width) {
      cloud.x = WIDTH + randomBetween(20, 180);
      cloud.y = randomBetween(38, 110);
      cloud.width = randomBetween(58, 106);
    }
  });

  updateHud();

  if (obstacles.some(collidesWithPlayer)) {
    endGame();
  }
}

function getPlayerBox() {
  const box = player.ducking ? player.duckHitbox : player.hitbox;

  return {
    x: player.x + box.x,
    y: player.y + box.y,
    width: box.width,
    height: box.height
  };
}

function boxesOverlap(a, b) {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

function getCollectibleBox(collectible) {
  return {
    x: collectible.x + CD_HITBOX.x,
    y: collectible.y + CD_HITBOX.y,
    width: CD_HITBOX.width,
    height: CD_HITBOX.height
  };
}

function getObstacleBoxes(obstacle) {
  if (obstacle.kind === "flyingObstacle") {
    return [{
      x: obstacle.x + 10 * SPRITE_SCALE,
      y: obstacle.y + 13 * SPRITE_SCALE,
      width: 12 * SPRITE_SCALE,
      height: 7 * SPRITE_SCALE
    }];
  }

  if (obstacle.segments) {
    return obstacle.segments.map((segment) => {
      const hitbox = segment.hitbox || { x: 0, y: 0, width: segment.width, height: segment.height };
      return {
        x: obstacle.x + segment.x + hitbox.x,
        y: obstacle.y + segment.visualY + hitbox.y,
        width: hitbox.width,
        height: hitbox.height
      };
    });
  }

  return [{
    x: obstacle.x + obstacle.width * 0.14,
    y: obstacle.y + obstacle.height * 0.12,
    width: obstacle.width * 0.72,
    height: obstacle.height * 0.78
  }];
}

function collidesWithPlayer(obstacle) {
  const a = getPlayerBox();
  return getObstacleBoxes(obstacle).some((b) => boxesOverlap(a, b));
}

function collidesWithCollectible(collectible) {
  return boxesOverlap(getPlayerBox(), getCollectibleBox(collectible));
}

function drawPixelRect(x, y, width, height, color) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(width), Math.round(height));
}

function drawCloud(cloud) {
  const size = cloud.width / 8;
  drawPixelRect(cloud.x, cloud.y + size, size * 2, size, colors.paleInk);
  drawPixelRect(cloud.x + size * 2, cloud.y, size * 3, size * 2, colors.paleInk);
  drawPixelRect(cloud.x + size * 5, cloud.y + size, size * 3, size, colors.paleInk);
}

function drawGround() {
  drawPixelRect(0, GROUND_Y, WIDTH, 4, colors.ink);
  for (let x = -groundOffset; x < WIDTH; x += 48) {
    drawPixelRect(x, GROUND_Y + 18, 24, 4, colors.paleInk);
    drawPixelRect(x + 32, GROUND_Y + 30, 8, 4, colors.paleInk);
  }
}

function drawSprite(name, x, y, width, height, fallback, frameOverride = null) {
  const sprite = loadedSprites[name];
  ctx.imageSmoothingEnabled = false;

  if (sprite && sprite.ready && sprite.image) {
    if (sprite.frameWidth && sprite.frameHeight) {
      const frame = frameOverride === null ? getSpriteFrame(name, sprite.frames) : frameOverride % sprite.frames;
      const columns = sprite.columns || sprite.frames;
      const frameCrop = sprite.frameCrop || { x: 0, y: 0, width: sprite.frameWidth, height: sprite.frameHeight };
      ctx.drawImage(
        sprite.image,
        sprite.sourceX + (frame % columns) * sprite.frameWidth + frameCrop.x,
        sprite.sourceY + Math.floor(frame / columns) * sprite.frameHeight + frameCrop.y,
        frameCrop.width,
        frameCrop.height,
        Math.round(x),
        Math.round(y),
        Math.round(width),
        Math.round(height)
      );
      return;
    }

    if (sprite.crop) {
      ctx.drawImage(
        sprite.image,
        sprite.crop.x,
        sprite.crop.y,
        sprite.crop.width,
        sprite.crop.height,
        Math.round(x),
        Math.round(y),
        Math.round(width),
        Math.round(height)
      );
    } else {
      ctx.drawImage(sprite.image, Math.round(x), Math.round(y), Math.round(width), Math.round(height));
    }
    return;
  }

  fallback();
}

function getSpriteFrame(name, frames) {
  if (frames < 2) return 0;
  if (state !== "playing") return 0;
  if (name === "flyingObstacle") return Math.floor(distance / 52) % frames;
  if (name === "cdCollectible") return Math.floor(performance.now() / CD_FRAME_DURATION) % frames;
  if (name !== "player") return 0;
  if (!player.grounded) return 0;
  return Math.floor(distance / 60) % frames;
}

function drawPlayer() {
  const ducking = player.ducking && player.grounded;
  const spriteName = ducking ? "playerDuck" : "player";
  const width = ducking ? player.duckWidth : player.width;
  const height = ducking ? player.duckHeight : player.height;
  const x = player.x;
  const y = player.y;

  drawSprite(spriteName, x, y, width, height, () => {
    drawPixelRect(x + 14, y + 8, 44, 20, colors.blue);
    drawPixelRect(x + 6, y + 28, 60, 34, colors.blue);
    drawPixelRect(x + 22, y + 62, 18, 28, colors.blue);
    drawPixelRect(x + 48, y + 62, 14, 28, colors.ink);
    drawPixelRect(x + 46, y + 18, 8, 8, colors.ink);
  });
}

function drawGroundObstacleFallback(spriteName, x, y, width, height) {
  if (spriteName === "fenceObstacle") {
    drawPixelRect(x, y + height * 0.18, width, height * 0.24, colors.ink);
    drawPixelRect(x + width * 0.08, y + height * 0.26, width * 0.84, height * 0.1, colors.red);
    drawPixelRect(x + width * 0.12, y + height * 0.48, width * 0.12, height * 0.44, colors.ink);
    drawPixelRect(x + width * 0.76, y + height * 0.48, width * 0.12, height * 0.44, colors.ink);
    drawPixelRect(x + width * 0.05, y + height * 0.88, width * 0.22, height * 0.12, colors.ink);
    drawPixelRect(x + width * 0.73, y + height * 0.88, width * 0.22, height * 0.12, colors.ink);
    return;
  }

  drawPixelRect(x + width * 0.28, y + height * 0.72, width * 0.44, height * 0.16, colors.ink);
  drawPixelRect(x + width * 0.18, y + height * 0.56, width * 0.64, height * 0.18, colors.ink);
  drawPixelRect(x + width * 0.32, y + height * 0.28, width * 0.36, height * 0.3, colors.gold);
  drawPixelRect(x + width * 0.42, y + height * 0.08, width * 0.16, height * 0.22, colors.gold);
}

function drawCollectible(collectible) {
  const floatY = Math.sin(collectible.wiggle) * CD_WOBBLE;

  drawSprite("cdCollectible", collectible.x, collectible.y + floatY, collectible.width, collectible.height, () => {
    drawPixelRect(collectible.x + 10 * SPRITE_SCALE, collectible.y + floatY + 8 * SPRITE_SCALE, 12 * SPRITE_SCALE, 18 * SPRITE_SCALE, colors.paleInk);
    drawPixelRect(collectible.x + 13 * SPRITE_SCALE, collectible.y + floatY + 12 * SPRITE_SCALE, 6 * SPRITE_SCALE, 10 * SPRITE_SCALE, colors.background);
    drawPixelRect(collectible.x + 15 * SPRITE_SCALE, collectible.y + floatY + 15 * SPRITE_SCALE, 2 * SPRITE_SCALE, 4 * SPRITE_SCALE, colors.ink);
  });
}

function drawObstacle(obstacle) {
  const wobble = obstacle.kind === "flyingObstacle" ? Math.sin(obstacle.wiggle) * FLYING_WOBBLE : 0;

  if (obstacle.kind === "groundObstacle" && obstacle.segments) {
    obstacle.segments.forEach((segment) => {
      const drawX = obstacle.x + segment.x + segment.drawOffsetX;
      const drawY = obstacle.y + segment.drawOffsetY;
      drawSprite(
        segment.sprite,
        drawX,
        drawY,
        segment.drawWidth,
        segment.drawHeight,
        () => drawGroundObstacleFallback(segment.sprite, obstacle.x + segment.x, obstacle.y + segment.visualY, segment.width, segment.height)
      );
    });
    return;
  }

  drawSprite(obstacle.kind, obstacle.x, obstacle.y + wobble, obstacle.width, obstacle.height, () => {
    if (obstacle.kind === "flyingObstacle") {
      drawPixelRect(obstacle.x + 8, obstacle.y + wobble + 16, obstacle.width - 16, 20, colors.red);
      drawPixelRect(obstacle.x + 20, obstacle.y + wobble, 20, obstacle.height, colors.ink);
      drawPixelRect(obstacle.x + obstacle.width - 30, obstacle.y + wobble + 6, 22, 18, colors.gold);
      return;
    }

    drawGroundObstacleFallback("coneObstacle", obstacle.x, obstacle.y, obstacle.width, obstacle.height);
  });
}

function drawScene() {
  const shake = shakeTimer > 0 ? Math.sin(performance.now() / 18) * 5 : 0;
  ctx.save();
  ctx.clearRect(0, 0, WIDTH, HEIGHT);
  ctx.translate(shake, 0);
  drawPixelRect(-10, -10, WIDTH + 20, HEIGHT + 20, colors.background);
  clouds.forEach(drawCloud);
  drawGround();
  obstacles.forEach(drawObstacle);
  collectibles.forEach(drawCollectible);
  drawPlayer();
  ctx.restore();
}

function loop(now) {
  const delta = Math.min((now - lastTime) / 1000 || 0, 0.035);
  lastTime = now;

  if (state === "playing") {
    updateGame(delta);
  }

  if (shakeTimer > 0) {
    shakeTimer = Math.max(0, shakeTimer - delta);
  }

  drawScene();
  requestAnimationFrame(loop);
}

function handleKeyDown(event) {
  if (event.repeat) return;

  if (event.code === "Space" || event.code === "ArrowUp" || event.code === "KeyW") {
    event.preventDefault();
    jump();
  }

  if (event.code === "ArrowDown" || event.code === "KeyS") {
    event.preventDefault();
    setDuck(true);
  }

  if (event.code === "KeyP" || event.code === "Escape") {
    event.preventDefault();
    togglePause();
  }
}

function handleKeyUp(event) {
  if (event.code === "ArrowDown" || event.code === "KeyS") {
    setDuck(false);
  }
}

function bindHoldButton(button, onPress, onRelease) {
  button.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    button.setPointerCapture(event.pointerId);
    onPress();
  });

  button.addEventListener("pointerup", (event) => {
    event.preventDefault();
    onRelease();
  });

  button.addEventListener("pointercancel", onRelease);
  button.addEventListener("lostpointercapture", onRelease);
}

canvas.addEventListener("pointerdown", (event) => {
  event.preventDefault();
  jump();
});

startButton.addEventListener("click", startGame);
pauseButton.addEventListener("click", togglePause);
soundButton?.addEventListener("click", toggleSound);
musicPlayButton?.addEventListener("click", toggleAlbumPlayback);
musicSeek?.addEventListener("input", seekAlbumTrack);
albumPlayer?.addEventListener("loadedmetadata", renderAlbumPlayer);
albumPlayer?.addEventListener("timeupdate", renderAlbumPlayer);
albumPlayer?.addEventListener("play", renderAlbumPlayer);
albumPlayer?.addEventListener("pause", renderAlbumPlayer);
albumPlayer?.addEventListener("ended", renderAlbumPlayer);
bindHoldButton(jumpButton, jump, () => {});
bindHoldButton(duckButton, () => setDuck(true), () => setDuck(false));
document.addEventListener("keydown", handleKeyDown);
document.addEventListener("keyup", handleKeyUp);
window.addEventListener("resize", () => {
  configureCanvas();
  drawScene();
});
document.addEventListener("visibilitychange", () => {
  if (document.hidden && state === "playing") {
    togglePause();
  }
});

resetGame();
setOverlay(state);
renderSoundButton();
renderMusicUnlock();
requestAnimationFrame((now) => {
  lastTime = now;
  requestAnimationFrame(loop);
});
