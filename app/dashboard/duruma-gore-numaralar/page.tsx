"use client";

import { useEffect, useMemo, useState } from "react";
import { Lead, normalizeStatus, statusOptions } from "../../shared";
import styles from "./page.module.css";

export default function StatusPhonesPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refresh, setRefresh] = useState(0);

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
    return result;
  }, [leads]);

  return (
    <main className="container">
      <div className="header">
        <div>
          <h1>Duruma Göre Numaralar</h1>
          <p>Lead telefon numaraları, mevcut durumlarına göre alt alta listelenir.</p>
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
          <div className={styles.groups}>
            {groups.map((group, index) => (
              <section className={`card ${styles.group}`} key={group.status} aria-labelledby={`status-${index}`}>
                <div className={styles.heading}>
                  <h2 id={`status-${index}`}>{group.status}</h2>
                  <span className={styles.count}>{group.leads.length} lead</span>
                </div>
                {group.leads.length === 0 ? (
                  <p className="muted-text">Bu durumda lead bulunmuyor.</p>
                ) : (
                  <ul className={styles.phones}>
                    {group.leads.map((lead) => (
                      <li key={lead.id}>{lead.phone?.trim() || "Telefon numarası yok"}</li>
                    ))}
                  </ul>
                )}
              </section>
            ))}
          </div>
        </>
      )}
    </main>
  );
}
