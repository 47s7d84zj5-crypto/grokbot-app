(() => {
  const REFRESH_MS = 45000;
  const RANGES = ["LIVE", "1H", "4H", "1D", "1W", "ALL"];

  const state = { data: null, tab: "home", range: "LIVE", query: "", activityFilter: "notable", error: false, token: null, prevTab: "home", shownBalance: null };
  const $ = (sel) => document.querySelector(sel);
  const views = { home: $("#view-home"), agents: $("#view-agents"), activity: $("#view-activity"), account: $("#view-account"), token: $("#view-token") };

  // ---- icons (Lucide-style, inline, stroke = currentColor) ---------------
  const P = {
    bot: '<rect x="4" y="8" width="16" height="12" rx="3"/><path d="M12 8V4"/><circle cx="12" cy="3" r="1"/><path d="M9 13v1M15 13v1M2 14h2M20 14h2"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
    bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>',
    home: '<path d="m3 10 9-7 9 7v10a2 2 0 0 1-2 2h-4v-7H9v7H5a2 2 0 0 1-2-2z"/>',
    cpu: '<rect x="5" y="5" width="14" height="14" rx="2"/><rect x="9" y="9" width="6" height="6" rx="1"/><path d="M9 2v3M15 2v3M9 19v3M15 19v3M2 9h3M2 15h3M19 9h3M19 15h3"/>',
    activity: '<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/>',
    radar: '<path d="M19.07 4.93A10 10 0 1 0 22 12"/><path d="M16.24 7.76A6 6 0 1 0 18 12"/><circle cx="12" cy="12" r="2"/><path d="m13.4 10.6 6-6"/>',
    flask: '<path d="M9 3h6M10 3v6L4.5 18.5A2 2 0 0 0 6.2 21h11.6a2 2 0 0 0 1.7-2.5L14 9V3"/><path d="M7 15h10"/>',
    shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/>',
    brain: '<path d="M9.5 2A2.5 2.5 0 0 0 7 4.5v.5a3 3 0 0 0-3 3 3 3 0 0 0 .5 5A3 3 0 0 0 7 19a2.5 2.5 0 0 0 5 .5V4.5A2.5 2.5 0 0 0 9.5 2z"/><path d="M14.5 2A2.5 2.5 0 0 1 17 4.5v.5a3 3 0 0 1 3 3 3 3 0 0 1-.5 5A3 3 0 0 1 17 19a2.5 2.5 0 0 1-5 .5"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    alert: '<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/>',
    gauge: '<path d="M12 14l4-4"/><path d="M3.3 19a10 10 0 1 1 17.4 0"/>',
    chart: '<path d="M3 3v18h18"/><path d="m7 15 4-4 3 3 6-7"/>',
    zap: '<path d="M13 2 3 14h9l-1 8 10-12h-9z"/>',
    arrowIn: '<path d="M17 7 7 17"/><path d="M17 17H7V7"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    octagon: '<path d="M7.9 2h8.2L22 7.9v8.2L16.1 22H7.9L2 16.1V7.9z"/><path d="M8 12h8"/>',
    x: '<path d="M18 6 6 18M6 6l12 12"/>',
    trend: '<path d="m22 7-8.5 8.5-5-5L2 17"/><path d="M16 7h6v6"/>',
    trendDown: '<path d="m22 17-8.5-8.5-5 5L2 7"/><path d="M16 17h6v-6"/>',
    chevL: '<path d="m15 18-6-6 6-6"/>',
    chevR: '<path d="m9 18 6-6-6-6"/>',
    share: '<path d="M4 12v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7"/><path d="m16 6-4-4-4 4M12 2v13"/>',
    wallet: '<path d="M19 7V5a2 2 0 0 0-2-2H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2"/><path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4"/>',
    eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    layers: '<path d="m12 2 10 5-10 5L2 7z"/><path d="m2 17 10 5 10-5M2 12l10 5 10-5"/>',
    target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
    coins: '<circle cx="8" cy="8" r="6"/><path d="M18.1 10.4A6 6 0 1 1 10.3 18"/><path d="M7 6h1v4"/>',
    link: '<path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/>',
    hourglass: '<path d="M5 22h14M5 2h14M17 22v-4.2a2 2 0 0 0-.6-1.4L12 12l-4.4 4.4a2 2 0 0 0-.6 1.4V22M7 2v4.2a2 2 0 0 0 .6 1.4L12 12l4.4-4.4a2 2 0 0 0 .6-1.4V2"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 16v-4M12 8h.01"/>',
  };
  const ico = (name) => `<svg class="i" viewBox="0 0 24 24" aria-hidden="true">${P[name] || P.info}</svg>`;
  const fillIcons = (root) => root.querySelectorAll("[data-ico]").forEach((el) => { if (!el.firstChild) el.innerHTML = ico(el.getAttribute("data-ico")); });

  const AGENT_STYLE = {
    scanner: ["radar", "#4fd8ff"], analyzer: ["flask", "#3d8bff"], auditor: ["shield", "#22e07a"],
    narrative: ["brain", "#a77bff"], timing: ["clock", "#ff9f0a"], checker: ["alert", "#ffd43b"],
    risk: ["gauge", "#ff4d5e"], executor: ["zap", "#22e07a"],
  };

  // ---- formatting ---------------------------------------------------------
  function dataUrl() {
    const path = location.pathname;
    let dir;
    if (path.endsWith("/")) dir = path;
    else if (path.endsWith(".html")) dir = path.replace(/[^/]+$/, "");
    else dir = path + "/";
    return `${dir}data.json?t=${Date.now()}`;
  }
  const fmtSol = (n, d = 4) => (n == null || Number.isNaN(Number(n)) ? "—" : `${Number(n).toFixed(d)} SOL`);
  function fmtUsd(n) {
    if (n == null || Number.isNaN(Number(n))) return null;
    const abs = Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return `${n < 0 ? "-" : ""}$${abs}`;
  }
  const fmtPct = (n) => `${n >= 0 ? "+" : ""}${Number(n).toFixed(2)}%`;
  function fmtMc(n) {
    const v = Number(n);
    if (n == null || !Number.isFinite(v) || v <= 0) return "—";
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
  function clock(iso) {
    if (!iso) return "";
    return new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Budapest", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(iso));
  }
  const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  function matchesQuery(text) {
    const q = state.query.trim().toLowerCase();
    return !q || String(text || "").toLowerCase().includes(q);
  }

  // ---- count-up -----------------------------------------------------------
  function countUp(el, to, fmt) {
    // First paint shows the real value; only later changes animate.
    const from = state.shownBalance == null ? to : state.shownBalance;
    state.shownBalance = to;
    if (from === to || matchMedia("(prefers-reduced-motion: reduce)").matches) { el.innerHTML = fmt(to); return; }
    const t0 = performance.now();
    const dur = 900;
    const step = (now) => {
      const k = Math.min(1, (now - t0) / dur);
      const e = 1 - Math.pow(1 - k, 3);
      el.innerHTML = fmt(from + (to - from) * e);
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  // ---- balance chart --------------------------------------------------------
  function drawChart(canvas, series, hasTrades) {
    if (!canvas) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = canvas.clientWidth || 390;
    const height = 210;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const points = (series && series.points) || [];
    const values = hasTrades && points.length >= 2 ? points.map((p) => p.v) : null;
    const padTop = 18;
    const padBot = 14;
    const grad = ctx.createLinearGradient(0, 0, 0, height);
    grad.addColorStop(0, "rgba(34,224,122,0.28)");
    grad.addColorStop(1, "rgba(34,224,122,0)");
    let xs; let ys;
    if (values) {
      const min = Math.min(...values); const max = Math.max(...values); const span = max - min || 1;
      const ts = points.map((p) => p.t); const t0 = Math.min(...ts); const tspan = Math.max(...ts) - t0 || 1;
      xs = points.map((p) => ((p.t - t0) / tspan) * width);
      ys = values.map((v) => padTop + (1 - (v - min) / span) * (height - padTop - padBot));
    } else {
      // flat baseline: honest "no trades yet"
      xs = [0, width]; ys = [height * 0.62, height * 0.62];
    }
    ctx.beginPath();
    xs.forEach((x, i) => (i ? ctx.lineTo(x, ys[i]) : ctx.moveTo(x, ys[i])));
    ctx.strokeStyle = "#22e07a"; ctx.lineWidth = 2.2; ctx.lineJoin = "round";
    ctx.shadowColor = "rgba(34,224,122,0.55)"; ctx.shadowBlur = 10;
    ctx.stroke(); ctx.shadowBlur = 0;
    ctx.lineTo(xs[xs.length - 1], height); ctx.lineTo(xs[0], height); ctx.closePath();
    ctx.fillStyle = grad; ctx.fill();
    const lx = xs[xs.length - 1]; const ly = ys[ys.length - 1];
    ctx.beginPath(); ctx.arc(Math.min(lx, width - 6), ly, 4.5, 0, Math.PI * 2); ctx.fillStyle = "#22e07a"; ctx.fill();
    ctx.beginPath(); ctx.arc(Math.min(lx, width - 6), ly, 9, 0, Math.PI * 2); ctx.fillStyle = "rgba(34,224,122,0.18)"; ctx.fill();
  }

  // ---- pieces ---------------------------------------------------------------
  function chipFor(item) {
    const tone = item.tone === "kill" ? "r" : item.tone === "ok" ? "g" : item.tone === "wait" ? "b" : "";
    return `<span class="chip ${tone}">${esc(item.detail || "")}</span>`;
  }

  function agentCard(agent, full) {
    const [icon, color] = AGENT_STYLE[agent.id] || ["bot", "#22e07a"];
    const gauge = agent.kind === "gauge" && agent.gauge != null
      ? `<div class="bar"><b style="width:${Math.round(Math.max(0, Math.min(1, agent.gauge)) * 100)}%"></b></div>` : "";
    const items = (agent.items || []).slice(0, full ? 6 : 4);
    const mini = items.length
      ? `<div class="mini">${items.map((i) => `<div class="mrow"><span class="s">${esc(i.symbol || "—")}</span>${chipFor(i)}</div>`).join("")}</div>`
      : `<div class="aempty">${ico("hourglass")}${esc(agent.empty || "Nothing yet")}</div>`;
    return `<article class="acard ${full ? "agent-full" : ""}" style="--acc:${color}">
      <div class="ahead"><div class="tile">${ico(icon)}</div>
        <div><div class="nm">${esc(agent.name)}</div><div class="st"><i class="${agent.running ? "" : "off"}"></i>${agent.running ? "running" : "idle"}${agent.maps_to && agent.maps_to !== agent.name ? ` · ${esc(agent.maps_to)}` : ""}</div></div></div>
      <div class="astat num">${esc(agent.headline || "—")}</div>
      <div class="asub">${esc(agent.sub || "")}</div>
      ${gauge}${mini}
    </article>`;
  }

  function rowIcon(item) {
    if (item.kind === "bought") return ["buy", "arrowIn"];
    if (item.kind === "sold") return (item.pnl_sol ?? 0) >= 0 ? ["win", "check"] : ["loss", "trendDown"];
    if (item.kind === "stopped") return ["stop", "octagon"];
    if (item.kind === "intent") return ["info", "clock"];
    if (item.stage === "scoring" || item.stage === "checker") return ["skip", "target"];
    if (item.stage === "analyzer") return ["skip", "flask"];
    return ["skip", "x"];
  }

  function activityRow(item) {
    const [cls, icon] = rowIcon(item);
    const when = clock(item.ts);
    let right = "";
    if (item.position_id) {
      const tone = item.amount_tone || "";
      const chip = item.note ? `<span class="chip ${tone === "up" ? "g" : tone === "dn" ? "r" : ""}">${esc(item.note)}</span>` : (item.score_total != null ? `<span class="chip y">${Number(item.score_total).toFixed(2)}</span>` : "");
      right = `<span class="amt ${esc(tone)}">${esc(item.amount_text || "")}</span>${chip}`;
    } else if (item.score_total != null) {
      const s = Number(item.score_total);
      right = `<span class="chip ${s >= 0.65 ? "g" : s >= 0.4 ? "y" : "r"}">${s.toFixed(2)}</span>`;
    }
    const sub = [item.subtitle, when].filter(Boolean).join(" • ");
    const inner = `<div class="av ${cls}">${ico(icon)}</div>
      <div class="l"><div class="t">${esc(item.title)}</div><div class="s">${esc(sub)}</div></div>
      <div class="r">${right}</div>`;
    if (item.position_id) return `<button type="button" class="li" data-pos="${esc(item.position_id)}">${inner}<span class="chev">${ico("chevR")}</span></button>`;
    if (item.url) return `<a class="li" href="${esc(item.url)}" target="_blank" rel="noopener">${inner}</a>`;
    return `<div class="li">${inner}</div>`;
  }

  const allPositions = (data) => [...(data.open_positions || []), ...(data.closed_positions || [])];

  function positionRow(p) {
    const ch = p.change_pct;
    const cls = ch == null ? "sec" : ch >= 0 ? "up" : "dn";
    const av = p.icon ? `<div class="av info"><img src="${esc(p.icon)}" alt="" referrerpolicy="no-referrer"></div>` : `<div class="av ${p.open ? "info" : "skip"}">${ico("coins")}</div>`;
    return `<button type="button" class="li" data-pos="${esc(p.id)}">${av}
      <div class="l"><div class="t">${esc(p.symbol)}<span class="pill ${p.open ? "on" : ""}">${p.open ? "open" : "closed"}</span></div>
        <div class="s">${esc(fmtSol(p.size_sol, 3))} • entry ${esc(fmtMc(p.entry_mc_usd))} • ${esc(clock(p.opened_at))}</div></div>
      <div class="r"><span class="amt ${cls}">${ch == null ? "—" : fmtPct(ch)}</span><span class="chip">${esc(fmtMc(p.last_mc_usd))}</span></div>
      <span class="chev">${ico("chevR")}</span></button>`;
  }

  function emptyBlock(icon, text) {
    return `<div class="list"><div class="empty">${ico(icon)}<div>${esc(text)}</div></div></div>`;
  }

  // ---- views ----------------------------------------------------------------
  function renderHome(data) {
    const usd = data.balance_usd;
    const fmtBig = (v) => {
      if (usd != null) {
        const [w, c] = Number(v).toFixed(2).split(".");
        return `$${Number(w).toLocaleString("en-US")}<span class="c">.${c}</span>`;
      }
      return `${Number(v).toFixed(3)}<span class="c"> SOL</span>`;
    };
    const up = (data.pnl_today_sol ?? 0) >= 0;
    const pnlUsd = data.pnl_today_usd != null ? `${up ? "+" : "-"}${fmtUsd(Math.abs(data.pnl_today_usd))}` : `${up ? "+" : ""}${Number(data.pnl_today_sol || 0).toFixed(4)} SOL`;
    const series = (data.chart || {})[state.range] || { points: [] };
    const ranges = RANGES.map((r) => `<button type="button" data-range="${r}" class="${state.range === r ? "on" : ""}">${r === "LIVE" ? '<i class="ld"></i>' : ""}${r}</button>`).join("");
    const homeItems = (data.home_activity || []).filter((i) => matchesQuery(`${i.title} ${i.symbol} ${i.reason_label}`));
    const open = data.open_positions || [];
    const closed = (data.closed_positions || []).slice(0, 3);
    const k = data.kpis || {};

    views.home.innerHTML = `
      <div class="hero">
        <div class="lbl">${ico("wallet")} Paper balance <span class="tag">dry-run</span></div>
        <div class="big num" id="bal"></div>
        <div class="pnl"><span class="${up ? "up" : "dn"}">${ico(up ? "trend" : "trendDown")}</span>
          <span class="${up ? "up" : "dn"} num">${esc(pnlUsd)} (${fmtPct(data.pnl_today_pct || 0)}) today</span>
          <span class="mult ${data.multiplier < 1 ? "dn" : ""} num">${Number(data.multiplier || 1).toFixed(2)}x</span></div>
        <div class="subline num">${esc(fmtSol(data.balance_sol, 4))}${data.sol_usd ? ` • ${esc(fmtUsd(data.sol_usd))}/SOL` : ""} • simulated, no real funds</div>
      </div>
      <div class="chartwrap"><canvas id="pnl-chart"></canvas>${data.has_trades ? "" : `<div class="emp">${ico("chart")}<span>Flat until the first simulated trade</span></div>`}</div>
      <div class="ranges">${ranges}</div>
      <div class="stats">
        <div class="stat"><div class="k">${ico("eye")} Scanned</div><div class="v num">${k.tokens_watched ?? 0}</div></div>
        <div class="stat"><div class="k">${ico("layers")} Checked</div><div class="v num">${k.passed_monitor ?? 0}</div></div>
        <div class="stat"><div class="k">${ico("zap")} Buys</div><div class="v num">${k.buys ?? 0}</div></div>
      </div>
      <div class="sech"><h3>Agents</h3><span class="aside"><i></i>${data.agents_running} running</span></div>
      <div class="car">${(data.agents || []).map((a) => agentCard(a, false)).join("")}</div>
      <div class="sech"><h3>Positions</h3><span class="aside">${open.length} open</span></div>
      ${open.length || closed.length ? `<div class="list">${open.concat(closed).map(positionRow).join("")}</div>` : emptyBlock("target", "No simulated positions yet. A token needs a score of 0.65+ and must pass the checker and risk gate before the bot buys.")}
      <div class="sech"><h3>Activity</h3><button type="button" data-go="activity">See all ${ico("chevR")}</button></div>
      ${homeItems.length ? `<div class="list">${homeItems.map(activityRow).join("")}</div>` : emptyBlock("activity", "No decisions past the scanner yet")}
    `;
    countUp($("#bal"), usd != null ? usd : Number(data.balance_sol || 0), fmtBig);
    drawChart($("#pnl-chart"), series, Boolean(data.has_trades));
    views.home.querySelectorAll("[data-range]").forEach((b) => b.addEventListener("click", () => { state.range = b.getAttribute("data-range"); render(); }));
    views.home.querySelectorAll("[data-go]").forEach((b) => b.addEventListener("click", () => setTab(b.getAttribute("data-go"))));
  }

  function renderAgents(data) {
    const q = state.query.trim().toLowerCase();
    const list = (data.agents || []).filter((a) => !q || [a.name, a.sub, a.headline, ...(a.items || []).map((i) => `${i.symbol} ${i.detail}`)].join(" ").toLowerCase().includes(q));
    views.agents.innerHTML = `<div class="ptitle">Agents</div>
      <p class="note">Live view of the dry-run pipeline: scanner → analyzer → Grok agents → checker → risk → executor. Read-only.</p>
      ${list.map((a) => agentCard(a, true)).join("") || emptyBlock("search", "No agents match")}`;
  }

  function renderActivity(data) {
    const filters = [["notable", "Decisions", "target"], ["trades", "Trades", "coins"], ["skipped", "Skips", "x"], ["all", "All", "layers"]];
    let items = data.activity || [];
    if (state.activityFilter === "notable") items = items.filter((i) => ["bought", "sold", "stopped", "intent"].includes(i.kind) || (i.stage && i.stage !== "monitor"));
    else if (state.activityFilter === "skipped") items = items.filter((i) => i.kind === "skipped");
    else if (state.activityFilter === "trades") items = items.filter((i) => ["bought", "sold", "stopped"].includes(i.kind));
    items = items.filter((i) => matchesQuery(`${i.title} ${i.symbol} ${i.reason_label} ${i.detail || ""}`));
    views.activity.innerHTML = `<div class="ptitle">Activity</div>
      <div class="filters">${filters.map(([id, label, ic]) => `<button type="button" data-filter="${id}" class="${state.activityFilter === id ? "on" : ""}">${ico(ic)}${label}</button>`).join("")}</div>
      ${items.length ? `<div class="list">${items.slice(0, 150).map(activityRow).join("")}</div>` : emptyBlock("hourglass", state.activityFilter === "trades" ? "No simulated trades yet" : "Nothing matches")}`;
    views.activity.querySelectorAll("[data-filter]").forEach((b) => b.addEventListener("click", () => { state.activityFilter = b.getAttribute("data-filter"); render(); }));
  }

  function renderAccount(data) {
    const rows = [
      ["shield", "Mode", "Simulated / dry-run"],
      ["activity", "Bot", data.bot_running ? "Running" : "Not running"],
      ["wallet", "Starting balance", fmtSol(data.starting_balance_sol, 2)],
      ["coins", "Current balance", fmtSol(data.balance_sol, 4)],
      ["chart", "Balance in USD", fmtUsd(data.balance_usd) || "Price unavailable"],
      ["trend", "Realized PnL", `${data.realized_sol >= 0 ? "+" : ""}${fmtSol(data.realized_sol, 4)}`],
      ["target", "Open positions", String((data.open_positions || []).length)],
      ["zap", "Simulated buys", String((data.kpis || {}).buys ?? 0)],
      ["eye", "Tokens watched", String((data.kpis || {}).tokens_watched ?? 0)],
      ["cpu", "Grok calls (log)", String(data.grok_calls_today ?? 0)],
      ["clock", "Updated", data.generated_at ? `${clock(data.generated_at)} (Europe/Budapest)` : "—"],
    ];
    views.account.innerHTML = `<div class="ptitle">Account</div>
      <div class="card"><h4>${ico("wallet")} Simulated wallet</h4>
        ${rows.map(([i, k, v]) => `<div class="prop"><span class="k">${ico(i)}${esc(k)}</span><span class="v ${k === "Bot" ? (data.bot_running ? "up" : "dn") : ""}">${esc(v)}</span></div>`).join("")}</div>
      <div class="card"><h4>${ico("info")} About</h4><p class="sec" style="margin:0;font-size:14px;line-height:1.5">
        A read-only, public dry-run snapshot. It sends no transactions and holds no wallet key. The ${esc(fmtSol(data.starting_balance_sol, 2))} starting balance is simulated. The page refreshes about once a minute; the bot republishes the data every few minutes.</p></div>`;
  }

  // ---- token page -----------------------------------------------------------
  const MARK = { entry: ["#3d8bff", "arrowIn"], partial: ["#ffd43b", "coins"], trail: ["#ff9f0a", "trendDown"], stop: ["#ff4d5e", "octagon"], exit: ["#22e07a", "check"] };

  function mcChartSvg(p) {
    const pts = (p.mc_history || []).filter((x) => x && x[1] > 0);
    const W = 340; const H = 190; const padT = 16; const padB = 22;
    if (pts.length < 2) {
      return `<div class="tchart empty-chart">${ico("hourglass")}<div>${p.open ? "Collecting market cap samples… the chart fills in as the tracker polls (about every 20 s)." : "No market cap samples were recorded for this position."}</div></div>`;
    }
    const marks = (p.markers || []).filter((m) => m.t);
    const ts = pts.map((x) => x[0]).concat(marks.map((m) => m.t));
    const t0 = Math.min(...ts); const t1 = Math.max(...ts);
    const vals = pts.map((x) => x[1]).concat(marks.map((m) => m.mc_usd).filter((v) => v > 0));
    let lo = Math.min(...vals); let hi = Math.max(...vals);
    const pad = (hi - lo) * 0.08 || hi * 0.05 || 1; lo -= pad; hi += pad;
    const x = (t) => ((t - t0) / (t1 - t0 || 1)) * W;
    const y = (v) => padT + (1 - (v - lo) / (hi - lo || 1)) * (H - padT - padB);
    const line = pts.map((q, i) => `${i ? "L" : "M"}${x(q[0]).toFixed(1)},${y(q[1]).toFixed(1)}`).join("");
    const last = pts[pts.length - 1];
    const col = last[1] >= (p.entry_mc_usd || pts[0][1]) ? "#22e07a" : "#ff4d5e";
    const area = `${line}L${x(last[0]).toFixed(1)},${H - padB}L${x(pts[0][0]).toFixed(1)},${H - padB}Z`;
    const nearest = (t) => pts.reduce((b, q) => (Math.abs(q[0] - t) < Math.abs(b[0] - t) ? q : b), pts[0])[1];
    const entryY = p.entry_mc_usd ? y(p.entry_mc_usd) : null;
    const markSvg = marks.map((m) => {
      const mx = Math.max(6, Math.min(W - 6, x(m.t))); const my = y(m.mc_usd > 0 ? m.mc_usd : nearest(m.t)); const c = (MARK[m.kind] || ["#fff"])[0];
      return `<line x1="${mx.toFixed(1)}" x2="${mx.toFixed(1)}" y1="${padT}" y2="${H - padB}" stroke="${c}" stroke-opacity=".35" stroke-dasharray="3 4"/>
        <circle cx="${mx.toFixed(1)}" cy="${my.toFixed(1)}" r="9" fill="${c}" fill-opacity=".2"/><circle cx="${mx.toFixed(1)}" cy="${my.toFixed(1)}" r="4.5" fill="${c}" stroke="#050506" stroke-width="2"/>`;
    }).join("");
    const tl = (t) => new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Budapest", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(t * 1000));
    return `<svg class="tchart" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="Market cap since entry">
      <defs><linearGradient id="tg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${col}" stop-opacity=".3"/><stop offset="1" stop-color="${col}" stop-opacity="0"/></linearGradient></defs>
      <path d="${area}" fill="url(#tg)"/>
      ${entryY != null ? `<line x1="0" x2="${W}" y1="${entryY.toFixed(1)}" y2="${entryY.toFixed(1)}" stroke="#3d8bff" stroke-opacity=".55" stroke-dasharray="4 6"/>` : ""}
      <path d="${line}" fill="none" stroke="${col}" stroke-width="2.2" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>
      ${markSvg}
      <text x="2" y="${H - 5}" fill="rgba(235,235,245,.45)" font-size="11">${tl(t0)}</text>
      <text x="${W - 2}" y="${H - 5}" fill="rgba(235,235,245,.45)" font-size="11" text-anchor="end">${tl(t1)}</text>
      <text x="${W - 2}" y="11" fill="rgba(235,235,245,.45)" font-size="11" text-anchor="end">${fmtMc(hi)}</text>
    </svg>`;
  }

  function exitIcon(e) {
    const base = String(e.reason || "").split(" (")[0];
    if (!e.final) return MARK.partial;
    if (base === "trailing_stop") return MARK.trail;
    if (["stop_loss", "rug", "max_hold"].includes(base) || (e.pnl_sol ?? 0) < 0) return MARK.stop;
    return MARK.exit;
  }

  function renderToken(data) {
    const p = allPositions(data).find((x) => x.id === state.token);
    const backLabel = { home: "Home", activity: "Activity", agents: "Agents", account: "Account" }[state.prevTab] || "Home";
    const bar = `<div class="tbar"><button type="button" id="tok-back">${ico("chevL")}${backLabel}</button>${p ? `<button type="button" id="tok-share">${ico("share")}Share</button>` : ""}</div>`;
    if (!p) {
      views.token.innerHTML = `${bar}<div style="padding-top:16px">${emptyBlock("search", "This position is not in the latest snapshot.")}</div>`;
    } else {
      const ch = p.change_pct;
      const cls = ch == null ? "sec" : ch >= 0 ? "up" : "dn";
      const legend = (p.markers || []).map((m) => `<span class="lg"><i style="background:${(MARK[m.kind] || ["#fff"])[0]}"></i>${esc(m.label)}${m.t ? ` · ${esc(clock(new Date(m.t * 1000).toISOString()))}` : ""}</span>`).join("");
      const tile = (c, i) => `<span class="rowic" style="color:${c};background:${c}22">${ico(i)}</span>`;
      const exits = [`<div class="prop"><span class="k">${tile(MARK.entry[0], MARK.entry[1])}Bought · ${esc(clock(p.opened_at))}</span><span class="v">${esc(fmtSol(p.size_sol, 4))}</span></div>`]
        .concat((p.exits || []).map((e) => {
          const [c, i] = exitIcon(e);
          return `<div class="prop"><span class="k">${tile(c, i)}${esc(e.final ? "Exit" : `Sold ${Math.round((e.fraction || 0) * 100)}%`)} · ${esc(e.reason_label)} · ${esc(clock(e.at))}</span>
            <span class="v ${e.pnl_sol >= 0 ? "up" : "dn"}">${e.pnl_sol >= 0 ? "+" : ""}${Number(e.pnl_sol).toFixed(4)} SOL</span></div>`;
        })).join("");
      const scores = p.scores || {};
      const SC = { audit: ["shield", "#22e07a"], narrative: ["brain", "#a77bff"], timing: ["clock", "#ff9f0a"], metrics: ["flask", "#3d8bff"], total: ["target", "#ffd43b"] };
      const scoreRows = Object.keys(SC).filter((k) => scores[k] != null)
        .map((k) => `<div class="prop"><span class="k">${tile(SC[k][1], SC[k][0])}${k[0].toUpperCase() + k.slice(1)}</span><span class="v num">${Number(scores[k]).toFixed(3)}</span></div>`).join("");
      const icon = p.icon ? `<img class="ticon" src="${esc(p.icon)}" alt="" referrerpolicy="no-referrer">` : `<div class="ticon">${esc((p.symbol || "?").slice(0, 1))}</div>`;
      views.token.innerHTML = `${bar}
        <div class="thead">${icon}<div style="flex:1;min-width:0"><div class="tsym">${esc(p.symbol)}</div><div class="tname">${esc(p.name || "")}</div></div><span class="tag">dry-run</span></div>
        <div class="tbig ${cls} num">${ch == null ? "—" : fmtPct(ch)}<small>${p.open ? "since bought" : "final result"}</small></div>
        <div class="tmeta"><span>${ico("chart")}MC ${esc(fmtMc(p.last_mc_usd))}</span><span>${ico("arrowIn")}entry ${esc(fmtMc(p.entry_mc_usd))}</span><span>${ico("clock")}age ${esc(fmtAge(p.age_seconds))}</span><span>${ico(p.open ? "activity" : "check")}${p.open ? "open" : "closed"}</span></div>
        <div class="tchartwrap">${mcChartSvg(p)}</div>
        <div class="legend">${legend}</div>
        <div class="card"><h4>${ico("layers")} Trades</h4>${exits}</div>
        <div class="card"><h4>${ico("wallet")} Position</h4>
          <div class="prop"><span class="k">${ico("coins")}Size</span><span class="v num">${esc(fmtSol(p.size_sol, 4))}${p.size_usd != null ? ` · ${esc(fmtUsd(p.size_usd))}` : ""}</span></div>
          <div class="prop"><span class="k">${ico("trend")}Realized PnL</span><span class="v num ${p.realized_sol >= 0 ? "up" : "dn"}">${p.realized_sol >= 0 ? "+" : ""}${Number(p.realized_sol || 0).toFixed(4)} SOL</span></div>
          <div class="prop"><span class="k">${ico("target")}Score</span><span class="v num">${p.score != null ? Number(p.score).toFixed(3) : "—"}</span></div></div>
        ${scoreRows ? `<div class="card"><h4>${ico("cpu")} Agent scores</h4>${scoreRows}</div>` : ""}
        ${p.checker || p.narrative ? `<div class="card"><h4>${ico("brain")} Why it was bought</h4><p class="sec" style="margin:0;font-size:14px;line-height:1.5">${esc(p.narrative || "")} ${esc(p.checker || "")}</p></div>` : ""}
        ${p.url && p.url !== "#" ? `<div class="card"><a href="${esc(p.url)}" target="_blank" rel="noopener" class="prop" style="border:0;padding:2px 0"><span class="k">${ico("link")}Open on pump.fun</span><span class="v sec">${ico("chevR")}</span></a></div>` : ""}`;
      $("#tok-share").addEventListener("click", async () => {
        const url = location.href;
        const text = `${p.symbol} ${ch == null ? "" : fmtPct(ch)} (dry-run)`;
        try {
          if (navigator.share) await navigator.share({ title: `${p.symbol} · Grok Desk`, text, url });
          else { await navigator.clipboard.writeText(url); toast("Link copied"); }
        } catch (_) { /* dismissed */ }
      });
    }
    $("#tok-back").addEventListener("click", closeToken);
  }

  function toast(msg) {
    const el = document.createElement("div");
    el.className = "toast"; el.textContent = msg; document.body.appendChild(el);
    setTimeout(() => el.remove(), 1600);
  }

  function openToken(id) {
    if (state.tab !== "token") state.prevTab = state.tab;
    state.token = id;
    const h = `#token=${encodeURIComponent(id)}`;
    if (location.hash !== h) history.pushState(null, "", h);
    setTab("token");
  }
  function closeToken() {
    state.token = null;
    if (location.hash.startsWith("#token=")) history.pushState(null, "", location.pathname + location.search);
    setTab(state.prevTab || "home");
  }

  // ---- shell ----------------------------------------------------------------
  function render() {
    const data = state.data;
    if (!data) return;
    $("#offline").classList.toggle("on", state.error);
    $("#demo-banner").classList.toggle("hidden", !data.demo);
    const open = (data.open_positions || []).length;
    $("#nav-sub").textContent = `dry-run via grokbot • ${open} open`;
    const pill = $("#live-pill");
    pill.classList.toggle("off", !data.bot_running);
    pill.querySelector("b").textContent = data.bot_running ? "Live" : "Offline";
    const fn = { home: renderHome, agents: renderAgents, activity: renderActivity, account: renderAccount, token: renderToken }[state.tab];
    if (fn) fn(data);
  }
  function setTab(tab) {
    if (tab !== "token") state.token = null;
    state.tab = tab;
    Object.entries(views).forEach(([name, el]) => el.classList.toggle("on", name === tab));
    document.querySelectorAll("#tabs button").forEach((b) => b.classList.toggle("on", b.getAttribute("data-tab") === tab));
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

  fillIcons(document);
  document.querySelectorAll("#tabs button").forEach((b) => b.addEventListener("click", () => setTab(b.getAttribute("data-tab"))));
  $("#avatar").addEventListener("click", () => setTab("account"));
  $("#btn-search").addEventListener("click", () => { const bar = $("#searchbar"); bar.classList.toggle("on"); if (bar.classList.contains("on")) $("#q").focus(); });
  $("#q").addEventListener("input", (ev) => { state.query = ev.target.value; render(); });
  document.addEventListener("click", (ev) => {
    const el = ev.target.closest("[data-pos]");
    if (el) { ev.preventDefault(); openToken(el.getAttribute("data-pos")); }
  });
  function routeFromHash() {
    const m = location.hash.match(/^#token=(.+)$/);
    if (m) {
      state.token = decodeURIComponent(m[1]);
      state.tab = "token";
      Object.entries(views).forEach(([name, el]) => el.classList.toggle("on", name === "token"));
      document.querySelectorAll("#tabs button").forEach((b) => b.classList.remove("on"));
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
