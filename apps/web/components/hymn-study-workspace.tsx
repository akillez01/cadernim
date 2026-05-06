"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as Tone from "tone";
import {
  parseLeadSheetFromMusicXml,
  parseMusicXml,
  transposeKeyBySemitones,
  transposeMusicXml,
  type AccompanimentType,
  type ParsedMusicXml
} from "@cadernim/music-engine";
import { Badge, Button, Card, Input, Select, TextArea } from "@cadernim/ui";
import Link from "next/link";
import { MusicScoreViewer } from "@/components/music-score-viewer";

type HymnDetail = {
  id: string;
  title: string;
  number: number;
  author: string;
  originalKey: string;
  defaultBpm: number;
  timeSignature: string;
  xmlContent: string;
};

type HymnComment = {
  id: string;
  content: string;
  createdAt: string;
  user: {
    id: string;
    name: string;
    role: "ADMIN" | "STUDENT";
  };
};

type MeasureBound = {
  number: number;
  startBeat: number;
  endBeat: number;
  beats: number;
};

type MelodyPlaybackEvent = { noteName: string; duration: number };
type MetronomePlaybackEvent = { accent: boolean };
type ChordPlaybackEvent = { notes: string[]; duration: number };
type GuitarPlaybackEvent = { noteName: string; duration: number };

type ViewMode = "score" | "lead_sheet";

type LeadMeasureView = {
  number: number;
  chords: string[];
  lyric: string;
  hasAutoChords: boolean;
  manualRaw: string;
  melodyTokens: string[];
  syllableTokens: string[];
};

type AssistantRecommendation = {
  type: string;
  content: string;
  priority: "low" | "medium" | "high";
};

type AssistantResult = {
  summary: string;
  recommendations: AssistantRecommendation[];
  answer?: string;
};

// ── chord helper ─────────────────────────────────────────────────────────────
const FLAT_TO_SHARP_12: Record<string, string> = {
  Db: "C#", Eb: "D#", Fb: "E", Gb: "F#", Ab: "G#", Bb: "A#", Cb: "B"
};
const CHROMATIC_12 = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

function chordToNoteNames(symbol: string, baseOctave = 3): string[] {
  if (!symbol || symbol === "-") return [];
  const m = symbol.trim().match(/^([A-G](?:#|b)?)(.*)$/);
  if (!m) return [];
  const root = FLAT_TO_SHARP_12[m[1]] ?? m[1];
  const q = (m[2] ?? "").toLowerCase();
  const rootIdx = CHROMATIC_12.indexOf(root);
  if (rootIdx < 0) return [];

  let intervals = [0, 4, 7];
  if ((q.startsWith("m") || q.startsWith("-")) && !q.startsWith("maj")) intervals = [0, 3, 7];
  else if (q.includes("dim")) intervals = [0, 3, 6];
  else if (q.includes("aug")) intervals = [0, 4, 8];

  if (q.includes("maj7")) intervals = [...intervals, 11];
  else if (q.includes("7")) intervals = [...intervals, 10];

  return intervals.map((iv) => {
    const semitone = (rootIdx + iv) % 12;
    const extraOct = Math.floor((rootIdx + iv) / 12);
    return `${CHROMATIC_12[semitone]}${baseOctave + extraOct}`;
  });
}

// ── helpers ───────────────────────────────────────────────────────────────────
function spreadChordsAcrossSyllables(chords: string[], syllableCount: number) {
  if (syllableCount <= 0) return [];
  if (!chords.length) return Array.from({ length: syllableCount }, () => "-");
  if (chords.length === 1) return Array.from({ length: syllableCount }, () => chords[0]);
  return Array.from({ length: syllableCount }, (_, i) => {
    const ratio = i / syllableCount;
    const idx = Math.min(chords.length - 1, Math.floor(ratio * chords.length));
    return chords[idx] ?? chords[chords.length - 1];
  });
}

function toPitchClass(noteName: string) {
  return noteName.replace(/[0-9-]/g, "");
}

function buildMeasureBounds(parsed: ParsedMusicXml): MeasureBound[] {
  let running = 0;
  return parsed.measures.map((measure) => {
    const start = running;
    running += measure.beats;
    return { number: measure.number, startBeat: start, endBeat: running, beats: measure.beats };
  });
}

function findCurrentMeasure(bounds: MeasureBound[], currentBeat: number) {
  const found = bounds.find((b) => currentBeat >= b.startBeat && currentBeat < b.endBeat);
  return found?.number ?? bounds[bounds.length - 1]?.number ?? 1;
}

function formatCommentDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}

const ACCOMPANIMENT_LABELS: Record<AccompanimentType, string> = {
  melody: "Só melodia",
  melody_metronome: "Melodia + Metrônomo",
  melody_chords: "Melodia + Acordes",
  melody_guitar: "Melodia + Violão",
  melody_pad: "Melodia + Pad suave"
};

const LEVEL_LABELS = { beginner: "Iniciante", intermediate: "Intermediário", advanced: "Avançado" } as const;
type StudentLevel = keyof typeof LEVEL_LABELS;

// ── component ─────────────────────────────────────────────────────────────────
export function HymnStudyWorkspace({ hymnId }: { hymnId: string }) {
  const [hymn, setHymn] = useState<HymnDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [role, setRole] = useState<"ADMIN" | "STUDENT" | null>(null);

  const [viewMode, setViewMode] = useState<ViewMode>("score");
  const [transposition, setTransposition] = useState(0);
  const [bpm, setBpm] = useState(110);
  const [accompanimentType, setAccompanimentType] = useState<AccompanimentType>("melody");

  // loop
  const [loopEnabled, setLoopEnabled] = useState(false);
  const [loopStartMeasure, setLoopStartMeasure] = useState(1);
  const [loopEndMeasure, setLoopEndMeasure] = useState(4);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentBeat, setCurrentBeat] = useState(0);
  const [savingSession, setSavingSession] = useState(false);

  // score editor
  const [editScoreXml, setEditScoreXml] = useState(false);
  const [scoreXmlDraft, setScoreXmlDraft] = useState("");
  const [scoreXmlOverride, setScoreXmlOverride] = useState<string | null>(null);
  const [scoreEditorError, setScoreEditorError] = useState<string | null>(null);

  // manual chords
  const [editManualChords, setEditManualChords] = useState(false);
  const [manualChordsByMeasure, setManualChordsByMeasure] = useState<Record<number, string>>({});

  // comments
  const [comments, setComments] = useState<HymnComment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentDraft, setCommentDraft] = useState("");
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [commentsError, setCommentsError] = useState<string | null>(null);

  // assistant
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [assistantLevel, setAssistantLevel] = useState<StudentLevel>("beginner");
  const [assistantQuestion, setAssistantQuestion] = useState("");
  const [assistantResult, setAssistantResult] = useState<AssistantResult | null>(null);
  const [assistantLoading, setAssistantLoading] = useState(false);
  const [assistantError, setAssistantError] = useState<string | null>(null);

  // speed trainer
  const [speedTrainerEnabled, setSpeedTrainerEnabled] = useState(false);
  const [speedTrainerTargetBpm, setSpeedTrainerTargetBpm] = useState(80);
  const [speedTrainerStep, setSpeedTrainerStep] = useState(2);
  const [speedTrainerStartBpm, setSpeedTrainerStartBpm] = useState(80);
  const [loopIterCount, setLoopIterCount] = useState(0);

  // practice timer
  const [sessionSeconds, setSessionSeconds] = useState(0);
  const [totalPracticeSeconds, setTotalPracticeSeconds] = useState(0);

  // export state
  const [exporting, setExporting] = useState(false);

  // study notes
  const [studyNote, setStudyNote] = useState("");
  const [studyNoteOpen, setStudyNoteOpen] = useState(false);

  // piano loading state
  const [pianoLoading, setPianoLoading] = useState(false);

  // synth/part refs
  const melodySynthRef = useRef<Tone.Sampler | null>(null);
  const metronomeSynthRef = useRef<Tone.MembraneSynth | null>(null);
  const chordSynthRef = useRef<Tone.Sampler | null>(null);
  const padSynthRef = useRef<Tone.PolySynth | null>(null);

  const melodyPartRef = useRef<Tone.Part | null>(null);
  const metronomePartRef = useRef<Tone.Part | null>(null);
  const chordPartRef = useRef<Tone.Part | null>(null);

  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const practiceIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pendingRestartRef = useRef(false);
  const wrapCooldownRef = useRef(false);
  const prevCurrentBeatRef = useRef(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── storage keys ─────────────────────────────────────────────────────────────
  // Versioned key to invalidate stale local XML overrides after global score fixes.
  const scoreXmlStorageKey = useMemo(() => (hymn ? `cadernim:score-xml:v2:${hymn.id}` : ""), [hymn]);
  const manualChordStorageKey = useMemo(
    () => (hymn ? `cadernim:manual-chords:${hymn.id}:st${transposition}` : ""),
    [hymn, transposition]
  );
  const studyNoteStorageKey = useMemo(() => (hymn ? `cadernim:study-note:${hymn.id}` : ""), [hymn]);
  const practiceTimeStorageKey = useMemo(() => (hymn ? `cadernim:practice-time:${hymn.id}` : ""), [hymn]);

  const baseXmlContent = useMemo(
    () => (hymn?.xmlContent ? scoreXmlOverride ?? hymn.xmlContent : ""),
    [hymn?.xmlContent, scoreXmlOverride]
  );

  const canEditStudyContent = role === "ADMIN";

  // ── derived ───────────────────────────────────────────────────────────────────
  const transposedXml = useMemo(() => {
    if (!baseXmlContent) return "";
    try { return transposeMusicXml(baseXmlContent, transposition); }
    catch { return baseXmlContent; }
  }, [baseXmlContent, transposition]);

  const parsedMusic = useMemo(() => {
    if (!transposedXml) return null;
    try { return parseMusicXml(transposedXml); }
    catch { return null; }
  }, [transposedXml]);

  const leadSheet = useMemo(() => {
    if (!baseXmlContent) return null;
    try { return parseLeadSheetFromMusicXml(baseXmlContent, transposition); }
    catch { return null; }
  }, [baseXmlContent, transposition]);

  const measureBounds = useMemo(() => (parsedMusic ? buildMeasureBounds(parsedMusic) : []), [parsedMusic]);

  const currentMeasure = useMemo(
    () => findCurrentMeasure(measureBounds, currentBeat),
    [measureBounds, currentBeat]
  );

  const currentKey = useMemo(
    () => (hymn ? transposeKeyBySemitones(hymn.originalKey, transposition) : "-"),
    [hymn, transposition]
  );

  const beatsPerMeasure = useMemo(() => {
    const m = hymn?.timeSignature?.match(/^(\d+)/);
    return m ? parseInt(m[1]) : 4;
  }, [hymn?.timeSignature]);

  const currentBeatInMeasure = useMemo(() => {
    const bound = measureBounds.find((b) => b.number === currentMeasure);
    return Math.floor(currentBeat - (bound?.startBeat ?? 0));
  }, [currentBeat, currentMeasure, measureBounds]);

  const leadMeasures = useMemo<LeadMeasureView[]>(() => {
    if (!parsedMusic) return [];
    const byNumber = new Map((leadSheet?.measures ?? []).map((m) => [m.number, m]));
    return parsedMusic.measures.map((measure) => {
      const fromFile = byNumber.get(measure.number);
      const autoChords = fromFile?.chords ?? [];
      const manualRaw = manualChordsByMeasure[measure.number]?.trim() ?? "";
      const manualChords = manualRaw
        ? manualRaw.split(/\s*\|\s*|\s*,\s*/).map((s) => s.trim()).filter(Boolean)
        : [];
      const lyricNotes = parsedMusic.noteEvents.filter((n) => n.measure === measure.number && n.lyric?.trim());
      return {
        number: measure.number,
        chords: manualChords.length ? manualChords : autoChords,
        lyric: fromFile?.lyric ?? lyricNotes.map((n) => n.lyric?.trim() ?? "").join(" "),
        hasAutoChords: autoChords.length > 0,
        manualRaw,
        melodyTokens: lyricNotes.map((n) => toPitchClass(n.noteName)),
        syllableTokens: lyricNotes.map((n) => n.lyric?.trim() ?? "")
      };
    });
  }, [parsedMusic, leadSheet, manualChordsByMeasure]);

  // Flat list of all lyric notes with their measure-relative index (stable per parsedMusic)
  const lyricNoteMap = useMemo(() => {
    if (!parsedMusic) return [];
    // Ordena por startBeat globalmente para garantir busca correta
    const sorted = parsedMusic.noteEvents
      .filter((n) => n.lyric?.trim())
      .slice()
      .sort((a, b) => a.startBeat - b.startBeat);
    // Conta sílabas por compasso para calcular syllableIdx
    const byMeasure = new Map<number, number>();
    return sorted.map((note) => {
      const idx = byMeasure.get(note.measure) ?? 0;
      byMeasure.set(note.measure, idx + 1);
      return { startBeat: note.startBeat, measureNumber: note.measure, syllableIdx: idx };
    });
  }, [parsedMusic]);

  // Sílaba ativa: a última nota com lyric cujo startBeat <= currentBeat
  // Funciona mesmo pausado (mostra posição atual)
  const activeSyllable = useMemo(() => {
    if (currentBeat <= 0 || lyricNoteMap.length === 0) return null;
    let active = null;
    for (const item of lyricNoteMap) {
      if (item.startBeat <= currentBeat) active = item;
      else break;
    }
    return active;
  }, [currentBeat, lyricNoteMap]);

  // ── effects ───────────────────────────────────────────────────────────────────
  useEffect(() => {
    void loadHymn();
    void loadComments();
    void loadRole();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hymnId]);

  useEffect(() => () => { cleanupPlayback(); disposeSynths(); }, []);

  useEffect(() => {
    if (!isPlaying || !parsedMusic) return;
    const secondsPerBeat = 60 / bpm;
    progressIntervalRef.current = setInterval(() => {
      const beat = Tone.Transport.seconds / secondsPerBeat;
      setCurrentBeat(beat);
      if (!loopEnabled && beat >= parsedMusic.totalBeats) stopPlayback();
    }, 120);
    return () => {
      if (progressIntervalRef.current) { clearInterval(progressIntervalRef.current); progressIntervalRef.current = null; }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying, bpm, parsedMusic, loopEnabled]);

  useEffect(() => {
    if (isPlaying) stopPlayback();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseXmlContent, transposition, bpm, accompanimentType, loopEnabled, loopStartMeasure, loopEndMeasure]);

  useEffect(() => {
    if (!canEditStudyContent) {
      if (editScoreXml) setEditScoreXml(false);
      if (editManualChords) setEditManualChords(false);
    }
  }, [canEditStudyContent, editScoreXml, editManualChords]);

  useEffect(() => {
    if (!manualChordStorageKey) return;
    try {
      const raw = window.localStorage.getItem(manualChordStorageKey);
      if (!raw) { setManualChordsByMeasure({}); return; }
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      const sanitized = Object.entries(parsed).reduce<Record<number, string>>((acc, [k, v]) => {
        const n = Number(k);
        if (Number.isFinite(n)) acc[n] = typeof v === "string" ? v : "";
        return acc;
      }, {});
      setManualChordsByMeasure(sanitized);
    } catch { setManualChordsByMeasure({}); }
  }, [manualChordStorageKey]);

  useEffect(() => {
    if (!manualChordStorageKey) return;
    window.localStorage.setItem(manualChordStorageKey, JSON.stringify(manualChordsByMeasure));
  }, [manualChordStorageKey, manualChordsByMeasure]);

  useEffect(() => {
    if (!scoreXmlStorageKey) return;
    try {
      const raw = window.localStorage.getItem(scoreXmlStorageKey);
      if (!raw) { setScoreXmlOverride(null); return; }
      parseMusicXml(raw);
      setScoreXmlOverride(raw);
    } catch { setScoreXmlOverride(null); }
  }, [scoreXmlStorageKey]);

  useEffect(() => {
    if (!scoreXmlStorageKey) return;
    if (!scoreXmlOverride) { window.localStorage.removeItem(scoreXmlStorageKey); return; }
    window.localStorage.setItem(scoreXmlStorageKey, scoreXmlOverride);
  }, [scoreXmlOverride, scoreXmlStorageKey]);

  // load total practice time per hymn
  useEffect(() => {
    if (!practiceTimeStorageKey) return;
    try {
      const v = parseInt(window.localStorage.getItem(practiceTimeStorageKey) ?? "0", 10);
      setTotalPracticeSeconds(isNaN(v) ? 0 : v);
      setSessionSeconds(0);
    } catch { setTotalPracticeSeconds(0); }
  }, [practiceTimeStorageKey]);

  // practice timer: count seconds while playing
  useEffect(() => {
    if (isPlaying) {
      practiceIntervalRef.current = setInterval(() => {
        setSessionSeconds((s) => s + 1);
        setTotalPracticeSeconds((t) => {
          const next = t + 1;
          if (practiceTimeStorageKey) {
            try { window.localStorage.setItem(practiceTimeStorageKey, String(next)); } catch {}
          }
          return next;
        });
      }, 1000);
    } else {
      if (practiceIntervalRef.current) { clearInterval(practiceIntervalRef.current); practiceIntervalRef.current = null; }
    }
    return () => { if (practiceIntervalRef.current) { clearInterval(practiceIntervalRef.current); practiceIntervalRef.current = null; } };
  }, [isPlaying, practiceTimeStorageKey]);

  useEffect(() => {
    if (!studyNoteStorageKey) return;
    try { setStudyNote(window.localStorage.getItem(studyNoteStorageKey) ?? ""); }
    catch { setStudyNote(""); }
  }, [studyNoteStorageKey]);

  useEffect(() => {
    if (!studyNoteStorageKey) return;
    window.localStorage.setItem(studyNoteStorageKey, studyNote);
  }, [studyNoteStorageKey, studyNote]);

  // speed trainer: detect loop wrap and schedule a BPM increment
  useEffect(() => {
    const prev = prevCurrentBeatRef.current;
    prevCurrentBeatRef.current = currentBeat;
    if (!loopEnabled || !speedTrainerEnabled || !isPlaying || !parsedMusic || wrapCooldownRef.current) return;

    const loopStartBound = measureBounds.find((b) => b.number === loopStartMeasure);
    const loopEndBound = measureBounds.find((b) => b.number === loopEndMeasure);
    const loopStartBeat = loopStartBound?.startBeat ?? 0;
    const loopEndBeat = loopEndBound?.endBeat ?? parsedMusic.totalBeats;

    if (prev >= loopEndBeat - 1 && currentBeat < loopStartBeat + 1 && prev > currentBeat) {
      setLoopIterCount((c) => c + 1);
      const newBpm = Math.min(speedTrainerTargetBpm, bpm + speedTrainerStep);
      if (newBpm > bpm) {
        wrapCooldownRef.current = true;
        pendingRestartRef.current = true;
        setBpm(newBpm);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentBeat]);

  // restart playback after speed trainer increments BPM
  useEffect(() => {
    if (!isPlaying && pendingRestartRef.current) {
      pendingRestartRef.current = false;
      void startPlayback();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying]);

  // keyboard shortcuts: Space=play/pause, ←/→=transpose, L=loop
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === " ") {
        e.preventDefault();
        if (isPlaying) pausePlayback();
        else void startPlayback();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        setTransposition((v) => Math.max(v - 1, -12));
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        setTransposition((v) => Math.min(v + 1, 12));
      } else if (e.key === "l" || e.key === "L") {
        setLoopEnabled((v) => !v);
      }
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying]);

  // ── data loaders ─────────────────────────────────────────────────────────────
  async function loadHymn() {
    setLoading(true);
    setError(null);
    setEditScoreXml(false);
    setScoreXmlDraft("");
    setScoreEditorError(null);
    setAssistantResult(null);
    try {
      const res = await fetch(`/api/hymns/${hymnId}?includeXml=1`, { cache: "no-store" });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error ?? "Falha ao carregar hino.");
      const data = payload.data as HymnDetail;
      setHymn(data);
      setBpm(data.defaultBpm);
      setSpeedTrainerTargetBpm(data.defaultBpm);
      setCurrentBeat(0);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro inesperado.");
    } finally {
      setLoading(false);
    }
  }

  async function loadComments() {
    setCommentsLoading(true);
    setCommentsError(null);
    try {
      const res = await fetch(`/api/hymns/${hymnId}/notes`);
      const payload = (await res.json()) as { data?: HymnComment[]; error?: string };
      if (!res.ok) throw new Error(payload.error ?? "Falha ao carregar comentarios.");
      setComments(payload.data ?? []);
    } catch (e) {
      setCommentsError(e instanceof Error ? e.message : "Nao foi possivel carregar comentarios.");
    } finally {
      setCommentsLoading(false);
    }
  }

  async function loadRole() {
    try {
      const res = await fetch("/api/auth/me");
      if (!res.ok) { setRole(null); return; }
      const payload = (await res.json()) as { data?: { role?: "ADMIN" | "STUDENT" } };
      setRole(payload.data?.role ?? null);
    } catch { setRole(null); }
  }

  // ── comments ──────────────────────────────────────────────────────────────────
  async function submitComment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const content = commentDraft.trim();
    if (!content) return;
    setCommentSubmitting(true);
    setCommentsError(null);
    try {
      const res = await fetch(`/api/hymns/${hymnId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content })
      });
      const payload = (await res.json()) as { data?: HymnComment; error?: string };
      if (!res.ok || !payload.data) throw new Error(payload.error ?? "Nao foi possivel enviar comentario.");
      setComments((c) => [payload.data as HymnComment, ...c]);
      setCommentDraft("");
    } catch (e) {
      setCommentsError(e instanceof Error ? e.message : "Erro ao enviar comentario.");
    } finally {
      setCommentSubmitting(false);
    }
  }

  // ── audio ─────────────────────────────────────────────────────────────────────
  // Salamander Grand Piano sample URLs (Tone.js CDN)
  const PIANO_URLS: Record<string, string> = {
    A0: "A0.mp3", C1: "C1.mp3", "D#1": "Ds1.mp3", "F#1": "Fs1.mp3",
    A1: "A1.mp3", C2: "C2.mp3", "D#2": "Ds2.mp3", "F#2": "Fs2.mp3",
    A2: "A2.mp3", C3: "C3.mp3", "D#3": "Ds3.mp3", "F#3": "Fs3.mp3",
    A3: "A3.mp3", C4: "C4.mp3", "D#4": "Ds4.mp3", "F#4": "Fs4.mp3",
    A4: "A4.mp3", C5: "C5.mp3", "D#5": "Ds5.mp3", "F#5": "Fs5.mp3",
    A5: "A5.mp3", C6: "C6.mp3", "D#6": "Ds6.mp3", "F#6": "Fs6.mp3",
    A6: "A6.mp3", C7: "C7.mp3", "D#7": "Ds7.mp3", "F#7": "Fs7.mp3",
    A7: "A7.mp3", C8: "C8.mp3"
  };
  const PIANO_BASE_URL = "https://tonejs.github.io/audio/salamander/";

  async function ensureSynths() {
    // Piano sampler — melody (shared with chord accompaniment at lower velocity)
    if (!melodySynthRef.current) {
      setPianoLoading(true);
      await Promise.race([
        new Promise<void>((resolve) => {
          melodySynthRef.current = new Tone.Sampler({
            urls: PIANO_URLS,
            baseUrl: PIANO_BASE_URL,
            onload: resolve,
            onerror: () => resolve() // start anyway on error
          }).toDestination();
        }),
        new Promise<void>((resolve) => setTimeout(resolve, 6000)) // 6s fallback
      ]);
      setPianoLoading(false);
    }
    // Chord sampler — same piano, softer volume
    if (!chordSynthRef.current) {
      chordSynthRef.current = new Tone.Sampler({
        urls: PIANO_URLS,
        baseUrl: PIANO_BASE_URL
      }).toDestination();
      chordSynthRef.current.volume.value = -10;
    }
    if (!metronomeSynthRef.current) {
      metronomeSynthRef.current = new Tone.MembraneSynth({
        pitchDecay: 0.01, octaves: 5,
        envelope: { attack: 0.001, decay: 0.08, sustain: 0, release: 0.01 }
      }).toDestination();
    }
    if (!padSynthRef.current) {
      padSynthRef.current = new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: "sine" },
        envelope: { attack: 0.6, decay: 0.5, sustain: 0.8, release: 1.8 }
      }).toDestination();
      padSynthRef.current.volume.value = -14;
    }
  }

  function cleanupPlayback() {
    Tone.Transport.stop();
    Tone.Transport.cancel();
    Tone.Transport.loop = false;
    melodyPartRef.current?.dispose();
    metronomePartRef.current?.dispose();
    chordPartRef.current?.dispose();
    melodyPartRef.current = null;
    metronomePartRef.current = null;
    chordPartRef.current = null;
    if (progressIntervalRef.current) { clearInterval(progressIntervalRef.current); progressIntervalRef.current = null; }
  }

  function disposeSynths() {
    try { melodySynthRef.current?.dispose(); } catch {}
    try { metronomeSynthRef.current?.dispose(); } catch {}
    try { chordSynthRef.current?.dispose(); } catch {}
    try { padSynthRef.current?.dispose(); } catch {}
    melodySynthRef.current = null;
    metronomeSynthRef.current = null;
    chordSynthRef.current = null;
    padSynthRef.current = null;
  }

  async function startPlayback() {
    if (!parsedMusic) return;
    wrapCooldownRef.current = false;
    if (!pendingRestartRef.current) {
      setLoopIterCount(0);
      setSpeedTrainerStartBpm(bpm);
    }
    await Tone.start();
    cleanupPlayback();
    await ensureSynths();

    const secondsPerBeat = 60 / bpm;

    // ③ loop setup
    const loopStartBound = measureBounds.find((b) => b.number === loopStartMeasure);
    const loopEndBound = measureBounds.find((b) => b.number === loopEndMeasure);
    const loopStartBeat = loopStartBound?.startBeat ?? 0;
    const loopEndBeat = loopEndBound?.endBeat ?? parsedMusic.totalBeats;

    if (loopEnabled && loopEndBeat > loopStartBeat) {
      Tone.Transport.loop = true;
      Tone.Transport.loopStart = loopStartBeat * secondsPerBeat;
      Tone.Transport.loopEnd = loopEndBeat * secondsPerBeat;
    } else {
      Tone.Transport.loop = false;
    }

    // melody part — piano sampler
    melodyPartRef.current = new Tone.Part(
      (time, event: number | MelodyPlaybackEvent) => {
        if (typeof event === "number") return;
        try { melodySynthRef.current?.triggerAttackRelease(event.noteName, event.duration, time, 0.85); } catch {}
      },
      parsedMusic.noteEvents.map((n) => [
        n.startBeat * secondsPerBeat,
        { noteName: n.noteName, duration: Math.max(0.08, n.durationBeats * secondsPerBeat) }
      ])
    ).start(0);

    // ④ accompaniment parts
    if (accompanimentType === "melody_metronome") {
      const events: Array<[number, MetronomePlaybackEvent]> = [];
      for (let beat = 0; beat < parsedMusic.totalBeats; beat += 1) {
        const current = measureBounds.find((b) => beat >= b.startBeat && beat < b.endBeat);
        events.push([beat * secondsPerBeat, { accent: beat === current?.startBeat }]);
      }
      metronomePartRef.current = new Tone.Part((time, event: number | MetronomePlaybackEvent) => {
        if (typeof event === "number") return;
        metronomeSynthRef.current?.triggerAttackRelease(event.accent ? "C6" : "G5", "32n", time);
      }, events).start(0);
    }

    if (["melody_chords", "melody_guitar", "melody_pad"].includes(accompanimentType)) {
      const chordEvents: Array<[number, ChordPlaybackEvent | GuitarPlaybackEvent]> = [];

      leadMeasures.forEach((measure) => {
        const bound = measureBounds.find((b) => b.number === measure.number);
        if (!bound) return;
        const validChords = measure.chords.filter((c) => c && c !== "-");
        if (!validChords.length) return;

        const beatsPerChord = bound.beats / validChords.length;
        const chordDuration = beatsPerChord * secondsPerBeat * 0.85;

        validChords.forEach((chord, idx) => {
          const notes = chordToNoteNames(chord, accompanimentType === "melody_pad" ? 2 : 3);
          if (!notes.length) return;
          const time = (bound.startBeat + idx * beatsPerChord) * secondsPerBeat;

          if (accompanimentType === "melody_guitar") {
            // arpeggiate with 35ms gap between notes
            notes.forEach((note, noteIdx) => {
              chordEvents.push([time + noteIdx * 0.035, { noteName: note, duration: chordDuration }]);
            });
          } else {
            chordEvents.push([time, { notes, duration: chordDuration }]);
          }
        });
      });

      if (chordEvents.length > 0) {
        chordPartRef.current = new Tone.Part(
          (time, event: number | ChordPlaybackEvent | GuitarPlaybackEvent) => {
            if (typeof event === "number" || !event) return;
            try {
              if ("noteName" in event) {
                // guitar: arpeggiated piano note
                chordSynthRef.current?.triggerAttackRelease(event.noteName, event.duration, time, 0.4);
              } else if (accompanimentType === "melody_pad") {
                // soft pad synth
                padSynthRef.current?.triggerAttackRelease(event.notes, event.duration, time);
              } else {
                // block chord: piano sampler softer
                chordSynthRef.current?.triggerAttackRelease(event.notes, event.duration, time, 0.4);
              }
            } catch {}
          },
          chordEvents
        ).start(0);
      }
    }

    // start transport
    const startSeconds = loopEnabled && loopEndBeat > loopStartBeat
      ? loopStartBeat * secondsPerBeat
      : currentBeat * secondsPerBeat;

    Tone.Transport.seconds = startSeconds;
    Tone.Transport.start("+0.05");
    setIsPlaying(true);
  }

  function pausePlayback() {
    if (!parsedMusic) return;
    Tone.Transport.pause();
    setIsPlaying(false);
  }

  function stopPlayback() {
    if (!parsedMusic) return;
    Tone.Transport.stop();
    Tone.Transport.seconds = 0;
    setCurrentBeat(0);
    setIsPlaying(false);
  }

  async function saveSession() {
    if (!hymn) return;
    setSavingSession(true);
    await fetch("/api/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        hymnId: hymn.id,
        selectedKey: currentKey,
        selectedBpm: bpm,
        accompanimentType,
        loopStart: loopEnabled ? loopStartMeasure : null,
        loopEnd: loopEnabled ? loopEndMeasure : null
      })
    });
    setSavingSession(false);
  }

  // ② export current hymn at current transposition
  async function exportHymnPdf() {
    if (!hymn) return;
    setExporting(true);
    try {
      const spec = btoa(JSON.stringify({ items: [{ hymnId: hymn.id, targetKey: currentKey }] }))
        .replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
      const res = await fetch("/api/booklets/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: `${hymn.title} — Tom ${currentKey}`, spec })
      });
      if (!res.ok) throw new Error("Falha ao gerar PDF.");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${hymn.title.toLowerCase().replace(/\s+/g, "-")}-tom-${currentKey.toLowerCase()}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
    } finally {
      setExporting(false);
    }
  }

  // ④ score file upload (.xml/.mxl/.pdf)
  async function handleXmlFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    try {
      let xmlText: string;
      const lower = file.name.toLowerCase();

      if (lower.endsWith(".pdf")) {
        const formData = new FormData();
        formData.append("file", file);
        const response = await fetch("/api/scores/convert", {
          method: "POST",
          body: formData
        });
        const payload = (await response.json()) as { data?: { xmlContent?: string }; error?: string };
        if (!response.ok || !payload?.data?.xmlContent) {
          throw new Error(payload?.error ?? "Nao foi possivel converter o PDF para MusicXML.");
        }
        xmlText = payload.data.xmlContent;
      } else if (lower.endsWith(".mxl")) {
        const JSZip = (await import("jszip")).default;
        const zip = await JSZip.loadAsync(file);
        const xmlEntry = Object.values(zip.files).find(
          (f) => f.name.toLowerCase().endsWith(".xml") && !f.name.startsWith("META")
        );
        if (!xmlEntry) throw new Error("MXL sem XML interno.");
        xmlText = await xmlEntry.async("text");
      } else {
        xmlText = await file.text();
      }
      parseMusicXml(xmlText);
      setScoreXmlDraft(xmlText);
      setEditScoreXml(true);
      setScoreEditorError(null);
    } catch (err) {
      setScoreEditorError(err instanceof Error ? err.message : "Arquivo inválido.");
    }
  }

  // ── score editor ──────────────────────────────────────────────────────────────
  function openScoreEditor() {
    if (!canEditStudyContent) return;
    setScoreEditorError(null);
    setScoreXmlDraft(baseXmlContent);
    setEditScoreXml(true);
  }

  function closeScoreEditor() {
    setScoreEditorError(null);
    setEditScoreXml(false);
  }

  function saveEditedScoreXml() {
    if (!canEditStudyContent) return;
    const candidate = scoreXmlDraft.trim();
    if (!candidate) { setScoreEditorError("O XML da partitura nao pode ficar vazio."); return; }
    try {
      parseMusicXml(candidate);
      parseLeadSheetFromMusicXml(candidate, 0);
      setScoreXmlOverride(candidate);
      setEditScoreXml(false);
      setScoreEditorError(null);
    } catch { setScoreEditorError("MusicXML invalido. Revise a edicao antes de salvar."); }
  }

  function restoreOriginalScoreXml() {
    if (!canEditStudyContent) return;
    setScoreXmlOverride(null);
    setScoreEditorError(null);
    setEditScoreXml(false);
  }

  // ── manual chords ─────────────────────────────────────────────────────────────
  function setManualChord(measureNumber: number, value: string) {
    if (!canEditStudyContent) return;
    setManualChordsByMeasure((c) => ({ ...c, [measureNumber]: value }));
  }

  function clearManualChords() {
    if (!canEditStudyContent) return;
    setManualChordsByMeasure({});
  }

  function toggleManualChordEditing() {
    if (!canEditStudyContent) return;
    setEditManualChords((v) => !v);
  }

  // ② assistant
  async function consultAssistant() {
    if (!hymn || !parsedMusic) return;
    setAssistantLoading(true);
    setAssistantError(null);
    setAssistantResult(null);

    const noteDensity = parsedMusic.noteEvents.length / Math.max(1, parsedMusic.measures.length);

    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hymnId: hymn.id,
          level: assistantLevel,
          question: assistantQuestion.trim() || undefined,
          context: {
            title: hymn.title,
            originalKey: hymn.originalKey,
            currentKey,
            defaultBpm: hymn.defaultBpm,
            selectedBpm: bpm,
            timeSignature: hymn.timeSignature,
            transpositionSemitones: transposition,
            accompanimentType,
            loopStart: loopEnabled ? loopStartMeasure : undefined,
            loopEnd: loopEnabled ? loopEndMeasure : undefined,
            noteDensity
          }
        })
      });
      const payload = (await res.json()) as { data?: AssistantResult; error?: string };
      if (!res.ok) throw new Error(payload.error ?? "Erro ao consultar assistente.");
      setAssistantResult(payload.data ?? null);
    } catch (e) {
      setAssistantError(e instanceof Error ? e.message : "Erro inesperado.");
    } finally {
      setAssistantLoading(false);
    }
  }

  // ── render ────────────────────────────────────────────────────────────────────
  if (loading) {
    return <Card><p className="text-sm text-moss-600">Carregando modo de estudo...</p></Card>;
  }

  if (error || !hymn || !parsedMusic) {
    return <Card><p className="text-sm text-red-600">{error ?? "Nao foi possivel processar o MusicXML deste hino."}</p></Card>;
  }

  const totalMeasures = measureBounds.length;

  return (
    <section className="space-y-4 sm:space-y-5">
      {/* ── Info + controls ────────────────────────────────────────── */}
      <Card className="forest-shell space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-moss-500">Hino #{hymn.number}</p>
            <h1 className="font-[var(--font-cormorant)] text-3xl font-semibold leading-tight text-moss-900 sm:text-4xl">{hymn.title}</h1>
            <p className="text-sm text-moss-600">{hymn.author}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge>Tom original {hymn.originalKey}</Badge>
            <Badge className="bg-sand-100 text-moss-700">Tom atual {currentKey}</Badge>
            <Badge>{bpm} BPM</Badge>
            <Badge className="bg-moss-50 text-moss-700">Compasso {hymn.timeSignature}</Badge>
            <Badge className="bg-sand-100 text-moss-700">Compasso {currentMeasure}/{totalMeasures}</Badge>
            {totalPracticeSeconds > 0 && (
              <span title="Tempo total praticado neste hino">
                <Badge className="bg-moss-100 text-moss-700">
                  ⏱ {Math.floor(totalPracticeSeconds / 60)}min{sessionSeconds > 0 ? ` (+${sessionSeconds}s)` : ""}
                </Badge>
              </span>
            )}
            <span title="Atalhos: Espaço=play/pause · ←/→=tom · L=loop"><Badge className="cursor-help bg-white/60 text-[10px] text-moss-500">⌨ atalhos</Badge></span>
          </div>
        </div>

        {/* control grid */}
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl bg-sand-50 p-3">
            <p className="text-xs uppercase tracking-wide text-moss-500">Tom (semitons)</p>
            <div className="mt-2 flex items-center gap-2">
              <Button type="button" variant="soft" className="w-10 px-0" onClick={() => setTransposition((v) => Math.max(v - 1, -12))}>-</Button>
              <Input value={transposition} readOnly className="text-center" />
              <Button type="button" variant="soft" className="w-10 px-0" onClick={() => setTransposition((v) => Math.min(v + 1, 12))}>+</Button>
            </div>
          </div>

          <label className="rounded-xl bg-sand-50 p-3">
            <p className="text-xs uppercase tracking-wide text-moss-500">Andamento (BPM)</p>
            <Input
              className="mt-2"
              type="number"
              min={30}
              max={220}
              value={bpm}
              onChange={(e) => setBpm(Number(e.target.value) || hymn.defaultBpm)}
            />
            {/* ① reset usa defaultBpm do hino */}
            <Button type="button" variant="ghost" className="mt-2 w-full" onClick={() => setBpm(hymn.defaultBpm)}>
              Resetar ({hymn.defaultBpm} BPM)
            </Button>
          </label>

          {/* ④ accompaniment select */}
          <label className="rounded-xl bg-sand-50 p-3">
            <p className="text-xs uppercase tracking-wide text-moss-500">Acompanhamento</p>
            <Select
              className="mt-2"
              value={accompanimentType}
              onChange={(e) => setAccompanimentType(e.target.value as AccompanimentType)}
            >
              {(Object.entries(ACCOMPANIMENT_LABELS) as [AccompanimentType, string][]).map(([val, label]) => (
                <option key={val} value={val}>{label}</option>
              ))}
            </Select>
          </label>

          <label className="rounded-xl bg-sand-50 p-3">
            <p className="text-xs uppercase tracking-wide text-moss-500">Modo de exibição</p>
            <Select className="mt-2" value={viewMode} onChange={(e) => setViewMode(e.target.value as ViewMode)}>
              <option value="score">Partitura (padrão)</option>
              <option value="lead_sheet">Letra + Cifra</option>
            </Select>
          </label>

        </div>

        {/* playback controls */}
        <div className="space-y-3 rounded-xl bg-moss-50 p-3">
          <div className="grid gap-2 sm:flex sm:flex-wrap sm:items-center">
            <Button type="button" onClick={() => void startPlayback()} disabled={isPlaying || pianoLoading} className="w-full sm:w-auto">
              {pianoLoading ? "Carregando piano..." : "Play"}
            </Button>
            <Button type="button" variant="soft" onClick={pausePlayback} disabled={!isPlaying} className="w-full sm:w-auto">Pause</Button>
            <Button type="button" variant="ghost" onClick={stopPlayback} className="w-full sm:w-auto">Stop</Button>
            <Button type="button" variant="soft" onClick={() => void saveSession()} disabled={savingSession} className="w-full sm:w-auto">
              {savingSession ? "Salvando..." : "Registrar Estudo"}
            </Button>
            <Button type="button" variant="ghost" onClick={() => void exportHymnPdf()} disabled={exporting} className="w-full sm:w-auto">
              {exporting ? "Gerando PDF..." : "Exportar PDF"}
            </Button>
          </div>

          {/* ① visual metronome */}
          {isPlaying && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-moss-500">Pulso:</span>
              <div className="flex items-center gap-1.5">
                {Array.from({ length: beatsPerMeasure }, (_, i) => (
                  <div
                    key={i}
                    className={`h-3 w-3 rounded-full transition-all duration-75 ${
                      i === currentBeatInMeasure % beatsPerMeasure
                        ? "scale-125 bg-moss-600 shadow-md"
                        : "bg-moss-200"
                    }`}
                  />
                ))}
              </div>
            </div>
          )}

          {/* seek bar */}
          <div>
            <p className="mb-1 text-xs text-moss-600">Posição da reprodução</p>
            <input
              type="range"
              min={0}
              max={parsedMusic.totalBeats}
              step={0.25}
              value={Math.min(currentBeat, parsedMusic.totalBeats)}
              onChange={(e) => {
                const next = Number(e.target.value);
                setCurrentBeat(next);
                Tone.Transport.seconds = next * (60 / bpm);
              }}
              className="w-full accent-moss-700"
            />
            <p className="mt-1 text-xs text-moss-500">{currentBeat.toFixed(1)} / {parsedMusic.totalBeats.toFixed(1)} beats</p>
          </div>

          {/* ③ loop controls */}
          <div className="rounded-xl border border-moss-200 bg-white/70 p-3">
            <div className="flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={loopEnabled}
                  onChange={(e) => setLoopEnabled(e.target.checked)}
                  className="accent-moss-700 h-4 w-4"
                />
                <span className="text-sm font-medium text-moss-800">Loop de estudo</span>
              </label>
              {loopEnabled && (
                <>
                  <label className="flex items-center gap-1.5">
                    <span className="text-xs text-moss-600">Início (compasso)</span>
                    <Input
                      type="number"
                      min={1}
                      max={totalMeasures}
                      value={loopStartMeasure}
                      onChange={(e) => {
                        const v = Math.max(1, Math.min(totalMeasures, Number(e.target.value)));
                        setLoopStartMeasure(v);
                        if (v >= loopEndMeasure) setLoopEndMeasure(Math.min(totalMeasures, v + 1));
                      }}
                      className="w-20 text-center"
                    />
                  </label>
                  <label className="flex items-center gap-1.5">
                    <span className="text-xs text-moss-600">Fim (compasso)</span>
                    <Input
                      type="number"
                      min={loopStartMeasure + 1}
                      max={totalMeasures}
                      value={loopEndMeasure}
                      onChange={(e) => {
                        const v = Math.max(loopStartMeasure + 1, Math.min(totalMeasures, Number(e.target.value)));
                        setLoopEndMeasure(v);
                      }}
                      className="w-20 text-center"
                    />
                  </label>
                  <Badge className="bg-moss-100 text-moss-700">
                    Compassos {loopStartMeasure}–{loopEndMeasure}
                  </Badge>
                </>
              )}
            </div>
            {loopEnabled && (
              <div className="mt-3 space-y-3 border-t border-moss-100 pt-3">
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={speedTrainerEnabled}
                    onChange={(e) => setSpeedTrainerEnabled(e.target.checked)}
                    className="h-4 w-4 accent-moss-700"
                  />
                  <span className="text-sm font-medium text-moss-800">Treinador de velocidade</span>
                </label>

                {speedTrainerEnabled ? (
                  <div className="flex flex-wrap items-center gap-3">
                    <label className="flex items-center gap-1.5">
                      <span className="text-xs text-moss-600">BPM alvo</span>
                      <Input
                        type="number"
                        min={bpm + 1}
                        max={220}
                        value={speedTrainerTargetBpm}
                        onChange={(e) => setSpeedTrainerTargetBpm(Number(e.target.value) || hymn.defaultBpm)}
                        className="w-20 text-center"
                      />
                    </label>
                    <label className="flex items-center gap-1.5">
                      <span className="text-xs text-moss-600">Passo</span>
                      <Input
                        type="number"
                        min={1}
                        max={20}
                        value={speedTrainerStep}
                        onChange={(e) => setSpeedTrainerStep(Math.max(1, Math.min(20, Number(e.target.value) || 2)))}
                        className="w-16 text-center"
                      />
                      <span className="text-xs text-moss-500">BPM/loop</span>
                    </label>
                    <p className="w-full text-xs text-moss-600">
                      A cada volta do loop o BPM sobe +{speedTrainerStep} até atingir {speedTrainerTargetBpm} BPM.
                    </p>
                    {/* ⑦ progress bar */}
                    {isPlaying && speedTrainerTargetBpm > speedTrainerStartBpm && (
                      <div className="w-full space-y-1">
                        <div className="flex justify-between text-xs text-moss-600">
                          <span>{speedTrainerStartBpm} BPM</span>
                          <span>Loop #{loopIterCount} · {bpm} BPM</span>
                          <span>{speedTrainerTargetBpm} BPM</span>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-moss-100">
                          <div
                            className="h-full rounded-full bg-moss-600 transition-all duration-300"
                            style={{
                              width: `${Math.round(
                                ((bpm - speedTrainerStartBpm) / (speedTrainerTargetBpm - speedTrainerStartBpm)) * 100
                              )}%`
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-moss-600">
                    Ative para aumentar o BPM automaticamente a cada loop — técnica clássica de prática progressiva.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* ── Partitura (padrão) ou Letra + Cifra ───────────────────── */}
      {viewMode === "score" ? (
        <Card className="space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-moss-900">Partitura</h2>
              <p className="text-sm text-moss-600">O cursor acompanha a melodia em tempo real durante a reprodução.</p>
            </div>
            {canEditStudyContent && (
              <div className="grid w-full gap-2 sm:flex sm:w-auto sm:items-center">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xml,.musicxml,.mxl,.pdf"
                  className="hidden"
                  onChange={(e) => void handleXmlFileUpload(e)}
                />
                <Button type="button" variant="soft" onClick={() => fileInputRef.current?.click()} className="w-full sm:w-auto">
                  Carregar Arquivo
                </Button>
                <Link href={`/hymns/${hymn.id}/edit`}>
                  <Button type="button" variant="soft" className="w-full sm:w-auto">Editar Partitura</Button>
                </Link>
                <Button type="button" variant="soft" onClick={() => (editScoreXml ? closeScoreEditor() : openScoreEditor())} className="w-full sm:w-auto">
                  {editScoreXml ? "Fechar Edição" : "Editar XML (rápido)"}
                </Button>
                <Button type="button" variant="ghost" onClick={restoreOriginalScoreXml} className="w-full sm:w-auto" disabled={!scoreXmlOverride}>
                  Restaurar Original
                </Button>
              </div>
            )}
          </div>

          {editScoreXml && (
            <div className="space-y-2 rounded-xl border border-moss-100 bg-sand-50 p-3">
              <p className="text-xs text-moss-700">Cole ou ajuste o MusicXML completo e salve para atualizar partitura e cifra neste navegador.</p>
              <TextArea rows={16} value={scoreXmlDraft} onChange={(e) => setScoreXmlDraft(e.target.value)} placeholder="Cole o MusicXML completo..." className="font-mono text-xs" />
              <div className="grid gap-2 sm:flex sm:justify-end">
                <Button type="button" variant="ghost" onClick={closeScoreEditor} className="w-full sm:w-auto">Cancelar</Button>
                <Button type="button" onClick={saveEditedScoreXml} className="w-full sm:w-auto">Salvar Partitura</Button>
              </div>
              {scoreEditorError && <p className="text-sm text-red-600">{scoreEditorError}</p>}
            </div>
          )}

          {/* OSMD — cursor se move com o beat */}
          <MusicScoreViewer xmlContent={transposedXml} currentBeat={currentBeat} />

          {/* Barra de sílaba ativa abaixo da partitura */}
          {(() => {
            const activeMeasure = activeSyllable
              ? leadMeasures.find((m) => m.number === activeSyllable.measureNumber)
              : null;
            if (!activeMeasure || activeMeasure.syllableTokens.length === 0) return null;
            return (
              <div className="flex flex-wrap items-center gap-2 rounded-xl border border-moss-300 bg-moss-50 px-3 py-2">
                <span className="shrink-0 text-xs font-medium uppercase tracking-wide text-moss-500">
                  ♪ C.{activeMeasure.number}
                </span>
                {activeMeasure.syllableTokens.map((syllable, i) => {
                  const isActive = activeSyllable?.syllableIdx === i;
                  const chord = spreadChordsAcrossSyllables(activeMeasure.chords, activeMeasure.syllableTokens.length)[i];
                  return (
                    <div key={i} className="flex flex-col items-center">
                      {chord && chord !== "-" && (
                        <span className={`text-[10px] font-semibold leading-none ${isActive ? "text-moss-700" : "text-moss-400"}`}>
                          {chord}
                        </span>
                      )}
                      <span className={`mt-0.5 rounded px-2 py-0.5 text-sm font-medium transition-all duration-100 ${
                        isActive ? "scale-110 border-b-2 border-moss-300 bg-moss-500 text-white shadow-sm" : "text-moss-600"
                      }`}>
                        {syllable}
                      </span>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </Card>
      ) : (
        <Card className="space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-moss-900">Letra + Cifra</h2>
              <p className="text-sm text-moss-600">Acompanhe a sílaba ativa em tempo real durante a reprodução.</p>
            </div>
            {canEditStudyContent && (
              <div className="grid w-full gap-2 sm:flex sm:w-auto sm:items-center">
                <Button type="button" variant="soft" onClick={toggleManualChordEditing} className="w-full sm:w-auto">
                  {editManualChords ? "Fechar Edição" : "Editar Cifras"}
                </Button>
                {Object.values(manualChordsByMeasure).some((v) => v.trim().length > 0) && (
                  <Button type="button" variant="ghost" onClick={clearManualChords} className="w-full sm:w-auto">
                    Limpar Cifras Manuais
                  </Button>
                )}
              </div>
            )}
          </div>

          {editManualChords && (
            <p className="rounded-xl bg-sand-50 p-3 text-xs text-moss-700">
              Digite cifras separadas por <code>|</code>, por exemplo: <code>D | G | A7</code>.
            </p>
          )}

          <div className="space-y-2">
            {(editManualChords
              ? leadMeasures
              : leadMeasures.filter((m) => m.chords.length > 0 || m.lyric.length > 0)
            ).map((measure) => {
              const isMeasureActive = activeSyllable?.measureNumber === measure.number;
              return (
                <div
                  key={measure.number}
                  className={`rounded-xl border p-3 transition-colors ${
                    isMeasureActive ? "border-moss-400 bg-moss-50" : "border-moss-100 bg-white"
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs uppercase tracking-wide text-moss-500">Compasso {measure.number}</p>
                    {measure.manualRaw && <Badge className="bg-sand-100 text-moss-700">Cifra manual</Badge>}
                  </div>

                  {measure.syllableTokens.length > 0 ? (
                    <div className="mt-2 space-y-3">
                      <div>
                        <p className="mb-1 text-xs uppercase tracking-wide text-moss-500">Melodia</p>
                        <div className="overflow-x-auto pb-1">
                          <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${measure.syllableTokens.length}, minmax(60px, 1fr))` }}>
                            {measure.syllableTokens.map((syllable, i) => {
                              const isActive = isMeasureActive && activeSyllable?.syllableIdx === i;
                              return (
                                <div key={`m-${measure.number}-${i}`} className={`rounded-lg p-2 text-center transition-all ${isActive ? "scale-105 bg-moss-400 shadow-sm" : "bg-sand-50"}`}>
                                  <p className={`text-xs font-semibold ${isActive ? "text-white" : "text-moss-800"}`}>{measure.melodyTokens[i] ?? "-"}</p>
                                  <p className={`text-xs ${isActive ? "border-b-2 border-white font-medium text-white" : "text-moss-700"}`}>{syllable}</p>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                      <div>
                        <p className="mb-1 text-xs uppercase tracking-wide text-moss-500">Harmonia</p>
                        <div className="overflow-x-auto pb-1">
                          <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${measure.syllableTokens.length}, minmax(60px, 1fr))` }}>
                            {spreadChordsAcrossSyllables(measure.chords, measure.syllableTokens.length).map((chord, i) => {
                              const isActive = isMeasureActive && activeSyllable?.syllableIdx === i;
                              return (
                                <div key={`h-${measure.number}-${i}`} className={`rounded-lg p-2 text-center transition-all ${isActive ? "scale-105 bg-moss-500 shadow-sm" : "bg-moss-50"}`}>
                                  <p className={`text-xs font-semibold ${isActive ? "text-white" : "text-moss-800"}`}>{chord}</p>
                                  <p className={`text-xs ${isActive ? "border-b-2 border-white font-medium text-white" : "text-moss-700"}`}>{measure.syllableTokens[i]}</p>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className="mt-1 text-sm font-semibold text-moss-900">{measure.chords.length ? measure.chords.join("  •  ") : "(sem cifra)"}</p>
                      <p className="mt-1 text-sm text-moss-700">{measure.lyric || "(sem letra)"}</p>
                    </>
                  )}

                  {editManualChords && (
                    <label className="mt-2 block space-y-1">
                      <span className="text-xs text-moss-600">Cifra manual {measure.hasAutoChords ? "(sobrescreve a cifra do arquivo)" : ""}</span>
                      <Input value={manualChordsByMeasure[measure.number] ?? ""} onChange={(e) => setManualChord(measure.number, e.target.value)} placeholder="Ex.: D | G | A7 | D" />
                    </label>
                  )}
                </div>
              );
            })}
          </div>

          {!leadMeasures.some((m) => m.chords.length > 0 || m.lyric.length > 0) && !editManualChords && (
            <p className="text-sm text-moss-600">Este arquivo nao possui cifras/letra suficientes para este modo.</p>
          )}
        </Card>
      )}

      {/* ── Comments ──────────────────────────────────────────────── */}
      <Card className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-moss-900">Comentários do hino</h2>
            <p className="text-sm text-moss-600">Alunos e admin podem registrar observações de estudo.</p>
          </div>
          <Button type="button" variant="ghost" onClick={() => void loadComments()} disabled={commentsLoading}>Atualizar</Button>
        </div>

        <form className="space-y-2" onSubmit={submitComment}>
          <TextArea rows={3} placeholder="Escreva um comentário sobre o estudo deste hino..." value={commentDraft} onChange={(e) => setCommentDraft(e.target.value)} />
          <div className="flex justify-end">
            <Button type="submit" disabled={commentSubmitting || commentDraft.trim().length === 0}>
              {commentSubmitting ? "Enviando..." : "Comentar"}
            </Button>
          </div>
        </form>

        {commentsError && <p className="text-sm text-red-600">{commentsError}</p>}
        {commentsLoading ? (
          <p className="text-sm text-moss-600">Carregando comentários...</p>
        ) : comments.length === 0 ? (
          <p className="text-sm text-moss-600">Nenhum comentário ainda. Seja o primeiro a registrar uma dica.</p>
        ) : (
          <div className="space-y-2">
            {comments.map((comment) => (
              <article key={comment.id} className="rounded-xl border border-moss-100 bg-white p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold text-moss-900">{comment.user.name}</p>
                  <Badge className={comment.user.role === "ADMIN" ? "bg-sand-100 text-sand-800" : "bg-moss-100 text-moss-700"}>
                    {comment.user.role === "ADMIN" ? "Admin" : "Aluno"}
                  </Badge>
                  <p className="text-xs text-moss-500">{formatCommentDate(comment.createdAt)}</p>
                </div>
                <p className="mt-2 whitespace-pre-wrap text-sm text-moss-700">{comment.content}</p>
              </article>
            ))}
          </div>
        )}
      </Card>

      {/* ── ② Assistente Pedagógico ───────────────────────────────── */}
      <Card className="space-y-3">
        <button
          type="button"
          className="flex w-full items-center justify-between gap-3 text-left"
          onClick={() => setAssistantOpen((v) => !v)}
        >
          <div>
            <h2 className="text-lg font-semibold text-moss-900">Assistente Pedagógico</h2>
            <p className="text-sm text-moss-600">Dicas personalizadas de estudo para este hino.</p>
          </div>
          <Badge className="shrink-0 bg-moss-100 text-moss-700">{assistantOpen ? "Fechar" : "Abrir"}</Badge>
        </button>

        {assistantOpen && (
          <div className="space-y-4 border-t border-moss-100 pt-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <label>
                <p className="mb-1 text-xs uppercase tracking-wide text-moss-500">Nível do estudante</p>
                <Select value={assistantLevel} onChange={(e) => setAssistantLevel(e.target.value as StudentLevel)}>
                  {(Object.entries(LEVEL_LABELS) as [StudentLevel, string][]).map(([val, label]) => (
                    <option key={val} value={val}>{label}</option>
                  ))}
                </Select>
              </label>

              <label>
                <p className="mb-1 text-xs uppercase tracking-wide text-moss-500">Pergunta (opcional)</p>
                <Input
                  value={assistantQuestion}
                  onChange={(e) => setAssistantQuestion(e.target.value)}
                  placeholder="Ex.: Como devo estudar este hino?"
                />
              </label>
            </div>

            <Button type="button" onClick={() => void consultAssistant()} disabled={assistantLoading} className="w-full sm:w-auto">
              {assistantLoading ? "Consultando..." : "Consultar Assistente"}
            </Button>

            {assistantError && <p className="text-sm text-red-600">{assistantError}</p>}

            {assistantResult && (
              <div className="space-y-3 rounded-xl border border-moss-100 bg-moss-50/60 p-4">
                <p className="text-sm font-medium text-moss-900">{assistantResult.summary}</p>

                {assistantResult.answer && (
                  <div className="rounded-lg border border-sand-200 bg-white p-3">
                    <p className="text-xs uppercase tracking-wide text-moss-500">Resposta</p>
                    <p className="mt-1 text-sm text-moss-800">{assistantResult.answer}</p>
                  </div>
                )}

                <div className="space-y-2">
                  {assistantResult.recommendations.map((rec, idx) => (
                    <div
                      key={idx}
                      className={`rounded-lg p-3 text-sm ${
                        rec.priority === "high"
                          ? "border border-amber-200 bg-amber-50 text-amber-900"
                          : rec.priority === "medium"
                          ? "border border-moss-200 bg-white text-moss-800"
                          : "border border-sand-200 bg-sand-50 text-moss-700"
                      }`}
                    >
                      <p className="mb-0.5 text-xs font-semibold uppercase tracking-wide opacity-70">
                        {rec.priority === "high" ? "Prioritário" : rec.priority === "medium" ? "Importante" : "Sugestão"} · {rec.type}
                      </p>
                      {rec.content}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Card>

      {/* ── Minhas Anotações ────────────────────────────────────────── */}
      <Card className="space-y-3">
        <button
          type="button"
          className="flex w-full items-center justify-between gap-3 text-left"
          onClick={() => setStudyNoteOpen((v) => !v)}
        >
          <div>
            <h2 className="text-lg font-semibold text-moss-900">Minhas Anotações</h2>
            <p className="text-sm text-moss-600">Anotações pessoais de estudo para este hino (salvas no navegador).</p>
          </div>
          <Badge className="shrink-0 bg-sand-100 text-moss-700">{studyNoteOpen ? "Fechar" : "Abrir"}</Badge>
        </button>

        {studyNoteOpen && (
          <div className="space-y-2 border-t border-moss-100 pt-4">
            <TextArea
              rows={6}
              maxLength={2000}
              value={studyNote}
              onChange={(e) => setStudyNote(e.target.value)}
              placeholder="Dificuldades, metas, dedilhados, observações pessoais..."
            />
            <p className="text-right text-xs text-moss-500">{studyNote.length}/2000 · Salvo automaticamente</p>
          </div>
        )}
      </Card>

      {/* ── Barra flutuante de reprodução — sempre visível durante o play ── */}
      {isPlaying && (
        <div className="fixed bottom-5 left-1/2 z-50 -translate-x-1/2">
          <div className="flex items-center gap-3 rounded-2xl border border-moss-200 bg-white/95 px-5 py-3 shadow-2xl backdrop-blur-sm">
            {/* pulso visual do compasso */}
            <div className="flex items-center gap-1">
              {Array.from({ length: beatsPerMeasure }, (_, i) => (
                <div
                  key={i}
                  className={`h-2.5 w-2.5 rounded-full transition-all duration-75 ${
                    i === currentBeatInMeasure % beatsPerMeasure
                      ? "scale-125 bg-moss-600 shadow"
                      : "bg-moss-200"
                  }`}
                />
              ))}
            </div>

            <span className="text-xs text-moss-500">C.{currentMeasure}/{totalMeasures}</span>

            <Button type="button" onClick={pausePlayback} className="px-5">
              ⏸ Pausar
            </Button>
            <Button type="button" variant="ghost" onClick={stopPlayback}>
              ⏹
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
