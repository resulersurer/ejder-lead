"use client";

import { useEffect, useMemo, useState } from "react";
import { Lead, SalesPerson, salesPeople, statusOptions } from "./shared";
import { fallbackTeamMessages, type TeamMessage } from "./teamMessages";

const initialLeads: Lead[] = [];
const TEAM_MESSAGE_INTERVAL_MS = 60 * 60 * 1_000;

type EditModalState = {
  lead: Lead | null;
  notes: string;
  status: Lead["status"];
};

const formatLeadDateTime = (value?: string | null) => {
  if (!value) return "Henüz yok";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Geçersiz tarih";

  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Istanbul",
  }).format(date);
};

const formatLeadResponseDuration = (lead: Lead) => {
  if (!lead.createdAt || !lead.statusUpdatedAt) return "Henüz durum değişmedi";

  const createdAt = new Date(lead.createdAt).getTime();
  const statusUpdatedAt = new Date(lead.statusUpdatedAt).getTime();
  if (Number.isNaN(createdAt) || Number.isNaN(statusUpdatedAt)) return "Süre hesaplanamadı";

  const minutes = Math.max(0, Math.round((statusUpdatedAt - createdAt) / 60000));
  if (minutes < 60) return `${minutes} dk`;

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (hours < 24) return remainingMinutes ? `${hours} sa ${remainingMinutes} dk` : `${hours} sa`;

  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  return remainingHours ? `${days} gün ${remainingHours} sa` : `${days} gün`;
};

export default function HomePage() {
  const [currentPersonId, setCurrentPersonId] = useState<string>("all");
  const [leads, setLeads] = useState<Lead[]>(initialLeads);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [modalState, setModalState] = useState<EditModalState | null>(null);
  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  const [teamMessages, setTeamMessages] = useState<TeamMessage[]>(fallbackTeamMessages);
  const [teamMessageIndex, setTeamMessageIndex] = useState(0);

  useEffect(() => {
    const fetchLeads = async () => {
      try {
        const response = await fetch("/api/leads", { cache: "no-store" });
        if (response.ok) {
          const data = await response.json();
          if (Array.isArray(data.leads) && data.leads.length > 0) {
            setLeads(data.leads);
          }
        } else {
          console.error("Leads fetch failed", response.status);
        }
      } catch (error) {
        console.error("Leads fetch failed", error);
      }
    };

    fetchLeads();
  }, []);

  useEffect(() => {
    const updateTime = () => setCurrentTime(new Date());
    updateTime();
    const intervalId = window.setInterval(updateTime, 60_000);

    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    const fetchTeamMessages = async () => {
      try {
        const response = await fetch("/api/team-messages", { cache: "no-store" });
        if (!response.ok) {
          console.error("Team messages fetch failed", response.status);
          return;
        }

        const data = await response.json();
        if (Array.isArray(data.messages) && data.messages.length > 0) {
          setTeamMessages(data.messages);
        }
      } catch (error) {
        console.error("Team messages fetch failed", error);
      }
    };

    fetchTeamMessages();
  }, []);

  useEffect(() => {
    const updateTeamMessage = () => {
      setTeamMessageIndex(Math.floor(Date.now() / TEAM_MESSAGE_INTERVAL_MS) % teamMessages.length);
    };

    updateTeamMessage();
    const intervalId = window.setInterval(updateTeamMessage, TEAM_MESSAGE_INTERVAL_MS);

    return () => window.clearInterval(intervalId);
  }, [teamMessages.length]);

  const saveLeadToDb = async (lead: Lead) => {
    try {
      const response = await fetch("/api/leads", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lead }),
      });
      if (!response.ok) {
        throw new Error("Failed to save lead");
      }
      const data = await response.json();
      return data.lead as Lead;
    } catch (error) {
      console.error(error);
      return null;
    }
  };

  const currentPerson = useMemo(
    () => salesPeople.find((person) => person.id === currentPersonId) ?? null,
    [currentPersonId]
  );

  const personLeads = useMemo(() => {
    if (currentPersonId === "all") return leads;
    return leads.filter((lead) => lead.salesPerson === currentPerson?.name);
  }, [currentPerson, currentPersonId, leads]);

  const filteredLeads = useMemo(
    () =>
      personLeads
        .filter((lead) => {
          const matchesSearch =
            lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            lead.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
            lead.phone.includes(searchTerm);
          const matchesStatus = selectedStatus === "all" || lead.status === selectedStatus;
          return matchesSearch && matchesStatus;
        })
        .sort((left, right) => {
          const leftUntouched = !left.touched && left.status === "Yeni";
          const rightUntouched = !right.touched && right.status === "Yeni";

          if (leftUntouched === rightUntouched) return 0;
          return leftUntouched ? -1 : 1;
        }),
    [personLeads, searchTerm, selectedStatus]
  );

  const counts = useMemo(
    () => ({
      total: personLeads.length,
      called: personLeads.filter((lead) => lead.status === "Arandı").length,
      waiting: personLeads.filter((lead) => lead.status === "Bekliyor").length,
      noAnswer: personLeads.filter((lead) => lead.status === "Cevap Yok").length,
      sold: personLeads.filter((lead) => lead.status === "Satıldı").length,
    }),
    [personLeads]
  );

  const statusChart = useMemo(
    () => [
      { label: "Yeni", value: personLeads.filter((lead) => lead.status === "Yeni").length, color: "#94a3b8" },
      { label: "Arandı", value: counts.called, color: "#10b981" },
      { label: "Bekliyor", value: counts.waiting, color: "#6366f1" },
      { label: "Cevap Yok", value: counts.noAnswer, color: "#f59e0b" },
      { label: "Satıldı", value: counts.sold, color: "#ec4899" },
    ],
    [counts, personLeads]
  );

  const maxChartValue = Math.max(...statusChart.map((item) => item.value), 1);
  const currentTeamMessage = teamMessages[teamMessageIndex] ?? teamMessages[0];

  const formattedDate = currentTime
    ? new Intl.DateTimeFormat("tr-TR", {
        dateStyle: "full",
        timeZone: "Europe/Istanbul",
      }).format(currentTime)
    : "Tarih yükleniyor";
  const formattedTime = currentTime
    ? new Intl.DateTimeFormat("tr-TR", {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "Europe/Istanbul",
      }).format(currentTime)
    : "--:--";

  const openModal = (lead: Lead) => {
    setModalState({ lead, notes: lead.notes, status: lead.status });
  };

  const closeModal = () => setModalState(null);

  const saveLead = async () => {
    if (!modalState?.lead) return;

    const statusChanged = modalState.lead.status !== modalState.status;
    const updatedLead = {
      ...modalState.lead,
      status: modalState.status,
      notes: modalState.notes,
      touched: true,
      statusUpdatedAt: statusChanged ? new Date().toISOString() : modalState.lead.statusUpdatedAt,
    };
    setLeads((current) =>
      current.map((lead) => (lead.id === updatedLead.id ? updatedLead : lead))
    );
    closeModal();
    const savedLead = await saveLeadToDb(updatedLead);
    if (savedLead) {
      setLeads((current) =>
        current.map((lead) => (lead.id === savedLead.id ? savedLead : lead))
      );
    }
  };

  return (
    <main className="container">
      <div className="page-hero">
        <div className="page-hero-copy">
          <span className="section-kicker">Lead operasyon merkezi</span>
          <h1>Lead Yönetimi</h1>
          <p>Personel seçerek leadlerinizi görüntüleyin, durum güncelleyin ve not ekleyin.</p>
        </div>
        <div className="person-selector-panel">
          <div className="time-summary" aria-label="Güncel tarih ve saat">
            <span>Bugün</span>
            <strong>{formattedTime}</strong>
            <p>{formattedDate}</p>
          </div>
          <label htmlFor="sales-person">Personel seçiniz</label>
          <select
            id="sales-person"
            value={currentPersonId}
            onChange={(event) => setCurrentPersonId(event.target.value)}
          >
            <option value="all">Tüm personel</option>
            {salesPeople.map((person) => (
              <option key={person.id} value={person.id}>
                {person.name}
              </option>
            ))}
          </select>
          <p>{currentPerson?.name ?? "Tüm personel"} kapsamı görüntüleniyor.</p>
        </div>
      </div>

      <div className="grid">
        <div className="card hero-card">
          <div className="hero-card-header">
            <div>
              <h2>Günün Performans Ekranı</h2>
              <p className="hero-text">
                Seçili personel: <strong>{currentPerson?.name ?? "Tüm personel"}</strong>
              </p>
            </div>
            <div className="hero-badge">Motivasyon Yüksek</div>
          </div>

          <div className="dashboard-summary-grid" style={{ marginTop: 20 }}>
            <div className="metric-card soft-metric-card">
              <span className="metric-label">Toplam Lead</span>
              <strong className="metric-value">{counts.total}</strong>
            </div>
            <div className="metric-card soft-metric-card">
              <span className="metric-label">Arandı</span>
              <strong className="metric-value">{counts.called}</strong>
            </div>
            <div className="metric-card soft-metric-card">
              <span className="metric-label">Bekliyor</span>
              <strong className="metric-value">{counts.waiting}</strong>
            </div>
            <div className="metric-card soft-metric-card">
              <span className="metric-label">Satıldı</span>
              <strong className="metric-value">{counts.sold}</strong>
            </div>
          </div>

          <div className="grid" style={{ marginTop: 24 }}>
            <div className="card inner-card">
              <h3>Durum Grafiği</h3>
              <div className="chart-list">
                {statusChart.map((item) => (
                  <div key={item.label} className="chart-row">
                    <div className="chart-row-header">
                      <span>{item.label}</span>
                      <strong>{item.value}</strong>
                    </div>
                    <div className="chart-track chart-track-soft">
                      <div
                        className="chart-bar"
                        style={{
                          width: `${(item.value / maxChartValue) * 100}%`,
                          backgroundColor: item.color,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="card inner-card">
              <h3>Takım Mesajı</h3>
              <blockquote className="team-message-quote">
                “{currentTeamMessage.quote}”
              </blockquote>
              <div className="team-message-meta">
                <strong>{currentTeamMessage.author}</strong>
                <span>{currentTeamMessage.theme}</span>
              </div>
              <p className="muted-text">
                Yeni leadler listenin en üstünde tutuluyor. Hızlı geri dönüş, satış ihtimalini artırır ve ritmi canlı tutar.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid" style={{ marginTop: 24 }}>
        <div className="card">
          <h2>Leadleri filtrele</h2>
          <label htmlFor="search">Ara</label>
          <input
            id="search"
            placeholder="İsim, şirket veya telefon..."
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
          <label htmlFor="status-filter" style={{ marginTop: 16 }}>Durum seçiniz</label>
          <select
            id="status-filter"
            value={selectedStatus}
            onChange={(event) => setSelectedStatus(event.target.value)}
          >
            <option value="all">Tüm durumlar</option>
            {statusOptions.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
          <p style={{ marginTop: 12 }}>
            Gösterilen lead: <strong>{filteredLeads.length}</strong> / {counts.total}
          </p>
        </div>
      </div>

      <div className="card" style={{ marginTop: 24 }}>
        <h2>Lead Listesi</h2>
        <div className="lead-list">
          {filteredLeads.map((lead) => (
            <div key={lead.id} className="lead-row-card">
              <div className="lead-row-main">
                <div>
                  <div className="lead-row-title">
                    <strong>{lead.name}</strong>
                    {!lead.touched && lead.status === "Yeni" && (
                      <span className="lead-priority-badge">Yeni Fırsat</span>
                    )}
                  </div>
                  <p className="lead-row-subtitle">{lead.phone || "Telefon bilgisi yok"}</p>
                </div>

                <div className="lead-row-meta">
                  <span className="lead-chip">{lead.salesPerson}</span>
                  <span
                    className={`badge ${
                      lead.status === "Arandı"
                        ? "status-calls"
                        : lead.status === "Cevap Yok"
                        ? "status-pending"
                        : lead.status === "Bekliyor"
                        ? "status-notes"
                        : lead.status === "Satıldı"
                        ? "status-notes"
                        : ""
                    }`}
                  >
                    {lead.status}
                  </span>
                </div>
              </div>

              <div className="lead-timing-row">
                <span>
                  <strong>Yüklendi</strong>
                  {formatLeadDateTime(lead.createdAt)}
                </span>
                <span>
                  <strong>Durum değişti</strong>
                  {formatLeadDateTime(lead.statusUpdatedAt)}
                </span>
                <span>
                  <strong>Yanıt süresi</strong>
                  {formatLeadResponseDuration(lead)}
                </span>
              </div>

              <div className="lead-row-footer">
                <p className="lead-note">{lead.notes ? lead.notes : "Henüz not eklenmedi."}</p>
                <button onClick={() => openModal(lead)}>Düzenle</button>
              </div>
            </div>
          ))}

          {filteredLeads.length === 0 && (
            <div className="lead-empty-state">Seçili filtrelere uygun lead bulunamadı.</div>
          )}
        </div>
      </div>

      {modalState?.lead && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" onClick={(event) => event.stopPropagation()}>
            <h2>{modalState.lead.name} için düzenle</h2>
            <label htmlFor="status">Durum</label>
            <select
              id="status"
              value={modalState.status}
              onChange={(event) => setModalState((prev) => prev && { ...prev, status: event.target.value as Lead["status"] })}
            >
              {statusOptions.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>

            <label htmlFor="notes">Not</label>
            <textarea
              id="notes"
              value={modalState.notes}
              onChange={(event) => setModalState((prev) => prev && { ...prev, notes: event.target.value })}
            />

            <div className="modal-footer">
              <button className="secondary" onClick={closeModal}>İptal</button>
              <button onClick={saveLead}>Kaydet</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
