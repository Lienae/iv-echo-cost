#!/usr/bin/env node

const { spawnSync } = require("child_process");

const checks = [
  ["node", ["--check", "app.js"]],
  ["node", ["--check", "src/calc.js"]],
  ["node", ["--check", "scripts/merge-skins.js"]],
  ["node", ["--check", "scripts/validate-data.js"]],
  ["node", ["--check", "scripts/serve-static.js"]],
  ["node", ["tests/calc.test.js"]],
  ["node", ["scripts/validate-data.js"]],
];

for (const [command, args] of checks) {
  const label = [command, ...args].join(" ");
  console.log(`\n> ${label}`);
  const result = spawnSync(command, args, { stdio: "inherit" });
  if (result.status !== 0) {
    console.error(`\ncheck failed: ${label}`);
    process.exit(result.status || 1);
  }
}

console.log("\nAll checks passed");
