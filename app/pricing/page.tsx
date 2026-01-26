"use client";
import React from 'react';
import Header from '@/app/components/Header';
import Footer from '@/app/components/Footer';
import { Check, X } from 'lucide-react';

const PricingPage = () => {
    const plans = [
        {
            name: "Cơ Bản",
            price: "Miễn phí",
            description: "Dành cho cá nhân và nhóm nhỏ mới bắt đầu",
            features: [
                "Quản lý tối đa 3 dự án",
                "5 thành viên",
                "1GB lưu trữ",
                "Hỗ trợ cộng đồng",
                "Kanban Board cơ bản"
            ],
            notIncluded: [
                "Biểu đồ Gantt",
                "Báo cáo nâng cao",
                "Tích hợp Git",
                "Hỗ trợ 24/7"
            ],
            buttonText: "Bắt đầu miễn phí",
            popular: false
        },
        {
            name: "Chuyên Nghiệp",
            price: "199.000đ",
            period: "/tháng",
            description: "Giải pháp hoàn hảo cho các đội ngũ đang phát triển",
            features: [
                "Không giới hạn dự án",
                "20 thành viên",
                "10GB lưu trữ",
                "Biểu đồ Gantt & Timeline",
                "Báo cáo hiệu suất team",
                "Hỗ trợ qua Email"
            ],
            notIncluded: [
                "Tích hợp Enterprise",
                "SLA uptime 99.9%"
            ],
            buttonText: "Dùng thử 14 ngày",
            popular: true
        },
        {
            name: "Doanh Nghiệp",
            price: "Liên hệ",
            description: "Đầy đủ tính năng và bảo mật cho quy mô lớn",
            features: [
                "Không giới hạn thành viên",
                "Lưu trữ không giới hạn",
                "Tích hợp Git & DevOps",
                "Bảo mật nâng cao (SSO)",
                "Quản lý Portfolio",
                "Hỗ trợ 24/7 Priority"
            ],
            notIncluded: [],
            buttonText: "Liên hệ tư vấn",
            popular: false
        }
    ];

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            <Header />
            <main className="flex-grow pt-32 pb-20">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
                            Bảng giá linh hoạt
                        </h1>
                        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                            Chọn gói phù hợp nhất với nhu cầu phát triển của đội ngũ và doanh nghiệp bạn
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {plans.map((plan, index) => (
                            <div
                                key={index}
                                className={`relative bg-white rounded-2xl shadow-xl overflow-hidden border-2 transition-transform hover:-translate-y-2 duration-300 ${plan.popular ? 'border-purple-600 scale-105 z-10' : 'border-transparent'
                                    }`}
                            >
                                {plan.popular && (
                                    <div className="absolute top-0 right-0 bg-purple-600 text-white text-xs font-bold px-3 py-1 rounded-bl-lg">
                                        PHỔ BIẾN NHẤT
                                    </div>
                                )}
                                <div className="p-8">
                                    <h3 className="text-2xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                                    <div className="flex items-baseline mb-4">
                                        <span className="text-4xl font-bold text-purple-600">{plan.price}</span>
                                        {plan.period && <span className="text-gray-500 ml-1">{plan.period}</span>}
                                    </div>
                                    <p className="text-gray-500 mb-6 min-h-[48px]">{plan.description}</p>
                                    <button className={`w-full py-3 px-4 rounded-xl font-bold transition-all ${plan.popular
                                        ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:shadow-lg'
                                        : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                                        }`}>
                                        {plan.buttonText}
                                    </button>
                                </div>
                                <div className="p-8 bg-gray-50 border-t border-gray-100 h-full">
                                    <ul className="space-y-4">
                                        {plan.features.map((feature, i) => (
                                            <li key={i} className="flex items-start">
                                                <Check className="w-5 h-5 text-green-500 mr-2 flex-shrink-0" />
                                                <span className="text-gray-700">{feature}</span>
                                            </li>
                                        ))}
                                        {plan.notIncluded.map((feature, i) => (
                                            <li key={i} className="flex items-start opacity-50">
                                                <X className="w-5 h-5 text-gray-400 mr-2 flex-shrink-0" />
                                                <span className="text-gray-500">{feature}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </main>
            <Footer />
        </div>
    );
};

export default PricingPage;
