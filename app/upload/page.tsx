"use client";

import { useState } from "react";
import Link from "next/link";
import * as XLSX from "xlsx";

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
  const partialMatch = salesPeople.find(
    (person) =>
      normalizeKey(person.name).includes(normalizedValue) ||
      normalizedValue.includes(normalizeKey(person.name))
  );
  return partialMatch?.name ?? "";
};

export default function UploadPage() {
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);

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
    } catch (error) {
      const message = error instanceof Error ? error.message : "Excel dosyası yüklenemedi. Lütfen sütun başlıklarını kontrol edin.";
      setUploadError(message);
      console.error(error);
    }
  };

  return (
    <main className="container">
      <div className="header">
        <div>
          <h1>Veri Yükle</h1>
          <p>Excel dosyanızı bu sayfadan yükleyin. Yükleme tamamlandıktan sonra ana sayfaya dönerek leadleri görüntüleyebilirsiniz.</p>
        </div>
        <div style={{ minWidth: 240 }}>
          <Link href="/" className="secondary">
            Ana sayfaya dön
          </Link>
        </div>
      </div>

      <div className="card">
        <p>Excel dosyanızda personel ataması, durum ve not alanları varsa bu dosyayı yükleyebilirsiniz.</p>
        <input type="file" accept=".xlsx,.xls" onChange={handleFileUpload} />
        {uploadError && <p style={{ color: "#dc2626", marginTop: 12 }}>{uploadError}</p>}
        {uploadMessage && <p style={{ color: "#16a34a", marginTop: 12 }}>{uploadMessage}</p>}
      </div>
    </main>
  );
}
