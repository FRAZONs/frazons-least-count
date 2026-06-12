let audioCtx = null;

function getAudioContext() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === "suspended") {
    audioCtx.resume();
  }
  return audioCtx;
}

function getFxVolume() {
  try {
    const vol = localStorage.getItem("frazons-fx-volume");
    return vol !== null ? Number(vol) : 0.5;
  } catch (e) {
    return 0.5;
  }
}

/**
 * Synthesizes a card draw/swish sound (fast frequency ramp down)
 */
export function playCardDrawSound() {
  try {
    const fxVol = getFxVolume();
    if (fxVol <= 0) return;

    const ctx = getAudioContext();
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(450, now);
    osc.frequency.exponentialRampToValueAtTime(120, now + 0.2);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.1 * fxVol, now + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.2);
  } catch (e) {
    console.warn("Audio context not allowed or supported yet", e);
  }
}

/**
 * Synthesizes a card play sound (snappy drop sound)
 */
export function playCardPlaySound() {
  try {
    const fxVol = getFxVolume();
    if (fxVol <= 0) return;

    const ctx = getAudioContext();
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "triangle";
    osc.frequency.setValueAtTime(250, now);
    osc.frequency.exponentialRampToValueAtTime(60, now + 0.15);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.15 * fxVol, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.15);
  } catch (e) {
    console.warn("Audio context not allowed or supported yet", e);
  }
}

/**
 * Synthesizes a short, subtle blip sound for selecting/unselecting cards
 */
export function playCardSelectSound() {
  try {
    const fxVol = getFxVolume();
    if (fxVol <= 0) return;

    const ctx = getAudioContext();
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(650, now);
    osc.frequency.exponentialRampToValueAtTime(450, now + 0.08);

    gain.gain.setValueAtTime(0.04 * fxVol, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.08);
  } catch (e) {
    console.warn("Audio context not allowed or supported yet", e);
  }
}

/**
 * Synthesizes a bubbly pop sound for emoji reactions
 */
export function playEmojiSound() {
  try {
    const fxVol = getFxVolume();
    if (fxVol <= 0) return;

    const ctx = getAudioContext();
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(400, now);
    osc.frequency.exponentialRampToValueAtTime(900, now + 0.12);

    gain.gain.setValueAtTime(0.08 * fxVol, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.12);
  } catch (e) {
    console.warn("Audio context not allowed or supported yet", e);
  }
}

/**
 * Synthesizes a card shuffling sound (series of soft swishes)
 */
export function playShufflingSound() {
  try {
    const fxVol = getFxVolume();
    if (fxVol <= 0) return;

    const ctx = getAudioContext();
    const now = ctx.currentTime;

    // Rhythmic sweeps simulating shuffling deck
    for (let i = 0; i < 9; i++) {
      const triggerTime = now + i * 0.16;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      // Slightly vary pitch up and down
      osc.frequency.setValueAtTime(320 + (i % 2 === 0 ? 30 : -30), triggerTime);
      osc.frequency.exponentialRampToValueAtTime(90, triggerTime + 0.1);

      gain.gain.setValueAtTime(0.001, triggerTime);
      gain.gain.linearRampToValueAtTime(0.08 * fxVol, triggerTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, triggerTime + 0.1);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(triggerTime);
      osc.stop(triggerTime + 0.1);
    }
  } catch (e) {
    console.warn("Audio context not allowed or supported yet", e);
  }
}

/**
 * Synthesizes a low-pitch thumping heartbeat sound
 */
export function playHeartbeatSound(speed = 1.0) {
  try {
    const fxVol = getFxVolume();
    if (fxVol <= 0) return;

    const ctx = getAudioContext();
    const now = ctx.currentTime;

    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(65, now);
    osc1.frequency.exponentialRampToValueAtTime(30, now + 0.12);
    gain1.gain.setValueAtTime(0.3 * fxVol, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.12);

    const delay = 0.15 / speed;
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(70, now + delay);
    osc2.frequency.exponentialRampToValueAtTime(35, now + delay + 0.14);
    gain2.gain.setValueAtTime(0.25 * fxVol, now + delay);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.14);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + delay);
    osc2.stop(now + delay + 0.14);
  } catch (e) {
    console.warn("Heartbeat audio synthesis failed", e);
  }
}

/**
 * Synthesizes a quick chat bubble popup sound (cheerful double pop)
 */
export function playQuickChatSound() {
  try {
    const fxVol = getFxVolume();
    if (fxVol <= 0) return;

    const ctx = getAudioContext();
    const now = ctx.currentTime;

    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(350, now);
    osc1.frequency.exponentialRampToValueAtTime(600, now + 0.08);
    gain1.gain.setValueAtTime(0.05 * fxVol, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.08);

    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(450, now + 0.06);
    osc2.frequency.exponentialRampToValueAtTime(800, now + 0.06 + 0.1);
    gain2.gain.setValueAtTime(0.05 * fxVol, now + 0.06);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.06 + 0.1);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.06);
    osc2.stop(now + 0.06 + 0.1);
  } catch (e) {
    console.warn("Quick chat audio synthesis failed", e);
  }
}
