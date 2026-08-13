"use client";

import { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { Lead, findSalesPerson, getRowValue, normalizeStatus, salesPeople } from "../shared";

export default function UploadPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteMessage, setDeleteMessage] = useState<string | null>(null);
  const [isDeletingNoAnswer, setIsDeletingNoAnswer] = useState(false);

  const fetchLeads = async () => {
    try {
      const response = await fetch("/api/leads", { cache: "no-store" });
      if (response.ok) {
        const data = await response.json();
        setLeads(Array.isArray(data.leads) ? data.leads : []);
      }
    } catch (error) {
      console.error("Leads fetch failed", error);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, []);

  const noAnswerLeadIds = useMemo(
    () => leads.filter((lead) => lead.status === "Cevap Yok").map((lead) => lead.id),
    [leads]
  );

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadError(null);
    setUploadMessage(null);

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      if (!sheet) {
        throw new Error("Excel dosyasında ilk sayfa bulunamadı.");
      }

      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
      if (rows.length === 0) {
        throw new Error("Excel dosyasında veri bulunamadı. Lütfen doğru sayfayı ve başlıkları kontrol edin.");
      }

      const importedLeads: Lead[] = rows.map((row, index) => {
        const id = getRowValue(row, ["id", "lead id", "leadid", "lead"]);
        const name = getRowValue(row, ["ad", "isim", "name", "full name"]) || `Lead ${index + 1}`;
        const company = getRowValue(row, ["şirket", "company", "firma"]);
        const phone = getRowValue(row, ["telefon", "phone", "cep", "telefon no"]);
        const salesPerson = findSalesPerson(
          getRowValue(row, ["personel", "salesperson", "assigned to", "atanan", "sorumlu", "temsilci"])
        ) || salesPeople[0].name;
        const status = normalizeStatus(getRowValue(row, ["durum", "status", "aranıp", "arandı", "cevap"]));
        const notes = getRowValue(row, ["not", "notes", "açıklama", "yorum"]);

        return {
          id: id || `lead-${Date.now()}-${index}`,
          name,
          company,
          phone,
          status,
          salesPerson,
          notes,
        };
      });

      const allSamePerson = importedLeads.every((lead) => lead.salesPerson === salesPeople[0].name);
      const finalLeads = allSamePerson
        ? importedLeads.map((lead, index) => ({
            ...lead,
            salesPerson: salesPeople[index % salesPeople.length].name,
          }))
        : importedLeads;

      const response = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leads: finalLeads }),
      });

      if (!response.ok) {
        const text = await response.text();
        let message = `Sunucu hatası: ${response.status}`;
        try {
          const payload = JSON.parse(text);
          message = payload.error || message;
        } catch {
          if (text) message = text;
        }
        throw new Error(message);
      }

      setUploadMessage(`${finalLeads.length} lead başarıyla yüklendi. Ana sayfaya dönün.`);
      await fetchLeads();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Excel dosyası yüklenemedi. Lütfen sütun başlıklarını kontrol edin.";
      setUploadError(message);
      console.error(error);
    }
  };

  const deleteNoAnswerLeads = async () => {
    if (!noAnswerLeadIds.length || isDeletingNoAnswer) return;

    const confirmed = window.confirm(
      `${noAnswerLeadIds.length} adet cevap yok lead kalıcı olarak silinsin mi?`
    );

    if (!confirmed) return;

    setDeleteError(null);
    setDeleteMessage(null);
    setIsDeletingNoAnswer(true);

    try {
      const response = await fetch("/api/leads", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: noAnswerLeadIds }),
      });

      if (!response.ok) {
        throw new Error("Cevap yok leadler silinemedi.");
      }

      setLeads((current) => current.filter((lead) => !noAnswerLeadIds.includes(lead.id)));
      setDeleteMessage(`${noAnswerLeadIds.length} cevap yok lead silindi.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Cevap yok leadler silinemedi. Lütfen tekrar deneyin.";
      setDeleteError(message);
      console.error(error);
    } finally {
      setIsDeletingNoAnswer(false);
    }
  };

  return (
    <main className="container">
      <div className="header">
        <div>
          <h1>Veri Yükle</h1>
          <p>Excel dosyanızı bu sayfadan yükleyin. Yükleme tamamlandıktan sonra ana sayfaya dönerek leadleri görüntüleyebilirsiniz.</p>
        </div>
      </div>

      <div className="card">
        <p>Excel dosyanızda personel ataması, durum ve not alanları varsa bu dosyayı yükleyebilirsiniz.</p>
        <input type="file" accept=".xlsx,.xls" onChange={handleFileUpload} />
        {uploadError && <p style={{ color: "#dc2626", marginTop: 12 }}>{uploadError}</p>}
        {uploadMessage && <p style={{ color: "#16a34a", marginTop: 12 }}>{uploadMessage}</p>}
      </div>

      <div className="card" style={{ marginTop: 24 }}>
        <div className="lead-list-toolbar">
          <div>
            <h2>Cevap Yok Temizliği</h2>
            <p className="muted-text" style={{ marginBottom: 0 }}>
              Sistemdeki cevap yok lead sayısı: <strong>{noAnswerLeadIds.length}</strong>
            </p>
          </div>
          <button
            className="danger"
            disabled={noAnswerLeadIds.length === 0 || isDeletingNoAnswer}
            onClick={deleteNoAnswerLeads}
          >
            {isDeletingNoAnswer ? "Siliniyor..." : `Cevap Yokları Sil (${noAnswerLeadIds.length})`}
          </button>
        </div>
        {deleteError && <p style={{ color: "#dc2626", marginTop: 12 }}>{deleteError}</p>}
        {deleteMessage && <p style={{ color: "#16a34a", marginTop: 12 }}>{deleteMessage}</p>}
      </div>
    </main>
  );
}
