/**
 * Tests for the offlineCache utility.
 * AsyncStorage is auto-mocked by jest-expo.
 */

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem:    jest.fn().mockResolvedValue(null),
  setItem:    jest.fn().mockResolvedValue(undefined),
  removeItem: jest.fn().mockResolvedValue(undefined),
  getAllKeys:  jest.fn().mockResolvedValue([]),
  multiRemove:jest.fn().mockResolvedValue(undefined),
}))

const AsyncStorage = require('@react-native-async-storage/async-storage')

// Clear module registry before each test so the in-memory cache is fresh
beforeEach(() => {
  jest.resetModules()
  jest.clearAllMocks()
})

test('fetches and caches on first call', async () => {
  const { getCached } = require('../src/services/offlineCache')
  const fetcher = jest.fn().mockResolvedValue([{ id: '1', title: 'Task' }])

  const { data, stale } = await getCached('tasks:hub-1', fetcher)

  expect(fetcher).toHaveBeenCalledTimes(1)
  expect(stale).toBe(false)
  expect(data).toEqual([{ id: '1', title: 'Task' }])
  expect(AsyncStorage.setItem).toHaveBeenCalled()
})

test('returns memory-cached data without calling fetcher on second call', async () => {
  const { getCached } = require('../src/services/offlineCache')
  const fetcher = jest.fn().mockResolvedValue([{ id: '1' }])

  await getCached('tasks:hub-1', fetcher)
  const { data, stale } = await getCached('tasks:hub-1', fetcher)

  expect(fetcher).toHaveBeenCalledTimes(1)   // second call uses memory
  expect(stale).toBe(false)
  expect(data).toEqual([{ id: '1' }])
})

test('invalidate removes key from memory and AsyncStorage', async () => {
  const { getCached, invalidate } = require('../src/services/offlineCache')
  const fetcher = jest.fn().mockResolvedValue([{ id: '1' }])

  await getCached('tasks:hub-1', fetcher)
  await invalidate('tasks:hub-1')

  // Next call should fetch fresh
  const fetcher2 = jest.fn().mockResolvedValue([{ id: '2' }])
  const { data } = await getCached('tasks:hub-1', fetcher2)

  expect(fetcher2).toHaveBeenCalledTimes(1)
  expect(data).toEqual([{ id: '2' }])
  expect(AsyncStorage.removeItem).toHaveBeenCalledWith('takda:cache:tasks:hub-1')
})

test('setCache writes directly without fetching', async () => {
  const { setCache, getCached } = require('../src/services/offlineCache')
  const fetcher = jest.fn()

  await setCache('tasks:hub-1', [{ id: 'manual' }])
  const { data, stale } = await getCached('tasks:hub-1', fetcher)

  expect(fetcher).not.toHaveBeenCalled()
  expect(stale).toBe(false)
  expect(data).toEqual([{ id: 'manual' }])
})

test('invalidatePrefix removes all matching keys', async () => {
  AsyncStorage.getAllKeys.mockResolvedValue([
    'takda:cache:tasks:hub-1',
    'takda:cache:tasks:hub-2',
    'takda:cache:annotations:hub-1',
  ])
  const { invalidatePrefix } = require('../src/services/offlineCache')

  await invalidatePrefix('tasks:')

  expect(AsyncStorage.multiRemove).toHaveBeenCalledWith([
    'takda:cache:tasks:hub-1',
    'takda:cache:tasks:hub-2',
  ])
})
