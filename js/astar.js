// A* 경로탐색 — 8방향, 벽 모서리 끼어가기 금지, 바이너리 힙
(function () {
  const DX = [1, -1, 0, 0, 1, 1, -1, -1];
  const DY = [0, 0, 1, -1, 1, -1, 1, -1];
  const SQ2 = 1.41421356;

  function AStar(W, H, block) {
    this.W = W; this.H = H; this.block = block;
    const N = W * H;
    this.g = new Float32Array(N);
    this.par = new Int32Array(N);
    this.open = new Uint32Array(N);
    this.closed = new Uint32Array(N);
    this.gen = 0;
    this.hn = new Int32Array(N * 8);
    this.hf = new Float32Array(N * 8);
    this.hs = 0;
    this.lastExpanded = 0;
    this.cost = null; // 칸별 추가 비용 (닫힌 문·창문 등: 부수고 지나가야 함)
  }
  AStar.prototype.push = function (n, f) {
    const hn = this.hn, hf = this.hf;
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
    const s = sy * W + sx, goal = ty * W + tx;
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
        while (c !== s && c !== -1) { path.push([c % W, (c / W) | 0]); c = par[c]; }
        path.reverse();
        this.lastExpanded = exp;
        return path;
      }
      if (++exp > maxExp) break;
      const x = n % W, y = (n / W) | 0;
      for (let k = 0; k < 8; k++) {
        const dx = DX[k], dy = DY[k];
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
        const m = ny * W + nx;
        if (B[m] || closed[m] === gen) continue;
        if (dx && dy && (B[y * W + nx] || B[ny * W + x])) continue;
        const ng = g[n] + (dx && dy ? SQ2 : 1) + (this.cost ? this.cost[m] : 0);
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
