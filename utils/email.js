const nodeMailer = require("nodemailer");

const sendEmail = async (options) => {
  // Input validation
  if (
    !options ||
    typeof options.email !== "string" ||
    typeof options.subject !== "string" ||
    typeof options.message !== "string"
  ) {
    throw new Error(
      "sendEmail: Invalid options provided. 'email', 'subject', and 'message' are required strings."
    );
  }

  // Transporter configuration validation
  const requiredEnv = [
    "EMAIL_HOST",
    "EMAIL_PORT",
    "EMAIL_USERNAME",
    "EMAIL_PASSWORD",
  ];
  requiredEnv.forEach((key) => {
    if (!process.env[key]) {
      console.warn(`sendEmail: Missing environment variable ${key}`);
    }
  });

  const transporter = nodeMailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: Number(process.env.EMAIL_PORT) || 587,
    secure: Number(process.env.EMAIL_PORT) === 465, // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_USERNAME,
      pass: process.env.EMAIL_PASSWORD,
    },
    connectionTimeout: 10000,
  });

  const mailOptions = {
    from: "Club Admin <clubadmin@gmail.com>",
    to: options.email,
    subject: options.subject,
    text: options.message,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    if (process.env.NODE_ENV === "development") {
      console.log("Email sent:", info.response);
    }
    return info;
  } catch (err) {
    console.error("sendEmail error:", err);
    throw err;
  }
};

module.exports = sendEmail;
