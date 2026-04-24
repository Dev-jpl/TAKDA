// mobile/src/services/hubStore.js
class HubStore {
  constructor() {
    this.hubs = {}; // Cache by hubId
  }

  setHubData(hubId, data) {
    this.hubs[hubId] = {
      ...data,
      timestamp: Date.now(),
    };
  }

  getHubData(hubId) {
    const data = this.hubs[hubId];
    if (!data) return null;
    
    // Optional: consider data stale after 5 minutes
    const isStale = Date.now() - data.timestamp > 5 * 60 * 1000;
    return { data, isStale };
  }

  clear() {
    this.hubs = {};
  }
}

export const hubStore = new HubStore();
