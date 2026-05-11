import { useState } from 'react'
import { refreshMedicines } from './api'
import './App.css'

function App() {
  const [refreshing, setRefreshing] = useState(false)
  const [message, setMessage] = useState('약 데이터는 사용자 조회용이 아니라 DB 적재용으로만 관리합니다.')

  const handleRefresh = async () => {
    setRefreshing(true)
    setMessage('공공데이터를 불러와 DB에 저장하는 중입니다.')

    try {
      const data = await refreshMedicines()
      setMessage(`${data.savedCount ?? 0}건 저장 완료`)
    } catch (error) {
      setMessage(error.message || '약 데이터 저장에 실패했습니다.')
    } finally {
      setRefreshing(false)
    }
  }

  return (
          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            {refreshing ? '저장 중...' : '공공데이터 갱신'}
          </button>
  )
}

export default App
