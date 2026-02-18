# Implementation Plan - Pharmacy Integration

## Goal
Empower pharmacies to trigger deductions for medication refills directly from the parent's wallet, respecting locked funds and available balances. This streamlines the refill process and ensures funds are used as intended.

## Steps

### 1. API - Create `POST /api/pharmacy/deduct`
- **Purpose**: Handle medication purchase/refill initiated by the pharmacy.
- **Inputs**: `{ parentLinkCode, medicationId, amount }`.
- **Logic**:
  1. Find Parent User by `linkCode`.
  2. Find Parent's Wallet.
  3. Find User (Pharmacy) initiating the request. Verify they are linked to the Parent.
  4. **Smart Balance Check**:
     - Check if there is a **Locked Fund** for this medication (`medicationName` matches, `amount >= cost`, `active`, `unexpired`).
     - If Yes: Use locked funds.
       - Reduce locked fund amount (or deactivate if fully used).
       - Create transaction: "Refill (Locked Funds) - [Med Name]".
     - If No: Check `availableBalance`.
       - If sufficient: Deduct from `balance`.
       - Create transaction: "Refill (Pharmacy) - [Med Name]".
       - To implement this cleanly, `availableBalance` virtual might need to be replicated in logic or we check `balance - active_locks`.
  5. **Notification**: Notify Parent ("Payment processed for [Med] at [Pharmacy]") and Child.
  6. Return success status and updated balance.

### 2. Frontend - Pharmacy Dashboard Update (`src/app/(dashboard)/dashboard/pharmacy/page.tsx`)
- Add **"Process Payment"** Section/Modal.
- Input: **Parent Link Code** (or select from connected patients list).
- Input: **Amount**.
- Input: **Medication Name** (or Description).
- Button: "Charge Wallet".
- Display success/failure messages (e.g., "Insufficient funds", "Payment Successful").

### 3. Frontend - Integration with Existing Data
- The current `PharmacyDashboard` lists connected patients. We can add a "Charge" button next to each patient to pre-fill their details in the modal.

## Notes
- We'll assume the pharmacy manually enters the amount for now, or selects a tracked medication if it exists in the system.
- The "Smart Deduction" logic is critical: It must prioritize locked funds for the *matching* medication before touching the general available balance.

