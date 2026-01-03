
import { redistributeMTA } from './redistribution';
import type { Member, Constraints } from './types';

// Simple benchmark harness
console.log('Running RSCA Redistribution Benchmark...');

const DEFAULT_CONSTRAINTS: Constraints = {
  controlBandLower: 3.8,
  controlBandUpper: 4.2,
  mtaLowerBound: 2.0,
  mtaUpperBound: 5.0,
};

const createMembers = (n: number): Member[] => {
  return Array.from({ length: n }, (_, i) => ({
    id: `m-${i}`,
    rank: i + 1,
    mta: 3.0, // Start flat
    isAnchor: false
  }));
};

const runBenchmark = (n: number, iterations = 100) => {
  const members = createMembers(n);
  // Add some anchors to make it interesting
  if (n > 2) {
    members[0].isAnchor = true; members[0].anchorValue = 5.0;
    members[n - 1].isAnchor = true; members[n - 1].anchorValue = 2.0;
    members[Math.floor(n / 2)].isAnchor = true; members[Math.floor(n / 2)].anchorValue = 4.0;
  }

  const start = performance.now();
  for (let i = 0; i < iterations; i++) {
    redistributeMTA(members, DEFAULT_CONSTRAINTS);
  }
  const end = performance.now();
  const avgTime = (end - start) / iterations;

  console.log(`N=${n}: ${avgTime.toFixed(4)} ms/op (over ${iterations} iterations)`);
  return avgTime;
};

const sizes = [25, 50, 100, 300];

sizes.forEach(n => runBenchmark(n));
