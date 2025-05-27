import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useSmartContract } from "../hooks";
import { toast } from "react-toastify";

function DoctorProfile() {
  const { walletAddress, contract, getUser, getMedicalRecordsByDoctor, fetchAppointmentsByDoctor } = useSmartContract();
  const [profile, setProfile] = useState({
    fullName: "",
    email: "",
    isVerified: false,
    ipfsHash: "",
  });
  const [stats, setStats] = useState({
    totalPatients: 0,
    todayAppointments: 0,
    totalRecords: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  // Lấy thông tin thống kê
  const fetchStats = useCallback(async () => {
    if (!contract || !walletAddress) return;

    try {
      // Lấy tất cả hồ sơ y tế của bác sĩ
      const doctorRecords = await getMedicalRecordsByDoctor(walletAddress);
      
      // Lấy danh sách bệnh nhân duy nhất
      const uniquePatients = new Set(doctorRecords.map(record => record.patient));
      
      // Lấy các cuộc hẹn trong ngày
      const appointments = await fetchAppointmentsByDoctor();
      const today = new Date().setHours(0, 0, 0, 0);
      const todayAppointments = appointments.filter(appointment => {
        const appointmentDate = new Date(Number(appointment.timestamp) * 1000).setHours(0, 0, 0, 0);
        return appointmentDate === today;
      });

      setStats({
        totalPatients: uniquePatients.size,
        todayAppointments: todayAppointments.length,
        totalRecords: doctorRecords.length,
      });
    } catch (error) {
      console.error("Lỗi khi lấy thông tin thống kê:", error);
      toast.error("Không thể lấy thông tin thống kê");
    }
  }, [contract, walletAddress, getMedicalRecordsByDoctor, fetchAppointmentsByDoctor]);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!walletAddress || !contract) return;

      try {
        setIsLoading(true);
        const userData = await getUser(walletAddress);
        setProfile({
          fullName: userData.fullName,
          email: userData.email,
          isVerified: userData.isVerified,
          ipfsHash: userData.ipfsHash,
        });
        await fetchStats();
      } catch (error) {
        console.error("Lỗi lấy thông tin profile:", error);
        toast.error("Không thể lấy thông tin profile");
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, [walletAddress, contract, getUser, fetchStats]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-gradient-to-br from-indigo-50 to-blue-50">
      {/* Hero Section */}
      <section
        className="relative min-h-[40vh] flex items-center justify-center bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: `linear-gradient(to bottom, rgba(0, 0, 0, 0.4), rgba(0, 0, 0, 0.4)), url('https://images.unsplash.com/photo-1576091160550-2173dba999ef')`,
        }}
      >
        <div className="container mx-auto px-6 text-center">
          <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-4">Hồ sơ bác sĩ</h1>
          <p className="text-lg md:text-xl text-gray-200">Quản lý thông tin cá nhân và chuyên môn của bạn</p>
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
                    className="block py-2 px-4 text-indigo-600 font-semibold bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-all duration-200"
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
                    className="block py-2 px-4 text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all duration-200"
                  >
                    Xác minh bác sĩ
                  </Link>
                </li>
              </ul>
            </div>

            <div className="lg:w-3/4">
              {/* Thông tin cá nhân */}
              <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-gray-800">Thông tin cá nhân</h2>
                  <span
                    className={`px-4 py-2 text-sm font-medium rounded-full ${
                      profile.isVerified
                        ? "bg-green-100 text-green-800"
                        : "bg-yellow-100 text-yellow-800"
                    }`}
                  >
                    {profile.isVerified ? "Đã xác minh" : "Chưa xác minh"}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Họ và tên</label>
                    <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                      {profile.fullName || "Chưa cập nhật"}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                      {profile.email || "Chưa cập nhật"}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Địa chỉ ví</label>
                    <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 break-all">
                      {walletAddress}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">IPFS Hash</label>
                    <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 break-all">
                      {profile.ipfsHash || "Chưa có"}
                    </div>
                  </div>
                </div>
              </div>

              {/* Thống kê hoạt động */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white rounded-xl shadow-lg p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Bệnh nhân đã khám</p>
                      <h3 className="text-2xl font-bold text-gray-800 mt-1">{stats.totalPatients}</h3>
                    </div>
                    <div className="p-3 bg-blue-100 rounded-full">
                      <svg
                        className="w-6 h-6 text-blue-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                        />
                      </svg>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-lg p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Lịch hẹn hôm nay</p>
                      <h3 className="text-2xl font-bold text-gray-800 mt-1">{stats.todayAppointments}</h3>
                    </div>
                    <div className="p-3 bg-green-100 rounded-full">
                      <svg
                        className="w-6 h-6 text-green-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                      </svg>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-lg p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Hồ sơ đã tạo</p>
                      <h3 className="text-2xl font-bold text-gray-800 mt-1">{stats.totalRecords}</h3>
                    </div>
                    <div className="p-3 bg-purple-100 rounded-full">
                      <svg
                        className="w-6 h-6 text-purple-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default DoctorProfile; 