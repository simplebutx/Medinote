import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { saveAuthSession, getMyProfile } from '../api'

function OAuth2Redirect() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  useEffect(() => {
    const token = searchParams.get('token')
    if (token) {
      // 1. 토큰 임시 저장 (인터셉터에서 사용하기 위함)
      saveAuthSession({ accessToken: token })
      
      // 2. 내 정보 조회하여 세션 완성
      getMyProfile().then(res => {
        saveAuthSession({
          accessToken: token,
          email: res.email,
          role: res.role,
          userId: res.id,
        })
        
        // 3. 역할에 따라 리다이렉트
        const role = res.role
        if (role === 'PHARMACIST' || role === 'ROLE_PHARMACIST') {
          navigate('/p/dashboard')
        } else if (role === 'ADMIN' || role === 'ROLE_ADMIN') {
          navigate('/a/dashboard')
        } else {
          navigate('/app/schedule')
        }
      }).catch((err) => {
        console.error('Profile fetch failed', err)
        navigate('/login')
      })
    } else {
      navigate('/login')
    }
  }, [searchParams, navigate])

  return (
    <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center' }}>
      <p>로그인 처리 중입니다...</p>
    </div>
  )
}

export default OAuth2Redirect
