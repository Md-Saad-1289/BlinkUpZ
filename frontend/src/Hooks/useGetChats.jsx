import { useEffect } from "react";
import api from "../api.js";
import { useDispatch, useSelector } from "react-redux";
import { setChats, setLoading, setError } from "../redux/chatSlice";
import { useSocket } from "../context/SocketContext";

const useGetChats = () => {
  const dispatch = useDispatch();
  const socket = useSocket();
  const { userData } = useSelector((state) => state.user);
  const { chats } = useSelector((state) => state.chat);

  useEffect(() => {
    if (!userData) return;

    const fetchChats = async () => {
      dispatch(setLoading(true));
      try {
        const res = await api.get('/api/chat');
        dispatch(setChats(res.data));
      } catch (err) {
        console.error("Fetch chats failed:", err);
        dispatch(setError("Failed to load chats"));
      } finally {
        dispatch(setLoading(false));
      }
    };

    fetchChats();
  }, [userData, dispatch]);

  // Real-time update when new message arrives
  useEffect(() => {
    if (!socket || !userData) return;

    const handleNewMessage = (message) => {
      // Update the chat's last message and timestamp
      const updatedChats = chats.map((chat) => {
        const isParticipant = chat.participants.some(
          (p) => p._id === message.sender || p._id === message.receiver
        );
        if (isParticipant) {
          return {
            ...chat,
            lastMessage: {
              content: message.content,
              createdAt: message.createdAt,
            },
            updatedAt: message.createdAt,
          };
        }
        return chat;
      });
      dispatch(setChats(updatedChats));
    };

    socket.on("receive_message", handleNewMessage);

    return () => {
      socket.off("receive_message", handleNewMessage);
    };
  }, [socket, userData, dispatch, chats]);

  return chats;
};

export default useGetChats;