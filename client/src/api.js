const BASE = '/api';

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || res.statusText);
  }
  return res.json();
}

export const api = {
  getBusinesses: () => request('/businesses'),
  getBusiness: (id) => request(`/businesses/${id}`),
  updateBusiness: (id, data) =>
    request(`/businesses/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  addBusiness: (data) =>
    request('/businesses', { method: 'POST', body: JSON.stringify(data) }),
  deleteBusiness: (id) =>
    request(`/businesses/${id}`, { method: 'DELETE' }),
  getSummary: () => request('/summary'),
  getCategories: () => request('/categories'),
  exportData: () => request('/export', { method: 'POST' }),
};
