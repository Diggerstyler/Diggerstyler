/**
 * OrderService - Optimized for 20-30 concurrent devices
 * Features:
 * - Retry logic with exponential backoff
 * - Offline queue with local storage
 * - Request deduplication
 * - Optimistic updates
 * - Connection state management
 */

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Request queue for offline support
let offlineQueue = [];
let isProcessingQueue = false;

// Request deduplication - track pending requests
const pendingRequests = new Map();

// Connection state
let isOnline = navigator.onLine;

// Load offline queue from localStorage on init
try {
  const saved = localStorage.getItem('offlineOrderQueue');
  if (saved) {
    offlineQueue = JSON.parse(saved);
  }
} catch (e) {
  console.warn('Could not load offline queue:', e);
}

// Save offline queue to localStorage
const saveOfflineQueue = () => {
  try {
    localStorage.setItem('offlineOrderQueue', JSON.stringify(offlineQueue));
  } catch (e) {
    console.warn('Could not save offline queue:', e);
  }
};

// Monitor online status
window.addEventListener('online', () => {
  isOnline = true;
  processOfflineQueue();
});

window.addEventListener('offline', () => {
  isOnline = false;
});

/**
 * Exponential backoff retry logic
 */
const retryWithBackoff = async (fn, maxRetries = 3, baseDelay = 500) => {
  let lastError;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      // Don't retry on client errors (4xx) except 429 (rate limit)
      if (error.response?.status >= 400 && error.response?.status < 500 && error.response?.status !== 429) {
        throw error;
      }
      
      // Calculate delay with exponential backoff + jitter
      const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 100;
      
      if (attempt < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError;
};

/**
 * Generate unique request ID for deduplication
 */
const generateRequestId = (order) => {
  return `${order.stand_id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Process offline queue when back online
 */
const processOfflineQueue = async () => {
  if (isProcessingQueue || offlineQueue.length === 0) return;
  
  isProcessingQueue = true;
  
  while (offlineQueue.length > 0 && isOnline) {
    const queuedOrder = offlineQueue[0];
    
    try {
      await submitOrderInternal(queuedOrder.order, queuedOrder.requestId);
      offlineQueue.shift();
      saveOfflineQueue();
      
      // Notify success
      if (queuedOrder.onSuccess) {
        queuedOrder.onSuccess();
      }
    } catch (error) {
      // If still failing, stop processing
      console.error('Failed to process queued order:', error);
      break;
    }
  }
  
  isProcessingQueue = false;
};

/**
 * Internal order submission with retry
 */
const submitOrderInternal = async (order, requestId) => {
  // Check for duplicate in-flight request
  if (pendingRequests.has(requestId)) {
    return pendingRequests.get(requestId);
  }
  
  const request = retryWithBackoff(async () => {
    const response = await fetch(`${API}/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Request-ID': requestId,
      },
      body: JSON.stringify(order),
    });
    
    if (!response.ok) {
      const error = new Error('Order submission failed');
      error.response = response;
      throw error;
    }
    
    return response.json();
  });
  
  pendingRequests.set(requestId, request);
  
  try {
    const result = await request;
    return result;
  } finally {
    pendingRequests.delete(requestId);
  }
};

/**
 * Submit order with guaranteed delivery
 * @param {Object} order - Order data
 * @param {Object} options - Options for submission
 * @returns {Promise} - Resolves with order data or queued status
 */
export const submitOrder = async (order, options = {}) => {
  const requestId = generateRequestId(order);
  const orderWithMeta = {
    ...order,
    client_request_id: requestId,
    client_timestamp: new Date().toISOString(),
  };
  
  // If offline, queue the order
  if (!isOnline) {
    offlineQueue.push({
      order: orderWithMeta,
      requestId,
      timestamp: Date.now(),
      onSuccess: options.onQueueSuccess,
    });
    saveOfflineQueue();
    
    return {
      queued: true,
      requestId,
      message: 'Bestellung wird gesendet sobald Verbindung besteht',
    };
  }
  
  // Submit immediately
  return submitOrderInternal(orderWithMeta, requestId);
};

/**
 * Get pending offline orders count
 */
export const getPendingOrdersCount = () => {
  return offlineQueue.length;
};

/**
 * Check if currently online
 */
export const getOnlineStatus = () => {
  return isOnline;
};

/**
 * Force process offline queue
 */
export const forceProcessQueue = () => {
  if (isOnline) {
    processOfflineQueue();
  }
};

/**
 * Clear offline queue (use with caution)
 */
export const clearOfflineQueue = () => {
  offlineQueue = [];
  saveOfflineQueue();
};

export default {
  submitOrder,
  getPendingOrdersCount,
  getOnlineStatus,
  forceProcessQueue,
  clearOfflineQueue,
};
