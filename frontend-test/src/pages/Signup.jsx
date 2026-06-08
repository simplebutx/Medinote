import React, { useEffect, useRef, useState } from 'react'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'

const HEALTH_OPTIONS = [
  { key: 'isPregnant', label: '임산부' },
  { key: 'isBreastfeeding', label: '모유수유 중' },
  { key: 'isSmoking', label: '흡연' },
  { key: 'isDrinking', label: '음주' },
  { key: 'isChild', label: '소아 (12세 미만)' },
  { key: 'isElderly', label: '고령 (65세 이상)' },
]

function Signup() {
  const navigate = useNavigate()

  const [step, setStep] = useState(1)
  const [email, setEmail] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [gender, setGender] = useState('MALE')
  const [role, setRole] = useState('USER')

  const [verificationCode, setVerificationCode] = useState('')
  const [isCodeSent, setIsCodeSent] = useState(false)
  const [isSmsVerified, setIsSmsVerified] = useState(false)
  const [timeLeft, setTimeLeft] = useState(0)

  const [healthState, setHealthState] = useState({
    isPregnant: false,
    isBreastfeeding: false,
    isSmoking: false,
    isDrinking: false,
    isChild: false,
    isElderly: false,
  })
  const [diseaseInput, setDiseaseInput] = useState('')
  const [diseaseNames, setDiseaseNames] = useState([])
  const [diseaseSuggestions, setDiseaseSuggestions] = useState([])
  const [diseaseLoading, setDiseaseLoading] = useState(false)

  const [docNumber, setDocNumber] = useState('')
  const [licenseNumber, setLicenseNumber] = useState('')
  const [licenseImage, setLicenseImage] = useState(null)

  const diseaseDebounceRef = useRef(null)
  const latestDiseaseKeywordRef = useRef('')

  useEffect(() => {
    if (timeLeft <= 0) return
    const timer = setInterval(() => setTimeLeft((prev) => prev - 1), 1000)
    return () => clearInterval(timer)
  }, [timeLeft])

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  }

  const showError = (error, fallbackMessage) => {
    const message = error?.response?.data?.message || (typeof error?.response?.data === 'string' ? error.response.data : null) || fallbackMessage
    alert(message)
  }

  const handleSendVerificationCode = async () => {
    if (!phoneNumber) { alert('휴대폰 번호를 입력해 주세요.'); return; }
    try {
      await axios.post('/api/auth/sms/send', { phoneNumber })
      setIsCodeSent(true)
      setTimeLeft(180)
      alert('인증번호를 발송했습니다.')
    } catch (error) { showError(error, '인증번호 발송에 실패했습니다.') }
  }

  const handleVerifyCode = async () => {
    if (!verificationCode) { alert('인증번호를 입력해 주세요.'); return; }
    try {
      const res = await axios.post('/api/auth/sms/verify', { phoneNumber, code: verificationCode })
      if (res.data === true) {
        setIsSmsVerified(true)
        setTimeLeft(0)
        alert('휴대폰 인증이 완료되었습니다.')
      } else { alert('인증번호를 다시 확인해 주세요.') }
    } catch (error) { showError(error, '인증번호 확인에 실패했습니다.') }
  }

  const handleStep1Submit = async (event) => {
    event.preventDefault()
    if (!isSmsVerified) { alert('휴대폰 인증을 완료해 주세요.'); return; }
    try {
      await axios.post('/api/auth/signup', { email, password, username, birthDate, gender, role })
      localStorage.setItem('tempEmail', email)
      setStep(2)
    } catch (error) { showError(error, '1단계 가입 실패') }
  }

  const toggleHealthOption = (key) => {
    setHealthState(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const addDisease = (rawName) => {
    const trimmed = rawName.trim().replace(/^@/, '')
    if (!trimmed) return
    setDiseaseNames(prev => (prev.includes(trimmed) ? prev : [...prev, trimmed]))
    setDiseaseInput('')
    setDiseaseSuggestions([])
    setDiseaseLoading(false)
    latestDiseaseKeywordRef.current = ''
  }

  const handleDiseaseSuggest = async (keyword) => {
    try {
      const response = await axios.get('/api/auth/diseases/suggest', { params: { keyword } })
      if (latestDiseaseKeywordRef.current === keyword) {
        setDiseaseSuggestions(response.data.filter(name => !diseaseNames.includes(name)))
      }
    } catch { setDiseaseSuggestions([]) } finally { setDiseaseLoading(false) }
  }

  const handleDiseaseChange = (e) => {
    const value = e.target.value
    setDiseaseInput(value)
    if (diseaseDebounceRef.current) clearTimeout(diseaseDebounceRef.current)
    const trimmed = value.trim().replace(/^@/, '')
    latestDiseaseKeywordRef.current = trimmed
    if (!trimmed) { setDiseaseSuggestions([]); return; }
    setDiseaseLoading(true)
    diseaseDebounceRef.current = setTimeout(() => handleDiseaseSuggest(trimmed), 220)
  }

  const handleUserStep2Submit = async (e) => {
    e.preventDefault()
    const tempEmail = localStorage.getItem('tempEmail')
    try {
      await axios.post('/api/auth/user/profile', { email: tempEmail, ...healthState, diseaseNames })
      alert('회원가입이 완료되었습니다.')
      localStorage.removeItem('tempEmail')
      navigate('/login')
    } catch (error) { showError(error, '추가 정보 저장 실패') }
  }

  const handlePharmacistStep2Submit = async (e) => {
    e.preventDefault()
    const tempEmail = localStorage.getItem('tempEmail')
    const formData = new FormData()
    formData.append('data', new Blob([JSON.stringify({ docNumber, licenseNumber, email: tempEmail })], { type: 'application/json' }))
    formData.append('licenseImage', licenseImage)
    try {
      await axios.post('/api/auth/pharmacists/verification', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
      alert('약사 인증 요청이 완료되었습니다.')
      localStorage.removeItem('tempEmail')
      navigate('/login')
    } catch (error) { showError(error, '인증 요청 실패') }
  }

  return (
    <div className="signup-page">
      <div className="signup-container">
        <header className="signup-header">
          <h1>{role === 'USER' ? '일반 유저 가입' : '약사 유저 가입'}</h1>
          <p>내 손안의 스마트 복약 관리, MyMedi</p>
        </header>

        <div className="signup-progress">
          <div className={`signup-progress-step ${step >= 1 ? 'active' : ''}`} />
          <div className={`signup-progress-step ${step >= 2 ? 'active' : ''}`} />
        </div>

        <div className="signup-card">
          {step === 1 ? (
            <form onSubmit={handleStep1Submit}>
              <div className="signup-section-title">Step 1. 기본 정보 입력</div>
              
              <div className="signup-form-group">
                <label className="signup-label">이메일</label>
                <input type="email" placeholder="example@email.com" value={email} onChange={e => setEmail(e.target.value)} required className="signup-input" />
              </div>

              <div className="signup-form-group">
                <label className="signup-label">휴대폰 번호</label>
                <div className="signup-input-row">
                  <input type="tel" placeholder="01012345678" value={phoneNumber} onChange={e => setPhoneNumber(e.target.value)} readOnly={isSmsVerified} required className="signup-input" />
                  <button type="button" onClick={handleSendVerificationCode} disabled={isSmsVerified} className="signup-verify-btn">
                    {isCodeSent ? '재발송' : '인증발송'}
                  </button>
                </div>
              </div>

              {isCodeSent && (
                <div className="signup-form-group">
                  <label className="signup-label">인증번호</label>
                  <div className="signup-input-row">
                    <input type="text" placeholder="6자리 입력" value={verificationCode} onChange={e => setVerificationCode(e.target.value)} disabled={isSmsVerified} required className="signup-input" />
                    <button type="button" onClick={handleVerifyCode} disabled={isSmsVerified} className="signup-verify-btn">
                      {isSmsVerified ? '인증완료' : '확인'}
                    </button>
                  </div>
                  {timeLeft > 0 && <p style={{ color: '#ef4444', fontSize: '13px', marginTop: '4px' }}>남은 시간: {formatTime(timeLeft)}</p>}
                </div>
              )}

              <div className="signup-form-group">
                <label className="signup-label">비밀번호</label>
                <input type="password" placeholder="8자 이상 입력" value={password} onChange={e => setPassword(e.target.value)} required className="signup-input" />
              </div>

              <div className="signup-form-group">
                <label className="signup-label">이름</label>
                <input type="text" placeholder="실명을 입력해주세요" value={username} onChange={e => setUsername(e.target.value)} required className="signup-input" />
              </div>

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

              <button type="submit" disabled={!isSmsVerified} className="signup-submit-btn">
                다음 단계로
              </button>
            </form>
          ) : role === 'USER' ? (
            <form onSubmit={handleUserStep2Submit}>
              <div className="signup-section-title">Step 2. 건강 정보 입력</div>
              <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '24px' }}>맞춤형 복약 가이드를 위해 추가 정보를 입력해 주세요.</p>
              
              <label className="signup-label">건강 상태 (해당 사항 선택)</label>
              <div className="signup-health-grid">
                {HEALTH_OPTIONS.map(opt => (
                  <div key={opt.key} onClick={() => toggleHealthOption(opt.key)} className={`health-option-card ${healthState[opt.key] ? 'active' : ''}`}>
                    {opt.label}
                  </div>
                ))}
              </div>

              <div className="signup-form-group" style={{ position: 'relative' }}>
                <label className="signup-label">보유 기저질환</label>
                <input type="text" placeholder="예: 고혈압, 당뇨 (검색 가능)" value={diseaseInput} onChange={handleDiseaseChange} onKeyDown={e => (e.key === 'Enter' || e.key === ',') && (e.preventDefault(), addDisease(diseaseInput))} className="signup-input" />
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
                <button type="button" onClick={() => setStep(1)} className="signup-back-btn">이전 단계로</button>
                <button type="submit" className="signup-submit-btn" style={{ width: 'auto', padding: '14px 40px' }}>가입 완료</button>
              </div>
            </form>
          ) : (
            <form onSubmit={handlePharmacistStep2Submit}>
              <div className="signup-section-title">Step 2. 약사 면허 인증</div>
              
              <div className="signup-form-group">
                <label className="signup-label">소속 약국명 (인증용)</label>
                <input type="text" placeholder="인증 서류상의 약국명을 입력하세요" value={docNumber} onChange={e => setDocNumber(e.target.value)} required className="signup-input" />
              </div>

              <div className="signup-form-group">
                <label className="signup-label">약사 면허번호</label>
                <input type="text" placeholder="면허번호를 입력하세요" value={licenseNumber} onChange={e => setLicenseNumber(e.target.value)} required className="signup-input" />
              </div>

              <div className="signup-form-group">
                <label className="signup-label">면허증 이미지 첨부</label>
                <input type="file" accept="image/*" onChange={e => setLicenseImage(e.target.files[0])} required className="signup-input" style={{ padding: '8px' }} />
              </div>

              <div className="signup-footer-actions">
                <button type="button" onClick={() => setStep(1)} className="signup-back-btn">이전 단계로</button>
                <button type="submit" className="signup-submit-btn" style={{ width: 'auto', padding: '14px 40px' }}>인증 요청 및 완료</button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

export default Signup
