import type { FileInfo } from '@tauri-apps/plugin-fs';

/**
 * Formats the save folder name by removing trailing underscores and digits.
 * @param folderName - The original folder name
 * @returns Formatted folder name
 */
export function formatSaveFolderName(folderName: string): string {
	return folderName.replace(/_\d+$/, '');
}

/**
 * Match folder name to the name property in the passed in object
 * @param items - array of objects that have a name property
 * @param name - string to match to
 */
export function findByName<T extends { name: string }>(items: T[], name: string): T | undefined {
	return items.find((item) => item.name === name);
}

/**
 * Get last modified date/time from the file/folder metadata
 * Transform the value to a locale date string for readability
 * @param folder - metadata for a specific folder or file
 * @returns locale date string or null if it fails
 */
export function getLastModifiedDate(folder: FileInfo): string | null {
	return folder?.mtime?.toLocaleDateString() ?? null;
}
