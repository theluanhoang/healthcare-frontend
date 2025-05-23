import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import { z } from "zod";
import { useSmartContract } from "../hooks";

const shareSchema = z.object({
  recipient: z.string().min(1, "Vui lòng chọn bác sĩ nhận"),
  medicalRecord: z.string().min(1, "Vui lòng chọn hồ sơ y tế"),
  recordType: z.string().min(1, "Vui lòng chọn loại hồ sơ"),
  notes: z.string().optional(),
});

function PatientShare() {
  const { doctors, fetchDoctors, shareMedicalRecord, getMedicalRecords, getPatientSharedRecords, getPendingRecords, approveMedicalRecord, contract, walletAddress } = useSmartContract();
  const [sharedRecords, setSharedRecords] = useState([]);
  const [medicalRecords, setMedicalRecords] = useState([]);
  const [pendingRecords, setPendingRecords] = useState([]);

  useEffect(() => {
    const init = async () => {
      try {
        await fetchDoctors();
        console.log("Doctors in PatientShare:", doctors);
        const records = await getMedicalRecords();
        setMedicalRecords(records);
        const shared = await getPatientSharedRecords();
        setSharedRecords(shared);
        const pending = await getPendingRecords();
        setPendingRecords(pending);
      } catch (error) {
        console.error("Lỗi khi lấy dữ liệu:", error);
        toast.error("Không thể lấy dữ liệu từ blockchain.");
      }
    };
    if (walletAddress && contract) init();
  }, [fetchDoctors, getMedicalRecords, getPatientSharedRecords, getPendingRecords, contract, walletAddress]);

  // Lắng nghe các sự kiện từ hợp đồng
  useEffect(() => {
    if (!contract) return;

    const verifiedFilter = contract.filters.DoctorVerified();
    const recordAddedFilter = contract.filters.MedicalRecordAdded(null, walletAddress, null);
    const recordApprovedFilter = contract.filters.MedicalRecordApproved(null, walletAddress);
    const recordSharedFilter = contract.filters.MedicalRecordShared(null, walletAddress, null);

    const verifiedListener = async () => {
      console.log("DoctorVerified event triggered");
      await fetchDoctors();
      console.log("Doctors after DoctorVerified:", doctors);
    };

    const recordAddedListener = async (recordIndex, patient, doctor, ipfsHash) => {
      console.log("MedicalRecordAdded:", { recordIndex, patient, doctor, ipfsHash });
      const pending = await getPendingRecords();
      setPendingRecords(pending);
      toast.info("Hồ sơ y tế mới được thêm, vui lòng phê duyệt!");
    };

    const recordApprovedListener = async (recordIndex) => {
      console.log("MedicalRecordApproved:", { recordIndex });
      const records = await getMedicalRecords();
      setMedicalRecords(records);
      const pending = await getPendingRecords();
      setPendingRecords(pending);
      toast.success("Hồ sơ y tế đã được phê duyệt!");
    };

    const recordSharedListener = async (recordIndex, patient, doctor, ipfsHash) => {
      console.log("MedicalRecordShared:", { recordIndex, patient, doctor, ipfsHash });
      const shared = await getPatientSharedRecords();
      setSharedRecords(shared);
      toast.success("Hồ sơ y tế đã được chia sẻ!");
    };

    contract.on(verifiedFilter, verifiedListener);
    contract.on(recordAddedFilter, recordAddedListener);
    contract.on(recordApprovedFilter, recordApprovedListener);
    contract.on(recordSharedFilter, recordSharedListener);

    return () => {
      contract.off(verifiedFilter, verifiedListener);
      contract.off(recordAddedFilter, recordAddedListener);
      contract.off(recordApprovedFilter, recordApprovedListener);
      contract.off(recordSharedFilter, recordSharedListener);
    };
  }, [contract, walletAddress, fetchDoctors, getMedicalRecords, getPendingRecords, getPatientSharedRecords, doctors]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
  } = useForm({
    resolver: zodResolver(shareSchema),
    defaultValues: {
      recipient: "",
      medicalRecord: "",
      recordType: "",
      notes: "",
    },
  });

  const onSubmit = async (data) => {
    try {
      const recordTypeEnum = {
        EXAMINATION_RECORD: 1,
        TEST_RESULT: 2,
        PRESCRIPTION: 3,
      }[data.recordType];

      await shareMedicalRecord(data.recipient, data.medicalRecord, recordTypeEnum, data.notes);
      reset();
    } catch (error) {
      console.error("Lỗi khi chia sẻ hồ sơ:", error);
      toast.error(error.message || "Không thể chia sẻ hồ sơ y tế.");
    }
  };

  const approveRecord = async (recordIndex) => {
    try {
      await approveMedicalRecord(recordIndex);
    } catch (error) {
      console.error("Lỗi phê duyệt hồ sơ:", error);
      toast.error(error.message || "Không thể phê duyệt hồ sơ y tế.");
    }
  };

  const recordTypeToString = (type) => {
    switch (Number(type)) {
      case 1: return "Hồ sơ khám bệnh";
      case 2: return "Kết quả xét nghiệm";
      case 3: return "Đơn thuốc";
      default: return "Không xác định";
    }
  };

  return (
    <div className="w-full min-h-screen bg-gradient-to-br from-indigo-50 to-blue-50">
      <section
        className="relative min-h-[40vh] flex items-center justify-center bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: `linear-gradient(to bottom, rgba(0, 0, 0, 0.4), rgba(0, 0, 0, 0.4)), url('https://images.unsplash.com/photo-1556742049-0cfed4f6a45d')`,
        }}
      >
        <div className="container mx-auto px-6 text-center">
          <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-4">Chia sẻ dữ liệu</h1>
          <p className="text-lg md:text-xl text-gray-200">
            Chia sẻ hồ sơ y tế của bạn một cách an toàn với bác sĩ hoặc cơ sở y tế.
          </p>
        </div>
      </section>

      <section className="py-16">
        <div className="container mx-auto px-6">
          <div className="flex flex-col lg:flex-row gap-8">
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

            <div className="lg:w-3/4">
              <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
                <h2 className="text-2xl font-bold text-gray-800 mb-6">Phê duyệt hồ sơ y tế</h2>
                {pendingRecords.length === 0 ? (
                  <p className="text-gray-600 text-center">Chưa có hồ sơ nào chờ phê duyệt.</p>
                ) : (
                  <div className="space-y-4">
                    {pendingRecords.map((record, index) => (
                      <div
                        key={index}
                        className="p-4 bg-gray-50 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200"
                      >
                        <div className="flex justify-between items-center">
                          <div>
                            <h3 className="text-lg font-semibold text-gray-800">
                              {record.doctorName || record.doctor}
                            </h3>
                            <p className="text-gray-600">{recordTypeToString(record.recordType)}</p>
                            <p className="text-gray-600">
                              Ngày đề xuất: {new Date(record.timestamp * 1000).toISOString().split("T")[0]}
                            </p>
                          </div>
                          <button
                            onClick={() => approveRecord(index)}
                            className="px-3 py-1 text-sm font-medium rounded-full bg-indigo-600 text-white hover:bg-indigo-700"
                          >
                            Phê duyệt
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
                <h2 className="text-2xl font-bold text-gray-800 mb-6">Chia sẻ hồ sơ y tế</h2>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
                  <div>
                    <label htmlFor="recipient" className="block text-sm font-medium text-gray-700 mb-1">
                      Bác sĩ nhận
                    </label>
                    <select
                      id="recipient"
                      {...register("recipient")}
                      className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 hover:shadow-sm"
                    >
                      <option value="">Chọn bác sĩ</option>
                      {doctors.length > 0 ? (
                        doctors
                          .filter((doctor) => doctor.isVerified)
                          .map((doctor) => (
                            <option key={doctor.address} value={doctor.address}>
                              {doctor.fullName} ({doctor.address.slice(0, 6)}...{doctor.address.slice(-4)})
                            </option>
                          ))
                      ) : (
                        <option value="" disabled>
                          Không có bác sĩ được xác minh
                        </option>
                      )}
                    </select>
                    {errors.recipient && (
                      <p className="text-red-500 text-sm mt-1">{errors.recipient.message}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="medicalRecord" className="block text-sm font-medium text-gray-700 mb-1">
                      Hồ sơ y tế
                    </label>
                    <select
                      id="medicalRecord"
                      {...register("medicalRecord")}
                      onChange={(e) => {
                        const selectedHash = e.target.value;
                        setValue("medicalRecord", selectedHash, { shouldValidate: true });
                        const record = medicalRecords.find((r) => r.ipfsHash === selectedHash);
                        if (record) {
                          const recordTypeMap = { 1: "EXAMINATION_RECORD", 2: "TEST_RESULT", 3: "PRESCRIPTION" };
                          setValue("recordType", recordTypeMap[record.recordType], { shouldValidate: true });
                        }
                      }}
                      className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 hover:shadow-sm"
                    >
                      <option value="">Chọn hồ sơ</option>
                      {medicalRecords.length > 0 ? (
                        medicalRecords
                          .filter((record) => record.isApproved)
                          .map((record) => (
                            <option key={record.ipfsHash} value={record.ipfsHash}>
                              {recordTypeToString(record.recordType)} (IPFS: {record.ipfsHash.slice(0, 6)}..., Bác sĩ: {record.doctorName})
                            </option>
                          ))
                      ) : (
                        <option value="" disabled>
                          Không có hồ sơ y tế được phê duyệt
                        </option>
                      )}
                    </select>
                    {errors.medicalRecord && (
                      <p className="text-red-500 text-sm mt-1">{errors.medicalRecord.message}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="recordType" className="block text-sm font-medium text-gray-700 mb-1">
                      Loại hồ sơ
                    </label>
                    <select
                      id="recordType"
                      {...register("recordType")}
                      disabled
                      className="w-full p-3 bg-gray-100 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 hover:shadow-sm"
                    >
                      <option value="">Chọn loại hồ sơ</option>
                      <option value="EXAMINATION_RECORD">Hồ sơ khám bệnh</option>
                      <option value="TEST_RESULT">Kết quả xét nghiệm</option>
                      <option value="PRESCRIPTION">Đơn thuốc</option>
                    </select>
                    {errors.recordType && (
                      <p className="text-red-500 text-sm mt-1">{errors.recordType.message}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
                      Ghi chú (Tùy chọn)
                    </label>
                    <textarea
                      id="notes"
                      {...register("notes")}
                      placeholder="Nhập ghi chú bổ sung (nếu có)"
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

              <div className="bg-white rounded-xl shadow-lg p-8">
                <h2 className="text-2xl font-bold text-gray-800 mb-6">Lịch sử chia sẻ</h2>
                {sharedRecords.length === 0 ? (
                  <p className="text-gray-600 text-center">Chưa có hồ sơ nào được chia sẻ.</p>
                ) : (
                  <div className="space-y-4">
                    {sharedRecords.map((record, index) => (
                      <div
                        key={index}
                        className="p-4 bg-gray-50 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200"
                      >
                        <div className="flex justify-between items-center">
                          <div>
                            <h3 className="text-lg font-semibold text-gray-800">
                              {record.doctorName || record.doctor}
                            </h3>
                            <p className="text-gray-600">{recordTypeToString(record.recordType)}</p>
                            <p className="text-gray-600">
                              Ngày chia sẻ: {new Date(record.timestamp * 1000).toISOString().split("T")[0]}
                            </p>
                            {record.notes && <p className="text-gray-600">Ghi chú: {record.notes}</p>}
                          </div>
                          <span className="px-3 py-1 text-sm font-medium rounded-full bg-indigo-100 text-indigo-600">
                            Đã chia sẻ
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