import { BrowserRouter, Link, Route, Routes } from 'react-router-dom'

import './App.css'
import Chatbot from './pages/Chatbot'
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
        <Route path="/medicine-search" element={<MedicineSearch />} />
        <Route path="/schedule-test" element={<ScheduleListPage />} />
        <Route path="/schedule-test/calendar" element={<ScheduleCalendarPage />} />
        <Route path="/schedule-test/new" element={<ScheduleCreatePage />} />
        <Route path="/schedule-test/:id/edit" element={<ScheduleEditPage />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/login" element={<Login />} />
        <Route path="/yunjutest" element={<YunjuTest />} />
        <Route path="/my" element={<MyPage />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
