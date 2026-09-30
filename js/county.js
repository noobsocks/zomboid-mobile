// 헤이븐 카운티 (2000x2000): 봉쇄 철책으로 둘러싸인 불규칙한 지역
// 강·호수 → 도시(모양이 제각각) → 굽은 국도 → 국도변 마을·농지 → 사건 현장 순서로 만듦
(function () {
  const T = DT.T;
  const MOVE_BLOCK = [0, 0, 0, 1, 0, 0, 1, 0, 1, 1, 1, 0];
  const SIGHT_BLOCK = [0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0];
  const S = 2000;
  // 도시별 역할 (이름·규모·특수건물·사연)
  const ROLES = [
    { key: 'fort', name: '포트 헤일', label: '카운티 중심 도시', n: 11, shape: 'blob', tag: '모든 것이 시작된 곳',
      shops: ['hospital', 'market', 'market', 'market', 'pharmacy', 'pharmacy', 'police', 'police', 'hardware', 'gas', 'gas', 'firestation', 'restaurant', 'restaurant', 'restaurant', 'bank', 'bank', 'sports', 'hunting', 'warehouse'] },
    { key: 'brook', name: '브룩포드', label: '강변 도시', n: 8, shape: 'long', tag: '다리가 끊긴 도시',
      shops: ['market', 'market', 'pharmacy', 'police', 'hardware', 'gas', 'restaurant', 'restaurant', 'bank', 'firestation', 'sports'] },
    { key: 'stone', name: '스톤브리지', label: '공장 도시', n: 7, shape: 'blob', tag: '공장 노동자들이 버티던 곳',
      shops: ['warehouse', 'warehouse', 'warehouse', 'factory', 'factory', 'factory', 'hardware', 'hardware', 'market', 'gas', 'restaurant'] },
    { key: 'lake', name: '레이크우드', label: '호숫가 별장 마을', n: 6, shape: 'ring', tag: '부자들의 은신처',
      shops: ['market', 'restaurant', 'sports', 'hunting', 'gas', 'pharmacy'] },
    { key: 'ashton', name: '애시턴', label: '공항 마을', n: 5, shape: 'blob', tag: '마지막 비행기를 놓친 곳',
      shops: ['terminal', 'terminal', 'market', 'gas', 'restaurant'] },
    { key: 'camp', name: '그레이필드 캠프', label: '군 대피소', n: 3, shape: 'full', tag: '대피소가 무덤이 된 곳', fence: true,
      shops: ['army', 'army', 'hospital', 'army'] },
    { key: 'prison', name: '블랙록 교도소', label: '교도소', n: 3, shape: 'full', tag: '문이 열린 채 버려진 곳', fence: true,
      shops: ['prison', 'prison', 'prison', 'prison'] },
    { key: 'mill', name: '밀포드', label: '소도시', n: 5, shape: 'blob', tag: '소식이 늦게 닿은 마을', start: true,
      shops: ['market', 'pharmacy', 'hardware', 'gas', 'restaurant', 'hunting'] },
    { key: 'red', name: '레드밀', label: '제재소 마을', n: 4, shape: 'long', tag: '숲 속 제재소 마을', start: true,
      shops: ['hardware', 'hardware', 'market', 'gas', 'warehouse', 'hunting'] },
    { key: 'east', name: '이스트베일', label: '중소 도시', n: 6, shape: 'blob', tag: '피난 행렬이 지나간 도시',
      shops: ['market', 'market', 'pharmacy', 'police', 'gas', 'restaurant', 'bank', 'firestation'] },
    { key: 'pine', name: '파인크레스트', label: '산골 마을', n: 4, shape: 'blob', tag: '사냥꾼들의 마을',
      shops: ['hunting', 'gas', 'market'] },
  ];

  function generateCounty(seed) {
    const W = S, H = S, N = W * H;
    const rng = DT.rng(seed ^ 0xc0017);
    const idx = (x, y) => y * W + x;
    const t = new Uint8Array(N), deco = new Uint8Array(N), reserved = new Uint8Array(N);
    const containers = [], houses = [], decor = [], cars = [], shops = [], lanes = [], lamps = [], towns = [], scenes = [], zspawn = [], runways = [], signs = [];
    const carConts = [];
    const CX = W / 2, CY = H / 2;

    // ---- 1) 카운티 경계 (각도별 반지름을 흔들어 불규칙한 모양) + 바탕 ----
    const ph = [rng() * 6.28, rng() * 6.28, rng() * 6.28, rng() * 6.28];
    const RB = new Float32Array(3600);
    for (let i = 0; i < 3600; i++) { const a = i / 3600 * Math.PI * 2; RB[i] = Math.min(975, 860 * (1 + .09 * Math.sin(2 * a + ph[0]) + .06 * Math.sin(3 * a + ph[1]) + .045 * Math.sin(5 * a + ph[2]) + .025 * Math.sin(11 * a + ph[3]))); }
    const rOf = a => RB[(((a / (Math.PI * 2)) % 1 + 1) % 1 * 3600) | 0];
    const inside = new Uint8Array(N);
    const G1 = 30, gw = Math.ceil(W / G1) + 2, grid = new Float32Array(gw * gw), nr = DT.rng(seed ^ 0x51ee7);
    for (let i = 0; i < grid.length; i++) grid[i] = nr();
    const G2 = 11, gw2 = Math.ceil(W / G2) + 2, grid2 = new Float32Array(gw2 * gw2);
    for (let i = 0; i < grid2.length; i++) grid2[i] = nr();
    const sm = v => v * v * (3 - 2 * v);
    const vn = (x, y, g, gr, gwid) => { const fx = x / g, fy = y / g, ix = fx | 0, iy = fy | 0, u = sm(fx - ix), v = sm(fy - iy);
      const a = gr[iy * gwid + ix], b = gr[iy * gwid + ix + 1], c = gr[(iy + 1) * gwid + ix], d = gr[(iy + 1) * gwid + ix + 1];
      return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v; };
    const noiseAt = (x, y) => vn(x, y, G1, grid, gw) * .7 + vn(x, y, G2, grid2, gw2) * .3;
    const tr = DT.rng(seed ^ 0x7ee5);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = idx(x, y), dx = x - CX, dy = y - CY;
      const inn = x > 2 && y > 2 && x < W - 3 && y < H - 3 && dx * dx + dy * dy < rOf(Math.atan2(dy, dx)) ** 2;
      inside[i] = inn ? 1 : 0;
      if (!inn) { t[i] = tr() < .8 ? T.TREE : T.GRASS; continue; }
      const n = noiseAt(x, y);
      const p = n > .66 ? .55 : n > .57 ? .16 : .01;
      t[i] = tr() < p ? T.TREE : T.GRASS;
    }
    const inAt = (x, y) => x >= 0 && y >= 0 && x < W && y < H && inside[idx(x, y)];
    const border = (a, inset) => { const r = rOf(a) - (inset || 0); return [Math.round(CX + Math.cos(a) * r), Math.round(CY + Math.sin(a) * r)]; };

    // ---- 2) 강 (경계에서 경계로 굽이쳐 흐름) + 호수 ----
    const water = (x, y) => t[idx(x, y)] === T.WATER;
    const carveDisc = (cx, cy, r, v) => { for (let y = Math.floor(cy - r); y <= cy + r; y++) for (let x = Math.floor(cx - r); x <= cx + r; x++) if (inAt(x, y) && (x - cx) ** 2 + (y - cy) ** 2 <= r * r) t[idx(x, y)] = v; };
    const a0 = rng() * Math.PI * 2, a1 = a0 + Math.PI + (rng() - .5) * .9;
    const [sx, sy] = border(a0, -20), [ex, ey] = border(a1, -20);
    const ctrl = [[sx, sy]];
    { const L = Math.hypot(ex - sx, ey - sy), nx = -(ey - sy) / L, ny = (ex - sx) / L; // 흐르는 방향과 수직으로만 흔듦 (되돌아가지 않게)
      for (let k = 1; k < 7; k++) { const f = k / 7, o = (rng() - .5) * 300; ctrl.push([sx + (ex - sx) * f + nx * o, sy + (ey - sy) * f + ny * o]); } }
    ctrl.push([ex, ey]);
    const river = [];
    const cr = (p0, p1, p2, p3, u) => .5 * (2 * p1 + (-p0 + p2) * u + (2 * p0 - 5 * p1 + 4 * p2 - p3) * u * u + (-p0 + 3 * p1 - 3 * p2 + p3) * u * u * u);
    for (let k = 0; k < ctrl.length - 1; k++) {
      const p0 = ctrl[Math.max(0, k - 1)], p1 = ctrl[k], p2 = ctrl[k + 1], p3 = ctrl[Math.min(ctrl.length - 1, k + 2)];
      const len = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]);
      for (let s = 0; s < len; s += 2) { const u = s / len; river.push([cr(p0[0], p1[0], p2[0], p3[0], u), cr(p0[1], p1[1], p2[1], p3[1], u)]); }
    }
    river.forEach(([x, y], i) => carveDisc(x, y, 3.2 + 1.3 * Math.sin(i * .013) + (i % 7 === 0 ? .6 : 0), T.WATER));
    const riverAt = f => river[Math.min(river.length - 1, Math.max(0, Math.floor(f * river.length)))];

    // ---- 3) 도시 배치 ----
    const boxes = [], placed = [];
    const clearOf = (x0, y0, x1, y1, m) => boxes.every(b => x1 + m < b[0] || x0 - m > b[2] || y1 + m < b[1] || y0 - m > b[3]);
    const allInside = (x0, y0, x1, y1, m) => { for (const [x, y] of [[x0 - m, y0 - m], [x1 + m, y0 - m], [x0 - m, y1 + m], [x1 + m, y1 + m], [(x0 + x1) / 2, y0 - m], [(x0 + x1) / 2, y1 + m], [x0 - m, (y0 + y1) / 2], [x1 + m, (y0 + y1) / 2]]) if (!inAt(Math.round(x), Math.round(y))) return false; return true; };
    const place = (role, pick) => { // pick() → 후보 중심점
      const n = role.n, SW = 22 * n + 6, km = n >> 1, off = 3 + 22 * km;
      // 조건에 맞는 후보를 여럿 뽑아, 이미 놓인 도시들과 가장 멀리 떨어진 곳을 고름 (골고루 퍼지게)
      let best = null;
      for (let tries = 0, found = 0; tries < 700 && found < 40; tries++) {
        const [cx, cy] = pick(tries);
        const ox = Math.round(cx) - off, oy = Math.round(cy) - off;
        if (!allInside(ox, oy, ox + SW, oy + SW, 30)) continue;
        if (!clearOf(ox, oy, ox + SW, oy + SW, role.n >= 6 ? 80 : 60)) continue;
        found++;
        const mcx = ox + SW / 2, mcy = oy + SW / 2;
        let score = placed.length ? Math.min(...placed.map(p => Math.hypot(p[0] - mcx, p[1] - mcy))) : 0;
        if (role.key === 'fort') score = -Math.hypot(mcx - CX, mcy - CY);
        if (!best || score > best[0]) best = [score, ox, oy];
      }
      if (!best) return null;
      const [, ox, oy] = best;
      boxes.push([ox, oy, ox + SW, oy + SW]); placed.push([ox + SW / 2, oy + SW / 2]);
      return { ox, oy, SW, km, cx: ox + off, cy: oy + off };
    };
    const rPick = (rmin, rmax) => () => { const a = rng() * Math.PI * 2, r = rmin + rng() * (rmax - rmin); return [CX + Math.cos(a) * r * rOf(a), CY + Math.sin(a) * r * rOf(a)]; };
    // 호수 (레이크우드 자리)
    let lakeC = null;
    const plan = [];
    for (const role of ROLES) {
      let pick;
      if (role.key === 'fort') pick = k => { const [x, y] = riverAt(.35 + rng() * .3); return [x + (rng() - .5) * 40, y + (rng() - .5) * 40]; };
      else if (role.key === 'brook') pick = k => { const [x, y] = riverAt(k % 2 ? .12 + rng() * .18 : .7 + rng() * .18); return [x, y]; };
      else if (role.key === 'camp' || role.key === 'prison') pick = rPick(.6, .74);
      else if (role.key === 'pine') pick = rPick(.55, .75);
      else pick = rPick(.15, .78);
      const pos = place(role, pick);
      if (!pos) continue;
      if (role.key === 'lake') { // 호수를 도시 한가운데에
        lakeC = [pos.cx + 6, pos.cy + 6];
        const lr = pos.SW * .3;
        for (let y = Math.floor(lakeC[1] - lr * 1.6); y <= lakeC[1] + lr * 1.6; y++) for (let x = Math.floor(lakeC[0] - lr * 1.6); x <= lakeC[0] + lr * 1.6; x++) {
          const d = Math.hypot((x - lakeC[0]) / 1.25, y - lakeC[1]), a = Math.atan2(y - lakeC[1], x - lakeC[0]);
          if (d < lr * (1 + .18 * Math.sin(3 * a + ph[0]) + .1 * Math.sin(7 * a))) t[idx(x, y)] = T.WATER;
        }
      }
      plan.push({ role, pos });
    }
    // 도시 모양 (블록 단위로 남길 곳을 정함)
    const makeMask = (role, pos) => {
      const n = role.n, c = (n - 1) / 2, r = DT.rng((seed ^ (role.key.length * 0x9e37)) >>> 0), ang = r() * Math.PI;
      const blockWater = (i, j) => { const bx = pos.ox + 6 + 22 * i, by = pos.oy + 6 + 22 * j; for (let y = by - 2; y < by + 19; y += 2) for (let x = bx - 2; x < bx + 19; x += 2) if (water(x, y)) return true; return false; };
      const keep = [];
      for (let i = 0; i < n; i++) { keep[i] = []; for (let j = 0; j < n; j++) {
        let k;
        const dx = (i - c) / (c + .5), dy = (j - c) / (c + .5);
        if (role.shape === 'full') k = true;
        else if (role.shape === 'long') { const u = dx * Math.cos(ang) + dy * Math.sin(ang), v = -dx * Math.sin(ang) + dy * Math.cos(ang); k = u * u * .55 + v * v * 3.2 < 1 + (r() - .5) * .5; }
        else if (role.shape === 'ring') { const d = Math.hypot(dx, dy); k = d < 1.05 + (r() - .5) * .4; }
        else { const d = Math.hypot(dx, dy); k = d < .95 + (r() - .5) * .55 + .12 * Math.sin(Math.atan2(dy, dx) * 3 + ang); }
        const cI = (n - 1) >> 1;
        if ((i === cI && j === cI) || (i === (n >> 1) && j === (n >> 1))) k = true;
        if (k && blockWater(i, j)) k = false;
        keep[i][j] = k;
      } }
      // 가운데(없으면 가장 가까운) 블록과 이어지지 않은 외딴 블록은 버림
      let st = null;
      for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) if (keep[i][j] && (!st || Math.hypot(i - c, j - c) < Math.hypot(st[0] - c, st[1] - c))) st = [i, j];
      if (!st) { keep[0][0] = true; st = [0, 0]; }
      const seen = {}, q = [st]; seen[st[0] + ',' + st[1]] = 1;
      while (q.length) { const [i, j] = q.pop(); for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const a = i + di, b = j + dj; if (a >= 0 && b >= 0 && a < n && b < n && keep[a][b] && !seen[a + ',' + b]) { seen[a + ',' + b] = 1; q.push([a, b]); } } }
      for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) keep[i][j] = !!seen[i + ',' + j];
      return keep;
    };
    // 붙여넣기: 남긴 블록(+그 둘레 도로)만 옮겨 적음
    const blit = (sub, pos, town, keep) => {
      const SW = sub.W, n = keep.length;
      // 도로띠(인도·도로·인도 5칸)는 양옆 블록 중 하나라도 남으면 남김
      const cellsFor = v => { if ((((v - 1) % 22) + 22) % 22 <= 4) { const rk = Math.floor((v - 1) / 22); return [rk - 1, rk]; } return [Math.floor((v - 6) / 22)]; };
      const kept = (x, y) => { for (const a of cellsFor(x)) for (const b of cellsFor(y)) if (a >= 0 && b >= 0 && a < n && b < n && keep[a][b]) return true; return false; };
      const keepT = new Uint8Array(SW * SW);
      for (let y = 1; y < SW - 1; y++) for (let x = 1; x < SW - 1; x++) keepT[y * SW + x] = kept(x, y) ? 1 : 0;
      for (let y = 1; y < SW - 1; y++) for (let x = 1; x < SW - 1; x++) {
        if (!keepT[y * SW + x]) continue;
        const wx = pos.ox + x, wy = pos.oy + y; if (!inAt(wx, wy)) continue;
        const wi = idx(wx, wy), v = sub.t[y * SW + x];
        if (t[wi] === T.WATER) { if (v === T.ROAD || v === T.WALK) { t[wi] = T.ROAD; reserved[wi] = 1; } continue; } // 물 위 도로 = 다리
        if (t[wi] === T.ROAD && v === T.TREE) continue;
        t[wi] = v; deco[wi] = sub.deco[y * SW + x]; reserved[wi] = 1;
      }
      const okAt = (x, y) => x > 0 && y > 0 && x < SW - 1 && y < SW - 1 && keepT[y * SW + x] && inAt(pos.ox + x, pos.oy + y) && !water(pos.ox + x, pos.oy + y);
      const cmap = [];
      for (let i = 0; i < sub.containers.length; i++) {
        const c0 = sub.containers[i];
        if (!okAt(c0.x, c0.y)) { cmap[i] = -1; continue; }
        const c = Object.assign({}, c0, { x: c0.x + pos.ox, y: c0.y + pos.oy, town: town.id });
        if (c.car) { cmap[i] = -1; carConts.push(c); continue; }
        cmap[i] = containers.length; containers.push(c);
      }
      for (const h of sub.houses) if (okAt(h.x + 1, h.y + 1) && okAt(h.x + h.w - 2, h.y + h.h - 2)) houses.push(Object.assign({}, h, { x: h.x + pos.ox, y: h.y + pos.oy, containers: h.containers.map(i => cmap[i]).filter(i => i >= 0), town: town.id }));
      for (const d of sub.decor) if (okAt(d.x, d.y)) decor.push(Object.assign({}, d, { x: d.x + pos.ox, y: d.y + pos.oy }));
      for (const c of sub.cars) if (okAt(c.x, c.y) && okAt(c.x + (c.vert ? 0 : 1), c.y + (c.vert ? 1 : 0))) cars.push(Object.assign({}, c, { x: c.x + pos.ox, y: c.y + pos.oy }));
      for (const s of sub.shops) if (okAt(s.x + 1, s.y + 1)) shops.push(Object.assign({}, s, { x: s.x + pos.ox, y: s.y + pos.oy, door: [s.door[0] + pos.ox, s.door[1] + pos.oy], town: town.id }));
      // 차선·가로등: 남은 도로 위만
      for (const p of sub.roads) {
        for (const vert of [1, 0]) {
          let s0 = -1;
          for (let a = 1; a <= SW - 1; a++) {
            const x = vert ? p + 1 : a, y = vert ? a : p + 1, ok = a < SW - 1 && keepT[y * SW + x];
            if (ok && s0 < 0) s0 = a; else if (!ok && s0 >= 0) { if (a - s0 > 3) lanes.push(vert ? [pos.ox + p + 1.5, pos.oy + s0, pos.ox + p + 1.5, pos.oy + a] : [pos.ox + s0, pos.oy + p + 1.5, pos.ox + a, pos.oy + p + 1.5]); s0 = -1; }
          }
        }
      }
      for (const px of sub.roads) for (const py of sub.roads) for (const [dx, dy] of [[-1, -1], [3, 3]]) {
        const x = pos.ox + px + dx, y = pos.oy + py + dy;
        if (inAt(x, y) && t[idx(x, y)] === T.WALK) lamps.push([x + .5, y + .5]);
      }
      return cmap;
    };

    let spawn = null, spawnContainer = -1;
    const startCands = plan.filter(p => p.role.start);
    const startKey = startCands.length ? startCands[(rng() * startCands.length) | 0].role.key : null;
    for (const { role, pos } of plan) {
      const keep = makeMask(role, pos);
      const km = role.n >> 1;
      const sub = DT.generateMap((seed ^ (role.key.charCodeAt(0) * 0x9e3779b1) ^ (role.key.length * 7919)) >>> 0, { v: 3, size: pos.SW, shops: role.shops, mask: (i, j) => keep[i][j] });
      const town = { id: towns.length, key: role.key, name: role.name, kind: role.key, label: role.label, tag: role.tag, x: pos.ox, y: pos.oy, w: pos.SW, h: pos.SW, cx: pos.cx, cy: pos.cy, keep };
      towns.push(town);
      const cmap = blit(sub, pos, town, keep);
      if (role.key === startKey) {
        if (sub.spawn && t[idx(sub.spawn.x + pos.ox, sub.spawn.y + pos.oy)] === T.FLOOR) { spawn = { x: sub.spawn.x + pos.ox, y: sub.spawn.y + pos.oy }; spawnContainer = sub.spawnContainer >= 0 ? cmap[sub.spawnContainer] : -1; }
        else { const h = houses.find(h => h.town === town.id && !h.shop); if (h) { spawn = { x: h.x + 2, y: h.y + 2 }; for (let y = h.y + 1; y < h.y + h.h - 1; y++) for (let x = h.x + 1; x < h.x + h.w - 1; x++) if (t[idx(x, y)] === T.FLOOR && !deco[idx(x, y)]) { spawn = { x, y }; y = 1e9; break; } spawnContainer = h.containers.length ? h.containers[0] : -1; } }
        town.start = true;
      }
    }

    // ---- 4) 국도: 도시끼리 최소 연결 + 몇 줄 더 + 봉쇄 검문소 3곳 ----
    const tw = towns.slice();
    const edges = [], inTree = new Set([0]);
    while (inTree.size < tw.length) {
      let best = null;
      for (const a of inTree) for (let b = 0; b < tw.length; b++) if (!inTree.has(b)) { const d = Math.hypot(tw[a].cx - tw[b].cx, tw[a].cy - tw[b].cy); if (!best || d < best[2]) best = [a, b, d]; }
      edges.push(best); inTree.add(best[1]);
    }
    for (let k = 0; k < 6; k++) { const a = (rng() * tw.length) | 0, b = (rng() * tw.length) | 0; if (a !== b && !edges.some(e => (e[0] === a && e[1] === b) || (e[0] === b && e[1] === a))) edges.push([a, b, 0]); }
    const bridges = [];
    const hwTiles = new Uint8Array(N);
    const carveRoad = (x0, y0, x1, y1) => { // 가로 또는 세로 직선 (3칸 폭 + 풀 갓길)
      const vert = x0 === x1, a = vert ? Math.min(y0, y1) : Math.min(x0, x1), b = vert ? Math.max(y0, y1) : Math.max(x0, x1);
      for (let s = a - 1; s <= b + 1; s++) for (let o = -2; o <= 2; o++) {
        const x = vert ? x0 + o : s, y = vert ? s : y0 + o; if (!inAt(x, y)) continue;
        const i = idx(x, y);
        if (reserved[i]) continue; // 도시 안은 도시 도로를 씀
        if (Math.abs(o) <= 1) { if (t[i] === T.WATER) bridges.push(i); t[i] = T.ROAD; hwTiles[i] = 1; }
        else if (t[i] !== T.ROAD && t[i] !== T.WATER && t[i] !== T.FENCE) t[i] = T.GRASS;
      }
      lanes.push(vert ? [x0 + .5, a, x0 + .5, b + 1, 1] : [a, y0 + .5, b + 1, y0 + .5, 1]);
    };
    const segHitsTown = (x0, y0, x1, y1, skip) => towns.some((tn, i) => !skip.includes(i) && Math.min(x0, x1) - 3 < tn.x + tn.w && Math.max(x0, x1) + 3 > tn.x && Math.min(y0, y1) - 3 < tn.y + tn.h && Math.max(y0, y1) + 3 > tn.y);
    const route = (ax, ay, bx, by, skip) => { // 가로-세로-가로 또는 세로-가로-세로, 다른 도시를 피해서
      let best = null;
      for (let k = 0; k < 24; k++) {
        const hv = k % 2 === 0, f = .2 + rng() * .6;
        let segs;
        if (hv) { const xm = Math.round(ax + (bx - ax) * f); segs = [[ax, ay, xm, ay], [xm, ay, xm, by], [xm, by, bx, by]]; }
        else { const ym = Math.round(ay + (by - ay) * f); segs = [[ax, ay, ax, ym], [ax, ym, bx, ym], [bx, ym, bx, by]]; }
        let bad = 0;
        for (const s of segs) { if (segHitsTown(...s, skip)) bad += 10; for (let u = 0; u <= 1; u += .05) if (!inAt(Math.round(s[0] + (s[2] - s[0]) * u), Math.round(s[1] + (s[3] - s[1]) * u))) bad += 3; }
        if (!best || bad < best[0]) best = [bad, segs];
        if (!bad) break;
      }
      for (const s of best[1]) if (s[0] !== s[2] || s[1] !== s[3]) carveRoad(...s);
    };
    for (const [a, b] of edges) route(tw[a].cx, tw[a].cy, tw[b].cx, tw[b].cy, [a, b]);
    // 봉쇄 검문소: 바깥으로 나가는 국도 3곳 (철책에서 막힘)
    const checkpoints = [];
    const campT = towns.find(t => t.key === 'camp');
    const exitFrom = campT ? [campT] : [];
    while (exitFrom.length < 3) { const tn = towns[(rng() * towns.length) | 0]; if (!exitFrom.includes(tn) && tn.key !== 'prison') exitFrom.push(tn); }
    for (const tn of exitFrom) {
      const a = Math.atan2(tn.cy - CY, tn.cx - CX), horiz = Math.abs(Math.cos(a)) > Math.abs(Math.sin(a));
      let x = tn.cx, y = tn.cy; const dx = horiz ? Math.sign(Math.cos(a)) : 0, dy = horiz ? 0 : Math.sign(Math.sin(a));
      x += dx * (tn.w / 2 + 2); y += dy * (tn.h / 2 + 2);
      while (inAt(x + dx * 3, y + dy * 3)) { x += dx; y += dy; }
      carveRoad(horiz ? tn.cx : tn.cx, horiz ? tn.cy : tn.cy, x, y);
      checkpoints.push({ x, y, dx, dy, town: tn.id });
    }
    // ---- 5) 봉쇄 철책 (카운티 경계선) ----
    for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
      const i = idx(x, y); if (!inside[i]) continue;
      if (!inside[i - 1] || !inside[i + 1] || !inside[i - W] || !inside[i + W]) { t[i] = T.FENCE; deco[i] = 0; }
    }
    // 철책 안쪽 2칸은 나무를 베어낸 순찰로
    for (let y = 3; y < H - 3; y++) for (let x = 3; x < W - 3; x++) if (t[idx(x, y)] === T.FENCE) for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) { const i = idx(x + dx, y + dy); if (inside[i] && t[i] === T.TREE) t[i] = T.GRASS; }
    const clearAround = (cx, cy, r) => { for (let y = cy - r; y <= cy + r; y++) for (let x = cx - r; x <= cx + r; x++) if (inAt(x, y) && t[idx(x, y)] === T.TREE) t[idx(x, y)] = T.GRASS; };
    // 검문소: 철책 앞 콘크리트 방벽 · 군용 트럭 · 모래주머니
    const OLIVE = '#4b5134';
    for (const cp of checkpoints) {
      const px = -cp.dy, py = cp.dx; // 도로와 수직 방향
      for (let o = -3; o <= 3; o++) { const x = cp.x - cp.dx * 3 + px * o, y = cp.y - cp.dy * 3 + py * o; if (inAt(x, y) && t[idx(x, y)] !== T.FENCE && Math.abs(o) !== 1) { deco[idx(x, y)] = 1; decor.push({ kind: 'barrier', x, y, w: 1, h: 1, wx: cp.dx, wy: cp.dy, c: 0 }); } }
      for (const [k, side] of [[8, 3], [13, -3]]) {
        const x = cp.x - cp.dx * k + px * side, y = cp.y - cp.dy * k + py * side, vert = cp.dx === 0;
        const x2 = vert ? x : x + 1, y2 = vert ? y + 1 : y;
        const nearW = [[x, y], [x2, y2]].some(([a, b]) => [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]].some(([p, q]) => inAt(a + p, b + q) && t[idx(a + p, b + q)] === T.WATER));
        if (!nearW && inAt(x2, y2) && t[idx(x, y)] === T.ROAD && t[idx(x2, y2)] === T.ROAD) { t[idx(x, y)] = T.CAR; t[idx(x2, y2)] = T.CAR; cars.push({ x, y, vert, color: OLIVE, flip: false, burnt: false, mil: true }); carConts.push({ x, y, kind: 'miltruck', car: true, cw: vert ? 1 : 2, ch: vert ? 2 : 1 }); }
      }
      signs.push({ x: cp.x - cp.dx * 17 + px * 4, y: cp.y - cp.dy * 17 + py * 4, text: '봉쇄구역 · 접근 금지' });
      clearAround(cp.x - cp.dx * 8, cp.y - cp.dy * 8, 9);
      zspawn.push({ x: cp.x - cp.dx * 10, y: cp.y - cp.dy * 10, n: 10, ty: 'soldier', pr: .85, r: 7 });
      scenes.push({ type: 'bodies', x: cp.x - cp.dx * 6, y: cp.y - cp.dy * 6, n: 5, ty: 'civ', r: 5 });
    }

    // ---- 6) 도시별 특수 연출 ----
    const freeGrass = (x, y) => inAt(x, y) && t[idx(x, y)] === T.GRASS && !deco[idx(x, y)];
    const fenceRing = (tn, gaps) => { // 교도소·캠프 둘레 철책 (국도 쪽만 출입구)
      const x0 = tn.x + 1, y0 = tn.y + 1, x1 = tn.x + tn.w - 2, y1 = tn.y + tn.h - 2;
      for (let x = x0; x <= x1; x++) for (const y of [y0, y1]) if (!(Math.abs(x - tn.cx) <= 2 && gaps)) { const i = idx(x, y); if (t[i] !== T.WATER) { t[i] = T.FENCE; deco[i] = 0; } }
      for (let y = y0; y <= y1; y++) for (const x of [x0, x1]) if (!(Math.abs(y - tn.cy) <= 2 && gaps)) { const i = idx(x, y); if (t[i] !== T.WATER) { t[i] = T.FENCE; deco[i] = 0; } }
    };
    const R6 = DT.rng(seed ^ 0x5ce4e5);
    for (const tn of towns) {
      if (tn.key === 'camp' || tn.key === 'prison') fenceRing(tn, true);
      if (tn.key === 'camp') { // 텐트촌 · 보급 상자 · 군용 트럭
        let made = 0;
        for (let k = 0; k < 900 && made < 26; k++) {
          const x = tn.x + 3 + ((R6() * (tn.w - 6)) | 0), y = tn.y + 3 + ((R6() * (tn.h - 6)) | 0);
          if (![[0, 0], [1, 0], [0, 1], [1, 1], [-1, 0], [2, 0], [0, -1], [0, 2]].every(([a, b]) => freeGrass(x + a, y + b))) continue;
          for (const [a, b] of [[0, 0], [1, 0], [0, 1], [1, 1]]) deco[idx(x + a, y + b)] = 1;
          decor.push({ kind: 'tent', x, y, w: 2, h: 2, wx: 0, wy: -1, c: made % 3 });
          if (freeGrass(x + 2, y + 1) && R6() < .6) { containers.push({ x: x + 2, y: y + 1, kind: 'supply', town: tn.id }); deco[idx(x + 2, y + 1)] = 1; }
          made++;
        }
        zspawn.push({ x: tn.cx, y: tn.cy, n: 30, ty: 'soldier', pr: .6, r: 30 });
        scenes.push({ type: 'bodies', x: tn.cx, y: tn.cy, n: 12, ty: 'civ', r: 25 });
      }
      if (tn.key === 'prison') zspawn.push({ x: tn.cx, y: tn.cy, n: 26, ty: 'prisoner', pr: .8, r: 28 });
      if (tn.key === 'fort') { // 발원지: 병원 앞 격리 텐트 · 방호복 시신 · 판자 친 창문
        const hs = shops.find(s => s.town === tn.id && s.kind === 'hospital');
        if (hs) {
          const [dx, dy] = hs.door;
          let made = 0;
          for (let k = 0; k < 400 && made < 8; k++) {
            const x = dx - 10 + ((R6() * 20) | 0), y = dy + 2 + ((R6() * 8) | 0);
            if (![[0, 0], [1, 0], [0, 1], [1, 1]].every(([a, b]) => inAt(x + a, y + b) && [T.GRASS, T.WALK, T.ROAD].includes(t[idx(x + a, y + b)]) && !deco[idx(x + a, y + b)])) continue;
            for (const [a, b] of [[0, 0], [1, 0], [0, 1], [1, 1]]) deco[idx(x + a, y + b)] = 1;
            decor.push({ kind: 'tent', x, y, w: 2, h: 2, wx: 0, wy: -1, c: 3 }); made++;
          }
          scenes.push({ type: 'bodies', x: dx + .5, y: dy + 4, n: 10, ty: 'hazmat', r: 6 });
          scenes.push({ type: 'board', x: hs.x, y: hs.y, w: hs.w, h: hs.h });
          zspawn.push({ x: hs.x + hs.w / 2, y: hs.y + hs.h / 2, n: 14, ty: 'hazmat', pr: .55, r: 6 });
          signs.push({ x: dx - 3, y: dy + 2, text: '격리 구역 · 출입 통제' });
        }
      }
      if (tn.key === 'ashton') { // 활주로
        const hz = [[tn.x + tn.w + 12, tn.cy - 5, 200, 10], [tn.x - 212, tn.cy - 5, 200, 10], [tn.cx - 5, tn.y + tn.h + 12, 10, 200], [tn.cx - 5, tn.y - 212, 10, 200]];
        for (const [x0, y0, w, h] of hz) {
          let ok = true;
          for (let y = y0 - 2; y < y0 + h + 2 && ok; y += 2) for (let x = x0 - 2; x < x0 + w + 2; x += 2) if (!inAt(x, y) || reserved[idx(x, y)] || t[idx(x, y)] === T.WATER || t[idx(x, y)] === T.FENCE) { ok = false; break; }
          if (!ok) continue;
          for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) { t[idx(x, y)] = T.ROAD; reserved[idx(x, y)] = 1; }
          runways.push([x0, y0, w, h]);
          // 활주로 옆 버려진 비행기 잔해 대신 짐 수레(가방)
          for (let k = 0; k < 10; k++) { const x = w > h ? x0 + 10 + k * 18 : x0 - 2, y = w > h ? y0 - 2 : y0 + 10 + k * 18; if (freeGrass(x, y)) { containers.push({ x, y, kind: 'luggage', town: tn.id }); deco[idx(x, y)] = 1; } }
          // 활주로 → 마을 연결 도로
          if (w > h) carveRoad(tn.cx, tn.cy, x0 > tn.cx ? x0 : x0 + w, tn.cy); else carveRoad(tn.cx, tn.cy, tn.cx, y0 > tn.cy ? y0 : y0 + h);
          scenes.push({ type: 'bodies', x: x0 + w / 2, y: y0 + h / 2, n: 8, ty: 'civ', r: 20 });
          break;
        }
      }
    }
    // 브룩포드: 끊긴 다리 (다리 가운데를 물로 되돌리고, 다리 앞에 차가 몰려 있음)
    const brook = towns.find(t => t.key === 'brook');
    if (brook && bridges.length) {
      let best = null;
      for (const i of bridges) { const x = i % W, y = (i / W) | 0, d = Math.hypot(x - brook.cx, y - brook.cy); if (!best || d < best[1]) best = [i, d]; }
      const bx = best[0] % W, by = (best[0] / W) | 0;
      const broken = [];
      for (let y = by - 6; y <= by + 6; y++) for (let x = bx - 6; x <= bx + 6; x++) { const i = idx(x, y); if (hwTiles[i] && bridges.includes(i) && Math.hypot(x - bx, y - by) < 4.5) { t[i] = T.WATER; broken.push([x, y]); } }
      for (const [x, y] of broken) for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const x2 = x + a, y2 = y + b; if (inAt(x2, y2) && t[idx(x2, y2)] === T.ROAD && !deco[idx(x2, y2)] && R6() < .5) { deco[idx(x2, y2)] = 1; decor.push({ kind: 'rubble', x: x2, y: y2, w: 1, h: 1, wx: 0, wy: -1, c: 0 }); } }
      scenes.push({ type: 'jam', x: bx, y: by, r: 22 });
      scenes.push({ type: 'bodies', x: bx, y: by, n: 8, ty: 'civ', r: 12 });
      signs.push({ x: bx + 5, y: by + 5, text: '다리 폭파됨 · 우회 불가' });
      brook.bridgeAt = [bx, by];
    }

    // ---- 7) 국도변 작은 마을 + 농지 ----
    const hwSegs = lanes.filter(l => l[4] === 1);
    const hr = DT.rng(seed ^ 0x4a3137);
    let hamlets = 0;
    for (let tries = 0; tries < 2500 && hamlets < 55; tries++) {
      const L0 = hwSegs[(hr() * hwSegs.length) | 0]; if (!L0) break;
      const vert = L0[0] === L0[2], along = vert ? L0[1] + hr() * (L0[3] - L0[1]) : L0[0] + hr() * (L0[2] - L0[0]);
      const line = Math.floor(vert ? L0[0] : L0[1]);
      const n = hr() < .3 ? 2 : 1, SW = 22 * n + 6, side = hr() < .5;
      const off = side ? -3 : -(3 + 22 * n);
      const ox = vert ? line + off : Math.round(along), oy = vert ? Math.round(along) : line + off;
      if (!allInside(ox, oy, ox + SW, oy + SW, 8) || !clearOf(ox, oy, ox + SW, oy + SW, 12)) continue;
      let bad = false;
      for (let y = oy - 2; y < oy + SW + 2 && !bad; y++) for (let x = ox - 2; x < ox + SW + 2; x++) {
        const v = t[idx(x, y)], onLine = vert ? Math.abs(x - line) <= 2 : Math.abs(y - line) <= 2;
        if (v === T.WATER || v === T.FENCE || reserved[idx(x, y)] || (v === T.ROAD && !onLine)) { bad = true; break; }
      }
      if (bad) continue;
      boxes.push([ox, oy, ox + SW, oy + SW]);
      const keep = Array.from({ length: n }, () => Array(n).fill(true));
      const sub = DT.generateMap((seed ^ ((tries + 99) * 0x85ebca6b)) >>> 0, { v: 3, size: SW, shops: n === 2 && hr() < .5 ? ['gas'] : [] });
      const town = { id: towns.length, key: 'hamlet', name: '', kind: 'hamlet', label: '마을', x: ox, y: oy, w: SW, h: SW, cx: ox + SW / 2, cy: oy + SW / 2, keep };
      towns.push(town);
      blit(sub, { ox, oy, SW }, town, keep);
      hamlets++;
      // 옆에 밭 (흙 + 이랑)
      if (hr() < .7) {
        const fw = 24 + ((hr() * 24) | 0), fh = 16 + ((hr() * 14) | 0);
        const fx = vert ? (side ? ox + SW + 3 : ox - fw - 3) : ox + ((hr() * Math.max(1, SW - fw)) | 0), fy = vert ? oy + ((hr() * Math.max(1, SW - fh)) | 0) : (side ? oy + SW + 3 : oy - fh - 3);
        let ok = allInside(fx, fy, fx + fw, fy + fh, 4) && clearOf(fx, fy, fx + fw, fy + fh, 4);
        for (let y = fy; y < fy + fh && ok; y += 2) for (let x = fx; x < fx + fw; x += 2) if (reserved[idx(x, y)] || [T.WATER, T.FENCE, T.ROAD].includes(t[idx(x, y)])) { ok = false; break; }
        if (ok) { for (let y = fy; y < fy + fh; y++) for (let x = fx; x < fx + fw; x++) { t[idx(x, y)] = T.DIRT; reserved[idx(x, y)] = 1; } boxes.push([fx, fy, fx + fw, fy + fh]); }
      }
    }
    // 국도 차선: 도시·마을 안은 빼고 다시 자름
    const hw = lanes.filter(l => l[4] === 1), rest = lanes.filter(l => l[4] !== 1);
    lanes.length = 0; lanes.push(...rest);
    for (const [ax, ay, bx, by] of hw) {
      const vert = ax === bx, line = Math.floor(vert ? ax : ay), a0 = Math.floor(vert ? ay : ax), b0 = Math.ceil(vert ? by : bx);
      let s0 = -1;
      for (let a = a0; a <= b0; a++) {
        const i = vert ? idx(line, a) : idx(a, line), ok = a < b0 && inAt(vert ? line : a, vert ? a : line) && hwTiles[i] && t[i] === T.ROAD;
        if (ok && s0 < 0) s0 = a; else if (!ok && s0 >= 0) { if (a - s0 > 2) lanes.push(vert ? [line + .5, s0, line + .5, a] : [s0, line + .5, a, line + .5]); s0 = -1; }
      }
    }
    // 국도 위 폐차 · 교통 체증 (다리 앞)
    const cr2 = DT.rng(seed ^ 0x6ca7), colors = ['#6b2d2b', '#2f4a5c', '#77735f', '#3a3a3a', '#5a5f3a', '#8a8a86', '#4a3a5c'];
    const addCar = (x, y, vert, burnt) => {
      const x2 = vert ? x : x + 1, y2 = vert ? y + 1 : y;
      if (!inAt(x2, y2) || t[idx(x, y)] !== T.ROAD || t[idx(x2, y2)] !== T.ROAD || deco[idx(x, y)] || deco[idx(x2, y2)]) return false;
      t[idx(x, y)] = T.CAR; t[idx(x2, y2)] = T.CAR;
      const c = { x, y, vert, color: colors[(cr2() * colors.length) | 0], flip: cr2() < .5, burnt };
      cars.push(c); if (!burnt) carConts.push({ x, y, kind: 'car', car: true, cw: vert ? 1 : 2, ch: vert ? 2 : 1 });
      return true;
    };
    for (const [ax, ay, bx, by] of lanes.slice()) {
      const vert = ax === bx, len = vert ? by - ay : bx - ax; if (len < 30) continue;
      const nC = Math.floor(len / 70);
      for (let k = 0; k < nC; k++) { const pos = Math.floor((vert ? ay : ax) + cr2() * len), line = Math.floor(vert ? ax : ay) + (cr2() < .5 ? -1 : 1); if (reserved[vert ? idx(line, pos) : idx(pos, line)]) continue; addCar(vert ? line : pos, vert ? pos : line, vert, cr2() < .3); }
    }
    for (const sc of scenes) if (sc.type === 'jam') {
      for (let k = 0; k < 120; k++) { const x = Math.round(sc.x + (cr2() - .5) * sc.r * 2), y = Math.round(sc.y + (cr2() - .5) * sc.r * 2); if (Math.hypot(x - sc.x, y - sc.y) > 5) addCar(x, y, cr2() < .5, cr2() < .2); }
    }
    for (const sg of signs) clearAround(Math.round(sg.x), Math.round(sg.y), 3);
    // 몰 수 있는 차: 멀쩡한 폐차 중 일부를 도로 칸으로 되돌리고 목록으로만 넘김 (게임에서 움직임)
    const vr = DT.rng(seed ^ 0xca5e), vehicles = [];
    for (let i = cars.length - 1; i >= 0; i--) {
      const c = cars[i]; if (c.burnt || c.mil || vr() > .16) continue;
      const x2 = c.vert ? c.x : c.x + 1, y2 = c.vert ? c.y + 1 : c.y;
      t[idx(c.x, c.y)] = T.ROAD; t[idx(x2, y2)] = T.ROAD;
      cars.splice(i, 1);
      const k = carConts.findIndex(q => q.x === c.x && q.y === c.y); if (k >= 0) carConts.splice(k, 1);
      vehicles.push({ x: c.vert ? c.x + .5 : c.x + 1, y: c.vert ? c.y + 1 : c.y + .5, a: c.vert ? (c.flip ? Math.PI / 2 : -Math.PI / 2) : (c.flip ? 0 : Math.PI), color: c.color });
    }
    const Mtmp = { W, H, t, deco, containers, houses, towns, shops };
    DT.planLevels(Mtmp, seed); // 건물 위·아래층 범위 + 계단 자리
    for (const c of carConts) containers.push(c);
    const moveBlock = new Uint8Array(N), sightBlock = new Uint8Array(N);
    for (let i = 0; i < N; i++) { moveBlock[i] = MOVE_BLOCK[t[i]] || deco[i]; sightBlock[i] = SIGHT_BLOCK[t[i]]; }
    if (!spawn) { const tn = towns[0]; spawn = { x: tn.cx, y: tn.cy + 3 }; }
    return { W, H, t, moveBlock, sightBlock, containers, houses, spawn, spawnContainer, cars, decor, deco, T, roads: [], blocks: [], btype: {}, shops, lanes, lamps, towns, scenes, zspawn, runways, signs, checkpoints, river, lake: lakeC, levels: Mtmp.levels, stairAt: Mtmp.stairAt, vehicles0: vehicles, v: 5, world: true, county: true };
  }
  DT.generateCounty = generateCounty;
})();
