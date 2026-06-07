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
        userId: res.userId || res.id, // ID 추가
      })

      const role = res.role;
      if (role === 'PHARMACIST' || role === 'ROLE_PHARMACIST') {
        navigate('/p/dashboard');
      } else if (role === 'ADMIN' || role === 'ROLE_ADMIN') {
        navigate('/a/dashboard');
      } else {
        navigate('/app/schedule');
      }
    } catch (error) {
      setMessage(`로그인에 실패했습니다. ${error.response?.data?.message || error.message}`)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-copy">
          <p className="app-page-eyebrow">Welcome Back</p>
          <h1>AI 의약품 정보 도우미</h1>
          <p>
            사용자 페이지 구조에 맞춘 로그인 화면입니다. 로그인 후 바로 내 정보와 복약 화면으로 이동할 수
            있습니다.
          </p>
          <div className="login-highlight-list">
            <div>
              <strong>복약 일정</strong>
              <span>날짜별 복약 현황과 완료 상태 확인</span>
            </div>
            <div>
              <strong>복약 등록</strong>
              <span>수동 입력과 OCR 등록을 한 화면에서 관리</span>
            </div>
            <div>
              <strong>챗봇 & 상담</strong>
              <span>AI 챗봇과 상담 흐름을 동일한 톤으로 제공</span>
            </div>
          </div>
        </div>

        <section className="login-form-card">
          <div className="login-form-header">
            <h2>로그인</h2>
            <p>이메일과 비밀번호를 입력해 사용자 화면으로 들어가세요.</p>
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
          </form>
        </section>
      </div>
    </div>
  )
}

export default Login
