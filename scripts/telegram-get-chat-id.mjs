#!/usr/bin/env node
// telegram-get-chat-id.mjs — fetch your chat id from the Telegram Bot API.
//
// Usage (after you've created the bot AND messaged it once):
//   node scripts/telegram-get-chat-id.mjs <BOT_TOKEN>
//
// Prints the chat id to copy into .sail/.env.local as TELEGRAM_CHAT_ID.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const token = process.argv[2] || process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
  console.error("Usage: node scripts/telegram-get-chat-id.mjs <BOT_TOKEN>");
  console.error("  (or set TELEGRAM_BOT_TOKEN in .sail/.env.local first)");
  process.exit(1);
}

const res = await fetch(`https://api.telegram.org/bot${token}/getUpdates`);
if (!res.ok) {
  console.error(`getUpdates failed: ${res.status} ${await res.text()}`);
  console.error("Make sure you have sent at least one message to your bot first.");
  process.exit(1);
}
const json = await res.json();
if (!json.ok) {
  console.error(`Telegram error: ${json.description}`);
  process.exit(1);
}

const updates = json.result || [];
if (updates.length === 0) {
  console.error("No updates found. Open Telegram, find your bot, and send it any message (e.g. \"hi\"). Then re-run this command.");
  process.exit(1);
}

const chatIds = new Set();
for (const u of updates) {
  const chat = u.message?.chat || u.channel_post?.chat || u.my_chat_member?.chat;
  if (chat?.id) chatIds.add(String(chat.id));
}

const [chatId] = [...chatIds];
console.log(`Chat id: ${chatId}`);
console.log("");
console.log(`Add this line to .sail/.env.local:`);
console.log(`TELEGRAM_CHAT_ID=${chatId}`);

// Optionally write it into .env.local directly (append or update).
const envPath = resolve(process.cwd(), ".sail", ".env.local");
if (existsSync(envPath)) {
  let env = readFileSync(envPath, "utf8");
  if (/^TELEGRAM_CHAT_ID=/m.test(env)) {
    env = env.replace(/^TELEGRAM_CHAT_ID=.*$/m, `TELEGRAM_CHAT_ID=${chatId}`);
  } else {
    env = env.replace(/\s*$/, `\nTELEGRAM_CHAT_ID=${chatId}\n`);
  }
  writeFileSync(envPath, env);
  console.log("Wrote TELEGRAM_CHAT_ID to .sail/.env.local");
}
