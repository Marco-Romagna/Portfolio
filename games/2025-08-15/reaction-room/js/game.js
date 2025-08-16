const shapes = ["circle", "square", "triangle"];
let targetShape = "";
let startTime;
let lives = 3;

function startGame() {
  const countdownElement = document.getElementById("countdown");
  const targetElement = document.getElementById("target");
  const resultElement = document.getElementById("result");
  const livesElement = document.getElementById("lives");
  const board = document.getElementById("game-board");

  board.innerHTML = "";
  resultElement.textContent = "";
  targetElement.textContent = "";
  
  let count = 3;
  countdownElement.textContent = count;

  const countdown = setInterval(() => {
    count--;
    if (count > 0) {
      countdownElement.textContent = count;
    } else {
      clearInterval(countdown);
      countdownElement.textContent = "";
      targetShape = shapes[Math.floor(Math.random() * shapes.length)];
      targetElement.textContent = "Target: " + targetShape.toUpperCase();

      createBoard();
      startTime = new Date();
    }
  }, 1000);
}

function createBoard() {
  const board = document.getElementById("game-board");
  for (let i = 0; i < 25; i++) {
    const cell = document.createElement("div");
    cell.classList.add("cell");

    if (Math.random() > 0.5) { // not every box has an object
      const shape = document.createElement("div");
      const shapeType = shapes[Math.floor(Math.random() * shapes.length)];
      shape.classList.add("shape", shapeType);

      cell.appendChild(shape);

      cell.addEventListener("click", () => {
        if (shapeType === targetShape) {
          const endTime = new Date();
          const reactionTime = (endTime - startTime) / 1000;
          document.getElementById("result").textContent =
            "Correct! Reaction Time: " + reactionTime + " seconds";
          startGame();
        } else {
          lives--;
          document.getElementById("lives").textContent = "Lives: " + lives;
          if (lives <= 0) {
            document.getElementById("result").textContent = "Game Over!";
            document.getElementById("game-board").innerHTML = "";
          }
        }
      });
    }

    board.appendChild(cell);
  }
}

startGame();
