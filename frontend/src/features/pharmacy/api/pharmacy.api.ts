import axios from 'axios';

import { medicationInstance } from '../../../api/axiosInstance';

import type {
  Pharmacy,
  PharmacyInventory,
  PharmacyInventoryRequest,
  PharmacyRegisterRequest,
  PharmacyBoundsParams,
  PharmacyMedicineSearchParams,
} from '../types';

function isOptionalPharmacySearchError(error: unknown) {
  return axios.isAxiosError(error) && error.response?.status === 500;
}

export const registerPharmacy = async (body: PharmacyRegisterRequest) => {
  const response = await medicationInstance.post<Pharmacy>(
    '/api/pharmacies',
    body,
  );

  return response.data;
};

export const updatePharmacy = async ({
  hpid,
  body,
}: {
  hpid: string;
  body: PharmacyRegisterRequest;
}) => {
  const response = await medicationInstance.patch<Pharmacy>(
    `/api/pharmacies/${hpid}`,
    body,
  );

  return response.data;
};

export const getMyPharmacyInventory = async () => {
  const response = await medicationInstance.get<PharmacyInventory[]>(
    '/api/pharmacist/inventory',
  );

  return response.data;
};

export const upsertPharmacyInventory = async (
  body: PharmacyInventoryRequest,
) => {
  const response = await medicationInstance.post<string>(
    '/api/pharmacist/inventory',
    body,
  );

  return response.data;
};

export const deletePharmacyInventory = async (id: number) => {
  const response = await medicationInstance.delete<string>(
    `/api/pharmacist/inventory/${id}`,
  );

  return response.data;
};

export const getPharmacyDetail = async (hpid: string) => {
  const response = await medicationInstance.get<Pharmacy>(
    `/api/pharmacies/${hpid}`,
  );

  return response.data;
};

export const getPharmaciesInBounds = async ({
  southLat,
  northLat,
  westLng,
  eastLng,
  limit = 30,
}: PharmacyBoundsParams) => {
  const response = await medicationInstance.get<Pharmacy[]>('/api/pharmacies', {
    params: {
      southLat,
      northLat,
      westLng,
      eastLng,
      limit,
    },
  });

  return response.data;
};

export const searchPharmaciesByMedicine = async ({
  keyword,
  southLat,
  northLat,
  westLng,
  eastLng,
  limit = 30,
}: PharmacyMedicineSearchParams) => {
  try {
    const response = await medicationInstance.get<Pharmacy[]>(
      '/api/pharmacies/search/medicine',
      {
        params: {
          keyword,
          southLat,
          northLat,
          westLng,
          eastLng,
          limit,
        },
      },
    );

    return response.data;
  } catch (error) {
    if (isOptionalPharmacySearchError(error)) {
      return [];
    }

    throw error;
  }
};