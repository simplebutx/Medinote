import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { login, saveAuthSession } from '../api'

function Login() {
  const navigate = useNavigate()
  const [loginData, setLoginData] = useState({ email: '', password: '' })
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState('')

  const handleChange = (event) => {
    const { name, value } = event.target
    setLoginData((prev) => ({ ...prev, [name]: value }))
  }

  const handleLogin = async (event) => {
    event.preventDefault()
    setSubmitting(true)
    setMessage('')

    try {
      const res = await login(loginData)

      saveAuthSession({
        accessToken: res.accessToken,
        refreshToken: res.refreshToken,
        email: res.email,
        role: res.role,
        userId: res.userId || res.id,
      })

      const role = res.role
      if (role === 'PHARMACIST' || role === 'ROLE_PHARMACIST') {
        navigate('/p/dashboard')
      } else if (role === 'ADMIN' || role === 'ROLE_ADMIN') {
        navigate('/a/dashboard')
      } else {
        navigate('/app/schedule')
      }
    } catch (error) {
      setMessage(`로그인에 실패했습니다. ${error.response?.data?.message || error.message}`)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="login-page">
      <section className="login-form-card">
        <div className="login-form-header">
          <h2>로그인</h2>
          <p>이메일과 비밀번호를 입력해 주세요.</p>
        </div>

        {message ? <div className="register-message">{message}</div> : null}

        <form className="login-form" onSubmit={handleLogin}>
          <label className="register-field">
            <span>이메일</span>
            <input
              name="email"
              type="email"
              value={loginData.email}
              placeholder="user@example.com"
              onChange={handleChange}
            />
          </label>

          <label className="register-field">
            <span>비밀번호</span>
            <input
              name="password"
              type="password"
              value={loginData.password}
              placeholder="비밀번호를 입력하세요"
              onChange={handleChange}
            />
          </label>

          <button type="submit" className="app-primary-button login-submit-button" disabled={submitting}>
            {submitting ? '로그인 중...' : '로그인'}
          </button>

          <button
            type="button"
            className="login-secondary-button"
            onClick={() => navigate('/signup')}
          >
            회원가입
          </button>

          <button
            type="button"
            className="login-secondary-button"
            style={{ marginTop: '10px' }}
            onClick={() => navigate('/password-find')}
          >
            비밀번호 찾기
          </button>

          <div className="login-social-divider">
            <span>또는</span>
          </div>

          <div className="login-social-buttons">
            <button 
              type="button" 
              className="login-social-button google"
              onClick={() => {
                const backendUrl = 'http://localhost:8080';
                window.location.href = `${backendUrl}/oauth2/authorization/google?redirect_uri=${window.location.origin}`;
              }}
            >
              Google로 계속하기
            </button>
            <button 
              type="button" 
              className="login-social-button naver"
              onClick={() => {
                const backendUrl = 'http://localhost:8080';
                window.location.href = `${backendUrl}/oauth2/authorization/naver?redirect_uri=${window.location.origin}`;
              }}
            >
              네이버로 계속하기
            </button>
            <button 
              type="button" 
              className="login-social-button kakao"
              onClick={() => {
                const backendUrl = 'http://localhost:8080';
                window.location.href = `${backendUrl}/oauth2/authorization/kakao?redirect_uri=${window.location.origin}`;
              }}
            >
              카카오로 계속하기
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}

export default Login
