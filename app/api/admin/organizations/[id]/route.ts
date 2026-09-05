import { requireAdmin, json } from '@/lib/adminGuard';
import { prisma } from '@/lib/prisma';

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, ctx: Ctx) {
  const me = await requireAdmin();
  const { id } = await ctx.params;                            // ✅ Next 15: await
  const { status } = await req.json(); // 'PENDING' | 'ACTIVE' | 'PAUSED'
  if (!['PENDING','ACTIVE','PAUSED'].includes(status)) return json({ error: 'Bad status' }, 400);

  await prisma.systemSetting.upsert({
    where: { key: `ORG_STATUS_${id}` },
    update: { value: { status }, updatedById: me.id, updatedAt: new Date() },
    create: { key: `ORG_STATUS_${id}`, value: { status }, updatedById: me.id },
  });

  await prisma.auditLog.create({
    data: { actorId: me.id, action: 'ORG_STATUS_CHANGED', entityType: 'Organization', entityId: id, details: { status } }
  });

  return json({ ok: true });
}
