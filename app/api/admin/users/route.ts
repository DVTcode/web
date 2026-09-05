import { requireAdmin, json } from '@/lib/adminGuard';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
  await requireAdmin();
  const { searchParams } = new URL(req.url);
  const query = (searchParams.get('query') ?? '').trim().toLowerCase();

  const users = await prisma.user.findMany({
    where: query ? {
      OR: [
        { email: { contains: query } },
        { name: { contains: query } },
      ],
    } : undefined,
    select: { id: true, name: true, email: true, status: true, globalRole: true, lastLoginAt: true },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  return json({ users });
}

import bcrypt from 'bcryptjs';

export async function POST(req: Request) {
  const me = await requireAdmin();
  const { name, email, password, role } = await req.json();

  if (!email || !password || password.length < 6) {
    return json({ error: 'Invalid input' }, 400);
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return json({ error: 'Email already exists' }, 409);

  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash: hashedPassword,
      globalRole: role || 'STANDARD',
      status: 'ACTIVE',
    },
  });

  await prisma.auditLog.create({
    data: {
      actorId: me.id,
      action: 'USER_CREATED',
      entityType: 'User',
      entityId: user.id,
      details: { email: user.email, role: user.globalRole },
    },
  });

  return json({ ok: true, id: user.id });
}
