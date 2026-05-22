import { Header } from "@/components/Header"

// ─── Navigation ───────────────────────────────────────────────────────────────

const NAV = [
  { id: "overview",          label: "Overview" },
  { id: "scoring",           label: "Scoring & Ranking" },
  { id: "deal-engine",       label: "Deal Engine" },
  { id: "financial-metrics", label: "Financial Metrics" },
  { id: "optimizer",         label: "Optimizer" },
  { id: "assumptions",       label: "Assumptions & Limitations" },
  { id: "future",            label: "Future Enhancements" },
]

// ─── Small layout primitives ──────────────────────────────────────────────────

function Section({
  id,
  title,
  children,
}: {
  id: string
  title: string
  children: React.ReactNode
}) {
  return (
    <section id={id} className="scroll-mt-24">
      <h2 className="text-base font-semibold text-zinc-100 mb-4 pb-2 border-b border-zinc-800">
        {title}
      </h2>
      <div className="space-y-4 text-sm text-zinc-400 leading-relaxed">
        {children}
      </div>
    </section>
  )
}

function SubSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="pt-2">
      <h3 className="text-sm font-medium text-zinc-300 mb-2">{title}</h3>
      <div className="space-y-3 text-sm text-zinc-400 leading-relaxed">{children}</div>
    </div>
  )
}

function Formula({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-md px-4 py-3 font-mono text-xs text-zinc-300 leading-relaxed overflow-x-auto">
      {children}
    </div>
  )
}

function Note({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-2.5 bg-zinc-900/60 border border-zinc-800 rounded-md px-4 py-3">
      <span className="text-zinc-600 shrink-0 mt-0.5">→</span>
      <p className="text-xs text-zinc-500 leading-relaxed">{children}</p>
    </div>
  )
}

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-block px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 font-mono text-[11px]">
      {children}
    </span>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function MethodologyPage() {
  return (
    <>
      <Header />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-10 pb-24">
        {/* Page title */}
        <div className="mb-10">
          <h1 className="text-2xl font-bold text-zinc-100 mb-1">Methodology</h1>
          <p className="text-sm text-zinc-500">
            How artists are scored, how deals are modeled, and what assumptions underpin the numbers.
          </p>
        </div>

        <div className="flex gap-12 items-start">

          {/* ── Sticky sidebar ── */}
          <aside className="hidden lg:block w-44 shrink-0">
            <nav className="sticky top-24 space-y-0.5">
              <p className="text-[10px] font-semibold text-zinc-600 uppercase tracking-wider mb-3">
                Contents
              </p>
              {NAV.map((s) => (
                <a
                  key={s.id}
                  href={`#${s.id}`}
                  className="block text-xs text-zinc-500 hover:text-zinc-200 py-1.5 transition-colors border-l border-transparent hover:border-zinc-600 pl-3 -ml-3"
                >
                  {s.label}
                </a>
              ))}
            </nav>
          </aside>

          {/* ── Content ── */}
          <div className="flex-1 min-w-0 space-y-14">

            {/* ── 1. Overview ── */}
            <Section id="overview" title="Overview">
              <p>
                APG Deal Studio is a master-rights deal modeling tool. It answers a single question:
                given an artist's streaming history, what deal structure maximises the label's
                risk-adjusted return — and is that return worth pursuing?
              </p>
              <p>
                The tool has three layers. First, every artist on the roster is scored across six
                financial-quality dimensions and ranked by composite score. Second, the top-ranked
                artist is passed through a deal optimizer that finds the contract structure with the
                highest projected NPV. Third, any artist can be opened for a full deal simulation
                where every lever is configurable and projections update in real time.
              </p>
              <p>
                All projections are built from each artist's actual streaming history — no market
                comparables, no analyst estimates. The model is deliberately transparent: every
                number shown in the UI traces directly to a formula in this document.
              </p>
            </Section>

            {/* ── 2. Scoring & Ranking ── */}
            <Section id="scoring" title="Scoring & Ranking">
              <p>
                Each artist receives scores across six dimensions. Five are percentile-ranked
                across the full 100-artist roster, meaning a score of 70 means the artist ranks
                in the 70th percentile for that dimension — not that they achieved 70% of some
                absolute benchmark. Market quality is the exception: it uses an absolute country
                tier and is not relative to the roster.
              </p>

              <SubSection title="Composite Score">
                <p>
                  The composite score is a weighted sum of the six dimension scores. Weights
                  reflect the relative importance of each dimension to label cash flow:
                </p>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-zinc-800">
                        <th className="text-left text-zinc-500 font-medium py-2 pr-4">Dimension</th>
                        <th className="text-right text-zinc-500 font-medium py-2 pr-4">Weight</th>
                        <th className="text-left text-zinc-500 font-medium py-2">Rationale</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/60">
                      {[
                        ["Catalog Trajectory",      "25%", "Growing catalog = growing label income with no new investment"],
                        ["Catalog Stability",       "20%", "Predictable cash flows reduce projection risk"],
                        ["Audience Health",         "20%", "Fan base size and trajectory drives long-run stream floor"],
                        ["New Release Performance", "15%", "New-release spike potential affects deal upside"],
                        ["Career Runway",           "10%", "Earlier-career artists have more compounding upside"],
                        ["Market Quality",          "10%", "Listener geography determines royalty yield per stream"],
                      ].map(([dim, weight, note]) => (
                        <tr key={dim}>
                          <td className="py-2 pr-4 text-zinc-300">{dim}</td>
                          <td className="py-2 pr-4 text-right text-zinc-300 font-mono">{weight}</td>
                          <td className="py-2 text-zinc-500">{note}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <Formula>
                  composite = 0.25 × trajectory + 0.20 × stability + 0.20 × audience_health{"\n"}
                  {"           "}+ 0.15 × new_release_perf + 0.10 × career_runway + 0.10 × market_quality
                </Formula>
                <p>
                  Score labels map numeric scores to plain-English tiers:{" "}
                  <Pill>Strong</Pill> ≥ 80 · <Pill>Moderate</Pill> ≥ 60 · <Pill>Developing</Pill> ≥ 40 · <Pill>Weak</Pill> &lt; 40.
                </p>
              </SubSection>

              <SubSection title="Catalog Trajectory">
                <p>
                  Measures how fast catalog streams are growing month-over-month, independent of
                  new-release activity. Computed from the last 24 months of daily data:
                </p>
                <ol className="list-decimal list-inside space-y-1 text-zinc-400 pl-1">
                  <li>Apply a 30-day rolling mean to daily catalog streams (removes day-of-week noise).</li>
                  <li>Fit a linear regression to the smoothed series to get a slope in streams/day.</li>
                  <li>Convert to a monthly percentage rate.</li>
                </ol>
                <Formula>
                  trajectory (%/month) = (slope × 30 / mean_streams) × 100
                </Formula>
                <p>
                  Trajectory labels: <Pill>Accelerating</Pill> ≥ +2.0% · <Pill>Growing</Pill> ≥ +0.5% · <Pill>Stable</Pill> ≥ −0.5% · <Pill>Declining</Pill> ≥ −2.0% · <Pill>Falling</Pill> &lt; −2.0%.
                </p>
              </SubSection>

              <SubSection title="Catalog Stability">
                <p>
                  Measures consistency of monthly catalog stream volume over the last 24 months.
                  Uses the inverse coefficient of variation (CV), so a lower CV produces a higher
                  score:
                </p>
                <Formula>
                  CV      = std(monthly_catalog_streams) / mean(monthly_catalog_streams){"\n"}
                  raw     = 1 / (1 + CV){"\n"}
                  score   = percentile_rank(raw, roster)
                </Formula>
                <Note>
                  A perfectly flat catalog would have CV = 0, raw = 1.0, and rank at the top.
                  An artist whose monthly streams swing wildly would have a high CV and score near the bottom.
                </Note>
              </SubSection>

              <SubSection title="Audience Health">
                <p>
                  Captures whether the artist is attracting new listeners, not just replaying to
                  existing fans. Blends two signals equally — listener growth rate over the past
                  12 months and absolute average monthly listener count:
                </p>
                <Formula>
                  growth_rate  = (avg_listeners_H2 − avg_listeners_H1) / avg_listeners_H1{"\n"}
                  score        = (percentile_rank(growth_rate) + percentile_rank(avg_listeners)) / 2
                </Formula>
                <p>
                  H1 and H2 are the first and second halves of the trailing 12-month window.
                </p>
              </SubSection>

              <SubSection title="New Release Performance">
                <p>
                  Measures how strongly new releases spike streaming relative to the catalog
                  baseline. Computed over the last 24 months:
                </p>
                <Formula>
                  raw   = peak_30d_rolling_mean(new_release_streams) / avg(catalog_streams){"\n"}
                  score = percentile_rank(raw, roster)
                </Formula>
                <Note>
                  This score is used only for ranking. The actual peak multiplier fed into the
                  deal engine is computed separately from the artist's full history — see the
                  Peak Multiplier section below.
                </Note>
              </SubSection>

              <SubSection title="Career Runway">
                <p>
                  Earlier-career artists have more room to grow, which compounds over a
                  multi-year deal term. Runway is scored as the inverse of career length:
                </p>
                <Formula>
                  career_years = (today − debut_date) / 365.25{"\n"}
                  raw          = 1 / (1 + career_years){"\n"}
                  score        = percentile_rank(raw, roster)
                </Formula>
              </SubSection>

              <SubSection title="Market Quality">
                <p>
                  Streaming royalty yields vary significantly by country — a US listener
                  generates roughly 2–3× more revenue per stream than a listener in a
                  lower-tier market. Market quality uses a fixed absolute tier rather than a
                  relative percentile, so a US artist always scores higher than a Nigerian
                  artist regardless of roster composition:
                </p>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-zinc-800">
                        <th className="text-left text-zinc-500 font-medium py-2 pr-8">Country</th>
                        <th className="text-right text-zinc-500 font-medium py-2">Score</th>
                        <th className="text-left text-zinc-500 font-medium py-2 pl-8">Country</th>
                        <th className="text-right text-zinc-500 font-medium py-2">Score</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/60">
                      {[
                        ["US", 100, "Brazil", 70],
                        ["UK", 90, "South Korea", 68],
                        ["Germany", 85, "Japan", 65],
                        ["France", 82, "Mexico", 60],
                        ["Australia", 80, "Spain", 58],
                        ["Canada", 78, "Nigeria", 50],
                        ["Sweden", 75, "Other", 55],
                      ].map(([c1, s1, c2, s2]) => (
                        <tr key={String(c1)}>
                          <td className="py-2 pr-8 text-zinc-300">{c1}</td>
                          <td className="py-2 text-right font-mono text-zinc-300">{s1}</td>
                          <td className="py-2 pl-8 text-zinc-300">{c2}</td>
                          <td className="py-2 text-right font-mono text-zinc-300">{s2}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </SubSection>
            </Section>

            {/* ── 3. Deal Engine ── */}
            <Section id="deal-engine" title="Deal Engine">
              <p>
                The deal engine is a pure function: given deal parameters and an artist's anchor
                metrics, it projects monthly cash flows for the full contract term across three
                scenarios (base, best, worst). It runs entirely in the browser on every
                parameter change — about 120 iterations of arithmetic, taking under 1ms.
              </p>

              <SubSection title="Stream Forecast">
                <p>
                  The catalog stream forecast starts from the artist's trailing 12-month average
                  daily streams and grows it forward at the observed trajectory rate. To prevent
                  compounding from producing unrealistic long-term growth, the trajectory rate
                  decays toward zero with an 18-month half-life:
                </p>
                <Formula>
                  catalog_streams(t) = catalog_streams(t−1) × (1 + decayed_traj / 100){"\n\n"}
                  decayed_traj(k)    = trajectory × 0.5^(k / 18){"\n\n"}
                  {"  "}where k = t − 2  (k=0 is the month 1→2 growth step)
                </Formula>
                <Note>
                  At +2.56%/month, the cap limits total stream growth to ~1.97× the baseline.
                  At +4.77%/month, the cap produces ~3.56× — compared to ~256× over 10 years
                  if the same rate were allowed to compound unchecked.
                </Note>
                <p>Monthly catalog streams use a 30-day month convention:</p>
                <Formula>monthly_catalog_streams(t) = daily_streams(t) × 30</Formula>
              </SubSection>

              <SubSection title="Peak Multiplier (Artist-Specific)">
                <p>
                  Rather than applying a universal multiplier, the model derives each artist's
                  expected new-release spike from their own historical data. The peak multiplier
                  is computed once per artist from their full streaming history:
                </p>
                <Formula>
                  peak_multiplier = max(new_release_streams, all months){"\n"}
                  {"                "} / avg(catalog_streams, last 24 months)
                </Formula>
                <p>Two guardrails are applied:</p>
                <ul className="list-disc list-inside space-y-1 pl-1">
                  <li><Pill>floor 0.05×</Pill> — artists with no observable release history are not assumed to have zero impact</li>
                  <li><Pill>ceiling 8×</Pill> — a handful of artists have a tiny catalog base and one viral release, producing ratios of 30–60×; uncapped, this would generate absurd projections</li>
                </ul>
                <Note>
                  This means artists with a large established catalog (like Hadley North at 0.01×)
                  are modeled very differently from rising artists (like Luna Lyon at 0.71×).
                  The user can override this value in the configurator.
                </Note>
              </SubSection>

              <SubSection title="New Release Model">
                <p>
                  Each new release is scheduled at evenly-spaced midpoints within the delivery
                  window (e.g. 3 releases over 36 months → months 6, 18, 30). On the release
                  month, total new-release streams spike to the catalog baseline multiplied by
                  the peak multiplier, then decay exponentially:
                </p>
                <Formula>
                  peak(r)            = catalog_streams(r) × peak_multiplier{"\n\n"}
                  contribution(t, r) = peak(r) × 0.5^((t − r) / decay_half_life){"\n\n"}
                  {"  "}where r = release month, t = current month{"\n"}
                  {"  "}decay_half_life defaults to 4 months
                </Formula>
                <p>Contributions from multiple releases are additive each month.</p>
              </SubSection>

              <SubSection title="Marketing Lift">
                <p>
                  Marketing spend improves two things: the catalog stream baseline (via editorial
                  placements and algorithmic momentum) and the new-release peak (via playlist
                  pitching and promotional campaigns). Both scale logarithmically — additional
                  spend has diminishing returns:
                </p>
                <Formula>
                  lift            = ln(budget / 200,000 + 1){"\n\n"}
                  catalog_factor  = 1 + 0.15 × lift{"\n"}
                  peak_factor     = 1 + 0.30 × lift{"\n\n"}
                  At $200K:  catalog +10.4%,  peak +20.8%{"\n"}
                  At $500K:  catalog +18.8%,  peak +37.6%{"\n"}
                  At $1M:    catalog +26.9%,  peak +53.8%
                </Formula>
                <Note>
                  $200K is the reference spend — at this level <Pill>ln(2) ≈ 0.693</Pill>. Trajectory and
                  decay half-life are intrinsic to the artist and are not affected by marketing.
                </Note>
              </SubSection>

              <SubSection title="Revenue Flow">
                <p>Each month, revenue flows through the following steps:</p>
                <Formula>
                  gross_royalties  = total_streams × $0.0035 per stream{"\n\n"}
                  net_royalties    = gross_royalties × (1 − admin_fee %){"\n\n"}
                  recoup_applied   = min(net_royalties × payback_rate %, outstanding_balance){"\n"}
                  new_balance      = outstanding_balance − recoup_applied{"\n\n"}
                  label_share      = labelSharePre  if balance_start &gt; 0{"\n"}
                  {"               "}= labelSharePost if balance_start = 0{"\n\n"}
                  label_revenue    = net_royalties × label_share
                </Formula>
                <Note>
                  The split is determined by the balance at the <em>start</em> of the month. If the
                  balance tips to zero mid-month, the pre-payback rate still applies for that
                  month; the post-payback rate activates from the following month.
                </Note>
              </SubSection>

              <SubSection title="Scenario Band">
                <p>
                  Best and worst scenarios are derived from the base by adjusting trajectory and
                  peak multiplier. The width of the band is driven by the artist's catalog
                  stability score — a consistent artist gets a narrow band; an erratic one gets
                  a wider spread:
                </p>
                <Formula>
                  volatility       = (100 − catalog_stability_score) / 100{"\n\n"}
                  traj_swing       = 0.30 + volatility × 1.20    {" "}{"→ range: 0.30–1.50 %/month"}{"\n"}
                  peak_swing       = 0.10 + volatility × 0.20    {" "}{"→ range: 10%–30%"}{"\n\n"}
                  best:   traj + traj_swing,  peak × (1 + peak_swing){"\n"}
                  worst:  traj − traj_swing,  peak × (1 − peak_swing)
                </Formula>
              </SubSection>
            </Section>

            {/* ── 4. Financial Metrics ── */}
            <Section id="financial-metrics" title="Financial Metrics">

              <SubSection title="NPV (Net Present Value)">
                <p>
                  The present value of all future label revenue inflows discounted at the cost
                  of capital, minus the upfront investment. A positive NPV means the deal
                  exceeds the required return; negative means it falls short.
                </p>
                <Formula>
                  monthly_rate = (1 + annual_cost_of_capital)^(1/12) − 1{"\n\n"}
                  NPV = Σ [ label_revenue(t) / (1 + monthly_rate)^t ] − total_investment{"\n\n"}
                  {"  "}t = 1 … contract_term_months
                </Formula>
                <Note>
                  The cost of capital (default 12%) is the discount rate — the minimum annual
                  return the label requires. A deal with positive NPV at this rate clears the
                  bar. It does not mean the deal will return exactly 12%.
                </Note>
              </SubSection>

              <SubSection title="Break-Even">
                <p>
                  The first month in which cumulative label revenue covers the total investment
                  (advance + marketing). This is a cash-on-cash measure — it does not account
                  for the time value of money.
                </p>
                <Formula>
                  break_even = first t where Σ label_revenue(1..t) ≥ advance + marketing_budget
                </Formula>
              </SubSection>

              <SubSection title="Advance Paid Back">
                <p>
                  The first month in which the artist's outstanding advance balance reaches zero.
                  This is a contractual event — after this point, the label's royalty share
                  drops from the pre-payback rate to the (lower) post-payback rate.
                </p>
                <Formula>
                  advance_paid_back = first t where outstanding_balance(t) = 0
                </Formula>
                <p>
                  Break-even and Advance Paid Back are related but distinct. Break-even measures
                  when the label recoups its total investment from revenue. Advance Paid Back
                  measures when the artist's contractual obligation is cleared. They often occur
                  at different months — or one may occur without the other within the deal term.
                </p>
              </SubSection>

              <SubSection title="Total ROI">
                <p>
                  A simple undiscounted cash-on-cash return over the full deal term. Does not
                  account for the time value of money — use NPV for a time-adjusted view.
                </p>
                <Formula>
                  total_ROI = (cumulative_label_revenue − total_investment) / total_investment × 100
                </Formula>
              </SubSection>

              <SubSection title="Label Profit">
                <p>
                  Raw cash profit: cumulative label revenue over the deal term minus total
                  investment. Undiscounted.
                </p>
                <Formula>
                  label_profit = cumulative_label_revenue − (advance + marketing_budget)
                </Formula>
              </SubSection>
            </Section>

            {/* ── 5. Optimizer ── */}
            <Section id="optimizer" title="Optimizer">
              <p>
                The optimizer finds the deal structure that maximises base-scenario label NPV
                subject to a set of constraints. It runs once per artist when their detail
                page is loaded (server-side), and again when the user clicks "Optimized" in
                the configurator.
              </p>

              <SubSection title="What Gets Pinned">
                <p>
                  Several parameters have a straightforward, predictable effect on NPV — pushing
                  them in one direction always improves the result, so their optimal value is
                  always at the constraint boundary. No search is needed:
                </p>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-zinc-800">
                        <th className="text-left text-zinc-500 font-medium py-2 pr-4">Parameter</th>
                        <th className="text-left text-zinc-500 font-medium py-2 pr-4">Pinned to</th>
                        <th className="text-left text-zinc-500 font-medium py-2">Reason</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/60">
                      {[
                        ["Label share (pre-payback)",  "85% (industry ceiling)",          "Maximising pre-payback share always improves NPV"],
                        ["Label share (post-payback)", "100 − min. artist post-payback %", "Maximising post-payback share always improves NPV"],
                        ["Payback rate",               "100% (maximum)",                  "Clears the label's advance exposure as quickly as possible"],
                        ["Advance",                    "Tier minimum",                    "Lower upfront outflow improves NPV"],
                      ].map(([p, pin, reason]) => (
                        <tr key={p}>
                          <td className="py-2 pr-4 text-zinc-300">{p}</td>
                          <td className="py-2 pr-4 text-zinc-300 font-mono text-[11px]">{pin}</td>
                          <td className="py-2 text-zinc-500">{reason}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </SubSection>

              <SubSection title="What Gets Swept">
                <p>
                  Two parameters have a genuine trade-off and are swept numerically:
                </p>
                <ul className="list-disc list-inside space-y-2 pl-1">
                  <li>
                    <span className="text-zinc-300">Contract term (1–7 years)</span> — longer terms
                    add more cash flows but heavier discounting reduces the value of distant revenue.
                  </li>
                  <li>
                    <span className="text-zinc-300">Marketing budget ($0 to max, 50 steps)</span> — more
                    spend lifts catalog baseline and release peaks but also increases the investment
                    and extends the payback horizon.
                  </li>
                </ul>
                <p>
                  Total evaluations: up to 7 × 51 = 357 calls to the deal engine.
                  Each call takes under 1ms, so the full sweep completes in well under 400ms.
                </p>
              </SubSection>

              <SubSection title="Constraints">
                <Formula>
                  break_even (base scenario) ≤ 60 months{"\n"}
                  total_investment           ≤ advance_tier_max + $300K{"\n"}
                  marketing_budget           ≤ $500K{"\n"}
                  artist_share_post_payback  ≥ 40%
                </Formula>
                <p>
                  The break-even constraint is applied to the base scenario only — industry
                  standard practice is to structure deals to recover in the expected case,
                  not in the downside tail.
                </p>
              </SubSection>

              <SubSection title="Advance Tiers">
                <p>
                  The advance floor and ceiling are derived from the artist's average daily
                  stream volume, based on industry benchmarks for master-rights deals:
                </p>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-zinc-800">
                        <th className="text-left text-zinc-500 font-medium py-2 pr-8">Avg daily streams</th>
                        <th className="text-right text-zinc-500 font-medium py-2 pr-8">Min advance</th>
                        <th className="text-right text-zinc-500 font-medium py-2 pr-8">Default</th>
                        <th className="text-right text-zinc-500 font-medium py-2">Max advance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/60">
                      {[
                        ["< 500K",      "$25K",  "$63K",    "$100K"],
                        ["500K – 1M",   "$100K", "$200K",   "$300K"],
                        ["1M – 2M",     "$300K", "$525K",   "$750K"],
                        ["> 2M",        "$750K", "$1.375M", "$2M"],
                      ].map(([tier, min, def, max]) => (
                        <tr key={tier}>
                          <td className="py-2 pr-8 text-zinc-300 font-mono">{tier}</td>
                          <td className="py-2 pr-8 text-right text-zinc-300">{min}</td>
                          <td className="py-2 pr-8 text-right text-zinc-300">{def}</td>
                          <td className="py-2 text-right text-zinc-300">{max}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <Note>
                  The optimizer always pins the advance at the tier minimum (lowest outflow). The
                  default is the midpoint, used as the starting value before optimisation runs.
                </Note>
              </SubSection>
            </Section>

            {/* ── 6. Assumptions & Limitations ── */}
            <Section id="assumptions" title="Assumptions & Limitations">

              <SubSection title="Fixed Assumptions">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-zinc-800">
                        <th className="text-left text-zinc-500 font-medium py-2 pr-6">Assumption</th>
                        <th className="text-left text-zinc-500 font-medium py-2 pr-6">Value</th>
                        <th className="text-left text-zinc-500 font-medium py-2">Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/60">
                      {[
                        ["Royalty rate",      "$0.0035 / stream", "Blended rate across DSPs and markets; actual rates vary by platform and territory"],
                        ["Month length",      "30 days",          "Uniform month convention for stream projections"],
                        ["Trajectory decay",  "18-month half-life", "Short-term growth momentum is assumed to gradually revert toward zero"],
                        ["Release decay",     "4-month half-life (default)", "New-release streaming contribution halves every 4 months by default; configurable"],
                        ["Cost of capital",   "12% annually (default)",      "Discount rate for NPV; configurable"],
                        ["Admin fee",         "15% (default)",               "Platform and distribution administration fee; configurable"],
                      ].map(([a, v, n]) => (
                        <tr key={a}>
                          <td className="py-2 pr-6 text-zinc-300">{a}</td>
                          <td className="py-2 pr-6 font-mono text-zinc-300 text-[11px]">{v}</td>
                          <td className="py-2 text-zinc-500">{n}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </SubSection>

              <SubSection title="Where the Model Is Reliable">
                <ul className="list-disc list-inside space-y-2 pl-1">
                  <li>Artists with at least 2–3 years of consistent streaming history</li>
                  <li>Catalog-heavy artists where the stream baseline is the primary revenue driver</li>
                  <li>Deal structures where the advance is the primary upfront cost</li>
                  <li>Deals evaluated in isolation (no portfolio-level correlation effects)</li>
                </ul>
              </SubSection>

              <SubSection title="Where the Model Breaks Down">
                <ul className="list-disc list-inside space-y-2 pl-1">
                  <li>
                    <span className="text-zinc-300">Early-career artists with thin history</span> — fewer
                    than 24 months of data means trajectory and stability estimates are unreliable.
                    Scores will be based on a shorter window; projections should be treated with extra caution.
                  </li>
                  <li>
                    <span className="text-zinc-300">Live-revenue-heavy artists</span> — the model only
                    accounts for streaming royalties. Artists whose income is primarily touring or
                    merchandise will be systematically undervalued.
                  </li>
                  <li>
                    <span className="text-zinc-300">Artists with a single viral release</span> — the 8×
                    ceiling on peak multiplier prevents one outlier event from dominating projections,
                    but it also caps the upside for artists who genuinely have hit-driven careers.
                  </li>
                  <li>
                    <span className="text-zinc-300">Market shocks</span> — DSP royalty rate changes,
                    platform shutdowns, or macro shifts in streaming behavior are not modeled.
                    The royalty rate is held fixed throughout the deal term.
                  </li>
                  <li>
                    <span className="text-zinc-300">Catalog-only artists</span> — artists who have
                    stopped releasing music are modeled as if they will release the configured number
                    of new albums. If new releases are set to zero, the model is accurate; otherwise,
                    the release schedule should be adjusted to reflect realistic expectations.
                  </li>
                </ul>
              </SubSection>

              <SubSection title="Data Source">
                <p>
                  All artist metrics are derived from 10 years of simulated daily streaming data
                  (2016–2026) generated for this case study. The 100-artist roster is fictional.
                  Scores, trajectories, and projections are internally consistent but do not
                  reflect real-world artists or actual market conditions.
                </p>
              </SubSection>
            </Section>

            {/* ── 7. Future Enhancements ── */}
            <Section id="future" title="Future Enhancements">
              <p>
                The current model is a strong analytical foundation, but several targeted
                improvements would meaningfully increase its accuracy and persuasiveness in
                a production setting. These are grouped by how quickly they could be
                implemented given what data is already available.
              </p>

              <SubSection title="Near-Term: Possible With Current Data">

                <div className="space-y-6">

                  <div>
                    <p className="text-zinc-300 font-medium mb-1">Prophet-based trajectory forecasting</p>
                    <p>
                      The current approach fits a linear regression to 24 months of data and
                      applies a fixed 18-month decay to the slope. The fixed decay is the
                      real weakness — every artist gets the same momentum fade regardless of
                      their actual career pattern.
                    </p>
                    <p className="mt-2">
                      Prophet (Meta's open-source forecasting library) would replace this with
                      a model that decomposes each artist's history into trend, seasonality, and
                      structural breaks, then forecasts forward with built-in confidence intervals.
                      It handles the day-of-week and seasonal patterns that are inherent in
                      streaming data, and it produces a full month-by-month predicted curve rather
                      than a single slope number. It is fitted per artist on their own history
                      and requires no data beyond what already exists.
                    </p>
                    <Note>
                      This is close enough to a current-version improvement that it arguably
                      shouldn't wait. It is listed here because it requires a backend preprocessing
                      step rather than a real-time browser calculation.
                    </Note>
                  </div>

                  <div>
                    <p className="text-zinc-300 font-medium mb-1">Release peak prediction via gradient boosting</p>
                    <p>
                      The current peak multiplier looks backward — it takes each artist's own
                      historical peak-to-catalog ratio. This is noisy for artists with few
                      releases and tells you nothing about what future releases will do under
                      different conditions.
                    </p>
                    <p className="mt-2">
                      A gradient boosting model (XGBoost or Random Forest) trained across all
                      artists and their release events would instead predict the expected peak
                      multiplier for a future release based on features that are all already
                      in the dataset: genre, career stage, current trajectory, market, release
                      cadence, time since last release, and marketing budget. Cross-artist
                      patterns in release performance are directly learnable from the data at
                      the scale of this roster.
                    </p>
                    <p className="mt-2">
                      Time since last release is a particularly valuable feature — an artist
                      returning after a long gap typically generates a larger spike than one
                      releasing on a tight cadence, because the audience has had time to build
                      anticipation. The current model has no way to capture this.
                    </p>
                    <p className="mt-2">
                      This is the strongest near-term improvement: it is actionable with
                      existing data, addresses a genuine weakness in the current model, and
                      benefits most from cross-artist learning.
                    </p>
                  </div>

                  <div>
                    <p className="text-zinc-300 font-medium mb-1">Monte Carlo scenario generation</p>
                    <p>
                      The current best/worst band applies a fixed trajectory swing and peak
                      swing derived from catalog stability. The result is essentially three
                      point estimates with arbitrary offsets — an artist with a stability
                      score of 20 and one with a score of 80 may still end up with bands that
                      are closer than their actual risk profiles warrant.
                    </p>
                    <p className="mt-2">
                      Monte Carlo would replace this with a proper output distribution. Using
                      the cross-artist data, you can learn what the realistic variance in
                      trajectory outcomes actually looks like for artists at each stability
                      level. You then sample thousands of trajectory paths from that learned
                      distribution, run the full deal model on each, and report P10/P50/P90
                      return distributions rather than three named scenarios.
                    </p>
                    <p className="mt-2">
                      This produces genuinely meaningful uncertainty quantification. A P10
                      return of −$200K is a specific, actionable risk statement: there is a
                      10% chance of losing that amount. "Worst case" in the current model
                      is just an assumption. If the release peak prediction model is also
                      in place, both trajectory and peak uncertainty can be sampled jointly,
                      giving a more complete picture of deal risk.
                    </p>
                    <Note>
                      Monte Carlo at thousands of iterations is not a computational burden
                      here — each deal evaluation is a loop of simple arithmetic. The
                      bottleneck would be preprocessing the learned distributions, not
                      the simulation itself.
                    </Note>
                  </div>

                  <div>
                    <p className="text-zinc-300 font-medium mb-1">Artist similarity clustering and UMAP visualisation</p>
                    <p>
                      The six scoring dimensions already describe each artist as a point in a
                      six-dimensional space. Applying k-means clustering to that space groups
                      artists with similar financial profiles, making it possible to surface
                      comparable artists for any candidate being evaluated. This requires no
                      additional data and can be run on the current roster.
                    </p>
                    <p className="mt-2">
                      UMAP (a dimensionality reduction technique) can project that
                      six-dimensional space down to two dimensions for visualisation. The
                      result would be an interactive map of all 100 artists where proximity
                      reflects similarity in streaming profile — with the artist under review
                      highlighted and their nearest neighbours labelled. For a non-technical
                      decision-maker, this makes the concept of "comparable artists" concrete
                      and intuitive in a way that a table of scores cannot.
                    </p>
                  </div>

                </div>
              </SubSection>

              <SubSection title="Longer-Term: Dependent on Data Infrastructure">
                <p>
                  Two improvements are technically well-justified but blocked by the same
                  underlying problem: they require historical data that does not currently
                  exist in a clean, usable form.
                </p>

                <div className="space-y-6 mt-3">

                  <div>
                    <p className="text-zinc-300 font-medium mb-1">Marketing lift model via XGBoost</p>
                    <p>
                      The current marketing lift formula is a log curve with fixed coefficients —
                      it does not distinguish between spend types, genres, career stages, or
                      markets. A campaign for a rising Latin artist in Brazil may produce very
                      different stream uplift than the same budget spent on an established pop
                      artist in the US, but the current model treats them identically.
                    </p>
                    <p className="mt-2">
                      An XGBoost model trained on historical campaign data — actual records of
                      what was spent on which artists and what stream uplift resulted — would
                      capture these non-linear interactions. SHAP values would make the model's
                      reasoning transparent to label executives: not just what uplift is predicted,
                      but which features are driving it and by how much.
                    </p>
                    <p className="mt-2">
                      The constraint is data. APG would need years of internal campaign records
                      with clean spend-to-uplift attribution before this model could be trained
                      meaningfully. That data is proprietary, inconsistently recorded, and
                      difficult to attribute cleanly — a streaming uplift following a campaign
                      may be partly due to the campaign and partly due to organic momentum or
                      a playlist add. Building the data collection and attribution infrastructure
                      is a prerequisite.
                    </p>
                  </div>

                  <div>
                    <p className="text-zinc-300 font-medium mb-1">Deal outcome anchoring</p>
                    <p>
                      The most persuasive projection a model can produce is not a formula result
                      but an empirical one: "artists with this profile at this advance level have
                      historically returned X% NPV." That grounds the model in observed reality
                      rather than theoretical assumptions.
                    </p>
                    <p className="mt-2">
                      Realising this requires a database of historical deal outcomes — actual
                      advances paid, revenue generated, and returns achieved across a portfolio
                      of signed artists. That data is typically siloed, confidential, and
                      recorded inconsistently across deal vintages. Like the marketing lift
                      model, this is a data infrastructure problem before it is a modeling
                      problem.
                    </p>
                  </div>

                </div>
              </SubSection>

              <SubSection title="The Underlying Prerequisite">
                <p>
                  The two data-gated improvements — marketing lift modeling and deal outcome
                  anchoring — are blocked by the same gap: the absence of structured historical
                  records linking inputs (spend, deal terms) to outcomes (stream uplift, actual
                  returns). Building that data infrastructure is the single highest-leverage
                  investment APG could make in this tooling, because it unlocks both improvements
                  simultaneously and turns this model from a projection tool into one grounded
                  in observed deal history.
                </p>
                <p className="mt-3">
                  The near-term improvements — Prophet trajectory forecasting, gradient boosting
                  for release peak prediction, Monte Carlo scenario generation, and artist
                  clustering — are all achievable with data that already exists and represent
                  the clearest path to increasing model accuracy in the short term.
                </p>
              </SubSection>

            </Section>

          </div>
        </div>
      </main>
    </>
  )
}
