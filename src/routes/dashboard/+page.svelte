<script lang="ts">
  import GameStore from "$lib/stores/gameStore";
  import junimoImage from "$lib/assets/junimo.png";
  import { onMount } from "svelte";
  import { save } from "@tauri-apps/plugin-dialog";
  import { readDir } from "@tauri-apps/plugin-fs";

  interface SaveFolder {
    name: string;
    displayName: string;
    active: boolean;
    lastActive: boolean;
  }

  const STORE_KEY = "saveFolderPath";

  let savePath: string | null = $state(null);
  let error = $state<string | null>(null);

  let saveFolders = $state<SaveFolder[]>([]);

  onMount(() => {
    GameStore.getInstance()
      .then((gameStore) => gameStore.getValueFromStore(STORE_KEY))
      .then((savedPath) => {
        if (savedPath) {
          savePath = savedPath;
          loadSaveFolders(savePath);
        }
      })
      .catch((error) => {
        console.error("Error checking saved path:", error);
      });
  });

  async function loadSaveFolders(path: string) {
    try {
      saveFolders = [];

      const entries = await readDir(path);
      const directories = entries.filter(
        (entry) => entry.isDirectory && entry.name
      );

      if (directories.length === 0) {
        error = "No save folders found. Please select the correct directory.";
        return;
      }

      saveFolders = directories.map((entry) => ({
        name: entry.name!,
        displayName: formatSaveFolderName(entry.name!),
        active: false,
        lastActive: false,
      }));
    } catch (err) {
      error = "Failed to read save folders.";
      console.error("Error loading save folders:", err);
      throw err;
    }
  }

  function setSaveToActive(folderName: string) {
    saveFolders = saveFolders.map((folder) => ({
      ...folder,
      active: folder.name === folderName,
    }));
  }

  /**
   * Formats the save folder name by removing trailing underscores and digits.
   * @param folderName
   * @returns Formatted folder name
   */
  function formatSaveFolderName(folderName: string): string {
    return folderName.replace(/_\d+$/, "");
  }
</script>

<div class="save-cards-container flex gap-4 flex-row flex-wrap md:flex-nowrap">
  {#each saveFolders as folder}
    <div
      class="card card-side w-full card-xs md:w-72
      {folder.active
        ? 'ring-2 ring-indigo-200 shadow-lg shadow-indigo-500/50 bg-base-300'
        : 'card-border shadow-sm bg-base-100'}"
    >
      <img class="save-card-icon" src={junimoImage} alt="junimo icon" />
      <div
        class="card-body flex flex-row items-center justify-flex-start gap-4 my-1"
      >
        <h2 class="card-title">{folder.displayName}</h2>
        <div class="card-actions">
          <button
            class="btn btn-ghost btn-sm {folder.active
              ? 'btn-disabled'
              : 'btn-ghost'}"
            onclick={() => setSaveToActive(folder.name)}
          >
            {folder.active ? "Selected" : "Select"}
          </button>
        </div>
      </div>
    </div>
  {/each}
</div>

<style>
  .save-card-icon {
    width: 5rem;
    height: 5rem;
  }
</style>
