export const VERIFICATION_EMAIL_REQUEST_TEMPLATE = `
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>Verify Your Email - Sentrix Security</title>
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
        color: #0284c7;
        text-decoration: none;
      }
      .wrapper {
        width: 100%;
        table-layout: fixed;
        background-color: #0f172a;
        padding: 30px 0;
      }
      .email-container {
        width: 100%;
        max-width: 600px;
        margin: 0 auto;
        background: #ffffff;
        border-radius: 12px;
        overflow: hidden;
        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
      }
      .header {
        padding: 24px 28px;
        background: #0b132b;
        border-bottom: 2px solid #0284c7;
      }
      .hero {
        padding: 32px 28px 12px 28px;
        text-align: left;
      }
      h1 {
        margin: 0 0 12px 0;
        font-size: 22px;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
        color: #0f172a;
      }
      p {
        margin: 0 0 14px 0;
        font-size: 15px;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
        color: #334155;
        line-height: 1.6;
      }
      .code-box {
        background: #f8fafc;
        border: 2px dashed #0284c7;
        color: #0f172a;
        font-size: 32px;
        font-weight: 800;
        letter-spacing: 8px;
        text-align: center;
        padding: 20px 0;
        border-radius: 8px;
        margin: 24px 28px 12px 28px;
        font-family: "Courier New", Courier, monospace;
      }
      .button-wrap {
        text-align: center;
        padding: 12px 28px 24px 28px;
      }
      .btn {
        display: inline-block;
        background-color: #0284c7;
        color: #ffffff !important;
        padding: 12px 32px;
        border-radius: 6px;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
        font-size: 15px;
        text-decoration: none;
        font-weight: 600;
      }
      .muted {
        color: #64748b;
        font-size: 13px;
      }
      .footer {
        padding: 22px 28px;
        font-size: 12px;
        color: #94a3b8;
        text-align: center;
        background: #f8fafc;
        border-top: 1px solid #e2e8f0;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
      }
      .small {
        font-size: 12px;
        color: #94a3b8;
      }
      @media screen and (max-width: 480px) {
        .hero {
          padding: 20px;
        }
        .code-box {
          font-size: 26px;
          letter-spacing: 5px;
          margin: 16px;
        }
        .btn {
          width: 85%;
        }
      }
    </style>
  </head>

  <body>
    <!-- Hidden preheader text -->
    <div style="display:none; max-height:0; overflow:hidden; font-size:1px; color:#fff;">
      Verify your email to activate your Sentrix Security account and protect your web applications.
    </div>

    <center class="wrapper">
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
        <tr>
          <td align="center">
            <table role="presentation" class="email-container" cellpadding="0" cellspacing="0" border="0">
              <!-- Header -->
              <tr>
                <td class="header">
                  <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                    <tr>
                      <td style="vertical-align: middle;">
                        <div style="display: inline-block; width: 36px; height: 36px; line-height: 36px; text-align: center; background: #0284c7; color: #ffffff; border-radius: 8px; font-size: 20px;">🛡️</div>
                      </td>
                      <td style="vertical-align: middle; padding-left: 12px;">
                        <span style="font-size: 20px; font-weight: 800; color: #ffffff; letter-spacing: 1px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;">SENTRIX</span>
                        <span style="display: block; font-size: 11px; font-weight: 600; color: #38bdf8; letter-spacing: 1.5px; text-transform: uppercase; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;">Security Platform</span>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              <!-- Hero / greeting -->
              <tr>
                <td class="hero">
                  <h1>Hello {{first_name}},</h1>
                  <p>
                    Welcome to <strong>Sentrix Security Platform</strong>!  
                    Please verify your email address to activate your account and start securing your web applications.
                  </p>
                  <p>
                    Enter the 6-digit verification code below in your verification screen:
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
                    Verify Your Account
                  </a>
                </td>
              </tr>

              <!-- Info -->
              <tr>
                <td style="padding: 0 28px 24px 28px;">
                  <p class="muted">
                    ⏰ This code expires in <strong>10 minutes</strong> and allows up to 3 attempts.  
                    If you didn’t request this registration, you can safely ignore this message.
                  </p>
                  <p class="muted" style="margin-top: 10px;">
                    Need assistance? Contact our security support team at  
                    <a href="mailto:{{support_email}}">{{support_email}}</a>.
                  </p>
                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td class="footer">
                  <p style="margin: 0 0 6px 0; font-weight: 600; color: #64748b;">Sentrix Security Platform · Automated Web Vulnerability Assessment</p>
                  <p class="small" style="margin: 0;">© {{year}} Sentrix Security. All rights reserved.</p>
                </td>
              </tr>

            </table>
          </td>
        </tr>
      </table>
    </center>
  </body>
</html>
`;

export const WELCOME_EMAIL_REQUEST_TEMPLATE = `
<!doctype html>
<html lang="en">
    <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <title>Welcome to Sentrix Security</title>
        <style>
            body { margin:0; padding:0; background:#f4f6f8; -webkit-text-size-adjust:100%; -ms-text-size-adjust:100%; }
            table { border-collapse:collapse; }
            img { border:0; line-height:100%; outline:none; text-decoration:none; display:block; }
            a { color:#0284c7; text-decoration:none; }
            .wrapper { width:100%; table-layout:fixed; background-color:#0f172a; padding:30px 0; }
            .email-container { width:100%; max-width:600px; margin:0 auto; background:#ffffff; border-radius:12px; overflow:hidden; box-shadow:0 10px 25px rgba(0,0,0,0.2); }
            .header { padding:24px 28px; background:#0b132b; border-bottom:2px solid #0284c7; }
            .hero { padding:28px 28px 12px 28px; text-align:left; }
            h1 { margin:0 0 12px 0; font-size:22px; font-family:-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; color:#0f172a; }
            p { margin:0 0 12px 0; font-size:15px; font-family:-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; color:#334155; line-height:1.6; }
            .button-wrap { padding:16px 28px 28px 28px; text-align:left; }
            .btn {
              display:inline-block;
              background-color:#0284c7;
              color:#ffffff !important;
              padding:12px 28px;
              border-radius:6px;
              font-family:-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
              font-size:15px;
              font-weight:600;
              text-decoration:none;
            }
            .features { padding:0 28px 20px 28px; }
            .feature-item { margin-bottom:10px; font-size:14px; color:#334155; font-family:-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; line-height:1.5; }
            .footer { padding:22px 28px; font-size:12px; color:#94a3b8; text-align:center; background:#f8fafc; border-top:1px solid #e2e8f0; font-family:-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; }
            @media screen and (max-width:480px) {
              .hero, .button-wrap, .features { text-align:center; }
              .btn { width:85%; }
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
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="vertical-align: middle;">
                          <div style="display: inline-block; width: 36px; height: 36px; line-height: 36px; text-align: center; background: #0284c7; color: #ffffff; border-radius: 8px; font-size: 20px;">🛡️</div>
                        </td>
                        <td style="vertical-align: middle; padding-left: 12px;">
                          <span style="font-size: 20px; font-weight: 800; color: #ffffff; letter-spacing: 1px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;">SENTRIX</span>
                          <span style="display: block; font-size: 11px; font-weight: 600; color: #38bdf8; letter-spacing: 1.5px; text-transform: uppercase; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;">Security Platform</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Hero Section -->
                <tr>
                <td class="hero">
                    <h1>Welcome to Sentrix Security, {{first_name}}!</h1>
                    <p>We’re thrilled to have you on board. With Sentrix Security Platform, you can audit web applications, run automated security scans, and assess vulnerabilities across your infrastructure in real time.</p>
                    <p>Start exploring now and safeguard your applications with enterprise-grade vulnerability intelligence.</p>
                </td>
                </tr>

                <!-- Call to Action -->
                <tr>
                <td class="button-wrap">
                    <a href="{{explore_link}}" class="btn" target="_blank" rel="noopener">Launch Security Console</a>
                </td>
                </tr>

                <!-- Key Features -->
                <tr>
                <td class="features">
                    <h2 style="font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; font-size:16px; color:#0f172a; margin-bottom:12px; font-weight:700;">What you can do with Sentrix:</h2>
                    <div class="feature-item">🛡️ <strong>Scan Web Apps:</strong> Detect OWASP vulnerabilities, misconfigurations, and active exploits.</div>
                    <div class="feature-item">📊 <strong>Actionable Reports:</strong> Export executive summaries and technical remediation steps.</div>
                    <div class="feature-item">⚡ <strong>Automated Audits:</strong> Schedule recurring vulnerability assessments and scans.</div>
                    <div class="feature-item">🔒 <strong>Zero-Trust Access:</strong> Manage multi-role security permissions and organization assets.</div>
                </td>
                </tr>

                <!-- Support Section -->
                <tr>
                <td style="padding:0 28px 24px 28px;">
                    <p style="font-size:14px; color:#64748b;">If you need assistance, our security support team is ready to help at 
                    <a href="mailto:{{support_email}}">{{support_email}}</a>.</p>
                </td>
                </tr>

                <!-- Footer -->
                <tr>
                <td class="footer">
                    <p style="margin:0 0 6px 0; font-weight: 600; color: #64748b;">Sentrix Security Platform · Automated Web Vulnerability Assessment</p>
                    <p style="margin:0 0 6px 0;">You’re receiving this email because you created a Sentrix Security account.</p>
                    <p style="margin:6px 0 0 0;">© {{year}} Sentrix Security. All rights reserved.</p>
                </td>
                </tr>

            </table>
            </td>
        </tr>
        </table>

        </center>
    </body>
</html>
`;

export const PASSWORD_RESET_REQUEST_TEMPLATE = `
<!doctype html>
<html lang="en">
    <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <title>Password Reset - Sentrix Security</title>
        <style>
            body { margin:0; padding:0; background:#f4f6f8; -webkit-text-size-adjust:100%; -ms-text-size-adjust:100%; }
            table { border-collapse:collapse; }
            img { border:0; line-height:100%; outline:none; text-decoration:none; display:block; }
            a { color:#0284c7; text-decoration:none; }
            .wrapper { width:100%; table-layout:fixed; background-color:#0f172a; padding:30px 0; }
            .email-container { width:100%; max-width:600px; margin:0 auto; background:#ffffff; border-radius:12px; overflow:hidden; box-shadow:0 10px 25px rgba(0,0,0,0.2); }
            .header { padding:24px 28px; background:#0b132b; border-bottom:2px solid #ef4444; }
            .hero { padding:28px 28px 12px 28px; text-align:left; }
            h1 { margin:0 0 12px 0; font-size:22px; font-family:-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; color:#0f172a; }
            p { margin:0 0 12px 0; font-size:15px; font-family:-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; color:#334155; line-height:1.6; }
            .button-wrap { padding:16px 28px 24px 28px; text-align:left; }
            .btn {
              display:inline-block;
              background-color:#ef4444;
              color:#ffffff !important;
              padding:12px 28px;
              border-radius:6px;
              font-family:-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
              font-size:15px;
              font-weight:600;
              text-decoration:none;
            }
            .muted { color:#64748b; font-size:13px; line-height:1.5; }
            .footer { padding:22px 28px; font-size:12px; color:#94a3b8; text-align:center; background:#f8fafc; border-top:1px solid #e2e8f0; font-family:-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; }
            @media screen and (max-width:480px) {
              .hero, .button-wrap { text-align:center; }
              .btn { width:85%; }
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
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="vertical-align: middle;">
                          <div style="display: inline-block; width: 36px; height: 36px; line-height: 36px; text-align: center; background: #ef4444; color: #ffffff; border-radius: 8px; font-size: 20px;">🔒</div>
                        </td>
                        <td style="vertical-align: middle; padding-left: 12px;">
                          <span style="font-size: 20px; font-weight: 800; color: #ffffff; letter-spacing: 1px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;">SENTRIX</span>
                          <span style="display: block; font-size: 11px; font-weight: 600; color: #fca5a5; letter-spacing: 1.5px; text-transform: uppercase; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;">Security Platform</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Hero Section -->
                <tr>
                <td class="hero">
                    <h1>Reset Your Password</h1>
                    <p>Hi {{first_name}},</p>
                    <p>We received a request to reset the password for your Sentrix Security account. Click the button below to choose a new password.</p>
                </td>
                </tr>

                <!-- Call to Action -->
                <tr>
                <td class="button-wrap">
                    <a href="{{reset_link}}" class="btn" target="_blank" rel="noopener">Reset Password</a>
                    <p class="muted" style="margin-top:18px;">
                    ⏰ This link will expire in <strong>1 hour</strong> for your security.
                    </p>
                    <p class="muted">
                    If the button doesn’t work, copy and paste this link into your browser:
                    </p>
                    <p style="word-break:break-all;" class="muted">
                    <a href="{{reset_link}}" target="_blank" rel="noopener" style="color:#0284c7;">{{reset_link}}</a>
                    </p>
                </td>
                </tr>

                <!-- Additional Info -->
                <tr>
                <td style="padding:0 28px 24px 28px;">
                    <p class="muted">Didn’t request a password reset? You can safely ignore this email. Your account credentials remain secure and unchanged.</p>
                </td>
                </tr>

                <!-- Footer -->
                <tr>
                <td class="footer">
                    <p style="margin:0 0 6px 0; font-weight: 600; color: #64748b;">Sentrix Security Platform · Automated Web Vulnerability Assessment</p>
                    <p style="margin:0 0 6px 0;">Need help? Contact our security support at <a href="mailto:{{support_email}}">{{support_email}}</a>.</p>
                    <p style="margin:6px 0 0 0;">© {{year}} Sentrix Security. All rights reserved.</p>
                </td>
                </tr>

            </table>
            </td>
        </tr>
        </table>

        </center>
    </body>
</html>
`;

export const PASSWORD_RESET_SUCCESS_REQUEST_TEMPLATE = `
<!doctype html>
<html lang="en">
    <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <title>Password Reset Success - Sentrix Security</title>
        <style>
            body { margin:0; padding:0; background:#f4f6f8; -webkit-text-size-adjust:100%; -ms-text-size-adjust:100%; }
            table { border-collapse:collapse; }
            img { border:0; line-height:100%; outline:none; text-decoration:none; display:block; }
            a { color:#0284c7; text-decoration:none; }
            .wrapper { width:100%; table-layout:fixed; background-color:#0f172a; padding:30px 0; }
            .email-container { width:100%; max-width:600px; margin:0 auto; background:#ffffff; border-radius:12px; overflow:hidden; box-shadow:0 10px 25px rgba(0,0,0,0.2); }
            .header { padding:24px 28px; background:#0b132b; border-bottom:2px solid #10b981; }
            .hero { padding:28px 28px 12px 28px; text-align:left; }
            h1 { margin:0 0 12px 0; font-size:22px; font-family:-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; color:#0f172a; }
            p { margin:0 0 12px 0; font-size:15px; font-family:-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; color:#334155; line-height:1.6; }
            .button-wrap { padding:16px 28px 24px 28px; text-align:left; }
            .btn {
              display:inline-block;
              background-color:#10b981;
              color:#ffffff !important;
              padding:12px 28px;
              border-radius:6px;
              font-family:-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
              font-size:15px;
              font-weight:600;
              text-decoration:none;
            }
            .muted { color:#64748b; font-size:13px; line-height:1.5; }
            .footer { padding:22px 28px; font-size:12px; color:#94a3b8; text-align:center; background:#f8fafc; border-top:1px solid #e2e8f0; font-family:-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; }
            @media screen and (max-width:480px) {
              .hero, .button-wrap { text-align:center; }
              .btn { width:85%; }
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
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="vertical-align: middle;">
                          <div style="display: inline-block; width: 36px; height: 36px; line-height: 36px; text-align: center; background: #10b981; color: #ffffff; border-radius: 8px; font-size: 20px;">🛡️</div>
                        </td>
                        <td style="vertical-align: middle; padding-left: 12px;">
                          <span style="font-size: 20px; font-weight: 800; color: #ffffff; letter-spacing: 1px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;">SENTRIX</span>
                          <span style="display: block; font-size: 11px; font-weight: 600; color: #6ee7b7; letter-spacing: 1.5px; text-transform: uppercase; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;">Security Platform</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Hero Section -->
                <tr>
                <td class="hero">
                    <h1>Password Reset Successful</h1>
                    <p>Hi {{first_name}},</p>
                    <p>This is confirmation that your Sentrix Security account password was successfully updated.</p>
                    <p>If you did not make this change, please contact our security team immediately to secure your account.</p>
                </td>
                </tr>

                <!-- Call to Action -->
                <tr>
                <td class="button-wrap">
                    <a href="{{login_link}}" class="btn" target="_blank" rel="noopener">Sign In to Sentrix</a>
                    <p class="muted" style="margin-top:16px;">
                    Your account is now secured with your new password.
                    </p>
                </td>
                </tr>

                <!-- Footer -->
                <tr>
                <td class="footer">
                    <p style="margin:0 0 6px 0; font-weight: 600; color: #64748b;">Sentrix Security Platform · Automated Web Vulnerability Assessment</p>
                    <p style="margin:0 0 6px 0;">Need help? Contact our security support at <a href="mailto:{{support_email}}">{{support_email}}</a>.</p>
                    <p style="margin:6px 0 0 0;">© {{year}} Sentrix Security. All rights reserved.</p>
                </td>
                </tr>

            </table>
            </td>
        </tr>
        </table>

        </center>
    </body>
</html>
`;
