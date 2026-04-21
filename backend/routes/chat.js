import express from "express";
import { getChats, createChat, getMessages, sendMessage } from "../controllers/chat.controller.js";
import isAuth from "../middlewares/isAuth.js";
import { upload } from "../middlewares/multer.js";

const chatRouter = express.Router();

chatRouter.get("/", isAuth, getChats);
chatRouter.post("/", isAuth, createChat);
chatRouter.get("/:chatId/messages", isAuth, getMessages);
chatRouter.post("/:chatId/messages", isAuth, upload.single("image"), sendMessage);

export default chatRouter;