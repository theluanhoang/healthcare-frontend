import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link } from "react-router-dom";
import { useAuthStore } from "../stores/useAuthStore";

// Tạo schema với Zod
const profileSchema = z.object({
  fullName: z.string().min(1, "Họ tên không được để trống"),
  email: z.string().email("Email không hợp lệ").nonempty("Email không được để trống"),
});

function PatientProfile() {
  const { walletAddress, role, setWallet } = useAuthStore();
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      fullName: "Nguyễn Văn A", // Giả lập dữ liệu, thay bằng API thực tế
      email: "nguyenvana@example.com", // Giả lập dữ liệu
    },
  });

  const onSubmit = (data) => {
    console.log("Profile updated:", data);
    // TODO: Gửi dữ liệu cập nhật đến backend hoặc blockchain
    reset(data); // Giữ lại dữ liệu sau khi submit
  };

  return (
    <div className="w-full min-h-screen bg-gradient-to-br from-indigo-50 to-blue-50">
      {/* Hero Section */}
      <section
        className="relative min-h-[40vh] flex items-center justify-center bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: `linear-gradient(to bottom, rgba(0, 0, 0, 0.4), rgba(0, 0, 0, 0.4)), url('https://images.unsplash.com/photo-1576091160399-112ba8d25d1d')`,
        }}
      >
        <div className="container mx-auto px-6 text-center">
          <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-4">
            Hồ sơ bệnh nhân
          </h1>
          <p className="text-lg md:text-xl text-gray-200">
            Quản lý thông tin cá nhân và hồ sơ y tế của bạn một cách an toàn.
          </p>
        </div>
      </section>

      {/* Profile Content */}
      <section className="py-16">
        <div className="container mx-auto px-6">
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Sidebar Navigation */}
            <div className="lg:w-1/4 bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-6">Điều hướng</h2>
              <ul className="space-y-4">
                <li>
                  <Link
                    to="/patientprofile"
                    className="block py-2 px-4 text-indigo-600 font-semibold bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-all duration-200"
                  >
                    Hồ sơ
                  </Link>
                </li>
                <li>
                  <Link
                    to="/patientAppointment"
                    className="block py-2 px-4 text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all duration-200"
                  >
                    Lịch hẹn
                  </Link>
                </li>
                <li>
                  <Link
                    to="/patientshare"
                    className="block py-2 px-4 text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all duration-200"
                  >
                    Chia sẻ dữ liệu
                  </Link>
                </li>
              </ul>
            </div>

            {/* Profile Form */}
            <div className="lg:w-3/4 bg-white rounded-xl shadow-lg p-8">
              <h2 className="text-2xl font-bold text-gray-800 mb-6">
                Thông tin cá nhân
              </h2>
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-700">Địa chỉ ví</h3>
                <p className="text-sm font-mono text-gray-600 bg-gray-100 px-3 py-2 rounded-full mt-2">
                  {walletAddress || "Chưa kết nối ví"}
                </p>
                <p className="text-sm text-gray-600 mt-2">Vai trò: {role || "Bệnh nhân"}</p>
              </div>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
                <div>
                  <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-1">
                    Họ tên
                  </label>
                  <input
                    type="text"
                    id="fullName"
                    {...register("fullName")}
                    placeholder="Nhập họ tên"
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 hover:shadow-sm"
                  />
                  {errors.fullName && (
                    <p className="text-red-500 text-sm mt-1">{errors.fullName.message}</p>
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

                <button
                  type="submit"
                  className="w-full py-3 px-4 text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 to-blue-500 rounded-lg hover:from-indigo-700 hover:to-blue-600 shadow-md focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-all duration-300 transform hover:scale-105"
                >
                  Cập nhật hồ sơ
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default PatientProfile;