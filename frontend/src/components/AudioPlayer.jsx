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

<<<<<<< HEAD
  // ❗ Validate src
  if (!src || typeof src !== 'string' || !src.startsWith('http')) {
    return (
      <div className="flex items-center justify-center p-4 rounded-2xl bg-red-500/10 border border-red-500/40">
        <FaVolumeXmark className="w-6 h-6 text-red-400" />
        <p className="text-xs text-red-300 ml-2">Invalid audio source</p>
=======
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
>>>>>>> 61daf335e1c8ad490260f1c6615ce3b539d2d743
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
<<<<<<< HEAD
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
=======
  const [hasError, setHasError]       = useState(false);
>>>>>>> 61daf335e1c8ad490260f1c6615ce3b539d2d743

  const audioRef    = useRef(null);
  const progressRef = useRef(null);

<<<<<<< HEAD
  // 🎧 Audio events (FIXED — no duplicate closing)
=======
  /* ── audio events ── */
>>>>>>> 61daf335e1c8ad490260f1c6615ce3b539d2d743
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

<<<<<<< HEAD
    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => {
      setDuration(audio.duration || 0);
      setIsLoading(false);
    };
    const handleEnded = () => setIsPlaying(false);
    const handleError = () => {
      setHasError(true);
      setIsLoading(false);
    };

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
=======
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
>>>>>>> 61daf335e1c8ad490260f1c6615ce3b539d2d743
    };
  }, [src]);

  /* ── handlers ── */
  const togglePlay = async () => {
    const audio = audioRef.current;
    if (!audio) return;
<<<<<<< HEAD

    try {
      if (isPlaying) {
        audio.pause();
      } else {
        await audio.play();
      }
      setIsPlaying(!isPlaying);
    } catch {
      setHasError(true);
    }
=======
    try {
      if (isPlaying) { audio.pause(); setIsPlaying(false); }
      else           { await audio.play(); setIsPlaying(true); }
    } catch { setHasError(true); }
>>>>>>> 61daf335e1c8ad490260f1c6615ce3b539d2d743
  };

  const handleSeek = (e) => {
    const audio = audioRef.current;
    if (!audio || !progressRef.current || !duration) return;
<<<<<<< HEAD

    const rect = progressRef.current.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    const newTime = percent * duration;

    audio.currentTime = newTime;
    setCurrentTime(newTime);
  };

  // 🔊 Volume
  const handleVolumeChange = (e) => {
    const v = parseFloat(e.target.value);
    setVolume(v);
    if (audioRef.current) audioRef.current.volume = v;
    setIsMuted(v === 0);
=======
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
>>>>>>> 61daf335e1c8ad490260f1c6615ce3b539d2d743
  };

  const toggleMute = () => {
    const audio = audioRef.current;
    if (!audio) return;
    const next = !isMuted;
    setIsMuted(next);
    audio.volume = next ? 0 : (volume || 1);
  };

<<<<<<< HEAD
  // ⚡ Speed
  const changePlaybackRate = (rate) => {
    if (audioRef.current) {
      audioRef.current.playbackRate = rate;
      setPlaybackRate(rate);
    }
  };

  // ⬇️ Download (FIXED missing function)
  const downloadAudio = () => {
    const link = document.createElement('a');
    link.href = src;
    link.download = 'audio.mp3';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // ⏱️ Format time
  const formatTime = (t) => {
    if (!t || isNaN(t)) return '0:00';
    const m = Math.floor(t / 60);
    const s = Math.floor(t % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const progress = duration ? (currentTime / duration) * 100 : 0;
=======
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
>>>>>>> 61daf335e1c8ad490260f1c6615ce3b539d2d743

  /* ── render ── */
  return (
<<<<<<< HEAD
    <div className={`p-4 rounded-2xl max-w-sm shadow-lg ${
      isOwn ? 'bg-cyan-500/10' : 'bg-slate-700/40'
    }`}>

      <audio ref={audioRef} src={src} preload="metadata" />

      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <FaMicrophone className="text-cyan-400" />
          <span className="text-xs text-slate-300">Voice</span>
        </div>

        <button onClick={downloadAudio}>
          <FaDownload className="text-slate-300 hover:text-white" />
        </button>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3">

        {/* Play */}
        <button
          onClick={togglePlay}
          className="w-10 h-10 rounded-full bg-cyan-500 text-white flex items-center justify-center"
        >
          {isPlaying ? <FaPause /> : <FaPlay />}
        </button>

        {/* Progress */}
        <div className="flex-1">
          <div
            ref={progressRef}
            onClick={handleProgressClick}
            className="h-2 bg-slate-600 rounded cursor-pointer"
          >
            <div
              className="h-full bg-cyan-400 rounded"
=======
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
>>>>>>> 61daf335e1c8ad490260f1c6615ce3b539d2d743
              style={{ width: `${progress}%` }}
            />
          </div>

<<<<<<< HEAD
          <div className="flex justify-between text-xs text-slate-400 mt-1">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
=======
          <div className="flex justify-between text-[10px] font-mono text-slate-500 tabular-nums">
            <span>{fmt(currentTime)}</span>
            <span>{fmt(duration)}</span>
>>>>>>> 61daf335e1c8ad490260f1c6615ce3b539d2d743
          </div>
        </div>
      </div>

<<<<<<< HEAD
      {/* Bottom */}
      <div className="flex items-center justify-between mt-3">

        {/* Volume */}
        <div className="flex items-center gap-2">
          <button onClick={toggleMute}>
            {isMuted ? <FaVolumeXmark /> : <FaVolumeHigh />}
=======
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
>>>>>>> 61daf335e1c8ad490260f1c6615ce3b539d2d743
          </button>
          <input
            type="range" min="0" max="1" step="0.05"
            value={isMuted ? 0 : volume}
<<<<<<< HEAD
            onChange={handleVolumeChange}
=======
            onChange={handleVolume}
            className="
              w-18 h-1 accent-teal-400 cursor-pointer
              appearance-none bg-slate-700 rounded-full
            "
            style={{ width: '72px' }}
>>>>>>> 61daf335e1c8ad490260f1c6615ce3b539d2d743
          />
        </div>

        {/* Speed */}
<<<<<<< HEAD
        <div className="flex items-center gap-1">
          <FaGauge className="text-slate-400 text-xs" />
          {[1, 1.5, 2].map(r => (
            <button
              key={r}
              onClick={() => changePlaybackRate(r)}
              className={`text-xs px-2 ${
                playbackRate === r ? 'text-cyan-400' : 'text-slate-400'
              }`}
            >
              {r}x
=======
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
>>>>>>> 61daf335e1c8ad490260f1c6615ce3b539d2d743
            </button>
          ))}
        </div>

      </div>

<<<<<<< HEAD
      {hasError && (
        <p className="text-red-400 text-xs mt-2">Audio failed to load</p>
=======
      {/* ── Error ── */}
      {hasError && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/20">
          <FaVolumeXmark className="text-red-400 text-xs shrink-0" />
          <p className="text-[11px] text-red-300">Audio failed to load</p>
        </div>
>>>>>>> 61daf335e1c8ad490260f1c6615ce3b539d2d743
      )}
    </div>
  );
};

export default AudioPlayer;
