import { Link, useLocation } from "react-router-dom";
import {
  ClipboardDocumentListIcon,
  UserCircleIcon,
  CalendarIcon,
  ChartBarIcon,
  DocumentTextIcon,
  UserGroupIcon,
} from "@heroicons/react/24/outline";
import { useSmartContract } from "../../hooks";
import { useEffect, useState } from "react";

function Sidebar() {
  const location = useLocation();
  const { contract, signer } = useSmartContract();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const checkAdmin = async () => {
      if (!contract || !signer) return;
      try {
        const address = await signer.getAddress();
        const owner = await contract.owner();
        setIsAdmin(address.toLowerCase() === owner.toLowerCase());
      } catch (error) {
        console.error('Error checking admin status:', error);
      }
    };

    checkAdmin();
  }, [contract, signer]);

  const isActive = (path) => {
    return location.pathname === path;
  };

  const menuItems = [
    {
      name: "Trang chủ",
      icon: UserCircleIcon,
      path: "/doctor/dashboard",
    },
    {
      name: "Bệnh nhân",
      icon: UserGroupIcon,
      path: "/doctor/patients",
    },
    {
      name: "Bệnh án",
      icon: ClipboardDocumentListIcon,
      path: "/doctor/records",
    },
    {
      name: "Lịch hẹn",
      icon: CalendarIcon,
      path: "/doctor/appointments",
    },
    {
      name: "Phân tích dữ liệu",
      icon: ChartBarIcon,
      path: "/doctor/analysis",
    },
    {
      name: "Khảo sát & Phần thưởng",
      icon: DocumentTextIcon,
      path: isAdmin ? "/admin/surveys" : "/surveys",
    },
  ];

  return (
    <div className="lg:w-1/4">
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <nav className="space-y-1">
          {menuItems.map((item) => (
            <Link
              key={item.name}
              to={item.path}
              className={`${
                isActive(item.path)
                  ? "bg-indigo-50 border-indigo-500 text-indigo-700"
                  : "border-transparent text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              } flex items-center px-3 py-4 text-sm font-medium border-l-4`}
            >
              <item.icon
                className={`${
                  isActive(item.path)
                    ? "text-indigo-500"
                    : "text-gray-400 group-hover:text-gray-500"
                } flex-shrink-0 -ml-1 mr-3 h-6 w-6`}
                aria-hidden="true"
              />
              <span className="truncate">{item.name}</span>
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
}

export default Sidebar;
