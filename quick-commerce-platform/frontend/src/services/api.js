import axios from 'axios'

const api = axios.create({ baseURL: '/api', timeout: 8000 })

export const getProducts = (category = 'All') =>
  api.get('/products', { params: category === 'All' ? {} : { category } })

export const searchProducts = (q, category = 'All') =>
  api.get('/products/search', { params: { q, ...(category === 'All' ? {} : { category }) } })

export const getInventory = () => api.get('/inventory/nearby')

export const getCart = (userId) => api.get(`/cart/${encodeURIComponent(userId)}`)

export const addCartItem = (payload) => api.post('/cart/items', payload)

export const updateCartItem = (productId, payload) =>
  api.patch(`/cart/items/${encodeURIComponent(productId)}`, payload)

export const removeCartItem = (productId, userId) =>
  api.delete(`/cart/items/${encodeURIComponent(productId)}`, { params: { userId } })

export const placeOrder = (payload) => api.post('/orders', payload)

export const getDeliveryStatus = (orderId) =>
  api.get(`/orders/${encodeURIComponent(orderId)}/delivery-status`)
