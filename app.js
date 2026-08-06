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

function populateSkinSelect() {
  const select = document.getElementById("skin-select");
  const status = document.getElementById("skin-status");
  const rarityFallback = document.getElementById("rarity-fallback");

  if (state.skins.length === 0) {
    select.hidden = true;
    status.textContent = "스킨 데이터가 아직 준비되지 않았습니다. 아래에서 등급으로 계산해주세요.";
    rarityFallback.hidden = false;
    return;
  }

  select.innerHTML = "";
  for (const skin of state.skins) {
    const option = document.createElement("option");
    option.value = skin.id;
    const price = skin.echoPrice ?? rarityById(skin.rarityId)?.echoPrice ?? "?";
    option.textContent = `${skin.character} - ${skin.name} (${price}메아리)`;
    select.appendChild(option);
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

function currentTargetEcho() {
  if (state.skins.length > 0) {
    const skinId = document.getElementById("skin-select").value;
    const skin = state.skins.find((s) => s.id === skinId);
    if (!skin) return null;
    if (skin.currency && skin.currency !== "echo") return null; // 메아리로 살 수 없는 스킨
    return skin.echoPrice ?? rarityById(skin.rarityId)?.echoPrice ?? null;
  }
  const rarityId = document.getElementById("rarity-select").value;
  return rarityById(rarityId)?.echoPrice ?? null;
}

function render() {
  const owned = Math.max(0, Number(document.getElementById("owned-echo").value) || 0);
  const target = currentTargetEcho();
  const resultSection = document.getElementById("result");

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

  render();
}

init();
