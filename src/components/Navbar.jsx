import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { useAuth } from "../hooks";

export const menuItems = {
  public: [
    { label: "Giới thiệu", path: "/about" },
    { label: "Tính năng", path: "/features" },
    { label: "Liên hệ", path: "/contact" },
  ],
  patient: [
    { path: "/patient/profile", label: "Hồ sơ" },
    { path: "/patient/records", label: "Hồ sơ y tế" },
    { path: "/patient/appointment", label: "Lịch hẹn" },
    { path: "/patient/share", label: "Chia sẻ dữ liệu" },
    { path: "/surveys", label: "Khảo sát" },
  ],
  doctor: [
    { path: "/doctor/profile", label: "Hồ sơ" },
    { path: "/doctor/patients", label: "Bệnh nhân" },
    { path: "/doctor/patient-access", label: "Quyền truy cập" },
    { path: "/doctor/add-record", label: "Thêm hồ sơ" },
    { path: "/doctor/records", label: "Hồ sơ y tế" },
    { path: "/doctor/schedule", label: "Lịch khám" },
    { path: "/doctor/analysis", label: "Phân tích" },
    { path: "/surveys", label: "Khảo sát" },
  ],
};

function Navbar() {
  const { authState, login, logout } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [roleDetected, setRoleDetected] = useState("public");
  const [isConnecting, setIsConnecting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (authState.role) {
      setRoleDetected(
        authState.role === "1"
          ? "patient"
          : authState.role === "2" && authState.isVerified
          ? "doctor"
          : "public"
      );
    } else {
      setRoleDetected("public");
    }
  }, [authState.role, authState.isVerified]);

  const handleLogin = async () => {
    if (!window.ethereum) {
      toast.error("Vui lòng cài đặt MetaMask.");
      return;
    }

    setIsConnecting(true);

    try {
      const userData = await login();
      const { role, isVerified, fullName } = userData;

      if (role === "0") {
        toast.error("Tài khoản chưa đăng ký.");
        setRoleDetected("public");
        navigate("/register");
        return;
      }

      if (role === "1") {
        toast.success(`Đăng nhập thành công! Chào ${fullName} (Bệnh nhân)`);
        setRoleDetected("patient");
        navigate("/patient/profile");
        return;
      }

      if (role === "2") {
        if (isVerified) {
          toast.success(`Đăng nhập thành công! Chào ${fullName} (Bác sĩ)`);
          setRoleDetected("doctor");
          navigate("/doctor/patients");
        } else {
          toast.error("Tài khoản bác sĩ đang chờ xác minh.");
          setRoleDetected("public");
          logout();
          navigate("/");
        }
        return;
      }

      throw new Error("Vai trò không hợp lệ.");
    } catch (error) {
      const errorMessage = error.message.includes("Lỗi hợp đồng")
        ? error.message
        : `Lỗi đăng nhập: ${error.message || "Không xác định"}`;
      toast.error(errorMessage);
      console.error("Lỗi đăng nhập:", error);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleLogout = () => {
    logout();
    setRoleDetected("public");
    setIsMobileMenuOpen(false);
    toast.info("Đã đăng xuất.");
    navigate("/");
  };

  const menus = authState.walletAddress
    ? menuItems[roleDetected] || menuItems.public
    : menuItems.public;

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
            {authState.isLogged && authState.walletAddress ? (
              <div className="flex items-center space-x-4">
                <span className="text-sm font-mono bg-gray-100 px-4 py-2 rounded-full text-gray-800 shadow-sm">
                  {authState.walletAddress.slice(0, 6)}...
                  {authState.walletAddress.slice(-4)}
                </span>
                <button
                  onClick={handleLogout}
                  className="px-5 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-red-500 to-red-600 rounded-lg hover:from-red-600 hover:to-red-700 shadow-md transition-all duration-300"
                >
                  Đăng xuất
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-4">
                <Link
                  to="/register"
                  className="px-5 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 to-blue-500 rounded-lg hover:from-indigo-700 hover:to-blue-600 shadow-md transition-all duration-300"
                >
                  Đăng ký
                </Link>
                <button
                  onClick={handleLogin}
                  disabled={isConnecting}
                  className="px-5 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 to-blue-500 rounded-lg hover:from-indigo-700 hover:to-blue-600 shadow-md transition-all duration-300 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {isConnecting ? "Đang kết nối..." : "Đăng nhập"}
                </button>
              </div>
            )}
          </div>

          {/* Mobile Menu Toggle */}
          <button
            className="md:hidden text-gray-700 hover:text-indigo-600 transition-colors"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? (
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            ) : (
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M4 6h16M4 12h16M4 18h16"
                />
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
              {authState.isLogged && authState.walletAddress ? (
                <div className="flex flex-col space-y-4">
                  <span className="text-sm font-mono bg-gray-100 px-4 py-2 rounded-full text-gray-800 text-center">
                    {authState.walletAddress.slice(0, 6)}...
                    {authState.walletAddress.slice(-4)}
                  </span>
                  <button
                    onClick={handleLogout}
                    className="w-full px-5 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-red-500 to-red-600 rounded-lg hover:from-red-600 hover:to-red-700 transition-all duration-300"
                  >
                    Đăng xuất
                  </button>
                </div>
              ) : (
                <div className="flex flex-col space-y-4">
                  <Link
                    to="/register"
                    className="w-full text-center px-5 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 to-blue-500 rounded-lg hover:from-indigo-700 hover:to-blue-600 transition-all duration-300"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Đăng ký
                  </Link>
                  <button
                    onClick={() => {
                      handleLogin();
                      setIsMobileMenuOpen(false);
                    }}
                    disabled={isConnecting}
                    className="w-full px-5 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 to-blue-500 rounded-lg hover:from-indigo-700 hover:to-blue-600 transition-all duration-300 disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    {isConnecting ? "Đang kết nối..." : "Đăng nhập"}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}

export default Navbar;
