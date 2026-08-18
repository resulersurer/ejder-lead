"use client";

import { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { Lead, findSalesPerson, getRowValue, normalizeStatus, salesPeople } from "../shared";

const CHUNK_SIZE = 500;

// Leadleri parçalara bölerek API'ye gönder (Vercel body limitini aşmamak için)
async function uploadLeadsInChunks(leads: Lead[]): Promise<{ count: number; error?: string }> {
  let totalUploaded = 0;

  for (let i = 0; i < leads.length; i += CHUNK_SIZE) {
    const chunk = leads.slice(i, i + CHUNK_SIZE);
    const response = await fetch("/api/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ leads: chunk }),
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

    totalUploaded += chunk.length;
  }

  return { count: totalUploaded };
}

// Personel bazlı yükleme
async function uploadLeadsForPerson(
  file: File,
  personName: string
): Promise<{ count: number; error?: string }> {
  try {
    const data = await file.arrayBuffer();
    const workbook = XLSX.read(data, { type: "array" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    if (!sheet) throw new Error("Excel dosyasında sayfa bulunamadı.");

    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
    if (rows.length === 0) throw new Error("Excel dosyasında veri bulunamadı.");

    const importedLeads: Lead[] = rows.map((row, index) => {
      const id = getRowValue(row, ["id", "lead id", "leadid", "lead"]);
      const name = getRowValue(row, ["ad", "isim", "name", "full name"]) || `Lead ${index + 1}`;
      const turname = getRowValue(row, ["tur", "turname", "tura", "tur adı", "tur adi"]);
      const phone = getRowValue(row, ["telefon", "phone", "cep", "telefon no"]);
      const status = normalizeStatus(getRowValue(row, ["durum", "status", "aranıp", "arandı", "cevap"]));
      const notes = getRowValue(row, ["not", "notes", "açıklama", "yorum"]);
      return {
        id: id || `lead-${Date.now()}-${index}`,
        name,
        turname,
        phone,
        status,
        salesPerson: personName,
        notes,
      };
    });

    return await uploadLeadsInChunks(importedLeads);
  } catch (error) {
    return { count: 0, error: error instanceof Error ? error.message : "Bilinmeyen hata." };
  }
}

export default function UploadPage() {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  const [leads, setLeads] = useState<Lead[]>([]);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteMessage, setDeleteMessage] = useState<string | null>(null);
  const [isDeletingNoAnswer, setIsDeletingNoAnswer] = useState(false);

  // Personel bazlı yükleme state
  const [selectedPerson, setSelectedPerson] = useState<string>(salesPeople[0].name);
  const [personUploadError, setPersonUploadError] = useState<string | null>(null);
  const [personUploadMessage, setPersonUploadMessage] = useState<string | null>(null);
  const [isPersonUploading, setIsPersonUploading] = useState(false);

  // Lead transfer state
  const [transferFrom, setTransferFrom] = useState<string>(salesPeople[0].name);
  const [transferTo, setTransferTo] = useState<string>(salesPeople[1]?.name ?? salesPeople[0].name);
  const [transferError, setTransferError] = useState<string | null>(null);
  const [transferMessage, setTransferMessage] = useState<string | null>(null);
  const [isTransferring, setIsTransferring] = useState(false);

  // Export state
  const [exportError, setExportError] = useState<string | null>(null);
  const [exportMessage, setExportMessage] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

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

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password || isVerifying) return;

    setPasswordError(null);
    setIsVerifying(true);

    try {
      const response = await fetch("/api/verify-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (!response.ok) {
        const text = await response.text();
        let message = "Hatalı şifre.";
        try {
          const payload = JSON.parse(text);
          message = payload.error || message;
        } catch {
          if (text) message = text;
        }
        throw new Error(message);
      }

      setIsUnlocked(true);
      setPassword("");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Şifre doğrulanamadı.";
      setPasswordError(message);
      console.error(error);
    } finally {
      setIsVerifying(false);
    }
  };

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
        const turname = getRowValue(row, ["tur", "turname", "tura", "tur adı", "tur adi"]);
        const phone = getRowValue(row, ["telefon", "phone", "cep", "telefon no"]);
        const salesPerson = findSalesPerson(
          getRowValue(row, ["personel", "salesperson", "assigned to", "atanan", "sorumlu", "temsilci"])
        ) || salesPeople[0].name;
        const status = normalizeStatus(getRowValue(row, ["durum", "status", "aranıp", "arandı", "cevap"]));
        const notes = getRowValue(row, ["not", "notes", "açıklama", "yorum"]);

        return {
          id: id || `lead-${Date.now()}-${index}`,
          name,
          turname,
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

      const result = await uploadLeadsInChunks(finalLeads);
      if (result.error) {
        throw new Error(result.error);
      }

      setUploadMessage(`${result.count} lead başarıyla yüklendi. Ana sayfaya dönün.`);
      await fetchLeads();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Excel dosyası yüklenemedi. Lütfen sütun başlıklarını kontrol edin.";
      setUploadError(message);
      console.error(error);
    }
  };

  const handleTransfer = async () => {
    if (transferFrom === transferTo) {
      setTransferError("Kaynak ve hedef personel aynı olamaz.");
      setTransferMessage(null);
      return;
    }

    const fromCount = leads.filter((lead) => lead.salesPerson === transferFrom).length;
    if (fromCount === 0) {
      setTransferError(`${transferFrom} adına kayıtlı lead bulunamadı.`);
      setTransferMessage(null);
      return;
    }

    const confirmed = window.confirm(
      `${transferFrom} adına kayıtlı ${fromCount} lead, ${transferTo} adına aktarılsın mı?`
    );

    if (!confirmed) return;

    setTransferError(null);
    setTransferMessage(null);
    setIsTransferring(true);

    try {
      const response = await fetch("/api/leads/transfer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fromPerson: transferFrom, toPerson: transferTo }),
      });

      if (!response.ok) {
        const text = await response.text();
        let message = `Transfer hatası: ${response.status}`;
        try {
          const payload = JSON.parse(text);
          message = payload.error || message;
        } catch {
          if (text) message = text;
        }
        throw new Error(message);
      }

      const data = await response.json();
      setTransferMessage(`✓ ${data.transferred} lead ${transferFrom} → ${transferTo} olarak aktarıldı.`);
      await fetchLeads();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Lead transferi gerçekleştirilemedi.";
      setTransferError(message);
      console.error(error);
    } finally {
      setIsTransferring(false);
    }
  };

  const handleExport = async () => {
    if (leads.length === 0) {
      setExportError("Dışa aktarılacak lead bulunamadı.");
      setExportMessage(null);
      return;
    }

    setExportError(null);
    setExportMessage(null);
    setIsExporting(true);

    try {
      const exportData = leads.map((lead) => ({
        "ID": lead.id,
        "Ad Soyad": lead.name,
        "Tur Adı": lead.turname,
        "Telefon": lead.phone,
        "Durum": lead.status,
        "Personel": lead.salesPerson,
        "Notlar": lead.notes,
        "Aranma Durumu": lead.touched ? "Aranıldı" : "Aranmadı",
        "Oluşturulma Tarihi": lead.createdAt ? new Date(lead.createdAt).toLocaleString("tr-TR") : "",
        "Durum Güncelleme": lead.statusUpdatedAt ? new Date(lead.statusUpdatedAt).toLocaleString("tr-TR") : "",
      }));

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Leads");

      // Sütun genişliklerini ayarla
      worksheet["!cols"] = [
        { wch: 20 }, // ID
        { wch: 25 }, // Ad Soyad
        { wch: 20 }, // Tur Adı
        { wch: 18 }, // Telefon
        { wch: 12 }, // Durum
        { wch: 25 }, // Personel
        { wch: 30 }, // Notlar
        { wch: 14 }, // Aranma Durumu
        { wch: 22 }, // Oluşturulma Tarihi
        { wch: 22 }, // Durum Güncelleme
      ];

      const date = new Date().toISOString().slice(0, 10);
      XLSX.writeFile(workbook, `leads-export-${date}.xlsx`);
      setExportMessage(`✓ ${leads.length} lead başarıyla Excel dosyası olarak indirildi.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Excel dosyası oluşturulamadı.";
      setExportError(message);
      console.error(error);
    } finally {
      setIsExporting(false);
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

  if (!isUnlocked) {
    return (
      <main className="container">
        <div className="header">
          <div>
            <h1>Veri Yükle</h1>
            <p>Bu sayfaya erişmek için şifre girmeniz gerekmektedir.</p>
          </div>
        </div>

        <div className="card" style={{ maxWidth: 420, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 20 }}>
            <div style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              background: "#f1f5f9",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 24,
              marginBottom: 12,
            }}>
              🔒
            </div>
            <h2 style={{ margin: "0 0 4px" }}>Şifre Gerekli</h2>
            <p className="muted-text" style={{ margin: 0 }}>
              Veri yükleme sayfasına erişmek için şifrenizi girin.
            </p>
          </div>

          <form onSubmit={handlePasswordSubmit} style={{ display: "grid", gap: 16 }}>
            <div>
              <label htmlFor="upload-password" style={{ fontWeight: 700, fontSize: 13, color: "#1e293b" }}>
                Şifre
              </label>
              <input
                id="upload-password"
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setPasswordError(null);
                }}
                placeholder="••••••••"
                autoFocus
                disabled={isVerifying}
              />
            </div>

            {passwordError && (
              <div style={{
                padding: "12px 16px",
                borderRadius: 12,
                background: "#fff1f2",
                border: "1px solid #fecdd3",
                color: "#be123c",
                fontSize: 14,
                fontWeight: 500,
              }}>
                ⚠️ {passwordError}
              </div>
            )}

            <button className="primary" type="submit" disabled={!password || isVerifying}>
              {isVerifying ? "Doğrulanıyor..." : "Giriş Yap"}
            </button>
          </form>
        </div>
      </main>
    );
  }

  return (
    <main className="container">
      <div className="header">
        <div>
          <h1>Veri Yükle</h1>
          <p>Excel dosyanızı bu sayfadan yükleyin. Yükleme tamamlandıktan sonra ana sayfaya dönerek leadleri görüntüleyebilirsiniz.</p>
        </div>
      </div>

      <div className="card">
        <p>Excel dosyanızı aşağıdaki formata uygun şekilde hazırlayın ve yükleyin.</p>
        <input type="file" accept=".xlsx,.xls" onChange={handleFileUpload} />
        {uploadError && <p style={{ color: "#dc2626", marginTop: 12 }}>{uploadError}</p>}
        {uploadMessage && <p style={{ color: "#16a34a", marginTop: 12 }}>{uploadMessage}</p>}
      </div>

      {/* Excel Format Rehberi */}
      <div className="card" style={{ marginTop: 24 }}>
        <div style={{ marginBottom: 16 }}>
          <span className="section-kicker">Yükleme Rehberi</span>
          <h2 style={{ margin: "8px 0 4px" }}>Excel Formatı</h2>
          <p className="muted-text" style={{ margin: 0 }}>
            Aşağıdaki sütun başlıklarından birini kullanarak Excel dosyanızı hazırlayın. Sütun sırası önemli değildir.
          </p>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #e2e8f0", textAlign: "left" }}>
                <th style={{ padding: "10px 12px", fontWeight: 700, color: "#1e293b" }}>Alan</th>
                <th style={{ padding: "10px 12px", fontWeight: 700, color: "#1e293b" }}>Kabul Edilen Sütun Başlıkları</th>
                <th style={{ padding: "10px 12px", fontWeight: 700, color: "#1e293b" }}>Zorunlu</th>
                <th style={{ padding: "10px 12px", fontWeight: 700, color: "#1e293b" }}>Örnek</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: "1px solid #f1f5f9" }}>
                <td style={{ padding: "10px 12px", fontWeight: 600 }}>Ad Soyad</td>
                <td style={{ padding: "10px 12px" }}>ad, isim, name, full name</td>
                <td style={{ padding: "10px 12px" }}>Evet</td>
                <td style={{ padding: "10px 12px" }}>Ahmet Yılmaz</td>
              </tr>
              <tr style={{ borderBottom: "1px solid #f1f5f9" }}>
                <td style={{ padding: "10px 12px", fontWeight: 600 }}>Tur Adı</td>
                <td style={{ padding: "10px 12px" }}>tur, turname, tura, tur adı, tur adi</td>
                <td style={{ padding: "10px 12px" }}>Hayır</td>
                <td style={{ padding: "10px 12px" }}>Kış Turu 2026</td>
              </tr>
              <tr style={{ borderBottom: "1px solid #f1f5f9" }}>
                <td style={{ padding: "10px 12px", fontWeight: 600 }}>Telefon</td>
                <td style={{ padding: "10px 12px" }}>telefon, phone, cep, telefon no</td>
                <td style={{ padding: "10px 12px" }}>Hayır</td>
                <td style={{ padding: "10px 12px" }}>0532 123 45 67</td>
              </tr>
              <tr style={{ borderBottom: "1px solid #f1f5f9" }}>
                <td style={{ padding: "10px 12px", fontWeight: 600 }}>Durum</td>
                <td style={{ padding: "10px 12px" }}>durum, status, aranıp, arandı, cevap</td>
                <td style={{ padding: "10px 12px" }}>Hayır</td>
                <td style={{ padding: "10px 12px" }}>Yeni, Arandı, Cevap Yok, Bekliyor, Satıldı</td>
              </tr>
              <tr style={{ borderBottom: "1px solid #f1f5f9" }}>
                <td style={{ padding: "10px 12px", fontWeight: 600 }}>Personel</td>
                <td style={{ padding: "10px 12px" }}>personel, salesperson, assigned to, atanan, sorumlu, temsilci</td>
                <td style={{ padding: "10px 12px" }}>Hayır</td>
                <td style={{ padding: "10px 12px" }}>NAZLICAN TUĞAL</td>
              </tr>
              <tr style={{ borderBottom: "1px solid #f1f5f9" }}>
                <td style={{ padding: "10px 12px", fontWeight: 600 }}>Not</td>
                <td style={{ padding: "10px 12px" }}>not, notes, açıklama, yorum</td>
                <td style={{ padding: "10px 12px" }}>Hayır</td>
                <td style={{ padding: "10px 12px" }}>Müşteri pazartesi arayacak</td>
              </tr>
              <tr>
                <td style={{ padding: "10px 12px", fontWeight: 600 }}>ID</td>
                <td style={{ padding: "10px 12px" }}>id, lead id, leadid, lead</td>
                <td style={{ padding: "10px 12px" }}>Hayır</td>
                <td style={{ padding: "10px 12px" }}>L-001</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div style={{ marginTop: 16, padding: "12px 16px", borderRadius: 12, background: "#f8fafc", border: "1px solid #e2e8f0", fontSize: 13, color: "#475569" }}>
          <strong style={{ color: "#1e293b" }}>Not:</strong> Personel sütunu boş veya tanınmayan bir isim içeriyorsa, leadler otomatik olarak tüm personellere sırayla dağıtılır. Durum sütunu boşsa lead "Yeni" olarak kaydedilir.
        </div>
      </div>

      {/* Veri Export */}
      <div className="card" style={{ marginTop: 24 }}>
        <div className="lead-list-toolbar">
          <div>
            <h2>Veri Export</h2>
            <p className="muted-text" style={{ marginBottom: 0 }}>
              Sistemdeki tüm leadleri Excel dosyası olarak bilgisayarınıza indirin.
            </p>
          </div>
          <button
            className="primary"
            disabled={isExporting || leads.length === 0}
            onClick={handleExport}
          >
            {isExporting ? "İndiriliyor..." : `Excel İndir (${leads.length})`}
          </button>
        </div>
        {exportError && <p style={{ color: "#dc2626", marginTop: 12 }}>{exportError}</p>}
        {exportMessage && <p style={{ color: "#16a34a", marginTop: 12 }}>{exportMessage}</p>}
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

      {/* Personel Bazlı Yükleme */}
      <div className="card" style={{ marginTop: 24 }}>
        <div style={{ marginBottom: 20 }}>
          <span className="section-kicker">Gelişmiş</span>
          <h2 style={{ margin: "8px 0 4px" }}>Personel Bazlı Veri Yükleme</h2>
          <p className="muted-text" style={{ margin: 0 }}>
            Seçtiğiniz personele özel bir Excel dosyası yükleyin. Dosyadaki tüm kayıtlar seçilen personele atanır.
          </p>
        </div>

        <div style={{ display: "grid", gap: 16 }}>
          <div>
            <label htmlFor="person-select" style={{ fontWeight: 700, fontSize: 13, color: "#1e293b" }}>
              Personel Seçin
            </label>
            <select
              id="person-select"
              value={selectedPerson}
              onChange={(e) => setSelectedPerson(e.target.value)}
              disabled={isPersonUploading}
            >
              {salesPeople.map((p) => (
                <option key={p.id} value={p.name}>
                  {p.name} {p.extension ? `(Dahili: ${p.extension})` : ""}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ fontWeight: 700, fontSize: 13, color: "#1e293b", display: "block", marginBottom: 8 }}>
              Excel Dosyası (.xlsx / .xls)
            </label>
            <input
              type="file"
              accept=".xlsx,.xls"
              disabled={isPersonUploading}
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                setPersonUploadError(null);
                setPersonUploadMessage(null);
                setIsPersonUploading(true);
                const result = await uploadLeadsForPerson(file, selectedPerson);
                if (result.error) {
                  setPersonUploadError(result.error);
                } else {
                  setPersonUploadMessage(
                    `✓ ${result.count} lead ${selectedPerson} adına başarıyla yüklendi.`
                  );
                  await fetchLeads();
                }
                setIsPersonUploading(false);
                e.target.value = "";
              }}
            />
          </div>

          {isPersonUploading && (
            <div style={{ display: "flex", alignItems: "center", gap: 10, color: "#e11d48" }}>
              <span className="call-btn-spinner" style={{ border: "2px solid rgba(225,29,72,0.2)", borderTopColor: "#e11d48" }} />
              <span style={{ fontSize: 14, fontWeight: 600 }}>Yükleniyor...</span>
            </div>
          )}

          {personUploadError && (
            <div style={{
              padding: "12px 16px",
              borderRadius: 12,
              background: "#fff1f2",
              border: "1px solid #fecdd3",
              color: "#be123c",
              fontSize: 14,
              fontWeight: 500,
            }}>
              ⚠️ {personUploadError}
            </div>
          )}

          {personUploadMessage && (
            <div style={{
              padding: "12px 16px",
              borderRadius: 12,
              background: "#f0fdf4",
              border: "1px solid #bbf7d0",
              color: "#166534",
              fontSize: 14,
              fontWeight: 600,
            }}>
              {personUploadMessage}
            </div>
          )}
        </div>
      </div>

      {/* Lead Transfer */}
      <div className="card" style={{ marginTop: 24 }}>
        <div style={{ marginBottom: 20 }}>
          <span className="section-kicker">Gelişmiş</span>
          <h2 style={{ margin: "8px 0 4px" }}>Lead Transfer</h2>
          <p className="muted-text" style={{ margin: 0 }}>
            Bir personelin tüm leadlerini başka bir personele aktarın. Bu işlem geri alınamaz.
          </p>
        </div>

        <div style={{ display: "grid", gap: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 12, alignItems: "end" }}>
            <div>
              <label htmlFor="transfer-from" style={{ fontWeight: 700, fontSize: 13, color: "#1e293b" }}>
                Kaynak Personel
              </label>
              <select
                id="transfer-from"
                value={transferFrom}
                onChange={(e) => {
                  setTransferFrom(e.target.value);
                  setTransferError(null);
                  setTransferMessage(null);
                }}
                disabled={isTransferring}
              >
                {salesPeople.map((p) => (
                  <option key={p.id} value={p.name}>
                    {p.name} {p.extension ? `(Dahili: ${p.extension})` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ paddingBottom: 10, textAlign: "center", fontSize: 20, fontWeight: 700, color: "#64748b" }}>
              →
            </div>

            <div>
              <label htmlFor="transfer-to" style={{ fontWeight: 700, fontSize: 13, color: "#1e293b" }}>
                Hedef Personel
              </label>
              <select
                id="transfer-to"
                value={transferTo}
                onChange={(e) => {
                  setTransferTo(e.target.value);
                  setTransferError(null);
                  setTransferMessage(null);
                }}
                disabled={isTransferring}
              >
                {salesPeople.map((p) => (
                  <option key={p.id} value={p.name}>
                    {p.name} {p.extension ? `(Dahili: ${p.extension})` : ""}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <button
              className="primary"
              disabled={isTransferring || transferFrom === transferTo}
              onClick={handleTransfer}
            >
              {isTransferring ? "Aktarılıyor..." : "Leadleri Aktar"}
            </button>
            {!isTransferring && transferFrom !== transferTo && (
              <span className="muted-text" style={{ fontSize: 13 }}>
                {transferFrom} adına kayıtlı{" "}
                <strong>{leads.filter((lead) => lead.salesPerson === transferFrom).length}</strong>{" "}
                lead {transferTo} adına aktarılacak.
              </span>
            )}
          </div>

          {isTransferring && (
            <div style={{ display: "flex", alignItems: "center", gap: 10, color: "#e11d48" }}>
              <span className="call-btn-spinner" style={{ border: "2px solid rgba(225,29,72,0.2)", borderTopColor: "#e11d48" }} />
              <span style={{ fontSize: 14, fontWeight: 600 }}>Leadler aktarılıyor...</span>
            </div>
          )}

          {transferError && (
            <div style={{
              padding: "12px 16px",
              borderRadius: 12,
              background: "#fff1f2",
              border: "1px solid #fecdd3",
              color: "#be123c",
              fontSize: 14,
              fontWeight: 500,
            }}>
              ⚠️ {transferError}
            </div>
          )}

          {transferMessage && (
            <div style={{
              padding: "12px 16px",
              borderRadius: 12,
              background: "#f0fdf4",
              border: "1px solid #bbf7d0",
              color: "#166534",
              fontSize: 14,
              fontWeight: 600,
            }}>
              {transferMessage}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
