import React, { useState, useRef, useEffect } from 'react';
import {
  FaPlay,
  FaPause,
  FaVolumeHigh,
  FaVolumeXmark,
  FaMicrophone
} from 'react-icons/fa6';

const AudioPlayer = ({ src, isOwn = false }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [waveformBars] = useState(() => {
    const bars = [];
    for (let i = 0; i < 12; i++) {
      bars.push(Math.random() * 100);
    }
    return bars;
  });

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
    <div className={`flex flex-col gap-3 p-4 rounded-2xl max-w-sm backdrop-blur-md shadow-lg transition-all ${
      isOwn 
        ? 'bg-cyan-500/20 border border-cyan-400/30' 
        : 'bg-slate-700/40 border border-slate-600/40'
    }`}>
      <audio ref={audioRef} src={src} preload="metadata" />

      {/* Header with Icon and Metadata */}
      <div className="flex items-center gap-2">
        <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
          isOwn ? 'bg-cyan-400/30' : 'bg-slate-600/40'
        }`}>
          <FaMicrophone className={`w-3.5 h-3.5 ${
            isOwn ? 'text-cyan-300' : 'text-slate-300'
          }`} />
        </div>
        <span className="text-xs font-medium text-slate-300">Voice Message</span>
      </div>

      {/* Waveform Visualization */}
      <div className="flex items-center justify-center gap-0.5 h-8">
        {waveformBars.map((height, idx) => (
          <div
            key={idx}
            className={`flex-1 rounded-full transition-all ${
              isPlaying ? 'animate-pulse' : ''
            } ${
              isOwn ? 'bg-cyan-400/60' : 'bg-slate-500/60'
            }`}
            style={{
              height: `${height}%`,
              opacity: progressPercent > (idx / 12) * 100 ? 1 : 0.4
            }}
          />
        ))}
      </div>

      {/* Controls and Progress */}
      <div className="flex items-center gap-3">
        {/* Play Button */}
        <button
          onClick={togglePlay}
          className={`flex items-center justify-center flex-shrink-0 w-9 h-9 rounded-full transition-all shadow-md ${
            isOwn
              ? 'bg-cyan-500 hover:bg-cyan-600 text-white'
              : 'bg-slate-600 hover:bg-slate-500 text-white'
          } active:scale-95`}
          title={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? (
            <FaPause className="w-3.5 h-3.5" />
          ) : (
            <FaPlay className="w-3.5 h-3.5 ml-0.5" />
          )}
        </button>

        {/* Progress Bar */}
        <div className="flex-1 flex items-center gap-1.5">
          <span className="text-xs text-slate-400 font-mono min-w-[28px]">
            {formatTime(currentTime)}
          </span>

          <div
            ref={progressRef}
            onClick={handleProgressClick}
            className="flex-1 h-1.5 bg-slate-600/50 rounded-full cursor-pointer relative group"
            role="slider"
            aria-label="Audio progress"
            aria-valuenow={currentTime}
            aria-valuemax={duration}
          >
            <div
              className={`h-full rounded-full transition-all ${
                isOwn ? 'bg-cyan-400' : 'bg-slate-300'
              }`}
              style={{ width: `${progressPercent}%` }}
            />
            <div className={`absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition ${
              isOwn ? 'bg-cyan-300/20' : 'bg-slate-200/20'
            }`} />
          </div>

          <span className="text-xs text-slate-400 font-mono min-w-[28px] text-right">
            {formatTime(duration)}
          </span>
        </div>
      </div>

      {/* Volume Control */}
      <div className="flex items-center gap-2 px-1">
        <button
          onClick={toggleMute}
          className={`text-slate-400 hover:${isOwn ? 'text-cyan-300' : 'text-slate-200'} transition flex-shrink-0`}
          title={isMuted ? 'Unmute' : 'Mute'}
        >
          {isMuted || volume === 0 ? (
            <FaVolumeXmark className="w-3.5 h-3.5" />
          ) : (
            <FaVolumeHigh className="w-3.5 h-3.5" />
          )}
        </button>

        <input
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={isMuted ? 0 : volume}
          onChange={handleVolumeChange}
          className={`flex-1 h-1 appearance-none cursor-pointer rounded-lg`}
          style={{
            background: `linear-gradient(to right, ${isOwn ? '#06b6d4' : '#64748b'} 0%, ${isOwn ? '#06b6d4' : '#64748b'} ${(isMuted ? 0 : volume) * 100}%, ${isOwn ? '#334155' : '#475569'} ${(isMuted ? 0 : volume) * 100}%, ${isOwn ? '#334155' : '#475569'} 100%)`
          }}
          title="Volume"
        />
      </div>
    </div>
  );
};

export default AudioPlayer;