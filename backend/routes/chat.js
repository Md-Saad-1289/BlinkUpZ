import express from "express";
import { getChats, createChat, getMessages, sendMessage, markMessagesSeen, deleteMessage, editMessage } from "../controllers/chat.controller.js";
import isAuth from "../middlewares/isAuth.js";
import { upload } from "../middlewares/multer.js";

const chatRouter = express.Router();

chatRouter.get("/", isAuth, getChats);
chatRouter.post("/", isAuth, createChat);
chatRouter.get("/:chatId/messages", isAuth, getMessages);
chatRouter.post("/:chatId/messages", isAuth, upload.single("image"), sendMessage);
chatRouter.put("/:chatId/messages/seen", isAuth, markMessagesSeen);
chatRouter.delete("/messages/:messageId", isAuth, deleteMessage);
chatRouter.put("/messages/:messageId", isAuth, editMessage);

export default chatRouter;