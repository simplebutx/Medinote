import { BrowserRouter, Link, Route, Routes, Navigate, Outlet } from 'react-router-dom'
import { getAuthSession } from './api'

import './App.css'
import AppLayout from './components/layout/AppLayout'
import PharmLayout from './components/layout/PharmLayout'
import AdminLayout from './components/layout/AdminLayout'
import ChatbotPage from './pages/ChatbotPage'
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
import PasswordManagement from './pages/PasswordManagement'
import ExtraInfo from './pages/ExtraInfo'
import OAuth2Redirect from './pages/OAuth2Redirect'
import SimplePlaceholderPage from './pages/SimplePlaceholderPage'
import NotificationsPage from './pages/NotificationsPage'
import SmartPillPage from './pages/SmartPillPage'
import Sync from './pages/Sync'
import YunjuTest from './pages/YunjuTest'
import PharmacistDashboard from './pages/PharmacistDashboard'
import PharmacistRoomList from './pages/PharmacistRoomList'
import PharmacistProfile from './pages/PharmacistProfile'
import PharmacistReviewList from './pages/PharmacistReviewList'
import PharmacistInventory from './pages/PharmacistInventory'
import AdminDashboard from './pages/AdminDashboard'
import AdminPharmacistList from './pages/AdminPharmacistList'
import AdminUserList from './pages/AdminUserList'
import MedicationNotificationWatcher from './components/MedicationNotificationWatcher'

function App() {
  return (
    <BrowserRouter>
      <MedicationNotificationWatcher />
      <Routes>
        <Route path="/" element={<Navigate to="/app/schedule" replace />} />

        <Route path="/signup" element={<Signup />} />
        <Route path="/signup/extra-info" element={<ExtraInfo />} />
        <Route path="/password-find" element={<PasswordManagement />} />
        <Route path="/oauth2/redirect" element={<OAuth2Redirect />} />
        <Route path="/login" element={<Login />} />
        <Route path="/yunjutest" element={<YunjuTest />} />
        <Route path="/sync" element={<Sync />} />
        <Route path="/consultation" element={<Consultation />} />

        {/* 🩺 약사 전용 (/p) */}
        <Route element={<PharmLayout />}>
          <Route path="/p" element={<Navigate to="/p/dashboard" replace />} />
          <Route path="/p/dashboard" element={<PharmacistDashboard />} />
          <Route path="/p/rooms" element={<PharmacistRoomList />} />
          <Route path="/p/profile" element={<PharmacistProfile />} />
          <Route path="/p/reviews" element={<PharmacistReviewList />} />
          <Route path="/p/inventory" element={<PharmacistInventory />} />
          <Route path="/p/consultation" element={<Consultation />} />
          <Route path="/p/notifications" element={<NotificationsPage />} />
        </Route>

        {/* ⚙️ 관리자 전용 (/a) */}
        <Route element={<AdminLayout />}>
          <Route path="/a" element={<Navigate to="/a/dashboard" replace />} />
          <Route path="/a/dashboard" element={<AdminDashboard />} />
          <Route path="/a/approvals" element={<AdminPharmacistList />} />
          <Route path="/a/users" element={<AdminUserList />} />
          <Route path="/a/sync" element={<Sync />} />
        </Route>

        <Route element={<AppLayout />}>
          <Route path="/app" element={<Navigate to="/app/schedule" replace />} />
          <Route path="/app/schedule" element={<ScheduleDashboardPage />} />
          <Route path="/app/schedule/calendar" element={<ScheduleDashboardPage />} />
          <Route path="/app/schedule/new" element={<ScheduleCreatePage />} />
          <Route path="/app/schedule/:id/edit" element={<ScheduleEditPage />} />
          <Route path="/app/ocr" element={<MedicationRegisterPage />} />
          <Route path="/app/chatbot" element={<ChatbotPage />} />
          <Route path="/app/chat" element={<ChatConsultPage />} />
          <Route path="/app/drugs" element={<MedicineSearch />} />
          <Route path="/app/pharmacies" element={<PharmacyMap />} />
          <Route path="/app/faq" element={<Navigate to="/app/schedule" replace />} />
          <Route path="/app/notifications" element={<NotificationsPage />} />
          <Route
            path="/app/notifications-placeholder"
            element={
              <SimplePlaceholderPage
                eyebrow="Notifications"
                title="알림"
                description="현재는 사용자 페이지 구조에 맞춘 알림 영역만 구성했습니다."
              />
            }
          />
          <Route path="/app/iot" element={<SmartPillPage />} />
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

        <Route path="/chatbot" element={<Navigate to="/app/chatbot" replace />} />
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
