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
    <div className="w-[500px] max-w-md p-8 bg-white shadow-md rounded-lg">
      <h2 className="text-center text-2xl font-semibold mb-6">Đăng nhập</h2>

      {errors && (
        <div className="mb-4 p-4 bg-red-100 text-red-700 rounded">
          Đăng nhập không thành công! Vui lòng thử lại.
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="mb-4">
          <label htmlFor="role" className="block text-sm font-medium text-gray-700 text-left">
            Vai trò
          </label>
          <select
            id="role"
            {...register("role")}
            className="w-full p-3 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="patient">Bệnh nhân</option>
            <option value="doctor">Bác sĩ</option>
            <option value="admin">Quản trị viên</option>
          </select>
          {errors.role && (
            <p className="text-red-500 text-sm mt-2 text-left">{errors.role.message}</p>
          )}
        </div>

        <div className="mb-4">
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 text-left">
            Email
          </label>
          <input
            type="text"
            id="email"
            placeholder="Nhập email"
            {...register("email")}
            className="w-full p-3 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
          />
          {errors.email && (
            <p className="text-red-500 text-sm mt-2 text-left">{errors.email.message}</p>
          )}
        </div>

        <div className="mb-4">
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 text-left">
            Mật khẩu
          </label>
          <input
            type="password"
            id="password"
            placeholder="Nhập mật khẩu"
            {...register("password")}
            className="w-full p-3 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
          />
          {errors.password && (
            <p className="text-red-500 text-sm mt-2 text-left">{errors.password.message}</p>
          )}
        </div>

        <button
          type="submit"
          className="w-full py-3 bg-indigo-500 text-white rounded-md hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          Đăng nhập
        </button>
      </form>

      <div className="mt-4 text-center">
        <Link to="#" className="text-sm text-indigo-500 hover:text-indigo-600">
          Quên mật khẩu?
        </Link>
        <br />
        <Link to="/register" className="text-sm text-indigo-500 hover:text-indigo-600">
          Đăng ký tài khoản mới
        </Link>
      </div>
    </div>
  );
}

export default Login;
