import { useEffect } from "react";
import api from "../api.js";
import { useDispatch, useSelector } from "react-redux";
import { setMessages, setLoading, setError } from "../redux/chatSlice";

const useGetMessages = (chatId) => {
  const dispatch = useDispatch();
  const { userData } = useSelector((state) => state.user);
  const { messages } = useSelector((state) => state.chat);

  useEffect(() => {
    if (!userData) return;

    if (!chatId) {
      dispatch(setMessages([]));
      dispatch(setLoading(false));
      dispatch(setError(null));
      return;
    }

    const fetchMessages = async () => {
      dispatch(setLoading(true));
      try {
        const res = await api.get(`/api/chat/${chatId}/messages`);
        dispatch(setMessages(res.data));
      } catch (err) {
        console.error("Fetch messages failed:", err);
        dispatch(setError("Failed to load messages"));
        dispatch(setMessages([]));
      } finally {
        dispatch(setLoading(false));
      }
    };

    fetchMessages();
  }, [chatId, userData, dispatch]);

  return messages;
};

export default useGetMessages;