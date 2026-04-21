import jwt from "jsonwebtoken";

const isAuth = (req, res, next) => {
  try {
    const token = req.cookies?.BlinkUpZToken;
    if (!token) {
      return res.status(401).json({ Message: "Unauthorized" });
    }

    const verifyToken = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = verifyToken.userId;
    next();
  } catch (error) {
    console.error("isAuth error:", error);
    return res.status(401).json({ Message: "Unauthorized" });
  }
};

export default isAuth;