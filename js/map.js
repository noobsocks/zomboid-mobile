// 마을 맵 생성: 3x3 블록, 블록당 집 최대 4채, 도로/인도/나무
(function () {
  const T = { GRASS: 0, ROAD: 1, FLOOR: 2, WALL: 3, DOOR: 4, WINDOW: 5, TREE: 6, WALK: 7, CAR: 8, FENCE: 9, WATER: 10, DIRT: 11, VOID: 12, STAIRS: 13 };
  const MOVE_BLOCK = [0, 0, 0, 1, 0, 0, 1, 0, 1, 1, 1, 0];  // 벽·나무·폐차·철책·물은 못 지나감 (문·창문은 상태에 따라 게임에서 따로 막음)
  const SIGHT_BLOCK = [0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0]; // 벽·나무는 시야 차단 (창문·폐차·철책·물 너머는 보임)

  // opt.v: 1 = 예전 72x72 마을(기존 저장 호환), 2 = 160x160 큰 마을 (공원·숲·주차장 블록 섞임)
  function generateMap(seed, opt) {
    const v2 = !!(opt && opt.v >= 2), v3 = !!(opt && opt.v >= 3);
    const rng = DT.rng(seed);
    const ri = (a, b) => a + Math.floor(rng() * (b - a + 1));
    const W = (opt && opt.size) || (v2 ? 160 : 72), H = W;
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
    // 도시 모양: opt.mask(i, j)가 거짓인 블록은 비워 둠 (불규칙한 도시 윤곽)
    if (opt && opt.mask) blocks.forEach((bx, i) => blocks.forEach((by, j) => { if (!opt.mask(i, j)) btype[bx + ',' + by] = 'void'; }));
    if (v2) for (const bx of blocks) for (const by of blocks) {
      if (bx === mid && by === mid) continue;
      if (btype[bx + ',' + by]) continue;
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
    // 특수 건물 블록 (마트·약국·경찰서·철물점·주유소)
    const shopPlan = [];
    if (v2) {
      const free = [];
      for (const bx of blocks) for (const by of blocks) if (!btype[bx + ',' + by] && !(bx === mid && by === mid) && Math.abs(bx - mid) + Math.abs(by - mid) > 22) free.push([bx, by]);
      for (const kind of (opt && opt.shops) || ['market', 'market', 'pharmacy', 'pharmacy', 'police', 'hardware', 'hardware', 'gas', 'gas'].concat(v3 ? ['firestation', 'restaurant', 'restaurant', 'hunting', 'sports', 'bank'] : [])) {
        if (!free.length) break;
        const [bx, by] = free.splice(Math.floor(btr() * free.length), 1)[0];
        btype[bx + ',' + by] = 'shop'; shopPlan.push({ kind, bx, by });
      }
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

    // ---- 특수 건물 짓기 ----
    const shops = [];
    const SHOPNAME = { market: '마트', pharmacy: '약국', police: '경찰서', hardware: '철물점', gas: '주유소', firestation: '소방서', restaurant: '식당', hunting: '사냥용품점', sports: '스포츠용품점', bank: '은행', army: '군부대', hospital: '카운티 병원', warehouse: '물류 창고', factory: '공장', terminal: '공항 터미널', prison: '감방동' };
    const addC = (x, y, kind, block, house) => { house.containers.push(containers.length); containers.push({ x, y, kind }); reserved[idx(x, y)] = 1; if (block) deco[idx(x, y)] = 1; };
    for (const sp of shopPlan) {
      const { kind, bx, by } = sp;
      for (let y = by; y < by + 17; y++) for (let x = bx; x < bx + 17; x++) reserved[idx(x, y)] = 1;
      const gas = kind === 'gas';
      const hx = bx + 1, hy = by + 1, hw = gas ? 9 : 15, hh = gas ? 7 : 12;
      for (let y = hy; y < hy + hh; y++) for (let x = hx; x < hx + hw; x++) {
        const edge = x === hx || y === hy || x === hx + hw - 1 || y === hy + hh - 1;
        t[idx(x, y)] = edge ? T.WALL : T.FLOOR;
      }
      // 앞쪽(아래) 벽: 양문 + 큰 유리창
      const dx0 = hx + (hw >> 1) - (gas ? 0 : 1), fy = hy + hh - 1;
      for (let x = hx + 1; x < hx + hw - 1; x++) t[idx(x, fy)] = (x === dx0 || (!gas && x === dx0 + 1)) ? T.DOOR : (x % 2 ? T.WINDOW : T.WALL);
      if (!gas) { t[idx(hx, hy + 3)] = T.WINDOW; t[idx(hx + hw - 1, hy + 3)] = T.WINDOW; t[idx(hx, hy + 7)] = T.WINDOW; t[idx(hx + hw - 1, hy + 7)] = T.WINDOW; }
      // 뒷문 (막히지 않게 하나 더)
      t[idx(hx + 2, hy)] = T.DOOR;
      const house = { x: hx, y: hy, w: hw, h: hh, containers: [], shop: kind };
      if (kind === 'police') {
        // 가운데 벽으로 사무실 | 무기고
        const wx = hx + 9;
        for (let y = hy + 1; y < hy + hh - 1; y++) t[idx(wx, y)] = y === hy + 5 ? T.DOOR : T.WALL;
        for (const [x, y] of [[hx + 2, hy + 2], [hx + 5, hy + 2], [hx + 2, hy + 5], [hx + 5, hy + 5]]) { deco[idx(x, y)] = 1; decor.push({ kind: 'desk', x, y, w: 1, h: 1, wx: 0, wy: -1, c: 0 }); }
        for (let x = wx + 1; x < hx + hw - 1; x++) addC(x, hy + 1, 'locker', true, house);
        addC(hx + hw - 2, hy + 4, 'gunlocker', true, house); addC(hx + hw - 2, hy + 6, 'gunlocker', true, house);
        addC(hx + 3, hy + 9, 'counter', true, house); addC(hx + 4, hy + 9, 'counter', true, house);
      } else if (kind === 'hospital') {
        // 병실: 침대 줄 · 약 선반 · 사물함 · 접수대
        for (let x = hx + 4; x <= hx + hw - 3; x += 2) { deco[idx(x, hy + 1)] = deco[idx(x, hy + 2)] = 1; decor.push({ kind: 'bed', x, y: hy + 1, w: 1, h: 2, wx: 0, wy: -1, c: 1 }); }
        for (let x = hx + 3; x <= hx + 6; x++) addC(x, hy + 5, 'shelf_med', true, house);
        for (let x = hx + 9; x <= hx + 12; x++) addC(x, hy + 5, 'shelf_med', true, house);
        addC(hx + hw - 2, hy + 7, 'locker', true, house); addC(hx + hw - 2, hy + 8, 'locker', true, house);
        addC(hx + 2, hy + 9, 'counter', true, house); addC(hx + 3, hy + 9, 'counter', true, house); addC(hx + 1, hy + 7, 'drawer', true, house);
      } else if (kind === 'warehouse') {
        // 나무 상자가 줄지어 쌓인 창고
        [hy + 2, hy + 5, hy + 8].forEach(y => { for (let x = hx + 2; x <= hx + hw - 3; x++) if (x !== dx0 && x !== dx0 + 1 && x !== dx0 - 1) addC(x, y, 'crate', true, house); });
      } else if (kind === 'factory') {
        for (let x = hx + 4; x <= hx + 8; x++) addC(x, hy + 1, 'locker', true, house);
        for (let x = hx + 2; x <= hx + hw - 3; x++) if (x !== dx0 && x !== dx0 + 1) addC(x, hy + 4, 'toolrack', true, house);
        for (let x = hx + 2; x <= hx + hw - 3; x++) if (x !== dx0 && x !== dx0 + 1 && x % 2) addC(x, hy + 7, 'crate', true, house);
        addC(hx + 2, hy + 9, 'counter', true, house);
      } else if (kind === 'terminal') {
        // 대합실: 버려진 여행 가방 · 탑승 수속대 · 매점
        for (const y of [hy + 3, hy + 6]) for (let x = hx + 2; x <= hx + hw - 3; x += 2) if (x !== dx0 && x !== dx0 + 1) addC(x, y, 'luggage', true, house);
        for (let x = hx + 3; x <= hx + hw - 4; x++) if (x < dx0 - 1 || x > dx0 + 2) addC(x, hy + 9, 'counter', true, house);
        addC(hx + hw - 2, hy + 1, 'shelf_food', true, house); addC(hx + hw - 3, hy + 1, 'shelf_food', true, house);
      } else if (kind === 'prison') {
        // 위쪽: 감방 4칸(철문), 아래쪽: 교도관실
        const wy = hy + 5;
        for (let x = hx + 1; x < hx + hw - 1; x++) t[idx(x, wy)] = T.WALL;
        for (let k = 0; k < 4; k++) {
          const cx0 = hx + 1 + k * 3;
          if (k > 0) for (let y = hy + 1; y < wy; y++) t[idx(cx0 - 1, y)] = T.WALL;
          t[idx(cx0 + 1, wy)] = T.DOOR;
          deco[idx(cx0, hy + 1)] = deco[idx(cx0, hy + 2)] = 1; decor.push({ kind: 'bed', x: cx0, y: hy + 1, w: 1, h: 2, wx: -1, wy: 0, c: 5 });
          if (k === 2) addC(cx0 + 1, hy + 1, 'drawer', true, house);
        }
        t[idx(hx + 13, wy)] = T.DOOR;
        addC(hx + hw - 2, hy + 7, 'gunlocker', true, house); addC(hx + hw - 2, hy + 8, 'locker', true, house); addC(hx + hw - 2, hy + 9, 'locker', true, house);
        addC(hx + 3, hy + 9, 'counter', true, house); addC(hx + 2, hy + 7, 'shelf_food', true, house);
      } else if (kind === 'army') {
        // 군 막사: 사물함 줄 · 총기 보관함 · 보급 선반
        for (let x = hx + 4; x <= hx + hw - 3; x++) addC(x, hy + 1, 'locker', true, house);
        for (const y of [hy + 4, hy + 6, hy + 8]) addC(hx + hw - 2, y, 'gunlocker', true, house);
        for (let x = hx + 3; x <= hx + 8; x++) if (x !== dx0 && x !== dx0 + 1) addC(x, hy + 5, 'shelf_food', true, house);
        for (const [x, y] of [[hx + 2, hy + 8], [hx + 4, hy + 8]]) { deco[idx(x, y)] = 1; decor.push({ kind: 'bed', x, y, w: 1, h: 2, wx: -1, wy: 0, c: 2 }); }
      } else if (kind === 'firestation') {
        // 소방 장비함 줄 + 사무실 책상 + 뒤편 차고(빈 공간)
        for (let x = hx + 4; x <= hx + hw - 3; x++) addC(x, hy + 1, 'firegear', true, house);
        for (const [x, y] of [[hx + 2, hy + 4], [hx + 2, hy + 7]]) { deco[idx(x, y)] = 1; decor.push({ kind: 'desk', x, y, w: 1, h: 1, wx: 0, wy: -1, c: 0 }); }
        addC(hx + hw - 2, hy + 5, 'firegear', true, house); addC(hx + hw - 2, hy + 7, 'drawer', true, house);
        addC(hx + 3, hy + 9, 'counter', true, house);
      } else if (kind === 'restaurant') {
        // 뒤쪽 주방(냉장고·주방 선반) | 앞쪽 홀(식탁)
        addC(hx + 4, hy + 1, 'fridge', true, house); addC(hx + 5, hy + 1, 'fridge', true, house);
        for (let x = hx + 6; x <= hx + hw - 3; x++) addC(x, hy + 1, 'kitchen', true, house);
        for (let x = hx + 3; x <= hx + hw - 4; x++) if (x !== dx0 && x !== dx0 + 1 && x !== dx0 - 1) addC(x, hy + 3, x % 3 ? 'kitchen' : 'cabinet', true, house);
        for (const y of [hy + 6, hy + 8]) for (const x of [hx + 2, hx + 4, hx + hw - 5, hx + hw - 3]) { deco[idx(x, y)] = 1; decor.push({ kind: 'table', x, y, w: 1, h: 1, wx: 0, wy: -1, c: 0 }); }
        addC(hx + hw - 2, hy + 10, 'counter', true, house);
      } else if (kind === 'bank') {
        // 창구(계산대 줄) 뒤로 금고·사물함
        for (let x = hx + 1; x < hx + hw - 1; x++) if (x !== hx + 2 && x !== hx + hw - 3) addC(x, hy + 6, 'counter', true, house);
        for (let x = hx + 4; x <= hx + 7; x++) addC(x, hy + 1, 'safe', true, house);
        for (let x = hx + 9; x <= hx + hw - 3; x++) addC(x, hy + 1, 'locker', true, house);
        for (const [x, y] of [[hx + 4, hy + 3], [hx + 8, hy + 3], [hx + 11, hy + 3]]) { deco[idx(x, y)] = 1; decor.push({ kind: 'desk', x, y, w: 1, h: 1, wx: 0, wy: -1, c: 0 }); }
      } else if (gas) {
        for (let x = hx + 2; x <= hx + 6; x++) if (x !== hx + 4) addC(x, hy + 2, 'shelf_food', true, house);
        addC(hx + 6, hy + 4, 'counter', true, house);
        // 주유기 + 앞마당 아스팔트
        for (let y = by + 9; y < by + 17; y++) for (let x = bx; x < bx + 17; x++) t[idx(x, y)] = T.ROAD;
        for (const x of [bx + 3, bx + 8, bx + 13]) { deco[idx(x, by + 12)] = 1; decor.push({ kind: 'pump', x, y: by + 12, w: 1, h: 1, wx: 0, wy: -1, c: 0 }); }
      } else {
        // 진열대 3줄 (가운데·양옆은 통로)
        const sk = kind === 'market' ? ['shelf_food', 'shelf_food', 'shelf_food'] : kind === 'pharmacy' ? ['shelf_med', 'shelf_med', 'shelf_food'] : kind === 'hunting' ? ['huntrack', 'huntrack', 'sportrack'] : kind === 'sports' ? ['sportrack', 'sportrack', 'shelf_food'] : ['toolrack', 'toolrack', 'toolrack'];
        [hy + 2, hy + 4, hy + 6].forEach((y, r) => { for (let x = hx + 2; x <= hx + hw - 3; x++) if (x !== dx0 && x !== dx0 + 1) addC(x, y, sk[r], true, house); });
        addC(hx + 2, hy + 9, 'counter', true, house); addC(hx + 3, hy + 9, 'counter', true, house);
      }
      houses.push(house);
      shops.push({ kind, name: SHOPNAME[kind], x: hx, y: hy, w: hw, h: hh, door: [dx0, fy] });
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
    // 폐차 트렁크 (수색 가능) — 기존 저장 번호가 밀리지 않게 수색 가구 목록 맨 뒤에 붙임
    for (const c of cars) if (!c.burnt) containers.push({ x: c.x, y: c.y, kind: 'car', car: true, cw: c.vert ? 1 : 2, ch: c.vert ? 2 : 1 });
    const moveBlock = new Uint8Array(W * H), sightBlock = new Uint8Array(W * H);
    for (let i = 0; i < W * H; i++) { moveBlock[i] = MOVE_BLOCK[t[i]] || deco[i]; sightBlock[i] = SIGHT_BLOCK[t[i]]; }
    return { W, H, t, moveBlock, sightBlock, containers, houses, spawn, spawnContainer, cars, decor, deco, T, roads, blocks, btype, shops, v: v3 ? 3 : v2 ? 2 : 1 };
  }

  DT.T = T;
  DT.generateMap = generateMap;
})();
