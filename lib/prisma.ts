// lib/prisma.ts
import { PrismaClient } from '../app/generated/prisma';

// Mẹo nhỏ cho môi trường Next.js: Gán biến vào global object
// Để tránh việc tạo ra quá nhiều kết nối database mỗi khi Next.js hot-reload (HMR)
const globalForPrisma = global as unknown as { prisma?: PrismaClient };

// Export prisma instance duy nhất của ứng dụng
// Nếu đã lưu trong global thì lấy ra dùng, nếu chưa thì tạo mới với chế độ bật log cho 'error' và 'warn'
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({ log: ['error', 'warn'] });

// Chỉ gán ngược lại biến prisma vào global trong môi trường development (không áp dụng trên production)
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
