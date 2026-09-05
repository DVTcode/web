# 🚀 Hướng dẫn Deploy lên Vercel

## Cấu hình đã chuẩn bị sẵn

✅ **`apps/web/package.json`**:
- `build`: chạy `prisma generate && next build` → luôn sinh Prisma Client cho môi trường server trước khi build
- `postinstall`: chạy `prisma generate` → chạy cả khi Vercel `npm install`
- `engines`: Node >= 20

✅ **`vercel.json`** (ở root repo):
- Chỉ cho Vercel biết project ở `apps/web/`
- `outputDirectory`: `apps/web/.next`

✅ **`prisma/schema.prisma`**:
- `binaryTargets` bao gồm `rhel-openssl-3.0.x` (môi trường Vercel) + `native` (dev local)

---

## Bước deploy

### 1. Push code lên GitHub
```bash
git add .
git commit -m "chore: setup Vercel deployment with Prisma generate"
git push origin main
```

### 2. Tạo project trên Vercel
- Vào https://vercel.com/new
- Import GitHub repo này
- Vercel sẽ tự động đọc `vercel.json` và build trong `apps/web/`

### 3. Cấu hình Environment Variables (BẮT BUỘC)
Vào **Project Settings → Environment Variables**, thêm cho cả **Production, Preview, Development**:

| Biến | Giá trị mẫu | Ghi chú |
|------|------------|---------|
| `DATABASE_URL` | `mysql://...` | **BẮT BUỘC** - Database production |
| `NEXTAUTH_SECRET` | random 32+ ký tự | Generate bằng `openssl rand -base64 32` |
| `NEXTAUTH_URL` | `https://your-app.vercel.app` | **KHÔNG dùng localhost** |
| `GEMINI_API_KEY` | `AIza...` | Google AI API key |
| `GITHUB_WEBHOOK_SECRET` | random hex | |
| `NEXT_PUBLIC_API_URL` | `https://your-app.vercel.app/api` | **KHÔNG dùng localhost** |

> ⚠️ **KHÔNG BAO GIỜ** push file `.env` lên GitHub. Mọi secret chỉ set trên Vercel dashboard.

### 4. Deploy database
- Dùng [TiDB Cloud](https://tidbcloud.com), [PlanetScale](https://planetscale.com), hoặc [Railway](https://railway.app) cho MySQL tương thích Prisma
- Copy connection string vào `DATABASE_URL` trên Vercel

### 5. Chạy migration lần đầu (qua Vercel CLI local)
```bash
npm i -g vercel
vercel login
vercel env pull .env.local   # Kéo env từ Vercel về local
cd apps/web
npx prisma migrate deploy
```

### 6. Trigger redeploy
- Push 1 commit rỗng, hoặc click "Redeploy" trên Vercel dashboard

---

## ⚠️ Lỗi thường gặp & cách fix

### ❌ `Prisma Client could not be located`
**Nguyên nhân**: `prisma generate` không chạy trước `next build`.
**Fix**: Đã có sẵn trong `package.json` (`build` script). Nếu vẫn lỗi, kiểm tra `postinstall` có chạy không.

### ❌ `Can't reach database server`
**Nguyên nhân**: `DATABASE_URL` trỏ vào localhost hoặc bị firewall.
**Fix**: Đổi sang connection string của managed DB (TiDB Cloud, PlanetScale...).

### ❌ `Prisma binary engine not found`
**Nguyên nhân**: `binaryTargets` không bao gồm platform của Vercel.
**Fix**: Đã có `rhel-openssl-3.0.x` trong schema.

### ❌ `NEXTAUTH_URL is invalid`
**Nguyên nhân**: Vẫn trỏ về `http://localhost:3000`.
**Fix**: Đổi sang URL Vercel thật trên dashboard.

---

## 📊 Giám sát sau deploy

- Xem logs: Vercel Dashboard → Deployments → click vào deployment → Logs
- Test API: `https://your-app.vercel.app/api/health`
- Monitor errors: Tích hợp Sentry (tùy chọn)
