const shapes = ["circle", "square", "triangle"];
let targetShape = "";
let lives = 3;
let startTime;

function startGame() {
  countdown(3);
}

function countdown(seconds) {
  const countdownEl = document.getElementById("countdown");
  countdownEl.textContent = seconds;

  if (seconds > 0) {
    setTimeout(() => countdown(seconds - 1), 1000);
  } else {
    pickTarget();
  }
}

function pickTarget() {
  targetShape = shapes[Math.floor(Math.random() * shapes.length)];
  document.getElementById("target").textContent = targetShape.toUpperCase();
  generateBoard();
  startTime = new Date();
}

function generateBoard() {
  const board = document.getElementById("game-board");
  board.innerHTML = "";

  for (let i = 0; i < 25; i++) {
    const tile = document.createElement("div");
    tile.classList.add("tile");

    // Randomly decide if this tile gets a shape (50% chance)
    if (Math.random() > 0.5) {
      const shape = shapes[Math.floor(Math.random() * shapes.length)];
      const shapeDiv = document.createElement("div");
      shapeDiv.classList.add("shape", shape);
      tile.appendChild(shapeDiv);

      tile.onclick = () => handleClick(shape);
    }

    board.appendChild(tile);
  }
}

function handleClick(shape) {
  if (shape === targetShape) {
    const reactionTime = (new Date() - startTime) / 1000;
    document.getElementById("reaction-time").textContent =
      `Reaction Time: ${reactionTime.toFixed(2)}s`;
    setTimeout(startGame, 1000);
  } else {
    lives--;
    document.getElementById("lives").textContent = `Lives: ${lives}`;
    if (lives <= 0) {
      alert("Game Over!");
      resetGame();
    }
  }
}

function resetGame() {
  lives = 3;
  document.getElementById("lives").textContent = "Lives: 3";
  startGame();
}

window.onload = startGame;
