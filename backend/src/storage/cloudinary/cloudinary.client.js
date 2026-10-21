import { v2 as cloudinary } from "cloudinary";
import environment from "../../config/environment.js";

const { cloudName, apiKey, apiSecret } = environment.cloudinary;

if (!cloudName) {
  throw new Error(
    "Cloudinary configuration error: CLOUDINARY_CLOUD_NAME is required.",
  );
}

if (!apiKey) {
  throw new Error(
    "Cloudinary configuration error: CLOUDINARY_API_KEY is required.",
  );
}

if (!apiSecret) {
  throw new Error(
    "Cloudinary configuration error: CLOUDINARY_API_SECRET is required.",
  );
}

cloudinary.config({
  cloud_name: cloudName,
  api_key: apiKey,
  api_secret: apiSecret,
  secure: true,
});

const getCloudinaryClient = () => cloudinary;

export { cloudinary, getCloudinaryClient };
