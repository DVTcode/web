// DEV/STUB mail sender — chỉ log ra console, không gửi email thật
// TODO: Thay bằng SMTP/Resend/SendGrid thật trước khi lên production
// TODO: Tạo issue # để nhắc team khi deploy production

export interface SendMailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

/**
 * Stub sendMail — chỉ log ra console.
 * Production cần thay bằng implementation thật (nodemailer/Resend/SendGrid).
 * Hiện tại chỉ dùng để pass build trên Vercel và dev local.
 */
export async function sendMail(opts: SendMailOptions): Promise<{ ok: true; preview: string }> {
  const preview = `[MAIL STUB] to=${opts.to} subject="${opts.subject}"`;
  // Log ra server console để dev có thể copy link reset password
  // eslint-disable-next-line no-console
  console.log(preview);
  // eslint-disable-next-line no-console
  console.log('[MAIL STUB HTML]', opts.html);
  return { ok: true, preview };
}
