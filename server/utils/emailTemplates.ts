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

export function renderLiveClassUpdateHtml({
  name,
  title,
  oldStartTime,
  newStartTime,
  meetLink,
}: {
  name: string;
  title: string;
  oldStartTime: Date;
  newStartTime: Date;
  meetLink: string;
}) {
  const oldWhen = new Date(oldStartTime).toLocaleString('en-US', {
    dateStyle: 'long',
    timeStyle: 'short',
    timeZone: 'Asia/Dubai', // Gulf Standard Time (GMT+4)
  });

  const newWhen = new Date(newStartTime).toLocaleString('en-US', {
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
      <title>Live Class Updated</title>
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
        .time-change{background:#fef3c7;border-left:4px solid #f59e0b;padding:15px;margin:15px 0;border-radius:4px}
        .old-time{text-decoration:line-through;color:#ef4444;font-weight:bold}
        .new-time{color:#10b981;font-weight:bold}
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
                <h1>⏰ Live Class Time Updated</h1>
              </td></tr>
              <tr><td class="pad">
                <p>Hi ${name || 'Student'},</p>
                <p>The timing for your live class <strong>"${title}"</strong> has been updated.</p>
                
                <div class="time-change">
                  <p style="margin:0 0 10px"><strong>Previous Time:</strong></p>
                  <p style="margin:0 0 15px" class="old-time">${oldWhen}</p>
                  
                  <p style="margin:0 0 10px"><strong>New Time:</strong></p>
                  <p style="margin:0" class="new-time">${newWhen}</p>
                </div>
                
                <p>Please update your calendar accordingly. We apologize for any inconvenience.</p>
                
                <p><a href="${meetLink}" class="btn" target="_blank">Join the class</a></p>
                <p><a href="{{ADD_TO_CAL}}" class="btn cal" target="_blank">Add to Google Calendar</a></p>
                <p class="muted">If the buttons don't work, copy &amp; paste this link:<br/>${meetLink}</p>
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

export function renderLiveClassCancellationHtml({
  name,
  title,
  startTime,
}: {
  name: string;
  title: string;
  startTime: Date;
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
      <title>Live Class Cancelled</title>
      <link href="https://fonts.googleapis.com/css?family=Inter:400,700|Noto+Serif:700" rel="stylesheet">
      <style>
        body{margin:0;background:#f7f7f7;font-family:Inter,Arial,sans-serif}
        .row{width:100%;max-width:700px;margin:0 auto;background:#fff}
        .pad{padding:25px}
        h1,h2{font-family:'Noto Serif',Georgia,serif;margin:0 0 15px}
        h1{color:${headerColor};font-size:30px}
        p{line-height:1.6;margin:0 0 15px;font-size:16px;color:#201f42}
        .muted{font-size:13px;color:#6b7280}
        .hdr{background:${headerBlue}}
        .cancellation-notice{background:#fef2f2;border-left:4px solid #ef4444;padding:15px;margin:15px 0;border-radius:4px}
        .cancelled-time{color:#ef4444;font-weight:bold}
        @media(prefers-color-scheme:dark){
          body{background:#1f2937}
          .row{background:#111827}
          p,.muted{color:#d1d5db}
          h1{color:#f3f4f6}
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
              <tr>
                <td class="pad hdr" style="background:${headerBlue} url('https://d1oco4z2z1fhwp.cloudfront.net/templates/default/7841/Header-bg.png') no-repeat center/cover;color:#fff">
                </td>
              </tr>
              <tr><td class="pad" style="background:#efeef4;text-align:center">
                <h1>❌ Live Class Cancelled</h1>
              </td></tr>
              <tr><td class="pad">
                <p>Hi ${name || 'Student'},</p>
                <p>We regret to inform you that the following live class has been cancelled:</p>
                
                <div class="cancellation-notice">
                  <p style="margin:0 0 10px"><strong>Class:</strong> ${title}</p>
                  <p style="margin:0" class="cancelled-time"><strong>Scheduled Time:</strong> ${when}</p>
                </div>
                
                <p>We apologize for any inconvenience this may cause. If you have any questions, please contact our support team.</p>
                
                <p>We will notify you as soon as a new session is scheduled.</p>
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

export function renderLiveClassReminderHtml({
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
      <title>Live Class Starting Soon</title>
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
        .reminder-notice{background:#fef3c7;border-left:4px solid #f59e0b;padding:15px;margin:15px 0;border-radius:4px}
        .urgent-time{color:#f59e0b;font-weight:bold;font-size:18px}
        .pulse{animation:pulse 2s infinite}
        @keyframes pulse{0%{opacity:1}50%{opacity:0.7}100%{opacity:1}}
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
                <h1 class="pulse">🔔 Live Class Starting Soon!</h1>
              </td></tr>
              <tr><td class="pad">
                <p>Hi ${name || 'Student'},</p>
                <p>This is a friendly reminder that your live class is starting in <strong>30 minutes</strong>!</p>
                
                <div class="reminder-notice">
                  <p style="margin:0 0 10px"><strong>Class:</strong> ${title}</p>
                  <p style="margin:0" class="urgent-time"><strong>Starting at:</strong> ${when}</p>
                </div>
                
                <p>Please make sure you have:</p>
                <ul style="margin:0 0 15px;padding-left:20px">
                  <li>A stable internet connection</li>
                  <li>Your camera and microphone ready</li>
                  <li>Course materials nearby</li>
                  <li>A quiet environment for learning</li>
                </ul>
                
                <p style="text-align:center;margin:25px 0">
                  <a href="${meetLink}" class="btn" target="_blank" style="font-size:18px;padding:15px 40px">
                    🚀 Join Class Now
                  </a>
                </p>
                
                <p class="muted">If you're having trouble joining, copy and paste this link into your browser:<br/>${meetLink}</p>
                
                <p>See you in class!</p>
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

export function renderTeacherLiveClassHtml({
  teacherName,
  title,
  courseSlug,
  startTime,
  meetLink,
}: {
  teacherName: string;
  title: string;
  courseSlug: string;
  startTime: Date;
  meetLink: string;
}) {
  const when = new Date(startTime).toLocaleString('en-US', {
    dateStyle: 'long',
    timeStyle: 'short',
    timeZone: 'Asia/Dubai', // Gulf Standard Time (GMT+4)
  });

  const headerColor = '#0C5FB3';
  const headerBlue = '#201f42';
  const headerBlueDark = '#111827';
  const accentRed = '#e11d48';

  return dedent/*html*/ `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8"/>
      <meta name="viewport" content="width=device-width,initial-scale=1"/>
      <title>Live Class Scheduled - Teaching Assignment</title>
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
        .teacher-notice{background:#e0f2fe;border-left:4px solid #0277bd;padding:15px;margin:15px 0;border-radius:4px}
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
            <table class="row" role="presentation" width="100%" cellspacing="0" cellpadding="0">
              <tr><td class="pad hdr" style="text-align:center;margin:0">
                <img src="cid:agiLogo" alt="AGI" style="width:100px;height:auto;margin:0 auto;display:block"/>
              </td></tr>
              <tr><td class="pad hdr" style="color:#fff;text-align:center;font-size:32px;margin:0;background:${headerBlue}">
                <h1 style="color:#fff;margin:0">Live Class Scheduled</h1>
              </td></tr>
              <tr><td class="pad">
                <p>Dear ${teacherName},</p>
                <p>A new live class has been scheduled for your course <strong>${courseSlug}</strong>.</p>
                
                <div class="teacher-notice">
                  <p style="margin:0 0 10px"><strong>Class:</strong> ${title}</p>
                  <p style="margin:0 0 10px"><strong>Course:</strong> ${courseSlug}</p>
                  <p style="margin:0"><strong>Scheduled for:</strong> ${when}</p>
                </div>
                
                <p>As the assigned teacher for this course, you are expected to conduct this live class session. Please prepare your materials and join the session on time.</p>
                
                <p><a href="${meetLink}" class="btn" target="_blank">Join the class</a></p>
                <p><a href="{{ADD_TO_CAL}}" class="btn cal" target="_blank">Add to Google Calendar</a></p>
                <p class="muted">If the buttons don't work, copy &amp; paste this link:<br/>${meetLink}</p>
                
                <p>Thank you for your dedication to teaching excellence!</p>
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

export function renderContactFormHtml({
  supportType,
  name,
  email,
  message,
  submittedAt,
}: {
  supportType: string;
  name: string;
  email: string;
  message: string;
  submittedAt: Date;
}) {
  const formatSupportType = (type: string) => {
    switch (type) {
      case 'technical':
        return 'Technical Support';
      case 'course':
        return 'Course Content';
      case 'billing':
        return 'Billing/Enrollment';
      case 'other':
        return 'Other';
      default:
        return type;
    }
  };

  const formattedDate = submittedAt.toLocaleString('en-US', {
    dateStyle: 'long',
    timeStyle: 'short',
    timeZone: 'UTC',
  });

  return dedent/*html*/ `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8"/>
      <meta name="viewport" content="width=device-width,initial-scale=1"/>
      <title>New Contact Form Submission</title>
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
        h1{font-family:'Noto Serif',Georgia,serif;margin:0 0 15px;color:${headerBlue};font-size:28px}
        h2{font-family:'Noto Serif',Georgia,serif;margin:0 0 15px;color:${headerColor};font-size:20px}
        p{line-height:1.6;margin:0 0 15px;font-size:16px;color:#201f42}
        .info-box{background:#f9fafb;padding:15px;border-radius:6px;margin:15px 0;border-left:4px solid ${headerColor}}
        .message-box{background:#fef3c7;padding:15px;border-radius:6px;margin:15px 0;border-left:4px solid #f59e0b}
        .label{font-weight:600;color:#374151;margin-bottom:5px}
        .value{color:#1f2937;font-size:15px}
        .support-badge{
          display:inline-block;
          background:${accentRed};
          color:#fff;
          padding:4px 12px;
          border-radius:15px;
          font-size:12px;
          font-weight:600;
          text-transform:uppercase;
        }
        .hdr{background:${headerBlue}}
        @media(prefers-color-scheme:dark){
          body{background:#1f2937}
          .row{background:#111827}
          p{color:#d1d5db}
          h1,h2{color:#f3f4f6}
          .info-box{background:#1f2937;border-left-color:#9aa5f8}
          .message-box{background:#451a03;border-left-color:#f59e0b}
          .label{color:#d1d5db}
          .value{color:#f3f4f6}
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
              <!-- Header -->
              <tr>
                <td style="background:#fff;text-align:center;padding:25px 0">
                  <h1 style="margin:0;color:${headerBlue};font-size:28px;font-family:'Noto Serif',Georgia,serif">
                    📧 New Contact Form Submission
                  </h1>
                </td>
              </tr>
              
              <!-- Content -->
              <tr><td class="pad">
                <p>A new contact form has been submitted on the student portal.</p>
                
                <div class="info-box">
                  <div style="margin-bottom:15px">
                    <div class="label">Support Type:</div>
                    <div class="value">
                      <span class="support-badge">${formatSupportType(supportType)}</span>
                    </div>
                  </div>
                  
                  <div style="margin-bottom:15px">
                    <div class="label">Full Name:</div>
                    <div class="value">${name}</div>
                  </div>
                  
                  <div style="margin-bottom:15px">
                    <div class="label">Email Address:</div>
                    <div class="value">
                      <a href="mailto:${email}" style="color:${headerBlue};text-decoration:none">${email}</a>
                    </div>
                  </div>
                  
                  <div>
                    <div class="label">Submitted:</div>
                    <div class="value">${formattedDate}</div>
                  </div>
                </div>
                
                <h2>Message:</h2>
                <div class="message-box">
                  <p style="margin:0;white-space:pre-wrap;line-height:1.6">${message}</p>
                </div>
                
                <p style="margin-top:25px;font-size:14px;color:#6b7280">
                  <strong>Next Steps:</strong> Please respond to this inquiry promptly. 
                  You can reply directly to <a href="mailto:${email}" style="color:${headerBlue}">${email}</a> 
                  or use your preferred support system.
                </p>
              </td></tr>
              
              <!-- Footer -->
              <tr><td class="pad" style="background:#201f42;color:#fff;text-align:center;font-size:13px">
                © ${new Date().getFullYear()} American Global Institute - Contact Form System
              </td></tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
}

// Final Exam Submission Notification Template (to Teacher)
export function renderFinalExamSubmissionNotificationHtml({
  teacherName,
  studentName,
  courseTitle,
  courseSlug,
  examTitle,
  submissionDate,
  attemptNumber,
  requiresManualGrading,
  dashboardUrl,
}: {
  teacherName: string;
  studentName: string;
  courseTitle: string;
  courseSlug: string;
  examTitle: string;
  submissionDate: Date;
  attemptNumber: number;
  requiresManualGrading: boolean;
  dashboardUrl: string;
}) {
  return dedent/*html*/ `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8"/>
      <meta name="viewport" content="width=device-width,initial-scale=1"/>
      <title>Final Exam Submission</title>
      <link href="https://fonts.googleapis.com/css?family=Inter:400,700|Noto+Serif:700" rel="stylesheet">
      <style>
        body{margin:0;background:#f7f7f7;font-family:Inter,Arial,sans-serif}
        .row{width:100%;max-width:700px;margin:0 auto;background:#fff;border-radius:10px;box-shadow:0 2px 10px rgba(0,0,0,.06);overflow:hidden}
        .pad{padding:25px}
        h1{font-family:'Noto Serif',Georgia,serif;margin:0 0 15px}
        h2{font-family:'Noto Serif',Georgia,serif;margin:0 0 15px;color:${headerColor}}
        p{line-height:1.6;margin:0 0 15px;font-size:16px;color:#201f42}
        .btn{display:inline-block;background:${accentRed};color:#fff !important;padding:12px 30px;border-radius:4px;text-decoration:none;font-family:'Noto Serif',Georgia,serif;font-size:16px}
        .muted{font-size:13px;color:#6b7280}
        .hdr{background:${headerBlue}}
        .highlight{background:#e3f2fd;padding:20px;border-left:4px solid ${headerColor};margin:15px 0;border-radius:4px}
        .urgent{background:#fff3e0;border-left-color:#f57c00}
      </style>
    </head>
    <body>
      <div class="row">
        <div class="hdr pad">
          <h1 style="color:#fff;margin:0;">🎓 Final Exam Submission</h1>
        </div>
        <div class="pad">
          <p>Dear <strong>${teacherName}</strong>,</p>
          
          <p>A student has submitted their final examination and ${requiresManualGrading ? 'requires your grading attention' : 'has been auto-graded'}.</p>
          
          <div class="highlight ${requiresManualGrading ? 'urgent' : ''}">
            <h2 style="margin-top:0;">Submission Details</h2>
            <p><strong>Student:</strong> ${studentName}</p>
            <p><strong>Course:</strong> ${courseTitle} (${courseSlug})</p>
            <p><strong>Exam:</strong> ${examTitle}</p>
            <p><strong>Attempt:</strong> #${attemptNumber}</p>
            <p><strong>Submitted:</strong> ${submissionDate.toLocaleString()}</p>
            ${requiresManualGrading ? 
              '<p style="color:#f57c00;font-weight:bold;">⚠️ Manual grading required</p>' : 
              '<p style="color:#4caf50;font-weight:bold;">✅ Auto-graded</p>'
            }
          </div>
          
          ${requiresManualGrading ? 
            '<p>This examination contains essay questions that require manual grading. Please review and grade the submission as soon as possible.</p>' :
            '<p>The examination has been automatically graded. You can review the results and provide additional feedback if needed.</p>'
          }
          
          <div style="text-align:center;margin:30px 0;">
            <a href="${dashboardUrl}/teacher/exam-results" class="btn">
              Review & Grade Exam
            </a>
          </div>
          
          <p class="muted">
            You can access the complete submission details, student answers, and grading interface from your teacher dashboard.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}

// Final Exam Grading Notification Template (to Student)
export function renderFinalExamGradingNotificationHtml({
  studentName,
  courseTitle,
  courseSlug,
  examTitle,
  score,
  maxScore,
  passed,
  teacherName,
  feedback,
  gradedDate,
  attemptNumber,
  dashboardUrl,
}: {
  studentName: string;
  courseTitle: string;
  courseSlug: string;
  examTitle: string;
  score: number;
  maxScore: number;
  passed: boolean;
  teacherName: string;
  feedback?: string;
  gradedDate: Date;
  attemptNumber: number;
  dashboardUrl: string;
}) {
  const percentage = Math.round((score / maxScore) * 100);
  const statusColor = passed ? '#4caf50' : '#f44336';
  const statusIcon = passed ? '✅' : '❌';
  const statusText = passed ? 'Passed' : 'Failed';
  
  return dedent/*html*/ `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8"/>
      <meta name="viewport" content="width=device-width,initial-scale=1"/>
      <title>Final Exam Results</title>
      <link href="https://fonts.googleapis.com/css?family=Inter:400,700|Noto+Serif:700" rel="stylesheet">
      <style>
        body{margin:0;background:#f7f7f7;font-family:Inter,Arial,sans-serif}
        .row{width:100%;max-width:700px;margin:0 auto;background:#fff;border-radius:10px;box-shadow:0 2px 10px rgba(0,0,0,.06);overflow:hidden}
        .pad{padding:25px}
        h1{font-family:'Noto Serif',Georgia,serif;margin:0 0 15px}
        h2{font-family:'Noto Serif',Georgia,serif;margin:0 0 15px;color:${headerColor}}
        p{line-height:1.6;margin:0 0 15px;font-size:16px;color:#201f42}
        .btn{display:inline-block;background:${accentRed};color:#fff !important;padding:12px 30px;border-radius:4px;text-decoration:none;font-family:'Noto Serif',Georgia,serif;font-size:16px}
        .muted{font-size:13px;color:#6b7280}
        .hdr{background:${headerBlue}}
        .score-box{background:#f8f9fa;padding:25px;border-radius:8px;text-align:center;margin:20px 0;border:2px solid ${statusColor}}
        .score-big{font-size:48px;font-weight:bold;color:${statusColor};margin:10px 0}
        .feedback-box{background:#f0f4f8;padding:20px;border-left:4px solid ${headerColor};margin:20px 0;border-radius:4px}
      </style>
    </head>
    <body>
      <div class="row">
        <div class="hdr pad">
          <h1 style="color:#fff;margin:0;">${statusIcon} Final Exam Graded</h1>
        </div>
        <div class="pad">
          <p>Dear <strong>${studentName}</strong>,</p>
          
          <p>Your final examination has been graded by your instructor. Here are your results:</p>
          
          <div class="score-box">
            <h2 style="margin-top:0;color:${statusColor}">${examTitle}</h2>
            <div class="score-big">${percentage}%</div>
            <p style="margin:5px 0;color:${statusColor};font-weight:bold;font-size:18px">${statusText}</p>
            <p style="margin:0;color:#666">
              ${score}/${maxScore} points • Attempt #${attemptNumber}
            </p>
          </div>
          
          <div style="background:#f9f9f9;padding:15px;border-radius:4px;margin:20px 0">
            <p style="margin:0"><strong>Course:</strong> ${courseTitle} (${courseSlug})</p>
            <p style="margin:5px 0 0 0"><strong>Graded by:</strong> ${teacherName}</p>
            <p style="margin:5px 0 0 0"><strong>Graded on:</strong> ${gradedDate.toLocaleString()}</p>
          </div>
          
          ${feedback ? `
            <div class="feedback-box">
              <h2 style="margin-top:0">📝 Teacher Feedback</h2>
              <p style="white-space:pre-wrap;margin:0">${feedback}</p>
            </div>
          ` : ''}
          
          ${passed ? 
            '<p style="color:#4caf50;font-weight:bold">🎉 Congratulations! You have successfully passed the final examination.</p>' :
            '<p style="color:#f44336">This attempt did not meet the passing requirements. Please review the material and consider retaking the exam if attempts are available.</p>'
          }
          
          <div style="text-align:center;margin:30px 0;">
            <a href="${dashboardUrl}/student/final-examinations" class="btn">
              View Complete Results
            </a>
          </div>
          
          <p class="muted">
            You can view your detailed exam results, answers, and attempt history from your student dashboard.
          </p>
        </div>
      </div>
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