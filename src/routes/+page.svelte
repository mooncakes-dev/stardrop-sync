<script lang="ts">
	import { open } from '@tauri-apps/plugin-dialog';
	import { readDir, type DirEntry } from '@tauri-apps/plugin-fs';
	import { goto } from '$app/navigation';
	import GameStore from '$lib/stores/gameStore';
	import { onMount } from 'svelte';
	import { DASHBOARD_ROUTE_PATH, SAVE_FOLDER_STORE_KEY } from '$lib/utils/constants';
	import {
		getStardewPathInstructions,
		getStardewSavePath,
		listSaveFolders,
		promptUserForStardewPath,
		resetStardewPath,
	} from '$lib/utils/stardewPaths';

	interface ISaveFolder {
		name: string;
		displayName?: string;
		path?: string;
		active?: boolean;
		lastActive?: boolean;
	}

	let isLoading = $state(true);
	let error = $state<string | null>(null);

	const STORE_KEY = SAVE_FOLDER_STORE_KEY;
	const DASHBOARD_ROUTE = DASHBOARD_ROUTE_PATH;

	let savesPath: string | null = $state(null);
	let saveFolders = $state<ISaveFolder[]>([]);
	let instructions = $state<string>('');

	onMount(() => {
		instructions = getStardewPathInstructions();

		GameStore.getInstance()
			.then((gameStore) => gameStore.getValueFromStore(STORE_KEY))
			.then((savedPath) => {
				if (savedPath) {
					goto(DASHBOARD_ROUTE);
				}
				return loadSaves();
			})
			.catch((error) => {
				console.error('Error checking saved path:', error);
			})
			.finally(() => {
				isLoading = false;
			});
	});

	/**
	 * Attempt to automatically load Stardew save folders
	 */
	async function loadSaves() {
		isLoading = true;
		error = null;

		try {
			const result = await getStardewSavePath();
			savesPath = result.path;

			if (savesPath) {
				saveFolders = await listSaveFolders(savesPath);
				console.log(`Found ${saveFolders.length} save(s) via ${result.source} detection`);
			} else {
				error = 'Could not automatically detect Stardew Valley save path. Please select it manually.';
				instructions = getStardewPathInstructions();
			}
		} catch (err) {
			console.error('Failed to load saves:', err);
		} finally {
			isLoading = false;
		}
	}

	/**
	 * Handle changing the Stardew save location manually via a dialog window
	 */
	async function handleChangeLocation() {
		const newPath = await promptUserForStardewPath();
		if (newPath) {
			savesPath = newPath;

			try {
				saveFolders = await listSaveFolders(newPath);
			} catch (err) {
				console.error('Failed to load saves from new location:', err);
				error = 'Failed to load saves from the selected location';
			}
		}
	}
</script>

<div class="landing-container prose mx-auto">
	{#if isLoading}
		<div class="loading-container">
			<p>Loading...</p>
		</div>
	{:else if error}
		<div class="alert alert-error">
			{error}
		</div>
		<p>{instructions}</p>
		<button class="btn btn-ghost" onclick={() => handleChangeLocation()}> Select save location </button>
	{:else if saveFolders.length > 0}
		<div class="welcome-container">
			<h1>Welcome to Stardew Sync!</h1>
			<div class="inline-grid *:[grid-area:1/1]">
				<div class="status status-success animate-ping"></div>
				<div class="status status-success"></div>
			</div>
			Successfully located your save folder
			<p>If the following information is not correct, you can manually set the save folder location.</p>
			<div class="save-folder-info">
				<p class="text-sm text-gray-600">Stardew save folder: {savesPath}</p>

				<h4>All available saves ({saveFolders.length})</h4>
				<ul class="list bg-base-100 rounded-box shadow-md">
					{#each saveFolders as folder}
						<li class="list-row">{folder.name}</li>
					{/each}
				</ul>
				<button class="btn btn-soft btn-primary" onclick={() => goto(DASHBOARD_ROUTE)}> Looks good </button>
				<button class="btn btn-ghost" onclick={() => handleChangeLocation()}> Change Location </button>
			</div>
		</div>
	{:else}
		<div class="no-saves-container">
			<h2>No saves found</h2>

			<h3>Couple of things to check:</h3>
			<ul>
				<li>Is this location correct? {savesPath}</li>
				<li>
					Make sure you have selected the parent folder and not an individual save folder. The parent will show all of your save folders
				</li>
				<li>To locate your saves folder - {instructions}</li>
			</ul>
			<div class="buttons-container flex gap-4">
				<button class="btn btn-soft btn-primary" onclick={() => handleChangeLocation()}> Change save location </button>
				<button class="btn btn-ghost">I'm sure. Report an issue</button>
			</div>
		</div>
	{/if}
</div>

<style>
</style>
