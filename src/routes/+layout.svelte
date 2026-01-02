<script lang="ts">
	import '../app.css';
	import { ModeWatcher, toggleMode } from 'mode-watcher';
	import NavigationMenu from './navigationMenu/+page.svelte';
	import { Separator } from '$lib/components/ui/separator';

	let { children } = $props();
</script>

<ModeWatcher />
<main class="mx-auto max-w-7xl py-4 px-4 sm:px-6 lg:px-8">
	<NavigationMenu></NavigationMenu>
	<Separator class="my-4" />
	{@render children()}
</main>
