/* ================================
   STAGE5.JS — The Infinite Maze
   Procedural maze, escalating entities,
   no winning — only how long you last.
   ================================ */

'use strict';

/* ═══════════════════════════════════════
   LEVEL CONFIG TABLE
   ═══════════════════════════════════════ */

function getLevelConfig(level) {
  const configs = {
    1: { size: 19, exits: 1, entities: 1, entSpeed: 0.40, plrSpeed: 3.0 },
    2: { size: 21, exits: 2, entities: 2, entSpeed: 0.65, plrSpeed: 2.75 },
    3: { size: 23, exits: 3, entities: 3, entSpeed: 0.85, plrSpeed: 2.5 },
    4: { size: 25, exits: 4, entities: 4, entSpeed: 1.00, plrSpeed: 2.2 },
  };
  if (level <= 4) return configs[level];
  // Level 5+: escalating
  return {
    size: 25 + (level - 4) * 2,
    exits: level,
    entities: level,
    entSpeed: 1.0 + (level - 4) * 0.15,
    plrSpeed: Math.max(2.2 - (level - 4) * 0.2, 1.5),
  };
}

/* ═══════════════════════════════════════
   STATE
   ═══════════════════════════════════════ */

let cvs, ctx, CS;                // canvas, context, cell size
let maze = [];                   // 2D array: 1=wall, 0=path, 2=exit
let COLS, ROWS;
let player, entities, trails;
let gameActive = false;
let animId = null;
let staticTimer = null;
let frameCount = 0;
let blobPhase = 0;
let currentLevel = 0;
let totalStartTime = 0;         // for "survived X seconds"
const keysDown = {};

// Entity shape assignments by index
const SHAPES = [
  { name: 'MANAGER', color: '#5a5a5a', glow: '#888888', shape: 'rect' },
  { name: 'AUDITOR', color: '#e8d87c', glow: '#f5f0a0', shape: 'diamond' },
  { name: 'INTERN',  color: '#7bc47b', glow: '#a0e8a0', shape: 'circle' },
  { name: 'ENTITY',  color: '#f0f0e8', glow: '#ffffff', shape: 'blob' },
];

/* ═══════════════════════════════════════
   MAZE GENERATION — Recursive Backtracker
   ═══════════════════════════════════════ */

function generateMaze(cols, rows) {
  // Ensure odd dimensions for clean walls
  if (cols % 2 === 0) cols++;
  if (rows % 2 === 0) rows++;

  // Start all walls
  const grid = [];
  for (let r = 0; r < rows; r++) {
    grid[r] = [];
    for (let c = 0; c < cols; c++) grid[r][c] = 1;
  }

  // Carve with DFS from center
  const startR = Math.floor(rows / 2) | 1;  // ensure odd
  const startC = Math.floor(cols / 2) | 1;
  grid[startR][startC] = 0;

  const stack = [{ r: startR, c: startC }];
  const visited = new Set();
  visited.add(`${startR},${startC}`);

  while (stack.length > 0) {
    const cur = stack[stack.length - 1];
    // Find unvisited neighbors 2 away
    const neighbors = [];
    const dirs = [
      { dr: -2, dc: 0 }, { dr: 2, dc: 0 },
      { dr: 0, dc: -2 }, { dr: 0, dc: 2 },
    ];
    for (const d of dirs) {
      const nr = cur.r + d.dr;
      const nc = cur.c + d.dc;
      if (nr > 0 && nr < rows - 1 && nc > 0 && nc < cols - 1
          && !visited.has(`${nr},${nc}`)) {
        neighbors.push({ r: nr, c: nc, wr: cur.r + d.dr / 2, wc: cur.c + d.dc / 2 });
      }
    }

    if (neighbors.length > 0) {
      const next = neighbors[Math.floor(Math.random() * neighbors.length)];
      // Carve wall between
      grid[next.wr][next.wc] = 0;
      grid[next.r][next.c] = 0;
      visited.add(`${next.r},${next.c}`);
      stack.push({ r: next.r, c: next.c });
    } else {
      stack.pop();
    }
  }

  // Add loops — remove ~15% of internal wall cells
  for (let r = 2; r < rows - 2; r++) {
    for (let c = 2; c < cols - 2; c++) {
      if (grid[r][c] === 1 && Math.random() < 0.15) {
        // Only remove if at least 2 adjacent paths (prevents isolated walls)
        let adj = 0;
        if (grid[r - 1][c] === 0) adj++;
        if (grid[r + 1][c] === 0) adj++;
        if (grid[r][c - 1] === 0) adj++;
        if (grid[r][c + 1] === 0) adj++;
        if (adj >= 2) grid[r][c] = 0;
      }
    }
  }

  return grid;
}

/* ═══════════════════════════════════════
   EXIT PLACEMENT — flood-fill distance
   ═══════════════════════════════════════ */

function placeExits(grid, numExits) {
  const rows = grid.length;
  const cols = grid[0].length;
  const centerR = Math.floor(rows / 2);
  const centerC = Math.floor(cols / 2);

  // BFS from center to compute distances
  const dist = Array.from({ length: rows }, () => Array(cols).fill(-1));
  const queue = [];

  // Find nearest walkable cell to center
  let startR = centerR, startC = centerC;
  if (grid[startR][startC] === 1) {
    // Search outward for first path
    outer: for (let d = 1; d < Math.max(rows, cols); d++) {
      for (let dr = -d; dr <= d; dr++) {
        for (let dc = -d; dc <= d; dc++) {
          const rr = centerR + dr, cc = centerC + dc;
          if (rr > 0 && rr < rows - 1 && cc > 0 && cc < cols - 1 && grid[rr][cc] === 0) {
            startR = rr; startC = cc; break outer;
          }
        }
      }
    }
  }

  dist[startR][startC] = 0;
  queue.push({ r: startR, c: startC });

  while (queue.length > 0) {
    const cur = queue.shift();
    const d = dist[cur.r][cur.c];
    const nb = [
      { r: cur.r - 1, c: cur.c }, { r: cur.r + 1, c: cur.c },
      { r: cur.r, c: cur.c - 1 }, { r: cur.r, c: cur.c + 1 },
    ];
    for (const n of nb) {
      if (n.r > 0 && n.r < rows - 1 && n.c > 0 && n.c < cols - 1
          && grid[n.r][n.c] === 0 && dist[n.r][n.c] === -1) {
        dist[n.r][n.c] = d + 1;
        queue.push(n);
      }
    }
  }

  // Collect all path cells with their distances, pick furthest dead-ends first
  const candidates = [];
  for (let r = 1; r < rows - 1; r++) {
    for (let c = 1; c < cols - 1; c++) {
      if (grid[r][c] === 0 && dist[r][c] > 0) {
        // Check if dead end (only 1 open neighbor)
        let openN = 0;
        if (grid[r - 1][c] === 0) openN++;
        if (grid[r + 1][c] === 0) openN++;
        if (grid[r][c - 1] === 0) openN++;
        if (grid[r][c + 1] === 0) openN++;
        candidates.push({ r, c, d: dist[r][c], deadEnd: openN <= 1 });
      }
    }
  }

  // Sort: dead-ends first, then by distance descending
  candidates.sort((a, b) => {
    if (a.deadEnd !== b.deadEnd) return a.deadEnd ? -1 : 1;
    return b.d - a.d;
  });

  // Pick top N exits, ensure minimum distance from center
  const minDist = Math.floor(Math.min(rows, cols) * 0.3);
  let placed = 0;
  for (const c of candidates) {
    if (placed >= numExits) break;
    if (c.d >= minDist) {
      grid[c.r][c.c] = 2;
      placed++;
    }
  }

  // Fallback if not enough placed
  for (const c of candidates) {
    if (placed >= numExits) break;
    if (grid[c.r][c.c] !== 2) {
      grid[c.r][c.c] = 2;
      placed++;
    }
  }

  return { spawnR: startR, spawnC: startC };
}

/* ═══════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════ */

function cellCenter(c, r) { return { x: c * CS + CS / 2, y: r * CS + CS / 2 }; }

function blocked(px, py, margin) {
  // Use a smaller collision bounding box to prevent frustrating wall snags
  const m = margin * 0.5;
  const pts = [
    { x: px - m, y: py - m }, { x: px + m, y: py - m },
    { x: px - m, y: py + m }, { x: px + m, y: py + m },
  ];
  for (const p of pts) {
    const c = Math.floor(p.x / CS);
    const r = Math.floor(p.y / CS);
    if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return true;
    if (maze[r][c] === 1) return true;
  }
  return false;
}

function dist2(ax, ay, bx, by) { return (ax - bx) ** 2 + (ay - by) ** 2; }

/* ═══════════════════════════════════════
   PLAYER
   ═══════════════════════════════════════ */

function createPlayer(spawnR, spawnC, speed) {
  const ctr = cellCenter(spawnC, spawnR);
  return {
    x: ctr.x, y: ctr.y,
    radius: CS * 0.35,
    speed: speed,
  };
}

function updatePlayer() {
  let dx = 0, dy = 0;
  if (keysDown['ArrowUp']    || keysDown['w'] || keysDown['W']) dy = -1;
  if (keysDown['ArrowDown']  || keysDown['s'] || keysDown['S']) dy = 1;
  if (keysDown['ArrowLeft']  || keysDown['a'] || keysDown['A']) dx = -1;
  if (keysDown['ArrowRight'] || keysDown['d'] || keysDown['D']) dx = 1;
  if (dx === 0 && dy === 0) return;

  // Normalize diagonal
  if (dx !== 0 && dy !== 0) {
    const n = Math.SQRT2;
    dx /= n; dy /= n;
  }

  const nx = player.x + dx * player.speed;
  const ny = player.y + dy * player.speed;

  // Corner assistance variables
  const cellR = Math.floor(player.y / CS);
  const cellC = Math.floor(player.x / CS);
  const nudgeAmt = player.speed * 0.85;

  // X movement and X-axis wall sliding with Y-nudge (Corner rounding)
  if (dx !== 0) {
    if (!blocked(nx, player.y, player.radius)) {
      player.x = nx;
    } else if (dy === 0) { 
      // Blocked horizontally. See if we can nudge Y towards a clear path.
      const targetY = cellR * CS + CS / 2;
      const destC = Math.floor((nx + Math.sign(dx) * player.radius) / CS);
      if (maze[cellR] && destC >= 0 && destC < COLS && maze[cellR][destC] !== 1) {
         // The direct path is clear, our offset is snagging. Nudge to center.
         const diff = targetY - player.y;
         if (Math.abs(diff) > 0.5) player.y += Math.sign(diff) * Math.min(Math.abs(diff), nudgeAmt);
      } else {
         // The direct path is blocked. Check if an adjacent row is clear.
         const altR = player.y > targetY ? cellR + 1 : cellR - 1;
         const altTargetY = altR * CS + CS / 2;
         if (maze[altR] && destC >= 0 && destC < COLS && maze[altR][destC] !== 1) {
            const diff = altTargetY - player.y;
            if (Math.abs(diff) < CS * 0.6) player.y += Math.sign(diff) * Math.min(Math.abs(diff), nudgeAmt);
         }
      }
    }
  }

  // Y movement and Y-axis wall sliding with X-nudge
  if (dy !== 0) {
    if (!blocked(player.x, ny, player.radius)) {
      player.y = ny;
    } else if (dx === 0) {
      // Blocked vertically. See if we can nudge X towards a clear path.
      const targetX = cellC * CS + CS / 2;
      const destR = Math.floor((ny + Math.sign(dy) * player.radius) / CS);
      if (maze[destR] && destR >= 0 && destR < ROWS && maze[destR][cellC] !== 1) {
         const diff = targetX - player.x;
         if (Math.abs(diff) > 0.5) player.x += Math.sign(diff) * Math.min(Math.abs(diff), nudgeAmt);
      } else {
         const altC = player.x > targetX ? cellC + 1 : cellC - 1;
         const altTargetX = altC * CS + CS / 2;
         if (maze[destR] && destR >= 0 && destR < ROWS && maze[destR][altC] !== 1) {
            const diff = altTargetX - player.x;
            if (Math.abs(diff) < CS * 0.6) player.x += Math.sign(diff) * Math.min(Math.abs(diff), nudgeAmt);
         }
      }
    }
  }

  // Trail
  if (frameCount % 6 === 0) {
    trails.push({ x: player.x, y: player.y, born: Date.now() });
  }
}

function drawPlayer() {
  ctx.save();
  ctx.shadowBlur = 12;
  ctx.shadowColor = 'rgba(255,255,255,0.6)';
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(player.x, player.y, player.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.restore();
}

/* ═══════════════════════════════════════
   ENTITIES
   ═══════════════════════════════════════ */

function spawnEntities(numEntities, entSpeedMult) {
  const ents = [];
  // Spawn around perimeter, away from player
  const margin = 5; // min cells from player spawn
  const perimeter = [];
  for (let r = 1; r < ROWS - 1; r++) {
    for (let c = 1; c < COLS - 1; c++) {
      if (maze[r][c] === 0) {
        const dr = Math.abs(r - Math.floor(ROWS / 2));
        const dc = Math.abs(c - Math.floor(COLS / 2));
        if (dr >= margin || dc >= margin) {
          perimeter.push({ r, c, dist: dr + dc });
        }
      }
    }
  }
  // Sort by distance from center descending
  perimeter.sort((a, b) => b.dist - a.dist);

  for (let i = 0; i < numEntities; i++) {
    const shapeDef = SHAPES[i % SHAPES.length];
    // Pick spawn — spread out evenly
    const idx = Math.floor((i / numEntities) * Math.min(perimeter.length, 20));
    const sp = perimeter[Math.min(idx, perimeter.length - 1)];
    const ctr = cellCenter(sp.c, sp.r);

    ents.push({
      x: ctr.x, y: ctr.y,
      speed: player.speed * entSpeedMult,
      dir: { dx: 0, dy: 0 },
      reEval: 0,           // frames until next direction re-evaluation
      ...shapeDef,
      alpha: shapeDef.shape === 'blob' ? 0 : 1,
      targetAlpha: shapeDef.shape === 'blob' ? 0 : 1,
      // Slight color variation for duplicates
      color: i >= 4
        ? adjustColor(shapeDef.color, i * 12)
        : shapeDef.color,
    });
  }
  return ents;
}

function adjustColor(hex, offset) {
  // Slight hue shift for variety
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const nr = Math.min(255, Math.max(0, r + ((offset * 13) % 40) - 20));
  const ng = Math.min(255, Math.max(0, g + ((offset * 7) % 30) - 15));
  const nb = Math.min(255, Math.max(0, b + ((offset * 11) % 35) - 17));
  return `#${nr.toString(16).padStart(2, '0')}${ng.toString(16).padStart(2, '0')}${nb.toString(16).padStart(2, '0')}`;
}

function updateEntities() {
  entities.forEach(ent => {
    ent.reEval--;

    // Re-evaluate direction
    if (ent.reEval <= 0) {
      ent.reEval = 8 + Math.floor(Math.random() * 6);

      // 80% chase player, 20% random
      let targetX, targetY;
      if (Math.random() < 0.80) {
        targetX = player.x;
        targetY = player.y;
      } else {
        targetX = Math.random() * COLS * CS;
        targetY = Math.random() * ROWS * CS;
      }

      // Pick best direction toward target
      const ddx = targetX - ent.x;
      const ddy = targetY - ent.y;
      const adx = Math.abs(ddx);
      const ady = Math.abs(ddy);

      // Try primary axis first, then secondary
      let bestDx, bestDy;
      if (adx > ady) {
        bestDx = Math.sign(ddx); bestDy = 0;
      } else {
        bestDx = 0; bestDy = Math.sign(ddy);
      }

      // Validate — if blocked, try alternatives
      if (!blocked(ent.x + bestDx * ent.speed * 2, ent.y + bestDy * ent.speed * 2, CS * 0.3)) {
        ent.dir = { dx: bestDx, dy: bestDy };
      } else {
        // Try secondary axis
        let altDx = 0, altDy = 0;
        if (bestDx !== 0) { altDx = 0; altDy = Math.sign(ddy) || 1; }
        else { altDx = Math.sign(ddx) || 1; altDy = 0; }

        if (!blocked(ent.x + altDx * ent.speed * 2, ent.y + altDy * ent.speed * 2, CS * 0.3)) {
          ent.dir = { dx: altDx, dy: altDy };
        } else {
          // Try all 4 directions
          const allDirs = [{ dx: 1, dy: 0 }, { dx: -1, dy: 0 }, { dx: 0, dy: 1 }, { dx: 0, dy: -1 }];
          const valid = allDirs.filter(d =>
            !blocked(ent.x + d.dx * ent.speed * 2, ent.y + d.dy * ent.speed * 2, CS * 0.3)
          );
          if (valid.length > 0) {
            ent.dir = valid[Math.floor(Math.random() * valid.length)];
          }
        }
      }
    }

    // Move
    const nx = ent.x + ent.dir.dx * ent.speed;
    const ny = ent.y + ent.dir.dy * ent.speed;
    if (!blocked(nx, ny, CS * 0.3)) {
      ent.x = nx;
      ent.y = ny;
    } else {
      ent.reEval = 0; // force re-eval next frame
    }

    // Blob visibility
    if (ent.shape === 'blob') {
      const d = Math.sqrt(dist2(ent.x, ent.y, player.x, player.y));
      ent.targetAlpha = d < CS * 4 ? 1 : 0;
      const spd = 0.04;
      if (ent.alpha < ent.targetAlpha) ent.alpha = Math.min(ent.alpha + spd, 1);
      if (ent.alpha > ent.targetAlpha) ent.alpha = Math.max(ent.alpha - spd * 0.3, 0);
    }
  });
}

function drawEntities() {
  entities.forEach(ent => {
    ctx.save();
    ctx.globalAlpha = ent.alpha;
    ctx.shadowBlur = 14;
    ctx.shadowColor = ent.glow;
    ctx.fillStyle = ent.color;
    const sz = CS * 0.38;

    if (ent.shape === 'rect') {
      ctx.fillRect(ent.x - sz, ent.y - sz * 1.15, sz * 2, sz * 2.3);
      ctx.fillStyle = '#444';
      ctx.fillRect(ent.x - sz, ent.y - sz * 0.1, sz * 2, sz * 0.2);

    } else if (ent.shape === 'diamond') {
      ctx.beginPath();
      ctx.moveTo(ent.x, ent.y - sz * 1.2);
      ctx.lineTo(ent.x + sz, ent.y);
      ctx.lineTo(ent.x, ent.y + sz * 1.2);
      ctx.lineTo(ent.x - sz, ent.y);
      ctx.closePath();
      ctx.fill();

    } else if (ent.shape === 'circle') {
      ctx.beginPath();
      ctx.arc(ent.x, ent.y, sz, 0, Math.PI * 2);
      ctx.fill();

    } else if (ent.shape === 'blob') {
      ctx.beginPath();
      const segs = 14;
      for (let i = 0; i < segs; i++) {
        const angle = (i / segs) * Math.PI * 2;
        const variance = Math.sin(blobPhase + i * 1.7) * CS * 0.07;
        const r = sz + variance;
        const bx = ent.x + Math.cos(angle) * r;
        const by = ent.y + Math.sin(angle) * r;
        if (i === 0) ctx.moveTo(bx, by);
        else ctx.lineTo(bx, by);
      }
      ctx.closePath();
      ctx.fill();
    }

    ctx.shadowBlur = 0;
    ctx.restore();
  });
}

/* ═══════════════════════════════════════
   MAZE DRAWING
   ═══════════════════════════════════════ */

function drawMaze() {
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const x = c * CS;
      const y = r * CS;

      if (maze[r][c] === 1) {
        // WALL
        ctx.fillStyle = '#5c4a00';
        ctx.fillRect(x, y, CS, CS);
        ctx.strokeStyle = '#3d3100';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(x + 0.5, y + 0.5, CS - 1, CS - 1);
        // Top-left bevel
        ctx.strokeStyle = 'rgba(120,90,0,0.4)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x + 1, y + CS - 1);
        ctx.lineTo(x + 1, y + 1);
        ctx.lineTo(x + CS - 1, y + 1);
        ctx.stroke();

      } else if (maze[r][c] === 2) {
        // EXIT
        ctx.fillStyle = '#2d5a00';
        ctx.fillRect(x, y, CS, CS);
        // Pulsing border
        const pulse = 0.4 + 0.6 * Math.sin(Date.now() / 400);
        ctx.strokeStyle = `rgba(80,255,40,${pulse})`;
        ctx.lineWidth = 2.5;
        ctx.strokeRect(x + 1, y + 1, CS - 2, CS - 2);
        // Outer glow
        ctx.shadowBlur = 8;
        ctx.shadowColor = `rgba(80,255,40,${pulse * 0.5})`;
        ctx.strokeRect(x + 1, y + 1, CS - 2, CS - 2);
        ctx.shadowBlur = 0;
        // Text
        ctx.fillStyle = '#88ff44';
        ctx.font = `bold ${Math.max(CS * 0.28, 7)}px 'Courier New',monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('EXIT', x + CS / 2, y + CS * 0.38);
        ctx.fillText('→', x + CS / 2, y + CS * 0.68);

      } else {
        // PATH
        ctx.fillStyle = '#f5c842';
        ctx.fillRect(x, y, CS, CS);
      }
    }
  }
}

/* ═══════════════════════════════════════
   TRAILS
   ═══════════════════════════════════════ */

function drawTrails() {
  const now = Date.now();
  for (let i = trails.length - 1; i >= 0; i--) {
    const t = trails[i];
    const age = now - t.born;
    if (age > 2000) { trails.splice(i, 1); continue; }
    const alpha = 0.28 * (1 - age / 2000);
    ctx.beginPath();
    ctx.arc(t.x, t.y, CS * 0.08, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255,253,231,${alpha})`;
    ctx.fill();
  }
}

/* ═══════════════════════════════════════
   COLLISIONS
   ═══════════════════════════════════════ */

function checkCollisions() {
  // Entity catch
  for (const ent of entities) {
    if (ent.shape === 'blob' && ent.alpha < 0.15) continue;
    const d = Math.sqrt(dist2(ent.x, ent.y, player.x, player.y));
    if (d < CS * 0.55) {
      triggerCatch();
      return;
    }
  }

  // Exit check
  const pc = Math.floor(player.x / CS);
  const pr = Math.floor(player.y / CS);
  if (pr >= 0 && pr < ROWS && pc >= 0 && pc < COLS && maze[pr][pc] === 2) {
    const ectr = cellCenter(pc, pr);
    if (Math.sqrt(dist2(player.x, player.y, ectr.x, ectr.y)) < CS * 0.6) {
      triggerLevelComplete();
    }
  }
}

/* ═══════════════════════════════════════
   GAME EVENTS
   ═══════════════════════════════════════ */

function triggerLevelComplete() {
  gameActive = false;

  // Flash the exit white
  const flash = document.getElementById('s5-flash');
  if (flash) { flash.classList.add('active'); }
  setTimeout(() => { if (flash) flash.classList.remove('active'); }, 200);

  triggerStatic();

  // Show level complete screen
  setTimeout(() => {
    const lcScreen = document.getElementById('s5-level-complete');
    const lcText = document.getElementById('s5-lc-text');
    if (lcScreen && lcText) {
      lcText.innerHTML =
        `LEVEL ${currentLevel} ESCAPED.<br><br>` +
        `...<br><br>` +
        `But the Backrooms go deeper.<br>` +
        `Something followed you through.`;
      lcScreen.style.display = 'flex';
    }
    // Hide canvas
    const wrap = document.getElementById('s5-canvas-wrap');
    if (wrap) wrap.style.display = 'none';

    // After delay, load next level
    setTimeout(() => {
      if (lcScreen) lcScreen.style.display = 'none';
      startLevel(currentLevel + 1);
    }, 2500);
  }, 300);
}

function triggerCatch() {
  gameActive = false;
  if (animId) { cancelAnimationFrame(animId); animId = null; }

  // White flash
  const flash = document.getElementById('s5-flash');
  if (flash) { flash.classList.add('active'); }
  setTimeout(() => { if (flash) flash.classList.remove('active'); }, 200);

  triggerStatic();

  // Calculate survival time
  const survived = Math.floor((Date.now() - totalStartTime) / 1000);

  // Fade to black then show catch screen
  setTimeout(() => {
    const wrap = document.getElementById('s5-canvas-wrap');
    const hud = document.getElementById('s5-hud');
    if (wrap) wrap.style.display = 'none';
    if (hud) hud.style.display = 'none';

    const catchScreen = document.getElementById('s5-catch-screen');
    const catchText = document.getElementById('s5-catch-text');
    if (catchScreen && catchText) {
      catchText.innerHTML =
        `CAUGHT.<br><br>` +
        `Level ${currentLevel} reached.<br>` +
        `Survived ${survived} seconds total.<br><br>` +
        `The entity found you.<br>` +
        `It always does.<br><br>` +
        `...<br><br>` +
        `Your session has been archived.`;
      catchScreen.style.display = 'flex';
    }

    // After delay, go to Stage 6
    setTimeout(() => {
      if (catchScreen) catchScreen.style.display = 'none';
      window.goToStage(6);
    }, 3000);
  }, 1000);
}

/* ═══════════════════════════════════════
   OVERLAY HELPERS
   ═══════════════════════════════════════ */

function triggerStatic() {
  const el = document.getElementById('s5-static-burst');
  if (!el) return;
  el.classList.remove('active');
  void el.offsetWidth;
  el.classList.add('active');
  setTimeout(() => el.classList.remove('active'), 300);
}

function startRandomStatic() {
  function schedule() {
    const delay = 10000 + Math.random() * 10000;
    staticTimer = setTimeout(() => {
      if (window.GOVNET.currentStage !== 5 || !gameActive) return;
      triggerStatic();
      schedule();
    }, delay);
  }
  schedule();
}

/* ═══════════════════════════════════════
   INPUT
   ═══════════════════════════════════════ */

function onKeyDown(e) {
  if (window.GOVNET.currentStage !== 5) return;
  
  // Re-request fullscreen on keypress to ensure we stay locked in
  const isFullscreen = !!(document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement);
  if (!isFullscreen) {
    const el = document.documentElement;
    const req = el.requestFullscreen || el.webkitRequestFullscreen || el.mozRequestFullScreen || el.msRequestFullscreen;
    if (req) {
      req.call(el).catch(() => {});
    }
  }

  keysDown[e.key] = true;
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
    e.preventDefault();
  }
}

function onKeyUp(e) { keysDown[e.key] = false; }

document.addEventListener('keydown', onKeyDown);
document.addEventListener('keyup', onKeyUp);

/* ═══════════════════════════════════════
   GAME LOOP
   ═══════════════════════════════════════ */

function gameLoop() {
  if (window.GOVNET.currentStage !== 5) return;

  frameCount++;
  blobPhase += 0.05;

  ctx.clearRect(0, 0, cvs.width, cvs.height);
  drawMaze();
  drawTrails();

  if (gameActive) {
    updatePlayer();
    updateEntities();
    checkCollisions();
  }

  drawEntities();
  drawPlayer();

  animId = requestAnimationFrame(gameLoop);
}

/* ═══════════════════════════════════════
   LEVEL START
   ═══════════════════════════════════════ */

function startLevel(level) {
  currentLevel = level;
  const cfg = getLevelConfig(level);
  COLS = cfg.size;
  ROWS = cfg.size;

  // Generate maze
  maze = generateMaze(COLS, ROWS);
  ROWS = maze.length;
  COLS = maze[0].length;

  // Place exits
  const { spawnR, spawnC } = placeExits(maze, cfg.exits);

  // Setup canvas
  cvs = document.getElementById('s5-maze-canvas');
  ctx = cvs.getContext('2d');
  const maxW = window.innerWidth;
  const maxH = window.innerHeight - 28;
  CS = Math.floor(Math.min(maxW / COLS, maxH / ROWS));
  cvs.width = CS * COLS;
  cvs.height = CS * ROWS;

  // Create player & entities
  player = createPlayer(spawnR, spawnC, cfg.plrSpeed);
  entities = spawnEntities(cfg.entities, cfg.entSpeed);
  trails = [];
  frameCount = 0;
  blobPhase = 0;
  gameActive = true;

  // Show canvas and HUD
  const wrap = document.getElementById('s5-canvas-wrap');
  const hud = document.getElementById('s5-hud');
  if (wrap) wrap.style.display = 'flex';
  if (hud) hud.style.display = 'flex';

  // Update HUD
  const hudLevel = document.getElementById('s5-hud-level');
  const hudEntities = document.getElementById('s5-hud-entities');
  if (hudLevel) hudLevel.textContent = `LEVEL: ${level}`;
  if (hudEntities) hudEntities.textContent = `ENTITIES: ${cfg.entities}`;

  // Start loop
  if (animId) cancelAnimationFrame(animId);
  animId = requestAnimationFrame(gameLoop);

  // Start random static
  if (staticTimer) clearTimeout(staticTimer);
  startRandomStatic();

  // Play backrooms hum
  window.playAudio && window.playAudio('backrooms');
}

/* ═══════════════════════════════════════
   RULES SCREEN — TYPEWRITER
   ═══════════════════════════════════════ */

const RULES_LINES = [
  '░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░',
  '  GOVNET CITIZEN RELOCATION NOTICE',
  '  CLASSIFICATION: LEVEL 0',
  '░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░',
  '',
  'CITIZEN,',
  '',
  'You have noclipped into the Backrooms.',
  '',
  'Your objective is simple:',
  '',
  '  [ FIND THE EXIT DOOR ]',
  '',
  'However, you are not alone.',
  '',
  'Something is already in here with you.',
  'It is looking for you.',
  'It has been looking for a long time.',
  '',
  'SURVIVAL BRIEFING:',
  '',
  '  ▸ Each level has one exit door.',
  '    Find it. Pass through it.',
  '',
  '  ▸ Each level you survive,',
  '    the maze grows.',
  '    More entities appear.',
  '    They move faster.',
  '    You move slower.',
  '',
  '  ▸ If an entity reaches you —',
  '    your session ends.',
  '    The credits roll.',
  '    You were never getting out.',
  '',
  '  ▸ There is no winning.',
  '    There is only how long',
  '    you lasted.',
  '',
  'CONTROLS:',
  '',
  '  ▸ WASD or ARROW KEYS to move',
  '  ▸ Find the glowing EXIT door',
  '  ▸ Do not let them touch you',
  '',
  'The hum of the fluorescent lights',
  'will accompany you.',
  '',
  'Good luck, Citizen.',
  '',
  '[GOVNET does not guarantee your return]',
  '',
  '░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░',
];

let s5ScrollAnimId = null;

function showRulesScreen() {
  const rulesDiv = document.getElementById('s5-rules');
  const textDiv = document.getElementById('s5-rules-text');
  if (!rulesDiv || !textDiv) return;

  rulesDiv.style.display = 'flex';
  rulesDiv.style.opacity = '1';
  textDiv.textContent = RULES_LINES.join('\n');
  textDiv.style.transform = `translateY(0px)`;
  
  // Extra request for fullscreen just in case we can get it
  const el = document.documentElement;
  const req = el.requestFullscreen || el.webkitRequestFullscreen || el.mozRequestFullScreen || el.msRequestFullscreen;
  if (req) req.call(el).catch(() => {});

  let scrollY = 0;
  
  function scrollStep() {
    scrollY -= 1.2; // Tweak speed for readability
    textDiv.style.transform = `translateY(${scrollY}px)`;
    
    // Use getBoundingClientRect to check if fully scrolled past the top
    const rect = textDiv.getBoundingClientRect();
    if (rect.bottom < 0) {
      cancelAnimationFrame(s5ScrollAnimId);
      s5ScrollAnimId = null;
      
      // Fade out rules (though text is gone, background fades)
      rulesDiv.style.transition = 'opacity 0.8s ease';
      rulesDiv.style.opacity = '0';
      setTimeout(() => {
        rulesDiv.style.display = 'none';
        rulesDiv.style.opacity = '1';
        rulesDiv.style.transition = '';
        // Start the game
        totalStartTime = Date.now();
        startLevel(1);
      }, 800);
    } else {
      s5ScrollAnimId = requestAnimationFrame(scrollStep);
    }
  }

  s5ScrollAnimId = requestAnimationFrame(scrollStep);
}

/* ═══════════════════════════════════════
   INIT & CLEANUP
   ═══════════════════════════════════════ */

function initStage5() {
  // Reset all screens
  const wrap = document.getElementById('s5-canvas-wrap');
  const hud = document.getElementById('s5-hud');
  const lc = document.getElementById('s5-level-complete');
  const cs = document.getElementById('s5-catch-screen');
  if (wrap) wrap.style.display = 'none';
  if (hud) hud.style.display = 'none';
  if (lc) lc.style.display = 'none';
  if (cs) cs.style.display = 'none';

  currentLevel = 0;
  totalStartTime = 0;

  // Show rules screen
  showRulesScreen();
}

function cleanupStage5() {
  gameActive = false;
  if (animId) { cancelAnimationFrame(animId); animId = null; }
  if (staticTimer) { clearTimeout(staticTimer); staticTimer = null; }
  if (s5ScrollAnimId) { cancelAnimationFrame(s5ScrollAnimId); s5ScrollAnimId = null; }

  const flash = document.getElementById('s5-flash');
  const fade = document.getElementById('s5-fade-black');
  if (flash) flash.classList.remove('active');
  if (fade) fade.classList.remove('active');

  // Clear key state
  for (const k in keysDown) keysDown[k] = false;
}
window.cleanupStage5 = cleanupStage5;

// Resize handler
window.addEventListener('resize', () => {
  if (window.GOVNET.currentStage !== 5 || !cvs || !gameActive) return;
  const maxW = window.innerWidth;
  const maxH = window.innerHeight - 28;
  CS = Math.floor(Math.min(maxW / COLS, maxH / ROWS));
  cvs.width = CS * COLS;
  cvs.height = CS * ROWS;
  if (player) player.radius = CS * 0.35;
});

/* ═══════════════════════════════════════
   EVENT HOOKS
   ═══════════════════════════════════════ */

document.addEventListener('govnet:stageEnter', ({ detail }) => {
  if (detail.stage === 5) {
    cleanupStage5();
    initStage5();
  } else {
    cleanupStage5();
  }
});
