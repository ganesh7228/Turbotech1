import fs from "fs";
import path from "path";
import type { Firestore } from "firebase-admin/firestore";
import axios from "axios";

export type BackupStatus = "success" | "failure";

export interface BackupResult {
  status: BackupStatus;
  filename?: string;
  error?: string;
  startedAt: string;
  finishedAt: string;
}

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function formatBackupTimestamp(d: Date) {
  // backup-YYYY-MM-DD-HH-MM.json
  const yyyy = d.getFullYear();
  const mm = pad2(d.getMonth() + 1);
  const dd = pad2(d.getDate());
  const hh = pad2(d.getHours());
  return `backup-${yyyy}-${mm}-${dd}-${hh}`;
}

export async function runFirestoreBackup(options: {
  db: Firestore;
  backupDir: string;
  telegramToken?: string;
  adminChatId?: string;
  alsoLogToFirestore?: boolean;
}): Promise<BackupResult> {
  const startedAt = new Date().toISOString();
  const finishedAt = new Date().toISOString();

  try {
    const now = new Date();
    const filenameBase = formatBackupTimestamp(now);
    const filename = `${filenameBase}.json`;

    fs.mkdirSync(options.backupDir, { recursive: true });
    const filePath = path.join(options.backupDir, filename);

    // Fetch all collections
    const allCollections = await options.db.listCollections();

    const snapshotObject: Record<
      string,
      Array<Record<string, unknown> & { id?: string }>
    > = {};

    for (const colRef of allCollections) {
      const colName = colRef.id;
      const snap = await colRef.get();
      snapshotObject[colName] = snap.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as Record<string, unknown>),
      }));
    }

    // Write to disk
    fs.writeFileSync(filePath, JSON.stringify(snapshotObject, null, 2), "utf8");

    const finished = new Date().toISOString();

    if (options.alsoLogToFirestore) {
      try {
        await options.db.collection("backup_logs").add({
          status: "success",
          filename,
          filePath,
          createdAt: finished,
          startedAt,
        });
      } catch {
        // best-effort
      }
    }

    // Best-effort admin notify
    if (options.telegramToken && options.adminChatId) {
      const text = `✅ Firestore backup completed\nFile: ${filename}\nAt: ${finished}`;
      const url = `https://api.telegram.org/bot${options.telegramToken}/sendMessage`;
      try {
        await axios.post(url, { chat_id: options.adminChatId, text });
      } catch {
        // ignore
      }
    }

    return {
      status: "success",
      filename,
      startedAt,
      finishedAt: finished,
    };
  } catch (e: any) {
    const finished = new Date().toISOString();

    const error = e?.message ? String(e.message) : String(e);

    if (options.alsoLogToFirestore) {
      try {
        await options.db.collection("backup_logs").add({
          status: "failure",
          error,
          createdAt: finished,
          startedAt,
        });
      } catch {
        // best-effort
      }
    }

    if (options.telegramToken && options.adminChatId) {
      const text = `❌ Firestore backup failed\nError: ${error}\nAt: ${finished}`;
      const url = `https://api.telegram.org/bot${options.telegramToken}/sendMessage`;
      try {
        await axios.post(url, { chat_id: options.adminChatId, text });
      } catch {
        // ignore
      }
    }

    return {
      status: "failure",
      error,
      startedAt,
      finishedAt: finished,
    };
  }
}
