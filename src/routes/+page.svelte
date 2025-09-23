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

<main class="container">
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
:root {
  font-family: Inter, Avenir, Helvetica, Arial, sans-serif;
  font-size: 16px;
  line-height: 24px;
  font-weight: 400;

  color: #0f0f0f;
  background-color: #f6f6f6;

  font-synthesis: none;
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  -webkit-text-size-adjust: 100%;
}

.container {
  margin: 0;
  padding-top: 10vh;
  display: flex;
  flex-direction: column;
  justify-content: center;
  text-align: center;
}

.row {
  display: flex;
  justify-content: center;
}

h1 {
  text-align: center;
}

input,
button {
  border-radius: 8px;
  border: 1px solid transparent;
  padding: 0.6em 1.2em;
  font-size: 1em;
  font-weight: 500;
  font-family: inherit;
  color: #0f0f0f;
  background-color: #ffffff;
  transition: border-color 0.25s;
  box-shadow: 0 2px 2px rgba(0, 0, 0, 0.2);
}

button {
  cursor: pointer;
}

button:hover {
  border-color: #396cd8;
}
button:active {
  border-color: #396cd8;
  background-color: #e8e8e8;
}

input,
button {
  outline: none;
}

@media (prefers-color-scheme: dark) {
  :root {
    color: #f6f6f6;
    background-color: #2f2f2f;
  }

  input,
  button {
    color: #ffffff;
    background-color: #0f0f0f98;
  }
  button:active {
    background-color: #0f0f0f69;
  }
}

</style>
