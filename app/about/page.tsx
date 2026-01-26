"use client";
import React from 'react';
import Header from '@/app/components/Header';
import Footer from '@/app/components/Footer';
import { Target, Zap, Heart } from 'lucide-react';

const AboutPage = () => {
    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            <Header />
            <main className="flex-grow pt-32 pb-20">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
                            Về DVTManagement
                        </h1>
                        <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                            Chúng tôi cam kết mang đến giải pháp quản lý tối ưu nhất cho doanh nghiệp công nghệ Việt Nam
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20">
                        <div className="bg-white p-8 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2">
                            <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mb-6">
                                <Target className="w-8 h-8 text-blue-600" />
                            </div>
                            <h3 className="text-2xl font-bold text-gray-900 mb-4">Sứ mệnh</h3>
                            <p className="text-gray-600 leading-relaxed">
                                Đơn giản hóa quy trình quản lý dự án phức tạp, giúp các đội ngũ tập trung vào việc tạo ra những sản phẩm công nghệ đột phá.
                            </p>
                        </div>

                        <div className="bg-white p-8 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2">
                            <div className="w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center mb-6">
                                <Zap className="w-8 h-8 text-purple-600" />
                            </div>
                            <h3 className="text-2xl font-bold text-gray-900 mb-4">Tầm nhìn</h3>
                            <p className="text-gray-600 leading-relaxed">
                                Trở thành nền tảng quản lý dự án số 1 tại Đông Nam Á, đồng hành cùng sự phát triển của cộng đồng doanh nghiệp số.
                            </p>
                        </div>

                        <div className="bg-white p-8 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2">
                            <div className="w-16 h-16 bg-pink-100 rounded-2xl flex items-center justify-center mb-6">
                                <Heart className="w-8 h-8 text-pink-600" />
                            </div>
                            <h3 className="text-2xl font-bold text-gray-900 mb-4">Giá trị cốt lõi</h3>
                            <p className="text-gray-600 leading-relaxed">
                                Đặt trải nghiệm người dùng làm trọng tâm, không ngừng đổi mới sáng tạo và cam kết chất lượng dịch vụ 24/7.
                            </p>
                        </div>
                    </div>

                    {/* Team Stats */}
                    <div className="bg-white rounded-3xl p-8 md:p-12 shadow-xl border border-gray-100">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                            <div className="text-center">
                                <div className="text-4xl font-bold text-blue-600 mb-2">5+</div>
                                <div className="text-gray-500 font-medium">Năm kinh nghiệm</div>
                            </div>
                            <div className="text-center">
                                <div className="text-4xl font-bold text-purple-600 mb-2">500+</div>
                                <div className="text-gray-500 font-medium">Đối tác chiến lược</div>
                            </div>
                            <div className="text-center">
                                <div className="text-4xl font-bold text-pink-600 mb-2">1M+</div>
                                <div className="text-gray-500 font-medium">Task hoàn thành</div>
                            </div>
                            <div className="text-center">
                                <div className="text-4xl font-bold text-orange-600 mb-2">10+</div>
                                <div className="text-gray-500 font-medium">Quốc gia sử dụng</div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
            <Footer />
        </div>
    );
};

export default AboutPage;
