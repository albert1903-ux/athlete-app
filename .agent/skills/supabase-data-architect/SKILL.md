---
name: supabase-data-architect
description: Teaches the AI how to safely interact with Supabase, enforce RLS policies, write secure RPCs, and interact with the database using custom React hooks instead of raw queries in UI components.
---

# Supabase Data Architect Skill

As an AI agent working on this athlete tracking app, you must follow these rules when interacting with Supabase:

## 1. No Raw Queries in UI Components
- **Rule**: NEVER use `supabase.from('table_name').select(...)` directly inside React UI components (like Pages or visual components).
- **Why**: Raw queries in UI components make the codebase hard to maintain, test, and scale. They also lead to duplicated logic and messy `useEffect` blocks.
- **Solution**: Always extract Supabase interactions into custom React hooks (e.g., `src/hooks/useAthleteResults.js`) or a dedicated service layer.

## 2. Row Level Security (RLS)
- **Rule**: Assume Row Level Security (RLS) is enabled on all tables.
- **Why**: Security is paramount. Users should only access data they are authorized to see.
- **Solution**: When writing new queries, consider the current user context. If a script needs to bypass RLS (e.g., a backend sync script), ensure the `SUPABASE_SERVICE_KEY` is used properly, but *never* expose this key to the client frontend.

## 3. Data Type Serialization
- **Rule**: Be careful with `Decimal`, `date`, and `JSON` types, especially when syncing data.
- **Why**: Past issues arose from JSON serialization errors related to these types during local-to-production syncs.
- **Solution**: Ensure dates are properly formatted (e.g., `YYYY-MM-DD`) and Decimals are cast to numbers or handled cleanly before sending them to Supabase via the JS client.

## 4. Secure RPCs
- **Rule**: Complex data mutations or operations requiring elevated privileges should be handled via Supabase RPCs (Remote Procedure Calls) in PostgreSQL.
- **Why**: Moving logic to the database reduces client-side complexity and improves security.
- **Solution**: Examples include the manual approval flow (`approve_user`, `reject_user`). When modifying these flows, test the SQL functions locally first.

## Verification
Before creating a PR or finalizing a task involving Supabase:
- [ ] Check if you wrote `supabase.from` inside a UI component. If yes, refactor it into a custom hook.
- [ ] Verify that new tables have appropriate RLS policies.
- [ ] Confirm no `.env.local` service keys are leaked to the client.
