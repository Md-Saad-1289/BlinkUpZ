import React, { useState, useRef, useEffect, useCallback } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useSocket } from "../context/SocketContext";
import api from "../api.js";
import { addMessage, setReplyingTo } from "../redux/chatSlice";
import {
  FaPaperPlane,
  FaImage,
  FaXmark,
  FaReply,
  FaMicrophone,
  FaStop,
  FaLock,
} from "react-icons/fa6";
import EmojiPicker from "emoji-picker-react";

// ─── Smart Emoji System ─────────────────────────────────────────────────────

const QUICK_EMOJIS = ["😂", "❤️", "👍", "😭", "🙏", "😍", "🔥", "😊", "🥺", "💀"];
const MAX_RECENT = 8;
const RECENT_KEY = "chat_recent_emojis_v2";

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
    setRecent((prev) => {
      const counts = {};
      prev.forEach((e) => (counts[e] = (counts[e] || 1)));
      counts[emoji] = (counts[emoji] || 1) + 2;

      const sorted = Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .map(([e]) => e)
        .slice(0, MAX_RECENT);

      saveRecentEmojis(sorted);
      return sorted;
    });

    onSelect(emoji);
  };

  const displayEmojis =
    recent.length > 0
      ? [...new Set([...recent, ...QUICK_EMOJIS])].slice(0, 12)
      : QUICK_EMOJIS;

  let pressTimer;

  const handlePressStart = () => {
    pressTimer = setTimeout(() => {
      onTogglePicker();
    }, 400);
  };

  const handlePressEnd = () => clearTimeout(pressTimer);

  return (
    <div className="flex items-center gap-1 px-1 overflow-x-auto scrollbar-none">
      {displayEmojis.map((emoji, i) => (
        <button
          key={i}
          type="button"
          onClick={() => handleSelect(emoji)}
          onMouseDown={handlePressStart}
          onMouseUp={handlePressEnd}
          onTouchStart={handlePressStart}
          onTouchEnd={handlePressEnd}
          className={`relative group text-lg p-1.5 rounded-xl transition-all duration-150 active:scale-90 hover:scale-125 ${
            i < 3
              ? "bg-gradient-to-br from-cyan-500/20 to-purple-500/20"
              : ""
          }`}
        >
          {emoji}

          {/* Hover Preview */}
          <span className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 scale-90 group-hover:scale-100 transition-all text-2xl bg-slate-800 px-2 py-1 rounded-lg shadow-xl pointer-events-none">
            {emoji}
          </span>
        </button>
      ))}

      {/* Expand */}
      <button
        type="button"
        onClick={onTogglePicker}
        className={`ml-1 px-2 py-1.5 rounded-xl text-sm font-bold ${
          showPicker
            ? "text-cyan-400 bg-cyan-500/20"
            : "text-slate-400 hover:text-cyan-400 hover:bg-slate-700/60"
        }`}
      >
        +
      </button>
    </div>
  );
};

// ─── Main Component ─────────────────────────────────────────────────────────

const MessageInput = () => {
  const [content, setContent] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [uploading, setUploading] = useState(false);

  const textareaRef = useRef(null);
  const emojiPickerRef = useRef(null);

  const dispatch = useDispatch();
  const socket = useSocket();
  const { currentChat, replyingTo } = useSelector((s) => s.chat);
  const { userData } = useSelector((s) => s.user);

  // ── Close picker outside ──
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

  // ── Insert emoji with animation ──
  const insertEmoji = (emoji) => {
    const ta = textareaRef.current;

    if (!ta) {
      setContent((p) => p + emoji);
      return;
    }

    const start = ta.selectionStart ?? content.length;
    const end = ta.selectionEnd ?? content.length;

    const next = content.slice(0, start) + emoji + content.slice(end);
    setContent(next);

    requestAnimationFrame(() => {
      ta.selectionStart = ta.selectionEnd = start + [...emoji].length;
      ta.focus();

      ta.classList.add("ring-2", "ring-cyan-400/40");
      setTimeout(() => {
        ta.classList.remove("ring-2", "ring-cyan-400/40");
      }, 150);
    });
  };

  const handleEmojiClick = (emojiData) => {
    insertEmoji(emojiData.emoji);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!content.trim() || !currentChat) return;

    setUploading(true);
    try {
      const res = await api.post(`/api/chat/${currentChat._id}/messages`, {
        content,
      });

      dispatch(addMessage(res.data));
      setContent("");

      socket?.emit("send_message", {
        chatId: currentChat._id,
        message: res.data,
        senderId: userData._id,
      });
    } catch (err) {
      console.error(err);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="relative">

      {/* Emoji Bar */}
      <div className="border-t border-slate-700/30 bg-slate-900/60 px-2 py-1">
        <div className="relative flex items-center">
          <EmojiPeekBar
            onSelect={insertEmoji}
            onTogglePicker={() => setShowEmojiPicker((v) => !v)}
            showPicker={showEmojiPicker}
          />

          {showEmojiPicker && (
            <div
              ref={emojiPickerRef}
              className="absolute bottom-full left-0 mb-2 z-50 shadow-2xl rounded-2xl overflow-hidden"
            >
              <EmojiPicker
                onEmojiClick={handleEmojiClick}
                theme="dark"
                width={300}
                height={380}
              />
            </div>
          )}
        </div>
      </div>

      {/* Input */}
      <form
        onSubmit={handleSubmit}
        className="px-3 py-2 border-t border-slate-700/30 bg-slate-900/80 flex gap-2"
      >
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Type message..."
          className="flex-1 resize-none px-3 py-2 rounded-xl bg-slate-800 text-white focus:outline-none"
        />

        <button
          type="submit"
          disabled={!content.trim() || uploading}
          className="p-2 bg-cyan-500 text-white rounded-xl"
        >
          <FaPaperPlane />
        </button>
      </form>
    </div>
  );
};

export default MessageInput;
