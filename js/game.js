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
  const ico = (n, cls) => `<svg class="${cls || ''}"><use href="#i-${n}"/></svg>`;

  /* ================= 아이템 ================= */
  const ITEMS = {
    apple:   { name: '사과', w: .2, type: 'food', full: 12, hyd: 5, time: 2, icon: 'apple' },
    bread:   { name: '빵', w: .3, type: 'food', full: 22, time: 3, icon: 'bread' },
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
    // --- 제작 무기 ---
    nailbat: { name: '못 박힌 판자', w: 1.3, type: 'melee', dmg: 1.2, range: 1.25, cd: .8, endu: 10, dur: 30, knock: .45, color: '#a47a4c', icon: 'nailbat' },
    spear:   { name: '창', w: 1.6, type: 'melee', dmg: 1.5, range: 1.8, cd: .85, endu: 10, dur: 45, knock: .3, color: '#8d99a3', icon: 'spear' },
  };
  const STACK_ROLL = { ammo: [6, 15], nails: [3, 10], cloth: [2, 4] };
  const TOOL_NAME = { hammer: '망치', screwdriver: '드라이버' };
  // 제작 레시피: in = [아이템, 개수] (못·천은 개수, 테이프·접착제는 사용 횟수)
  const RECIPES = [
    { id: 'bandage',   in: [['cloth', 2]], out: 'bandage', time: 3 },
    { id: 'barricade', in: [['plank', 1], ['nails', 2]], tools: ['hammer'], out: 'barricade', time: 4, noise: 5 },
    { id: 'nailbat',   in: [['plank', 1], ['nails', 3]], tools: ['hammer'], out: 'nailbat', time: 5, noise: 5 },
    { id: 'benchkit',  in: [['plank', 4], ['nails', 6]], tools: ['hammer'], out: 'benchkit', time: 10, noise: 6 },
    { id: 'spear',     in: [['pipe', 1], ['knife', 1], ['tape', 1]], out: 'spear', time: 6, bench: true },
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
  const FISTS = { name: '맨손', type: 'melee', dmg: .35, range: .85, cd: .5, endu: 4, knock: .25, icon: 'fist' };
  const LOOT = {
    fridge:  { name: '냉장고', color: '#f4f4f4', pool: [['apple', 3], ['bread', 2], ['water', 3], ['soda', 3], ['can', 1]], min: 1, max: 3 },
    cabinet: { name: '찬장', color: '#a17a50', pool: [['can', 3], ['chips', 3], ['water', 1], ['bread', 1], ['pills', 1], ['tape', .8], ['glue', .6]], min: 0, max: 3 },
    drawer:  { name: '서랍', color: '#7a5a3a', pool: [['bandage', 3], ['knife', 1.2], ['ammo', .8], ['pills', 2], ['hammer', .8], ['nails', 1.6], ['tape', 1], ['screwdriver', .9], ['glue', .5]], min: 0, max: 3 },
    closet:  { name: '옷장', color: '#5a432d', pool: [['bandage', 2], ['bat', 1.5], ['pipe', .8], ['pistol', .35], ['ammo', 1], ['shirt', 2.5], ['cloth', 1]], min: 0, max: 3 },
  };
  const CAP = 15;          // 무게 한도
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
      actions: [], placed: [], removed: new Set(), tab: 'bag', nearBench: -1, lastHour: 9, night: 0, saveT: 0, hudT: 0, dead: false, shake: 0, dmgInd: [], nearC: -1,
    };
  }

  /* ================= 월드 구성 ================= */
  function setupWorld(seed) {
    M = DT.generateMap(seed);
    AS = new DT.AStar(M.W, M.H, M.moveBlock);
    pathQueue = [];
    buildScene();
    buildMaps();
  }

  function runsPath(pred) {
    const W = M.W, H = M.H, t = M.t;
    let d = '';
    for (let y = 0; y < H; y++) {
      let x = 0;
      while (x < W) {
        if (pred(t[y * W + x])) {
          const s = x;
          while (x < W && pred(t[y * W + x])) x++;
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
    const pat = el('pattern', { id: 'floorPat', patternUnits: 'userSpaceOnUse', width: 1, height: 1 }, defs);
    el('rect', { width: 1, height: 1, fill: '#5e4b37' }, pat);
    el('path', { d: 'M0 .333H1M0 .666H1M.5 0V.333M.2 .333V.666M.75 .666V1', stroke: '#473727', 'stroke-width': .035, fill: 'none' }, pat);
    const rg = el('radialGradient', { id: 'vign', cx: '50%', cy: '50%', r: '75%' }, defs);
    el('stop', { offset: '55%', 'stop-color': '#000', 'stop-opacity': 0 }, rg);
    el('stop', { offset: '100%', 'stop-color': '#000', 'stop-opacity': .85 }, rg);

    L.world = el('g', {}, view);
    const gr = el('g', {}, L.world);
    el('rect', { x: 0, y: 0, width: W, height: H, fill: '#262d20' }, gr);
    const rr = DT.rng(M.W * 7 + 13);
    let dp = '';
    for (let i = 0; i < 420; i++) dp += circ(rr() * W, rr() * H, .3 + rr() * .9);
    el('path', { d: dp, fill: '#20271b' }, gr);
    el('path', { d: runsPath(v => v === T.ROAD), fill: '#161616' }, gr);
    // 도로 균열
    let crack = '';
    for (let i = 0; i < 160; i++) {
      const x = 1 + rr() * (W - 2), y = 1 + rr() * (H - 2);
      if (M.t[Math.floor(y) * W + Math.floor(x)] !== T.ROAD) continue;
      crack += `M${x.toFixed(2)} ${y.toFixed(2)}l${((rr() - .5) * .8).toFixed(2)} ${((rr() - .5) * .8).toFixed(2)}l${((rr() - .5) * .6).toFixed(2)} ${((rr() - .5) * .6).toFixed(2)}`;
    }
    el('path', { d: crack, stroke: '#2b2b2b', 'stroke-width': .05, fill: 'none' }, gr);
    el('path', { d: runsPath(v => v === T.WALK), fill: '#3b3b3b' }, gr);
    let lane = '';
    for (const p of [2, 24, 46, 68]) lane += `M${p + 1.5} 1V${H - 1}M1 ${p + 1.5}H${W - 1}`;
    el('path', { d: lane, stroke: '#e8e8e8', 'stroke-width': .07, 'stroke-dasharray': '.7 .9', fill: 'none', opacity: .6 }, gr);
    el('path', { d: runsPath(v => v === T.FLOOR || v === T.DOOR), fill: 'url(#floorPat)' }, gr);
    const wallD = runsPath(v => v === T.WALL || v === T.WINDOW);
    el('path', { d: wallD, fill: '#000', transform: 'translate(.1 .12)', opacity: .55 }, gr);
    el('path', { d: wallD, fill: '#ecebe6' }, gr);
    let win = '', door = '';
    const isWallish = (x, y) => { const v = M.t[y * W + x]; return v === T.WALL || v === T.WINDOW || v === T.DOOR; };
    for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
      const v = M.t[y * W + x];
      if (v !== T.WINDOW && v !== T.DOOR) continue;
      const horiz = isWallish(x - 1, y) && isWallish(x + 1, y);
      if (v === T.WINDOW) win += horiz ? `M${x} ${y + .36}h1v.28h-1z` : `M${x + .36} ${y}h.28v1h-.28z`;
      else door += horiz ? `M${x} ${y}h.12v1h-.12zM${x + .88} ${y}h.12v1h-.12z` : `M${x} ${y}h1v.12h-1zM${x} ${y + .88}h1v.12h-1z`;
    }
    el('path', { d: win, fill: '#7fb2cc' }, gr);
    el('path', { d: door, fill: '#8a5a2b' }, gr);
    let tr = '', trunk = '';
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (M.t[y * W + x] !== T.TREE) continue;
      const r = .5 + rr() * .12, cx = x + .5 + (rr() - .5) * .1, cy = y + .5 + (rr() - .5) * .1;
      tr += circ(cx, cy, r); trunk += circ(cx, cy, .12);
    }
    el('path', { d: tr, fill: '#141b10', stroke: '#0a0e08', 'stroke-width': .06 }, gr);
    el('path', { d: trunk, fill: '#2e3a24' }, gr);

    L.decals = el('g', {}, L.world);
    L.containers = el('g', {}, L.world);
    L.cont = M.containers.map(c => {
      const g = el('g', { transform: `translate(${c.x} ${c.y})` }, L.containers);
      el('rect', { x: .12, y: .12, width: .76, height: .76, fill: LOOT[c.kind].color, stroke: '#000', 'stroke-width': .06 }, g);
      el('path', { d: c.kind === 'fridge' ? 'M.2 .42H.8' : 'M.5 .15V.85', stroke: '#000', 'stroke-width': .05 }, g);
      const x = el('path', { d: 'M.22 .22L.78 .78M.78 .22L.22 .78', stroke: '#c8141f', 'stroke-width': .09, opacity: 0 }, g);
      return { g, x };
    });
    L.placed = el('g', {}, L.world);
    L.hl = el('rect', { x: 0, y: 0, width: 1.1, height: 1.1, fill: 'none', stroke: '#e9e3d2', 'stroke-width': .07, 'stroke-dasharray': '.22 .12', opacity: 0 }, L.world);
    L.zombies = el('g', {}, L.world);
    L.noise = el('circle', { cx: 0, cy: 0, r: 1, fill: 'none', stroke: '#e9e3d2', 'stroke-width': .045, 'stroke-dasharray': '.3 .22', opacity: 0 }, L.world);
    L.player = el('g', {}, L.world);
    L.fx = el('g', {}, L.world);
    L.dark = el('path', { fill: '#000', 'fill-rule': 'evenodd' }, L.world);
    // 화면 고정 레이어
    L.tint = el('rect', { x: 0, y: 0, width: VW, height: VH, fill: '#071033', opacity: 0, 'pointer-events': 'none' }, view);
    L.vign = el('rect', { x: 0, y: 0, width: VW, height: VH, fill: 'url(#vign)', 'pointer-events': 'none' }, view);
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
      const pm = el('g', {}, svg);
      if (big) el('circle', { r: 2.2, fill: 'none', stroke: '#c8141f', 'stroke-width': .35 }, pm);
      el('path', { d: 'M1.6 0L-1 -1.1L-.4 0L-1 1.1Z', fill: '#c8141f', stroke: '#000', 'stroke-width': .2, transform: big ? 'scale(1.1)' : 'scale(.9)' }, pm);
      return { dots, pm };
    };
    L.mini = make($('mini'), false);
    L.big = make($('bigmapSvg'), true);
  }
  function updateMaps() {
    const p = G.p;
    const t = `translate(${p.x.toFixed(2)} ${p.y.toFixed(2)}) rotate(${(p.face * 180 / Math.PI).toFixed(0)})`;
    L.mini.pm.setAttribute('transform', t);
    L.big.pm.setAttribute('transform', t);
    $('mini').setAttribute('viewBox', `${(p.x - 14).toFixed(2)} ${(p.y - 14).toFixed(2)} 28 28`);
  }
  function refreshContainer(i) {
    if (!G || !L.cont) return;
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

  function makePlayerG() {
    const g = el('g', {}, L.player);
    L.pWeapon = el('path', { d: '', stroke: '#fff', 'stroke-width': .09, 'stroke-linecap': 'round', fill: 'none' }, g);
    el('ellipse', { cx: 0, cy: 0, rx: .19, ry: .32, fill: '#f4f4f4', stroke: '#000', 'stroke-width': .05 }, g);
    el('rect', { x: -.19, y: -.06, width: .1, height: .12, fill: '#c8141f' }, g);
    el('circle', { cx: .03, cy: 0, r: .15, fill: '#e3b891', stroke: '#000', 'stroke-width': .04 }, g);
    el('path', { d: 'M-.1 -.1A.15 .15 0 0 1 .1 -.12L.02 0L.1 .12A.15 .15 0 0 1 -.1 .1Z', fill: '#1a1a1a' }, g);
    L.pg = g;
    updateWeaponLook();
  }
  function updateWeaponLook() {
    if (!L.pWeapon || !G) return;
    const w = curWeapon();
    if (w.def.type === 'gun') { L.pWeapon.setAttribute('d', 'M.05 .2L.5 .12'); L.pWeapon.setAttribute('stroke', '#111'); L.pWeapon.setAttribute('stroke-width', .12); }
    else if (w.item) { L.pWeapon.setAttribute('d', `M.05 .24L${(.3 + w.def.range * .35).toFixed(2)} .3`); L.pWeapon.setAttribute('stroke', w.def.color); L.pWeapon.setAttribute('stroke-width', w.item.id === 'knife' ? .06 : .1); }
    else { L.pWeapon.setAttribute('d', 'M.05 .22L.22 .26M.05 -.22L.22 -.26'); L.pWeapon.setAttribute('stroke', '#e3b891'); L.pWeapon.setAttribute('stroke-width', .09); }
    $('atkIcon').setAttribute('href', '#i-' + w.def.icon);
  }

  function makeZombieG(z) {
    const g = el('g', {}, L.zombies);
    el('path', { d: 'M.02 -.2L.44 -.17M.02 .2L.44 .17', stroke: '#6f7c5c', 'stroke-width': .09, 'stroke-linecap': 'round' }, g);
    z.body = el('ellipse', { cx: 0, cy: 0, rx: .18, ry: .31, fill: z.shirt, stroke: '#000', 'stroke-width': .05 }, g);
    el('circle', { cx: -.05, cy: (rand() - .5) * .3, r: .05, fill: '#7a0c12' }, g);
    el('circle', { cx: .03, cy: 0, r: .14, fill: '#8e9b7b', stroke: '#000', 'stroke-width': .04 }, g);
    g.style.display = 'none';
    z.g = g; z.vis = false;
  }
  function addZombie(x, y, hp, shirt) {
    const shirts = ['#4b5563', '#5c4a3a', '#3f4a3a', '#5a3a3a', '#3a4458', '#6b6b6b'];
    const z = { x, y, r: .3, hp: hp || 3, face: rand() * TAU, state: 'idle', cd: 0, think: rand() * .3,
      stun: 0, down: 0, path: null, pi: 0, repath: 0, wander: rand() * 6, tx: x, ty: y, lostT: 0,
      spdMul: .85 + rand() * .3, dead: false, shirt: shirt || shirts[(rand() * shirts.length) | 0], flash: 0, queued: false };
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
  function addCorpse(x, y, a, shirt) {
    const g = el('g', { transform: `translate(${x.toFixed(2)} ${y.toFixed(2)}) rotate(${(a * 180 / Math.PI).toFixed(0)})` }, L.decals);
    el('ellipse', { cx: -.1, cy: .05, rx: .5, ry: .36, fill: '#5a070c', opacity: .85 }, g);
    el('ellipse', { cx: 0, cy: 0, rx: .34, ry: .19, fill: shirt || '#4b5563', stroke: '#000', 'stroke-width': .04 }, g);
    el('circle', { cx: .38, cy: 0, r: .13, fill: '#6f7a60', stroke: '#000', 'stroke-width': .04 }, g);
    G.corpses.push({ x, y, a, shirt, g });
    if (G.corpses.length > 70) { const c = G.corpses.shift(); c.g.remove(); }
  }

  /* ================= 충돌·시야 ================= */
  function resolve(e) {
    const W = M.W, B = M.moveBlock, r = e.r;
    for (let it = 0; it < 2; it++) {
      const x0 = Math.floor(e.x - r), x1 = Math.floor(e.x + r), y0 = Math.floor(e.y - r), y1 = Math.floor(e.y + r);
      for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
        if (tx < 0 || ty < 0 || tx >= W || ty >= M.H || !B[ty * W + tx]) continue;
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
  function lineClear(x0, y0, x1, y1, B) {
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
      if (x < 0 || y < 0 || x >= W || y >= M.H || B[y * W + x]) return false;
    }
    return true;
  }
  const losClear = (a, b, c, d) => lineClear(a, b, c, d, M.sightBlock);
  const moveClear = (a, b, c, d) => lineClear(a, b, c, d, M.moveBlock);
  function rayDist(x0, y0, a, maxD) {
    const W = M.W, B = M.sightBlock;
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
      if (x < 0 || y < 0 || x >= W || y >= M.H || B[y * W + x]) return Math.min(maxD, t + .45);
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
  function noise(x, y, r, visual) {
    for (const z of G.zombies) {
      if (z.dead) continue;
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
    if (d < .18) { z.pi++; return z.pi >= z.path.length; }
    steer(z, dx / d, dy / d, spd, dt);
    return false;
  }
  function steer(z, nx, ny, spd, dt) {
    z.x += nx * spd * dt; z.y += ny * spd * dt;
    z.face += angDiff(Math.atan2(ny, nx), z.face) * Math.min(1, dt * 8);
    resolve(z);
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
      if (!am) { toast('탄약이 없다'); return; }
      am.n--; if (am.n <= 0) p.inv.splice(p.inv.indexOf(am), 1);
      noise(p.x, p.y, def.noise, true);
      G.shake = Math.max(G.shake, .15);
      let hitZ = null;
      if (target && rand() < .85 - Math.hypot(target.x - p.x, target.y - p.y) * .035) hitZ = target;
      const rd = rayDist(p.x, p.y, p.face, def.range);
      const ex = hitZ ? hitZ.x : p.x + Math.cos(p.face) * rd;
      const ey = hitZ ? hitZ.y : p.y + Math.sin(p.face) * rd;
      addFx('tracer', { x1: p.x + Math.cos(p.face) * .5, y1: p.y + Math.sin(p.face) * .5, x2: ex, y2: ey });
      if (hitZ) damageZombie(hitZ, def.dmg * (.9 + rand() * .3), p.face, .4, true);
      return;
    }
    const tired = p.endu < 10 ? .6 : 1;
    p.cd = p.cdMax = def.cd * (p.endu < 10 ? 1.4 : 1);
    p.endu = Math.max(0, p.endu - def.endu);
    addFx('swing', { x: p.x, y: p.y, a: p.face, r: def.range + .3 });
    noise(p.x, p.y, 3.5, false);
    p.noiseR = Math.max(p.noiseR, 3.5);
    let hits = 0;
    for (const z of G.zombies) {
      if (z.dead) continue;
      const d = Math.hypot(z.x - p.x, z.y - p.y);
      if (d > def.range + .32) continue;
      if (Math.abs(angDiff(Math.atan2(z.y - p.y, z.x - p.x), p.face)) > .95) continue;
      if (!losClear(p.x, p.y, z.x, z.y)) continue;
      let dmg = def.dmg * (.85 + rand() * .3) * tired;
      if (z.down > 0) dmg *= 2;
      if (rand() < .12) dmg *= 1.8;
      damageZombie(z, dmg, p.face, def.knock, rand() < def.knock * .5);
      hits++;
      if (hits >= 2) break;
    }
    if (hits) G.shake = Math.max(G.shake, .08);
    if (hits && w.item && w.item.dur != null) {
      w.item.dur--;
      if (w.item.dur <= 0) {
        p.inv.splice(p.inv.indexOf(w.item), 1); p.equip = null;
        toast(def.name + '이(가) 부서졌다'); updateWeaponLook();
      }
    }
  }
  function damageZombie(z, dmg, a, knock, knockDown) {
    z.hp -= dmg; z.flash = .12; z.stun = .45;
    z.state = 'chase'; z.lostT = 0; z.tx = G.p.x; z.ty = G.p.y;
    z.x += Math.cos(a) * knock; z.y += Math.sin(a) * knock; resolve(z);
    if (knockDown) z.down = 1.4;
    addFx('blood', { x: z.x, y: z.y });
    if (z.hp <= 0) {
      z.dead = true; z.g.remove(); G.kills++;
      addCorpse(z.x, z.y, a, z.shirt);
    }
  }

  /* ================= 좀비 AI ================= */
  function updateZombies(dt) {
    const p = G.p, night = G.night;
    const sightR = lerp(8.5, 6, night);
    for (const z of G.zombies) {
      if (z.dead) continue;
      z.cd -= dt; z.think -= dt; z.repath -= dt;
      if (z.flash > 0) z.flash -= dt;
      if (z.down > 0) { z.down -= dt; continue; }
      if (z.stun > 0) { z.stun -= dt; continue; }
      const dx = p.x - z.x, dy = p.y - z.y, d = Math.hypot(dx, dy);
      if (z.think <= 0) {
        z.think = .22 + rand() * .15;
        const sr = sightR * (G.sleeping ? .55 : 1);
        const facing = Math.abs(angDiff(Math.atan2(dy, dx), z.face)) < 1.7;
        if (d < sr && (d < 2.5 || facing) && losClear(z.x, z.y, p.x, p.y)) {
          if (z.state !== 'chase') { z.state = 'chase'; z.path = null; }
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
    if (G.zombies.length > 200 || (G.zombies.some(z => z.dead) && rand() < .02)) G.zombies = G.zombies.filter(z => !z.dead);
  }
  function zombieAttack(z) {
    const p = G.p;
    if (G.sleeping) wake('좀비에게 습격당했다!');
    const a = Math.atan2(z.y - p.y, z.x - p.x);
    if (Math.hypot(input.jx + input.kx, input.jy + input.ky) < .12) p.face = a;
    const hit = rand() <= (G.night > .5 ? .6 : .5);
    G.dmgInd.push({ a, t: 0, hit });
    if (G.dmgInd.length > 4) G.dmgInd.shift();
    if (!hit) return;
    if (G.actions.length) cancelActions('공격받아 행동이 끊겼다');
    if (G.openC >= 0 || !$('sheet').classList.contains('hidden')) closeSheet();
    const dmg = 5 + rand() * 6;
    p.hp -= dmg;
    hurtFlash();
    G.shake = Math.max(G.shake, .3);
    const r = rand();
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
      e = el('g', {}, L.fx);
      for (let i = 0; i < 5; i++) el('circle', { cx: o.x + (rand() - .5) * .6, cy: o.y + (rand() - .5) * .6, r: .05 + rand() * .07, fill: '#c1121f' }, e);
      life = .5;
      const s = el('circle', { cx: o.x + (rand() - .5) * .4, cy: o.y + (rand() - .5) * .4, r: .12 + rand() * .12, fill: '#5a070c', opacity: .7 }, L.decals);
      G.splats = (G.splats || []); G.splats.push(s); if (G.splats.length > 120) G.splats.shift().remove();
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
      if (k >= 1) f.e.remove();
    }
    G.fx = G.fx.filter(f => f.t < f.life);
    for (const d of G.dmgInd) d.t += dt;
    G.dmgInd = G.dmgInd.filter(d => d.t < .9);
    G.shake = Math.max(0, G.shake - dt);
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
  function invWeight() { return G.p.inv.reduce((s, i) => s + ITEMS[i.id].w * (i.n || 1), 0); }

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
    const running = (input.run || keys.shift) && moving && p.endu > 3;
    const wt = invWeight();
    const spd = (running ? 3.4 : 2.1) * (p.energy < 20 ? .8 : 1) * (p.hp < 25 ? .85 : 1) * (wt > CAP ? .7 : 1);
    if (moving) {
      p.x += mx * spd * dt; p.y += my * spd * dt;
      resolve(p);
      if (p.atkT <= 0) p.face += angDiff(Math.atan2(my, mx), p.face) * Math.min(1, dt * 14);
    }
    p.atkT -= dt; p.cd -= dt;
    p.noiseT -= dt;
    const nr = moving ? (running ? 6 : 1.6) : 0;
    p.noiseR = Math.max(nr, p.noiseR - dt * 6);
    if (moving && p.noiseT <= 0) { p.noiseT = running ? .4 : .7; noise(p.x, p.y, nr, false); }
    if (running) p.endu -= 10 * dt; else p.endu += (moving ? 5 : 9) * dt;
    p.endu = clamp(p.endu, 0, 100);
    G.isRunning = running;
    if (mag > .3 && G.actions.length) cancelActions('이동해서 행동을 멈췄다');
    if (!G.sleeping) updateActions(dt);
    if (input.attackHeld || keys.space) playerAttack();

    const act = running ? 1.35 : 1;
    p.full -= .045 * dm * act;
    p.hyd -= .065 * dm * act;
    if (G.sleeping) p.energy += .22 * dm; else p.energy -= .075 * dm * act;
    p.full = clamp(p.full, 0, 100); p.hyd = clamp(p.hyd, 0, 100); p.energy = clamp(p.energy, 0, 100);
    if (p.full <= 0) p.hp -= .03 * dm;
    if (p.hyd <= 0) p.hp -= .05 * dm;
    if (p.bleed) p.hp -= .12 * dm;
    if (p.infected) { p.infT += dm; if (p.infT > 600) p.hp -= .035 * dm; }
    if (!p.bleed && !(p.infected && p.infT > 600) && p.full > 40 && p.hyd > 40) p.hp += .02 * dm;
    p.hp = Math.min(100, p.hp);
    if (p.hp <= 0) return die();

    updateZombies(dt);
    processPaths();

    const hour = Math.floor(G.time / 60);
    if (hour !== G.lastHour) {
      G.lastHour = hour;
      const alive = G.zombies.filter(z => !z.dead).length;
      if (G.night > .5 && alive < 120) spawnZombies(5, 18, true);
      else if (hour % 2 === 0 && alive < 70) spawnZombies(2, 18, true);
      if (hour % 24 === 21) toast('밤이 온다. 좀비가 빨라진다', 2600);
      if (hour % 24 === 6) toast('날이 밝는다', 2000);
    }

    if (G.sleeping) {
      if (p.energy >= 99.5) wake('개운하게 일어났다');
      else if (G.zombies.some(z => !z.dead && z.state === 'chase' && Math.hypot(z.x - p.x, z.y - p.y) < 6)) wake('인기척에 잠이 깼다!');
    }

    G.saveT += dt;
    if (G.saveT > 30) { G.saveT = 0; save(false); }
  }

  /* ================= 렌더 ================= */
  function render(dt) {
    const p = G.p;
    clockT += dt;
    if (!G.paused) updateFx(dt);
    ZOOM = VW > VH ? VH / 10.5 : Math.min(VW, VH) / 12.5;
    const sh = G.shake > 0 ? G.shake * 22 : 0;
    const ox = sh ? (rand() - .5) * sh : 0, oy = sh ? (rand() - .5) * sh : 0;
    // 플레이어 화면 위치 (가방 패널이 열리면 남은 왼쪽 영역 가운데로)
    const sheetOn = !$('sheet').classList.contains('hidden');
    const panelW = sheetOn ? (L.panelW || (L.panelW = document.querySelector('.sheet-card').offsetWidth)) : 0;
    const psx = (VW - panelW) / 2, psy = VH * .5;
    if (L._psx !== psx) { L._psx = psx; $('act').style.left = psx + 'px'; $('toast').style.left = psx + 'px'; }
    const camX = psx - p.x * ZOOM + ox, camY = psy - p.y * ZOOM + oy;
    L.world.setAttribute('transform', `translate(${camX.toFixed(1)} ${camY.toFixed(1)}) scale(${ZOOM.toFixed(3)})`);
    L.pg.setAttribute('transform', `translate(${p.x.toFixed(3)} ${p.y.toFixed(3)}) rotate(${(p.face * 180 / Math.PI).toFixed(1)})`);

    // 소음 반경
    if (p.noiseR > .3) {
      L.noise.setAttribute('cx', p.x.toFixed(2)); L.noise.setAttribute('cy', p.y.toFixed(2));
      L.noise.setAttribute('r', p.noiseR.toFixed(2));
      L.noise.setAttribute('opacity', (p.noiseR > 2 ? .55 : .3).toFixed(2));
      L.noise.setAttribute('stroke', p.noiseR > 2 ? '#ff5a63' : '#e9e3d2');
    } else L.noise.setAttribute('opacity', 0);

    // 시야
    V.R = G.sleeping ? 0 : lerp(12, 5.5, G.night);
    const pts = [];
    const N = 110, a0 = p.face - V.cone, a1 = p.face + V.cone;
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
    L.dark.setAttribute('opacity', lerp(.5, .93, G.night).toFixed(2));
    L.tint.setAttribute('opacity', (.32 * G.night).toFixed(2));

    // 좀비 + 화면 밖 위협
    const threats = [];
    for (const z of G.zombies) {
      if (z.dead) continue;
      const vis = Math.abs(z.x - p.x) < 14 && Math.abs(z.y - p.y) < 16 && inVision(z.x, z.y);
      if (vis !== z.vis) { z.vis = vis; z.g.style.display = vis ? '' : 'none'; }
      if (vis) {
        z.g.setAttribute('transform', `translate(${z.x.toFixed(3)} ${z.y.toFixed(3)}) rotate(${(z.face * 180 / Math.PI).toFixed(1)})${z.down > 0 ? ' scale(1 .7)' : ''}`);
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
    G.nearC = near;
    G.nearBench = -1;
    for (let i = 0; i < G.placed.length; i++) {
      const b = G.placed[i];
      if (Math.hypot(b.x + .5 - p.x, b.y + .5 - p.y) < 1.7) { G.nearBench = i; break; }
    }
    if (near >= 0) {
      const c = M.containers[near];
      L.hl.setAttribute('x', c.x - .05); L.hl.setAttribute('y', c.y - .05);
      L.hl.setAttribute('opacity', (.55 + .45 * Math.sin(clockT * 7)).toFixed(2));
    } else L.hl.setAttribute('opacity', 0);

    // 버튼 링 (매 프레임)
    const cdFrac = clamp(p.cd / (p.cdMax || 1), 0, 1);
    $('atkRing').style.strokeDashoffset = (RING_C * cdFrac).toFixed(1);
    $('btnAttack').classList.toggle('cool', cdFrac > 0);
    $('runRing').style.strokeDashoffset = (RING_C * (1 - p.endu / 100)).toFixed(1);

    G.hudT -= dt;
    if (G.hudT <= 0) { G.hudT = .15; renderHud(); }
  }

  function renderHud() {
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
    for (const s of document.querySelectorAll('.stat')) {
      const v = clamp(p[s.dataset.k], 0, 100);
      s.querySelector('em').style.width = v.toFixed(0) + '%';
      s.querySelector('b').textContent = v.toFixed(0);
      s.classList.toggle('low', v < 25);
    }
    $('lowhp').classList.toggle('on', p.hp < 30);
    const md = [];
    if (p.bleed) md.push(['drop', '출혈', 1]);
    if (p.infected && p.infT > 300) md.push(['bio', '메스꺼움', 1]);
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
    ub.classList.toggle('hot', G.nearC >= 0 && !G.searched.has(G.nearC));
    $('useLbl').textContent = G.nearC >= 0 ? LOOT[M.containers[G.nearC].kind].name : (G.nearBench >= 0 ? '작업대' : '뒤지기');
    $('btnRun').classList.toggle('on', input.run);
    $('btnRun').classList.toggle('tired', p.endu < 20);
    $('bagLbl').textContent = invWeight().toFixed(1) + 'kg';
    updateMaps();
    if (G.sleeping) $('sleepTime').textContent = `${day}일차 ${hhmm} · 기력 ${p.energy.toFixed(0)}`;
  }

  /* ================= 가방/수색 시트 ================= */
  function openSheet(ci) {
    G.openC = ci; G.sel = null;
    if (ci >= 0) { G.searched.add(ci); refreshContainer(ci); }
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
    if (d.full) sub.push('포만 ' + (d.full > 0 ? '+' : '') + d.full);
    if (d.hyd) sub.push('수분 ' + (d.hyd > 0 ? '+' : '') + d.hyd);
    if (d.hp) sub.push('체력 +' + d.hp);
    if (d.stopBleed) sub.push('지혈');
    if (d.type === 'melee') sub.push('공격력 ' + d.dmg, '사거리 ' + d.range, '내구도 ' + it.dur + '/' + (it.max || d.dur));
    if (d.uses) sub.push('남은 사용 ' + it.u + '회');
    if (d.type === 'mat' && !d.uses) sub.push('재료');
    if (d.type === 'tool') sub.push('도구 · 분해에 사용');
    if (d.type === 'place') sub.push('설치하면 작업대 레시피 사용 가능');
    if (d.type === 'gun') sub.push('공격력 ' + d.dmg, '사거리 ' + d.range, '소음 매우 큼');
    if (it.n) sub.push(it.n + (it.id === 'ammo' ? '발' : '개'));
    sub.push((d.w * (it.n || 1)).toFixed(1) + 'kg');
    return sub.join(' · ');
  }
  function card(it, src) {
    const d = ITEMS[it.id], p = G.p;
    const eq = src === 'inv' && p.equip === it.uid;
    const sel = G.sel && G.sel.uid === it.uid;
    let extra = '';
    if (it.n) extra += `<span class="qty">x${it.n}</span>`;
    if (it.u != null) extra += `<span class="qty">${it.u}회</span>`;
    if (it.dur != null && d.dur) { const f = it.dur / (it.max || d.dur); extra += `<span class="dur${f < .3 ? ' low' : ''}"><i style="width:${(f * 100).toFixed(0)}%"></i></span>`; }
    if (eq) extra += `<span class="eqt">장착</span>`;
    const busy = busyUid(it.uid);
    return `<button class="card${eq ? ' eq' : ''}${sel ? ' sel' : ''}${src === 'cont' ? ' loot' : ''}${busy ? ' busy' : ''}" data-src="${src}" data-uid="${it.uid}">${ico(d.icon)}<span class="cn">${d.name}</span>${extra}</button>`;
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
      const busy = G.actions.filter(a => a.kind === 'craft' && a.label.startsWith(o.name)).length;
      h += `<div class="rc${max ? '' : ' off'}"><div class="rc-ic">${ico(o.icon)}</div><div class="rc-m"><b>${o.name}<small>${r.time}초</small>${busy ? `<em>제작 대기 ${busy}</em>` : ''}</b><div class="chips">${chips}</div></div>
        <div class="rc-b"><button class="sbtn2 w" data-act="craft" data-rid="${r.id}" ${max ? '' : 'disabled'}>만들기</button>${max > 1 ? `<button class="sbtn2" data-act="craftmax" data-rid="${r.id}">x${max}</button>` : ''}</div></div>`;
    }
    return h;
  }
  function renderSheet() {
    const p = G.p, ci = G.openC;
    const crafting = ci < 0 && G.tab === 'craft';
    $('sheetTitle').textContent = ci >= 0 ? LOOT[M.containers[ci].kind].name + ' 수색' : (crafting ? '제작' : '가방');
    $('sheetIcon').setAttribute('href', ci >= 0 ? '#i-search' : (crafting ? '#i-craft' : '#i-bag'));
    const wt = invWeight();
    $('wtext').textContent = `${wt.toFixed(1)} / ${CAP}kg`;
    $('wfill').style.width = Math.min(100, wt / CAP * 100).toFixed(0) + '%';
    $('wfill').parentElement.classList.toggle('over', wt > CAP);
    let h = '';
    if (ci < 0) h += `<div class="tabs"><button data-act="tab-bag" class="${crafting ? '' : 'on'}">${ico('bag')}가방</button><button data-act="tab-craft" class="${crafting ? 'on' : ''}">${ico('craft')}제작</button></div>`;
    if (crafting) {
      const body = $('sheetBody'), st = body.scrollTop;
      body.innerHTML = h + craftHtml(); body.scrollTop = st;
      G.sel = null; renderDetail();
      return;
    }
    if (ci >= 0) {
      const items = G.containers[ci];
      h += `<div class="sec-t"><span>안에 있는 것 · 눌러서 가져가기</span>${items.length > 1 ? '<button data-act="takeall">모두 가져가기</button>' : ''}</div><div class="grid">`;
      if (!items.length) h += `<div class="empty">비어 있다</div>`;
      for (const it of items) h += card(it, 'cont');
      h += `</div>`;
      const D = DISMANTLE[M.containers[ci].kind];
      const ok = has(D.tool) && !items.length;
      h += `<div class="acts"><button class="abtn${ok ? ' w' : ''}" data-act="dismantle">${ico('screwdriver')}가구 분해 · ${TOOL_NAME[D.tool]} 필요${items.length ? ' (먼저 비우기)' : ''}</button></div>`;
    }
    h += `<div class="sec-t"><span>내 가방 · ${p.inv.length}개</span></div><div class="grid">`;
    if (!p.inv.length) h += `<div class="empty">가방이 비었다</div>`;
    for (const it of p.inv) h += card(it, 'inv');
    h += `</div>`;
    if (ci < 0) h += `<div class="acts"><button class="abtn w" data-act="sleep">${ico('moon')}잠자기</button><button class="abtn" data-act="save">${ico('save')}저장</button></div>`;
    const body = $('sheetBody'), st = body.scrollTop;
    body.innerHTML = h; body.scrollTop = st;
    renderDetail();
  }
  function renderDetail() {
    const box = $('detail'), p = G.p;
    const it = G.sel ? p.inv.find(i => i.uid === G.sel.uid) : null;
    if (!it) { box.classList.add('hidden'); G.sel = null; return; }
    const d = ITEMS[it.id];
    let acts = '';
    if (d.type === 'food') acts += `<button class="abtn w" data-act="use">${ico(d.icon)}먹기</button>`;
    else if (d.type === 'drink') acts += `<button class="abtn w" data-act="use">${ico(d.icon)}마시기</button>`;
    else if (d.type === 'med') acts += `<button class="abtn w" data-act="use">${ico(d.icon)}사용</button>`;
    else if (d.type === 'melee' || d.type === 'gun') acts += p.equip === it.uid
      ? `<button class="abtn r" data-act="equip">${ico(d.icon)}해제</button>`
      : `<button class="abtn w" data-act="equip">${ico(d.icon)}장착</button>`;
    if (d.type === 'place') acts += `<button class="abtn w" data-act="place">${ico('bench')}설치</button>`;
    if (d.type === 'melee' && it.dur < (it.max || d.dur)) {
      for (const m of ['tape', 'glue']) if (countOf(m)) acts += `<button class="abtn" data-act="repair-${m}">${ico(m)}수리 · ${ITEMS[m].name}</button>`;
      if (!countOf('tape') && !countOf('glue')) acts += `<button class="abtn" disabled>${ico('tape')}수리 (테이프/접착제 필요)</button>`;
    }
    if (ITEM_DISMANTLE[it.id]) { const D = ITEM_DISMANTLE[it.id]; acts += `<button class="abtn" data-act="itemdismantle"${D.tool && !has(D.tool) ? ' disabled' : ''}>${ico('screwdriver')}분해${D.tool ? ' · ' + TOOL_NAME[D.tool] : ''}</button>`; }
    acts += `<button class="abtn" data-act="drop">${G.openC >= 0 ? '넣기' : '버리기'}</button>`;
    if (busyUid(it.uid)) acts = `<div class="busytxt">진행 중…</div>`;
    box.innerHTML = `<div class="dt"><div class="dic">${ico(d.icon)}</div><div><b>${d.name}</b><small>${itemStats(it)}</small></div></div><div class="dacts">${acts}</div>`;
    box.classList.remove('hidden');
  }
  /* ---------- 행동(소요시간) 대기열 ---------- */
  function queueAction(a) {
    if (G.dead || G.sleeping) return;
    a.t = 0;
    G.actions.push(a);
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
    if (a.noise) { a.nt = (a.nt || 0) - dt; if (a.nt <= 0) { a.nt = 1.2; noise(G.p.x, G.p.y, a.noise, false); G.p.noiseR = Math.max(G.p.noiseR, a.noise); } }
    if (a.t >= a.dur) {
      G.actions.shift();
      a.done();
      if (!$('sheet').classList.contains('hidden')) { if (G.openC >= 0) refreshContainer(G.openC); renderSheet(); }
      renderHud();
    }
    renderAction();
  }
  function renderAction() {
    const box = $('act'), a = G && G.actions[0];
    if (!a) { box.classList.add('hidden'); $('sheetAct').classList.add('hidden'); return; }
    const f = clamp(a.t / a.dur, 0, 1), left = Math.max(0, a.dur - a.t).toFixed(1);
    const more = G.actions.length > 1 ? ` <i>+${G.actions.length - 1}</i>` : '';
    const html = `${ico(a.icon || 'hand')}<span>${a.label}${more}</span><em><b style="width:${(f * 100).toFixed(0)}%"></b></em>`;
    box.innerHTML = html; box.classList.remove('hidden');
    const sa = $('sheetAct');
    sa.innerHTML = html + `<small>${left}초</small><button data-act="cancel">취소</button>`;
    sa.classList.remove('hidden');
  }
  const busyUid = uid => G.actions.some(a => a.uid === uid);

  function startSearch(ci) {
    if (G.actions.some(a => a.kind === 'search')) return;
    const kind = LOOT[M.containers[ci].kind];
    const first = !G.searched.has(ci);
    queueAction({ kind: 'search', label: kind.name + (first ? ' 뒤지는 중' : ' 여는 중'), icon: 'search', dur: first ? 1.6 : .5,
      valid: () => G.nearC === ci, done: () => openSheet(ci) });
  }

  function sheetAction(act, uid) {
    const p = G.p, ci = G.openC;
    const selIt = () => G.sel ? p.inv.find(i => i.uid === G.sel.uid) : null;
    const wtWarn = () => { if (invWeight() > CAP) toast('너무 무겁다 — 느려진다'); };
    const takeOne = (it, c) => queueAction({ uid: it.uid, label: ITEMS[it.id].name + ' 챙기는 중', icon: ITEMS[it.id].icon,
      dur: .35 + ITEMS[it.id].w * (it.n || 1) * .4,
      valid: () => G.openC === c && G.containers[c].some(x => x.uid === it.uid),
      done: () => { const arr = G.containers[c], i = arr.findIndex(x => x.uid === it.uid); if (i >= 0) { stackAdd(arr.splice(i, 1)[0]); wtWarn(); } } });
    if (act === 'cancel') return cancelActions('행동 취소');
    if (act === 'tab-bag' || act === 'tab-craft') { G.tab = act.slice(4); G.sel = null; return renderSheet(); }
    if (act === 'craft' || act === 'craftmax') { craft(uid, act === 'craft' ? 1 : 99); return renderSheet(); }
    if (act === 'dismantle') { dismantleFurniture(ci); return renderSheet(); }
    if (act === 'benchdismantle') { if (G.nearBench >= 0) dismantleBench(G.nearBench); return renderSheet(); }
    if (act === 'itemdismantle') { const it = selIt(); if (it && !busyUid(it.uid)) dismantleItem(it); return renderSheet(); }
    if (act === 'place') { const it = selIt(); if (it && !busyUid(it.uid)) placeBench(it); return renderSheet(); }
    if (act === 'repair-tape' || act === 'repair-glue') { const it = selIt(); if (it && !busyUid(it.uid)) repairItem(it, act.slice(7)); return renderSheet(); }
    if (act === 'takecont') {
      const it = G.containers[ci].find(x => x.uid === uid);
      if (!it || busyUid(uid)) return;
      takeOne(it, ci);
    } else if (act === 'selinv') {
      G.sel = G.sel && G.sel.uid === uid ? null : { uid };
    } else if (act === 'takeall') {
      for (const it of G.containers[ci]) if (!busyUid(it.uid)) takeOne(it, ci);
    } else if (act === 'use') {
      const it = selIt(); if (!it || busyUid(it.uid)) return;
      const d = ITEMS[it.id];
      const verb = d.type === 'food' ? '먹는 중' : d.type === 'drink' ? '마시는 중' : (d.stopBleed ? '붕대 감는 중' : '복용 중');
      queueAction({ uid: it.uid, label: d.name + ' ' + verb, icon: d.icon, dur: d.time || 2,
        valid: () => p.inv.includes(it),
        done: () => {
          if (d.full) p.full = clamp(p.full + d.full, 0, 100);
          if (d.hyd) p.hyd = clamp(p.hyd + d.hyd, 0, 100);
          if (d.hp) p.hp = Math.min(100, p.hp + d.hp);
          if (d.stopBleed) { if (p.bleed) toast('지혈했다'); p.bleed = false; }
          p.inv.splice(p.inv.indexOf(it), 1);
          if (G.sel && G.sel.uid === it.uid) G.sel = null;
        } });
    } else if (act === 'equip') {
      const it = selIt(); if (!it || busyUid(it.uid)) return;
      const on = p.equip !== it.uid, d = ITEMS[it.id];
      queueAction({ uid: it.uid, label: d.name + (on ? ' 드는 중' : ' 내려놓는 중'), icon: d.icon, dur: on ? (d.type === 'gun' ? 1 : .6) : .3,
        valid: () => p.inv.includes(it),
        done: () => { p.equip = on ? it.uid : null; updateWeaponLook(); if (on) toast(d.name + ' 장착'); } });
    } else if (act === 'drop') {
      const it = selIt(); if (!it || busyUid(it.uid)) return;
      const c = ci, d = ITEMS[it.id];
      queueAction({ uid: it.uid, label: d.name + (c >= 0 ? ' 넣는 중' : ' 버리는 중'), icon: d.icon, dur: .3 + d.w * .2,
        valid: () => p.inv.includes(it) && (c < 0 || G.openC === c),
        done: () => {
          p.inv.splice(p.inv.indexOf(it), 1);
          if (p.equip === it.uid) { p.equip = null; updateWeaponLook(); }
          if (c >= 0) G.containers[c].push(it);
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
  function recipeMax(r) {
    if (r.tools && r.tools.some(t => !has(t))) return 0;
    if (r.bench && G.nearBench < 0) return 0;
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
    const n = Math.min(times, recipeMax(r));
    if (n <= 0) return toast('재료나 도구가 부족하다');
    for (let k = 0; k < n; k++) {
      queueAction({ kind: 'craft', label: ITEMS[r.out].name + ' 만드는 중', icon: ITEMS[r.out].icon, dur: r.time, noise: r.noise,
        valid: () => recipeMax(r) > 0,
        done: () => { for (const [id, need] of r.in) consume(id, need); stackAdd(mkItem(r.out)); if (invWeight() > CAP) toast('너무 무겁다 — 느려진다'); } });
    }
  }
  function dismantleFurniture(ci) {
    const kind = M.containers[ci].kind, D = DISMANTLE[kind];
    if (G.containers[ci].length) return toast('먼저 안을 비워야 한다');
    if (!has(D.tool)) return toast(TOOL_NAME[D.tool] + '가 필요하다');
    queueAction({ kind: 'dismantle', label: LOOT[kind].name + ' 분해 중', icon: 'screwdriver', dur: D.time, noise: D.noise,
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
    queueAction({ kind: 'dismantle', label: '작업대 분해 중', icon: 'screwdriver', dur: D.time, noise: D.noise,
      valid: () => G.placed.includes(b) && has(D.tool),
      done: () => { removePlaced(b); const got = giveOut(D.out, rand); toast('분해 완료 — ' + got.join(', '), 2600); } });
  }
  function dismantleItem(it) {
    const D = ITEM_DISMANTLE[it.id];
    if (D.tool && !has(D.tool)) return toast(TOOL_NAME[D.tool] + '가 필요하다');
    queueAction({ uid: it.uid, label: ITEMS[it.id].name + ' 분해 중', icon: 'screwdriver', dur: D.time, noise: D.noise,
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
    if (it.dur >= max) return toast('수리할 필요가 없다');
    if (!countOf(mat)) return toast(ITEMS[mat].name + '이(가) 없다');
    queueAction({ uid: it.uid, label: d.name + ' 수리 중', icon: mat, dur: 3,
      valid: () => G.p.inv.includes(it) && countOf(mat) > 0,
      done: () => {
        consume(mat, 1);
        const m = it.max || d.dur;
        it.dur = Math.min(m, it.dur + Math.round(m * REPAIR[mat]));
        it.max = Math.max(5, Math.round(m * .9)); // 고칠수록 최대 내구도 감소
        it.dur = Math.min(it.dur, it.max);
        toast(d.name + ' 수리 — 내구도 ' + it.dur + '/' + it.max);
      } });
  }
  // 작업대 설치
  function placeBench(it) {
    const p = G.p;
    const spot = () => {
      const cands = [[Math.cos(p.face), Math.sin(p.face)], [1, 0], [-1, 0], [0, 1], [0, -1]];
      const px = Math.floor(p.x), py = Math.floor(p.y);
      for (const [dx, dy] of cands) {
        const x = Math.floor(p.x + dx * .95), y = Math.floor(p.y + dy * .95);
        if (x === px && y === py) continue;
        if (M.moveBlock[y * M.W + x]) continue;
        if (M.containers.some((c, i) => !G.removed.has(i) && c.x === x && c.y === y)) continue;
        if (G.placed.some(b => b.x === x && b.y === y)) continue;
        return [x, y];
      }
      return null;
    };
    if (!spot()) return toast('놓을 자리가 없다');
    queueAction({ uid: it.uid, label: '작업대 설치 중', icon: 'bench', dur: 4, noise: 4,
      valid: () => G.p.inv.includes(it) && !!spot(),
      done: () => {
        const [x, y] = spot();
        G.p.inv.splice(G.p.inv.indexOf(it), 1);
        if (G.sel && G.sel.uid === it.uid) G.sel = null;
        addPlaced({ x, y, type: 'bench' });
        toast('작업대를 설치했다');
      } });
  }
  function addPlaced(b) {
    G.placed.push(b);
    M.moveBlock[b.y * M.W + b.x] = 1;
    b.g = el('g', { transform: `translate(${b.x} ${b.y})` }, L.placed);
    el('rect', { x: .04, y: .14, width: .92, height: .72, fill: '#8a6a45', stroke: '#000', 'stroke-width': .06 }, b.g);
    el('path', { d: 'M.1 .38H.9M.1 .62H.9', stroke: '#5a432d', 'stroke-width': .05 }, b.g);
    el('path', { d: 'M.62 .2L.82 .42M.3 .55l.18 .18', stroke: '#d9dde0', 'stroke-width': .07, 'stroke-linecap': 'round' }, b.g);
  }
  function removePlaced(b) {
    const i = G.placed.indexOf(b); if (i < 0) return;
    G.placed.splice(i, 1);
    M.moveBlock[b.y * M.W + b.x] = 0;
    b.g.remove();
  }
  function trySleep() {
    const p = G.p;
    if (p.energy > 85) return toast('졸리지 않다');
    if (p.bleed) return toast('피를 흘리는 중에는 잘 수 없다');
    if (G.zombies.some(z => !z.dead && (z.state === 'chase' || (z.vis && Math.hypot(z.x - p.x, z.y - p.y) < 10)))) return toast('근처에 좀비가 있어 잘 수 없다');
    cancelActions();
    closeSheet();
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
        bleed: p.bleed, infected: p.infected, infT: p.infT, inv: p.inv, equip: p.equip },
      cont: G.containers, searched: [...G.searched], removed: [...G.removed], placed: G.placed.map(b => ({ x: b.x, y: b.y, type: b.type })),
      z: G.zombies.filter(z => !z.dead).map(z => [+z.x.toFixed(2), +z.y.toFixed(2), +z.hp.toFixed(2), z.shirt]),
      c: G.corpses.map(c => [+c.x.toFixed(2), +c.y.toFixed(2), +c.a.toFixed(2), c.shirt]),
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

  function newGame() {
    const seed = (Math.random() * 1e9) | 0;
    G = baseState(seed);
    setupWorld(seed);
    const p = G.p;
    p.x = M.spawn.x + .5; p.y = M.spawn.y + .5;
    const lr = DT.rng(seed ^ 0x5bd1e995);
    G.containers = M.containers.map(c => rollLoot(c.kind, lr));
    if (M.spawnContainer >= 0) G.containers[M.spawnContainer].push(mkItem('hammer'));
    else p.inv.push(mkItem('hammer'));
    p.inv.push(mkItem('water'), mkItem('chips'), mkItem('bandage'));
    spawnZombies(75, 14, false);
    for (let i = 0; i < M.containers.length; i++) refreshContainer(i);
    updateWeaponLook();
    start();
    save(false);
  }
  function continueGame(s) {
    G = baseState(s.seed);
    G.searched = new Set(s.searched || []);
    G.removed = new Set(s.removed || []);
    setupWorld(s.seed);
    G.time = s.time; G.kills = s.kills; G.uid = s.uid; G.lastHour = s.lastHour;
    Object.assign(G.p, s.p);
    G.containers = s.cont;
    for (const [x, y, hp, shirt] of s.z) addZombie(x, y, hp, shirt);
    for (const [x, y, a, shirt] of (s.c || [])) addCorpse(x, y, a, shirt);
    for (const b of (s.placed || [])) addPlaced({ x: b.x, y: b.y, type: b.type });
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
    $('btnRun').addEventListener('click', () => { input.run = !input.run; renderHud(); });
    $('btnUse').addEventListener('click', () => { if (G.nearC >= 0) startSearch(G.nearC); else if (G.nearBench >= 0) { G.tab = 'craft'; openSheet(-1); } });
    $('btnBag').addEventListener('click', () => { G.tab = 'bag'; openSheet(-1); });
    $('sheetClose').addEventListener('click', closeSheet);
    $('sheet').addEventListener('click', e => { if (e.target.id === 'sheet') closeSheet(); });
    document.querySelector('.sheet-card').addEventListener('click', e => {
      const c = e.target.closest('.card');
      if (c) return sheetAction(c.dataset.src === 'cont' ? 'takecont' : 'selinv', +c.dataset.uid);
      const b = e.target.closest('button[data-act]');
      if (b && !b.disabled) sheetAction(b.dataset.act, b.dataset.rid || null);
    });
    $('minimap').addEventListener('click', () => {
      if (!G || !G.running) return;
      G.paused = true; updateMaps();
      $('bigmap').classList.remove('hidden');
    });
    $('mapClose').addEventListener('click', () => { $('bigmap').classList.add('hidden'); G.paused = false; });
    $('bigmap').addEventListener('click', e => { if (e.target.id === 'bigmap') { $('bigmap').classList.add('hidden'); G.paused = false; } });
    $('wakeBtn').addEventListener('click', () => wake());
    $('menuBtn').addEventListener('click', () => {
      if (!G || !G.running) return;
      G.paused = true;
      const hrs = (G.time - 540) / 60;
      $('menuStat').textContent = `생존 ${Math.floor(hrs / 24)}일 ${Math.floor(hrs % 24)}시간 · 처치 ${G.kills}`;
      $('menu').classList.remove('hidden');
    });
    $('mResume').addEventListener('click', () => { $('menu').classList.add('hidden'); G.paused = false; });
    $('mSave').addEventListener('click', () => { save(true); });
    $('mNew').addEventListener('click', () => { clearSave(); newGame(); });
    $('tNew').addEventListener('click', () => newGame());
    $('tContinue').addEventListener('click', () => { const s = loadSave(); if (s) continueGame(s); else newGame(); });
    $('dRestart').addEventListener('click', () => newGame());

    const kmap = { KeyW: 'up', ArrowUp: 'up', KeyS: 'down', ArrowDown: 'down', KeyA: 'left', ArrowLeft: 'left', KeyD: 'right', ArrowRight: 'right', ShiftLeft: 'shift', ShiftRight: 'shift', Space: 'space' };
    addEventListener('keydown', e => {
      if (kmap[e.code]) { keys[kmap[e.code]] = true; e.preventDefault(); }
      if (!G || !G.running) return;
      if (e.code === 'KeyE' && G.nearC >= 0 && G.openC < 0 && !G.paused) startSearch(G.nearC);
      else if (e.code === 'KeyI' || e.code === 'Tab') { e.preventDefault(); if ($('sheet').classList.contains('hidden')) openSheet(-1); else closeSheet(); }
      else if (e.code === 'KeyM') $('minimap').click();
      else if (e.code === 'Escape') { closeSheet(); $('bigmap').classList.add('hidden'); G.paused = false; }
      updKeys();
    });
    addEventListener('keyup', e => { if (kmap[e.code]) keys[kmap[e.code]] = false; updKeys(); });
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
    VW = rot ? innerHeight : innerWidth; VH = rot ? innerWidth : innerHeight; L.panelW = 0;
    view.setAttribute('viewBox', `0 0 ${VW} ${VH}`);
    if (L.tint) for (const r of [L.tint, L.vign]) { r.setAttribute('width', VW); r.setAttribute('height', VH); }
  }

  let last = 0;
  function frame(ts) {
    const dt = Math.min(.05, Math.max(0, (ts - last) / 1000));
    last = ts;
    if (G && G.running && !G.paused) update(dt);
    if (G && M && !G.dead) render(dt);
    requestAnimationFrame(frame);
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
  setupInput();
  if (loadSave()) $('tContinue').classList.remove('hidden');
  requestAnimationFrame(frame);

  window.DT.debug = { mkItem: id => mkItem(id), stackAdd: it => stackAdd(it), RECIPES, get G() { return G; }, get M() { return M; }, get AS() { return AS; }, newGame, save, loadSave, continueGame, playerAttack, noise };
})();
