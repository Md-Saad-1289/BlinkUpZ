import React, { useEffect, useRef, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useSocket } from "../context/SocketContext";
import { addMessage, setReplyingTo, markMessageSeen } from "../redux/chatSlice";
import useGetMessages from "../Hooks/useGetMessages";
import MessageInput from "./MessageInput";
import ImageViewer from "./ImageViewer";
import { FaPhone, FaVideo, FaEllipsisVertical, FaCheck, FaCheckDouble, FaReply, FaTrash, FaPencil, FaHeart, FaThumbsUp, FaLaugh, FaAngry } from "react-icons/fa6";
import axios from "axios";
import { serverUrl } from "../config";

// Helper to format date
const formatMessageDate = (date) => {
  const d = new Date(date);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString();
};

// Group messages by date
const groupMessagesByDate = (messages) => {
  const groups = {};
  messages.forEach((msg) => {
    const dateKey = new Date(msg.createdAt).toDateString();
    if (!groups[dateKey]) groups[dateKey] = [];
    groups[dateKey].push(msg);
  });
  return groups;
};

const ChatWindow = () => {
  const dispatch = useDispatch();
  const socket = useSocket();
  const { currentChat, messages } = useSelector((state) => state.chat);
  const { userData, onlineUsers } = useSelector((state) => state.user);
  const messagesEndRef = useRef(null);
  const [viewingImage, setViewingImage] = useState(null);
  const [editingMessage, setEditingMessage] = useState(null);
  const [showMessageMenu, setShowMessageMenu] = useState(null); // messageId for menu
  const [typingUsers, setTypingUsers] = useState([]);
  const [isWindowFocused, setIsWindowFocused] = useState(true);

  useGetMessages(currentChat?._id);

  // Delete message function
  const handleDeleteMessage = async (messageId) => {
    try {
      await axios.delete(`${serverUrl}/api/chat/messages/${messageId}`, {
        withCredentials: true
      });
      // Update local state - mark as deleted
      dispatch({ type: 'chat/updateMessageContent', payload: { messageId, content: 'This message was deleted', deleted: true } });
      setShowMessageMenu(null);
    } catch (error) {
      console.error("Failed to delete message:", error);
    }
  };

  // Edit message function
  const handleEditMessage = async (messageId, newContent) => {
    try {
      const response = await axios.put(`${serverUrl}/api/chat/messages/${messageId}`, 
        { content: newContent },
        { withCredentials: true }
      );
      // Update local state
      dispatch({ type: 'chat/updateMessageContent', payload: { messageId, content: newContent, edited: true } });
      setEditingMessage(null);
    } catch (error) {
      console.error("Failed to edit message:", error);
    }
  };

  // Toggle reaction function
  const handleToggleReaction = async (messageId, emoji) => {
    try {
      const response = await axios.post(`${serverUrl}/api/chat/messages/${messageId}/reactions`, 
        { emoji },
        { withCredentials: true }
      );
      // Update local state
      dispatch({ type: 'chat/updateMessageReactions', payload: { messageId, reactions: response.data.reactions } });
    } catch (error) {
      console.error("Failed to toggle reaction:", error);
    }
  };

  // Get other participant
  const otherParticipant = currentChat?.participants?.find(
    (p) => p._id !== userData?._id
  );
  const isOtherOnline = onlineUsers[otherParticipant?._id] === 'online';

  // Handle ESC key to close image viewer
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && viewingImage) {
        setViewingImage(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [viewingImage]);

  // Handle window focus
  useEffect(() => {
    const handleFocus = () => setIsWindowFocused(true);
    const handleBlur = () => setIsWindowFocused(false);
    
    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);
    
    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
    };
  }, []);

  useEffect(() => {
    if (socket && currentChat) {
      socket.emit("join_chat", currentChat._id);

      socket.on("receive_message", (message) => {
        const exists = messages.some((m) => m._id === message._id);
        if (!exists) {
          dispatch(addMessage(message));
          
          // Show notification if window is not focused and message is not from current user
          if (!isWindowFocused && message.sender._id !== userData._id && 'Notification' in window) {
            if (Notification.permission === 'granted') {
              const notification = new Notification(`New message from ${message.sender.name || message.sender.username}`, {
                body: message.content.length > 50 ? message.content.substring(0, 50) + '...' : message.content,
                icon: message.sender.image || '/logo.png',
                tag: `chat-${currentChat._id}`,
                requireInteraction: false
              });
              
              notification.onclick = () => {
                window.focus();
                notification.close();
              };
              
              // Auto close after 5 seconds
              setTimeout(() => notification.close(), 5000);
            }
          }
        }
      });

      socket.on("message_seen", ({ messageId, userId }) => {
        if (userId === userData._id) {
          dispatch(markMessageSeen(messageId));
        }
      });

      socket.on("typing_start", ({ userId, chatId }) => {
        if (chatId === currentChat._id && userId !== userData._id) {
          setTypingUsers(prev => {
            if (!prev.includes(userId)) {
              return [...prev, userId];
            }
            return prev;
          });
        }
      });

      socket.on("typing_stop", ({ userId, chatId }) => {
        if (chatId === currentChat._id) {
          setTypingUsers(prev => prev.filter(id => id !== userId));
        }
      });

      return () => {
        socket.off("receive_message");
        socket.off("message_seen");
        socket.off("typing_start");
        socket.off("typing_stop");
      };
    }
  }, [socket, currentChat, dispatch, messages, userData]);

  // Mark messages as seen when viewing
  useEffect(() => {
    if (socket && currentChat && messages.length > 0) {
      const unreadMessages = messages.filter(
        (m) => m.sender._id !== userData._id && !m.read
      );
      
      unreadMessages.forEach((msg) => {
        socket.emit("mark_seen", {
          chatId: currentChat._id,
          messageId: msg._id,
          userId: userData._id
        });
      });
    }
  }, [socket, currentChat, messages, userData]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (!currentChat) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-slate-400 bg-gradient-to-br from-slate-900 via-slate-900/50 to-slate-900/80 p-4">
        <div className="relative">
          <div className="w-20 sm:w-28 h-20 sm:h-28 rounded-2xl sm:rounded-3xl bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center border border-slate-700/50 shadow-2xl shadow-black/30">
            <svg className="w-8 sm:w-12 h-8 sm:h-12 text-cyan-500/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <div className="absolute -bottom-2 -right-2 w-8 sm:w-10 h-8 sm:h-10 rounded-lg sm:rounded-xl bg-gradient-to-br from-cyan-500 to-cyan-600 flex items-center justify-center shadow-lg shadow-cyan-500/30">
            <svg className="w-4 sm:w-5 h-4 sm:h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </div>
        </div>
        <div className="text-center px-4 mt-6 sm:mt-8">
          <p className="text-lg sm:text-xl font-semibold text-slate-200">Welcome to BlinkUpZ</p>
          <p className="text-xs sm:text-sm text-slate-500 mt-2">Select a conversation or start a new chat</p>
        </div>
      </div>
    );
  }

  const messageGroups = groupMessagesByDate(messages);

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Chat Header */}
      <div className="px-3 sm:px-6 py-2 sm:py-4 border-b border-slate-700/30 bg-slate-900/80 backdrop-blur-xl flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-4">
            <div className="relative">
              <img
                src={otherParticipant?.image || "/default-avatar.svg"}
                alt={otherParticipant?.username}
                className="w-10 sm:w-14 h-10 sm:h-14 rounded-xl sm:rounded-2xl object-cover border-2 border-cyan-500/50 shadow-lg shadow-cyan-500/20"
              />
              <span className={`absolute bottom-0 right-0 w-2.5 sm:w-3.5 h-2.5 sm:h-3.5 border-2 sm:border-3 border-slate-900 rounded-full ${isOtherOnline ? 'bg-green-500' : 'bg-slate-500'}`}></span>
            </div>
            <div>
              <h2 className="font-bold text-white text-sm sm:text-lg">
                {otherParticipant?.name || otherParticipant?.username}
              </h2>
              <p className={`text-[10px] sm:text-xs flex items-center gap-1 font-medium ${isOtherOnline ? 'text-green-400/90' : 'text-slate-500'}`}>
                {typingUsers.length > 0 ? (
                  <span className="text-cyan-400/90">
                    {typingUsers.length === 1 ? 'typing...' : `${typingUsers.length} typing...`}
                  </span>
                ) : isOtherOnline ? (
                  <>
                    <span className="w-1.5 sm:w-2 h-1.5 sm:h-2 bg-green-400 rounded-full animate-pulse"></span>
                    <span>Online</span>
                  </>
                ) : (
                  <span>Offline</span>
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-0.5 sm:gap-1.5">
            <button className="p-2 sm:p-3 hover:bg-slate-700/50 rounded-lg sm:rounded-xl transition text-slate-400 hover:text-cyan-400 hover:shadow-lg hover:shadow-cyan-500/10">
              <FaPhone className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
            <button className="p-2 sm:p-3 hover:bg-slate-700/50 rounded-lg sm:rounded-xl transition text-slate-400 hover:text-cyan-400 hover:shadow-lg hover:shadow-cyan-500/10">
              <FaVideo className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
            <button className="p-2 sm:p-3 hover:bg-slate-700/50 rounded-lg sm:rounded-xl transition text-slate-400 hover:text-cyan-400 hover:shadow-lg hover:shadow-cyan-500/10">
              <FaEllipsisVertical className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 bg-gradient-to-b from-slate-950 via-slate-900/90 to-slate-900 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
        {Object.entries(messageGroups).map(([dateKey, msgs]) => (
          <div key={dateKey}>
            {/* Date Separator */}
            <div className="flex items-center justify-center my-6">
              <div className="flex items-center gap-3 w-full max-w-xs">
                <div className="flex-1 h-px bg-gradient-to-r from-transparent via-slate-600/30 to-transparent"></div>
                <span className="px-3 py-1.5 bg-slate-800/90 backdrop-blur-md rounded-full text-xs font-medium text-slate-400 border border-slate-700/50 shadow-sm">
                  {formatMessageDate(msgs[0].createdAt)}
                </span>
                <div className="flex-1 h-px bg-gradient-to-r from-transparent via-slate-600/30 to-transparent"></div>
              </div>
            </div>
            
            {/* Messages for this date */}
            {msgs.map((message, index) => {
              const isOwn = message.sender._id === userData._id;
              const showAvatar = !isOwn && (index === 0 || msgs[index - 1].sender._id !== message.sender._id);
              
              return (
                <div
                  key={message._id}
                  className={`flex mb-3 ${isOwn ? "justify-end" : "justify-start"} animate-in fade-in slide-in-from-bottom-2 duration-300 group`}
                >
                  className={`flex flex-col ${isOwn ? "items-end" : "items-start"} gap-1.5 max-w-[90%] sm:max-w-[70%]`}
                    {/* Avatar for received messages */}
                    {!isOwn && showAvatar && (
                      <div className="flex items-center gap-2 mb-1">
                        <img
                          src={message.sender.image || "/default-avatar.svg"}
                          alt={message.sender.username}
                          className="w-6 h-6 rounded-full object-cover border border-slate-600"
                        />
                        <span className="text-xs font-medium text-cyan-400/80">
                          {message.sender.name || message.sender.username}
                        </span>
                      </div>
                    )}
                    
                    {/* Reply Preview */}
                    {message.replyTo && (
                      <div className={`flex items-center gap-2 px-3 py-2 rounded-lg mb-1 max-w-full ${isOwn ? "bg-cyan-600/20" : "bg-slate-700/50"}`}>
                        <FaReply className={`w-3 h-3 flex-shrink-0 ${isOwn ? "text-cyan-300" : "text-cyan-400"}`} />
                        <div className="flex-1 min-w-0">
                          <p className={`text-[10px] font-medium ${isOwn ? "text-cyan-200" : "text-cyan-400"}`}>
                            {message.replyTo.sender?.username || 'User'}
                          </p>
                          <p className="text-xs text-slate-400 truncate">{message.replyTo.content}</p>
                        </div>
                      </div>
                    )}
                    
                    {/* Message Bubble */}
                    <div
                      className={`relative px-4 py-2.5 sm:px-5 sm:py-3 rounded-2xl shadow-md border transition-all duration-200 ${
                        isOwn
                          ? "bg-gradient-to-br from-cyan-500 via-cyan-500 to-cyan-600 text-white rounded-br-sm border-cyan-400/20 shadow-cyan-500/15 hover:shadow-cyan-500/25"
                          : "bg-gradient-to-br from-slate-700/90 to-slate-750/90 text-slate-100 rounded-bl-sm border-slate-600/30 shadow-slate-900/30 hover:shadow-lg"
                      }`}
                    >
                      {/* Deleted message */}
                      {message.deleted ? (
                        <p className="text-sm sm:text-base leading-relaxed italic text-slate-400 opacity-60">
                          <span className="line-through">{message.content}</span>
                        </p>
                      ) : message.messageType === "image" ? (
                        <div 
                          className="relative cursor-pointer"
                          onClick={() => setViewingImage(message.content)}
                        >
                          <img
                            src={message.content}
                            alt="Sent image"
                            className="max-w-full rounded-xl max-h-72 object-cover shadow-sm border border-slate-600/30 hover:opacity-90 transition-opacity"
                            onError={(e) => e.target.style.display = "none"}
                          />
                          {/* View indicator */}
                          <div className="absolute inset-0 flex items-center justify-center bg-black/20 rounded-xl opacity-0 hover:opacity-100 transition-opacity">
                            <span className="bg-black/60 px-3 py-1 rounded-full text-xs text-white">Click to view</span>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm sm:text-base leading-relaxed whitespace-pre-wrap">
                          {message.content}
                          {message.edited && <span className="text-[10px] ml-1 opacity-60">(edited)</span>}
                        </p>
                      )}
                      
                      {/* Reactions */}
                      {message.reactions && Object.keys(message.reactions).length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {Object.entries(message.reactions).map(([emoji, users]) => (
                            <button
                              key={emoji}
                              onClick={() => handleToggleReaction(message._id, emoji)}
                              className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-slate-700/50 hover:bg-slate-600/50 transition ${
                                users.includes(userData._id) ? 'ring-1 ring-cyan-400/50' : ''
                              }`}
                            >
                              <span>{emoji}</span>
                              <span className="text-slate-400">{users.length}</span>
                            </button>
                          ))}
                        </div>
                      )}
                      
                      {/* Quick reaction buttons */}
                      {!message.deleted && (
                        <div className="flex gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleToggleReaction(message._id, '👍')}
                            className="p-1 rounded-full bg-slate-700/50 hover:bg-slate-600/50 text-slate-400 hover:text-yellow-400 transition"
                          >
                            👍
                          </button>
                          <button
                            onClick={() => handleToggleReaction(message._id, '❤️')}
                            className="p-1 rounded-full bg-slate-700/50 hover:bg-slate-600/50 text-slate-400 hover:text-red-400 transition"
                          >
                            ❤️
                          </button>
                          <button
                            onClick={() => handleToggleReaction(message._id, '😂')}
                            className="p-1 rounded-full bg-slate-700/50 hover:bg-slate-600/50 text-slate-400 hover:text-yellow-400 transition"
                          >
                            😂
                          </button>
                          <button
                            onClick={() => handleToggleReaction(message._id, '😮')}
                            className="p-1 rounded-full bg-slate-700/50 hover:bg-slate-600/50 text-slate-400 hover:text-blue-400 transition"
                          >
                            😮
                          </button>
                        </div>
                      )}
                      
                      {/* Action buttons - only show for own non-deleted messages */}
                      {isOwn && !message.deleted && (
                        <div className={`absolute top-1/2 -translate-y-1/2 ${isOwn ? '-left-16' : '-right-16'} flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all duration-200`}>
                          {/* Reply Button */}
                          <button
                            onClick={() => dispatch(setReplyingTo(message))}
                            className="p-2 rounded-full bg-slate-700/80 text-slate-400 hover:text-cyan-400 hover:bg-slate-600/80 shadow-lg"
                          >
                            <FaReply className="w-3.5 h-3.5" />
                          </button>
                          {/* Edit Button */}
                          {message.messageType !== "image" && (
                            <button
                              onClick={() => setEditingMessage(message)}
                              className="p-2 rounded-full bg-slate-700/80 text-slate-400 hover:text-yellow-400 hover:bg-slate-600/80 shadow-lg"
                            >
                              <FaPencil className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {/* Delete Button */}
                          <button
                            onClick={() => setShowMessageMenu(message._id)}
                            className="p-2 rounded-full bg-slate-700/80 text-slate-400 hover:text-red-400 hover:bg-slate-600/80 shadow-lg"
                          >
                            <FaTrash className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}

                      {/* Menu button for all messages */}
                      <button
                        onClick={() => setShowMessageMenu(message._id)}
                        className={`absolute top-2 ${isOwn ? 'left-2' : 'right-2'} p-1.5 rounded-full bg-slate-700/60 text-slate-400 hover:text-white hover:bg-slate-600/80 transition-all duration-200 opacity-0 group-hover:opacity-100`}
                      >
                        <FaEllipsisVertical className="w-3 h-3" />
                      </button>
                      
                      {/* Subtle shine effect for own messages */}
                      {isOwn && !message.deleted && (
                        <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-white/0 via-white/5 to-white/0 pointer-events-none" />
                      )}
                    </div>
                    
                    {/* Delete/Edit Menu */}
                    {showMessageMenu === message._id && (
                      <div className={`absolute ${isOwn ? 'right-0' : 'left-0'} top-full mt-1 bg-slate-800/95 backdrop-blur-md rounded-xl shadow-xl border border-slate-700/50 py-2 z-50 min-w-[120px]`}>
                        <button
                          onClick={() => {
                            dispatch(setReplyingTo(message));
                            setShowMessageMenu(null);
                          }}
                          className="w-full px-4 py-2 text-left text-sm text-slate-300 hover:bg-slate-700/50 hover:text-cyan-400 flex items-center gap-2"
                        >
                          <FaReply className="w-3.5 h-3.5" />
                          Reply
                        </button>
                        {isOwn && !message.deleted && message.messageType !== "image" && (
                          <button
                            onClick={() => {
                              setEditingMessage(message);
                              setShowMessageMenu(null);
                            }}
                            className="w-full px-4 py-2 text-left text-sm text-slate-300 hover:bg-slate-700/50 hover:text-yellow-400 flex items-center gap-2"
                          >
                            <FaPencil className="w-3.5 h-3.5" />
                            Edit
                          </button>
                        )}
                        {isOwn && !message.deleted && (
                          <button
                            onClick={() => handleDeleteMessage(message._id)}
                            className="w-full px-4 py-2 text-left text-sm text-slate-300 hover:bg-slate-700/50 hover:text-red-400 flex items-center gap-2"
                          >
                            <FaTrash className="w-3.5 h-3.5" />
                            Delete
                          </button>
                        )}
                      </div>
                    )}
                    
                    {/* Timestamp and Read Status */}
                    <div className={`flex items-center gap-1.5 px-1 text-[10px] ${isOwn ? "flex-row-reverse" : "flex-row"}`}>
                      <span className="text-slate-500 font-medium">
                        {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {isOwn && !message.deleted && (
                        <span className={`text-xs ${message.read ? "text-cyan-400" : "text-slate-500"}`}>
                          <FaCheckDouble className="w-3 h-3" />
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="flex-shrink-0">
        <MessageInput />
      </div>

      {/* Image Viewer Modal */}
      {viewingImage && (
        <ImageViewer 
          image={viewingImage} 
          onClose={() => setViewingImage(null)} 
        />
      )}

      {/* Edit Message Modal */}
      {editingMessage && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-700/50 w-full max-w-md p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Edit Message</h3>
            <textarea
              defaultValue={editingMessage.content}
              className="w-full bg-slate-700/50 text-white rounded-xl p-4 border border-slate-600/50 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 outline-none resize-none"
              rows={4}
              id="editMessageText"
            />
            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={() => setEditingMessage(null)}
                className="px-4 py-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-700/50 transition"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const newContent = document.getElementById('editMessageText').value;
                  if (newContent.trim()) {
                    handleEditMessage(editingMessage._id, newContent);
                  }
                }}
                className="px-4 py-2 rounded-xl bg-cyan-500 text-white hover:bg-cyan-600 transition shadow-lg shadow-cyan-500/20"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatWindow;