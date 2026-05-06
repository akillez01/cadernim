"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { normalizeKeyName, semitoneDistanceBetweenKeys, supportedKeys, transposeKeyBySemitones } from "@cadernim/music-engine";
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

type SelectionItem = {
  hymnId: string;
  title: string;
  number: number;
  author: string;
  originalKey: string;
  selectedKey: string;
};

function normalizeLabel(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function isOracaoHymn(hymn: Hymn) {
  return (
    normalizeLabel(hymn.category) === "oracao" ||
    hymn.tags.some((tagItem) => normalizeLabel(tagItem) === "oracao") ||
    hymn.id.startsWith("oracao-")
  );
}

function toSelectionItem(hymn: Hymn): SelectionItem {
  return {
    hymnId: hymn.id,
    title: hymn.title,
    number: hymn.number,
    author: hymn.author,
    originalKey: hymn.originalKey,
    selectedKey: normalizeKeyName(hymn.originalKey)
  };
}

function encodeSpec(value: { items: Array<{ hymnId: string; targetKey: string }> }) {
  const json = JSON.stringify(value);
  const bytes = new TextEncoder().encode(json);
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return window
    .btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export function BookletBuilder() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [title, setTitle] = useState("Caderninho de Hinos");
  const [search, setSearch] = useState("");
  const [hymns, setHymns] = useState<Hymn[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<SelectionItem[]>([]);
  const albumPreset = normalizeLabel(searchParams.get("album") ?? "");
  const presetAppliedRef = useRef(false);

  const keys = supportedKeys();

  const filtered = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    if (!normalizedSearch) {
      return hymns;
    }

    return hymns.filter((item) => {
      return (
        item.title.toLowerCase().includes(normalizedSearch) ||
        item.author.toLowerCase().includes(normalizedSearch) ||
        String(item.number).includes(normalizedSearch)
      );
    });
  }, [hymns, search]);

  useEffect(() => {
    void loadHymns();
  }, []);

  useEffect(() => {
    if (!hymns.length || presetAppliedRef.current || albumPreset !== "oracao") {
      return;
    }

    const oracaoSelection = hymns
      .filter(isOracaoHymn)
      .sort((a, b) => a.number - b.number)
      .map((hymn) => toSelectionItem(hymn));

    if (!oracaoSelection.length) {
      return;
    }

    setTitle("Album Oração (exemplo)");
    setSelected(oracaoSelection);
    presetAppliedRef.current = true;
  }, [albumPreset, hymns]);

  async function loadHymns() {
    setLoading(true);
    const response = await fetch("/api/hymns");
    const payload = await response.json();
    setHymns(payload.data ?? []);
    setLoading(false);
  }

  function addHymn(hymn: Hymn) {
    setSelected((current) => {
      if (current.some((item) => item.hymnId === hymn.id)) {
        return current;
      }

      return [...current, toSelectionItem(hymn)];
    });
  }

  function removeHymn(hymnId: string) {
    setSelected((current) => current.filter((item) => item.hymnId !== hymnId));
  }

  function moveItem(hymnId: string, direction: "up" | "down") {
    setSelected((current) => {
      const index = current.findIndex((item) => item.hymnId === hymnId);
      if (index < 0) {
        return current;
      }

      const targetIndex = direction === "up" ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= current.length) {
        return current;
      }

      const clone = [...current];
      [clone[index], clone[targetIndex]] = [clone[targetIndex], clone[index]];
      return clone;
    });
  }

  function updateSelectedKey(hymnId: string, key: string) {
    setSelected((current) =>
      current.map((item) =>
        item.hymnId === hymnId
          ? {
              ...item,
              selectedKey: key
            }
          : item
      )
    );
  }

  function generateBooklet() {
    if (!selected.length) {
      return;
    }

    const spec = encodeSpec({
      items: selected.map((item) => ({
        hymnId: item.hymnId,
        targetKey: item.selectedKey
      }))
    });

    const params = new URLSearchParams({
      title: title.trim() || "Caderninho de Hinos",
      spec
    });

    router.push(`/booklets/preview?${params.toString()}`);
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[1.35fr_1fr]">
      <Card className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="w-full space-y-1">
            <span className="text-sm font-medium text-moss-700">Titulo do caderninho</span>
            <Input value={title} onChange={(event) => setTitle(event.target.value)} />
          </label>
          <Button type="button" onClick={generateBooklet} disabled={!selected.length} className="w-full sm:w-auto">
            Gerar caderninho
          </Button>
        </div>
        {albumPreset === "oracao" && (
          <div className="flex flex-wrap gap-2">
            <Badge className="bg-moss-50 text-moss-700">Preset de álbum aplicado</Badge>
            <Badge className="bg-sand-100 text-moss-700">Coleção: Oração</Badge>
          </div>
        )}

        <label className="space-y-1">
          <span className="text-sm font-medium text-moss-700">Buscar hino para adicionar</span>
          <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Ex.: 112, Cruzeiro, Mestre..." />
        </label>

        <div className="max-h-[520px] space-y-2 overflow-y-auto pr-1 sm:max-h-[560px]">
          {loading ? (
            <p className="text-sm text-moss-600">Carregando hinos...</p>
          ) : (
            filtered.map((hymn) => {
              const alreadySelected = selected.some((item) => item.hymnId === hymn.id);
              return (
                <div
                  key={hymn.id}
                  className="flex flex-col gap-3 rounded-xl border border-moss-100 bg-white p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="text-xs uppercase tracking-wide text-moss-500">Hino #{hymn.number}</p>
                    <p className="text-sm font-semibold text-moss-900">{hymn.title}</p>
                    <p className="text-xs text-moss-600">
                      {hymn.author} • Tom {hymn.originalKey}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant={alreadySelected ? "ghost" : "soft"}
                    disabled={alreadySelected}
                    onClick={() => addHymn(hymn)}
                    className="w-full sm:w-auto"
                  >
                    {alreadySelected ? "Adicionado" : "Adicionar"}
                  </Button>
                </div>
              );
            })
          )}

          {!loading && !filtered.length && <p className="text-sm text-moss-600">Nenhum hino encontrado.</p>}
        </div>
      </Card>

      <Card className="space-y-3 xl:sticky xl:top-24 xl:self-start">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-moss-900">Selecao ({selected.length})</h2>
          <Badge className="bg-sand-100 text-moss-700">Pronto para imprimir</Badge>
        </div>

        <div className="space-y-2">
          {selected.map((item, index) => {
            const semitones = semitoneDistanceBetweenKeys(item.originalKey, item.selectedKey);
            const calculatedKey = transposeKeyBySemitones(item.originalKey, semitones);

            return (
              <div key={item.hymnId} className="rounded-xl border border-moss-100 bg-white p-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-moss-500">#{item.number}</p>
                    <p className="text-sm font-semibold text-moss-900">{item.title}</p>
                    <p className="text-xs text-moss-600">{item.author}</p>
                  </div>
                  <Button variant="ghost" type="button" onClick={() => removeHymn(item.hymnId)} className="w-full sm:w-auto">
                    Remover
                  </Button>
                </div>

                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  <label className="space-y-1">
                    <span className="text-xs text-moss-600">Tom desejado</span>
                    <Select value={item.selectedKey} onChange={(event) => updateSelectedKey(item.hymnId, event.target.value)}>
                      {keys.map((key) => (
                        <option key={key} value={key}>
                          {key}
                        </option>
                      ))}
                    </Select>
                  </label>
                  <div className="rounded-xl bg-sand-50 p-2 text-xs text-moss-700">
                    <p>Original: {item.originalKey}</p>
                    <p>Transposicao: {semitones > 0 ? `+${semitones}` : semitones} st</p>
                    <p>Resultado: {calculatedKey}</p>
                  </div>
                </div>

                <div className="mt-2 grid grid-cols-2 gap-2">
                  <Button type="button" variant="ghost" disabled={index === 0} onClick={() => moveItem(item.hymnId, "up")} className="w-full">
                    Subir
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={index === selected.length - 1}
                    onClick={() => moveItem(item.hymnId, "down")}
                    className="w-full"
                  >
                    Descer
                  </Button>
                </div>
              </div>
            );
          })}

          {!selected.length && <p className="text-sm text-moss-600">Adicione hinos para montar o caderno.</p>}
        </div>
      </Card>
    </div>
  );
}
