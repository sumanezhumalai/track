import axios from 'axios'

const api = axios.create({
  baseURL: '/egssupport/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      const isLoginRequest = error.config && error.config.url && error.config.url.includes('/auth/login')
      if (!isLoginRequest) {
        localStorage.removeItem('user')
        if (window.location.pathname !== '/egssupport/' && window.location.pathname !== '/') {
          window.location.href = '/egssupport/'
        }
      }
    }
    return Promise.reject(error)
  }
)

export default api
