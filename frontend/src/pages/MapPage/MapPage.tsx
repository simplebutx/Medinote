import { useEffect, useMemo, useRef, useState } from 'react';

import { Badge, Button, Card, Input } from '../../components/ui';
import { useDebounce } from '../../hooks/useDebounce';
import { useMedicineSuggest } from '../../features/drug/hooks';
import {
  usePharmaciesInBounds,
  usePharmacyDetail,
  useSearchPharmaciesByMedicine,
} from '../../features/pharmacy/hooks';
import type { Pharmacy } from '../../features/pharmacy/types';

const DEFAULT_BOUNDS = {
  southLat: 37.45,
  northLat: 37.62,
  westLng: 126.83,
  eastLng: 127.12,
  limit: 30,
};

interface KakaoLatLng {
  getLat: () => number;
  getLng: () => number;
}

interface KakaoLatLngBounds {
  getSouthWest: () => KakaoLatLng;
  getNorthEast: () => KakaoLatLng;
}

interface KakaoMap {
  getBounds: () => KakaoLatLngBounds;
  panTo: (position: KakaoLatLng) => void;
}

interface KakaoMarker {
  setMap: (map: KakaoMap | null) => void;
}

interface KakaoMapConstructor {
  new (
    container: HTMLElement,
    options: {
      center: KakaoLatLng;
      level: number;
    },
  ): KakaoMap;
}

interface KakaoMarkerConstructor {
  new (options: {
    position: KakaoLatLng;
    map: KakaoMap;
  }): KakaoMarker;
}

interface KakaoMaps {
  load: (callback: () => void) => void;
  LatLng: new (latitude: number, longitude: number) => KakaoLatLng;
  Map: KakaoMapConstructor;
  Marker: KakaoMarkerConstructor;
  event: {
    addListener: (
      target: KakaoMap | KakaoMarker,
      type: string,
      callback: () => void,
    ) => void;
  };
}

interface KakaoGlobal {
  maps: KakaoMaps;
}

type PharmacySearchMode = 'inventory' | 'pharmacy';

declare global {
  interface Window {
    kakao?: KakaoGlobal;
  }
}

const KAKAO_MAP_KEY = import.meta.env.VITE_KAKAO_MAP_KEY as
  | string
  | undefined;

let kakaoMapScriptPromise: Promise<void> | null = null;

function loadKakaoMapScript() {
  if (!KAKAO_MAP_KEY) {
    return Promise.reject(
      new Error('VITE_KAKAO_MAP_KEY가 설정되지 않았습니다.'),
    );
  }

  if (window.kakao?.maps) {
    return Promise.resolve();
  }

  if (kakaoMapScriptPromise) {
    return kakaoMapScriptPromise;
  }

  kakaoMapScriptPromise = new Promise((resolve, reject) => {
    const existingScript = document.querySelector<HTMLScriptElement>(
      'script[data-kakao-map-script="true"]',
    );

    if (existingScript) {
      if (window.kakao?.maps) {
        window.kakao.maps.load(() => { resolve(); });
        return;
      }

      existingScript.addEventListener('load', () => {
        const kakao = window.kakao;
        if (!kakao?.maps) {
          reject(new Error('Kakao 지도 객체를 찾을 수 없습니다.'));
          return;
        }
        kakao.maps.load(() => { resolve(); });
      });

      existingScript.addEventListener('error', reject);
      return;
    }

    const script = document.createElement('script');
    script.dataset.kakaoMapScript = 'true';
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_MAP_KEY}&autoload=false`;
    script.async = true;

    script.onload = () => {
      const kakao = window.kakao;
      if (!kakao?.maps) {
        reject(new Error('Kakao 지도 객체를 찾을 수 없습니다.'));
        return;
      }
      kakao.maps.load(() => { resolve(); });
    };

    script.onerror = () => {
      reject(new Error('Kakao 지도 스크립트를 불러오지 못했습니다.'));
    };

    document.head.appendChild(script);
  });

  return kakaoMapScriptPromise;
}

function roundCoordinate(value: number) {
  return Number(value.toFixed(5));
}

function getPharmacyHpid(pharmacy: Pharmacy) {
  return pharmacy.hpid;
}

function getPharmacyName(pharmacy: Pharmacy) {
  return pharmacy.name ?? pharmacy.pharmacyName ?? '약국 이름 없음';
}

function getPharmacyAddress(pharmacy: Pharmacy) {
  return pharmacy.address ?? '주소 정보 없음';
}

function getPharmacyPhone(pharmacy: Pharmacy) {
  return pharmacy.phone ?? '전화번호 정보 없음';
}


function getPharmacyLatitude(pharmacy: Pharmacy) {
  return pharmacy.latitude ?? null;
}

function getPharmacyLongitude(pharmacy: Pharmacy) {
  return pharmacy.longitude ?? null;
}

function getBusinessHours(pharmacy: Pharmacy) {
  const businessHours = [
    ['월', pharmacy.mondayOpen, pharmacy.mondayClose],
    ['화', pharmacy.tuesdayOpen, pharmacy.tuesdayClose],
    ['수', pharmacy.wednesdayOpen, pharmacy.wednesdayClose],
    ['목', pharmacy.thursdayOpen, pharmacy.thursdayClose],
    ['금', pharmacy.fridayOpen, pharmacy.fridayClose],
    ['토', pharmacy.saturdayOpen, pharmacy.saturdayClose],
    ['일', pharmacy.sundayOpen, pharmacy.sundayClose],
    ['공휴일', pharmacy.holidayOpen, pharmacy.holidayClose],
  ];

  return businessHours.map(([label, open, close]) => ({
    label,
    value: open && close ? `${open} ~ ${close}` : '정보 없음',
    hasInfo: Boolean(open && close),
  }));
}

function normalizeSearchText(value?: string | null) {
  return (value ?? '').replace(/\s+/g, '').toLowerCase();
}

function getPharmacyAddressSearchText(address?: string | null) {
  const tokens = (address ?? '')
    .replace(/[(),]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
  const roadNameIndex = tokens.findIndex((token) =>
    /(?:대로|로|길)$/.test(token),
  );

  if (roadNameIndex < 0) {
    return tokens.slice(0, 3).join(' ');
  }

  return tokens.slice(0, roadNameIndex + 1).join(' ');
}

function filterPharmaciesByKeyword(pharmacies: Pharmacy[], keyword: string) {
  const normalizedKeyword = normalizeSearchText(keyword);

  if (!normalizedKeyword) {
    return pharmacies;
  }

  return pharmacies.filter((pharmacy) => {
    const searchableValues = [
      getPharmacyName(pharmacy),
      getPharmacyAddressSearchText(getPharmacyAddress(pharmacy)),
    ];

    return searchableValues.some((value) =>
      normalizeSearchText(value).includes(normalizedKeyword),
    );
  });
}

function MapPage() {
  const [selectedHpid, setSelectedHpid] = useState('');
  const [searchMode, setSearchMode] =
    useState<PharmacySearchMode>('inventory');
  const [medicineKeyword, setMedicineKeyword] = useState('');
  const [committedMedicineKeyword, setCommittedMedicineKeyword] = useState('');
  const [selectedMedicineName, setSelectedMedicineName] = useState('');
  const [pharmacyKeyword, setPharmacyKeyword] = useState('');
  const [committedPharmacyKeyword, setCommittedPharmacyKeyword] = useState('');

  const debouncedMedicineKeyword = useDebounce(medicineKeyword, 300);

  const isMedicineSuggestEnabled =
    searchMode === 'inventory' &&
    debouncedMedicineKeyword.trim().length >= 2 &&
    !selectedMedicineName;

  const {
    data: medicineSuggestions = [],
    isLoading: isMedicineSuggestLoading,
  } = useMedicineSuggest(
    isMedicineSuggestEnabled ? debouncedMedicineKeyword.trim() : '',
  );

  const shouldShowMedicineDropdown = isMedicineSuggestEnabled;

  const [bounds, setBounds] = useState(DEFAULT_BOUNDS);

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<KakaoMap | null>(null);
  const markerRefs = useRef<KakaoMarker[]>([]);

  const [isMapReady, setIsMapReady] = useState(false);
  const [mapErrorMessage, setMapErrorMessage] = useState('');

  const isMedicineSearchMode =
    searchMode === 'inventory' &&
    committedMedicineKeyword.trim().length >= 2;
  const isPharmacySearchMode =
    searchMode === 'pharmacy' &&
    committedPharmacyKeyword.trim().length >= 2;

  const {
    data: pharmaciesInBounds = [],
    isLoading: isPharmaciesLoading,
    isError: isPharmaciesError,
  } = usePharmaciesInBounds(bounds);

  const {
    data: medicineSearchPharmacies = [],
    isLoading: isMedicineSearchLoading,
    isError: isMedicineSearchError,
  } = useSearchPharmaciesByMedicine(
    {
      ...bounds,
      keyword: committedMedicineKeyword,
    },
    isMedicineSearchMode,
  );

  const pharmacies = useMemo(() => {
    if (isMedicineSearchMode) {
      return medicineSearchPharmacies;
    }

    if (isPharmacySearchMode) {
      return filterPharmaciesByKeyword(
        pharmaciesInBounds,
        committedPharmacyKeyword,
      );
    }

    return pharmaciesInBounds;
  }, [
    committedPharmacyKeyword,
    isMedicineSearchMode,
    isPharmacySearchMode,
    medicineSearchPharmacies,
    pharmaciesInBounds,
  ]);

  const selectedPharmacyFromList = useMemo(() => {
    return pharmacies.find((pharmacy) => getPharmacyHpid(pharmacy) === selectedHpid);
  }, [pharmacies, selectedHpid]);

  const {
    data: selectedPharmacyDetail,
    isLoading: isDetailLoading,
    isError: isDetailError,
  } = usePharmacyDetail(selectedHpid);

  const selectedPharmacy = selectedPharmacyDetail ?? selectedPharmacyFromList;

  const isPharmacyDataLoading = isMedicineSearchMode
    ? isMedicineSearchLoading
    : isPharmaciesLoading;

  const isPharmacyDataError = isMedicineSearchMode
    ? isMedicineSearchError
    : isPharmaciesError;

  const focusPharmacy = (pharmacy: Pharmacy) => {
    const hpid = getPharmacyHpid(pharmacy);
    const latitude = getPharmacyLatitude(pharmacy);
    const longitude = getPharmacyLongitude(pharmacy);

    setSelectedHpid(hpid);

    if (
      mapRef.current &&
      window.kakao?.maps &&
      latitude !== null &&
      longitude !== null
    ) {
      mapRef.current.panTo(
        new window.kakao.maps.LatLng(latitude, longitude),
      );
    }
  };

  const handleSearchMedicine = () => {
    const keyword = medicineKeyword.trim();

    if (keyword.length < 2) {
      setCommittedMedicineKeyword('');
      setSelectedMedicineName('');
      return;
    }

    setCommittedMedicineKeyword(keyword);
    setSelectedMedicineName(keyword);
    setSelectedHpid('');
  };

  const handleSelectSuggestion = (suggestion: string) => {
    setMedicineKeyword(suggestion);
    setCommittedMedicineKeyword(suggestion);
    setSelectedMedicineName(suggestion);
    setSelectedHpid('');
  };

  const handleSearchPharmacy = () => {
    const keyword = pharmacyKeyword.trim();

    if (keyword.length < 2) {
      setCommittedPharmacyKeyword('');
      setSelectedHpid('');
      return;
    }

    const matchedPharmacies = filterPharmaciesByKeyword(
      pharmaciesInBounds,
      keyword,
    );

    setCommittedPharmacyKeyword(keyword);

    if (matchedPharmacies.length > 0) {
      focusPharmacy(matchedPharmacies[0]);
      return;
    }

    setSelectedHpid('');
  };

  const handleChangeSearchMode = (mode: PharmacySearchMode) => {
    setSearchMode(mode);
    setMedicineKeyword('');
    setCommittedMedicineKeyword('');
    setSelectedMedicineName('');
    setPharmacyKeyword('');
    setCommittedPharmacyKeyword('');
    setSelectedHpid('');
  };

  const handleResetSearch = () => {
    setMedicineKeyword('');
    setCommittedMedicineKeyword('');
    setSelectedMedicineName('');
    setPharmacyKeyword('');
    setCommittedPharmacyKeyword('');
    setSelectedHpid('');
  };

  useEffect(() => {
    let isMounted = true;

    const initializeMap = async () => {
      if (!mapContainerRef.current || mapRef.current) {
        return;
      }

      try {
        await loadKakaoMapScript();

        if (!isMounted || !mapContainerRef.current) {
          return;
        }

        const kakao = window.kakao;

        if (!kakao?.maps) {
          throw new Error('Kakao 지도 객체를 찾을 수 없습니다.');
        }

        const center = new kakao.maps.LatLng(37.5665, 126.978);
        const map = new kakao.maps.Map(mapContainerRef.current, {
          center,
          level: 7,
        });

        mapRef.current = map;
        setIsMapReady(true);

        kakao.maps.event.addListener(map, 'idle', () => {
          const mapBounds = map.getBounds();
          const southWest = mapBounds.getSouthWest();
          const northEast = mapBounds.getNorthEast();

          setBounds((prev) => {
            const nextBounds = {
              ...prev,
              southLat: roundCoordinate(southWest.getLat()),
              westLng: roundCoordinate(southWest.getLng()),
              northLat: roundCoordinate(northEast.getLat()),
              eastLng: roundCoordinate(northEast.getLng()),
            };

            if (
              prev.southLat === nextBounds.southLat &&
              prev.westLng === nextBounds.westLng &&
              prev.northLat === nextBounds.northLat &&
              prev.eastLng === nextBounds.eastLng
            ) {
              return prev;
            }

            return nextBounds;
          });
        });
      } catch (error) {
        console.error(error);
        setMapErrorMessage(
          '지도 API key 또는 Kakao 개발자 도메인 설정을 확인해주세요.',
        );
      }
    };

    initializeMap();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!isMapReady || !mapRef.current || !window.kakao?.maps) {
      return;
    }

    const kakao = window.kakao;
    const map = mapRef.current;

    if (!kakao?.maps || !map) {
      return;
    }

    markerRefs.current.forEach((marker) => {
      marker.setMap(null);
    });
    markerRefs.current = [];

    pharmacies.forEach((pharmacy) => {
      const latitude = getPharmacyLatitude(pharmacy);
      const longitude = getPharmacyLongitude(pharmacy);
      const hpid = getPharmacyHpid(pharmacy);

      if (latitude === null || longitude === null || !hpid) {
        return;
      }

      const marker = new kakao.maps.Marker({
        position: new kakao.maps.LatLng(latitude, longitude),
        map,
      });

      kakao.maps.event.addListener(marker, 'click', () => {
        setSelectedHpid(hpid);
      });

      markerRefs.current.push(marker);
    });
  }, [isMapReady, pharmacies]);

  return (
    <div className="space-y-6">

      {/* ── Status banner ── */}
      <div className="flex items-center justify-between rounded-2xl border border-blue-100 bg-blue-50 px-5 py-3.5">
        <div className="flex items-center gap-3">
          <div className={`h-2 w-2 rounded-full ${isMapReady ? 'bg-emerald-500' : 'bg-slate-300'}`} />
          <p className="text-sm font-semibold text-blue-900">
            {isMapReady ? '지도 연결됨' : '지도 로딩 중'}
          </p>
          <span className="text-sm text-blue-600">·</span>
          <p className="text-sm text-blue-700">
            현재 지도 범위에서{' '}
            <span className="font-bold">
              {isPharmacyDataLoading ? '…' : `${pharmacies.length}개`}
            </span>
            {' '}약국 조회
          </p>
        </div>

        <Badge variant="blue">
          {isMedicineSearchMode
            ? '약 재고 검색'
            : isPharmacySearchMode
              ? '약국 검색'
              : '지도 범위 조회'}
        </Badge>
      </div>

      {/* ── Main grid ── */}
      <div className="grid gap-5 lg:grid-cols-[400px_1fr]">

        {/* ── LEFT: Search + Pharmacy list ── */}
        <div className="flex flex-col gap-4">

          {/* Search card */}
          <Card>
            {/* Mode tabs */}
            <div className="grid grid-cols-2 rounded-xl bg-slate-100 p-1">
              <button
                type="button"
                onClick={() => handleChangeSearchMode('inventory')}
                className={[
                  'rounded-lg px-4 py-2.5 text-sm font-semibold transition',
                  searchMode === 'inventory'
                    ? 'bg-white text-blue-700 shadow-sm'
                    : 'text-slate-500 hover:text-slate-900',
                ].join(' ')}
              >
                재고 검색
              </button>
              <button
                type="button"
                onClick={() => handleChangeSearchMode('pharmacy')}
                className={[
                  'rounded-lg px-4 py-2.5 text-sm font-semibold transition',
                  searchMode === 'pharmacy'
                    ? 'bg-white text-blue-700 shadow-sm'
                    : 'text-slate-500 hover:text-slate-900',
                ].join(' ')}
              >
                약국 검색
              </button>
            </div>

            <p className="mt-4 text-xs text-slate-400">
              {searchMode === 'inventory'
                ? '약 이름을 입력하면 해당 약 재고를 보유한 약국을 검색합니다.'
                : '현재 지도 범위에서 약국 이름이나 주소로 검색합니다.'}
            </p>

            {/* Inventory search */}
            {searchMode === 'inventory' ? (
              <div className="mt-3 space-y-2">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      value={medicineKeyword}
                      onChange={(event) => {
                        setMedicineKeyword(event.target.value);
                        setCommittedMedicineKeyword('');
                        setSelectedMedicineName('');
                      }}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          handleSearchMedicine();
                        }
                      }}
                      placeholder="예: 타이레놀"
                    />

                    {shouldShowMedicineDropdown && (
                      <div className="absolute z-20 mt-2 w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg">
                        <div className="border-b border-slate-100 px-4 py-2.5">
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                            약 검색 결과
                          </p>
                        </div>

                        <div className="max-h-56 overflow-y-auto">
                          {isMedicineSuggestLoading && (
                            <div className="px-4 py-5 text-center text-sm text-slate-400">
                              검색 중…
                            </div>
                          )}

                          {!isMedicineSuggestLoading && medicineSuggestions.length === 0 && (
                            <div className="px-4 py-5 text-center text-sm text-slate-400">
                              검색 결과가 없습니다.
                            </div>
                          )}

                          {!isMedicineSuggestLoading &&
                            medicineSuggestions.map((suggestion) => (
                              <button
                                key={suggestion}
                                type="button"
                                onClick={() => handleSelectSuggestion(suggestion)}
                                className="flex w-full items-center px-4 py-3 text-left transition hover:bg-blue-50"
                              >
                                <p className="text-sm font-semibold text-slate-900">{suggestion}</p>
                              </button>
                            ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <Button
                    type="button"
                    onClick={handleSearchMedicine}
                    disabled={medicineKeyword.trim().length < 2}
                    className="shrink-0"
                  >
                    검색
                  </Button>
                </div>

                {isMedicineSearchMode && (
                  <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3.5 py-2.5">
                    <p className="text-xs text-slate-500">
                      <span className="font-semibold text-slate-800">
                        {selectedMedicineName || committedMedicineKeyword}
                      </span>{' '}
                      재고 보유 약국
                    </p>
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-semibold text-blue-600">
                        {isMedicineSearchLoading ? '…' : `${pharmacies.length}곳`}
                      </span>
                      <button
                        type="button"
                        onClick={handleResetSearch}
                        className="text-xs text-slate-400 transition hover:text-slate-700"
                      >
                        초기화
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* Pharmacy search */
              <div className="mt-3 space-y-2">
                <div className="flex gap-2">
                  <div className="flex-1">
                  <Input
                    value={pharmacyKeyword}
                    onChange={(event) => {
                      setPharmacyKeyword(event.target.value);
                      setCommittedPharmacyKeyword('');
                    }}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        handleSearchPharmacy();
                      }
                    }}
                    placeholder="예: 중앙약국, 서소문로"
                  />
                  </div>
                  <Button
                    type="button"
                    onClick={handleSearchPharmacy}
                    disabled={pharmacyKeyword.trim().length < 2}
                    className="shrink-0"
                  >
                    검색
                  </Button>
                </div>

                {isPharmacySearchMode && (
                  <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3.5 py-2.5">
                    <p className="text-xs text-slate-500">
                      <span className="font-semibold text-slate-800">{committedPharmacyKeyword}</span>{' '}
                      검색 결과
                    </p>
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-semibold text-blue-600">
                        {pharmacies.length}곳
                      </span>
                      <button
                        type="button"
                        onClick={handleResetSearch}
                        className="text-xs text-slate-400 transition hover:text-slate-700"
                      >
                        초기화
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </Card>

          {/* Pharmacy list */}
          {!isPharmacyDataLoading && !isPharmacyDataError && pharmacies.length > 0 && (
            <Card className="flex flex-col overflow-hidden p-0">
              <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                <p className="text-sm font-bold text-slate-900">약국 목록</p>
                <span className="text-xs text-slate-400">{pharmacies.length}곳</span>
              </div>

              <div className="max-h-[480px] overflow-y-auto divide-y divide-slate-50">
                {pharmacies.map((pharmacy) => {
                  const hpid = getPharmacyHpid(pharmacy);
                  const isSelected = hpid === selectedHpid;

                  return (
                    <button
                      key={hpid}
                      type="button"
                      onClick={() => focusPharmacy(pharmacy)}
                      className={[
                        'flex w-full items-center gap-3 border-l-2 px-4 py-3 text-left transition',
                        isSelected
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-transparent hover:bg-slate-50',
                      ].join(' ')}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-slate-900">
                          {getPharmacyName(pharmacy)}
                        </p>
                        <p className="mt-0.5 truncate text-xs text-slate-400">
                          {getPharmacyAddress(pharmacy)}
                        </p>

                      </div>
                      {isSelected && (
                        <span className="shrink-0 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700">
                          선택됨
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </Card>
          )}

          {/* Loading / error states for pharmacy list */}
          {isPharmacyDataLoading && (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-400">
              약국 위치를 불러오는 중입니다…
            </div>
          )}

          {isPharmacyDataError && (
            <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-6 text-center text-sm text-red-500">
              약국 위치를 불러오지 못했습니다.
            </div>
          )}

          {!isPharmacyDataLoading && !isPharmacyDataError && (isMedicineSearchMode || isPharmacySearchMode) && pharmacies.length === 0 && (
            <div className="rounded-2xl border border-amber-100 bg-amber-50 px-4 py-6 text-center text-sm text-amber-700">
              {isMedicineSearchMode
                ? '현재 지도 범위에서 해당 약 재고를 보유한 약국을 찾지 못했습니다.'
                : '현재 지도 범위에서 일치하는 약국을 찾지 못했습니다.'}
            </div>
          )}
        </div>

        {/* ── RIGHT: Map + Detail ── */}
        <div className="flex flex-col gap-5">

          {/* Map card */}
          <Card>
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-slate-900">약국 지도</h2>
                <p className="mt-0.5 text-xs text-slate-400">
                  지도를 이동하면 현재 화면 범위의 약국 위치를 다시 조회합니다.
                </p>
              </div>
              <Badge variant={isMapReady ? 'green' : 'gray'}>
                {isMapReady ? '연결됨' : '로딩'}
              </Badge>
            </div>

            {mapErrorMessage ? (
              <div className="flex h-[420px] items-center justify-center rounded-2xl border border-red-100 bg-red-50 text-center">
                <div>
                  <p className="font-bold text-red-700">지도 로드 실패</p>
                  <p className="mt-2 text-sm text-red-600">{mapErrorMessage}</p>
                </div>
              </div>
            ) : (
              <div
                ref={mapContainerRef}
                className="h-[420px] overflow-hidden rounded-2xl border border-slate-200 bg-slate-100"
              />
            )}
          </Card>

          {/* Pharmacy detail card */}
          <Card className="flex-1">
            <h2 className="text-base font-bold text-slate-900">약국 상세</h2>

            {!selectedHpid ? (
              <div className="mt-4 flex flex-col items-center justify-center py-10 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400">
                    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
                    <circle cx="12" cy="10" r="3"/>
                  </svg>
                </div>
                <p className="mt-3 text-sm font-semibold text-slate-700">약국을 선택하세요</p>
                <p className="mt-1 text-xs text-slate-400">지도 마커나 왼쪽 목록에서 약국을 선택하면<br />상세 정보가 여기에 표시됩니다.</p>
              </div>
            ) : isDetailLoading ? (
              <div className="mt-4 rounded-2xl bg-slate-50 px-4 py-8 text-center text-sm text-slate-400">
                약국 상세 정보를 불러오는 중입니다…
              </div>
            ) : isDetailError || !selectedPharmacy ? (
              <div className="mt-4 rounded-2xl border border-red-100 bg-red-50 px-4 py-8 text-center text-sm text-red-500">
                약국 상세 정보를 불러오지 못했습니다.
              </div>
            ) : (
              <div className="mt-4 space-y-5">

                {/* Pharmacy header */}
                <div>
                  <h3 className="text-xl font-bold text-slate-900">
                    {getPharmacyName(selectedPharmacy)}
                  </h3>

                  <div className="mt-3 space-y-1.5 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3.5">
                    <div className="flex items-start gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 shrink-0 text-slate-400"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
                      <p className="text-sm text-slate-600">{getPharmacyAddress(selectedPharmacy)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-slate-400"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.99 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.92 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                      <p className="text-sm text-slate-600">{getPharmacyPhone(selectedPharmacy)}</p>
                    </div>
                  </div>
                </div>

                {/* Description */}
                {(selectedPharmacy.description || selectedPharmacy.extraInfo) && (
                  <div className="rounded-2xl bg-blue-50 px-4 py-3.5">
                    {selectedPharmacy.description && (
                      <p className="text-sm leading-6 text-blue-700">{selectedPharmacy.description}</p>
                    )}
                    {selectedPharmacy.extraInfo && (
                      <p className="mt-1.5 text-sm text-blue-600">{selectedPharmacy.extraInfo}</p>
                    )}
                  </div>
                )}

                {/* Business hours */}
                <div>
                  <p className="mb-3 text-sm font-bold text-slate-900">영업시간</p>
                  <div className="grid gap-1.5 sm:grid-cols-2">
                    {getBusinessHours(selectedPharmacy).map((hour) => (
                      <div
                        key={hour.label}
                        className="flex items-center justify-between rounded-xl bg-slate-50 px-3.5 py-2.5 text-sm"
                      >
                        <span className="font-semibold text-slate-700">{hour.label}</span>
                        <span className={hour.hasInfo ? 'text-slate-600' : 'text-slate-400'}>
                          {hour.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            )}
          </Card>
        </div>

      </div>
    </div>
  );
}

export default MapPage;
