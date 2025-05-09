import React from "react";
import { Link } from "react-router-dom";

function About() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section with Full-Screen Background Image */}
      <section
        className="relative min-h-screen flex items-center justify-center bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: `linear-gradient(to bottom, rgba(0, 0, 0, 0.4), rgba(0, 0, 0, 0.4)), url('https://images.unsplash.com/photo-1576091160550-2173dba999ef')`,
        }}
      >
        <div className="container mx-auto px-6 text-center">
          <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-6">
            Giới thiệu về HealthCare
          </h1>
          <p className="text-lg md:text-xl text-gray-200 max-w-3xl mx-auto mb-8">
            HealthCare là nền tảng quản lý hồ sơ y tế điện tử tiên tiến, sử dụng công nghệ blockchain để đảm bảo an toàn, minh bạch và quyền kiểm soát dữ liệu cho bệnh nhân và bác sĩ.
          </p>
          <Link
            to="/register"
            className="inline-block px-8 py-3 text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 to-blue-500 rounded-lg hover:from-indigo-700 hover:to-blue-600 shadow-md transition-all duration-300"
          >
            Tham gia ngay
          </Link>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-6">
          <h2 className="text-3xl font-bold text-gray-800 text-center mb-12">
            Tại sao chọn HealthCare?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-6 bg-gray-50 rounded-lg shadow-lg hover:shadow-xl transition-shadow duration-300">
              <img
                src="https://images.unsplash.com/photo-1622253692010-333f2da6031d"
                alt="Secure data"
                className="w-16 h-16 object-cover rounded-full mx-auto mb-4"
              />
              <h3 className="text-xl font-semibold text-gray-800 mb-2">An toàn dữ liệu</h3>
              <p className="text-gray-600">
                Sử dụng blockchain để mã hóa và lưu trữ hồ sơ y tế, đảm bảo dữ liệu của bạn luôn an toàn và không thể bị thay đổi.
              </p>
            </div>
            <div className="p-6 bg-gray-50 rounded-lg shadow-lg hover:shadow-xl transition-shadow duration-300">
              <img
                src="https://images.unsplash.com/photo-1550831107-1553da8c8464"
                alt="Patient-doctor connection"
                className="w-16 h-16 object-cover rounded-full mx-auto mb-4"
              />
              <h3 className="text-xl font-semibold text-gray-800 mb-2">Kết nối bệnh nhân & bác sĩ</h3>
              <p className="text-gray-600">
                Dễ dàng quản lý lịch hẹn, chia sẻ hồ sơ y tế và tương tác trực tiếp giữa bệnh nhân và bác sĩ.
              </p>
            </div>
            <div className="p-6 bg-gray-50 rounded-lg shadow-lg hover:shadow-xl transition-shadow duration-300">
              <img
                src="https://images.unsplash.com/photo-1638202993928-7267aad84c31"
                alt="Data control"
                className="w-16 h-16 object-cover rounded-full mx-auto mb-4"
              />
              <h3 className="text-xl font-semibold text-gray-800 mb-2">Quyền kiểm soát dữ liệu</h3>
              <p className="text-gray-600">
                Bệnh nhân có toàn quyền quyết định ai được truy cập và chia sẻ dữ liệu y tế của mình.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Mission Section */}
      <section className="py-16">
        <div className="container mx-auto px-6 text-center">
          <img
            src="https://images.unsplash.com/photo-1584982751601-97dcc096659c"
            alt="Our mission"
            className="w-full md:w-1/2 h-64 object-cover rounded-lg shadow-lg mx-auto mb-8"
          />
          <h2 className="text-3xl font-bold text-gray-800 mb-6">Sứ mệnh của chúng tôi</h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Chúng tôi cam kết xây dựng một hệ thống y tế số hóa hiện đại, nơi bệnh nhân và bác sĩ có thể tin tưởng vào sự an toàn, minh bạch và hiệu quả của việc quản lý hồ sơ y tế.
          </p>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-gradient-to-r from-indigo-600 to-blue-500 text-white">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold mb-6">Sẵn sàng tham gia?</h2>
          <p className="text-lg mb-8 max-w-xl mx-auto">
            Đăng ký ngay hôm nay để trải nghiệm cách HealthCare cách mạng hóa quản lý hồ sơ y tế.
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

export default About;