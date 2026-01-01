import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Page from './+page.svelte';
import { goto } from '$app/navigation';
import GameStore from '$lib/stores/gameStore';
import { getStardewPathInstructions, getStardewSavePath, listSaveFolders, promptUserForStardewPath } from '$lib/utils/stardewPaths';
import { render, screen, waitFor } from '@testing-library/svelte';

vi.mock('@tauri-apps/plugin-dialog', () => ({
	open: vi.fn(),
}));

vi.mock('@tauri-apps/plugin-fs', () => ({
	readDir: vi.fn(),
}));

vi.mock('$app/navigation', () => ({
	goto: vi.fn(),
}));

vi.mock('$lib/stores/gameStore', () => ({
	default: {
		getInstance: vi.fn(),
	},
}));

vi.mock('$lib/utils/stardewPaths', () => ({
	getStardewPathInstructions: vi.fn(),
	getStardewSavePath: vi.fn(),
	listSaveFolders: vi.fn(),
	promptUserForStardewPath: vi.fn(),
	resetStardewPath: vi.fn(),
}));

describe('/+page.svelte', () => {
	let mockGameStore: {
		getValueFromStore: ReturnType<typeof vi.fn>;
		saveValueToStore: ReturnType<typeof vi.fn>;
	};

	beforeEach(() => {
		mockGameStore = {
			getValueFromStore: vi.fn().mockResolvedValue(null),
			saveValueToStore: vi.fn().mockResolvedValue(undefined),
		};

		vi.mocked(GameStore.getInstance).mockResolvedValue(mockGameStore as any);
		vi.mocked(getStardewPathInstructions).mockReturnValue('Navigate to C:\\Users\\FarmersRealName\\AppData\\Roaming\\StardewValley\\Saves');
		vi.mocked(getStardewSavePath).mockResolvedValue({
			path: null,
			source: 'manual',
		});
		vi.mocked(listSaveFolders).mockResolvedValue([]);
		vi.mocked(promptUserForStardewPath).mockResolvedValue(null);

		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.resetAllMocks();
	});

	describe('Initial Loading State', () => {
		it('should show loading state initially', async () => {
			render(Page);

			expect(screen.getByText('Loading...')).toBeInTheDocument();
		});
	});

	it('should load instructions on mount', async () => {
		render(Page);
		await waitFor(() => {
			expect(getStardewPathInstructions).toHaveBeenCalled();
		});
	});

	it('should check for saved path on mount', async () => {
		render(Page);

		await waitFor(() => {
			expect(GameStore.getInstance).toHaveBeenCalled();
			expect(mockGameStore.getValueFromStore).toHaveBeenCalledWith('saveFolderPath');
		});
	});

	describe('Saved Path Redirect', () => {
		it('should redirect to dashboard if save path exists in store', async () => {
			mockGameStore.getValueFromStore.mockResolvedValueOnce('/path/to/saves');

			render(Page);

			await waitFor(() => {
				expect(goto).toHaveBeenCalledWith('/dashboard');
			});
		});

		it('should not redirect if no save path exists in store', async () => {
			mockGameStore.getValueFromStore.mockResolvedValueOnce(null);

			render(Page);

			await waitFor(() => {
				expect(goto).not.toHaveBeenCalled();
			});
		});
	});

	describe('Auto-detect Save Path', () => {
		it('should successfully auto-detect save path and load saves', async () => {
			const mockSaveFolders = [
				{ name: 'Farm1_123456', displayName: 'Farm1', path: '/path/to/save' },
				{ name: 'Farm2_789012', displayName: 'Farm2', path: '/path/to/save' },
			];

			vi.mocked(getStardewSavePath).mockResolvedValueOnce({
				path: '/path/to/saves',
				source: 'auto',
			});
			vi.mocked(listSaveFolders).mockResolvedValueOnce(mockSaveFolders);

			render(Page);

			await waitFor(() => {
				expect(screen.getByText(/Successfully located your save folder/i)).toBeInTheDocument();
			});

			expect(screen.getByText('Farm1_123456')).toBeInTheDocument();
			expect(screen.getByText('Farm2_789012')).toBeInTheDocument();
			expect(screen.getByText(/All available saves \(2\)/i)).toBeInTheDocument();
		});

		it('should show error when auto-detection fails', async () => {
			vi.mocked(getStardewSavePath).mockResolvedValueOnce({
				path: null,
				source: 'manual',
			});

			render(Page);

			waitFor(() => {
				expect(screen.getByText(/Could not automatically detect Stardew Valley save path/i)).toBeInTheDocument();
			});
		});

		it('should handle errors during save loading', async () => {
			const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

			vi.mocked(getStardewSavePath).mockRejectedValueOnce(new Error('Failed to detect'));

			render(Page);

			await waitFor(() => {
				expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to load saves:', expect.any(Error));
			});

			consoleErrorSpy.mockRestore();
		});
	});

	describe('No Saves Found', () => {
		it('should show no saves message when folder is empty', async () => {
			vi.mocked(getStardewSavePath).mockResolvedValueOnce({
				path: '/path/to/saves',
				source: 'failed',
			});
			vi.mocked(listSaveFolders).mockResolvedValueOnce([]);

			render(Page);

			await waitFor(() => {
				expect(screen.getByText(/No saves found/i)).toBeInTheDocument();
			});

			expect(screen.getByText(/Is this location correct\?/i)).toBeInTheDocument();
			expect(screen.getByText(/Change save location/i)).toBeInTheDocument();
		});

		it('should show instructions when no saves found', async () => {
			const instructions = 'Navigate to your AppData folder';
			vi.mocked(getStardewPathInstructions).mockReturnValue(instructions);

			vi.mocked(getStardewSavePath).mockResolvedValueOnce({
				path: '/path/to/saves',
				source: 'failed',
			});
			vi.mocked(listSaveFolders).mockResolvedValueOnce([]);

			render(Page);

			await waitFor(() => {
				expect(screen.getByText(new RegExp(instructions))).toBeInTheDocument();
			});
		});
	});
});
