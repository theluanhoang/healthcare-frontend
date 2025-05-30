import { useCallback, useEffect, useState, useMemo } from "react";
import { useParams } from "react-router-dom";
import { toast } from "react-toastify";
import { useSmartContract } from "../hooks";
import useIpfs from "../hooks/useIPFS";
import Sidebar from "../components/doctors/Sidebar";

// Enum for record types
const RecordType = {
  NONE: 0,
  EXAMINATION_RECORD: 1,
  TEST_RESULT: 2,
  PRESCRIPTION: 3
};

const getRecordTypeName = (type) => {
  switch (Number(type)) {
    case RecordType.EXAMINATION_RECORD:
      return "Khám bệnh";
    case RecordType.TEST_RESULT:
      return "Kết quả xét nghiệm";
    case RecordType.PRESCRIPTION:
      return "Đơn thuốc";
    default:
      return "Không xác định";
  }
};

// Hàm rút gọn địa chỉ ví
const shortenAddress = (address) => {
  if (!address) return "";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

const PatientDetail = () => {
  const { patientAddress } = useParams();
  const { contract } = useSmartContract();
  const { getJson, ipfs } = useIpfs();
  
  const [data, setData] = useState({
    isLoading: true,
    patient: null,
    medicalRecords: [],
    recordDetails: {},
    doctorNames: {}
  });

  // Cache for IPFS data to prevent repeated fetches
  const [fetchedIpfsHashes, setFetchedIpfsHashes] = useState(new Set());

  // Lấy tên bác sĩ từ địa chỉ ví
  const fetchDoctorName = useCallback(async (doctorAddress) => {
    if (!contract || !doctorAddress) return null;
    try {
      const doctorData = await contract.getUser(doctorAddress);
      return doctorData[3] || shortenAddress(doctorAddress);
    } catch (error) {
      console.error("Lỗi khi lấy thông tin bác sĩ:", error);
      return shortenAddress(doctorAddress);
    }
  }, [contract]);

  // Lấy dữ liệu từ IPFS với cache
  const fetchIPFSData = useCallback(async (ipfsHash) => {
    if (!ipfsHash || !getJson || !ipfs) return null;
    if (fetchedIpfsHashes.has(ipfsHash)) {
      return data.recordDetails[ipfsHash];
    }
    
    try {
      const jsonData = await getJson(ipfsHash);
      const parsedData = JSON.parse(jsonData);
      setFetchedIpfsHashes(prev => new Set([...prev, ipfsHash]));
      setData(prev => ({
        ...prev,
        recordDetails: {
          ...prev.recordDetails,
          [ipfsHash]: parsedData
        }
      }));
      return parsedData;
    } catch (error) {
      console.error("Lỗi khi lấy dữ liệu từ IPFS:", error);
      return null;
    }
  }, [getJson, ipfs, fetchedIpfsHashes, data.recordDetails]);

  // Khởi tạo dữ liệu
  useEffect(() => {
    let isMounted = true;

    const initializeData = async () => {
      if (!contract || !patientAddress || !ipfs) return;

      try {
        // Lấy thông tin bệnh nhân
        const patientData = await contract.getUser(patientAddress);
        if (!patientData || !patientData[3]) {
          if (isMounted) {
            toast.error("Không tìm thấy thông tin bệnh nhân");
            setData(prev => ({ ...prev, isLoading: false }));
          }
          return;
        }

        const patient = {
          address: patientAddress,
          name: patientData[3],
          email: patientData[4] || "Chưa cập nhật",
          phoneNumber: patientData[2] || "Chưa cập nhật",
          role: Number(patientData[0]),
          isActive: patientData[1]
        };

        // Lấy lịch sử khám bệnh
        const records = await contract.getMedicalRecords(patientAddress);
        const formattedRecords = Array.isArray(records) 
          ? records
              .map((record, index) => ({
                id: index,
                ipfsHash: record.ipfsHash,
                doctor: record.doctor,
                timestamp: Number(record.timestamp),
                recordType: Number(record.recordType),
                isApproved: record.isApproved
              }))
              .sort((a, b) => b.timestamp - a.timestamp)
          : [];

        // Lấy thông tin chi tiết cho mỗi record
        const doctorNamesMap = {};

        // First update the basic data
        if (isMounted) {
          setData(prev => ({
            isLoading: false,
            patient,
            medicalRecords: formattedRecords,
            recordDetails: prev.recordDetails,
            doctorNames: doctorNamesMap
          }));
        }

        // Then fetch IPFS data for each record
        await Promise.all(
          formattedRecords.map(async (record) => {
            if (!doctorNamesMap[record.doctor]) {
              const doctorName = await fetchDoctorName(record.doctor);
              if (doctorName && isMounted) {
                setData(prev => ({
                  ...prev,
                  doctorNames: {
                    ...prev.doctorNames,
                    [record.doctor]: doctorName
                  }
                }));
              }
            }

            await fetchIPFSData(record.ipfsHash);
          })
        );

      } catch (error) {
        console.error("Lỗi khi khởi tạo dữ liệu:", error);
        if (isMounted) {
          toast.error("Không thể lấy thông tin. Vui lòng thử lại sau.");
          setData(prev => ({ ...prev, isLoading: false }));
        }
      }
    };

    initializeData();

    return () => {
      isMounted = false;
    };
  }, [contract, patientAddress, ipfs, fetchDoctorName, fetchIPFSData]);

  const { isLoading, patient, medicalRecords, recordDetails, doctorNames } = data;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Không tìm thấy bệnh nhân</h2>
          <p className="text-gray-600">Bệnh nhân không tồn tại hoặc bạn không có quyền truy cập</p>
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
          <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-4">
            Hồ sơ bệnh nhân
          </h1>
          <p className="text-lg md:text-xl text-gray-200">
            Xem thông tin chi tiết và lịch sử khám bệnh
          </p>
        </div>
      </section>

      <section className="py-16">
        <div className="container mx-auto px-6">
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Sidebar Navigation */}
            <Sidebar />

            {/* Main Content */}
            <div className="lg:w-3/4 space-y-8">
              {/* Patient Information Card */}
              <div className="bg-white rounded-xl shadow-lg p-8">
                <h2 className="text-2xl font-bold text-gray-800 mb-6">Thông tin bệnh nhân</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-gray-500">Họ và tên</label>
                      <p className="text-lg text-gray-800">{patient.name}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Email</label>
                      <p className="text-lg text-gray-800">{patient.email}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Số điện thoại</label>
                      <p className="text-lg text-gray-800">{patient.phoneNumber}</p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-gray-500">Địa chỉ ví</label>
                      <p className="text-lg text-gray-800 font-mono break-all">{patient.address}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Trạng thái</label>
                      <span className={`ml-2 px-3 py-1 text-sm font-medium rounded-full ${
                        patient.isActive
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-100 text-gray-800"
                      }`}>
                        {patient.isActive ? "Đang hoạt động" : "Không hoạt động"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Medical Records */}
              <div className="bg-white rounded-xl shadow-lg p-8">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-gray-800">Lịch sử khám bệnh</h2>
                  <p className="text-gray-600">Tổng số: {medicalRecords.length} lần khám</p>
                </div>

                {medicalRecords.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                      <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <p className="text-gray-600">Chưa có lịch sử khám bệnh</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {medicalRecords.map((record) => (
                      <div
                        key={record.id}
                        className="bg-gray-50 rounded-lg p-6 hover:shadow-md transition-shadow duration-200"
                      >
                        <div className="flex flex-col md:flex-row md:items-center justify-between mb-4">
                          <div>
                            <h3 className="text-lg font-semibold text-gray-800">
                              {getRecordTypeName(record.recordType)}
                            </h3>
                            <p className="text-sm text-gray-500">
                              {new Date(record.timestamp * 1000).toLocaleDateString("vi-VN", {
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit"
                              })}
                            </p>
                          </div>
                          <div className="mt-2 md:mt-0">
                            <span className="text-sm text-gray-500">
                              Bác sĩ: {doctorNames[record.doctor] || shortenAddress(record.doctor)}
                            </span>
                          </div>
                        </div>

                        <div className="space-y-4">
                          <div>
                            <h4 className="font-medium text-gray-700 mb-2">Trạng thái</h4>
                            <span className={`px-3 py-1 text-sm font-medium rounded-full ${
                              record.isApproved
                                ? "bg-green-100 text-green-800"
                                : "bg-yellow-100 text-yellow-800"
                            }`}>
                              {record.isApproved ? "Đã xác nhận" : "Chờ xác nhận"}
                            </span>
                          </div>
                          
                          {recordDetails[record.ipfsHash] && (
                            <div className="mt-4 space-y-4">
                              <div>
                                <h4 className="font-medium text-gray-700 mb-2">Ngày khám</h4>
                                <p className="text-gray-600">
                                  {new Date(recordDetails[record.ipfsHash].visitDate).toLocaleDateString("vi-VN", {
                                    year: "numeric",
                                    month: "long",
                                    day: "numeric"
                                  })}
                                </p>
                              </div>

                              {recordDetails[record.ipfsHash].records?.[0]?.details?.symptoms && (
                                <div>
                                  <h4 className="font-medium text-gray-700 mb-2">Triệu chứng</h4>
                                  <p className="text-gray-600">{recordDetails[record.ipfsHash].records[0].details.symptoms}</p>
                                </div>
                              )}

                              {recordDetails[record.ipfsHash].records?.[0]?.details?.diagnosis && (
                                <div>
                                  <h4 className="font-medium text-gray-700 mb-2">Chẩn đoán</h4>
                                  <p className="text-gray-600">{recordDetails[record.ipfsHash].records[0].details.diagnosis}</p>
                                </div>
                              )}

                              {recordDetails[record.ipfsHash].records?.[0]?.details?.notes && (
                                <div>
                                  <h4 className="font-medium text-gray-700 mb-2">Ghi chú</h4>
                                  <p className="text-gray-600">{recordDetails[record.ipfsHash].records[0].details.notes}</p>
                                </div>
                              )}

                              <div className="pt-2 border-t border-gray-200">
                                <h4 className="font-medium text-gray-700 mb-2">Thông tin thêm</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div>
                                    <span className="text-sm text-gray-500">Người tạo:</span>
                                    <p className="text-gray-600">{shortenAddress(recordDetails[record.ipfsHash].createdBy)}</p>
                                  </div>
                                  <div>
                                    <span className="text-sm text-gray-500">Thời gian tạo:</span>
                                    <p className="text-gray-600">
                                      {new Date(recordDetails[record.ipfsHash].createdAt).toLocaleString("vi-VN", {
                                        year: "numeric",
                                        month: "numeric",
                                        day: "numeric",
                                        hour: "2-digit",
                                        minute: "2-digit"
                                      })}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
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
};

export default PatientDetail; 