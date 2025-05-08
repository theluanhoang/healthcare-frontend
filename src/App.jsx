import './App.css'
import Navbar from './components/Navbar'
import AppRoutes from './routes/AppRouter'

function App() {

  return (
    <div >
      <Navbar />
      <div className='flex flex-col justify-center items-center'>

      <AppRoutes />
      </div>
    </div>
  )
}

export default App
