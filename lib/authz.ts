// lib/authz.ts
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

type SystemRole = 'SYS_ADMIN' | 'SYS_SUPPORT' | 'STANDARD';

// 🎯 Khớp ENUM trong DB
export type ProjectRole = 'MANAGER' | 'LEAD' | 'MEMBER' | 'REVIEWER' | 'VIEWER';

// Thang bậc quyền (cao → thấp)
const ROLE_RANK: Record<ProjectRole, number> = {
  MANAGER: 50,
  LEAD: 40,
  MEMBER: 30,
  REVIEWER: 20,
  VIEWER: 10,
};

// Cho phép gọi với 1 hoặc nhiều role, tự hiểu là “ngưỡng tối thiểu”
// VD: allowed = ['MEMBER'] thì LEAD/MANAGER cũng được chấp nhận
export function expandAllowed(allowed: ProjectRole[]): ProjectRole[] {
  const min = Math.min(...allowed.map(r => ROLE_RANK[r]));
  return (Object.keys(ROLE_RANK) as ProjectRole[]).filter(r => ROLE_RANK[r] >= min);
}

// Cốt lõi của Hệ Thống Phân Quyền Bảo Mật (Authorization)
export async function requireUser() {
  // Lấy session từ Next.js Server
  const session = await getServerSession(authOptions);
  // Nếu không đăng nhập => throw 401 chặn luồng ngay lập tức
  if (!session?.user?.id) throw Object.assign(new Error('UNAUTHENTICATED'), { status: 401 });
  return session.user as any; // { id, email, globalRole? }
}

// Bắt buộc User gọi API này phải thỏa mãn 1 trong các Vai Trò Hệ Thống được truyền vào mảng `roles`
export async function requireSystemRole(roles: Array<SystemRole>) {
  const user = await requireUser(); // Cổng lọc 1: Phải có Session

  let globalRole: SystemRole | undefined = (user as any).globalRole;
  if (!globalRole) {
    // Nếu Client Token không có sẵn role => Call DB lấy mới nhất
    const dbu = await prisma.user.findUnique({
      where: { id: user.id },
      select: { globalRole: true },
    });
    globalRole = (dbu?.globalRole ?? 'STANDARD') as SystemRole;
  }

  // Cổng lọc 2: Trùng khớp role
  if (!roles.includes(globalRole)) {
    throw Object.assign(new Error('FORBIDDEN'), { status: 403 });
  }
  return { ...user, globalRole };
}

// Tùy chọn: nếu user là creator/lead của project nhưng chưa có membership,
// có thể tự động gắn vai trò tương ứng để tránh lỗi FORBIDDEN lần đầu.
const AUTO_ATTACH_CREATOR_OR_LEAD = true;

export async function requireProjectRole(
  projectId: string,
  allowed: ProjectRole[] | ProjectRole = ['MANAGER', 'LEAD', 'MEMBER', 'REVIEWER', 'VIEWER']
) {
  const allow = Array.isArray(allowed) ? allowed : [allowed];
  const expandedAllow = expandAllowed(allow); // áp dụng “ngưỡng”

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    throw Object.assign(new Error('UNAUTHENTICATED'), { status: 401 });
  }
  const user = session.user as any;

  // Đọc globalRole từ DB để chắc chắn
  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { globalRole: true },
  });
  const globalRole: SystemRole =
    ((dbUser?.globalRole as any) ?? (user.globalRole as any) ?? 'STANDARD') as SystemRole;

  // ✅ SYS_ADMIN: full quyền mọi project
  if (globalRole === 'SYS_ADMIN') {
    return { user: { ...user, globalRole }, membershipRole: 'MANAGER' as ProjectRole, globalRole };
  }

  // (tuỳ chọn) SYS_SUPPORT: chỉ cho xem nếu được phép VIEWER
  if (globalRole === 'SYS_SUPPORT' && expandedAllow.includes('VIEWER')) {
    return { user: { ...user, globalRole }, membershipRole: 'VIEWER' as ProjectRole, globalRole };
  }

  // Tìm membership hiện có
  let member = await prisma.projectMember.findFirst({
    where: { projectId, userId: user.id },
    select: { role: true },
  });

  // Nếu chưa có membership, nhưng user là creator/lead → gán/nhận vai trò tương ứng
  if (!member) {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { createdById: true, leadId: true },
    });

    if (project) {
      let inferredRole: ProjectRole | null = null;
      if (project.createdById === user.id) inferredRole = 'MANAGER'; // chủ dự án → MANAGER
      else if (project.leadId === user.id) inferredRole = 'LEAD';    // lead dự án → LEAD

      if (inferredRole) {
        if (AUTO_ATTACH_CREATOR_OR_LEAD) {
          // Gắn luôn membership để ổn định các request sau
          await prisma.projectMember.create({
            data: { projectId, userId: user.id, role: inferredRole },
          });
        }
        member = { role: inferredRole };
      }
    }
  }

  if (!member) {
    // Không có membership nào hợp lệ
    throw Object.assign(new Error('FORBIDDEN'), { status: 403 });
  }

  // Kiểm tra theo “ngưỡng” đã expand
  if (!expandedAllow.includes(member.role as ProjectRole)) {
    throw Object.assign(new Error('FORBIDDEN'), { status: 403 });
  }

  return { user: { ...user, globalRole }, membershipRole: member.role as ProjectRole, globalRole };
}

// Chặn API bảo mật dựa theo Quyền Hành trong riêng tư Dự án + hoặc bypass nếu là Quản trị viên
// Cho phép SYS_ADMIN bypass mọi rào cản Project Level
export async function requireProjectRoleOrSystem(
  projectId: string,
  allowed: ProjectRole[] | ProjectRole = ['MANAGER', 'LEAD', 'MEMBER', 'REVIEWER', 'VIEWER']
) {
  const allow = Array.isArray(allowed) ? allowed : [allowed];
  // Convert mảng ví dụ: "MEMBER" trở thành ["MANAGER", "LEAD", "MEMBER"] tự động
  const expandedAllow = expandAllowed(allow);

  const user = await requireUser();

  // Kiểm tra Global role
  let globalRole: SystemRole | undefined = (user as any).globalRole;
  if (!globalRole) {
    const dbu = await prisma.user.findUnique({
      where: { id: user.id },
      select: { globalRole: true },
    });
    globalRole = (dbu?.globalRole ?? 'STANDARD') as SystemRole;
  }

  // Nếu là SYS_ADMIN => Bypass trả về user (Coi như là MANAGER của Project)
  if (globalRole === 'SYS_ADMIN') {
    return { user, membershipRole: 'MANAGER' as ProjectRole, globalRole };
  }

  // Kiểm tra thư mục dự án xem User bình thường này có vai trò ở đây không
  const member = await prisma.projectMember.findFirst({
    where: { projectId, userId: (user as any).id },
    select: { role: true },
  });

  // Chặn 403 nếu cố tình hack GET API của project không có quyền truy cập
  if (!member || !expandedAllow.includes(member.role as ProjectRole)) {
    throw Object.assign(new Error('FORBIDDEN'), { status: 403 });
  }

  return { user, membershipRole: member.role as ProjectRole, globalRole };
}
