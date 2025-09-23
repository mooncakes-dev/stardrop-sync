<script lang="ts">
  import { invoke } from "@tauri-apps/api/core";
  import { onMount } from "svelte";

  let name = $state("");
  let greetMsg = $state("");

  let savePath = $state("");
  let savePathMsg = $state("");

  let save_path_location_default = $state("");
  let save_folders_array = $state([]);

  let save_folder_update_time = $state("");

  onMount(async () => {
    save_path_location_default = await invoke("check_for_default_saves_folder");
    save_folders_array = await invoke("list_all_save_folders");
    save_folder_update_time = await invoke("check_for_updates");
  });
  async function greet(event: Event) {
    event.preventDefault();
    greetMsg = await invoke("greet", { name });
  }

  async function setSaveFilePath(event: Event) {
    event.preventDefault();
    savePathMsg = await invoke("set_save_file_path", { savePath })
  }
</script>

<main class="prose  container mx-auto px-4">
  <h1>Welcome to Stardew Sync</h1>
  <div class="row">
    <h2>Step 1: Access the save file</h2>
  </div>
  <form class="row" onsubmit={setSaveFilePath}>
    <input id="save-input" placeholder="Enter save file path here" bind:value={savePath} />
    <button type="submit">Add</button>
  </form>
  <p>{savePathMsg}</p>
  <p>Save file location: {save_path_location_default} </p>
  <p> All folders inside the saves: </p>
  <ul>
    {#each save_folders_array as folder }
            <li>{folder}</li>
      {/each}
  </ul>
  <p>Save file last update: {save_folder_update_time}</p>
</main>

<style>

</style>
