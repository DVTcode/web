"use client";
import React, { useState, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from "next/navigation";
import { Menu, X, Rocket } from 'lucide-react';
import NotificationBell from "@/app/components/NotificationBell";

const Header = () => {
    const router = useRouter();
    const { data: session, status } = useSession();
    const [isScrolled, setIsScrolled] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 20);
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const displayName =
        session?.user?.name ||
        session?.user?.email?.split('@')[0] ||
        undefined;

    return (
        <header className={`fixed top-0 w-full z-50 transition-all duration-300 ${isScrolled
            ? 'bg-white/95 backdrop-blur-md shadow-lg text-gray-900'
            : 'bg-transparent text-white'
            }`}>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center py-4">
                    {/* Logo */}
                    <div className="flex items-center space-x-2 cursor-pointer" onClick={() => router.push('/')}>
                        <Rocket className={`w-8 h-8 ${isScrolled ? 'text-purple-600' : 'text-white'}`} />
                        <span className={`text-2xl font-bold ${isScrolled ? 'text-gray-900' : 'text-white'}`}>DVTManagement</span>
                    </div>

                    {/* Desktop Navigation */}
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
                        <button
                            onClick={() => router.push('/about')}
                            className={`${isScrolled ? 'text-gray-700 hover:text-purple-600' : 'text-white hover:text-white/80'} transition-colors font-medium`}
                        >
                            Giới thiệu
                        </button>
                        <button
                            onClick={() => router.push('/contact')}
                            className={`${isScrolled ? 'text-gray-700 hover:text-purple-600' : 'text-white hover:text-white/80'} transition-colors font-medium`}
                        >
                            Liên hệ
                        </button>
                    </nav>

                    {/* Auth Buttons */}
                    <div className="hidden md:flex items-center space-x-4">
                        {status === 'loading' ? (
                            <button className={`px-6 py-2 border rounded ${isScrolled ? 'border-gray-200 text-gray-500' : 'border-white/30 text-white'}`} disabled>Đang tải…</button>
                        ) : session ? (
                            <div className={`flex items-center gap-3 font-bold ${isScrolled ? 'text-gray-900' : 'text-white'}`}>
                                <span className="text-sm">Xin Chào: <b>{displayName}</b></span>
                                <button
                                    onClick={() => signOut({ callbackUrl: '/' })}
                                    className={`cursor-pointer font-bold px-4 py-2 border rounded hover:bg-white hover:text-purple-600 transition-all duration-300 ${isScrolled ? 'border-purple-600 text-purple-600 hover:bg-purple-50' : 'border-white text-white'}`}
                                >
                                    Đăng Xuất
                                </button>
                            </div>
                        ) : (
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

                    {/* Mobile Menu Button */}
                    <button
                        className={`md:hidden p-2 ${isScrolled ? 'text-gray-900' : 'text-white'}`}
                        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                    >
                        {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                    </button>
                </div>

                {/* Mobile Menu */}
                {isMobileMenuOpen && (
                    <div className={`md:hidden py-4 border-t ${isScrolled ? 'border-gray-100' : 'border-white/20'}`}>
                        <div className="flex flex-col space-y-4">
                            <button
                                onClick={() => router.push('/#features')}
                                className={`cursor-pointer transition-colors text-left ${isScrolled ? 'text-gray-700' : 'text-white'}`}
                            >
                                Tính năng
                            </button>
                            <button
                                onClick={() => router.push('/pricing')}
                                className={`cursor-pointer transition-colors text-left ${isScrolled ? 'text-gray-700' : 'text-white'}`}
                            >
                                Giá cả
                            </button>
                            <button
                                onClick={() => router.push('/about')}
                                className={`cursor-pointer transition-colors text-left ${isScrolled ? 'text-gray-700' : 'text-white'}`}
                            >
                                Giới thiệu
                            </button>
                            <button
                                onClick={() => router.push('/contact')}
                                className={`cursor-pointer transition-colors text-left ${isScrolled ? 'text-gray-700' : 'text-white'}`}
                            >
                                Liên hệ
                            </button>
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
