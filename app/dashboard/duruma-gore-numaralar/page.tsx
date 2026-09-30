"use client";

import { useEffect, useMemo, useState } from "react";
import { Lead, LeadStatus, normalizeStatus, statusOptions } from "../../shared";
import styles from "./page.module.css";

const PAGE_SIZE = 20;
const getLeadTime = (lead: Lead) => {
  const changed = Date.parse(lead.statusUpdatedAt || "");
  if (Number.isFinite(changed)) return changed;
  return Date.parse(lead.createdAt || "") || 0;
};
const dateFormatter = new Intl.DateTimeFormat("tr-TR", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "Europe/Istanbul",
});

export default function StatusLeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refresh, setRefresh] = useState(0);
  const [pages, setPages] = useState<Partial<Record<LeadStatus, number>>>({});

  useEffect(() => {
    const controller = new AbortController();
    const fetchLeads = async () => {
      setLoading(true);
      setError("");
      try {
        const response = await fetch("/api/leads", {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("Lead verileri alınamadı. Lütfen tekrar deneyin.");
        const data = await response.json();
        if (!Array.isArray(data.leads)) throw new Error("Lead verileri alınamadı. Lütfen tekrar deneyin.");
        setLeads(data.leads);
        setPages({});
      } catch (error) {
        if (!controller.signal.aborted) {
          setError(error instanceof Error ? error.message : "Lead verileri alınamadı.");
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };
    void fetchLeads();
    return () => controller.abort();
  }, [refresh]);

  const groups = useMemo(() => {
    const result = statusOptions.map((status) => ({ status, leads: [] as Lead[] }));
    for (const lead of leads) {
      result.find((group) => group.status === normalizeStatus(lead.status))?.leads.push(lead);
    }
    for (const group of result) {
      group.leads.sort((a, b) => getLeadTime(b) - getLeadTime(a) || a.id.localeCompare(b.id));
    }
    return result;
  }, [leads]);

  return (
    <main className={`container ${styles.page}`}>
      <div className="header">
        <div>
          <h1>Duruma Göre Leadler</h1>
          <p>Her durumda 20 lead gösterilir. Durumu en son değişen lead en üsttedir; değişiklik tarihi yoksa kayıt tarihi kullanılır.</p>
        </div>
        <button type="button" onClick={() => setRefresh((value) => value + 1)} disabled={loading}>
          {loading ? "Yükleniyor…" : "Yenile"}
        </button>
      </div>

      {loading ? (
        <p role="status">Lead verileri yükleniyor…</p>
      ) : error ? (
        <p role="alert">{error}</p>
      ) : (
        <>
          <p className="muted-text">Toplam {leads.length} lead</p>
          <div className={styles.board} role="region" aria-label="Durumlara göre lead listeleri" tabIndex={0}>
          <div className={styles.groups}>
            {groups.map((group, index) => {
              const pageCount = Math.max(1, Math.ceil(group.leads.length / PAGE_SIZE));
              const page = Math.min(pages[group.status] ?? 0, pageCount - 1);
              const start = page * PAGE_SIZE;
              const visibleLeads = group.leads.slice(start, start + PAGE_SIZE);
              return (
              <section className={`card ${styles.group}`} key={group.status} aria-labelledby={`status-${index}`}>
                <div className={styles.heading}>
                  <h2 id={`status-${index}`}>{group.status}</h2>
                  <span className={styles.count}>{group.leads.length} lead</span>
                </div>
                {group.leads.length === 0 ? (
                  <p className="muted-text">Bu durumda lead bulunmuyor.</p>
                ) : (
                  <>
                  <div className={styles.pagination}>
                    <p aria-live="polite">{start + 1}–{Math.min(start + PAGE_SIZE, group.leads.length)} / {group.leads.length} lead</p>
                    <div className={styles.pageButtons}>
                      <button type="button" className="secondary" disabled={page === 0}
                        aria-label={`${group.status}: Önceki 20 lead`}
                        onClick={() => setPages((current) => ({ ...current, [group.status]: page - 1 }))}>
                        Önceki
                      </button>
                      <span>{page + 1} / {pageCount}</span>
                      <button type="button" className="secondary" disabled={page + 1 >= pageCount}
                        aria-label={`${group.status}: Sonraki 20 lead`}
                        onClick={() => setPages((current) => ({ ...current, [group.status]: page + 1 }))}>
                        Sonraki
                      </button>
                    </div>
                  </div>
                  <ul className={styles.leads}>
                    {visibleLeads.map((lead) => (
                      <li key={lead.id}>
                        <strong>{lead.name?.trim() || "İsim belirtilmemiş"}</strong>
                        <span className={styles.phone}>{lead.phone?.trim() || "Telefon numarası yok"}</span>
                        <span className={styles.detail}>Tur: {lead.turname?.trim() || "Belirtilmemiş"}</span>
                        <span className={styles.detail}>Personel: {lead.salesPerson?.trim() || "Atanmamış"}</span>
                        <span className={styles.detail}>
                          {Number.isFinite(Date.parse(lead.statusUpdatedAt || "")) ? "Durum değişikliği" : "Kayıt tarihi"}: {getLeadTime(lead) ? dateFormatter.format(getLeadTime(lead)) : "Belirtilmemiş"}
                        </span>
                      </li>
                    ))}
                  </ul>
                  </>
                )}
              </section>
              );
            })}
          </div>
          </div>
        </>
      )}
    </main>
  );
}
