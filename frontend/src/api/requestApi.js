import axiosInstance from './axiosInstance';

const REQUESTS_BASE = '/api/requests';
const REVIEWS_BASE = '/api/reviews';

/**
 * Create a new request (donation or lending)
 * @param {object} data - { bookId, requestType, noOfWeeks }
 * @returns {Promise<RequestResponse>}
 */
export const createRequest = (data) =>
  axiosInstance.post(REQUESTS_BASE, data).then((res) => res.data);

/**
 * Get user's sent requests with pagination
 * @param {object} params - { page, size, status }
 * @returns {Promise<RequestPage>}
 */
export const getSentRequests = (params = {}) => {
  const queryString = new URLSearchParams(params).toString();
  return axiosInstance
    .get(`${REQUESTS_BASE}/sent${queryString ? '?' + queryString : ''}`)
    .then((res) => res.data);
};

/**
 * Get user's received requests (as book owner) with pagination
 * @param {object} params - { page, size, status }
 * @returns {Promise<RequestPage>}
 */
export const getReceivedRequests = (params = {}) => {
  const queryString = new URLSearchParams(params).toString();
  return axiosInstance
    .get(`${REQUESTS_BASE}/received${queryString ? '?' + queryString : ''}`)
    .then((res) => res.data);
};

/**
 * Approve a request (owner action)
 * @param {string} id - Request ID
 * @returns {Promise<RequestResponse>}
 */
export const approveRequest = (id) =>
  axiosInstance.put(`${REQUESTS_BASE}/${id}/approve`, {}).then((res) => res.data);

/**
 * Reject a request (owner action)
 * @param {string} id - Request ID
 * @returns {Promise<RequestResponse>}
 */
export const rejectRequest = (id) =>
  axiosInstance.put(`${REQUESTS_BASE}/${id}/reject`, {}).then((res) => res.data);

/**
 * Cancel a request (requester action)
 * @param {string} id - Request ID
 * @returns {Promise<RequestResponse>}
 */
export const cancelRequest = (id) =>
  axiosInstance.put(`${REQUESTS_BASE}/${id}/cancel`, {}).then((res) => res.data);

/**
 * Update return status for a lending request
 * @param {string} id - Request ID
 * @param {object} data - { returnStatus: 'RETURNED' | 'NOT_RETURNED' }
 * @returns {Promise<RequestResponse>}
 */
export const updateReturnStatus = (id, data) =>
  axiosInstance.put(`${REQUESTS_BASE}/${id}/return-status`, data).then((res) => res.data);

/**
 * Create a review after request completion
 * @param {object} data - { requestId, rating, comment }
 * @returns {Promise<ReviewResponse>}
 */
export const createReview = (data) =>
  axiosInstance.post(REVIEWS_BASE, data).then((res) => res.data);
