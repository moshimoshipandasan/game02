// ゲームの設定
const COLS = 10;
const ROWS = 20;
const BLOCK_SIZE = 30;
const COLORS = [
    '#FF3E9D', // ピンク
    '#0CF2FF', // シアン
    '#FFDE59', // イエロー
    '#7B61FF', // パープル
    '#FF5252', // レッド
    '#00E676', // グリーン
    '#FF9100', // オレンジ
    '#18FFFF', // ライトブルー
    '#EA80FC', // ライトパープル
    '#76FF03'  // ライムグリーン
];

// キャンバスの設定
const canvas = document.getElementById('game-board');
const ctx = canvas.getContext('2d');
const nextPieceCanvas = document.getElementById('next-piece');
const nextPieceCtx = nextPieceCanvas.getContext('2d');

// ゲームの状態
let board = [];
let currentPiece = null;
let nextPiece = null;
let score = 0;
let lines = 0;
let level = 1;
let gameOver = false;
let isPaused = false;
let animationId = null;
let dropStart = 0;
let gameSpeed = 1000; // 初期の落下速度（ミリ秒）
let particles = [];

// 音声要素
const moveSound = document.getElementById('move-sound');
const rotateSound = document.getElementById('rotate-sound');
const dropSound = document.getElementById('drop-sound');
const clearSound = document.getElementById('clear-sound');
const gameOverSound = document.getElementById('game-over-sound');
const levelUpSound = document.getElementById('level-up-sound');
const bgm = document.getElementById('bgm');

// ボタン要素
const startButton = document.getElementById('start-button');
const resetButton = document.getElementById('reset-button');
const restartButton = document.getElementById('restart-button');

// 通常のテトリスピース
const PIECES = [
    // I
    [
        [0, 0, 0, 0],
        [1, 1, 1, 1],
        [0, 0, 0, 0],
        [0, 0, 0, 0]
    ],
    // J
    [
        [1, 0, 0],
        [1, 1, 1],
        [0, 0, 0]
    ],
    // L
    [
        [0, 0, 1],
        [1, 1, 1],
        [0, 0, 0]
    ],
    // O
    [
        [1, 1],
        [1, 1]
    ],
    // S
    [
        [0, 1, 1],
        [1, 1, 0],
        [0, 0, 0]
    ],
    // T
    [
        [0, 1, 0],
        [1, 1, 1],
        [0, 0, 0]
    ],
    // Z
    [
        [1, 1, 0],
        [0, 1, 1],
        [0, 0, 0]
    ]
];

// 追加の特殊ピース（パーティーテトリス用）
const SPECIAL_PIECES = [
    // 十字型
    [
        [0, 1, 0],
        [1, 1, 1],
        [0, 1, 0]
    ],
    // U字型
    [
        [1, 0, 1],
        [1, 1, 1],
        [0, 0, 0]
    ],
    // W字型
    [
        [1, 0, 0],
        [1, 1, 0],
        [0, 1, 1]
    ],
    // V字型
    [
        [1, 0, 0],
        [1, 0, 0],
        [1, 1, 1]
    ],
    // 小さなL
    [
        [1, 0],
        [1, 1]
    ],
    // 小さなT
    [
        [1, 1, 1],
        [0, 1, 0]
    ],
    // ドット
    [
        [1]
    ],
    // 2x3ブロック
    [
        [1, 1],
        [1, 1],
        [1, 1]
    ]
];

// 全てのピースを結合
const ALL_PIECES = [...PIECES, ...SPECIAL_PIECES];

// ゲームの初期化
function init() {
    // キャンバスのサイズ設定
    canvas.width = COLS * BLOCK_SIZE;
    canvas.height = ROWS * BLOCK_SIZE;
    nextPieceCanvas.width = 4 * BLOCK_SIZE;
    nextPieceCanvas.height = 4 * BLOCK_SIZE;
    
    // ボードの初期化
    createBoard();
    
    // イベントリスナーの設定
    document.addEventListener('keydown', handleKeyPress);
    startButton.addEventListener('click', startGame);
    resetButton.addEventListener('click', resetGame);
    restartButton.addEventListener('click', resetGame);
    
    // 初期画面の描画
    drawBoard();
    drawUI();
}

// ボードの作成
function createBoard() {
    board = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
}

// ボードの描画
function drawBoard() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // グリッドの描画
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    
    for (let x = 0; x <= COLS; x++) {
        ctx.beginPath();
        ctx.moveTo(x * BLOCK_SIZE, 0);
        ctx.lineTo(x * BLOCK_SIZE, canvas.height);
        ctx.stroke();
    }
    
    for (let y = 0; y <= ROWS; y++) {
        ctx.beginPath();
        ctx.moveTo(0, y * BLOCK_SIZE);
        ctx.lineTo(canvas.width, y * BLOCK_SIZE);
        ctx.stroke();
    }
    
    // 固定されたブロックの描画
    for (let y = 0; y < ROWS; y++) {
        for (let x = 0; x < COLS; x++) {
            if (board[y][x]) {
                drawBlock(ctx, x, y, board[y][x] - 1);
            }
        }
    }
    
    // 現在のピースの描画
    if (currentPiece) {
        for (let y = 0; y < currentPiece.shape.length; y++) {
            for (let x = 0; x < currentPiece.shape[y].length; x++) {
                if (currentPiece.shape[y][x]) {
                    drawBlock(
                        ctx,
                        currentPiece.x + x,
                        currentPiece.y + y,
                        currentPiece.color
                    );
                }
            }
        }
    }
}

// 次のピースの描画
function drawNextPiece() {
    nextPieceCtx.clearRect(0, 0, nextPieceCanvas.width, nextPieceCanvas.height);
    
    if (nextPiece) {
        const offsetX = (4 - nextPiece.shape[0].length) / 2;
        const offsetY = (4 - nextPiece.shape.length) / 2;
        
        for (let y = 0; y < nextPiece.shape.length; y++) {
            for (let x = 0; x < nextPiece.shape[y].length; x++) {
                if (nextPiece.shape[y][x]) {
                    drawBlock(
                        nextPieceCtx,
                        offsetX + x,
                        offsetY + y,
                        nextPiece.color
                    );
                }
            }
        }
    }
}

// ブロックの描画
function drawBlock(ctx, x, y, colorIndex) {
    const color = COLORS[colorIndex];
    
    // ブロックの背景
    ctx.fillStyle = color;
    ctx.fillRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
    
    // ブロックの光沢効果
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.fillRect(
        x * BLOCK_SIZE + 1,
        y * BLOCK_SIZE + 1,
        BLOCK_SIZE - 2,
        BLOCK_SIZE / 3
    );
    
    // ブロックの枠線
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.lineWidth = 1;
    ctx.strokeRect(
        x * BLOCK_SIZE,
        y * BLOCK_SIZE,
        BLOCK_SIZE,
        BLOCK_SIZE
    );
    
    // キラキラエフェクト（ランダム）
    if (Math.random() < 0.03) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        const size = Math.random() * 3 + 1;
        const sparkleX = x * BLOCK_SIZE + Math.random() * BLOCK_SIZE;
        const sparkleY = y * BLOCK_SIZE + Math.random() * BLOCK_SIZE;
        ctx.beginPath();
        ctx.arc(sparkleX, sparkleY, size, 0, Math.PI * 2);
        ctx.fill();
    }
}

// UIの描画
function drawUI() {
    document.getElementById('score').textContent = score;
    document.getElementById('level').textContent = level;
    document.getElementById('lines').textContent = lines;
    document.getElementById('final-score').textContent = score;
}

// 新しいピースの生成
function getNewPiece() {
    // ランダムなピースの選択（通常のピースが出やすく、特殊ピースは少し出にくくする）
    const pieceIndex = Math.random() < 0.7
        ? Math.floor(Math.random() * PIECES.length)
        : Math.floor(Math.random() * ALL_PIECES.length);
    
    const shape = ALL_PIECES[pieceIndex];
    const color = Math.floor(Math.random() * COLORS.length);
    
    // ピースの初期位置
    const x = Math.floor((COLS - shape[0].length) / 2);
    const y = 0;
    
    return { shape, color, x, y };
}

// ピースの回転
function rotatePiece(piece) {
    const newShape = [];
    for (let i = 0; i < piece.shape[0].length; i++) {
        newShape.push([]);
        for (let j = piece.shape.length - 1; j >= 0; j--) {
            newShape[i].push(piece.shape[j][i]);
        }
    }
    return newShape;
}

// 衝突判定
function isCollision(piece, offsetX, offsetY, shape = null) {
    const pieceShape = shape || piece.shape;
    
    for (let y = 0; y < pieceShape.length; y++) {
        for (let x = 0; x < pieceShape[y].length; x++) {
            if (pieceShape[y][x]) {
                const newX = piece.x + x + offsetX;
                const newY = piece.y + y + offsetY;
                
                if (
                    newX < 0 ||
                    newX >= COLS ||
                    newY >= ROWS ||
                    (newY >= 0 && board[newY][newX])
                ) {
                    return true;
                }
            }
        }
    }
    
    return false;
}

// ピースの移動
function movePiece(offsetX, offsetY) {
    if (!currentPiece || gameOver || isPaused) return;
    
    if (!isCollision(currentPiece, offsetX, offsetY)) {
        currentPiece.x += offsetX;
        currentPiece.y += offsetY;
        
        if (offsetX !== 0 && offsetY === 0) {
            playSound(moveSound);
        }
        
        drawBoard();
        return true;
    }
    
    // 下方向の移動で衝突した場合、ピースを固定
    if (offsetY > 0) {
        lockPiece();
    }
    
    return false;
}

// ピースの回転操作
function rotate() {
    if (!currentPiece || gameOver || isPaused) return;
    
    const newShape = rotatePiece(currentPiece);
    
    // 回転後の衝突チェック
    if (!isCollision(currentPiece, 0, 0, newShape)) {
        currentPiece.shape = newShape;
        playSound(rotateSound);
        drawBoard();
    } else {
        // 壁際での回転の場合、少し横にずらして回転できるか試す
        const kicks = [1, -1, 2, -2]; // 試す横方向のオフセット
        
        for (const kick of kicks) {
            if (!isCollision(currentPiece, kick, 0, newShape)) {
                currentPiece.x += kick;
                currentPiece.shape = newShape;
                playSound(rotateSound);
                drawBoard();
                break;
            }
        }
    }
}

// ピースの固定
function lockPiece() {
    for (let y = 0; y < currentPiece.shape.length; y++) {
        for (let x = 0; x < currentPiece.shape[y].length; x++) {
            if (currentPiece.shape[y][x]) {
                const boardY = currentPiece.y + y;
                const boardX = currentPiece.x + x;
                
                // ボード範囲内の場合のみ固定
                if (boardY >= 0 && boardY < ROWS && boardX >= 0 && boardX < COLS) {
                    board[boardY][boardX] = currentPiece.color + 1;
                }
            }
        }
    }
    
    playSound(dropSound);
    createParticles(currentPiece);
    
    // ラインの確認と消去
    const clearedLines = checkLines();
    
    if (clearedLines > 0) {
        updateScore(clearedLines);
        playSound(clearSound);
    }
    
    // 次のピースを設定
    currentPiece = nextPiece;
    nextPiece = getNewPiece();
    drawNextPiece();
    
    // ゲームオーバーチェック
    if (isCollision(currentPiece, 0, 0)) {
        gameOver = true;
        showGameOver();
    }
}

// ラインの確認と消去
function checkLines() {
    let linesCleared = 0;
    
    for (let y = ROWS - 1; y >= 0; y--) {
        let isLineComplete = true;
        
        for (let x = 0; x < COLS; x++) {
            if (!board[y][x]) {
                isLineComplete = false;
                break;
            }
        }
        
        if (isLineComplete) {
            // ラインの消去アニメーション
            animateClearLine(y);
            
            // ラインを消去して上から詰める
            for (let yy = y; yy > 0; yy--) {
                for (let x = 0; x < COLS; x++) {
                    board[yy][x] = board[yy - 1][x];
                }
            }
            
            // 一番上の行をクリア
            for (let x = 0; x < COLS; x++) {
                board[0][x] = 0;
            }
            
            linesCleared++;
            y++; // 同じ行を再チェック（上の行が下がってくるため）
        }
    }
    
    return linesCleared;
}

// ライン消去アニメーション
function animateClearLine(lineY) {
    // ラインのブロックを白く光らせる
    for (let x = 0; x < COLS; x++) {
        createParticlesAt(x * BLOCK_SIZE + BLOCK_SIZE / 2, lineY * BLOCK_SIZE + BLOCK_SIZE / 2, 5);
    }
}

// スコアの更新
function updateScore(clearedLines) {
    const linePoints = [0, 100, 300, 500, 800]; // 0, 1, 2, 3, 4ライン消去時のポイント
    const lineScore = linePoints[clearedLines] * level;
    
    score += lineScore;
    lines += clearedLines;
    
    // レベルアップ判定（10ライン消去ごと）
    const newLevel = Math.floor(lines / 10) + 1;
    if (newLevel > level) {
        level = newLevel;
        gameSpeed = Math.max(100, 1000 - (level - 1) * 100); // レベルに応じて速度アップ
        playSound(levelUpSound);
    }
    
    drawUI();
}

// キー入力の処理
function handleKeyPress(e) {
    if (gameOver) return;
    
    switch (e.keyCode) {
        case 37: // 左矢印
            movePiece(-1, 0);
            break;
        case 39: // 右矢印
            movePiece(1, 0);
            break;
        case 40: // 下矢印
            movePiece(0, 1);
            break;
        case 38: // 上矢印
            rotate();
            break;
        case 32: // スペース（ハードドロップ）
            hardDrop();
            break;
        case 80: // P（ポーズ）
            togglePause();
            break;
    }
}

// ハードドロップ（即時落下）
function hardDrop() {
    if (!currentPiece || gameOver || isPaused) return;
    
    let dropDistance = 0;
    while (!isCollision(currentPiece, 0, dropDistance + 1)) {
        dropDistance++;
    }
    
    if (dropDistance > 0) {
        currentPiece.y += dropDistance;
        lockPiece();
        drawBoard();
    }
}

// ゲームループ
function gameLoop(timestamp) {
    if (!dropStart) dropStart = timestamp;
    
    const deltaTime = timestamp - dropStart;
    
    if (deltaTime > gameSpeed && !isPaused && !gameOver) {
        movePiece(0, 1);
        dropStart = timestamp;
    }
    
    // パーティクルの更新
    updateParticles();
    
    animationId = requestAnimationFrame(gameLoop);
}

// ゲームの開始
function startGame() {
    if (gameOver || !currentPiece) {
        resetGame();
        return;
    }
    
    if (isPaused) {
        isPaused = false;
        bgm.play();
        startButton.textContent = '一時停止';
    } else {
        isPaused = true;
        bgm.pause();
        startButton.textContent = '再開';
    }
}

// ゲームのリセット
function resetGame() {
    // ゲームの状態をリセット
    createBoard();
    score = 0;
    lines = 0;
    level = 1;
    gameSpeed = 1000;
    gameOver = false;
    isPaused = false;
    particles = [];
    
    // 音楽の再生
    bgm.currentTime = 0;
    bgm.play();
    
    // ピースの初期化
    currentPiece = getNewPiece();
    nextPiece = getNewPiece();
    
    // UIの更新
    drawBoard();
    drawNextPiece();
    drawUI();
    
    // ゲームオーバー画面を非表示
    document.getElementById('game-over').classList.add('hidden');
    
    // ボタンテキストの更新
    startButton.textContent = '一時停止';
    
    // アニメーションの開始
    if (animationId) {
        cancelAnimationFrame(animationId);
    }
    dropStart = 0;
    animationId = requestAnimationFrame(gameLoop);
}

// 一時停止の切り替え
function togglePause() {
    if (gameOver) return;
    
    isPaused = !isPaused;
    
    if (isPaused) {
        bgm.pause();
        startButton.textContent = '再開';
    } else {
        bgm.play();
        startButton.textContent = '一時停止';
    }
}

// ゲームオーバー表示
function showGameOver() {
    document.getElementById('game-over').classList.remove('hidden');
    bgm.pause();
    playSound(gameOverSound);
}

// パーティクルの作成（ピース固定時）
function createParticles(piece) {
    for (let y = 0; y < piece.shape.length; y++) {
        for (let x = 0; x < piece.shape[y].length; x++) {
            if (piece.shape[y][x]) {
                const posX = (piece.x + x) * BLOCK_SIZE + BLOCK_SIZE / 2;
                const posY = (piece.y + y) * BLOCK_SIZE + BLOCK_SIZE / 2;
                createParticlesAt(posX, posY, 3);
            }
        }
    }
}

// 指定位置にパーティクルを作成
function createParticlesAt(x, y, count) {
    const color = COLORS[Math.floor(Math.random() * COLORS.length)];
    
    for (let i = 0; i < count; i++) {
        const size = Math.random() * 5 + 2;
        const speedX = (Math.random() - 0.5) * 4;
        const speedY = (Math.random() - 0.5) * 4 - 2;
        const life = Math.random() * 30 + 20;
        
        particles.push({
            x, y, size, speedX, speedY, color, life
        });
    }
}

// パーティクルの更新
function updateParticles() {
    // キャンバスに直接描画
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        
        p.x += p.speedX;
        p.y += p.speedY;
        p.speedY += 0.1; // 重力
        p.life--;
        
        if (p.life <= 0) {
            particles.splice(i, 1);
            continue;
        }
        
        // パーティクルの描画
        ctx.globalAlpha = p.life / 50;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
    }
}

// 音声の再生
function playSound(sound) {
    if (!sound.paused) {
        sound.currentTime = 0;
    }
    sound.play().catch(e => console.log('音声再生エラー:', e));
}

// ゲームの初期化と開始
window.addEventListener('load', () => {
    init();
    
    // 音声ファイルが読み込まれていない場合のダミーファイル作成
    createDummySounds();
    
    // ゲームの自動開始
    setTimeout(() => {
        resetGame();
    }, 1000);
});

// ダミーの音声ファイル作成（実際の音声ファイルがない場合用）
function createDummySounds() {
    const sounds = [
        'move-sound', 'rotate-sound', 'drop-sound',
        'clear-sound', 'game-over-sound', 'level-up-sound', 'bgm'
    ];
    
    sounds.forEach(id => {
        const sound = document.getElementById(id);
        if (sound.error) {
            // AudioContextを使用してダミーの音声を作成
            try {
                const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
                const oscillator = audioCtx.createOscillator();
                const gainNode = audioCtx.createGain();
                
                oscillator.connect(gainNode);
                gainNode.connect(audioCtx.destination);
                
                // 音量を0に設定（無音）
                gainNode.gain.value = 0;
                
                // 短い音を生成
                oscillator.start();
                setTimeout(() => oscillator.stop(), 100);
                
                // ダミーの音声ファイルをBlobとして作成
                const blob = new Blob([new ArrayBuffer(10)], { type: 'audio/mp3' });
                const url = URL.createObjectURL(blob);
                sound.src = url;
            } catch (e) {
                console.log('ダミー音声の作成に失敗:', e);
            }
        }
    });
}

// soundsディレクトリがない場合は作成
function createSoundsDirectory() {
    // この関数はサーバーサイドでの実行が必要なため、
    // クライアントサイドJavaScriptでは実装できません。
    // 実際の環境では、サーバーサイドのコードやビルドスクリプトで
    // ディレクトリを作成する必要があります。
    console.log('Note: sounds directory should be created manually if it doesn\'t exist');
}
