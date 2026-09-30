// 건물 위·아래층 생성: 1층 건물 모양 그대로, 층마다 방을 나누고 가구·수색 가구를 배치
// z: 0 = 1층(월드), 1 = 2층 … 4 = 5층, -1 = 지하 1층 … -3 = 지하 3층
(function () {
  const T = DT.T;
  const MB = { [T.WALL]: 1, [T.TREE]: 1, [T.CAR]: 1, [T.FENCE]: 1, [T.WATER]: 1, [T.VOID]: 1 };
  const SB = { [T.WALL]: 1, [T.TREE]: 1 };
  // 건물 종류별 층 범위 [가장 낮은 층, 가장 높은 층]
  const FLOORS = { hospital: [-2, 4], army: [-1, 0], police: [-1, 1], prison: [-1, 2], terminal: [0, 2], bank: [-2, 0], factory: [0, 1], warehouse: [-1, 0], firestation: [0, 1], market: [0, 1], restaurant: [0, 1], pharmacy: [0, 1], hardware: [0, 1] };
  const floorName = z => z >= 0 ? `${z + 1}층` : `지하 ${-z}층`;

  // 월드(1층) 건물마다 층 범위와 계단 자리를 정함 (월드 생성 끝에 한 번)
  function planLevels(M, seed) {
    const r = DT.rng(seed ^ 0x1e7e15), idx = (x, y) => y * M.W + x;
    const contAt = new Set(M.containers.map(c => idx(c.x, c.y)));
    const levels = {}, stairAt = {};
    let campBunker = false;
    M.houses.forEach((h, hi) => {
      let rng;
      const town = M.towns && h.town != null ? M.towns[h.town] : null;
      if (h.shop) rng = FLOORS[h.shop] ? FLOORS[h.shop].slice() : null;
      else {
        let mn = 0, mx = 0;
        const big = h.w * h.h >= 42;
        if (r() < (town && town.key === 'lake' ? .55 : big ? .4 : .22)) mx = town && town.key === 'lake' && r() < .5 ? 2 : 1;
        if (r() < .18) mn = -1;
        rng = mn || mx ? [mn, mx] : null;
      }
      if (h.shop === 'army' && town && town.key === 'camp' && !campBunker) { rng = [-3, 0]; campBunker = true; }
      if (!rng) return;
      // 계단 자리: 벽에 붙은 빈 바닥 (문 앞·가구 자리 피함)
      let st = null;
      for (let tries = 0; tries < 200 && !st; tries++) {
        const x = h.x + 1 + ((r() * (h.w - 2)) | 0), y = h.y + 1 + ((r() * (h.h - 2)) | 0), k = idx(x, y);
        if (M.t[k] !== T.FLOOR || M.deco[k] || contAt.has(k)) continue;
        const nb = [[1, 0], [-1, 0], [0, 1], [0, -1]];
        if (!nb.some(([dx, dy]) => M.t[idx(x + dx, y + dy)] === T.WALL)) continue;
        if (nb.some(([dx, dy]) => M.t[idx(x + dx, y + dy)] === T.DOOR || M.t[idx(x + dx, y + dy)] === T.WINDOW)) continue;
        // 주변 8칸 중 지나갈 수 있는 칸이 최소 3개 (막다른 구석 피함)
        let free = 0; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if ((dx || dy) && M.t[idx(x + dx, y + dy)] === T.FLOOR && !M.deco[idx(x + dx, y + dy)]) free++;
        if (free < 3) continue;
        st = [x, y];
      }
      if (!st) return;
      M.t[idx(st[0], st[1])] = T.STAIRS;
      levels[hi] = { min: rng[0], max: rng[1], stair: st, kind: h.shop || 'house', town: h.town };
      stairAt[idx(st[0], st[1])] = hi;
    });
    M.levels = levels; M.stairAt = stairAt;
  }

  // 층별 방 구성: [가구 종류, 개수] (c = 수색 가구, d = 실내 장식)
  const ROOMS = {
    bedroom: { c: [['closet', 1], ['drawer', 1]], d: [['bed', 2, 1], ['plant', 1, .4], ['desk', 1, .4]] },
    bath: { c: [['drawer', 1]], d: [['toilet', 1, 1], ['sink', 1, 1], ['bath', 2, .6]] },
    study: { c: [['drawer', 1], ['closet', .5]], d: [['desk', 1, 1], ['shelf', 1, 1], ['sofa', 2, .5]] },
    storage: { c: [['crate', 3], ['supply', .4]], d: [['shelf', 1, .6], ['washer', 1, .4]] },
    ward: { c: [['shelf_med', 1], ['drawer', 1]], d: [['bed', 2, 1], ['bed', 2, 1], ['bed', 2, .6], ['sink', 1, .5]] },
    medstore: { c: [['shelf_med', 3], ['crate', 1]], d: [] },
    morgue: { c: [['locker', 2], ['drawer', 1]], d: [['bed', 2, 1], ['bed', 2, 1], ['bed', 2, 1], ['sink', 1, 1]] },
    office: { c: [['drawer', 1], ['locker', .6]], d: [['desk', 1, 1], ['desk', 1, .6], ['shelf', 1, .7], ['plant', 1, .5]] },
    armory: { c: [['gunlocker', 2], ['locker', 2]], d: [] },
    cells: { c: [['drawer', .5]], d: [['bed', 2, 1], ['toilet', 1, .6]] },
    lounge: { c: [['luggage', 2], ['shelf_food', 1]], d: [['sofa', 2, 1], ['sofa', 2, 1], ['table', 1, 1], ['plant', 1, .6]] },
    vault: { c: [['safe', 4]], d: [] },
    barracks: { c: [['locker', 3]], d: [['bed', 2, 1], ['bed', 2, 1], ['bed', 2, .8]] },
    bunker: { c: [['supply', 4], ['gunlocker', 1]], d: [['shelf', 1, .5]] },
    command: { c: [['drawer', 1], ['supply', 1]], d: [['desk', 1, 1], ['desk', 1, 1], ['table', 1, .7]] },
    dorm: { c: [['locker', 2]], d: [['bed', 2, 1], ['bed', 2, .8]] },
    stock: { c: [['crate', 2], ['shelf_food', 1]], d: [] },
    kitchen2: { c: [['kitchen', 2], ['fridge', 1]], d: [['table', 1, .6]] },
  };
  // 건물 종류 · 층 → 방 종류 목록, 핵심 문서(고정 쪽지)
  function roomPlan(kind, z, top, bottom, townKey) {
    const up = z > 0;
    let rooms, key = null;
    if (kind === 'house') rooms = up ? ['bedroom', 'bedroom', 'bath', 'study'] : ['storage', 'storage'];
    else if (kind === 'hospital') {
      if (up) rooms = z === top ? ['office', 'office', 'ward'] : ['ward', 'ward', 'ward', 'bath', 'medstore'];
      else rooms = z === -2 ? ['morgue', 'morgue', 'storage'] : ['medstore', 'storage', 'storage'];
      if (townKey === 'fort' && z === top) key = 'fk1';
      if (townKey === 'fort' && z === -2) key = 'fk2';
    }
    else if (kind === 'police') { rooms = up ? ['office', 'office', 'bath'] : ['armory', 'cells', 'cells']; if (townKey === 'fort' && up) key = 'fk3'; }
    else if (kind === 'prison') { rooms = up ? (z === top ? ['office', 'office', 'armory'] : ['cells', 'cells', 'cells', 'cells']) : ['storage', 'storage']; if (z === top) key = 'pk1'; }
    else if (kind === 'terminal') { rooms = z === top ? ['command', 'office'] : ['lounge', 'lounge', 'bath']; if (z === top) key = 'ak1'; }
    else if (kind === 'bank') { rooms = z === bottom ? ['vault', 'vault'] : ['vault', 'office']; if (z === bottom) key = 'bk1'; }
    else if (kind === 'army') { rooms = z === -3 ? ['command', 'bunker'] : z === -2 ? ['bunker', 'bunker', 'armory'] : ['barracks', 'barracks', 'bunker']; if (z === -3) key = 'ck1'; }
    else if (kind === 'factory') { rooms = ['office', 'office', 'storage']; if (townKey === 'stone') key = 'sk1'; }
    else if (kind === 'warehouse') rooms = ['storage', 'storage', 'storage'];
    else if (kind === 'firestation') rooms = ['dorm', 'dorm', 'bath'];
    else if (kind === 'restaurant') rooms = ['kitchen2', 'stock'];
    else rooms = ['stock', 'stock', 'office'];
    return { rooms, key };
  }

  function genLevel(W0, hi, z, seed) {
    const h = W0.houses[hi], L = W0.levels[hi];
    const r = DT.rng((seed ^ ((hi + 1) * 0x9e3779b1) ^ ((z + 8) * 0x85ebca6b)) >>> 0);
    const W = h.w + 2, H = h.h + 2, N = W * H, ox = h.x - 1, oy = h.y - 1;
    const idx = (x, y) => y * W + x;
    const t = new Uint8Array(N).fill(T.VOID), deco = new Uint8Array(N);
    const sx = L.stair[0] - ox, sy = L.stair[1] - oy;
    const x0 = 1, y0 = 1, x1 = h.w, y1 = h.h; // 건물 외벽 (지역 좌표, 포함)
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) t[idx(x, y)] = (x === x0 || y === y0 || x === x1 || y === y1) ? T.WALL : T.FLOOR;
    if (z > 0) for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { // 창문 (위층만)
      const edge = x === x0 || y === y0 || x === x1 || y === y1, corner = (x === x0 || x === x1) && (y === y0 || y === y1);
      if (edge && !corner && ((x + y) % 3 === 0) && r() < .75) t[idx(x, y)] = T.WINDOW;
    }
    // 방 나누기 (큰 방을 반으로 계속 자름, 자른 벽엔 문 하나)
    const rects = [], blocked = new Set([idx(sx, sy)]);
    const split = (ax, ay, bx, by, depth) => { // 안쪽 영역 (포함)
      const w = bx - ax + 1, hh = by - ay + 1;
      const can = depth < 4 && (w >= 7 || hh >= 7) && w * hh > 24;
      if (!can) { rects.push([ax, ay, bx, by]); return; }
      const vert = w >= hh;
      for (let tries = 0; tries < 8; tries++) {
        const at = vert ? ax + 3 + ((r() * (w - 6)) | 0) : ay + 3 + ((r() * (hh - 6)) | 0);
        if (vert ? (at === sx && sy >= ay && sy <= by) || at <= ax || at >= bx : (at === sy && sx >= ax && sx <= bx) || at <= ay || at >= by) continue;
        const cells = [];
        if (vert) for (let y = ay; y <= by; y++) cells.push([at, y]); else for (let x = ax; x <= bx; x++) cells.push([x, at]);
        if (cells.some(([x, y]) => blocked.has(idx(x, y)))) continue;
        for (const [x, y] of cells) t[idx(x, y)] = T.WALL;
        const dI = 1 + ((r() * (cells.length - 2)) | 0), [dx, dy] = cells[dI];
        t[idx(dx, dy)] = T.DOOR;
        for (const [a, b] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) blocked.add(idx(dx + a, dy + b));
        if (vert) { split(ax, ay, at - 1, by, depth + 1); split(at + 1, ay, bx, by, depth + 1); }
        else { split(ax, ay, bx, at - 1, depth + 1); split(ax, at + 1, bx, by, depth + 1); }
        return;
      }
      rects.push([ax, ay, bx, by]);
    };
    split(x0 + 1, y0 + 1, x1 - 1, y1 - 1, 0);
    // 계단 주변 비움
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) blocked.add(idx(sx + dx, sy + dy));
    t[idx(sx, sy)] = T.STAIRS;
    const townKey = W0.towns && h.town != null && W0.towns[h.town] ? W0.towns[h.town].key : 'any';
    const plan = roomPlan(L.kind, z, L.max, L.min, townKey);
    const containers = [], decor = [];
    const isFloor = (x, y) => t[idx(x, y)] === T.FLOOR && !deco[idx(x, y)] && !blocked.has(idx(x, y));
    const wallNb = (x, y) => [[0, -1], [0, 1], [-1, 0], [1, 0]].filter(([dx, dy]) => { const v = t[idx(x + dx, y + dy)]; return v === T.WALL || v === T.WINDOW; });
    const connected = () => { // 계단에서 모든 바닥 칸에 갈 수 있는지
      const seen = new Uint8Array(N), q = [idx(sx, sy)]; seen[q[0]] = 1; let n = 1;
      while (q.length) { const k = q.pop(); for (const d of [1, -1, W, -W]) { const m = k + d; if (seen[m]) continue; const v = t[m]; if ((v === T.FLOOR || v === T.DOOR || v === T.STAIRS) && !deco[m]) { seen[m] = 1; n++; q.push(m); } } }
      let total = 0; for (let k = 0; k < N; k++) { const v = t[k]; if ((v === T.FLOOR || v === T.DOOR || v === T.STAIRS) && !deco[k]) total++; }
      return n >= total;
    };
    const freeNb = c => [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => { const k = idx(c.x + dx, c.y + dy), v = t[k]; return (v === T.FLOOR || v === T.DOOR || v === T.STAIRS) && !deco[k]; });
    const allReach = extra => containers.every(freeNb) && (!extra || freeNb(extra)); // 모든 수색 가구 옆에 빈칸이 있어야 함
    const place = (rect, fn) => { for (let tries = 0; tries < 30; tries++) { const x = rect[0] + ((r() * (rect[2] - rect[0] + 1)) | 0), y = rect[1] + ((r() * (rect[3] - rect[1] + 1)) | 0); if (!isFloor(x, y) || !wallNb(x, y).length) continue; if (fn(x, y)) return true; } return false; };
    let keyPlaced = false;
    rects.sort((a, b) => (b[2] - b[0]) * (b[3] - b[1]) - (a[2] - a[0]) * (a[3] - a[1]));
    rects.forEach((rect, ri) => {
      const def = ROOMS[plan.rooms[ri % plan.rooms.length]] || ROOMS.storage;
      for (const [kind, len, pr] of def.d) {
        if (r() > pr) continue;
        place(rect, (x, y) => {
          const [wx, wy] = wallNb(x, y)[0], ax = wy !== 0 ? 1 : 0, ay = wx !== 0 ? 1 : 0;
          const cells = []; for (let k = 0; k < len; k++) { const cx = x + ax * k, cy = y + ay * k; if (!isFloor(cx, cy)) return false; cells.push([cx, cy]); }
          for (const [cx, cy] of cells) deco[idx(cx, cy)] = 1;
          if (!connected() || !allReach()) { for (const [cx, cy] of cells) deco[idx(cx, cy)] = 0; return false; }
          decor.push({ kind, x, y, w: ax ? len : 1, h: ay ? len : 1, wx, wy, c: (r() * 6) | 0 });
          return true;
        });
      }
      for (const [kind, n] of def.c) {
        let cnt = Math.floor(n) + (r() < n % 1 ? 1 : 0);
        while (cnt-- > 0) place(rect, (x, y) => {
          deco[idx(x, y)] = 1;
          const c = { x, y, kind, town: h.town };
          if (!connected() || !allReach(c)) { deco[idx(x, y)] = 0; return false; }
          if (plan.key && !keyPlaced && (kind === 'drawer' || kind === 'safe' || kind === 'locker' || kind === 'supply')) { c.fixedNote = plan.key; keyPlaced = true; }
          containers.push(c);
          return true;
        });
      }
    });
    // 핵심 문서를 넣을 가구가 없었으면 서랍 하나 더
    if (plan.key && !keyPlaced) for (const rect of rects) if (place(rect, (x, y) => { deco[idx(x, y)] = 1; const c = { x, y, kind: 'drawer', town: h.town, fixedNote: plan.key }; if (!connected() || !allReach(c)) { deco[idx(x, y)] = 0; return false; } containers.push(c); return true; })) break;
    const moveBlock = new Uint8Array(N), sightBlock = new Uint8Array(N);
    for (let i = 0; i < N; i++) { moveBlock[i] = MB[t[i]] || deco[i]; sightBlock[i] = SB[t[i]] || 0; }
    const house = { x: x0, y: y0, w: h.w, h: h.h, containers: containers.map((_, i) => i), shop: h.shop, town: h.town, forceFloor: z < 0 ? 'concretePat' : null };
    const name = (h.shop && W0.shops ? ((W0.shops.find(s => s.x === h.x && s.y === h.y) || {}).name || '') : '') || (L.kind === 'house' ? '주택' : '');
    return { W, H, t, moveBlock, sightBlock, deco, containers, decor, houses: [house], cars: [], shops: [], lanes: [], lamps: [], towns: W0.towns, T,
      spawn: { x: sx, y: sy }, spawnContainer: -1, level: { hi, z, ox, oy, kind: L.kind, name, floor: floorName(z) }, salt: ((hi + 1) * 7919 + (z + 8) * 104729) >>> 0, dark: z < 0 };
  }
  DT.planLevels = planLevels; DT.genLevel = genLevel; DT.floorName = floorName;
})();
