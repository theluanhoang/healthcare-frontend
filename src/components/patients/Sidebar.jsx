import { Link, useLocation } from "react-router-dom";
import {
  ClipboardDocumentListIcon,
  UserCircleIcon,
  CalendarIcon,
  ChartBarIcon,
  DocumentTextIcon,
} from "@heroicons/react/24/outline";

function Sidebar() {
  const location = useLocation();

  const isActive = (path) => {
    return location.pathname === path;
  };

  const menuItems = [
    {
      name: "Trang chủ",
      icon: UserCircleIcon,
      path: "/patient/dashboard",
    },
    {
      name: "Bệnh án",
      icon: ClipboardDocumentListIcon,
      path: "/patient/records",
    },
    {
      name: "Lịch hẹn",
      icon: CalendarIcon,
      path: "/patient/appointments",
    },
    {
      name: "Khảo sát & Phần thưởng",
      icon: ChartBarIcon,
      path: "/surveys",
    },
    {
      name: "Chia sẻ bệnh án",
      icon: DocumentTextIcon,
      path: "/patient/share",
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