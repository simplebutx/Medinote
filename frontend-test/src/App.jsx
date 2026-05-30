import { BrowserRouter, Link, Route, Routes } from 'react-router-dom'

import './App.css'
import Chatbot from './pages/Chatbot'
import CautionRegister from './pages/CautionRegister'
import Consultation from './pages/Consultation'
import Login from './pages/Login'
import MedicineSearch from './pages/MedicineSearch'
import MyPage from './pages/MyPage'
import PharmacyMap from './pages/PharmacyMap'
import ScheduleCalendarPage from './pages/schedule/ScheduleCalendarPage'
import ScheduleCreatePage from './pages/schedule/ScheduleCreatePage'
import ScheduleEditPage from './pages/schedule/ScheduleEditPage'
import ScheduleListPage from './pages/schedule/ScheduleListPage'
import ScheduleOcrPage from './pages/schedule/ScheduleOcrPage'
import Signup from './pages/Signup'
import Sync from './pages/Sync'
import YunjuTest from './pages/YunjuTest'

function Home() {
  return (
    <div>
      <h1>frontend-test</h1>
      <ul>
        <li>
          <Link to="/chatbot">chatbot</Link>
        </li>
        <li>
          <Link to="/sync">sync</Link>
        </li>
        <li>
          <Link to="/medicine-search">medicine search</Link>
        </li>
        <li>
          <Link to="/caution-register">caution register</Link>
        </li>
        <li>
          <Link to="/schedule-test">schedule test</Link>
        </li>
        <li>
          <Link to="/signup">signup</Link>
        </li>
        <li>
          <Link to="/login">login</Link>
        </li>
        <li>
          <Link to="/yunjutest" style={{ color: 'red', fontWeight: 'bold' }}>
            yunjutest
          </Link>
        </li>
        <li>
          <Link to="/my">my page</Link>
        </li>
        <li>
          <Link to="/pharmacy-map">pharmacy map</Link>
        </li>
        <li>
          <Link to="/consultation" style={{ color: 'green', fontWeight: 'bold' }}>
            consultation
          </Link>
        </li>
      </ul>
    </div>
  )
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/chatbot" element={<Chatbot />} />
        <Route path="/sync" element={<Sync />} />
        <Route path="/caution-register" element={<CautionRegister />} />
        <Route path="/medicine-search" element={<MedicineSearch />} />
        <Route path="/schedule-test" element={<ScheduleListPage />} />
        <Route path="/schedule-test/calendar" element={<ScheduleCalendarPage />} />
        <Route path="/schedule-test/ocr" element={<ScheduleOcrPage />} />
        <Route path="/schedule-test/new" element={<ScheduleCreatePage />} />
        <Route path="/schedule-test/:id/edit" element={<ScheduleEditPage />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/login" element={<Login />} />
        <Route path="/yunjutest" element={<YunjuTest />} />
        <Route path="/my" element={<MyPage />} />
        <Route path="/pharmacy-map" element={<PharmacyMap />} />
        <Route path="/consultation" element={<Consultation />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
