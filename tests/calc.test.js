#!/usr/bin/env node

const assert = require("assert/strict");
const { echoShortfall, estimateKrwCost, computeExactCost } = require("../src/calc");

function packCounts(combination) {
  const counts = {};
  for (const pack of combination) {
    counts[pack.echo] = (counts[pack.echo] || 0) + 1;
  }
  return counts;
}

const krIngamePacks = [
  { echo: 75, price: 1500 },
  { echo: 209, price: 4400 },
  { echo: 388, price: 7500 },
  { echo: 820, price: 15000 },
  { echo: 1638, price: 30000 },
  { echo: 2468, price: 45000 },
  { echo: 4348, price: 79000 },
  { echo: 8248, price: 149000 },
];

assert.equal(echoShortfall(318, 100), 218);
assert.equal(echoShortfall(318, 500), 0);

assert.equal(
  estimateKrwCost(318, 100, { pricePerEcho: 18, roundToKrw: 100 }),
  4000
);

assert.deepEqual(computeExactCost(2888, 2888, krIngamePacks), {
  total: 0,
  combination: [],
});

const legendary = computeExactCost(2888, 0, krIngamePacks);
assert.equal(legendary.total, 53900);
assert.deepEqual(packCounts(legendary.combination), {
  75: 3,
  209: 1,
  820: 3,
});

const uniqueWithOwned = computeExactCost(318, 100, krIngamePacks);
assert.equal(uniqueWithOwned.total, 4500);
assert.deepEqual(packCounts(uniqueWithOwned.combination), {
  75: 3,
});

assert.throws(
  () => computeExactCost(100, 0, [{ echo: 0, price: 1000 }]),
  /패키지가 없습니다/
);

console.log("calc.test.js: all assertions passed");
