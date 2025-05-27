import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import { useSmartContract } from "../hooks";
import useIpfs from "../hooks/useIPFS";

function DoctorVerify() {
  const { pendingDoctorRegistrations, fetchDoctors, voteForDoctor, contract, walletAddress } = useSmartContract();
  const { getBinaryFile } = useIpfs();
  const [isVerifiedDoctor, setIsVerifiedDoctor] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCertificate, setSelectedCertificate] = useState(null);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [certificateLoading, setCertificateLoading] = useState(false);

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

  // Xử lý xem chứng chỉ
  const viewCertificate = useCallback(async (doctor) => {
    if (!doctor.ipfsHash) {
      toast.error("Không tìm thấy chứng chỉ của bác sĩ này");
      return;
    }

    setCertificateLoading(true);
    setSelectedDoctor(doctor);
    try {
      console.log("Đang tải chứng chỉ với hash:", doctor.ipfsHash);
      
      // Thử lấy từ IPFS node trước
      try {
        const imageUrl = await getBinaryFile(doctor.ipfsHash);
        console.log("Đã tạo URL cho ảnh từ IPFS node:", imageUrl);
        setSelectedCertificate(imageUrl);
      } catch (error) {
        // Nếu lỗi, thử dùng gateway local
        console.log("Thử dùng gateway local...");
        const gatewayUrl = `http://localhost:8080/ipfs/${doctor.ipfsHash}`;
        console.log("Gateway URL:", gatewayUrl);
        setSelectedCertificate(gatewayUrl);
      }
      
      setShowModal(true);
    } catch (error) {
      console.error("Lỗi khi lấy chứng chỉ:", error);
      toast.error("Không thể lấy chứng chỉ từ IPFS. Vui lòng thử lại sau.");
    } finally {
      setCertificateLoading(false);
    }
  }, [getBinaryFile]);

  // Cleanup URL khi đóng modal
  useEffect(() => {
    return () => {
      if (selectedCertificate) {
        URL.revokeObjectURL(selectedCertificate);
      }
    };
  }, [selectedCertificate]);

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

  // Render modal với error boundary
  const renderModal = () => {
    if (!showModal) return null;

    return (
      <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
        <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
          {/* Background overlay với gradient và blur */}
          <div 
            className="fixed inset-0 transition-opacity backdrop-blur-sm bg-gradient-to-br from-indigo-500/30 via-purple-500/30 to-pink-500/30" 
            aria-hidden="true"
          >
            {/* Thêm lớp gradient phủ */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-black/30 mix-blend-overlay"></div>
          </div>

          {/* Modal panel với animation */}
          <div className="inline-block align-bottom bg-white/95 backdrop-blur-sm rounded-2xl text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-5xl sm:w-full border border-white/20">
            <div className="absolute top-0 right-0 pt-4 pr-4">
              <button
                type="button"
                className="bg-white/10 backdrop-blur-sm rounded-lg p-2 text-gray-400 hover:text-gray-500 hover:bg-white/20 transition-all duration-200 focus:outline-none"
                onClick={() => {
                  setShowModal(false);
                  setSelectedDoctor(null);
                  if (selectedCertificate && selectedCertificate.startsWith('blob:')) {
                    URL.revokeObjectURL(selectedCertificate);
                  }
                  setSelectedCertificate(null);
                }}
              >
                <span className="sr-only">Đóng</span>
                <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="bg-transparent px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
              {/* Header với style mới */}
              <div className="sm:flex sm:items-start">
                <div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">
                    Chứng chỉ bác sĩ
                  </h3>
                  {selectedDoctor && (
                    <div className="mb-4 text-gray-600">
                      <p className="text-lg">Bác sĩ: {selectedDoctor.fullName}</p>
                      <p className="text-sm opacity-75">Địa chỉ: {selectedDoctor.address}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Certificate display với hiệu ứng mới */}
              <div className="mt-4 flex justify-center items-center rounded-xl p-4 bg-gradient-to-br from-white/50 to-white/30 backdrop-blur-sm shadow-inner">
                {certificateLoading ? (
                  <div className="flex items-center justify-center h-[50vh]">
                    <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                ) : selectedCertificate ? (
                  <div className="relative w-full max-w-4xl mx-auto group">
                    <img
                      src={selectedCertificate}
                      alt="Chứng chỉ bác sĩ"
                      className="w-full h-auto max-h-[70vh] object-contain rounded-xl shadow-2xl transition-transform duration-300 group-hover:scale-[1.02]"
                      onError={(e) => {
                        console.error("Lỗi khi tải ảnh:", e);
                        toast.error("Không thể hiển thị ảnh chứng chỉ");
                        e.target.style.display = 'none';
                      }}
                      onLoad={(e) => {
                        console.log("Ảnh đã được tải thành công:", e.target.src);
                      }}
                    />
                  </div>
                ) : (
                  <div className="text-center text-gray-500 py-8">
                    <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <p className="mt-2">Không thể tải chứng chỉ</p>
                  </div>
                )}
              </div>
            </div>

            {/* Modal actions với style mới */}
            <div className="bg-gray-50/50 backdrop-blur-sm px-6 py-4 sm:px-8 sm:flex sm:flex-row-reverse gap-3">
              {selectedDoctor && (
                <button
                  type="button"
                  onClick={() => verifyDoctor(selectedDoctor.address)}
                  className="w-full inline-flex justify-center rounded-xl border border-transparent px-6 py-3 bg-gradient-to-r from-indigo-600 to-blue-500 text-base font-medium text-white shadow-lg hover:from-indigo-700 hover:to-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:ml-3 sm:w-auto sm:text-sm transition-all duration-300 hover:scale-105"
                >
                  Xác minh bác sĩ này
                </button>
              )}
              <button
                type="button"
                className="mt-3 w-full inline-flex justify-center rounded-xl border border-gray-300 px-6 py-3 bg-white text-base font-medium text-gray-700 shadow-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:w-auto sm:text-sm transition-all duration-300 hover:scale-105"
                onClick={() => {
                  setShowModal(false);
                  setSelectedDoctor(null);
                  if (selectedCertificate && selectedCertificate.startsWith('blob:')) {
                    URL.revokeObjectURL(selectedCertificate);
                  }
                  setSelectedCertificate(null);
                }}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      </div>
    );
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
                          <div className="flex gap-2">
                            <button
                              onClick={() => viewCertificate(doctor)}
                              className="px-6 py-2 text-sm font-semibold text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-all duration-300"
                              disabled={certificateLoading}
                            >
                              {certificateLoading ? "Đang tải..." : "Xem chứng chỉ"}
                            </button>
                            <button
                              onClick={() => verifyDoctor(doctor.address)}
                              className="px-6 py-2 text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 to-blue-500 rounded-lg hover:from-indigo-700 hover:to-blue-600 shadow-md transition-all duration-300 transform hover:scale-105"
                            >
                              Xác minh
                            </button>
                          </div>
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

      {/* Render modal */}
      {renderModal()}
    </div>
  );
}

export default DoctorVerify; 