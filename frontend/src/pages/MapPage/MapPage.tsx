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

function MapPage() {
  const [selectedHpid, setSelectedHpid] = useState('');
  const [medicineKeyword, setMedicineKeyword] = useState('');
  const [committedMedicineKeyword, setCommittedMedicineKeyword] = useState('');
  const [selectedMedicineName, setSelectedMedicineName] = useState('');

  const debouncedMedicineKeyword = useDebounce(medicineKeyword, 300);

  const isMedicineSuggestEnabled =
    debouncedMedicineKeyword.trim().length >= 2 &&
    !committedMedicineKeyword;

  const isMedicineSearchEnabled = committedMedicineKeyword.trim().length >= 2;

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
    medicineKeyword.trim().length >= 2 && !selectedMedicineName;

  const [bounds, setBounds] = useState(DEFAULT_BOUNDS);

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<KakaoMap | null>(null);
  const markerRefs = useRef<KakaoMarker[]>([]);

  const [isMapReady, setIsMapReady] = useState(false);
  const [mapErrorMessage, setMapErrorMessage] = useState('');

  const isMedicineSearchMode = committedMedicineKeyword.trim().length >= 2;

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
    return isMedicineSearchMode
      ? medicineSearchPharmacies
      : pharmaciesInBounds;
  }, [isMedicineSearchMode, medicineSearchPharmacies, pharmaciesInBounds]);

  const selectedPharmacyFromList = useMemo(() => {
    return pharmacies.find((pharmacy) => getPharmacyHpid(pharmacy) === selectedHpid);
  }, [pharmacies, selectedHpid]);

  const {
    data: selectedPharmacyDetail,
    isLoading: isDetailLoading,
    isError: isDetailError,
  } = usePharmacyDetail(selectedHpid);

  const selectedPharmacy = selectedPharmacyDetail ?? selectedPharmacyFromList;

  const isListLoading = isMedicineSearchMode
    ? isMedicineSearchLoading
    : isPharmaciesLoading;

  const isListError = isMedicineSearchMode
    ? isMedicineSearchError
    : isPharmaciesError;

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

  const handleResetSearch = () => {
    setMedicineKeyword('');
    setCommittedMedicineKeyword('');
    setSelectedMedicineName('');
    setSelectedHpid('');
  };

  const handleSelectPharmacy = (pharmacy: Pharmacy) => {
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
      const kakao = window.kakao;
      const position = new kakao.maps.LatLng(latitude, longitude);

      mapRef.current.panTo(position);
    }
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
          {isMedicineSearchMode ? '약 재고 검색' : '지도 범위 조회'}
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
            <h2 className="text-xl font-bold text-slate-900">약국 검색</h2>

            <p className="mt-1 text-sm text-slate-500">
              약 이름을 입력하면 해당 약 재고를 보유한 약국을 검색합니다.
            </p>

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
                        {isMedicineSuggestLoading && !committedMedicineKeyword && (
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
                              onClick={() => handleSelectMedicineKeyword(suggestion)}
                              className="block w-full px-4 py-3 text-left transition hover:bg-blue-50"
                            >
                              <p className="font-semibold text-slate-900">{suggestion}</p>
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
                            const itemSeq = getMedicineId(medicine) || String(index + 1);
                            const itemName = getMedicineName(medicine);
                            const companyName = getMedicineCompanyName(medicine);

                            return (
                              <button
                                key={`${itemSeq}-${itemName}`}
                                type="button"
                                onClick={() => handleSelectMedicine(medicine)}
                                className="block w-full px-4 py-3 text-left transition hover:bg-blue-50"
                              >
                                <p className="font-semibold text-slate-900">{itemName}</p>

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
                정확도를 높이려면 검색어 제안에서 약을 선택한 뒤 약국을 검색해주세요.
              </p>
            </div>

            {isMedicineSearchMode && (
              <div className="mt-3 flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                <p className="text-sm text-slate-600">
                  검색어:{' '}
                  <span className="font-bold text-slate-900">
                    {selectedMedicineName || committedMedicineKeyword}
                  </span>
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

          <Card>
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-slate-900">약국 목록</h2>
                <p className="mt-1 text-sm text-slate-500">
                  약국을 선택하면 상세 정보를 확인할 수 있습니다.
                </p>
              </div>

              <Badge variant="blue">{pharmacies.length}곳</Badge>
            </div>

            <div className="mt-4 max-h-[560px] space-y-3 overflow-y-auto pr-1">
              {isListError ? (
                <div className="rounded-2xl bg-red-50 p-5 text-center text-sm text-red-600">
                  약국 목록을 불러오지 못했습니다.
                </div>
              ) : isListLoading ? (
                <div className="rounded-2xl bg-slate-50 p-5 text-center text-sm text-slate-500">
                  약국 목록을 불러오는 중입니다.
                </div>
              ) : pharmacies.length === 0 ? (
                <div className="rounded-2xl bg-slate-50 p-5 text-center text-sm text-slate-500">
                  {isMedicineSearchMode
                    ? '해당 약을 보유한 약국을 찾지 못했습니다. 약 검색에서 표시되는 정확한 품목명으로 다시 검색해보세요.'
                    : '조회된 약국이 없습니다.'}
                </div>
              ) : (
                pharmacies.map((pharmacy) => {
                  const hpid = getPharmacyHpid(pharmacy);
                  const isSelected = selectedHpid === hpid;

                  return (
                    <button
                      key={hpid}
                      type="button"
                      onClick={() => handleSelectPharmacy(pharmacy)}
                      className={[
                        'block w-full rounded-2xl border p-4 text-left transition',
                        isSelected
                          ? 'border-blue-300 bg-blue-50'
                          : 'border-slate-200 bg-white hover:bg-slate-50',
                      ].join(' ')}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-bold text-slate-900">
                            {getPharmacyName(pharmacy)}
                          </p>

                          <p className="mt-2 text-sm leading-5 text-slate-500">
                            {getPharmacyAddress(pharmacy)}
                          </p>

                          <p className="mt-1 text-xs text-slate-400">
                            {getPharmacyPhone(pharmacy)}
                          </p>
                        </div>

                        <Badge variant={isSelected ? 'blue' : 'gray'}>
                          선택
                        </Badge>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="min-h-[420px]">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-slate-900">약국 지도</h2>
                <p className="mt-1 text-sm text-slate-500">
                  지도를 이동하면 현재 화면 범위의 약국 목록을 다시 조회합니다.
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
          </Card>

          <Card>
            <h2 className="text-xl font-bold text-slate-900">약국 상세</h2>

            {!selectedHpid ? (
              <div className="mt-4 rounded-2xl bg-slate-50 p-8 text-center text-sm text-slate-500">
                왼쪽 목록에서 약국을 선택해주세요.
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

                <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4">
                  <p className="text-sm font-semibold text-amber-800">
                    약국별 전체 재고 조회 API는 아직 없습니다.
                  </p>

                  <p className="mt-1 text-sm text-amber-700">
                    현재는 약 이름 검색으로 해당 약을 보유한 약국을 찾을 수
                    있습니다.
                  </p>
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