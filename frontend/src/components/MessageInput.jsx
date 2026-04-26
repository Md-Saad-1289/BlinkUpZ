import React, { useState, useRef, useEffect, useCallback } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useSocket } from "../context/SocketContext";
import api from '../api.js';
import { addMessage, setReplyingTo } from "../redux/chatSlice";
import {
  FaPaperPlane, FaImage, FaXmark, FaReply,
  FaFaceSmile, FaMicrophone, FaStop,
  FaLock, FaBolt
} from "react-icons/fa6";
import EmojiPicker from 'emoji-picker-react';

// ─── Multi-Emoji Peek System ────────────────────────────────────────────────

const QUICK_EMOJIS = ["🤣", "❤️", "👍", "😢", "😤", "😍", "🙄", "💀"];
const MAX_RECENT = 8;
const RECENT_KEY = "chat_recent_emojis";

const GAME_PROMPTS = [
  // Mix (Bangla + English + Fun)

  "Ek line e golpo start koro 😄",
  "Send only emojis for the next reply 😆🔥",
  "Ajker mood ekta emoji diye bolo 🙂",
  "Share your funniest movie quote 😂",
  "Amake ekta funny nickname dao 😜",
  "Describe your day in 3 words 📅",
  "Time machine thakle kothay jete? ⏳",
  "Ask a question using a rhyme 🎤",
  "Ekta weird but tasty food combo bolo 🍕🍫",
  "Tell me one thing that made you smile 😊",

  "Next 3 reply sudhu emoji diye dite hobe 😈",
  "Write a two-word poem ✍️",
  "Tomar current vibe kon emoji? 🔥",
  "Turn the last message into a joke 😄",
  "2 ta truth + 1 ta lie bolo — ami guess korbo 😏",

  "Pick a song and tell me why it fits your day 🎧",
  "Ekta choto mystery line likho 🕵️‍♂️",
  "Reply with the first thing on your desk 🧑‍💻",
  "Voice style e likho (like you’re shouting) 🔊",
  "Tomar life movie hole naam ki hoto? 🎬",

  "Send a tiny dare: emoji/GIF use koro 😆",
  "3 word e ideal weekend describe koro 🌴",
  "Ekta superpower choose koro 🦸‍♂️",
  "Share one wish for this week 🌟",
  "Last message ke savage joke e convert koro 😆🔥"
];

const loadRecentEmojis = () => {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) || "[]");
  } catch {
    return [];
  }
};

const saveRecentEmojis = (list) => {
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(list));
  } catch {}
};

const EmojiPeekBar = ({ onSelect, onTogglePicker, showPicker }) => {
  const [recent, setRecent] = useState(loadRecentEmojis);

  const handleSelect = (emoji) => {
    setRecent(prev => {
      const next = [emoji, ...prev.filter(e => e !== emoji)].slice(0, MAX_RECENT);
      saveRecentEmojis(next);
      return next;
    });
    onSelect(emoji);
  };

  const displayEmojis = recent.length > 0
    ? [...new Set([...recent, ...QUICK_EMOJIS])].slice(0, 10)
    : QUICK_EMOJIS;

  return (
    <div className="flex items-center gap-1 px-1">
      {displayEmojis.map((emoji, i) => (
        <button
          key={i}
          type="button"
          onClick={() => handleSelect(emoji)}
          className="text-lg leading-none p-1 rounded-lg hover:bg-slate-700/60 transition-all active:scale-90 select-none"
          title={emoji}
        >
          {emoji}
        </button>
      ))}
      <button
        type="button"
        onClick={onTogglePicker}
        className={`p-1.5 rounded-lg transition-all ${
          showPicker
            ? 'text-cyan-400 bg-cyan-500/20'
            : 'text-slate-400 hover:text-cyan-400 hover:bg-slate-700/60'
        }`}
        title="More emojis"
      >
        <FaFaceSmile className="w-4 h-4" />
      </button>
    </div>
  );
};

// ─── Voice Timer Display ─────────────────────────────────────────────────────

const formatTime = (secs) =>
  `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, "0")}`;

// ─── Main Component ──────────────────────────────────────────────────────────

const MessageInput = ({ sendGamePrompt }) => {
  const [content, setContent] = useState("");
  const [uploading, setUploading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [recordingError, setRecordingError] = useState(null);
  const [audioLevel, setAudioLevel] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [isRecordingPaused, setIsRecordingPaused] = useState(false);

  const fileInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const emojiPickerRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const recordingTimerRef = useRef(null);
  const recordingAutoStopRef = useRef(null);
  const isRecordingRef = useRef(false);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const animationFrameRef = useRef(null);
  const micButtonRef = useRef(null);
  const dragStartY = useRef(0);
  const dragStartTime = useRef(0);
  const cancelledRef = useRef(false);
  const textareaRef = useRef(null);

  const dispatch = useDispatch();
  const socket = useSocket();
  const { currentChat, replyingTo } = useSelector((state) => state.chat);
  const { userData } = useSelector((state) => state.user);

  // ── Cleanup on unmount / chat change ────────────────────────────────────

  useEffect(() => {
    return () => {
      if (socket && currentChat && isTyping) {
        socket.emit("typing_stop", {
          chatId: currentChat._id,
          userId: userData._id,
          userName: userData.name || userData.username,
        });
      }
      clearTimeout(typingTimeoutRef.current);
      clearInterval(recordingTimerRef.current);
      clearTimeout(recordingAutoStopRef.current);
      cleanupAudioMonitoring();
    };
  }, [currentChat?._id, socket, isTyping, userData]);

  // ── Close emoji picker on outside click ─────────────────────────────────

  useEffect(() => {
    if (!showEmojiPicker) return;
    const handler = (e) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target)) {
        setShowEmojiPicker(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showEmojiPicker]);

  // ── Typing indicators ────────────────────────────────────────────────────

  const emitTypingStop = useCallback(() => {
    if (socket && currentChat && isTyping) {
      socket.emit("typing_stop", {
        chatId: currentChat._id,
        userId: userData._id,
        userName: userData.name || userData.username,
      });
      setIsTyping(false);
    }
  }, [socket, currentChat, isTyping, userData]);

  const handleInputChange = (e) => {
    const nextValue = e.target.value;
    setContent(nextValue);

    if (socket && currentChat && !isTyping) {
      socket.emit("typing_start", {
        chatId: currentChat._id,
        userId: userData._id,
        userName: userData.name || userData.username,
      });
      setIsTyping(true);
    }

    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      emitTypingStop();
    }, 1500);
  };

  // ── Emoji handling ───────────────────────────────────────────────────────

  const insertEmoji = (emoji) => {
    const ta = textareaRef.current;
    if (!ta) {
      setContent(prev => prev + emoji);
      return;
    }
    const start = ta.selectionStart ?? content.length;
    const end = ta.selectionEnd ?? content.length;
    const next = content.slice(0, start) + emoji + content.slice(end);
    setContent(next);
    
    requestAnimationFrame(() => {
      ta.selectionStart = ta.selectionEnd = start + [...emoji].length;
      ta.focus();
    });
  };

  const handleEmojiClick = (emojiData) => {
    insertEmoji(emojiData.emoji);
  };

  const handleQuickEmoji = (emoji) => {
    insertEmoji(emoji);
  };

  const handleRandomGamePrompt = () => {
    if (!GAME_PROMPTS.length || typeof sendGamePrompt !== 'function') return;

    const randomPrompt = GAME_PROMPTS[Math.floor(Math.random() * GAME_PROMPTS.length)];
    sendGamePrompt(randomPrompt);
  };

  // ── Image upload ─────────────────────────────────────────────────────────

  const handleImageSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !currentChat) return;

    setUploading(true);
    const formData = new FormData();
    formData.append("image", file);
    if (replyingTo) formData.append("replyTo", replyingTo._id);

    try {
      const res = await api.post(`/api/chat/${currentChat._id}/messages`, formData);
      dispatch(addMessage(res.data));
      dispatch(setReplyingTo(null));
      socket?.emit("send_message", {
        chatId: currentChat._id,
        message: res.data,
        senderId: userData._id,
      });
    } catch (err) {
      console.error("Send image failed:", err);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // ── Audio monitoring ─────────────────────────────────────────────────────

  const cleanupAudioMonitoring = () => {
    cancelAnimationFrame(animationFrameRef.current);
    if (audioContextRef.current?.state !== "closed") {
      audioContextRef.current?.close();
    }
    audioContextRef.current = null;
    analyserRef.current = null;
  };

  // ── Voice recording ──────────────────────────────────────────────────────

  const startRecording = async () => {
    cancelledRef.current = false;
    setRecordingError(null);

    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 44100,
        },
      });
    } catch (err) {
      const msg =
        err.name === "NotAllowedError"
          ? "Microphone access denied. Please allow it and try again."
          : err.name === "NotFoundError"
          ? "No microphone found on this device."
          : "Could not access microphone. Check your settings.";
      setRecordingError(msg);
      setTimeout(() => setRecordingError(null), 8000);
      return;
    }

    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 256;
    audioCtx.createMediaStreamSource(stream).connect(analyser);
    audioContextRef.current = audioCtx;
    analyserRef.current = analyser;

    const monitorLevel = () => {
      if (!analyserRef.current || !isRecordingRef.current) return;
      const data = new Uint8Array(analyserRef.current.frequencyBinCount);
      analyserRef.current.getByteFrequencyData(data);
      const avg = data.reduce((s, v) => s + v, 0) / data.length;
      setAudioLevel(Math.min(avg / 128, 1));
      animationFrameRef.current = requestAnimationFrame(monitorLevel);
    };

    const mimeType =
      ["audio/mp4", "audio/mpeg", "audio/webm;codecs=opus", "audio/webm"]
        .find(t => MediaRecorder.isTypeSupported(t)) || "";

    const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : {});
    mediaRecorderRef.current = recorder;
    const chunks = [];

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };

    recorder.onstop = async () => {
      stream.getTracks().forEach(t => t.stop());
      cleanupAudioMonitoring();
      if (cancelledRef.current) return;
      const blob = new Blob(chunks, { type: recorder.mimeType || "audio/webm" });
      await sendVoiceMessage(blob, recorder.mimeType);
    };

    recorder.start(100);
    setIsRecording(true);
    setIsRecordingPaused(false);
    isRecordingRef.current = true;
    setRecordingTime(0);
    setAudioLevel(0);

    monitorLevel();

    recordingTimerRef.current = setInterval(() => {
      setRecordingTime(prev => {
        if (prev >= 299) {
          stopRecording();
          return 300;
        }
        return prev + 1;
      });
    }, 1000);

    recordingAutoStopRef.current = setTimeout(() => {
      if (isRecordingRef.current) stopRecording();
    }, 300_000);
  };

  const stopRecording = () => {
    if (!isRecordingRef.current || !mediaRecorderRef.current) return;
    if (mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    isRecordingRef.current = false;
    setIsRecording(false);
    setIsRecordingPaused(false);
    clearInterval(recordingTimerRef.current);
    clearTimeout(recordingAutoStopRef.current);
    cleanupAudioMonitoring();
  };

  const cancelRecording = () => {
    cancelledRef.current = true;
    if (mediaRecorderRef.current?.state !== "inactive") {
      mediaRecorderRef.current?.stop();
    }
    isRecordingRef.current = false;
    setIsRecording(false);
    setIsRecordingPaused(false);
    setIsLocked(false);
    setIsDragging(false);
    setDragOffset(0);
    setRecordingTime(0);
    setAudioLevel(0);
    clearInterval(recordingTimerRef.current);
    clearTimeout(recordingAutoStopRef.current);
    cleanupAudioMonitoring();
  };

  const pauseRecording = () => {
    if (!mediaRecorderRef.current || !isRecordingRef.current) return;
    if (mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.pause();
      setIsRecordingPaused(true);
      clearInterval(recordingTimerRef.current);
    } else if (mediaRecorderRef.current.state === "paused") {
      mediaRecorderRef.current.resume();
      setIsRecordingPaused(false);
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime(prev => {
          if (prev >= 299) { stopRecording(); return 300; }
          return prev + 1;
        });
      }, 1000);
    }
  };

  const sendVoiceMessage = async (audioBlob, mimeType = "") => {
    if (!currentChat || !audioBlob) return;

    setUploading(true);
    const ext = mimeType.includes("mp4") ? "m4a"
              : mimeType.includes("mpeg") ? "mp3"
              : "webm";
    const formData = new FormData();
    formData.append("audio", audioBlob, `voice-${Date.now()}.${ext}`);
    formData.append("messageType", "audio");
    if (replyingTo) formData.append("replyTo", replyingTo._id);

    try {
      const res = await api.post(`/api/chat/${currentChat._id}/messages`, formData);
      dispatch(addMessage(res.data));
      dispatch(setReplyingTo(null));
      socket?.emit("send_message", {
        chatId: currentChat._id,
        message: res.data,
        senderId: userData._id,
      });
      setRecordingTime(0);
      setAudioLevel(0);
      setIsLocked(false);
    } catch (err) {
      console.error("Send voice failed:", err);
      setRecordingError("Failed to send voice message. Please try again.");
      setTimeout(() => setRecordingError(null), 5000);
    } finally {
      setUploading(false);
    }
  };

  // ── Text message send ────────────────────────────────────────────────────

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (!content.trim() || !currentChat || uploading) return;

    setUploading(true);
    try {
      const res = await api.post(`/api/chat/${currentChat._id}/messages`, {
        content: content.trim(),
        replyTo: replyingTo?._id || null,
      });
      dispatch(addMessage(res.data));
      dispatch(setReplyingTo(null));
      setContent("");
      socket?.emit("send_message", {
        chatId: currentChat._id,
        message: res.data,
        senderId: userData._id,
      });
      emitTypingStop();
    } catch (err) {
      console.error("Send message failed:", err);
      alert("Failed to send message. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  // ── Mouse / touch drag-to-record ─────────────────────────────────────────

  const handleMouseDown = (e) => {
    if (uploading || isRecording) return;
    e.preventDefault();
    dragStartY.current = e.clientY;
    dragStartTime.current = Date.now();
    startRecording();
  };

  const handleMouseMove = (e) => {
    if (!isRecordingRef.current || isLocked) return;
    const delta = dragStartY.current - e.clientY;
    setDragOffset(Math.max(0, Math.min(delta, 100)));
    setIsDragging(delta > 10);
  };

  const handleMouseUp = (e) => {
    if (!isRecordingRef.current) return;
    const delta = dragStartY.current - e.clientY;
    const held = Date.now() - dragStartTime.current;
    resolveRecording(delta, held);
  };

  const handleMouseLeave = (e) => {
    if (!isRecordingRef.current || isLocked) return;
    const delta = dragStartY.current - e.clientY;
    if (delta > 60) cancelRecording();
  };

  const handleTouchStart = (e) => {
    if (uploading || isRecording) return;
    e.preventDefault();
    dragStartY.current = e.touches[0].clientY;
    dragStartTime.current = Date.now();
    startRecording();
  };

  const handleTouchMove = (e) => {
    if (!isRecordingRef.current || isLocked) return;
    e.preventDefault();
    const delta = dragStartY.current - e.touches[0].clientY;
    setDragOffset(Math.max(0, Math.min(delta, 100)));
    setIsDragging(delta > 10);
  };

  const handleTouchEnd = (e) => {
    if (!isRecordingRef.current) return;
    e.preventDefault();
    const delta = dragStartY.current - (e.changedTouches[0]?.clientY ?? dragStartY.current);
    const held = Date.now() - dragStartTime.current;
    resolveRecording(delta, held);
  };

  const resolveRecording = (delta, held) => {
    setIsDragging(false);
    setDragOffset(0);

    if (delta > 80 && !isLocked) {
      setIsLocked(true);
      return;
    }
    if (delta > 50 && held > 400) {
      cancelRecording();
      return;
    }
    if (held < 300) {
      cancelRecording();
      return;
    }
    stopRecording();
  };

  const handleCancelReply = () => dispatch(setReplyingTo(null));

  return (
    <div className="relative">
      {/* Reply preview */}
      {replyingTo && (
        <div className="px-3 sm:px-4 py-2 bg-slate-800/50 border-t border-slate-700/30 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <FaReply className="w-3 h-3 text-cyan-400 rotate-180 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-[10px] text-cyan-400 font-medium">
                Replying to {replyingTo.sender?.username || "message"}
              </p>
              <p className="text-xs text-slate-400 truncate">{replyingTo.content}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleCancelReply}
            className="p-1 text-slate-400 hover:text-red-400 transition flex-shrink-0"
          >
            <FaXmark className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Recording error */}
      {recordingError && (
        <div className="px-3 py-2 bg-red-500/15 border-t border-red-500/30 flex items-center gap-2 text-sm text-red-300">
          <div className="w-1.5 h-1.5 bg-red-400 rounded-full animate-pulse flex-shrink-0" />
          {recordingError}
        </div>
      )}

      {/* Emoji peek bar */}
      <div className={`transition-all duration-200 ${isRecording ? "h-0 overflow-hidden opacity-0" : "border-t border-slate-700/30 bg-slate-900/60 px-2 py-1"}`}>
        {!isRecording && (
          <div className="relative flex items-center">
            <EmojiPeekBar
              onSelect={handleQuickEmoji}
              onTogglePicker={() => setShowEmojiPicker(v => !v)}
              showPicker={showEmojiPicker}
            />

            {showEmojiPicker && (
              <div
                ref={emojiPickerRef}
                className="absolute bottom-full left-0 mb-2 z-50 shadow-2xl shadow-black/40 rounded-2xl overflow-hidden"
              >
                <EmojiPicker
                  onEmojiClick={handleEmojiClick}
                  theme="dark"
                  searchDisabled={false}
                  width={300}
                  height={380}
                  lazyLoadEmojis
                  skinTonesDisabled
                  previewConfig={{ showPreview: false }}
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Main input row */}
      <form
        onSubmit={handleSubmit}
        className="px-2 sm:px-4 py-2 sm:py-3 border-t border-slate-700/30 bg-slate-900/80 backdrop-blur-xl"
      >
        <div className="flex gap-2 items-end">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading || isRecording}
            className="p-2 sm:p-2.5 text-slate-400 hover:text-cyan-400 hover:bg-slate-800/60 transition rounded-xl disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0 mb-0.5"
            title="Send image"
          >
            <FaImage className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImageSelect}
            accept="image/*"
            className="hidden"
          />

          <div className="relative flex-shrink-0 mb-0.5">
            <button
              type="button"
                onClick={handleRandomGamePrompt}
                disabled={uploading || isRecording}
                className="p-2 sm:p-2.5 text-slate-400 hover:text-amber-300 hover:bg-slate-800/60 transition rounded-xl disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
                title="Send a random chat game prompt"
              >
                <FaBolt className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            <textarea
              ref={textareaRef}
              value={content}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder={isRecording ? "Recording…" : "Type a message…"}
              rows={1}
              disabled={isRecording}
              className="w-full resize-none px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl sm:rounded-2xl bg-slate-800/60 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:bg-slate-800/80 transition-all border border-slate-700/50 text-sm leading-relaxed disabled:opacity-50 disabled:cursor-not-allowed max-h-32 overflow-y-auto"
              style={{ fieldSizing: "content" }}
            />
          </div>

          <div className="relative flex-shrink-0 mb-0.5">
            <button
              ref={micButtonRef}
              type="button"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseLeave}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              disabled={uploading}
              className={`relative p-2 sm:p-2.5 transition-all rounded-xl disabled:opacity-40 disabled:cursor-not-allowed select-none ${
                isRecording
                  ? "text-white bg-red-500 shadow-lg shadow-red-500/40"
                  : "text-slate-400 hover:text-cyan-400 hover:bg-slate-800/60"
              }`}
              title={isRecording ? "Recording… release to send, slide up to cancel" : "Hold to record voice message"}
            >
              {isRecording ? (
                <FaStop className="w-4 h-4 sm:w-5 sm:h-5" />
              ) : (
                <FaMicrophone className="w-4 h-4 sm:w-5 sm:h-5" />
              )}
            </button>

            {isRecording && (
              <span className="absolute inset-0 rounded-xl bg-red-500/30 animate-ping pointer-events-none" />
            )}

            {isRecording && !isLocked && (
              <div
                className="absolute bottom-full left-1/2 pointer-events-none"
                style={{
                  transform: `translateX(-50%) translateY(${-8 - dragOffset * 0.6}px)`,
                  transition: isDragging ? "none" : "transform 0.2s",
                }}
              >
                <div
                  className={`flex flex-col items-center gap-1.5 px-3 py-2.5 rounded-2xl border backdrop-blur-md transition-all ${
                    isDragging
                      ? "bg-red-600/90 border-red-400 text-white"
                      : "bg-slate-800/90 border-slate-600/60 text-slate-300"
                  }`}
                >
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                      isDragging ? "bg-white/20 scale-110" : "bg-slate-600/40"
                    }`}
                  >
                    {isDragging ? (
                      <FaXmark className="w-5 h-5" />
                    ) : (
                      <FaMicrophone className="w-4 h-4" />
                    )}
                  </div>
                  <span className="text-[11px] font-medium whitespace-nowrap">
                    {isDragging ? "Release to cancel" : "Slide up to cancel"}
                  </span>
                </div>
              </div>
            )}

            {isRecording && dragOffset > 70 && !isLocked && (
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-28 pointer-events-none">
                <div className="flex flex-col items-center gap-1 px-2 py-1.5 rounded-xl bg-cyan-500/90 border border-cyan-400 text-white">
                  <FaLock className="w-3 h-3" />
                  <span className="text-[10px] font-medium">Lock</span>
                </div>
              </div>
            )}

            {isLocked && (
              <div className="absolute bottom-full right-0 mb-3 pointer-events-auto">
                <div className="flex flex-col items-center gap-3 p-3 rounded-2xl bg-slate-800/95 border border-slate-600/60 backdrop-blur-lg shadow-2xl min-w-[130px]">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
                    <span className="text-sm font-mono text-red-300 font-semibold tabular-nums">
                      {formatTime(recordingTime)}
                    </span>
                  </div>

                  <div className="flex items-end gap-0.5 h-6">
                    {Array.from({ length: 10 }, (_, i) => (
                      <div
                        key={i}
                        className="w-1.5 rounded-full transition-all duration-75"
                        style={{
                          height: `${audioLevel > (i + 1) / 10 ? 100 : 30}%`,
                          background: audioLevel > (i + 1) / 10
                            ? `hsl(${180 - i * 12}, 80%, 60%)`
                            : "rgba(100,120,140,0.35)",
                        }}
                      />
                    ))}
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={cancelRecording}
                      className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-700/60 rounded-lg transition"
                      title="Cancel"
                    >
                      <FaXmark className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={pauseRecording}
                      className="p-1.5 text-slate-400 hover:text-cyan-400 hover:bg-slate-700/60 rounded-lg transition"
                      title={isRecordingPaused ? "Resume" : "Pause"}
                    >
                      {isRecordingPaused ? (
                        <span className="text-[10px] font-bold">▶</span>
                      ) : (
                        <span className="text-[10px] font-bold">⏸</span>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={stopRecording}
                      className="p-1.5 bg-cyan-500 hover:bg-cyan-400 text-white rounded-lg transition shadow-md shadow-cyan-500/30"
                      title="Send"
                    >
                      <FaPaperPlane className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={!content.trim() || isRecording || uploading}
            className="flex items-center justify-center p-2 sm:p-2.5 bg-gradient-to-br from-cyan-500 to-cyan-600 text-white rounded-xl hover:from-cyan-400 hover:to-cyan-500 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:from-cyan-500 disabled:hover:to-cyan-600 transition-all shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/40 flex-shrink-0 mb-0.5"
          >
            <FaPaperPlane className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>

        {isRecording && !isLocked && (
          <div className="flex items-center gap-2 mt-1.5 px-1">
            <div className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
            <span className="text-xs font-mono text-red-300 tabular-nums">
              {formatTime(recordingTime)}
            </span>
            <div className="flex items-end gap-0.5 h-4 flex-1">
              {Array.from({ length: 16 }, (_, i) => (
                <div
                  key={i}
                  className="flex-1 rounded-full transition-all duration-75"
                  style={{
                    height: `${audioLevel > (i + 1) / 16 ? 100 : 20}%`,
                    background: audioLevel > (i + 1) / 16
                      ? "rgb(34 211 238)"
                      : "rgba(100,120,140,0.3)",
                  }}
                />
              ))}
            </div>
            <span className="text-[10px] text-slate-500">
              {isRecordingPaused ? "Paused" : "Recording…"}
            </span>
          </div>
        )}
      </form>
    </div>
  );
};

export default MessageInput;
