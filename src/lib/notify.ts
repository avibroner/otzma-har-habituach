// Send email alert via Make.com webhook when unmapped branches are found
export async function notifyUnmappedBranches(
  branches: string[],
  idNumber: string,
  personType: "insured" | "lead",
  totalRows: number,
  createdCount: number
): Promise<void> {
  const webhookUrl = process.env.MAKE_ALERT_WEBHOOK_URL;
  if (!webhookUrl || branches.length === 0) return;

  try {
    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "unmapped_branch",
        idNumber,
        personType,
        personTypeHeb: personType === "insured" ? "מבוטח" : "ליד",
        unmappedBranches: branches,
        unmappedCount: branches.length,
        totalRows,
        createdCount,
        timestamp: new Date().toISOString(),
        subject: `התראה: ${branches.length} ענפים משניים ללא מיפוי חוצץ — ת.ז. ${idNumber}`,
        message: `בטעינת הר הביטוח עבור ת.ז. ${idNumber} (${personType === "insured" ? "מבוטח" : "ליד"}) נמצאו ${branches.length} ענפים משניים ללא מיפוי חוצץ:\n\n${branches.map((b, i) => `${i + 1}. ${b}`).join("\n")}\n\nסה"כ נטענו ${createdCount} מתוך ${totalRows} שורות.\n\nיש לעדכן את המיפוי בדף ההגדרות של המערכת.`,
      }),
    });
  } catch {
    // Alert is best-effort — don't block the process
  }
}
