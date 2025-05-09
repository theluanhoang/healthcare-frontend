import React from "react";
import { Link } from "react-router-dom";

function Features() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <section
        className="relative min-h-[60vh] flex items-center justify-center bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: `linear-gradient(to bottom, rgba(0, 0, 0, 0.4), rgba(0, 0, 0, 0.4)), url('https://images.unsplash.com/photo-1600585154340-be6161a56a0c')`,
        }}
      >
        <div className="container mx-auto px-6 text-center">
          <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-6">
            Tính năng nổi bật
          </h1>
          <p className="text-lg md:text-xl text-gray-200 max-w-3xl mx-auto mb-8">
            Khám phá các tính năng tiên tiến của HealthCare, được thiết kế để nâng cao trải nghiệm quản lý hồ sơ y tế với công nghệ blockchain.
          </p>
          <Link
            to="/register"
            className="inline-block px-8 py-3 text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 to-blue-500 rounded-lg hover:from-indigo-700 hover:to-blue-600 shadow-md transition-all duration-300"
          >
            Đăng ký ngay
          </Link>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-6">
          <h2 className="text-3xl font-bold text-gray-800 text-center mb-12">
            Các tính năng chính
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="p-6 bg-gray-50 rounded-lg shadow-lg hover:shadow-xl transition-shadow duration-300">
              <img
                src="https://images.unsplash.com/photo-1622253692010-333f2da6031d"
                alt="Secure data storage"
                className="w-full h-48 object-cover rounded-lg mb-4"
              />
              <h3 className="text-xl font-semibold text-gray-800 mb-2">
                Lưu trữ dữ liệu an toàn
              </h3>
              <p className="text-gray-600">
                Hồ sơ y tế được mã hóa và lưu trữ trên blockchain, đảm bảo dữ liệu không thể bị thay đổi và luôn được bảo mật.
              </p>
            </div>
            <div className="p-6 bg-gray-50 rounded-lg shadow-lg hover:shadow-xl transition-shadow duration-300">
              <img
                src="https://images.unsplash.com/photo-1550831107-1553da8c8464"
                alt="Patient-doctor connectivity"
                className="w-full h-48 object-cover rounded-lg mb-4"
              />
              <h3 className="text-xl font-semibold text-gray-800 mb-2">
                Kết nối bệnh nhân & bác sĩ
              </h3>
              <p className="text-gray-600">
                Quản lý lịch hẹn dễ dàng, chia sẻ hồ sơ y tế an toàn và giao tiếp trực tiếp với bác sĩ thông qua nền tảng.
              </p>
            </div>
            <div className="p-6 bg-gray-50 rounded-lg shadow-lg hover:shadow-xl transition-shadow duration-300">
              <img
                src="https://images.unsplash.com/photo-1638202993928-7267aad84c31"
                alt="Data control"
                className="w-full h-48 object-cover rounded-lg mb-4"
              />
              <h3 className="text-xl font-semibold text-gray-800 mb-2">
                Quyền kiểm soát dữ liệu
              </h3>
              <p className="text-gray-600">
                Bệnh nhân có toàn quyền quyết định ai được truy cập hoặc chia sẻ dữ liệu y tế của mình, tăng cường quyền riêng tư.
              </p>
            </div>
            <div className="p-6 bg-gray-50 rounded-lg shadow-lg hover:shadow-xl transition-shadow duration-300">
              <img
                src="https://images.unsplash.com/photo-1585435557343-3b092031a831"
                alt="Appointment scheduling"
                className="w-full h-48 object-cover rounded-lg mb-4"
              />
              <h3 className="text-xl font-semibold text-gray-800 mb-2">
                Lịch hẹn thông minh
              </h3>
              <p className="text-gray-600">
                Đặt và quản lý lịch hẹn với bác sĩ một cách thuận tiện, nhận thông báo và theo dõi lịch sử khám bệnh.
              </p>
            </div>
            <div className="p-6 bg-gray-50 rounded-lg shadow-lg hover:shadow-xl transition-shadow duration-300">
              <img
                src="https://images.unsplash.com/photo-1614027164847-1b28cfe1df60"
                alt="Data sharing"
                className="w-full h-48 object-cover rounded-lg mb-4"
              />
              <h3 className="text-xl font-semibold text-gray-800 mb-2">
                Chia sẻ dữ liệu linh hoạt
              </h3>
              <p className="text-gray-600">
                Cho phép bệnh nhân chia sẻ hồ sơ y tế với bác sĩ hoặc cơ sở y tế khác một cách an toàn và kiểm soát.
              </p>
            </div>
            <div className="p-6 bg-gray-50 rounded-lg shadow-lg hover:shadow-xl transition-shadow duration-300">
              <img
                src="https://images.unsplash.com/photo-1551288049-b1f3c6fded6f"
                alt="Analytics for doctors"
                className="w-full h-48 object-cover rounded-lg mb-4"
              />
              <h3 className="text-xl font-semibold text-gray-800 mb-2">
                Phân tích dữ liệu cho bác sĩ
              </h3>
              <p className="text-gray-600">
                Cung cấp công cụ phân tích dữ liệu y tế giúp bác sĩ đưa ra chẩn đoán chính xác và kế hoạch điều trị hiệu quả.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-gradient-to-r from-indigo-600 to-blue-500 text-white">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold mb-6">Trải nghiệm HealthCare ngay hôm nay</h2>
          <p className="text-lg mb-8 max-w-xl mx-auto">
            Tham gia nền tảng của chúng tôi để quản lý hồ sơ y tế một cách an toàn và hiệu quả.
          </p>
          <Link
            to="/register"
            className="inline-block px-8 py-3 text-sm font-semibold text-indigo-600 bg-white rounded-lg hover:bg-gray-100 shadow-md transition-all duration-300"
          >
            Đăng ký miễn phí
          </Link>
        </div>
      </section>
    </div>
  );
}

export default Features;