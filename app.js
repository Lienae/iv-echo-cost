const state = {
  rarities: [],
  skins: [],
  estimate: null,
  selectedCharacter: null,
  selectedSkinId: null,
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

const RARITY_CLASS = {
  scarce: "rarity-scarce",
  unique: "rarity-unique",
  rare: "rarity-rare",
  legendary: "rarity-legendary",
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

function characterList() {
  return [...new Set(state.skins.map((s) => s.character))].sort((a, b) => a.localeCompare(b, "ko"));
}

function renderCharacterGrid() {
  const grid = document.getElementById("character-grid");
  const filter = document.getElementById("character-filter").value.trim();
  grid.innerHTML = "";

  const chars = characterList().filter((c) => !filter || c.includes(filter));
  for (const char of chars) {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "char-card" + (char === state.selectedCharacter ? " selected" : "");
    card.textContent = char;
    card.addEventListener("click", () => selectCharacter(char));
    grid.appendChild(card);
  }

  if (chars.length === 0) {
    const empty = document.createElement("p");
    empty.className = "hint";
    empty.textContent = "일치하는 캐릭터가 없습니다.";
    grid.appendChild(empty);
  }
}

function selectCharacter(char) {
  state.selectedCharacter = char;
  state.selectedSkinId = null;
  renderCharacterGrid();

  document.getElementById("skin-section").hidden = false;
  document.getElementById("selected-character-name").textContent = char;
  renderSkinGrid();
  render();
}

function skinsForSelectedCharacter() {
  const list = state.skins.filter((s) => s.character === state.selectedCharacter);
  const sortMode = document.getElementById("skin-sort").value;
  if (sortMode === "price-asc") list.sort((a, b) => comparePriceSort(a, b, "asc"));
  else if (sortMode === "price-desc") list.sort((a, b) => comparePriceSort(a, b, "desc"));
  else list.sort((a, b) => a.name.localeCompare(b.name, "ko"));
  return list;
}

function renderSkinGrid() {
  const grid = document.getElementById("skin-grid");
  grid.innerHTML = "";

  for (const skin of skinsForSelectedCharacter()) {
    const unavailable = skin.currency !== "echo";
    const card = document.createElement("button");
    card.type = "button";
    card.className =
      `skin-card ${RARITY_CLASS[skin.rarityId] || ""}` +
      (skin.id === state.selectedSkinId ? " selected" : "") +
      (unavailable ? " unavailable" : "");

    const nameEl = document.createElement("span");
    nameEl.className = "skin-name";
    nameEl.textContent = skin.name;

    const priceEl = document.createElement("span");
    priceEl.className = "skin-price";
    priceEl.textContent = priceLabel(skin);

    card.appendChild(nameEl);
    card.appendChild(priceEl);
    card.addEventListener("click", () => {
      state.selectedSkinId = skin.id;
      renderSkinGrid();
      render();
    });
    grid.appendChild(card);
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
  if (!state.selectedSkinId) return null;
  return state.skins.find((s) => s.id === state.selectedSkinId) || null;
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
  populateRaritySelect();

  if (state.skins.length === 0) {
    document.getElementById("character-section").hidden = true;
    document.getElementById("skin-section").hidden = true;
    document.getElementById("rarity-fallback").hidden = false;
    document.getElementById("skin-status").textContent =
      "스킨 데이터가 아직 준비되지 않았습니다. 아래에서 등급으로 계산해주세요.";
  } else {
    renderCharacterGrid();
    document.getElementById("character-filter").addEventListener("input", renderCharacterGrid);
    document.getElementById("skin-sort").addEventListener("change", renderSkinGrid);
  }

  document.getElementById("owned-echo").addEventListener("input", render);
  document.getElementById("rarity-select").addEventListener("change", render);

  render();
}

init();
