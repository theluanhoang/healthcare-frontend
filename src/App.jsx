import { useEffect, useState } from "react";
import "./App.css";
import Navbar from "./components/Navbar";
import { useSmartContract } from "./hooks";
import AppRoutes from "./routes/AppRouter";

function App() {
  const { initContract, contract, error } = useSmartContract();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initializeContract = async () => {
      try {
        setIsLoading(true);
        if (!contract) {
          await initContract();
          console.log("Khởi tạo hợp đồng thông minh thành công!");
        }
      } catch (err) {
        console.error("Lỗi khi khởi tạo hợp đồng thông minh:", err);
      } finally {
        setIsLoading(false);
      }
    };

    initializeContract();
  }, [initContract, contract]);

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