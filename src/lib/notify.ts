// Send email alert via Make.com webhook when unmapped branches are found
export async function notifyUnmappedBranches(
  branches: string[],
  idNumber: string
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
        branches,
        message: `נמצאו ${branches.length} ענפים משניים ללא מיפוי חוצץ בטעינת הר הביטוח עבור ת.ז. ${idNumber}: ${branches.join(", ")}`,
      }),
    });
  } catch {
    // Alert is best-effort — don't block the process
  }
}
