import { requireAdmin, json } from '@/lib/adminGuard';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';
import { sendMail } from '@/lib/mail';

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: Request, ctx: Ctx) {
  const me = await requireAdmin();
  const { id } = await ctx.params;

  // 1) Tạo token ngẫu nhiên + hạn (30 phút)
  const token = crypto.randomBytes(32).toString('hex');
  const expires = new Date(Date.now() + 30 * 60 * 1000);

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) return json({ error: 'User not found' }, 404);

  // 2) Lưu vào bảng VerificationToken (có sẵn trong schema NextAuth)
  await prisma.verificationToken.create({
    data: {
      identifier: `PASSWORD_RESET:${id}`,
      token,
      expires,
    },
  });

  // 3) Tạo URL tuyệt đối (dùng APP_URL hoặc NEXTAUTH_URL)
  const baseUrl = process.env.APP_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000';
  const url = `${baseUrl}/reset-password?token=${encodeURIComponent(token)}`;

  await sendMail({ to: user.email, subject: 'Reset password', html: `Bấm vào <a href="${url}">đây</a>` });
  console.log('[DEV] Reset password URL:', url);

  // 5) Ghi audit
  await prisma.auditLog.create({
    data: { actorId: me.id, action: 'RESET_PASSWORD_SENT', entityType: 'User', entityId: id, details: { url } as any },
  });

  return json({ ok: true });
}
