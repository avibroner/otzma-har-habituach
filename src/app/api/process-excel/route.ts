import { NextRequest } from "next/server";
import { parseExcel } from "@/lib/excel-parser";
import {
  searchPerson,
  deleteInsuranceMountain,
  createInsuranceRecord,
  updatePremiumSummary,
  fetchFieldOptions,
} from "@/lib/fireberry";
import { readMapping, logUpload } from "@/lib/mapping-store";
import { notifyUnmappedBranches, buildUnmappedRecord } from "@/lib/notify";
import type { ProgressUpdate, UploadLogEntry } from "@/lib/types";

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
        const uploaderName = (formData.get("uploaderName") as string) || "לא ידוע";
        const uploaderEmail = (formData.get("uploaderEmail") as string) || "";
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

        // 3. Load field options from Fireberry + buffer mapping
        send({ step: "loading_options", message: "טוען ערכי שדות מפיירברי..." });
        const [fieldOptions, bufferMapping] = await Promise.all([
          fetchFieldOptions(),
          readMapping(),
        ]);
        const branchCount = Object.keys(fieldOptions.branchMap).length;
        send({
          step: "loading_options",
          message: `נטענו ${branchCount} ענפים משניים`,
        });

        // 4. Delete existing insurance mountain records
        send({ step: "creating", message: "מוחק רשומות הר ביטוח קיימות..." });
        const deletedCount = await deleteInsuranceMountain(person);
        if (deletedCount > 0) {
          send({ step: "creating", message: `נמחקו ${deletedCount} רשומות קיימות` });
        }

        // 5. Create new records
        const errors: string[] = [];
        const warnings: string[] = [];
        const unmappedRecords: ReturnType<typeof buildUnmappedRecord>[] = [];
        let createdCount = 0;

        for (let i = 0; i < rows.length; i++) {
          send({
            step: "creating",
            message: `יוצר רשומה ${i + 1} מתוך ${rows.length}...`,
            current: i + 1,
            total: rows.length,
          });

          try {
            const result = await createInsuranceRecord(rows[i], person, fieldOptions, bufferMapping);
            createdCount++;
            if (result.warning) {
              warnings.push(`שורה ${i + 1}: ${result.warning}`);
              unmappedRecords.push(buildUnmappedRecord(rows[i], i + 1));
            }
          } catch (err) {
            const msg = `שגיאה בשורה ${i + 1} (פוליסה ${rows[i].policyNumber}): ${err instanceof Error ? err.message : "unknown"}`;
            errors.push(msg);
          }

          if (i < rows.length - 1) {
            await delay(100);
          }
        }

        // 5. Send email alert for unmapped branches
        if (unmappedRecords.length > 0) {
          notifyUnmappedBranches(
            unmappedRecords,
            idNumber,
            person.personType,
            rows.length,
            createdCount
          );
        }

        // 6. Update premium summary on insured/lead
        send({ step: "webhook", message: "מעדכן סיכומי פרמיות..." });
        try {
          await updatePremiumSummary(person);
        } catch (err) {
          errors.push(`שגיאה בעדכון סיכומי פרמיות: ${err instanceof Error ? err.message : "unknown"}`);
        }

        // 7. Log upload
        const unmappedBranches = [...new Set(
          warnings
            .filter((w) => w.includes("לא ממופה"))
            .map((w) => {
              const match = w.match(/ענף משני "(.+?)"/);
              return match ? match[1] : "";
            })
            .filter(Boolean)
        )];

        const logEntry: UploadLogEntry = {
          uploaderName,
          uploaderEmail,
          fileName: file.name,
          timestamp: new Date().toISOString(),
          idNumber,
          personType: person.personType,
          totalRows: rows.length,
          createdCount,
          errorsCount: errors.length,
          warningsCount: warnings.length,
          unmappedBranches,
        };
        await logUpload(logEntry);

        // 8. Done
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
