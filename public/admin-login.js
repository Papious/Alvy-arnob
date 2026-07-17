import { isConfigured, signIn } from "./alvya-supabase.js";

const form = document.querySelector(".card");
const note = document.querySelector(".note");
const email = document.getElementById("email");
const password = document.getElementById("pw");

function setNote(message) {
  if (note) note.textContent = message;
}

if (!isConfigured()) {
  setNote("Add Supabase URL and anon key first");
}

form?.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!isConfigured()) {
    setNote("Supabase is not configured yet");
    return;
  }
  try {
    setNote("Signing in...");
    const { error } = await signIn(email.value.trim(), password.value);
    if (error) throw error;
    window.location.href = "/admin-dashboard.html";
  } catch (error) {
    setNote(error.message || "Login failed");
  }
});
