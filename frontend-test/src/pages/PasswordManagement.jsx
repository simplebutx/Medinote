import { useState } from 'react'
import { resetPassword } from '../api'
import { useNavigate } from 'react-router-dom'

const PasswordManagement = () => {
  const [email, setEmail] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  
  const navigate = useNavigate()

  const handleResetPassword = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')
    try {
      // 이제 code 파라미터는 비워서 보냅니다 (백엔드에서 검증 안함)
      await resetPassword({ email, newPassword, code: '000000' })
      alert('비밀번호가 새롭게 설정되었습니다. 다시 로그인해주세요.')
      navigate('/login')
    } catch (err) {
      setMessage(err.response?.data?.message || '비밀번호 재설정 실패')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ padding: '20px', maxWidth: '400px', margin: 'auto' }}>
      <h2>비밀번호 재설정 (찾기)</h2>
      <p style={{ fontSize: '0.9rem', color: '#666', marginBottom: '20px' }}>
        기존 비밀번호는 암호화되어 있어 조회가 불가능합니다. <br/>
        이메일을 입력하고 새로운 비밀번호를 설정해주세요.
      </p>
      
      <form onSubmit={handleResetPassword}>
        <div style={{ marginBottom: '10px' }}>
          <label>계정 이메일:</label>
          <input 
            type="email" 
            value={email} 
            onChange={(e) => setEmail(e.target.value)} 
            required 
            placeholder="example@email.com"
            style={{ width: '100%', padding: '8px' }}
          />
        </div>
        <div style={{ marginBottom: '20px' }}>
          <label>새 비밀번호:</label>
          <input 
            type="password" 
            value={newPassword} 
            onChange={(e) => setNewPassword(e.target.value)} 
            required 
            placeholder="변경할 비밀번호 입력"
            style={{ width: '100%', padding: '8px' }}
          />
        </div>
        <button type="submit" disabled={loading} style={{ width: '100%', padding: '10px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px' }}>
          {loading ? '처리 중...' : '비밀번호 재설정 완료'}
        </button>
      </form>

      {message && <p style={{ marginTop: '20px', color: 'red' }}>{message}</p>}
      
      <div style={{ marginTop: '20px', textAlign: 'center' }}>
        <button onClick={() => navigate('/login')} style={{ background: 'none', border: 'none', color: '#007bff', textDecoration: 'underline', cursor: 'pointer' }}>
          로그인으로 돌아가기
        </button>
      </div>
    </div>
  )
}

export default PasswordManagement
