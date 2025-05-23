import React from "react";
import { useFieldArray } from "react-hook-form";

const PrescriptionForm = React.memo(({ register, errors, control }) => {
  console.log("PrescriptionForm rendered");
  const { fields, append, remove } = useFieldArray({
    control,
    name: "prescription.medications",
  });

  return (
    <div className="space-y-4 border-t pt-4">
      <h3 className="text-lg font-semibold text-gray-800">Đơn thuốc</h3>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Danh sách thuốc</label>
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
  );
});

export default PrescriptionForm;