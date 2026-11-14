const ADJECTIVES = [
  "Curious", "Clever", "Bold", "Brave", "Calm", "Daring", "Eager", "Keen", "Lucky", "Nimble",
  "Quiet", "Quick", "Sharp", "Steady", "Witty", "Wise", "Patient", "Plucky", "Swift", "Bright",
];

const ANIMALS: [name: string, emoji: string][] = [
  ["Otter", "🦦"], ["Owl", "🦉"], ["Fox", "🦊"], ["Panda", "🐼"], ["Tiger", "🐯"], ["Koala", "🐨"],
  ["Penguin", "🐧"], ["Turtle", "🐢"], ["Octopus", "🐙"], ["Whale", "🐳"], ["Dolphin", "🐬"], ["Hedgehog", "🦔"],
  ["Raccoon", "🦝"], ["Beaver", "🦫"], ["Badger", "🦡"], ["Eagle", "🦅"], ["Parrot", "🦜"], ["Flamingo", "🦩"],
  ["Lion", "🦁"], ["Rabbit", "🐰"], ["Bear", "🐻"], ["Wolf", "🐺"], ["Frog", "🐸"], ["Bee", "🐝"],
];

export interface PlayerIdentity {
  nickname: string;
  avatar: string;
}

/** A friendly random name from fixed lists: no free text, so there is nothing to moderate. */
export function randomIdentity(random: () => number = Math.random): PlayerIdentity {
  const adjective = ADJECTIVES[Math.floor(random() * ADJECTIVES.length)];
  const [animal, emoji] = ANIMALS[Math.floor(random() * ANIMALS.length)];
  return { nickname: `${adjective} ${animal}`, avatar: emoji };
}
