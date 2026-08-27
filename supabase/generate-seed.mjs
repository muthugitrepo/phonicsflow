/**
 * Regenerates supabase/seed.sql — the phonics diary reference library.
 *
 *   node supabase/generate-seed.mjs
 *
 * Example sentences are generated from a single template on purpose: the diary
 * is editable in-app, so trainers replace them with their own wording. The word
 * lists below are the part worth curating here.
 */
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const SOUNDS = {
  consonant: {
    b: ["bat", "bed", "big", "box", "bus", "bag", "bell", "book", "ball", "bird"],
    c: ["cat", "cup", "car", "cow", "cap", "can", "cake", "corn", "cold", "cut"],
    d: ["dog", "dad", "dig", "doll", "duck", "desk", "door", "dish", "dark", "deep"],
    f: ["fan", "fish", "fox", "five", "fun", "farm", "feet", "food", "frog", "fire"],
    g: ["goat", "gas", "gum", "girl", "game", "gift", "gold", "green", "garden", "glass"],
    h: ["hat", "hen", "hop", "hand", "home", "horse", "hill", "help", "honey", "house"],
    j: ["jam", "jet", "jug", "jump", "job", "join", "jeans", "juice", "jacket", "jungle"],
    k: ["kite", "key", "king", "kid", "kick", "keep", "kind", "koala", "kitten", "kettle"],
    l: ["leg", "lip", "log", "lamp", "leaf", "lion", "lake", "light", "lemon", "ladder"],
    m: ["man", "map", "mud", "milk", "moon", "mask", "mango", "mouse", "mother", "mountain"],
    n: ["net", "nose", "nut", "nap", "nine", "note", "name", "night", "needle", "number"],
    p: ["pen", "pig", "pot", "pan", "park", "pink", "pool", "plant", "paper", "pencil"],
    q: ["queen", "quiz", "quilt", "quick", "quiet", "quack", "quarter", "question", "quill", "quiver"],
    r: ["rat", "run", "red", "rain", "ring", "road", "rock", "river", "rabbit", "rocket"],
    s: ["sun", "sit", "sad", "sock", "sand", "seed", "soup", "snake", "spoon", "silver"],
    t: ["top", "ten", "tap", "toy", "tree", "table", "tiger", "train", "tooth", "tomato"],
    v: ["van", "vet", "vase", "vote", "video", "violin", "village", "velvet", "valley", "vegetable"],
    w: ["web", "wet", "win", "wall", "wind", "wood", "water", "watch", "window", "wagon"],
    x: ["box", "fox", "six", "mix", "fix", "wax", "tax", "exit", "taxi", "index"],
    y: ["yes", "yak", "yarn", "yell", "year", "yellow", "young", "yogurt", "yard", "yawn"],
    z: ["zip", "zoo", "zebra", "zero", "zigzag", "buzz", "fizz", "zone", "puzzle", "lazy"],
  },
  consonant_digraph: {
    sh: ["ship", "shop", "shell", "fish", "dish", "wash", "brush", "shark", "sheep", "shirt"],
    ch: ["chin", "chip", "chair", "cheese", "church", "lunch", "bench", "beach", "chicken", "children"],
    th: ["thin", "think", "three", "thumb", "this", "that", "them", "bath", "tooth", "feather"],
    wh: ["what", "when", "where", "which", "white", "wheel", "whale", "wheat", "whisper", "whistle"],
    ph: ["phone", "photo", "graph", "dolphin", "elephant", "alphabet", "trophy", "phrase", "sphere", "orphan"],
    ck: ["duck", "sock", "lock", "rock", "back", "kick", "black", "clock", "truck", "chicken"],
    ng: ["ring", "sing", "song", "long", "king", "wing", "strong", "bring", "spring", "morning"],
    kn: ["knee", "knot", "know", "knife", "knock", "knit", "knight", "knuckle", "kneel", "knapsack"],
    wr: ["write", "wrap", "wrist", "wrong", "wren", "wreck", "wrench", "wriggle", "wrinkle", "wreath"],
    gh: ["ghost", "laugh", "tough", "cough", "rough", "enough", "night", "light", "high", "eight"],
  },
  vowel_digraph: {
    ai: ["rain", "tail", "mail", "sail", "paint", "train", "chair", "snail", "brain", "afraid"],
    ay: ["day", "play", "say", "way", "stay", "tray", "gray", "today", "crayon", "birthday"],
    ee: ["see", "tree", "bee", "feet", "green", "sleep", "sheep", "queen", "street", "sweet"],
    ea: ["sea", "eat", "read", "meat", "leaf", "beach", "clean", "dream", "teacher", "peanut"],
    oa: ["boat", "coat", "road", "soap", "goat", "toast", "float", "coach", "throat", "oatmeal"],
    ow: ["cow", "now", "how", "down", "town", "brown", "flower", "crown", "shower", "powder"],
    oo: ["moon", "food", "room", "book", "look", "foot", "spoon", "school", "balloon", "bedroom"],
    ou: ["out", "loud", "cloud", "house", "mouse", "round", "sound", "mouth", "ground", "mountain"],
    oi: ["oil", "coin", "boil", "soil", "join", "point", "noise", "voice", "spoil", "choice"],
    oy: ["boy", "toy", "joy", "enjoy", "royal", "loyal", "oyster", "employ", "destroy", "annoy"],
    ie: ["pie", "tie", "lie", "die", "field", "chief", "thief", "believe", "cookie", "movie"],
    igh: ["high", "night", "light", "right", "sight", "might", "bright", "fight", "tight", "flight"],
    ue: ["blue", "glue", "true", "clue", "due", "value", "rescue", "statue", "tissue", "argue"],
    ew: ["new", "few", "dew", "grew", "blew", "chew", "stew", "screw", "jewel", "nephew"],
    au: ["author", "autumn", "august", "sauce", "laundry", "haunted", "applause", "because", "astronaut", "dinosaur"],
    aw: ["saw", "paw", "jaw", "claw", "draw", "lawn", "yawn", "crawl", "straw", "hawk"],
  },
};

const DESCRIPTIONS = {
  consonant: (s) => `Single consonant sound /${s}/.`,
  consonant_digraph: (s) => `Two consonants making one sound: /${s}/.`,
  vowel_digraph: (s) => `Two vowels working together to make the /${s}/ sound.`,
};

const quote = (value) => `'${String(value).replace(/'/g, "''")}'`;

const rows = [];
for (const [category, sounds] of Object.entries(SOUNDS)) {
  let order = 0;
  for (const [sound, words] of Object.entries(sounds)) {
    order += 1;
    const examples = words.map((word) => ({
      word,
      example_sentence: `Listen for the /${sound}/ sound in "${word}".`,
    }));
    rows.push(
      `  (${quote(category)}::sound_category, ${quote(sound)}, ${quote(
        DESCRIPTIONS[category](sound),
      )}, ${quote(JSON.stringify(examples))}::jsonb, ${order})`,
    );
  }
}

const sql = `-- =============================================================================
-- PhonicsFlow — phonics diary seed data (${rows.length} sounds x 10 example words)
-- GENERATED by supabase/generate-seed.mjs — edit that file, not this one.
-- Re-running is safe: existing sounds are left untouched so trainer edits stick.
-- =============================================================================

insert into public.phonics_sounds (category, sound_name, description, example_words, display_order)
values
${rows.join(",\n")}
on conflict (category, sound_name) do nothing;
`;

const here = dirname(fileURLToPath(import.meta.url));
writeFileSync(join(here, "seed.sql"), sql);
console.log(`Wrote seed.sql — ${rows.length} sounds.`);
