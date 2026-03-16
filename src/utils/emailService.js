const { Resend } = require("resend");

const resend = new Resend(process.env.RESEND_API_KEY);

const sendOTP = async (toEmail, otp) => {
  await resend.emails.send({
    from: "TaskFlow <onboarding@resend.dev>",
   to: toEmail,
    subject: "TaskFlow — Password Reset OTP",
    text: `Your OTP code is: ${otp}\n\nExpires in 10 minutes.`,
  });
};

module.exports = { sendOTP };