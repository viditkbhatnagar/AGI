// server/utils/mailer.ts
import * as SendinBlue from "@sendinblue/client";

const defaultClient = SendinBlue.ApiClient.instance;
const apiKeyAuth = defaultClient.authentications["api-key"] as SendinBlue.ApiKeyAuth;
apiKeyAuth.apiKey = process.env.SENDINBLUE_API_KEY as string;  // put your key in .env

export async function sendEmail(
  to: { email: string; name?: string }[],
  subject: string,
  htmlContent: string
) {
  const api = new SendinBlue.TransactionalEmailsApi();
  return api.sendTransacEmail({
    subject,
    htmlContent,
    sender: { name: "American Global Institute", email: "no-reply@agi.online" },
    to,
  });
}