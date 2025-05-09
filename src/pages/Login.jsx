import { zodResolver } from "@hookform/resolvers/zod";
import React from "react";
import { useForm } from "react-hook-form";
import { Link } from "react-router-dom";
import { z } from "zod";

// Tạo schema với Zod
const loginSchema = z.object({
  role: z.enum(["patient", "doctor", "admin"]),
  email: z
    .string()
    .email("Email không hợp lệ")
    .nonempty("Email không thể để trống"),
  password: z
    .string()
    .min(6, "Mật khẩu phải có ít nhất 6 ký tự")
    .nonempty("Mật khẩu không thể để trống"),
});

function Login() {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = (data) => {
    console.log("Login submitted with:", data);
  };

  return (
    <div className="w-full min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-blue-50">
      <div className="w-full max-w-md p-8 bg-white rounded-xl shadow-2xl">
        <h2 className="text-center text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-blue-500 mb-6">
          Đăng nhập
        </h2>

        {Object.keys(errors).length > 0 && (
          <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-lg flex items-center space-x-2 animate-slide-down">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Đăng nhập không thành công! Vui lòng thử lại.</span>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div>
            <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">
              Vai trò
            </label>
            <select
              id="role"
              {...register("role")}
              className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
            >
              <option value="patient">Bệnh nhân</option>
              <option value="doctor">Bác sĩ</option>
              <option value="admin">Quản trị viên</option>
            </select>
            {errors.role && (
              <p className="text-red-500 text-sm mt-1">{errors.role.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="text"
              id="email"
              placeholder="Nhập email"
              {...register("email")}
              className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
            />
            {errors.email && (
              <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Mật khẩu
            </label>
            <input
              type="password"
              id="password"
              placeholder="Nhập mật khẩu"
              {...register("password")}
              className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
            />
            {errors.password && (
              <p className="text-red-500 text-sm mt-1">{errors.password.message}</p>
            )}
          </div>

          <button
            type="submit"
            className="w-full py-3 px-4 text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 to-blue-500 rounded-lg hover:from-indigo-700 hover:to-blue-600 shadow-md focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-all duration-300"
          >
            Đăng nhập
          </button>
        </form>

        <div className="mt-6 text-center space-y-2">
          <Link
            to="#"
            className="text-sm text-indigo-500 hover:text-indigo-600 font-medium transition-colors duration-200"
          >
            Quên mật khẩu?
          </Link>
          <br />
          <Link
            to="/register"
            className="text-sm text-indigo-500 hover:text-indigo-600 font-medium transition-colors duration-200"
          >
            Đăng ký tài khoản mới
          </Link>
        </div>
      </div>
    </div>
  );
}

export default Login;