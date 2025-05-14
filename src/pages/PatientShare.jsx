import { zodResolver } from "@hookform/resolvers/zod";
import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { Link } from "react-router-dom";
import { z } from "zod";
import { useAuthStore } from "../stores/useAuthStore";

// Tạo schema với Zod
const shareSchema = z.object({
  recipient: z.string().min(1, "Vui lòng chọn người nhận"),
  recordType: z.string().min(1, "Vui lòng chọn loại hồ sơ"),
  notes: z.string().optional(),
});

function PatientShare() {
  const { walletAddress, role } = useAuthStore();
  const [sharedRecords, setSharedRecords] = useState([
    // Mock data, thay bằng API thực tế
    {
      id: 1,
      recipient: "BS. Trần Văn B",
      recordType: "Hồ sơ khám bệnh",
      date: "2025-05-10",
      status: "Đã chia sẻ",
    },
    {
      id: 2,
      recipient: "BS. Nguyễn Thị C",
      recordType: "Kết quả xét nghiệm",
      date: "2025-05-08",
      status: "Đã chia sẻ",
    },
  ]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm({
    resolver: zodResolver(shareSchema),
    defaultValues: {
      recipient: "",
      recordType: "",
      notes: "",
    },
  });

  const onSubmit = (data) => {
    console.log("Share request:", data);
    // TODO: Gửi yêu cầu chia sẻ đến backend hoặc blockchain
    setSharedRecords([
      ...sharedRecords,
      {
        id: sharedRecords.length + 1,
        ...data,
        date: new Date().toISOString().split("T")[0],
        status: "Đã chia sẻ",
      },
    ]);
    reset();
  };

  return (
    <div className="w-full min-h-screen bg-gradient-to-br from-indigo-50 to-blue-50">
      {/* Hero Section */}
      <section
        className="relative min-h-[40vh] flex items-center justify-center bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: `linear-gradient(to bottom, rgba(0, 0, 0, 0.4), rgba(0, 0, 0, 0.4)), url('https://images.unsplash.com/photo-1556742049-0cfed4f6a45d')`,
        }}
      >
        <div className="container mx-auto px-6 text-center">
          <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-4">
            Chia sẻ dữ liệu
          </h1>
          <p className="text-lg md:text-xl text-gray-200">
            Chia sẻ hồ sơ y tế của bạn một cách an toàn với bác sĩ hoặc cơ sở y tế.
          </p>
        </div>
      </section>

      {/* Share Content */}
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
                    to="/patient/appointment"
                    className="block py-2 px-4 text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all duration-200"
                  >
                    Lịch hẹn
                  </Link>
                </li>
                <li>
                  <Link
                    to="/patient/share"
                    className="block py-2 px-4 text-indigo-600 font-semibold bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-all duration-200"
                  >
                    Chia sẻ dữ liệu
                  </Link>
                </li>
              </ul>
            </div>

            {/* Share Content */}
            <div className="lg:w-3/4">
              {/* Share Form */}
              <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
                <h2 className="text-2xl font-bold text-gray-800 mb-6">
                  Chia sẻ hồ sơ y tế
                </h2>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
                  <div>
                    <label htmlFor="recipient" className="block text-sm font-medium text-gray-700 mb-1">
                      Người nhận
                    </label>
                    <select
                      id="recipient"
                      {...register("recipient")}
                      className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 hover:shadow-sm"
                    >
                      <option value="">Chọn người nhận</option>
                      <option value="BS. Trần Văn B">BS. Trần Văn B</option>
                      <option value="BS. Nguyễn Thị C">BS. Nguyễn Thị C</option>
                      <option value="Bệnh viện XYZ">Bệnh viện XYZ</option>
                    </select>
                    {errors.recipient && (
                      <p className="text-red-500 text-sm mt-1">{errors.recipient.message}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="recordType" className="block text-sm font-medium text-gray-700 mb-1">
                      Loại hồ sơ
                    </label>
                    <select
                      id="recordType"
                      {...register("recordType")}
                      className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 hover:shadow-sm"
                    >
                      <option value="">Chọn loại hồ sơ</option>
                      <option value="Hồ sơ khám bệnh">Hồ sơ khám bệnh</option>
                      <option value="Kết quả xét nghiệm">Kết quả xét nghiệm</option>
                      <option value="Đơn thuốc">Đơn thuốc</option>
                    </select>
                    {errors.recordType && (
                      <p className="text-red-500 text-sm mt-1">{errors.recordType.message}</p>
                    )}
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
                    Chia sẻ hồ sơ
                  </button>
                </form>
              </div>

              {/* Shared Records List */}
              <div className="bg-white rounded-xl shadow-lg p-8">
                <h2 className="text-2xl font-bold text-gray-800 mb-6">
                  Lịch sử chia sẻ
                </h2>
                {sharedRecords.length === 0 ? (
                  <p className="text-gray-600 text-center">Chưa có hồ sơ nào được chia sẻ.</p>
                ) : (
                  <div className="space-y-4">
                    {sharedRecords.map((record) => (
                      <div
                        key={record.id}
                        className="p-4 bg-gray-50 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200"
                      >
                        <div className="flex justify-between items-center">
                          <div>
                            <h3 className="text-lg font-semibold text-gray-800">{record.recipient}</h3>
                            <p className="text-gray-600">{record.recordType}</p>
                            <p className="text-gray-600">Ngày chia sẻ: {record.date}</p>
                          </div>
                          <span className="px-3 py-1 text-sm font-medium rounded-full bg-indigo-100 text-indigo-600">
                            {record.status}
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

export default PatientShare;