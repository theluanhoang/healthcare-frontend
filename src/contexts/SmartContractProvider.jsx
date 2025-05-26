"use client"

import { ethers } from "ethers"
import { createContext, useCallback, useEffect, useMemo, useState } from "react"
import { toast } from "react-toastify"
import HealthcareABI from "../contracts/HealthcareABI.json"
import { eventHandler } from "../utils/EventHandler"

export const SmartContractContext = createContext()

const contractAddress = "0x8869dD46CA5A158fC0560137b460930210faaEDe"

export const SmartContractProvider = ({ children }) => {
  const [signer, setSigner] = useState(null)
  const [walletAddress, setWalletAddress] = useState(null)
  const [provider, setProvider] = useState(null)
  const [contract, setContract] = useState(null)
  const [error, setError] = useState(null)
  const [doctors, setDoctors] = useState([])
  const [patients, setPatients] = useState([])
  const [notifications, setNotifications] = useState([])
  const [pendingDoctorRegistrations, setPendingDoctorRegistrations] = useState([])
  const [isLoading, setIsLoading] = useState(false)

  const initContract = useCallback(async () => {
    if (!window.ethereum) {
      const errorMsg = "Vui lòng cài đặt MetaMask để tiếp tục."
      setError(errorMsg)
      toast.error(errorMsg)
      throw new Error(errorMsg)
    }

    setIsLoading(true)
    try {
      console.log("Khởi tạo hợp đồng...")
      const provider = new ethers.BrowserProvider(window.ethereum)
      const network = await provider.getNetwork()
      if (network.chainId !== BigInt(1337)) {
        const errorMsg = "Vui lòng chuyển MetaMask sang mạng Hardhat local (Chain ID: 1337)."
        setError(errorMsg)
        toast.error(errorMsg)
        throw new Error(errorMsg)
      }

      await provider.send("eth_requestAccounts", [])
      const signer = await provider.getSigner()
      const contractInstance = new ethers.Contract(contractAddress, HealthcareABI, signer)

      setProvider(provider)
      setSigner(signer)
      setContract(contractInstance)
      setError(null)

      const address = await signer.getAddress()
      setWalletAddress(address)

      console.log("Khởi tạo hợp đồng hoàn tất.")
    } catch (error) {
      console.error("Lỗi khởi tạo hợp đồng:", error)
      const errorMsg = error.message || "Không thể khởi tạo hợp đồng."
      setError(errorMsg)
      toast.error(errorMsg)
      throw error
    } finally {
      setIsLoading(false)
    }
  }, [])

  const connectWallet = useCallback(async () => {
    if (!window.ethereum) {
      const errorMsg = "Vui lòng cài đặt MetaMask để tiếp tục."
      setError(errorMsg)
      toast.error(errorMsg)
      return
    }

    try {
      if (!contract || !signer) await initContract()
      const address = await signer.getAddress()
      setWalletAddress(address)
      setError(null)
      return address
    } catch (error) {
      console.error("Lỗi kết nối ví:", error)
      const errorMsg = error.message || "Không thể kết nối ví."
      setError(errorMsg)
      toast.error(errorMsg)
      throw error
    }
  }, [contract, signer, initContract])

  const getUser = useCallback(
    async (address) => {
      if (!address || !contract) {
        const errorMsg = "Hợp đồng hoặc địa chỉ ví chưa sẵn sàng."
        setError(errorMsg)
        throw new Error(errorMsg)
      }

      try {
        const userData = await contract.getUser(address)
        console.log("Dữ liệu người dùng:", userData)
        const [role, isVerified, ipfsHash, fullName, email] = userData
        return {
          fullName,
          email,
          role: role.toString(),
          isVerified,
          ipfsHash,
        }
      } catch (error) {
        console.error("Lỗi lấy thông tin người dùng:", error)
        const errorMsg = "Không thể lấy thông tin người dùng."
        setError(errorMsg)
        throw error
      }
    },
    [contract],
  )

  const disconnectWallet = useCallback(async () => {
    try {
      // Cleanup event handler trước
      eventHandler.cleanup()

      setWalletAddress(null)
      setSigner(null)
      setProvider(null)
      setContract(null)
      setError(null)
      setDoctors([])
      setPatients([])
      setPendingDoctorRegistrations([])
      setNotifications([])
    } catch (error) {
      console.error("Lỗi ngắt kết nối ví:", error)
      const errorMsg = "Không thể ngắt kết nối ví."
      setError(errorMsg)
      toast.error(errorMsg)
    }
  }, [])

  const fetchDoctors = useCallback(async () => {
    if (!contract || !contract.getAllDoctors) {
      console.warn("Hợp đồng hoặc hàm getAllDoctors không khả dụng.")
      return []
    }

    try {
      const [addresses, isVerified, fullNames, ipfsHashes] = await contract.getAllDoctors()
      console.log("Dữ liệu bác sĩ:", { addresses, isVerified, fullNames, ipfsHashes })

      if (
        !Array.isArray(addresses) ||
        !Array.isArray(isVerified) ||
        !Array.isArray(fullNames) ||
        !Array.isArray(ipfsHashes) ||
        addresses.length !== isVerified.length ||
        addresses.length !== fullNames.length ||
        addresses.length !== ipfsHashes.length
      ) {
        throw new Error("Dữ liệu từ getAllDoctors không hợp lệ hoặc không đồng bộ.")
      }

      const doctorList = await Promise.all(
        addresses.map(async (addr, index) => {
          const voteCount = await contract.verificationVotes(addr)
          return {
            address: addr,
            fullName: fullNames[index],
            isVerified: isVerified[index],
            ipfsHash: ipfsHashes[index],
            voteCount: Number(voteCount),
          }
        }),
      )

      setDoctors((prev) => {
        if (JSON.stringify(prev) === JSON.stringify(doctorList)) return prev
        return doctorList
      })

      setPendingDoctorRegistrations((prev) => {
        const pendingList = doctorList.filter((doc) => !doc.isVerified)
        if (JSON.stringify(prev) === JSON.stringify(pendingList)) return prev
        return pendingList
      })

      console.log("Cập nhật danh sách bác sĩ:", doctorList)
      return doctorList
    } catch (error) {
      console.error("Lỗi lấy danh sách bác sĩ:", error)
      toast.error(`Không thể lấy danh sách bác sĩ: ${error.message}`)
      return []
    }
  }, [contract])

  const fetchPatients = useCallback(async () => {
    if (!contract) {
      console.warn("Hợp đồng không khả dụng.")
      return []
    }

    try {
      const userCount = await contract.getUserAddressesLength()
      console.log("Số lượng người dùng:", Number(userCount))

      const addresses = []
      for (let i = 0; i < userCount; i++) {
        const addr = await contract.userAddresses(i)
        addresses.push(addr)
      }
      console.log("Danh sách địa chỉ người dùng:", addresses)

      const formattedPatients = await Promise.all(
        addresses.map(async (addr) => {
          try {
            const user = await getUser(addr)
            if (user.role === "1") {
              return {
                address: addr,
                fullName: user.fullName,
                email: user.email,
              }
            }
            return null
          } catch (error) {
            console.error(`Lỗi lấy thông tin user ${addr}:`, error)
            return null
          }
        }),
      )
      const patientsList = formattedPatients.filter((p) => p !== null)

      setPatients((prev) => {
        if (JSON.stringify(prev) === JSON.stringify(patientsList)) return prev
        return patientsList
      })
      console.log("Cập nhật danh sách bệnh nhân:", patientsList)
      return patientsList
    } catch (error) {
      console.error("Lỗi lấy danh sách bệnh nhân:", error)
      toast.error("Không thể lấy danh sách bệnh nhân.")
      return []
    }
  }, [contract, getUser])

  const getMedicalRecordsByDoctor = useCallback(
    async (doctorAddress = walletAddress) => {
      if (!contract || !doctorAddress) {
        const errorMsg = "Hợp đồng hoặc địa chỉ bác sĩ chưa sẵn sàng."
        setError(errorMsg)
        throw new Error(errorMsg)
      }

      try {
        console.log("Gọi getMedicalRecordsByDoctor với địa chỉ:", doctorAddress)
        const records = await contract.getMedicalRecordsByDoctor(doctorAddress)
        console.log("Dữ liệu bệnh án thô:", records)
        const formattedRecords = await Promise.all(
          records.map(async (record, index) => {
            const doctorInfo = await getUser(record.doctor)
            return {
              recordIndex: index.toString(),
              patient: record.patient.toLowerCase(),
              doctor: record.doctor.toLowerCase(),
              doctorName: doctorInfo.fullName,
              ipfsHash: record.ipfsHash,
              recordType: Number(record.recordType),
              timestamp: Number(record.timestamp),
              isApproved: record.isApproved,
            }
          }),
        )
        console.log("Hồ sơ y tế của bác sĩ:", formattedRecords)
        return formattedRecords
      } catch (error) {
        console.error("Lỗi lấy hồ sơ y tế của bác sĩ:", error)
        if (error.reason && error.reason.includes("require")) {
          console.warn("Lỗi require, có thể địa chỉ không phải bác sĩ hoặc chưa xác minh:", doctorAddress)
          return []
        }
        const errorMsg = "Không thể lấy hồ sơ y tế của bác sĩ."
        setError(errorMsg)
        throw error
      }
    },
    [contract, walletAddress, getUser],
  )

  const getMedicalRecords = useCallback(
    async (patientAddress = walletAddress) => {
      if (!contract || !patientAddress) {
        const errorMsg = "Hợp đồng hoặc địa chỉ bệnh nhân chưa sẵn sàng."
        setError(errorMsg)
        throw new Error(errorMsg)
      }

      try {
        const records = await contract.getMedicalRecords(patientAddress)
        const formattedRecords = await Promise.all(
          records.map(async (record) => {
            const doctorInfo = await getUser(record.doctor)
            return {
              ipfsHash: record.ipfsHash,
              patient: record.patient,
              doctor: record.doctor,
              doctorName: doctorInfo.fullName,
              recordType: Number(record.recordType),
              timestamp: Number(record.timestamp),
              isApproved: record.isApproved,
            }
          }),
        )
        console.log("Hồ sơ y tế:", formattedRecords)
        return formattedRecords
      } catch (error) {
        console.error("Lỗi lấy hồ sơ y tế:", error)
        const errorMsg = "Không thể lấy hồ sơ y tế."
        setError(errorMsg)
        throw error
      }
    },
    [contract, walletAddress, getUser],
  )

  const getPatientSharedRecords = useCallback(
    async (patientAddress = walletAddress) => {
      if (!contract || !patientAddress) {
        const errorMsg = "Hợp đồng hoặc địa chỉ bệnh nhân chưa sẵn sàng."
        setError(errorMsg)
        throw new Error(errorMsg)
      }

      try {
        const records = await contract.getPatientSharedRecords(patientAddress)
        const formattedRecords = await Promise.all(
          records.map(async (record) => {
            const doctorInfo = await getUser(record.doctor)
            const patientInfo = await getUser(record.patient)
            return {
              ipfsHash: record.ipfsHash,
              patient: record.patient,
              patientName: patientInfo.fullName,
              doctor: record.doctor,
              doctorName: doctorInfo.fullName,
              recordType: Number(record.recordType),
              notes: record.notes,
              timestamp: Number(record.timestamp),
            }
          }),
        )
        console.log("Hồ sơ chia sẻ:", formattedRecords)
        return formattedRecords
      } catch (error) {
        console.error("Lỗi lấy lịch sử chia sẻ:", error)
        const errorMsg = "Không thể lấy lịch sử chia sẻ."
        setError(errorMsg)
        throw error
      }
    },
    [contract, walletAddress, getUser],
  )

  const getPendingRecords = useCallback(
    async (patientAddress = walletAddress) => {
      if (!contract || !patientAddress) {
        const errorMsg = "Hợp đồng hoặc địa chỉ bệnh nhân chưa sẵn sàng."
        setError(errorMsg)
        throw new Error(errorMsg)
      }

      try {
        const records = await contract.getPendingRecords(patientAddress)
        const formattedRecords = await Promise.all(
          records.map(async (record) => {
            const doctorInfo = await getUser(record.doctor)
            return {
              ipfsHash: record.ipfsHash,
              patient: record.patient,
              doctor: record.doctor,
              doctorName: doctorInfo.fullName,
              recordType: Number(record.recordType),
              timestamp: Number(record.timestamp),
            }
          }),
        )
        console.log("Hồ sơ chờ phê duyệt:", formattedRecords)
        return formattedRecords
      } catch (error) {
        console.error("Lỗi lấy hồ sơ chờ phê duyệt:", error)
        const errorMsg = "Không thể lấy hồ sơ chờ phê duyệt."
        setError(errorMsg)
        throw error
      }
    },
    [contract, walletAddress, getUser],
  )

  const addMedicalRecord = useCallback(
    async (patientAddress, ipfsHash, recordType) => {
      if (!contract || !walletAddress) {
        const errorMsg = "Hợp đồng hoặc ví chưa sẵn sàng."
        setError(errorMsg)
        throw new Error(errorMsg)
      }

      try {
        const tx = await contract.addMedicalRecord(patientAddress, ipfsHash, recordType)
        await tx.wait()
        toast.success("Thêm hồ sơ y tế thành công!")
      } catch (error) {
        console.error("Lỗi thêm hồ sơ y tế:", error)
        const errorMsg = error.message || "Không thể thêm hồ sơ y tế."
        setError(errorMsg)
        throw error
      }
    },
    [contract, walletAddress],
  )

  const approveMedicalRecord = useCallback(
    async (recordIndex) => {
      if (!contract || !walletAddress) {
        const errorMsg = "Hợp đồng hoặc ví chưa sẵn sàng."
        setError(errorMsg)
        throw new Error(errorMsg)
      }

      try {
        const tx = await contract.approveMedicalRecord(recordIndex)
        await tx.wait()
        toast.success("Phê duyệt hồ sơ y tế thành công!")
      } catch (error) {
        console.error("Lỗi phê duyệt hồ sơ y tế:", error)
        const errorMsg = error.message || "Không thể phê duyệt hồ sơ y tế."
        setError(errorMsg)
        throw error
      }
    },
    [contract, walletAddress],
  )

  const shareMedicalRecord = useCallback(
    async (doctorAddress, ipfsHash, recordType, notes) => {
      if (!contract || !walletAddress) {
        const errorMsg = "Hợp đồng hoặc ví chưa sẵn sàng."
        setError(errorMsg)
        throw new Error(errorMsg)
      }

      try {
        const tx = await contract.shareMedicalRecord(doctorAddress, ipfsHash, recordType, notes)
        await tx.wait()
        toast.success("Chia sẻ hồ sơ y tế thành công!")
      } catch (error) {
        console.error("Lỗi chia sẻ hồ sơ y tế:", error)
        const errorMsg = error.message || "Không thể chia sẻ hồ sơ y tế."
        setError(errorMsg)
        throw error
      }
    },
    [contract, walletAddress],
  )

  const voteForDoctor = useCallback(
    async (doctorAddress) => {
      if (!contract || !walletAddress) {
        const errorMsg = "Hợp đồng hoặc ví chưa sẵn sàng."
        setError(errorMsg)
        throw new Error(errorMsg)
      }

      try {
        console.log("Voting for doctor:", doctorAddress)
        const tx = await contract.voteForDoctor(doctorAddress)
        console.log("Vote transaction sent:", tx.hash)
        await tx.wait()
        console.log("Vote transaction confirmed")
        toast.success("Bỏ phiếu xác minh bác sĩ thành công!")

        // Refresh doctors list after voting
        await fetchDoctors()
      } catch (error) {
        console.error("Lỗi bỏ phiếu xác minh bác sĩ:", error)
        const errorMsg = error.message || "Không thể bỏ phiếu xác minh bác sĩ."
        setError(errorMsg)
        throw error
      }
    },
    [contract, walletAddress, fetchDoctors],
  )

  // Khởi tạo EventHandler khi có contract và wallet
  useEffect(() => {
    if (contract && walletAddress) {
      console.log("🔧 Initializing EventHandler...")

      // Khởi tạo EventHandler với callbacks
      eventHandler.initialize(contract, walletAddress, {
        fetchDoctors,
        fetchPatients,
        getUser,
      })

      console.log("✅ EventHandler initialized:", eventHandler.status)
    }

    return () => {
      // Cleanup khi component unmount hoặc dependencies thay đổi
      if (contract || walletAddress) {
        console.log("🧹 Cleaning up EventHandler on dependency change...")
        eventHandler.cleanup()
      }
    }
  }, [contract, walletAddress, fetchDoctors, fetchPatients, getUser])

  useEffect(() => {
    if (window.ethereum) initContract()
  }, [initContract])

  useEffect(() => {
    if (contract && walletAddress) {
      fetchDoctors()
      fetchPatients()
    }
  }, [contract, walletAddress, fetchDoctors, fetchPatients])

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
    ],
  )

  return <SmartContractContext.Provider value={contextValue}>{children}</SmartContractContext.Provider>
}
