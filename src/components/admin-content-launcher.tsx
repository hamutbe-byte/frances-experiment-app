"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { enableContentEditMode } from "@/lib/content-edit-mode";

interface AdminContentLauncherProps {
  questionnairePath: string;
  nvltPath: string;
}

export function AdminContentLauncher({ questionnairePath, nvltPath }: AdminContentLauncherProps) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  function enableInlineEditMode(nextPath: string) {
    enableContentEditMode(window.localStorage);
    window.dispatchEvent(new Event("content-editor-mode-change"));
    router.push(nextPath);
  }

  async function restoreDefaults() {
    try {
      setIsPending(true);
      setMessage(null);
      const response = await fetch("/api/admin/content", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({})
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      setMessage("כל הטקסטים הוחזרו לברירות המחדל.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "לא ניתן היה לאפס את הטקסטים.");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <>
      <div className="admin-actions">
        <button type="button" className="button" onClick={() => enableInlineEditMode(questionnairePath)}>
          פתחי עריכה על גבי שאלון הפתיחה
        </button>
        <button type="button" className="button button-secondary" onClick={() => enableInlineEditMode(nvltPath)}>
          פתחי עריכה על גבי NVLT
        </button>
        <button type="button" className="button button-secondary" onClick={restoreDefaults} disabled={isPending}>
          {isPending ? "מאפס..." : "שחזור ברירות מחדל"}
        </button>
      </div>

      <p className="status">
        לאחר הפעלת מצב העריכה אפשר להשתמש ב־Dev toolbar כדי לקפוץ למסכים כמו הוראות, למידה, הסחה, זכירה והתאמה, ולערוך שם טקסטים
        ישירות.
      </p>

      {message ? <p className="status">{message}</p> : null}
    </>
  );
}
