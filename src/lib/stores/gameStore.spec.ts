import type { Store } from '@tauri-apps/plugin-store';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { load } from '@tauri-apps/plugin-store';
import GameStore from './gameStore';

vi.mock('@tauri-apps/plugin-store', () => ({
	load: vi.fn(),
}));

describe('GameStore', () => {
	let mockStore = {
		set: vi.fn().mockResolvedValue(undefined),
		get: vi.fn().mockResolvedValue(null),
		save: vi.fn().mockResolvedValue(undefined),
		delete: vi.fn().mockResolvedValue(true),
		clear: vi.fn().mockResolvedValue(undefined),
		has: vi.fn().mockResolvedValue(false),
		keys: vi.fn().mockResolvedValue([]),
		values: vi.fn().mockResolvedValue([]),
		entries: vi.fn().mockResolvedValue([]),
		length: vi.fn().mockResolvedValue(0),
		reset: vi.fn().mockResolvedValue(undefined),
		load: vi.fn().mockResolvedValue(undefined),
		close: vi.fn().mockResolvedValue(undefined),
		onKeyChange: vi.fn(),
		onChange: vi.fn(),
		path: '/mock/path/store.json',
	};

	beforeEach(() => {
		// Reset the singleton instance before each test
		// @ts-ignore - Accessing private static property for testing
		GameStore.instance = null;
		mockStore = {
			set: vi.fn().mockResolvedValue(undefined),
			get: vi.fn().mockResolvedValue(null),
			save: vi.fn().mockResolvedValue(undefined),
			delete: vi.fn().mockResolvedValue(true),
			clear: vi.fn().mockResolvedValue(undefined),
			has: vi.fn().mockResolvedValue(false),
			keys: vi.fn().mockResolvedValue([]),
			values: vi.fn().mockResolvedValue([]),
			entries: vi.fn().mockResolvedValue([]),
			length: vi.fn().mockResolvedValue(0),
			reset: vi.fn().mockResolvedValue(undefined),
			load: vi.fn().mockResolvedValue(undefined),
			close: vi.fn().mockResolvedValue(undefined),
			onKeyChange: vi.fn(),
			onChange: vi.fn(),
			path: '/mock/path/store.json',
		};

		vi.mocked(load).mockResolvedValue(mockStore as unknown as Store);
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.resetAllMocks();
		// @ts-ignore
		GameStore.instance = null;
	});

	describe('getInstance', () => {
		it('should create a singleton instance', async () => {
			const instance1 = await GameStore.getInstance();
			const instance2 = await GameStore.getInstance();

			expect(instance1).toBe(instance2);
			expect(load).toHaveBeenCalledTimes(1);
		});

		it('should load the store on first instantiation', async () => {
			await GameStore.getInstance();

			expect(load).toHaveBeenCalledWith('store.json', {
				autoSave: false,
				defaults: {},
			});
		});

		it('should handle concurrent getInstance calls', async () => {
			const [instance1, instance2, instance3] = await Promise.all([
				GameStore.getInstance(),
				GameStore.getInstance(),
				GameStore.getInstance(),
			]);

			expect(instance1).toBe(instance2);
			expect(instance2).toBe(instance3);
			expect(load).toHaveBeenCalledTimes(1);
		});
	});

	describe('saveValueToStore', () => {
		it('should save a value to the store', async () => {
			const instance = await GameStore.getInstance();
			const key = 'testKey';
			const value = 'testValue';

			await instance.saveValueToStore(key, value);

			expect(mockStore.set).toHaveBeenCalledWith(key, { value });
			expect(mockStore.save).toHaveBeenCalledTimes(1);
		});

		it('should throw error for empty key', async () => {
			const instance = await GameStore.getInstance();

			await expect(instance.saveValueToStore('', 'value')).rejects.toThrow('Key cannot be empty');
			expect(mockStore.set).not.toHaveBeenCalled();
		});

		it('should throw error for whitespace-only key', async () => {
			const instance = await GameStore.getInstance();

			await expect(instance.saveValueToStore('   ', 'value')).rejects.toThrow('Key cannot be empty');
			expect(mockStore.set).not.toHaveBeenCalled();
		});

		it('should throw error for null key', async () => {
			const instance = await GameStore.getInstance();

			await expect(instance.saveValueToStore(null as any, 'value')).rejects.toThrow('Key cannot be empty');
		});

		it('should throw error for undefined key', async () => {
			const instance = await GameStore.getInstance();

			await expect(instance.saveValueToStore(undefined as any, 'value')).rejects.toThrow('Key cannot be empty');
		});

		it('should handle empty string values', async () => {
			const instance = await GameStore.getInstance();
			const key = 'testKey';
			const value = '';

			await instance.saveValueToStore(key, value);

			expect(mockStore.set).toHaveBeenCalledWith(key, { value: '' });
			expect(mockStore.save).toHaveBeenCalledTimes(1);
		});

		it('should handle special characters in values', async () => {
			const instance = await GameStore.getInstance();
			const key = 'testKey';
			const value = 'value with spaces & special chars: @#$%';

			await instance.saveValueToStore(key, value);

			expect(mockStore.set).toHaveBeenCalledWith(key, { value });
			expect(mockStore.save).toHaveBeenCalledTimes(1);
		});

		it('should propagate store.set errors', async () => {
			const instance = await GameStore.getInstance();
			const error = new Error('Store set failed');
			vi.mocked(mockStore.set).mockRejectedValueOnce(error);

			await expect(instance.saveValueToStore('key', 'value')).rejects.toThrow('Store set failed');
		});

		it('should propagate store.save errors', async () => {
			const instance = await GameStore.getInstance();
			const error = new Error('Store save failed');
			vi.mocked(mockStore.save).mockRejectedValueOnce(error);

			await expect(instance.saveValueToStore('key', 'value')).rejects.toThrow('Store save failed');
		});
	});

	describe('getValueFromStore', () => {
		it('should retrieve a value from the store', async () => {
			const instance = await GameStore.getInstance();
			const key = 'testKey';
			const expectedValue = 'testValue';

			vi.mocked(mockStore.get).mockResolvedValueOnce({ value: expectedValue });

			const result = await instance.getValueFromStore(key);

			expect(result).toBe(expectedValue);
			expect(mockStore.get).toHaveBeenCalledWith(key);
		});

		it('should return null when key does not exist', async () => {
			const instance = await GameStore.getInstance();
			const key = 'nonexistentKey';

			vi.mocked(mockStore.get).mockResolvedValueOnce(null);

			const result = await instance.getValueFromStore(key);

			expect(result).toBeNull();
			expect(mockStore.get).toHaveBeenCalledWith(key);
		});

		it('should return null when value is undefined', async () => {
			const instance = await GameStore.getInstance();
			const key = 'testKey';

			vi.mocked(mockStore.get).mockResolvedValueOnce(undefined);

			const result = await instance.getValueFromStore(key);

			expect(result).toBeNull();
		});

		it('should return null when stored value does not have value property', async () => {
			const instance = await GameStore.getInstance();
			const key = 'testKey';

			vi.mocked(mockStore.get).mockResolvedValueOnce({} as any);

			const result = await instance.getValueFromStore(key);

			expect(result).toBeNull();
		});

		it('should throw error for empty key', async () => {
			const instance = await GameStore.getInstance();

			await expect(instance.getValueFromStore('')).rejects.toThrow('Key cannot be empty');
			expect(mockStore.get).not.toHaveBeenCalled();
		});

		it('should throw error for whitespace-only key', async () => {
			const instance = await GameStore.getInstance();

			await expect(instance.getValueFromStore('   ')).rejects.toThrow('Key cannot be empty');
			expect(mockStore.get).not.toHaveBeenCalled();
		});

		it('should throw error for null key', async () => {
			const instance = await GameStore.getInstance();

			await expect(instance.getValueFromStore(null as any)).rejects.toThrow('Key cannot be empty');
		});

		it('should throw error for undefined key', async () => {
			const instance = await GameStore.getInstance();

			await expect(instance.getValueFromStore(undefined as any)).rejects.toThrow('Key cannot be empty');
		});

		it('should handle empty string values', async () => {
			const instance = await GameStore.getInstance();
			const key = 'testKey';

			vi.mocked(mockStore.get).mockResolvedValueOnce({ value: '' });

			const result = await instance.getValueFromStore(key);

			expect(result).toBe('');
		});

		it('should propagate store.get errors', async () => {
			const instance = await GameStore.getInstance();
			const error = new Error('Store get failed');
			vi.mocked(mockStore.get).mockRejectedValueOnce(error);

			await expect(instance.getValueFromStore('key')).rejects.toThrow('Store get failed');
		});
	});

	describe('ensureStoreLoaded (via public methods)', () => {
		it('should reuse existing store instance', async () => {
			const instance = await GameStore.getInstance();

			await instance.saveValueToStore('key1', 'value1');
			await instance.getValueFromStore('key1');
			await instance.saveValueToStore('key2', 'value2');

			expect(load).toHaveBeenCalledTimes(1);
		});

		it('should handle store loading errors', async () => {
			// @ts-ignore
			GameStore.instance = null;

			const error = new Error('Failed to load store');
			vi.mocked(load).mockRejectedValueOnce(error);

			await expect(GameStore.getInstance()).rejects.toThrow('Failed to load store');
		});

		it('should handle concurrent operations on uninitialized store', async () => {
			const instance = await GameStore.getInstance();

			const operations = await Promise.allSettled([
				instance.saveValueToStore('key1', 'value1'),
				instance.getValueFromStore('key2'),
				instance.saveValueToStore('key3', 'value3'),
			]);

			expect(operations.every((op) => op.status === 'fulfilled')).toBe(true);
			expect(load).toHaveBeenCalledTimes(1);
		});
	});

	describe('integration scenarios', () => {
		it('should handle save and retrieve workflow', async () => {
			const instance = await GameStore.getInstance();
			const key = 'savePath';
			const value = '/path/to/saves';

			await instance.saveValueToStore(key, value);
			expect(mockStore.set).toHaveBeenCalledWith(key, { value });

			vi.mocked(mockStore.get).mockResolvedValueOnce({ value });
			const retrieved = await instance.getValueFromStore(key);

			expect(retrieved).toBe(value);
		});

		it('should handle multiple sequential operations', async () => {
			const instance = await GameStore.getInstance();

			await instance.saveValueToStore('key1', 'value1');
			await instance.saveValueToStore('key2', 'value2');
			await instance.saveValueToStore('key3', 'value3');

			expect(mockStore.set).toHaveBeenCalledTimes(3);
			expect(mockStore.save).toHaveBeenCalledTimes(3);
		});

		it('should maintain singleton across different operations', async () => {
			const instance1 = await GameStore.getInstance();
			await instance1.saveValueToStore('key1', 'value1');

			const instance2 = await GameStore.getInstance();
			vi.mocked(mockStore.get).mockResolvedValueOnce({ value: 'value1' });
			const value = await instance2.getValueFromStore('key1');

			expect(instance1).toBe(instance2);
			expect(value).toBe('value1');
		});
	});
});
