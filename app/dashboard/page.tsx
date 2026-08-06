"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type LeadStatus = "Yeni" | "Arandı" | "Cevap Yok" | "Bekliyor" | "Satıldı";

type Lead = {
  id: string;
  name: string;
  company: string;
  phone: string;
  status: LeadStatus;
  salesPerson: string;
  notes: string;
};

const statusOptions: LeadStatus[] = ["Yeni", "Arandı", "Cevap Yok", "Bekliyor", "Satıldı"];

const statusColors: Record<LeadStatus, string> = {
  "Yeni": "#94a3b8",
  "Arandı": "#10b981",
  "Cevap Yok": "#f59e0b",
  "Bekliyor": "#6366f1",
  "Satıldı": "#ec4899",
};

const formatPercent = (value: number) => `%${value.toFixed(1).replace(".", ",")}`;

export default function DashboardPage() {
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
          setLeads(data.leads);
        }
      } catch (error) {
        console.error(error);
      }
    };

    fetchLeads();
  }, []);

  const statusCounts = useMemo(
    () =>
      statusOptions.map((status) => ({
        status,
        count: leads.filter((lead) => lead.status === status).length,
      })),
    [leads]
  );

  const totalLeads = leads.length;
  const soldCount = statusCounts.find((item) => item.status === "Satıldı")?.count ?? 0;
  const waitingCount = statusCounts.find((item) => item.status === "Bekliyor")?.count ?? 0;
  const unreachableCount = statusCounts.find((item) => item.status === "Cevap Yok")?.count ?? 0;

  const topSalesPeople = useMemo(() => {
    const grouped = new Map<string, { total: number; sold: number }>();

    for (const lead of leads) {
      const current = grouped.get(lead.salesPerson) ?? { total: 0, sold: 0 };
      current.total += 1;
      if (lead.status === "Satıldı") {
        current.sold += 1;
      }
      grouped.set(lead.salesPerson, current);
    }

    return Array.from(grouped.entries())
      .map(([name, counts]) => ({
        name,
        total: counts.total,
        sold: counts.sold,
        ratio: counts.total ? (counts.sold / counts.total) * 100 : 0,
      }))
      .sort((left, right) => right.total - left.total || right.sold - left.sold)
      .slice(0, 8);
  }, [leads]);

  const companyHighlights = useMemo(() => {
    const grouped = new Map<string, number>();

    for (const lead of leads) {
      const companyName = lead.company || "Belirtilmemiş";
      grouped.set(companyName, (grouped.get(companyName) ?? 0) + 1);
    }

    return Array.from(grouped.entries())
      .map(([company, total]) => ({ company, total }))
      .sort((left, right) => right.total - left.total)
      .slice(0, 6);
  }, [leads]);

  const summaryText = useMemo(() => {
    if (!totalLeads) {
      return "Henüz analiz edilecek lead verisi yok.";
    }

    const soldRate = totalLeads ? (soldCount / totalLeads) * 100 : 0;
    const waitingRate = totalLeads ? (waitingCount / totalLeads) * 100 : 0;
    const unreachableRate = totalLeads ? (unreachableCount / totalLeads) * 100 : 0;

    return `Toplam ${totalLeads} lead içinde satış oranı ${formatPercent(
      soldRate
    )}. Bekleyen kayıt oranı ${formatPercent(waitingRate)}, cevap alınamayan kayıt oranı ise ${formatPercent(unreachableRate)}.`;
  }, [soldCount, totalLeads, unreachableCount, waitingCount]);

  const maxStatusCount = Math.max(...statusCounts.map((item) => item.count), 1);
  const maxSalesCount = Math.max(...topSalesPeople.map((item) => item.total), 1);
  const bestPerformer = topSalesPeople[0] ?? null;

  return (
    <main className="container">
      <div className="header">
        <div>
          <h1>Satış Dashboard</h1>
          <p>Tüm lead verilerini grafiklerle inceleyin, satışçı performansını ve durum dağılımını tek ekranda görün.</p>
        </div>
      </div>

      <div className="grid dashboard-summary-grid">
        <div className="card metric-card">
          <span className="metric-label">Toplam Lead</span>
          <strong className="metric-value">{totalLeads}</strong>
        </div>
        <div className="card metric-card">
          <span className="metric-label">Satışa Dönen</span>
          <strong className="metric-value">{soldCount}</strong>
        </div>
        <div className="card metric-card">
          <span className="metric-label">Bekleyen</span>
          <strong className="metric-value">{waitingCount}</strong>
        </div>
        <div className="card metric-card">
          <span className="metric-label">Cevap Yok</span>
          <strong className="metric-value">{unreachableCount}</strong>
        </div>
      </div>

      <div className="card" style={{ marginTop: 24 }}>
        <h2>Genel Analiz</h2>
        <p className="muted-text">{summaryText}</p>
      </div>

      <div className="grid" style={{ marginTop: 24 }}>
        <div className="card">
          <h2>Durum Dağılımı</h2>
          <div className="chart-list">
            {statusCounts.map((item) => {
              const width = totalLeads ? (item.count / maxStatusCount) * 100 : 0;
              const rate = totalLeads ? (item.count / totalLeads) * 100 : 0;

              return (
                <div key={item.status} className="chart-row">
                  <div className="chart-row-header">
                    <span>{item.status}</span>
                    <strong>
                      {item.count} • {formatPercent(rate)}
                    </strong>
                  </div>
                  <div className="chart-track">
                    <div
                      className="chart-bar"
                      style={{ width: `${width}%`, backgroundColor: statusColors[item.status] }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="card">
          <h2>Satışçı Performansı</h2>
          {bestPerformer && (
            <div className="performance-highlight">
              <span className="performance-highlight-label">Öne Çıkan Satışçı</span>
              <strong className="performance-highlight-name">{bestPerformer.name}</strong>
              <p className="chart-note">
                {bestPerformer.total} lead içinde {bestPerformer.sold} satış yaptı. Dönüşüm oranı{" "}
                {formatPercent(bestPerformer.ratio)}.
              </p>
            </div>
          )}

          <div className="performance-list">
            {topSalesPeople.map((item, index) => (
              <div key={item.name} className="performance-card">
                <div className="performance-card-header">
                  <div>
                    <div className="performance-rank-row">
                      <span className="performance-rank">#{index + 1}</span>
                      <strong>{item.name}</strong>
                    </div>
                    <p className="chart-note">
                      {item.total} lead • {item.sold} satış
                    </p>
                  </div>
                  <div className="performance-rate-badge">{formatPercent(item.ratio)}</div>
                </div>

                <div className="chart-track performance-track">
                  <div
                    className="chart-bar chart-bar-sales"
                    style={{ width: `${(item.total / maxSalesCount) * 100}%` }}
                  />
                </div>

                <div className="performance-stats">
                  <span>Toplam fırsat: {item.total}</span>
                  <span>Kapanan satış: {item.sold}</span>
                </div>
              </div>
            ))}
            {topSalesPeople.length === 0 && <p className="muted-text">Gösterilecek satışçı verisi yok.</p>}
          </div>
        </div>
      </div>

      <div className="grid" style={{ marginTop: 24 }}>
        <div className="card">
          <h2>Öne Çıkan Şirketler</h2>
          <table className="table">
            <thead>
              <tr>
                <th>Şirket</th>
                <th>Lead Sayısı</th>
              </tr>
            </thead>
            <tbody>
              {companyHighlights.map((item) => (
                <tr key={item.company}>
                  <td>{item.company}</td>
                  <td>{item.total}</td>
                </tr>
              ))}
              {companyHighlights.length === 0 && (
                <tr>
                  <td colSpan={2}>Şirket verisi bulunamadı.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="card">
          <h2>Yorum</h2>
          <p className="muted-text">
            Bu ekran, hangi satışçının daha fazla lead yönettiğini, hangi durumların öne çıktığını ve satışa dönüşen kayıtların genel oranını hızlıca görmeniz için hazırlandı.
          </p>
          <p className="muted-text">
            Özellikle <strong>Bekliyor</strong> ve <strong>Cevap Yok</strong> oranları yükselirse geri dönüş sürecini hızlandırmak, <strong>Satıldı</strong> oranı yüksek satışçıların çalışma biçimini örnek almak faydalı olur.
          </p>
        </div>
      </div>
    </main>
  );
}
