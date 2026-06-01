import { BrowserRouter, Link, Route, Routes, Navigate, Outlet } from 'react-router-dom'
import { getAuthSession } from './api'

import './App.css'
import Chatbot from './pages/Chatbot'
import Login from './pages/Login'
import MedicineSearch from './pages/MedicineSearch'
import MyPage from './pages/MyPage'
import ScheduleListPage from './pages/schedule/ScheduleListPage'
import Signup from './pages/Signup'
import Sync from './pages/Sync'
import Consultation from './pages/Consultation'
import UserConsultationList from './pages/UserConsultationList'
import PharmacistRoomList from './pages/PharmacistRoomList'
import PharmacistDashboard from './pages/PharmacistDashboard'
import PharmacistProfile from './pages/PharmacistProfile'

// --- 1. 유저 레이아웃 (기존 유지: 블루) ---
const UserLayout = () => (
  <div className="user-layout">
    <nav className="user-nav" style={{ 
      display: 'flex', gap: '20px', padding: '15px 25px', 
      background: '#007AFF', color: '#fff', alignItems: 'center',
      boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
    }}>
      <strong style={{ fontSize: '1.2rem' }}>Mymedi User</strong>
      <Link to="/u/home" style={userNavLinkStyle}>홈</Link>
      <Link to="/u/chat" style={userNavLinkStyle}>상담/챗봇</Link>
      <Link to="/u/my" style={userNavLinkStyle}>마이페이지</Link>
      <button onClick={() => { localStorage.removeItem('authSession'); window.location.href='/login'; }} 
              style={{ marginLeft: 'auto', background: 'transparent', border: '1px solid #fff', color: '#fff', padding: '5px 12px', borderRadius: '5px', cursor: 'pointer' }}>
        로그아웃
      </button>
    </nav>
    <div className="user-content" style={{ padding: '20px' }}>
      <Outlet />
    </div>
  </div>
)

// --- 2. 약사 레이아웃 (초록색 테마) ---
const PharmLayout = () => (
  <div className="pharm-layout" style={{ display: 'flex', minHeight: '100vh' }}>
    <aside style={{ 
      width: '260px', background: '#065f46', color: '#fff', 
      padding: '30px 20px', display: 'flex', flexDirection: 'column'
    }}>
      <h2 style={{ fontSize: '20px', marginBottom: '40px', color: '#34d399' }}>🩺 약사 포털</h2>
      <nav style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        <Link to="/p/dashboard" style={pharmNavLinkStyle}>대시보드</Link>
        <Link to="/p/rooms" style={pharmNavLinkStyle}>상담 관리</Link>
        <Link to="/p/profile" style={pharmNavLinkStyle}>내 정보 관리</Link>
      </nav>
      <button onClick={() => { localStorage.removeItem('authSession'); window.location.href='/login'; }} 
              style={{ marginTop: 'auto', background: '#10b981', color: '#fff', border: 'none', padding: '12px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
        로그아웃
      </button>
    </aside>
    <main style={{ flex: 1, padding: '40px', background: '#f0fdf4' }}>
      <Outlet />
    </main>
  </div>
)

// --- 3. 관리자 레이아웃 (진회색 테마) ---
const AdminLayout = () => (
  <div className="admin-layout" style={{ display: 'flex', minHeight: '100vh' }}>
    <aside style={{ width: '260px', background: '#1f2937', color: '#fff', padding: '30px 20px', display: 'flex', flexDirection: 'column' }}>
      <h2 style={{ fontSize: '20px', marginBottom: '40px', color: '#9ca3af' }}>⚙️ 시스템 관리</h2>
      <nav style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        <Link to="/a/users" style={pharmNavLinkStyle}>회원 관리</Link>
        <Link to="/a/sync" style={pharmNavLinkStyle}>데이터 동기화</Link>
      </nav>
      <button onClick={() => { localStorage.removeItem('authSession'); window.location.href='/login'; }} 
              style={{ marginTop: 'auto', background: '#4b5563', color: '#fff', border: 'none', padding: '12px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
        로그아웃
      </button>
    </aside>
    <main style={{ flex: 1, padding: '40px', background: '#f9fafb' }}>
      <Outlet />
    </main>
  </div>
)

// --- 스타일 헬퍼 ---
const userNavLinkStyle = { color: '#fff', textDecoration: 'none', fontWeight: '500' };
const pharmNavLinkStyle = { color: '#e5e7eb', textDecoration: 'none', fontSize: '16px' };

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* 공통 진입점 */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />

        {/* 👤 일반 유저 전용 (/u) */}
        <Route path="/u" element={<UserLayout />}>
          <Route path="home" element={<ScheduleListPage />} />
          <Route path="chat" element={<Chatbot />} />
          <Route path="my" element={<MyPage />} />
          <Route path="consultations" element={<UserConsultationList />} />
          <Route path="consultation" element={<Consultation />} />
          <Route path="medicine-search" element={<MedicineSearch />} />
        </Route>

        {/* 🩺 약사 전용 (/p) */}
        <Route path="/p" element={<PharmLayout />}>
          <Route path="dashboard" element={<PharmacistDashboard />} />
          <Route path="rooms" element={<PharmacistRoomList />} />
          <Route path="profile" element={<PharmacistProfile />} />
          <Route path="consultation" element={<Consultation />} />
        </Route>

        {/* ⚙️ 관리자 전용 (/a) */}
        <Route path="/a" element={<AdminLayout />}>
          <Route path="users" element={<div>전체 회원 목록 (준비중)</div>} />
          <Route path="sync" element={<Sync />} />
        </Route>

        {/* 404 처리 */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
