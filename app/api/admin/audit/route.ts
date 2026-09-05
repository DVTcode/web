import { requireAdmin, json } from '@/lib/adminGuard';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
  await requireAdmin();
  const { searchParams } = new URL(req.url);
  const from = searchParams.get('from');
  const to   = searchParams.get('to');
  const q = (searchParams.get('q') ?? '').trim().toLowerCase();

  const where: any = {};
  if (from || to) {
    where.createdAt = {};
    if (from) where.createdAt.gte = new Date(`${from}T00:00:00Z`);
    if (to)   where.createdAt.lte = new Date(`${to}T23:59:59Z`);
  }
  if (q) {
    where.OR = [
      { action: { contains: q } },
      { entityType: { contains: q } },
    ];
  }

  const logs = await prisma.auditLog.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 200,
    select: { id: true, createdAt: true, actor: { select: { email: true } }, action: true, ip: true, userAgent: true, details: true }
  });

  const rows = logs.map(l => ({
    id: l.id,
    ts: l.createdAt.toISOString(),
    actor: l.actor?.email ?? '(unknown)',
    action: l.action,
    ip: l.ip ?? '',
    userAgent: l.userAgent ?? '',
    details: l.details ? JSON.stringify(l.details) : null,
  }));

  return json(rows);
}
