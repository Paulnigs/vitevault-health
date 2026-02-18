# Implementation Plan - Locked Funds Feature

## Goal
Implement a feature allowing users to "lock" funds within their wallet for specific medications. These funds are reserved and cannot be used for other purposes until the unlock date (when medication runs out) or unless an emergency unlock (with 5% penalty) is triggered.

## Steps

### 1. Database Schema Update (`src/lib/models/Wallet.ts`)
- Add `lockedFunds` array to `WalletSchema`.
  - Fields: `medicationName`, `amount`, `lockedAt`, `unlockDate`, `isActive`.
- Add helper method `getAvailableBalance()` to `WalletSchema` to calculate non-locked funds.

### 2. API Updates
- **Update `POST /api/deposit`**:
  - Accept optional `lockSettings` object: `{ enabled: boolean, medicationName: string, amount: number, unlockDate: string }`.
  - Logic: Perform deposit normally. If lock enabled, add entry to `lockedFunds`.
- **Create `POST /api/wallet/[id]/lock`**:
  - Handle `action: 'create'` -> Add new lock (for post-deposit locking).
  - Handle `action: 'emergency_unlock'` -> 
    - Identify lock entry.
    - Calculate 5% fee.
    - Deduct fee from `balance` (create 'deduction' transaction: "Emergency Unlock Fee").
    - Set lock `isActive: false`.
    - Return success.

### 3. Frontend - Deposit Modal (`src/components/DepositModal.tsx`)
- Add Toggle Switch "Lock specific amount for medication?".
- If True: Show inputs for "Medication Name" (Text input) and "Amount to Lock" (Number) and "Duration/Date" (Date picker or Days input).
- Validate that Lock Amount <= Deposit Amount.

### 4. Frontend - Wallet Page (`src/app/wallet/[id]/page.tsx`)
- Fetch and display `lockedFunds` alongside transactions.
- Show "Available Balance" (Total - Locked) card.
- List Locked Funds:
  - Show Name, Amount, Unlock Date.
  - "Unlock Early" button -> Triggers Modal -> API Call for emergency unlock.

## Notes
- "Emergency Unlock" fee is 5% of the *locked amount*.
- Auto-unlocking logic (cron job or check-on-access) is needed ideally, but for MVP we can check `unlockDate` vs `Date.now()` when fetching wallet/processing payments.
- We will assume for now that "Auto-deductions" (from previous context) will check `lockedFunds` first if the medication name matches.

