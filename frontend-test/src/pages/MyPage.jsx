import React from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { clearAuthSession, getAuthSession, logout } from '../api'

const MyPage = () => {
  const navigate = useNavigate()
  const session = getAuthSession()
  const displayName = session?.email?.split('@')[0] || ''

  const handleLogout = async () => {
    try {
      if (session?.accessToken) {
        await logout(session.accessToken)
      }
      alert('로그아웃 성공')
    } catch (error) {
      alert(`로그아웃 요청 실패: ${error.response?.data?.message || error.message}`)
    } finally {
      clearAuthSession()
      navigate('/login')
    }
  }

  if (!session) {
    return (
      <div style={containerStyle}>
        <h2>로그인 정보가 없습니다.</h2>
        <Link to="/login" style={linkStyle}>로그인으로 이동</Link>
      </div>
    )
  }

  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        <div style={headerRowStyle}>
          <div>
            <p style={labelStyle}>backend-auth 테스트</p>
            <h1 style={titleStyle}>간단 마이페이지</h1>
          </div>
          <button type="button" onClick={handleLogout} style={dangerButtonStyle}>
            로그아웃 테스트
          </button>
        </div>

        <div style={gridStyle}>
          <div style={infoCardStyle}>
            <p style={labelStyle}>이름</p>
            <p style={valueStyle}>{displayName || '이름 없음'}</p>
          </div>
          <div style={infoCardStyle}>
            <p style={labelStyle}>이메일</p>
            <p style={valueStyle}>{session.email || '이메일 없음'}</p>
          </div>
          <div style={infoCardStyle}>
            <p style={labelStyle}>권한</p>
            <p style={valueStyle}>{session.role || '권한 없음'}</p>
          </div>
          <div style={infoCardStyle}>
            <p style={labelStyle}>토큰 저장 여부</p>
            <p style={valueStyle}>{session.accessToken ? '저장됨' : '없음'}</p>
          </div>
        </div>

        <p style={helpTextStyle}>
          현재 backend-auth 로그인 응답에는 username이 없어서 이름은 이메일 앞부분으로 표시합니다.
        </p>

        <div style={footerStyle}>
          <Link to="/" style={linkStyle}>홈으로</Link>
        </div>
      </div>
    </div>
  )
}

export default MyPage

const containerStyle = {
  minHeight: '100vh',
  padding: '40px 20px',
  backgroundColor: '#f8fafc',
}

const cardStyle = {
  maxWidth: '820px',
  margin: '0 auto',
  backgroundColor: '#ffffff',
  border: '1px solid #e2e8f0',
  borderRadius: '18px',
  padding: '28px',
  boxShadow: '0 10px 30px rgba(15, 23, 42, 0.08)',
}

const headerRowStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  gap: '16px',
  marginBottom: '24px',
}

const gridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
  gap: '16px',
}

const infoCardStyle = {
  backgroundColor: '#f8fafc',
  borderRadius: '14px',
  padding: '18px',
  border: '1px solid #e2e8f0',
}

const labelStyle = {
  margin: 0,
  color: '#64748b',
  fontSize: '14px',
}

const titleStyle = {
  margin: '6px 0 0',
  fontSize: '30px',
  color: '#0f172a',
}

const valueStyle = {
  margin: '8px 0 0',
  color: '#0f172a',
  fontSize: '18px',
  fontWeight: 700,
  wordBreak: 'break-all',
}

const helpTextStyle = {
  margin: '20px 0 0',
  color: '#64748b',
  fontSize: '14px',
}

const footerStyle = {
  marginTop: '18px',
}

const linkStyle = {
  color: '#2563eb',
  textDecoration: 'none',
  fontWeight: 600,
}

const dangerButtonStyle = {
  padding: '12px 16px',
  borderRadius: '10px',
  border: 'none',
  backgroundColor: '#dc2626',
  color: '#ffffff',
  cursor: 'pointer',
  fontWeight: 700,
}
