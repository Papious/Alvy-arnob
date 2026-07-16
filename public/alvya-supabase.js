import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const cfg = window.ALVYA_SUPABASE || {};
const url = (cfg.url || "").trim();
const anonKey = (cfg.anonKey || "").trim();

export const ADMIN_EMAIL = "papious777@gmail.com";
export const STORAGE_BUCKET = "portfolio-media";
export const supabase = url && anonKey
  ? createClient(url, anonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true
      }
    })
  : null;

export function isConfigured() {
  return Boolean(supabase);
}

export function requireSupabase() {
  if (!supabase) {
    throw new Error("Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.");
  }
  return supabase;
}

export function textValue(row) {
  return row?.value?.text || "";
}

export function mediaValue(row) {
  return row?.value || {};
}

export async function getSession() {
  const client = requireSupabase();
  const { data, error } = await client.auth.getSession();
  if (error) throw error;
  return data.session;
}

export async function signIn(email, password) {
  const client = requireSupabase();
  return client.auth.signInWithPassword({ email, password });
}

export async function signOut() {
  const client = requireSupabase();
  return client.auth.signOut();
}

export async function loadSiteData() {
  const client = requireSupabase();
  const [contentRes, achievementRes, itemRes] = await Promise.all([
    client.from("site_content").select("key,value"),
    client.from("achievements").select("*").order("sort_order", { ascending: true }).order("year", { ascending: false }),
    client.from("portfolio_items").select("*").order("sort_order", { ascending: true }).order("created_at", { ascending: true })
  ]);

  if (contentRes.error) throw contentRes.error;
  if (achievementRes.error) throw achievementRes.error;
  if (itemRes.error) throw itemRes.error;

  const content = {};
  for (const row of contentRes.data || []) content[row.key] = row;

  return {
    content,
    achievements: achievementRes.data || [],
    items: itemRes.data || []
  };
}

export async function saveContent(key, value) {
  const client = requireSupabase();
  const { error } = await client
    .from("site_content")
    .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: "key" });
  if (error) throw error;
}

export async function saveAchievement(entry) {
  const client = requireSupabase();
  const payload = {
    year: Number(entry.year) || null,
    title: entry.title || "Untitled",
    description: entry.description || "",
    sort_order: Number(entry.sort_order) || 0,
    updated_at: new Date().toISOString()
  };

  const query = entry.id
    ? client.from("achievements").update(payload).eq("id", entry.id).select().single()
    : client.from("achievements").insert(payload).select().single();

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function deleteAchievement(id) {
  const client = requireSupabase();
  const { error } = await client.from("achievements").delete().eq("id", id);
  if (error) throw error;
}

export async function savePortfolioItem(item) {
  const client = requireSupabase();
  const payload = {
    category: item.category,
    title: item.title || "Untitled",
    description: item.description || "",
    responsibilities: item.responsibilities || [],
    media_url: item.media_url || null,
    media_path: item.media_path || null,
    media_type: item.media_type || null,
    sort_order: Number(item.sort_order) || 0,
    updated_at: new Date().toISOString()
  };

  const query = item.id
    ? client.from("portfolio_items").update(payload).eq("id", item.id).select().single()
    : client.from("portfolio_items").insert(payload).select().single();

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function deletePortfolioItem(item) {
  const client = requireSupabase();
  const { error } = await client.from("portfolio_items").delete().eq("id", item.id);
  if (error) throw error;
  if (item.media_path) {
    await client.storage.from(STORAGE_BUCKET).remove([item.media_path]);
  }
}

export async function uploadPublicFile(file, folder) {
  const client = requireSupabase();
  const ext = file.name.includes(".") ? file.name.split(".").pop().toLowerCase() : "bin";
  const safeName = file.name.replace(/[^a-z0-9._-]/gi, "-").toLowerCase();
  const path = `${folder}/${Date.now()}-${crypto.randomUUID()}-${safeName || `upload.${ext}`}`;
  const { error } = await client.storage.from(STORAGE_BUCKET).upload(path, file, {
    cacheControl: "31536000",
    upsert: false,
    contentType: file.type || undefined
  });
  if (error) throw error;
  const { data } = client.storage.from(STORAGE_BUCKET).getPublicUrl(path);
  return { path, url: data.publicUrl };
}
