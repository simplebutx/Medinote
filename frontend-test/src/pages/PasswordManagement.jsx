import { useState } from 'react'
import { findPassword, resetPassword } from '../api'
import { useNavigate } from 'react-router-dom'

const PasswordManagement = () => {
  const [email, setEmail] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [code, setCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [step, setStep] = useState(1) // 1: Find, 2: Reset
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  
  const navigate = useNavigate()

  const handleSendSms = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')
    try {
      await findPassword({ email, phoneNumber })
      setMessage('인증번호가 발송되었습니다.')
      setStep(2)
    } catch (err) {
      setMessage(err.response?.data?.message || '인증번호 발송 실패')
    } finally {
      setLoading(false)
    }
  }

  const handleResetPassword = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')
    try {
      await resetPassword({ email, phoneNumber, code, newPassword })
      alert('비밀번호가 재설정되었습니다. 다시 로그인해주세요.')
      navigate('/login')
    } catch (err) {
      setMessage(err.response?.data?.message || '비밀번호 재설정 실패')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ padding: '20px', maxWidth: '400px', margin: 'auto' }}>
      <h2>비밀번호 찾기 및 재설정</h2>
      
      {step === 1 ? (
        <form onSubmit={handleSendSms}>
          <div style={{ marginBottom: '10px' }}>
            <label>이메일:</label>
            <input 
              type="email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              required 
              style={{ width: '100%', padding: '8px' }}
            />
          </div>
          <div style={{ marginBottom: '10px' }}>
            <label>휴대폰 번호:</label>
            <input 
              type="text" 
              value={phoneNumber} 
              onChange={(e) => setPhoneNumber(e.target.value)} 
              placeholder="01012345678"
              required 
              style={{ width: '100%', padding: '8px' }}
            />
          </div>
          <button type="submit" disabled={loading} style={{ width: '100%', padding: '10px' }}>
            {loading ? '발송 중...' : '인증번호 받기'}
          </button>
        </form>
      ) : (
        <form onSubmit={handleResetPassword}>
          <div style={{ marginBottom: '10px' }}>
            <p>이메일: {email}</p>
            <p>번호: {phoneNumber}</p>
          </div>
          <div style={{ marginBottom: '10px' }}>
            <label>인증코드:</label>
            <input 
              type="text" 
              value={code} 
              onChange={(e) => setCode(e.target.value)} 
              required 
              style={{ width: '100%', padding: '8px' }}
            />
          </div>
          <div style={{ marginBottom: '10px' }}>
            <label>새 비밀번호:</label>
            <input 
              type="password" 
              value={newPassword} 
              onChange={(e) => setNewPassword(e.target.value)} 
              required 
              style={{ width: '100%', padding: '8px' }}
            />
          </div>
          <button type="submit" disabled={loading} style={{ width: '100%', padding: '10px' }}>
            {loading ? '처리 중...' : '비밀번호 변경'}
          </button>
          <button type="button" onClick={() => setStep(1)} style={{ width: '100%', padding: '10px', marginTop: '10px', background: 'none', border: '1px solid #ccc' }}>
            이전으로
          </button>
        </form>
      )}

      {message && <p style={{ marginTop: '20px', color: 'blue' }}>{message}</p>}
      
      <div style={{ marginTop: '20px' }}>
        <button onClick={() => navigate('/login')}>로그인으로 돌아가기</button>
      </div>
    </div>
  )
}

export default PasswordManagement
