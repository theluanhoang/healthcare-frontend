import { useEffect, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { toast } from "react-toastify";
import { useAuth } from "../hooks";
import { useToken } from "../contexts/TokenProvider";
import { 
  CurrencyDollarIcon, 
  ArrowsRightLeftIcon, 
  Bars4Icon, 
  XMarkIcon, 
  WalletIcon,
  HeartIcon,
  UserIcon,
  DocumentTextIcon,
  CalendarIcon,
  ShareIcon,
  ClipboardDocumentListIcon,
  UsersIcon,
  ChartBarIcon,
  ChevronDownIcon
} from "@heroicons/react/24/outline";
import { Popover, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { classNames } from "../utils/classNames";

export const menuItems = {
  public: [
    { label: "Giới thiệu", path: "/about", icon: <UserIcon className="h-5 w-5" /> },
    { label: "Tính năng", path: "/features", icon: <DocumentTextIcon className="h-5 w-5" /> },
    { label: "Liên hệ", path: "/contact", icon: <ShareIcon className="h-5 w-5" /> },
  ],
  patient: [
    { 
      label: "Cá nhân",
      icon: <UserIcon className="h-5 w-5" />,
      items: [
        { path: "/patient/profile", label: "Hồ sơ", icon: <UserIcon className="h-5 w-5" /> },
        { path: "/patient/records", label: "Hồ sơ y tế", icon: <DocumentTextIcon className="h-5 w-5" /> },
      ]
    },
    {
      label: "Dịch vụ",
      icon: <ClipboardDocumentListIcon className="h-5 w-5" />,
      items: [
        { path: "/patient/appointment", label: "Lịch hẹn", icon: <CalendarIcon className="h-5 w-5" /> },
        { path: "/patient/share", label: "Chia sẻ dữ liệu", icon: <ShareIcon className="h-5 w-5" /> },
        { path: "/surveys", label: "Khảo sát", icon: <ClipboardDocumentListIcon className="h-5 w-5" /> },
      ]
    }
  ],
  doctor: [
    {
      label: "Cá nhân",
      icon: <UserIcon className="h-5 w-5" />,
      items: [
        { path: "/doctor/profile", label: "Hồ sơ", icon: <UserIcon className="h-5 w-5" /> },
        { path: "/doctor/schedule", label: "Lịch khám", icon: <CalendarIcon className="h-5 w-5" /> },
      ]
    },
    {
      label: "Quản lý bệnh nhân",
      icon: <UsersIcon className="h-5 w-5" />,
      items: [
        { path: "/doctor/patients", label: "Bệnh nhân", icon: <UsersIcon className="h-5 w-5" /> },
        { path: "/doctor/patient-access", label: "Quyền truy cập", icon: <ShareIcon className="h-5 w-5" /> },
        { path: "/doctor/records", label: "Hồ sơ y tế", icon: <DocumentTextIcon className="h-5 w-5" /> },
        { path: "/doctor/add-record", label: "Thêm hồ sơ", icon: <ClipboardDocumentListIcon className="h-5 w-5" /> },
      ]
    },
    {
      label: "Tiện ích",
      icon: <ChartBarIcon className="h-5 w-5" />,
      items: [
        { path: "/doctor/analysis", label: "Phân tích", icon: <ChartBarIcon className="h-5 w-5" /> },
        { path: "/surveys", label: "Khảo sát", icon: <ClipboardDocumentListIcon className="h-5 w-5" /> },
      ]
    }
  ],
};

function NavbarDropdown({ group, isMobile, onItemClick }) {
  return (
    <Popover className="relative">
      {({ open, close }) => (
        <>
          <Popover.Button
            className={classNames(
              'group inline-flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200',
              open 
                ? 'text-indigo-600 bg-indigo-50 ring-2 ring-indigo-200 shadow-sm' 
                : 'text-gray-700 hover:text-indigo-600 hover:bg-indigo-50 hover:ring-2 hover:ring-indigo-100',
              isMobile ? 'w-full justify-between' : ''
            )}
          >
            <span className="flex items-center">
              <span className={classNames(
                "transition-colors duration-200",
                open ? "text-indigo-600" : "text-gray-400 group-hover:text-indigo-500"
              )}>
                {group.icon}
              </span>
              <span className="ml-2">{group.label}</span>
            </span>
            <ChevronDownIcon
              className={classNames(
                'ml-2 h-4 w-4 transition-transform duration-200 text-gray-400 group-hover:text-indigo-500',
                open ? 'transform rotate-180 text-indigo-500' : ''
              )}
            />
          </Popover.Button>

          <Transition
            as={Fragment}
            enter="transition ease-out duration-200"
            enterFrom="opacity-0 translate-y-2"
            enterTo="opacity-100 translate-y-0"
            leave="transition ease-in duration-150"
            leaveFrom="opacity-100 translate-y-0"
            leaveTo="opacity-0 translate-y-2"
          >
            <Popover.Panel 
              className={classNames(
                'absolute z-10 mt-2 transform px-2 w-screen max-w-[260px] sm:px-0',
                isMobile ? 'relative w-full max-w-none px-0' : 'left-1/2 -translate-x-1/2'
              )}
            >
              <div className="overflow-hidden rounded-xl shadow-lg ring-1 ring-black ring-opacity-5 backdrop-blur-sm">
                <div className="relative bg-white/95">
                  {group.items.map((item, idx) => (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={classNames(
                        "flex items-center px-4 py-3 transition-all duration-200",
                        "hover:bg-indigo-50/50 hover:pl-6",
                        idx !== group.items.length - 1 ? "border-b border-gray-100" : ""
                      )}
                      onClick={() => {
                        close(); // Close dropdown
                        onItemClick?.(); // Call any additional click handlers
                      }}
                    >
                      <div className={classNames(
                        "flex items-center justify-center flex-shrink-0 w-8 h-8",
                        "text-gray-400 transition-colors duration-200 group-hover:text-indigo-500"
                      )}>
                        {item.icon}
                      </div>
                      <div className="ml-3">
                        <p className="text-sm font-medium text-gray-800 group-hover:text-indigo-600">
                          {item.label}
                        </p>
                      </div>
                      {location.pathname === item.path && (
                        <div className="ml-auto">
                          <div className="h-2 w-2 rounded-full bg-indigo-500"></div>
                        </div>
                      )}
                    </Link>
                  ))}
                </div>
              </div>
            </Popover.Panel>
          </Transition>
        </>
      )}
    </Popover>
  );
}

export default function Navbar() {
  const { authState, login, logout } = useAuth();
  const { tokenBalance } = useToken();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [roleDetected, setRoleDetected] = useState("public");
  const [isConnecting, setIsConnecting] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

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

  const renderMenuItems = (items, isMobile = false) => {
    if (roleDetected === "public") {
      return items.map((item) => (
        <Link
          key={item.path}
          to={item.path}
          className={classNames(
            'inline-flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors',
            location.pathname === item.path
              ? 'text-indigo-600 bg-indigo-50'
              : 'text-gray-700 hover:text-indigo-600 hover:bg-indigo-50',
            isMobile ? 'w-full' : ''
          )}
          onClick={() => isMobile && setIsMobileMenuOpen(false)}
        >
          {item.icon}
          <span className="ml-2">{item.label}</span>
        </Link>
      ));
    }

    return items.map((group) => (
      <NavbarDropdown
        key={group.label}
        group={group}
        isMobile={isMobile}
        onItemClick={() => isMobile && setIsMobileMenuOpen(false)}
      />
    ));
  };

  return (
    <nav className="bg-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo and main navigation */}
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Link to="/" className="flex items-center">
                <HeartIcon className="h-8 w-8 text-indigo-600" />
                <span className="ml-2 text-2xl font-bold text-indigo-600">Healthcare</span>
              </Link>
            </div>
            
            {/* Desktop navigation */}
            <div className="hidden md:ml-6 md:flex md:items-center md:space-x-4">
              {renderMenuItems(menus)}
            </div>
          </div>

          {/* Right side buttons */}
          <div className="flex items-center space-x-4">
            {authState.isLogged && authState.walletAddress ? (
              <div className="hidden md:flex items-center space-x-4">
                {/* Token Balance */}
                <div className="flex items-center px-4 py-2 bg-gray-50 rounded-lg">
                  <div className="flex items-center">
                    <CurrencyDollarIcon className="h-5 w-5 text-gray-600 mr-2" />
                    <span className="text-sm font-medium">{tokenBalance}</span>
                  </div>
                  <Link
                    to="/exchange"
                    className="ml-3 flex items-center text-indigo-600 hover:text-indigo-700"
                  >
                    <ArrowsRightLeftIcon className="h-4 w-4" />
                    <span className="ml-1 text-sm">Đổi token</span>
                  </Link>
                </div>

                {/* Wallet & Logout */}
                <div className="flex items-center space-x-3">
                  <div className="flex items-center px-3 py-2 bg-gray-100 rounded-lg">
                    <WalletIcon className="h-5 w-5 text-gray-600 mr-2" />
                    <span className="text-sm font-mono text-gray-800">
                      {`${authState.walletAddress.slice(0, 6)}...${authState.walletAddress.slice(-4)}`}
                    </span>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
                  >
                    Đăng xuất
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={handleLogin}
                disabled={isConnecting}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                {isConnecting ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    Đang kết nối...
                  </>
                ) : (
                  <>
                    <WalletIcon className="h-5 w-5 mr-2" />
                    Kết nối ví
                  </>
                )}
              </button>
            )}

            {/* Mobile menu button */}
            <div className="flex items-center md:hidden">
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="inline-flex items-center justify-center p-2 rounded-md text-gray-500 hover:text-gray-600 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500"
              >
                <span className="sr-only">Open main menu</span>
                {isMobileMenuOpen ? (
                  <XMarkIcon className="block h-6 w-6" />
                ) : (
                  <Bars4Icon className="block h-6 w-6" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden">
          <div className="px-2 pt-2 pb-3 space-y-1">
            {renderMenuItems(menus, true)}
          </div>

          {authState.isLogged && authState.walletAddress && (
            <div className="pt-4 pb-3 border-t border-gray-200">
              <div className="px-2 space-y-3">
                {/* Token Balance */}
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center">
                    <CurrencyDollarIcon className="h-5 w-5 text-gray-600 mr-2" />
                    <span className="text-sm font-medium">{tokenBalance}</span>
                  </div>
                  <button
                    onClick={() => {
                      navigate('/exchange');
                      setIsMobileMenuOpen(false);
                    }}
                    className="flex items-center text-indigo-600 hover:text-indigo-700"
                  >
                    <ArrowsRightLeftIcon className="h-4 w-4" />
                    <span className="ml-1 text-sm">Đổi token</span>
                  </button>
                </div>

                {/* Wallet Address */}
                <div className="flex items-center p-3 bg-gray-100 rounded-lg">
                  <WalletIcon className="h-5 w-5 text-gray-600 mr-2" />
                  <span className="text-sm font-mono text-gray-800">
                    {`${authState.walletAddress.slice(0, 6)}...${authState.walletAddress.slice(-4)}`}
                  </span>
                </div>

                {/* Logout Button */}
                <button
                  onClick={() => {
                    handleLogout();
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
                >
                  Đăng xuất
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </nav>
  );
}
