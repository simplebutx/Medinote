import { useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import {
  createCaution,
  deleteCaution,
  getAuthSession,
  getCautions,
  suggestCautions,
} from '../api'
import { DOSAGE_UNIT_OPTIONS, MAX_TIMES_PER_DAY, TIMING_OPTIONS } from './schedule/constants'
import {
  createMedicineForm,
  normalizeTimesPerDay,
  syncTimeSlots,
} from './schedule/scheduleFormUtils'

const tabs = [
  { key: 'profile', label: '기본 정보' },
  { key: 'health', label: '건강 정보' },
  { key: 'caution', label: '알레르기/주의 성분' },
  { key: 'history', label: '복약 이력' },
  { key: 'prescription', label: '처방전' },
]

const cautionReasonOptions = [
  { value: 'ALLERGY', label: '알레르기' },
  { value: 'SIDE_EFFECT', label: '부작용' },
  { value: 'DOCTOR_ADVICE', label: '의사 권고' },
  { value: 'PHARMACIST_ADVICE', label: '약사 권고' },
  { value: 'PERSONAL_AVOID', label: '개인 회피' },
  { value: 'OTHER', label: '기타' },
]

const intakeHistory = [
  { name: '아스피린 100mg', rate: 92 },
  { name: '암로디핀 5mg', rate: 86 },
  { name: '타이레놀 500mg', rate: 74 },
]

function buildMedicineDraft({
  customMedicineName,
  dosageAmount,
  dosageUnit,
  timesPerDay,
  durationDays,
  timeSlots,
}) {
  const normalizedTimes = String(normalizeTimesPerDay(timesPerDay))
  const base = createMedicineForm()

  return {
    ...base,
    customMedicineName,
    dosageAmount: String(dosageAmount),
    dosageUnit,
    timesPerDay: normalizedTimes,
    durationDays: String(durationDays),
    timeSlots: syncTimeSlots(timeSlots, Number(normalizedTimes)),
  }
}

function createPrescriptionRecord(record) {
  return {
    ...record,
    medicines: record.medicines.map((medicine) => buildMedicineDraft(medicine)),
  }
}

const initialPrescriptionRecords = [
  createPrescriptionRecord({
    id: 'prescription-1',
    title: '내과 처방전',
    hospitalName: '서울 내과의원',
    pharmacyName: '행복약국',
    dispensedDate: '2026-05-12',
    status: '복용 중',
    notes: '혈압약과 식후 복용 약이 함께 포함된 처방전입니다.',
    medicines: [
      {
        customMedicineName: '아스피린 100mg',
        dosageAmount: 1,
        dosageUnit: 'TABLET',
        timesPerDay: 1,
        durationDays: 14,
        timeSlots: [{ takeTime: '08:00', timing: 'AFTER_MEAL' }],
      },
      {
        customMedicineName: '암로디핀 5mg',
        dosageAmount: 1,
        dosageUnit: 'TABLET',
        timesPerDay: 1,
        durationDays: 14,
        timeSlots: [{ takeTime: '20:00', timing: 'AFTER_MEAL' }],
      },
    ],
  }),
  createPrescriptionRecord({
    id: 'prescription-2',
    title: '두통 관련 처방전',
    hospitalName: '바른신경과',
    pharmacyName: '온유약국',
    dispensedDate: '2026-05-03',
    status: '종료',
    notes: '필요 시 복용 약 위주로 받은 처방전입니다.',
    medicines: [
      {
        customMedicineName: '타이레놀 500mg',
        dosageAmount: 1,
        dosageUnit: 'TABLET',
        timesPerDay: 3,
        durationDays: 5,
        timeSlots: [
          { takeTime: '09:00', timing: 'AFTER_MEAL' },
          { takeTime: '14:00', timing: 'AFTER_MEAL' },
          { takeTime: '20:00', timing: 'AFTER_MEAL' },
        ],
      },
    ],
  }),
]

const emptyPrescriptionRecord = () =>
  createPrescriptionRecord({
    id: `prescription-${Date.now()}`,
    title: '새 처방전',
    hospitalName: '',
    pharmacyName: '',
    dispensedDate: new Date().toISOString().slice(0, 10),
    status: '복용 예정',
    notes: '',
    medicines: [createMedicineForm()],
  })

function MyPage() {
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
  const [prescriptions, setPrescriptions] = useState(initialPrescriptionRecords)
  const [selectedPrescriptionId, setSelectedPrescriptionId] = useState(initialPrescriptionRecords[0].id)
  const [prescriptionMessage, setPrescriptionMessage] = useState('')

  useEffect(() => {
    const load = async () => {
      if (!session?.accessToken) {
        setLoading(false)
        return
      }

      try {
        const [profileResponse, cautionResponse] = await Promise.all([
          axios.get('http://localhost:8080/api/auth/me', {
            headers: {
              Authorization: `Bearer ${session.accessToken}`,
            },
          }),
          getCautions(),
        ])

        setProfile(profileResponse.data)
        setCautions(cautionResponse)
      } catch (error) {
        setMessage(error.response?.data?.message || '내 정보를 불러오지 못했습니다.')
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
      } catch (error) {
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
      setMessage('자동완성 목록에서 원하는 성분이나 약을 먼저 선택해주세요.')
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
      setMessage('주의 성분을 등록했습니다.')
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
        if (item.id !== selectedPrescriptionId) return item
        return typeof updater === 'function' ? updater(item) : updater
      }),
    )
  }

  const handlePrescriptionFieldChange = (event) => {
    const { name, value } = event.target
    updateSelectedPrescription((prev) => ({ ...prev, [name]: value }))
    setPrescriptionMessage('')
  }

  const handlePrescriptionMedicineFieldChange = (medicineIndex, event) => {
    const { name, value } = event.target

    updateSelectedPrescription((prev) => ({
      ...prev,
      medicines: prev.medicines.map((medicine, index) => {
        if (index !== medicineIndex) return medicine

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
        if (index !== medicineIndex) return medicine

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
    const nextPrescription = emptyPrescriptionRecord()
    setPrescriptions((prev) => [nextPrescription, ...prev])
    setSelectedPrescriptionId(nextPrescription.id)
    setPrescriptionMessage('새 처방전 초안을 만들었습니다.')
  }

  const handleSavePrescription = () => {
    if (!selectedPrescription) return
    setPrescriptionMessage(`"${selectedPrescription.title}" 내용을 저장할 준비가 되었습니다.`)
  }

  if (loading) {
    return <div className="app-card app-placeholder-card">내 정보를 불러오는 중입니다.</div>
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
                <label className="register-field">
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
                  <input value={memo} onChange={(event) => setMemo(event.target.value)} placeholder="예: 복용 후 두드러기 발생" />
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
                    <div>
                      <div className="profile-badge-row">
                        <span className="profile-badge blue">{item.itemName ? '약' : '성분'}</span>
                        <span className="profile-badge yellow">{item.reason}</span>
                      </div>
                      <h3>{item.itemName || item.ingredientName}</h3>
                      <p>{item.memo || '메모 없음'}</p>
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
                <p>처방전 단위로 열어서 병원, 약국, 복약 약물과 시간을 바로 수정할 수 있습니다.</p>
              </div>
              <button type="button" className="register-add-button" onClick={handleCreatePrescription}>
                새 처방전 추가
              </button>
            </div>

            {prescriptionMessage ? <div className="register-message prescription-message">{prescriptionMessage}</div> : null}

            <div className="mypage-prescription-workspace">
              <div className="mypage-prescription-sidebar">
                {prescriptions.map((item) => (
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
                        <p>{item.dispensedDate.replaceAll('-', '.')}</p>
                      </div>
                      <span className={item.status === '종료' ? 'profile-badge yellow' : 'profile-badge green'}>
                        {item.status}
                      </span>
                    </div>
                    <p>{item.hospitalName}</p>
                    <div className="profile-badge-row">
                      {item.medicines.map((medicine, index) => (
                        <span key={`${item.id}-${index}`} className="profile-badge blue">
                          {medicine.customMedicineName || `약 ${index + 1}`}
                        </span>
                      ))}
                    </div>
                  </button>
                ))}
              </div>

              <div className="mypage-prescription-editor">
                {selectedPrescription ? (
                  <>
                    <div className="register-form-grid">
                      <label className="register-field register-span-full">
                        <span>처방전 제목</span>
                        <input
                          name="title"
                          value={selectedPrescription.title}
                          onChange={handlePrescriptionFieldChange}
                          placeholder="예: 내과 처방전"
                        />
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
                        <select name="status" value={selectedPrescription.status} onChange={handlePrescriptionFieldChange}>
                          <option value="복용 예정">복용 예정</option>
                          <option value="복용 중">복용 중</option>
                          <option value="종료">종료</option>
                        </select>
                      </label>

                      <label className="register-field register-span-full">
                        <span>메모</span>
                        <input
                          name="notes"
                          value={selectedPrescription.notes}
                          onChange={handlePrescriptionFieldChange}
                          placeholder="처방전에 대한 간단한 메모를 남겨주세요."
                        />
                      </label>
                    </div>

                    <div className="register-medicine-header">
                      <div>
                        <h2>처방 약물</h2>
                        <p>약 등록 페이지처럼 약 이름, 용량, 횟수, 복용 시간을 한 번에 수정할 수 있습니다.</p>
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
                                placeholder="예: 타이레놀 500mg"
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
                      <button type="button" className="app-primary-button" onClick={handleSavePrescription}>
                        수정 내용 저장
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="app-placeholder-card">열어볼 처방전을 선택해주세요.</div>
                )}
              </div>
            </div>
          </div>
        ) : null}
      </section>

      <section className="app-card withdraw-card">
        <div>
          <h2>회원 탈퇴</h2>
          <p>탈퇴 시 복약 일정, 상담 내역, 알림 설정 등 계정 관련 정보가 비활성화됩니다.</p>
        </div>
        <button type="button">회원 탈퇴</button>
      </section>
    </div>
  )
}

export default MyPage
