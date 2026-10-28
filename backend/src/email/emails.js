import { client } from "../config/mailtrap.config.js";
import {
  VERIFICATION_EMAIL_REQUEST_TEMPLATE,
  WELCOME_EMAIL_REQUEST_TEMPLATE,
  PASSWORD_RESET_REQUEST_TEMPLATE,
  PASSWORD_RESET_SUCCESS_REQUEST_TEMPLATE,
} from "./emailTemplates.js";

export const sendVerificationEmail = async (
  email,
  verificationToken,
  explore_link,
  FullName,
  Support_Email,
  year
) => {
  try {
    const response = await client.sendMail({
      from: `"Sentrix Security" <no-reply@sentrix.local>`,
      to: email,
      subject: "Verify Your Sentrix Account",
      html: VERIFICATION_EMAIL_REQUEST_TEMPLATE
        .replace("{{first_name}}", FullName)
        .replace("{{verification_code}}", verificationToken)
        .replace("{{verification_link}}", explore_link)
        .replace("{{support_email}}", Support_Email)
        .replace("{{year}}", year),
    });
    console.log("📧 Sent verification email to:", email);
    return response;
  } catch (err) {
    console.error("❌ Error sending email:", err.response?.data || err.message);
  }
};

export const sendWelcomeEmail = async (
  email,
  name,
  logo,
  explore_link,
  support_email,
  year
) => {
  try {
    const response = await client.sendMail({
      from: `"Sentrix Security" <no-reply@sentrix.local>`,
      to: email,
      subject: "Welcome to Sentrix Platform!",
      html: WELCOME_EMAIL_REQUEST_TEMPLATE
        .replace("{{logo_url}}", logo)
        .replace("{{first_name}}", name)
        .replace("{{explore_link}}", explore_link)
        .replace("{{support_email}}", support_email)
        .replace("{{year}}", year),
    });
    console.log("📧 Sent Welcome email to:", email);
    return response;
  } catch (err) {
    console.log("Error sending welcome email: " + err.message);
  }
};

export const sendPasswordResetEmail = async (
  email,
  url,
  name,
  logo,
  support_email,
  year
) => {
  try {
    const response = await client.sendMail({
      from: `"Sentrix Security" <no-reply@sentrix.local>`,
      to: email,
      subject: "Reset Your Sentrix Password",
      html: PASSWORD_RESET_REQUEST_TEMPLATE
        .replace("{{reset_link}}", url)
        .replace("{{first_name}}", name)
        .replace("{{logo_url}}", logo)
        .replace("{{support_email}}", support_email)
        .replace("{{year}}", year),
    });
    console.log("📧 Sent password reset email to:", email);
    return response;
  } catch (err) {
    console.error("Error sending reset password email: " + err.message);
  }
};

export const sendResetSuccessEmail = async (
  email,
  logo,
  name,
  login_link,
  support_email,
  year
) => {
  try {
    const response = await client.sendMail({
      from: `"Sentrix Security" <no-reply@sentrix.local>`,
      to: email,
      subject: "Password Reset Successful",
      html: PASSWORD_RESET_SUCCESS_REQUEST_TEMPLATE
        .replace("{{first_name}}", name)
        .replace("{{logo_url}}", logo)
        .replace("{{login_link}}", login_link)
        .replace("{{support_email}}", support_email)
        .replace("{{year}}", year),
    });
    console.log("📧 Sent password reset success email to:", email);
    return response;
  } catch (err) {
    console.log("Error sending reset success email: " + err.message);
  }
};
