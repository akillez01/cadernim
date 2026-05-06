"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  xmlContent: string;
  currentBeat: number;
};

type CursorIterator = {
  endReached?: boolean;
  EndReached?: boolean;
  currentTimeStamp?: { realValue?: number; RealValue?: number };
  CurrentTimeStamp?: { realValue?: number; RealValue?: number };
};

type ScoreCursor = {
  show: () => void;
  reset: () => void;
  next: () => void;
  cursorElement?: HTMLElement | null;
  CursorElement?: HTMLElement | null;
  iterator?: CursorIterator;
  Iterator?: CursorIterator;
};

type OsmdHandle = {
  load: (xml: string) => Promise<unknown>;
  render: () => Promise<void> | void;
  cursor?: ScoreCursor;
};

export function MusicScoreViewer({ xmlContent, currentBeat }: Props) {
  const outerRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const osmdRef = useRef<unknown>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function renderScore() {
      if (!containerRef.current || !xmlContent) return;

      setLoading(true);
      const { OpenSheetMusicDisplay } = await import("opensheetmusicdisplay");
      if (cancelled) return;

      if (!osmdRef.current) {
        osmdRef.current = new OpenSheetMusicDisplay(containerRef.current, {
          autoResize: true,
          drawingParameters: "compact",
          drawTitle: false,
          drawComposer: false,
          drawPartNames: false
        });
      }

      const osmd = osmdRef.current as OsmdHandle | null;
      if (!osmd) return;

      await osmd.load(xmlContent);
      await osmd.render();
      if (osmd.cursor) osmd.cursor.show();
      setLoading(false);
    }

    void renderScore();
    return () => { cancelled = true; };
  }, [xmlContent]);

  useEffect(() => {
    const osmd = osmdRef.current as OsmdHandle | null;
    if (!osmd?.cursor) return;

    const cursor = osmd.cursor;
    cursor.reset();
    cursor.show();

    let guard = 0;
    while (guard < 5000) {
      const iterator = cursor.iterator ?? cursor.Iterator;
      if (!iterator) break;
      if (iterator.endReached ?? iterator.EndReached) break;
      const rawBeat =
        iterator.currentTimeStamp?.realValue ??
        iterator.CurrentTimeStamp?.RealValue ??
        iterator.currentTimeStamp?.RealValue ??
        0;
      if (Number(rawBeat) >= currentBeat) break;
      cursor.next();
      guard += 1;
    }

    // Rola o container interno para manter o cursor visível — nunca a página inteira
    const cursorEl = cursor.cursorElement ?? cursor.CursorElement;
    const outer = outerRef.current;
    if (cursorEl && outer) {
      const cursorRect = cursorEl.getBoundingClientRect();
      const outerRect = outer.getBoundingClientRect();
      const cursorTopRelative = cursorRect.top - outerRect.top + outer.scrollTop;
      const targetScrollTop = cursorTopRelative - outer.clientHeight / 2 + cursorRect.height / 2;
      outer.scrollTo({ top: Math.max(0, targetScrollTop), behavior: "smooth" });
    }
  }, [currentBeat]);

  return (
    <div
      ref={outerRef}
      className="relative max-h-[70vh] min-h-[280px] overflow-y-auto rounded-2xl border border-moss-100 bg-white/95 p-2 sm:min-h-[380px] sm:p-4"
    >
      {loading && (
        <div className="pointer-events-none absolute inset-0 grid place-items-center bg-white/75 text-sm text-moss-600">
          Renderizando partitura...
        </div>
      )}
      <div ref={containerRef} />
    </div>
  );
}
