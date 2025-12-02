import fs from 'fs';
import path from 'path';

const KEY_FILE = path.join(process.cwd(), 'keys.json');

export interface ApiConfig {
  serpapi_key?: string;
  apify_token?: string;
  discord_webhook?: string; // 🆕 NEW FIELD
}

export function getApiKeys() {
  let fileConfig: ApiConfig = {};
  try {
    if (fs.existsSync(KEY_FILE)) {
      const raw = fs.readFileSync(KEY_FILE, 'utf-8');
      fileConfig = JSON.parse(raw);
    }
  } catch (e) {}

  return {
    SERPAPI_KEY: fileConfig.serpapi_key || process.env.SERPAPI_KEY,
    APIFY_TOKEN: fileConfig.apify_token || process.env.APIFY_TOKEN,
    DISCORD_WEBHOOK: fileConfig.discord_webhook || process.env.DISCORD_WEBHOOK
  };
}

export function saveApiKeys(config: ApiConfig) {
  let current = {};
  try {
      if (fs.existsSync(KEY_FILE)) current = JSON.parse(fs.readFileSync(KEY_FILE, 'utf-8'));
  } catch(e) {}

  const newConfig = { ...current, ...config };
  fs.writeFileSync(KEY_FILE, JSON.stringify(newConfig, null, 2));
}