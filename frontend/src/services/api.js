/**
 * api.js — Centralised Axios API service
 *
 * All HTTP calls to the Flask backend go through this module.
 */

import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://127.0.0.1:5000',
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
})
/**
 * Call once on login to tag all subsequent write requests with the user's role.
 * Flask reads X-User-Role for audit logging and permission checks.
 */
export const setAuthRole = (role) => {
  api.defaults.headers.common['X-User-Role'] = role || 'system'
}

/* ------------- Inventory ------------------------------------------------- */

export const getInventory        = (category = 'All') =>
  api.get('/api/inventory', { params: { category } })

export const searchInventory     = (q) =>
  api.get('/api/inventory/search', { params: { q } })

export const updateInventoryItem = (id, patch) => api.put(`/api/inventory/${id}`, patch)
export const createInventoryItem = (data)      => api.post('/api/inventory', data)
export const deleteInventoryItem = (id)        => api.delete(`/api/inventory/${id}`)

/* ------------- Clients --------------------------------------------------- */

export const getClients   = ()           => api.get('/api/clients')
export const updateClient = (id, patch)  => api.put(`/api/clients/${id}`, patch)
export const createClient = (data)       => api.post('/api/clients', data)

/* ------------- Service Orders -------------------------------------------- */

export const getOrders         = (status = 'All') =>
  api.get('/api/orders', { params: { status } })

export const updateOrderStatus = (id, status) => api.put(`/api/orders/${id}`, { status })
export const createOrder       = (data)       => api.post('/api/orders', data)

/* ------------- Maintenance Schedules ------------------------------------- */

export const getMaintenance    = ()     => api.get('/api/maintenance')
export const createMaintenance = (data) => api.post('/api/maintenance', data)

/* ------------- Invoice generation ---------------------------------------- */

export const generateInvoice = (orderId) =>
  api.post('/api/generate-invoice', { order_id: orderId })

/* ------------- Audit Logs ------------------------------------------------ */

export const getAuditLogs = (filters = {}) =>
  api.get('/api/audit-logs', { params: filters })

export default api
