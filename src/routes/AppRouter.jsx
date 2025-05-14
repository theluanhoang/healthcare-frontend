import { Route, Routes } from 'react-router-dom'
import About from '../pages/About'
import Admin from '../pages/admin/Admin'
import Contact from '../pages/Contact'
import DoctorAnalysis from '../pages/DoctorAnalysis'
import DoctorPatients from '../pages/DoctorPatients'
import DoctorSchedule from '../pages/DoctorSchedule'
import Features from '../pages/Features'
import Login from '../pages/Login'
import PatientAppointments from '../pages/PatientAppointments'
import PatientProfile from '../pages/PatientProfile'
import PatientShare from '../pages/PatientShare'
import Register from '../pages/Register'

function AppRoutes() {
  return (
    <Routes>
      <Route path="/admin" element={<Admin />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/about" element={<About />} />
      <Route path="/features" element={<Features />} />
      <Route path="/contact" element={<Contact />} />
      <Route path="/patient/profile" element={<PatientProfile />} />
      <Route path="/patient/appointment" element={<PatientAppointments />} />
      <Route path="/patient/share" element={<PatientShare />} />
      <Route path="/doctor/patients" element={<DoctorPatients/>} />
      <Route path="/doctor/schedule" element={<DoctorSchedule/>} />
      <Route path="/doctor/analysis" element={<DoctorAnalysis/>} />
    </Routes>
  )
}

export default AppRoutes