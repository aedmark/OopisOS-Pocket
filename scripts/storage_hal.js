// scripts/storage_hal.js

/**
 * Defines the contract for all storage backends in OopisOS.
 * This is the official charter. Any class that handles the low-level
 * saving and loading of data MUST implement all of these methods.
 * It's a system of rules that keeps our government honest and predictable.
 */
class StorageHAL {
    constructor(dependencies = {}) {
        this.dependencies = dependencies;
    }

    /**
     * Injects the master dependency object into the manager.
     * @param {object} dependencies - The master dependency object.
     */
    setDependencies(dependencies) {
        this.dependencies = { ...this.dependencies, ...dependencies };
    }

    /**
     * Initializes the storage backend, connecting to databases if necessary.
     * @returns {Promise<void>}
     */
    async init() {
        throw new Error("StorageHAL.init() must be implemented by the concrete class.");
    }

    /**
     * Retrieves an item from storage.
     * @param {string} key - The unique identifier for the item.
     * @returns {Promise<any>} A promise that resolves with the stored value, or null if not found.
     */
    async getItem(key) {
        throw new Error("StorageHAL.getItem() must be implemented by the concrete class.");
    }

    /**
     * Saves an item to storage.
     * @param {string} key - The unique identifier for the item.
     * @param {any} value - The data to save.
     * @returns {Promise<boolean>} A promise that resolves to true on success, false on failure.
     */
    async setItem(key, value) {
        throw new Error("StorageHAL.setItem() must be implemented by the concrete class.");
    }

    /**
     * Removes an item from storage.
     * @param {string} key - The unique identifier for the item.
     * @returns {Promise<boolean>} A promise that resolves to true on success, false on failure.
     */
    async removeItem(key) {
        throw new Error("StorageHAL.removeItem() must be implemented by the concrete class.");
    }

    /**
     * Completely clears all data managed by this storage backend.
     * @returns {Promise<void>}
     */
    async clear() {
        throw new Error("StorageHAL.clear() must be implemented by the concrete class.");
    }
}

/**
 * The primary, default implementation of the StorageHAL.
 * This class is the workhorse. It understands that our OS uses two types of storage:
 * 1. IndexedDB: A robust database for our complex filesystem.
 * 2. LocalStorage: A simple key-value store for everything else (like aliases and command history).
 *
 * This HAL's job is to intelligently route every request to the correct storage system
 * so that no other part of the OS has to worry about these details.
 */
class DefaultStorageHAL extends StorageHAL {
    constructor(dependencies) {
        super(dependencies);
    }

    /**
     * Initializes the IndexedDB connection, which is the only part that needs async setup.
     */
    async init() {
        await this.dependencies.IndexedDBManager.init();
        console.log("DefaultStorageHAL initialized.");
    }

    /**
     * Retrieves an item, checking if it's the filesystem or something else.
     */
    async getItem(key) {
        const { Config, IndexedDBManager, StorageManager } = this.dependencies;

        // If the key is for our main filesystem, we use the powerful IndexedDB.
        if (key === Config.DATABASE.UNIFIED_FS_KEY) {
            return new Promise(resolve => {
                const db = IndexedDBManager.getDbInstance();
                if (!db) {
                    console.error("IndexedDB not available.");
                    resolve(null);
                    return;
                }
                const transaction = db.transaction([Config.DATABASE.FS_STORE_NAME], "readonly");
                const store = transaction.objectStore(Config.DATABASE.FS_STORE_NAME);
                const request = store.get(key);

                request.onsuccess = event => resolve(event.target.result ? event.target.result.data : null);
                request.onerror = event => {
                    console.error("HAL: Error getting item from IndexedDB:", event.target.error);
                    resolve(null);
                };
            });
        } else {
            // For everything else (aliases, history, etc.), we use simple LocalStorage.
            const value = StorageManager.loadItem(key);
            return Promise.resolve(value);
        }
    }

    /**
     * Saves an item, routing it to the correct storage backend.
     */
    async setItem(key, value) {
        const { Config, IndexedDBManager, StorageManager } = this.dependencies;

        if (key === Config.DATABASE.UNIFIED_FS_KEY) {
            return new Promise(resolve => {
                const db = IndexedDBManager.getDbInstance();
                if (!db) {
                    console.error("IndexedDB not available.");
                    resolve(false);
                    return;
                }
                const transaction = db.transaction([Config.DATABASE.FS_STORE_NAME], "readwrite");
                const store = transaction.objectStore(Config.DATABASE.FS_STORE_NAME);
                const request = store.put({ id: key, data: value });

                request.onsuccess = () => resolve(true);
                request.onerror = event => {
                    console.error("HAL: Error setting item in IndexedDB:", event.target.error);
                    resolve(false);
                };
            });
        } else {
            StorageManager.saveItem(key, value);
            return Promise.resolve(true);
        }
    }

    /**
     * Removes an item from the appropriate storage.
     */
    async removeItem(key) {
        const { Config, IndexedDBManager, StorageManager } = this.dependencies;

        if (key === Config.DATABASE.UNIFIED_FS_KEY) {
            return new Promise(resolve => {
                const db = IndexedDBManager.getDbInstance();
                if (!db) {
                    console.error("IndexedDB not available.");
                    resolve(false);
                    return;
                }
                const transaction = db.transaction([Config.DATABASE.FS_STORE_NAME], "readwrite");
                const store = transaction.objectStore(Config.DATABASE.FS_STORE_NAME);
                const request = store.delete(key);

                request.onsuccess = () => resolve(true);
                request.onerror = event => {
                    console.error("HAL: Error removing item from IndexedDB:", event.target.error);
                    resolve(false);
                };
            });
        } else {
            StorageManager.removeItem(key);
            return Promise.resolve(true);
        }
    }

    /**
     * Wipes all OS-related data from both storage systems. A powerful and dangerous tool.
     */
    async clear() {
        const { StorageManager, IndexedDBManager, Config } = this.dependencies;

        // 1. Clear all localStorage items that belong to our OS.
        const allKeys = StorageManager.getAllLocalStorageKeys();
        allKeys.forEach(key => {
            // We use a prefix defined in our config to identify our data.
            if (key.startsWith(Config.STORAGE.LOCAL_STORAGE_PREFIX)) {
                StorageManager.removeItem(key);
            }
        });

        // 2. Clear the entire IndexedDB object store used for the filesystem.
        await IndexedDBManager.clearAllFS();

        console.log("HAL: All OopisOS storage has been cleared.");
    }
}