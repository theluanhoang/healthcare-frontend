import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link } from "react-router-dom";

// Tạo schema với Zod
const contactSchema = z.object({
  name: z.string().min(1, "Tên không được để trống"),
  email: z.string().email("Email không hợp lệ").nonempty("Email không được để trống"),
  message: z.string().min(10, "Tin nhắn phải có ít nhất 10 ký tự").nonempty("Tin nhắn không được để trống"),
});

function Contact() {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      name: "",
      email: "",
      message: "",
    },
  });

  const onSubmit = (data) => {
    console.log("Contact form submitted:", data);
    // TODO: Gửi dữ liệu đến backend hoặc hiển thị thông báo thành công
    reset();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-blue-50">
      {/* Hero Section with Parallax Background */}
      <section
        className="relative min-h-[70vh] flex items-center justify-center bg-cover bg-center bg-fixed bg-no-repeat"
        style={{
          backgroundImage: `linear-gradient(to bottom, rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.5)), url('https://images.unsplash.com/photo-1532938911079-1b06ac7ceec7')`,
        }}
      >
        <div className="container mx-auto px-6 text-center">
          <h1 className="text-5xl md:text-6xl font-extrabold text-white mb-6 animate-fade-in">
            Liên hệ với HealthCare
          </h1>
          <p className="text-xl md:text-2xl text-gray-100 max-w-3xl mx-auto mb-8 animate-fade-in">
            Chúng tôi luôn sẵn sàng hỗ trợ bạn. Hãy gửi câu hỏi hoặc yêu cầu để khám phá nền tảng quản lý hồ sơ y tế tiên tiến của chúng tôi.
          </p>
        </div>
      </section>

      {/* Contact Form Section */}
      <section className="py-20">
        <div className="container mx-auto px-6">
          <div className="max-w-lg mx-auto bg-white rounded-xl shadow-2xl p-8 transform transition-all duration-300 hover:shadow-3xl">
            <h2 className="text-3xl font-bold text-center text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-blue-500 mb-6">
              Gửi tin nhắn
            </h2>
            {Object.keys(errors).length > 0 && (
              <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-lg flex items-center space-x-2 animate-slide-down">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Vui lòng kiểm tra lại thông tin.</span>
              </div>
            )}
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                  Họ tên
                </label>
                <input
                  type="text"
                  id="name"
                  {...register("name")}
                  placeholder="Nhập họ tên"
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 hover:shadow-sm"
                />
                {errors.name && (
                  <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  {...register("email")}
                  placeholder="Nhập email"
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 hover:shadow-sm"
                />
                {errors.email && (
                  <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1">
                  Tin nhắn
                </label>
                <textarea
                  id="message"
                  {...register("message")}
                  placeholder="Nhập tin nhắn của bạn"
                  rows="5"
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 hover:shadow-sm"
                ></textarea>
                {errors.message && (
                  <p className="text-red-500 text-sm mt-1">{errors.message.message}</p>
                )}
              </div>

              <button
                type="submit"
                className="w-full py-3 px-4 text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 to-blue-500 rounded-lg hover:from-indigo-700 hover:to-blue-600 shadow-md focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-all duration-300 transform hover:scale-105"
              >
                Gửi tin nhắn
              </button>
            </form>
          </div>
        </div>
      </section>

      {/* Contact Info Section */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-6">
          <h2 className="text-3xl font-bold text-gray-800 text-center mb-12">
            Thông tin liên hệ
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-6 bg-gray-50 rounded-lg shadow-lg hover:shadow-xl transform transition-all duration-300 hover:-translate-y-2">
              <svg
                className="w-12 h-12 text-indigo-600 mb-4 mx-auto"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">Email</h3>
              <p className="text-gray-600">support@healthcare.com</p>
            </div>
            <div className="p-6 bg-gray-50 rounded-lg shadow-lg hover:shadow-xl transform transition-all duration-300 hover:-translate-y-2">
              <svg
                className="w-12 h-12 text-indigo-600 mb-4 mx-auto"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                />
              </svg>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">Điện thoại</h3>
              <p className="text-gray-600">+84 123 456 789</p>
            </div>
            <div className="p-6 bg-gray-50 rounded-lg shadow-lg hover:shadow-xl transform transition-all duration-300 hover:-translate-y-2">
              <svg
                className="w-12 h-12 text-indigo-600 mb-4 mx-auto"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">Địa chỉ</h3>
              <p className="text-gray-600">123 Đường Sức Khỏe, TP. Hồ Chí Minh, Việt Nam</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-gradient-to-r from-indigo-600 to-blue-500 text-white">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold mb-6">Sẵn sàng tham gia?</h2>
          <p className="text-lg mb-8 max-w-xl mx-auto">
            Đăng ký ngay hôm nay để trải nghiệm nền tảng quản lý hồ sơ y tế an toàn và hiệu quả.
          </p>
          <Link
            to="/register"
            className="inline-block px-8 py-3 text-sm font-semibold text-indigo-600 bg-white rounded-lg hover:bg-gray-100 shadow-md transition-all duration-300 transform hover:scale-105"
          >
            Đăng ký miễn phí
          </Link>
        </div>
      </section>
    </div>
  );
}

export default Contact;