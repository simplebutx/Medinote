import { BrowserRouter, Link, Route, Routes } from 'react-router-dom'

import './App.css'
import Chatbot from './pages/Chatbot'
import CautionRegister from './pages/CautionRegister'
import Login from './pages/Login'
import MedicineSearch from './pages/MedicineSearch'
import MyPage from './pages/MyPage'
import ScheduleCalendarPage from './pages/schedule/ScheduleCalendarPage'
import ScheduleCreatePage from './pages/schedule/ScheduleCreatePage'
import ScheduleEditPage from './pages/schedule/ScheduleEditPage'
import ScheduleListPage from './pages/schedule/ScheduleListPage'
import Signup from './pages/Signup'
import Sync from './pages/Sync'
import YunjuTest from './pages/YunjuTest'

import Consultation from './pages/Consultation'
import UserConsultationList from './pages/UserConsultationList'
import PharmacistRoomList from './pages/PharmacistRoomList'

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
          <Link to="/yunjutest" style={{ color: 'red', fontWeight: 'bold' }}>윤주님 API 테스트</Link>
        </li>
        <li>
          <Link to="/my">my page</Link>
        </li>
        <li>
          <Link to="/my/consultations" style={{ color: 'blue', fontWeight: 'bold' }}>내 상담 내역</Link>
        </li>
        <li>
          <Link to="/consultation" style={{ color: 'green', fontWeight: 'bold' }}>실시간 상담 신청</Link>
        </li>
        <li>
          <Link to="/pharmacist/rooms" style={{ color: 'purple', fontWeight: 'bold' }}>약사 대기 목록 (상담 수락)</Link>
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
        <Route path="/schedule-test/new" element={<ScheduleCreatePage />} />
        <Route path="/schedule-test/:id/edit" element={<ScheduleEditPage />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/login" element={<Login />} />
        <Route path="/yunjutest" element={<YunjuTest />} />
        <Route path="/my" element={<MyPage />} />
        <Route path="/consultation" element={<Consultation />} />
        <Route path="/my/consultations" element={<UserConsultationList />} />
        <Route path="/pharmacist/rooms" element={<PharmacistRoomList />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
