"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { FastForward, Pause, Play, Rewind, Volume2, VolumeX } from "lucide-react";
import { Badge, Button } from "@cadernim/ui";
import { detectPodcastSource, toYoutubeEmbedUrl, type PodcastEpisode } from "@/lib/podcast-catalog";

type ProgressPayload = {
  currentTime: number;
  duration: number;
};

function formatTime(value: number) {
  if (!Number.isFinite(value) || value < 0) {
    return "00:00";
  }
  const whole = Math.floor(value);
  const minutes = Math.floor(whole / 60);
  const seconds = whole % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function CompletePodcastPlayer({
  episode,
  startAtSeconds,
  onProgress,
  onEnded
}: {
  episode: PodcastEpisode;
  startAtSeconds?: number;
  onProgress?: (payload: ProgressPayload) => void;
  onEnded?: () => void;
}) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(0.95);
  const [muted, setMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isBuffering, setIsBuffering] = useState(false);

  const hasSource = episode.sourceUrl.trim().length > 0;
  const sourceType = useMemo(() => detectPodcastSource(episode.sourceUrl, episode.sourceType), [episode.sourceType, episode.sourceUrl]);
  const isYoutube = sourceType === "youtube";

  useEffect(() => {
    setIsPlaying(false);
    setDuration(0);
    setCurrentTime(0);
    setIsBuffering(false);
  }, [episode.id]);

  useEffect(() => {
    if (!audioRef.current) return;
    audioRef.current.volume = volume;
    audioRef.current.muted = muted || volume === 0;
    audioRef.current.playbackRate = playbackRate;
  }, [muted, playbackRate, volume]);

  function emitProgress(nextCurrent: number, nextDuration: number) {
    onProgress?.({ currentTime: nextCurrent, duration: nextDuration });
  }

  function togglePlayPause() {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      void audio.play();
    } else {
      audio.pause();
    }
  }

  function seekBy(seconds: number) {
    const audio = audioRef.current;
    if (!audio || !Number.isFinite(audio.duration)) return;
    const next = Math.max(0, Math.min(audio.currentTime + seconds, audio.duration));
    audio.currentTime = next;
    setCurrentTime(next);
    emitProgress(next, audio.duration);
  }

  function setSeek(seconds: number) {
    const audio = audioRef.current;
    if (!audio || !Number.isFinite(audio.duration)) return;
    audio.currentTime = seconds;
    setCurrentTime(seconds);
    emitProgress(seconds, audio.duration);
  }

  if (!hasSource) {
    return (
      <div className="rounded-3xl border border-moss-200 bg-moss-950 p-6 text-sand-50">
        <p className="text-xs uppercase tracking-[0.12em] text-sand-300">Podcast pronto para link</p>
        <h3 className="mt-2 font-[var(--font-cormorant)] text-3xl font-semibold">{episode.title}</h3>
        <p className="mt-2 text-sm text-sand-200">
          Adicione o link em <code>apps/web/lib/podcast-catalog.ts</code> no campo <code>sourceUrl</code>.
        </p>
      </div>
    );
  }

  if (isYoutube) {
    return (
      <div className="space-y-3">
        <div className="overflow-hidden rounded-3xl border border-moss-200 bg-black">
          <iframe
            className="aspect-video w-full"
            src={toYoutubeEmbedUrl(episode.sourceUrl)}
            title={episode.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
        <Badge className="bg-sand-100 text-sand-800">Player YouTube (controle nativo)</Badge>
      </div>
    );
  }

  return (
    <section className="space-y-3 rounded-3xl border border-moss-200 bg-gradient-to-br from-moss-900 to-moss-800 p-4 text-sand-50 sm:p-5">
      <div className="flex items-start gap-4">
        <div
          className="h-24 w-24 shrink-0 rounded-2xl border border-white/10 bg-cover bg-center"
          style={{ backgroundImage: `url(${episode.coverImage})` }}
        />
        <div>
          <p className="text-xs uppercase tracking-[0.12em] text-sand-300">{episode.series}</p>
          <h3 className="font-[var(--font-cormorant)] text-2xl font-semibold leading-tight sm:text-3xl">{episode.title}</h3>
          <p className="text-sm text-sand-200">{episode.host}</p>
        </div>
      </div>

      <audio
        ref={audioRef}
        src={episode.sourceUrl}
        onLoadedMetadata={(event) => {
          const audio = event.currentTarget;
          const nextDuration = audio.duration || 0;
          setDuration(nextDuration);
          const start = startAtSeconds ?? 0;
          if (start > 0 && start < nextDuration - 3) {
            audio.currentTime = start;
            setCurrentTime(start);
            emitProgress(start, nextDuration);
          }
        }}
        onTimeUpdate={(event) => {
          const audio = event.currentTarget;
          setCurrentTime(audio.currentTime);
          emitProgress(audio.currentTime, audio.duration || duration);
        }}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onWaiting={() => setIsBuffering(true)}
        onPlaying={() => setIsBuffering(false)}
        onEnded={() => {
          setIsPlaying(false);
          onEnded?.();
        }}
      />

      <div>
        <div className="flex items-center gap-2">
          <input
            type="range"
            min={0}
            max={duration || 0}
            step={0.1}
            value={Math.min(currentTime, duration || 0)}
            onChange={(event) => setSeek(Number(event.target.value))}
            className="w-full accent-sand-300"
          />
          <p className="min-w-[95px] text-right text-xs">
            {formatTime(currentTime)} / {formatTime(duration)}
          </p>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button type="button" variant="soft" onClick={togglePlayPause} className="min-w-[86px]">
            {isPlaying ? <Pause className="mr-1 h-4 w-4" /> : <Play className="mr-1 h-4 w-4" />}
            {isPlaying ? "Pausar" : "Play"}
          </Button>
          <Button type="button" variant="ghost" onClick={() => seekBy(-15)}>
            <Rewind className="mr-1 h-4 w-4" />
            -15s
          </Button>
          <Button type="button" variant="ghost" onClick={() => seekBy(15)}>
            <FastForward className="mr-1 h-4 w-4" />
            +15s
          </Button>

          <Button type="button" variant="ghost" className="!px-3" onClick={() => setMuted((value) => !value)}>
            {muted || volume === 0 ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </Button>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={muted ? 0 : volume}
            onChange={(event) => {
              const nextVolume = Number(event.target.value);
              setVolume(nextVolume);
              setMuted(nextVolume === 0);
            }}
            className="w-24 accent-sand-300"
          />

          <select
            value={playbackRate}
            onChange={(event) => setPlaybackRate(Number(event.target.value))}
            className="rounded-lg border border-white/20 bg-black/30 px-2 py-1 text-xs text-sand-100 outline-none focus:border-sand-300"
          >
            <option value={0.75}>0.75x</option>
            <option value={1}>1x</option>
            <option value={1.25}>1.25x</option>
            <option value={1.5}>1.5x</option>
            <option value={2}>2x</option>
          </select>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Badge className="bg-sand-200 text-sand-900">{episode.durationLabel}</Badge>
        <Badge className="bg-moss-100 text-moss-800">{episode.level}</Badge>
        {isBuffering && <Badge className="bg-white text-moss-800">Carregando...</Badge>}
      </div>
    </section>
  );
}
