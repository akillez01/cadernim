"use client";

import { useEffect, useMemo, useState } from "react";
import { CircleCheckBig, Clock3, Mic2, Plus, Search, Sparkles, Trash2 } from "lucide-react";
import { Badge, Button, Card, Input, Select, TextArea } from "@cadernim/ui";
import { CompletePodcastPlayer } from "@/components/complete-podcast-player";
import type { PodcastSourceType } from "@/lib/podcast-catalog";

type PodcastEpisode = {
  id: string;
  series: string;
  order: number;
  title: string;
  host: string;
  level: string;
  durationLabel: string;
  publishedLabel: string;
  description: string;
  tags: string[];
  coverImage: string;
  sourceUrl: string;
  sourceType: PodcastSourceType;
  createdAt: string;
  updatedAt: string;
};

type RawPodcastEpisode = Omit<PodcastEpisode, "sourceType"> & {
  sourceType?: string;
};

type EpisodeProgress = {
  listenedSeconds: number;
  durationSeconds: number;
  completed: boolean;
  updatedAt: string;
};

const PROGRESS_KEY = "cadernim:podcasts-progress:v1";
const NOTES_KEY = "cadernim:podcasts-notes:v1";

function getProgressPercent(p?: EpisodeProgress) {
  if (!p || p.durationSeconds <= 0) return 0;
  return Math.min(100, Math.round((p.listenedSeconds / p.durationSeconds) * 100));
}

const EMPTY_FORM = {
  series: "",
  order: "0",
  title: "",
  host: "Escola da Floresta",
  level: "iniciante",
  durationLabel: "00:00",
  publishedLabel: "",
  description: "",
  tags: "",
  coverImage: "",
  sourceUrl: "",
  sourceType: "direct"
};

export function PodcastsLearningHub() {
  const [episodes, setEpisodes] = useState<PodcastEpisode[]>([]);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<"ADMIN" | "STUDENT" | null>(null);

  const [selectedId, setSelectedId] = useState("");
  const [search, setSearch] = useState("");
  const [seriesFilter, setSeriesFilter] = useState("todos");

  const [progressMap, setProgressMap] = useState<Record<string, EpisodeProgress>>({});
  const [notesMap, setNotesMap] = useState<Record<string, string>>({});
  const [notesDraft, setNotesDraft] = useState("");
  const [saveFeedback, setSaveFeedback] = useState("");

  // admin form
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formSaving, setFormSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const seriesOptions = useMemo(() => ["todos", ...Array.from(new Set(episodes.map((e) => e.series)))], [episodes]);

  const filtered = useMemo(() => {
    const text = search.trim().toLowerCase();
    return episodes.filter((ep) => {
      if (seriesFilter !== "todos" && ep.series !== seriesFilter) return false;
      if (!text) return true;
      return `${ep.title} ${ep.description} ${ep.tags.join(" ")} ${ep.series}`.toLowerCase().includes(text);
    });
  }, [episodes, search, seriesFilter]);

  const grouped = useMemo(() => {
    const map = new Map<string, PodcastEpisode[]>();
    filtered.forEach((ep) => { const cur = map.get(ep.series) ?? []; cur.push(ep); map.set(ep.series, cur); });
    return Array.from(map.entries()).map(([series, eps]) => ({ series, episodes: eps.sort((a, b) => a.order - b.order) }));
  }, [filtered]);

  const selected = useMemo(() => episodes.find((e) => e.id === selectedId) ?? episodes[0], [episodes, selectedId]);
  const selectedProgress = selected ? progressMap[selected.id] : undefined;

  const completedStats = useMemo(() => {
    const done = Object.values(progressMap).filter((p) => p.completed).length;
    return { done, percent: episodes.length ? Math.round((done / episodes.length) * 100) : 0 };
  }, [progressMap, episodes.length]);

  // ── load ─────────────────────────────────────────────────────────────────────
  useEffect(() => { void fetchEpisodes(); void loadRole(); }, []);

  useEffect(() => {
    try {
      const rp = window.localStorage.getItem(PROGRESS_KEY);
      if (rp) setProgressMap(JSON.parse(rp) as Record<string, EpisodeProgress>);
      const rn = window.localStorage.getItem(NOTES_KEY);
      if (rn) setNotesMap(JSON.parse(rn) as Record<string, string>);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { window.localStorage.setItem(PROGRESS_KEY, JSON.stringify(progressMap)); }, [progressMap]);
  useEffect(() => { window.localStorage.setItem(NOTES_KEY, JSON.stringify(notesMap)); }, [notesMap]);

  useEffect(() => {
    if (!selected) return;
    setNotesDraft(notesMap[selected.id] ?? "");
    setSaveFeedback("");
  }, [notesMap, selected]);

  useEffect(() => {
    if (!selected) return;
    if (!filtered.some((e) => e.id === selected.id) && filtered[0]) setSelectedId(filtered[0].id);
  }, [filtered, selected]);

  async function fetchEpisodes() {
    setLoading(true);
    try {
      const res = await fetch("/api/podcasts");
      const payload = (await res.json()) as { data?: RawPodcastEpisode[] };
      const data: PodcastEpisode[] = (payload.data ?? []).map((episode) => ({
        ...episode,
        sourceType: episode.sourceType === "youtube" ? "youtube" : "direct"
      }));
      setEpisodes(data);
      if (data[0] && !selectedId) setSelectedId(data[0].id);
    } finally {
      setLoading(false);
    }
  }

  async function loadRole() {
    try {
      const res = await fetch("/api/auth/me");
      if (!res.ok) return;
      const p = (await res.json()) as { data?: { role?: "ADMIN" | "STUDENT" } };
      setRole(p.data?.role ?? null);
    } catch { /* ignore */ }
  }

  // ── progress / notes ──────────────────────────────────────────────────────────
  function updateProgress(id: string, listened: number, duration: number, done?: boolean) {
    setProgressMap((cur) => {
      const prev = cur[id];
      return {
        ...cur,
        [id]: {
          listenedSeconds: Math.max(prev?.listenedSeconds ?? 0, listened),
          durationSeconds: Math.max(duration, prev?.durationSeconds ?? 0),
          completed: done ?? prev?.completed ?? false,
          updatedAt: new Date().toISOString()
        }
      };
    });
  }

  function saveNotes() {
    if (!selected) return;
    setNotesMap((cur) => ({ ...cur, [selected.id]: notesDraft.trim() }));
    setSaveFeedback("Anotações salvas.");
    setTimeout(() => setSaveFeedback(""), 1800);
  }

  // ── admin CRUD ────────────────────────────────────────────────────────────────
  function openNew() {
    setFormData(EMPTY_FORM);
    setEditingId(null);
    setFormError(null);
    setShowForm(true);
  }

  function openEdit(ep: PodcastEpisode) {
    setFormData({
      series: ep.series, order: String(ep.order), title: ep.title, host: ep.host, level: ep.level,
      durationLabel: ep.durationLabel, publishedLabel: ep.publishedLabel, description: ep.description,
      tags: ep.tags.join(", "), coverImage: ep.coverImage, sourceUrl: ep.sourceUrl, sourceType: ep.sourceType
    });
    setEditingId(ep.id);
    setFormError(null);
    setShowForm(true);
  }

  async function saveEpisode() {
    if (!formData.title.trim() || !formData.series.trim()) {
      setFormError("Série e título são obrigatórios.");
      return;
    }
    setFormSaving(true);
    setFormError(null);
    try {
      const body = { ...formData, order: Number(formData.order) || 0, tags: formData.tags.split(",").map((t) => t.trim()).filter(Boolean) };
      const url = editingId ? `/api/podcasts/${editingId}` : "/api/podcasts";
      const method = editingId ? "PUT" : "POST";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const payload = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(payload.error ?? "Erro ao salvar episódio.");
      setShowForm(false);
      await fetchEpisodes();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Erro inesperado.");
    } finally {
      setFormSaving(false);
    }
  }

  async function deleteEpisode(id: string) {
    if (!confirm("Remover este episódio?")) return;
    setDeletingId(id);
    try {
      await fetch(`/api/podcasts/${id}`, { method: "DELETE" });
      await fetchEpisodes();
    } finally {
      setDeletingId(null);
    }
  }

  // ── render ────────────────────────────────────────────────────────────────────
  if (loading) {
    return <Card><p className="text-sm text-moss-600">Carregando catálogo de podcasts...</p></Card>;
  }

  if (!selected) {
    return (
      <Card className="space-y-3">
        <p className="text-sm text-moss-600">Nenhum episódio cadastrado ainda.</p>
        {role === "ADMIN" && (
          <Button type="button" onClick={openNew}><Plus className="mr-1 h-4 w-4" />Adicionar primeiro episódio</Button>
        )}
      </Card>
    );
  }

  return (
    <section className="space-y-5">
      {/* hero */}
      <Card className="forest-shell overflow-hidden border-none bg-gradient-to-br from-sand-800 via-moss-800 to-moss-900 text-sand-50">
        <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
          <div className="space-y-3">
            <p className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs uppercase tracking-[0.12em]">
              <Sparkles className="h-3.5 w-3.5" />
              AVA Podcasts
            </p>
            <h2 className="font-[var(--font-cormorant)] text-4xl font-semibold leading-tight sm:text-5xl">
              Biblioteca de podcasts para estudo e reflexão musical
            </h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            <div className="rounded-2xl border border-white/15 bg-white/10 p-3">
              <p className="text-xs uppercase tracking-[0.12em] text-sand-200">Episódios</p>
              <p className="mt-1 text-2xl font-semibold">{episodes.length}</p>
            </div>
            <div className="rounded-2xl border border-white/15 bg-white/10 p-3">
              <p className="text-xs uppercase tracking-[0.12em] text-sand-200">Séries</p>
              <p className="mt-1 text-2xl font-semibold">{seriesOptions.length - 1}</p>
            </div>
            <div className="rounded-2xl border border-white/15 bg-white/10 p-3">
              <p className="text-xs uppercase tracking-[0.12em] text-sand-200">Progresso</p>
              <p className="mt-1 text-2xl font-semibold">{completedStats.percent}%</p>
            </div>
          </div>
        </div>
      </Card>

      {/* admin form */}
      {role === "ADMIN" && showForm && (
        <Card className="space-y-4 border-moss-300">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-moss-900">{editingId ? "Editar episódio" : "Novo episódio"}</h3>
            <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>Fechar</Button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label>
              <span className="text-xs text-moss-600">Série *</span>
              <Input value={formData.series} onChange={(e) => setFormData((f) => ({ ...f, series: e.target.value }))} placeholder="Ex.: Fundamentos do Hinário" />
            </label>
            <label>
              <span className="text-xs text-moss-600">Ordem</span>
              <Input type="number" min={0} value={formData.order} onChange={(e) => setFormData((f) => ({ ...f, order: e.target.value }))} />
            </label>
            <label className="sm:col-span-2">
              <span className="text-xs text-moss-600">Título *</span>
              <Input value={formData.title} onChange={(e) => setFormData((f) => ({ ...f, title: e.target.value }))} placeholder="Título do episódio" />
            </label>
            <label>
              <span className="text-xs text-moss-600">Apresentador</span>
              <Input value={formData.host} onChange={(e) => setFormData((f) => ({ ...f, host: e.target.value }))} />
            </label>
            <label>
              <span className="text-xs text-moss-600">Nível</span>
              <Select value={formData.level} onChange={(e) => setFormData((f) => ({ ...f, level: e.target.value }))}>
                <option value="iniciante">Iniciante</option>
                <option value="intermediario">Intermediário</option>
                <option value="avancado">Avançado</option>
              </Select>
            </label>
            <label className="sm:col-span-2">
              <span className="text-xs text-moss-600">URL de origem (MP3, YouTube ou vazio)</span>
              <Input value={formData.sourceUrl} onChange={(e) => setFormData((f) => ({ ...f, sourceUrl: e.target.value }))} placeholder="https://..." />
            </label>
            <label>
              <span className="text-xs text-moss-600">Tipo de fonte</span>
              <Select value={formData.sourceType} onChange={(e) => setFormData((f) => ({ ...f, sourceType: e.target.value }))}>
                <option value="direct">Link direto (MP3/áudio)</option>
                <option value="youtube">YouTube</option>
              </Select>
            </label>
            <label>
              <span className="text-xs text-moss-600">Duração (ex.: 42:30)</span>
              <Input value={formData.durationLabel} onChange={(e) => setFormData((f) => ({ ...f, durationLabel: e.target.value }))} />
            </label>
            <label>
              <span className="text-xs text-moss-600">Data de publicação</span>
              <Input value={formData.publishedLabel} onChange={(e) => setFormData((f) => ({ ...f, publishedLabel: e.target.value }))} placeholder="Jan 2025" />
            </label>
            <label>
              <span className="text-xs text-moss-600">URL da capa</span>
              <Input value={formData.coverImage} onChange={(e) => setFormData((f) => ({ ...f, coverImage: e.target.value }))} placeholder="https://..." />
            </label>
            <label>
              <span className="text-xs text-moss-600">Tags (separadas por vírgula)</span>
              <Input value={formData.tags} onChange={(e) => setFormData((f) => ({ ...f, tags: e.target.value }))} placeholder="teoria, hino, iniciante" />
            </label>
            <label className="sm:col-span-2">
              <span className="text-xs text-moss-600">Descrição</span>
              <TextArea rows={2} value={formData.description} onChange={(e) => setFormData((f) => ({ ...f, description: e.target.value }))} />
            </label>
          </div>
          {formError && <p className="text-sm text-red-600">{formError}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>Cancelar</Button>
            <Button type="button" onClick={() => void saveEpisode()} disabled={formSaving}>
              {formSaving ? "Salvando..." : editingId ? "Salvar alterações" : "Cadastrar episódio"}
            </Button>
          </div>
        </Card>
      )}

      <div className="grid gap-5 xl:grid-cols-[1.45fr_1fr]">
        {/* player + notes */}
        <div className="space-y-5">
          <Card className="space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.12em] text-moss-500">{selected.series}</p>
                <h2 className="font-[var(--font-cormorant)] text-3xl font-semibold text-moss-900">{selected.title}</h2>
                <p className="text-sm text-moss-600">{selected.description}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="bg-moss-100 text-moss-700">{selected.host}</Badge>
                {selected.publishedLabel && <Badge className="bg-sand-100 text-sand-800">{selected.publishedLabel}</Badge>}
                {role === "ADMIN" && (
                  <>
                    <Button type="button" variant="soft" onClick={() => openEdit(selected)}>Editar</Button>
                    <Button type="button" variant="ghost" onClick={() => void deleteEpisode(selected.id)} disabled={deletingId === selected.id}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </>
                )}
              </div>
            </div>

            {selected.sourceUrl ? (
              <CompletePodcastPlayer
                episode={selected}
                startAtSeconds={selectedProgress?.listenedSeconds ?? 0}
                onProgress={({ currentTime, duration }) => updateProgress(selected.id, currentTime, duration)}
                onEnded={() => updateProgress(selected.id, selectedProgress?.listenedSeconds ?? 0, selectedProgress?.durationSeconds ?? 0, true)}
              />
            ) : (
              <div className="flex items-center justify-center rounded-2xl border border-dashed border-sand-300 bg-sand-50 p-10 text-center">
                <div>
                  <Mic2 className="mx-auto mb-2 h-8 w-8 text-moss-400" />
                  <p className="text-sm font-medium text-moss-700">Link do episódio ainda não configurado</p>
                  {role === "ADMIN" && (
                    <Button type="button" variant="soft" className="mt-3" onClick={() => openEdit(selected)}>
                      Adicionar link agora
                    </Button>
                  )}
                </div>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2">
              {selected.tags.map((tag) => (
                <Badge key={tag} className="bg-moss-50 text-moss-700">#{tag}</Badge>
              ))}
              <Button type="button" variant="soft" className="ml-auto"
                onClick={() => updateProgress(selected.id, selectedProgress?.listenedSeconds ?? 0, selectedProgress?.durationSeconds ?? 0, true)}>
                <CircleCheckBig className="mr-1 h-4 w-4" />Marcar concluído
              </Button>
            </div>
          </Card>

          <Card className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-lg font-semibold text-moss-900">Anotações do episódio</h3>
              {saveFeedback && <p className="text-xs text-moss-600">{saveFeedback}</p>}
            </div>
            <TextArea rows={5} placeholder="Resumo, ideias principais e pontos para aplicar no estudo." value={notesDraft} onChange={(e) => setNotesDraft(e.target.value)} />
            <div className="flex justify-end">
              <Button type="button" onClick={saveNotes}>Salvar anotações</Button>
            </div>
          </Card>
        </div>

        {/* sidebar */}
        <div className="space-y-5">
          <Card className="space-y-3 xl:sticky xl:top-24">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-lg font-semibold text-moss-900">Catálogo de podcasts</h3>
              {role === "ADMIN" && (
                <Button type="button" variant="soft" onClick={openNew}><Plus className="mr-1 h-4 w-4" />Novo episódio</Button>
              )}
            </div>

            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-moss-500" />
                <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar episódio..." className="pl-8" />
              </div>
              <Select value={seriesFilter} onChange={(e) => setSeriesFilter(e.target.value)}>
                {seriesOptions.map((s) => <option key={s} value={s}>{s === "todos" ? "Todas as séries" : s}</option>)}
              </Select>
            </div>

            <div className="space-y-3">
              {grouped.map(({ series, episodes: eps }) => (
                <div key={series} className="space-y-2">
                  <p className="text-xs uppercase tracking-[0.12em] text-moss-500">{series}</p>
                  {eps.map((ep) => {
                    const prog = progressMap[ep.id];
                    const pct = getProgressPercent(prog);
                    const isSel = selected.id === ep.id;
                    return (
                      <button key={ep.id} type="button" onClick={() => setSelectedId(ep.id)}
                        className={`w-full rounded-2xl border p-2 text-left transition ${isSel ? "border-moss-500 bg-moss-50 shadow-sm" : "border-moss-100 bg-white hover:border-moss-300 hover:bg-moss-50/40"}`}>
                        <div className="flex items-start gap-3">
                          <div className="h-14 w-14 shrink-0 rounded-lg bg-cover bg-center bg-sand-200"
                            style={ep.coverImage ? { backgroundImage: `url(${ep.coverImage})` } : {}} />
                          <div className="min-w-0 flex-1">
                            <p className="line-clamp-2 text-sm font-semibold text-moss-900">{ep.title}</p>
                            <p className="mt-0.5 text-xs text-moss-600">Ep. {ep.order} · {ep.durationLabel}</p>
                            <div className="mt-1 h-1.5 w-full rounded-full bg-sand-200">
                              <div className="h-1.5 rounded-full bg-moss-600" style={{ width: `${pct}%` }} />
                            </div>
                            {!ep.sourceUrl && <p className="mt-0.5 text-[11px] text-amber-600">Aguardando link</p>}
                          </div>
                        </div>
                        <div className="mt-1.5 flex items-center justify-between text-xs text-moss-600">
                          <span>{pct}% ouvido</span>
                          {prog?.completed ? (
                            <span className="inline-flex items-center gap-1 text-moss-700"><CircleCheckBig className="h-3.5 w-3.5" />Concluído</span>
                          ) : (
                            <span className="inline-flex items-center gap-1"><Clock3 className="h-3.5 w-3.5" />Em andamento</span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              ))}
              {!grouped.length && <p className="text-sm text-moss-600">Nenhum episódio encontrado.</p>}
            </div>
          </Card>
        </div>
      </div>
    </section>
  );
}
