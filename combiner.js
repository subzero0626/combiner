// ============================================
// 게임 설정 (기본 해상도 기준)
// ============================================
const CONFIG = {
    baseResolution: {
        width: 1920,
        height: 1080
    },
    player: {
        speed: 5, // 스케일 적용됨
        radius: 15, // 기본 해상도 기준
        maxHealth: 100,
        shootCooldown: 200, // 밀리초
        bulletSpeed: 10 // 스케일 적용됨
    },
    enemy: {
        baseSpeed: 1.5, // 스케일 적용됨
        baseRadius: 20, // 기본 해상도 기준
        baseHealth: 10,
        baseSpawnRate: 2000, // 밀리초
        speedIncrease: 0.1, // 난이도 증가당 속도 증가
        spawnRateDecrease: 50 // 난이도 증가당 스폰 간격 감소
    },
    bullet: {
        radius: 5 // 기본 해상도 기준
    },
    game: {
        duration: 180000, // 3분 (밀리초)
        difficultyIncreaseInterval: 10000 // 10초마다 난이도 증가
    },
    ui: {
        fontSize: 18, // 기본 해상도 기준
        titleFontSize: 48,
        buttonFontSize: 18,
        gridSize: 50 // 기본 해상도 기준
    }
};

// ============================================
// 유틸리티 함수
// ============================================
function distance(x1, y1, x2, y2) {
    return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}

function normalize(x, y) {
    const len = Math.sqrt(x * x + y * y);
    return len > 0 ? { x: x / len, y: y / len } : { x: 0, y: 0 };
}

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function random(min, max) {
    return Math.random() * (max - min) + min;
}

// ============================================
// 플레이어 클래스
// ============================================
class Player {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.radius = CONFIG.player.radius;
        this.speed = CONFIG.player.speed;
        this.health = CONFIG.player.maxHealth;
        this.maxHealth = CONFIG.player.maxHealth;
        this.angle = 0;
        this.shootCooldown = 0;
        
        // 입력 상태
        this.keys = {
            w: false,
            a: false,
            s: false,
            d: false
        };
        
        // 이벤트 리스너 설정
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        window.addEventListener('keydown', (e) => {
            const key = e.key.toLowerCase();
            if (key in this.keys) {
                this.keys[key] = true;
            }
        });
        
        window.addEventListener('keyup', (e) => {
            const key = e.key.toLowerCase();
            if (key in this.keys) {
                this.keys[key] = false;
            }
        });
    }
    
    update(deltaTime, mouseX, mouseY, scale, canvasWidth, canvasHeight) {
        // 이동 처리
        let dx = 0;
        let dy = 0;
        
        if (this.keys.w) dy -= 1;
        if (this.keys.s) dy += 1;
        if (this.keys.a) dx -= 1;
        if (this.keys.d) dx += 1;
        
        // 대각선 이동 정규화
        if (dx !== 0 && dy !== 0) {
            const normalized = normalize(dx, dy);
            dx = normalized.x;
            dy = normalized.y;
        }
        
        // 위치 업데이트 (스케일 적용된 속도)
        const scaledSpeed = this.speed * scale;
        this.x += dx * scaledSpeed;
        this.y += dy * scaledSpeed;
        
        // 화면 경계 체크
        const scaledRadius = this.radius * scale;
        this.x = clamp(this.x, scaledRadius, canvasWidth - scaledRadius);
        this.y = clamp(this.y, scaledRadius, canvasHeight - scaledRadius);
        
        // 마우스 방향으로 각도 계산
        const angleToMouse = Math.atan2(mouseY - this.y, mouseX - this.x);
        this.angle = angleToMouse;
        
        // 쿨다운 감소
        if (this.shootCooldown > 0) {
            this.shootCooldown -= deltaTime;
        }
    }
    
    shoot(mouseX, mouseY, scale) {
        if (this.shootCooldown <= 0) {
            const angle = Math.atan2(mouseY - this.y, mouseX - this.x);
            const scaledRadius = this.radius * scale;
            const startX = this.x + Math.cos(angle) * scaledRadius;
            const startY = this.y + Math.sin(angle) * scaledRadius;
            
            this.shootCooldown = CONFIG.player.shootCooldown;
            return new Bullet(startX, startY, angle, CONFIG.player.bulletSpeed, scale);
        }
        return null;
    }
    
    takeDamage(amount) {
        this.health -= amount;
        this.health = Math.max(0, this.health);
        return this.health <= 0;
    }
    
    draw(ctx, scale) {
        const scaledRadius = this.radius * scale;
        const scaledLineWidth = 2 * scale;
        
        // 플레이어 몸체
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);
        
        // 플레이어 원
        ctx.fillStyle = '#4ecdc4';
        ctx.beginPath();
        ctx.arc(0, 0, scaledRadius, 0, Math.PI * 2);
        ctx.fill();
        
        // 플레이어 방향 표시
        ctx.fillStyle = '#2a9d8f';
        ctx.beginPath();
        ctx.moveTo(scaledRadius, 0);
        ctx.lineTo(scaledRadius * 0.6, -scaledRadius * 0.4);
        ctx.lineTo(scaledRadius * 0.6, scaledRadius * 0.4);
        ctx.closePath();
        ctx.fill();
        
        // 외곽선
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = scaledLineWidth;
        ctx.beginPath();
        ctx.arc(0, 0, scaledRadius, 0, Math.PI * 2);
        ctx.stroke();
        
        ctx.restore();
    }
}

// ============================================
// 총알 클래스
// ============================================
class Bullet {
    constructor(x, y, angle, speed, scale) {
        this.x = x;
        this.y = y;
        this.angle = angle;
        this.speed = speed;
        this.radius = CONFIG.bullet.radius;
        this.baseRadius = CONFIG.bullet.radius;
        this.scale = scale || 1;
        this.damage = 1;
        this.active = true;
    }
    
    update(canvasWidth, canvasHeight) {
        const scaledSpeed = this.speed * this.scale;
        this.x += Math.cos(this.angle) * scaledSpeed;
        this.y += Math.sin(this.angle) * scaledSpeed;
        
        const scaledRadius = this.baseRadius * this.scale;
        // 화면 밖으로 나가면 비활성화
        if (this.x < -scaledRadius || this.x > canvasWidth + scaledRadius ||
            this.y < -scaledRadius || this.y > canvasHeight + scaledRadius) {
            this.active = false;
        }
    }
    
    draw(ctx, scale) {
        const scaledRadius = this.baseRadius * scale;
        
        ctx.fillStyle = '#ffd700';
        ctx.beginPath();
        ctx.arc(this.x, this.y, scaledRadius, 0, Math.PI * 2);
        ctx.fill();
        
        // 빛나는 효과
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(this.x, this.y, scaledRadius * 0.5, 0, Math.PI * 2);
        ctx.fill();
    }
    
    getScaledRadius(scale) {
        return this.baseRadius * scale;
    }
}

// ============================================
// 적 클래스
// ============================================
class Enemy {
    constructor(x, y, difficulty) {
        this.x = x;
        this.y = y;
        this.difficulty = difficulty || 1;
        this.baseRadius = CONFIG.enemy.baseRadius + (difficulty - 1) * 2;
        this.speed = CONFIG.enemy.baseSpeed + (difficulty - 1) * CONFIG.enemy.speedIncrease;
        this.maxHealth = CONFIG.enemy.baseHealth + (difficulty - 1) * 5;
        this.health = this.maxHealth;
        this.active = true;
        this.color = this.getColorByDifficulty();
    }
    
    getColorByDifficulty() {
        const colors = [
            '#ff4444', // 난이도 1
            '#ff6666', // 난이도 2
            '#ff8844', // 난이도 3
            '#ffaa44', // 난이도 4
            '#ffcc44', // 난이도 5+
        ];
        return colors[Math.min(this.difficulty - 1, colors.length - 1)];
    }
    
    update(playerX, playerY, scale) {
        // 플레이어 방향으로 이동 (스케일 적용된 속도)
        const dx = playerX - this.x;
        const dy = playerY - this.y;
        const dist = distance(this.x, this.y, playerX, playerY);
        
        if (dist > 0) {
            const normalized = normalize(dx, dy);
            const scaledSpeed = this.speed * scale;
            this.x += normalized.x * scaledSpeed;
            this.y += normalized.y * scaledSpeed;
        }
    }
    
    takeDamage(amount) {
        this.health -= amount;
        if (this.health <= 0) {
            this.active = false;
            return true;
        }
        return false;
    }
    
    getScaledRadius(scale) {
        return this.baseRadius * scale;
    }
    
    draw(ctx, scale) {
        const scaledRadius = this.baseRadius * scale;
        const scaledLineWidth = 2 * scale;
        
        // 적 몸체
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, scaledRadius, 0, Math.PI * 2);
        ctx.fill();
        
        // 외곽선
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = scaledLineWidth;
        ctx.beginPath();
        ctx.arc(this.x, this.y, scaledRadius, 0, Math.PI * 2);
        ctx.stroke();
        
        // 체력바 (손상된 경우에만)
        if (this.health < this.maxHealth) {
            const barWidth = scaledRadius * 2;
            const barHeight = 4 * scale;
            const healthPercent = this.health / this.maxHealth;
            const barY = this.y - scaledRadius - 10 * scale;
            
            ctx.fillStyle = '#333';
            ctx.fillRect(this.x - barWidth / 2, barY, barWidth, barHeight);
            
            ctx.fillStyle = '#0f0';
            ctx.fillRect(this.x - barWidth / 2, barY, barWidth * healthPercent, barHeight);
        }
    }
}

// ============================================
// 게임 메인 클래스
// ============================================
class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        
        // 스케일 팩터 초기화
        this.scaleX = 1;
        this.scaleY = 1;
        this.scale = 1;
        
        this.player = null;
        this.bullets = [];
        this.enemies = [];
        
        this.gameState = 'menu'; // menu, playing, gameOver
        this.score = 0;
        this.kills = 0;
        this.startTime = 0;
        this.currentTime = 0;
        this.lastEnemySpawn = 0;
        this.enemySpawnRate = CONFIG.enemy.baseSpawnRate;
        this.difficulty = 1;
        this.lastDifficultyIncrease = 0;
        
        this.mouseX = 0;
        this.mouseY = 0;
        this.mouseDown = false;
        
        // 캔버스 크기 조정 및 리사이즈 이벤트
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
        
        this.setupEventListeners();
        this.showStartScreen();
    }
    
    resizeCanvas() {
        // 전체 화면 크기
        const width = window.innerWidth;
        const height = window.innerHeight;
        
        // 이전 크기 저장 (비율 변환용) - 캔버스가 이미 설정되어 있는 경우에만
        const oldWidth = (this.canvas.width > 0) ? this.canvas.width : width;
        const oldHeight = (this.canvas.height > 0) ? this.canvas.height : height;
        
        // 캔버스 크기 설정
        this.canvas.width = width;
        this.canvas.height = height;
        
        // 스케일 팩터 계산 (기본 해상도 대비)
        this.scaleX = width / CONFIG.baseResolution.width;
        this.scaleY = height / CONFIG.baseResolution.height;
        this.scale = Math.min(this.scaleX, this.scaleY); // 비율 유지
        
        // 게임 로직상의 가상 해상도 (비율 유지)
        this.virtualWidth = CONFIG.baseResolution.width * this.scale;
        this.virtualHeight = CONFIG.baseResolution.height * this.scale;
        
        // 게임 중 리사이즈 시 모든 객체 위치 비율 유지
        if (this.gameState === 'playing' && (oldWidth !== width || oldHeight !== height)) {
            // 플레이어 위치 비율 유지
            if (this.player && oldWidth > 0 && oldHeight > 0) {
                this.player.x = (this.player.x / oldWidth) * width;
                this.player.y = (this.player.y / oldHeight) * height;
            }
            
            // 총알 위치 비율 유지 및 스케일 업데이트
            for (let bullet of this.bullets) {
                if (oldWidth > 0 && oldHeight > 0) {
                    bullet.x = (bullet.x / oldWidth) * width;
                    bullet.y = (bullet.y / oldHeight) * height;
                }
                bullet.scale = this.scale;
            }
            
            // 적 위치 비율 유지
            for (let enemy of this.enemies) {
                if (oldWidth > 0 && oldHeight > 0) {
                    enemy.x = (enemy.x / oldWidth) * width;
                    enemy.y = (enemy.y / oldHeight) * height;
                }
            }
        }
    }
    
    setupEventListeners() {
        // 마우스 이벤트
        this.canvas.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            this.mouseX = e.clientX - rect.left;
            this.mouseY = e.clientY - rect.top;
        });
        
        this.canvas.addEventListener('mousedown', () => {
            this.mouseDown = true;
        });
        
        this.canvas.addEventListener('mouseup', () => {
            this.mouseDown = false;
        });
        
        // 버튼 이벤트
        document.getElementById('startBtn').addEventListener('click', () => {
            this.startGame();
        });
        
        document.getElementById('collectionBtn').addEventListener('click', () => {
            // 보관소 화면 (추후 구현)
            console.log('보관소 화면');
        });
        
        document.getElementById('shopBtn').addEventListener('click', () => {
            // 상점 화면 (추후 구현)
            console.log('상점 화면');
        });
        
        document.getElementById('infoBtn').addEventListener('click', () => {
            // 정보 화면 (추후 구현)
            console.log('정보 화면');
        });
        
        document.getElementById('restartBtn').addEventListener('click', () => {
            this.startGame();
        });
        
        document.getElementById('mainMenuBtn').addEventListener('click', () => {
            this.showStartScreen();
        });
    }
    
    showStartScreen() {
        this.gameState = 'menu';
        document.getElementById('startScreen').classList.remove('hidden');
        document.getElementById('gameOverScreen').classList.add('hidden');
        // 메인 화면일 때 캔버스 숨기기
        this.canvas.style.display = 'none';
    }
    
    startGame() {
        this.gameState = 'playing';
        this.score = 0;
        this.kills = 0;
        this.startTime = Date.now();
        this.currentTime = 0;
        this.lastEnemySpawn = Date.now();
        this.enemySpawnRate = CONFIG.enemy.baseSpawnRate;
        this.difficulty = 1;
        this.lastDifficultyIncrease = Date.now();
        
        // 플레이어를 화면 중앙에 배치
        this.player = new Player(this.canvas.width / 2, this.canvas.height / 2);
        this.bullets = [];
        this.enemies = [];
        
        document.getElementById('startScreen').classList.add('hidden');
        document.getElementById('gameOverScreen').classList.add('hidden');
        // 게임 시작 시 캔버스 표시
        this.canvas.style.display = 'block';
        
        this.gameLoop();
    }
    
    spawnEnemy() {
        // 화면 가장자리에서 스폰
        let x, y;
        const side = Math.floor(Math.random() * 4);
        const spawnOffset = 50 * this.scale;
        
        switch(side) {
            case 0: // 위
                x = random(0, this.canvas.width);
                y = -spawnOffset;
                break;
            case 1: // 오른쪽
                x = this.canvas.width + spawnOffset;
                y = random(0, this.canvas.height);
                break;
            case 2: // 아래
                x = random(0, this.canvas.width);
                y = this.canvas.height + spawnOffset;
                break;
            case 3: // 왼쪽
                x = -spawnOffset;
                y = random(0, this.canvas.height);
                break;
        }
        
        this.enemies.push(new Enemy(x, y, this.difficulty));
    }
    
    updateDifficulty() {
        const now = Date.now();
        if (now - this.lastDifficultyIncrease >= CONFIG.game.difficultyIncreaseInterval) {
            this.difficulty++;
            this.enemySpawnRate = Math.max(
                500, 
                CONFIG.enemy.baseSpawnRate - (this.difficulty - 1) * CONFIG.enemy.spawnRateDecrease
            );
            this.lastDifficultyIncrease = now;
        }
    }
    
    resolveEnemyCollisions() {
        // 적끼리 충돌 회피 (겹치지 않게 밀어내기)
        for (let i = 0; i < this.enemies.length; i++) {
            const enemy1 = this.enemies[i];
            if (!enemy1.active) continue;
            
            for (let j = i + 1; j < this.enemies.length; j++) {
                const enemy2 = this.enemies[j];
                if (!enemy2.active) continue;
                
                const dx = enemy2.x - enemy1.x;
                const dy = enemy2.y - enemy1.y;
                const dist = distance(enemy1.x, enemy1.y, enemy2.x, enemy2.y);
                const r1 = enemy1.getScaledRadius(this.scale);
                const r2 = enemy2.getScaledRadius(this.scale);
                const minDist = r1 + r2 + (2 * this.scale); // 스케일 적용된 여유 공간
                
                if (dist < minDist && dist > 0) {
                    // 두 적이 겹치고 있으면 서로 밀어내기
                    const overlap = minDist - dist;
                    const normalized = normalize(dx, dy);
                    
                    // 각 적을 반대 방향으로 밀어내기 (중량 비례)
                    const pushForce1 = overlap * 0.5;
                    const pushForce2 = overlap * 0.5;
                    
                    enemy1.x -= normalized.x * pushForce1;
                    enemy1.y -= normalized.y * pushForce1;
                    enemy2.x += normalized.x * pushForce2;
                    enemy2.y += normalized.y * pushForce2;
                    
                    // 화면 경계 체크
                    enemy1.x = clamp(enemy1.x, r1, this.canvas.width - r1);
                    enemy1.y = clamp(enemy1.y, r1, this.canvas.height - r1);
                    enemy2.x = clamp(enemy2.x, r2, this.canvas.width - r2);
                    enemy2.y = clamp(enemy2.y, r2, this.canvas.height - r2);
                }
            }
        }
    }
    
    checkCollisions() {
        // 총알과 적 충돌
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const bullet = this.bullets[i];
            if (!bullet.active) continue;
            
            const bulletRadius = bullet.getScaledRadius(this.scale);
            
            for (let j = this.enemies.length - 1; j >= 0; j--) {
                const enemy = this.enemies[j];
                if (!enemy.active) continue;
                
                const enemyRadius = enemy.getScaledRadius(this.scale);
                const dist = distance(bullet.x, bullet.y, enemy.x, enemy.y);
                
                if (dist < bulletRadius + enemyRadius) {
                    bullet.active = false;
                    if (enemy.takeDamage(bullet.damage)) {
                        this.kills++;
                        this.score += this.difficulty * 10;
                        enemy.active = false;
                        this.enemies.splice(j, 1);
                    }
                    break;
                }
            }
        }
        
        // 플레이어와 적 충돌
        const playerRadius = this.player.radius * this.scale;
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const enemy = this.enemies[i];
            if (!enemy.active) continue;
            
            const enemyRadius = enemy.getScaledRadius(this.scale);
            const dist = distance(this.player.x, this.player.y, enemy.x, enemy.y);
            
            if (dist < playerRadius + enemyRadius) {
                if (this.player.takeDamage(5)) {
                    this.gameOver();
                    return;
                }
                // 충돌 시 적 밀어내기
                const dx = enemy.x - this.player.x;
                const dy = enemy.y - this.player.y;
                const pushDist = playerRadius + enemyRadius + (5 * this.scale);
                const normalized = normalize(dx, dy);
                enemy.x = this.player.x + normalized.x * pushDist;
                enemy.y = this.player.y + normalized.y * pushDist;
            }
        }
    }
    
    update(deltaTime) {
        if (this.gameState !== 'playing') return;
        
        // 게임 시간 업데이트
        this.currentTime = Date.now() - this.startTime;
        const remainingTime = Math.max(0, CONFIG.game.duration - this.currentTime);
        
        // 시간 종료 체크
        if (remainingTime <= 0) {
            this.gameOver();
            return;
        }
        
        // 난이도 증가
        this.updateDifficulty();
        
        // 적 스폰
        const now = Date.now();
        if (now - this.lastEnemySpawn >= this.enemySpawnRate) {
            this.spawnEnemy();
            this.lastEnemySpawn = now;
        }
        
        // 플레이어 업데이트
        this.player.update(deltaTime, this.mouseX, this.mouseY, this.scale, this.canvas.width, this.canvas.height);
        
        // 총알 발사
        if (this.mouseDown) {
            const bullet = this.player.shoot(this.mouseX, this.mouseY, this.scale);
            if (bullet) {
                this.bullets.push(bullet);
            }
        }
        
        // 총알 업데이트
        for (let bullet of this.bullets) {
            bullet.update(this.canvas.width, this.canvas.height);
        }
        this.bullets = this.bullets.filter(b => b.active);
        
        // 적 업데이트
        for (let enemy of this.enemies) {
            enemy.update(this.player.x, this.player.y, this.scale);
        }
        
        // 적끼리 겹치지 않도록 충돌 회피
        this.resolveEnemyCollisions();
        
        this.enemies = this.enemies.filter(e => e.active);
        
        // 충돌 체크
        this.checkCollisions();
        
        // UI 업데이트
        this.updateUI(remainingTime);
    }
    
    updateUI(remainingTime) {
        // 체력바
        const healthPercent = (this.player.health / this.player.maxHealth) * 100;
        document.getElementById('healthFill').style.width = healthPercent + '%';
        document.getElementById('healthText').textContent = 
            `${Math.ceil(this.player.health)} / ${this.player.maxHealth}`;
        
        // 타이머
        const minutes = Math.floor(remainingTime / 60000);
        const seconds = Math.floor((remainingTime % 60000) / 1000);
        document.getElementById('timer').textContent = 
            `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        
        // 점수
        document.getElementById('score').textContent = `점수: ${this.score} (킬: ${this.kills})`;
    }
    
    gameOver() {
        this.gameState = 'gameOver';
        const survivalTime = Math.floor(this.currentTime / 1000);
        const coinsEarned = Math.floor(this.score / 10);
        
        document.getElementById('finalScore').textContent = `최종 점수: ${this.score}`;
        document.getElementById('finalTime').textContent = `생존 시간: ${survivalTime}초`;
        document.getElementById('coinsEarned').textContent = `획득 재화: ${coinsEarned}`;
        document.getElementById('gameOverScreen').classList.remove('hidden');
    }
    
    draw() {
        // 화면 클리어
        this.ctx.fillStyle = '#1a1a2e';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        if (this.gameState !== 'playing') return;
        
        // 그리드 배경 (스케일 적용)
        this.ctx.strokeStyle = 'rgba(78, 205, 196, 0.1)';
        this.ctx.lineWidth = 1 * this.scale;
        const gridSize = CONFIG.ui.gridSize * this.scale;
        for (let x = 0; x < this.canvas.width; x += gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, this.canvas.height);
            this.ctx.stroke();
        }
        for (let y = 0; y < this.canvas.height; y += gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(this.canvas.width, y);
            this.ctx.stroke();
        }
        
        // 총알 그리기
        for (let bullet of this.bullets) {
            bullet.draw(this.ctx, this.scale);
        }
        
        // 적 그리기
        for (let enemy of this.enemies) {
            enemy.draw(this.ctx, this.scale);
        }
        
        // 플레이어 그리기
        if (this.player) {
            this.player.draw(this.ctx, this.scale);
        }
    }
    
    gameLoop() {
        let lastTime = performance.now();
        
        const loop = (currentTime) => {
            if (this.gameState !== 'playing') return;
            
            const deltaTime = currentTime - lastTime;
            lastTime = currentTime;
            
            this.update(deltaTime);
            this.draw();
            
            requestAnimationFrame(loop);
        };
        
        requestAnimationFrame(loop);
    }
}

// ============================================
// 게임 시작
// ============================================
window.addEventListener('load', () => {
    new Game();
});