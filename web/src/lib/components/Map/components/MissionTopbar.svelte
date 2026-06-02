<script lang="ts">
	export let visibleLayerCount = 0;
	export let selectedLocationName = 'Netherlands overview';
	export let onResetView: () => void;
</script>

<header class="mission-topbar absolute left-0 right-0 top-0 z-50">
	<div class="brand-lockup">
		<div class="brand-mark"><span></span></div>
		<div>
			<div class="brand-name">Drone<span>ATLAS</span></div>
			<div class="brand-subtitle">Spatial intelligence workspace</div>
		</div>
	</div>

	<div class="mission-status">
		<div class="status-chip live"><span></span> live raster analysis</div>
		<div class="status-chip">{visibleLayerCount} active layers</div>
		<div class="status-chip location-chip">{selectedLocationName}</div>
	</div>

	<button class="reset-button" type="button" onclick={onResetView}>Reset view</button>
</header>

<style>
	.mission-topbar {
		display: grid;
		grid-template-columns: auto minmax(0, 1fr) auto;
		align-items: center;
		gap: 18px;
		min-height: 68px;
		padding: 12px 16px;
		border-bottom: 1px solid rgba(167, 213, 255, 0.12);
		background:
			linear-gradient(180deg, rgba(6, 10, 17, 0.9), rgba(6, 10, 17, 0.56)),
			radial-gradient(circle at 18% 0%, rgba(97, 216, 255, 0.12), transparent 36%);
		box-shadow: 0 18px 52px rgba(0, 0, 0, 0.38);
		backdrop-filter: blur(18px) saturate(140%);
	}

	.brand-lockup {
		display: flex;
		align-items: center;
		gap: 10px;
		min-width: 218px;
	}

	.brand-mark {
		display: grid;
		place-items: center;
		width: 36px;
		height: 36px;
		border: 1px solid rgba(97, 216, 255, 0.34);
		border-radius: 12px;
		background: rgba(97, 216, 255, 0.08);
		box-shadow: 0 0 28px rgba(97, 216, 255, 0.18), inset 0 0 18px rgba(97, 216, 255, 0.1);
	}

	.brand-mark span {
		width: 14px;
		height: 14px;
		border: 2px solid #9de9ff;
		border-radius: 50%;
		box-shadow: 0 0 16px #61d8ff;
	}

	.brand-name {
		font-size: 14px;
		font-weight: 650;
		letter-spacing: 0.02em;
		line-height: 1;
	}

	.brand-name span {
		font-weight: 900;
		color: #b9f1ff;
	}

	.brand-subtitle {
		margin-top: 4px;
		font-size: 10px;
		font-weight: 700;
		letter-spacing: 0.16em;
		text-transform: uppercase;
		color: rgba(232, 241, 255, 0.44);
	}

	.mission-status {
		display: flex;
		min-width: 0;
		align-items: center;
		justify-content: center;
		gap: 8px;
	}

	.status-chip,
	.reset-button {
		border: 1px solid rgba(167, 213, 255, 0.14);
		background: rgba(8, 13, 21, 0.72);
		box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.07), 0 14px 30px rgba(0, 0, 0, 0.28);
		backdrop-filter: blur(14px);
	}

	.status-chip {
		display: inline-flex;
		align-items: center;
		gap: 7px;
		min-width: 0;
		max-width: 290px;
		overflow: hidden;
		padding: 7px 10px;
		border-radius: 999px;
		font-size: 10px;
		font-weight: 850;
		letter-spacing: 0.12em;
		text-overflow: ellipsis;
		text-transform: uppercase;
		white-space: nowrap;
		color: rgba(232, 241, 255, 0.72);
	}

	.status-chip.live {
		border-color: rgba(103, 233, 133, 0.2);
		color: rgba(204, 255, 216, 0.82);
	}

	.status-chip.live span {
		width: 7px;
		height: 7px;
		border-radius: 50%;
		background: #67e985;
		box-shadow: 0 0 14px #67e985;
	}

	.reset-button {
		padding: 9px 13px;
		border-radius: 12px;
		font-size: 11px;
		font-weight: 850;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: rgba(232, 241, 255, 0.8);
		transition: transform 0.18s ease, border-color 0.18s ease, background 0.18s ease;
	}

	.reset-button:hover {
		transform: translateY(-1px);
		border-color: rgba(97, 216, 255, 0.4);
		background: rgba(97, 216, 255, 0.1);
	}

	@media (max-width: 1023px) {
		.mission-topbar {
			grid-template-columns: auto auto;
			min-height: 64px;
			gap: 10px;
		}

		.brand-lockup {
			min-width: 0;
		}

		.brand-subtitle,
		.location-chip,
		.mission-status .status-chip:nth-child(2) {
			display: none;
		}

		.mission-status {
			justify-content: flex-end;
		}

		.reset-button {
			display: none;
		}
	}

	@media (max-width: 640px) {
		.mission-topbar {
			padding: 10px 12px;
		}

		.brand-name {
			font-size: 13px;
		}

		.status-chip.live {
			max-width: 148px;
			font-size: 9px;
		}
	}
</style>
