import { useEffect } from "react";
import axios from "axios";
import { useDispatch, useSelector } from "react-redux";
import { serverUrl } from "../config.js";
import { setMessages, setLoading, setError } from "../redux/chatSlice";

const useGetMessages = (chatId) => {
  const dispatch = useDispatch();
  const { userData } = useSelector((state) => state.user);
  const { messages } = useSelector((state) => state.chat);

  useEffect(() => {
    if (!userData || !chatId) return;

    const fetchMessages = async () => {
      dispatch(setLoading(true));
      try {
        const res = await axios.get(`${serverUrl}/api/chat/${chatId}/messages`, {
          withCredentials: true,
        });
        dispatch(setMessages(res.data));
      } catch (err) {
        console.error("Fetch messages failed:", err);
        dispatch(setError("Failed to load messages"));
      } finally {
        dispatch(setLoading(false));
      }
    };

    fetchMessages();
  }, [chatId, userData, dispatch]);

  return messages;
};

export default useGetMessages;