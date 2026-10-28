import mongoose from "mongoose";
import Auth from "./auth.model.js";

export const User =
  mongoose.models.User || mongoose.model("User", Auth.schema, "users");

export default User;
