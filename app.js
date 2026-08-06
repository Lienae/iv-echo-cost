const state = {
  rarities: [],
  skins: [],
  estimate: null,
};

async function loadData() {
  const [raritiesRes, skinsRes, estimateRes] = await Promise.all([
    fetch("data/rarities.json"),
    fetch("data/skins.json"),
    fetch("data/echo-price-estimate.json"),
  ]);
  const raritiesJson = await raritiesRes.json();
  const skinsJson = await skinsRes.json();
  state.rarities = raritiesJson.rarities;
  state.estimate = await estimateRes.json();

  const realSkins = (skinsJson.skins || []).filter((s) => s.id !== "EXAMPLE_DELETE_ME");
  state.skins = realSkins;
}

function rarityById(id) {
  return state.rarities.find((r) => r.id === id);
}

const CURRENCY_LABELS = {
  unavailable: "구매불가",
  lens: "투시경 전용",
  fragment: "조각 전용",
  other: "기타 재화 전용",
};

function priceLabel(skin) {
  if (skin.currency === "echo") {
    const price = skin.echoPrice ?? rarityById(skin.rarityId)?.echoPrice ?? "?";
    return `${price}메아리`;
  }
  return CURRENCY_LABELS[skin.currency] || skin.currency;
}

function echoPriceOrNull(skin) {
  if (skin.currency !== "echo") return null;
  return skin.echoPrice ?? rarityById(skin.rarityId)?.echoPrice ?? null;
}

// 메아리로 살 수 없는 스킨(가격 null)은 오름차순/내림차순 상관없이 항상 뒤로 밀린다.
function comparePriceSort(a, b, direction) {
  const pa = echoPriceOrNull(a);
  const pb = echoPriceOrNull(b);
  if (pa === null && pb === null) return 0;
  if (pa === null) return 1;
  if (pb === null) return -1;
  return direction === "asc" ? pa - pb : pb - pa;
}

function groupByCharacter(skins) {
  const map = new Map();
  for (const skin of skins) {
    if (!map.has(skin.character)) map.set(skin.character, []);
    map.get(skin.character).push(skin);
  }
  for (const group of map.values()) {
    group.sort((a, b) => a.name.localeCompare(b.name, "ko"));
  }
  return map;
}

function makeSkinOption(skin) {
  const option = document.createElement("option");
  option.value = skin.id;
  option.textContent = `${skin.character} - ${skin.name} (${priceLabel(skin)})`;
  return option;
}

function populateSkinSelect() {
  const select = document.getElementById("skin-select");
  const sortSelect = document.getElementById("skin-sort");
  const status = document.getElementById("skin-status");
  const rarityFallback = document.getElementById("rarity-fallback");

  if (state.skins.length === 0) {
    select.hidden = true;
    sortSelect.hidden = true;
    status.textContent = "스킨 데이터가 아직 준비되지 않았습니다. 아래에서 등급으로 계산해주세요.";
    rarityFallback.hidden = false;
    return;
  }

  const previousValue = select.value;
  select.innerHTML = "";

  if (sortSelect.value === "character") {
    const grouped = groupByCharacter(state.skins);
    const characters = [...grouped.keys()].sort((a, b) => a.localeCompare(b, "ko"));
    for (const character of characters) {
      const group = document.createElement("optgroup");
      group.label = character;
      for (const skin of grouped.get(character)) {
        group.appendChild(makeSkinOption(skin));
      }
      select.appendChild(group);
    }
  } else {
    const sorted = [...state.skins];
    if (sortSelect.value === "price-asc") {
      sorted.sort((a, b) => comparePriceSort(a, b, "asc"));
    } else if (sortSelect.value === "price-desc") {
      sorted.sort((a, b) => comparePriceSort(a, b, "desc"));
    } else if (sortSelect.value === "name") {
      sorted.sort((a, b) => a.name.localeCompare(b.name, "ko"));
    }
    for (const skin of sorted) select.appendChild(makeSkinOption(skin));
  }

  if ([...select.options].some((o) => o.value === previousValue)) {
    select.value = previousValue;
  }
}

function populateRaritySelect() {
  const select = document.getElementById("rarity-select");
  select.innerHTML = "";
  for (const rarity of state.rarities) {
    const option = document.createElement("option");
    option.value = rarity.id;
    option.textContent = `${rarity.name} (${rarity.echoPrice}메아리)`;
    select.appendChild(option);
  }
}

function selectedSkin() {
  if (state.skins.length === 0) return null;
  const skinId = document.getElementById("skin-select").value;
  return state.skins.find((s) => s.id === skinId) || null;
}

function currentTargetEcho() {
  const skin = selectedSkin();
  if (skin) {
    if (skin.currency && skin.currency !== "echo") return null; // 메아리로 살 수 없는 스킨
    return skin.echoPrice ?? rarityById(skin.rarityId)?.echoPrice ?? null;
  }
  if (state.skins.length > 0) return null;
  const rarityId = document.getElementById("rarity-select").value;
  return rarityById(rarityId)?.echoPrice ?? null;
}

function render() {
  const owned = Math.max(0, Number(document.getElementById("owned-echo").value) || 0);
  const resultSection = document.getElementById("result");
  const unavailableNotice = document.getElementById("skin-unavailable");

  const skin = selectedSkin();
  if (skin && skin.currency && skin.currency !== "echo") {
    resultSection.hidden = true;
    unavailableNotice.hidden = false;
    unavailableNotice.textContent = `이 스킨은 메아리로 구매할 수 없습니다 (${priceLabel(skin)}).`;
    return;
  }
  unavailableNotice.hidden = true;

  const target = currentTargetEcho();

  if (target === null) {
    resultSection.hidden = true;
    return;
  }

  const shortfall = window.IVEchoCalc.echoShortfall(target, owned);
  const krw = window.IVEchoCalc.estimateKrwCost(target, owned, state.estimate);

  document.getElementById("result-echo-price").textContent = `${target}메아리`;
  document.getElementById("result-shortfall").textContent = `${shortfall}메아리`;
  document.getElementById("result-krw").textContent =
    shortfall === 0 ? "이미 충분함" : `약 ${krw.toLocaleString()}원`;
  document.getElementById("result-caveat").textContent =
    "* 실제 게임 내 패키지 단가표가 아직 확보되지 않아, 메아리 1개 ≈ 18원(커뮤니티 추정치) 기준 근사값입니다. 실제 결제 금액과 차이가 있을 수 있습니다.";

  resultSection.hidden = false;
}

async function init() {
  await loadData();
  populateSkinSelect();
  populateRaritySelect();

  document.getElementById("owned-echo").addEventListener("input", render);
  document.getElementById("skin-select").addEventListener("change", render);
  document.getElementById("rarity-select").addEventListener("change", render);
  document.getElementById("skin-sort").addEventListener("change", () => {
    populateSkinSelect();
    render();
  });

  render();
}

init();
