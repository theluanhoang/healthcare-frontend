import { zodResolver } from "@hookform/resolvers/zod";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import { z } from "zod";
import { useSmartContract } from "../hooks";
import useIpfs from "../hooks/useIPFS";

const examinationSchema = z.object({
  symptoms: z.string().min(1, "Vui lòng nhập triệu chứng"),
  diagnosis: z.string().min(1, "Vui lòng nhập chẩn đoán"),
  notes: z.string().optional(),
});

const testResultSchema = z.object({
  testType: z.string().min(1, "Vui lòng nhập loại xét nghiệm"),
  results: z.string().min(1, "Vui lòng nhập kết quả"),
  comments: z.string().optional(),
});

const prescriptionSchema = z.object({
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
});

const recordSchema = z
  .object({
    patient: z.string().min(1, "Vui lòng chọn bệnh nhân"),
    visitDate: z.string().min(1, "Vui lòng chọn ngày khám"),
    includeExamination: z.boolean(),
    includeTestResult: z.boolean(),
    includePrescription: z.boolean(),
    examination: z.any().optional(),
    testResult: z.any().optional(),
    prescription: z.any().optional(),
  })
  .refine(
    (data) => !data.includeExamination || examinationSchema.safeParse(data.examination).success,
    {
      message: "Vui lòng điền đầy đủ triệu chứng và chẩn đoán",
      path: ["examination"],
    }
  )
  .refine(
    (data) => !data.includeTestResult || testResultSchema.safeParse(data.testResult).success,
    {
      message: "Vui lòng điền đầy đủ loại xét nghiệm và kết quả",
      path: ["testResult"],
    }
  )
  .refine(
    (data) => !data.includePrescription || prescriptionSchema.safeParse(data.prescription).success,
    {
      message: "Vui lòng điền đầy đủ thông tin thuốc",
      path: ["prescription.medications"],
    }
  );

function DoctorAddRecord() {
  const {
    patients,
    fetchPatients,
    addMedicalRecord,
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
    setValue,
  } = useForm({
    resolver: zodResolver(recordSchema),
    defaultValues: {
      patient: "",
      visitDate: "",
      includeExamination: false,
      includeTestResult: false,
      includePrescription: false,
      examination: undefined,
      testResult: undefined,
      prescription: undefined,
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "prescription.medications",
    shouldUnregister: true,
  });

  const [includeExamination, includeTestResult, includePrescription] = watch([
    "includeExamination",
    "includeTestResult",
    "includePrescription",
  ]);

  // Reset fields when checkboxes are toggled
  useEffect(() => {
    if (!includeExamination) {
      setValue("examination", undefined);
    } else if (!watch("examination")) {
      setValue("examination", { symptoms: "", diagnosis: "", notes: "" });
    }
    if (!includeTestResult) {
      setValue("testResult", undefined);
    } else if (!watch("testResult")) {
      setValue("testResult", { testType: "", results: "", comments: "" });
    }
    if (!includePrescription) {
      setValue("prescription", undefined);
    } else if (!watch("prescription")) {
      setValue("prescription", { medications: [], notes: "" });
    }
  }, [includeExamination, includeTestResult, includePrescription, setValue, watch]);

  // Memoized init function
  const init = useCallback(async () => {
    try {
      console.log("Running init...");
      await fetchPatients();
      console.log("Patients in DoctorAddRecord:", patients);
      if (contract && walletAddress) {
        const user = await contract.getUser(walletAddress);
        setIsVerifiedDoctor(user[1] && user[0].toString() === "2");
      }
    } catch (error) {
      console.error("Lỗi khi lấy dữ liệu:", error);
      toast.error("Không thể lấy dữ liệu từ blockchain.");
    }
  }, [fetchPatients, contract, walletAddress]);

  useEffect(() => {
    if (walletAddress && contract) {
      init();
    }
  }, [walletAddress, contract, init]);

  const onSubmit = useCallback(
    async (data) => {
      console.log("Form submitted with data:", data);
      if (!ipfs) {
        toast.error("IPFS client chưa sẵn sàng.");
        return;
      }
      if (!isVerifiedDoctor) {
        toast.error("Chỉ bác sĩ đã xác minh mới có thể thêm hồ sơ.");
        return;
      }

      // Kiểm tra nếu không chọn component nào
      if (!data.includeExamination && !data.includeTestResult && !data.includePrescription) {
        toast.error("Vui lòng chọn ít nhất một loại hồ sơ để thêm.");
        return;
      }

      setUploading(true);
      try {
        // Gộp tất cả components vào một JSON duy nhất
        const combinedRecord = {
          patientAddress: data.patient,
          visitDate: data.visitDate,
          createdBy: walletAddress,
          createdAt: new Date().toISOString(),
          records: [],
        };

        if (data.includeExamination && data.examination) {
          combinedRecord.records.push({
            recordType: "EXAMINATION_RECORD",
            details: data.examination,
          });
        }

        if (data.includeTestResult && data.testResult) {
          combinedRecord.records.push({
            recordType: "TEST_RESULT",
            details: data.testResult,
          });
        }

        if (data.includePrescription && data.prescription) {
          combinedRecord.records.push({
            recordType: "PRESCRIPTION",
            details: data.prescription,
          });
        }

        console.log("Combined JSON data:", combinedRecord);

        // Lưu JSON vào IPFS
        const cid = await uploadJson(JSON.stringify(combinedRecord));
        console.log("JSON uploaded to IPFS, CID:", cid);

        // Xác định loại hồ sơ từ records
        let recordType = 1; // Mặc định là EXAMINATION_RECORD
        if (combinedRecord.records.length > 0) {
          switch (combinedRecord.records[0].recordType) {
            case "EXAMINATION_RECORD":
              recordType = 1;
              break;
            case "TEST_RESULT":
              recordType = 2;
              break;
            case "PRESCRIPTION":
              recordType = 3;
              break;
          }
        }

        // Thêm bản ghi vào blockchain với recordType
        await addMedicalRecord(data.patient, cid, recordType);
        toast.success("Hồ sơ y tế đã được thêm thành công!");

        reset();
      } catch (error) {
        console.error("Lỗi khi thêm hồ sơ:", error);
        let errorMessage = "Không thể thêm hồ sơ y tế.";
        if (error.message.includes("IPFS")) {
          errorMessage = "Lỗi khi tải lên IPFS. Vui lòng kiểm tra node IPFS.";
        } else if (error.message.includes("user rejected")) {
          errorMessage = "Giao dịch bị từ chối bởi ví.";
        } else if (error.message.includes("revert")) {
          errorMessage = "Hợp đồng thông minh từ chối giao dịch.";
        }
        toast.error(errorMessage);
      } finally {
        setUploading(false);
      }
    },
    [ipfs, uploadJson, walletAddress, addMedicalRecord, reset, isVerifiedDoctor]
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
            Thêm hồ sơ y tế cho bệnh nhân
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
                <li>
                  <Link
                    to="/doctor/verify"
                    className="block py-2 px-4 text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all duration-200"
                  >
                    Xác minh bác sĩ
                  </Link>
                </li>
              </ul>
            </div>

            <div className="lg:w-3/4">
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
                        patientsList
                          .filter(patient => patient.isAuthorized)
                          .map((patient) => (
                          <option key={patient.address} value={patient.address}>
                            {patient.fullName} ({patient.address.slice(0, 6)}...{patient.address.slice(-4)})
                          </option>
                        ))
                      ) : (
                        <option value="" disabled>
                          Không có bệnh nhân đã cấp quyền
                        </option>
                      )}
                    </select>
                    {errors.patient && (
                      <p className="text-red-500 text-sm mt-1">{errors.patient.message}</p>
                    )}
                    {patientsList.length > 0 && patientsList.filter(p => p.isAuthorized).length === 0 && (
                      <p className="text-yellow-600 text-sm mt-2">
                        ⚠️ Chưa có bệnh nhân nào cấp quyền cho bạn. Bệnh nhân cần cấp quyền trước khi bạn có thể thêm hồ sơ.
                      </p>
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