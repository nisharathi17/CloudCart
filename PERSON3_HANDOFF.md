# CloudCart — Person 3 Implementation & Handoff Document
## Cognito Authentication, API Authorization, and Order Confirmation Emails

**Purpose:** Technical handoff for the CloudCart team lead, team members, and AI coding assistants.

**Contributor role:** Person 3 — Login & Order Emails  
**Git branch:** `p3-auth`  
**Latest commit:** `918aa79`  
**Commit message:** `Add Cognito auth and order confirmation emails`  
**Repository:** `https://github.com/nisharathi17/CloudCart.git`  
**AWS region:** `ap-southeast-2` (Asia Pacific — Sydney)  
**Status:** Implementation committed and pushed; local working tree clean.

---

# 1. Executive Summary

Person 3 implemented the authentication and order-notification functionality for CloudCart, an e-commerce application.

The work connects Amazon Cognito authentication to the Next.js backend, protects order API endpoints using JWT verification, associates orders with the authenticated customer rather than trusting a customer ID submitted by the frontend, and sends order confirmation emails asynchronously through Amazon SQS, AWS Lambda, and Amazon SES.

The main outcome is an integrated order workflow:

1. A customer registers or logs in using Cognito.
2. The frontend obtains authentication tokens.
3. The backend verifies the tokens and identifies the authenticated customer.
4. The customer places an order through the protected API.
5. The database creates the order and calculates its total.
6. The backend queues an email notification in Amazon SQS.
7. An SQS-triggered Lambda function processes the notification.
8. Amazon SES sends the confirmation email to the customer.
9. The customer receives the order confirmation in their inbox.

The end-to-end email workflow was tested successfully with a real test order, and the confirmation email was received.

## Scope of Person 3

The responsibilities covered by this implementation are:

- Cognito-based user authentication.
- JWT validation on the server.
- Authorization for customer-specific order retrieval and creation.
- Verification of the customer's email status.
- Integration of the frontend with authenticated API requests.
- Asynchronous order-email processing using SQS and Lambda.
- Email delivery through SES.
- Error handling and basic validation around order creation and email queuing.

---

# 2. Architecture and Technology Stack

| Component | Technology | Responsibility |
|---|---|---|
| Frontend | Next.js, React, TypeScript | Login interface, order page, authenticated API calls |
| Identity provider | Amazon Cognito User Pools | Registration, login, user identity, email verification |
| Frontend authentication | AWS Amplify | Cognito configuration and authentication session management |
| Backend API | Next.js Route Handlers | Authentication checks, order retrieval, order creation |
| JWT validation | `aws-jwt-verify` | Cryptographic and claim validation of Cognito tokens |
| Database access | Prisma and PostgreSQL | Customer lookup and database interactions |
| Order processing | PostgreSQL stored function and triggers | Order creation, total calculation, inventory-related processing, and queue integration |
| Message queue | Amazon SQS | Decouples order creation from email delivery |
| Email worker | AWS Lambda, Node.js | Processes queued order notifications |
| Email service | Amazon SES | Sends order confirmation emails |
| AWS SDK | AWS SDK for JavaScript v3 | Communication with SQS and SES |

**AWS resources used**

- Cognito User Pool: `ap-southeast-2_8SEqyxFG0`
- SQS queue: `cloudcart-order-emails`
- Lambda function: `cloudcart-order-email-worker`
- SES sender identity: configured through the Lambda environment variable `SES_FROM_EMAIL`

The application region is Sydney. Resource identifiers and secret values should be configured through the project's environment settings, not copied into source code or public documentation.

---

# 3. Authentication Implementation

## 3.1 Cognito configuration

The frontend is configured to use Amazon Cognito for user authentication.

Relevant files:

- `src/lib/auth-config.ts`
- `src/components/AuthProvider.tsx`
- `src/app/login/page.tsx`

### What was implemented

- Configured Amplify using the project's Cognito environment variables.
- Added an authentication provider that configures Amplify for the frontend.
- Integrated the login page with Amplify UI's `Authenticator` component.
- Used Cognito to handle registration, login, and account confirmation.
- Verified the test account's email through the Cognito flow.

The frontend does not need to implement its own password storage or password verification system. Cognito manages the identity-provider responsibilities.

## 3.2 Server-side JWT verification

**File:** `src/lib/auth.ts`

This is the shared authentication utility used by the backend API.

### Why this file was necessary

The frontend being logged in is not sufficient to protect a backend endpoint. A client can manually send HTTP requests, so the server must validate credentials independently.

The utility uses `aws-jwt-verify` to verify Cognito-issued tokens.

### Token-verification approach

The helper creates two verifiers:

- An access-token verifier with `tokenUse: 'access'`.
- An ID-token verifier with `tokenUse: 'id'`.

Both verifiers are configured using the Cognito User Pool ID and app client ID.

The `getAuthenticatedUser(request)` helper:

1. Reads the `Authorization` header.
2. Requires a Bearer access token.
3. Reads the ID token from the `x-id-token` header.
4. Verifies the access token.
5. Verifies the ID token separately.
6. Rejects the request if the two tokens have different subject identifiers (`sub`).
7. Extracts the authenticated user's subject, email, email-verification status, optional username, and Cognito groups.
8. Returns the authenticated user information, or `null` when authentication fails.

The verifier performs the token validation rather than merely decoding the JWT payload. This is important because decoding alone does not establish that a token is authentic or valid.

### Why both tokens are used

The access token establishes an authenticated session for API access. The ID token supplies user identity claims, such as email and `email_verified`.

The backend verifies each token according to its intended token use and checks that both identify the same Cognito user.

### Security benefits

- Prevents an unauthenticated request from being treated as a logged-in customer.
- Prevents the API from trusting identity claims supplied as ordinary request-body fields.
- Rejects invalid, expired, incorrectly typed, or otherwise unverifiable tokens.
- Ensures the access token and ID token belong to the same user.
- Centralizes authentication logic so API handlers can reuse it.

The helper also extracts Cognito groups. Extracting groups does not, by itself, implement role-based authorization; each protected operation must explicitly enforce any required role or group restrictions.

---

# 4. Frontend Authentication Integration

## 4.1 Login page

**File:** `src/app/login/page.tsx`

The login page uses Amplify UI's `Authenticator` component with the configured Cognito authentication flow.

The intended sequence is:

1. The user opens the login page.
2. Cognito handles login or registration.
3. The user completes any required confirmation steps.
4. Amplify maintains the authentication session.
5. The authenticated frontend can request tokens for API calls.

## 4.2 Authenticated order requests

**File:** `src/app/orders/page.tsx`

The order page was updated to work with the authenticated customer's identity.

The frontend uses `fetchAuthSession()` to retrieve the active Cognito session tokens and sends the appropriate headers to the backend:

- `Authorization: Bearer <access-token>`
- `x-id-token: <ID-token>`

### Customer selection change

The earlier order page contained a customer dropdown and fetched customers from `/api/customers`. This was not an appropriate source of authority for determining whose order should be created.

The frontend was changed to remove the customer-selection UI and its associated customer-fetching state. The page focuses on product selection and ordering.

**Important design decision:** The backend determines the customer from the verified Cognito identity and the corresponding customer record. It does not rely on the customer selected in a frontend dropdown.

This prevents the user interface from being the security boundary for customer identity.

---

# 5. Order API Authorization and Processing

**File:** `src/app/api/orders/route.ts`

This route contains the GET and POST handlers for order operations.

## 5.1 GET — retrieve the authenticated customer's orders

The GET handler now authenticates the request using `getAuthenticatedUser(request)`.

The flow is:

1. Authenticate the request.
2. Reject unauthenticated requests.
3. Check that a usable email claim exists and is verified.
4. Find the corresponding customer record in the database.
5. Retrieve orders belonging to that customer.
6. Return the customer's order data.

The key security change is that the handler no longer returns every customer's orders to any caller.

The backend derives the customer identity from the verified token claims rather than trusting a client-supplied customer ID.

## 5.2 POST — create an order

The POST handler now follows a server-authorized order creation flow.

### Step 1: Authenticate

The API calls `getAuthenticatedUser(request)`.

If authentication fails, the request is rejected rather than being allowed to create an order anonymously.

### Step 2: Validate customer identity

The backend requires a usable, verified email claim and looks up the corresponding customer record.

If the customer cannot be identified, the order cannot proceed through this flow.

### Step 3: Validate order items

The request must contain an `items` array.

Each item is validated to ensure that:

- `product_id` is a positive integer.
- `quantity` is a positive integer.

This is basic request validation. Database constraints and database-side business rules remain important as well.

### Step 4: Create the order in the database

The route calls the PostgreSQL function:

`fn_place_order(customer.customerId, items JSONB)`

The authenticated customer's database ID is supplied by the backend.

The order total is then retrieved from the database rather than being accepted as an authoritative amount from the frontend.

The route also creates a payment record as part of the existing order flow.

### Step 5: Queue the email notification

After the order has been created, the backend sends a message to the configured SQS queue.

The notification includes the fields needed by the email worker:

- `orderId`
- `customerEmail`
- `totalAmount`

The queue URL is read from the environment variable `ORDER_EMAIL_QUEUE_URL`.

### Step 6: Handle queue failures

Order creation and email delivery are separate operations.

If the order is successfully created but the email cannot be queued, the route can still return a successful order response with `emailQueued: false`.

When queuing succeeds, the response reports `emailQueued: true`.

This distinction matters: an order being successfully placed does not necessarily mean that its email has already been delivered.

### Step 7: Handle errors

The route validates incoming data and returns generic error messages rather than exposing raw database error details in the client response.

Server-side error logging is retained for troubleshooting.

---

# 6. Asynchronous Email Architecture

The email pipeline is deliberately asynchronous. The customer-facing order request does not have to wait for SES to finish sending an email.

## 6.1 Amazon SQS

**Queue:** `cloudcart-order-emails`

The Next.js backend sends order-confirmation messages to SQS after order creation.

SQS acts as a buffer between the application and the email-processing worker.

Benefits:

- Separates order processing from email delivery.
- Avoids making the order request depend on the duration of the email operation.
- Allows the worker to process messages asynchronously.
- Provides a queue that can be inspected when troubleshooting delivery failures.

The application uses the AWS SDK for JavaScript v3, specifically `SQSClient` and `SendMessageCommand`.

## 6.2 AWS Lambda

**Function:** `cloudcart-order-email-worker`

The Lambda function processes messages delivered by the SQS event source mapping.

The handler uses the AWS SDK v3 SES client and `SendEmailCommand`.

Its responsibilities include:

1. Read the SQS message body.
2. Extract the order ID, customer email, and order total.
3. Validate the recipient information needed by the email operation.
4. Build the confirmation email.
5. Send the email through Amazon SES.
6. Log the result for operational troubleshooting.

The Lambda function uses the configured sender identity from `SES_FROM_EMAIL`.

The SQS trigger was checked and confirmed to be enabled.

## 6.3 Amazon SES

SES performs the actual email-sending operation.

The Lambda function submits the message using `SESClient` and `SendEmailCommand`.

SES configuration, including the sender identity and any account-level sandbox or recipient restrictions, must remain valid for delivery to succeed.

The successful inbox test described below confirms that the configured setup worked for the tested recipient and message.

## 6.4 Why SQS and Lambda instead of sending the email directly from the API?

Sending an email directly from the order endpoint couples order latency and success to the email service.

With the implemented architecture:

- The API creates the order and queues a notification.
- The worker sends the email separately.
- Email-processing problems can be investigated independently from order creation.
- The architecture can support more notifications without placing all email work inside the request handler.

This does not mean every failure is automatically recovered. Retries, duplicate delivery, idempotency, and dead-letter handling must be configured and tested separately.

---

# 7. AWS Credentials and Environment Configuration

## 7.1 Application environment variables

The application uses environment configuration rather than hardcoding AWS resource details.

Relevant variables include:

- `NEXT_PUBLIC_COGNITO_USER_POOL_ID`
- `NEXT_PUBLIC_COGNITO_USER_POOL_CLIENT_ID`
- `AWS_REGION`
- `ORDER_EMAIL_QUEUE_URL`

The Lambda function also uses `SES_FROM_EMAIL` for the sender identity.

The Cognito client ID is intended to be public configuration, not a secret. AWS credentials, session tokens, and other private values must never be committed.

## 7.2 Local AWS authentication

The development environment was authenticated using the AWS CLI's login flow.

The Node.js SQS client was configured using `fromLoginCredentials()` from `@aws-sdk/credential-providers` to use the local AWS login session.

This allowed the application to use the authenticated local development session instead of embedding permanent AWS access keys in the source code.

The local `.env.local` file contains environment-specific configuration and is ignored by the repository's `.gitignore` rule for `.env.*` files.

The command `git ls-files .env.local` returned no output, confirming that `.env.local` was not tracked at the time of verification.

**Team setup requirement:** Each developer must configure their own local environment and authorized AWS credentials. Do not copy personal credentials or session tokens into the repository.

For deployment, verify that the hosting environment has an appropriate AWS credential provider and the minimum required IAM permissions. The local `fromLoginCredentials()` approach should not be assumed to be the appropriate production credential mechanism.

---

# 8. Testing and Verification

The following checks and outcomes were recorded during implementation.

| Check | Result | What it establishes |
|---|---|---|
| Cognito registration/login and account confirmation | Tested | The configured authentication flow worked for the test account |
| Cognito email verification | Tested | The test account had a verified email |
| JWT verification utility | Implemented | The server can validate Cognito access and ID tokens |
| Authenticated frontend request headers | Implemented | The order page sends both required tokens |
| Authenticated GET/POST order handlers | Implemented | Both handlers use server-side authentication |
| Local database customer matching | Tested | The test account's email matched a customer record |
| SQS message submission | Tested | The application was able to queue an order notification |
| SQS-to-Lambda trigger | Verified enabled | SQS was configured to invoke the email worker |
| Lambda-to-SES sending | Tested | The worker successfully sent a confirmation email |
| End-to-end order/email workflow | Successfully tested | A test order was created and its confirmation email arrived |
| `npx tsc --noEmit` | Passed | No TypeScript errors were reported at the final pre-commit check |
| `git diff --check` | Passed | No whitespace errors were reported at the final pre-commit check |
| Git working tree | Clean after commit | No uncommitted changes remained after the commit |

## End-to-end test evidence

A test order, identified in the development logs as order `#16`, completed the email flow successfully.

The observed sequence was:

1. The order was created in the local database.
2. The API reported that the email had been queued.
3. The SQS-triggered Lambda processed the notification.
4. Lambda logged a successful SES send for the order.
5. The confirmation email arrived in the test inbox.

This is the strongest verification result for Person 3's work because it demonstrates that the components functioned together, not merely in isolation.

**Scope of the evidence:** This was a successful development test, not a production load, security penetration, or failure-recovery test. The evidence does not independently prove that every error path, deployment environment, or concurrency scenario has been tested.

---

# 9. Files Changed in the Commit

The commit contains five files.

## 9.1 `src/lib/auth.ts` — new file

Introduces the shared Cognito JWT authentication utility.

- Creates access-token and ID-token verifiers.
- Validates the request's Bearer token and ID token.
- Checks that both tokens identify the same user.
- Extracts user identity, email-verification status, and Cognito groups.
- Returns authenticated user information or `null`.

## 9.2 `src/app/api/orders/route.ts` — modified

Secures and updates the order API.

- Adds server-side Cognito authentication.
- Requires a verified email for the customer order flow.
- Derives the customer from the authenticated identity.
- Prevents the GET handler from returning all customers' orders.
- Validates order item IDs and quantities.
- Uses the database to create the order and obtain the total.
- Queues confirmation messages through SQS.
- Handles email-queue failure separately from order creation.
- Avoids returning raw database error details to clients.

## 9.3 `src/app/orders/page.tsx` — modified

Integrates the order page with the authenticated backend.

- Retrieves the Cognito session through Amplify.
- Sends the access token and ID token with API requests.
- Removes the customer-selection UI and associated customer-fetching logic.
- Leaves customer identification to the authenticated backend.
- Retains the product-selection and order-submission experience.

## 9.4 `package.json` — modified

Adds the dependency required to load AWS login credentials in the local Node.js application:

- `@aws-sdk/credential-providers`

## 9.5 `package-lock.json` — modified

Records the dependency changes and resolved package versions for reproducible npm installation.

---

# 10. How Person 3's Responsibilities Are Completed

The assigned role was **Login & Order Emails**, covering Cognito, JWT API authorization, SQS, Lambda, and SES.

| Responsibility | Status | Evidence |
|---|---|---|
| Cognito login and registration integration | Implemented and tested | Amplify authentication flow worked for the test account |
| Server-side JWT validation | Implemented | Shared `getAuthenticatedUser()` utility |
| Protect order retrieval | Implemented | GET handler authenticates and scopes results to the identified customer |
| Protect order creation | Implemented | POST handler authenticates and derives customer identity server-side |
| Verify customer email status | Implemented | API checks the verified email claim |
| Frontend-to-backend authenticated requests | Implemented | Order page sends the access and ID tokens |
| SQS integration | Implemented and tested | Order notification was successfully queued |
| Lambda email worker | Configured and tested | Worker processed a real test order notification |
| SES integration | Tested successfully | Confirmation email was sent and received |
| End-to-end integration | Tested successfully | Test order `#16` completed the pipeline |
| Git commit and branch push | Completed | Commit `918aa79` pushed to `p3-auth` |

## Completion assessment

**The core implementation and end-to-end happy path for Person 3's assigned responsibilities are complete.** The code has been committed and pushed, and a real confirmation email was successfully received from the integrated test flow.

This completion claim refers to the assigned login and order-email workflow. It does not imply that all authentication-related functionality elsewhere in CloudCart, all production hardening, or all failure-recovery scenarios have been completed.

---

# 11. Important Boundaries and Remaining Verification

The team should understand the following distinctions before merging or deploying.

## 11.1 Authentication is not the same as complete authorization

The shared helper validates user identity and extracts Cognito groups. It does not automatically enforce administrator-only access or role permissions on every endpoint.

Other endpoints, including order cancellation, customer management, and database initialization routes, should be reviewed separately to ensure their authorization matches their intended access policy.

This commit's order API changes should not be treated as proof that every API route in the repository is protected.

## 11.2 Email queueing is not email delivery

`emailQueued: true` indicates that the backend successfully queued a message. It does not guarantee that SES subsequently delivered the email.

The successful order `#16` test demonstrates that delivery worked in the tested setup, but production monitoring should distinguish queueing, processing, and delivery outcomes.

## 11.3 Duplicate processing and failure recovery

SQS-triggered Lambda processing can involve retries and duplicate message delivery. The team should separately verify:

- Whether repeated messages could send duplicate emails.
- Lambda/SQS retry behavior and visibility timeout.
- Handling of malformed messages.
- Dead-letter queue configuration and alerting.
- Monitoring for SES errors and messages that fail repeatedly.
- Idempotency of any side effects in the worker.

These should not be described as completed merely because the happy-path test passed.

## 11.4 Production IAM and deployment configuration

The development flow used a local AWS login session. Before deployment, the team should verify:

- The deployment environment's AWS credential mechanism.
- Least-privilege permissions for SQS sending.
- Lambda permissions to receive/delete messages from the queue.
- SES send permissions.
- Environment-variable configuration.
- Cognito configuration and allowed frontend origins.
- SES sender verification and production sending access.

## 11.5 Other order-related routes

The changes in this commit are focused on `src/app/api/orders/route.ts` and the frontend order page. Related API routes should be reviewed independently for authorization, including whether a user can cancel or modify another customer's order.

## 11.6 Testing limitations

The recorded tests establish that the implementation compiled and the primary workflow worked. They do not establish that every unauthorized-access scenario, invalid-token case, cross-customer access attempt, queue outage, or production concurrency condition has been tested.

The team should add or run dedicated tests for these cases before treating the feature as production-hardened.

---

# 12. Git and Handoff Information

The work was committed and pushed on branch `p3-auth`.

**Commit hash:** `918aa79`

**Commit message:** `Add Cognito auth and order confirmation emails`

**Commit contents:**

- `package-lock.json`
- `package.json`
- `src/app/api/orders/route.ts`
- `src/app/orders/page.tsx`
- `src/lib/auth.ts`

The final Git status showed:

`On branch p3-auth`

`nothing to commit, working tree clean`

The local `.env.local` file was not tracked. The temporary `route-review.txt` file was removed before staging. Only the five intended files were staged and committed.

The next repository-level step is for the team lead to review the branch and merge it according to the team's normal pull-request workflow.

---

# 13. Instructions for an AI Reviewing This Project

If this document is supplied to an AI coding assistant, use the following context and constraints.

1. The repository is CloudCart, a Next.js/TypeScript e-commerce application using Cognito, PostgreSQL, SQS, Lambda, and SES.
2. Person 3's implementation is on branch `p3-auth`, commit `918aa79`.
3. Review the actual repository files before proposing further code changes. This document is a handoff summary, not a substitute for inspecting the source.
4. Treat `src/lib/auth.ts` as the shared authentication helper for the order API.
5. Preserve the principle that the backend derives customer identity from verified Cognito claims rather than trusting a customer ID selected or supplied by the frontend.
6. Preserve the distinction between successful order creation, successful SQS queueing, and successful email delivery.
7. Do not introduce secrets into source code or Git. Do not request or reproduce the contents of `.env.local`.
8. Do not claim that unrelated API endpoints are secured without inspecting and testing them.
9. Do not claim that retry handling, dead-letter queues, idempotency, production IAM, or full security testing are complete without checking the actual implementation and AWS configuration.
10. When continuing the project, first inspect the branch and current Git status, then review related API routes and run appropriate tests before changing code.

## Suggested next tasks for the team

- Review and merge the `p3-auth` branch.
- Audit other customer-specific endpoints, especially order cancellation and customer-management operations.
- Add automated tests for missing tokens, invalid tokens, mismatched token subjects, unverified email, and cross-customer access.
- Verify SQS retry and dead-letter behavior.
- Review Lambda duplicate-processing behavior and operational logging.
- Confirm production IAM permissions and deployment environment variables.
- Test the full flow in the team's shared or deployed environment.

---

# Final Summary

Person 3 implemented the main authentication and order-confirmation email workflow for CloudCart. Cognito supplies the identity, the Next.js backend validates the tokens and derives the customer, the database processes the order, SQS carries the notification, Lambda handles the email job, and SES sends the confirmation.

The core workflow was verified end to end using a test order whose confirmation email arrived successfully. The five-file implementation was committed as `918aa79` and pushed to `p3-auth`.

The branch is ready for team review, with broader endpoint authorization, production hardening, and failure-recovery testing remaining separate review items.
