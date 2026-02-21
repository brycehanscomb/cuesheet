import { cue, cuesheet } from "../src/index";

// --- Cue Definitions ---
const READY = cue(0);
const THREE = cue(1000);
const TWO = cue(2000);
const ONE = cue(3000);
const GO = cue(4000);
const PULSE = cue(4500).repeats(500).times(5);
const FINISH = cue(7000);

const TOTAL_DURATION = 7500;

const PULSE_START = 4500;
const PULSE_INTERVAL = 500;
const PULSE_COUNT = 5;

const cues = [
	{ label: "READY", time: 0 },
	{ label: "3", time: 1000 },
	{ label: "2", time: 2000 },
	{ label: "1", time: 3000 },
	{ label: "GO!", time: 4000 },
	...Array.from({ length: PULSE_COUNT }, (_, i) => ({
		label: `PULSE`,
		time: PULSE_START + i * PULSE_INTERVAL,
		repeating: true,
	})),
	{ label: "FINISH", time: 7000 },
];

// --- DOM References ---
const playBtn = document.getElementById("play-btn") as HTMLButtonElement;
const resetBtn = document.getElementById("reset-btn") as HTMLButtonElement;
const scrubber = document.getElementById("scrubber") as HTMLInputElement;
const timeDisplay = document.getElementById("time-display") as HTMLElement;
const timeline = document.getElementById("timeline") as HTMLElement;
const playhead = document.getElementById("playhead") as HTMLElement;
const demoDisplay = document.getElementById("demo-display") as HTMLElement;

// --- Sheet Setup ---
const sheet = cuesheet();
let isPlaying = false;
let animFrameId: number | null = null;

// --- Timeline Markers ---
function renderMarkers() {
	let pulseCount = 0;
	cues.forEach(({ label, time, repeating }) => {
		const marker = document.createElement("div");
		marker.className = `marker${repeating ? " repeating" : ""}`;
		marker.style.left = `${(time / TOTAL_DURATION) * 100}%`;
		const showLabel = !repeating || pulseCount === 0;
		marker.innerHTML = `<span class="marker-dot"></span>${showLabel ? `<span class="marker-label">${label}</span>` : ""}`;
		marker.dataset.time = String(time);
		timeline.appendChild(marker);
		if (repeating) pulseCount++;
	});
}

// --- Cue Subscriptions ---
function setupCues() {
	sheet.on(READY, () => {
		flash("READY");
		demoDisplay.textContent = "🚀";
		demoDisplay.style.transform = "scale(1)";
	});

	sheet.on(THREE, () => {
		flash("3");
		demoDisplay.textContent = "3";
	});

	sheet.on(TWO, () => {
		flash("2");
		demoDisplay.textContent = "2";
	});

	sheet.on(ONE, () => {
		flash("1");
		demoDisplay.textContent = "1";
	});

	sheet.on(GO, () => {
		flash("GO!");
		demoDisplay.textContent = "🚀";
		demoDisplay.style.transform = "scale(1.5)";
	});

	sheet.on(PULSE, () => {
		flash("PULSE");
		demoDisplay.style.transform =
			demoDisplay.style.transform === "scale(1.5)"
				? "scale(1.8)"
				: "scale(1.5)";
	});

	sheet.on(FINISH, () => {
		flash("FINISH");
		demoDisplay.textContent = "✨";
		demoDisplay.style.transform = "scale(1)";
		isPlaying = false;
		playBtn.textContent = "▶ Play";
	});
}

// --- Visual Feedback ---
let pulseIndex = 0;

function flash(label: string) {
	if (label === "PULSE") {
		// Flash the next unfired pulse marker
		const pulseMarkers = timeline.querySelectorAll(".marker.repeating");
		if (pulseIndex < pulseMarkers.length) {
			const el = pulseMarkers[pulseIndex] as HTMLElement;
			el.classList.add("fired");
			setTimeout(() => el.classList.remove("fired"), 400);
			pulseIndex++;
		}
		return;
	}

	const markers = timeline.querySelectorAll(".marker:not(.repeating)");
	markers.forEach((m) => {
		const el = m as HTMLElement;
		if (el.querySelector(".marker-label")?.textContent === label) {
			el.classList.add("fired");
			setTimeout(() => el.classList.remove("fired"), 300);
		}
	});
}

function updateUI() {
	const t = sheet.currentTime;
	const pct = Math.min(t / TOTAL_DURATION, 1);
	playhead.style.left = `${pct * 100}%`;
	scrubber.value = String(Math.round(t));
	timeDisplay.textContent = `${(t / 1000).toFixed(2)}s`;

	if (isPlaying) {
		if (t >= TOTAL_DURATION) {
			sheet.pause();
			isPlaying = false;
			playBtn.textContent = "▶ Play";
		}
		animFrameId = requestAnimationFrame(updateUI);
	}
}

// --- Controls ---
playBtn.addEventListener("click", () => {
	if (isPlaying) {
		sheet.pause();
		isPlaying = false;
		playBtn.textContent = "▶ Play";
		if (animFrameId != null) cancelAnimationFrame(animFrameId);
	} else {
		if (sheet.currentTime >= TOTAL_DURATION) {
			sheet.seek(0);
			pulseIndex = 0;
			demoDisplay.textContent = "🚀";
			demoDisplay.style.transform = "scale(1)";
		}
		sheet.play();
		isPlaying = true;
		playBtn.textContent = "⏸ Pause";
		animFrameId = requestAnimationFrame(updateUI);
	}
});

resetBtn.addEventListener("click", () => {
	sheet.pause();
	sheet.seek(0);
	isPlaying = false;
	pulseIndex = 0;
	playBtn.textContent = "▶ Play";
	if (animFrameId != null) cancelAnimationFrame(animFrameId);
	demoDisplay.textContent = "🚀";
	demoDisplay.style.transform = "scale(1)";
	updateUI();
});

scrubber.max = String(TOTAL_DURATION);
scrubber.addEventListener("input", () => {
	const wasPlaying = isPlaying;
	if (isPlaying) {
		sheet.pause();
		isPlaying = false;
		if (animFrameId != null) cancelAnimationFrame(animFrameId);
	}
	sheet.seek(Number(scrubber.value));
	updateUI();
	if (wasPlaying) {
		sheet.play();
		isPlaying = true;
		playBtn.textContent = "⏸ Pause";
		animFrameId = requestAnimationFrame(updateUI);
	}
});

// --- Init ---
renderMarkers();
setupCues();
updateUI();
