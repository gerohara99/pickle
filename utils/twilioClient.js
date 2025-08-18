const twilio = require("twilio");
const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);
const whatsappFrom = process.env.TWILIO_WHATSAPP_FROM; // Use env variable!

async function sendWhatsAppMessage(to, message) {
  return twilioClient.messages.create({
    from: whatsappFrom,
    to: `whatsapp:${to}`,
    body: message,
  });
}

module.exports = { twilioClient, whatsappFrom, sendWhatsAppMessage };
