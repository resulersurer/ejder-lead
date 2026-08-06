"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Lead, SalesPerson, salesPeople, statusOptions } from "./shared";

const initialLeads: Lead[] = [];

type EditModalState = {
  lead: Lead | null;
  notes: string;
  status: Lead["status"];
};

export default function HomePage() {
  const [currentPersonId, setCurrentPersonId] = useState<string>("all");
  const [leads, setLeads] = useState<Lead[]>(initialLeads);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [modalState, setModalState] = useState<EditModalState | null>(null);

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
    } catch (error) {
      console.error(error);
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
      personLeads.filter((lead) => {
        const matchesSearch =
          lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          lead.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
          lead.phone.includes(searchTerm);
        const matchesStatus = selectedStatus === "all" || lead.status === selectedStatus;
        return matchesSearch && matchesStatus;
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

  const openModal = (lead: Lead) => {
    setModalState({ lead, notes: lead.notes, status: lead.status });
  };

  const closeModal = () => setModalState(null);

  const saveLead = async () => {
    if (!modalState?.lead) return;

    const updatedLead = { ...modalState.lead, status: modalState.status, notes: modalState.notes };
    setLeads((current) =>
      current.map((lead) => (lead.id === updatedLead.id ? updatedLead : lead))
    );
    closeModal();
    await saveLeadToDb(updatedLead);
  };

  return (
    <main className="container">
      <div className="header">
        <div>
          <h1>Lead Yönetimi</h1>
          <p>Personel seçerek leadlerinizi görüntüleyin, durum güncelleyin ve not ekleyin.</p>
        </div>
        <div className="header-actions">
          <Link href="/dashboard" className="button-link">
            Dashboard
          </Link>
        </div>
        <div style={{ minWidth: 240 }}>
          <label htmlFor="sales-person">Personel seçiniz</label>
          <select
            id="sales-person"
            value={currentPersonId}
            onChange={(event) => setCurrentPersonId(event.target.value)}
          >
            <option value="all">Tüm satışçılar</option>
            {salesPeople.map((person) => (
              <option key={person.id} value={person.id}>
                {person.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid">
        <div className="card">
          <h2>Dashboard</h2>
          <p>Seçili satışçı: <strong>{currentPerson?.name ?? "Tüm satışçılar"}</strong></p>
          <p>Toplam lead: <strong>{counts.total}</strong></p>
          <p>Arandı: <strong>{counts.called}</strong></p>
          <p>Bekliyor: <strong>{counts.waiting}</strong></p>
          <p>Cevap yok: <strong>{counts.noAnswer}</strong></p>
          <p>Satıldı: <strong>{counts.sold}</strong></p>
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
        <table className="table">
          <thead>
            <tr>
              <th>Ad</th>
              <th>Şirket</th>
              <th>Telefon</th>
              <th>Personel</th>
              <th>Durum</th>
              <th>Not</th>
              <th>İşlem</th>
            </tr>
          </thead>
          <tbody>
            {filteredLeads.map((lead) => (
              <tr key={lead.id}>
                <td>{lead.name}</td>
                <td>{lead.company}</td>
                <td>{lead.phone}</td>
                <td>{lead.salesPerson}</td>
                <td>
                  <span className={`badge ${
                    lead.status === "Arandı"
                      ? "status-calls"
                      : lead.status === "Cevap Yok"
                      ? "status-pending"
                      : lead.status === "Bekliyor"
                      ? "status-notes"
                      : lead.status === "Satıldı"
                      ? "status-notes"
                      : ""
                  }`}>
                    {lead.status}
                  </span>
                </td>
                <td>{lead.notes ? lead.notes : "—"}</td>
                <td>
                  <button onClick={() => openModal(lead)}>Düzenle</button>
                </td>
              </tr>
            ))}
            {filteredLeads.length === 0 && (
              <tr>
                <td colSpan={7}>Seçili filtrelere uygun lead bulunamadı.</td>
              </tr>
            )}
          </tbody>
        </table>
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
