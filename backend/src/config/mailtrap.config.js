import { MailtrapClient } from "mailtrap";
import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

const token1 =
  process.env.mailtrap_token || "7c81d4d476849911e7f6746a4153780e";
const token2 =
  process.env.MAILTRAP_TOKEN_SECONDARY || "be33e4b271efd37fcb0d7c0c61f796e4";

export const clientTsi = new MailtrapClient({ token: token1 });
export const clientYoh = new MailtrapClient({ token: token2 });

export const mailtrapSender = {
  email: "hello@demomailtrap.co",
  name: "Sentrix Security",
};

export const sendMailtrapApi = async ({ to, subject, html, text, category }) => {
  const recipientEmail = Array.isArray(to) ? to[0]?.email : to;
  const lower = String(recipientEmail || "").toLowerCase().trim();

  // If sending to Yohannis, prioritize Yohannis client
  if (lower === "yohannishailye2039@gmail.com") {
    try {
      return await clientYoh.send({
        from: mailtrapSender,
        to: [{ email: lower }],
        subject,
        html,
        text,
        category,
      });
    } catch (err) {
      console.warn("clientYoh send note:", err.message);
    }
  }

  // Otherwise prioritize Tsi client (tsitsi3632@gmail.com is primary)
  try {
    return await clientTsi.send({
      from: mailtrapSender,
      to: [{ email: lower }],
      subject,
      html,
      text,
      category,
    });
  } catch (err) {
    console.warn("clientTsi send note:", err.message);
    return await clientYoh.send({
      from: mailtrapSender,
      to: [{ email: lower }],
      subject,
      html,
      text,
      category,
    });
  }
};

const smtpHost = process.env.SMTP_HOST || "sandbox.smtp.mailtrap.io";
const smtpPort = parseInt(process.env.SMTP_PORT || "2525", 10);
const smtpUser = process.env.SMTP_USER || "70b640bcf4f8e7";
const smtpPass = process.env.SMTP_PASS || "7d1c6f0e95ba41";
const smtpSecure = process.env.SMTP_SECURE === "true" || smtpPort === 465;

export const client = nodemailer.createTransport({
  host: smtpHost,
  port: smtpPort,
  secure: smtpSecure,
  auth:
    smtpUser && smtpPass
      ? {
          user: smtpUser,
          pass: smtpPass,
        }
      : undefined,
  tls: {
    rejectUnauthorized: false,
  },
});

export const defaultSender =
  process.env.SMTP_FROM || '"Sentrix Security" <hello@demomailtrap.co>';
