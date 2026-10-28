import jwt from "jsonwebtoken";

const generateTokenAndSetCookie = (res, userID) => {
  const secret =
    process.env.Refresh_Secret_Key ||
    process.env.JWT_SECRET ||
    "Car-Rental-Secret-Key-123@";

  const refreshToken = jwt.sign({ userID, id: userID }, secret, {
    expiresIn: "7d",
  });

  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  };

  if (res && typeof res.cookie === "function") {
    res.cookie("refreshToken", refreshToken, cookieOptions);
    res.cookie("token", refreshToken, cookieOptions);
    res.cookie("sentrix_token", refreshToken, cookieOptions);
  }

  return refreshToken;
};

export default generateTokenAndSetCookie;
