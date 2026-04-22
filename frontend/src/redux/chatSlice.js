import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  chats: [],
  currentChat: null,
  messages: [],
  replyingTo: null,
  loading: false,
  error: null,
};

const chatSlice = createSlice({
  name: "chat",
  initialState,
  reducers: {
    setChats: (state, action) => {
      state.chats = action.payload;
    },
    setCurrentChat: (state, action) => {
      state.currentChat = action.payload;
    },
    setMessages: (state, action) => {
      state.messages = action.payload;
    },
    addMessage: (state, action) => {
      state.messages.push(action.payload);
    },
    setReplyingTo: (state, action) => {
      state.replyingTo = action.payload;
    },
    markMessageSeen: (state, action) => {
      const message = state.messages.find(m => m._id === action.payload);
      if (message) {
        message.read = true;
      }
    },
    updateMessageContent: (state, action) => {
      const { messageId, content, edited } = action.payload;
      const message = state.messages.find(m => m._id === messageId);
      if (message) {
        message.content = content;
        if (edited !== undefined) {
          message.edited = edited;
        }
      }
    },
    setLoading: (state, action) => {
      state.loading = action.payload;
    },
    setError: (state, action) => {
      state.error = action.payload;
    },
  },
});

export const { setChats, setCurrentChat, setMessages, addMessage, setReplyingTo, markMessageSeen, updateMessageContent, setLoading, setError } = chatSlice.actions;
export default chatSlice.reducer;