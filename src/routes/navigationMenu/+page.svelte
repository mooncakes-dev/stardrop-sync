<script lang="ts">
	import * as NavigationMenu from '$lib/components/ui/navigation-menu/index.js';
	import { MoonIcon, Settings, SquareStar, SunIcon } from '@lucide/svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import { toggleMode } from 'mode-watcher';
	import { Separator } from '$lib/components/ui/separator/index.js';
</script>

<NavigationMenu.Root
	class="mx-auto flex w-full max-w-7xl items-center justify-between px-3
	hover:shadow-lg transition-shadow duration-300 shadow-stone-300/50 dark:shadow-stone-700/50 rounded-xl h-13 "
>
	<NavigationMenu.List class="flex items-center gap-1 sm:gap-2 px-1 md:px-0">
		<NavigationMenu.Item>
			<NavigationMenu.Link>
				{#snippet child()}
					<a href="/dashboard" class="flex items-center"> <SquareStar class="inline mr-1 sm:mr-1.5" />Stardrop Sync</a>
				{/snippet}
			</NavigationMenu.Link>
		</NavigationMenu.Item>
	</NavigationMenu.List>

	<NavigationMenu.List class="flex h-5 items-center space-x-4 gap-1 sm:gap-2 px-1 md:px-0">
		<NavigationMenu.Item>
			<Button onclick={toggleMode} variant="ghost" size="icon" aria-label="Toggle theme">
				<SunIcon class="h-[1.2rem] w-[1.2rem] scale-100 rotate-0 !transition-all dark:scale-0 dark:-rotate-90" />
				<MoonIcon class="absolute h-[1.2rem] w-[1.2rem] scale-0 rotate-90 !transition-all dark:scale-100 dark:rotate-0" />
				<span class="sr-only">Toggle theme</span>
			</Button>
		</NavigationMenu.Item>
		<Separator orientation="vertical" class="hidden sm:inline-flex" />
		<NavigationMenu.Item>
			<NavigationMenu.Link>
				{#snippet child()}
					<a href="/settings" class="sm:hidden" aria-label="Settings">
						<Settings class="h-[1.2rem] w-[1.2rem]" />
					</a>
					<a href="/settings" class="hidden sm:inline-flex"> Settings </a>
				{/snippet}
			</NavigationMenu.Link>
		</NavigationMenu.Item>
	</NavigationMenu.List>
</NavigationMenu.Root>
