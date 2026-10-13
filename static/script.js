const tabButtons = document.querySelectorAll(".tab-btn");
const panels = document.querySelectorAll(".panel");
const modeField = document.getElementById("mode-field");
const form = document.getElementById("tts-form");
const submitBtn = document.getElementById("submit-btn");
const statusEl = document.getElementById("status");
const resultEl = document.getElementById("result");
const fileInputs = document.querySelectorAll('input[type="file"]');
const textInput = document.getElementById("text-input");
const charCount = document.getElementById("char-count");

// --- Tabs -------------------------------------------------------------

tabButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    tabButtons.forEach((b) => {
      b.classList.remove("active");
      b.setAttribute("aria-selected", "false");
    });
    btn.classList.add("active");
    btn.setAttribute("aria-selected", "true");

    const mode = btn.dataset.mode;
    modeField.value = mode === "text" ? "text" : "file";

    panels.forEach((p) => {
      p.classList.toggle("hidden", p.dataset.panel !== mode);
    });

    // Only the file input in the active panel should be submitted with the
    // form; disabled inputs are excluded from FormData automatically.
    fileInputs.forEach((input) => {
      input.disabled = input.closest(".panel").dataset.panel !== mode;
    });
  });
});

// --- Character counter -------------------------------------------------

textInput.addEventListener("input", () => {
  charCount.textContent = textInput.value.length.toLocaleString();
});

// --- Drag and drop file zones ------------------------------------------

document.querySelectorAll("[data-dropzone]").forEach((zone) => {
  const input = document.getElementById(zone.getAttribute("for"));
  const nameEl = zone.querySelector("[data-filename-for]");

  const updateName = () => {
    nameEl.textContent = input.files.length ? input.files[0].name : "No file selected";
  };
  input.addEventListener("change", updateName);

  ["dragenter", "dragover"].forEach((evt) => {
    zone.addEventListener(evt, (e) => {
      e.preventDefault();
      zone.classList.add("drag-over");
    });
  });

  ["dragleave", "drop"].forEach((evt) => {
    zone.addEventListener(evt, (e) => {
      e.preventDefault();
      zone.classList.remove("drag-over");
    });
  });

  zone.addEventListener("drop", (e) => {
    const dropped = e.dataTransfer.files;
    if (dropped.length) {
      input.files = dropped;
      updateName();
    }
  });
});

// --- Status helper -------------------------------------------------------

function setStatus(message, isError = false) {
  statusEl.textContent = message;
  statusEl.classList.remove("hidden");
  statusEl.classList.toggle("error", isError);
}

// --- Custom audio player --------------------------------------------------

const audioEl = document.getElementById("audio-el");
const playBtn = document.getElementById("play-btn");
const iconPlay = playBtn.querySelector(".icon-play");
const iconPause = playBtn.querySelector(".icon-pause");
const seekBar = document.getElementById("seek-bar");
const seekFill = document.getElementById("seek-fill");
const timeCurrent = document.getElementById("time-current");
const timeTotal = document.getElementById("time-total");
const downloadLink = document.getElementById("download-link");

function formatTime(sec) {
  if (!Number.isFinite(sec)) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

playBtn.addEventListener("click", () => {
  if (audioEl.paused) {
    audioEl.play();
  } else {
    audioEl.pause();
  }
});

audioEl.addEventListener("play", () => {
  iconPlay.style.display = "none";
  iconPause.style.display = "block";
});

audioEl.addEventListener("pause", () => {
  iconPlay.style.display = "block";
  iconPause.style.display = "none";
});

audioEl.addEventListener("loadedmetadata", () => {
  timeTotal.textContent = formatTime(audioEl.duration);
});

audioEl.addEventListener("timeupdate", () => {
  const pct = audioEl.duration ? (audioEl.currentTime / audioEl.duration) * 100 : 0;
  seekFill.style.width = `${pct}%`;
  timeCurrent.textContent = formatTime(audioEl.currentTime);
});

audioEl.addEventListener("ended", () => {
  iconPlay.style.display = "block";
  iconPause.style.display = "none";
});

seekBar.addEventListener("click", (e) => {
  if (!audioEl.duration) return;
  const rect = seekBar.getBoundingClientRect();
  const pct = (e.clientX - rect.left) / rect.width;
  audioEl.currentTime = pct * audioEl.duration;
});

// --- Submit ---------------------------------------------------------------

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  submitBtn.disabled = true;
  submitBtn.classList.add("loading");
  resultEl.classList.add("hidden");
  audioEl.pause();
  setStatus("Generating speech… this can take a little while on first run.");

  const formData = new FormData(form);

  try {
    const response = await fetch("/synthesize", {
      method: "POST",
      body: formData,
    });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Something went wrong.");
    }

    audioEl.src = data.audio_url;
    downloadLink.href = data.audio_url;
    seekFill.style.width = "0%";
    timeCurrent.textContent = "0:00";
    resultEl.classList.remove("hidden");
    setStatus("Done — ready to play or download.");
  } catch (err) {
    setStatus(err.message, true);
  } finally {
    submitBtn.disabled = false;
    submitBtn.classList.remove("loading");
  }
});
