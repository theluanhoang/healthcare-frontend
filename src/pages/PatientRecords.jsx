"use client"

import { useEffect, useState, useCallback } from "react"
import { Link } from "react-router-dom"
import { useSmartContract } from "../hooks"
import useIpfs from "../hooks/useIPFS"
import useWebSocket from "../hooks/useWebSocket"
import { toast } from "react-toastify"

function PatientRecords() {
  const { walletAddress, getMedicalRecords, isLoading: contractLoading } = useSmartContract()
  const { ipfs, getJson } = useIpfs()

  const [medicalRecords, setMedicalRecords] = useState([])
  const [selectedRecord, setSelectedRecord] = useState(null)
  const [recordDetails, setRecordDetails] = useState(null)
  const [isLoadingDetails, setIsLoadingDetails] = useState(false)
  const [selectedTab, setSelectedTab] = useState("EXAMINATION_RECORD")

  // Xử lý WebSocket message
  const handleWebSocketMessage = useCallback((data) => {
    if (data.type === 'NEW_RECORD' && data.patientAddress === walletAddress) {
      // Có hồ sơ mới được thêm cho bệnh nhân này
      toast.info('Bạn có hồ sơ y tế mới cần phê duyệt');
      fetchRecords(); // Gọi lại hàm fetch records
    }
  }, [walletAddress]);

  // Khởi tạo WebSocket
  const { sendMessage } = useWebSocket(handleWebSocketMessage);

  // Di chuyển hàm fetchRecords ra ngoài useEffect
  const fetchRecords = useCallback(async () => {
    if (walletAddress) {
      try {
        const records = await getMedicalRecords()
        setMedicalRecords(records)
      } catch (error) {
        console.error("Lỗi tải hồ sơ y tế:", error)
      }
    }
  }, [walletAddress, getMedicalRecords]);

  useEffect(() => {
    fetchRecords()
  }, [fetchRecords])

  // Thêm hàm xử lý khi phê duyệt hồ sơ
  const handleApproveRecord = async (record) => {
    try {
      await approveRecord(record.id);
      // Gửi thông báo qua WebSocket
      sendMessage({
        type: 'RECORD_APPROVED',
        recordId: record.id,
        doctorAddress: record.doctorAddress
      });
      // Cập nhật lại danh sách hồ sơ
      fetchRecords();
      toast.success('Phê duyệt hồ sơ thành công');
    } catch (error) {
      console.error('Lỗi khi phê duyệt hồ sơ:', error);
      toast.error('Không thể phê duyệt hồ sơ');
    }
  };

  const recordTypeToString = (type) => {
    switch (Number(type)) {
      case 1:
        return "Hồ sơ khám bệnh"
      case 2:
        return "Kết quả xét nghiệm"
      case 3:
        return "Đơn thuốc"
      default:
        return "Không xác định"
    }
  }

  const getRecordTypeIcon = (type) => {
    switch (Number(type)) {
      case 1:
        return "🏥"
      case 2:
        return "🧪"
      case 3:
        return "💊"
      default:
        return "📄"
    }
  }

  const viewRecordDetails = async (record) => {
    try {
      setIsLoadingDetails(true)
      setSelectedRecord(record)
      const jsonData = await getJson(record.ipfsHash)
      setRecordDetails(JSON.parse(jsonData))
    } catch (error) {
      console.error("Lỗi khi lấy chi tiết hồ sơ:", error)
      toast.error("Không thể lấy chi tiết hồ sơ y tế.")
    } finally {
      setIsLoadingDetails(false)
    }
  }

  const closeRecordModal = () => {
    setSelectedRecord(null)
    setRecordDetails(null)
  }

  if (contractLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <div className="w-full min-h-screen bg-gradient-to-br from-indigo-50 to-blue-50">
      {/* Hero Section */}
      <section
        className="relative min-h-[40vh] flex items-center justify-center bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: `linear-gradient(to bottom, rgba(0, 0, 0, 0.4), rgba(0, 0, 0, 0.4)), url('https://images.unsplash.com/photo-1559757148-5c350d0d3c56')`,
        }}
      >
        <div className="container mx-auto px-6 text-center">
          <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-4">Hồ sơ y tế của tôi</h1>
          <p className="text-lg md:text-xl text-gray-200">Xem và quản lý tất cả hồ sơ y tế của bạn một cách an toàn.</p>
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
                    to="/patient/profile"
                    className="block py-2 px-4 text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all duration-200"
                  >
                    Hồ sơ
                  </Link>
                </li>
                <li>
                  <Link
                    to="/patient/records"
                    className="block py-2 px-4 text-indigo-600 font-semibold bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-all duration-200"
                  >
                    Hồ sơ y tế
                  </Link>
                </li>
                <li>
                  <Link
                    to="/patient/appointment"
                    className="block py-2 px-4 text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all duration-200"
                  >
                    Lịch hẹn
                  </Link>
                </li>
                <li>
                  <Link
                    to="/patient/share"
                    className="block py-2 px-4 text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all duration-200"
                  >
                    Chia sẻ dữ liệu
                  </Link>
                </li>
              </ul>
            </div>

            <div className="lg:w-3/4">
              {/* Thống kê tổng quan */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white rounded-xl shadow-lg p-6">
                  <div className="flex items-center">
                    <div className="p-3 bg-blue-100 rounded-full">
                      <span className="text-2xl">📊</span>
                    </div>
                    <div className="ml-4">
                      <h3 className="text-lg font-semibold text-gray-800">Tổng hồ sơ</h3>
                      <p className="text-2xl font-bold text-blue-600">{medicalRecords.length}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-lg p-6">
                  <div className="flex items-center">
                    <div className="p-3 bg-green-100 rounded-full">
                      <span className="text-2xl">✅</span>
                    </div>
                    <div className="ml-4">
                      <h3 className="text-lg font-semibold text-gray-800">Đã phê duyệt</h3>
                      <p className="text-2xl font-bold text-green-600">
                        {medicalRecords.filter((record) => record.isApproved).length}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-lg p-6">
                  <div className="flex items-center">
                    <div className="p-3 bg-yellow-100 rounded-full">
                      <span className="text-2xl">⏳</span>
                    </div>
                    <div className="ml-4">
                      <h3 className="text-lg font-semibold text-gray-800">Chờ phê duyệt</h3>
                      <p className="text-2xl font-bold text-yellow-600">
                        {medicalRecords.filter((record) => !record.isApproved).length}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Danh sách hồ sơ y tế */}
              <div className="bg-white rounded-xl shadow-lg p-8">
                <h2 className="text-2xl font-bold text-gray-800 mb-6">Danh sách hồ sơ y tế</h2>

                {medicalRecords.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-6xl mb-4">📋</div>
                    <p className="text-gray-600 text-lg">Chưa có hồ sơ y tế nào.</p>
                    <p className="text-gray-500 text-sm mt-2">
                      Hồ sơ y tế sẽ được hiển thị khi bác sĩ thêm và bạn phê duyệt.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {medicalRecords
                      .sort((a, b) => b.timestamp - a.timestamp)
                      .map((record, index) => (
                        <div
                          key={index}
                          className="p-6 bg-gray-50 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200 border-l-4 border-indigo-500"
                        >
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="flex items-center mb-2">
                                <span className="text-2xl mr-3">{getRecordTypeIcon(record.recordType)}</span>
                                <h3 className="text-lg font-semibold text-gray-800">
                                  {recordTypeToString(record.recordType)}
                                </h3>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                                <div>
                                  <p className="text-sm text-gray-500">Bác sĩ điều trị</p>
                                  <p className="text-gray-700 font-medium">{record.doctorName}</p>
                                </div>

                                <div>
                                  <p className="text-sm text-gray-500">Ngày tạo</p>
                                  <p className="text-gray-700 font-medium">
                                    {new Date(record.timestamp * 1000).toLocaleDateString("vi-VN")}
                                  </p>
                                </div>

                                <div>
                                  <p className="text-sm text-gray-500">IPFS Hash</p>
                                  <p className="text-gray-700 font-mono text-sm break-all">{record.ipfsHash}</p>
                                </div>

                                <div>
                                  <p className="text-sm text-gray-500">Trạng thái</p>
                                  <span
                                    className={`inline-flex px-3 py-1 text-sm font-medium rounded-full ${
                                      record.isApproved
                                        ? "bg-green-100 text-green-800"
                                        : "bg-yellow-100 text-yellow-800"
                                    }`}
                                  >
                                    {record.isApproved ? "Đã phê duyệt" : "Chờ phê duyệt"}
                                  </span>
                                </div>
                              </div>

                              {/* Nút xem chi tiết */}
                              <div className="mt-4">
                                <button
                                  onClick={() => viewRecordDetails(record)}
                                  className="inline-flex items-center px-4 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors duration-200"
                                >
                                  <span className="mr-2">👁️</span>
                                  Xem chi tiết
                                </button>
                              </div>

                              {/* Nút phê duyệt */}
                              {!record.isApproved && (
                                <button
                                  onClick={() => handleApproveRecord(record)}
                                  className="inline-flex items-center px-4 py-2 ml-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors duration-200"
                                >
                                  <span className="mr-2">✓</span>
                                  Phê duyệt
                                </button>
                              )}
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

      {/* Modal xem chi tiết hồ sơ y tế */}
      {selectedRecord && recordDetails && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-900">Chi tiết hồ sơ y tế</h2>
                <button onClick={closeRecordModal} className="text-gray-500 hover:text-gray-700 text-2xl">
                  ×
                </button>
              </div>
            </div>

            <div className="p-6">
              {/* Thông tin chung */}
              <div className="mb-6 bg-gray-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Thông tin chung</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-700">Ngày khám</p>
                    <p className="text-base text-gray-900">{recordDetails.visitDate}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">Bác sĩ</p>
                    <p className="text-base text-gray-900">{selectedRecord.doctorName}</p>
                  </div>
                </div>
              </div>

              {/* Tabs */}
              <div className="mb-6">
                <div className="flex space-x-4 border-b border-gray-200">
                  {recordDetails.records.map((record) => (
                    <button
                      key={record.recordType}
                      onClick={() => setSelectedTab(record.recordType)}
                      className={`py-2 px-4 text-sm font-medium rounded-t-lg transition-colors duration-200 ${
                        selectedTab === record.recordType
                          ? "text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50"
                          : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      {record.recordType === "EXAMINATION_RECORD" && "Khám bệnh"}
                      {record.recordType === "TEST_RESULT" && "Xét nghiệm"}
                      {record.recordType === "PRESCRIPTION" && "Đơn thuốc"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Nội dung tab */}
              {recordDetails.records.map((record) => (
                record.recordType === selectedTab && (
                  <div key={record.recordType} className="bg-white rounded-lg">
                    {record.recordType === "EXAMINATION_RECORD" && (
                      <div className="space-y-6">
                        <div className="bg-blue-50 p-4 rounded-lg">
                          <p className="text-sm font-semibold text-gray-900 mb-2">Triệu chứng</p>
                          <p className="text-base text-gray-800 whitespace-pre-line">{record.details.symptoms}</p>
                        </div>
                        <div className="bg-green-50 p-4 rounded-lg">
                          <p className="text-sm font-semibold text-gray-900 mb-2">Chẩn đoán</p>
                          <p className="text-base text-gray-800 whitespace-pre-line">{record.details.diagnosis}</p>
                        </div>
                        {record.details.notes && (
                          <div className="bg-yellow-50 p-4 rounded-lg">
                            <p className="text-sm font-semibold text-gray-900 mb-2">Ghi chú</p>
                            <p className="text-base text-gray-800 whitespace-pre-line">{record.details.notes}</p>
                          </div>
                        )}
                      </div>
                    )}

                    {record.recordType === "TEST_RESULT" && (
                      <div className="space-y-6">
                        <div className="bg-purple-50 p-4 rounded-lg">
                          <p className="text-sm font-semibold text-gray-900 mb-2">Loại xét nghiệm</p>
                          <p className="text-base text-gray-800">{record.details.testType}</p>
                        </div>
                        <div className="bg-indigo-50 p-4 rounded-lg">
                          <p className="text-sm font-semibold text-gray-900 mb-2">Kết quả</p>
                          <p className="text-base text-gray-800 whitespace-pre-line">{record.details.results}</p>
                        </div>
                        {record.details.comments && (
                          <div className="bg-pink-50 p-4 rounded-lg">
                            <p className="text-sm font-semibold text-gray-900 mb-2">Nhận xét</p>
                            <p className="text-base text-gray-800 whitespace-pre-line">{record.details.comments}</p>
                          </div>
                        )}
                      </div>
                    )}

                    {record.recordType === "PRESCRIPTION" && (
                      <div className="space-y-6">
                        <div>
                          <p className="text-sm font-semibold text-gray-900 mb-4">Danh sách thuốc</p>
                          <div className="space-y-4">
                            {record.details.medications.map((med, idx) => (
                              <div key={idx} className="p-4 bg-orange-50 rounded-lg border border-orange-100">
                                <p className="font-medium text-gray-900 mb-2">{med.name}</p>
                                <p className="text-sm text-gray-800">
                                  <span className="font-medium">Liều lượng:</span> {med.dosage}
                                </p>
                                <p className="text-sm text-gray-800">
                                  <span className="font-medium">Hướng dẫn:</span> {med.instructions}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                        {record.details.notes && (
                          <div className="bg-red-50 p-4 rounded-lg">
                            <p className="text-sm font-semibold text-gray-900 mb-2">Ghi chú</p>
                            <p className="text-base text-gray-800 whitespace-pre-line">{record.details.notes}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default PatientRecords
