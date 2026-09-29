// DEAD TOWN 효과음 엔진 — 음원 파일 없이 Web Audio로 직접 합성
// 사용: DT.sfx.play('swing') / DT.sfx.at('groan', x, y) / DT.sfx.update(dt, state)
(function () {
  'use strict';
  const PREF_KEY = 'deadtown_sound';
  const S = {
    ctx: null, master: null, bus: null, amb: null, rev: null, noise: null,
    on: true, vol: .85, lx: 0, ly: 0, ready: false,
    t: { bird: 3, cricket: 1, moan: 8, heart: 0 },
    wind: null,
  };
  try { const v = localStorage.getItem(PREF_KEY); if (v === '0') S.on = false; } catch (e) {}

  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  const R = (a, b) => a + Math.random() * (b - a);

  function init() {
    if (S.ctx) return true;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    try {
      const c = new AC();
      S.ctx = c;
      S.master = c.createGain(); S.master.gain.value = S.on ? S.vol : 0; S.master.connect(c.destination);
      const comp = c.createDynamicsCompressor();
      comp.threshold.value = -16; comp.knee.value = 10; comp.ratio.value = 5; comp.attack.value = .003; comp.release.value = .2;
      comp.connect(S.master);
      S.bus = c.createGain(); S.bus.gain.value = 1; S.bus.connect(comp);
      S.amb = c.createGain(); S.amb.gain.value = .55; S.amb.connect(comp);
      S.rev = c.createConvolver(); S.rev.buffer = impulse(c, 1.8, 2.6);
      const rg = c.createGain(); rg.gain.value = .32; S.rev.connect(rg); rg.connect(comp);
      S.noise = makeNoise(c, 2.5);
      S.brown = makeBrown(c, 4);
      startWind(); startRain();
      S.ready = true;
      return true;
    } catch (e) { return false; }
  }
  function unlock() {
    if (!init()) return;
    if (S.ctx.state === 'suspended') S.ctx.resume().catch(() => {});
    if (!S.unlocked) {
      try { const b = S.ctx.createBuffer(1, 1, 22050), s = S.ctx.createBufferSource(); s.buffer = b; s.connect(S.ctx.destination); s.start(0); } catch (e) {}
      S.unlocked = true;
    }
  }
  ['pointerdown', 'touchend', 'keydown'].forEach(ev => addEventListener(ev, unlock, { passive: true }));
  document.addEventListener('visibilitychange', () => {
    if (!S.ctx) return;
    if (document.hidden) S.ctx.suspend().catch(() => {}); else if (S.on) S.ctx.resume().catch(() => {});
  });

  function makeNoise(c, sec) {
    const b = c.createBuffer(1, c.sampleRate * sec, c.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return b;
  }
  function makeBrown(c, sec) {
    const b = c.createBuffer(1, c.sampleRate * sec, c.sampleRate), d = b.getChannelData(0);
    let last = 0;
    for (let i = 0; i < d.length; i++) { last = (last + .02 * (Math.random() * 2 - 1)) / 1.02; d[i] = last * 3.5; }
    return b;
  }
  function impulse(c, dur, decay) {
    const n = c.sampleRate * dur, b = c.createBuffer(2, n, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) { const d = b.getChannelData(ch); for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, decay); }
    return b;
  }

  // 출력 노드: 볼륨 + 좌우 + 잔향
  function out(vol, pan, rev) {
    const c = S.ctx, g = c.createGain();
    g.gain.value = vol;
    let node = g;
    if (c.createStereoPanner && pan) { const p = c.createStereoPanner(); p.pan.value = clamp(pan, -1, 1); g.connect(p); node = p; }
    node.connect(S.bus);
    if (rev) { const s = c.createGain(); s.gain.value = rev; node.connect(s); s.connect(S.rev); }
    setTimeout(() => { try { g.disconnect(); node.disconnect(); } catch (e) {} }, 4000);
    return g;
  }
  function env(g, now, a, peak, dur) {
    g.gain.setValueAtTime(.0001, now);
    g.gain.exponentialRampToValueAtTime(Math.max(.0002, peak), now + a);
    g.gain.exponentialRampToValueAtTime(.0001, now + dur);
  }
  function nz(dest, o) {
    const c = S.ctx, now = c.currentTime + (o.t || 0);
    const s = c.createBufferSource(); s.buffer = o.brown ? S.brown : S.noise; s.playbackRate.value = o.rate || 1;
    const f = c.createBiquadFilter(); f.type = o.type || 'bandpass'; f.Q.value = o.q || 1;
    f.frequency.setValueAtTime(o.f || 1000, now);
    if (o.f2) f.frequency.exponentialRampToValueAtTime(o.f2, now + o.dur);
    const g = c.createGain(); env(g, now, o.a || .003, o.g || .4, o.dur || .1);
    s.connect(f); f.connect(g); g.connect(dest);
    s.start(now, Math.random() * 1.5); s.stop(now + (o.dur || .1) + .05);
  }
  function osc(dest, o) {
    const c = S.ctx, now = c.currentTime + (o.t || 0);
    const s = c.createOscillator(); s.type = o.type || 'sine';
    s.frequency.setValueAtTime(o.f, now);
    if (o.f2) s.frequency.exponentialRampToValueAtTime(o.f2, now + o.dur);
    const g = c.createGain(); env(g, now, o.a || .004, o.g || .3, o.dur || .2);
    let last = s;
    if (o.lp) { const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = o.lp; s.connect(f); last = f; }
    last.connect(g); g.connect(dest);
    s.start(now); s.stop(now + (o.dur || .2) + .05);
    return s;
  }
  // 목소리(좀비/사람): 톱니파 + 포먼트 필터 + 떨림
  function voice(dest, o) {
    const c = S.ctx, now = c.currentTime + (o.t || 0), dur = o.dur;
    const s = c.createOscillator(); s.type = 'sawtooth';
    s.frequency.setValueAtTime(o.f, now);
    s.frequency.linearRampToValueAtTime(o.f2 || o.f * .8, now + dur);
    const lfo = c.createOscillator(), lg = c.createGain();
    lfo.frequency.value = o.vib || 5.5; lg.gain.value = o.vibAmt || 5;
    lfo.connect(lg); lg.connect(s.frequency);
    const mix = c.createGain(); mix.gain.value = 1;
    for (const [ff, q, gg] of (o.formants || [[520, 6, 1], [1150, 8, .6], [2400, 10, .25]])) {
      const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = ff * (o.fs || 1); f.Q.value = q;
      const fg = c.createGain(); fg.gain.value = gg; s.connect(f); f.connect(fg); fg.connect(mix);
    }
    const g = c.createGain();
    g.gain.setValueAtTime(.0001, now);
    g.gain.exponentialRampToValueAtTime(o.g || .5, now + (o.a || .2));
    g.gain.setValueAtTime(o.g || .5, now + dur * .6);
    g.gain.exponentialRampToValueAtTime(.0001, now + dur);
    mix.connect(g); g.connect(dest);
    s.start(now); lfo.start(now); s.stop(now + dur + .05); lfo.stop(now + dur + .05);
    if (o.breath) nz(dest, { t: o.t, type: 'bandpass', f: 900, q: .7, dur: dur * .9, g: o.breath, a: .15 });
  }

  /* ---------- 소리 목록 ---------- */
  const SND = {
    ui(d) { osc(d, { f: 1400, f2: 900, dur: .05, g: .08, type: 'triangle' }); },
    step(d, o) {
      const s = o.surface;
      if (s === 'grass') nz(d, { type: 'lowpass', f: 700, dur: .09, g: o.run ? .22 : .12, a: .01 });
      else if (s === 'wood') { nz(d, { type: 'bandpass', f: 900, q: 1.2, dur: .06, g: o.run ? .22 : .13 }); osc(d, { f: 140, f2: 90, dur: .07, g: o.run ? .12 : .07 }); }
      else nz(d, { type: 'bandpass', f: 1700, q: .9, dur: .05, g: o.run ? .24 : .13 });
    },
    swing(d, o) { nz(d, { type: 'bandpass', f: o.heavy ? 380 : 700, f2: o.heavy ? 1400 : 2600, q: 1.6, dur: o.heavy ? .24 : .16, g: .28, a: .03 }); },
    hitBlunt(d) {
      osc(d, { f: 110, f2: 45, dur: .16, g: .7 });
      nz(d, { type: 'lowpass', f: 1100, dur: .1, g: .55 });
      nz(d, { t: .02, type: 'bandpass', f: 2600, q: 2, dur: .05, g: .2 });
    },
    hitBlade(d) {
      nz(d, { type: 'highpass', f: 2600, dur: .1, g: .35 });
      nz(d, { t: .01, type: 'bandpass', f: 600, q: 1, dur: .12, g: .35 });
      osc(d, { f: 240, f2: 120, dur: .08, g: .25 });
    },
    hitFist(d) { osc(d, { f: 90, f2: 55, dur: .1, g: .5 }); nz(d, { type: 'lowpass', f: 700, dur: .07, g: .35 }); },
    kill(d) {
      nz(d, { type: 'lowpass', f: 500, f2: 160, dur: .38, g: .55, a: .01 });
      osc(d, { f: 75, f2: 40, dur: .35, g: .45 });
      for (let i = 0; i < 3; i++) nz(d, { t: .05 + i * .06, type: 'bandpass', f: R(400, 900), q: 3, dur: .05, g: .2 });
    },
    gun(d) {
      nz(d, { type: 'lowpass', f: 5200, f2: 260, dur: .55, g: 1, a: .001 });
      osc(d, { f: 70, f2: 28, dur: .45, g: .9 });
      nz(d, { type: 'highpass', f: 3000, dur: .04, g: .6, a: .001 });
    },
    click(d) { osc(d, { f: 2200, dur: .015, g: .2, type: 'square' }); osc(d, { t: .05, f: 1800, dur: .015, g: .15, type: 'square' }); },
    groan(d, o) {
      const f = o.pitch || R(62, 105), dur = R(1.1, 2.1);
      voice(d, { f, f2: f * R(.7, .9), dur, g: .42, a: R(.2, .4), vib: R(3.5, 7), vibAmt: R(3, 8), fs: R(.85, 1.15), breath: .06,
        formants: [[R(420, 600), 5, 1], [R(900, 1250), 7, .55], [2300, 9, .2]] });
    },
    alert(d) { // 좀비가 플레이어를 발견
      const f = R(120, 170);
      voice(d, { f, f2: f * .6, dur: .7, g: .55, a: .05, vib: 9, vibAmt: 12, breath: .1, formants: [[700, 5, 1], [1300, 7, .6], [2600, 9, .25]] });
    },
    growl(d) {
      const f = R(140, 190);
      voice(d, { f, f2: f * .55, dur: .45, g: .6, a: .02, vib: 14, vibAmt: 18, breath: .14, formants: [[800, 4, 1], [1500, 6, .6], [2800, 8, .3]] });
      nz(d, { t: .28, type: 'bandpass', f: 1800, q: 3, dur: .05, g: .35 }); // 이빨 딱
    },
    hurt(d) {
      voice(d, { f: R(170, 200), f2: 120, dur: .22, g: .45, a: .01, vib: 2, vibAmt: 2, formants: [[650, 5, 1], [1200, 7, .6], [2500, 9, .2]] });
      osc(d, { f: 80, f2: 45, dur: .15, g: .45 });
    },
    bite(d) { nz(d, { type: 'bandpass', f: 700, q: 1.5, dur: .3, g: .5 }); nz(d, { t: .05, type: 'highpass', f: 2500, dur: .12, g: .3 }); SND.hurt(d); },
    heart(d, o) { const g = o.g || .5; osc(d, { f: 58, f2: 40, dur: .16, g, lp: 200 }); osc(d, { t: .2, f: 52, f2: 38, dur: .16, g: g * .8, lp: 200 }); },
    search(d) { for (let i = 0; i < 6; i++) nz(d, { t: i * R(.07, .14), type: 'bandpass', f: R(1600, 3800), q: .8, dur: R(.04, .09), g: R(.08, .16) }); nz(d, { t: .05, type: 'lowpass', f: 400, dur: .12, g: .15 }); },
    loot(d) { for (let i = 0; i < 3; i++) nz(d, { t: i * .06, type: 'bandpass', f: R(2000, 4000), q: .9, dur: .05, g: .12 }); osc(d, { t: .1, f: 320, f2: 260, dur: .06, g: .08 }); },
    eat(d) { for (let i = 0; i < 6; i++) nz(d, { t: i * R(.18, .28), type: 'bandpass', f: R(1400, 2600), q: 2, dur: .06, g: R(.15, .25) }); },
    drink(d) { for (let i = 0; i < 5; i++) osc(d, { t: i * .22, f: R(260, 380), f2: R(500, 700), dur: .09, g: .14 }); },
    bandage(d) { nz(d, { type: 'highpass', f: 1800, f2: 4200, dur: .45, g: .22, a: .05 }); nz(d, { t: .6, type: 'highpass', f: 2200, f2: 5000, dur: .35, g: .18, a: .04 }); },
    pills(d) { for (let i = 0; i < 4; i++) osc(d, { t: i * .05, f: R(2400, 3600), dur: .03, g: .06, type: 'triangle' }); },
    equip(d) { nz(d, { type: 'bandpass', f: 1200, q: 1, dur: .08, g: .18 }); osc(d, { t: .05, f: 520, f2: 380, dur: .08, g: .1, type: 'triangle' }); },
    hammer(d) {
      osc(d, { f: R(160, 200), f2: 120, dur: .14, g: .5, type: 'triangle' });
      osc(d, { f: R(620, 760), dur: .12, g: .16 });
      nz(d, { type: 'bandpass', f: 1500, q: 1.2, dur: .05, g: .45 });
    },
    craft(d) { SND.search(d); osc(d, { t: .2, f: 300, f2: 200, dur: .08, g: .12, type: 'triangle' }); },
    breakw(d) { nz(d, { type: 'bandpass', f: 1600, q: 1.5, dur: .15, g: .55 }); nz(d, { t: .04, type: 'lowpass', f: 600, dur: .2, g: .4 }); },
    place(d) { osc(d, { f: 90, f2: 60, dur: .18, g: .5 }); nz(d, { type: 'lowpass', f: 800, dur: .12, g: .35 }); },
    nightfall(d) {
      osc(d, { f: 55, dur: 4.5, g: .22, a: 1.8, type: 'sawtooth', lp: 260 });
      osc(d, { f: 82.4, dur: 4.5, g: .14, a: 2.2, type: 'sawtooth', lp: 300 });
      osc(d, { t: .6, f: 110, f2: 104, dur: 3.5, g: .08, a: 1.5, lp: 500 });
    },
    dawn(d) { for (let i = 0; i < 3; i++) SND.bird(d, { t: i * .5 }); },
    death(d) {
      osc(d, { f: 110, f2: 40, dur: 3.2, g: .4, a: .05, type: 'sawtooth', lp: 400 });
      osc(d, { f: 116, f2: 42, dur: 3.2, g: .3, a: .05, type: 'sawtooth', lp: 400 });
      nz(d, { type: 'lowpass', f: 300, dur: 2.5, g: .3, a: .5, brown: true });
    },
    bird(d, o) {
      const t = (o && o.t) || 0, base = R(2600, 4200);
      const n = 2 + (Math.random() * 3 | 0);
      for (let i = 0; i < n; i++) osc(d, { t: t + i * R(.09, .16), f: base, f2: base * R(1.2, 1.5), dur: R(.05, .09), g: R(.05, .09) });
    },
    thunder(d) {
      nz(d, { type: 'lowpass', f: 1800, f2: 200, dur: .6, g: .8, a: .005 });
      nz(d, { t: .1, type: 'lowpass', f: 260, dur: 3.6, g: .9, a: .25, brown: true });
      nz(d, { t: .9, type: 'lowpass', f: 180, dur: 2.4, g: .6, a: .3, brown: true });
    },
    drip(d) { osc(d, { f: R(900, 1600), f2: R(400, 700), dur: .05, g: .05 }); },
    door(d, o) {
      if (o.close) { osc(d, { f: 95, f2: 60, dur: .16, g: .55 }); nz(d, { type: 'lowpass', f: 900, dur: .1, g: .4 }); }
      else { osc(d, { f: R(380, 460), f2: R(520, 640), dur: .35, g: .05, type: 'sawtooth', lp: 1400 }); nz(d, { type: 'bandpass', f: 700, q: 2, dur: .2, g: .12 }); }
    },
    thump(d) { osc(d, { f: 80, f2: 45, dur: .2, g: .8, lp: 400 }); nz(d, { type: 'lowpass', f: 600, dur: .15, g: .6 }); nz(d, { t: .02, type: 'bandpass', f: 1600, q: 3, dur: .06, g: .15 }); },
    boardBreak(d) { nz(d, { type: 'bandpass', f: 1300, q: 1.2, dur: .25, g: .7 }); nz(d, { t: .05, type: 'lowpass', f: 500, dur: .3, g: .5 }); for (let i = 0; i < 3; i++) nz(d, { t: .08 + i * .05, type: 'bandpass', f: R(1800, 3000), q: 4, dur: .04, g: .25 }); },
    glass(d) { nz(d, { type: 'highpass', f: 3000, dur: .5, g: .6, a: .002 }); for (let i = 0; i < 7; i++) osc(d, { t: .03 + i * R(.03, .07), f: R(2500, 6000), dur: .05, g: .08, type: 'triangle' }); },
    climb(d) { SND.search(d); nz(d, { t: .5, type: 'lowpass', f: 500, dur: .2, g: .3 }); },
    levelup(d) { [523, 659, 784].forEach((f, i) => osc(d, { t: i * .09, f, dur: .18, g: .12, type: 'triangle' })); },
    sizzle(d) { nz(d, { type: 'highpass', f: 3500, dur: 1.4, g: .14, a: .2 }); for (let i = 0; i < 8; i++) nz(d, { t: R(0, 1.2), type: 'bandpass', f: R(3000, 6000), q: 5, dur: .03, g: .1 }); },
    powerdown(d) { osc(d, { f: 120, f2: 30, dur: 1.6, g: .3, type: 'sawtooth', lp: 600 }); osc(d, { f: 60, f2: 20, dur: 1.8, g: .35, lp: 200 }); },
    fireup(d) { nz(d, { type: 'bandpass', f: 800, q: .6, dur: 1, g: .3, a: .3 }); for (let i = 0; i < 6; i++) nz(d, { t: R(.1, .9), type: 'bandpass', f: R(1500, 3500), q: 4, dur: .03, g: .15 }); },
    cricket(d) { const f = R(4200, 5200); for (let i = 0; i < 3; i++) osc(d, { t: i * .045, f, dur: .025, g: .035, type: 'square', lp: 7000 }); },
  };

  // 같은 소리가 한꺼번에 몰리지 않게 (좀비 떼 신음 등) — 최소 간격(초)
  const GAP = { thump: .08, groan: .45, alert: .25, growl: .15, kill: .06, hitBlunt: .05, hitBlade: .05, hammer: .1 };
  const last = {};
  function play(name, o) {
    if (!S.ready || !S.on || !SND[name]) return;
    if (S.ctx.state !== 'running') return;
    const now = S.ctx.currentTime;
    if (GAP[name] && last[name] && now - last[name] < GAP[name]) return;
    last[name] = now;
    o = o || {};
    try { SND[name](out(o.vol == null ? 1 : o.vol, o.pan || 0, o.rev || 0), o); } catch (e) {}
  }
  // 위치 소리: 거리로 볼륨, 좌우로 팬
  function at(name, x, y, o) {
    o = o || {};
    const dx = x - S.lx, dy = y - S.ly, d = Math.hypot(dx, dy), maxD = o.range || 14;
    if (d > maxD) return;
    const v = Math.pow(1 - d / maxD, 1.6) * (o.vol == null ? 1 : o.vol);
    if (v < .02) return;
    play(name, Object.assign({}, o, { vol: v, pan: clamp(dx / 7, -.9, .9), rev: clamp(d / maxD * .6, 0, .5) + (o.rev || 0) }));
  }

  /* ---------- 환경음 ---------- */
  function startWind() {
    const c = S.ctx;
    const src = c.createBufferSource(); src.buffer = S.brown; src.loop = true;
    const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 380; f.Q.value = .6;
    const g = c.createGain(); g.gain.value = .0;
    const lfo = c.createOscillator(), lg = c.createGain(); lfo.frequency.value = .06; lg.gain.value = 160;
    lfo.connect(lg); lg.connect(f.frequency);
    src.connect(f); f.connect(g); g.connect(S.amb);
    src.start(); lfo.start();
    S.wind = g;
  }
  function startRain() {
    const c = S.ctx;
    const src = c.createBufferSource(); src.buffer = S.noise; src.loop = true;
    const hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 900;
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 6500;
    const g = c.createGain(); g.gain.value = 0;
    src.connect(hp); hp.connect(lp); lp.connect(g); g.connect(S.amb);
    src.start();
    S.rain = g; S.rainLP = lp;
  }
  // 매 프레임 호출: 위치, 밤, 체력 등
  function update(dt, st) {
    S.lx = st.x; S.ly = st.y;
    if (!S.ready || !S.on || S.ctx.state !== 'running') return;
    const now = S.ctx.currentTime;
    if (S.wind) S.wind.gain.setTargetAtTime(st.sleeping ? .05 : (.1 + st.night * .1) * (st.indoor ? .45 : 1), now, .8);
    const T = S.t;
    const rn = st.rain || 0;
    if (S.rain) {
      S.rain.gain.setTargetAtTime(st.sleeping ? rn * .12 : rn * (st.indoor ? .16 : .34), now, .6);
      S.rainLP.frequency.setTargetAtTime(st.indoor ? 1400 : 6500, now, .3); // 실내면 먹먹하게
      if (rn > .2) { T.drip = (T.drip || 0) - dt; if (T.drip <= 0) { T.drip = R(.05, .3) / rn; play('drip', { vol: R(.3, .8), pan: R(-.9, .9) }); } }
    }
    // 낮: 새 / 밤: 귀뚜라미·먼 신음
    if (st.night < .5) { T.bird -= dt; if (T.bird <= 0) { T.bird = R(3, 9); if (!st.indoor && rn < .2) play('bird', { vol: R(.4, .8), pan: R(-.8, .8), rev: .3 }); } }
    else {
      T.cricket -= dt; if (T.cricket <= 0) { T.cricket = R(.4, 1.6); play('cricket', { vol: R(.3, .7) * (st.indoor ? .4 : 1), pan: R(-.9, .9) }); }
      T.moan -= dt; if (T.moan <= 0) { T.moan = R(10, 25); play('groan', { vol: .18, pan: R(-1, 1), rev: .7, pitch: R(55, 80) }); }
    }
    // 심장 박동 (체력 낮을 때)
    if (st.hp < 30 && !st.dead) {
      T.heart -= dt;
      if (T.heart <= 0) { T.heart = st.hp < 15 ? .62 : .85; play('heart', { g: clamp(1 - st.hp / 30, .25, .8) }); }
    }
  }

  function setOn(v) {
    S.on = !!v;
    try { localStorage.setItem(PREF_KEY, S.on ? '1' : '0'); } catch (e) {}
    if (S.master) S.master.gain.setTargetAtTime(S.on ? S.vol : 0, S.ctx.currentTime, .05);
    if (S.on) unlock();
  }

  window.DT = window.DT || {};
  DT.sfx = { play, at, update, setOn, isOn: () => S.on, unlock, _S: S };
})();
