import React from 'react'
import { Route, Routes } from 'react-router-dom'
import Register from '../pages/Register'
import Login from '../pages/Login'
import About from '../pages/About'
import Features from '../pages/Features.JSX'
import Contact from '../pages/Contact'
import PatientProfile from '../pages/PatientProfile'
import PatientAppointments from '../pages/PatientAppointments'
import PatientShare from '../pages/PatientShare'
import DoctorPatients from '../pages/DoctorPatients'
import DoctorSchedule from '../pages/DoctorSchedule'
import DoctorAnalysis from '../pages/DoctorAnalysis'

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/About" element={<About />} />
      <Route path="/Features" element={<Features />} />
      <Route path="/Contact" element={<Contact />} />
      <Route path="/patientProfile" element={<PatientProfile />} />
      <Route path="/patientAppointment" element={<PatientAppointments />} />
      <Route path="/patientShare" element={<PatientShare />} />
      <Route path="/doctorPatients" element={<DoctorPatients/>} />
      <Route path="/DoctorSchedule" element={<DoctorSchedule/>} />
      <Route path="/doctoranalysis" element={<DoctorAnalysis/>} />
    </Routes>
  )
}

export default AppRoutes