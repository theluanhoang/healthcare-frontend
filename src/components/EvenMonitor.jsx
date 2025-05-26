"use client"

import { useEffect, useState } from "react"
import { useSmartContract } from "../hooks"

function EventMonitor() {
  const { contract, walletAddress } = useSmartContract()
  const [events, setEvents] = useState([])
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    if (!contract || !walletAddress) return

    console.log("🔍 EventMonitor: Setting up real-time event monitoring")

    const addEvent = (eventName, data) => {
      const newEvent = {
        id: Date.now(),
        name: eventName,
        data,
        timestamp: new Date().toLocaleTimeString(),
      }

      setEvents((prev) => [newEvent, ...prev.slice(0, 9)]) // Keep last 10 events
      console.log(`🎯 EventMonitor: ${eventName}`, data)
    }

    // Monitor all events
    const handleUserRegistered = (userAddress, role, fullName) => {
      addEvent("UserRegistered", { userAddress, role: role.toString(), fullName })
    }

    const handleDoctorVerified = (doctorAddress, fullName) => {
      addEvent("DoctorVerified", { doctorAddress, fullName })
    }

    const handleMedicalRecordAdded = (recordIndex, patient, doctor, ipfsHash) => {
      addEvent("MedicalRecordAdded", { recordIndex: recordIndex.toString(), patient, doctor, ipfsHash })
    }

    const handleMedicalRecordApproved = (recordIndex, patient) => {
      addEvent("MedicalRecordApproved", { recordIndex: recordIndex.toString(), patient })
    }

    const handleMedicalRecordShared = (recordIndex, patient, doctor, ipfsHash) => {
      addEvent("MedicalRecordShared", { recordIndex: recordIndex.toString(), patient, doctor, ipfsHash })
    }

    // Attach listeners
    contract.on("UserRegistered", handleUserRegistered)
    contract.on("DoctorVerified", handleDoctorVerified)
    contract.on("MedicalRecordAdded", handleMedicalRecordAdded)
    contract.on("MedicalRecordApproved", handleMedicalRecordApproved)
    contract.on("MedicalRecordShared", handleMedicalRecordShared)

    return () => {
      contract.off("UserRegistered", handleUserRegistered)
      contract.off("DoctorVerified", handleDoctorVerified)
      contract.off("MedicalRecordAdded", handleMedicalRecordAdded)
      contract.off("MedicalRecordApproved", handleMedicalRecordApproved)
      contract.off("MedicalRecordShared", handleMedicalRecordShared)
    }
  }, [contract, walletAddress])

  if (!contract || !walletAddress) return null

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <button
        onClick={() => setIsVisible(!isVisible)}
        className="bg-indigo-600 text-white p-3 rounded-full shadow-lg hover:bg-indigo-700 transition-colors"
        title="Event Monitor"
      >
        🔍
      </button>

      {isVisible && (
        <div className="absolute bottom-16 right-0 w-96 bg-white border border-gray-200 rounded-lg shadow-xl max-h-96 overflow-y-auto">
          <div className="p-3 bg-indigo-600 text-white font-semibold rounded-t-lg">🎯 Real-time Events Monitor</div>
          <div className="p-3">
            {events.length === 0 ? (
              <p className="text-gray-500 text-sm">Chờ events...</p>
            ) : (
              <div className="space-y-2">
                {events.map((event) => (
                  <div key={event.id} className="text-xs border-l-2 border-indigo-200 pl-2">
                    <div className="font-semibold text-indigo-600">
                      {event.name} - {event.timestamp}
                    </div>
                    <div className="text-gray-600">{JSON.stringify(event.data, null, 2)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default EventMonitor
