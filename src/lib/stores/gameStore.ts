import { load, Store } from '@tauri-apps/plugin-store';

interface StoreValue {
	value: string;
}

class GameStore {
	private store: Store | null = null;
	private static instance: GameStore | null = null;
	private initPromise: Promise<Store> | null = null;

	private constructor() {}

	static async getInstance(): Promise<GameStore> {
		if (!GameStore.instance) {
			GameStore.instance = new GameStore();
			await GameStore.instance.ensureStoreLoaded();
		}
		return GameStore.instance;
	}

	/**
	 * Loads the store if not already loaded.
	 * @returns Promise<Store>
	 */
	private async ensureStoreLoaded(): Promise<Store> {
		if (this.store) return this.store;
		if (this.initPromise) return this.initPromise;

		this.initPromise = this.loadStore();
		try {
			this.store = await this.initPromise;
			return this.store;
		} finally {
			this.initPromise = null;
		}
	}

	/**
	 * Loads the store from the file system.
	 * @returns Promise<Store>
	 */
	private async loadStore(): Promise<Store> {
		return await load('store.json', {
			autoSave: false,
			defaults: {},
		});
	}

	/**
	 * Saves a value to the store.
	 * @param key string - The key to save the value under.
	 * @param value string - The value to save.
	 * @returns Promise<void>
	 */
	async saveValueToStore(key: string, value: string): Promise<void> {
		if (!key?.trim()) throw new Error('Key cannot be empty');
		const store = await this.ensureStoreLoaded();

		await store.set(key, { value: value });
		await store.save();
	}

	/**
	 * Retrieves a value from the store.
	 * @param key string - The key to retrieve the value for.
	 * @returns Promise<string | null>
	 */
	async getValueFromStore(key: string): Promise<string | null> {
		if (!key?.trim()) throw new Error('Key cannot be empty');
		const store = await this.ensureStoreLoaded();
		const storedValue = await store.get<StoreValue>(key);

		return storedValue?.value ?? null;
	}
}

export default GameStore;
