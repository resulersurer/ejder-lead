"use client";

import { useEffect, useMemo, useState } from "react";
import { Lead, normalizeStatus, salesPeople } from "../../shared";

type ResponseLead = Lead & {
  responseMinutes: number;
};

type SalesPersonResponseStats = {
  name: string;
  total: number;
  responded: number;
  responseRate: number;
  averageMinutes: number;
  fastestMinutes: number;
  slowestMinutes: number;
  sold: number;
};

type DailyResponseTrend = {
  key: string;
  label: string;
  averageMinutes: number;
  count: number;
};

type PersonnelDailyResponseSeries = {
  name: string;
  color: string;
  averageMinutes: number;
  totalResponses: number;
  points: DailyResponseTrend[];
};

const formatPercent = (value: number) => `%${value.toFixed(1).replace(".", ",")}`;

const trendColors = [
  "#2563eb",
  "#10b981",
  "#f59e0b",
  "#ec4899",
  "#7c3aed",
  "#0f766e",
  "#dc2626",
  "#0891b2",
  "#84cc16",
  "#9333ea",
  "#ea580c",
  "#14b8a6",
  "#4f46e5",
  "#be123c",
  "#65a30d",
  "#0284c7",
  "#a855f7",
  "#ca8a04",
  "#db2777",
  "#16a34a",
  "#64748b",
  "#991b1b",
  "#0369a1",
  "#854d0e",
];

const formatDuration = (minutes: number) => {
  if (!Number.isFinite(minutes)) return "-";
  const rounded = Math.max(0, Math.round(minutes));
  if (rounded < 60) return `${rounded} dk`;

  const hours = Math.floor(rounded / 60);
  const remainingMinutes = rounded % 60;
  if (hours < 24) return remainingMinutes ? `${hours} sa ${remainingMinutes} dk` : `${hours} sa`;

  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  return remainingHours ? `${days} gün ${remainingHours} sa` : `${days} gün`;
};

const getResponseMinutes = (lead: Lead) => {
  if (!lead.createdAt || !lead.statusUpdatedAt) return null;

  const createdAt = new Date(lead.createdAt).getTime();
  const statusUpdatedAt = new Date(lead.statusUpdatedAt).getTime();

  if (Number.isNaN(createdAt) || Number.isNaN(statusUpdatedAt)) return null;
  return Math.max(0, (statusUpdatedAt - createdAt) / 60000);
};

const getIstanbulDayKey = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  const parts = new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "Europe/Istanbul",
  }).formatToParts(date);

  const day = parts.find((part) => part.type === "day")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const year = parts.find((part) => part.type === "year")?.value;

  if (!day || !month || !year) return null;
  return `${year}-${month}-${day}`;
};

const formatDayLabel = (key: string) => {
  const [year, month, day] = key.split("-").map(Number);
  if (!year || !month || !day) return key;

  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "short",
    timeZone: "Europe/Istanbul",
  }).format(new Date(Date.UTC(year, month - 1, day, 12)));
};

export default function ResponseTimesPage() {
  const [leads, setLeads] = useState<Lead[]>([]);

  useEffect(() => {
    const fetchLeads = async () => {
      try {
        const response = await fetch("/api/leads", { cache: "no-store" });
        if (!response.ok) {
          throw new Error("Lead verileri alınamadı.");
        }

        const data = await response.json();
        if (Array.isArray(data.leads)) {
          setLeads(
            data.leads.map((lead: Lead) => ({
              ...lead,
              status: normalizeStatus(lead.status),
            }))
          );
        }
      } catch (error) {
        console.error(error);
      }
    };

    fetchLeads();
  }, []);

  const responseLeads = useMemo<ResponseLead[]>(
    () =>
      leads
        .map((lead) => {
          const responseMinutes = getResponseMinutes(lead);
          return responseMinutes === null ? null : { ...lead, responseMinutes };
        })
        .filter((lead): lead is ResponseLead => lead !== null),
    [leads]
  );

  const salespersonStats = useMemo<SalesPersonResponseStats[]>(() => {
    const grouped = new Map<string, { total: number; responses: number[]; sold: number }>();

    for (const person of salesPeople) {
      grouped.set(person.name, { total: 0, responses: [], sold: 0 });
    }

    for (const lead of leads) {
      const current = grouped.get(lead.salesPerson) ?? { total: 0, responses: [], sold: 0 };
      const responseMinutes = getResponseMinutes(lead);

      current.total += 1;
      if (responseMinutes !== null) current.responses.push(responseMinutes);
      if (normalizeStatus(lead.status) === "Satıldı") current.sold += 1;
      grouped.set(lead.salesPerson, current);
    }

    return Array.from(grouped.entries())
      .map(([name, item]) => {
        const responded = item.responses.length;
        const totalResponseMinutes = item.responses.reduce((sum, value) => sum + value, 0);
        const averageMinutes = responded ? totalResponseMinutes / responded : 0;

        return {
          name,
          total: item.total,
          responded,
          responseRate: item.total ? (responded / item.total) * 100 : 0,
          averageMinutes,
          fastestMinutes: responded ? Math.min(...item.responses) : 0,
          slowestMinutes: responded ? Math.max(...item.responses) : 0,
          sold: item.sold,
        };
      })
      .filter((item) => item.total > 0)
      .sort(
        (left, right) =>
          right.responded - left.responded ||
          left.averageMinutes - right.averageMinutes ||
          right.responseRate - left.responseRate
      );
  }, [leads]);

  const totalLeads = leads.length;
  const respondedCount = responseLeads.length;
  const averageResponseMinutes = respondedCount
    ? responseLeads.reduce((sum, lead) => sum + lead.responseMinutes, 0) / respondedCount
    : 0;
  const fastestPerson = salespersonStats
    .filter((item) => item.responded > 0)
    .sort((left, right) => left.averageMinutes - right.averageMinutes)[0];
  const needsAttention = salespersonStats
    .filter((item) => item.responded > 0)
    .sort((left, right) => right.averageMinutes - left.averageMinutes)[0];

  const buckets = useMemo(
    () => [
      {
        label: "15 dk altı",
        count: responseLeads.filter((lead) => lead.responseMinutes < 15).length,
        color: "#10b981",
      },
      {
        label: "15-60 dk",
        count: responseLeads.filter((lead) => lead.responseMinutes >= 15 && lead.responseMinutes < 60).length,
        color: "#2563eb",
      },
      {
        label: "1-4 saat",
        count: responseLeads.filter((lead) => lead.responseMinutes >= 60 && lead.responseMinutes < 240).length,
        color: "#f59e0b",
      },
      {
        label: "4 saat üstü",
        count: responseLeads.filter((lead) => lead.responseMinutes >= 240).length,
        color: "#dc2626",
      },
    ],
    [responseLeads]
  );

  const personnelDailyTrend = useMemo<PersonnelDailyResponseSeries[]>(() => {
    const grouped = new Map<string, Map<string, { totalMinutes: number; count: number }>>();
    const totals = new Map<string, { totalMinutes: number; count: number }>();

    for (const lead of responseLeads) {
      if (!lead.statusUpdatedAt) continue;
      const dayKey = getIstanbulDayKey(lead.statusUpdatedAt);
      if (!dayKey) continue;

      const personDays =
        grouped.get(lead.salesPerson) ?? new Map<string, { totalMinutes: number; count: number }>();
      const currentDay = personDays.get(dayKey) ?? { totalMinutes: 0, count: 0 };
      currentDay.totalMinutes += lead.responseMinutes;
      currentDay.count += 1;
      personDays.set(dayKey, currentDay);
      grouped.set(lead.salesPerson, personDays);

      const currentTotal = totals.get(lead.salesPerson) ?? { totalMinutes: 0, count: 0 };
      currentTotal.totalMinutes += lead.responseMinutes;
      currentTotal.count += 1;
      totals.set(lead.salesPerson, currentTotal);
    }

    return Array.from(grouped.entries())
      .map(([name, dayMap], index): PersonnelDailyResponseSeries => {
        const total = totals.get(name) ?? { totalMinutes: 0, count: 0 };
        const points = Array.from(dayMap.entries())
          .map(([key, item]) => ({
            key,
            label: formatDayLabel(key),
            averageMinutes: item.count ? item.totalMinutes / item.count : 0,
            count: item.count,
          }))
          .sort((left, right) => left.key.localeCompare(right.key));

        return {
          name,
          color: trendColors[index % trendColors.length],
          averageMinutes: total.count ? total.totalMinutes / total.count : 0,
          totalResponses: total.count,
          points,
        };
      })
      .filter((series) => series.totalResponses > 0)
      .sort(
        (left, right) =>
          right.totalResponses - left.totalResponses ||
          left.averageMinutes - right.averageMinutes ||
          left.name.localeCompare(right.name, "tr")
      )
      .map((series, index) => ({ ...series, color: trendColors[index % trendColors.length] }));
  }, [responseLeads]);

  const maxAverageMinutes = Math.max(...salespersonStats.map((item) => item.averageMinutes), 1);
  const maxBucketCount = Math.max(...buckets.map((item) => item.count), 1);
  const trendDays = Array.from(
    new Set(personnelDailyTrend.flatMap((series) => series.points.map((point) => point.key)))
  ).sort((left, right) => left.localeCompare(right));
  const maxDailyAverageMinutes = Math.max(
    ...personnelDailyTrend.flatMap((series) => series.points.map((point) => point.averageMinutes)),
    1
  );
  const trendChartWidth = 720;
  const trendChartHeight = 260;
  const trendPadding = 32;
  const trendInnerWidth = trendChartWidth - trendPadding * 2;
  const trendInnerHeight = trendChartHeight - trendPadding * 2;
  const trendSeriesPoints = personnelDailyTrend.map((series) => ({
    ...series,
    chartPoints: series.points.map((point) => {
      const dayIndex = Math.max(0, trendDays.indexOf(point.key));
      const x =
        trendDays.length === 1
          ? trendChartWidth / 2
          : trendPadding + (dayIndex / (trendDays.length - 1)) * trendInnerWidth;
      const y =
        trendPadding +
        trendInnerHeight -
        (point.averageMinutes / maxDailyAverageMinutes) * trendInnerHeight;

      return { ...point, x, y };
    }),
  }));

  return (
    <main className="container">
      <div className="header">
        <div>
          <h1>Yanıt Süresi Analizi</h1>
          <p>
            Leadin yüklenme zamanı ile satış temsilcisinin durum değiştirme zamanı arasındaki süreleri kişi bazında
            kontrol edin.
          </p>
        </div>
      </div>

      <div className="grid dashboard-summary-grid">
        <div className="card metric-card">
          <span className="metric-label">Ölçülen Lead</span>
          <strong className="metric-value">{respondedCount}</strong>
        </div>
        <div className="card metric-card">
          <span className="metric-label">Ortalama Yanıt</span>
          <strong className="metric-value">{formatDuration(averageResponseMinutes)}</strong>
        </div>
        <div className="card metric-card">
          <span className="metric-label">Yanıt Oranı</span>
          <strong className="metric-value">{formatPercent(totalLeads ? (respondedCount / totalLeads) * 100 : 0)}</strong>
        </div>
        <div className="card metric-card">
          <span className="metric-label">Toplam Lead</span>
          <strong className="metric-value">{totalLeads}</strong>
        </div>
      </div>

      {respondedCount === 0 && (
        <div className="card response-empty-state">
          <h2>Henüz yanıt süresi ölçümü yok</h2>
          <p className="muted-text">
            Bu ekran, satış temsilcisi bir leadin durumunu değiştirdikten sonra dolmaya başlar. Yeni değişikliklerde
            yükleme zamanı ve durum değişim zamanı otomatik karşılaştırılır.
          </p>
        </div>
      )}

      <div className="grid" style={{ marginTop: 24 }}>
        <div className="card">
          <h2>Yanıt Süresi Dağılımı</h2>
          <div className="chart-list">
            {buckets.map((bucket) => {
              const rate = respondedCount ? (bucket.count / respondedCount) * 100 : 0;

              return (
                <div key={bucket.label} className="chart-row">
                  <div className="chart-row-header">
                    <span>{bucket.label}</span>
                    <strong>
                      {bucket.count} • {formatPercent(rate)}
                    </strong>
                  </div>
                  <div className="chart-track">
                    <div
                      className="chart-bar"
                      style={{ width: `${(bucket.count / maxBucketCount) * 100}%`, backgroundColor: bucket.color }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="card">
          <h2>Hızlı Yönetici Özeti</h2>
          <div className="response-insight-grid">
            <div className="response-insight">
              <span>En hızlı ortalama</span>
              <strong>{fastestPerson?.name ?? "-"}</strong>
              <p>{fastestPerson ? formatDuration(fastestPerson.averageMinutes) : "Ölçüm bekleniyor"}</p>
            </div>
            <div className="response-insight">
              <span>Takip odağı</span>
              <strong>{needsAttention?.name ?? "-"}</strong>
              <p>{needsAttention ? formatDuration(needsAttention.averageMinutes) : "Ölçüm bekleniyor"}</p>
            </div>
          </div>
          <p className="muted-text">
            Ortalama süre düştükçe lead sıcaklığı korunur. Yanıt oranı düşük personelde önce durum güncelleme
            alışkanlığını kontrol etmek faydalı olur.
          </p>
        </div>
      </div>

      <div className="card" style={{ marginTop: 24 }}>
        <h2>Personel Bazlı Yanıt Süresi</h2>
        <div className="response-table">
          {salespersonStats.map((item) => (
            <div key={item.name} className="response-person-row">
              <div className="response-person-header">
                <div>
                  <strong>{item.name}</strong>
                  <p className="chart-note">
                    {item.responded} yanıtlanan • {item.total} toplam lead • {item.sold} satış
                  </p>
                </div>
                <span className="performance-rate-badge">{formatDuration(item.averageMinutes)}</span>
              </div>
              <div className="chart-track response-track">
                <div
                  className="chart-bar response-bar"
                  style={{ width: `${(item.averageMinutes / maxAverageMinutes) * 100}%` }}
                />
              </div>
              <div className="response-person-stats">
                <span>Yanıt oranı: {formatPercent(item.responseRate)}</span>
                <span>En hızlı: {item.responded ? formatDuration(item.fastestMinutes) : "-"}</span>
                <span>En yavaş: {item.responded ? formatDuration(item.slowestMinutes) : "-"}</span>
              </div>
            </div>
          ))}
          {salespersonStats.length === 0 && <p className="muted-text">Gösterilecek personel verisi yok.</p>}
        </div>
      </div>

      <div className="card" style={{ marginTop: 24 }}>
        <div className="response-trend-header">
          <div>
            <h2>Personel Bazlı Günlük Yanıt Performansı</h2>
            <p className="muted-text">
              Yanıt verisi en güçlü personelin günlük ortalama süreleri karşılaştırılır.
            </p>
          </div>
          <span className="performance-rate-badge">{personnelDailyTrend.length} personel</span>
        </div>

        {personnelDailyTrend.length > 0 ? (
          <>
            <div className="response-chart-guide" aria-label="Grafik açıklaması">
              <div>
                <strong>X ekseni</strong>
                <span>Durum değiştirilen günleri gösterir.</span>
              </div>
              <div>
                <strong>Y ekseni</strong>
                <span>Ortalama yanıt süresini gösterir; aşağı indikçe performans hızlanır.</span>
              </div>
              <div>
                <strong>Renkli çizgi ve noktalar</strong>
                <span>Her renk bir personeli, noktalar o personelin ilgili gündeki ortalama süresini gösterir.</span>
              </div>
            </div>

            <div className="response-line-chart" aria-label="Personel bazlı günlük ortalama yanıt süresi çizgi grafiği">
              <svg viewBox={`0 0 ${trendChartWidth} ${trendChartHeight}`} role="img">
                <text
                  x={trendPadding - 14}
                  y={trendPadding - 10}
                  textAnchor="middle"
                  className="response-axis-label"
                >
                  Süre
                </text>
                <text
                  x={trendChartWidth - trendPadding}
                  y={trendChartHeight - 8}
                  textAnchor="end"
                  className="response-axis-label"
                >
                  Gün
                </text>
                <line
                  x1={trendPadding}
                  y1={trendPadding}
                  x2={trendPadding}
                  y2={trendChartHeight - trendPadding}
                  className="response-line-axis"
                />
                <line
                  x1={trendPadding}
                  y1={trendChartHeight - trendPadding}
                  x2={trendChartWidth - trendPadding}
                  y2={trendChartHeight - trendPadding}
                  className="response-line-axis"
                />
                {trendSeriesPoints.map((series) => (
                  <g key={series.name}>
                    <polyline
                      points={series.chartPoints.map((point) => `${point.x},${point.y}`).join(" ")}
                      className="response-line-path"
                      style={{ stroke: series.color }}
                    />
                    {series.chartPoints.map((point) => (
                      <circle
                        key={`${series.name}-${point.key}`}
                        cx={point.x}
                        cy={point.y}
                        r="5"
                        className="response-line-point"
                        style={{ stroke: series.color }}
                      >
                        <title>
                          {series.name}: {point.label} - {formatDuration(point.averageMinutes)} / {point.count} lead
                        </title>
                      </circle>
                    ))}
                  </g>
                ))}
              </svg>
            </div>

            <div className="response-line-day-labels">
              {trendDays.map((day) => (
                <span key={day}>{formatDayLabel(day)}</span>
              ))}
            </div>

            <div className="response-line-legend">
              {personnelDailyTrend.map((series) => (
                <div key={series.name} className="response-line-legend-item">
                  <span className="response-line-dot" style={{ backgroundColor: series.color }} />
                  <strong>{series.name}</strong>
                  <span>
                    Ortalama {formatDuration(series.averageMinutes)} • {series.totalResponses} yanıt
                  </span>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="lead-empty-state">Personel bazlı grafik için henüz yanıt süresi verisi yok.</div>
        )}
      </div>
    </main>
  );
}
