-- 20261117120000 used `create or replace` with five extra (defaulted) parameters,
-- which added a second create_question_node overload instead of replacing the
-- original. Calls with the original 10 named arguments then match both and
-- PostgREST rejects them as ambiguous. The 15-argument version is a superset
-- (same return type, same grants), so dropping the original resolves every call.
drop function if exists public.create_question_node(uuid, uuid, uuid, uuid, text, text, boolean, boolean, jsonb, jsonb);
