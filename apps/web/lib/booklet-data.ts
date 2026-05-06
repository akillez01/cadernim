import { parseLeadSheetFromMusicXml, parseMusicXml, semitoneDistanceBetweenKeys, transposeMusicXml } from "@cadernim/music-engine";
import type { BookletSpec } from "@/lib/booklet-spec";
import type { BookletHymn } from "@/lib/booklet-types";
import { prisma } from "@/lib/prisma";
import { getStorageAdapter } from "@/lib/storage";

function toPitchClass(noteName: string) {
  return noteName.replace(/[0-9-]/g, "");
}

export async function buildBookletHymns(spec: BookletSpec): Promise<BookletHymn[]> {
  const hymnIds = spec.items.map((item) => item.hymnId);
  const hymns = await prisma.hymn.findMany({
    where: { id: { in: hymnIds } }
  });

  const hymnById = new Map(hymns.map((hymn) => [hymn.id, hymn]));
  const storage = getStorageAdapter();

  const bookletHymns = await Promise.all(
    spec.items.map(async (item) => {
      const hymn = hymnById.get(item.hymnId);
      if (!hymn) {
        return null;
      }

      const originalXml = await storage.readText(hymn.xmlFilePath);
      const semitones = semitoneDistanceBetweenKeys(hymn.originalKey, item.targetKey);
      const transposedXml = transposeMusicXml(originalXml, semitones);
      const parsedMusic = parseMusicXml(transposedXml);
      const leadSheet = parseLeadSheetFromMusicXml(originalXml, semitones);
      const leadByMeasure = new Map(leadSheet.measures.map((measure) => [measure.number, measure]));

      const measures = parsedMusic.measures.map((measure) => {
        const noteEvents = parsedMusic.noteEvents.filter((note) => note.measure === measure.number && note.lyric?.trim());
        const syllables = noteEvents.map((note) => note.lyric?.trim() ?? "");
        const melodyTokens = noteEvents.map((note) => toPitchClass(note.noteName));
        const lead = leadByMeasure.get(measure.number);

        return {
          number: measure.number,
          melodyTokens,
          syllables,
          chords: lead?.chords ?? [],
          lyric: lead?.lyric ?? syllables.join(" ").trim()
        };
      });

      return {
        hymnId: hymn.id,
        title: hymn.title,
        number: hymn.number,
        author: hymn.author,
        originalKey: hymn.originalKey,
        selectedKey: item.targetKey,
        defaultBpm: hymn.defaultBpm,
        timeSignature: hymn.timeSignature,
        category: hymn.category,
        xmlContent: transposedXml,
        measures
      };
    })
  );

  return bookletHymns.filter((item): item is NonNullable<(typeof bookletHymns)[number]> => item !== null);
}
