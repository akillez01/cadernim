"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Badge, Button, Card, Input, Select } from "@cadernim/ui";

type Hymn = {
  id: string;
  title: string;
  number: number;
  author: string;
  originalKey: string;
  defaultBpm: number;
  timeSignature: string;
  category: string;
  tags: string[];
};

type PracticeRecord = { hymnId: string; title: string; seconds: number };
type AlbumLibraryItem = { key: string; name: string; hymns: Hymn[] };

const FAVORITES_KEY = "cadernim:favorites";
const PRACTICE_PREFIX = "cadernim:practice-time:";

function normalizeLabel(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function loadFavorites(): Set<string> {
  try {
    const raw = window.localStorage.getItem(FAVORITES_KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

function saveFavorites(favs: Set<string>) {
  try { window.localStorage.setItem(FAVORITES_KEY, JSON.stringify(Array.from(favs))); } catch {}
}

function loadAllPractice(hymnIds: string[]): PracticeRecord[] {
  return hymnIds
    .map((id) => {
      try {
        const secs = parseInt(window.localStorage.getItem(`${PRACTICE_PREFIX}${id}`) ?? "0", 10);
        return { hymnId: id, title: "", seconds: isNaN(secs) ? 0 : secs };
      } catch { return { hymnId: id, title: "", seconds: 0 }; }
    })
    .filter((r) => r.seconds > 0);
}

function formatSeconds(s: number) {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h}h ${m}min`;
  if (m > 0) return `${m}min`;
  return `${s}s`;
}

function StarButton({ active, onClick }: { active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); onClick(); }}
      className={`text-xl leading-none transition-colors ${active ? "text-amber-400" : "text-moss-300 hover:text-amber-300"}`}
      title={active ? "Remover dos favoritos" : "Adicionar aos favoritos"}
      aria-label={active ? "Remover dos favoritos" : "Adicionar aos favoritos"}
    >
      {active ? "★" : "☆"}
    </button>
  );
}

export function HymnDashboard() {
  const [hymns, setHymns] = useState<Hymn[]>([]);
  const [role, setRole] = useState<"ADMIN" | "STUDENT" | null>(null);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [tag, setTag] = useState("");
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [practiceRecords, setPracticeRecords] = useState<PracticeRecord[]>([]);
  const [statsLoaded, setStatsLoaded] = useState(false);
  const [expandedAlbumKeys, setExpandedAlbumKeys] = useState<string[]>([]);

  const categories = useMemo(() => Array.from(new Set(hymns.map((h) => h.category))).sort(), [hymns]);
  const tags = useMemo(() => Array.from(new Set(hymns.flatMap((h) => h.tags))).sort(), [hymns]);
  const albums = useMemo(() => {
    const grouped = new Map<string, AlbumLibraryItem>();

    hymns.forEach((hymn) => {
      const tagsNormalized = hymn.tags.map((item) => normalizeLabel(item));
      const byOracaoRule =
        normalizeLabel(hymn.category) === "oracao" ||
        tagsNormalized.includes("oracao") ||
        hymn.id.startsWith("oracao-");
      const key = byOracaoRule ? "oracao" : normalizeLabel(hymn.category || "geral");
      const name = key === "oracao" ? "Oração" : hymn.category || "Geral";

      const current = grouped.get(key);
      if (!current) {
        grouped.set(key, { key, name, hymns: [hymn] });
        return;
      }
      current.hymns.push(hymn);
    });

    return Array.from(grouped.values())
      .map((album) => ({
        ...album,
        hymns: album.hymns.sort((a, b) => (a.number - b.number) || a.title.localeCompare(b.title, "pt-BR"))
      }))
      .sort((a, b) => {
        if (a.key === "oracao") return -1;
        if (b.key === "oracao") return 1;
        return a.name.localeCompare(b.name, "pt-BR");
      });
  }, [hymns]);
  const createAlbumHref = useMemo(
    () => (albums.some((album) => album.key === "oracao") ? "/booklets?album=oracao" : "/booklets"),
    [albums]
  );

  const displayedHymns = useMemo(
    () => (showFavoritesOnly ? hymns.filter((h) => favorites.has(h.id)) : hymns),
    [hymns, showFavoritesOnly, favorites]
  );

  const totalPracticeSeconds = useMemo(
    () => practiceRecords.reduce((acc, r) => acc + r.seconds, 0),
    [practiceRecords]
  );

  const topPracticed = useMemo(() => {
    const withTitles = practiceRecords
      .map((r) => {
        const hymn = hymns.find((h) => h.id === r.hymnId);
        return hymn ? { ...r, title: hymn.title } : null;
      })
      .filter(Boolean) as PracticeRecord[];
    return withTitles.sort((a, b) => b.seconds - a.seconds).slice(0, 3);
  }, [practiceRecords, hymns]);

  // Load favorites from localStorage on mount
  useEffect(() => {
    setFavorites(loadFavorites());
  }, []);

  // Load practice stats once hymns are available
  useEffect(() => {
    if (!hymns.length || statsLoaded) return;
    const records = loadAllPractice(hymns.map((h) => h.id));
    setPracticeRecords(records);
    setStatsLoaded(true);
  }, [hymns, statsLoaded]);

  useEffect(() => {
    const timeout = setTimeout(() => { void fetchHymns(); }, 180);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, category, tag]);

  useEffect(() => {
    let mounted = true;
    async function loadRole() {
      try {
        const response = await fetch("/api/auth/me");
        if (!response.ok) { if (mounted) setRole(null); return; }
        const payload = (await response.json()) as { data?: { role?: "ADMIN" | "STUDENT" } };
        if (mounted) setRole(payload.data?.role ?? null);
      } catch { if (mounted) setRole(null); }
    }
    void loadRole();
    return () => { mounted = false; };
  }, []);

  async function fetchHymns() {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (category) params.set("category", category);
    if (tag) params.set("tag", tag);
    const response = await fetch(`/api/hymns?${params.toString()}`);
    const data = await response.json();
    setHymns(data.data ?? []);
    setLoading(false);
  }

  function toggleFavorite(hymnId: string) {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(hymnId)) next.delete(hymnId);
      else next.add(hymnId);
      saveFavorites(next);
      return next;
    });
  }

  function toggleAlbum(key: string) {
    setExpandedAlbumKeys((current) =>
      current.includes(key) ? current.filter((item) => item !== key) : [...current, key]
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">

      {/* ── Stats panel (#10) ────────────────────────── */}
      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="flex items-center gap-3">
          <span className="text-2xl">📚</span>
          <div>
            <p className="text-xs uppercase tracking-wide text-moss-500">Biblioteca</p>
            <p className="text-lg font-semibold text-moss-900">{loading ? "…" : `${hymns.length} hinos`}</p>
          </div>
        </Card>
        <Card className="flex items-center gap-3">
          <span className="text-2xl">★</span>
          <div>
            <p className="text-xs uppercase tracking-wide text-moss-500">Favoritos</p>
            <p className="text-lg font-semibold text-moss-900">{favorites.size} marcados</p>
          </div>
        </Card>
        <Card className="flex items-center gap-3">
          <span className="text-2xl">⏱</span>
          <div>
            <p className="text-xs uppercase tracking-wide text-moss-500">Tempo total de prática</p>
            <p className="text-lg font-semibold text-moss-900">
              {totalPracticeSeconds > 0 ? formatSeconds(totalPracticeSeconds) : "Nenhum ainda"}
            </p>
          </div>
        </Card>
      </div>

      {topPracticed.length > 0 && (
        <Card>
          <p className="mb-2 text-xs uppercase tracking-wide text-moss-500">Hinos mais praticados</p>
          <div className="flex flex-wrap gap-2">
            {topPracticed.map((r) => (
              <Badge key={r.hymnId} className="bg-moss-50 text-moss-700">
                {r.title} · {formatSeconds(r.seconds)}
              </Badge>
            ))}
          </div>
        </Card>
      )}

      {albums.length > 0 && (
        <Card className="space-y-4 border-moss-200 bg-gradient-to-br from-moss-50/80 to-sand-50/80">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.12em] text-moss-500">Biblioteca</p>
              <h2 className="text-xl font-semibold text-moss-900">Álbuns</h2>
              <p className="text-sm text-moss-700">Organize por coleções e clique para abrir a lista de hinos.</p>
            </div>
            <Link href={createAlbumHref}>
              <Button className="w-full sm:w-auto">Criar álbum</Button>
            </Link>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {albums.map((album) => {
              const expanded = expandedAlbumKeys.includes(album.key);
              return (
                <Card key={album.key} className="border-moss-100 bg-white">
                  <button
                    type="button"
                    onClick={() => toggleAlbum(album.key)}
                    className="flex w-full items-start justify-between gap-3 text-left"
                  >
                    <div>
                      <p className="text-xs uppercase tracking-wide text-moss-500">Álbum</p>
                      <h3 className="text-lg font-semibold text-moss-900">{album.name}</h3>
                      <p className="text-sm text-moss-600">{album.hymns.length} hinos</p>
                    </div>
                    <Badge className="bg-moss-50 text-moss-700">{expanded ? "Fechar" : "Abrir"}</Badge>
                  </button>

                  {expanded && (
                    <div className="mt-3 space-y-2 border-t border-moss-100 pt-3">
                      {album.hymns.map((hymn) => (
                        <Link key={hymn.id} href={`/hymns/${hymn.id}`} className="flex items-center justify-between rounded-lg bg-sand-50 px-2 py-1.5 text-sm text-moss-800 hover:bg-sand-100">
                          <span>#{hymn.number} {hymn.title}</span>
                          <span className="text-xs text-moss-500">{hymn.originalKey}</span>
                        </Link>
                      ))}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        </Card>
      )}

      {/* ── Search + filters (#8 — always visible) ──── */}
      <Card className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Input
          placeholder="Buscar por título ou autor"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="sm:col-span-2 lg:col-span-2"
          autoFocus
        />
        <Select value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="">Todas categorias</option>
          {categories.map((item) => <option key={item} value={item}>{item}</option>)}
        </Select>
        <Select value={tag} onChange={(e) => setTag(e.target.value)}>
          <option value="">Todas tags</option>
          {tags.map((item) => <option key={item} value={item}>{item}</option>)}
        </Select>
        {role === "ADMIN" ? (
          <Link href="/hymns/new" className="sm:justify-self-end lg:justify-self-end">
            <Button className="w-full sm:w-auto">Adicionar Hino</Button>
          </Link>
        ) : (
          <div className="sm:justify-self-end lg:justify-self-end">
            <Button className="w-full sm:w-auto" variant="ghost" disabled>Cadastro (admin)</Button>
          </div>
        )}
      </Card>

      {/* ── Favorites toggle (#5) ────────────────────── */}
      <div className="flex flex-wrap items-center gap-3 px-1">
        <p className="text-xs uppercase tracking-[0.12em] text-moss-500">
          {loading ? "Atualizando biblioteca..." : `${displayedHymns.length} hinos`}
        </p>
        <button
          type="button"
          onClick={() => setShowFavoritesOnly((v) => !v)}
          className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
            showFavoritesOnly
              ? "bg-amber-100 text-amber-800"
              : "bg-moss-50 text-moss-600 hover:bg-moss-100"
          }`}
        >
          ★ {showFavoritesOnly ? "Mostrando favoritos" : "Mostrar favoritos"}
        </button>
      </div>

      {loading ? (
        <Card><p className="text-sm text-moss-600">Carregando biblioteca...</p></Card>
      ) : displayedHymns.length === 0 ? (
        <Card>
          <p className="text-sm text-moss-600">
            {showFavoritesOnly ? "Nenhum favorito ainda. Clique na ★ em qualquer hino para favoritar." : "Nenhum hino encontrado."}
          </p>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-3">
          {displayedHymns.map((hymn) => {
            const practiceTime = practiceRecords.find((r) => r.hymnId === hymn.id)?.seconds ?? 0;
            return (
              <Card key={hymn.id} className="flex h-full flex-col gap-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-moss-500">Hino #{hymn.number}</p>
                    <h3 className="text-base font-semibold text-moss-900 sm:text-lg">{hymn.title}</h3>
                    <p className="text-sm text-moss-600">{hymn.author}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <StarButton active={favorites.has(hymn.id)} onClick={() => toggleFavorite(hymn.id)} />
                    <Badge>{hymn.category}</Badge>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 rounded-xl bg-sand-50 p-3 text-sm text-moss-700">
                  <div>
                    <p className="text-xs text-moss-500">Tom</p>
                    <p className="font-medium">{hymn.originalKey}</p>
                  </div>
                  <div>
                    <p className="text-xs text-moss-500">BPM</p>
                    <p className="font-medium">{hymn.defaultBpm}</p>
                  </div>
                  <div>
                    <p className="text-xs text-moss-500">Compasso</p>
                    <p className="font-medium">{hymn.timeSignature}</p>
                  </div>
                </div>

                {practiceTime > 0 && (
                  <p className="text-xs text-moss-500">⏱ {formatSeconds(practiceTime)} praticado</p>
                )}

                <div className="flex flex-wrap gap-2">
                  {hymn.tags.map((item) => (
                    <Badge key={item} className="bg-moss-50 text-moss-600">{item}</Badge>
                  ))}
                </div>

                <Link href={`/hymns/${hymn.id}`} className="mt-auto">
                  <Button className="w-full">Abrir Estudo</Button>
                </Link>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
