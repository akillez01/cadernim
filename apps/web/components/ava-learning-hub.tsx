"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { BookOpenCheck, CircleCheckBig, Clock3, Download, ExternalLink, Filter, Plus, Search, Sparkles, Trash2 } from "lucide-react";
import { Badge, Button, Card, Input, Select, TextArea } from "@cadernim/ui";
import { CompleteVideoPlayer } from "@/components/complete-video-player";
import type { VideoSourceType } from "@/lib/ava-catalog";

const AVA_CHANNEL_URL = "https://www.youtube.com/@rafaelmendoncaviolao/videos";

type Material = { label: string; url: string };

type VideoLesson = {
  id: string;
  module: string;
  order: number;
  title: string;
  teacher: string;
  level: string;
  durationLabel: string;
  description: string;
  tags: string[];
  thumbnail: string;
  sourceUrl: string;
  sourceType: VideoSourceType;
  materials?: Material[];
  createdAt: string;
  updatedAt: string;
};

type RawVideoLesson = Omit<VideoLesson, "sourceType" | "materials"> & {
  sourceType?: string;
  materials?: Material[] | null;
};

type LessonProgress = {
  watchedSeconds: number;
  durationSeconds: number;
  completed: boolean;
  updatedAt: string;
};

const PROGRESS_KEY = "cadernim:ava-progress:v1";
const NOTES_KEY = "cadernim:ava-notes:v1";

function getProgressPercent(p?: LessonProgress) {
  if (!p || p.durationSeconds <= 0) return 0;
  return Math.min(100, Math.round((p.watchedSeconds / p.durationSeconds) * 100));
}

const EMPTY_FORM = {
  module: "",
  order: "0",
  title: "",
  teacher: "Rafael Mendonca",
  level: "iniciante",
  durationLabel: "YouTube",
  description: "",
  tags: "",
  thumbnail: "",
  sourceUrl: "",
  sourceType: "youtube"
};

export function AvaLearningHub() {
  const [lessons, setLessons] = useState<VideoLesson[]>([]);
  const [lessonsLoading, setLessonsLoading] = useState(true);
  const [role, setRole] = useState<"ADMIN" | "STUDENT" | null>(null);

  const [selectedId, setSelectedId] = useState("");
  const [search, setSearch] = useState("");
  const [moduleFilter, setModuleFilter] = useState("todos");

  const [progressMap, setProgressMap] = useState<Record<string, LessonProgress>>({});
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

  const modules = useMemo(() => ["todos", ...Array.from(new Set(lessons.map((l) => l.module)))], [lessons]);

  const filtered = useMemo(() => {
    const text = search.trim().toLowerCase();
    return lessons.filter((l) => {
      if (moduleFilter !== "todos" && l.module !== moduleFilter) return false;
      if (!text) return true;
      return `${l.title} ${l.description} ${l.tags.join(" ")} ${l.module}`.toLowerCase().includes(text);
    });
  }, [lessons, search, moduleFilter]);

  const grouped = useMemo(() => {
    const map = new Map<string, VideoLesson[]>();
    filtered.forEach((l) => { const cur = map.get(l.module) ?? []; cur.push(l); map.set(l.module, cur); });
    return Array.from(map.entries()).map(([module, ls]) => ({ module, lessons: ls.sort((a, b) => a.order - b.order) }));
  }, [filtered]);

  const selected = useMemo(() => lessons.find((l) => l.id === selectedId) ?? lessons[0], [lessons, selectedId]);
  const selectedProgress = selected ? progressMap[selected.id] : undefined;

  const completionStats = useMemo(() => {
    const done = Object.values(progressMap).filter((p) => p.completed).length;
    return { done, percent: lessons.length ? Math.round((done / lessons.length) * 100) : 0 };
  }, [progressMap, lessons.length]);

  // ── load ─────────────────────────────────────────────────────────────────────
  useEffect(() => { void fetchLessons(); void loadRole(); }, []);

  useEffect(() => {
    try {
      const rp = window.localStorage.getItem(PROGRESS_KEY);
      if (rp) setProgressMap(JSON.parse(rp) as Record<string, LessonProgress>);
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
    if (!filtered.some((l) => l.id === selected.id) && filtered[0]) setSelectedId(filtered[0].id);
  }, [filtered, selected]);

  async function fetchLessons() {
    setLessonsLoading(true);
    try {
      const res = await fetch("/api/ava");
      const payload = (await res.json()) as { data?: RawVideoLesson[] };
      const data: VideoLesson[] = (payload.data ?? []).map((lesson) => ({
        ...lesson,
        sourceType: lesson.sourceType === "direct" ? "direct" : "youtube",
        materials: Array.isArray(lesson.materials) ? lesson.materials : undefined
      }));
      setLessons(data);
      if (data[0] && !selectedId) setSelectedId(data[0].id);
    } finally {
      setLessonsLoading(false);
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
  function updateProgress(id: string, watched: number, duration: number, done?: boolean) {
    setProgressMap((cur) => {
      const prev = cur[id];
      return {
        ...cur,
        [id]: {
          watchedSeconds: Math.max(prev?.watchedSeconds ?? 0, watched),
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
    setSaveFeedback("Anotacoes salvas.");
    setTimeout(() => setSaveFeedback(""), 1800);
  }

  // ── admin CRUD ────────────────────────────────────────────────────────────────
  function openNew() {
    setFormData(EMPTY_FORM);
    setEditingId(null);
    setFormError(null);
    setShowForm(true);
  }

  function openEdit(lesson: VideoLesson) {
    setFormData({
      module: lesson.module,
      order: String(lesson.order),
      title: lesson.title,
      teacher: lesson.teacher,
      level: lesson.level,
      durationLabel: lesson.durationLabel,
      description: lesson.description,
      tags: lesson.tags.join(", "),
      thumbnail: lesson.thumbnail,
      sourceUrl: lesson.sourceUrl,
      sourceType: lesson.sourceType
    });
    setEditingId(lesson.id);
    setFormError(null);
    setShowForm(true);
  }

  async function saveLesson() {
    if (!formData.title.trim() || !formData.module.trim() || !formData.sourceUrl.trim()) {
      setFormError("Modulo, titulo e URL de origem sao obrigatorios.");
      return;
    }
    setFormSaving(true);
    setFormError(null);
    try {
      const body = {
        ...formData,
        order: Number(formData.order) || 0,
        tags: formData.tags.split(",").map((t) => t.trim()).filter(Boolean)
      };
      const url = editingId ? `/api/ava/${editingId}` : "/api/ava";
      const method = editingId ? "PUT" : "POST";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const payload = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(payload.error ?? "Erro ao salvar aula.");
      setShowForm(false);
      await fetchLessons();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Erro inesperado.");
    } finally {
      setFormSaving(false);
    }
  }

  async function deleteLesson(id: string) {
    if (!confirm("Remover esta aula?")) return;
    setDeletingId(id);
    try {
      await fetch(`/api/ava/${id}`, { method: "DELETE" });
      await fetchLessons();
      if (selected?.id === id && lessons[0]) setSelectedId(lessons[0].id);
    } finally {
      setDeletingId(null);
    }
  }

  // ── render ────────────────────────────────────────────────────────────────────
  if (lessonsLoading) {
    return <Card><p className="text-sm text-moss-600">Carregando catalogo de videoaulas...</p></Card>;
  }

  if (!selected) {
    return (
      <Card className="space-y-3">
        <p className="text-sm text-moss-600">Nenhuma aula cadastrada ainda.</p>
        {role === "ADMIN" && (
          <Button type="button" onClick={openNew}><Plus className="mr-1 h-4 w-4" />Adicionar primeira aula</Button>
        )}
      </Card>
    );
  }

  return (
    <section className="space-y-5">
      {/* hero */}
      <Card className="forest-shell overflow-hidden border-none bg-gradient-to-br from-moss-900 via-moss-800 to-sand-800 text-sand-50">
        <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
          <div className="space-y-3">
            <p className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs uppercase tracking-[0.12em]">
              <Sparkles className="h-3.5 w-3.5" />
              AVA Escola da Floresta
            </p>
            <h2 className="font-[var(--font-cormorant)] text-4xl font-semibold leading-tight sm:text-5xl">
              Trilhas de videoaulas para estudo musical vivo
            </h2>
            <Link href={AVA_CHANNEL_URL} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium text-sand-50 transition hover:bg-white/20">
              Abrir canal principal
            </Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            <div className="rounded-2xl border border-white/15 bg-white/10 p-3">
              <p className="text-xs uppercase tracking-[0.12em] text-sand-200">Aulas</p>
              <p className="mt-1 text-2xl font-semibold">{lessons.length}</p>
            </div>
            <div className="rounded-2xl border border-white/15 bg-white/10 p-3">
              <p className="text-xs uppercase tracking-[0.12em] text-sand-200">Módulos</p>
              <p className="mt-1 text-2xl font-semibold">{modules.length - 1}</p>
            </div>
            <div className="rounded-2xl border border-white/15 bg-white/10 p-3">
              <p className="text-xs uppercase tracking-[0.12em] text-sand-200">Progresso</p>
              <p className="mt-1 text-2xl font-semibold">{completionStats.percent}%</p>
            </div>
          </div>
        </div>
      </Card>

      {/* admin form */}
      {role === "ADMIN" && showForm && (
        <Card className="space-y-4 border-moss-300">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-moss-900">{editingId ? "Editar aula" : "Nova aula"}</h3>
            <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>Fechar</Button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label>
              <span className="text-xs text-moss-600">Módulo *</span>
              <Input value={formData.module} onChange={(e) => setFormData((f) => ({ ...f, module: e.target.value }))} placeholder="Ex.: Video Aulas" />
            </label>
            <label>
              <span className="text-xs text-moss-600">Ordem</span>
              <Input type="number" min={0} value={formData.order} onChange={(e) => setFormData((f) => ({ ...f, order: e.target.value }))} />
            </label>
            <label className="sm:col-span-2">
              <span className="text-xs text-moss-600">Título *</span>
              <Input value={formData.title} onChange={(e) => setFormData((f) => ({ ...f, title: e.target.value }))} placeholder="Título da aula" />
            </label>
            <label>
              <span className="text-xs text-moss-600">Professor</span>
              <Input value={formData.teacher} onChange={(e) => setFormData((f) => ({ ...f, teacher: e.target.value }))} />
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
              <span className="text-xs text-moss-600">URL de origem * (YouTube ou link direto)</span>
              <Input value={formData.sourceUrl} onChange={(e) => setFormData((f) => ({ ...f, sourceUrl: e.target.value }))} placeholder="https://youtu.be/..." />
            </label>
            <label>
              <span className="text-xs text-moss-600">Tipo de fonte</span>
              <Select value={formData.sourceType} onChange={(e) => setFormData((f) => ({ ...f, sourceType: e.target.value }))}>
                <option value="youtube">YouTube</option>
                <option value="direct">Link direto</option>
              </Select>
            </label>
            <label>
              <span className="text-xs text-moss-600">Duração (ex.: 12:34 ou &quot;YouTube&quot;)</span>
              <Input value={formData.durationLabel} onChange={(e) => setFormData((f) => ({ ...f, durationLabel: e.target.value }))} />
            </label>
            <label>
              <span className="text-xs text-moss-600">URL da thumbnail</span>
              <Input value={formData.thumbnail} onChange={(e) => setFormData((f) => ({ ...f, thumbnail: e.target.value }))} placeholder="https://i.ytimg.com/vi/.../hqdefault.jpg" />
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
            <Button type="button" onClick={() => void saveLesson()} disabled={formSaving}>
              {formSaving ? "Salvando..." : editingId ? "Salvar alterações" : "Cadastrar aula"}
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
                <p className="text-xs uppercase tracking-[0.12em] text-moss-500">{selected.module}</p>
                <h2 className="font-[var(--font-cormorant)] text-3xl font-semibold text-moss-900">{selected.title}</h2>
                <p className="text-sm text-moss-600">{selected.description}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="bg-moss-100 text-moss-700">{selected.teacher}</Badge>
                <Badge className="bg-sand-100 text-sand-800">{selected.durationLabel}</Badge>
                {role === "ADMIN" && (
                  <>
                    <Button type="button" variant="soft" onClick={() => openEdit(selected)}>Editar</Button>
                    <Button type="button" variant="ghost" onClick={() => void deleteLesson(selected.id)} disabled={deletingId === selected.id}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </>
                )}
              </div>
            </div>

            <CompleteVideoPlayer
              lesson={selected}
              startAtSeconds={selectedProgress?.watchedSeconds ?? 0}
              onProgress={({ currentTime, duration }) => updateProgress(selected.id, currentTime, duration)}
              onEnded={() => updateProgress(selected.id, selectedProgress?.watchedSeconds ?? 0, selectedProgress?.durationSeconds ?? 0, true)}
            />

            <div className="flex flex-wrap items-center gap-2">
              {selected.tags.map((tag) => (
                <Badge key={tag} className="bg-moss-50 text-moss-700">#{tag}</Badge>
              ))}
              {selected.materials?.length ? (
                selected.materials.map((m) => (
                  <a key={m.label} href={m.url} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center rounded-xl border border-sand-300 bg-sand-200 px-4 py-2 text-sm font-medium text-moss-900 transition hover:bg-sand-300">
                    <Download className="mr-1 h-4 w-4" />{m.label}
                  </a>
                ))
              ) : null}
              <a href={selected.sourceUrl || AVA_CHANNEL_URL} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center rounded-xl border border-moss-200 bg-white px-4 py-2 text-sm font-medium text-moss-800 transition hover:bg-moss-50">
                <ExternalLink className="mr-1 h-4 w-4" />Curtir no YouTube
              </a>
              <Button type="button" variant="soft" className="ml-auto"
                onClick={() => updateProgress(selected.id, selectedProgress?.watchedSeconds ?? 0, selectedProgress?.durationSeconds ?? 0, true)}>
                <CircleCheckBig className="mr-1 h-4 w-4" />Marcar concluída
              </Button>
            </div>
          </Card>

          <Card className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-lg font-semibold text-moss-900">Anotações da aula</h3>
              {saveFeedback && <p className="text-xs text-moss-600">{saveFeedback}</p>}
            </div>
            <TextArea rows={5} placeholder="Pontos-chave, exercícios e observações para revisar depois." value={notesDraft} onChange={(e) => setNotesDraft(e.target.value)} />
            <div className="flex justify-end">
              <Button type="button" onClick={saveNotes}>Salvar anotações</Button>
            </div>
          </Card>
        </div>

        {/* sidebar catalog */}
        <div className="space-y-5">
          <Card className="space-y-3 xl:sticky xl:top-24">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-lg font-semibold text-moss-900">Catálogo de videoaulas</h3>
              {role === "ADMIN" && (
                <Button type="button" variant="soft" onClick={openNew}><Plus className="mr-1 h-4 w-4" />Nova aula</Button>
              )}
            </div>

            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-moss-500" />
                <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar aula..." className="pl-8" />
              </div>
              <div className="relative">
                <Filter className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-moss-500" />
                <Select value={moduleFilter} onChange={(e) => setModuleFilter(e.target.value)} className="pl-8">
                  {modules.map((m) => <option key={m} value={m}>{m === "todos" ? "Todos os módulos" : m}</option>)}
                </Select>
              </div>
            </div>

            <div className="space-y-3">
              {grouped.map(({ module, lessons: ls }) => (
                <div key={module} className="space-y-2">
                  <p className="text-xs uppercase tracking-[0.12em] text-moss-500">{module}</p>
                  {ls.map((lesson) => {
                    const prog = progressMap[lesson.id];
                    const pct = getProgressPercent(prog);
                    const isSel = selected.id === lesson.id;
                    return (
                      <button key={lesson.id} type="button" onClick={() => setSelectedId(lesson.id)}
                        className={`w-full rounded-2xl border p-2 text-left transition ${isSel ? "border-moss-500 bg-moss-50 shadow-sm" : "border-moss-100 bg-white hover:border-moss-300 hover:bg-moss-50/40"}`}>
                        <div className="flex items-start gap-3">
                          {lesson.thumbnail ? (
                            <div className="h-14 w-24 shrink-0 rounded-lg bg-cover bg-center bg-sand-100"
                              style={{ backgroundImage: `url(${lesson.thumbnail})` }} />
                          ) : (
                            <div className="h-14 w-24 shrink-0 rounded-lg bg-sand-200" />
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="line-clamp-2 text-sm font-semibold text-moss-900">{lesson.title}</p>
                            <p className="mt-0.5 text-xs text-moss-600">Aula {lesson.order} · {lesson.durationLabel}</p>
                            <div className="mt-1 h-1.5 w-full rounded-full bg-sand-200">
                              <div className="h-1.5 rounded-full bg-moss-600" style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        </div>
                        <div className="mt-1.5 flex items-center justify-between text-xs text-moss-600">
                          <span>{pct}% assistido</span>
                          {prog?.completed ? (
                            <span className="inline-flex items-center gap-1 text-moss-700"><BookOpenCheck className="h-3.5 w-3.5" />Concluída</span>
                          ) : (
                            <span className="inline-flex items-center gap-1"><Clock3 className="h-3.5 w-3.5" />Em andamento</span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              ))}
              {!grouped.length && <p className="text-sm text-moss-600">Nenhuma aula encontrada.</p>}
            </div>
          </Card>
        </div>
      </div>
    </section>
  );
}
