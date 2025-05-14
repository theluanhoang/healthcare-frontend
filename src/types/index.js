import { z } from "zod";

export const registerSchema = z.object({
  fullName: z.string().min(1, "Họ và tên không được để trống"),
  email: z.string().email("Email không hợp lệ"),
  role: z.enum(["PATIENT", "DOCTOR"], { message: "Vui lòng chọn vai trò hợp lệ" }),
  certificate: z
    .custom(
      (val) => val instanceof FileList || val === undefined,
      "Vui lòng chọn một tệp hợp lệ"
    )
    .optional()
    .refine((files) => !files || files.length <= 1, {
      message: "Chỉ được tải lên một tệp chứng chỉ",
    })
    .refine(
      (files) => (files?.length > 0 ? files[0].size <= 5 * 1024 * 1024 : true),
      "Tệp chứng chỉ phải nhỏ hơn 5MB"
    )
    .refine(
      (files) =>
        files?.length > 0
          ? ["application/pdf", "image/jpeg", "image/png"].includes(files[0].type)
          : true,
      "Chỉ hỗ trợ các định dạng PDF, JPEG hoặc PNG"
    )
}).refine(
  (data) => (data.role === "DOCTOR" ? data.certificate && data.certificate.length > 0 : true),
  {
    message: "Cần tải lên một tệp chứng chỉ đối với vai trò Bác sĩ",
    path: ["certificate"],
  }
);

export const profileSchema = z.object({
  fullName: z.string().min(1, "Họ tên không được để trống"),
  email: z.string().email("Email không hợp lệ").nonempty("Email không được để trống"),
});