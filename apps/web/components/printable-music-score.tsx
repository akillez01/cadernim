"use client";

import { useEffect, useRef, useState } from "react";

type OsmdHandle = {
  load: (xml: string) => Promise<unknown>;
  render: () => Promise<void> | void;
  setOptions: (opts: Record<string, unknown>) => void;
};

export function PrintableMusicScore({ xmlContent }: { xmlContent: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const osmdRef = useRef<unknown>(null);
  const [loading, setLoading] = useState(true);

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
          drawTitle: false,
          drawComposer: false,
          drawPartNames: false,
          drawingParameters: "compacttight",
          pageFormat: "A4_P",
          pageBackgroundColor: "#FFFFFF",
          renderSingleHorizontalStaffline: false,
        });
      }

      const osmd = osmdRef.current as OsmdHandle | null;
      if (!osmd) return;

      await osmd.load(xmlContent);
      await osmd.render();
      setLoading(false);
    }

    void renderScore();
    return () => { cancelled = true; };
  }, [xmlContent]);

  return (
    <div className="osmd-print-wrap relative w-full overflow-x-auto print:overflow-visible">
      {loading && (
        <div className="pointer-events-none absolute inset-0 grid place-items-center bg-white/70 text-sm text-moss-600 print:hidden">
          Renderizando partitura...
        </div>
      )}
      <div ref={containerRef} className="w-full" />
    </div>
  );
}
