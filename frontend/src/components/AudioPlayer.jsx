import React, { useState, useRef, useEffect } from 'react';
import {
  FaPlay,
  FaPause,
  FaVolumeHigh,
  FaVolumeXmark,
  FaDownload,
} from 'react-icons/fa6';

/* ─────────────────────────────────────────────
   Tiny helpers
───────────────────────────────────────────── */
const fmt = (t) => {
  if (!t || isNaN(t)) return '0:00';
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
};

const SPEEDS = [1, 1.5, 2];

/* ─────────────────────────────────────────────
   AudioPlayer
───────────────────────────────────────────── */
const AudioPlayer = ({ src, isOwn = false }) => {
  /* ── src guard ── */
  if (!src || typeof src !== 'string' || !src.startsWith('http')) {
    return (
      <div className="flex items-center gap-2 px-4 py-3 rounded-2xl border border-red-500/30 bg-red-500/10 max-w-sm">
        <FaVolumeXmark className="text-red-400 shrink-0" />
        <p className="text-xs text-red-300">Invalid audio source</p>
      </div>
    );
  }

  /* ── state ── */
  const [isPlaying, setIsPlaying]     = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration]       = useState(0);
  const [volume, setVolume]           = useState(1);
  const [isMuted, setIsMuted]         = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [hasError, setHasError]       = useState(false);

  const audioRef    = useRef(null);
  const progressRef = useRef(null);

  /* ── audio events ── */
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTime     = () => setCurrentTime(audio.currentTime);
    const onMeta     = () => setDuration(audio.duration || 0);
    const onEnded    = () => setIsPlaying(false);
    const onError    = () => setHasError(true);

    audio.addEventListener('timeupdate',     onTime);
    audio.addEventListener('loadedmetadata', onMeta);
    audio.addEventListener('ended',          onEnded);
    audio.addEventListener('error',          onError);

    return () => {
      audio.removeEventListener('timeupdate',     onTime);
      audio.removeEventListener('loadedmetadata', onMeta);
      audio.removeEventListener('ended',          onEnded);
      audio.removeEventListener('error',          onError);
    };
  }, [src]);

  /* ── handlers ── */
  const togglePlay = async () => {
    const audio = audioRef.current;
    if (!audio) return;
    try {
      if (isPlaying) { audio.pause(); setIsPlaying(false); }
      else           { await audio.play(); setIsPlaying(true); }
    } catch { setHasError(true); }
  };

  const handleSeek = (e) => {
    const audio = audioRef.current;
    if (!audio || !progressRef.current || !duration) return;
    const { left, width } = progressRef.current.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - left) / width));
    audio.currentTime = pct * duration;
    setCurrentTime(audio.currentTime);
  };

  const handleVolume = (e) => {
    const v = parseFloat(e.target.value);
    setVolume(v);
    setIsMuted(v === 0);
    if (audioRef.current) audioRef.current.volume = v;
  };

  const toggleMute = () => {
    const audio = audioRef.current;
    if (!audio) return;
    const next = !isMuted;
    setIsMuted(next);
    audio.volume = next ? 0 : (volume || 1);
  };

  const handleSpeed = (rate) => {
    setPlaybackRate(rate);
    if (audioRef.current) audioRef.current.playbackRate = rate;
  };

  const handleDownload = () => {
    const a = Object.assign(document.createElement('a'), {
      href: src, download: 'voice-message.mp3',
    });
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const progress = duration ? (currentTime / duration) * 100 : 0;

  /* ── theme ── */
  const accent   = 'teal';
  const bubble   = isOwn
    ? 'bg-teal-500/10 border border-teal-500/20'
    : 'bg-slate-800/60 border border-slate-700/50';

  /* ── render ── */
  return (
    <div
      className={`
        relative flex flex-col gap-3 p-4 rounded-2xl max-w-sm w-full
        backdrop-blur-sm shadow-lg
        ${bubble}
      `}
    >
      <audio ref={audioRef} src={src} preload="metadata" />

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* animated mic dot */}
          <span className={`
            inline-block w-2 h-2 rounded-full
            ${isPlaying
              ? 'bg-teal-400 animate-pulse'
              : 'bg-slate-500'}
          `} />
          <span className="text-[11px] font-medium tracking-widest uppercase text-slate-400">
            Voice message
          </span>
        </div>

        <button
          onClick={handleDownload}
          className="
            w-7 h-7 flex items-center justify-center rounded-lg
            text-slate-400 hover:text-white
            hover:bg-white/10
            transition-colors
          "
          title="Download"
        >
          <FaDownload className="text-xs" />
        </button>
      </div>

      {/* ── Main controls ── */}
      <div className="flex items-center gap-3">
        {/* Play / Pause */}
        <button
          onClick={togglePlay}
          className="
            w-11 h-11 shrink-0 rounded-full
            bg-teal-500 hover:bg-teal-400 active:scale-95
            text-white flex items-center justify-center
            shadow-md shadow-teal-900/30
            transition-all duration-150
          "
        >
          {isPlaying ? <FaPause className="text-sm" /> : <FaPlay className="text-sm ml-0.5" />}
        </button>

        {/* Progress */}
        <div className="flex-1 flex flex-col gap-1">
          <div
            ref={progressRef}
            onClick={handleSeek}
            className="
              relative h-1.5 rounded-full bg-slate-700
              cursor-pointer group overflow-hidden
            "
          >
            <div
              className="absolute inset-y-0 left-0 bg-teal-400 rounded-full transition-[width] duration-100"
              style={{ width: `${progress}%` }}
            />
            {/* hover glow */}
            <div
              className="absolute inset-y-0 left-0 bg-teal-300/20 rounded-full transition-[width] duration-100"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="flex justify-between text-[10px] font-mono text-slate-500 tabular-nums">
            <span>{fmt(currentTime)}</span>
            <span>{fmt(duration)}</span>
          </div>
        </div>
      </div>

      {/* ── Footer ── */}
      <div className="flex items-center justify-between">
        {/* Volume */}
        <div className="flex items-center gap-2">
          <button
            onClick={toggleMute}
            className="text-slate-400 hover:text-white transition-colors"
          >
            {isMuted
              ? <FaVolumeXmark className="text-sm" />
              : <FaVolumeHigh className="text-sm" />}
          </button>
          <input
            type="range" min="0" max="1" step="0.05"
            value={isMuted ? 0 : volume}
            onChange={handleVolume}
            className="
              w-18 h-1 accent-teal-400 cursor-pointer
              appearance-none bg-slate-700 rounded-full
            "
            style={{ width: '72px' }}
          />
        </div>

        {/* Speed */}
        <div className="flex items-center gap-0.5 rounded-lg bg-slate-700/60 p-0.5">
          {SPEEDS.map((r) => (
            <button
              key={r}
              onClick={() => handleSpeed(r)}
              className={`
                px-2 py-0.5 rounded-md text-[11px] font-mono font-medium
                transition-all duration-150
                ${playbackRate === r
                  ? 'bg-teal-500 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'}
              `}
            >
              {r}×
            </button>
          ))}
        </div>
      </div>

      {/* ── Error ── */}
      {hasError && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/20">
          <FaVolumeXmark className="text-red-400 text-xs shrink-0" />
          <p className="text-[11px] text-red-300">Audio failed to load</p>
        </div>
      )}
    </div>
  );
};

export default AudioPlayer;
