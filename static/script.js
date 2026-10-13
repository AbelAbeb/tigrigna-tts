const tabButtons = document.querySelectorAll(".tab-btn");
const panels = document.querySelectorAll(".panel");
const modeField = document.getElementById("mode-field");
const form = document.getElementById("tts-form");
const submitBtn = document.getElementById("submit-btn");
const statusEl = document.getElementById("status");
const resultEl = document.getElementById("result");
const player = document.getElementById("player");
const downloadLink = document.getElementById("download-link");
const fileInputs = document.querySelectorAll('input[type="file"]');

tabButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    tabButtons.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");

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

function setStatus(message, isError = false) {
  statusEl.textContent = message;
  statusEl.classList.remove("hidden");
  statusEl.classList.toggle("error", isError);
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  submitBtn.disabled = true;
  resultEl.classList.add("hidden");
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

    player.src = data.audio_url;
    downloadLink.href = data.audio_url;
    resultEl.classList.remove("hidden");
    setStatus("Done.");
  } catch (err) {
    setStatus(err.message, true);
  } finally {
    submitBtn.disabled = false;
  }
});
