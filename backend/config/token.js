import jwt from "jsonwebtoken";

const genToken = (userId) => {
    if (!process.env.JWT_SECRET) {
        throw new Error("JWT_SECRET is not defined in .env");
    }

    return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: "3d" });
};

export default genToken;
