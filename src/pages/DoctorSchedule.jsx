import { zodResolver } from "@hookform/resolvers/zod"
import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import Sidebar from "../components/doctors/Sidebar"
import { useSmartContract } from "../hooks"

// Schema cho tạo lịch rảnh
const availabilitySchema = z.object({
  date: z.string().min(1, "Vui lòng chọn ngày"),
  startTime: z.string().min(1, "Vui lòng chọn giờ bắt đầu"),
  endTime: z.string().min(1, "Vui lòng chọn giờ kết thúc"),
})

function DoctorSchedule() {
  const {
    walletAddress,
    addAvailabilitySlot,
    fetchAvailabilitySlots,
    fetchAppointmentsByDoctor,
    updateAppointmentStatus,
    isLoading,
  } = useSmartContract()

  const [localAppointments, setLocalAppointments] = useState([])
  const [localSlots, setLocalSlots] = useState([])

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm({
    resolver: zodResolver(availabilitySchema),
    defaultValues: {
      date: "",
      startTime: "",
      endTime: "",
    },
  })

  useEffect(() => {
    const fetchData = async () => {
      if (walletAddress) {
        try {
          const [appointmentData, slotsData] = await Promise.all([
            fetchAppointmentsByDoctor(),
            fetchAvailabilitySlots(),
          ])
          setLocalAppointments(appointmentData)
          setLocalSlots(slotsData)
        } catch (error) {
          console.error("Lỗi tải dữ liệu:", error)
        }
      }
    }

    fetchData()
  }, [walletAddress, fetchAppointmentsByDoctor, fetchAvailabilitySlots])

  const onSubmit = async (data) => {
    try {
      await addAvailabilitySlot(data.date, data.startTime, data.endTime)
      reset()

      // Refresh slots
      const updatedSlots = await fetchAvailabilitySlots()
      setLocalSlots(updatedSlots)
    } catch (error) {
      console.error("Lỗi tạo lịch rảnh:", error)
    }
  }

  const handleAppointmentAction = async (appointmentId, status) => {
    try {
      await updateAppointmentStatus(appointmentId, status)
      const updatedAppointments = await fetchAppointmentsByDoctor()
      setLocalAppointments(updatedAppointments)
    } catch (error) {
      console.error("Lỗi cập nhật lịch:", error)
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
          <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-4">Quản lý lịch khám</h1>
          <p className="text-lg md:text-xl text-gray-200">Tạo lịch rảnh và quản lý các cuộc hẹn với bệnh nhân.</p>
        </div>
      </section>

      <section className="py-16">
        <div className="container mx-auto px-6">
          <div className="flex flex-col lg:flex-row gap-8">
            <Sidebar />

            <div className="lg:w-3/4">
              {/* Tạo lịch rảnh */}
              <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
                <h2 className="text-2xl font-bold text-gray-800 mb-6">Tạo lịch rảnh</h2>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-1">
                        Ngày
                      </label>
                      <input
                        type="date"
                        id="date"
                        {...register("date")}
                        min={new Date().toISOString().split("T")[0]}
                        className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 hover:shadow-sm"
                      />
                      {errors.date && <p className="text-red-500 text-sm mt-1">{errors.date.message}</p>}
                    </div>
                    <div>
                      <label htmlFor="startTime" className="block text-sm font-medium text-gray-700 mb-1">
                        Giờ bắt đầu
                      </label>
                      <input
                        type="time"
                        id="startTime"
                        {...register("startTime")}
                        className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 hover:shadow-sm"
                      />
                      {errors.startTime && <p className="text-red-500 text-sm mt-1">{errors.startTime.message}</p>}
                    </div>
                    <div>
                      <label htmlFor="endTime" className="block text-sm font-medium text-gray-700 mb-1">
                        Giờ kết thúc
                      </label>
                      <input
                        type="time"
                        id="endTime"
                        {...register("endTime")}
                        className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 hover:shadow-sm"
                      />
                      {errors.endTime && <p className="text-red-500 text-sm mt-1">{errors.endTime.message}</p>}
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 px-4 text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 to-blue-500 rounded-lg hover:from-indigo-700 hover:to-blue-600 shadow-md focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-all duration-300 transform hover:scale-105"
                  >
                    Tạo lịch rảnh
                  </button>
                </form>
              </div>

              {/* Danh sách lịch hẹn */}
              <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
                <h2 className="text-2xl font-bold text-gray-800 mb-6">Danh sách lịch hẹn</h2>
                {localAppointments.length === 0 ? (
                  <p className="text-gray-600 text-center">Chưa có lịch hẹn nào.</p>
                ) : (
                  <div className="space-y-4">
                    {localAppointments.map((appointment) => (
                      <div
                        key={appointment.appointmentId}
                        className="p-4 bg-gray-50 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200"
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <h3 className="text-lg font-semibold text-gray-800">{appointment.patientName}</h3>
                            <p className="text-gray-600">
                              📅 {appointment.date} | ⏰ {appointment.startTime} - {appointment.endTime}
                            </p>
                            <p className="text-gray-600">📝 {appointment.reason}</p>
                            <p className="text-sm text-gray-500">
                              Đặt lúc: {new Date(appointment.timestamp * 1000).toLocaleString()}
                            </p>
                          </div>
                          <div className="flex flex-col items-end space-y-2">
                            <span
                              className={`px-3 py-1 text-sm font-medium rounded-full ${getStatusColor(appointment.status)}`}
                            >
                              {getStatusText(appointment.status)}
                            </span>
                            {appointment.status === 0 && (
                              <div className="flex space-x-2">
                                <button
                                  onClick={() => handleAppointmentAction(appointment.appointmentId, 1)}
                                  className="px-3 py-1 text-sm font-medium text-white bg-green-600 rounded hover:bg-green-700"
                                >
                                  Chấp nhận
                                </button>
                                <button
                                  onClick={() => handleAppointmentAction(appointment.appointmentId, 2)}
                                  className="px-3 py-1 text-sm font-medium text-white bg-red-600 rounded hover:bg-red-700"
                                >
                                  Từ chối
                                </button>
                              </div>
                            )}
                            {appointment.status === 1 && (
                              <button
                                onClick={() => handleAppointmentAction(appointment.appointmentId, 3)}
                                className="px-3 py-1 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700"
                              >
                                Hoàn thành
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Lịch rảnh đã tạo */}
              <div className="bg-white rounded-xl shadow-lg p-8">
                <h2 className="text-2xl font-bold text-gray-800 mb-6">Lịch rảnh đã tạo</h2>
                {localSlots.length === 0 ? (
                  <p className="text-gray-600 text-center">Chưa tạo lịch rảnh nào.</p>
                ) : (
                  <div className="space-y-4">
                    {localSlots.map((slot, index) => (
                      <div key={index} className="p-4 bg-gray-50 rounded-lg">
                        <div className="flex justify-between items-center">
                          <div>
                            <h3 className="font-semibold text-gray-800">📅 {slot.date}</h3>
                            <p className="text-gray-600">
                              ⏰ {slot.startTime} - {slot.endTime}
                            </p>
                          </div>
                          <span
                            className={`px-3 py-1 text-sm font-medium rounded-full ${
                              slot.isBooked ? "bg-red-100 text-red-600" : "bg-green-100 text-green-600"
                            }`}
                          >
                            {slot.isBooked ? "Đã đặt" : "Còn trống"}
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

export default DoctorSchedule
