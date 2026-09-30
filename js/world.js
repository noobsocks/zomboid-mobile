// 큰 세계(720x720): 3x3 구역마다 도시·소도시·군부대·시골을 두고 국도로 연결
// 각 도시는 기존 마을 생성기(generateMap)를 크기만 바꿔 만든 뒤 큰 지도에 붙여 넣음
(function () {
  const T = DT.T;
  const MOVE_BLOCK = [0, 0, 0, 1, 0, 0, 1, 0, 1];
  const SIGHT_BLOCK = [0, 0, 0, 1, 0, 0, 1, 0, 0];
  const S = 720, CELL = 240;
  const TOWN = {
    big:   { n: 9, label: '대도시', shops: ['market', 'market', 'market', 'market', 'pharmacy', 'pharmacy', 'pharmacy', 'police', 'police', 'hardware', 'hardware', 'gas', 'gas', 'firestation', 'firestation', 'restaurant', 'restaurant', 'restaurant', 'restaurant', 'bank', 'bank', 'sports', 'sports', 'hunting'] },
    mid:   { n: 6, label: '중도시', shops: ['market', 'market', 'pharmacy', 'pharmacy', 'police', 'hardware', 'gas', 'gas', 'firestation', 'restaurant', 'restaurant', 'bank', 'sports'] },
    small: { n: 4, label: '소도시', shops: ['market', 'pharmacy', 'hardware', 'gas', 'restaurant', 'hunting'] },
    army:  { n: 3, label: '군부대', shops: ['army', 'army', 'army', 'gas'] },
  };
  const NAMES = ['하이브룩', '레드밀', '오크허스트', '스톤브리지', '윈스턴빌', '밀포드', '애시턴', '브라이턴 폴스', '그레이필드'];

  function generateWorld(seed) {
    const W = S, H = S, N = W * H;
    const rng = DT.rng(seed ^ 0x77077);
    const idx = (x, y) => y * W + x;
    const t = new Uint8Array(N), deco = new Uint8Array(N), reserved = new Uint8Array(N);
    const containers = [], houses = [], decor = [], cars = [], shops = [], lanes = [], lamps = [], towns = [];
    const carConts = [];
    const lines = [0, 1, 2].map(i => CELL / 2 + i * CELL); // 국도 중심선 (가로·세로 공통)

    // ---- 1) 시골 바탕: 풀밭 + 숲(값 노이즈) ----
    const G = 24, gw = Math.ceil(W / G) + 2, grid = new Float32Array(gw * gw), nr = DT.rng(seed ^ 0x51ee7);
    for (let i = 0; i < grid.length; i++) grid[i] = nr();
    const G2 = 9, gw2 = Math.ceil(W / G2) + 2, grid2 = new Float32Array(gw2 * gw2);
    for (let i = 0; i < grid2.length; i++) grid2[i] = nr();
    const sm = v => v * v * (3 - 2 * v);
    const vn = (x, y, g, gr, gwid) => { const fx = x / g, fy = y / g, ix = fx | 0, iy = fy | 0, u = sm(fx - ix), v = sm(fy - iy);
      const a = gr[iy * gwid + ix], b = gr[iy * gwid + ix + 1], c = gr[(iy + 1) * gwid + ix], d = gr[(iy + 1) * gwid + ix + 1];
      return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v; };
    const tr = DT.rng(seed ^ 0x7ee5);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = idx(x, y);
      if (x === 0 || y === 0 || x === W - 1 || y === H - 1) { t[i] = T.TREE; continue; }
      const n = vn(x, y, G, grid, gw) * .7 + vn(x, y, G2, grid2, gw2) * .3;
      const p = n > .66 ? .55 : n > .56 ? .18 : .012;
      t[i] = tr() < p ? T.TREE : T.GRASS;
    }
    // ---- 2) 국도 (3칸 폭, 양옆 1칸은 나무 없이) ----
    for (const L0 of lines) for (let a = 1; a < W - 1; a++) for (let o = -2; o <= 2; o++) {
      const v = Math.abs(o) <= 1 ? T.ROAD : T.GRASS;
      for (const i of [idx(a, L0 + o), idx(L0 + o, a)]) if (t[i] !== T.ROAD) t[i] = v;
    }

    // ---- 3) 구역별 도시 배치 ----
    const kinds = ['big', 'mid', 'mid', 'small', 'small', 'small', 'army', 'rural', 'rural'];
    for (let i = kinds.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [kinds[i], kinds[j]] = [kinds[j], kinds[i]]; }
    // 시작 도시는 소도시 중 하나
    const smallCells = kinds.map((k, i) => k === 'small' ? i : -1).filter(i => i >= 0);
    const startCell = smallCells[Math.floor(rng() * smallCells.length)];
    const names = NAMES.slice();
    for (let i = names.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [names[i], names[j]] = [names[j], names[i]]; }
    let spawn = null, spawnContainer = -1, ni = 0;

    const blit = (sub, ox, oy, town) => {
      const SW = sub.W, base = containers.length;
      for (let y = 0; y < SW; y++) for (let x = 0; x < SW; x++) {
        const wx = ox + x, wy = oy + y; if (wx < 1 || wy < 1 || wx >= W - 1 || wy >= H - 1) continue;
        const wi = idx(wx, wy), v = sub.t[y * SW + x];
        const border = x === 0 || y === 0 || x === SW - 1 || y === SW - 1;
        if (border) { if (t[wi] !== T.ROAD) t[wi] = T.GRASS; continue; }
        if (t[wi] === T.ROAD && v === T.TREE) continue; // 국도는 막지 않음
        t[wi] = v; deco[wi] = sub.deco[y * SW + x]; reserved[wi] = 1;
      }
      const cmap = [];
      for (let i = 0; i < sub.containers.length; i++) {
        const c = Object.assign({}, sub.containers[i]); c.x += ox; c.y += oy;
        if (c.car) { cmap[i] = -1; carConts.push(c); continue; } // 차량 트렁크는 맨 뒤에 모음
        cmap[i] = containers.length; containers.push(c);
      }
      for (const h of sub.houses) houses.push(Object.assign({}, h, { x: h.x + ox, y: h.y + oy, containers: h.containers.map(i => cmap[i]).filter(i => i >= 0), town: town.id }));
      for (const d of sub.decor) decor.push(Object.assign({}, d, { x: d.x + ox, y: d.y + oy }));
      for (const c of sub.cars) cars.push(Object.assign({}, c, { x: c.x + ox, y: c.y + oy }));
      for (const s of sub.shops) shops.push(Object.assign({}, s, { x: s.x + ox, y: s.y + oy, door: [s.door[0] + ox, s.door[1] + oy], town: town.id }));
      for (const p of sub.roads) { lanes.push([ox + p + 1.5, oy + 1, ox + p + 1.5, oy + SW - 1]); lanes.push([ox + 1, oy + p + 1.5, ox + SW - 1, oy + p + 1.5]); }
      for (const px of sub.roads) for (const py of sub.roads) for (const [dx, dy] of [[-1, -1], [3, 3]]) {
        const x = ox + px + dx, y = oy + py + dy;
        if (x > 0 && y > 0 && x < W - 1 && y < H - 1 && t[idx(x, y)] === T.WALK) lamps.push([x + .5, y + .5]);
      }
      return { base, cmap };
    };

    for (let ci = 0; ci < 9; ci++) {
      const k = kinds[ci]; if (k === 'rural') continue;
      const cx = lines[ci % 3], cy = lines[(ci / 3) | 0];
      const def = TOWN[k], n = def.n, SW = 22 * n + 6, km = n >> 1;
      const ox = cx - (3 + 22 * km), oy = cy - (3 + 22 * km);
      const sub = DT.generateMap((seed ^ (ci * 0x9e3779b1)) >>> 0, { v: 3, size: SW, shops: def.shops });
      const town = { id: towns.length, name: k === 'army' ? '포트 ' + names[ni++] : names[ni++], kind: k, label: def.label, x: ox, y: oy, w: SW, h: SW };
      towns.push(town);
      const { cmap } = blit(sub, ox, oy, town);
      if (ci === startCell && sub.spawn) { spawn = { x: sub.spawn.x + ox, y: sub.spawn.y + oy }; spawnContainer = sub.spawnContainer >= 0 ? cmap[sub.spawnContainer] : -1; town.start = true; }
    }
    // ---- 4) 국도변 작은 마을 (집 4채짜리) ----
    const boxes = towns.map(tw => [tw.x - 6, tw.y - 6, tw.x + tw.w + 6, tw.y + tw.h + 6]);
    const hit = (x0, y0, x1, y1) => x0 < 2 || y0 < 2 || x1 > W - 2 || y1 > H - 2 || boxes.some(b => x0 < b[2] && x1 > b[0] && y0 < b[3] && y1 > b[1]);
    const hr = DT.rng(seed ^ 0x4a3137);
    for (let tries = 0; tries < 400 && towns.length < 30; tries++) {
      const L0 = lines[(hr() * 3) | 0], along = 20 + ((hr() * (W - 70)) | 0), vert = hr() < .5, side = hr() < .5;
      const SW = hr() < .3 ? 50 : 28, n = SW === 50 ? 2 : 1;
      // 국도 = 마을의 첫 도로(아래쪽에 붙음) 또는 마지막 도로(위쪽에 붙음)
      const off = side ? -3 : -(3 + 22 * n);
      const ox = vert ? L0 + off : along, oy = vert ? along : L0 + off;
      if (hit(ox, oy, ox + SW, oy + SW)) continue;
      if (lines.some(l => vert ? (l + 4 > oy && l - 4 < oy + SW) : (l + 4 > ox && l - 4 < ox + SW))) continue; // 다른 국도를 막지 않게
      const sub = DT.generateMap((seed ^ ((tries + 99) * 0x85ebca6b)) >>> 0, { v: 3, size: SW, shops: n === 2 && hr() < .5 ? ['gas'] : [] });
      const town = { id: towns.length, name: '', kind: 'hamlet', label: '마을', x: ox, y: oy, w: SW, h: SW };
      towns.push(town); boxes.push([ox - 4, oy - 4, ox + SW + 4, oy + SW + 4]);
      blit(sub, ox, oy, town);
    }
    // 국도 차선 (도시·마을 안은 그 도시 차선을 씀)
    for (const L0 of lines) for (const vert of [0, 1]) {
      let s0 = -1;
      for (let a = 1; a <= W - 1; a++) {
        const ok = a < W - 1 && !reserved[vert ? idx(L0, a) : idx(a, L0)];
        if (ok && s0 < 0) s0 = a; else if (!ok && s0 >= 0) { if (a - s0 > 2) lanes.push(vert ? [L0 + .5, s0, L0 + .5, a] : [s0, L0 + .5, a, L0 + .5]); s0 = -1; }
      }
    }
    // ---- 5) 국도 위 폐차 ----
    const cr = DT.rng(seed ^ 0x6ca7), colors = ['#6b2d2b', '#2f4a5c', '#77735f', '#3a3a3a', '#5a5f3a', '#8a8a86', '#4a3a5c'];
    for (let k = 0; k < 260; k++) {
      const L0 = lines[(cr() * 3) | 0], lane = L0 + (cr() < .5 ? -1 : 1), pos = 3 + ((cr() * (W - 8)) | 0), vert = cr() < .5;
      const x = vert ? lane : pos, y = vert ? pos : lane, x2 = vert ? x : x + 1, y2 = vert ? y + 1 : y;
      if (reserved[idx(x, y)] || reserved[idx(x2, y2)]) continue; // 도시 안은 이미 있음
      if (t[idx(x, y)] !== T.ROAD || t[idx(x2, y2)] !== T.ROAD) continue;
      if (cars.some(c => Math.abs(c.x - x) + Math.abs(c.y - y) < 6)) continue;
      t[idx(x, y)] = T.CAR; t[idx(x2, y2)] = T.CAR;
      const c = { x, y, vert, color: colors[(cr() * colors.length) | 0], flip: cr() < .5, burnt: cr() < .3 };
      cars.push(c);
      if (!c.burnt) carConts.push({ x, y, kind: 'car', car: true, cw: vert ? 1 : 2, ch: vert ? 2 : 1 });
    }
    // 국도 교차로 가로등
    for (const px of lines) for (const py of lines) for (const [dx, dy] of [[-3, -3], [3, 3]]) { const x = px + dx, y = py + dy; if (!reserved[idx(x, y)] && t[idx(x, y)] === T.GRASS) lamps.push([x + .5, y + .5]); }
    for (const c of carConts) containers.push(c);
    const moveBlock = new Uint8Array(N), sightBlock = new Uint8Array(N);
    for (let i = 0; i < N; i++) { moveBlock[i] = MOVE_BLOCK[t[i]] || deco[i]; sightBlock[i] = SIGHT_BLOCK[t[i]]; }
    if (!spawn) spawn = { x: lines[1], y: lines[1] + 3 };
    return { W, H, t, moveBlock, sightBlock, containers, houses, spawn, spawnContainer, cars, decor, deco, T, roads: [], blocks: [], btype: {}, shops, lanes, lamps, towns, v: 4, world: true };
  }
  DT.generateWorld = generateWorld;
})();
