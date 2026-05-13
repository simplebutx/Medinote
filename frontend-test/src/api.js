import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  timeout: 300000,
})

export const getMedicineSyncStatus = async () => {
  const response = await api.get('/medicines/sync-status')
  return response.data
}

export const syncMedicines = async () => {
  const response = await api.post('/medicines/sync')
  return response.data
}

export default api
