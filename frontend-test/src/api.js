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

export const sendChatbotMessage = async (message) => {
  const response = await api.post('/chatbot/message', { message }, {
    timeout: 300000,
  })
  return response.data
}

export const suggestMedicines = async (keyword) => {
  const response = await api.post('/medicines/suggest', null, {
    params: { keyword },
    timeout: 300000,
  })
  return response.data
}

export default api
