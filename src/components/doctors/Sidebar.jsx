import { Link } from "react-router-dom";
import { menuItems } from "../Navbar";

function Sidebar() {
  return (
    <div className="lg:w-1/4 bg-white rounded-xl shadow-lg p-6">
      <h2 className="text-xl font-bold text-gray-800 mb-6">Điều hướng</h2>
      <ul className="space-y-4">
        {menuItems.doctor.map((menuItem) => (
          <li key={menuItem.path}>
            <Link
              to={`${menuItem.path}`}
              className="block py-2 px-4 text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all duration-200"
            >
              {`${menuItem.label}`}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default Sidebar;
