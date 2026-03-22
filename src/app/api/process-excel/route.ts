import { NextRequest } from "next/server";
import { parseExcel } from "@/lib/excel-parser";
import {
  searchPerson,
  deleteInsuranceMountain,
  createInsuranceRecord,
  sendWebhook,
} from "@/lib/fireberry";
import type { ProgressUpdate } from "@/lib/types";

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function POST(request: NextRequest) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (update: ProgressUpdate) => {
        controller.enqueue(encoder.encode(JSON.stringify(update) + "\n"));
      };

      try {
        // 1. Parse Excel
        const formData = await request.formData();
        const file = formData.get("file") as File;
        if (!file) {
          send({ step: "error", message: "לא נבחר קובץ" });
          controller.close();
          return;
        }

        send({ step: "parsing", message: "מפרסר את קובץ ה-Excel..." });
        const buffer = await file.arrayBuffer();
        const { idNumber, rows } = parseExcel(buffer, file.name);

        send({
          step: "parsing",
          message: rows.length > 0
            ? `נמצאו ${rows.length} שורות ביטוח, ת.ז. ${idNumber}`
            : `ת.ז. ${idNumber} — אין שורות ביטוח בקובץ, מוחק רשומות ישנות בלבד`,
        });

        // 2. Search person in Fireberry
        send({ step: "searching", message: `מחפש ת.ז. ${idNumber} בפיירברי...` });
        const person = await searchPerson(idNumber);

        if (!person) {
          send({
            step: "error",
            message: `לא נמצא מבוטח או ליד בפיירברי עם ת.ז. ${idNumber}`,
          });
          controller.close();
          return;
        }

        const typeHeb = person.personType === "insured" ? "מבוטח" : "ליד";
        send({
          step: "searching",
          message: `נמצא ${typeHeb} בפיירברי`,
        });

        // 3. Delete existing records
        send({ step: "deleting", message: "מוחק רשומות הר ביטוח קיימות..." });
        const deletedCount = await deleteInsuranceMountain(person);
        send({
          step: "deleting",
          message: `נמחקו ${deletedCount} רשומות קיימות`,
        });

        // 4. Create new records
        const errors: string[] = [];
        let createdCount = 0;

        for (let i = 0; i < rows.length; i++) {
          send({
            step: "creating",
            message: `יוצר רשומה ${i + 1} מתוך ${rows.length}...`,
            current: i + 1,
            total: rows.length,
          });

          try {
            await createInsuranceRecord(rows[i], person);
            createdCount++;
          } catch (err) {
            const msg = `שגיאה בשורה ${i + 1} (פוליסה ${rows[i].policyNumber}): ${err instanceof Error ? err.message : "unknown"}`;
            errors.push(msg);
          }

          if (i < rows.length - 1) {
            await delay(100);
          }
        }

        // 5. Send webhook
        send({ step: "webhook", message: "שולח webhook..." });
        try {
          const webhookId =
            person.personType === "insured" ? person.insuredId : person.leadId;
          await sendWebhook(person.personType, webhookId);
        } catch {
          errors.push("שגיאה בשליחת webhook");
        }

        // 6. Done
        send({
          step: "done",
          message: JSON.stringify({
            success: true,
            idNumber,
            personType: person.personType,
            totalRows: rows.length,
            deletedCount,
            createdCount,
            errors,
          }),
        });
      } catch (err) {
        send({
          step: "error",
          message: err instanceof Error ? err.message : "שגיאה לא צפויה",
        });
      }

      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Transfer-Encoding": "chunked",
    },
  });
}
