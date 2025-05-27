import { zodResolver } from "@hookform/resolvers/zod";
import { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Link } from "react-router-dom";
import { z } from "zod";
import Sidebar from "../components/doctors/Sidebar";
import { useSmartContract } from "../hooks";
import { toast } from "react-toastify";

// Tạo schema với Zod cho tìm kiếm
const searchSchema = z.object({
  searchQuery: z.string().optional(),
});

function DoctorPatients() {
  const { contract, walletAddress } = useSmartContract();
  const [patients, setPatients] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filteredPatients, setFilteredPatients] = useState([]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(searchSchema),
    defaultValues: {
      searchQuery: "",
    },
  });

  // Lấy danh sách bệnh nhân từ smart contract
  const fetchPatients = useCallback(async () => {
    if (!contract || !walletAddress) return;

    try {
      setIsLoading(true);
      
      // Lấy danh sách bệnh nhân được cấp quyền cho bác sĩ
      const rawAuthorizedPatients = await contract.getAuthorizedPatients(walletAddress);
      console.log("Dữ liệu thô từ getAuthorizedPatients:", rawAuthorizedPatients);

      // Kiểm tra và chuyển đổi dữ liệu
      let authorizedAddresses = [];
      
      // Kiểm tra nếu rawAuthorizedPatients là một mảng
      if (Array.isArray(rawAuthorizedPatients)) {
        authorizedAddresses = rawAuthorizedPatients;
      } 
      // Kiểm tra nếu rawAuthorizedPatients là một object với thuộc tính là mảng
      else if (typeof rawAuthorizedPatients === 'object' && rawAuthorizedPatients !== null) {
        // Thử lấy mảng từ các thuộc tính phổ biến
        const possibleArrays = ['patients', 'addresses', '_value', 'value', 'items'];
        for (const key of possibleArrays) {
          if (Array.isArray(rawAuthorizedPatients[key])) {
            authorizedAddresses = rawAuthorizedPatients[key];
            break;
          }
        }
      }

      console.log("Mảng địa chỉ trước khi xử lý:", authorizedAddresses);

      // Xử lý từng địa chỉ trong mảng
      authorizedAddresses = authorizedAddresses
        .map(item => {
          // Nếu item là string
          if (typeof item === 'string') {
            return item;
          }
          // Nếu item là object
          if (typeof item === 'object' && item !== null) {
            // Thử các trường có thể chứa địa chỉ
            const possibleFields = ['address', 'patientAddress', 'walletAddress', 'id'];
            for (const field of possibleFields) {
              if (typeof item[field] === 'string') {
                return item[field];
              }
            }
            // Nếu item có thuộc tính toString()
            if (typeof item.toString === 'function') {
              const str = item.toString();
              if (str.startsWith('0x')) {
                return str;
              }
            }
          }
          return null;
        })
        .filter(address => {
          const isValid = address !== null && typeof address === 'string';
          if (!isValid) {
            console.log("Địa chỉ không hợp lệ:", address);
          }
          return isValid;
        });

      console.log("Danh sách địa chỉ bệnh nhân đã xử lý:", authorizedAddresses);

      if (authorizedAddresses.length === 0) {
        console.log("Không có bệnh nhân nào được cấp quyền");
        setPatients([]);
        setFilteredPatients([]);
        return;
      }

      // Lấy thông tin chi tiết của từng bệnh nhân được cấp quyền
      const patientsData = await Promise.all(
        authorizedAddresses.map(async (address) => {
          try {
            console.log("Đang lấy thông tin cho địa chỉ:", address);
            const patient = await contract.getUser(address);
            console.log("Thông tin bệnh nhân:", patient);
            
            // Kiểm tra dữ liệu bệnh nhân
            if (!patient || !patient[3]) { // Kiểm tra fullName ở index 3
              console.log("Không tìm thấy thông tin bệnh nhân cho địa chỉ:", address);
              return null;
            }

            // Lấy số lần khám
            let visitCount;
            try {
              const medicalRecords = await contract.getMedicalRecords(address);
              visitCount = Array.isArray(medicalRecords) ? medicalRecords.length : 0;
              console.log("Số lần khám:", visitCount);
            } catch (error) {
              console.log("Lỗi khi lấy số lần khám:", error);
              visitCount = 0;
            }
            
            // Map dữ liệu từ mảng sang object
            return {
              id: address,
              name: patient[3], // fullName ở index 3
              email: patient[4] || "Chưa cập nhật", // email ở index 4
              walletAddress: address,
              visitCount: visitCount,
              role: Number(patient[0]), // role ở index 0
              isActive: patient[1], // isActive ở index 1
              phoneNumber: patient[2] || "Chưa cập nhật" // phoneNumber ở index 2
            };
          } catch (error) {
            console.error("Lỗi khi lấy thông tin bệnh nhân:", error);
            console.log("Địa chỉ gây lỗi:", address);
            return null;
          }
        })
      );

      // Lọc bỏ các giá trị null và sắp xếp theo số lần khám
      const validPatients = patientsData
        .filter(patient => patient !== null)
        .sort((a, b) => b.visitCount - a.visitCount);

      console.log("Danh sách bệnh nhân hợp lệ cuối cùng:", validPatients);
      
      setPatients(validPatients);
      setFilteredPatients(validPatients);
    } catch (error) {
      console.error("Lỗi khi lấy danh sách bệnh nhân:", error);
      toast.error("Không thể lấy danh sách bệnh nhân. Vui lòng thử lại sau.");
    } finally {
      setIsLoading(false);
    }
  }, [contract, walletAddress]);

  useEffect(() => {
    fetchPatients();
  }, [fetchPatients]);

  const onSearch = (data) => {
    const query = data.searchQuery?.toLowerCase() || "";
    if (!query) {
      setFilteredPatients(patients);
    } else {
      setFilteredPatients(
        patients.filter(
          (patient) =>
            patient.name.toLowerCase().includes(query) ||
            patient.email.toLowerCase().includes(query) ||
            patient.walletAddress.toLowerCase().includes(query)
        )
      );
    }
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
          <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-4">
            Quản lý bệnh nhân
          </h1>
          <p className="text-lg md:text-xl text-gray-200">
            Xem và quản lý thông tin bệnh nhân đã cấp quyền cho bạn
          </p>
        </div>
      </section>

      {/* Patients Content */}
      <section className="py-16">
        <div className="container mx-auto px-6">
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Sidebar Navigation */}
            <Sidebar />

            {/* Patients Content */}
            <div className="lg:w-3/4 space-y-8">
              {/* Search and Stats Card */}
              <div className="bg-white rounded-xl shadow-lg p-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-800">
                      Danh sách bệnh nhân
                    </h2>
                    <p className="text-gray-600 mt-1">
                      Tổng số: {filteredPatients.length} bệnh nhân
                    </p>
                  </div>
                  
                  {/* Search Form */}
                  <form
                    onSubmit={handleSubmit(onSearch)}
                    className="flex flex-col sm:flex-row gap-4"
                  >
                    <input
                      type="text"
                      {...register("searchQuery")}
                      placeholder="Tìm kiếm theo tên, email, số điện thoại..."
                      className="flex-1 min-w-[300px] p-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
                    />
                    <button
                      type="submit"
                      className="py-3 px-6 text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 to-blue-500 rounded-lg hover:from-indigo-700 hover:to-blue-600 shadow-md transition-all duration-300 transform hover:scale-105"
                    >
                      Tìm kiếm
                    </button>
                  </form>
                </div>

                {errors.searchQuery && (
                  <p className="text-red-500 text-sm mb-4">{errors.searchQuery.message}</p>
                )}

                {/* Loading State */}
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                ) : filteredPatients.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                      <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                    </div>
                    <p className="text-gray-600">Không tìm thấy bệnh nhân nào.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {filteredPatients.map((patient) => (
                      <div
                        key={patient.id}
                        className="bg-white border border-gray-100 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden group"
                      >
                        <div className="p-6">
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center space-x-3">
                              <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                                <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                              </div>
                              <div>
                                <h3 className="font-semibold text-gray-800">{patient.name}</h3>
                                <p className="text-sm text-gray-500">
                                  {patient.role === 1 ? "Bệnh nhân" : patient.role === 2 ? "Bác sĩ" : "Không xác định"}
                                </p>
                              </div>
                            </div>
                            <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                              patient.isActive
                                ? "bg-green-100 text-green-800"
                                : "bg-gray-100 text-gray-800"
                            }`}>
                              {patient.isActive ? "Đang hoạt động" : "Không hoạt động"}
                            </span>
                          </div>
                          
                          <div className="space-y-2 mb-4">
                            <p className="text-sm text-gray-600">
                              <span className="font-medium">Email:</span> {patient.email}
                            </p>
                            {patient.phoneNumber && patient.phoneNumber !== "" && (
                              <p className="text-sm text-gray-600">
                                <span className="font-medium">Số điện thoại:</span> {patient.phoneNumber}
                              </p>
                            )}
                            <p className="text-sm text-gray-600">
                              <span className="font-medium">Số lần khám:</span> {patient.visitCount}
                            </p>
                            <p className="text-sm text-gray-600 font-mono truncate">
                              <span className="font-medium not-mono">Địa chỉ ví:</span> {patient.walletAddress}
                            </p>
                          </div>

                          <div className="pt-4 border-t border-gray-100">
                            <Link
                              to={`/doctor/patient/${patient.walletAddress}`}
                              className="inline-flex items-center justify-center w-full px-4 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors duration-200"
                            >
                              Xem chi tiết
                              <svg className="w-4 h-4 ml-2 transition-transform duration-200 group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                              </svg>
                            </Link>
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
    </div>
  );
}

export default DoctorPatients;