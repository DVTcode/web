// lib/rbac.ts
import { prisma } from '@/lib/prisma';

// Danh sách các vai trò (Role) trong một Dự án cụ thể
export type RoleRank = 'VIEWER' | 'REVIEWER' | 'MEMBER' | 'LEAD' | 'MANAGER';

// Gán số điểm (Rank) cho từng vai trò để dễ dàng so sánh lớn/nhỏ
const RANK: Record<RoleRank, number> = {
  VIEWER: 0, REVIEWER: 1, MEMBER: 2, LEAD: 3, MANAGER: 4,
};

// Hàm tiện ích: So sánh xem role hiện tại có Đạt hoặc Vượt Mức một role yêu cầu tối thiểu (min) hay không
export function atLeast(role: string | null | undefined, min: RoleRank) {
  if (!role) return false;
  const r = role as RoleRank;
  return (RANK[r] ?? -1) >= RANK[min];
}

// Hàm truy vấn Database lấy quyền của một User trong một Project cụ thể
export async function getProjectRole(userId: string, projectId: string) {
  const m = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId } }, // Tìm projectMember qua khóa chính kép
    select: { role: true },
  });
  return m?.role ?? null;
}

// Kiểm tra nhanh xem User có phải là Quản trị viên hệ thống (SYS_ADMIN) hay không
export function isSysAdmin(globalRole?: string | null) {
  return globalRole === 'SYS_ADMIN';
}
