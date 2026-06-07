import { useEffect, useRef, useState } from 'react'
import { getPharmaciesInBounds, getPharmacyDetail, suggestMedicines } from '../api'
import axios from 'axios'

const KAKAO_MAP_SCRIPT_ID = 'kakao-map-sdk'
const KAKAO_MAP_KEY = import.meta.env.VITE_KAKAO_MAP_KEY
const DEFAULT_CENTER = { lat: 37.5665, lng: 126.978 }
const DEFAULT_LEVEL = 6

function formatBusinessHours(start, end) {
  if (!start || !end) return '정보 없음'
  return `${start.slice(0, 2)}:${start.slice(2)} - ${end.slice(0, 2)}:${end.slice(2)}`
}

function loadKakaoMapSdk() {
  return new Promise((resolve, reject) => {
    if (!KAKAO_MAP_KEY) { reject(new Error('MISSING_KAKAO_MAP_KEY')); return; }
    if (window.kakao?.maps) { window.kakao.maps.load(() => resolve(window.kakao)); return; }
    const existingScript = document.getElementById(KAKAO_MAP_SCRIPT_ID)
    if (existingScript) {
      existingScript.addEventListener('load', () => {
        window.kakao.maps.load(() => resolve(window.kakao))
      })
      existingScript.addEventListener('error', () => reject(new Error(`SCRIPT_LOAD_FAILED:${existingScript.src}`)))
      return
    }

    const script = document.createElement('script')
    script.id = KAKAO_MAP_SCRIPT_ID
    script.async = true
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?autoload=false&appkey=${KAKAO_MAP_KEY}`
    script.onload = () => window.kakao.maps.load(() => resolve(window.kakao))
    script.onerror = () => reject(new Error(`SCRIPT_LOAD_FAILED:${script.src}`))
    document.head.appendChild(script)
  })
}

function PharmacyMap() {
  const mapElementRef = useRef(null)
  const mapRef = useRef(null)
  const markersRef = useRef([])
  const requestIdRef = useRef(0)
  const debounceTimeoutRef = useRef(null)
  const isSearchingRef = useRef(false)

  const [status, setStatus] = useState('지도를 준비하고 있습니다.')
  const [pharmacies, setPharmacies] = useState([])
  const [selectedHpid, setSelectedHpid] = useState(null)
  const [selectedPharmacyDetail, setSelectedPharmacyDetail] = useState(null)
  
  // 재고 검색 및 뷰 모드 관련 상태
  const [searchMedicine, setSearchMedicine] = useState('')
  const [isSearchingByMedicine, setIsSearchingByMedicine] = useState(false)
  const [viewMode, setViewMode] = useState('detail') // 'detail' 또는 'list'
  const [suggestions, setSuggestions] = useState([])

  // 최신 검색 상태 유지를 위한 Ref (클로저 문제 방지)
  useEffect(() => {
    isSearchingRef.current = isSearchingByMedicine
  }, [isSearchingByMedicine])

  // 1. 지도 초기화 (최초 1회)
  useEffect(() => {
    loadKakaoMapSdk().then((kakao) => {
      if (!mapElementRef.current || mapRef.current) return

      const map = new kakao.maps.Map(mapElementRef.current, {
        center: new kakao.maps.LatLng(DEFAULT_CENTER.lat, DEFAULT_CENTER.lng),
        level: DEFAULT_LEVEL,
      })

      mapRef.current = map
      setStatus('주변 약국을 확인하고 있습니다.')

      kakao.maps.event.addListener(map, 'idle', () => {
        if (!isSearchingRef.current) {
          fetchPharmaciesInBounds(map)
        }
      })
      
      fetchPharmaciesInBounds(map)
    }).catch(err => {
      console.error('Kakao Map Load Error', err)
      setStatus('지도를 불러오지 못했습니다.')
    })
  }, [])

  const fetchPharmaciesInBounds = async (map) => {
    if (!map) return
    const bounds = map.getBounds()
    const currentRequestId = ++requestIdRef.current

    try {
      const data = await getPharmaciesInBounds({
        southLat: bounds.getSouthWest().getLat(),
        westLng: bounds.getSouthWest().getLng(),
        northLat: bounds.getNorthEast().getLat(),
        eastLng: bounds.getNorthEast().getLng(),
        limit: 300,
      })

      if (currentRequestId !== requestIdRef.current) return
      setPharmacies(Array.isArray(data) ? data : [])
      setStatus(`${data.length}개 약국을 표시 중입니다.`)
    } catch (error) {
      console.error('Fetch pharmacies error', error)
    }
  }

  // 뷰 모드나 검색 상태가 바뀔 때마다 지도를 다시 그려줌 (깨짐 방지)
  useEffect(() => {
    if (mapRef.current) {
      setTimeout(() => {
        mapRef.current.relayout()
      }, 200) // 충분한 시간을 주어 레이아웃이 잡힌 뒤 실행
    }
  }, [viewMode, isSearchingByMedicine])

  // 2. 약국 선택 시 처리 (상세보기 전환 및 지도 이동)
  const handlePharmacySelection = (pharmacy) => {
    if (!pharmacy || !pharmacy.latitude || !pharmacy.longitude) return
    
    setSelectedHpid(pharmacy.hpid)
    setViewMode('detail')
    
    // UI 업데이트 후 지도가 깨지지 않도록 강제 레이아웃 재계산 및 이동
    setTimeout(() => {
      if (mapRef.current) {
        mapRef.current.relayout()
        // 위도 경도가 숫자인지 확실하게 보정
        const lat = Number(pharmacy.latitude)
        const lng = Number(pharmacy.longitude)
        const pos = new window.kakao.maps.LatLng(lat, lng)
        
        mapRef.current.setCenter(pos) // setCenter로 확실하게 위치 고정
        mapRef.current.relayout() // 이동 후 한 번 더 레이아웃 확인
      }
    }, 100)
  }

  // 3. 재고 검색 실행
  const performMedicineSearch = async (itemName) => {
    if (!itemName.trim() || !mapRef.current) return

    const bounds = mapRef.current.getBounds()
    setIsSearchingByMedicine(true)
    setStatus(`"${itemName}" 재고 보유 약국을 찾는 중...`)
    
    try {
      const res = await axios.get('/api/pharmacies/search/medicine', {
        params: {
          itemName,
          southLat: bounds.getSouthWest().getLat(),
          northLat: bounds.getNorthEast().getLat(),
          westLng: bounds.getSouthWest().getLng(),
          eastLng: bounds.getNorthEast().getLng()
        }
      })
      
      const results = res.data || []
      setPharmacies(results)
      setStatus(`"${itemName}" 재고 보유 약국 ${results.length}곳을 찾았습니다.`)
      setViewMode('list')
      
      // 검색 직후 지도 레이아웃 안정화
      setTimeout(() => mapRef.current?.relayout(), 100)
      
      if (results.length === 0) {
        alert('현재 지역에는 해당 약의 재고를 보유한 약국이 없습니다.')
      }
    } catch (error) {
      console.error('Medicine search error', error)
      setStatus('검색 처리 중 오류가 발생했습니다.')
    }
  }

  // 4. 마커 표시
  useEffect(() => {
    if (!mapRef.current || !window.kakao?.maps) return

    markersRef.current.forEach(({ marker }) => marker.setMap(null))
    markersRef.current = []

    pharmacies.forEach((pharmacy) => {
      const position = new window.kakao.maps.LatLng(pharmacy.latitude, pharmacy.longitude)
      const marker = new window.kakao.maps.Marker({
        map: mapRef.current,
        position,
        title: pharmacy.name,
      })

      window.kakao.maps.event.addListener(marker, 'click', () => {
        handlePharmacySelection(pharmacy)
      })

      markersRef.current.push({ hpid: pharmacy.hpid, marker, position })
    })
  }, [pharmacies])

  const handleKeywordChange = (e) => {
    const value = e.target.value
    setSearchMedicine(value)

    if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current)
    const trimmed = value.trim()
    if (!trimmed) { setSuggestions([]); return }

    debounceTimeoutRef.current = setTimeout(async () => {
      try {
        const items = await suggestMedicines(trimmed)
        setSuggestions(items || [])
      } catch (err) { setSuggestions([]) }
    }, 200)
  }

  const handleSuggestionClick = (keyword) => {
    setSearchMedicine(keyword)
    setSuggestions([])
    performMedicineSearch(keyword)
  }

  useEffect(() => {
    if (!selectedHpid) { setSelectedPharmacyDetail(null); return; }
    getPharmacyDetail(selectedHpid)
      .then(setSelectedPharmacyDetail)
      .catch(() => setSelectedPharmacyDetail(null))
  }, [selectedHpid])

  return (
    <div className="pharmacy-map-page">
      <div className="pharmacy-map-shell">
        <header className="pharmacy-map-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div>
            <p className="pharmacy-map-eyebrow">Medicine Stock Search</p>
            <h1>근처 약국 & 재고 검색</h1>
            <p className="pharmacy-map-subtitle">약 이름을 검색하여 현재 재고가 있는 약국을 바로 확인하세요.</p>
          </div>
          
          <div style={{ position: 'relative' }}>
            <form onSubmit={(e) => { e.preventDefault(); setSuggestions([]); performMedicineSearch(searchMedicine); }} style={searchBoxStyle}>
                <input 
                    type="text" 
                    placeholder="약 이름 입력 (예: 후시)" 
                    value={searchMedicine}
                    onChange={handleKeywordChange}
                    style={searchInputStyle}
                />
                <button type="submit" style={searchButtonStyle}>재고 검색</button>
                {isSearchingByMedicine && (
                    <button 
                        type="button" 
                        onClick={() => {
                            setSearchMedicine('')
                            setIsSearchingByMedicine(false)
                            setViewMode('detail')
                            fetchPharmaciesInBounds(mapRef.current)
                        }} 
                        style={resetButtonStyle}
                    >
                        초기화
                    </button>
                )}
            </form>

            {suggestions.length > 0 && (
                <ul style={suggestionListStyle}>
                    {suggestions.map((s) => (
                        <li key={s} style={suggestionItemStyle} onClick={() => handleSuggestionClick(s)}>
                            {s}
                        </li>
                    ))}
                </ul>
            )}
          </div>
        </header>

        <section className="pharmacy-map-layout">
          <div className="pharmacy-map-panel">
            <div className="pharmacy-map-toolbar">
              <h2>{isSearchingByMedicine ? `"${searchMedicine}" 재고 보유 약국` : '약국 지도'}</h2>
            </div>
            {/* 핵심: 높이를 명시적으로 부여하고 배경색을 깔아서 로딩 확인 */}
            <div className="pharmacy-map-canvas" ref={mapElementRef} style={{ width: '100%', minHeight: '560px', backgroundColor: '#f8fafc' }} />
            <p style={{ fontSize: '13px', color: '#64748b', marginTop: '12px', fontWeight: '600' }}>
                {isSearchingByMedicine ? '🔍 ' : '📍 '} {status}
            </p>
          </div>
        </section>

        <section className="pharmacy-map-detail-card pharmacy-map-detail-card-wide">
          <div className="pharmacy-map-detail-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
                <span>{isSearchingByMedicine && viewMode === 'list' ? '검색 결과 리스트' : '선택한 약국 상세 정보'}</span>
                <h2>
                    {isSearchingByMedicine && viewMode === 'list' 
                        ? `"${searchMedicine}" 보유 약국 (${pharmacies.length}곳)` 
                        : (selectedPharmacyDetail?.name || '약국을 선택해 주세요')}
                </h2>
            </div>
            {isSearchingByMedicine && (
                <button onClick={() => {
                  const nextMode = viewMode === 'list' ? 'detail' : 'list'
                  setViewMode(nextMode)
                  // 모드 전환 시 지도가 깨지지 않게 보정
                  setTimeout(() => mapRef.current?.relayout(), 50)
                }} style={toggleButtonStyle}>
                    {viewMode === 'list' ? '상세 정보 보기' : '목록 다시 보기'}
                </button>
            )}
          </div>

          <div style={{ minHeight: '200px', maxHeight: '400px', overflowY: 'auto' }}>
            {isSearchingByMedicine && viewMode === 'list' ? (
                <div style={listContainerStyle}>
                    {pharmacies.map(p => (
                        <div key={p.hpid} style={listItemStyle} onClick={() => handlePharmacySelection(p)}>
                            <div style={{ fontWeight: 'bold', fontSize: '15px' }}>{p.name}</div>
                            <div style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>{p.address}</div>
                            <div style={{ fontSize: '12px', color: '#2563eb', fontWeight: '600', marginTop: '8px' }}>📞 {p.phone || '번호 없음'}</div>
                        </div>
                    ))}
                </div>
            ) : (
                selectedPharmacyDetail ? (
                    <dl className="pharmacy-map-detail-grid">
                    <div style={{ gridColumn: 'span 2' }}>
                        <dt>주소</dt>
                        <dd style={{ fontSize: '16px', fontWeight: '600' }}>{selectedPharmacyDetail.address}</dd>
                    </div>
                    <div>
                        <dt>전화</dt>
                        <dd>{selectedPharmacyDetail.phone || '정보 없음'}</dd>
                    </div>
                    <div>
                        <dt>평일 영업</dt>
                        <dd>{formatBusinessHours(selectedPharmacyDetail.mondayOpen, selectedPharmacyDetail.mondayClose)}</dd>
                    </div>
                    <div>
                        <dt>상세 설명</dt>
                        <dd>{selectedPharmacyDetail.description || '정보 없음'}</dd>
                    </div>
                    </dl>
                ) : (
                    <div className="pharmacy-map-empty-state">
                        {isSearchingByMedicine ? '목록에서 약국을 선택하면 상세 위치와 정보를 확인할 수 있습니다.' : '지도에서 마커를 클릭하면 약국 상세 정보가 여기에 표시됩니다.'}
                    </div>
                )
            )}
          </div>
        </section>
      </div>
    </div>
  )
}

// --- Styles ---
const searchBoxStyle = { display: 'flex', gap: '8px', marginBottom: '8px' }
const searchInputStyle = { padding: '12px 16px', borderRadius: '10px', border: '2px solid #e2e8f0', width: '300px', outline: 'none', fontSize: '14px' }
const searchButtonStyle = { padding: '12px 20px', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer' }
const resetButtonStyle = { padding: '12px 16px', backgroundColor: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '10px', fontWeight: '600', cursor: 'pointer' }
const toggleButtonStyle = { padding: '10px 16px', borderRadius: '8px', backgroundColor: '#fff', border: '1px solid #e2e8f0', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }
const listContainerStyle = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', padding: '20px' }
const listItemStyle = { padding: '20px', border: '1px solid #f1f5f9', borderRadius: '12px', cursor: 'pointer', backgroundColor: '#f8fafc', borderLeft: '4px solid #2563eb' }
const suggestionListStyle = { position: 'absolute', top: '100%', left: 0, right: 0, backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', zIndex: 1000, listStyle: 'none', padding: 0, margin: '4px 0', maxHeight: '200px', overflowY: 'auto', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' };
const suggestionItemStyle = { padding: '12px 16px', cursor: 'pointer', borderBottom: '1px solid #f1f5f9', fontSize: '14px', textAlign: 'left' };

export default PharmacyMap
