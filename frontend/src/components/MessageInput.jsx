import React, { useState, useRef, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useSocket } from "../context/SocketContext";
import api from '../api.js'
import { addMessage, setReplyingTo } from "../redux/chatSlice";
import { FaPaperPlane, FaImage, FaXmark, FaReply, FaFaceSmile, FaMicrophone, FaStop, FaLock, FaUnlock } from "react-icons/fa6";
import EmojiPicker from 'emoji-picker-react';

const MessageInput = () => {
  const [content, setContent] = useState("");
  const [uploading, setUploading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [recordingError, setRecordingError] = useState(null);
  const [audioLevel, setAudioLevel] = useState(0);
  const [showRecordingUI, setShowRecordingUI] = useState(false);
  const [recordingBlob, setRecordingBlob] = useState(null);
  const [isRecordingPaused, setIsRecordingPaused] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const fileInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const emojiPickerRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const recordingTimeoutRef = useRef(null);
  const recordingAutoStopRef = useRef(null);
  const isRecordingRef = useRef(false);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const microphoneRef = useRef(null);
  const animationFrameRef = useRef(null);
  const micButtonRef = useRef(null);
  const dragStartY = useRef(0);
  const dragStartTime = useRef(0);
  const dispatch = useDispatch();
  const socket = useSocket();
  const { currentChat, replyingTo } = useSelector((state) => state.chat);
  const { userData } = useSelector((state) => state.user);

  useEffect(() => {
    return () => {
      // Cleanup: stop typing when component unmounts or chat changes
      if (socket && currentChat && isTyping) {
        socket.emit("typing_stop", { 
          chatId: currentChat._id, 
          userId: userData._id,
          userName: userData.name || userData.username
        });
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      if (recordingTimeoutRef.current) {
        clearInterval(recordingTimeoutRef.current);
      }
      if (recordingAutoStopRef.current) {
        clearTimeout(recordingAutoStopRef.current);
      }
      cleanupAudioMonitoring();
    };
  }, [currentChat, socket, userData, isTyping]);

  const handleInputChange = (e) => {
    setContent(e.target.value);
    
    if (socket && currentChat && !isTyping) {
      socket.emit("typing_start", { 
        chatId: currentChat._id, 
        userId: userData._id,
        userName: userData.name || userData.username
      });
      setIsTyping(true);
    }
    
    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    // Set new timeout to stop typing
    typingTimeoutRef.current = setTimeout(() => {
      if (socket && currentChat && isTyping) {
        socket.emit("typing_stop", { 
          chatId: currentChat._id, 
          userId: userData._id,
          userName: userData.name || userData.username
        });
        setIsTyping(false);
      }
    }, 1000);
  };

  const handleImageSelect = async (e) => {
    const file = e.target.files[0];
    if (!file || !currentChat) return;

    setUploading(true);
    const formData = new FormData();
    formData.append("image", file);
    if (replyingTo) {
      formData.append("replyTo", replyingTo._id);
    }

    try {
      const res = await api.post(
        `/api/chat/${currentChat._id}/messages`,
        formData
      );

      dispatch(addMessage(res.data));
      dispatch(setReplyingTo(null));
      socket?.emit("send_message", {
        chatId: currentChat._id,
        message: res.data,
        senderId: userData._id,
      });
    } catch (error) {
      console.error("Send image failed:", error);
    } finally {
      setUploading(false);
      fileInputRef.current.value = "";
    }
  };

  // Voice recording functions
  const startRecording = async () => {
    try {
      setRecordingError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 44100
        }
      });

      // Setup audio context for level monitoring
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const analyser = audioContext.createAnalyser();
      const microphone = audioContext.createMediaStreamSource(stream);

      analyser.fftSize = 256;
      microphone.connect(analyser);
      audioContextRef.current = audioContext;
      analyserRef.current = analyser;
      microphoneRef.current = microphone;

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : 'audio/webm'
      });
      mediaRecorderRef.current = mediaRecorder;

      const chunks = [];
      mediaRecorder.ondataavailable = (e) => chunks.push(e.data);

      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunks, { type: mediaRecorder.mimeType });
        setRecordingBlob(blob);
        
        // Auto-send if not locked and not cancelled
        if (!isLocked) {
          await sendVoiceMessage(blob);
        }
        
        stream.getTracks().forEach(track => track.stop());
        cleanupAudioMonitoring();
      };

      mediaRecorder.start(100); // Collect data every 100ms
      setIsRecording(true);
      setIsRecordingPaused(false);
      isRecordingRef.current = true;
      setRecordingTime(0);
      setAudioLevel(0);

      // Start audio level monitoring
      const monitorAudioLevel = () => {
        if (!analyserRef.current) return;

        const bufferLength = analyserRef.current.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        analyserRef.current.getByteFrequencyData(dataArray);

        // Calculate average volume level
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const average = sum / bufferLength;
        setAudioLevel(Math.min(average / 128, 1)); // Normalize to 0-1

        if (isRecordingRef.current) {
          animationFrameRef.current = requestAnimationFrame(monitorAudioLevel);
        }
      };
      monitorAudioLevel();

      // Start timer
      recordingTimeoutRef.current = setInterval(() => {
        setRecordingTime(prev => {
          if (prev >= 299) { // Max 5 minutes
            stopRecording();
            return 300;
          }
          return prev + 1;
        });
      }, 1000);

      // Auto-stop after 5 minutes
      recordingAutoStopRef.current = setTimeout(() => {
        if (isRecordingRef.current) stopRecording();
      }, 300000);

    } catch (error) {
      console.error('Error starting recording:', error);
      let errorMessage = 'Unable to access microphone. ';
      if (error.name === 'NotAllowedError') {
        errorMessage += 'Please allow microphone access and try again.';
      } else if (error.name === 'NotFoundError') {
        errorMessage += 'No microphone found.';
      } else {
        errorMessage += 'Please check your microphone settings.';
      }
      setRecordingError(errorMessage);
      setTimeout(() => setRecordingError(null), 8000);
    }
  };

  const cleanupAudioMonitoring = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
    }
    audioContextRef.current = null;
    analyserRef.current = null;
    microphoneRef.current = null;
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecordingRef.current) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsRecordingPaused(false);
      isRecordingRef.current = false;
      if (recordingTimeoutRef.current) {
        clearInterval(recordingTimeoutRef.current);
      }
      if (recordingAutoStopRef.current) {
        clearTimeout(recordingAutoStopRef.current);
      }
      cleanupAudioMonitoring();
    }
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current && isRecordingRef.current) {
      if (mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.pause();
        setIsRecordingPaused(true);
        if (recordingTimeoutRef.current) {
          clearInterval(recordingTimeoutRef.current);
        }
      } else if (mediaRecorderRef.current.state === 'paused') {
        mediaRecorderRef.current.resume();
        setIsRecordingPaused(false);
        // Resume timer
        recordingTimeoutRef.current = setInterval(() => {
          setRecordingTime(prev => {
            if (prev >= 299) {
              stopRecording();
              return 300;
            }
            return prev + 1;
          });
        }, 1000);
      }
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    setIsRecordingPaused(false);
    setRecordingTime(0);
    setAudioLevel(0);
    setRecordingBlob(null);
    setShowRecordingUI(false);
    setIsDragging(false);
    setDragOffset(0);
    setIsLocked(false);
    isRecordingRef.current = false;
    if (recordingTimeoutRef.current) {
      clearInterval(recordingTimeoutRef.current);
    }
    if (recordingAutoStopRef.current) {
      clearTimeout(recordingAutoStopRef.current);
    }
    cleanupAudioMonitoring();
  };

  const sendVoiceMessage = async (audioBlob) => {
    if (!currentChat || !audioBlob) return;

    setUploading(true);
    setShowRecordingUI(false);
    const formData = new FormData();
    formData.append("audio", audioBlob, `voice-message-${Date.now()}.webm`);
    formData.append("messageType", "audio");
    if (replyingTo) {
      formData.append("replyTo", replyingTo._id);
    }

    try {
      const res = await api.post(
        `/api/chat/${currentChat._id}/messages`,
        formData
      );

      dispatch(addMessage(res.data));
      dispatch(setReplyingTo(null));
      socket?.emit("send_message", {
        chatId: currentChat._id,
        message: res.data,
        senderId: userData._id,
      });

      // Reset recording state
      setRecordingBlob(null);
      setRecordingTime(0);
      setAudioLevel(0);
      setIsLocked(false);
    } catch (error) {
      console.error("Send voice message failed:", error);
      setRecordingError('Failed to send voice message. Please try again.');
      setTimeout(() => setRecordingError(null), 5000);
      setShowRecordingUI(true); // Show UI again to retry
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!content.trim() || !currentChat) return;

    setUploading(true);
    try {
      const res = await api.post(
        `/api/chat/${currentChat._id}/messages`,
        { 
          content: content.trim(),
          replyTo: replyingTo?._id || null
        }
      );

      dispatch(addMessage(res.data));
      dispatch(setReplyingTo(null));
      setContent("");
      socket?.emit("send_message", {
        chatId: currentChat._id,
        message: res.data,
        senderId: userData._id,
      });
      
      // Stop typing
      if (isTyping) {
        socket?.emit("typing_stop", { 
          chatId: currentChat._id, 
          userId: userData._id,
          userName: userData.name || userData.username
        });
        setIsTyping(false);
      }
    } catch (error) {
      console.error("Send message failed:", error);
      alert("Failed to send message. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const handleCancelReply = () => {
    dispatch(setReplyingTo(null));
  };

  const handleMouseDown = (e) => {
    if (uploading || isRecording) return;
    e.preventDefault();
    dragStartY.current = e.clientY;
    dragStartTime.current = Date.now();
    startRecording();
  };

  const handleMouseMove = (e) => {
    if (!isRecording || isLocked) return;
    const currentY = e.clientY;
    const deltaY = dragStartY.current - currentY;
    setDragOffset(Math.max(0, Math.min(deltaY, 100))); // Limit to 100px up
    setIsDragging(deltaY > 10); // Start dragging after 10px
  };

  const handleMouseUp = (e) => {
    if (!isRecording) return;
    
    const deltaY = dragStartY.current - e.clientY;
    const holdTime = Date.now() - dragStartTime.current;
    
    if (deltaY > 50 && holdTime > 500) { // Slide up to cancel
      cancelRecording();
    } else if (deltaY > 80) { // Slide up to lock
      setIsLocked(true);
    } else if (holdTime < 500) { // Too short, cancel
      cancelRecording();
    } else { // Normal release, send
      stopRecording();
    }
    
    setIsDragging(false);
    setDragOffset(0);
  };

  const handleTouchStart = (e) => {
    if (uploading || isRecording) return;
    e.preventDefault();
    dragStartY.current = e.touches[0].clientY;
    dragStartTime.current = Date.now();
    startRecording();
  };

  const handleTouchMove = (e) => {
    if (!isRecording || isLocked) return;
    e.preventDefault();
    const currentY = e.touches[0].clientY;
    const deltaY = dragStartY.current - currentY;
    setDragOffset(Math.max(0, Math.min(deltaY, 100)));
    setIsDragging(deltaY > 10);
  };

  const handleTouchEnd = (e) => {
    if (!isRecording) return;
    e.preventDefault();
    
    const deltaY = dragStartY.current - (e.changedTouches[0]?.clientY || dragStartY.current);
    const holdTime = Date.now() - dragStartTime.current;
    
    if (deltaY > 50 && holdTime > 500) {
      cancelRecording();
    } else if (deltaY > 80) {
      setIsLocked(true);
    } else if (holdTime < 500) {
      cancelRecording();
    } else {
      stopRecording();
    }
    
    setIsDragging(false);
    setDragOffset(0);
  };

  return (
    <div className="relative">
      {/* Reply Preview */}
      {replyingTo && (
        <div className="px-2 sm:px-4 py-2 bg-slate-800/50 border-t border-slate-700/30 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <FaReply className="w-3 h-3 text-cyan-400 rotate-180 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-[10px] text-cyan-400 font-medium">Replying to {replyingTo.sender?.username || 'message'}</p>
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
      
      <form onSubmit={handleSubmit} className="p-2 sm:p-4 border-t border-slate-700/30 bg-slate-900/80 backdrop-blur-xl">
        {/* Recording Preview UI - Disabled for WhatsApp style */}
        {false && showRecordingUI && recordingBlob && (
          <div className="mb-4 p-4 bg-gradient-to-r from-slate-800/80 to-slate-700/80 backdrop-blur-lg rounded-2xl border border-slate-600/50 shadow-xl">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-cyan-500/20 border border-cyan-400/40">
                  <FaMicrophone className="w-5 h-5 text-cyan-400" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">Voice Message Recorded</h3>
                  <p className="text-xs text-slate-400">
                    {Math.floor(recordingTime / 60)}:{(recordingTime % 60).toString().padStart(2, '0')} • {(recordingBlob.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowRecordingUI(false)}
                  className="px-3 py-1.5 text-xs text-slate-300 hover:text-white hover:bg-slate-600/50 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => sendVoiceMessage(recordingBlob)}
                  disabled={uploading}
                  className="px-4 py-1.5 bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-xs font-medium rounded-lg hover:from-cyan-400 hover:to-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-lg shadow-cyan-500/20"
                >
                  {uploading ? 'Sending...' : 'Send Voice'}
                </button>
              </div>
            </div>
            {/* Simple waveform preview */}
            <div className="flex items-end justify-center gap-0.5 h-8 bg-slate-800/50 rounded-lg p-2">
              {Array.from({ length: 20 }, (_, i) => (
                <div
                  key={i}
                  className="flex-1 bg-gradient-to-t from-cyan-400 to-cyan-300 rounded-sm transition-all"
                  style={{
                    height: `${Math.random() * 60 + 20}%`,
                    opacity: i < (recordingTime / 3) % 20 ? 1 : 0.4
                  }}
                />
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-2 sm:gap-3 items-center">
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="p-2 sm:p-3 text-slate-400 hover:text-cyan-400 hover:bg-slate-800/60 transition rounded-lg sm:rounded-xl hover:shadow-lg hover:shadow-cyan-500/10"
            >
              <FaFaceSmile className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>

            {showEmojiPicker && (
              <div
                ref={emojiPickerRef}
                className="absolute bottom-full left-0 mb-2 z-40"
              >
                <EmojiPicker
                  onEmojiClick={handleEmojiClick}
                  theme="dark"
                  searchDisabled={false}
                  width={300}
                  height={400}
                />
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading || isRecording}
            className="p-2 sm:p-3 text-slate-400 hover:text-cyan-400 hover:bg-slate-800/60 transition rounded-lg sm:rounded-xl hover:shadow-lg hover:shadow-cyan-500/10 disabled:opacity-40 disabled:cursor-not-allowed"
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

          {/* Enhanced Voice Recording Button - WhatsApp Style */}
          <div className="relative">
            <button
              ref={micButtonRef}
              type="button"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              disabled={uploading}
              className={`relative p-2 sm:p-3 transition-all rounded-lg sm:rounded-xl disabled:opacity-40 disabled:cursor-not-allowed select-none ${
                isRecording
                  ? 'text-white bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 shadow-lg shadow-red-500/30'
                  : 'text-slate-400 hover:text-cyan-400 hover:bg-slate-800/60 hover:shadow-lg hover:shadow-cyan-500/10'
              } ${isRecording ? 'animate-pulse' : ''}`}
              title={isRecording ? 'Recording... Release to send, slide up to cancel' : 'Hold to record voice message'}
            >
              {isRecording ? <FaStop className="w-4 h-4 sm:w-5 sm:h-5" /> : <FaMicrophone className="w-4 h-4 sm:w-5 sm:h-5" />}
            </button>

            {/* Recording Animation Overlay */}
            {isRecording && (
              <div className="absolute inset-0 rounded-lg sm:rounded-xl bg-red-500/20 animate-ping"></div>
            )}

            {/* Drag Indicator */}
            {isRecording && !isLocked && (
              <div 
                className="absolute -top-16 left-1/2 transform -translate-x-1/2 transition-all duration-200"
                style={{ transform: `translateX(-50%) translateY(${Math.max(-dragOffset, -60)}px)` }}
              >
                <div className={`flex flex-col items-center gap-2 p-3 rounded-2xl backdrop-blur-lg border transition-all ${
                  isDragging 
                    ? 'bg-red-500/90 border-red-400 text-white shadow-xl' 
                    : 'bg-slate-800/90 border-slate-600 text-slate-300'
                }`}>
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                    isDragging ? 'bg-white/20 scale-110' : 'bg-slate-600/50'
                  }`}>
                    {isDragging ? <FaXmark className="w-6 h-6" /> : <FaMicrophone className="w-5 h-5" />}
                  </div>
                  <span className="text-xs font-medium whitespace-nowrap">
                    {isDragging ? 'Release to cancel' : 'Slide up to cancel'}
                  </span>
                </div>
              </div>
            )}

            {/* Lock Indicator */}
            {isRecording && dragOffset > 80 && !isLocked && (
              <div className="absolute -top-24 left-1/2 transform -translate-x-1/2">
                <div className="flex flex-col items-center gap-1 p-2 rounded-xl bg-cyan-500/90 border border-cyan-400 text-white shadow-xl">
                  <FaLock className="w-4 h-4" />
                  <span className="text-xs font-medium">Lock</span>
                </div>
              </div>
            )}

            {/* Locked Recording UI */}
            {isLocked && (
              <div className="absolute -top-32 left-1/2 transform -translate-x-1/2">
                <div className="flex flex-col items-center gap-3 p-4 rounded-2xl bg-gradient-to-r from-red-500/20 to-red-600/20 backdrop-blur-lg border border-red-500/40 shadow-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full bg-red-400 animate-pulse"></div>
                    <span className="text-sm font-mono text-red-300 font-semibold">
                      {Math.floor(recordingTime / 60)}:{(recordingTime % 60).toString().padStart(2, '0')}
                    </span>
                  </div>
                  
                  {/* Audio Level Indicator */}
                  <div className="flex items-center gap-1">
                    {Array.from({ length: 8 }, (_, i) => (
                      <div
                        key={i}
                        className={`w-1 rounded-full transition-all duration-100 ${
                          audioLevel > (i + 1) / 8 ? 'bg-red-400 h-4' : 'bg-red-400/30 h-2'
                        }`}
                      />
                    ))}
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setIsLocked(false)}
                      className="px-3 py-1.5 text-xs text-slate-300 hover:text-white hover:bg-slate-600/50 rounded-lg transition"
                      title="Unlock"
                    >
                      <FaUnlock className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={stopRecording}
                      className="px-4 py-1.5 bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-xs font-medium rounded-lg hover:from-cyan-400 hover:to-cyan-500 transition shadow-lg shadow-cyan-500/20"
                      title="Send"
                    >
                      <FaPaperPlane className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Error Message */}
          {recordingError && (
            <div className="flex items-center gap-2 px-3 py-2 bg-red-500/20 border border-red-500/40 rounded-xl text-sm text-red-300 animate-in fade-in shadow-lg">
              <div className="w-2 h-2 bg-red-400 rounded-full animate-pulse"></div>
              {recordingError}
            </div>
          )}

          <textarea
            value={content}
            onChange={handleInputChange}
            placeholder="Type a message..."
            rows={2}
            disabled={isRecording}
            className="flex-1 resize-none px-3 sm:px-5 py-2 sm:py-3 rounded-xl sm:rounded-2xl bg-slate-800/60 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:bg-slate-800/80 transition-all border border-slate-700/50 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <button
            type="submit"
            disabled={!content.trim() || isRecording}
            className="flex items-center justify-center p-2.5 sm:p-4 bg-gradient-to-r from-cyan-500 to-cyan-600 text-white rounded-xl sm:rounded-2xl hover:from-cyan-400 hover:to-cyan-500 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:from-cyan-500 disabled:hover:to-cyan-600 transition-all shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/40"
          >
            <FaPaperPlane className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>
      </form>
    </div>

  );
};

export default MessageInput;