// 마을 맵 생성: 3x3 블록, 블록당 집 최대 4채, 도로/인도/나무
(function () {
  const T = { GRASS: 0, ROAD: 1, FLOOR: 2, WALL: 3, DOOR: 4, WINDOW: 5, TREE: 6, WALK: 7, CAR: 8 };
  const MOVE_BLOCK = [0, 0, 0, 1, 0, 0, 1, 0, 1];  // 벽·나무·폐차는 못 지나감 (문·창문은 상태에 따라 게임에서 따로 막음)
  const SIGHT_BLOCK = [0, 0, 0, 1, 0, 0, 1, 0, 0]; // 벽·나무는 시야 차단 (창문·폐차 너머는 보임)

  // opt.v: 1 = 예전 72x72 마을(기존 저장 호환), 2 = 160x160 큰 마을 (공원·숲·주차장 블록 섞임)
  function generateMap(seed, opt) {
    const v2 = !!(opt && opt.v >= 2);
    const rng = DT.rng(seed);
    const ri = (a, b) => a + Math.floor(rng() * (b - a + 1));
    const W = v2 ? 160 : 72, H = W;
    const t = new Uint8Array(W * H);
    const idx = (x, y) => y * W + x;
    const roads = [];
    for (let r = 2; r + 3 < W; r += 22) roads.push(r);
    const inRoad = v => roads.some(p => v >= p && v <= p + 2);
    const nearRoad = v => roads.some(p => v === p - 1 || v === p + 3);

    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      let v = T.GRASS;
      if (x === 0 || y === 0 || x === W - 1 || y === H - 1) v = T.TREE;
      else if (inRoad(x) || inRoad(y)) v = T.ROAD;
      else if (nearRoad(x) || nearRoad(y)) v = T.WALK;
      t[idx(x, y)] = v;
    }

    const reserved = new Uint8Array(W * H);
    const deco = new Uint8Array(W * H);   // 실내 가구(침대·소파 등)가 놓인 칸 — 못 지나감
    const decor = [], extraDecor = [];
    const er = DT.rng(seed ^ 0xa11e); // 추가 가구 전용 (기존 저장과 호환되도록 별도 난수)
    const dr = DT.rng(seed ^ 0xdec0);
    const park = new Uint8Array(W * H);
    const containers = [];
    const houses = [];
    const kinds = ['cabinet', 'drawer', 'closet', 'cabinet', 'drawer'];
    let spawn = null, spawnContainer = -1;
    const blocks = roads.slice(0, -1).map(r => r + 4);
    const mid = blocks[(blocks.length - 1) >> 1];
    // 블록 종류 (큰 마을만): 주택가 / 공원 / 숲 / 주차장
    const btr = DT.rng(seed ^ 0xb10c), btype = {}, forest = new Uint8Array(W * H), lots = [];
    if (v2) for (const bx of blocks) for (const by of blocks) {
      if (bx === mid && by === mid) continue;
      const k = btr();
      const ty = k < .12 ? 'park' : k < .2 ? 'forest' : k < .26 ? 'parking' : 'res';
      if (ty === 'res') continue;
      btype[bx + ',' + by] = ty;
      for (let y = by; y < by + 17; y++) for (let x = bx; x < bx + 17; x++) {
        if (ty === 'parking') { t[idx(x, y)] = T.ROAD; reserved[idx(x, y)] = 1; }
        else { park[idx(x, y)] = 1; if (ty === 'forest') forest[idx(x, y)] = 1; }
      }
      if (ty === 'parking') lots.push([bx, by]);
    }

    for (const bx of blocks) for (const by of blocks) for (let li = 0; li < 2; li++) for (let lj = 0; lj < 2; lj++) {
      if (btype[bx + ',' + by]) continue;
      const lx = bx + li * 9, ly = by + lj * 9; // 8x8 부지
      const isSpawnLot = bx === mid && by === mid && li === 0 && lj === 0;
      if (!isSpawnLot && rng() < 0.2) {
        for (let y = ly; y < ly + 8; y++) for (let x = lx; x < lx + 8; x++) park[idx(x, y)] = 1;
        continue;
      }
      const hw = ri(6, 8), hh = ri(6, 8);
      const hx = lx + ri(0, 8 - hw), hy = ly + ri(0, 8 - hh);
      for (let y = hy; y < hy + hh; y++) for (let x = hx; x < hx + hw; x++) {
        const edge = x === hx || y === hy || x === hx + hw - 1 || y === hy + hh - 1;
        t[idx(x, y)] = edge ? T.WALL : T.FLOOR;
      }
      // 문: 도로 쪽 면
      const sides = [li === 0 ? 'W' : 'E', lj === 0 ? 'N' : 'S'];
      const doorSide = sides[ri(0, 1)];
      const doors = [];
      const placeDoor = (side) => {
        let x, y, ox = 0, oy = 0;
        if (side === 'N' || side === 'S') { x = hx + ri(1, hw - 2); y = side === 'N' ? hy : hy + hh - 1; oy = side === 'N' ? -1 : 1; }
        else { y = hy + ri(1, hh - 2); x = side === 'W' ? hx : hx + hw - 1; ox = side === 'W' ? -1 : 1; }
        t[idx(x, y)] = T.DOOR;
        doors.push({ x, y, side });
        for (let k = -1; k <= 2; k++) {
          const rx = x + ox * k, ry = y + oy * k;
          if (rx > 0 && ry > 0 && rx < W - 1 && ry < H - 1) reserved[idx(rx, ry)] = 1;
          // 문 앞 좌우도 비워둠
          if (k === 1) {
            if (ox === 0) { reserved[idx(rx - 1, ry)] = 1; reserved[idx(rx + 1, ry)] = 1; }
            else { reserved[idx(rx, ry - 1)] = 1; reserved[idx(rx, ry + 1)] = 1; }
          }
        }
      };
      placeDoor(doorSide);
      if (rng() < 0.4) placeDoor(sides[doorSide === sides[0] ? 1 : 0]);

      // 내부 벽 (방 2개)
      let wx = -1;
      if (hw >= 7 && rng() < 0.75) {
        wx = hx + ri(3, hw - 4);
        const clash = doors.some(d => (d.side === 'N' || d.side === 'S') && d.x === wx);
        if (clash) wx = -1;
        else {
          const gy = hy + ri(1, hh - 2);
          for (let y = hy + 1; y < hy + hh - 1; y++) t[idx(wx, y)] = y === gy ? T.DOOR : T.WALL;
          reserved[idx(wx - 1, gy)] = 1; reserved[idx(wx + 1, gy)] = 1; reserved[idx(wx, gy)] = 1;
        }
      }
      // 창문
      for (let y = hy; y < hy + hh; y++) for (let x = hx; x < hx + hw; x++) {
        const i = idx(x, y);
        if (t[i] !== T.WALL) continue;
        const corner = (x === hx || x === hx + hw - 1) && (y === hy || y === hy + hh - 1);
        const onEdge = x === hx || y === hy || x === hx + hw - 1 || y === hy + hh - 1;
        if (!onEdge || corner || x === wx) continue;
        if (rng() < 0.15) t[i] = T.WINDOW;
      }
      // 문 안쪽 칸은 가구 금지
      for (const d of doors) for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) reserved[idx(d.x + dx, d.y + dy)] = 1;

      // 가구(수색 가능한 곳)
      const cand = [];
      for (let y = hy + 1; y < hy + hh - 1; y++) for (let x = hx + 1; x < hx + hw - 1; x++) {
        const i = idx(x, y);
        if (t[i] !== T.FLOOR || reserved[i]) continue;
        const nb = [idx(x - 1, y), idx(x + 1, y), idx(x, y - 1), idx(x, y + 1)];
        if (nb.some(n => t[n] === T.WALL || t[n] === T.WINDOW)) cand.push({ x, y });
      }
      const n = Math.min(cand.length, ri(2, 4));
      const house = { x: hx, y: hy, w: hw, h: hh, containers: [] };
      for (let k = 0; k < n; k++) {
        const c = cand.splice(ri(0, cand.length - 1), 1)[0];
        const kind = k === 0 ? 'fridge' : kinds[ri(0, kinds.length - 1)];
        house.containers.push(containers.length);
        containers.push({ x: c.x, y: c.y, kind });
        reserved[idx(c.x, c.y)] = 1;
      }
      // ---- 실내 가구: 벽에 붙여 배치, 놓은 뒤 집 안 길이 끊기지 않는지 확인 ----
      const doorIn = doors.map(d => d.side === 'N' ? [d.x, d.y + 1] : d.side === 'S' ? [d.x, d.y - 1] : d.side === 'W' ? [d.x + 1, d.y] : [d.x - 1, d.y]);
      const floorOK = (x, y) => x > hx && y > hy && x < hx + hw - 1 && y < hy + hh - 1 && (t[idx(x, y)] === T.FLOOR) && !reserved[idx(x, y)] && !deco[idx(x, y)];
      const wallN = (x, y) => [[0, -1], [0, 1], [-1, 0], [1, 0]].filter(([dx, dy]) => { const v = t[idx(x + dx, y + dy)]; return v === T.WALL || v === T.WINDOW; });
      const connected = () => {
        const seen = new Set(), q = [];
        for (const [x, y] of doorIn) if (!deco[idx(x, y)]) { q.push([x, y]); seen.add(idx(x, y)); }
        let total = 0;
        for (let y = hy + 1; y < hy + hh - 1; y++) for (let x = hx + 1; x < hx + hw - 1; x++) { const v = t[idx(x, y)]; if ((v === T.FLOOR || v === T.DOOR) && !deco[idx(x, y)]) total++; }
        while (q.length) {
          const [x, y] = q.pop();
          for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            const nx = x + dx, ny = y + dy, k = idx(nx, ny);
            if (nx <= hx || ny <= hy || nx >= hx + hw - 1 || ny >= hy + hh - 1 || seen.has(k)) continue;
            const v = t[k]; if ((v !== T.FLOOR && v !== T.DOOR) || deco[k]) continue;
            seen.add(k); q.push([nx, ny]);
          }
        }
        return seen.size >= total;
      };
      const tryPlace = (kind, len, R = dr, out = decor) => {
        for (let tries = 0; tries < 30; tries++) {
          const x = hx + 1 + Math.floor(R() * (hw - 2)), y = hy + 1 + Math.floor(R() * (hh - 2));
          if (!floorOK(x, y)) continue;
          const wn = wallN(x, y); if (!wn.length) continue;
          const [wx, wy] = wn[0];
          // 벽과 나란히 len칸
          const ax = wy !== 0 ? 1 : 0, ay = wx !== 0 ? 1 : 0;
          const cells = [];
          let ok = true;
          for (let k = 0; k < len; k++) { const cx = x + ax * k, cy = y + ay * k; if (!floorOK(cx, cy)) { ok = false; break; } cells.push([cx, cy]); }
          if (!ok) continue;
          for (const [cx, cy] of cells) deco[idx(cx, cy)] = 1;
          if (!connected()) { for (const [cx, cy] of cells) deco[idx(cx, cy)] = 0; continue; }
          out.push({ kind, x, y, w: ax ? len : 1, h: ay ? len : 1, wx, wy, c: Math.floor(R() * 6) });
          return true;
        }
        return false;
      };
      tryPlace('bed', 2);
      if (dr() < .75) tryPlace('sofa', 2);
      if (dr() < .6) tryPlace('table', 1);
      if (dr() < .55) tryPlace('tv', 1);
      if (dr() < .4) tryPlace('toilet', 1);
      // 추가 가구 (책장·욕조·세면대·세탁기·화분·책상)
      for (const [k, len, pr] of [['shelf', 1, .6], ['bath', 2, .3], ['sink', 1, .45], ['washer', 1, .3], ['plant', 1, .55], ['desk', 1, .4], ['shelf', 1, .25], ['plant', 1, .25]]) if (er() < pr) tryPlace(k, len, er, extraDecor);
      houses.push(house);
      if (isSpawnLot) {
        const floors = [];
        for (let y = hy + 1; y < hy + hh - 1; y++) for (let x = hx + 1; x < hx + hw - 1; x++)
          if (t[idx(x, y)] === T.FLOOR && !deco[idx(x, y)] && !containers.some(c => c.x === x && c.y === y)) floors.push({ x, y });
        spawn = floors[ri(0, floors.length - 1)];
        spawnContainer = house.containers.length ? house.containers[0] : -1;
        house.isSpawn = true;
      }
    }

    decor.push(...extraDecor); // 저장된 가구 번호가 밀리지 않도록 맨 뒤에 붙임
    // 나무
    for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
      const i = idx(x, y);
      if (t[i] !== T.GRASS || reserved[i]) continue;
      if (rng() < (forest[i] ? 0.5 : park[i] ? 0.28 : 0.05)) t[i] = T.TREE;
    }

    // 도로 위 폐차 (바깥 차선만 사용 → 가운데 차선은 항상 통행 가능)
    const cr = DT.rng(seed ^ 0x6ca7);
    const cars = [];
    const colors = ['#6b2d2b', '#2f4a5c', '#77735f', '#3a3a3a', '#5a5f3a', '#8a8a86', '#4a3a5c'];
    const spans = blocks.map(b => [b, b + 13]);
    const KA = (W * H) / 5184, carMax = Math.round(14 * KA);
    for (let k = 0; k < 40 * KA && cars.length < carMax; k++) {
      const rp = roads[Math.floor(cr() * roads.length)], lane = cr() < .5 ? rp : rp + 2;
      const sp = spans[Math.floor(cr() * spans.length)], pos = sp[0] + Math.floor(cr() * (sp[1] - sp[0]));
      const vert = cr() < .5;
      const x = vert ? lane : pos, y = vert ? pos : lane;
      const x2 = vert ? x : x + 1, y2 = vert ? y + 1 : y;
      if (x2 >= W - 1 || y2 >= H - 1) continue;
      if (t[idx(x, y)] !== T.ROAD || t[idx(x2, y2)] !== T.ROAD) continue;
      if (cars.some(c => Math.abs(c.x - x) + Math.abs(c.y - y) < 4)) continue;
      t[idx(x, y)] = T.CAR; t[idx(x2, y2)] = T.CAR;
      cars.push({ x, y, vert, color: colors[Math.floor(cr() * colors.length)], flip: cr() < .5, burnt: cr() < .25 });
    }

    // 주차장: 줄지어 선 폐차 (줄 사이는 통로)
    for (const [bx, by] of lots) for (const ry of [by + 2, by + 7, by + 12]) for (let i = 0; i < 8; i++) {
      if (cr() > .6) continue;
      const x = bx + 1 + i * 2, y = ry;
      if (t[idx(x, y)] !== T.ROAD || t[idx(x, y + 1)] !== T.ROAD) continue;
      t[idx(x, y)] = T.CAR; t[idx(x, y + 1)] = T.CAR;
      cars.push({ x, y, vert: true, color: colors[Math.floor(cr() * colors.length)], flip: cr() < .5, burnt: cr() < .2 });
    }
    const moveBlock = new Uint8Array(W * H), sightBlock = new Uint8Array(W * H);
    for (let i = 0; i < W * H; i++) { moveBlock[i] = MOVE_BLOCK[t[i]] || deco[i]; sightBlock[i] = SIGHT_BLOCK[t[i]]; }
    return { W, H, t, moveBlock, sightBlock, containers, houses, spawn, spawnContainer, cars, decor, deco, T, roads, blocks, btype, v: v2 ? 2 : 1 };
  }

  DT.T = T;
  DT.generateMap = generateMap;
})();
