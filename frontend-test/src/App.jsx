import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'

import './App.css'
import AppLayout from './components/layout/AppLayout'
import Consultation from './pages/Consultation'
import Login from './pages/Login'
import MedicineSearch from './pages/MedicineSearch'
import MyPage from './pages/MyPage'
import PharmacyMap from './pages/PharmacyMap'
import ChatConsultPage from './pages/ChatConsultPage'
import MedicationRegisterPage from './pages/MedicationRegisterPage'
import ScheduleDashboardPage from './pages/ScheduleDashboardPage'
import ScheduleCalendarPage from './pages/schedule/ScheduleCalendarPage'
import ScheduleCreatePage from './pages/schedule/ScheduleCreatePage'
import ScheduleEditPage from './pages/schedule/ScheduleEditPage'
import ScheduleListPage from './pages/schedule/ScheduleListPage'
import ScheduleOcrPage from './pages/schedule/ScheduleOcrPage'
import Signup from './pages/Signup'
import SimplePlaceholderPage from './pages/SimplePlaceholderPage'
import Sync from './pages/Sync'
import YunjuTest from './pages/YunjuTest'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/app/schedule" replace />} />

        <Route path="/signup" element={<Signup />} />
        <Route path="/login" element={<Login />} />
        <Route path="/yunjutest" element={<YunjuTest />} />
        <Route path="/sync" element={<Sync />} />
        <Route path="/consultation" element={<Consultation />} />

        <Route element={<AppLayout />}>
          <Route path="/app" element={<Navigate to="/app/schedule" replace />} />
          <Route path="/app/schedule" element={<ScheduleDashboardPage />} />
          <Route path="/app/schedule/calendar" element={<ScheduleDashboardPage />} />
          <Route path="/app/schedule/new" element={<ScheduleCreatePage />} />
          <Route path="/app/schedule/:id/edit" element={<ScheduleEditPage />} />
          <Route path="/app/ocr" element={<MedicationRegisterPage />} />
          <Route path="/app/chat" element={<ChatConsultPage />} />
          <Route path="/app/drugs" element={<MedicineSearch />} />
          <Route path="/app/pharmacies" element={<PharmacyMap />} />
          <Route
            path="/app/faq"
            element={
              <SimplePlaceholderPage
                eyebrow="FAQ"
                title="FAQ"
                description="사용자 공통 레이아웃에 맞춰 FAQ 자리를 먼저 구성했습니다."
              />
            }
          />
          <Route
            path="/app/notifications"
            element={
              <SimplePlaceholderPage
                eyebrow="Notifications"
                title="알림"
                description="현재는 사용자 페이지 구조에 맞춘 알림 영역만 구성했습니다."
              />
            }
          />
          <Route
            path="/app/iot"
            element={
              <SimplePlaceholderPage
                eyebrow="Smart Pillbox"
                title="스마트 약통"
                description="스마트 약통 화면은 추후 기능 연동을 위해 사용자 레이아웃 안에 자리만 맞춰뒀습니다."
              />
            }
          />
          <Route path="/app/my" element={<MyPage />} />
        </Route>

        <Route path="/chatbot" element={<Navigate to="/app/chat" replace />} />
        <Route path="/caution-register" element={<Navigate to="/app/my" replace />} />
        <Route path="/medicine-search" element={<Navigate to="/app/drugs" replace />} />
        <Route path="/schedule-test" element={<ScheduleListPage />} />
        <Route path="/schedule-test/calendar" element={<ScheduleCalendarPage />} />
        <Route path="/schedule-test/ocr" element={<ScheduleOcrPage />} />
        <Route path="/schedule-test/new" element={<ScheduleCreatePage />} />
        <Route path="/schedule-test/:id/edit" element={<ScheduleEditPage />} />
        <Route path="/my" element={<Navigate to="/app/my" replace />} />
        <Route path="/pharmacy-map" element={<Navigate to="/app/pharmacies" replace />} />
        <Route path="*" element={<Navigate to="/app/schedule" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
