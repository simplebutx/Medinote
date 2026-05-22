import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import axios from 'axios'
import { clearAuthSession, getAuthSession, logout } from '../api'

const MyPage = () => {
  const navigate = useNavigate()
  const session = getAuthSession()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchProfile = async () => {
      if (!session?.accessToken) {
        setLoading(false)
        return
      }
      try {
        const response = await axios.get('http://localhost:8080/api/auth/me', {
          headers: {
            Authorization: `Bearer ${session.accessToken}`
          }
        })
        setProfile(response.data)
      } catch (error) {
        console.error('프로필 조회 실패:', error)
        if (error.response?.status === 401 || error.response?.status === 403) {
            alert('인증이 만료되었습니다. 다시 로그인해주세요.')
            clearAuthSession()
            navigate('/login')
        }
      } finally {
        setLoading(false)
      }
    }
    fetchProfile()
  }, [session, navigate])

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

  if (loading) return <div style={containerStyle}><h2>로딩 중...</h2></div>

  if (!session || !profile) {
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
            <p style={labelStyle}>내 정보</p>
            <h1 style={titleStyle}>{profile.username}님의 마이페이지</h1>
          </div>
          <button type="button" onClick={handleLogout} style={dangerButtonStyle}>
            로그아웃
          </button>
        </div>

        <div style={{ marginBottom: '30px' }}>
          <h3 style={sectionTitleStyle}>1. 기본 계정 정보</h3>
          <div style={gridStyle}>
            <div style={infoCardStyle}>
              <p style={labelStyle}>이메일</p>
              <p style={valueStyle}>{profile.email}</p>
            </div>
            <div style={infoCardStyle}>
              <p style={labelStyle}>생년월일</p>
              <p style={valueStyle}>{profile.birthDate}</p>
            </div>
            <div style={infoCardStyle}>
              <p style={labelStyle}>성별</p>
              <p style={valueStyle}>{profile.gender === 'MALE' ? '남성' : '여성'}</p>
            </div>
            <div style={infoCardStyle}>
              <p style={labelStyle}>권한</p>
              <p style={valueStyle}>{profile.role}</p>
            </div>
          </div>
        </div>

        {profile.role === 'USER' && (
          <div style={{ marginBottom: '30px' }}>
            <h3 style={sectionTitleStyle}>2. 건강 정보 (일반 유저 전용)</h3>
            <div style={gridStyle}>
              <div style={infoCardStyle}>
                <p style={labelStyle}>임신 여부</p>
                <p style={valueStyle}>{profile.isPregnant ? '해당있음' : '등록안함'}</p>
              </div>
              <div style={infoCardStyle}>
                <p style={labelStyle}>수유 여부</p>
                <p style={valueStyle}>{profile.isBreastfeeding ? '해당있음' : '등록안함'}</p>
              </div>
              <div style={infoCardStyle}>
                <p style={labelStyle}>흡연 여부</p>
                <p style={valueStyle}>{profile.isSmoking ? '해당있음' : '등록안함'}</p>
              </div>
              <div style={infoCardStyle}>
                <p style={labelStyle}>음주 여부</p>
                <p style={valueStyle}>{profile.isDrinking ? '해당있음' : '등록안함'}</p>
              </div>
            </div>
            
            <div style={{...infoCardStyle, marginTop: '16px'}}>
              <p style={labelStyle}>보유 기저질환</p>
              <div style={{ marginTop: '8px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {profile.chronicDiseases && profile.chronicDiseases.length > 0 ? (
                  profile.chronicDiseases.map((disease, idx) => (
                    <span key={idx} style={tagStyle}>{disease}</span>
                  ))
                ) : (
                  <p style={{ margin: 0, color: '#94a3b8' }}>등록된 기저질환이 없습니다.</p>
                )}
              </div>
            </div>
          </div>
        )}

        {profile.role === 'PHARMACIST' && (
          <div style={{ marginBottom: '30px' }}>
            <h3 style={sectionTitleStyle}>2. 면허 및 약국 정보 (약사 전용)</h3>
            <div style={gridStyle}>
              <div style={infoCardStyle}>
                <p style={labelStyle}>약국명</p>
                <p style={valueStyle}>{profile.docNumber || '미등록'}</p>
              </div>
              <div style={infoCardStyle}>
                <p style={labelStyle}>면허 번호</p>
                <p style={valueStyle}>{profile.licenseNumber || '미등록'}</p>
              </div>
            </div>
            {profile.licenseImage && (
              <div style={{...infoCardStyle, marginTop: '16px'}}>
                <p style={labelStyle}>면허증 이미지</p>
                <img 
                  src={profile.licenseImage} 
                  alt="면허증" 
                  style={{ marginTop: '10px', maxWidth: '100%', borderRadius: '8px', border: '1px solid #e2e8f0' }} 
                />
              </div>
            )}
          </div>
        )}

        <div style={footerStyle}>
          <Link to="/" style={linkStyle}>← 홈으로 돌아가기</Link>
        </div>
      </div>
    </div>
  )
}

export default MyPage

const sectionTitleStyle = {
  fontSize: '18px',
  color: '#475569',
  marginBottom: '12px',
  borderBottom: '2px solid #f1f5f9',
  paddingBottom: '8px'
}

const tagStyle = {
  padding: '4px 12px',
  backgroundColor: '#e0f2fe',
  color: '#0369a1',
  borderRadius: '20px',
  fontSize: '14px',
  fontWeight: 600
}

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
