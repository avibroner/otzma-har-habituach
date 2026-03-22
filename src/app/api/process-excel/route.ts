import { NextRequest } from "next/server";
import { parseExcel } from "@/lib/excel-parser";
import {
  searchPerson,
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

        if (rows.length === 0) {
          send({
            step: "error",
            message: `ת.ז. ${idNumber} — אין שורות ביטוח בקובץ`,
          });
          controller.close();
          return;
        }

        send({
          step: "parsing",
          message: `נמצאו ${rows.length} שורות ביטוח, ת.ז. ${idNumber}`,
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

        // 3. Create new records
        const errors: string[] = [];
        const warnings: string[] = [];
        let createdCount = 0;

        for (let i = 0; i < rows.length; i++) {
          send({
            step: "creating",
            message: `יוצר רשומה ${i + 1} מתוך ${rows.length}...`,
            current: i + 1,
            total: rows.length,
          });

          // Warn about unmapped secondary branches
          if (rows[i].unmappedBranch) {
            warnings.push(
              `שורה ${i + 1}: ענף משני "${rows[i].secondaryBranch}" לא קיים במיפוי`
            );
          }

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

        // 4. Send webhook
        send({ step: "webhook", message: "שולח webhook..." });
        try {
          const webhookId =
            person.personType === "insured" ? person.insuredId : person.leadId;
          await sendWebhook(person.personType, webhookId);
        } catch {
          // webhook is optional — don't block
        }

        // 5. Done
        send({
          step: "done",
          message: JSON.stringify({
            success: true,
            idNumber,
            personType: person.personType,
            totalRows: rows.length,
            createdCount,
            errors,
            warnings,
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
