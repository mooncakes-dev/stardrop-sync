<script lang="ts">
  import { open } from "@tauri-apps/plugin-dialog";
  import { readDir, type DirEntry } from "@tauri-apps/plugin-fs";
  import { goto } from "$app/navigation";
  import GameStore from "$lib/stores/gameStore";
  import { onMount } from "svelte";

  let userSaveDirectoryPath = $state("");
  let saveFolderNames = $state<string[]>([]);
  let isLoading = $state(true);
  let error = $state<string | null>(null);

  const STORE_KEY = "saveFolderPath";
  const DASHBOARD_ROUTE = "/dashboard";

  onMount(() => {
    GameStore.getInstance()
      .then((gameStore) => gameStore.getValueFromStore(STORE_KEY))
      .then((savedPath) => {
        if (savedPath) {
          goto(DASHBOARD_ROUTE);
        }
      })
      .catch((error) => {
        console.error("Error checking saved path:", error);
      })
      .finally(() => {
        isLoading = false;
      });
  });

  async function pathSelect() {
    try {
      error = null;

      const selectedPath = await open({
        directory: true,
        multiple: false,
      });

      if (!selectedPath) return;

      await loadSaveFolders(selectedPath);
    } catch (err) {
      error = "Failed to select directory. Please try again.";
      console.error("Error selecting directory:", err);
    }
  }

  async function loadSaveFolders(path: string) {
    try {
      userSaveDirectoryPath = path;
      saveFolderNames = [];

      const entries = await readDir(path);

      saveFolderNames = entries
        .filter((entry) => entry.name)
        .map((entry) => entry.name!);

      await saveUserPathToStore(path);
    } catch (err) {
      error = "Failed to read save folders.";
      console.error("Error loading save folders:", err);
      throw err;
    }
  }

  async function saveUserPathToStore(path: string) {
    if (!path?.trim()) {
      throw new Error("Invalid path: cannot be empty");
    }

    try {
      const gameStore = await GameStore.getInstance();
      await gameStore.saveValueToStore(STORE_KEY, path);
    } catch (err) {
      console.error("Error saving path to store:", err);
      throw err;
    }
  }
</script>

<div class="landing-container prose mx-auto">
  {#if isLoading}
    <div class="loading-container">
      <p>Loading...</p>
    </div>
  {:else}
    <div class="welcome-container">
      <h1>Welcome to Stardew Sync!</h1>
      <p>Please select your save files folder to get started.</p>

      {#if error}
        <div class="alert alert-error">
          {error}
        </div>
      {/if}

      <button class="btn btn-ghost" onclick={pathSelect}>
        Select save files folder
      </button>

      {#if userSaveDirectoryPath}
        <div class="save-folder-info">
          <p class="text-sm text-gray-600">Selected: {userSaveDirectoryPath}</p>

          {#if saveFolderNames.length === 0}
            <p class="warning">No save folders found in this directory.</p>
          {:else}
            <h4>All available saves ({saveFolderNames.length})</h4>
            <ul class="list bg-base-100 rounded-box shadow-md">
              {#each saveFolderNames as folderName}
                <li class="list-row">{folderName}</li>
              {/each}
            </ul>
            <button
              class="btn btn-soft btn-primary"
              onclick={() => goto(DASHBOARD_ROUTE)}
            >
              Looks good
            </button>
          {/if}
        </div>
      {/if}
    </div>
  {/if}
</div>

<style>
</style>
