// 마을 맵 생성: 3x3 블록, 블록당 집 최대 4채, 도로/인도/나무
(function () {
  const T = { GRASS: 0, ROAD: 1, FLOOR: 2, WALL: 3, DOOR: 4, WINDOW: 5, TREE: 6, WALK: 7 };
  const MOVE_BLOCK = [0, 0, 0, 1, 0, 1, 1, 0];  // 벽·창문·나무는 못 지나감
  const SIGHT_BLOCK = [0, 0, 0, 1, 0, 0, 1, 0]; // 벽·나무는 시야 차단 (창문은 보임)

  function generateMap(seed) {
    const rng = DT.rng(seed);
    const ri = (a, b) => a + Math.floor(rng() * (b - a + 1));
    const W = 72, H = 72;
    const t = new Uint8Array(W * H);
    const idx = (x, y) => y * W + x;
    const roads = [2, 24, 46, 68];
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
    const park = new Uint8Array(W * H);
    const containers = [];
    const houses = [];
    const kinds = ['cabinet', 'drawer', 'closet', 'cabinet', 'drawer'];
    let spawn = null, spawnContainer = -1;
    const blocks = [6, 28, 50];

    for (const bx of blocks) for (const by of blocks) for (let li = 0; li < 2; li++) for (let lj = 0; lj < 2; lj++) {
      const lx = bx + li * 9, ly = by + lj * 9; // 8x8 부지
      const isSpawnLot = bx === 28 && by === 28 && li === 0 && lj === 0;
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
      houses.push(house);
      if (isSpawnLot) {
        const floors = [];
        for (let y = hy + 1; y < hy + hh - 1; y++) for (let x = hx + 1; x < hx + hw - 1; x++)
          if (t[idx(x, y)] === T.FLOOR && !containers.some(c => c.x === x && c.y === y)) floors.push({ x, y });
        spawn = floors[ri(0, floors.length - 1)];
        spawnContainer = house.containers.length ? house.containers[0] : -1;
        house.isSpawn = true;
      }
    }

    // 나무
    for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
      const i = idx(x, y);
      if (t[i] !== T.GRASS || reserved[i]) continue;
      if (rng() < (park[i] ? 0.28 : 0.05)) t[i] = T.TREE;
    }

    const moveBlock = new Uint8Array(W * H), sightBlock = new Uint8Array(W * H);
    for (let i = 0; i < W * H; i++) { moveBlock[i] = MOVE_BLOCK[t[i]]; sightBlock[i] = SIGHT_BLOCK[t[i]]; }
    return { W, H, t, moveBlock, sightBlock, containers, houses, spawn, spawnContainer, T };
  }

  DT.T = T;
  DT.generateMap = generateMap;
})();
