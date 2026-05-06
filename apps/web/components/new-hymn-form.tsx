"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Input, TextArea } from "@cadernim/ui";

export function NewHymnForm() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    const form = event.currentTarget;
    const data = new FormData(form);

    const response = await fetch("/api/hymns", {
      method: "POST",
      body: data
    });

    const payload = await response.json();

    if (!response.ok) {
      setError(payload.error ?? "Falha ao cadastrar hino.");
      setSubmitting(false);
      return;
    }

    form.reset();
    router.push(`/hymns/${payload.data.id}`);
  }

  return (
    <Card>
      <form className="grid gap-4 sm:gap-5 md:grid-cols-2" onSubmit={handleSubmit}>
        <label className="space-y-1">
          <span className="text-sm font-medium text-moss-700">Titulo</span>
          <Input name="title" required placeholder="Ex.: O Cruzeiro" />
        </label>

        <label className="space-y-1">
          <span className="text-sm font-medium text-moss-700">Numero</span>
          <Input name="number" type="number" min={1} required placeholder="Ex.: 112" />
        </label>

        <label className="space-y-1">
          <span className="text-sm font-medium text-moss-700">Autor</span>
          <Input name="author" required placeholder="Nome do autor" />
        </label>

        <label className="space-y-1">
          <span className="text-sm font-medium text-moss-700">Tom original</span>
          <Input name="originalKey" required placeholder="Ex.: D" />
        </label>

        <label className="space-y-1">
          <span className="text-sm font-medium text-moss-700">BPM padrao</span>
          <Input name="defaultBpm" type="number" min={30} max={220} defaultValue={80} required />
        </label>

        <label className="space-y-1">
          <span className="text-sm font-medium text-moss-700">Compasso</span>
          <Input name="timeSignature" required placeholder="Ex.: 4/4" />
        </label>

        <label className="space-y-1">
          <span className="text-sm font-medium text-moss-700">Categoria</span>
          <Input name="category" required placeholder="Ex.: Concentracao" />
        </label>

        <label className="space-y-1">
          <span className="text-sm font-medium text-moss-700">Tags (separadas por virgula)</span>
          <Input name="tags" placeholder="voz, iniciante, estudo" />
        </label>

        <label className="space-y-1 md:col-span-2">
          <span className="text-sm font-medium text-moss-700">Arquivo de partitura (.xml/.mxl/.pdf)</span>
          <Input
            name="file"
            type="file"
            required
            accept=".xml,.musicxml,.mxl,.pdf"
            onChange={(event) => {
              const file = event.target.files?.[0];
              setFileName(file ? `${file.name} (${Math.round(file.size / 1024)} KB)` : "");
            }}
          />
          {fileName && <p className="text-xs text-moss-600">Preview: {fileName}</p>}
          <p className="text-xs text-moss-500">
            PDF usa OCR musical (Audiveris no servidor). Para melhor resultado, envie PDF limpo e sem distorcao.
          </p>
        </label>

        <label className="space-y-1 md:col-span-2">
          <span className="text-sm font-medium text-moss-700">Observacao inicial (opcional)</span>
          <TextArea name="initialNote" rows={3} placeholder="Anotacoes pedagógicas para este hino" />
        </label>

        {error && <p className="md:col-span-2 text-sm text-red-600">{error}</p>}

        <div className="md:col-span-2 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="ghost" onClick={() => router.push("/dashboard")} className="w-full sm:w-auto">
            Cancelar
          </Button>
          <Button type="submit" disabled={submitting} className="w-full sm:w-auto">
            {submitting ? "Salvando..." : "Salvar Hino"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
