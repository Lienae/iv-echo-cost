#!/usr/bin/env node
// data/skins-raw/batch-1.json ~ batch-7.json 을 합쳐 data/skins.json 을 생성한다.
// 배치마다 echoPrice 추출 규칙이 달랐으므로(TODO.md 참고), 모든 배치의 echoPrice를
// 무시하고 priceRaw 원문에서 규칙에 따라 다시 파싱한다.
// 규칙: priceRaw 안에서 "메아리" 단위가 붙은 숫자들 중 등급 기준가(rarities.json)와
// 일치하는 숫자가 있으면 그걸 채택, 없으면 그중 마지막 숫자를 채택.
// "메아리" 단위가 붙은 숫자가 하나도 없으면(예: "투시경/메아리" 병기처럼 표기가
// 모호한 경우) 추측하지 않고 null로 남긴다.

const fs = require("fs");
const path = require("path");

const DATA_DIR = path.join(__dirname, "..", "data");
const RAW_DIR = path.join(DATA_DIR, "skins-raw");
const BATCH_FILES = [1, 2, 3, 4, 5, 6, 7].map((n) => `batch-${n}.json`);

const UNIT_WORDS = ["메아리", "조각", "파편", "잔영", "투시경", "이벤트\\s*재화", "황금\\s*사과"];
const TOKEN_RE = new RegExp(`(\\d+)\\s*(${UNIT_WORDS.join("|")})?`, "g");

// priceRaw 원문에서 "메아리" 단위가 붙은 숫자들을 등장 순서대로 추출한다.
// 단위가 붙지 않은 숫자는(예: "2688/2888메아리"의 2688) 뒤따라오는 다음 숫자의
// 단위를 그대로 물려받는다(같은 통화의 구가/신가 표기이므로).
function extractEchoCandidates(priceRaw) {
  const tokens = [];
  let m;
  TOKEN_RE.lastIndex = 0;
  while ((m = TOKEN_RE.exec(priceRaw)) !== null) {
    tokens.push({ num: Number(m[1]), unit: m[2] ? m[2].replace(/\s+/g, "") : null });
  }

  // 뒤에서부터 채워서(backward-fill) 단위 없는 숫자에 다음 숫자의 단위를 붙인다.
  let nextUnit = null;
  for (let i = tokens.length - 1; i >= 0; i--) {
    if (tokens[i].unit === null) {
      tokens[i].unit = nextUnit;
    } else {
      nextUnit = tokens[i].unit;
    }
  }

  return tokens.filter((t) => t.unit === "메아리").map((t) => t.num);
}

function resolveEchoPrice(item, rarityBaseById) {
  const candidates = extractEchoCandidates(item.priceRaw || "");
  if (candidates.length === 0) return null;
  const base = rarityBaseById[item.rarityId];
  const match = candidates.find((n) => n === base);
  if (match !== undefined) return match;
  return candidates[candidates.length - 1];
}

function slugify(character, name) {
  const raw = `${character}-${name}`;
  return raw
    .replace(/['"'']/g, "")
    .replace(/[\s&]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function main() {
  const raritiesDoc = JSON.parse(fs.readFileSync(path.join(DATA_DIR, "rarities.json"), "utf8"));
  const rarityBaseById = {};
  for (const r of raritiesDoc.rarities) rarityBaseById[r.id] = r.echoPrice;

  const rawItems = [];
  for (const file of BATCH_FILES) {
    const items = JSON.parse(fs.readFileSync(path.join(RAW_DIR, file), "utf8"));
    rawItems.push(...items);
  }

  const usedIds = new Map();
  const skins = [];
  let reparsedCount = 0;
  let nullEchoCount = 0;

  for (const item of rawItems) {
    let echoPrice = null;
    if (item.currency === "echo") {
      echoPrice = resolveEchoPrice(item, rarityBaseById);
      reparsedCount++;
      if (echoPrice === null) nullEchoCount++;
    }

    let id = slugify(item.character, item.name);
    if (usedIds.has(id)) {
      const n = usedIds.get(id) + 1;
      usedIds.set(id, n);
      id = `${id}-${n}`;
    } else {
      usedIds.set(id, 1);
    }

    skins.push({
      id,
      character: item.character,
      name: item.name,
      rarityId: item.rarityId,
      echoPrice,
      currency: item.currency,
      releaseDate: item.releaseDate,
      priceRaw: item.priceRaw,
      note: item.note,
    });
  }

  const out = {
    _note:
      "나무위키 스킨 데이터. 7개 배치(data/skins-raw/batch-*.json)를 scripts/merge-skins.js로 병합하고 " +
      "priceRaw 원문을 재파싱해 echoPrice를 계산했다. currency가 'echo'가 아니면 메아리로 살 수 없는 " +
      "스킨이므로 echoPrice는 null이다.",
    schema: {
      id: "고유 슬러그 (character-name 기반, 자동 생성)",
      character: "캐릭터 이름",
      name: "스킨 이름",
      rarityId: "rarities.json의 id 참조 (scarce / unique / rare / legendary)",
      echoPrice: "실제 판매 메아리 가격. currency가 echo가 아니거나 파싱 실패 시 null",
      currency: "결제 수단 (echo / lens / other / unavailable)",
      releaseDate: "출시일 (YYYY-MM-DD, 모르면 null)",
      priceRaw: "나무위키 원문 가격 표기 (참고/재검증용)",
      note: "특이사항 (참고용)",
    },
    skins,
  };

  fs.writeFileSync(path.join(DATA_DIR, "skins.json"), JSON.stringify(out, null, 2) + "\n", "utf8");

  console.log(`총 ${skins.length}개 스킨 병합 완료 -> data/skins.json`);
  console.log(`currency=echo 항목 ${reparsedCount}개 재파싱, 그중 echoPrice null ${nullEchoCount}개`);
}

main();
