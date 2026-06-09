import { medicationInstance } from '../../../api/axiosInstance';

import type {
  Pharmacy,
  PharmacyInventory,
  PharmacyInventoryRequest,
  PharmacyRegisterRequest,
} from '../types';

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
  const response = await medicationInstance.post<PharmacyInventory>(
    '/api/pharmacist/inventory',
    body,
  );

  return response.data;
};

export const deletePharmacyInventory = async (id: number) => {
  const response = await medicationInstance.delete(
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