import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import { useSmartContract } from "../hooks";

function DoctorVerify() {
  const { pendingDoctorRegistrations, fetchDoctors, voteForDoctor, contract, walletAddress } = useSmartContract();
  const [isVerifiedDoctor, setIsVerifiedDoctor] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Khởi tạo và kiểm tra trạng thái bác sĩ
  const init = useCallback(async () => {
    try {
      setIsLoading(true);
      console.log("Running init...");
      await fetchDoctors();
      console.log("Pending doctors:", pendingDoctorRegistrations);
      
      if (contract && walletAddress) {
        const user = await contract.getUser(walletAddress);
        setIsVerifiedDoctor(user[1] && user[0].toString() === "2");
      }
    } catch (error) {
      console.error("Lỗi khi lấy dữ liệu:", error);
      toast.error("Không thể lấy dữ liệu từ blockchain.");
    } finally {
      setIsLoading(false);
    }
  }, [fetchDoctors, contract, walletAddress]);

  useEffect(() => {
    if (walletAddress && contract) {
      init();
    }
  }, [walletAddress, contract, init]);

  // Xử lý xác minh bác sĩ
  const verifyDoctor = useCallback(
    async (doctorAddress) => {
      try {
        await voteForDoctor(doctorAddress);
        toast.success("Đã bỏ phiếu xác minh thành công!");
      } catch (error) {
        console.error("Lỗi xác minh bác sĩ:", error);
        toast.error(error.message || "Không thể xác minh bác sĩ.");
      }
    },
    [voteForDoctor]
  );

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!isVerifiedDoctor) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-blue-50">
        <div className="text-center p-8 bg-white rounded-xl shadow-lg">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Không có quyền truy cập</h2>
          <p className="text-gray-600 mb-4">Chỉ bác sĩ đã được xác minh mới có thể truy cập trang này.</p>
          <Link
            to="/doctor/profile"
            className="text-indigo-600 hover:text-indigo-800 font-medium"
          >
            Quay lại trang hồ sơ
          </Link>
        </div>
      </div>
    );
  }

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
          <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-4">Xác minh bác sĩ</h1>
          <p className="text-lg md:text-xl text-gray-200">
            Xác minh các bác sĩ mới đăng ký để đảm bảo tính chuyên môn của hệ thống
          </p>
        </div>
      </section>

      <section className="py-16">
        <div className="container mx-auto px-6">
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Sidebar Navigation */}
            <div className="lg:w-1/4 bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-6">Điều hướng</h2>
              <ul className="space-y-4">
                <li>
                  <Link
                    to="/doctor/profile"
                    className="block py-2 px-4 text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all duration-200"
                  >
                    Hồ sơ
                  </Link>
                </li>
                <li>
                  <Link
                    to="/doctor/schedule"
                    className="block py-2 px-4 text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all duration-200"
                  >
                    Lịch làm việc
                  </Link>
                </li>
                <li>
                  <Link
                    to="/doctor/patients"
                    className="block py-2 px-4 text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all duration-200"
                  >
                    Bệnh nhân
                  </Link>
                </li>
                <li>
                  <Link
                    to="/doctor/verify"
                    className="block py-2 px-4 text-indigo-600 font-semibold bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-all duration-200"
                  >
                    Xác minh bác sĩ
                  </Link>
                </li>
              </ul>
            </div>

            <div className="lg:w-3/4">
              <div className="bg-white rounded-xl shadow-lg p-8">
                <h2 className="text-2xl font-bold text-gray-800 mb-6">Danh sách bác sĩ chờ xác minh</h2>
                {pendingDoctorRegistrations.length === 0 ? (
                  <div className="text-center py-8">
                    <svg
                      className="mx-auto h-12 w-12 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <p className="mt-4 text-gray-600">Chưa có bác sĩ nào chờ xác minh.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {pendingDoctorRegistrations.map((doctor) => (
                      <div
                        key={doctor.address}
                        className="p-6 bg-gray-50 rounded-lg shadow-sm hover:shadow-md transition-all duration-200"
                      >
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                          <div>
                            <h3 className="text-lg font-semibold text-gray-800">{doctor.fullName}</h3>
                            <p className="text-gray-600 mt-1">
                              Địa chỉ: {doctor.address.slice(0, 6)}...{doctor.address.slice(-4)}
                            </p>
                            <p className="text-gray-600">
                              Số phiếu xác minh hiện tại: {doctor.voteCount}
                            </p>
                            <p className="text-gray-600">
                              Ngày đăng ký:{" "}
                              {doctor.timestamp && !isNaN(doctor.timestamp)
                                ? new Date(doctor.timestamp * 1000).toLocaleDateString("vi-VN")
                                : "Không xác định"}
                            </p>
                          </div>
                          <button
                            onClick={() => verifyDoctor(doctor.address)}
                            className="px-6 py-2 text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 to-blue-500 rounded-lg hover:from-indigo-700 hover:to-blue-600 shadow-md transition-all duration-300 transform hover:scale-105"
                          >
                            Xác minh
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default DoctorVerify; 