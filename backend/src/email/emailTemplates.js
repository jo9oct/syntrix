
export const VERIFICATION_EMAIL_REQUEST_TEMPLATE = `
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>Verify Your Email</title>
    <style>
      body {
        margin: 0;
        padding: 0;
        background-color: #f4f6f8;
        -webkit-text-size-adjust: 100%;
        -ms-text-size-adjust: 100%;
      }
      table {
        border-collapse: collapse;
      }
      img {
        border: 0;
        line-height: 100%;
        outline: none;
        text-decoration: none;
        display: block;
      }
      a {
        color: #1a73e8;
        text-decoration: none;
      }
      .wrapper {
        width: 100%;
        table-layout: fixed;
        background-color: #f4f6f8;
        padding: 20px 0;
      }
      .email-container {
        width: 100%;
        max-width: 680px;
        margin: 0 auto;
        background: #ffffff;
        border-radius: 10px;
        overflow: hidden;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
      }
      .header {
        padding: 20px;
        border-bottom: 1px solid #eef2f6;
      }
      .logo {
        width: 140px;
        height: auto;
      }
      .hero {
        padding: 28px 24px 10px 24px;
        text-align: left;
      }
      h1 {
        margin: 0 0 10px 0;
        font-size: 22px;
        font-family: Arial, sans-serif;
        color: #0f1724;
      }
      p {
        margin: 0 0 14px 0;
        font-size: 15px;
        font-family: Arial, sans-serif;
        color: #374151;
        line-height: 1.5;
      }
      .code-box {
        background: #f1f5f9;
        border: 1px dashed #cbd5e1;
        color: #111827;
        font-size: 28px;
        font-weight: bold;
        letter-spacing: 6px;
        text-align: center;
        padding: 18px 0;
        border-radius: 8px;
        margin: 24px 24px 8px 24px;
        font-family: "Courier New", monospace;
      }
      .button-wrap {
        text-align: center;
        padding: 10px 24px 28px 24px;
      }
      .btn {
        display: inline-block;
        background-color: #1a73e8;
        color: #ffffff;
        padding: 12px 28px;
        border-radius: 6px;
        font-family: Arial, sans-serif;
        font-size: 16px;
        text-decoration: none;
        font-weight: 600;
        transition: background 0.3s ease;
      }
      .btn:hover {
        background-color: #155bc4;
      }
      .muted {
        color: #6b7280;
        font-size: 13px;
      }
      .footer {
        padding: 18px 20px;
        font-size: 13px;
        color: #9ca3af;
        text-align: center;
        background: #f8fafc;
      }
      .small {
        font-size: 12px;
        color: #9ca3af;
      }
      @media screen and (max-width: 480px) {
        .hero {
          text-align: center;
          padding: 20px;
        }
        .code-box {
          width: 85%;
          margin: 20px auto;
        }
        .btn {
          width: 80%;
        }
      }
    </style>
  </head>

  <body>
    <!-- Hidden preheader text -->
    <div style="display:none; max-height:0; overflow:hidden; font-size:1px; color:#fff;">
      Verify your email to activate your CarRental account and start booking cars instantly.
    </div>

    <center class="wrapper">
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
        <tr>
          <td align="center">
            <table role="presentation" class="email-container" cellpadding="0" cellspacing="0" border="0">
              <!-- Header -->
              <tr>
                <td class="header">
                  <img src="{{logo_url}}" alt="CarRental" class="logo" />
                </td>
              </tr>

              <!-- Hero / greeting -->
              <tr>
                <td class="hero">
                  <h1>Hello {{first_name}},</h1>
                  <p>
                    Welcome to <strong>CarRental</strong>!  
                    Please verify your email address using the code below or click the button to complete your verification.
                  </p>
                </td>
              </tr>

              <!-- 6-Digit Verification Code -->
              <tr>
                <td>
                  <div class="code-box">{{verification_code}}</div>
                </td>
              </tr>

              <!-- Verify Button -->
              <tr>
                <td class="button-wrap">
                  <a href="{{verification_link}}" class="btn" target="_blank" rel="noopener">
                    Verify Your Email
                  </a>
                </td>
              </tr>

              <!-- Info -->
              <tr>
                <td style="padding: 0 24px 24px 24px;">
                  <p class="muted">
                    This code expires in <strong>10 minutes</strong>.  
                    If you didn’t request this, you can ignore this message.
                  </p>
                  <p class="muted" style="margin-top: 10px;">
                    Need help? Contact our support team at  
                    <a href="mailto:{{support_email}}">{{support_email}}</a>.
                  </p>
                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td class="footer">
                  <p>CarRental · 123 Main St · New York, NY</p>
                  <p class="small">© {{year}} CarRental. All rights reserved.</p>
                </td>
              </tr>

            </table>
          </td>
        </tr>
      </table>
    </center>
  </body>
</html>
`

export const WELCOME_EMAIL_REQUEST_TEMPLATE = `
<!doctype html>
<html lang="en">
    <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <title>Welcome to CarRental</title>
        <style>
            body { margin:0; padding:0; background:#f4f6f8; -webkit-text-size-adjust:100%; -ms-text-size-adjust:100%; }
            table { border-collapse:collapse; }
            img { border:0; line-height:100%; outline:none; text-decoration:none; -ms-interpolation-mode:bicubic; display:block; }
            a { color:#1a73e8; text-decoration:none; }
            .wrapper { width:100%; table-layout:fixed; background-color:#f4f6f8; padding:20px 0; }
            .email-container { width:100%; max-width:680px; margin:0 auto; background:#ffffff; border-radius:8px; overflow:hidden; }
            .header { padding:20px; border-bottom:1px solid #eef2f6; }
            .logo { width:140px; height:auto; display:block; }
            .hero { padding:24px 20px 12px 20px; text-align:left; }
            h1 { margin:0 0 12px 0; font-size:22px; font-family:Arial, sans-serif; color:#0f1724; }
            p { margin:0 0 12px 0; font-size:15px; font-family:Arial, sans-serif; color:#374151; line-height:1.5; }
            .button-wrap { padding:16px 20px 28px 20px; text-align:left; }
            .btn {
            display:inline-block;
            background-color:#1a73e8;
            color:#ffffff;
            padding:12px 22px;
            border-radius:6px;
            font-family:Arial, sans-serif;
            font-size:15px;
            font-weight:600;
            text-decoration:none;
            }
            .features { padding:0 20px 20px 20px; }
            .feature-item { margin-bottom:8px; font-size:15px; color:#374151; font-family:Arial, sans-serif; }
            .footer { padding:18px 20px; font-size:13px; color:#9ca3af; text-align:center; background:#f8fafc; }
            @media screen and (max-width:480px) {
            .hero, .button-wrap, .features { text-align:center; }
            .logo { margin:0 auto; }
            }
        </style>
    </head>
    <body>
        <center class="wrapper">
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
            <tr>
                <td align="center">
                <table role="presentation" class="email-container" cellpadding="0" cellspacing="0" border="0">

                <!-- Header -->
                <tr>
                <td class="header">
                    <img src="{{logo_url}}" alt="CarRental" class="logo" />
                </td>
                </tr>

                <!-- Hero Section -->
                <tr>
                <td class="hero">
                    <h1>Welcome to CarRental, {{first_name}}!</h1>
                    <p>We’re thrilled to have you on board. With CarRental, you can book your perfect ride in just a few clicks — anytime, anywhere.</p>
                    <p>Start exploring now and enjoy fast, secure, and reliable car rental services designed for your convenience.</p>
                </td>
                </tr>

                <!-- Call to Action -->
                <tr>
                <td class="button-wrap">
                    <a href="{{explore_link}}" class="btn" target="_blank" rel="noopener">Start Booking</a>
                </td>
                </tr>

                <!-- Key Features -->
                <tr>
                <td class="features">
                    <h2 style="font-family:Arial, sans-serif; font-size:18px; color:#0f1724; margin-bottom:8px;">What you can do:</h2>
                    <div class="feature-item">🚗 Browse available cars by model, location, or price.</div>
                    <div class="feature-item">💳 Book instantly with secure checkout.</div>
                    <div class="feature-item">📅 Manage your reservations anytime.</div>
                    <div class="feature-item">⭐ Earn loyalty points for every rental.</div>
                </td>
                </tr>

                <!-- Support Section -->
                <tr>
                <td style="padding:0 20px 24px 20px;">
                    <p style="font-size:14px; color:#6b7280;">If you ever need help, our support team is available 24/7 at 
                    <a href="mailto:{{support_email}}">{{support_email}}</a>.</p>
                </td>
                </tr>

                <!-- Footer -->
                <tr>
                <td class="footer">
                    <p style="margin:0 0 8px 0;">CarRental · 123 Main St · New York, NY</p>
                    <p style="margin:0 0 6px 0;">You’re receiving this email because you signed up for a CarRental account.</p>
                    <p style="margin:0 0 6px 0;">Need to unsubscribe? <a href="{{unsubscribe_link}}" style="color:#6b7280;">Click here</a>.</p>
                    <p style="margin:8px 0 0 0;">© {{year}} CarRental. All rights reserved.</p>
                </td>
                </tr>

            </table>
            </td>
        </tr>
        </table>

        </center>
    </body>
</html>

`

export const PASSWORD_RESET_REQUEST_TEMPLATE = `
<!doctype html>
<html lang="en">
    <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <title>Password Reset - CarRental</title>
        <style>
            body { margin:0; padding:0; background:#f4f6f8; -webkit-text-size-adjust:100%; -ms-text-size-adjust:100%; }
            table { border-collapse:collapse; }
            img { border:0; line-height:100%; outline:none; text-decoration:none; -ms-interpolation-mode:bicubic; display:block; }
            a { color:#1a73e8; text-decoration:none; }
            .wrapper { width:100%; table-layout:fixed; background-color:#f4f6f8; padding:20px 0; }
            .email-container { width:100%; max-width:680px; margin:0 auto; background:#ffffff; border-radius:8px; overflow:hidden; }
            .header { padding:20px; border-bottom:1px solid #eef2f6; }
            .logo { width:140px; height:auto; display:block; }
            .hero { padding:24px 20px 12px 20px; text-align:left; }
            h1 { margin:0 0 12px 0; font-size:22px; font-family:Arial, sans-serif; color:#0f1724; }
            p { margin:0 0 12px 0; font-size:15px; font-family:Arial, sans-serif; color:#374151; line-height:1.5; }
            .button-wrap { padding:16px 20px 28px 20px; text-align:left; }
            .btn {
            display:inline-block;
            background-color:#ef4444;
            color:#ffffff;
            padding:12px 22px;
            border-radius:6px;
            font-family:Arial, sans-serif;
            font-size:15px;
            font-weight:600;
            text-decoration:none;
            }
            .muted { color:#6b7280; font-size:13px; }
            .footer { padding:18px 20px; font-size:13px; color:#9ca3af; text-align:center; background:#f8fafc; }
            @media screen and (max-width:480px) {
            .hero, .button-wrap { text-align:center; }
            .logo { margin:0 auto; }
            }
        </style>
    </head>
    <body>
        <center class="wrapper">
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
            <tr>
                <td align="center">
                <table role="presentation" class="email-container" cellpadding="0" cellspacing="0" border="0">

                <!-- Header -->
                <tr>
                <td class="header">
                    <img src="{{logo_url}}" alt="CarRental" class="logo" />
                </td>
                </tr>

                <!-- Hero Section -->
                <tr>
                <td class="hero">
                    <h1>Reset your password</h1>
                    <p>Hi {{first_name}},</p>
                    <p>We received a request to reset the password for your CarRental account. Click the button below to choose a new password.</p>
                </td>
                </tr>

                <!-- Call to Action -->
                <tr>
                <td class="button-wrap">
                    <a href="{{reset_link}}" class="btn" target="_blank" rel="noopener">Reset Password</a>
                    <p class="muted" style="margin-top:16px;">
                    This link will expire in <strong>1 hour</strong> for your security.
                    </p>
                    <p class="muted">
                    If the button doesn’t work, copy and paste this link into your browser:
                    </p>
                    <p style="word-break:break-all;" class="muted">
                    <a href="{{reset_link}}" target="_blank" rel="noopener">{{reset_link}}</a>
                    </p>
                </td>
                </tr>

                <!-- Additional Info -->
                <tr>
                <td style="padding:0 20px 24px 20px;">
                    <p class="muted">Didn’t request a password reset? You can safely ignore this email. Your password will remain unchanged.</p>
                </td>
                </tr>

                <!-- Footer -->
                <tr>
                <td class="footer">
                    <p style="margin:0 0 8px 0;">CarRental · 123 Main St · New York, NY</p>
                    <p style="margin:0 0 6px 0;">Need help? Contact <a href="mailto:{{support_email}}">{{support_email}}</a>.</p>
                    <p style="margin:8px 0 0 0;">© {{year}} CarRental. All rights reserved.</p>
                </td>
                </tr>

            </table>
            </td>
        </tr>
        </table>

        </center>
    </body>
</html>

`

export const PASSWORD_RESET_SUCCESS_REQUEST_TEMPLATE = `
<!doctype html>
<html lang="en">
    <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <title>Password Reset Success - CarRental</title>
        <style>
            body { margin:0; padding:0; background:#f4f6f8; -webkit-text-size-adjust:100%; -ms-text-size-adjust:100%; }
            table { border-collapse:collapse; }
            img { border:0; line-height:100%; outline:none; text-decoration:none; -ms-interpolation-mode:bicubic; display:block; }
            a { color:#1a73e8; text-decoration:none; }
            .wrapper { width:100%; table-layout:fixed; background-color:#f4f6f8; padding:20px 0; }
            .email-container { width:100%; max-width:680px; margin:0 auto; background:#ffffff; border-radius:8px; overflow:hidden; }
            .header { padding:20px; border-bottom:1px solid #eef2f6; }
            .logo { width:140px; height:auto; display:block; }
            .hero { padding:24px 20px 12px 20px; text-align:left; }
            h1 { margin:0 0 12px 0; font-size:22px; font-family:Arial, sans-serif; color:#0f1724; }
            p { margin:0 0 12px 0; font-size:15px; font-family:Arial, sans-serif; color:#374151; line-height:1.5; }
            .button-wrap { padding:16px 20px 28px 20px; text-align:left; }
            .btn {
            display:inline-block;
            background-color:#10b981;
            color:#ffffff;
            padding:12px 22px;
            border-radius:6px;
            font-family:Arial, sans-serif;
            font-size:15px;
            font-weight:600;
            text-decoration:none;
            }
            .muted { color:#6b7280; font-size:13px; }
            .footer { padding:18px 20px; font-size:13px; color:#9ca3af; text-align:center; background:#f8fafc; }
            @media screen and (max-width:480px) {
            .hero, .button-wrap { text-align:center; }
            .logo { margin:0 auto; }
            }
        </style>
    </head>
    <body>
        <center class="wrapper">
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
            <tr>
                <td align="center">
                <table role="presentation" class="email-container" cellpadding="0" cellspacing="0" border="0">

                <!-- Header -->
                <tr>
                <td class="header">
                    <img src="{{logo_url}}" alt="CarRental" class="logo" />
                </td>
                </tr>

                <!-- Hero Section -->
                <tr>
                <td class="hero">
                    <h1>Password Reset Successful</h1>
                    <p>Hi {{first_name}},</p>
                    <p>This is a confirmation that your CarRental account password was successfully reset.</p>
                    <p>If you didn’t perform this action, please contact our support team immediately to secure your account.</p>
                </td>
                </tr>

                <!-- Call to Action -->
                <tr>
                <td class="button-wrap">
                    <a href="{{login_link}}" class="btn" target="_blank" rel="noopener">Log In to Your Account</a>
                    <p class="muted" style="margin-top:16px;">
                    Your account is now protected with your new password.
                    </p>
                </td>
                </tr>

                <!-- Footer -->
                <tr>
                <td class="footer">
                    <p style="margin:0 0 8px 0;">CarRental · 123 Main St · New York, NY</p>
                    <p style="margin:0 0 6px 0;">Need help? Contact <a href="mailto:{{support_email}}">{{support_email}}</a>.</p>
                    <p style="margin:8px 0 0 0;">© {{year}} CarRental. All rights reserved.</p>
                </td>
                </tr>

            </table>
            </td>
        </tr>
        </table>

        </center>
    </body>
</html>

`
