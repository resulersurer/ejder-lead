export type LeadStatus = "Yeni" | "Arandı" | "Cevap Yok" | "Bekliyor" | "Satıldı";

export type Lead = {
  id: string;
  name: string;
  company: string;
  phone: string;
  status: LeadStatus;
  salesPerson: string;
  notes: string;
  touched?: boolean;
  createdAt?: string;
  statusUpdatedAt?: string | null;
};

export type SalesPerson = {
  id: string;
  name: string;
  extension?: string;
};

export const statusOptions: LeadStatus[] = ["Yeni", "Arandı", "Cevap Yok", "Bekliyor", "Satıldı"];

export const salesPeople: SalesPerson[] = [
  { id: "p-1", name: "NAZLICAN TUĞAL", extension: "1058" },
  { id: "p-2", name: "ÇAĞAN GENCER", extension: "1057" },
  { id: "p-3", name: "NURGÜL KOÇ", extension: "1024" },
  { id: "p-4", name: "YELİZ KABAKÇI", extension: "1023" },
  { id: "p-6", name: "YAREN DİKİLİTAŞ", extension: "1049" },
  { id: "p-7", name: "LEYLA SANEM UZUN", extension: "1037" },
  { id: "p-8", name: "OKAN ZİYLAN", extension: "1020" },
  { id: "p-9", name: "MUSTAFA ŞAHŞER ŞAHİN", extension: "1036" },
  { id: "p-10", name: "ŞİYAR KARADERE", extension: "1026" },
  { id: "p-12", name: "SİMAY KÖROĞLU", extension: "1025" },
  { id: "p-13", name: "SELİN ÖZBEY", extension: "1038" },
  { id: "p-14", name: "SEFA AYDAŞ", extension: "1010" },
  { id: "p-15", name: "RAMAZAN KOÇAK", extension: "1071" },
  { id: "p-16", name: "MUSA GÜNEŞ", extension: "1006" },
  { id: "p-17", name: "GİZEM BİLGİ", extension: "1031" },
  { id: "p-18", name: "FURKAN YILMAZ", extension: "1066" },
  { id: "p-19", name: "ELİF DİLAN EKİCİ", extension: "1045" },
  { id: "p-20", name: "ECEM BALKI", extension: "1013" },
  { id: "p-21", name: "CEREN VAREL", extension: "1033" },
  { id: "p-22", name: "CEMAL HALİL EMİR", extension: "1072" },
  { id: "p-23", name: "BEDİRHAN HEKİM", extension: "1046" },
  { id: "p-24", name: "BAHAR KELEŞ", extension: "1034" },
];

export const normalizeStatus = (value: unknown): LeadStatus => {
  const raw = String(value ?? "").trim();
  const key = raw
    .toLowerCase()
    .replace(/ä±|ã¤â±/g, "i")
    .replace(/ı/g, "i")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z]/g, "");

  if (key === "sold" || key === "satildi") return "Satıldı";
  if (key === "called" || key === "arandi") return "Arandı";
  if (key === "noanswer" || key.includes("cevap")) return "Cevap Yok";
  if (key === "waiting" || key.startsWith("bekl")) return "Bekliyor";
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

export const getRowValue = (row: Record<string, unknown>, keys: string[]) => {
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

export const findSalesPerson = (value: string) => {
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
