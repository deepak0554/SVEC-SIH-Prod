/**
 * Automated RBAC & Administrative Security Verification Suite
 * Tests role-based access control rules:
 * - Normal students cannot call administrative endpoints (must get 401/403)
 * - Evaluators cannot perform super admin actions (e.g. system settings, manage admins)
 * - Unauthenticated requests are rejected
 * - Valid tokens for appropriate roles succeed
 */

import {
  signStudentToken,
  signAdminToken,
  authorize,
  getJwtSecret
} from "./server/auth";

async function runRBACTests() {
  console.log("=================================================");
  console.log("🛡️  RUNNING ROLE-BASED ACCESS CONTROL (RBAC) TESTS");
  console.log("=================================================\n");

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`  ✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${testName}${detail ? ` - ${detail}` : ""}`);
      failed++;
    }
  }

  // 1. Issue tokens for test personas
  const studentToken = signStudentToken({
    id: "stud_test_001",
    email: "student@svec.edu.in",
    department: "CSE"
  });

  const evaluatorToken = signAdminToken({
    username: "evaluator_test",
    role: "Evaluator"
  });

  const studentSpocToken = signAdminToken({
    username: "studentspoc_test",
    role: "Student SPOC"
  });

  const superAdminToken = signAdminToken({
    username: "spoc_admin",
    role: "SPOC"
  });

  // Mock Request / Response helper to test middleware directly
  function executeMiddleware(middleware: any, headers: Record<string, string>) {
    return new Promise<{ status: number; body: any; nextCalled: boolean }>((resolve) => {
      let status = 200;
      let body: any = null;
      let nextCalled = false;

      const req: any = {
        headers,
        body: {},
        params: {},
        query: {}
      };

      const res: any = {
        status(code: number) {
          status = code;
          return res;
        },
        json(data: any) {
          body = data;
          resolve({ status, body, nextCalled });
        }
      };

      const next = () => {
        nextCalled = true;
        resolve({ status: 200, body: null, nextCalled: true });
      };

      middleware(req, res, next);
    });
  }

  // Test 1: Student token attempting to access Super Admin / Settings endpoint
  const adminOnlyAuth = authorize(["ADMIN"]);
  const t1 = await executeMiddleware(adminOnlyAuth, {
    authorization: `Bearer ${studentToken}`
  });
  assert(
    t1.status === 403 && !t1.nextCalled,
    "Student JWT is strictly blocked with 403 Forbidden from Admin-only API (/api/settings, /api/admin/manage-admins)"
  );

  // Test 2: Unauthenticated request attempting to access Admin endpoint
  const t2 = await executeMiddleware(adminOnlyAuth, {});
  assert(
    t2.status === 401 && !t2.nextCalled,
    "Unauthenticated request is strictly rejected with 401 Unauthorized"
  );

  // Test 3: Evaluator attempting to access Super Admin / Settings endpoint
  const t3 = await executeMiddleware(adminOnlyAuth, {
    authorization: `Bearer ${evaluatorToken}`
  });
  assert(
    t3.status === 403 && !t3.nextCalled,
    "Evaluator is blocked with 403 Forbidden from accessing Super Admin configuration"
  );

  // Test 4: Super Admin accessing Super Admin endpoint
  const t4 = await executeMiddleware(adminOnlyAuth, {
    authorization: `Bearer ${superAdminToken}`
  });
  assert(
    t4.nextCalled && t4.status === 200,
    "Super Admin (SPOC) is successfully authorized for Admin API"
  );

  // Test 5: Evaluator accessing Evaluation endpoints
  const evaluatorAuth = authorize(["ADMIN", "STUDENT_SPOC", "EVALUATOR", "FACULTY"]);
  const t5 = await executeMiddleware(evaluatorAuth, {
    authorization: `Bearer ${evaluatorToken}`
  });
  assert(
    t5.nextCalled && t5.status === 200,
    "Evaluator is granted access to Evaluation & Scoring endpoints"
  );

  // Test 6: Student attempting to access Evaluation endpoint
  const t6 = await executeMiddleware(evaluatorAuth, {
    authorization: `Bearer ${studentToken}`
  });
  assert(
    t6.status === 403 && !t6.nextCalled,
    "Student is blocked from accessing Evaluation & Scoring endpoints"
  );

  // Test 7: Student SPOC accessing Broadcast SMS/Email
  const broadcastAuth = authorize(["ADMIN", "STUDENT_SPOC"]);
  const t7 = await executeMiddleware(broadcastAuth, {
    authorization: `Bearer ${studentSpocToken}`
  });
  assert(
    t7.nextCalled && t7.status === 200,
    "Student SPOC is authorized for Broadcast Announcements"
  );

  // Test 8: Evaluator blocked from Broadcast SMS/Email
  const t8 = await executeMiddleware(broadcastAuth, {
    authorization: `Bearer ${evaluatorToken}`
  });
  assert(
    t8.status === 403 && !t8.nextCalled,
    "Evaluator is blocked with 403 from Broadcast Announcements"
  );

  console.log("\n=================================================");
  console.log(`RBAC TEST RESULTS: ${passed} Passed, ${failed} Failed`);
  console.log("=================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runRBACTests().catch(err => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
