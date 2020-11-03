"use strict";
/**
 * @ author: richen
 * @ copyright: Copyright (c) - <richenlin(at)gmail.com>
 * @ license: MIT
 * @ version: 2020-06-05 09:40:35
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.Locker = void 0;
const tslib_1 = require("tslib");
const store = require("think_store");
const crypto = tslib_1.__importStar(require("crypto"));
const think_logger_1 = tslib_1.__importDefault(require("think_logger"));
/**
 * Wait for a period of time (ms)
 *
 * @param {number} ms
 * @returns
 */
const delay = function (ms) {
    return new Promise((resolve) => setTimeout(() => resolve(), 1000));
};
class Locker {
    /**
     * Creates an instance of Locker.
     * @param {RedisOptions} options
     * @memberof Locker
     */
    constructor(options) {
        this.lockMap = new Map();
        this.options = {
            type: "redis",
            key_prefix: options.key_prefix || '',
            host: options.host || '127.0.0.1',
            port: options.port || 6379,
            password: options.password || '',
            db: options.db || '2',
            conn_timeout: 1000
        };
        this.store = store.getInstance(this.options);
        this.client = null;
    }
    /**
     *
     *
     * @static
     * @param {RedisOptions} options
     * @param {boolean} [force=false]
     * @returns
     * @memberof Locker
     */
    static getInstance(options, force = false) {
        if (!this.instance || force) {
            this.instance = new Locker(options);
        }
        return this.instance;
    }
    /**
     *
     *
     * @returns
     * @memberof Locker
     */
    async defineCommand() {
        try {
            if (!this.client || !this.client.lua_unlock) {
                //Lua scripts execute atomically
                this.client = await this.store.command('lua_unlock', {
                    numberOfKeys: 1,
                    lua: `
                    local remote_value = redis.call("get",KEYS[1])
                    
                    if (not remote_value) then
                        return 0
                    elseif (remote_value == ARGV[1]) then
                        return redis.call("del",KEYS[1])
                    else
                        return -1
                    end
                `
                });
            }
            return this.client;
        }
        catch (e) {
            think_logger_1.default.error(e);
            return null;
        }
    }
    /**
     * Get a locker.
     *
     * @param {string} key
     * @param {number} [expire=10000]
     * @returns
     * @memberof Locker
     */
    async lock(key, expire = 10000) {
        try {
            const client = await this.defineCommand();
            key = `${this.options.key_prefix}${key}`;
            const value = crypto.randomBytes(16).toString('hex');
            const result = await client.set(key, value, 'NX', 'PX', expire);
            if (result === null) {
                think_logger_1.default.error('lock error: key already exists');
                return false;
            }
            this.lockMap.set(key, { value, expire, time: Date.now() });
            return true;
        }
        catch (e) {
            think_logger_1.default.error(e);
            return false;
        }
    }
    /**
     * Get a locker.
     * Attempts to lock once every interval time, and fails when return time exceeds waitTime
     *
     * @param {string} key
     * @param {number} expire
     * @param {number} [interval=500]
     * @param {number} [waitTime=5000]
     * @returns
     * @memberof Locker
     */
    async waitLock(key, expire, interval = 50, waitTime = 15000) {
        try {
            const start_time = Date.now();
            let result;
            while ((Date.now() - start_time) < waitTime) {
                result = await this.lock(key, expire).catch((err) => {
                    think_logger_1.default.error(err.stack || err.message);
                });
                if (result) {
                    return true;
                }
                else {
                    await delay(interval);
                }
            }
            think_logger_1.default.error('waitLock timeout');
            return false;
        }
        catch (e) {
            think_logger_1.default.error(e);
            return false;
        }
    }
    /**
     * Release lock.
     * Regardless of whether the key exists and the unlock is successful, no error will be thrown (except for network reasons).
     *
     * The specific return value is:
     *
     * null: key does not exist locally
     *
     * 0: key does not exist on redis
     *
     * 1: unlocked successfully
     *
     * -1: value does not correspond and cannot be unlocked
     *
     * @param {*} key
     * @returns
     * @memberof Locker
     */
    async unLock(key) {
        try {
            const client = await this.defineCommand();
            key = `${this.options.key_prefix}${key}`;
            if (!this.lockMap.has(key)) {
                return null;
            }
            const { value } = this.lockMap.get(key);
            await client.lua_unlock(key, value);
            this.lockMap.delete(key);
            return true;
        }
        catch (e) {
            think_logger_1.default.error(e);
            return false;
        }
    }
}
exports.Locker = Locker;
//# sourceMappingURL=locker.js.map