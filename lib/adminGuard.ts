// lib/adminGuard.ts
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// Định nghĩa các loại vai trò Hệ Thống (Trái ngược với vai trò Dự Án)
type GlobalRole = 'SYS_ADMIN' | 'SYS_SUPPORT' | 'STANDARD';
type UserStatus = 'ACTIVE' | 'SUSPENDED' | 'INVITED' | 'DELETED';

// Hàm bảo vệ Route: Chỉ những ai có GlobalRole nằm trong mảng `roles` truyền vào mới được đi tiếp
export async function requireSystemRoles(roles: GlobalRole[]) {
  // 1. Lấy thông tin session phiên đăng nhập hiện tại
  const session = await getServerSession(authOptions);
  const user = session?.user as (null | {
    id: string;
    email?: string | null;
    globalRole?: GlobalRole;
    status?: UserStatus;
  }) ?? null;

  // Nếu chưa đăng nhập => Ném lỗi UNAUTHENTICATED
  if (!user?.id) {
    const err: any = new Error('UNAUTHENTICATED');
    err.status = 401; // Mã lỗi 401 Unauthorized
    throw err;
  }

  // 2. Lấy dữ liệu vai trò/trạng thái từ session trước (nhanh nhất)
  let role: GlobalRole | undefined = user.globalRole;
  let status: UserStatus | undefined = user.status;

  // 3. Fallback: Nếu JWT thiếu hoặc hỏng, chọc thẳng vào DB để lấy đảm bảo độ chính xác tuyệt đối
  if (!role || !status) {
    try {
      const dbu = await prisma.user.findUnique({
        where: { id: user.id },
        select: { globalRole: true, status: true },
      });
      role = (role ?? dbu?.globalRole ?? 'STANDARD') as GlobalRole;
      status = (status ?? dbu?.status ?? 'ACTIVE') as UserStatus;
    } catch {
      const err: any = new Error('FORBIDDEN');
      err.status = 403; // Bắt buộc chặn nếu Database sập hoặc không lấy được quyền
      throw err;
    }
  }

  // 4. Chặn luôn các tài khoản đã bị Khóa (SUSPENDED) hoặc Xóa (DELETED) khỏi nền tảng
  if (status === 'SUSPENDED' || status === 'DELETED') {
    const err: any = new Error('FORBIDDEN');
    err.status = 403;
    throw err;
  }

  // 5. Kiểm tra quyền của User đang có, có nằm trong "Danh sách quyền cho phép" hay không
  if (!roles.includes(role)) {
    const err: any = new Error('FORBIDDEN');
    err.status = 403; // Lỗi 403: Có đăng nhập nhưng Không có quyền truy cập
    throw err;
  }

  // Pass mọi cổng kiểm duyệt => Trả về thông tin User hợp lệ
  return { id: user.id, email: user.email ?? undefined, globalRole: role, status };
}

// Wrapper Helper: Thường xuyên dùng nhất để kiểm tra xem user gọi Api có phải là SYS_ADMIN hay không
export async function requireAdmin() {
  return requireSystemRoles(['SYS_ADMIN']);
}

// Helper hỗ trợ nhanh để trả về Response dạng JSON chuẩn với Next.js App Router API
export function json(data: any, init: number | ResponseInit = 200) {
  const status = typeof init === 'number' ? init : (init as ResponseInit).status ?? 200;
  const headers = new Headers(typeof init === 'number' ? {} : (init as ResponseInit).headers ?? {});
  headers.set('content-type', 'application/json; charset=utf-8'); // Gắn header Json
  return new Response(JSON.stringify(data), { ...(typeof init === 'number' ? { status } : init), headers });
}
