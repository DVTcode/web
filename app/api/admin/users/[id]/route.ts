import { requireAdmin, json } from '@/lib/adminGuard';
import { prisma } from '@/lib/prisma';

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, ctx: Ctx) {
  const me = await requireAdmin();
  const { id } = await ctx.params;
  const { action } = await req.json(); // 'SUSPEND' | 'ACTIVATE'

  if (!['SUSPEND','ACTIVATE'].includes(action)) return json({ error: 'Bad action' }, 400);

  const data = action === 'SUSPEND'
    ? { status: 'SUSPENDED' as const, suspendedAt: new Date(), suspendedById: me.id }
    : { status: 'ACTIVE' as const, suspendedAt: null, suspendedById: null, suspendedReason: null };

  const u = await prisma.user.update({ where: { id }, data });

  await prisma.auditLog.create({
    data: {
      actorId: me.id,
      action: action === 'SUSPEND' ? 'USER_SUSPENDED' : 'USER_ACTIVATED',
      entityType: 'User',
      entityId: id,
      details: { email: u.email },
    },
  });

  return json({ ok: true });
}
