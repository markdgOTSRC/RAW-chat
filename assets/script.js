// Study — frontend chat logic
// Talks to /api/chat (a serverless function that holds the real API key).
// No Anthropic key ever lives in this file or in the browser.

const thread = document.getElementById("thread");
const welcome = document.getElementById("welcome");
const form = document.getElementById("composerForm");
const input = document.getElementById("input");
const sendBtn = document.getElementById("sendBtn");
const statusDot = document.getElementById("statusDot");
const clearBtn = document.getElementById("clearBtn");

const STORAGE_KEY = "study.conversation.v1";

/** @type {{role: "user" | "assistant", content: string}[]} */
let history = loadHistory();

renderAll();
autosize();

// ---------- Events ----------

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const text = input.value.trim();
  if (!text) return;

  addMessage("user", text);
  input.value = "";
  autosize();
  saveHistory();

  await requestReply();
});

input.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    form.requestSubmit();
  }
});

input.addEventListener("input", autosize);

clearBtn.addEventListener("click", () => {
  if (history.length === 0) return;
  const ok = confirm("Clear this conversation? This can't be undone.");
  if (!ok) return;
  history = [];
  saveHistory();
  renderAll();
});

// ---------- Core ----------

async function requestReply() {
  setThinking(true);
  const typingEl = addTyping();

  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: history }),
    });

    typingEl.remove();

    if (!res.ok) {
      const errBody = await safeJson(res);
      const msg = errBody?.error || `Server responded with ${res.status}.`;
      addMessage("assistant", msg, { error: true });
      setThinking(false);
      return;
    }

    const data = await res.json();
    const reply = data.reply?.trim() || "(no response)";
    addMessage("assistant", reply);
    history.push({ role: "assistant", content: reply });
    saveHistory();
  } catch (err) {
    typingEl.remove();
    addMessage(
      "assistant",
      "Couldn't reach the server. Check your connection, or check that the /api/chat function is deployed correctly.",
      { error: true }
    );
  } finally {
    setThinking(false);
  }
}

// ---------- Rendering ----------

function addMessage(role, content, opts = {}) {
  hideWelcome();
  if (role === "user") history.push({ role: "user", content });

  const row = document.createElement("div");
  row.className = `msg ${role}`;

  const bubble = document.createElement("div");
  bubble.className = "bubble" + (opts.error ? " error" : "");
  bubble.textContent = content;

  row.appendChild(bubble);
  thread.appendChild(row);
  scrollToBottom();
  return row;
}

function addTyping() {
  hideWelcome();
  const row = document.createElement("div");
  row.className = "msg assistant";
  row.innerHTML = `<div class="bubble"><span class="typing"><span></span><span></span><span></span></span></div>`;
  thread.appendChild(row);
  scrollToBottom();
  return row;
}

function renderAll() {
  thread.querySelectorAll(".msg").forEach((el) => el.remove());
  if (history.length === 0) {
    welcome.style.display = "";
    return;
  }
  welcome.style.display = "none";
  for (const m of history) {
    const row = document.createElement("div");
    row.className = `msg ${m.role}`;
    const bubble = document.createElement("div");
    bubble.className = "bubble";
    bubble.textContent = m.content;
    row.appendChild(bubble);
    thread.appendChild(row);
  }
  scrollToBottom();
}

function hideWelcome() {
  welcome.style.display = "none";
}

function scrollToBottom() {
  requestAnimationFrame(() => {
    thread.scrollTop = thread.scrollHeight;
  });
}

function setThinking(isThinking) {
  statusDot.classList.toggle("thinking", isThinking);
  sendBtn.disabled = isThinking;
  input.disabled = isThinking;
}

function autosize() {
  input.style.height = "auto";
  input.style.height = Math.min(input.scrollHeight, 160) + "px";
}

// ---------- Storage ----------

function loadHistory() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveHistory() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  } catch {
    /* storage full or unavailable — conversation just won't persist */
  }
}

async function safeJson(res) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}
