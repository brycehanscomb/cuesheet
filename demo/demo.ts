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

const cues = [
	{ cue: READY, label: "READY", time: 0 },
	{ cue: THREE, label: "3", time: 1000 },
	{ cue: TWO, label: "2", time: 2000 },
	{ cue: ONE, label: "1", time: 3000 },
	{ cue: GO, label: "GO!", time: 4000 },
	{ cue: PULSE, label: "PULSE", time: 4500, repeating: true },
	{ cue: FINISH, label: "FINISH", time: 7000 },
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
	cues.forEach(({ label, time, repeating }) => {
		const marker = document.createElement("div");
		marker.className = `marker${repeating ? " repeating" : ""}`;
		marker.style.left = `${(time / TOTAL_DURATION) * 100}%`;
		marker.innerHTML = `<span class="marker-dot"></span><span class="marker-label">${label}</span>`;
		marker.dataset.time = String(time);
		timeline.appendChild(marker);
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
function flash(label: string) {
	// Highlight marker
	const markers = timeline.querySelectorAll(".marker");
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
