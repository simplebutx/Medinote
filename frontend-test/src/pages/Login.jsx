import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { login, saveAuthSession } from '../api'

const Login = () => {
  const navigate = useNavigate()
  const [loginData, setLoginData] = useState({ email: '', password: '' })

  const handleChange = (e) => {
    setLoginData({ ...loginData, [e.target.name]: e.target.value })
  }

  const handleLogin = async (e) => {
    e.preventDefault()

    try {
      const res = await login(loginData)

      saveAuthSession({
        accessToken: res.accessToken,
        refreshToken: res.refreshToken,
        email: res.email,
        role: res.role,
      })

      alert('로그인 성공! 마이페이지로 이동합니다.')
      navigate('/my')
    } catch (err) {
      alert(`로그인 실패: ${err.response?.data?.message || err.message}`)
    }
  }

  return (
    <div style={containerStyle}>
      <h2>backend-auth 로그인 테스트</h2>
      <form onSubmit={handleLogin} style={formStyle}>
        <input
          name="email"
          placeholder="이메일"
          onChange={handleChange}
          style={inputStyle}
        />
        <input
          name="password"
          type="password"
          placeholder="비밀번호"
          onChange={handleChange}
          style={inputStyle}
        />
        <button type="submit" style={btnStyle('#2196F3')}>로그인</button>
      </form>
      <button type="button" onClick={() => navigate('/my')} style={btnStyle('#475569')}>
        저장된 로그인 확인
      </button>
    </div>
  )
}

export default Login

const containerStyle = {
  padding: '50px',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: '12px',
}

const formStyle = {
  display: 'flex',
  flexDirection: 'column',
  width: '300px',
}

const inputStyle = {
  margin: '10px 0',
  padding: '12px',
  borderRadius: '5px',
  border: '1px solid #ddd',
}

const btnStyle = (color) => ({
  padding: '12px',
  backgroundColor: color,
  color: 'white',
  border: 'none',
  cursor: 'pointer',
  borderRadius: '5px',
})
