import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    // Bỏ qua các thư mục chứa code tự động generate (Prisma client) — không kiểm tra
    ignores: [
      "app/generated/**",
      ".next/**",
      "node_modules/**",
    ],
  },
  {
    rules: {
      // Tắt rule cấm 'any' — project hiện đang dùng 'any' rộng rãi (Prisma/include, NextAuth session, etc.)
      // Sẽ bật lại sau khi refactor type-safe toàn bộ codebase
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
];

export default eslintConfig;
