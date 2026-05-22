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
  const [keyword, setKeyword] = useState('')
  const [selectedType, setSelectedType] = useState('MEDICINE')
  const [selectedSuggestion, setSelectedSuggestion] = useState(null)
  const [suggestions, setSuggestions] = useState([])
  const [suggestLoading, setSuggestLoading] = useState(false)
  const [cautions, setCautions] = useState([])
  const [listLoading, setListLoading] = useState(true)
  const [submitLoading, setSubmitLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [form, setForm] = useState(emptyForm())
  const [editingId, setEditingId] = useState(null)

  const debounceRef = useRef(null)
  const latestKeywordRef = useRef('')
  const latestTypeRef = useRef('MEDICINE')

  useEffect(() => {
    void fetchCautions()

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [])

  const fetchCautions = async () => {
    setListLoading(true)

    try {
      const items = await getCautions()
      setCautions(items)
    } catch (error) {
      setMessage(error.response?.data?.message || '주의 약·성분 목록을 불러오지 못했습니다.')
    } finally {
      setListLoading(false)
    }
  }

  const runSuggest = async (nextKeyword, nextType) => {
    try {
      const items = await suggestCautions(nextKeyword, nextType)

      if (latestKeywordRef.current !== nextKeyword || latestTypeRef.current !== nextType) {
        return
      }

      setSuggestions(items)
    } catch {
      if (latestKeywordRef.current === nextKeyword && latestTypeRef.current === nextType) {
        setSuggestions([])
      }
    } finally {
      if (latestKeywordRef.current === nextKeyword && latestTypeRef.current === nextType) {
        setSuggestLoading(false)
      }
    }
  }

  const handleKeywordChange = (event) => {
    const value = event.target.value
    setKeyword(value)
    setSelectedSuggestion(null)
    setMessage('')

    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    const trimmed = value.trim()
    latestKeywordRef.current = trimmed
    latestTypeRef.current = selectedType

    if (!trimmed) {
      setSuggestions([])
      setSuggestLoading(false)
      return
    }

    setSuggestLoading(true)
    debounceRef.current = setTimeout(() => {
      void runSuggest(trimmed, selectedType)
    }, 220)
  }

  const handleTypeChange = (nextType) => {
    setSelectedType(nextType)
    setSelectedSuggestion(null)
    setSuggestions([])
    setMessage('')

    const trimmed = keyword.trim()
    latestKeywordRef.current = trimmed
    latestTypeRef.current = nextType

    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    if (!trimmed) {
      setSuggestLoading(false)
      return
    }

    setSuggestLoading(true)
    debounceRef.current = setTimeout(() => {
      void runSuggest(trimmed, nextType)
    }, 120)
  }

  const handleSuggestionClick = (suggestion) => {
    setKeyword(suggestion.name)
    setSelectedSuggestion(suggestion)
    setSuggestions([])
    setSuggestLoading(false)
    latestKeywordRef.current = suggestion.name
    latestTypeRef.current = suggestion.type
  }

  const handleFormChange = (field) => (event) => {
    setForm((prev) => ({ ...prev, [field]: event.target.value }))
  }

  const resetForm = () => {
    setKeyword('')
    setSelectedType('MEDICINE')
    setSelectedSuggestion(null)
    setSuggestions([])
    setSuggestLoading(false)
    setForm(emptyForm())
    setEditingId(null)
  }

  const buildPayload = () => {
    if (!selectedSuggestion) {
      return null
    }

    return {
      itemSeq: null,
      itemName: selectedSuggestion.type === 'MEDICINE' ? selectedSuggestion.name : null,
      ingredientCode: null,
      ingredientName: selectedSuggestion.type === 'INGREDIENT' ? selectedSuggestion.name : null,
      reason: form.reason,
      memo: form.memo.trim() || null,
    }
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    const payload = buildPayload()

    if (!payload) {
      setMessage('자동완성 목록에서 주의 약 또는 주의 성분을 먼저 선택해 주세요.')
      return
    }

    setSubmitLoading(true)
    setMessage('')

    try {
      if (editingId) {
        await updateCaution(editingId, payload)
        setMessage('주의 약·성분 정보를 수정했습니다.')
      } else {
        await createCaution(payload)
        setMessage('주의 약·성분을 등록했습니다.')
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
    const nextType = caution.itemName ? 'MEDICINE' : 'INGREDIENT'
    const nextName = caution.itemName || caution.ingredientName || ''

    setEditingId(caution.id)
    setKeyword(nextName)
    setSelectedType(nextType)
    setSelectedSuggestion(nextName ? { name: nextName, type: nextType } : null)
    setSuggestions([])
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
      setMessage('주의 약·성분을 삭제했습니다.')
      await fetchCautions()
    } catch (error) {
      setMessage(error.response?.data?.message || '삭제 중 오류가 발생했습니다.')
    }
  }

  const currentTypeLabel = selectedType === 'MEDICINE' ? '약' : '성분'

  return (
    <div className="caution-page">
      <div className="caution-shell">
        <div className="caution-header">
          <div>
            <p className="caution-eyebrow">my caution register</p>
            <h1>내 주의성분·알러지 등록하기</h1>
            <p className="caution-subtitle">
              검색창은 하나만 두고, 옆에서 약 또는 성분을 선택해 등록합니다. 자동완성도 선택한 타입에
              맞는 항목만 보여줍니다.
            </p>
          </div>

          <Link className="caution-home-link" to="/">
            홈으로
          </Link>
        </div>

        <section className="caution-hero-card">
          <form className="caution-search-form" onSubmit={handleSubmit}>
            <div className="caution-type-toggle" role="radiogroup" aria-label="등록 타입 선택">
              <button
                type="button"
                className={`caution-type-toggle-button ${
                  selectedType === 'MEDICINE' ? 'caution-type-toggle-button-active' : ''
                }`}
                onClick={() => handleTypeChange('MEDICINE')}
              >
                약
              </button>
              <button
                type="button"
                className={`caution-type-toggle-button ${
                  selectedType === 'INGREDIENT' ? 'caution-type-toggle-button-active' : ''
                }`}
                onClick={() => handleTypeChange('INGREDIENT')}
              >
                성분
              </button>
            </div>

            <div className="caution-search-block">
              <label className="caution-search-label" htmlFor="caution-search-input">
                {currentTypeLabel} 검색
              </label>
              <input
                id="caution-search-input"
                className="caution-search-input"
                type="text"
                value={keyword}
                onChange={handleKeywordChange}
                placeholder={
                  selectedType === 'MEDICINE'
                    ? '예: 타이레놀'
                    : '예: 침강탄산칼슘'
                }
                autoComplete="off"
              />
              <div className="caution-search-status">
                {keyword.trim()
                  ? (suggestLoading
                      ? `${currentTypeLabel} 자동완성을 불러오는 중...`
                      : `아래 ${currentTypeLabel} 자동완성에서 선택해 주세요.`)
                  : `${currentTypeLabel}으로 등록할 이름을 검색해 보세요.`}
              </div>
              {suggestions.length > 0 && (
                <ul className="caution-suggestion-list">
                  {suggestions.map((suggestion) => (
                    <li key={`${suggestion.type}-${suggestion.name}`}>
                      <button
                        className="caution-suggestion-item"
                        type="button"
                        onClick={() => handleSuggestionClick(suggestion)}
                      >
                        <span
                          className={`caution-type-badge ${
                            suggestion.type === 'MEDICINE'
                              ? 'caution-type-badge-medicine'
                              : 'caution-type-badge-ingredient'
                          }`}
                        >
                          {suggestion.type === 'MEDICINE' ? '약' : '성분'}
                        </span>
                        <span>{suggestion.name}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
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
                  {selectedSuggestion
                    ? `${selectedSuggestion.type === 'MEDICINE' ? '약' : '성분'} 선택됨`
                    : `${currentTypeLabel} 미선택`}
                </strong>
                <p>
                  현재 선택된 타입은 {currentTypeLabel}입니다. 자동완성 목록에서 하나를 선택하면 해당
                  타입으로 저장됩니다.
                </p>
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
              {selectedSuggestion
                ? `${selectedSuggestion.type === 'MEDICINE' ? '약' : '성분'} 선택 완료`
                : `${currentTypeLabel} 선택 대기 중`}
            </strong>
            <p>
              검색창은 하나만 유지하고, 타입 선택 버튼으로 약과 성분을 나눕니다. 자동완성과 저장
              결과도 현재 선택한 타입을 기준으로 동작합니다.
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
            <div className="caution-empty-state">아직 등록된 주의 약·성분이 없습니다.</div>
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
                        : '약·성분 정보가 비어 있는 항목입니다.'}
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
