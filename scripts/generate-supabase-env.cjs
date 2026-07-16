const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const outputPath = path.join(root, "public", "supabase-env.js");

const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "";
const anonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || "";

if (!url && !anonKey && fs.existsSync(outputPath)) {
  console.log("Keeping existing public/supabase-env.js because no Supabase env vars were provided.");
  process.exit(0);
}

const content = `window.ALVYA_SUPABASE = {
  url: ${JSON.stringify(url)},
  anonKey: ${JSON.stringify(anonKey)}
};
`;

fs.writeFileSync(outputPath, content);
console.log("Wrote public/supabase-env.js");
