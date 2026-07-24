"use client";

import { useEffect, useMemo, useState } from "react";

type Lead = {
  id: string;
  name: string;
  company: string;
  phone: string;
  status: "New" | "Called" | "No Answer" | "Waiting";
  salesPerson: string;
  notes: string;
};

type SalesPerson = {
  id: string;
  name: string;
};

type EditModalState = {
  lead: Lead | null;
  notes: string;
  status: Lead["status"];
};

const salesPeople: SalesPerson[] = [
  { id: "p-1", name: "NAZLICAN TUĞAL" },
  { id: "p-2", name: "ÇAĞAN GENCER" },
  { id: "p-3", name: "NURGÜL KOÇ" },
  { id: "p-4", name: "YELİZ KABAKÇI" },
  { id: "p-5", name: "ERDİNÇ KÖSEBİŞ" },
  { id: "p-6", name: "YAREN DİKİLİTAŞ" },
  { id: "p-7", name: "LEYLA SANEM UZUN" },
  { id: "p-8", name: "OKAN ZİYLAN" },
  { id: "p-9", name: "MUSTAFA ŞAHŞER ŞAHİN" },
  { id: "p-10", name: "ŞİYAR KARADERE" },
  { id: "p-11", name: "ÖZLEM YENER" },
  { id: "p-12", name: "SİMAY KÖROĞLU" },
  { id: "p-13", name: "SELİN ÖZBEY" },
  { id: "p-14", name: "SEFA AYDAŞ" },
  { id: "p-15", name: "RAMAZAN KOÇAK" },
  { id: "p-16", name: "MUSA GÜNEŞ" },
  { id: "p-17", name: "GİZEM BİLGİ" },
  { id: "p-18", name: "FURKAN YILMAZ" },
  { id: "p-19", name: "ELİF DİLAN EKİCİ" },
  { id: "p-20", name: "ECEM BALKI" },
  { id: "p-21", name: "CEREN VAREL" },
  { id: "p-22", name: "CEMAL HALİL EMİR" },
  { id: "p-23", name: "BEDİRHAN HEKİM" },
  { id: "p-24", name: "BAHAR KELEŞ" },
];

const initialLeads: Lead[] = [];

const normalizeStatus = (value: unknown): Lead["status"] => {
  const raw = String(value ?? "").trim();
  if (/called/i.test(raw) || /aran(dı|dı)/i.test(raw)) return "Called";
  if (/no answer/i.test(raw) || /cevap/i.test(raw)) return "No Answer";
  if (/waiting/i.test(raw) || /bekle/i.test(raw)) return "Waiting";
  return "New";
};

const normalizeString = (value: unknown) => String(value ?? "").trim();

const normalizeKey = (value: string) =>
  normalizeString(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const getRowValue = (row: Record<string, unknown>, keys: string[]) => {
  const normalizedRow: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    normalizedRow[normalizeKey(key)] = value;
  }

  const availableKeys = Object.keys(normalizedRow);

  for (const key of keys) {
    const normalizedKey = normalizeKey(key);
    const value = normalizedRow[normalizedKey];
    if (value !== undefined && value !== null) {
      const normalizedValue = normalizeString(value);
      if (normalizedValue) return normalizedValue;
    }
  }

  for (const key of keys) {
    const normalizedKey = normalizeKey(key);
    const foundKey = availableKeys.find(
      (availableKey) =>
        availableKey.includes(normalizedKey) || normalizedKey.includes(availableKey)
    );
    if (foundKey) {
      const normalizedValue = normalizeString(normalizedRow[foundKey]);
      if (normalizedValue) return normalizedValue;
    }
  }

  return "";
};

const findSalesPerson = (value: string) => {
  const normalizedValue = normalizeKey(value);
  const exactMatch = salesPeople.find((person) => normalizeKey(person.name) === normalizedValue);
  if (exactMatch) return exactMatch.name;
  const partialMatch = salesPeople.find((person) => normalizeKey(person.name).includes(normalizedValue) || normalizedValue.includes(normalizeKey(person.name)));
  return partialMatch?.name ?? "";
};

export default function HomePage() {
  const [currentPerson, setCurrentPerson] = useState<SalesPerson>(salesPeople[0]);
  const [leads, setLeads] = useState<Lead[]>(initialLeads);
  const [searchTerm, setSearchTerm] = useState("");
  const [showAllLeads, setShowAllLeads] = useState(false);
  const [modalState, setModalState] = useState<EditModalState | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncError, setSyncError] = useState<string | null>(null);

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
          const payload = await response.json().catch(() => null);
          const message = payload?.error || `Leads fetch failed ${response.status}`;
          setSyncError(message);
          console.error(message);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "Leads fetch failed";
        setSyncError(message);
        console.error("Leads fetch failed", error);
      } finally {
        setLoading(false);
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
      setSyncError("Lead kaydedilirken hata oluştu.");
    }
  };

  const saveAllLeadsToDb = async (updatedLeads: Lead[]) => {
    try {
      const response = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leads: updatedLeads }),
      });
      if (!response.ok) {
        throw new Error("Failed to persist leads");
      }
    } catch (error) {
      console.error(error);
      setSyncError("Leadler veritabanına kaydedilemedi.");
    }
  };

  const deleteLeadsFromDb = async (ids: string[]) => {
    try {
      const response = await fetch("/api/leads", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
      if (!response.ok) {
        throw new Error("Failed to delete leads");
      }
    } catch (error) {
      console.error(error);
      setSyncError("Leadler silinirken hata oluştu.");
    }
  };

  const personLeads = useMemo(
    () => leads.filter((lead) => lead.salesPerson === currentPerson.name),
    [leads, currentPerson.name]
  );

  const displayedLeads = useMemo(
    () => (showAllLeads ? leads : personLeads),
    [leads, personLeads, showAllLeads]
  );

  const filteredLeads = useMemo(
    () =>
      displayedLeads.filter(
        (lead) =>
          lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          lead.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
          lead.phone.includes(searchTerm)
      ),
    [displayedLeads, searchTerm]
  );

  const counts = useMemo(
    () => ({
      total: displayedLeads.length,
      called: displayedLeads.filter((lead) => lead.status === "Called").length,
      waiting: displayedLeads.filter((lead) => lead.status === "Waiting").length,
      noAnswer: displayedLeads.filter((lead) => lead.status === "No Answer").length,
    }),
    [displayedLeads]
  );

  const deleteDisplayedLeads = async () => {
    if (filteredLeads.length === 0) return;

    const idsToDelete = filteredLeads.map((lead) => lead.id);
    setLeads((current) => current.filter((lead) => !filteredLeads.some((filtered) => filtered.id === lead.id)));
    setSearchTerm("");
    await deleteLeadsFromDb(idsToDelete);
  };

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

  const distributeLeadsEvenly = async () => {
    setLeads((current) => {
      const updated = current.map((lead, index) => ({
        ...lead,
        salesPerson: salesPeople[index % salesPeople.length].name,
      }));
      saveAllLeadsToDb(updated);
      return updated;
    });

    setShowAllLeads(true);
    setCurrentPerson(salesPeople[0]);
  };

  return (
    <main className="container">
      <div className="header">
        <div>
          <h1>Lead Yönetimi</h1>
          <p>Personel seçerek leadlerinizi görüntüleyin, durum güncelleyin ve not ekleyin.</p>
        </div>
        <div style={{ minWidth: 240 }}>
          <label htmlFor="sales-person">Personel seçiniz</label>
          <select
            id="sales-person"
            value={currentPerson.id}
            onChange={(event) => {
              const selected = salesPeople.find((p) => p.id === event.target.value);
              if (selected) setCurrentPerson(selected);
            }}
          >
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
          <h2>Genel Bilgiler</h2>
          <p>Seçili personel: <strong>{currentPerson.name}</strong></p>
          <p>{showAllLeads ? "Tüm leadler" : "Toplam lead"}: <strong>{counts.total}</strong></p>
          <p>Aranmış lead: <strong>{counts.called}</strong></p>
          <p>Bekleyen lead: <strong>{counts.waiting}</strong></p>
          <p>Cevap alınamayan lead: <strong>{counts.noAnswer}</strong></p>
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
          <p style={{ marginTop: 12 }}>
            Gösterilen lead: <strong>{filteredLeads.length}</strong> / {personLeads.length}
          </p>
        </div>
      </div>

      <div className="grid" style={{ marginTop: 24 }}>
        <div className="card">
          <h2>Veri Senkronizasyonu</h2>
          {loading ? (
            <p>Leadler yükleniyor...</p>
          ) : syncError ? (
            <p style={{ color: "#dc2626" }}>{syncError}</p>
          ) : (
            <p>Veritabanından leadler başarıyla yüklendi.</p>
          )}
          <button onClick={deleteDisplayedLeads}>Filtrelenmiş leadleri sil</button>
          <button onClick={distributeLeadsEvenly} style={{ marginLeft: 12 }}>
            Leadleri eşit dağıt
          </button>
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
                    lead.status === "Called"
                      ? "status-calls"
                      : lead.status === "No Answer"
                      ? "status-pending"
                      : lead.status === "Waiting"
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
                <td colSpan={7}>Seçili persona ait lead bulunamadı.</td>
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
              <option value="New">New</option>
              <option value="Called">Called</option>
              <option value="No Answer">No Answer</option>
              <option value="Waiting">Waiting</option>
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
