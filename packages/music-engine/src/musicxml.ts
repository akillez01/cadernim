import JSZip from "jszip";
import { XMLBuilder, XMLParser } from "fast-xml-parser";
import { keyFromFifths, midiToNoteName, midiToPitch, pitchToMidi, transposeChordSymbol } from "./notes";
import type { ParsedHymnAnalysis, ParsedLeadSheet, ParsedMetadata, ParsedMusicXml } from "./types";

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  preserveOrder: false
});

const builder = new XMLBuilder({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  format: true
});

function asArray<T>(value: T | T[] | undefined | null): T[] {
  if (!value) {
    return [];
  }
  return Array.isArray(value) ? value : [value];
}

function parseDuration(value: unknown) {
  if (value === undefined || value === null) {
    return 0;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function kindToSuffix(kindValue: string | undefined) {
  const value = (kindValue ?? "").toLowerCase();
  if (!value || value === "major") return "";
  if (value.includes("minor")) return "m";
  if (value.includes("dominant")) return "7";
  if (value.includes("major-seventh")) return "maj7";
  if (value.includes("diminished")) return "dim";
  if (value.includes("augmented")) return "aug";
  if (value.includes("suspended-second")) return "sus2";
  if (value.includes("suspended-fourth")) return "sus4";
  return "";
}

function buildChordSymbol(harmonyNode: any) {
  const rootStep = harmonyNode?.root?.["root-step"];
  if (!rootStep) {
    return "";
  }

  const rootAlter = Number(harmonyNode?.root?.["root-alter"] ?? 0);
  const accidental = rootAlter === 1 ? "#" : rootAlter === -1 ? "b" : "";
  const explicitText = harmonyNode?.kind?.["@_text"];
  const suffix = kindToSuffix(
    typeof harmonyNode?.kind === "string" ? harmonyNode.kind : harmonyNode?.kind?.["#text"]
  );

  const base = `${rootStep}${accidental}`;
  return typeof explicitText === "string" && explicitText.trim().length > 0
    ? `${base}${explicitText.trim()}`
    : `${base}${suffix}`;
}

function collectLyricText(noteNode: any) {
  const lyrics = asArray(noteNode?.lyric);
  return lyrics
    .map((lyricNode: any) => {
      const textNode = lyricNode?.text;
      if (typeof textNode === "string") {
        return textNode;
      }
      if (textNode?.["#text"]) {
        return String(textNode["#text"]);
      }
      return "";
    })
    .filter(Boolean)
    .join(" ");
}

function noteHasLyric(noteNode: any) {
  return collectLyricText(noteNode).trim().length > 0;
}

function pickPrimaryMelodyNotes(allNotes: any[]) {
  if (!allNotes.length) {
    return [];
  }

  const scoreByVoice = new Map<
    string,
    {
      score: number;
      notes: any[];
    }
  >();

  allNotes.forEach((noteNode: any) => {
    const voice = String(noteNode?.voice ?? "1");
    const current = scoreByVoice.get(voice) ?? { score: 0, notes: [] };
    const staff = Number(noteNode?.staff ?? 1);
    const hasPitch = !!noteNode?.pitch?.step && noteNode?.pitch?.octave !== undefined;
    const lyricBoost = noteHasLyric(noteNode) ? 12 : 0;
    const staffBoost = staff === 1 ? 4 : 0;
    // Penalize malformed notes (without pitch/rest) to avoid selecting noisy voices.
    const restPenalty = noteNode?.rest ? -1 : hasPitch ? 1 : -2;

    current.score += lyricBoost + staffBoost + restPenalty;
    current.notes.push(noteNode);
    scoreByVoice.set(voice, current);
  });

  const rankedVoices = Array.from(scoreByVoice.entries()).sort((a, b) => {
    if (b[1].score !== a[1].score) {
      return b[1].score - a[1].score;
    }
    return a[0].localeCompare(b[0]);
  });

  return rankedVoices[0]?.[1].notes ?? allNotes;
}

function parseCreatorName(value: unknown): string | undefined {
  if (!value) {
    return undefined;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length ? trimmed : undefined;
  }

  if (typeof value === "object") {
    const textNode = (value as { [key: string]: unknown })["#text"];
    if (typeof textNode === "string") {
      const trimmed = textNode.trim();
      return trimmed.length ? trimmed : undefined;
    }
  }

  return undefined;
}

function parseComposer(creatorNode: unknown): string | undefined {
  const creators = asArray(creatorNode as any);
  if (!creators.length) {
    return parseCreatorName(creatorNode);
  }

  const composerEntry = creators.find((item) => {
    if (!item || typeof item !== "object") {
      return false;
    }
    return (item as { [key: string]: unknown })["@_type"] === "composer";
  });

  return parseCreatorName(composerEntry) ?? parseCreatorName(creators[0]);
}

export async function extractMusicXmlFromFile(
  file: File | Uint8Array | ArrayBuffer,
  fileName: string
) {
  const isRuntimeFile = (value: unknown): value is File =>
    typeof File !== "undefined" && value instanceof File;

  const lowerName = fileName.toLowerCase();
  const rawBytes =
    isRuntimeFile(file)
      ? new Uint8Array(await file.arrayBuffer())
      : file instanceof ArrayBuffer
        ? new Uint8Array(file)
        : file;

  if (lowerName.endsWith(".mxl")) {
    const zip = await JSZip.loadAsync(rawBytes);
    const containerEntry = zip.file("META-INF/container.xml");

    if (!containerEntry) {
      throw new Error("Arquivo MXL invalido: container.xml nao encontrado.");
    }

    const containerXml = await containerEntry.async("string");
    const containerDoc = parser.parse(containerXml);
    const rootFilePath =
      containerDoc?.container?.rootfiles?.rootfile?.["@_full-path"] ??
      containerDoc?.container?.rootfiles?.rootfile?.[0]?.["@_full-path"];

    if (!rootFilePath) {
      throw new Error("Arquivo MXL invalido: caminho da partitura nao encontrado.");
    }

    const scoreEntry = zip.file(rootFilePath);
    if (!scoreEntry) {
      throw new Error("Arquivo MXL invalido: partitura interna nao encontrada.");
    }

    return scoreEntry.async("string");
  }

  return new TextDecoder().decode(rawBytes);
}

export function parseMusicXmlMetadata(xmlContent: string): ParsedMetadata {
  const doc = parser.parse(xmlContent);
  const score = doc["score-partwise"] || doc["score-timewise"];

  if (!score) {
    return {};
  }

  const identification = score.identification;
  const defaults = score.defaults;
  const firstPart = asArray(score.part)[0];
  const firstMeasure = asArray(firstPart?.measure)[0];
  const attributes = firstMeasure?.attributes;
  const direction = asArray(firstMeasure?.direction)[0];

  const tempo = Number(direction?.sound?.["@_tempo"] ?? direction?.sound?.tempo);

  return {
    title: score["work"]?.["work-title"] ?? score["movement-title"],
    composer: parseComposer(identification?.creator),
    key: keyFromFifths(attributes?.key?.fifths),
    timeSignature: attributes?.time ? `${attributes.time.beats}/${attributes.time["beat-type"]}` : undefined,
    tempo: Number.isFinite(tempo) ? tempo : undefined
  };
}

export function parseMusicXml(xmlContent: string): ParsedMusicXml {
  const doc = parser.parse(xmlContent);
  const score = doc["score-partwise"] || doc["score-timewise"];

  if (!score) {
    throw new Error("Formato de MusicXML nao suportado.");
  }

  const part = asArray(score.part)[0];
  const measures = asArray(part?.measure);

  let divisions = 1;
  let currentBeat = 0;
  let beatsPerMeasure = 4;
  let bpm = 80;
  const noteEvents = [] as ParsedMusicXml["noteEvents"];
  const measureSummaries = [] as ParsedMusicXml["measures"];

  measures.forEach((measureNode: any, index) => {
    const measureNumber = Number(measureNode?.["@_number"] ?? index + 1);

    if (measureNode?.attributes?.divisions) {
      divisions = Number(measureNode.attributes.divisions) || divisions;
    }

    if (measureNode?.attributes?.time?.beats) {
      beatsPerMeasure = Number(measureNode.attributes.time.beats) || beatsPerMeasure;
    }

    const firstDirection = asArray(measureNode?.direction)[0];
    const maybeTempo = Number(firstDirection?.sound?.["@_tempo"] ?? firstDirection?.sound?.tempo);
    if (Number.isFinite(maybeTempo) && maybeTempo > 0) {
      bpm = maybeTempo;
    }

    const notes = pickPrimaryMelodyNotes(asArray(measureNode?.note));
    let localBeat = 0;
    let chordStartBeat = 0;

    notes.forEach((noteNode: any) => {
      const durationUnits = parseDuration(noteNode.duration);
      const durationBeats = divisions > 0 ? durationUnits / divisions : 0;

      if (noteNode.chord) {
        localBeat = chordStartBeat;
      } else {
        chordStartBeat = localBeat;
      }

      const hasPitch = !!noteNode?.pitch?.step && noteNode?.pitch?.octave !== undefined;
      if (!noteNode.rest && hasPitch) {
        const pitch = noteNode.pitch;
        const step = pitch?.step ?? "C";
        const alter = Number(pitch?.alter ?? 0);
        const octave = Number(pitch?.octave ?? 4);

        const midi = pitchToMidi(step, alter, octave);

        noteEvents.push({
          midi,
          noteName: midiToNoteName(midi),
          startBeat: currentBeat + localBeat,
          durationBeats: durationBeats > 0 ? durationBeats : 1,
          measure: measureNumber,
          lyric: collectLyricText(noteNode) || undefined
        });
      }

      if (!noteNode.chord) {
        localBeat += durationBeats > 0 ? durationBeats : 0;
      }
    });

    // Implicit/pickup measures (anacrusis) are shorter than a full measure.
    // Advance by actual note duration so the next measure starts on the downbeat.
    const isImplicit = measureNode?.["@_implicit"] === "yes";
    const actualBeats = isImplicit && localBeat > 0 && localBeat < beatsPerMeasure
      ? localBeat
      : Math.max(localBeat, beatsPerMeasure);

    measureSummaries.push({
      number: measureNumber,
      beats: actualBeats
    });

    currentBeat += actualBeats;
  });

  const metadata = parseMusicXmlMetadata(xmlContent);

  return {
    title: metadata.title,
    composer: metadata.composer,
    key: metadata.key,
    timeSignature: metadata.timeSignature,
    defaultBpm: metadata.tempo ?? bpm,
    noteEvents,
    measures: measureSummaries,
    totalBeats: currentBeat
  };
}

export function parseHymnAnalysisFromMusicXml(xmlContent: string): ParsedHymnAnalysis {
  const parsed = parseMusicXml(xmlContent);

  return {
    title: parsed.title,
    key: parsed.key,
    timeSignature: parsed.timeSignature,
    bpm: parsed.defaultBpm,
    notes: parsed.noteEvents.map((note) => ({
      measure: note.measure,
      pitch: note.noteName,
      durationBeats: note.durationBeats,
      syllable: note.lyric
    }))
  };
}

export function transposeMusicXml(xmlContent: string, semitones: number) {
  if (!semitones) {
    return xmlContent;
  }

  const doc = parser.parse(xmlContent);
  const scoreKey = doc["score-partwise"] ? "score-partwise" : "score-timewise";
  const score = doc[scoreKey];

  if (!score) {
    throw new Error("Formato de MusicXML nao suportado para transposicao.");
  }

  const parts = asArray(score.part);
  parts.forEach((part: any) => {
    const measures = asArray(part.measure);
    measures.forEach((measure: any) => {
      const notes = asArray(measure.note);
      notes.forEach((note: any) => {
        if (!note.pitch || note.rest) {
          return;
        }
        const step = note.pitch.step ?? "C";
        const alter = Number(note.pitch.alter ?? 0);
        const octave = Number(note.pitch.octave ?? 4);

        const transposedMidi = pitchToMidi(step, alter, octave) + semitones;
        const transposedPitch = midiToPitch(transposedMidi);

        note.pitch.step = transposedPitch.step;
        if (transposedPitch.alter === 0) {
          delete note.pitch.alter;
        } else {
          note.pitch.alter = transposedPitch.alter;
        }
        note.pitch.octave = transposedPitch.octave;
      });
    });
  });

  return builder.build(doc);
}

export function parseLeadSheetFromMusicXml(xmlContent: string, semitones = 0): ParsedLeadSheet {
  const doc = parser.parse(xmlContent);
  const score = doc["score-partwise"] || doc["score-timewise"];

  if (!score) {
    throw new Error("Formato de MusicXML nao suportado.");
  }

  const part = asArray(score.part)[0];
  const measures = asArray(part?.measure);
  const leadMeasures: ParsedLeadSheet["measures"] = measures.map((measureNode: any, index) => {
    const measureNumber = Number(measureNode?.["@_number"] ?? index + 1);
    const harmonies = asArray(measureNode?.harmony)
      .map((harmonyNode: any) => buildChordSymbol(harmonyNode))
      .filter(Boolean)
      .map((symbol: string) => transposeChordSymbol(symbol, semitones));

    const uniqueChords = Array.from(new Set(harmonies));
    const lyric = pickPrimaryMelodyNotes(asArray(measureNode?.note))
      .map((noteNode: any) => collectLyricText(noteNode))
      .filter(Boolean)
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();

    return {
      number: measureNumber,
      chords: uniqueChords,
      lyric
    };
  });

  const metadata = parseMusicXmlMetadata(xmlContent);
  return {
    title: metadata.title,
    composer: metadata.composer,
    measures: leadMeasures
  };
}

/**
 * Removes repeat/volta markings from MusicXML to produce a linear score.
 * Strips all <ending> and <repeat> elements from barlines, removes barlines
 * that become empty, and marks incomplete first measures as implicit (anacrusis fix).
 */
export function normalizeScoreXml(xmlContent: string): string {
  let out = xmlContent;

  // Remove <ending ...>text</ending> and self-closing <ending .../>
  out = out.replace(/<ending\b[^>]*>[\s\S]*?<\/ending>/g, "");
  out = out.replace(/<ending\b[^>]*\/>/g, "");

  // Remove <repeat .../>
  out = out.replace(/<repeat\b[^>]*\/>/g, "");

  // Replace repeat-style barlines with plain single barline
  out = out.replace(/<bar-style>(?:heavy-light|light-heavy|heavy-heavy)<\/bar-style>/g,
    "<bar-style>light</bar-style>");

  // Remove barline elements that are now empty (only whitespace inside)
  out = out.replace(/<barline\b[^>]*>\s*<\/barline>/g, "");

  // Mark implicit pickup on measure number="1" only when:
  //  - no measure number="0" already exists (if it does, that IS the pickup)
  //  - measure 1 actually has fewer notes than the time signature expects (real anacrusis)
  //  - the tag doesn't already have implicit="yes"
  if (!out.includes('measure number="0"') && !out.includes('measure number="1" implicit')) {
    const docCheck = parser.parse(out);
    const scoreCheck = docCheck["score-partwise"] ?? docCheck["score-timewise"];
    const firstMeasure = asArray(asArray(scoreCheck?.part)[0]?.measure)[0];
    if (firstMeasure) {
      const div = Number(firstMeasure?.attributes?.divisions ?? 1);
      const bpm = Number(firstMeasure?.attributes?.time?.beats ?? 4);
      let lb = 0;
      for (const n of asArray(firstMeasure.note)) {
        if (!n.chord) lb += Number(n.duration ?? 0) / div;
      }
      // Only an anacrusis when notes fill less than 75% of the measure
      if (lb > 0 && lb < bpm * 0.75) {
        out = out.replace(
          /(<measure\b[^>]*\bnumber="1"[^>]*?)>/,
          '$1 implicit="yes">'
        );
      }
    }
  }

  // Collapse runs of blank lines created by the removals
  out = out.replace(/(\n\s*){3,}/g, "\n\n");

  return out;
}

/**
 * Expands repeat/volta structure into a fully linear score.
 * Each repeated section is physically duplicated so playback and cursor
 * stay perfectly in sync without any repeat-handling logic in the player.
 *
 * Structure handled:
 *   body → [1st volta] → BACKWARD REPEAT → body → [2nd volta] → continue
 *
 * Result: body, 1st-volta, body(copy), 2nd-volta, next-section, ...
 */
export function expandRepeatsInMusicXml(xmlContent: string): string {
  // ── locate the <part …> … </part> block ──────────────────────────────────
  // IMPORTANT: avoid matching <part-list>; only match real <part ...> tags.
  const partOpenRe = /<part(?=[\s>])[^>]*>/;
  const partOpenMatch = xmlContent.match(partOpenRe);
  if (!partOpenMatch) return normalizeScoreXml(xmlContent);

  const partOpenTag = partOpenMatch[0];
  const partOpenIdx = xmlContent.indexOf(partOpenTag);
  const partCloseIdx = xmlContent.indexOf("</part>", partOpenIdx);
  if (partCloseIdx < 0) return normalizeScoreXml(xmlContent);

  const header = xmlContent.slice(0, partOpenIdx);
  const inner = xmlContent.slice(partOpenIdx + partOpenTag.length, partCloseIdx);
  const footer = xmlContent.slice(partCloseIdx + "</part>".length);

  // ── extract raw measure strings ───────────────────────────────────────────
  const measureRe = /<measure\b[^>]*>[\s\S]*?<\/measure>/g;
  const measures: Array<{ num: number; xml: string }> = [];
  let mc: RegExpExecArray | null;
  while ((mc = measureRe.exec(inner)) !== null) {
    const nm = mc[0].match(/number="(-?\d+)"/);
    if (nm) measures.push({ num: parseInt(nm[1]), xml: mc[0] });
  }
  if (!measures.length) return normalizeScoreXml(xmlContent);

  // ── helpers ───────────────────────────────────────────────────────────────
  const hasForward  = (xml: string) => /<repeat\b[^>]*direction="forward"/.test(xml);
  const hasBackward = (xml: string) => /<repeat\b[^>]*direction="backward"/.test(xml);
  const endingStart = (xml: string) => {
    const m = xml.match(/<ending\b[^>]*\bnumber="(\d+)"[^>]*\btype="start"/);
    return m ? parseInt(m[1]) : null;
  };
  const endingStop = (xml: string) => {
    const m = xml.match(/<ending\b[^>]*\bnumber="(\d+)"[^>]*\btype="stop"/);
    return m ? parseInt(m[1]) : null;
  };

  function cleanBarlines(xml: string): string {
    let out = xml;
    // Remove ending brackets and repeat markers
    out = out.replace(/<ending\b[^>]*>[\s\S]*?<\/ending>/g, "");
    out = out.replace(/<ending\b[^>]*\/>/g, "");
    out = out.replace(/<repeat\b[^>]*\/>/g, "");
    // Replace repeat-style barlines with plain single barline so OSMD
    // does not render or navigate them as visual repeat signs
    out = out.replace(/<bar-style>(?:heavy-light|light-heavy|heavy-heavy)<\/bar-style>/g,
      "<bar-style>light</bar-style>");
    // Remove barlines that are now empty (only whitespace inside)
    out = out.replace(/<barline\b[^>]*>\s*<\/barline>/g, "");
    return out;
  }

  // ── first scan: mark 1st-volta measure indices ────────────────────────────
  const firstVoltaIdx = new Set<number>();
  let inV1 = false;
  for (let i = 0; i < measures.length; i++) {
    if (endingStart(measures[i].xml) === 1) inV1 = true;
    if (inV1) firstVoltaIdx.add(i);
    if (endingStop(measures[i].xml) === 1) inV1 = false;
  }

  // ── second pass: build unfolded sequence ─────────────────────────────────
  const sequence: string[] = [];
  let repeatStartIdx = 0;
  let nextNum = measures[0].num; // keep original numbering then renumber

  function emit(rawXml: string) {
    let out = cleanBarlines(rawXml);
    out = out.replace(/\bnumber="-?\d+"/, `number="${nextNum}"`);
    nextNum++;
    sequence.push(out);
  }

  for (let i = 0; i < measures.length; i++) {
    const { xml } = measures[i];
    if (hasForward(xml)) repeatStartIdx = i;

    emit(xml); // always include the measure itself

    if (hasBackward(xml)) {
      // Replay section from repeatStart to i (exclusive), skipping 1st volta
      for (let j = repeatStartIdx; j < i; j++) {
        if (!firstVoltaIdx.has(j)) emit(measures[j].xml);
      }
      // Note: the 2nd volta (if any) follows naturally in the outer loop
    }
  }

  // ── mark implicit anacrusis if the first measure is a pickup ─────────────
  if (sequence.length > 0) {
    const first = sequence[0];
    // Only patch if the first measure doesn't already have implicit="yes"
    if (!first.includes('implicit="yes"')) {
      const hasMeasure0 = xmlContent.includes('measure number="0"');
      if (!hasMeasure0) {
        // Detect pickup: count actual note beats vs time signature
        const divM = first.match(/<divisions>(\d+)/);
        const bpmM = first.match(/<beats>(\d+)/);
        const div = divM ? parseInt(divM[1]) : 1;
        const bpm = bpmM ? parseInt(bpmM[1]) : 4;
        const durMatches = [...first.matchAll(/<duration>(\d+)<\/duration>/g)];
        const notes = [...first.matchAll(/<note\b/g)];
        const chords = [...first.matchAll(/<chord\/>/g)];
        const actualNotes = notes.length - chords.length;
        if (actualNotes > 0) {
          const totalDur = durMatches
            .slice(0, actualNotes)
            .reduce((s, m) => s + parseInt(m[1]), 0);
          const lb = totalDur / div;
          if (lb > 0 && lb < bpm * 0.75) {
            sequence[0] = first.replace(
              /(<measure\b[^>]*\bnumber="\d+"[^>]*?)>/,
              '$1 implicit="yes">'
            );
          }
        }
      }
    }
  }

  // ── reassemble ────────────────────────────────────────────────────────────
  let result = header + partOpenTag + "\n" + sequence.join("\n") + "\n</part>" + footer;
  // Collapse triple+ blank lines
  result = result.replace(/(\n\s*){3,}/g, "\n\n");
  // Clean up MuseScore lyric export artifact: "word/nextword" on one note.
  // Keep only the text before "/" so OSMD renders cleanly.
  // e.g. "tro/o" → "tro", "mo/eu" → "mo", "ra/a" → "ra"
  result = result.replace(/(<text>[^/<\n]+)\/[^<\n]*(<\/text>)/g, "$1$2");
  return result;
}
