const fs = require("fs");
const path = require("path");
const kuromoji = require("kuromoji");

// Use dict inside node_modules
const DIC_PATH = path.join(__dirname, "node_modules/kuromoji/dict");

const INPUT_PATH = path.join(__dirname, "games/2025-09-20/kana-development/data/hunts.json");
const OUTPUT_PATH = path.join(__dirname, "games/2025-09-20/kana-development/data/hunts-tokens.json");

// Make sure hunts.json exists
if (!fs.existsSync(INPUT_PATH)) {
  console.error("❌ hunts.json not found:", INPUT_PATH);
  process.exit(1);
}

const hunts = JSON.parse(fs.readFileSync(INPUT_PATH, "utf8"));

kuromoji.builder({ dicPath: DIC_PATH }).build((err, tokenizer) => {
  if (err) throw err;

  const output = {};
  for (const key of Object.keys(hunts)) {
    if (!Array.isArray(hunts[key])) continue;
    output[key] = hunts[key].map(passage =>
      tokenizer.tokenize(passage).map(t => t.surface_form)
    );
  }

  // Custom replacer: compact arrays of strings
  function replacer(key, value) {
    if (Array.isArray(value) && value.every(v => typeof v === "string")) {
      return value; // keep inline
    }
    return value;
  }

  fs.writeFileSync(
    OUTPUT_PATH,
    JSON.stringify(output, replacer, 2),
    "utf8"
  );

  console.log("✅ Built hunts-tokens.json at", OUTPUT_PATH);
});

