export type NoteEvent = {
  midi: number;
  noteName: string;
  startBeat: number;
  durationBeats: number;
  measure: number;
  lyric?: string;
};

export type MeasureSummary = {
  number: number;
  beats: number;
};

export type ParsedMusicXml = {
  title?: string;
  composer?: string;
  key?: string;
  timeSignature?: string;
  defaultBpm?: number;
  noteEvents: NoteEvent[];
  measures: MeasureSummary[];
  totalBeats: number;
};

export type ParsedMetadata = {
  title?: string;
  composer?: string;
  key?: string;
  timeSignature?: string;
  tempo?: number;
};

export type LeadSheetMeasure = {
  number: number;
  chords: string[];
  lyric: string;
};

export type ParsedLeadSheet = {
  title?: string;
  composer?: string;
  measures: LeadSheetMeasure[];
};

export type ParsedHymnAnalysis = {
  title?: string;
  key?: string;
  timeSignature?: string;
  bpm?: number;
  notes: Array<{
    measure: number;
    pitch: string;
    durationBeats: number;
    syllable?: string;
  }>;
};

export type AccompanimentType =
  | "melody"
  | "melody_metronome"
  | "melody_chords"
  | "melody_guitar"
  | "melody_pad";
