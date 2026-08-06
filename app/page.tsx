"use client";

import { useEffect, useMemo, useState } from "react";

type Lead = {
  id: string;
  name: string;
  company: string;
  phone: string;
  status: "Yeni" | "Arandı" | "Cevap Yok" | "Bekliyor" | "Satıldı";
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

const statusOptions: Lead["status"][] = ["Yeni", "Arandı", "Cevap Yok", "Bekliyor", "Satıldı"];

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
  if (/sold|sat[ıi]ld[ıi]/i.test(raw)) return "Satıldı";
  if (/called/i.test(raw) || /aran(dı|di)/i.test(raw)) return "Arandı";
  if (/no answer/i.test(raw) || /cevap/i.test(raw)) return "Cevap Yok";
  if (/waiting/i.test(raw) || /bekle/i.test(raw)) return "Bekliyor";
  return "Yeni";
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
