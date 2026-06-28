// Storage utility — works in both uni-app and H5 standalone modes

// Safe uni accessor (undefined in pure H5)
function getUni() {
  return typeof uni !== 'undefined' ? uni : null
}

export const GameStorage = {
  set(key, value) {
    const u = getUni()
    try {
      if (u) {
        u.setStorageSync(key, value)
      } else if (typeof localStorage !== 'undefined') {
        localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value))
      }
    } catch (e) {
      // silent fail
    }
  },

  get(key) {
    const u = getUni()
    try {
      if (u) {
        return u.getStorageSync(key)
      } else if (typeof localStorage !== 'undefined') {
        const raw = localStorage.getItem(key)
        if (!raw) return null
        try { return JSON.parse(raw) } catch { return raw }
      }
      return null
    } catch (e) {
      return null
    }
  },

  // Game-specific helpers (all inline, no external references)
  getCurrentLevel() {
    return this.get('currentLevel')
  },

  saveCurrentLevel(levelId) {
    this.set('currentLevel', levelId)
  },

  getCompletedLevels() {
    const data = this.get('completedLevels')
    if (!data) return []
    return typeof data === 'string' ? data.split(',') : data
  },

  saveCompletedLevels(completedLevels) {
    this.set('completedLevels', completedLevels.join(','))
  },

  markLevelCompleted(levelId) {
    const completed = this.getCompletedLevels()
    if (!completed.includes(levelId)) {
      completed.push(levelId)
      this.saveCompletedLevels(completed)
    }
  }
}
