#!/usr/bin/env node
import fs from "node:fs/promises";
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";

const provider = process.argv[2] || "groq";
const key = process.argv[3];
const rl = key ? null : createInterface({ input: stdin, output: stdout });
const apiKey = key || (await rl.question("Groq API key: ")).trim();
rl?.close();
if (!apiKey) process.exit(1);
const path = ".env.local";
const current = await fs.readFile(path, "utf8").catch(() => "");
const withoutKey = current.replace(/^GROQ_API_KEY=.*$/m, "").replace(/^GROQ_MODEL=.*$/m, "").trim();
await fs.writeFile(path, `${withoutKey}\nGROQ_API_KEY=${apiKey}\nGROQ_MODEL=${provider === "groq" ? "qwen/qwen3-32b" : "qwen/qwen3-32b"}\n`);
console.log("Local AI environment updated.");
