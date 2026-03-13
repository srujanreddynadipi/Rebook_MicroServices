import axiosInstance from './axiosInstance';

const AI_BASE = '/api/ai';
const AI_ENABLED = import.meta.env.VITE_ENABLE_AI === 'true';
const AI_UNAVAILABLE_STATUS = {
  indexed: false,
  status: 'UNAVAILABLE',
};

/**
 * Ask a question about a book (AI Q&A)
 * @param {string} bookId - Book ID
 * @param {string} question - User's question
 * @returns {Promise<{answer: string}>}
 */
export const askAboutBook = (bookId, question) =>
  AI_ENABLED
    ? axiosInstance.post(`${AI_BASE}/ask`, { bookId, question }).then((res) => res.data)
    : Promise.resolve({ answer: 'AI Q&A is not enabled in this environment.' });

/**
 * Check if a book is indexed for AI analysis
 * @param {string} bookId - Book ID
 * @returns {Promise<{indexed: boolean, status: string}>}
 */
export const getBookAiStatus = (bookId) =>
  AI_ENABLED
    ? axiosInstance
        .get(`${AI_BASE}/books/${bookId}/status`)
        .then((res) => res.data)
        .catch((error) => {
          if (error?.response?.status === 404) {
            return AI_UNAVAILABLE_STATUS;
          }
          throw error;
        })
    : Promise.resolve(AI_UNAVAILABLE_STATUS);
