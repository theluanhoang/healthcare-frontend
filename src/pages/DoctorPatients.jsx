import { zodResolver } from "@hookform/resolvers/zod";
import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { Link } from "react-router-dom";
import { z } from "zod";
import { useAuthStore } from "../stores/useAuthStore";

// Tạo schema với Zod cho tìm kiếm
const searchSchema = z.object({
  searchQuery: z.string().optional(),
});

function DoctorPatients() {
  const { walletAddress, role } = useAuthStore();
  const [patients, setPatients] = useState([
    // Mock data, thay bằng API thực tế
    {
      id: 1,
      name: "Nguyễn Văn A",
      email: "nguyenvana@example.com",
      walletAddress: "0x1234...5678",
      lastVisit: "2025-05-10",
    },
    {
      id: 2,
      name: "Trần Thị B",
      email: "tranthib@example.com",
      walletAddress: "0x8765...4321",
      lastVisit: "2025-05-08",
    },
    {
      id: 3,
      name: "Lê Văn C",
      email: "levanc@example.com",
      walletAddress: "0x9876...1234",
      lastVisit: "2025-05-05",
    },
  ]);

  const [filteredPatients, setFilteredPatients] = useState(patients);

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

  const onSearch = (data) => {
    const query = data.searchQuery.toLowerCase();
    if (!query) {
      setFilteredPatients(patients);
    } else {
      setFilteredPatients(
        patients.filter(
          (patient) =>
            patient.name.toLowerCase().includes(query) ||
            patient.email.toLowerCase().includes(query)
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
            Xem và quản lý thông tin bệnh nhân của bạn một cách an toàn với công nghệ blockchain.
          </p>
        </div>
      </section>

      {/* Patients Content */}
      <section className="py-16">
        <div className="container mx-auto px-6">
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Sidebar Navigation */}
            <div className="lg:w-1/4 bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-6">Điều hướng</h2>
              <ul className="space-y-4">
                <li>
                  <Link
                    to="/doctor/patients"
                    className="block py-2 px-4 text-indigo-600 font-semibold bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-all duration-200"
                  >
                    Bệnh nhân
                  </Link>
                </li>
                <li>
                  <Link
                    to="/doctor/schedule"
                    className="block py-2 px-4 text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all duration-200"
                  >
                    Lịch khám
                  </Link>
                </li>
                <li>
                  <Link
                    to="/doctor/analysis"
                    className="block py-2 px-4 text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all duration-200"
                  >
                    Phân tích
                  </Link>
                </li>
              </ul>
            </div>

            {/* Patients Content */}
            <div className="lg:w-3/4 bg-white rounded-xl shadow-lg p-8">
              <h2 className="text-2xl font-bold text-gray-800 mb-6">
                Danh sách bệnh nhân
              </h2>

              {/* Search Form */}
              <form
                onSubmit={handleSubmit(onSearch)}
                className="mb-8 flex flex-col sm:flex-row gap-4"
              >
                <input
                  type="text"
                  {...register("searchQuery")}
                  placeholder="Tìm kiếm theo tên hoặc email"
                  className="flex-1 p-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 hover:shadow-sm"
                />
                <button
                  type="submit"
                  className="py-3 px-6 text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 to-blue-500 rounded-lg hover:from-indigo-700 hover:to-blue-600 shadow-md transition-all duration-300 transform hover:scale-105"
                >
                  Tìm kiếm
                </button>
              </form>
              {errors.searchQuery && (
                <p className="text-red-500 text-sm mb-4">{errors.searchQuery.message}</p>
              )}

              {/* Patients Table */}
              {filteredPatients.length === 0 ? (
                <p className="text-gray-600 text-center">Không tìm thấy bệnh nhân.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full table-auto">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-800">
                          Tên
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-800">
                          Email
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-800">
                          Địa chỉ ví
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-800">
                          Lần khám cuối
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-800">
                          Hành động
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredPatients.map((patient) => (
                        <tr
                          key={patient.id}
                          className="border-b hover:bg-gray-50 transition-all duration-200"
                        >
                          <td className="px-4 py-3 text-gray-700">{patient.name}</td>
                          <td className="px-4 py-3 text-gray-700">{patient.email}</td>
                          <td className="px-4 py-3 text-gray-700 font-mono text-sm">
                            {patient.walletAddress}
                          </td>
                          <td className="px-4 py-3 text-gray-700">{patient.lastVisit}</td>
                          <td className="px-4 py-3">
                            <Link
                              to={`/doctor/patient/${patient.id}`}
                              className="text-indigo-600 hover:text-indigo-800 font-medium"
                            >
                              Xem chi tiết
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default DoctorPatients;