## 🔧 Setup for script

### 1. Install dependencies
The generator script uses **Node.js** and `node-fetch`.

```bash
npm init -y
npm install node-fetch
```

### 2. Generate Pokémon list
Run the script once to create a lean Pokémon data file:
```
node Scripts/pokemon-sorting/generate-pokemon-json.js
```
this writes a file at:
```
games/2025-09-14/pokemon-sorting/data/pokemon-data.json
```
games/2025-09-14/pokemon-sorting/data/pokemon-data.json

### 3. Run locally
Open:
```
games/2025-09-14/pokemon-sorting/index.html
```
in a browser, or to serve the project with Live Server in VSCode.
