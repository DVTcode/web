# 🚀 Hướng dẫn Deploy lên Vercel

## Cấu hình đã chuẩn bị sẵn

✅ **`apps/web/vercel.json`** (đặt cùng folder với `package.json`):
- `buildCommand`: `npm run build` — đã bao gồm `prisma generate` ở bước build
- `framework`: `nextjs` — Vercel tự tối ưu cho Next.js
- **KHÔNG set `regions`** vì tài khoản **Hobby (Free)** bị giới hạn — Function bắt buộc chạy ở `iad1` (Washington, D.C., Mỹ). Nếu muốn custom region (ví dụ `sin1` Singapore để giảm latency cho user VN), phải nâng cấp lên **Pro plan ($20/tháng)**.

✅ **`apps/web/package.json`**:
- `build`: chạy `prisma generate && next build` → luôn sinh Prisma Client cho môi trường server trước khi build
- `postinstall`: chạy `prisma generate` → chạy cả khi Vercel `npm install`
- `engines`: Node >= 20

✅ **`prisma/schema.prisma`**:
- `binaryTargets` bao gồm `rhel-openssl-3.0.x` (môi trường Vercel) + `native` (dev local)

---

## Bước deploy

### 1. Push code lên GitHub
```bash
cd apps/web
git status
git add .
git commit -m "chore: deploy setup"
git push origin master
```

### 2. Tạo project trên Vercel
- Vào https://vercel.com/new
- Import GitHub repo **`DVTcode/web`**
- **Root Directory**: để trống (`./`) vì `vercel.json` đã ở ngay root của repo GitHub
- **Framework Preset**: Next.js (auto-detect)
- Click **Deploy**

> 💡 Vercel sẽ đọc `vercel.json` để biết `buildCommand`, `installCommand`, `framework`. Vì project nằm thẳng trong repo GitHub (không phải monorepo), Root Directory = `./` là đúng.

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
- PlanetScale hiện **KHÔNG hỗ trợ Prisma migration** (chỉ HTTP) — khuyến nghị **TiDB Cloud** hoặc **Railway** cho Prisma
- Copy connection string vào `DATABASE_URL` trên Vercel

### 5. Chạy migration lần đầu (qua Vercel CLI local)
```bash
npm i -g vercel
vercel login
vercel link                  # Link local với project Vercel
vercel env pull .env.local   # Kéo env từ Vercel về local
cd apps/web
npx prisma migrate deploy
```

### 6. Trigger redeploy
- Push 1 commit rỗng, hoặc click **Redeploy** trên Vercel dashboard

---

## ⚠️ Lỗi thường gặp & cách fix

### ❌ `Prisma Client could not be located`
**Nguyên nhân**: `prisma generate` không chạy trước `next build`.
**Fix**: Đã có sẵn trong `package.json` (`build` script). Nếu vẫn lỗi, kiểm tra `postinstall` có chạy không.

### ❌ `Can't reach database server`
**Nguyên nhân**: `DATABASE_URL` trỏ vào localhost hoặc bị firewall.
**Fix**: Đổi sang connection string của managed DB (TiDB Cloud, Railway...).

### ❌ `Prisma binary engine not found`
**Nguyên nhân**: `binaryTargets` không bao gồm platform của Vercel.
**Fix**: Đã có `rhel-openssl-3.0.x` trong schema.

### ❌ `NEXTAUTH_URL is invalid`
**Nguyên nhân**: Vẫn trỏ về `http://localhost:3000`.
**Fix**: Đổi sang URL Vercel thật trên dashboard.

### ❌ `Configuration violates platform policy: regions`
**Nguyên nhân**: Tài khoản **Hobby (Free)** không cho phép custom `regions` trong `vercel.json` — Function bắt buộc chạy ở `iad1`.
**Fix**: Xóa trường `regions` khỏi `vercel.json`. Function sẽ chạy ở Washington, D.C. (Mỹ) — latency từ VN khoảng 180-250ms, chấp nhận được cho dev/test. Khi cần tối ưu, upgrade Pro plan.

### ❌ Build fail vì root directory sai
**Nguyên nhân**: Vercel tự tìm `package.json` ở root của repo GitHub, không tự đi vào `apps/web/`.
**Fix**: Project Settings → General → **Root Directory** = `apps/web`. Hoặc move `vercel.json` vào `apps/web/` (đã làm).

---

## 📊 Giám sát sau deploy

- Xem logs: Vercel Dashboard → Deployments → click vào deployment → Logs
- Test API: `https://your-app.vercel.app/api/health`
- Monitor errors: Tích hợp Sentry (tùy chọn)
- Xem region của Function: Vercel Dashboard → Project → Functions → xem tab "Functions"

---

## 🌏 Về region & latency (gói Hobby)

| Vị trí Function | Latency từ VN | Ghi chú |
|----------------|---------------|---------|
| `iad1` (Washington) | 180-250ms | Mặc định Hobby — đủ dùng cho dev/test |
| `sin1` (Singapore) | 30-50ms | **Cần Pro plan** — chỉ nên dùng khi có user thật nhiều |

**Khuyến nghị:** Dùng Hobby để phát triển & test, upgrade Pro khi launch thật.
