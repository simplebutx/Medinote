import React, { useEffect, useRef, useState } from 'react'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'

const HEALTH_OPTIONS = [
  { key: 'isPregnant', label: '임산부' },
  { key: 'isBreastfeeding', label: '모유수유 중' },
  { key: 'isSmoking', label: '흡연' },
  { key: 'isDrinking', label: '음주' },
]

const baseCardStyle = {
  width: '100%',
  padding: '18px 20px',
  borderRadius: '18px',
  border: '1px solid #d7e4ff',
  backgroundColor: '#ffffff',
  textAlign: 'left',
  fontSize: '18px',
  cursor: 'pointer',
}

const activeCardStyle = {
  ...baseCardStyle,
  border: '2px solid #3b82f6',
  backgroundColor: '#eff6ff',
  color: '#1d4ed8',
  fontWeight: 700,
}

const suggestionBoxStyle = {
  marginTop: '8px',
  padding: 0,
  listStyle: 'none',
  border: '1px solid #d7e4ff',
  borderRadius: '14px',
  overflow: 'hidden',
  backgroundColor: '#ffffff',
  boxShadow: '0 12px 24px rgba(59, 130, 246, 0.08)',
}

const suggestionButtonStyle = {
  width: '100%',
  padding: '12px 16px',
  border: 'none',
  background: '#ffffff',
  textAlign: 'left',
  cursor: 'pointer',
  fontSize: '16px',
}

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

    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1)
    }, 1000)

    return () => clearInterval(timer)
  }, [timeLeft])

  useEffect(() => {
    return () => {
      if (diseaseDebounceRef.current) {
        clearTimeout(diseaseDebounceRef.current)
      }
    }
  }, [])

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  }

  const showError = (error, fallbackMessage) => {
    const message =
      error?.response?.data?.message ||
      (typeof error?.response?.data === 'string' ? error.response.data : null) ||
      fallbackMessage

    alert(message)
  }

  const handleSendVerificationCode = async () => {
    if (!phoneNumber) {
      alert('휴대폰 번호를 입력해 주세요.')
      return
    }

    try {
      await axios.post('/api/auth/sms/send', {
        phoneNumber,
      })

      setIsCodeSent(true)
      setTimeLeft(180)
      alert('인증번호를 발송했습니다.')
    } catch (error) {
      console.error('인증번호 발송 실패:', error)
      showError(error, '인증번호 발송에 실패했습니다.')
    }
  }

  const handleVerifyCode = async () => {
    if (!verificationCode) {
      alert('인증번호를 입력해 주세요.')
      return
    }

    try {
      const res = await axios.post('/api/auth/sms/verify', {
        phoneNumber,
        code: verificationCode,
      })

      if (res.data === true) {
        setIsSmsVerified(true)
        setTimeLeft(0)
        alert('휴대폰 인증이 완료되었습니다.')
      } else {
        alert('인증번호를 다시 확인해 주세요.')
      }
    } catch (error) {
      console.error('인증번호 확인 실패:', error)
      showError(error, '인증번호 확인에 실패했습니다.')
    }
  }

  const handleStep1Submit = async (event) => {
    event.preventDefault()

    if (!isSmsVerified) {
      alert('휴대폰 인증을 완료한 뒤 다음 단계로 진행할 수 있습니다.')
      return
    }

    try {
      await axios.post('/api/auth/signup', {
        email,
        password,
        username,
        birthDate,
        gender,
        role,
      })

      localStorage.setItem('tempEmail', email)
      setStep(2)
    } catch (error) {
      console.error('1단계 가입 실패:', error)
      showError(error, '기본 정보 저장에 실패했습니다.')
    }
  }

  const toggleHealthOption = (key) => {
    setHealthState((prev) => ({
      ...prev,
      [key]: !prev[key],
    }))
  }

  const addDisease = (rawName) => {
    const trimmed = rawName.trim().replace(/^@/, '')
    if (!trimmed) return

    setDiseaseNames((prev) => (prev.includes(trimmed) ? prev : [...prev, trimmed]))
    setDiseaseInput('')
    setDiseaseSuggestions([])
    setDiseaseLoading(false)
    latestDiseaseKeywordRef.current = ''
  }

  const handleDiseaseSuggest = async (keyword) => {
    try {
      const response = await axios.get('/api/auth/diseases/suggest', {
        params: { keyword },
      })

      if (latestDiseaseKeywordRef.current !== keyword) {
        return
      }

      setDiseaseSuggestions(response.data.filter((name) => !diseaseNames.includes(name)))
    } catch (error) {
      if (latestDiseaseKeywordRef.current === keyword) {
        setDiseaseSuggestions([])
      }
    } finally {
      if (latestDiseaseKeywordRef.current === keyword) {
        setDiseaseLoading(false)
      }
    }
  }

  const handleDiseaseChange = (event) => {
    const value = event.target.value
    setDiseaseInput(value)

    if (diseaseDebounceRef.current) {
      clearTimeout(diseaseDebounceRef.current)
    }

    const trimmed = value.trim().replace(/^@/, '')
    latestDiseaseKeywordRef.current = trimmed

    if (!trimmed) {
      setDiseaseSuggestions([])
      setDiseaseLoading(false)
      return
    }

    setDiseaseLoading(true)
    diseaseDebounceRef.current = setTimeout(() => {
      void handleDiseaseSuggest(trimmed)
    }, 220)
  }

  const handleDiseaseKeyDown = (event) => {
    if (event.key === 'Enter' || event.key === ',' || event.key === 'Tab') {
      event.preventDefault()
      addDisease(diseaseInput)
    }
  }

  const removeDisease = (target) => {
    setDiseaseNames((prev) => prev.filter((disease) => disease !== target))
  }

  const handleUserStep2Submit = async (event) => {
    event.preventDefault()
    const tempEmail = localStorage.getItem('tempEmail')

    if (!tempEmail) {
      alert('1단계 회원가입 정보가 없습니다. 처음부터 다시 진행해 주세요.')
      return
    }

    try {
      await axios.post('/api/auth/user/profile', {
        email: tempEmail,
        ...healthState,
        diseaseNames,
      })

      alert('회원가입이 완료되었습니다. 로그인해 주세요.')
      localStorage.removeItem('tempEmail')
      navigate('/login')
    } catch (error) {
      console.error('2단계 등록 실패:', error)
      showError(error, '추가 정보 입력 중 오류가 발생했습니다.')
    }
  }

  const handlePharmacistStep2Submit = async (event) => {
    event.preventDefault()
    const tempEmail = localStorage.getItem('tempEmail')

    const formData = new FormData()
    const requestData = { docNumber, licenseNumber, email: tempEmail }

    formData.append('data', new Blob([JSON.stringify(requestData)], { type: 'application/json' }))
    formData.append('licenseImage', licenseImage)

    try {
      await axios.post('/api/auth/pharmacists/verification', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })

      alert('약사 면허 인증 및 가입 요청이 완료되었습니다. 관리자 승인 후 로그인 가능합니다.')
      localStorage.removeItem('tempEmail')
      navigate('/login')
    } catch (error) {
      console.error('약사 인증 실패:', error)
      showError(error, '면허 인증 요청 중 오류가 발생했습니다.')
    }
  }

  if (step === 1) {
    return (
      <div style={{ padding: '20px', maxWidth: '480px' }}>
        <h2>!!!!휴대폰 인증 화면!!!! - 이게 보이면 성공</h2>
        <form onSubmit={handleStep1Submit}>
          <input
            type="email"
            placeholder="이메일"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            style={{ width: '100%', marginBottom: '15px' }}
          />

          <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
            <input
              type="tel"
              placeholder="휴대폰 번호 (- 없이 입력)"
              value={phoneNumber}
              onChange={(event) => setPhoneNumber(event.target.value)}
              readOnly={isSmsVerified}
              required
              style={{ flex: 1 }}
            />
            <button type="button" onClick={handleSendVerificationCode} disabled={isSmsVerified}>
              {isCodeSent ? '인증번호 재발송' : '인증번호 발송'}
            </button>
          </div>

          {isCodeSent && (
            <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
              <input
                type="text"
                placeholder="인증번호 6자리"
                value={verificationCode}
                onChange={(event) => setVerificationCode(event.target.value)}
                disabled={isSmsVerified}
                required
                style={{ flex: 1 }}
              />
              <button type="button" onClick={handleVerifyCode} disabled={isSmsVerified}>
                {isSmsVerified ? '인증 완료' : '인증 확인'}
              </button>
              {timeLeft > 0 && (
                <span style={{ color: 'red', alignSelf: 'center', fontWeight: 'bold' }}>
                  {formatTime(timeLeft)}
                </span>
              )}
            </div>
          )}

          <input
            type="password"
            placeholder="비밀번호"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            style={{ width: '100%', marginBottom: '15px' }}
            required
          />
          <input
            type="text"
            placeholder="이름"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            style={{ width: '100%', marginBottom: '15px' }}
            required
          />

          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '14px' }}>
              생년월일
            </label>
            <input
              type="date"
              value={birthDate}
              onChange={(event) => setBirthDate(event.target.value)}
              style={{ width: '100%', padding: '5px' }}
              required
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '14px' }}>
              성별
            </label>
            <button
              type="button"
              onClick={() => setGender('MALE')}
              style={{
                marginRight: '10px',
                padding: '5px 15px',
                fontWeight: gender === 'MALE' ? 'bold' : 'normal',
                border: gender === 'MALE' ? '2px solid black' : '1px solid #ccc',
              }}
            >
              남성
            </button>
            <button
              type="button"
              onClick={() => setGender('FEMALE')}
              style={{
                padding: '5px 15px',
                fontWeight: gender === 'FEMALE' ? 'bold' : 'normal',
                border: gender === 'FEMALE' ? '2px solid black' : '1px solid #ccc',
              }}
            >
              여성
            </button>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ fontWeight: 'bold', fontSize: '14px' }}>역할 선택: </label>
            <button
              type="button"
              onClick={() => setRole('USER')}
              style={{ marginRight: '10px', padding: '5px 10px', fontWeight: role === 'USER' ? 'bold' : 'normal' }}
            >
              일반 유저
            </button>
            <button
              type="button"
              onClick={() => setRole('PHARMACIST')}
              style={{ padding: '5px 10px', fontWeight: role === 'PHARMACIST' ? 'bold' : 'normal' }}
            >
              약사 유저
            </button>
          </div>

          <button
            type="submit"
            style={{
              backgroundColor: isSmsVerified ? '#4CAF50' : '#ccc',
              color: 'white',
              cursor: isSmsVerified ? 'pointer' : 'not-allowed',
              padding: '10px 20px',
              border: 'none',
              borderRadius: '4px',
              width: '100%',
            }}
          >
            {isSmsVerified ? '다음 단계로 (추가 정보 입력)' : '휴대폰 인증을 완료해 주세요'}
          </button>
        </form>
      </div>
    )
  }

  if (step === 2 && role === 'USER') {
    return (
      <div style={{ padding: '20px', maxWidth: '660px' }}>
        <h2>회원가입 2단계: 건강 정보 입력</h2>
        <p style={{ color: '#64748b', marginBottom: '20px' }}>
          정확도를 높이기 위해 건강 정보를 입력합니다.
        </p>

        <form onSubmit={handleUserStep2Submit}>
          <div style={{ marginBottom: '16px', fontWeight: 'bold', fontSize: '24px' }}>건강 상태</div>
          <div style={{ display: 'grid', gap: '14px', marginBottom: '28px' }}>
            {HEALTH_OPTIONS.map((option) => (
              <button
                key={option.key}
                type="button"
                onClick={() => toggleHealthOption(option.key)}
                style={healthState[option.key] ? activeCardStyle : baseCardStyle}
              >
                {option.label}
              </button>
            ))}
          </div>

          <div style={{ marginBottom: '12px', fontWeight: 'bold', fontSize: '24px' }}>기저질환</div>
          <input
            type="text"
            placeholder="@고혈압 처럼 입력하면 질환을 검색할 수 있습니다."
            value={diseaseInput}
            onChange={handleDiseaseChange}
            onKeyDown={handleDiseaseKeyDown}
            style={{
              width: '100%',
              padding: '16px 18px',
              borderRadius: '18px',
              border: '1px solid #d7e4ff',
              marginBottom: '12px',
              boxSizing: 'border-box',
            }}
          />
          {diseaseSuggestions.length > 0 && (
            <ul style={{ ...suggestionBoxStyle, marginBottom: '12px' }}>
              {diseaseSuggestions.map((disease) => (
                <li key={disease}>
                  <button
                    type="button"
                    style={suggestionButtonStyle}
                    onClick={() => addDisease(disease)}
                  >
                    {disease}
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div style={{ color: '#64748b', marginBottom: '12px' }}>
            {diseaseInput.trim()
              ? diseaseLoading
                ? '질병 자동완성을 불러오는 중입니다...'
                : '원하는 질병을 클릭하거나 Enter로 추가할 수 있습니다.'
              : '입력하면 질병 자동완성이 표시됩니다.'}
          </div>

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '18px' }}>
            {diseaseNames.map((disease) => (
              <button
                key={disease}
                type="button"
                onClick={() => removeDisease(disease)}
                style={{
                  padding: '8px 12px',
                  borderRadius: '999px',
                  border: '1px solid #bfdbfe',
                  backgroundColor: '#eff6ff',
                  color: '#1d4ed8',
                  cursor: 'pointer',
                }}
              >
                #{disease} ×
              </button>
            ))}
          </div>

          <div
            style={{
              padding: '18px',
              borderRadius: '18px',
              backgroundColor: '#eff6ff',
              color: '#1d4ed8',
              lineHeight: 1.7,
              marginBottom: '24px',
            }}
          >
            입력한 건강 정보는 복약 일정, 약 검색, AI 챗봇, 약사 상담에서 참고 정보로 활용됩니다.
            알레르기/주의 성분은 가입 후 마이페이지에서 별도로 등록하고 관리합니다.
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
            <button
              type="button"
              onClick={() => setStep(1)}
              style={{ background: 'none', border: 'none', fontSize: '28px', cursor: 'pointer' }}
            >
              이전
            </button>
            <button
              type="submit"
              style={{
                backgroundColor: '#2563eb',
                color: '#fff',
                border: 'none',
                borderRadius: '18px',
                padding: '14px 28px',
                fontSize: '24px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              가입 완료
            </button>
          </div>
        </form>
      </div>
    )
  }

  if (step === 2 && role === 'PHARMACIST') {
    return (
      <div style={{ padding: '20px' }}>
        <h2>회원가입 2단계: 약사 면허 인증</h2>
        <form onSubmit={handlePharmacistStep2Submit}>
          <input
            type="text"
            placeholder="문서 번호"
            value={docNumber}
            onChange={(event) => setDocNumber(event.target.value)}
            required
          />
          <br />
          <br />
          <input
            type="text"
            placeholder="면허 번호"
            value={licenseNumber}
            onChange={(event) => setLicenseNumber(event.target.value)}
            required
          />
          <br />
          <br />
          <input
            type="file"
            accept="image/*"
            onChange={(event) => setLicenseImage(event.target.files?.[0] ?? null)}
            required
          />
          <br />
          <br />
          <button type="submit">면허 인증 및 가입 완료</button>
        </form>
      </div>
    )
  }

  return null
}

export default Signup
