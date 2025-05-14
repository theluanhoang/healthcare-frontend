import { zodResolver } from "@hookform/resolvers/zod";
import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { Link } from "react-router-dom";
import { z } from "zod";
import { useAuthStore } from "../stores/useAuthStore";

// Tạo schema với Zod
const scheduleSchema = z.object({
  patient: z.string().min(1, "Vui lòng chọn bệnh nhân"),
  date: z.string().min(1, "Vui lòng chọn ngày"),
  time: z.string().min(1, "Vui lòng chọn giờ"),
  notes: z.string().optional(),
});

function DoctorSchedule() {
  const { walletAddress, role } = useAuthStore();
  const [appointments, setAppointments] = useState([
    // Mock data, thay bằng API thực tế
    {
      id: 1,
      patient: "Nguyễn Văn A",
      date: "2025-05-15",
      time: "10:00",
      notes: "Khám sức khỏe định kỳ",
      status: "Sắp tới",
    },
    {
      id: 2,
      patient: "Trần Thị B",
      date: "2025-05-10",
      time: "14:30",
      notes: "Tư vấn bệnh tim mạch",
      status: "Đã hoàn thành",
    },
  ]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm({
    resolver: zodResolver(scheduleSchema),
    defaultValues: {
      patient: "",
      date: "",
      time: "",
      notes: "",
    },
  });

  const onSubmit = (data) => {
    console.log("New appointment:", data);
    // TODO: Gửi dữ liệu đến backend hoặc blockchain
    setAppointments([
      ...appointments,
      { id: appointments.length + 1, ...data, status: "Sắp tới" },
    ]);
    reset();
  };

  return (
    <div className="w-full min-h-screen bg-gradient-to-br from-indigo-50 to-blue-50">
      {/* Hero Section */}
      <section
        className="relative min-h-[40vh] flex items-center justify-center bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: `linear-gradient(to bottom, rgba(0, 0, 0, 0.4), rgba(0, 0, 0, 0.4)), url('https://images.unsplash.com/photo-1584982751601-97dcc096659c')`,
        }}
      >
        <div className="container mx-auto px-6 text-center">
          <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-4">
            Lịch khám
          </h1>
          <p className="text-lg md:text-xl text-gray-200">
            Quản lý lịch khám của bạn một cách hiệu quả và an toàn.
          </p>
        </div>
      </section>

      {/* Schedule Content */}
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
                    className="block py-2 px-4 text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all duration-200"
                  >
                    Bệnh nhân
                  </Link>
                </li>
                <li>
                  <Link
                    to="/doctor/schedule"
                    className="block py-2 px-4 text-indigo-600 font-semibold bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-all duration-200"
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

            {/* Schedule Content */}
            <div className="lg:w-3/4">
              {/* Add Appointment Form */}
              <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
                <h2 className="text-2xl font-bold text-gray-800 mb-6">
                  Thêm lịch khám mới
                </h2>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
                  <div>
                    <label htmlFor="patient" className="block text-sm font-medium text-gray-700 mb-1">
                      Bệnh nhân
                    </label>
                    <select
                      id="patient"
                      {...register("patient")}
                      className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 hover:shadow-sm"
                    >
                      <option value="">Chọn bệnh nhân</option>
                      <option value="Nguyễn Văn A">Nguyễn Văn A</option>
                      <option value="Trần Thị B">Trần Thị B</option>
                      <option value="Lê Văn C">Lê Văn C</option>
                    </select>
                    {errors.patient && (
                      <p className="text-red-500 text-sm mt-1">{errors.patient.message}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-1">
                        Ngày
                      </label>
                      <input
                        type="date"
                        id="date"
                        {...register("date")}
                        className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 hover:shadow-sm"
                      />
                      {errors.date && (
                        <p className="text-red-500 text-sm mt-1">{errors.date.message}</p>
                      )}
                    </div>
                    <div>
                      <label htmlFor="time" className="block text-sm font-medium text-gray-700 mb-1">
                        Giờ
                      </label>
                      <input
                        type="time"
                        id="time"
                        {...register("time")}
                        className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 hover:shadow-sm"
                      />
                      {errors.time && (
                        <p className="text-red-500 text-sm mt-1">{errors.time.message}</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
                      Ghi chú (tùy chọn)
                    </label>
                    <textarea
                      id="notes"
                      {...register("notes")}
                      placeholder="Nhập ghi chú (nếu có)"
                      rows="4"
                      className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 hover:shadow-sm"
                    ></textarea>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 px-4 text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 to-blue-500 rounded-lg hover:from-indigo-700 hover:to-blue-600 shadow-md focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-all duration-300 transform hover:scale-105"
                  >
                    Thêm lịch khám
                  </button>
                </form>
              </div>

              {/* Appointment List */}
              <div className="bg-white rounded-xl shadow-lg p-8">
                <h2 className="text-2xl font-bold text-gray-800 mb-6">
                  Danh sách lịch khám
                </h2>
                {appointments.length === 0 ? (
                  <p className="text-gray-600 text-center">Chưa có lịch khám nào.</p>
                ) : (
                  <div className="space-y-4">
                    {appointments.map((appointment) => (
                      <div
                        key={appointment.id}
                        className="p-4 bg-gray-50 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200"
                      >
                        <div className="flex justify-between items-center">
                          <div>
                            <h3 className="text-lg font-semibold text-gray-800">{appointment.patient}</h3>
                            <p className="text-gray-600">
                              {appointment.date} | {appointment.time}
                            </p>
                            <p className="text-gray-600">{appointment.notes || "Không có ghi chú"}</p>
                          </div>
                          <span
                            className={`px-3 py-1 text-sm font-medium rounded-full ${
                              appointment.status === "Sắp tới"
                                ? "bg-indigo-100 text-indigo-600"
                                : "bg-green-100 text-green-600"
                            }`}
                          >
                            {appointment.status}
                          </span>
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

export default DoctorSchedule;