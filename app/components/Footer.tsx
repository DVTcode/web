import React from 'react';
import { Rocket } from 'lucide-react';

const Footer = () => {
    return (
        <footer className="bg-gray-900 text-white py-16">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                    <div>
                        <div className="flex items-center space-x-2 mb-6">
                            <Rocket className="w-8 h-8 text-blue-400" />
                            <span className="text-2xl font-bold">DVTManagement</span>
                        </div>
                        <p className="text-gray-400 leading-relaxed">
                            Nền tảng quản lý dự án CNTT hiện đại, giúp đội ngũ làm việc hiệu quả và đạt mục tiêu nhanh hơn.
                        </p>
                    </div>

                    <div>
                        <h3 className="text-lg font-bold text-blue-400 mb-4">Sản phẩm</h3>
                        <ul className="space-y-2">
                            <li><a href="#" className="text-gray-400 hover:text-blue-400 transition-colors">Quản lý dự án</a></li>
                            <li><a href="#" className="text-gray-400 hover:text-blue-400 transition-colors">Theo dõi thời gian</a></li>
                            <li><a href="#" className="text-gray-400 hover:text-blue-400 transition-colors">Báo cáo phân tích</a></li>
                            <li><a href="#" className="text-gray-400 hover:text-blue-400 transition-colors">API tích hợp</a></li>
                        </ul>
                    </div>

                    <div>
                        <h3 className="text-lg font-bold text-blue-400 mb-4">Hỗ trợ</h3>
                        <ul className="space-y-2">
                            <li><a href="#" className="text-gray-400 hover:text-blue-400 transition-colors">Tài liệu</a></li>
                            <li><a href="#" className="text-gray-400 hover:text-blue-400 transition-colors">Video hướng dẫn</a></li>
                            <li><a href="#" className="text-gray-400 hover:text-blue-400 transition-colors">Liên hệ hỗ trợ</a></li>
                            <li><a href="#" className="text-gray-400 hover:text-blue-400 transition-colors">Cộng đồng</a></li>
                        </ul>
                    </div>

                    <div>
                        <h3 className="text-lg font-bold text-blue-400 mb-4">Công ty</h3>
                        <ul className="space-y-2">
                            <li><a href="#" className="text-gray-400 hover:text-blue-400 transition-colors">Về chúng tôi</a></li>
                            <li><a href="#" className="text-gray-400 hover:text-blue-400 transition-colors">Tuyển dụng</a></li>
                            <li><a href="#" className="text-gray-400 hover:text-blue-400 transition-colors">Blog</a></li>
                            <li><a href="#" className="text-gray-400 hover:text-blue-400 transition-colors">Chính sách bảo mật</a></li>
                        </ul>
                    </div>
                </div>

                <div className="border-t border-gray-800 mt-12 pt-8 text-center">
                    <p className="text-gray-400">
                        &copy; 2025 DVTManagement. Tất cả quyền được bảo lưu.
                    </p>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
