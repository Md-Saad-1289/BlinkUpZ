import uploadOnCloudinary from "../config/cloudinary.js";
import User from "../models/user.model.js";

// Get current user info
export const getCurrentUser = async (req, res) => {
  try {
    const userId = req.userId;
    const user = await User.findById(userId).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });

    res.status(200).json(user);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Get current user failed" });
  }
};

// Update profile: name + image
export const updateProfile = async (req, res) => {
  try {
    const userId = req.userId;
    const { name } = req.body;
    let imageUrl;

    if (req.file) {
      try {
        imageUrl = await uploadOnCloudinary(req.file.path);
      } catch (uploadError) {
        console.error("Cloudinary upload error:", uploadError);
        return res.status(500).json({ message: "Image upload failed" });
      }
    }

    const updateData = {};
    // Allow empty string as valid name update
    if (name !== undefined) updateData.name = name;
    if (imageUrl) updateData.image = imageUrl;

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ message: "No data to update" });
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      updateData,
      { new: true }
    ).select("-password");

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json(updatedUser);
  } catch (error) {
    console.error("Profile update error:", error);
    res.status(500).json({ message: "Profile update failed: " + error.message });
  }
};
