"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Expand,
  FastForward,
  Minimize2,
  Pause,
  PictureInPicture2,
  Play,
  Rewind,
  Volume2,
  VolumeX
} from "lucide-react";
import { Badge, Button } from "@cadernim/ui";
import { detectVideoSource, toYoutubeEmbedUrl, type VideoLesson } from "@/lib/ava-catalog";

type ProgressPayload = {
  currentTime: number;
  duration: number;
};

function formatTime(value: number) {
  if (!Number.isFinite(value)) {
    return "00:00";
  }
  const whole = Math.max(0, Math.floor(value));
  const hours = Math.floor(whole / 3600);
  const minutes = Math.floor((whole % 3600) / 60);
  const seconds = whole % 60;

  if (hours > 0) {
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function CompleteVideoPlayer({
  lesson,
  startAtSeconds,
  onProgress,
  onEnded
}: {
  lesson: VideoLesson;
  startAtSeconds?: number;
  onProgress?: (payload: ProgressPayload) => void;
  onEnded?: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(0.9);
  const [muted, setMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [canPip, setCanPip] = useState(false);

  const sourceKind = useMemo(() => detectVideoSource(lesson.sourceUrl, lesson.sourceType), [lesson.sourceType, lesson.sourceUrl]);
  const hasSource = lesson.sourceUrl.trim().length > 0;
  const isYoutube = sourceKind === "youtube";

  useEffect(() => {
    setIsPlaying(false);
    setDuration(0);
    setCurrentTime(0);
    setIsBuffering(false);
  }, [lesson.id]);

  useEffect(() => {
    setCanPip(typeof document !== "undefined" && "pictureInPictureEnabled" in document);
  }, []);

  useEffect(() => {
    if (!videoRef.current) return;
    videoRef.current.volume = volume;
    videoRef.current.muted = muted || volume === 0;
  }, [muted, volume]);

  useEffect(() => {
    function handleFullscreenChange() {
      setIsFullscreen(Boolean(document.fullscreenElement));
    }
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  function publishProgress(nextCurrent: number, nextDuration: number) {
    onProgress?.({ currentTime: nextCurrent, duration: nextDuration });
  }

  function togglePlayPause() {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      void video.play();
    } else {
      video.pause();
    }
  }

  function seekBy(seconds: number) {
    const video = videoRef.current;
    if (!video || !Number.isFinite(video.duration)) return;
    const next = Math.max(0, Math.min(video.currentTime + seconds, video.duration));
    video.currentTime = next;
    setCurrentTime(next);
    publishProgress(next, video.duration);
  }

  function setSeek(seconds: number) {
    const video = videoRef.current;
    if (!video || !Number.isFinite(video.duration)) return;
    video.currentTime = seconds;
    setCurrentTime(seconds);
    publishProgress(seconds, video.duration);
  }

  async function togglePip() {
    const video = videoRef.current;
    if (!video || !canPip) return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else {
        await video.requestPictureInPicture();
      }
    } catch {
      // ignora falhas em navegadores sem suporte total
    }
  }

  async function toggleFullscreen() {
    const el = containerRef.current;
    if (!el) return;
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await el.requestFullscreen();
      }
    } catch {
      // ignora falhas de permissao
    }
  }

  function onKeyboardShortcut(event: React.KeyboardEvent<HTMLDivElement>) {
    if (isYoutube || !hasSource) return;
    if (["INPUT", "TEXTAREA"].includes((event.target as HTMLElement).tagName)) {
      return;
    }

    const key = event.key.toLowerCase();
    if (key === " " || key === "k") {
      event.preventDefault();
      togglePlayPause();
    } else if (key === "arrowleft" || key === "j") {
      event.preventDefault();
      seekBy(-10);
    } else if (key === "arrowright" || key === "l") {
      event.preventDefault();
      seekBy(10);
    } else if (key === "m") {
      event.preventDefault();
      setMuted((value) => !value);
    } else if (key === "f") {
      event.preventDefault();
      void toggleFullscreen();
    }
  }

  return (
    <section className="space-y-3">
      <div
        ref={containerRef}
        tabIndex={0}
        onKeyDown={onKeyboardShortcut}
        className="relative overflow-hidden rounded-3xl border border-moss-200/70 bg-[#11170f] shadow-soft focus:outline-none focus:ring-2 focus:ring-moss-300"
      >
        {!hasSource ? (
          <div className="grid min-h-[300px] place-items-center p-8 text-center text-sand-100 sm:min-h-[420px]">
            <div className="max-w-lg space-y-2">
              <p className="text-sm uppercase tracking-[0.12em] text-sand-300">Aula pronta para receber link</p>
              <h3 className="font-[var(--font-cormorant)] text-3xl font-semibold">{lesson.title}</h3>
              <p className="text-sm text-sand-200">
                Adicione o link em <code>apps/web/lib/ava-catalog.ts</code> no campo <code>sourceUrl</code>.
              </p>
            </div>
          </div>
        ) : isYoutube ? (
          <div className="aspect-video w-full bg-black">
            <iframe
              className="h-full w-full"
              src={toYoutubeEmbedUrl(lesson.sourceUrl)}
              title={lesson.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        ) : (
          <>
            <video
              ref={videoRef}
              src={lesson.sourceUrl}
              poster={lesson.thumbnail}
              className="aspect-video w-full bg-black"
              playsInline
              onLoadedMetadata={(event) => {
                const video = event.currentTarget;
                setDuration(video.duration || 0);

                const safeStartAt = startAtSeconds ?? 0;
                if (safeStartAt > 0 && safeStartAt < video.duration - 3) {
                  video.currentTime = safeStartAt;
                  setCurrentTime(safeStartAt);
                  publishProgress(safeStartAt, video.duration);
                }
              }}
              onTimeUpdate={(event) => {
                const video = event.currentTarget;
                setCurrentTime(video.currentTime);
                publishProgress(video.currentTime, video.duration || duration);
              }}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onRateChange={(event) => setPlaybackRate(event.currentTarget.playbackRate)}
              onWaiting={() => setIsBuffering(true)}
              onPlaying={() => setIsBuffering(false)}
              onEnded={() => {
                setIsPlaying(false);
                onEnded?.();
              }}
            />

            <div className="border-t border-white/10 bg-black/80 p-3 backdrop-blur sm:p-4">
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min={0}
                  max={duration || 0}
                  step={0.1}
                  value={Math.min(currentTime, duration || 0)}
                  onChange={(event) => setSeek(Number(event.target.value))}
                  className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-moss-100 accent-sand-300"
                />
                <p className="min-w-[92px] text-right text-xs text-sand-100">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </p>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Button type="button" variant="soft" onClick={togglePlayPause} className="min-w-[88px]">
                  {isPlaying ? <Pause className="mr-1 h-4 w-4" /> : <Play className="mr-1 h-4 w-4" />}
                  {isPlaying ? "Pausar" : "Play"}
                </Button>
                <Button type="button" variant="ghost" onClick={() => seekBy(-10)}>
                  <Rewind className="mr-1 h-4 w-4" />
                  -10s
                </Button>
                <Button type="button" variant="ghost" onClick={() => seekBy(10)}>
                  <FastForward className="mr-1 h-4 w-4" />
                  +10s
                </Button>

                <div className="mx-1 hidden h-5 w-px bg-white/20 sm:block" />

                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setMuted((value) => !value)}
                  className="!px-3"
                  aria-label="Silenciar"
                >
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
                    if (videoRef.current) {
                      videoRef.current.volume = nextVolume;
                      videoRef.current.muted = nextVolume === 0;
                    }
                  }}
                  className="w-24 accent-sand-300"
                />

                <select
                  value={playbackRate}
                  onChange={(event) => {
                    const nextRate = Number(event.target.value);
                    setPlaybackRate(nextRate);
                    if (videoRef.current) {
                      videoRef.current.playbackRate = nextRate;
                    }
                  }}
                  className="rounded-lg border border-white/20 bg-black/40 px-2 py-1 text-xs text-sand-100 outline-none focus:border-sand-300"
                >
                  <option value={0.75}>0.75x</option>
                  <option value={1}>1x</option>
                  <option value={1.25}>1.25x</option>
                  <option value={1.5}>1.5x</option>
                  <option value={2}>2x</option>
                </select>

                <div className="ml-auto flex items-center gap-2">
                  {canPip && (
                    <Button type="button" variant="ghost" onClick={() => void togglePip()}>
                      <PictureInPicture2 className="mr-1 h-4 w-4" />
                      PiP
                    </Button>
                  )}
                  <Button type="button" variant="ghost" onClick={() => void toggleFullscreen()}>
                    {isFullscreen ? <Minimize2 className="mr-1 h-4 w-4" /> : <Expand className="mr-1 h-4 w-4" />}
                    {isFullscreen ? "Sair" : "Tela cheia"}
                  </Button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Badge className="bg-moss-200 text-moss-800">{lesson.level}</Badge>
        <Badge className="bg-sand-200 text-sand-900">{lesson.durationLabel}</Badge>
        {isBuffering && <Badge className="bg-white text-moss-800">Carregando...</Badge>}
        {!hasSource && <Badge className="bg-red-100 text-red-700">Sem link de video</Badge>}
      </div>
    </section>
  );
}
