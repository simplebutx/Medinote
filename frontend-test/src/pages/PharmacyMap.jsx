import { useEffect, useRef, useState } from 'react'

import { getPharmaciesInBounds, getPharmacyDetail } from '../api'

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
    if (!KAKAO_MAP_KEY) {
      reject(new Error('MISSING_KAKAO_MAP_KEY'))
      return
    }

    if (window.kakao?.maps) {
      window.kakao.maps.load(() => resolve(window.kakao))
      return
    }

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

  const [status, setStatus] = useState('지도를 준비하고 있습니다.')
  const [pharmacies, setPharmacies] = useState([])
  const [selectedHpid, setSelectedHpid] = useState(null)
  const [selectedPharmacyDetail, setSelectedPharmacyDetail] = useState(null)

  useEffect(() => {
    let cancelled = false

    loadKakaoMapSdk()
      .then((kakao) => {
        if (cancelled || !mapElementRef.current || mapRef.current) return

        const map = new kakao.maps.Map(mapElementRef.current, {
          center: new kakao.maps.LatLng(DEFAULT_CENTER.lat, DEFAULT_CENTER.lng),
          level: DEFAULT_LEVEL,
        })

        mapRef.current = map
        setStatus('현재 지도 범위의 약국을 불러오는 중입니다.')

        kakao.maps.event.addListener(map, 'idle', () => {
          const bounds = map.getBounds()
          const southWest = bounds.getSouthWest()
          const northEast = bounds.getNorthEast()

          const currentRequestId = ++requestIdRef.current
          setStatus('현재 지도 범위의 약국을 불러오는 중입니다.')

          getPharmaciesInBounds({
            southLat: southWest.getLat(),
            westLng: southWest.getLng(),
            northLat: northEast.getLat(),
            eastLng: northEast.getLng(),
            limit: 300,
          })
            .then((data) => {
              if (cancelled || currentRequestId !== requestIdRef.current) return

              const nextPharmacies = Array.isArray(data) ? data : []
              setPharmacies(nextPharmacies)
              setSelectedHpid((previousHpid) => {
                if (nextPharmacies.length === 0) return null
                return nextPharmacies.some((item) => item.hpid === previousHpid)
                  ? previousHpid
                  : nextPharmacies[0].hpid
              })
              if (nextPharmacies.length === 0) {
                setSelectedPharmacyDetail(null)
              }
              setStatus(`${nextPharmacies.length}개 약국을 표시하고 있습니다.`)
            })
            .catch((error) => {
              if (cancelled || currentRequestId !== requestIdRef.current) return
              console.error('Failed to fetch pharmacies in bounds', error)
              setStatus('약국 목록을 불러오지 못했습니다. 백엔드 또는 API 경로를 확인해 주세요.')
            })
        })
      })
      .catch((error) => {
        if (cancelled) return

        console.error('Failed to load Kakao Maps SDK', {
          error,
          origin: window.location.origin,
          keyPresent: Boolean(KAKAO_MAP_KEY),
        })

        if (error.message === 'MISSING_KAKAO_MAP_KEY') {
          setStatus('VITE_KAKAO_MAP_KEY 값을 찾지 못했습니다. 환경 변수를 확인해 주세요.')
          return
        }

        const message = typeof error?.message === 'string' ? error.message : ''
        if (message.startsWith('SCRIPT_LOAD_FAILED:')) {
          setStatus(
            `카카오 SDK 스크립트를 불러오지 못했습니다. 현재 주소 ${window.location.origin} 기준 도메인 등록을 확인해 주세요.`,
          )
          return
        }

        setStatus(`카카오 지도를 불러오지 못했습니다. 현재 주소 ${window.location.origin} 와 앱 키를 다시 확인해 주세요.`)
      })

    return () => {
      cancelled = true
    }
  }, [])

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
        setSelectedHpid(pharmacy.hpid)
        mapRef.current.panTo(position)
      })

      markersRef.current.push({ hpid: pharmacy.hpid, marker, position })
    })
  }, [pharmacies])

  const selectedPharmacy = pharmacies.find((item) => item.hpid === selectedHpid) ?? null

  useEffect(() => {
    let cancelled = false

    if (!selectedHpid) {
      setSelectedPharmacyDetail(null)
      return () => {
        cancelled = true
      }
    }

    getPharmacyDetail(selectedHpid)
      .then((data) => {
        if (cancelled) return
        setSelectedPharmacyDetail(data)
      })
      .catch((error) => {
        if (cancelled) return
        console.error('Failed to fetch pharmacy detail', error)
        setSelectedPharmacyDetail(null)
      })

    return () => {
      cancelled = true
    }
  }, [selectedHpid])

  return (
    <div className="pharmacy-map-page">
      <div className="pharmacy-map-shell">
        <header className="pharmacy-map-header">
          <div>
            <p className="pharmacy-map-eyebrow">Pharmacy Map Test</p>
            <h1>근처 약국</h1>
            <p className="pharmacy-map-subtitle">지도를 클릭하거나 마커를 선택하면 아래에서 약국 상세 정보를 확인할 수 있습니다.</p>
          </div>
        </header>

        <section className="pharmacy-map-layout">
          <div className="pharmacy-map-panel">
            <div className="pharmacy-map-toolbar">
              <div>
                <h2>지도</h2>
              </div>
            </div>
            <div className="pharmacy-map-canvas" ref={mapElementRef} />
          </div>
        </section>

        <section className="pharmacy-map-detail-card pharmacy-map-detail-card-wide">
          <div className="pharmacy-map-detail-header">
            <span>선택한 약국</span>
            <h2>{selectedPharmacyDetail?.name || selectedPharmacy?.name || '약국을 선택해 주세요'}</h2>
          </div>

          {selectedPharmacyDetail ? (
            <dl className="pharmacy-map-detail-grid">
              <div>
                <dt>주소</dt>
                <dd>{selectedPharmacyDetail.address}</dd>
              </div>
              <div>
                <dt>전화</dt>
                <dd>{selectedPharmacyDetail.phone || '정보 없음'}</dd>
              </div>
              <div>
                <dt>평일</dt>
                <dd>{formatBusinessHours(selectedPharmacyDetail.mondayOpen, selectedPharmacyDetail.mondayClose)}</dd>
              </div>
              <div>
                <dt>토요일</dt>
                <dd>{formatBusinessHours(selectedPharmacyDetail.saturdayOpen, selectedPharmacyDetail.saturdayClose)}</dd>
              </div>
              <div>
                <dt>일요일</dt>
                <dd>{formatBusinessHours(selectedPharmacyDetail.sundayOpen, selectedPharmacyDetail.sundayClose)}</dd>
              </div>
              <div>
                <dt>공휴일</dt>
                <dd>{formatBusinessHours(selectedPharmacyDetail.holidayOpen, selectedPharmacyDetail.holidayClose)}</dd>
              </div>
              <div>
                <dt>상세 설명</dt>
                <dd>{selectedPharmacyDetail.description || '정보 없음'}</dd>
              </div>
              <div>
                <dt>추가 안내</dt>
                <dd>{selectedPharmacyDetail.extraInfo || '정보 없음'}</dd>
              </div>
            </dl>
          ) : selectedPharmacy ? (
            <div className="pharmacy-map-empty-state">약국 상세 정보를 불러오는 중입니다.</div>
          ) : (
            <div className="pharmacy-map-empty-state">지도에서 마커를 클릭하면 선택한 약국의 상세 정보가 여기에 표시됩니다.</div>
          )}
        </section>
      </div>
    </div>
  )
}

export default PharmacyMap
