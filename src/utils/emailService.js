const { Resend } = require("resend");

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

async function sendInviteEmail(toEmail, inviteLink) {
    try {
        if (!resend) {
            throw new Error("RESEND_API_KEY is not configured");
        }

        console.log("Sending invite via Resend to:", toEmail);

        const response = await resend.emails.send({
            from: "VyaparOS <onboarding@resend.dev>",
            to: toEmail,
            subject: "You're invited to VyaparOS",
            html: `
        <h2>Welcome to VyaparOS 🚀</h2>
        <p>You have been invited to join the platform.</p>
        <a href="${inviteLink}" style="padding:10px 20px;background:#4f46e5;color:white;border-radius:6px;text-decoration:none;">
          Accept Invitation
        </a>
      `
        });

        console.log("Resend success:", response);
    } catch (error) {
        console.error("Email failed but continuing:", error.message);
    }
}

module.exports = { sendInviteEmail };
