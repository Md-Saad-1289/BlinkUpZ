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
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [waveformBars] = useState(() => {
    const bars = [];
    for (let i = 0; i < 20; i++) {
      bars.push(Math.random() * 80 + 20); // More varied heights
    }
    return bars;
  });

  const audioRef = useRef(null);
  const progressRef = useRef(null);
  const animationRef = useRef(null);

  // 🎧 Sync audio events
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => {
      setDuration(audio.duration || 0);
      setIsLoading(false);
    };
    const handleEnded = () => setIsPlaying(false);
    const handleLoadStart = () => setIsLoading(true);
    const handleCanPlay = () => setIsLoading(false);

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('loadstart', handleLoadStart);
    audio.addEventListener('canplay', handleCanPlay);

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('loadstart', handleLoadStart);
      audio.removeEventListener('canplay', handleCanPlay);
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

  // ⚡ Playback speed change
  const changePlaybackRate = (rate) => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.playbackRate = rate;
    setPlaybackRate(rate);
  };

  // 📥 Download audio
  const downloadAudio = () => {
    const link = document.createElement('a');
    link.href = src;
    link.download = `voice-message-${Date.now()}.wav`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
    <div className={`relative flex flex-col gap-3 p-4 rounded-2xl max-w-sm backdrop-blur-lg shadow-xl transition-all duration-300 hover:shadow-2xl border ${
      isOwn 
        ? 'bg-gradient-to-br from-cyan-500/20 via-blue-500/10 to-cyan-600/20 border-cyan-400/40' 
        : 'bg-gradient-to-br from-slate-700/50 via-slate-600/30 to-slate-700/50 border-slate-600/50'
    }`}>
      <audio ref={audioRef} src={src} preload="metadata" />

      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-black/20 backdrop-blur-sm rounded-2xl flex items-center justify-center z-10">
          <div className="w-6 h-6 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}

      {/* Header with Icon and Metadata */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`flex items-center justify-center w-8 h-8 rounded-full shadow-lg ${
            isOwn ? 'bg-gradient-to-br from-cyan-400 to-blue-500' : 'bg-gradient-to-br from-slate-600 to-slate-500'
          }`}>
            <FaMicrophone className="w-3.5 h-3.5 text-white" />
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-slate-200">Voice Message</span>
            <span className="text-xs text-slate-400">{formatTime(duration)}</span>
          </div>
        </div>

        {/* Download Button */}
        <button
          onClick={downloadAudio}
          className={`p-2 rounded-full transition-all hover:scale-110 ${
            isOwn ? 'hover:bg-cyan-400/20 text-cyan-300' : 'hover:bg-slate-400/20 text-slate-300'
          }`}
          title="Download audio"
        >
          <FaDownload className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Enhanced Waveform Visualization */}
      <div className="flex items-end justify-center gap-0.5 h-10 px-2">
        {waveformBars.map((height, idx) => {
          const isActive = progressPercent > (idx / waveformBars.length) * 100;
          return (
            <div
              key={idx}
              className={`flex-1 rounded-t-sm transition-all duration-300 ${
                isPlaying && isActive ? 'animate-pulse' : ''
              } ${
                isOwn 
                  ? (isActive ? 'bg-gradient-to-t from-cyan-400 to-cyan-300' : 'bg-cyan-400/30')
                  : (isActive ? 'bg-gradient-to-t from-slate-300 to-slate-200' : 'bg-slate-400/40')
              }`}
              style={{
                height: `${isActive ? height : Math.max(height * 0.3, 15)}%`,
                transform: isPlaying && isActive ? 'scaleY(1.1)' : 'scaleY(1)',
                boxShadow: isActive ? `0 0 8px ${isOwn ? 'rgba(34, 211, 238, 0.4)' : 'rgba(148, 163, 184, 0.4)'}` : 'none'
              }}
            />
          );
        })}
      </div>

      {/* Controls and Progress */}
      <div className="flex items-center gap-3">
        {/* Play Button */}
        <button
          onClick={togglePlay}
          disabled={isLoading}
          className={`flex items-center justify-center flex-shrink-0 w-10 h-10 rounded-full transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed ${
            isOwn
              ? 'bg-gradient-to-br from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white'
              : 'bg-gradient-to-br from-slate-600 to-slate-500 hover:from-slate-500 hover:to-slate-400 text-white'
          } active:scale-95`}
          title={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? (
            <FaPause className="w-4 h-4" />
          ) : (
            <FaPlay className="w-4 h-4 ml-0.5" />
          )}
        </button>

        {/* Progress Bar */}
        <div className="flex-1 flex items-center gap-2">
          <span className="text-xs text-slate-300 font-mono min-w-[32px]">
            {formatTime(currentTime)}
          </span>

          <div
            ref={progressRef}
            onClick={handleProgressClick}
            className="flex-1 h-2 bg-slate-600/50 rounded-full cursor-pointer relative group overflow-hidden"
            role="slider"
            aria-label="Audio progress"
            aria-valuenow={currentTime}
            aria-valuemax={duration}
          >
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                isOwn ? 'bg-gradient-to-r from-cyan-400 to-blue-500' : 'bg-gradient-to-r from-slate-300 to-slate-400'
              }`}
              style={{ width: `${progressPercent}%` }}
            />
            <div className={`absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition duration-300 ${
              isOwn ? 'bg-cyan-300/20' : 'bg-slate-200/20'
            }`} />
            {/* Progress indicator dot */}
            <div
              className={`absolute top-1/2 transform -translate-y-1/2 w-3 h-3 rounded-full transition-all duration-300 ${
                isOwn ? 'bg-cyan-300 shadow-lg shadow-cyan-300/50' : 'bg-slate-200 shadow-lg shadow-slate-200/50'
              }`}
              style={{ left: `calc(${progressPercent}% - 6px)` }}
            />
          </div>

          <span className="text-xs text-slate-300 font-mono min-w-[32px] text-right">
            {formatTime(duration)}
          </span>
        </div>
      </div>

      {/* Bottom Controls */}
      <div className="flex items-center justify-between gap-4">
        {/* Volume Control */}
        <div className="flex items-center gap-2 flex-1">
          <button
            onClick={toggleMute}
            className={`text-slate-400 hover:text-slate-200 transition flex-shrink-0`}
            title={isMuted ? 'Unmute' : 'Mute'}
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
            className="flex-1 h-1.5 appearance-none cursor-pointer rounded-lg bg-slate-600/50"
            style={{
              background: `linear-gradient(to right, ${isOwn ? '#06b6d4' : '#64748b'} 0%, ${isOwn ? '#06b6d4' : '#64748b'} ${(isMuted ? 0 : volume) * 100}%, #374151 ${(isMuted ? 0 : volume) * 100}%, #374151 100%)`
            }}
            title="Volume"
          />
        </div>

        {/* Playback Speed Control */}
        <div className="flex items-center gap-1">
          <FaGauge className="w-3 h-3 text-slate-400" />
          {[0.5, 1, 1.5, 2].map((rate) => (
            <button
              key={rate}
              onClick={() => changePlaybackRate(rate)}
              className={`px-2 py-1 text-xs rounded-md transition-all ${
                playbackRate === rate
                  ? (isOwn ? 'bg-cyan-500/80 text-white' : 'bg-slate-500/80 text-white')
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-600/30'
              }`}
              title={`${rate}x speed`}
            >
              {rate}x
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AudioPlayer;