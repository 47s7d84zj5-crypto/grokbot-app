(() => {
  const REFRESH_MS = 45000;
  const RANGES = ["LIVE", "1H", "4H", "1D", "1W", "ALL"];

  const state = {
    data: null,
    tab: "home",
    range: "LIVE",
    query: "",
    activityFilter: "notable",
    error: false,
    token: null,
  };

  const $ = (sel) => document.querySelector(sel);
  const views = {
    home: $("#view-home"),
    agents: $("#view-agents"),
    activity: $("#view-activity"),
    account: $("#view-account"),
    token: $("#view-token"),
  };

  function dataUrl() {
    const path = location.pathname;
    let dir;
    if (path.endsWith("/")) dir = path;
    else if (path.endsWith(".html")) dir = path.replace(/[^/]+$/, "");
    else dir = path + "/";
    return `${dir}data.json?t=${Date.now()}`;
  }

  function fmtSol(n, digits = 4) {
    if (n == null || Number.isNaN(n)) return "—";
    const sign = n > 0 && digits >= 0 ? "" : "";
    return `${sign}${Number(n).toFixed(digits)} SOL`;
  }

  function fmtUsd(n) {
    if (n == null || Number.isNaN(n)) return null;
    const abs = Math.abs(n);
    const body = abs.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return `${n < 0 ? "-" : ""}$${body}`;
  }

  function fmtPct(n) {
    return `${n >= 0 ? "+" : ""}${Number(n).toFixed(2)}%`;
  }

  function clock(iso) {
    if (!iso) return "";
    return new Intl.DateTimeFormat("en-GB", {
      timeZone: "Europe/Budapest",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(new Date(iso));
  }

  function escapeHtml(s) {
    return String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function tokenLink(item) {
    const name = escapeHtml(item.symbol || item.mint || "token");
    if (!item.url && !item.mint) return name;
    const href = item.url || `https://pump.fun/coin/${item.mint}`;
    return `<a href="${escapeHtml(href)}" target="_blank" rel="noopener">${name}</a>`;
  }

  function matchesQuery(text) {
    const q = state.query.trim().toLowerCase();
    if (!q) return true;
    return String(text || "").toLowerCase().includes(q);
  }

  function drawChart(canvas, series, hasTrades) {
    if (!canvas) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = canvas.clientWidth || canvas.parentElement.clientWidth || 390;
    const height = 220;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    const padX = 0;
    const padTop = 16;
    const padBot = 12;
    const points = (series && series.points) || [];
    const values = hasTrades ? points.map((p) => p.v) : [10, 10];
    const min = Math.min(...values);
    const max = Math.max(...values);
    const span = max - min || 1;
    const times = hasTrades && points.length ? points.map((p) => p.t) : [0, 1];
    const t0 = Math.min(...times);
    const t1 = Math.max(...times);
    const tspan = t1 - t0 || 1;

    const xAt = (t) => padX + ((t - t0) / tspan) * (width - padX * 2);
    const yAt = (v) => padTop + (1 - (v - min) / span) * (height - padTop - padBot);
    const baseline = yAt(hasTrades ? values[0] : values[0]);

    // Subtle green glow baseline
    const grad = ctx.createLinearGradient(0, 0, 0, height);
    grad.addColorStop(0, "rgba(0,211,90,0.18)");
    grad.addColorStop(1, "rgba(0,211,90,0)");

    ctx.beginPath();
    if (hasTrades && points.length >= 2) {
      points.forEach((p, i) => {
        const x = xAt(p.t);
        const y = yAt(p.v);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.strokeStyle = "#00d35a";
      ctx.lineWidth = 2;
      ctx.stroke();
      const first = points[0];
      const last = points[points.length - 1];
      ctx.lineTo(xAt(last.t), height);
      ctx.lineTo(xAt(first.t), height);
      ctx.closePath();
      ctx.fillStyle = grad;
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.moveTo(0, baseline);
      ctx.lineTo(width, baseline);
      ctx.strokeStyle = "#00d35a";
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.lineTo(width, height);
      ctx.lineTo(0, height);
      ctx.closePath();
      ctx.fillStyle = grad;
      ctx.fill();
    }

    ctx.setLineDash([4, 6]);
    ctx.strokeStyle = "rgba(0,211,90,0.35)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, baseline);
    ctx.lineTo(width, baseline);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  function gaugeSvg(value) {
    const v = value == null ? 0 : Math.max(0, Math.min(1, Number(value)));
    const r = 38;
    const c = 2 * Math.PI * r;
    const dash = c * v;
    const color = v >= 0.5 ? "#00d35a" : v > 0 ? "#ff9f0a" : "#ff453a";
    return `<svg class="ringc" viewBox="0 0 92 92" aria-hidden="true">
      <circle cx="46" cy="46" r="${r}" fill="none" stroke="#2c2c2e" stroke-width="8"/>
      <circle cx="46" cy="46" r="${r}" fill="none" stroke="${color}" stroke-width="8"
        stroke-linecap="round" stroke-dasharray="${dash} ${c}"
        transform="rotate(-90 46 46)"/>
      <text x="46" y="51" text-anchor="middle" fill="#fff" font-size="18" font-weight="700">${
        value == null ? "—" : Number(value).toFixed(2)
      }</text>
    </svg>`;
  }

  function feedRows(items) {
    if (!items || !items.length) return "";
    return `<div class="feed">${items
      .slice(0, 5)
      .map((row) => {
        const tone = row.tone || "";
        return `<div class="frow ${escapeHtml(tone)}">
          <span class="l">${tokenLink(row)}</span>
          <span class="r">${escapeHtml(row.detail || "")}</span>
        </div>`;
      })
      .join("")}</div>`;
  }

  function agentCard(agent, compact) {
    const running = agent.running ? "" : "off";
    const empty = agent.empty && !(agent.items && agent.items.length)
      ? `<div class="empty" style="padding:18px 0 8px">${escapeHtml(agent.empty)}</div>`
      : feedRows(agent.items || []);
    const gauge = agent.kind === "gauge" ? `<div class="gauge-row">${gaugeSvg(agent.gauge)}<div class="sub">${escapeHtml(agent.sub || "")}</div></div>` : "";
    const head = agent.kind === "gauge" ? "" : `<div class="head">${escapeHtml(agent.headline || "—")}</div><div class="sub">${escapeHtml(agent.sub || "")}</div>`;
    return `<article class="${compact ? "acard" : "agent-full"}">
      <div class="nm ${escapeHtml(agent.accent || "")}"><i class="${running}"></i> ${escapeHtml(agent.name)}</div>
      ${head}${gauge}${empty}
    </article>`;
  }

  function activityRow(item) {
    const when = clock(item.ts);
    if (item.position_id) {
      const tone = item.amount_tone || "";
      const note = item.note ? `<small class="${escapeHtml(tone)}">${escapeHtml(item.note)}</small>` : "";
      const sub = [item.subtitle, when].filter(Boolean).join(" · ");
      return `<button type="button" class="li tap" data-pos="${escapeHtml(item.position_id)}">
        <div class="l"><div class="t">${escapeHtml(item.title)}</div><div class="s">${escapeHtml(sub)}</div></div>
        <div class="r"><span class="${escapeHtml(tone)}">${escapeHtml(item.amount_text || "")}</span>${note}</div>
        <span class="chev">›</span>
      </button>`;
    }
    let amount = "";
    let pct = "";
    if (item.kind === "bought" && item.size_sol != null) {
      amount = fmtSol(item.size_sol, 2);
    } else if (item.pnl_sol != null) {
      const cls = item.pnl_sol >= 0 ? "up" : "dn";
      amount = `<span class="${cls}">${item.pnl_sol >= 0 ? "+" : ""}${Number(item.pnl_sol).toFixed(4)} SOL</span>`;
      if (item.pnl_pct != null) pct = `<small class="${cls}">${fmtPct(item.pnl_pct)}</small>`;
    } else if (item.score_total != null) {
      amount = `<span class="sec">${Number(item.score_total).toFixed(3)}</span>`;
    }
    const sub = [item.subtitle, when].filter(Boolean).join(" · ");
    // The whole row is already a link; a nested <a> would break the layout.
    const inner = `<div class="l"><div class="t">${escapeHtml(item.title)}</div>
      <div class="s">${escapeHtml(sub)}</div></div>
      <div class="r">${amount}${pct}</div>`;
    if (item.url) {
      return `<a class="li" href="${escapeHtml(item.url)}" target="_blank" rel="noopener">${inner}</a>`;
    }
    return `<div class="li">${inner}</div>`;
  }

  function fmtMc(n) {
    if (n == null || !Number.isFinite(Number(n)) || Number(n) <= 0) return "—";
    const v = Number(n);
    if (v >= 1e6) return `$${(v / 1e6).toFixed(2)}M`;
    if (v >= 1e3) return `$${(v / 1e3).toFixed(1)}K`;
    return `$${v.toFixed(0)}`;
  }

  function fmtAge(sec) {
    if (sec == null) return "—";
    const s = Math.max(0, Math.round(sec));
    if (s < 3600) return `${Math.floor(s / 60)}m`;
    if (s < 86400) return `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`;
    return `${Math.floor(s / 86400)}d ${Math.floor((s % 86400) / 3600)}h`;
  }

  function allPositions(data) {
    return [...(data.open_positions || []), ...(data.closed_positions || [])];
  }

  function positionCard(p) {
    const ch = p.change_pct;
    const cls = ch == null ? "sec" : ch >= 0 ? "up" : "dn";
    const status = p.open ? "Open" : "Closed";
    return `<button type="button" class="li tap" data-pos="${escapeHtml(p.id)}">
      <div class="l"><div class="t">${escapeHtml(p.symbol)} <span class="pill ${p.open ? "on" : ""}">${status}</span></div>
        <div class="s">${escapeHtml(fmtSol(p.size_sol, 4))} · entry ${escapeHtml(fmtMc(p.entry_mc_usd))} MC · ${escapeHtml(clock(p.opened_at))}</div></div>
      <div class="r"><span class="${cls}">${ch == null ? "—" : fmtPct(ch)}</span><small>${escapeHtml(fmtMc(p.last_mc_usd))} MC</small></div>
      <span class="chev">›</span>
    </button>`;
  }

  const MARK_COLORS = { entry: "#0a84ff", partial: "#ffd60a", trail: "#ff9f0a", stop: "#ff453a", exit: "#00d35a" };

  function mcChartSvg(p) {
    const pts = (p.mc_history || []).filter((x) => x && x[1] > 0);
    const W = 358;
    const H = 200;
    const padT = 14;
    const padB = 22;
    if (pts.length < 2) {
      return `<div class="tchart empty-chart">${
        p.open ? "Collecting market cap samples… the chart fills in as the tracker polls (about every 20 s)." : "No market cap samples were recorded for this position."
      }</div>`;
    }
    const marks = (p.markers || []).filter((m) => m.t);
    const ts = pts.map((x) => x[0]).concat(marks.map((m) => m.t));
    const t0 = Math.min(...ts);
    const t1 = Math.max(...ts);
    const vals = pts.map((x) => x[1]).concat(marks.map((m) => m.mc_usd).filter((v) => v > 0));
    let lo = Math.min(...vals);
    let hi = Math.max(...vals);
    const pad = (hi - lo) * 0.08 || hi * 0.05 || 1;
    lo -= pad;
    hi += pad;
    const x = (t) => ((t - t0) / (t1 - t0 || 1)) * W;
    const y = (v) => padT + (1 - (v - lo) / (hi - lo || 1)) * (H - padT - padB);
    const line = pts.map((q, i) => `${i ? "L" : "M"}${x(q[0]).toFixed(1)},${y(q[1]).toFixed(1)}`).join("");
    const last = pts[pts.length - 1];
    const up = last[1] >= (p.entry_mc_usd || pts[0][1]);
    const col = up ? "#00d35a" : "#ff453a";
    const area = `${line}L${x(last[0]).toFixed(1)},${H - padB}L${x(pts[0][0]).toFixed(1)},${H - padB}Z`;
    const nearest = (t) => pts.reduce((b, q) => (Math.abs(q[0] - t) < Math.abs(b[0] - t) ? q : b), pts[0])[1];
    const entryY = p.entry_mc_usd ? y(p.entry_mc_usd) : null;
    const markSvg = marks
      .map((m) => {
        const mx = x(m.t);
        const my = y(m.mc_usd > 0 ? m.mc_usd : nearest(m.t));
        const c = MARK_COLORS[m.kind] || "#fff";
        return `<line x1="${mx.toFixed(1)}" x2="${mx.toFixed(1)}" y1="${padT}" y2="${H - padB}" stroke="${c}" stroke-opacity="0.35" stroke-dasharray="3 4"/>
          <circle cx="${mx.toFixed(1)}" cy="${my.toFixed(1)}" r="5" fill="${c}" stroke="#000" stroke-width="2"/>`;
      })
      .join("");
    const tl = (t) => new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Budapest", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(t * 1000));
    return `<svg class="tchart" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="Market cap since entry">
      <defs><linearGradient id="tg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${col}" stop-opacity="0.25"/><stop offset="1" stop-color="${col}" stop-opacity="0"/></linearGradient></defs>
      <path d="${area}" fill="url(#tg)"/>
      ${entryY != null ? `<line x1="0" x2="${W}" y1="${entryY.toFixed(1)}" y2="${entryY.toFixed(1)}" stroke="#0a84ff" stroke-opacity="0.5" stroke-dasharray="4 6"/>` : ""}
      <path d="${line}" fill="none" stroke="${col}" stroke-width="2" vector-effect="non-scaling-stroke"/>
      ${markSvg}
      <text x="2" y="${H - 6}" fill="rgba(235,235,245,0.5)" font-size="11">${tl(t0)}</text>
      <text x="${W - 2}" y="${H - 6}" fill="rgba(235,235,245,0.5)" font-size="11" text-anchor="end">${tl(t1)}</text>
      <text x="${W - 2}" y="12" fill="rgba(235,235,245,0.5)" font-size="11" text-anchor="end">${fmtMc(hi)}</text>
    </svg>`;
  }

  function renderToken(data) {
    const p = allPositions(data).find((x) => x.id === state.token);
    const back = `<div class="tback"><button type="button" id="tok-back">‹ Back</button></div>`;
    if (!p) {
      views.token.innerHTML = `${back}<div class="empty">This position is not in the latest snapshot.</div>`;
    } else {
      const ch = p.change_pct;
      const cls = ch == null ? "sec" : ch >= 0 ? "up" : "dn";
      const since = p.open ? "since bought" : "final result";
      const legend = (p.markers || [])
        .map((m) => `<span class="lg"><i style="background:${MARK_COLORS[m.kind] || "#fff"}"></i>${escapeHtml(m.label)}${m.t ? ` · ${escapeHtml(clock(new Date(m.t * 1000).toISOString()))}` : ""}</span>`)
        .join("");
      const exits = (p.exits || []).length
        ? (p.exits || [])
            .map((e) => `<div class="prop"><span class="k">${escapeHtml(clock(e.at))} · ${escapeHtml(e.final ? "Exit" : "Partial")} · ${escapeHtml(e.reason_label)}</span>
              <span class="v ${e.pnl_sol >= 0 ? "up" : "dn"}">${e.pnl_sol >= 0 ? "+" : ""}${Number(e.pnl_sol).toFixed(4)} SOL${e.pnl_pct != null ? ` · ${fmtPct(e.pnl_pct)}` : ""}</span></div>`)
            .join("")
        : `<div class="sec" style="font-size:15px">No exits yet. The bot's own risk rules decide when to sell.</div>`;
      const scores = p.scores || {};
      const scoreRows = ["audit", "narrative", "timing", "metrics", "total"]
        .filter((k) => scores[k] != null)
        .map((k) => `<div class="prop"><span class="k">${k[0].toUpperCase() + k.slice(1)}</span><span class="v">${Number(scores[k]).toFixed(3)}</span></div>`)
        .join("");
      const icon = p.icon ? `<img class="ticon" src="${escapeHtml(p.icon)}" alt="" referrerpolicy="no-referrer">` : `<div class="ticon ph">${escapeHtml((p.symbol || "?").slice(0, 1))}</div>`;
      views.token.innerHTML = `${back}
        <div class="thead">${icon}<div><div class="tsym">${escapeHtml(p.symbol)}</div><div class="sec" style="font-size:15px">${escapeHtml(p.name || "")}</div></div>
          <span class="paper" style="margin-left:auto">DRY-RUN</span></div>
        <div class="tbig ${cls}">${ch == null ? "—" : fmtPct(ch)} <small class="sec">${since}</small></div>
        <div class="sol-line">MC ${escapeHtml(fmtMc(p.last_mc_usd))} · entry ${escapeHtml(fmtMc(p.entry_mc_usd))} · age ${escapeHtml(fmtAge(p.age_seconds))}</div>
        <div class="tchartwrap">${mcChartSvg(p)}</div>
        <div class="legend">${legend}</div>
        <div class="card"><h4>Position</h4>
          <div class="prop"><span class="k">Status</span><span class="v">${p.open ? "Open" : "Closed"}</span></div>
          <div class="prop"><span class="k">Bought</span><span class="v">${escapeHtml(clock(p.opened_at))} (Europe/Budapest)</span></div>
          <div class="prop"><span class="k">Size</span><span class="v">${escapeHtml(fmtSol(p.size_sol, 4))}${p.size_usd != null ? ` · ${escapeHtml(fmtUsd(p.size_usd))}` : ""}</span></div>
          <div class="prop"><span class="k">Entry MC</span><span class="v">${escapeHtml(fmtMc(p.entry_mc_usd))}</span></div>
          <div class="prop"><span class="k">Realized PnL</span><span class="v ${p.realized_sol >= 0 ? "up" : "dn"}">${p.realized_sol >= 0 ? "+" : ""}${Number(p.realized_sol || 0).toFixed(4)} SOL</span></div>
          <div class="prop"><span class="k">Score</span><span class="v">${p.score != null ? Number(p.score).toFixed(3) : "—"}</span></div>
        </div>
        <div class="card"><h4>Exits</h4>${exits}</div>
        ${scoreRows ? `<div class="card"><h4>Agent scores</h4>${scoreRows}</div>` : ""}
        ${p.checker || p.narrative ? `<div class="card"><h4>Why it was bought</h4><p class="sec" style="margin:0;font-size:15px;line-height:1.45">${escapeHtml(p.narrative || "")} ${escapeHtml(p.checker || "")}</p></div>` : ""}
        <div class="card"><a href="${escapeHtml(p.url || "#")}" target="_blank" rel="noopener" style="color:var(--blue)">Open on pump.fun ›</a></div>`;
    }
    $("#tok-back").addEventListener("click", () => closeToken());
  }

  function openToken(id) {
    state.prevTab = state.tab === "token" ? state.prevTab : state.tab;
    state.token = id;
    if (location.hash !== `#token=${encodeURIComponent(id)}`) history.pushState(null, "", `#token=${encodeURIComponent(id)}`);
    setTab("token");
  }

  function closeToken() {
    state.token = null;
    if (location.hash.startsWith("#token=")) history.pushState(null, "", location.pathname + location.search);
    setTab(state.prevTab || "home");
  }

  function renderHome(data) {
    const usd = fmtUsd(data.balance_usd);
    const big = usd || `${Number(data.balance_sol).toFixed(2)}`;
    const suffix = usd ? "" : " <span style=\"font-size:28px;letter-spacing:0\">SOL</span>";
    const priceBit = data.sol_usd != null ? ` · ${fmtUsd(data.sol_usd)} per SOL` : "";
    const solLine = usd
      ? `<div class="sol-line">${fmtSol(data.balance_sol, 4)}${priceBit} · simulated</div>`
      : `<div class="sol-line">simulated / dry-run${priceBit}</div>`;
    const up = data.pnl_today_sol >= 0;
    const todayCls = up ? "up" : "dn";
    let todayAmt = `${fmtPct(data.pnl_today_pct)} today`;
    if (data.balance_usd != null && data.pnl_today_usd != null) {
      const usd = fmtUsd(Math.abs(data.pnl_today_usd));
      todayAmt += ` · ${up ? "+" : "-"}${usd}`;
    }
    const ranges = RANGES.map((r) => `<button type="button" data-range="${r}" class="${state.range === r ? "on" : ""}">${r}</button>`).join("");
    const series = (data.chart || {})[state.range] || { points: [] };
    const emptyChart = data.has_trades ? "" : `<div class="emp">Waiting for the first trade</div>`;
    const agents = (data.agents || []).map((a) => agentCard(a, true)).join("");
    const homeItems = (data.home_activity || []).filter((i) => matchesQuery(`${i.title} ${i.symbol} ${i.reason_label}`));
    const activity = homeItems.length
      ? `<div class="list">${homeItems.map(activityRow).join("")}</div>`
      : `<div class="list"><div class="empty">No decisions past the monitor yet</div></div>`;

    views.home.innerHTML = `
      <div class="bal">
        <div class="big">${big}${suffix}</div>
        <span class="paper">DRY-RUN</span>
      </div>
      ${solLine}
      <div class="today">
        <span class="${todayCls}">${escapeHtml(todayAmt)}</span>
        <span class="mult ${data.multiplier < 1 ? "dn" : ""}">${Number(data.multiplier).toFixed(2)}×</span>
      </div>
      <div class="chartwrap">
        <canvas id="pnl-chart"></canvas>
        ${emptyChart}
      </div>
      <div class="ranges">${ranges}</div>
      <div class="sech">Agents · ${data.agents_running} running</div>
      <div class="car">${agents}</div>
      <div class="sech">Positions</div>
      ${positionsBlock(data)}
      <div class="sech">Activity <button type="button" data-go="activity">See all</button></div>
      ${activity}
    `;
    const canvas = $("#pnl-chart");
    drawChart(canvas, series, Boolean(data.has_trades));
    views.home.querySelectorAll("[data-range]").forEach((btn) => {
      btn.addEventListener("click", () => {
        state.range = btn.getAttribute("data-range");
        render();
      });
    });
    views.home.querySelectorAll("[data-go]").forEach((btn) => {
      btn.addEventListener("click", () => setTab(btn.getAttribute("data-go")));
    });
  }

  function positionsBlock(data) {
    const open = data.open_positions || [];
    const closed = (data.closed_positions || []).slice(0, 3);
    if (!open.length && !closed.length) {
      return `<div class="list"><div class="empty">No simulated positions yet. The bot buys only when a token scores at least 0.65 and passes the checker and risk gate; tap a trade here once it does.</div></div>`;
    }
    return `<div class="list">${open.concat(closed).map(positionCard).join("")}</div>`;
  }

  function renderAgents(data) {
    const q = state.query.trim().toLowerCase();
    const list = (data.agents || []).filter((a) => {
      if (!q) return true;
      const blob = [a.name, a.sub, a.headline, ...(a.items || []).map((i) => `${i.symbol} ${i.detail}`)].join(" ");
      return blob.toLowerCase().includes(q);
    });
    views.agents.innerHTML = `
      <div class="sech" style="padding-top:8px">Agents · ${data.agents_running} running</div>
      <p class="note">These cards are a live view of the dry-run pipeline. There are no pause or settings controls here.</p>
      ${list.map((a) => agentCard(a, false)).join("") || `<div class="empty">No agents match</div>`}
    `;
  }

  function renderActivity(data) {
    const filters = [
      ["notable", "Decisions"],
      ["all", "All"],
      ["skipped", "Skips"],
      ["trades", "Trades"],
    ];
    const chips = filters
      .map(([id, label]) => `<button type="button" data-filter="${id}" class="${state.activityFilter === id ? "on" : ""}">${label}</button>`)
      .join("");
    let items = data.activity || [];
    if (state.activityFilter === "notable") {
      items = items.filter((i) => i.kind === "bought" || i.kind === "sold" || i.kind === "stopped" || i.kind === "intent" || (i.stage && i.stage !== "monitor"));
    } else if (state.activityFilter === "skipped") {
      items = items.filter((i) => i.kind === "skipped");
    } else if (state.activityFilter === "trades") {
      items = items.filter((i) => i.kind === "bought" || i.kind === "sold" || i.kind === "stopped");
    }
    items = items.filter((i) => matchesQuery(`${i.title} ${i.symbol} ${i.reason_label} ${i.detail || ""}`));
    const body = items.length
      ? `<div class="list">${items.slice(0, 150).map(activityRow).join("")}</div>`
      : `<div class="list"><div class="empty">${state.activityFilter === "trades" ? "No simulated trades yet" : "Nothing matches"}</div></div>`;
    views.activity.innerHTML = `
      <div class="sech" style="padding-top:8px">Activity</div>
      <div class="filters">${chips}</div>
      ${body}
    `;
    views.activity.querySelectorAll("[data-filter]").forEach((btn) => {
      btn.addEventListener("click", () => {
        state.activityFilter = btn.getAttribute("data-filter");
        render();
      });
    });
  }

  function renderAccount(data) {
    const status = data.bot_running ? "Running" : "Not running";
    const statusCls = data.bot_running ? "up" : "dn";
    const rows = [
      ["Mode", "simulated / dry-run"],
      ["Bot", status],
      ["Starting balance", fmtSol(data.starting_balance_sol, 2)],
      ["Current balance", fmtSol(data.balance_sol, 4)],
      ["Balance in USD", fmtUsd(data.balance_usd) || "Price unavailable"],
      ["Realized PnL", `${data.realized_sol >= 0 ? "+" : ""}${fmtSol(data.realized_sol, 4)}`],
      ["Open positions", String((data.open_positions || []).length)],
      ["Simulated buys", String(data.kpis.buys)],
      ["Tokens watched", String(data.kpis.tokens_watched)],
      ["Grok calls (log)", String(data.grok_calls_today)],
      ["Updated", data.generated_at ? clock(data.generated_at) + " (Europe/Budapest)" : "—"],
    ];
    views.account.innerHTML = `
      <div class="sech" style="padding-top:8px">Account</div>
      <div class="card">
        <h4>Simulated wallet</h4>
        ${rows
          .map(([k, v]) => `<div class="prop"><span class="k">${escapeHtml(k)}</span><span class="v ${k === "Bot" ? statusCls : ""}">${escapeHtml(v)}</span></div>`)
          .join("")}
      </div>
      <div class="card">
        <h4>About this view</h4>
        <p class="sec" style="margin:0;font-size:15px;line-height:1.45">
          This is a read-only dashboard for the dry-run bot. It does not send transactions,
          hold a wallet key, or change the pipeline. The starting balance of
          ${escapeHtml(fmtSol(data.starting_balance_sol, 2))} is simulated.
          This page is a public dry-run snapshot. Leave it open and it will refresh about once a minute; the file behind it is republished from the bot every few minutes.
        </p>
      </div>
    `;
  }

  function render() {
    const data = state.data;
    if (!data) return;
    $("#offline").classList.toggle("on", state.error);
    $("#bell-dot").classList.toggle("hidden", !(data.home_activity || []).length);
    if (state.tab === "home") renderHome(data);
    if (state.tab === "agents") renderAgents(data);
    if (state.tab === "activity") renderActivity(data);
    if (state.tab === "account") renderAccount(data);
    if (state.tab === "token") renderToken(data);
    $("#demo-banner").classList.toggle("hidden", !data.demo);
  }

  function setTab(tab) {
    if (tab !== "token") state.token = null;
    state.tab = tab;
    Object.entries(views).forEach(([name, el]) => el.classList.toggle("on", name === tab));
    document.querySelectorAll("#tabs button").forEach((btn) => {
      btn.classList.toggle("on", btn.getAttribute("data-tab") === tab);
    });
    render();
    window.scrollTo(0, 0);
  }

  async function refresh() {
    try {
      const res = await fetch(dataUrl(), { cache: "no-store" });
      if (!res.ok) throw new Error(String(res.status));
      state.data = await res.json();
      state.error = false;
      render();
    } catch (err) {
      state.error = true;
      $("#offline").classList.add("on");
    }
  }

  document.querySelectorAll("#tabs button").forEach((btn) => {
    btn.addEventListener("click", () => setTab(btn.getAttribute("data-tab")));
  });
  $("#avatar").addEventListener("click", () => setTab("account"));
  $("#btn-search").addEventListener("click", () => {
    const bar = $("#searchbar");
    bar.classList.toggle("on");
    if (bar.classList.contains("on")) $("#q").focus();
  });
  $("#btn-bell").addEventListener("click", () => {
    state.activityFilter = "notable";
    setTab("activity");
  });
  $("#q").addEventListener("input", (ev) => {
    state.query = ev.target.value;
    render();
  });

  document.addEventListener("click", (ev) => {
    const el = ev.target.closest("[data-pos]");
    if (el) {
      ev.preventDefault();
      openToken(el.getAttribute("data-pos"));
    }
  });
  function routeFromHash() {
    const m = location.hash.match(/^#token=(.+)$/);
    if (m) {
      state.prevTab = state.prevTab || "home";
      state.token = decodeURIComponent(m[1]);
      state.tab = "token";
      Object.entries(views).forEach(([name, el]) => el.classList.toggle("on", name === "token"));
      render();
    } else if (state.tab === "token") {
      closeToken();
    }
  }
  window.addEventListener("popstate", routeFromHash);
  routeFromHash();

  refresh();
  setInterval(refresh, REFRESH_MS);
})();
