import React from "react";

const ExaminationForm = React.memo(({ register, errors }) => {
  console.log("ExaminationForm rendered");
  return (
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
  );
});

export default ExaminationForm;