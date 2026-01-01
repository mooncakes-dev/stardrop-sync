import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { exists, readDir, stat, type DirEntry, type FileInfo } from '@tauri-apps/plugin-fs';
import { join } from '@tauri-apps/api/path';
import { SaveFolderService } from './saveFolderService';
import { formatSaveFolderName, getLastModifiedDate, findByName } from '../utils/commonUtils';

vi.mock('@tauri-apps/plugin-fs', () => ({
	exists: vi.fn(),
	readDir: vi.fn(),
	stat: vi.fn(),
}));

vi.mock('@tauri-apps/api/path', () => ({
	join: vi.fn(),
}));

vi.mock('./utils', () => ({
	formatSaveFolderName: vi.fn((folderName: string): string => {
		return folderName.replace(/_\d+$/, '');
	}),
	getLastModifiedDate: vi.fn((folder: any): string | null => {
		return folder?.mtime?.toLocaleDateString() ?? null;
	}),
	findByName: vi.fn(<T extends { name: string }>(items: T[], name: string): T | undefined => {
		return items.find((item) => item.name === name);
	}),
}));

describe('SaveFolderService', () => {
	let service: SaveFolderService;

	beforeEach(() => {
		service = new SaveFolderService();
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.resetAllMocks();
	});

	describe('loadSaveFolders', () => {
		it('should successfully load save folders', async () => {
			const mockPath = '/path/to/saves';
			const mockEntries = [
				{ name: 'SaveFolder1_123456', isDirectory: true, isFile: false },
				{ name: 'SaveFolder2_789012', isDirectory: true, isFile: false },
				{ name: 'somefile.txt', isDirectory: false, isFile: true },
			];
			const mockDate = new Date('2024-01-01');

			vi.mocked(exists).mockResolvedValue(true);
			vi.mocked(readDir).mockResolvedValue(mockEntries as DirEntry[]);
			vi.mocked(join).mockImplementation(async (path, name) => `${path}/${name}`);
			vi.mocked(stat).mockResolvedValue({
				isDirectory: true,
				isFile: false,
				isSymlink: false,
				size: 0,
				mtime: mockDate,
				atime: mockDate,
				birthtime: mockDate,
			} as FileInfo);

			const result = await service.loadSaveFolders(mockPath);

			expect(result[0]).toMatchObject({
				name: 'SaveFolder1_123456',
				displayName: 'SaveFolder1',
				path: '/path/to/saves/SaveFolder1_123456',
				active: false,
				lastActive: false,
				dateModified: mockDate.toLocaleDateString(),
			});
			expect(result[1]).toMatchObject({
				name: 'SaveFolder2_789012',
				displayName: 'SaveFolder2',
				path: '/path/to/saves/SaveFolder2_789012',
				active: false,
				lastActive: false,
				dateModified: mockDate.toLocaleDateString(),
			});

			expect(exists).toHaveBeenCalledWith(mockPath);
			expect(readDir).toHaveBeenCalledWith(mockPath);
		});

		it('should thow error for empty path', async () => {
			await expect(service.loadSaveFolders('')).rejects.toThrow('Invalid path: path cannot be empty');
		});

		it('should throw error for whitespace-only path', async () => {
			await expect(service.loadSaveFolders('   ')).rejects.toThrow('Invalid path: path cannot be empty');
		});

		it('should throw error when path does not exist', async () => {
			vi.mocked(exists).mockResolvedValue(false);

			await expect(service.loadSaveFolders('/nonexistent/path')).rejects.toThrow('Save path does not exist');
		});

		it('should throw error when no directories are found', async () => {
			const mockPath = '/path/to/saves';
			const mockEntries = [
				{ name: 'file1.txt', isDirectory: false, isFile: true },
				{ name: 'file2.txt', isDirectory: false, isFile: true },
			];

			vi.mocked(exists).mockResolvedValue(true);
			vi.mocked(readDir).mockResolvedValue(mockEntries as DirEntry[]);

			await expect(service.loadSaveFolders(mockPath)).rejects.toThrow('No save folders found in the specified directory');
		});

		it('should filter out directories without names', async () => {
			const mockPath = '/path/to/saves';
			const mockEntries = [
				{ name: 'SaveFolder1_123456', isDirectory: true, isFile: false },
				{ name: '', isDirectory: true, isFile: false },
				{ name: undefined, isDirectory: true, isFile: false },
			];

			vi.mocked(exists).mockResolvedValue(true);
			vi.mocked(readDir).mockResolvedValue(mockEntries as DirEntry[]);
			vi.mocked(join).mockImplementation(async (p, n) => `${p}/${n}`);
			vi.mocked(stat).mockResolvedValue({} as FileInfo);

			const result = await service.loadSaveFolders(mockPath);
			expect(result).toHaveLength(1);
			expect(result[0].name).toBe('SaveFolder1_123456');
		});

		it('should throw error when mapping fails', async () => {
			const mockPath = '/path/to/saves';
			const mockEntries = [{ name: 'SaveFolder1_123456', isDirectory: true, isFile: false }];

			vi.mocked(exists).mockResolvedValue(true);
			vi.mocked(readDir).mockResolvedValue(mockEntries as DirEntry[]);
			vi.mocked(join).mockRejectedValue(new Error('Join failed'));

			await expect(service.loadSaveFolders(mockPath)).rejects.toThrow('Could not load save folders: ');
		});
	});

	describe('getSpecificSaveMetadata', () => {
		it('should return file metadata when file exists', async () => {
			const mockSavePath = '/path/to/saves/farm_folder';
			const mockFolderName = 'farm';
			const mockDate = new Date('2024-01-01');

			const mockFileInfo = {
				isDirectory: false,
				isFile: true,
				isSymlink: false,
				size: 1024,
				mtime: mockDate,
				atime: mockDate,
				birthtime: mockDate,
			};
			const mockEntries = [
				{ name: 'farm', isFile: true, isDirectory: false },
				{ name: 'other_file', isFile: true, isDirectory: false },
			];

			vi.mocked(readDir).mockResolvedValue(mockEntries as DirEntry[]);
			vi.mocked(join).mockResolvedValue('/path/to/saves/farm_folder/farm');
			vi.mocked(stat).mockResolvedValue(mockFileInfo as FileInfo);

			const result = await service.getSpecificSaveMetadata(mockSavePath, mockFolderName);

			expect(result).toEqual(mockFileInfo);
			expect(readDir).toHaveBeenCalledWith(mockSavePath);
		});

		it('should return null when file not found', async () => {
			const mockSavePath = '/path/to/saves/farm_folder';
			const mockEntries = [{ name: 'other_file', isFile: true, isDirectory: false }];

			vi.mocked(readDir).mockResolvedValue(mockEntries as DirEntry[]);

			const result = await service.getSpecificSaveMetadata(mockSavePath, 'nonexistent');

			expect(result).toBeNull();
		});

		it('should return null when found entry is not a file', async () => {
			const mockSavePath = '/path/to/saves/farm_folder';
			const mockFolderName = 'folder';
			const mockEntries = [{ name: 'folder', isFile: false, isDirectory: true }];

			vi.mocked(readDir).mockResolvedValue(mockEntries as DirEntry[]);

			const result = await service.getSpecificSaveMetadata(mockSavePath, mockFolderName);

			expect(result).toBeNull();
		});

		it('should return error string when exception occurs', async () => {
			const mockSavePath = '/path/to/saves/farm_folder';
			const mockFolderName = 'folder';
			vi.mocked(readDir).mockRejectedValue(new Error('Read failed'));

			const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

			const result = await service.getSpecificSaveMetadata(mockSavePath, mockFolderName);

			expect(result).toBe('Error retrieving save folder metadata');
			expect(consoleErrorSpy).toHaveBeenCalledWith('Error retrieving save folder metadata:', expect.any(Error));

			consoleErrorSpy.mockRestore();
		});

		it('should throw error for invalid path', async () => {
			const mockEmptyPath = '';
			const mockFolderName = 'folder';
			await expect(service.getSpecificSaveMetadata(mockEmptyPath, mockFolderName)).rejects.toThrow('Invalid path: path cannot be empty');
		});
	});

	describe('validatePath (private method testing via public methods)', () => {
		it('should validate null path through loadSaveFolders', async () => {
			await expect(service.loadSaveFolders(null as any)).rejects.toThrow('Invalid path: path cannot be empty');
		});

		it('should validate undefined path through loadSaveFolders', async () => {
			await expect(service.loadSaveFolders(undefined as any)).rejects.toThrow('Invalid path: path cannot be empty');
		});
	});

	describe('utility functions behavior in tests', () => {
		it('should format save folder names by removing trailing underscore and numbers', () => {
			expect(formatSaveFolderName('FarmName_123456')).toBe('FarmName');
			expect(formatSaveFolderName('MyFarm_999')).toBe('MyFarm');
			expect(formatSaveFolderName('NoNumbers')).toBe('NoNumbers');
		});

		it('should get last modified date from FileInfo', () => {
			const mockDate = new Date('2024-06-15');
			const mockFileInfo = {
				isDirectory: true,
				isFile: false,
				isSymlink: false,
				size: 0,
				mtime: mockDate,
				atime: mockDate,
				birthtime: mockDate,
			};

			const result = getLastModifiedDate(mockFileInfo as FileInfo);
			expect(result).toBe(mockDate.toLocaleDateString());
		});

		it('should return null when mtime is missing', () => {
			const mockFileInfo = {
				isDirectory: true,
				isFile: false,
				isSymlink: false,
				size: 0,
				mtime: null,
				atime: new Date(),
				birthtime: new Date(),
			};

			const result = getLastModifiedDate(mockFileInfo as FileInfo);
			expect(result).toBeNull();
		});

		it('should find item by name', () => {
			const items = [
				{ name: 'file1.txt', data: 'a' },
				{ name: 'file2.txt', data: 'b' },
				{ name: 'file3.txt', data: 'c' },
			];

			expect(findByName(items, 'file2.txt')).toEqual({ name: 'file2.txt', data: 'b' });
			expect(findByName(items, 'nonexistent.txt')).toBeUndefined();
		});
	});
});
