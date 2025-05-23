import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import { useSmartContract } from "../hooks";
import useIpfs from "../hooks/useIPFS";

function DoctorRecords() {
  const {
    patients,
    fetchPatients,
    contract,
    walletAddress,
    getMedicalRecordsByDoctor,
    getUser,
  } = useSmartContract();
  const { ipfs } = useIpfs();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [recordDetails, setRecordDetails] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [userRole, setUserRole] = useState(null);
  const [activeTab, setActiveTab] = useState(null);
  const recordsPerPage = 10;

  // Memoized patients map for quick lookup
  const patientsMap = useMemo(() => {
    const map = {};
    patients.forEach((patient) => {
      map[patient.address.toLowerCase()] = patient.fullName;
    });
    return map;
  }, [patients]);

  // Fetch user role
  const fetchUserRole = useCallback(async () => {
    if (!contract || !walletAddress || !getUser) return;
    try {
      const user = await getUser(walletAddress);
      setUserRole(user.role);
      console.log("Vai trò người dùng:", user.role, "Xác minh:", user.isVerified);
    } catch (error) {
      console.error("Lỗi khi lấy vai trò người dùng:", error);
      toast.error("Không thể xác định vai trò người dùng.");
    }
  }, [contract, walletAddress, getUser]);

  // Fetch records by doctor
  const fetchRecords = useCallback(async () => {
    if (!contract || !walletAddress || !getMedicalRecordsByDoctor) return;
    setLoading(true);
    try {
      if (userRole !== "2") {
        console.warn("Người dùng không phải bác sĩ hoặc chưa xác minh:", userRole);
        setRecords([]);
        toast.warn("Chỉ bác sĩ đã xác minh mới có thể xem hồ sơ y tế.");
        return;
      }

      const doctorRecords = await getMedicalRecordsByDoctor(walletAddress);
      setRecords(doctorRecords);
      console.log("Fetched doctor records:", doctorRecords);
    } catch (error) {
      console.error("Lỗi khi lấy bệnh án:", error);
      toast.error("Không thể lấy danh sách bệnh án.");
    } finally {
      setLoading(false);
    }
  }, [contract, walletAddress, getMedicalRecordsByDoctor, userRole]);

  // Initialize data
  const init = useCallback(async () => {
    try {
      console.log("Running init...");
      await fetchPatients();
      await fetchUserRole();
      await fetchRecords();
    } catch (error) {
      console.error("Lỗi khi khởi tạo:", error);
      toast.error("Không thể khởi tạo dữ liệu.");
    }
  }, [fetchPatients, fetchUserRole, fetchRecords]);

  useEffect(() => {
    if (walletAddress && contract) {
      init();
    }
  }, [walletAddress, contract, init]);

  // Fetch record details from IPFS
  const fetchRecordDetails = useCallback(async (ipfsHash) => {
    if (!ipfs) {
      console.error("IPFS client chưa khởi tạo.");
      toast.error("IPFS client chưa sẵn sàng. Vui lòng kiểm tra node IPFS local.");
      return;
    }
    if (!ipfsHash || typeof ipfsHash !== "string" || !ipfsHash.startsWith("Qm") || ipfsHash.length < 46) {
      console.error("IPFS Hash không hợp lệ:", ipfsHash);
      toast.error("Hash IPFS không hợp lệ hoặc không tồn tại.");
      return;
    }
    setDetailLoading(true);
    try {
      console.log("Đang lấy dữ liệu từ IPFS local với hash:", ipfsHash);
      const response = await ipfs.get(ipfsHash, { timeout: 10000 });
      let content = "";
      for await (const chunk of response) {
        content += new TextDecoder().decode(chunk);
      }
      console.log("Nội dung thô từ IPFS:", content);

      // Trích xuất JSON từ nội dung thô
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("Không tìm thấy JSON hợp lệ trong nội dung IPFS.");
      }
      const jsonContent = jsonMatch[0];
      console.log("JSON trích xuất:", jsonContent);

      const parsed = JSON.parse(jsonContent);
      if (!parsed.patientAddress || !parsed.visitDate) {
        throw new Error("Dữ liệu IPFS không đúng định dạng.");
      }
      setRecordDetails(parsed);
      setActiveTab(parsed.records?.[0]?.recordType || parsed.recordType);
      console.log("Chi tiết hồ sơ:", parsed);
    } catch (error) {
      console.error("Lỗi khi lấy chi tiết bệnh án từ IPFS:", error);
      let errorMessage = "Không thể lấy chi tiết bệnh án từ IPFS.";
      if (error.message.includes("ECONNREFUSED")) {
        errorMessage = "Không thể kết nối đến node IPFS local. Vui lòng kiểm tra node đang chạy.";
      } else if (error.message.includes("JSON") || error.message.includes("not valid JSON")) {
        errorMessage = "Dữ liệu IPFS không phải JSON hợp lệ.";
      } else if (error.message.includes("timeout")) {
        errorMessage = "Yêu cầu IPFS hết thời gian. Vui lòng thử lại.";
      } else if (error.message.includes("Không tìm thấy JSON")) {
        errorMessage = "Không tìm thấy JSON hợp lệ trong nội dung IPFS.";
      }
      toast.error(errorMessage);
      setRecordDetails(null);
    } finally {
      setDetailLoading(false);
    }
  }, [ipfs]);

  // Handle view details
  const handleViewDetails = useCallback((record) => {
    setSelectedRecord(record);
    fetchRecordDetails(record.ipfsHash);
  }, [fetchRecordDetails]);

  // Close modal
  const closeModal = useCallback(() => {
    setSelectedRecord(null);
    setRecordDetails(null);
    setActiveTab(null);
  }, []);

  // Pagination
  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * recordsPerPage;
    const end = start + recordsPerPage;
    return records.slice(start, end);
  }, [records, currentPage]);

  const totalPages = Math.ceil(records.length / recordsPerPage);

  // Render record type
  const getRecordTypeName = (type) => {
    switch (type.toString()) {
      case "1": return "Hồ sơ tổng hợp";
      case "2": return "Kết quả xét nghiệm";
      case "3": return "Đơn thuốc";
      default: return "Không xác định";
    }
  };

  // Render record details
  const renderRecordDetails = () => {
    if (detailLoading) {
      return (
        <div className="flex justify-center items-center py-8">
          <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          <span className="ml-3 text-gray-600 text-lg">Đang tải chi tiết...</span>
        </div>
      );
    }
    if (!recordDetails) {
      return (
        <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-lg flex items-center">
          <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          <p>Không thể tải chi tiết bệnh án.</p>
        </div>
      );
    }

    const renderTabContent = (record) => {
      if (!record) return null;

      switch (record.recordType) {
        case "EXAMINATION_RECORD":
          return (
            <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-8 hover:shadow-md transition-shadow duration-200">
              <h4 className="text-2xl font-semibold text-gray-800 mb-4 flex items-center">
                <svg className="w-6 h-6 mr-2 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>
                </svg>
                Hồ sơ khám bệnh
              </h4>
              <div className="space-y-4">
                <div className="hover:bg-gray-50 p-2 rounded-md transition-colors duration-200">
                  <p className="text-base text-gray-500">Triệu chứng</p>
                  <p className="text-gray-800">{record.details.symptoms}</p>
                </div>
                <div className="border-t border-gray-200"></div>
                <div className="hover:bg-gray-50 p-2 rounded-md transition-colors duration-200">
                  <p className="text-base text-gray-500">Chẩn đoán</p>
                  <p className="text-gray-800">{record.details.diagnosis}</p>
                </div>
                {record.details.notes && (
                  <>
                    <div className="border-t border-gray-200"></div>
                    <div className="hover:bg-gray-50 p-2 rounded-md transition-colors duration-200">
                      <p className="text-base text-gray-500">Ghi chú</p>
                      <p className="text-gray-800">{record.details.notes}</p>
                    </div>
                  </>
                )}
              </div>
            </div>
          );
        case "TEST_RESULT":
          return (
            <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-8 hover:shadow-md transition-shadow duration-200">
              <h4 className="text-2xl font-semibold text-gray-800 mb-4 flex items-center">
                <svg className="w-6 h-6 mr-2 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5s3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18s-3.332.477-4.5 1.253"></path>
                </svg>
                Kết quả xét nghiệm
              </h4>
              <div className="space-y-4">
                <div className="hover:bg-gray-50 p-2 rounded-md transition-colors duration-200">
                  <p className="text-base text-gray-500">Loại xét nghiệm</p>
                  <p className="text-gray-800">{record.details.testType}</p>
                </div>
                <div className="border-t border-gray-200"></div>
                <div className="hover:bg-gray-50 p-2 rounded-md transition-colors duration-200">
                  <p className="text-base text-gray-500">Kết quả</p>
                  <p className="text-gray-800">{record.details.results}</p>
                </div>
                {record.details.comments && (
                  <>
                    <div className="border-t border-gray-200"></div>
                    <div className="hover:bg-gray-50 p-2 rounded-md transition-colors duration-200">
                      <p className="text-base text-gray-500">Nhận xét</p>
                      <p className="text-gray-800">{record.details.comments}</p>
                    </div>
                  </>
                )}
              </div>
            </div>
          );
        case "PRESCRIPTION":
          return (
            <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-8 hover:shadow-md transition-shadow duration-200">
              <h4 className="text-2xl font-semibold text-gray-800 mb-4 flex items-center">
                <svg className="w-6 h-6 mr-2 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h-2m-6 0H7m2-2h6"></path>
                </svg>
                Đơn thuốc
              </h4>
              <div className="space-y-4">
                {record.details.medications.map((med, index) => (
                  <div key={index} className="border-l-4 border-indigo-200 pl-4">
                    <div className="hover:bg-gray-50 p-2 rounded-md transition-colors duration-200">
                      <p className="text-base text-gray-500">Tên thuốc</p>
                      <p className="text-gray-800 font-medium">{med.name}</p>
                    </div>
                    <div className="border-t border-gray-200"></div>
                    <div className="hover:bg-gray-50 p-2 rounded-md transition-colors duration-200">
                      <p className="text-base text-gray-500">Liều lượng</p>
                      <p className="text-gray-800">{med.dosage}</p>
                    </div>
                    <div className="border-t border-gray-200"></div>
                    <div className="hover:bg-gray-50 p-2 rounded-md transition-colors duration-200">
                      <p className="text-base text-gray-500">Hướng dẫn</p>
                      <p className="text-gray-800">{med.instructions}</p>
                    </div>
                    {index < record.details.medications.length - 1 && <div className="border-t border-gray-200 my-2"></div>}
                  </div>
                ))}
                {record.details.notes && (
                  <>
                    <div className="border-t border-gray-200"></div>
                    <div className="hover:bg-gray-50 p-2 rounded-md transition-colors duration-200">
                      <p className="text-base text-gray-500">Ghi chú</p>
                      <p className="text-gray-800">{record.details.notes}</p>
                    </div>
                  </>
                )}
              </div>
            </div>
          );
        default:
          return null;
      }
    };

    return (
      <div className="space-y-8">
        {/* Thông tin chung */}
        <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-8 hover:shadow-md transition-shadow duration-200">
          <h4 className="text-2xl font-semibold text-gray-800 mb-4 flex items-center">
            <svg className="w-6 h-6 mr-2 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            Thông tin chung
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="hover:bg-gray-50 p-2 rounded-md transition-colors duration-200">
              <p className="text-base text-gray-500">Bệnh nhân</p>
              <p className="text-gray-800 font-medium">
                {patientsMap[recordDetails.patientAddress] || `${recordDetails.patientAddress.slice(0, 6)}...${recordDetails.patientAddress.slice(-4)}`}
              </p>
            </div>
            <div className="hover:bg-gray-50 p-2 rounded-md transition-colors duration-200">
              <p className="text-base text-gray-500">Ngày khám</p>
              <p className="text-gray-800 font-medium">{recordDetails.visitDate}</p>
            </div>
            <div className="hover:bg-gray-50 p-2 rounded-md transition-colors duration-200">
              <p className="text-base text-gray-500">Ngày tạo</p>
              <p className="text-gray-800 font-medium">{new Date(recordDetails.createdAt).toLocaleString()}</p>
            </div>
          </div>
        </div>

        {/* Tabs for record types */}
        {recordDetails.records ? (
          <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-8">
            <div className="flex border-b border-gray-200">
              {recordDetails.records.map((record) => (
                <button
                  key={record.recordType}
                  onClick={() => setActiveTab(record.recordType)}
                  className={`px-4 py-2 text-sm font-medium ${
                    activeTab === record.recordType
                      ? "border-b-2 border-indigo-600 text-indigo-600"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  {record.recordType === "EXAMINATION_RECORD" ? "Hồ sơ khám bệnh" :
                   record.recordType === "TEST_RESULT" ? "Kết quả xét nghiệm" :
                   record.recordType === "PRESCRIPTION" ? "Đơn thuốc" : "Không xác định"}
                </button>
              ))}
            </div>
            <div className="mt-6">
              {renderTabContent(recordDetails.records.find((r) => r.recordType === activeTab))}
            </div>
          </div>
        ) : (
          renderTabContent({
            recordType: recordDetails.recordType,
            details: recordDetails.details,
          })
        )}
      </div>
    );
  };

  return (
    <div className="w-full min-h-screen bg-gradient-to-br from-indigo-50 to-blue-50">
      <section
        className="relative min-h-[40vh] flex items-center justify-center bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: `linear-gradient(to bottom, rgba(0, 0, 0, 0.4), rgba(0, 0, 0, 0.4)), url('https://images.unsplash.com/photo-1556742049-0cfed4f6a45d')`,
        }}
      >
        <div className="container mx-auto px-6 text-center">
          <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-4">Quản lý hồ sơ y tế</h1>
          <p className="text-lg md:text-xl text-gray-200">
            Xem và quản lý các hồ sơ y tế đã thêm.
          </p>
        </div>
      </section>

      <section className="py-16">
        <div className="container mx-auto px-6">
          <div className="flex flex-col lg:flex-row gap-8">
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
                    to="/doctor/add-record"
                    className="block py-2 px-4 text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all duration-200"
                  >
                    Thêm hồ sơ
                  </Link>
                </li>
                <li>
                  <Link
                    to="/doctor/records"
                    className="block py-2 px-4 text-indigo-600 font-semibold bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-all duration-200"
                  >
                    Hồ sơ y tế
                  </Link>
                </li>
              </ul>
            </div>

            <div className="lg:w-3/4">
              <div className="bg-white rounded-xl shadow-lg p-8">
                <h2 className="text-2xl font-bold text-gray-800 mb-6">Danh sách hồ sơ y tế</h2>
                {loading ? (
                  <div className="flex justify-center">
                    <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                ) : userRole !== "2" ? (
                  <p className="text-gray-600 text-center">Chỉ bác sĩ đã xác minh mới có thể xem hồ sơ y tế.</p>
                ) : records.length === 0 ? (
                  <p className="text-gray-600 text-center">Chưa có hồ sơ y tế nào.</p>
                ) : (
                  <>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-gray-50">
                            <th className="p-4 text-sm font-semibold text-gray-700 min-w-[200px]">Bệnh nhân</th>
                            <th className="p-4 text-sm font-semibold text-gray-700">Ngày khám</th>
                            <th className="p-4 text-sm font-semibold text-gray-700">Loại hồ sơ</th>
                            <th className="p-4 text-sm font-semibold text-gray-700">IPFS Hash</th>
                            <th className="p-4 text-sm font-semibold text-gray-700">Trạng thái</th>
                            <th className="p-4 text-sm font-semibold text-gray-700">Hành động</th>
                          </tr>
                        </thead>
                        <tbody>
                          {paginatedRecords.map((record) => (
                            <tr key={record.recordIndex} className="border-b hover:bg-gray-50">
                              <td className="p-4 text-sm text-gray-600 truncate max-w-[200px]">
                                {patientsMap[record.patient] || `${record.patient.slice(0, 6)}...${record.patient.slice(-4)}`}
                              </td>
                              <td className="p-4 text-sm text-gray-600">
                                {new Date(record.timestamp * 1000).toISOString().split("T")[0]}
                              </td>
                              <td className="p-4 text-sm text-gray-600">
                                {getRecordTypeName(record.recordType)}
                              </td>
                              <td className="p-4 text-sm text-gray-600 truncate max-w-[150px]">
                                {record.ipfsHash.slice(0, 10)}...{record.ipfsHash.slice(-4)}
                              </td>
                              <td className="p-4 text-sm">
                                <span
                                  className={`px-2 py-1 rounded-full text-xs ${
                                    record.isApproved
                                      ? "bg-green-100 text-green-800"
                                      : "bg-yellow-100 text-yellow-800"
                                  }`}
                                >
                                  {record.isApproved ? "Đã phê duyệt" : "Chờ phê duyệt"}
                                </span>
                              </td>
                              <td className="p-4">
                                <button
                                  onClick={() => handleViewDetails(record)}
                                  className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
                                >
                                  Xem chi tiết
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {totalPages > 1 && (
                      <div className="flex justify-between items-center mt-6">
                        <button
                          onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                          disabled={currentPage === 1}
                          className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50"
                        >
                          Trước
                        </button>
                        <span className="text-sm text-gray-600">
                          Trang {currentPage} / {totalPages}
                        </span>
                        <button
                          onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                          disabled={currentPage === totalPages}
                          className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50"
                        >
                          Tiếp
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Modal for record details */}
      {selectedRecord && (
        <div className="fixed inset-0 bg-black bg-opacity-40 backdrop-blur-sm flex items-center justify-center z-50 transition-opacity duration-300">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-3xl w-full max-h-[85vh] overflow-y-auto transform transition-all duration-300 scale-100 sm:scale-105">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800 flex items-center">
                <svg className="w-6 h-6 mr-2 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l2.414 2.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2"></path>
                </svg>
                Chi tiết hồ sơ y tế
              </h2>
              <button
                onClick={closeModal}
                className="text-gray-500 hover:text-gray-700 text-xl p-2 rounded-full hover:bg-gray-100 transition-colors duration-200"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
            </div>
            {renderRecordDetails()}
            <div className="mt-8 flex justify-end">
              <button
                onClick={closeModal}
                className="px-6 py-2 text-sm font-medium text-white bg-gradient-to-r from-indigo-600 to-blue-500 rounded-lg hover:from-indigo-700 hover:to-blue-600 shadow-md transition-all duration-300 transform hover:scale-105"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default DoctorRecords;