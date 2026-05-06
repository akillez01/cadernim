"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Badge, Button, Card, Input, Select } from "@cadernim/ui";
import { normalizeScoreXml } from "@cadernim/music-engine";
import { MusicScoreViewer } from "@/components/music-score-viewer";

const MonacoEditor = dynamic(
  () => import("@monaco-editor/react").then((m) => m.default),
  { ssr: false, loading: () => <div className="flex h-full items-center justify-center text-sm text-moss-500">Carregando editor...</div> }
);

// ── types ─────────────────────────────────────────────────────────────────────
type HymnMeta = {
  id: string;
  title: string;
  number: number;
  author: string;
  originalKey: string;
  defaultBpm: number;
  timeSignature: string;
  category: string;
  tags: string[];
  xmlContent: string;
};

type MetaForm = {
  title: string;
  author: string;
  originalKey: string;
  defaultBpm: string;
  timeSignature: string;
  category: string;
  tags: string;
};

// ── MusicXML DOM helpers ──────────────────────────────────────────────────────
function parseXmlDom(xml: string) {
  if (typeof window === "undefined") return null;
  return new DOMParser().parseFromString(xml, "application/xml");
}

function serializeXmlDom(doc: Document) {
  return new XMLSerializer().serializeToString(doc);
}

function extractMetaFromXml(xml: string): Partial<MetaForm> {
  const doc = parseXmlDom(xml);
  if (!doc) return {};

  const get = (sel: string) => doc.querySelector(sel)?.textContent?.trim() ?? "";

  const fifths = parseInt(get("key > fifths") || "0", 10);
  const originalKey = fifthsToKey(fifths);

  const beats = get("time > beats");
  const beatType = get("time > beat-type");
  const timeSignature = beats && beatType ? `${beats}/${beatType}` : "";

  const tempoEl = doc.querySelector("sound[tempo]");
  const defaultBpm = tempoEl?.getAttribute("tempo") ?? "";

  return {
    title: get("work-title") || get("movement-title"),
    author: get("creator[type='composer']") || get("creator"),
    originalKey,
    defaultBpm,
    timeSignature,
  };
}

function applyMetaToXml(xml: string, meta: MetaForm): string {
  const doc = parseXmlDom(xml);
  if (!doc) return xml;

  const setOrCreate = (parentSel: string, tag: string, value: string) => {
    const parent = doc.querySelector(parentSel);
    if (!parent) return;
    let el = parent.querySelector(tag);
    if (!el) { el = doc.createElement(tag); parent.appendChild(el); }
    el.textContent = value;
  };

  // title
  setOrCreate("work", "work-title", meta.title);

  // composer
  let creatorEl = doc.querySelector("creator[type='composer']");
  if (!creatorEl) {
    const identification = doc.querySelector("identification");
    if (identification) {
      creatorEl = doc.createElement("creator");
      creatorEl.setAttribute("type", "composer");
      identification.insertBefore(creatorEl, identification.firstChild);
    }
  }
  if (creatorEl) creatorEl.textContent = meta.author;

  // key — fifths
  const keyFifths = keyToFifths(meta.originalKey);
  const fifthsEl = doc.querySelector("key > fifths");
  if (fifthsEl) fifthsEl.textContent = String(keyFifths);

  // time signature
  const parts = meta.timeSignature.split("/");
  if (parts.length === 2) {
    const beatsEl = doc.querySelector("time > beats");
    const beatTypeEl = doc.querySelector("time > beat-type");
    if (beatsEl) beatsEl.textContent = parts[0];
    if (beatTypeEl) beatTypeEl.textContent = parts[1];
  }

  // tempo — update or insert <direction><sound tempo="..."> in measure 1
  const bpmVal = parseInt(meta.defaultBpm, 10);
  if (!isNaN(bpmVal) && bpmVal > 0) {
    const soundEl = doc.querySelector("sound[tempo]");
    if (soundEl) {
      soundEl.setAttribute("tempo", String(bpmVal));
    } else {
      const measure1 = doc.querySelector("measure");
      if (measure1) {
        const dir = doc.createElement("direction");
        dir.setAttribute("placement", "above");
        const dirType = doc.createElement("direction-type");
        const metro = doc.createElement("metronome");
        metro.setAttribute("parentheses", "no");
        const beatUnit = doc.createElement("beat-unit");
        beatUnit.textContent = "quarter";
        const perMinute = doc.createElement("per-minute");
        perMinute.textContent = String(bpmVal);
        metro.appendChild(beatUnit);
        metro.appendChild(perMinute);
        dirType.appendChild(metro);
        dir.appendChild(dirType);
        const sound = doc.createElement("sound");
        sound.setAttribute("tempo", String(bpmVal));
        dir.appendChild(sound);
        measure1.insertBefore(dir, measure1.firstChild);
      }
    }
  }

  return serializeXmlDom(doc);
}

// ── key / fifths conversion ───────────────────────────────────────────────────
const FIFTHS_TO_KEY: Record<number, string> = {
  "-7": "Cb", "-6": "Gb", "-5": "Db", "-4": "Ab", "-3": "Eb",
  "-2": "Bb", "-1": "F",   0: "C",   1: "G",   2: "D",
    3: "A",   4: "E",   5: "B",   6: "F#",   7: "C#"
};
const KEY_TO_FIFTHS: Record<string, number> = Object.fromEntries(
  Object.entries(FIFTHS_TO_KEY).map(([k, v]) => [v, Number(k)])
);

function fifthsToKey(n: number) { return FIFTHS_TO_KEY[n] ?? "C"; }
function keyToFifths(key: string) { return KEY_TO_FIFTHS[key] ?? 0; }

const ALL_KEYS = ["Cb","Gb","Db","Ab","Eb","Bb","F","C","G","D","A","E","B","F#","C#"];
const COMMON_TIME_SIGS = ["2/4","3/4","4/4","3/8","6/8","9/8","12/8"];

// ── component ─────────────────────────────────────────────────────────────────
export function HymnScoreEditor({ hymnId, onBack }: { hymnId: string; onBack: () => void }) {
  const [hymn, setHymn] = useState<HymnMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [xmlDraft, setXmlDraft] = useState("");
  const [previewXml, setPreviewXml] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [metaForm, setMetaForm] = useState<MetaForm>({
    title: "", author: "", originalKey: "C",
    defaultBpm: "110", timeSignature: "4/4",
    category: "", tags: ""
  });
  const [activeTab, setActiveTab] = useState<"meta" | "xml">("meta");

  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // ── load hymn ──────────────────────────────────────────────────────────────
  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const res = await fetch(`/api/hymns/${hymnId}?includeXml=1`);
        if (!res.ok) { setFetchError("Hino não encontrado."); return; }
        const { data } = await res.json() as { data: HymnMeta };
        if (!mounted) return;
        setHymn(data);
        setXmlDraft(data.xmlContent);
        setPreviewXml(data.xmlContent);

        const extracted = extractMetaFromXml(data.xmlContent);
        setMetaForm({
          ...extracted,
          // db fields take priority over XML-extracted values
          title: data.title,
          author: data.author,
          originalKey: data.originalKey,
          defaultBpm: String(data.defaultBpm),
          timeSignature: data.timeSignature,
          category: data.category,
          tags: data.tags.join(", "),
        });
      } catch {
        if (mounted) setFetchError("Erro ao carregar hino.");
      } finally {
        if (mounted) setLoading(false);
      }
    }
    void load();
    return () => { mounted = false; };
  }, [hymnId]);

  // ── debounce preview while typing in Monaco ───────────────────────────────
  const schedulePreview = useCallback((xml: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setPreviewXml(xml), 900);
  }, []);

  const handleXmlChange = useCallback((val: string | undefined) => {
    const v = val ?? "";
    setXmlDraft(v);
    schedulePreview(v);
  }, [schedulePreview]);

  // ── apply meta form changes to XML ────────────────────────────────────────
  function applyMeta() {
    const updated = applyMetaToXml(xmlDraft, metaForm);
    setXmlDraft(updated);
    setPreviewXml(updated);
  }

  // ── normalize: remove repeat/endings, fix anacrusis ─────────────────────
  const [normalizeConfirm, setNormalizeConfirm] = useState(false);

  function handleNormalize() {
    if (!normalizeConfirm) { setNormalizeConfirm(true); return; }
    const normalized = normalizeScoreXml(xmlDraft);
    setXmlDraft(normalized);
    setPreviewXml(normalized);
    setNormalizeConfirm(false);
    setSaveMsg({ ok: true, text: "Partitura normalizada — clique em Salvar para persistir." });
  }

  // ── save to server ────────────────────────────────────────────────────────
  async function handleSave() {
    if (!hymn) return;
    setSaving(true);
    setSaveMsg(null);
    try {
      const tags = metaForm.tags
        .split(/[,;]/)
        .map((t) => t.trim())
        .filter(Boolean);

      const res = await fetch(`/api/hymns/${hymn.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: metaForm.title,
          number: hymn.number,
          author: metaForm.author,
          originalKey: metaForm.originalKey,
          defaultBpm: parseInt(metaForm.defaultBpm, 10) || hymn.defaultBpm,
          timeSignature: metaForm.timeSignature,
          category: metaForm.category || hymn.category,
          tags,
          xmlContent: xmlDraft
        })
      });

      if (!res.ok) {
        const body = await res.json() as { error?: string };
        setSaveMsg({ ok: false, text: body.error ?? "Erro ao salvar." });
      } else {
        setSaveMsg({ ok: true, text: "Partitura salva com sucesso!" });
      }
    } catch {
      setSaveMsg({ ok: false, text: "Falha de rede ao salvar." });
    } finally {
      setSaving(false);
    }
  }

  // ── xml stats ─────────────────────────────────────────────────────────────
  const xmlStats = useMemo(() => {
    const noteCount = (xmlDraft.match(/<note>/g) ?? []).length;
    const measureCount = (xmlDraft.match(/<measure /g) ?? []).length;
    const bytes = new TextEncoder().encode(xmlDraft).length;
    return { noteCount, measureCount, bytes };
  }, [xmlDraft]);

  // ── render ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-sm text-moss-500">Carregando partitura para edição...</p>
      </div>
    );
  }

  if (fetchError || !hymn) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <p className="text-sm text-red-600">{fetchError}</p>
        <Button variant="ghost" onClick={onBack}>Voltar</Button>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-80px)] flex-col gap-0 overflow-hidden">

      {/* ── toolbar ──────────────────────────────────────────────────────── */}
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-moss-100 bg-white/95 px-4 py-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" onClick={onBack} className="text-sm">← Voltar</Button>
          <div>
            <p className="text-xs text-moss-500">Editando partitura</p>
            <p className="font-semibold text-moss-900">{hymn.title}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="hidden text-xs text-moss-400 sm:inline">
            {xmlStats.measureCount} compassos · {xmlStats.noteCount} notas · {Math.round(xmlStats.bytes / 1024)}KB
          </span>
          {saveMsg && (
            <span className={`text-xs font-medium ${saveMsg.ok ? "text-moss-600" : "text-red-600"}`}>
              {saveMsg.text}
            </span>
          )}
          <Button onClick={() => void handleSave()} disabled={saving}>
            {saving ? "Salvando..." : "Salvar partitura"}
          </Button>
        </div>
      </div>

      {/* ── main split ───────────────────────────────────────────────────── */}
      <div className="flex min-h-0 flex-1 flex-col gap-0 lg:flex-row">

        {/* left: OSMD preview */}
        <div className="flex w-full flex-col gap-2 overflow-auto border-b border-moss-100 bg-sand-50 p-3 lg:w-1/2 lg:border-b-0 lg:border-r">
          <p className="shrink-0 text-xs uppercase tracking-wide text-moss-400">Preview ao vivo</p>
          <MusicScoreViewer xmlContent={previewXml} currentBeat={0} />
        </div>

        {/* right: editor panel */}
        <div className="flex w-full min-w-0 flex-col lg:w-1/2">

          {/* tabs */}
          <div className="flex shrink-0 border-b border-moss-100 bg-white">
            {(["meta", "xml"] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`px-5 py-2.5 text-sm font-medium transition-colors ${
                  activeTab === tab
                    ? "border-b-2 border-moss-600 text-moss-900"
                    : "text-moss-400 hover:text-moss-700"
                }`}
              >
                {tab === "meta" ? "Metadados" : "XML Completo"}
              </button>
            ))}
          </div>

          {/* tab: metadata ──────────────────────────────────────────────── */}
          {activeTab === "meta" && (
            <div className="flex-1 overflow-auto p-4">
              <div className="space-y-4">

                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="flex flex-col gap-1">
                    <span className="text-xs text-moss-500">Título</span>
                    <Input
                      value={metaForm.title}
                      onChange={(e) => setMetaForm((f) => ({ ...f, title: e.target.value }))}
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-xs text-moss-500">Compositor / Autor</span>
                    <Input
                      value={metaForm.author}
                      onChange={(e) => setMetaForm((f) => ({ ...f, author: e.target.value }))}
                    />
                  </label>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <label className="flex flex-col gap-1">
                    <span className="text-xs text-moss-500">Tom original</span>
                    <Select
                      value={metaForm.originalKey}
                      onChange={(e) => setMetaForm((f) => ({ ...f, originalKey: e.target.value }))}
                    >
                      {ALL_KEYS.map((k) => <option key={k} value={k}>{k}</option>)}
                    </Select>
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-xs text-moss-500">BPM padrão</span>
                    <Input
                      type="number"
                      min={20}
                      max={300}
                      value={metaForm.defaultBpm}
                      onChange={(e) => setMetaForm((f) => ({ ...f, defaultBpm: e.target.value }))}
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-xs text-moss-500">Compasso</span>
                    <Select
                      value={metaForm.timeSignature}
                      onChange={(e) => setMetaForm((f) => ({ ...f, timeSignature: e.target.value }))}
                    >
                      {COMMON_TIME_SIGS.map((s) => <option key={s} value={s}>{s}</option>)}
                    </Select>
                  </label>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="flex flex-col gap-1">
                    <span className="text-xs text-moss-500">Categoria</span>
                    <Input
                      value={metaForm.category}
                      onChange={(e) => setMetaForm((f) => ({ ...f, category: e.target.value }))}
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-xs text-moss-500">Tags (separadas por vírgula)</span>
                    <Input
                      value={metaForm.tags}
                      onChange={(e) => setMetaForm((f) => ({ ...f, tags: e.target.value }))}
                      placeholder="hinario, oracao, escola-da-floresta"
                    />
                  </label>
                </div>

                <Button
                  type="button"
                  variant="soft"
                  onClick={applyMeta}
                  className="w-full"
                >
                  Aplicar metadados ao XML (atualiza preview)
                </Button>

                {/* normalize */}
                <Card className={`border ${normalizeConfirm ? "border-amber-300 bg-amber-50" : "border-moss-100 bg-sand-50"}`}>
                  <p className="mb-1 text-xs font-medium uppercase tracking-wide text-moss-500">
                    Normalizar Partitura
                  </p>
                  <p className="mb-3 text-xs text-moss-600">
                    Remove todas as marcações de repetição (<code className="font-mono">&lt;ending&gt;</code>, <code className="font-mono">&lt;repeat&gt;</code>) e corrige compassos de anacruse. Deixa a partitura linear — ideal para estudo.
                  </p>
                  {normalizeConfirm && (
                    <p className="mb-2 text-xs font-semibold text-amber-700">
                      Confirmar? Esta ação modifica o XML no editor (ainda não salvo no servidor).
                    </p>
                  )}
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant={normalizeConfirm ? "danger" : "soft"}
                      onClick={handleNormalize}
                    >
                      {normalizeConfirm ? "Confirmar normalização" : "Normalizar partitura"}
                    </Button>
                    {normalizeConfirm && (
                      <Button type="button" variant="ghost" onClick={() => setNormalizeConfirm(false)}>
                        Cancelar
                      </Button>
                    )}
                  </div>
                </Card>

                {/* quick reference */}
                <Card className="bg-sand-50">
                  <p className="mb-2 text-xs font-medium uppercase tracking-wide text-moss-500">Referência rápida MusicXML</p>
                  <div className="space-y-1 text-xs text-moss-600 font-mono">
                    <p><span className="text-moss-400">nota:</span> &lt;step&gt;C&lt;/step&gt; &lt;octave&gt;4&lt;/octave&gt;</p>
                    <p><span className="text-moss-400">duração:</span> whole | half | quarter | eighth | 16th</p>
                    <p><span className="text-moss-400">dinâmica:</span> &lt;dynamics&gt;&lt;f/&gt;&lt;/dynamics&gt;</p>
                    <p><span className="text-moss-400">repetição:</span> &lt;repeat direction=&quot;forward&quot;/&gt;</p>
                    <p><span className="text-moss-400">andamento:</span> &lt;sound tempo=&quot;120&quot;/&gt;</p>
                    <p><span className="text-moss-400">letra:</span> &lt;lyric&gt;&lt;syllabic&gt;single&lt;/syllabic&gt;&lt;text&gt;A&lt;/text&gt;&lt;/lyric&gt;</p>
                  </div>
                </Card>
              </div>
            </div>
          )}

          {/* tab: Monaco XML ─────────────────────────────────────────────── */}
          {activeTab === "xml" && (
            <div className="flex min-h-0 flex-1 flex-col">
              <div className="flex shrink-0 items-center justify-between bg-moss-900 px-3 py-1.5 text-xs text-moss-300">
                <span>MusicXML 4.0 · UTF-8</span>
                <span>Preview atualiza 0.9s após última edição</span>
              </div>
              <div className="flex-1">
                <MonacoEditor
                  height="100%"
                  language="xml"
                  theme="vs-dark"
                  value={xmlDraft}
                  onChange={handleXmlChange}
                  options={{
                    fontSize: 12,
                    lineNumbers: "on",
                    wordWrap: "off",
                    minimap: { enabled: true },
                    scrollBeyondLastLine: false,
                    tabSize: 2,
                    insertSpaces: true,
                    autoClosingBrackets: "always",
                    formatOnPaste: true,
                    renderWhitespace: "none",
                    folding: true,
                    foldingStrategy: "indentation",
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
