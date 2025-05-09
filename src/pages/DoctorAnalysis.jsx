import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link } from "react-router-dom";
import { useAuthStore } from "../stores/useAuthStore";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";

// Đăng ký các thành phần cần thiết cho Chart.js
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

// Tạo schema với Zod cho lọc dữ liệu
const filterSchema = z.object({
  patient: z.string().optional(),
  dateRange: z.string().optional(),
});

function DoctorAnalysis() {
  const { walletAddress, role } = useAuthStore();
  const [analysisData, setAnalysisData] = useState([
    // Mock data, thay bằng API thực tế
    {
      id: 1,
      patient: "Nguyễn Văn A",
      diagnosis: "Cao huyết áp",
      appointmentDate: "2025-05-10",
      testResult: "Huyết áp: 140/90 mmHg",
    },
    {
      id: 2,
      patient: "Trần Thị B",
      diagnosis: "Tiểu đường",
      appointmentDate: "2025-05-08",
      testResult: "Glucose: 180 mg/dL",
    },
  ]);

  const [filteredData, setFilteredData] = useState(analysisData);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(filterSchema),
    defaultValues: {
      patient: "",
      dateRange: "",
    },
  });

  const onFilter = (data) => {
    const { patient, dateRange } = data;
    let filtered = analysisData;

    if (patient) {
      filtered = filtered.filter((item) =>
        item.patient.toLowerCase().includes(patient.toLowerCase())
      );
    }

    if (dateRange) {
      // Giả sử dateRange là một ngày cụ thể, có thể mở rộng để xử lý khoảng ngày
      filtered = filtered.filter((item) => item.appointmentDate.includes(dateRange));
    }

    setFilteredData(filtered);
  };

  // Dữ liệu cho biểu đồ (số lượng cuộc hẹn theo bệnh nhân)
  const chartData = {
    labels: analysisData.map((item) => item.patient),
    datasets: [
      {
        label: "Số lượng cuộc hẹn",
        data: analysisData.map((_, index) => index + 2), // Mock data
        backgroundColor: "rgba(99, 102, 241, 0.6)",
        borderColor: "rgba(99, 102, 241, 1)",
        borderWidth: 1,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: "top",
      },
      title: {
        display: true,
        text: "Tần suất cuộc hẹn theo bệnh nhân",
      },
    },
  };

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
            Phân tích dữ liệu bệnh nhân để hỗ trợ chẩn đoán và điều trị hiệu quả.
          </p>
        </div>
      </section>

      {/* Analysis Content */}
      <section className="py-16">
        <div className="container mx-auto px-6">
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Sidebar Navigation */}
            <div className="lg:w-1/4 bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-6">Điều hướng</h2>
              <ul className="space-y-4">
                <li>
                  <Link
                    to="/doctorpatients"
                    className="block py-2 px-4 text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all duration-200"
                  >
                    Bệnh nhân
                  </Link>
                </li>
                <li>
                  <Link
                    to="/doctorschedule"
                    className="block py-2 px-4 text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all duration-200"
                  >
                    Lịch khám
                  </Link>
                </li>
                <li>
                  <Link
                    to="/doctoranalysis"
                    className="block py-2 px-4 text-indigo-600 font-semibold bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-all duration-200"
                  >
                    Phân tích
                  </Link>
                </li>
              </ul>
            </div>

            {/* Analysis Content */}
            <div className="lg:w-3/4">
              {/* Filter Form */}
              <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
                <h2 className="text-2xl font-bold text-gray-800 mb-6">
                  Lọc dữ liệu phân tích
                </h2>
                <form
                  onSubmit={handleSubmit(onFilter)}
                  className="flex flex-col sm:flex-row gap-4"
                >
                  <div className="flex-1">
                    <input
                      type="text"
                      {...register("patient")}
                      placeholder="Tìm kiếm theo tên bệnh nhân"
                      className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 hover:shadow-sm"
                    />
                    {errors.patient && (
                      <p className="text-red-500 text-sm mt-1">{errors.patient.message}</p>
                    )}
                  </div>
                  <div className="flex-1">
                    <input
                      type="date"
                      {...register("dateRange")}
                      className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 hover:shadow-sm"
                    />
                    {errors.dateRange && (
                      <p className="text-red-500 text-sm mt-1">{errors.dateRange.message}</p>
                    )}
                  </div>
                  <button
                    type="submit"
                    className="py-3 px-6 text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 to-blue-500 rounded-lg hover:from-indigo-700 hover:to-blue-600 shadow-md transition-all duration-300 transform hover:scale-105"
                  >
                    Lọc
                  </button>
                </form>
              </div>

              {/* Analysis Dashboard */}
              <div className="bg-white rounded-xl shadow-lg p-8">
                <h2 className="text-2xl font-bold text-gray-800 mb-6">
                  Tổng quan phân tích
                </h2>

                {/* Chart */}
                <div className="mb-8">
                  <Bar data={chartData} options={chartOptions} />
                </div>

                {/* Data Table */}
                <h3 className="text-xl font-semibold text-gray-800 mb-4">
                  Chi tiết dữ liệu bệnh nhân
                </h3>
                {filteredData.length === 0 ? (
                  <p className="text-gray-600 text-center">Không có dữ liệu để hiển thị.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full table-auto">
                      <thead>
                        <tr className="bg-gray-100">
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-800">
                            Bệnh nhân
                          </th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-800">
                            Chẩn đoán
                          </th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-800">
                            Ngày khám
                          </th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-800">
                            Kết quả xét nghiệm
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredData.map((item) => (
                          <tr
                            key={item.id}
                            className="border-b hover:bg-gray-50 transition-all duration-200"
                          >
                            <td className="px-4 py-3 text-gray-700">{item.patient}</td>
                            <td className="px-4 py-3 text-gray-700">{item.diagnosis}</td>
                            <td className="px-4 py-3 text-gray-700">{item.appointmentDate}</td>
                            <td className="px-4 py-3 text-gray-700">{item.testResult}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
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

export default DoctorAnalysis;