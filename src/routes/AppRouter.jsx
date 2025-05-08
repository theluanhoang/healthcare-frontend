import React from 'react'
import { Route, Routes } from 'react-router-dom'
import LoginRegister from '../pages/LoginRegister'
import Register from '../pages/Register'

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginRegister />} />
      <Route path="/register" element={<Register />} />
    </Routes>
  )
}

export default AppRoutes