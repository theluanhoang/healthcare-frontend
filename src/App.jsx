// App.jsx
import { useCallback, useEffect, useState } from "react";
import { toast } from "react-toastify";
import "./App.css";
import Navbar from "./components/Navbar";
import { useSmartContract } from "./hooks";
import AppRoutes from "./routes/AppRouter";
import { shortenAddress } from "./utils";
import { setupContractListeners } from "./utils/contractListener";

function App() {
  const { initContract, contract, error, fetchDoctors } = useSmartContract();
  const [isLoading, setIsLoading] = useState(true);

  const handleDoctorVerified = useCallback(
    async (doctor, doctorName) => {
      console.log("Doctor verified in App:", doctor, doctorName);
      toast.success(
        `Bác sĩ ${doctorName} (${shortenAddress(doctor)}) đã được xác minh!`,
        { toastId: `verified-${doctor}` }
      );
      await fetchDoctors();
    },
    [fetchDoctors]
  );

  useEffect(() => {
    const initializeContract = async () => {
      try {
        setIsLoading(true);
        if (!contract) {
          await initContract();
          console.log("Khởi tạo hợp đồng thông minh thành công! Address:", contract?.address);
        }

        if (contract) {
          console.log("Setting up DoctorVerified listener for contract:", contract.address);
          const cleanup = setupContractListeners({
            contract,
            handleDoctorVerified,
          });
          return cleanup;
        }
      } catch (err) {
        console.error("Lỗi khi khởi tạo hợp đồng thông minh:", err);
      } finally {
        setIsLoading(false);
      }
    };

    initializeContract();
  }, [contract, handleDoctorVerified]);

  // Polling dự phòng
  // useEffect(() => {
  //   const pollDoctors = async () => {
  //     if (!contract) return;
  //     try {
  //       const doctorList = await fetchDoctors();
  //       console.log("Polling doctors:", doctorList);
  //       if (Array.isArray(doctorList)) {
  //         doctorList.forEach((doc) => {
  //           if (doc.isVerified) {
  //             const toastId = `verified-${doc.address}`;
  //             if (!toast.isActive(toastId)) {
  //               console.log("Polling detected verified doctor:", doc.fullName);
  //               toast.success(
  //                 `Bác sĩ ${doc.fullName} (${shortenAddress(doc.address)}) đã được xác minh!`,
  //                 { toastId }
  //               );
  //             }
  //           }
  //         });
  //       } else {
  //         console.log("No valid doctor list returned from fetchDoctors");
  //       }
  //     } catch (err) {
  //       console.error("Lỗi polling bác sĩ:", err);
  //     }
  //   };

  //   pollDoctors(); // Gọi ngay lần đầu
  //   const interval = setInterval(pollDoctors, 30000); // Kiểm tra mỗi 30 giây

  //   return () => clearInterval(interval);
  // }, [contract, fetchDoctors]);

  if (isLoading) {
    return <div>Đang khởi tạo hợp đồng...</div>;
  }

  if (error) {
    return <div>Lỗi: {error}</div>;
  }

  return (
    <div>
      <Navbar />
      <div className="flex flex-col justify-center items-center">
        <AppRoutes />
      </div>
    </div>
  );
}

export default App;