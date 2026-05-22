# Security Specification - Smart Pay AI

## Data Invariants
1. A `PaymentRequest` must accurately reflect the extracted amount and receiver details before completion.
2. A user's `role` determines their access:
   - `ADMIN`: Full access to everything.
   - `STAFF`: View/Manage payments, view accounts, view ledgers. Cannot delete dealers or edit admin users.
   - `DEALER`: Only view and create `PaymentRequest` linked to their `dealerId`.
3. `CompanyAccount` and `TransactionLedger` can only be modified by `ADMIN` or `STAFF`.
4. Users cannot change their own `role`.

## The Dirty Dozen Payloads
1. Attempt to create a user with `role: 'ADMIN'` by a non-admin.
2. Attempt to read other dealer's payments by a `DEALER` user.
3. Attempt to update a completed payment's amount.
4. Attempt to delete a transaction ledger entry.
5. Attempt to create a payment request with a future `createdAt` timestamp.
6. Attempt to update `currentBalance` of an account directly without a ledger entry (client-side update gap).
7. Attempt to inject a 2MB string into `aiRawText`.
8. Attempt to read all users' profiles as a `DEALER`.
9. Attempt to create a payment for a dealer ID that doesn't belong to the user.
10. Attempt to spoof `uid` in the `AppUser` document.
11. Attempt to bypass `isDuplicateWarning` logic by manual update.
12. Attempt to read private account details as an unauthenticated user.

## Test Runner (Logic Overview)
The `firestore.rules` will be verified against these invariants using standard rule validation patterns.
