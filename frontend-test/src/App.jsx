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
    <main className="app-shell">
      <section className="hero-panel">
        <p className="eyebrow">Medication Sync Console</p>
        <h1>공공데이터를 DB에 저장하는 관리자용 화면</h1>
        <p className="hero-copy">
          현재는 전체 목록 조회를 제거했고, 약 데이터는 갱신해서 DB에 쌓아두기만 합니다.
          사용자 화면에서는 이후 검색이나 내 약 상세 흐름으로 연결하면 됩니다.
        </p>

        <div className="toolbar">
          <button
            type="button"
            className="primary-button"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            {refreshing ? '저장 중...' : '공공데이터 갱신'}
          </button>
        </div>

        <div className="status-card">
          <span className="status-label">상태</span>
          <p>{message}</p>
        </div>
      </section>
    </main>
  )
}

export default App
