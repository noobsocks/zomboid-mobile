// DEAD TOWN — 메인 게임 (SVG 렌더링)
(function () {
  'use strict';
  const SAVE_KEY = 'deadtown_save_v1';
  const NS = 'http://www.w3.org/2000/svg';
  const $ = id => document.getElementById(id);
  function el(tag, attrs, parent) {
    const e = document.createElementNS(NS, tag);
    if (attrs) for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  const lerp = (a, b, t) => a + (b - a) * t;
  const rand = Math.random;
  const TAU = Math.PI * 2;
  function angDiff(a, b) { let d = (a - b) % TAU; if (d > Math.PI) d -= TAU; else if (d < -Math.PI) d += TAU; return d; }
  const SFX = window.DT.sfx || { play() {}, at() {}, update() {} };
  const ico = (n, cls) => `<svg class="${cls || ''}"><use href="#i-${n}"/></svg>`;

  /* ================= 아이템 ================= */
  const ITEMS = {
    apple:   { name: '사과', w: .2, type: 'food', full: 12, hyd: 5, time: 2, icon: 'apple', fresh: 4320 },
    bread:   { name: '빵', w: .3, type: 'food', full: 22, time: 3, icon: 'bread', fresh: 5760 },
    hotcan:  { name: '데운 통조림', w: .6, type: 'food', full: 45, time: 4, icon: 'food', fresh: 1440, cooked: 1 },
    toast:   { name: '토스트', w: .3, type: 'food', full: 30, time: 3, icon: 'bread', fresh: 2880, cooked: 1 },
    stew:    { name: '스튜', w: .8, type: 'food', full: 70, hyd: 20, time: 6, icon: 'pot', fresh: 2880, cooked: 1 },
    pot:     { name: '냄비', w: 1, type: 'tool', icon: 'pot' },
    campkit: { name: '모닥불 재료', w: 2.2, type: 'place', icon: 'fire' },
    chips:   { name: '과자', w: .2, type: 'food', full: 15, hyd: -4, time: 2.5, icon: 'chips' },
    can:     { name: '통조림', w: .6, type: 'food', full: 35, time: 4, icon: 'food' },
    water:   { name: '생수', w: .5, type: 'drink', hyd: 40, time: 2, icon: 'bottle' },
    soda:    { name: '탄산음료', w: .4, type: 'drink', hyd: 25, full: 4, time: 2, icon: 'soda' },
    bandage: { name: '붕대', w: .1, type: 'med', stopBleed: true, hp: 4, time: 3, icon: 'bandage' },
    pills:   { name: '진통제', w: .1, type: 'med', hp: 12, time: 1, icon: 'pills' },
    knife:   { name: '식칼', w: .4, type: 'melee', dmg: .9, range: 1.0, cd: .42, endu: 5, dur: 25, knock: .15, color: '#d9dde0', icon: 'knife' },
    hammer:  { name: '망치', w: 1, type: 'melee', dmg: 1.25, range: 1.1, cd: .75, endu: 9, dur: 45, knock: .35, color: '#a0a0a0', icon: 'hammer' },
    bat:     { name: '야구방망이', w: 1.5, type: 'melee', dmg: 1.3, range: 1.35, cd: .8, endu: 10, dur: 40, knock: .5, color: '#c8a06a', icon: 'bat' },
    pipe:    { name: '쇠파이프', w: 1.8, type: 'melee', dmg: 1.6, range: 1.4, cd: .95, endu: 12, dur: 70, knock: .6, color: '#8d99a3', icon: 'pipe' },
    pistol:  { name: '권총', w: 1, type: 'gun', dmg: 3.2, range: 9, cd: .55, noise: 24, color: '#111', icon: 'gun' },
    ammo:    { name: '9mm 탄약', w: .02, type: 'ammo', stack: true, icon: 'ammo' },
    // --- 재료·도구 ---
    plank:   { name: '판자', w: 1, type: 'mat', icon: 'plank' },
    nails:   { name: '못', w: .01, type: 'mat', stack: true, icon: 'nails' },
    cloth:   { name: '천 조각', w: .05, type: 'mat', stack: true, icon: 'cloth' },
    scrap:   { name: '고철', w: .5, type: 'mat', icon: 'scrap' },
    wire:    { name: '전선', w: .1, type: 'mat', icon: 'wire' },
    tape:    { name: '덕트 테이프', w: .2, type: 'mat', uses: 4, icon: 'tape' },
    glue:    { name: '접착제', w: .2, type: 'mat', uses: 3, icon: 'glue' },
    shirt:   { name: '낡은 옷', w: .4, type: 'mat', icon: 'shirt' },
    screwdriver: { name: '드라이버', w: .3, type: 'tool', icon: 'screwdriver' },
    barricade: { name: '바리케이드 판자', w: 1.2, type: 'mat', icon: 'barricade' },
    benchkit: { name: '작업대 (설치용)', w: 6, type: 'place', icon: 'bench' },
    furn:    { name: '가구', w: 10, type: 'place', icon: 'bench' },
    // --- 제작 무기 ---
    nailbat: { name: '못 박힌 판자', w: 1.3, type: 'melee', dmg: 1.2, range: 1.25, cd: .8, endu: 10, dur: 30, knock: .45, color: '#a47a4c', icon: 'nailbat' },
    spear:   { name: '창', w: 1.6, type: 'melee', dmg: 1.5, range: 1.8, cd: .85, endu: 10, dur: 45, knock: .3, color: '#8d99a3', icon: 'spear' },
  };
  const STACK_ROLL = { ammo: [6, 15], nails: [3, 10], cloth: [2, 4] };
  const TOOL_NAME = { hammer: '망치', screwdriver: '드라이버', pot: '냄비' };
  // 기술
  const SKILLS = { melee: ['근접 전투', 'fist', '공격력·치명타↑, 휘두를 때 지구력↓'], gun: ['사격', 'gun', '명중률↑'], carp: ['목공', 'hammer', '제작·분해·판자 작업 빨라짐, 판자 튼튼해짐'], cook: ['요리', 'pot', '요리 빨라지고 음식 효과↑'], aid: ['응급처치', 'bandage', '붕대 빨라지고 회복량↑'] };
  const xpNeed = lv => Math.round(25 * Math.pow(lv + 1, 1.6));
  // 제작 레시피: in = [아이템, 개수] (못·천은 개수, 테이프·접착제는 사용 횟수)
  const RECIPES = [
    { id: 'bandage',   in: [['cloth', 2]], out: 'bandage', time: 3 },
    { id: 'barricade', in: [['plank', 1], ['nails', 2]], tools: ['hammer'], out: 'barricade', time: 4, noise: 5 },
    { id: 'nailbat',   in: [['plank', 1], ['nails', 3]], tools: ['hammer'], out: 'nailbat', time: 5, noise: 5 },
    { id: 'benchkit',  in: [['plank', 4], ['nails', 6]], tools: ['hammer'], out: 'benchkit', time: 10, noise: 6 },
    { id: 'spear',     in: [['pipe', 1], ['knife', 1], ['tape', 1]], out: 'spear', time: 6, bench: true },
    { id: 'campkit',   in: [['plank', 2], ['cloth', 1]], out: 'campkit', time: 5 },
    // 요리 (불 필요: 전기 있을 땐 조리대, 끊기면 모닥불)
    { id: 'hotcan',    in: [['can', 1]], out: 'hotcan', time: 4, heat: true, cook: true },
    { id: 'toast',     in: [['bread', 1]], out: 'toast', time: 3, heat: true, cook: true },
    { id: 'stew',      in: [['can', 1], ['water', 1], ['apple', 1]], tools: ['pot'], out: 'stew', time: 8, heat: true, cook: true },
  ];
  // 가구 분해
  const DISMANTLE = {
    closet:  { tool: 'hammer', time: 7, noise: 7, out: [['plank', 3, 4], ['nails', 2, 5]] },
    drawer:  { tool: 'hammer', time: 5, noise: 6, out: [['plank', 2, 3], ['nails', 1, 4]] },
    cabinet: { tool: 'hammer', time: 5, noise: 6, out: [['plank', 2, 3], ['nails', 2, 4]] },
    fridge:  { tool: 'screwdriver', time: 8, noise: 4, out: [['scrap', 2, 3], ['wire', 1, 2]] },
    bench:   { tool: 'hammer', time: 6, noise: 6, out: [['plank', 2, 3], ['nails', 2, 4]] },
  };
  // 아이템 분해
  const ITEM_DISMANTLE = {
    shirt:   { time: 3, out: [['cloth', 2, 4]] },
    bat:     { time: 3, out: [['plank', 1, 1]] },
    nailbat: { tool: 'hammer', time: 3, noise: 4, out: [['plank', 1, 1], ['nails', 1, 2]] },
    barricade: { tool: 'hammer', time: 3, noise: 4, out: [['plank', 1, 1], ['nails', 1, 2]] },
    pipe:    { time: 2, out: [['scrap', 1, 2]] },
    spear:   { time: 3, out: [['pipe', 1, 1]] },
    knife:   { tool: 'screwdriver', time: 3, out: [['scrap', 1, 1]] },
    hammer:  { tool: 'screwdriver', time: 3, out: [['scrap', 1, 1], ['plank', 0, 1]] },
    pistol:  { tool: 'screwdriver', time: 6, out: [['scrap', 2, 2], ['wire', 0, 1]] },
  };
  const REPAIR = { tape: .35, glue: .55 }; // 최대 내구도 대비 회복량
  /* ===== 크기 규격 (1칸 = 32px 기준, 코드 단위는 칸) =====
     캐릭터(플레이어·좀비)  몸통 24x20 · 장비 포함 최대 26x24 · 1칸(32x32) 안
     시체                   32x24 이하 (누운 캐릭터)
     1칸 가구·작업대        28x28 (사방 2px 여백) · 작업대 28x24
     2칸 가구(침대·소파)    60x28 / 28x60
     자동차                 26x60 (1x2칸)
     나무 잎                지름 32~36 (잎만 칸 밖으로 살짝 허용)
     UI 아이콘              24x24                                       */
  const PX = 1 / 32;
  // 입체감용 공용 그라데이션 (방향 없는 구형 음영 → 캐릭터가 돌아도 자연스러움)
  (function artDefs() {
    const sv = el('svg', { width: 0, height: 0, style: 'position:absolute;width:0;height:0;overflow:hidden', 'aria-hidden': 'true' });
    document.body.appendChild(sv);
    const d = el('defs', {}, sv);
    const rg = (id, stops, a) => { const g = el('radialGradient', Object.assign({ id }, a || {}), d); for (const [o, c, op] of stops) el('stop', { offset: o, 'stop-color': c, 'stop-opacity': op }, g); };
    rg('volG', [['0%', '#fff', .22], ['45%', '#fff', 0], ['75%', '#000', 0], ['100%', '#000', .42]]);
    rg('volS', [['0%', '#fff', .3], ['50%', '#fff', 0], ['100%', '#000', .3]]);
    rg('puddle', [['0%', '#6f7f8a', .55], ['70%', '#4a5660', .35], ['100%', '#4a5660', 0]]);
    rg('oil', [['0%', '#050505', .7], ['100%', '#050505', 0]]);
    const lg = el('linearGradient', { id: 'carSh', x1: 0, y1: 0, x2: 1, y2: 0 }, d);
    for (const [o, c, op] of [['0%', '#000', .35], ['30%', '#fff', .12], ['55%', '#fff', 0], ['100%', '#000', .4]]) el('stop', { offset: o, 'stop-color': c, 'stop-opacity': op }, lg);
  })();
  const SPEC = { corpse: .82, treeR: [.5, .56] };
  const FISTS = { name: '맨손', type: 'melee', dmg: .35, range: .85, cd: .5, endu: 4, knock: .25, icon: 'fist' };
  const LOOT = {
    fridge:  { name: '냉장고', color: '#f4f4f4', pool: [['apple', 3], ['bread', 2], ['water', 3], ['soda', 3], ['can', 1]], min: 1, max: 3 },
    cabinet: { name: '조리대', color: '#a17a50', pool: [['can', 3], ['chips', 3], ['water', 1], ['bread', 1], ['pills', 1], ['tape', .8], ['glue', .6], ['pot', .7]], min: 0, max: 3 },
    drawer:  { name: '서랍', color: '#7a5a3a', pool: [['bandage', 3], ['knife', 1.2], ['ammo', .8], ['pills', 2], ['hammer', .8], ['nails', 1.6], ['tape', 1], ['screwdriver', .9], ['glue', .5]], min: 0, max: 3 },
    closet:  { name: '옷장', color: '#5a432d', pool: [['bandage', 2], ['bat', 1.5], ['pipe', .8], ['pistol', .35], ['ammo', 1], ['shirt', 2.5], ['cloth', 1]], min: 0, max: 3 },
  };
  const CAP = 15;          // 무게 한도
  // 들어서 옮길 수 있는 가구 (이름·무게)
  const FURN = { fridge: ['냉장고', 22], cabinet: ['조리대', 14], drawer: ['서랍장', 10], closet: ['옷장', 16], bed: ['침대', 18], sofa: ['소파', 16], table: ['식탁', 7], tv: ['TV', 6], toilet: ['변기', 9], shelf: ['책장', 14], bath: ['욕조', 30], sink: ['세면대', 8], washer: ['세탁기', 25], plant: ['화분', 4], desk: ['책상', 10] };
  const FURN_CONT = { fridge: 1, cabinet: 1, drawer: 1, closet: 1 };
  const nameOf = it => it.id === 'furn' ? (FURN[it.kind] || ['가구'])[0] : ITEMS[it.id].name;
  const DOOR_HP = 16, WIN_HP = 3, BOARD_HP = 10;
  const RING_C = 289;      // 버튼 링 둘레 (2π·46)

  /* ================= 상태 ================= */
  let G = null, M = null, AS = null;
  let VW = innerWidth, VH = innerHeight, ZOOM = 30;
  const view = $('view');
  const L = {};
  const input = { jx: 0, jy: 0, kx: 0, ky: 0, run: false, attackHeld: false };
  const keys = {};
  const V = { R: 12, near: 2.8, cone: 1.05 };
  let pathQueue = [];
  let clockT = 0;

  function mkItem(id, r) {
    r = r || rand;
    const d = ITEMS[id];
    const it = { uid: G.uid++, id };
    if (d.fresh) it.age = Math.floor(r() * d.fresh * .3); // 처음부터 조금 지난 음식도 있음
    if (d.dur) it.dur = Math.round(d.dur * (0.6 + r() * 0.4));
    if (STACK_ROLL[id]) { const [a, b] = STACK_ROLL[id]; it.n = a + Math.floor(r() * (b - a + 1)); }
    else if (d.stack) it.n = 1;
    if (d.uses) it.u = d.uses;
    return it;
  }
  function rollLoot(kind, r) {
    const tb = LOOT[kind];
    const n = tb.min + Math.floor(r() * (tb.max - tb.min + 1));
    const total = tb.pool.reduce((s, p) => s + p[1], 0);
    const out = [];
    for (let i = 0; i < n; i++) {
      let x = r() * total;
      for (const [id, w] of tb.pool) { x -= w; if (x <= 0) { out.push(mkItem(id, r)); break; } }
    }
    return out;
  }
  function baseState(seed) {
    return {
      seed, time: 9 * 60, kills: 0, uid: 1,
      p: { x: 0, y: 0, r: .3, face: 0, hp: 100, full: 80, hyd: 80, energy: 85, endu: 100,
        bleed: false, infected: false, infT: 0, inv: [], equip: null, cd: 0, cdMax: 1, noiseT: 0, atkT: 0, noiseR: 0 },
      zombies: [], corpses: [], fx: [], containers: [], searched: new Set(),
      running: false, paused: false, sleeping: false, openC: -1, sel: null,
      sk: { melee: { lv: 0, xp: 0 }, gun: { lv: 0, xp: 0 }, carp: { lv: 0, xp: 0 }, cook: { lv: 0, xp: 0 }, aid: { lv: 0, xp: 0 } },
      power: 1, powerOffAt: (6 + Math.floor(Math.random() * 4)) * 1440 + 9 * 60, sick: 0,
      rain: 0, rainTarget: 0, weatherNext: 9 * 60 + 120 + Math.random() * 300, thunderT: 30, flashT: 0, hitStop: 0,
      actions: [], placed: [], removed: new Set(), tab: 'bag', nearBench: -1, lastHour: 9, night: 0, saveT: 0, hudT: 0, dead: false, shake: 0, dmgInd: [], nearC: -1,
    };
  }

  /* ================= 월드 구성 ================= */
  function setupWorld(seed) {
    M = DT.generateMap(seed, { v: G.mapV || 1 });
    M.KA = (M.W * M.H) / 5184; // 예전 맵 대비 넓이 배율
    AS = new DT.AStar(M.W, M.H, M.moveBlock);
    const N = M.W * M.H;
    M.dynBlock = new Uint8Array(N); M.dynSight = new Uint8Array(N); AS.cost = new Uint8Array(N);
    // 문·창문 목록
    M.op = [];
    const T = DT.T, W = M.W;
    const wallish = k => { const v = M.t[k]; return v === T.WALL || v === T.WINDOW || v === T.DOOR; };
    for (let y = 1; y < M.H - 1; y++) for (let x = 1; x < W - 1; x++) {
      const k = y * W + x, v = M.t[k];
      if (v !== T.DOOR && v !== T.WINDOW) continue;
      const horiz = wallish(k - 1) && wallish(k + 1);
      const a = horiz ? M.t[k - W] : M.t[k - 1], b = horiz ? M.t[k + W] : M.t[k + 1];
      const interior = a === T.FLOOR && b === T.FLOOR;
      M.op.push({ k, x, y, type: v === T.DOOR ? 'door' : 'win', horiz, interior });
    }
    M.opAt = {}; for (const o of M.op) M.opAt[o.k] = o;
    pathQueue = [];
    L.mini = L.big = null; // 이전 판 지도 초기화 (새 게임 두 번째부터 멈추던 문제)
    initFog();
    buildScene();
    buildMaps();
    L._cx = null;
  }

  function runsPath(pred) {
    const W = M.W, H = M.H, t = M.t;
    let d = '';
    for (let y = 0; y < H; y++) {
      let x = 0;
      while (x < W) {
        if (pred(t[y * W + x])) {
          const s = x;
          while (x < W && pred(t[y * W + x]) && x - s < 12) x++; // 12칸마다 끊음 (조각별로 그리기 위해)
          d += `M${s} ${y}h${x - s}v1h${s - x}z`;
        } else x++;
      }
    }
    return d;
  }
  const circ = (cx, cy, r) => `M${(cx - r).toFixed(2)} ${cy.toFixed(2)}a${r.toFixed(2)} ${r.toFixed(2)} 0 1 0 ${(2 * r).toFixed(2)} 0a${r.toFixed(2)} ${r.toFixed(2)} 0 1 0 ${(-2 * r).toFixed(2)} 0`;

  function buildScene() {
    view.innerHTML = '';
    const T = DT.T, W = M.W, H = M.H;
    const defs = el('defs', {}, view);
    // ---------- 질감 패턴 ----------
    const pr = DT.rng(99);
    // 바닥은 별도 SVG(#ground)에 한 번만 그리고, 카메라 이동은 통째로 밀기만 함 (다시 그리지 않음 → 빠름)
    const gsv = $('ground'); gsv.innerHTML = '';
    gsv.setAttribute('viewBox', `0 0 ${W} ${H}`);
    const gdefs = el('defs', {}, gsv);
    L.gsv = gsv; L._gz = 0;
    const pattern = (id, w, h, fill, draw) => { const pt = el('pattern', { id, patternUnits: 'userSpaceOnUse', width: w, height: h }, gdefs); el('rect', { width: w, height: h, fill }, pt); draw(pt); };
    pattern('floorPat', 1, 1, '#5b4834', pt => {
      el('path', { d: 'M0 .25H1M0 .5H1M0 .75H1', stroke: '#3f3124', 'stroke-width': .025 }, pt);
      el('path', { d: 'M.62 0V.25M.18 .25V.5M.8 .5V.75M.4 .75V1', stroke: '#3f3124', 'stroke-width': .025 }, pt);
      el('path', { d: 'M.05 .12H.5M.3 .62H.75', stroke: '#6b5640', 'stroke-width': .03, opacity: .7 }, pt);
    });
    pattern('floorOak', 1, 1, '#7a6242', pt => {
      el('path', { d: 'M0 .2H1M0 .4H1M0 .6H1M0 .8H1', stroke: '#5a4630', 'stroke-width': .02 }, pt);
      el('path', { d: 'M.3 0V.2M.75 .2V.4M.15 .4V.6M.55 .6V.8M.9 .8V1', stroke: '#5a4630', 'stroke-width': .02 }, pt);
      el('path', { d: 'M.4 .1H.7M.05 .5H.3M.6 .9H.85', stroke: '#8c7452', 'stroke-width': .025, opacity: .7 }, pt);
      el('circle', { cx: .62, cy: .3, r: .02, fill: '#4a3a26' }, pt);
    });
    pattern('floorDark', 1, 1, '#3d2e21', pt => {
      el('path', { d: 'M.25 0V1M.5 0V1M.75 0V1', stroke: '#2a1f15', 'stroke-width': .025 }, pt);
      el('path', { d: 'M0 .4h.25M.25 .7h.25M.5 .2h.25M.75 .55h.25', stroke: '#2a1f15', 'stroke-width': .025 }, pt);
      el('path', { d: 'M.1 .1V.35M.6 .3V.6', stroke: '#4d3b2b', 'stroke-width': .03, opacity: .7 }, pt);
    });
    pattern('carpetPat', .5, .5, '#4e473c', pt => {
      let d = ''; for (let i = 0; i < 18; i++) d += circ(pr() * .5, pr() * .5, .012);
      el('path', { d, fill: '#5e5648' }, pt);
      let d2 = ''; for (let i = 0; i < 10; i++) d2 += circ(pr() * .5, pr() * .5, .01);
      el('path', { d: d2, fill: '#3a342c' }, pt);
    });
    pattern('checkPat', .5, .5, '#d4cfc2', pt => { el('rect', { width: .25, height: .25, fill: '#3a3a38' }, pt); el('rect', { x: .25, y: .25, width: .25, height: .25, fill: '#3a3a38' }, pt); });
    pattern('tilePat', .5, .5, '#8d8a80', pt => { el('path', { d: 'M0 0H.5M0 0V.5', stroke: '#6d6a62', 'stroke-width': .03 }, pt); el('rect', { x: .05, y: .05, width: .18, height: .18, fill: '#98958b' }, pt); });
    pattern('grassPat', 2, 2, '#29311f', pt => {
      let d = '', d2 = '';
      for (let i = 0; i < 26; i++) { const x = pr() * 2, y = pr() * 2; d += `M${x.toFixed(2)} ${y.toFixed(2)}l${((pr() - .5) * .12).toFixed(2)} -.14`; }
      for (let i = 0; i < 14; i++) { const x = pr() * 2, y = pr() * 2; d2 += `M${x.toFixed(2)} ${y.toFixed(2)}l${((pr() - .5) * .1).toFixed(2)} -.12`; }
      el('path', { d, stroke: '#3a4629', 'stroke-width': .035, 'stroke-linecap': 'round' }, pt);
      el('path', { d: d2, stroke: '#1d2415', 'stroke-width': .04, 'stroke-linecap': 'round' }, pt);
    });
    pattern('asphPat', 1.5, 1.5, '#1b1b1a', pt => {
      let d = '';
      for (let i = 0; i < 22; i++) d += circ(pr() * 1.5, pr() * 1.5, .012 + pr() * .02);
      el('path', { d, fill: '#2b2b29' }, pt);
      let d2 = ''; for (let i = 0; i < 10; i++) d2 += circ(pr() * 1.5, pr() * 1.5, .015);
      el('path', { d: d2, fill: '#0f0f0e' }, pt);
    });
    pattern('walkPat', 1, 1, '#454541', pt => { el('path', { d: 'M0 0H1M0 0V1', stroke: '#2e2e2b', 'stroke-width': .045 }, pt); el('path', { d: 'M.2 .3l.1 .05M.6 .7l.12-.04', stroke: '#52524d', 'stroke-width': .03 }, pt); });

    L.world = el('g', {}, view);
    const gr = el('g', { 'shape-rendering': 'crispEdges' }, gsv);
    const rr = DT.rng(M.W * 7 + 13);
    // 잔디 + 얼룩
    el('rect', { x: 0, y: 0, width: W, height: H, fill: 'url(#grassPat)' }, gr);
    let dp = '', dp2 = '';
    for (let i = 0; i < 380 * M.KA; i++) dp += circ(rr() * W, rr() * H, .3 + rr() * .9);
    for (let i = 0; i < 160 * M.KA; i++) dp2 += circ(rr() * W, rr() * H, .2 + rr() * .5);
    el('path', { d: dp, fill: '#1f2618', opacity: .8, 'shape-rendering': 'auto' }, gr);
    el('path', { d: dp2, fill: '#35402a', opacity: .5, 'shape-rendering': 'auto' }, gr);
    // 도로 (폐차 칸 포함)
    el('path', { d: runsPath(v => v === T.ROAD || v === T.CAR), fill: 'url(#asphPat)' }, gr);
    let crack = '', patch = '';
    for (let i = 0; i < 220 * M.KA; i++) {
      const x = 1 + rr() * (W - 2), y = 1 + rr() * (H - 2);
      const tt = M.t[Math.floor(y) * W + Math.floor(x)];
      if (tt !== T.ROAD) continue;
      if (rr() < .25) { patch += `M${x.toFixed(2)} ${y.toFixed(2)}h${(.3 + rr() * .6).toFixed(2)}v${(.2 + rr() * .4).toFixed(2)}h${-(.3 + rr() * .5).toFixed(2)}z`; continue; }
      crack += `M${x.toFixed(2)} ${y.toFixed(2)}l${((rr() - .5) * .9).toFixed(2)} ${((rr() - .5) * .9).toFixed(2)}l${((rr() - .5) * .7).toFixed(2)} ${((rr() - .5) * .7).toFixed(2)}l${((rr() - .5) * .5).toFixed(2)} ${((rr() - .5) * .5).toFixed(2)}`;
    }
    el('path', { d: patch, fill: '#222220', opacity: .8 }, gr);
    el('path', { d: crack, stroke: '#0b0b0a', 'stroke-width': .045, fill: 'none', 'shape-rendering': 'auto' }, gr);
    el('path', { d: runsPath(v => v === T.WALK), fill: 'url(#walkPat)' }, gr);
    // 연석(인도 가장자리)
    let curb = '';
    for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
      if (M.t[y * W + x] !== T.WALK) continue;
      const rd = v => v === T.ROAD || v === T.CAR;
      if (rd(M.t[y * W + x + 1])) curb += `M${x + .93} ${y}h.07v1h-.07z`;
      if (rd(M.t[y * W + x - 1])) curb += `M${x} ${y}h.07v1h-.07z`;
      if (rd(M.t[(y + 1) * W + x])) curb += `M${x} ${y + .93}h1v.07h-1z`;
      if (rd(M.t[(y - 1) * W + x])) curb += `M${x} ${y}h1v.07h-1z`;
    }
    el('path', { d: curb, fill: '#6a6a64' }, gr);
    // 차선 + 횡단보도
    let lane = '';
    const RD = M.roads;
    for (const p of RD) lane += `M${p + 1.5} 1V${H - 1}M1 ${p + 1.5}H${W - 1}`;
    el('path', { d: lane, stroke: '#c9c3a8', 'stroke-width': .07, 'stroke-dasharray': '.7 .9', fill: 'none', opacity: .55 }, gr);
    // 맨홀
    let mh = '';
    for (let i = 0; i < 18 * M.KA; i++) { const p0 = RD[(rr() * RD.length) | 0], along = 3 + rr() * (W - 6); const vert = rr() < .5; const cx = vert ? p0 + 1.5 : along, cy = vert ? along : p0 + 1.5; if (M.t[Math.floor(cy) * W + Math.floor(cx)] === T.ROAD) mh += circ(cx, cy, .28); }
    el('path', { d: mh, fill: '#2d2d2a', stroke: '#0e0e0d', 'stroke-width': .05, 'shape-rendering': 'auto' }, gr);
    // 실내 바닥: 대부분 나무, 일부 집은 타일
    el('path', { d: runsPath(v => v === T.FLOOR || v === T.DOOR), fill: 'url(#floorPat)' }, gr);
    const hr = DT.rng(M.W * 31 + 7), fr = DT.rng(M.W * 17 + 3);
    const FLOORS = ['floorPat', 'floorPat', 'floorOak', 'floorDark', 'carpetPat'];
    L.houseFloor = [];
    for (const h of M.houses) {
      const fp = FLOORS[(fr() * FLOORS.length) | 0];
      h.floor = fp;
      if (fp !== 'floorPat') el('rect', { x: h.x + 1, y: h.y + 1, width: h.w - 2, height: h.h - 2, fill: `url(#${fp})` }, gr);
      if (fr() < .35) { // 부엌 체크무늬 바닥 (냉장고 주변)
        const c0 = M.containers[h.containers[0]];
        if (c0) el('rect', { x: Math.max(h.x + 1, c0.x - 1), y: Math.max(h.y + 1, c0.y - 1), width: 2.5, height: 2.5, fill: 'url(#checkPat)', opacity: .9 }, gr);
      }
    }
    for (const h of M.houses) {
      const r = hr();
      if (r < .3) el('rect', { x: h.x + 1, y: h.y + 1, width: Math.min(3, h.w - 2), height: h.h - 2, fill: 'url(#tilePat)', opacity: .9 }, gr);
      else if (r < .65) { // 러그
        const rw = 1.6 + hr() * 1.4, rh = 1.2 + hr() * 1.2, rx = h.x + 1.3 + hr() * Math.max(.1, h.w - 3 - rw), ry = h.y + 1.3 + hr() * Math.max(.1, h.h - 3 - rh);
        const cols = ['#5a2626', '#2b3a4a', '#4a4a2a', '#3d2b3d'];
        const c = cols[(hr() * cols.length) | 0];
        el('rect', { x: rx, y: ry, width: rw, height: rh, fill: c, stroke: '#1a1a1a', 'stroke-width': .04, opacity: .9 }, gr);
        el('rect', { x: rx + .12, y: ry + .12, width: rw - .24, height: rh - .24, fill: 'none', stroke: '#c9b98f', 'stroke-width': .04, opacity: .5 }, gr);
      }
    }
    // 벽 밑 그늘 (실내 바닥이 벽과 만나는 곳을 어둡게 → 깊이감)
    let ao = '';
    for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
      if (M.t[y * W + x] !== T.FLOOR) continue;
      const w = (xx, yy) => { const v = M.t[yy * W + xx]; return v === T.WALL || v === T.WINDOW; };
      if (w(x, y - 1)) ao += `M${x} ${y}h1v.16h-1z`;
      if (w(x - 1, y)) ao += `M${x} ${y}h.16v1h-.16z`;
      if (w(x, y + 1)) ao += `M${x} ${y + .92}h1v.08h-1z`;
      if (w(x + 1, y)) ao += `M${x + .92} ${y}h.08v1h-.08z`;
    }
    el('path', { d: ao, fill: '#000', opacity: .28 }, gr);
    // 벽: 그림자 → 벽면 → 윗면 하이라이트 → 외곽선
    const isW = v => v === T.WALL || v === T.WINDOW;
    const wallD = runsPath(isW);
    el('path', { d: wallD, fill: '#000', transform: 'translate(.12 .14)', opacity: .5 }, gr);
    el('path', { d: wallD, fill: '#cfc8b8' }, gr);
    el('path', { d: wallD, fill: '#e2dccf', transform: 'translate(-.04 -.05)' }, gr);
    let wstain = '';
    for (let i = 0; i < 500 * M.KA; i++) { const x = 1 + rr() * (W - 2), y = 1 + rr() * (H - 2); if (isW(M.t[Math.floor(y) * W + Math.floor(x)])) wstain += circ(x, y, .04 + rr() * .1); }
    el('path', { d: wstain, fill: '#8a8272', opacity: .35, 'shape-rendering': 'auto' }, gr); // 벽 얼룩
    let edge = '';
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (!isW(M.t[y * W + x])) continue;
      const o = (xx, yy) => xx < 0 || yy < 0 || xx >= W || yy >= H || !isW(M.t[yy * W + xx]);
      if (o(x, y - 1)) edge += `M${x} ${y}h1`;
      if (o(x, y + 1)) edge += `M${x} ${y + 1}h1`;
      if (o(x - 1, y)) edge += `M${x} ${y}v1`;
      if (o(x + 1, y)) edge += `M${x + 1} ${y}v1`;
    }
    el('path', { d: edge, stroke: '#171614', 'stroke-width': .06, fill: 'none' }, gr);
    // 창문(유리+반사), 문(문짝)
    let win = '', shine = '', frame = '', door = '', leaf = '';
    const isWallish = (x, y) => { const v = M.t[y * W + x]; return v === T.WALL || v === T.WINDOW || v === T.DOOR; };
    for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
      const v = M.t[y * W + x];
      if (v !== T.WINDOW && v !== T.DOOR) continue;
      const horiz = isWallish(x - 1, y) && isWallish(x + 1, y);
      if (v === T.WINDOW) {
        if (horiz) { win += `M${x + .06} ${y + .34}h.88v.32h-.88z`; shine += `M${x + .18} ${y + .44}h.35`; frame += `M${x + .5} ${y + .34}v.32`; }
        else { win += `M${x + .34} ${y + .06}h.32v.88h-.32z`; shine += `M${x + .44} ${y + .18}v.35`; frame += `M${x + .34} ${y + .5}h.32`; }
      } else {
        const inDown = M.t[(y + 1) * W + x] === T.FLOOR, inRight = M.t[y * W + x + 1] === T.FLOOR;
        if (horiz) { door += `M${x} ${y}h.1v1h-.1zM${x + .9} ${y}h.1v1h-.1z`; leaf += inDown ? `M${x + .1} ${y + .9}h.1v.8h-.1z` : `M${x + .1} ${y - .7}h.1v.8h-.1z`; }
        else { door += `M${x} ${y}h1v.1h-1zM${x} ${y + .9}h1v.1h-1z`; leaf += inRight ? `M${x + .9} ${y + .1}h.8v.1h-.8z` : `M${x - .7} ${y + .1}h.8v.1h-.8z`; }
      }
    }
    el('path', { d: door, fill: '#6e4524' }, gr);
    L.gOp = el('g', { 'shape-rendering': 'auto' }, gr);
    L.opEl = {};
    L.gCover = el('g', {}, gr); // 들어낸 실내가구 자리 덮개
    // 폐차
    const objG = el('g', {}, gr), objC = chunker(objG);
    for (const c of (M.cars || [])) drawCar(objC(c.x, c.y), c);
    for (const d of (M.decor || [])) drawDecor(objC(d.x, d.y), d);
    // 가로등 (교차로 모서리 인도)
    L.lampPos = [];
    for (const px of RD) for (const py of RD) for (const [ox, oy] of [[-1, -1], [3, 3]]) {
      const x = px + ox, y = py + oy;
      if (x < 1 || y < 1 || x >= W - 1 || y >= H - 1 || M.t[y * W + x] !== T.WALK) continue;
      L.lampPos.push([x + .5, y + .5]);
    }
    let pole = '';
    for (const [x, y] of L.lampPos) pole += circ(x, y, .16);
    el('path', { d: pole, fill: '#2b2b28', stroke: '#0c0c0b', 'stroke-width': .05, 'shape-rendering': 'auto' }, gr);
    let bulb = ''; for (const [x, y] of L.lampPos) bulb += circ(x, y, .07);
    el('path', { d: bulb, fill: '#e8d9a0', 'shape-rendering': 'auto' }, gr);
    // 쓰레기·종이·핏자국 (바닥 장식)
    let trash = '', paper = '', blood = '';
    for (let i = 0; i < 260 * M.KA; i++) {
      const x = 1 + rr() * (W - 2), y = 1 + rr() * (H - 2);
      const tt = M.t[Math.floor(y) * W + Math.floor(x)];
      const k = rr();
      if ((tt === T.WALK || tt === T.GRASS) && k < .3) { trash += circ(x, y, .16 + rr() * .08) + circ(x + .18, y + .06, .13); }
      else if (tt !== T.WALL && tt !== T.TREE && tt !== T.CAR && k < .75) { const a = rr() * 3; paper += `M${x.toFixed(2)} ${y.toFixed(2)}l${(Math.cos(a) * .22).toFixed(2)} ${(Math.sin(a) * .22).toFixed(2)}l${(-Math.sin(a) * .16).toFixed(2)} ${(Math.cos(a) * .16).toFixed(2)}l${(-Math.cos(a) * .22).toFixed(2)} ${(-Math.sin(a) * .22).toFixed(2)}z`; }
      else if ((tt === T.ROAD || tt === T.WALK || tt === T.FLOOR) && k < .9) { blood += circ(x, y, .1 + rr() * .25); if (rr() < .5) blood += `M${x.toFixed(2)} ${y.toFixed(2)}l${((rr() - .5) * 2).toFixed(2)} ${((rr() - .5) * 2).toFixed(2)}`; }
    }
    el('path', { d: trash, fill: '#101410', stroke: '#050605', 'stroke-width': .03, 'shape-rendering': 'auto' }, gr);
    el('path', { d: paper, fill: '#b9b3a0', opacity: .55 }, gr);
    el('path', { d: blood, fill: '#3a0508', stroke: '#3a0508', 'stroke-width': .12, 'stroke-linecap': 'round', opacity: .7, 'shape-rendering': 'auto' }, gr);
    drawProps(gr);
    // 나무: 그림자 + 3겹 잎 + 하이라이트
    let tsh = '', t1 = '', t2 = '', t3 = '';
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (M.t[y * W + x] !== T.TREE) continue;
      const r = SPEC.treeR[0] + rr() * (SPEC.treeR[1] - SPEC.treeR[0]), cx = x + .5 + (rr() - .5) * .12, cy = y + .5 + (rr() - .5) * .12;
      tsh += circ(cx + .16, cy + .2, r);
      t1 += circ(cx, cy, r);
      t2 += circ(cx - r * .22, cy - r * .18, r * .62) + circ(cx + r * .28, cy + r * .1, r * .5);
      t3 += circ(cx - r * .32, cy - r * .3, r * .26);
    }
    const tg = el('g', { 'shape-rendering': 'auto' }, gr);
    el('path', { d: tsh, fill: '#000', opacity: .45 }, tg);
    el('path', { d: t1, fill: '#15200f', stroke: '#0a0f07', 'stroke-width': .05 }, tg);
    el('path', { d: t2, fill: '#223219' }, tg);
    el('path', { d: t3, fill: '#35492a', opacity: .8 }, tg);
    let tdot = '', thl = '';
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (M.t[y * W + x] === T.TREE) {
      for (let j = 0; j < 7; j++) { const a = rr() * 6.28, d = rr() * .42; tdot += circ(x + .5 + Math.cos(a) * d, y + .5 + Math.sin(a) * d, .04 + rr() * .04); }
      thl += `M${x + .18} ${y + .32}a.36 .36 0 0 1 .32 -.22`;
    }
    el('path', { d: tdot, fill: '#0c1508', opacity: .7 }, tg);
    el('path', { d: thl, stroke: '#4e6a38', 'stroke-width': .05, fill: 'none', 'stroke-linecap': 'round', opacity: .7 }, tg);

    chunkGround(gsv);
    L.decals = el('g', {}, L.world);
    L.containers = el('g', {}, L.world);
    L.cont = M.containers.map(c => {
      const g = el('g', { transform: `translate(${c.x} ${c.y})` }, L.containers);
      drawFurniture(g, c.kind);
      const x = el('path', { d: 'M.3 .3L.7 .7M.7 .3L.3 .7', stroke: '#c8141f', 'stroke-width': .07, 'stroke-linecap': 'round', opacity: 0 }, g);
      return { g, x };
    });
    L.placed = el('g', {}, L.world);
    L.hl = el('rect', { x: 0, y: 0, width: 1.1, height: 1.1, fill: 'none', stroke: '#e9e3d2', 'stroke-width': .07, 'stroke-dasharray': '.22 .12', opacity: 0 }, L.world);
    L.zombies = el('g', {}, L.world);
    L.noise = el('circle', { cx: 0, cy: 0, r: 1, fill: 'none', stroke: '#e9e3d2', 'stroke-width': .045, 'stroke-dasharray': '.3 .22', opacity: 0 }, L.world);
    L.player = el('g', {}, L.world);
    L.fx = el('g', {}, L.world);
    L.dark = el('path', { fill: '#000', 'fill-rule': 'evenodd' }, L.world);
    const ld = el('radialGradient', { id: 'lampGlow' }, defs);
    el('stop', { offset: '0%', 'stop-color': '#ffd98a', 'stop-opacity': .38 }, ld);
    el('stop', { offset: '60%', 'stop-color': '#ffb85a', 'stop-opacity': .12 }, ld);
    el('stop', { offset: '100%', 'stop-color': '#ffb85a', 'stop-opacity': 0 }, ld);
    L.lamps = el('g', { opacity: 0, 'pointer-events': 'none' }, L.world);
    L.fires = el('g', { opacity: 0, 'pointer-events': 'none' }, L.world);
    L.lampEls = L.lampPos.map(([x, y]) => ({ x, y, el: el('circle', { cx: x, cy: y, r: 3.2, fill: 'url(#lampGlow)' }, L.lamps) }));
    L.flash = el('rect', { x: -10, y: -10, width: M.W + 20, height: M.H + 20, fill: '#dfe8ff', opacity: 0, 'pointer-events': 'none' }, L.world);
    // 화면 고정 레이어
    L.tint = $('tint'); L.vign = null;
    L.threat = el('g', {}, view);
    L.arrows = [];
    for (let i = 0; i < 8; i++) {
      const a = el('path', { d: 'M13 0L-4 -9L0 0L-4 9Z', fill: '#c8141f', stroke: '#000', 'stroke-width': 1.5, opacity: 0 }, L.threat);
      L.arrows.push(a);
    }
    L.dmg = [];
    for (let i = 0; i < 4; i++) L.dmg.push(el('path', { d: '', fill: '#c8141f', opacity: 0 }, L.threat));
    makePlayerG();
    for (let i = 0; i < M.containers.length; i++) refreshContainer(i);
  }

  // 미니맵 + 전체지도
  // 12x12칸 조각 그룹 (화면 밖 조각은 통째로 건너뛰고 그림)
  function chunker(parent) {
    const m = new Map();
    return (x, y) => { const k = ((x / 12) | 0) + ',' + ((y / 12) | 0); let g = m.get(k); if (!g) m.set(k, g = el('g', {}, parent)); return g; };
  }
  // 바닥 그림의 큰 경로(맵 전체에 걸친 것)를 12x12칸 조각으로 나눔
  // → 화면에 새로 들어오는 부분만 그리면 돼서 큰 맵에서도 빠름
  function chunkGround(root) {
    const CH = 12, re = /^M\s*(-?\d*\.?\d+)[\s,]*(-?\d*\.?\d+)/;
    const paths = [...root.querySelectorAll('path')].filter(p => !p.closest('pattern,defs') && (p.getAttribute('d') || '').length > 1500);
    for (const p of paths) {
      const parts = p.getAttribute('d').split(/(?=M)/), buckets = new Map();
      for (const s of parts) {
        const m = re.exec(s); if (!m) continue;
        const k = Math.floor(+m[1] / CH) + ',' + Math.floor(+m[2] / CH);
        let b = buckets.get(k); if (!b) buckets.set(k, b = []);
        b.push(s);
      }
      if (buckets.size < 2) continue;
      const tr = p.getAttribute('transform');
      const frag = tr ? el('g', { transform: tr }) : document.createDocumentFragment(); // 위치 변환은 묶음에 한 번만
      for (const arr of buckets.values()) { const c = p.cloneNode(false); c.removeAttribute('transform'); c.setAttribute('d', arr.join('')); frag.appendChild(c); }
      p.parentNode.insertBefore(frag, p); p.remove();
    }
  }
  /* ================= 안개 (시야 기억) ================= */
  // 지금 보이는 곳 = 선명 / 방금 본 곳 = 어둡게 / 오래전에 본 곳·안 가본 곳 = 안개로 가려짐
  const FOG = { hold: 1.2, fade: 10, max: .97, col: [22, 26, 30] };
  function initFog() {
    const N = M.W * M.H;
    G.seen = new Float32Array(N).fill(-1e9);
    if (!G.exp || G.exp.length !== N) G.exp = new Uint8Array(N);
    G.fogT = 0; G.expDirty = true; L.visList = [];
    L.fogSmall = document.createElement('canvas');
    L.fogCv = $('fog'); L.fogCtx = L.fogCv.getContext('2d');
    if (!L.fogTex) { // 안개 결 (흐릿한 얼룩 텍스처, 천천히 흘러감)
      const t = document.createElement('canvas'); t.width = t.height = 256;
      const x = t.getContext('2d'), r = DT.rng(4242);
      for (let i = 0; i < 70; i++) {
        const cx = r() * 256, cy = r() * 256, rad = 20 + r() * 60, a = .05 + r() * .09;
        for (const [ox, oy] of [[0, 0], [256, 0], [-256, 0], [0, 256], [0, -256]]) {
          const g = x.createRadialGradient(cx + ox, cy + oy, 0, cx + ox, cy + oy, rad);
          g.addColorStop(0, `rgba(120,132,140,${a})`); g.addColorStop(1, 'rgba(120,132,140,0)');
          x.fillStyle = g; x.fillRect(cx + ox - rad, cy + oy - rad, rad * 2, rad * 2);
        }
      }
      L.fogTex = t;
    }
  }
  function encExp() {
    if (!G.exp) return null;
    let out = '', run = 0, cur = 0; // 연속 길이 인코딩: "길이,길이,..." (0부터 시작)
    const a = [];
    for (let i = 0; i < G.exp.length; i++) { if (G.exp[i] === cur) run++; else { a.push(run); run = 1; cur = G.exp[i]; } }
    a.push(run); out = a.join(',');
    return out;
  }
  function decExp(str) {
    const N = M.W * M.H;
    G.exp = new Uint8Array(N);
    if (!str) return;
    let i = 0, cur = 0;
    for (const r of String(str).split(',')) { const n = +r; if (n > 0) G.exp.fill(cur, i, Math.min(N, i + n)); i += n; cur ^= 1; }
    G.expDirty = true;
  }
  function computeVisible() {
    const p = G.p, W = M.W, list = [];
    if (V.R <= 0) { L.visList = list; return; }
    const R = Math.ceil(V.R) + 1, px = Math.floor(p.x), py = Math.floor(p.y);
    const mark = new Set();
    for (let y = Math.max(0, py - R); y <= Math.min(M.H - 1, py + R); y++) for (let x = Math.max(0, px - R); x <= Math.min(W - 1, px + R); x++) {
      if (inVision(x + .5, y + .5)) { mark.add(y * W + x); continue; }
      // 칸 모서리 쪽이 보이면 보이는 칸으로 (벽 옆 칸이 계속 안개로 남지 않게)
      const ex = clamp(p.x, x + .15, x + .85), ey = clamp(p.y, y + .15, y + .85);
      if (inVision(ex, ey)) mark.add(y * W + x);
    }
    // 보이는 칸 옆의 벽·나무도 보이는 걸로
    for (const k of [...mark]) {
      const x = k % W, y = (k / W) | 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= M.H) continue;
        const n = ny * W + nx; if (M.sightBlock[n] || M.dynSight[n] || M.t[n] === DT.T.WINDOW || M.t[n] === DT.T.DOOR) mark.add(n);
      }
    }
    for (const k of mark) list.push(k);
    L.visList = list;
  }
  function renderFog(dt, camX, camY) {
    if (window.DT_NOFOG) return;
    G.fogT += dt;
    const now = G.fogT, S = G.seen, E = G.exp;
    for (const k of L.visList) { S[k] = now; if (!E[k]) { E[k] = 1; G.expDirty = true; } }
    const hw = VW / 2 / ZOOM + 2, hh = VH / ZOOM + 2, p = G.p;
    const x0 = Math.floor(-camX / ZOOM) - 1, y0 = Math.floor(-camY / ZOOM) - 1;
    const cw = Math.ceil(VW / ZOOM) + 3, ch = Math.ceil(VH / ZOOM) + 3;
    const sm = L.fogSmall, cv = L.fogCv;
    const moved = L._fx0 !== x0 || L._fy0 !== y0 || L._fz !== ZOOM;
    L._ff = (L._ff || 0) + 1;
    if (moved || L._ff % 4 === 0) { // 안개 그림은 4프레임마다 (또는 칸이 바뀔 때) 다시 그림
      L._fx0 = x0; L._fy0 = y0; L._fz = ZOOM;
      if (sm.width !== cw || sm.height !== ch) { sm.width = cw; sm.height = ch; L.fogImg = sm.getContext('2d').createImageData(cw, ch); }
      const nk = 1 - .65 * (G.night || 0), img = L.fogImg, d = img.data, cr = FOG.col[0] * nk, cg = FOG.col[1] * nk, cb = FOG.col[2] * nk, W = M.W;
      for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) {
        const tx = x0 + x, ty = y0 + y, o = (y * cw + x) * 4;
        let a;
        if (tx < 0 || ty < 0 || tx >= W || ty >= M.H) a = 1;
        else {
          const age = now - S[ty * W + tx];
          a = age <= .15 ? 0 : age < FOG.hold ? .18 : Math.min(FOG.max, .18 + (age - FOG.hold) / FOG.fade * (FOG.max - .18));
        }
        d[o] = cr; d[o + 1] = cg; d[o + 2] = cb; d[o + 3] = a * 255;
      }
      sm.getContext('2d').putImageData(img, 0, 0);
      const PW = Math.round(cw * ZOOM), PH = Math.round(ch * ZOOM);
      if (cv.width !== PW || cv.height !== PH) { cv.width = PW; cv.height = PH; cv.style.width = PW + 'px'; cv.style.height = PH + 'px'; L.fogPat = null; }
      const ctx = L.fogCtx;
      ctx.clearRect(0, 0, PW, PH);
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(sm, 0, 0, cw, ch, 0, 0, PW, PH);
      // 안개 결: 안개 있는 곳에만, 월드에 붙어서 천천히 흐름
      if (!L.fogPat) L.fogPat = ctx.createPattern(L.fogTex, 'repeat');
      ctx.save();
      ctx.globalCompositeOperation = 'source-atop'; ctx.globalAlpha = nk;
      const sc = ZOOM / 18, T = 256 * sc;
      const ox = ((-(x0 * ZOOM) + now * 6) % T + T) % T - T, oy = ((-(y0 * ZOOM) + now * 2.5) % T + T) % T - T;
      ctx.translate(ox, oy); ctx.scale(sc, sc);
      ctx.fillStyle = L.fogPat; ctx.fillRect(0, 0, PW / sc + 512, PH / sc + 512);
      ctx.restore();
    }
    cv.style.transform = `translate3d(${(camX + x0 * ZOOM).toFixed(1)}px,${(camY + y0 * ZOOM).toFixed(1)}px,0)`;
    // 지도: 가본 곳만 보이게 (1초마다)
    L.expT = (L.expT || 0) - dt;
    if (G.expDirty && L.expT <= 0) { L.expT = 1; G.expDirty = false; updateMapMask(); }
  }
  function updateMapMask() {
    if (!L.mini) return;
    const W = M.W, H = M.H;
    const c = L.maskCv || (L.maskCv = document.createElement('canvas'));
    if (c.width !== W) { c.width = W; c.height = H; }
    const x = c.getContext('2d'), img = x.createImageData(W, H), d = img.data;
    for (let i = 0; i < W * H; i++) { const o = i * 4; d[o] = 11; d[o + 1] = 12; d[o + 2] = 10; d[o + 3] = G.exp[i] ? 0 : 255; }
    x.putImageData(img, 0, 0);
    const url = c.toDataURL();
    for (const m of [L.mini, L.big]) m.mask.setAttribute('href', url);
  }
  // 멀리 있는 가구·가로등 불빛은 그리지 않음 (큰 맵 성능)
  function cullWorld(force) {
    const p = G.p;
    if (!force && L._cx != null && Math.abs(p.x - L._cx) + Math.abs(p.y - L._cy) < 3) return;
    L._cx = p.x; L._cy = p.y;
    const RX = 20, RY = 16;
    const near = (x, y) => Math.abs(x - p.x) < RX && Math.abs(y - p.y) < RY;
    for (let i = 0; i < L.cont.length; i++) { const c = M.containers[i], on = near(c.x, c.y) && !G.removed.has(i); const g = L.cont[i].g; if (g._on !== on) { g._on = on; g.style.display = on ? '' : 'none'; } }
    for (const lp of L.lampEls) { const on = near(lp.x, lp.y); if (lp.el._on !== on) { lp.el._on = on; lp.el.style.display = on ? '' : 'none'; } }
    for (const c of G.corpses) { const on = near(c.x, c.y); if (c.g._on !== on) { c.g._on = on; c.g.style.display = on ? '' : 'none'; } }
  }
  function buildMaps() {
    const T = DT.T;
    const make = (svg, big) => {
      svg.innerHTML = '';
      el('rect', { x: 0, y: 0, width: M.W, height: M.H, fill: '#171a13' }, svg);
      el('path', { d: runsPath(v => v === T.ROAD), fill: '#3e3e3a' }, svg);
      el('path', { d: runsPath(v => v === T.WALK), fill: '#2b2c28' }, svg);
      el('path', { d: runsPath(v => v === T.FLOOR || v === T.DOOR), fill: '#5a4834' }, svg);
      el('path', { d: runsPath(v => v === T.WALL || v === T.WINDOW), fill: '#d8d2c1' }, svg);
      const dots = M.containers.map(c => el('rect', { x: c.x + .2, y: c.y + .2, width: .6, height: .6, fill: '#fff' }, svg));
      const mask = el('image', { x: 0, y: 0, width: M.W, height: M.H, preserveAspectRatio: 'none' }, svg); // 안 가본 곳 가림
      const pm = el('g', {}, svg);
      if (big) el('circle', { r: 2.2, fill: 'none', stroke: '#c8141f', 'stroke-width': .35 }, pm);
      el('path', { d: 'M1.6 0L-1 -1.1L-.4 0L-1 1.1Z', fill: '#c8141f', stroke: '#000', 'stroke-width': .2, transform: big ? 'scale(1.1)' : 'scale(.9)' }, pm);
      return { dots, pm, mask };
    };
    L.mini = make($('mini'), false);
    L.big = make($('bigmapSvg'), true);
    if (G.exp) updateMapMask();
  }
  function updateMaps() {
    const p = G.p;
    const t = `translate(${p.x.toFixed(2)} ${p.y.toFixed(2)}) rotate(${(p.face * 180 / Math.PI).toFixed(0)})`;
    L.mini.pm.setAttribute('transform', t);
    L.big.pm.setAttribute('transform', t + ` scale(${((L._bigSize || 72) / 72).toFixed(2)})`);
    $('mini').setAttribute('viewBox', `${(p.x - 14).toFixed(2)} ${(p.y - 14).toFixed(2)} 28 28`);
  }
  // 큰 지도: 가본 곳 범위만 확대해서 보여줌 (최소 40칸) — 지도를 열 때 한 번 계산
  function fitBigmap() {
    const p = G.p;
    {
      let x0 = p.x, y0 = p.y, x1 = p.x, y1 = p.y;
      const W = M.W, E = G.exp;
      if (E) for (let i = 0; i < E.length; i++) if (E[i]) { const x = i % W, y = (i / W) | 0; if (x < x0) x0 = x; if (x + 1 > x1) x1 = x + 1; if (y < y0) y0 = y; if (y + 1 > y1) y1 = y + 1; }
      const size = Math.min(M.W, Math.max(40, x1 - x0 + 8, y1 - y0 + 8));
      const cx = clamp((x0 + x1) / 2, size / 2, M.W - size / 2), cy = clamp((y0 + y1) / 2, size / 2, M.H - size / 2);
      $('bigmapSvg').setAttribute('viewBox', `${(cx - size / 2).toFixed(1)} ${(cy - size / 2).toFixed(1)} ${size.toFixed(1)} ${size.toFixed(1)}`);
      L._bigSize = size;
    }
    updateMaps();
  }
  function refreshContainer(i) {
    if (!G || !L.cont) return;
    if (isPlacedC(i)) return;
    if (isCorpse(i)) { const c = corpseOf(i); if (c) c.g.setAttribute('opacity', c.searched && !c.items.length ? .55 : 1); return; }
    if (G.removed.has(i)) {
      L.cont[i].g.style.display = 'none';
      for (const m of [L.mini, L.big]) if (m) m.dots[i].style.display = 'none';
      return;
    }
    const searched = G.searched.has(i), empty = searched && (!G.containers[i] || !G.containers[i].length);
    L.cont[i].g.setAttribute('opacity', empty ? .45 : 1);
    L.cont[i].x.setAttribute('opacity', empty ? .9 : 0);
    for (const m of [L.mini, L.big]) if (m) m.dots[i].setAttribute('fill', searched ? (empty ? '#4a4a45' : '#b9b3a2') : '#ffffff');
  }

  /* ================= 그림: 문·창문 (상태별) ================= */
  function drawOpening(o) {
    if (!L.gOp) return;
    const s = G.ds[o.k];
    let g = L.opEl[o.k];
    if (g) g.innerHTML = ''; else { g = el('g', {}, L.gOp); L.opEl[o.k] = g; }
    // 가로벽 기준 좌표로 그리고, 세로벽이면 90도 돌린 좌표로 바꿔서 바로 그림 (위치 변환 없음 → 빠름)
    const mp = o.horiz ? (x, y) => [o.x + x, o.y + y] : (x, y) => [o.x + 1 - y, o.y + x];
    const f3 = v => +v.toFixed(3);
    const R = (x, y, w, h, a) => { const [p1x, p1y] = mp(x, y), [p2x, p2y] = mp(x + w, y + h); const A = { x: f3(Math.min(p1x, p2x)), y: f3(Math.min(p1y, p2y)), width: f3(Math.abs(p2x - p1x)), height: f3(Math.abs(p2y - p1y)) }; return el('rect', Object.assign(A, a), g); };
    const P = (lines, a, close) => el('path', Object.assign({ d: lines.map(pts => 'M' + pts.map(([x, y]) => mp(x, y).map(f3).join(' ')).join('L') + (close ? 'Z' : '')).join('') }, a), g);
    const C = (cx, cy, r, a) => { const [x, y] = mp(cx, cy); return el('circle', Object.assign({ cx: f3(x), cy: f3(y), r }, a), g); };
    if (o.type === 'door') {
      if (s.br) P([[[.1, .45], [.28, .51], [.18, .59]], [[.72, .5], [.92, .45], [.86, .57]]], { fill: '#6e4524' }, true);
      else if (s.o) R(.1, .9, .1, .8, { fill: '#8a5a2e', stroke: '#2a1a0c', 'stroke-width': .025 });
      else {
        R(.1, .36, .8, .28, { fill: '#8a5a2e', stroke: '#2a1a0c', 'stroke-width': .035 });
        P([[[.14, .5], [.86, .5]]], { stroke: '#6e4524', 'stroke-width': .03 });
        C(.78, .5, .045, { fill: '#d0c49a' });
      }
    } else {
      if (s.br) {
        R(.06, .36, .88, .28, { fill: '#1c252b' });
        P([[[.06, .36], [.2, .46], [.3, .36], [.42, .5], [.52, .36]], [[.94, .64], [.78, .54], [.68, .64], [.58, .52]]], { stroke: '#8fb2c4', 'stroke-width': .03, fill: 'none' });
      } else {
        R(.06, .34, .88, .32, { fill: '#5f8ea6', stroke: '#1c2a33', 'stroke-width': .03 });
        P([[[.18, .44], [.53, .44]]], { stroke: '#d8eef7', 'stroke-width': .04, opacity: .75 });
        P([[[.5, .34], [.5, .66]]], { stroke: '#e2dccf', 'stroke-width': .05 });
      }
    }
    // 판자 (비스듬히 박힌 널빤지)
    s.b.forEach((hp, i) => {
      const a = ((i % 2 ? -1 : 1) * (14 + i * 6)) * Math.PI / 180, yy = .3 + i * .13, cx = .5, cy = yy + .06;
      const rt = (x, y) => [cx + (x - cx) * Math.cos(a) - (y - cy) * Math.sin(a), cy + (x - cx) * Math.sin(a) + (y - cy) * Math.cos(a)];
      P([[rt(-.05, yy), rt(1.05, yy), rt(1.05, yy + .15), rt(-.05, yy + .15)]], { fill: hp > 3 ? '#9a7446' : '#6e5232', stroke: '#2a1a0c', 'stroke-width': .025, 'stroke-linejoin': 'round' }, true);
      for (const nx of [.04, .96]) { const [x, y] = rt(nx, yy + .075); C(x, y, .025, { fill: '#cfd3d6' }); }
    });
  }

  /* ================= 그림: 폐차·가구 ================= */
  function drawCar(parent, c) {
    const g = el('g', { transform: `translate(${c.x} ${c.y})${c.vert ? '' : ' translate(0 1) rotate(-90)'}${c.flip ? ' translate(1 2) rotate(180)' : ''}` }, parent);
    const body = c.burnt ? '#2a2623' : c.color;
    el('rect', { x: .2, y: .16, width: .76, height: 1.84, rx: .2, fill: '#000', opacity: .45 }, g);
    for (const [wx, wy] of [[.07, .3], [.83, .3], [.07, 1.45], [.83, 1.45]]) el('rect', { x: wx, y: wy, width: .1, height: .26, rx: .04, fill: '#0c0c0c' }, g); // 바퀴
    el('rect', { x: .1, y: .06, width: .8, height: 1.88, rx: .22, fill: body, stroke: '#0c0c0b', 'stroke-width': .05 }, g);
    el('rect', { x: .18, y: .12, width: .64, height: .3, rx: .12, fill: body, stroke: '#000', 'stroke-width': .02, opacity: .8 }, g); // 보닛
    el('path', { d: 'M.2 .5h.6l-.06.3h-.48z', fill: '#16202a', stroke: '#000', 'stroke-width': .02 }, g); // 앞유리
    el('rect', { x: .22, y: .82, width: .56, height: .62, rx: .06, fill: c.burnt ? '#1c1a18' : '#00000022' }, g); // 지붕
    el('path', { d: 'M.24 1.48h.52l.04.24h-.6z', fill: '#16202a', stroke: '#000', 'stroke-width': .02 }, g); // 뒷유리
    el('path', { d: 'M.1 .86h.8M.1 1.2h.8', stroke: '#000', 'stroke-width': .02, opacity: .5 }, g); // 문 틈
    el('rect', { x: .02, y: .72, width: .1, height: .06, rx: .02, fill: shade(body, -.3), stroke: '#000', 'stroke-width': .015 }, g); // 사이드미러
    el('rect', { x: .88, y: .72, width: .1, height: .06, rx: .02, fill: shade(body, -.3), stroke: '#000', 'stroke-width': .015 }, g);
    el('rect', { x: .1, y: .06, width: .8, height: 1.88, rx: .22, fill: 'url(#carSh)' }, g); // 차체 광택
    el('rect', { x: .14, y: .07, width: .16, height: .06, fill: c.burnt ? '#333' : '#d9d2a8' }, g);
    el('rect', { x: .7, y: .07, width: .16, height: .06, fill: c.burnt ? '#333' : '#d9d2a8' }, g);
    el('rect', { x: .14, y: 1.88, width: .16, height: .05, fill: '#6b1010' }, g);
    el('rect', { x: .7, y: 1.88, width: .16, height: .05, fill: '#6b1010' }, g);
    if (!c.burnt) el('path', { d: 'M.3 .55l.1 .12M.55 .6l.12 .1', stroke: '#9fb8c8', 'stroke-width': .02, opacity: .7 }, g); // 깨진 유리
    else el('path', { d: 'M.3 .3q.2 .5 .4 .1M.25 1.1q.3 .3 .5 -.1', stroke: '#4a3a2a', 'stroke-width': .06, fill: 'none', opacity: .8 }, g);
    const rust = c.burnt ? '#3a2a1f' : '#5a3a22';
    el('circle', { cx: .75, cy: 1.2, r: .06, fill: rust, opacity: .8 }, g);
    el('circle', { cx: .25, cy: .35, r: .04, fill: rust, opacity: .7 }, g);
  }
  // 바닥 소품 (길 막지 않음): 잡초·꽃·흙, 기름때·웅덩이·스키드마크, 상자·타이어·병·캔·신발·깨진유리
  function drawProps(gr) {
    const T = DT.T, W = M.W, H = M.H, q = DT.rng(M.W * 101 + 5);
    const at = (x, y) => M.t[Math.floor(y) * W + Math.floor(x)];
    const g = el('g', { 'shape-rendering': 'auto' }, gr), propC = chunker(el('g', { 'shape-rendering': 'auto' }, gr));
    let weed = '', dirt = '', fl1 = '', fl2 = '', leaf = '', oil = [], pud = [], skid = '', glass = '';
    for (let i = 0; i < 900 * M.KA; i++) {
      const x = 1 + q() * (W - 2), y = 1 + q() * (H - 2), t = at(x, y), k = q();
      if (t === T.GRASS) {
        if (k < .45) weed += `M${x.toFixed(2)} ${y.toFixed(2)}l-.06 -.12M${x.toFixed(2)} ${y.toFixed(2)}l.02 -.14M${x.toFixed(2)} ${y.toFixed(2)}l.08 -.1`;
        else if (k < .6) dirt += circ(x, y, .15 + q() * .3);
        else if (k < .7) fl1 += circ(x, y, .035);
        else if (k < .76) fl2 += circ(x, y, .03);
      } else if (t === T.ROAD) {
        if (k < .06) oil.push([x, y, .3 + q() * .5]);
        else if (k < .1) pud.push([x, y, .4 + q() * .6, .25 + q() * .35]);
        else if (k < .13) { const a = q() * 3.1, l = 1 + q() * 2, c = Math.cos(a), s2 = Math.sin(a); skid += `M${x.toFixed(2)} ${y.toFixed(2)}q${(c * l / 2 - s2 * .3).toFixed(2)} ${(s2 * l / 2 + c * .3).toFixed(2)} ${(c * l).toFixed(2)} ${(s2 * l).toFixed(2)}M${(x - s2 * .3).toFixed(2)} ${(y + c * .3).toFixed(2)}q${(c * l / 2 - s2 * .3).toFixed(2)} ${(s2 * l / 2 + c * .3).toFixed(2)} ${(c * l).toFixed(2)} ${(s2 * l).toFixed(2)}`; }
      }
    }
    // 나무 밑 낙엽
    for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) if (M.t[y * W + x] === T.TREE) for (let j = 0; j < 4; j++) { const lx = x + .5 + (q() - .5) * 2.2, ly = y + .5 + (q() - .5) * 2.2; if (at(lx, ly) === T.GRASS) leaf += `M${lx.toFixed(2)} ${ly.toFixed(2)}l.07 -.04l.05 .06l-.07 .04z`; }
    // 창문 밑 깨진 유리
    for (const o of (M.op || [])) if (o.type === 'win' && q() < .35) for (let j = 0; j < 4; j++) { const gx = o.x + .5 + (q() - .5) * 1.4, gy = o.y + .5 + (q() - .5) * 1.4; glass += `M${gx.toFixed(2)} ${gy.toFixed(2)}l.06 -.03l-.02 .07z`; }
    el('path', { d: dirt, fill: '#3a3222', opacity: .45 }, g);
    el('path', { d: weed, stroke: '#4a5a32', 'stroke-width': .03, 'stroke-linecap': 'round', fill: 'none' }, g);
    el('path', { d: leaf, fill: '#6a5424', opacity: .8 }, g);
    el('path', { d: fl1, fill: '#d8c860', opacity: .85 }, g);
    el('path', { d: fl2, fill: '#c8c0d8', opacity: .85 }, g);
    for (const [x, y, r] of oil) el('ellipse', { cx: x, cy: y, rx: r, ry: r * .7, fill: 'url(#oil)' }, g);
    for (const [x, y, rx, ry] of pud) { el('ellipse', { cx: x, cy: y, rx, ry, fill: 'url(#puddle)' }, g); el('path', { d: `M${(x - rx * .4).toFixed(2)} ${(y - ry * .2).toFixed(2)}h${(rx * .5).toFixed(2)}`, stroke: '#a8b8c0', 'stroke-width': .03, opacity: .5 }, g); }
    el('path', { d: skid, stroke: '#070707', 'stroke-width': .08, fill: 'none', opacity: .45 }, g);
    el('path', { d: glass, fill: '#a8c4d0', opacity: .75 }, g);
    // 상자·타이어·병·캔·신발 — 개별 그룹 대신 색깔별로 하나의 경로에 모아 그림 (큰 맵 성능)
    const ST = [], sty = (key, attrs) => { let o = ST.find(z => z.k === key); if (!o) ST.push(o = { k: key, a: attrs, d: '' }); return o; };
    const f2 = v => v.toFixed(2);
    const rot = (cx, cy, a) => (x, y) => [cx + x * Math.cos(a) - y * Math.sin(a), cy + x * Math.sin(a) + y * Math.cos(a)];
    const poly = (R, pts) => 'M' + pts.map(([x, y]) => R(x, y).map(f2).join(' ')).join('L') + 'Z';
    const rect = (R, x, y, w, h) => poly(R, [[x, y], [x + w, y], [x + w, y + h], [x, y + h]]);
    const ell = (R, cx, cy, rx, ry, deg) => { const [ax, ay] = R(cx + rx, cy), [bx, by] = R(cx - rx, cy); return `M${f2(ax)} ${f2(ay)}A${rx} ${ry} ${deg} 0 0 ${f2(bx)} ${f2(by)}A${rx} ${ry} ${deg} 0 0 ${f2(ax)} ${f2(ay)}Z`; };
    const seg = (R, x1, y1, x2, y2) => { const a = R(x1, y1), b = R(x2, y2); return `M${f2(a[0])} ${f2(a[1])}L${f2(b[0])} ${f2(b[1])}`; };
    for (let i = 0; i < 170 * M.KA; i++) {
      const x = 1 + q() * (W - 2), y = 1 + q() * (H - 2), t = at(x, y), k = q(), a = (q() * 360) | 0;
      if (M.moveBlock[Math.floor(y) * W + Math.floor(x)]) continue;
      const R = rot(x, y, a * Math.PI / 180);
      if ((t === T.WALK || t === T.FLOOR) && k < .3) { // 상자
        sty('boxSh', { fill: '#000', opacity: .3 }).d += rect(R, -.1, -.07, .3, .26);
        sty('box', { fill: '#9a7a4a', stroke: '#3a2a14', 'stroke-width': .02 }).d += rect(R, -.14, -.12, .28, .24);
        sty('boxTape', { stroke: '#c8b890', 'stroke-width': .04, fill: 'none' }).d += seg(R, 0, -.12, 0, .12);
        const p1 = R(-.14, -.12), p2 = R(0, -.02), p3 = R(.14, -.12);
        sty('boxFold', { stroke: '#6a5230', 'stroke-width': .015, fill: 'none' }).d += `M${f2(p1[0])} ${f2(p1[1])}L${f2(p2[0])} ${f2(p2[1])}L${f2(p3[0])} ${f2(p3[1])}`;
      } else if ((t === T.GRASS || t === T.ROAD) && k < .42) { // 타이어
        sty('tire', { fill: '#0e0e0e', stroke: '#050505', 'stroke-width': .02 }).d += circ(x, y, .15);
        sty('tireIn', { fill: 'none', stroke: '#2a2a2a', 'stroke-width': .03 }).d += circ(x, y, .07);
      } else if (k < .62) { // 병
        const c = q() < .5 ? '#3a6a3a' : '#6a4a2a';
        sty('bottle' + c, { fill: c, opacity: .9 }).d += rect(R, -.08, -.025, .12, .05);
        sty('bottleNeck', { fill: '#2a3a2a' }).d += rect(R, .04, -.012, .05, .024);
      } else if (k < .82) { // 찌그러진 캔
        const c = ['#b8141f', '#2a5a9a', '#c0c0b8'][(q() * 3) | 0];
        sty('can' + c, { fill: c, stroke: '#222', 'stroke-width': .012 }).d += ell(R, 0, 0, .045, .06, a);
      } else if (t !== T.FLOOR) { // 신발 한 짝
        sty('shoe', { fill: '#2a2420', stroke: '#000', 'stroke-width': .015 }).d += ell(R, 0, 0, .09, .045, a);
        sty('shoeIn', { fill: '#4a3f36' }).d += ell(R, .03, 0, .03, .025, a);
      }
    }
    for (const o of ST) el('path', Object.assign({ d: o.d }, o.a), propC(0, 0));
  }
  const DECO_COL = ['#6b3a3a', '#34506a', '#5a6a3a', '#6a5a3a', '#4a3a5a', '#7a7466'];
  function drawDecor(parent, d) {
    const g0 = el('g', { 'shape-rendering': 'auto' }, parent);
    const g = document.createElementNS(NS, 'g'); // 먼저 (0,0) 기준으로 그린 뒤 좌표를 직접 옮김 (위치 변환 제거 → 빠름)
    drawDecorArt(g, d);
    bakeTranslate(g, d.x, d.y);
    while (g.firstChild) g0.appendChild(g.firstChild);
  }
  // 위치 변환(translate)을 좌표 자체에 반영
  function shiftPath(d, dx, dy) {
    const tk = d.match(/[MmLlHhVvCcSsQqTtAaZz]|-?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/g) || [];
    const N = { M: 2, L: 2, T: 2, H: 1, V: 1, C: 6, S: 4, Q: 4, A: 7, Z: 0 };
    let out = '', cmd = '', i = 0, k = 0;
    const fmt = v => +(+v).toFixed(3);
    while (i < tk.length) {
      const t = tk[i];
      if (/[A-Za-z]/.test(t)) { cmd = t; out += t; i++; k = 0; continue; }
      const U = cmd.toUpperCase(), n = N[U], abs = cmd === U;
      const idx = k % n; let v = +t;
      if (abs) {
        if (U === 'H') v += dx; else if (U === 'V') v += dy;
        else if (U === 'A') { if (idx === 5) v += dx; else if (idx === 6) v += dy; }
        else v += idx % 2 ? dy : dx;
      }
      out += (out && !/[A-Za-z]$/.test(out) ? ' ' : '') + fmt(v); i++; k++;
    }
    return out;
  }
  function bakeTranslate(g, dx, dy) {
    for (const e of g.children) {
      const tg = e.tagName;
      if (tg === 'g') { bakeTranslate(e, dx, dy); continue; }
      for (const [a, o] of [['x', dx], ['cx', dx], ['x1', dx], ['x2', dx], ['y', dy], ['cy', dy], ['y1', dy], ['y2', dy]]) {
        if (e.hasAttribute(a)) e.setAttribute(a, +(+e.getAttribute(a) + o).toFixed(3));
        else if ((a === 'cx' || a === 'cy') && (tg === 'circle' || tg === 'ellipse')) e.setAttribute(a, o);
        else if ((a === 'x' || a === 'y') && tg === 'rect') e.setAttribute(a, o);
      }
      if (tg === 'path') e.setAttribute('d', shiftPath(e.getAttribute('d'), dx, dy));
      const tr = e.getAttribute('transform');
      if (tr) { const m = /^rotate\(([-\d.]+) ([-\d.]+) ([-\d.]+)\)$/.exec(tr); if (m) e.setAttribute('transform', `rotate(${m[1]} ${+m[2] + dx} ${+m[3] + dy})`); }
    }
  }
  function drawDecorArt(g, d) {
    const W = d.w, H = d.h, col = DECO_COL[d.c % DECO_COL.length];
    el('rect', { x: .12, y: .14, width: W - .1, height: H - .1, rx: .08, fill: '#000', opacity: .35 }, g);
    if (d.kind === 'bed') {
      el('rect', { x: .06, y: .06, width: W - .12, height: H - .12, rx: .08, fill: '#5a3e26', stroke: '#1c1208', 'stroke-width': .04 }, g);
      el('rect', { x: .12, y: .12, width: W - .24, height: H - .24, rx: .06, fill: '#dcd6c8' }, g);
      // 베개 쪽 = 벽 쪽
      const along = W > H;
      const px = d.wx < 0 ? .16 : d.wx > 0 ? W - .5 : .2, py = d.wy < 0 ? .16 : d.wy > 0 ? H - .5 : .2;
      if (along) { el('rect', { x: .25, y: d.wy > 0 ? H - .42 : .16, width: .55, height: .26, rx: .08, fill: '#f2eee4', stroke: '#a39c8c', 'stroke-width': .02 }, g); el('rect', { x: 1.2, y: d.wy > 0 ? H - .42 : .16, width: .55, height: .26, rx: .08, fill: '#f2eee4', stroke: '#a39c8c', 'stroke-width': .02 }, g); el('rect', { x: .12, y: d.wy > 0 ? .12 : .46, width: W - .24, height: .42, fill: col, opacity: .95 }, g); }
      else { el('rect', { x: d.wx > 0 ? W - .42 : .16, y: .25, width: .26, height: .55, rx: .08, fill: '#f2eee4', stroke: '#a39c8c', 'stroke-width': .02 }, g); el('rect', { x: d.wx > 0 ? .12 : .46, y: .12, width: .42, height: H - .24, fill: col, opacity: .95 }, g); }
      el('path', { d: `M.3 ${H * .6}q.3 -.1 .5 .05`, stroke: '#5e0a10', 'stroke-width': .05, fill: 'none', opacity: .6 }, g);
    } else if (d.kind === 'sofa') {
      el('rect', { x: .06, y: .08, width: W - .12, height: H - .16, rx: .12, fill: shade(col, -.25), stroke: '#111', 'stroke-width': .04 }, g);
      el('rect', { x: .18, y: .2, width: W - .36, height: H - .4, rx: .08, fill: col }, g);
      if (W > H) el('path', { d: `M${W / 2} .22V${H - .22}`, stroke: shade(col, -.3), 'stroke-width': .03 }, g);
      else el('path', { d: `M.22 ${H / 2}H${W - .22}`, stroke: shade(col, -.3), 'stroke-width': .03 }, g);
    } else if (d.kind === 'table') {
      for (const [cx, cy] of [[.5, .16], [.5, .84], [.16, .5], [.84, .5]]) el('rect', { x: cx - .11, y: cy - .11, width: .22, height: .22, rx: .04, fill: '#5a3e26', stroke: '#1c1208', 'stroke-width': .025 }, g);
      el('circle', { cx: .5, cy: .5, r: .3, fill: '#7d5a36', stroke: '#1c1208', 'stroke-width': .04 }, g);
      el('circle', { cx: .42, cy: .44, r: .08, fill: '#e8e3d6' }, g);
      el('rect', { x: .5, y: .5, width: .14, height: .1, fill: '#b9b3a0', transform: 'rotate(20 .57 .55)' }, g);
    } else if (d.kind === 'tv') {
      el('rect', { x: .1, y: .2, width: .8, height: .6, rx: .04, fill: '#4a3624', stroke: '#140d06', 'stroke-width': .035 }, g);
      el('rect', { x: .16, y: .3, width: .68, height: .3, rx: .03, fill: '#141618', stroke: '#000', 'stroke-width': .02 }, g);
      el('path', { d: 'M.22 .36l.2 .16', stroke: '#9fb8c8', 'stroke-width': .02, opacity: .6 }, g);
    } else if (d.kind === 'shelf') { // 책장
      el('rect', { x: .06, y: .06, width: W - .12, height: H - .12, rx: .03, fill: '#4e3824', stroke: '#140d06', 'stroke-width': .04 }, g);
      const along = W >= H, n = 7, r = DT.rng(d.x * 31 + d.y * 7);
      for (let i = 0; i < n; i++) {
        if (r() < .15) continue; // 빠진 책
        const c = ['#7a2a2a', '#2a4a6a', '#5a6a3a', '#8a7a3a', '#4a3a5a', '#d8d0c0'][(r() * 6) | 0];
        const t0 = .12 + i * (.76 / n), tw = .76 / n - .015;
        if (along) el('rect', { x: t0, y: .14 + r() * .08, width: tw, height: .6, fill: c, stroke: '#000', 'stroke-width': .01 }, g);
        else el('rect', { x: .14 + r() * .08, y: t0, width: .6, height: tw, fill: c, stroke: '#000', 'stroke-width': .01 }, g);
      }
      if (r() < .5) el('rect', { x: .3, y: .6, width: .3, height: .2, fill: '#e8e0c8', transform: 'rotate(15 .45 .7)', opacity: .9 }, g); // 떨어진 책
    } else if (d.kind === 'bath') { // 욕조
      el('rect', { x: .06, y: .06, width: W - .12, height: H - .12, rx: .2, fill: '#e8e6e0', stroke: '#555', 'stroke-width': .035 }, g);
      el('rect', { x: .18, y: .18, width: W - .36, height: H - .36, rx: .16, fill: '#7a8a8e' }, g);
      el('rect', { x: .22, y: .22, width: W - .44, height: H - .44, rx: .14, fill: '#4a2a28', opacity: .55 }, g); // 탁한 물
      el('circle', { cx: W > H ? .3 : W / 2, cy: W > H ? H / 2 : .3, r: .05, fill: '#9aa' }, g);
      el('path', { d: `M${W * .5} ${H * .4}q.2 .05 .3 -.05`, stroke: '#a8b0b0', 'stroke-width': .02, fill: 'none', opacity: .6 }, g);
    } else if (d.kind === 'sink') { // 세면대
      el('rect', { x: .12, y: .12, width: .76, height: .6, rx: .1, fill: '#e6e3da', stroke: '#555', 'stroke-width': .03 }, g);
      el('ellipse', { cx: .5, cy: .45, rx: .26, ry: .18, fill: '#b8c4c8', stroke: '#777', 'stroke-width': .02 }, g);
      el('rect', { x: .46, y: .16, width: .08, height: .14, rx: .02, fill: '#9aa0a4' }, g);
      el('rect', { x: .25, y: .76, width: .5, height: .12, rx: .03, fill: '#c8d4dc', stroke: '#555', 'stroke-width': .02 }, g); // 거울 조각
    } else if (d.kind === 'washer') { // 세탁기
      el('rect', { x: .0625, y: .0625, width: .875, height: .875, rx: .06, fill: '#dedbd2', stroke: '#1a1a1a', 'stroke-width': .04 }, g);
      el('rect', { x: .12, y: .1, width: .76, height: .14, fill: '#c8c4ba' }, g);
      el('circle', { cx: .72, cy: .17, r: .04, fill: '#555' }, g);
      el('circle', { cx: .5, cy: .58, r: .28, fill: '#8a9094', stroke: '#444', 'stroke-width': .04 }, g);
      el('circle', { cx: .5, cy: .58, r: .18, fill: '#3a4448' }, g);
      el('path', { d: 'M.4 .5q.1 -.06 .18 0', stroke: '#c8d0d4', 'stroke-width': .025, fill: 'none', opacity: .7 }, g);
    } else if (d.kind === 'plant') { // 화분 (시든)
      el('circle', { cx: .5, cy: .5, r: .24, fill: '#8a4a2a', stroke: '#2a140a', 'stroke-width': .035 }, g);
      el('circle', { cx: .5, cy: .5, r: .18, fill: '#3a2a1a' }, g);
      for (let i = 0; i < 6; i++) { const a = i * 1.05; el('path', { d: `M.5 .5q${(Math.cos(a) * .2).toFixed(2)} ${(Math.sin(a) * .1).toFixed(2)} ${(Math.cos(a) * .36).toFixed(2)} ${(Math.sin(a) * .36).toFixed(2)}`, stroke: i % 2 ? '#4a5a2a' : '#6a6a2a', 'stroke-width': .07, 'stroke-linecap': 'round', fill: 'none' }, g); }
    } else if (d.kind === 'desk') { // 책상 + 의자
      el('rect', { x: .0625, y: .0625, width: .875, height: .56, rx: .03, fill: '#6a4e32', stroke: '#1c1208', 'stroke-width': .035 }, g);
      el('rect', { x: .14, y: .12, width: .3, height: .22, fill: '#e8e0c8', transform: 'rotate(-8 .29 .23)' }, g); // 서류
      el('rect', { x: .56, y: .14, width: .26, height: .18, rx: .02, fill: '#222', stroke: '#000', 'stroke-width': .015 }, g); // 노트북
      el('circle', { cx: .5, cy: .78, r: .15, fill: '#2a2a2a', stroke: '#000', 'stroke-width': .03 }, g); // 의자
      el('path', { d: 'M.2 .45h.2', stroke: '#c8141f', 'stroke-width': .025 }, g);
    } else if (d.kind === 'toilet') {
      el('rect', { x: .25, y: .1, width: .5, height: .22, rx: .05, fill: '#e6e3da', stroke: '#555', 'stroke-width': .025 }, g);
      el('ellipse', { cx: .5, cy: .58, rx: .24, ry: .3, fill: '#efece4', stroke: '#555', 'stroke-width': .025 }, g);
      el('ellipse', { cx: .5, cy: .6, rx: .14, ry: .19, fill: '#9fb0b8' }, g);
    }
  }
  function drawFurniture(g, kind) {
    el('rect', { x: .125, y: .125, width: .875, height: .875, fill: '#000', opacity: .35 }, g);
    if (kind === 'fridge') {
      el('rect', { x: .0625, y: .0625, width: .875, height: .875, rx: .06, fill: '#dcd9d0', stroke: '#1a1a1a', 'stroke-width': .045 }, g);
      el('rect', { x: .13, y: .13, width: .74, height: .2, rx: .03, fill: '#eceae3' }, g);
      el('path', { d: 'M.08 .38H.92', stroke: '#7a776f', 'stroke-width': .03 }, g);
      el('rect', { x: .74, y: .46, width: .07, height: .3, rx: .02, fill: '#5a5852' }, g);
      el('circle', { cx: .25, cy: .6, r: .05, fill: '#b8b4a8' }, g);
      el('rect', { x: .3, y: .5, width: .1, height: .08, fill: '#c8141f', opacity: .8 }, g); el('rect', { x: .45, y: .62, width: .08, height: .1, fill: '#e0b020', opacity: .8 }, g); el('rect', { x: .28, y: .7, width: .18, height: .1, fill: '#f2eee4', opacity: .85 }, g); // 자석·메모
      el('path', { d: 'M.16 .2h.5', stroke: '#fff', 'stroke-width': .03, opacity: .6 }, g);
    } else if (kind === 'cabinet') { // 주방 조리대
      el('rect', { x: .0625, y: .0625, width: .875, height: .875, rx: .03, fill: '#7d5e3c', stroke: '#1f150b', 'stroke-width': .045 }, g);
      el('rect', { x: .0625, y: .0625, width: .875, height: .3, fill: '#a8a192', stroke: '#1f150b', 'stroke-width': .03 }, g);
      el('rect', { x: .2, y: .15, width: .3, height: .18, rx: .05, fill: '#6f6c64', stroke: '#3a3833', 'stroke-width': .02 }, g);
      el('path', { d: 'M.5 .42V.88', stroke: '#3a2a18', 'stroke-width': .03 }, g);
      el('circle', { cx: .44, cy: .64, r: .03, fill: '#d0c49a' }, g); el('circle', { cx: .56, cy: .64, r: .03, fill: '#d0c49a' }, g);
      el('circle', { cx: .72, cy: .22, r: .07, fill: '#2a2a2a', stroke: '#111', 'stroke-width': .015 }, g); el('circle', { cx: .72, cy: .22, r: .035, fill: '#3a3a3a' }, g); // 가스레인지
      el('path', { d: 'M.2 .2h.3M.55 .44l.1 .1', stroke: '#8a8680', 'stroke-width': .02, opacity: .7 }, g);
    } else if (kind === 'drawer') { // 서랍장
      el('rect', { x: .0625, y: .0625, width: .875, height: .875, rx: .03, fill: '#6c4f33', stroke: '#1f150b', 'stroke-width': .045 }, g);
      el('path', { d: 'M.0625 .36H.9375M.0625 .63H.9375', stroke: '#2e1f11', 'stroke-width': .03 }, g);
      for (const yy of [.23, .5, .77]) el('rect', { x: .42, y: yy - .025, width: .16, height: .05, rx: .02, fill: '#c9b07a' }, g);
      el('rect', { x: .62, y: .14, width: .18, height: .1, fill: '#e8e0c8', opacity: .8 }, g); // 위에 놓인 종이
    } else { // 옷장
      el('rect', { x: .0625, y: .0625, width: .875, height: .875, rx: .03, fill: '#4a3624', stroke: '#140d06', 'stroke-width': .05 }, g);
      el('rect', { x: .0625, y: .0625, width: .875, height: .14, fill: '#5a4430' }, g);
      el('path', { d: 'M.5 .2V.9375', stroke: '#140d06', 'stroke-width': .035 }, g);
      el('circle', { cx: .44, cy: .57, r: .035, fill: '#c9b07a' }, g); el('circle', { cx: .56, cy: .57, r: .035, fill: '#c9b07a' }, g);
      el('path', { d: 'M.14 .3l.08 .5M.86 .3l-.08 .5', stroke: '#3a2a1a', 'stroke-width': .02, opacity: .7 }, g);
    }
  }

  /* ================= 그림: 플레이어 ================= */
  // 플레이어 외모 (타이틀에서 선택, 저장됨)
  const LOOK = {
    skin: ['#e3b891', '#d6a57a', '#b07a52', '#7a5238'],
    hair: ['short', 'long', 'buzz', 'pony', 'cap'],
    hairName: ['짧은 머리', '긴 머리', '삭발', '묶은 머리', '모자'],
    hc: ['#2a1d14', '#5a3a1f', '#b08a4a', '#1a1a1a', '#7a2a1a'],
    jacket: ['#c9c3b3', '#4b5134', '#2e3a4e', '#6a4a30', '#8a2a2a'],
    jacketName: ['베이지 자켓', '올리브 야전상의', '네이비 점퍼', '갈색 가죽', '빨간 후드'],
  };
  function defaultLook() { return { skin: 1, hair: 0, hc: 0, jacket: 0 }; }
  function loadLook() { try { const v = JSON.parse(localStorage.getItem('deadtown_look')); if (v && v.skin != null) return v; } catch (e) {} return defaultLook(); }
  function saveLook(v) { try { localStorage.setItem('deadtown_look', JSON.stringify(v)); } catch (e) {} }
  function drawPlayerArt(g, lk, refs) {
    const skin = LOOK.skin[lk.skin], jc = LOOK.jacket[lk.jacket], hc = LOOK.hc[lk.hc], hs = LOOK.hair[lk.hair];
    const jd = shade(jc, -.3), jl = shade(jc, .12);
    el('ellipse', { cx: .05, cy: .06, rx: .3, ry: .26, fill: '#000', opacity: .35 }, g);
    const shoe = (cy) => { const f = el('g', {}, g); el('ellipse', { cx: 0, cy, rx: .1, ry: .065, fill: '#2a2420', stroke: '#000', 'stroke-width': .025 }, f); el('ellipse', { cx: .05, cy, rx: .04, ry: .04, fill: '#4a3f36' }, f); el('path', { d: `M-.07 ${cy}h.06`, stroke: '#141110', 'stroke-width': .02 }, f); return f; };
    refs.fl = shoe(-.1); refs.fr = shoe(.1);
    // 배낭 + 침낭
    refs.pack = el('g', {}, g);
    el('rect', { x: -.32, y: -.17, width: .18, height: .34, rx: .06, fill: '#4b5134', stroke: '#111', 'stroke-width': .03 }, refs.pack);
    el('rect', { x: -.36, y: -.15, width: .06, height: .3, rx: .03, fill: '#6a5a3a', stroke: '#111', 'stroke-width': .02 }, refs.pack);
    el('path', { d: 'M-.3 -.08h.14M-.3 .08h.14', stroke: '#33381f', 'stroke-width': .03 }, refs.pack);
    el('rect', { x: -.3, y: -.12, width: .1, height: .24, rx: .04, fill: '#5a6040', stroke: '#22251a', 'stroke-width': .015 }, refs.pack); // 덮개
    el('rect', { x: -.225, y: -.03, width: .035, height: .06, rx: .01, fill: '#b8a878' }, refs.pack); // 버클
    el('path', { d: 'M-.36 -.09h.06M-.36 0h.06M-.36 .09h.06', stroke: '#4a3e28', 'stroke-width': .015 }, refs.pack); // 침낭 주름
    el('rect', { x: -.32, y: -.17, width: .18, height: .34, rx: .06, fill: 'url(#volS)' }, refs.pack);
    // 왼팔: 빈손 / 양손잡기 두 가지
    refs.armL = el('g', {}, g);
    refs.armLfree = el('g', {}, refs.armL);
    el('path', { d: 'M-.02 -.2Q.1 -.29 .2 -.25', stroke: jc, 'stroke-width': .11, 'stroke-linecap': 'round', fill: 'none' }, refs.armLfree);
    el('path', { d: 'M.13 -.27Q.17 -.27 .2 -.25', stroke: jd, 'stroke-width': .11, 'stroke-linecap': 'butt', fill: 'none', opacity: .5 }, refs.armLfree);
    refs.band = el('path', { d: 'M.08 -.3l.03 .1M.12 -.3l.03 .1', stroke: '#eeeae0', 'stroke-width': .04, opacity: 0 }, refs.armLfree);
    el('circle', { cx: .22, cy: -.25, r: .055, fill: skin, stroke: '#000', 'stroke-width': .02 }, refs.armLfree);
    refs.armLgrip = el('g', { style: 'display:none' }, refs.armL);
    el('path', { d: 'M-.02 -.2Q.14 -.18 .26 .1', stroke: jc, 'stroke-width': .11, 'stroke-linecap': 'round', fill: 'none' }, refs.armLgrip);
    el('circle', { cx: .27, cy: .12, r: .055, fill: skin, stroke: '#000', 'stroke-width': .02 }, refs.armLgrip);
    // 오른팔 + 무기
    refs.armR = el('g', {}, g);
    refs.wep = el('g', { transform: 'translate(.22 .25)' }, refs.armR);
    el('path', { d: 'M-.02 .2Q.1 .29 .2 .25', stroke: jc, 'stroke-width': .11, 'stroke-linecap': 'round', fill: 'none' }, refs.armR);
    el('circle', { cx: .22, cy: .25, r: .055, fill: skin, stroke: '#000', 'stroke-width': .02 }, refs.armR);
    // 몸통 (숨쉬기용 그룹)
    refs.torso = el('g', {}, g);
    el('ellipse', { cx: 0, cy: 0, rx: .17, ry: .27, fill: jc, stroke: '#141312', 'stroke-width': .04 }, refs.torso);
    el('ellipse', { cx: -.03, cy: 0, rx: .1, ry: .2, fill: jl }, refs.torso);
    el('path', { d: 'M.02 -.26V.26', stroke: jd, 'stroke-width': .025 }, refs.torso);
    el('rect', { x: .02, y: -.2, width: .08, height: .07, rx: .01, fill: jd, opacity: .7 }, refs.torso); // 주머니
    el('rect', { x: .02, y: .13, width: .08, height: .07, rx: .01, fill: jd, opacity: .7 }, refs.torso);
    el('path', { d: 'M-.12 -.2L.1 -.14M-.12 .2L.1 .14', stroke: '#33381f', 'stroke-width': .035 }, refs.torso); // 멜빵
    el('rect', { x: -.1, y: -.28, width: .1, height: .07, fill: '#c8141f' }, refs.torso); // 완장
    el('path', { d: 'M.1 -.12Q.17 0 .1 .12', stroke: jd, 'stroke-width': .035, fill: 'none', 'stroke-linecap': 'round' }, refs.torso); // 옷깃
    el('path', { d: 'M-.06 -.24Q-.02 -.18 .06 -.22M-.06 .24Q-.02 .18 .06 .22', stroke: jd, 'stroke-width': .018, fill: 'none', opacity: .8 }, refs.torso); // 어깨 솔기
    el('path', { d: 'M-.1 -.05q.04 .03 0 .07M-.08 .08q.04 .02 .01 .06', stroke: jd, 'stroke-width': .015, fill: 'none', opacity: .6 }, refs.torso); // 옷 주름
    el('ellipse', { cx: 0, cy: 0, rx: .17, ry: .27, fill: 'url(#volG)' }, refs.torso);
    refs.blood1 = el('ellipse', { cx: .02, cy: .1, rx: .07, ry: .05, fill: '#6e0810', opacity: 0 }, refs.torso);
    refs.blood2 = el('path', { d: 'M-.08 -.16q.08 .04 .12 .12q-.06 .02 -.1 -.04z', fill: '#6e0810', opacity: 0 }, refs.torso);
    if (hs === 'long' || hs === 'pony') { // 뒤로 늘어진 머리
      if (hs === 'long') el('path', { d: 'M-.06 -.12Q-.22 -.1 -.22 0Q-.22 .1 -.06 .12Z', fill: hc }, g);
      else el('circle', { cx: -.17, cy: 0, r: .06, fill: hc, stroke: '#000', 'stroke-width': .015 }, g);
    }
    // 머리 (귀 → 얼굴)
    el('ellipse', { cx: .04, cy: -.13, rx: .03, ry: .025, fill: shade(skin, -.12), stroke: '#141312', 'stroke-width': .015 }, g);
    el('ellipse', { cx: .04, cy: .13, rx: .03, ry: .025, fill: shade(skin, -.12), stroke: '#141312', 'stroke-width': .015 }, g);
    el('circle', { cx: .03, cy: 0, r: .135, fill: skin, stroke: '#141312', 'stroke-width': .035 }, g);
    el('path', { d: 'M.15 -.02l.02 .02l-.02 .02', stroke: shade(skin, -.3), 'stroke-width': .015, fill: 'none' }, g); // 코
    if (hs === 'cap') {
      el('circle', { cx: .01, cy: 0, r: .14, fill: '#2a2a2a', stroke: '#000', 'stroke-width': .03 }, g);
      el('path', { d: 'M.1 -.1Q.24 0 .1 .1', fill: '#1a1a1a', stroke: '#000', 'stroke-width': .02 }, g);
    } else if (hs === 'buzz') {
      el('path', { d: 'M-.09 -.09A.13 .13 0 0 1 .08 -.11Q.06 0 .08 .11A.13 .13 0 0 1 -.09 .09Z', fill: hc, opacity: .55 }, g);
    } else {
      el('path', { d: 'M-.1 -.07A.135 .135 0 0 1 .09 -.12Q.04 0 .09 .12A.135 .135 0 0 1 -.1 .07Z', fill: hc }, g);
      el('path', { d: 'M-.06 -.06L.05 -.08M-.07 0L.04 -.01M-.06 .06L.05 .07', stroke: shade(hc, .25), 'stroke-width': .014, opacity: .6 }, g); // 머릿결
    }
    el('circle', { cx: .03, cy: 0, r: .135, fill: 'url(#volG)' }, g);
    // 가구를 들고 있을 때
    refs.carry = el('g', { style: 'display:none' }, g);
    el('rect', { x: .12, y: -.34, width: .5, height: .68, rx: .04, fill: '#6a4f33', stroke: '#1f150b', 'stroke-width': .04 }, refs.carry);
    el('path', { d: 'M.12 -.1H.62M.12 .12H.62', stroke: '#3a2a18', 'stroke-width': .03 }, refs.carry);
  }
  function makePlayerG() {
    const g = el('g', {}, L.player);
    L.pr = {};
    drawPlayerArt(g, G.look || defaultLook(), L.pr);
    L.pFootL = L.pr.fl; L.pFootR = L.pr.fr; L.pArmL = L.pr.armL; L.pArmR = L.pr.armR; L.pWep = L.pr.wep;
    L.pg = g;
    updateWeaponLook();
  }
  function weaponArt(parent, id) {
    parent.innerHTML = '';
    const d = (dd, attrs) => el('path', Object.assign({ d: dd }, attrs), parent);
    switch (id) {
      case 'bat': d('M-.04 -.03L.62 -.06L.64 .06L-.04 .03Z', { fill: '#b58b56', stroke: '#2a1a0c', 'stroke-width': .02 }); d('M-.05 -.035h.12v.07h-.12z', { fill: '#222' }); break;
      case 'pipe': d('M-.04 -.03h.72v.06h-.72z', { fill: '#8d99a3', stroke: '#2a2f33', 'stroke-width': .02 }); d('M.66 -.045h.05v.09h-.05z', { fill: '#6a747c' }); break;
      case 'knife': d('M-.03 -.025h.12v.05h-.12z', { fill: '#2a1a0c' }); d('M.09 -.03L.34 -.005L.09 .03Z', { fill: '#d9dde0', stroke: '#555', 'stroke-width': .012 }); break;
      case 'hammer': d('M-.03 -.022h.42v.044h-.42z', { fill: '#7a5a3a' }); d('M.36 -.1h.1v.2h-.1z', { fill: '#8a8a8a', stroke: '#222', 'stroke-width': .02 }); break;
      case 'nailbat': d('M-.04 -.045h.6v.09h-.6z', { fill: '#9a7446', stroke: '#2a1a0c', 'stroke-width': .02 }); d('M.3 -.045v-.07M.42 -.045v-.07M.36 .045v.07M.5 .045v.06', { stroke: '#cfd3d6', 'stroke-width': .02 }); break;
      case 'spear': d('M-.2 -.02h.95v.04h-.95z', { fill: '#8d99a3', stroke: '#2a2f33', 'stroke-width': .015 }); d('M.75 -.05L.95 0L.75 .05Z', { fill: '#d9dde0', stroke: '#444', 'stroke-width': .015 }); d('M.66 -.03h.08v.06h-.08z', { fill: '#777' }); break;
      case 'pistol': d('M-.02 -.035h.3v.07h-.3z', { fill: '#1b1b1b', stroke: '#000', 'stroke-width': .015 }); d('M.0 .03h.07v.08h-.07z', { fill: '#2a2a2a' }); break;
      default: break;
    }
  }
  const TWO_HAND = { bat: 1, pipe: 1, spear: 1, nailbat: 1, pistol: 1 };
  function updateWeaponLook() {
    if (!L.pWep || !G) return;
    const w = curWeapon();
    weaponArt(L.pWep, w.item ? w.item.id : null);
    const two = !!(w.item && TWO_HAND[w.item.id]);
    if (L.pr) { L.pr.armLfree.style.display = two ? 'none' : ''; L.pr.armLgrip.style.display = two ? '' : 'none'; }
    $('atkIcon').setAttribute('href', '#i-' + w.def.icon);
  }
  // 걷기·공격 애니메이션 (매 프레임)
  function animatePlayer(dt) {
    const p = G.p;
    const moving = Math.hypot(input.jx + input.kx, input.jy + input.ky) > .12 && !G.sleeping;
    p.walkPh = (p.walkPh || 0) + (moving ? dt * ({ walk: 7, jog: 11, sprint: 15 })[G.gait] || 0 : 0);
    const sw = moving ? Math.sin(p.walkPh) : 0;
    L.pFootL.setAttribute('transform', `translate(${(.12 * sw).toFixed(3)} 0)`);
    L.pFootR.setAttribute('transform', `translate(${(-.12 * sw).toFixed(3)} 0)`);
    L.pArmL.setAttribute('transform', L.pr && L.pr.armLgrip.style.display === '' ? '' : `translate(${(-.05 * sw).toFixed(3)} 0)`);
    // 숨쉬기 (지치면 가쁘게), 부상 핏자국, 붕대, 가구 들기
    L.breathT = (L.breathT || 0) + dt * (p.endu < 25 ? 7 : moving ? 0 : 2.2);
    const br = 1 + (p.endu < 25 ? .045 : .02) * Math.sin(L.breathT);
    L.pr.torso.setAttribute('transform', `scale(${br.toFixed(3)} ${(2 - br).toFixed(3)})`);
    const hp = p.hp;
    if (L._hpv !== (hp < 40 ? 2 : hp < 70 ? 1 : 0)) { L._hpv = hp < 40 ? 2 : hp < 70 ? 1 : 0; L.pr.blood1.setAttribute('opacity', L._hpv ? .9 : 0); L.pr.blood2.setAttribute('opacity', L._hpv > 1 ? .9 : 0); }
    const bd = (p.bandT || 0) > 0 ? 1 : 0; if (L._bd !== bd) { L._bd = bd; L.pr.band.setAttribute('opacity', bd); }
    const car = p.inv.some(i => i.id === 'furn') ? 1 : 0; if (L._car !== car) { L._car = car; L.pr.carry.style.display = car ? '' : 'none'; }
    let armR = `translate(${(.05 * sw).toFixed(3)} 0)`;
    if (p.atkT > 0) {
      const k = 1 - p.atkT / .18; // 0→1
      const w = curWeapon();
      if (w.def.type === 'gun') armR = `translate(${(-.06 * (1 - k)).toFixed(3)} 0)`;
      else armR = `rotate(${(55 - 120 * k).toFixed(1)} 0 .2)`;
    }
    L.pArmR.setAttribute('transform', armR);
  }

  // 좀비 외형: 직업(옷) 9종 × 머리 × 상처 × 자세
  const SKINS = ['#8e9b7b', '#9a9384', '#7f8c6c', '#a39c86', '#8a8f7a', '#9aa0a8', '#7d7468'];
  const ZT = [
    ['civ', 3], ['office', 1.4], ['hoodie', 1.2], ['police', .8], ['medic', .8], ['worker', .9], ['jogger', .7], ['elder', .8], ['soldier', .4],
  ];
  const HAIRC = ['#2a1d14', '#3b2f25', '#1a1a1a', '#5a4a3a', '#8a7a5a', '#6a3a1f'];
  function genLook() {
    const tot = ZT.reduce((a, q) => a + q[1], 0);
    let x = rand() * tot, ty = 'civ';
    for (const [k, w] of ZT) { x -= w; if (x <= 0) { ty = k; break; } }
    return { ty, v: (rand() * 1e9) | 0, skin: (rand() * SKINS.length) | 0, bw: +(.85 + rand() * .35).toFixed(2) };
  }
  // 외형 세부는 v(시드)로 결정 → 저장/불러오기해도 똑같이 보임
  function lookParts(lk) {
    const r = DT.rng(lk.v || 1), pick = a => a[(r() * a.length) | 0];
    const P = { ty: lk.ty, skin: SKINS[lk.skin % SKINS.length], bw: lk.bw || 1, hair: pick(['bald', 'short', 'short', 'long', 'messy', 'pony']), hc: pick(HAIRC),
      sleeve: 'short', hat: null, extra: [], limp: r() < .15 ? (r() < .5 ? -1 : 1) : 0, noArm: 0, wounds: 1 + ((r() * 3) | 0), ribs: r() < .18 };
    if (!P.limp && r() < .08) P.noArm = r() < .5 ? -1 : 1;
    switch (lk.ty) {
      case 'civ': P.top = pick(['#7a3b3b', '#3b5a7a', '#5a7a3b', '#8a7a3a', '#6a4a6a', '#4a6a6a', '#6b6b6b']); break;
      case 'office': P.top = '#d6d2c6'; P.sleeve = 'long'; P.extra.push('tie'); P.tie = pick(['#7a1a1a', '#1a2a5a', '#2a2a2a']); if (r() < .45) { P.extra.push('jacket'); P.jk = pick(['#3a3a40', '#2a2e3a', '#4a3e32']); } break;
      case 'hoodie': P.top = pick(['#2e2e33', '#4a2a2e', '#2e3a2e', '#3a3a3a']); P.sleeve = 'long'; P.extra.push('hood'); break;
      case 'police': P.top = '#26344a'; P.sleeve = 'long'; P.extra.push('badge'); P.hat = r() < .6 ? 'cap' : null; break;
      case 'medic': if (r() < .5) { P.top = '#e6e6e0'; P.extra.push('coat'); } else P.top = '#3f7f7a'; P.sleeve = 'long'; if (r() < .6) P.extra.push('mask'); break;
      case 'worker': P.top = '#5a5a58'; P.sleeve = 'long'; P.extra.push('vest'); P.hat = r() < .7 ? 'hardhat' : null; break;
      case 'jogger': P.top = pick(['#c8141f', '#1f7ac8', '#d8c020', '#e05a9a']); P.sleeve = 'none'; P.bw *= .88; P.extra.push('headband'); P.hair = pick(['short', 'pony']); break;
      case 'elder': P.top = pick(['#b8a98a', '#8a7a6a', '#6a7a8a']); P.sleeve = 'long'; P.extra.push('buttons'); P.hc = pick(['#d8d4cc', '#a8a4a0', '#e8e4dc']); P.hair = pick(['short', 'bald', 'messy']); break;
      case 'soldier': P.top = '#4b5134'; P.sleeve = 'long'; P.extra.push('camo', 'pack'); P.hat = 'helmet'; break;
    }
    P.r = r;
    return P;
  }
  function makeZombieG(z) {
    const g = el('g', {}, L.zombies);
    if (!z.lk) z.lk = genLook();
    const P = lookParts(z.lk), r = P.r, bw = P.bw;
    z.shirt = P.top; z.skin = P.skin;
    const inner = el('g', {}, g);
    el('ellipse', { cx: .05, cy: .06, rx: .3 * bw, ry: .27, fill: '#000', opacity: .35 }, inner);
    const zshoe = (cy, bare) => { const f = el('ellipse', { cx: 0, cy, rx: .09, ry: .06, fill: bare ? shade(P.skin, -.2) : '#2a2622', stroke: '#000', 'stroke-width': .02 }, inner); return f; };
    const bare = r() < .12; // 신발 한 짝 잃어버림
    z.fl = zshoe(-.1, bare); z.fr = zshoe(.1, false);
    if (P.extra.includes('pack')) el('rect', { x: -.3, y: -.14, width: .15, height: .28, rx: .05, fill: '#3e4430', stroke: '#111', 'stroke-width': .025 }, inner);
    if (P.extra.includes('coat')) el('ellipse', { cx: -.05, cy: 0, rx: .22 * bw, ry: .3 * bw, fill: shade(P.top, -.08), stroke: '#0e0e0d', 'stroke-width': .035 }, inner);
    // 팔
    const sleeveC = P.extra.includes('jacket') ? P.jk : P.extra.includes('coat') ? P.top : P.top;
    z.armL = el('g', {}, inner); z.armR = el('g', {}, inner);
    for (const [ag, sy] of [[z.armL, -1], [z.armR, 1]]) {
      const yy = .19 * sy * bw;
      if (P.noArm === sy) { el('path', { d: `M0 ${yy}L.08 ${yy}`, stroke: shade(sleeveC, -.2), 'stroke-width': .1, 'stroke-linecap': 'round' }, ag); el('circle', { cx: .1, cy: yy, r: .045, fill: '#6e0810' }, ag); continue; }
      if (P.limp === sy) { // 늘어진 팔
        el('path', { d: `M0 ${yy}L-.04 ${yy + .1 * sy}`, stroke: P.sleeve === 'none' ? P.skin : sleeveC, 'stroke-width': .09, 'stroke-linecap': 'round' }, ag);
        el('circle', { cx: -.05, cy: yy + .12 * sy, r: .045, fill: P.skin }, ag);
        continue;
      }
      const up = P.sleeve === 'none' ? P.skin : sleeveC, upEnd = P.sleeve === 'long' ? .3 : .12;
      el('path', { d: `M.18 ${yy}L.42 ${.15 * sy}`, stroke: P.skin, 'stroke-width': .075, 'stroke-linecap': 'round' }, ag);
      el('path', { d: `M0 ${yy}L${upEnd} ${yy - .02 * sy}`, stroke: shade(up, -.15), 'stroke-width': .1, 'stroke-linecap': 'round' }, ag);
      if (r() < .4) el('circle', { cx: .3, cy: .17 * sy, r: .03, fill: '#5e0a10' }, ag); // 팔 상처
      el('path', { d: `M.42 ${.15 * sy}l.07 -.03M.42 ${.15 * sy}l.07 .03M.42 ${.15 * sy}l.08 0`, stroke: shade(P.skin, -.25), 'stroke-width': .025, 'stroke-linecap': 'round' }, ag);
    }
    // 몸통
    const rx = .17 * bw, ry = .28 * bw;
    z.body = el('ellipse', { cx: 0, cy: 0, rx, ry, fill: P.top, stroke: '#0e0e0d', 'stroke-width': .045 }, inner);
    if (P.extra.includes('jacket')) { el('path', { d: `M${rx * .9} ${-ry * .5}L-${rx} ${-ry * .8}L-${rx} ${ry * .8}L${rx * .9} ${ry * .5}L.04 .12L.04 -.12Z`, fill: P.jk, opacity: .95 }, inner); }
    if (P.extra.includes('tie')) el('path', { d: 'M.15 0L-.12 0', stroke: P.tie, 'stroke-width': .045, 'stroke-linecap': 'round' }, inner);
    if (P.extra.includes('badge')) { el('circle', { cx: .06, cy: -.12, r: .03, fill: '#d0b050', stroke: '#6a5a20', 'stroke-width': .01 }, inner); el('rect', { x: -.02, y: .12, width: .06, height: .05, fill: '#111' }, inner); }
    if (P.extra.includes('vest')) { el('ellipse', { cx: 0, cy: 0, rx: rx * .95, ry: ry * .92, fill: '#e87a1e' }, inner); el('path', { d: `M-.1 ${-ry * .8}V${ry * .8}M.04 ${-ry * .85}V${ry * .85}`, stroke: '#dcdcd0', 'stroke-width': .035 }, inner); }
    if (P.extra.includes('camo')) for (let i = 0; i < 5; i++) el('ellipse', { cx: (r() - .5) * rx * 1.4, cy: (r() - .5) * ry * 1.4, rx: .04 + r() * .03, ry: .03 + r() * .02, fill: r() < .5 ? '#3a3f28' : '#6a6a48' }, inner);
    if (P.extra.includes('buttons')) el('path', { d: 'M.06 -.14v.001M.06 -.04v.001M.06 .06v.001M.06 .16v.001', stroke: '#3a3028', 'stroke-width': .035, 'stroke-linecap': 'round' }, inner);
    el('path', { d: `M${-rx} .02l.05 .06l.04 -.07l.05 .08`, stroke: shade(P.top, -.35), 'stroke-width': .03, fill: 'none' }, inner); // 찢김
    // 찢어진 옷 사이 드러난 피부, 흙먼지, 흘러내린 피
    { let dd = ''; for (let i = 0; i < 1 + ((r() * 2) | 0); i++) dd += `M${((r() - .5) * rx).toFixed(3)} ${((r() - .5) * ry * 1.2).toFixed(3)}l.05 .03l-.02 .05l-.05 -.02z`; el('path', { d: dd, fill: P.skin, stroke: shade(P.top, -.4), 'stroke-width': .012 }, inner); }
    { let dd = ''; for (let i = 0; i < 3; i++) dd += circ((r() - .5) * rx * 1.5, (r() - .5) * ry * 1.5, .03 + r() * .035); el('path', { d: dd, fill: '#2a2418', opacity: .25 }, inner); }
    el('path', { d: `M.14 ${((r() - .5) * .06).toFixed(3)}Q.08 .02 ${(-.02 + r() * .06).toFixed(3)} ${((r() - .5) * .14).toFixed(3)}`, stroke: '#5e0a10', 'stroke-width': .03, fill: 'none', 'stroke-linecap': 'round', opacity: .85 }, inner);
    el('path', { d: `M${(-rx * .95).toFixed(3)} -.12l.035 .04l.02 -.05l.03 .06l.02 -.04M${(-rx * .95).toFixed(3)} .1l.03 .05l.03 -.05l.02 .06`, stroke: shade(P.top, -.45), 'stroke-width': .022, fill: 'none' }, inner); // 헤진 밑단
    { let dd = ''; for (let i = 0; i < P.wounds; i++) { const cx = (r() - .6) * rx, cy = (r() - .5) * ry * 1.4, a = .03 + r() * .06, b = .02 + r() * .05; dd += `M${(cx - a).toFixed(3)} ${cy.toFixed(3)}a${a.toFixed(3)} ${b.toFixed(3)} 0 1 0 ${(2 * a).toFixed(3)} 0a${a.toFixed(3)} ${b.toFixed(3)} 0 1 0 ${(-2 * a).toFixed(3)} 0`; } el('path', { d: dd, fill: '#5e0a10', opacity: .9 }, inner); }
    if (P.ribs) { el('ellipse', { cx: .02, cy: -.1, rx: .07, ry: .06, fill: '#3a0508' }, inner); el('path', { d: 'M-.02 -.14h.08M-.02 -.1h.09M-.02 -.06h.08', stroke: '#d8cfc0', 'stroke-width': .015 }, inner); }
    el('ellipse', { cx: -.02, cy: -.02, rx: rx * .55, ry: ry * .6, fill: '#fff', opacity: .07 }, inner); // 가벼운 하이라이트 (그라데이션보다 빠름)
    if (P.extra.includes('hood')) el('path', { d: 'M-.06 -.15Q-.26 -.12 -.26 0Q-.26 .12 -.06 .15', fill: shade(P.top, -.15), stroke: '#0e0e0d', 'stroke-width': .03 }, inner);
    // 머리 (뒤로 늘어진 머리카락 먼저)
    if (!P.hat && P.hair === 'long') el('path', { d: 'M-.05 -.12Q-.24 -.1 -.24 0Q-.24 .1 -.05 .12Z', fill: P.hc, opacity: .95 }, inner);
    if (!P.hat && P.hair === 'pony') el('circle', { cx: -.16, cy: 0, r: .055, fill: P.hc }, inner);
    if (!P.hat) el('path', { d: circ(.05, -.13, .027) + (r() > .15 ? circ(.05, .13, .027) : ''), fill: shade(P.skin, -.15), stroke: '#0e0e0d', 'stroke-width': .014 }, inner); // 귀 (하나 없는 좀비도)
    el('circle', { cx: .04, cy: 0, r: .135, fill: P.skin, stroke: '#0e0e0d', 'stroke-width': .035 }, inner);
    el('path', { d: `M-.04 -.08q.05 .02 .08 -.01M-.03 .06q.05 -.02 .07 .02`, stroke: shade(P.skin, -.3), 'stroke-width': .014, fill: 'none', opacity: .8 }, inner); // 핏줄
    el('path', { d: circ(.13, -.045, .026) + circ(.13, .045, .026), fill: '#1a0a0a' }, inner); // 퀭한 눈
    el('path', { d: circ(.135, -.045, .01) + circ(.135, .045, .01), fill: '#d8d0a0', opacity: .85 }, inner); // 탁한 눈동자
    el('path', { d: 'M.16 -.03Q.19 0 .16 .03', stroke: '#5e0a10', 'stroke-width': .025, fill: 'none' }, inner); // 입가 피
    if (P.hat === 'cap') { el('circle', { cx: .02, cy: 0, r: .14, fill: '#1b2433', stroke: '#000', 'stroke-width': .03 }, inner); el('path', { d: 'M.11 -.1Q.25 0 .11 .1', fill: '#111' }, inner); }
    else if (P.hat === 'hardhat') { el('circle', { cx: .02, cy: 0, r: .155, fill: '#e0b020', stroke: '#6a5010', 'stroke-width': .03 }, inner); el('path', { d: 'M-.1 0H.14', stroke: '#b08818', 'stroke-width': .03 }, inner); }
    else if (P.hat === 'helmet') { el('circle', { cx: .02, cy: 0, r: .16, fill: '#3e4430', stroke: '#1a1d12', 'stroke-width': .035 }, inner); el('circle', { cx: -.02, cy: -.05, r: .03, fill: '#4e5440' }, inner); }
    else if (P.hair === 'short') el('path', { d: 'M-.08 -.08A.13 .13 0 0 1 .06 -.12Q0 0 .06 .11A.13 .13 0 0 1 -.08 .08Z', fill: P.hc, opacity: .92 }, inner);
    else if (P.hair === 'messy') el('path', { d: 'M-.09 -.08l.05 -.06l.03 .04l.05 -.06l.02 .07L.06 -.1Q0 0 .06 .1l-.04 .02l-.03 -.05l-.04 .06l-.04 -.06l-.05 .03Z', fill: P.hc, opacity: .92 }, inner);
    else if (P.hair === 'long' || P.hair === 'pony') el('path', { d: 'M-.08 -.08A.13 .13 0 0 1 .06 -.12Q0 0 .06 .11A.13 .13 0 0 1 -.08 .08Z', fill: P.hc, opacity: .92 }, inner);
    el('circle', { cx: .02, cy: -.02, r: .075, fill: '#fff', opacity: .08 }, inner);
    if (P.extra.includes('headband')) el('path', { d: 'M.03 -.13Q-.05 0 .03 .13', stroke: '#e8e4dc', 'stroke-width': .04, fill: 'none' }, inner);
    if (P.extra.includes('mask')) el('rect', { x: .1, y: -.07, width: .07, height: .14, rx: .02, fill: '#9ec4d0', opacity: .9 }, inner);
    if (r() < .25) el('circle', { cx: (r() - .3) * .1, cy: (r() - .5) * .16, r: .035, fill: shade(P.skin, -.35), opacity: .85 }, inner); // 썩은 반점
    z.inner = inner;
    g.remove(); // 보일 때만 화면에 붙임 (안 보이는 좀비는 그리기 대상에서 빠짐)
    z.g = g; z.vis = false;
    z.wph = rand() * 6;
  }
  function shade(hex, k) {
    const n = parseInt(hex.slice(1), 16);
    const f = c => Math.round(clamp(k < 0 ? c * (1 + k) : c + (255 - c) * k, 0, 255));
    return '#' + [f(n >> 16 & 255), f(n >> 8 & 255), f(n & 255)].map(v => v.toString(16).padStart(2, '0')).join('');
  }
  function addZombie(x, y, hp, shirt, skin, bw, lk) {
    const shirts = ['#4b5563', '#5c4a3a', '#3f4a3a', '#5a3a3a', '#3a4458', '#6b6b6b'];
    const z = { x, y, r: .3, hp: hp || 3, face: rand() * TAU, state: 'idle', cd: 0, think: rand() * .3,
      stun: 0, down: 0, path: null, pi: 0, repath: 0, wander: rand() * 6, tx: x, ty: y, lostT: 0,
      spdMul: .85 + rand() * .3, dead: false, shirt: shirt || shirts[(rand() * shirts.length) | 0], lk: lk || null, flash: 0, queued: false };
    makeZombieG(z);
    G.zombies.push(z);
    return z;
  }
  function spawnZombies(n, minD, avoidVisible) {
    const W = M.W, p = G.p;
    let made = 0;
    for (let tries = 0; made < n && tries < n * 60; tries++) {
      const x = 1 + ((rand() * (W - 2)) | 0), y = 1 + ((rand() * (M.H - 2)) | 0);
      if (M.moveBlock[y * W + x]) continue;
      const cx = x + .5, cy = y + .5;
      if (Math.hypot(cx - p.x, cy - p.y) < minD) continue;
      if (avoidVisible && Math.hypot(cx - p.x, cy - p.y) < V.R + 2) continue;
      addZombie(cx, cy, 2.6 + rand() * .8);
      made++;
    }
  }
  const CORPSE = 100000;
  const isCorpse = ci => ci >= CORPSE;
  const corpseOf = ci => G.corpses.find(c => c.id === ci - CORPSE);
  const PLACED = 200000;
  const isPlacedC = ci => ci >= PLACED;
  const placedOf = ci => G.placed.find(b => b.id === ci - PLACED);
  const cItems = ci => isPlacedC(ci) ? ((placedOf(ci) || {}).items || []) : isCorpse(ci) ? ((corpseOf(ci) || {}).items || []) : G.containers[ci];
  const cName = ci => isPlacedC(ci) ? FURN[(placedOf(ci) || {}).kind][0] : isCorpse(ci) ? '시체' : LOOT[M.containers[ci].kind].name;
  const cPos = ci => { if (isPlacedC(ci)) { const b = placedOf(ci); return b ? [b.x + .5, b.y + .5] : [-99, -99]; } if (isCorpse(ci)) { const c = corpseOf(ci); return c ? [c.x, c.y] : [-99, -99]; } const c = M.containers[ci]; return [c.x + .5, c.y + .5]; };
  const cSearched = ci => isPlacedC(ci) ? true : isCorpse(ci) ? !!(corpseOf(ci) || {}).searched : G.searched.has(ci);
  // 좀비 소지품: 입던 옷 + 가끔 생존 물품
  const CORPSE_POOL = [['shirt', 2.2], ['cloth', 1.4], ['chips', .8], ['water', .6], ['bandage', .9], ['pills', .5], ['apple', .6], ['soda', .5], ['nails', .4], ['tape', .35], ['ammo', .3], ['knife', .25], ['screwdriver', .2]];
  function rollCorpse() {
    const out = [];
    if (rand() < .55) out.push(mkItem('shirt'));
    const n = rand() < .35 ? 0 : rand() < .75 ? 1 : 2;
    const tot = CORPSE_POOL.reduce((s, q) => s + q[1], 0);
    for (let i = 0; i < n; i++) { let x = rand() * tot; for (const [id, w] of CORPSE_POOL) { x -= w; if (x <= 0) { out.push(mkItem(id)); break; } } }
    return out;
  }
  const JOB_LOOT = { police: [['ammo', .5], ['pistol', .12]], medic: [['bandage', .7], ['pills', .6]], worker: [['hammer', .3], ['nails', .6], ['screwdriver', .3]], soldier: [['ammo', .7], ['bandage', .4], ['can', .4]], office: [['soda', .3], ['chips', .3]], elder: [['pills', .5]], jogger: [['water', .6]] };
  function rollCorpseFor(lk) {
    const out = rollCorpse();
    for (const [id, pr] of (lk && JOB_LOOT[lk.ty]) || []) if (rand() < pr) out.push(mkItem(id));
    return out;
  }
  function addCorpse(x, y, a, shirt, items, searched, id, lk) {
    const g0 = el('g', { transform: `translate(${x.toFixed(2)} ${y.toFixed(2)}) rotate(${(a * 180 / Math.PI).toFixed(0)})` }, L.decals);
    const g = el('g', { transform: `scale(${SPEC.corpse})` }, g0);
    el('path', { d: `M-.55 .05Q-.3 -.4 .1 -.32Q.55 -.3 .6 .05Q.5 .42 0 .38Q-.5 .4 -.55 .05Z`, fill: '#4a060b', opacity: .85 }, g);
    const P = lk ? lookParts(lk) : null;
    const sc = P ? P.top : (shirt || '#4b5563'), sk = P ? P.skin : '#6f7a60';
    el('path', { d: 'M-.05 -.16L-.4 -.34M-.05 .16L-.36 .38', stroke: sk, 'stroke-width': .07, 'stroke-linecap': 'round' }, g); // 팔
    el('path', { d: 'M-.3 -.08L-.62 -.14M-.3 .08L-.6 .2', stroke: '#2e2a26', 'stroke-width': .09, 'stroke-linecap': 'round' }, g); // 다리
    el('ellipse', { cx: -.05, cy: 0, rx: .3, ry: .18, fill: sc, stroke: '#000', 'stroke-width': .035 }, g);
    if (P && P.extra.includes('vest')) el('path', { d: 'M-.2 -.16V.16M0 -.17V.17', stroke: '#e87a1e', 'stroke-width': .07 }, g);
    if (P && P.extra.includes('tie')) el('path', { d: 'M.2 0H-.1', stroke: P.tie, 'stroke-width': .04 }, g);
    el('ellipse', { cx: -.1, cy: .04, rx: .05, ry: .04, fill: '#5e0a10' }, g);
    el('ellipse', { cx: -.05, cy: 0, rx: .3, ry: .18, fill: 'url(#volG)' }, g);
    el('circle', { cx: .33, cy: .02, r: .12, fill: sk, stroke: '#000', 'stroke-width': .035 }, g);
    el('circle', { cx: .33, cy: .02, r: .12, fill: 'url(#volG)' }, g);
    el('path', { d: 'M.6 .12q.15 .05 .25 .18', stroke: '#4a060b', 'stroke-width': .05, fill: 'none', 'stroke-linecap': 'round', opacity: .7 }, g); // 흐른 피
    if (P && P.hat) el('circle', { cx: .45, cy: -.08, r: .1, fill: P.hat === 'hardhat' ? '#e0b020' : P.hat === 'helmet' ? '#3e4430' : '#1b2433', stroke: '#000', 'stroke-width': .025 }, g); // 벗겨진 모자
    else if (P && P.hair !== 'bald') el('path', { d: 'M.24 -.07A.12 .12 0 0 1 .3 -.1Q.26 .02 .3 .13A.12 .12 0 0 1 .24 .1Z', fill: P.hc }, g);
    G.cid = Math.max(G.cid || 0, (id || 0) + 1);
    const c = { id: id != null ? id : G.cid++, x, y, a, shirt, g: g0, items: items || [], searched: !!searched, lk: lk || null };
    G.corpses.push(c);
    if (c.searched && !c.items.length) g0.setAttribute('opacity', .55);
    if (G.corpses.length > 70) { const o = G.corpses.shift(); o.g.remove(); if (G.openC === CORPSE + o.id) closeSheet(); }
  }

  /* ================= 충돌·시야 ================= */
  // 문·창문 상태 초기값: 바깥문은 닫힘, 안쪽 문은 열림, 창문은 멀쩡함
  function initOpenings(saved) {
    G.ds = saved || {};
    for (const o of M.op) {
      if (!G.ds[o.k]) G.ds[o.k] = o.type === 'door' ? { o: o.interior ? 1 : 0, h: DOOR_HP, br: 0, b: [] } : { h: WIN_HP, br: 0, b: [] };
      updTile(o.k, true);
    }
    G.dsV = (G.dsV || 0) + 1;
  }
  function updTile(k, noVer) {
    const o = M.opAt[k], s = G.ds[k]; if (!o || !s) return;
    const nb = s.b.length;
    let block, sight, cost;
    if (o.type === 'door') { block = (!s.o && !s.br) || nb > 0; sight = block; cost = block ? 6 + nb * 4 : 0; }
    else { block = !s.br || nb > 0; sight = nb >= 2; cost = block ? 9 + nb * 4 : 3; }
    M.dynBlock[k] = block ? 1 : 0; M.dynSight[k] = sight ? 1 : 0; AS.cost[k] = cost;
    drawOpening(o);
    if (!noVer) G.dsV++;
  }
  function resolve(e) {
    const W = M.W, B = M.moveBlock, D = M.dynBlock, r = e.r;
    for (let it = 0; it < 2; it++) {
      const x0 = Math.floor(e.x - r), x1 = Math.floor(e.x + r), y0 = Math.floor(e.y - r), y1 = Math.floor(e.y + r);
      for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
        if (tx < 0 || ty < 0 || tx >= W || ty >= M.H || !(B[ty * W + tx] || D[ty * W + tx])) continue;
        const cx = clamp(e.x, tx, tx + 1), cy = clamp(e.y, ty, ty + 1);
        const dx = e.x - cx, dy = e.y - cy, d2 = dx * dx + dy * dy;
        if (d2 >= r * r) continue;
        if (d2 > 1e-9) { const d = Math.sqrt(d2), k = (r - d) / d; e.x += dx * k; e.y += dy * k; }
        else {
          const l = e.x - tx, rr = tx + 1 - e.x, t = e.y - ty, b = ty + 1 - e.y, m = Math.min(l, rr, t, b);
          if (m === l) e.x = tx - r; else if (m === rr) e.x = tx + 1 + r; else if (m === t) e.y = ty - r; else e.y = ty + 1 + r;
        }
      }
    }
  }
  function lineClear(x0, y0, x1, y1, B, B2) {
    const W = M.W;
    let x = Math.floor(x0), y = Math.floor(y0);
    const ex = Math.floor(x1), ey = Math.floor(y1);
    const dx = x1 - x0, dy = y1 - y0;
    const sx = dx > 0 ? 1 : -1, sy = dy > 0 ? 1 : -1;
    const tdx = dx !== 0 ? Math.abs(1 / dx) : Infinity, tdy = dy !== 0 ? Math.abs(1 / dy) : Infinity;
    let tmx = dx !== 0 ? (dx > 0 ? (x + 1 - x0) : (x0 - x)) * tdx : Infinity;
    let tmy = dy !== 0 ? (dy > 0 ? (y + 1 - y0) : (y0 - y)) * tdy : Infinity;
    for (let n = 0; n < 300; n++) {
      if (x === ex && y === ey) return true;
      if (tmx < tmy) { x += sx; tmx += tdx; } else { y += sy; tmy += tdy; }
      if (x === ex && y === ey) return true;
      if (x < 0 || y < 0 || x >= W || y >= M.H || B[y * W + x] || (B2 && B2[y * W + x])) return false;
    }
    return true;
  }
  const losClear = (a, b, c, d) => lineClear(a, b, c, d, M.sightBlock, M.dynSight);
  const moveClear = (a, b, c, d) => lineClear(a, b, c, d, M.moveBlock, M.dynBlock);
  function rayDist(x0, y0, a, maxD) {
    const W = M.W, B = M.sightBlock, B2 = M.dynSight;
    const dx = Math.cos(a), dy = Math.sin(a);
    let x = Math.floor(x0), y = Math.floor(y0);
    const sx = dx > 0 ? 1 : -1, sy = dy > 0 ? 1 : -1;
    const tdx = Math.abs(dx) > 1e-9 ? Math.abs(1 / dx) : Infinity, tdy = Math.abs(dy) > 1e-9 ? Math.abs(1 / dy) : Infinity;
    let tmx = tdx !== Infinity ? (dx > 0 ? (x + 1 - x0) : (x0 - x)) * tdx : Infinity;
    let tmy = tdy !== Infinity ? (dy > 0 ? (y + 1 - y0) : (y0 - y)) * tdy : Infinity;
    for (let n = 0; n < 80; n++) {
      let t;
      if (tmx < tmy) { t = tmx; x += sx; tmx += tdx; } else { t = tmy; y += sy; tmy += tdy; }
      if (t >= maxD) return maxD;
      if (x < 0 || y < 0 || x >= W || y >= M.H || B[y * W + x] || B2[y * W + x]) return Math.min(maxD, t + .45);
    }
    return maxD;
  }
  function inVision(x, y) {
    const p = G.p;
    if (G.sleeping) return false;
    const dx = x - p.x, dy = y - p.y, d = Math.hypot(dx, dy);
    if (d > V.R) return false;
    if (d > Math.min(V.near, V.R) && Math.abs(angDiff(Math.atan2(dy, dx), p.face)) > V.cone) return false;
    return losClear(p.x, p.y, x, y);
  }

  /* ================= 소리 ================= */
  function noise(x, y, r, visual, except) {
    r *= 1 - .35 * (G.rain || 0); // 빗소리가 소음을 덮음
    for (const z of G.zombies) {
      if (z.dead || z === except || z.bashT > 0) continue;
      const d = Math.hypot(z.x - x, z.y - y);
      if (d > r) continue;
      if (z.state === 'chase' && z.lostT === 0) continue;
      z.state = z.state === 'chase' ? 'chase' : 'investigate';
      z.tx = x + (rand() - .5) * 2; z.ty = y + (rand() - .5) * 2;
      z.path = null; requestPath(z);
    }
    if (visual) addFx('ring', { x, y, r });
  }

  /* ================= 경로 ================= */
  function requestPath(z) {
    if (z.queued) return;
    z.queued = true; pathQueue.push(z);
  }
  function processPaths() {
    let budget = 8;
    while (budget-- > 0 && pathQueue.length) {
      const z = pathQueue.shift();
      z.queued = false;
      if (z.dead) continue;
      const tx = clamp(Math.floor(z.tx), 0, M.W - 1), ty = clamp(Math.floor(z.ty), 0, M.H - 1);
      const path = AS.find(Math.floor(z.x), Math.floor(z.y), tx, ty, 2600);
      z.path = path; z.pi = 0; z.repath = .7 + rand() * .3;
      z.goalKey = ty * M.W + tx;
      if (!path && z.state === 'investigate') z.state = 'idle';
    }
  }
  function followPath(z, spd, dt) {
    if (!z.path || z.pi >= z.path.length) return true;
    const wp = z.path[z.pi];
    const tx = wp[0] + .5, ty = wp[1] + .5;
    const dx = tx - z.x, dy = ty - z.y, d = Math.hypot(dx, dy);
    const wk = wp[1] * M.W + wp[0];
    if (M.dynBlock[wk]) {
      if (z.state === 'idle') { z.path = null; return true; }
      if (d < 1.05) { // 문/창문 앞: 두드림
        z.face += angDiff(Math.atan2(dy, dx), z.face) * Math.min(1, dt * 8);
        z.bashT = (z.bashT == null ? .6 : z.bashT) - dt; z.stuckT = 0;
        if (z.bashT <= 0) { z.bashT = 1 + rand() * .4; bashTile(wk, z); }
        return false;
      }
    }
    z.bashT = null;
    if (d < .18) { z.pi++; z.stuckT = 0; return z.pi >= z.path.length; }
    z.stuckT = (z.stuckT || 0) + dt;
    if (z.stuckT > 2.5) { z.stuckT = 0; z.path = null; if (z.state === 'investigate' && rand() < .5) z.state = 'idle'; else requestPath(z); return false; }
    steer(z, dx / d, dy / d, spd, dt);
    return false;
  }
  function steer(z, nx, ny, spd, dt) {
    if (M.t[Math.floor(z.y) * M.W + Math.floor(z.x)] === DT.T.WINDOW) spd *= .3; // 창틀 넘는 중
    z.x += nx * spd * dt; z.y += ny * spd * dt;
    z.face += angDiff(Math.atan2(ny, nx), z.face) * Math.min(1, dt * 8);
    resolve(z);
  }

  function bashTile(k, z) {
    const o = M.opAt[k], s = G.ds[k]; if (!o || !s) return;
    const cx = o.x + .5, cy = o.y + .5;
    noise(cx, cy, 9, false, z);
    if (s.b.length) {
      s.b[s.b.length - 1]--;
      SFX.at('thump', cx, cy, { range: 16 }); shakeAt(.12, cx, cy, 7);
      if (s.b[s.b.length - 1] <= 0) { shakeAt(.35, cx, cy, 10); s.b.pop(); SFX.at('boardBreak', cx, cy, { range: 16 }); if (inVision(cx, cy)) toast('판자가 부서졌다!'); }
    } else if (o.type === 'door') {
      s.h--; SFX.at('thump', cx, cy, { range: 18 }); shakeAt(.12, cx, cy, 7);
      if (s.h <= 0) { shakeAt(.45, cx, cy, 10); s.br = 1; SFX.at('boardBreak', cx, cy, { range: 18 }); if (inVision(cx, cy)) toast('문이 부서졌다!'); }
    } else {
      s.h--; SFX.at('thump', cx, cy, { range: 12, vol: .7 });
      if (s.h <= 0) { s.br = 1; SFX.at('glass', cx, cy, { range: 18 }); }
    }
    updTile(k);
  }

  /* ================= 무기 ================= */
  function curWeapon() {
    const p = G.p;
    const item = p.equip != null ? p.inv.find(i => i.uid === p.equip) : null;
    if (!item) { p.equip = null; return { def: FISTS, item: null }; }
    return { def: ITEMS[item.id], item };
  }
  function ammoItem() { return G.p.inv.find(i => i.id === 'ammo' && i.n > 0); }

  function playerAttack() {
    const p = G.p;
    if (p.cd > 0 || G.sleeping || G.dead) return;
    if (G.actions.length) cancelActions('행동을 멈췄다');
    const w = curWeapon(), def = w.def;
    let target = null, best = 1e9;
    const reach = def.type === 'gun' ? def.range : def.range + 1.8;
    for (const z of G.zombies) {
      if (z.dead) continue;
      const d = Math.hypot(z.x - p.x, z.y - p.y);
      if (d > reach) continue;
      if (!z.vis && !(def.type !== 'gun' && d < def.range + 1.2 && losClear(p.x, p.y, z.x, z.y))) continue;
      const ad = Math.abs(angDiff(Math.atan2(z.y - p.y, z.x - p.x), p.face));
      if (def.type !== 'gun' && ad > 1.9 && d > def.range + .3) continue;
      const s = d + ad * .9;
      if (s < best) { best = s; target = z; }
    }
    if (target) p.face = Math.atan2(target.y - p.y, target.x - p.x);
    p.atkT = .18;

    if (def.type === 'gun') {
      const am = ammoItem();
      p.cd = p.cdMax = def.cd;
      if (!am) { toast('탄약이 없다'); SFX.play('click'); return; }
      SFX.play('gun', { rev: .9 });
      am.n--; if (am.n <= 0) p.inv.splice(p.inv.indexOf(am), 1);
      noise(p.x, p.y, def.noise, true);
      shake(.38, p.face + Math.PI, 7);
      let hitZ = null;
      if (target && rand() < .85 + .03 * skillLv('gun') - Math.hypot(target.x - p.x, target.y - p.y) * .035) hitZ = target;
      if (hitZ) gainXP('gun', 2);
      const rd = rayDist(p.x, p.y, p.face, def.range);
      const ex = hitZ ? hitZ.x : p.x + Math.cos(p.face) * rd;
      const ey = hitZ ? hitZ.y : p.y + Math.sin(p.face) * rd;
      addFx('tracer', { x1: p.x + Math.cos(p.face) * .5, y1: p.y + Math.sin(p.face) * .5, x2: ex, y2: ey });
      addFx('muzzle', { x: p.x + Math.cos(p.face) * .62, y: p.y + Math.sin(p.face) * .62, a: p.face });
      if (hitZ) damageZombie(hitZ, def.dmg * (.9 + rand() * .3), p.face, .4, true);
      return;
    }
    const tired = p.endu < 10 ? .6 : 1;
    p.cd = p.cdMax = def.cd * (p.endu < 10 ? 1.4 : 1);
    p.endu = Math.max(0, p.endu - def.endu * (1 - .04 * skillLv('melee')));
    addFx('swing', { x: p.x, y: p.y, a: p.face, r: def.range + .3 });
    SFX.play('swing', { heavy: def.knock >= .35, vol: .9 });
    noise(p.x, p.y, 3.5, false);
    p.noiseR = Math.max(p.noiseR, 3.5);
    let hits = 0;
    for (const z of G.zombies) {
      if (z.dead) continue;
      const d = Math.hypot(z.x - p.x, z.y - p.y);
      if (d > def.range + .32) continue;
      if (Math.abs(angDiff(Math.atan2(z.y - p.y, z.x - p.x), p.face)) > .95) continue;
      if (!losClear(p.x, p.y, z.x, z.y)) continue;
      let dmg = def.dmg * (.85 + rand() * .3) * tired * (1 + .06 * skillLv('melee'));
      if (z.down > 0) dmg *= 2;
      if (rand() < .12 + .015 * skillLv('melee')) dmg *= 1.8;
      gainXP('melee', 1.5);
      damageZombie(z, dmg, p.face, def.knock, rand() < def.knock * .5);
      hits++;
      if (hits >= 2) break;
    }
    if (hits) { shake(.2 + .06 * hits, p.face, 3.5); G.hitStop = .055; SFX.play(!w.item ? 'hitFist' : (w.item.id === 'knife' || w.item.id === 'spear' ? 'hitBlade' : 'hitBlunt')); }
    if (hits && w.item && w.item.dur != null) {
      w.item.dur--;
      if (w.item.dur <= 0) {
        p.inv.splice(p.inv.indexOf(w.item), 1); p.equip = null;
        toast(def.name + '이(가) 부서졌다'); updateWeaponLook(); SFX.play('breakw');
      }
    }
  }
  function damageZombie(z, dmg, a, knock, knockDown) {
    z.hp -= dmg; z.flash = .12; z.stun = .45;
    z.state = 'chase'; z.lostT = 0; z.tx = G.p.x; z.ty = G.p.y;
    z.x += Math.cos(a) * knock; z.y += Math.sin(a) * knock; resolve(z);
    if (knockDown) z.down = 1.4;
    addFx('blood', { x: z.x, y: z.y, a });
    if (z.hp <= 0) {
      z.dead = true; z.g.remove(); G.kills++;
      gainXP(curWeapon().def.type === 'gun' ? 'gun' : 'melee', 3);
      shake(.15);
      SFX.at('kill', z.x, z.y, { range: 16 });
      addCorpse(z.x, z.y, a, z.shirt, rollCorpseFor(z.lk), false, undefined, z.lk);
    }
  }

  /* ================= 좀비 AI ================= */
  function updateZombies(dt) {
    const p = G.p, night = G.night;
    const sightR = lerp(8.5, 6, night);
    G.fc = (G.fc || 0) + 1;
    for (let zi = 0; zi < G.zombies.length; zi++) {
      const z = G.zombies[zi];
      if (z.dead) continue;
      let dtz = dt;
      const md = Math.abs(z.x - p.x) + Math.abs(z.y - p.y);
      if (z.state !== 'chase' && md > 30) { // 멀리 있는 좀비는 가끔만 계산 (큰 맵 성능)
        const every = md > 60 ? 8 : 3;
        if ((G.fc + zi) % every) continue;
        dtz = dt * every;
      }
      stepZombie(z, dtz, p, night, sightR);
    }
    function stepZombie(z, dt, p, night, sightR) {
      z.cd -= dt; z.think -= dt; z.repath -= dt;
      if (z.flash > 0) z.flash -= dt;
      if (z.down > 0) { z.down -= dt; return; }
      if (z.stun > 0) { z.stun -= dt; return; }
      const dx = p.x - z.x, dy = p.y - z.y, d = Math.hypot(dx, dy);
      if (z.think <= 0) {
        z.think = .22 + rand() * .15;
        const sr = sightR * (G.sleeping ? .55 : 1);
        const facing = Math.abs(angDiff(Math.atan2(dy, dx), z.face)) < 1.7;
        if (d < sr && (d < 2.5 || facing) && losClear(z.x, z.y, p.x, p.y)) {
          if (z.state !== 'chase') { z.state = 'chase'; z.path = null; if (!z.alerted || G.time - z.alerted > 20) { z.alerted = G.time; SFX.at('alert', z.x, z.y, { range: 16 }); } }
          z.lostT = 0; z.tx = p.x; z.ty = p.y;
        } else if (z.state === 'chase') {
          z.lostT += .3;
          if (z.lostT > 5) { z.state = 'investigate'; z.path = null; requestPath(z); }
        }
      }
      let spd;
      if (z.state === 'chase') {
        spd = (night > .5 ? 1.5 : 1.15) * z.spdMul;
        if (z.lostT === 0 && d < 6 && moveClear(z.x, z.y, p.x, p.y)) {
          if (d > .6) steer(z, dx / d, dy / d, spd, dt);
          else z.face += angDiff(Math.atan2(dy, dx), z.face) * Math.min(1, dt * 8);
          z.path = null;
        } else {
          const key = Math.floor(z.ty) * M.W + Math.floor(z.tx);
          if ((!z.path || z.goalKey !== key) && z.repath <= 0) requestPath(z);
          const done = followPath(z, spd, dt);
          if (done && z.lostT > 0 && z.path) { z.state = 'idle'; z.wander = 2 + rand() * 4; z.path = null; }
        }
        if (d < .75 && z.cd <= 0 && z.lostT === 0) { z.cd = 1.3 + rand() * .3; zombieAttack(z); }
      } else if (z.state === 'investigate') {
        spd = .8 * z.spdMul;
        if (!z.path && !z.queued) requestPath(z);
        if (z.path && followPath(z, spd, dt)) { z.state = 'idle'; z.path = null; z.wander = 3 + rand() * 5; }
      } else {
        spd = .4 * z.spdMul;
        z.wander -= dt;
        if (z.wander <= 0) {
          z.wander = 5 + rand() * 9;
          if (rand() < .6) {
            for (let k = 0; k < 6; k++) {
              const tx = Math.floor(z.x + (rand() - .5) * 10), ty = Math.floor(z.y + (rand() - .5) * 10);
              if (tx > 0 && ty > 0 && tx < M.W - 1 && ty < M.H - 1 && !M.moveBlock[ty * M.W + tx]) { z.tx = tx + .5; z.ty = ty + .5; requestPath(z); break; }
            }
          }
        }
        if (z.path && followPath(z, spd, dt)) z.path = null;
      }
    }
    const zs = G.zombies;
    for (let i = 0; i < zs.length; i++) {
      const a = zs[i]; if (a.dead) continue;
      if (Math.abs(a.x - p.x) > 22 || Math.abs(a.y - p.y) > 22) continue;
      for (let j = i + 1; j < zs.length; j++) {
        const b = zs[j]; if (b.dead) continue;
        const dx = b.x - a.x, dy = b.y - a.y;
        if (dx > .6 || dx < -.6 || dy > .6 || dy < -.6) continue;
        const d = Math.hypot(dx, dy);
        if (d < .56 && d > 1e-6) { const k = (.56 - d) / d * .5; a.x -= dx * k; a.y -= dy * k; b.x += dx * k; b.y += dy * k; }
      }
      const dx = a.x - p.x, dy = a.y - p.y, d = Math.hypot(dx, dy);
      if (d < .55 && d > 1e-6) { const k = (.55 - d) / d; a.x += dx * k; a.y += dy * k; }
      resolve(a);
    }
    if (rand() < .02 && G.zombies.some(z => z.dead)) G.zombies = G.zombies.filter(z => !z.dead);
  }
  function zombieAttack(z) {
    const p = G.p;
    if (G.sleeping) wake('좀비에게 습격당했다!');
    const a = Math.atan2(z.y - p.y, z.x - p.x);
    if (Math.hypot(input.jx + input.kx, input.jy + input.ky) < .12) p.face = a;
    const hit = rand() <= (G.night > .5 ? .6 : .5);
    SFX.at('growl', z.x, z.y, { range: 10 });
    G.dmgInd.push({ a, t: 0, hit });
    if (G.dmgInd.length > 4) G.dmgInd.shift();
    if (!hit) return;
    if (G.actions.length) cancelActions('공격받아 행동이 끊겼다');
    const dmg = 5 + rand() * 6;
    p.hp -= dmg;
    hurtFlash();
    shake(.6, a + Math.PI, 10);
    const r = rand();
    SFX.play(r < .07 ? 'bite' : 'hurt');
    if (r < .07) { if (!p.infected) { p.infected = true; p.infT = 0; } p.bleed = true; toast('물렸다…', 2600); }
    else if (r < .37) { if (!p.bleed) toast('긁혔다 — 출혈'); p.bleed = true; }
    else toast('공격당했다');
  }

  /* ================= 이펙트 ================= */
  function addFx(kind, o) {
    let e, life;
    if (kind === 'swing') {
      const a1 = o.a - .85, a2 = o.a + .85;
      e = el('path', { d: `M${o.x + Math.cos(a1) * o.r} ${o.y + Math.sin(a1) * o.r}A${o.r} ${o.r} 0 0 1 ${o.x + Math.cos(a2) * o.r} ${o.y + Math.sin(a2) * o.r}`,
        stroke: '#fff', 'stroke-width': .09, fill: 'none', 'stroke-linecap': 'round' }, L.fx);
      life = .16;
    } else if (kind === 'blood') {
      // 맞은 방향으로 피가 튐
      e = el('g', {}, L.fx);
      o.parts = [];
      const a0 = o.a != null ? o.a : rand() * TAU;
      for (let i = 0; i < 9; i++) {
        const a = a0 + (rand() - .5) * 1.4, v = 1.2 + rand() * 2.2;
        const c = el('circle', { cx: o.x, cy: o.y, r: .03 + rand() * .06, fill: i % 3 ? '#b3101c' : '#6e0810' }, e);
        o.parts.push({ c, x: o.x, y: o.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v });
      }
      life = .45;
      // 바닥 핏자국 (튄 방향으로 길게)
      const bx = o.x + Math.cos(a0) * .35, by = o.y + Math.sin(a0) * .35;
      const s2 = el('ellipse', { cx: bx, cy: by, rx: .22 + rand() * .15, ry: .1 + rand() * .06, fill: '#5a070c', opacity: .75, transform: `rotate(${(a0 * 180 / Math.PI).toFixed(0)} ${bx.toFixed(2)} ${by.toFixed(2)})` }, L.decals);
      G.splats = (G.splats || []); G.splats.push(s2); if (G.splats.length > 120) G.splats.shift().remove();
      const s = el('circle', { cx: o.x + (rand() - .5) * .4, cy: o.y + (rand() - .5) * .4, r: .12 + rand() * .12, fill: '#5a070c', opacity: .7 }, L.decals);
      G.splats = (G.splats || []); G.splats.push(s); if (G.splats.length > 120) G.splats.shift().remove();
    } else if (kind === 'muzzle') {
      e = el('g', { transform: `translate(${o.x} ${o.y}) rotate(${(o.a * 180 / Math.PI).toFixed(0)})` }, L.fx);
      el('path', { d: 'M0 0L.45 -.1L.3 0L.45 .1Z', fill: '#ffe9a0' }, e);
      el('circle', { cx: .05, cy: 0, r: .16, fill: '#fff4c8' }, e);
      life = .07;
      G.flashT = Math.max(G.flashT || 0, .08);
    } else if (kind === 'tracer') {
      e = el('line', { x1: o.x1, y1: o.y1, x2: o.x2, y2: o.y2, stroke: '#ffe27a', 'stroke-width': .06 }, L.fx);
      life = .1;
    } else if (kind === 'ring') {
      e = el('circle', { cx: o.x, cy: o.y, r: .5, stroke: '#c8141f', 'stroke-width': .1, fill: 'none' }, L.fx);
      life = .7; o.maxR = Math.min(o.r, 10);
    }
    G.fx.push({ kind, e, t: 0, life, o });
  }
  function updateFx(dt) {
    for (const f of G.fx) {
      f.t += dt;
      const k = f.t / f.life;
      f.e.setAttribute('opacity', Math.max(0, 1 - k).toFixed(2));
      if (f.kind === 'ring') f.e.setAttribute('r', (.5 + k * f.o.maxR).toFixed(2));
      if (f.o.parts) for (const q of f.o.parts) { q.x += q.vx * dt; q.y += q.vy * dt; q.vx *= .9; q.vy *= .9; q.c.setAttribute('cx', q.x.toFixed(2)); q.c.setAttribute('cy', q.y.toFixed(2)); }
      if (k >= 1) f.e.remove();
    }
    G.fx = G.fx.filter(f => f.t < f.life);
    for (const d of G.dmgInd) d.t += dt;
    G.dmgInd = G.dmgInd.filter(d => d.t < .9);
    G.trauma = Math.max(0, (G.trauma || 0) - dt * 1.5);
    const kd = Math.pow(.0005, dt); G.kx = (G.kx || 0) * kd; G.ky = (G.ky || 0) * kd; // 반동은 빠르게 원위치
  }
  // 화면 흔들림: 충격(trauma) 누적 + 방향 반동(kick). 강도는 trauma² 로 부드럽게
  let shakeOn = true;
  try { shakeOn = localStorage.getItem('deadtown_shake') !== '0'; } catch (e) {}
  function shake(amount, ang, kick) {
    if (!shakeOn || !G) return;
    G.trauma = Math.min(1, (G.trauma || 0) + amount);
    if (ang != null && kick) { G.kx = (G.kx || 0) + Math.cos(ang) * kick; G.ky = (G.ky || 0) + Math.sin(ang) * kick; }
  }
  function shakeAt(amount, x, y, range) {
    const d = Math.hypot(x - G.p.x, y - G.p.y);
    if (d < range) shake(amount * (1 - d / range), Math.atan2(G.p.y - y, G.p.x - x), 4 * (1 - d / range));
  }
  let hurtTO = 0;
  function hurtFlash() {
    const h = $('hurt'); h.style.transition = 'none'; h.style.opacity = 1;
    clearTimeout(hurtTO);
    hurtTO = setTimeout(() => { h.style.transition = 'opacity .5s'; h.style.opacity = 0; }, 60);
    if (navigator.vibrate) try { navigator.vibrate(60); } catch (e) {}
  }
  let toastTO = 0;
  function toast(msg, ms) {
    const t = $('toast'); t.textContent = msg; t.classList.add('on');
    clearTimeout(toastTO); toastTO = setTimeout(() => t.classList.remove('on'), ms || 1800);
  }

  /* ================= 메인 업데이트 ================= */
  function nightLevel(min) {
    const h = (min / 60) % 24;
    if (h >= 21 || h < 5) return 1;
    if (h >= 19) return (h - 19) / 2;
    if (h < 7) return 1 - (h - 5) / 2;
    return 0;
  }
  function invWeight() { return G.p.inv.reduce((s, i) => s + (i.w != null ? i.w : ITEMS[i.id].w) * (i.n || 1), 0); }

  function update(dt) {
    const p = G.p;
    const scale = G.sleeping ? 30 : 1;
    const dm = dt * scale;
    G.time += dm;
    G.night = nightLevel(G.time);

    let mx = input.jx + input.kx, my = input.jy + input.ky;
    let mag = Math.hypot(mx, my);
    if (mag > 1) { mx /= mag; my /= mag; mag = 1; }
    if (G.sleeping) { mx = my = 0; mag = 0; }
    const moving = mag > .12;
    // 조이스틱을 민 거리로 걸음 결정: 살짝=걷기(조용), 중간=달리기, 끝까지=질주(시끄럽고 지구력 소모)
    // 키보드: 기본 달리기 · Shift 질주 · Ctrl 걷기
    let gait = 'walk';
    if (moving) {
      if (input.kx || input.ky) gait = keys.shift ? 'sprint' : keys.ctrl ? 'walk' : 'jog';
      else gait = mag > .88 ? 'sprint' : mag > .5 ? 'jog' : 'walk';
      if (gait === 'sprint' && p.endu <= 3) gait = 'jog';
    }
    G.gait = moving ? gait : 'idle';
    const running = gait === 'sprint';
    const wt = invWeight();
    const spd = ({ walk: 1.35, jog: 2.35, sprint: 3.5 })[gait] * (p.energy < 20 ? .8 : 1) * (p.hp < 25 ? .85 : 1) * (wt > CAP ? .7 : 1);
    if (moving) {
      mx /= (mag || 1); my /= (mag || 1); // 속도는 걸음 단계로만 정함
      p.stepT = (p.stepT || 0) - spd * dt;
      if (p.stepT <= 0) {
        p.stepT = running ? .78 : gait === 'jog' ? .7 : .6;
        const tt = M.t[Math.floor(p.y) * M.W + Math.floor(p.x)];
        SFX.play('step', { surface: tt === DT.T.GRASS ? 'grass' : (tt === DT.T.FLOOR || tt === DT.T.DOOR ? 'wood' : 'hard'), run: gait !== 'walk', vol: gait === 'walk' ? .45 : .8 });
      }
      const ak = Math.floor(p.y + my * .6) * M.W + Math.floor(p.x + mx * .6), ao = M.opAt[ak];
      if (ao && ao.type === 'door') { const sd = G.ds[ak]; if (!sd.o && !sd.br && !sd.b.length && !G.actions.some(a => a.kind === 'door')) { G.nearOp = { t: 'op', o: ao }; doAlt('doorOpen'); } }
      const onWin = M.t[Math.floor(p.y) * M.W + Math.floor(p.x)] === DT.T.WINDOW;
      p.x += mx * spd * dt * (onWin ? .35 : 1); p.y += my * spd * dt * (onWin ? .35 : 1);
      resolve(p);
      if (p.atkT <= 0) p.face += angDiff(Math.atan2(my, mx), p.face) * Math.min(1, dt * 14);
    }
    p.atkT -= dt; p.cd -= dt;
    p.noiseT -= dt;
    const nr = moving ? ({ walk: 1, jog: 3, sprint: 6.5 })[gait] : 0;
    p.noiseR = Math.max(nr, p.noiseR - dt * 6);
    if (moving && p.noiseT <= 0) { p.noiseT = running ? .4 : .6; noise(p.x, p.y, nr, false); }
    if (running) p.endu -= 11 * dt; else p.endu += (gait === 'jog' ? 3 : moving ? 6 : 9) * dt;
    p.endu = clamp(p.endu, 0, 100);
    G.isRunning = running;
    if (mag > .3 && G.actions.length && !(G.actions.length === 1 && G.actions[0].kind === 'door')) cancelActions('이동해서 행동을 멈췄다');
    if (!G.sleeping) updateActions(dt);
    if (input.attackHeld || keys.space) playerAttack();

    const act = running ? 1.35 : gait === 'jog' ? 1.1 : 1;
    p.full -= .045 * dm * act;
    p.hyd -= .065 * dm * act;
    if (G.sleeping) p.energy += .22 * dm * (G.inBed ? 1.5 : 1); else p.energy -= .075 * dm * act;
    p.full = clamp(p.full, 0, 100); p.hyd = clamp(p.hyd, 0, 100); p.energy = clamp(p.energy, 0, 100);
    if (p.full <= 0) p.hp -= .03 * dm;
    if (p.hyd <= 0) p.hp -= .05 * dm;
    if (p.bleed) p.hp -= .12 * dm;
    if (p.infected) { p.infT += dm; if (p.infT > 600) p.hp -= .035 * dm; }
    if (p.bandT > 0) p.bandT -= dm;
    if (p.sick > 0) { p.sick -= dm; p.hp -= .012 * dm; p.hyd -= .03 * dm; }
    if (!p.bleed && !(p.infected && p.infT > 600) && p.full > 40 && p.hyd > 40) p.hp += .02 * dm * (G.sleeping && G.inBed ? 2 : 1);
    p.hp = Math.min(100, p.hp);
    if (p.hp <= 0) return die();

    updateZombies(dt);
    processPaths();

    // 정전
    if (G.power && G.time >= G.powerOffAt) { G.power = 0; toast('전기가 끊겼다 — 냉장고가 멈추고 가로등이 꺼졌다', 3200); SFX.play('powerdown'); }
    const hour = Math.floor(G.time / 60);
    if (hour !== G.lastHour) ageFood(60 * Math.max(1, hour - G.lastHour));
    if (hour !== G.lastHour) {
      G.lastHour = hour;
      const alive = G.zombies.filter(z => !z.dead).length;
      const KZ = Math.max(1, M.KA * .8);
      if (G.night > .5 && alive < 120 * KZ) spawnZombies(Math.round((G.sleeping ? 2 : 5) * KZ), 18, true);
      else if (hour % 2 === 0 && alive < 70 * KZ) spawnZombies(Math.round(2 * KZ), 18, true);
      if (hour % 24 === 21) { toast('밤이 온다. 좀비가 빨라진다', 2600); SFX.play('nightfall'); }
      if (hour % 24 === 6) { toast('날이 밝는다', 2000); SFX.play('dawn', { vol: .8 }); }
    }

    if (G.sleeping) {
      if (p.energy >= 99.5) wake('개운하게 일어났다');
      else if (G.zombies.some(z => !z.dead && z.state === 'chase' && Math.hypot(z.x - p.x, z.y - p.y) < 6)) wake('인기척에 잠이 깼다!');
    }

    // 효과음: 근처 좀비 신음, 환경음
    for (const z of G.zombies) {
      if (z.dead) continue;
      z.groanT = (z.groanT == null ? 2 + rand() * 10 : z.groanT) - dt;
      if (z.groanT <= 0) {
        const d = Math.abs(z.x - p.x) + Math.abs(z.y - p.y);
        z.groanT = (z.state === 'chase' ? 2.5 : 7) + rand() * 7;
        if (d < 18) SFX.at('groan', z.x, z.y, { range: z.state === 'chase' ? 15 : 11, vol: z.state === 'chase' ? 1 : .7 });
      }
    }
    const ptile = M.t[Math.floor(p.y) * M.W + Math.floor(p.x)];
    // 날씨: 몇 시간마다 바뀜, 비가 세면 천둥
    if (G.time > G.weatherNext) { G.weatherNext = G.time + 240 + rand() * 480; G.rainTarget = rand() < .38 ? .35 + rand() * .65 : 0; if (G.rainTarget > .2 && G.rain < .1) toast('비가 오기 시작한다 — 소리가 묻힌다', 2400); }
    G.rain += clamp(G.rainTarget - G.rain, -1, 1) * Math.min(1, dm * .02);
    if (G.rain > .65 && !G.sleeping) { G.thunderT -= dt; if (G.thunderT <= 0) { G.thunderT = 25 + rand() * 60; G.flashT = .45; const dl = .6 + rand() * 2.2; setTimeout(() => { SFX.play('thunder', { vol: 1 - dl / 4 }); shake(.35 * (1 - dl / 4)); }, dl * 1000); } }
    SFX.update(dt, { rain: G.rain, x: p.x, y: p.y, night: G.night, hp: p.hp, dead: G.dead, sleeping: G.sleeping, indoor: ptile === DT.T.FLOOR });
    G.saveT += dt;
    if (G.saveT > 30) { G.saveT = 0; save(false); }
  }

  /* ================= 렌더 ================= */
  function render(dt) {
    const p = G.p;
    clockT += dt;
    if (!G.paused) updateFx(dt);
    ZOOM = VW > VH ? VH / 9 : Math.min(VW, VH) / 12.5;
    const tr = G.trauma || 0, s2 = tr * tr * 16;
    const ox = (s2 ? s2 * (Math.sin(clockT * 47) * .6 + Math.sin(clockT * 83 + 1.3) * .4) : 0) + (G.kx || 0);
    const oy = (s2 ? s2 * (Math.sin(clockT * 53 + 2.1) * .6 + Math.sin(clockT * 71 + .4) * .4) : 0) + (G.ky || 0);
    // 플레이어 화면 위치 (가방 패널이 열리면 남은 왼쪽 영역 가운데로)
    const sheetOn = !$('sheet').classList.contains('hidden');
    const panelW = sheetOn ? (L.panelW || (L.panelW = document.querySelector('.sheet-card').offsetWidth)) : 0;
    const psx = (VW - panelW) / 2, psy = VH * .5;
    if (L._psx !== psx) { L._psx = psx; $('act').style.left = psx + 'px'; $('toast').style.left = psx + 'px'; $('quick').style.left = (sheetOn ? psx : (L.quickMid || psx)) + 'px'; }
    const camX = psx - p.x * ZOOM + ox, camY = psy - p.y * ZOOM + oy;
    L.world.setAttribute('transform', `translate(${camX.toFixed(1)} ${camY.toFixed(1)}) scale(${ZOOM.toFixed(3)})`);
    if (L._gz !== ZOOM) { L._gz = ZOOM; L.gsv.setAttribute('width', (M.W * ZOOM).toFixed(1)); L.gsv.setAttribute('height', (M.H * ZOOM).toFixed(1)); }
    L.gsv.style.transform = `translate3d(${camX.toFixed(1)}px,${camY.toFixed(1)}px,0)`;
    L.pg.setAttribute('transform', `translate(${p.x.toFixed(3)} ${p.y.toFixed(3)}) rotate(${(p.face * 180 / Math.PI).toFixed(1)})`);
    animatePlayer(dt);
    renderRain(dt);

    // 소음 반경
    if (p.noiseR > .3) {
      L.noise.setAttribute('cx', p.x.toFixed(2)); L.noise.setAttribute('cy', p.y.toFixed(2));
      L.noise.setAttribute('r', p.noiseR.toFixed(2));
      L.noise.setAttribute('opacity', (p.noiseR > 2 ? .55 : .3).toFixed(2));
      L.noise.setAttribute('stroke', p.noiseR > 2 ? '#ff5a63' : '#e9e3d2');
    } else L.noise.setAttribute('opacity', 0);

    // 시야 (위치·방향·시야거리가 거의 그대로면 다시 계산하지 않음)
    V.R = G.sleeping ? 0 : lerp(12, 5.5, G.night) * (1 - .18 * (G.rain || 0));
    const vkey = `${p.x.toFixed(2)},${p.y.toFixed(2)},${p.face.toFixed(2)},${V.R.toFixed(2)},${G.placed.length},${G.dsV},${VW},${VH}`;
    if (L._vkey !== vkey) { L._vkey = vkey; computeVisible();
    const pts = [];
    const N = 84, a0 = p.face - V.cone, a1 = p.face + V.cone;
    const nearR = Math.min(V.near, V.R);
    const rOf = a => Math.abs(angDiff(a, p.face)) <= V.cone ? V.R : nearR;
    const pushPt = (a, r) => { const d = rayDist(p.x, p.y, a, r); pts.push((p.x + Math.cos(a) * d).toFixed(2) + ' ' + (p.y + Math.sin(a) * d).toFixed(2)); };
    let did0 = false, did1 = false;
    for (let i = 0; i <= N; i++) {
      const a = p.face - Math.PI + i / N * TAU;
      if (!did0 && a >= a0) { did0 = true; pushPt(a0, nearR); pushPt(a0, V.R); }
      if (!did1 && a >= a1) { did1 = true; pushPt(a1, V.R); pushPt(a1, nearR); }
      pushPt(a, rOf(a));
    }
    const hw = VW / 2 / ZOOM + 2, hh = VH / ZOOM + 2;
    const l = p.x - hw, r = p.x + hw, t = p.y - hh, b = p.y + hh;
    L.dark.setAttribute('d', `M${l.toFixed(1)} ${t.toFixed(1)}H${r.toFixed(1)}V${b.toFixed(1)}H${l.toFixed(1)}Z` + (pts.length && V.R > 0 ? 'M' + pts.join('L') + 'Z' : ''));
    }
    const lop = (G.night * .95 * (G.power ? 1 : 0)).toFixed(2);
    const fop = G.night.toFixed(2);
    if (L._fop !== fop) { L._fop = fop; L.fires.setAttribute('opacity', fop); }
    if (L._lop !== lop) { L._lop = lop; L.lamps.setAttribute('opacity', lop); }
    if (G.flashT > 0) { G.flashT -= dt; L.flash.setAttribute('opacity', Math.max(0, G.flashT * 2.2).toFixed(2)); } else if (L._fl !== 0) { L._fl = 0; L.flash.setAttribute('opacity', 0); }
    const dop = (lerp(.5, .93, G.night) * (1 - .06 * (G.rain || 0)) + .05 * (G.rain || 0)).toFixed(2);
    if (L._dop !== dop) { L._dop = dop; L.dark.setAttribute('opacity', dop); }
    renderFog(dt, camX, camY);
    cullWorld(false);
    const tn = (.32 * G.night).toFixed(2);
    if (L._tn !== tn) { L._tn = tn; L.tint.style.opacity = tn; }

    // 좀비 + 화면 밖 위협
    const threats = [];
    for (const z of G.zombies) {
      if (z.dead) continue;
      const vis = Math.abs(z.x - p.x) < 14 && Math.abs(z.y - p.y) < 16 && inVision(z.x, z.y);
      if (vis !== z.vis) { z.vis = vis; if (vis) L.zombies.appendChild(z.g); else z.g.remove(); }
      if (vis) {
        z.g.setAttribute('transform', `translate(${z.x.toFixed(3)} ${z.y.toFixed(3)}) rotate(${(z.face * 180 / Math.PI).toFixed(1)})${z.down > 0 ? ' scale(1 .7)' : ''}`);
        // 비틀거리며 걷기 (2프레임에 한 번 갱신 — 성능)
        const mv = z.state === 'chase' ? 1.6 : (z.path ? 1 : .35);
        z.wph += dt * 5 * mv;
        if (((G.fc || 0) + (z.wph * 10 | 0)) & 1) continue;
        const s1 = Math.sin(z.wph), s2 = Math.sin(z.wph * .5);
        z.inner.setAttribute('transform', z.state === 'chase' ? `translate(.04 0) rotate(${(s2 * 9).toFixed(1)})` : `rotate(${(s2 * 7).toFixed(1)})`);
        z.fl.setAttribute('cx', (.09 * s1 * (mv > .5 ? 1 : .3)).toFixed(3));
        z.fr.setAttribute('cx', (-.09 * s1 * (mv > .5 ? 1 : .3)).toFixed(3));
        const ex = z.state === 'chase' ? ' scale(1.15 1)' : '';
        z.armL.setAttribute('transform', `translate(${(.03 * s1).toFixed(3)} ${(.015 * s2).toFixed(3)})${ex}`);
        z.armR.setAttribute('transform', `translate(${(-.03 * s1).toFixed(3)} ${(-.015 * s2).toFixed(3)})${ex}`);
        const f = z.flash > 0 ? '#e0101e' : z.shirt;
        if (z._f !== f) { z._f = f; z.body.setAttribute('fill', f); }
      } else if (z.state === 'chase' && !G.sleeping) {
        const d = Math.hypot(z.x - p.x, z.y - p.y);
        if (d < 12) threats.push([d, Math.atan2(z.y - p.y, z.x - p.x)]);
      }
    }
    threats.sort((a, b) => a[0] - b[0]);
    const TR = Math.min(VW, VH) * .34;
    for (let i = 0; i < L.arrows.length; i++) {
      const a = L.arrows[i], th = threats[i];
      if (!th) { if (a._on) { a._on = false; a.setAttribute('opacity', 0); } continue; }
      a._on = true;
      const pulse = .75 + .25 * Math.sin(clockT * 9 + i);
      const sc = 1.25 - th[0] / 12 * .5;
      a.setAttribute('transform', `translate(${(psx + Math.cos(th[1]) * TR).toFixed(1)} ${(psy + Math.sin(th[1]) * TR).toFixed(1)}) rotate(${(th[1] * 180 / Math.PI).toFixed(0)}) scale(${sc.toFixed(2)})`);
      a.setAttribute('opacity', (clamp(1.15 - th[0] / 12, .3, 1) * pulse).toFixed(2));
    }
    // 피격 방향
    const DR = Math.min(VW, VH) * .43;
    for (let i = 0; i < L.dmg.length; i++) {
      const e = L.dmg[i], d = G.dmgInd[i];
      if (!d) { if (e._on) { e._on = false; e.setAttribute('opacity', 0); } continue; }
      e._on = true;
      const w = .42, r1 = DR, r2 = DR + 16;
      const p1 = [psx + Math.cos(d.a - w) * r1, psy + Math.sin(d.a - w) * r1], p2 = [psx + Math.cos(d.a + w) * r1, psy + Math.sin(d.a + w) * r1];
      const p3 = [psx + Math.cos(d.a + w * .6) * r2, psy + Math.sin(d.a + w * .6) * r2], p4 = [psx + Math.cos(d.a - w * .6) * r2, psy + Math.sin(d.a - w * .6) * r2];
      e.setAttribute('d', `M${p1[0].toFixed(1)} ${p1[1].toFixed(1)}A${r1} ${r1} 0 0 1 ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}L${p3[0].toFixed(1)} ${p3[1].toFixed(1)}A${r2} ${r2} 0 0 0 ${p4[0].toFixed(1)} ${p4[1].toFixed(1)}Z`);
      e.setAttribute('fill', d.hit ? '#e0101e' : '#e9e3d2');
      e.setAttribute('opacity', ((1 - d.t / .9) * (d.hit ? .95 : .5)).toFixed(2));
    }

    // 상호작용 대상 + 하이라이트
    let near = -1, nd = 1.5;
    for (let i = 0; i < M.containers.length; i++) {
      if (G.removed.has(i)) continue;
      const c = M.containers[i];
      const d = Math.hypot(c.x + .5 - p.x, c.y + .5 - p.y);
      if (d < nd && losClear(p.x, p.y, c.x + .5, c.y + .5)) { nd = d; near = i; }
    }
    for (const c of G.corpses) {
      if (c.searched && !c.items.length) continue;
      const d = Math.hypot(c.x - p.x, c.y - p.y);
      if (d < Math.min(nd, 1.3) && losClear(p.x, p.y, c.x, c.y)) { nd = d; near = CORPSE + c.id; }
    }
    for (const b of G.placed) {
      if (b.type !== 'furn' || !FURN_CONT[b.kind]) continue;
      const d = Math.hypot(b.x + .5 - p.x, b.y + .5 - p.y);
      if (d < nd) { nd = d; near = PLACED + b.id; }
    }
    G.nearC = near;
    findInteract();
    if (G.openC >= 0) { const [ox, oy] = cPos(G.openC); if (Math.hypot(ox - p.x, oy - p.y) > 2) closeSheet(); }
    G.nearBench = -1;
    for (let i = 0; i < G.placed.length; i++) {
      const b = G.placed[i];
      if (Math.hypot(b.x + .5 - p.x, b.y + .5 - p.y) < 1.7) { G.nearBench = i; break; }
    }
    if (near >= 0) {
      const [hx, hy] = cPos(near);
      L.hl.setAttribute('x', (hx - .55).toFixed(2)); L.hl.setAttribute('y', (hy - .55).toFixed(2));
      L.hl.setAttribute('opacity', (.55 + .45 * Math.sin(clockT * 7)).toFixed(2));
    } else L.hl.setAttribute('opacity', 0);

    // 버튼 링 (매 프레임)
    const cdFrac = clamp(p.cd / (p.cdMax || 1), 0, 1);
    $('atkRing').style.strokeDashoffset = (RING_C * cdFrac).toFixed(1);
    $('btnAttack').classList.toggle('cool', cdFrac > 0);
    $('joyRing').style.strokeDashoffset = (RING_C * (1 - p.endu / 100)).toFixed(1);
    const gk = G.gait || 'idle';
    if (L._gk !== gk) { L._gk = gk; const jw = $('joy'); jw.dataset.g = gk; $('gaitLbl').textContent = ({ idle: '', walk: '걷기', jog: '달리기', sprint: '질주' })[gk]; }
    $('joy').classList.toggle('tired', p.endu < 20);

    G.hudT -= dt;
    if (G.hudT <= 0) { G.hudT = .15; renderHud(); }
  }

  /* ---------- 추천 행동 (상황에 맞춰 1탭 실행) ---------- */
  function bestItem(type, key) {
    let best = null;
    for (const it of G.p.inv) { const d = ITEMS[it.id]; if (d.type === type && (!key || (d[key] || 0) > 0) && !busyUid(it.uid) && (!best || (d[key] || 0) > (ITEMS[best.id][key] || 0))) best = it; }
    return best;
  }
  function quickList() {
    const p = G.p, q = [];
    if (G.sleeping || G.dead) return q;
    if (p.bleed) { const b = p.inv.find(i => i.id === 'bandage' && !busyUid(i.uid)); if (b) q.push(['use', b, 'bandage', '붕대 감기', 1]); }
    if (p.hp < 50) { const pl = p.inv.find(i => i.id === 'pills' && !busyUid(i.uid)); if (pl) q.push(['use', pl, 'pills', '진통제', 0]); }
    if (p.hyd < 45) { const d = bestItem('drink', 'hyd'); if (d) q.push(['use', d, ITEMS[d.id].icon, '마시기 · ' + ITEMS[d.id].name, p.hyd < 15]); }
    if (p.full < 45) { const f = bestItem('food', 'full'); if (f) q.push(['use', f, ITEMS[f.id].icon, '먹기 · ' + ITEMS[f.id].name, p.full < 15]); }
    if (p.equip == null) {
      let w = null;
      for (const it of p.inv) { const d = ITEMS[it.id]; if ((d.type === 'melee' || d.type === 'gun') && !busyUid(it.uid) && (!w || d.dmg > ITEMS[w.id].dmg)) w = it; }
      if (w) q.push(['equip', w, ITEMS[w.id].icon, '장착 · ' + ITEMS[w.id].name, 0]);
    }
    if (p.energy < 25) q.push(['sleep', null, 'moon', '잠자기', 0]);
    return q.slice(0, 3);
  }
  function renderQuick() {
    const q = quickList();
    const html = q.map(([a, it, ic, label, urgent]) => `<button class="qb${urgent ? ' urgent' : ''}" data-q="${a}" data-uid="${it ? it.uid : ''}">${ico(ic)}${label}</button>`).join('');
    const box = $('quick');
    if (box._h !== html) { box._h = html; box.innerHTML = html; }
  }
  function quickAct(a, uid) {
    if (a === 'sleep') return trySleep();
    const it = G.p.inv.find(i => i.uid === uid); if (!it) return;
    const keep = G.sel; G.sel = { uid };
    L.urgentNext = true;
    sheetAction(a);
    L.urgentNext = false;
    G.sel = keep && keep.uid !== uid ? keep : null;
    if (!$('sheet').classList.contains('hidden')) renderSheet();
    renderQuick();
  }
  // 빗줄기: 화면 위 캔버스에 가볍게
  const rainCv = $('rain'), rctx = rainCv.getContext('2d');
  const drops = [];
  function renderRain(dt) {
    const r = G.rain || 0;
    if (r < .03) { if (rainCv._on) { rctx.clearRect(0, 0, rainCv.width, rainCv.height); rainCv._on = false; rainCv.style.opacity = 0; } return; }
    rainCv._on = true; rainCv.style.opacity = 1;
    if (rainCv.width !== VW || rainCv.height !== VH) { rainCv.width = VW; rainCv.height = VH; }
    const n = Math.floor(40 + r * 170);
    while (drops.length < n) drops.push({ x: rand() * VW, y: rand() * VH, v: 500 + rand() * 350, l: 8 + rand() * 10 });
    drops.length = n;
    rctx.clearRect(0, 0, VW, VH);
    rctx.fillStyle = `rgba(30,40,55,${(.12 * r).toFixed(3)})`; rctx.fillRect(0, 0, VW, VH);
    rctx.strokeStyle = `rgba(190,205,220,${(.25 + .3 * r).toFixed(2)})`; rctx.lineWidth = 1;
    rctx.beginPath();
    for (const d of drops) {
      d.y += d.v * dt; d.x += d.v * dt * .18;
      if (d.y > VH) { d.y = -d.l; d.x = rand() * (VW + 80) - 80; }
      rctx.moveTo(d.x, d.y); rctx.lineTo(d.x + d.l * .18, d.y + d.l);
    }
    rctx.stroke();
  }
  function renderHud() {
    renderQuick();
    renderAlt();
    const p = G.p;
    const day = Math.floor(G.time / 1440) + 1;
    const m = Math.floor(G.time % 1440);
    const hhmm = String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
    $('day').textContent = day;
    $('time').textContent = hhmm;
    const isN = G.night > .5;
    $('phaseTxt').textContent = isN ? '밤 · 위험' : (G.night > 0 ? '황혼' : '낮');
    $('phaseIcon').setAttribute('href', isN ? '#i-moon' : (G.night > 0 ? '#i-dusk' : '#i-sun'));
    $('phase').classList.toggle('night', isN);
    if ((G.rain || 0) > .15) $('phaseTxt').textContent += ' · 비';
    for (const s of document.getElementsByClassName('stat')) {
      const v = clamp(p[s.dataset.k], 0, 100);
      s.querySelector('em').style.width = v.toFixed(0) + '%';
      s.querySelector('b').textContent = v.toFixed(0);
      s.classList.toggle('low', v < 25);
    }
    $('lowhp').classList.toggle('on', p.hp < 30);
    const md = [];
    if (p.bleed) md.push(['drop', '출혈', 1]);
    if (p.infected && p.infT > 300) md.push(['bio', '메스꺼움', 1]);
    if (p.sick > 0) md.push(['bio', '식중독', 1]);
    if (!G.power) md.push(['bolt', '정전', 0]);
    if (p.hp < 30) md.push(['heart', '중상', 1]);
    if (p.full < 25) md.push(['food', p.full < 8 ? '굶주림' : '배고픔', p.full < 8]);
    if (p.hyd < 25) md.push(['drop', p.hyd < 8 ? '탈수' : '갈증', p.hyd < 8]);
    if (p.energy < 25) md.push(['moon', '피곤', p.energy < 8]);
    if (p.endu < 20) md.push(['bolt', '지침', 0]);
    if (invWeight() > CAP) md.push(['weight', '과적', 0]);
    const html = md.map(([ic, t, bad]) => `<b class="md${bad ? ' bad' : ''}">${ico(ic)}${t}</b>`).join('');
    const mo = $('moodles'); if (mo._h !== html) { mo._h = html; mo.innerHTML = html; }
    const w = curWeapon();
    let wn = w.def.name;
    if (w.def.type === 'gun') { const a = ammoItem(); wn += ' · ' + (a ? a.n : 0) + '발'; }
    else if (w.item && w.item.dur != null) wn += ' · ' + w.item.dur;
    $('wname').textContent = wn;
    const ub = $('btnUse');
    ub.disabled = G.nearC < 0 && G.nearBench < 0;
    ub.classList.toggle('hot', G.nearC >= 0 && !cSearched(G.nearC));
    $('useLbl').textContent = G.nearC >= 0 ? cName(G.nearC) : (G.nearBench >= 0 ? '작업대' : '뒤지기');
    $('bagLbl').textContent = invWeight().toFixed(1) + 'kg';
    updateMaps();
    if (G.sleeping) $('sleepTime').textContent = `${day}일차 ${hhmm} · 기력 ${p.energy.toFixed(0)}`;
  }

  /* ================= 가방/수색 시트 ================= */
  // 메뉴·지도가 모두 닫혀 있을 때만 게임 재개
  function resumeIfFree() { if (G) G.paused = !$('menu').classList.contains('hidden') || !$('bigmap').classList.contains('hidden'); }
  function openSheet(ci) {
    G.openC = ci; G.sel = null;
    if (ci >= 0) { if (isPlacedC(ci)) {} else if (isCorpse(ci)) { const c = corpseOf(ci); if (c) c.searched = true; } else G.searched.add(ci); refreshContainer(ci); }
    $('sheet').classList.remove('hidden');
    renderSheet();
  }
  function closeSheet() {
    if (G.openC >= 0) refreshContainer(G.openC);
    G.openC = -1; G.sel = null;
    $('sheet').classList.add('hidden');
  }
  function itemStats(it) {
    const d = ITEMS[it.id], sub = [];
    const fs = freshState(it); if (fs) sub.push(fs.t + (fs.lv ? ` (효과 ${Math.round(fs.mul * 100)}%)` : ''));
    if (it.q && it.q > 1) sub.push(`요리 품질 +${Math.round((it.q - 1) * 100)}%`);
    if (d.full) sub.push('포만 ' + (d.full > 0 ? '+' : '') + d.full);
    if (d.hyd) sub.push('수분 ' + (d.hyd > 0 ? '+' : '') + d.hyd);
    if (d.hp) sub.push('체력 +' + d.hp);
    if (d.stopBleed) sub.push('지혈');
    if (d.type === 'melee') sub.push('공격력 ' + d.dmg, '사거리 ' + d.range, '내구도 ' + it.dur + '/' + (it.max || d.dur));
    if (d.uses) sub.push('남은 사용 ' + it.u + '회');
    if (d.type === 'mat' && !d.uses) sub.push('재료');
    if (d.type === 'tool') sub.push('도구 · 분해에 사용');
    if (it.id === 'benchkit') sub.push('설치하면 작업대 레시피 사용 가능');
    if (it.id === 'furn') sub.push('원하는 곳에 놓아 길을 막을 수 있음' + (FURN_CONT[it.kind] ? ' · 물건 보관 가능' : ''));
    if (d.type === 'gun') sub.push('공격력 ' + d.dmg, '사거리 ' + d.range, '소음 매우 큼');
    if (it.n) sub.push(it.n + (it.id === 'ammo' ? '발' : '개'));
    sub.push(((it.w != null ? it.w : d.w) * (it.n || 1)).toFixed(1) + 'kg');
    return sub.join(' · ');
  }
  function card(it, src) {
    const d = ITEMS[it.id], p = G.p;
    const eq = src === 'inv' && p.equip === it.uid;
    const sel = G.sel && G.sel.uid === it.uid;
    let extra = '';
    if (it.n) extra += `<span class="qty">x${it.n}</span>`;
    if (it.u != null) extra += `<span class="qty">${it.u}회</span>`;
    const fs = freshState(it); if (fs && fs.lv) extra += `<span class="fresh f${fs.lv}">${fs.t}</span>`;
    if (it.dur != null && d.dur) { const f = it.dur / (it.max || d.dur); extra += `<span class="dur${f < .3 ? ' low' : ''}"><i style="width:${(f * 100).toFixed(0)}%"></i></span>`; }
    if (eq) extra += `<span class="eqt">장착</span>`;
    const busy = busyUid(it.uid);
    return `<button class="card${eq ? ' eq' : ''}${sel ? ' sel' : ''}${src === 'cont' ? ' loot' : ''}${busy ? ' busy' : ''}" data-src="${src}" data-uid="${it.uid}">${ico(d.icon)}<span class="cn">${nameOf(it)}</span>${extra}</button>`;
  }
  function chip(icon, label, ok) { return `<i class="chip${ok ? '' : ' miss'}">${ico(icon)}${label}</i>`; }
  function craftHtml() {
    const benchNear = G.nearBench >= 0;
    let h = `<div class="bench-st${benchNear ? ' on' : ''}">${ico('bench')}${benchNear ? '작업대 근처 — 모든 레시피 사용 가능' : '작업대에서 멀리 있음 — 일부 레시피 잠김'}${benchNear ? '<button data-act="benchdismantle">작업대 분해</button>' : ''}</div>`;
    const rows = RECIPES.map(r => ({ r, max: recipeMax(r) })).sort((a, b) => (b.max > 0) - (a.max > 0));
    for (const { r, max } of rows) {
      const o = ITEMS[r.out];
      let chips = r.in.map(([id, need]) => { const c = countOf(id); return chip(ITEMS[id].icon, `${ITEMS[id].name} ${Math.min(c, 99)}/${need}${ITEMS[id].uses ? '회' : ''}`, c >= need); }).join('');
      if (r.tools) chips += r.tools.map(t => chip(ITEMS[t].icon, TOOL_NAME[t] + ' (도구)', has(t))).join('');
      if (r.bench) chips += chip('bench', '작업대 근처', benchNear);
      if (r.heat) { const ht = nearHeat(); chips += chip('fire', ht === 'fire' ? '모닥불' : ht === 'stove' ? '조리대(전기)' : (G.power ? '조리대·모닥불 근처' : '모닥불 필요(정전)'), !!ht); }
      const busy = G.actions.filter(a => a.kind === 'craft' && a.label.startsWith(o.name)).length;
      h += `<div class="rc${max ? '' : ' off'}" data-rid="${r.id}"><div class="rc-ic">${ico(o.icon)}</div><div class="rc-m"><b>${o.name}<small>${r.time}초</small>${busy ? `<em>제작 대기 ${busy}</em>` : ''}</b><div class="chips">${chips}</div></div>
        <div class="rc-b"><button class="sbtn2 w" data-act="craft" data-rid="${r.id}" ${max ? '' : 'disabled'}>만들기</button>${max > 1 ? `<button class="sbtn2" data-act="craftmax" data-rid="${r.id}">x${max}</button>` : ''}</div></div>`;
    }
    return h;
  }
  function renderSheet() {
    const p = G.p, ci = G.openC;
    const crafting = ci < 0 && G.tab === 'craft';
    $('sheetTitle').textContent = ci >= 0 ? cName(ci) + ' 수색' : (crafting ? '제작' : '가방');
    $('sheetIcon').setAttribute('href', ci >= 0 ? '#i-search' : (crafting ? '#i-craft' : '#i-bag'));
    const wt = invWeight();
    $('wtext').textContent = `${wt.toFixed(1)} / ${CAP}kg`;
    $('wfill').style.width = Math.min(100, wt / CAP * 100).toFixed(0) + '%';
    $('wfill').parentElement.classList.toggle('over', wt > CAP);
    let h = '';
    const skillTab = ci < 0 && G.tab === 'skill';
    $('sheetTabs').innerHTML = ci < 0 ? `<button data-act="tab-bag" class="${crafting || skillTab ? '' : 'on'}">${ico('bag')}가방</button><button data-act="tab-craft" class="${crafting ? 'on' : ''}">${ico('craft')}제작</button><button data-act="tab-skill" class="${skillTab ? 'on' : ''}">${ico('star')}능력</button>` : '';
    if (skillTab) {
      let h = '<div class="skills">';
      for (const k in SKILLS) {
        const sk = G.sk[k], need = xpNeed(sk.lv), f = sk.lv >= 10 ? 1 : sk.xp / need;
        h += `<div class="sk"><div class="sk-ic">${ico(SKILLS[k][1])}</div><div class="sk-m"><b>${SKILLS[k][0]}<em>Lv ${sk.lv}</em></b><div class="sk-bar"><i style="width:${(f * 100).toFixed(0)}%"></i></div><small>${SKILLS[k][2]}</small></div></div>`;
      }
      h += `</div><div class="sk-foot">생존 ${Math.floor((G.time - 540) / 1440)}일 · 처치 ${G.kills} · ${G.power ? '전기 들어옴' : '정전'}</div>`;
      $('sheetTitle').classList.add('hidden');
      $('sheetBody').innerHTML = h; G.sel = null; renderDetail(); renderAction();
      return;
    }
    $('sheetTitle').classList.toggle('hidden', ci < 0);
    if (crafting) {
      const body = $('sheetBody'), st = body.scrollTop;
      body.innerHTML = h + craftHtml(); body.scrollTop = st;
      G.sel = null; renderDetail(); renderAction();
      return;
    }
    if (ci >= 0) {
      const items = cItems(ci);
      const D0 = isCorpse(ci) || isPlacedC(ci) ? null : DISMANTLE[M.containers[ci].kind];
      h += `<div class="sec-t"><span>${isCorpse(ci) ? '소지품' : '안에 있는 것'}</span><span class="sec-b">${items.length > 1 ? '<button data-act="takeall">모두 가져가기</button>' : ''}${D0 ? `<button class="ghost${has(D0.tool) && !items.length ? ' ok' : ''}" data-act="dismantle">${ico('screwdriver')}분해</button>` : ''}</span></div><div class="grid">`;
      if (!items.length) h += `<div class="empty">비어 있다</div>`;
      for (const it of items) h += card(it, 'cont');
      h += `</div>`;
    }
    h += `<div class="sec-t"><span>내 가방 · ${p.inv.length}개</span></div><div class="grid">`;
    if (!p.inv.length) h += `<div class="empty">가방이 비었다</div>`;
    for (const it of p.inv) h += card(it, 'inv');
    h += `</div>`;
    if (ci < 0) h += `<div class="acts"><button class="abtn w" data-act="sleep">${ico('moon')}잠자기</button><button class="abtn" data-act="save">${ico('save')}저장</button></div>`;
    const body = $('sheetBody'), st = body.scrollTop;
    body.innerHTML = h; body.scrollTop = st;
    renderDetail();
    renderAction();
  }
  function renderDetail() {
    const box = $('detail'), p = G.p;
    const it = G.sel ? p.inv.find(i => i.uid === G.sel.uid) : null;
    $('sheetBody').classList.toggle('withdetail', !!it);
    if (!it) { box.classList.add('hidden'); G.sel = null; $('sheetBody').style.paddingBottom = ''; return; }
    const d = ITEMS[it.id];
    let acts = '';
    if (d.type === 'food') acts += `<button class="abtn w" data-act="use">${ico(d.icon)}먹기</button>`;
    else if (d.type === 'drink') acts += `<button class="abtn w" data-act="use">${ico(d.icon)}마시기</button>`;
    else if (d.type === 'med') acts += `<button class="abtn w" data-act="use">${ico(d.icon)}사용</button>`;
    else if (d.type === 'melee' || d.type === 'gun') acts += p.equip === it.uid
      ? `<button class="abtn r" data-act="equip">${ico(d.icon)}해제</button>`
      : `<button class="abtn w" data-act="equip">${ico(d.icon)}장착</button>`;
    if (d.type === 'place') acts += `<button class="abtn w" data-act="place">${ico(d.icon)}${it.id === 'furn' ? '내려놓기' : it.id === 'campkit' ? '불 피우기' : '설치'}</button>`;
    if (d.type === 'melee' && it.dur < Math.round((it.max || d.dur) * .9)) {
      for (const m of ['tape', 'glue']) if (countOf(m)) acts += `<button class="abtn" data-act="repair-${m}">${ico(m)}${m === 'tape' ? '테이프 수리' : '접착제 수리'}</button>`;
      if (!countOf('tape') && !countOf('glue')) acts += `<button class="abtn" disabled>${ico('tape')}수리 불가</button>`;
    }
    if (ITEM_DISMANTLE[it.id]) { const D = ITEM_DISMANTLE[it.id]; acts += `<button class="abtn" data-act="itemdismantle"${D.tool && !has(D.tool) ? ' disabled' : ''}>${ico('screwdriver')}분해</button>`; }
    const dverb = G.openC >= 0 ? '넣기' : '버리기';
    if (d.stack && it.n > 1) {
      acts += `<button class="abtn" data-act="drop" data-rid="1">1개 ${dverb}</button>`;
      if (it.n > 3) acts += `<button class="abtn" data-act="drop" data-rid="half">절반(${Math.floor(it.n / 2)})</button>`;
      acts += `<button class="abtn" data-act="drop" data-rid="all">전부 ${dverb}</button>`;
    } else acts += `<button class="abtn" data-act="drop">${dverb}</button>`;
    if (busyUid(it.uid)) acts = `<div class="busytxt">진행 중…</div>`;
    box.innerHTML = `<div class="dt"><div class="dic">${ico(d.icon)}</div><div class="dtx"><b>${nameOf(it)}</b><small>${itemStats(it)}</small></div><button class="dx" data-act="desel" aria-label="선택 해제">${ico('close')}</button></div><div class="dacts">${acts}</div>`;
    box.classList.remove('hidden');
    $('sheetBody').style.paddingBottom = (box.offsetHeight + 12) + 'px';
  }
  /* ---------- 행동(소요시간) 대기열 ---------- */
  function queueAction(a) {
    if (G.dead || G.sleeping) return;
    a.t = 0;
    if (L.urgentNext) a.urgent = true;
    if (a.urgent && G.actions.length) G.actions.splice(1, 0, a); else G.actions.push(a);
    renderAction();
    if (G.openC >= 0 || !$('sheet').classList.contains('hidden')) renderSheet();
  }
  function cancelActions(msg) {
    if (!G.actions.length) return;
    G.actions = [];
    if (msg) toast(msg);
    renderAction();
    if (!$('sheet').classList.contains('hidden')) renderSheet();
  }
  function updateActions(dt) {
    const a = G.actions[0];
    if (!a) return;
    if (a.valid && !a.valid()) { G.actions.shift(); renderAction(); return; }
    a.t += dt;
    if (!a.started) { a.started = true; if (a.sfx) SFX.play(a.sfx); }
    if (a.noise) { a.nt = (a.nt || 0) - dt; if (a.nt <= 0) { a.nt = 1.2; noise(G.p.x, G.p.y, a.noise, false); G.p.noiseR = Math.max(G.p.noiseR, a.noise); } }
    if (a.hammer) { a.ht = (a.ht || 0) - dt; if (a.ht <= 0) { a.ht = .55 + rand() * .2; SFX.play('hammer', { rev: .3 }); } }
    if (a.t >= a.dur) {
      G.actions.shift();
      a.done();
      if (!$('sheet').classList.contains('hidden')) { if (G.openC >= 0) refreshContainer(G.openC); renderSheet(); }
      renderHud();
    }
    renderAction();
  }
  function renderAction() {
    const box = $('act'), sa = $('sheetAct'), a = G && G.actions[0];
    // 진행 중이던 칸 채우기 초기화
    for (const e of [...document.getElementsByClassName('prog')]) { if (!a || e !== L.progEl) { e.classList.remove('prog'); e.style.removeProperty('--p'); } }
    if (!a) { L.progEl = null; box.classList.add('hidden'); sa.classList.add('hidden'); box._k = sa._k = null; return; }
    const f = clamp(a.t / a.dur, 0, 1);
    // 가방이 열려 있고, 해당 아이템 칸(또는 레시피 줄)이 보이면 → 그 칸 배경이 왼쪽→오른쪽으로 차오름
    const sheetOn = !$('sheet').classList.contains('hidden');
    let target = null;
    if (sheetOn && a.uid != null) target = document.querySelector(`.card[data-uid="${a.uid}"]`);
    else if (sheetOn && a.rid) target = document.querySelector(`.rc[data-rid="${a.rid}"]`);
    if (target) {
      L.progEl = target;
      target.classList.add('prog');
      target.style.setProperty('--p', (f * 100).toFixed(1) + '%');
      box.classList.add('hidden'); sa.classList.add('hidden');
      return;
    }
    L.progEl = null;
    const more = G.actions.length > 1 ? ` <i>+${G.actions.length - 1}</i>` : '';
    const html = `${ico(a.icon || 'hand')}<span>${a.label}${more}</span><em><b style="width:${(f * 100).toFixed(0)}%"></b></em>`;
    const key = a.label + '|' + G.actions.length;
    if (sheetOn) {
      box.classList.add('hidden'); box._k = null;
      if (sa._k !== key) { sa._k = key; sa.innerHTML = html + `<small></small><button data-act="cancel">취소</button>`; }
      sa.querySelector('em b').style.width = (f * 100).toFixed(0) + '%';
      sa.querySelector('small').textContent = Math.max(0, a.dur - a.t).toFixed(1) + '초';
      sa.classList.remove('hidden');
    } else {
      sa.classList.add('hidden'); sa._k = null;
      if (box._k !== key) { box._k = key; box.innerHTML = html; }
      box.querySelector('em b').style.width = (f * 100).toFixed(0) + '%';
      box.classList.remove('hidden');
    }
  }
  const busyUid = uid => G.actions.some(a => a.uid === uid);

  function startSearch(ci) {
    if (G.actions.some(a => a.kind === 'search')) return;
    const first = !cSearched(ci);
    queueAction({ kind: 'search', urgent: true, sfx: 'search', label: cName(ci) + (first ? ' 뒤지는 중' : ' 여는 중'), icon: 'search', dur: (first ? 1.6 : .5) * (isCorpse(ci) ? 1.3 : 1),
      valid: () => G.nearC === ci, done: () => openSheet(ci) });
  }

  function sheetAction(act, uid) {
    const p = G.p, ci = G.openC;
    const selIt = () => G.sel ? p.inv.find(i => i.uid === G.sel.uid) : null;
    const wtWarn = () => { if (invWeight() > CAP) toast('너무 무겁다 — 느려진다'); };
    const takeOne = (it, c) => queueAction({ uid: it.uid, sfx: 'loot', label: ITEMS[it.id].name + ' 챙기는 중', icon: ITEMS[it.id].icon,
      dur: .35 + ITEMS[it.id].w * (it.n || 1) * .4,
      valid: () => G.openC === c && cItems(c).some(x => x.uid === it.uid),
      done: () => { const arr = cItems(c), i = arr.findIndex(x => x.uid === it.uid); if (i >= 0) { stackAdd(arr.splice(i, 1)[0]); wtWarn(); } } });
    if (act === 'cancel') return cancelActions('행동 취소');
    if (act === 'desel') { G.sel = null; return renderSheet(); }
    if (act === 'tab-bag' || act === 'tab-craft' || act === 'tab-skill') { G.tab = act.slice(4); G.sel = null; return renderSheet(); }
    if (act === 'craft' || act === 'craftmax') { craft(uid, act === 'craft' ? 1 : 99); return renderSheet(); }
    if (act === 'dismantle') { dismantleFurniture(ci); return renderSheet(); }
    if (act === 'benchdismantle') { if (G.nearBench >= 0) dismantleBench(G.nearBench); return renderSheet(); }
    if (act === 'itemdismantle') { const it = selIt(); if (it && !busyUid(it.uid)) dismantleItem(it); return renderSheet(); }
    if (act === 'place') { const it = selIt(); if (it && !busyUid(it.uid)) placeBench(it); return renderSheet(); }
    if (act === 'setfurn') { const it = selIt(); if (it && !busyUid(it.uid)) placeBench(it); return renderSheet(); }
    if (act === 'repair-tape' || act === 'repair-glue') { const it = selIt(); if (it && !busyUid(it.uid)) repairItem(it, act.slice(7)); return renderSheet(); }
    if (act === 'takecont') {
      const it = cItems(ci).find(x => x.uid === uid);
      if (!it || busyUid(uid)) return;
      takeOne(it, ci);
    } else if (act === 'selinv') {
      G.sel = G.sel && G.sel.uid === uid ? null : { uid };
    } else if (act === 'takeall') {
      for (const it of cItems(ci)) if (!busyUid(it.uid)) takeOne(it, ci);
    } else if (act === 'use') {
      const it = selIt(); if (!it || busyUid(it.uid)) return;
      const d = ITEMS[it.id];
      const verb = d.type === 'food' ? '먹는 중' : d.type === 'drink' ? '마시는 중' : (d.stopBleed ? '붕대 감는 중' : '복용 중');
      const aid = d.type === 'med' ? skillLv('aid') : 0;
      queueAction({ uid: it.uid, sfx: d.type === 'food' ? 'eat' : d.type === 'drink' ? 'drink' : (d.stopBleed ? 'bandage' : 'pills'), label: d.name + ' ' + verb, icon: d.icon, dur: (d.time || 2) * (1 - .08 * aid),
        valid: () => p.inv.includes(it),
        done: () => {
          const fr = freshState(it), mul = (fr ? fr.mul : 1) * (it.q || 1);
          if (d.full) p.full = clamp(p.full + (d.full > 0 ? d.full * mul : d.full), 0, 100);
          if (d.hyd) p.hyd = clamp(p.hyd + (d.hyd > 0 ? d.hyd * mul : d.hyd), 0, 100);
          if (d.hp) p.hp = Math.min(100, p.hp + d.hp + aid);
          if (d.cooked) toast('따뜻한 음식 — 기운이 난다');
          if (fr && fr.lv === 2) { if (rand() < .65) { p.sick = 360; toast('상한 음식을 먹었다… 속이 안 좋다', 2400); } else toast('상한 맛이 난다'); }
          if (d.stopBleed) { if (p.bleed) toast('지혈했다'); p.bleed = false; gainXP('aid', 3); p.bandT = 720; }
          p.inv.splice(p.inv.indexOf(it), 1);
          if (G.sel && G.sel.uid === it.uid) G.sel = null;
        } });
    } else if (act === 'equip') {
      const it = selIt(); if (!it || busyUid(it.uid)) return;
      const on = p.equip !== it.uid, d = ITEMS[it.id];
      queueAction({ uid: it.uid, sfx: 'equip', label: d.name + (on ? ' 드는 중' : ' 내려놓는 중'), icon: d.icon, dur: on ? (d.type === 'gun' ? 1 : .6) : .3,
        valid: () => p.inv.includes(it),
        done: () => { p.equip = on ? it.uid : null; updateWeaponLook(); if (on) toast(d.name + ' 장착'); } });
    } else if (act === 'drop') {
      const it = selIt(); if (!it || busyUid(it.uid)) return;
      const c = ci, d = ITEMS[it.id];
      // 묶음 아이템: 1개 / 절반 / 전부
      const qty = d.stack && it.n > 1 ? (uid === '1' ? 1 : uid === 'half' ? Math.floor(it.n / 2) : it.n) : 0;
      queueAction({ uid: it.uid, sfx: 'loot', label: d.name + (c >= 0 ? ' 넣는 중' : ' 버리는 중'), icon: d.icon, dur: .3 + d.w * .2,
        valid: () => p.inv.includes(it) && (c < 0 || G.openC === c),
        done: () => {
          if (qty && qty < it.n) {
            it.n -= qty;
            if (c >= 0) { const part = { uid: G.uid++, id: it.id, n: qty }; const same = cItems(c).find(x => x.id === it.id); if (same) same.n += qty; else cItems(c).push(part); }
            return;
          }
          p.inv.splice(p.inv.indexOf(it), 1);
          if (p.equip === it.uid) { p.equip = null; updateWeaponLook(); }
          if (c >= 0) { const same = d.stack && cItems(c).find(x => x.id === it.id); if (same) same.n += it.n; else cItems(c).push(it); }
          if (G.sel && G.sel.uid === it.uid) G.sel = null;
        } });
    } else if (act === 'sleep') {
      return trySleep();
    } else if (act === 'save') {
      save(true);
    }
    if (ci >= 0) refreshContainer(ci);
    renderSheet(); renderHud();
  }
  function stackAdd(it) {
    if (ITEMS[it.id].stack) {
      const a = G.p.inv.find(i => i.id === it.id);
      if (a) { a.n += it.n || 1; return; }
    }
    G.p.inv.push(it);
  }
  /* ================= 제작 · 분해 · 수리 ================= */
  const has = id => G.p.inv.some(i => i.id === id);
  function countOf(id) {
    let n = 0;
    for (const i of G.p.inv) if (i.id === id) n += ITEMS[id].stack ? (i.n || 0) : ITEMS[id].uses ? (i.u || 0) : 1;
    return n;
  }
  function consume(id, need) {
    const p = G.p, d = ITEMS[id];
    // 장착 안 한 것, 상태 나쁜 것부터 사용
    const list = p.inv.filter(i => i.id === id).sort((a, b) => (a.uid === p.equip) - (b.uid === p.equip) || (a.dur || 0) - (b.dur || 0) || (a.u || 0) - (b.u || 0));
    for (const it of list) {
      if (need <= 0) break;
      if (d.stack) { const k = Math.min(need, it.n); it.n -= k; need -= k; if (it.n <= 0) p.inv.splice(p.inv.indexOf(it), 1); }
      else if (d.uses) { const k = Math.min(need, it.u); it.u -= k; need -= k; if (it.u <= 0) p.inv.splice(p.inv.indexOf(it), 1); }
      else { p.inv.splice(p.inv.indexOf(it), 1); need--; if (p.equip === it.uid) { p.equip = null; updateWeaponLook(); } }
    }
  }
  // 불: 전기 있으면 조리대(가스레인지), 끊기면 모닥불만
  // 음식 부패: 냉장고(전기 있을 때) 안은 4배 느리게
  function ageList(list, rate) { for (const it of list || []) if (ITEMS[it.id] && ITEMS[it.id].fresh) it.age = (it.age || 0) + rate; }
  function ageFood(mins) {
    ageList(G.p.inv, mins);
    M.containers.forEach((c, i) => ageList(G.containers[i], mins * (c.kind === 'fridge' && G.power ? .25 : 1)));
    for (const c of G.corpses) ageList(c.items, mins);
    for (const b of G.placed) ageList(b.items, mins * (b.kind === 'fridge' && G.power ? .25 : 1));
  }
  // 신선도: 0 신선 / 1 시듦(효과 60%) / 2 상함(효과 30%, 식중독 위험)
  function freshState(it) {
    const d = ITEMS[it.id]; if (!d.fresh) return null;
    const a = it.age || 0;
    if (a < d.fresh) return { lv: 0, mul: 1, t: '신선' };
    if (a < d.fresh * 1.6) return { lv: 1, mul: .6, t: '시듦' };
    return { lv: 2, mul: .3, t: '상함' };
  }
  function nearHeat() {
    const p = G.p;
    if (G.placed.some(b => b.type === 'campfire' && Math.hypot(b.x + .5 - p.x, b.y + .5 - p.y) < 1.9)) return 'fire';
    if (!G.power) return null;
    for (let i = 0; i < M.containers.length; i++) { const c = M.containers[i]; if (c.kind === 'cabinet' && !G.removed.has(i) && Math.hypot(c.x + .5 - p.x, c.y + .5 - p.y) < 1.6) return 'stove'; }
    if (G.placed.some(b => b.kind === 'cabinet' && Math.hypot(b.x + .5 - p.x, b.y + .5 - p.y) < 1.6)) return 'stove';
    return null;
  }
  function recipeMax(r) {
    if (r.tools && r.tools.some(t => !has(t))) return 0;
    if (r.bench && G.nearBench < 0) return 0;
    if (r.heat && !nearHeat()) return 0;
    let m = 99;
    for (const [id, need] of r.in) m = Math.min(m, Math.floor(countOf(id) / need));
    return m;
  }
  function giveOut(list, rr) {
    const got = [];
    for (const [id, a, b] of list) {
      const n = a + Math.floor(rr() * (b - a + 1));
      if (n <= 0) continue;
      if (ITEMS[id].stack) { const it = mkItem(id); it.n = n; stackAdd(it); }
      else for (let k = 0; k < n; k++) stackAdd(mkItem(id));
      got.push(ITEMS[id].name + ' ' + n);
    }
    return got;
  }
  function craft(rid, times) {
    const r = RECIPES.find(x => x.id === rid);
    const queued = G.actions.filter(a => a.rid === r.id).length;
    const n = Math.min(times, recipeMax(r) - queued);
    if (n <= 0) return toast(queued ? '이미 만들 수 있는 만큼 대기 중이다' : '재료나 도구가 부족하다');
    for (let k = 0; k < n; k++) {
      const hm = !!(r.tools && r.tools.includes('hammer'));
      const tm = r.time * (r.cook ? 1 - .05 * skillLv('cook') : hm ? 1 - .05 * skillLv('carp') : 1);
      queueAction({ kind: 'craft', rid: r.id, sfx: r.cook ? 'sizzle' : 'craft', hammer: hm, label: ITEMS[r.out].name + (r.cook ? ' 요리 중' : ' 만드는 중'), icon: ITEMS[r.out].icon, dur: tm, noise: r.noise,
        valid: () => { const ok = recipeMax(r) > 0; if (!ok) { toast(ITEMS[r.out].name + ' — 재료가 모자라 중단'); setTimeout(() => { if (!$('sheet').classList.contains('hidden')) renderSheet(); }, 0); } return ok; },
        done: () => {
          for (const [id, need] of r.in) consume(id, need);
          const o = mkItem(r.out); if (ITEMS[r.out].dur) o.dur = ITEMS[r.out].dur;
          if (ITEMS[r.out].fresh) o.age = 0;
          if (r.cook) { o.q = +(1 + .05 * skillLv('cook')).toFixed(2); gainXP('cook', 5); }
          else if (hm) gainXP('carp', 4);
          stackAdd(o); if (invWeight() > CAP) toast('너무 무겁다 — 느려진다');
        } });
    }
  }
  function dismantleFurniture(ci) {
    if (isCorpse(ci) || isPlacedC(ci)) return;
    const kind = M.containers[ci].kind, D = DISMANTLE[kind];
    if (G.containers[ci].length) return toast('먼저 안을 비워야 한다');
    if (!has(D.tool)) return toast(TOOL_NAME[D.tool] + '가 필요하다');
    queueAction({ kind: 'dismantle', hammer: true, label: LOOT[kind].name + ' 분해 중', icon: 'screwdriver', dur: D.time, noise: D.noise,
      valid: () => G.openC === ci && has(D.tool) && !G.containers[ci].length,
      done: () => {
        G.removed.add(ci); refreshContainer(ci);
        const got = giveOut(D.out, rand);
        closeSheet(); toast('분해 완료 — ' + got.join(', '), 2600);
      } });
  }
  function dismantleBench(bi) {
    const D = DISMANTLE.bench;
    if (!has(D.tool)) return toast('망치가 필요하다');
    const b = G.placed[bi];
    queueAction({ kind: 'dismantle', hammer: true, label: '작업대 분해 중', icon: 'screwdriver', dur: D.time, noise: D.noise,
      valid: () => G.placed.includes(b) && has(D.tool),
      done: () => { removePlaced(b); const got = giveOut(D.out, rand); toast('분해 완료 — ' + got.join(', '), 2600); } });
  }
  function dismantleItem(it) {
    const D = ITEM_DISMANTLE[it.id];
    if (D.tool && !has(D.tool)) return toast(TOOL_NAME[D.tool] + '가 필요하다');
    queueAction({ uid: it.uid, sfx: 'craft', hammer: D.tool === 'hammer', label: ITEMS[it.id].name + ' 분해 중', icon: 'screwdriver', dur: D.time, noise: D.noise,
      valid: () => G.p.inv.includes(it) && (!D.tool || has(D.tool)),
      done: () => {
        G.p.inv.splice(G.p.inv.indexOf(it), 1);
        if (G.p.equip === it.uid) { G.p.equip = null; updateWeaponLook(); }
        if (G.sel && G.sel.uid === it.uid) G.sel = null;
        toast('분해 — ' + giveOut(D.out, rand).join(', '));
      } });
  }
  function repairItem(it, mat) {
    const d = ITEMS[it.id], max = it.max || d.dur;
    if (it.dur >= Math.round(max * .9)) return toast('아직 수리할 필요가 없다');
    if (!countOf(mat)) return toast(ITEMS[mat].name + '이(가) 없다');
    queueAction({ uid: it.uid, sfx: 'bandage', label: d.name + ' 수리 중', icon: mat, dur: 3,
      valid: () => G.p.inv.includes(it) && countOf(mat) > 0,
      done: () => {
        consume(mat, 1);
        const m = it.max || d.dur;
        const nm = Math.max(5, Math.round(m * .9)); // 고칠수록 최대 내구도 감소
        it.max = nm;
        it.dur = Math.min(nm, it.dur + Math.round(m * REPAIR[mat]));
        toast(d.name + ' 수리 — 내구도 ' + it.dur + '/' + it.max);
      } });
  }
  // 작업대 설치
  function placeBench(it) {
    const p = G.p, isF = it.id === 'furn' || it.id === 'campkit';
    const spot = () => {
      const cands = [[Math.cos(p.face), Math.sin(p.face)], [1, 0], [-1, 0], [0, 1], [0, -1]];
      const px = Math.floor(p.x), py = Math.floor(p.y);
      for (const [dx, dy] of cands) {
        const x = Math.floor(p.x + dx * .95), y = Math.floor(p.y + dy * .95);
        if (x === px && y === py) continue;
        if (M.moveBlock[y * M.W + x]) continue;
        if (M.opAt[y * M.W + x] || M.dynBlock[y * M.W + x]) continue;
        // 작업대는 문 바로 앞 금지(갇힘 방지). 가구는 다시 들 수 있으니 문 앞에 놓아 막는 것 허용
        if (!isF && [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([ax, ay]) => M.t[(y + ay) * M.W + x + ax] === DT.T.DOOR)) continue;
        if (G.zombies.some(z => !z.dead && Math.floor(z.x) === x && Math.floor(z.y) === y)) continue;
        if (M.containers.some((c, i) => !G.removed.has(i) && c.x === x && c.y === y)) continue;
        if (G.placed.some(b => b.x === x && b.y === y)) continue;
        return [x, y];
      }
      return null;
    };
    if (!spot()) return toast('놓을 자리가 없다');
    queueAction({ uid: it.uid, hammer: !isF, label: isF ? nameOf(it) + ' 내려놓는 중' : '작업대 설치 중', icon: 'bench', dur: isF ? 1.2 : 4, noise: isF ? 2 : 4,
      valid: () => G.p.inv.includes(it) && !!spot(),
      done: () => {
        const [x, y] = spot();
        G.p.inv.splice(G.p.inv.indexOf(it), 1);
        if (G.sel && G.sel.uid === it.uid) G.sel = null;
        if (it.id === 'campkit') { addPlaced({ x, y, type: 'campfire' }); SFX.play('fireup'); toast('모닥불을 피웠다 — 정전돼도 요리 가능'); }
        else if (isF) { addPlaced({ x, y, type: 'furn', kind: it.kind, items: it.items || [] }); SFX.play('place'); toast(nameOf(it) + '을(를) 놓았다'); }
        else { addPlaced({ x, y, type: 'bench' }); SFX.play('place'); toast('작업대를 설치했다'); }
      } });
  }
  function addPlaced(b) {
    G.pid = Math.max(G.pid || 0, (b.id || 0) + 1);
    if (b.id == null) b.id = G.pid++;
    G.placed.push(b);
    M.moveBlock[b.y * M.W + b.x] = 1;
    b.g = el('g', { transform: `translate(${b.x} ${b.y})` }, L.placed);
    if (b.type === 'campfire') {
      el('circle', { cx: .5, cy: .5, r: .38, fill: '#2a2622', stroke: '#6b6660', 'stroke-width': .1, 'stroke-dasharray': '.12 .06' }, b.g);
      el('path', { d: 'M.2 .35L.8 .65M.2 .65L.8 .35', stroke: '#4a3624', 'stroke-width': .1, 'stroke-linecap': 'round' }, b.g);
      el('path', { d: 'M.5 .22Q.72 .45 .6 .66Q.5 .74 .4 .66Q.28 .45 .5 .22Z', fill: '#ff9a2a', class: 'flame' }, b.g);
      el('path', { d: 'M.5 .38Q.6 .52 .55 .62Q.5 .66 .45 .62Q.4 .52 .5 .38Z', fill: '#ffe08a', class: 'flame2' }, b.g);
      b.glow = el('circle', { cx: b.x + .5, cy: b.y + .5, r: 3.6, fill: 'url(#lampGlow)' }, L.fires);
      return;
    }
    if (b.type === 'furn') {
      if (FURN_CONT[b.kind]) drawFurniture(b.g, b.kind); else drawDecor(b.g, { kind: b.kind, x: 0, y: 0, w: 1, h: 1, wx: 0, wy: -1, c: b.id % 6 });
      return;
    }
    el('rect', { x: .0625, y: .125, width: .875, height: .75, fill: '#8a6a45', stroke: '#000', 'stroke-width': .06 }, b.g);
    el('path', { d: 'M.1 .38H.9M.1 .62H.9', stroke: '#5a432d', 'stroke-width': .05 }, b.g);
    el('path', { d: 'M.62 .2L.82 .42M.3 .55l.18 .18', stroke: '#d9dde0', 'stroke-width': .07, 'stroke-linecap': 'round' }, b.g);
  }
  function removePlaced(b) {
    const i = G.placed.indexOf(b); if (i < 0) return;
    G.placed.splice(i, 1);
    M.moveBlock[b.y * M.W + b.x] = 0;
    b.g.remove(); if (b.glow) b.glow.remove();
  }
  function skillLv(k) { return (G.sk && G.sk[k]) ? G.sk[k].lv : 0; }
  function gainXP(k, n) {
    const s = G.sk && G.sk[k]; if (!s || s.lv >= 10) return;
    s.xp += n;
    while (s.lv < 10 && s.xp >= xpNeed(s.lv)) { s.xp -= xpNeed(s.lv); s.lv++; toast(`▲ ${SKILLS[k][0]} Lv${s.lv}`, 2200); SFX.play('levelup'); }
  }
  function findInteract() {
    const p = G.p;
    let best = null, bd = 1.35;
    const px = Math.floor(p.x), py = Math.floor(p.y);
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
      const k = (py + dy) * M.W + px + dx, o = M.opAt[k];
      if (!o) continue;
      const d = Math.hypot(o.x + .5 - p.x, o.y + .5 - p.y);
      if (d < bd) { bd = d; best = { t: 'op', o }; }
    }
    // 들 수 있는 가구: 수납가구(빈 것), 실내가구, 배치한 가구
    let fd = 1.35, fb = null;
    for (let i = 0; i < M.containers.length; i++) {
      if (G.removed.has(i)) continue;
      const c = M.containers[i], d = Math.hypot(c.x + .5 - p.x, c.y + .5 - p.y);
      if (d < fd) { fd = d; fb = { t: 'cont', i, kind: c.kind }; }
    }
    for (let i = 0; i < (M.decor || []).length; i++) {
      if (G.rmDecor && G.rmDecor.has(i)) continue;
      const q = M.decor[i];
      const d = Math.hypot(clamp(p.x, q.x, q.x + q.w) - p.x, clamp(p.y, q.y, q.y + q.h) - p.y) + .4;
      if (d < fd) { fd = d; fb = { t: 'decor', i, kind: q.kind }; }
    }
    for (const b of G.placed) {
      const d = Math.hypot(b.x + .5 - p.x, b.y + .5 - p.y);
      if (d < fd) { fd = d; fb = { t: 'placed', b, kind: b.type === 'bench' ? 'bench' : b.type === 'campfire' ? 'campfire' : b.kind }; }
    }
    G.nearOp = best; G.nearLift = fb;
  }
  function altOptions() {
    const out = [], p = G.p;
    const hammer = has('hammer'), boards = countOf('barricade');
    if (G.nearOp) {
      const o = G.nearOp.o, s = G.ds[o.k], nb = s.b.length;
      if (o.type === 'door') {
        if (!s.br && !nb) out.push(s.o ? ['doorClose', '문 닫기', 'close'] : ['doorOpen', '문 열기', 'hand']);
        if ((!s.o || s.br) && nb < 4) out.push(['board', `판자로 막기 (${nb}/4)`, 'barricade', !(hammer && boards)]);
      } else {
        if (!s.br && !nb) out.push(['smash', '창문 깨기', 'fist']);
        if (s.br && !nb) out.push(['climb', '창문 넘기', 'run']);
        if (nb < 4) out.push(['board', `판자로 막기 (${nb}/4)`, 'barricade', !(hammer && boards)]);
      }
      if (nb) out.push(['unboard', '판자 떼기', 'hammer', !hammer]);
    }
    if (G.nearLift) {
      const f = G.nearLift, nm = f.kind === 'bench' ? '작업대' : f.kind === 'campfire' ? '모닥불' : FURN[f.kind][0];
      if (f.kind === 'campfire') out.push(['lift', '모닥불 끄기', 'fire']);
      else out.push(['lift', nm + ' 들기', 'bench']);
    }
    return out;
  }
  function doAlt(act) {
    const p = G.p;
    const o = G.nearOp && G.nearOp.o, s = o && G.ds[o.k];
    const carp = 1 - .05 * skillLv('carp');
    $('altMenu').classList.add('hidden');
    if (act === 'doorOpen' || act === 'doorClose') {
      const opening = act === 'doorOpen';
      if (!opening && (Math.floor(p.x) === o.x && Math.floor(p.y) === o.y || G.zombies.some(z => !z.dead && Math.floor(z.x) === o.x && Math.floor(z.y) === o.y))) return toast('문 사이에 뭔가 있다');
      queueAction({ kind: 'door', urgent: true, label: opening ? '문 여는 중' : '문 닫는 중', icon: 'hand', dur: .35,
        valid: () => !s.br && !s.b.length, done: () => { s.o = opening ? 1 : 0; updTile(o.k); SFX.play('door', { close: !opening }); noise(o.x + .5, o.y + .5, 2.5, false); } });
    } else if (act === 'board') {
      if (!has('hammer')) return toast('망치가 필요하다');
      if (!countOf('barricade')) return toast('바리케이드 판자가 필요하다 (제작: 판자+못)');
      queueAction({ kind: 'board', hammer: true, noise: 7, label: '판자 박는 중', icon: 'barricade', dur: 4 * carp,
        valid: () => s.b.length < 4 && has('hammer') && countOf('barricade') > 0 && !(o.type === 'door' && s.o && !s.br),
        done: () => { consume('barricade', 1); s.b.push(BOARD_HP + skillLv('carp')); updTile(o.k); gainXP('carp', 6); toast('판자로 막았다 (' + s.b.length + '/4)'); } });
    } else if (act === 'unboard') {
      if (!has('hammer')) return toast('망치가 필요하다');
      queueAction({ kind: 'board', hammer: true, noise: 5, label: '판자 떼는 중', icon: 'hammer', dur: 3 * carp,
        valid: () => s.b.length > 0 && has('hammer'),
        done: () => { s.b.pop(); updTile(o.k); stackAdd(mkItem(rand() < .7 ? 'barricade' : 'plank')); gainXP('carp', 3); } });
    } else if (act === 'smash') {
      queueAction({ kind: 'smash', urgent: true, label: '창문 깨는 중', icon: 'fist', dur: .6,
        valid: () => !s.br && !s.b.length, done: () => { s.br = 1; updTile(o.k); SFX.play('glass'); noise(o.x + .5, o.y + .5, 10, true); shake(.25); } });
    } else if (act === 'climb') {
      queueAction({ kind: 'climb', urgent: true, sfx: 'climb', label: '창문 넘는 중', icon: 'run', dur: 1.3,
        valid: () => s.br && !s.b.length && Math.hypot(o.x + .5 - p.x, o.y + .5 - p.y) < 1.6,
        done: () => {
          // 벽 반대편으로
          if (o.horiz) { p.x = o.x + .5; p.y = o.y + .5 + (p.y < o.y + .5 ? 1 : -1); }
          else { p.y = o.y + .5; p.x = o.x + .5 + (p.x < o.x + .5 ? 1 : -1); }
          resolve(p);
          if (rand() < .12) { p.bleed = true; p.hp -= 3; hurtFlash(); toast('깨진 유리에 베였다 — 출혈'); }
        } });
    } else if (act === 'lift') {
      const f = G.nearLift; if (!f) return;
      const kind = f.kind;
      if (f.t === 'cont' && G.containers[f.i].length) return toast('먼저 안을 비워야 한다');
      if (f.t === 'placed' && f.b.items && f.b.items.length) return toast('먼저 안을 비워야 한다');
      if (G.p.inv.some(i => i.id === 'furn')) return toast('가구는 한 번에 하나만 들 수 있다');
      if (kind === 'campfire') return queueAction({ kind: 'lift', label: '모닥불 끄는 중', icon: 'fire', dur: 1, valid: () => true, done: () => { removePlaced(f.b); toast('모닥불을 껐다'); } });
      queueAction({ kind: 'lift', label: (kind === 'bench' ? '작업대' : FURN[kind][0]) + ' 드는 중', icon: 'bench', dur: 1.5, noise: 2,
        valid: () => true,
        done: () => {
          if (f.t === 'cont') { G.removed.add(f.i); refreshContainer(f.i); }
          else if (f.t === 'decor') liftDecorVisual(f.i);
          else removePlaced(f.b);
          if (kind === 'bench') stackAdd(mkItem('benchkit'));
          else { const it = mkItem('furn'); it.kind = kind; it.w = FURN[kind][1]; if (FURN_CONT[kind]) it.items = []; stackAdd(it); }
          toast((kind === 'bench' ? '작업대' : FURN[kind][0]) + '을(를) 들었다 — 가방에서 내려놓기');
        } });
    }
  }
  // 실내가구 들어내기: 막힘 해제 + 바닥 덮개
  function liftDecorVisual(i, silent) {
    const q = M.decor[i]; if (!q) return;
    G.rmDecor = G.rmDecor || new Set(); G.rmDecor.add(i);
    for (let yy = q.y; yy < q.y + q.h; yy++) for (let xx = q.x; xx < q.x + q.w; xx++) { M.moveBlock[yy * M.W + xx] = 0; if (M.deco) M.deco[yy * M.W + xx] = 0; }
    const hh = M.houses.find(h => q.x >= h.x && q.x < h.x + h.w && q.y >= h.y && q.y < h.y + h.h);
    el('rect', { x: q.x, y: q.y, width: q.w + .16, height: q.h + .16, fill: `url(#${(hh && hh.floor) || 'floorPat'})` }, L.gCover);
    if (!silent) G.dsV++;
  }
  function renderAlt() {
    const b = $('btnAlt'), opts = altOptions();
    const key = opts.map(o => o[0] + (o[3] ? '0' : '1')).join(',');
    if (b._k === key) return; b._k = key;
    if (!opts.length) { b.classList.add('hidden'); $('altMenu').classList.add('hidden'); return; }
    b.classList.remove('hidden');
    const first = opts.find(o => !o[3]) || opts[0];
    $('altIcon').setAttribute('href', '#i-' + (opts.length > 1 ? 'hand' : first[2]));
    $('altLbl').textContent = opts.length > 1 ? `행동 ${opts.length}` : first[1];
    $('altMenu').innerHTML = opts.map(o => `<button data-alt="${o[0]}"${o[3] ? ' class="off"' : ''}>${ico(o[2])}${o[1]}</button>`).join('');
  }
  function trySleep() {
    const p = G.p;
    if (p.energy > 85) return toast('졸리지 않다');
    if (p.bleed) return toast('피를 흘리는 중에는 잘 수 없다');
    if (G.zombies.some(z => !z.dead && Math.hypot(z.x - p.x, z.y - p.y) < (z.state === 'chase' ? 16 : 7))) return toast('근처에 좀비가 있어 잘 수 없다');
    cancelActions();
    closeSheet();
    G.inBed = (M.decor || []).some((d, i) => d.kind === 'bed' && !(G.rmDecor && G.rmDecor.has(i)) && p.x > d.x - 1 && p.x < d.x + d.w + 1 && p.y > d.y - 1 && p.y < d.y + d.h + 1)
      || G.placed.some(b => b.kind === 'bed' && Math.hypot(b.x + .5 - p.x, b.y + .5 - p.y) < 1.6);
    toast(G.inBed ? '침대에서 잔다 — 더 빨리 회복' : '바닥에서 잔다', 2000);
    G.sleeping = true;
    $('sleep').classList.remove('hidden');
    input.jx = input.jy = 0;
  }
  function wake(msg) {
    G.sleeping = false;
    $('sleep').classList.add('hidden');
    if (msg) toast(msg, 2200);
  }

  /* ================= 저장 ================= */
  function serialize() {
    const p = G.p;
    return {
      v: 1, seed: G.seed, time: G.time, kills: G.kills, uid: G.uid, lastHour: G.lastHour,
      p: { x: p.x, y: p.y, face: p.face, hp: p.hp, full: p.full, hyd: p.hyd, energy: p.energy, endu: p.endu,
        bleed: p.bleed, infected: p.infected, infT: p.infT, inv: p.inv, equip: p.equip, sick: p.sick || 0 },
      rain: G.rain, rainTarget: G.rainTarget, weatherNext: G.weatherNext, sk: G.sk, power: G.power, powerOffAt: G.powerOffAt, sick: G.p.sick,
      cont: G.containers, searched: [...G.searched], removed: [...G.removed], placed: G.placed.map(b => ({ x: b.x, y: b.y, type: b.type, kind: b.kind, items: b.items, id: b.id })), ds: G.ds, rmDecor: [...(G.rmDecor || [])],
      z: G.zombies.filter(z => !z.dead).map(z => [+z.x.toFixed(2), +z.y.toFixed(2), +z.hp.toFixed(2), z.shirt, 0, 0, z.lk]),
      c: G.corpses.map(c => [+c.x.toFixed(2), +c.y.toFixed(2), +c.a.toFixed(2), c.shirt, c.items, c.searched ? 1 : 0, c.id, c.lk]),
      look: G.look, mapV: G.mapV || 1, exp: encExp(),
    };
  }
  function save(manual) {
    if (!G || G.dead) return;
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(serialize())); if (manual) toast('저장했다'); }
    catch (e) { if (manual) toast('저장 실패 (저장공간 차단됨)'); }
  }
  function loadSave() {
    try { const s = localStorage.getItem(SAVE_KEY); return s ? JSON.parse(s) : null; } catch (e) { return null; }
  }
  function clearSave() { try { localStorage.removeItem(SAVE_KEY); } catch (e) {} }

  // 큰 마을은 만드는 데 시간이 걸리므로 '만드는 중' 화면을 먼저 띄움
  function withLoading(fn, msg) {
    const o = $('loading'); o.querySelector('b').textContent = msg || '마을을 만드는 중…'; o.classList.remove('hidden');
    requestAnimationFrame(() => setTimeout(() => { try { fn(); } finally { o.classList.add('hidden'); } }, 30));
  }
  function newGame() {
    if (L.releaseAll) L.releaseAll(); input.run = false;
    const seed = (Math.random() * 1e9) | 0;
    G = baseState(seed);
    G.mapV = window.DT_MAPV || 2;
    G.look = loadLook();
    setupWorld(seed);
    initOpenings();
    const p = G.p;
    p.x = M.spawn.x + .5; p.y = M.spawn.y + .5;
    const lr = DT.rng(seed ^ 0x5bd1e995);
    G.containers = M.containers.map(c => rollLoot(c.kind, lr));
    if (M.spawnContainer >= 0) G.containers[M.spawnContainer].push(mkItem('hammer'));
    else p.inv.push(mkItem('hammer'));
    p.inv.push(mkItem('water'), mkItem('chips'), mkItem('bandage'));
    spawnZombies(Math.round(75 * Math.max(1, M.KA * .8)), 14, false);
    for (let i = 0; i < M.containers.length; i++) refreshContainer(i);
    updateWeaponLook();
    start();
    save(false);
  }
  function continueGame(s) {
    if (L.releaseAll) L.releaseAll(); input.run = false;
    G = baseState(s.seed);
    G.mapV = s.mapV || 1;
    G.look = s.look || loadLook();
    G.searched = new Set(s.searched || []);
    G.removed = new Set(s.removed || []);
    setupWorld(s.seed);
    initOpenings(s.ds);
    decExp(s.exp);
    if (s.exp == null) G.exp.fill(1); // 예전 저장: 지도는 전부 보이게
    for (const i of (s.rmDecor || [])) liftDecorVisual(i, true);
    G.time = s.time; G.kills = s.kills; G.uid = s.uid; G.lastHour = s.lastHour;
    if (s.rain != null) { G.rain = s.rain; G.rainTarget = s.rainTarget; G.weatherNext = s.weatherNext; }
    if (s.sk) for (const k in G.sk) if (s.sk[k]) G.sk[k] = s.sk[k];
    if (s.power != null) { G.power = s.power; G.powerOffAt = s.powerOffAt; }
    Object.assign(G.p, s.p);
    if (M.moveBlock[Math.floor(G.p.y) * M.W + Math.floor(G.p.x)]) { // 새 가구가 생긴 자리에 저장됐으면 옆 칸으로
      let best = null;
      for (let r = 1; r < 6 && !best; r++) for (let dy = -r; dy <= r && !best; dy++) for (let dx = -r; dx <= r; dx++) { const x = Math.floor(G.p.x) + dx, y = Math.floor(G.p.y) + dy; if (x > 0 && y > 0 && x < M.W - 1 && y < M.H - 1 && !M.moveBlock[y * M.W + x]) { best = [x + .5, y + .5]; break; } }
      if (best) { G.p.x = best[0]; G.p.y = best[1]; }
    }
    const known = i => i && ITEMS[i.id];
    G.p.inv = (G.p.inv || []).filter(known);
    G.containers = M.containers.map((c, i) => ((s.cont || [])[i] || []).filter(known));
    for (const [x, y, hp, shirt, skin, bw, lk] of s.z) addZombie(x, y, hp, shirt, skin, bw, lk);
    for (const [x, y, a, shirt, items, sr, id, lk] of (s.c || [])) addCorpse(x, y, a, shirt, (items || []).filter(i => i && ITEMS[i.id]), sr, id, lk);
    for (const b of (s.placed || [])) addPlaced({ x: b.x, y: b.y, type: b.type, kind: b.kind, items: (b.items || []).filter(known), id: b.id });
    for (let i = 0; i < M.containers.length; i++) refreshContainer(i);
    updateWeaponLook();
    start();
  }
  function start() {
    G.running = true; G.paused = false;
    for (const id of ['title', 'dead', 'menu', 'sheet', 'sleep', 'bigmap']) $(id).classList.add('hidden');
    renderAction();
    renderHud();
  }
  function die() {
    SFX.play('death');
    G.actions = []; renderAction();
    G.dead = true; G.running = false; G.sleeping = false;
    clearSave();
    const hrs = (G.time - 540) / 60;
    $('deadStat').innerHTML = `<b>${Math.floor(hrs / 24)}일 ${Math.floor(hrs % 24)}시간</b> 생존했다.<br>처치한 좀비 ${G.kills}마리.`;
    $('sleep').classList.add('hidden');
    $('lowhp').classList.remove('on');
    $('dead').classList.remove('hidden');
  }

  /* ================= 입력 ================= */
  function setupInput() {
    const zone = $('joyzone'), joy = $('joy'), knob = $('knob');
    let jid = null, ox = 0, oy = 0;
    const R = 54;
    // 화면 좌표 → 게임(회전 반영) 좌표
    const local = e => document.documentElement.classList.contains('rot') ? [e.clientY, innerWidth - e.clientX] : [e.clientX, e.clientY];
    zone.addEventListener('pointerdown', e => {
      if (jid !== null) return;
      jid = e.pointerId; [ox, oy] = local(e);
      joy.classList.add('free', 'active');
      joy.style.left = (ox - zone.offsetLeft) + 'px';
      joy.style.bottom = (zone.offsetTop + zone.offsetHeight - oy) + 'px';
      try { zone.setPointerCapture(jid); } catch (err) {}
      e.preventDefault();
    });
    zone.addEventListener('pointermove', e => {
      if (e.pointerId !== jid) return;
      const [lx, ly] = local(e);
      let dx = lx - ox, dy = ly - oy;
      const d = Math.hypot(dx, dy);
      if (d > R) { dx = dx / d * R; dy = dy / d * R; }
      knob.style.transform = `translate(${dx}px,${dy}px)`;
      input.jx = dx / R; input.jy = dy / R;
    });
    const end = e => {
      if (e.pointerId !== jid) return;
      jid = null; input.jx = input.jy = 0;
      knob.style.transform = '';
      joy.classList.remove('free', 'active'); joy.style.left = ''; joy.style.bottom = '';
    };
    zone.addEventListener('pointerup', end);
    zone.addEventListener('pointercancel', end);

    const atk = $('btnAttack');
    atk.addEventListener('pointerdown', e => { e.preventDefault(); input.attackHeld = true; if (G && G.running && !G.paused) playerAttack(); });
    const atkUp = () => { input.attackHeld = false; };
    atk.addEventListener('pointerup', atkUp); atk.addEventListener('pointercancel', atkUp); atk.addEventListener('pointerleave', atkUp);
    $('btnUse').addEventListener('click', () => { if (G.nearC >= 0) startSearch(G.nearC); else if (G.nearBench >= 0) { G.tab = 'craft'; openSheet(-1); } });
    $('btnBag').addEventListener('click', () => { G.tab = 'bag'; openSheet(-1); });
    $('btnAlt').addEventListener('click', () => {
      const opts = altOptions(); if (!opts.length) return;
      if (opts.length === 1) { const o = opts[0]; if (o[3]) return toast(o[0] === 'board' ? (has('hammer') ? '바리케이드 판자가 필요하다' : '망치가 필요하다') : '망치가 필요하다'); return doAlt(o[0]); }
      $('altMenu').classList.toggle('hidden');
    });
    $('altMenu').addEventListener('click', e => {
      const b = e.target.closest('button[data-alt]'); if (!b) return;
      if (b.classList.contains('off')) { $('altMenu').classList.add('hidden'); return toast(b.dataset.alt === 'board' && has('hammer') ? '바리케이드 판자가 필요하다 (제작: 판자+못)' : '망치가 필요하다'); }
      doAlt(b.dataset.alt);
    });
    $('sheetClose').addEventListener('click', closeSheet);
    document.addEventListener('pointerdown', e => { if (e.target.closest('.sheet-card button, .overlay button, .qb, #menuBtn, #minimap, #btnBag, #btnUse')) SFX.play('ui'); }, true);
    $('quick').addEventListener('click', e => { const b = e.target.closest('button[data-q]'); if (b) quickAct(b.dataset.q, +b.dataset.uid); });
    document.querySelector('.sheet-card').addEventListener('click', e => {
      const c = e.target.closest('.card');
      if (c && c.classList.contains('busy')) { const u = +c.dataset.uid; G.actions = G.actions.filter(a => a.uid !== u); toast('취소했다'); renderAction(); return renderSheet(); }
      if (c) return sheetAction(c.dataset.src === 'cont' ? 'takecont' : 'selinv', +c.dataset.uid);
      const b = e.target.closest('button[data-act]');
      if (b && !b.disabled) sheetAction(b.dataset.act, b.dataset.rid || null);
    });
    $('minimap').addEventListener('click', () => {
      if (!G || !G.running) return;
      G.paused = true; if (G.expDirty) { G.expDirty = false; updateMapMask(); } fitBigmap();
      $('bigmap').classList.remove('hidden');
    });
    $('mapClose').addEventListener('click', () => { $('bigmap').classList.add('hidden'); resumeIfFree(); });
    $('bigmap').addEventListener('click', e => { if (e.target.id === 'bigmap') { $('bigmap').classList.add('hidden'); resumeIfFree(); } });
    $('wakeBtn').addEventListener('click', () => wake());
    $('menuBtn').addEventListener('click', () => {
      if (!G || !G.running) return;
      G.paused = true;
      const hrs = (G.time - 540) / 60;
      $('menuStat').textContent = `생존 ${Math.floor(hrs / 24)}일 ${Math.floor(hrs % 24)}시간 · 처치 ${G.kills}`;
      $('menu').classList.remove('hidden');
    });
    $('mResume').addEventListener('click', () => { $('menu').classList.add('hidden'); resumeIfFree(); });
    $('mSave').addEventListener('click', () => { save(true); });
    const sb = $('mSound');
    const syncSound = () => { sb.textContent = DT.sfx && DT.sfx.isOn() ? '소리: 켜짐' : '소리: 꺼짐'; };
    syncSound();
    sb.addEventListener('click', () => { if (DT.sfx) DT.sfx.setOn(!DT.sfx.isOn()); syncSound(); });
    const shb = $('mShake');
    const syncShake = () => { shb.textContent = shakeOn ? '화면 흔들림: 켜짐' : '화면 흔들림: 꺼짐'; };
    syncShake();
    shb.addEventListener('click', () => { shakeOn = !shakeOn; try { localStorage.setItem('deadtown_shake', shakeOn ? '1' : '0'); } catch (e) {} if (!shakeOn && G) { G.trauma = 0; G.kx = G.ky = 0; } syncShake(); if (shakeOn) shake(.5, 0, 6); });
    $('mNew').addEventListener('click', () => {
      const b = $('mNew');
      if (!b.classList.contains('confirm')) { b.classList.add('confirm'); b.textContent = '한 번 더 누르면 현재 기록이 삭제됩니다'; setTimeout(() => { b.classList.remove('confirm'); b.textContent = '새 게임'; }, 3000); return; }
      b.classList.remove('confirm'); b.textContent = '새 게임';
      clearSave(); withLoading(newGame);
    });
    // 타이틀: 캐릭터 외모 고르기
    let tLook = loadLook();
    const drawPreview = () => {
      const sv = $('lookSvg'); sv.innerHTML = '';
      const gg = el('g', { transform: 'translate(50 50) scale(95) rotate(-90)' }, sv);
      drawPlayerArt(gg, tLook, {});
      $('lkSkin').textContent = '피부 ' + (tLook.skin + 1);
      $('lkHair').textContent = LOOK.hairName[tLook.hair];
      $('lkHc').textContent = '머리색 ' + (tLook.hc + 1);
      $('lkJk').textContent = LOOK.jacketName[tLook.jacket];
    };
    const LK = { lkSkin: ['skin', LOOK.skin.length], lkHair: ['hair', LOOK.hair.length], lkHc: ['hc', LOOK.hc.length], lkJk: ['jacket', LOOK.jacket.length] };
    document.querySelectorAll('.lk-row button').forEach(b => b.addEventListener('click', () => {
      const [k, n] = LK[b.dataset.k], d = +b.dataset.d;
      tLook[k] = (tLook[k] + d + n) % n; saveLook(tLook); drawPreview();
    }));
    $('lkRand').addEventListener('click', () => { for (const id in LK) { const [k, n] = LK[id]; tLook[k] = (Math.random() * n) | 0; } saveLook(tLook); drawPreview(); });
    drawPreview();
    $('tNew').addEventListener('click', () => {
      const b = $('tNew');
      if (loadSave() && !b.classList.contains('confirm')) { b.classList.add('confirm'); b.textContent = '한 번 더 누르면 이어하기 기록이 삭제됩니다'; setTimeout(() => { b.classList.remove('confirm'); b.textContent = '새 게임'; }, 3000); return; }
      b.classList.remove('confirm'); b.textContent = '새 게임';
      withLoading(newGame);
    });
    $('tContinue').addEventListener('click', () => { const s = loadSave(); if (s) withLoading(() => continueGame(s), '불러오는 중…'); else withLoading(newGame); });
    $('dRestart').addEventListener('click', () => withLoading(newGame));

    const kmap = { KeyW: 'up', ArrowUp: 'up', KeyS: 'down', ArrowDown: 'down', KeyA: 'left', ArrowLeft: 'left', KeyD: 'right', ArrowRight: 'right', ShiftLeft: 'shift', ShiftRight: 'shift', ControlLeft: 'ctrl', ControlRight: 'ctrl', Space: 'space' };
    addEventListener('keydown', e => {
      if (kmap[e.code]) { keys[kmap[e.code]] = true; e.preventDefault(); }
      if (!G || !G.running) return;
      if (e.code === 'Escape') { closeSheet(); $('bigmap').classList.add('hidden'); $('menu').classList.add('hidden'); resumeIfFree(); updKeys(); return; }
      if (G.paused) { updKeys(); return; }
      if (e.code === 'KeyE' && G.nearC >= 0 && G.openC < 0) startSearch(G.nearC);
      else if (e.code === 'KeyF') $('btnAlt').click();
      else if (e.code === 'KeyI' || e.code === 'Tab') { e.preventDefault(); if ($('sheet').classList.contains('hidden')) openSheet(-1); else closeSheet(); }
      else if (e.code === 'KeyM') $('minimap').click();
      updKeys();
    });
    addEventListener('keyup', e => { if (kmap[e.code]) keys[kmap[e.code]] = false; updKeys(); });
    const releaseAll = () => { for (const k in keys) keys[k] = false; updKeys(); input.attackHeld = false; input.jx = input.jy = 0; jid = null; knob.style.transform = ''; joy.classList.remove('free', 'active'); joy.style.left = ''; joy.style.bottom = ''; };
    L.releaseAll = releaseAll;
    addEventListener('blur', releaseAll);
    document.addEventListener('visibilitychange', () => { if (document.hidden) releaseAll(); });
    function updKeys() { input.kx = (keys.right ? 1 : 0) - (keys.left ? 1 : 0); input.ky = (keys.down ? 1 : 0) - (keys.up ? 1 : 0); }

    document.addEventListener('touchmove', e => { if (!e.target.closest('.scroll')) e.preventDefault(); }, { passive: false });
    document.addEventListener('gesturestart', e => e.preventDefault());
    document.addEventListener('dblclick', e => e.preventDefault());
    document.addEventListener('visibilitychange', () => { if (document.hidden) save(false); });
    addEventListener('pagehide', () => save(false));
  }

  function onResize() {
    // 폰이 세로로 인식되면 게임 화면을 90도 돌려서 가로로 표시
    const rot = innerHeight > innerWidth;
    document.documentElement.classList.toggle('rot', rot);
    const app = $('app');
    if (rot) { app.style.width = innerHeight + 'px'; app.style.height = innerWidth + 'px'; app.style.left = innerWidth + 'px'; }
    else { app.style.width = app.style.height = app.style.left = ''; }
    VW = rot ? innerHeight : innerWidth; VH = rot ? innerWidth : innerHeight; L.panelW = 0; L._psx = null;
    requestAnimationFrame(() => { const j = $('joy'), b = $('btns'); L.quickMid = (j.offsetLeft + j.offsetWidth + b.offsetLeft) / 2; L._psx = null; });
    view.setAttribute('viewBox', `0 0 ${VW} ${VH}`);

  }

  let last = 0;
  function frame(ts) {
    requestAnimationFrame(frame);
    const dt = Math.min(.05, Math.max(0, (ts - last) / 1000));
    last = ts;
    try {
      if (G && G.running && !G.paused) { if (G.hitStop > 0) G.hitStop -= dt; else update(dt); }
      if (G && M && !G.dead) render(dt);
    } catch (e) { if (!frame._err) { frame._err = 1; console.error(e); } }
  }

  // 미리보기(preview.html)에서 아이폰 노치/홈바 영역 흉내
  if (/[?&]sim=1/.test(location.search)) { const r = document.documentElement.style; r.setProperty('--st', '0px'); r.setProperty('--sb', '21px'); r.setProperty('--sl', '59px'); r.setProperty('--sr', '59px'); }
  // 가로 전용: 지원하는 기기(안드로이드 등)는 화면 방향을 가로로 고정.
  // 아이폰은 웹에서 고정이 막혀 있어서, 세로로 인식되면 화면을 90도 돌려 가로로 표시 (onResize).
  function lockLandscape() {
    try {
      const d = document.documentElement;
      const p = d.requestFullscreen && !document.fullscreenElement ? d.requestFullscreen({ navigationUI: 'hide' }) : Promise.resolve();
      Promise.resolve(p).then(() => screen.orientation && screen.orientation.lock && screen.orientation.lock('landscape')).catch(() => {});
    } catch (e) {}
  }
  addEventListener('pointerdown', lockLandscape, { once: true });
  addEventListener('orientationchange', () => setTimeout(onResize, 120));
  addEventListener('resize', onResize);
  onResize();
  // 오프라인 실행: 웹주소(https)로 열었을 때만 서비스워커 등록 (파일 더블클릭 실행에선 안 함)
  if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
    addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
  }
  setupInput();
  if (loadSave()) $('tContinue').classList.remove('hidden');
  requestAnimationFrame(frame);

  window.DT.debug = { mkItem: id => mkItem(id), stackAdd: it => stackAdd(it), RECIPES, get G() { return G; }, get M() { return M; }, get AS() { return AS; }, newGame, save, loadSave, continueGame, playerAttack, noise, openSheet };
})();
