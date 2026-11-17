<div dir="rtl">

# CyberDojo – תקציר הפרויקט

## מה זה?
**CyberDojo** היא פלטפורמת Full‑Stack לאימון וסימולציה בתחום אבטחת מידע. המשתמש מגדיר **תרחישי תקיפה** (Scenarios) שבנויים מרצף צעדים, מריץ אותם מול יעדים מורשים, צופה בלוגים בזמן אמת, ומנוע זיהוי מפיק **התראות** (Alerts) לפי חוקים. דשבורד מרכז מציג סטטיסטיקות וגרפים.

## מבנה כללי
| חלק | טכנולוגיות | תיקייה |
|------|-------------|---------|
| שרת (Backend) | Node.js, TypeScript, Express, MongoDB (Mongoose), Axios | `server/` |
| לקוח (Frontend) | React 18, Vite, TypeScript, React Router, Zustand, Chart.js | `client/` |
| CI | GitHub Actions – הרצת בדיקות השרת (Jest) | `.github/workflows/` |

## מושגי ליבה
1. **Scenario (תרחיש)** – שם, תיאור ורשימת צעדים. סוגי צעדים:
   - `http` – שליחת בקשת HTTP (method, url, headers, body, payload כמו `sqlInjection` / `xssPayload`)
   - `pause` – המתנה של X מילישניות
   - `assertStatus` – בדיקה שקוד התגובה האחרון תואם לצפוי
   - `assertBodyContains` – בדיקה שגוף התגובה מכיל מחרוזת
2. **Run (הרצה)** – ביצוע של תרחיש, במצב `real` (בקשות אמיתיות) או `dry-run` (סימולציה בלבד). לכל הרצה סטטוס ולוגים מובנים לכל צעד (`success` / `failed` / `blocked`).
3. **Alert (התראה)** – תוצאת מנוע הזיהוי, עם רמת חומרה (low / medium / high / critical) ואפשרות לסמן כ"טופל".

## מנועים מרכזיים (`server/src/core`)
- **AttackEngine** – מריץ את צעדי התרחיש לפי הסדר, כותב לוגים לכל צעד, ומפסיק את ההרצה בכשל של assertion.
  - **מנגנון בטיחות – Allowlist:** כתובות היעד נבדקות מול `ATTACK_ALLOWLIST` (תומך גם ב‑wildcard כמו `*.example.com`). צעד לא מורשה נחסם, ולפי `ATTACK_BLOCK_BEHAVIOR` ההרצה ממשיכה (`continue`) או נכשלת (`fail`).
- **HttpExecutor** – מבצע את בקשות ה‑HTTP בפועל.
- **AlertEngine** – מריץ סט חוקים על תוצאות ההרצה:
  - `runFailedRule` – הרצה שנכשלה → התראה בחומרה medium
  - `blockedStepRule` – כל צעד שנחסם → התראה (high לצעדי HTTP/assert)
  - `manyBlockedRule` – 3+ צעדים חסומים/כושלים → high, 5+ → critical

## API עיקרי (תחת `/api`)
| נתיב | תיאור |
|------|--------|
| `GET/POST /scenarios`, `GET/PUT /scenarios/:id` | ניהול תרחישים |
| `POST /scenarios/:id/run` | הפעלת תרחיש |
| `GET/POST /runs`, `GET /runs/:runId` | ניהול הרצות |
| `POST /runs/:scenarioId/dry-run` | הרצת סימולציה |
| `GET /runs/:runId/stream` | לוגים בזמן אמת (SSE) |
| `GET /alerts`, `GET /alerts/:id`, `PATCH /alerts/:id/resolve` | התראות |
| `GET /alerts/stream` | התראות בזמן אמת (SSE) |
| `GET /summary` | נתונים מסכמים לדשבורד |
| `GET /health` | בדיקת תקינות |

ארכיטקטורת השרת בשכבות: `routes → controllers → services → repositories → models`.

## צד הלקוח
- **Dashboard** – כרטיסי סטטיסטיקה, גרפי עוגה/עמודות (סטטוס הרצות, חומרת התראות), טבלה מרוכזת.
- **Scenarios** – רשימה, פרטים, יצירה, **Scenario Builder** עם עורך צעדים, תצוגה מקדימה וציר זמן.
- **Runs** – היסטוריית הרצות, צפייה בלוגים חיה (SSE עם retry), תגית סטטוס.
- **Alerts** – דשבורד, רשימה, מגירת פרטים ודף פרטים.
- רכיבים כלליים: Toast, Spinner, Card, Tag; ניהול state עם Zustand; מצב בהיר/כהה; Proxy של `/api` לשרת בפורט 3000.

## הרצה מקומית
```bash
# שרת (דורש MongoDB, ברירת מחדל mongodb://localhost:27017/cyberdojo)
cd server && npm install && npm run dev      # פורט 3000

# לקוח
cd client && npm install && npm run dev      # http://localhost:5173
```
משתני סביבה עיקריים: `PORT`, `MONGO_URI`, `ATTACK_ALLOWLIST`, `ATTACK_BLOCK_BEHAVIOR`.

## בדיקות
Jest + Supertest + `mongodb-memory-server` – בדיקות מחזור חיים של AttackEngine, הרצות dry-run ובדיקות אינטגרציה מול Mongo (`npm test` בתיקיית `server`).

## נקודות לשיפור שזוהו
- אימות משתמשים עדיין placeholder (`middleware/auth.ts` מאפשר הכל).
- כשה‑Allowlist ריק – **כל** היעדים מותרים; כדאי לשקול ברירת מחדל מחמירה.
- כפילויות קבצים בשרת (למשל `alertService.ts` מול `alerts.service.ts`, `alertsController.ts` מול `alerts.controller.ts`).
- אין linter מוגדר; ה‑CI מריץ בדיקות שרת בלבד (ללא build/בדיקות לקוח).

</div>
