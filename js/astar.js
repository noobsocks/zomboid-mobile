// A* 경로탐색 — 8방향, 벽 모서리 끼어가기 금지, 바이너리 힙
(function () {
  const DX = [1, -1, 0, 0, 1, 1, -1, -1];
  const DY = [0, 0, 1, -1, 1, -1, 1, -1];
  const SQ2 = 1.41421356;

  function AStar(W, H, block) {
    this.W = W; this.H = H; this.block = block;
    // 아주 큰 세계는 좀비 주변 256x256칸 창 안에서만 길을 찾음 (메모리 절약)
    this.win = W * H > 1200000 ? 256 : 0;
    const N = this.win ? this.win * this.win : W * H;
    this.g = new Float32Array(N);
    this.par = new Int32Array(N);
    this.open = new Uint32Array(N);
    this.closed = new Uint32Array(N);
    this.gen = 0;
    this.cap = Math.min(N * 8, 1 << 17); // 큰 세계에서도 메모리를 적게 쓰도록 힙 크기 제한
    this.hn = new Int32Array(this.cap);
    this.hf = new Float32Array(this.cap);
    this.hs = 0;
    this.lastExpanded = 0;
    this.cost = null; // 칸별 추가 비용 (닫힌 문·창문 등: 부수고 지나가야 함)
  }
  AStar.prototype.push = function (n, f) {
    const hn = this.hn, hf = this.hf;
    if (this.hs >= this.cap) return; // 가득 차면 버림 (탐색 한도 안에서는 거의 없음)
    let i = this.hs++;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (hf[p] <= f) break;
      hn[i] = hn[p]; hf[i] = hf[p]; i = p;
    }
    hn[i] = n; hf[i] = f;
  };
  AStar.prototype.pop = function () {
    const hn = this.hn, hf = this.hf;
    const top = hn[0];
    const s = --this.hs;
    if (s > 0) {
      const n = hn[s], f = hf[s];
      let i = 0;
      for (;;) {
        let c = 2 * i + 1;
        if (c >= s) break;
        if (c + 1 < s && hf[c + 1] < hf[c]) c++;
        if (hf[c] >= f) break;
        hn[i] = hn[c]; hf[i] = hf[c]; i = c;
      }
      hn[i] = n; hf[i] = f;
    }
    return top;
  };
  function h(x, y, tx, ty) {
    const dx = Math.abs(x - tx), dy = Math.abs(y - ty);
    return dx + dy + (SQ2 - 2) * Math.min(dx, dy);
  }
  // 반환: [[x,y], ...] 시작칸 제외 ~ 목표칸. 못 찾으면 null
  AStar.prototype.find = function (sx, sy, tx, ty, maxExp) {
    const W = this.W, H = this.H, B = this.block;
    maxExp = maxExp || 3000;
    if (tx < 0 || ty < 0 || tx >= W || ty >= H || sx < 0 || sy < 0 || sx >= W || sy >= H) return null;
    if (B[ty * W + tx]) { // 목표가 막혀 있으면 가장 가까운 빈칸
      let best = null, bd = 1e9;
      for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
        const x = tx + dx, y = ty + dy;
        if (x < 0 || y < 0 || x >= W || y >= H || B[y * W + x]) continue;
        const d = dx * dx + dy * dy;
        if (d < bd) { bd = d; best = [x, y]; }
      }
      if (!best) return null;
      tx = best[0]; ty = best[1];
    }
    const gen = ++this.gen;
    const g = this.g, par = this.par, open = this.open, closed = this.closed;
    // 창(window) 좌표: LW x LH 크기, (ox, oy)가 왼쪽 위
    const LW = this.win || W, LH = this.win || H;
    const ox = this.win ? Math.max(0, Math.min(W - LW, ((sx + tx) >> 1) - (LW >> 1))) : 0;
    const oy = this.win ? Math.max(0, Math.min(H - LH, ((sy + ty) >> 1) - (LH >> 1))) : 0;
    if (sx < ox || sy < oy || tx < ox || ty < oy || sx >= ox + LW || sy >= oy + LH || tx >= ox + LW || ty >= oy + LH) return null; // 너무 멀면 포기
    const s = (sy - oy) * LW + (sx - ox), goal = (ty - oy) * LW + (tx - ox);
    if (s === goal) return [];
    this.hs = 0;
    g[s] = 0; par[s] = -1; open[s] = gen;
    this.push(s, h(sx, sy, tx, ty));
    let exp = 0;
    while (this.hs > 0) {
      const n = this.pop();
      if (closed[n] === gen) continue;
      closed[n] = gen;
      if (n === goal) {
        const path = [];
        let c = n;
        while (c !== s && c !== -1) { path.push([c % LW + ox, ((c / LW) | 0) + oy]); c = par[c]; }
        path.reverse();
        this.lastExpanded = exp;
        return path;
      }
      if (++exp > maxExp) break;
      const lx = n % LW, ly = (n / LW) | 0, x = lx + ox, y = ly + oy;
      for (let k = 0; k < 8; k++) {
        const dx = DX[k], dy = DY[k];
        const nx = x + dx, ny = y + dy;
        if (nx < ox || ny < oy || nx >= ox + LW || ny >= oy + LH || nx >= W || ny >= H) continue;
        const gm = ny * W + nx, m = (ny - oy) * LW + (nx - ox);
        if (B[gm] || closed[m] === gen) continue;
        if (dx && dy && (B[y * W + nx] || B[ny * W + x])) continue;
        const ng = g[n] + (dx && dy ? SQ2 : 1) + (this.cost ? this.cost[gm] : 0);
        if (open[m] !== gen || ng < g[m]) {
          open[m] = gen; g[m] = ng; par[m] = n;
          this.push(m, ng + h(nx, ny, tx, ty));
        }
      }
    }
    this.lastExpanded = exp;
    return null;
  };
  DT.AStar = AStar;
})();
