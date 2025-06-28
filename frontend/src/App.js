import React, { useState, useEffect, useRef, useCallback } from 'react';
import './App.css';

const FruitBoxGame = () => {
  const canvasRef = useRef(null);
  const [gameState, setGameState] = useState('menu'); // 'menu', 'difficulty', 'playing', 'gameOver'
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(120);
  const [totalTime, setTotalTime] = useState(120);
  const [difficulty, setDifficulty] = useState('medium');
  const [highScore, setHighScore] = useState(0);
  const [apples, setApples] = useState([]);
  const [fallingApples, setFallingApples] = useState([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [currentRect, setCurrentRect] = useState(null);
  const [lightColors, setLightColors] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const gameIntervalRef = useRef(null);
  const animationRef = useRef(null);
  const audioContextRef = useRef(null);

  // Audio configuration - easily replaceable
  const audioConfig = {
    backgroundMusic: '/audio/background.mp3', // Placeholder path
    appleFall: '/audio/apple-fall.wav',       // Placeholder path
    gameOver: '/audio/game-over.mp3',         // Placeholder path
    success: '/audio/success.wav'             // Placeholder path
  };

  // Apple texture configuration - easily replaceable
  const appleTextures = {
    default: {
      bodyColor: lightColors ? '#FFB3BA' : '#FF6B6B',
      highlightColor: lightColors ? '#FFD1DC' : '#FF8E8E',
      stemColor: '#4ECDC4',
      leafColor: '#4ECDC4'
    }
  };

  // Difficulty settings
  const difficultySettings = {
    easy: { time: 150, name: 'Dễ', color: '#4ECDC4' },
    medium: { time: 120, name: 'Trung bình', color: '#FFE66D' },
    hard: { time: 90, name: 'Khó', color: '#FF6B6B' }
  };

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

  // Audio functions
  const playSound = (soundType) => {
    if (!soundEnabled) return;
    
    try {
      // For now, we'll use a simple beep sound as placeholder
      // Later, these can be replaced with actual audio files
      const audioContext = audioContextRef.current || new (window.AudioContext || window.webkitAudioContext)();
      audioContextRef.current = audioContext;
      
      let frequency;
      let duration;
      
      switch (soundType) {
        case 'appleFall':
          frequency = 200;
          duration = 0.3;
          break;
        case 'success':
          frequency = 500;
          duration = 0.2;
          break;
        case 'gameOver':
          frequency = 150;
          duration = 1;
          break;
        default:
          return;
      }
      
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + duration);
    } catch (error) {
      console.log('Audio not supported:', error);
    }
  };

  // Reset current game
  const resetGame = () => {
    setApples(generateApples());
    setFallingApples([]);
    setScore(0);
    setTimeLeft(difficultySettings[difficulty].time);
    setCurrentRect(null);
    setIsDrawing(false);
  };
  // Load high score from localStorage
  useEffect(() => {
    const savedHighScore = localStorage.getItem('fruitBoxHighScore');
    if (savedHighScore) {
      setHighScore(parseInt(savedHighScore));
    }
  }, []);

  // Save high score when game ends
  const updateHighScore = (newScore) => {
    if (newScore > highScore) {
      setHighScore(newScore);
      localStorage.setItem('fruitBoxHighScore', newScore.toString());
    }
  };

  // Start game with selected difficulty
  const startGame = (selectedDifficulty) => {
    const diffSetting = difficultySettings[selectedDifficulty];
    setGameState('playing');
    setScore(0);
    setTimeLeft(diffSetting.time);
    setTotalTime(diffSetting.time);
    setDifficulty(selectedDifficulty);
    setApples(generateApples());
    setFallingApples([]);
  };
  const startGame = (selectedDifficulty) => {
    const diffSetting = difficultySettings[selectedDifficulty];
    setGameState('playing');
    setScore(0);
    setTimeLeft(diffSetting.time);
    setTotalTime(diffSetting.time);
    setDifficulty(selectedDifficulty);
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
        updateHighScore(score);
        setGameState('gameOver');
      }
    }
  }, [apples, gameState, checkGameEnd, score]);
  useEffect(() => {
    if (gameState === 'playing' && timeLeft > 0) {
      gameIntervalRef.current = setTimeout(() => {
        setTimeLeft(timeLeft - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      updateHighScore(score);
      setGameState('gameOver');
    }

    return () => clearTimeout(gameIntervalRef.current);
  }, [gameState, timeLeft, score]);

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
      // Valid selection - remove apples and add score (NO NEW APPLES)
      setApples(prevApples => 
        prevApples.map(apple => 
          selectedApples.includes(apple) 
            ? { ...apple, removed: true }
            : apple
        )
      );
      setScore(prevScore => prevScore + selectedApples.length);
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
              Vẽ hình chữ nhật quanh những quả táo có tổng chính xác bằng 10!
            </p>
            <div className="high-score-display">
              <p>🏆 Điểm cao nhất: <span className="high-score-number">{highScore}</span></p>
            </div>
            <div className="menu-controls">
              <label className="light-colors-toggle">
                <input
                  type="checkbox"
                  checked={lightColors}
                  onChange={(e) => setLightColors(e.target.checked)}
                />
                Màu sáng
              </label>
            </div>
            <button className="start-button" onClick={() => setGameState('difficulty')}>
              Bắt đầu chơi
            </button>
            <div className="instructions">
              <h3>Cách chơi:</h3>
              <ul>
                <li>🖱️ Click và kéo để vẽ hình chữ nhật quanh táo</li>
                <li>🔢 Đảm bảo tổng các số chính xác bằng 10</li>
                <li>⭐ Mỗi quả táo cho bạn 1 điểm</li>
                <li>⏰ Loại bỏ hết táo trước khi hết thời gian!</li>
                <li>📏 Lưới: 17x10 = 170 quả táo</li>
                <li>🎯 Táo không tạo mới trong một màn!</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {gameState === 'difficulty' && (
        <div className="difficulty-menu">
          <div className="menu-content">
            <h2 className="difficulty-title">Chọn độ khó</h2>
            <div className="difficulty-options">
              {Object.entries(difficultySettings).map(([key, setting]) => (
                <button
                  key={key}
                  className={`difficulty-button ${key}`}
                  onClick={() => startGame(key)}
                  style={{ borderColor: setting.color }}
                >
                  <div className="difficulty-name">{setting.name}</div>
                  <div className="difficulty-time">{setting.time}s</div>
                </button>
              ))}
            </div>
            <button 
              className="back-button" 
              onClick={() => setGameState('menu')}
            >
              ⬅️ Quay lại
            </button>
          </div>
        </div>
      )}

      {gameState === 'playing' && (
        <div className="game-playing">
          <div className="game-hud">
            <div className="score">Điểm: {score}</div>
            <div className="difficulty-indicator">
              <span style={{ color: difficultySettings[difficulty].color }}>
                {difficultySettings[difficulty].name}
              </span>
            </div>
            <div className="time">⏱️ {timeLeft}s</div>
            <button 
              className="light-toggle-btn"
              onClick={() => setLightColors(!lightColors)}
            >
              {lightColors ? '🌙' : '☀️'}
            </button>
          </div>
          
          <div className="time-progress-container">
            <div 
              className="time-progress-bar"
              style={{ 
                width: `${(timeLeft / totalTime) * 100}%`,
                backgroundColor: difficultySettings[difficulty].color 
              }}
            ></div>
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
            <h2>🎮 Kết thúc! 🎮</h2>
            <div className="game-stats">
              <div className="difficulty-completed">
                Độ khó: <span style={{ color: difficultySettings[difficulty].color }}>
                  {difficultySettings[difficulty].name}
                </span>
              </div>
            </div>
            <div className="final-score">
              <p>Điểm cuối: <span className="score-number">{score}</span></p>
              {score > highScore && <p className="new-record">🎉 Kỷ lục mới! 🎉</p>}
              <p className="high-score-info">Cao nhất: {highScore}</p>
              <p className="score-message">
                {score < 50 ? "Tiếp tục luyện tập!" : 
                 score < 100 ? "Làm tốt lắm!" : 
                 score < 150 ? "Xuất sắc!" : "Tuyệt vời! Bạn là bậc thầy Fruit Box!"}
              </p>
            </div>
            <div className="game-over-buttons">
              <button className="play-again-button" onClick={() => setGameState('difficulty')}>
                Chơi lại
              </button>
              <button 
                className="menu-button" 
                onClick={() => setGameState('menu')}
              >
                Menu chính
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