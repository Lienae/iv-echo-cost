// 메아리(제5인격 과금 재화) 필요 금액 계산 로직

/**
 * 보유 메아리를 제외하고 실제로 더 구매해야 하는 메아리 수량.
 */
function echoShortfall(targetEcho, ownedEcho) {
  return Math.max(0, targetEcho - ownedEcho);
}

/**
 * 패키지 단가표가 없을 때 쓰는 근사치 계산.
 * pricePerEcho(메아리 1개당 평균 원화)를 곱하고 roundToKrw 단위로 올림한다.
 * echo-price-estimate.json의 _caveat 참고 — 실제 패키지 단가표 확보 전까지의 어림값.
 */
function estimateKrwCost(targetEcho, ownedEcho, estimate) {
  const shortfall = echoShortfall(targetEcho, ownedEcho);
  if (shortfall === 0) return 0;
  const raw = shortfall * estimate.pricePerEcho;
  const step = estimate.roundToKrw || 1;
  return Math.ceil(raw / step) * step;
}

/**
 * 패키지 단위 조합 최적화(동전 교환 DP).
 * packs: [{ price, echo }] — 통화 무관(원화든 엔화든), price가 있는 패키지만 넘길 것.
 * shortfall만큼의 메아리를 "이상"으로 채우는 최소 금액 조합을 찾는다.
 * (패키지는 소수점 없이 정수 개수만 구매 가능, 남는 메아리는 버려짐)
 */
function computeExactCost(targetEcho, ownedEcho, packs) {
  const shortfall = echoShortfall(targetEcho, ownedEcho);
  if (shortfall === 0) return { total: 0, combination: [] };

  const validPacks = packs.filter((p) => typeof p.price === "number" && p.echo > 0);
  if (validPacks.length === 0) {
    throw new Error("price가 채워진 패키지가 없습니다. echo-packs.json을 먼저 채워주세요.");
  }

  // minCost[e] = e 이상의 메아리를 채우는 최소 금액 (e: 0..shortfall)
  const minCost = new Array(shortfall + 1).fill(Infinity);
  const choice = new Array(shortfall + 1).fill(null);
  minCost[0] = 0;

  for (let e = 1; e <= shortfall; e++) {
    for (const pack of validPacks) {
      const prevIndex = Math.max(0, e - pack.echo);
      const cost = minCost[prevIndex] + pack.price;
      if (cost < minCost[e]) {
        minCost[e] = cost;
        choice[e] = pack;
      }
    }
  }

  const combination = [];
  let cursor = shortfall;
  while (cursor > 0) {
    const pack = choice[cursor];
    combination.push(pack);
    cursor = Math.max(0, cursor - pack.echo);
  }

  return { total: minCost[shortfall], combination };
}

const api = { echoShortfall, estimateKrwCost, computeExactCost };
if (typeof module !== "undefined" && module.exports) {
  module.exports = api;
} else if (typeof window !== "undefined") {
  window.IVEchoCalc = api;
}
