import twilio from "twilio";

function requireEnv(
  name: "TWILIO_ACCOUNT_SID" | "TWILIO_AUTH_TOKEN" | "TWILIO_PHONE_NUMBER"
) {
  const value =
    process.env[name]?.trim();

  if (!value) {
    throw new Error(
      `Missing required environment variable: ${name}`
    );
  }

  return value;
}

function normalizePhoneNumber(
  value: string
) {
  const raw =
    value.trim();

  if (!raw) {
    throw new Error(
      "A destination phone number is required."
    );
  }

  /*
   * Already-valid E.164 shape.
   */
  if (/^\+[1-9]\d{7,14}$/.test(raw)) {
    return raw;
  }

  /*
   * PugPep currently serves U.S. checkout customers.
   * Accept common U.S. formats and convert them to E.164:
   *
   * (843) 555-1234  -> +18435551234
   * 843-555-1234    -> +18435551234
   * 1-843-555-1234  -> +18435551234
   */
  const digits =
    raw.replace(/\D/g, "");

  if (digits.length === 10) {
    return `+1${digits}`;
  }

  if (
    digits.length === 11 &&
    digits.startsWith("1")
  ) {
    return `+${digits}`;
  }

  throw new Error(
    "The customer phone number is not a valid U.S. SMS number."
  );
}

let client:
  ReturnType<typeof twilio> | null =
  null;

function getTwilioClient() {
  if (client) {
    return client;
  }

  client =
    twilio(
      requireEnv(
        "TWILIO_ACCOUNT_SID"
      ),
      requireEnv(
        "TWILIO_AUTH_TOKEN"
      )
    );

  return client;
}

export async function sendSms(
  to: string,
  body: string
) {
  const cleanBody =
    body.trim();

  if (!cleanBody) {
    throw new Error(
      "SMS message body cannot be empty."
    );
  }

  const normalizedTo =
    normalizePhoneNumber(to);

  const from =
    normalizePhoneNumber(
      requireEnv(
        "TWILIO_PHONE_NUMBER"
      )
    );

  const twilioClient =
    getTwilioClient();

  try {
    const message =
      await twilioClient.messages.create(
        {
          body:
            cleanBody,

          from,

          to:
            normalizedTo,
        }
      );

    console.log(
      "Twilio SMS accepted:",
      {
        sid:
          message.sid,

        status:
          message.status,

        to:
          normalizedTo,
      }
    );

    return message;
  } catch (error) {
    /*
     * Twilio errors commonly include code/status/moreInfo.
     * Preserve the original error for the API route while also
     * logging enough server-side detail to diagnose delivery.
     */
    const details =
      error as {
        code?: number;
        status?: number;
        message?: string;
        moreInfo?: string;
      };

    console.error(
      "Twilio SMS send failed:",
      {
        to:
          normalizedTo,

        code:
          details.code,

        status:
          details.status,

        message:
          details.message,

        moreInfo:
          details.moreInfo,
      }
    );

    throw error;
  }
}