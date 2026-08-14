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

const formatPercent = (value: number) => `%${value.toFixed(1).replace(".", ",")}`;

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

  const maxAverageMinutes = Math.max(...salespersonStats.map((item) => item.averageMinutes), 1);
  const maxBucketCount = Math.max(...buckets.map((item) => item.count), 1);

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
            Ortalama süre düştükçe lead sıcaklığı korunur. Yanıt oranı düşük satışçılarda önce durum güncelleme
            alışkanlığını kontrol etmek faydalı olur.
          </p>
        </div>
      </div>

      <div className="card" style={{ marginTop: 24 }}>
        <h2>Satışçı Bazlı Yanıt Süresi</h2>
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
          {salespersonStats.length === 0 && <p className="muted-text">Gösterilecek satışçı verisi yok.</p>}
        </div>
      </div>
    </main>
  );
}
