import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "react-toastify";
import { useSmartContract } from "../hooks";
import useIpfs from "../hooks/useIPFS";
import { registerSchema } from "../types";
function Register() {
  const [isLoading, setIsLoading] = useState(false);
  const { uploadFile } = useIpfs();
  const { connectWallet, walletAddress, contract, signer } = useSmartContract();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      fullName: "",
      email: "",
      role: "PATIENT",
      certificate: undefined,
    },
  });

  const selectedRole = watch("role");

  const onSubmit = async (data) => {
    if (!walletAddress) {
      toast.error("Vui lòng kết nối ví MetaMask trước khi đăng ký.");
      return;
    }

    setIsLoading(true);

    try {
      await signer.signMessage(
        `Register to Healthcare System at ${Date.now()}`
      );

      let ipfsHashNew = "";
      if (data.certificate && selectedRole === "DOCTOR") {
        const file = data.certificate[0];
        if (!file) {
          throw new Error("Cần chọn một tệp chứng chỉ.");
        }

        ipfsHashNew = await uploadFile(file);
        if (!ipfsHashNew) {
          throw new Error("Không thể lấy CID từ IPFS.");
        }
      }

      const roleEnum =
        data.role === "PATIENT" ? 1 : data.role === "DOCTOR" ? 2 : null;
      if (roleEnum === null) {
        throw new Error("Vai trò không hợp lệ: " + data.role);
      }      
      const tx = await contract.register(data.fullName, data.email, roleEnum, ipfsHashNew, {
        gasLimit: 500000,
      });
      await tx.wait();
      toast.success(
        `Đăng ký thành công! ${
          data.role === "DOCTOR" ? "Vui lòng chờ xác minh." : ""
        }`
      );
    } catch (err) {
      toast.error("Lỗi đăng ký:", err.message);
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

        {Object.keys(errors).length > 0 && (
          <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-lg flex items-center space-x-2 animate-slide-down">
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span>Vui lòng kiểm tra lại thông tin.</span>
          </div>
        )}

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-6"
          noValidate
        >
          <div>
            <label
              htmlFor="fullName"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
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
              <p className="text-red-500 text-sm mt-1">
                {errors.fullName.message}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
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
              <p className="text-red-500 text-sm mt-1">
                {errors.email.message}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="role"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Vai trò
            </label>
            <select
              id="role"
              {...register("role")}
              className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
            >
              <option value="PATIENT">Bệnh nhân</option>
              <option value="DOCTOR">Bác sĩ</option>
            </select>
          </div>

          {selectedRole === "DOCTOR" && (
            <div>
              <label
                htmlFor="certificate"
                className="block text-sm font-medium text-gray-700"
              >
                Chứng chỉ (PDF, JPEG, PNG)
              </label>
              <input
                id="certificate"
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                {...register("certificate")}
                className="mt-1 w-full p-2 border border-gray-300 rounded-md"
              />
            </div>
          )}

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
