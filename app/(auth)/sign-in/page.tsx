// apps/web/app/(auth)/sign-in/page.tsx
'use client';
import React, { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { Eye, EyeOff, Rocket, ArrowLeft, Mail, Lock, Chrome, Loader2 } from 'lucide-react';

const LoginPage = () => {
  const [formData, setFormData] = useState({ email: "", password: "", rememberMe: false });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const router = useRouter();
  const sp = useSearchParams();
  const rawCb = sp.get("callbackUrl");
  // Chỉ chấp nhận internal path, mặc định /after-login
  const callbackUrl = rawCb && rawCb.startsWith("/") ? rawCb : "/after-login";

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));

    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};
    if (!formData.email) newErrors.email = "Vui lòng nhập email";
    else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = "Email không hợp lệ";

    if (!formData.password) newErrors.password = "Vui lòng nhập mật khẩu";
    else if (formData.password.length < 6) newErrors.password = "Mật khẩu phải có ít nhất 6 ký tự";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ĐĂNG NHẬP bằng Credentials
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      const res = await signIn("credentials", {
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
        redirect: false,
        callbackUrl,
      });

      if (!res || res.error) {
        setErrors((prev) => ({ ...prev, password: "Sai email hoặc mật khẩu" }));
        return;
      }
      router.push(res.url || callbackUrl);
    } catch (err) {
      setErrors((prev) => ({ ...prev, password: "Có lỗi xảy ra. Vui lòng thử lại." }));
    } finally {
      setIsLoading(false);
    }
  };

  // ĐĂNG NHẬP OAuth
  const handleSocialLogin = (provider: "google" | "github") => {
    setIsLoading(true);
    // Với OAuth nên để redirect = true để NextAuth tự chuyển trang
    signIn(provider, { callbackUrl });
  };
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-purple-600 to-purple-800 flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-white/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-white/10 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-white/5 rounded-full blur-3xl"></div>
      </div>

      <div className="relative w-full max-w-md">
        <button
          onClick={() => window.history.back()}
          className="flex items-center space-x-2 text-white/80 hover:text-white transition-colors mb-8 group"
        >
          <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          <span>Quay lại trang chủ</span>
        </button>

        <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-8 shadow-2xl">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center space-x-3 mb-6">
              <div className="p-3 bg-white/20 backdrop-blur-md rounded-2xl">
                <Rocket className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-3xl font-bold text-white">DVTManagement</h1>
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Chào mừng trở lại!</h2>
            <p className="text-white/70">Đăng nhập để tiếp tục quản lý dự án của bạn</p>
          </div>

          {/* Social Login */}
          <div className="space-y-3 mb-6">
            <button
              onClick={() => handleSocialLogin("google")}
              className="w-full flex items-center justify-center space-x-3 py-3 px-4 bg-white/20 hover:bg-white/30 backdrop-blur-md border border-white/30 rounded-xl text-white transition-all duration-300 hover:scale-[1.02]"
              disabled={isLoading}
            >
              <Chrome className="w-5 h-5" />
              <span className="font-medium">Đăng nhập với Email</span>
            </button>

          </div>

          {/* Divider */}
          <div className="relative flex items-center justify-center my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/20"></div>
            </div>
            <div className="relative bg-gradient-to-br from-blue-600 via-purple-600 to-purple-800 px-4">
              <span className="text-white/70 text-sm">hoặc</span>
            </div>
          </div>

          {/* Login Form (submit để Enter hoạt động) */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-white/80 text-sm font-medium mb-2">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/60" />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className={`w-full pl-12 pr-4 py-3 bg-white/20 backdrop-blur-md border ${errors.email ? "border-red-400" : "border-white/30"
                    } rounded-xl text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-transparent transition-all duration-300`}
                  placeholder="Nhập email của bạn"
                  autoComplete="email"
                />
              </div>
              {errors.email && <p className="mt-2 text-red-300 text-sm">{errors.email}</p>}
            </div>

            <div>
              <label className="block text-white/80 text-sm font-medium mb-2">Mật khẩu</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/60" />
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  className={`w-full pl-12 pr-12 py-3 bg-white/20 backdrop-blur-md border ${errors.password ? "border-red-400" : "border-white/30"
                    } rounded-xl text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-transparent transition-all duration-300`}
                  placeholder="Nhập mật khẩu"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/60 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {errors.password && <p className="mt-2 text-red-300 text-sm">{errors.password}</p>}
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  name="rememberMe"
                  checked={formData.rememberMe}
                  onChange={handleInputChange}
                  className="w-4 h-4 text-green-500 bg-white/20 border-white/30 rounded focus:ring-green-500 focus:ring-2"
                />
                <span className="text-white/80 text-sm">Ghi nhớ đăng nhập</span>
              </label>
              <button type="button" onClick={() => router.push('/forgot-password')} className="text-white/80 hover:text-white text-sm transition-colors">
                Quên mật khẩu?
              </button>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-4 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center space-x-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Đang đăng nhập...</span>
                </>
              ) : (
                <span>Đăng nhập</span>
              )}
            </button>
          </form>

          <div className="text-center mt-8 pt-6 border-t border-white/20">
            <p className="text-white/70">
              Chưa có tài khoản?{" "}
              <button onClick={() => router.push("/sign-up")} className="text-white hover:text-green-300 font-semibold transition-colors">
                Đăng ký ngay
              </button>
            </p>
          </div>
        </div>

        <div className="text-center mt-8">
          <p className="text-white/60 text-sm">
            Bằng cách đăng nhập, bạn đồng ý với{" "}
            <button className="text-white/80 hover:text-white underline transition-colors">Điều khoản sử dụng</button> và{" "}
            <button className="text-white/80 hover:text-white underline transition-colors">Chính sách bảo mật</button>
          </p>
        </div>
      </div>

      <div className="fixed top-20 left-10 w-2 h-2 bg-white/30 rounded-full animate-pulse"></div>
      <div className="fixed top-40 right-20 w-3 h-3 bg-white/20 rounded-full animate-bounce" style={{ animationDelay: "0.5s" }}></div>
      <div className="fixed bottom-32 left-16 w-2 h-2 bg-white/40 rounded-full animate-pulse" style={{ animationDelay: "1s" }}></div>
      <div className="fixed bottom-20 right-12 w-1 h-1 bg-white/50 rounded-full animate-bounce" style={{ animationDelay: "1.5s" }}></div>
    </div>
  );
};

// Wrap LoginPage trong Suspense vì dùng useSearchParams()
// Bắt buộc cho Next 15 static generation
function LoginPageFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900">
      <Loader2 className="w-12 h-12 text-white animate-spin" />
    </div>
  );
}

export default function LoginPageWrapper() {
  return (
    <Suspense fallback={<LoginPageFallback />}>
      <LoginPage />
    </Suspense>
  );
}