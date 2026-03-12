import axiosInstance from './axiosInstance';

const AI_BASE = '/api/ai';

/**
 * Ask a question about a book (AI Q&A)
 * @param {string} bookId - Book ID
 * @param {string} question - User's question
 * @returns {Promise<{answer: string}>}
 */
export const askAboutBook = (bookId, question) =>
  axiosInstance.post(`${AI_BASE}/ask`, { bookId, question }).then((res) => res.data);

/**
 * Check if a book is indexed for AI analysis
 * @param {string} bookId - Book ID
 * @returns {Promise<{indexed: boolean, status: string}>}
 */
export const getBookAiStatus = (bookId) =>
  axiosInstance.get(`${AI_BASE}/books/${bookId}/status`).then((res) => res.data);
