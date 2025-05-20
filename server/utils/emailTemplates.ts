import dedent from 'dedent';
import path from 'path';

const headerColor = '#9aa5f8'; // lighter purple
const headerBlue = '#1e3a8a';      // subtle US-flag blue for light theme
const headerBlueDark = '#0f172a';  // darker variant for dark mode
const accentRed = '#b91c1c';       // subtle US-flag red

export function renderWelcomeHtml({
  name,
  email,
  tempPassword,
  appUrl,
}: {
  name: string;
  email: string;
  tempPassword: string;
  appUrl: string;
}) {
  return dedent/*html*/ `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8"/>
      <meta name="viewport" content="width=device-width,initial-scale=1"/>
      <title>Welcome to AGI.online</title>
      <link href="https://fonts.googleapis.com/css?family=Inter:400,700|Noto+Serif:700" rel="stylesheet">
      <style>
        body{margin:0;background:#f7f7f7;font-family:Inter,Arial,sans-serif}
        .row{width:100%;max-width:700px;margin:0 auto;background:#fff}
        .pad{padding:25px}
        h1{font-family:'Noto Serif',Georgia,serif;margin:0 0 15px}
        h2{font-family:'Noto Serif',Georgia,serif;margin:0 0 15px;color:${headerColor}}
        p{line-height:1.6;margin:0 0 15px;font-size:16px;color:#201f42}
        .btn{display:inline-block;background:${accentRed};color:#fff !important;padding:12px 30px;border-radius:4px;text-decoration:none;font-family:'Noto Serif',Georgia,serif;font-size:16px}
        .muted{font-size:13px;color:#6b7280}
        .hdr{background:${headerBlue}}
        @media(prefers-color-scheme:dark){
          body{background:#1f2937}
          .row{background:#111827}
          p, .muted{color:#d1d5db}
          h1,h2{color:#f3f4f6}
          .btn{background:#ef4444}
          .hdr{background:${headerBlueDark}}
        }
      </style>
    </head>
    <body>
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f7f7f7">
        <tr><td style="height:20px"></td></tr>
        <tr>
          <td>
            <table class="row" role="presentation" cellspacing="0" cellpadding="0">
              <!-- Logo row -->
              <tr>
                <td style="background:#f7f7f7;text-align:center;padding:25px 0">
                  <img src="cid:agiLogo" alt="American Global Institute" style="height:80px">
                </td>
              </tr>

              <!-- Header row -->
              <tr>
                <td class="pad hdr" style="color:#fff;text-align:right;font-size:16px;background:${headerBlue} url('https://d1oco4z2z1fhwp.cloudfront.net/templates/default/7841/Header-bg.png') no-repeat center/cover;">
                  ${name}
                </td>
              </tr>
              <tr><td class="pad" style="background:#efeef4;text-align:center">
                <h1 style="color:${headerColor};font-size:30px;font-weight:700">You're Enrolled!</h1>
              </td></tr>
              <tr><td class="pad">
                <h2>Welcome to American&nbsp;Global&nbsp;Institute</h2>
                <p>Your student account is now active. Use the credentials below to log in and get started:</p>
                <p style="background:#f9fafb;padding:12px;border-radius:6px;">
                  <strong>Email:</strong> ${email}<br/>
                  <strong>Temporary password:</strong> ${tempPassword}
                </p>
                <p><a href="${appUrl ?? ''}/login" class="btn" target="_blank">Sign in to American&nbsp;Global&nbsp;Institute</a></p>
                <p class="muted">If the button doesn’t work, copy this link into your browser:<br/>${appUrl ?? ''}/login</p>
              </td></tr>
              <tr><td class="pad hdr" style="color:#fff;text-align:center;font-size:24px;margin:0;background:${headerBlue} url('https://d1oco4z2z1fhwp.cloudfront.net/templates/default/7841/Header-bg.png') no-repeat center/cover;">
                <h2>See you in class!</h2>
              </td></tr>
              <tr><td class="pad" style="background:#201f42;color:#fff;text-align:center;font-size:13px">
                © ${new Date().getFullYear()} American Global Institute, All rights reserved.
              </td></tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
}

export function renderLiveClassHtml({
  name,
  title,
  startTime,
  meetLink,
}: {
  name: string;
  title: string;
  startTime: Date;
  meetLink: string;
}) {
  const when = new Date(startTime).toLocaleString('en-US', {
    dateStyle: 'long',
    timeStyle: 'short',
  });

  return dedent/*html*/ `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8"/>
      <meta name="viewport" content="width=device-width,initial-scale=1"/>
      <title>New Live Class</title>
      <link href="https://fonts.googleapis.com/css?family=Inter:400,700|Noto+Serif:700" rel="stylesheet">
      <style>
        body{margin:0;background:#f7f7f7;font-family:Inter,Arial,sans-serif}
        .row{width:100%;max-width:700px;margin:0 auto;background:#fff}
        .pad{padding:25px}
        h1,h2{font-family:'Noto Serif',Georgia,serif;margin:0 0 15px}
        h1{color:${headerColor};font-size:30px}
        p{line-height:1.6;margin:0 0 15px;font-size:16px;color:#201f42}
        .btn{display:inline-block;background:#10b981;color:#fff !important;padding:12px 30px;border-radius:4px;text-decoration:none;font-family:'Noto Serif',Georgia,serif;font-size:16px}
        .cal{background:${accentRed}}
        .muted{font-size:13px;color:#6b7280}
        .hdr{background:${headerBlue}}
        @media(prefers-color-scheme:dark){
          body{background:#1f2937}
          .row{background:#111827}
          p,.muted{color:#d1d5db}
          h1{color:#f3f4f6}
          .btn{background:#34d399}
          .hdr{background:${headerBlueDark}}
          .cal{background:${accentRed}}
        }
      </style>
    </head>
    <body>
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f7f7f7">
        <tr><td style="height:20px"></td></tr>
        <tr>
          <td>
            <table class="row" role="presentation" cellspacing="0" cellpadding="0">
              <!-- Logo row -->
              <tr>
                <td style="background:#f7f7f7;text-align:center;padding:25px 0">
                  <img src="cid:agiLogo" alt="American Global Institute" style="height:80px">
                </td>
              </tr>
              <tr>
                <td class="pad hdr" style="background:${headerBlue} url('https://d1oco4z2z1fhwp.cloudfront.net/templates/default/7841/Header-bg.png') no-repeat center/cover;color:#fff">
                </td>
              </tr>
              <tr><td class="pad" style="background:#efeef4;text-align:center">
                <h1>📅 Live Class Reminder</h1>
              </td></tr>
              <tr><td class="pad">
                <p>Hi ${name || 'Student'},</p>
                <p><strong>${title}</strong> is happening on <strong>${when}</strong>.</p>
                <p><a href="${meetLink}" class="btn" target="_blank">Join the class</a></p>
                <p><a href="{{ADD_TO_CAL}}" class="btn cal" target="_blank">Add to Google Calendar</a></p>
                <p class="muted">If the buttons don’t work, copy &amp; paste this link:<br/>${meetLink}</p>
              </td></tr>
              <tr><td class="pad" style="background:#201f42;color:#fff;text-align:center;font-size:13px">
                © ${new Date().getFullYear()} American Global Institute, All rights reserved.
              </td></tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
}