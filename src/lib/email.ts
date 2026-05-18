import { Resend } from "resend"

const resend = new Resend(process.env.RESEND_API_KEY)

export async function sendVerificationEmail(
  email: string,
  name: string,
  token: string
) {
  const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000"
  const verifyUrl = `${baseUrl}/api/auth/verify-email?token=${token}`
  const from = process.env.RESEND_FROM ?? "DevStash <onboarding@resend.dev>"

  await resend.emails.send({
    from,
    to: email,
    subject: "Verify your DevStash email address",
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;color:#111;">
        <h2 style="margin-top:0;">Welcome to DevStash, ${name}!</h2>
        <p>Click the button below to verify your email address. This link expires in <strong>24 hours</strong>.</p>
        <a href="${verifyUrl}"
           style="display:inline-block;padding:12px 24px;background:#3b82f6;color:#fff;text-decoration:none;border-radius:6px;font-weight:600;margin:16px 0;">
          Verify Email
        </a>
        <p style="color:#6b7280;font-size:13px;margin-top:24px;">
          Or copy this link into your browser:<br/>
          <a href="${verifyUrl}" style="color:#3b82f6;">${verifyUrl}</a>
        </p>
        <p style="color:#9ca3af;font-size:12px;border-top:1px solid #e5e7eb;padding-top:16px;margin-top:24px;">
          If you didn&apos;t create a DevStash account, you can safely ignore this email.
        </p>
      </div>
    `,
  })
}
