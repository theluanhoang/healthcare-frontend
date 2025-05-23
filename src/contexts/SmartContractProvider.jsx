import { ethers } from "ethers";
import { createContext, useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import HealthcareABI from "../contracts/HealthcareABI.json";

export const SmartContractContext = createContext();

const contractAddress = "0x0b4780C3A1961D7c4cD34472826448091C1a7FcB";

export const SmartContractProvider = ({ children }) => {
  const [signer, setSigner] = useState(null);
  const [walletAddress, setWalletAddress] = useState(null);
  const [provider, setProvider] = useState(null);
  const [contract, setContract] = useState(null);
  const [error, setError] = useState(null);
  const [doctors, setDoctors] = useState([]);
  const [patients, setPatients] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [pendingDoctorRegistrations, setPendingDoctorRegistrations] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const initContract = useCallback(async () => {
    if (!window.ethereum) {
      const errorMsg = "Vui lòng cài đặt MetaMask để tiếp tục.";
      setError(errorMsg);
      toast.error(errorMsg);
      throw new Error(errorMsg);
    }

    setIsLoading(true);
    try {
      console.log("Khởi tạo hợp đồng...");
      const provider = new ethers.BrowserProvider(window.ethereum);
      const network = await provider.getNetwork();
      if (network.chainId !== BigInt(1337)) {
        const errorMsg = "Vui lòng chuyển MetaMask sang mạng Hardhat local (Chain ID: 1337).";
        setError(errorMsg);
        toast.error(errorMsg);
        throw new Error(errorMsg);
      }

      await provider.send("eth_requestAccounts", []);
      const signer = await provider.getSigner();
      const contractInstance = new ethers.Contract(contractAddress, HealthcareABI, signer);

      setProvider(provider);
      setSigner(signer);
      setContract(contractInstance);
      setError(null);

      const address = await signer.getAddress();
      setWalletAddress(address);

      console.log("Khởi tạo hợp đồng hoàn tất.");
    } catch (error) {
      console.error("Lỗi khởi tạo hợp đồng:", error);
      const errorMsg = error.message || "Không thể khởi tạo hợp đồng.";
      setError(errorMsg);
      toast.error(errorMsg);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const connectWallet = useCallback(async () => {
    if (!window.ethereum) {
      const errorMsg = "Vui lòng cài đặt MetaMask để tiếp tục.";
      setError(errorMsg);
      toast.error(errorMsg);
      return;
    }

    try {
      if (!contract || !signer) await initContract();
      const address = await signer.getAddress();
      setWalletAddress(address);
      setError(null);
      return address;
    } catch (error) {
      console.error("Lỗi kết nối ví:", error);
      const errorMsg = error.message || "Không thể kết nối ví.";
      setError(errorMsg);
      toast.error(errorMsg);
      throw error;
    }
  }, [contract, signer, initContract]);

  const getUser = useCallback(
    async (address) => {
      if (!address || !contract) {
        const errorMsg = "Hợp đồng hoặc địa chỉ ví chưa sẵn sàng.";
        setError(errorMsg);
        toast.error(errorMsg);
        throw new Error(errorMsg);
      }

      try {
        const userData = await contract.getUser(address);
        console.log("Dữ liệu người dùng:", userData);
        const [role, isVerified, ipfsHash, fullName, email] = userData;
        return {
          fullName,
          email,
          role: role.toString(),
          isVerified,
          ipfsHash,
        };
      } catch (error) {
        console.error("Lỗi lấy thông tin người dùng:", error);
        const errorMsg = "Không thể lấy thông tin người dùng.";
        setError(errorMsg);
        toast.error(errorMsg);
        throw error;
      }
    },
    [contract]
  );

  const disconnectWallet = useCallback(async () => {
    try {
      setWalletAddress(null);
      setSigner(null);
      setProvider(null);
      setContract(null);
      setError(null);
      setDoctors([]);
      setPatients([]);
      setPendingDoctorRegistrations([]);
      setNotifications([]);
    } catch (error) {
      console.error("Lỗi ngắt kết nối ví:", error);
      const errorMsg = "Không thể ngắt kết nối ví.";
      setError(errorMsg);
      toast.error(errorMsg);
    }
  }, []);

  const fetchDoctors = useCallback(async () => {
    if (!contract || !contract.getAllDoctors) {
      console.warn("Hợp đồng hoặc hàm getAllDoctors không khả dụng.");
      return [];
    }

    try {
      const [addresses, isVerified, fullNames, ipfsHashes] = await contract.getAllDoctors();
      console.log("Dữ liệu bác sĩ:", { addresses, isVerified, fullNames, ipfsHashes });
      if (
        !Array.isArray(addresses) ||
        !Array.isArray(isVerified) ||
        !Array.isArray(fullNames) ||
        !Array.isArray(ipfsHashes) ||
        addresses.length !== isVerified.length ||
        addresses.length !== fullNames.length ||
        addresses.length !== ipfsHashes.length
      ) {
        throw new Error("Dữ liệu từ getAllDoctors không hợp lệ hoặc không đồng bộ.");
      }

      const doctorList = await Promise.all(
        addresses.map(async (addr, index) => {
          const voteCount = await contract.verificationVotes(addr);
          return {
            address: addr,
            fullName: fullNames[index],
            isVerified: isVerified[index],
            ipfsHash: ipfsHashes[index],
            voteCount: Number(voteCount),
          };
        })
      );

      setDoctors((prev) => {
        if (JSON.stringify(prev) === JSON.stringify(doctorList)) return prev;
        return doctorList;
      });
      setPendingDoctorRegistrations((prev) => {
        const pendingList = doctorList.filter((doc) => !doc.isVerified);
        if (JSON.stringify(prev) === JSON.stringify(pendingList)) return prev;
        return pendingList;
      });
      console.log("Cập nhật danh sách bác sĩ:", doctorList);
      return doctorList;
    } catch (error) {
      console.error("Lỗi lấy danh sách bác sĩ:", error);
      toast.error(`Không thể lấy danh sách bác sĩ: ${error.message}`);
      return [];
    }
  }, [contract]);

  const fetchPatients = useCallback(async () => {
    if (!contract) {
      console.warn("Hợp đồng không khả dụng.");
      return [];
    }

    try {
      const userCount = await contract.getUserAddressesLength();
      console.log("Số lượng người dùng:", Number(userCount));

      const addresses = [];
      for (let i = 0; i < userCount; i++) {
        const addr = await contract.userAddresses(i);
        addresses.push(addr);
      }
      console.log("Danh sách địa chỉ người dùng:", addresses);

      const formattedPatients = await Promise.all(
        addresses.map(async (addr) => {
          const user = await getUser(addr);
          if (user.role === "1") {
            return {
              address: addr,
              fullName: user.fullName,
              email: user.email,
            };
          }
          return null;
        })
      );
      const patientsList = formattedPatients.filter((p) => p !== null);

      setPatients((prev) => {
        if (JSON.stringify(prev) === JSON.stringify(patientsList)) return prev;
        return patientsList;
      });
      console.log("Cập nhật danh sách bệnh nhân:", patientsList);
      return patientsList;
    } catch (error) {
      console.error("Lỗi lấy danh sách bệnh nhân:", error);
      toast.error("Không thể lấy danh sách bệnh nhân.");
      return [];
    }
  }, [contract, getUser]);

  const getAllMedicalRecords = useCallback(async () => {
    if (!contract) {
      const errorMsg = "Hợp đồng chưa sẵn sàng.";
      setError(errorMsg);
      toast.error(errorMsg);
      throw new Error(errorMsg);
    }

    try {
      let recordCount;
      try {
        recordCount = await contract.medicalRecords.length();
        console.log("Số lượng bệnh án:", Number(recordCount));
      } catch (error) {
        console.warn("Không thể lấy độ dài medicalRecords, có thể mảng rỗng:", error);
        return [];
      }

      if (!recordCount || recordCount === 0) {
        console.log("Không có bệnh án nào trong medicalRecords.");
        return [];
      }

      const records = [];
      for (let i = 0; i < recordCount; i++) {
        try {
          const record = await contract.medicalRecords(i);
          console.log(`Bệnh án tại index ${i}:`, record);
          const doctorInfo = await getUser(record.doctor);
          records.push({
            recordIndex: i.toString(),
            patient: record.patient.toLowerCase(),
            doctor: record.doctor.toLowerCase(),
            doctorName: doctorInfo.fullName,
            ipfsHash: record.ipfsHash,
            recordType: Number(record.recordType),
            timestamp: Number(record.timestamp),
            isApproved: record.isApproved,
          });
        } catch (error) {
          console.error(`Lỗi khi lấy bệnh án tại index ${i}:`, error);
          continue;
        }
      }
      console.log("Tất cả bệnh án:", records);
      return records;
    } catch (error) {
      console.error("Lỗi lấy tất cả bệnh án:", error);
      const errorMsg = "Không thể lấy danh sách bệnh án.";
      setError(errorMsg);
      toast.error(errorMsg);
      throw error;
    }
  }, [contract, getUser]);

  const getMedicalRecordsByDoctor = useCallback(
    async (doctorAddress = walletAddress) => {
      if (!contract || !doctorAddress) {
        const errorMsg = "Hợp đồng hoặc địa chỉ bác sĩ chưa sẵn sàng.";
        setError(errorMsg);
        toast.error(errorMsg);
        throw new Error(errorMsg);
      }

      try {
        console.log("Gọi getMedicalRecordsByDoctor với địa chỉ:", doctorAddress);
        const records = await contract.getMedicalRecordsByDoctor(doctorAddress);
        console.log("Dữ liệu bệnh án thô:", records);
        const formattedRecords = await Promise.all(
          records.map(async (record, index) => {
            const doctorInfo = await getUser(record.doctor);
            return {
              recordIndex: index.toString(),
              patient: record.patient.toLowerCase(),
              doctor: record.doctor.toLowerCase(),
              doctorName: doctorInfo.fullName,
              ipfsHash: record.ipfsHash,
              recordType: Number(record.recordType),
              timestamp: Number(record.timestamp),
              isApproved: record.isApproved,
            };
          })
        );
        console.log("Hồ sơ y tế của bác sĩ:", formattedRecords);
        return formattedRecords;
      } catch (error) {
        console.error("Lỗi lấy hồ sơ y tế của bác sĩ:", error);
        if (error.reason && error.reason.includes("require")) {
          console.warn("Lỗi require, có thể địa chỉ không phải bác sĩ hoặc chưa xác minh:", doctorAddress);
          return []; // Trả về mảng rỗng thay vì throw lỗi
        }
        const errorMsg = "Không thể lấy hồ sơ y tế của bác sĩ.";
        setError(errorMsg);
        toast.error(errorMsg);
        throw error;
      }
    },
    [contract, walletAddress, getUser]
  );

  const getMedicalRecords = useCallback(
    async (patientAddress = walletAddress) => {
      if (!contract || !patientAddress) {
        const errorMsg = "Hợp đồng hoặc địa chỉ bệnh nhân chưa sẵn sàng.";
        setError(errorMsg);
        toast.error(errorMsg);
        throw new Error(errorMsg);
      }

      try {
        const records = await contract.getMedicalRecords(patientAddress);
        const formattedRecords = await Promise.all(
          records.map(async (record) => {
            const doctorInfo = await getUser(record.doctor);
            return {
              ipfsHash: record.ipfsHash,
              patient: record.patient,
              doctor: record.doctor,
              doctorName: doctorInfo.fullName,
              recordType: Number(record.recordType),
              timestamp: Number(record.timestamp),
              isApproved: record.isApproved,
            };
          })
        );
        console.log("Hồ sơ y tế:", formattedRecords);
        return formattedRecords;
      } catch (error) {
        console.error("Lỗi lấy hồ sơ y tế:", error);
        const errorMsg = "Không thể lấy hồ sơ y tế.";
        setError(errorMsg);
        toast.error(errorMsg);
        throw error;
      }
    },
    [contract, walletAddress, getUser]
  );

  const getPatientSharedRecords = useCallback(
    async (patientAddress = walletAddress) => {
      if (!contract || !patientAddress) {
        const errorMsg = "Hợp đồng hoặc địa chỉ bệnh nhân chưa sẵn sàng.";
        setError(errorMsg);
        toast.error(errorMsg);
        throw new Error(errorMsg);
      }

      try {
        const records = await contract.getPatientSharedRecords(patientAddress);
        const formattedRecords = await Promise.all(
          records.map(async (record) => {
            const doctorInfo = await getUser(record.doctor);
            const patientInfo = await getUser(record.patient);
            return {
              ipfsHash: record.ipfsHash,
              patient: record.patient,
              patientName: patientInfo.fullName,
              doctor: record.doctor,
              doctorName: doctorInfo.fullName,
              recordType: Number(record.recordType),
              notes: record.notes,
              timestamp: Number(record.timestamp),
            };
          })
        );
        console.log("Hồ sơ chia sẻ:", formattedRecords);
        return formattedRecords;
      } catch (error) {
        console.error("Lỗi lấy lịch sử chia sẻ:", error);
        const errorMsg = "Không thể lấy lịch sử chia sẻ.";
        setError(errorMsg);
        toast.error(errorMsg);
        throw error;
      }
    },
    [contract, walletAddress, getUser]
  );

  const getPendingRecords = useCallback(
    async (patientAddress = walletAddress) => {
      if (!contract || !patientAddress) {
        const errorMsg = "Hợp đồng hoặc địa chỉ bệnh nhân chưa sẵn sàng.";
        setError(errorMsg);
        toast.error(errorMsg);
        throw new Error(errorMsg);
      }

      try {
        const records = await contract.getPendingRecords(patientAddress);
        const formattedRecords = await Promise.all(
          records.map(async (record) => {
            const doctorInfo = await getUser(record.doctor);
            return {
              ipfsHash: record.ipfsHash,
              patient: record.patient,
              doctor: record.doctor,
              doctorName: doctorInfo.fullName,
              recordType: Number(record.recordType),
              timestamp: Number(record.timestamp),
            };
          })
        );
        console.log("Hồ sơ chờ phê duyệt:", formattedRecords);
        return formattedRecords;
      } catch (error) {
        console.error("Lỗi lấy hồ sơ chờ phê duyệt:", error);
        const errorMsg = "Không thể lấy hồ sơ chờ phê duyệt.";
        setError(errorMsg);
        toast.error(errorMsg);
        throw error;
      }
    },
    [contract, walletAddress, getUser]
  );

  const addMedicalRecord = useCallback(
    async (patientAddress, ipfsHash, recordType) => {
      if (!contract || !walletAddress) {
        const errorMsg = "Hợp đồng hoặc ví chưa sẵn sàng.";
        setError(errorMsg);
        toast.error(errorMsg);
        throw new Error(errorMsg);
      }

      try {
        const tx = await contract.addMedicalRecord(patientAddress, ipfsHash, recordType);
        await tx.wait();
        toast.success("Thêm hồ sơ y tế thành công!");
      } catch (error) {
        console.error("Lỗi thêm hồ sơ y tế:", error);
        const errorMsg = error.message || "Không thể thêm hồ sơ y tế.";
        setError(errorMsg);
        toast.error(errorMsg);
        throw error;
      }
    },
    [contract, walletAddress]
  );

  const approveMedicalRecord = useCallback(
    async (recordIndex) => {
      if (!contract || !walletAddress) {
        const errorMsg = "Hợp đồng hoặc ví chưa sẵn sàng.";
        setError(errorMsg);
        toast.error(errorMsg);
        throw new Error(errorMsg);
      }

      try {
        const tx = await contract.approveMedicalRecord(recordIndex);
        await tx.wait();
        toast.success("Phê duyệt hồ sơ y tế thành công!");
      } catch (error) {
        console.error("Lỗi phê duyệt hồ sơ y tế:", error);
        const errorMsg = error.message || "Không thể phê duyệt hồ sơ y tế.";
        setError(errorMsg);
        toast.error(errorMsg);
        throw error;
      }
    },
    [contract, walletAddress]
  );

  const shareMedicalRecord = useCallback(
    async (doctorAddress, ipfsHash, recordType, notes) => {
      if (!contract || !walletAddress) {
        const errorMsg = "Hợp đồng hoặc ví chưa sẵn sàng.";
        setError(errorMsg);
        toast.error(errorMsg);
        throw new Error(errorMsg);
      }

      try {
        const tx = await contract.shareMedicalRecord(doctorAddress, ipfsHash, recordType, notes);
        await tx.wait();
        toast.success("Chia sẻ hồ sơ y tế thành công!");
      } catch (error) {
        console.error("Lỗi chia sẻ hồ sơ y tế:", error);
        const errorMsg = error.message || "Không thể chia sẻ hồ sơ y tế.";
        setError(errorMsg);
        toast.error(errorMsg);
        throw error;
      }
    },
    [contract, walletAddress]
  );

  const voteForDoctor = useCallback(
    async (doctorAddress) => {
      if (!contract || !walletAddress) {
        const errorMsg = "Hợp đồng hoặc ví chưa sẵn sàng.";
        setError(errorMsg);
        toast.error(errorMsg);
        throw new Error(errorMsg);
      }

      try {
        const tx = await contract.voteForDoctor(doctorAddress);
        await tx.wait();
        toast.success("Bỏ phiếu xác minh bác sĩ thành công!");
        await fetchDoctors();
      } catch (error) {
        console.error("Lỗi bỏ phiếu xác minh bác sĩ:", error);
        const errorMsg = error.message || "Không thể bỏ phiếu xác minh bác sĩ.";
        setError(errorMsg);
        toast.error(errorMsg);
        throw error;
      }
    },
    [contract, walletAddress, fetchDoctors]
  );

  const refreshData = useCallback(async () => {
    try {
      setIsLoading(true);
      await Promise.all([fetchDoctors(), fetchPatients()]);
      toast.success("Dữ liệu đã được làm mới!");
    } catch (error) {
      console.error("Lỗi làm mới dữ liệu:", error);
      toast.error("Không thể làm mới dữ liệu.");
    } finally {
      setIsLoading(false);
    }
  }, [fetchDoctors, fetchPatients]);

  useEffect(() => {
    if (contract && walletAddress) {
      fetchDoctors();
    }
  }, [contract, walletAddress, fetchDoctors]);

  const userListener = useCallback(
    async (userAddress, role, fullName) => {
      console.log("Sự kiện UserRegistered:", { userAddress, role: role.toString(), fullName });
      try {
        const currentUser = await getUser(walletAddress);
        const isVerifiedDoctor = currentUser.role === "2" && currentUser.isVerified;

        if (role.toString() === "2" && isVerifiedDoctor) {
          const user = await getUser(userAddress);
          if (user.role === "2" && !user.isVerified) {
            setPendingDoctorRegistrations((prev) => {
              if (prev.some((doc) => doc.address === userAddress)) return prev;
              return [...prev, { address: userAddress, fullName, timestamp: Date.now() }];
            });
            setNotifications((prev) => [
              ...prev,
              {
                id: `doctor-${userAddress}`,
                message: `Bác sĩ mới đăng ký: ${fullName}. Vui lòng xác minh!`,
                timestamp: Date.now(),
                path: "/doctor/add-record",
              },
            ]);
          }
        }

        if (role.toString() === "1") {
          console.log("Cập nhật danh sách bệnh nhân...");
          await fetchPatients();
        }
        console.log("Cập nhật danh sách bác sĩ...");
        await fetchDoctors();
      } catch (error) {
        console.error("Lỗi xử lý sự kiện UserRegistered:", error);
      }
    },
    [walletAddress, getUser, fetchPatients, fetchDoctors]
  );

  const verifiedListener = useCallback(
    async (doctorAddress, fullName) => {
      console.log("Sự kiện DoctorVerified:", { doctorAddress, fullName });
      try {
        setPendingDoctorRegistrations((prev) => prev.filter((doc) => doc.address !== doctorAddress));
        await fetchDoctors();
        toast.success(`Bác sĩ ${fullName} đã được xác minh!`);
      } catch (error) {
        console.error("Lỗi xử lý sự kiện DoctorVerified:", error);
      }
    },
    [fetchDoctors]
  );

  const recordAddedListener = useCallback(
    async (recordIndex, patient, doctor, ipfsHash) => {
      console.log("Sự kiện MedicalRecordAdded:", { recordIndex, patient, doctor, ipfsHash });
      try {
        if (patient === walletAddress) {
          setNotifications((prev) => [
            ...prev,
            {
              id: `record-${recordIndex}`,
              message: `Hồ sơ y tế mới từ bác sĩ ${doctor}. Vui lòng phê duyệt!`,
              timestamp: Date.now(),
              path: "/patient/share",
            },
          ]);
        }
      } catch (error) {
        console.error("Lỗi xử lý sự kiện MedicalRecordAdded:", error);
      }
    },
    [walletAddress]
  );

  const recordApprovedListener = useCallback(
    async (recordIndex, patient) => {
      console.log("Sự kiện MedicalRecordApproved:", { recordIndex, patient });
      try {
        if (patient === walletAddress) {
          toast.success("Hồ sơ y tế đã được phê duyệt!");
        }
      } catch (error) {
        console.error("Lỗi xử lý sự kiện MedicalRecordApproved:", error);
      }
    },
    [walletAddress]
  );

  const recordSharedListener = useCallback(
    async (recordIndex, patient, doctor, ipfsHash) => {
      console.log("Sự kiện MedicalRecordShared:", { recordIndex, patient, doctor, ipfsHash });
      try {
        if (patient === walletAddress) {
          toast.success("Hồ sơ y tế đã được chia sẻ!");
        }
      } catch (error) {
        console.error("Lỗi xử lý sự kiện MedicalRecordShared:", error);
      }
    },
    [walletAddress]
  );

  useEffect(() => {
    if (window.ethereum) initContract();
  }, [initContract]);

  useEffect(() => {
    if (!contract || !walletAddress) return;

    const userFilter = contract.filters.UserRegistered(null, null);
    const verifiedFilter = contract.filters.DoctorVerified(null);
    const recordAddedFilter = contract.filters.MedicalRecordAdded(null, null, null);
    const recordApprovedFilter = contract.filters.MedicalRecordApproved(null, null);
    const recordSharedFilter = contract.filters.MedicalRecordShared(null, null, null);

    contract.on(userFilter, userListener);
    contract.on(verifiedFilter, verifiedListener);
    contract.on(recordAddedFilter, recordAddedListener);
    contract.on(recordApprovedFilter, recordApprovedListener);
    contract.on(recordSharedFilter, recordSharedListener);

    return () => {
      contract.off(userFilter, userListener);
      contract.off(verifiedFilter, verifiedListener);
      contract.off(recordAddedFilter, recordAddedListener);
      contract.off(recordApprovedFilter, recordApprovedListener);
      contract.off(recordSharedFilter, recordSharedListener);
    };
  }, [
    contract,
    walletAddress,
    userListener,
    verifiedListener,
    recordAddedListener,
    recordApprovedListener,
    recordSharedListener,
  ]);

  const contextValue = useMemo(
    () => ({
      initContract,
      contract,
      signer,
      provider,
      error,
      doctors,
      patients,
      walletAddress,
      connectWallet,
      getUser,
      disconnectWallet,
      fetchDoctors,
      fetchPatients,
      getAllMedicalRecords,
      getMedicalRecordsByDoctor,
      getMedicalRecords,
      getPatientSharedRecords,
      getPendingRecords,
      addMedicalRecord,
      approveMedicalRecord,
      shareMedicalRecord,
      voteForDoctor,
      pendingDoctorRegistrations,
      notifications,
      isLoading,
      refreshData,
    }),
    [
      initContract,
      contract,
      signer,
      provider,
      error,
      doctors,
      patients,
      walletAddress,
      connectWallet,
      getUser,
      disconnectWallet,
      fetchDoctors,
      fetchPatients,
      getAllMedicalRecords,
      getMedicalRecordsByDoctor,
      getMedicalRecords,
      getPatientSharedRecords,
      getPendingRecords,
      addMedicalRecord,
      approveMedicalRecord,
      shareMedicalRecord,
      voteForDoctor,
      pendingDoctorRegistrations,
      notifications,
      isLoading,
      refreshData,
    ]
  );

  return <SmartContractContext.Provider value={contextValue}>{children}</SmartContractContext.Provider>;
};