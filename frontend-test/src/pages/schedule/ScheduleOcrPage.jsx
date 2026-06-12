import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  createMedicationSchedule,
  createMedicationScheduleTime,
  createPrescriptionUploadUrl,
  runPrescriptionOcr,
} from '../../api'
import ScheduleForm from './ScheduleForm'
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
} from './scheduleFormUtils'

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
    throw new Error(`이미지 업로드에 실패했습니다. (${response.status})`)
  }
}

function ScheduleOcrPage() {
  const navigate = useNavigate()
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [ocrLoading, setOcrLoading] = useState(false)
  const [form, setForm] = useState(() => createDefaultScheduleForm())
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
  }

  const handleMedicineTimeSlotChange = (medicineIndex, slotIndex, field, value) => {
    setForm((prev) => ({
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

  const createTimesSequentially = async (medicines) => {
    for (const [medicineIndex, medicine] of medicines.entries()) {
      const slots = form.medicines[medicineIndex]?.timeSlots || []

      for (const [slotIndex, slot] of slots.entries()) {
        await createMedicationScheduleTime(buildTimePayload(slot, medicine.id, slotIndex))
      }
    }
  }

  const handleFileChange = (event) => {
    const file = event.target.files?.[0] || null

    if (selectedPreviewUrl) {
      URL.revokeObjectURL(selectedPreviewUrl)
    }

    setSelectedFile(file)
    setOcrResult(null)

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

      setOcrResult({
        ...ocrResponse,
        fileUrl: presigned.fileUrl || '',
        key: presigned.key || '',
      })

      if (ocrResponse.status && ocrResponse.status !== 'OCR_DONE' && ocrResponse.status !== 'CONFIRMED') {
        setMessage(ocrResponse.errorMessage || 'OCR 처리 중 오류가 발생했습니다.')
        return
      }

      const ocrDraft = buildOcrScheduleDraft(ocrResponse.resultJson)
      setOcrResult((prev) => ({
        ...prev,
        draft: ocrDraft,
      }))

      if (ocrDraft) {
        setForm((prev) => applyOcrDraftToForm(prev, ocrDraft))
        setMessage('OCR 분석이 끝났고, 아래 스케줄 등록 칸에 값을 채워 두었습니다.')
      } else {
        setForm(createDefaultScheduleForm())
        setMessage('OCR 분석은 끝났지만 자동 입력 가능한 구조화 결과는 찾지 못했습니다.')
      }
    } catch (error) {
      setMessage(error.response?.data?.message || error.message || 'OCR 처리 중 오류가 발생했습니다.')
    } finally {
      setOcrLoading(false)
    }
  }

  const handleSubmit = async () => {
    setLoading(true)
    setMessage('')

    try {
      const schedule = await createMedicationSchedule(buildSchedulePayload(form))
      const createdMedicines = schedule.medicines || []

      if (createdMedicines.length !== form.medicines.length) {
        throw new Error('Not all medicines were created.')
      }

      await createTimesSequentially(createdMedicines)

      navigate('/app/schedule', {
        state: {
          message: 'Schedule created successfully.',
        },
      })
    } catch (error) {
      setMessage(error.response?.data?.message || error.message || 'Failed to create schedule.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <ScheduleForm
      title="OCR prescription upload"
      description="Upload a prescription image, review the extracted text, and save the prefilled schedule."
      submitLabel="Create schedule"
      form={form}
      calculatedWindow={null}
      message={message}
      loading={loading}
      onSharedFieldChange={handleSharedFieldChange}
      onMedicineFieldChange={handleMedicineFieldChange}
      onMedicineTimeSlotChange={handleMedicineTimeSlotChange}
      onAddMedicine={handleAddMedicine}
      onRemoveMedicine={handleRemoveMedicine}
      onSubmit={handleSubmit}
      topContent={
        <section className="schedule-card schedule-card-wide">
          <div className="schedule-card-header">
            <h2>OCR upload</h2>
            <p>모바일 앱의 처방전 OCR 흐름을 웹에서도 그대로 테스트할 수 있게 구성했습니다.</p>
          </div>

          <div className="schedule-ocr-grid">
            <div className="schedule-ocr-upload-panel">
              <label className="schedule-file-input">
                <span>Prescription image</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  disabled={ocrLoading || loading}
                />
              </label>

              <button type="button" onClick={handleRunOcr} disabled={!selectedFile || ocrLoading || loading}>
                {ocrLoading ? 'Analyzing...' : 'Upload and analyze'}
              </button>

              <div className="schedule-ocr-hints">
                <strong>자동 채움 대상</strong>
                <span>병원명, 약국명, 날짜, 약 이름, 복용량, 복용 횟수, 복용 일수</span>
              </div>

              {selectedPreviewUrl ? (
                <img className="schedule-ocr-preview-image" src={selectedPreviewUrl} alt="Selected prescription" />
              ) : (
                <div className="schedule-ocr-preview-empty">이미지를 선택하면 미리보기가 여기 표시됩니다.</div>
              )}
            </div>

            <div className="schedule-ocr-result-panel">
              <div className="schedule-ocr-result-card">
                <span className="schedule-status-label">구조화 결과 JSON</span>
                <pre className="schedule-output">
                  {ocrResult?.resultJson || '구조화 결과가 생기면 여기에서 바로 확인할 수 있습니다.'}
                </pre>
              </div>
            </div>
          </div>
        </section>
      }
    />
  )
}

export default ScheduleOcrPage
