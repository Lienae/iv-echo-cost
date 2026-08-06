const state = {
  rarities: [],
  skins: [],
  bases: [],
  selectedBasisId: null,
  jpyToKrwRate: null,
  fxFetchFailed: false,
  selectedCharacter: null,
  selectedSkinId: null,
};

async function loadData() {
  const [raritiesRes, skinsRes, packsRes] = await Promise.all([
    fetch("data/rarities.json"),
    fetch("data/skins.json"),
    fetch("data/echo-packs.json"),
  ]);
  const raritiesJson = await raritiesRes.json();
  const skinsJson = await skinsRes.json();
  const packsJson = await packsRes.json();
  state.rarities = raritiesJson.rarities;
  state.bases = packsJson.bases || [];

  const realSkins = (skinsJson.skins || []).filter((s) => s.id !== "EXAMPLE_DELETE_ME");
  state.skins = realSkins;
}

function rarityById(id) {
  return state.rarities.find((r) => r.id === id);
}

function currentBasis() {
  return state.bases.find((b) => b.id === state.selectedBasisId) || null;
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

function addPriceItem(container, label, valueText, note) {
  const item = document.createElement("div");
  item.className = "price-item";

  const main = document.createElement("div");
  main.className = "price-item-main";

  const labelEl = document.createElement("span");
  labelEl.className = "price-item-platform";
  labelEl.textContent = label;

  const valueEl = document.createElement("span");
  valueEl.className = "price-item-value";
  valueEl.textContent = valueText;

  main.appendChild(labelEl);
  main.appendChild(valueEl);
  item.appendChild(main);

  if (note) {
    const noteEl = document.createElement("div");
    noteEl.className = "price-item-note";
    noteEl.textContent = note;
    item.appendChild(noteEl);
  }

  container.appendChild(item);
}

function renderBasisPriceList() {
  const container = document.getElementById("price-list");
  container.innerHTML = "";
  const basis = currentBasis();
  if (!basis) return;
  for (const pack of basis.packs) {
    addPriceItem(container, `${pack.echo}메아리`, `${pack.price.toLocaleString()}${basis.currencySymbol}`, null);
  }
}

function selectBasis(id) {
  state.selectedBasisId = id;
  renderBasisRadios();
  renderBasisPriceList();
  const basis = currentBasis();
  if (basis && basis.currency === "JPY") ensureFxRate();
  render();
}

function renderBasisRadios() {
  const container = document.getElementById("basis-radio-group");
  container.innerHTML = "";

  for (const basis of state.bases) {
    const label = document.createElement("label");
    label.className = "basis-radio" + (basis.id === state.selectedBasisId ? " selected" : "");

    const input = document.createElement("input");
    input.type = "radio";
    input.name = "basis";
    input.value = basis.id;
    input.checked = basis.id === state.selectedBasisId;
    input.addEventListener("change", () => selectBasis(basis.id));

    const span = document.createElement("span");
    span.textContent = basis.label;

    label.appendChild(input);
    label.appendChild(span);
    container.appendChild(label);
  }

  const basis = currentBasis();
  document.getElementById("basis-note").textContent = basis?.note || basis?.source || "";
}

async function ensureFxRate() {
  if (state.jpyToKrwRate !== null || state.fxFetchFailed) return;
  try {
    const res = await fetch("https://open.er-api.com/v6/latest/JPY");
    const json = await res.json();
    state.jpyToKrwRate = json.rates?.KRW ?? null;
    if (state.jpyToKrwRate === null) state.fxFetchFailed = true;
  } catch (e) {
    state.fxFetchFailed = true;
  }
  render();
}

function formatCombination(combination) {
  if (combination.length === 0) return "";
  const counts = new Map();
  for (const pack of combination) {
    const key = pack.echo;
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  const parts = [...counts.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([echo, count]) => `${echo}메아리×${count}`);
  return `구매 조합: ${parts.join(" + ")}`;
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
  const basis = currentBasis();
  const subEl = document.getElementById("result-krw-sub");
  const comboEl = document.getElementById("result-combination");

  if (target === null || !basis) {
    resultSection.hidden = true;
    return;
  }

  const shortfall = window.IVEchoCalc.echoShortfall(target, owned);
  const { total, combination } = window.IVEchoCalc.computeExactCost(target, owned, basis.packs);

  document.getElementById("result-echo-price").textContent = `${target}메아리`;
  document.getElementById("result-shortfall").textContent = `${shortfall}메아리`;
  document.getElementById("result-krw").textContent =
    shortfall === 0 ? "이미 충분함" : `${total.toLocaleString()}${basis.currencySymbol}`;

  if (shortfall > 0 && basis.currency === "JPY") {
    subEl.hidden = false;
    if (state.jpyToKrwRate) {
      const krwEq = Math.round(total * state.jpyToKrwRate);
      subEl.textContent = `≈ 약 ${krwEq.toLocaleString()}원 (실시간 환율 참고, 카드사 환율·수수료는 별도)`;
    } else if (state.fxFetchFailed) {
      subEl.textContent = "환율 조회 실패 — 엔화 금액만 표시됩니다.";
    } else {
      subEl.textContent = "환율 조회 중...";
    }
  } else {
    subEl.hidden = true;
  }

  comboEl.textContent = shortfall > 0 ? formatCombination(combination) : "";

  document.getElementById("result-caveat").textContent =
    `* "${basis.label}" 실제 단가표(${basis.source}) 기준 정확 계산입니다.` +
    (basis.currency === "JPY" ? " 실제 청구액은 카드사 환율·해외결제 수수료에 따라 달라질 수 있습니다." : "");

  resultSection.hidden = false;
}

async function init() {
  await loadData();
  populateRaritySelect();

  state.selectedBasisId = state.bases[0]?.id || null;
  renderBasisRadios();
  renderBasisPriceList();
  if (currentBasis()?.currency === "JPY") ensureFxRate();

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
