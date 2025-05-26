"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { Link } from "react-router-dom"
import { z } from "zod"
import { useSmartContract } from "../hooks"

// Schema cho đặt lịch
const appointmentSchema = z.object({
  doctor: z.string().min(1, "Vui lòng chọn bác sĩ"),
  slotId: z.string().min(1, "Vui lòng chọn slot thời gian"),
  reason: z.string().min(10, "Lý do phải có ít nhất 10 ký tự").nonempty("Lý do không được để trống"),
})

function PatientAppointments() {
  const {
    walletAddress,
    doctors,
    fetchDoctors,
    fetchAvailabilitySlots,
    bookAppointment,
    fetchAppointmentsByPatient,
    isLoading,
  } = useSmartContract()

  const [localAppointments, setLocalAppointments] = useState([])
  const [availableSlots, setAvailableSlots] = useState([])
  const [selectedDoctor, setSelectedDoctor] = useState("")

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue,
  } = useForm({
    resolver: zodResolver(appointmentSchema),
    defaultValues: {
      doctor: "",
      slotId: "",
      reason: "",
    },
  })

  const watchedDoctor = watch("doctor")

  useEffect(() => {
    const fetchData = async () => {
      if (walletAddress) {
        try {
          await fetchDoctors()
          const appointmentData = await fetchAppointmentsByPatient()
          setLocalAppointments(appointmentData)
        } catch (error) {
          console.error("Lỗi tải dữ liệu:", error)
        }
      }
    }

    fetchData()
  }, [walletAddress, fetchDoctors, fetchAppointmentsByPatient])

  // Lấy availability slots khi chọn bác sĩ
  useEffect(() => {
    const getSlots = async () => {
      if (watchedDoctor) {
        try {
          const slots = await fetchAvailabilitySlots(watchedDoctor)
          // Lọc ra những slot chưa được đặt
          const freeSlots = slots.filter((slot) => !slot.isBooked)
          setAvailableSlots(freeSlots)
        } catch (error) {
          console.error("Lỗi lấy lịch rảnh:", error)
          setAvailableSlots([])
        }
      } else {
        setAvailableSlots([])
      }
    }

    getSlots()
  }, [watchedDoctor, fetchAvailabilitySlots])

  const onSubmit = async (data) => {
    try {
      await bookAppointment(data.doctor, Number.parseInt(data.slotId), data.reason)
      reset()
      setAvailableSlots([])

      // Refresh appointments
      const updatedAppointments = await fetchAppointmentsByPatient()
      setLocalAppointments(updatedAppointments)
    } catch (error) {
      console.error("Lỗi đặt lịch:", error)
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 0:
        return "bg-yellow-100 text-yellow-800" // Pending
      case 1:
        return "bg-green-100 text-green-800" // Approved
      case 2:
        return "bg-red-100 text-red-800" // Rejected
      case 3:
        return "bg-blue-100 text-blue-800" // Completed
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getStatusText = (status) => {
    switch (status) {
      case 0:
        return "Chờ xác nhận"
      case 1:
        return "Đã xác nhận"
      case 2:
        return "Đã từ chối"
      case 3:
        return "Đã hoàn thành"
      default:
        return "Không xác định"
    }
  }

  if (isLoading) {
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
          backgroundImage: `linear-gradient(to bottom, rgba(0, 0, 0, 0.4), rgba(0, 0, 0, 0.4)), url('https://images.unsplash.com/photo-1584982751601-97dcc096659c')`,
        }}
      >
        <div className="container mx-auto px-6 text-center">
          <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-4">Lịch hẹn khám bệnh</h1>
          <p className="text-lg md:text-xl text-gray-200">Đặt lịch khám với bác sĩ một cách dễ dàng và thuận tiện.</p>
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
                    className="block py-2 px-4 text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all duration-200"
                  >
                    Hồ sơ y tế
                  </Link>
                </li>
                <li>
                  <Link
                    to="/patient/appointment"
                    className="block py-2 px-4 text-indigo-600 font-semibold bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-all duration-200"
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
              {/* Đặt lịch hẹn mới */}
              <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
                <h2 className="text-2xl font-bold text-gray-800 mb-6">Đặt lịch hẹn mới</h2>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
                  <div>
                    <label htmlFor="doctor" className="block text-sm font-medium text-gray-700 mb-1">
                      Bác sĩ
                    </label>
                    <select
                      id="doctor"
                      {...register("doctor")}
                      onChange={(e) => {
                        setValue("doctor", e.target.value)
                        setValue("slotId", "")
                        setSelectedDoctor(e.target.value)
                      }}
                      className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 hover:shadow-sm"
                    >
                      <option value="">Chọn bác sĩ</option>
                      {doctors
                        .filter((doctor) => doctor.isVerified)
                        .map((doctor) => (
                          <option key={doctor.address} value={doctor.address}>
                            {doctor.fullName}
                          </option>
                        ))}
                    </select>
                    {errors.doctor && <p className="text-red-500 text-sm mt-1">{errors.doctor.message}</p>}
                  </div>

                  {watchedDoctor && (
                    <div>
                      <label htmlFor="slotId" className="block text-sm font-medium text-gray-700 mb-1">
                        Thời gian khám
                      </label>
                      <select
                        id="slotId"
                        {...register("slotId")}
                        className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 hover:shadow-sm"
                      >
                        <option value="">Chọn thời gian</option>
                        {availableSlots.map((slot) => (
                          <option key={slot.slotId} value={slot.slotId}>
                            {slot.date} | {slot.startTime} - {slot.endTime}
                          </option>
                        ))}
                      </select>
                      {errors.slotId && <p className="text-red-500 text-sm mt-1">{errors.slotId.message}</p>}
                      {availableSlots.length === 0 && watchedDoctor && (
                        <p className="text-yellow-600 text-sm mt-1">Bác sĩ này chưa có lịch rảnh nào</p>
                      )}
                    </div>
                  )}

                  <div>
                    <label htmlFor="reason" className="block text-sm font-medium text-gray-700 mb-1">
                      Lý do khám
                    </label>
                    <textarea
                      id="reason"
                      {...register("reason")}
                      placeholder="Nhập lý do khám bệnh"
                      rows="4"
                      className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 hover:shadow-sm"
                    ></textarea>
                    {errors.reason && <p className="text-red-500 text-sm mt-1">{errors.reason.message}</p>}
                  </div>

                  <button
                    type="submit"
                    disabled={!watchedDoctor || availableSlots.length === 0}
                    className="w-full py-3 px-4 text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 to-blue-500 rounded-lg hover:from-indigo-700 hover:to-blue-600 shadow-md focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                  >
                    Đặt lịch hẹn
                  </button>
                </form>
              </div>

              {/* Danh sách lịch hẹn */}
              <div className="bg-white rounded-xl shadow-lg p-8">
                <h2 className="text-2xl font-bold text-gray-800 mb-6">Lịch sử lịch hẹn</h2>
                {localAppointments.length === 0 ? (
                  <p className="text-gray-600 text-center">Chưa có lịch hẹn nào.</p>
                ) : (
                  <div className="space-y-4">
                    {localAppointments
                      .sort((a, b) => b.timestamp - a.timestamp)
                      .map((appointment) => (
                        <div
                          key={appointment.appointmentId}
                          className="p-4 bg-gray-50 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200"
                        >
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <h3 className="text-lg font-semibold text-gray-800">{appointment.doctorName}</h3>
                              <p className="text-gray-600">
                                📅 {appointment.date} | ⏰ {appointment.startTime} - {appointment.endTime}
                              </p>
                              <p className="text-gray-600">📝 {appointment.reason}</p>
                              <p className="text-sm text-gray-500">
                                Đặt lúc: {new Date(appointment.timestamp * 1000).toLocaleString("vi-VN")}
                              </p>
                            </div>
                            <span
                              className={`px-3 py-1 text-sm font-medium rounded-full ${getStatusColor(appointment.status)}`}
                            >
                              {getStatusText(appointment.status)}
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
  )
}

export default PatientAppointments
