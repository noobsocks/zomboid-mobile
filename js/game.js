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
    bottle:  { name: '빈 물병', w: .1, type: 'mat', icon: 'bottle' },
    dirtywater: { name: '끓이지 않은 물', w: .5, type: 'drink', hyd: 30, time: 2, icon: 'bottle', sickP: .5 }, // 끓이면 생수
    soda:    { name: '탄산음료', w: .4, type: 'drink', hyd: 25, full: 4, time: 2, icon: 'soda' },
    note: { name: '쪽지', w: .05, type: 'note', icon: 'note' },
    carkey: { name: '자동차 열쇠', w: .02, type: 'key', icon: 'key' },
    radio: { name: '휴대용 라디오', w: .6, type: 'radio', icon: 'radio' },
    bandage: { name: '붕대', w: .1, type: 'med', stopBleed: true, hp: 4, time: 3, icon: 'bandage' },
    pills:   { name: '진통제', w: .1, type: 'med', hp: 12, time: 1, icon: 'pills' },
    knife:   { name: '식칼', w: .4, type: 'melee', hits: 1, dmg: .9, range: 1.0, cd: .42, endu: 5, dur: 25, knock: .15, color: '#d9dde0', icon: 'knife' },
    hammer:  { name: '망치', w: 1, type: 'melee', hits: 1, dmg: 1.25, range: 1.1, cd: .75, endu: 9, dur: 45, knock: .35, color: '#a0a0a0', icon: 'hammer' },
    bat:     { name: '야구방망이', w: 1.5, type: 'melee', hits: 2, dmg: 1.3, range: 1.35, cd: .8, endu: 10, dur: 40, knock: .5, color: '#c8a06a', icon: 'bat' },
    pipe:    { name: '쇠파이프', w: 1.8, type: 'melee', hits: 2, dmg: 1.6, range: 1.4, cd: .95, endu: 12, dur: 70, knock: .6, color: '#8d99a3', icon: 'pipe' },
    pistol:  { name: '권총', w: 1, type: 'gun', ammo: 'ammo', mag: 12, dmg: 3.2, range: 9, cd: .55, noise: 30, color: '#111', icon: 'gun' },
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
    screwdriver: { name: '드라이버', w: .3, type: 'melee', tool: true, hits: 1, dmg: .75, range: .95, cd: .4, endu: 4, dur: 40, knock: .1, color: '#c8a020', icon: 'screwdriver' }, // 도구지만 급할 땐 무기로도
    // --- 추가 무기 (하급 1명 · 일반 2명 · 고급 3명) ---
    pan:     { name: '프라이팬', w: 1.2, type: 'melee', hits: 1, dmg: 1.1, range: 1.05, cd: .7, endu: 8, dur: 55, knock: .55, color: '#2a2a2a', icon: 'pan' },
    wrench:  { name: '렌치', w: 1.1, type: 'melee', hits: 1, dmg: 1.2, range: 1.05, cd: .65, endu: 8, dur: 70, knock: .35, color: '#9aa0a4', icon: 'wrench' },
    hknife:  { name: '사냥칼', w: .5, type: 'melee', hits: 1, dmg: 1.35, range: 1.0, cd: .45, endu: 5, dur: 45, knock: .15, color: '#c8ccd0', icon: 'hknife' },
    baton:   { name: '경찰봉', w: .7, type: 'melee', hits: 1, dmg: 1.0, range: 1.15, cd: .5, endu: 6, dur: 80, knock: .4, color: '#1a1a1a', icon: 'baton' },
    brick:   { name: '벽돌', w: 1.5, type: 'melee', hits: 1, dmg: 1.0, range: .9, cd: .8, endu: 9, dur: 12, knock: .45, color: '#8a4a2a', icon: 'brick' },
    crowbar: { name: '쇠지렛대', w: 1.6, type: 'melee', hits: 2, dmg: 1.5, range: 1.3, cd: .85, endu: 11, dur: 90, knock: .5, color: '#3a3a3a', icon: 'crowbar' },
    golf:    { name: '골프채', w: 1, type: 'melee', hits: 2, dmg: 1.25, range: 1.5, cd: .75, endu: 9, dur: 30, knock: .45, color: '#c8ccd0', icon: 'golf' },
    hockey:  { name: '하키 스틱', w: 1.2, type: 'melee', hits: 2, dmg: 1.2, range: 1.55, cd: .75, endu: 9, dur: 35, knock: .5, color: '#c8a06a', icon: 'hockey' },
    shovel:  { name: '삽', w: 2, type: 'melee', hits: 2, dmg: 1.55, range: 1.5, cd: .95, endu: 12, dur: 60, knock: .6, color: '#6a6a60', icon: 'shovel' },
    machete: { name: '마체테', w: 1, type: 'melee', hits: 2, dmg: 1.9, range: 1.3, cd: .6, endu: 8, dur: 50, knock: .25, color: '#c8ccd0', icon: 'machete' },
    pickaxe: { name: '곡괭이', w: 2.6, type: 'melee', hits: 2, dmg: 2.1, range: 1.35, cd: 1.1, endu: 14, dur: 70, knock: .5, color: '#6a4a2a', icon: 'pickaxe' },
    fireaxe: { name: '소방 도끼', w: 2.6, type: 'melee', hits: 3, dmg: 2.3, range: 1.45, cd: 1.1, endu: 15, dur: 80, knock: .65, color: '#c8141f', icon: 'fireaxe' },
    sledge:  { name: '오함마', w: 4, type: 'melee', hits: 3, dmg: 2.8, range: 1.45, cd: 1.5, endu: 22, dur: 100, knock: 1, color: '#5a5a58', icon: 'sledge' },
    katana:  { name: '일본도', w: 1.3, type: 'melee', hits: 3, dmg: 2.4, range: 1.55, cd: .7, endu: 9, dur: 55, knock: .3, color: '#e8eef2', icon: 'katana' },
    revolver: { name: '리볼버', w: 1.1, type: 'gun', ammo: 'ammo', mag: 6, dmg: 4, range: 9, cd: .85, noise: 32, color: '#2a2a2a', icon: 'revolver' },
    shotgun: { name: '산탄총', w: 3.2, type: 'gun', ammo: 'shells', mag: 5, hits: 3, spread: .38, dmg: 3.4, range: 5.5, cd: 1.2, noise: 42, color: '#4a3a2a', icon: 'shotgun' },
    rifle:   { name: '사냥 소총', w: 3.8, type: 'gun', ammo: 'rammo', mag: 5, pierce: 2, dmg: 6, range: 14, cd: 1.4, noise: 45, color: '#5a4028', icon: 'rifle' },
    crossbow: { name: '석궁', w: 2.4, type: 'gun', ammo: 'bolt', mag: 1, dmg: 3.2, range: 10, cd: 1.7, noise: 4, color: '#4a3a2a', icon: 'crossbow' },
    shells:  { name: '산탄', w: .04, type: 'ammo', stack: true, icon: 'shells' },
    rammo:   { name: '소총탄', w: .03, type: 'ammo', stack: true, icon: 'rammo' },
    bolt:    { name: '석궁 볼트', w: .05, type: 'ammo', stack: true, icon: 'bolt' },
    axe:     { name: '도끼', w: 2.2, type: 'melee', hits: 3, dmg: 2.0, range: 1.4, cd: 1.05, endu: 14, dur: 60, knock: .6, color: '#8a6a45', icon: 'axe' },
    saw:     { name: '톱', w: .8, type: 'tool', icon: 'saw' },
    log:     { name: '통나무', w: 4, type: 'mat', icon: 'log' },
    barricade: { name: '바리케이드 판자', w: 1.2, type: 'mat', icon: 'barricade' },
    benchkit: { name: '작업대 (설치용)', w: 6, type: 'place', icon: 'bench' },
    furn:    { name: '가구', w: 10, type: 'place', icon: 'bench' },
    // --- 제작 무기 ---
    nailbat: { name: '못 박힌 판자', w: 1.3, type: 'melee', hits: 2, dmg: 1.2, range: 1.25, cd: .8, endu: 10, dur: 30, knock: .45, color: '#a47a4c', icon: 'nailbat' },
    spear:   { name: '창', w: 1.6, type: 'melee', hits: 2, dmg: 1.5, range: 1.8, cd: .85, endu: 10, dur: 45, knock: .3, color: '#8d99a3', icon: 'spear' },
    // --- 옷·배낭 (장비 칸) : def 방어, spd 이동(%), cap 가방 용량(kg) ---
    cap:       { name: '야구모자', w: .1, type: 'wear', slot: 'head', warm: 1, art: 'cap', def: 1, dur: 30, soft: 1, icon: 'hat' },
    motohelm:  { name: '오토바이 헬멧', w: 1.2, type: 'wear', slot: 'head', warm: 1, art: 'moto', def: 8, dur: 60, icon: 'helm' },
    firehelm:  { name: '소방 헬멧', w: 1.3, type: 'wear', slot: 'head', warm: 2, art: 'fire', def: 9, dur: 70, icon: 'helm' },
    milhelm:   { name: '군용 헬멧', w: 1.4, type: 'wear', slot: 'head', warm: 1, art: 'mil', def: 10, dur: 80, icon: 'helm' },
    oldjacket: { name: '낡은 자켓', w: .8, type: 'wear', slot: 'body', warm: 3, def: 3, dur: 40, soft: 1, icon: 'jacket', lookC: 1 },
    hoodie:    { name: '후드티', w: .6, type: 'wear', slot: 'body', warm: 3, def: 2, dur: 35, soft: 1, icon: 'jacket', color: '#55595f' },
    fieldjkt:  { name: '야전상의', w: 1.2, type: 'wear', slot: 'body', warm: 4, def: 5, dur: 50, soft: 1, icon: 'jacket', color: '#4b5134' },
    leather:   { name: '가죽 재킷', w: 1.8, type: 'wear', slot: 'body', warm: 4, def: 8, dur: 60, soft: 1, icon: 'jacket', color: '#6a4a30' },
    firecoat:  { name: '방화복', w: 2.6, type: 'wear', slot: 'body', warm: 6, def: 10, dur: 70, spd: -3, icon: 'jacket', color: '#b0913a' },
    vest:      { name: '방탄 조끼', w: 3.5, type: 'wear', slot: 'body', warm: 1, def: 14, dur: 90, spd: -4, icon: 'vest', color: '#2e3a4e' },
    jeans:     { name: '청바지', w: .7, type: 'wear', slot: 'legs', warm: 2, def: 3, dur: 45, soft: 1, icon: 'pants' },
    workpants: { name: '작업 바지', w: .8, type: 'wear', slot: 'legs', warm: 2, def: 4, dur: 55, soft: 1, icon: 'pants' },
    milpants:  { name: '군복 바지', w: .8, type: 'wear', slot: 'legs', warm: 2, def: 5, dur: 60, soft: 1, icon: 'pants' },
    sneakers:  { name: '운동화', w: .6, type: 'wear', slot: 'feet', warm: 1, def: 1, spd: 3, dur: 45, soft: 1, icon: 'boots' },
    boots:     { name: '작업화', w: 1.2, type: 'wear', slot: 'feet', warm: 2, def: 3, dur: 70, icon: 'boots' },
    milboots:  { name: '군화', w: 1.4, type: 'wear', slot: 'feet', warm: 2, def: 4, spd: 1, dur: 80, icon: 'boots' },
    gloves:    { name: '작업 장갑', w: .2, type: 'wear', slot: 'hands', warm: 1, def: 2, dur: 35, soft: 1, icon: 'gloves' },
    tgloves:   { name: '전술 장갑', w: .2, type: 'wear', slot: 'hands', warm: 1, def: 3, dur: 50, soft: 1, icon: 'gloves' },
    mapitem:   { name: '지역 지도', w: .05, type: 'map', icon: 'map' }, // it.town = 도시 번호 → 읽으면 그 도시가 지도에 나옴
    countymap: { name: '카운티 도로 지도', w: .05, type: 'map', icon: 'map' }, // 읽으면 도로·강이 지도에 나옴
    pencil:    { name: '연필', w: .02, type: 'tool', icon: 'note', pen: '#77746c' },
    pen:       { name: '볼펜', w: .02, type: 'tool', icon: 'note', pen: '#1c1c1c' },
    redpen:    { name: '빨간 펜', w: .02, type: 'tool', icon: 'note', pen: '#b3121c' },
    bluepen:   { name: '파란 펜', w: .02, type: 'tool', icon: 'note', pen: '#2350b8' },
    eraser:    { name: '지우개', w: .02, type: 'tool', icon: 'bandage' },
    raincol:   { name: '빗물 받이', w: 3, type: 'place', icon: 'drop' },
    splint:    { name: '부목', w: .4, type: 'med', icon: 'plank', splint: 1, time: 4 },
    disinfect: { name: '소독약', w: .3, type: 'med', icon: 'pills', uses: 3, disinfect: 1, time: 2 },
    gascan:    { name: '기름통', w: .8, type: 'tool', icon: 'fuel' }, // it.fuel: 0~10L (무게 1L=0.75kg)
    oldpack:   { name: '낡은 배낭', w: .6, type: 'wear', slot: 'back', cap: 5, icon: 'pack', lookP: 1 },
    schoolbag: { name: '책가방', w: .5, type: 'wear', slot: 'back', cap: 7, icon: 'pack', pack: 'school' },
    duffel:    { name: '더플백', w: 1, type: 'wear', slot: 'back', cap: 10, spd: -4, icon: 'pack', pack: 'duffel' },
    hikebag:   { name: '등산 배낭', w: 1.2, type: 'wear', slot: 'back', cap: 12, spd: -2, icon: 'pack', pack: 'hike' },
    milbag:    { name: '군용 배낭', w: 1.8, type: 'wear', slot: 'back', cap: 15, spd: -3, icon: 'pack', pack: 'mil' },
  };
  const STACK_ROLL = { ammo: [6, 15], nails: [3, 10], cloth: [2, 4], shells: [3, 8], rammo: [3, 8], bolt: [3, 7] };
  const TOOL_NAME = { hammer: '망치', screwdriver: '드라이버', pot: '냄비', saw: '톱', axe: '도끼' };
  // 기술
  const SKILLS = { melee: ['근접 전투', 'fist', '공격력·치명타↑, 휘두를 때 지구력↓'], gun: ['사격', 'gun', '명중률↑'], carp: ['목공', 'hammer', '제작·분해 빨라짐, 분해할 때 재료가 덜 부서짐, 판자 튼튼해짐'], cook: ['요리', 'pot', '요리 빨라지고 음식 효과↑'], aid: ['응급처치', 'bandage', '붕대 빨라지고 회복량↑'], mech: ['정비', 'wrench', '차 수리량↑·빨라짐, 기름 옮기기 빨라짐'] };
  const xpNeed = lv => Math.round(25 * Math.pow(lv + 1, 1.6));
  // 제작 레시피: in = [아이템, 개수] (못·천은 개수, 테이프·접착제는 사용 횟수)
  const RECIPES = [
    { id: 'bandage',   in: [['cloth', 2]], out: 'bandage', time: 3 },
    { id: 'barricade', in: [['plank', 1], ['nails', 2]], tools: ['hammer'], out: 'barricade', time: 4, noise: 5 },
    { id: 'nailbat',   in: [['plank', 1], ['nails', 3]], tools: ['hammer'], out: 'nailbat', time: 5, noise: 5 },
    { id: 'plank3',    in: [['log', 1]], tools: ['saw'], out: 'plank', n: 3, time: 6, noise: 3 },
    { id: 'benchkit',  in: [['plank', 4], ['nails', 6]], tools: ['hammer'], out: 'benchkit', time: 10, noise: 6 },
    { id: 'spear',     in: [['pipe', 1], ['knife', 1], ['tape', 1]], out: 'spear', time: 6, bench: true },
    { id: 'campkit',   in: [['plank', 2], ['cloth', 1]], out: 'campkit', time: 5 },
    { id: 'raincol',   in: [['plank', 2], ['nails', 2], ['cloth', 2]], tools: ['hammer'], out: 'raincol', time: 8, noise: 4 },
    { id: 'splint',    in: [['plank', 1], ['cloth', 2]], out: 'splint', time: 4 },
    { id: 'boil',      in: [['dirtywater', 1]], tools: ['pot'], out: 'water', time: 5, heat: true, cook: true },
    // 요리 (불 필요: 전기 있을 땐 조리대, 끊기면 모닥불)
    { id: 'hotcan',    in: [['can', 1]], out: 'hotcan', time: 4, heat: true, cook: true },
    { id: 'toast',     in: [['bread', 1]], out: 'toast', time: 3, heat: true, cook: true },
    { id: 'stew',      in: [['can', 1], ['water', 1], ['apple', 1]], tools: ['pot'], out: 'stew', time: 8, heat: true, cook: true },
  ];
  // 제작할 때 소리 (망치 쓰는 건 망치질이 따로 반복됨)
  const CRAFT_SFX = { bandage: 'craft_cloth', plank3: 'saw', spear: 'craft_tape', splint: 'craft_tape', campkit: 'craft_wood' };
  // 가구 분해
  const DISMANTLE = {
    closet:  { tool: 'hammer', time: 7, noise: 7, out: [['plank', 3, 4], ['nails', 2, 5]] },
    drawer:  { tool: 'hammer', time: 5, noise: 6, out: [['plank', 2, 3], ['nails', 1, 4]] },
    cabinet: { tool: 'hammer', time: 5, noise: 6, out: [['plank', 2, 3], ['nails', 2, 4]] },
    fridge:  { tool: 'screwdriver', time: 8, noise: 4, out: [['scrap', 2, 3], ['wire', 1, 2]] },
    bench:   { tool: 'hammer', time: 6, noise: 6, out: [['plank', 2, 3], ['nails', 2, 4]] },
    toolrack: { tool: 'hammer', time: 6, noise: 6, out: [['plank', 2, 3], ['nails', 1, 3]] },
    counter:  { tool: 'hammer', time: 6, noise: 6, out: [['plank', 2, 3], ['nails', 2, 4]] },
    shelf_food: { tool: 'screwdriver', time: 6, noise: 4, out: [['scrap', 1, 2], ['wire', 0, 1]] },
    shelf_med:  { tool: 'screwdriver', time: 6, noise: 4, out: [['scrap', 1, 2], ['wire', 0, 1]] },
    locker:     { tool: 'screwdriver', time: 7, noise: 4, out: [['scrap', 2, 3]] },
    firegear:   { tool: 'screwdriver', time: 7, noise: 4, out: [['scrap', 2, 3]] },
    crate:      { tool: 'hammer', time: 4, noise: 5, out: [['plank', 1, 3], ['nails', 1, 3]] },
    kitchen:    { tool: 'screwdriver', time: 6, noise: 4, out: [['scrap', 1, 2], ['wire', 0, 1]] },
    huntrack:   { tool: 'hammer', time: 6, noise: 6, out: [['plank', 2, 3], ['nails', 1, 3]] },
    sportrack:  { tool: 'screwdriver', time: 6, noise: 4, out: [['scrap', 1, 2], ['wire', 0, 1]] },
  };
  // 아이템 분해
  const ITEM_DISMANTLE = {
    shirt:   { time: 3, out: [['cloth', 2, 4]] },
    hoodie: { time: 3, out: [['cloth', 2, 3]] }, oldjacket: { time: 3, out: [['cloth', 2, 3]] }, jeans: { time: 3, out: [['cloth', 2, 3]] }, workpants: { time: 3, out: [['cloth', 2, 3]] }, milpants: { time: 3, out: [['cloth', 2, 3]] }, fieldjkt: { time: 4, out: [['cloth', 3, 4]] },
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
  const FISTS = { name: '맨손', type: 'melee', hits: 1, dmg: .35, range: .85, cd: .5, endu: 4, knock: .25, icon: 'fist' };
  const LOOT = {
    fridge:  { name: '냉장고', color: '#f4f4f4', pool: [['pen', .2], ['countymap', .08], ['mapitem', .25], ['pencil', .6], ['pen', .5], ['redpen', .15], ['bluepen', .15], ['eraser', .3], ['bottle', .6], ['bottle', 1], ['disinfect', .5], ['splint', .4], ['disinfect', .4], ['disinfect', 1.5], ['gascan', .4], ['hikebag', .6], ['boots', .6], ['fieldjkt', .4], ['milpants', .4], ['gloves', .5], ['sneakers', 1.2], ['cap', 1], ['schoolbag', .6], ['duffel', .6], ['firehelm', .8], ['firecoat', .55], ['boots', .6], ['gloves', .8], ['workpants', .7], ['boots', .6], ['gloves', .7], ['cap', .4], ['hikebag', .25], ['vest', .12], ['hoodie', 1.4], ['jeans', 1.4], ['sneakers', .9], ['cap', .9], ['schoolbag', .5], ['leather', .3], ['duffel', .3], ['gloves', .3], ['brick', .05], ['apple', 3], ['bread', 2], ['water', 3], ['soda', 3], ['can', 1]], min: 1, max: 3 },
    cabinet: { name: '조리대', color: '#a17a50', pool: [['pan', .9], ['can', 3], ['chips', 3], ['water', 1], ['bread', 1], ['pills', 1], ['tape', .8], ['glue', .6], ['pot', .7]], min: 0, max: 3 },
    drawer:  { name: '서랍', color: '#7a5a3a', pool: [['hknife', .35], ['wrench', .3], ['bolt', .2], ['bandage', 3], ['knife', 1.2], ['ammo', .8], ['pills', 2], ['hammer', .8], ['nails', 1.6], ['tape', 1], ['screwdriver', .9], ['glue', .5]], min: 0, max: 3 },
    closet:  { name: '옷장', color: '#5a432d', pool: [['bandage', 2], ['bat', 1.5], ['pipe', .8], ['pistol', .35], ['ammo', 1], ['shirt', 2.5], ['cloth', 1], ['axe', .15], ['golf', .6], ['hockey', .5], ['katana', .05], ['crossbow', .08], ['shotgun', .06], ['shells', .15]], min: 0, max: 3 },
    // 특수 건물
    shelf_food: { name: '식품 진열대', color: '#c8a050', pool: [['can', 3], ['chips', 3], ['bread', 2], ['soda', 2.5], ['water', 2.5], ['apple', 1.5]], min: 1, max: 4 },
    shelf_med:  { name: '약 진열대', color: '#6aa8a0', pool: [['bandage', 3], ['pills', 3], ['water', .8], ['glue', .3]], min: 1, max: 3 },
    counter:    { name: '계산대', color: '#8a7a6a', pool: [['mapitem', .5], ['countymap', .12], ['pen', .4], ['pencil', .3], ['gascan', .25], ['soda', 1], ['chips', 1], ['pills', .7], ['tape', .6], ['knife', .4], ['ammo', .3], ['baton', .2], ['shells', .15]], min: 0, max: 2 },
    locker:     { name: '사물함', color: '#4a5a6a', pool: [['bandage', 1.5], ['baton', 1.6], ['ammo', 1.5], ['pistol', .35], ['revolver', .3], ['shells', .8], ['shirt', 1], ['hknife', .6]], min: 0, max: 3 },
    gunlocker:  { name: '총기 보관함', color: '#2a3440', pool: [['ammo', 3], ['pistol', 1.2], ['revolver', .8], ['shotgun', .9], ['shells', 2.5], ['rifle', .5], ['rammo', 1.5]], min: 1, max: 3 },
    toolrack:   { name: '공구 선반', color: '#9a6a3a', pool: [['gascan', .6], ['gloves', 1], ['workpants', .4], ['boots', .3], ['hammer', 1], ['nails', 3], ['plank', 2.5], ['screwdriver', 1], ['tape', 1.5], ['glue', 1], ['wire', 1.5], ['pipe', .8], ['scrap', 1.5], ['axe', .6], ['saw', 1], ['wrench', 1], ['crowbar', .8], ['shovel', .8], ['sledge', .35], ['pickaxe', .45], ['fireaxe', .25], ['machete', .4]], min: 1, max: 4 },
    firegear:   { name: '소방 장비함', color: '#b8281a', pool: [['fireaxe', .9], ['bandage', 2], ['cloth', 1.5], ['water', 1.5], ['tape', 1], ['crowbar', .6], ['sledge', .25], ['shirt', .8]], min: 1, max: 3 },
    kitchen:    { name: '주방 선반', color: '#b8b4a8', pool: [['hknife', 1], ['knife', 1.2], ['pan', 1], ['pot', .8], ['can', 2.5], ['bread', 2], ['apple', 1.5], ['water', 1], ['cloth', .6]], min: 1, max: 3 },
    huntrack:   { name: '사냥 진열대', color: '#5a6a3a', pool: [['crossbow', .45], ['bolt', 2.5], ['rifle', .3], ['rammo', 1.5], ['shotgun', .25], ['shells', 1.2], ['hknife', 1.2], ['machete', .6], ['axe', .4], ['water', 1], ['can', 1]], min: 1, max: 3 },
    sportrack:  { name: '스포츠 진열대', color: '#3a6a9a', pool: [['bat', 1.5], ['golf', 1.5], ['hockey', 1.2], ['water', 1.5], ['soda', 1], ['bandage', .6], ['tape', .6]], min: 1, max: 3 },
    safe:       { name: '금고', color: '#4a4a48', pool: [['revolver', .5], ['pistol', .6], ['ammo', 2], ['baton', .8], ['bandage', .6], ['pills', .5]], min: 0, max: 2 },
    crate:      { name: '나무 상자', color: '#9a7446', pool: [['plank', 2], ['nails', 2], ['scrap', 1.5], ['wire', 1], ['can', 1.5], ['water', 1], ['tape', 1], ['glue', .6], ['crowbar', .25], ['wrench', .3], ['sledge', .1]], min: 0, max: 3 },
    luggage:    { name: '여행 가방', color: '#2a4a6a', pool: [['mapitem', .3], ['pen', .3], ['pencil', .2], ['hoodie', 1], ['jeans', 1], ['cap', .6], ['sneakers', .6], ['duffel', .4], ['shirt', 3], ['cloth', 2], ['pills', 1.2], ['bandage', 1], ['water', 1], ['chips', 1], ['soda', .8], ['note', .9], ['radio', .12]], min: 0, max: 3 },
    supply:     { name: '보급 상자', color: '#4e5436', pool: [['countymap', .2], ['pencil', .2], ['disinfect', .5], ['milhelm', .35], ['milpants', .4], ['milboots', .4], ['tgloves', .3], ['fieldjkt', .3], ['can', 3], ['water', 3], ['bandage', 2], ['pills', 1], ['ammo', 1.2], ['rammo', .8], ['shells', .5], ['note', .4]], min: 1, max: 3 },
    miltruck:   { name: '군용 트럭', color: '#4b5134', pool: [['milhelm', .5], ['vest', .25], ['milpants', .5], ['milboots', .5], ['tgloves', .4], ['milbag', .3], ['fieldjkt', .4], ['ammo', 2], ['rammo', 1.5], ['can', 2], ['water', 2], ['bandage', 1.5], ['rifle', .12], ['machete', .3], ['radio', .3], ['note', .5]], min: 1, max: 3 },
    car:        { name: '차량', color: '#6b6b66', pool: [['mapitem', .45], ['countymap', .12], ['pen', .25], ['bottle', .5], ['gascan', .35], ['motohelm', .15], ['gloves', .3], ['cap', .3], ['water', 2], ['soda', 1.5], ['chips', 1.5], ['tape', 1], ['screwdriver', .8], ['hammer', .4], ['bandage', 1], ['pills', .8], ['cloth', 1], ['wire', .8], ['scrap', .8], ['ammo', .25], ['saw', .25], ['axe', .12], ['wrench', .6], ['crowbar', .5], ['golf', .3], ['brick', .3], ['shovel', .15], ['rifle', .03], ['rammo', .08]], min: 0, max: 3 },
  };
  const BASE_CAP = 10;     // 무게 한도 (배낭 없이) — 배낭을 메면 늘어남
  // 들어서 옮길 수 있는 가구 (이름·무게)
  const FURN = { fridge: ['냉장고', 22], cabinet: ['조리대', 14], drawer: ['서랍장', 10], closet: ['옷장', 16], bed: ['침대', 18], sofa: ['소파', 16], table: ['식탁', 7], tv: ['TV', 6], toilet: ['변기', 9], shelf: ['책장', 14], bath: ['욕조', 30], sink: ['세면대', 8], washer: ['세탁기', 25], plant: ['화분', 4], desk: ['책상', 10], shelf_food: ['진열대', 20], shelf_med: ['약 진열대', 18], counter: ['계산대', 24], locker: ['사물함', 20], gunlocker: ['총기 보관함', 34], toolrack: ['공구 선반', 22], firegear: ['소방 장비함', 20], kitchen: ['주방 선반', 16], huntrack: ['사냥 진열대', 20], sportrack: ['스포츠 진열대', 18], safe: ['금고', 60], crate: ['나무 상자', 12], luggage: ['여행 가방', 5], supply: ['보급 상자', 14] };
  const FURN_CONT = { fridge: 1, cabinet: 1, drawer: 1, closet: 1, shelf_food: 1, shelf_med: 1, counter: 1, locker: 1, gunlocker: 1, toolrack: 1, firegear: 1, kitchen: 1, huntrack: 1, sportrack: 1, safe: 1, crate: 1, luggage: 1, supply: 1 };
  const namedTowns = () => (M.towns || []).filter(t => t.name && t.key !== 'hamlet');
  function pickMapTown(c, r) { const T0 = namedTowns(); if (!T0.length) return null; if (c && c.town != null && M.towns[c.town] && M.towns[c.town].name && r() < .6) return c.town; return T0[(r() * T0.length) | 0].id; }
  const nameOf = it => it.id === 'mapitem' && it.town != null && M.towns && (G.worldM || M).towns[it.town] ? (G.worldM || M).towns[it.town].name + ' 지도' : it.id === 'furn' ? (FURN[it.kind] || ['가구'])[0] : it.id === 'note' && it.nid && DT.STORY && DT.STORY.notes[it.nid] ? DT.STORY.notes[it.nid].t : ITEMS[it.id].name;
  // 쪽지 고르기: 그 도시 이야기 3배 가중 + 어디서나 나오는 쪽지
  function pickNote(key, r) {
    r = r || rand; const N = (DT.STORY || {}).notes || {}, ids = Object.keys(N), pool = [];
    for (const id of ids) { if (N[id].key) continue; const w = N[id].town === key ? 3 : N[id].town === 'any' ? 1 : 0; for (let k = 0; k < w; k++) pool.push(id); }
    return pool.length ? pool[(r() * pool.length) | 0] : null;
  }
  const townKeyOf = c => { const tn = c && c.town != null && M.towns ? M.towns[c.town] : null; return tn ? (tn.key === 'hamlet' ? 'any' : tn.key) : 'any'; };
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
    if (d.mag) it.mag = r() < .4 ? 1 + Math.floor(r() * d.mag) : 0; // 총은 가끔 탄이 조금 든 채로 발견
    if (id === 'gascan') { it.fuel = r() < .55 ? 0 : 1 + Math.floor(r() * 6); canW(it); }
    if (id === 'note') it.nid = pickNote('any', r);
    return it;
  }
  // 가구 속 물건은 처음 열어볼 때 정함 (큰 세계에서 수천 개를 미리 만들지 않음) — 번호별로 항상 같은 결과
  function contItems(i) {
    let l = G.containers[i];
    if (!l) {
      const c = M.containers[i], r = DT.rng((G.seed ^ (i * 2654435761) ^ (M.salt || 0)) >>> 0);
      l = G.containers[i] = c ? rollLoot(c.kind, r) : [];
      for (const it of l) if (it.id === 'note') it.nid = pickNote(townKeyOf(c), r); // 그 도시의 이야기
      for (const it of l) if (it.id === 'mapitem') it.town = pickMapTown(c, r); // 대부분 그 도시 지도, 가끔 다른 도시
      if (c && c.fixedNote) { const n = mkItem('note'); n.nid = c.fixedNote; l.unshift(n); } // 정해진 자리의 핵심 문서
      if (!M.level && G.keyAt && G.keyAt[i] != null) { const k = mkItem('carkey'); k.vid = G.keyAt[i]; l.unshift(k); } // 근처 차 열쇠
    }
    return l;
  }
  const LOOT_RATE = .7, Z_RATE = .7; // 물건·좀비 양 (1 = 예전)
  function rollLoot(kind, r) {
    const tb = LOOT[kind];
    const n0 = tb.min + Math.floor(r() * (tb.max - tb.min + 1));
    let n = 0; for (let i = 0; i < n0; i++) if (r() < LOOT_RATE) n++; // 물건 양 70%
    if (tb.min > 0) n = Math.max(1, n); // 늘 뭔가 있는 곳(총기 보관함 등)은 최소 1개
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
        bleed: false, infected: false, infT: 0, inv: [], equip: null, equip2: null, wear: {}, wounds: [], cd: 0, cdMax: 1, noiseT: 0, atkT: 0, noiseR: 0 },
      zombies: [], zdorm: new Map(), zdormN: 0, zoneT: 0, corpses: [], fx: [], containers: [], searched: new Set(),
      running: false, paused: false, sleeping: false, openC: -1, sel: null,
      sk: { melee: { lv: 0, xp: 0 }, gun: { lv: 0, xp: 0 }, carp: { lv: 0, xp: 0 }, cook: { lv: 0, xp: 0 }, aid: { lv: 0, xp: 0 }, mech: { lv: 0, xp: 0 } },
      power: 1, powerOffAt: (6 + Math.floor(Math.random() * 4)) * 1440 + 9 * 60, sick: 0, waterOn: 1, snowCov: 0, marks: [], toiletUsed: [],
      rain: 0, rainTarget: 0, weatherNext: 9 * 60 + 120 + Math.random() * 300, thunderT: 30, flashT: 0, hitStop: 0,
      actions: [], placed: [], removed: new Set(), tab: 'bag', chopped: new Set(), nearTree: -1, nearBench: -1, lastHour: 9, night: 0, saveT: 0, hudT: 0, dead: false, shake: 0, dmgInd: [], nearC: -1,
    };
  }

  /* ================= 월드 구성 ================= */
  function setupWorld(seed) {
    M = (G.mapV || 1) >= 5 ? DT.generateCounty(seed) : (G.mapV || 1) >= 4 ? DT.generateWorld(seed) : DT.generateMap(seed, { v: G.mapV || 1 });
    M.KA = M.world ? M.towns.reduce((s, t) => s + t.w * t.h, 0) / 5184 : (M.W * M.H) / 5184; // 예전 맵 대비 (마을) 넓이 배율
    legacyRoadInfo();
    for (const k of (G.chopped || [])) { M.t[k] = DT.T.GRASS; M.moveBlock[k] = M.deco[k] ? 1 : 0; M.sightBlock[k] = 0; } // 베어낸 나무
    for (const i of (G.removed || [])) { const c = M.containers[i]; if (!c) continue; const k = c.y * M.W + c.x; if (M.deco[k]) { M.deco[k] = 0; M.moveBlock[k] = 0; } } // 들어서 옮긴 진열대 자리는 지나갈 수 있게
    prepareMap(M);
    AS = M._AS;
    G.worldM = M; G.lv = null; G.lvStore = {}; G.lvWorld = null; L.lvCache = {};
    pathQueue = [];
    L.mini = L.big = null; // 이전 판 지도 초기화 (새 게임 두 번째부터 멈추던 문제)
    initFog();
    buildScene();
    buildMaps();
    L._cx = null;
  }
  // 지도 하나를 게임에서 쓸 수 있게 준비 (길찾기 · 문/창문 목록 · 조각 목록) — 월드와 각 층 공통
  function prepareMap(M) {
    const AS = M._AS = new DT.AStar(M.W, M.H, M.moveBlock);
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
    buildIndex(M);
  }

  // 칸 범위 안에서 같은 종류 칸을 가로로 이어 한 경로로 (조각별로 그리기 위해 범위를 받음)
  function runsPathR(pred, x0, y0, x1, y1) {
    const W = M.W, t = M.t;
    let d = '';
    for (let y = y0; y < y1; y++) {
      let x = x0;
      while (x < x1) {
        if (pred(t[y * W + x])) { const s = x; while (x < x1 && pred(t[y * W + x])) x++; d += `M${s} ${y}h${x - s}v1h${s - x}z`; }
        else x++;
      }
    }
    return d;
  }
  const runsPath = pred => runsPathR(pred, 0, 0, M.W, M.H);
  const circ = (cx, cy, r) => `M${(cx - r).toFixed(2)} ${cy.toFixed(2)}a${r.toFixed(2)} ${r.toFixed(2)} 0 1 0 ${(2 * r).toFixed(2)} 0a${r.toFixed(2)} ${r.toFixed(2)} 0 1 0 ${(-2 * r).toFixed(2)} 0`;

  /* ================= 16x16칸 조각(청크) 단위 그리기 ================= */
  // 화면 근처 조각만 그리고, 멀어진 조각은 지움 → 세계가 아무리 커도 그리는 양은 일정
  const CK = 16;
  const ckRng = (cx, cy, salt) => DT.rng((((cx + 1) * 73856093) ^ ((cy + 1) * 19349663) ^ (salt * 83492791) ^ (G.seed * 2654435761)) >>> 0);
  const FLOORS = ['floorPat', 'floorPat', 'floorOak', 'floorDark', 'carpetPat'];
  function houseStyle(h, i) {
    if (h._st) return h._st;
    const r = DT.rng((G.seed ^ ((i + 1) * 2246822519)) >>> 0);
    const st = { floor: h.forceFloor || (h.shop ? 'shopPat' : FLOORS[(r() * FLOORS.length) | 0]), kitchen: !h.forceFloor && !h.shop && r() < .35, deco: h.shop || h.forceFloor ? 1 : r() };
    if (st.deco >= .3 && st.deco < .65) { st.rw = 1.6 + r() * 1.4; st.rh = 1.2 + r() * 1.2; st.rx = h.x + 1.3 + r() * Math.max(.1, h.w - 3 - st.rw); st.ry = h.y + 1.3 + r() * Math.max(.1, h.h - 3 - st.rh); st.rc = ['#5a2626', '#2b3a4a', '#4a4a2a', '#3d2b3d'][(r() * 4) | 0]; }
    h.floor = st.floor;
    return (h._st = st);
  }
  // 조각별 목록 (가구·문·차량·가로등 등을 그 조각에 속한 것만 빨리 찾기 위해)
  function buildIndex(M) {
    const CW = Math.ceil(M.W / CK), CH = Math.ceil(M.H / CK);
    M.CW = CW; M.CH = CH;
    const mk = () => Array.from({ length: CW * CH }, () => []);
    const ck = (x, y) => clamp(Math.floor(y / CK), 0, CH - 1) * CW + clamp(Math.floor(x / CK), 0, CW - 1);
    M.ckOf = ck;
    M.ixCont = mk(); M.containers.forEach((c, i) => M.ixCont[ck(c.x, c.y)].push(i));
    M.ixDecor = mk(); M.decor.forEach((d, i) => M.ixDecor[ck(d.x, d.y)].push(i));
    M.ixCar = mk(); M.cars.forEach((c, i) => M.ixCar[ck(c.x, c.y)].push(i));
    M.ixOp = mk(); M.op.forEach(o => M.ixOp[ck(o.x, o.y)].push(o));
    M.ixLamp = mk(); M.lamps.forEach(l => M.ixLamp[ck(l[0], l[1])].push(l));
    M.ixShop = mk(); (M.shops || []).forEach(s => M.ixShop[ck(s.door[0], s.door[1])].push(s));
    M.ixHouse = mk(); M.ixHouseAll = mk();
    M.houses.forEach((h, i) => {
      M.ixHouse[ck(h.x, h.y)].push(i);
      for (let cy = Math.floor(h.y / CK); cy <= Math.floor((h.y + h.h - 1) / CK); cy++) for (let cx = Math.floor(h.x / CK); cx <= Math.floor((h.x + h.w - 1) / CK); cx++) if (cx < CW && cy < CH) M.ixHouseAll[cy * CW + cx].push(i);
    });
    M.ixLane = mk();
    for (const ln of M.lanes) {
      const [ax, ay, bx, by] = ln;
      for (let cy = Math.max(0, Math.floor(Math.min(ay, by) / CK)); cy <= Math.min(CH - 1, Math.floor(Math.max(ay, by) / CK)); cy++)
        for (let cx = Math.max(0, Math.floor(Math.min(ax, bx) / CK)); cx <= Math.min(CW - 1, Math.floor(Math.max(ax, bx) / CK)); cx++) M.ixLane[cy * CW + cx].push(ln);
    }
  }
  // 예전 마을(도로가 22칸 간격 격자)은 차선·가로등 목록을 여기서 만듦
  function legacyRoadInfo() {
    if (M.lanes) return;
    const W = M.W, H = M.H, RD = M.roads || [];
    M.lanes = []; M.lamps = [];
    for (const p of RD) { M.lanes.push([p + 1.5, 1, p + 1.5, H - 1]); M.lanes.push([1, p + 1.5, W - 1, p + 1.5]); }
    for (const px of RD) for (const py of RD) for (const [ox, oy] of [[-1, -1], [3, 3]]) {
      const x = px + ox, y = py + oy;
      if (x < 1 || y < 1 || x >= W - 1 || y >= H - 1 || M.t[y * W + x] !== DT.T.WALK) continue;
      M.lamps.push([x + .5, y + .5]);
    }
  }

  function buildScene() {
    view.innerHTML = '';
    const defs = el('defs', {}, view);
    // ---------- 질감 패턴 ----------
    const pr = DT.rng(99);
    // 바닥은 별도 SVG(#ground)에 그리고, 카메라 이동은 통째로 밀기만 함
    const gsv = $('ground'); gsv.innerHTML = '';
    const gdefs = el('defs', {}, gsv);
    L.gsv = gsv; L._gz = 0; L.reg = null;
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
    pattern('shopPat', 1, 1, '#b8b4a8', pt => { el('path', { d: 'M0 0H1M0 0V1', stroke: '#8e8a80', 'stroke-width': .03 }, pt); el('rect', { x: .06, y: .06, width: .4, height: .4, fill: '#c4c0b4', opacity: .6 }, pt); });
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
    pattern('waterPat', 3, 3, '#1c3642', pt => {
      let d = ''; for (let i = 0; i < 7; i++) { const x = pr() * 3, y = pr() * 3; d += `M${x.toFixed(2)} ${y.toFixed(2)}q.25 -.12 .5 0t.5 0`; }
      el('path', { d, stroke: '#3e6a7a', 'stroke-width': .05, fill: 'none', 'stroke-linecap': 'round' }, pt);
      let d2 = ''; for (let i = 0; i < 5; i++) d2 += circ(pr() * 3, pr() * 3, .05 + pr() * .08);
      el('path', { d: d2, fill: '#24424f' }, pt);
    });
    pattern('dirtPat', 1, 1, '#3e3222', pt => { el('path', { d: 'M0 .25H1M0 .75H1', stroke: '#2c2418', 'stroke-width': .12 }, pt); el('path', { d: 'M.1 .5h.2M.6 .5h.25', stroke: '#4e6a30', 'stroke-width': .08, 'stroke-linecap': 'round' }, pt); });
    pattern('concretePat', 1, 1, '#4a4a46', pt => { el('path', { d: 'M0 0H1M0 0V1', stroke: '#3a3a36', 'stroke-width': .03 }, pt); el('path', { d: 'M.2 .3l.25 .1M.6 .7l.2 -.15', stroke: '#565650', 'stroke-width': .025 }, pt); el('circle', { cx: .7, cy: .25, r: .04, fill: '#3e3e3a' }, pt); });
    pattern('walkPat', 1, 1, '#454541', pt => { el('path', { d: 'M0 0H1M0 0V1', stroke: '#2e2e2b', 'stroke-width': .045 }, pt); el('path', { d: 'M.2 .3l.1 .05M.6 .7l.12-.04', stroke: '#52524d', 'stroke-width': .03 }, pt); });

    L.world = el('g', {}, view);
    // 바닥 층: 0 바탕(잔디·도로·바닥) 1 바닥 장식 2 벽 3 문·창문 4 물건(차·가구·간판·가로등) 5 나무
    const gr = el('g', { 'shape-rendering': 'crispEdges' }, gsv);
    L.GL = [0, 1, 2, 3, 4, 5].map(() => el('g', {}, gr));
    L.snowG = el('g', { opacity: 0, 'pointer-events': 'none' }); gr.insertBefore(L.snowG, L.GL[1]); L._snowO = null; // 쌓인 눈 (바깥 칸만)
    L.chunks = new Map(); L.ckQ = []; L._ckR = null;
    L.cont = []; L.opEl = {}; L.lampEls = [];

    L.decals = el('g', {}, L.world);
    L.containers = el('g', {}, L.world);
    L.placed = el('g', {}, L.world);
    L.veh = el('g', {}, L.world); // 자동차
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
    L.lamps = el('g', { 'pointer-events': 'none' }, L.world); L._lop = L._fop = null;
    L.fires = el('g', { 'pointer-events': 'none' }, L.world);
    L.flash = el('rect', { x: -10, y: -10, width: M.W + 20, height: M.H + 20, fill: '#dfe8ff', opacity: 0, 'pointer-events': 'none' }, L.world);
    $('sky').innerHTML = ''; L.sky = el('g', {}, $('sky')); L.heliG = null; // 하늘 레이어 (헬기) — 안개 위에 그림
    L.tint = $('tint'); L.vign = null;
    L.threat = el('g', {}, $('sky')); // 뒤쪽 위협 화살표는 안개 위에 (가려지지 않게)
    L.arrows = [];
    for (let i = 0; i < 8; i++) L.arrows.push(el('path', { d: 'M13 0L-4 -9L0 0L-4 9Z', fill: '#c8141f', stroke: '#000', 'stroke-width': 1.5, opacity: 0 }, L.threat));
    L.dmg = [];
    for (let i = 0; i < 4; i++) L.dmg.push(el('path', { d: '', fill: '#c8141f', opacity: 0 }, L.threat));
    makePlayerG();
  }

  const SHOPC = { market: '#2a8a3a', pharmacy: '#1f9a8a', police: '#2a4a9a', hardware: '#c86a1a', gas: '#c8141f', firestation: '#e0301a', restaurant: '#d8a020', hunting: '#5a7a2a', sports: '#2a8ac8', bank: '#b89a4a', army: '#5a6a3a', hospital: '#e8e4dc', warehouse: '#8a7a5a', factory: '#7a6a5a', terminal: '#3a7ac8', prison: '#c86a1a' };
  const SHOW_SHOP_SIGN = false; // 건물 간판·이름 표시 (철물점 등) — 요청으로 끔
  function buildChunk(cx, cy) {
    const key = cy * M.CW + cx;
    if (L.chunks.has(key)) return;
    const T = DT.T, W = M.W, H = M.H;
    const x0 = cx * CK, y0 = cy * CK, x1 = Math.min(W, x0 + CK), y1 = Math.min(H, y0 + CK);
    const gl = L.GL.map(p => el('g', {}, p));
    if (L.snowG && !M.level) { const sd = runsPathR(v => v === T.GRASS || v === T.ROAD || v === T.CAR || v === T.WALK || v === T.DIRT || v === T.FENCE || v === T.TREE, x0, y0, x1, y1); if (sd) gl.push(el('path', { d: sd, fill: '#e4eaee' }, L.snowG)); }
    const ch = { key, cx, cy, gl, cont: [], lamps: [] };
    L.chunks.set(key, ch);
    const [g0, g1, g2, g3, g4, g5] = gl;
    const rr = ckRng(cx, cy, 1), area = (x1 - x0) * (y1 - y0) / 5184;
    const rX = () => x0 + rr() * (x1 - x0), rY = () => y0 + rr() * (y1 - y0);
    const at = (x, y) => M.t[Math.floor(y) * W + Math.floor(x)];
    const cnt = n => { const v = n * area; return Math.floor(v) + (rr() < v % 1 ? 1 : 0); };
    // ---- 0) 바탕 ----
    el('rect', { x: x0, y: y0, width: x1 - x0, height: y1 - y0, fill: 'url(#grassPat)' }, g0);
    let dp = '', dp2 = '';
    for (let i = cnt(380); i > 0; i--) dp += circ(rX(), rY(), .3 + rr() * .9);
    for (let i = cnt(160); i > 0; i--) dp2 += circ(rX(), rY(), .2 + rr() * .5);
    if (dp) el('path', { d: dp, fill: '#1f2618', 'fill-opacity': .8, 'shape-rendering': 'auto' }, g0);
    if (dp2) el('path', { d: dp2, fill: '#35402a', 'fill-opacity': .5, 'shape-rendering': 'auto' }, g0);
    const voidD = runsPathR(v => v === T.VOID, x0, y0, x1, y1);
    if (voidD) el('path', { d: voidD, fill: '#050505' }, g0);
    const dirtD = runsPathR(v => v === T.DIRT, x0, y0, x1, y1);
    if (dirtD) el('path', { d: dirtD, fill: 'url(#dirtPat)' }, g0);
    const waterD = runsPathR(v => v === T.WATER, x0, y0, x1, y1);
    if (waterD) {
      el('path', { d: waterD, fill: 'url(#waterPat)' }, g0);
      let shore = '';
      for (let y = Math.max(1, y0); y < Math.min(H - 1, y1); y++) for (let x = Math.max(1, x0); x < Math.min(W - 1, x1); x++) {
        if (M.t[y * W + x] !== T.WATER) continue;
        const dry = k => M.t[k] !== T.WATER;
        if (dry(y * W + x - 1)) shore += `M${x} ${y}v1`;
        if (dry(y * W + x + 1)) shore += `M${x + 1} ${y}v1`;
        if (dry((y - 1) * W + x)) shore += `M${x} ${y}h1`;
        if (dry((y + 1) * W + x)) shore += `M${x} ${y + 1}h1`;
      }
      if (shore) el('path', { d: shore, stroke: '#5a7a6a', 'stroke-width': .14, 'stroke-opacity': .7, fill: 'none', 'stroke-linecap': 'round', 'shape-rendering': 'auto' }, g0);
    }
    const roadD = runsPathR(v => v === T.ROAD || v === T.CAR, x0, y0, x1, y1);
    if (roadD) {
      el('path', { d: roadD, fill: 'url(#asphPat)' }, g0);
      let crack = '', patch = '';
      for (let i = cnt(220); i > 0; i--) {
        const x = rX(), y = rY();
        if (at(x, y) !== T.ROAD) continue;
        if (rr() < .25) { patch += `M${x.toFixed(2)} ${y.toFixed(2)}h${(.3 + rr() * .6).toFixed(2)}v${(.2 + rr() * .4).toFixed(2)}h${-(.3 + rr() * .5).toFixed(2)}z`; continue; }
        crack += `M${x.toFixed(2)} ${y.toFixed(2)}l${((rr() - .5) * .9).toFixed(2)} ${((rr() - .5) * .9).toFixed(2)}l${((rr() - .5) * .7).toFixed(2)} ${((rr() - .5) * .7).toFixed(2)}l${((rr() - .5) * .5).toFixed(2)} ${((rr() - .5) * .5).toFixed(2)}`;
      }
      if (patch) el('path', { d: patch, fill: '#222220', 'fill-opacity': .8 }, g0);
      if (crack) el('path', { d: crack, stroke: '#0b0b0a', 'stroke-width': .045, fill: 'none', 'shape-rendering': 'auto' }, g0);
    }
    const walkD = runsPathR(v => v === T.WALK, x0, y0, x1, y1);
    if (walkD) {
      el('path', { d: walkD, fill: 'url(#walkPat)' }, g0);
      let curb = '';
      const rd = v => v === T.ROAD || v === T.CAR;
      for (let y = Math.max(1, y0); y < Math.min(H - 1, y1); y++) for (let x = Math.max(1, x0); x < Math.min(W - 1, x1); x++) {
        if (M.t[y * W + x] !== T.WALK) continue;
        if (rd(M.t[y * W + x + 1])) curb += `M${x + .93} ${y}h.07v1h-.07z`;
        if (rd(M.t[y * W + x - 1])) curb += `M${x} ${y}h.07v1h-.07z`;
        if (rd(M.t[(y + 1) * W + x])) curb += `M${x} ${y + .93}h1v.07h-1z`;
        if (rd(M.t[(y - 1) * W + x])) curb += `M${x} ${y}h1v.07h-1z`;
      }
      if (curb) el('path', { d: curb, fill: '#6a6a64' }, g0);
    }
    // 차선 (조각 경계에서 점선 간격이 이어지도록 시작점을 맞춤) + 맨홀
    let lane = '', mh = '';
    for (const [ax, ay, bx, by] of M.ixLane[key]) {
      if (ax === bx) { const a = Math.max(ay, y0), b = Math.min(by, y1); if (b <= a) continue; const s = Math.ceil(a / 1.6) * 1.6; if (b > s) lane += `M${ax} ${s.toFixed(2)}V${b}`; if (rr() < .35) { const yy = a + rr() * (b - a); if (at(ax, yy) === T.ROAD) mh += circ(ax, yy, .28); } }
      else { const a = Math.max(ax, x0), b = Math.min(bx, x1); if (b <= a) continue; const s = Math.ceil(a / 1.6) * 1.6; if (b > s) lane += `M${s.toFixed(2)} ${ay}H${b}`; if (rr() < .35) { const xx = a + rr() * (b - a); if (at(xx, ay) === T.ROAD) mh += circ(xx, ay, .28); } }
    }
    if (lane) el('path', { d: lane, stroke: '#c9c3a8', 'stroke-width': .07, 'stroke-dasharray': '.7 .9', fill: 'none', 'stroke-opacity': .55 }, g0);
    if (mh) el('path', { d: mh, fill: '#2d2d2a', stroke: '#0e0e0d', 'stroke-width': .05, 'shape-rendering': 'auto' }, g0);
    // 활주로 표시 (가장자리 선 · 가운데 점선 · 끝 줄무늬)
    for (const [rx, ry, rw, rh] of (M.runways || [])) {
      const ax = Math.max(rx, x0), ay = Math.max(ry, y0), bx = Math.min(rx + rw, x1), by = Math.min(ry + rh, y1);
      if (bx <= ax || by <= ay) continue;
      let ed = '', ce = '', th = '';
      if (rw > rh) {
        for (const yy of [ry + .5, ry + rh - .5]) if (yy >= ay && yy <= by) ed += `M${ax} ${yy}H${bx}`;
        const cy2 = ry + rh / 2; if (cy2 >= ay && cy2 <= by) ce += `M${Math.ceil(ax / 4) * 4} ${cy2}H${bx}`;
        for (const ex of [rx + 2, rx + rw - 6]) if (ex + 4 > ax && ex < bx) for (let k = 1; k < rh - 1; k += 1.5) { const yy = ry + k; if (yy >= ay && yy < by) th += `M${Math.max(ex, ax)} ${yy}H${Math.min(ex + 4, bx)}`; }
      } else {
        for (const xx of [rx + .5, rx + rw - .5]) if (xx >= ax && xx <= bx) ed += `M${xx} ${ay}V${by}`;
        const cx2 = rx + rw / 2; if (cx2 >= ax && cx2 <= bx) ce += `M${cx2} ${Math.ceil(ay / 4) * 4}V${by}`;
        for (const ey of [ry + 2, ry + rh - 6]) if (ey + 4 > ay && ey < by) for (let k = 1; k < rw - 1; k += 1.5) { const xx = rx + k; if (xx >= ax && xx < bx) th += `M${xx} ${Math.max(ey, ay)}V${Math.min(ey + 4, by)}`; }
      }
      if (ed) el('path', { d: ed, stroke: '#d8d4c4', 'stroke-width': .14, fill: 'none', 'stroke-opacity': .8 }, g0);
      if (ce) el('path', { d: ce, stroke: '#e8e4d4', 'stroke-width': .22, 'stroke-dasharray': '2 2', fill: 'none', 'stroke-opacity': .8 }, g0);
      if (th) el('path', { d: th, stroke: '#e8e4d4', 'stroke-width': .5, fill: 'none', 'stroke-opacity': .75 }, g0);
    }
    // 실내 바닥
    const floorD = runsPathR(v => v === T.FLOOR || v === T.DOOR || v === T.STAIRS, x0, y0, x1, y1);
    if (floorD) el('path', { d: floorD, fill: 'url(#floorPat)' }, g0);
    for (const hi of M.ixHouseAll[key]) {
      const h = M.houses[hi], st = houseStyle(h, hi);
      if (st.floor === 'floorPat') continue;
      const ax = Math.max(h.x + 1, x0), ay = Math.max(h.y + 1, y0), bx = Math.min(h.x + h.w - 1, x1), by = Math.min(h.y + h.h - 1, y1);
      if (bx > ax && by > ay) el('rect', { x: ax, y: ay, width: bx - ax, height: by - ay, fill: `url(#${st.floor})` }, g0);
    }
    // ---- 1) 바닥 장식: 부엌 타일·러그 / 벽 밑 그늘 / 쓰레기·종이·핏자국 / 소품 ----
    for (const hi of M.ixHouse[key]) {
      const h = M.houses[hi], st = houseStyle(h, hi);
      if (st.kitchen) { const c0 = M.containers[h.containers[0]]; if (c0) el('rect', { x: Math.max(h.x + 1, c0.x - 1), y: Math.max(h.y + 1, c0.y - 1), width: 2.5, height: 2.5, fill: 'url(#checkPat)', 'fill-opacity': .9 }, g1); }
      if (h.shop) continue;
      if (st.deco < .3) el('rect', { x: h.x + 1, y: h.y + 1, width: Math.min(3, h.w - 2), height: h.h - 2, fill: 'url(#tilePat)', 'fill-opacity': .9 }, g1);
      else if (st.rw) {
        el('rect', { x: st.rx, y: st.ry, width: st.rw, height: st.rh, fill: st.rc, stroke: '#1a1a1a', 'stroke-width': .04, 'fill-opacity': .9, 'stroke-opacity': .9 }, g1);
        el('rect', { x: st.rx + .12, y: st.ry + .12, width: st.rw - .24, height: st.rh - .24, fill: 'none', stroke: '#c9b98f', 'stroke-width': .04, 'stroke-opacity': .5 }, g1);
      }
    }
    let ao = '';
    const isW = v => v === T.WALL || v === T.WINDOW;
    if (floorD) for (let y = Math.max(1, y0); y < Math.min(H - 1, y1); y++) for (let x = Math.max(1, x0); x < Math.min(W - 1, x1); x++) {
      if (M.t[y * W + x] !== T.FLOOR) continue;
      const w = (xx, yy) => isW(M.t[yy * W + xx]);
      if (w(x, y - 1)) ao += `M${x} ${y}h1v.16h-1z`;
      if (w(x - 1, y)) ao += `M${x} ${y}h.16v1h-.16z`;
      if (w(x, y + 1)) ao += `M${x} ${y + .92}h1v.08h-1z`;
      if (w(x + 1, y)) ao += `M${x + .92} ${y}h.08v1h-.08z`;
    }
    if (ao) el('path', { d: ao, fill: '#000', 'fill-opacity': .28 }, g1);
    let trash = '', paper = '', blood = '';
    for (let i = cnt(260); i > 0; i--) {
      const x = rX(), y = rY(), tt = at(x, y), k = rr();
      if (tt === T.GRASS && !M.world && k < .3) { trash += circ(x, y, .16 + rr() * .08) + circ(x + .18, y + .06, .13); }
      else if (tt === T.WALK && k < .3) { trash += circ(x, y, .16 + rr() * .08) + circ(x + .18, y + .06, .13); }
      else if (tt !== T.WALL && tt !== T.TREE && tt !== T.CAR && (tt !== T.GRASS || !M.world) && k < .75) { const a = rr() * 3; paper += `M${x.toFixed(2)} ${y.toFixed(2)}l${(Math.cos(a) * .22).toFixed(2)} ${(Math.sin(a) * .22).toFixed(2)}l${(-Math.sin(a) * .16).toFixed(2)} ${(Math.cos(a) * .16).toFixed(2)}l${(-Math.cos(a) * .22).toFixed(2)} ${(-Math.sin(a) * .22).toFixed(2)}z`; }
      else if ((tt === T.ROAD || tt === T.WALK || tt === T.FLOOR) && k < .9) { blood += circ(x, y, .1 + rr() * .25); if (rr() < .5) blood += `M${x.toFixed(2)} ${y.toFixed(2)}l${((rr() - .5) * 2).toFixed(2)} ${((rr() - .5) * 2).toFixed(2)}`; }
    }
    if (trash) el('path', { d: trash, fill: '#101410', stroke: '#050605', 'stroke-width': .03, 'shape-rendering': 'auto' }, g1);
    if (paper) el('path', { d: paper, fill: '#b9b3a0', 'fill-opacity': .55, 'stroke-opacity': .55 }, g1);
    if (blood) el('path', { d: blood, fill: '#3a0508', stroke: '#3a0508', 'stroke-width': .12, 'stroke-linecap': 'round', 'fill-opacity': .7, 'stroke-opacity': .7, 'shape-rendering': 'auto' }, g1);
    drawPropsR(g1, x0, y0, x1, y1, ckRng(cx, cy, 2), key);
    // 계단: 디딤판 줄 + 난간
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) if (M.t[y * W + x] === T.STAIRS) {
      el('rect', { x: x + .06, y: y + .06, width: .88, height: .88, fill: '#6a5a44', stroke: '#1a140c', 'stroke-width': .05 }, g1);
      el('path', { d: `M${x + .1} ${y + .26}h.8M${x + .1} ${y + .44}h.8M${x + .1} ${y + .62}h.8M${x + .1} ${y + .8}h.8`, stroke: '#3a2e20', 'stroke-width': .06 }, g1);
      el('path', { d: `M${x + .12} ${y + .12}V${y + .88}M${x + .88} ${y + .12}V${y + .88}`, stroke: '#c8b890', 'stroke-width': .06 }, g1);
      el('path', { d: `M${x + .5} ${y + .7}l-.16 -.2h.1v-.3h.12v.3h.1z`, fill: '#e8d9a0' }, g1); // 방향 표시
    }
    let stump = '';
    for (const k of (G.chopped || [])) { const x = k % W, y = (k / W) | 0; if (x >= x0 && x < x1 && y >= y0 && y < y1) stump += circ(x + .5, y + .5, .17); }
    if (stump) { el('path', { d: stump, fill: '#6a4a2a', stroke: '#2a1a0c', 'stroke-width': .04, 'shape-rendering': 'auto' }, g1); }
    // ---- 2) 벽: 그림자 → 벽면 → 윗면 → 얼룩 → 외곽선, 문틀 ----
    const wallD = runsPathR(isW, x0, y0, x1, y1);
    if (wallD) {
      el('path', { d: wallD, fill: '#000', transform: 'translate(.12 .14)', 'fill-opacity': .5 }, g2);
      el('path', { d: wallD, fill: '#cfc8b8' }, g2);
      el('path', { d: wallD, fill: '#e2dccf', transform: 'translate(-.04 -.05)' }, g2);
      let wstain = '';
      for (let i = cnt(500); i > 0; i--) { const x = rX(), y = rY(); if (isW(at(x, y))) wstain += circ(x, y, .04 + rr() * .1); }
      if (wstain) el('path', { d: wstain, fill: '#8a8272', 'fill-opacity': .35, 'shape-rendering': 'auto' }, g2);
      let edge = '';
      for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
        if (!isW(M.t[y * W + x])) continue;
        const o = (xx, yy) => xx < 0 || yy < 0 || xx >= W || yy >= H || !isW(M.t[yy * W + xx]);
        if (o(x, y - 1)) edge += `M${x} ${y}h1`;
        if (o(x, y + 1)) edge += `M${x} ${y + 1}h1`;
        if (o(x - 1, y)) edge += `M${x} ${y}v1`;
        if (o(x + 1, y)) edge += `M${x + 1} ${y}v1`;
      }
      el('path', { d: edge, stroke: '#171614', 'stroke-width': .06, fill: 'none' }, g2);
    }
    // 다리 난간 (물과 맞닿은 도로 가장자리)
    if (waterD || roadD) {
      let rail = '';
      for (let y = Math.max(1, y0); y < Math.min(H - 1, y1); y++) for (let x = Math.max(1, x0); x < Math.min(W - 1, x1); x++) {
        const v = M.t[y * W + x]; if (v !== T.ROAD && v !== T.CAR) continue;
        const wt = k => M.t[k] === T.WATER;
        if (wt(y * W + x - 1)) rail += `M${x + .06} ${y}v1`;
        if (wt(y * W + x + 1)) rail += `M${x + .94} ${y}v1`;
        if (wt((y - 1) * W + x)) rail += `M${x} ${y + .06}h1`;
        if (wt((y + 1) * W + x)) rail += `M${x} ${y + .94}h1`;
      }
      if (rail) { el('path', { d: rail, stroke: '#000', 'stroke-width': .22, 'stroke-opacity': .5, fill: 'none', transform: 'translate(.08 .1)' }, g2); el('path', { d: rail, stroke: '#9a968a', 'stroke-width': .16, fill: 'none' }, g2); }
    }
    let door = '';
    const isWallish = (x, y) => { const v = M.t[y * W + x]; return v === T.WALL || v === T.WINDOW || v === T.DOOR; };
    for (const o of M.ixOp[key]) if (o.type === 'door') door += o.horiz ? `M${o.x} ${o.y}h.1v1h-.1zM${o.x + .9} ${o.y}h.1v1h-.1z` : `M${o.x} ${o.y}h1v.1h-1zM${o.x} ${o.y + .9}h1v.1h-1z`;
    if (door) el('path', { d: door, fill: '#6e4524' }, g2);
    // ---- 3) 문·창문 (상태에 따라 바뀜) ----
    ch.opG = el('g', { 'shape-rendering': 'auto' }, g3);
    for (const o of M.ixOp[key]) drawOpening(o);
    // ---- 4) 물건: 폐차·실내가구·간판·가로등 ----
    for (const i of M.ixCar[key]) drawCar(g4, M.cars[i]);
    for (const i of M.ixDecor[key]) if (!(G.rmDecor && G.rmDecor.has(i))) drawDecor(g4, M.decor[i]);
    for (const sh of (SHOW_SHOP_SIGN ? M.ixShop[key] : [])) { // 건물 간판 (지금은 끔)
      const sw = Math.max(2.8, sh.name.length * .5 + .4), [dx, dy] = sh.door, sx = dx + .5 - sw / 2, sy = dy + 1.15, c = SHOPC[sh.kind] || '#888';
      el('rect', { x: sx + .06, y: sy + .08, width: sw, height: .8, fill: '#000', 'fill-opacity': .4 }, g4);
      el('rect', { x: sx, y: sy, width: sw, height: .8, rx: .06, fill: '#141414', stroke: c, 'stroke-width': .09 }, g4);
      if (sh.kind === 'pharmacy') el('path', { d: `M${sx + .38} ${sy + .22}h.16v.14h.14v.16h-.14v.14h-.16v-.14h-.14v-.16h.14z`, fill: c }, g4);
      const tx = el('text', { x: sx + sw / 2 + (sh.kind === 'pharmacy' ? .15 : 0), y: sy + .56, 'text-anchor': 'middle', 'font-size': .46, 'font-weight': 700, fill: '#f2eee4', 'font-family': 'sans-serif' }, g4);
      tx.textContent = sh.name;
    }
    if (M.ixLamp[key].length) {
      let pole = '', bulb = '';
      for (const [x, y] of M.ixLamp[key]) { pole += circ(x, y, .16); bulb += circ(x, y, .07); }
      el('path', { d: pole, fill: '#2b2b28', stroke: '#0c0c0b', 'stroke-width': .05, 'shape-rendering': 'auto' }, g4);
      el('path', { d: bulb, fill: '#e8d9a0', 'shape-rendering': 'auto' }, g4);
      for (const [x, y] of M.ixLamp[key]) ch.lamps.push(el('circle', { cx: x, cy: y, r: 3.2, fill: 'url(#lampGlow)', 'fill-opacity': L._lop || 0 }, L.lamps));
    }
    // 봉쇄 철책: 기둥 + 철망 (옆·아래 철책과 잇고, 계단 모양은 대각선으로)
    {
      let post = '', wire = '', warn = '';
      const isF = (x, y) => x >= 0 && y >= 0 && x < W && y < H && M.t[y * W + x] === T.FENCE;
      for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
        if (!isF(x, y)) continue;
        post += circ(x + .5, y + .5, .09);
        if (isF(x + 1, y)) wire += `M${x + .5} ${y + .5}h1`;
        if (isF(x, y + 1)) wire += `M${x + .5} ${y + .5}v1`;
        if (isF(x + 1, y + 1) && !isF(x + 1, y) && !isF(x, y + 1)) wire += `M${x + .5} ${y + .5}l1 1`;
        if (isF(x - 1, y + 1) && !isF(x - 1, y) && !isF(x, y + 1)) wire += `M${x + .5} ${y + .5}l-1 1`;
        if (((x * 7 + y * 13) % 29) === 0) warn += `M${x + .25} ${y + .3}h.5v.3h-.5z`;
      }
      if (post) {
        el('path', { d: wire, stroke: '#000', 'stroke-width': .16, 'stroke-opacity': .4, fill: 'none', transform: 'translate(.1 .12)' }, g4);
        el('path', { d: wire, stroke: '#9aa0a4', 'stroke-width': .1, fill: 'none', 'stroke-dasharray': '.08 .06' }, g4);
        el('path', { d: wire, stroke: '#c8ccd0', 'stroke-width': .025, fill: 'none', transform: 'translate(0 -.12)' }, g4); // 윗줄 철조망
        el('path', { d: post, fill: '#4a4e52', stroke: '#1a1c1e', 'stroke-width': .03 }, g4);
        if (warn) el('path', { d: warn, fill: '#c8a020', stroke: '#1a1a1a', 'stroke-width': .03 }, g4);
      }
    }
    for (const sg of (M.signs || [])) {
      if (sg.x < x0 || sg.x >= x1 || sg.y < y0 || sg.y >= y1) continue;
      const w = sg.text.length * .42 + .5, sx = sg.x + .5 - w / 2, sy = sg.y;
      el('rect', { x: sg.x + .44, y: sy + .6, width: .12, height: .6, fill: '#3a3a36' }, g4);
      el('rect', { x: sx + .08, y: sy + .1, width: w, height: .7, fill: '#000', 'fill-opacity': .4 }, g4);
      el('rect', { x: sx, y: sy, width: w, height: .7, rx: .05, fill: '#e8d020', stroke: '#1a1a1a', 'stroke-width': .06 }, g4);
      const tx = el('text', { x: sg.x + .5, y: sy + .5, 'text-anchor': 'middle', 'font-size': .4, 'font-weight': 800, fill: '#141414', 'font-family': 'sans-serif' }, g4);
      tx.textContent = sg.text;
    }
    // ---- 5) 나무: 그림자 + 3겹 잎 + 하이라이트 ----
    let tsh = '', t1 = '', t2 = '', t3 = '', tdot = '', thl = '';
    const tr = ckRng(cx, cy, 3);
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
      if (M.t[y * W + x] !== T.TREE) continue;
      const r = SPEC.treeR[0] + tr() * (SPEC.treeR[1] - SPEC.treeR[0]), ccx = x + .5 + (tr() - .5) * .12, ccy = y + .5 + (tr() - .5) * .12;
      tsh += circ(ccx + .16, ccy + .2, r);
      t1 += circ(ccx, ccy, r);
      t2 += circ(ccx - r * .22, ccy - r * .18, r * .62) + circ(ccx + r * .28, ccy + r * .1, r * .5);
      t3 += circ(ccx - r * .32, ccy - r * .3, r * .26);
      for (let j = 0; j < 7; j++) { const a = tr() * 6.28, d = tr() * .42; tdot += circ(x + .5 + Math.cos(a) * d, y + .5 + Math.sin(a) * d, .04 + tr() * .04); }
      thl += `M${x + .18} ${y + .32}a.36 .36 0 0 1 .32 -.22`;
    }
    if (t1) {
      const tg = el('g', { 'shape-rendering': 'auto' }, g5);
      el('path', { d: tsh, fill: '#000', 'fill-opacity': .45 }, tg);
      el('path', { d: t1, fill: '#15200f', stroke: '#0a0f07', 'stroke-width': .05 }, tg);
      el('path', { d: t2, fill: '#223219' }, tg);
      el('path', { d: t3, fill: '#35492a', 'fill-opacity': .8 }, tg);
      el('path', { d: tdot, fill: '#0c1508', 'fill-opacity': .7 }, tg);
      el('path', { d: thl, stroke: '#4e6a38', 'stroke-width': .05, fill: 'none', 'stroke-linecap': 'round', 'stroke-opacity': .7 }, tg);
    }
    for (const g of gl) flattenOpacity(g);
    // ---- 수색 가구 (월드 층) ----
    for (const i of M.ixCont[key]) {
      if (G.removed.has(i)) continue;
      const c = M.containers[i];
      const g = el('g', { transform: c.car ? `translate(${c.x + (c.cw - 1) / 2} ${c.y + (c.ch - 1) / 2})` : `translate(${c.x} ${c.y})` }, L.containers);
      g._seed = i;
      if (!c.car) drawFurniture(g, c.kind);
      const x = el('path', { d: 'M.3 .3L.7 .7M.7 .3L.3 .7', stroke: '#c8141f', 'stroke-width': .07, 'stroke-linecap': 'round', opacity: 0 }, g);
      L.cont[i] = { g, x };
      ch.cont.push(i);
      refreshContainer(i);
    }
  }
  function dropChunk(ch) {
    for (const g of ch.gl) g.remove();
    for (const i of ch.cont) { const c = L.cont[i]; if (c) c.g.remove(); delete L.cont[i]; }
    for (const o of M.ixOp[ch.key]) delete L.opEl[o.k];
    for (const e of ch.lamps) e.remove();
    L.chunks.delete(ch.key);
  }
  // 나무를 베거나 가구를 들어내면 그 조각만 다시 그림
  function rebuildChunkAt(x, y) {
    if (!L.chunks) return;
    const key = M.ckOf(x, y), ch = L.chunks.get(key);
    if (ch) { dropChunk(ch); buildChunk(ch.cx, ch.cy); }
  }
  // 화면(+여유 16칸) 안 조각은 그리고, 멀리(+32칸) 벗어난 조각은 지움
  function updateChunks(camX, camY, force) {
    const vx0 = -camX / ZOOM, vy0 = -camY / ZOOM, vx1 = vx0 + VW / ZOOM, vy1 = vy0 + VH / ZOOM;
    const cr = (a, m, max) => clamp(Math.floor((a + m) / CK), 0, max - 1);
    // 운전 중엔 가는 방향으로 더 멀리 미리 그림
    const car = G.p.inCar != null && G.vehicles && !G.lv ? G.vehicles[G.p.inCar] : null;
    const lead = car ? Math.min(3, Math.abs(car.v) / 3) * CK : 0, lx = car ? Math.cos(car.a) * Math.sign(car.v || 1) * lead : 0, ly = car ? Math.sin(car.a) * Math.sign(car.v || 1) * lead : 0;
    const n0x = cr(vx0 + Math.min(0, lx), -CK, M.CW), n1x = cr(vx1 + Math.max(0, lx), CK, M.CW), n0y = cr(vy0 + Math.min(0, ly), -CK, M.CH), n1y = cr(vy1 + Math.max(0, ly), CK, M.CH);
    const rk = n0x + ',' + n1x + ',' + n0y + ',' + n1y;
    if (force || rk !== L._ckR) {
      L._ckR = rk;
      const k0x = cr(vx0 + Math.min(0, lx), -2 * CK, M.CW), k1x = cr(vx1 + Math.max(0, lx), 2 * CK, M.CW), k0y = cr(vy0 + Math.min(0, ly), -2 * CK, M.CH), k1y = cr(vy1 + Math.max(0, ly), 2 * CK, M.CH);
      for (const ch of [...L.chunks.values()]) if (ch.cx < k0x || ch.cx > k1x || ch.cy < k0y || ch.cy > k1y) dropChunk(ch);
      L.ckQ = [];
      const pcx = (vx0 + vx1) / 2 / CK, pcy = (vy0 + vy1) / 2 / CK;
      for (let cy = n0y; cy <= n1y; cy++) for (let cx = n0x; cx <= n1x; cx++) if (!L.chunks.has(cy * M.CW + cx)) L.ckQ.push([cx, cy, Math.hypot(cx + .5 - pcx, cy + .5 - pcy)]);
      L.ckQ.sort((a, b) => b[2] - a[2]); // 가까운 조각을 맨 뒤에 (pop)
    }
    // 실제 화면에 걸친 조각은 바로, 나머지는 한 프레임에 하나씩 미리 그림
    const v0x = Math.floor((vx0 - 1) / CK), v1x = Math.floor((vx1 + 1) / CK), v0y = Math.floor((vy0 - 1) / CK), v1y = Math.floor((vy1 + 1) / CK);
    // 미리 그리기는 한 프레임에 약 4ms까지만 (가까운 조각부터)
    const tEnd = performance.now() + (force ? 1e9 : car ? 5 : 3);
    let built = 0;
    for (let i = L.ckQ.length - 1; i >= 0; i--) {
      const [cx, cy] = L.ckQ[i];
      const onScreen = cx >= v0x && cx <= v1x && cy >= v0y && cy <= v1y;
      if (onScreen || !built || performance.now() < tEnd) { built++; L.ckQ.splice(i, 1); buildChunk(cx, cy); }
    }
    // 바닥 SVG는 화면 주변 128x96칸 창으로만 (아주 큰 그림 한 장이 되지 않게)
    const zs = (OPTS.zoom || 1) * (L.dz || 1) * (L.cz || 1), RW = L.dz < 1 ? 176 : 128, RH = L.dz < 1 ? 128 : 96, Z0 = Math.round(ZOOM / zs * 100) / 100; // 확대·축소는 CSS 배율로만 (바닥을 다시 그리지 않음)
    let R = L.reg;
    if (!R || R.rw !== RW || vx0 < R.x + 2 || vy0 < R.y + 2 || vx1 > R.x + RW - 2 || vy1 > R.y + RH - 2) {
      R = L.reg = { rw: RW, x: Math.floor(((vx0 + vx1) / 2 - RW / 2) / CK) * CK, y: Math.floor(((vy0 + vy1) / 2 - RH / 2) / CK) * CK };
      L.gsv.setAttribute('viewBox', `${R.x} ${R.y} ${RW} ${RH}`);
      L._gz = 0;
    }
    if (L._gz !== Z0 + ':' + RW) { L._gz = Z0 + ':' + RW; L.gsv.setAttribute('width', (RW * Z0).toFixed(1)); L.gsv.setAttribute('height', (RH * Z0).toFixed(1)); }
    L.gsv.style.transform = `translate3d(${(camX + R.x * ZOOM).toFixed(1)}px,${(camY + R.y * ZOOM).toFixed(1)}px,0) scale(${(ZOOM / Z0).toFixed(4)})`;
  }

  // 미니맵 + 전체지도
  // 12x12칸 조각 그룹 (화면 밖 조각은 통째로 건너뛰고 그림)
  function chunker(parent) {
    const m = new Map();
    return (x, y) => { const k = ((x / 12) | 0) + ',' + ((y / 12) | 0); let g = m.get(k); if (!g) m.set(k, g = el('g', {}, parent)); return g; };
  }
  // 도형마다 붙은 opacity(투명도)는 그릴 때마다 따로 합성돼서 느림 → 채우기/선 투명도로 바꿈 (보이는 모습은 거의 같음)
  function flattenOpacity(root) {
    for (const e of root.querySelectorAll('[opacity]')) {
      if (e.tagName === 'g' || e.closest('pattern,defs')) continue;
      const o = +e.getAttribute('opacity');
      e.removeAttribute('opacity');
      e.setAttribute('fill-opacity', +(o * +(e.getAttribute('fill-opacity') || 1)).toFixed(3));
      e.setAttribute('stroke-opacity', +(o * +(e.getAttribute('stroke-opacity') || 1)).toFixed(3));
    }
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
  function initFog(seen) {
    const N = M.W * M.H;
    G.seen = seen && seen.length === N ? seen : new Float32Array(N).fill(-1e9);
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
  const encExp = () => encExpArr(G.exp);
  function encExpArr(E) {
    if (!E) return null;
    let out = '', run = 0, cur = 0; // 연속 길이 인코딩: "길이,길이,..." (0부터 시작)
    const a = [];
    for (let i = 0; i < E.length; i++) { if (E[i] === cur) run++; else { a.push(run); run = 1; cur = E[i]; } }
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
    if (moved || L._ff % (OPTS.perf ? 8 : 4) === 0) { // 안개 그림은 4프레임마다 (또는 칸이 바뀔 때) 다시 그림 (성능 모드 8)
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
      if (!OPTS.perf) {
      ctx.save();
      ctx.globalCompositeOperation = 'source-atop'; ctx.globalAlpha = nk;
      const sc = ZOOM / 18, T = 256 * sc;
      const ox = ((-(x0 * ZOOM) + now * 6) % T + T) % T - T, oy = ((-(y0 * ZOOM) + now * 2.5) % T + T) % T - T;
      ctx.translate(ox, oy); ctx.scale(sc, sc);
      ctx.fillStyle = L.fogPat; ctx.fillRect(0, 0, PW / sc + 512, PH / sc + 512);
      ctx.restore();
      }
    }
    cv.style.transform = `translate3d(${(camX + x0 * ZOOM).toFixed(1)}px,${(camY + y0 * ZOOM).toFixed(1)}px,0)`;
    // 지도: 가본 곳만 보이게 (1초마다)
    L.expT = (L.expT || 0) - dt;
    if (G.expDirty && L.expT <= 0) { L.expT = M.W > 1500 ? 3 : M.W > 300 ? 2 : 1; G.expDirty = false; updateMapMask(); }
  }
  function updateMapMask() {
    if (!L.mini) return;
    const W = M.W, H = M.H, f = W > 1024 ? 2 : 1, IW = Math.ceil(W / f), IH = Math.ceil(H / f);
    const c = L.maskCv || (L.maskCv = document.createElement('canvas'));
    if (c.width !== IW) { c.width = IW; c.height = IH; }
    const x = c.getContext('2d'), img = x.createImageData(IW, IH), d = img.data, E = G.exp;
    if (f === 1) for (let i = 0; i < W * H; i++) { const o = i * 4; d[o] = 11; d[o + 1] = 12; d[o + 2] = 10; d[o + 3] = E[i] ? 0 : 255; }
    else for (let yy = 0; yy < IH; yy++) for (let xx = 0; xx < IW; xx++) { const k = yy * f * W + xx * f, o = (yy * IW + xx) * 4; d[o] = 11; d[o + 1] = 12; d[o + 2] = 10; d[o + 3] = (E[k] || E[k + 1] || E[k + W] || E[k + W + 1]) ? 0 : 255; }
    x.putImageData(img, 0, 0);
    // data URL 대신 Blob 주소 (아이폰에서 깜빡임·메모리 누적 방지), 이전 주소는 해제
    const Mx = M, apply = url => { const old = Mx._maskURL; Mx._maskURL = url; if (M === Mx) for (const m of [L.mini, L.big]) if (m) m.mask.setAttribute('href', url); if (old && old !== url && old.startsWith('blob:')) URL.revokeObjectURL(old); };
    if (c.toBlob && window.URL && URL.createObjectURL) c.toBlob(bl => { if (bl) apply(URL.createObjectURL(bl)); }); else apply(c.toDataURL());
  }
  // 멀리 있는 가구·가로등 불빛은 그리지 않음 (큰 맵 성능)
  function cullWorld(force) {
    const p = G.p;
    if (!force && L._cx != null && Math.abs(p.x - L._cx) + Math.abs(p.y - L._cy) < 3) return;
    L._cx = p.x; L._cy = p.y;
    const RX = Math.max(20, VW / 2 / ZOOM + 4), RY = Math.max(16, VH / 2 / ZOOM + 4);
    const near = (x, y) => Math.abs(x - p.x) < RX && Math.abs(y - p.y) < RY;
    for (const c of G.corpses) { const on = near(c.x, c.y); if (c.g._on !== on) { c.g._on = on; c.g.style.display = on ? '' : 'none'; } }
  }
  // 지도 바탕은 칸 1개 = 점 몇 개짜리 그림 한 장 (큰 세계에서도 가벼움)
  function mapBaseURL(cb) {
    const T = DT.T, W = M.W, H = M.H, s = Math.max(1, Math.floor(640 / W));
    const f = W > 1024 ? 2 : 1, IW = Math.ceil(W / f), IH = Math.ceil(H / f); // 아주 큰 세계는 2x2칸을 점 하나로
    const c = document.createElement('canvas'); c.width = IW * s; c.height = IH * s;
    const x = c.getContext('2d'), img = x.createImageData(IW, IH), d = img.data;
    const COL = { [T.ROAD]: [62, 62, 58], [T.CAR]: [62, 62, 58], [T.WALK]: [43, 44, 40], [T.FLOOR]: [90, 72, 52], [T.DOOR]: [90, 72, 52], [T.WALL]: [216, 210, 193], [T.WINDOW]: [216, 210, 193], [T.TREE]: M.world ? [19, 30, 15] : [23, 26, 19], [T.WATER]: [40, 84, 108], [T.FENCE]: [200, 200, 196], [T.DIRT]: [74, 60, 40] };
    const PRI = { [T.WALL]: 9, [T.WINDOW]: 9, [T.FENCE]: 8, [T.FLOOR]: 7, [T.DOOR]: 7, [T.ROAD]: 6, [T.CAR]: 6, [T.WATER]: 5, [T.WALK]: 4, [T.DIRT]: 3, [T.TREE]: 2 };
    for (let yy = 0; yy < IH; yy++) for (let xx = 0; xx < IW; xx++) {
      let v = M.t[(yy * f) * W + xx * f];
      if (f > 1) for (const [a, b] of [[1, 0], [0, 1], [1, 1]]) { const tx = xx * f + a, ty = yy * f + b; if (tx < W && ty < H) { const u = M.t[ty * W + tx]; if ((PRI[u] || 0) > (PRI[v] || 0)) v = u; } }
      const cl = COL[v] || [23, 26, 19], o = (yy * IW + xx) * 4; d[o] = cl[0]; d[o + 1] = cl[1]; d[o + 2] = cl[2]; d[o + 3] = 255;
    }
    const t = document.createElement('canvas'); t.width = IW; t.height = IH; t.getContext('2d').putImageData(img, 0, 0);
    x.imageSmoothingEnabled = false; x.drawImage(t, 0, 0, IW * s, IH * s);
    if (s >= 3) { x.fillStyle = '#fff'; M.containers.forEach((cn, i) => { if (!G.removed.has(i)) x.fillRect((cn.x + .2) * s, (cn.y + .2) * s, Math.max(1, .6 * s), Math.max(1, .6 * s)); }); }
    if (c.toBlob && window.URL && URL.createObjectURL) c.toBlob(bl => cb(bl ? URL.createObjectURL(bl) : c.toDataURL())); else cb(c.toDataURL());
  }
  function buildMaps() {
    const make = (svg, big) => {
      svg.innerHTML = '';
      el('rect', { x: 0, y: 0, width: M.W, height: M.H, fill: '#171a13' }, svg);
      const base = el('image', { x: 0, y: 0, width: M.W, height: M.H, preserveAspectRatio: 'none', style: 'image-rendering:pixelated' }, svg);
      if (big) {
        if (SHOW_SHOP_SIGN) for (const sh of (M.shops || [])) { const t = el('text', { x: sh.x + sh.w / 2, y: sh.y + sh.h / 2 + .8, 'text-anchor': 'middle', 'font-size': 2.4, 'font-weight': 700, fill: '#f2eee4', stroke: '#000', 'stroke-width': .35, 'paint-order': 'stroke', 'font-family': 'sans-serif' }, svg); t.textContent = sh.name; }
      }
      const mask = el('image', { x: 0, y: 0, width: M.W, height: M.H, preserveAspectRatio: 'none' }, svg); // 안 가본 곳 가림
      const tl = el('g', {}, svg); // 도시 이름 (가본 도시만)
      const mk = el('g', {}, svg); // 내가 찍은 표시
      const pm = el('g', {}, svg);
      if (big) el('circle', { r: 2.2, fill: 'none', stroke: '#c8141f', 'stroke-width': .35 }, pm);
      el('path', { d: 'M1.6 0L-1 -1.1L-.4 0L-1 1.1Z', fill: '#c8141f', stroke: '#000', 'stroke-width': .2, transform: big ? 'scale(1.1)' : 'scale(.9)' }, pm);
      return { base, pm, mask, tl, big, mk };
    };
    L.mini = make($('mini'), false);
    L.big = make($('bigmapSvg'), true);
    L.mapDirty = false;
    if (G) drawMarks();
    const Mx = M, setBase = url => { for (const m of [L.mini, L.big]) m.base.setAttribute('href', url); };
    if (Mx._baseURL) setBase(Mx._baseURL); // 한 번 그린 지도 바탕은 다시 씀 (층 이동 때 빠르게)
    else mapBaseURL(url => { Mx._baseURL = url; if (M === Mx) setBase(url); });
    if (Mx._maskURL) { for (const m of [L.mini, L.big]) m.mask.setAttribute('href', Mx._maskURL); G.expDirty = true; L.expT = .5; }
    else if (G.exp) updateMapMask();
  }
  // 도시 이름: 그 도시를 조금이라도 가봤으면 큰 지도에 표시
  function updateTownLabels() {
    if (!M.towns || !L.big || M.level) return;
    const g = L.big.tl; g.innerHTML = '';
    for (const t of M.towns) {
      if (!t.name) continue;
      let seen = false;
      for (let y = t.y + 2; y < t.y + t.h && !seen; y += 4) for (let x = t.x + 2; x < t.x + t.w; x += 4) if (G.exp[y * M.W + x]) { seen = true; break; }
      if (!seen) continue;
      const fs = Math.max(t.w / 12, (L._bigSize || 200) / 34);
      const e = el('text', { x: t.x + t.w / 2, y: t.y - fs * .35, 'text-anchor': 'middle', 'font-size': fs, 'font-weight': 800, fill: t.kind === 'army' ? '#b8c890' : '#ffe08a', stroke: '#000', 'stroke-width': fs * .14, 'paint-order': 'stroke', 'font-family': 'sans-serif' }, g);
      e.textContent = (L._bigSize || 0) > 600 ? t.name : t.name + ' · ' + t.label;
    }
  }
  // 지도 아이템: 도시 지도 = 그 도시 전체, 카운티 도로 지도 = 도로·강 (프로젝트 좀보이드처럼 읽으면 지도에 채워짐)
  function mapFocus(it) { const W0 = G.worldM || M, t = it.id === 'mapitem' && it.town != null && W0.towns ? W0.towns[it.town] : null; return t ? [t.x + t.w / 2, t.y + t.h / 2, Math.max(60, t.w * 1.15)] : [W0.W / 2, W0.H / 2, W0.W]; }
  function revealMap(it) {
    const W0 = M, E = G.exp, W = W0.W, T = DT.T, f = mapFocus(it);
    const t = it.id === 'mapitem' && it.town != null && W0.towns ? W0.towns[it.town] : null;
    if (t) { for (let y = Math.max(0, t.y); y < Math.min(W0.H, t.y + t.h); y++) for (let x = Math.max(0, t.x); x < Math.min(W, t.x + t.w); x++) { const v = W0.t[y * W + x]; if (v !== T.VOID) E[y * W + x] = 1; } }
    else for (let k = 0; k < E.length; k++) { const v = W0.t[k]; if (v === T.ROAD || v === T.CAR || v === T.WATER) E[k] = 1; }
    G.expDirty = false; updateMapMask(); updateTownLabels();
    return f;
  }
  function openBigmap(focus) {
    if (!G || !G.running) return;
    G.paused = true; if (G.expDirty) { G.expDirty = false; updateMapMask(); } fitBigmap();
    if (focus) setBigView(focus[0], focus[1], focus[2]);
    renderMkBar(); $('bigmap').classList.remove('hidden');
  }
  // 큰 지도 보기 영역 (확대·이동)
  function setBigView(cx, cy, size) {
    const W0 = M; size = clamp(size, 24, Math.max(W0.W, W0.H)); cx = clamp(cx, size / 2, W0.W - size / 2); cy = clamp(cy, size / 2, W0.H - size / 2);
    L.bv = { cx, cy, size }; L._bigSize = size;
    $('bigmapSvg').setAttribute('viewBox', `${(cx - size / 2).toFixed(1)} ${(cy - size / 2).toFixed(1)} ${size.toFixed(1)} ${size.toFixed(1)}`);
    clearTimeout(L._bvTO); L._bvTO = setTimeout(() => { updateTownLabels(); drawMarks(); updateMaps(); }, 60);
  }
  // 필기구: 표시·글자는 펜/연필이 있어야, 지우기는 지우개 (연필로 쓴 것만 지워짐)
  const PEN_IDS = ['pencil', 'pen', 'redpen', 'bluepen'];
  const pensHave = () => PEN_IDS.filter(id => G.p.inv.some(i => i.id === id));
  function renderMkBar() {
    const have = pensHave(); if (!have.includes(L.pen)) L.pen = have[0] || null;
    $('mkPens').innerHTML = have.map(id => `<button data-pen="${id}" class="${L.pen === id ? 'on' : ''}"><i style="background:${ITEMS[id].pen}"></i>${ITEMS[id].name}</button>`).join('') || '<span class="nopen">필기구가 없다 — 연필·펜을 찾아보자</span>';
    const er = has('eraser'), inLv = !!M.level;
    // 필기구가 없거나 건물 안이면 표시 도구 자체를 막음
    const lock = !L.pen ? '필기구(연필·펜)가 있어야 지도에 표시할 수 있다.' : inLv ? '건물 안에서는 표시할 수 없다 — 밖에서 지도를 펼치자.' : '';
    $('mkNo').textContent = lock; $('mkNo').classList.toggle('hidden', !lock); $('mkTools').classList.toggle('hidden', !!lock); $('mkPens').classList.toggle('hidden', !L.pen);
    if (lock) L.mkMode = null;
    for (const b of $('mkBar').querySelectorAll('button[data-mk]')) { const k = b.dataset.mk; b.disabled = !!lock || (k === 'del' && !er); b.classList.toggle('on', k === L.mkMode); }
    if ((L.mkMode === 'del' && !er) || (L.mkMode && L.mkMode !== 'del' && !L.pen)) L.mkMode = null;
    $('mkText').classList.toggle('hidden', L.mkMode !== 'text');
    $('mkHint').textContent = !L.mkMode ? (L.pen ? '기호를 고르고 지도를 누르세요 · 끌어서 이동' : '끌어서 이동 · +/− 확대') : L.mkMode === 'del' ? '지울 표시를 누르세요 (연필로 쓴 것만)' : L.mkMode === 'text' ? '글자를 적고 지도를 누르세요' : '표시할 곳을 누르세요';
  }
  // 지도 표시 (기지·차·위험·물건) — 바깥 지도에만
  const MARK_ICO = { base: 'mkhome', car: 'car', danger: 'warn', zomb: 'skull', loot: 'star', food: 'food', water: 'drop', med: 'mkmed' };
  const MARK = { base: ['기지', '#6ab04c', '집'], car: ['차', '#3a86c8', '차'], danger: ['위험', '#c8141f', '!'], loot: ['물건', '#d8a020', '★'], food: ['음식', '#d8a020', '식'], water: ['물', '#3a86c8', '물'], med: ['약', '#6ab04c', '✚'], zomb: ['좀비 떼', '#c8141f', '좀'], text: ['글자', '#1c1c1c', ''] };
  function drawMarks() {
    for (const m of [L.mini, L.big]) { if (!m || !m.mk) continue; m.mk.innerHTML = ''; if (M.level) continue;
      const r = m.big ? Math.max(1.4, (L._bigSize || 72) / 55) : 1.1;
      for (const k of G.marks || []) { const t = MARK[k.t]; if (!t) continue; const g = el('g', { transform: `translate(${k.x.toFixed(1)} ${k.y.toFixed(1)})` }, m.mk), c = k.c || t[1];
        if (k.t === 'text') { if (!m.big) { el('circle', { r: r * .35, fill: c }, g); continue; } const tx = el('text', { y: r * .4, 'text-anchor': 'middle', 'font-size': r * 1.25, 'font-weight': 800, fill: c, stroke: '#e8dfc6', 'stroke-width': r * .25, 'paint-order': 'stroke', 'font-family': 'sans-serif' }, g); tx.textContent = k.txt || ''; continue; }
        el('circle', { r, fill: '#efe6cc', stroke: c, 'stroke-width': r * .2 }, g); // 종이색 바탕 + 필기구 색 테두리
        const u = el('use', { href: '#i-' + (MARK_ICO[k.t] || 'star'), x: -r * .62, y: -r * .62, width: r * 1.24, height: r * 1.24 }, g); u.style.color = c; } }
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
    if (L.mapDirty) { L.mapDirty = false; const Mx = M, old = Mx._baseURL; mapBaseURL(url => { Mx._baseURL = url; for (const m of [L.mini, L.big]) m.base.setAttribute('href', url); if (old && old.startsWith('blob:')) URL.revokeObjectURL(old); }); }
    {
      let x0 = p.x, y0 = p.y, x1 = p.x, y1 = p.y;
      const W = M.W, E = G.exp;
      if (E) for (let i = 0; i < E.length; i++) if (E[i]) { const x = i % W, y = (i / W) | 0; if (x < x0) x0 = x; if (x + 1 > x1) x1 = x + 1; if (y < y0) y0 = y; if (y + 1 > y1) y1 = y + 1; }
      const size = Math.min(M.W, Math.max(40, x1 - x0 + 8, y1 - y0 + 8));
      const cx = clamp((x0 + x1) / 2, size / 2, M.W - size / 2), cy = clamp((y0 + y1) / 2, size / 2, M.H - size / 2);
      $('bigmapSvg').setAttribute('viewBox', `${(cx - size / 2).toFixed(1)} ${(cy - size / 2).toFixed(1)} ${size.toFixed(1)} ${size.toFixed(1)}`);
      L._bigSize = size; L.bv = { cx, cy, size };
    }
    updateTownLabels();
    drawMarks();
    updateMaps();
  }
  function refreshContainer(i) {
    if (!G || !L.cont) return;
    if (isVeh(i) || isPlacedC(i)) return;
    if (isCorpse(i)) { const c = corpseOf(i); if (c) c.g.setAttribute('opacity', c.searched && !c.items.length ? .55 : 1); return; }
    if (G.removed.has(i)) {
      if (L.cont[i]) L.cont[i].g.style.display = 'none';
      L.mapDirty = true;
      return;
    }
    if (!L.cont[i]) return; // 화면에서 먼 조각 (그릴 때 다시 반영)
    const searched = G.searched.has(i), empty = searched && !contItems(i).length;
    L.cont[i].g.setAttribute('opacity', empty ? .45 : 1);
    L.cont[i].x.setAttribute('opacity', empty ? .9 : 0);
  }

  /* ================= 그림: 문·창문 (상태별) ================= */
  function drawOpening(o) {
    const ch = L.chunks && L.chunks.get(M.ckOf(o.x, o.y));
    if (!ch || !ch.opG) return; // 화면에서 먼 조각은 그리지 않음 (조각을 그릴 때 같이 그림)
    const s = dsOf(o.k);
    let g = L.opEl[o.k];
    if (g) g.innerHTML = ''; else { g = el('g', {}, ch.opG); L.opEl[o.k] = g; }
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
        P([[[.18, .44], [.53, .44]]], { stroke: '#d8eef7', 'stroke-width': .04, 'stroke-opacity': .75 });
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
  function drawPropsR(gr, x0, y0, x1, y1, q, key) {
    const T = DT.T, W = M.W, H = M.H, area = (x1 - x0) * (y1 - y0) / 5184;
    const at = (x, y) => M.t[Math.floor(y) * W + Math.floor(x)];
    const qX = () => x0 + q() * (x1 - x0), qY = () => y0 + q() * (y1 - y0);
    const g = el('g', { 'shape-rendering': 'auto' }, gr), propG = g;
    let weed = '', dirt = '', fl1 = '', fl2 = '', leaf = '', oil = [], pud = [], skid = '', glass = '';
    const n1 = Math.round(900 * area);
    for (let i = 0; i < n1; i++) {
      const x = qX(), y = qY(), t = at(x, y), k = q();
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
    for (let y = Math.max(1, y0); y < Math.min(H - 1, y1); y++) for (let x = Math.max(1, x0); x < Math.min(W - 1, x1); x++) if (M.t[y * W + x] === T.TREE && (!M.world || q() < .35)) for (let j = 0; j < 4; j++) { const lx = x + .5 + (q() - .5) * 2.2, ly = y + .5 + (q() - .5) * 2.2; if (at(lx, ly) === T.GRASS) leaf += `M${lx.toFixed(2)} ${ly.toFixed(2)}l.07 -.04l.05 .06l-.07 .04z`; }
    // 창문 밑 깨진 유리
    for (const o of M.ixOp[key]) if (o.type === 'win' && q() < .35) for (let j = 0; j < 4; j++) { const gx = o.x + .5 + (q() - .5) * 1.4, gy = o.y + .5 + (q() - .5) * 1.4; glass += `M${gx.toFixed(2)} ${gy.toFixed(2)}l.06 -.03l-.02 .07z`; }
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
    const n2 = Math.round(170 * area) + (q() < (170 * area) % 1 ? 1 : 0);
    for (let i = 0; i < n2; i++) {
      const x = qX(), y = qY(), t = at(x, y), k = q(), a = (q() * 360) | 0;
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
    for (const o of ST) el('path', Object.assign({ d: o.d }, o.a), propG);
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
    } else if (d.kind === 'pump') { // 주유기
      el('rect', { x: .2, y: .15, width: .6, height: .7, rx: .06, fill: '#c8141f', stroke: '#2a0808', 'stroke-width': .04 }, g);
      el('rect', { x: .28, y: .24, width: .44, height: .2, fill: '#1a2a2a' }, g);
      el('rect', { x: .3, y: .27, width: .24, height: .06, fill: '#6ac86a', opacity: .6 }, g);
      el('path', { d: 'M.8 .5q.18 0 .15 .3', stroke: '#111', 'stroke-width': .05, fill: 'none' }, g);
      el('rect', { x: .3, y: .55, width: .4, height: .2, fill: '#e8e0c8' }, g);
    } else if (d.kind === 'tent') { // 대피소·격리 텐트 (2x2)
      const tc = ['#5a6040', '#6a6a52', '#4e5a3a', '#d8d4c4'][d.c % 4];
      el('path', { d: 'M.1 .15L1.9 .15L1.9 1.85L.1 1.85Z', fill: tc, stroke: '#1a1c12', 'stroke-width': .05 }, g);
      el('path', { d: 'M.1 .15L1 1L1.9 .15M.1 1.85L1 1L1.9 1.85', stroke: shade(tc, -.25), 'stroke-width': .05, fill: 'none' }, g);
      el('path', { d: 'M1 .15V1.85', stroke: shade(tc, .15), 'stroke-width': .04 }, g);
      if (d.c % 4 === 3) el('path', { d: 'M.85 .55h.3M1 .4v.3', stroke: '#c8141f', 'stroke-width': .1 }, g); // 적십자
      el('path', { d: 'M.8 1.85L1 1.45L1.2 1.85Z', fill: '#1a1a14' }, g); // 입구
    } else if (d.kind === 'barrier') { // 콘크리트 방벽
      el('rect', { x: .05, y: .28, width: .9, height: .44, rx: .05, fill: '#a8a498', stroke: '#3a3a36', 'stroke-width': .04 }, g);
      el('path', { d: 'M.05 .5h.9', stroke: '#8a867c', 'stroke-width': .03 }, g);
      el('path', { d: 'M.2 .3l.1 .4M.5 .3l.1 .4M.8 .3l.1 .4', stroke: '#c8141f', 'stroke-width': .06, 'stroke-opacity': .8 }, g);
    } else if (d.kind === 'rubble') { // 부서진 다리 잔해
      el('path', { d: 'M.1 .6L.3 .2L.6 .3L.9 .15L.85 .7L.5 .9L.2 .85Z', fill: '#6a665c', stroke: '#2a2824', 'stroke-width': .04 }, g);
      el('path', { d: 'M.3 .4l.3 .2M.5 .3l-.1 .4', stroke: '#3a3830', 'stroke-width': .04 }, g);
      el('path', { d: 'M.7 .2l.25 .5', stroke: '#8a4a2a', 'stroke-width': .05 }, g); // 휜 철근
    } else if (d.kind === 'toilet') {
      el('rect', { x: .25, y: .1, width: .5, height: .22, rx: .05, fill: '#e6e3da', stroke: '#555', 'stroke-width': .025 }, g);
      el('ellipse', { cx: .5, cy: .58, rx: .24, ry: .3, fill: '#efece4', stroke: '#555', 'stroke-width': .025 }, g);
      el('ellipse', { cx: .5, cy: .6, rx: .14, ry: .19, fill: '#9fb0b8' }, g);
    }
  }
  function drawFurniture(g, kind) {
    el('rect', { x: .125, y: .125, width: .875, height: .875, fill: '#000', opacity: .35 }, g);
    if (kind === 'shelf_food' || kind === 'shelf_med' || kind === 'toolrack' || kind === 'huntrack' || kind === 'sportrack' || kind === 'kitchen') { // 가게 진열대: 위에 물건들
      const base = kind === 'toolrack' ? '#6a5a4a' : kind === 'huntrack' ? '#4a4030' : kind === 'sportrack' ? '#3a5a7a' : kind === 'kitchen' ? '#b8b8b4' : '#8a8e92';
      el('rect', { x: .04, y: .1, width: .92, height: .8, rx: .03, fill: base, stroke: '#1a1a1a', 'stroke-width': .04 }, g);
      el('path', { d: 'M.04 .5H.96', stroke: '#2a2a2a', 'stroke-width': .03 }, g);
      const r = DT.rng(((g._seed || 0) + 1) * 97 + kind.length * 13);
      const cols = kind === 'huntrack' ? ['#5a6a3a', '#e0601a', '#3a2a1a', '#8a8a6a', '#2a2a2a'] : kind === 'sportrack' ? ['#e8e4dc', '#c8141f', '#2a8ac8', '#e0b020', '#1a1a1a'] : kind === 'kitchen' ? ['#9aa0a4', '#5a5a58', '#e8e0c8', '#c8a06a', '#d8d8d4'] : kind === 'shelf_food' ? ['#c8141f', '#e0b020', '#2a6a9a', '#e8e0c8', '#4a8a3a', '#d86a1a'] : kind === 'shelf_med' ? ['#f2eee4', '#6ac8c0', '#e8e0c8', '#c8141f', '#9ab8e0'] : ['#9aa0a4', '#c8a06a', '#5a5a58', '#d8c060', '#8a6a4a'];
      for (const yy of [.15, .55]) for (let i = 0; i < 5; i++) {
        if (r() < .25) continue; // 빈 칸 (털린 흔적)
        el('rect', { x: .08 + i * .17 + r() * .02, y: yy + r() * .04, width: .12, height: .24, rx: .02, fill: cols[(r() * cols.length) | 0], stroke: '#111', 'stroke-width': .012 }, g);
      }
      return;
    }
    if (kind === 'counter') { // 계산대
      el('rect', { x: .04, y: .08, width: .92, height: .84, rx: .03, fill: '#6a5a4a', stroke: '#1a1208', 'stroke-width': .04 }, g);
      el('rect', { x: .1, y: .14, width: .8, height: .3, fill: '#c8c0b0' }, g);
      el('rect', { x: .55, y: .5, width: .32, height: .3, rx: .03, fill: '#2a2a2a', stroke: '#000', 'stroke-width': .02 }, g); // 금전등록기
      el('rect', { x: .6, y: .55, width: .22, height: .08, fill: '#6ac86a', opacity: .7 }, g);
      return;
    }
    if (kind === 'crate' || kind === 'supply') { // 나무 상자 / 군 보급 상자
      const sup = kind === 'supply';
      el('rect', { x: .1, y: .1, width: .8, height: .8, rx: .03, fill: sup ? '#4e5436' : '#9a7446', stroke: sup ? '#1a1c10' : '#3a2812', 'stroke-width': .05 }, g);
      el('path', { d: 'M.1 .1L.9 .9M.9 .1L.1 .9', stroke: sup ? '#3a4028' : '#7a5a32', 'stroke-width': .06 }, g);
      el('rect', { x: .1, y: .1, width: .8, height: .8, fill: 'none', stroke: sup ? '#5e6446' : '#b08a58', 'stroke-width': .08 }, g);
      if (sup) el('rect', { x: .3, y: .42, width: .4, height: .16, fill: '#d8d0a0' }, g);
      return;
    }
    if (kind === 'luggage') { // 여행 가방
      const col = ['#2a4a6a', '#6a2a2a', '#3a3a3a', '#6a5a2a'][(g._seed || 0) % 4];
      el('rect', { x: .16, y: .22, width: .68, height: .6, rx: .08, fill: col, stroke: '#0e0e0e', 'stroke-width': .04 }, g);
      el('path', { d: 'M.38 .22V.12h.24V.22', stroke: '#1a1a1a', 'stroke-width': .05, fill: 'none' }, g);
      el('path', { d: 'M.16 .52h.68', stroke: shade(col, -.3), 'stroke-width': .03 }, g);
      el('rect', { x: .62, y: .6, width: .14, height: .1, fill: '#e8e0c8' }, g); // 이름표
      return;
    }
    if (kind === 'safe') { // 금고
      el('rect', { x: .08, y: .08, width: .84, height: .84, rx: .05, fill: '#3e3e3c', stroke: '#0a0a0a', 'stroke-width': .05 }, g);
      el('rect', { x: .16, y: .16, width: .68, height: .68, rx: .03, fill: '#4e4e4a', stroke: '#1a1a1a', 'stroke-width': .025 }, g);
      el('circle', { cx: .5, cy: .5, r: .15, fill: '#8a8a84', stroke: '#1a1a1a', 'stroke-width': .03 }, g);
      el('path', { d: 'M.5 .38V.46M.62 .5H.54M.5 .62V.54M.38 .5H.46', stroke: '#1a1a1a', 'stroke-width': .025 }, g);
      el('rect', { x: .7, y: .44, width: .06, height: .12, fill: '#b8a060' }, g);
      return;
    }
    if (kind === 'firegear') { // 소방 장비함 (빨간 사물함 + 방화복)
      el('rect', { x: .08, y: .06, width: .84, height: .88, rx: .03, fill: '#a8281a', stroke: '#2a0808', 'stroke-width': .045 }, g);
      el('path', { d: 'M.5 .06V.94', stroke: '#4a0e08', 'stroke-width': .03 }, g);
      el('rect', { x: .16, y: .16, width: .26, height: .5, rx: .05, fill: '#c89a3a', stroke: '#3a2a0a', 'stroke-width': .02 }, g);
      el('path', { d: 'M.16 .36h.26M.16 .5h.26', stroke: '#e8e440', 'stroke-width': .035 }, g);
      el('circle', { cx: .7, cy: .32, r: .14, fill: '#e0b020', stroke: '#3a2a0a', 'stroke-width': .025 }, g);
      el('path', { d: 'M.6 .78h.28', stroke: '#e8e4dc', 'stroke-width': .05 }, g);
      return;
    }
    if (kind === 'locker' || kind === 'gunlocker') { // 사물함 / 총기 보관함
      const gun = kind === 'gunlocker';
      el('rect', { x: .08, y: .06, width: .84, height: .88, rx: .03, fill: gun ? '#2e3844' : '#5a6a78', stroke: '#0e1216', 'stroke-width': .045 }, g);
      el('path', { d: 'M.5 .06V.94', stroke: '#1a2228', 'stroke-width': .03 }, g);
      for (const xx of [.22, .64]) el('path', { d: `M${xx} .2h.14M${xx} .28h.14M${xx} .36h.14`, stroke: '#1a2228', 'stroke-width': .02 }, g);
      el('circle', { cx: .44, cy: .6, r: .03, fill: '#c8c0a0' }, g); el('circle', { cx: .56, cy: .6, r: .03, fill: '#c8c0a0' }, g);
      if (gun) el('path', { d: 'M.2 .75h.6', stroke: '#c8141f', 'stroke-width': .05 }, g);
      return;
    }
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
    skin: ['#f2cfa8', '#dca97c', '#b0784c', '#7a4e32', '#4e3222'],
    hair: ['short', 'long', 'buzz', 'pony', 'cap', 'beanie', 'curly', 'mohawk'],
    hairName: ['짧은 머리', '긴 머리', '삭발', '묶은 머리', '야구모자', '비니', '곱슬머리', '모히칸'],
    hc: ['#2a1d14', '#5a3a1f', '#b08a4a', '#1a1a1a', '#7a2a1a', '#c8c4bc'],
    jacket: ['#c9c3b3', '#4b5134', '#2e3a4e', '#6a4a30', '#8a2a2a', '#e8e6e0', '#5a6a3a'],
    jacketName: ['베이지 자켓', '올리브 야전상의', '네이비 점퍼', '갈색 가죽', '빨간 후드', '흰 셔츠', '위장 자켓'],
    pack: ['mil', 'hike', 'school', 'duffel', 'none'],
    packName: ['군용 배낭', '등산 배낭', '학생 가방', '더플백', '가방 없음'],
  };
  function defaultLook() { return { skin: 1, hair: 0, hc: 0, jacket: 0, pack: 0 }; }
  function loadLook() { try { const v = JSON.parse(localStorage.getItem('deadtown_look')); if (v && v.skin != null) { const d = defaultLook(); for (const k in d) if (v[k] == null || v[k] >= (LOOK[k] || []).length && k !== 'skin') v[k] = d[k]; if (v.skin >= LOOK.skin.length) v.skin = 1; return v; } } catch (e) {} return defaultLook(); }
  function saveLook(v) { try { localStorage.setItem('deadtown_look', JSON.stringify(v)); } catch (e) {} }
  function drawPlayerArt(g, lk, refs) {
    const skin = LOOK.skin[lk.skin], jc = lk.jc || LOOK.jacket[lk.jacket], hc = LOOK.hc[lk.hc], hs = LOOK.hair[lk.hair];
    const jd = shade(jc, -.3), jl = shade(jc, .12);
    el('ellipse', { cx: .05, cy: .06, rx: .3, ry: .26, fill: '#000', opacity: .35 }, g);
    const shoe = (cy) => { const f = el('g', {}, g); el('ellipse', { cx: 0, cy, rx: .1, ry: .065, fill: '#2a2420', stroke: '#000', 'stroke-width': .025 }, f); el('ellipse', { cx: .05, cy, rx: .04, ry: .04, fill: '#4a3f36' }, f); el('path', { d: `M-.07 ${cy}h.06`, stroke: '#141110', 'stroke-width': .02 }, f); return f; };
    refs.fl = shoe(-.1); refs.fr = shoe(.1);
    g = refs.upper = el('g', {}, g); // 상체 (걸을 때 흔들림·질주할 때 앞으로 숙임)
    // 배낭 + 침낭
    refs.pack = el('g', {}, g);
    const pk = LOOK.pack[lk.pack || 0];
    if (pk === 'mil') { // 군용 배낭 + 침낭
      el('rect', { x: -.32, y: -.17, width: .18, height: .34, rx: .06, fill: '#4b5134', stroke: '#111', 'stroke-width': .03 }, refs.pack);
      el('rect', { x: -.36, y: -.15, width: .06, height: .3, rx: .03, fill: '#6a5a3a', stroke: '#111', 'stroke-width': .02 }, refs.pack);
      el('path', { d: 'M-.3 -.08h.14M-.3 .08h.14', stroke: '#33381f', 'stroke-width': .03 }, refs.pack);
      el('rect', { x: -.3, y: -.12, width: .1, height: .24, rx: .04, fill: '#5a6040', stroke: '#22251a', 'stroke-width': .015 }, refs.pack); // 덮개
      el('rect', { x: -.225, y: -.03, width: .035, height: .06, rx: .01, fill: '#b8a878' }, refs.pack); // 버클
      el('path', { d: 'M-.36 -.09h.06M-.36 0h.06M-.36 .09h.06', stroke: '#4a3e28', 'stroke-width': .015 }, refs.pack); // 침낭 주름
      el('rect', { x: -.32, y: -.17, width: .18, height: .34, rx: .06, fill: 'url(#volS)' }, refs.pack);
    } else if (pk === 'hike') { // 크고 긴 등산 배낭 (주황) + 매트
      el('rect', { x: -.4, y: -.19, width: .26, height: .38, rx: .08, fill: '#c8601a', stroke: '#2a1206', 'stroke-width': .03 }, refs.pack);
      el('rect', { x: -.46, y: -.16, width: .08, height: .32, rx: .04, fill: '#3a7a9a', stroke: '#0a1a22', 'stroke-width': .02 }, refs.pack);
      el('path', { d: 'M-.36 -.12v.24M-.26 -.13v.26', stroke: '#8a3a0a', 'stroke-width': .02 }, refs.pack);
      el('rect', { x: -.4, y: -.19, width: .26, height: .38, rx: .08, fill: 'url(#volS)' }, refs.pack);
    } else if (pk === 'school') { // 작은 학생 가방 (파랑)
      el('rect', { x: -.28, y: -.13, width: .14, height: .26, rx: .06, fill: '#2a5aa8', stroke: '#0a1a3a', 'stroke-width': .025 }, refs.pack);
      el('rect', { x: -.3, y: -.07, width: .05, height: .14, rx: .02, fill: '#e0b020' }, refs.pack);
      el('rect', { x: -.28, y: -.13, width: .14, height: .26, rx: .06, fill: 'url(#volS)' }, refs.pack);
    } else if (pk === 'duffel') { // 한쪽 어깨에 멘 더플백
      el('ellipse', { cx: -.2, cy: .19, rx: .12, ry: .08, fill: '#3a3a3a', stroke: '#000', 'stroke-width': .02 }, refs.pack);
      el('path', { d: 'M-.1 .24L.06 -.2', stroke: '#1a1a1a', 'stroke-width': .025 }, refs.pack);
      el('path', { d: 'M-.29 .19h.18', stroke: '#6a6a6a', 'stroke-width': .015 }, refs.pack);
    }
    // 왼팔: 빈손 / 양손잡기 두 가지
    refs.armL = el('g', {}, g);
    refs.armLfree = el('g', {}, refs.armL);
    el('path', { d: 'M-.02 -.2Q.1 -.29 .2 -.25', stroke: jc, 'stroke-width': .11, 'stroke-linecap': 'round', fill: 'none' }, refs.armLfree);
    el('path', { d: 'M.13 -.27Q.17 -.27 .2 -.25', stroke: jd, 'stroke-width': .11, 'stroke-linecap': 'butt', fill: 'none', opacity: .5 }, refs.armLfree);
    refs.band = el('path', { d: 'M.08 -.3l.03 .1M.12 -.3l.03 .1', stroke: '#eeeae0', 'stroke-width': .04, opacity: 0 }, refs.armLfree);
    el('circle', { cx: .22, cy: -.25, r: .065, fill: skin, stroke: '#000', 'stroke-width': .02 }, refs.armLfree);
    refs.armLgrip = el('g', { style: 'display:none' }, refs.armL);
    el('path', { d: 'M-.02 -.2Q.14 -.18 .26 .1', stroke: jc, 'stroke-width': .11, 'stroke-linecap': 'round', fill: 'none' }, refs.armLgrip);
    el('circle', { cx: .27, cy: .12, r: .065, fill: skin, stroke: '#000', 'stroke-width': .02 }, refs.armLgrip);
    // 오른팔 + 무기
    refs.armR = el('g', {}, g);
    refs.wep = el('g', { transform: 'translate(.22 .25)' }, refs.armR);
    el('path', { d: 'M-.02 .2Q.1 .29 .2 .25', stroke: jc, 'stroke-width': .11, 'stroke-linecap': 'round', fill: 'none' }, refs.armR);
    el('circle', { cx: .22, cy: .25, r: .065, fill: skin, stroke: '#000', 'stroke-width': .02 }, refs.armR);
    // 몸통 (숨쉬기용 그룹)
    refs.torso = el('g', {}, g);
    el('ellipse', { cx: 0, cy: 0, rx: .17, ry: .27, fill: jc, stroke: '#141312', 'stroke-width': .04 }, refs.torso);
    el('ellipse', { cx: -.03, cy: 0, rx: .1, ry: .2, fill: jl }, refs.torso);
    if (lk.jacket === 6) for (const [cx, cy, a, b] of [[-.08, -.12, .05, .03], [.04, .08, .06, .035], [-.06, .12, .04, .03], [.05, -.1, .045, .03]]) el('ellipse', { cx, cy, rx: a, ry: b, fill: '#3a4428', opacity: .85 }, refs.torso);
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
      el('path', { d: 'M-.09 -.09A.13 .13 0 0 1 .06 -.12Q.02 0 .06 .12A.13 .13 0 0 1 -.09 .09Z', fill: hc, opacity: .55 }, g);
    } else if (hs !== 'beanie') {
      el('path', { d: 'M-.1 -.07A.135 .135 0 0 1 .05 -.128Q-.01 0 .05 .128A.135 .135 0 0 1 -.1 .07Z', fill: hc }, g); // 얼굴(피부)이 더 보이게 뒤쪽만
      el('path', { d: 'M-.06 -.06L.02 -.08M-.07 0L.0 -.01M-.06 .06L.02 .07', stroke: shade(hc, .25), 'stroke-width': .014, opacity: .6 }, g); // 머릿결
      if (hs === 'curly') for (const [cx, cy] of [[-.06, -.08], [-.09, 0], [-.06, .08], [0, -.1], [0, .1], [-.02, 0]]) el('circle', { cx, cy, r: .04, fill: shade(hc, .1), stroke: shade(hc, -.3), 'stroke-width': .01 }, g);
      if (hs === 'mohawk') { el('path', { d: 'M-.1 -.07A.135 .135 0 0 1 .05 -.128Q-.01 0 .05 .128A.135 .135 0 0 1 -.1 .07Z', fill: shade(hc, -.2), opacity: .35 }, g); el('path', { d: 'M-.13 0L.1 0', stroke: '#c8141f', 'stroke-width': .07, 'stroke-linecap': 'round' }, g); }
    }
    if (hs === 'beanie') { el('path', { d: 'M-.11 -.08A.14 .14 0 0 1 .06 -.13Q.0 0 .06 .13A.14 .14 0 0 1 -.11 .08Z', fill: '#8a2a2a', stroke: '#2a0a0a', 'stroke-width': .02 }, g); el('path', { d: 'M.04 -.12Q-.02 0 .04 .12', stroke: '#c8b8a0', 'stroke-width': .03, fill: 'none' }, g); el('circle', { cx: -.1, cy: 0, r: .035, fill: '#c8b8a0' }, g); }
    el('circle', { cx: .03, cy: 0, r: .135, fill: 'url(#volG)' }, g);
    // 머리 장비 (위에서 본 모자·헬멧)
    if (lk.head === 'cap') {
      el('circle', { cx: .0, cy: 0, r: .142, fill: '#2e3a4e', stroke: '#0a0e14', 'stroke-width': .03 }, g);
      el('path', { d: 'M.09 -.11Q.27 0 .09 .11Z', fill: '#223044', stroke: '#0a0e14', 'stroke-width': .02 }, g);
      el('circle', { cx: -.01, cy: 0, r: .02, fill: '#4a5a70' }, g);
    } else if (lk.head === 'moto') {
      el('circle', { cx: .02, cy: 0, r: .165, fill: '#1c1c1e', stroke: '#000', 'stroke-width': .03 }, g);
      el('path', { d: 'M.09 -.12A.16 .16 0 0 1 .09 .12L.14 .07A.1 .1 0 0 0 .14 -.07Z', fill: '#4a6a8a', opacity: .85 }, g);
      el('path', { d: 'M-.1 -.07A.12 .12 0 0 1 .02 -.13', stroke: '#fff', 'stroke-width': .02, opacity: .35, fill: 'none', 'stroke-linecap': 'round' }, g);
    } else if (lk.head === 'fire') {
      el('ellipse', { cx: -.02, cy: 0, rx: .2, ry: .18, fill: '#8a6a14', stroke: '#1a1204', 'stroke-width': .025 }, g);
      el('circle', { cx: .02, cy: 0, r: .145, fill: '#d8a820', stroke: '#1a1204', 'stroke-width': .025 }, g);
      el('path', { d: 'M-.12 0H.15', stroke: '#8a6a14', 'stroke-width': .04, 'stroke-linecap': 'round' }, g);
    } else if (lk.head === 'mil') {
      el('circle', { cx: .01, cy: 0, r: .16, fill: '#4b5134', stroke: '#15170e', 'stroke-width': .03 }, g);
      for (const [cx, cy, r] of [[-.06, -.06, .035], [.04, .07, .03], [-.03, .08, .025], [.06, -.05, .028]]) el('circle', { cx, cy, r, fill: '#353a24' }, g);
      el('path', { d: 'M.1 -.12Q.16 0 .1 .12', stroke: '#2a2e1c', 'stroke-width': .02, fill: 'none' }, g);
    }
    // 가구를 들고 있을 때
    refs.carry = el('g', { style: 'display:none' }, g);
    el('rect', { x: .12, y: -.34, width: .5, height: .68, rx: .04, fill: '#6a4f33', stroke: '#1f150b', 'stroke-width': .04 }, refs.carry);
    el('path', { d: 'M.12 -.1H.62M.12 .12H.62', stroke: '#3a2a18', 'stroke-width': .03 }, refs.carry);
  }
  function makePlayerG() {
    const g = el('g', {}, L.player);
    L.pr = {};
    drawPlayerArt(g, gearLook(), L.pr);
    L.pFootL = L.pr.fl; L.pFootR = L.pr.fr; L.pArmL = L.pr.armL; L.pArmR = L.pr.armR; L.pWep = L.pr.wep;
    L.pg = g;
    updateWeaponLook();
  }
  const SMALL_W = { knife: 1.45, hknife: 1.4, pistol: 1.5, revolver: 1.35, screwdriver: 1.5, baton: 1.15, brick: 1.3, wrench: 1.2, pan: 1.1 }; // 작은 무기는 크게 그려서 잘 보이게
  function weaponArt(parent, id) {
    parent.innerHTML = '';
    const host = SMALL_W[id] ? el('g', { transform: `scale(${SMALL_W[id]})` }, parent) : parent;
    const d = (dd, attrs) => el('path', Object.assign({ d: dd }, attrs), host);
    const K = { stroke: '#111', 'stroke-width': .018 };
    switch (id) {
      case 'screwdriver': d('M-.03 -.03h.14v.06h-.14z', { fill: '#c8a020', stroke: '#3a2a08', 'stroke-width': .012 }); d('M.11 -.01h.2v.02h-.2z', { fill: '#b8bcc0' }); break;
      case 'pan': d('M-.03 -.02h.34v.04h-.34z', { fill: '#1a1a1a' }); el('circle', { cx: .48, cy: 0, r: .17, fill: '#2a2a2a', stroke: '#000', 'stroke-width': .02 }, host); el('circle', { cx: .45, cy: -.04, r: .06, fill: '#4a4a4a', opacity: .6 }, host); break;
      case 'wrench': d('M-.03 -.022h.36v.044h-.36z', { fill: '#9aa0a4', ...K }); d('M.32 -.08h.1v.05h-.05v.06h.05v.05h-.1z', { fill: '#9aa0a4', ...K }); break;
      case 'hknife': d('M-.04 -.03h.13v.06h-.13z', { fill: '#3a2414' }); d('M.08 -.035h.03v.07h-.03z', { fill: '#8a8a80' }); d('M.11 -.03L.36 -.03Q.42 0 .36 .02L.11 .03Z', { fill: '#dce0e4', stroke: '#555', 'stroke-width': .012 }); break;
      case 'baton': d('M-.05 -.028h.5v.056h-.5z', { fill: '#1a1a1a', stroke: '#000', 'stroke-width': .015 }); d('M.06 -.028v.1h.035v-.1', { fill: '#1a1a1a' }); break;
      case 'brick': d('M-.02 -.09h.26v.18h-.26z', { fill: '#8a4a2a', stroke: '#3a1a0a', 'stroke-width': .02 }); d('M.02 -.02h.06M.12 .04h.06', { stroke: '#5a2a1a', 'stroke-width': .02 }); break;
      case 'crowbar': d('M-.04 -.025h.62v.05h-.62z', { fill: '#2e2e30', ...K }); d('M.56 -.025q.12 -.02 .1 -.12', { stroke: '#2e2e30', 'stroke-width': .05, fill: 'none', 'stroke-linecap': 'round' }); d('M-.04 -.025l-.04 .06', { stroke: '#2e2e30', 'stroke-width': .045 }); break;
      case 'golf': d('M-.04 -.018h.7v.036h-.7z', { fill: '#c8ccd0', ...K }); d('M-.04 -.03h.16v.06h-.16z', { fill: '#1a1a1a' }); d('M.64 -.02h.08v.1h-.1z', { fill: '#a8acb0', ...K }); break;
      case 'hockey': d('M-.04 -.025h.68v.05h-.68z', { fill: '#c8a06a', ...K }); d('M.62 -.025l.14 .02v.13h-.06l-.08 -.1z', { fill: '#b8904a', ...K }); d('M-.04 -.025h.1v.05h-.1z', { fill: '#1a1a1a' }); break;
      case 'shovel': d('M-.04 -.022h.62v.044h-.62z', { fill: '#7a5a3a', ...K }); d('M-.1 -.05h.08v.1h-.08z', { fill: '#2a2a2a' }); d('M.56 -.03h.06l.2 -.1v.26l-.2 -.1h-.06z', { fill: '#6a6a60', stroke: '#222', 'stroke-width': .02 }); break;
      case 'machete': d('M-.04 -.03h.15v.06h-.15z', { fill: '#1a1a1a' }); d('M.11 -.035L.62 -.06Q.7 0 .6 .05L.11 .03Z', { fill: '#c8ccd0', stroke: '#555', 'stroke-width': .014 }); break;
      case 'pickaxe': d('M-.04 -.024h.62v.048h-.62z', { fill: '#6a4a2a', ...K }); d('M.55 -.03Q.62 -.28 .78 -.34L.62 -.03Q.66 .03 .62 .04L.78 .32Q.62 .26 .55 .04Z', { fill: '#7a7e82', stroke: '#222', 'stroke-width': .02 }); break;
      case 'fireaxe': d('M-.04 -.026h.66v.052h-.66z', { fill: '#c8141f', ...K }); d('M.5 -.03L.66 -.24Q.8 -.12 .72 .03L.56 .03Z', { fill: '#b8bcc0', stroke: '#222', 'stroke-width': .02 }); d('M.56 .03L.52 .14L.6 .03Z', { fill: '#8a8e92' }); break;
      case 'sledge': d('M-.04 -.026h.6v.052h-.6z', { fill: '#7a5a3a', ...K }); d('M.54 -.13h.2v.26h-.2z', { fill: '#4a4a48', stroke: '#111', 'stroke-width': .025 }); d('M.56 -.1h.16', { stroke: '#7a7a78', 'stroke-width': .02 }); break;
      case 'katana': d('M-.05 -.025h.2v.05h-.2z', { fill: '#1a1a2a' }); d('M.15 -.06v.12h.03v-.12z', { fill: '#c8a020' }); d('M.18 -.02L.86 -.035Q.92 -.01 .86 .01L.18 .02Z', { fill: '#eef2f6', stroke: '#8a8e92', 'stroke-width': .01 }); break;
      case 'revolver': d('M-.02 -.035h.14v.07h-.14z', { fill: '#3a2a1a' }); el('circle', { cx: .15, cy: 0, r: .045, fill: '#2a2a2a', stroke: '#000', 'stroke-width': .012 }, host); d('M.19 -.02h.18v.04h-.18z', { fill: '#2a2a2a', stroke: '#000', 'stroke-width': .012 }); break;
      case 'shotgun': d('M-.08 -.04h.22v.08h-.22z', { fill: '#5a4028', ...K }); d('M.12 -.035h.12v.07h-.12z', { fill: '#2a2a2a' }); d('M.24 -.03h.5v.028h-.5zM.24 .004h.5v.026h-.5z', { fill: '#3a3a3a', stroke: '#000', 'stroke-width': .01 }); break;
      case 'rifle': d('M-.1 -.04h.26v.08h-.26z', { fill: '#6a4a2a', ...K }); d('M.14 -.03h.14v.06h-.14z', { fill: '#2a2a2a' }); d('M.28 -.016h.58v.032h-.58z', { fill: '#3a3a3a' }); d('M.16 -.075h.14v.035h-.14z', { fill: '#1a1a1a' }); break;
      case 'crossbow': d('M-.06 -.03h.5v.06h-.5z', { fill: '#5a4028', ...K }); d('M.36 -.3Q.52 0 .36 .3', { stroke: '#2a2a2a', 'stroke-width': .04, fill: 'none' }); d('M.36 -.3L.12 0L.36 .3', { stroke: '#d8d0b8', 'stroke-width': .01, fill: 'none' }); d('M.1 -.008h.36v.016h-.36z', { fill: '#c8ccd0' }); break;
      case 'bat': d('M-.04 -.03L.62 -.06L.64 .06L-.04 .03Z', { fill: '#b58b56', stroke: '#2a1a0c', 'stroke-width': .02 }); d('M-.05 -.035h.12v.07h-.12z', { fill: '#222' }); break;
      case 'pipe': d('M-.04 -.03h.72v.06h-.72z', { fill: '#8d99a3', stroke: '#2a2f33', 'stroke-width': .02 }); d('M.66 -.045h.05v.09h-.05z', { fill: '#6a747c' }); break;
      case 'knife': d('M-.03 -.025h.12v.05h-.12z', { fill: '#2a1a0c' }); d('M.09 -.03L.34 -.005L.09 .03Z', { fill: '#d9dde0', stroke: '#555', 'stroke-width': .012 }); break;
      case 'hammer': d('M-.03 -.022h.42v.044h-.42z', { fill: '#7a5a3a' }); d('M.36 -.1h.1v.2h-.1z', { fill: '#8a8a8a', stroke: '#222', 'stroke-width': .02 }); break;
      case 'nailbat': d('M-.04 -.045h.6v.09h-.6z', { fill: '#9a7446', stroke: '#2a1a0c', 'stroke-width': .02 }); d('M.3 -.045v-.07M.42 -.045v-.07M.36 .045v.07M.5 .045v.06', { stroke: '#cfd3d6', 'stroke-width': .02 }); break;
      case 'spear': d('M-.2 -.02h.95v.04h-.95z', { fill: '#8d99a3', stroke: '#2a2f33', 'stroke-width': .015 }); d('M.75 -.05L.95 0L.75 .05Z', { fill: '#d9dde0', stroke: '#444', 'stroke-width': .015 }); d('M.66 -.03h.08v.06h-.08z', { fill: '#777' }); break;
      case 'axe': d('M-.04 -.025h.62v.05h-.62z', { fill: '#8a6a45', stroke: '#2a1a0c', 'stroke-width': .015 }); d('M.46 -.03L.62 -.2Q.72 -.1 .66 .03L.52 .03Z', { fill: '#9aa0a4', stroke: '#2a2f33', 'stroke-width': .02 }); d('M.64 -.16Q.7 -.08 .65 .01', { stroke: '#e8eef2', 'stroke-width': .02, fill: 'none' }); break;
      case 'pistol': d('M-.02 -.035h.3v.07h-.3z', { fill: '#1b1b1b', stroke: '#000', 'stroke-width': .015 }); d('M.0 .03h.07v.08h-.07z', { fill: '#2a2a2a' }); break;
      default: break;
    }
  }
  const TWO_HAND = { bat: 1, pipe: 1, spear: 1, nailbat: 1, pistol: 1, axe: 1, golf: 1, hockey: 1, shovel: 1, pickaxe: 1, fireaxe: 1, sledge: 1, katana: 1, revolver: 1, shotgun: 1, rifle: 1, crossbow: 1, crowbar: 1 };
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
    // 걸음새: 걸음이 빠를수록 보폭·팔 흔들림이 커지고, 질주할 땐 상체를 앞으로 숙임
    const GA = { walk: [.1, .05, 3, 0], jog: [.15, .08, 5, .035], sprint: [.2, .11, 7, .075] }[G.gait] || [.1, .05, 3, 0];
    const st = moving ? GA : [0, 0, 0, 0];
    L.lean = lerp(L.lean || 0, st[3], Math.min(1, dt * 8));
    const cw = Math.cos(p.walkPh || 0);
    L.pFootL.setAttribute('transform', `translate(${(st[0] * sw).toFixed(3)} ${(moving ? .015 * Math.abs(cw) : 0).toFixed(3)})`);
    L.pFootR.setAttribute('transform', `translate(${(-st[0] * sw).toFixed(3)} ${(moving ? -.015 * Math.abs(cw) : 0).toFixed(3)})`);
    L.pr.upper.setAttribute('transform', `translate(${L.lean.toFixed(3)} 0) rotate(${(st[2] * sw).toFixed(1)})`);
    L.pArmL.setAttribute('transform', L.pr && L.pr.armLgrip.style.display === '' ? '' : `translate(${(-st[1] * sw).toFixed(3)} 0)`);
    // 숨쉬기 (지치면 가쁘게), 부상 핏자국, 붕대, 가구 들기
    L.breathT = (L.breathT || 0) + dt * (p.endu < 25 ? 7 : moving ? 0 : 2.2);
    const br = 1 + (p.endu < 25 ? .045 : .02) * Math.sin(L.breathT);
    L.pr.torso.setAttribute('transform', `scale(${br.toFixed(3)} ${(2 - br).toFixed(3)})`);
    const hp = p.hp;
    if (L._hpv !== (hp < 40 ? 2 : hp < 70 ? 1 : 0)) { L._hpv = hp < 40 ? 2 : hp < 70 ? 1 : 0; L.pr.blood1.setAttribute('opacity', L._hpv ? .9 : 0); L.pr.blood2.setAttribute('opacity', L._hpv > 1 ? .9 : 0); }
    const bd = (p.bandT || 0) > 0 ? 1 : 0; if (L._bd !== bd) { L._bd = bd; L.pr.band.setAttribute('opacity', bd); }
    const car = p.inv.some(i => i.id === 'furn') ? 1 : 0; if (L._car !== car) { L._car = car; L.pr.carry.style.display = car ? '' : 'none'; }
    let armR = `translate(${(st[1] * sw).toFixed(3)} 0)`;
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
    ['civ', 3], ['office', 1.4], ['hoodie', 1.2], ['police', .8], ['medic', .8], ['worker', .9], ['jogger', .7], ['elder', .8], ['soldier', .4], ['fat', .55], ['screamer', .35],
    ['fire', .3], ['chef', .35], ['hunter', .3], ['golfer', .3], ['guard', .4], ['hazmat', .04], ['prisoner', .04],
  ];
  const HAIRC = ['#2a1d14', '#3b2f25', '#1a1a1a', '#5a4a3a', '#8a7a5a', '#6a3a1f'];
  // 좀비 종류별 특성 (spd 추적 속도, hp 체력, knock 넉백 저항, scream 발견 시 비명)
  const ZTRAIT = { jogger: { spd: 1.6, hp: .75 }, fat: { spd: .68, hp: 2.6, knock: .7 }, soldier: { hp: 1.8, knock: .3 }, police: { hp: 1.3, knock: .15 }, fire: { hp: 1.7, knock: .25 }, hazmat: { hp: 1.35, knock: .2 }, prisoner: { spd: 1.12, hp: 1.1 }, guard: { hp: 1.2, knock: .15 }, hunter: { hp: 1.1 }, screamer: { hp: .9, scream: 1 }, elder: { spd: .85, hp: .85 } };
  const trait = z => (z.lk && ZTRAIT[z.lk.ty]) || {};
  function newZombie(x, y, ty, pr) {
    if (rand() >= Z_RATE) return null; // 좀비 양 70% (물건 양과 같이 줄임)
    const lk = genLook(); if (ty && rand() < pr) lk.ty = ty;
    const tr = ZTRAIT[lk.ty] || {};
    return placeZombie(x, y, (2.6 + rand() * .8) * (tr.hp || 1), null, lk);
  }
  /* ---- 멀리 있는 좀비는 조각별 기록으로만 보관 (그리지도, 계산하지도 않음) ---- */
  const ZIN = 40, ZOUT = 64; // 이 안으로 들어오면 실제 좀비로, 밖으로 나가면 기록으로
  const nearActive = (x, y, r) => Math.abs(x - G.p.x) < r && Math.abs(y - G.p.y) < r;
  function zStoreAdd(rec) { const k = M.ckOf(rec[0], rec[1]); let a = G.zdorm.get(k); if (!a) G.zdorm.set(k, a = []); a.push(rec); G.zdormN++; }
  function placeZombie(x, y, hp, shirt, lk) { // 기록: [x, y, 체력, 옷색, 외형]
    if (nearActive(x, y, ZIN)) return addZombie(x, y, hp, shirt, null, null, lk);
    zStoreAdd([+(+x).toFixed(2), +(+y).toFixed(2), +(+hp).toFixed(2), shirt || null, lk || genLook()]);
    return null;
  }
  function updateZombieZone() {
    const p = G.p;
    let out = 0;
    for (const z of G.zombies) {
      if (z.dead || z.state === 'chase' || nearActive(z.x, z.y, ZOUT)) continue;
      z.stored = true; if (z.g) z.g.remove();
      zStoreAdd([+z.x.toFixed(2), +z.y.toFixed(2), +z.hp.toFixed(2), z.shirt, z.lk]); out++;
    }
    if (out) G.zombies = G.zombies.filter(z => !z.stored);
    const c0x = Math.max(0, Math.floor((p.x - ZIN) / CK)), c1x = Math.min(M.CW - 1, Math.floor((p.x + ZIN) / CK));
    const c0y = Math.max(0, Math.floor((p.y - ZIN) / CK)), c1y = Math.min(M.CH - 1, Math.floor((p.y + ZIN) / CK));
    for (let cy = c0y; cy <= c1y; cy++) for (let cx = c0x; cx <= c1x; cx++) {
      const k = cy * M.CW + cx, a = G.zdorm.get(k);
      if (!a) continue;
      G.zdorm.delete(k); G.zdormN -= a.length;
      for (const r of a) addZombie(r[0], r[1], r[2], r[3], null, null, r[4]);
    }
  }
  // 도시에 들어서면 이름 표시
  function updateTownNow() {
    if (!M.towns) return;
    const p = G.p, t = M.towns.find(t => p.x >= t.x && p.x < t.x + t.w && p.y >= t.y && p.y < t.y + t.h) || null;
    // 마지막으로 알린 도시에서 충분히(15칸) 벗어나야 다시 알림 → 도시 경계를 오가도 반복해서 안 뜸
    const A = G._annT; if (A && !t) { const ox = Math.max(A.x - p.x, 0, p.x - (A.x + A.w)), oy = Math.max(A.y - p.y, 0, p.y - (A.y + A.h)); if (Math.hypot(ox, oy) > 15) G._annT = null; }
    if (t === G._town) return;
    const prev = G._town; G._town = t;
    if (!t || t === G._annT) return;
    G._annT = t;
    if (t.name && prev !== undefined) toast(`${t.name} · ${t.label}${t.tag ? ' — ' + t.tag : ''}`, 3000);
    else if (t.kind === 'hamlet' && prev !== undefined) toast('작은 마을이 보인다', 1800);
  }
  // 먼 곳의 좀비 무리가 조금씩 플레이어 쪽으로 흘러옴 (큰 세계)
  // 멀리(화면 밖) 잠든 좀비도 헬기 쪽으로 끌려감: 헬기 주변 칸의 좀비를 헬기 방향으로 조금씩 옮김
  function pullDormant(x, y, R, step) {
    if (!G.zdorm.size) return;
    const c0x = Math.max(0, Math.floor((x - R) / CK)), c1x = Math.min(M.CW - 1, Math.floor((x + R) / CK));
    const c0y = Math.max(0, Math.floor((y - R) / CK)), c1y = Math.min(M.CH - 1, Math.floor((y + R) / CK));
    const moved = [];
    for (let cy = c0y; cy <= c1y; cy++) for (let cx = c0x; cx <= c1x; cx++) {
      const k = cy * M.CW + cx, a = G.zdorm.get(k); if (!a) continue;
      G.zdorm.delete(k); G.zdormN -= a.length; moved.push(...a);
    }
    for (const r of moved) { const dx = x - r[0], dy = y - r[1], d = Math.hypot(dx, dy);
      if (d > 2 && d < R) { const q = freeNear(clamp(r[0] + dx / d * step, 2, M.W - 3), clamp(r[1] + dy / d * step, 2, M.H - 3)); if (q) { r[0] = q[0]; r[1] = q[1]; } }
      zStoreAdd(r); }
  }
  function driftDormant() {
    if (!G.zdorm.size) return;
    const p = G.p, keys = [...G.zdorm.keys()];
    for (let tries = 0; tries < 12; tries++) {
      const k = keys[(rand() * keys.length) | 0], a = G.zdorm.get(k);
      if (!a || a.length < 3) continue;
      const cx = (k % M.CW) * CK + 8, cy = ((k / M.CW) | 0) * CK + 8, d = Math.hypot(cx - p.x, cy - p.y);
      if (d < ZOUT || d > 200) continue;
      const ax = Math.abs(p.x - cx) > Math.abs(p.y - cy), sx = ax ? Math.sign(p.x - cx) * CK : 0, sy = ax ? 0 : Math.sign(p.y - cy) * CK;
      G.zdorm.delete(k); G.zdormN -= a.length;
      for (const r of a) { const q = freeNear(clamp(r[0] + sx, 2, M.W - 3), clamp(r[1] + sy, 2, M.H - 3)); if (q) { r[0] = q[0]; r[1] = q[1]; } zStoreAdd(r); }
      return;
    }
  }
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
      case 'jogger': P.top = pick(['#c8141f', '#1f7ac8', '#d8c020', '#e05a9a']); P.sleeve = 'none'; P.bw *= .88; P.extra.push('headband', 'stripes'); P.hair = pick(['short', 'pony']); break;
      case 'elder': P.top = pick(['#b8a98a', '#8a7a6a', '#6a7a8a']); P.sleeve = 'long'; P.extra.push('buttons'); P.hc = pick(['#d8d4cc', '#a8a4a0', '#e8e4dc']); P.hair = pick(['short', 'bald', 'messy']); break;
      case 'soldier': P.top = '#4b5134'; P.sleeve = 'long'; P.extra.push('camo', 'pack', 'plate'); P.hat = 'helmet'; break;
      case 'fat': P.top = pick(['#8a8a6a', '#6a7a5a', '#9a8a7a', '#7a6a6a']); P.bw = 1.4; P.skin = pick(['#9aa070', '#a4a47a', '#8e9868']); P.extra.push('belly'); P.hair = pick(['bald', 'short']); break;
      case 'fire': P.top = '#b8862e'; P.sleeve = 'long'; P.extra.push('reflect'); P.hat = r() < .8 ? 'firehelm' : null; if (r() < .35) P.extra.push('tank'); break;
      case 'chef': P.top = '#ecebe4'; P.sleeve = 'long'; P.extra.push('chefbtn'); if (r() < .6) P.extra.push('apron'); P.hat = r() < .75 ? 'toque' : null; break;
      case 'hunter': P.top = pick(['#6a2a22', '#3a4a2a', '#5a4a2a']); P.sleeve = 'long'; P.pattern = 'plaid'; P.extra.push('blaze'); P.hat = r() < .7 ? 'orangecap' : null; if (r() < .4) P.extra.push('pack'); break;
      case 'golfer': P.top = pick(['#f0c8d8', '#c8e8d0', '#f4ecb0', '#c8d8f0', '#f2f0ea']); P.sleeve = 'short'; P.extra.push('collar'); P.hat = r() < .6 ? 'visor' : null; P.hair = pick(['short', 'short', 'bald']); break;
      case 'guard': P.top = '#1e2024'; P.sleeve = 'long'; P.extra.push('badge', 'radio'); P.hat = r() < .5 ? 'blackcap' : null; break;
      case 'hazmat': P.top = '#e4e0b0'; P.sleeve = 'long'; P.extra.push('hood', 'mask', 'suit'); P.hair = 'bald'; break;
      case 'prisoner': P.top = '#e0701a'; P.sleeve = 'short'; P.extra.push('prisonNo'); P.hair = pick(['short', 'bald', 'messy']); break;
      case 'screamer': P.top = pick(['#5a4a6a', '#3a3a4a', '#6a3a4a']); P.sleeve = 'long'; P.skin = '#cfcac0'; P.hair = 'long'; P.hc = '#141414'; P.extra.push('scream'); break;
    }
    // 평범한 좀비 구분용: 옷 무늬 · 모자 · 안경 · 가방
    if (lk.ty === 'civ' || lk.ty === 'hoodie' || lk.ty === 'elder') {
      P.pattern = lk.ty === 'hoodie' ? pick(['plain', 'print', 'print']) : pick(['plain', 'plaid', 'stripe', 'print', 'plaid']);
      P.pc = pick(['#e8e4dc', '#1a1a1a', '#c8a020', '#c8141f', '#2a5aa8']);
      if (!P.hat && r() < (lk.ty === 'elder' ? .1 : .25)) P.hat = pick(['beanie', 'beanie', 'cap', 'bucket']);
      if (lk.ty === 'elder' && r() < .6) P.extra.push('glasses');
      if (lk.ty !== 'elder' && r() < .18) P.extra.push('bag');
      P.bc = pick(['#2a5aa8', '#c8601a', '#3a3a3a', '#6a2a5a']);
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
    const RING = { jogger: '#ff8a1e', fat: '#9ad040', screamer: '#c060ff' }[P.ty]; // 특수 좀비: 발밑 색 고리
    if (RING) el('ellipse', { cx: 0, cy: 0, rx: .36 * bw, ry: .36 * bw, fill: 'none', stroke: RING, 'stroke-width': .045, opacity: .75, 'stroke-dasharray': '.12 .07' }, inner);
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
    if (P.extra.includes('suit')) el('path', { d: `M${-rx * .8} ${-ry * .5}h${rx * 1.3}M${-rx * .8} ${ry * .5}h${rx * 1.3}`, stroke: '#b8b488', 'stroke-width': .03 }, inner);
    if (P.extra.includes('prisonNo')) el('rect', { x: -.02, y: -.1, width: .1, height: .07, fill: '#f2eee4', stroke: '#222', 'stroke-width': .01 }, inner);
    if (P.extra.includes('reflect')) el('path', { d: `M${-rx * .85} ${-ry * .45}H${rx * .85}M${-rx * .85} ${ry * .45}H${rx * .85}`, stroke: '#e8e440', 'stroke-width': .05 }, inner);
    if (P.extra.includes('tank')) el('rect', { x: -.3, y: -.1, width: .14, height: .2, rx: .06, fill: '#c8c8c0', stroke: '#222', 'stroke-width': .025 }, inner);
    if (P.extra.includes('apron')) el('rect', { x: -.02, y: -ry * .7, width: rx * .9, height: ry * 1.4, rx: .03, fill: '#fafaf6', stroke: '#8a8a84', 'stroke-width': .015 }, inner);
    if (P.extra.includes('chefbtn')) el('path', { d: 'M.07 -.1v.001M.07 0v.001M.07 .1v.001M.12 -.1v.001M.12 0v.001M.12 .1v.001', stroke: '#2a2a2a', 'stroke-width': .03, 'stroke-linecap': 'round' }, inner);
    if (P.extra.includes('blaze')) { el('path', { d: `M${-rx * .8} ${-ry * .85}L${rx * .5} ${-ry * .7}L${rx * .5} ${-ry * .25}L${-rx * .8} ${-ry * .3}ZM${-rx * .8} ${ry * .85}L${rx * .5} ${ry * .7}L${rx * .5} ${ry * .25}L${-rx * .8} ${ry * .3}Z`, fill: '#f06a10', stroke: '#6a2a08', 'stroke-width': .015 }, inner); }
    if (P.extra.includes('collar')) el('path', { d: 'M.12 -.1L.16 0L.12 .1', stroke: '#fff', 'stroke-width': .04, fill: 'none' }, inner);
    if (P.extra.includes('radio')) el('rect', { x: .02, y: .14, width: .07, height: .05, rx: .01, fill: '#111', stroke: '#444', 'stroke-width': .01 }, inner);
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
    else if (P.hat === 'beanie') { el('circle', { cx: .02, cy: 0, r: .142, fill: P.bc || '#8a2a2a', stroke: '#111', 'stroke-width': .025 }, inner); el('path', { d: 'M.1 -.1Q.04 0 .1 .1', stroke: '#e8e4dc', 'stroke-width': .03, fill: 'none', opacity: .7 }, inner); el('circle', { cx: -.08, cy: 0, r: .04, fill: '#e8e4dc' }, inner); }
    else if (P.hat === 'bucket') { el('circle', { cx: .02, cy: 0, r: .19, fill: '#8a7a5a', stroke: '#2a2418', 'stroke-width': .025 }, inner); el('circle', { cx: .02, cy: 0, r: .12, fill: '#9a8a6a' }, inner); }
    else if (P.hat === 'firehelm') { el('ellipse', { cx: 0, cy: 0, rx: .21, ry: .17, fill: '#c8201a', stroke: '#3a0808', 'stroke-width': .03 }, inner); el('circle', { cx: .03, cy: 0, r: .12, fill: '#d8301a' }, inner); el('path', { d: 'M-.08 0H.13', stroke: '#e8e440', 'stroke-width': .03 }, inner); }
    else if (P.hat === 'toque') { el('circle', { cx: 0, cy: 0, r: .17, fill: '#fbfaf6', stroke: '#8a8a84', 'stroke-width': .025 }, inner); el('path', { d: 'M-.08 -.08q.08 .08 0 .16M.03 -.12q.06 .12 0 .24', stroke: '#d8d6ce', 'stroke-width': .02, fill: 'none' }, inner); }
    else if (P.hat === 'orangecap') { el('circle', { cx: .02, cy: 0, r: .14, fill: '#f06a10', stroke: '#3a1a08', 'stroke-width': .03 }, inner); el('path', { d: 'M.11 -.1Q.25 0 .11 .1', fill: '#c8500a' }, inner); }
    else if (P.hat === 'blackcap') { el('circle', { cx: .02, cy: 0, r: .14, fill: '#111214', stroke: '#000', 'stroke-width': .03 }, inner); el('path', { d: 'M.11 -.1Q.25 0 .11 .1', fill: '#050505' }, inner); }
    else if (P.hat === 'visor') { el('path', { d: 'M.1 -.14Q.3 0 .1 .14', fill: P.top === '#f2f0ea' ? '#1a2a5a' : '#f2f0ea', stroke: '#222', 'stroke-width': .02 }, inner); el('path', { d: 'M.1 -.13A.14 .14 0 0 0 .1 .13', stroke: '#f2f0ea', 'stroke-width': .04, fill: 'none' }, inner); el('path', { d: 'M-.08 -.08A.13 .13 0 0 1 .06 -.12Q0 0 .06 .11A.13 .13 0 0 1 -.08 .08Z', fill: P.hc, opacity: .92 }, inner); }
    else if (P.hat === 'helmet') { el('circle', { cx: .02, cy: 0, r: .16, fill: '#3e4430', stroke: '#1a1d12', 'stroke-width': .035 }, inner); el('circle', { cx: -.02, cy: -.05, r: .03, fill: '#4e5440' }, inner); }
    else if (P.hair === 'short') el('path', { d: 'M-.08 -.08A.13 .13 0 0 1 .06 -.12Q0 0 .06 .11A.13 .13 0 0 1 -.08 .08Z', fill: P.hc, opacity: .92 }, inner);
    else if (P.hair === 'messy') el('path', { d: 'M-.09 -.08l.05 -.06l.03 .04l.05 -.06l.02 .07L.06 -.1Q0 0 .06 .1l-.04 .02l-.03 -.05l-.04 .06l-.04 -.06l-.05 .03Z', fill: P.hc, opacity: .92 }, inner);
    else if (P.hair === 'long' || P.hair === 'pony') el('path', { d: 'M-.08 -.08A.13 .13 0 0 1 .06 -.12Q0 0 .06 .11A.13 .13 0 0 1 -.08 .08Z', fill: P.hc, opacity: .92 }, inner);
    el('circle', { cx: .02, cy: -.02, r: .075, fill: '#fff', opacity: .08 }, inner);
    if (P.pattern === 'plaid') el('path', { d: `M${-rx * .5} ${-ry * .8}V${ry * .8}M${rx * .2} ${-ry * .85}V${ry * .85}M${-rx * .85} ${-ry * .3}H${rx * .8}M${-rx * .85} ${ry * .3}H${rx * .8}`, stroke: shade(P.top, -.45), 'stroke-width': .028, opacity: .8 }, inner); // 체크무늬
    else if (P.pattern === 'stripe') el('path', { d: `M${-rx * .7} ${-ry * .55}H${rx * .7}M${-rx * .8} 0H${rx * .8}M${-rx * .7} ${ry * .55}H${rx * .7}`, stroke: P.pc, 'stroke-width': .04, opacity: .85 }, inner); // 줄무늬
    else if (P.pattern === 'print') el('circle', { cx: .05, cy: 0, r: .07, fill: P.pc, stroke: shade(P.pc, -.4), 'stroke-width': .012, opacity: .9 }, inner); // 가슴 프린트
    if (P.extra.includes('bag')) { el('rect', { x: -.3, y: -.12, width: .13, height: .24, rx: .05, fill: P.bc, stroke: '#111', 'stroke-width': .02 }, inner); }
    if (P.extra.includes('belly')) el('ellipse', { cx: .06, cy: 0, rx: rx * .62, ry: ry * .58, fill: shade(P.skin, .08), stroke: shade(P.skin, -.3), 'stroke-width': .02 }, inner); // 튀어나온 배
    if (P.extra.includes('stripes')) el('path', { d: `M${-rx * .8} ${-ry * .55}L${rx * .7} ${-ry * .45}M${-rx * .8} ${ry * .55}L${rx * .7} ${ry * .45}`, stroke: '#f2eee4', 'stroke-width': .035 }, inner);
    if (P.extra.includes('plate')) el('rect', { x: -.1, y: -.12, width: .18, height: .24, rx: .03, fill: '#2e3322', stroke: '#111', 'stroke-width': .02 }, inner);
    if (P.extra.includes('scream')) { el('ellipse', { cx: .15, cy: 0, rx: .045, ry: .06, fill: '#3a0508', stroke: '#8a1018', 'stroke-width': .015 }, inner); el('path', { d: 'M.05 -.09l.08 .02M.05 .09l.08 -.02', stroke: '#1a0a0a', 'stroke-width': .02 }, inner); }
    if (P.extra.includes('headband')) el('path', { d: 'M.03 -.13Q-.05 0 .03 .13', stroke: '#e8e4dc', 'stroke-width': .04, fill: 'none' }, inner);
    if (P.extra.includes('glasses')) el('path', { d: 'M.135 -.075v.05M.135 .025v.05M.135 -.025v.05', stroke: '#1a1a1a', 'stroke-width': .025, 'stroke-linecap': 'round' }, inner);
    if (P.extra.includes('mask')) el('rect', { x: .1, y: -.07, width: .07, height: .14, rx: .02, fill: '#9ec4d0', opacity: .9 }, inner);
    if (r() < .25) el('circle', { cx: (r() - .3) * .1, cy: (r() - .5) * .16, r: .035, fill: shade(P.skin, -.35), opacity: .85 }, inner); // 썩은 반점
    z.inner = inner;
    flattenOpacity(g);
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
    const tw = M.towns, twA = tw ? tw.reduce((s, t) => s + t.w * t.h, 0) : 0;
    const pickTown = () => { let r = rand() * twA; for (const t of tw) { r -= t.w * t.h; if (r <= 0) return t; } return tw[0]; };
    for (let tries = 0; made < n && tries < n * 60; tries++) {
      let x, y;
      if (tw && rand() < .85) { const t = pickTown(); x = t.x + 1 + ((rand() * (t.w - 2)) | 0); y = t.y + 1 + ((rand() * (t.h - 2)) | 0); } // 큰 세계: 대부분 도시·마을에
      else { x = 1 + ((rand() * (W - 2)) | 0); y = 1 + ((rand() * (M.H - 2)) | 0); }
      if (M.moveBlock[y * W + x]) continue;
      const cx = x + .5, cy = y + .5;
      if (Math.hypot(cx - p.x, cy - p.y) < minD) continue;
      if (avoidVisible && Math.hypot(cx - p.x, cy - p.y) < V.R + 2) continue;
      newZombie(cx, cy);
      made++;
    }
  }
  // 특수 건물 안 좀비 (좋은 물건이 있는 곳일수록 많음)
  const SHOP_Z = { police: [9, 'police', .75], market: [7, 'office', .3], pharmacy: [6, 'medic', .5], hardware: [5, 'worker', .5], gas: [4, 'worker', .3], firestation: [7, 'fire', .7], restaurant: [6, 'chef', .6], hunting: [5, 'hunter', .6], sports: [5, 'golfer', .55], bank: [6, 'guard', .6] , hospital: [9, 'medic', .55], warehouse: [4, 'worker', .5], factory: [6, 'worker', .6], terminal: [7, 'office', .3], prison: [9, 'prisoner', .8], army: [9, 'soldier', .8] };
  function spawnShopZombies() {
    for (const sh of (M.shops || [])) {
      const [n, ty, pr] = SHOP_Z[sh.kind] || [4, null, 0];
      const cells = [];
      for (let y = sh.y + 1; y < sh.y + sh.h - 1; y++) for (let x = sh.x + 1; x < sh.x + sh.w - 1; x++) if (!M.moveBlock[y * M.W + x] && M.t[y * M.W + x] === DT.T.FLOOR) cells.push([x, y]);
      for (let i = 0; i < n && cells.length; i++) {
        const [x, y] = cells.splice((rand() * cells.length) | 0, 1)[0];
        newZombie(x + .5, y + .5, ty, pr);
      }
    }
  }
  /* ================= 좀비 떼 이동 ================= */
  // 가끔 멀리 있는 좀비 무리가 한꺼번에 다른 곳으로 몰려감 (절반 넘게는 플레이어 근처로)
  function updateHerd(dt) {
    G.herdT = (G.herdT == null ? 40 : G.herdT) - dt;
    if (G.herdT > 0) return;
    G.herdT = 55 + rand() * 60;
    if (M.world && rand() < .6) driftDormant();
    const p = G.p, idle = G.zombies.filter(z => !z.dead && z.state === 'idle');
    const cand = idle.filter(z => { const d = Math.hypot(z.x - p.x, z.y - p.y); return d > 22 && d < 70; });
    if (!cand.length) return;
    const lead = cand[(rand() * cand.length) | 0];
    const group = idle.filter(z => Math.hypot(z.x - lead.x, z.y - lead.y) < 13).slice(0, 18);
    if (group.length < 4) return;
    let tx, ty;
    if (rand() < .55) { tx = p.x + (rand() - .5) * 22; ty = p.y + (rand() - .5) * 22; }
    else { const a = rand() * TAU; tx = lead.x + Math.cos(a) * 30; ty = lead.y + Math.sin(a) * 30; }
    const t = freeNear(clamp(tx, 2, M.W - 3), clamp(ty, 2, M.H - 3));
    if (!t) return;
    for (const z of group) { z.state = 'investigate'; z.herd = true; z.tx = t[0] + (rand() - .5) * 4; z.ty = t[1] + (rand() - .5) * 4; z.path = null; requestPath(z); }
    if (Math.hypot(t[0] - p.x, t[1] - p.y) < 20) { SFX.play('groan', { vol: .35, pan: clamp((lead.x - p.x) / 20, -.9, .9), rev: .8, pitch: 60 }); toast('멀리서 무리 지은 신음이 들린다…', 2400); }
  }
  function freeNear(x, y) {
    const cx = Math.floor(x), cy = Math.floor(y);
    for (let r = 0; r < 6; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      const xx = cx + dx, yy = cy + dy;
      if (xx > 0 && yy > 0 && xx < M.W - 1 && yy < M.H - 1 && !M.moveBlock[yy * M.W + xx]) return [xx + .5, yy + .5];
    }
    return null;
  }

  /* ================= 헬기 이벤트 ================= */
  // 날아와서 머리 위를 한동안 맴돌며 소음 → 주변 좀비가 몰려옴 → 떠남
  function updateHeli(dt) {
    const p = G.p;
    if (!G.heli) {
      if (G.heliAt != null && G.time >= G.heliAt) {
        // 헬기: 플레이어를 쫓지 않고 여러 곳(도시 위주)을 들렀다 떠남 → 지나가는 곳마다 좀비를 몰고 다님
        const W0 = M.W, H0 = M.H, tw = (M.towns || []).filter(t => t.w * t.h > 30), wp = [];
        const n = 3 + ((rand() * 3) | 0);
        for (let i = 0; i < n; i++) {
          if (tw.length && rand() < .75) { const t = tw[(rand() * tw.length) | 0]; wp.push([t.x + t.w * (.2 + rand() * .6), t.y + t.h * (.2 + rand() * .6)]); }
          else wp.push([p.x + (rand() - .5) * 140, p.y + (rand() - .5) * 140]);
        }
        for (const q of wp) { q[0] = clamp(q[0], 4, W0 - 5); q[1] = clamp(q[1], 4, H0 - 5); }
        const a = rand() * TAU, sx = clamp(wp[0][0] + Math.cos(a) * 90, 2, W0 - 3), sy = clamp(wp[0][1] + Math.sin(a) * 90, 2, H0 - 3);
        G.heli = { ph: 'fly', x: sx, y: sy, a: Math.atan2(wp[0][1] - sy, wp[0][0] - sx), t: 0, nt: 0, rot: 0, wp, wi: 0 };
        G.heliAt = G.time + (2 + rand() * 2) * 24 * 60; // 다음은 2~4일 뒤
      } else { if (L.heliG) { L.heliG.remove(); L.heliG = null; } if (SFX.heli) SFX.heli(0, 0); return; }
    }
    const h = G.heli;
    h.t += dt; h.rot += dt * 40;
    let tx, ty, spd;
    const cur = h.wp && h.wp[h.wi];
    if (h.ph === 'fly' && cur) { tx = cur[0]; ty = cur[1]; spd = 6; }
    else if (h.ph === 'hover' && cur) { tx = cur[0] + Math.cos(h.t * .45) * 3.5; ty = cur[1] + Math.sin(h.t * .45) * 3.5; spd = 3; }
    else { h.ph = 'out'; tx = h.x + Math.cos(h.a) * 10; ty = h.y + Math.sin(h.a) * 10; spd = 7; }
    const dx = tx - h.x, dy = ty - h.y, d = Math.hypot(dx, dy);
    if (d > .05) { const m = Math.min(d, spd * dt); h.x += dx / d * m; h.y += dy / d * m; if (h.ph !== 'hover' || d > .5) h.a += angDiff(Math.atan2(dy, dx), h.a) * Math.min(1, dt * 2.5); }
    const pd = Math.hypot(h.x - p.x, h.y - p.y);
    if (!h.heard && pd < 70) { h.heard = 1; toast('멀리서 헬기 소리가 들린다…', 2800); }
    if (h.ph === 'fly' && d < 3) { h.ph = 'hover'; h.t = 0; h.hv = 14 + rand() * 16; if (pd < 25) { toast('헬기가 근처를 맴돈다 — 좀비가 몰려온다!', 3000); shake(.3); if (G.sleeping) wake('헬기 소리에 잠이 깼다!'); } }
    else if (h.ph === 'hover' && h.t > h.hv) { h.wi++; h.t = 0; if (h.wi >= h.wp.length) { h.ph = 'out'; h.a = rand() * TAU; if (pd < 60) toast('헬기 소리가 멀어진다', 2200); } else h.ph = 'fly'; }
    else if (h.ph === 'out' && (h.x < 1 || h.y < 1 || h.x > M.W - 2 || h.y > M.H - 2 || h.t > 40)) { G.heli = null; return; }
    // 소음: 맴도는 동안은 크게, 오고 갈 때는 조금
    h.nt -= dt;
    if (h.nt <= 0) { h.nt = 1.6; if (h.ph === 'hover') { noise(h.x, h.y, 22, false); pullDormant(h.x, h.y, 22, 2.2); } else { noise(h.x, h.y, 12, false); pullDormant(h.x, h.y, 12, 1.4); } } // 날아가는 길에도 좀비가 따라감
    const dist = Math.hypot(h.x - p.x, h.y - p.y);
    if (SFX.heli) SFX.heli(clamp(1 - dist / 70, 0, 1), clamp((h.x - p.x) / 18, -.9, .9));
    drawHeli(h);
  }
  function drawHeli(h) {
    if (!L.heliG) {
      const g = L.heliG = el('g', {}, L.sky);
      L.heliSpot = el('circle', { r: 3.4, fill: 'url(#lampGlow)', opacity: 0 }, g);
      L.heliSh = el('g', { opacity: .35 }, g);
      el('ellipse', { cx: 0, cy: 0, rx: 1.1, ry: .5, fill: '#000' }, L.heliSh); el('rect', { x: -2.4, y: -.12, width: 1.6, height: .24, fill: '#000' }, L.heliSh);
      L.heliBody = el('g', {}, g);
      const b = L.heliBody;
      el('path', { d: 'M-.4 -.55h1.2v.18h-1.2zM-.4 .37h1.2v.18h-1.2z', fill: '#1a1c18' }, b); // 스키드
      el('rect', { x: -2.5, y: -.1, width: 1.8, height: .2, rx: .06, fill: '#3a4230', stroke: '#111', 'stroke-width': .04 }, b); // 꼬리
      el('rect', { x: -2.6, y: -.35, width: .14, height: .7, rx: .04, fill: '#2a2e24' }, b); // 꼬리 날개
      el('ellipse', { cx: 0, cy: 0, rx: 1.05, ry: .46, fill: '#4b5134', stroke: '#111', 'stroke-width': .05 }, b);
      el('ellipse', { cx: .55, cy: 0, rx: .38, ry: .3, fill: '#1c2a33', stroke: '#111', 'stroke-width': .03 }, b); // 조종석 유리
      el('path', { d: 'M.45 -.15q.15 -.05 .25 .05', stroke: '#9fb8c8', 'stroke-width': .04, fill: 'none', opacity: .7 }, b);
      el('circle', { cx: 0, cy: 0, r: 2.1, fill: '#fff', opacity: .05 }, b); // 회전날개 궤적
      L.heliRot = el('path', { d: 'M-2.1 0H2.1M0 -2.1V2.1', stroke: '#111', 'stroke-width': .09, opacity: .55 }, b);
      el('circle', { cx: 0, cy: 0, r: .12, fill: '#111' }, b);
    }
    const deg = (h.a * 180 / Math.PI).toFixed(1);
    L.heliBody.setAttribute('transform', `translate(${h.x.toFixed(2)} ${h.y.toFixed(2)}) rotate(${deg})`);
    L.heliSh.setAttribute('transform', `translate(${(h.x + 1.3).toFixed(2)} ${(h.y + 1.7).toFixed(2)}) rotate(${deg})`);
    L.heliRot.setAttribute('transform', `rotate(${(h.rot * 57.3 % 360).toFixed(0)})`);
    L.heliSpot.setAttribute('cx', (h.x + .6).toFixed(2)); L.heliSpot.setAttribute('cy', (h.y + .9).toFixed(2));
    L.heliSpot.setAttribute('opacity', (G.night * (h.ph === 'hover' ? 1 : .5)).toFixed(2));
  }
  const CORPSE = 100000;
  const isCorpse = ci => ci >= CORPSE;
  const corpseOf = ci => G.corpses.find(c => c.id === ci - CORPSE);
  const PLACED = 200000, VEH = 300000;
  const isVeh = ci => ci >= VEH;
  const vehOf = ci => (G.vehicles || [])[ci - VEH];
  const isPlacedC = ci => ci >= PLACED && ci < VEH;
  const placedOf = ci => G.placed.find(b => b.id === ci - PLACED);
  const cItems = ci => isVeh(ci) ? vehTrunk(vehOf(ci)) : isPlacedC(ci) ? ((placedOf(ci) || {}).items || []) : isCorpse(ci) ? ((corpseOf(ci) || {}).items || []) : contItems(ci);
  const cName = ci => isVeh(ci) ? '자동차 트렁크' : isPlacedC(ci) ? ((placedOf(ci) || {}).type === 'pile' ? '바닥에 둔 물건' : (FURN[(placedOf(ci) || {}).kind] || ['가구'])[0]) : isCorpse(ci) ? '시체' : LOOT[M.containers[ci].kind].name;
  const cPos = ci => { if (isVeh(ci)) { const v = vehOf(ci); return v ? [v.x, v.y] : [-99, -99]; } if (isPlacedC(ci)) { const b = placedOf(ci); return b ? [b.x + .5, b.y + .5] : [-99, -99]; } if (isCorpse(ci)) { const c = corpseOf(ci); return c ? [c.x, c.y] : [-99, -99]; } const c = M.containers[ci]; return c.car ? [c.x + c.cw / 2, c.y + c.ch / 2] : [c.x + .5, c.y + .5]; };
  const cSearched = ci => isPlacedC(ci) ? true : isCorpse(ci) ? !!(corpseOf(ci) || {}).searched : G.searched.has(ci);
  // 좀비 소지품: 입던 옷 + 가끔 생존 물품
  const CORPSE_POOL = [['shirt', 2.2], ['cloth', 1.4], ['chips', .8], ['water', .6], ['bandage', .9], ['pills', .5], ['apple', .6], ['soda', .5], ['nails', .4], ['tape', .35], ['ammo', .3], ['knife', .25], ['screwdriver', .2]];
  function rollCorpse() {
    const out = [];
    if (rand() < .55) out.push(mkItem('shirt'));
    const n = rand() < .35 ? 0 : rand() < .75 ? 1 : 2;
    const tot = CORPSE_POOL.reduce((s, q) => s + q[1], 0);
    for (let i = 0; i < n; i++) { if (rand() >= LOOT_RATE) continue; let x = rand() * tot; for (const [id, w] of CORPSE_POOL) { x -= w; if (x <= 0) { out.push(mkItem(id)); break; } } }
    return out;
  }
  const JOB_LOOT = { hoodie: [['hoodie', .25]],  police: [['vest', .04], ['cap', .1], ['ammo', .5], ['pistol', .12], ['baton', .35]], medic: [['bandage', .7], ['pills', .6]], worker: [['gloves', .2], ['boots', .1], ['workpants', .1], ['hammer', .3], ['nails', .6], ['screwdriver', .3], ['wrench', .25], ['crowbar', .12]], soldier: [['milhelm', .15], ['milbag', .05], ['milboots', .1], ['ammo', .7], ['bandage', .4], ['can', .4], ['rammo', .35], ['machete', .12], ['rifle', .04]], office: [['soda', .3], ['chips', .3]], fire: [['firehelm', .12], ['firecoat', .06], ['fireaxe', .18], ['bandage', .5], ['cloth', .4], ['water', .4], ['crowbar', .08]], chef: [['hknife', .35], ['knife', .25], ['pan', .3], ['bread', .5], ['can', .4]], hunter: [['hikebag', .06], ['fieldjkt', .08], ['bolt', .5], ['rammo', .3], ['hknife', .3], ['machete', .08], ['crossbow', .08], ['rifle', .03]], golfer: [['golf', .45], ['water', .5], ['soda', .3]], guard: [['baton', .45], ['ammo', .35], ['bandage', .3], ['revolver', .06]], hazmat: [['bandage', .6], ['pills', .6], ['note', .35]], prisoner: [['knife', .12], ['chips', .3], ['note', .15]], soldier2: [], elder: [['pills', .5]], jogger: [['sneakers', .3], ['water', .6]] };
  function rollCorpseFor(lk) {
    const out = rollCorpse();
    for (const [id, pr] of (lk && JOB_LOOT[lk.ty]) || []) if (rand() < pr) out.push(mkItem(id));
    const nk = lk && { hazmat: 'fort', soldier: 'camp', prisoner: 'prison' }[lk.ty];
    for (const it of out) if (it.id === 'note' && nk) it.nid = pickNote(nk);
    if (nk && rand() < .25) { const n = mkItem('note'); n.nid = pickNote(nk); out.push(n); }
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
    if (P && P.hat) el('circle', { cx: .45, cy: -.08, r: .1, fill: ({ hardhat: '#e0b020', helmet: '#3e4430', firehelm: '#c8201a', toque: '#fbfaf6', orangecap: '#f06a10', blackcap: '#111214', visor: '#f2f0ea', beanie: P.bc || '#8a2a2a', bucket: '#8a7a5a' })[P.hat] || '#1b2433', stroke: '#000', 'stroke-width': .025 }, g); // 벗겨진 모자
    else if (P && P.hair !== 'bald') el('path', { d: 'M.24 -.07A.12 .12 0 0 1 .3 -.1Q.26 .02 .3 .13A.12 .12 0 0 1 .24 .1Z', fill: P.hc }, g);
    flattenOpacity(g);
    G.cid = Math.max(G.cid || 0, (id || 0) + 1);
    const c = { id: id != null ? id : G.cid++, x, y, a, shirt, g: g0, items: items || [], searched: !!searched, lk: lk || null };
    G.corpses.push(c);
    if (c.searched && !c.items.length) g0.setAttribute('opacity', .55);
    if (G.corpses.length > 70) { const o = G.corpses.shift(); o.g.remove(); if (G.openC === CORPSE + o.id) closeSheet(); }
  }

  /* ================= 충돌·시야 ================= */
  // 문·창문 상태 초기값: 바깥문은 닫힘, 안쪽 문은 열림, 창문은 멀쩡함
  const dsOf = k => G.ds[k];
  const dsIsDefault = (o, s) => !s.br && !s.b.length && (o.type === 'door' ? s.o === (o.interior ? 1 : 0) && s.h === DOOR_HP : s.h === WIN_HP);
  function dsSave() { const out = {}; for (const o of M.op) { const s = G.ds[o.k]; if (s && !dsIsDefault(o, s)) out[o.k] = s; } return out; } // 바뀐 문·창문만 저장
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
    if (r >= 9 && G.worldM && G.worldM.levels) floorNoise(x, y, r); // 계단 너머 층까지 들림
  }

  /* ================= 경로 ================= */
  function requestPath(z, urgent) {
    if (z.queued) return;
    z.queued = true;
    if (urgent) pathQueue.unshift(z); else pathQueue.push(z); // 추적 중인 좀비는 먼저 길 찾기
  }
  // 주변을 두리번거리며 찾을 지점
  function searchPoint(z) {
    for (let k = 0; k < 8; k++) {
      const tx = Math.floor(z.x + (rand() - .5) * 8), ty = Math.floor(z.y + (rand() - .5) * 8);
      if (tx > 0 && ty > 0 && tx < M.W - 1 && ty < M.H - 1 && !M.moveBlock[ty * M.W + tx]) { z.tx = tx + .5; z.ty = ty + .5; z.path = null; requestPath(z); return true; }
    }
    return false;
  }
  function processPaths() {
    let budget = 8;
    while (budget-- > 0 && pathQueue.length) {
      const z = pathQueue.shift();
      z.queued = false;
      if (z.dead) continue;
      const tx = clamp(Math.floor(z.tx), 0, M.W - 1), ty = clamp(Math.floor(z.ty), 0, M.H - 1);
      const path = AS.find(Math.floor(z.x), Math.floor(z.y), tx, ty, z.herd ? 7000 : 2600);
      if (z.herd) budget--; // 먼 길 찾기는 두 번 몫
      z.path = path; z.pi = 0; z.repath = path ? .7 + rand() * .3 : 1 + rand(); // 길이 없으면 1~2초 뒤에 다시 (매 프레임 재계산 방지)
      z.goalKey = ty * M.W + tx;
      if (!path) z.herd = false;
      if (!path && z.state === 'investigate') { z.state = 'idle'; }
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
    if (z.stuckT > 2.5) { z.stuckT = 0; z.path = null; z.herd = false; if (z.state === 'investigate' && rand() < .5) z.state = 'idle'; else requestPath(z); return false; }
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
  function ammoItem(def) { const id = (def && def.ammo) || (curWeapon().def.ammo) || 'ammo'; return G.p.inv.find(i => i.id === id && i.n > 0); }
  function ammoLeft(def) { const id = def.ammo || 'ammo'; let n = 0; for (const i of G.p.inv) if (i.id === id) n += i.n || 0; return n; }
  /* ===== 재장전 =====
     각 총마다 단계가 나뉘고, 단계가 끝날 때 해당 소리가 난다 (소리 이름 = 효과음 목록의 저장 이름)
     mag  : 한꺼번에 채우기 (권총·소총 탄창, 리볼버 실린더)
     each : 한 발씩 넣기 (산탄총·석궁) — 넣는 중 공격하면 넣은 만큼 쏠 수 있다 */
  const RELOAD = {
    pistol:   { kind: 'mag',  open: ['mag_out', .55, '탄창 빼는 중'], per: ['mag_in', 1.5, '탄창 끼우는 중'], close: ['slide', .4, '슬라이드 당기는 중', 1] },
    rifle:    { kind: 'mag',  open: ['mag_out', .6, '탄창 빼는 중'], per: ['mag_in', 1.6, '탄창 끼우는 중'], close: ['bolt_cycle', .55, '노리쇠 당기는 중', 1] },
    revolver: { kind: 'mag',  per: ['cyl_load', 3.0, '실린더에 탄 넣는 중'] }, // 열기·넣기·닫기를 한 번에
    shotgun:  { kind: 'each', per: ['shell_in', .6, '산탄 넣는 중'], close: ['pump', .45, '펌프 당기는 중', 1] },
    crossbow: { kind: 'each', per: ['xbow_load', 1.3, '시위 당기고 볼트 거는 중'] }, // 한 번에
  };
  const CYCLE_SFX = { shotgun: ['pump', .38], rifle: ['bolt_cycle', .5] }; // 쏜 뒤 다음 발 준비 소리
  function rlSpeed() { return Math.max(.5, 1 - .05 * skillLv('gun')); }
  function reloadState() { return G.p.rl || null; }
  function canReload(it) { const d = it && ITEMS[it.id]; return !!(d && d.mag && (it.mag || 0) < d.mag && ammoLeft(d) > 0); }
  function startReload(quiet) {
    const p = G.p, w = curWeapon(), it = w.item, d = w.def;
    if (!it || !d.mag || p.inCar != null || G.dead || G.sleeping) return false;
    if (p.rl) return false;
    if ((it.mag || 0) >= d.mag) { if (!quiet) toast('이미 가득 찼다'); return false; }
    if (!ammoLeft(d)) { if (!quiet) toast((ITEMS[d.ammo] || ITEMS.ammo).name + '이(가) 없다'); SFX.play('dryfire', { kind: it.id }); return false; }
    if (G.actions.length) cancelActions();
    const R = RELOAD[it.id] || RELOAD.pistol, empty = !(it.mag > 0);
    const q = [];
    if (R.open) q.push({ k: 'open', s: R.open });
    q.push({ k: 'per', s: R.per });
    p.rl = { uid: it.uid, id: it.id, q, i: 0, t: 0, R, empty, loaded: 0 };
    p.rl.dur = R.open ? R.open[1] * rlSpeed() : R.per[1] * rlSpeed();
    return true;
  }
  function cancelReload(msg) { if (!G.p.rl) return; G.p.rl = null; if (msg) toast(msg); }
  function tickReload(dt) {
    const p = G.p, r = p.rl; if (!r) return;
    const it = p.inv.find(i => i.uid === r.uid);
    if (!it || p.equip !== r.uid || p.inCar != null || G.dead || G.sleeping) { p.rl = null; return; }
    r.t += dt; if (r.t < r.dur) return;
    const st = r.q[r.i], d = ITEMS[it.id], R = r.R;
    SFX.play(st.s[0], { kind: it.id }); noise(p.x, p.y, 2, false);
    r.i++; r.t = 0;
    if (st.k === 'per') {
      const need = d.mag - (it.mag || 0);
      const take = Math.min(R.kind === 'mag' ? need : 1, ammoLeft(d));
      if (take > 0) { consume(d.ammo, take); it.mag = (it.mag || 0) + take; r.loaded += take; }
      if (R.kind === 'each' && it.mag < d.mag && ammoLeft(d) > 0) r.q.push({ k: 'per', s: R.per });
      else if (R.close && (!R.close[3] || r.empty)) r.q.push({ k: 'close', s: R.close });
    }
    if (r.i >= r.q.length) { p.rl = null; gainXP('gun', .5); return; }
    r.dur = r.q[r.i].s[1] * rlSpeed();
  }
  function reloadLabel() { const r = G.p.rl; if (!r) return ''; const st = r.q[r.i]; return st ? st.s[2] : ''; }
  function unloadGun(it) {
    const d = ITEMS[it.id]; if (!d.mag || !(it.mag > 0)) return;
    if (G.p.rl && G.p.rl.uid === it.uid) cancelReload();
    const n = it.mag;
    queueAction({ uid: it.uid, sfx: 'ammo_out', label: d.name + ' 탄 빼는 중', icon: d.icon, dur: Math.min(2.5, .4 + n * .15) * rlSpeed(),
      valid: () => G.p.inv.includes(it) && it.mag > 0,
      done: () => { const k = it.mag; it.mag = 0; stackAdd({ uid: G.uid++, id: d.ammo, n: k }); toast(`${(ITEMS[d.ammo] || ITEMS.ammo).name} ${k}발을 뺐다`); } });
  }

  // 무기별 타격음 종류 (효과음 목록 기준)
  const HIT_KIND = { bat: 'blunt', nailbat: 'blunt', golf: 'blunt', hockey: 'blunt', baton: 'blunt', plank: 'blunt',
    pipe: 'metal', crowbar: 'metal', wrench: 'metal', pan: 'metal', hammer: 'metal',
    knife: 'blade', hknife: 'blade', machete: 'blade', katana: 'blade', spear: 'stab', screwdriver: 'stab',
    axe: 'axe', fireaxe: 'axe', sledge: 'heavy', pickaxe: 'heavy', shovel: 'heavy', brick: 'heavy' };
  const HEAVY_SWING = { sledge: 1, pickaxe: 1, axe: 1, fireaxe: 1, shovel: 1 };
  function playerAttack() {
    const p = G.p;
    if (p.inCar != null) return honk();
    if (p.cd > 0 || G.sleeping || G.dead) return;
    stopRest();
    const w = curWeapon(), def = w.def;
    if (p.rl) { // 재장전 중: 한 발씩 넣는 총은 넣은 만큼 바로 쏠 수 있다
      if (p.rl.R.kind === 'each' && w.item && w.item.mag > 0 && p.rl.loaded > 0) cancelReload(); else return;
    }
    if (def.type === 'gun' && w.item && !(w.item.mag > 0)) { // 빈 총: 여분 탄이 있으면 자동 재장전
      if (!startReload(true)) { p.cd = p.cdMax = .35; if (!ammoLeft(def)) toast('빈 총이다 — ' + (ITEMS[def.ammo] || ITEMS.ammo).name + '이(가) 없다'); }
      return;
    }
    if (G.actions.length) cancelActions('행동을 멈췄다');
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
      p.cd = p.cdMax = def.cd * (1 - .03 * skillLv('gun'));
      const quiet = def.noise < 10; // 석궁: 조용함
      SFX.play(quiet ? 'crossbow' : 'gun', quiet ? { vol: .8, kind: w.item.id } : { rev: .9, kind: w.item.id });
      w.item.mag--;
      { const cy = CYCLE_SFX[w.item.id]; if (cy && w.item.mag > 0) setTimeout(() => SFX.play(cy[0], { kind: w.item.id }), cy[1] * 1000); }
      noise(p.x, p.y, def.noise, !quiet);
      if (!quiet) shake(def.hits || def.pierce ? .55 : .38, p.face + Math.PI, def.hits || def.pierce ? 11 : 7);
      // 산탄총: 부채꼴로 여러 명 / 소총: 일직선으로 관통
      if (def.hits || def.pierce) {
        const list = [];
        for (const z of G.zombies) {
          if (z.dead) continue;
          const dx = z.x - p.x, dy = z.y - p.y, d = Math.hypot(dx, dy);
          if (d > def.range || !losClear(p.x, p.y, z.x, z.y)) continue;
          if (def.hits) { if (Math.abs(angDiff(Math.atan2(dy, dx), p.face)) > def.spread) continue; }
          else { const along = dx * Math.cos(p.face) + dy * Math.sin(p.face), side = Math.abs(-dx * Math.sin(p.face) + dy * Math.cos(p.face)); if (along < 0 || side > .45) continue; }
          list.push([d, z]);
        }
        list.sort((a, b) => a[0] - b[0]);
        const n = def.hits || def.pierce;
        list.slice(0, n).forEach(([d, z], i) => { const fall = def.hits ? clamp(1.25 - d / def.range, .45, 1) : (i ? .7 : 1); if (rand() < .92 + .02 * skillLv('gun') - d * .02) { damageZombie(z, def.dmg * fall * (.9 + rand() * .2), p.face, def.hits ? .6 : .4, !!def.hits); gainXP('gun', 2); } });
        const rd = rayDist(p.x, p.y, p.face, def.range);
        for (const s2 of def.hits ? [-.22, 0, .22] : [0]) { const a = p.face + s2, r2 = def.hits ? rd * .8 : rd; addFx('tracer', { x1: p.x + Math.cos(p.face) * .5, y1: p.y + Math.sin(p.face) * .5, x2: p.x + Math.cos(a) * r2, y2: p.y + Math.sin(a) * r2 }); }
        addFx('muzzle', { x: p.x + Math.cos(p.face) * .7, y: p.y + Math.sin(p.face) * .7, a: p.face });
        return;
      }
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
    SFX.play('swing', { heavy: !!(w.item && HEAVY_SWING[w.item.id]), vol: .9 });
    noise(p.x, p.y, 3.5, false);
    p.noiseR = Math.max(p.noiseR, 3.5);
    let hits = 0;
    const maxHits = def.hits || 1; // 무기 등급: 하급 1명 · 일반 2명 · 고급 3명
    const cands = [];
    for (const z of G.zombies) {
      if (z.dead) continue;
      const d = Math.hypot(z.x - p.x, z.y - p.y);
      if (d > def.range + .32) continue;
      const ad = Math.abs(angDiff(Math.atan2(z.y - p.y, z.x - p.x), p.face));
      if (ad > .95) continue;
      if (!losClear(p.x, p.y, z.x, z.y)) continue;
      cands.push([d + ad * .5, z]);
    }
    cands.sort((a, b) => a[0] - b[0]); // 앞쪽·가까운 좀비부터
    for (const [, z] of cands) {
      let dmg = def.dmg * (.85 + rand() * .3) * tired * (1 + .06 * skillLv('melee')) * woundMul('arm');
      if (z.down > 0) dmg *= 2;
      if (rand() < .12 + .015 * skillLv('melee')) dmg *= 1.8;
      gainXP('melee', 1.5);
      damageZombie(z, dmg, p.face, def.knock, rand() < def.knock * .5);
      hits++;
      if (hits >= maxHits) break;
    }
    if (hits) { shake(.2 + .06 * hits, p.face, 3.5); G.hitStop = .055; SFX.play('hit', { w: w.item ? (HIT_KIND[w.item.id] || 'blunt') : 'fist' }); SFX.play('flesh', { vol: .8 }); }
    if (hits && w.item && w.item.dur != null) {
      w.item.dur--;
      if (w.item.dur <= 0) {
        p.inv.splice(p.inv.indexOf(w.item), 1); p.equip = null;
        toast(def.name + '이(가) 부서졌다'); updateWeaponLook(); SFX.play('breakw');
      }
    }
  }
  function damageZombie(z, dmg, a, knock, knockDown) {
    z.hp -= dmg; z.flash = .12; z.stun = .45; z.wind = 0; z.lunge = 0;
    z.state = 'chase'; z.lostT = 0; z.tx = G.p.x; z.ty = G.p.y; z.herd = false;
    const tr = trait(z);
    knock *= 1 - (tr.knock || 0);
    z.kbx = Math.cos(a) * knock / .14; z.kby = Math.sin(a) * knock / .14; z.kbt = .14; // 밀려나기: 순간이동 대신 0.14초 동안 미끄러지듯
    if (knockDown && rand() >= (tr.knock || 0)) z.down = 1.4;
    addFx('blood', { x: z.x, y: z.y, a });
    if (z.hv == null) z.hv = (rand() * 3) | 0; // 좀비마다 맞는 목소리 1개 고정 (3종 중)
    if (z.hp > 0) SFX.at('zombie_hurt', z.x, z.y, { range: 14, v: z.hv });
    if (z.hp <= 0) {
      z.dead = true; z.g.remove(); G.kills++;
      gainXP(curWeapon().def.type === 'gun' ? 'gun' : 'melee', 3);
      shake(.15);
      SFX.at('kill', z.x, z.y, { range: 16 });
      addCorpse(z.x, z.y, a, z.shirt, rollCorpseFor(z.lk), false, undefined, z.lk);
    }
  }

  /* ================= 좀비 AI ================= */
  // 좀비 발소리: 8칸 안의 좀비만, 멀수록 작게 · 좌우 방향 구분 · 한꺼번에 몇 마리분만
  function zombieStep(z, dist, p) {
    if (!dist || G.sleeping) return;
    const run = z.state === 'chase', tr = trait(z);
    z.stepAcc = (z.stepAcc || 0) + dist;
    const stride = (run ? .62 : .46) * (tr.hp > 2 ? 1.15 : 1);
    if (z.stepAcc < stride) return;
    z.stepAcc = 0;
    const d = Math.hypot(z.x - p.x, z.y - p.y); if (d > 8) return;
    const now = performance.now(); if (!L.zsT || now - L.zsT > 250) { L.zsT = now; L.zsN = 0; }
    if (L.zsN >= 3) return; L.zsN++;
    const tt = M.t[Math.floor(z.y) * M.W + Math.floor(z.x)], snow = !G.lv && (G.snowCov || 0) > .3 && tt !== DT.T.FLOOR && tt !== DT.T.DOOR;
    const heavy = tr.hp > 2 ? 1.25 : 1, fast = tr.spd > 1 ? 1.12 : 1;
    SFX.at(snow ? 'zombie_step_snow' : run ? 'zombie_run' : 'zombie_step', z.x, z.y, { range: 8, vol: (run ? .9 : .6) * heavy * (tt === DT.T.GRASS ? .8 : 1), rate: fast / (heavy > 1 ? 1.12 : 1), w: tt === DT.T.FLOOR ? 'wood' : 'hard' });
  }
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
        const every = md > 60 ? (OPTS.perf ? 14 : 8) : (OPTS.perf ? 4 : 3);
        if ((G.fc + zi) % every) continue;
        dtz = dt * every;
      }
      const zx0 = z.x, zy0 = z.y;
      stepZombie(z, dtz, p, night, sightR);
      if (md < 12) zombieStep(z, Math.hypot(z.x - zx0, z.y - zy0), p);
    }
    function stepZombie(z, dt, p, night, sightR) {
      z.cd -= dt; z.think -= dt; z.repath -= dt;
      if (z.flash > 0) z.flash -= dt;
      if (z.kbt > 0) { const t = Math.min(dt, z.kbt); z.kbt -= t; z.x += z.kbx * t; z.y += z.kby * t; resolve(z); }
      if (z.wind > 0) { // 공격 준비 동작 (좀비마다 속도 다름) → 끝나면 아직 가까우면 공격
        z.wind -= dt; z.lunge = 1 - Math.max(0, z.wind) / (z.windT || .3);
        if (z.wind <= 0) { z.lunge = 0; const dd = Math.hypot(p.x - z.x, p.y - z.y); if (dd < (p.inCar != null ? 1.5 : .95) && !(z.down > 0) && !(z.stun > 0)) zombieAttack(z); }
      }
      if (z.down > 0) { z.down -= dt; return; }
      if (z.stun > 0) { z.stun -= dt; return; }
      const dx = p.x - z.x, dy = p.y - z.y, d = Math.hypot(dx, dy);
      if (z.think <= 0) {
        z.think = .22 + rand() * .15;
        const sr = sightR * (G.sleeping ? .55 : 1) * (p.crouch ? .6 : 1); // 웅크리면 잘 안 보임
        const facing = Math.abs(angDiff(Math.atan2(dy, dx), z.face)) < (p.crouch ? 1.2 : 1.7);
        if (d < sr && (d < (p.crouch ? 1.4 : 2.5) || facing) && losClear(z.x, z.y, p.x, p.y)) {
          if (z.state !== 'chase') {
            z.state = 'chase'; z.path = null; z.search = 0; z.herd = false;
            if (!z.alerted || G.time - z.alerted > 20) {
              z.alerted = G.time;
              if (trait(z).scream) { SFX.at('scream', z.x, z.y, { range: 30, vol: 1.4 }); noise(z.x, z.y, 18, true, z); if (!G._scrT || G.time - G._scrT > 30) { G._scrT = G.time; toast('비명 좀비가 소리를 질렀다 — 주변 좀비가 몰려온다!', 2600); } }
            }
          }
          z.lostT = 0; z.tx = p.x; z.ty = p.y; z.seenVx = p.vx || 0; z.seenVy = p.vy || 0;
        } else if (z.state === 'chase') {
          if (z.lostT === 0) { // 방금 놓침 → 마지막으로 본 곳 + 가던 방향 조금 앞
            const q = freeNear(z.tx + clamp(z.seenVx || 0, -3, 3) * .8, z.ty + clamp(z.seenVy || 0, -3, 3) * .8);
            if (q) { z.tx = q[0]; z.ty = q[1]; }
            z.path = null; requestPath(z, true);
          }
          z.lostT += .3;
          if (z.lostT > 9) { z.state = 'investigate'; z.search = 2; z.path = null; requestPath(z); }
        }
      }
      let spd;
      const tr = trait(z), slow = Math.min(1, tr.spd || 1);
      if (z.state === 'chase') {
        spd = (night > .5 ? 1.5 : 1.15) * z.spdMul * (tr.spd || 1);
        if (z.lostT === 0 && d < 6 && moveClear(z.x, z.y, p.x, p.y)) {
          if (d > .6) steer(z, dx / d, dy / d, spd, dt);
          else z.face += angDiff(Math.atan2(dy, dx), z.face) * Math.min(1, dt * 8);
          z.path = null;
        } else {
          const gx = z.tx - z.x, gy = z.ty - z.y, gd = Math.hypot(gx, gy);
          if (z.lostT > 0 && gd < .7) { // 마지막 위치에 도착 → 주변 수색
            z.state = 'investigate'; z.search = 2 + ((rand() * 3) | 0); z.path = null; searchPoint(z);
          } else if (gd < 7 && gd > .05 && moveClear(z.x, z.y, z.tx, z.ty)) { steer(z, gx / gd, gy / gd, spd, dt); z.path = null; } // 뚫려 있으면 바로 달려감 (길 찾기 안 기다림)
          else {
            const key = Math.floor(z.ty) * M.W + Math.floor(z.tx);
            if ((!z.path || z.goalKey !== key) && z.repath <= 0) requestPath(z, true);
            followPath(z, spd, dt);
          }
        }
        if (d < (p.inCar != null ? 1.35 : .75) && z.cd <= 0 && z.lostT === 0 && !(z.wind > 0)) { // 좀비마다 공격 간격·준비 시간이 다름
          if (z.acd == null) { const tr0 = trait(z); z.acd = (1 + rand() * .7) * (tr0.spd > 1 ? .8 : tr0.hp > 2 ? 1.3 : 1); z.windT = .16 + rand() * .22; }
          z.cd = z.acd; z.wind = z.windT; }
      } else if (z.state === 'investigate') {
        spd = (z.search ? .95 : .8) * z.spdMul * slow;
        if (!z.path && !z.queued) requestPath(z);
        if (z.path && followPath(z, spd, dt)) {
          if (z.search > 0) { z.search--; z.face += (rand() - .5) * 2; if (!searchPoint(z)) z.search = 0; } // 두리번거리며 더 찾아봄
          else { z.state = 'idle'; z.path = null; z.herd = false; z.wander = 2 + rand() * 4; }
        }
      } else {
        spd = .45 * z.spdMul * slow;
        z.wander -= dt;
        if (z.wander <= 0) { // 배회: 3~9초마다 근처(최대 6칸) 아무 데나 어슬렁
          z.wander = 3 + rand() * 6;
          if (rand() < .75) {
            for (let k = 0; k < 6; k++) {
              const tx = Math.floor(z.x + (rand() - .5) * 12), ty = Math.floor(z.y + (rand() - .5) * 12);
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
    if (p.inCar != null && G.vehicles) { // 차 안: 차를 두드림
      const v = G.vehicles[p.inCar]; v.hp = Math.max(0, Math.round(v.hp - 1 - rand())); shake(.06); SFX.at('car_hit', z.x, z.y, { range: 8, vol: .6 });
      if (!G._chT || G.time - G._chT > 20) { G._chT = G.time; toast('좀비가 차를 두드린다!', 1600); }
      if (v.hp <= 0 && !v._dead) { v._dead = 1; toast('차가 망가졌다 — 내려야 한다', 2400); }
      return;
    }
    if (G.sleeping) wake('좀비에게 습격당했다!');
    stopRest('좀비에게 습격당했다!');
    const a = Math.atan2(z.y - p.y, z.x - p.x);
    if (Math.hypot(input.jx + input.kx, input.jy + input.ky) < .12) p.face = a;
    const hit = rand() <= (G.night > .5 ? .6 : .5);
    SFX.at('growl', z.x, z.y, { range: 10 });
    G.dmgInd.push({ a, t: 0, hit });
    if (G.dmgInd.length > 4) G.dmgInd.shift();
    if (!hit) return;
    if (G.actions.length) cancelActions('공격받아 행동이 끊겼다');
    const gdef = gearStats().def;
    const dmg = (5 + rand() * 6) * (1 - Math.min(.45, gdef / 100));
    L.hitAt = performance.now();
    p.hp -= dmg;
    hurtFlash();
    shake(.6, a + Math.PI, 10);
    const r = rand(), pb = biteChance(gdef), ps = scratchChance(gdef);
    SFX.play(r < pb ? 'bite' : 'hurt');
    wearHit();
    if (r < pb) { if (!p.infected) { p.infected = true; p.infT = 0; } const w = addWound('bite'); toast(PART_NAME[w.p] + ' 물렸다…', 2600); }
    else if (r < pb + ps) { const w = addWound('scratch'); toast(PART_NAME[w.p] + ' 긁혔다 — 출혈'); }
    else if (rand() < .03) { const w = addWound('fracture'); toast(PART_NAME[w.p] + '이(가) 부러졌다! 부목이 필요하다', 3000); }
    else { const w = addWound('bruise'); toast('공격당했다 — ' + PART_NAME[w.p] + ' 타박상'); }
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
    } else if (kind === 'breath') {
      e = el('circle', { cx: o.x, cy: o.y, r: .07, fill: '#e8eef4', opacity: .5 }, L.fx);
      o.parts = [{ c: e, x: o.x, y: o.y, vx: Math.cos(o.a) * .5, vy: Math.sin(o.a) * .5 }];
      life = 1.3;
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
      if (f.kind === 'breath') { f.e.setAttribute('r', (.07 + k * .22).toFixed(3)); f.e.setAttribute('opacity', ((1 - k) * .45).toFixed(2)); }
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
  // 폰 설정: 성능 모드 / 왼손 조작 / 버튼 크기
  const OPTS = (() => { try { return Object.assign({ perf: 0, left: 0, bs: 1, zoom: 1 }, JSON.parse(localStorage.getItem('deadtown_opts') || '{}')); } catch (e) { return { perf: 0, left: 0, bs: 1 }; } })();
  function saveOpts() { try { localStorage.setItem('deadtown_opts', JSON.stringify(OPTS)); } catch (e) {} applyOpts(); }
  function applyOpts() {
    const h = document.documentElement;
    h.classList.toggle('lefty', !!OPTS.left);
    h.style.setProperty('--bs', OPTS.bs);
    requestAnimationFrame(() => { // 추천 버튼 위치: 조이스틱과 버튼 사이 가운데
      const z = $('joyzone'), j = $('joy'), b = $('btns'), c = $('btnCrouch');
      let ja = z.offsetLeft + j.offsetLeft, jb = ja + j.offsetWidth; const ba = b.offsetLeft, bb = ba + b.offsetWidth;
      ja = Math.min(ja, c.offsetLeft); jb = Math.max(jb, c.offsetLeft + c.offsetWidth); // 웅크리기 버튼까지 피해서
      L.quickMid = ja < ba ? (jb + ba) / 2 : (bb + ja) / 2; L._psx = null;
    });
  }
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
  // 알림 소리 구분: 위험 / 안 됨 / 해냄 / 그 밖의 알림
  const TOAST_WARN = /좀비|물렸|습격|골절|피를|출혈|위험|비명|헬기|밤이 온다|망가|부서|쓰러|감염|다쳤|충돌|쾅|단수|전기가 끊|몰려/;
  const TOAST_DENY = /없다|필요하다|수 없|부족|못 |못한|안 된|막혀|잠겨|가득|졸리지|먼저/;
  const TOAST_OK = /했다|완료|만들었|장착|챙겼|올랐|레벨|채웠|놓았|피웠|고쳤|설치|찾았|열렸|뺐다/;
  function toast(msg, ms) {
    if (msg) SFX.play(TOAST_WARN.test(msg) ? 'toast_warn' : TOAST_DENY.test(msg) ? 'toast_deny' : TOAST_OK.test(msg) ? 'toast_ok' : 'toast');
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
  // 입은 옷은 무게의 30%만 (배낭은 그대로)
  function invWeight() { const w = G.p.wear || {}, worn = new Set(); for (const k in w) if (w[k] != null && k !== 'back') worn.add(w[k]); return G.p.inv.reduce((s, i) => s + (i.w != null ? i.w : ITEMS[i.id].w) * (i.n || 1) * (worn.has(i.uid) ? .3 : 1), 0); }
  /* ---------- 장비 칸 (옷·배낭·보조무기) ---------- */
  const SLOTS = [['head', '머리', 'helm'], ['body', '상의', 'jacket'], ['legs', '하의', 'pants'], ['feet', '신발', 'boots'], ['hands', '장갑', 'gloves'], ['back', '등', 'pack']];
  const SLOT_NAME = { head: '머리', body: '상의', legs: '하의', feet: '신발', hands: '장갑', back: '등', main: '주무기', sub: '보조무기' };
  const wornIt = s => { const p = G.p, u = s === 'main' ? p.equip : s === 'sub' ? p.equip2 : p.wear && p.wear[s]; return u != null ? p.inv.find(i => i.uid === u) || null : null; };
  const isWorn = it => !!(G.p.wear && Object.values(G.p.wear).includes(it.uid));
  const wornSlot = it => { const w = G.p.wear || {}; for (const k in w) if (w[k] === it.uid) return k; return null; };
  // 없어진 물건(버림·부서짐·재료로 씀)은 칸에서 빼기. 바뀌면 true
  function gearFix() {
    const p = G.p; let ch = false;
    p.wear = p.wear || {};
    for (const k in p.wear) if (p.wear[k] != null && !p.inv.some(i => i.uid === p.wear[k])) { p.wear[k] = null; ch = true; }
    if (p.equip2 != null && (p.equip2 === p.equip || !p.inv.some(i => i.uid === p.equip2))) { p.equip2 = null; }
    if (ch) refreshLook();
    return ch;
  }
  function gearStats() {
    let def = 0, spd = 1, cap = BASE_CAP;
    for (const [k] of SLOTS) { const it = wornIt(k); if (!it) continue; const d = ITEMS[it.id]; if (d.def) def += d.def * (d.dur && it.dur != null && it.dur / (it.max || d.dur) < .25 ? .5 : 1); if (d.spd) spd *= 1 + d.spd / 100; if (d.cap) cap += d.cap; }
    return { def: Math.round(def), spd, cap };
  }
  function capKg() { return gearStats().cap; }
  const biteChance = def => .07 * (1 - Math.min(.7, def / 50));
  const scratchChance = def => .30 * (1 - Math.min(.6, def / 60));
  // 처음 시작할 때 입고 있는 옷 (예전 저장에도 똑같이 줌)
  function giveStarterGear(p) {
    p.wear = p.wear || {};
    for (const [slot, id] of [['body', 'oldjacket'], ['legs', 'jeans'], ['feet', 'sneakers'], ['back', 'oldpack']]) { if (p.wear[slot] != null) continue; const it = mkItem(id); if (it.dur != null) it.dur = Math.round(ITEMS[id].dur * .8); p.inv.push(it); p.wear[slot] = it.uid; }
  }
  // 캐릭터 그림: 입은 상의 색 · 멘 배낭 모양 반영
  function gearLook() {
    const lk = Object.assign({}, G.look || defaultLook());
    const b = G.p && wornIt('back'), t = G.p && wornIt('body');
    if (G.p && G.p.wear) {
      if (!b) lk.pack = LOOK.pack.indexOf('none'); else if (ITEMS[b.id].pack) lk.pack = LOOK.pack.indexOf(ITEMS[b.id].pack);
      if (t && ITEMS[t.id].color) lk.jc = ITEMS[t.id].color; else if (!t) lk.jc = '#d8d4c8';
      const hd = wornIt('head'); lk.head = hd ? ITEMS[hd.id].art : null;
    }
    return lk;
  }
  function refreshLook() { if (!L.pg || !L.player || !G || !G.running) return; L.pg.remove(); makePlayerG(); }
  // 맞으면 입은 옷 하나가 조금 닳음
  function wearHit() {
    const p = G.p, c = SLOTS.map(s => wornIt(s[0])).filter(it => it && it.dur != null);
    if (!c.length) return;
    const it = c[(rand() * c.length) | 0];
    it.dur -= 1 + (rand() < .3 ? 1 : 0);
    if (it.dur <= 0) { p.inv.splice(p.inv.indexOf(it), 1); gearFix(); toast(ITEMS[it.id].name + ' — 다 해져서 버렸다', 2200); }
  }

  /* ---------- 겨울: 눈 · 쌓인 눈 · 발자국 (좀비가 따라옴) ---------- */
  function updateWinter(dm) {
    const p = G.p, air = airTemp(), r = G.rain || 0;
    L.snowing = r > .05 && air < 1 && !G.lv;
    if (L.snowing) G.snowCov = Math.min(1, (G.snowCov || 0) + r * dm * .004);
    else if (G.snowCov > 0 && air > 2) G.snowCov = Math.max(0, G.snowCov - dm * .0004 * (air - 1));
    if (L.snowG) { const o = M.level ? 0 : Math.round((G.snowCov || 0) * .72 * 20) / 20; if (o !== L._snowO) { L._snowO = o; L.snowG.setAttribute('opacity', o); } }
    // 빗물 받이: 바깥에 두면 비(눈)가 올 때 참
    if (r > .05 && !G.lv) for (const b of G.placed) if (b.type === 'raincol' && M.t[b.y * M.W + b.x] !== DT.T.FLOOR) { const o = b.w || 0; b.w = Math.min(20, o + r * dm * .04 * (L.snowing ? .5 : 1)); if (Math.floor(b.w) !== Math.floor(o)) drawRainCol(b); }
    // 발자국: 눈이 쌓인 바깥을 걸으면 남고, 좀비가 따라온다
    G.tracks = G.tracks || [];
    if ((G.snowCov || 0) > .3 && !G.lv && p.inCar == null && G.gait !== 'idle' && M.t[Math.floor(p.y) * M.W + Math.floor(p.x)] !== DT.T.FLOOR) {
      L.fpT = (L.fpT || 0) - dm;
      if (L.fpT <= 0) {
        L.fpT = G.gait === 'sprint' ? .35 : .55; L.fpS = -(L.fpS || 1);
        const a = p.face, ox = Math.cos(a + Math.PI / 2) * .1 * L.fpS, oy = Math.sin(a + Math.PI / 2) * .1 * L.fpS;
        const e = el('ellipse', { cx: (p.x + ox).toFixed(2), cy: (p.y + oy).toFixed(2), rx: .13, ry: .075, fill: '#6a7680', opacity: .75, transform: `rotate(${(a * 180 / Math.PI).toFixed(0)} ${(p.x + ox).toFixed(2)} ${(p.y + oy).toFixed(2)})` }, L.decals);
        G.tracks.push({ x: p.x, y: p.y, t: G.time, e });
        if (G.tracks.length > 240) G.tracks.shift().e.remove();
      }
    }
    if (G.tracks.length && (G.tracks[0].t < G.time - 360 || (G.snowCov || 0) < .15)) { const t = G.tracks.shift(); t.e.remove(); } // 6시간 지나거나 눈이 녹으면 사라짐
    // 좀비가 발자국을 발견하면 더 새로운 발자국 쪽으로
    L.trkT = (L.trkT || 0) - dm;
    if (L.trkT <= 0 && G.tracks.length > 4) {
      L.trkT = 2;
      const T0 = G.tracks;
      for (const z of G.zombies) {
        if (z.dead || z.state === 'chase' || z.down > 0 || (z.state === 'investigate' && z.path)) continue;
        let bi = -1, bd = 3.5;
        for (let i = 0; i < T0.length; i += 2) { const d = Math.abs(T0[i].x - z.x) + Math.abs(T0[i].y - z.y); if (d < bd) { bd = d; bi = i; } }
        if (bi < 0) continue;
        const nx = T0[Math.min(T0.length - 1, bi + 10)];
        z.state = 'investigate'; z.tx = nx.x; z.ty = nx.y; z.path = null; requestPath(z);
      }
    }
  }
  /* ---------- 부상 부위 ----------
     팔(공격력↓) · 다리(느려짐) · 몸통(지구력 회복↓) · 머리. 골절은 부목을 대야 제대로 낫는다 */
  const PART_NAME = { arml: '왼팔', armr: '오른팔', legl: '왼다리', legr: '오른다리', torso: '몸통', head: '머리' };
  const WOUND = { scratch: ['긁힘', 720, 1], cut: ['베임', 1440, 1], bite: ['물림', 2160, 1], bruise: ['타박상', 480, 0], fracture: ['골절', 4320, 0] };
  function randPart(pool) { pool = pool || [['arml', .2], ['armr', .2], ['legl', .15], ['legr', .15], ['torso', .22], ['head', .08]]; let r = rand() * pool.reduce((t, x) => t + x[1], 0); for (const [k, w] of pool) { r -= w; if (r <= 0) return k; } return pool[0][0]; }
  function addWound(k, part) {
    const p = G.p; p.wounds = p.wounds || [];
    const w = { p: part || randPart(k === 'fracture' ? [['arml', 1], ['armr', 1], ['legl', 1.2], ['legr', 1.2]] : null), k, h: WOUND[k][1] };
    const same = p.wounds.find(x => x.p === w.p && x.k === k); // 같은 곳 같은 상처는 합침
    if (same) { same.h = Math.max(same.h, w.h); same.band = false; } else p.wounds.push(w);
    if (p.wounds.length > 8) p.wounds.shift();
    if (WOUND[k][2]) p.bleed = true;
    if (k === 'fracture') SFX.play('bone');
    return same || w;
  }
  function woundMul(kind) { // kind: 'leg' 이동 · 'arm' 공격
    let m = 1;
    for (const w of G.p.wounds || []) { if (!w.p.startsWith(kind)) continue; m *= w.k === 'fracture' ? (w.spl ? .8 : .6) : w.k === 'bite' || w.k === 'cut' ? .88 : .94; }
    return Math.max(.45, m);
  }
  function updateWounds(dm) {
    const p = G.p; if (!p.wounds || !p.wounds.length) return;
    const aid = 1 + .05 * skillLv('aid');
    for (const w of p.wounds) w.h -= dm * aid * (w.dis ? 1.5 : 1) * (w.k === 'fracture' && !w.spl ? .33 : 1) * (G.sleeping ? 1.5 : 1) * (w.band || !WOUND[w.k][2] ? 1 : .5);
    const before = p.wounds.length;
    p.wounds = p.wounds.filter(w => w.h > 0);
    if (p.wounds.length < before) toast('상처 하나가 아물었다');
  }
  /* ---------- 기온 · 체온 ----------
     기온: 날이 갈수록 추워짐(가을→겨울) + 하루 중 오후 3시가 가장 따뜻 + 비 오면 -3도
     체감: 건물 안 +7 · 차 안 +5 · 모닥불 옆 +12 · 옷 보온 · 움직임 · 젖으면 추움 */
  function airTemp(t) {
    t = t == null ? G.time : t;
    const day = Math.floor(t / 1440), hr = (t % 1440) / 60;
    return Math.max(-6, 17 - .35 * day) + 6 * Math.sin((hr - 9) / 24 * 2 * Math.PI) - (G.rain || 0) * 3;
  }
  function feelTemp() {
    const p = G.p, air = airTemp();
    const tile = M.t[Math.floor(p.y) * M.W + Math.floor(p.x)];
    const indoor = !!G.lv || tile === DT.T.FLOOR || tile === DT.T.STAIRS, car = p.inCar != null;
    const fire = G.placed.some(b => b.type === 'campfire' && Math.hypot(b.x + .5 - p.x, b.y + .5 - p.y) < 3.2);
    return { air, f: air + (indoor ? 7 : 0) + (car ? 5 : 0) + (fire ? 12 : 0), indoor, car, fire };
  }
  function warmth() { let w = 0; for (const [k] of SLOTS) { const it = wornIt(k); if (it) w += ITEMS[it.id].warm || 0; } return Math.round(w * (1 - .6 * (G.p.wet || 0))); }
  function updateTemp(dm) {
    const p = G.p; if (p.bt == null) p.bt = 36.6; if (p.wet == null) p.wet = 0;
    const e = feelTemp();
    if ((G.rain || 0) > .05 && !e.indoor && !e.car) p.wet = Math.min(1, p.wet + G.rain * dm * (L.snowing ? .005 : .012));
    else p.wet = Math.max(0, p.wet - dm * (e.fire ? .04 : e.indoor ? .006 : .003));
    const eff = e.f + warmth() * 1.6 + (G.gait === 'sprint' ? 5 : G.gait === 'jog' ? 2.5 : 0) - p.wet * 4;
    let tgt = 36.6;
    if (eff < 16) tgt -= (16 - eff) * .12; else if (eff > 30) tgt += (eff - 30) * .12;
    if (G.sleeping && G.inBed) tgt = Math.max(tgt, 36.2); // 이불 덮고 자면 덜 추움
    tgt = clamp(tgt, 33, 40);
    p.bt += (tgt - p.bt) * Math.min(1, dm * .008);
    L.feel = e; L.eff = eff;
    if (p.bt < 35.5) p.energy -= .015 * dm;
    if (p.bt < 34.8) p.hp -= .02 * dm;
    if (p.bt > 37.6) p.hyd -= .02 * dm;
    if (p.bt > 38.6) p.hp -= .02 * dm;
  }
  // 온도계 색: 추움 파랑 → 쾌적 흰색 → 더움 빨강
  const tempColor = t => t < 0 ? '#6aa8ff' : t < 8 ? '#8ac4ff' : t < 15 ? '#b8dcf0' : t < 24 ? '#e9e3d2' : t < 29 ? '#ffb060' : '#ff5a4a';
  /* ---------- 상태별 화면 효과 ----------
     가장 위험한 2가지만 강하게 보여줌. 흔들림·울렁임은 설정(OPTS.calm)으로 끌 수 있음 */
  // shakeOn(설정 '화면 흔들림')이 꺼지면 떨림·울렁임도 끔
  const COND_W = { crit: 6, bleed: 5, cold: 4, heat: 3, sick: 4, tired: 3, winded: 2, starve: 3, wet: 1 };
  function condList() {
    const p = G.p, c = {};
    if (G.dead) return c;
    if (p.bleed) c.bleed = 1;
    if (p.hp < 30) c.crit = clamp((30 - p.hp) / 25, .35, 1);
    if (p.bt < 35.5) c.cold = clamp((35.5 - p.bt) / 1.4, .35, 1);
    if (p.bt > 37.6) c.heat = clamp((p.bt - 37.6) / 1.4, .6, 1);
    if (p.energy < 25 && !G.sleeping) c.tired = clamp((25 - p.energy) / 22, .3, 1);
    if (p.endu < 15) c.winded = clamp((15 - p.endu) / 15, .6, 1);
    if ((p.infected && p.infT > 300) || p.sick > 0) c.sick = p.infected && p.infT > 600 ? 1 : .55;
    if (p.full < 8 || p.hyd < 8) c.starve = 1;
    if (p.wet > .3) c.wet = clamp(p.wet, .35, 1);
    return c;
  }
  function condImg(kind) { // 서리·물방울 그림 (처음 한 번만 그림)
    if (L['_ci' + kind]) return L['_ci' + kind];
    const cv = document.createElement('canvas'); cv.width = 640; cv.height = 300; const c = cv.getContext('2d'), R = DT.rng(kind === 'frost' ? 7 : 9);
    const edge = () => { const s = R() * 4 | 0, t = R(); const d = Math.pow(R(), 2.2) * 70; return s === 0 ? [t * 640, d] : s === 1 ? [t * 640, 300 - d] : s === 2 ? [d, t * 300] : [640 - d, t * 300]; };
    if (kind === 'frost') {
      for (let i = 0; i < 90; i++) { const [x, y] = edge(); const r = 10 + R() * 34, g = c.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, 'rgba(235,245,255,.35)'); g.addColorStop(1, 'rgba(235,245,255,0)'); c.fillStyle = g; c.fillRect(x - r, y - r, r * 2, r * 2); }
      c.strokeStyle = 'rgba(235,245,255,.5)'; c.lineCap = 'round';
      const br = (x, y, a, len, w, dep) => { const x2 = x + Math.cos(a) * len, y2 = y + Math.sin(a) * len; c.lineWidth = w; c.beginPath(); c.moveTo(x, y); c.lineTo(x2, y2); c.stroke(); if (dep > 0) for (const da of [-1.05, 1.05]) br(x + (x2 - x) * .55, y + (y2 - y) * .55, a + da, len * .45, w * .7, dep - 1); if (dep > 0) br(x2, y2, a + (R() - .5) * .6, len * .6, w * .8, dep - 1); };
      for (let i = 0; i < 110; i++) { const [x, y] = edge(); const a = Math.atan2(150 - y, 320 - x) + (R() - .5) * 1.6; br(x, y, a, 6 + R() * 16, .5 + R() * .9, 2); }
      for (let i = 0; i < 500; i++) { const [x, y] = edge(); c.fillStyle = `rgba(240,248,255,${(.15 + R() * .35).toFixed(2)})`; c.fillRect(x, y, 1.5, 1.5); }
    } else {
      for (let i = 0; i < 70; i++) { const [x, y] = edge(); const r = 2 + R() * 7; c.fillStyle = 'rgba(160,190,215,.22)'; c.beginPath(); c.ellipse(x, y, r, r * 1.25, 0, 0, 7); c.fill(); c.strokeStyle = 'rgba(220,235,250,.35)'; c.lineWidth = 1; c.stroke(); c.fillStyle = 'rgba(255,255,255,.6)'; c.beginPath(); c.arc(x - r * .35, y - r * .4, r * .25, 0, 7); c.fill(); }
    }
    return (L['_ci' + kind] = `url(${cv.toDataURL()})`);
  }
  function updateCond(dt) {
    const box = $('cond'); if (!box || !G) return;
    L.condT = (L.condT || 0) - dt;
    if (L.condT <= 0) {
      L.condT = .25;
      const c = condList(), top = Object.keys(c).sort((a, b) => COND_W[b] * c[b] - COND_W[a] * c[a]).slice(0, 2);
      const show = k => top.includes(k) ? c[k] : 0;
      const set = (cls, v, on) => { const e = box.querySelector('.cl-' + cls); const o = v.toFixed(2); if (e._o !== o) { e._o = o; e.style.opacity = o; } e.classList.toggle('on', !!on && v > 0); };
      set('bleed', show('bleed') * (.55 + .45 * clamp((60 - G.p.hp) / 50, 0, 1)), true);
      box.querySelector('.cl-bleed').style.setProperty('--bd', (1.15 - .45 * clamp((60 - G.p.hp) / 50, 0, 1)).toFixed(2) + 's');
      set('crit', show('crit') * .85); set('critv', show('crit') * .8);
      const fr = show('cold'); if (fr && !L._frostSet) { L._frostSet = 1; box.querySelector('.cl-frost').style.backgroundImage = condImg('frost'); }
      set('frost', fr);
      set('heat', show('heat') * .9, true);
      set('sick', show('sick'), true);
      const wt = show('wet'); if (wt && !L._wetSet) { L._wetSet = 1; box.querySelector('.cl-wet').style.backgroundImage = condImg('wet'); }
      set('wet', wt * .9);
      set('starve', show('starve'));
      set('winded', show('winded') * .9, true);
      L.tiredK = show('tired');
      box.classList.toggle('droop', L.tiredK > .75);
      L.shiver = !shakeOn ? 0 : (fr > .7 ? fr : 0);
      L.sway = !shakeOn ? 0 : show('sick');
      box.classList.toggle('calm', !shakeOn);
      L.coldK = fr; L.bleedK = show('bleed') || (G.p.bleed ? 1 : 0);
    }
    // 피곤: 가끔 눈 감았다 뜸 (심할수록 자주·길게)
    if (L.tiredK > 0) {
      L.blinkT = (L.blinkT == null ? 2 : L.blinkT) - dt;
      if (L.blinkT <= 0) { L.blinkT = 7 - 5 * L.tiredK + Math.random() * 2; box.classList.add('blink'); clearTimeout(L._blTO); L._blTO = setTimeout(() => box.classList.remove('blink'), 260 + 600 * L.tiredK); }
    } else if (box.classList.contains('blink')) box.classList.remove('blink');
    if (G.paused) return;
    const p = G.p;
    // 배고픔·목마름은 소리로 (가끔)
    if (!G.sleeping && !G.dead) {
      if (p.full < 25) { L.stT = (L.stT == null ? 8 : L.stT) - dt; if (L.stT <= 0) { L.stT = (p.full < 8 ? 14 : 30) + Math.random() * 15;  } }
      if (p.hyd < 25) { L.cgT = (L.cgT == null ? 12 : L.cgT) - dt; if (L.cgT <= 0) { L.cgT = (p.hyd < 8 ? 16 : 34) + Math.random() * 15;  } }
    }
    // 추우면 입김
    if (L.coldK > 0 && p.inCar == null) { L.brT = (L.brT || 0) - dt; if (L.brT <= 0) { L.brT = 1.8 - .6 * L.coldK; addFx('breath', { x: p.x + Math.cos(p.face) * .3, y: p.y + Math.sin(p.face) * .3, a: p.face }); } }
    // 피 흘리며 움직이면 핏방울
    if (p.bleed && G.gait !== 'idle') { L.bdT = (L.bdT || 0) - dt; if (L.bdT <= 0) { L.bdT = .9; const s2 = el('circle', { cx: p.x + (Math.random() - .5) * .3, cy: p.y + (Math.random() - .5) * .3, r: .04 + Math.random() * .05, fill: '#6e0810', opacity: .8 }, L.decals); G.splats = G.splats || []; G.splats.push(s2); if (G.splats.length > 120) G.splats.shift().remove(); } }
  }
  function update(dt) {
    const p = G.p;
    const scale = G.sleeping ? 30 : G.resting ? 3 : 1;
    const dm = dt * scale;
    G.time += dm;
    G.night = nightLevel(G.time);
    if (M.dark) G.night = Math.max(G.night, .82); // 지하는 늘 어두움

    let mx = input.jx + input.kx, my = input.jy + input.ky;
    let mag = Math.hypot(mx, my);
    if (mag > 1) { mx /= mag; my /= mag; mag = 1; }
    if (G.sleeping) { mx = my = 0; mag = 0; }
    if (G.resting && (mag > .12 || p.inCar != null)) stopRest(); // 움직이면 휴식 끝
    const car = p.inCar != null && G.vehicles && !G.lv ? G.vehicles[p.inCar] : null;
    if (car) { driveUpdate(car, dt, mx, my, mag); mx = my = 0; mag = 0; } // 운전 중: 걷기 대신 차를 움직임
    else if (G._engOn !== false && SFX.engine) { SFX.engine(0, 0); G._engOn = false; }
    if (car) G._engOn = true;
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
    const spd = ({ walk: 1.35, jog: 2.35, sprint: 3.5 })[gait] * (p.energy < 20 ? .8 : 1) * (p.hp < 25 ? .85 : 1) * (wt > capKg() ? .7 : 1) * (p.crouch ? .5 : 1) * gearStats().spd * woundMul('leg');
    if (moving) {
      mx /= (mag || 1); my /= (mag || 1); // 속도는 걸음 단계로만 정함
      p.stepT = (p.stepT || 0) - spd * dt;
      if (p.stepT <= 0) {
        p.stepT = running ? .78 : gait === 'jog' ? .7 : .6;
        const tt = M.t[Math.floor(p.y) * M.W + Math.floor(p.x)];
        SFX.play('step', { surface: tt === DT.T.FLOOR || tt === DT.T.DOOR ? 'wood' : (!G.lv && (G.snowCov || 0) > .3) ? 'snow' : tt === DT.T.GRASS ? 'grass' : 'hard', run: gait !== 'walk', vol: (gait === 'walk' ? .45 : .8) * (p.crouch ? .5 : 1) });
      }
      const ak = Math.floor(p.y + my * .6) * M.W + Math.floor(p.x + mx * .6), ao = M.opAt[ak];
      if (ao && ao.type === 'door') { const sd = G.ds[ak]; if (!sd.o && !sd.br && !sd.b.length && !G.actions.some(a => a.kind === 'door')) { G.nearOp = { t: 'op', o: ao }; doAlt('doorOpen'); } }
      if (p.atkT <= 0) p.face += angDiff(Math.atan2(my, mx), p.face) * Math.min(1, dt * 9);
    }
    // 관성: 바로 최고 속도가 나지 않고 서서히 붙고, 멈출 때도 살짝 미끄러짐. 크게 방향을 틀면 잠깐 느려짐
    {
      const turn = moving ? Math.max(.35, Math.cos(Math.min(Math.PI, Math.abs(angDiff(Math.atan2(my, mx), p.face))))) : 1;
      const tvx = moving ? mx * spd * turn : 0, tvy = moving ? my * spd * turn : 0;
      const k = moving ? 6.5 : 10;
      p.vx = (p.vx || 0) + (tvx - (p.vx || 0)) * Math.min(1, dt * k);
      p.vy = (p.vy || 0) + (tvy - (p.vy || 0)) * Math.min(1, dt * k);
      if (Math.abs(p.vx) + Math.abs(p.vy) > .01) {
        const onWin = M.t[Math.floor(p.y) * M.W + Math.floor(p.x)] === DT.T.WINDOW;
        const ox = p.x, oy = p.y, f = onWin ? .5 : 1;
        p.x += p.vx * dt * f; p.y += p.vy * dt * f;
        resolve(p);
        if (dt > 0) { p.vx = (p.x - ox) / dt / f; p.vy = (p.y - oy) / dt / f; } // 벽에 막히면 속도도 줄어듦
      } else { p.vx = p.vy = 0; }
    }
    p.atkT -= dt; p.cd -= dt;
    tickReload(dt);
    p.noiseT -= dt;
    const nr = moving ? ({ walk: 1, jog: 3, sprint: 6.5 })[gait] * (p.crouch ? .5 : 1) : 0; // 웅크리면 소리 절반
    p.noiseR = Math.max(nr, p.noiseR - dt * 6);
    if (moving && p.noiseT <= 0) { p.noiseT = running ? .4 : .6; noise(p.x, p.y, nr, false); }
    if (running) p.endu -= 6 * dt * (p.crouch ? 1.4 : 1); else p.endu += (gait === 'jog' ? 4 : moving ? 8 : 12) * dt * (G.resting ? 3 : 1) * ((p.wounds || []).some(w => w.p === 'torso') ? .75 : 1); // 질주 약 17초 · 서 있으면 약 8초에 회복
    p.endu = clamp(p.endu, 0, 100);
    G.isRunning = running;
    if (mag > .3 && G.actions.length && !G.actions.every(a => a.kind === 'door' || a.move)) cancelActions('이동해서 행동을 멈췄다'); // 무기 바꾸기·들기는 걸으면서도 됨
    if (!G.sleeping) updateActions(dt);
    if (input.attackHeld || keys.space) playerAttack();

    const act = running ? 1.35 : gait === 'jog' ? 1.1 : 1;
    p.full -= .045 * dm * act;
    p.hyd -= .065 * dm * act;
    if (G.sleeping) p.energy += .22 * dm * (G.inBed ? 1.5 : 1); else p.energy -= .05 * dm * (running ? 1.2 : 1); // 깨어 있으면 약 하루 반에 바닥
    p.full = clamp(p.full, 0, 100); p.hyd = clamp(p.hyd, 0, 100); p.energy = clamp(p.energy, 0, 100);
    updateTemp(dm);
    updateWounds(dm);
    updateWinter(dm);
    if (p.full <= 0) p.hp -= .03 * dm;
    if (p.hyd <= 0) p.hp -= .05 * dm;
    if (p.bleed) p.hp -= .12 * dm;
    if (p.infected) { p.infT += dm; if (p.infT > 600) p.hp -= .035 * dm; }
    if (p.bandT > 0) p.bandT -= dm;
    if (p.sick > 0) { p.sick -= dm; p.hp -= .012 * dm; p.hyd -= .03 * dm; }
    if (!p.bleed && !(p.infected && p.infT > 600) && p.full > 40 && p.hyd > 40 && !(p.bt < 35.5 || p.bt > 38)) p.hp += .02 * dm * (G.sleeping && G.inBed ? 2 : 1);
    p.hp = Math.min(100, p.hp);
    if (p.hp <= 0) return die();

    G.zoneT -= dt; if (G.zoneT <= 0) { G.zoneT = .5; if (G.resting && G.zombies.some(z => !z.dead && z.state === 'chase' && Math.hypot(z.x - p.x, z.y - p.y) < 12)) stopRest('좀비가 다가온다!'); if (!G.lv) { updateZombieZone(); updateTownNow(); } }
    updateFollowers(dt);
    G.fdA = (G.fdA || 0) + dt; if (G.fdA >= 1) { G.fdA = 0; driftFloors(); }
    updateZombies(dt);
    processPaths();
    if (!G.lv) { updateHerd(dt); updateHeli(dt); } // 건물 위·아래층에 있을 땐 바깥 사건은 멈춤

    // 정전
    if (G.waterOn && G.time >= (G.waterOffAt || 1e12)) { G.waterOn = 0; toast('수도가 끊겼다 — 이제 물은 직접 구해야 한다 (빗물·변기 물통)', 3600); }
    if (G.power && G.time >= G.powerOffAt) { G.power = 0; toast('전기가 끊겼다 — 냉장고가 멈추고 가로등이 꺼졌다', 3200); }
    const hour = Math.floor(G.time / 60);
    if (hour !== G.lastHour) ageFood(60 * Math.max(1, hour - G.lastHour));
    if (hour !== G.lastHour) {
      G.lastHour = hour;
      const alive = G.zombies.filter(z => !z.dead).length + (G.zdormN || 0);
      const KZ = Math.max(1, M.KA * .8) * (OPTS.perf ? .7 : 1);
      if (G.lv) { /* 층 안에서는 새로 생기지 않음 */ }
      else if (G.night > .5 && alive < 120 * KZ) spawnZombies(Math.round((G.sleeping ? 2 : 5) * KZ), 18, true);
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
    { let fd = 99; if (!G.lv) for (const b of G.placed) if (b.type === 'campfire') fd = Math.min(fd, Math.hypot(b.x + .5 - p.x, b.y + .5 - p.y));
      const tb = p.inCar == null && p.endu < 20 ? clamp(1.15 - p.endu / 20, .3, 1) : 0; // 지구력을 다 썼을 때만 헐떡임
      L.breath = (L.breath || 0) + (tb - (L.breath || 0)) * Math.min(1, dt * (tb > (L.breath || 0) ? 1.5 : .6));
      SFX.update(dt, { rain: G.rain, x: p.x, y: p.y, night: G.night, hp: p.hp, dead: G.dead, sleeping: G.sleeping, indoor: ptile === DT.T.FLOOR,
        snowing: !!L.snowing, fire: clamp(1 - fd / 7, 0, 1), breath: L.breath }); }
    G.saveT += dt;
    if (G.saveT > 30) { G.saveT = 0; save(false); }
  }

  /* ================= 렌더 ================= */
  function render(dt) {
    const p = G.p;
    clockT += dt;
    if (!G.paused) updateFx(dt);
    updateCond(dt);
    { const tz = (p.inCar != null && !G.lv) ? .72 : 1; L.dz = (L.dz || 1) + (tz - (L.dz || 1)) * Math.min(1, dt * 2.5); if (Math.abs(L.dz - tz) < .004) L.dz = tz; }
    { const tc = 1.25 * (p.crouch && p.inCar == null ? 1.25 : 1); L.cz = (L.cz || 1) + (tc - (L.cz || 1)) * Math.min(1, dt * 4); if (Math.abs(L.cz - tc) < .003) L.cz = tc; } // 기본 카메라 = 예전 웅크린 거리, 웅크리면 25% 더 확대 (캐릭터 크기는 그대로) // 운전하면 멀리 보이게 (목표에 닿으면 멈춤 → 다시 그리지 않음)
    ZOOM = (VW > VH ? VH / 9 : Math.min(VW, VH) / 12.5) * (OPTS.zoom || 1) * L.dz * (L.cz || 1);
    const tr = G.trauma || 0, s2 = tr * tr * 16;
    const ox = (s2 ? s2 * (Math.sin(clockT * 47) * .6 + Math.sin(clockT * 83 + 1.3) * .4) : 0) + (G.kx || 0);
    const oy = (s2 ? s2 * (Math.sin(clockT * 53 + 2.1) * .6 + Math.sin(clockT * 71 + .4) * .4) : 0) + (G.ky || 0) + (L.shiver ? Math.sin(clockT * 57) * L.shiver * 1.4 : 0) + (L.sway ? Math.sin(clockT * .7 + 1) * L.sway * 7 : 0);
    const ox2 = (L.shiver ? Math.sin(clockT * 43 + 1) * L.shiver * 1.4 : 0) + (L.sway ? Math.sin(clockT * .9) * L.sway * 9 : 0);
    // 플레이어 화면 위치 (가방 패널이 열리면 남은 왼쪽 영역 가운데로)
    const sheetOn = !$('sheet').classList.contains('hidden');
    if (sheetOn) { L.dgT = (L.dgT || 0) - dt; if (L.dgT <= 0) { L.dgT = .25; updateDanger(); } }
    const panelW = 0; // 메뉴는 전체 화면
    const psx = (VW - panelW) / 2, psy = VH * .5;
    if (L._psx !== psx) { L._psx = psx; $('act').style.left = (L.quickMid || psx) + 'px'; $('toast').style.left = psx + 'px'; $('quick').style.left = (sheetOn ? psx : (L.quickMid || psx)) + 'px'; }
    // 운전 중 일정 속도(시속 20km)를 넘으면 카메라를 진행 방향 앞쪽으로 부드럽게 옮겨 앞이 더 보이게
    {
      const car = p.inCar != null && G.vehicles && !G.lv ? G.vehicles[p.inCar] : null;
      let tx = 0, ty = 0;
      if (car) {
        const kmh = Math.abs(car.v) * KMH, k = clamp((kmh - 20) / 40, 0, 1), dir = car.v < 0 ? car.a + Math.PI : car.a;
        tx = Math.cos(dir) * k * (VW * .3 / ZOOM); ty = Math.sin(dir) * k * (VH * .3 / ZOOM); // 가로는 화면 30%, 세로도 30%까지
      }
      const f = 1 - Math.exp(-dt * 1.8); // 스무스하게 (순간 이동 없음)
      L.lax = (L.lax || 0) + (tx - (L.lax || 0)) * f; L.lay = (L.lay || 0) + (ty - (L.lay || 0)) * f;
      if (Math.abs(L.lax) < .002 && !tx) L.lax = 0; if (Math.abs(L.lay) < .002 && !ty) L.lay = 0;
    }
    const camX = psx - (p.x + L.lax) * ZOOM + ox + ox2, camY = psy - (p.y + L.lay) * ZOOM + oy;
    L.world.setAttribute('transform', `translate(${camX.toFixed(1)} ${camY.toFixed(1)}) scale(${ZOOM.toFixed(3)})`);
    if (L.sky) L.sky.setAttribute('transform', `translate(${camX.toFixed(1)} ${camY.toFixed(1)}) scale(${ZOOM.toFixed(3)})`);
    // 바닥은 기본 배율 크기로 한 번만 그리고, 확대/축소는 CSS 배율로만 (다시 그리지 않음 → 손가락 줌이 부드러움)
    updateChunks(camX, camY, !L.chunks.size);
    { const hide = p.inCar != null && !G.lv; if (L._pgh !== hide) { L._pgh = hide; L.pg.style.display = hide ? 'none' : ''; } }
    renderVehicles(dt);
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
    V.R = G.sleeping ? 0 : lerp(12, 5.5, G.night) * (1 - .18 * (G.rain || 0)) * (p.inCar != null && !G.lv ? 1.6 : 1); // 운전 중엔 전조등·앞유리로 더 멀리
    const vkey = `${p.x.toFixed(2)},${p.y.toFixed(2)},${p.face.toFixed(2)},${V.R.toFixed(2)},${G.placed.length},${G.dsV},${VW},${VH},${ZOOM.toFixed(1)},${(L.lax || 0).toFixed(1)},${(L.lay || 0).toFixed(1)}`;
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
    const hw = VW / 2 / ZOOM + 2 + Math.abs(L.lax || 0), hh = VH / ZOOM + 2 + Math.abs(L.lay || 0); // 카메라가 앞으로 가도 어둠이 화면을 다 덮게
    const l = p.x - hw, r = p.x + hw, t = p.y - hh, b = p.y + hh;
    L.dark.setAttribute('d', `M${l.toFixed(1)} ${t.toFixed(1)}H${r.toFixed(1)}V${b.toFixed(1)}H${l.toFixed(1)}Z` + (pts.length && V.R > 0 ? 'M' + pts.join('L') + 'Z' : ''));
    }
    const lop = (G.night * .95 * (G.power ? 1 : 0)).toFixed(2);
    const fop = G.night.toFixed(2);
    if (L._fop !== fop) { L._fop = fop; for (const c of L.fires.children) c.setAttribute('fill-opacity', fop); }
    if (L._lop !== lop) { L._lop = lop; for (const c of L.lamps.children) c.setAttribute('fill-opacity', lop); }
    if (G.flashT > 0) { G.flashT -= dt; L.flash.setAttribute('opacity', Math.max(0, G.flashT * 2.2).toFixed(2)); } else if (L._fl !== 0) { L._fl = 0; L.flash.setAttribute('opacity', 0); }
    const dop = (lerp(.5, .93, G.night) * (1 - .06 * (G.rain || 0)) + .05 * (G.rain || 0)).toFixed(2);
    if (L._dop !== dop) { L._dop = dop; L.dark.setAttribute('fill-opacity', dop); } // 도형 투명도(opacity)는 화면 전체를 따로 합성해서 느림
    renderFog(dt, camX, camY);
    cullWorld(false);
    const tn = (.32 * G.night).toFixed(2);
    if (L._tn !== tn) { L._tn = tn; L.tint.style.opacity = tn; }

    // 좀비 + 화면 밖 위협
    const threats = [];
    for (const z of G.zombies) {
      if (z.dead) continue;
      const vis = Math.abs(z.x - p.x) < VW / 2 / ZOOM + 2 && Math.abs(z.y - p.y) < VH / 2 / ZOOM + 3 && inVision(z.x, z.y);
      if (vis !== z.vis) { z.vis = vis; if (vis) L.zombies.appendChild(z.g); else z.g.remove(); }
      if (vis) {
        { const td = z.down > 0 ? 75 : 0; z.dr = (z.dr || 0) + (td - (z.dr || 0)) * Math.min(1, dt * (td ? 9 : 5)); if (Math.abs(z.dr - td) < .5) z.dr = td; } // 쓰러질 때 부드럽게 기울기
        const lg = z.lunge > 0 ? Math.sin(z.lunge * Math.PI) * .22 : 0, lx = z.x + Math.cos(z.face) * lg, ly = z.y + Math.sin(z.face) * lg; // 공격할 때 앞으로 달려듦
        z.g.setAttribute('transform', `translate(${lx.toFixed(3)} ${ly.toFixed(3)}) rotate(${(z.face * 180 / Math.PI + z.dr).toFixed(1)})`);
        if ((z.down > 0) !== !!z._dn) { z._dn = z.down > 0; if (!z.kd) z.kd = el('circle', { r: .44, fill: 'none', stroke: '#e9e3d2', 'stroke-width': .04, 'stroke-dasharray': '.12 .1', opacity: .55 }, z.g); z.kd.style.display = z._dn ? '' : 'none'; } // 쓰러짐 표시 (크기는 그대로)
        // 비틀거리며 걷기 (2프레임에 한 번 갱신 — 성능)
        const mv = (z.state === 'chase' ? 1.6 : (z.path ? 1 : .35)) * (trait(z).spd || 1); // 러너는 다리도 빨리 움직임
        z.wph += dt * 5 * mv;
        if (((G.fc || 0) + (z.wph * 10 | 0)) & 1) continue;
        const s1 = Math.sin(z.wph), s2 = Math.sin(z.wph * .5);
        // 비틀비틀: 좌우로 쏠리고, 한쪽 발은 질질 끌듯 짧게
        const kk = z.state === 'chase' ? 1.3 : mv > .5 ? 1 : .3;
        z.inner.setAttribute('transform', z.state === 'chase' ? `translate(.05 ${(.025 * s2).toFixed(3)}) rotate(${(s2 * 10).toFixed(1)})` : `translate(0 ${(.02 * s2 * kk).toFixed(3)}) rotate(${(s2 * 7).toFixed(1)})`);
        z.fl.setAttribute('cx', (.11 * s1 * kk).toFixed(3));
        z.fr.setAttribute('cx', (-.07 * s1 * kk).toFixed(3));
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
      if (c.car) { // 차량: 차체 아무 쪽에서나
        const d = Math.hypot(clamp(p.x, c.x, c.x + c.cw) - p.x, clamp(p.y, c.y, c.y + c.ch) - p.y) + .45;
        if (d < nd) { nd = d; near = i; }
        continue;
      }
      const d = Math.hypot(c.x + .5 - p.x, c.y + .5 - p.y);
      if (d < nd && losClear(p.x, p.y, c.x + .5, c.y + .5)) { nd = d; near = i; }
    }
    for (const c of G.corpses) {
      if (c.searched && !c.items.length) continue;
      const d = Math.hypot(c.x - p.x, c.y - p.y);
      if (d < Math.min(nd, 1.3) && losClear(p.x, p.y, c.x, c.y)) { nd = d; near = CORPSE + c.id; }
    }
    for (const b of G.placed) {
      if (!((b.type === 'furn' && FURN_CONT[b.kind]) || (b.type === 'pile' && b.items && b.items.length))) continue;
      const d = Math.hypot(b.x + .5 - p.x, b.y + .5 - p.y) + (b.type === 'pile' ? .15 : 0);
      if (d < nd) { nd = d; near = PLACED + b.id; }
    }
    if (G.vehicles && !G.lv && G.p.inCar == null) for (const v of G.vehicles) { // 자동차 트렁크 (뒤쪽)
      const bx = v.x - Math.cos(v.a) * 1.05, by = v.y - Math.sin(v.a) * 1.05, d = Math.hypot(bx - p.x, by - p.y) + .2;
      if (d < nd) { nd = d; near = VEH + v.id; }
    }
    if (G.p.inCar != null) near = -1;
    G.nearC = near;
    findInteract();
    if (G.openC >= 0) { const [ox, oy] = cPos(G.openC); if (Math.hypot(ox - p.x, oy - p.y) > 2) closeSheet(); }
    G.nearBench = -1;
    for (let i = 0; i < G.placed.length; i++) {
      const b = G.placed[i];
      if (Math.hypot(b.x + .5 - p.x, b.y + .5 - p.y) < 1.7) { G.nearBench = i; break; }
    }
    if (near >= 0) {
      const [hx, hy] = cPos(near), cc = near < CORPSE ? M.containers[near] : null, hw = cc && cc.car ? cc.cw : 1, hh = cc && cc.car ? cc.ch : 1;
      L.hl.setAttribute('width', hw + .1); L.hl.setAttribute('height', hh + .1);
      L.hl.setAttribute('x', (hx - hw / 2 - .05).toFixed(2)); L.hl.setAttribute('y', (hy - hh / 2 - .05).toFixed(2));
      L.hl.setAttribute('opacity', (.55 + .45 * Math.sin(clockT * 7)).toFixed(2));
    } else L.hl.setAttribute('opacity', 0);

    // 버튼 링 (매 프레임)
    const cdFrac = p.rl ? 1 - clamp(p.rl.t / (p.rl.dur || 1), 0, 1) : clamp(p.cd / (p.cdMax || 1), 0, 1);
    $('atkRing').style.strokeDashoffset = (RING_C * cdFrac).toFixed(1);
    $('btnAttack').classList.toggle('cool', cdFrac > 0 && !p.rl);
    $('btnAttack').classList.toggle('rl', !!p.rl);
    { const w = curWeapon(), show = w.def.type === 'gun' && !!w.item && p.inCar == null, full = show && (w.item.mag || 0) >= w.def.mag, k = show ? (p.rl ? 'r' : full ? 'f' : canReload(w.item) ? 'y' : 'n') + (w.item.mag || 0) : '';
      if (L._rk !== k) { L._rk = k; const b = $('btnReload'); b.classList.toggle('hidden', !show); b.classList.toggle('on', !!p.rl); b.classList.toggle('dim', show && !p.rl && k[0] !== 'y'); b.classList.toggle('mt', show && !(w.item.mag > 0)); } }
    $('joyRing').style.strokeDashoffset = (RING_C * (1 - p.endu / 100)).toFixed(1);
    const gk = G.gait || 'idle';
    const gk2 = gk + (p.crouch ? 'c' : '');
    if (L._gk !== gk2) { L._gk = gk2; const jw = $('joy'); jw.dataset.g = gk; $('gaitLbl').textContent = p.crouch ? ({ idle: '웅크림', walk: '살금살금', jog: '웅크려 뛰기', sprint: '웅크려 질주' })[gk] : ({ idle: '', walk: '걷기', jog: '달리기', sprint: '질주' })[gk]; $('btnCrouch').classList.toggle('on', !!p.crouch); }
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
  // 빠른 칸: 가방 정보창에서 '빠른 칸'으로 등록한 물건 (최대 3개, 종류로 기억 → 다 쓰면 같은 종류 다음 것)
  const QUICK_MAX = 3;
  const quickable = d => d.type === 'food' || d.type === 'drink' || d.type === 'med';
  function quickList() {
    const p = G.p, q = [];
    if (G.sleeping || G.dead) return q;
    const pins = (p.quick || []).filter(id => ITEMS[id]);
    for (const id of pins) {
      const list = p.inv.filter(i => i.id === id && !busyUid(i.uid)), n = p.inv.filter(i => i.id === id).reduce((s, i) => s + (i.n || 1), 0);
      const fr = list.sort((a, b) => (b.age || 0) - (a.age || 0))[0]; // 오래된 것부터
      q.push([fr ? 'use' : 'none', fr || null, ITEMS[id].icon, ITEMS[id].name, 0, n]);
    }
    const sug = [];
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
    const out = q.filter(x => x[5] != null), rest = q.filter(x => x[5] == null && !(x[1] && pins.includes(x[1].id)));
    return out.concat(rest.slice(0, 3));
  }
  function renderQuick() {
    const q = quickList();
    const html = q.map(([a, it, ic, label, urgent, n]) => n != null ? `<button class="qb pin${a === 'none' ? ' none' : ''}" data-q="${a}" data-uid="${it ? it.uid : ''}">${ico(ic)}${label}<em>${n}</em></button>` : `<button class="qb${urgent ? ' urgent' : ''}" data-q="${a}" data-uid="${it ? it.uid : ''}">${ico(ic)}${label}</button>`).join('');
    const box = $('quick');
    if (box._h !== html) { box._h = html; box.innerHTML = html; }
  }
  function quickAct(a, uid) {
    if (a === 'sleep') return trySleep();
    if (a === 'none') return toast('가방에 없다');
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
    const n = Math.floor((40 + r * 170) * (OPTS.perf ? .5 : 1));
    while (drops.length < n) drops.push({ x: rand() * VW, y: rand() * VH, v: 500 + rand() * 350, l: 8 + rand() * 10 });
    drops.length = n;
    rctx.clearRect(0, 0, VW, VH);
    rctx.fillStyle = `rgba(30,40,55,${(.12 * r).toFixed(3)})`; rctx.fillRect(0, 0, VW, VH);
    if (L.snowing) { // 눈: 천천히 흩날리는 흰 점
      rctx.fillStyle = 'rgba(245,248,252,.85)';
      for (const d of drops) {
        d.y += d.v * dt * .12; d.x += Math.sin((d.y + d.l * 40) * .02) * dt * 30 + dt * 12;
        if (d.y > VH) { d.y = -4; d.x = rand() * (VW + 80) - 80; }
        rctx.fillRect(d.x, d.y, d.l * .22, d.l * .22);
      }
      return;
    }
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
    updateCarTag();
    $('phaseTxt').textContent = M.dark ? '지하 · 어둠' : isN ? '밤 · 위험' : (G.night > 0 ? '황혼' : '낮');
    $('phaseIcon').setAttribute('href', isN ? '#i-moon' : (G.night > 0 ? '#i-dusk' : '#i-sun'));
    $('phase').classList.toggle('night', isN);
    if ((G.rain || 0) > .15 && !G.lv) $('phaseTxt').textContent += L.snowing ? ' · 눈' : ' · 비';
    { const sub = G.p.equip2 != null && G.p.inCar == null ? G.p.inv.find(i => i.uid === G.p.equip2) : null, k = sub ? sub.id : '';
      if (L._swk !== k) { L._swk = k; $('btnSwap').classList.toggle('hidden', !sub); if (sub) $('swapIcon').setAttribute('href', '#i-' + ITEMS[sub.id].icon); } }
    { const t = Math.round(airTemp()), k = t + '|' + (L.feel && L.feel.indoor ? 1 : 0);
      if (L._tk !== k) { L._tk = k; const c = tempColor(t), f = clamp((t + 10) / 45, .08, 1), h = (13 * f).toFixed(1);
        $('tempChip').style.color = c; $('thFill').setAttribute('y', (16 - h).toFixed(1)); $('thFill').setAttribute('height', h); $('tempTxt').textContent = t + '°'; $('tempChip').classList.toggle('in', !!(L.feel && L.feel.indoor)); } }
    for (const s of document.getElementsByClassName('stat')) {
      const v = clamp(p[s.dataset.k], 0, 100);
      s.querySelector('em').style.width = v.toFixed(0) + '%';
      s.querySelector('b').textContent = v.toFixed(0);
      s.classList.toggle('low', v < 25);
    }
    // (중상 효과는 #cond 로 옮김)
    const md = [];
    if (p.bleed) md.push(['drop', '출혈', 1]);
    if (p.bt < 35.5) md.push(['temp', p.bt < 34.8 ? '저체온' : '추움', p.bt < 34.8]);
    else if (p.bt > 37.6) md.push(['temp', p.bt > 38.6 ? '열사병' : '더움', p.bt > 38.6]);
    if (p.wet > .3) md.push(['drop', '젖음', 0]);
    { const W0 = p.wounds || []; const fr = W0.find(w => w.k === 'fracture'); if (fr) md.push(['plank', fr.spl ? '골절 · 부목' : '골절', !fr.spl]);
      else { if (W0.some(w => w.p.startsWith('leg'))) md.push(['run', '다리 부상', 0]); if (W0.some(w => w.p.startsWith('arm'))) md.push(['fist', '팔 부상', 0]); } }
    if (p.infected && p.infT > 300) md.push(['bio', '메스꺼움', 1]);
    if (p.sick > 0) md.push(['bio', '식중독', 1]);
    if (!G.power) md.push(['bolt', '정전', 0]);
    if (p.hp < 30) md.push(['heart', '중상', 1]);
    if (p.full < 25) md.push(['food', p.full < 8 ? '굶주림' : '배고픔', p.full < 8]);
    if (p.hyd < 25) md.push(['drop', p.hyd < 8 ? '탈수' : '갈증', p.hyd < 8]);
    if (p.energy < 25) md.push(['moon', '피곤', p.energy < 8]);
    if (p.endu < 20) md.push(['bolt', '지침', 0]);
    if (invWeight() > capKg()) md.push(['weight', '과적', 0]);
    const html = md.map(([ic, t, bad]) => `<b class="md${bad ? ' bad' : ''}" data-md="${t}">${ico(ic)}${t}</b>`).join('');
    const mo = $('moodles'); if (mo._h !== html) { mo._h = html; mo.innerHTML = html; }
    const w = curWeapon();
    let wn = w.def.name;
    if (w.def.type === 'gun' && w.item) wn = G.p.rl ? reloadLabel() : wn + ' ' + (w.item.mag || 0) + '/' + w.def.mag + (ammoLeft(w.def) ? ' +' + ammoLeft(w.def) : '');
    else if (w.item && w.item.dur != null) wn += ' · ' + w.item.dur;
    $('wname').textContent = G.p.inCar != null && !G.lv ? '경적' : wn;
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
  function resumeIfFree() { if (G) G.paused = !$('menu').classList.contains('hidden') || !$('bigmap').classList.contains('hidden') || !$('story').classList.contains('hidden'); }
  function openSheet(ci) {
    G.openC = ci; G.sel = null; G.eqSlot = null;
    if (ci >= 0) G.tab = 'bag';
    if (ci >= 0) { if (isVeh(ci) || isPlacedC(ci)) {} else if (isCorpse(ci)) { const c = corpseOf(ci); if (c) c.searched = true; } else G.searched.add(ci); refreshContainer(ci); }
    if (ci < 0 && $('sheet').classList.contains('hidden')) SFX.play('bag_zip'); // 가방·장비 창 열기 = 지퍼 여는 소리
    $('sheet').classList.remove('hidden'); document.body.classList.add('menuOn');
    renderSheet();
  }
  // 가구·차 닫는 소리 (선반·시체처럼 문이 없는 건 소리 없음)
  const CLOSE_SND = { fridge: 'close_fridge', drawer: 'close_drawer', counter: 'close_drawer', cabinet: 'close_wood', closet: 'close_wood', kitchen: 'close_wood',
    locker: 'close_metal', gunlocker: 'close_metal', firegear: 'close_metal', safe: 'close_safe', crate: 'close_lid', supply: 'close_lid', luggage: 'ui_back', car: 'close_trunk', miltruck: 'close_trunk' };
  const cKind = ci => isVeh(ci) ? 'car' : isPlacedC(ci) ? (placedOf(ci) || {}).kind : isCorpse(ci) ? 'corpse' : (M.containers[ci] || {}).kind;
  function closeSheet() {
    G.eqSlot = null;
    if (!$('sheet').classList.contains('hidden')) { if (G.openC < 0) SFX.play('ui_back'); else { const k = CLOSE_SND[cKind(G.openC)]; if (k) SFX.play(k, { close: 1 }); } } // 가방·장비 = 지퍼 / 가구 = 가구 닫는 소리
    if (G.openC >= 0) refreshContainer(G.openC);
    G.openC = -1; G.sel = null;
    $('sheet').classList.add('hidden'); document.body.classList.remove('menuOn'); $('danger').classList.add('hidden');
  }
  function itemStats(it) {
    const d = ITEMS[it.id], sub = [];
    const fs = freshState(it); if (fs) sub.push(fs.t + (fs.lv ? ` (효과 ${Math.round(fs.mul * 100)}%)` : ''));
    if (it.id === 'note') sub.push(G.journal && G.journal.includes(it.nid) ? '읽음' : '아직 안 읽음');
    if (it.id === 'radio') sub.push('비상방송을 들을 수 있다');
    if (ITEMS[it.id].type === 'map') sub.push(it.read ? '읽음 — 지도에 표시됨' : '펼쳐 보면 지도에 그 지역이 나온다');
    if (ITEMS[it.id].pen) sub.push('지도에 표시·글자를 적을 수 있다' + (it.id === 'pencil' ? ' (지우개로 지울 수 있음)' : ' (지울 수 없음)'));
    if (it.id === 'eraser') sub.push('연필로 적은 표시를 지운다');
    if (it.id === 'gascan') sub.push(`기름 ${(it.fuel || 0).toFixed(1)} / ${CAN_MAX}L`, '주유기(전기 있을 때)나 세워진 차에서 채움');
    if (it.id === 'carkey') { const v = (G.vehicles || [])[it.vid]; if (v) { const dx = v.x - G.p.x, dy = v.y - G.p.y, d = Math.hypot(dx, dy), dir = ['동', '남동', '남', '남서', '서', '북서', '북', '북동'][((Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) % 8) + 8) % 8]; sub.push(G.lv ? '건물 밖 차량용' : d < 3 ? '바로 옆 차 열쇠' : `차가 ${dir}쪽 약 ${Math.round(d)}칸`); } }
    if (it.q && it.q > 1) sub.push(`요리 품질 +${Math.round((it.q - 1) * 100)}%`);
    if (d.full) sub.push('포만 ' + (d.full > 0 ? '+' : '') + d.full);
    if (d.hyd) sub.push('수분 ' + (d.hyd > 0 ? '+' : '') + d.hyd);
    if (d.hp) sub.push('체력 +' + d.hp);
    if (d.stopBleed) sub.push('지혈');
    if (d.type === 'melee') sub.push(['', '하급', '일반', '고급'][d.hits || 1] + ' · 동시 타격 ' + (d.hits || 1) + '명', '공격력 ' + d.dmg, '사거리 ' + d.range, '내구도 ' + it.dur + '/' + (it.max || d.dur));
    if (d.uses) sub.push('남은 사용 ' + it.u + '회');
    if (d.type === 'mat' && !d.uses) sub.push('재료');
    if (d.type === 'tool' || d.tool) sub.push('도구 · 분해에 사용');
    if (it.id === 'benchkit') sub.push('설치하면 작업대 레시피 사용 가능');
    if (it.id === 'furn') sub.push('원하는 곳에 놓아 길을 막을 수 있음' + (FURN_CONT[it.kind] ? ' · 물건 보관 가능' : ''));
    if (d.type === 'gun') sub.push(`장전 ${it.mag || 0}/${d.mag}`, (d.hits ? '부채꼴 ' + d.hits + '명' : d.pierce ? '관통 ' + d.pierce + '명' : '1명'), '공격력 ' + d.dmg, '사거리 ' + d.range, '탄: ' + (ITEMS[d.ammo] || ITEMS.ammo).name, d.noise < 10 ? '조용함' : '소음 매우 큼');
    if (it.n) sub.push(it.n + (it.id === 'ammo' ? '발' : '개'));
    else { const same = G.p.inv.filter(i => gkey(i) === gkey(it)).length; if (same > 1) sub.push(same + '개 보유'); }
    sub.push(((it.w != null ? it.w : d.w) * (it.n || 1)).toFixed(1) + 'kg');
    return sub.join(' · ');
  }
  // 같은 물건 묶기 (가방·수색 창): 같은 종류 + 같은 신선도 + 같은 남은 횟수면 한 칸으로. 내구도 있는 무기·가구는 따로
  function gkey(it) {
    if (it.dur != null || it.id === 'furn' || it.items || it.id === 'gascan' || ITEMS[it.id].mag) return 'u' + it.uid;
    const fs = freshState(it);
    return it.id + '|' + (fs ? fs.lv : '') + '|' + (it.u != null ? it.u : '') + '|' + (it.q != null ? it.q : '') + (it.nid ? '|' + it.nid : '') + (it.vid != null ? '|v' + it.vid : '');
  }
  function groupItems(list) {
    const m = new Map();
    for (const it of list) { const k = gkey(it); let g = m.get(k); if (!g) m.set(k, g = []); g.push(it); }
    const out = [...m.values()];
    for (const g of out) g.sort((a, b) => (b.age || 0) - (a.age || 0)); // 오래된 것부터 씀
    return out;
  }
  /* ---------- 가방 정리: 종류별 묶음 · 정렬 · 무게 ---------- */
  const CATS = [['weapon', '무기', 'bat'], ['food', '음식', 'apple'], ['med', '의료', 'bandage'], ['wear', '옷', 'jacket'], ['mat', '재료', 'nails'], ['etc', '기타', 'note']];
  const catOf = it => { const t = ITEMS[it.id].type; return t === 'melee' || t === 'gun' || t === 'ammo' ? 'weapon' : t === 'food' || t === 'drink' ? 'food' : t === 'med' ? 'med' : t === 'wear' ? 'wear' : t === 'mat' || t === 'tool' || t === 'place' ? 'mat' : 'etc'; };
  const itemW = it => (it.w != null ? it.w : ITEMS[it.id].w) * (it.n || 1);
  const groupW = g => g.reduce((s, it) => s + itemW(it), 0);
  const fmtW = w => w >= 10 ? w.toFixed(0) : w >= 1 ? w.toFixed(1) : w >= .1 ? w.toFixed(1) : w > 0 ? w.toFixed(2) : '0';
  // 묶음 안 정렬: 무기는 장착 → 공격력 높은 순(탄약은 뒤), 음식은 곧 상할 것부터, 나머지는 이름순
  function sortGroups(groups) {
    const key = g => {
      const it = g[0], d = ITEMS[it.id], c = catOf(it);
      if (c === 'weapon') return [G.p.equip != null && g.some(x => x.uid === G.p.equip) ? 0 : 1, d.type === 'ammo' ? 1 : 0, -(d.dmg || 0) * (d.hits || 1)];
      if (c === 'food') { const fs = freshState(it); return [fs ? -fs.lv : 0, d.type === 'drink' ? 1 : 0, 0]; }
      if (c === 'med') return [it.id === 'bandage' ? 0 : 1, 0, 0];
      return [0, 0, 0];
    };
    return groups.map(g => [g, key(g)]).sort((a, b) => { for (let i = 0; i < 3; i++) if (a[1][i] !== b[1][i]) return a[1][i] - b[1][i]; return nameOf(a[0][0]).localeCompare(nameOf(b[0][0])); }).map(x => x[0]);
  }
  /* ---------- 보관 한도 (가구·트렁크마다 kg) ---------- */
  const CONT_CAP = { drawer: 4, cabinet: 6, counter: 6, luggage: 6, safe: 6, fridge: 8, locker: 8, crate: 10, supply: 10, gunlocker: 12, toolrack: 12, shelf_food: 12, shelf_med: 12, huntrack: 12, sportrack: 12, kitchen: 12, firegear: 12, closet: 15, car: 35, miltruck: 60 };
  function contCap(ci) {
    if (isVeh(ci)) return 35;
    if (isCorpse(ci)) return 10;
    if (isPlacedC(ci)) { const b = placedOf(ci); return b && b.type === 'pile' ? 999 : (b && CONT_CAP[b.kind]) || 10; }
    const c = M.containers[ci]; return (c && CONT_CAP[c.kind]) || 10;
  }
  const contWeight = ci => cItems(ci).reduce((s, it) => s + itemW(it), 0);
  function card(it, src, grp) {
    const d = ITEMS[it.id], p = G.p;
    const eq = src === 'inv' && p.equip === it.uid;
    const sel = G.sel && G.sel.uid === it.uid;
    let extra = '';
    if (it.n) extra += `<span class="qty">x${it.n}</span>`;
    else if (grp && grp.length > 1) extra += `<span class="qty">x${grp.length}</span>`;
    if (it.u != null) extra += `<span class="qty">${it.u}회</span>`;
    if (it.id === 'gascan') extra += `<span class="qty">${Math.round(it.fuel || 0)}L</span>`;
    if (d.mag) extra += `<span class="qty">${it.mag || 0}/${d.mag}</span>`;
    const fs = freshState(it); if (fs && fs.lv) extra += `<span class="fresh f${fs.lv}">${fs.t}</span>`;
    if (it.dur != null && d.dur) { const f = it.dur / (it.max || d.dur); extra += `<span class="dur${f < .3 ? ' low' : ''}"><i style="width:${(f * 100).toFixed(0)}%"></i></span>`; }
    if (eq) extra += `<span class="eqt">장착</span>`;
    else if (src === 'inv' && p.equip2 === it.uid) extra += `<span class="eqt sub">보조</span>`;
    extra += `<span class="wt">${fmtW(grp ? groupW(grp) : itemW(it))}kg</span>`;
    const busy = busyUid(it.uid), stale = fs && fs.lv === 1;
    return `<button class="card${eq ? ' eq' : ''}${stale ? ' stale' : ''}${sel ? ' sel' : ''}${src === 'cont' ? ' loot' : ''}${busy ? ' busy' : ''}" data-src="${src}" data-uid="${it.uid}"${grp && grp.length > 1 ? ` data-uids="${grp.map(x => x.uid).join(',')}"` : ''}>${ico(d.icon)}<span class="cn">${nameOf(it)}</span>${extra}</button>`;
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
      h += `<div class="rc${max ? '' : ' off'}" data-rid="${r.id}"><div class="rc-ic">${ico(o.icon)}</div><div class="rc-m"><b>${o.name}${r.n > 1 ? ' ×' + r.n : ''}<small>${r.time}초</small>${busy ? `<em>제작 대기 ${busy}</em>` : ''}</b><div class="chips">${chips}</div></div>
        <div class="rc-b"><button class="sbtn2 w" data-act="craft" data-rid="${r.id}" ${max ? '' : 'disabled'}>만들기</button>${max > 1 ? `<button class="sbtn2" data-act="craftmax" data-rid="${r.id}">x${max}</button>` : ''}</div></div>`;
    }
    return h;
  }
  // 메뉴 페이지: 가방 · 장비 · 제작 · 능력 · 수첩 (왼쪽 메뉴 + 가운데 내용 + 오른쪽 정보)
  const PAGES = [['bag', '가방', 'bag'], ['equip', '장비', 'jacket'], ['craft', '제작', 'craft'], ['skill', '능력', 'star'], ['note', '수첩', 'note']];
  const SK_HOW = { melee: '근접 무기로 좀비를 때리면 오른다', gun: '총으로 맞히면 오른다', carp: '제작·분해·판자 막기·나무 베기로 오른다', cook: '불로 요리하면 오른다', aid: '붕대를 감으면 오른다', mech: '차를 고치거나 기름을 옮기면 오른다' };
  function skillFx(k, lv) {
    if (k === 'melee') return [['공격력', `+${6 * lv}%`], ['치명타 확률', `${(12 + 1.5 * lv).toFixed(1)}%`], ['휘두를 때 지구력', `-${4 * lv}%`]];
    if (k === 'gun') return [['명중률', `+${2 * lv}~${3 * lv}%p`], ['쏘는 간격', `-${3 * lv}%`]];
    if (k === 'carp') return [['제작·분해 시간', `-${Math.min(50, 5 * lv)}%`], ['분해 때 부서짐', `${Math.max(0, 30 - 3 * lv)}%`], ['판자 튼튼함', `+${lv}`]];
    if (k === 'cook') return [['요리 시간', `-${5 * lv}%`], ['요리 효과', `+${5 * lv}%`]];
    if (k === 'mech') return [['차 수리량', `+${8 + 2 * lv}%/고철`], ['수리·기름 작업 시간', `-${5 * lv}%`]];
    return [['치료 시간', `-${8 * lv}%`], ['약 회복량', `+${lv}`]];
  }
  const tabOf = () => { const t = G.tab || 'bag'; return G.openC >= 0 && t !== 'equip' && t !== 'skill' && t !== 'note' && t !== 'craft' ? 'bag' : t; };
  function renderSheet() {
    const p = G.p, ci = G.openC, tab = tabOf();
    if (gearFix()) {}
    const loot = ci >= 0 && tab === 'bag';
    const pg = PAGES.find(x => x[0] === tab) || PAGES[0];
    $('sheetTitle').textContent = loot ? cName(ci) + ' 수색' : pg[1];
    $('sheetTitle').classList.remove('hidden');
    $('sheetIcon').setAttribute('href', '#i-' + (loot ? 'search' : pg[2]));
    $('sheetTabs').innerHTML = '';
    const wt = invWeight(), cap = capKg();
    $('wtext').textContent = `${wt.toFixed(1)} / ${cap}kg`;
    $('wfill').style.width = Math.min(100, wt / cap * 100).toFixed(0) + '%';
    $('wfill').parentElement.classList.toggle('over', wt > cap);
    // 왼쪽 메뉴
    const skNew = G.skSeen ? Object.keys(G.sk).some(k => G.sk[k].lv > (G.skSeen[k] || 0)) : false;
    $('sheetNav').innerHTML = PAGES.map(([k, n, ic]) => `<button data-act="tab-${k}" class="${tab === k ? 'on' : ''}">${ico(k === 'bag' && ci >= 0 ? 'search' : ic)}<span>${k === 'bag' && ci >= 0 ? '수색' : n}</span>${k === 'skill' && skNew && tab !== 'skill' ? '<em>UP</em>' : ''}</button>`).join('');
    const wide = tab === 'craft' || tab === 'note';
    $('sheetBody').parentElement.parentElement.classList.toggle('wide', wide);
    const body = $('sheetBody');
    body.className = 'scroll pg-' + tab + (loot ? ' split' : '');
    const keep = [body.scrollTop, ...[...body.querySelectorAll('.lcol')].map(e => e.scrollTop)];
    let h = '';
    if (tab === 'craft') h = craftHtml();
    else if (tab === 'skill') h = skillPage();
    else if (tab === 'note') h = notePage();
    else if (tab === 'equip') h = equipPage();
    else h = bagPage(loot);
    body.innerHTML = h;
    body.scrollTop = keep[0]; body.querySelectorAll('.lcol').forEach((e, i) => { e.scrollTop = keep[i + 1] || 0; });
    if (tab === 'equip') drawEqFig();
    if (tab === 'skill') { G.skSeen = G.skSeen || {}; for (const k in G.sk) G.skSeen[k] = G.sk[k].lv; }
    renderDetail();
    renderAction();
  }
  // 메뉴를 연 동안에도 게임은 흐름 → 가까운 좀비·공격을 위쪽에 알림
  function updateDanger() {
    const p = G.p, el = $('danger'); let best = 1e9;
    for (const z of G.zombies) { if (z.dead) continue; const d = Math.hypot(z.x - p.x, z.y - p.y); if (d < best) best = d; }
    const hit = L.hitAt && performance.now() - L.hitAt < 1500;
    if (hit || best < 10) { el.classList.remove('hidden'); el.classList.toggle('hot', !!(hit || best < 4)); const t = hit ? '공격받는 중!' : `좀비 ${Math.max(1, Math.round(best))}m`; if (el._t !== t) { el._t = t; el.innerHTML = ico('warn') + t; } }
    else if (!el.classList.contains('hidden')) { el.classList.add('hidden'); el._t = null; }
  }
  function drawEqFig() {
    const svg = $('eqFig'); if (!svg) return;
    const g = el('g', { transform: 'rotate(-90) scale(1.3)' }, svg), refs = {};
    drawPlayerArt(g, gearLook(), refs);
    const w = curWeapon(); if (refs.wep && w.item) weaponArt(refs.wep, w.item.id);
  }
  // 가방 (수색 중이면 왼쪽: 보관함 · 오른쪽: 내 가방)
  function bagPage(loot) {
    const p = G.p, ci = G.openC;
    let h = '', hc = '';
    if (loot) {
      const items = cItems(ci);
      const D0 = isCorpse(ci) || isPlacedC(ci) || isVeh(ci) ? null : DISMANTLE[M.containers[ci].kind];
      const cw = contWeight(ci), cc = contCap(ci);
      hc += `<div class="sec-t"><span>${isCorpse(ci) ? '소지품' : cName(ci)}</span><span class="sec-b">${items.length > 1 ? '<button data-act="takeall">모두 가져가기</button>' : ''}${D0 ? `<button class="ghost${has(D0.tool) && !items.length ? ' ok' : ''}" data-act="dismantle">${ico('screwdriver')}분해${breakChance() > 0 ? ` <small>부서짐 ${Math.round(breakChance() * 100)}%</small>` : ''}</button>` : ''}</span></div>`;
      hc += `<div class="ccap${cw >= cc * .9 ? ' over' : ''}"><span>보관 ${fmtW(cw)} / ${cc}kg</span><i><b style="width:${Math.min(100, cw / cc * 100).toFixed(0)}%"></b></i></div><div class="grid">`;
      if (!items.length) hc += `<div class="empty">비어 있다</div>`;
      for (const g of sortGroups(groupItems(items))) hc += card(g[0], 'cont', g);
      hc += `</div><div class="hint">누르면 가져오기 · 길게 누르면 정보</div>`;
    }
    const inv = p.inv.filter(i => !isWorn(i));
    const groups = groupItems(inv);
    h += `<div class="sec-t"><span>내 가방 · ${inv.length}개${groups.length < inv.length ? ` (${groups.length}칸)` : ''}</span></div>`;
    if (G.sel && !p.inv.some(i => i.uid === G.sel.uid) && G.sel.key) { const nx = inv.find(i => gkey(i) === G.sel.key); G.sel = nx ? { uid: nx.uid, key: G.sel.key } : null; }
    if (G.filt == null) { try { G.filt = localStorage.getItem('deadtown_filt') || 'all'; } catch (e) { G.filt = 'all'; } }
    const filt = G.filt, byCat = {};
    for (const g of groups) (byCat[catOf(g[0])] = byCat[catOf(g[0])] || []).push(g);
    h += `<div class="filt">` + [['all', '전체', groups.length]].concat(CATS.map(([k, n]) => [k, n, (byCat[k] || []).length])).map(([k, n, c]) => `<button data-act="filt-${k}" class="${filt === k ? 'on' : ''}${c ? '' : ' none'}">${n}<em>${c}</em></button>`).join('') + `</div><div class="grid">`;
    if (!inv.length) h += `<div class="empty">가방이 비었다</div>`;
    for (const [k, nm] of CATS) {
      if (filt !== 'all' && filt !== k) continue;
      const gs = byCat[k]; if (!gs) continue;
      h += `<div class="cat-t"><span>${nm}</span><em>${gs.length}칸 · ${fmtW(gs.reduce((s, g) => s + groupW(g), 0))}kg</em></div>`;
      for (const g of sortGroups(gs)) { const rep0 = G.sel && g.find(x => x.uid === G.sel.uid) ? g.find(x => x.uid === G.sel.uid) : g[0]; h += card(rep0, 'inv', g); }
    }
    if (filt !== 'all' && !byCat[filt] && inv.length) h += `<div class="empty">이 종류는 없다</div>`;
    h += `</div>`;
    if (!loot) h += `<div class="acts"><button class="abtn w" data-act="sleep">${G.p.energy >= 80 ? ico('bench') + '휴식' : ico('moon') + '잠자기'}</button><button class="abtn" data-act="save">${ico('save')}저장</button></div>`;
    return loot ? `<div class="lcol">${h}</div><div class="lcol">${hc}</div>` : h; // 왼쪽: 내 가방 · 오른쪽: 보관함
  }
  // 장비: 캐릭터 양옆에 8칸 + 합계 + 입을 수 있는 것
  function equipPage() {
    const p = G.p, gs = gearStats(), sel = G.eqSlot;
    const slot = (k, lb, ic) => {
      const it = wornIt(k), d = it && ITEMS[it.id];
      const f = it && it.dur != null && d.dur ? it.dur / (it.max || d.dur) : null;
      return `<button class="slot${it ? ' fill' : ''}${sel === k ? ' sel' : ''}" data-act="eqslot-${k}"><span class="lb">${lb}</span>${ico(it ? d.icon : ic)}${it ? `<span class="cn">${nameOf(it)}</span>` : ''}${f != null ? `<span class="dur${f < .3 ? ' low' : ''}"><i style="width:${(f * 100).toFixed(0)}%"></i></span>` : ''}</button>`;
    };
    const L1 = [['head', '머리', 'helm'], ['body', '상의', 'jacket'], ['legs', '하의', 'pants'], ['feet', '신발', 'boots']];
    const R1 = [['main', '주무기', 'fist'], ['sub', '보조', 'gun'], ['hands', '장갑', 'gloves'], ['back', '등', 'pack']];
    const days = Math.floor((G.time - 540) / 1440) + 1;
    const spdP = Math.round((gs.spd - 1) * 100);
    let h = `<div class="eqwrap"><div class="board"><div class="col">${L1.map(a => slot(...a)).join('')}</div>
<div class="fig"><div class="nm"><span>생존자</span><em>${days}일차</em></div><svg id="eqFig" viewBox="-.55 -.55 1.1 1.1"></svg>
<div class="gst"><div>${ico('shield')}방어<b>${gs.def}</b></div><div>${ico('bio')}물림<b>${(biteChance(gs.def) * 100).toFixed(1)}%</b></div><div>${ico('temp')}보온<b>${warmth()}</b></div><div class="${p.bt < 35.5 ? 'cold' : p.bt > 37.6 ? 'hot' : ''}">${ico('heart')}체온<b>${(p.bt || 36.6).toFixed(1)}°</b></div><div>${ico('bag')}가방<b>${gs.cap}kg</b></div><div>${ico('run')}이동<b>${spdP > 0 ? '+' : ''}${spdP}%</b></div></div></div>
<div class="col">${R1.map(a => slot(...a)).join('')}</div></div>`;
    // 오른쪽 목록: 고른 칸에 맞는 것 (안 고르면 입을 수 있는 것 전부)
    const wslot = sel && sel !== 'main' && sel !== 'sub' ? sel : null, wep = sel === 'main' || sel === 'sub';
    const list = p.inv.filter(i => { const d = ITEMS[i.id]; if (isWorn(i) || i.uid === p.equip || i.uid === p.equip2) return false; return wep ? (d.type === 'melee' || d.type === 'gun') : d.type === 'wear' && (!wslot || d.slot === wslot); });
    const title = wep ? '가방 속 무기' : wslot ? `가방 속 ${SLOT_NAME[wslot]}` : '입을 수 있는 것';
    h += `<div class="eqlist"><div class="sec-t"><span>${title}</span><em>${list.length}개</em></div><div class="grid">`;
    if (!list.length) h += `<div class="empty">${wep ? '무기가 없다' : '없다 — 옷장·사물함을 뒤져 보자'}</div>`;
    for (const it of list) {
      const d = ITEMS[it.id]; let up = '';
      if (d.type === 'wear') { const cur = wornIt(d.slot), cd = cur ? ITEMS[cur.id] : {}; const dv = d.slot === 'back' ? (d.cap || 0) - (cd.cap || 0) : (d.def || 0) - (cd.def || 0); up = dv > 0 ? `<span class="upb">▲${dv}</span>` : dv < 0 ? `<span class="upb dn">▼${-dv}</span>` : ''; }
      h += card(it, 'inv', null).replace('</button>', up + '</button>');
    }
    h += `</div><div class="hint">▲▼ = 지금 입은 것과 비교 (배낭은 용량 kg)</div></div></div>`;
    return h;
  }
  function skillPage() {
    const ks = Object.keys(SKILLS);
    if (!G.skSel || !SKILLS[G.skSel]) G.skSel = ks[0];
    let h = `<div class="sec-t"><span>생존 기술</span><em>쓸수록 오른다 · 최고 10레벨</em></div><div class="skg">`;
    for (const k of ks) {
      const sk = G.sk[k], need = xpNeed(sk.lv), f = sk.lv >= 10 ? 1 : sk.xp / need;
      const up = G.skSeen && sk.lv > (G.skSeen[k] || 0);
      h += `<button class="skc${G.skSel === k ? ' sel' : ''}" data-act="sksel-${k}">${ico(SKILLS[k][1])}<b>${SKILLS[k][0]}<em>LV.${sk.lv}</em></b><i><u style="width:${(f * 100).toFixed(0)}%"></u></i>${up ? '<span class="nw">UP</span>' : ''}</button>`;
    }
    h += `</div>`;
    const p = G.p;
    h += `<div class="sec-t"><span>상태</span></div><div class="stg">${[['heart', '체력', p.hp], ['food', '배고픔', p.full], ['drop', '목마름', p.hyd], ['moon', '기력', p.energy]].map(([ic, n, v]) => `<div>${ico(ic)}<span>${n}</span><b>${Math.round(v)}</b></div>`).join('')}</div>`;
    const W0 = p.wounds || [];
    h += `<div class="sec-t"><span>몸 상태</span><em>${W0.length ? '붕대(출혈)·부목(골절)·소독약(빨리 낫기)' : ''}</em></div>`;
    h += W0.length ? `<div class="wnd">${W0.map(w => `<div class="${w.k === 'fracture' && !w.spl ? 'bad' : ''}"><b>${PART_NAME[w.p]}</b><span>${WOUND[w.k][0]}${WOUND[w.k][2] ? (w.band ? ' · 붕대' : ' · <i>출혈</i>') : ''}${w.spl ? ' · 부목' : ''}${w.dis ? ' · 소독' : ''}</span><em>${Math.max(1, Math.round(w.h / 60))}시간</em></div>`).join('')}</div>` : `<div class="empty" style="padding:10px">다친 곳 없음</div>`;
    h += `<div class="sk-foot">생존 ${Math.floor((G.time - 540) / 1440)}일 · 처치 ${G.kills} · ${G.power ? '전기 들어옴' : '정전'}</div>`;
    return h;
  }
  function notePage() {
    const N = (DT.STORY || {}).notes || {}, J = G.journal || [];
    const list = J.filter(id => N[id]).sort((a, b) => (N[a].d || '').localeCompare(N[b].d || ''));
    let h = `<div class="sec-t"><span>읽은 쪽지 · ${list.length}/${Object.keys(N).length}</span><em>★ = 중요한 문서</em></div>`;
    if (!list.length) return h + `<div class="empty">아직 읽은 쪽지가 없다. 집과 건물을 뒤지면 쪽지·일지·신문을 찾을 수 있다.</div>`;
    h += `<div class="notes">` + list.map(id => { const n = N[id], tn = M.towns && M.towns.find(t => t.key === n.town); return `<button data-act="note-${id}">${ico('note')}<b>${n.key ? '★ ' : ''}${n.t}</b><small>${n.d ? n.d.replace(/^0?(\d+)-0?(\d+)$/, '$1월 $2일') + ' · ' : ''}${tn ? tn.name : '어딘가'}</small></button>`; }).join('') + `</div>`;
    return h;
  }
  const TYPE_NAME = { map: '지도', melee: '근접 무기', gun: '총', ammo: '탄약', food: '음식', drink: '마실 것', med: '의료', mat: '재료', tool: '도구', place: '설치', wear: '옷', note: '문서', radio: '라디오' };
  function renderDetail() {
    const box = $('detail'), p = G.p, tab = tabOf(), main = box.parentElement;
    const hasSel = tab === 'skill' || (G.sel && (p.inv.some(i => i.uid === G.sel.uid) || (G.sel.cont && G.openC >= 0 && cItems(G.openC).some(i => i.uid === G.sel.uid)))) || (tab === 'equip' && G.eqSlot);
    main.classList.toggle('nodet', !hasSel && tab !== 'craft' && tab !== 'note');
    if (tab === 'craft' || tab === 'note' || !hasSel) { box.classList.add('hidden'); return; }
    box.classList.remove('hidden');
    if (tab === 'skill') {
      const k = G.skSel, sk = G.sk[k], need = xpNeed(sk.lv);
      const cur = skillFx(k, sk.lv), nx = sk.lv < 10 ? skillFx(k, sk.lv + 1) : null;
      box.innerHTML = `<div class="dt">${`<div class="dic">${ico(SKILLS[k][1])}</div>`}<div class="dtx"><b>${SKILLS[k][0]}</b><span class="dtag">LV.${sk.lv}${sk.lv < 10 ? ` · 다음까지 ${Math.round(sk.xp / need * 100)}%` : ' · 최고'}</span></div></div>
<div class="lvl">${Array.from({ length: 10 }, (_, i) => `<span class="${i < sk.lv ? 'on' : ''}"></span>`).join('')}</div>
<div class="dl">${cur.map(([a, b]) => `<div><span>${a}</span><b class="${sk.lv ? 'up' : ''}">${b}</b></div>`).join('')}</div>
${nx ? `<div class="nx"><b>LV.${sk.lv + 1} 되면</b>${nx.map(([a, b]) => `${a} ${b}`).join(' · ')}</div>` : ''}<div class="ds">${SKILLS[k][2]}<br>${SK_HOW[k] || ''}</div>`;
      return;
    }
    let it = G.sel ? p.inv.find(i => i.uid === G.sel.uid) : null;
    if (tab === 'equip' && !it && G.eqSlot) it = wornIt(G.eqSlot);
    if (!it && G.sel && G.sel.cont && G.openC >= 0) { const ci0 = cItems(G.openC).find(i => i.uid === G.sel.uid); if (ci0) { // 보관함 안 물건 (길게 눌러 보기)
      const d = ITEMS[ci0.id]; let st = itemStats(ci0).split(' · ');
      if (d.type === 'wear') { st = [d.def ? `방어 ${d.def}` : '', d.warm ? `보온 ${d.warm}` : '', d.cap ? `가방 용량 +${d.cap}kg` : '', d.spd ? `이동 ${d.spd > 0 ? '+' : ''}${d.spd}%` : '', d.dur ? `내구도 ${ci0.dur}/${ci0.max || d.dur}` : '', `${d.w}kg`].filter(Boolean); const cur = wornIt(d.slot); if (cur) { const cd = ITEMS[cur.id]; st.push(`지금 ${cd.name}: ` + (d.slot === 'back' ? `용량 ${cd.cap || 0} → ${d.cap || 0}kg` : `방어 ${cd.def || 0} → ${d.def || 0}`)); } }
      box.innerHTML = `<div class="dt"><div class="dic">${ico(d.icon)}</div><div class="dtx"><b>${nameOf(ci0)}</b><span class="dtag">${cName(G.openC)} 안 · ${TYPE_NAME[d.type] || '물건'}</span></div><button class="dx" data-act="desel" aria-label="선택 해제">${ico('close')}</button></div><div class="dl">${st.map(t => `<div>${t}</div>`).join('')}</div><div class="dacts"><button class="abtn w" data-act="takesel">${ico('bag')}가방으로 가져오기</button></div>`;
      return; } }
    if (!it) {
      if (tab === 'equip' && G.eqSlot) { box.innerHTML = `<div class="dt"><div class="dic">${ico(({ main: 'fist', sub: 'gun' })[G.eqSlot] || SLOTS.find(s => s[0] === G.eqSlot)[2])}</div><div class="dtx"><b>${SLOT_NAME[G.eqSlot]}</b><span class="dtag">빈 칸</span></div></div><div class="ds">가운데 목록에서 ${G.eqSlot === 'main' || G.eqSlot === 'sub' ? '무기' : '옷'}를 골라 넣자.</div>`; return; }
      box.innerHTML = `<div class="dempty">${ico(tab === 'equip' ? 'jacket' : 'hand')}<span>${tab === 'equip' ? '칸이나 옷을 누르면<br>여기에 정보가 나온다' : '물건을 누르면<br>여기에 정보가 나온다'}</span></div>`;
      G.sel = null; return;
    }
    const d = ITEMS[it.id], ws = wornIt && wornSlot(it), isMain = p.equip === it.uid, isSub = p.equip2 === it.uid;
    let acts = '';
    if (d.type === 'food') acts += `<button class="abtn w" data-act="use">${ico(d.icon)}먹기</button>`;
    else if (d.type === 'drink') acts += `<button class="abtn w" data-act="use">${ico(d.icon)}마시기</button>`;
    else if (d.type === 'med') acts += `<button class="abtn w" data-act="use">${ico(d.icon)}사용</button>`;
    else if (d.type === 'note') acts += `<button class="abtn w" data-act="read">${ico(d.icon)}읽기</button>`;
    else if (d.type === 'radio') acts += `<button class="abtn w" data-act="listen">${ico(d.icon)}듣기</button>`;
    else if (d.type === 'map') acts += `<button class="abtn w" data-act="readmap">${ico('map')}${it.read ? '지도에서 보기' : '지도 펼쳐 보기'}</button>`;
    else if (d.type === 'wear') acts += ws ? `<button class="abtn r" data-act="unwear">${ico(d.icon)}벗기</button>` : `<button class="abtn w" data-act="wear">${ico(d.icon)}입기</button>`;
    else if (d.type === 'melee' || d.type === 'gun') {
      acts += isMain ? `<button class="abtn r" data-act="equip">${ico(d.icon)}해제</button>` : `<button class="abtn w" data-act="equip">${ico(d.icon)}${isSub ? '주무기로' : '장착'}</button>`;
      if (isMain && p.equip2 != null) acts += `<button class="abtn" data-act="swapw">${ico('swap')}바꾸기</button>`;
      else if (isSub) acts += `<button class="abtn" data-act="unsub">보조 빼기</button>`;
      else if (!isMain) acts += `<button class="abtn" data-act="setsub">보조로</button>`;
      if (d.mag && isMain) acts += `<button class="abtn" data-act="reload"${canReload(it) && !p.rl ? '' : ' disabled'}>${ico((ITEMS[d.ammo] || ITEMS.ammo).icon)}${p.rl ? '장전 중' : '장전'}</button>`;
      if (d.mag && it.mag > 0) acts += `<button class="abtn" data-act="unload">${ico((ITEMS[d.ammo] || ITEMS.ammo).icon)}탄 빼기</button>`;
    }
    if (quickable(d)) { const on = (p.quick || []).includes(it.id); acts += `<button class="abtn" data-act="pin">${ico('star')}${on ? '빠른 칸 빼기' : '빠른 칸'}</button>`; }
    if (d.type === 'place') acts += `<button class="abtn w" data-act="place">${ico(d.icon)}${it.id === 'furn' ? '내려놓기' : it.id === 'campkit' ? '불 피우기' : '설치'}</button>`;
    if (d.type === 'melee' && it.dur < Math.round((it.max || d.dur) * .9)) {
      for (const m of ['tape', 'glue']) if (countOf(m)) acts += `<button class="abtn" data-act="repair-${m}">${ico(m)}${m === 'tape' ? '테이프 수리' : '접착제 수리'}</button>`;
      if (!countOf('tape') && !countOf('glue')) acts += `<button class="abtn" disabled>${ico('tape')}수리 불가</button>`;
    }
    if (d.type === 'wear' && d.dur && it.dur < Math.round((it.max || d.dur) * .9)) { const m = d.soft ? 'cloth' : 'tape'; acts += `<button class="abtn" data-act="mend"${countOf(m) ? '' : ' disabled'}>${ico(m)}수선</button>`; }
    if (ITEM_DISMANTLE[it.id] && !ws) { const D = ITEM_DISMANTLE[it.id]; acts += `<button class="abtn" data-act="itemdismantle"${D.tool && !has(D.tool) ? ' disabled' : ''}>${ico('screwdriver')}분해</button>`; }
    const dverb = G.openC >= 0 ? '넣기' : '버리기';
    if (tab === 'equip' && (ws || isMain || isSub)) {} // 장비 칸에서는 버리기 없음
    else if (d.stack && it.n > 1) {
      acts += `<button class="abtn" data-act="drop" data-rid="1">1개 ${dverb}</button>`;
      if (it.n > 3) acts += `<button class="abtn" data-act="drop" data-rid="half">절반(${Math.floor(it.n / 2)})</button>`;
      acts += `<button class="abtn" data-act="drop" data-rid="all">전부 ${dverb}</button>`;
    } else acts += `<button class="abtn" data-act="drop">${dverb}</button>`;
    if (busyUid(it.uid)) acts = `<div class="busytxt">진행 중…</div>`;
    // 태그 · 비교
    const tag = d.type === 'wear' ? `${SLOT_NAME[d.slot]}${ws ? ' · 입는 중' : ''}` : isMain ? `${TYPE_NAME[d.type]} · 주무기` : isSub ? `${TYPE_NAME[d.type]} · 보조무기` : (TYPE_NAME[d.type] || '물건') + (G.openC >= 0 && !p.inv.includes(it) ? ' · 보관함' : '');
    let stats = itemStats(it).split(' · ');
    if (d.type === 'wear') {
      stats = [];
      if (d.def) stats.push(`방어 ${d.def}`);
      if (d.warm) stats.push(`보온 ${d.warm}`);
      if (d.cap) stats.push(`가방 용량 +${d.cap}kg`);
      if (d.spd) stats.push(`이동 ${d.spd > 0 ? '+' : ''}${d.spd}%`);
      if (d.dur) stats.push(`내구도 ${it.dur}/${it.max || d.dur}`);
      stats.push(`${d.w}kg${d.slot !== 'back' ? ' (입으면 30%)' : ''}`);
      if (!ws) { const cur = wornIt(d.slot); if (cur) { const cd = ITEMS[cur.id]; const a = d.slot === 'back' ? `용량 ${cd.cap || 0} → ${d.cap || 0}kg` : `방어 ${cd.def || 0} → ${d.def || 0}`; stats.push(`지금 ${cd.name}: ${a}`); } else stats.push('지금 이 칸은 비어 있다'); }
    }
    box.innerHTML = `<div class="dt"><div class="dic">${ico(d.icon)}</div><div class="dtx"><b>${nameOf(it)}</b><span class="dtag${d.type === 'melee' || d.type === 'gun' ? ' r' : ''}">${tag}</span></div><button class="dx" data-act="desel" aria-label="선택 해제">${ico('close')}</button></div><div class="dl">${stats.map(t => `<div>${t}</div>`).join('')}</div><div class="dacts">${acts}</div>`;
  }
  /* ---------- 행동(소요시간) 대기열 ---------- */
  function queueAction(a) {
    if (G.dead || G.sleeping) return;
    if (G.p.rl) cancelReload(); // 다른 행동을 하면 재장전은 멈춘다 (넣은 탄은 그대로)
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
    if (!a) { if (SFX.act) SFX.act(null); return; }
    if (a.valid && !a.valid()) { G.actions.shift(); renderAction(); return; }
    a.t += dt;
    if (!a.started) a.started = true;
    if (SFX.act) SFX.act(a.sfx || null, a); // 행동 중엔 소리 반복, 끝나거나 취소하면 멈춤
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
      if (box._k !== key) { box._k = key; box.innerHTML = `<div class="ab-top">${ico(a.icon || 'hand')}<span>${a.label}${more}</span><small></small><button data-act="cancel" aria-label="취소">✕</button></div><em><b></b></em>`; }
      box.querySelector('em b').style.width = (f * 100).toFixed(1) + '%';
      box.querySelector('small').textContent = Math.max(0, a.dur - a.t).toFixed(1) + '초';
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
    const wtWarn = () => { if (invWeight() > capKg()) toast('너무 무겁다 — 느려진다'); };
    const takeOne = (it, c) => queueAction({ uid: it.uid, sfx: 'loot', label: ITEMS[it.id].name + ' 챙기는 중', icon: ITEMS[it.id].icon,
      dur: .35 + ITEMS[it.id].w * (it.n || 1) * .4,
      valid: () => G.openC === c && cItems(c).some(x => x.uid === it.uid),
      done: () => { const arr = cItems(c), i = arr.findIndex(x => x.uid === it.uid); if (i >= 0) { stackAdd(arr.splice(i, 1)[0]); wtWarn(); }
        const pb = isPlacedC(c) && placedOf(c); if (pb && pb.type === 'pile') { if (!arr.length) setTimeout(() => removePlaced(pb), 300); else drawPile(pb); }
        if (!arr.length) setTimeout(() => { if (G.openC === c && !cItems(c).length && !G.actions.length) closeSheet(); }, 280); } }); // 다 챙기면 자동으로 닫힘
    if (act === 'cancel') return cancelActions('행동 취소');
    if (act === 'desel') { G.sel = null; return renderSheet(); }
    if (act.startsWith('filt-')) { G.filt = act.slice(5); try { localStorage.setItem('deadtown_filt', G.filt); } catch (e) {} return renderSheet(); }
    if (act.startsWith('tab-')) { G.tab = act.slice(4); G.sel = null; G.eqSlot = null; $('sheetBody').scrollTop = 0; return renderSheet(); }
    if (act.startsWith('eqslot-')) { const k = act.slice(7); if (G.eqSlot === k) { G.eqSlot = null; G.sel = null; } else { G.eqSlot = k; const w = wornIt(k); G.sel = w ? { uid: w.uid } : null; } return renderSheet(); }
    if (act === 'pin') { const it = selIt(); if (!it) return; p.quick = p.quick || []; const i = p.quick.indexOf(it.id); if (i >= 0) p.quick.splice(i, 1); else { if (p.quick.length >= QUICK_MAX) p.quick.shift(); p.quick.push(it.id); toast(ITEMS[it.id].name + ' — 빠른 칸에 넣었다 (화면 아래)'); } renderQuick(); return renderSheet(); }
    if (act === 'takesel') { const u = G.sel && G.sel.uid; G.sel = null; if (u != null) sheetAction('takecont', u); return renderSheet(); }
    if (act.startsWith('sksel-')) { G.skSel = act.slice(6); return renderSheet(); }
    if (act.startsWith('note-')) return readNote(act.slice(5));
    if (act === 'wear' || act === 'unwear') {
      const it = selIt(); if (!it || busyUid(it.uid)) return;
      const d = ITEMS[it.id], on = act === 'wear';
      const dur = d.slot === 'back' ? .8 : d.slot === 'body' ? (d.w > 2 ? 3 : 1.8) : d.slot === 'feet' ? 1.6 : 1;
      queueAction({ uid: it.uid, sfx: 'wear', label: d.name + (on ? ' 입는 중' : ' 벗는 중'), icon: d.icon, dur: on ? dur : dur * .6,
        valid: () => p.inv.includes(it),
        done: () => { p.wear = p.wear || {}; if (on) { p.wear[d.slot] = it.uid; G.eqSlot = d.slot; } else if (p.wear[d.slot] === it.uid) p.wear[d.slot] = null; refreshLook(); if (on) toast(d.name + (d.slot === 'back' ? ' 멨다' : ' 입었다')); if (invWeight() > capKg()) toast('가방이 작아서 무겁다 — 느려진다'); } });
      return;
    }
    if (act === 'mend') {
      const it = selIt(); if (!it || busyUid(it.uid)) return;
      const d = ITEMS[it.id], m = d.soft ? 'cloth' : 'tape';
      if (!countOf(m)) return toast(m === 'cloth' ? '천이 필요하다' : '덕트 테이프가 필요하다');
      queueAction({ uid: it.uid, sfx: 'craft_cloth', label: d.name + ' 수선 중', icon: d.icon, dur: 3,
        valid: () => p.inv.includes(it) && countOf(m) > 0,
        done: () => { consume(m, 1); const mx = it.max || d.dur; it.dur = Math.min(mx, it.dur + Math.round(mx * .4)); toast(d.name + ' 수선했다'); } });
      return;
    }
    if (act === 'setsub' || act === 'unsub') { const it = selIt(); if (!it) return; if (act === 'setsub') { p.equip2 = it.uid; toast(ITEMS[it.id].name + ' — 보조무기'); } else p.equip2 = null; return renderSheet(); }
    if (act === 'reload') { startReload(); return renderSheet(); }
    if (act === 'unload') { const it = selIt(); if (it && !busyUid(it.uid)) unloadGun(it); return renderSheet(); }
    if (act === 'swapw') {
      if (p.equip2 == null) return;
      queueAction({ move: true, sfx: 'equip', label: '무기 바꾸는 중', icon: 'swap', dur: .6,
        done: () => { cancelReload(); const a = p.equip; p.equip = p.equip2; p.equip2 = a; updateWeaponLook(); const w = curWeapon(); toast((w.item ? ITEMS[w.item.id].name : '맨손') + ' 장착'); } });
      return;
    }
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
      const it0 = p.inv.find(i => i.uid === uid);
      G.sel = G.sel && G.sel.uid === uid ? null : { uid, key: it0 ? gkey(it0) : null };
    } else if (act === 'takeall') {
      for (const it of cItems(ci)) if (!busyUid(it.uid)) takeOne(it, ci);
    } else if (act === 'use') {
      const it = selIt(); if (!it || busyUid(it.uid)) return;
      const d = ITEMS[it.id];
      if (d.splint && !(p.wounds || []).some(w => w.k === 'fracture' && !w.spl)) return toast('부목을 댈 부러진 곳이 없다');
      if (d.disinfect && !(p.wounds || []).length) return toast('소독할 상처가 없다');
      const verb = d.type === 'food' ? '먹는 중' : d.type === 'drink' ? '마시는 중' : (d.stopBleed ? '붕대 감는 중' : '복용 중');
      const aid = d.type === 'med' ? skillLv('aid') : 0;
      queueAction({ uid: it.uid, sfx: d.type === 'food' ? 'eat' : d.type === 'drink' ? 'drink' : it.id === 'disinfect' ? 'disinfect' : it.id === 'splint' ? 'craft_tape' : (d.stopBleed ? 'bandage' : 'pills'), label: d.name + ' ' + verb, icon: d.icon, dur: (d.time || 2) * (1 - .08 * aid),
        valid: () => p.inv.includes(it),
        done: () => {
          const fr = freshState(it), mul = (fr ? fr.mul : 1) * (it.q || 1);
          if (d.full) p.full = clamp(p.full + (d.full > 0 ? d.full * mul : d.full), 0, 100);
          if (d.hyd) p.hyd = clamp(p.hyd + (d.hyd > 0 ? d.hyd * mul : d.hyd), 0, 100);
          if (d.hp) p.hp = Math.min(100, p.hp + d.hp + aid);
          if (d.cooked) toast('따뜻한 음식 — 기운이 난다');
          if (fr && fr.lv === 2) { if (rand() < .65) { p.sick = 360; toast('상한 음식을 먹었다… 속이 안 좋다', 2400); } else toast('상한 맛이 난다'); }
          if (d.stopBleed) { if (p.bleed) toast('지혈했다'); p.bleed = false; for (const w of p.wounds || []) w.band = true; gainXP('aid', 3); p.bandT = 720; }
          if (d.sickP && rand() < d.sickP) { p.sick = Math.max(p.sick || 0, 240); toast('물이 더러웠다… 배가 아프다', 2400); }
          if (d.splint) { const w = (p.wounds || []).find(w => w.k === 'fracture' && !w.spl); if (w) { w.spl = true; toast(PART_NAME[w.p] + '에 부목을 댔다'); gainXP('aid', 4); } }
          if (d.disinfect) { for (const w of p.wounds || []) w.dis = true; toast('상처를 소독했다 — 빨리 낫는다'); gainXP('aid', 2); if (d.uses && --it.u > 0) return; }
          p.inv.splice(p.inv.indexOf(it), 1);
          if (it.id === 'water' || it.id === 'dirtywater') stackAdd(mkItem('bottle'));
          if (G.sel && G.sel.uid === it.uid) G.sel = null;
        } });
      if (ci < 0) closeSheet(); // 가방에서 쓰면 창을 닫고 아래 진행바로 보여줌
    } else if (act === 'readmap') {
      const it = selIt(); if (!it) return;
      if (G.lv) return toast('건물 밖에서 펼쳐 보자');
      if (it.read) { closeSheet(); return openBigmap(mapFocus(it)); }
      queueAction({ uid: it.uid, sfx: 'map', label: nameOf(it) + ' 펼쳐 보는 중', icon: 'map', dur: 2.5, valid: () => p.inv.includes(it) && !G.lv,
        done: () => { const f = revealMap(it); it.read = 1; toast(nameOf(it) + '을(를) 읽었다 — 지도에 표시됐다', 2400); closeSheet(); openBigmap(f); } });
    } else if (act === 'read') {
      const it = selIt(); if (!it) return;
      readNote(it.nid);
    } else if (act === 'listen') {
      const R = (DT.STORY || {}).radio || [], day = Math.floor((G.time - 540) / 1440);
      SFX.play('radio');
      showStory('휴대용 라디오', `${day + 1}일차 · ${String(Math.floor(G.time % 1440 / 60)).padStart(2, '0')}시\n\n` + (R[Math.min(R.length - 1, day)] || '(잡음뿐이다)'));
    } else if (act === 'equip') {
      const it = selIt(); if (!it || busyUid(it.uid)) return;
      const on = p.equip !== it.uid, d = ITEMS[it.id];
      queueAction({ uid: it.uid, move: true, sfx: 'equip', label: d.name + (on ? ' 드는 중' : ' 내려놓는 중'), icon: d.icon, dur: on ? (d.type === 'gun' ? 1 : .6) : .3,
        valid: () => p.inv.includes(it),
        done: () => { if (on && p.equip2 === it.uid) p.equip2 = p.equip; p.equip = on ? it.uid : null; updateWeaponLook(); if (on) toast(d.name + ' 장착'); } });
    } else if (act === 'drop') {
      const it = selIt(); if (!it || busyUid(it.uid)) return;
      const c = ci, d = ITEMS[it.id];
      // 묶음 아이템: 1개 / 절반 / 전부
      let qty = d.stack && it.n > 1 ? (uid === '1' ? 1 : uid === 'half' ? Math.floor(it.n / 2) : it.n) : 0;
      if (c >= 0) { // 보관 한도: 들어가는 만큼만
        const free = contCap(c) - contWeight(c), unit = it.w != null ? it.w : d.w, want = qty || it.n || 1;
        const fit = unit > 0 ? Math.floor((free + 1e-6) / unit) : want;
        if (fit <= 0) return toast(`공간이 부족하다 (${cName(c)} ${contCap(c)}kg)`);
        if (fit < want) { if (!d.stack) return toast(`공간이 부족하다 (${cName(c)} ${contCap(c)}kg)`); qty = fit; toast(`들어가는 만큼만 넣었다 (${fit}개)`); if (qty >= it.n) qty = 0; }
      }
      queueAction({ uid: it.uid, sfx: 'loot', label: d.name + (c >= 0 ? ' 넣는 중' : ' 버리는 중'), icon: d.icon, dur: .3 + d.w * .2,
        valid: () => p.inv.includes(it) && (c < 0 || G.openC === c),
        done: () => {
          if (qty && qty < it.n) {
            it.n -= qty;
            const part = { uid: G.uid++, id: it.id, n: qty };
            if (c >= 0) { const same = cItems(c).find(x => x.id === it.id); if (same) same.n += qty; else cItems(c).push(part); }
            else dropToGround(part);
            return;
          }
          p.inv.splice(p.inv.indexOf(it), 1);
          if (p.equip === it.uid) { p.equip = null; updateWeaponLook(); }
          if (p.equip2 === it.uid) p.equip2 = null;
          if (c >= 0) { const same = d.stack && cItems(c).find(x => x.id === it.id); if (same) same.n += it.n; else cItems(c).push(it); }
          else dropToGround(it); // 버린 물건은 발밑에 남음 (다시 주울 수 있음)
          { const pb = c >= 0 && isPlacedC(c) && placedOf(c); if (pb && pb.type === 'pile') drawPile(pb); }
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
    G.containers.forEach((list, i) => { const c = M.containers[i]; if (c) ageList(list, mins * (c.kind === 'fridge' && G.power ? .25 : 1)); });
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
  // 분해 결과: 목공 레벨이 낮으면 재료가 하나씩 부서질 수 있음 (Lv0 30% → Lv10 0%)
  const breakChance = () => Math.max(0, .3 - .03 * skillLv('carp'));
  const dismantleTime = t => t * Math.max(.5, 1 - .05 * skillLv('carp')); // 레벨당 5%씩 빨라짐 (최대 절반)
  function giveOut(list, rr, brk) {
    const got = [];
    let broke = 0;
    for (const [id, a, b] of list) {
      let n = a + Math.floor(rr() * (b - a + 1));
      if (brk) { let k = 0; for (let i = 0; i < n; i++) if (rr() >= brk) k++; broke += n - k; n = k; }
      if (n <= 0) continue;
      if (ITEMS[id].stack) { const it = mkItem(id); it.n = n; stackAdd(it); }
      else for (let k = 0; k < n; k++) stackAdd(mkItem(id));
      got.push(ITEMS[id].name + ' ' + n);
    }
    if (broke) got.push(`부서짐 ${broke}`);
    if (!got.length) got.push('쓸 만한 게 안 나왔다');
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
      queueAction({ kind: 'craft', rid: r.id, sfx: r.id === 'boil' ? 'boil' : r.cook ? 'sizzle' : (CRAFT_SFX[r.id] || (hm ? 'craft_wood' : 'craft')), hammer: hm, label: ITEMS[r.out].name + (r.cook ? ' 요리 중' : ' 만드는 중'), icon: ITEMS[r.out].icon, dur: tm, noise: r.noise,
        valid: () => { const ok = recipeMax(r) > 0; if (!ok) { toast(ITEMS[r.out].name + ' — 재료가 모자라 중단'); setTimeout(() => { if (!$('sheet').classList.contains('hidden')) renderSheet(); }, 0); } return ok; },
        done: () => {
          for (const [id, need] of r.in) consume(id, need);
          const o = mkItem(r.out); if (ITEMS[r.out].dur) o.dur = ITEMS[r.out].dur;
          if (ITEMS[r.out].fresh) o.age = 0;
          if (r.cook) { o.q = +(1 + .05 * skillLv('cook')).toFixed(2); gainXP('cook', 5); }
          else if (hm) gainXP('carp', 4);
          stackAdd(o); for (let k = 1; k < (r.n || 1); k++) stackAdd(mkItem(r.out));
          if (invWeight() > capKg()) toast('너무 무겁다 — 느려진다');
        } });
    }
  }
  function dismantleFurniture(ci) {
    if (isCorpse(ci) || isPlacedC(ci)) return;
    const kind = M.containers[ci].kind, D = DISMANTLE[kind];
    if (contItems(ci).length) return toast('먼저 안을 비워야 한다');
    if (!has(D.tool)) return toast(TOOL_NAME[D.tool] + '가 필요하다');
    queueAction({ kind: 'dismantle', hammer: D.tool === 'hammer', sfx: D.tool === 'hammer' ? null : 'screw', label: LOOT[kind].name + ' 분해 중', icon: 'screwdriver', dur: dismantleTime(D.time), noise: D.noise,
      valid: () => G.openC === ci && has(D.tool) && !contItems(ci).length,
      done: () => {
        G.removed.add(ci); refreshContainer(ci);
        { const c = M.containers[ci], k = c.y * M.W + c.x; if (M.deco[k]) { M.deco[k] = 0; M.moveBlock[k] = 0; } } // 진열대 등 막힌 칸 풀기
        const got = giveOut(D.out, rand, breakChance()); gainXP('carp', 3);
        closeSheet(); toast('분해 완료 — ' + got.join(', '), 2600);
      } });
  }
  function dismantleBench(bi) {
    const D = DISMANTLE.bench;
    if (!has(D.tool)) return toast('망치가 필요하다');
    const b = G.placed[bi];
    queueAction({ kind: 'dismantle', hammer: true, label: '작업대 분해 중', icon: 'screwdriver', dur: dismantleTime(D.time), noise: D.noise,
      valid: () => G.placed.includes(b) && has(D.tool),
      done: () => { removePlaced(b); const got = giveOut(D.out, rand, breakChance()); gainXP('carp', 3); toast('분해 완료 — ' + got.join(', '), 2600); } });
  }
  function dismantleItem(it) {
    const D = ITEM_DISMANTLE[it.id];
    if (D.tool && !has(D.tool)) return toast(TOOL_NAME[D.tool] + '가 필요하다');
    queueAction({ uid: it.uid, sfx: D.out.some(o => o[0] === 'cloth') ? 'craft_cloth' : D.tool === 'hammer' ? null : D.tool === 'screwdriver' ? 'screw' : 'craft_wood', hammer: D.tool === 'hammer', label: ITEMS[it.id].name + ' 분해 중', icon: 'screwdriver', dur: dismantleTime(D.time), noise: D.noise,
      valid: () => G.p.inv.includes(it) && (!D.tool || has(D.tool)),
      done: () => {
        G.p.inv.splice(G.p.inv.indexOf(it), 1);
        if (G.p.equip === it.uid) { G.p.equip = null; updateWeaponLook(); }
        if (G.sel && G.sel.uid === it.uid) G.sel = null;
        toast('분해 — ' + giveOut(D.out, rand, breakChance()).join(', ')); gainXP('carp', 1.5);
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
    const p = G.p, isF = it.id === 'furn' || it.id === 'campkit' || it.id === 'raincol';
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
        if (it.id === 'raincol') { addPlaced({ x, y, type: 'raincol', w: 0 }); SFX.play('place'); toast('빗물 받이를 놓았다 — 밖에 두면 비가 올 때 찬다'); }
        else if (it.id === 'campkit') { addPlaced({ x, y, type: 'campfire' }); SFX.play('fireup'); toast('모닥불을 피웠다 — 정전돼도 요리 가능'); }
        else if (isF) { addPlaced({ x, y, type: 'furn', kind: it.kind, items: it.items || [] }); SFX.play('place'); toast(nameOf(it) + '을(를) 놓았다'); }
        else { addPlaced({ x, y, type: 'bench' }); SFX.play('place'); toast('작업대를 설치했다'); }
      } });
  }
  function addPlaced(b) {
    G.pid = Math.max(G.pid || 0, (b.id || 0) + 1);
    if (b.id == null) b.id = G.pid++;
    G.placed.push(b);
    if (b.type !== 'pile') M.moveBlock[b.y * M.W + b.x] = 1; // 바닥에 둔 물건 더미는 지나갈 수 있음
    b.g = el('g', { transform: `translate(${b.x} ${b.y})` }, L.placed);
    if (b.type === 'pile') { drawPile(b); return; }
    if (b.type === 'campfire') {
      el('circle', { cx: .5, cy: .5, r: .38, fill: '#2a2622', stroke: '#6b6660', 'stroke-width': .1, 'stroke-dasharray': '.12 .06' }, b.g);
      el('path', { d: 'M.2 .35L.8 .65M.2 .65L.8 .35', stroke: '#4a3624', 'stroke-width': .1, 'stroke-linecap': 'round' }, b.g);
      el('path', { d: 'M.5 .22Q.72 .45 .6 .66Q.5 .74 .4 .66Q.28 .45 .5 .22Z', fill: '#ff9a2a', class: 'flame' }, b.g);
      el('path', { d: 'M.5 .38Q.6 .52 .55 .62Q.5 .66 .45 .62Q.4 .52 .5 .38Z', fill: '#ffe08a', class: 'flame2' }, b.g);
      b.glow = el('circle', { cx: b.x + .5, cy: b.y + .5, r: 3.6, fill: 'url(#lampGlow)', 'fill-opacity': L._fop || 0 }, L.fires);
      return;
    }
    if (b.type === 'raincol') { el('circle', { cx: .5, cy: .5, r: .4, fill: '#2e3a44', stroke: '#0e1216', 'stroke-width': .07 }, b.g); b.wv = el('circle', { cx: .5, cy: .5, r: .05, fill: '#6aa8d8', opacity: .85 }, b.g); el('path', { d: 'M.14 .5H.86M.5 .14V.86', stroke: '#8a6a45', 'stroke-width': .05 }, b.g); drawRainCol(b); return; }
    if (b.type === 'furn') {
      if (FURN_CONT[b.kind]) drawFurniture(b.g, b.kind); else drawDecor(b.g, { kind: b.kind, x: 0, y: 0, w: 1, h: 1, wx: 0, wy: -1, c: b.id % 6 });
      return;
    }
    el('rect', { x: .0625, y: .125, width: .875, height: .75, fill: '#8a6a45', stroke: '#000', 'stroke-width': .06 }, b.g);
    el('path', { d: 'M.1 .38H.9M.1 .62H.9', stroke: '#5a432d', 'stroke-width': .05 }, b.g);
    el('path', { d: 'M.62 .2L.82 .42M.3 .55l.18 .18', stroke: '#d9dde0', 'stroke-width': .07, 'stroke-linecap': 'round' }, b.g);
  }
  function drawRainCol(b) { if (b.wv) b.wv.setAttribute('r', (.05 + .3 * Math.min(1, (b.w || 0) / 20)).toFixed(3)); }
  // 바닥에 버린 물건 더미: 자루 + 맨 위 물건 아이콘
  function drawPile(b) {
    b.g.innerHTML = '';
    const top = (b.items || [])[0], ic = top && ITEMS[top.id] ? ITEMS[top.id].icon : 'bag';
    el('ellipse', { cx: .5, cy: .66, rx: .34, ry: .12, fill: '#000', opacity: .35 }, b.g);
    el('path', { d: 'M.2 .66Q.16 .34 .36 .3L.64 .3Q.84 .34 .8 .66Q.5 .76 .2 .66Z', fill: '#6b5a3e', stroke: '#1a140c', 'stroke-width': .04 }, b.g);
    el('path', { d: 'M.4 .3L.46 .22H.54L.6 .3', fill: 'none', stroke: '#1a140c', 'stroke-width': .04 }, b.g);
    const u = el('use', { href: '#i-' + ic, x: .33, y: .36, width: .34, height: .26 }, b.g); u.style.color = '#e9e3d2';
    if ((b.items || []).length > 1) { el('circle', { cx: .78, cy: .28, r: .12, fill: '#c8141f', stroke: '#000', 'stroke-width': .02 }, b.g); const t = el('text', { x: .78, y: .32, 'text-anchor': 'middle', 'font-size': .14, 'font-weight': 800, fill: '#fff', 'font-family': 'sans-serif' }, b.g); t.textContent = Math.min(99, b.items.length); }
  }
  function dropToGround(it) {
    const p = G.p, x = clamp(Math.floor(p.x), 1, M.W - 2), y = clamp(Math.floor(p.y), 1, M.H - 2);
    let b = G.placed.find(q => q.type === 'pile' && Math.abs(q.x - x) + Math.abs(q.y - y) <= 1);
    if (!b) { b = { x, y, type: 'pile', kind: 'pile', items: [] }; addPlaced(b); }
    const same = ITEMS[it.id].stack && b.items.find(q => q.id === it.id);
    if (same) same.n += it.n || 1; else b.items.unshift(it);
    drawPile(b);
  }
  function removePlaced(b) {
    const i = G.placed.indexOf(b); if (i < 0) return;
    G.placed.splice(i, 1);
    if (b.type !== 'pile') M.moveBlock[b.y * M.W + b.x] = 0;
    if (G.nearC === PLACED + b.id) G.nearC = -1;
    if (G.openC === PLACED + b.id) closeSheet();
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
      if (d < fd && FURN[c.kind]) { fd = d; fb = { t: 'cont', i, kind: c.kind }; }
    }
    for (let i = 0; i < (M.decor || []).length; i++) {
      if (G.rmDecor && G.rmDecor.has(i)) continue;
      const q = M.decor[i];
      if (!FURN[q.kind]) continue; // 주유기 등은 못 듦
      const d = Math.hypot(clamp(p.x, q.x, q.x + q.w) - p.x, clamp(p.y, q.y, q.y + q.h) - p.y) + .4;
      if (d < fd) { fd = d; fb = { t: 'decor', i, kind: q.kind }; }
    }
    for (const b of G.placed) {
      if (b.type === 'pile') continue;
      const d = Math.hypot(b.x + .5 - p.x, b.y + .5 - p.y);
      if (d < fd) { fd = d; fb = { t: 'placed', b, kind: b.type === 'bench' ? 'bench' : b.type === 'campfire' ? 'campfire' : b.type === 'raincol' ? 'raincol' : b.kind }; }
    }
    G.nearOp = best; G.nearLift = fb;
    // 벨 수 있는 나무 (바로 옆 칸)
    let tb = -1, td = 1.25;
    const tpx = Math.floor(p.x), tpy = Math.floor(p.y);
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const x = tpx + dx, y = tpy + dy; if (x < 1 || y < 1 || x >= M.W - 1 || y >= M.H - 1) continue;
      const k = y * M.W + x; if (M.t[k] !== DT.T.TREE) continue;
      const d = Math.hypot(x + .5 - p.x, y + .5 - p.y); if (d < td) { td = d; tb = k; }
    }
    G.nearTree = tb;
    // 계단 (서 있거나 바로 옆)
    let sb = null, sd = 1.3;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const x = tpx + dx, y = tpy + dy; if (x < 0 || y < 0 || x >= M.W || y >= M.H) continue;
      const k = y * M.W + x; if (M.t[k] !== DT.T.STAIRS) continue;
      const d = Math.hypot(x + .5 - p.x, y + .5 - p.y); if (d < sd) { sd = d; sb = { k, x, y }; }
    }
    G.nearStair = sb;
  }
  function altOptions() {
    const out = [], p = G.p;
    if (G.vehicles && !G.lv) {
      if (p.inCar != null) { // 운전 중엔 차 관련 행동만
        const v = G.vehicles[p.inCar];
        out.push(['carOut', '차에서 내리기', 'car', Math.abs(v.v) > 1]);
        if (Math.abs(v.v) < .3 && nearPump(v)) out.push(['refuel', G.power ? `주유하기 (연료 ${Math.round(v.fuel)}%)` : '주유하기 — 정전으로 멈춤', 'fuel', !G.power || v.fuel >= 99]);
        return out;
      }
      const v = nearVehicle();
      if (v) { if (cans().length) { if (canFuel() > .05 && v.fuel < 99) out.push(['canPour', `기름통 붓기 (${canFuel().toFixed(1)}L)`, 'fuel']); if (v.fuel > 1 && canSpace() > .05) out.push(['siphon', `기름 빼기 → 기름통 (차 ${Math.round(v.fuel)}%)`, 'fuel']); }
        if (v.hp < 100 && has('wrench')) out.push(['carFix', `차 고치기 (${Math.round(v.hp)}%) · 렌치+고철 ${countOf('scrap')}`, 'wrench', !(has('wrench') && countOf('scrap'))]); }
      if (cans().length && nearPump(p) && canSpace() > .05) out.push(['canFill', G.power ? `기름통 채우기 (${canFuel().toFixed(1)}/${cans().length * CAN_MAX}L)` : '기름통 채우기 — 정전으로 멈춤', 'fuel', !G.power]);
      if (v) { const k = hasKeyFor(v); out.push(['carIn', v.hp <= 0 ? '차에 타기 — 망가짐' : k ? `차에 타기 (연료 ${Math.round(v.fuel)}%)` : '차에 타기 — 열쇠 없음', 'car', !k || v.hp <= 0]); }
    }
    const hammer = has('hammer'), boards = countOf('barricade');
    if (G.nearOp && G.ds[G.nearOp.o.k]) {
      const o = G.nearOp.o, s = G.ds[o.k], nb = s.b.length;
      if (o.type === 'door') {
        if (!s.br && !nb) out.push(s.o ? ['doorClose', '문 닫기', 'close'] : ['doorOpen', '문 열기', 'hand']);
        if ((!s.o || s.br) && nb < 4) out.push(['board', `판자로 막기 (${nb}/4)`, 'barricade', !(hammer && boards)]);
      } else {
        if (!s.br && !nb) out.push(['smash', '창문 깨기', 'fist']);
        if (s.br && !nb) {
          // 반대편 칸이 가구 등으로 막혀 있으면 빨간색으로 표시 (넘을 수 없음)
          const side = o.horiz ? (p.y < o.y + .5 ? 1 : -1) : (p.x < o.x + .5 ? 1 : -1);
          const tx = o.horiz ? o.x : o.x + side, ty = o.horiz ? o.y + side : o.y, tk = ty * M.W + tx;
          const blocked = M.moveBlock[tk] || M.dynBlock[tk];
          if (G.lv && G.lv.z > 0 && M.t[tk] === DT.T.VOID) out.push(['jump', `창문으로 뛰어내리기 (${DT.floorName(G.lv.z)} — 다칠 수 있음)`, 'run', false, 'red']); // 위층: 밖으로 뛰어내림
          else out.push(blocked ? ['climb', '창문 넘기 — 안쪽이 막힘', 'run', true, 'red'] : ['climb', '창문 넘기', 'run']);
        }
        if (nb < 4) out.push(['board', `판자로 막기 (${nb}/4)`, 'barricade', !(hammer && boards)]);
      }
      if (nb) out.push(['unboard', '판자 떼기', 'hammer', !hammer]);
    }
    if (G.nearTree >= 0) out.push(['chop', '나무 베기', 'axe', !has('axe')]);
    const wt = nearWater();
    if (wt && wt.kind === 'tap') {
      if (G.waterOn) { out.push(['tapDrink', '수돗물 마시기', 'drop']); if (bottles()) out.push(['tapFill', `물병 채우기 (${bottles()}개)`, 'bottle']); }
      else out.push(['tapDrink', '수도 — 단수로 물이 안 나온다', 'drop', true]);
    } else if (wt && wt.kind === 'toilet') {
      const used = (G.toiletUsed || []).includes(wt.k);
      if (G.waterOn) out.push(['tapDrink', '수돗물 마시기', 'drop']);
      else out.push(['toiletWater', used ? '변기 물통 — 비었다' : '변기 물통에서 물 뜨기 (물병 필요)', 'bottle', used || !bottles()]);
    }
    if (G.nearLift && G.nearLift.kind === 'raincol') { const b = G.nearLift.b, n = Math.floor(b.w || 0); out.push(['rainDrink', `빗물 마시기 (${n}병 분량)`, 'drop', n < 1]); if (bottles()) out.push(['rainFill', `빗물 뜨기 → 물병 (${Math.min(n, bottles())}개)`, 'bottle', n < 1]); }
    const si = stairInfo();
    if (si) {
      if (si.z < si.info.max) out.push(['up', `위층으로 (${DT.floorName(si.z + 1)})`, 'stairs']);
      if (si.z > si.info.min) out.push(['down', `아래층으로 (${DT.floorName(si.z - 1)})`, 'stairs']);
    }
    if (G.nearLift) {
      const f = G.nearLift, nm = f.kind === 'bench' ? '작업대' : f.kind === 'campfire' ? '모닥불' : f.kind === 'raincol' ? '빗물 받이' : FURN[f.kind][0];
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
    if (act === 'carIn') {
      const v = nearVehicle(); if (!v || !hasKeyFor(v) || v.hp <= 0) return;
      return queueAction({ kind: 'car', label: '차에 타는 중', icon: 'car', dur: .7, valid: () => nearVehicle() === v,
        done: () => { p.inCar = v.id; p.crouch = false; vehBlock(v, false); SFX.play('carDoor'); if (v.fuel > 0 && v.hp > 0) setTimeout(() => SFX.play('engine_start', { vol: .8 }), 350); toast(`연료 ${Math.round(v.fuel)}% · 차 상태 ${Math.round(v.hp)}% — 빨간 버튼은 경적`, 2600); } });
    }
    if (act === 'carOut') return exitCar();
    if (act === 'jump') {
      const o0 = G.nearOp && G.nearOp.o; if (!o0 || !G.lv || G.lv.z <= 0) return;
      const side = o0.horiz ? (p.y < o0.y + .5 ? 1 : -1) : (p.x < o0.x + .5 ? 1 : -1), hi = G.lv.hi, z = G.lv.z, h = G.worldM.houses[hi];
      const lx = o0.horiz ? o0.x : o0.x + side, ly = o0.horiz ? o0.y + side : o0.y;
      return queueAction({ kind: 'jump', label: '창문으로 뛰어내리는 중', icon: 'run', dur: 1.4, noise: 2, valid: () => !!G.lv && G.lv.hi === hi,
        done: () => {
          const W0 = G.worldM; let tx = lx + h.x - 1, ty = ly + h.y - 1;
          if (W0.moveBlock[ty * W0.W + tx] || W0.t[ty * W0.W + tx] === DT.T.FLOOR) { let best = null; for (let r = 1; r < 6 && !best; r++) for (let dy = -r; dy <= r && !best; dy++) for (let dx = -r; dx <= r; dx++) { const x = tx + dx, y = ty + dy; if (!W0.moveBlock[y * W0.W + x] && W0.t[y * W0.W + x] !== DT.T.FLOOR && W0.t[y * W0.W + x] !== DT.T.WALL) { best = [x, y]; break; } } if (best) [tx, ty] = best; }
          changeLevel(hi, 0, false, [tx + .5, ty + .5]);
          // 높이만큼 다침: 2층 가벼움 · 3층 위험 · 4층 이상 매우 위험
          const P = G.p, frP = z === 1 ? .25 : z === 2 ? .6 : .9, dmg = z === 1 ? 8 : z === 2 ? 20 : 35 + 10 * (z - 3);
          P.hp -= dmg; hurtFlash(); shake(.5); SFX.play('land'); SFX.play('hurt'); noise(P.x, P.y, 8, true);
          const leg = rand() < .5 ? 'legl' : 'legr';
          if (rand() < frP) { addWound('fracture', leg); toast(`${DT.floorName(z)}에서 뛰어내렸다 — ${PART_NAME[leg]} 골절!`, 3000); }
          else { addWound('bruise', leg); toast(`${DT.floorName(z)}에서 뛰어내렸다 — ${PART_NAME[leg]} 타박상`, 2400); }
          if (z >= 3) addWound('bruise', 'torso');
          if (P.hp <= 0) die();
        } });
    }
    if (act === 'tapDrink') { if (!G.waterOn) return toast('단수 — 물이 안 나온다'); return queueAction({ kind: 'drink', sfx: 'tap', label: '수돗물 마시는 중', icon: 'drop', dur: 2.5, valid: () => !!nearWater(), done: () => drinkRaw(30, 0, '시원하다') }); }
    if (act === 'tapFill') { if (!G.waterOn) return; return queueAction({ kind: 'drink', sfx: 'tap', label: '물병 채우는 중', icon: 'bottle', dur: 1 + bottles() * .6, valid: () => !!nearWater() && G.waterOn, done: () => { const n = fillBottles(99, 'water'); toast(`물병 ${n}개를 채웠다`); } }); }
    if (act === 'toiletWater') { const wt = nearWater(); if (!wt || !bottles()) return toast('빈 물병이 필요하다'); return queueAction({ kind: 'drink', sfx: 'tap', label: '변기 물통에서 물 뜨는 중', icon: 'bottle', dur: 3, valid: () => nearWater() && nearWater().k === wt.k,
      done: () => { const n = fillBottles(2, 'dirtywater'); G.toiletUsed = G.toiletUsed || []; G.toiletUsed.push(wt.k); toast(`끓이지 않은 물 ${n}병 — 끓여 마시자`, 2400); } }); }
    if (act === 'rainDrink' || act === 'rainFill') { const f = G.nearLift; if (!f || f.kind !== 'raincol') return; const b = f.b;
      return queueAction({ kind: 'drink', sfx: act === 'rainDrink' ? 'drink' : 'tap', label: act === 'rainDrink' ? '빗물 마시는 중' : '빗물 뜨는 중', icon: 'drop', dur: act === 'rainDrink' ? 2.5 : 1 + bottles() * .6, valid: () => G.placed.includes(b) && b.w >= 1,
        done: () => { if (act === 'rainDrink') { b.w -= 1; drinkRaw(30, .2, '빗물을 마셨다'); } else { const n = fillBottles(Math.floor(b.w), 'dirtywater'); b.w -= n; toast(`빗물 ${n}병 — 끓이면 안전하다`); } drawRainCol(b); } }); }
    const mech = skillLv('mech'), mt = 1 - .05 * mech;
    if (act === 'canPour') {
      const v = nearVehicle(); if (!v) return;
      return queueAction({ kind: 'fuel', sfx: 'fuel', label: '기름 붓는 중', icon: 'fuel', dur: 3 * mt, valid: () => nearVehicle() === v,
        done: () => { const got = canTake((100 - v.fuel) * TANK_L / 100); v.fuel = Math.min(100, v.fuel + got / TANK_L * 100); v._fw = 0; gainXP('mech', 1); toast(`기름 ${got.toFixed(1)}L 넣음 → 연료 ${Math.round(v.fuel)}%`); } });
    }
    if (act === 'siphon') {
      const v = nearVehicle(); if (!v) return;
      return queueAction({ kind: 'fuel', sfx: 'fuel', label: '기름 빼는 중', icon: 'fuel', dur: 6 * mt, noise: 1, valid: () => nearVehicle() === v,
        done: () => { const l = Math.min(canSpace(), v.fuel * TANK_L / 100); canAdd(l); v.fuel = Math.max(0, v.fuel - l / TANK_L * 100); gainXP('mech', 2); toast(`기름 ${l.toFixed(1)}L 뺐다 (차 ${Math.round(v.fuel)}%)`); } });
    }
    if (act === 'canFill') {
      if (!G.power) return toast('정전 — 주유기가 멈췄다. 세워진 차에서 기름을 빼자', 2600);
      return queueAction({ kind: 'fuel', sfx: 'fuel', label: '기름통 채우는 중', icon: 'fuel', dur: 3, noise: 2, valid: () => nearPump(p) && G.power,
        done: () => { const l = canSpace(); canAdd(l); toast(`기름 ${l.toFixed(1)}L 채움`); } });
    }
    if (act === 'carFix') {
      const v = nearVehicle(); if (!v) return;
      if (!has('wrench') || !countOf('scrap')) return toast('렌치와 고철이 필요하다');
      return queueAction({ kind: 'carfix', sfx: 'wrench', label: '차 고치는 중', icon: 'wrench', dur: 6 * mt, noise: 4, valid: () => nearVehicle() === v && countOf('scrap') > 0,
        done: () => { consume('scrap', 1); v.hp = Math.min(100, Math.round(v.hp + 8 + 2 * mech)); v._dead = 0; gainXP('mech', 5); toast(`차 상태 ${v.hp}%`); } });
    }
    if (act === 'refuel') {
      const v = G.vehicles[p.inCar]; if (!v || !G.power) return;
      return queueAction({ kind: 'refuel', label: '주유하는 중', icon: 'fuel', dur: 4, noise: 2, valid: () => p.inCar === v.id && Math.abs(v.v) < .3,
        done: () => { v.fuel = Math.min(100, v.fuel + 55); v._fw = 0; toast(`연료 ${Math.round(v.fuel)}%`); } });
    }
    if (act === 'up' || act === 'down') {
      const si = stairInfo(); if (!si) return;
      const nz = si.z + (act === 'up' ? 1 : -1);
      return queueAction({ kind: 'stairs', label: act === 'up' ? '계단 오르는 중' : '계단 내려가는 중', icon: 'stairs', dur: .9, noise: 1,
        valid: () => !!stairInfo(),
        done: () => { const nf = queueFollowers(si.hi, si.z, nz); changeLevel(si.hi, nz); SFX.play('step', { stairs: 1, vol: .8 }); if (nf) setTimeout(() => toast(`좀비 ${nf}마리가 따라온다!`, 2000), 1900); toast((M.level ? M.level.floor : '1층') + (M.dark ? ' — 어둡다' : ''), 1800); } });
    }
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
    } else if (act === 'chop') {
      const k = G.nearTree; if (k < 0) return;
      if (!has('axe')) return toast('도끼가 필요하다 (철물점·옷장·차량에서 찾기)');
      queueAction({ kind: 'chop', sfx: 'chop', label: '나무 베는 중', icon: 'axe', dur: 7 * (1 - .05 * skillLv('carp')), noise: 7,
        valid: () => M.t[k] === DT.T.TREE && G.nearTree === k,
        done: () => {
          M.t[k] = DT.T.GRASS; M.moveBlock[k] = 0; M.sightBlock[k] = 0; G.chopped.add(k); G.dsV++;
          const x = k % M.W, y = (k / M.W) | 0;
          // 나무 자리만 잔디로 덮음 (옆 칸이 잔디면 가지 그림자까지 조금 더 넓게)
          rebuildChunkAt(x, y); // 나무 자리는 그루터기로 다시 그림
          const n = 1 + (rand() < .5 ? 1 : 0);
          for (let i = 0; i < n; i++) stackAdd(mkItem('log'));
          const ax = G.p.inv.find(i => i.id === 'axe'); if (ax && ax.dur != null) { ax.dur -= 2; if (ax.dur <= 0) { G.p.inv.splice(G.p.inv.indexOf(ax), 1); if (G.p.equip === ax.uid) G.p.equip = null; updateWeaponLook(); toast('도끼가 부서졌다'); } }
          G.p.endu = Math.max(0, G.p.endu - 18); gainXP('carp', 4); SFX.play('boardBreak');
          toast(`통나무 ${n}개 — 톱으로 판자 3개씩 만들 수 있다`, 2400);
        } });
    } else if (act === 'smash') {
      queueAction({ kind: 'smash', urgent: true, label: '창문 깨는 중', icon: 'fist', dur: .6,
        valid: () => !s.br && !s.b.length, done: () => { s.br = 1; updTile(o.k); SFX.play('glass'); noise(o.x + .5, o.y + .5, 13, true); shake(.25); } });
    } else if (act === 'climb') {
      queueAction({ kind: 'climb', urgent: true, label: '창문 넘는 중', icon: 'run', dur: 1.3,
        valid: () => s.br && !s.b.length && Math.hypot(o.x + .5 - p.x, o.y + .5 - p.y) < 1.6,
        done: () => {
          // 벽 반대편으로
          if (o.horiz) { p.x = o.x + .5; p.y = o.y + .5 + (p.y < o.y + .5 ? 1 : -1); }
          else { p.y = o.y + .5; p.x = o.x + .5 + (p.x < o.x + .5 ? 1 : -1); }
          resolve(p);
          if (rand() < .12) { const w = addWound('cut', rand() < .5 ? 'arml' : 'armr'); p.hp -= 3; hurtFlash(); toast('깨진 유리에 ' + PART_NAME[w.p] + ' 베였다 — 출혈'); }
        } });
    } else if (act === 'lift') {
      const f = G.nearLift; if (!f) return;
      const kind = f.kind;
      if (f.t === 'cont' && contItems(f.i).length) return toast('먼저 안을 비워야 한다');
      if (f.t === 'placed' && f.b.items && f.b.items.length) return toast('먼저 안을 비워야 한다');
      if (G.p.inv.some(i => i.id === 'furn')) return toast('가구는 한 번에 하나만 들 수 있다');
      if (kind === 'campfire') return queueAction({ kind: 'lift', label: '모닥불 끄는 중', icon: 'fire', dur: 1, valid: () => true, done: () => { removePlaced(f.b); toast('모닥불을 껐다'); } });
      if (kind === 'raincol') return queueAction({ kind: 'lift', label: '빗물 받이 드는 중', icon: 'drop', dur: 1.2, valid: () => true, done: () => { removePlaced(f.b); stackAdd(mkItem('raincol')); toast('빗물 받이를 들었다 (물은 쏟아졌다)'); } });
      queueAction({ kind: 'lift', label: (kind === 'bench' ? '작업대' : FURN[kind][0]) + ' 드는 중', icon: 'bench', dur: 1.5, noise: 2,
        valid: () => true,
        done: () => {
          if (f.t === 'cont') { if (G.openC === f.i) closeSheet(); G.removed.add(f.i); refreshContainer(f.i); const c = M.containers[f.i], k = c.y * M.W + c.x; if (M.deco && M.deco[k]) { M.deco[k] = 0; M.moveBlock[k] = 0; } }
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
    rebuildChunkAt(q.x, q.y);
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
    $('altMenu').innerHTML = opts.map(o => `<button data-alt="${o[0]}"${o[3] ? ` class="off${o[4] ? ' ' + o[4] : ''}"` : ''}>${ico(o[2])}${o[1]}</button>`).join('');
    b.classList.toggle('red', opts.length === 1 && opts[0][4] === 'red');
  }
  // 상태 설명: [무슨 일이 생기나, 어떻게 풀리나]
  const MD_INFO = {
    '출혈': ['체력이 빠르게 줄어든다. 피를 흘리는 동안은 잘 수 없다.', '붕대(또는 천)를 감아 지혈한다.'],
    '추움': ['체온이 떨어지는 중. 기력(피로)이 더 빨리 줄고 체력이 회복되지 않는다.', '옷을 더 입거나, 실내·모닥불 옆으로 간다. 젖었으면 먼저 말린다.'],
    '저체온': ['체온이 위험하게 낮다. 체력이 계속 줄어든다.', '바로 실내·모닥불로 가서 몸을 데우고, 따뜻한 옷을 입는다.'],
    '더움': ['몸이 뜨겁다. 목이 더 빨리 마르고 체력이 회복되지 않는다.', '옷을 벗거나 가볍게 입고, 달리기를 줄이고 물을 마신다.'],
    '열사병': ['체온이 위험하게 높다. 체력이 계속 줄어든다.', '옷을 벗고 쉬면서 물을 마신다.'],
    '젖음': ['옷이 젖어 보온이 떨어지고 몸이 빨리 식는다.', '실내에 있으면 천천히, 모닥불 옆이면 빨리 마른다.'],
    '골절': ['뼈가 부러졌다. 다친 곳에 따라 걷기나 공격이 크게 약해지고, 아주 느리게 낫는다.', '부목을 대면 훨씬 빨리 낫는다 (제작: 판자 + 천).'],
    '골절 · 부목': ['부목으로 고정한 상태. 아직 약하지만 낫는 중이다.', '시간이 지나면 낫는다. 잠을 자면 더 빨리 낫는다.'],
    '다리 부상': ['다리를 다쳐 이동이 느려진다.', '붕대를 감고 시간이 지나면 낫는다.'],
    '팔 부상': ['팔을 다쳐 공격이 약해진다.', '붕대를 감고 시간이 지나면 낫는다.'],
    '메스꺼움': ['좀비에게 물려 감염됐다. 시간이 지나면 체력이 계속 줄어든다.', '치료 방법은 없다. 체력을 높게 유지해 버틴다.'],
    '식중독': ['상한 음식이나 더러운 물 때문에 체력과 수분이 조금씩 준다.', '시간이 지나면 낫는다. 물을 충분히 마신다.'],
    '정전': ['전기가 끊겼다. 냉장고가 멈춰 음식이 빨리 상하고, 조리대·가로등을 쓸 수 없다.', '요리는 모닥불로 한다.'],
    '중상': ['체력이 낮다. 이동이 느려진다.', '출혈을 멈추고, 배·물을 40 넘게 채운 뒤 쉬거나 자면 회복된다.'],
    '배고픔': ['배가 고프다. 포만이 40 아래면 체력이 회복되지 않는다.', '음식을 먹는다.'],
    '굶주림': ['굶고 있다. 0이 되면 체력이 줄어든다.', '바로 음식을 먹는다.'],
    '갈증': ['목이 마르다. 수분이 40 아래면 체력이 회복되지 않는다.', '물이나 음료를 마신다.'],
    '탈수': ['탈수 상태. 0이 되면 체력이 빠르게 줄어든다.', '바로 물을 마신다.'],
    '피곤': ['기력이 낮다. 20 아래면 이동이 느려진다.', '잠을 잔다 (침대에서 자면 더 빨리 회복).'],
    '지침': ['지구력을 다 썼다. 질주할 수 없고, 거의 바닥이면 공격도 느려진다.', '멈춰 서서 숨을 고르거나 휴식한다.'],
    '과적': ['들 수 있는 무게를 넘었다. 이동이 30% 느려진다.', '짐을 버리거나 큰 가방을 멘다.'],
  };
  function showMdInfo(t, el0) {
    const box = $('mdInfo'), i = MD_INFO[t]; if (!i) return;
    if (!box.classList.contains('hidden') && box._t === t) { box.classList.add('hidden'); return; }
    box._t = t; box.innerHTML = `<b>${t}</b><p>${i[0]}</p><p class="fix">${ico('hand')}${i[1]}</p>`;
    box.classList.remove('hidden'); SFX.play('ui_tap');
    clearTimeout(L._mdTO); L._mdTO = setTimeout(() => box.classList.add('hidden'), 6000);
  }
  // 휴식: 기력이 80 이상이면 잠 대신 휴식 (시간이 3배 빨리 흐름 — 배고픔·목마름도 3배)
  function startRest() {
    const p = G.p;
    if (G.zombies.some(z => !z.dead && z.state === 'chase' && Math.hypot(z.x - p.x, z.y - p.y) < 16)) return toast('좀비가 쫓아와서 쉴 수 없다');
    cancelActions(); closeSheet();
    G.resting = true; input.jx = input.jy = 0;
    $('restBar').classList.remove('hidden');
    toast('잠깐 쉰다 — 시간이 3배 빨리 흐른다', 2000);
  }
  function stopRest(msg) {
    if (!G.resting) return;
    G.resting = false; $('restBar').classList.add('hidden');
    if (msg) toast(msg, 2000);
  }
  function trySleep() {
    const p = G.p;
    if (p.energy >= 80) return startRest(); // 기력이 충분하면 잠 대신 휴식
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
    const out = serializeBase();
    // 위·아래층에 있으면: 기본 칸은 월드 상태로, 지금 층과 다녀온 층은 lv에
    if (G.lv) {
      Object.assign(out, cleanCtx(G.lvWorld));
      out.lv = {}; for (const k in G.lvStore) out.lv[k] = cleanCtx(G.lvStore[k]);
      out.lv[lvKey(G.lv)] = cleanCtx(snapshotCtx());
      out.plv = { hi: G.lv.hi, z: G.lv.z, x: G.p.x, y: G.p.y };
      const st = G.worldM.levels[G.lv.hi].stair; out.p.x = st[0] + .5; out.p.y = st[1] + .5;
    } else { out.lv = {}; for (const k in (G.lvStore || {})) out.lv[k] = cleanCtx(G.lvStore[k]); }
    return out;
  }
  function serializeBase() {
    const p = G.p;
    return {
      v: 1, seed: G.seed, time: G.time, kills: G.kills, uid: G.uid, lastHour: G.lastHour,
      p: { x: p.x, y: p.y, face: p.face, hp: p.hp, full: p.full, hyd: p.hyd, energy: p.energy, endu: p.endu,
        bleed: p.bleed, infected: p.infected, infT: p.infT, bt: p.bt != null ? +p.bt.toFixed(2) : 36.6, wounds: p.wounds || [], wet: +(p.wet || 0).toFixed(2), quick: p.quick || [], inv: p.inv, equip: p.equip, equip2: p.equip2 != null ? p.equip2 : null, wear: p.wear || {}, sick: p.sick || 0, inCar: p.inCar != null ? p.inCar : null },
      rain: G.rain, rainTarget: G.rainTarget, weatherNext: G.weatherNext, sk: G.sk, power: G.power, powerOffAt: G.powerOffAt, waterOn: G.waterOn, waterOffAt: G.waterOffAt, snowCov: +(G.snowCov || 0).toFixed(3), marks: G.marks || [], toiletUsed: G.toiletUsed || [], sick: G.p.sick,
      cont2: (() => { const o = {}; G.containers.forEach((l, i) => { o[i] = l; }); return o; })(), searched: [...G.searched], removed: [...G.removed], chopped: [...(G.chopped || [])], placed: G.placed.map(b => ({ x: b.x, y: b.y, type: b.type, kind: b.kind, items: b.items, id: b.id, w: b.w })), ds: dsSave(), rmDecor: [...(G.rmDecor || [])],
      z: G.zombies.filter(z => !z.dead).map(z => [+z.x.toFixed(2), +z.y.toFixed(2), +z.hp.toFixed(2), z.shirt, 0, 0, z.lk]).concat([].concat(...G.zdorm.values()).map(r => [r[0], r[1], r[2], r[3], 0, 0, r[4]])),
      c: G.corpses.map(c => [+c.x.toFixed(2), +c.y.toFixed(2), +c.a.toFixed(2), c.shirt, c.items, c.searched ? 1 : 0, c.id, c.lk]),
      look: G.look, journal: G.journal || [], followers: G.followers || [], vehicles: (G.vehicles || []).map(v => ({ id: v.id, x: +v.x.toFixed(2), y: +v.y.toFixed(2), a: +v.a.toFixed(3), fuel: +v.fuel.toFixed(1), hp: v.hp, color: v.color, key: v.key, keyC: v.keyC, trunk: v.trunk })), mapV: G.mapV || 1, exp: encExp(), heliAt: G.heliAt, heli: G.heli ? { ph: G.heli.ph, x: G.heli.x, y: G.heli.y, a: G.heli.a, t: G.heli.t } : null,
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
    const o = $('loading'); o.querySelector('b').textContent = msg || '세계를 만드는 중…'; o.classList.remove('hidden');
    requestAnimationFrame(() => setTimeout(() => { try { fn(); } finally { o.classList.add('hidden'); } }, 30));
  }
  /* ---------- 이야기 창: 도입부 · 쪽지 · 라디오 · 기록 ---------- */
  function showStory(title, text, opt) {
    opt = opt || {};
    $('storyT').textContent = title;
    $('storyX').innerHTML = String(text || '').split('\n\n').map(p => `<p>${p.replace(/[<>&]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' })[c]).replace(/\n/g, '<br>')}</p>`).join('');
    $('storyX').style.display = text ? '' : 'none';
    $('storyList').innerHTML = opt.list || '';
    $('storyClose').textContent = opt.btn || '닫기';
    $('story').classList.remove('hidden');
    if (G) G.paused = true;
    L.storyOnClose = opt.onClose || null;
  }
  function closeStory() {
    $('story').classList.add('hidden');
    const f = L.storyOnClose; L.storyOnClose = null;
    if (f) f(); else if (G && G.running) resumeIfFree();
  }
  function readNote(nid) {
    const N = (DT.STORY || {}).notes || {}, n = N[nid];
    if (!n) return toast('글씨가 번져서 읽을 수 없다');
    G.journal = G.journal || [];
    const first = !G.journal.includes(nid);
    if (first) G.journal.push(nid);
    const tn = M.towns && M.towns.find(t => t.key === n.town);
    const dt = n.d ? n.d.replace(/^0?(\d+)-0?(\d+)$/, '$1월 $2일') : '';
    showStory(n.t, (tn || dt ? `— ${[dt, tn && tn.name].filter(Boolean).join(' · ')}\n\n` : '') + n.x + (first ? `\n\n(기록에 추가됨 · ${G.journal.length}/${Object.keys(N).length})` : ''));
  }
  function showJournal() {
    const N = (DT.STORY || {}).notes || {}, J = G.journal || [];
    const list = J.filter(id => N[id]).sort((a, b) => (N[a].d || '').localeCompare(N[b].d || '')).map(id => { const n = N[id], tn = M.towns && M.towns.find(t => t.key === n.town); return `<button data-nid="${id}">${n.key ? '★ ' : ''}${n.t}<small>${n.d ? n.d.replace(/^0?(\d+)-0?(\d+)$/, '$1월 $2일') + ' · ' : ''}${tn ? tn.name : '어딘가'}</small></button>`; }).join('');
    showStory(`기록 · ${J.length}/${Object.keys(N).length}`, J.length ? '' : '아직 읽은 쪽지가 없다. 집과 건물을 뒤지면 쪽지·일지·신문을 찾을 수 있다.', { list, onClose: () => { $('menu').classList.remove('hidden'); } });
  }
  /* ================= 자동차 ================= */
  const KMH = 8; // 속도 표시: 1칸/초 = 8km/h (최고 9칸/초 ≈ 72km/h)
  // 몰 수 있는 차: 열쇠(꽂혀 있거나 근처 집 서랍) · 연료 · 차 상태(내구도) · 트렁크
  function initVehicles() {
    G.vehicles = []; G.keyAt = {};
    const V0 = M.vehicles0 || [], r = DT.rng((G.seed ^ 0xca7) >>> 0);
    const conts = []; M.containers.forEach((c, i) => { if (!c.car && ['drawer', 'closet', 'cabinet', 'counter', 'locker'].includes(c.kind)) conts.push([c, i]); });
    V0.forEach((q, id) => {
      const v = { id, x: q.x, y: q.y, a: q.a, v: 0, fuel: Math.round(8 + r() * 55), hp: Math.round(55 + r() * 45), color: q.color, key: r() < .35 ? 'in' : null, trunk: null };
      if (!v.key) { let best = null; for (const [c, i] of conts) { const d = Math.abs(c.x - q.x) + Math.abs(c.y - q.y); if (d < 45 && (!best || d < best[1]) && G.keyAt[i] == null) best = [i, d]; } if (best) { v.keyC = best[0]; G.keyAt[best[0]] = id; } else v.key = 'in'; }
      G.vehicles.push(v);
    });
    vehBlockAll();
  }
  const vehTrunk = v => { if (!v) return []; if (!v.trunk) v.trunk = rollLoot('car', DT.rng((G.seed ^ (v.id * 7919 + 13)) >>> 0)); return v.trunk; };
  // 세워 둔 차는 지나갈 수 없게 (차가 걸친 칸 2개)
  function vehBlock(v, on) {
    const W0 = G.worldM, D = W0.dynBlock;
    if (v.blk) for (const k of v.blk) D[k] = 0;
    v.blk = null;
    if (on) { v.blk = [...new Set([-.55, .55].map(f => Math.floor(v.y + Math.sin(v.a) * f) * W0.W + Math.floor(v.x + Math.cos(v.a) * f)))]; for (const k of v.blk) D[k] = 1; }
  }
  function vehBlockAll() { for (const v of (G.vehicles || [])) vehBlock(v, G.p.inCar !== v.id); }
  const hasKeyFor = v => v.key === 'in' || G.p.inv.some(i => i.id === 'carkey' && i.vid === v.id);
  function nearVehicle() {
    if (!G.vehicles || G.lv || G.p.inCar != null) return null;
    let best = null, bd = 1.9;
    for (const v of G.vehicles) { const d = Math.hypot(v.x - G.p.x, v.y - G.p.y); if (d < bd) { bd = d; best = v; } }
    return best;
  }
  /* ---------- 물: 수도(단수 전까지) · 변기 물통 · 빗물 받이 ---------- */
  function waterIdx() { // 세면대·욕조·조리대(싱크대) = 수도, 변기 = 물통 (지도마다 한 번)
    if (M._wAt) return M._wAt;
    const w = new Map(), W = M.W;
    (M.decor || []).forEach((d, i) => { const kind = d.kind === 'sink' || d.kind === 'bath' ? 'tap' : d.kind === 'toilet' ? 'toilet' : null; if (!kind) return; for (let y = d.y; y < d.y + (d.h || 1); y++) for (let x = d.x; x < d.x + (d.w || 1); x++) w.set(y * W + x, { kind, i }); });
    M.containers.forEach((c, i) => { if ((c.kind === 'cabinet' || c.kind === 'kitchen') && !w.has(c.y * W + c.x)) w.set(c.y * W + c.x, { kind: 'tap', ci: i }); });
    return (M._wAt = w);
  }
  function nearWater() {
    const p = G.p, W = M.W, w = waterIdx(), px = Math.floor(p.x), py = Math.floor(p.y); let best = null, bd = 1.6;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const x = px + dx, y = py + dy, e = w.get(y * W + x); if (!e) continue; if (e.i != null && G.rmDecor && G.rmDecor.has(e.i)) continue; if (e.ci != null && G.removed.has(e.ci)) continue; const d = Math.hypot(x + .5 - p.x, y + .5 - p.y); if (d < bd) { bd = d; best = Object.assign({ k: (M.level ? 'L' + (G.lv ? G.lv.hi + ':' + G.lv.z : '') + ':' : '') + (y * W + x) }, e); } }
    return best;
  }
  const bottles = () => G.p.inv.filter(i => i.id === 'bottle').length;
  function fillBottles(n, id) { let k = 0; for (const b of G.p.inv.filter(i => i.id === 'bottle')) { if (k >= n) break; G.p.inv.splice(G.p.inv.indexOf(b), 1); stackAdd(mkItem(id)); k++; } return k; }
  function drinkRaw(hyd, sickP, msg) { const p = G.p; p.hyd = clamp(p.hyd + hyd, 0, 100); if (sickP && rand() < sickP) { p.sick = Math.max(p.sick || 0, 240); toast('물이 더러웠다… 배가 아프다', 2400); } else if (msg) toast(msg); }
  // 기름통: 1통 10L · 차 연료통 40L (차 연료 %는 40L 기준)
  const CAN_MAX = 10, TANK_L = 40;
  function canW(it) { it.w = +(.8 + (it.fuel || 0) * .75).toFixed(2); }
  const cans = () => G.p.inv.filter(i => i.id === 'gascan');
  const canFuel = () => cans().reduce((s, i) => s + (i.fuel || 0), 0);
  const canSpace = () => cans().reduce((s, i) => s + CAN_MAX - (i.fuel || 0), 0);
  function canAdd(l) { for (const c of cans()) { const k = Math.min(l, CAN_MAX - (c.fuel || 0)); c.fuel = +((c.fuel || 0) + k).toFixed(1); l -= k; canW(c); } }
  function canTake(l) { let got = 0; for (const c of cans().sort((a, b) => (a.fuel || 0) - (b.fuel || 0))) { const k = Math.min(l - got, c.fuel || 0); c.fuel = +((c.fuel || 0) - k).toFixed(1); got += k; canW(c); } return got; }
  function nearPump(v) {
    if (!M.pumps) M.pumps = (M.decor || []).filter(d => d.kind === 'pump').map(d => [d.x + .5, d.y + .5]);
    return M.pumps.some(([x, y]) => Math.hypot(x - v.x, y - v.y) < 3.2);
  }
  function renderVehicles(dt) {
    if (!G.vehicles || !L.veh) return;
    const p = G.p;
    for (const v of G.vehicles) {
      const on = !G.lv && Math.abs(v.x - p.x) < 40 && Math.abs(v.y - p.y) < 28;
      if (!on) { if (v.g) { v.g.remove(); v.g = null; } continue; }
      if (!v.g || !v.g.isConnected) {
        v.g = el('g', {}, L.veh);
        v.hl = el('path', { d: 'M-.35 -1L-1.6 -4.6L1.6 -4.6L.35 -1Z', fill: '#ffe8a8', 'fill-opacity': 0 }, v.g); // 전조등
        drawCar(el('g', { transform: 'translate(-.5 -1)' }, v.g), { x: 0, y: 0, vert: true, color: v.color, flip: false, burnt: false });
        v.smoke = el('circle', { cx: 0, cy: -.7, r: .3, fill: '#6a6a66', 'fill-opacity': 0 }, v.g);
      }
      const inIt = p.inCar === v.id;
      v.g.setAttribute('transform', `translate(${v.x.toFixed(2)} ${v.y.toFixed(2)}) rotate(${(v.a * 180 / Math.PI + 90).toFixed(1)})`);
      const hl = inIt && v.fuel > 0 && v.hp > 0 ? (.12 + .25 * (G.night || 0)) : 0;
      if (v._hl !== hl) { v._hl = hl; v.hl.setAttribute('fill-opacity', hl.toFixed(2)); }
      const sm = v.hp < 30 ? .5 : 0; if (v._sm !== sm) { v._sm = sm; v.smoke.setAttribute('fill-opacity', sm); } // 망가진 차에서 연기
    }
  }
  // 운전: 조이스틱 방향으로 핸들, 민 만큼 가속, 뒤로 당기면 브레이크·후진
  function driveUpdate(v, dt, mx, my, mag) {
    const T = DT.T, W = M.W, p = G.p;
    const tt = M.t[Math.floor(v.y) * W + Math.floor(v.x)];
    const onRoad = tt === T.ROAD || tt === T.CAR || tt === T.WALK;
    const maxV = (onRoad ? 9 : tt === T.DIRT ? 5 : 3.8) * (v.hp < 25 ? .55 : 1);
    const can = v.fuel > 0 && v.hp > 0;
    if (mag > .15 && can) {
      const want = Math.atan2(my, mx), diff = angDiff(want, v.a);
      if (Math.abs(diff) > 2.2 && v.v < 1.2) { // 멈춘 상태에서 뒤로 → 후진 (뒤꽁무니를 조이스틱 쪽으로)
        v.v = Math.max(-2.6, v.v - 5 * dt);
        v.a += clamp(angDiff(want + Math.PI, v.a), -1, 1) * dt * 1.6 * clamp(-v.v / 1.5, 0, 1);
      } else if (Math.abs(diff) > 2.2) v.v = Math.max(0, v.v - 10 * dt); // 달리다 반대로 → 브레이크
      else {
        v.v += (maxV * mag - v.v) * Math.min(1, dt * (v.v < maxV * mag ? 1.1 : 2.5));
        v.a += clamp(diff, -1, 1) * dt * 2.4 * clamp(Math.abs(v.v) / 2.5, 0, 1);
      }
    } else v.v *= Math.max(0, 1 - dt * (can ? 1.6 : 2.4));
    if (Math.abs(v.v) < .05) v.v = 0;
    const ca = Math.cos(v.a), sa = Math.sin(v.a);
    if (v.v) {
      const nx = v.x + ca * v.v * dt, ny = v.y + sa * v.v * dt;
      const blocked = (x, y) => { const tx = Math.floor(x), ty = Math.floor(y); if (tx < 0 || ty < 0 || tx >= W || ty >= M.H) return true; const k = ty * W + tx; return M.moveBlock[k] || M.dynBlock[k]; };
      const pts = [[.95, 0], [.85, .38], [.85, -.38], [-.95, 0], [-.85, .38], [-.85, -.38], [0, .42], [0, -.42]];
      if (pts.some(([f, s2]) => blocked(nx + ca * f - sa * s2, ny + sa * f + ca * s2))) {
        const sp = Math.abs(v.v);
        if (sp > 5.5 && rand() < Math.min(.6, (sp - 5) / 6)) { const P = G.p, w = addWound(rand() < .4 ? 'fracture' : 'bruise', rand() < .5 ? (rand() < .5 ? 'legl' : 'legr') : 'torso'); P.hp -= (sp - 4) * 2; hurtFlash(); toast('충돌! ' + PART_NAME[w.p] + ' ' + WOUND[w.k][0], 2600); }
        if (sp > 3) { v.hp = Math.max(0, Math.round(v.hp - (sp - 2.5) * 3)); shake(.12 + sp * .03); SFX.play(sp * KMH >= 40 ? 'crash' : 'crash_low', { vol: .9 }); noise(v.x, v.y, 12, false); if (v.hp <= 0) toast('쾅! 엔진이 망가졌다', 2600); }
        v.v *= -.2;
      } else { v.x = nx; v.y = ny; }
    }
    // 좀비: 빠르면 치어 쓰러뜨리고, 느리면 옆으로 밀어냄
    const sp = Math.abs(v.v);
    for (const z of G.zombies) {
      if (z.dead) continue;
      const dx = z.x - v.x, dy = z.y - v.y; if (Math.abs(dx) > 1.7 || Math.abs(dy) > 1.7) continue;
      const f = dx * ca + dy * sa, s2 = -dx * sa + dy * ca;
      if (Math.abs(f) > 1.25 || Math.abs(s2) > .78) continue;
      if (sp > 2.5 && f * Math.sign(v.v) > .2) {
        damageZombie(z, sp * .45, v.v < 0 ? v.a + Math.PI : v.a, 1.1, true);
        v.hp = Math.max(0, Math.round((v.hp - .6 - sp * .12) * 10) / 10); v.v *= .82; shake(.1); SFX.at('car_hit', z.x, z.y, { range: 12 });
      }
      if (!z.dead) { const side = s2 >= 0 ? 1 : -1, need = .8 - Math.abs(s2); z.x += -sa * side * need; z.y += ca * side * need; resolve(z); }
    }
    if (can && (sp > 0 || mag > .15)) v.fuel = Math.max(0, v.fuel - (sp * .045 + .015) * dt);
    if (v.fuel <= 0 && !v._fw) { v._fw = 1; toast('연료가 다 떨어졌다 — 주유소를 찾아야 한다', 2600); }
    G.engT = (G.engT || 0) - dt;
    if (G.engT <= 0 && can) { G.engT = .5; noise(v.x, v.y, 7 + sp * 1.6, false); }
    p.noiseR = can ? Math.max(p.noiseR, 6 + sp * 1.4) : p.noiseR;
    SFX.engine && SFX.engine(can ? .3 + sp / 14 : 0, sp / 9);
    p.x = v.x; p.y = v.y; p.face = v.a; p.vx = p.vy = 0;
  }
  function honk() {
    const v = G.vehicles[G.p.inCar]; if (!v || G.p.cd > 0) return;
    G.p.cd = 1.2; SFX.play('horn'); noise(v.x, v.y, 28, true); toast('빵—!', 900);
  }
  function exitCar() {
    const p = G.p, v = G.vehicles[p.inCar]; if (!v) { p.inCar = null; return; }
    if (Math.abs(v.v) > 1) return toast('차를 멈춘 뒤에 내려야 한다');
    v.v = 0;
    const ca = Math.cos(v.a), sa = Math.sin(v.a);
    let spot = null;
    for (const side of [-1, 1]) { const x = v.x - sa * side * 1.1, y = v.y + ca * side * 1.1, k = Math.floor(y) * M.W + Math.floor(x); if (!M.moveBlock[k] && !M.dynBlock[k]) { spot = [x, y]; break; } }
    if (!spot) spot = freeNear(v.x - sa * 1.2, v.y + ca * 1.2);
    if (!spot) return toast('내릴 자리가 없다');
    p.inCar = null; p.x = spot[0]; p.y = spot[1];
    vehBlock(v, true);
    SFX.play('carDoor'); SFX.engine && SFX.engine(0, 0);
  }

  /* ================= 층 이동 (계단) ================= */
  // 층마다 따로 기억: 좀비 · 가구 속 물건 · 문 상태 · 시신 · 배치한 물건 · 가본 곳
  const lvKey = lv => lv ? lv.hi + ':' + lv.z : 'w';
  function snapshotCtx() {
    const cont2 = {}; G.containers.forEach((l, i) => { cont2[i] = l; });
    return {
      cont2, searched: [...G.searched], removed: [...G.removed], rmDecor: [...(G.rmDecor || [])], ds: dsSave(),
      z: G.zombies.filter(z => !z.dead).map(z => [+z.x.toFixed(2), +z.y.toFixed(2), +z.hp.toFixed(2), z.shirt, 0, 0, z.lk]).concat([].concat(...G.zdorm.values()).map(r => [r[0], r[1], r[2], r[3], 0, 0, r[4]])),
      c: G.corpses.map(c => [+c.x.toFixed(2), +c.y.toFixed(2), +c.a.toFixed(2), c.shirt, c.items, c.searched ? 1 : 0, c.id, c.lk]),
      placed: G.placed.map(b => ({ x: b.x, y: b.y, type: b.type, kind: b.kind, items: b.items, id: b.id, w: b.w })),
      _exp: G.exp, _seen: G.seen, // 메모리에만 (저장할 땐 cleanCtx로 압축)
    };
  }
  // 저장용: 메모리 전용 값은 빼고, 가본 곳은 압축 문자열로
  function cleanCtx(c) {
    if (!c) return c;
    const o = {}; for (const k in c) if (k[0] !== '_') o[k] = c[k];
    if (!o.exp && c._exp) o.exp = encExpArr(c._exp);
    return o;
  }
  function restoreCtx(c, fresh) {
    const known = i => i && ITEMS[i.id];
    G.containers = [];
    if (c && c.cont2) for (const k in c.cont2) G.containers[+k] = (c.cont2[k] || []).filter(known);
    G.searched = new Set((c && c.searched) || []); G.removed = new Set((c && c.removed) || []); G.rmDecor = new Set();
    for (const i of G.removed) { const q = M.containers[i]; if (!q) continue; const k = q.y * M.W + q.x; if (M.deco[k]) { M.deco[k] = 0; M.moveBlock[k] = 0; } }
    initOpenings(c ? Object.assign({}, c.ds) : null);
    const N = M.W * M.H;
    if (c && c._exp && c._exp.length === N) { G.exp = c._exp; initFog(c._seen); } // 방금 있던 층: 그대로 다시 씀
    else { G.exp = null; initFog(); if (c && c.exp) decExp(c.exp); }
    for (const i of ((c && c.rmDecor) || [])) liftDecorVisual(i, true);
    G.zombies = []; G.zdorm = new Map(); G.zdormN = 0; G.corpses = []; G.placed = [];
    for (const [x, y, hp, shirt, , , lk] of ((c && c.z) || [])) placeZombie(x, y, hp, shirt, lk);
    for (const [x, y, a, shirt, items, sr, id, lk] of ((c && c.c) || [])) addCorpse(x, y, a, shirt, (items || []).filter(known), sr, id, lk);
    for (const b of ((c && c.placed) || [])) addPlaced({ x: b.x, y: b.y, type: b.type, kind: b.kind, items: (b.items || []).filter(known), id: b.id, w: b.w || 0 });
    if (fresh) spawnLevelZombies();
    G.dsV = (G.dsV || 0) + 1;
  }
  // 처음 들어간 층: 건물 종류에 맞는 좀비 (계단 바로 옆은 비워 둠)
  function spawnLevelZombies() {
    const lv = M.level; if (!lv) return;
    const TY = { hospital: [['hazmat', .45], ['medic', .45]], prison: [['prisoner', .8]], army: [['soldier', .85]], police: [['police', .6]], firestation: [['fire', .6]], terminal: [['office', .3]], bank: [['guard', .5]], factory: [['worker', .6]], warehouse: [['worker', .5]] }[lv.kind] || [];
    const floorN = M.t.reduce((n, v) => n + (v === DT.T.FLOOR ? 1 : 0), 0);
    const n = Math.round(floorN / (lv.kind === 'house' ? 55 : 16) * (lv.z < 0 ? 1.25 : 1) * (.7 + rand() * .6));
    const sx = M.spawn.x, sy = M.spawn.y;
    for (let i = 0, tries = 0; i < n && tries < n * 40; tries++) {
      const x = 1 + ((rand() * (M.W - 2)) | 0), y = 1 + ((rand() * (M.H - 2)) | 0);
      if (M.moveBlock[y * M.W + x] || M.t[y * M.W + x] !== DT.T.FLOOR || Math.hypot(x - sx, y - sy) < 5) continue;
      let ty = null, pr = 0; for (const [t, p] of TY) if (rand() < p) { ty = t; pr = 1; break; }
      newZombie(x + .5, y + .5, ty, pr); i++;
    }
  }
  function levelMap(hi, z) {
    const key = hi + ':' + z;
    let m = L.lvCache[key];
    if (!m) {
      m = DT.genLevel(G.worldM, hi, z, G.seed); m.KA = 1; prepareMap(m); L.lvCache[key] = m;
      const ks = Object.keys(L.lvCache); // 최근 20개 층만 기억 (나머지는 필요할 때 똑같이 다시 만듦)
      if (ks.length > 20) for (const k of ks.slice(0, ks.length - 20)) if (L.lvCache[k] !== M) { const o = L.lvCache[k]; if (o._baseURL) URL.revokeObjectURL(o._baseURL); if (o._maskURL) URL.revokeObjectURL(o._maskURL); delete L.lvCache[k]; }
    }
    return m;
  }
  // 계단으로 층 이동. z = 0이면 월드(1층)로 돌아감
  function changeLevel(hi, z, noSnap, pos) {
    const cur = lvKey(G.lv);
    if (!noSnap) { const snap = snapshotCtx(); if (cur === 'w') G.lvWorld = snap; else G.lvStore[cur] = snap; }
    const W0 = G.worldM, info = W0.levels[hi];
    const target = z === 0 ? null : { hi, z };
    const tm = [performance.now()];
    M = z === 0 ? W0 : levelMap(hi, z); AS = M._AS;
    G.lv = target;
    pathQueue = []; L.mini = L.big = null;
    buildScene(); tm.push(performance.now()); buildMaps(); tm.push(performance.now());
    const [wx, wy] = info.stair;
    if (pos) { G.p.x = pos[0]; G.p.y = pos[1]; } else if (z === 0) { G.p.x = wx + .5; G.p.y = wy + .5; } else { G.p.x = M.spawn.x + .5; G.p.y = M.spawn.y + .5; }
    G.p.vx = G.p.vy = 0;
    const snap = z === 0 ? G.lvWorld : G.lvStore[lvKey(target)];
    restoreCtx(snap, (!snap || snap.pendingFresh) && z !== 0); // 좀비는 위치 기준으로 가까운 것만 깨우므로 플레이어를 먼저 옮김
    tm.push(performance.now()); L._tm = tm.map((v, i) => i ? Math.round(v - tm[i - 1]) : 0).slice(1).join('/');
    L._cx = null; L._vkey = null; L._ckR = null; G.openC = -1; G.nearC = -1;
    G.nearOp = null; G.nearLift = null; G.nearTree = -1; G.nearBench = -1; // 이전 층의 문·가구 기억 지우기 (진행바가 남던 문제)
    renderAction();
    for (let i = 0; i < M.containers.length; i++) refreshContainer(i);
    updateFloorTag();
  }
  function updateCarTag() {
    const e = $('carTag'); if (!e) return;
    const v = G.p.inCar != null && G.vehicles ? G.vehicles[G.p.inCar] : null;
    const txt = v && !G.lv ? `${Math.round(Math.abs(v.v) * KMH)} km/h · 연료 ${Math.round(v.fuel)}% · 차 ${Math.round(v.hp)}%` : '';
    if (e._t !== txt) { e._t = txt; e.textContent = txt; e.classList.toggle('hidden', !txt); e.classList.toggle('low', !!v && (v.fuel < 15 || v.hp < 25)); }
    const drv = !!(v && !G.lv);
    if (L._drvUI !== drv) { // 운전 중: 공격 버튼 = 경적, 웅크리기 숨김
      L._drvUI = drv;
      $('btnCrouch').style.display = drv ? 'none' : '';
      if (drv) $('atkIcon').setAttribute('href', '#i-car'); else updateWeaponLook();
    }
  }
  function updateFloorTag() {
    const e = $('flTag'); if (!e) return;
    if (!G.lv) { e.classList.add('hidden'); return; }
    e.textContent = M.level.floor; // 건물 이름은 표시 안 함
    e.classList.remove('hidden');
  }
  // 지금 서 있는 건물의 층 정보 (계단 옆일 때)
  function stairInfo() {
    if (!G.nearStair) return null;
    const hi = G.lv ? G.lv.hi : G.worldM.stairAt[G.nearStair.k];
    if (hi == null) return null;
    const info = G.worldM.levels[hi], z = G.lv ? G.lv.z : 0;
    return { hi, z, info };
  }
  /* ---- 좀비의 층 이동: 추격 · 큰 소리 · 가끔 배회 ---- */
  // 대기열 G.followers: { to: 층 키, hi, z, t: 도착까지 남은 초, rec: [x,y,체력,옷,외형] }
  const zRec = z => [+z.x.toFixed(2), +z.y.toFixed(2), +z.hp.toFixed(2), z.shirt, z.lk];
  function stairPosOf(hi, z) { // 그 층에서 계단 칸 좌표
    if (z === 0) return G.worldM.levels[hi].stair;
    const m = levelMap(hi, z); return [m.spawn.x, m.spawn.y];
  }
  function ctxFor(key) { // 저장해 둔 층 상태 (없으면 '처음 가는 층' 표시만 가진 빈 상태)
    if (key === 'w') return G.lvWorld || (G.lvWorld = { z: [] });
    return G.lvStore[key] || (G.lvStore[key] = { z: [], pendingFresh: true });
  }
  // 계단을 타는 순간, 쫓아오던 좀비가 따라옴 (계단까지 거리만큼 늦게)
  function queueFollowers(hi, fromZ, toZ) {
    const [sx, sy] = stairPosOf(hi, fromZ), to = lvKey(toZ === 0 ? null : { hi, z: toZ });
    G.followers = G.followers || [];
    let n = 0;
    const cand = G.zombies.filter(z => !z.dead && z.state === 'chase' && z.lostT < 3 && Math.hypot(z.x - sx - .5, z.y - sy - .5) < 12)
      .sort((a, b) => Math.hypot(a.x - sx, a.y - sy) - Math.hypot(b.x - sx, b.y - sy));
    for (const z of cand) {
      if (n >= 10) break;
      const d = Math.hypot(z.x - sx - .5, z.y - sy - .5), spd = 1.15 * z.spdMul * (trait(z).spd || 1);
      G.followers.push({ to, hi, z: toZ, t: 1.6 + d / spd + n * .5, rec: zRec(z) });
      z.dead = true; z.stored = true; if (z.g) z.g.remove(); n++;
    }
    if (n) G.zombies = G.zombies.filter(z => !z.stored);
    return n;
  }
  // 계단 근처의 큰 소리 → 바로 위·아래층 좀비가 올라오거나 내려옴
  function floorNoise(x, y, r) {
    if (!G.worldM || !G.worldM.levels) return;
    let hi = null, z0 = 0, st = null;
    if (G.lv) { hi = G.lv.hi; z0 = G.lv.z; st = [M.spawn.x, M.spawn.y]; if (Math.hypot(x - st[0], y - st[1]) > r + 4) return; }
    else { // 월드: 소리 난 곳 근처 계단 찾기
      const R = Math.min(14, Math.ceil(r)), cx = Math.floor(x), cy = Math.floor(y);
      for (let dy = -R; dy <= R && hi == null; dy++) for (let dx = -R; dx <= R; dx++) { const k = (cy + dy) * M.W + cx + dx, h = M.stairAt && M.stairAt[k]; if (h != null) { hi = h; st = [cx + dx, cy + dy]; break; } }
      if (hi == null) return;
    }
    const info = G.worldM.levels[hi], here = lvKey(G.lv);
    let pulled = 0;
    for (const dz of [1, -1]) {
      const zz = z0 + dz; if (zz < info.min || zz > info.max) continue;
      const key = lvKey(zz === 0 ? null : { hi, z: zz }), c = key === 'w' ? G.lvWorld : G.lvStore[key];
      if (!c || !c.z || !c.z.length) continue; // 아직 안 가본 층은 모름
      const [ax, ay] = stairPosOf(hi, zz);
      c.z.sort((a, b) => Math.hypot(a[0] - ax, a[1] - ay) - Math.hypot(b[0] - ax, b[1] - ay));
      const take = Math.min(r >= 30 ? 5 : 3, c.z.filter(q => Math.hypot(q[0] - ax, q[1] - ay) < 24).length);
      for (let k = 0; k < take; k++) {
        const q = c.z.shift(), d = Math.hypot(q[0] - ax, q[1] - ay);
        G.followers = G.followers || [];
        G.followers.push({ to: here, hi, z: z0, t: 3 + d / 1.1 + k * .7, rec: [q[0], q[1], q[2], q[3], q[6] || q[4]] });
        pulled++;
      }
    }
    if (pulled && !G._flT || (pulled && G.time - G._flT > 20)) { G._flT = G.time; setTimeout(() => toast('소리가 계단 너머까지 울렸다…', 2200), 900); }
  }
  // 도착 처리: 지금 그 층에 있으면 계단에서 나타나 바로 추격, 아니면 그 층 기록에 넣어 둠
  function updateFollowers(dt) {
    const F = G.followers; if (!F || !F.length) return;
    const here = lvKey(G.lv);
    for (let i = F.length - 1; i >= 0; i--) {
      const f = F[i]; f.t -= dt;
      if (f.to === here && !f.warned && f.t < 1.4) { f.warned = true; const [sx, sy] = stairPosOf(f.hi, f.z); SFX.at('groan', sx + .5, sy + .5, { range: 16, vol: 1.1 }); if (!G._fwT || G.time - G._fwT > 8) { G._fwT = G.time; toast('계단에서 발소리가 올라온다!', 1800); } }
      if (f.t > 0) continue;
      F.splice(i, 1);
      const [sx, sy] = stairPosOf(f.hi, f.z);
      if (f.to === here) {
        let px = sx + .5, py = sy + .5;
        if (Math.hypot(G.p.x - px, G.p.y - py) < .9) { const q = freeNear(sx + (rand() < .5 ? 1 : -1), sy); if (q) { px = q[0]; py = q[1]; } }
        const z = addZombie(px, py, f.rec[2], f.rec[3], null, null, f.rec[4]);
        z.state = 'chase'; z.tx = G.p.x; z.ty = G.p.y; z.lostT = 0; z.path = null;
      } else {
        const c = ctxFor(f.to); c.z = c.z || [];
        c.z.push([sx + .5 + (rand() - .5), sy + .5 + (rand() - .5), f.rec[2], f.rec[3], 0, 0, f.rec[4]]);
      }
    }
  }
  // 가끔: 옆 층 좀비가 계단을 타고 넘어옴 (층 안에 있을 때)
  function driftFloors() {
    if (!G.lv) return;
    G.fdT = (G.fdT == null ? 90 : G.fdT) - 1;
    if (G.fdT > 0) return;
    G.fdT = 70 + rand() * 80;
    if (rand() < .45) floorNoise(M.spawn.x + .5, M.spawn.y + .5, 9.5);
  }
  // 세계에 미리 정해진 사건 현장: 좀비 무리 · 시신 · 판자로 막은 건물
  function applyScenes() {
    if (!M.scenes && !M.zspawn) return;
    const free = (x, y) => x > 1 && y > 1 && x < M.W - 2 && y < M.H - 2 && !M.moveBlock[Math.floor(y) * M.W + Math.floor(x)];
    const around = (cx, cy, r) => { for (let k = 0; k < 50; k++) { const a = rand() * TAU, d = rand() * r, x = cx + Math.cos(a) * d, y = cy + Math.sin(a) * d; if (free(x, y)) return [Math.floor(x) + .5, Math.floor(y) + .5]; } return null; };
    for (const z of (M.zspawn || [])) for (let i = 0; i < z.n; i++) { const q = around(z.x, z.y, z.r); if (q) newZombie(q[0], q[1], z.ty, z.pr); }
    for (const sc of (M.scenes || [])) {
      if (sc.type === 'bodies') for (let i = 0; i < sc.n; i++) { const q = around(sc.x, sc.y, sc.r); if (!q) continue; const lk = genLook(); lk.ty = sc.ty || 'civ'; addCorpse(q[0], q[1], rand() * TAU, null, rollCorpseFor(lk), false, undefined, lk); }
      else if (sc.type === 'board') for (const o of M.op) {
        if (o.x < sc.x || o.x >= sc.x + sc.w || o.y < sc.y || o.y >= sc.y + sc.h) continue;
        const st = G.ds[o.k]; if (!st) continue;
        if (o.type === 'win') st.b = [BOARD_HP, BOARD_HP];
        else if (o.y !== sc.y + sc.h - 1 && !o.interior) { st.o = 0; st.b = [BOARD_HP]; } // 정문은 열어 둠
        updTile(o.k, true);
      }
    }
    G.dsV++;
  }
  function newGame() {
    if (L.releaseAll) L.releaseAll(); input.run = false;
    const seed = (Math.random() * 1e9) | 0;
    G = baseState(seed);
    G.mapV = window.DT_MAPV || 5;
    G.waterOffAt = G.powerOffAt + (1 + Math.floor(Math.random() * 3)) * 1440; // 정전 1~3일 뒤 단수
    G.look = loadLook();
    setupWorld(seed);
    initOpenings();
    const p = G.p;
    p.x = M.spawn.x + .5; p.y = M.spawn.y + .5;
    const lr = DT.rng(seed ^ 0x5bd1e995);
    G.containers = [];
    if (M.spawnContainer >= 0) contItems(M.spawnContainer).push(mkItem('hammer'), mkItem('pencil'));
    else p.inv.push(mkItem('hammer'));
    p.inv.push(mkItem('water'), mkItem('chips'), mkItem('bandage'));
    giveStarterGear(p);
    spawnZombies(Math.round(75 * Math.max(1, M.KA * .8) * (OPTS.perf ? .7 : 1)), 14, false);
    spawnShopZombies();
    applyScenes();
    if (M.vehicles0) initVehicles(); else G.vehicles = [];
    G.heliAt = 9 * 60 + (7 + rand() * 38) * 60; // 첫날 오후 ~ 셋째 날 사이 헬기 한 번
    for (let i = 0; i < M.containers.length; i++) refreshContainer(i);
    updateWeaponLook();
    start();
    save(false);
    if (M.county && DT.STORY && !window.DT_NOINTRO) { // 도입부
      const p0 = G.p;
      p0.inv.push(Object.assign(mkItem('note'), { nid: 'm3' }));
      showStory('헤이븐 카운티 봉쇄 사건', DT.STORY.intro.join('\n\n'), { btn: '시작하기' });
    }
  }
  function continueGame(s) {
    if (L.releaseAll) L.releaseAll(); input.run = false;
    G = baseState(s.seed);
    G.mapV = s.mapV || 1;
    G.look = s.look || loadLook();
    G.journal = s.journal || [];
    G.followers = s.followers || [];
    G.searched = new Set(s.searched || []);
    G.removed = new Set(s.removed || []);
    G.chopped = new Set(s.chopped || []);
    setupWorld(s.seed);
    initOpenings(s.ds);
    decExp(s.exp);
    if (s.exp == null) G.exp.fill(1); // 예전 저장: 지도는 전부 보이게
    for (const i of (s.rmDecor || [])) liftDecorVisual(i, true);
    G.time = s.time; G.kills = s.kills; G.uid = s.uid; G.lastHour = s.lastHour;
    if (s.rain != null) { G.rain = s.rain; G.rainTarget = s.rainTarget; G.weatherNext = s.weatherNext; }
    if (s.sk) for (const k in G.sk) if (s.sk[k]) G.sk[k] = s.sk[k];
    if (s.power != null) { G.power = s.power; G.powerOffAt = s.powerOffAt; }
    G.waterOn = s.waterOn != null ? s.waterOn : 1; G.waterOffAt = s.waterOffAt || (G.powerOffAt + 2 * 1440); G.snowCov = s.snowCov || 0; G.marks = s.marks || []; G.toiletUsed = s.toiletUsed || [];
    G.heliAt = s.heliAt != null ? s.heliAt : G.time + (6 + rand() * 30) * 60;
    if (s.heli) G.heli = Object.assign({ nt: 0, rot: 0 }, s.heli); // 날던 헬기 이어서
    Object.assign(G.p, s.p);
    if (!s.p.wear) { G.p.wear = {}; giveStarterGear(G.p); } // 예전 저장: 기본 옷 입혀줌
    if (M.moveBlock[Math.floor(G.p.y) * M.W + Math.floor(G.p.x)]) { // 새 가구가 생긴 자리에 저장됐으면 옆 칸으로
      let best = null;
      for (let r = 1; r < 6 && !best; r++) for (let dy = -r; dy <= r && !best; dy++) for (let dx = -r; dx <= r; dx++) { const x = Math.floor(G.p.x) + dx, y = Math.floor(G.p.y) + dy; if (x > 0 && y > 0 && x < M.W - 1 && y < M.H - 1 && !M.moveBlock[y * M.W + x]) { best = [x + .5, y + .5]; break; } }
      if (best) { G.p.x = best[0]; G.p.y = best[1]; }
    }
    const known = i => i && ITEMS[i.id];
    G.p.inv = (G.p.inv || []).filter(known);
    const sc = s.cont || [];
    G.containers = [];
    if (s.cont2) { for (const k in s.cont2) G.containers[+k] = (s.cont2[k] || []).filter(known); }
    else M.containers.forEach((c, i) => { if (i < sc.length) G.containers[i] = (sc[i] || []).filter(known); }); // 예전 저장 (없는 칸은 열 때 새로 채움)
    for (const [x, y, hp, shirt, skin, bw, lk] of s.z) placeZombie(x, y, hp, shirt, lk);
    for (const [x, y, a, shirt, items, sr, id, lk] of (s.c || [])) addCorpse(x, y, a, shirt, (items || []).filter(i => i && ITEMS[i.id]), sr, id, lk);
    for (const b of (s.placed || [])) addPlaced({ x: b.x, y: b.y, type: b.type, kind: b.kind, items: (b.items || []).filter(known), id: b.id, w: b.w || 0 });
    for (let i = 0; i < M.containers.length; i++) refreshContainer(i);
    G.vehicles = (s.vehicles || []).map(v => Object.assign({ v: 0 }, v)); G.keyAt = {};
    for (const v of G.vehicles) if (v.keyC != null) G.keyAt[v.keyC] = v.id;
    if (G.p.inCar != null && !G.vehicles[G.p.inCar]) G.p.inCar = null;
    vehBlockAll();
    G.lvStore = s.lv || {};
    if (s.plv && M.levels && M.levels[s.plv.hi]) { changeLevel(s.plv.hi, s.plv.z); G.p.x = s.plv.x; G.p.y = s.plv.y; } // 저장할 때 있던 층으로
    updateWeaponLook();
    start();
    updateFloorTag();
  }
  function start() {
    G.running = true; G.paused = false;
    for (const id of ['title', 'dead', 'menu', 'sheet', 'sleep', 'bigmap']) $(id).classList.add('hidden');
    renderAction();
    renderHud();
  }
  function die() {
    SFX.play('death'); if (SFX.heli) SFX.heli(0, 0);
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
      // 손가락 닿은 곳 = 조이스틱 중심 (#app 기준 좌표로 계산)
      let zx = 0, zy = 0; for (let el = zone; el && el.id !== 'app'; el = el.offsetParent) { zx += el.offsetLeft; zy += el.offsetTop; }
      joy.style.left = (ox - zx) + 'px';
      joy.style.setProperty('bottom', (zy + zone.offsetHeight - oy) + 'px', 'important'); // CSS의 bottom !important보다 우선
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
      joy.classList.remove('free', 'active'); joy.style.left = ''; joy.style.removeProperty('bottom');
    };
    zone.addEventListener('pointerup', end);
    zone.addEventListener('pointercancel', end);

    const atk = $('btnAttack');
    atk.addEventListener('pointerdown', e => { e.preventDefault(); input.attackHeld = true; if (G && G.running && !G.paused) playerAttack(); });
    const atkUp = () => { input.attackHeld = false; };
    atk.addEventListener('pointerup', atkUp); atk.addEventListener('pointercancel', atkUp); atk.addEventListener('pointerleave', atkUp);
    $('btnUse').addEventListener('click', () => { if (G.nearC >= 0) startSearch(G.nearC); else if (G.nearBench >= 0) { G.tab = 'craft'; openSheet(-1); } });
    $('btnBag').addEventListener('click', () => { G.tab = 'bag'; openSheet(-1); });
    $('btnSwap').addEventListener('click', () => { if (G && G.running && !G.dead) sheetAction('swapw'); });
    $('btnReload').addEventListener('click', () => { if (!G || !G.running || G.dead) return; if (G.p.rl) return cancelReload('재장전을 멈췄다'); startReload(); });
    $('btnAlt').addEventListener('click', () => {
      const opts = altOptions(); if (!opts.length) return;
      if (opts.length === 1) { const o = opts[0]; if (o[3]) return toast(o[0] === 'climb' ? '창문 안쪽이 가구로 막혀 있다 — 다른 창문이나 문으로' : o[0] === 'chop' ? '도끼가 필요하다 (철물점·옷장·차량에서 찾기)' : o[0] === 'board' ? (has('hammer') ? '바리케이드 판자가 필요하다' : '망치가 필요하다') : '망치가 필요하다'); return doAlt(o[0]); }
      $('altMenu').classList.toggle('hidden');
    });
    $('altMenu').addEventListener('click', e => {
      const b = e.target.closest('button[data-alt]'); if (!b) return;
      if (b.classList.contains('off')) { $('altMenu').classList.add('hidden'); return toast(b.dataset.alt === 'climb' ? '창문 안쪽이 가구로 막혀 있다 — 다른 창문이나 문으로' : b.dataset.alt === 'chop' ? '도끼가 필요하다 (철물점·옷장·차량에서 찾기)' : b.dataset.alt === 'board' && has('hammer') ? '바리케이드 판자가 필요하다 (제작: 판자+못)' : '망치가 필요하다'); }
      doAlt(b.dataset.alt);
    });
    $('sheetClose').addEventListener('click', closeSheet);
    document.addEventListener('pointerdown', e => { const b = e.target.closest('.sheet-card button, .overlay button, .qb, #menuBtn, #minimap, #btnBag, #btnUse, #btnSwap'); if (b && !b.matches('#sheetClose, #btnBag')) SFX.play('ui_tap'); }, true); // 버튼·탭·칸 고르기 모두 같은 소리
    // 두 손가락: 조이스틱을 누른 채 다른 버튼을 탭하면 아이폰은 click을 만들지 않음 → 직접 만들어 줌 (중복 방지 포함)
    let synthAt = 0, synthEl = null;
    document.addEventListener('pointerup', e => {
      if (e.pointerType !== 'touch' || e.isPrimary) return;
      const t = document.elementFromPoint(e.clientX, e.clientY);
      if (!t || !t.closest('#btns,#btnCrouch,#altMenu,#quick,#act,.hud-right,.sheet-card')) return;
      synthAt = performance.now(); synthEl = t;
      t.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    }, true);
    document.addEventListener('click', e => { if (e.isTrusted && synthEl && performance.now() - synthAt < 350 && (e.target === synthEl || synthEl.contains(e.target) || e.target.contains(synthEl))) { e.stopImmediatePropagation(); e.preventDefault(); } }, true);
    $('act').addEventListener('click', e => { if (e.target.closest('[data-act=cancel]')) cancelActions('행동 취소'); });
    $('quick').addEventListener('click', e => { const b = e.target.closest('button[data-q]'); if (b) quickAct(b.dataset.q, +b.dataset.uid); });
    // 보관함 물건: 짧게 누르면 가져오기, 길게 누르면 정보만 보기
    { const sc = document.querySelector('.sheet-card'); let lpT = null, lp0 = null;
      const clr = () => { clearTimeout(lpT); lpT = null; };
      sc.addEventListener('pointerdown', e => { const c = e.target.closest('.card[data-src="cont"]'); if (!c) return; lp0 = [e.clientX, e.clientY]; clr(); lpT = setTimeout(() => { lpT = null; L.lpFired = true; G.sel = { uid: +c.dataset.uid, cont: true }; SFX.play('ui_tap'); renderSheet(); }, 420); });
      sc.addEventListener('pointermove', e => { if (lpT && lp0 && Math.hypot(e.clientX - lp0[0], e.clientY - lp0[1]) > 10) clr(); });
      for (const ev of ['pointerup', 'pointercancel', 'pointerleave']) sc.addEventListener(ev, () => { clr(); if (L.lpFired) setTimeout(() => { L.lpFired = false; }, 60); }); // 길게 누른 뒤 따라오는 탭 하나만 무시
      sc.addEventListener('contextmenu', e => { if (e.target.closest('.card')) e.preventDefault(); }); }
    document.querySelector('.sheet-card').addEventListener('click', e => {
      if (L.lpFired) { L.lpFired = false; return; }
      const c = e.target.closest('.card');
      if (c && c.classList.contains('busy')) { const u = +c.dataset.uid; G.actions = G.actions.filter(a => a.uid !== u); toast('취소했다'); renderAction(); return renderSheet(); }
      if (c && c.dataset.src === 'cont' && c.dataset.uids) { for (const u of c.dataset.uids.split(',')) sheetAction('takecont', +u); return; } // 묶음은 한 번에 다 챙김
      if (c) return sheetAction(c.dataset.src === 'cont' ? 'takecont' : 'selinv', +c.dataset.uid);
      const b = e.target.closest('button[data-act]');
      if (b && !b.disabled) sheetAction(b.dataset.act, b.dataset.rid || null);
    });
    $('minimap').addEventListener('click', () => {
      if (!G || !G.running) return;
      openBigmap();
    });
    $('mapClose').addEventListener('click', () => { $('bigmap').classList.add('hidden'); resumeIfFree(); });
    $('mkBar').addEventListener('click', e => {
      const pb = e.target.closest('button[data-pen]'); if (pb) { L.pen = pb.dataset.pen; return renderMkBar(); }
      const b = e.target.closest('button[data-mk]'); if (!b || b.disabled) return;
      L.mkMode = L.mkMode === b.dataset.mk ? null : b.dataset.mk; renderMkBar(); if (L.mkMode === 'text') setTimeout(() => $('mkText').focus(), 30);
    });
    $('mapZoom').addEventListener('click', e => { const b = e.target.closest('button[data-z]'); if (!b || !L.bv) return; const z = b.dataset.z, v = L.bv;
      if (z === 'me') setBigView(G.p.x, G.p.y, Math.min(v.size, 80)); else setBigView(v.cx, v.cy, v.size * (z === 'in' ? .6 : 1 / .6)); SFX.play('ui_tap'); });
    { // 끌어서 이동 · 짧게 누르면 표시
      const sv = $('bigmapSvg'); let d0 = null;
      const toMap = (cx, cy) => { const pt = sv.createSVGPoint(); pt.x = cx; pt.y = cy; return pt.matrixTransform(sv.getScreenCTM().inverse()); };
      sv.addEventListener('pointerdown', e => { if (!L.bv) return; d0 = { x: e.clientX, y: e.clientY, v: Object.assign({}, L.bv), moved: false, id: e.pointerId }; try { sv.setPointerCapture(e.pointerId); } catch (err) {} });
      sv.addEventListener('pointermove', e => { if (!d0 || e.pointerId !== d0.id) return; const rot = document.documentElement.classList.contains('rot'), cdx = e.clientX - d0.x, cdy = e.clientY - d0.y, dx = rot ? cdy : cdx, dy = rot ? -cdx : cdy; if (!d0.moved && Math.hypot(dx, dy) < 12) return; d0.moved = true; const rc = sv.getBoundingClientRect(), k = d0.v.size / (rot ? rc.height : rc.width); setBigView(d0.v.cx - dx * k, d0.v.cy - dy * k, d0.v.size); }); // 화면을 돌려 쓰는 경우에도 끄는 방향 그대로 이동
      sv.addEventListener('pointerup', e => {
        if (!d0) return; const moved = d0.moved; d0 = null; if (moved || !L.mkMode || M.level) return;
        const q = toMap(e.clientX, e.clientY); G.marks = G.marks || [];
        const near = G.marks.reduce((b, k, i) => { const d = Math.hypot(k.x - q.x, k.y - q.y); return d < b[0] ? [d, i] : b; }, [(L._bigSize || 72) / 22, -1]);
        if (L.mkMode === 'del') { if (near[1] < 0) return; const k = G.marks[near[1]]; if (k.pen && k.pen !== 'pencil') return toast('펜으로 적은 건 지울 수 없다'); G.marks.splice(near[1], 1); }
        else { if (!L.pen) return toast('필기구가 없다');
          const m = { t: L.mkMode, x: +q.x.toFixed(1), y: +q.y.toFixed(1), c: ITEMS[L.pen].pen, pen: L.pen };
          if (L.mkMode === 'text') { const tx = $('mkText').value.trim(); if (!tx) return toast('적을 글자를 먼저 쓰세요'); m.txt = tx.slice(0, 14); }
          G.marks.push(m); if (G.marks.length > 80) G.marks.shift(); }
        SFX.play(L.mkMode === 'del' ? 'ui_tap' : 'pen'); drawMarks();
      });
      sv.addEventListener('wheel', e => { if (!L.bv) return; e.preventDefault(); const q = toMap(e.clientX, e.clientY), f = e.deltaY > 0 ? 1.15 : 1 / 1.15, v = L.bv; setBigView(q.x + (v.cx - q.x) * f, q.y + (v.cy - q.y) * f, v.size * f); }, { passive: false });
    }
    $('bigmap').addEventListener('click', e => { if (e.target.id === 'bigmap') { $('bigmap').classList.add('hidden'); resumeIfFree(); } });
    $('wakeBtn').addEventListener('click', () => wake());
    $('restBar').addEventListener('click', () => stopRest('휴식을 멈췄다'));
    $('moodles').addEventListener('click', e => { const m = e.target.closest('.md'); if (m) showMdInfo(m.dataset.md, m); });
    $('mdInfo').addEventListener('click', () => $('mdInfo').classList.add('hidden'));
    $('menuBtn').addEventListener('click', () => {
      if (!G || !G.running) return;
      G.paused = true;
      const hrs = (G.time - 540) / 60;
      $('menuStat').textContent = `생존 ${Math.floor(hrs / 24)}일 ${Math.floor(hrs % 24)}시간 · 처치 ${G.kills}`;
      $('menu').classList.remove('hidden');
    });
    $('mResume').addEventListener('click', () => { $('menu').classList.add('hidden'); resumeIfFree(); });
    $('mSave').addEventListener('click', () => { save(true); });
    $('mJournal').addEventListener('click', () => { $('menu').classList.add('hidden'); showJournal(); });
    $('storyClose').addEventListener('click', closeStory);
    $('storyList').addEventListener('click', e => { const b = e.target.closest('[data-nid]'); if (b) readNote(b.dataset.nid); });
    const sb = $('mSound');
    const syncSound = () => { sb.textContent = DT.sfx && DT.sfx.isOn() ? '소리: 켜짐' : '소리: 꺼짐'; };
    syncSound();
    sb.addEventListener('click', () => { if (DT.sfx) DT.sfx.setOn(!DT.sfx.isOn()); syncSound(); });
    const shb = $('mShake');
    const syncShake = () => { shb.textContent = shakeOn ? '흔들림·울렁임: 켜짐' : '흔들림·울렁임: 꺼짐'; };
    syncShake();
    shb.addEventListener('click', () => { shakeOn = !shakeOn; try { localStorage.setItem('deadtown_shake', shakeOn ? '1' : '0'); } catch (e) {} if (!shakeOn && G) { G.trauma = 0; G.kx = G.ky = 0; } syncShake(); if (shakeOn) shake(.5, 0, 6); });
    const pb = $('mPerf'), hb = $('mHand'), zb = $('mBtnSz');
    const syncOpts = () => { pb.textContent = '성능 모드: ' + (OPTS.perf ? '켜짐' : '꺼짐'); hb.textContent = '조작: ' + (OPTS.left ? '왼손' : '오른손'); zb.textContent = '버튼: ' + ({ .85: '작게', 1: '보통', 1.15: '크게' })[OPTS.bs]; };
    syncOpts();
    pb.addEventListener('click', () => { OPTS.perf = OPTS.perf ? 0 : 1; saveOpts(); syncOpts(); toast(OPTS.perf ? '성능 모드: 안개 결·비 입자 줄임, 새 게임부터 좀비 30% 적게' : '성능 모드 꺼짐'); });
    hb.addEventListener('click', () => { OPTS.left = OPTS.left ? 0 : 1; saveOpts(); syncOpts(); });
    zb.addEventListener('click', () => { OPTS.bs = OPTS.bs === 1 ? 1.15 : OPTS.bs === 1.15 ? .85 : 1; saveOpts(); syncOpts(); });
    // 화면 확대/축소: + − 버튼 · 두 손가락 벌리기/모으기 · 마우스 휠 · 키보드 + −
    const setZoom = z => { OPTS.zoom = clamp(+z.toFixed(2), .7, 1.5); try { localStorage.setItem('deadtown_opts', JSON.stringify(OPTS)); } catch (e) {} L._cx = null; };
    $('zIn').addEventListener('click', () => setZoom((OPTS.zoom || 1) + .15));
    $('zOut').addEventListener('click', () => setZoom((OPTS.zoom || 1) - .15));
    addEventListener('wheel', e => { if (G && G.running && !e.target.closest('.sheet-card,#bigmap')) setZoom((OPTS.zoom || 1) * (e.deltaY > 0 ? .92 : 1.08)); }, { passive: true });
    let pinch = null;
    const skipT = t => t.target.closest && t.target.closest('#joyzone,#btns,#btnCrouch,#hud,.sheet-card,#bigmap,#menu,#title');
    addEventListener('touchstart', e => { if (e.touches.length === 2 && !skipT(e.touches[0]) && !skipT(e.touches[1])) { const [a, b] = e.touches; pinch = { d: Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY), z: OPTS.zoom || 1 }; } }, { passive: true });
    addEventListener('touchmove', e => { if (pinch && e.touches.length === 2) { const [a, b] = e.touches; setZoom(pinch.z * Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY) / pinch.d); } }, { passive: true });
    addEventListener('touchend', e => { if (e.touches.length < 2) pinch = null; }, { passive: true });
    // 웅크리기
    $('btnCrouch').addEventListener('click', () => { if (G && G.running) { G.p.crouch = !G.p.crouch; SFX.play('ui_tap'); } });
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
      $('lkPk').textContent = LOOK.packName[tLook.pack || 0];
    };
    const LK = { lkSkin: ['skin', LOOK.skin.length], lkHair: ['hair', LOOK.hair.length], lkHc: ['hc', LOOK.hc.length], lkJk: ['jacket', LOOK.jacket.length], lkPk: ['pack', LOOK.pack.length] };
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
      if (e.code === 'KeyC') G.p.crouch = !G.p.crouch;
      if (e.code === 'KeyR') { if (G.p.rl) cancelReload('재장전을 멈췄다'); else startReload(); }
      if (e.code === 'Equal' || e.code === 'NumpadAdd') $('zIn').click();
      if (e.code === 'Minus' || e.code === 'NumpadSubtract') $('zOut').click();
      else if (e.code === 'KeyF') $('btnAlt').click();
      else if (e.code === 'KeyI' || e.code === 'Tab') { e.preventDefault(); if ($('sheet').classList.contains('hidden')) openSheet(-1); else closeSheet(); }
      else if (e.code === 'KeyM') $('minimap').click();
      updKeys();
    });
    addEventListener('keyup', e => { if (kmap[e.code]) keys[kmap[e.code]] = false; updKeys(); });
    const releaseAll = () => { for (const k in keys) keys[k] = false; updKeys(); input.attackHeld = false; input.jx = input.jy = 0; jid = null; knob.style.transform = ''; joy.classList.remove('free', 'active'); joy.style.left = ''; joy.style.removeProperty('bottom'); };
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
    applyOpts();
    view.setAttribute('viewBox', `0 0 ${VW} ${VH}`); $('sky').setAttribute('viewBox', `0 0 ${VW} ${VH}`);

  }

  let last = 0;
  function frame(ts) {
    requestAnimationFrame(frame);
    const dt = Math.min(.05, Math.max(0, (ts - last) / 1000));
    last = ts;
    try {
      if (G && G.running && !G.paused) { if (G.hitStop > 0) G.hitStop -= dt; else update(dt); }
      if (G && M && !G.dead) render(dt);
      if (G && (G.paused || !G.running || G.dead) && SFX.heli && G.heli) SFX.heli(0, 0); // 멈춤·사망 화면에선 헬기 소리 끔
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

  window.DT.debug = { addWound: (k, pt) => addWound(k, pt), woundMul: k => woundMul(k), nearWater: () => nearWater(), drawMarks: () => drawMarks(), L: () => L, mkItem: id => mkItem(id), stackAdd: it => stackAdd(it), contItems: i => contItems(i), zone: () => updateZombieZone(), clearZ: () => { G.zdorm.clear(); G.zdormN = 0; }, alt: a => { findInteract(); doAlt(a); }, findI: () => findInteract(), addZ: (x, y) => addZombie(x, y, 3, null, null, null, null), changeLv: (h, z) => changeLevel(h, z), lvCache: () => L.lvCache, tm: () => L._tm, cam: () => (L.lax || 0).toFixed(2) + "," + (L.lay || 0).toFixed(2), altOpts: () => altOptions(), benchChunks: (x, y) => { let n = 0; const cx0 = Math.floor(x / CK), cy0 = Math.floor(y / CK); for (let cy = cy0; cy < cy0 + 4; cy++) for (let cx = cx0; cx < cx0 + 4; cx++) { const ch = L.chunks.get(cy * M.CW + cx); if (ch) dropChunk(ch); buildChunk(cx, cy); n++; } return n; }, RECIPES, get G() { return G; }, get M() { return M; }, get AS() { return AS; }, newGame, save, loadSave, continueGame, playerAttack, noise, openSheet, art: { drawPlayerArt, weaponArt, makeZombieG, genLook, lookParts, LOOK, ITEMS, ZTRAIT } };
})();
