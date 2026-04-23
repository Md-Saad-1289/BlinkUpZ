import React, { useState, useRef, useEffect } from 'react';
import {
  FaPlay,
  FaPause,
  FaVolumeHigh,
  FaVolumeXmark,
  FaMicrophone,
  FaDownload,
  FaGauge
} from 'react-icons/fa6';

const AudioPlayer = ({ src, isOwn = false }) => {

  // ❗ Validate src
  if (!src || typeof src !== 'string' || !src.startsWith('http')) {
    return (
      <div className="flex items-center justify-center p-4 rounded-2xl bg-red-500/10 border border-red-500/40">
        <FaVolumeXmark className="w-6 h-6 text-red-400" />
        <p className="text-xs text-red-300 ml-2">Invalid audio source</p>
      </div>
    );
  }

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const audioRef = useRef(null);
  const progressRef = useRef(null);

  // 🎧 Audio events (FIXED — no duplicate closing)
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

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
    };
  }, [src]);

  // ▶️ Play / Pause
  const togglePlay = async () => {
    const audio = audioRef.current;
    if (!audio) return;

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
  };

  // ⏩ Seek
  const handleProgressClick = (e) => {
    const audio = audioRef.current;
    if (!audio || !progressRef.current || !duration) return;

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
  };

  const toggleMute = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isMuted) {
      audio.volume = volume || 1;
      setIsMuted(false);
    } else {
      audio.volume = 0;
      setIsMuted(true);
    }
  };

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

  return (
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
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="flex justify-between text-xs text-slate-400 mt-1">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>
      </div>

      {/* Bottom */}
      <div className="flex items-center justify-between mt-3">

        {/* Volume */}
        <div className="flex items-center gap-2">
          <button onClick={toggleMute}>
            {isMuted ? <FaVolumeXmark /> : <FaVolumeHigh />}
          </button>

          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={isMuted ? 0 : volume}
            onChange={handleVolumeChange}
          />
        </div>

        {/* Speed */}
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
            </button>
          ))}
        </div>

      </div>

      {hasError && (
        <p className="text-red-400 text-xs mt-2">Audio failed to load</p>
      )}
    </div>
  );
};

export default AudioPlayer;
