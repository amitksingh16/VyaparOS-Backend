const nodemailer = require('nodemailer');

const sendInvitationEmail = async (toEmail, staffName, firmName, role, setupLink) => {
    try {
        // Updated Transporter for Cloud Environments
        const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST || 'smtp.gmail.com',
            port: parseInt(process.env.SMTP_PORT) || 587, // Changed from 465 to 587
            secure: false, // secure: false is MANDATORY for port 587
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            },
            // TLS configuration to handle handshake issues
            tls: {
                rejectUnauthorized: false
            },
            connectionTimeout: 10000, // 10 seconds
            greetingTimeout: 10000,
            socketTimeout: 10000
        });

        const roleName = role === 'ca_staff' ? 'Senior Staff' : 'Article Assistant';

        const mailOptions = {
            from: `"VyaparOS Workspace" <${process.env.EMAIL_USER}>`,
            to: toEmail,
            subject: `Action Required: Invitation to join ${firmName} on VyaparOS`,
            html: `
                <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #f8fafc;">
                    <div style="text-align: center; margin-bottom: 30px;">
                        <h2 style="color: #0f172a; font-size: 24px; margin: 0;">Welcome to VyaparOS 🚀</h2>
                    </div>
                    <div style="background-color: white; padding: 30px; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
                        <p style="color: #334155; font-size: 16px; margin-top: 0;">Hello <strong>${staffName}</strong>,</p>
                        <p style="color: #475569; font-size: 16px; line-height: 1.6;">
                            You have been invited to join <strong>${firmName}</strong> as a <strong>${roleName}</strong>. 
                            VyaparOS is your firm's central compliance and practice management control room.
                        </p>
                        <div style="text-align: center; margin: 40px 0;">
                            <a href="${setupLink}" style="background-color: #0284c7; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; display: inline-block;">
                                Secure Your Account
                            </a>
                        </div>
                        <p style="color: #64748b; font-size: 14px; border-top: 1px solid #e2e8f0; padding-top: 20px;">
                            If the button doesn't work, copy and paste this link into your browser:<br>
                            <a href="${setupLink}" style="color: #0284c7; word-break: break-all;">${setupLink}</a>
                        </p>
                    </div>
                </div>
            `
        };

        console.log(`🚀 Attempting to send real email to: ${toEmail} via Port 587...`);

        await transporter.sendMail(mailOptions);

        console.log(`✅ SUCCESS: Invitation email delivered to ${toEmail}`);
        return true;

    } catch (error) {
        console.error(`❌ EMAIL ENGINE FAILED:`, error);
        return false;
    }
};

module.exports = { sendInvitationEmail };