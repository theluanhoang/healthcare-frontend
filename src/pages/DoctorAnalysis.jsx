import { zodResolver } from "@hookform/resolvers/zod";
import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  Title,
  Tooltip,
  ArcElement,
} from "chart.js";
import { useCallback, useEffect, useState, useMemo, useRef } from "react";
import { Bar, Pie } from "react-chartjs-2";
import { useForm } from "react-hook-form";
import { z } from "zod";
import Sidebar from "../components/doctors/Sidebar";
import { useSmartContract } from "../hooks";
import useIpfs from "../hooks/useIPFS";
import { toast } from "react-toastify";

// Đăng ký các thành phần cho Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

// Schema cho bộ lọc
const filterSchema = z.object({
  patientName: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  recordType: z.string().optional(),
});

// Enum cho loại bệnh án
const RecordType = {
  NONE: 0,
  EXAMINATION_RECORD: 1,
  TEST_RESULT: 2,
  PRESCRIPTION: 3,
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

function DoctorAnalysis() {
  const { contract, signer } = useSmartContract();
  const { getJson, ipfs } = useIpfs();
  
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    allPatients: [],
    medicalRecords: [],
    recordDetails: {},
    patientDetails: {},
  });
  const [filteredRecords, setFilteredRecords] = useState([]);
  const initialized = useRef(false);
  const isMounted = useRef(true);
  
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(filterSchema),
    defaultValues: {
      patientName: "",
      dateFrom: "",
      dateTo: "",
      recordType: "",
    },
  });

  // Memoize fetchIPFSData function
  const fetchIPFSData = useCallback(async (ipfsHash) => {
    if (!ipfsHash || !getJson) return null;
    try {
      const jsonData = await getJson(ipfsHash);
      return JSON.parse(jsonData);
    } catch (error) {
      console.error("Lỗi khi lấy dữ liệu từ IPFS:", error);
      return null;
    }
  }, [getJson]);

  // Khởi tạo dữ liệu
  useEffect(() => {
    // Cleanup function để tránh memory leak
    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    const initializeData = async () => {
      if (!contract || !ipfs || !signer || initialized.current || !isMounted.current) return;

      try {
        initialized.current = true;
        setLoading(true);

        const doctorAddress = await signer.getAddress();
        console.log("Fetching data for doctor:", doctorAddress);

        const [patientAddresses, patientNames] = await contract.getAuthorizedPatients(doctorAddress);
        console.log("Authorized patients:", patientAddresses.length);

        if (!isMounted.current) return;

        const patientDetailsMap = {};
        const patientsData = patientAddresses.map((address, index) => {
          const details = {
            address,
            name: patientNames[index],
            isActive: true
          };
          patientDetailsMap[address] = details;
          return details;
        });

        const allRecords = [];
        const recordDetailsMap = {};

        await Promise.all(
          patientAddresses.map(async (address) => {
            if (!isMounted.current) return;

            const isAuthorized = await contract.hasAccessToPatient(address, doctorAddress);
            if (!isAuthorized) return;

            const records = await contract.getMedicalRecords(address);
            if (Array.isArray(records)) {
              const formattedRecords = await Promise.all(
                records.map(async (record, index) => {
                  if (!isMounted.current) return null;

                  const ipfsData = await fetchIPFSData(record.ipfsHash);
                  if (ipfsData) {
                    recordDetailsMap[record.ipfsHash] = ipfsData;
                  }
                  return {
                    id: `${address}-${index}`,
                    patientAddress: address,
                    ipfsHash: record.ipfsHash,
                    doctor: record.doctor,
                    timestamp: Number(record.timestamp),
                    recordType: Number(record.recordType),
                    isApproved: record.isApproved,
                  };
                })
              );
              allRecords.push(...formattedRecords.filter(Boolean));
            }
          })
        );

        if (!isMounted.current) return;

        console.log("Setting data with records:", allRecords.length);
        setData({
          allPatients: patientsData,
          medicalRecords: allRecords,
          recordDetails: recordDetailsMap,
          patientDetails: patientDetailsMap,
        });
        setFilteredRecords(allRecords);
      } catch (error) {
        console.error("Lỗi khi khởi tạo dữ liệu:", error);
        if (isMounted.current) {
          toast.error("Không thể tải dữ liệu. Vui lòng thử lại sau.");
        }
      } finally {
        if (isMounted.current) {
          setLoading(false);
        }
      }
    };

    initializeData();
  }, [contract, ipfs, signer]);

  // Memoize chart data
  const recordTypeChartData = useMemo(() => ({
    labels: Object.values(RecordType)
      .filter((type) => type !== RecordType.NONE)
      .map(getRecordTypeName),
    datasets: [
      {
        label: "Số lượng bệnh án",
        data: Object.values(RecordType)
          .filter((type) => type !== RecordType.NONE)
          .map(
            (type) =>
              filteredRecords.filter((record) => record.recordType === type).length
          ),
        backgroundColor: [
          "rgba(99, 102, 241, 0.6)",
          "rgba(52, 211, 153, 0.6)",
          "rgba(251, 146, 60, 0.6)",
        ],
        borderColor: [
          "rgba(99, 102, 241, 1)",
          "rgba(52, 211, 153, 1)",
          "rgba(251, 146, 60, 1)",
        ],
        borderWidth: 1,
      },
    ],
  }), [filteredRecords]);

  // Memoize timeline data
  const timelineChartData = useMemo(() => ({
    labels: filteredRecords
      .sort((a, b) => a.timestamp - b.timestamp)
      .slice(-10)
      .map((record) =>
        new Date(record.timestamp * 1000).toLocaleDateString("vi-VN")
      ),
    datasets: [
      {
        label: "Số lượng bệnh án",
        data: filteredRecords
          .sort((a, b) => a.timestamp - b.timestamp)
          .slice(-10)
          .map(() => 1),
        backgroundColor: "rgba(99, 102, 241, 0.6)",
        borderColor: "rgba(99, 102, 241, 1)",
        borderWidth: 1,
      },
    ],
  }), [filteredRecords]);

  // Memoize filter function
  const onFilter = useCallback((filterData) => {
    const { patientName, dateFrom, dateTo, recordType } = filterData;
    let filtered = [...data.medicalRecords];

    if (patientName) {
      filtered = filtered.filter((record) => {
        const patient = data.patientDetails[record.patientAddress];
        return patient?.name.toLowerCase().includes(patientName.toLowerCase());
      });
    }

    if (dateFrom) {
      const fromDate = new Date(dateFrom).getTime() / 1000;
      filtered = filtered.filter((record) => record.timestamp >= fromDate);
    }

    if (dateTo) {
      const toDate = new Date(dateTo).getTime() / 1000;
      filtered = filtered.filter((record) => record.timestamp <= toDate);
    }

    if (recordType) {
      filtered = filtered.filter(
        (record) => record.recordType === parseInt(recordType)
      );
    }

    setFilteredRecords(filtered);
  }, [data.medicalRecords, data.patientDetails]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-gradient-to-br from-indigo-50 to-blue-50">
      {/* Hero Section */}
      <section
        className="relative min-h-[40vh] flex items-center justify-center bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: `linear-gradient(to bottom, rgba(0, 0, 0, 0.4), rgba(0, 0, 0, 0.4)), url('https://images.unsplash.com/photo-1551288049-b1f3c6fded6f')`,
        }}
      >
        <div className="container mx-auto px-6 text-center">
          <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-4">
            Phân tích dữ liệu
          </h1>
          <p className="text-lg md:text-xl text-gray-200">
            Phân tích dữ liệu bệnh nhân để hỗ trợ chẩn đoán và điều trị hiệu quả
          </p>
        </div>
      </section>

      {/* Analysis Content */}
      <section className="py-16">
        <div className="container mx-auto px-6">
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Sidebar Navigation */}
            <Sidebar />

            {/* Analysis Content */}
            <div className="lg:w-3/4">
              {/* Filter Form */}
              <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
                <h2 className="text-2xl font-bold text-gray-800 mb-6">
                  Lọc dữ liệu phân tích
                </h2>
                <form
                  onSubmit={handleSubmit(onFilter)}
                  className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
                >
                  <div>
                    <input
                      type="text"
                      {...register("patientName")}
                      placeholder="Tên bệnh nhân"
                      className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                    {errors.patientName && (
                      <p className="text-red-500 text-sm mt-1">
                        {errors.patientName.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <input
                      type="date"
                      {...register("dateFrom")}
                      className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                    {errors.dateFrom && (
                      <p className="text-red-500 text-sm mt-1">
                        {errors.dateFrom.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <input
                      type="date"
                      {...register("dateTo")}
                      className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                    {errors.dateTo && (
                      <p className="text-red-500 text-sm mt-1">
                        {errors.dateTo.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <select
                      {...register("recordType")}
                      className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <option value="">Tất cả loại bệnh án</option>
                      <option value={RecordType.EXAMINATION_RECORD}>Khám bệnh</option>
                      <option value={RecordType.TEST_RESULT}>Kết quả xét nghiệm</option>
                      <option value={RecordType.PRESCRIPTION}>Đơn thuốc</option>
                    </select>
                  </div>

                  <div className="md:col-span-2 lg:col-span-4">
                    <button
                      type="submit"
                      className="w-full py-3 px-6 text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 to-blue-500 rounded-lg hover:from-indigo-700 hover:to-blue-600 shadow-md transition-all duration-300"
                    >
                      Lọc dữ liệu
                    </button>
                  </div>
                </form>
              </div>

              {/* Analysis Dashboard */}
              <div className="bg-white rounded-xl shadow-lg p-8">
                <h2 className="text-2xl font-bold text-gray-800 mb-6">
                  Tổng quan phân tích
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                  {/* Biểu đồ phân bố loại bệnh án */}
                  <div className="bg-white p-6 rounded-xl shadow-md">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">
                      Phân bố loại bệnh án
                    </h3>
                    <Pie data={recordTypeChartData} />
                  </div>

                  {/* Biểu đồ số lượng bệnh án theo thời gian */}
                  <div className="bg-white p-6 rounded-xl shadow-md">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">
                      Số lượng bệnh án theo thời gian
                    </h3>
                    <Bar
                      data={timelineChartData}
                      options={{
                        responsive: true,
                        scales: {
                          y: {
                            beginAtZero: true,
                            ticks: {
                              stepSize: 1,
                            },
                          },
                        },
                      }}
                    />
                  </div>
                </div>

                {/* Data Table */}
                <div>
                  <h3 className="text-xl font-semibold text-gray-800 mb-4">
                    Chi tiết bệnh án ({filteredRecords.length})
                  </h3>
                  {filteredRecords.length === 0 ? (
                    <p className="text-gray-600 text-center py-8">
                      Không có dữ liệu để hiển thị.
                    </p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full table-auto">
                        <thead>
                          <tr className="bg-gray-100">
                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-800">
                              Bệnh nhân
                            </th>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-800">
                              Loại bệnh án
                            </th>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-800">
                              Ngày tạo
                            </th>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-800">
                              Chẩn đoán
                            </th>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-800">
                              Trạng thái
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredRecords.map((record) => {
                            const ipfsData = data.recordDetails[record.ipfsHash];
                            const patient = data.patientDetails[record.patientAddress];
                            return (
                              <tr
                                key={record.id}
                                className="border-b hover:bg-gray-50 transition-all duration-200"
                              >
                                <td className="px-4 py-3 text-gray-700">
                                  {patient?.name || "N/A"}
                                </td>
                                <td className="px-4 py-3 text-gray-700">
                                  {getRecordTypeName(record.recordType)}
                                </td>
                                <td className="px-4 py-3 text-gray-700">
                                  {new Date(record.timestamp * 1000).toLocaleDateString(
                                    "vi-VN",
                                    {
                                      year: "numeric",
                                      month: "long",
                                      day: "numeric",
                                    }
                                  )}
                                </td>
                                <td className="px-4 py-3 text-gray-700">
                                  {ipfsData?.records?.[0]?.details?.diagnosis || "N/A"}
                                </td>
                                <td className="px-4 py-3">
                                  <span
                                    className={`px-3 py-1 text-sm font-medium rounded-full ${
                                      record.isApproved
                                        ? "bg-green-100 text-green-800"
                                        : "bg-yellow-100 text-yellow-800"
                                    }`}
                                  >
                                    {record.isApproved ? "Đã xác nhận" : "Chờ xác nhận"}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default DoctorAnalysis;