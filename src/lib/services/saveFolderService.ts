import { findByName, formatSaveFolderName, getLastModifiedDate } from '$lib/utils/commonUtils';
import { join } from '@tauri-apps/api/path';
import { readDir, stat, type FileInfo } from '@tauri-apps/plugin-fs';

export interface ISaveFolder {
	name: string;
	displayName?: string;
	path?: string;
	active?: boolean;
	lastActive?: boolean;
	dateModified?: Date | string | null;
}

export class SaveFolderService {
	/**
	 * Load save folders from the specified save directory
	 * @param path - save directory
	 * @returns
	 */
	async loadSaveFolders(path: string): Promise<ISaveFolder[]> {
		this.validatePath(path);

		const entries = await readDir(path);
		const directories = entries.filter((entry) => entry.isDirectory && entry.name);

		if (directories.length === 0) {
			throw new Error('No save folders found in the specified directory');
		}

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
					dateModified: await getLastModifiedDate(folderMetadata),
				};
			})
		);
	}

	/**
	 * Get metadata for a specific save file
	 * @param folderPath
	 * @param folderName
	 * @returns
	 */
	async getSpecificSaveMetadata(folderPath: string, folderName: string): Promise<FileInfo | null> {
		this.validatePath(folderPath);

		const saveFolderContent = await readDir(folderPath);
		const foundFile = findByName(saveFolderContent, folderName);

		if (foundFile?.isFile) {
			return await stat(await join(folderPath, foundFile.name));
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
