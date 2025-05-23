import React from "react";

const TestResultForm = React.memo(({ register, errors }) => {
  console.log("TestResultForm rendered");
  return (
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
  );
});

export default TestResultForm;