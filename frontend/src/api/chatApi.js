import axiosInstance from './axiosInstance';

const MESSAGES_BASE = '/api/messages';

/**
 * Send a message
 * @param {object} data - { requestId, content }
 * @returns {Promise<MessageResponse>}
 */
export const sendMessage = (data) =>
  axiosInstance.post(MESSAGES_BASE, data).then((res) => res.data);

/**
 * Get messages for a specific request
 * @param {string} requestId - Request ID
 * @returns {Promise<MessageResponse[]>}
 */
export const getMessages = (requestId) =>
  axiosInstance.get(`${MESSAGES_BASE}/${requestId}`).then((res) => res.data);

/**
 * Get user's inbox (conversation list)
 * @returns {Promise<ConversationResponse[]>}
 */
export const getInbox = () =>
  axiosInstance.get(`${MESSAGES_BASE}/inbox`).then((res) => res.data);

/**
 * Mark messages as read for a request
 * @param {string} requestId - Request ID
 * @returns {Promise<void>}
 */
export const markAsRead = (requestId) =>
  axiosInstance.put(`${MESSAGES_BASE}/${requestId}/read`, {}).then((res) => res.data);
