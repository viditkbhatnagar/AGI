import dedent from 'dedent';
import path from 'path';
import fs from 'fs';

const headerColor = '#9aa5f8'; // lighter purple
const headerBlue = '#1e3a8a';      // subtle US-flag blue for light theme
const headerBlueDark = '#0f172a';  // darker variant for dark mode
const accentRed = '#b91c1c';       // subtle US-flag red

export function renderWelcomeHtml({
  name,
  courseTitle,
  email,
  tempPassword,
  appUrl,
}: {
  name: string;
  courseTitle: string;
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
      <title>Welcome to AGI</title>
      <link href="https://fonts.googleapis.com/css?family=Inter:400,700|Noto+Serif:700" rel="stylesheet">
      <style>
        body{margin:0;background:#f7f7f7;font-family:Inter,Arial,sans-serif}
        .row{
          width:100%;
          max-width:700px;
          margin:0 auto;
          background:#fff;
          border-radius:10px;
          box-shadow:0 2px 10px rgba(0,0,0,.06);
          overflow:hidden;
        }
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
              <!-- College name (inside card) -->
              <tr>
                <td style="background:#fff;text-align:center;padding:25px 0">
                  <h1 style="margin:0;color:${headerBlue};font-size:32px;font-family:'Noto Serif',Georgia,serif">
                    American Global Institute
                  </h1>
                </td>
              </tr>
              <!-- Course title (optional) -->
              ${courseTitle ? `
              <tr>
                <td style="background:#f7f7f7;text-align:center;padding:0 0 20px">
                  <h2 style="margin:0;color:${headerColor};font-size:24px;font-family:'Noto Serif',Georgia,serif">
                    ${courseTitle}
                  </h2>
                </td>
              </tr>` : ''}
              <!-- Hero image -->
              <tr>
                <td style="text-align:center;background:#fff">
                  <img
                    src="https://bridgeoverseas.in/wp-content/uploads/2024/05/international-students-studying-together-in-a-us-university-library.webp"
                    alt="Welcome to AGI"
                    style="width:100%;max-width:640px;height:auto;border:0;display:block;margin:0 auto"
                  >
                </td>
              </tr>
              <tr><td class="pad">
                <p style="margin:0 0 15px;font-size:16px">Dear ${name},</p>
                <h2>Welcome to American&nbsp;Global&nbsp;Institute</h2>
                <p>Your student account is now active. Use the credentials below to log in and get started:</p>
                <p style="background:#f9fafb;padding:12px;border-radius:6px;">
                  <strong>Email:</strong> ${email}<br/>
                  <strong>Temporary password:</strong> ${tempPassword}
                </p>
              <!-- Login button now below credentials -->
              <tr>
                <td style="text-align:center;padding:30px 0;background:#fff">
                  <a href="${appUrl ?? 'https://elearning.globalagi.org/login'}" class="btn" target="_blank">
                    Login To Your Student Dashboard
                  </a>
                </td>
              </tr>
                <p class="muted" style="margin-top:25px">If the dashboard button above doesn’t work, copy this link into your browser:<br/>${appUrl ?? 'https://elearning.globalagi.org/login'}</p>
              </td></tr>
              <tr><td class="pad hdr" style="color:#fff;text-align:center;font-size:24px;margin:0;background:${headerBlue}">
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
    timeZone: 'Asia/Dubai', // Gulf Standard Time (GMT+4)
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

export function welcomeAttachments() {
  const heroPath = path.join(
    __dirname,
    '../../client/src/components/layout/email_template_image.jpg'
  );
  return [
    {
      filename: 'welcome-hero.jpg',
      path: heroPath,
      cid: 'agiHero',
    },
    {
      filename: 'agi-logo.png',
      path: path.join(__dirname, 'agi-logo.png'), // adjust if you have a local logo
      cid: 'agiLogo',
    },
  ];
}