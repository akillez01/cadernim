"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Badge, Card } from "@cadernim/ui";

type SessionItem = {
  id: string;
  selectedKey: string;
  selectedBpm: number;
  accompanimentType: string;
  loopStart: number | null;
  loopEnd: number | null;
  updatedAt: string;
  hymn: {
    id: string;
    title: string;
    number: number;
    author: string;
  };
};

const accompanimentLabel: Record<string, string> = {
  melody: "Somente melodia",
  melody_metronome: "Melodia + metro",
  melody_chords: "Melodia + acordes",
  melody_guitar: "Melodia + violao",
  melody_pad: "Melodia + pad"
};

export function HistoryPanel() {
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void fetchHistory();
  }, []);

  async function fetchHistory() {
    setLoading(true);
    const response = await fetch("/api/history");
    const payload = await response.json();
    setSessions(payload.data ?? []);
    setLoading(false);
  }

  if (loading) {
    return (
      <Card>
        <p className="text-sm text-moss-600">Carregando historico...</p>
      </Card>
    );
  }

  if (!sessions.length) {
    return (
      <Card>
        <p className="text-sm text-moss-600">Ainda nao ha praticas registradas.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {sessions.map((session) => (
        <Card key={session.id} className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Link href={`/hymns/${session.hymn.id}`} className="text-lg font-semibold text-moss-900 hover:underline">
              #{session.hymn.number} {session.hymn.title}
            </Link>
            <p className="text-sm text-moss-600">{session.hymn.author}</p>
            <p className="mt-1 text-xs text-moss-500">
              {format(new Date(session.updatedAt), "dd/MM/yyyy HH:mm", { locale: ptBR })}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Badge>Tom {session.selectedKey}</Badge>
            <Badge>{session.selectedBpm} BPM</Badge>
            <Badge className="bg-sand-100 text-moss-700">{accompanimentLabel[session.accompanimentType]}</Badge>
            {session.loopStart && session.loopEnd && (
              <Badge className="bg-moss-50 text-moss-700">
                Loop {session.loopStart}-{session.loopEnd}
              </Badge>
            )}
          </div>
        </Card>
      ))}
    </div>
  );
}
