const { Resend } = require('resend');

// Debug log to check if key is loaded during boot
if (!process.env.RESEND_API_KEY) {
    console.error('❌ CRITICAL ERROR: RESEND_API_KEY is missing from environment variables!');
}

const resend = new Resend(process.env.RESEND_API_KEY);

const sendInviteEmail = async (toEmail, staffName, firmName, role, setupLink) => {
    try {
        // Double check key before sending
        if (!process.env.RESEND_API_KEY) {
            throw new Error('RESEND_API_KEY is not configured in Railway Variables');
        }

        const roleName = role === 'ca_staff' ? 'Senior Staff' : 'Article Assistant';
        console.log(`🚀 Resend Engine: Preparing to send invite to ${toEmail}`);

        const { data, error } = await resend.emails.send({
            // Sandbox mode mein 'onboarding@resend.dev' hi use karna hoga
            from: 'VyaparOS <onboarding@resend.dev>',
            to: [toEmail],
            subject: `Action Required: Join ${firmName} on VyaparOS`,
            html: `
                <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                    <h2 style="color: #0284c7;">Welcome to VyaparOS 🚀</h2>
                    <p>Hello <strong>${staffName}</strong>,</p>
                    <p>You have been invited to join <strong>${firmName}</strong> as a <strong>${roleName}</strong>.</p>
                    <div style="margin: 30px 0;">
                        <a href="${setupLink}" style="background-color: #0284c7; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">
                            Accept Invitation
                        </a>
                    </div>
                    <p style="font-size: 12px; color: #666;">If the button doesn't work, copy this link: ${setupLink}</p>
                </div>
            `
        });

        if (error) {
            console.error('❌ RESEND API ERROR:', error);
            return false;
        }

        console.log(`✅ SUCCESS: Email dispatched via Resend. ID: ${data.id}`);
        return true;

    } catch (err) {
        console.error('❌ EMAIL SERVICE SYSTEM FAILURE:', err.message);
        return false;
    }
};

module.exports = {
    sendInviteEmail,
    sendInvitationEmail: sendInviteEmail
};