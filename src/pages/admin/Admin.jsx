import { ethers, isAddress } from "ethers";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { useSmartContract } from "../../hooks";

function Admin() {
  const { contract, walletAddress, error: contractError } = useSmartContract();
  const navigate = useNavigate();
  const [doctors, setDoctors] = useState([]);
  const [adminAddress, setAdminAddress] = useState("");
  const [doctorAddressToVerify, setDoctorAddressToVerify] = useState("");
  const [newAdminAddress, setNewAdminAddress] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isTransferring, setIsTransferring] = useState(false);

  useEffect(() => {
    const initialize = async () => {
      if (!contract || !walletAddress) {
        toast.error("Hợp đồng hoặc ví chưa sẵn sàng.");
        navigate("/");
        return;
      }

      try {
        setIsLoading(true);

        const adminAddr = await contract.admin();
        setAdminAddress(adminAddr);

        if (walletAddress.toLowerCase() !== adminAddr.toLowerCase()) {
          toast.error("Chỉ admin mới có quyền truy cập trang này.");
          navigate("/");
          return;
        }

        await fetchDoctors();

        contract.on("UserRegistered", (user, role, fullName) => {
          if (role.toString() === "2") {
            toast.info(`Bác sĩ mới đăng ký: ${fullName} (${user})`);
          }
        });

      } catch (err) {
        toast.error(`Lỗi khởi tạo: ${err.message}`);
        console.error("Lỗi khởi tạo:", err);
      } finally {
        setIsLoading(false);
      }
    };

    initialize();

    // Cleanup event listener
    return () => {
      if (contract) {
        contract.removeAllListeners("UserRegistered");
      }
    };
  }, [contract, walletAddress, navigate]);

  const fetchDoctors = async () => {
    try {
      const [addresses, isVerified, fullNames, ipfsHashes] = await contract.getAllDoctors();
      const doctorList = addresses.map((addr, index) => ({
        address: addr,
        fullName: fullNames[index],
        isVerified: isVerified[index],
        ipfsHash: ipfsHashes[index],
      }));
      setDoctors(doctorList);
    } catch (err) {
      toast.error(`Lỗi khi lấy danh sách bác sĩ: ${err.message}`);
      console.error("Lỗi lấy danh sách bác sĩ:", err);
    }
  };

  const handleVerifyDoctor = async (address) => {
    if (!isAddress(address)) {
      toast.error("Địa chỉ bác sĩ không hợp lệ.");
      return;
    }

    setIsVerifying(true);
    try {
      const tx = await contract.verifyDoctor(address, { gasLimit: 500000 });
      await tx.wait();
      toast.success("Xác minh bác sĩ thành công!");
      setDoctorAddressToVerify("");
      await fetchDoctors();
    } catch (err) {
      if (err.message.includes("User is not a doctor")) {
        toast.error("Địa chỉ này không phải bác sĩ.");
      } else if (err.message.includes("Doctor already verified")) {
        toast.error("Bác sĩ đã được xác minh trước đó.");
      } else {
        toast.error(`Lỗi xác minh bác sĩ: ${err.message}`);
      }
      console.error("Lỗi xác minh bác sĩ:", err);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleTransferAdmin = async () => {
    if (!ethers.utils.isAddress(newAdminAddress)) {
      toast.error("Địa chỉ admin mới không hợp lệ.");
      return;
    }

    setIsTransferring(true);
    try {
      const tx = await contract.transferAdmin(newAdminAddress, { gasLimit: 500000 });
      await tx.wait();
      toast.success("Chuyển quyền admin thành công!");
      setNewAdminAddress("");
      setAdminAddress(newAdminAddress);
      navigate("/");
    } catch (err) {
      if (err.message.includes("Invalid new admin address")) {
        toast.error("Địa chỉ admin mới không hợp lệ.");
      } else if (err.message.includes("New admin must be different")) {
        toast.error("Admin mới phải khác admin hiện tại.");
      } else {
        toast.error(`Lỗi chuyển quyền admin: ${err.message}`);
      }
      console.error("Lỗi chuyển quyền admin:", err);
    } finally {
      setIsTransferring(false);
    }
  };

  if (isLoading) {
    return <div className="flex justify-center items-center h-screen text-gray-600">Đang tải...</div>;
  }

  if (contractError) {
    return <div className="flex justify-center items-center h-screen text-red-600">Lỗi: {contractError}</div>;
  }

  return (
    <div className="w-full min-h-screen bg-gradient-to-br from-indigo-50 to-blue-50">
      {/* Hero Section */}
      <section
        className="relative min-h-[40vh] flex items-center justify-center bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: `linear-gradient(to bottom, rgba(0, 0, 0, 0.4), rgba(0, 0, 0, 0.4)), url('https://images.unsplash.com/photo-1516321310764-898ec50f9083')`,
        }}
      >
        <div className="container mx-auto px-6 text-center">
          <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-4">
            Trang Quản Trị
          </h1>
          <p className="text-lg md:text-xl text-gray-200">
            Quản lý bác sĩ và hệ thống an toàn với công nghệ blockchain.
          </p>
        </div>
      </section>

      {/* Admin Content */}
      <section className="py-16">
        <div className="container mx-auto px-6">
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Sidebar Navigation */}
            <div className="lg:w-1/4 bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-6">Điều hướng</h2>
              <ul className="space-y-4">
                <li>
                  <Link
                    to="/admin"
                    className="block py-2 px-4 text-indigo-600 font-semibold bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-all duration-200"
                  >
                    Quản trị
                  </Link>
                </li>
                <li>
                  <Link
                    to="/admin/users"
                    className="block py-2 px-4 text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all duration-200"
                  >
                    Người dùng
                  </Link>
                </li>
                <li>
                  <Link
                    to="/admin/records"
                    className="block py-2 px-4 text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all duration-200"
                  >
                    Hồ sơ y tế
                  </Link>
                </li>
              </ul>
            </div>

            {/* Admin Content */}
            <div className="lg:w-3/4 bg-white rounded-xl shadow-lg p-8">
              <h2 className="text-2xl font-bold text-gray-800 mb-6">
                Quản lý hệ thống
              </h2>

              {/* Admin Address */}
              <div className="mb-8">
                <p className="text-lg font-semibold text-gray-700">
                  Địa chỉ Admin: <span className="font-mono text-indigo-600">{adminAddress}</span>
                </p>
              </div>

              {/* Transfer Admin */}
              <div className="mb-8">
                <h3 className="text-xl font-semibold text-gray-800 mb-4">Chuyển quyền Admin</h3>
                <div className="flex flex-col sm:flex-row gap-4">
                  <input
                    type="text"
                    value={newAdminAddress}
                    onChange={(e) => setNewAdminAddress(e.target.value)}
                    placeholder="Nhập địa chỉ admin mới (0x...)"
                    className="flex-1 p-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 hover:shadow-sm"
                  />
                  <button
                    onClick={handleTransferAdmin}
                    disabled={isTransferring}
                    className="py-3 px-6 text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 to-blue-500 rounded-lg hover:from-indigo-700 hover:to-blue-600 shadow-md transition-all duration-300 transform hover:scale-105 disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    {isTransferring ? "Đang chuyển..." : "Chuyển quyền"}
                  </button>
                </div>
              </div>

              {/* Verify Doctor */}
              <div className="mb-8">
                <h3 className="text-xl font-semibold text-gray-800 mb-4">Xác minh bác sĩ</h3>
                <div className="flex flex-col sm:flex-row gap-4">
                  <input
                    type="text"
                    value={doctorAddressToVerify}
                    onChange={(e) => setDoctorAddressToVerify(e.target.value)}
                    placeholder="Nhập địa chỉ bác sĩ (0x...)"
                    className="flex-1 p-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 hover:shadow-sm"
                  />
                  <button
                    onClick={() => handleVerifyDoctor(doctorAddressToVerify)}
                    disabled={isVerifying}
                    className="py-3 px-6 text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 to-blue-500 rounded-lg hover:from-indigo-700 hover:to-blue-600 shadow-md transition-all duration-300 transform hover:scale-105 disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    {isVerifying ? "Đang xác minh..." : "Xác minh"}
                  </button>
                </div>
              </div>

              {/* Doctors List */}
              <div>
                <h3 className="text-xl font-semibold text-gray-800 mb-4">Danh sách bác sĩ</h3>
                {doctors.length === 0 ? (
                  <p className="text-gray-600 text-center">Chưa có bác sĩ nào được đăng ký.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full table-auto">
                      <thead>
                        <tr className="bg-gray-100">
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-800">
                            Họ tên
                          </th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-800">
                            Địa chỉ
                          </th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-800">
                            Trạng thái
                          </th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-800">
                            Chứng chỉ
                          </th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-800">
                            Hành động
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {doctors.map((doctor) => (
                          <tr
                            key={doctor.address}
                            className="border-b hover:bg-gray-50 transition-all duration-200"
                          >
                            <td className="px-4 py-3 text-gray-700">{doctor.fullName}</td>
                            <td className="px-4 py-3 text-gray-700 font-mono text-sm">
                              {doctor.address}
                            </td>
                            <td className="px-4 py-3">
                              <span
                                className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                  doctor.isVerified
                                    ? "bg-green-100 text-green-800"
                                    : "bg-yellow-100 text-yellow-800"
                                }`}
                              >
                                {doctor.isVerified ? "Đã xác minh" : "Chưa xác minh"}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              {doctor.ipfsHash ? (
                                <a
                                  href={`https://ipfs.io/ipfs/${doctor.ipfsHash}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-indigo-600 hover:text-indigo-800"
                                >
                                  <img
                                    src={`https://ipfs.io/ipfs/${doctor.ipfsHash}`}
                                    alt="Certificate"
                                    className="w-16 h-16 object-cover rounded"
                                    onError={(e) => {
                                      e.target.alt = "Không thể tải chứng chỉ";
                                      e.target.src = "/placeholder-image.png"; // Fallback image
                                    }}
                                  />
                                </a>
                              ) : (
                                <span className="text-gray-500">Không có chứng chỉ</span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              {!doctor.isVerified && (
                                <button
                                  onClick={() => handleVerifyDoctor(doctor.address)}
                                  disabled={isVerifying}
                                  className="py-1 px-4 text-sm font-medium text-white bg-indigo-500 rounded-lg hover:bg-indigo-600 transition-all duration-300 disabled:bg-gray-400 disabled:cursor-not-allowed"
                                >
                                  Xác minh
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default Admin;