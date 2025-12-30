import GameStore from '$lib/stores/gameStore';
import { appDataDir, dirname, homeDir, join } from '@tauri-apps/api/path';
import { open } from '@tauri-apps/plugin-dialog';
import { platform } from '@tauri-apps/plugin-os';
import { SAVE_FOLDER_STORE_KEY } from './constants';
import { exists, readDir } from '@tauri-apps/plugin-fs';

interface IStardewPath {
	path: string | null;
	source: 'auto' | 'manual' | 'cached' | 'failed';
}

interface ISaveFolder {
	name: string;
	path: string;
}

/**
 * Get platform-specific Stardew Valley save paths.
 * @returns Promise<string>>
 */
async function getStardewSavePathForPlatform(): Promise<string> {
	const os = platform();

	if (os === 'windows') {
		const appData = await appDataDir();
		const roamingDir = await dirname(appData);
		return await join(roamingDir, 'StardewValley', 'Saves');
	} else if (os === 'macos') {
		const home = await homeDir();
		return await join(home, '.config', 'StardewValley', 'Saves');
	} else if (os === 'linux') {
		const home = await homeDir();
		return await join(home, '.config', 'StardewValley', 'Saves');
	} else {
		throw new Error(`Unsupported OS platform: ${os}`);
	}
}

/**
 * Get Stardew save path with automatic detection.
 * @returns Promise<IStardewPath> - The detected path and its source.
 */
export async function getStardewSavePath(): Promise<IStardewPath> {
	const SAVE_FOLDER_KEY = SAVE_FOLDER_STORE_KEY;
	const cachedSavePath = await GameStore.getInstance().then((gameStore) => gameStore.getValueFromStore(SAVE_FOLDER_KEY));

	if (cachedSavePath) {
		try {
			const isValidPath = await exists(cachedSavePath);

			if (isValidPath) {
				return { path: cachedSavePath, source: 'cached' };
			}
		} catch (error) {
			console.error('Error validating cached path:', error);
		}
	}

	try {
		const autoDetectedPath = await getStardewSavePathForPlatform();
		const pathExists = await exists(autoDetectedPath);

		if (pathExists) {
			console.log('Auto-detected Stardew save path:', autoDetectedPath);
			GameStore.getInstance().then((gameStore) => gameStore.saveValueToStore(SAVE_FOLDER_KEY, autoDetectedPath));

			return { path: autoDetectedPath, source: 'auto' };
		} else {
			console.log('Auto-detected path does not exist:', autoDetectedPath);
		}
	} catch (error) {
		console.error('Error during auto-detection of Stardew save path:', error);
	}

	const manualPath = await promptUserForStardewPath();

	if (manualPath) {
		return { path: manualPath, source: 'manual' };
	}

	return { path: null, source: 'failed' };
}

/**
 * Prompt user to manually select Stardew save folder
 * @returns Promise<string | null>
 */
export async function promptUserForStardewPath(): Promise<string | null> {
	try {
		const selectedPath = await open({
			directory: true,
			multiple: false,
			title: 'Select your Stardew Valley saves folder',
		});

		if (selectedPath) {
			console.log('User selected Stardew save path:', selectedPath);
			await saveUserPathToStore(selectedPath);

			return selectedPath;
		}
	} catch (error) {
		console.error('Error selecting directory:', error);
	}

	return null;
}

/**
 * Save user-provided path to the GameStore.
 * @param path
 */
async function saveUserPathToStore(path: string) {
	if (!path?.trim()) {
		throw new Error('Invalid path: cannot be empty');
	}

	try {
		const gameStore = await GameStore.getInstance();
		await gameStore.saveValueToStore(SAVE_FOLDER_STORE_KEY, path);
	} catch (err) {
		console.error('Error saving path to store:', err);
		throw err;
	}
}

/**
 * Reset the stored Stardew path in the GameStore.
 */
export function resetStardewPath(): void {
	GameStore.getInstance().then((gameStore) => gameStore.saveValueToStore(SAVE_FOLDER_STORE_KEY, ''));
}

/**
 * List all save folders in the given save folder
 * @param savesPath - The path to the Stardew saves directory
 * @returns
 */
export async function listSaveFolders(savesPath: string): Promise<ISaveFolder[]> {
	try {
		const entries = await readDir(savesPath);
		const saveFolders = entries.filter((entry) => entry.isDirectory);

		return saveFolders.map((folder) => ({
			name: folder.name,
			path: `${savesPath}/${folder.name}`,
		}));
	} catch (error) {
		console.error('Error reading save folders:', error);
		throw error;
	}
}

export function getStardewPathInstructions(): string {
	const os = platform();

	if (os === 'windows') {
		return 'Press Win+R and type: %appdata%\\StardewValley\\Saves';
	} else if (os === 'macos') {
		return 'Open Finder, press Cmd+Shift+G, and go to: ~/.config/StardewValley/Saves';
	} else if (os === 'linux') {
		return 'Navigate to: ~/.config/StardewValley/Saves';
	} else {
		return 'Check the Stardew Valley documentation for your platform';
	}
}
