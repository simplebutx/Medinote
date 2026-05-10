import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
})

export const refreshMedicines = async () => {
  const response = await api.post('/medicines/refresh')
  return response.data
}

export default api
