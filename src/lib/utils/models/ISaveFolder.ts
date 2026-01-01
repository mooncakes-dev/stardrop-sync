export interface ISaveFolder {
	name: string;
	displayName?: string;
	path?: string;
	active?: boolean;
	lastActive?: boolean;
	dateModified?: Date | string | null;
}

export type SaveFolderProperty = 'active' | 'lastActive';
