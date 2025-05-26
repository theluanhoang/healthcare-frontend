"use client"

// App.jsx
import { useEffect, useState } from "react"
import "./App.css"
import EventMonitor from "./components/EvenMonitor"
import Navbar from "./components/Navbar"
import { useSmartContract } from "./hooks"
import AppRoutes from "./routes/AppRouter"

function App() {
  const { initContract, contract, error } = useSmartContract()
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    const initializeContract = async () => {
      try {
        setIsLoading(true)
        if (!contract) {
          await initContract()
          console.log("Khởi tạo hợp đồng thông minh thành công!")
        }
      } catch (err) {
        console.error("Lỗi khi khởi tạo hợp đồng thông minh:", err)
      } finally {
        setIsLoading(false)
      }
    }

    initializeContract()
  }, [initContract, contract])

  // Remove all the polling and event listener code from App.jsx
  // since it's already handled in SmartContractProvider

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-blue-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-lg text-gray-600">Đang khởi tạo hợp đồng...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return <div>Lỗi: {error}</div>
  }

  return (
    <div>
      <Navbar />
      <div className="flex flex-col justify-center items-center">
        <AppRoutes />
      </div>
      <EventMonitor />
    </div>
  )
}

export default App
