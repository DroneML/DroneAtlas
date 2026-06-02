<script lang="ts">
	export let panelOpen = false;
	export let annotationDrawingEnabled = false;
	export let canUndoOrClear = false;
	export let onToggleDrawing: () => void;
	export let onUndo: () => void;
	export let onClear: () => void;
</script>

<div class="annotation-toolbar absolute bottom-6 right-4 z-50 flex flex-col items-end gap-2" class:panelOpen>
	<div class="annotation-actions flex items-center gap-1 rounded-lg p-1 shadow-lg backdrop-blur-md">
		<button
			class="btn btn-sm"
			class:btn-primary={annotationDrawingEnabled}
			class:btn-ghost={!annotationDrawingEnabled}
			onclick={onToggleDrawing}
		>
			{annotationDrawingEnabled ? 'Drawing on' : 'Draw'}
		</button>
		<button class="btn btn-ghost btn-sm" disabled={!canUndoOrClear} onclick={onUndo}>Undo</button>
		<button class="btn btn-ghost btn-sm" disabled={!canUndoOrClear} onclick={onClear}>Clear</button>
	</div>
	{#if annotationDrawingEnabled}
		<div class="annotation-help max-w-64 rounded-lg px-3 py-2 text-xs shadow-lg backdrop-blur-md">
			Drag on the map to sketch an annotation. Drawing mode disables map panning until turned off.
		</div>
	{/if}
</div>

<style>
	.annotation-toolbar.panelOpen {
		right: 392px;
	}

	.annotation-actions,
	.annotation-help {
		border: 1px solid rgba(167, 213, 255, 0.14);
		background: rgba(8, 13, 21, 0.78);
		color: rgba(232, 241, 255, 0.78);
	}

	.annotation-actions :global(.btn) {
		min-height: 2rem;
		height: 2rem;
		border-radius: 9px;
		border-color: rgba(167, 213, 255, 0.12);
		background: rgba(255, 255, 255, 0.04);
		color: rgba(232, 241, 255, 0.78);
	}

	.annotation-actions :global(.btn-primary) {
		border-color: rgba(97, 216, 255, 0.42);
		background: rgba(97, 216, 255, 0.18);
		color: #e8f8ff;
	}

	@media (max-width: 1023px) {
		.annotation-toolbar,
		.annotation-toolbar.panelOpen {
			right: 12px;
			bottom: calc(44vh + 28px);
		}
	}
</style>
