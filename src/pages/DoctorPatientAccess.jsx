import { useEffect, useState, useCallback } from "react"
import Sidebar from "../components/doctors/Sidebar"
import { useSmartContract } from "../hooks"
import useIpfs from "../hooks/useIPFS"
import useWebSocket from "../hooks/useWebSocket"
import { toast } from "react-toastify"

function DoctorPatientAccess() {
  const {
    walletAddress,
    fetchAuthorizedPatients,
    getSharedRecordsByDoctor,
    getMedicalRecords,
    hasAccessToPatient,
    isLoading: contractLoading,
    addMedicalRecord,
  } = useSmartContract()
  const { ipfs, getJson } = useIpfs()

  const [localAuthorizedPatients, setLocalAuthorizedPatients] = useState([])
  const [sharedRecords, setSharedRecords] = useState([])
  const [selectedPatient, setSelectedPatient] = useState(null)
  const [patientRecords, setPatientRecords] = useState([])
  const [selectedRecord, setSelectedRecord] = useState(null)
  const [recordDetails, setRecordDetails] = useState(null)
  const [isLoadingDetails, setIsLoadingDetails] = useState(false)
  const [selectedTab, setSelectedTab] = useState("EXAMINATION_RECORD")

  // Xử lý WebSocket message
  const handleWebSocketMessage = useCallback((data) => {
    if (data.type === 'RECORD_APPROVED' && data.doctorAddress === walletAddress) {
      // Hồ sơ đã được phê duyệt
      toast.success('Một hồ sơ y tế đã được phê duyệt');
      fetchData(); // Cập nhật lại danh sách
    }
  }, [walletAddress]);

  // Khởi tạo WebSocket
  const { sendMessage } = useWebSocket(handleWebSocketMessage);

  // Di chuyển hàm fetchData ra ngoài useEffect
  const fetchData = useCallback(async () => {
      if (walletAddress) {
        try {
          const [patients, shared] = await Promise.all([fetchAuthorizedPatients(), getSharedRecordsByDoctor()])
          setLocalAuthorizedPatients(patients)
          setSharedRecords(shared)
        } catch (error) {
          console.error("Lỗi tải dữ liệu:", error)
        }
      }
  }, [walletAddress, fetchAuthorizedPatients, getSharedRecordsByDoctor]);

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Thêm hàm xử lý khi thêm hồ sơ mới
  const handleAddRecord = async (patientAddress, recordData) => {
    try {
      await addMedicalRecord(patientAddress, recordData);
      // Gửi thông báo qua WebSocket
      sendMessage({
        type: 'NEW_RECORD',
        patientAddress: patientAddress
      });
      // Cập nhật lại danh sách
      fetchData();
      toast.success('Thêm hồ sơ thành công');
    } catch (error) {
      console.error('Lỗi khi thêm hồ sơ:', error);
      toast.error('Không thể thêm hồ sơ');
    }
  };

  const handleViewPatientRecords = async (patient) => {
    try {
      // Kiểm tra quyền truy cập
      const hasAccess = await hasAccessToPatient(patient.address)
      if (!hasAccess) {
        alert("Bạn không có quyền truy cập hồ sơ của bệnh nhân này.")
        return
      }

      // Lấy hồ sơ y tế của bệnh nhân
      const records = await getMedicalRecords(patient.address)
      setPatientRecords(records.filter((record) => record.isApproved))
      setSelectedPatient(patient)
    } catch (error) {
      console.error("Lỗi lấy hồ sơ bệnh nhân:", error)
    }
  }

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
          backgroundImage: `linear-gradient(to bottom, rgba(0, 0, 0, 0.4), rgba(0, 0, 0, 0.4)), url('https://images.unsplash.com/photo-1559757175-0eb30cd8c063')`,
        }}
      >
        <div className="container mx-auto px-6 text-center">
          <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-4">Bệnh nhân đã cấp quyền</h1>
          <p className="text-lg md:text-xl text-gray-200">
            Quản lý và xem hồ sơ của các bệnh nhân đã cấp quyền truy cập.
          </p>
        </div>
      </section>

      <section className="py-16">
        <div className="container mx-auto px-6">
          <div className="flex flex-col lg:flex-row gap-8">
            <Sidebar />

            <div className="lg:w-3/4">
              {/* Thống kê */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white rounded-xl shadow-lg p-6">
                  <div className="flex items-center">
                    <div className="p-3 bg-blue-100 rounded-full">
                      <span className="text-2xl">👥</span>
                    </div>
                    <div className="ml-4">
                      <h3 className="text-lg font-semibold text-gray-800">Bệnh nhân</h3>
                      <p className="text-2xl font-bold text-blue-600">{localAuthorizedPatients.length}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-lg p-6">
                  <div className="flex items-center">
                    <div className="p-3 bg-green-100 rounded-full">
                      <span className="text-2xl">📋</span>
                    </div>
                    <div className="ml-4">
                      <h3 className="text-lg font-semibold text-gray-800">Hồ sơ được chia sẻ</h3>
                      <p className="text-2xl font-bold text-green-600">{sharedRecords.length}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-lg p-6">
                  <div className="flex items-center">
                    <div className="p-3 bg-purple-100 rounded-full">
                      <span className="text-2xl">🔐</span>
                    </div>
                    <div className="ml-4">
                      <h3 className="text-lg font-semibold text-gray-800">Quyền truy cập</h3>
                      <p className="text-2xl font-bold text-purple-600">Đã cấp</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Danh sách bệnh nhân đã cấp quyền */}
              <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
                <h2 className="text-2xl font-bold text-gray-800 mb-6">Danh sách bệnh nhân đã cấp quyền</h2>

                {localAuthorizedPatients.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-6xl mb-4">👥</div>
                    <p className="text-gray-600 text-lg">Chưa có bệnh nhân nào cấp quyền.</p>
                    <p className="text-gray-500 text-sm mt-2">
                      Bệnh nhân cần cấp quyền truy cập để bạn có thể xem hồ sơ của họ.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {localAuthorizedPatients.map((patient, index) => (
                      <div
                        key={index}
                        className="p-6 bg-gray-50 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200 border border-gray-200"
                      >
                        <div className="flex items-center mb-4">
                          <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center">
                            <span className="text-xl">👤</span>
                          </div>
                          <div className="ml-4">
                            <h3 className="text-lg font-semibold text-gray-800">{patient.fullName}</h3>
                            <p className="text-sm text-gray-500">{patient.email}</p>
                          </div>
                        </div>

                        <div className="mb-4">
                          <p className="text-sm text-gray-500">Địa chỉ ví</p>
                          <p className="text-xs text-gray-700 font-mono break-all">{patient.address}</p>
                        </div>

                        <button
                          onClick={() => handleViewPatientRecords(patient)}
                          className="w-full py-2 px-4 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors duration-200"
                        >
                          Xem hồ sơ y tế
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Hồ sơ được chia sẻ */}
              <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
                <h2 className="text-2xl font-bold text-gray-800 mb-6">Hồ sơ được chia sẻ trực tiếp</h2>

                {sharedRecords.length === 0 ? (
                  <p className="text-gray-600 text-center">Chưa có hồ sơ nào được chia sẻ trực tiếp.</p>
                ) : (
                  <div className="space-y-4">
                    {sharedRecords
                      .sort((a, b) => b.timestamp - a.timestamp)
                      .map((record, index) => (
                        <div
                          key={index}
                          className="p-4 bg-gray-50 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center mb-2">
                                <span className="text-xl mr-3">{getRecordTypeIcon(record.recordType)}</span>
                                <h3 className="text-lg font-semibold text-gray-800">
                                  {recordTypeToString(record.recordType)}
                                </h3>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <p className="text-sm text-gray-500">Bệnh nhân</p>
                                  <p className="text-gray-700 font-medium">{record.patientName}</p>
                                </div>

                                <div>
                                  <p className="text-sm text-gray-500">Ngày chia sẻ</p>
                                  <p className="text-gray-700 font-medium">
                                    {new Date(record.timestamp * 1000).toLocaleDateString("vi-VN")}
                                  </p>
                                </div>

                                {record.notes && (
                                  <div className="md:col-span-2">
                                    <p className="text-sm text-gray-500">Ghi chú</p>
                                    <p className="text-gray-700">{record.notes}</p>
                                  </div>
                                )}
                              </div>

                              <div className="mt-3">
                                <button
                                  onClick={() => viewRecordDetails(record)}
                                  className="inline-flex items-center px-3 py-1 text-sm font-medium text-indigo-600 bg-indigo-50 rounded hover:bg-indigo-100 transition-colors duration-200"
                                >
                                  <span className="mr-1">👁️</span>
                                  Xem chi tiết
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>

              {/* Modal xem hồ sơ bệnh nhân */}
              {selectedPatient && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                  <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                    <div className="p-6 border-b border-gray-200">
                      <div className="flex justify-between items-center">
                        <h2 className="text-2xl font-bold text-gray-800">Hồ sơ y tế - {selectedPatient.fullName}</h2>
                        <button
                          onClick={() => {
                            setSelectedPatient(null)
                            setPatientRecords([])
                          }}
                          className="text-gray-500 hover:text-gray-700 text-2xl"
                        >
                          ×
                        </button>
                      </div>
                    </div>

                    <div className="p-6">
                      {patientRecords.length === 0 ? (
                        <p className="text-gray-600 text-center">Bệnh nhân chưa có hồ sơ y tế nào được phê duyệt.</p>
                      ) : (
                        <div className="space-y-4">
                          {patientRecords
                            .sort((a, b) => b.timestamp - a.timestamp)
                            .map((record, index) => (
                              <div key={index} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                                <div className="flex items-center mb-3">
                                  <span className="text-xl mr-3">{getRecordTypeIcon(record.recordType)}</span>
                                  <h3 className="text-lg font-semibold text-gray-800">
                                    {recordTypeToString(record.recordType)}
                                  </h3>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                                </div>

                                <div className="mt-3">
                                  <button
                                    onClick={() => viewRecordDetails(record)}
                                    className="inline-flex items-center px-3 py-1 text-sm font-medium text-indigo-600 bg-indigo-50 rounded hover:bg-indigo-100 transition-colors duration-200"
                                  >
                                    <span className="mr-1">👁️</span>
                                    Xem chi tiết
                                  </button>
                                </div>
                              </div>
                            ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

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
                            <p className="text-sm font-medium text-gray-700">Bệnh nhân</p>
                            <p className="text-base text-gray-900">{selectedRecord.patientName || selectedPatient?.fullName}</p>
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
          </div>
        </div>
      </section>
    </div>
  )
}

export default DoctorPatientAccess
