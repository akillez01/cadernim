const STEP_TO_SEMITONE: Record<string, number> = {
  C: 0,
  D: 2,
  E: 4,
  F: 5,
  G: 7,
  A: 9,
  B: 11
};

const SHARP_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const FLAT_TO_SHARP: Record<string, string> = {
  Db: "C#",
  Eb: "D#",
  Gb: "F#",
  Ab: "G#",
  Bb: "A#",
  Cb: "B",
  Fb: "E"
};

export function pitchToMidi(step: string, alter: number, octave: number) {
  const base = STEP_TO_SEMITONE[step.toUpperCase()];
  if (base === undefined) {
    return 60;
  }
  return (octave + 1) * 12 + base + alter;
}

export function midiToPitch(midi: number) {
  const safeMidi = Math.max(0, Math.min(127, Math.round(midi)));
  const octave = Math.floor(safeMidi / 12) - 1;
  const semitone = safeMidi % 12;
  const name = SHARP_NAMES[semitone];
  const step = name[0];
  const alter = name.length > 1 ? 1 : 0;

  return { step, alter, octave };
}

export function midiToNoteName(midi: number) {
  const safeMidi = Math.max(0, Math.min(127, Math.round(midi)));
  const octave = Math.floor(safeMidi / 12) - 1;
  const semitone = safeMidi % 12;
  return `${SHARP_NAMES[semitone]}${octave}`;
}

const KEY_BY_FIFTHS: Record<string, string> = {
  "-7": "Cb",
  "-6": "Gb",
  "-5": "Db",
  "-4": "Ab",
  "-3": "Eb",
  "-2": "Bb",
  "-1": "F",
  "0": "C",
  "1": "G",
  "2": "D",
  "3": "A",
  "4": "E",
  "5": "B",
  "6": "F#",
  "7": "C#"
};

export function keyFromFifths(value: number | string | undefined) {
  if (value === undefined || value === null) {
    return undefined;
  }

  return KEY_BY_FIFTHS[String(value)] ?? undefined;
}

export function normalizeKeyName(key: string) {
  const safeKey = key.trim();
  return FLAT_TO_SHARP[safeKey] ?? safeKey;
}

export function transposeKeyBySemitones(key: string, semitones: number) {
  const normalized = normalizeKeyName(key);
  const index = SHARP_NAMES.findIndex((item) => item === normalized);
  if (index < 0) {
    return key;
  }
  const total = SHARP_NAMES.length;
  const next = (index + semitones + total * 10) % total;
  return SHARP_NAMES[next];
}

export function semitoneDistanceBetweenKeys(fromKey: string, toKey: string) {
  const fromIndex = SHARP_NAMES.findIndex((item) => item === normalizeKeyName(fromKey));
  const toIndex = SHARP_NAMES.findIndex((item) => item === normalizeKeyName(toKey));

  if (fromIndex < 0 || toIndex < 0) {
    return 0;
  }

  let diff = toIndex - fromIndex;
  if (diff > 6) diff -= 12;
  if (diff < -6) diff += 12;
  return diff;
}

export function supportedKeys() {
  return [...SHARP_NAMES];
}

export function transposeChordSymbol(symbol: string, semitones: number) {
  const trimmed = symbol.trim();
  if (!trimmed) {
    return symbol;
  }

  const match = trimmed.match(/^([A-G](?:#|b)?)(.*)$/);
  if (!match) {
    return symbol;
  }

  const [, root, suffix] = match;
  const transposedRoot = transposeKeyBySemitones(root, semitones);

  return `${transposedRoot}${suffix}`;
}
