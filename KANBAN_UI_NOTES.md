# Kanban UI — Developer Notes & Frontend Integration Tips

> Reference document for backend ↔ KanbanUI contract.
> Keep this updated as the API evolves.

---

## Column States (Kanban Status)

The board has exactly **3 columns** defined by the `module_status` Postgres ENUM:

| DB ENUM value | Column title (UI) | Eyebrow label | Dot colour |
|---|---|---|---|
| `start` | "Procurement" *(or your domain label)* | "Start" | amber |
| `testing` | "Reviews" | "Testing" | violet |
| `production` | "Inflight" | "Production" | green |

> **Frontend**: The column `id` keys in `tasksByStatus` must exactly match these ENUM strings:
> `'start'`, `'testing'`, `'production'`.
> Update `dbdata.json` column IDs and `NewTaskForm` status select values accordingly.

---

## Board Load API Contract

```
GET /egssupport/api/kanban/projects/{projectId}/board
GET /egssupport/api/kanban/projects/{projectId}/board?versionId={versionId}
```

Response shape mapped to `KanbanBoardResponse`:

```json
{
  "projectId": 1,
  "versionId": 1,
  "projectName": "EGS Support",
  "versionLabel": "v1.0.0",
  "allVersions": [
    { "versionId": 1, "versionNumber": 1, "label": "v1.0.0" }
  ],
  "memberDevNames": ["alice", "bob"],
  "columns": {
    "start":      [ { ...ModuleCard }, { ...ModuleCard } ],
    "testing":    [ { ...ModuleCard } ],
    "production": []
  }
}
```

> **Dev access**: `columns` is filtered — devs only see modules they are assigned to.
> **Admin access**: All modules are returned.

---

## Module Card Response Fields

Maps to `TaskCard` and `TaskDetailSheet` in the KanbanUI:

| Response field | UI component | Usage |
|---|---|---|
| `moduleId` | `KanbanItem value=` | dnd-kit drag ID |
| `title` | `<h3>` on card | Card title |
| `description` | `<p>` on card / detail sheet | Description text |
| `status` | column key | Which column the card lives in |
| `position` | visual order | Card order within column (0-indexed) |
| `priority` | `<Badge>` top-right | `getPriorityStyles(priority)` |
| `assignedTo` | `<Avatar>` on card | Primary assignee (card face) |
| `assigneeDevNames[]` | `<AvatarGroup>` in detail | All assignees |
| `dueDate` | `<CalendarClockIcon>` | Bottom-right date |
| `subtasks[]` | Checklist in detail sheet | `text`, `completed`, `subtaskId` |
| `progress` | `<Progress>` bar | Pre-computed `0–100` |
| `createdAt` | sort key | Default board sort order |

---

## Drag & Drop — Frontend to Backend Flow

The `KanbanBoard` uses `@dnd-kit/sortable` with `verticalListSortingStrategy`.

### On `handleDragEnd` (in `kanban.jsx`):

1. `@dnd-kit` updates local `tasksByStatus` state optimistically.
2. UI immediately renders the new card order.
3. Frontend sends a **batch reorder request** to persist to DB:

```
POST /egssupport/api/kanban/modules/reorder
Content-Type: application/json

{
  "versionId": 1,
  "status": "testing",
  "orderedModuleIds": [3, 1, 4]
}
```

> **Same-column drag**: Send the affected column's new full ID order.
> **Cross-column drag**: Send TWO requests — one for the source column (items that shifted) and one for the destination column (new order including the moved card).

### Position Storage

```
Column "start":     moduleId=5 position=0 , moduleId=2 position=1
Column "testing":   moduleId=3 position=0 , moduleId=1 position=1 , moduleId=4 position=2
Column "production":(empty)
```

Positions are always **gap-free integers** (0, 1, 2…). The server resets all positions from the `orderedModuleIds` list index on every reorder call.

---

## Version Switcher (ProjectBreadcrumb)

`ProjectBreadcrumb` renders a dropdown of all version labels:

```jsx
// allVersions from KanbanBoardResponse
versions={project.allVersions.map(v => v.label || `v${v.versionNumber}`)}
onVersionChange={(label) => {
    const v = project.allVersions.find(x => (x.label || `v${x.versionNumber}`) === label)
    // fetch board for v.versionId
}}
```

Most-recent version is returned by default when `versionId` is omitted from the board request.

---

## Team Avatar Group (ProjectBreadcrumb Header)

`TeamAvatarGroup` displays active project members:
- Source: `KanbanBoardResponse.memberDevNames[]`
- Enriched with user display info (avatar URL, initials) from `GET /api/users/dev`

**Add member flow** (UserListDialog → TeamAvatarGroup → `onAddMember`):
```
POST /egssupport/api/kanban/projects/{projectId}/members
{ "devName": "alice" }
```

**Remove member** (admin only):
```
DELETE /egssupport/api/kanban/projects/{projectId}/members/{devName}
```

---

## Subtask Progress Calculation

The `progress` field in the module card response is pre-computed server-side:

```java
int total = subtasks.size();
int done  = (int) subtasks.stream().filter(ModuleSubtask::isCompleted).count();
int progress = total == 0 ? 0 : Math.round((done * 100f) / total);
```

This matches the existing `calculateProgress()` in `taskUtils.js` exactly.

---

## updated_at as "Last Moved At"

`module.updated_at` is refreshed on every mutation:
- Status/position change (drag-drop) → `updated_at = now()`
- Title/priority/due-date edit → `updated_at = now()`
- Subtask toggle → `updated_at = now()` on parent module

This gives the UI a free "last activity" timestamp per card at no extra cost.

---

## CORS & Session

- Backend context path: `/egssupport`
- Allowed origin: `http://localhost:5173` (Vite dev server)
- Auth: session cookie (`JSESSIONID`) — all `/api/kanban/**` endpoints require an active session
- KanbanUI `axios.js` must include `withCredentials: true`

---

## Column Config (Static in Frontend)

Column display config (`accent`, `dot`, `eyebrow`) is **not stored in the database**.
It is a static frontend map keyed by the status string:

```js
// Suggested static column config for KanbanBoard.jsx
const COLUMN_CONFIG = {
  start:      { title: 'Start',      eyebrow: 'Start',      dot: 'bg-amber-500',  accent: 'from-amber-600/20 ...' },
  testing:    { title: 'Testing',    eyebrow: 'Testing',    dot: 'bg-violet-500', accent: 'from-violet-500/20 ...' },
  production: { title: 'Production', eyebrow: 'Production', dot: 'bg-green-600',  accent: 'from-green-600/20 ...' }
}
```

Replace the `/columns` API call with this static map — no DB roundtrip needed.
