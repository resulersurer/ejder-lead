"use client";

import { useEffect, useMemo, useState } from "react";
import { Lead, normalizeStatus, salesPeople, statusOptions } from "../../shared";

type SalesPersonLeadStock = {
  name: string;
  total: number;
  newCount: number;
  called: number;
  noAnswer: number;
  waiting: number;
  sold: number;
  untouchedRate: number;
  completionRate: number;
  status: "finished" | "low" | "active";
};

const formatPercent = (value: number) => `%${value.toFixed(1).replace(".", ",")}`;

const getStatusTone = (status: SalesPersonLeadStock["status"]) => {
  if (status === "finished") return { label: "Lead bitti", className: "stock-badge finished" };
  if (status === "low") return { label: "Az kaldı", className: "stock-badge low" };
  return { label: "Devam ediyor", className: "stock-badge active" };
};

export default function FinishedLeadsPage() {
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

  const salespersonStocks = useMemo<SalesPersonLeadStock[]>(() => {
    return salesPeople
      .map((person) => {
        const personLeads = leads.filter((lead) => lead.salesPerson === person.name);
        const total = personLeads.length;
        const newCount = personLeads.filter((lead) => normalizeStatus(lead.status) === "Yeni").length;
        const called = personLeads.filter((lead) => normalizeStatus(lead.status) === "Arandı").length;
        const noAnswer = personLeads.filter((lead) => normalizeStatus(lead.status) === "Cevap Yok").length;
        const waiting = personLeads.filter((lead) => normalizeStatus(lead.status) === "Bekliyor").length;
        const sold = personLeads.filter((lead) => normalizeStatus(lead.status) === "Satıldı").length;
        const completed = called + noAnswer + waiting + sold;
        const completionRate = total ? (completed / total) * 100 : 0;
        const untouchedRate = total ? (newCount / total) * 100 : 0;
        const status: SalesPersonLeadStock["status"] =
          newCount === 0 ? "finished" : newCount <= 5 ? "low" : "active";

        return {
          name: person.name,
          total,
          newCount,
          called,
          noAnswer,
          waiting,
          sold,
          untouchedRate,
          completionRate,
          status,
        };
      })
      .sort(
        (left, right) =>
          left.newCount - right.newCount ||
          right.completionRate - left.completionRate ||
          right.total - left.total ||
          left.name.localeCompare(right.name, "tr")
      );
  }, [leads]);

  const finishedPeople = salespersonStocks.filter((person) => person.status === "finished");
  const lowPeople = salespersonStocks.filter((person) => person.status === "low");
  const activePeople = salespersonStocks.filter((person) => person.status === "active");
  const totalNewLeads = salespersonStocks.reduce((sum, person) => sum + person.newCount, 0);
  const maxNewLeads = Math.max(...salespersonStocks.map((person) => person.newCount), 1);

  const statusTotals = useMemo(
    () =>
      statusOptions.map((status) => ({
        status,
        count: leads.filter((lead) => normalizeStatus(lead.status) === status).length,
      })),
    [leads]
  );

  return (
    <main className="container">
      <div className="header">
        <div>
          <h1>Lead Biten Personel</h1>
          <p>
            Personelin elinde kaç yeni lead kaldığını görün; leadi biten veya azalan kişilere yeniden dağıtım planı
            yapın.
          </p>
        </div>
      </div>

      <div className="grid dashboard-summary-grid">
        <div className="card metric-card">
          <span className="metric-label">Lead Biten Personel</span>
          <strong className="metric-value">{finishedPeople.length}</strong>
        </div>
        <div className="card metric-card">
          <span className="metric-label">Az Kalan Personel</span>
          <strong className="metric-value">{lowPeople.length}</strong>
        </div>
        <div className="card metric-card">
          <span className="metric-label">Toplam Yeni Lead</span>
          <strong className="metric-value">{totalNewLeads}</strong>
        </div>
        <div className="card metric-card">
          <span className="metric-label">Aktif Personel</span>
          <strong className="metric-value">{activePeople.length}</strong>
        </div>
      </div>

      <div className="grid" style={{ marginTop: 24 }}>
        <div className="card">
          <h2>Öncelikli Dağıtım Listesi</h2>
          <div className="stock-alert-list">
            {[...finishedPeople, ...lowPeople].map((person) => {
              const tone = getStatusTone(person.status);

              return (
                <div key={person.name} className="stock-alert-row">
                  <div>
                    <strong>{person.name}</strong>
                    <p className="chart-note">
                      {person.newCount} yeni lead kaldı • {person.total} toplam lead
                    </p>
                  </div>
                  <span className={tone.className}>{tone.label}</span>
                </div>
              );
            })}
            {finishedPeople.length + lowPeople.length === 0 && (
              <p className="muted-text">Şu an leadi biten veya kritik seviyeye düşen personel yok.</p>
            )}
          </div>
        </div>

        <div className="card">
          <h2>Genel Durum Dağılımı</h2>
          <div className="stock-status-grid">
            {statusTotals.map((item) => (
              <div key={item.status} className="stock-status-card">
                <span>{item.status}</span>
                <strong>{item.count}</strong>
              </div>
            ))}
          </div>
          <p className="muted-text">
            Bu sayfada “lead bitti” hesabı, personelin elindeki <strong>Yeni</strong> durumundaki lead sayısına göre
            yapılır.
          </p>
        </div>
      </div>

      <div className="card" style={{ marginTop: 24 }}>
        <h2>Personel Lead Stoğu</h2>
        <div className="response-table">
          {salespersonStocks.map((person) => {
            const tone = getStatusTone(person.status);

            return (
              <div key={person.name} className="response-person-row">
                <div className="response-person-header">
                  <div>
                    <strong>{person.name}</strong>
                    <p className="chart-note">
                      {person.total} toplam • {person.newCount} yeni • {person.called} arandı • {person.sold} satış
                    </p>
                  </div>
                  <span className={tone.className}>{tone.label}</span>
                </div>

                <div className="chart-track response-track">
                  <div
                    className="chart-bar stock-bar"
                    style={{ width: `${(person.newCount / maxNewLeads) * 100}%` }}
                  />
                </div>

                <div className="response-person-stats">
                  <span>Yeni oranı: {formatPercent(person.untouchedRate)}</span>
                  <span>Tamamlanan işlem oranı: {formatPercent(person.completionRate)}</span>
                  <span>Bekliyor/Cevap Yok: {person.waiting + person.noAnswer}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}
