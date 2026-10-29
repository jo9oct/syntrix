import {
  client,
  defaultSender,
  mailtrapSender,
  sendMailtrapApi,
} from "../config/mailtrap.config.js";
import {
  VERIFICATION_EMAIL_REQUEST_TEMPLATE,
  WELCOME_EMAIL_REQUEST_TEMPLATE,
  PASSWORD_RESET_REQUEST_TEMPLATE,
  PASSWORD_RESET_SUCCESS_REQUEST_TEMPLATE,
} from "./emailTemplates.js";

const sendMailWithRetry = async (mailOptions, retries = 2, delayMs = 2000) => {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await client.sendMail(mailOptions);
    } catch (err) {
      const isRateLimit =
        err.message?.includes("Too many emails") ||
        err.responseCode === 550 ||
        err.responseCode === 429;
      if (attempt < retries && isRateLimit) {
        console.warn(
          `⏳ Mail server rate limit reached. Retrying in ${delayMs}ms... (attempt ${attempt}/${retries})`
        );
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        continue;
      }
      throw err;
    }
  }
};

export const sendVerificationEmail = async (
  email,
  verificationToken,
  explore_link,
  FullName,
  Support_Email,
  year
) => {
  console.log(`\n======================================================`);
  console.log(`🔑 DISPATCHING VERIFICATION EMAIL`);
  console.log(`📧 Recipient: ${email}`);
  console.log(`🔢 Verification Code: ${verificationToken}`);
  console.log(`🔗 Link: ${explore_link}`);
  console.log(`======================================================\n`);

  const htmlContent = VERIFICATION_EMAIL_REQUEST_TEMPLATE
    .replace("{{first_name}}", FullName || "User")
    .replace("{{verification_code}}", verificationToken)
    .replace("{{verification_link}}", explore_link)
    .replace("{{support_email}}", Support_Email)
    .replace("{{year}}", String(year));

  const textContent = `Welcome ${FullName || "User"}!\n\nYour Sentrix verification code is: ${verificationToken}\n\nVerify your account: ${explore_link}\n\nSupport: ${Support_Email}`;

  // Priority 1: Try Mailtrap Live Sending API (delivers directly to real email inbox!)
  try {
    const apiRes = await sendMailtrapApi({
      to: email,
      subject: `Verify Your Sentrix Account [Code: ${verificationToken}]`,
      html: htmlContent,
      text: textContent,
      category: "Account Verification",
    });
    console.log(
      "✅ [LIVE INBOX DELIVERY] Sent verification email to:",
      email,
      apiRes
    );
    return apiRes;
  } catch (apiErr) {
    console.warn("⚠️ Mailtrap API send note:", apiErr.message);

    // If demo domain limit prevents direct delivery to this specific address, forward to both known owner inboxes so the tester always receives it in their Gmail!
    if (
      apiErr.message?.includes("Demo domains can only be used to send emails to account owners")
    ) {
      for (const ownerEmail of [
        "tsitsi3632@gmail.com",
        "yohannishailye2039@gmail.com",
      ]) {
        try {
          await sendMailtrapApi({
            to: ownerEmail,
            subject: `[For: ${email}] Verify Your Sentrix Account [Code: ${verificationToken}]`,
            html:
              `<p style="font-family:sans-serif;font-size:15px;"><strong>Sentrix Verification Code for ${email}:</strong> <span style="font-size:24px;font-weight:bold;letter-spacing:4px;color:#00e5ff;">${verificationToken}</span></p>` +
              htmlContent,
            text:
              `Verification Code for ${email}: ${verificationToken}\n\n` +
              textContent,
            category: "Account Verification",
          });
          console.log(`✅ Delivered verification copy to inbox: ${ownerEmail}`);
        } catch (fwdErr) {
          console.warn(`Forward to ${ownerEmail} note:`, fwdErr.message);
        }
      }
    }

    // Priority 2: Fallback to SMTP transport
    try {
      const smtpRes = await sendMailWithRetry({
        from: defaultSender,
        to: email,
        subject: `Verify Your Sentrix Account [Code: ${verificationToken}]`,
        html: htmlContent,
        text: textContent,
      });
      console.log(
        "📧 Sent verification email via SMTP to:",
        email,
        "MessageId:",
        smtpRes.messageId
      );
      return smtpRes;
    } catch (smtpErr) {
      console.error("❌ SMTP send note:", smtpErr.message);
      return { error: smtpErr.message, verificationToken };
    }
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
  const htmlContent = WELCOME_EMAIL_REQUEST_TEMPLATE
    .replace("{{logo_url}}", logo)
    .replace("{{first_name}}", name || "User")
    .replace("{{explore_link}}", explore_link)
    .replace("{{support_email}}", support_email)
    .replace("{{year}}", String(year));

  const textContent = `Welcome to Sentrix Platform, ${name || "User"}!\n\nExplore your dashboard: ${explore_link}\n\nSupport: ${support_email}`;

  try {
    const apiRes = await sendMailtrapApi({
      to: email,
      subject: "Welcome to Sentrix Platform!",
      html: htmlContent,
      text: textContent,
      category: "Welcome",
    });
    console.log("✅ Sent Welcome email to:", email);
    return apiRes;
  } catch {
    try {
      const response = await sendMailWithRetry({
        from: defaultSender,
        to: email,
        subject: "Welcome to Sentrix Platform!",
        html: htmlContent,
        text: textContent,
      });
      console.log("📧 Sent Welcome email via SMTP to:", email);
      return response;
    } catch (err) {
      console.error("❌ Error sending welcome email:", err.message);
      return { error: err.message };
    }
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
  console.log(`\n======================================================`);
  console.log(`🔑 DISPATCHING PASSWORD RESET EMAIL`);
  console.log(`📧 Recipient: ${email}`);
  console.log(`🔗 Reset Link: ${url}`);
  console.log(`======================================================\n`);

  const htmlContent = PASSWORD_RESET_REQUEST_TEMPLATE
    .replace("{{reset_link}}", url)
    .replace("{{first_name}}", name || "User")
    .replace("{{logo_url}}", logo)
    .replace("{{support_email}}", support_email)
    .replace("{{year}}", String(year));

  const textContent = `Hello ${name || "User"},\n\nClick the link below to reset your password:\n${url}\n\nIf you did not request this, please contact ${support_email}.`;

  // Priority 1: Try Mailtrap Live Sending API (delivers directly to real email inbox!)
  try {
    const apiRes = await sendMailtrapApi({
      to: email,
      subject: "Reset Your Sentrix Password",
      html: htmlContent,
      text: textContent,
      category: "Password Reset",
    });
    console.log(
      "✅ [LIVE INBOX DELIVERY] Sent password reset email to:",
      email,
      apiRes
    );
    return apiRes;
  } catch (apiErr) {
    console.warn("⚠️ Mailtrap API send note:", apiErr.message);

    if (
      apiErr.message?.includes("Demo domains can only be used to send emails to account owners")
    ) {
      for (const ownerEmail of [
        "tsitsi3632@gmail.com",
        "yohannishailye2039@gmail.com",
      ]) {
        try {
          await sendMailtrapApi({
            to: ownerEmail,
            subject: `[For: ${email}] Reset Your Sentrix Password`,
            html:
              `<p style="font-family:sans-serif;font-size:15px;"><strong>Password Reset Link for ${email}:</strong> <a href="${url}">${url}</a></p>` +
              htmlContent,
            text: `Password Reset Link for ${email}: ${url}\n\n` + textContent,
            category: "Password Reset",
          });
          console.log(`✅ Delivered password reset copy to inbox: ${ownerEmail}`);
        } catch {}
      }
    }

    // Priority 2: Fallback to SMTP transport
    try {
      const smtpRes = await sendMailWithRetry({
        from: defaultSender,
        to: email,
        subject: "Reset Your Sentrix Password",
        html: htmlContent,
        text: textContent,
      });
      console.log(
        "📧 Sent password reset email via SMTP to:",
        email,
        "MessageId:",
        smtpRes.messageId
      );
      return smtpRes;
    } catch (smtpErr) {
      console.error("❌ SMTP send note:", smtpErr.message);
      return { error: smtpErr.message };
    }
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
  const htmlContent = PASSWORD_RESET_SUCCESS_REQUEST_TEMPLATE
    .replace("{{first_name}}", name || "User")
    .replace("{{logo_url}}", logo)
    .replace("{{login_link}}", login_link)
    .replace("{{support_email}}", support_email)
    .replace("{{year}}", String(year));

  const textContent = `Hello ${name || "User"},\n\nYour Sentrix password has been successfully reset.\n\nSign in here: ${login_link}`;

  try {
    const apiRes = await sendMailtrapApi({
      to: email,
      subject: "Password Reset Successful",
      html: htmlContent,
      text: textContent,
      category: "Password Reset Success",
    });
    console.log("✅ Sent password reset success email to:", email);
    return apiRes;
  } catch {
    try {
      const response = await sendMailWithRetry({
        from: defaultSender,
        to: email,
        subject: "Password Reset Successful",
        html: htmlContent,
        text: textContent,
      });
      console.log("📧 Sent password reset success email via SMTP to:", email);
      return response;
    } catch (err) {
      console.error("❌ Error sending reset success email:", err.message);
      return { error: err.message };
    }
  }
};
