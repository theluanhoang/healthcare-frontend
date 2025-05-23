import { zodResolver } from "@hookform/resolvers/zod";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import { z } from "zod";
import { useSmartContract } from "../hooks";
import useIpfs from "../hooks/useIPFS";

const recordSchema = z.object({
  patient: z.string().min(1, "Vui lòng chọn bệnh nhân"),
  visitDate: z.string().min(1, "Vui lòng chọn ngày khám"),
  includeExamination: z.boolean(),
  includeTestResult: z.boolean(),
  includePrescription: z.boolean(),
  examination: z
    .object({
      symptoms: z.string().min(1, "Vui lòng nhập triệu chứng"),
      diagnosis: z.string().min(1, "Vui lòng nhập chẩn đoán"),
      notes: z.string().optional(),
    })
    .optional(),
  testResult: z
    .object({
      testType: z.string().min(1, "Vui lòng nhập loại xét nghiệm"),
      results: z.string().min(1, "Vui lòng nhập kết quả"),
      comments: z.string().optional(),
    })
    .optional(),
  prescription: z
    .object({
      medications: z
        .array(
          z.object({
            name: z.string().min(1, "Vui lòng nhập tên thuốc"),
            dosage: z.string().min(1, "Vui lòng nhập liều lượng"),
            instructions: z.string().min(1, "Vui lòng nhập hướng dẫn"),
          })
        )
        .min(1, "Vui lòng thêm ít nhất một loại thuốc"),
      notes: z.string().optional(),
    })
    .optional(),
}).superRefine((data, ctx) => {
  // Validate examination if selected
  if (data.includeExamination) {
    if (!data.examination || !data.examination.symptoms || !data.examination.diagnosis) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Vui lòng điền đầy đủ triệu chứng và chẩn đoán",
        path: ["examination"],
      });
    }
  }

  // Validate testResult only if includeTestResult is true
  if (data.includeTestResult) {
    if (!data.testResult || !data.testResult.testType || !data.testResult.results) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Vui lòng điền đầy đủ loại xét nghiệm và kết quả",
        path: ["testResult"],
      });
    }
  }

  // Validate prescription only if includePrescription is true
  if (data.includePrescription) {
    if (!data.prescription || !data.prescription.medications || !data.prescription.medications.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Vui lòng thêm ít nhất một loại thuốc",
        path: ["prescription.medications"],
      });
    } else {
      data.prescription.medications.forEach((med, index) => {
        if (!med.name) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Vui lòng nhập tên thuốc",
            path: [`prescription.medications.${index}.name`],
          });
        }
        if (!med.dosage) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Vui lòng nhập liều lượng",
            path: [`prescription.medications.${index}.dosage`],
          });
        }
        if (!med.instructions) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Vui lòng nhập hướng dẫn",
            path: [`prescription.medications.${index}.instructions`],
          });
        }
      });
    }
  }

  // Require at least one record type
  if (!data.includeExamination && !data.includeTestResult && !data.includePrescription) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Vui lòng chọn ít nhất một loại hồ sơ (khám bệnh, xét nghiệm, hoặc đơn thuốc)",
      path: ["includeExamination"],
    });
  }
});

function DoctorAddRecord() {
  const {
    patients,
    fetchPatients,
    pendingDoctorRegistrations,
    fetchDoctors,
    addMedicalRecord,
    voteForDoctor,
    contract,
    walletAddress,
  } = useSmartContract();
  const { ipfs, uploadJson } = useIpfs();
  const [isVerifiedDoctor, setIsVerifiedDoctor] = useState(false);
  const [uploading, setUploading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    watch,
    control,
  } = useForm({
    resolver: zodResolver(recordSchema),
    defaultValues: {
      patient: "",
      visitDate: "",
      includeExamination: false,
      includeTestResult: false,
      includePrescription: false,
      examination: { symptoms: "", diagnosis: "", notes: "" },
      testResult: { testType: "", results: "", comments: "" },
      prescription: { medications: [], notes: "" },
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "prescription.medications",
  });

  const [includeExamination, includeTestResult, includePrescription] = watch([
    "includeExamination",
    "includeTestResult",
    "includePrescription",
  ]);

  // Memoized init function
  const init = useCallback(async () => {
    try {
      console.log("Running init...");
      await Promise.all([fetchPatients(), fetchDoctors()]);
      console.log("Patients in DoctorAddRecord:", patients);
      console.log("Pending doctors:", pendingDoctorRegistrations);
      if (contract && walletAddress) {
        const user = await contract.getUser(walletAddress);
        setIsVerifiedDoctor(user[1] && user[0].toString() === "2");
      }
    } catch (error) {
      console.error("Lỗi khi lấy dữ liệu:", error);
      toast.error("Không thể lấy dữ liệu từ blockchain.");
    }
  }, [fetchPatients, fetchDoctors, contract, walletAddress]);

  useEffect(() => {
    if (walletAddress && contract) {
      init();
    }
  }, [walletAddress, contract, init]);

  // Memoized event handlers
  const userListener = useCallback(
    async (userAddress, role, fullName) => {
      console.log("UserRegistered event:", { userAddress, role: role.toString(), fullName });
      if (role.toString() === "1") {
        await fetchPatients();
        toast.info(`Bệnh nhân mới đăng ký: ${fullName}`);
      } else if (role.toString() === "2") {
        await fetchDoctors();
        toast.info(`Bác sĩ mới đăng ký: ${fullName}. Vui lòng xác minh!`);
      }
    },
    [fetchPatients, fetchDoctors]
  );

  const verifiedListener = useCallback(
    async (doctorAddress, fullName) => {
      console.log("DoctorVerified event:", { doctorAddress, fullName });
      await fetchDoctors();
      toast.success(`Bác sĩ ${fullName} đã được xác minh!`);
    },
    [fetchDoctors]
  );

  const recordAddedListener = useCallback(
    async (recordIndex, patient, doctor, ipfsHash) => {
      console.log("MedicalRecordAdded:", { recordIndex, patient, doctor, ipfsHash });
      toast.success(`Hồ sơ y tế ${recordIndex} đã được thêm, chờ bệnh nhân phê duyệt!`);
    },
    []
  );

  useEffect(() => {
    if (!contract || !isVerifiedDoctor) return;

    const userFilter = contract.filters.UserRegistered(null, null);
    const verifiedFilter = contract.filters.DoctorVerified(null);
    const recordAddedFilter = contract.filters.MedicalRecordAdded(null, null, walletAddress);

    contract.on(userFilter, userListener);
    contract.on(verifiedFilter, verifiedListener);
    contract.on(recordAddedFilter, recordAddedListener);

    return () => {
      contract.off(userFilter, userListener);
      contract.off(verifiedFilter, verifiedListener);
      contract.off(recordAddedFilter, recordAddedListener);
    };
  }, [contract, isVerifiedDoctor, walletAddress, userListener, verifiedListener, recordAddedListener]);

  const onSubmit = useCallback(
    async (data) => {
      console.log("Form submitted with data:", data);
      if (!ipfs) {
        toast.error("IPFS client chưa sẵn sàng.");
        return;
      }

      setUploading(true);
      try {
        const records = [];

        if (data.includeExamination) {
          const recordData = {
            patientAddress: data.patient,
            recordType: "EXAMINATION_RECORD",
            createdBy: walletAddress,
            createdAt: new Date().toISOString(),
            visitDate: data.visitDate,
            details: data.examination,
          };
          records.push({ data: recordData, type: 1 });
        }

        if (data.includeTestResult) {
          const recordData = {
            patientAddress: data.patient,
            recordType: "TEST_RESULT",
            createdBy: walletAddress,
            createdAt: new Date().toISOString(),
            visitDate: data.visitDate,
            details: data.testResult,
          };
          records.push({ data: recordData, type: 2 });
        }

        if (data.includePrescription) {
          const recordData = {
            patientAddress: data.patient,
            recordType: "PRESCRIPTION",
            createdBy: walletAddress,
            createdAt: new Date().toISOString(),
            visitDate: data.visitDate,
            details: data.prescription,
          };
          records.push({ data: recordData, type: 3 });
        }

        for (const record of records) {
          const jsonString = JSON.stringify(record.data);
          console.log(`JSON data for ${record.data.recordType}:`, jsonString);
          const cid = await uploadJson(jsonString);
          console.log(`IPFS CID (${record.data.recordType}):`, cid);

          await addMedicalRecord(data.patient, cid, record.type);
          toast.success(`Hồ sơ ${record.data.recordType} đã được thêm!`);
        }

        reset();
        toast.success("Tất cả hồ sơ đã được thêm thành công!");
      } catch (error) {
        console.error("Lỗi khi thêm hồ sơ:", error);
        toast.error(error.message || "Không thể thêm hồ sơ y tế.");
      } finally {
        setUploading(false);
      }
    },
    [ipfs, uploadJson, walletAddress, addMedicalRecord, reset]
  );

  const verifyDoctor = useCallback(
    async (doctorAddress) => {
      try {
        await voteForDoctor(doctorAddress);
      } catch (error) {
        console.error("Lỗi xác minh bác sĩ:", error);
        toast.error(error.message || "Không thể xác minh bác sĩ.");
      }
    },
    [voteForDoctor]
  );

  // Debug IPFS, uploading, and form state
  useEffect(() => {
    console.log("IPFS:", ipfs);
    console.log("Uploading:", uploading);
    console.log("Is submitting:", isSubmitting);
    console.log("Form errors:", errors);
  }, [ipfs, uploading, isSubmitting, errors]);

  // Memoized patients list
  const patientsList = useMemo(() => patients, [patients]);

  return (
    <div className="w-full min-h-screen bg-gradient-to-br from-indigo-50 to-blue-50">
      <section
        className="relative min-h-[40vh] flex items-center justify-center bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: `linear-gradient(to bottom, rgba(0, 0, 0, 0.4), rgba(0, 0, 0, 0.4)), url('https://images.unsplash.com/photo-1556742049-0cfed4f6a45d')`,
        }}
      >
        <div className="container mx-auto px-6 text-center">
          <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-4">Quản lý hồ sơ y tế</h1>
          <p className="text-lg md:text-xl text-gray-200">
            Thêm hồ sơ y tế cho bệnh nhân và xác minh bác sĩ mới.
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
                    to="/doctor/profile"
                    className="block py-2 px-4 text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all duration-200"
                  >
                    Hồ sơ
                  </Link>
                </li>
                <li>
                  <Link
                    to="/doctor/add-record"
                    className="block py-2 px-4 text-indigo-600 font-semibold bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-all duration-200"
                  >
                    Thêm hồ sơ
                  </Link>
                </li>
                <li>
                  <Link
                    to="/doctor/records"
                    className="block py-2 px-4 text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all duration-200"
                  >
                    Hồ sơ y tế
                  </Link>
                </li>
              </ul>
            </div>

            <div className="lg:w-3/4">
              <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
                <h2 className="text-2xl font-bold text-gray-800 mb-6">Xác minh bác sĩ mới</h2>
                {pendingDoctorRegistrations.length === 0 ? (
                  <p className="text-gray-600 text-center">Chưa có bác sĩ nào chờ xác minh.</p>
                ) : (
                  <div className="space-y-4">
                    {pendingDoctorRegistrations.map((doctor) => (
                      <div
                        key={doctor.address}
                        className="p-4 bg-gray-50 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200"
                      >
                        <div className="flex justify-between items-center">
                          <div>
                            <h3 className="text-lg font-semibold text-gray-800">{doctor.fullName}</h3>
                            <p className="text-gray-600">
                              Địa chỉ: {doctor.address.slice(0, 6)}...{doctor.address.slice(-4)}
                            </p>
                            <p className="text-gray-600">
                              Ngày đăng ký:{" "}
                              {doctor.timestamp && !isNaN(doctor.timestamp)
                                ? new Date(doctor.timestamp).toISOString().split("T")[0]
                                : "Không xác định"}
                            </p>
                          </div>
                          <button
                            onClick={() => verifyDoctor(doctor.address)}
                            className="px-3 py-1 text-sm font-medium rounded-full bg-indigo-600 text-white hover:bg-indigo-700"
                          >
                            Xác minh
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
                <h2 className="text-2xl font-bold text-gray-800 mb-6">Thêm hồ sơ y tế</h2>
                <form
                  onSubmit={(e) => {
                    console.log("Form submit event triggered");
                    handleSubmit((data) => {
                      console.log("Form submitted with data:", data);
                      onSubmit(data);
                    })(e);
                  }}
                  className="space-y-6"
                  noValidate
                >
                  {Object.keys(errors).length > 0 && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                      <p>Vui lòng kiểm tra và điền đầy đủ các trường bắt buộc:</p>
                      <ul className="list-disc ml-5">
                        {errors.patient && <li>{errors.patient.message}</li>}
                        {errors.visitDate && <li>{errors.visitDate.message}</li>}
                        {errors.includeExamination && (
                          <li>{errors.includeExamination.message}</li>
                        )}
                        {errors.examination && (
                          <li>Lỗi hồ sơ khám bệnh: Vui lòng điền triệu chứng và chẩn đoán</li>
                        )}
                        {errors.testResult && (
                          <li>Lỗi kết quả xét nghiệm: Vui lòng điền loại xét nghiệm và kết quả</li>
                        )}
                        {errors.prescription?.medications && (
                          <li>Lỗi đơn thuốc: Vui lòng điền đầy đủ thông tin thuốc</li>
                        )}
                      </ul>
                    </div>
                  )}

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
                      {patientsList.length > 0 ? (
                        patientsList.map((patient) => (
                          <option key={patient.address} value={patient.address}>
                            {patient.fullName} ({patient.address.slice(0, 6)}...{patient.address.slice(-4)})
                          </option>
                        ))
                      ) : (
                        <option value="" disabled>
                          Không có bệnh nhân
                        </option>
                      )}
                    </select>
                    {errors.patient && (
                      <p className="text-red-500 text-sm mt-1">{errors.patient.message}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="visitDate" className="block text-sm font-medium text-gray-700 mb-1">
                      Ngày khám
                    </label>
                    <input
                      id="visitDate"
                      type="date"
                      {...register("visitDate")}
                      className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 hover:shadow-sm"
                    />
                    {errors.visitDate && (
                      <p className="text-red-500 text-sm mt-1">{errors.visitDate.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Chọn loại hồ sơ</label>
                    <div className="flex items-center">
                      <input
                        id="includeExamination"
                        type="checkbox"
                        {...register("includeExamination")}
                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                      />
                      <label htmlFor="includeExamination" className="ml-2 text-sm text-gray-700">
                        Hồ sơ khám bệnh
                      </label>
                    </div>
                    <div className="flex items-center">
                      <input
                        id="includeTestResult"
                        type="checkbox"
                        {...register("includeTestResult")}
                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                      />
                      <label htmlFor="includeTestResult" className="ml-2 text-sm text-gray-700">
                        Kết quả xét nghiệm
                      </label>
                    </div>
                    <div className="flex items-center">
                      <input
                        id="includePrescription"
                        type="checkbox"
                        {...register("includePrescription")}
                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                      />
                      <label htmlFor="includePrescription" className="ml-2 text-sm text-gray-700">
                        Đơn thuốc
                      </label>
                    </div>
                    {errors.includeExamination && (
                      <p className="text-red-500 text-sm mt-1">{errors.includeExamination.message}</p>
                    )}
                  </div>

                  {includeExamination && (
                    <div className="space-y-4 border-t pt-4">
                      <h3 className="text-lg font-semibold text-gray-800">Hồ sơ khám bệnh</h3>
                      <div>
                        <label htmlFor="examination.symptoms" className="block text-sm font-medium text-gray-700 mb-1">
                          Triệu chứng
                        </label>
                        <textarea
                          id="examination.symptoms"
                          {...register("examination.symptoms")}
                          placeholder="Mô tả triệu chứng của bệnh nhân"
                          rows={4}
                          className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 hover:shadow-sm"
                        />
                        {errors.examination?.symptoms && (
                          <p className="text-red-500 text-sm mt-1">{errors.examination.symptoms.message}</p>
                        )}
                      </div>
                      <div>
                        <label htmlFor="examination.diagnosis" className="block text-sm font-medium text-gray-700 mb-1">
                          Chẩn đoán
                        </label>
                        <textarea
                          id="examination.diagnosis"
                          {...register("examination.diagnosis")}
                          placeholder="Kết luận chẩn đoán"
                          rows={4}
                          className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 hover:shadow-sm"
                        />
                        {errors.examination?.diagnosis && (
                          <p className="text-red-500 text-sm mt-1">{errors.examination.diagnosis.message}</p>
                        )}
                      </div>
                      <div>
                        <label htmlFor="examination.notes" className="block text-sm font-medium text-gray-700 mb-1">
                          Ghi chú
                        </label>
                        <textarea
                          id="examination.notes"
                          {...register("examination.notes")}
                          placeholder="Thông tin bổ sung (nếu có)"
                          rows={3}
                          className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 hover:shadow-sm"
                        />
                      </div>
                    </div>
                  )}

                  {includeTestResult && (
                    <div className="space-y-4 border-t pt-4">
                      <h3 className="text-lg font-semibold text-gray-800">Kết quả xét nghiệm</h3>
                      <div>
                        <label htmlFor="testResult.testType" className="block text-sm font-medium text-gray-700 mb-1">
                          Loại xét nghiệm
                        </label>
                        <input
                          id="testResult.testType"
                          type="text"
                          {...register("testResult.testType")}
                          placeholder="Ví dụ: Xét nghiệm máu, X-quang"
                          className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 hover:shadow-sm"
                        />
                        {errors.testResult?.testType && (
                          <p className="text-red-500 text-sm mt-1">{errors.testResult.testType.message}</p>
                        )}
                      </div>
                      <div>
                        <label htmlFor="testResult.results" className="block text-sm font-medium text-gray-700 mb-1">
                          Kết quả xét nghiệm
                        </label>
                        <textarea
                          id="testResult.results"
                          {...register("testResult.results")}
                          placeholder="Chi tiết kết quả xét nghiệm"
                          rows={4}
                          className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 hover:shadow-sm"
                        />
                        {errors.testResult?.results && (
                          <p className="text-red-500 text-sm mt-1">{errors.testResult.results.message}</p>
                        )}
                      </div>
                      <div>
                        <label htmlFor="testResult.comments" className="block text-sm font-medium text-gray-700 mb-1">
                          Nhận xét
                        </label>
                        <textarea
                          id="testResult.comments"
                          {...register("testResult.comments")}
                          placeholder="Nhận xét của bác sĩ (nếu có)"
                          rows={3}
                          className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 hover:shadow-sm"
                        />
                      </div>
                    </div>
                  )}

                  {includePrescription && (
                    <div className="space-y-4 border-t pt-4">
                      <h3 className="text-lg font-semibold text-gray-800">Đơn thuốc</h3>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Danh sách thuốc</label>
                        {fields.length === 0 && (
                          <p className="text-gray-500 text-sm">Chưa có thuốc nào. Nhấn "Thêm thuốc" để bắt đầu.</p>
                        )}
                        {fields.map((field, index) => (
                          <div key={field.id} className="space-y-2 mb-4 p-4 bg-gray-50 rounded-lg">
                            <div>
                              <label
                                htmlFor={`prescription.medications.${index}.name`}
                                className="block text-sm font-medium text-gray-700 mb-1"
                              >
                                Tên thuốc
                              </label>
                              <input
                                id={`prescription.medications.${index}.name`}
                                {...register(`prescription.medications.${index}.name`)}
                                placeholder="Ví dụ: Paracetamol"
                                className="w-full p-3 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 hover:shadow-sm"
                              />
                              {errors.prescription?.medications?.[index]?.name && (
                                <p className="text-red-500 text-sm mt-1">
                                  {errors.prescription.medications[index].name.message}
                                </p>
                              )}
                            </div>
                            <div>
                              <label
                                htmlFor={`prescription.medications.${index}.dosage`}
                                className="block text-sm font-medium text-gray-700 mb-1"
                              >
                                Liều lượng
                              </label>
                              <input
                                id={`prescription.medications.${index}.dosage`}
                                {...register(`prescription.medications.${index}.dosage`)}
                                placeholder="Ví dụ: 500mg, 2 viên/ngày"
                                className="w-full p-3 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 hover:shadow-sm"
                              />
                              {errors.prescription?.medications?.[index]?.dosage && (
                                <p className="text-red-500 text-sm mt-1">
                                  {errors.prescription.medications[index].dosage.message}
                                </p>
                              )}
                            </div>
                            <div>
                              <label
                                htmlFor={`prescription.medications.${index}.instructions`}
                                className="block text-sm font-medium text-gray-700 mb-1"
                              >
                                Hướng dẫn sử dụng
                              </label>
                              <input
                                id={`prescription.medications.${index}.instructions`}
                                {...register(`prescription.medications.${index}.instructions`)}
                                placeholder="Ví dụ: Uống sau ăn"
                                className="w-full p-3 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 hover:shadow-sm"
                              />
                              {errors.prescription?.medications?.[index]?.instructions && (
                                <p className="text-red-500 text-sm mt-1">
                                  {errors.prescription.medications[index].instructions.message}
                                </p>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={() => remove(index)}
                              className="text-red-500 text-sm hover:text-red-700"
                            >
                              Xóa thuốc
                            </button>
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={() => append({ name: "", dosage: "", instructions: "" })}
                          className="text-indigo-600 text-sm hover:text-indigo-800"
                        >
                          Thêm thuốc
                        </button>
                        {errors.prescription?.medications && (
                          <p className="text-red-500 text-sm mt-1">{errors.prescription.medications.message}</p>
                        )}
                      </div>
                      <div>
                        <label htmlFor="prescription.notes" className="block text-sm font-medium text-gray-700 mb-1">
                          Ghi chú
                        </label>
                        <textarea
                          id="prescription.notes"
                          {...register("prescription.notes")}
                          placeholder="Thông tin bổ sung (nếu có)"
                          rows={3}
                          className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 hover:shadow-sm"
                        />
                      </div>
                    </div>
                  )}

                  <button
                    type="submit"
                    className="w-full py-3 px-4 text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 to-blue-500 rounded-lg hover:from-indigo-700 hover:to-blue-600 shadow-md focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-all duration-300 transform hover:scale-105"
                    disabled={isSubmitting || uploading || !ipfs}
                  >
                    {isSubmitting || uploading ? "Đang xử lý..." : "Thêm hồ sơ"}
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default DoctorAddRecord;