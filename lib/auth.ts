// lib/auth.ts
import type { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { headers } from "next/headers";

// Khai báo chuẩn rập khuôn (Schema) để kiểm tra dữ liệu đầu vào khi đăng nhập
const schema = z.object({
  email: z.string().email(),
  password: z.string().min(6), // Mật khẩu ít nhất 6 ký tự
});

// Cấu hình trung tâm cho thư viện NextAuth
export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as any, // Dùng Prisma làm cầu nối với Database
  session: { strategy: 'jwt' }, // Sử dụng chiến lược lưu Session qua JSON Web Token (JWT) trong Cookie
  providers: [
    // Định nghĩa Provider Đăng nhập bằng Email/Password (Credentials)
    CredentialsProvider({
      credentials: { email: {}, password: {} },
      async authorize(raw) {
        // Kiểm tra dữ liệu đầu vào qua schema
        const ok = schema.safeParse(raw);
        if (!ok.success) return null; // Nếu vi phạm schema thì từ chối đăng nhập

        const { email, password } = ok.data;

        // Truy xuất user từ Database dựa theo email
        const u = await prisma.user.findUnique({
          where: { email },
          select: {
            id: true,
            name: true,
            email: true,
            passwordHash: true, // Lấy chuỗi băm của mật khẩu để đối chiếu
            globalRole: true,
            status: true,
          },
        });
        if (!u || !u.passwordHash) return null; // Nếu không tìm thấy hoặc tài khoản chưa có mật khẩu (Đăng nhập MXH)

        // Đối chiếu mật khẩu nhập vào với mật khẩu trong Database băm bằng thư viện bcrypt
        const passOK = await bcrypt.compare(password, u.passwordHash);
        if (!passOK) return null; // Sai mật khẩu

        // Cập nhật lại thời gian đăng nhập cuối cùng (lastLoginAt)
        await prisma.user.update({
          where: { id: u.id },
          data: { lastLoginAt: new Date() },
        });

        // Tạo một Audit Log để lưu lại lịch sử hành động Login của User này
        await prisma.auditLog.create({ data: { actorId: u.id, action: 'LOGIN' } });
        // (tuỳ chọn) chặn tài khoản không ACTIVE
        // if (u.status !== 'ACTIVE') return null;

        // Trả về "user" tối thiểu; NextAuth mặc định sẽ nhét id của user vào biến token.sub
        return {
          id: u.id,
          name: u.name ?? null,
          email: u.email,
          // Bắt buộc phải đưa globalRole ở đây để copy sang token ở callback jwt phía dưới
          globalRole: u.globalRole,
        } as any;
      },
    }),
  ],
  pages: { signIn: '/sign-in' }, // Tùy chọn đường dẫn custom để hệ thống tự redirect khi gặp route bảo mật
  // Khối các Callbacks để tinh chỉnh nội dung của Token và Session
  callbacks: {
    // 1. JWT Callback chạy mỗi khi token JWT được tạo/cập nhật (khi login hoặc check session)
    async jwt({ token, user }) {
      // Lần đăng nhập đầu tiên: copy thông tin từ "user" (trả về từ hàm authorize) sang token
      if (user) {
        // id chuẩn nằm ở token.sub
        token.sub = (user as any).id;
        (token as any).globalRole =
          (user as any).globalRole ?? (token as any).globalRole ?? 'STANDARD';
      }

      // Đề phòng trường hợp Refresh hay logic nào đó làm mất globalRole, ta dự phòng query DB 1 lần
      if (!(token as any).globalRole && token.sub) {
        const dbu = await prisma.user.findUnique({
          where: { id: token.sub },
          select: { globalRole: true },
        });
        (token as any).globalRole = dbu?.globalRole ?? 'STANDARD';
      }

      return token;
    },

    // 2. Session Callback chạy mỗi khi Client gọi hàm useSession() hoặc getServerSession()
    // Nhiệm vụ của nó là bóc tách các data custom từ 'token' (Backend) và truyền vào 'session' (Client) an toàn.
    async session({ session, token }) {
      if (session.user) {
        // Đẩy id của User từ token.sub ra cho Client dễ biết user.id
        (session.user as any).id = token.sub; // 👈 hàm requireUser() sẽ đọc cái này
        // Gắn globalRole vào Session để Client biết quyền của User
        (session.user as any).globalRole =
          (token as any).globalRole ?? 'STANDARD';
      }
      return session;
    },
  },
};
