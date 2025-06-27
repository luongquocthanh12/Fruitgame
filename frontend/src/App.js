import React, { useState, useEffect, useRef, useCallback } from 'react';
import './App.css';

const FruitBoxGame = () => {
  const canvasRef = useRef(null);
  const [gameState, setGameState] = useState('menu'); // 'menu', 'playing', 'gameOver'
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(60);
  const [apples, setApples] = useState([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [currentRect, setCurrentRect] = useState(null);
  const [lightColors, setLightColors] = useState(false);
  const gameIntervalRef = useRef(null);

  // Game constants
  const GRID_COLS = 17;
  const GRID_ROWS = 10;
  const APPLE_SIZE = 35;
  const CANVAS_WIDTH = GRID_COLS * APPLE_SIZE;
  const CANVAS_HEIGHT = GRID_ROWS * APPLE_SIZE;

  // Generate random apples
  const generateApples = useCallback(() => {
    const newApples = [];
    for (let i = 0; i < GRID_COLS * GRID_ROWS; i++) {
      const x = (i % GRID_COLS) * APPLE_SIZE;
      const y = Math.floor(i / GRID_COLS) * APPLE_SIZE;
      newApples.push({
        id: i,
        x: x + APPLE_SIZE / 2,
        y: y + APPLE_SIZE / 2,
        value: Math.floor(Math.random() * 9) + 1,
        removed: false
      });
    }
    return newApples;
  }, []);

  // Start game
  const startGame = () => {
    setGameState('playing');
    setScore(0);
    setTimeLeft(60);
    setApples(generateApples());
  };

  // Check if game should end (no valid moves left)
  const checkGameEnd = useCallback((currentApples) => {
    const activeApples = currentApples.filter(apple => !apple.removed);
    
    // Check if any combination can sum to 10
    for (let i = 0; i < activeApples.length; i++) {
      for (let j = i + 1; j < activeApples.length; j++) {
        // Check all possible rectangular combinations
        const minX = Math.min(activeApples[i].x, activeApples[j].x);
        const maxX = Math.max(activeApples[i].x, activeApples[j].x);
        const minY = Math.min(activeApples[i].y, activeApples[j].y);
        const maxY = Math.max(activeApples[i].y, activeApples[j].y);
        
        const selectedApples = activeApples.filter(apple => 
          apple.x >= minX - APPLE_SIZE/2 &&
          apple.x <= maxX + APPLE_SIZE/2 &&
          apple.y >= minY - APPLE_SIZE/2 &&
          apple.y <= maxY + APPLE_SIZE/2
        );
        
        const sum = selectedApples.reduce((total, apple) => total + apple.value, 0);
        if (sum === 10) {
          return false; // Valid move found, game continues
        }
      }
    }
    
    return true; // No valid moves, game should end
  }, []);

  // Check for game end condition
  useEffect(() => {
    if (gameState === 'playing' && apples.length > 0) {
      const gameEnded = checkGameEnd(apples);
      if (gameEnded) {
        setGameState('gameOver');
      }
    }
  }, [apples, gameState, checkGameEnd]);
  useEffect(() => {
    if (gameState === 'playing' && timeLeft > 0) {
      gameIntervalRef.current = setTimeout(() => {
        setTimeLeft(timeLeft - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      setGameState('gameOver');
    }

    return () => clearTimeout(gameIntervalRef.current);
  }, [gameState, timeLeft]);

  // Draw apple
  const drawApple = (ctx, apple) => {
    if (apple.removed) return;

    const radius = APPLE_SIZE / 2 - 5;
    
    // Apple body
    ctx.fillStyle = lightColors ? '#FFB3BA' : '#FF6B6B';
    ctx.beginPath();
    ctx.arc(apple.x, apple.y, radius, 0, Math.PI * 2);
    ctx.fill();

    // Apple highlight
    ctx.fillStyle = lightColors ? '#FFD1DC' : '#FF8E8E';
    ctx.beginPath();
    ctx.arc(apple.x - radius / 3, apple.y - radius / 3, radius / 3, 0, Math.PI * 2);
    ctx.fill();

    // Apple stem
    ctx.strokeStyle = '#4ECDC4';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(apple.x, apple.y - radius);
    ctx.lineTo(apple.x, apple.y - radius - 8);
    ctx.stroke();

    // Leaf
    ctx.fillStyle = '#4ECDC4';
    ctx.beginPath();
    ctx.ellipse(apple.x + 5, apple.y - radius - 5, 8, 4, Math.PI / 4, 0, Math.PI * 2);
    ctx.fill();

    // Number
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(apple.value.toString(), apple.x, apple.y);
  };

  // Draw canvas
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    
    // Clear canvas
    ctx.fillStyle = lightColors ? '#FFF8DC' : '#F4E4BC';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Draw grid
    ctx.strokeStyle = lightColors ? '#DDD' : '#D4C5A9';
    ctx.lineWidth = 1;
    // Draw vertical grid lines
    for (let i = 0; i <= GRID_COLS; i++) {
      ctx.beginPath();
      ctx.moveTo(i * APPLE_SIZE, 0);
      ctx.lineTo(i * APPLE_SIZE, CANVAS_HEIGHT);
      ctx.stroke();
    }
    
    // Draw horizontal grid lines
    for (let i = 0; i <= GRID_ROWS; i++) {
      ctx.beginPath();
      ctx.moveTo(0, i * APPLE_SIZE);
      ctx.lineTo(CANVAS_WIDTH, i * APPLE_SIZE);
      ctx.stroke();
    }

    // Draw apples
    apples.forEach(apple => drawApple(ctx, apple));

    // Draw current selection rectangle
    if (currentRect) {
      ctx.strokeStyle = '#FF6B6B';
      ctx.lineWidth = 3;
      ctx.setLineDash([5, 5]);
      ctx.strokeRect(
        currentRect.x,
        currentRect.y,
        currentRect.width,
        currentRect.height
      );
      ctx.setLineDash([]);
    }
  }, [apples, currentRect, lightColors]);

  // Canvas event handlers
  const getCanvasPosition = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  };

  const handleMouseDown = (e) => {
    if (gameState !== 'playing') return;
    
    const pos = getCanvasPosition(e);
    setIsDrawing(true);
    setStartPos(pos);
    setCurrentRect({
      x: pos.x,
      y: pos.y,
      width: 0,
      height: 0
    });
  };

  const handleMouseMove = (e) => {
    if (!isDrawing || gameState !== 'playing') return;

    const pos = getCanvasPosition(e);
    setCurrentRect({
      x: Math.min(startPos.x, pos.x),
      y: Math.min(startPos.y, pos.y),
      width: Math.abs(pos.x - startPos.x),
      height: Math.abs(pos.y - startPos.y)
    });
  };

  const handleMouseUp = () => {
    if (!isDrawing || !currentRect || gameState !== 'playing') return;

    // Find apples within rectangle
    const selectedApples = apples.filter(apple => 
      !apple.removed &&
      apple.x >= currentRect.x &&
      apple.x <= currentRect.x + currentRect.width &&
      apple.y >= currentRect.y &&
      apple.y <= currentRect.y + currentRect.height
    );

    // Check if sum equals 10
    const sum = selectedApples.reduce((total, apple) => total + apple.value, 0);
    
    if (sum === 10 && selectedApples.length > 0) {
      // Valid selection - remove apples and add score
      setApples(prevApples => 
        prevApples.map(apple => 
          selectedApples.includes(apple) 
            ? { ...apple, removed: true }
            : apple
        )
      );
      setScore(prevScore => prevScore + selectedApples.length);
      
      // Generate new apples to replace removed ones
      setTimeout(() => {
        setApples(prevApples => {
          const newApples = [...prevApples];
          selectedApples.forEach(removedApple => {
            const index = newApples.findIndex(a => a.id === removedApple.id);
            if (index !== -1) {
              newApples[index] = {
                ...removedApple,
                value: Math.floor(Math.random() * 9) + 1,
                removed: false
              };
            }
          });
          return newApples;
        });
      }, 500);
    }

    setIsDrawing(false);
    setCurrentRect(null);
  };

  // Touch events for mobile
  const handleTouchStart = (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    handleMouseDown({ clientX: touch.clientX, clientY: touch.clientY });
  };

  const handleTouchMove = (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    handleMouseMove({ clientX: touch.clientX, clientY: touch.clientY });
  };

  const handleTouchEnd = (e) => {
    e.preventDefault();
    handleMouseUp();
  };

  // Draw effect
  useEffect(() => {
    draw();
  }, [draw]);

  return (
    <div className="fruit-box-game">
      {gameState === 'menu' && (
        <div className="game-menu">
          <div className="menu-content">
            <h1 className="game-title">🍎 Fruit Box 🍎</h1>
            <p className="game-description">
              Draw rectangles around apples to make groups that sum to exactly 10!
            </p>
            <div className="menu-controls">
              <label className="light-colors-toggle">
                <input
                  type="checkbox"
                  checked={lightColors}
                  onChange={(e) => setLightColors(e.target.checked)}
                />
                Light Colors
              </label>
            </div>
            <button className="start-button" onClick={startGame}>
              Start Game
            </button>
            <div className="instructions">
              <h3>How to Play:</h3>
              <ul>
                <li>🖱️ Click and drag to draw rectangles around apples</li>
                <li>🔢 Make sure the numbers add up to exactly 10</li>
                <li>⭐ Each apple gives you 1 point</li>
                <li>⏰ Race against time!</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {gameState === 'playing' && (
        <div className="game-playing">
          <div className="game-hud">
            <div className="score">Score: {score}</div>
            <div className="time">Time: {timeLeft}s</div>
            <button 
              className="light-toggle-btn"
              onClick={() => setLightColors(!lightColors)}
            >
              {lightColors ? '🌙' : '☀️'}
            </button>
          </div>
          <div className="game-canvas-container">
            <canvas
              ref={canvasRef}
              width={CANVAS_WIDTH}
              height={CANVAS_HEIGHT}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              className="game-canvas"
            />
          </div>
            <div className="game-info">
              <p>Vẽ hình chữ nhật quanh những quả táo có tổng = 10!</p>
              <p>Grid: {GRID_COLS}x{GRID_ROWS} | Táo còn lại: {apples.filter(a => !a.removed).length}</p>
            </div>
        </div>
      )}

      {gameState === 'gameOver' && (
        <div className="game-over">
          <div className="game-over-content">
            <h2>🎮 Game Over! 🎮</h2>
            <div className="final-score">
              <p>Final Score: <span className="score-number">{score}</span></p>
              <p className="score-message">
                {score < 20 ? "Keep practicing!" : 
                 score < 50 ? "Good job!" : 
                 score < 80 ? "Great work!" : "Amazing! You're a Fruit Box master!"}
              </p>
            </div>
            <div className="game-over-buttons">
              <button className="play-again-button" onClick={startGame}>
                Play Again
              </button>
              <button 
                className="menu-button" 
                onClick={() => setGameState('menu')}
              >
                Main Menu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

function App() {
  return (
    <div className="App">
      <FruitBoxGame />
    </div>
  );
}

export default App;