import { Route, Routes } from "react-router-dom"
import About from "../pages/About"
import Contact from "../pages/Contact"
import DoctorAddRecord from "../pages/DoctorAddRecord"
import DoctorAnalysis from "../pages/DoctorAnalysis"
import DoctorPatientAccess from "../pages/DoctorPatientAccess"
import DoctorPatients from "../pages/DoctorPatients"
import DoctorProfile from "../pages/DoctorProfile"
import DoctorRecords from "../pages/DoctorRecords"
import DoctorSchedule from "../pages/DoctorSchedule"
import DoctorVerify from "../pages/DoctorVerify"
import Features from "../pages/Features"
import Home from "../pages/Home"
import Login from "../pages/Login"
import PatientAppointments from "../pages/PatientAppointments"
import PatientProfile from "../pages/PatientProfile"
import PatientRecords from "../pages/PatientRecords"
import PatientShare from "../pages/PatientShare"
import Register from "../pages/Register"

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/about" element={<About />} />
      <Route path="/features" element={<Features />} />
      <Route path="/contact" element={<Contact />} />
      <Route path="/patient/profile" element={<PatientProfile />} />
      <Route path="/patient/records" element={<PatientRecords />} />
      <Route path="/patient/appointment" element={<PatientAppointments />} />
      <Route path="/patient/share" element={<PatientShare />} />
      <Route path="/doctor/profile" element={<DoctorProfile />} />
      <Route path="/doctor/patients" element={<DoctorPatients />} />
      <Route path="/doctor/patient-access" element={<DoctorPatientAccess />} />
      <Route path="/doctor/add-record" element={<DoctorAddRecord />} />
      <Route path="/doctor/records" element={<DoctorRecords />} />
      <Route path="/doctor/schedule" element={<DoctorSchedule />} />
      <Route path="/doctor/analysis" element={<DoctorAnalysis />} />
      <Route path="/doctor/verify" element={<DoctorVerify />} />
    </Routes>
  )
}

export default AppRoutes
