import dotenv from "dotenv";
dotenv.config(); // Load env vars immediately when this module is imported

import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

// Initialize config after dotenv loads
const cloudName = (process.env.CLOUDINARY_CLOUD_NAME || '').replace(/"/g, '').trim();
const apiKey = (process.env.CLOUDINARY_API_KEY || '').replace(/"/g, '').trim();
const apiSecret = (process.env.CLOUDINARY_API_SECRET || '').replace(/"/g, '').trim();

console.log("Cloudinary init - cloudName:", cloudName ? "present" : "missing", "apiKey:", apiKey ? "present" : "missing");

cloudinary.config({
  cloud_name: cloudName,
  api_key: apiKey,
  api_secret: apiSecret,
});

const uploadOnCloudinary = async (filePath, folder = "chat_media") => {
  try {
    const result = await cloudinary.uploader.upload(filePath, {
      folder,
      resource_type: "auto",
    });
    fs.unlinkSync(filePath); // remove temp file
    return result.secure_url;
  } catch (error) {
    if (filePath && fs.existsSync(filePath)) fs.unlinkSync(filePath);
    console.error("Cloudinary upload error:", error);
    throw error;
  }
};

export default uploadOnCloudinary;
