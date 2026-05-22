import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  createCaution,
  deleteCaution,
  getCautions,
  suggestCautions,
  updateCaution,
} from '../api'

const REASON_OPTIONS = [
  { value: 'ALLERGY', label: '알러지' },
  { value: 'SIDE_EFFECT', label: '부작용' },
  { value: 'DOCTOR_ADVICE', label: '의사 권고' },
  { value: 'PHARMACIST_ADVICE', label: '약사 권고' },
  { value: 'PERSONAL_AVOID', label: '개인적 이유' },
  { value: 'OTHER', label: '기타' },
]

function emptyForm() {
  return {
    reason: 'ALLERGY',
    memo: '',
  }
}

function getTypeLabel(caution) {
  if (caution.itemName) {
    return '약'
  }

  if (caution.ingredientName) {
    return '성분'
  }

  return '미분류'
}

function getDisplayName(caution) {
  return caution.itemName || caution.ingredientName || '-'
}

function CautionRegister() {
  const [medicineKeyword, setMedicineKeyword] = useState('')
  const [ingredientKeyword, setIngredientKeyword] = useState('')
  const [selectedMedicine, setSelectedMedicine] = useState(null)
  const [selectedIngredient, setSelectedIngredient] = useState(null)
  const [medicineSuggestions, setMedicineSuggestions] = useState([])
  const [ingredientSuggestions, setIngredientSuggestions] = useState([])
  const [medicineLoading, setMedicineLoading] = useState(false)
  const [ingredientLoading, setIngredientLoading] = useState(false)
  const [cautions, setCautions] = useState([])
  const [listLoading, setListLoading] = useState(true)
  const [submitLoading, setSubmitLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [form, setForm] = useState(emptyForm())
  const [editingId, setEditingId] = useState(null)

  const medicineDebounceRef = useRef(null)
  const ingredientDebounceRef = useRef(null)
  const latestMedicineKeywordRef = useRef('')
  const latestIngredientKeywordRef = useRef('')

  useEffect(() => {
    void fetchCautions()

    return () => {
      if (medicineDebounceRef.current) {
        clearTimeout(medicineDebounceRef.current)
      }
      if (ingredientDebounceRef.current) {
        clearTimeout(ingredientDebounceRef.current)
      }
    }
  }, [])

  const fetchCautions = async () => {
    setListLoading(true)

    try {
      const items = await getCautions()
      setCautions(items)
    } catch (error) {
      setMessage(error.response?.data?.message || '주의 약/성분 목록을 불러오지 못했습니다.')
    } finally {
      setListLoading(false)
    }
  }

  const runSuggest = async (keyword, type, setters) => {
    const { setSuggestions, setLoading, latestKeywordRef } = setters

    try {
      const items = await suggestCautions(keyword)

      if (latestKeywordRef.current !== keyword) {
        return
      }

      setSuggestions(items.filter((item) => item.type === type))
    } catch (error) {
      if (latestKeywordRef.current === keyword) {
        setSuggestions([])
      }
    } finally {
      if (latestKeywordRef.current === keyword) {
        setLoading(false)
      }
    }
  }

  const handleMedicineChange = (event) => {
    const value = event.target.value
    setMedicineKeyword(value)
    setSelectedMedicine(null)
    setMessage('')

    if (medicineDebounceRef.current) {
      clearTimeout(medicineDebounceRef.current)
    }

    const trimmed = value.trim()
    latestMedicineKeywordRef.current = trimmed

    if (!trimmed) {
      setMedicineSuggestions([])
      setMedicineLoading(false)
      return
    }

    setMedicineLoading(true)
    medicineDebounceRef.current = setTimeout(() => {
      void runSuggest(trimmed, 'MEDICINE', {
        setSuggestions: setMedicineSuggestions,
        setLoading: setMedicineLoading,
        latestKeywordRef: latestMedicineKeywordRef,
      })
    }, 220)
  }

  const handleIngredientChange = (event) => {
    const value = event.target.value
    setIngredientKeyword(value)
    setSelectedIngredient(null)
    setMessage('')

    if (ingredientDebounceRef.current) {
      clearTimeout(ingredientDebounceRef.current)
    }

    const trimmed = value.trim()
    latestIngredientKeywordRef.current = trimmed

    if (!trimmed) {
      setIngredientSuggestions([])
      setIngredientLoading(false)
      return
    }

    setIngredientLoading(true)
    ingredientDebounceRef.current = setTimeout(() => {
      void runSuggest(trimmed, 'INGREDIENT', {
        setSuggestions: setIngredientSuggestions,
        setLoading: setIngredientLoading,
        latestKeywordRef: latestIngredientKeywordRef,
      })
    }, 220)
  }

  const handleMedicineClick = (suggestion) => {
    setMedicineKeyword(suggestion.name)
    setSelectedMedicine(suggestion)
    setMedicineSuggestions([])
    setMedicineLoading(false)
    latestMedicineKeywordRef.current = suggestion.name
  }

  const handleIngredientClick = (suggestion) => {
    setIngredientKeyword(suggestion.name)
    setSelectedIngredient(suggestion)
    setIngredientSuggestions([])
    setIngredientLoading(false)
    latestIngredientKeywordRef.current = suggestion.name
  }

  const handleFormChange = (field) => (event) => {
    setForm((prev) => ({ ...prev, [field]: event.target.value }))
  }

  const resetForm = () => {
    setMedicineKeyword('')
    setIngredientKeyword('')
    setSelectedMedicine(null)
    setSelectedIngredient(null)
    setMedicineSuggestions([])
    setIngredientSuggestions([])
    setMedicineLoading(false)
    setIngredientLoading(false)
    setForm(emptyForm())
    setEditingId(null)
  }

  const buildPayload = () => {
    if (!selectedMedicine && !selectedIngredient) {
      return null
    }

    return {
      itemSeq: null,
      itemName: selectedMedicine?.name ?? null,
      ingredientCode: null,
      ingredientName: selectedIngredient?.name ?? null,
      reason: form.reason,
      memo: form.memo.trim() || null,
    }
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    const payload = buildPayload()

    if (!payload) {
      setMessage('주의 약 또는 주의 성분 중 하나 이상 자동완성에서 선택해 주세요.')
      return
    }

    setSubmitLoading(true)
    setMessage('')

    try {
      if (editingId) {
        await updateCaution(editingId, payload)
        setMessage('주의 약/성분 정보를 수정했습니다.')
      } else {
        await createCaution(payload)
        setMessage('주의 약/성분을 등록했습니다.')
      }

      resetForm()
      await fetchCautions()
    } catch (error) {
      setMessage(error.response?.data?.message || '저장 중 오류가 발생했습니다.')
    } finally {
      setSubmitLoading(false)
    }
  }

  const handleEdit = (caution) => {
    setEditingId(caution.id)
    setMedicineKeyword(caution.itemName || '')
    setIngredientKeyword(caution.ingredientName || '')
    setSelectedMedicine(caution.itemName ? { name: caution.itemName, type: 'MEDICINE' } : null)
    setSelectedIngredient(
      caution.ingredientName ? { name: caution.ingredientName, type: 'INGREDIENT' } : null,
    )
    setMedicineSuggestions([])
    setIngredientSuggestions([])
    setForm({
      reason: caution.reason || 'ALLERGY',
      memo: caution.memo || '',
    })
    setMessage('')
  }

  const handleDelete = async (id) => {
    setMessage('')

    try {
      await deleteCaution(id)
      if (editingId === id) {
        resetForm()
      }
      setMessage('주의 약/성분을 삭제했습니다.')
      await fetchCautions()
    } catch (error) {
      setMessage(error.response?.data?.message || '삭제 중 오류가 발생했습니다.')
    }
  }

  return (
    <div className="caution-page">
      <div className="caution-shell">
        <div className="caution-header">
          <div>
            <p className="caution-eyebrow">my caution register</p>
            <h1>내 주의성분·알러지 등록하기</h1>
            <p className="caution-subtitle">
              검색창을 주의 약과 주의 성분으로 나눠서 관리합니다. 각 검색창은 자기 타입 자동완성만
              보여주고, 선택한 값만 저장됩니다.
            </p>
          </div>

          <Link className="caution-home-link" to="/">
            홈으로
          </Link>
        </div>

        <section className="caution-hero-card">
          <form className="caution-search-form" onSubmit={handleSubmit}>
            <div className="caution-dual-search-grid">
              <div className="caution-search-block">
                <label className="caution-search-label" htmlFor="caution-medicine-input">
                  주의 약 검색
                </label>
                <input
                  id="caution-medicine-input"
                  className="caution-search-input"
                  type="text"
                  value={medicineKeyword}
                  onChange={handleMedicineChange}
                  placeholder="예: 타이레놀"
                  autoComplete="off"
                />
                <div className="caution-search-status">
                  {medicineKeyword.trim()
                    ? (medicineLoading
                        ? '약 자동완성 불러오는 중...'
                        : '아래 약 자동완성에서 선택해 주세요.')
                    : '주의 약으로 등록할 약 이름을 검색하세요.'}
                </div>
                {medicineSuggestions.length > 0 && (
                  <ul className="caution-suggestion-list">
                    {medicineSuggestions.map((suggestion) => (
                      <li key={`${suggestion.type}-${suggestion.name}`}>
                        <button
                          className="caution-suggestion-item"
                          type="button"
                          onClick={() => handleMedicineClick(suggestion)}
                        >
                          <span className="caution-type-badge caution-type-badge-medicine">약</span>
                          <span>{suggestion.name}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="caution-search-block">
                <label className="caution-search-label" htmlFor="caution-ingredient-input">
                  주의 성분 검색
                </label>
                <input
                  id="caution-ingredient-input"
                  className="caution-search-input"
                  type="text"
                  value={ingredientKeyword}
                  onChange={handleIngredientChange}
                  placeholder="예: 침강탄산칼슘"
                  autoComplete="off"
                />
                <div className="caution-search-status">
                  {ingredientKeyword.trim()
                    ? (ingredientLoading
                        ? '성분 자동완성 불러오는 중...'
                        : '아래 성분 자동완성에서 선택해 주세요.')
                    : '주의 성분으로 등록할 성분명을 검색하세요.'}
                </div>
                {ingredientSuggestions.length > 0 && (
                  <ul className="caution-suggestion-list">
                    {ingredientSuggestions.map((suggestion) => (
                      <li key={`${suggestion.type}-${suggestion.name}`}>
                        <button
                          className="caution-suggestion-item"
                          type="button"
                          onClick={() => handleIngredientClick(suggestion)}
                        >
                          <span className="caution-type-badge caution-type-badge-ingredient">성분</span>
                          <span>{suggestion.name}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            <div className="caution-form-grid">
              <label>
                이유
                <select value={form.reason} onChange={handleFormChange('reason')}>
                  {REASON_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <div className="caution-current-type-card">
                <span>선택 상태</span>
                <strong>
                  {selectedMedicine || selectedIngredient
                    ? `${selectedMedicine ? '약 선택됨' : '약 미선택'} / ${selectedIngredient ? '성분 선택됨' : '성분 미선택'}`
                    : '아직 선택 안 됨'}
                </strong>
                <p>약만 저장해도 되고, 성분만 저장해도 되고, 둘 다 같이 저장해도 됩니다.</p>
              </div>

              <label className="caution-col-span-2">
                메모
                <textarea
                  value={form.memo}
                  onChange={handleFormChange('memo')}
                  placeholder="예: 먹으면 속이 쓰리거나 두드러기가 생김"
                  rows={4}
                />
              </label>
            </div>

            <div className="caution-form-actions">
              <button type="submit" disabled={submitLoading}>
                {submitLoading ? '저장 중...' : editingId ? '수정 저장' : '새로 등록'}
              </button>
              <button type="button" className="secondary" onClick={resetForm}>
                입력 초기화
              </button>
            </div>
          </form>

          <div className="caution-preview-card">
            <div className="caution-preview-badge">preview</div>
            <strong>
              {selectedMedicine || selectedIngredient
                ? `약 ${selectedMedicine ? '선택' : '미선택'} / 성분 ${selectedIngredient ? '선택' : '미선택'}`
                : '등록할 약 또는 성분을 선택해 주세요'}
            </strong>
            <p>
              이제는 통합 검색창이 아니라 두 개의 검색창으로 나눠서, 팀이 합의한 방식대로 약/성분을
              분리해서 등록할 수 있습니다.
            </p>
            {message && <div className="caution-inline-message">{message}</div>}
          </div>
        </section>

        <section className="caution-list-section">
          <div className="caution-list-header">
            <div>
              <p className="caution-eyebrow">saved cautions</p>
              <h2>등록된 주의 약·성분 목록</h2>
            </div>
          </div>

          {listLoading ? (
            <div className="caution-empty-state">목록을 불러오는 중입니다...</div>
          ) : cautions.length === 0 ? (
            <div className="caution-empty-state">아직 등록된 주의 약/성분이 없습니다.</div>
          ) : (
            <div className="caution-list-grid">
              {cautions.map((caution) => (
                <article className="caution-list-card" key={caution.id}>
                  <div className="caution-list-card-top">
                    <div>
                      <span
                        className={`caution-type-badge ${
                          caution.itemName
                            ? 'caution-type-badge-medicine'
                            : caution.ingredientName
                              ? 'caution-type-badge-ingredient'
                              : 'caution-type-badge-unclassified'
                        }`}
                      >
                        {getTypeLabel(caution)}
                      </span>
                      <h3>{getDisplayName(caution)}</h3>
                    </div>
                    <span className="caution-reason-badge">{caution.reason}</span>
                  </div>

                  <p className="caution-list-card-meta">
                    {caution.itemName
                      ? '약 이름 기준으로 저장된 항목입니다.'
                      : caution.ingredientName
                        ? '성분명 기준으로 저장된 항목입니다.'
                        : '약/성분 정보가 비어 있는 항목입니다.'}
                  </p>

                  <p className="caution-list-card-memo">{caution.memo || '메모 없음'}</p>

                  <div className="caution-list-card-actions">
                    <button type="button" onClick={() => handleEdit(caution)}>
                      수정
                    </button>
                    <button
                      type="button"
                      className="danger"
                      onClick={() => handleDelete(caution.id)}
                    >
                      삭제
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

export default CautionRegister
