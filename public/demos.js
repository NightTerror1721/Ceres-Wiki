// Ceres Wiki - demos interactivos en canvas.
// Se montan en los bloques <GameDemo kind="..."/> que renderiza el servidor.
// Son versiones JavaScript de los mismos juegos que se explican en el tutorial, para poder
// jugarlos en la propia wiki sin compilar.

const PALETTE = {
  bg: '#05070d', fg: '#e6eaf3', dim: '#5a6478',
  p1: '#6d94ff', p2: '#ff9e64', ball: '#ffd166',
  brick: ['#ef476f', '#ffd166', '#06d6a0', '#4cc9f0', '#b388ff'],
  wall: '#2b3450', crate: '#c98a3b', goal: '#16a394', floor: '#101728',
  grass: '#1f6f43', tree: '#173a26', water: '#1b5fa8', path: '#6b5a3e'
};

function makeCanvas(stage, w, h) {
  stage.innerHTML = '';
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  canvas.style.aspectRatio = `${w} / ${h}`;
  stage.appendChild(canvas);
  return { canvas, ctx: canvas.getContext('2d') };
}

function button(controls, label, onClick) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'game-btn';
  b.textContent = label;
  b.addEventListener('click', onClick);
  controls.appendChild(b);
  return b;
}

function focusable(stage) {
  stage.tabIndex = 0;
  stage.addEventListener('pointerdown', () => stage.focus());
}

function loop(canvas, tick) {
  let last = performance.now();
  function frame(now) {
    if (!canvas.isConnected) return; // demo retirada: parar
    const dt = Math.min(50, now - last) / 1000;
    last = now;
    tick(dt, now);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

/* ---------------- PONG ---------------- */
function demoPong(wrap) {
  const stage = wrap.querySelector('.game-stage');
  const controls = wrap.querySelector('.game-controls');
  const scoreEl = document.createElement('span');
  scoreEl.className = 'game-score';
  const { canvas, ctx } = makeCanvas(stage, 480, 300);
  const W = 480, H = 300;
  const P = { w: 8, h: 54 };
  let left = H / 2 - P.h / 2, right = H / 2 - P.h / 2;
  let ball = { x: W / 2, y: H / 2, vx: 190, vy: 90 };
  let sl = 0, sr = 0, paused = false, keys = {};
  const target = { y: H / 2 };

  function reset(dir) {
    ball = { x: W / 2, y: H / 2, vx: 190 * dir, vy: (Math.random() * 120 - 60) };
  }
  function serve() { reset(Math.random() < 0.5 ? -1 : 1); controls.appendChild(scoreEl); }

  stage.addEventListener('mousemove', (e) => {
    const r = canvas.getBoundingClientRect();
    target.y = (e.clientY - r.top) / r.height * H;
  });
  stage.addEventListener('keydown', (e) => { keys[e.key.toLowerCase()] = true; e.preventDefault(); });
  stage.addEventListener('keyup', (e) => { keys[e.key.toLowerCase()] = false; });
  focusable(stage);
  button(controls, 'Pausa', (b) => { paused = !paused; b.textContent = paused ? 'Seguir' : 'Pausa'; });
  button(controls, 'Reiniciar', () => { sl = sr = 0; paused = false; serve(); });
  controls.appendChild(scoreEl);

  loop(canvas, (dt) => {
    if (!paused) {
      if (keys['w'] || keys['arrowup']) target.y -= 320 * dt;
      if (keys['s'] || keys['arrowdown']) target.y += 320 * dt;
      target.y = Math.max(P.h / 2, Math.min(H - P.h / 2, target.y));
      left += (target.y - P.h / 2 - left) * Math.min(1, dt * 10);
      if (ball.vx > 0) right += (Math.max(left + 6, Math.min(H - P.h, ball.y - P.h / 2)) - right) * Math.min(1, dt * 2.6);
      ball.x += ball.vx * dt; ball.y += ball.vy * dt;
      if (ball.y < 6 || ball.y > H - 6) ball.vy = -ball.vy;
      if (ball.x - 6 < 18 + P.w && ball.y > left && ball.y < left + P.h && ball.vx < 0) {
        ball.vx = Math.abs(ball.vx) * 1.05;
        ball.vy += ((ball.y - (left + P.h / 2)) / (P.h / 2)) * 90;
      }
      if (ball.x + 6 > W - 18 - P.w && ball.y > right && ball.y < right + P.h && ball.vx > 0) {
        ball.vx = -Math.abs(ball.vx) * 1.05;
        ball.vy += ((ball.y - (right + P.h / 2)) / (P.h / 2)) * 90;
      }
      if (ball.x < -8) { sr++; serve(); }
      if (ball.x > W + 8) { sl++; serve(); }
    }
    ctx.fillStyle = PALETTE.bg; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = '#2a3350'; ctx.setLineDash([6, 8]);
    ctx.beginPath(); ctx.moveTo(W / 2, 0); ctx.lineTo(W / 2, H); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = PALETTE.p1; ctx.fillRect(18, left, P.w, P.h);
    ctx.fillStyle = PALETTE.p2; ctx.fillRect(W - 18 - P.w, right, P.w, P.h);
    ctx.fillStyle = PALETTE.ball; ctx.beginPath(); ctx.arc(ball.x, ball.y, 6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = PALETTE.fg; ctx.font = 'bold 34px monospace';
    ctx.fillText(String(sl), W / 2 - 52, 40); ctx.fillText(String(sr), W / 2 + 30, 40);
    scoreEl.textContent = `${sl} : ${sr}`;
  });
  serve();
}

/* ---------------- ARKANOID ---------------- */
function demoArkanoid(wrap) {
  const stage = wrap.querySelector('.game-stage');
  const controls = wrap.querySelector('.game-controls');
  const { canvas, ctx } = makeCanvas(stage, 480, 360);
  const W = 480, H = 360;
  const PW = 70, PH = 10, BR = 6;
  const cols = 8, rows = 5, bw = W / cols, bh = 22, top = 40;
  let paddle, ball, bricks, score, lives, paused, keys = {}, over, won;

  function resetBall() {
    paddle = { x: W / 2 - PW / 2 };
    ball = { x: W / 2, y: H - 40, vx: 150, vy: -200 };
  }
  function newGame() {
    bricks = [];
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) bricks.push({ x: c * bw, y: top + r * bh, alive: 1, color: PALETTE.brick[r % PALETTE.brick.length] });
    score = 0; lives = 3; over = false; won = false; paused = false;
    resetBall();
  }
  stage.addEventListener('mousemove', (e) => {
    const r = canvas.getBoundingClientRect();
    paddle.x = (e.clientX - r.left) / r.width * W - PW / 2;
  });
  stage.addEventListener('keydown', (e) => { keys[e.key.toLowerCase()] = true; e.preventDefault(); });
  stage.addEventListener('keyup', (e) => { keys[e.key.toLowerCase()] = false; });
  focusable(stage);
  button(controls, 'Pausa', (b) => { paused = !paused; b.textContent = paused ? 'Seguir' : 'Pausa'; });
  button(controls, 'Reiniciar', newGame);
  const scoreEl = document.createElement('span'); scoreEl.className = 'game-score'; controls.appendChild(scoreEl);
  newGame();

  loop(canvas, (dt) => {
    if (!paused && !over && !won) {
      if (keys['arrowleft'] || keys['a']) paddle.x -= 340 * dt;
      if (keys['arrowright'] || keys['d']) paddle.x += 340 * dt;
      paddle.x = Math.max(0, Math.min(W - PW, paddle.x));
      ball.x += ball.vx * dt; ball.y += ball.vy * dt;
      if (ball.x < BR || ball.x > W - BR) ball.vx = -ball.vx;
      if (ball.y < BR) ball.vy = -ball.vy;
      if (ball.y > H - 24 && ball.y < H - 14 && ball.x > paddle.x - BR && ball.x < paddle.x + PW + BR && ball.vy > 0) {
        ball.vy = -Math.abs(ball.vy);
        ball.vx += ((ball.x - (paddle.x + PW / 2)) / (PW / 2)) * 60;
      }
      if (ball.y > H + 10) {
        lives--;
        if (lives <= 0) over = true; else resetBall();
      }
      for (const b of bricks) {
        if (!b.alive) continue;
        if (ball.x > b.x - BR && ball.x < b.x + bw + BR && ball.y > b.y - BR && ball.y < b.y + bh + BR) {
          const overlapX = Math.min(Math.abs(ball.x - b.x), Math.abs(ball.x - (b.x + bw)));
          const overlapY = Math.min(Math.abs(ball.y - b.y), Math.abs(ball.y - (b.y + bh)));
          if (overlapY < overlapX) ball.vy = -ball.vy; else ball.vx = -ball.vx;
          b.alive = 0; score += 10;
          break;
        }
      }
      if (bricks.every((b) => !b.alive)) won = true;
    }
    ctx.fillStyle = PALETTE.bg; ctx.fillRect(0, 0, W, H);
    for (const b of bricks) if (b.alive) { ctx.fillStyle = b.color; ctx.fillRect(b.x + 2, b.y + 2, bw - 4, bh - 4); }
    ctx.fillStyle = PALETTE.p1; ctx.fillRect(paddle.x, H - 22, PW, PH);
    ctx.fillStyle = PALETTE.ball; ctx.beginPath(); ctx.arc(ball.x, ball.y, BR, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = PALETTE.fg; ctx.font = '14px monospace';
    ctx.fillText(`Puntos ${score}   Vidas ${lives}`, 10, 22);
    if (over || won) {
      ctx.fillStyle = 'rgba(5,7,13,.72)'; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = won ? PALETTE.goal : PALETTE.p2; ctx.font = 'bold 28px monospace';
      ctx.fillText(won ? '¡Nivel superado!' : 'Game Over', 100, H / 2);
    }
    scoreEl.textContent = `${score} pts · ${lives} vidas`;
  });
}

/* ---------------- 4 EN RAYA ---------------- */
function demoConnect4(wrap) {
  const stage = wrap.querySelector('.game-stage');
  const controls = wrap.querySelector('.game-controls');
  const { canvas, ctx } = makeCanvas(stage, 490, 430);
  const COLS = 7, ROWS = 6, CELL = 64, PAD = 14;
  const W = COLS * CELL + PAD * 2, H = ROWS * CELL + PAD * 2 + 6;
  canvas.width = W; canvas.height = H;
  canvas.style.aspectRatio = `${W} / ${H}`;
  let board, turn, status, winCells;
  const you = 1, ai = 2;

  function reset() {
    board = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
    turn = you; status = 'Tu turno: haz clic en una columna'; winCells = [];
  }
  function drop(col, player) {
    for (let r = ROWS - 1; r >= 0; r--) if (!board[r][col]) { board[r][col] = player; return r; }
    return -1;
  }
  function checkWin() {
    const dirs = [[0, 1], [1, 0], [1, 1], [1, -1]];
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
      const p = board[r][c]; if (!p) continue;
      for (const [dr, dc] of dirs) {
        const cells = [[r, c]];
        for (let k = 1; k < 4; k++) {
          const nr = r + dr * k, nc = c + dc * k;
          if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS || board[nr][nc] !== p) break;
          cells.push([nr, nc]);
        }
        if (cells.length === 4) { winCells = cells; return p; }
      }
    }
    return 0;
  }
  function aiMove() {
    // gana si puede, bloquea si debe, si no elige una columna central valida
    const order = [3, 2, 4, 1, 5, 0, 6];
    for (const phase of ['win', 'block']) {
      for (const c of order) {
        if (board[0][c]) continue;
        const r = drop(c, phase === 'win' ? ai : you);
        const w = checkWin();
        board[r][c] = 0;
        if (w === (phase === 'win' ? ai : you)) return c;
      }
    }
    for (const c of order) if (!board[0][c]) return c;
    return -1;
  }
  function click(e) {
    if (turn !== you || status.startsWith('¡')) return;
    const rect = canvas.getBoundingClientRect();
    const col = Math.floor(((e.clientX - rect.left) / rect.width * W - PAD) / CELL);
    if (col < 0 || col >= COLS || board[0][col]) return;
    drop(col, you);
    let w = checkWin();
    if (w) { status = '¡Ganaste!'; turn = 0; return; }
    turn = ai;
    setTimeout(() => {
      const c = aiMove();
      if (c < 0) { status = 'Empate'; turn = 0; return; }
      drop(c, ai);
      w = checkWin();
      if (w) { status = 'Gana la máquina'; turn = 0; }
      else { turn = you; const full = board[0].every((v) => v); status = full ? 'Empate' : 'Tu turno'; }
    }, 260);
  }
  canvas.addEventListener('click', click);
  stage.addEventListener('keydown', (e) => {
    const n = parseInt(e.key, 10);
    if (n >= 1 && n <= 7) click({ clientX: canvas.getBoundingClientRect().left + (PAD + (n - 0.5) * CELL), clientY: 0 });
  });
  focusable(stage);
  button(controls, 'Reiniciar', reset);
  const scoreEl = document.createElement('span'); scoreEl.className = 'game-score'; controls.appendChild(scoreEl);
  reset();

  loop(canvas, () => {
    ctx.fillStyle = PALETTE.bg; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = PALETTE.p1; ctx.fillRect(PAD, 2, CELL, 4);
    ctx.fillStyle = PALETTE.p2; ctx.fillRect(PAD + CELL * 6, 2, CELL, 4);
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
      const x = PAD + c * CELL + CELL / 2, y = PAD + 6 + r * CELL + CELL / 2;
      const v = board[r][c];
      const inWin = winCells.some(([wr, wc]) => wr === r && wc === c);
      ctx.beginPath(); ctx.arc(x, y, CELL * 0.4, 0, Math.PI * 2);
      ctx.fillStyle = v === you ? PALETTE.p1 : v === ai ? PALETTE.p2 : '#141b2e';
      ctx.fill();
      if (inWin) { ctx.strokeStyle = PALETTE.ball; ctx.lineWidth = 3; ctx.stroke(); ctx.lineWidth = 1; }
    }
    ctx.fillStyle = PALETTE.fg; ctx.font = '14px monospace'; ctx.fillText(status, PAD, H - 4);
    scoreEl.textContent = `Tú (azul) vs máquina (naranja)`;
  });
}

/* ---------------- SOKOBAN (puzles por niveles) ---------------- */
function demoSokoban(wrap) {
  const stage = wrap.querySelector('.game-stage');
  const controls = wrap.querySelector('.game-controls');
  const levels = [
    ['#####', '#   #', '# $ #', '# @ #', '#  .#', '#####'],
    ['  ###  ', '  #.#  ', '### ###', '# $@$ #', '#  .  #', '#######'],
    ['#######', '#  .  #', '#  $  #', '#. $@ #', '#  $  #', '#  .  #', '#######']
  ];
  const TILE = 36;
  canvasSetup();
  function canvasSetup() {}
  const { canvas, ctx } = makeCanvas(stage, 8 * TILE, 8 * TILE);
  let grid, pr, pc, level = 0, moves = 0, solved = false;

  function load(i) {
    level = ((i % levels.length) + levels.length) % levels.length;
    const rows = levels[level];
    grid = rows.map((r) => r.split('').map((ch) => ({ wall: ch === '#', goal: ch === '.' || ch === '*' || ch === '+', crate: ch === '$' || ch === '*', player: ch === '@' || ch === '+' })));
    for (let r = 0; r < grid.length; r++) for (let c = 0; c < grid[r].length; c++) if (grid[r][c].player) { pr = r; pc = c; grid[r][c].player = false; }
    moves = 0; solved = false;
    canvas.width = grid[0].length * TILE; canvas.height = grid.length * TILE;
    canvas.style.aspectRatio = `${grid[0].length} / ${grid.length}`;
  }
  function done() { return grid.every((row) => row.every((c) => !c.crate || c.goal)); }
  function move(dr, dc) {
    if (solved) return;
    const nr = pr + dr, nc = pc + dc;
    const t = grid[nr]?.[nc]; if (!t || t.wall) return;
    if (t.crate) {
      const br = nr + dr, bc = nc + dc; const b = grid[br]?.[bc];
      if (!b || b.wall || b.crate) return;
      t.crate = false; b.crate = true;
    }
    pr = nr; pc = nc; moves++;
    if (done()) solved = true;
  }
  stage.addEventListener('keydown', (e) => {
    const k = e.key.toLowerCase();
    if (k === 'arrowup' || k === 'w') move(-1, 0);
    else if (k === 'arrowdown' || k === 's') move(1, 0);
    else if (k === 'arrowleft' || k === 'a') move(0, -1);
    else if (k === 'arrowright' || k === 'd') move(0, 1);
    else if (k === 'r') load(level);
    else return;
    e.preventDefault();
  });
  focusable(stage);
  button(controls, 'Nivel', () => load(level + 1));
  button(controls, 'Reiniciar', () => load(level));
  const scoreEl = document.createElement('span'); scoreEl.className = 'game-score'; controls.appendChild(scoreEl);
  load(0);

  loop(canvas, () => {
    ctx.fillStyle = PALETTE.bg; ctx.fillRect(0, 0, canvas.width, canvas.height);
    for (let r = 0; r < grid.length; r++) for (let c = 0; c < grid[r].length; c++) {
      const t = grid[r][c], x = c * TILE, y = r * TILE;
      if (t.wall) { ctx.fillStyle = PALETTE.wall; ctx.fillRect(x, y, TILE, TILE); continue; }
      ctx.fillStyle = PALETTE.floor; ctx.fillRect(x, y, TILE, TILE);
      if (t.goal) { ctx.fillStyle = PALETTE.goal; ctx.beginPath(); ctx.arc(x + TILE / 2, y + TILE / 2, TILE * 0.2, 0, Math.PI * 2); ctx.fill(); }
      if (t.crate) { ctx.fillStyle = t.goal ? '#e0af68' : PALETTE.crate; ctx.fillRect(x + 4, y + 4, TILE - 8, TILE - 8); ctx.strokeStyle = '#00000055'; ctx.strokeRect(x + 4, y + 4, TILE - 8, TILE - 8); }
      if (r === pr && c === pc) { ctx.fillStyle = PALETTE.p1; ctx.beginPath(); ctx.arc(x + TILE / 2, y + TILE / 2, TILE * 0.32, 0, Math.PI * 2); ctx.fill(); }
    }
    if (solved) { ctx.fillStyle = 'rgba(5,7,13,.6)'; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.fillStyle = PALETTE.goal; ctx.font = 'bold 22px monospace'; ctx.fillText('¡Resuelto!', 12, 30); }
    scoreEl.textContent = `Nivel ${level + 1}/${levels.length} · ${moves} mov · ${solved ? '✓' : ''}`;
  });
}

/* ---------------- AVENTURA RPG ---------------- */
function demoRpg(wrap) {
  const stage = wrap.querySelector('.game-stage');
  const controls = wrap.querySelector('.game-controls');
  const TILE = 32;
  const map = [
    'TTTTTTTTTTTTTTT',
    'T..G.....P....T',
    'T..G..WWW..N..T',
    'T.....WWW.....T',
    'T..G..........T',
    'T.............T',
    'TTTTTTTTTTTTTTT'
  ];
  const { canvas, ctx } = makeCanvas(stage, map[0].length * TILE, map.length * TILE);
  let px = 1, py = 1, facing = 'down', dialog = '', dialogTimer = 0;
  const solid = new Set(['T', 'W']);
  const sign = { x: 9, y: 1 };

  function tryMove(dx, dy, face) {
    facing = face;
    const nx = px + dx, ny = py + dy;
    if (map[ny]?.[nx] === undefined || solid.has(map[ny][nx])) return;
    if (map[ny][nx] === 'N') { dialog = 'Anciano: «Ve al claro (G) y vuelve».'; dialogTimer = 4; return; }
    px = nx; py = ny;
    if (px === sign.x && py === sign.y) { dialog = 'Cartel: «Bienvenido a Ceres».'; dialogTimer = 4; }
  }
  stage.addEventListener('keydown', (e) => {
    const k = e.key.toLowerCase();
    if (k === 'arrowup' || k === 'w') tryMove(0, -1, 'up');
    else if (k === 'arrowdown' || k === 's') tryMove(0, 1, 'down');
    else if (k === 'arrowleft' || k === 'a') tryMove(-1, 0, 'left');
    else if (k === 'arrowright' || k === 'd') tryMove(1, 0, 'right');
    else if (k === 'e' || k === ' ') {
      const ahead = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[facing];
      tryMove(ahead[0], ahead[1], facing);
    } else return;
    e.preventDefault();
  });
  focusable(stage);
  button(controls, 'Reiniciar', () => { px = 1; py = 1; dialog = ''; });

  loop(canvas, (dt) => {
    if (dialogTimer > 0) { dialogTimer -= dt; if (dialogTimer <= 0) dialog = ''; }
    ctx.fillStyle = PALETTE.bg; ctx.fillRect(0, 0, canvas.width, canvas.height);
    for (let r = 0; r < map.length; r++) for (let c = 0; c < map[r].length; c++) {
      const ch = map[r][c], x = c * TILE, y = r * TILE;
      ctx.fillStyle = ch === 'T' ? PALETTE.tree : ch === 'W' ? PALETTE.water : ch === 'G' ? PALETTE.grass : PALETTE.path;
      ctx.fillRect(x, y, TILE, TILE);
      if (ch === 'T') { ctx.fillStyle = PALETTE.tree; ctx.fillRect(x + 6, y + 2, TILE - 12, TILE - 10); }
      if (ch === 'P') { ctx.fillStyle = PALETTE.ball; ctx.fillRect(x + 10, y + 6, TILE - 20, TILE - 12); }
      if (ch === 'N') { ctx.fillStyle = '#b388ff'; ctx.beginPath(); ctx.arc(x + TILE / 2, y + TILE / 2, TILE * 0.3, 0, Math.PI * 2); ctx.fill(); }
    }
    // jugador
    const jx = px * TILE, jy = py * TILE;
    ctx.fillStyle = PALETTE.p1; ctx.fillRect(jx + 6, jy + 6, TILE - 12, TILE - 12);
    ctx.fillStyle = PALETTE.fg;
    const ex = facing === 'left' ? -3 : facing === 'right' ? 3 : 0;
    ctx.fillRect(jx + 12 + ex, jy + 11, 3, 3); ctx.fillRect(jx + 17 + ex, jy + 11, 3, 3);
    if (dialog) {
      ctx.fillStyle = 'rgba(5,7,13,.86)'; ctx.fillRect(4, canvas.height - 46, canvas.width - 8, 40);
      ctx.strokeStyle = PALETTE.p1; ctx.strokeRect(4, canvas.height - 46, canvas.width - 8, 40);
      ctx.fillStyle = PALETTE.fg; ctx.font = '13px monospace';
      ctx.fillText(dialog, 12, canvas.height - 22);
    }
  });
}

const DEMOS = { pong: demoPong, arkanoid: demoArkanoid, connect4: demoConnect4, sokoban: demoSokoban, rpg: demoRpg };

function mountDemos() {
  document.querySelectorAll('[data-game]').forEach((wrap) => {
    if (wrap.dataset.mounted) return;
    const kind = wrap.dataset.game;
    const fn = DEMOS[kind];
    if (!fn) { wrap.dataset.mounted = '1'; return; }
    wrap.dataset.mounted = '1';
    try { fn(wrap); } catch (e) { console.error('demo', kind, e); }
  });
}

document.addEventListener('ceres:content', mountDemos);
window.addEventListener('DOMContentLoaded', mountDemos);
mountDemos();
