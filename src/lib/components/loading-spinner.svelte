<script lang="ts">
	import { Spinner } from '$lib/components/ui/spinner/index.js';
	import * as Item from '$lib/components/ui/item/index.js';

	let { message } = $props();
</script>

<div class="flex w-full max-w-sm flex-col gap-4 [--radius:1rem]">
	<Item.Root variant="muted">
		<Item.Media>
			<Spinner />
		</Item.Media>
		<Item.Content>
			<Item.Title class="line-clamp-2">{message}</Item.Title>
		</Item.Content>
	</Item.Root>
</div>
