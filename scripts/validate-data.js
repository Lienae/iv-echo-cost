#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const DATA_DIR = path.join(__dirname, "..", "data");

function readJson(name) {
  return JSON.parse(fs.readFileSync(path.join(DATA_DIR, name), "utf8"));
}

function fail(message) {
  console.error(`ERROR: ${message}`);
  process.exitCode = 1;
}

const raritiesDoc = readJson("rarities.json");
const skinsDoc = readJson("skins.json");
const packsDoc = readJson("echo-packs.json");

const rarityIds = new Set((raritiesDoc.rarities || []).map((rarity) => rarity.id));
const knownCurrencies = new Set(["echo", "unknown_echo", "lens", "fragment", "other", "unavailable"]);
const skinIds = new Set();
const characters = new Set();
let echoNullCount = 0;
let unknownEchoCount = 0;

if (!Array.isArray(raritiesDoc.rarities) || raritiesDoc.rarities.length === 0) {
  fail("rarities.json에 rarities 배열이 없습니다.");
}

for (const rarity of raritiesDoc.rarities || []) {
  if (!rarity.id) fail("rarities.json에 id가 없는 등급이 있습니다.");
  if (!rarity.name) fail(`등급 ${rarity.id}에 name이 없습니다.`);
  if (!Number.isInteger(rarity.echoPrice) || rarity.echoPrice <= 0) {
    fail(`등급 ${rarity.id}의 echoPrice가 올바르지 않습니다.`);
  }
}

if (!Array.isArray(skinsDoc.skins) || skinsDoc.skins.length === 0) {
  fail("skins.json에 skins 배열이 없습니다.");
}

for (const skin of skinsDoc.skins || []) {
  if (!skin.id) fail("id가 없는 스킨이 있습니다.");
  if (skinIds.has(skin.id)) fail(`중복 스킨 id: ${skin.id}`);
  skinIds.add(skin.id);

  if (!skin.character) fail(`스킨 ${skin.id}에 character가 없습니다.`);
  if (!skin.name) fail(`스킨 ${skin.id}에 name이 없습니다.`);
  if (!rarityIds.has(skin.rarityId) && skin.rarityId !== "other") {
    fail(`스킨 ${skin.id}의 rarityId가 rarities.json에 없습니다: ${skin.rarityId}`);
  }
  if (!knownCurrencies.has(skin.currency)) {
    fail(`스킨 ${skin.id}의 currency가 알려진 값이 아닙니다: ${skin.currency}`);
  }

  if (skin.character) characters.add(skin.character);

  if (skin.currency === "echo") {
    if (skin.echoPrice === null || skin.echoPrice === undefined) {
      echoNullCount++;
    } else if (!Number.isInteger(skin.echoPrice) || skin.echoPrice <= 0) {
      fail(`스킨 ${skin.id}의 echoPrice가 올바르지 않습니다.`);
    }
  } else if (skin.currency === "unknown_echo") {
    unknownEchoCount++;
    if (skin.echoPrice !== null && skin.echoPrice !== undefined) {
      fail(`메아리 가격 확인 필요 스킨 ${skin.id}에 echoPrice가 들어 있습니다.`);
    }
  } else if (skin.echoPrice !== null && skin.echoPrice !== undefined) {
    fail(`메아리 구매가 아닌 스킨 ${skin.id}에 echoPrice가 들어 있습니다.`);
  }
}

if (!Array.isArray(packsDoc.bases) || packsDoc.bases.length === 0) {
  fail("echo-packs.json에 bases 배열이 없습니다.");
}

for (const basis of packsDoc.bases || []) {
  if (!basis.id) fail("id가 없는 결제 기준이 있습니다.");
  if (!basis.label) fail(`결제 기준 ${basis.id}에 label이 없습니다.`);
  if (!basis.currency) fail(`결제 기준 ${basis.id}에 currency가 없습니다.`);
  if (!basis.currencySymbol) fail(`결제 기준 ${basis.id}에 currencySymbol이 없습니다.`);
  if (!Array.isArray(basis.packs) || basis.packs.length === 0) {
    fail(`결제 기준 ${basis.id}에 packs가 없습니다.`);
    continue;
  }

  const echoes = new Set();
  for (const pack of basis.packs) {
    if (!Number.isInteger(pack.echo) || pack.echo <= 0) {
      fail(`결제 기준 ${basis.id}에 올바르지 않은 echo 수량이 있습니다.`);
    }
    if (!Number.isFinite(pack.price) || pack.price <= 0) {
      fail(`결제 기준 ${basis.id}에 올바르지 않은 price가 있습니다.`);
    }
    if (echoes.has(pack.echo)) {
      fail(`결제 기준 ${basis.id}에 중복 echo 티어가 있습니다: ${pack.echo}`);
    }
    echoes.add(pack.echo);
  }
}

console.log(`rarities: ${(raritiesDoc.rarities || []).length}`);
console.log(`characters: ${characters.size}`);
console.log(`skins: ${(skinsDoc.skins || []).length}`);
console.log(`payment bases: ${(packsDoc.bases || []).length}`);
console.log(`echo skins without explicit echoPrice: ${echoNullCount}`);
console.log(`skins requiring echo price confirmation: ${unknownEchoCount}`);

if (process.exitCode) {
  console.error("validate-data.js: failed");
} else {
  console.log("validate-data.js: all checks passed");
}
