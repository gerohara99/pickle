const twilio = require("twilio");

const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_FROM } =
  process.env;

// Environment variable validation
if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_WHATSAPP_FROM) {
  console.warn(
    "Twilio config missing: Check TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_FROM"
  );
}

const twilioClient = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);

async function sendWhatsAppMessage(to, message) {
  // Input validation
  if (typeof to !== "string" || !to.trim()) {
    throw new Error("sendWhatsAppMessage: 'to' must be a non-empty string.");
  }
  if (typeof message !== "string" || !message.trim()) {
    throw new Error(
      "sendWhatsAppMessage: 'message' must be a non-empty string."
    );
  }
  if (!TWILIO_WHATSAPP_FROM) {
    throw new Error("sendWhatsAppMessage: TWILIO_WHATSAPP_FROM is not set.");
  }

  try {
    const result = await twilioClient.messages.create({
      from: TWILIO_WHATSAPP_FROM,
      to: `whatsapp:${to}`,
      body: message,
    });
    if (process.env.NODE_ENV === "development") {
      console.log("WhatsApp message sent:", result.sid);
    }
    return result;
  } catch (err) {
    console.error("sendWhatsAppMessage error:", err);
    throw err;
  }
}

// Export client, from number, and send function
module.exports = {
  twilioClient,
  whatsappFrom: TWILIO_WHATSAPP_FROM,
  sendWhatsAppMessage,
};
