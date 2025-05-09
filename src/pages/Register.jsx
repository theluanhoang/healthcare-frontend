import { zodResolver } from "@hookform/resolvers/zod";
import { ethers } from "ethers";
import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

const schema = z.object({
  fullName: z.string().min(1, "Họ tên không được bỏ trống"),
  email: z.string().email("Email không hợp lệ"),
  password: z.string().min(6, "Mật khẩu phải có ít nhất 6 ký tự"),
  role: z.enum(["patient", "doctor", "admin"]),
});

function Register() {
  const [walletAddress, setWalletAddress] = useState("");
  const [showAlert, setShowAlert] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      fullName: "",
      email: "",
      password: "",
      role: "patient",
    },
  });

  const connectWallet = async () => {
    if (typeof window.ethereum === "undefined") {
      alert("Vui lòng cài đặt MetaMask để tiếp tục.");
      return;
    }

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await provider.send("eth_requestAccounts", []);
      const signer = await provider.getSigner();
      const address = await signer.getAddress();
      setWalletAddress(address);
    } catch (err) {
      console.error("Lỗi kết nối ví:", err);
    }
  };

  const onSubmit = async (data) => {
    if (!walletAddress) {
      alert("Vui lòng kết nối ví MetaMask trước khi đăng ký.");
      return;
    }

    setIsLoading(true);

    try {
      const newUser = {
        ...data,
        wallet: walletAddress,
      };

      console.log("Thông tin đăng ký:", newUser);
      setShowAlert(true);
    } catch (err) {
      console.error("Lỗi đăng ký:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-blue-50">
      <div className="w-full max-w-md p-8 bg-white rounded-xl shadow-2xl">
        <h2 className="text-center text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-blue-500 mb-6">
          Đăng ký
        </h2>

        {showAlert && (
          <div className="mb-6 p-4 bg-green-50 text-green-700 rounded-lg flex items-center space-x-2 animate-slide-down">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
            </svg>
            <span>Đăng ký thành công!</span>
          </div>
        )}

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
            <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-1">
              Họ tên
            </label>
            <input
              type="text"
              id="fullName"
              {...register("fullName")}
              placeholder="Nhập họ tên"
              className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
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
              {...register("password")}
              placeholder="Nhập mật khẩu"
              className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
            />
            {errors.password && (
              <p className="text-red-500 text-sm mt-1">{errors.password.message}</p>
            )}
          </div>

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
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Ví MetaMask
            </label>
            <div className="flex flex-col sm:flex-row gap-3 items-center">
              <button
                type="button"
                onClick={connectWallet}
                className="w-full sm:w-auto px-5 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-yellow-500 to-yellow-600 rounded-lg hover:from-yellow-600 hover:to-yellow-700 shadow-md transition-all duration-300 disabled:opacity-50"
                disabled={walletAddress}
              >
                {walletAddress ? "Đã kết nối" : "Kết nối ví"}
              </button>
              {walletAddress && (
                <span className="text-sm font-mono text-gray-700 bg-gray-100 px-3 py-1 rounded-full">
                  {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
                </span>
              )}
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 px-4 text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 to-blue-500 rounded-lg hover:from-indigo-700 hover:to-blue-600 shadow-md focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-all duration-300 disabled:opacity-50"
          >
            {isLoading ? "Đang đăng ký..." : "Đăng ký"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default Register;