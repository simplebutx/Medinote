import React, { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import axios from 'axios'
import { clearAuthSession, getAuthSession, logout } from '../api'

const MyPage = () => {
  const navigate = useNavigate()
  const session = useMemo(() => getAuthSession(), [])
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isEditMode, setIsEditMode] = useState(false)

  // 수정용 상태들
  const [editUsername, setEditUsername] = useState('')
  const [editHealth, setEditHealth] = useState({
    isPregnant: false,
    isBreastfeeding: false,
    isSmoking: false,
    isDrinking: false,
  })
  const [editDocNumber, setEditDocNumber] = useState('')
  const [editDiseases, setEditDiseases] = useState([])
  const [diseaseInput, setDiseaseInput] = useState('')

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
        // 초기 수정 상태값 세팅
        setEditUsername(response.data.username)
        setEditHealth({
          isPregnant: !!response.data.isPregnant,
          isBreastfeeding: !!response.data.isBreastfeeding,
          isSmoking: !!response.data.isSmoking,
          isDrinking: !!response.data.isDrinking,
        })
        setEditDocNumber(response.data.docNumber || '')
        setEditDiseases(response.data.chronicDiseases || [])
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

  const handleUpdateProfile = async () => {
    try {
      await axios.patch('http://localhost:8080/api/auth/me', {
        username: editUsername,
        isPregnant: editHealth.isPregnant,
        isBreastfeeding: editHealth.isBreastfeeding,
        isSmoking: editHealth.isSmoking,
        isDrinking: editHealth.isDrinking,
        diseases: editDiseases,
        docNumber: editDocNumber
      }, {
        headers: {
          Authorization: `Bearer ${session.accessToken}`
        }
      })
      alert('프로필이 수정되었습니다.')
      window.location.reload() // 데이터 새로고침
    } catch (error) {
      console.error('프로필 수정 실패:', error)
      alert('프로필 수정 중 오류가 발생했습니다.')
    }
  }

  const toggleHealth = (key) => {
    setEditHealth(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const addDisease = () => {
    if (diseaseInput.trim() && !editDiseases.includes(diseaseInput.trim())) {
      setEditDiseases([...editDiseases, diseaseInput.trim()])
      setDiseaseInput('')
    }
  }

  const removeDisease = (target) => {
    setEditDiseases(editDiseases.filter(d => d !== target))
  }

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
          <div style={{ display: 'flex', gap: '10px' }}>
            {!isEditMode ? (
              <button type="button" onClick={() => setIsEditMode(true)} style={editButtonStyle}>
                정보 수정
              </button>
            ) : (
              <>
                <button type="button" onClick={handleUpdateProfile} style={saveButtonStyle}>
                  저장 완료
                </button>
                <button type="button" onClick={() => setIsEditMode(false)} style={cancelButtonStyle}>
                  취소
                </button>
              </>
            )}
            <button type="button" onClick={handleLogout} style={dangerButtonStyle}>
              로그아웃
            </button>
          </div>
        </div>

        <div style={{ marginBottom: '30px' }}>
          <h3 style={sectionTitleStyle}>1. 기본 계정 정보</h3>
          <div style={gridStyle}>
            <div style={infoCardStyle}>
              <p style={labelStyle}>이메일</p>
              <p style={valueStyle}>{profile.email}</p>
            </div>
            <div style={infoCardStyle}>
              <p style={labelStyle}>닉네임</p>
              {!isEditMode ? (
                <p style={valueStyle}>{profile.username}</p>
              ) : (
                <input 
                  type="text" 
                  value={editUsername} 
                  onChange={(e) => setEditUsername(e.target.value)}
                  style={inputStyle}
                />
              )}
            </div>
            <div style={infoCardStyle}>
              <p style={labelStyle}>생년월일</p>
              <p style={valueStyle}>{profile.birthDate}</p>
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
                {!isEditMode ? (
                  <p style={valueStyle}>{profile.isPregnant ? '해당있음' : '등록안함'}</p>
                ) : (
                  <div style={{marginTop:'8px'}}>
                    <input type="checkbox" checked={editHealth.isPregnant} onChange={() => toggleHealth('isPregnant')} /> 해당있음
                  </div>
                )}
              </div>
              <div style={infoCardStyle}>
                <p style={labelStyle}>수유 여부</p>
                {!isEditMode ? (
                  <p style={valueStyle}>{profile.isBreastfeeding ? '해당있음' : '등록안함'}</p>
                ) : (
                  <div style={{marginTop:'8px'}}>
                    <input type="checkbox" checked={editHealth.isBreastfeeding} onChange={() => toggleHealth('isBreastfeeding')} /> 해당있음
                  </div>
                )}
              </div>
              <div style={infoCardStyle}>
                <p style={labelStyle}>흡연 여부</p>
                {!isEditMode ? (
                  <p style={valueStyle}>{profile.isSmoking ? '해당있음' : '등록안함'}</p>
                ) : (
                  <div style={{marginTop:'8px'}}>
                    <input type="checkbox" checked={editHealth.isSmoking} onChange={() => toggleHealth('isSmoking')} /> 해당있음
                  </div>
                )}
              </div>
              <div style={infoCardStyle}>
                <p style={labelStyle}>음주 여부</p>
                {!isEditMode ? (
                  <p style={valueStyle}>{profile.isDrinking ? '해당있음' : '등록안함'}</p>
                ) : (
                  <div style={{marginTop:'8px'}}>
                    <input type="checkbox" checked={editHealth.isDrinking} onChange={() => toggleHealth('isDrinking')} /> 해당있음
                  </div>
                )}
              </div>
            </div>
            
            <div style={{...infoCardStyle, marginTop: '16px'}}>
              <p style={labelStyle}>보유 기저질환</p>
              {isEditMode && (
                <div style={{ display: 'flex', gap: '10px', marginTop: '10px', marginBottom: '10px' }}>
                  <input 
                    type="text" 
                    placeholder="질병 입력 (예: 고혈압)" 
                    value={diseaseInput} 
                    onChange={(e) => setDiseaseInput(e.target.value)}
                    style={{...inputStyle, flex: 1}}
                  />
                  <button type="button" onClick={addDisease} style={addButtonStyle}>추가</button>
                </div>
              )}
              <div style={{ marginTop: '8px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {!isEditMode ? (
                  profile.chronicDiseases && profile.chronicDiseases.length > 0 ? (
                    profile.chronicDiseases.map((disease, idx) => (
                      <span key={idx} style={tagStyle}>{disease}</span>
                    ))
                  ) : (
                    <p style={{ margin: 0, color: '#94a3b8' }}>등록된 기저질환이 없습니다.</p>
                  )
                ) : (
                  editDiseases.map((disease, idx) => (
                    <span key={idx} style={tagStyle} onClick={() => removeDisease(disease)} title="클릭하여 삭제">
                      {disease} ×
                    </span>
                  ))
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
                {!isEditMode ? (
                  <p style={valueStyle}>{profile.docNumber || '미등록'}</p>
                ) : (
                  <input 
                    type="text" 
                    value={editDocNumber} 
                    onChange={(e) => setEditDocNumber(e.target.value)}
                    style={inputStyle}
                  />
                )}
              </div>
              <div style={infoCardStyle}>
                <p style={labelStyle}>면허 번호</p>
                <p style={valueStyle}>{profile.licenseNumber || '미등록'}</p>
              </div>
            </div>
            {profile.licenseImage && (
              <div style={{...infoCardStyle, marginTop: '16px'}}>
                <p style={labelStyle}>면허증 이미지 (수정 불가)</p>
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

const editButtonStyle = {
  padding: '10px 16px',
  borderRadius: '10px',
  border: 'none',
  backgroundColor: '#3b82f6',
  color: '#ffffff',
  cursor: 'pointer',
  fontWeight: 700,
}

const saveButtonStyle = {
  padding: '10px 16px',
  borderRadius: '10px',
  border: 'none',
  backgroundColor: '#10b981',
  color: '#ffffff',
  cursor: 'pointer',
  fontWeight: 700,
}

const cancelButtonStyle = {
  padding: '10px 16px',
  borderRadius: '10px',
  border: '1px solid #e2e8f0',
  backgroundColor: '#ffffff',
  color: '#64748b',
  cursor: 'pointer',
  fontWeight: 700,
}

const addButtonStyle = {
  padding: '8px 16px',
  borderRadius: '8px',
  border: 'none',
  backgroundColor: '#3b82f6',
  color: '#ffffff',
  cursor: 'pointer',
  fontWeight: 600,
}

const inputStyle = {
  width: '100%',
  padding: '8px 12px',
  borderRadius: '8px',
  border: '1px solid #e2e8f0',
  marginTop: '8px',
  boxSizing: 'border-box',
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
