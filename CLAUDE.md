# הר הביטוח — עוצמה

## מה המערכת עושה
מחליפה תהליך ידני (Excel → Google Sheets → Apps Script → Fireberry) באפליקציה אוטומטית.
המשתמש גורר קובץ Excel מאתר הר הביטוח של משרד האוצר → המערכת מפרסרת, מחפשת את המבוטח בפיירברי, מוחקת רשומות ישנות, יוצרת חדשות, ומעדכנת סיכומי פרמיות.

## Tech Stack
- **Framework**: Next.js 16, App Router, React 19, TypeScript
- **Styling**: Tailwind CSS 4, RTL עברית, פונט Heebo
- **Storage**: Redis (Upstash via Vercel) — מיפוי ענפים → חוצצים
- **APIs**: Fireberry CRM (Powerlink), Make.com webhooks
- **Deploy**: Vercel — https://otzma-har-habituach-app.vercel.app
- **Repo**: avibroner/otzma-har-habituach

## מבנה קבצים

```
src/
├── app/
│   ├── layout.tsx              # RTL, Heebo font, FutureFlow badge
│   ├── page.tsx                # עמוד ראשי — העלאת קובץ + התקדמות
│   ├── globals.css
│   ├── admin/
│   │   └── page.tsx            # דף הגדרות — מיפוי ענפים → חוצצים
│   └── api/
│       ├── field-options/
│       │   └── route.ts        # GET: שליפת ענפים+חוצצים מפיירברי | POST: שמירה ל-Redis
│       └── process-excel/
│           └── route.ts        # POST: עיבוד Excel — streaming response
├── components/
│   ├── upload-zone.tsx         # Drag & drop להעלאת Excel
│   ├── progress-display.tsx    # התקדמות + סיכום תוצאות
│   └── shared/
│       └── futureflow-badge.tsx # תג FutureFlow
└── lib/
    ├── types.ts                # InsuranceRow, PersonIds, FieldOptions, ProgressUpdate
    ├── excel-parser.ts         # פרסור Excel — fixSheetRange, זיהוי headers דינמי
    ├── fireberry.ts            # Fireberry API client — search, delete, create, updatePremiumSummary
    ├── mapping-store.ts        # Redis read/write למיפוי ענפים
    └── notify.ts               # שליחת מייל HTML התראה דרך Make.com webhook
```

## מבנה קובץ Excel (מהר הביטוח של משרד האוצר)
- Sheet name: "תיק ביטוחי"
- שורה 0: כותרת + תאריך, שורה 1: ריקה, שורה 2: כותרות עמודות, שורה 3+: נתונים

| Index | עמודה | שדה |
|-------|--------|------|
| 0 | A | תעודת זהות |
| 1 | B | ענף ראשי |
| 2 | C | ענף (משני) — **קובע את החוצץ** |
| 3 | D | סוג מוצר |
| 4 | E | חברה |
| 5 | F | תקופת ביטוח (DD/MM/YYYY - DD/MM/YYYY) |
| 6 | G | פרטים נוספים (מתעלמים) |
| 7 | H | פרמיה בש"ח |
| 8 | I | סוג פרמיה |
| 9 | J | מספר פוליסה (key — שורה עם ערך = שורת ביטוח) |
| 10 | K | סיווג תכנית |

**באג ידוע בקבצים**: dimension מוצהר קטן מהנתונים האמיתיים → `fixSheetRange()` סורק את כל ה-cells.

## זרימת העיבוד
1. **פרסור** — Excel → שורות ביטוח + ת.ז.
2. **חיפוש** — מבוטח (objecttype 2) או ליד (objecttype 1003) לפי ת.ז. (עם/בלי אפסים)
3. **מחיקה** — כל רשומות הר ביטוח קיימות (objecttype 1005)
4. **יצירה** — רשומות חדשות עם מיפוי ענפים (מ-API) + חוצצים (מ-Redis)
5. **סיכום פרמיות** — חישוב SUM לפי חוצץ+סיווג, עדכון המבוטח/ליד
6. **התראה** — אם יש ענפים לא ממופים → מייל HTML ל-Bnayaz@otzma-ins.co.il דרך Make.com

## מיפוי שדות Fireberry (objecttype 1005 — הר הביטוח)

| שדה Fireberry | תיאור | מקור |
|---------------|--------|------|
| pcfsystemfield139 | מבוטח | חיפוש לפי ת.ז. |
| pcfsystemfield164 | לקוח אב | חיפוש |
| pcfsystemfield223 | ליד | חיפוש |
| pcfsystemfield142 | ענף ראשי | Excel col B |
| pcfsystemfield228 | ענף משני | Excel col C → API lookup |
| pcfsystemfield229 | חוצץ | Redis mapping (לפי ענף משני) |
| pcfsystemfield148 | סוג מוצר | Excel col D |
| pcfsystemfield146 | חברת ביטוח | Excel col E |
| pcfsystemfield267 | תחילת תקופה | Excel col F (parsed) |
| pcfsystemfield269 | סוף תקופה | Excel col F (parsed) |
| pcfsystemfield281 | תקופה טקסט | Excel col F (raw) |
| pcfsystemfield156 | פרמיה | Excel col H |
| pcfsystemfield154 | סוג פרמיה | Excel col I |
| pcfsystemfield160 | מספר פוליסה | Excel col J |
| pcfsystemfield158 | סיווג תוכנית | Excel col K |
| pcfsystemfield227 | תחום ביטוח | 1=כללי, 2=בריאות, 3=חיים |
| pcfsystemfield380 | תעודת זהות | Excel col A |
| pcfsystemfield162 | הערות | ריק (אין בקובץ) |

## סיכום פרמיות — שדות עדכון

**מבוטח (objecttype 2):**
- pcfsystemfield237/239/241/243 = אישי (חיים בריאות / אלמנטרי / תאונות וסיעוד / א.כ.ע)
- pcfsystemfield259/255/257/253 = קבוצתי (כולל קופת חולים)

**ליד (objecttype 1003):**
- pcfsystemfield230/231/233/235 = אישי
- pcfsystemfield251/247/249/245 = קבוצתי

## Environment Variables

| משתנה | תיאור |
|-------|--------|
| `FIREBERRY_TOKEN` | Token קבוע לפיירברי API |
| `MAKE_ALERT_WEBHOOK_URL` | Webhook לשליחת מייל התראה על ענפים לא ממופים |
| `REDIS_URL` | חיבור Redis (Upstash) לשמירת מיפוי חוצצים |

## פקודות

```bash
npm run dev          # פיתוח מקומי (port 3000)
npm run build        # בנייה
npx vercel deploy --prod  # דיפלוי
```
