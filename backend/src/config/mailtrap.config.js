
// import { MailtrapClient } from "mailtrap"
// import dotenv from "dotenv";

// dotenv.config();

// const TOKEN = "7c81d4d476849911e7f6746a4153780e";

// export const client = new MailtrapClient({
//   token: TOKEN,
// });

// export const sender = {
//   email: "hello@demomailtrap.co",
//   name: "Mailtrap Test",
// };
import nodemailer from "nodemailer";

export const client = nodemailer.createTransport({
  host: "smtp.ethereal.email",
  port: 587,
  auth: {
    user: "lolita30@ethereal.email",
    pass: "1WFDfMS8jmHyAZmw2b",
  },
});
