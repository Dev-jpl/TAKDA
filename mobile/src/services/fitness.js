import { Platform } from 'react-native';
import { supabase } from './supabase';
import { API_URL } from './apiConfig';

let AppleHealthKit = null;
let HealthConnect = null;

if (Platform.OS === 'ios') {
  try {
    AppleHealthKit = require('react-native-health').default;
  } catch (e) {
    console.warn('AppleHealthKit not available:', e);
  }
} else if (Platform.OS === 'android') {
  try {
    HealthConnect = require('react-native-health-connect');
  } catch (e) {
    console.warn('HealthConnect not available:', e);
  }
}

const EMPTY_STATS = { steps: 0, distance: 0, calories: 0, heartRate: null };

function hkGet(fn, options) {
  return new Promise((resolve) => fn(options, (err, res) => resolve(err ? null : res)));
}

export const fitnessService = {
  async requestPermissions() {
    if (Platform.OS === 'ios') {
      if (!AppleHealthKit) throw new Error('HealthKit is not available. Make sure you are running a real device build.');
      const permissions = {
        permissions: {
          read: [
            AppleHealthKit.Constants.Permissions.Steps,
            AppleHealthKit.Constants.Permissions.DistanceWalkingRunning,
            AppleHealthKit.Constants.Permissions.ActiveEnergyBurned,
            AppleHealthKit.Constants.Permissions.HeartRate,
          ],
        },
      };
      return new Promise((resolve, reject) => {
        AppleHealthKit.initHealthKit(permissions, (error) => {
          if (error) reject(new Error(error));
          else resolve(true);
        });
      });
    }

    if (Platform.OS === 'android') {
      if (!HealthConnect) throw new Error('Health Connect is not available. Make sure you are running a real device build.');
      const isAvailable = await HealthConnect.isAvailable();
      if (!isAvailable) throw new Error('Health Connect is not installed on this device. Please install it from the Play Store.');
      await HealthConnect.requestPermission([
        { accessType: 'read', recordType: 'Steps' },
        { accessType: 'read', recordType: 'ActiveCaloriesBurned' },
        { accessType: 'read', recordType: 'Distance' },
        { accessType: 'read', recordType: 'HeartRate' },
      ]);
      return true;
    }

    throw new Error('Fitness tracking is not supported on this platform.');
  },

  async getTodayStats() {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();

    if (Platform.OS === 'ios' && AppleHealthKit) {
      const options = { date: startOfDay };
      const [steps, distance, calories] = await Promise.all([
        hkGet(AppleHealthKit.getStepCount.bind(AppleHealthKit), options),
        hkGet(AppleHealthKit.getDistanceWalkingRunning.bind(AppleHealthKit), options),
        hkGet(AppleHealthKit.getActiveEnergyBurned.bind(AppleHealthKit), options),
      ]);
      return {
        steps: steps?.value ?? 0,
        distance: distance?.value ?? 0,
        calories: calories?.value ?? 0,
        heartRate: null,
      };
    }

    if (Platform.OS === 'android' && HealthConnect) {
      try {
        const timeRangeFilter = { operator: 'between', startTime: startOfDay, endTime: now.toISOString() };
        const [steps, calories, distance] = await Promise.all([
          HealthConnect.readRecords('Steps', { timeRangeFilter }),
          HealthConnect.readRecords('ActiveCaloriesBurned', { timeRangeFilter }),
          HealthConnect.readRecords('Distance', { timeRangeFilter }),
        ]);
        return {
          steps: steps.reduce((s, r) => s + (r.count || 0), 0),
          calories: calories.reduce((s, r) => s + (r.energy?.inKilocalories || 0), 0),
          distance: distance.reduce((s, r) => s + (r.distance?.inMeters || 0), 0),
          heartRate: null,
        };
      } catch (e) {
        console.error('[Fitness] Android fetch error:', e);
        return EMPTY_STATS;
      }
    }

    return EMPTY_STATS;
  },

  async syncWithBackend(userId) {
    try {
      const stats = await this.getTodayStats();
      const payload = {
        user_id: userId,
        data: [{
          date: new Date().toISOString().split('T')[0],
          steps: stats.steps,
          calories_burned: stats.calories,
          distance_meters: stats.distance,
          avg_heart_rate: stats.heartRate,
        }],
      };
      const response = await fetch(`${API_URL}/fitness/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      return await response.json();
    } catch (e) {
      console.warn('[Fitness] Sync failed:', e);
      return { status: 'error', message: e.message };
    }
  },

  async getSummary(userId, days = 7) {
    try {
      const response = await fetch(`${API_URL}/fitness/summary?user_id=${userId}&days=${days}`);
      const result = await response.json();
      return result.data || [];
    } catch (e) {
      console.warn('[Fitness] Fetch summary failed:', e);
      return [];
    }
  },
};
