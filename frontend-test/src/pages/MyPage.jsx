import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import {
  clearAuthSession,
  createCaution,
  createMedicationSchedule,
  createMedicationScheduleTime,
  deleteCaution,
  deleteMedicationSchedule,
  deleteMedicationScheduleTime,
  getAuthSession,
  getCautions,
  getMedicationScheduleTimes,
  getMedicationSchedules,
  suggestCautions,
  updateMedicationSchedule,
  withdrawAccount,
} from '../api'
import { DOSAGE_UNIT_OPTIONS, MAX_TIMES_PER_DAY, TIMING_OPTIONS } from './schedule/constants'
import {
  buildSchedulePayload,
  buildTimePayload,
  createMedicineForm,
  mapScheduleToForm,
  normalizeTimesPerDay,
  syncTimeSlots,
} from './schedule/scheduleFormUtils'

const DEFAULT_MEDICATION_TIME_SETTINGS_KEY = 'defaultMedicationTimeSettings'

const tabs = [
  { key: 'profile', label: '기본 정보' },
  { key: 'health', label: '건강 정보' },
  { key: 'caution', label: '알레르기/주의 성분' },
  { key: 'history', label: '복약 이력' },
  { key: 'prescription', label: '처방전' },
  { key: 'settings', label: '환경설정' },
]

const cautionReasonOptions = [
  { value: 'ALLERGY', label: '알레르기' },
  { value: 'SIDE_EFFECT', label: '부작용' },
  { value: 'DOCTOR_ADVICE', label: '의사 권고' },
  { value: 'PHARMACIST_ADVICE', label: '약사 권고' },
  { value: 'PERSONAL_AVOID', label: '개인 기피' },
  { value: 'OTHER', label: '기타' },
]

const intakeHistory = [
  { name: '아스피린 100mg', rate: 92 },
  { name: '암로디핀 5mg', rate: 86 },
  { name: '타이레놀 500mg', rate: 74 },
]

const DEFAULT_MEDICATION_TIME_SETTINGS = {
  1: ['08:00'],
  2: ['08:00', '20:00'],
  3: ['08:00', '13:00', '20:00'],
  4: ['08:00', '12:00', '18:00', '22:00'],
}

function createDefaultMedicationTimeSettings() {
  return Object.fromEntries(
    Object.entries(DEFAULT_MEDICATION_TIME_SETTINGS).map(([timesPerDay, times]) => [
      timesPerDay,
      [...times],
    ]),
  )
}

function loadDefaultMedicationTimeSettings() {
  const fallback = createDefaultMedicationTimeSettings()
  const raw = localStorage.getItem(DEFAULT_MEDICATION_TIME_SETTINGS_KEY)

  if (!raw) {
    return fallback
  }

  try {
    const parsed = JSON.parse(raw)
    return Object.fromEntries(
      Object.entries(fallback).map(([timesPerDay, times]) => {
        const storedTimes = Array.isArray(parsed?.[timesPerDay]) ? parsed[timesPerDay] : times
        return [timesPerDay, storedTimes.map((time, index) => String(time || times[index] || ''))]
      }),
    )
  } catch {
    return fallback
  }
}

function getPrescriptionStatus(schedule) {
  return schedule.isActive === false ? '종료' : '복용 중'
}

function getPrescriptionTitle(schedule) {
  if (schedule.hospitalName) {
    return `${schedule.hospitalName} 처방전`
  }

  const primaryMedicineName =
    schedule.medicines?.[0]?.customMedicineName || schedule.customMedicineName

  if (primaryMedicineName) {
    return `${primaryMedicineName} 처방전`
  }

  return `처방전 #${schedule.id}`
}

function mapScheduleToPrescriptionRecord(schedule, times) {
  const form = mapScheduleToForm(schedule, times)

  return {
    id: `schedule-${schedule.id}`,
    scheduleId: schedule.id,
    isNew: false,
    title: getPrescriptionTitle(schedule),
    hospitalName: form.hospitalName,
    pharmacyName: form.pharmacyName,
    dispensedDate: form.dispensedDate,
    status: getPrescriptionStatus(schedule),
    notes: '',
    medicines: form.medicines,
  }
}

function createEmptyPrescriptionRecord() {
  return {
    id: `draft-${Date.now()}`,
    scheduleId: null,
    isNew: true,
    title: '새 처방전',
    hospitalName: '',
    pharmacyName: '',
    dispensedDate: new Date().toISOString().slice(0, 10),
    status: '복용 예정',
    notes: '',
    medicines: [createMedicineForm()],
  }
}

function MyPage() {
  const navigate = useNavigate()
  const session = useMemo(() => getAuthSession(), [])
  const [activeTab, setActiveTab] = useState('profile')
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [cautions, setCautions] = useState([])
  const [cautionType, setCautionType] = useState('MEDICINE')
  const [cautionKeyword, setCautionKeyword] = useState('')
  const [cautionSuggestions, setCautionSuggestions] = useState([])
  const [selectedSuggestion, setSelectedSuggestion] = useState(null)
  const [reason, setReason] = useState('ALLERGY')
  const [memo, setMemo] = useState('')
  const [message, setMessage] = useState('')
  const [prescriptions, setPrescriptions] = useState([])
  const [selectedPrescriptionId, setSelectedPrescriptionId] = useState(null)
  const [prescriptionMessage, setPrescriptionMessage] = useState('')
  const [prescriptionSaving, setPrescriptionSaving] = useState(false)
  const [defaultMedicationTimeSettings, setDefaultMedicationTimeSettings] = useState(() =>
    loadDefaultMedicationTimeSettings(),
  )

  const loadPrescriptionRecords = async (preferredId) => {
    const schedules = await getMedicationSchedules()
    const timeEntries = await Promise.all(
      schedules.map(async (schedule) => [schedule.id, await getMedicationScheduleTimes(schedule.id)]),
    )
    const timeMap = Object.fromEntries(timeEntries)
    const records = schedules.map((schedule) =>
      mapScheduleToPrescriptionRecord(schedule, timeMap[schedule.id] || []),
    )

    setPrescriptions(records)
    setSelectedPrescriptionId((currentId) => {
      if (preferredId && records.some((record) => record.id === preferredId)) {
        return preferredId
      }

      if (currentId && records.some((record) => record.id === currentId)) {
        return currentId
      }

      return records[0]?.id || null
    })
  }

  useEffect(() => {
    const load = async () => {
      if (!session?.accessToken) {
        setLoading(false)
        return
      }

      try {
        const [profileResponse, cautionResponse] = await Promise.all([
          axios.get('/api/auth/me', {
            headers: {
              Authorization: `Bearer ${session.accessToken}`,
            },
          }),
          getCautions(),
        ])

        setProfile(profileResponse.data)
        setCautions(cautionResponse)
        await loadPrescriptionRecords()
      } catch (error) {
        setMessage(error.response?.data?.message || '정보를 불러오지 못했습니다.')
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [session])

  useEffect(() => {
    const run = async () => {
      if (cautionKeyword.trim().length < 2) {
        setCautionSuggestions([])
        return
      }

      try {
        const items = await suggestCautions(cautionKeyword.trim(), cautionType)
        setCautionSuggestions(items)
      } catch {
        setCautionSuggestions([])
      }
    }

    const timeoutId = window.setTimeout(run, 200)
    return () => window.clearTimeout(timeoutId)
  }, [cautionKeyword, cautionType])

  const selectedPrescription =
    prescriptions.find((item) => item.id === selectedPrescriptionId) || prescriptions[0] || null

  const handleAddCaution = async () => {
    if (!selectedSuggestion) {
      setMessage('자동완성 목록에서 항목을 먼저 선택해 주세요.')
      return
    }

    try {
      await createCaution({
        itemSeq: null,
        itemName: selectedSuggestion.type === 'MEDICINE' ? selectedSuggestion.name : null,
        ingredientCode: null,
        ingredientName: selectedSuggestion.type === 'INGREDIENT' ? selectedSuggestion.name : null,
        reason,
        memo: memo.trim() || null,
      })

      setCautions(await getCautions())
      setCautionKeyword('')
      setSelectedSuggestion(null)
      setMemo('')
      setMessage('주의 성분이 등록되었습니다.')
    } catch (error) {
      setMessage(error.response?.data?.message || '주의 성분 등록에 실패했습니다.')
    }
  }

  const handleDeleteCaution = async (id) => {
    try {
      await deleteCaution(id)
      setCautions(await getCautions())
      setMessage('주의 성분을 삭제했습니다.')
    } catch (error) {
      setMessage(error.response?.data?.message || '주의 성분 삭제에 실패했습니다.')
    }
  }

  const updateSelectedPrescription = (updater) => {
    setPrescriptions((prev) =>
      prev.map((item) => {
        if (item.id !== selectedPrescriptionId) {
          return item
        }

        return typeof updater === 'function' ? updater(item) : updater
      }),
    )
  }

  const handlePrescriptionFieldChange = (event) => {
    const { name, value } = event.target

    updateSelectedPrescription((prev) => ({
      ...prev,
      [name]: value,
    }))
    setPrescriptionMessage('')
  }

  const handlePrescriptionMedicineFieldChange = (medicineIndex, event) => {
    const { name, value } = event.target

    updateSelectedPrescription((prev) => ({
      ...prev,
      medicines: prev.medicines.map((medicine, index) => {
        if (index !== medicineIndex) {
          return medicine
        }

        if (name === 'timesPerDay') {
          const nextCount = value === '' ? '1' : String(normalizeTimesPerDay(value))
          return {
            ...medicine,
            timesPerDay: nextCount,
            timeSlots: syncTimeSlots(medicine.timeSlots, Number(nextCount)),
          }
        }

        return {
          ...medicine,
          [name]: value,
        }
      }),
    }))

    setPrescriptionMessage('')
  }

  const handlePrescriptionTimeSlotChange = (medicineIndex, slotIndex, field, value) => {
    updateSelectedPrescription((prev) => ({
      ...prev,
      medicines: prev.medicines.map((medicine, index) => {
        if (index !== medicineIndex) {
          return medicine
        }

        return {
          ...medicine,
          timeSlots: medicine.timeSlots.map((slot, currentSlotIndex) =>
            currentSlotIndex === slotIndex
              ? {
                  ...slot,
                  [field]: value,
                }
              : slot,
          ),
        }
      }),
    }))

    setPrescriptionMessage('')
  }

  const handleAddPrescriptionMedicine = () => {
    updateSelectedPrescription((prev) => ({
      ...prev,
      medicines: [...prev.medicines, createMedicineForm()],
    }))
    setPrescriptionMessage('')
  }

  const handleRemovePrescriptionMedicine = (medicineIndex) => {
    updateSelectedPrescription((prev) => ({
      ...prev,
      medicines: prev.medicines.filter((_, index) => index !== medicineIndex),
    }))
    setPrescriptionMessage('')
  }

  const handleCreatePrescription = () => {
    const nextPrescription = createEmptyPrescriptionRecord()
    setPrescriptions((prev) => [nextPrescription, ...prev])
    setSelectedPrescriptionId(nextPrescription.id)
    setPrescriptionMessage('새 처방전 초안을 만들었습니다.')
  }

  const createTimesSequentially = async (medicines, createdScheduleMedicines) => {
    for (const [medicineIndex, createdMedicine] of createdScheduleMedicines.entries()) {
      const slots = medicines[medicineIndex]?.timeSlots || []

      for (const [slotIndex, slot] of slots.entries()) {
        await createMedicationScheduleTime(buildTimePayload(slot, createdMedicine.id, slotIndex))
      }
    }
  }

  const deleteTimesSequentially = async (scheduleId) => {
    const existingTimes = await getMedicationScheduleTimes(scheduleId)

    for (const time of existingTimes) {
      await deleteMedicationScheduleTime(time.id)
    }
  }

  const handleSavePrescription = async () => {
    if (!selectedPrescription) {
      return
    }

    if (!selectedPrescription.medicines.length) {
      setPrescriptionMessage('약을 최소 1개 이상 등록해 주세요.')
      return
    }

    setPrescriptionSaving(true)
    setPrescriptionMessage('')

    try {
      const payload = buildSchedulePayload(selectedPrescription)

      if (selectedPrescription.isNew) {
        const createdSchedule = await createMedicationSchedule(payload)
        const createdMedicines = createdSchedule.medicines || []

        if (createdMedicines.length !== selectedPrescription.medicines.length) {
          throw new Error('생성된 약 개수가 입력 개수와 일치하지 않습니다.')
        }

        await createTimesSequentially(selectedPrescription.medicines, createdMedicines)
        await loadPrescriptionRecords(`schedule-${createdSchedule.id}`)
        setPrescriptionMessage('처방전을 저장했습니다.')
      } else {
        const updatedSchedule = await updateMedicationSchedule(selectedPrescription.scheduleId, payload)
        const updatedMedicines = updatedSchedule.medicines || []

        if (updatedMedicines.length !== selectedPrescription.medicines.length) {
          throw new Error('수정된 약 개수가 입력 개수와 일치하지 않습니다.')
        }

        await deleteTimesSequentially(selectedPrescription.scheduleId)
        await createTimesSequentially(selectedPrescription.medicines, updatedMedicines)
        await loadPrescriptionRecords(`schedule-${selectedPrescription.scheduleId}`)
        setPrescriptionMessage('처방전을 수정했습니다.')
      }
    } catch (error) {
      setPrescriptionMessage(error.response?.data?.message || error.message || '처방전 저장에 실패했습니다.')
    } finally {
      setPrescriptionSaving(false)
    }
  }

  const handleDeletePrescription = async () => {
    if (!selectedPrescription) {
      return
    }

    if (selectedPrescription.isNew) {
      const remainingPrescriptions = prescriptions.filter((item) => item.id !== selectedPrescription.id)
      setPrescriptions(remainingPrescriptions)
      setSelectedPrescriptionId(remainingPrescriptions[0]?.id || null)
      setPrescriptionMessage('초안 처방전을 삭제했습니다.')
      return
    }

    setPrescriptionSaving(true)
    setPrescriptionMessage('')

    try {
      await deleteMedicationSchedule(selectedPrescription.scheduleId)
      await loadPrescriptionRecords()
      setPrescriptionMessage('처방전을 삭제했습니다.')
    } catch (error) {
      setPrescriptionMessage(error.response?.data?.message || error.message || '처방전 삭제에 실패했습니다.')
    } finally {
      setPrescriptionSaving(false)
    }
  }

  const handleDefaultMedicationTimeChange = (timesPerDay, slotIndex, value) => {
    setDefaultMedicationTimeSettings((prev) => ({
      ...prev,
      [timesPerDay]: (prev[timesPerDay] || []).map((time, index) =>
        index === slotIndex ? value : time,
      ),
    }))
  }

  const handleResetDefaultMedicationTimeSettings = () => {
    const nextSettings = createDefaultMedicationTimeSettings()
    setDefaultMedicationTimeSettings(nextSettings)
    localStorage.setItem(DEFAULT_MEDICATION_TIME_SETTINGS_KEY, JSON.stringify(nextSettings))
    setMessage('기본 복약 시간을 기본값으로 초기화했습니다.')
  }

  const handleSaveDefaultMedicationTimeSettings = () => {
    localStorage.setItem(
      DEFAULT_MEDICATION_TIME_SETTINGS_KEY,
      JSON.stringify(defaultMedicationTimeSettings),
    )
    setMessage('기본 복약 시간이 저장되었습니다.')
  }

  const handleWithdraw = async () => {
    if (!window.confirm('정말로 탈퇴하시겠습니까? 모든 정보가 삭제되며 복구할 수 없습니다.')) {
      return
    }

    try {
      await withdrawAccount()
      alert('탈퇴 처리가 완료되었습니다.')
      clearAuthSession()
      navigate('/login')
    } catch (error) {
      alert(error.response?.data?.message || '탈퇴 처리 중 오류가 발생했습니다.')
    }
  }

  if (loading) {
    return <div className="app-card app-placeholder-card">정보를 불러오는 중입니다.</div>
  }

  if (!profile) {
    return <div className="app-card app-placeholder-card">로그인 정보가 없습니다.</div>
  }

  return (
    <div className="app-page">
      <div className="app-page-header">
        <p className="app-page-eyebrow">My Page</p>
        <h1 className="app-page-title">내 정보</h1>
        <p className="app-page-description">
          기본 정보, 알레르기/주의 성분, 복약 이력, 처방전 정보를 관리합니다.
        </p>
      </div>

      <section className="app-card profile-summary-card">
        <div className="profile-summary-main">
          <div className="profile-avatar" aria-hidden="true" />
          <div>
            <h2>{profile.username}</h2>
            <p>{profile.email}</p>
            <div className="profile-badge-row">
              <span className="profile-badge blue">일반 사용자</span>
              <span className="profile-badge green">활성 계정</span>
              <span className="profile-badge yellow">주의 성분 {cautions.length}건</span>
            </div>
          </div>
        </div>

        <button type="button" className="profile-edit-button">
          프로필 수정
        </button>
      </section>

      <section className="app-card">
        <div className="mypage-tab-row">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              className={activeTab === tab.key ? 'mypage-tab-button active' : 'mypage-tab-button'}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'profile' ? (
          <div className="mypage-section">
            <h2>기본 정보</h2>
            <div className="mypage-info-grid">
              <div className="mypage-info-card">
                <span>이름</span>
                <strong>{profile.username}</strong>
              </div>
              <div className="mypage-info-card">
                <span>이메일</span>
                <strong>{profile.email}</strong>
              </div>
              <div className="mypage-info-card">
                <span>생년월일</span>
                <strong>{profile.birthDate || '-'}</strong>
              </div>
              <div className="mypage-info-card">
                <span>성별</span>
                <strong>{profile.gender || '-'}</strong>
              </div>
            </div>
          </div>
        ) : null}

        {activeTab === 'health' ? (
          <div className="mypage-section">
            <h2>건강 정보</h2>
            <div className="mypage-info-grid">
              <div className="mypage-info-card">
                <span>임신 여부</span>
                <strong>{profile.isPregnant ? '해당' : '없음'}</strong>
              </div>
              <div className="mypage-info-card">
                <span>수유 여부</span>
                <strong>{profile.isBreastfeeding ? '해당' : '없음'}</strong>
              </div>
              <div className="mypage-info-card">
                <span>흡연</span>
                <strong>{profile.isSmoking ? '예' : '아니오'}</strong>
              </div>
              <div className="mypage-info-card">
                <span>음주</span>
                <strong>{profile.isDrinking ? '예' : '아니오'}</strong>
              </div>
            </div>
            <div className="mypage-disease-box">
              <span>기저질환</span>
              <div className="profile-badge-row">
                {(profile.chronicDiseases || []).length ? (
                  profile.chronicDiseases.map((disease) => (
                    <span key={disease} className="profile-badge blue">
                      {disease}
                    </span>
                  ))
                ) : (
                  <strong>등록된 기저질환이 없습니다.</strong>
                )}
              </div>
            </div>
          </div>
        ) : null}

        {activeTab === 'caution' ? (
          <div className="mypage-section">
            <div className="mypage-caution-header">
              <div>
                <h2>알레르기/주의 성분</h2>
                <p>복약 일정과 상담 화면에서 참고하는 사용자 전용 주의 정보입니다.</p>
              </div>
            </div>

            {message ? <div className="register-message">{message}</div> : null}

            <div className="mypage-caution-layout">
            <div className="mypage-caution-form">
              <div className="register-tab-row compact">
                <button
                  type="button"
                  className={cautionType === 'MEDICINE' ? 'register-tab-button active' : 'register-tab-button'}
                  onClick={() => setCautionType('MEDICINE')}
                >
                  약 이름
                </button>
                <button
                  type="button"
                  className={cautionType === 'INGREDIENT' ? 'register-tab-button active' : 'register-tab-button'}
                  onClick={() => setCautionType('INGREDIENT')}
                >
                  성분
                </button>
              </div>

              <div className="register-form-grid">
                <label className="register-field register-span-full">
                  <span>{cautionType === 'MEDICINE' ? '약 검색' : '성분 검색'}</span>
                  <input
                    value={cautionKeyword}
                    onChange={(event) => {
                      setCautionKeyword(event.target.value)
                      setSelectedSuggestion(null)
                    }}
                    placeholder={cautionType === 'MEDICINE' ? '예: 아스피린, 타이레놀' : '예: NSAIDs'}
                  />
                </label>
              </div>

              {cautionSuggestions.length > 0 ? (
                <div className="mypage-suggestion-list">
                  {cautionSuggestions.map((item) => (
                    <button
                      key={`${item.type}-${item.name}`}
                      type="button"
                      onClick={() => {
                        setSelectedSuggestion(item)
                        setCautionKeyword(item.name)
                        setCautionSuggestions([])
                      }}
                    >
                      {item.name}
                    </button>
                  ))}
                </div>
              ) : null}

              <div className="register-form-grid">
                <label className="register-field register-span-full">
                  <span>사유</span>
                  <select value={reason} onChange={(event) => setReason(event.target.value)}>
                    {cautionReasonOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="register-field">
                  <span>메모</span>
                  <input
                    value={memo}
                    onChange={(event) => setMemo(event.target.value)}
                    placeholder="예: 복용 시 두드러기 발생"
                  />
                </label>
              </div>

              <div className="register-submit-row left">
                <button type="button" className="app-primary-button" onClick={handleAddCaution}>
                  주의 성분 등록
                </button>
              </div>
            </div>

            <div className="mypage-caution-list">
              {cautions.length ? (
                cautions.map((item) => (
                  <article key={item.id} className="mypage-caution-card">
                    <div className="mypage-caution-card-main">
                      <div className="mypage-caution-inline-grid">
                        <div className="mypage-caution-inline-item">
                          <span>약검색</span>
                          <strong>{item.itemName || item.ingredientName}</strong>
                        </div>
                        <div className="mypage-caution-inline-item">
                          <span>사유</span>
                          <strong>{item.reason}</strong>
                        </div>
                        <div className="mypage-caution-inline-item">
                          <span>메모</span>
                          <strong>{item.memo || '메모 없음'}</strong>
                        </div>
                      </div>
                    </div>
                    <button type="button" className="register-remove-button" onClick={() => handleDeleteCaution(item.id)}>
                      삭제
                    </button>
                  </article>
                ))
              ) : (
                <div className="app-placeholder-card">등록된 주의 성분이 없습니다.</div>
              )}
            </div>
            </div>
          </div>
        ) : null}

        {activeTab === 'history' ? (
          <div className="mypage-section">
            <h2>복약 이력</h2>
            <div className="history-progress-list">
              {intakeHistory.map((item) => (
                <div key={item.name}>
                  <div className="history-progress-header">
                    <strong>{item.name}</strong>
                    <span>{item.rate}%</span>
                  </div>
                  <div className="history-progress-bar">
                    <div style={{ width: `${item.rate}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {activeTab === 'prescription' ? (
          <div className="mypage-section">
            <div className="mypage-section-heading">
              <div>
                <h2>처방전</h2>
                <p>실제 복약 스케줄을 처방전 단위로 열어 병원, 약국, 약물, 복용 시간을 수정할 수 있습니다.</p>
              </div>
              <button type="button" className="register-add-button" onClick={handleCreatePrescription}>
                새 처방전 추가
              </button>
            </div>

            {prescriptionMessage ? <div className="register-message prescription-message">{prescriptionMessage}</div> : null}

            <div className="mypage-prescription-workspace">
              <div className="mypage-prescription-sidebar">
                {prescriptions.length ? (
                  prescriptions.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className={item.id === selectedPrescriptionId ? 'mypage-prescription-card selected' : 'mypage-prescription-card'}
                      onClick={() => {
                        setSelectedPrescriptionId(item.id)
                        setPrescriptionMessage('')
                      }}
                    >
                      <div className="mypage-prescription-header">
                        <div>
                          <strong>{item.title}</strong>
                          <p>{item.dispensedDate ? item.dispensedDate.replaceAll('-', '.') : '-'}</p>
                        </div>
                        <span className={item.status === '종료' ? 'profile-badge yellow' : 'profile-badge green'}>
                          {item.status}
                        </span>
                      </div>
                      <p>{item.hospitalName || '병원 정보 없음'}</p>
                      <div className="profile-badge-row">
                        {item.medicines.map((medicine, index) => (
                          <span key={`${item.id}-${index}`} className="profile-badge blue">
                            {medicine.customMedicineName || `약 ${index + 1}`}
                          </span>
                        ))}
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="app-placeholder-card">등록된 처방전이 없습니다.</div>
                )}
              </div>

              <div className="mypage-prescription-editor">
                {selectedPrescription ? (
                  <>
                    <div className="register-form-grid">
                      <label className="register-field register-span-full">
                        <span>처방전 제목</span>
                        <input value={selectedPrescription.title} readOnly />
                      </label>

                      <label className="register-field">
                        <span>처방 병원</span>
                        <input
                          name="hospitalName"
                          value={selectedPrescription.hospitalName}
                          onChange={handlePrescriptionFieldChange}
                          placeholder="예: 서울 내과의원"
                        />
                      </label>

                      <label className="register-field">
                        <span>조제 약국</span>
                        <input
                          name="pharmacyName"
                          value={selectedPrescription.pharmacyName}
                          onChange={handlePrescriptionFieldChange}
                          placeholder="예: 행복약국"
                        />
                      </label>

                      <label className="register-field">
                        <span>조제일</span>
                        <input
                          type="date"
                          name="dispensedDate"
                          value={selectedPrescription.dispensedDate}
                          onChange={handlePrescriptionFieldChange}
                        />
                      </label>

                      <label className="register-field">
                        <span>상태</span>
                        <input value={selectedPrescription.status} readOnly />
                      </label>
                    </div>

                    <div className="register-medicine-header">
                      <div>
                        <h2>처방 약물</h2>
                        <p>병원/약국 정보와 함께 약 이름, 용량, 횟수, 복용 시간을 실제 데이터에 반영합니다.</p>
                      </div>
                      <button type="button" className="register-add-button" onClick={handleAddPrescriptionMedicine}>
                        약 추가
                      </button>
                    </div>

                    <div className="register-medicine-list">
                      {selectedPrescription.medicines.map((medicine, medicineIndex) => (
                        <section className="register-medicine-card" key={`${selectedPrescription.id}-medicine-${medicineIndex}`}>
                          <div className="register-medicine-title">
                            <h3>약 {medicineIndex + 1}</h3>
                            {selectedPrescription.medicines.length > 1 ? (
                              <button
                                type="button"
                                className="register-remove-button"
                                onClick={() => handleRemovePrescriptionMedicine(medicineIndex)}
                              >
                                삭제
                              </button>
                            ) : null}
                          </div>

                          <div className="register-form-grid">
                            <label className="register-field register-span-full">
                              <span>약 이름</span>
                              <input
                                name="customMedicineName"
                                value={medicine.customMedicineName}
                                onChange={(event) => handlePrescriptionMedicineFieldChange(medicineIndex, event)}
                                placeholder="예: 아스피린 100mg"
                              />
                            </label>

                            <label className="register-field">
                              <span>1회 복용량</span>
                              <input
                                name="dosageAmount"
                                type="number"
                                min="0"
                                step="0.5"
                                value={medicine.dosageAmount}
                                onChange={(event) => handlePrescriptionMedicineFieldChange(medicineIndex, event)}
                              />
                            </label>

                            <label className="register-field">
                              <span>단위</span>
                              <select
                                name="dosageUnit"
                                value={medicine.dosageUnit}
                                onChange={(event) => handlePrescriptionMedicineFieldChange(medicineIndex, event)}
                              >
                                {DOSAGE_UNIT_OPTIONS.map((option) => (
                                  <option key={option.value} value={option.value}>
                                    {option.label}
                                  </option>
                                ))}
                              </select>
                            </label>

                            <label className="register-field">
                              <span>하루 복용 횟수</span>
                              <input
                                name="timesPerDay"
                                type="number"
                                min="1"
                                max={MAX_TIMES_PER_DAY}
                                value={medicine.timesPerDay}
                                onChange={(event) => handlePrescriptionMedicineFieldChange(medicineIndex, event)}
                              />
                            </label>

                            <label className="register-field">
                              <span>총 복용 일수</span>
                              <input
                                name="durationDays"
                                type="number"
                                min="1"
                                value={medicine.durationDays}
                                onChange={(event) => handlePrescriptionMedicineFieldChange(medicineIndex, event)}
                              />
                            </label>
                          </div>

                          <div className="register-time-grid">
                            {medicine.timeSlots.map((slot, slotIndex) => (
                              <div className="register-time-card" key={`${selectedPrescription.id}-${medicineIndex}-${slotIndex}`}>
                                <strong>{slotIndex + 1}회차</strong>
                                <label className="register-field">
                                  <span>복용 시간</span>
                                  <input
                                    type="time"
                                    value={slot.takeTime}
                                    onChange={(event) =>
                                      handlePrescriptionTimeSlotChange(
                                        medicineIndex,
                                        slotIndex,
                                        'takeTime',
                                        event.target.value,
                                      )
                                    }
                                  />
                                </label>
                                <label className="register-field">
                                  <span>복용 시점</span>
                                  <select
                                    value={slot.timing}
                                    onChange={(event) =>
                                      handlePrescriptionTimeSlotChange(
                                        medicineIndex,
                                        slotIndex,
                                        'timing',
                                        event.target.value,
                                      )
                                    }
                                  >
                                    {TIMING_OPTIONS.map((option) => (
                                      <option key={option.value} value={option.value}>
                                        {option.label}
                                      </option>
                                    ))}
                                  </select>
                                </label>
                              </div>
                            ))}
                          </div>
                        </section>
                      ))}
                    </div>

                    <div className="register-submit-row">
                      <button
                        type="button"
                        className="register-remove-button"
                        onClick={handleDeletePrescription}
                        disabled={prescriptionSaving}
                      >
                        처방전 삭제
                      </button>
                      <button
                        type="button"
                        className="app-primary-button"
                        onClick={handleSavePrescription}
                        disabled={prescriptionSaving}
                      >
                        {prescriptionSaving ? '저장 중...' : '수정 내용 저장'}
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="app-placeholder-card">열어볼 처방전을 선택해 주세요.</div>
                )}
              </div>
            </div>
          </div>
        ) : null}

        {activeTab === 'settings' ? (
          <div className="mypage-section">
            <div className="mypage-section-heading">
              <div>
                <h2>기본 복용 시간 설정</h2>
              </div>
            </div>

            {message ? <div className="register-message">{message}</div> : null}

            <div className="register-medicine-list">
              {Object.entries(defaultMedicationTimeSettings).map(([timesPerDay, times]) => (
                <section key={timesPerDay} className="register-medicine-card">
                  <div className="register-medicine-title">
                    <h3>하루 {timesPerDay}회</h3>
                  </div>

                  <div className="register-time-grid">
                    {times.map((time, slotIndex) => (
                      <div className="register-time-card" key={`default-time-${timesPerDay}-${slotIndex}`}>
                        <strong>{slotIndex + 1}회차</strong>
                        <label className="register-field">
                          <input
                            type="time"
                            value={time}
                            onChange={(event) =>
                              handleDefaultMedicationTimeChange(
                                timesPerDay,
                                slotIndex,
                                event.target.value,
                              )
                            }
                          />
                        </label>
                      </div>
                    ))}
                  </div>
                </section>
              ))}
            </div>

            <div className="register-submit-row">
              <button
                type="button"
                className="register-remove-button"
                onClick={handleResetDefaultMedicationTimeSettings}
              >
                기본값으로 초기화
              </button>
              <button
                type="button"
                className="app-primary-button"
                onClick={handleSaveDefaultMedicationTimeSettings}
              >
                환경설정 저장
              </button>
            </div>
          </div>
        ) : null}
      </section>

      <section className="app-card withdraw-card">
        <div>
          <h2>회원 탈퇴</h2>
          <p>탈퇴 시 복약 일정, 상담 내역, 알림 설정 등 계정 관련 정보가 비활성화됩니다.</p>
        </div>
        <button type="button" onClick={handleWithdraw}>회원 탈퇴</button>
      </section>
    </div>
  )
}

export default MyPage
