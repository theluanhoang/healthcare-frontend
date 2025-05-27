"use client";

import { ethers } from "ethers";
import { createContext, useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import HealthcareABI from "../contracts/HealthcareABI.json";
import { eventHandler } from "../utils/EventHandler";

export const SmartContractContext = createContext();

const contractAddress = "0x46633a3ACFf46Be8CD553677De3B606abdE28892";

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
  const [appointments, setAppointments] = useState([]);
  const [availabilitySlots, setAvailabilitySlots] = useState([]);
  const [authorizedPatients, setAuthorizedPatients] = useState([]);

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
      console.error("Lỗi khởi tạo hợp đồng:", JSON.stringify(error, null, 2));
      const errorMsg = error.reason || error.message || "Không thể khởi tạo hợp đồng.";
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
      if (!contract || !signer) {
        await initContract();
      }

      if (!signer) {
        throw new Error("Không thể khởi tạo signer");
      }

      const address = await signer.getAddress();

      if (!address || typeof address !== "string") {
        throw new Error("Không thể lấy địa chỉ ví");
      }

      console.log("connectWallet: Địa chỉ ví:", address);
      setWalletAddress(address);
      setError(null);
      return address;
    } catch (error) {
      console.error("connectWallet: Lỗi kết nối ví:", JSON.stringify(error, null, 2));
      const errorMsg = error.reason || error.message || "Không thể kết nối ví.";
      setError(errorMsg);
      toast.error(errorMsg);
      throw error;
    }
  }, [contract, signer, initContract]);

  const getUser = useCallback(
    async (address) => {
      if (!address) {
        console.warn("getUser: Địa chỉ không được cung cấp");
        throw new Error("Địa chỉ không được cung cấp");
      }

      if (Array.isArray(address)) {
        console.error("getUser: Địa chỉ không thể là mảng:", address);
        throw new Error("Địa chỉ không hợp lệ - không được là mảng");
      }

      if (typeof address !== "string" || address.trim() === "") {
        console.error("getUser: Địa chỉ phải là chuỗi không rỗng:", address);
        throw new Error("Địa chỉ phải là chuỗi không rỗng");
      }

      if (!/^0x[a-fA-F0-9]{40}$/.test(address.trim())) {
        console.error("getUser: Địa chỉ Ethereum không hợp lệ:", address);
        throw new Error("Địa chỉ Ethereum không hợp lệ");
      }

      if (!contract) {
        const errorMsg = "Hợp đồng chưa sẵn sàng.";
        console.error("getUser:", errorMsg);
        throw new Error(errorMsg);
      }

      try {
        console.log("getUser: Đang lấy thông tin cho địa chỉ:", address.trim());
        const userData = await contract.getUser(address.trim());
        console.log("getUser: Dữ liệu người dùng thô:", userData);

        const [role, isVerified, ipfsHash, fullName, email] = userData;

        const result = {
          fullName: fullName || "",
          email: email || "",
          role: role.toString(),
          isVerified: Boolean(isVerified),
          ipfsHash: ipfsHash || "",
        };

        console.log("getUser: Dữ liệu người dùng đã format:", result);
        return result;
      } catch (error) {
        console.error("getUser: Lỗi lấy thông tin người dùng:", JSON.stringify(error, null, 2));
        if (error.reason?.includes("not registered")) {
          throw new Error("Người dùng chưa đăng ký trong hệ thống");
        }
        if (error.code === "INVALID_ARGUMENT") {
          throw new Error("Địa chỉ không hợp lệ hoặc không đúng định dạng");
        }
        throw new Error(`Không thể lấy thông tin người dùng: ${error.reason || error.message}`);
      }
    },
    [contract],
  );

  const disconnectWallet = useCallback(async () => {
    try {
      eventHandler.cleanup();
      setWalletAddress(null);
      setSigner(null);
      setProvider(null);
      setContract(null);
      setError(null);
      setDoctors([]);
      setPatients([]);
      setPendingDoctorRegistrations([]);
      setNotifications([]);
      setAppointments([]);
      setAvailabilitySlots([]);
      setAuthorizedPatients([]);
    } catch (error) {
      console.error("Lỗi ngắt kết nối ví:", JSON.stringify(error, null, 2));
      const errorMsg = "Không thể ngắt kết nối ví.";
      setError(errorMsg);
      toast.error(errorMsg);
    }
  }, []);

  const fetchDoctors = useCallback(async () => {
    if (!contract || !contract.getAllDoctors) {
      console.warn("fetchDoctors: Hợp đồng hoặc hàm getAllDoctors không khả dụng.");
      return [];
    }

    try {
      const [addresses, isVerified, fullNames, ipfsHashes] = await contract.getAllDoctors();
      console.log("fetchDoctors: Dữ liệu bác sĩ thô:", { addresses, isVerified, fullNames, ipfsHashes });

      if (
        !Array.isArray(addresses) ||
        !Array.isArray(isVerified) ||
        !Array.isArray(fullNames) ||
        !Array.isArray(ipfsHashes)
      ) {
        throw new Error("Dữ liệu từ getAllDoctors không phải là mảng");
      }

      if (
        addresses.length !== isVerified.length ||
        addresses.length !== fullNames.length ||
        addresses.length !== ipfsHashes.length
      ) {
        throw new Error("Dữ liệu từ getAllDoctors không đồng bộ về độ dài");
      }

      if (addresses.length === 0) {
        console.log("fetchDoctors: Không có bác sĩ nào trong hệ thống");
        setDoctors([]);
        setPendingDoctorRegistrations([]);
        return [];
      }

      const doctorList = [];
      for (let index = 0; index < addresses.length; index++) {
        try {
          const addr = addresses[index];
          if (
            !addr ||
            typeof addr !== "string" ||
            addr === "0x0000000000000000000000000000000000000000"
          ) {
            console.warn(`fetchDoctors: Địa chỉ không hợp lệ tại index ${index}:`, addr);
            continue;
          }

          const voteCount = await contract.verificationVotes(addr);

          doctorList.push({
            address: addr,
            fullName: fullNames[index] || "Chưa cập nhật",
            isVerified: Boolean(isVerified[index]),
            ipfsHash: ipfsHashes[index] || "",
            voteCount: Number(voteCount),
          });
        } catch (error) {
          console.warn(`fetchDoctors: Lỗi xử lý bác sĩ tại index ${index}:`, error.message);
        }
      }

      setDoctors((prev) => {
        if (JSON.stringify(prev) === JSON.stringify(doctorList)) return prev;
        return doctorList;
      });

      const pendingList = doctorList.filter((doc) => !doc.isVerified);
      setPendingDoctorRegistrations((prev) => {
        if (JSON.stringify(prev) === JSON.stringify(pendingList)) return prev;
        return pendingList;
      });

      console.log("fetchDoctors: Cập nhật danh sách bác sĩ:", doctorList);
      return doctorList;
    } catch (error) {
      console.error("fetchDoctors: Lỗi lấy danh sách bác sĩ:", JSON.stringify(error, null, 2));
      toast.error(`Không thể lấy danh sách bác sĩ: ${error.reason || error.message}`);
      return [];
    }
  }, [contract]);

  const fetchPatients = useCallback(async () => {
    if (!contract) {
      console.warn("fetchPatients: Hợp đồng không khả dụng.");
      return [];
    }

    try {
      const userCount = await contract.getUserAddressesLength();
      console.log("fetchPatients: Số lượng người dùng:", Number(userCount));

      if (Number(userCount) === 0) {
        console.log("fetchPatients: Không có người dùng trong hệ thống");
        setPatients([]);
        return [];
      }

      const addresses = [];
      for (let i = 0; i < Number(userCount); i++) {
        try {
          const addr = await contract.userAddresses(i);
          if (
            addr &&
            typeof addr === "string" &&
            addr !== "0x0000000000000000000000000000000000000000"
          ) {
            addresses.push(addr);
          }
        } catch (error) {
          console.warn(`fetchPatients: Lỗi lấy địa chỉ tại index ${i}:`, error);
        }
      }

      console.log("fetchPatients: Danh sách địa chỉ người dùng:", addresses);

      if (addresses.length === 0) {
        console.log("fetchPatients: Không có địa chỉ hợp lệ");
        setPatients([]);
        return [];
      }

      const formattedPatients = [];
      for (const addr of addresses) {
        try {
          const user = await getUser(addr);
          if (user && user.role === "1") {
            formattedPatients.push({
              address: addr,
              fullName: user.fullName || "Chưa cập nhật",
              email: user.email || "Chưa cập nhật",
            });
          }
        } catch (error) {
          console.warn(`fetchPatients: Lỗi lấy thông tin người dùng ${addr}:`, error.message);
        }
      }

      console.log("fetchPatients: Danh sách bệnh nhân đã format:", formattedPatients);

      setPatients((prev) => {
        if (JSON.stringify(prev) === JSON.stringify(formattedPatients)) return prev;
        return formattedPatients;
      });

      return formattedPatients;
    } catch (error) {
      console.error("fetchPatients: Lỗi lấy danh sách bệnh nhân:", JSON.stringify(error, null, 2));
      toast.error(`Không thể lấy danh sách bệnh nhân: ${error.reason || error.message}`);
      return [];
    }
  }, [contract, getUser]);

  const getMedicalRecordsByDoctor = useCallback(
    async (doctorAddress = walletAddress) => {
      if (!contract || !doctorAddress) {
        const errorMsg = "Hợp đồng hoặc địa chỉ bác sĩ chưa sẵn sàng.";
        setError(errorMsg);
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
          }),
        );
        console.log("Hồ sơ y tế của bác sĩ:", formattedRecords);
        return formattedRecords;
      } catch (error) {
        console.error("Lỗi lấy hồ sơ y tế của bác sĩ:", JSON.stringify(error, null, 2));
        if (error.reason?.includes("OnlyVerifiedDoctor")) {
          console.warn("Địa chỉ không phải bác sĩ hoặc chưa xác minh:", doctorAddress);
          return [];
        }
        const errorMsg = "Không thể lấy hồ sơ y tế của bác sĩ.";
        setError(errorMsg);
        throw new Error(errorMsg);
      }
    },
    [contract, walletAddress, getUser],
  );

  const getMedicalRecords = useCallback(
    async (patientAddress = walletAddress) => {
      if (!contract || !patientAddress) {
        const errorMsg = "Hợp đồng hoặc địa chỉ bệnh nhân chưa sẵn sàng.";
        setError(errorMsg);
        throw new Error(errorMsg);
      }

      try {
        const records = await contract.getMedicalRecords(patientAddress);
        const formattedRecords = await Promise.all(
          records.map(async (record, index) => {
            const doctorInfo = await getUser(record.doctor);
            return {
              recordIndex: index.toString(),
              ipfsHash: record.ipfsHash,
              patient: record.patient,
              doctor: record.doctor,
              doctorName: doctorInfo.fullName,
              recordType: Number(record.recordType),
              timestamp: Number(record.timestamp),
              isApproved: record.isApproved,
            };
          }),
        );
        console.log("Hồ sơ y tế:", formattedRecords);
        return formattedRecords;
      } catch (error) {
        console.error("Lỗi lấy hồ sơ y tế:", JSON.stringify(error, null, 2));
        const errorMsg = "Không thể lấy hồ sơ y tế.";
        setError(errorMsg);
        throw new Error(errorMsg);
      }
    },
    [contract, walletAddress, getUser],
  );

  const getPatientSharedRecords = useCallback(
    async (patientAddress = walletAddress) => {
      if (!contract || !patientAddress) {
        const errorMsg = "Hợp đồng hoặc địa chỉ bệnh nhân chưa sẵn sàng.";
        setError(errorMsg);
        throw new Error(errorMsg);
      }

      try {
        const records = await contract.getPatientSharedRecords(patientAddress);
        const formattedRecords = await Promise.all(
          records.map(async (record, index) => {
            const doctorInfo = await getUser(record.doctor);
            const patientInfo = await getUser(record.patient);
            return {
              recordIndex: index.toString(),
              ipfsHash: record.ipfsHash,
              patient: record.patient,
              patientName: patientInfo.fullName,
              doctor: record.doctor,
              doctorName: doctorInfo.fullName,
              recordType: Number(record.recordType),
              notes: record.notes,
              timestamp: Number(record.timestamp),
            };
          }),
        );
        console.log("Hồ sơ chia sẻ:", formattedRecords);
        return formattedRecords;
      } catch (error) {
        console.error("Lỗi lấy hồ sơ chia sẻ:", JSON.stringify(error, null, 2));
        const errorMsg = "Không thể lấy hồ sơ chia sẻ.";
        setError(errorMsg);
        throw new Error(errorMsg);
      }
    },
    [contract, walletAddress, getUser],
  );

  const getPendingRecords = useCallback(
    async (patientAddress = walletAddress) => {
      if (!contract || !patientAddress) {
        const errorMsg = "Hợp đồng hoặc địa chỉ bệnh nhân chưa sẵn sàng.";
        setError(errorMsg);
        throw new Error(errorMsg);
      }

      try {
        const records = await contract.getPendingRecords(patientAddress);
        const formattedRecords = await Promise.all(
          records.map(async (record, index) => {
            const doctorInfo = await getUser(record.doctor);
            return {
              recordIndex: index.toString(),
              ipfsHash: record.ipfsHash,
              patient: record.patient,
              doctor: record.doctor,
              doctorName: doctorInfo.fullName,
              recordType: Number(record.recordType),
              timestamp: Number(record.timestamp),
            };
          }),
        );
        console.log("Hồ sơ chờ phê duyệt:", formattedRecords);
        return formattedRecords;
      } catch (error) {
        console.error("Lỗi lấy hồ sơ chờ phê duyệt:", JSON.stringify(error, null, 2));
        const errorMsg = "Không thể lấy hồ sơ chờ phê duyệt.";
        setError(errorMsg);
        throw new Error(errorMsg);
      }
    },
    [contract, walletAddress, getUser],
  );

  const addMedicalRecord = useCallback(
    async (patientAddress, ipfsHash, recordType) => {
      if (!contract || !walletAddress) {
        const errorMsg = "Hợp đồng hoặc ví chưa sẵn sàng.";
        setError(errorMsg);
        throw new Error(errorMsg);
      }

      try {
        const tx = await contract.addMedicalRecord(patientAddress, ipfsHash, recordType);
        await tx.wait();
        toast.success("Thêm hồ sơ y tế thành công!");
      } catch (error) {
        console.error("Lỗi thêm hồ sơ y tế:", JSON.stringify(error, null, 2));
        let errorMsg = "Không thể thêm hồ sơ y tế.";
        if (error.reason?.includes("OnlyVerifiedDoctor")) {
          errorMsg = "Chỉ bác sĩ đã xác minh mới có thể thêm hồ sơ.";
        } else if (error.reason?.includes("InvalidPatient")) {
          errorMsg = "Bệnh nhân không hợp lệ hoặc chưa đăng ký.";
        } else if (error.reason?.includes("InvalidRecordType")) {
          errorMsg = "Loại hồ sơ không hợp lệ.";
        }
        setError(errorMsg);
        toast.error(errorMsg);
        throw new Error(errorMsg);
      }
    },
    [contract, walletAddress],
  );

  const approveMedicalRecord = useCallback(
    async (recordIndex) => {
      if (!contract || !walletAddress) {
        const errorMsg = "Hợp đồng hoặc ví chưa sẵn sàng.";
        setError(errorMsg);
        throw new Error(errorMsg);
      }

      try {
        const tx = await contract.approveMedicalRecord(recordIndex);
        await tx.wait();
        toast.success("Phê duyệt hồ sơ y tế thành công!");
      } catch (error) {
        console.error("Lỗi phê duyệt hồ sơ y tế:", JSON.stringify(error, null, 2));
        let errorMsg = "Không thể phê duyệt hồ sơ y tế.";
        if (error.reason?.includes("InvalidRecordIndex")) {
          errorMsg = "Chỉ số hồ sơ không hợp lệ.";
        } else if (error.reason?.includes("OnlyPatientCanApprove")) {
          errorMsg = "Chỉ bệnh nhân mới có thể phê duyệt hồ sơ.";
        } else if (error.reason?.includes("RecordAlreadyApproved")) {
          errorMsg = "Hồ sơ đã được phê duyệt trước đó.";
        }
        setError(errorMsg);
        toast.error(errorMsg);
        throw new Error(errorMsg);
      }
    },
    [contract, walletAddress],
  );

  const shareMedicalRecord = useCallback(
    async (doctorAddress, ipfsHash, recordType, notes) => {
      if (!contract || !walletAddress) {
        const errorMsg = "Hợp đồng hoặc ví chưa sẵn sàng.";
        setError(errorMsg);
        throw new Error(errorMsg);
      }

      try {
        const tx = await contract.shareMedicalRecord(doctorAddress, ipfsHash, recordType, notes);
        await tx.wait();
        toast.success("Chia sẻ hồ sơ y tế thành công!");
      } catch (error) {
        console.error("Lỗi chia sẻ hồ sơ y tế:", JSON.stringify(error, null, 2));
        let errorMsg = "Không thể chia sẻ hồ sơ y tế.";
        if (error.reason?.includes("OnlyVerifiedPatient")) {
          errorMsg = "Chỉ bệnh nhân đã xác minh mới có thể chia sẻ hồ sơ.";
        } else if (error.reason?.includes("InvalidDoctor")) {
          errorMsg = "Bác sĩ không hợp lệ hoặc chưa xác minh.";
        } else if (error.reason?.includes("InvalidRecordType")) {
          errorMsg = "Loại hồ sơ không hợp lệ.";
        }
        setError(errorMsg);
        toast.error(errorMsg);
        throw new Error(errorMsg);
      }
    },
    [contract, walletAddress],
  );

  const voteForDoctor = useCallback(
    async (doctorAddress) => {
      if (!contract || !walletAddress) {
        const errorMsg = "Hợp đồng hoặc ví chưa sẵn sàng.";
        setError(errorMsg);
        throw new Error(errorMsg);
      }

      try {
        console.log("Voting for doctor:", doctorAddress);
        const tx = await contract.voteForDoctor(doctorAddress);
        console.log("Vote transaction sent:", tx.hash);
        await tx.wait();
        console.log("Vote transaction confirmed");
        toast.success("Bỏ phiếu xác minh bác sĩ thành công!");
        await fetchDoctors();
      } catch (error) {
        console.error("Lỗi bỏ phiếu xác minh bác sĩ:", JSON.stringify(error, null, 2));
        let errorMsg = "Không thể bỏ phiếu xác minh bác sĩ.";
        if (error.reason?.includes("OnlyVerifiedDoctor")) {
          errorMsg = "Chỉ bác sĩ đã xác minh mới có thể bỏ phiếu.";
        } else if (error.reason?.includes("InvalidDoctor")) {
          errorMsg = "Bác sĩ không hợp lệ hoặc đã được xác minh.";
        }
        setError(errorMsg);
        toast.error(errorMsg);
        throw new Error(errorMsg);
      }
    },
    [contract, walletAddress, fetchDoctors],
  );

  const fetchAvailabilitySlots = useCallback(
    async (doctorAddress = walletAddress) => {
      if (!contract || !doctorAddress) {
        console.warn("Hợp đồng hoặc địa chỉ bác sĩ không khả dụng.");
        return [];
      }

      try {
        const slots = await contract.getAvailabilitySlots(doctorAddress);
        const formattedSlots = slots.map((slot, index) => ({
          slotId: index,
          date: slot.date,
          startTime: slot.startTime,
          endTime: slot.endTime,
          isBooked: slot.isBooked,
          appointmentId: Number(slot.appointmentId),
        }));

        setAvailabilitySlots(formattedSlots);
        console.log("Lịch rảnh:", formattedSlots);
        return formattedSlots;
      } catch (error) {
        console.error("Lỗi lấy lịch rảnh:", JSON.stringify(error, null, 2));
        toast.error("Không thể lấy lịch rảnh.");
        return [];
      }
    },
    [contract, walletAddress],
  );

  const fetchAppointmentsByPatient = useCallback(
    async (patientAddress = walletAddress) => {
      if (!contract || !patientAddress) {
        console.warn("Hợp đồng hoặc địa chỉ bệnh nhân không khả dụng.");
        return [];
      }

      try {
        const appointments = await contract.getAppointmentsByPatient(patientAddress);
        const formattedAppointments = await Promise.all(
          appointments.map(async (apt) => {
            const doctorInfo = await getUser(apt.doctor);
            return {
              appointmentId: Number(apt.id),
              patient: apt.patient,
              doctor: apt.doctor,
              doctorName: doctorInfo.fullName,
              date: apt.date,
              time: apt.time,
              reason: apt.reason,
              status: Number(apt.status),
              timestamp: Number(apt.timestamp),
            };
          }),
        );

        setAppointments(formattedAppointments);
        console.log("Lịch hẹn của bệnh nhân:", formattedAppointments);
        return formattedAppointments;
      } catch (error) {
        console.error("Lỗi lấy lịch hẹn của bệnh nhân:", JSON.stringify(error, null, 2));
        toast.error("Không thể lấy lịch hẹn.");
        return [];
      }
    },
    [contract, walletAddress, getUser],
  );

  const fetchAppointmentsByDoctor = useCallback(
    async (doctorAddress = walletAddress) => {
      if (!contract || !doctorAddress) {
        console.warn("Hợp đồng hoặc địa chỉ bác sĩ không khả dụng.");
        return [];
      }

      try {
        const appointments = await contract.getAppointmentsByDoctor(doctorAddress);
        const formattedAppointments = await Promise.all(
          appointments.map(async (apt) => {
            const patientInfo = await getUser(apt.patient);
            return {
              appointmentId: Number(apt.id),
              patient: apt.patient,
              patientName: patientInfo.fullName,
              doctor: apt.doctor,
              date: apt.date,
              time: apt.time,
              reason: apt.reason,
              status: Number(apt.status),
              timestamp: Number(apt.timestamp),
            };
          }),
        );

        setAppointments(formattedAppointments);
        console.log("Lịch hẹn của bác sĩ:", formattedAppointments);
        return formattedAppointments;
      } catch (error) {
        console.error("Lỗi lấy lịch hẹn của bác sĩ:", JSON.stringify(error, null, 2));
        if (error.reason?.includes("OnlyVerifiedDoctor")) {
          console.warn("Địa chỉ không phải bác sĩ hoặc chưa xác minh:", doctorAddress);
          return [];
        }
        toast.error("Không thể lấy lịch hẹn.");
        return [];
      }
    },
    [contract, walletAddress, getUser],
  );

  const addAvailabilitySlot = useCallback(
    async (date, startTime, endTime) => {
      if (!contract || !walletAddress) {
        const errorMsg = "Hợp đồng hoặc ví chưa sẵn sàng.";
        setError(errorMsg);
        throw new Error(errorMsg);
      }

      try {
        const tx = await contract.addAvailabilitySlot(date, startTime, endTime);
        await tx.wait();
        toast.success("Thêm lịch rảnh thành công!");
        await fetchAvailabilitySlots();
      } catch (error) {
        console.error("Lỗi thêm lịch rảnh:", JSON.stringify(error, null, 2));
        let errorMsg = "Không thể thêm lịch rảnh.";
        if (error.reason?.includes("OnlyVerifiedDoctor")) {
          errorMsg = "Chỉ bác sĩ đã xác minh mới có thể thêm lịch rảnh.";
        }
        setError(errorMsg);
        toast.error(errorMsg);
        throw new Error(errorMsg);
      }
    },
    [contract, walletAddress, fetchAvailabilitySlots],
  );

  const bookAppointment = useCallback(
    async (doctorAddress, date, time, reason) => {
      if (!contract || !walletAddress) {
        const errorMsg = "Hợp đồng hoặc ví chưa sẵn sàng.";
        setError(errorMsg);
        throw new Error(errorMsg);
      }

      try {
        const tx = await contract.bookAppointment(doctorAddress, date, time, reason);
        await tx.wait();
        toast.success("Đặt lịch hẹn thành công!");
        await fetchAppointmentsByPatient();
        await fetchAvailabilitySlots(doctorAddress);
      } catch (error) {
        console.error("Lỗi đặt lịch hẹn:", JSON.stringify(error, null, 2));
        let errorMsg = "Không thể đặt lịch hẹn.";
        if (error.reason?.includes("OnlyVerifiedPatient")) {
          errorMsg = "Chỉ bệnh nhân đã xác minh mới có thể đặt lịch.";
        } else if (error.reason?.includes("InvalidDoctor")) {
          errorMsg = "Bác sĩ không hợp lệ hoặc chưa xác minh.";
        }
        setError(errorMsg);
        toast.error(errorMsg);
        throw new Error(errorMsg);
      }
    },
    [contract, walletAddress, fetchAppointmentsByPatient, fetchAvailabilitySlots],
  );

  const updateAppointmentStatus = useCallback(
    async (appointmentId, status) => {
      if (!contract || !walletAddress) {
        const errorMsg = "Hợp đồng hoặc ví chưa sẵn sàng.";
        setError(errorMsg);
        throw new Error(errorMsg);
      }

      try {
        const tx = await contract.updateAppointmentStatus(appointmentId, status);
        await tx.wait();
        toast.success("Cập nhật trạng thái lịch hẹn thành công!");
        await fetchAppointmentsByDoctor();
      } catch (error) {
        console.error("Lỗi cập nhật trạng thái lịch hẹn:", JSON.stringify(error, null, 2));
        let errorMsg = "Không thể cập nhật trạng thái lịch hẹn.";
        if (error.reason?.includes("InvalidAppointmentId")) {
          errorMsg = "ID lịch hẹn không hợp lệ.";
        } else if (error.reason?.includes("AppointmentNotFound")) {
          errorMsg = "Không tìm thấy lịch hẹn.";
        } else if (error.reason?.includes("OnlyAssignedDoctor")) {
          errorMsg = "Chỉ bác sĩ được phân công mới có thể cập nhật trạng thái.";
        }
        setError(errorMsg);
        toast.error(errorMsg);
        throw new Error(errorMsg);
      }
    },
    [contract, walletAddress, fetchAppointmentsByDoctor],
  );

  const grantAccessToDoctor = useCallback(
    async (doctorAddress) => {
      if (!contract || !walletAddress) {
        const errorMsg = "Hợp đồng hoặc ví chưa sẵn sàng.";
        setError(errorMsg);
        throw new Error(errorMsg);
      }

      try {
        const tx = await contract.grantAccessToDoctor(doctorAddress);
        await tx.wait();
        toast.success("Cấp quyền truy cập cho bác sĩ thành công!");
      } catch (error) {
        console.error("Lỗi cấp quyền truy cập:", JSON.stringify(error, null, 2));
        let errorMsg = "Không thể cấp quyền truy cập.";
        if (error.reason?.includes("OnlyVerifiedPatient")) {
          errorMsg = "Chỉ bệnh nhân đã xác minh mới có thể cấp quyền.";
        } else if (error.reason?.includes("InvalidDoctor")) {
          errorMsg = "Bác sĩ không hợp lệ hoặc chưa xác minh.";
        } else if (error.reason?.includes("AccessAlreadyJoined")) {
          errorMsg = "Quyền truy cập đã được cấp trước đó.";
        }
        setError(errorMsg);
        toast.error(errorMsg);
        throw new Error(errorMsg);
      }
    },
    [contract, walletAddress],
  );

  const revokeAccessFromDoctor = useCallback(
    async (doctorAddress) => {
      if (!contract || !walletAddress) {
        const errorMsg = "Hợp đồng hoặc ví chưa sẵn sàng.";
        setError(errorMsg);
        throw new Error(errorMsg);
      }

      try {
        const tx = await contract.revokeAccessFromDoctor(doctorAddress);
        await tx.wait();
        toast.success("Thu hồi quyền truy cập thành công!");
      } catch (error) {
        console.error("Lỗi thu hồi quyền truy cập:", JSON.stringify(error, null, 2));
        let errorMsg = "Không thể thu hồi quyền truy cập.";
        if (error.reason?.includes("OnlyVerifiedPatient")) {
          errorMsg = "Chỉ bệnh nhân đã xác minh mới có thể thu hồi quyền.";
        } else if (error.reason?.includes("AccessNotJoined")) {
          errorMsg = "Quyền truy cập chưa được cấp.";
        }
        setError(errorMsg);
        toast.error(errorMsg);
        throw new Error(errorMsg);
      }
    },
    [contract, walletAddress],
  );

  const hasAccessToPatient = useCallback(
    async (patientAddress, doctorAddress = walletAddress) => {
      if (!contract || !patientAddress || !doctorAddress) {
        return false;
      }

      try {
        const hasAccess = await contract.hasAccessToPatient(patientAddress, doctorAddress);
        return hasAccess;
      } catch (error) {
        console.error("Lỗi kiểm tra quyền truy cập:", JSON.stringify(error, null, 2));
        return false;
      }
    },
    [contract, walletAddress],
  );

  const fetchAuthorizedPatients = useCallback(
    async (doctorAddress = walletAddress) => {
      if (!contract || !doctorAddress) {
        console.warn("Hợp đồng hoặc địa chỉ bác sĩ không khả dụng.");
        return [];
      }

      try {
        const [patientAddresses, patientNames] = await contract.getAuthorizedPatients(doctorAddress);
        const formattedPatients = patientAddresses.map((addr, index) => ({
          address: addr,
          fullName: patientNames[index] || "Chưa cập nhật",
        }));

        setAuthorizedPatients(formattedPatients);
        console.log("Bệnh nhân đã cấp quyền:", formattedPatients);
        return formattedPatients;
      } catch (error) {
        console.error("Lỗi lấy danh sách bệnh nhân đã cấp quyền:", JSON.stringify(error, null, 2));
        if (error.reason?.includes("OnlyVerifiedDoctor")) {
          console.warn("Địa chỉ không phải bác sĩ hoặc chưa xác minh:", doctorAddress);
          return [];
        }
        toast.error("Không thể lấy danh sách bệnh nhân đã cấp quyền.");
        return [];
      }
    },
    [contract, walletAddress],
  );

  const getSharedRecordsByDoctor = useCallback(
    async (doctorAddress = walletAddress) => {
      if (!contract || !doctorAddress) {
        const errorMsg = "Hợp đồng hoặc địa chỉ bác sĩ chưa sẵn sàng.";
        setError(errorMsg);
        throw new Error(errorMsg);
      }

      try {
        const records = await contract.getSharedRecordsByDoctor(doctorAddress);
        const formattedRecords = await Promise.all(
          records.map(async (record) => {
            const patientInfo = await getUser(record.patient);
            return {
              ipfsHash: record.ipfsHash,
              patient: record.patient,
              patientName: patientInfo.fullName,
              doctor: record.doctor,
              recordType: Number(record.recordType),
              notes: record.notes,
              timestamp: Number(record.timestamp),
            };
          }),
        );
        console.log("Hồ sơ được chia sẻ cho bác sĩ:", formattedRecords);
        return formattedRecords;
      } catch (error) {
        console.error("Lỗi lấy hồ sơ được chia sẻ:", JSON.stringify(error, null, 2));
        if (error.reason?.includes("OnlyVerifiedDoctor")) {
          console.warn("Địa chỉ không phải bác sĩ hoặc chưa xác minh.");
          return [];
        }
        const errorMsg = "Không thể lấy hồ sơ được chia sẻ.";
        setError(errorMsg);
        throw new Error(errorMsg);
      }
    },
    [contract, walletAddress, getUser],
  );

  useEffect(() => {
    if (contract && walletAddress) {
      console.log("🔧 Initializing EventHandler...");
      eventHandler.initialize({ contract, walletAddress, fetchDoctors, fetchPatients, getUser });
      console.log("✅ EventHandler initialized:", eventHandler.status);
    }

    return () => {
      if (contract || walletAddress) {
        console.log("🧹 Cleaning lên EventHandler trên dependency change...");
        eventHandler.cleanup();
      }
    };
  }, [contract, walletAddress, fetchDoctors, fetchPatients, getUser]);

  useEffect(() => {
    if (window.ethereum) initContract();
  }, [initContract]);

  useEffect(() => {
    if (contract && walletAddress) {
      fetchDoctors();
      fetchPatients();
      fetchAvailabilitySlots();
      fetchAppointmentsByPatient();
      fetchAuthorizedPatients();
    }
  }, [
    contract,
    walletAddress,
    fetchDoctors,
    fetchPatients,
    fetchAvailabilitySlots,
    fetchAppointmentsByPatient,
    fetchAuthorizedPatients,
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
      appointments,
      availabilitySlots,
      authorizedPatients,
      walletAddress,
      connectWallet,
      getUser,
      disconnectWallet,
      fetchDoctors,
      fetchPatients,
      getMedicalRecordsByDoctor,
      getMedicalRecords,
      getPatientSharedRecords,
      getPendingRecords,
      addMedicalRecord,
      approveMedicalRecord,
      shareMedicalRecord,
      voteForDoctor,
      addAvailabilitySlot,
      fetchAvailabilitySlots,
      bookAppointment,
      updateAppointmentStatus,
      fetchAppointmentsByPatient,
      fetchAppointmentsByDoctor,
      grantAccessToDoctor,
      revokeAccessFromDoctor,
      hasAccessToPatient,
      fetchAuthorizedPatients,
      getSharedRecordsByDoctor,
      pendingDoctorRegistrations,
      notifications,
      isLoading,
    }),
    [
      contract,
      signer,
      provider,
      error,
      doctors,
      patients,
      appointments,
      availabilitySlots,
      authorizedPatients,
      walletAddress,
      pendingDoctorRegistrations,
      notifications,
      isLoading,
      initContract,
      connectWallet,
      getUser,
      disconnectWallet,
      fetchDoctors,
      fetchPatients,
      getMedicalRecordsByDoctor,
      getMedicalRecords,
      getPatientSharedRecords,
      getPendingRecords,
      addMedicalRecord,
      approveMedicalRecord,
      shareMedicalRecord,
      voteForDoctor,
      addAvailabilitySlot,
      fetchAvailabilitySlots,
      bookAppointment,
      updateAppointmentStatus,
      fetchAppointmentsByPatient,
      fetchAppointmentsByDoctor,
      grantAccessToDoctor,
      revokeAccessFromDoctor,
      hasAccessToPatient,
      fetchAuthorizedPatients,
      getSharedRecordsByDoctor,
    ],
  );

  return <SmartContractContext.Provider value={contextValue}>{children}</SmartContractContext.Provider>;
};