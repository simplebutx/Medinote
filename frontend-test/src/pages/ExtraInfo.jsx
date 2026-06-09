import React, { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import axios from 'axios'

const HEALTH_OPTIONS = [
  { key: 'isPregnant', label: '임산부' },
  { key: 'isBreastfeeding', label: '모유수유 중' },
  { key: 'isSmoking', label: '흡연' },
  { key: 'isDrinking', label: '음주' },
  { key: 'isChild', label: '소아 (12세 미만)' },
  { key: 'isElderly', label: '고령 (65세 이상)' },
]

function ExtraInfo() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  const email = searchParams.get('email')

  // 단계 관리 (1: 기본정보 및 역할선택, 2: 상세정보)
  const [step, setStep] = useState(1)
  
  // 1단계 공통 정보
  const [birthDate, setBirthDate] = useState('')
  const [gender, setGender] = useState('MALE')
  const [role, setRole] = useState('USER') // USER or PHARMACIST

  // 2단계 일반 유저 정보
  const [healthState, setHealthState] = useState({
    isPregnant: false, isBreastfeeding: false, isSmoking: false,
    isDrinking: false, isChild: false, isElderly: false,
  })
  const [diseaseNames, setDiseaseNames] = useState([])
  const [diseaseInput, setDiseaseInput] = useState('')
  const [diseaseSuggestions, setDiseaseSuggestions] = useState([])

  // 2단계 약사 정보
  const [docNumber, setDocNumber] = useState('')
  const [licenseNumber, setLicenseNumber] = useState('')
  const [licenseImage, setLicenseImage] = useState(null)

  const diseaseDebounceRef = useRef(null)

  useEffect(() => {
    if (!token || !email) {
      alert('잘못된 접근입니다.')
      navigate('/login')
    }
  }, [token, email, navigate])

  const toggleHealthOption = (key) => {
    setHealthState(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const handleDiseaseSuggest = async (keyword) => {
    try {
      const response = await axios.get('/api/auth/diseases/suggest', { params: { keyword } })
      setDiseaseSuggestions(response.data.filter(name => !diseaseNames.includes(name)))
    } catch { setDiseaseSuggestions([]) }
  }

  const handleDiseaseChange = (e) => {
    const value = e.target.value
    setDiseaseInput(value)
    if (diseaseDebounceRef.current) clearTimeout(diseaseDebounceRef.current)
    const trimmed = value.trim()
    if (!trimmed) { setDiseaseSuggestions([]); return; }
    diseaseDebounceRef.current = setTimeout(() => handleDiseaseSuggest(trimmed), 220)
  }

  const addDisease = (rawName) => {
    const trimmed = rawName.trim()
    if (!trimmed) return
    setDiseaseNames(prev => (prev.includes(trimmed) ? prev : [...prev, trimmed]))
    setDiseaseInput('')
    setDiseaseSuggestions([])
  }

  const handleUserSubmit = async (e) => {
    e.preventDefault()
    try {
      // 1. 기본 프로필 및 역할 업데이트
      await axios.patch('/api/auth/me', {
        username: email.split('@')[0], 
        birthDate,
        gender,
        role: 'USER' // 역할 전달
      }, { headers: { Authorization: `Bearer ${token}` } })

      // 2. 건강 정보 업데이트
      await axios.post('/api/auth/user/profile', 
        { email, ...healthState, diseaseNames },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      alert('회원가입이 완료되었습니다. 다시 로그인해 주세요.')
      navigate('/login')
    } catch (error) {
      alert('정보 저장에 실패했습니다.')
    }
  }

  const handlePharmacistSubmit = async (e) => {
    e.preventDefault()
    try {
      // 1. 기본 프로필 및 역할 업데이트
      await axios.patch('/api/auth/me', {
        username: email.split('@')[0],
        birthDate,
        gender,
        role: 'PHARMACIST' // 역할 전달
      }, { headers: { Authorization: `Bearer ${token}` } })

      // 2. 약사 인증 정보 제출
      const formData = new FormData()
      formData.append('data', new Blob([JSON.stringify({ docNumber, licenseNumber, email })], { type: 'application/json' }))
      formData.append('licenseImage', licenseImage)
      
      await axios.post('/api/auth/pharmacists/verification', formData, { 
        headers: { 'Content-Type': 'multipart/form-data', Authorization: `Bearer ${token}` } 
      })
      alert('약사 인증 요청이 완료되었습니다. 관리자 승인 후 이용 가능합니다.')
      navigate('/login')
    } catch (error) {
      alert('인증 요청에 실패했습니다.')
    }
  }

  return (
    <div className="signup-page">
      <div className="signup-container">
        <header className="signup-header">
          <h1>추가 정보 입력</h1>
          <p>{email}님, 마이메디에 오신 것을 환영합니다!</p>
        </header>

        <div className="signup-progress">
          <div className={`signup-progress-step ${step >= 1 ? 'active' : ''}`} />
          <div className={`signup-progress-step ${step >= 2 ? 'active' : ''}`} />
        </div>

        <div className="signup-card">
          {step === 1 ? (
            <form onSubmit={(e) => { e.preventDefault(); setStep(2); }}>
              <div className="signup-section-title">Step 1. 기본 정보 및 유형 선택</div>
              
              <div className="signup-form-group">
                <label className="signup-label">생년월일</label>
                <input type="date" value={birthDate} onChange={e => setBirthDate(e.target.value)} required className="signup-input" />
              </div>

              <div className="signup-form-group">
                <label className="signup-label">성별</label>
                <div className="signup-gender-group">
                  <button type="button" onClick={() => setGender('MALE')} className={`signup-toggle-btn ${gender === 'MALE' ? 'active' : ''}`}>남성</button>
                  <button type="button" onClick={() => setGender('FEMALE')} className={`signup-toggle-btn ${gender === 'FEMALE' ? 'active' : ''}`}>여성</button>
                </div>
              </div>

              <div className="signup-form-group">
                <label className="signup-label">가입 유형</label>
                <div className="signup-gender-group">
                  <button type="button" onClick={() => setRole('USER')} className={`signup-toggle-btn ${role === 'USER' ? 'active' : ''}`}>일반 유저</button>
                  <button type="button" onClick={() => setRole('PHARMACIST')} className={`signup-toggle-btn ${role === 'PHARMACIST' ? 'active' : ''}`}>약사 유저</button>
                </div>
              </div>

              <button type="submit" className="signup-submit-btn">다음 단계로</button>
            </form>
          ) : role === 'USER' ? (
            <form onSubmit={handleUserSubmit}>
              <div className="signup-section-title">Step 2. 건강 정보 입력</div>
              <div className="signup-health-grid">
                {HEALTH_OPTIONS.map(opt => (
                  <div key={opt.key} onClick={() => toggleHealthOption(opt.key)} className={`health-option-card ${healthState[opt.key] ? 'active' : ''}`}>{opt.label}</div>
                ))}
              </div>
              <div className="signup-form-group" style={{ position: 'relative' }}>
                <label className="signup-label">보유 기저질환</label>
                <input type="text" placeholder="질환 검색..." value={diseaseInput} onChange={handleDiseaseChange} onKeyDown={e => (e.key === 'Enter') && (e.preventDefault(), addDisease(diseaseInput))} className="signup-input" />
                {diseaseSuggestions.length > 0 && (
                  <ul className="medicine-search-suggestion-list" style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 10 }}>
                    {diseaseSuggestions.map(s => <li key={s} onClick={() => addDisease(s)} className="medicine-search-suggestion-item">{s}</li>)}
                  </ul>
                )}
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '24px' }}>
                {diseaseNames.map(d => <span key={d} onClick={() => setDiseaseNames(prev => prev.filter(x => x !== d))} className="disease-tag">#{d} ×</span>)}
              </div>
              <div className="signup-footer-actions">
                <button type="button" onClick={() => setStep(1)} className="signup-back-btn">이전으로</button>
                <button type="submit" className="signup-submit-btn">가입 완료</button>
              </div>
            </form>
          ) : (
            <form onSubmit={handlePharmacistSubmit}>
              <div className="signup-section-title">Step 2. 약사 면허 인증</div>
              <div className="signup-form-group">
                <label className="signup-label">소속 약국명</label>
                <input type="text" value={docNumber} onChange={e => setDocNumber(e.target.value)} required className="signup-input" />
              </div>
              <div className="signup-form-group">
                <label className="signup-label">면허번호</label>
                <input type="text" value={licenseNumber} onChange={e => setLicenseNumber(e.target.value)} required className="signup-input" />
              </div>
              <div className="signup-form-group">
                <label className="signup-label">면허증 이미지</label>
                <input type="file" onChange={e => setLicenseImage(e.target.files[0])} required className="signup-input" />
              </div>
              <div className="signup-footer-actions">
                <button type="button" onClick={() => setStep(1)} className="signup-back-btn">이전으로</button>
                <button type="submit" className="signup-submit-btn">인증 요청 완료</button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

export default ExtraInfo
