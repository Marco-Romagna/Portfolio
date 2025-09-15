// scripts/generate-pokemon-json.js
// Generate lean pokemon-data.json with id, name, gen
// Run: node scripts/generate-pokemon-json.js

import fs from "fs";
import fetch from "node-fetch";

// Total Pokémon count (Gen 9, Scarlet/Violet up to #1025)
const MAX_ID = 1025;

async function main() {
  const results = [];

  for (let id = 1; id <= MAX_ID; id++) {
    try {
      // species gives generation
      const speciesUrl = `https://pokeapi.co/api/v2/pokemon-species/${id}`;
      const species = await fetch(speciesUrl).then(r => r.json());

      const genStr = species.generation.name; // e.g. "generation-i"
      const genNum = parseInt(genStr.replace("generation-", "")
                                    .replace("i","1")
                                    .replace("ii","2")
                                    .replace("iii","3")
                                    .replace("iv","4")
                                    .replace("v","5")
                                    .replace("vi","6")
                                    .replace("vii","7")
                                    .replace("viii","8")
                                    .replace("ix","9"));

      results.push({
        id,
        name: species.name,   // lowercase name
        gen: genNum
      });

      if (id % 50 === 0) console.log(`Fetched up to #${id}`);
    } catch (err) {
      console.error(`Error fetching ID ${id}:`, err.message);
    }
  }

  fs.writeFileSync(
    "./games/2025-09-14/pokemon-sorting/data/pokemon-data.json",
    JSON.stringify(results, null, 2)
  );

  console.log("✅ pokemon-data.json written successfully!");
}

main();
