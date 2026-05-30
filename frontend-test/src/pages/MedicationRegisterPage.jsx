import { useEffect, useState } from 'react'
import {
  createMedicationSchedule,
  createMedicationScheduleTime,
  createPrescriptionUploadUrl,
  initializeMedicationScheduleWindow,
  runPrescriptionOcr,
} from '../api'
import { DOSAGE_UNIT_OPTIONS, MAX_TIMES_PER_DAY, TIMING_OPTIONS } from './schedule/constants'
import {
  applyOcrDraftToForm,
  buildOcrScheduleDraft,
  buildPrescriptionFileName,
  buildSchedulePayload,
  buildTimePayload,
  createDefaultScheduleForm,
  createMedicineForm,
  normalizeTimesPerDay,
  syncTimeSlots,
} from './schedule/scheduleFormUtils'

async function uploadFileToPresignedUrl(uploadUrl, file, headers) {
  const response = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': file.type || 'image/jpeg',
      ...(headers || {}),
    },
    body: file,
  })

  if (!response.ok) {
    throw new Error(`업로드에 실패했습니다. (${response.status})`)
  }
}

function MedicationRegisterPage() {
  const [activeMode, setActiveMode] = useState('manual')
  const [form, setForm] = useState(() => createDefaultScheduleForm())
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)
  const [ocrLoading, setOcrLoading] = useState(false)
  const [selectedFile, setSelectedFile] = useState(null)
  const [selectedPreviewUrl, setSelectedPreviewUrl] = useState('')
  const [ocrResult, setOcrResult] = useState(null)

  useEffect(() => {
    return () => {
      if (selectedPreviewUrl) {
        URL.revokeObjectURL(selectedPreviewUrl)
      }
    }
  }, [selectedPreviewUrl])

  const handleSharedFieldChange = (event) => {
    const { name, value } = event.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleMedicineFieldChange = (medicineIndex, event) => {
    const { name, value } = event.target

    setForm((prev) => ({
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
  }

  const handleMedicineTimeSlotChange = (medicineIndex, slotIndex, field, value) => {
    setForm((prev) => ({
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
  }

  const handleAddMedicine = () => {
    setForm((prev) => ({
      ...prev,
      medicines: [...prev.medicines, createMedicineForm()],
    }))
  }

  const handleRemoveMedicine = (medicineIndex) => {
    setForm((prev) => ({
      ...prev,
      medicines: prev.medicines.filter((_, index) => index !== medicineIndex),
    }))
  }

  const handleFileChange = (event) => {
    const file = event.target.files?.[0] || null

    if (selectedPreviewUrl) {
      URL.revokeObjectURL(selectedPreviewUrl)
    }

    setSelectedFile(file)
    setOcrResult(null)
    setMessage('')

    if (file) {
      setSelectedPreviewUrl(URL.createObjectURL(file))
      return
    }

    setSelectedPreviewUrl('')
  }

  const handleRunOcr = async () => {
    if (!selectedFile) {
      setMessage('먼저 처방전 이미지를 선택해 주세요.')
      return
    }

    setOcrLoading(true)
    setMessage('')

    try {
      const presigned = await createPrescriptionUploadUrl({
        fileName: selectedFile.name || buildPrescriptionFileName(),
        contentType: selectedFile.type || 'image/jpeg',
      })

      await uploadFileToPresignedUrl(presigned.uploadUrl, selectedFile, presigned.headers)
      const ocrResponse = await runPrescriptionOcr(presigned.ocrResultId)
      const draft = buildOcrScheduleDraft(ocrResponse.resultJson)

      setOcrResult(ocrResponse)

      if (draft) {
        setForm((prev) => applyOcrDraftToForm(prev, draft))
        setMessage('OCR 분석 결과를 기반으로 입력칸을 채웠습니다. 저장 전 내용을 확인해 주세요.')
      } else {
        setMessage('OCR 결과를 읽었지만 자동으로 채울 수 있는 구조화 데이터가 부족합니다.')
      }
    } catch (error) {
      setMessage(error.response?.data?.message || error.message || 'OCR 처리에 실패했습니다.')
    } finally {
      setOcrLoading(false)
    }
  }

  const handleSubmit = async () => {
    setSaving(true)
    setMessage('')

    try {
      const schedule = await createMedicationSchedule(buildSchedulePayload(form))
      const createdMedicines = schedule.medicines || []

      await Promise.all(
        createdMedicines.flatMap((createdMedicine, medicineIndex) =>
          (form.medicines[medicineIndex]?.timeSlots || []).map((slot, slotIndex) =>
            createMedicationScheduleTime(buildTimePayload(slot, createdMedicine.id, slotIndex)),
          ),
        ),
      )

      await initializeMedicationScheduleWindow(schedule.id)
      setMessage('복약 일정이 저장되었습니다.')
      setForm(createDefaultScheduleForm())
      setSelectedFile(null)
      setOcrResult(null)
      if (selectedPreviewUrl) {
        URL.revokeObjectURL(selectedPreviewUrl)
      }
      setSelectedPreviewUrl('')
    } catch (error) {
      setMessage(error.response?.data?.message || error.message || '복약 일정 저장에 실패했습니다.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="app-page">
      <div className="app-page-header">
        <p className="app-page-eyebrow">Medication Register</p>
        <h1 className="app-page-title">복약 등록</h1>
        <p className="app-page-description">
          수동 입력과 자동 입력(OCR) 두 가지 방식만 남기고, 입력칸과 버튼 흐름을 사용자
          화면 중심으로 정리했습니다.
        </p>
      </div>

      <section className="app-card">
        <div className="register-tab-row">
          <button
            type="button"
            className={activeMode === 'manual' ? 'register-tab-button active' : 'register-tab-button'}
            onClick={() => setActiveMode('manual')}
          >
            수동 입력
          </button>
          <button
            type="button"
            className={activeMode === 'ocr' ? 'register-tab-button active' : 'register-tab-button'}
            onClick={() => setActiveMode('ocr')}
          >
            자동 입력(OCR)
          </button>
        </div>

        {message ? <div className="register-message">{message}</div> : null}

        {activeMode === 'ocr' ? (
          <div className="register-ocr-layout">
            <div className="register-ocr-upload">
              <label className="register-field">
                <span>처방전 이미지</span>
                <input type="file" accept="image/*" onChange={handleFileChange} />
              </label>

              <button type="button" className="app-primary-button" onClick={handleRunOcr} disabled={ocrLoading}>
                {ocrLoading ? '분석 중...' : 'OCR 분석 시작'}
              </button>

              {selectedPreviewUrl ? (
                <img className="register-preview-image" src={selectedPreviewUrl} alt="OCR preview" />
              ) : (
                <div className="register-preview-empty">이미지를 선택하면 미리보기가 표시됩니다.</div>
              )}
            </div>

            <div className="register-ocr-result">
              <div className="register-ocr-panel">
                <h2>추출 텍스트</h2>
                <pre>{ocrResult?.rawText || '분석 결과가 여기에 표시됩니다.'}</pre>
              </div>
              <div className="register-ocr-panel">
                <h2>구조화 결과</h2>
                <pre>{ocrResult?.resultJson || '구조화된 OCR 결과가 여기에 표시됩니다.'}</pre>
              </div>
            </div>
          </div>
        ) : null}

        <div className="register-form-grid">
          <label className="register-field">
            <span>처방 병원</span>
            <input
              name="hospitalName"
              value={form.hospitalName}
              onChange={handleSharedFieldChange}
              placeholder="예: 서울내과"
            />
          </label>

          <label className="register-field">
            <span>조제 약국</span>
            <input
              name="pharmacyName"
              value={form.pharmacyName}
              onChange={handleSharedFieldChange}
              placeholder="예: 행복약국"
            />
          </label>

          <label className="register-field">
            <span>조제일</span>
            <input type="date" name="dispensedDate" value={form.dispensedDate} onChange={handleSharedFieldChange} />
          </label>
        </div>

        <div className="register-medicine-header">
          <div>
            <h2>복약 정보</h2>
            <p>지금 구현된 기능만 사용해서 약 정보와 시간대를 함께 등록합니다.</p>
          </div>
          <button type="button" className="register-add-button" onClick={handleAddMedicine}>
            약 추가
          </button>
        </div>

        <div className="register-medicine-list">
          {form.medicines.map((medicine, medicineIndex) => (
            <section className="register-medicine-card" key={`medicine-${medicineIndex}`}>
              <div className="register-medicine-title">
                <h3>약 {medicineIndex + 1}</h3>
                {form.medicines.length > 1 ? (
                  <button type="button" className="register-remove-button" onClick={() => handleRemoveMedicine(medicineIndex)}>
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
                    onChange={(event) => handleMedicineFieldChange(medicineIndex, event)}
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
                    onChange={(event) => handleMedicineFieldChange(medicineIndex, event)}
                  />
                </label>

                <label className="register-field">
                  <span>단위</span>
                  <select
                    name="dosageUnit"
                    value={medicine.dosageUnit}
                    onChange={(event) => handleMedicineFieldChange(medicineIndex, event)}
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
                    onChange={(event) => handleMedicineFieldChange(medicineIndex, event)}
                  />
                </label>

                <label className="register-field">
                  <span>총 복용 일수</span>
                  <input
                    name="durationDays"
                    type="number"
                    min="1"
                    value={medicine.durationDays}
                    onChange={(event) => handleMedicineFieldChange(medicineIndex, event)}
                  />
                </label>
              </div>

              <div className="register-time-grid">
                {medicine.timeSlots.map((slot, slotIndex) => (
                  <div className="register-time-card" key={`slot-${medicineIndex}-${slotIndex}`}>
                    <strong>{slotIndex + 1}회차</strong>
                    <label className="register-field">
                      <span>복용 시간</span>
                      <input
                        type="time"
                        value={slot.takeTime}
                        onChange={(event) =>
                          handleMedicineTimeSlotChange(medicineIndex, slotIndex, 'takeTime', event.target.value)
                        }
                      />
                    </label>
                    <label className="register-field">
                      <span>복용 시점</span>
                      <select
                        value={slot.timing}
                        onChange={(event) =>
                          handleMedicineTimeSlotChange(medicineIndex, slotIndex, 'timing', event.target.value)
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
          <button type="button" className="app-primary-button" onClick={handleSubmit} disabled={saving}>
            {saving ? '저장 중...' : '복약 일정 등록'}
          </button>
        </div>
      </section>
    </div>
  )
}

export default MedicationRegisterPage
