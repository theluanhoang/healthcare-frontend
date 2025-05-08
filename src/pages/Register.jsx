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

  // Gửi form đăng ký
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

      // TODO: gửi đến backend hoặc contract blockchain
      setShowAlert(true);
    } catch (err) {
      console.error("Lỗi đăng ký:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-[500px] max-w-md p-8 bg-white shadow-md rounded-lg">
      <h2 className="text-center text-2xl font-semibold mb-6">Đăng ký</h2>

      {showAlert && (
        <div className="mb-4 p-4 bg-green-100 text-green-700 rounded">
          Đăng ký thành công!
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <div className="mb-4 text-left">
          <label className="block text-sm font-medium text-gray-700">
            Họ tên
          </label>
          <input
            type="text"
            {...register("fullName")}
            placeholder="Nhập họ tên"
            className="w-full p-3 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
          />
          {errors.fullName && (
            <p className="text-red-500 text-sm mt-1">{errors.fullName.message}</p>
          )}
        </div>

        <div className="mb-4 text-left">
          <label className="block text-sm font-medium text-gray-700">Email</label>
          <input
            type="email"
            {...register("email")}
            placeholder="Nhập email"
            className="w-full p-3 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
          />
          {errors.email && (
            <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>
          )}
        </div>

        <div className="mb-4 text-left">
          <label className="block text-sm font-medium text-gray-700">Mật khẩu</label>
          <input
            type="password"
            {...register("password")}
            placeholder="Nhập mật khẩu"
            className="w-full p-3 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
          />
          {errors.password && (
            <p className="text-red-500 text-sm mt-1">{errors.password.message}</p>
          )}
        </div>

        <div className="mb-4 text-left">
          <label className="block text-sm font-medium text-gray-700">Vai trò</label>
          <select
            {...register("role")}
            className="w-full p-3 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="patient">Bệnh nhân</option>
            <option value="doctor">Bác sĩ</option>
            <option value="admin">Quản trị viên</option>
          </select>
        </div>

        <div className="mb-4 text-left">
          <label className="block text-sm font-medium text-gray-700">Ví MetaMask</label>
          <div className="flex gap-2 items-center">
            <button
              type="button"
              onClick={connectWallet}
              className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600"
            >
              {walletAddress ? "Đã kết nối" : "Kết nối ví"}
            </button>
            {walletAddress && (
              <span className="text-sm text-green-600 break-all">
                {walletAddress}
              </span>
            )}
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-3 bg-indigo-500 text-white rounded-md hover:bg-indigo-600 focus:outline-none"
        >
          {isLoading ? "Đang đăng ký..." : "Đăng ký"}
        </button>
      </form>
    </div>
  );
}

export default Register;
