<div class="weesp-analysis-popup pointer-events-none absolute z-[80]">
	<div class="scan-ring"></div>
	<div>
		<div class="analysis-title">Analysing tree...</div>
		<div class="analysis-subtitle">Fusing LiDAR, NDVI, thermal, and probability evidence</div>
	</div>
	<div class="analysis-bars" aria-hidden="true"><span></span><span></span><span></span></div>
</div>

<style>
	.weesp-analysis-popup {
		left: 50%;
		top: 50%;
		transform: translate(-50%, -50%);
		display: grid;
		grid-template-columns: auto 1fr auto;
		align-items: center;
		gap: 18px;
		min-width: min(560px, 72vw);
		padding: 24px 28px;
		border: 1px solid rgba(97, 216, 255, 0.38);
		border-radius: 28px;
		background: linear-gradient(135deg, rgba(7, 12, 22, 0.94), rgba(16, 25, 38, 0.8));
		box-shadow: 0 26px 80px rgba(0, 0, 0, 0.52), 0 0 42px rgba(97, 216, 255, 0.2);
		backdrop-filter: blur(18px) saturate(140%);
		color: white;
	}

	.scan-ring {
		width: 54px;
		height: 54px;
		border: 2px solid rgba(97, 216, 255, 0.18);
		border-top-color: #61d8ff;
		border-right-color: #67e985;
		border-radius: 999px;
		box-shadow: 0 0 24px rgba(97, 216, 255, 0.26);
		animation: scan-spin 1.1s linear infinite;
	}

	.analysis-title {
		font-size: clamp(22px, 2.7vw, 36px);
		font-weight: 700;
		letter-spacing: -0.04em;
	}

	.analysis-subtitle {
		margin-top: 6px;
		font-size: clamp(12px, 1.25vw, 16px);
		color: rgba(255, 255, 255, 0.68);
	}

	.analysis-bars {
		display: flex;
		align-items: end;
		gap: 4px;
		height: 34px;
	}

	.analysis-bars span {
		width: 5px;
		border-radius: 99px;
		background: #61d8ff;
		animation: analyse-bar 0.8s ease-in-out infinite alternate;
	}

	.analysis-bars span:nth-child(1) {
		height: 14px;
	}

	.analysis-bars span:nth-child(2) {
		height: 26px;
		animation-delay: 0.12s;
		background: #67e985;
	}

	.analysis-bars span:nth-child(3) {
		height: 20px;
		animation-delay: 0.24s;
		background: #ffb84d;
	}

	@keyframes scan-spin {
		to {
			transform: rotate(360deg);
		}
	}

	@keyframes analyse-bar {
		to {
			transform: scaleY(0.42);
			opacity: 0.55;
		}
	}
</style>
