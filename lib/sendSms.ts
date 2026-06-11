import twilio from "twilio";

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID!,
  process.env.TWILIO_AUTH_TOKEN!
);

export async function sendSms(to: string, body: string) {
  const message = await client.messages.create({
    body,
    from: process.env.TWILIO_PHONE_NUMBER!,
    to,
  });

  console.log("Twilio SMS created:", {
    sid: message.sid,
    status: message.status,
  });

  setTimeout(async () => {
    try {
      const updated = await client.messages(message.sid).fetch();

      console.log("Twilio SMS final status:", {
        sid: updated.sid,
        status: updated.status,
        errorCode: updated.errorCode,
        errorMessage: updated.errorMessage,
      });
    } catch (err) {
      console.error("Status check failed:", err);
    }
  }, 10000);

  return message;
}