"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type RangeKey = "7d" | "30d" | "90d" | "365d";
type ActivityPoint = { date: string; count: number };
type BreakdownRow = { name: string; count: number };
type AnalyticsPayload = {
  range: RangeKey;
  platform: string;
  summary: {
    acceptedSubmissions: number;
    uniqueProblems: number;
    allTimeUniqueProblems: number;
    activeDays: number;
    currentStreak: number;
    longestStreak: number;
    todayCount: number;
    lastSevenDays: number;
    averagePerActiveDay: number;
  };
  goals: { daily: number; weekly: number };
  activity: ActivityPoint[];
  heatmap: ActivityPoint[];
  breakdowns: {
    difficulty: BreakdownRow[];
    platform: BreakdownRow[];
    language: BreakdownRow[];
    topics: BreakdownRow[];
  };
};

const ranges: { value: RangeKey; label: string }[] = [
  { value: "7d", label: "7 days" },
  { value: "30d", label: "30 days" },
  { value: "90d", label: "90 days" },
  { value: "365d", label: "1 year" }
];

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", timeZone: "UTC" })
    .format(new Date(value + "T00:00:00.000Z"));
}

function buildLinePath(points: ActivityPoint[], width: number, height: number): string {
  if (!points.length) return "";
  const max = Math.max(1, ...points.map((point) => point.count));
  return points.map((point, index) => {
    const x = points.length === 1 ? width / 2 : (index / (points.length - 1)) * width;
    const y = height - (point.count / max) * (height - 18) - 8;
    return (index === 0 ? "M" : "L") + x.toFixed(1) + " " + y.toFixed(1);
  }).join(" ");
}

function BarBreakdown({ title, rows, empty }: { title: string; rows: BreakdownRow[]; empty: string }) {
  const max = Math.max(1, ...rows.map((row) => row.count));
  return (
    <section className="analytics-panel">
      <div className="analytics-panel-head"><h2>{title}</h2><span>{rows.length} categories</span></div>
      {rows.length ? (
        <div className="breakdown-list">
          {rows.map((row) => (
            <div className="breakdown-row" key={row.name}>
              <div className="breakdown-label"><span>{row.name}</span><strong>{row.count}</strong></div>
              <div className="bar-track"><div className="bar-fill" style={{ width: (row.count / max * 100) + "%" }} /></div>
            </div>
          ))}
        </div>
      ) : <div className="analytics-empty">{empty}</div>}
    </section>
  );
}

function MetricCard({ label, value, detail }: { label: string; value: string | number; detail: string }) {
  return (
    <article className="analytics-metric">
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </article>
  );
}

export function AnalyticsDashboard() {
  const [range, setRange] = useState<RangeKey>("30d");
  const [platform, setPlatform] = useState("all");
  const [data, setData] = useState<AnalyticsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    fetch("/api/analytics?range=" + range + "&platform=" + platform, {
      cache: "no-store",
      signal: controller.signal
    })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error ?? "Unable to load analytics.");
        return result as AnalyticsPayload;
      })
      .then(setData)
      .catch((reason: unknown) => {
        if (reason instanceof Error && reason.name === "AbortError") return;
        setError(reason instanceof Error ? reason.message : "Unable to load analytics.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [range, platform]);

  const linePath = useMemo(
    () => data ? buildLinePath(data.activity, 800, 190) : "",
    [data]
  );
  const maxActivity = Math.max(1, ...(data?.activity.map((point) => point.count) ?? [1]));
  const heatmapWeeks = useMemo(() => {
    if (!data) return [];
    const weeks: ActivityPoint[][] = [];
    for (let i = 0; i < data.heatmap.length; i += 7) weeks.push(data.heatmap.slice(i, i + 7));
    return weeks;
  }, [data]);

  return (
    <main className="shell">
      <header className="topbar">
        <Link className="brand" href="/dashboard">DSA<span>HUB</span></Link>
        <nav className="product-nav">
          <Link href="/dashboard">Overview</Link>
          <Link className="active" href="/analytics">Analytics</Link>
          <Link href="/github-sync">GitHub Sync</Link>
        </nav>
      </header>

      <section className="analytics-hero">
        <div>
          <div className="eyebrow">Performance workspace</div>
          <h1>Practice, measured.</h1>
          <p className="sub">Explore consistency, difficulty, languages and activity using submissions recorded in your account.</p>
        </div>
        <div className="analytics-filters">
          <label htmlFor="analytics-platform">Platform</label>
          <select id="analytics-platform" value={platform} onChange={(event) => setPlatform(event.target.value)}>
            <option value="all">All platforms</option>
            <option value="leetcode">LeetCode</option>
            <option value="geeksforgeeks">GeeksforGeeks</option>
          </select>
        </div>
      </section>

      <div className="range-switch" role="group" aria-label="Analytics date range">
        {ranges.map((item) => (
          <button
            type="button"
            key={item.value}
            className={range === item.value ? "selected" : ""}
            onClick={() => setRange(item.value)}
            aria-pressed={range === item.value}
          >
            {item.label}
          </button>
        ))}
      </div>

      {error ? <div className="notice analytics-error">{error}</div> : null}
      {loading && !data ? <div className="analytics-loading">Loading your practice data…</div> : null}
      {data ? (
        <>
          <section className="analytics-metrics">
            <MetricCard label="Unique problems" value={data.summary.uniqueProblems} detail={data.summary.allTimeUniqueProblems + " all-time across this filter"} />
            <MetricCard label="Accepted submissions" value={data.summary.acceptedSubmissions} detail={"In the selected " + range.replace("d", " days").replace("365 days", "year")} />
            <MetricCard label="Current streak" value={data.summary.currentStreak + " days"} detail={"Best: " + data.summary.longestStreak + " days"} />
            <MetricCard label="Active days" value={data.summary.activeDays} detail={data.summary.averagePerActiveDay + " submissions per active day"} />
          </section>

          <section className="analytics-panel activity-panel">
            <div className="analytics-panel-head">
              <div><h2>Activity trend</h2><p>Accepted submissions per day</p></div>
              <span>{data.summary.lastSevenDays} in the last 7 days</span>
            </div>
            {data.activity.some((point) => point.count > 0) ? (
              <>
                <div className="line-chart">
                  <div className="chart-y-labels"><span>{maxActivity}</span><span>{Math.ceil(maxActivity / 2)}</span><span>0</span></div>
                  <svg viewBox="0 0 800 200" role="img" aria-label="Accepted submissions activity line chart" preserveAspectRatio="none">
                    <line x1="0" y1="190" x2="800" y2="190" className="chart-grid-line" />
                    <line x1="0" y1="100" x2="800" y2="100" className="chart-grid-line" />
                    <line x1="0" y1="10" x2="800" y2="10" className="chart-grid-line" />
                    <path d={linePath} className="chart-line" />
                  </svg>
                </div>
                <div className="chart-x-labels">
                  <span>{formatDate(data.activity[0].date)}</span>
                  <span>{formatDate(data.activity[Math.floor(data.activity.length / 2)].date)}</span>
                  <span>{formatDate(data.activity[data.activity.length - 1].date)}</span>
                </div>
              </>
            ) : <div className="analytics-empty">No accepted submissions in this period yet. Complete a problem and your trend will appear here.</div>}
          </section>

          <section className="analytics-panel heatmap-panel">
            <div className="analytics-panel-head">
              <div><h2>Consistency map</h2><p>Daily accepted activity over the last 12 months</p></div>
              <span>{data.heatmap.reduce((sum, point) => sum + (point.count > 0 ? 1 : 0), 0)} active days</span>
            </div>
            <div className="heatmap-scroll">
              <div className="heatmap">
                {heatmapWeeks.map((week, index) => (
                  <div className="heatmap-week" key={index}>
                    {week.map((point) => (
                      <div
                        key={point.date}
                        className={"heat-cell level-" + (point.count === 0 ? 0 : point.count === 1 ? 1 : point.count <= 3 ? 2 : point.count <= 5 ? 3 : 4)}
                        title={formatDate(point.date) + ": " + point.count + " accepted submissions"}
                        aria-label={formatDate(point.date) + ": " + point.count + " accepted submissions"}
                      />
                    ))}
                  </div>
                ))}
              </div>
            </div>
            <div className="heatmap-legend"><span>Less</span>{[0,1,2,3,4].map((level) => <i key={level} className={"heat-cell level-" + level} />)}<span>More</span></div>
          </section>

          <section className="analytics-breakdowns">
            <BarBreakdown title="Difficulty" rows={data.breakdowns.difficulty} empty="Difficulty labels will appear when the platform supplies them." />
            <BarBreakdown title="Platforms" rows={data.breakdowns.platform} empty="No platform activity in this period." />
            <BarBreakdown title="Languages" rows={data.breakdowns.language} empty="Language metadata is not available yet." />
            <BarBreakdown title="Topics" rows={data.breakdowns.topics} empty="Topic tags will appear when platform adapters provide them." />
          </section>

          <section className="goal-strip">
            <div><span>Daily target</span><strong>{data.goals.daily} problems</strong><small>{data.summary.todayCount} accepted today</small></div>
            <div className="goal-track"><div style={{ width: Math.min(100, data.summary.todayCount / Math.max(1, data.goals.daily) * 100) + "%" }} /></div>
            <div><span>Weekly target</span><strong>{data.goals.weekly} problems</strong><small>{data.summary.lastSevenDays} accepted in the last 7 days</small></div>
          </section>
        </>
      ) : null}
      <p className="fine-print">Analytics are based on submissions recorded by DSAHub. Missing platform metadata is not inferred or fabricated.</p>
    </main>
  );
}
