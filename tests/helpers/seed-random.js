// Mulberry32 seeded PRNG — injected with page.addInitScript() so spawns,
// city layout and particles are reproducible. window.__seedRandom(n) re-seeds.
(function () {
  let seed = 42;
  Math.random = function () {
    seed |= 0;
    seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  window.__seedRandom = (n) => { seed = n; };
})();
