import { findByName, formatSaveFolderName, getLastModifiedDate } from '$lib/utils/commonUtils';
import type { ISaveFolder } from '$lib/utils/models/ISaveFolder';
import { join } from '@tauri-apps/api/path';
import { exists, readDir, stat, type FileInfo } from '@tauri-apps/plugin-fs';

export class SaveFolderService {
	/**
	 * Load save folders from the specified save directory and map the values to the ISaveFolder interface.
	 * @param path - Stardew saves directory path
	 * @returns array of all found save folders
	 */
	async loadSaveFolders(path: string): Promise<ISaveFolder[]> {
		let err = null;

		this.validatePath(path);

		const pathExists = await exists(path);
		if (!pathExists) {
			throw new Error('Save path does not exist');
		}

		err = null;

		const entries = await readDir(path);
		const directories = entries.filter((entry) => entry.isDirectory && entry.name);

		if (directories.length === 0) {
			throw new Error('No save folders found in the specified directory');
		}

		try {
			return await Promise.all(
				directories.map(async (entry) => {
					const folderPath = await join(path, entry.name);
					const folderMetadata = await stat(folderPath);

					return {
						name: entry.name,
						displayName: formatSaveFolderName(entry.name),
						path: folderPath,
						active: false,
						lastActive: false,
						dateModified: getLastModifiedDate(folderMetadata),
					};
				})
			);
		} catch (err) {
			throw new Error('Could not load save folders: ');
		}
	}

	/**
	 * Get metadata for a specific save file
	 * @param folderPath
	 * @param folderName
	 * @returns
	 */
	async getSpecificSaveMetadata(folderPath: string, folderName: string): Promise<FileInfo | null | string> {
		this.validatePath(folderPath);

		try {
			const saveFolderContent = await readDir(folderPath);
			const foundFile = findByName(saveFolderContent, folderName);

			if (foundFile?.isFile) {
				return await stat(await join(folderPath, foundFile.name));
			}
		} catch (err) {
			console.error('Error retrieving save folder metadata:', err);
			return 'Error retrieving save folder metadata';
		}

		return null;
	}

	/**
	 * Validate whether the provided path is legit or not
	 * @param path
	 */
	private validatePath(path: string): void {
		if (!path?.trim()) {
			throw new Error('Invalid path: path cannot be empty');
		}
	}
}
