export type BookletMeasure = {
  number: number;
  melodyTokens: string[];
  syllables: string[];
  chords: string[];
  lyric: string;
};

export type BookletHymn = {
  hymnId: string;
  title: string;
  number: number;
  author: string;
  originalKey: string;
  selectedKey: string;
  timeSignature: string;
  defaultBpm: number;
  category: string;
  xmlContent: string;
  measures: BookletMeasure[];
};
