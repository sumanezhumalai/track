#!/usr/bin/env python3
import json
import urllib.request
import urllib.error
import http.cookiejar
import sys

BASE_URL = "http://localhost:8080/egssupport"

class ApiClient:
    def __init__(self):
        self.cj = http.cookiejar.CookieJar()
        self.opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(self.cj))

    def request(self, method, path, data=None):
        url = BASE_URL + path
        headers = {}
        payload = None
        if data is not None:
            headers['Content-Type'] = 'application/json'
            payload = json.dumps(data).encode('utf-8')
        
        req = urllib.request.Request(url, data=payload, headers=headers, method=method)
        try:
            with self.opener.open(req) as response:
                status = response.status
                body_bytes = response.read()
                try:
                    body = json.loads(body_bytes.decode('utf-8'))
                except Exception:
                    body = body_bytes.decode('utf-8', errors='ignore')
                return status, body
        except urllib.error.HTTPError as e:
            err_body = e.read().decode('utf-8', errors='ignore')
            try:
                err_json = json.loads(err_body)
            except Exception:
                err_json = err_body
            return e.code, err_json

passed = 0
failed = 0

def check(test_name, condition, details=""):
    global passed, failed
    if condition:
        print(f" [PASS] {test_name}")
        passed += 1
    else:
        print(f"❌ [FAIL] {test_name} - {details}")
        failed += 1

def run_smoke_tests():
    global passed, failed
    print("\n=======================================================")
    print("      EGS SUPPORT SYSTEM - LIVE API SIMULATION")
    print("=======================================================\n")

    admin = ApiClient()
    dev = ApiClient()

    # 1. AUTHENTICATION & SESSIONS
    print("--- 1. Authentication & RBAC Login ---")
    st, resp = admin.request("POST", "/api/auth/login", {"name": "admin", "password": "wrong"})
    check("Bad login returns 401", st == 401, f"got {st}")

    st, resp = admin.request("POST", "/api/auth/login", {"name": "admin", "password": "admin123"})
    check("Admin login successful (200)", st == 200 and resp.get("role") == "admin", f"resp: {resp}")

    st, resp = admin.request("GET", "/api/auth/me")
    check("Admin /api/auth/me returns admin profile", st == 200 and resp.get("name") == "admin", f"resp: {resp}")

    st, resp = dev.request("POST", "/api/auth/login", {"name": "john_dev", "password": "admin123"})
    check("Dev login successful (200)", st == 200 and resp.get("role") == "dev", f"resp: {resp}")

    st, resp = dev.request("GET", "/api/auth/me")
    check("Dev /api/auth/me returns dev profile", st == 200 and resp.get("name") == "john_dev", f"resp: {resp}")

    # 2. RBAC ACCESS CONTROL
    print("\n--- 2. RBAC Protections ---")
    st, resp = dev.request("GET", "/api/users/dev")
    check("Dev cannot list /api/users/dev (403 Forbidden)", st == 403, f"got {st}")

    st, resp = admin.request("GET", "/api/users/dev")
    check("Admin can list /api/users/dev (200 OK)", st == 200 and len(resp) >= 3, f"count: {len(resp) if isinstance(resp, list) else resp}")

    st, resp = dev.request("GET", "/api/users/ae")
    check("Dev can list AE dropdown /api/users/ae (200 OK)", st == 200 and len(resp) >= 2, f"count: {len(resp) if isinstance(resp, list) else resp}")

    # 3. KANBAN PROJECT MANAGEMENT
    print("\n--- 3. Kanban Project & Version Lifecycle ---")
    import time
    proj_name = f"Cloud Gateway Automation {int(time.time())}"
    st, resp = admin.request("POST", "/api/kanban/projects", {
        "projectName": proj_name,
        "description": "API Gateway and microservices management"
    })
    check("Admin creates project (201 Created)", st == 201 and "projectId" in resp, f"resp: {resp}")
    proj_id = resp.get("projectId")

    st, resp = dev.request("POST", "/api/kanban/projects", {
        "projectName": "Hacker Project",
        "description": "Should fail"
    })
    check("Dev cannot create project (403 Forbidden)", st == 403, f"got {st}")

    # Dev lists projects before being added
    st, resp = dev.request("GET", "/api/kanban/projects")
    has_proj_before = any(p.get("projectId") == proj_id for p in resp) if isinstance(resp, list) else False
    check("Dev does not see unassigned project", not has_proj_before)

    # Admin creates version 2
    st, resp = admin.request("POST", f"/api/kanban/projects/{proj_id}/versions", {
        "label": "v2.0.0",
        "releaseNotes": "Major gateway overhaul"
    })
    check("Admin creates version 2 (201 Created)", st == 201 and resp.get("versionNumber") == 2, f"resp: {resp}")
    v2_id = resp.get("versionId")

    # Admin adds john_dev to project
    st, resp = admin.request("POST", f"/api/kanban/projects/{proj_id}/members", {
        "devName": "john_dev"
    })
    check("Admin adds john_dev to project (201 Created)", st == 201 and resp.get("devName") == "john_dev", f"resp: {resp}")

    # Now dev lists projects
    st, resp = dev.request("GET", "/api/kanban/projects")
    has_proj_after = any(p.get("projectId") == proj_id for p in resp) if isinstance(resp, list) else False
    check("Dev sees project once assigned (200 OK)", has_proj_after)

    # 4. MODULE CREATION & ASSIGNMENT
    print("\n--- 4. Kanban Module Creation & Assignment ---")
    st, mod1 = admin.request("POST", f"/api/kanban/modules?versionId={v2_id}", {
        "title": "OAuth2 Token Validation",
        "description": "Implement JWT and token revocation check",
        "priority": "high",
        "status": "start",
        "assigneeDevNames": ["john_dev"]
    })
    check("Admin creates Module 1 for john_dev (201 Created)", st == 201 and "moduleId" in mod1, f"resp: {mod1}")
    mod1_id = mod1.get("moduleId")

    st, mod2 = admin.request("POST", f"/api/kanban/modules?versionId={v2_id}", {
        "title": "Rate Limiting Engine",
        "description": "Token bucket algorithm implementation",
        "priority": "medium",
        "status": "start",
        "assigneeDevNames": ["alice_dev"]
    })
    check("Admin creates Module 2 for alice_dev (201 Created)", st == 201 and "moduleId" in mod2, f"resp: {mod2}")
    mod2_id = mod2.get("moduleId")

    # Add subtasks to Module 1
    st, sub1 = admin.request("POST", f"/api/kanban/modules/{mod1_id}/subtasks", {
        "text": "Create filter and test signature"
    })
    check("Admin adds subtask to Module 1 (201 Created)", st == 201 and "subtaskId" in sub1, f"resp: {sub1}")
    sub1_id = sub1.get("subtaskId")

    # 5. BOARD VISIBILITY (ADMIN VS DEV)
    print("\n--- 5. Board Visibility & Role-Based Filtering ---")
    st, admin_board = admin.request("GET", f"/api/kanban/projects/{proj_id}/board?versionId={v2_id}")
    admin_mods = [m.get("moduleId") for col in admin_board.get("columns", {}).values() for m in col]
    check("Admin sees both modules on board", mod1_id in admin_mods and mod2_id in admin_mods, f"modules: {admin_mods}")

    st, dev_board = dev.request("GET", f"/api/kanban/projects/{proj_id}/board?versionId={v2_id}")
    dev_mods = [m.get("moduleId") for col in dev_board.get("columns", {}).values() for m in col]
    check("Dev sees ONLY their assigned module (mod1)", (mod1_id in dev_mods) and (mod2_id not in dev_mods), f"dev modules: {dev_mods}")

    # 6. DRAG AND DROP / MOVE / REORDER
    print("\n--- 6. Drag & Drop Move & Column Transitions ---")
    st, move_resp = dev.request("PATCH", f"/api/kanban/modules/{mod1_id}/move", {
        "status": "testing",
        "position": 0
    })
    check("Dev moves Module 1 from 'start' to 'testing' (200 OK)", st == 200, f"got {st}")

    # Verify board reflects move
    st, dev_board = dev.request("GET", f"/api/kanban/projects/{proj_id}/board?versionId={v2_id}")
    testing_col = [m.get("moduleId") for m in dev_board.get("columns", {}).get("testing", [])]
    start_col = [m.get("moduleId") for m in dev_board.get("columns", {}).get("start", [])]
    check("Board reflects testing column placement", mod1_id in testing_col and mod1_id not in start_col)

    # 7. SUBTASKS TOGGLE
    print("\n--- 7. Subtask Toggling ---")
    st, toggle_resp = dev.request("PATCH", f"/api/kanban/modules/subtasks/{sub1_id}/toggle")
    check("Dev toggles subtask completed status (200 OK)", st == 200 and toggle_resp.get("completed") is True, f"resp: {toggle_resp}")

    # 8. ASSIGNEE MANAGEMENT & REORDER
    print("\n--- 8. Assignee Management & Reorder ---")
    st, assign_resp = admin.request("PUT", f"/api/kanban/modules/{mod1_id}/assignees", {
        "devNames": ["john_dev", "alice_dev"]
    })
    check("Admin updates module assignees (200 OK)", st == 200, f"got {st}")

    # Verify updated assignees on board
    st, admin_board = admin.request("GET", f"/api/kanban/projects/{proj_id}/board?versionId={v2_id}")
    mod1_card = next((m for col in admin_board.get("columns", {}).values() for m in col if m.get("moduleId") == mod1_id), None)
    assignee_names = mod1_card.get("assigneeDevNames", []) if mod1_card else []
    check("Board reflects updated assignees", "alice_dev" in assignee_names and "john_dev" in assignee_names, f"assignees: {assignee_names}")

    # 9. DELETION PERMISSIONS
    print("\n--- 9. Deletion Permissions ---")
    st, del_resp = dev.request("DELETE", f"/api/kanban/modules/{mod2_id}")
    check("Dev cannot delete module (403 Forbidden)", st == 403, f"got {st}")

    st, del_resp = admin.request("DELETE", f"/api/kanban/modules/{mod2_id}")
    check("Admin can delete module (204 No Content)", st == 204, f"got {st}")

    print("\n=======================================================")
    print(f" TOTAL TESTS: {passed + failed} | PASSED: {passed} | FAILED: {failed}")
    print("=======================================================\n")
    if failed > 0:
        sys.exit(1)

if __name__ == "__main__":
    run_smoke_tests()
