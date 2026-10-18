const ADJECTIVES = [
  'amber', 'ancient', 'bold', 'brave', 'bright', 'calm', 'clever', 'cosmic', 'crimson', 'curious',
  'eager', 'electric', 'fancy', 'gentle', 'golden', 'happy', 'hidden', 'jolly', 'keen', 'lively',
  'lucky', 'mellow', 'mighty', 'nimble', 'noble', 'patient', 'persian', 'quiet', 'rapid', 'silent',
  'silver', 'sleepy', 'swift', 'tidy', 'vivid', 'wandering', 'wild', 'wooden', 'wise', 'zesty',
];

const NOUNS = [
  'albatross', 'badger', 'beaver', 'bison', 'cheetah', 'cobra', 'condor', 'coral', 'diamond', 'dolphin',
  'eagle', 'elephant', 'falcon', 'ferret', 'fox', 'gecko', 'heron', 'ibis', 'jaguar', 'koala',
  'lemur', 'lynx', 'magpie', 'marmot', 'narwhal', 'newt', 'otter', 'owl', 'panda', 'penguin',
  'puffin', 'quokka', 'raven', 'tiger', 'turtle', 'walrus', 'wombat', 'yak', 'zebra', 'comet',
];

const pick = <T,>(xs: T[]) => xs[Math.floor(Math.random() * xs.length)];

/** Docker-style random name such as "persian-diamond", unique against `taken`. */
export function randomProjectName(taken: Set<string>): string {
  for (let i = 0; i < 50; i++) {
    const name = `${pick(ADJECTIVES)}-${pick(NOUNS)}`;
    if (!taken.has(name)) return name;
  }
  let n = 2;
  const base = `${pick(ADJECTIVES)}-${pick(NOUNS)}`;
  while (taken.has(`${base}-${n}`)) n++;
  return `${base}-${n}`;
}
