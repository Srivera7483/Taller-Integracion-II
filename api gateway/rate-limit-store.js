'use strict';

class RateLimitStore {
    constructor(options = {}) {
        this.continueExceeding = options.continueExceeding ?? false;
        this.exponentialBackoff = options.exponentialBackoff ?? false;
        this.counters = new Map();
        this.cleanupTimer = setInterval(() => this.removeExpiredCounters(), 60_000);
        this.cleanupTimer.unref();
    }

    incr(key, callback, timeWindow, max) {
        const now = Date.now();
        let counter = this.counters.get(key);

        if (!counter || counter.expiresAt <= now) {
            counter = { current: 1, expiresAt: now + timeWindow, iterationStartMs: now };
        } else {
            counter = { ...counter, current: counter.current + 1 };

            if (this.continueExceeding && counter.current > max) {
                counter.iterationStartMs = now;
                counter.expiresAt = now + timeWindow;
            } else if (this.exponentialBackoff && counter.current > max) {
                const backoffExponent = counter.current - max - 1;
                const ttl = timeWindow * (2 ** backoffExponent);
                counter.iterationStartMs = now;
                counter.expiresAt = now + (Number.isSafeInteger(ttl) ? ttl : Number.MAX_SAFE_INTEGER);
            }
        }

        this.counters.set(key, counter);
        callback(null, { current: counter.current, ttl: counter.expiresAt - now });
    }

    read(key, callback, _timeWindow) {
        const counter = this.counters.get(key);
        const now = Date.now();
        if (!counter || counter.expiresAt <= now) {
            callback(null, { current: 0, ttl: 0 });
            return;
        }

        callback(null, { current: counter.current, ttl: counter.expiresAt - now });
    }

    child(options) {
        return new RateLimitStore(options);
    }

    removeExpiredCounters() {
        const now = Date.now();
        for (const [key, counter] of this.counters) {
            if (counter.expiresAt <= now) {
                this.counters.delete(key);
            }
        }
    }
}

module.exports = RateLimitStore;
