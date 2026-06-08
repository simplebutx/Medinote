import { useEffect, useState } from 'react'
import { getMedicineSyncStatus, syncMedicines } from '../api'

function Sync() {
  const [refreshing, setRefreshing] = useState(false)
  const [syncStatus, setSyncStatus] = useState(null)
  const [message, setMessage] = useState('')

  const loadSyncStatus = async () => {
    try {
      const data = await getMedicineSyncStatus()
      setSyncStatus(data)
    } catch (error) {
      setMessage(error.response?.data?.message || error.message || '동기화 상태 조회에 실패했습니다.')
    }
  }

  useEffect(() => {
    loadSyncStatus()
  }, [])

  const handleRefresh = async () => {
    setRefreshing(true)
    setMessage('')

    try {
      await syncMedicines()
      setMessage('공공데이터 갱신 요청을 완료했어요.')
      await loadSyncStatus()
    } catch (error) {
      setMessage(error.response?.data?.message || error.message || '공공데이터 갱신에 실패했어요.')
    } finally {
      setRefreshing(false)
    }
  }

  return (
    <div>
      <h1>공공데이터 갱신</h1>

      <button
        type="button"
        onClick={handleRefresh}
        disabled={refreshing}
      >
        {refreshing ? '동기화 중...' : '공공데이터 갱신'}
      </button>

      {syncStatus && (
        <div>
          <p>마지막 동기화 완료 날짜: {syncStatus.lastSyncedPublicUpdateDe || '없음'}</p>
          <p>공공데이터 최신 날짜: {syncStatus.latestPublicUpdateDe || '없음'}</p>
        </div>
      )}

      {message && <p>{message}</p>}
    </div>
  )
}

export default Sync
