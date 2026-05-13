import { useEffect, useState } from 'react'
import { getMedicineSyncStatus, syncMedicines } from './api'
import './App.css'

function formatUpdateDate(value) {
  if (!value) {
    return '아직 없음'
  }

  if (/^\d{8}$/.test(value)) {
    return `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`
  }

  return value
}

function App() {
  const [syncing, setSyncing] = useState(false)
  const [loadingStatus, setLoadingStatus] = useState(true)
  const [lastSyncedPublicUpdateDe, setLastSyncedPublicUpdateDe] = useState('')
  const [latestPublicUpdateDe, setLatestPublicUpdateDe] = useState('')
  const [message, setMessage] = useState('현재 DB에 반영된 날짜와 공공데이터 최신 날짜를 비교한 뒤, 변경된 약 정보만 갱신합니다.')

  const loadSyncStatus = async () => {
    setLoadingStatus(true)

    try {
      const data = await getMedicineSyncStatus()
      setLastSyncedPublicUpdateDe(data.lastSyncedPublicUpdateDe ?? '')
      setLatestPublicUpdateDe(data.latestPublicUpdateDe ?? '')
    } catch (error) {
      setMessage(error.message || '동기화 상태를 불러오지 못했습니다.')
    } finally {
      setLoadingStatus(false)
    }
  }

  useEffect(() => {
    loadSyncStatus()
  }, [])

  const handleSync = async () => {
    setSyncing(true)
    setMessage('공공데이터 최신 수정일과 비교해 변경된 데이터를 확인하고 있습니다.')

    try {
      const data = await syncMedicines()
      setLastSyncedPublicUpdateDe(data.lastSyncedPublicUpdateDe ?? '')
      setLatestPublicUpdateDe(data.latestPublicUpdateDe ?? '')

      const insertedCount = data.insertedCount ?? 0
      const updatedCount = data.updatedCount ?? 0
      const syncedIngredientItemCount = data.syncedIngredientItemCount ?? 0

      setMessage(
        `약 정보 신규 ${insertedCount}건, 수정 ${updatedCount}건을 반영했고 성분 정보는 ${syncedIngredientItemCount}개 약 기준으로 함께 갱신했습니다.`
      )
    } catch (error) {
      setMessage(error.message || '약 정보 갱신에 실패했습니다.')
    } finally {
      setSyncing(false)
    }
  }

  return (
    <>
      <p>공공데이터가 수정된 경우에만 약 정보와 성분 정보를 다시 반영합니다.</p>
      <p>
        현재 DB 반영 날짜: {loadingStatus ? '불러오는 중...' : formatUpdateDate(lastSyncedPublicUpdateDe)}
      </p>
      <p>
        공공데이터 최신 수정일: {loadingStatus ? '불러오는 중...' : formatUpdateDate(latestPublicUpdateDe)}
      </p>
      <button
        type="button"
        onClick={handleSync}
        disabled={syncing || loadingStatus}
      >
        {syncing ? '갱신 중...' : '약 정보 갱신'}
      </button>
      <p>{message}</p>
    </>
  )
}

export default App
