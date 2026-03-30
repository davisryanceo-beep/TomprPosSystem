import { describe, it, expect, vi, beforeEach } from 'vitest';
import { savePendingOrder, getPendingOrders, removePendingOrder, clearAllPendingOrders } from '../../services/offlineStorage';
import { Order, OrderStatus } from '../../types';

// Mock IndexedDB
const mockStore = {
  put: vi.fn().mockReturnValue({ onsuccess: null, onerror: null }),
  getAll: vi.fn().mockReturnValue({ onsuccess: null, onerror: null }),
  delete: vi.fn().mockReturnValue({ onsuccess: null, onerror: null }),
  clear: vi.fn().mockReturnValue({ onsuccess: null, onerror: null }),
};

const mockDb = {
  transaction: vi.fn().mockReturnValue({
    objectStore: () => mockStore,
  }),
  objectStoreNames: {
    contains: vi.fn().mockReturnValue(true),
  },
  createObjectStore: vi.fn(),
};

const mockOpenRequest = {
  onsuccess: null,
  onerror: null,
  onupgradeneeded: null,
  result: mockDb,
};

vi.stubGlobal('indexedDB', {
  open: vi.fn().mockReturnValue(mockOpenRequest),
});

describe('Offline Storage Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockOrder: Order = {
    id: 'test-order-1',
    items: [],
    totalAmount: 10,
    taxAmount: 1,
    finalAmount: 11,
    status: OrderStatus.PAID,
    timestamp: new Date(),
    storeId: 'store-1',
  };

  it('should save a pending order', async () => {
    const promise = savePendingOrder(mockOrder);
    
    // Trigger DB open success
    mockOpenRequest.onsuccess?.({ target: mockOpenRequest } as any);
    
    // Allow time for openDB promise to resolve and transaction to start
    await new Promise(resolve => setTimeout(resolve, 0));
    
    // Trigger onsuccess for put
    mockStore.put.mock.results[0].value.onsuccess();
    
    await expect(promise).resolves.toBeUndefined();
    expect(mockStore.put).toHaveBeenCalledWith(mockOrder);
  });

  it('should get all pending orders', async () => {
    const mockOrders = [mockOrder];
    const promise = getPendingOrders();
    
    mockOpenRequest.onsuccess?.({ target: mockOpenRequest } as any);
    await new Promise(resolve => setTimeout(resolve, 0));
    
    const request = mockStore.getAll.mock.results[0].value;
    request.result = mockOrders;
    request.onsuccess();
    
    const result = await promise;
    expect(result).toEqual(mockOrders);
    expect(mockStore.getAll).toHaveBeenCalled();
  });

  it('should remove a pending order', async () => {
    const promise = removePendingOrder('test-order-1');
    
    mockOpenRequest.onsuccess?.({ target: mockOpenRequest } as any);
    await new Promise(resolve => setTimeout(resolve, 0));
    
    mockStore.delete.mock.results[0].value.onsuccess();
    
    await expect(promise).resolves.toBeUndefined();
    expect(mockStore.delete).toHaveBeenCalledWith('test-order-1');
  });

  it('should clear all pending orders', async () => {
    const promise = clearAllPendingOrders();
    
    mockOpenRequest.onsuccess?.({ target: mockOpenRequest } as any);
    await new Promise(resolve => setTimeout(resolve, 0));
    
    mockStore.clear.mock.results[0].value.onsuccess();
    
    await expect(promise).resolves.toBeUndefined();
    expect(mockStore.clear).toHaveBeenCalled();
  });
});
