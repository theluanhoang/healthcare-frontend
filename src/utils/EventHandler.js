// Singleton Event Handler - cải thiện logic deduplication
class BlockchainEventHandler {
  constructor() {
    this.contract = null
    this.walletAddress = null
    this.currentUserRole = null
    this.currentUserVerified = false
    this.isListening = false
    this.processedEvents = new Map() // Map với timestamp để auto cleanup
    this.activeToasts = new Set()
    this.cleanupInterval = null

    // Bind methods
    this.handleUserRegistered = this.handleUserRegistered.bind(this)
    this.handleDoctorVerified = this.handleDoctorVerified.bind(this)
    this.handleMedicalRecordAdded = this.handleMedicalRecordAdded.bind(this)
    this.handleMedicalRecordApproved = this.handleMedicalRecordApproved.bind(this)
    this.handleMedicalRecordShared = this.handleMedicalRecordShared.bind(this)

    // Auto cleanup processed events mỗi 30 giây
    this.startCleanupInterval()
  }

  // Khởi tạo với contract và wallet
  async initialize(contract, walletAddress, callbacks = {}) {
    console.log("🔧 Initializing EventHandler with:", {
      contractAddress: contract?.address,
      walletAddress,
      isListening: this.isListening,
    })

    // Nếu đã listening với cùng contract và wallet, skip
    if (this.isListening && this.contract?.address === contract?.address && this.walletAddress === walletAddress) {
      console.log("⚠️ Already listening to this contract and wallet, skipping")
      return
    }

    // Cleanup listeners cũ
    this.cleanup()

    this.contract = contract
    this.walletAddress = walletAddress
    this.callbacks = callbacks

    if (contract && walletAddress) {
      // Lấy thông tin user hiện tại
      try {
        const currentUser = await callbacks.getUser(walletAddress)
        this.currentUserRole = currentUser.role
        this.currentUserVerified = currentUser.isVerified
        console.log("👤 Current user info:", {
          role: this.currentUserRole,
          verified: this.currentUserVerified,
        })
      } catch (error) {
        console.error("❌ Error getting current user info:", error)
        this.currentUserRole = null
        this.currentUserVerified = false
      }

      this.startListening()
    }
  }

  // Bắt đầu lắng nghe events
  startListening() {
    if (this.isListening || !this.contract) {
      console.log("⚠️ Already listening or no contract available")
      return
    }

    console.log("🎧 Starting to listen for blockchain events...")
    this.isListening = true

    // QUAN TRỌNG: Remove ALL existing listeners trước
    this.contract.removeAllListeners()

    // Đợi một chút để đảm bảo cleanup hoàn tất
    setTimeout(() => {
      // Attach event listeners
      this.contract.on("UserRegistered", this.handleUserRegistered)
      this.contract.on("DoctorVerified", this.handleDoctorVerified)
      this.contract.on("MedicalRecordAdded", this.handleMedicalRecordAdded)
      this.contract.on("MedicalRecordApproved", this.handleMedicalRecordApproved)
      this.contract.on("MedicalRecordShared", this.handleMedicalRecordShared)

      console.log("✅ Event listeners attached successfully")
    }, 100)
  }

  // Tạo unique event ID với thêm block number
  createEventId(event, eventType, additionalData = "") {
    return `${eventType}-${event.transactionHash}-${event.logIndex}-${event.blockNumber}-${additionalData}`
  }

  // Kiểm tra event đã được xử lý chưa
  isEventProcessed(eventId) {
    const now = Date.now()
    const eventData = this.processedEvents.get(eventId)

    if (eventData) {
      // Nếu event chưa quá 60 giây thì coi như đã processed
      if (now - eventData.timestamp < 60000) {
        console.log(`🚫 Event already processed: ${eventId}`)
        return true
      } else {
        // Xóa event cũ
        this.processedEvents.delete(eventId)
      }
    }

    return false
  }

  // Đánh dấu event đã xử lý
  markEventProcessed(eventId) {
    this.processedEvents.set(eventId, {
      timestamp: Date.now(),
    })
    console.log(`✅ Event marked as processed: ${eventId}`)
  }

  // Show toast với logic chặt chẽ hơn
  showUniqueToast(message, type, eventId) {
    // Kiểm tra toast đã active chưa
    if (this.activeToasts.has(eventId)) {
      console.log(`🚫 Toast already active: ${eventId}`)
      return
    }

    // Import toast dynamically
    import("react-toastify").then(({ toast }) => {
      // Double check trước khi show
      if (this.activeToasts.has(eventId) || toast.isActive(eventId)) {
        console.log(`🚫 Toast already exists: ${eventId}`)
        return
      }

      this.activeToasts.add(eventId)

      const toastOptions = {
        toastId: eventId,
        autoClose: 4000,
        position: "top-right",
        onClose: () => {
          this.activeToasts.delete(eventId)
          console.log(`🗑️ Toast closed: ${eventId}`)
        },
      }

      switch (type) {
        case "success":
          toast.success(message, toastOptions)
          break
        case "error":
          toast.error(message, toastOptions)
          break
        case "warning":
          toast.warning(message, toastOptions)
          break
        default:
          toast.info(message, toastOptions)
      }

      console.log(`📢 Toast shown: ${eventId} - ${message}`)
    })
  }

  // Event handlers với logic cải thiện
  async handleUserRegistered(userAddress, role, fullName, event) {
    const eventId = this.createEventId(event, "user-registered", userAddress)

    // Kiểm tra duplicate
    if (this.isEventProcessed(eventId)) return
    this.markEventProcessed(eventId)

    console.log("👤 UserRegistered:", {
      userAddress,
      role: role.toString(),
      fullName,
      eventId,
      currentUserRole: this.currentUserRole,
      currentUserVerified: this.currentUserVerified,
    })

    try {
      // Refresh data
      if (this.callbacks.fetchDoctors) await this.callbacks.fetchDoctors()
      if (this.callbacks.fetchPatients) await this.callbacks.fetchPatients()

      // Logic hiển thị thông báo cải thiện
      const roleStr = role.toString()

      if (roleStr === "2") {
        // Bác sĩ mới đăng ký
        // CHỈ hiển thị cho các bác sĩ đã verified KHÁC (không phải chính người đăng ký)
        if (
          this.currentUserRole === "2" &&
          this.currentUserVerified &&
          userAddress.toLowerCase() !== this.walletAddress.toLowerCase()
        ) {
          this.showUniqueToast(`Bác sĩ mới đăng ký: ${fullName}. Cần xác minh!`, "info", eventId)
        }
      } else if (roleStr === "1") {
        // Bệnh nhân mới đăng ký - hiển thị cho tất cả users khác
        if (userAddress.toLowerCase() !== this.walletAddress.toLowerCase()) {
          this.showUniqueToast(`Bệnh nhân mới đăng ký: ${fullName}`, "info", eventId)
        }
      }
    } catch (error) {
      console.error("❌ Error handling UserRegistered:", error)
    }
  }

  async handleDoctorVerified(doctorAddress, fullName, event) {
    const eventId = this.createEventId(event, "doctor-verified", doctorAddress)

    // Kiểm tra duplicate
    if (this.isEventProcessed(eventId)) return
    this.markEventProcessed(eventId)

    console.log("👨‍⚕️ DoctorVerified:", {
      doctorAddress,
      fullName,
      eventId,
      currentWallet: this.walletAddress,
    })

    try {
      if (this.callbacks.fetchDoctors) await this.callbacks.fetchDoctors()

      if (doctorAddress.toLowerCase() === this.walletAddress.toLowerCase()) {
        this.showUniqueToast("Chúc mừng! Bạn đã được xác minh làm bác sĩ!", "success", eventId)
      } else {
        if (this.currentUserRole === "2" && this.currentUserVerified) {
          this.showUniqueToast(`Bác sĩ ${fullName} đã được xác minh!`, "info", eventId)
        }
      }
    } catch (error) {
      console.error("❌ Error handling DoctorVerified:", error)
    }
  }

  async handleMedicalRecordAdded(recordIndex, patient, doctor, ipfsHash, event) {
    const eventId = this.createEventId(event, "record-added", recordIndex.toString())

    if (this.isEventProcessed(eventId)) return
    this.markEventProcessed(eventId)

    console.log("📋 MedicalRecordAdded:", { recordIndex, patient, doctor, eventId })

    try {
      if (patient.toLowerCase() === this.walletAddress.toLowerCase()) {
        this.showUniqueToast("Hồ sơ y tế mới từ bác sĩ. Vui lòng phê duyệt!", "info", eventId)
      }

      if (doctor.toLowerCase() === this.walletAddress.toLowerCase()) {
        this.showUniqueToast("Hồ sơ y tế đã được thêm, chờ bệnh nhân phê duyệt!", "success", eventId)
      }
    } catch (error) {
      console.error("❌ Error handling MedicalRecordAdded:", error)
    }
  }

  async handleMedicalRecordApproved(recordIndex, patient, event) {
    const eventId = this.createEventId(event, "record-approved", recordIndex.toString())

    if (this.isEventProcessed(eventId)) return
    this.markEventProcessed(eventId)

    console.log("✅ MedicalRecordApproved:", { recordIndex, patient, eventId })

    try {
      if (patient.toLowerCase() === this.walletAddress.toLowerCase()) {
        this.showUniqueToast("Hồ sơ y tế đã được phê duyệt!", "success", eventId)
      }
    } catch (error) {
      console.error("❌ Error handling MedicalRecordApproved:", error)
    }
  }

  async handleMedicalRecordShared(recordIndex, patient, doctor, ipfsHash, event) {
    const eventId = this.createEventId(event, "record-shared", recordIndex.toString())

    if (this.isEventProcessed(eventId)) return
    this.markEventProcessed(eventId)

    console.log("🔄 MedicalRecordShared:", { recordIndex, patient, doctor, eventId })

    try {
      if (patient.toLowerCase() === this.walletAddress.toLowerCase()) {
        this.showUniqueToast("Hồ sơ y tế đã được chia sẻ!", "success", eventId)
      }

      if (doctor.toLowerCase() === this.walletAddress.toLowerCase()) {
        this.showUniqueToast("Bạn nhận được hồ sơ y tế được chia sẻ!", "info", eventId)
      }
    } catch (error) {
      console.error("❌ Error handling MedicalRecordShared:", error)
    }
  }

  startCleanupInterval() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
    }

    this.cleanupInterval = setInterval(() => {
      const now = Date.now()
      let cleanedCount = 0

      for (const [eventId, eventData] of this.processedEvents.entries()) {
        if (now - eventData.timestamp > 300000) {
          this.processedEvents.delete(eventId)
          cleanedCount++
        }
      }

      if (cleanedCount > 0) {
        console.log(`🧹 Cleaned up ${cleanedCount} old processed events`)
      }
    }, 60000)
  }

  cleanup() {
    console.log("🧹 Cleaning up EventHandler...")

    if (this.contract && this.isListening) {
      this.contract.removeAllListeners()
    }

    this.isListening = false
    this.processedEvents.clear()
    this.activeToasts.clear()
    this.currentUserRole = null
    this.currentUserVerified = false

    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = null
    }

    console.log("✅ EventHandler cleaned up")
  }

  get status() {
    return {
      isListening: this.isListening,
      contractAddress: this.contract?.address,
      walletAddress: this.walletAddress,
      currentUserRole: this.currentUserRole,
      currentUserVerified: this.currentUserVerified,
      processedEventsCount: this.processedEvents.size,
      activeToastsCount: this.activeToasts.size,
    }
  }
}

export const eventHandler = new BlockchainEventHandler()
