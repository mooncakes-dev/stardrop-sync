<script lang="ts">
	import GameStore from '$lib/stores/gameStore';
	import junimoImage from '$lib/assets/junimo.png';
	import { onMount } from 'svelte';
	import { readDir, watchImmediate } from '@tauri-apps/plugin-fs';
	import { LAST_ACTIVE_STORE_KEY, SAVE_FOLDER_STORE_KEY } from '$lib/utils/constants';
	import { getStardewPathInstructions, getStardewSavePath, promptUserForStardewPath, resetStardewPath } from '$lib/utils/stardewPaths';
	import { SaveFolderService } from '$lib/services/saveFolderService';
	import type { ISaveFolder, SaveFolderProperty } from '$lib/utils/models/ISaveFolder';
	import { join } from '@tauri-apps/api/path';
	import { findByName } from '$lib/utils/commonUtils';

	let saveFolderService = new SaveFolderService();

	const SAVE_FOLDER_KEY = SAVE_FOLDER_STORE_KEY;
	const LAST_ACTIVE_KEY = LAST_ACTIVE_STORE_KEY;

	let instructions = $state<string>('');
	let savePath = $state<string | null>('');
	let saveFolders = $state<ISaveFolder[]>([]);

	let error = $state<string | null>(null);
	let isLoading = $state<boolean>(false);

	onMount(async () => {
		isLoading = true;
		instructions = getStardewPathInstructions();

		GameStore.getInstance()
			.then((gameStore) => gameStore.getValueFromStore(SAVE_FOLDER_KEY))
			.then((savedPath) => {
				if (savedPath) {
					savePath = savedPath;
					loadSaveFolders(savedPath);
				}
			})
			// FIXME: Do I need to watch for all folder changes??
			// .then(async () => {
			// 	await watch(
			// 		savePath!,
			// 		async (event) => {
			// 			await loadSaveFolders(savePath!);
			// 		},
			// 		{ delayMs: 1000 }
			// 	);
			// })
			.catch((error) => {
				console.error('Error checking saved path:', error);
			})
			.finally(() => {
				isLoading = false;
			});
	});

	/**
	 * Retrieves information about all save folders.
	 * @returns Array of ISaveFolder objects
	 */
	function getAllSaveFoldersInfo(): ISaveFolder[] {
		let info = saveFolders.map((folder) => ({
			name: folder.name,
			active: folder.active,
			lastActive: folder.lastActive,
			path: folder.path,
			dateModified: folder.dateModified,
		}));
		return info;
	}

	/**
	 * Loads save folders from the specified path and maps the values to the ISaveFolder interface.
	 * @param path - The path to the Stardew saves directory
	 */
	async function loadSaveFolders(path: string) {
		let folders = await saveFolderService.loadSaveFolders(path);
		saveFolders = folders;
	}

	/**
	 * Updates save folder information based on user interaction.
	 * @param folderName - The name of the folder to update
	 * @param property - The property to update in ISaveFolder
	 */
	function setSaveInformation(folderName: string, property: SaveFolderProperty) {
		saveFolders = saveFolders.map((folder) => ({
			...folder,
			[property]: folder.name === folderName,
		}));

		if (property === 'active') {
			saveValueToStore(LAST_ACTIVE_KEY, folderName);
			console.log('SAVE FOLDER UPDATE', saveFolders);

			watchForFileChanges(folderName);
		}
		console.log(saveFolders);
	}

	/**
	 * Save value to app's store based on the provided key
	 * @param key - store key
	 * @param value - value to save
	 */
	async function saveValueToStore(key: string, value: string) {
		if (!value?.trim()) {
			throw new Error(`Invalid ${{ value }}: cannot be empty`);
		}

		try {
			const gameStore = await GameStore.getInstance();
			await gameStore.saveValueToStore(key, value);
		} catch (err) {
			console.error(`Error saving ${{ value }} to store:`, err);
			throw err;
		}
	}

	/**
	 * Handle changing the Stardew save location manually via a dialog window
	 * In case if there was an issue with the path or a misclick or auto detection failed
	 */
	async function handleChangeLocation() {
		const newPath = await promptUserForStardewPath();
		if (newPath) {
			savePath = newPath;
		}
	}

	/**
	 * Reset everything and try auto-detected path
	 * Populate path and save folders if success
	 */
	async function resetStardewSavePath() {
		resetStardewPath();

		savePath = null;
		saveFolders = [];

		const newPath = await getStardewSavePath();

		if (newPath.path) {
			savePath = newPath.path;
			loadSaveFolders(newPath.path);
		}
	}

	/**
	 * Watch for changes in the selected save file metadata
	 * Compare old modified time to the current one, log the change, and update the modified time
	 *
	 * Due to Tauri's watcher functionality and the way stardew handles saves, the method watches for the 'rename to' event
	 * It will ignore all of the other triggered events and files inside the directory
	 */
	async function watchForFileChanges(folderName: string) {
		const currentFolder = saveFolders.find((obj) => obj.name === folderName);
		const currentFolderPath = currentFolder?.path;

		if (!currentFolderPath) {
			return (error = 'No path provided');
		}

		let lastKnownMtime: number | null = null;
		const saveFolderContent = await readDir(currentFolderPath);
		const foundFile = findByName(saveFolderContent, folderName);
		let foundfilename = foundFile?.name;

		if (!foundfilename || !foundFile?.isFile) {
			return;
		}

		const pathToWatch = await join(currentFolderPath, foundfilename);

		try {
			const initialMetadata = await saveFolderService.getSpecificSaveMetadata(currentFolderPath, folderName);

			if (initialMetadata && typeof initialMetadata !== 'string') {
				lastKnownMtime = initialMetadata.mtime?.getTime() || null;
			}
		} catch (err) {
			return (error = 'Failed to get initial metadata:'), err;
		}

		await watchImmediate(pathToWatch, (event) => {
			if (!event.paths.includes(pathToWatch)) {
				return;
			}

			if (typeof event.type === 'object' && event.type !== null && 'modify' in event.type) {
				const modifyEvent = event.type.modify;

				const isRenameToEvent = modifyEvent.kind === 'rename' && modifyEvent.mode === 'to';

				if (!isRenameToEvent) {
					return;
				}

				compareModifiedTime(foundfilename, lastKnownMtime, currentFolderPath);
			}
		});
	}

	/**
	 * Compare provided modified time metadata with the current modified time
	 * If they are different, update the last known time and upload the fresh save to the app
	 * @param name - save file name
	 * @param lastKnownTime - last known modified time
	 * @param path - save path
	 */
	async function compareModifiedTime(name: string, lastKnownTime: number | null, path: string): Promise<void | string> {
		try {
			const currentMetadata = await saveFolderService.getSpecificSaveMetadata(path, name);

			if (currentMetadata && typeof currentMetadata !== 'string') {
				const currentMtime = currentMetadata.mtime?.getTime();

				if (currentMtime && currentMtime !== lastKnownTime) {
					lastKnownTime = currentMtime;

					// TODO: Add uploader logic once you get to that point
					console.log('Congrats, you saved your file!', lastKnownTime);
				}
			}
		} catch (err) {
			return (err = 'Failed to compare modified times');
		}
	}
</script>

{#if isLoading}
	<p>Loading...</p>
{:else if !isLoading}
	<div class="save-cards-container flex gap-4 flex-row flex-wrap md:flex-nowrap w-full">
		{#if saveFolders.length > 0}
			{#each saveFolders as folder}
				<div
					class="card card-side w-full card-xs
				{folder.active ? 'ring-2 ring-indigo-200 shadow-lg shadow-indigo-500/50 bg-base-300' : 'card-border shadow-sm bg-base-100'}"
				>
					<img class="save-card-icon" src={junimoImage} alt="junimo icon" />
					<div class="card-body flex flex-row items-center justify-flex-start gap-4 my-1">
						<div class="tooltip" data-tip="Recent save date: {folder.dateModified}">
							<h2 class="card-title">{folder.displayName}</h2>
						</div>
						<div class="card-actions">
							<button
								class="btn btn-ghost btn-sm {folder.active ? 'btn-disabled' : 'btn-ghost'}"
								onclick={() => setSaveInformation(folder.name, 'active')}
							>
								{folder.active ? 'Selected' : 'Select'}
							</button>
						</div>
					</div>
				</div>
			{/each}
		{/if}
	</div>
{:else if error}
	<div class="error-container prose mx-auto">
		<div role="alert" class="alert alert-error alert-soft">
			<span>{error}</span>
		</div>
		<h3>Couple of things to check:</h3>
		<ul>
			<li>Is this location correct? {savePath}</li>
			<li>
				Make sure you have selected the parent folder and not an individual save folder. The parent will show all of your save folders
			</li>
			<li>To locate your saves folder - {instructions}</li>
		</ul>
		<div class="buttons-container flex gap-4">
			<button class="btn btn-soft btn-primary" onclick={() => handleChangeLocation()}> Change save location </button>
			<button class="btn btn-soft btn-info" onclick={() => resetStardewSavePath()}> Try default location </button>
			<button class="btn btn-soft btn-info" onclick={() => resetStardewSavePath()}> Refresh </button>
			<button class="btn btn-ghost">I'm sure. Report an issue</button>
		</div>
	</div>
{:else}
	<div class="error-container prose mx-auto">
		<div role="alert" class="alert alert-error alert-soft">
			<p>No save folders found. Select a location to get started.</p>
		</div>
		<h3>Couple of things to check:</h3>
		<ul>
			<li>Is this location correct? {savePath}</li>
			<li>
				Make sure you have selected the parent folder and not an individual save folder. The parent will show all of your save folders
			</li>
			<li>To locate your saves folder - {instructions}</li>
		</ul>
		<div class="buttons-container flex gap-4">
			<button class="btn btn-soft btn-primary" onclick={() => handleChangeLocation()}> Change save location </button>
			<button class="btn btn-soft btn-info" onclick={() => resetStardewSavePath()}> Try default location </button>
			<button class="btn btn-soft btn-info" onclick={() => resetStardewSavePath()}> Refresh </button>
			<button class="btn btn-ghost">I'm sure. Report an issue</button>
		</div>
	</div>
{/if}

<style>
	.save-card-icon {
		width: 5rem;
		height: 5rem;
	}
</style>
