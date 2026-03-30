// apps/web\app\components\Header.tsx
"use client"; // Đánh dấu đây là Client Component để dùng được Hook (useState, useEffect)

import React, { useState, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react'; // NextAuth: Lấy data phiên đăng nhập và hàm đăng xuất
import { useRouter } from "next/navigation"; // Next.js: Điều hướng trang
import { Menu, X, Rocket } from 'lucide-react'; // Icon đẹp từ thư viện lucide
import NotificationBell from "@/app/components/NotificationBell";

const Header = () => {
    const router = useRouter();
    // status: giúp biết đang 'loading', 'authenticated' (đã đăng nhập) hoặc 'unauthenticated'
    const { data: session, status } = useSession(); 
    
    // State quản lý trạng thái cuộn chuột để đổi màu Header
    const [isScrolled, setIsScrolled] = useState(false);
    // State đóng/mở menu trên điện thoại
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    // Hiệu ứng theo dõi cuộn chuột
    useEffect(() => {
        const handleScroll = () => {
            // Nếu cuộn quá 20px thì set true để đổi style Header
            setIsScrolled(window.scrollY > 20);
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll); // Cleanup để tránh rò rỉ bộ nhớ
    }, []);

    // Logic hiển thị tên: Ưu tiên Name -> lấy phần trước @ của Email -> undefined
    const displayName =
        session?.user?.name ||
        session?.user?.email?.split('@')[0] ||
        undefined;

    return (
        // Header thay đổi class dựa trên biến isScrolled (Transparent -> Trắng/Blur)
        <header className={`fixed top-0 w-full z-50 transition-all duration-300 ${isScrolled
            ? 'bg-white/95 backdrop-blur-md shadow-lg text-gray-900'
            : 'bg-transparent text-white'
            }`}>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center py-4">
                    
                    {/* --- Khối Logo --- */}
                    <div className="flex items-center space-x-2 cursor-pointer" onClick={() => router.push('/')}>
                        <Rocket className={`w-8 h-8 ${isScrolled ? 'text-purple-600' : 'text-white'}`} />
                        <span className={`text-2xl font-bold ${isScrolled ? 'text-gray-900' : 'text-white'}`}>DVTManagement</span>
                    </div>

                    {/* --- Menu điều hướng Desktop (ẩn trên mobile) --- */}
                    <nav className="hidden md:flex items-center space-x-8">
                        <button
                            onClick={() => router.push('/#features')}
                            className={`${isScrolled ? 'text-gray-700 hover:text-purple-600' : 'text-white hover:text-white/80'} transition-colors font-medium`}
                        >
                            Tính năng
                        </button>
                        <button
                            onClick={() => router.push('/pricing')}
                            className={`${isScrolled ? 'text-gray-700 hover:text-purple-600' : 'text-white hover:text-white/80'} transition-colors font-medium`}
                        >
                            Giá cả
                        </button>
                        {/* ... Các nút khác tương tự ... */}
                    </nav>

                    {/* --- Khối Xác thực & Thông báo --- */}
                    <div className="hidden md:flex items-center space-x-4">
                        {status === 'loading' ? (
                            // Trạng thái đang check xem user đã log hay chưa
                            <button className={`px-6 py-2 border rounded ${isScrolled ? 'border-gray-200 text-gray-500' : 'border-white/30 text-white'}`} disabled>Đang tải…</button>
                        ) : session ? (
                            // Nếu ĐÃ ĐĂNG NHẬP: Hiện lời chào và nút Đăng xuất
                            <div className={`flex items-center gap-3 font-bold ${isScrolled ? 'text-gray-900' : 'text-white'}`}>
                                <span className="text-sm">Xin Chào: <b>{displayName}</b></span>
                                <button
                                    onClick={() => signOut({ callbackUrl: '/' })} // Đăng xuất xong về trang chủ
                                    className={`cursor-pointer font-bold px-4 py-2 border rounded hover:bg-white hover:text-purple-600 transition-all duration-300 ${isScrolled ? 'border-purple-600 text-purple-600 hover:bg-purple-50' : 'border-white text-white'}`}
                                >
                                    Đăng Xuất
                                </button>
                            </div>
                        ) : (
                            // Nếu CHƯA ĐĂNG NHẬP: Hiện nút Đăng nhập
                            <button
                                onClick={() => router.push('/sign-in')}
                                className={`cursor-pointer px-6 py-2 border-2 rounded-full transition-all duration-300 ${isScrolled
                                    ? 'border-purple-600 text-purple-600 hover:bg-purple-600 hover:text-white'
                                    : 'border-white text-white hover:bg-white hover:text-purple-600'
                                    }`}
                            >
                                Đăng nhập
                            </button>
                        )}
                        <NotificationBell />
                    </div>

                    {/* --- Nút mở Menu trên Mobile --- */}
                    <button
                        className={`md:hidden p-2 ${isScrolled ? 'text-gray-900' : 'text-white'}`}
                        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                    >
                        {/* Toggle Icon giữa X (đóng) và Menu (mở) */}
                        {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                    </button>
                </div>

                {/* --- Nội dung Menu Mobile (Hiển thị khi isMobileMenuOpen = true) --- */}
                {isMobileMenuOpen && (
                    <div className={`md:hidden py-4 border-t ${isScrolled ? 'border-gray-100' : 'border-white/20'}`}>
                        <div className="flex flex-col space-y-4">
                            {/* ... Các link điều hướng cho mobile ... */}
                            <div className="flex flex-col space-y-2 pt-4">
                                <button className={`px-6 py-2 border-2 rounded-full transition-all duration-300 ${isScrolled ? 'border-purple-600 text-purple-600' : 'border-white text-white'}`}>
                                    Đăng nhập
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </header>
    );
};

export default Header;