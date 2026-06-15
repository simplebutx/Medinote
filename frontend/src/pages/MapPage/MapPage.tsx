import { useEffect, useMemo, useRef, useState } from 'react';

import { Badge, Button, Card, Input } from '../../components/ui';
import { useDebounce } from '../../hooks/useDebounce';
import {
  useMedicineSearch,
  useMedicineSuggest,
} from '../../features/drug/hooks';
import type { MedicineSearchItem } from '../../features/drug/types/drug.types';
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
        window.kakao.maps.load(() => {
          resolve();
        });
        return;
      }

      existingScript.addEventListener('load', () => {
        const kakao = window.kakao;

        if (!kakao?.maps) {
          reject(new Error('Kakao 지도 객체를 찾을 수 없습니다.'));
          return;
        }

        kakao.maps.load(() => {
          resolve();
        });
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

      kakao.maps.load(() => {
        resolve();
      });
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
  }));
}

function getMedicineId(medicine: MedicineSearchItem) {
  return String(medicine.itemSeq ?? medicine.item_seq ?? '');
}

function getMedicineName(medicine: MedicineSearchItem) {
  return (
    medicine.itemName ??
    medicine.item_name ??
    medicine.medicineName ??
    medicine.drugName ??
    '약 이름 없음'
  );
}

function getMedicineCompanyName(medicine: MedicineSearchItem) {
  return (
    medicine.entpName ??
    medicine.entp_name ??
    medicine.companyName ??
    medicine.company_name ??
    ''
  );
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
    !committedMedicineKeyword;

  const isMedicineSearchEnabled =
    searchMode === 'inventory' &&
    committedMedicineKeyword.trim().length >= 2;

  const {
    data: medicineSuggestions = [],
    isLoading: isMedicineSuggestLoading,
  } = useMedicineSuggest(
    isMedicineSuggestEnabled ? debouncedMedicineKeyword : '',
  );

  const {
    data: medicineResults = [],
    isLoading: isMedicineSearchLoadingForDropdown,
    isError: isMedicineSearchErrorForDropdown,
  } = useMedicineSearch(
    isMedicineSearchEnabled ? committedMedicineKeyword : '',
  );

  const shouldShowMedicineDropdown =
    searchMode === 'inventory' &&
    medicineKeyword.trim().length >= 2 && !selectedMedicineName;

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
    setSelectedMedicineName('');
    setSelectedHpid('');
  };

  const handleSelectMedicineKeyword = (keyword: string) => {
    setMedicineKeyword(keyword);
    setCommittedMedicineKeyword(keyword);
    setSelectedMedicineName('');
    setSelectedHpid('');
  };

  const handleSelectMedicine = (medicine: MedicineSearchItem) => {
    const medicineName = getMedicineName(medicine);

    setMedicineKeyword(medicineName);
    setCommittedMedicineKeyword(medicineName);
    setSelectedMedicineName(medicineName);
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
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-blue-600">Nearby Pharmacy</p>

          <h1 className="mt-2 text-3xl font-bold text-slate-900">근처 약국</h1>

          <p className="mt-2 text-slate-500">
            현재 지도 범위의 약국을 확인하고, 약 이름으로 재고 보유 약국을
            검색합니다.
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

      <Card className="border-blue-100 bg-blue-50">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="font-bold text-blue-900">지도 범위 기반 약국 조회</p>
            <p className="mt-1 text-sm text-blue-700">
              Kakao 지도를 이동하거나 확대/축소하면 현재 화면 범위에 포함된
              약국을 다시 조회합니다.
            </p>
          </div>

          <div className="text-xs font-semibold text-blue-700">
            southLat {bounds.southLat.toFixed(4)} · northLat{' '}
            {bounds.northLat.toFixed(4)} · westLng {bounds.westLng.toFixed(4)} ·
            eastLng {bounds.eastLng.toFixed(4)}
          </div>
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-[420px_1fr]">
        <div className="space-y-4">
          <Card>
            <div className="grid grid-cols-2 rounded-xl bg-slate-100 p-1">
              <button
                type="button"
                onClick={() => handleChangeSearchMode('inventory')}
                className={[
                  'rounded-lg px-3 py-2 text-sm font-semibold transition',
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
                  'rounded-lg px-3 py-2 text-sm font-semibold transition',
                  searchMode === 'pharmacy'
                    ? 'bg-white text-blue-700 shadow-sm'
                    : 'text-slate-500 hover:text-slate-900',
                ].join(' ')}
              >
                약국 검색
              </button>
            </div>

            <h2 className="mt-5 text-xl font-bold text-slate-900">
              {searchMode === 'inventory' ? '재고 검색' : '약국 검색'}
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              {searchMode === 'inventory'
                ? '약 이름을 입력하면 해당 약 재고를 보유한 약국을 검색합니다.'
                : '현재 지도 범위에서 약국 이름이나 도로명까지의 주소로 검색합니다.'}
            </p>

            {searchMode === 'inventory' ? (
              <div className="mt-4 space-y-2">
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
                        <div className="px-4 pt-2 pb-1">
                          <p className="text-xs font-semibold text-slate-500">
                            약 검색 결과
                          </p>
                        </div>

                        <div className="max-h-64 overflow-y-auto py-2">
                          {isMedicineSuggestLoading &&
                            !committedMedicineKeyword && (
                              <div className="px-4 py-4 text-sm text-blue-700">
                                약 검색어를 불러오는 중입니다.
                              </div>
                            )}

                          {!committedMedicineKeyword &&
                            !isMedicineSuggestLoading &&
                            medicineSuggestions.length === 0 && (
                              <div className="px-4 py-4 text-sm text-slate-500">
                                검색어 제안이 없습니다.
                              </div>
                            )}

                          {!committedMedicineKeyword &&
                            !isMedicineSuggestLoading &&
                            medicineSuggestions.map((suggestion) => (
                              <button
                                key={suggestion}
                                type="button"
                                onClick={() =>
                                  handleSelectMedicineKeyword(suggestion)
                                }
                                className="block w-full px-4 py-3 text-left transition hover:bg-blue-50"
                              >
                                <p className="font-semibold text-slate-900">
                                  {suggestion}
                                </p>
                                <p className="mt-1 text-xs text-slate-500">
                                  이 검색어로 약 정보 조회
                                </p>
                              </button>
                            ))}

                          {isMedicineSearchLoadingForDropdown && (
                            <div className="px-4 py-4 text-sm text-blue-700">
                              약 정보를 검색하고 있습니다.
                            </div>
                          )}

                          {isMedicineSearchErrorForDropdown && (
                            <div className="px-4 py-4 text-sm text-red-700">
                              약 검색 결과를 불러오지 못했습니다.
                            </div>
                          )}

                          {!isMedicineSearchLoadingForDropdown &&
                            !isMedicineSearchErrorForDropdown &&
                            committedMedicineKeyword &&
                            medicineResults.length === 0 && (
                              <div className="px-4 py-4 text-sm text-slate-500">
                                검색 결과가 없습니다.
                              </div>
                            )}

                          {!isMedicineSearchLoadingForDropdown &&
                            !isMedicineSearchErrorForDropdown &&
                            medicineResults.map((medicine, index) => {
                              const itemSeq =
                                getMedicineId(medicine) || String(index + 1);
                              const itemName = getMedicineName(medicine);
                              const companyName =
                                getMedicineCompanyName(medicine);

                              return (
                                <button
                                  key={`${itemSeq}-${itemName}`}
                                  type="button"
                                  onClick={() => handleSelectMedicine(medicine)}
                                  className="block w-full px-4 py-3 text-left transition hover:bg-blue-50"
                                >
                                  <p className="font-semibold text-slate-900">
                                    {itemName}
                                  </p>

                                  <p className="mt-1 text-xs text-slate-500">
                                    {companyName || '제조사 정보 없음'}
                                  </p>
                                </button>
                              );
                            })}
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

                <p className="text-xs text-slate-500">
                  정확도를 높이려면 검색어 제안에서 약을 선택해주세요.
                </p>
              </div>
            ) : (
              <div className="mt-4 space-y-2">
                <div className="flex gap-2">
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
                    placeholder="예: 중앙약국, 서울특별시 중구 서소문로"
                  />
                  <Button
                    type="button"
                    onClick={handleSearchPharmacy}
                    disabled={pharmacyKeyword.trim().length < 2}
                    className="shrink-0"
                  >
                    검색
                  </Button>
                </div>

                <p className="text-xs text-slate-500">
                  지도를 이동하면 새 지도 범위에서 같은 검색어로 다시
                  필터링됩니다.
                </p>
              </div>
            )}

            {(isMedicineSearchMode || isPharmacySearchMode) && (
              <div className="mt-3 flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                <p className="text-sm text-slate-600">
                  검색어:{' '}
                  <span className="font-bold text-slate-900">
                    {isMedicineSearchMode
                      ? selectedMedicineName || committedMedicineKeyword
                      : committedPharmacyKeyword}
                  </span>
                  {isPharmacySearchMode && (
                    <span className="ml-2 text-xs text-slate-500">
                      {pharmacies.length}곳
                    </span>
                  )}
                </p>

                <button
                  type="button"
                  onClick={handleResetSearch}
                  className="text-sm font-semibold text-blue-600"
                >
                  초기화
                </button>
              </div>
            )}
          </Card>

        </div>

        <div className="space-y-4">
          <Card className="min-h-[420px]">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-slate-900">약국 지도</h2>
                <p className="mt-1 text-sm text-slate-500">
                  지도를 이동하면 현재 화면 범위의 약국 위치를 다시 조회합니다.
                </p>
              </div>

              <Badge variant={isMapReady ? 'green' : 'gray'}>
                {isMapReady ? '지도 연결됨' : '지도 로딩'}
              </Badge>
            </div>

            {mapErrorMessage ? (
              <div className="flex h-[340px] items-center justify-center rounded-3xl border border-red-100 bg-red-50 text-center">
                <div>
                  <p className="font-bold text-red-700">지도 로드 실패</p>
                  <p className="mt-2 text-sm text-red-600">{mapErrorMessage}</p>
                </div>
              </div>
            ) : (
              <div
                ref={mapContainerRef}
                className="h-[340px] overflow-hidden rounded-3xl border border-slate-200 bg-slate-100"
              />
            )}

            {isPharmacyDataLoading && (
              <p className="mt-3 text-sm text-blue-700">
                약국 위치를 불러오는 중입니다.
              </p>
            )}

            {isPharmacyDataError && (
              <p className="mt-3 text-sm text-red-700">
                약국 위치를 불러오지 못했습니다.
              </p>
            )}

            {!isPharmacyDataLoading &&
              !isPharmacyDataError &&
              (isMedicineSearchMode || isPharmacySearchMode) &&
              pharmacies.length === 0 && (
                <p className="mt-3 text-sm text-amber-700">
                  {isMedicineSearchMode
                    ? '현재 지도 범위에서 해당 약 재고를 보유한 약국을 찾지 못했습니다.'
                    : '현재 지도 범위에서 일치하는 약국을 찾지 못했습니다.'}
                </p>
              )}
          </Card>

          <Card>
            <h2 className="text-xl font-bold text-slate-900">약국 상세</h2>

            {!selectedHpid ? (
              <div className="mt-4 rounded-2xl bg-slate-50 p-8 text-center text-sm text-slate-500">
                지도에서 약국 마커를 선택해주세요.
              </div>
            ) : isDetailLoading ? (
              <div className="mt-4 rounded-2xl bg-slate-50 p-8 text-center text-sm text-slate-500">
                약국 상세 정보를 불러오는 중입니다.
              </div>
            ) : isDetailError || !selectedPharmacy ? (
              <div className="mt-4 rounded-2xl bg-red-50 p-8 text-center text-sm text-red-600">
                약국 상세 정보를 불러오지 못했습니다.
              </div>
            ) : (
              <div className="mt-4 space-y-5">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-2xl font-bold text-slate-900">
                      {getPharmacyName(selectedPharmacy)}
                    </h3>

                    <Badge variant="green">영업 정보</Badge>
                  </div>

                  <p className="mt-3 text-sm leading-6 text-slate-600">
                    {getPharmacyAddress(selectedPharmacy)}
                  </p>

                  <p className="mt-1 text-sm text-slate-500">
                    {getPharmacyPhone(selectedPharmacy)}
                  </p>

                  <p className="mt-2 text-xs text-slate-400">
                    HPID: {getPharmacyHpid(selectedPharmacy)}
                  </p>

                  <p className="mt-1 text-xs text-slate-400">
                    위도: {getPharmacyLatitude(selectedPharmacy) ?? '-'} · 경도:{' '}
                    {getPharmacyLongitude(selectedPharmacy) ?? '-'}
                  </p>
                </div>

                {(selectedPharmacy.description ||
                  selectedPharmacy.extraInfo) && (
                  <div className="rounded-2xl bg-slate-50 p-4">
                    {selectedPharmacy.description && (
                      <p className="text-sm text-slate-600">
                        {selectedPharmacy.description}
                      </p>
                    )}

                    {selectedPharmacy.extraInfo && (
                      <p className="mt-2 text-sm text-slate-500">
                        {selectedPharmacy.extraInfo}
                      </p>
                    )}
                  </div>
                )}

                <div>
                  <h4 className="font-bold text-slate-900">영업시간</h4>

                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    {getBusinessHours(selectedPharmacy).map((hour) => (
                      <div
                        key={hour.label}
                        className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-sm"
                      >
                        <span className="font-semibold text-slate-600">
                          {hour.label}
                        </span>

                        <span className="text-slate-500">{hour.value}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4">
                  <p className="text-sm font-semibold text-amber-800">
                    약국별 전체 재고 조회 API는 아직 없습니다.
                  </p>

                  <p className="mt-1 text-sm text-amber-700">
                    현재는 약 이름 검색으로 해당 약을 보유한 약국을 찾을 수
                    있습니다.
                  </p>
                </div> */}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

export default MapPage;
