// apps/web/app/(auth)/sign-up/page.tsx
'use client';
import React, { useState } from 'react';
import { Eye, EyeOff, Rocket, ArrowLeft, Mail, Lock, User, Building, Github, Chrome, Loader2, Check, X } from 'lucide-react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';

const RegisterPage = () => {
  // State lưu trữ dữ liệu điền vào form đăng ký
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    company: '',
    password: '',
    confirmPassword: '',
    agreeTerms: false, // Bắt buộc phải check đồng ý điều khoản
    subscribeNewsletter: true
  });

  // State quản lý UI như hiện/ấn password, trạng thái loading, lỗi và thanh sức mạnh mật khẩu
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [passwordStrength, setPasswordStrength] = useState(0);

  // Hook dùng để chuyển hướng trang của Next.js
  const router = useRouter();

  // Xử lý khi User nhập liệu vào các ô Input
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    // Cập nhật giá trị tương ứng vào formData (nếu là checkbox thì lấy giá trị checked)
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));

    // Xóa thông báo lỗi của field hiện tại khi người dùng bắt đầu nhập lại
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }

    // Nếu field đang nhập là password thì tính toán lại sức mạnh mật khẩu
    if (name === 'password') {
      setPasswordStrength(calculatePasswordStrength(value));
    }
  };

  // Hàm regex kiểm tra xem chuỗi có đúng định dạng Email hay không
  const isEmailValid = (e: string) => /\S+@\S+\.\S+/.test(e);
  // Cờ hiệu kiểm tra điều kiện kích hoạt nút submit (Có thể dùng nếu button cần bị block)
  const canSubmit =
    !isLoading &&
    isEmailValid(formData.email) &&
    formData.password.length >= 8 &&
    formData.password === formData.confirmPassword &&
    formData.agreeTerms === true;

  // Thuật toán tính toán sức mạnh mật khẩu (Max 100 điểm)
  const calculatePasswordStrength = (password: string): number => {
    let strength = 0;
    if (password.length >= 8) strength += 25; // Chiều dài tối thiểu
    if (/[a-z]/.test(password)) strength += 25; // Có chữ thường
    if (/[A-Z]/.test(password)) strength += 25; // Có chữ hoa
    if (/[0-9]/.test(password)) strength += 12.5; // Có số
    if (/[^A-Za-z0-9]/.test(password)) strength += 12.5; // Có ký tự đặc biệt
    return Math.min(100, strength);
  };

  const getPasswordStrengthColor = (strength: number): string => {
    if (strength < 25) return 'bg-red-500';
    if (strength < 50) return 'bg-orange-500';
    if (strength < 75) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getPasswordStrengthText = (strength: number): string => {
    if (strength < 25) return 'Yếu';
    if (strength < 50) return 'Trung bình';
    if (strength < 75) return 'Khá';
    return 'Mạnh';
  };

  // Hàm kiểm tra hợp lệ toàn bộ form trước khi gửi API
  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    if (!formData.email) {
      newErrors.email = 'Vui lòng nhập email';
    } else if (!isEmailValid(formData.email)) {
      newErrors.email = 'Email không hợp lệ';
    }

    if (!formData.password) {
      newErrors.password = 'Vui lòng nhập mật khẩu';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Mật khẩu phải có ít nhất 8 ký tự';
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Vui lòng xác nhận mật khẩu';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Mật khẩu không khớp';
    }

    if (!formData.agreeTerms) {
      newErrors.agreeTerms = 'Vui lòng đồng ý với điều khoản sử dụng';
    }

    setErrors(newErrors);
    // Form hợp lệ khi số lượng lỗi bằng 0
    return Object.keys(newErrors).length === 0;
  };

  // Xử lý gửi dữ liệu lên server khi bấm "Tạo Tài Khoản"
  const handleSubmit = async () => {
    // Nếu form lỗi thì không gửi data đi
    if (!validateForm()) return;
    setIsLoading(true);
    setErrors({});

    try {
      // 1. Gửi request POST sang API đăng ký của NextAuth hoặc custom API của bạn
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: formData.firstName.trim(),
          lastName: formData.lastName.trim(),
          email: formData.email.trim().toLowerCase(), // Format chuẩn email chữ thường
          company: formData.company.trim(),
          password: formData.password,
          confirm: formData.confirmPassword, // API của bạn nhận "confirm"
        }),
      });
      // Xử lý parse JSON dữ liệu trả về và tránh sinh lỗi cấu trúc Response
      const isJSON = res.headers.get("content-type")?.includes("application/json");
      const data = isJSON ? await res.json() : null;

      console.log("Đăng ký OK:", data); // Kiểm tra log thành công

      // Bắt lỗi khi API từ chối tạo tài khoản (Lỗi duplicate email, hoặc validation ở server)
      if (!res.ok) {
        const msg = data?.error || `Không tạo được tài khoản (HTTP ${res.status})`;
        setErrors(prev => ({ ...prev, email: msg }));
        return;
      }

      // 2. Tự động đăng nhập luôn bằng Credentials sau khi tạo thành công
      // Gọi lên Auth route của thư viện next-auth/react
      const si = await signIn('credentials', {
        redirect: false, // Ngăn chặn browser tự redirect (Reload page) để cho code JS tùy biến route
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
      });

      if (si?.error) {
        // nếu vì lý do gì đó không login được, chuyển sang trang đăng nhập thủ công
        return router.push('/sign-in');
      }

      // 3. Đăng nhập thành công → redirect thẳng về màn hình chính (Dashboard)
      router.push('/');
    } catch (err) {
      console.error(err);
      setErrors(prev => ({ ...prev, email: 'Không thể kết nối máy chủ' }));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSocialRegister = (provider: string) => {
    console.log(`Register with ${provider}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-purple-600 to-purple-800 flex items-center justify-center p-4">
      {/* Background Pattern */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-white/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-white/10 rounded-full blur-3xl"></div>
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-white/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 right-1/4 w-48 h-48 bg-white/5 rounded-full blur-3xl"></div>
      </div>

      {/* Register Container */}
      <div className="relative w-full max-w-lg my-8">
        {/* Back to Login */}
        <button
          onClick={() => window.history.back()}
          className="flex items-center space-x-2 text-white/80 hover:text-white transition-colors mb-8 group"
        >
          <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          <span>Quay lại đăng nhập</span>
        </button>

        {/* Register Card */}
        <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-8 shadow-2xl">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center space-x-3 mb-6">
              <div className="p-3 bg-white/20 backdrop-blur-md rounded-2xl">
                <Rocket className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-3xl font-bold text-white">DVTManagement</h1>
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Tạo tài khoản mới</h2>
            <p className="text-white/70">Bắt đầu quản lý dự án hiệu quả hơn ngay hôm nay</p>
          </div>

          {/* Social Register */}
          <div className="space-y-3 mb-6">
            <button
              onClick={() => handleSocialRegister('google')}
              className="w-full flex items-center justify-center space-x-3 py-3 px-4 bg-white/20 hover:bg-white/30 backdrop-blur-md border border-white/30 rounded-xl text-white transition-all duration-300 hover:scale-[1.02]"
            >
              <Chrome className="w-5 h-5" />
              <span className="font-medium">Đăng ký với Google</span>
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

          {/* Register Form */}
          <div className="space-y-6">
            {/* Name Fields */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-white/80 text-sm font-medium mb-2">
                  Tên
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white/60" />
                  <input
                    type="text"
                    name="firstName"
                    required
                    value={formData.firstName}
                    onChange={handleInputChange}
                    className={`w-full pl-12 pr-4 py-3 bg-white/20 backdrop-blur-md border ${errors.firstName ? 'border-red-400' : 'border-white/30'
                      } rounded-xl text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-transparent transition-all duration-300`}
                    placeholder="Tên"
                  />
                </div>
                {errors.firstName && (
                  <p className="mt-1 text-red-300 text-xs">{errors.firstName}</p>
                )}
              </div>

              <div>
                <label className="block text-white/80 text-sm font-medium mb-2">
                  Họ
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white/60" />
                  <input
                    type="text"
                    name="lastName"
                    required
                    value={formData.lastName}
                    onChange={handleInputChange}
                    className={`w-full pl-12 pr-4 py-3 bg-white/20 backdrop-blur-md border ${errors.lastName ? 'border-red-400' : 'border-white/30'
                      } rounded-xl text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-transparent transition-all duration-300`}
                    placeholder="Họ"
                  />
                </div>
                {errors.lastName && (
                  <p className="mt-1 text-red-300 text-xs">{errors.lastName}</p>
                )}
              </div>
            </div>

            {/* Email Field */}
            <div>
              <label className="block text-white/80 text-sm font-medium mb-2">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white/60" />
                <input
                  type="email"
                  name="email"
                  required
                  value={formData.email}
                  onChange={handleInputChange}
                  className={`w-full pl-12 pr-4 py-3 bg-white/20 backdrop-blur-md border ${errors.email ? 'border-red-400' : 'border-white/30'
                    } rounded-xl text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-transparent transition-all duration-300`}
                  placeholder="Nhập email của bạn"
                />
              </div>
              {errors.email && (
                <p className="mt-2 text-red-300 text-sm">{errors.email}</p>
              )}
            </div>

            {/* Company Field */}
            <div>
              <label className="block text-white/80 text-sm font-medium mb-2">
                Công ty <span className="text-white/50">(tùy chọn)</span>
              </label>
              <div className="relative">
                <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white/60" />
                <input
                  type="text"
                  name="company"
                  value={formData.company}
                  onChange={handleInputChange}
                  className="w-full pl-12 pr-4 py-3 bg-white/20 backdrop-blur-md border border-white/30 rounded-xl text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-transparent transition-all duration-300"
                  placeholder="Tên công ty"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-white/80 text-sm font-medium mb-2">
                Mật khẩu
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white/60" />
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  required
                  value={formData.password}
                  onChange={handleInputChange}
                  className={`w-full pl-12 pr-12 py-3 bg-white/20 backdrop-blur-md border ${errors.password ? 'border-red-400' : 'border-white/30'
                    } rounded-xl text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-transparent transition-all duration-300`}
                  placeholder="Tạo mật khẩu"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white/60 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>

              {/* Password Strength */}
              {formData.password && (
                <div className="mt-3">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-white/70 text-xs">Độ mạnh mật khẩu</span>
                    <span className={`text-xs font-medium ${passwordStrength < 25 ? 'text-red-300' :
                      passwordStrength < 50 ? 'text-orange-300' :
                        passwordStrength < 75 ? 'text-yellow-300' : 'text-green-300'
                      }`}>
                      {getPasswordStrengthText(passwordStrength)}
                    </span>
                  </div>
                  <div className="w-full bg-white/20 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all duration-300 ${getPasswordStrengthColor(passwordStrength)}`}
                      style={{ width: `${passwordStrength}%` }}
                    ></div>
                  </div>
                </div>
              )}

              {errors.password && (
                <p className="mt-2 text-red-300 text-sm">{errors.password}</p>
              )}
            </div>

            {/* Confirm Password Field */}
            <div>
              <label className="block text-white/80 text-sm font-medium mb-2">
                Xác nhận mật khẩu
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white/60" />
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  name="confirmPassword"
                  required
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  className={`w-full pl-12 pr-12 py-3 bg-white/20 backdrop-blur-md border ${errors.confirmPassword ? 'border-red-400' :
                    formData.confirmPassword && formData.password === formData.confirmPassword ? 'border-green-400' : 'border-white/30'
                    } rounded-xl text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-transparent transition-all duration-300`}
                  placeholder="Nhập lại mật khẩu"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-10 top-1/2 transform -translate-y-1/2 text-white/60 hover:text-white transition-colors"
                >
                  {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
                {formData.confirmPassword && formData.password === formData.confirmPassword && (
                  <Check className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-green-400" />
                )}
                {formData.confirmPassword && formData.password !== formData.confirmPassword && (
                  <X className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-red-400" />
                )}
              </div>
              {errors.confirmPassword && (
                <p className="mt-2 text-red-300 text-sm">{errors.confirmPassword}</p>
              )}
            </div>

            {/* Terms Agreement */}
            <div className="space-y-4">
              <label className="flex items-start space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  name="agreeTerms"
                  required
                  checked={formData.agreeTerms}
                  onChange={handleInputChange}
                  className={`mt-1 w-4 h-4 text-green-500 bg-white/20 border-white/30 rounded focus:ring-green-500 focus:ring-2 ${errors.agreeTerms ? 'border-red-400' : ''
                    }`}
                />
                <span className="text-white/80 text-sm leading-relaxed">
                  Tôi đồng ý với{' '}
                  <button className="text-white hover:text-green-300 underline transition-colors">
                    Điều khoản sử dụng
                  </button>{' '}
                  và{' '}
                  <button className="text-white hover:text-green-300 underline transition-colors">
                    Chính sách bảo mật
                  </button>
                </span>
              </label>
              {errors.agreeTerms && (
                <p className="text-red-300 text-sm ml-7">{errors.agreeTerms}</p>
              )}

              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  name="subscribeNewsletter"
                  checked={formData.subscribeNewsletter}
                  onChange={handleInputChange}
                  className="w-4 h-4 text-green-500 bg-white/20 border-white/30 rounded focus:ring-green-500 focus:ring-2"
                />
                <span className="text-white/80 text-sm">
                  Nhận thông tin sản phẩm và khuyến mãi qua email
                </span>
              </label>
            </div>

            {/* Submit Button */}
            <button
              onClick={handleSubmit}
              disabled={isLoading}
              className="w-full py-4 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center space-x-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Đang tạo tài khoản...</span>
                </>
              ) : (
                <>
                  <Rocket className="w-5 h-5" />
                  <span>Tạo tài khoản</span>
                </>
              )}
            </button>
          </div>

          {/* Login Link */}
          <div className="text-center mt-8 pt-6 border-t border-white/20">
            <p className="text-white/70">
              Đã có tài khoản?{' '}
              <button className="text-white hover:text-green-300 font-semibold transition-colors">
                Đăng nhập ngay
              </button>
            </p>
          </div>
        </div>

        {/* Trial Info */}
        <div className="text-center mt-8 p-6 bg-white/5 backdrop-blur-md rounded-2xl border border-white/10">
          <h3 className="text-white font-semibold mb-2">🎉 Dùng thử miễn phí 30 ngày</h3>
          <p className="text-white/70 text-sm">
            Không cần thẻ tín dụng • Hủy bất cứ lúc nào • Đầy đủ tính năng
          </p>
        </div>
      </div>

      {/* Floating Elements */}
      <div className="fixed top-16 left-8 w-2 h-2 bg-white/30 rounded-full animate-pulse"></div>
      <div className="fixed top-32 right-16 w-3 h-3 bg-white/20 rounded-full animate-bounce" style={{ animationDelay: '0.5s' }}></div>
      <div className="fixed bottom-40 left-12 w-2 h-2 bg-white/40 rounded-full animate-pulse" style={{ animationDelay: '1s' }}></div>
      <div className="fixed bottom-24 right-8 w-1 h-1 bg-white/50 rounded-full animate-bounce" style={{ animationDelay: '1.5s' }}></div>
      <div className="fixed top-1/2 left-4 w-1 h-1 bg-white/40 rounded-full animate-pulse" style={{ animationDelay: '2s' }}></div>
    </div>
  );
};

export default RegisterPage;