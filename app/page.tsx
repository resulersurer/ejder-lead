"use client";

import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { Lead, SalesPerson, salesPeople, statusOptions } from "./shared";
import { fallbackTeamMessages, type TeamMessage } from "./teamMessages";

const initialLeads: Lead[] = [];
const TEAM_MESSAGE_INTERVAL_MS = 60 * 60 * 1_000;
const FETCH_LIMIT = 500;

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
  const [totalLeads, setTotalLeads] = useState(0);
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({
    "Yeni": 0,
    "Arandı": 0,
    "Cevap Yok": 0,
    "Bekliyor": 0,
    "Satıldı": 0,
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [modalState, setModalState] = useState<EditModalState | null>(null);
  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  const [teamMessages, setTeamMessages] = useState<TeamMessage[]>(fallbackTeamMessages);
  const [teamMessageIndex, setTeamMessageIndex] = useState(0);
  const [callingLeadId, setCallingLeadId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const offsetRef = useRef(0);
  const isLoadingRef = useRef(false);

  const currentPerson = useMemo(
    () => salesPeople.find((person) => person.id === currentPersonId) ?? null,
    [currentPersonId]
  );

  // Arama terimini debounce et
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const fetchLeads = useCallback(async (reset = true) => {
    if (isLoadingRef.current) return;
    isLoadingRef.current = true;
    setIsLoading(true);

    try {
      const params = new URLSearchParams();
      params.set("limit", String(FETCH_LIMIT));
      params.set("offset", String(reset ? 0 : offsetRef.current));
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (selectedStatus !== "all") params.set("status", selectedStatus);
      if (currentPersonId !== "all" && currentPerson) params.set("person", currentPerson.name);

      const response = await fetch(`/api/leads?${params.toString()}`, { cache: "no-store" });
      if (!response.ok) {
        console.error("Leads fetch failed", response.status);
        return;
      }

      const data = await response.json();
      const fetchedLeads = (Array.isArray(data.leads) ? data.leads : []) as Lead[];
      if (reset) {
        setLeads(fetchedLeads);
        offsetRef.current = fetchedLeads.length;
      } else {
        setLeads((current) => {
          const existing = new Set(current.map((lead) => lead.id));
          return [...current, ...fetchedLeads.filter((lead) => !existing.has(lead.id))];
        });
        offsetRef.current += fetchedLeads.length;
      }

      if (typeof data.total === "number") setTotalLeads(data.total);
      if (data.statusCounts) setStatusCounts(data.statusCounts);
    } catch (error) {
      console.error("Leads fetch failed", error);
    } finally {
      isLoadingRef.current = false;
      setIsLoading(false);
    }
  }, [debouncedSearch, selectedStatus, currentPersonId, currentPerson]);

  // Filtreler değiştiğinde yeniden yükle
  useEffect(() => {
    fetchLeads(true);
  }, [fetchLeads]);

  const loadMore = async () => {
    if (isLoadingMore || isLoadingRef.current) return;
    setIsLoadingMore(true);
    try {
      const params = new URLSearchParams();
      params.set("limit", String(FETCH_LIMIT));
      params.set("offset", String(offsetRef.current));
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (selectedStatus !== "all") params.set("status", selectedStatus);
      if (currentPersonId !== "all" && currentPerson) params.set("person", currentPerson.name);

      const response = await fetch(`/api/leads?${params.toString()}`, { cache: "no-store" });
      if (!response.ok) {
        console.error("Leads fetch failed", response.status);
        return;
      }

      const data = await response.json();
      const newLeads = (Array.isArray(data.leads) ? data.leads : []) as Lead[];
      setLeads((current) => {
        const existing = new Set(current.map((lead) => lead.id));
        return [...current, ...newLeads.filter((lead) => !existing.has(lead.id))];
      });
      offsetRef.current += newLeads.length;
      if (typeof data.total === "number") setTotalLeads(data.total);
    } catch (error) {
      console.error("Load more failed", error);
    } finally {
      setIsLoadingMore(false);
    }
  };

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

  const counts = useMemo(
    () => ({
      total: totalLeads,
      called: statusCounts["Arandı"] ?? 0,
      waiting: statusCounts["Bekliyor"] ?? 0,
      noAnswer: statusCounts["Cevap Yok"] ?? 0,
      sold: statusCounts["Satıldı"] ?? 0,
    }),
    [totalLeads, statusCounts]
  );

  const statusChart = useMemo(
    () => [
      { label: "Yeni", value: statusCounts["Yeni"] ?? 0, color: "#94a3b8" },
      { label: "Arandı", value: counts.called, color: "#10b981" },
      { label: "Bekliyor", value: counts.waiting, color: "#6366f1" },
      { label: "Cevap Yok", value: counts.noAnswer, color: "#f59e0b" },
      { label: "Satıldı", value: counts.sold, color: "#ec4899" },
    ],
    [counts, statusCounts]
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

  const initiateCall = async (lead: Lead) => {
    try {
      const person = salesPeople.find(p => p.name === lead.salesPerson);
      if (!person?.extension) {
        alert("Bu satış temsilcisi için dahili numara (extension) bulunamadı.");
        return;
      }
      
      setCallingLeadId(lead.id);
      const response = await fetch("/api/call", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ extension: person.extension, destination: lead.phone })
      });
      
      const data = await response.json();
      if (!response.ok) {
        alert(data.error || "Arama başlatılamadı");
      } else {
        alert("Çağrı başlatıldı! Lütfen dahili telefonunuzu açın.");
      }
    } catch (error) {
      console.error(error);
      alert("Beklenmeyen bir hata oluştu.");
    } finally {
      setCallingLeadId(null);
    }
  };

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
      // Durum sayılarını güncelle
      const newStatus = savedLead.status;
      const oldStatus = updatedLead.status !== savedLead.status ? savedLead.status : null;
      setStatusCounts((current) => {
        const next = { ...current };
        if (oldStatus) next[oldStatus] = Math.max(0, (next[oldStatus] ?? 0) - 1);
        next[newStatus] = (next[newStatus] ?? 0) + 1;
        return next;
      });
    }
  };

  const hasMore = leads.length < totalLeads;

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
              <strong className="metric-value">{counts.total.toLocaleString("tr-TR")}</strong>
            </div>
            <div className="metric-card soft-metric-card">
              <span className="metric-label">Arandı</span>
              <strong className="metric-value">{counts.called.toLocaleString("tr-TR")}</strong>
            </div>
            <div className="metric-card soft-metric-card">
              <span className="metric-label">Bekliyor</span>
              <strong className="metric-value">{counts.waiting.toLocaleString("tr-TR")}</strong>
            </div>
            <div className="metric-card soft-metric-card">
              <span className="metric-label">Satıldı</span>
              <strong className="metric-value">{counts.sold.toLocaleString("tr-TR")}</strong>
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
                      <strong>{item.value.toLocaleString("tr-TR")}</strong>
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
            placeholder="İsim, tur veya telefon..."
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
            Gösterilen lead: <strong>{leads.length.toLocaleString("tr-TR")}</strong> / {counts.total.toLocaleString("tr-TR")}
          </p>
        </div>
      </div>

      <div className="card" style={{ marginTop: 24 }}>
        <h2>Lead Listesi</h2>
        {isLoading && leads.length === 0 ? (
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "24px 0", color: "#e11d48" }}>
            <span className="call-btn-spinner" style={{ border: "2px solid rgba(225,29,72,0.2)", borderTopColor: "#e11d48" }} />
            <span style={{ fontSize: 14, fontWeight: 600 }}>Leadler yükleniyor...</span>
          </div>
        ) : (
          <div className="lead-list">
            {leads.map((lead) => (
              <div key={lead.id} className="lead-row-card">
                <div className="lead-row-main">
                  <div>
                    <div className="lead-row-title">
                      <strong>{lead.name}</strong>
                      {!lead.touched && lead.status === "Yeni" && (
                        <span className="lead-priority-badge">Yeni Fırsat</span>
                      )}
                    </div>
                    <div className="lead-phone-container">
                      <p className="lead-phone-text">
                        {lead.turname ? `Tur: ${lead.turname}` : "Tur bilgisi yok"} • {lead.phone || "Telefon bilgisi yok"}
                      </p>
                      {lead.phone && (
                        <button 
                          type="button"
                          className="call-btn" 
                          onClick={() => initiateCall(lead)}
                          disabled={callingLeadId === lead.id}
                          title={`${lead.salesPerson} (${salesPeople.find(p => p.name === lead.salesPerson)?.extension || "Dahili Yok"}) dahilisinden aranacak`}
                        >
                          {callingLeadId === lead.id ? (
                            <>
                              <span className="call-btn-spinner" />
                              <span>Aranıyor...</span>
                            </>
                          ) : (
                            <>
                              <svg className="call-btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                              </svg>
                              <span>Tıkla Ara</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
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

            {leads.length === 0 && !isLoading && (
              <div className="lead-empty-state">Seçili filtrelere uygun lead bulunamadı.</div>
            )}

            {hasMore && (
              <div style={{ textAlign: "center", padding: "16px 0" }}>
                <button
                  className="secondary"
                  onClick={loadMore}
                  disabled={isLoadingMore}
                >
                  {isLoadingMore ? "Yükleniyor..." : `Daha Fazla Yükle (${(totalLeads - leads.length).toLocaleString("tr-TR")} kaldı)`}
                </button>
              </div>
            )}
          </div>
        )}
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