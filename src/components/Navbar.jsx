import React, { useState } from "react";
import { useAuthStore } from "../stores/useAuthStore";
import { Link } from "react-router-dom";

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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const connectWallet = async () => {
    if (window.ethereum) {
      try {
        const [account] = await window.ethereum.request({ method: 'eth_requestAccounts' });
        setWallet(account);
      } catch (err) {
        console.error('Wallet connection failed', err);
      }
    } else {
      alert('Vui lòng cài MetaMask!');
    }
  };

  const menus = isLoggedIn ? menuItems[role] || menuItems.public : menuItems.public;

  return (
    <nav className="bg-gradient-to-r from-indigo-50 to-blue-50 shadow-xl sticky top-0 z-50">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link
            to="/"
            className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-blue-500 hover:from-indigo-700 hover:to-blue-600 transition-all duration-300"
          >
            HealthCare
          </Link>

          {/* Desktop Menu */}
          <ul className="hidden md:flex items-center space-x-10">
            {menus.map((item) => (
              <li key={item.path}>
                <Link
                  to={item.path}
                  className="relative text-gray-700 font-medium text-lg hover:text-indigo-600 transition-colors duration-300 after:content-[''] after:absolute after:bottom-0 after:left-0 after:w-0 after:h-0.5 after:bg-indigo-600 after:transition-all after:duration-300 hover:after:w-full"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>

          {/* Wallet Connection / User Info */}
          <div className="hidden md:flex items-center space-x-4">
            {isLoggedIn ? (
              <div className="flex items-center space-x-4">
                <span className="text-sm font-mono bg-gray-100 px-4 py-2 rounded-full text-gray-800 shadow-sm">
                  {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
                </span>
                <button
                  onClick={logout}
                  className="px-5 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-red-500 to-red-600 rounded-lg hover:from-red-600 hover:to-red-700 shadow-md transition-all duration-300"
                >
                  Đăng xuất
                </button>
              </div>
            ) : (
              <button
                onClick={connectWallet}
                className="px-5 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 to-blue-500 rounded-lg hover:from-indigo-700 hover:to-blue-600 shadow-md transition-all duration-300"
              >
                Kết nối ví
              </button>
            )}
          </div>

          {/* Mobile Menu Toggle */}
          <button
            className="md:hidden text-gray-700 hover:text-indigo-600 transition-colors"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden mt-6 bg-white rounded-lg shadow-lg p-4 animate-slide-down">
            <ul className="flex flex-col space-y-4">
              {menus.map((item) => (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    className="block py-2 text-gray-700 font-medium hover:text-indigo-600 hover:bg-indigo-50 rounded-md px-3 transition-all duration-200"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
            <div className="mt-6 border-t pt-4">
              {isLoggedIn ? (
                <div className="flex flex-col space-y-4">
                  <span className="text-sm font-mono bg-gray-100 px-4 py-2 rounded-full text-gray-800 text-center">
                    {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
                  </span>
                  <button
                    onClick={() => {
                      logout();
                      setIsMobileMenuOpen(false);
                    }}
                    className="w-full px-5 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-red-500 to-red-600 rounded-lg hover:from-red-600 hover:to-red-700 transition-all duration-300"
                  >
                    Đăng xuất
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => {
                    connectWallet();
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full px-5 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 to-blue-500 rounded-lg hover:from-indigo-700 hover:to-blue-600 transition-all duration-300"
                >
                  Kết nối ví
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}

export default Navbar;