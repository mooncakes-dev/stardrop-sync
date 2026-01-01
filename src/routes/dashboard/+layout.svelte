<script lang="ts">
	let { children } = $props();
</script>

<div class="dashboard-container">
	{@render children()}
</div>

<style>
	.dashboard-container {
		margin: 0 auto;
		padding: 1rem;
	}
</style>
