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
      // Kiểm tra vai trò trước khi gọi
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
      toast.error("IPFS client chưa sẵn sàng.");
      return;
    }
    setDetailLoading(true);
    try {
      const response = await ipfs.get(ipfsHash);
      let content = "";
      for await (const chunk of response) {
        content += new TextDecoder().decode(chunk);
      }
      const parsed = JSON.parse(content);
      setRecordDetails(parsed);
      console.log("Record details:", parsed);
    } catch (error) {
      console.error("Lỗi khi lấy chi tiết bệnh án:", error);
      toast.error("Không thể lấy chi tiết bệnh án từ IPFS.");
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
    switch (type) {
      case 1: return "Hồ sơ khám bệnh";
      case 2: return "Kết quả xét nghiệm";
      case 3: return "Đơn thuốc";
      default: return "Không xác định";
    }
  };

  // Render record details
  const renderRecordDetails = () => {
    if (detailLoading) {
      return <p className="text-gray-600">Đang tải chi tiết...</p>;
    }
    if (!recordDetails) {
      return <p className="text-red-500">Không thể tải chi tiết bệnh án.</p>;
    }

    return (
      <div className="space-y-4">
        <div>
          <h4 className="text-lg font-semibold text-gray-800">Thông tin chung</h4>
          <p><strong>Bệnh nhân:</strong> {patientsMap[recordDetails.patientAddress] || recordDetails.patientAddress}</p>
          <p><strong>Ngày khám:</strong> {recordDetails.visitDate}</p>
          <p><strong>Loại hồ sơ:</strong> {recordDetails.recordType}</p>
          <p><strong>Ngày tạo:</strong> {new Date(recordDetails.createdAt).toLocaleString()}</p>
        </div>
        {recordDetails.recordType === "EXAMINATION_RECORD" && (
          <div>
            <h4 className="text-lg font-semibold text-gray-800">Hồ sơ khám bệnh</h4>
            <p><strong>Triệu chứng:</strong> {recordDetails.details.symptoms}</p>
            <p><strong>Chẩn đoán:</strong> {recordDetails.details.diagnosis}</p>
            {recordDetails.details.notes && <p><strong>Ghi chú:</strong> {recordDetails.details.notes}</p>}
          </div>
        )}
        {recordDetails.recordType === "TEST_RESULT" && (
          <div>
            <h4 className="text-lg font-semibold text-gray-800">Kết quả xét nghiệm</h4>
            <p><strong>Loại xét nghiệm:</strong> {recordDetails.details.testType}</p>
            <p><strong>Kết quả:</strong> {recordDetails.details.results}</p>
            {recordDetails.details.comments && <p><strong>Nhận xét:</strong> {recordDetails.details.comments}</p>}
          </div>
        )}
        {recordDetails.recordType === "PRESCRIPTION" && (
          <div>
            <h4 className="text-lg font-semibold text-gray-800">Đơn thuốc</h4>
            <ul className="list-disc ml-5">
              {recordDetails.details.medications.map((med, index) => (
                <li key={index}>
                  <p><strong>Tên thuốc:</strong> {med.name}</p>
                  <p><strong>Liều lượng:</strong> {med.dosage}</p>
                  <p><strong>Hướng dẫn:</strong> {med.instructions}</p>
                </li>
              ))}
            </ul>
            {recordDetails.details.notes && <p><strong>Ghi chú:</strong> {recordDetails.details.notes}</p>}
          </div>
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
                            <th className="p-4 text-sm font-semibold text-gray-700">Bệnh nhân</th>
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
                              <td className="p-4 text-sm text-gray-600">
                                {patientsMap[record.patient] || `${record.patient.slice(0, 6)}...${record.patient.slice(-4)}`}
                              </td>
                              <td className="p-4 text-sm text-gray-600">
                                {recordDetails?.visitDate || new Date(record.timestamp * 1000).toISOString().split("T")[0]}
                              </td>
                              <td className="p-4 text-sm text-gray-600">
                                {getRecordTypeName(record.recordType)}
                              </td>
                              <td className="p-4 text-sm text-gray-600">
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

                    {/* Pagination */}
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-lg p-8 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800">Chi tiết hồ sơ y tế</h2>
              <button
                onClick={closeModal}
                className="text-gray-600 hover:text-gray-800 text-xl"
              >
                ×
              </button>
            </div>
            {renderRecordDetails()}
            <div className="mt-6 flex justify-end">
              <button
                onClick={closeModal}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700"
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