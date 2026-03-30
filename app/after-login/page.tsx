// apps/web/app/after-login/page.tsx
// Server Component này chịu trách nhiệm xử lý logic sau khi người dùng đăng nhập thành công.

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth'; // Lấy session ở phía server
import { authOptions } from '@/lib/auth'; // Cấu hình NextAuth
import { prisma } from '@/lib/prisma'; // Kết nối CSDL Prisma

export default async function AfterLogin() {
  // Lấy thông tin phiên đăng nhập hiện tại
  const session = await getServerSession(authOptions);

  // Kiểm tra nếu chưa đăng nhập (không có session hoặc không có user ID)
  // thì chuyển hướng ngược lại trang đăng nhập.
  if (!session?.user?.id) {
    redirect('/sign-in?callbackUrl=/after-login');
  }

  // Nếu đã đăng nhập, tiến hành ghi nhận thông tin đăng nhập (Audit Log)
  const h = await headers();
  // Lấy địa chỉ IP của người dùng từ header (ưu tiên x-forwarded-for nếu qua proxy/load balancer)
  const ip =
    h.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    h.get('x-real-ip') ||
    'Unknown IP';
  // Lấy User Agent (thông tin trình duyệt/thiết bị)
  const ua = h.get('user-agent') || 'Unknown UA';

  try {
    // 1. Cập nhật thời gian đăng nhập lần cuối và IP cho user trong bảng User
    await prisma.user.update({
      where: { id: session.user.id },
      data: { lastLoginAt: new Date(), lastLoginIp: ip },
    });

    // 2. Ghi một bản ghi mới vào bảng AuditLog để lưu lịch sử hoạt động
    await prisma.auditLog.create({
      data: {
        actorId: session.user.id,
        action: 'LOGIN', // Hành động là Đăng nhập
        ip,
        userAgent: ua,
      },
    });
  } catch (e) {
    // Nếu việc ghi log thất bại, chỉ in lỗi ra console chứ KHÔNG chặn người dùng đăng nhập.
    // Điều này đảm bảo trải nghiệm người dùng không bị gián đoạn vì lỗi phụ trợ.
    console.error('after-login audit failed', e);
  }

  // Lấy role (vai trò) của user từ session.
  // Lưu ý: trường globalRole này đã được cấu hình custom trong phần callbacks của NextAuth.
  const role = (session.user as any)?.globalRole ?? 'STANDARD';

  // Điều hướng dựa trên vai trò:
  // Nếu là Admin hoặc Support -> chuyển đến trang quản trị hệ thống (/system)
  if (role === 'SYS_ADMIN' || role === 'SYS_SUPPORT') {
    redirect('/system');
  }

  // Nếu là người dùng bình thường -> chuyển đến Dashboard chính (/dashboard)
  redirect('/dashboard');
}
