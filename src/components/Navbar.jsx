import React from "react";
import { useAuthStore } from "../stores/useAuthStore";

const menuItems = {
    public: [
      { label: "Giới thiệu", path: "/about" },
      { label: "Tính năng", path: "/features" },
      { label: "Liên hệ", path: "/contact" },
    ],
    patient: [
      { label: "Hồ sơ", path: "/patient/profile" },
      { label: "Lịch hẹn", path: "/patient/appointments" },
      { label: "Chia sẻ dữ liệu", path: "/patient/share" },
    ],
    doctor: [
      { label: "Bệnh nhân", path: "/doctor/patients" },
      { label: "Lịch khám", path: "/doctor/schedule" },
      { label: "Phân tích", path: "/doctor/analysis" },
    ],
  };

function Navbar() {
    const { walletAddress, role, setWallet, logout } = useAuthStore();
  const isLoggedIn = !!walletAddress;
  const connectWallet = async () => {
    if (window.ethereum) {
      try {
        const [account] = await window.ethereum.request({ method: 'eth_requestAccounts' });
        setWallet(account);
        // setRole('patient') hoặc 'doctor' tùy hệ thống phân quyền
      } catch (err) {
        console.error('Wallet connection failed', err);
      }
    } else {
      alert('Vui lòng cài MetaMask!');
    }
  };

  const menus = isLoggedIn ? menuItems[role] || menuItems.public : menuItems.public;

  return (
    <div className="">
      <div className="container mx-auto py-4 flex flex-row justify-between">
        <p className="font-bold text-3xl">HealthCare</p>
        <ul>
        {menus.map((item) => (
          <Link key={item.path} to={item.path} className="text-gray-700 hover:text-indigo-500">
            {item.label}
          </Link>
        ))}
        </ul>
        <div>
        {isLoggedIn ? (
          <div className="flex items-center space-x-4">
            <span className="text-sm font-mono bg-gray-100 px-3 py-1 rounded">
              {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
            </span>
            <button onClick={logout} className="text-red-500 hover:text-red-600 text-sm">
              Đăng xuất
            </button>
          </div>
        ) :
          (<button className="bg-amber-400 px-4 py-2 rounded-md cursor-pointer">
            Kết nối ví
          </button>) }
        </div>
      </div>
    </div>
  );
}

export default Navbar;
