import React, { useState, useRef, useEffect } from 'react';
import {
  FaPlay,
  FaPause,
  FaVolumeHigh,
  FaVolumeXmark
} from 'react-icons/fa6';

const AudioPlayer = ({ src }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);

  const audioRef = useRef(null);
  const progressRef = useRef(null);

  // 🎧 Sync audio events
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => setDuration(audio.duration || 0);
    const handleEnded = () => setIsPlaying(false);

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('ended', handleEnded);
    };
  }, []);

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
    } catch (err) {
      console.error('Playback error:', err);
    }
  };

  // ⏩ Seek
  const handleProgressClick = (e) => {
    const audio = audioRef.current;
    if (!audio || !progressRef.current || !duration) return;

    const rect = progressRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = clickX / rect.width;

    const newTime = percentage * duration;
    audio.currentTime = newTime;
    setCurrentTime(newTime);
  };

  // 🔊 Volume change
  const handleVolumeChange = (e) => {
    const newVolume = parseFloat(e.target.value);

    setVolume(newVolume);
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
    }

    setIsMuted(newVolume === 0);
  };

  // 🔇 Mute toggle
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

  // ⏱️ Format time
  const formatTime = (time) => {
    if (!time || isNaN(time)) return '0:00';

    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);

    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const progressPercent = duration ? (currentTime / duration) * 100 : 0;

  return (
    <div className="flex items-center gap-3 p-3 bg-slate-800/60 backdrop-blur-md rounded-xl max-w-md shadow-lg">

      <audio ref={audioRef} src={src} preload="metadata" />

      {/* ▶️ Play Button */}
      <button
        onClick={togglePlay}
        className="flex items-center justify-center w-10 h-10 bg-cyan-500 hover:bg-cyan-600 active:scale-95 text-white rounded-full transition-all shadow-md"
      >
        {isPlaying ? (
          <FaPause className="w-4 h-4" />
        ) : (
          <FaPlay className="w-4 h-4 ml-0.5" />
        )}
      </button>

      {/* ⏳ Progress */}
      <div className="flex-1 flex items-center gap-2">
        <span className="text-xs text-slate-400 font-mono w-10">
          {formatTime(currentTime)}
        </span>

        <div
          ref={progressRef}
          onClick={handleProgressClick}
          className="flex-1 h-2 bg-slate-600 rounded-full cursor-pointer relative group"
        >
          <div
            className="h-full bg-cyan-500 rounded-full transition-all"
            style={{ width: `${progressPercent}%` }}
          />

          {/* Hover effect */}
          <div className="absolute inset-0 rounded-full bg-white/10 opacity-0 group-hover:opacity-100 transition" />
        </div>

        <span className="text-xs text-slate-400 font-mono w-10">
          {formatTime(duration)}
        </span>
      </div>

      {/* 🔊 Volume */}
      <div className="flex items-center gap-2">
        <button
          onClick={toggleMute}
          className="text-slate-400 hover:text-cyan-400 transition"
        >
          {isMuted || volume === 0 ? (
            <FaVolumeXmark className="w-4 h-4" />
          ) : (
            <FaVolumeHigh className="w-4 h-4" />
          )}
        </button>

        <input
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={isMuted ? 0 : volume}
          onChange={handleVolumeChange}
          className="w-20 h-1 bg-slate-600 rounded-lg appearance-none cursor-pointer"
        />
      </div>
    </div>
  );
};

export default AudioPlayer;