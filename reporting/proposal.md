# Request for Proposal / Brief of Work

## Web Application Vulnerability Assessment and Penetration Testing Engagement

**Customer:** SCOPT Analytics
**Proposed Security Partner:** CyEile Technologies
**Engagement Type:** Web Application Vulnerability Assessment and Penetration Testing
**Document Purpose:** Request for Proposal, scope confirmation, work brief, commercial confirmation, and expected delivery timeline

---

## 1. Background

SCOPT Analytics intends to engage CyEile Technologies for a professional Vulnerability Assessment and Penetration Testing activity for a web application and associated APIs.

The objective of this engagement is to identify security weaknesses, validate exploitable risks, document findings with practical proof-of-concept evidence, and provide remediation guidance that can be acted upon by the development team.

The engagement is expected to support application security assurance, management review, remediation planning, and CERT-In aligned reporting / Safe-to-Host support wherever applicable.

---

## 2. Application Target

The application target shall be confirmed before the start of testing.

Current application scope discussed:

| Item                   | Details                                                    |
| ---------------------- | ---------------------------------------------------------- |
| Application Type       | Web Application with APIs                                  |
| Web Pages              | Approximately 25 pages                                     |
| APIs                   | Approximately 15 APIs                                      |
| Access Type            | Authenticated login-based access                           |
| Testing Environment    | UAT preferred; Production only if explicitly approved      |
| UAT Hosting            | Hostinger                                                  |
| Production Hosting     | AWS                                                        |
| Credentials            | Test credentials to be provided by SCOPT Analytics         |
| Compliance Requirement | CERT-In / Safe-to-Host report support, wherever applicable |

Final application URL, API endpoints, test user credentials, restricted areas, and approved testing window shall be shared after NDA completion and written authorization.

---

## 3. Engagement Objective

CyEile Technologies is expected to perform a controlled and professional VAPT activity covering both automated and manual security validation.

The expected outcome is not only a tool-generated report, but a clear, validated, developer-actionable security assessment report containing:

1. Confirmed vulnerabilities.
2. Business and technical impact.
3. Proof-of-concept evidence wherever safe and applicable.
4. Severity and risk rating.
5. Affected URL / API / parameter / role / function.
6. Practical remediation recommendation.
7. Retesting / closure status after SCOPT Analytics applies fixes.
8. CERT-In aligned report / Safe-to-Host support, if applicable.

---

## 4. Standards and References

The assessment should be aligned with the following:

1. OWASP Top 10 2025 for Web Application Security.
2. Latest OWASP guidance applicable on the date of testing.
3. OWASP API Security Top 10, wherever APIs are involved.
4. Common web application security testing practices.
5. CERT-In / Safe-to-Host reporting expectations, wherever applicable.

Note: If CyEile Technologies follows any internal testing methodology, checklist, or CERT-In empanelled partner format, the same may be shared as part of the proposal.

---

## 5. In-Scope Testing Areas

The following areas are expected to be covered:

### 5.1 OWASP Web Application Security Testing

Testing should cover OWASP Top 10 2025 categories and related web application risks, including but not limited to:

1. Broken Access Control.
2. Security Misconfiguration.
3. Software Supply Chain / vulnerable dependencies.
4. Injection issues.
5. Cryptographic failures.
6. Authentication and session management weaknesses.
7. Identification and authentication failures.
8. Integrity and deserialization risks.
9. Logging, monitoring, and security visibility gaps.
10. Server-side request and business logic risks wherever applicable.

### 5.2 Authenticated Access and Authorization Testing

The tester should validate whether a lower-privileged user can access or perform actions meant for a higher-privileged user.

Expected checks include:

1. Horizontal privilege escalation.
2. Vertical privilege escalation.
3. Direct URL access to restricted pages.
4. API access with low-privilege credentials.
5. IDOR / BOLA style authorization bypass.
6. Forced browsing.
7. Role-based UI restriction bypass.
8. Backend API authorization enforcement.

### 5.3 JWT / Session / Token Security

Testing should include session and token validation, including:

1. JWT storage and exposure risks.
2. Token expiry and refresh behavior.
3. Token reuse after logout.
4. Weak token validation.
5. XSS payload possibility that can lead to JWT/session compromise.
6. Token leakage through browser storage, logs, URLs, error messages, or insecure client-side handling.

### 5.4 XSS and Client-Side Security

Testing should include practical XSS validation and not only scanner-based detection.

Expected checks include:

1. Reflected XSS.
2. Stored XSS.
3. DOM-based XSS.
4. Crafted payloads that demonstrate realistic impact.
5. Whether XSS can access sensitive browser-side data.
6. Whether XSS can hijack JWT/session tokens if stored insecurely.
7. Whether CSP actually mitigates the exploit path.

### 5.5 React Application Specific Checks

Since the application is a React-based web application, the tester should avoid reporting misleading issues caused by SPA behavior.

Expected handling:

1. React app shell returning `200 OK` should not be reported as a vulnerability by itself.
2. False positives caused by frontend routing should be filtered.
3. Scanner results should be manually validated.
4. Client-side comments or build artifacts should be reported only if they reveal sensitive information such as secrets, credentials, internal endpoints, tokens, or business-sensitive logic.
5. Generic “source code disclosure” should not be reported unless there is demonstrable impact.

### 5.6 API Security Testing

The assessment should cover the APIs used by the application.

Expected checks include:

1. Broken Object Level Authorization.
2. Broken Function Level Authorization.
3. Mass assignment.
4. Excessive data exposure.
5. Improper rate limiting where relevant.
6. Input validation issues.
7. Authentication bypass.
8. Parameter tampering.
9. Error handling and sensitive data leakage.
10. API endpoint discovery and access control.

### 5.7 Known CVE / Dependency / Configuration Testing

CyEile Technologies should identify known vulnerabilities in application components, libraries, frameworks, server configuration, and exposed services wherever safely testable.

Expected checks include:

1. Known CVEs affecting exposed components.
2. Vulnerable JavaScript packages or dependencies.
3. Known bypass techniques for identified vulnerabilities.
4. Misconfigured headers or server behavior with actual impact.
5. Publicly known exploit paths where applicable and safe.
6. Validation against the approved UAT environment only, unless Production testing is explicitly approved.

### 5.8 False Negative and Manual Validation Expectation

The engagement should not be limited to automated scanner output.

CyEile Technologies is expected to manually validate important business flows and identify issues that automated tools may miss, including:

1. Business logic flaws.
2. Authorization bypass.
3. Role confusion.
4. Workflow manipulation.
5. API misuse.
6. Session and token misuse.
7. Data exposure through UI/API mismatch.

---

## 6. Explicitly Out of Scope

The following activities are out of scope unless separately approved in writing:

1. DDoS testing.
2. Stress testing.
3. Load testing.
4. Resource exhaustion testing.
5. Destructive exploitation.
6. Data deletion or modification beyond safe test records.
7. Malware upload or persistence testing.
8. Social engineering.
9. Phishing.
10. Physical security testing.
11. Testing third-party infrastructure not owned or authorized by SCOPT Analytics.
12. Production testing without explicit written approval.

---

## 7. Areas to Avoid / Reporting Quality Expectations

SCOPT Analytics expects a high-quality, practical report. The following should be avoided:

1. Pure tool-generated output without manual validation.
2. False positives and false negatives.
3. Reporting React app shell `200 OK` behavior as a vulnerability without impact.
4. Generic CSP observations without proof-of-concept or clear exploit path.
5. Reporting harmless comments in built frontend code unless they disclose sensitive information.
6. Generic low-value recommendations without context.
7. Duplicate findings across multiple URLs without grouping.
8. Reporting informational items as high severity without business impact.
9. Copy-paste OWASP descriptions without application-specific evidence.

For CSP-related findings, CyEile Technologies should provide a practical explanation or PoC showing why the CSP weakness matters in this specific application context.

---

## 8. Reporting Requirements

The report should include the following minimum sections:

1. Executive Summary.
2. Scope of Assessment.
3. Testing Methodology.
4. Tools Used.
5. Manual Testing Performed.
6. Vulnerability Summary Table.
7. Severity Rating.
8. Detailed Findings.
9. Proof-of-Concept Evidence.
10. Business Impact.
11. Technical Impact.
12. Remediation Recommendation.
13. Retesting Status.
14. Closure Summary.
15. CERT-In / Safe-to-Host aligned section, wherever applicable.

Each finding should include:

| Field              | Expected Detail                                 |
| ------------------ | ----------------------------------------------- |
| Finding ID         | Unique ID                                       |
| Title              | Clear vulnerability name                        |
| Severity           | Critical / High / Medium / Low / Informational  |
| Affected Asset     | URL, API, page, endpoint, role, parameter       |
| Description        | Clear issue explanation                         |
| Evidence           | Screenshot, request/response, payload, safe PoC |
| Impact             | Business and technical impact                   |
| Reproduction Steps | Step-by-step validation                         |
| Recommendation     | Practical fix                                   |
| Retest Status      | Open / Fixed / Risk Accepted / Not Applicable   |

---

## 9. Critical Finding Notification

If any Critical or High severity vulnerability is identified during testing, CyEile Technologies should notify SCOPT Analytics immediately instead of waiting until the final report.

Examples:

1. Authentication bypass.
2. Privilege escalation.
3. Sensitive data exposure.
4. Remote code execution.
5. SQL injection or command injection.
6. Token/session hijacking.
7. Access to restricted data through lower-privileged user.
8. Any issue that can materially impact confidentiality, integrity, or availability.

---

## 10. Engagement Timeline

The expected timeline shall start from the engagement date and written authorization.

| Day           | Activity                                                                                                   |
| ------------- | ---------------------------------------------------------------------------------------------------------- |
| Day 1         | Onboarding, NDA confirmation, authorization, UAT URL sharing, test credentials sharing, scope confirmation |
| Day 2 - Day 3 | VAPT activity on approved target                                                                           |
| Day 4 - Day 5 | Initial report submission and remediation by SCOPT Analytics team                                          |
| Day 6 - Day 7 | Retesting, closure validation, and CERT-In aligned / Safe-to-Host report support                           |

The above timeline assumes timely access sharing, stable UAT availability, and prompt remediation support from SCOPT Analytics.

Any delay caused by access issues, application downtime, environment instability, or delayed fixes may require timeline adjustment.

---

## 11. Access and Authorization

SCOPT Analytics shall provide the following before testing begins:

1. Approved application URL.
2. Approved API base URL / endpoints, wherever applicable.
3. Approved testing environment.
4. Test user credentials.
5. User roles for authorization testing.
6. Testing date and time window.
7. Emergency contact person.
8. Any restricted functionality or sensitive data areas.
9. Written authorization for authenticated testing.
10. Written authorization for any high-risk exploit validation, if required.

No active security testing shall begin without written authorization.

---

## 12. Expected Inputs from CyEile Technologies

CyEile Technologies is requested to provide the following in response to this RFP:

1. Confirmation of scope understanding.
2. Proposed testing methodology.
3. Confirmation of OWASP Top 10 2025 and API security coverage.
4. Confirmation of manual testing coverage.
5. Confirmation of CERT-In / Safe-to-Host report support.
6. Report sample or report structure, if available.
7. Team details / tester profile, if applicable.
8. Confirmation of timeline feasibility.
9. Commercial confirmation.
10. Any assumptions, exclusions, or dependencies.

---

## 13. Commercial Terms

The agreed commercial structure is as follows:

| Item                                     |                                         Amount |
| ---------------------------------------- | ---------------------------------------------: |
| Total Professional Fee                   |                                        ₹30,000 |
| Advance Payment                          |                                        ₹15,000 |
| Balance Payment after Report and Closure |                                        ₹15,000 |
| GST                                      | Payable extra by SCOPT Analytics as applicable |

Payment milestone:

1. ₹15,000 advance before commencement of engagement.
2. ₹15,000 after report submission, retesting, and closure support.
3. GST shall be paid by SCOPT Analytics as applicable.

---

## 14. Assumptions

1. Testing shall be performed on UAT unless Production is explicitly approved.
2. SCOPT Analytics shall provide working credentials and required application access.
3. CyEile Technologies shall not perform DDoS, stress, load, or destructive testing.
4. CyEile Technologies shall maintain confidentiality of all information shared.
5. All evidence captured shall be limited to what is necessary for reporting.
6. Any customer, user, business, or production data encountered during testing shall not be downloaded, modified, deleted, or shared.
7. The final report should be suitable for management review and developer remediation.
8. CERT-In / Safe-to-Host certification dependencies, if involving a separate empanelled auditor, should be clearly communicated.

---

## 15. Deliverables

CyEile Technologies is expected to deliver:

1. Initial VAPT report.
2. Detailed technical findings.
3. Proof-of-concept evidence.
4. Remediation recommendations.
5. Retest report / closure report.
6. CERT-In aligned / Safe-to-Host support report, wherever applicable.
7. Final summary suitable for management and compliance record.

---

## 16. Acceptance Criteria

The engagement shall be considered complete when:

1. VAPT activity is completed on the approved scope.
2. Initial report is submitted.
3. SCOPT Analytics has received clear remediation guidance.
4. Retesting is performed after fixes are applied.
5. Closure status is documented.
6. CERT-In aligned report / Safe-to-Host support is provided, wherever applicable.
7. Final report is accepted by SCOPT Analytics.

---

## 17. Contact and Coordination

SCOPT Analytics shall nominate a technical contact and emergency contact before commencement of testing.

CyEile Technologies shall nominate a testing contact responsible for:

1. Daily coordination.
2. Clarification during testing.
3. Critical finding escalation.
4. Report submission.
5. Retesting coordination.
6. CERT-In / Safe-to-Host coordination, wherever applicable.

---

## 18. Confirmation Requested

CyEile Technologies is requested to confirm the following:

1. Acceptance of the proposed scope.
2. Acceptance of the proposed timeline.
3. Acceptance of the commercial terms.
4. Confirmation of CERT-In / Safe-to-Host support.
5. Confirmation that testing will be performed in a controlled and non-destructive manner.
6. Confirmation that the final report will contain validated findings and not only automated scanner output.

---

**Prepared by:** SCOPT Analytics
**For:** CyEile Technologies
**Engagement:** Web Application VAPT
**Status:** Draft for RFP / Scope Confirmation
