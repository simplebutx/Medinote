import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { searchMedicines, suggestMedicines } from '../api'

const EMPTY_RESULTS_TEXT = '검색어를 입력하면 약 이미지와 주요 정보를 바로 확인할 수 있어요.'

function trimText(text) {
  if (!text) {
    return '-'
  }

  const normalized = text.replace(/\s+/g, ' ').trim()
  return normalized || '-'
}

function MedicineSearch() {
  const [keyword, setKeyword] = useState('')
  const [results, setResults] = useState([])
  const [suggestions, setSuggestions] = useState([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState(EMPTY_RESULTS_TEXT)

  const debounceTimeoutRef = useRef(null)
  const latestKeywordRef = useRef('')

  useEffect(() => (
    () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current)
      }
    }
  ), [])

  const handleSearch = async (rawKeyword) => {
    const nextKeyword = rawKeyword.trim()

    if (!nextKeyword) {
      setResults([])
      setMessage(EMPTY_RESULTS_TEXT)
      return
    }

    setLoading(true)
    setMessage('')

    try {
      const items = await searchMedicines(nextKeyword)
      setResults(items)
      setMessage(items.length > 0 ? '' : '검색 결과가 없습니다.')
    } catch (error) {
      setResults([])
      setMessage(error.response?.data?.message || '약 검색 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleKeywordChange = (event) => {
    const value = event.target.value
    setKeyword(value)

    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current)
    }

    const trimmed = value.trim()
    latestKeywordRef.current = trimmed

    if (!trimmed) {
      setSuggestions([])
      return
    }

    debounceTimeoutRef.current = setTimeout(async () => {
      try {
        const items = await suggestMedicines(trimmed)

        if (latestKeywordRef.current !== trimmed) {
          return
        }

        setSuggestions(items)
      } catch (error) {
        if (latestKeywordRef.current === trimmed) {
          setSuggestions([])
        }
      }
    }, 200)
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setSuggestions([])
    await handleSearch(keyword)
  }

  const handleSuggestionClick = async (selectedKeyword) => {
    setKeyword(selectedKeyword)
    setSuggestions([])
    await handleSearch(selectedKeyword)
  }

  return (
    <div className="medicine-search-page">
      <div className="medicine-search-shell">
        <div className="medicine-search-header">
          <div>
            <p className="medicine-search-eyebrow">medicine search</p>
            <h1>약 이름으로 검색하고 이미지까지 바로 확인하세요.</h1>
            <p className="medicine-search-subtitle">
              자동완성은 백엔드의 기존 suggest API를 그대로 사용하고, 검색 결과는 이미지와 효능,
              복용법, 주의사항까지 함께 보여줍니다.
            </p>
          </div>

          <Link className="medicine-search-home-link" to="/">
            홈으로
          </Link>
        </div>

        <form className="medicine-search-form" onSubmit={handleSubmit}>
          <div className="medicine-search-input-group">
            <input
              className="medicine-search-input"
              type="text"
              value={keyword}
              onChange={handleKeywordChange}
              placeholder="예: 타이레놀, 게보린"
            />
            <button className="medicine-search-submit" type="submit" disabled={loading}>
              {loading ? '검색 중...' : '검색'}
            </button>
          </div>

          {suggestions.length > 0 && (
            <ul className="medicine-search-suggestion-list">
              {suggestions.map((suggestion) => (
                <li key={suggestion}>
                  <button
                    className="medicine-search-suggestion-item"
                    type="button"
                    onClick={() => handleSuggestionClick(suggestion)}
                  >
                    {suggestion}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </form>

        {message && <div className="medicine-search-message">{message}</div>}

        {results.length > 0 && (
          <div className="medicine-search-grid">
            {results.map((medicine) => (
              <article className="medicine-card" key={medicine.itemSeq}>
                <div className="medicine-card-image-shell">
                  {medicine.imageUrl ? (
                    <img
                      className="medicine-card-image"
                      src={medicine.imageUrl}
                      alt={medicine.itemName}
                    />
                  ) : (
                    <div className="medicine-card-image-placeholder">이미지 없음</div>
                  )}
                </div>

                <div className="medicine-card-body">
                  <div className="medicine-card-title-row">
                    <h2>{medicine.itemName}</h2>
                    <span>#{medicine.itemSeq}</span>
                  </div>

                  <p className="medicine-card-company">{trimText(medicine.companyName)}</p>

                  <dl className="medicine-card-meta">
                    <div>
                      <dt>효능</dt>
                      <dd>{trimText(medicine.efficacy)}</dd>
                    </div>
                    <div>
                      <dt>복용법</dt>
                      <dd>{trimText(medicine.useMethod)}</dd>
                    </div>
                    <div>
                      <dt>주의사항</dt>
                      <dd>{trimText(medicine.caution)}</dd>
                    </div>
                    <div>
                      <dt>부작용</dt>
                      <dd>{trimText(medicine.sideEffect)}</dd>
                    </div>
                  </dl>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default MedicineSearch
