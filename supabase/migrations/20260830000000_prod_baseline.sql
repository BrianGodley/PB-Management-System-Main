


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pg_trgm" WITH SCHEMA "public";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."_billing_admin_tenant"() RETURNS "uuid"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare t uuid; r text;
begin
  select tenant_id, role into t, r from public.profiles where id=auth.uid() limit 1;
  if t is null then raise exception 'Not authenticated'; end if;
  if r not in ('owner','admin','super_admin') then raise exception 'Only an owner or admin can manage the subscription.'; end if;
  return t;
end $$;


ALTER FUNCTION "public"."_billing_admin_tenant"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_sync_employee_email"("p_employee_id" "uuid", "p_new_email" "text") RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'auth'
    AS $$
DECLARE
  v_user_id    UUID;
  v_normalised TEXT;
  v_collisions INT;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
     WHERE id = auth.uid() AND role = 'admin'
  ) THEN
    RETURN 'forbidden';
  END IF;

  v_normalised := LOWER(TRIM(p_new_email));
  IF v_normalised IS NULL OR v_normalised = '' THEN
    RETURN 'invalid_email';
  END IF;

  SELECT user_id INTO v_user_id
    FROM public.employees
   WHERE id = p_employee_id;

  IF v_user_id IS NULL THEN
    RETURN 'no_linked_account';
  END IF;

  SELECT COUNT(*) INTO v_collisions
    FROM auth.users
   WHERE LOWER(email) = v_normalised
     AND id <> v_user_id;
  IF v_collisions > 0 THEN
    RETURN 'email_already_in_use';
  END IF;

  UPDATE auth.users
     SET email                       = v_normalised,
         email_change                = '',
         email_change_token_new      = '',
         email_change_token_current  = '',
         email_change_confirm_status = 0,
         email_confirmed_at          = COALESCE(email_confirmed_at, NOW()),
         updated_at                  = NOW()
   WHERE id = v_user_id;

  UPDATE auth.identities
     SET identity_data = jsonb_set(
                            COALESCE(identity_data, '{}'::jsonb),
                            '{email}',
                            to_jsonb(v_normalised),
                            true
                         ),
         updated_at    = NOW()
   WHERE user_id  = v_user_id
     AND provider = 'email';

  UPDATE public.profiles
     SET email = v_normalised
   WHERE id = v_user_id;

  RETURN 'ok';
END;
$$;


ALTER FUNCTION "public"."admin_sync_employee_email"("p_employee_id" "uuid", "p_new_email" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."advance_qb_watermark"("p_entity" "text", "p_modified_at" timestamp with time zone, "p_session_ticket" "text") RETURNS timestamp with time zone
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_current TIMESTAMPTZ;
BEGIN
  IF p_modified_at IS NULL THEN
    SELECT last_synced_at INTO v_current FROM qb_sync_state WHERE entity = p_entity;
    RETURN v_current;
  END IF;

  INSERT INTO qb_sync_state (entity, last_synced_at, last_session_ticket, updated_at)
  VALUES (p_entity, p_modified_at, p_session_ticket, NOW())
  ON CONFLICT (entity) DO UPDATE
     SET last_synced_at      = GREATEST(qb_sync_state.last_synced_at, EXCLUDED.last_synced_at),
         last_session_ticket = EXCLUDED.last_session_ticket,
         updated_at          = NOW()
   RETURNING last_synced_at INTO v_current;

  RETURN v_current;
END;
$$;


ALTER FUNCTION "public"."advance_qb_watermark"("p_entity" "text", "p_modified_at" timestamp with time zone, "p_session_ticket" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."assign_invoice_client_seq"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
declare v_client uuid; v_next integer;
begin
  if new.client_seq is not null then return new; end if;
  select client_id into v_client from jobs where id = new.job_id;
  if v_client is null then
    select coalesce(max(client_seq),0)+1 into v_next
    from job_invoices where job_id = new.job_id;
  else
    select coalesce(max(ji.client_seq),0)+1 into v_next
    from job_invoices ji join jobs j on j.id = ji.job_id
    where j.client_id = v_client;
  end if;
  new.client_seq := v_next;
  if new.invoice_number is null or new.invoice_number = '' then
    new.invoice_number := 'INV-' || lpad(v_next::text, 4, '0');
  end if;
  return new;
end; $$;


ALTER FUNCTION "public"."assign_invoice_client_seq"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."auth_tenant_id"() RETURNS "uuid"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select tenant_id from public.profiles where id = auth.uid() limit 1;
$$;


ALTER FUNCTION "public"."auth_tenant_id"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cad_drawings_touch_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$;


ALTER FUNCTION "public"."cad_drawings_touch_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."can_edit_statistic"("p_stat_id" bigint) RETURNS boolean
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.profiles
              WHERE id = auth.uid() AND role IN ('admin','super_admin')) THEN
    RETURN TRUE;
  END IF;
  IF EXISTS (SELECT 1 FROM public.statistics
              WHERE id = p_stat_id AND owner_user_id = auth.uid()) THEN
    RETURN TRUE;
  END IF;
  IF EXISTS (SELECT 1 FROM public.statistic_shares
              WHERE statistic_id = p_stat_id
                AND user_id      = auth.uid()
                AND permission   = 'edit') THEN
    RETURN TRUE;
  END IF;
  RETURN FALSE;
END;
$$;


ALTER FUNCTION "public"."can_edit_statistic"("p_stat_id" bigint) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."can_view_statistic"("p_stat_id" bigint) RETURNS boolean
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.profiles
              WHERE id = auth.uid() AND role IN ('admin','super_admin')) THEN
    RETURN TRUE;
  END IF;
  IF EXISTS (SELECT 1 FROM public.statistics
              WHERE id = p_stat_id AND owner_user_id = auth.uid()) THEN
    RETURN TRUE;
  END IF;
  IF EXISTS (SELECT 1 FROM public.statistic_shares
              WHERE statistic_id = p_stat_id AND user_id = auth.uid()) THEN
    RETURN TRUE;
  END IF;
  RETURN FALSE;
END;
$$;


ALTER FUNCTION "public"."can_view_statistic"("p_stat_id" bigint) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cancel_my_subscription"("p_reason" "text") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare t uuid := public._billing_admin_tenant();
begin
  insert into public.cancellation_feedback (tenant_id, kind, reason, created_by)
  values (t, 'subscription_cancel', nullif(p_reason,''), auth.uid());
  update public.tenants set status='canceled', billing_status='canceled', data_retention_until=now()+interval '60 days', updated_at=now() where id=t;
  return (select json_build_object('status', status, 'data_retention_until', data_retention_until) from public.tenants where id=t);
end $$;


ALTER FUNCTION "public"."cancel_my_subscription"("p_reason" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cancel_my_trial"("p_comment" "text" DEFAULT NULL::"text") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare t uuid := public._billing_admin_tenant(); st text;
begin
  select status into st from public.tenants where id=t;
  if st <> 'trialing' then raise exception 'No active trial to cancel.'; end if;
  insert into public.cancellation_feedback (tenant_id, kind, comment, created_by)
  values (t, 'trial_cancel', nullif(p_comment,''), auth.uid());
  update public.tenants set status='canceled', data_retention_until=now()+interval '60 days', updated_at=now() where id=t;
  return (select json_build_object('status', status, 'data_retention_until', data_retention_until) from public.tenants where id=t);
end $$;


ALTER FUNCTION "public"."cancel_my_trial"("p_comment" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."clean_desc"("d" "text", "cat" "text", "sub" "text") RETURNS "text"
    LANGUAGE "plpgsql" IMMUTABLE
    AS $_$
declare words text[]; first text; out text := d;
begin
  out := regexp_replace(out, '\mmaterials?\M', '', 'gi');   -- remove 'material'/'materials' anywhere
  select array(
    select distinct lower(w)
      from unnest(regexp_split_to_array(coalesce(cat,'')||' '||coalesce(sub,''), '\s+')) w
     where w ~ '^[A-Za-z]{2,}$' and lower(w) not in ('and','the','for','of')
  ) into words;
  loop
    out := regexp_replace(out, '^[\s\-–—:/]+', '');
    first := (regexp_match(out, '^(\S+)'))[1];
    exit when first is null;
    if lower(first) = any(words) then out := substr(out, length(first) + 1);
    else exit; end if;
  end loop;
  out := regexp_replace(out, '\s{2,}', ' ', 'g');
  out := btrim(out, ' -–—:');
  if out is null or btrim(out) = '' then return d; end if;
  return out;
end $_$;


ALTER FUNCTION "public"."clean_desc"("d" "text", "cat" "text", "sub" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cp_set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;


ALTER FUNCTION "public"."cp_set_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_job_from_bid"("p_estimate_id" "uuid", "p_client_id" "uuid", "p_client_name" "text", "p_name" "text", "p_job_address" "text" DEFAULT ''::"text", "p_sold_date" timestamp with time zone DEFAULT "now"(), "p_total_price" numeric DEFAULT 0, "p_gross_profit" numeric DEFAULT 0, "p_gpmd" numeric DEFAULT 0, "p_status" "text" DEFAULT 'active'::"text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_job_id uuid;
BEGIN
  INSERT INTO jobs (
    estimate_id, client_id, client_name, name,
    job_address, sold_date, total_price, gross_profit, gpmd, status
  )
  VALUES (
    p_estimate_id, p_client_id, p_client_name, p_name,
    p_job_address, p_sold_date, p_total_price, p_gross_profit, p_gpmd, p_status
  )
  RETURNING id INTO v_job_id;

  RETURN v_job_id;
END;
$$;


ALTER FUNCTION "public"."create_job_from_bid"("p_estimate_id" "uuid", "p_client_id" "uuid", "p_client_name" "text", "p_name" "text", "p_job_address" "text", "p_sold_date" timestamp with time zone, "p_total_price" numeric, "p_gross_profit" numeric, "p_gpmd" numeric, "p_status" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."edoc_get_by_token"("p_token" "text") RETURNS "jsonb"
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select jsonb_build_object(
    'id', id,
    'name', name,
    'pdf_path', pdf_path,
    'page_count', page_count,
    'fields', fields,
    'status', status,
    'signer_name', signer_name,
    'completed_at', completed_at,
    'deposit_required', deposit_required,
    'deposit_amount', deposit_amount,
    'deposit_paid_at', deposit_paid_at
  )
  from edoc_documents
  where access_token = p_token
    and status in ('sent', 'viewed', 'completed', 'paid')
  limit 1;
$$;


ALTER FUNCTION "public"."edoc_get_by_token"("p_token" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."edoc_mark_viewed"("p_token" "text") RETURNS "void"
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  update edoc_documents
     set status = 'viewed',
         viewed_at = coalesce(viewed_at, now()),
         updated_at = now()
   where access_token = p_token
     and status = 'sent';
$$;


ALTER FUNCTION "public"."edoc_mark_viewed"("p_token" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."edoc_record_deposit"("p_token" "text", "p_amount" numeric, "p_txn" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_id  uuid;
begin
  select id into v_id
    from edoc_documents
   where access_token = p_token
     and deposit_required = true
     and deposit_paid_at is null;
  if v_id is null then
    return jsonb_build_object('ok', false, 'error', 'No outstanding deposit for this document.');
  end if;

  update edoc_documents
     set deposit_paid_amount = coalesce(p_amount, deposit_amount),
         deposit_paid_at = now(),
         deposit_txn_id = p_txn,
         status = 'paid',
         updated_at = now()
   where id = v_id;

  return jsonb_build_object('ok', true);
end;
$$;


ALTER FUNCTION "public"."edoc_record_deposit"("p_token" "text", "p_amount" numeric, "p_txn" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."edoc_submit"("p_token" "text", "p_fields" "jsonb", "p_signature" "text", "p_signed_by" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_id uuid;
begin
  update edoc_documents
     set fields = coalesce(p_fields, fields),
         signature_data_url = coalesce(p_signature, signature_data_url),
         signer_name = coalesce(nullif(p_signed_by, ''), signer_name),
         status = 'completed',
         completed_at = now(),
         updated_at = now()
   where access_token = p_token
     and status in ('sent', 'viewed')
   returning id into v_id;

  if v_id is null then
    return jsonb_build_object('ok', false, 'error', 'Document not found or already completed.');
  end if;
  return jsonb_build_object('ok', true, 'id', v_id);
end;
$$;


ALTER FUNCTION "public"."edoc_submit"("p_token" "text", "p_fields" "jsonb", "p_signature" "text", "p_signed_by" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."extend_my_trial"("p_comment" "text" DEFAULT NULL::"text") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare t uuid := public._billing_admin_tenant(); st text; ext int;
begin
  select status, trial_extended_count into st, ext from public.tenants where id=t;
  if st <> 'trialing' then raise exception 'Only an active trial can be extended.'; end if;
  if ext >= 1 then raise exception 'Your trial has already been extended once.'; end if;
  update public.tenants
     set trial_started_at=now(), trial_ends_at=now()+interval '14 days',
         trial_extended_count=trial_extended_count+1, status='trialing', updated_at=now()
   where id=t;
  insert into public.cancellation_feedback (tenant_id, kind, comment, created_by)
  values (t, 'trial_extend', nullif(p_comment,''), auth.uid());
  return (select json_build_object('trial_ends_at', trial_ends_at, 'trial_extended_count', trial_extended_count)
            from public.tenants where id=t);
end $$;


ALTER FUNCTION "public"."extend_my_trial"("p_comment" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."feature_requests_set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END $$;


ALTER FUNCTION "public"."feature_requests_set_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."finance_invoice_totals"("p_job_id" "uuid" DEFAULT NULL::"uuid") RETURNS TABLE("invoice_count" bigint, "total_amount" numeric, "total_paid" numeric)
    LANGUAGE "sql" STABLE
    AS $$
  select count(*)::bigint,
         coalesce(sum(amount), 0)::numeric,
         coalesce(sum(amount_paid), 0)::numeric
  from job_invoices
  where p_job_id is null or job_id = p_job_id
$$;


ALTER FUNCTION "public"."finance_invoice_totals"("p_job_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."finance_payment_totals"("p_job_id" "uuid" DEFAULT NULL::"uuid") RETURNS TABLE("payment_count" bigint, "total_paid" numeric)
    LANGUAGE "sql" STABLE
    AS $$
  select count(*)::bigint,
         coalesce(sum(amount), 0)::numeric
  from job_invoice_payments
  where p_job_id is null or job_id = p_job_id
$$;


ALTER FUNCTION "public"."finance_payment_totals"("p_job_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."format_phone"("p" "text") RETURNS "text"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  digits text;
BEGIN
  IF p IS NULL OR TRIM(p) = '' THEN RETURN p; END IF;
  digits := regexp_replace(p, '\D', '', 'g');   -- strip everything except digits
  digits := right(digits, 10);                  -- drop country code (+1) if present
  IF length(digits) = 10 THEN
    RETURN '(' || left(digits,3) || ') ' || substring(digits,4,3) || '-' || right(digits,4);
  ELSE
    RETURN p;  -- can't format cleanly, leave as-is
  END IF;
END;
$$;


ALTER FUNCTION "public"."format_phone"("p" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_email_by_username"("p_username" "text") RETURNS "text"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    AS $$
DECLARE
  v_email TEXT;
BEGIN
  SELECT email
    INTO v_email
    FROM profiles
   WHERE LOWER(username) = LOWER(TRIM(p_username))
   LIMIT 1;
  RETURN v_email;
END;
$$;


ALTER FUNCTION "public"."get_email_by_username"("p_username" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_my_extensions"() RETURNS "text"[]
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select coalesce(array_agg(extension_id), '{}')
  from public.tenant_extensions
  where tenant_id = public.auth_tenant_id()
    and status in ('active', 'trialing')
    and (current_period_end is null or current_period_end > now());
$$;


ALTER FUNCTION "public"."get_my_extensions"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_my_modules"() RETURNS "text"[]
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  t uuid := (select tenant_id from public.profiles where id=auth.uid() limit 1);
  pid text; tier_keys text[]; pkg_keys text[];
begin
  if t is null then return null; end if;
  select plan_id into pid from public.tenants where id=t;
  if pid is null then return null; end if;
  select module_keys into tier_keys from public.plans where id=pid;
  select coalesce(array_agg(distinct k), '{}') into pkg_keys
    from public.tenant_packages tp
    join public.packages pk on pk.id=tp.package_id
    cross join lateral unnest(pk.module_keys) k
   where tp.tenant_id=t;
  return coalesce(tier_keys,'{}') || coalesce(pkg_keys,'{}');
end $$;


ALTER FUNCTION "public"."get_my_modules"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_my_subscription"() RETURNS json
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  t uuid := (select tenant_id from public.profiles where id=auth.uid() limit 1);
  result json;
begin
  if t is null then return null; end if;
  select json_build_object(
    'tenant_id', tn.id, 'tenant_name', tn.name, 'status', tn.status,
    'trial_started_at', tn.trial_started_at, 'trial_ends_at', tn.trial_ends_at,
    'trial_extended_count', tn.trial_extended_count, 'data_retention_until', tn.data_retention_until,
    'plan_id', pl.id, 'plan_name', pl.name, 'plan_rank', pl.rank,
    'price_monthly', pl.price_monthly, 'plan_module_keys', pl.module_keys,
    'package_ids', coalesce((select array_agg(tp.package_id) from public.tenant_packages tp where tp.tenant_id=tn.id), '{}'),
    'billing_status', tn.billing_status, 'card_brand', tn.card_brand, 'card_last4', tn.card_last4,
    'card_exp', tn.card_exp, 'current_period_end', tn.current_period_end,
    'has_live_billing', (tn.helcim_subscription_id is not null)
  ) into result
  from public.tenants tn left join public.plans pl on pl.id=tn.plan_id
  where tn.id=t;
  return result;
end $$;


ALTER FUNCTION "public"."get_my_subscription"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_phone_by_email"("p_email" "text") RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_phone text;
BEGIN
  SELECT cell_phone INTO v_phone
  FROM employees
  WHERE LOWER(email) = LOWER(p_email)
  LIMIT 1;

  RETURN v_phone;
END;
$$;


ALTER FUNCTION "public"."get_phone_by_email"("p_email" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_public_site"("p_slug" "text") RETURNS "jsonb"
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select case when w.id is null then null else jsonb_build_object(
    'site', jsonb_build_object(
      'id', w.id, 'slug', w.slug, 'name', w.name,
      'theme', w.theme, 'settings', w.settings
    ),
    'pages', coalesce((
      select jsonb_agg(jsonb_build_object(
        'title', p.title, 'slug', p.slug, 'is_home', p.is_home,
        'show_in_nav', p.show_in_nav, 'sort_order', p.sort_order, 'data', p.data
      ) order by p.sort_order)
      from public.website_pages p where p.website_id = w.id
    ), '[]'::jsonb)
  ) end
  from public.websites w
  where lower(w.slug) = lower(p_slug) and w.published = true
  limit 1;
$$;


ALTER FUNCTION "public"."get_public_site"("p_slug" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_profile"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  INSERT INTO user_permissions (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_profile"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  )
  ON CONFLICT (id) DO UPDATE
    SET email     = EXCLUDED.email,
        full_name = COALESCE(EXCLUDED.full_name, profiles.full_name);
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'handle_new_user failed for %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."has_extension"("p_ext" "text") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select exists (
    select 1 from public.tenant_extensions te
    where te.tenant_id = public.auth_tenant_id()
      and te.extension_id = p_ext
      and te.status in ('active', 'trialing')
      and (te.current_period_end is null or te.current_period_end > now())
  );
$$;


ALTER FUNCTION "public"."has_extension"("p_ext" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_admin"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  );
$$;


ALTER FUNCTION "public"."is_admin"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_admin_user"() RETURNS boolean
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND role IN ('admin','super_admin')
  );
END;
$$;


ALTER FUNCTION "public"."is_admin_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_staff"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid());
$$;


ALTER FUNCTION "public"."is_staff"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."link_qb_lines_to_jobs"() RETURNS TABLE("tbl" "text", "matched" integer)
    LANGUAGE "plpgsql"
    AS $$
DECLARE n INT;
BEGIN
  UPDATE acct_bill_lines l
     SET job_id = match_qb_customer_to_job(l.qb_customer_full_name)
   WHERE l.job_id IS NULL AND l.qb_customer_full_name IS NOT NULL;
  GET DIAGNOSTICS n = ROW_COUNT;
  tbl := 'acct_bill_lines';            matched := n; RETURN NEXT;

  UPDATE acct_check_lines l
     SET job_id = match_qb_customer_to_job(l.qb_customer_full_name)
   WHERE l.job_id IS NULL AND l.qb_customer_full_name IS NOT NULL;
  GET DIAGNOSTICS n = ROW_COUNT;
  tbl := 'acct_check_lines';           matched := n; RETURN NEXT;

  UPDATE acct_credit_card_charge_lines l
     SET job_id = match_qb_customer_to_job(l.qb_customer_full_name)
   WHERE l.job_id IS NULL AND l.qb_customer_full_name IS NOT NULL;
  GET DIAGNOSTICS n = ROW_COUNT;
  tbl := 'acct_credit_card_charge_lines'; matched := n; RETURN NEXT;

  UPDATE acct_item_receipt_lines l
     SET job_id = match_qb_customer_to_job(l.qb_customer_full_name)
   WHERE l.job_id IS NULL AND l.qb_customer_full_name IS NOT NULL;
  GET DIAGNOSTICS n = ROW_COUNT;
  tbl := 'acct_item_receipt_lines';    matched := n; RETURN NEXT;
END;
$$;


ALTER FUNCTION "public"."link_qb_lines_to_jobs"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."log_trial_started"("p_tenant" "uuid", "p_when" timestamp with time zone DEFAULT "now"()) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
begin
  if not exists (select 1 from public.billing_payments where tenant_id = p_tenant and status = 'trial') then
    insert into public.billing_payments (tenant_id, occurred_at, description, amount, status)
    values (p_tenant, coalesce(p_when, now()), 'Free trial started', 0, 'trial');
  end if;
end $$;


ALTER FUNCTION "public"."log_trial_started"("p_tenant" "uuid", "p_when" timestamp with time zone) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."match_qb_customer_to_job"("qb_name" "text") RETURNS "uuid"
    LANGUAGE "plpgsql" STABLE
    AS $$
DECLARE
  v_id        UUID;
  v_root      TEXT := split_part(qb_name, ':', 1);
  v_sub       TEXT := NULLIF(split_part(qb_name, ':', 2), '');
  SIM_THRESH  CONSTANT FLOAT := 0.55;
BEGIN
  IF qb_name IS NULL OR length(trim(qb_name)) = 0 THEN
    RETURN NULL;
  END IF;

  SELECT id INTO v_id FROM jobs
   WHERE qb_customer_full_name = qb_name LIMIT 1;
  IF FOUND THEN RETURN v_id; END IF;

  PERFORM set_limit(0.45);

  SELECT id INTO v_id FROM (
    SELECT j.id,
           GREATEST(
             similarity(j.client_name, v_root),
             similarity(j.client_name, coalesce(v_sub, v_root)),
             similarity(coalesce(j.job_address,''), coalesce(v_sub, v_root))
           ) AS sim
    FROM jobs j
    WHERE j.client_name % v_root
       OR j.client_name % coalesce(v_sub, v_root)
       OR j.job_address  % coalesce(v_sub, v_root)
    ORDER BY sim DESC
    LIMIT 5
  ) best
  WHERE sim > SIM_THRESH
  LIMIT 1;

  RETURN v_id;
END;
$$;


ALTER FUNCTION "public"."match_qb_customer_to_job"("qb_name" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."material_current_price"("p_material_id" "uuid", "p_vendor_id" "uuid") RETURNS numeric
    LANGUAGE "sql" STABLE
    AS $$
  select public.price_as_of(p_material_id, p_vendor_id, current_date);
$$;


ALTER FUNCTION "public"."material_current_price"("p_material_id" "uuid", "p_vendor_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."material_estimate_usage"("p_id" "text" DEFAULT NULL::"text", "p_ref_key" "text" DEFAULT NULL::"text", "p_name" "text" DEFAULT NULL::"text") RETURNS TABLE("estimate_id" "text", "estimate_name" "text", "module_id" "text", "module_type" "text", "module_name" "text")
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select distinct
         e.id::text        as estimate_id,
         e.estimate_name,
         em.id::text       as module_id,
         em.module_type,
         em.module_name
  from estimate_modules em
  join estimate_projects ep on ep.id = em.project_id
  join estimates e         on e.id  = ep.estimate_id
  where (p_id      is not null and p_id      <> '' and strpos(em.data::text, p_id)      > 0)
     or (p_ref_key is not null and p_ref_key <> '' and strpos(em.data::text, p_ref_key) > 0)
     or (p_name    is not null and p_name    <> '' and strpos(em.data::text, p_name)    > 0)
  order by e.estimate_name;
$$;


ALTER FUNCTION "public"."material_estimate_usage"("p_id" "text", "p_ref_key" "text", "p_name" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."material_reference_count"("p_name" "text") RETURNS integer
    LANGUAGE "sql" STABLE
    AS $$
  select count(*)::int
  from public.estimate_modules
  where p_name is not null
    and p_name <> ''
    and position(lower(p_name) in lower(data::text)) > 0
$$;


ALTER FUNCTION "public"."material_reference_count"("p_name" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."merge_material"("p_keep" "uuid", "p_drop" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  if p_keep is null or p_drop is null or p_keep = p_drop then
    raise exception 'merge_material: keep/drop must differ and be non-null';
  end if;

  -- Move the dropped product's prices to keep, but only for vendors where keep
  -- has no OPEN price yet (avoid duplicate open (material,vendor) rows).
  update public.material_price mp
     set material_id = p_keep
   where mp.material_id = p_drop
     and not exists (
       select 1 from public.material_price k
        where k.material_id = p_keep
          and k.vendor_id = mp.vendor_id
          and k.effective_end is null
          and mp.effective_end is null
     );

  -- Remaining drop prices are redundant (vendor already priced on keep).
  delete from public.material_price where material_id = p_drop;

  -- Carry selection flag + photo/sku/calc_meta onto keep where it lacks them.
  update public.material k
     set show_in_selections = k.show_in_selections or d.show_in_selections,
         photo_url = coalesce(k.photo_url, d.photo_url),
         sku       = coalesce(k.sku, d.sku),
         calc_meta = coalesce(k.calc_meta, d.calc_meta)
    from public.material d
   where k.id = p_keep and d.id = p_drop;

  delete from public.material where id = p_drop;  -- cascades any leftover prices
end;
$$;


ALTER FUNCTION "public"."merge_material"("p_keep" "uuid", "p_drop" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."misc_set_ref_key"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
declare
  next_n integer;
  slug   text;
begin
  if new.ref_key is null or trim(new.ref_key) = '' then
    select coalesce(
             max((regexp_match(ref_key, '^MISC-(\d+)-'))[1]::int), 0) + 1
      into next_n
      from misc_rates
     where ref_key ~ '^MISC-\d+-';
    slug := trim(both '-' from
              regexp_replace(lower(coalesce(new.name, 'item')),
                             '[^a-z0-9]+', '-', 'g'));
    new.ref_key := 'MISC-' || lpad(next_n::text, 3, '0') || '-' || slug;
  end if;
  return new;
end;
$$;


ALTER FUNCTION "public"."misc_set_ref_key"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."my_payment_connection"() RETURNS "jsonb"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select coalesce(
    (select jsonb_build_object(
       'status', c.status,
       'account_id', c.helcim_account_id,
       'connected_at', c.connected_at
     )
     from public.tenant_payment_connections c
     where c.tenant_id = (select tenant_id from public.profiles where id = auth.uid())),
    jsonb_build_object('status', 'none')
  );
$$;


ALTER FUNCTION "public"."my_payment_connection"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."my_tenant_id"() RETURNS "uuid"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$ select tenant_id from public.profiles where id = auth.uid() limit 1; $$;


ALTER FUNCTION "public"."my_tenant_id"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."pbs_build_tree"("spec" "jsonb", "parent_ref" "text", "parent_type" "text", "my_tier" integer, "ord" integer, "ref" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql"
    AS $$
declare
  is_area boolean := (spec->>'type') = 'area';
  node jsonb;
  nodes jsonb := '[]'::jsonb;
  edges jsonb := '[]'::jsonb;
  child jsonb;
  sub jsonb;
  i int := 0;
  colors text[] := array['#1E40AF','#047857','#B45309','#7C3AED','#BE123C','#0F766E','#4338CA','#9333EA'];
begin
  if is_area then
    node := jsonb_build_object(
      'ref', ref, 'kind', 'container', 'label', spec->>'name',
      'position_title', spec->>'lead',
      'bg_color', colors[(my_tier % array_length(colors,1)) + 1],
      'box_style', jsonb_build_object('fill','border','borderWidth',2),
      'container_mode', 'independent', 'width', 210, 'height', 90,
      'tier', my_tier, 'tier_order', ord);
  else
    node := jsonb_build_object(
      'ref', ref, 'kind', 'position', 'position_title', spec->>'title',
      'width', 110, 'height', 40, 'tier', my_tier, 'tier_order', ord);
  end if;

  if parent_ref is not null then
    if parent_type = 'area' then
      node := node || jsonb_build_object('parent_ref', parent_ref);
    else
      edges := edges || jsonb_build_object(
        'source_ref', parent_ref, 'target_ref', ref, 'relationship', 'reports_to', 'style', 'solid');
    end if;
  end if;
  nodes := nodes || node;

  if spec ? 'children' then
    for child in select value from jsonb_array_elements(spec->'children') loop
      sub := pbs_build_tree(child, ref, (spec->>'type'), my_tier + 1, i, ref || '_' || i);
      nodes := nodes || (sub->'nodes');
      edges := edges || (sub->'edges');
      i := i + 1;
    end loop;
  end if;

  return jsonb_build_object('nodes', nodes, 'edges', edges);
end $$;


ALTER FUNCTION "public"."pbs_build_tree"("spec" "jsonb", "parent_ref" "text", "parent_type" "text", "my_tier" integer, "ord" integer, "ref" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."pbs_fmt_phone"("raw" "text") RETURNS "text"
    LANGUAGE "plpgsql" IMMUTABLE
    AS $$
declare
  d text;
begin
  if raw is null then
    return null;
  end if;
  d := regexp_replace(raw, '\D', '', 'g');
  if length(d) = 11 and left(d, 1) = '1' then
    d := substring(d from 2);
  end if;
  if length(d) = 10 then
    return '1 (' || substring(d, 1, 3) || ') ' || substring(d, 4, 3) || '-' || substring(d, 7, 4);
  end if;
  return raw;
end;
$$;


ALTER FUNCTION "public"."pbs_fmt_phone"("raw" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."portal_approve_change_order"("p_co_id" "uuid", "p_signed_by" "text", "p_signature" "text") RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_client_id uuid;
  v_job_id uuid;
BEGIN
  SELECT cp.client_id INTO v_client_id
  FROM client_portals cp
  WHERE cp.auth_user_id = auth.uid() AND cp.status = 'active'
  LIMIT 1;
  IF v_client_id IS NULL THEN
    RAISE EXCEPTION 'Not an active portal user';
  END IF;

  SELECT b.linked_job_id INTO v_job_id
  FROM bids b
  JOIN jobs j ON j.id = b.linked_job_id
  WHERE b.id = p_co_id
    AND b.record_type = 'change_order'
    AND j.client_id = v_client_id;
  IF v_job_id IS NULL THEN
    RAISE EXCEPTION 'Change order not found for this client';
  END IF;

  UPDATE bids
  SET status = 'sold',
      signed_at = now(),
      signed_by_name = p_signed_by,
      signature_data_url = p_signature,
      co_decline_reason = NULL
  WHERE id = p_co_id;

  -- One work order per approved CO.
  IF NOT EXISTS (SELECT 1 FROM work_orders w WHERE w.source_change_order_id = p_co_id) THEN
    INSERT INTO work_orders (
      job_id, project_name, module_type, is_manual,
      labor_hours, material_cost, total_price, status, notes, source_change_order_id
    )
    SELECT
      v_job_id,
      COALESCE(b.co_name, 'Change Order'),
      'Change Order',
      true,
      COALESCE((SELECT SUM((it->>'labor_hours')::numeric)
                FROM jsonb_array_elements(COALESCE(b.co_line_items, '[]'::jsonb)) it), 0),
      COALESCE((SELECT SUM((it->>'material_cost')::numeric)
                FROM jsonb_array_elements(COALESCE(b.co_line_items, '[]'::jsonb)) it), 0),
      COALESCE(b.bid_amount, 0),
      'pending',
      'From Change Order #' || COALESCE(b.custom_co_id::text, ''),
      p_co_id
    FROM bids b
    WHERE b.id = p_co_id;
  END IF;

  RETURN 'approved';
END;
$$;


ALTER FUNCTION "public"."portal_approve_change_order"("p_co_id" "uuid", "p_signed_by" "text", "p_signature" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."portal_change_orders"("p_client_id" "uuid" DEFAULT NULL::"uuid") RETURNS TABLE("id" "uuid", "linked_job_id" "uuid", "custom_co_id" integer, "co_name" "text", "co_method" "text", "scope_of_work_html" "text", "bid_amount" numeric, "status" "text", "co_line_items" "jsonb", "co_decline_reason" "text", "signed_at" timestamp with time zone, "signed_by_name" "text", "signature_data_url" "text", "date_submitted" "date", "created_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_client_id uuid;
BEGIN
  SELECT cp.client_id INTO v_client_id
  FROM client_portals cp
  WHERE cp.auth_user_id = auth.uid() AND cp.status = 'active'
  LIMIT 1;

  IF v_client_id IS NULL THEN
    v_client_id := p_client_id;
  END IF;

  IF v_client_id IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    b.id,
    b.linked_job_id,
    b.custom_co_id,
    b.co_name,
    b.co_method,
    b.scope_of_work_html,
    b.bid_amount,
    b.status,
    COALESCE(b.co_line_items, '[]'::jsonb),
    b.co_decline_reason,
    b.signed_at,
    b.signed_by_name,
    b.signature_data_url,
    b.date_submitted,
    b.created_at
  FROM bids b
  JOIN jobs j ON j.id = b.linked_job_id
  WHERE b.record_type = 'change_order'
    AND j.client_id = v_client_id
    AND COALESCE(b.status, '') <> 'unreleased'
  ORDER BY b.date_submitted DESC NULLS LAST, b.custom_co_id DESC NULLS LAST;
END;
$$;


ALTER FUNCTION "public"."portal_change_orders"("p_client_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."portal_client_id"() RETURNS "uuid"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT client_id FROM client_portals
  WHERE auth_user_id = auth.uid() AND status = 'active'
  LIMIT 1;
$$;


ALTER FUNCTION "public"."portal_client_id"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."portal_client_info"() RETURNS "jsonb"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT to_jsonb(c) FROM clients c
  JOIN client_portals cp ON cp.client_id = c.id
  WHERE cp.auth_user_id = auth.uid() AND cp.status = 'active'
  LIMIT 1;
$$;


ALTER FUNCTION "public"."portal_client_info"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."portal_client_info"("p_client_id" "uuid") RETURNS "jsonb"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT to_jsonb(c) FROM clients c WHERE is_staff() AND c.id = p_client_id LIMIT 1;
$$;


ALTER FUNCTION "public"."portal_client_info"("p_client_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."portal_complete_activation"("p_token" "text", "p_account_name" "text") RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE v_id uuid;
BEGIN
  SELECT id INTO v_id FROM client_portals
  WHERE invite_token = p_token AND status = 'invited'
    AND (invite_token_expires_at IS NULL OR invite_token_expires_at > now());
  IF v_id IS NULL THEN RETURN 'invalid'; END IF;
  UPDATE client_portals
  SET auth_user_id = auth.uid(),
      account_name = NULLIF(TRIM(p_account_name),''),
      status = 'active', activated_at = now(),
      invite_token = NULL, invite_token_expires_at = NULL
  WHERE id = v_id;
  RETURN 'active';
END $$;


ALTER FUNCTION "public"."portal_complete_activation"("p_token" "text", "p_account_name" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."portal_daily_log_photos"() RETURNS SETOF "jsonb"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT to_jsonb(p) FROM daily_log_photos p
  WHERE p.log_id IN (
    SELECT d.id FROM daily_logs d
    WHERE d.job_id IN (
      SELECT j.id FROM jobs j
      JOIN client_portals cp ON cp.client_id = j.client_id
      WHERE cp.auth_user_id = auth.uid()
        AND cp.status = 'active'
        AND cp.perm_daily_logs
    )
  );
$$;


ALTER FUNCTION "public"."portal_daily_log_photos"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."portal_daily_log_photos"("p_client_id" "uuid") RETURNS SETOF "jsonb"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT to_jsonb(p) FROM daily_log_photos p
  WHERE is_staff() AND p.log_id IN (
    SELECT d.id FROM daily_logs d
    WHERE d.job_id IN (SELECT id FROM jobs WHERE client_id = p_client_id)
  );
$$;


ALTER FUNCTION "public"."portal_daily_log_photos"("p_client_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."portal_daily_logs"() RETURNS SETOF "jsonb"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT to_jsonb(d) FROM daily_logs d
  WHERE d.job_id IN (
    SELECT j.id FROM jobs j JOIN client_portals cp ON cp.client_id = j.client_id
    WHERE cp.auth_user_id = auth.uid() AND cp.status='active' AND cp.perm_daily_logs
  )
  ORDER BY d.created_at DESC NULLS LAST;
$$;


ALTER FUNCTION "public"."portal_daily_logs"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."portal_daily_logs"("p_client_id" "uuid") RETURNS SETOF "jsonb"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT to_jsonb(d) FROM daily_logs d
  WHERE is_staff() AND d.job_id IN (SELECT id FROM jobs WHERE client_id = p_client_id)
  ORDER BY d.created_at DESC NULLS LAST;
$$;


ALTER FUNCTION "public"."portal_daily_logs"("p_client_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."portal_decline_change_order"("p_co_id" "uuid", "p_reason" "text") RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_client_id uuid;
  v_job_id uuid;
BEGIN
  SELECT cp.client_id INTO v_client_id
  FROM client_portals cp
  WHERE cp.auth_user_id = auth.uid() AND cp.status = 'active'
  LIMIT 1;
  IF v_client_id IS NULL THEN
    RAISE EXCEPTION 'Not an active portal user';
  END IF;

  SELECT b.linked_job_id INTO v_job_id
  FROM bids b
  JOIN jobs j ON j.id = b.linked_job_id
  WHERE b.id = p_co_id
    AND b.record_type = 'change_order'
    AND j.client_id = v_client_id;
  IF v_job_id IS NULL THEN
    RAISE EXCEPTION 'Change order not found for this client';
  END IF;

  UPDATE bids
  SET status = 'lost',
      co_decline_reason = p_reason
  WHERE id = p_co_id;

  RETURN 'declined';
END;
$$;


ALTER FUNCTION "public"."portal_decline_change_order"("p_co_id" "uuid", "p_reason" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."portal_invoice_attachments"("p_client_id" "uuid" DEFAULT NULL::"uuid") RETURNS TABLE("id" "uuid", "invoice_id" "uuid", "file_name" "text", "file_type" "text", "file_size" bigint, "storage_path" "text")
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare v_client uuid;
begin
  if p_client_id is not null and public.is_staff() then
    v_client := p_client_id;
  else
    v_client := public.portal_client_id();
  end if;
  if v_client is null then return; end if;
  if not exists (select 1 from client_portals cp
                 where cp.client_id = v_client
                   and coalesce(cp.perm_invoices,false) = true) then
    return;
  end if;
  return query
  select f.id, f.invoice_id, f.file_name, f.file_type,
         f.file_size::bigint, f.storage_path
  from job_files f
  join job_invoices ji on ji.id = f.invoice_id
  join jobs j on j.id = ji.job_id
  where j.client_id = v_client and f.invoice_id is not null;
end; $$;


ALTER FUNCTION "public"."portal_invoice_attachments"("p_client_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."portal_invoice_lines"("p_invoice_id" "uuid") RETURNS SETOF "jsonb"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT to_jsonb(l) FROM job_invoice_lines l
  WHERE l.invoice_id = p_invoice_id
    AND l.invoice_id IN (
      SELECT i.id FROM job_invoices i
      JOIN jobs j ON j.id = i.job_id
      JOIN client_portals cp ON cp.client_id = j.client_id
      WHERE cp.auth_user_id = auth.uid() AND cp.status='active'
        AND cp.perm_invoices AND i.status IN ('sent','paid')
    )
  ORDER BY l.sort_order;
$$;


ALTER FUNCTION "public"."portal_invoice_lines"("p_invoice_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."portal_invoices"() RETURNS SETOF "jsonb"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT to_jsonb(i) FROM job_invoices i
  WHERE i.status IN ('sent','paid')
    AND i.job_id IN (
      SELECT j.id FROM jobs j JOIN client_portals cp ON cp.client_id = j.client_id
      WHERE cp.auth_user_id = auth.uid() AND cp.status='active' AND cp.perm_invoices
    )
  ORDER BY i.created_at DESC NULLS LAST;
$$;


ALTER FUNCTION "public"."portal_invoices"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."portal_invoices"("p_client_id" "uuid") RETURNS SETOF "jsonb"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT to_jsonb(i) FROM job_invoices i
  WHERE is_staff() AND i.status IN ('sent','paid')
    AND i.job_id IN (SELECT id FROM jobs WHERE client_id = p_client_id)
  ORDER BY i.created_at DESC NULLS LAST;
$$;


ALTER FUNCTION "public"."portal_invoices"("p_client_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."portal_jobs"() RETURNS SETOF "jsonb"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT to_jsonb(j) FROM jobs j
  JOIN client_portals cp ON cp.client_id = j.client_id
  WHERE cp.auth_user_id = auth.uid() AND cp.status = 'active'
  ORDER BY j.name NULLS LAST;
$$;


ALTER FUNCTION "public"."portal_jobs"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."portal_jobs"("p_client_id" "uuid") RETURNS SETOF "jsonb"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT to_jsonb(j) FROM jobs j
  WHERE is_staff() AND j.client_id = p_client_id
  ORDER BY j.name NULLS LAST;
$$;


ALTER FUNCTION "public"."portal_jobs"("p_client_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."portal_payments"() RETURNS SETOF "jsonb"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT to_jsonb(p) FROM job_invoice_payments p
  WHERE p.job_id IN (
    SELECT j.id FROM jobs j JOIN client_portals cp ON cp.client_id = j.client_id
    WHERE cp.auth_user_id = auth.uid() AND cp.status='active' AND cp.perm_invoices
  )
  ORDER BY p.payment_date DESC NULLS LAST;
$$;


ALTER FUNCTION "public"."portal_payments"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."portal_payments"("p_client_id" "uuid") RETURNS SETOF "jsonb"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT to_jsonb(p) FROM job_invoice_payments p
  WHERE is_staff() AND p.job_id IN (SELECT id FROM jobs WHERE client_id = p_client_id)
  ORDER BY p.payment_date DESC NULLS LAST;
$$;


ALTER FUNCTION "public"."portal_payments"("p_client_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."portal_record_payment"("p_invoice_id" "uuid", "p_amount" numeric, "p_transaction_id" "text", "p_method" "text") RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE v_cid uuid; v_inv job_invoices%ROWTYPE; v_paid numeric;
BEGIN
  SELECT client_id INTO v_cid FROM client_portals
    WHERE auth_user_id = auth.uid() AND status = 'active' LIMIT 1;
  IF v_cid IS NULL THEN RETURN 'not_authorized'; END IF;

  SELECT * INTO v_inv FROM job_invoices WHERE id = p_invoice_id;
  IF NOT FOUND THEN RETURN 'invoice_not_found'; END IF;
  IF NOT EXISTS (SELECT 1 FROM jobs WHERE id = v_inv.job_id AND client_id = v_cid) THEN
    RETURN 'not_authorized';
  END IF;

  INSERT INTO job_invoice_payments (invoice_id, job_id, amount, payment_date,
    method, status, helcim_transaction_id, source)
  VALUES (p_invoice_id, v_inv.job_id, p_amount, CURRENT_DATE,
    p_method, 'Completed', p_transaction_id, 'helcim');

  v_paid := COALESCE(v_inv.amount_paid, 0) + p_amount;
  UPDATE job_invoices
    SET amount_paid = v_paid,
        paid_date = CASE WHEN v_paid >= amount THEN CURRENT_DATE ELSE paid_date END,
        status    = CASE WHEN v_paid >= amount THEN 'paid' ELSE status END
  WHERE id = p_invoice_id;
  RETURN 'recorded';
END $$;


ALTER FUNCTION "public"."portal_record_payment"("p_invoice_id" "uuid", "p_amount" numeric, "p_transaction_id" "text", "p_method" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."portal_schedule"() RETURNS SETOF "jsonb"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT to_jsonb(s) FROM schedule_items s
  WHERE s.job_id IN (
    SELECT j.id FROM jobs j JOIN client_portals cp ON cp.client_id = j.client_id
    WHERE cp.auth_user_id = auth.uid() AND cp.status='active' AND cp.perm_schedule
  )
  ORDER BY s.start_date NULLS LAST;
$$;


ALTER FUNCTION "public"."portal_schedule"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."portal_schedule"("p_client_id" "uuid") RETURNS SETOF "jsonb"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT to_jsonb(s) FROM schedule_items s
  WHERE is_staff() AND s.job_id IN (SELECT id FROM jobs WHERE client_id = p_client_id)
  ORDER BY s.start_date NULLS LAST;
$$;


ALTER FUNCTION "public"."portal_schedule"("p_client_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."portal_validate_invite"("p_token" "text") RETURNS TABLE("client_id" "uuid", "client_name" "text", "invite_email" "text")
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT cp.client_id,
         COALESCE(NULLIF(TRIM(c.name),''),
                  NULLIF(TRIM(COALESCE(c.first_name,'')||' '||COALESCE(c.last_name,'')),''),
                  c.company_name, c.email),
         cp.invite_email
  FROM client_portals cp
  JOIN clients c ON c.id = cp.client_id
  WHERE cp.invite_token = p_token
    AND cp.status = 'invited'
    AND (cp.invite_token_expires_at IS NULL OR cp.invite_token_expires_at > now());
$$;


ALTER FUNCTION "public"."portal_validate_invite"("p_token" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."price_as_of"("p_rate_id" "uuid", "p_date" "date") RETURNS numeric
    LANGUAGE "sql" STABLE
    AS $$
  select coalesce(
    (
      select h.unit_cost
      from public.material_price_history h
      where h.material_rate_id = p_rate_id
        and h.effective_start <= p_date
        and (h.effective_end is null or h.effective_end >= p_date)
      order by h.effective_start desc
      limit 1
    ),
    (select unit_cost from public.material_rates where id = p_rate_id)
  );
$$;


ALTER FUNCTION "public"."price_as_of"("p_rate_id" "uuid", "p_date" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."price_as_of"("p_material_id" "uuid", "p_vendor_id" "uuid", "p_date" "date") RETURNS numeric
    LANGUAGE "sql" STABLE
    AS $$
  select coalesce(
    (
      select h.unit_cost from public.material_price_history h
       where h.material_rate_id = p_material_id
         and h.vendor_id is not distinct from p_vendor_id
         and h.effective_start <= p_date
         and (h.effective_end is null or h.effective_end >= p_date)
       order by h.effective_start desc
       limit 1
    ),
    (
      select h.unit_cost from public.material_price_history h
       where h.material_rate_id = p_material_id
         and h.vendor_id is null
         and h.effective_start <= p_date
         and (h.effective_end is null or h.effective_end >= p_date)
       order by h.effective_start desc
       limit 1
    ),
    (select unit_cost from public.material_rates where id = p_material_id)
  );
$$;


ALTER FUNCTION "public"."price_as_of"("p_material_id" "uuid", "p_vendor_id" "uuid", "p_date" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."provision_my_tenant"("p_company" "text", "p_plan" "text" DEFAULT 'tier1'::"text", "p_packages" "text"[] DEFAULT '{}'::"text"[]) RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  uid uuid := auth.uid();
  t uuid; plan_id text;
  company text := coalesce(nullif(trim(p_company), ''), 'My Company');
begin
  if uid is null then raise exception 'Not authenticated'; end if;
  if exists (select 1 from public.profiles where id=uid and tenant_id is not null) then
    raise exception 'This account is already set up';
  end if;

  select id into plan_id from public.plans where id = p_plan;
  if plan_id is null then plan_id := 'tier1'; end if;

  insert into public.tenants (name, plan_id, status, trial_started_at, trial_ends_at, owner_user_id)
  values (company, plan_id, 'trialing', now(), now() + interval '14 days', uid)
  returning id into t;

  insert into public.profiles (id, email, full_name, role, tenant_id)
  values (uid, (select email from auth.users where id=uid), company, 'super_admin', t)
  on conflict (id) do update set tenant_id=excluded.tenant_id, role='super_admin';

  if array_length(p_packages, 1) is not null then
    insert into public.tenant_packages (tenant_id, package_id)
    select t, pk.id from public.packages pk
     where pk.id = any(p_packages)
       and (select rank from public.plans where id=plan_id) >= pk.requires_tier_rank
    on conflict do nothing;
  end if;

  insert into public.company_settings (id, company_name, tenant_id)
  values ((select coalesce(max(id),0)+1 from public.company_settings), company, t)
  on conflict do nothing;

  perform public.log_trial_started(t, now());
  return t;
end $$;


ALTER FUNCTION "public"."provision_my_tenant"("p_company" "text", "p_plan" "text", "p_packages" "text"[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."request_package"("p_package_id" "text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare t uuid := (select tenant_id from public.profiles where id=auth.uid() limit 1); rid uuid;
begin
  if t is null then raise exception 'Not authenticated'; end if;
  if not exists (select 1 from public.packages where id=p_package_id) then raise exception 'Unknown package'; end if;
  if exists (select 1 from public.tenant_packages where tenant_id=t and package_id=p_package_id) then return null; end if;
  select id into rid from public.package_requests where tenant_id=t and package_id=p_package_id and status='pending' limit 1;
  if rid is not null then return rid; end if;
  insert into public.package_requests (tenant_id, package_id, requested_by) values (t, p_package_id, auth.uid()) returning id into rid;
  return rid;
end $$;


ALTER FUNCTION "public"."request_package"("p_package_id" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."resolve_acct_account_parents"() RETURNS integer
    LANGUAGE "plpgsql"
    AS $$
DECLARE v_count INTEGER;
BEGIN
  UPDATE acct_accounts c
     SET parent_id = p.id
    FROM acct_accounts p
   WHERE c.parent_qb_list_id IS NOT NULL
     AND p.qb_list_id IS NOT NULL
     AND c.parent_qb_list_id = p.qb_list_id
     AND (c.parent_id IS DISTINCT FROM p.id);
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;


ALTER FUNCTION "public"."resolve_acct_account_parents"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sam_public_gate"("p_ip" "text", "p_daily_cap" integer DEFAULT 30, "p_burst_cap" integer DEFAULT 6, "p_global_cap" integer DEFAULT 5000) RETURNS TABLE("allowed" boolean, "reason" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_day text := to_char(now() at time zone 'utc', 'YYYY-MM-DD');
  v_min text := to_char(date_trunc('minute', now() at time zone 'utc'), 'YYYY-MM-DD"T"HH24:MI');
  m_count int; g_count int; d_count int;
begin
  -- Opportunistic cleanup of expired buckets.
  delete from public.sam_counter where expires_at < now();

  -- 1) Burst: per IP per minute.
  insert into public.sam_counter(scope, key, count, expires_at)
    values ('min', p_ip || '|' || v_min, 1, now() + interval '2 minutes')
    on conflict (scope, key) do update set count = public.sam_counter.count + 1
    returning count into m_count;
  if p_burst_cap > 0 and m_count > p_burst_cap then
    return query select false, 'burst'; return;
  end if;

  -- 2) Global daily ceiling (cost circuit-breaker).
  if p_global_cap > 0 then
    insert into public.sam_counter(scope, key, count, expires_at)
      values ('global', v_day, 1, now() + interval '2 days')
      on conflict (scope, key) do update set count = public.sam_counter.count + 1
      returning count into g_count;
    if g_count > p_global_cap then
      return query select false, 'global'; return;
    end if;
  end if;

  -- 3) Per-IP daily cap.
  insert into public.sam_counter(scope, key, count, expires_at)
    values ('day', p_ip || '|' || v_day, 1, now() + interval '2 days')
    on conflict (scope, key) do update set count = public.sam_counter.count + 1
    returning count into d_count;
  if p_daily_cap > 0 and d_count > p_daily_cap then
    return query select false, 'daily'; return;
  end if;

  return query select true, 'ok';
end $$;


ALTER FUNCTION "public"."sam_public_gate"("p_ip" "text", "p_daily_cap" integer, "p_burst_cap" integer, "p_global_cap" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_beta_card"("p_brand" "text", "p_last4" "text", "p_exp" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  t uuid := (select tenant_id from public.profiles where id=auth.uid() limit 1);
  v_last4 text := right(regexp_replace(coalesce(p_last4,''),'\D','','g'),4);
begin
  if t is null then return; end if;
  update public.tenants
     set card_brand=nullif(p_brand,''), card_last4=v_last4, card_exp=nullif(p_exp,''),
         billing_status=coalesce(billing_status,'trialing'), updated_at=now()
   where id=t and helcim_subscription_id is null;

  -- reflect the card on the trial ledger row (so the history table shows it)
  update public.billing_payments
     set method='card', card_brand=nullif(p_brand,''), card_last4=v_last4
   where tenant_id=t and status='trial';
end $$;


ALTER FUNCTION "public"."set_beta_card"("p_brand" "text", "p_last4" "text", "p_exp" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_my_extension"("p_ext" "text", "p_status" "text" DEFAULT 'active'::"text", "p_period_end" timestamp with time zone DEFAULT NULL::timestamp with time zone) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare t uuid; r text;
begin
  t := public.auth_tenant_id();
  if t is null then raise exception 'no tenant for caller'; end if;
  select role into r from public.profiles where id = auth.uid();
  if r is null or r not in ('owner','admin','super_admin') then
    raise exception 'only an owner/admin can change extensions';
  end if;
  insert into public.tenant_extensions (tenant_id, extension_id, status, current_period_end)
  values (t, p_ext, p_status, p_period_end)
  on conflict (tenant_id, extension_id)
    do update set status = excluded.status, current_period_end = excluded.current_period_end;
end;
$$;


ALTER FUNCTION "public"."set_my_extension"("p_ext" "text", "p_status" "text", "p_period_end" timestamp with time zone) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_tenant_id"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare t uuid;
begin
  if new.tenant_id is not null then return new; end if;
  t := public.auth_tenant_id();
  if t is null then return new; end if;
  new.tenant_id := t;
  return new;
end;
$$;


ALTER FUNCTION "public"."set_tenant_id"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_username"("p_username" "text") RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_exists BOOLEAN;
BEGIN
  -- Check if taken by someone else
  SELECT EXISTS (
    SELECT 1 FROM profiles
     WHERE LOWER(username) = LOWER(TRIM(p_username))
       AND id <> auth.uid()
  ) INTO v_exists;
 
  IF v_exists THEN
    RETURN 'taken';
  END IF;
 
  UPDATE profiles
     SET username = LOWER(TRIM(p_username))
   WHERE id = auth.uid();
 
  RETURN 'ok';
END;
$$;


ALTER FUNCTION "public"."set_username"("p_username" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."start_payment_connection"() RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  t uuid := (select tenant_id from public.profiles where id = auth.uid());
  r text;
  is_admin boolean := exists (
    select 1 from public.profiles
     where id = auth.uid() and role in ('owner','admin')
  );
begin
  if t is null then raise exception 'No tenant'; end if;
  if not is_admin then raise exception 'Only an owner/admin can connect payments'; end if;

  r := encode(gen_random_bytes(12), 'hex');
  insert into public.tenant_payment_connections (tenant_id, status, registration_ref, updated_at)
  values (t, 'pending', r, now())
  on conflict (tenant_id) do update
    set status = 'pending', registration_ref = r, updated_at = now();
  return r;
end $$;


ALTER FUNCTION "public"."start_payment_connection"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."tg_set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."tg_set_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."touch_agent_conversation"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  UPDATE public.agent_conversations
  SET updated_at = NOW()
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."touch_agent_conversation"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."touch_agent_user_preferences"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;


ALTER FUNCTION "public"."touch_agent_user_preferences"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."touch_companies_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;


ALTER FUNCTION "public"."touch_companies_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."touch_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."touch_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trg_auto_link_qb_line_to_job"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF NEW.job_id IS NULL AND NEW.qb_customer_full_name IS NOT NULL THEN
    NEW.job_id := match_qb_customer_to_job(NEW.qb_customer_full_name);
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."trg_auto_link_qb_line_to_job"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_contacts_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;


ALTER FUNCTION "public"."update_contacts_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_positions_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;


ALTER FUNCTION "public"."update_positions_updated_at"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."_bak_finish_labor_retire_20260821" (
    "id" "uuid",
    "name" "text",
    "rate_per_day" numeric,
    "notes" "text",
    "created_by" "uuid",
    "created_at" timestamp with time zone,
    "rate" numeric(10,4),
    "unit" "text",
    "category" "text",
    "tenant_id" "uuid",
    "sub_category" "text",
    "label" "text"
);


ALTER TABLE "public"."_bak_finish_labor_retire_20260821" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."_bak_finish_material_retire_20260821" (
    "id" "uuid",
    "tenant_id" "uuid",
    "category_id" "uuid",
    "subcategory_id" "uuid",
    "description" "text",
    "unit" "text",
    "calc_meta" "jsonb",
    "is_default" boolean,
    "legacy_rate_id" "uuid",
    "created_at" timestamp with time zone,
    "collection" "text",
    "sku" "text",
    "photo_url" "text",
    "attributes" "jsonb",
    "show_in_selections" boolean,
    "sf_per_pallet" numeric,
    "price_per_lf_vert" numeric,
    "watts" numeric,
    "va" numeric,
    "labor_hrs_ea" numeric,
    "sub_price_ea" numeric,
    "notes" "text",
    "product_type_id" "uuid",
    "archived_at" timestamp with time zone
);


ALTER TABLE "public"."_bak_finish_material_retire_20260821" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."_bak_finish_misc_retire_20260821" (
    "id" "uuid",
    "tenant_id" "uuid",
    "category" "text",
    "name" "text",
    "unit" "text",
    "rate" numeric,
    "notes" "text",
    "created_at" timestamp with time zone,
    "label" "text"
);


ALTER TABLE "public"."_bak_finish_misc_retire_20260821" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."_bak_import_base_20260821" (
    "id" "uuid",
    "name" "text",
    "rate_per_day" numeric,
    "notes" "text",
    "created_by" "uuid",
    "created_at" timestamp with time zone,
    "rate" numeric(10,4),
    "unit" "text",
    "category" "text",
    "tenant_id" "uuid",
    "sub_category" "text",
    "label" "text"
);


ALTER TABLE "public"."_bak_import_base_20260821" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."acct_accounts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "number" "text",
    "name" "text" NOT NULL,
    "type" "text" NOT NULL,
    "subtype" "text",
    "description" "text",
    "is_active" boolean DEFAULT true,
    "sort_order" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "qb_list_id" "text",
    "qb_full_name" "text",
    "qb_account_type" "text",
    "qb_edit_sequence" "text",
    "qb_time_modified" timestamp with time zone,
    "qb_synced_at" timestamp with time zone,
    "parent_id" "uuid",
    "parent_qb_list_id" "text",
    "source" "text" DEFAULT 'manual'::"text" NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    CONSTRAINT "acct_accounts_source_check" CHECK (("source" = ANY (ARRAY['manual'::"text", 'qb'::"text"]))),
    CONSTRAINT "acct_accounts_type_check" CHECK (("type" = ANY (ARRAY['asset'::"text", 'liability'::"text", 'equity'::"text", 'income'::"text", 'cogs'::"text", 'expense'::"text"])))
);


ALTER TABLE "public"."acct_accounts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."acct_bank_accounts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "type" "text" NOT NULL,
    "institution" "text",
    "account_number_last4" "text",
    "current_balance" numeric(12,2) DEFAULT 0,
    "is_active" boolean DEFAULT true,
    "gl_account_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "tenant_id" "uuid" NOT NULL,
    CONSTRAINT "acct_bank_accounts_type_check" CHECK (("type" = ANY (ARRAY['checking'::"text", 'savings'::"text", 'credit_card'::"text", 'loan'::"text", 'other'::"text"])))
);


ALTER TABLE "public"."acct_bank_accounts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."acct_bank_transactions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "bank_account_id" "uuid" NOT NULL,
    "date" "date" NOT NULL,
    "description" "text",
    "amount" numeric(12,2) NOT NULL,
    "type" "text" DEFAULT 'other'::"text",
    "category_id" "uuid",
    "is_reconciled" boolean DEFAULT false,
    "payment_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "tenant_id" "uuid" NOT NULL,
    CONSTRAINT "acct_bank_transactions_type_check" CHECK (("type" = ANY (ARRAY['deposit'::"text", 'withdrawal'::"text", 'transfer'::"text", 'other'::"text"])))
);


ALTER TABLE "public"."acct_bank_transactions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."acct_bill_lines" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "bill_id" "uuid" NOT NULL,
    "description" "text",
    "quantity" numeric(10,2) DEFAULT 1,
    "unit_price" numeric(12,2) DEFAULT 0,
    "amount" numeric(12,2) DEFAULT 0,
    "account_id" "uuid",
    "sort_order" integer DEFAULT 0,
    "qb_line_id" "text",
    "line_type" "text",
    "job_id" "uuid",
    "qb_customer_full_name" "text",
    "qb_account_name" "text",
    "item_name" "text",
    "billable_status" "text",
    "class_name" "text",
    "tenant_id" "uuid" NOT NULL,
    CONSTRAINT "acct_bill_lines_line_type_check" CHECK (("line_type" = ANY (ARRAY['item'::"text", 'expense'::"text"])))
);


ALTER TABLE "public"."acct_bill_lines" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."acct_bills" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "number" "text",
    "vendor_id" "uuid",
    "vendor_name" "text",
    "date" "date" NOT NULL,
    "due_date" "date",
    "status" "text" DEFAULT 'open'::"text",
    "subtotal" numeric(12,2) DEFAULT 0,
    "tax_amount" numeric(12,2) DEFAULT 0,
    "total" numeric(12,2) DEFAULT 0,
    "amount_paid" numeric(12,2) DEFAULT 0,
    "balance_due" numeric(12,2) DEFAULT 0,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "job_id" "uuid",
    "qb_txn_id" "text",
    "qb_edit_sequence" "text",
    "qb_time_created" timestamp with time zone,
    "qb_time_modified" timestamp with time zone,
    "qb_synced_at" timestamp with time zone,
    "source" "text" DEFAULT 'manual'::"text" NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    CONSTRAINT "acct_bills_source_check" CHECK (("source" = ANY (ARRAY['manual'::"text", 'qb'::"text"]))),
    CONSTRAINT "acct_bills_status_check" CHECK (("status" = ANY (ARRAY['draft'::"text", 'open'::"text", 'paid'::"text", 'overdue'::"text", 'void'::"text"])))
);


ALTER TABLE "public"."acct_bills" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."acct_check_lines" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "check_id" "uuid" NOT NULL,
    "qb_line_id" "text",
    "line_type" "text",
    "job_id" "uuid",
    "qb_customer_full_name" "text",
    "account_id" "uuid",
    "qb_account_name" "text",
    "item_name" "text",
    "description" "text",
    "quantity" numeric(10,2),
    "unit_price" numeric(12,2),
    "amount" numeric(12,2) DEFAULT 0,
    "billable_status" "text",
    "class_name" "text",
    "sort_order" integer DEFAULT 0,
    "tenant_id" "uuid" NOT NULL,
    CONSTRAINT "acct_check_lines_line_type_check" CHECK (("line_type" = ANY (ARRAY['item'::"text", 'expense'::"text"])))
);


ALTER TABLE "public"."acct_check_lines" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."acct_checks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "qb_txn_id" "text",
    "ref_number" "text",
    "payee_type" "text",
    "payee_id" "uuid",
    "payee_name" "text",
    "bank_account_id" "uuid",
    "bank_account_name" "text",
    "date" "date" NOT NULL,
    "total" numeric(12,2) DEFAULT 0,
    "memo" "text",
    "is_to_be_printed" boolean,
    "source" "text" DEFAULT 'manual'::"text" NOT NULL,
    "qb_edit_sequence" "text",
    "qb_time_created" timestamp with time zone,
    "qb_time_modified" timestamp with time zone,
    "qb_synced_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "tenant_id" "uuid" NOT NULL,
    CONSTRAINT "acct_checks_source_check" CHECK (("source" = ANY (ARRAY['manual'::"text", 'qb'::"text"])))
);


ALTER TABLE "public"."acct_checks" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."acct_credit_card_charge_lines" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "charge_id" "uuid" NOT NULL,
    "qb_line_id" "text",
    "line_type" "text",
    "job_id" "uuid",
    "qb_customer_full_name" "text",
    "account_id" "uuid",
    "qb_account_name" "text",
    "item_name" "text",
    "description" "text",
    "quantity" numeric(10,2),
    "unit_price" numeric(12,2),
    "amount" numeric(12,2) DEFAULT 0,
    "billable_status" "text",
    "class_name" "text",
    "sort_order" integer DEFAULT 0,
    "tenant_id" "uuid" NOT NULL,
    CONSTRAINT "acct_credit_card_charge_lines_line_type_check" CHECK (("line_type" = ANY (ARRAY['item'::"text", 'expense'::"text"])))
);


ALTER TABLE "public"."acct_credit_card_charge_lines" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."acct_credit_card_charges" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "qb_txn_id" "text",
    "ref_number" "text",
    "payee_type" "text",
    "payee_id" "uuid",
    "payee_name" "text",
    "credit_card_account_id" "uuid",
    "credit_card_account_name" "text",
    "date" "date" NOT NULL,
    "total" numeric(12,2) DEFAULT 0,
    "memo" "text",
    "source" "text" DEFAULT 'manual'::"text" NOT NULL,
    "qb_edit_sequence" "text",
    "qb_time_created" timestamp with time zone,
    "qb_time_modified" timestamp with time zone,
    "qb_synced_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "tenant_id" "uuid" NOT NULL,
    CONSTRAINT "acct_credit_card_charges_source_check" CHECK (("source" = ANY (ARRAY['manual'::"text", 'qb'::"text"])))
);


ALTER TABLE "public"."acct_credit_card_charges" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."acct_invoice_lines" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "invoice_id" "uuid" NOT NULL,
    "description" "text",
    "quantity" numeric(10,2) DEFAULT 1,
    "unit_price" numeric(12,2) DEFAULT 0,
    "amount" numeric(12,2) DEFAULT 0,
    "account_id" "uuid",
    "sort_order" integer DEFAULT 0,
    "tenant_id" "uuid" NOT NULL
);


ALTER TABLE "public"."acct_invoice_lines" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."acct_invoices" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "number" "text",
    "client_id" "uuid",
    "job_id" "uuid",
    "client_name" "text",
    "date" "date" NOT NULL,
    "due_date" "date",
    "status" "text" DEFAULT 'draft'::"text",
    "subtotal" numeric(12,2) DEFAULT 0,
    "tax_rate" numeric(6,4) DEFAULT 0,
    "tax_amount" numeric(12,2) DEFAULT 0,
    "total" numeric(12,2) DEFAULT 0,
    "amount_paid" numeric(12,2) DEFAULT 0,
    "balance_due" numeric(12,2) DEFAULT 0,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "tenant_id" "uuid" NOT NULL,
    CONSTRAINT "acct_invoices_status_check" CHECK (("status" = ANY (ARRAY['draft'::"text", 'sent'::"text", 'paid'::"text", 'overdue'::"text", 'void'::"text"])))
);


ALTER TABLE "public"."acct_invoices" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."acct_item_receipt_lines" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "receipt_id" "uuid" NOT NULL,
    "qb_line_id" "text",
    "line_type" "text",
    "job_id" "uuid",
    "qb_customer_full_name" "text",
    "account_id" "uuid",
    "qb_account_name" "text",
    "item_name" "text",
    "description" "text",
    "quantity" numeric(10,2),
    "unit_price" numeric(12,2),
    "amount" numeric(12,2) DEFAULT 0,
    "billable_status" "text",
    "class_name" "text",
    "sort_order" integer DEFAULT 0,
    "tenant_id" "uuid" NOT NULL,
    CONSTRAINT "acct_item_receipt_lines_line_type_check" CHECK (("line_type" = ANY (ARRAY['item'::"text", 'expense'::"text"])))
);


ALTER TABLE "public"."acct_item_receipt_lines" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."acct_item_receipts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "qb_txn_id" "text",
    "ref_number" "text",
    "vendor_id" "uuid",
    "vendor_name" "text",
    "date" "date" NOT NULL,
    "total" numeric(12,2) DEFAULT 0,
    "memo" "text",
    "source" "text" DEFAULT 'manual'::"text" NOT NULL,
    "qb_edit_sequence" "text",
    "qb_time_created" timestamp with time zone,
    "qb_time_modified" timestamp with time zone,
    "qb_synced_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "tenant_id" "uuid" NOT NULL,
    CONSTRAINT "acct_item_receipts_source_check" CHECK (("source" = ANY (ARRAY['manual'::"text", 'qb'::"text"])))
);


ALTER TABLE "public"."acct_item_receipts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."acct_journal_entries" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "date" "date" DEFAULT CURRENT_DATE NOT NULL,
    "ref" "text",
    "memo" "text",
    "status" "text" DEFAULT 'draft'::"text" NOT NULL,
    "posted_at" timestamp with time zone,
    "posted_by" "uuid",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    CONSTRAINT "acct_journal_entries_status_check" CHECK (("status" = ANY (ARRAY['draft'::"text", 'posted'::"text", 'void'::"text"])))
);


ALTER TABLE "public"."acct_journal_entries" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."acct_journal_entry_lines" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "entry_id" "uuid" NOT NULL,
    "account_id" "uuid" NOT NULL,
    "job_id" "uuid",
    "description" "text",
    "debit" numeric(14,2) DEFAULT 0 NOT NULL,
    "credit" numeric(14,2) DEFAULT 0 NOT NULL,
    "sort_order" integer,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    CONSTRAINT "acct_journal_entry_lines_check" CHECK ((NOT (("debit" > (0)::numeric) AND ("credit" > (0)::numeric)))),
    CONSTRAINT "acct_journal_entry_lines_credit_check" CHECK (("credit" >= (0)::numeric)),
    CONSTRAINT "acct_journal_entry_lines_debit_check" CHECK (("debit" >= (0)::numeric))
);


ALTER TABLE "public"."acct_journal_entry_lines" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."acct_journal_lines" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "entry_id" "uuid" NOT NULL,
    "account_id" "uuid" NOT NULL,
    "debit" numeric(12,2) DEFAULT 0,
    "credit" numeric(12,2) DEFAULT 0,
    "description" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "tenant_id" "uuid" NOT NULL
);


ALTER TABLE "public"."acct_journal_lines" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."acct_payments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "type" "text" NOT NULL,
    "date" "date" NOT NULL,
    "amount" numeric(12,2) NOT NULL,
    "payment_method" "text" DEFAULT 'check'::"text",
    "reference" "text",
    "bank_account_id" "uuid",
    "invoice_id" "uuid",
    "bill_id" "uuid",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "tenant_id" "uuid" NOT NULL,
    CONSTRAINT "acct_payments_type_check" CHECK (("type" = ANY (ARRAY['customer'::"text", 'vendor'::"text"])))
);


ALTER TABLE "public"."acct_payments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."actual_entries" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "module_id" "uuid" NOT NULL,
    "entry_date" "date" DEFAULT CURRENT_DATE,
    "actual_man_days" numeric(8,2) DEFAULT 0.00,
    "actual_material_cost" numeric(10,2) DEFAULT 0.00,
    "notes" "text" DEFAULT ''::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid",
    "tenant_id" "uuid" NOT NULL
);


ALTER TABLE "public"."actual_entries" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."agent_conversations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "title" "text",
    "model" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "tenant_id" "uuid" NOT NULL
);


ALTER TABLE "public"."agent_conversations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."agent_message_attachments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "message_id" "uuid" NOT NULL,
    "conversation_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "storage_path" "text" NOT NULL,
    "file_name" "text" NOT NULL,
    "mime_type" "text" NOT NULL,
    "size_bytes" bigint NOT NULL,
    "kind" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    CONSTRAINT "agent_message_attachments_kind_check" CHECK (("kind" = ANY (ARRAY['image'::"text", 'pdf'::"text", 'office'::"text", 'other'::"text"])))
);


ALTER TABLE "public"."agent_message_attachments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."agent_messages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "conversation_id" "uuid" NOT NULL,
    "role" "text" NOT NULL,
    "content" "text",
    "raw" "jsonb",
    "input_tokens" integer,
    "output_tokens" integer,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    CONSTRAINT "agent_messages_role_check" CHECK (("role" = ANY (ARRAY['user'::"text", 'assistant'::"text", 'tool'::"text"])))
);


ALTER TABLE "public"."agent_messages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."agent_tool_calls" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "conversation_id" "uuid" NOT NULL,
    "message_id" "uuid",
    "tool_name" "text" NOT NULL,
    "arguments" "jsonb",
    "result" "jsonb",
    "error" "text",
    "duration_ms" integer,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "tenant_id" "uuid" NOT NULL
);


ALTER TABLE "public"."agent_tool_calls" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."agent_user_preferences" (
    "user_id" "uuid" NOT NULL,
    "notes" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "tenant_id" "uuid" NOT NULL
);


ALTER TABLE "public"."agent_user_preferences" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."applicants" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "first_name" "text" NOT NULL,
    "last_name" "text" NOT NULL,
    "email" "text",
    "phone" "text",
    "address" "text",
    "city" "text",
    "state" "text",
    "zip" "text",
    "position_applied" "text",
    "status" "text" DEFAULT 'new'::"text",
    "resume_url" "text",
    "work_experience" "jsonb" DEFAULT '[]'::"jsonb",
    "skills" "text",
    "applicant_references" "jsonb" DEFAULT '[]'::"jsonb",
    "notes" "text",
    "applied_at" timestamp with time zone DEFAULT "now"(),
    "tenant_id" "uuid" NOT NULL
);


ALTER TABLE "public"."applicants" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."bak_fp_purge_labor" (
    "id" "uuid",
    "name" "text",
    "rate_per_day" numeric,
    "notes" "text",
    "created_by" "uuid",
    "created_at" timestamp with time zone,
    "rate" numeric(10,4),
    "unit" "text",
    "category" "text",
    "tenant_id" "uuid",
    "sub_category" "text",
    "label" "text"
);


ALTER TABLE "public"."bak_fp_purge_labor" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."bak_fp_purge_material" (
    "id" "uuid",
    "tenant_id" "uuid",
    "category_id" "uuid",
    "subcategory_id" "uuid",
    "description" "text",
    "unit" "text",
    "calc_meta" "jsonb",
    "is_default" boolean,
    "legacy_rate_id" "uuid",
    "created_at" timestamp with time zone,
    "collection" "text",
    "sku" "text",
    "photo_url" "text",
    "attributes" "jsonb",
    "show_in_selections" boolean,
    "sf_per_pallet" numeric,
    "price_per_lf_vert" numeric,
    "watts" numeric,
    "va" numeric,
    "labor_hrs_ea" numeric,
    "sub_price_ea" numeric,
    "notes" "text",
    "product_type_id" "uuid",
    "archived_at" timestamp with time zone
);


ALTER TABLE "public"."bak_fp_purge_material" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."bak_fp_purge_material_price" (
    "id" "uuid",
    "tenant_id" "uuid",
    "material_id" "uuid",
    "vendor_id" "uuid",
    "price" numeric,
    "effective_start" "date",
    "effective_end" "date",
    "source" "text",
    "created_at" timestamp with time zone
);


ALTER TABLE "public"."bak_fp_purge_material_price" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."basic_labor_rates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "rate_per_day" numeric DEFAULT 0,
    "notes" "text",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "rate" numeric(10,4) DEFAULT 0,
    "unit" "text" DEFAULT 'per day'::"text",
    "category" "text" DEFAULT 'General'::"text",
    "tenant_id" "uuid" NOT NULL,
    "sub_category" "text",
    "label" "text",
    "ref_key" "text"
);


ALTER TABLE "public"."basic_labor_rates" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."bids" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "client_name" "text" NOT NULL,
    "job_address" "text" DEFAULT ''::"text",
    "salesperson" "text" DEFAULT ''::"text",
    "bid_amount" numeric(10,2) DEFAULT 0.00,
    "date_submitted" "date" DEFAULT CURRENT_DATE,
    "status" "text" DEFAULT 'pending'::"text",
    "notes" "text" DEFAULT ''::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid",
    "estimate_id" "uuid",
    "projects" "text"[] DEFAULT '{}'::"text"[],
    "gross_profit" numeric DEFAULT 0,
    "gpmd" numeric DEFAULT 0,
    "record_type" "text" DEFAULT 'bid'::"text" NOT NULL,
    "linked_job_id" "uuid",
    "co_type" "text",
    "co_name" "text",
    "bid_doc_html" "text",
    "bid_doc_updated_at" timestamp with time zone,
    "bt_change_order_id" bigint,
    "custom_co_id" integer,
    "scope_of_work_html" "text",
    "signed_at" timestamp with time zone,
    "signed_by_name" "text",
    "signature_data_url" "text",
    "expires_at" timestamp with time zone,
    "viewed_by_owner_at" timestamp with time zone,
    "bt_attachment_count" integer,
    "bt_attachment_last_date" timestamp with time zone,
    "bt_attached_by_names" "text",
    "bt_created_by_name" "text",
    "co_decline_reason" "text",
    "co_method" "text",
    "co_line_items" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    CONSTRAINT "bids_status_check" CHECK ((("status" IS NULL) OR ("status" = ANY (ARRAY['unreleased'::"text", 'pending'::"text", 'presented'::"text", 'sold'::"text", 'lost'::"text"]))))
);


ALTER TABLE "public"."bids" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."billing_payments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "occurred_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "description" "text",
    "amount" numeric DEFAULT 0 NOT NULL,
    "method" "text",
    "card_brand" "text",
    "card_last4" "text",
    "status" "text" DEFAULT 'paid'::"text" NOT NULL,
    "helcim_transaction_id" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."billing_payments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."cad_drawings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "design_project_id" "uuid",
    "name" "text" NOT NULL,
    "discipline" "text" DEFAULT 'landscape'::"text",
    "data" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "thumbnail" "text",
    "status" "text" DEFAULT 'active'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid",
    CONSTRAINT "cad_drawings_discipline_check" CHECK (("discipline" = ANY (ARRAY['landscape'::"text", 'construction'::"text", 'detail'::"text", 'other'::"text"]))),
    CONSTRAINT "cad_drawings_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'archived'::"text"])))
);


ALTER TABLE "public"."cad_drawings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."cancellation_feedback" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "kind" "text" NOT NULL,
    "comment" "text",
    "reason" "text",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."cancellation_feedback" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."category" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "code" "text" NOT NULL,
    "name" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "default_vendor_id" "uuid"
);


ALTER TABLE "public"."category" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."change_orders" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "job_id" "uuid" NOT NULL,
    "description" "text" NOT NULL,
    "additional_contract_price" numeric(10,2) DEFAULT 0.00,
    "additional_man_days" numeric(8,2) DEFAULT 0.00,
    "additional_material_cost" numeric(10,2) DEFAULT 0.00,
    "date_added" "date" DEFAULT CURRENT_DATE,
    "notes" "text" DEFAULT ''::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid",
    "tenant_id" "uuid" NOT NULL
);


ALTER TABLE "public"."change_orders" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."client_payment_methods" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "client_id" "uuid" NOT NULL,
    "helcim_customer_code" "text",
    "helcim_card_token" "text",
    "method_type" "text" DEFAULT 'card'::"text" NOT NULL,
    "brand" "text",
    "last4" "text",
    "exp" "text",
    "is_default" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "tenant_id" "uuid" NOT NULL
);


ALTER TABLE "public"."client_payment_methods" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."client_portals" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "client_id" "uuid" NOT NULL,
    "auth_user_id" "uuid",
    "status" "text" DEFAULT 'inactive'::"text" NOT NULL,
    "invite_token" "text",
    "invite_token_expires_at" timestamp with time zone,
    "invite_sent_at" timestamp with time zone,
    "invite_email" "text",
    "account_name" "text",
    "activated_at" timestamp with time zone,
    "perm_invoices" boolean DEFAULT false NOT NULL,
    "perm_pay_ach" boolean DEFAULT false NOT NULL,
    "perm_pay_card" boolean DEFAULT false NOT NULL,
    "perm_daily_logs" boolean DEFAULT true NOT NULL,
    "perm_schedule" boolean DEFAULT true NOT NULL,
    "perm_change_orders" boolean DEFAULT true NOT NULL,
    "perm_files" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "helcim_customer_code" "text",
    "tenant_id" "uuid" NOT NULL,
    CONSTRAINT "client_portals_status_check" CHECK (("status" = ANY (ARRAY['inactive'::"text", 'invited'::"text", 'active'::"text", 'disabled'::"text"])))
);


ALTER TABLE "public"."client_portals" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."clients" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" "text" NOT NULL,
    "email" "text" DEFAULT ''::"text",
    "phone" "text" DEFAULT ''::"text",
    "address" "text" DEFAULT ''::"text",
    "notes" "text" DEFAULT ''::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid",
    "street" "text" DEFAULT ''::"text",
    "city" "text" DEFAULT ''::"text",
    "state" "text" DEFAULT ''::"text",
    "zip" "text" DEFAULT ''::"text",
    "first_name" "text",
    "last_name" "text",
    "company_name" "text",
    "company_position" "text",
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "client_type" "text" DEFAULT 'individual'::"text",
    "spouse_first_name" "text",
    "spouse_last_name" "text",
    "other_email" "text",
    "other_address" "text",
    "website" "text",
    "company_contacts" "jsonb" DEFAULT '[]'::"jsonb",
    "cell" "text",
    "additional_emails" "text"[],
    "additional_phones" "text"[],
    "consultant_employee_id" "uuid",
    "tenant_id" "uuid" NOT NULL,
    CONSTRAINT "clients_client_type_check" CHECK (("client_type" = ANY (ARRAY['individual'::"text", 'company'::"text"]))),
    CONSTRAINT "clients_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'inactive'::"text"])))
);


ALTER TABLE "public"."clients" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."code_changes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "commit_hash" "text" NOT NULL,
    "committed_at" timestamp with time zone NOT NULL,
    "author" "text",
    "subject" "text" NOT NULL,
    "body" "text",
    "files_changed" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."code_changes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."collection_financial" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "week_id" "uuid" NOT NULL,
    "section" "text" NOT NULL,
    "label" "text",
    "amount" numeric(12,2) DEFAULT 0,
    "notes" "text",
    "sort_order" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "is_formula" boolean DEFAULT false,
    "formula_type" "text",
    "formula_pct" numeric,
    "subsection" "text",
    "source_payable_id" "uuid",
    "is_paid" boolean DEFAULT false NOT NULL,
    "tenant_id" "uuid" NOT NULL
);


ALTER TABLE "public"."collection_financial" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."collection_payables" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "week_id" "uuid" NOT NULL,
    "category" "text" NOT NULL,
    "payee" "text",
    "amount_current" numeric(12,2) DEFAULT 0,
    "amount_future" numeric(12,2) DEFAULT 0,
    "due_date" "text",
    "rate" "text",
    "notes" "text",
    "sort_order" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "starting_balance" numeric(12,2) DEFAULT 0 NOT NULL,
    "new_charges" numeric(12,2) DEFAULT 0 NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    CONSTRAINT "collection_payables_category_check" CHECK (("category" = ANY (ARRAY['prelim'::"text", 'credit_card'::"text", 'credit_account'::"text", 'non_credit'::"text"])))
);


ALTER TABLE "public"."collection_payables" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."collection_rows" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "week_id" "uuid" NOT NULL,
    "section" "text" NOT NULL,
    "manager" "text",
    "client_name" "text" NOT NULL,
    "prev_delivered" numeric(12,2) DEFAULT 0,
    "starting_balance" numeric(12,2) DEFAULT 0,
    "mon_inv" numeric(12,2) DEFAULT 0,
    "mon_dep" numeric(12,2) DEFAULT 0,
    "tue_inv" numeric(12,2) DEFAULT 0,
    "tue_dep" numeric(12,2) DEFAULT 0,
    "wed_inv" numeric(12,2) DEFAULT 0,
    "wed_dep" numeric(12,2) DEFAULT 0,
    "thu_inv" numeric(12,2) DEFAULT 0,
    "thu_dep" numeric(12,2) DEFAULT 0,
    "fri_inv" numeric(12,2) DEFAULT 0,
    "fri_dep" numeric(12,2) DEFAULT 0,
    "notes" "text",
    "sort_order" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "tenant_id" "uuid" NOT NULL,
    CONSTRAINT "collection_rows_section_check" CHECK (("section" = ANY (ARRAY['current'::"text", 'punchlist'::"text", 'long_term'::"text"])))
);


ALTER TABLE "public"."collection_rows" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."collection_weeks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "week_ending" "date" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "tenant_id" "uuid" NOT NULL,
    "auto_allocations" "jsonb"
);


ALTER TABLE "public"."collection_weeks" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."collections" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "job_id" "uuid",
    "invoice_number" "text" DEFAULT ''::"text",
    "amount_billed" numeric(10,2) DEFAULT 0.00,
    "amount_received" numeric(10,2) DEFAULT 0.00,
    "due_date" "date",
    "date_received" "date",
    "payment_method" "text" DEFAULT 'Check'::"text",
    "status" "text" DEFAULT 'outstanding'::"text",
    "notes" "text" DEFAULT ''::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid",
    "tenant_id" "uuid" NOT NULL,
    CONSTRAINT "collections_status_check" CHECK (("status" = ANY (ARRAY['outstanding'::"text", 'partial'::"text", 'paid'::"text", 'overdue'::"text"])))
);


ALTER TABLE "public"."collections" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."companies" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_name" "text" NOT NULL,
    "company_street" "text",
    "company_city" "text",
    "company_state" "text",
    "company_zip" "text",
    "phone" "text",
    "email" "text",
    "website" "text",
    "stage" "text" DEFAULT 'new_lead'::"text",
    "contact_type" "text",
    "source" "text",
    "campaign" "text",
    "how_did_you_hear" "text",
    "ghl_assigned_to" "text",
    "notes" "text",
    "project_description" "text",
    "call_center_notes" "text",
    "tags" "text"[],
    "dnd" boolean DEFAULT false,
    "company_contacts" "jsonb" DEFAULT '[]'::"jsonb",
    "ghl_contact_id" "text",
    "ghl_synced_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "tenant_id" "uuid" NOT NULL,
    CONSTRAINT "companies_contact_type_check" CHECK (("contact_type" = ANY (ARRAY['Residential'::"text", 'Commercial'::"text", 'Public Works'::"text"])))
);


ALTER TABLE "public"."companies" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."company_communications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "type" "text",
    "direction" "text",
    "content" "text",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "tenant_id" "uuid" NOT NULL
);


ALTER TABLE "public"."company_communications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."company_settings" (
    "id" integer DEFAULT 1 NOT NULL,
    "week_ending_day" integer DEFAULT 5 NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "sales_tax_rate" numeric(6,5) DEFAULT 0.095,
    "labor_rate_per_hour" numeric(8,2) DEFAULT 35.00,
    "sub_markup_rate" numeric(5,4) DEFAULT 0.35,
    "company_week_ending_day" integer DEFAULT 5,
    "logo_url" "text",
    "sub_gp_markup_rate" numeric DEFAULT 0.20,
    "email_config" "jsonb",
    "integrations_config" "jsonb",
    "sms_config" "jsonb",
    "show_stat_archive_folder" boolean DEFAULT true,
    "yard_check_default_total" integer DEFAULT 4 NOT NULL,
    "start_locations" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "default_start_location_id" "text",
    "supervisor_position_ids" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "finance_oac_rate" numeric DEFAULT 0.10,
    "estimate_gpmd_default" numeric DEFAULT 425,
    "default_schedule_color" "text",
    "walk_access_pace_lf_per_min" numeric DEFAULT 60,
    "invoice_comm_position_id" integer,
    "payroll_week_start" integer DEFAULT 0,
    "labor_rate_per_man_day" numeric(10,2) DEFAULT 400.00,
    "company_name" "text",
    "license_number" "text",
    "invoice_email_subject" "text",
    "invoice_email_body" "text",
    "weather_location" "text",
    "main_office_address" "text",
    "main_office_lat" double precision,
    "main_office_lon" double precision,
    "truck_yard_address" "text",
    "truck_yard_lat" double precision,
    "truck_yard_lon" double precision,
    "new_employee_file_template" "jsonb" DEFAULT '["Full Hat", "Quick Hat", "Application", "Review Forms"]'::"jsonb",
    "drive_label" "text",
    "tenant_id" "uuid" NOT NULL,
    "avg_hourly_crew_rate" numeric,
    "burden_fica_rate" numeric DEFAULT 6.2 NOT NULL,
    "burden_medicare_rate" numeric DEFAULT 1.45 NOT NULL,
    "burden_futa_rate" numeric DEFAULT 0.6 NOT NULL,
    "burden_suta_rate" numeric DEFAULT 0 NOT NULL,
    "burden_workcomp_rate" numeric DEFAULT 0 NOT NULL,
    "burden_sdi_rate" numeric DEFAULT 0 NOT NULL,
    "burden_gl_rate" numeric DEFAULT 0 NOT NULL,
    "labor_burden_pct" numeric DEFAULT 0.29 NOT NULL,
    "avg_pto_days" numeric DEFAULT 10 NOT NULL,
    "auto_deduct_enabled" boolean DEFAULT false NOT NULL,
    "auto_deduct_minutes" numeric DEFAULT 30 NOT NULL,
    "auto_deduct_per_hours" numeric DEFAULT 6 NOT NULL,
    "auto_allocations" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "commission_rate" numeric,
    "turf_base_defaults" "jsonb",
    CONSTRAINT "company_settings_company_week_ending_day_check" CHECK ((("company_week_ending_day" >= 0) AND ("company_week_ending_day" <= 6))),
    CONSTRAINT "company_settings_payroll_week_start_check" CHECK ((("payroll_week_start" >= 0) AND ("payroll_week_start" <= 6))),
    CONSTRAINT "company_settings_week_ending_day_check" CHECK ((("week_ending_day" >= 0) AND ("week_ending_day" <= 6)))
);


ALTER TABLE "public"."company_settings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."contact_communications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "contact_id" "uuid" NOT NULL,
    "type" "text" DEFAULT 'note'::"text" NOT NULL,
    "content" "text" DEFAULT ''::"text" NOT NULL,
    "direction" "text",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "ghl_note_id" "text",
    "ghl_synced_at" timestamp with time zone,
    "tenant_id" "uuid" NOT NULL,
    CONSTRAINT "contact_communications_direction_check" CHECK (("direction" = ANY (ARRAY['inbound'::"text", 'outbound'::"text"]))),
    CONSTRAINT "contact_communications_type_check" CHECK (("type" = ANY (ARRAY['note'::"text", 'call'::"text", 'email'::"text", 'text'::"text", 'stage_change'::"text", 'system'::"text"])))
);


ALTER TABLE "public"."contact_communications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."contacts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "first_name" "text" DEFAULT ''::"text" NOT NULL,
    "last_name" "text" DEFAULT ''::"text" NOT NULL,
    "company_name" "text",
    "phone" "text",
    "email" "text",
    "street_address" "text",
    "city" "text",
    "state" "text",
    "zip" "text",
    "stage" "text" DEFAULT 'new_lead'::"text" NOT NULL,
    "source" "text",
    "assigned_to" "uuid",
    "client_id" "uuid",
    "notes" "text",
    "tags" "text"[] DEFAULT '{}'::"text"[],
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "cell" "text",
    "contact_type" "text",
    "dnd_phone" boolean DEFAULT false NOT NULL,
    "dnd_email" boolean DEFAULT false NOT NULL,
    "dnd_sms" boolean DEFAULT false NOT NULL,
    "date_of_birth" "date",
    "project_description" "text",
    "secondary_first_name" "text",
    "secondary_last_name" "text",
    "company_street" "text",
    "company_city" "text",
    "company_state" "text",
    "company_zip" "text",
    "ghl_contact_id" "text",
    "ghl_synced_at" timestamp with time zone,
    "website" "text",
    "timezone" "text",
    "country" "text",
    "dnd" boolean DEFAULT false NOT NULL,
    "ghl_assigned_to" "text",
    "how_did_you_hear" "text",
    "ghl_custom_fields" "jsonb",
    "additional_emails" "text"[],
    "additional_phones" "text"[],
    "last_activity_at" timestamp with time zone,
    "call_center_notes" "text",
    "consultation_type" "text",
    "interest_1" "text",
    "interest_2" "text",
    "interest_3" "text",
    "campaign" "text",
    "tenant_id" "uuid" NOT NULL,
    CONSTRAINT "contacts_consultation_type_check" CHECK (("consultation_type" = ANY (ARRAY['Design'::"text", 'Estimate'::"text"]))),
    CONSTRAINT "contacts_stage_check" CHECK (("stage" = ANY (ARRAY['new_lead'::"text", 'warm_lead'::"text", 'consultation'::"text", 'quoted'::"text", 'won'::"text", 'lost'::"text", 'nurture'::"text", 'bt_import'::"text", 'ghl_import'::"text"])))
);


ALTER TABLE "public"."contacts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."crew_types" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "color" "text" DEFAULT '#15803d'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "tenant_id" "uuid" NOT NULL
);


ALTER TABLE "public"."crew_types" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."crews" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "label" "text" NOT NULL,
    "crew_chief_id" "uuid",
    "journeyman_id" "uuid",
    "laborer_1_id" "uuid",
    "laborer_2_id" "uuid",
    "laborer_3_id" "uuid",
    "skills" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "notes" "text" DEFAULT ''::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "color" "text",
    "tenant_id" "uuid" NOT NULL
);


ALTER TABLE "public"."crews" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."daily_log_photos" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "log_id" "uuid" NOT NULL,
    "storage_path" "text" NOT NULL,
    "file_name" "text",
    "mime_type" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "tenant_id" "uuid" NOT NULL
);


ALTER TABLE "public"."daily_log_photos" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."daily_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "job_id" "uuid",
    "date" "date" DEFAULT CURRENT_DATE NOT NULL,
    "title" "text",
    "notes" "text",
    "created_by" "uuid",
    "permissions" "text"[] DEFAULT ARRAY['internal'::"text"] NOT NULL,
    "weather_conditions" boolean DEFAULT false,
    "weather_notes" "text",
    "source" "text" DEFAULT 'web'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "bt_daily_log_id" bigint,
    "bt_author_name" "text",
    "tenant_id" "uuid" NOT NULL
);


ALTER TABLE "public"."daily_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."dashboard_appreciations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "entry_date" "date" NOT NULL,
    "lines" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."dashboard_appreciations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."dashboard_preferences" (
    "user_id" "uuid" NOT NULL,
    "layout" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "stat_ids" bigint[] DEFAULT '{}'::bigint[] NOT NULL,
    "weather_location" "text",
    "background" "text",
    "module_colors" "jsonb",
    "module_backgrounds" "jsonb",
    "tenant_id" "uuid" NOT NULL
);


ALTER TABLE "public"."dashboard_preferences" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."design_annotations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "file_id" "uuid" NOT NULL,
    "page_number" integer DEFAULT 1 NOT NULL,
    "type" "text" NOT NULL,
    "points" "jsonb" NOT NULL,
    "color" "text" DEFAULT '#3A5038'::"text",
    "label" "text",
    "known_distance" numeric,
    "unit" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid",
    "symbol" "text",
    "item_id" "uuid",
    "tenant_id" "uuid" NOT NULL,
    CONSTRAINT "design_annotations_type_check" CHECK (("type" = ANY (ARRAY['scale'::"text", 'linear'::"text", 'area'::"text", 'count'::"text"])))
);


ALTER TABLE "public"."design_annotations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."design_files" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "project_id" "uuid" NOT NULL,
    "file_name" "text" NOT NULL,
    "storage_path" "text" NOT NULL,
    "file_type" "text",
    "size_bytes" bigint,
    "num_pages" integer,
    "display_order" integer DEFAULT 0,
    "uploaded_at" timestamp with time zone DEFAULT "now"(),
    "uploaded_by" "uuid",
    "tenant_id" "uuid" NOT NULL
);


ALTER TABLE "public"."design_files" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."design_projects" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "client_id" "uuid",
    "notes" "text",
    "status" "text" DEFAULT 'active'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid",
    "tenant_id" "uuid" NOT NULL,
    CONSTRAINT "design_projects_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'archived'::"text"])))
);


ALTER TABLE "public"."design_projects" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."design_takeoff_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "file_id" "uuid" NOT NULL,
    "page_number" integer DEFAULT 1 NOT NULL,
    "type" "text" NOT NULL,
    "name" "text" NOT NULL,
    "color" "text" DEFAULT '#3A5038'::"text",
    "symbol" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid",
    "tenant_id" "uuid" NOT NULL,
    CONSTRAINT "design_takeoff_items_type_check" CHECK (("type" = ANY (ARRAY['linear'::"text", 'area'::"text", 'count'::"text"])))
);


ALTER TABLE "public"."design_takeoff_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."edoc_documents" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "template_id" "uuid",
    "client_id" "uuid",
    "estimate_id" "uuid",
    "name" "text" NOT NULL,
    "status" "text" DEFAULT 'draft'::"text" NOT NULL,
    "pdf_path" "text",
    "page_count" integer DEFAULT 1,
    "fields" "jsonb" DEFAULT '[]'::"jsonb",
    "signer_name" "text",
    "signer_email" "text",
    "access_token" "text" DEFAULT "replace"(("gen_random_uuid"())::"text", '-'::"text", ''::"text"),
    "sent_at" timestamp with time zone,
    "viewed_at" timestamp with time zone,
    "completed_at" timestamp with time zone,
    "signed_pdf_path" "text",
    "signature_data_url" "text",
    "decline_reason" "text",
    "amount" numeric,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "deposit_required" boolean DEFAULT false,
    "deposit_amount" numeric,
    "deposit_paid_amount" numeric,
    "deposit_paid_at" timestamp with time zone,
    "deposit_txn_id" "text",
    "tenant_id" "uuid" NOT NULL,
    CONSTRAINT "edoc_documents_status_check" CHECK (("status" = ANY (ARRAY['draft'::"text", 'sent'::"text", 'viewed'::"text", 'completed'::"text", 'paid'::"text", 'declined'::"text", 'voided'::"text"])))
);


ALTER TABLE "public"."edoc_documents" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."edoc_templates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "pdf_path" "text",
    "page_count" integer DEFAULT 1,
    "fields" "jsonb" DEFAULT '[]'::"jsonb",
    "is_active" boolean DEFAULT true,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "tenant_id" "uuid" NOT NULL
);


ALTER TABLE "public"."edoc_templates" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."edoc_workflows" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" DEFAULT 'Untitled Workflow'::"text" NOT NULL,
    "notes" "text",
    "module_integrations" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "steps" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "graph" "jsonb",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "type" "text",
    "tenant_id" "uuid" NOT NULL
);


ALTER TABLE "public"."edoc_workflows" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."employee_certifications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "employee_id" "uuid" NOT NULL,
    "cert_name" "text" NOT NULL,
    "cert_number" "text",
    "issued_date" "date",
    "expiry_date" "date",
    "file_url" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "tenant_id" "uuid" NOT NULL
);


ALTER TABLE "public"."employee_certifications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."employee_documents" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "employee_id" "uuid" NOT NULL,
    "doc_name" "text" NOT NULL,
    "doc_url" "text" NOT NULL,
    "category" "text" DEFAULT 'records'::"text",
    "file_type" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "tenant_id" "uuid" NOT NULL
);


ALTER TABLE "public"."employee_documents" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."employee_files" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "employee_id" "uuid" NOT NULL,
    "parent_id" "uuid",
    "is_folder" boolean DEFAULT false NOT NULL,
    "name" "text" NOT NULL,
    "storage_path" "text",
    "file_type" "text",
    "file_size" bigint,
    "uploaded_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "tenant_id" "uuid" NOT NULL
);


ALTER TABLE "public"."employee_files" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."employee_group_members" (
    "group_id" "uuid" NOT NULL,
    "employee_id" "uuid" NOT NULL,
    "tenant_id" "uuid" NOT NULL
);


ALTER TABLE "public"."employee_group_members" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."employee_groups" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "color" "text" DEFAULT '#16a34a'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "tenant_id" "uuid" NOT NULL
);


ALTER TABLE "public"."employee_groups" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."employee_positions" (
    "employee_id" "uuid" NOT NULL,
    "position_id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "tenant_id" "uuid" NOT NULL
);


ALTER TABLE "public"."employee_positions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."employees" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "first_name" "text" NOT NULL,
    "last_name" "text" NOT NULL,
    "email" "text",
    "phone" "text",
    "address" "text",
    "city" "text",
    "state" "text",
    "zip" "text",
    "start_date" "date",
    "job_title" "text",
    "department" "text",
    "pay_rate" numeric(10,2),
    "pay_type" "text" DEFAULT 'hourly'::"text",
    "status" "text" DEFAULT 'active'::"text",
    "emergency_contact_name" "text",
    "emergency_contact_phone" "text",
    "emergency_contact_relation" "text",
    "avatar_url" "text",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "nickname" "text",
    "user_id" "uuid",
    "preferred_language" "text" DEFAULT 'en'::"text" NOT NULL,
    "cell_phone" "text",
    "position_id" bigint,
    "tenant_id" "uuid" NOT NULL,
    "is_consultant" boolean DEFAULT false NOT NULL,
    "pto_days" numeric DEFAULT 0 NOT NULL,
    "health_insurance_monthly" numeric,
    CONSTRAINT "employees_preferred_language_check" CHECK (("preferred_language" = ANY (ARRAY['en'::"text", 'es'::"text"])))
);


ALTER TABLE "public"."employees" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."estimate_modules" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "project_id" "uuid" NOT NULL,
    "module_type" "text" NOT NULL,
    "man_days" numeric DEFAULT 0,
    "material_cost" numeric DEFAULT 0,
    "data" "jsonb" DEFAULT '{}'::"jsonb",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "labor_cost" numeric(12,2) DEFAULT 0,
    "labor_burden" numeric(12,2) DEFAULT 0,
    "gross_profit" numeric(12,2) DEFAULT 0,
    "sub_cost" numeric(12,2) DEFAULT 0,
    "total_price" numeric(12,2) DEFAULT 0,
    "module_name" "text",
    "tenant_id" "uuid" NOT NULL
);


ALTER TABLE "public"."estimate_modules" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."estimate_modules_bak_house" (
    "id" "uuid",
    "project_id" "uuid",
    "module_type" "text",
    "man_days" numeric,
    "material_cost" numeric,
    "data" "jsonb",
    "notes" "text",
    "created_at" timestamp with time zone,
    "labor_cost" numeric(12,2),
    "labor_burden" numeric(12,2),
    "gross_profit" numeric(12,2),
    "sub_cost" numeric(12,2),
    "total_price" numeric(12,2),
    "module_name" "text",
    "tenant_id" "uuid"
);


ALTER TABLE "public"."estimate_modules_bak_house" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."estimate_projects" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "estimate_id" "uuid" NOT NULL,
    "project_name" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "gpmd_override" numeric,
    "sub_gp_markup_rate" numeric DEFAULT 0.20,
    "sort_order" integer,
    "tenant_id" "uuid" NOT NULL
);


ALTER TABLE "public"."estimate_projects" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."estimates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "estimate_name" "text" NOT NULL,
    "type" "text",
    "client_name" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid",
    "client_id" "uuid",
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "adjusted_price" numeric,
    "version" integer DEFAULT 1,
    "parent_estimate_id" "uuid",
    "tenant_id" "uuid" NOT NULL,
    CONSTRAINT "estimates_type_check" CHECK (("type" = ANY (ARRAY['Residential'::"text", 'Commercial'::"text", 'Public Works'::"text"])))
);


ALTER TABLE "public"."estimates" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ext_formulas_condition_access" (
    "tenant_id" "uuid",
    "condition_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."ext_formulas_condition_access" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ext_formulas_condition_steps" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "condition_id" "uuid" NOT NULL,
    "sub_condition_id" "uuid",
    "seq" integer NOT NULL,
    "text" "text" NOT NULL
);


ALTER TABLE "public"."ext_formulas_condition_steps" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ext_formulas_conditions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid",
    "name" "text" NOT NULL,
    "slug" "text" NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "is_default" boolean DEFAULT false NOT NULL,
    "visible" boolean DEFAULT true NOT NULL,
    "read_only" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "restricted" boolean DEFAULT false NOT NULL
);


ALTER TABLE "public"."ext_formulas_conditions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ext_formulas_formulas" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "created_by" "uuid",
    "statistic_id" bigint,
    "condition_id" "uuid",
    "sub_condition_id" "uuid",
    "window_mode" "text" DEFAULT 'static'::"text" NOT NULL,
    "stat_view_type" "text",
    "evaluated_on" "date" DEFAULT CURRENT_DATE NOT NULL,
    "end_date" "date",
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "type" "text" DEFAULT 'stat'::"text" NOT NULL,
    "title" "text",
    "period" "text",
    "period_start" "date",
    "period_end" "date",
    "period_unit" "text"
);


ALTER TABLE "public"."ext_formulas_formulas" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ext_formulas_steps" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "formula_id" "uuid" NOT NULL,
    "condition_step_id" "uuid",
    "seq" integer NOT NULL,
    "action_text" "text",
    "due_date" "date",
    "assign" boolean DEFAULT false NOT NULL,
    "action_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "action_seq" integer DEFAULT 1 NOT NULL
);


ALTER TABLE "public"."ext_formulas_steps" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ext_formulas_sub_conditions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "condition_id" "uuid" NOT NULL,
    "slug" "text" NOT NULL,
    "name" "text" NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL
);


ALTER TABLE "public"."ext_formulas_sub_conditions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ext_plans" (
    "extension_id" "text" NOT NULL,
    "name" "text" NOT NULL,
    "price_monthly" numeric DEFAULT 0 NOT NULL,
    "helcim_plan_id" "text",
    "active" boolean DEFAULT true NOT NULL
);


ALTER TABLE "public"."ext_plans" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."feature_request_attachments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "feature_request_id" "uuid" NOT NULL,
    "source_message_attachment_id" "uuid",
    "user_id" "uuid" NOT NULL,
    "storage_path" "text" NOT NULL,
    "file_name" "text" NOT NULL,
    "mime_type" "text" NOT NULL,
    "size_bytes" bigint NOT NULL,
    "kind" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    CONSTRAINT "feature_request_attachments_kind_check" CHECK (("kind" = ANY (ARRAY['image'::"text", 'pdf'::"text", 'office'::"text", 'other'::"text"])))
);


ALTER TABLE "public"."feature_request_attachments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."feature_requests" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "conversation_id" "uuid",
    "title" "text" NOT NULL,
    "body" "text" NOT NULL,
    "category" "text" DEFAULT 'feature'::"text" NOT NULL,
    "source" "text" DEFAULT 'sam'::"text" NOT NULL,
    "status" "text" DEFAULT 'new'::"text" NOT NULL,
    "priority" "text" DEFAULT 'medium'::"text" NOT NULL,
    "admin_notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "tenant_id" "uuid" NOT NULL,
    CONSTRAINT "feature_requests_category_check" CHECK (("category" = ANY (ARRAY['feature'::"text", 'bug'::"text", 'enhancement'::"text", 'other'::"text"]))),
    CONSTRAINT "feature_requests_priority_check" CHECK (("priority" = ANY (ARRAY['low'::"text", 'medium'::"text", 'high'::"text"]))),
    CONSTRAINT "feature_requests_source_check" CHECK (("source" = ANY (ARRAY['sam'::"text", 'manual'::"text"]))),
    CONSTRAINT "feature_requests_status_check" CHECK (("status" = ANY (ARRAY['new'::"text", 'triaged'::"text", 'in_progress'::"text", 'done'::"text", 'declined'::"text"])))
);


ALTER TABLE "public"."feature_requests" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."funnel_cards" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "funnel_id" "uuid" NOT NULL,
    "stage_id" "uuid" NOT NULL,
    "client_id" "uuid" NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "tenant_id" "uuid" NOT NULL
);


ALTER TABLE "public"."funnel_cards" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."funnel_stages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "funnel_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "color" "text",
    "sort_order" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "tenant_id" "uuid" NOT NULL
);


ALTER TABLE "public"."funnel_stages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."funnels" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "tenant_id" "uuid" NOT NULL
);


ALTER TABLE "public"."funnels" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."general_category" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "code" "text" NOT NULL,
    "name" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."general_category" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."general_subcategory" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "category_id" "uuid" NOT NULL,
    "code" "text" NOT NULL,
    "name" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."general_subcategory" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ghl_connections" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "singleton" boolean DEFAULT true NOT NULL,
    "access_token" "text" NOT NULL,
    "refresh_token" "text",
    "token_expires_at" timestamp with time zone,
    "location_id" "text" NOT NULL,
    "company_id" "text",
    "scopes" "text"[],
    "contacts_enabled" boolean DEFAULT true NOT NULL,
    "opportunities_enabled" boolean DEFAULT true NOT NULL,
    "appointments_enabled" boolean DEFAULT true NOT NULL,
    "notes_enabled" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_by" "uuid",
    "tenant_id" "uuid" NOT NULL
);


ALTER TABLE "public"."ghl_connections" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ghl_opportunities" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "ghl_opportunity_id" "text" NOT NULL,
    "ghl_contact_id" "text",
    "contact_id" "uuid",
    "pipeline_id" "text",
    "pipeline_name" "text",
    "stage_id" "text",
    "stage_name" "text",
    "status" "text",
    "name" "text",
    "monetary_value" numeric(14,2),
    "assigned_to" "text",
    "source" "text",
    "ghl_created_at" timestamp with time zone,
    "ghl_updated_at" timestamp with time zone,
    "ghl_synced_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "tenant_id" "uuid" NOT NULL
);


ALTER TABLE "public"."ghl_opportunities" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ghl_sync_log" (
    "id" bigint NOT NULL,
    "ran_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "object_type" "text" NOT NULL,
    "direction" "text" NOT NULL,
    "status" "text" NOT NULL,
    "records_synced" integer DEFAULT 0 NOT NULL,
    "message" "text",
    "error_payload" "jsonb",
    "tenant_id" "uuid" NOT NULL,
    CONSTRAINT "ghl_sync_log_direction_check" CHECK (("direction" = ANY (ARRAY['inbound'::"text", 'outbound'::"text"]))),
    CONSTRAINT "ghl_sync_log_status_check" CHECK (("status" = ANY (ARRAY['ok'::"text", 'error'::"text"])))
);


ALTER TABLE "public"."ghl_sync_log" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."ghl_sync_log_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."ghl_sync_log_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."ghl_sync_log_id_seq" OWNED BY "public"."ghl_sync_log"."id";



CREATE TABLE IF NOT EXISTS "public"."ghl_sync_state" (
    "object_type" "text" NOT NULL,
    "inbound_synced_at" timestamp with time zone,
    "outbound_synced_at" timestamp with time zone,
    "last_run_at" timestamp with time zone,
    "last_run_status" "text",
    "last_run_message" "text",
    "inbound_count_total" bigint DEFAULT 0 NOT NULL,
    "outbound_count_total" bigint DEFAULT 0 NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "tenant_id" "uuid" NOT NULL
);


ALTER TABLE "public"."ghl_sync_state" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."help_doc_categories" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."help_doc_categories" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."help_docs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "category_id" "uuid",
    "title" "text" NOT NULL,
    "description" "text",
    "storage_path" "text" NOT NULL,
    "file_name" "text" NOT NULL,
    "mime_type" "text" NOT NULL,
    "size_bytes" bigint NOT NULL,
    "uploaded_by" "uuid",
    "sort_order" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."help_docs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."help_video_categories" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."help_video_categories" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."help_videos" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "category_id" "uuid",
    "title" "text" NOT NULL,
    "description" "text",
    "storage_path" "text" NOT NULL,
    "file_name" "text" NOT NULL,
    "mime_type" "text" NOT NULL,
    "size_bytes" bigint NOT NULL,
    "duration_sec" integer,
    "uploaded_by" "uuid",
    "sort_order" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."help_videos" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."hr_review_forms" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "fields" "jsonb" DEFAULT '[]'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "tenant_id" "uuid" NOT NULL
);


ALTER TABLE "public"."hr_review_forms" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."hr_reviews" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "employee_id" "uuid" NOT NULL,
    "review_form_id" "uuid",
    "reviewer_name" "text",
    "review_date" "date" DEFAULT CURRENT_DATE,
    "responses" "jsonb" DEFAULT '{}'::"jsonb",
    "overall_rating" numeric(2,1),
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "tenant_id" "uuid" NOT NULL
);


ALTER TABLE "public"."hr_reviews" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."job_expenses" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "job_id" "uuid",
    "vendor_id" "uuid",
    "invoice_id" "uuid",
    "description" "text",
    "category" "text",
    "qty" numeric,
    "unit" "text",
    "unit_cost" numeric,
    "amount" numeric DEFAULT 0 NOT NULL,
    "expense_date" "date",
    "source" "text" DEFAULT 'invoice'::"text" NOT NULL,
    "qb_sync_status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "qb_ref" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_by" "uuid"
);


ALTER TABLE "public"."job_expenses" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."job_files" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "job_id" "uuid" NOT NULL,
    "file_name" "text" NOT NULL,
    "file_type" "text",
    "file_category" "text" DEFAULT 'document'::"text",
    "storage_path" "text" NOT NULL,
    "file_size" bigint,
    "source" "text" DEFAULT 'manual'::"text",
    "buildertrend_job" "text",
    "notes" "text",
    "uploaded_by" "uuid",
    "uploaded_at" timestamp with time zone DEFAULT "now"(),
    "created_at" timestamp with time zone DEFAULT "now"(),
    "folder_id" "uuid",
    "bid_id" "uuid",
    "invoice_id" "uuid",
    "bt_file_id" "text",
    "folder_path" "text",
    "mime_type" "text",
    "tenant_id" "uuid" NOT NULL
);


ALTER TABLE "public"."job_files" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."job_folders" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "job_id" "uuid" NOT NULL,
    "folder_name" "text" NOT NULL,
    "template_id" "uuid",
    "sort_order" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "folder_type" "text" DEFAULT 'document'::"text" NOT NULL,
    "parent_folder_id" "uuid",
    "source" "text" DEFAULT 'manual'::"text",
    "tenant_id" "uuid" NOT NULL
);


ALTER TABLE "public"."job_folders" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."job_invoice_lines" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "invoice_id" "uuid" NOT NULL,
    "module_id" "uuid",
    "project_name" "text",
    "module_name" "text",
    "module_amount" numeric(14,2) DEFAULT 0 NOT NULL,
    "prior_pct" numeric(7,4) DEFAULT 0 NOT NULL,
    "this_pct" numeric(7,4) DEFAULT 0 NOT NULL,
    "line_amount" numeric(14,2) DEFAULT 0 NOT NULL,
    "description" "text",
    "sort_order" integer DEFAULT 0 NOT NULL,
    "tenant_id" "uuid" NOT NULL
);


ALTER TABLE "public"."job_invoice_lines" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."job_invoice_payments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "invoice_id" "uuid",
    "job_id" "uuid",
    "bt_payment_id" bigint,
    "amount" numeric(14,2) DEFAULT 0 NOT NULL,
    "payment_date" "date",
    "method" "text",
    "status" "text",
    "paid_by" "text",
    "notes" "text",
    "source" "text" DEFAULT 'portal'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "helcim_transaction_id" "text",
    "tenant_id" "uuid" NOT NULL
);


ALTER TABLE "public"."job_invoice_payments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."job_invoices" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "job_id" "uuid" NOT NULL,
    "invoice_number" "text",
    "title" "text",
    "invoice_date" "date" DEFAULT CURRENT_DATE NOT NULL,
    "due_date" "date",
    "amount" numeric(14,2) DEFAULT 0 NOT NULL,
    "status" "text" DEFAULT 'draft'::"text" NOT NULL,
    "is_manual" boolean DEFAULT false NOT NULL,
    "notes" "text",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "bt_invoice_id" bigint,
    "amount_paid" numeric(14,2) DEFAULT 0 NOT NULL,
    "paid_status" "text",
    "source" "text" DEFAULT 'pbs'::"text" NOT NULL,
    "paid_date" "date",
    "description" "text",
    "client_seq" integer,
    "tenant_id" "uuid" NOT NULL,
    CONSTRAINT "job_invoices_status_check" CHECK (("status" = ANY (ARRAY['draft'::"text", 'sent'::"text", 'paid'::"text", 'void'::"text"])))
);


ALTER TABLE "public"."job_invoices" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."job_stages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "tenant_id" "uuid" NOT NULL
);


ALTER TABLE "public"."job_stages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."job_tasks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "job_id" "uuid" NOT NULL,
    "task_name" "text" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "template_id" "uuid",
    "sort_order" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "category_id" "uuid",
    "assignee_id" "uuid",
    "due_date" "date",
    "bt_todo_id" bigint,
    "priority" "text",
    "notes" "text",
    "completed_at" timestamp with time zone,
    "completed_by_name" "text",
    "assignee_name" "text",
    "tenant_id" "uuid" NOT NULL
);


ALTER TABLE "public"."job_tasks" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."job_templates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "project_manager" "text",
    "consultant" "text",
    "auto_trigger" "text",
    "notes" "text",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "tenant_id" "uuid" NOT NULL
);


ALTER TABLE "public"."job_templates" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."jobs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "estimate_id" "uuid",
    "client_id" "uuid",
    "client_name" "text" DEFAULT ''::"text" NOT NULL,
    "name" "text" DEFAULT ''::"text" NOT NULL,
    "sold_date" timestamp with time zone DEFAULT "now"(),
    "total_man_days" numeric(10,2) DEFAULT 0,
    "labor_burden" numeric(12,2) DEFAULT 0,
    "material_cost" numeric(12,2) DEFAULT 0,
    "sub_cost" numeric(12,2) DEFAULT 0,
    "gross_profit" numeric(12,2) DEFAULT 0,
    "gpmd" numeric(10,2) DEFAULT 0,
    "total_price" numeric(12,2) DEFAULT 0,
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "consultant" "text",
    "stage_id" "uuid",
    "job_address" "text" DEFAULT ''::"text" NOT NULL,
    "job_city" "text" DEFAULT ''::"text" NOT NULL,
    "job_state" "text" DEFAULT ''::"text" NOT NULL,
    "job_zip" "text" DEFAULT ''::"text" NOT NULL,
    "bt_job_id" integer,
    "projected_start" "date",
    "projected_completion" "date",
    "actual_start" "date",
    "actual_completion" "date",
    "bt_contract_price" numeric(14,2),
    "bt_revised_cost" numeric(14,2),
    "bt_total_costs" numeric(14,2),
    "bt_total_costs_paid" numeric(14,2),
    "bt_owner_invoices_paid" numeric(14,2),
    "source" "text" DEFAULT 'manual'::"text",
    "bt_imported_at" timestamp with time zone,
    "notes" "text",
    "permit_number" "text",
    "gate_code" "text",
    "has_dog" boolean DEFAULT false NOT NULL,
    "access_notes" "text",
    "lat" numeric(10,7),
    "lon" numeric(10,7),
    "geocoded_at" timestamp with time zone,
    "geocode_status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "design_consultant" "text",
    "installation_consultant" "text",
    "design_review" "text",
    "permit_engineering_coordinator" "text",
    "final_review" "text",
    "job_supervisor" "text",
    "quality_control_supervisor" "text",
    "finance_manager" "text",
    "success_supervisor" "text",
    "qb_customer_full_name" "text",
    "qb_customer_list_id" "text",
    "responsible_employee_id" "uuid",
    "production_manager" "text",
    "tenant_id" "uuid" NOT NULL,
    CONSTRAINT "jobs_geocode_status_check" CHECK (("geocode_status" = ANY (ARRAY['pending'::"text", 'ok'::"text", 'not_found'::"text", 'error'::"text", 'skipped'::"text"])))
);


ALTER TABLE "public"."jobs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."labor_category" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "code" "text" NOT NULL,
    "name" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."labor_category" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."labor_rates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "rate_per_day" numeric DEFAULT 0,
    "notes" "text",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "rate" numeric(10,4) DEFAULT 0,
    "unit" "text" DEFAULT 'per day'::"text",
    "category" "text" DEFAULT 'General'::"text",
    "tenant_id" "uuid" NOT NULL,
    "sub_category" "text",
    "label" "text",
    "ref_key" "text"
);


ALTER TABLE "public"."labor_rates" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."labor_subcategory" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "category_id" "uuid" NOT NULL,
    "code" "text" NOT NULL,
    "name" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."labor_subcategory" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."lms_actions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "instructions" "text",
    "created_by_email" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "tenant_id" "uuid" NOT NULL
);


ALTER TABLE "public"."lms_actions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."lms_assignments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "course_id" "uuid" NOT NULL,
    "employee_id" "uuid" NOT NULL,
    "assigned_at" timestamp with time zone DEFAULT "now"(),
    "tenant_id" "uuid" NOT NULL
);


ALTER TABLE "public"."lms_assignments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."lms_categories" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "sort_order" integer DEFAULT 100 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "tenant_id" "uuid" NOT NULL
);


ALTER TABLE "public"."lms_categories" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."lms_courses" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "category" "text" DEFAULT 'General'::"text",
    "created_by_email" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "image_url" "text",
    "tenant_id" "uuid" NOT NULL
);


ALTER TABLE "public"."lms_courses" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."lms_learning_drills" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "content" "text",
    "created_by_email" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "tenant_id" "uuid" NOT NULL
);


ALTER TABLE "public"."lms_learning_drills" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."lms_quiz_attempts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "assignment_id" "uuid" NOT NULL,
    "step_id" "uuid" NOT NULL,
    "score" integer NOT NULL,
    "passed" boolean NOT NULL,
    "attempted_at" timestamp with time zone DEFAULT "now"(),
    "tenant_id" "uuid" NOT NULL
);


ALTER TABLE "public"."lms_quiz_attempts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."lms_quizzes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "questions" "jsonb" DEFAULT '[]'::"jsonb",
    "passing_score" integer DEFAULT 70,
    "max_attempts" integer DEFAULT 3,
    "created_by_email" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "tenant_id" "uuid" NOT NULL
);


ALTER TABLE "public"."lms_quizzes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."lms_read_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "doc_url" "text",
    "file_name" "text",
    "created_by_email" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "category" "text" DEFAULT 'General'::"text" NOT NULL,
    "mime_type" "text",
    "size_bytes" bigint,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "tenant_id" "uuid" NOT NULL
);


ALTER TABLE "public"."lms_read_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."lms_step_completions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "assignment_id" "uuid" NOT NULL,
    "step_id" "uuid" NOT NULL,
    "completed_at" timestamp with time zone DEFAULT "now"(),
    "score" integer,
    "tenant_id" "uuid" NOT NULL
);


ALTER TABLE "public"."lms_step_completions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."lms_steps" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "course_id" "uuid" NOT NULL,
    "step_order" integer DEFAULT 0 NOT NULL,
    "step_type" "text" NOT NULL,
    "title" "text" NOT NULL,
    "youtube_url" "text",
    "instructions" "text",
    "read_item_id" "uuid",
    "learning_drill_id" "uuid",
    "quiz_id" "uuid",
    "test_id" "uuid",
    "action_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "video_id" "uuid",
    "tenant_id" "uuid" NOT NULL
);


ALTER TABLE "public"."lms_steps" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."lms_tests" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "questions" "jsonb" DEFAULT '[]'::"jsonb",
    "passing_score" integer DEFAULT 80,
    "max_attempts" integer DEFAULT 2,
    "created_by_email" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "tenant_id" "uuid" NOT NULL
);


ALTER TABLE "public"."lms_tests" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."lms_videos" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "category" "text" DEFAULT 'General'::"text" NOT NULL,
    "video_url" "text",
    "file_name" "text",
    "mime_type" "text",
    "size_bytes" bigint,
    "thumbnail_url" "text",
    "created_by_email" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "tenant_id" "uuid" NOT NULL
);


ALTER TABLE "public"."lms_videos" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."master_equipment" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "type" "text" NOT NULL,
    "equipment_id" "text",
    "year" integer,
    "condition" integer,
    "last_maintenance_date" "date",
    "maintenance_summary" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "manufacturer" "text" DEFAULT ''::"text" NOT NULL,
    "model" "text" DEFAULT ''::"text" NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    CONSTRAINT "master_equipment_condition_check" CHECK ((("condition" >= 1) AND ("condition" <= 4))),
    CONSTRAINT "master_equipment_type_check" CHECK (("type" = ANY (ARRAY['Vehicle'::"text", 'Trailer'::"text", 'Large Power'::"text", 'Small Power'::"text", 'Hand Tool'::"text"])))
);


ALTER TABLE "public"."master_equipment" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."master_sub_crews" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "divisions" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "rating" integer,
    "notes" "text" DEFAULT ''::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "cell" "text",
    "phone" "text",
    "tenant_id" "uuid" NOT NULL,
    CONSTRAINT "master_sub_crews_rating_check" CHECK ((("rating" >= 1) AND ("rating" <= 10)))
);


ALTER TABLE "public"."master_sub_crews" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."material" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "category_id" "uuid" NOT NULL,
    "subcategory_id" "uuid" NOT NULL,
    "description" "text" NOT NULL,
    "unit" "text",
    "calc_meta" "jsonb",
    "is_default" boolean DEFAULT false NOT NULL,
    "legacy_rate_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "collection" "text",
    "sku" "text",
    "photo_url" "text",
    "attributes" "jsonb" DEFAULT '{}'::"jsonb",
    "show_in_selections" boolean DEFAULT false,
    "sf_per_pallet" numeric,
    "price_per_lf_vert" numeric,
    "watts" numeric,
    "va" numeric,
    "labor_hrs_ea" numeric,
    "sub_price_ea" numeric,
    "notes" "text",
    "product_type_id" "uuid",
    "archived_at" timestamp with time zone,
    "ref_key" "text"
);


ALTER TABLE "public"."material" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."material_backup_premerge" (
    "id" "uuid",
    "tenant_id" "uuid",
    "category_id" "uuid",
    "subcategory_id" "uuid",
    "description" "text",
    "unit" "text",
    "calc_meta" "jsonb",
    "is_default" boolean,
    "legacy_rate_id" "uuid",
    "created_at" timestamp with time zone,
    "collection" "text",
    "sku" "text",
    "photo_url" "text",
    "attributes" "jsonb",
    "show_in_selections" boolean,
    "sf_per_pallet" numeric,
    "price_per_lf_vert" numeric,
    "watts" numeric,
    "va" numeric,
    "labor_hrs_ea" numeric,
    "sub_price_ea" numeric,
    "notes" "text",
    "product_type_id" "uuid"
);


ALTER TABLE "public"."material_backup_premerge" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."material_categories" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "tenant_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."material_categories" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."material_migration_map_backup" (
    "rate_id" "uuid",
    "tenant_id" "uuid",
    "name" "text",
    "category" "text",
    "sub_category" "text",
    "vendor_id" "uuid",
    "unit_cost" numeric,
    "kind" "text",
    "subcat_code" "text",
    "collection" "text",
    "note" "text"
);


ALTER TABLE "public"."material_migration_map_backup" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."material_price" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "material_id" "uuid" NOT NULL,
    "vendor_id" "uuid" NOT NULL,
    "price" numeric,
    "effective_start" "date" DEFAULT CURRENT_DATE NOT NULL,
    "effective_end" "date",
    "source" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."material_price" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."material_price_backup_prehist" (
    "id" "uuid",
    "tenant_id" "uuid",
    "material_id" "uuid",
    "vendor_id" "uuid",
    "price" numeric,
    "effective_start" "date",
    "effective_end" "date",
    "source" "text",
    "created_at" timestamp with time zone
);


ALTER TABLE "public"."material_price_backup_prehist" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."material_price_backup_premerge" (
    "id" "uuid",
    "tenant_id" "uuid",
    "material_id" "uuid",
    "vendor_id" "uuid",
    "price" numeric,
    "effective_start" "date",
    "effective_end" "date",
    "source" "text",
    "created_at" timestamp with time zone
);


ALTER TABLE "public"."material_price_backup_premerge" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."material_price_history_backup" (
    "id" "uuid",
    "tenant_id" "uuid",
    "material_rate_id" "uuid",
    "vendor_id" "uuid",
    "unit_cost" numeric,
    "effective_start" "date",
    "effective_end" "date",
    "source" "text",
    "source_doc_url" "text",
    "import_id" "uuid",
    "created_at" timestamp with time zone,
    "created_by" "uuid"
);


ALTER TABLE "public"."material_price_history_backup" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."material_rates_backup_final" (
    "id" "uuid",
    "name" "text",
    "unit" "text",
    "unit_cost" numeric,
    "category" "text",
    "notes" "text",
    "created_by" "uuid",
    "created_at" timestamp with time zone,
    "tenant_id" "uuid",
    "vendor_id" "uuid",
    "sf_per_pallet" numeric,
    "price_per_lf_vert" numeric,
    "sub_category" "text",
    "photo_url" "text",
    "watts" numeric,
    "va" numeric,
    "labor_hrs_ea" numeric,
    "sub_price_ea" numeric,
    "description" "text",
    "attributes" "jsonb",
    "sku" "text",
    "show_in_selections" boolean,
    "block_w_in" numeric,
    "block_h_in" numeric,
    "block_l_in" numeric,
    "calc_meta" "jsonb",
    "product_type_id" "uuid"
);


ALTER TABLE "public"."material_rates_backup_final" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."misc_rates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "category" "text",
    "name" "text" NOT NULL,
    "unit" "text",
    "rate" numeric,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "label" "text",
    "sub_category" "text",
    "ref_key" "text"
);


ALTER TABLE "public"."misc_rates" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."module_category_map" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "module_type" "text" NOT NULL,
    "category_name" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."module_category_map" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."module_equipment_map" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "module_type" "text" NOT NULL,
    "equipment_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "tenant_id" "uuid" NOT NULL
);


ALTER TABLE "public"."module_equipment_map" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."module_field_equipment_map" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "module_type" "text" NOT NULL,
    "field_key" "text" NOT NULL,
    "field_label" "text" DEFAULT ''::"text" NOT NULL,
    "equipment_type" "text" DEFAULT ''::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "tenant_id" "uuid" NOT NULL
);


ALTER TABLE "public"."module_field_equipment_map" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."modules" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "project_id" "uuid" NOT NULL,
    "module_name" "text" NOT NULL,
    "crew_type" "text" DEFAULT 'General'::"text",
    "estimated_man_days" numeric(8,2) DEFAULT 0.00,
    "estimated_material_cost" numeric(10,2) DEFAULT 0.00,
    "sort_order" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "tenant_id" "uuid" NOT NULL,
    CONSTRAINT "modules_crew_type_check" CHECK (("crew_type" = ANY (ARRAY['General'::"text", 'Demo'::"text", 'Concrete'::"text", 'Irrigation'::"text", 'Planting'::"text"])))
);


ALTER TABLE "public"."modules" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."org_chart_template_categories" (
    "id" bigint NOT NULL,
    "name" "text" NOT NULL,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."org_chart_template_categories" OWNER TO "postgres";


ALTER TABLE "public"."org_chart_template_categories" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."org_chart_template_categories_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."org_chart_template_subcategories" (
    "id" bigint NOT NULL,
    "name" "text" NOT NULL,
    "category_id" bigint,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."org_chart_template_subcategories" OWNER TO "postgres";


ALTER TABLE "public"."org_chart_template_subcategories" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."org_chart_template_subcategories_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."org_chart_templates" (
    "id" bigint NOT NULL,
    "name" "text" NOT NULL,
    "category_id" bigint,
    "data" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "subcategory_id" bigint,
    "description" "text",
    "is_sample" boolean DEFAULT false NOT NULL
);


ALTER TABLE "public"."org_chart_templates" OWNER TO "postgres";


ALTER TABLE "public"."org_chart_templates" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."org_chart_templates_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."org_chart_wizard_feedback" (
    "id" bigint NOT NULL,
    "description" "text",
    "draft" "jsonb",
    "final" "jsonb",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."org_chart_wizard_feedback" OWNER TO "postgres";


ALTER TABLE "public"."org_chart_wizard_feedback" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."org_chart_wizard_feedback_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."org_charts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" DEFAULT 'New Org Chart'::"text" NOT NULL,
    "description" "text",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "is_default" boolean DEFAULT false,
    "row_spacing" "jsonb" DEFAULT '{}'::"jsonb",
    "col_spacing" "jsonb" DEFAULT '{}'::"jsonb",
    "category_id" bigint,
    "subcategory_id" bigint,
    "tenant_id" "uuid" NOT NULL
);


ALTER TABLE "public"."org_charts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."org_edges" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "chart_id" "uuid" NOT NULL,
    "source_id" "uuid" NOT NULL,
    "target_id" "uuid" NOT NULL,
    "relationship" "text" DEFAULT 'reports_to'::"text" NOT NULL,
    "label" "text",
    "style" "text" DEFAULT 'solid'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "bus_offset" numeric DEFAULT 0,
    "tenant_id" "uuid" NOT NULL
);


ALTER TABLE "public"."org_edges" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."org_node_types" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "chart_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "color" "text" DEFAULT '#3A5038'::"text" NOT NULL,
    "text_color" "text" DEFAULT '#FFFFFF'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "tenant_id" "uuid" NOT NULL
);


ALTER TABLE "public"."org_node_types" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."org_nodes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "chart_id" "uuid" NOT NULL,
    "type_id" "uuid",
    "label" "text" NOT NULL,
    "subtitle" "text",
    "x" numeric DEFAULT 100 NOT NULL,
    "y" numeric DEFAULT 100 NOT NULL,
    "width" numeric DEFAULT 180 NOT NULL,
    "height" numeric DEFAULT 64 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "kind" "text" DEFAULT 'custom'::"text" NOT NULL,
    "position_id" bigint,
    "heading" "text",
    "bg_color" "text",
    "container_mode" "text",
    "tier" integer,
    "tier_order" integer,
    "x_offset" integer DEFAULT 0 NOT NULL,
    "employee_id" "uuid",
    "parent_container_id" "uuid",
    "attached_to_node_id" "uuid",
    "attachment_side" "text",
    "font_sizes" "jsonb" DEFAULT '{}'::"jsonb",
    "text_styles" "jsonb" DEFAULT '{}'::"jsonb",
    "box_style" "jsonb" DEFAULT '{}'::"jsonb",
    "senior_node_id" "uuid",
    "tenant_id" "uuid" NOT NULL,
    "notes" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL
);


ALTER TABLE "public"."org_nodes" OWNER TO "postgres";


COMMENT ON COLUMN "public"."org_nodes"."parent_container_id" IS 'Implicit container ownership';



CREATE TABLE IF NOT EXISTS "public"."package_requests" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "package_id" "text" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "requested_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."package_requests" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."packages" (
    "id" "text" NOT NULL,
    "name" "text" NOT NULL,
    "price_monthly" numeric,
    "requires_tier_rank" integer DEFAULT 1 NOT NULL,
    "module_keys" "text"[] DEFAULT '{}'::"text"[] NOT NULL
);


ALTER TABLE "public"."packages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."paver_prices" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "brand" "text",
    "name" "text",
    "price_per_sf" numeric(8,4),
    "sf_per_pallet" numeric(8,2),
    "price_per_lf_vert" numeric(8,4),
    "created_at" timestamp with time zone DEFAULT "now"(),
    "tenant_id" "uuid" NOT NULL
);


ALTER TABLE "public"."paver_prices" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."pbs_drive_members" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "drive_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "permission" "text" DEFAULT 'viewer'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "tenant_id" "uuid" NOT NULL,
    CONSTRAINT "pbs_drive_members_permission_check" CHECK (("permission" = ANY (ARRAY['viewer'::"text", 'editor'::"text", 'manager'::"text"])))
);


ALTER TABLE "public"."pbs_drive_members" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."pbs_drives" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "tenant_id" "uuid" NOT NULL
);


ALTER TABLE "public"."pbs_drives" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."plans" (
    "id" "text" NOT NULL,
    "name" "text" NOT NULL,
    "rank" integer DEFAULT 0 NOT NULL,
    "module_keys" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "price_monthly" numeric,
    "helcim_plan_id" "text"
);


ALTER TABLE "public"."plans" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."position_courses" (
    "position_id" bigint NOT NULL,
    "course_id" "uuid" NOT NULL,
    "tenant_id" "uuid" NOT NULL
);


ALTER TABLE "public"."position_courses" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."positions" (
    "id" bigint NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "vfp" "text",
    "write_up_url" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "source_chart_id" "uuid",
    "quick_hat_url" "text",
    "quick_hat_name" "text",
    "full_hat_url" "text",
    "full_hat_name" "text",
    "tenant_id" "uuid" NOT NULL
);


ALTER TABLE "public"."positions" OWNER TO "postgres";


ALTER TABLE "public"."positions" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."positions_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."price_sheet_imports" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "vendor_id" "uuid",
    "effective_date" "date" NOT NULL,
    "file_url" "text",
    "status" "text" DEFAULT 'pending_review'::"text" NOT NULL,
    "line_count" integer DEFAULT 0,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_by" "uuid"
);


ALTER TABLE "public"."price_sheet_imports" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."product_type" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "key" "text" NOT NULL,
    "label" "text" NOT NULL,
    "calc_kind" "text" NOT NULL,
    "unit_basis" "text",
    "attribute_schema" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "notes" "text"
);


ALTER TABLE "public"."product_type" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "email" "text",
    "full_name" "text",
    "role" "text" DEFAULT 'user'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "username" "text",
    "archived_at" timestamp with time zone,
    "avatar_url" "text",
    "address_line1" "text",
    "address_line2" "text",
    "city" "text",
    "state" "text",
    "zip_code" "text",
    "phone_cell" "text",
    "temp_password" "text",
    "preferred_language" "text" DEFAULT 'en'::"text" NOT NULL,
    "greeting_tagline" "text",
    "tenant_id" "uuid" NOT NULL,
    CONSTRAINT "profiles_preferred_language_check" CHECK (("preferred_language" = ANY (ARRAY['en'::"text", 'es'::"text"])))
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


COMMENT ON COLUMN "public"."profiles"."greeting_tagline" IS 'Optional one-line signoff Sam tacks onto the chat-panel greeting (e.g. "Go Rams!"). Admin-set in HR > Profile.';



CREATE TABLE IF NOT EXISTS "public"."projects" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "job_id" "uuid" NOT NULL,
    "project_name" "text" NOT NULL,
    "project_type" "text" DEFAULT 'General'::"text",
    "sort_order" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "tenant_id" "uuid" NOT NULL
);


ALTER TABLE "public"."projects" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."qb_connection" (
    "id" integer DEFAULT 1 NOT NULL,
    "qbwc_username" "text" NOT NULL,
    "qbwc_password" "text" NOT NULL,
    "company_file_path" "text" DEFAULT ''::"text" NOT NULL,
    "enabled" boolean DEFAULT true NOT NULL,
    "last_connected_at" timestamp with time zone,
    "last_error" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "payroll_from_date" "date" DEFAULT ("date_trunc"('year'::"text", (CURRENT_DATE)::timestamp with time zone))::"date" NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    CONSTRAINT "qb_connection_singleton" CHECK (("id" = 1))
);


ALTER TABLE "public"."qb_connection" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."qb_session" (
    "ticket" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "current_step" integer DEFAULT 0 NOT NULL,
    "total_steps" integer DEFAULT 0 NOT NULL,
    "work" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "company_file" "text",
    "last_error" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "tenant_id" "uuid" NOT NULL
);


ALTER TABLE "public"."qb_session" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."qb_sync_log" (
    "id" bigint NOT NULL,
    "ticket" "uuid",
    "soap_method" "text" NOT NULL,
    "entity" "text",
    "direction" "text",
    "status" "text" DEFAULT 'ok'::"text" NOT NULL,
    "message" "text",
    "request_xml" "text",
    "response_xml" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "tenant_id" "uuid" NOT NULL
);


ALTER TABLE "public"."qb_sync_log" OWNER TO "postgres";


ALTER TABLE "public"."qb_sync_log" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."qb_sync_log_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."qb_sync_state" (
    "entity" "text" NOT NULL,
    "last_synced_at" timestamp with time zone,
    "last_session_ticket" "text",
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "tenant_id" "uuid" NOT NULL
);


ALTER TABLE "public"."qb_sync_state" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."qb_time_tracking" (
    "txn_id" "text" NOT NULL,
    "txn_date" "date",
    "txn_number" bigint,
    "entity_list_id" "text",
    "entity_name" "text",
    "customer_list_id" "text",
    "customer_name" "text",
    "service_item_list_id" "text",
    "service_item_name" "text",
    "payroll_item_list_id" "text",
    "payroll_item_name" "text",
    "class_list_id" "text",
    "class_name" "text",
    "duration_hours" numeric,
    "duration_raw" "text",
    "billable_status" "text",
    "notes" "text",
    "edit_sequence" "text",
    "qb_time_created" timestamp with time zone,
    "qb_time_modified" timestamp with time zone,
    "synced_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "tenant_id" "uuid" NOT NULL
);


ALTER TABLE "public"."qb_time_tracking" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."reward_games" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "status" "text" DEFAULT 'draft'::"text" NOT NULL,
    "config" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "start_date" "date",
    "end_date" "date",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."reward_games" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."reward_rules" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "points" integer DEFAULT 0 NOT NULL,
    "trigger_type" "text" DEFAULT 'manual'::"text" NOT NULL,
    "active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."reward_rules" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."reward_transactions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "employee_id" "uuid" NOT NULL,
    "points" integer NOT NULL,
    "reason" "text",
    "source" "text" DEFAULT 'manual'::"text" NOT NULL,
    "rule_id" "uuid",
    "job_id" "uuid",
    "game_id" "uuid",
    "note" "text",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."reward_transactions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."sales_appointments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "title" "text" DEFAULT 'Meeting'::"text" NOT NULL,
    "client_id" "uuid",
    "employee_id" "uuid",
    "starts_at" timestamp with time zone NOT NULL,
    "ends_at" timestamp with time zone NOT NULL,
    "location" "text",
    "notes" "text",
    "status" "text" DEFAULT 'scheduled'::"text" NOT NULL,
    "created_by_email" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."sales_appointments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."sam_counter" (
    "scope" "text" NOT NULL,
    "key" "text" NOT NULL,
    "count" integer DEFAULT 0 NOT NULL,
    "expires_at" timestamp with time zone NOT NULL
);


ALTER TABLE "public"."sam_counter" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."sam_public_usage" (
    "ip" "text" NOT NULL,
    "day" "date" DEFAULT CURRENT_DATE NOT NULL,
    "count" integer DEFAULT 0 NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."sam_public_usage" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."schedule_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "job_id" "uuid",
    "title" "text" NOT NULL,
    "display_color" "text" DEFAULT '#22c55e'::"text" NOT NULL,
    "assignees" "text",
    "start_date" "date" NOT NULL,
    "end_date" "date" NOT NULL,
    "work_days" integer,
    "progress" integer DEFAULT 0,
    "reminder" "text",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "crew_id" "uuid",
    "sub_id" "uuid",
    "assignee_color" "text",
    "include_saturday" boolean DEFAULT false,
    "include_sunday" boolean DEFAULT false,
    "scheduling_type" "text" DEFAULT 'crew_type'::"text" NOT NULL,
    "work_order_ids" "uuid"[] DEFAULT '{}'::"uuid"[] NOT NULL,
    "needs_crew" boolean DEFAULT false NOT NULL,
    "ghl_appointment_id" "text",
    "ghl_calendar_id" "text",
    "ghl_synced_at" timestamp with time zone,
    "bt_schedule_id" bigint,
    "completed_at" timestamp with time zone,
    "completed_by_name" "text",
    "tenant_id" "uuid" NOT NULL,
    CONSTRAINT "schedule_items_progress_check" CHECK ((("progress" >= 0) AND ("progress" <= 100)))
);


ALTER TABLE "public"."schedule_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."schedule_items_crew_backfill_bak" (
    "id" "uuid",
    "old_crew_id" "uuid",
    "old_assignee_color" "text"
);


ALTER TABLE "public"."schedule_items_crew_backfill_bak" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."schedule_items_sub_strip_bak" (
    "id" "uuid",
    "old_title" "text",
    "old_assignee_color" "text"
);


ALTER TABLE "public"."schedule_items_sub_strip_bak" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."schedule_items_title_strip_bak" (
    "id" "uuid",
    "old_title" "text"
);


ALTER TABLE "public"."schedule_items_title_strip_bak" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."selections_backup" (
    "id" "uuid",
    "tenant_id" "uuid",
    "category" "text",
    "sub_category" "text",
    "name" "text",
    "description" "text",
    "photo_url" "text",
    "type" "text",
    "attributes" "jsonb",
    "vendor_id" "uuid",
    "material_rate_id" "uuid",
    "sku" "text",
    "unit" "text",
    "price" numeric,
    "source" "text",
    "created_at" timestamp with time zone,
    "created_by" "uuid"
);


ALTER TABLE "public"."selections_backup" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."stat_groups" (
    "id" bigint NOT NULL,
    "name" "text" NOT NULL,
    "stat_ids" bigint[] DEFAULT '{}'::bigint[] NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "tenant_id" "uuid" NOT NULL
);


ALTER TABLE "public"."stat_groups" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."stat_groups_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."stat_groups_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."stat_groups_id_seq" OWNED BY "public"."stat_groups"."id";



CREATE TABLE IF NOT EXISTS "public"."stat_import_export_log" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "type" "text" NOT NULL,
    "file_name" "text",
    "stat_names" "text"[] DEFAULT '{}'::"text"[],
    "stat_count" integer DEFAULT 0,
    "value_count" integer DEFAULT 0,
    "performed_by" "uuid",
    "performed_at" timestamp with time zone DEFAULT "now"(),
    "tenant_id" "uuid" NOT NULL,
    CONSTRAINT "stat_import_export_log_type_check" CHECK (("type" = ANY (ARRAY['import'::"text", 'export'::"text"])))
);


ALTER TABLE "public"."stat_import_export_log" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."stat_notes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "statistic_id" bigint NOT NULL,
    "period_date" "date" NOT NULL,
    "note" "text" DEFAULT ''::"text" NOT NULL,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "tenant_id" "uuid" NOT NULL
);


ALTER TABLE "public"."stat_notes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."stat_reminder_log" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "statistic_id" bigint NOT NULL,
    "period_date" "date" NOT NULL,
    "sent_count" integer DEFAULT 0 NOT NULL,
    "last_sent_at" timestamp with time zone,
    "next_send_at" timestamp with time zone,
    "resolved" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "tenant_id" "uuid" NOT NULL
);


ALTER TABLE "public"."stat_reminder_log" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."stat_reminders" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "statistic_id" bigint NOT NULL,
    "enabled" boolean DEFAULT false NOT NULL,
    "delay_days" integer DEFAULT 3 NOT NULL,
    "notify_email" boolean DEFAULT true NOT NULL,
    "notify_sms" boolean DEFAULT false NOT NULL,
    "repeat_enabled" boolean DEFAULT false NOT NULL,
    "repeat_value" integer DEFAULT 1 NOT NULL,
    "repeat_unit" "text" DEFAULT 'weeks'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "tenant_id" "uuid" NOT NULL,
    CONSTRAINT "stat_reminders_delay_days_check" CHECK ((("delay_days" >= 1) AND ("delay_days" <= 60))),
    CONSTRAINT "stat_reminders_repeat_unit_check" CHECK (("repeat_unit" = ANY (ARRAY['days'::"text", 'weeks'::"text"]))),
    CONSTRAINT "stat_reminders_repeat_value_check" CHECK (("repeat_value" >= 1))
);


ALTER TABLE "public"."stat_reminders" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."stat_sources" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "category" "text" DEFAULT 'Custom'::"text" NOT NULL,
    "key" "text" NOT NULL,
    "label" "text" NOT NULL,
    "description" "text",
    "source_type" "text" DEFAULT 'pull'::"text" NOT NULL,
    "table_name" "text",
    "date_column" "text",
    "metric" "text",
    "field" "text",
    "filters" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "stat_type" "text" DEFAULT 'numeric'::"text" NOT NULL,
    "tracking" "text" DEFAULT 'monthly'::"text" NOT NULL,
    "archived" boolean DEFAULT false NOT NULL,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."stat_sources" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."statistic_shares" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "statistic_id" integer NOT NULL,
    "user_id" "uuid" NOT NULL,
    "permission" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid",
    "tenant_id" "uuid" NOT NULL,
    CONSTRAINT "statistic_shares_permission_check" CHECK (("permission" = ANY (ARRAY['view'::"text", 'edit'::"text"])))
);


ALTER TABLE "public"."statistic_shares" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."statistic_values" (
    "id" bigint NOT NULL,
    "statistic_id" bigint NOT NULL,
    "period_date" "date" NOT NULL,
    "value" numeric(15,4) NOT NULL,
    "notes" "text",
    "entered_by" "uuid",
    "entered_at" timestamp with time zone DEFAULT "now"(),
    "tenant_id" "uuid" NOT NULL
);


ALTER TABLE "public"."statistic_values" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."statistic_values_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."statistic_values_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."statistic_values_id_seq" OWNED BY "public"."statistic_values"."id";



CREATE TABLE IF NOT EXISTS "public"."statistics" (
    "id" bigint NOT NULL,
    "name" "text" NOT NULL,
    "stat_type" "text" NOT NULL,
    "tracking" "text" NOT NULL,
    "beginning_date" "date" NOT NULL,
    "upside_down" boolean DEFAULT false NOT NULL,
    "owner_type" "text" NOT NULL,
    "owner_user_id" "uuid",
    "owner_position_id" bigint,
    "is_public" boolean DEFAULT false NOT NULL,
    "stat_category" "text" DEFAULT 'General'::"text",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "archived" boolean DEFAULT false NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "default_periods" integer,
    "missing_value_display" "text" DEFAULT 'skip'::"text" NOT NULL,
    "show_values" boolean DEFAULT false NOT NULL,
    "equation_parts" "jsonb",
    "overlay_parts" "jsonb",
    "target_lines" "jsonb",
    "source_stat_id" bigint,
    "aggregation_method" "text" DEFAULT 'sum'::"text" NOT NULL,
    "data_source" "text",
    "tenant_id" "uuid" NOT NULL,
    CONSTRAINT "statistics_owner_type_check" CHECK (("owner_type" = ANY (ARRAY['user'::"text", 'position'::"text"]))),
    CONSTRAINT "statistics_stat_type_check" CHECK (("stat_type" = ANY (ARRAY['currency'::"text", 'numeric'::"text", 'percentage'::"text"]))),
    CONSTRAINT "statistics_tracking_check" CHECK (("tracking" = ANY (ARRAY['daily'::"text", 'weekly'::"text", 'monthly'::"text", 'quarterly'::"text", 'yearly'::"text"])))
);


ALTER TABLE "public"."statistics" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."statistics_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."statistics_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."statistics_id_seq" OWNED BY "public"."statistics"."id";



CREATE TABLE IF NOT EXISTS "public"."sub_vendor_contracts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "sub_vendor_id" "uuid",
    "party_type" "text",
    "party_name" "text",
    "kind" "text" DEFAULT 'built'::"text" NOT NULL,
    "line_items" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "total" numeric DEFAULT 0 NOT NULL,
    "scope_of_work" "text",
    "exclusions" "text",
    "agreement_text" "text",
    "signature_data" "text",
    "signer_name" "text",
    "signed_date" "date",
    "file_path" "text",
    "file_name" "text",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "tenant_id" "uuid" NOT NULL
);


ALTER TABLE "public"."sub_vendor_contracts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."sub_vendor_quotes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "sub_vendor_id" "uuid",
    "vendor_name" "text",
    "job_id" "uuid",
    "job_name" "text",
    "direction" "text" DEFAULT 'request'::"text" NOT NULL,
    "line_items" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "total" numeric DEFAULT 0 NOT NULL,
    "status" "text" DEFAULT 'draft'::"text" NOT NULL,
    "sent_method" "text",
    "sent_at" timestamp with time zone,
    "file_path" "text",
    "file_name" "text",
    "notes" "text",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "estimate_id" "uuid",
    "estimate_name" "text",
    "tenant_id" "uuid" NOT NULL
);


ALTER TABLE "public"."sub_vendor_quotes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."subcategory" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "category_id" "uuid" NOT NULL,
    "code" "text" NOT NULL,
    "name" "text" NOT NULL,
    "default_vendor_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."subcategory" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."subcontractor_category" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "code" "text" NOT NULL,
    "name" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."subcontractor_category" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."subcontractor_rates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_name" "text",
    "trade" "text",
    "rate" numeric DEFAULT 0,
    "unit" "text",
    "notes" "text",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "category" "text" DEFAULT 'General'::"text",
    "tenant_id" "uuid" NOT NULL,
    "sub_category" "text",
    "item_key" "text",
    "vendor_id" "uuid"
);


ALTER TABLE "public"."subcontractor_rates" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."subcontractor_rates_backup_20260813" (
    "id" "uuid",
    "company_name" "text",
    "trade" "text",
    "rate" numeric,
    "unit" "text",
    "notes" "text",
    "created_by" "uuid",
    "created_at" timestamp with time zone,
    "category" "text",
    "tenant_id" "uuid",
    "sub_category" "text"
);


ALTER TABLE "public"."subcontractor_rates_backup_20260813" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."subcontractor_rates_backup_dedupe_20260814" (
    "id" "uuid",
    "company_name" "text",
    "trade" "text",
    "rate" numeric,
    "unit" "text",
    "notes" "text",
    "created_by" "uuid",
    "created_at" timestamp with time zone,
    "category" "text",
    "tenant_id" "uuid",
    "sub_category" "text"
);


ALTER TABLE "public"."subcontractor_rates_backup_dedupe_20260814" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."subcontractor_rates_backup_itemtidy_20260814" (
    "id" "uuid",
    "company_name" "text",
    "trade" "text",
    "rate" numeric,
    "unit" "text",
    "notes" "text",
    "created_by" "uuid",
    "created_at" timestamp with time zone,
    "category" "text",
    "tenant_id" "uuid",
    "sub_category" "text"
);


ALTER TABLE "public"."subcontractor_rates_backup_itemtidy_20260814" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."subcontractor_rates_backup_parse_20260814" (
    "id" "uuid",
    "company_name" "text",
    "trade" "text",
    "rate" numeric,
    "unit" "text",
    "notes" "text",
    "created_by" "uuid",
    "created_at" timestamp with time zone,
    "category" "text",
    "tenant_id" "uuid",
    "sub_category" "text"
);


ALTER TABLE "public"."subcontractor_rates_backup_parse_20260814" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."subcontractor_subcategory" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "category_id" "uuid" NOT NULL,
    "code" "text" NOT NULL,
    "name" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."subcontractor_subcategory" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."subs_vendors" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_name" "text" NOT NULL,
    "divisions" "text"[] DEFAULT '{}'::"text"[],
    "status" "text" DEFAULT 'no_email'::"text",
    "primary_contact" "text",
    "email" "text",
    "cell" "text",
    "phone" "text",
    "trade_agreement_status" "text",
    "liability_exp" "date",
    "workers_comp_exp" "date",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "type" "text" DEFAULT 'sub'::"text",
    "phone_ext" "text",
    "services_pricing" "text",
    "price_list" "text",
    "price_list_files" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "supplied_categories" "text"[] DEFAULT '{}'::"text"[],
    "address" "text",
    "city" "text",
    "state" "text",
    "zip" "text",
    "general_categories" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "is_lead" boolean DEFAULT false NOT NULL,
    CONSTRAINT "subs_vendors_type_check" CHECK (("type" = ANY (ARRAY['sub'::"text", 'vendor'::"text"])))
);


ALTER TABLE "public"."subs_vendors" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."task_categories" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "sort_order" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "tenant_id" "uuid" NOT NULL
);


ALTER TABLE "public"."task_categories" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."task_descriptions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "sort_order" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "tenant_id" "uuid" NOT NULL
);


ALTER TABLE "public"."task_descriptions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."template_folders" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "template_id" "uuid" NOT NULL,
    "folder_name" "text" NOT NULL,
    "sort_order" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "folder_type" "text" DEFAULT 'document'::"text" NOT NULL,
    "tenant_id" "uuid" NOT NULL
);


ALTER TABLE "public"."template_folders" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."template_tasks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "template_id" "uuid" NOT NULL,
    "task_name" "text" NOT NULL,
    "sort_order" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "tenant_id" "uuid" NOT NULL
);


ALTER TABLE "public"."template_tasks" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tenant_extensions" (
    "tenant_id" "uuid" NOT NULL,
    "extension_id" "text" NOT NULL,
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "trial_ends_at" timestamp with time zone,
    "current_period_end" timestamp with time zone,
    "enabled_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."tenant_extensions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tenant_packages" (
    "tenant_id" "uuid" NOT NULL,
    "package_id" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."tenant_packages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tenant_payment_connections" (
    "tenant_id" "uuid" NOT NULL,
    "provider" "text" DEFAULT 'helcim'::"text" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "helcim_account_id" "text",
    "helcim_api_token" "text",
    "registration_ref" "text",
    "connected_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."tenant_payment_connections" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tenants" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "brand_name" "text",
    "brand_logo_url" "text",
    "plan_id" "text",
    "helcim_customer_id" "text",
    "helcim_subscription_id" "text",
    "billing_status" "text",
    "card_last4" "text",
    "current_period_end" timestamp with time zone,
    "card_brand" "text",
    "card_exp" "text",
    "owner_user_id" "uuid",
    "trial_ends_at" timestamp with time zone,
    "trial_started_at" timestamp with time zone DEFAULT "now"(),
    "trial_extended_count" integer DEFAULT 0 NOT NULL,
    "data_retention_until" timestamp with time zone,
    "is_support_tenant" boolean DEFAULT false NOT NULL
);


ALTER TABLE "public"."tenants" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."time_clock_breaks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "time_entry_id" "uuid" NOT NULL,
    "kind" "text" NOT NULL,
    "minutes" integer NOT NULL,
    "started_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    CONSTRAINT "time_clock_breaks_kind_check" CHECK (("kind" = ANY (ARRAY['lunch'::"text", 'short'::"text"])))
);


ALTER TABLE "public"."time_clock_breaks" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."time_clock_permissions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "employee_id" "uuid" NOT NULL,
    "clock_in_multiple_manager" boolean DEFAULT false NOT NULL,
    "clock_in_multiple_crew_chief" boolean DEFAULT false NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "tenant_id" "uuid" NOT NULL
);


ALTER TABLE "public"."time_clock_permissions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."time_entries" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "job_id" "uuid",
    "employee_name" "text" NOT NULL,
    "date" "date" DEFAULT CURRENT_DATE NOT NULL,
    "time_in" time without time zone NOT NULL,
    "time_out" time without time zone,
    "notes" "text",
    "created_by" "uuid",
    "source" "text" DEFAULT 'manual'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "bt_timecard_item_id" bigint,
    "bt_hours_regular" numeric,
    "bt_hours_overtime" numeric,
    "bt_break_time" numeric,
    "bt_approval_status" "text",
    "bt_job_id" bigint,
    "clock_in_lat" numeric(10,7),
    "clock_in_lon" numeric(10,7),
    "clock_in_accuracy_m" numeric(8,2),
    "clock_in_distance_m" numeric(10,2),
    "clock_in_on_site" boolean,
    "clock_in_no_gps" boolean DEFAULT false NOT NULL,
    "clock_in_override" boolean DEFAULT false NOT NULL,
    "clock_out_lat" numeric(10,7),
    "clock_out_lon" numeric(10,7),
    "clock_out_accuracy_m" numeric(8,2),
    "clock_out_distance_m" numeric(10,2),
    "clock_out_on_site" boolean,
    "clock_out_no_gps" boolean DEFAULT false NOT NULL,
    "clock_out_override" boolean DEFAULT false NOT NULL,
    "employee_id" "uuid",
    "tenant_id" "uuid" NOT NULL
);


ALTER TABLE "public"."time_entries" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_permissions" (
    "user_id" "uuid" NOT NULL,
    "can_create_stats" boolean DEFAULT true NOT NULL,
    "can_share_stats" boolean DEFAULT false NOT NULL,
    "can_make_stats_public" boolean DEFAULT false NOT NULL,
    "can_view_financials" boolean DEFAULT true NOT NULL,
    "can_view_reports" boolean DEFAULT false NOT NULL,
    "can_create_jobs" boolean DEFAULT true NOT NULL,
    "can_edit_jobs" boolean DEFAULT true NOT NULL,
    "can_delete_jobs" boolean DEFAULT false NOT NULL,
    "can_create_bids" boolean DEFAULT true NOT NULL,
    "can_edit_bids" boolean DEFAULT true NOT NULL,
    "access_tracker" boolean DEFAULT true NOT NULL,
    "access_master_rates" boolean DEFAULT false NOT NULL,
    "access_admin" boolean DEFAULT false NOT NULL,
    "access_collections" boolean DEFAULT true NOT NULL,
    "access_statistics" boolean DEFAULT true NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "updated_by" "uuid",
    "access_contacts" boolean DEFAULT true NOT NULL,
    "access_clients" boolean DEFAULT true NOT NULL,
    "access_design" boolean DEFAULT true NOT NULL,
    "access_bids" boolean DEFAULT true NOT NULL,
    "access_jobs" boolean DEFAULT true NOT NULL,
    "access_equipment" boolean DEFAULT true NOT NULL,
    "access_finance" boolean DEFAULT true NOT NULL,
    "access_org_chart" boolean DEFAULT true NOT NULL,
    "access_subs_vendors" boolean DEFAULT true NOT NULL,
    "access_training" boolean DEFAULT true NOT NULL,
    "access_hr" boolean DEFAULT true NOT NULL,
    "access_accounting" boolean DEFAULT true NOT NULL,
    "contacts_add" boolean DEFAULT true NOT NULL,
    "contacts_edit" boolean DEFAULT true NOT NULL,
    "clients_add" boolean DEFAULT true NOT NULL,
    "clients_edit" boolean DEFAULT true NOT NULL,
    "clients_add_estimate" boolean DEFAULT true NOT NULL,
    "clients_edit_other_estimates" boolean DEFAULT false NOT NULL,
    "clients_create_bids" boolean DEFAULT true NOT NULL,
    "design_add_project" boolean DEFAULT true NOT NULL,
    "design_edit_other" boolean DEFAULT false NOT NULL,
    "bids_update_other_status" boolean DEFAULT false NOT NULL,
    "bids_delete_any" boolean DEFAULT false NOT NULL,
    "jobs_add_schedule" boolean DEFAULT true NOT NULL,
    "jobs_edit_schedule" boolean DEFAULT true NOT NULL,
    "jobs_delete_schedule" boolean DEFAULT false NOT NULL,
    "jobs_edit" boolean DEFAULT true NOT NULL,
    "jobs_view_work_orders" boolean DEFAULT true NOT NULL,
    "jobs_view_tracking" boolean DEFAULT true NOT NULL,
    "jobs_time_clock" boolean DEFAULT true NOT NULL,
    "jobs_daily_log" boolean DEFAULT true NOT NULL,
    "jobs_edit_other_daily_logs" boolean DEFAULT false NOT NULL,
    "jobs_tasks" boolean DEFAULT true NOT NULL,
    "jobs_assign_tasks" boolean DEFAULT false NOT NULL,
    "jobs_manage_tasks" boolean DEFAULT true NOT NULL,
    "jobs_change_orders" boolean DEFAULT true NOT NULL,
    "jobs_manage_co" boolean DEFAULT true NOT NULL,
    "jobs_co_other_users" boolean DEFAULT false NOT NULL,
    "jobs_files_other_users" boolean DEFAULT false NOT NULL,
    "equipment_add" boolean DEFAULT true NOT NULL,
    "equipment_edit" boolean DEFAULT true NOT NULL,
    "equipment_delete" boolean DEFAULT false NOT NULL,
    "finance_add_week" boolean DEFAULT true NOT NULL,
    "finance_edit_collections" boolean DEFAULT true NOT NULL,
    "finance_edit_planning" boolean DEFAULT true NOT NULL,
    "stats_multiple_entry" boolean DEFAULT true NOT NULL,
    "stats_print_multiple" boolean DEFAULT true NOT NULL,
    "stats_comparison" boolean DEFAULT true NOT NULL,
    "stats_import_export" boolean DEFAULT false NOT NULL,
    "org_chart_manage" boolean DEFAULT true NOT NULL,
    "subs_vendors_manage" boolean DEFAULT true NOT NULL,
    "hr_add_edit_employee" boolean DEFAULT true NOT NULL,
    "hr_delete_employee" boolean DEFAULT false NOT NULL,
    "clients_access_edit_rates" boolean DEFAULT false NOT NULL,
    "tenant_id" "uuid" NOT NULL
);


ALTER TABLE "public"."user_permissions" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_acct_account_register" AS
 SELECT "a"."id" AS "account_id",
    "c"."date" AS "txn_date",
    "c"."ref_number" AS "ref",
    "c"."payee_name" AS "payee",
    'CHK'::"text" AS "txn_type",
    "c"."payee_name" AS "offset_party",
    "c"."memo",
    "c"."total" AS "amount",
    'check'::"text" AS "source_type",
    "c"."id" AS "source_id"
   FROM ("public"."acct_checks" "c"
     JOIN "public"."acct_accounts" "a" ON ((("lower"("a"."name") = "lower"("c"."bank_account_name")) OR ("lower"("a"."qb_full_name") = "lower"("c"."bank_account_name")))))
  WHERE ("c"."bank_account_name" IS NOT NULL)
UNION ALL
 SELECT "a"."id" AS "account_id",
    "cc"."date" AS "txn_date",
    "cc"."ref_number" AS "ref",
    "cc"."payee_name" AS "payee",
    'CC'::"text" AS "txn_type",
    "cc"."payee_name" AS "offset_party",
    "cc"."memo",
    "cc"."total" AS "amount",
    'credit_card_charge'::"text" AS "source_type",
    "cc"."id" AS "source_id"
   FROM ("public"."acct_credit_card_charges" "cc"
     JOIN "public"."acct_accounts" "a" ON ((("lower"("a"."name") = "lower"("cc"."credit_card_account_name")) OR ("lower"("a"."qb_full_name") = "lower"("cc"."credit_card_account_name")))))
  WHERE ("cc"."credit_card_account_name" IS NOT NULL)
UNION ALL
 SELECT "bl"."account_id",
    "b"."date" AS "txn_date",
    "b"."number" AS "ref",
    "b"."vendor_name" AS "payee",
    'BILL'::"text" AS "txn_type",
    "b"."vendor_name" AS "offset_party",
    "bl"."description" AS "memo",
    "bl"."amount",
    'bill_line'::"text" AS "source_type",
    "b"."id" AS "source_id"
   FROM ("public"."acct_bill_lines" "bl"
     JOIN "public"."acct_bills" "b" ON (("b"."id" = "bl"."bill_id")))
  WHERE ("bl"."account_id" IS NOT NULL)
UNION ALL
 SELECT "cl"."account_id",
    "c"."date" AS "txn_date",
    "c"."ref_number" AS "ref",
    "c"."payee_name" AS "payee",
    'CHK'::"text" AS "txn_type",
    "c"."payee_name" AS "offset_party",
    "cl"."description" AS "memo",
    "cl"."amount",
    'check_line'::"text" AS "source_type",
    "c"."id" AS "source_id"
   FROM ("public"."acct_check_lines" "cl"
     JOIN "public"."acct_checks" "c" ON (("c"."id" = "cl"."check_id")))
  WHERE ("cl"."account_id" IS NOT NULL)
UNION ALL
 SELECT "ccl"."account_id",
    "cc"."date" AS "txn_date",
    "cc"."ref_number" AS "ref",
    "cc"."payee_name" AS "payee",
    'CC'::"text" AS "txn_type",
    "cc"."payee_name" AS "offset_party",
    "ccl"."description" AS "memo",
    "ccl"."amount",
    'cc_line'::"text" AS "source_type",
    "cc"."id" AS "source_id"
   FROM ("public"."acct_credit_card_charge_lines" "ccl"
     JOIN "public"."acct_credit_card_charges" "cc" ON (("cc"."id" = "ccl"."charge_id")))
  WHERE ("ccl"."account_id" IS NOT NULL)
UNION ALL
 SELECT "irl"."account_id",
    "ir"."date" AS "txn_date",
    "ir"."ref_number" AS "ref",
    "ir"."vendor_name" AS "payee",
    'IR'::"text" AS "txn_type",
    "ir"."vendor_name" AS "offset_party",
    "irl"."description" AS "memo",
    "irl"."amount",
    'ir_line'::"text" AS "source_type",
    "ir"."id" AS "source_id"
   FROM ("public"."acct_item_receipt_lines" "irl"
     JOIN "public"."acct_item_receipts" "ir" ON (("ir"."id" = "irl"."receipt_id")))
  WHERE ("irl"."account_id" IS NOT NULL)
UNION ALL
 SELECT "il"."account_id",
    "i"."date" AS "txn_date",
    "i"."number" AS "ref",
    "i"."client_name" AS "payee",
    'INV'::"text" AS "txn_type",
    "i"."client_name" AS "offset_party",
    "il"."description" AS "memo",
    "il"."amount",
    'invoice_line'::"text" AS "source_type",
    "i"."id" AS "source_id"
   FROM ("public"."acct_invoice_lines" "il"
     JOIN "public"."acct_invoices" "i" ON (("i"."id" = "il"."invoice_id")))
  WHERE ("il"."account_id" IS NOT NULL);


ALTER VIEW "public"."v_acct_account_register" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_acct_account_txn_counts" AS
 SELECT "account_id",
    "count"(*) AS "txn_count"
   FROM ( SELECT "acct_bill_lines"."account_id"
           FROM "public"."acct_bill_lines"
          WHERE ("acct_bill_lines"."account_id" IS NOT NULL)
        UNION ALL
         SELECT "acct_check_lines"."account_id"
           FROM "public"."acct_check_lines"
          WHERE ("acct_check_lines"."account_id" IS NOT NULL)
        UNION ALL
         SELECT "acct_credit_card_charge_lines"."account_id"
           FROM "public"."acct_credit_card_charge_lines"
          WHERE ("acct_credit_card_charge_lines"."account_id" IS NOT NULL)
        UNION ALL
         SELECT "acct_item_receipt_lines"."account_id"
           FROM "public"."acct_item_receipt_lines"
          WHERE ("acct_item_receipt_lines"."account_id" IS NOT NULL)
        UNION ALL
         SELECT "acct_invoice_lines"."account_id"
           FROM "public"."acct_invoice_lines"
          WHERE ("acct_invoice_lines"."account_id" IS NOT NULL)
        UNION ALL
         SELECT "acct_bank_transactions"."category_id" AS "account_id"
           FROM "public"."acct_bank_transactions"
          WHERE ("acct_bank_transactions"."category_id" IS NOT NULL)) "all_refs"
  GROUP BY "account_id";


ALTER VIEW "public"."v_acct_account_txn_counts" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_job_material_costs" AS
 SELECT "l"."id" AS "line_id",
    'bill'::"text" AS "source_type",
    "b"."id" AS "txn_id",
    "b"."qb_txn_id",
    "b"."date" AS "txn_date",
    "b"."vendor_name",
    "b"."number" AS "ref_number",
    "l"."job_id",
    "l"."qb_customer_full_name",
    "l"."line_type",
    COALESCE("l"."item_name", "l"."qb_account_name") AS "item_or_account",
    "l"."description",
    "l"."quantity",
    "l"."unit_price",
    "l"."amount",
    "l"."billable_status",
    "l"."class_name"
   FROM ("public"."acct_bill_lines" "l"
     JOIN "public"."acct_bills" "b" ON (("b"."id" = "l"."bill_id")))
UNION ALL
 SELECT "l"."id" AS "line_id",
    'check'::"text" AS "source_type",
    "c"."id" AS "txn_id",
    "c"."qb_txn_id",
    "c"."date" AS "txn_date",
    "c"."payee_name" AS "vendor_name",
    "c"."ref_number",
    "l"."job_id",
    "l"."qb_customer_full_name",
    "l"."line_type",
    COALESCE("l"."item_name", "l"."qb_account_name") AS "item_or_account",
    "l"."description",
    "l"."quantity",
    "l"."unit_price",
    "l"."amount",
    "l"."billable_status",
    "l"."class_name"
   FROM ("public"."acct_check_lines" "l"
     JOIN "public"."acct_checks" "c" ON (("c"."id" = "l"."check_id")))
UNION ALL
 SELECT "l"."id" AS "line_id",
    'credit_card_charge'::"text" AS "source_type",
    "cc"."id" AS "txn_id",
    "cc"."qb_txn_id",
    "cc"."date" AS "txn_date",
    "cc"."payee_name" AS "vendor_name",
    "cc"."ref_number",
    "l"."job_id",
    "l"."qb_customer_full_name",
    "l"."line_type",
    COALESCE("l"."item_name", "l"."qb_account_name") AS "item_or_account",
    "l"."description",
    "l"."quantity",
    "l"."unit_price",
    "l"."amount",
    "l"."billable_status",
    "l"."class_name"
   FROM ("public"."acct_credit_card_charge_lines" "l"
     JOIN "public"."acct_credit_card_charges" "cc" ON (("cc"."id" = "l"."charge_id")))
UNION ALL
 SELECT "l"."id" AS "line_id",
    'item_receipt'::"text" AS "source_type",
    "ir"."id" AS "txn_id",
    "ir"."qb_txn_id",
    "ir"."date" AS "txn_date",
    "ir"."vendor_name",
    "ir"."ref_number",
    "l"."job_id",
    "l"."qb_customer_full_name",
    "l"."line_type",
    COALESCE("l"."item_name", "l"."qb_account_name") AS "item_or_account",
    "l"."description",
    "l"."quantity",
    "l"."unit_price",
    "l"."amount",
    "l"."billable_status",
    "l"."class_name"
   FROM ("public"."acct_item_receipt_lines" "l"
     JOIN "public"."acct_item_receipts" "ir" ON (("ir"."id" = "l"."receipt_id")));


ALTER VIEW "public"."v_job_material_costs" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_qb_sync_state" AS
 SELECT "entity",
    "last_synced_at",
    "age"("now"(), "last_synced_at") AS "time_since_last_sync",
    "last_session_ticket",
    "updated_at"
   FROM "public"."qb_sync_state"
  ORDER BY "entity";


ALTER VIEW "public"."v_qb_sync_state" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."vendor_catalogs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "vendor_id" "uuid" NOT NULL,
    "year" integer NOT NULL,
    "file_path" "text" NOT NULL,
    "file_name" "text",
    "uploaded_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."vendor_catalogs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."vendor_invoice_lines" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "invoice_id" "uuid" NOT NULL,
    "description" "text" NOT NULL,
    "qty" numeric,
    "unit" "text",
    "unit_price" numeric,
    "amount" numeric,
    "master_price" numeric,
    "variance_pct" numeric,
    "matched" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "material_id" "uuid"
);


ALTER TABLE "public"."vendor_invoice_lines" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."vendor_invoices" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "job_id" "uuid",
    "vendor_id" "uuid",
    "invoice_no" "text",
    "invoice_date" "date",
    "file_url" "text",
    "subtotal" numeric,
    "total" numeric,
    "status" "text" DEFAULT 'pending_review'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_by" "uuid"
);


ALTER TABLE "public"."vendor_invoices" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."view_rates_hidden" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "module_type" "text" NOT NULL,
    "hide_key" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."view_rates_hidden" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."website_leads" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "website_id" "uuid",
    "page_slug" "text",
    "name" "text",
    "email" "text",
    "phone" "text",
    "message" "text",
    "raw" "jsonb",
    "client_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."website_leads" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."website_pages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "website_id" "uuid" NOT NULL,
    "title" "text" DEFAULT 'Page'::"text" NOT NULL,
    "slug" "text" DEFAULT 'home'::"text" NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "is_home" boolean DEFAULT false NOT NULL,
    "show_in_nav" boolean DEFAULT true NOT NULL,
    "data" "jsonb" DEFAULT '{"root": {}, "zones": {}, "content": []}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."website_pages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."websites" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "slug" "text" NOT NULL,
    "name" "text" DEFAULT 'My Website'::"text" NOT NULL,
    "published" boolean DEFAULT false NOT NULL,
    "theme" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "settings" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "funnel_id" "uuid",
    "created_by_email" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."websites" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."work_orders" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "job_id" "uuid" NOT NULL,
    "estimate_module_id" "uuid",
    "project_name" "text",
    "module_type" "text" NOT NULL,
    "is_subcontractor" boolean DEFAULT false NOT NULL,
    "man_days" numeric DEFAULT 0,
    "labor_hours" numeric DEFAULT 0,
    "material_cost" numeric DEFAULT 0,
    "sub_cost" numeric DEFAULT 0,
    "labor_cost" numeric DEFAULT 0,
    "labor_burden" numeric DEFAULT 0,
    "total_price" numeric DEFAULT 0,
    "notes" "text",
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "crew_type" "text",
    "is_manual" boolean DEFAULT false NOT NULL,
    "edited_from_estimate" boolean DEFAULT false NOT NULL,
    "scheduled_crew_id" "uuid",
    "scheduled_sub_id" "uuid",
    "source_change_order_id" "uuid",
    "tenant_id" "uuid" NOT NULL,
    CONSTRAINT "work_orders_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'in_progress'::"text", 'complete'::"text"])))
);


ALTER TABLE "public"."work_orders" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."workday_exceptions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "type" "text" NOT NULL,
    "day_of_week" integer,
    "exception_date" "date",
    "label" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "exception_date_end" "date",
    "tenant_id" "uuid" NOT NULL,
    CONSTRAINT "workday_exceptions_day_of_week_check" CHECK ((("day_of_week" >= 0) AND ("day_of_week" <= 6))),
    CONSTRAINT "workday_exceptions_type_check" CHECK (("type" = ANY (ARRAY['day_of_week'::"text", 'specific_date'::"text"])))
);


ALTER TABLE "public"."workday_exceptions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."workflow_types" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "objects" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."workflow_types" OWNER TO "postgres";


ALTER TABLE ONLY "public"."ghl_sync_log" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."ghl_sync_log_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."stat_groups" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."stat_groups_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."statistic_values" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."statistic_values_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."statistics" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."statistics_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."acct_accounts"
    ADD CONSTRAINT "acct_accounts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."acct_accounts"
    ADD CONSTRAINT "acct_accounts_qb_list_id_uq" UNIQUE ("qb_list_id");



ALTER TABLE ONLY "public"."acct_bank_accounts"
    ADD CONSTRAINT "acct_bank_accounts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."acct_bank_transactions"
    ADD CONSTRAINT "acct_bank_transactions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."acct_bill_lines"
    ADD CONSTRAINT "acct_bill_lines_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."acct_bill_lines"
    ADD CONSTRAINT "acct_bill_lines_qb_line_id_uq" UNIQUE ("qb_line_id");



ALTER TABLE ONLY "public"."acct_bills"
    ADD CONSTRAINT "acct_bills_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."acct_bills"
    ADD CONSTRAINT "acct_bills_qb_txn_id_uq" UNIQUE ("qb_txn_id");



ALTER TABLE ONLY "public"."acct_credit_card_charge_lines"
    ADD CONSTRAINT "acct_cc_lines_qb_line_id_uq" UNIQUE ("qb_line_id");



ALTER TABLE ONLY "public"."acct_check_lines"
    ADD CONSTRAINT "acct_check_lines_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."acct_check_lines"
    ADD CONSTRAINT "acct_check_lines_qb_line_id_uq" UNIQUE ("qb_line_id");



ALTER TABLE ONLY "public"."acct_checks"
    ADD CONSTRAINT "acct_checks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."acct_checks"
    ADD CONSTRAINT "acct_checks_qb_txn_id_uq" UNIQUE ("qb_txn_id");



ALTER TABLE ONLY "public"."acct_credit_card_charge_lines"
    ADD CONSTRAINT "acct_credit_card_charge_lines_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."acct_credit_card_charges"
    ADD CONSTRAINT "acct_credit_card_charges_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."acct_credit_card_charges"
    ADD CONSTRAINT "acct_credit_card_charges_qb_txn_id_uq" UNIQUE ("qb_txn_id");



ALTER TABLE ONLY "public"."acct_invoice_lines"
    ADD CONSTRAINT "acct_invoice_lines_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."acct_invoices"
    ADD CONSTRAINT "acct_invoices_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."acct_item_receipt_lines"
    ADD CONSTRAINT "acct_ir_lines_qb_line_id_uq" UNIQUE ("qb_line_id");



ALTER TABLE ONLY "public"."acct_item_receipt_lines"
    ADD CONSTRAINT "acct_item_receipt_lines_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."acct_item_receipts"
    ADD CONSTRAINT "acct_item_receipts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."acct_item_receipts"
    ADD CONSTRAINT "acct_item_receipts_qb_txn_id_uq" UNIQUE ("qb_txn_id");



ALTER TABLE ONLY "public"."acct_journal_entries"
    ADD CONSTRAINT "acct_journal_entries_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."acct_journal_entry_lines"
    ADD CONSTRAINT "acct_journal_entry_lines_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."acct_journal_lines"
    ADD CONSTRAINT "acct_journal_lines_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."acct_payments"
    ADD CONSTRAINT "acct_payments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."actual_entries"
    ADD CONSTRAINT "actual_entries_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."agent_conversations"
    ADD CONSTRAINT "agent_conversations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."agent_message_attachments"
    ADD CONSTRAINT "agent_message_attachments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."agent_messages"
    ADD CONSTRAINT "agent_messages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."agent_tool_calls"
    ADD CONSTRAINT "agent_tool_calls_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."agent_user_preferences"
    ADD CONSTRAINT "agent_user_preferences_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."applicants"
    ADD CONSTRAINT "applicants_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."basic_labor_rates"
    ADD CONSTRAINT "basic_labor_rates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."bids"
    ADD CONSTRAINT "bids_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."billing_payments"
    ADD CONSTRAINT "billing_payments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."cad_drawings"
    ADD CONSTRAINT "cad_drawings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."cancellation_feedback"
    ADD CONSTRAINT "cancellation_feedback_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."category"
    ADD CONSTRAINT "category_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."category"
    ADD CONSTRAINT "category_tenant_id_code_key" UNIQUE ("tenant_id", "code");



ALTER TABLE ONLY "public"."change_orders"
    ADD CONSTRAINT "change_orders_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."client_payment_methods"
    ADD CONSTRAINT "client_payment_methods_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."client_portals"
    ADD CONSTRAINT "client_portals_auth_user_id_key" UNIQUE ("auth_user_id");



ALTER TABLE ONLY "public"."client_portals"
    ADD CONSTRAINT "client_portals_client_id_key" UNIQUE ("client_id");



ALTER TABLE ONLY "public"."client_portals"
    ADD CONSTRAINT "client_portals_invite_token_key" UNIQUE ("invite_token");



ALTER TABLE ONLY "public"."client_portals"
    ADD CONSTRAINT "client_portals_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."clients"
    ADD CONSTRAINT "clients_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."code_changes"
    ADD CONSTRAINT "code_changes_commit_hash_key" UNIQUE ("commit_hash");



ALTER TABLE ONLY "public"."code_changes"
    ADD CONSTRAINT "code_changes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."collection_financial"
    ADD CONSTRAINT "collection_financial_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."collection_payables"
    ADD CONSTRAINT "collection_payables_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."collection_rows"
    ADD CONSTRAINT "collection_rows_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."collection_weeks"
    ADD CONSTRAINT "collection_weeks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."collections"
    ADD CONSTRAINT "collections_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."companies"
    ADD CONSTRAINT "companies_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."company_communications"
    ADD CONSTRAINT "company_communications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."company_settings"
    ADD CONSTRAINT "company_settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."contact_communications"
    ADD CONSTRAINT "contact_communications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."contacts"
    ADD CONSTRAINT "contacts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."crew_types"
    ADD CONSTRAINT "crew_types_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."crews"
    ADD CONSTRAINT "crews_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."daily_log_photos"
    ADD CONSTRAINT "daily_log_photos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."daily_logs"
    ADD CONSTRAINT "daily_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."dashboard_appreciations"
    ADD CONSTRAINT "dashboard_appreciations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."dashboard_appreciations"
    ADD CONSTRAINT "dashboard_appreciations_user_id_entry_date_key" UNIQUE ("user_id", "entry_date");



ALTER TABLE ONLY "public"."dashboard_preferences"
    ADD CONSTRAINT "dashboard_preferences_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."design_annotations"
    ADD CONSTRAINT "design_annotations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."design_files"
    ADD CONSTRAINT "design_files_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."design_projects"
    ADD CONSTRAINT "design_projects_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."design_takeoff_items"
    ADD CONSTRAINT "design_takeoff_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."edoc_documents"
    ADD CONSTRAINT "edoc_documents_access_token_key" UNIQUE ("access_token");



ALTER TABLE ONLY "public"."edoc_documents"
    ADD CONSTRAINT "edoc_documents_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."edoc_templates"
    ADD CONSTRAINT "edoc_templates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."edoc_workflows"
    ADD CONSTRAINT "edoc_workflows_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."employee_certifications"
    ADD CONSTRAINT "employee_certifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."employee_documents"
    ADD CONSTRAINT "employee_documents_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."employee_files"
    ADD CONSTRAINT "employee_files_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."employee_group_members"
    ADD CONSTRAINT "employee_group_members_pkey" PRIMARY KEY ("group_id", "employee_id");



ALTER TABLE ONLY "public"."employee_groups"
    ADD CONSTRAINT "employee_groups_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."employee_positions"
    ADD CONSTRAINT "employee_positions_pkey" PRIMARY KEY ("employee_id", "position_id");



ALTER TABLE ONLY "public"."employees"
    ADD CONSTRAINT "employees_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."estimate_modules"
    ADD CONSTRAINT "estimate_modules_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."estimate_projects"
    ADD CONSTRAINT "estimate_projects_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."estimates"
    ADD CONSTRAINT "estimates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ext_formulas_condition_access"
    ADD CONSTRAINT "ext_formulas_condition_access_pkey" PRIMARY KEY ("condition_id", "user_id");



ALTER TABLE ONLY "public"."ext_formulas_condition_steps"
    ADD CONSTRAINT "ext_formulas_condition_steps_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ext_formulas_conditions"
    ADD CONSTRAINT "ext_formulas_conditions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ext_formulas_formulas"
    ADD CONSTRAINT "ext_formulas_formulas_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ext_formulas_steps"
    ADD CONSTRAINT "ext_formulas_steps_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ext_formulas_sub_conditions"
    ADD CONSTRAINT "ext_formulas_sub_conditions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ext_plans"
    ADD CONSTRAINT "ext_plans_pkey" PRIMARY KEY ("extension_id");



ALTER TABLE ONLY "public"."feature_request_attachments"
    ADD CONSTRAINT "feature_request_attachments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."feature_requests"
    ADD CONSTRAINT "feature_requests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."funnel_cards"
    ADD CONSTRAINT "funnel_cards_funnel_id_client_id_key" UNIQUE ("funnel_id", "client_id");



ALTER TABLE ONLY "public"."funnel_cards"
    ADD CONSTRAINT "funnel_cards_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."funnel_stages"
    ADD CONSTRAINT "funnel_stages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."funnels"
    ADD CONSTRAINT "funnels_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."general_category"
    ADD CONSTRAINT "general_category_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."general_category"
    ADD CONSTRAINT "general_category_tenant_id_code_key" UNIQUE ("tenant_id", "code");



ALTER TABLE ONLY "public"."general_subcategory"
    ADD CONSTRAINT "general_subcategory_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."general_subcategory"
    ADD CONSTRAINT "general_subcategory_tenant_id_category_id_code_key" UNIQUE ("tenant_id", "category_id", "code");



ALTER TABLE ONLY "public"."ghl_connections"
    ADD CONSTRAINT "ghl_connections_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ghl_opportunities"
    ADD CONSTRAINT "ghl_opportunities_ghl_opportunity_id_key" UNIQUE ("ghl_opportunity_id");



ALTER TABLE ONLY "public"."ghl_opportunities"
    ADD CONSTRAINT "ghl_opportunities_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ghl_sync_log"
    ADD CONSTRAINT "ghl_sync_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ghl_sync_state"
    ADD CONSTRAINT "ghl_sync_state_pkey" PRIMARY KEY ("object_type");



ALTER TABLE ONLY "public"."help_doc_categories"
    ADD CONSTRAINT "help_doc_categories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."help_docs"
    ADD CONSTRAINT "help_docs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."help_video_categories"
    ADD CONSTRAINT "help_video_categories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."help_videos"
    ADD CONSTRAINT "help_videos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."hr_review_forms"
    ADD CONSTRAINT "hr_review_forms_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."hr_reviews"
    ADD CONSTRAINT "hr_reviews_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."job_expenses"
    ADD CONSTRAINT "job_expenses_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."job_files"
    ADD CONSTRAINT "job_files_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."job_folders"
    ADD CONSTRAINT "job_folders_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."job_invoice_lines"
    ADD CONSTRAINT "job_invoice_lines_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."job_invoice_payments"
    ADD CONSTRAINT "job_invoice_payments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."job_invoices"
    ADD CONSTRAINT "job_invoices_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."job_stages"
    ADD CONSTRAINT "job_stages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."job_tasks"
    ADD CONSTRAINT "job_tasks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."job_templates"
    ADD CONSTRAINT "job_templates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."jobs"
    ADD CONSTRAINT "jobs_bt_job_id_unique" UNIQUE ("bt_job_id");



ALTER TABLE ONLY "public"."jobs"
    ADD CONSTRAINT "jobs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."labor_category"
    ADD CONSTRAINT "labor_category_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."labor_category"
    ADD CONSTRAINT "labor_category_tenant_id_code_key" UNIQUE ("tenant_id", "code");



ALTER TABLE ONLY "public"."labor_rates"
    ADD CONSTRAINT "labor_rates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."labor_subcategory"
    ADD CONSTRAINT "labor_subcategory_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."labor_subcategory"
    ADD CONSTRAINT "labor_subcategory_tenant_id_category_id_code_key" UNIQUE ("tenant_id", "category_id", "code");



ALTER TABLE ONLY "public"."lms_actions"
    ADD CONSTRAINT "lms_actions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."lms_assignments"
    ADD CONSTRAINT "lms_assignments_course_id_employee_id_key" UNIQUE ("course_id", "employee_id");



ALTER TABLE ONLY "public"."lms_assignments"
    ADD CONSTRAINT "lms_assignments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."lms_categories"
    ADD CONSTRAINT "lms_categories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."lms_courses"
    ADD CONSTRAINT "lms_courses_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."lms_learning_drills"
    ADD CONSTRAINT "lms_learning_drills_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."lms_quiz_attempts"
    ADD CONSTRAINT "lms_quiz_attempts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."lms_quizzes"
    ADD CONSTRAINT "lms_quizzes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."lms_read_items"
    ADD CONSTRAINT "lms_read_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."lms_step_completions"
    ADD CONSTRAINT "lms_step_completions_assignment_id_step_id_key" UNIQUE ("assignment_id", "step_id");



ALTER TABLE ONLY "public"."lms_step_completions"
    ADD CONSTRAINT "lms_step_completions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."lms_steps"
    ADD CONSTRAINT "lms_steps_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."lms_tests"
    ADD CONSTRAINT "lms_tests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."lms_videos"
    ADD CONSTRAINT "lms_videos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."master_equipment"
    ADD CONSTRAINT "master_equipment_equipment_id_key" UNIQUE ("equipment_id");



ALTER TABLE ONLY "public"."master_equipment"
    ADD CONSTRAINT "master_equipment_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."master_sub_crews"
    ADD CONSTRAINT "master_sub_crews_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."material_categories"
    ADD CONSTRAINT "material_categories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."material"
    ADD CONSTRAINT "material_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."material_price"
    ADD CONSTRAINT "material_price_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."material"
    ADD CONSTRAINT "material_tenant_id_category_id_subcategory_id_description_key" UNIQUE ("tenant_id", "category_id", "subcategory_id", "description");



ALTER TABLE ONLY "public"."misc_rates"
    ADD CONSTRAINT "misc_rates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."module_category_map"
    ADD CONSTRAINT "module_category_map_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."module_category_map"
    ADD CONSTRAINT "module_category_map_tenant_id_module_type_category_name_key" UNIQUE ("tenant_id", "module_type", "category_name");



ALTER TABLE ONLY "public"."module_equipment_map"
    ADD CONSTRAINT "module_equipment_map_module_type_equipment_id_key" UNIQUE ("module_type", "equipment_id");



ALTER TABLE ONLY "public"."module_equipment_map"
    ADD CONSTRAINT "module_equipment_map_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."module_field_equipment_map"
    ADD CONSTRAINT "module_field_equipment_map_module_type_field_key_key" UNIQUE ("module_type", "field_key");



ALTER TABLE ONLY "public"."module_field_equipment_map"
    ADD CONSTRAINT "module_field_equipment_map_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."modules"
    ADD CONSTRAINT "modules_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."org_chart_template_categories"
    ADD CONSTRAINT "org_chart_template_categories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."org_chart_template_subcategories"
    ADD CONSTRAINT "org_chart_template_subcategories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."org_chart_templates"
    ADD CONSTRAINT "org_chart_templates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."org_chart_wizard_feedback"
    ADD CONSTRAINT "org_chart_wizard_feedback_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."org_charts"
    ADD CONSTRAINT "org_charts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."org_edges"
    ADD CONSTRAINT "org_edges_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."org_node_types"
    ADD CONSTRAINT "org_node_types_pkey" PRIMARY KEY ("id");



ALTER TABLE "public"."org_nodes"
    ADD CONSTRAINT "org_nodes_kind_chk" CHECK (("kind" = ANY (ARRAY['custom'::"text", 'position'::"text", 'container'::"text", 'assistant'::"text", 'note'::"text"]))) NOT VALID;



ALTER TABLE ONLY "public"."org_nodes"
    ADD CONSTRAINT "org_nodes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."package_requests"
    ADD CONSTRAINT "package_requests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."packages"
    ADD CONSTRAINT "packages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."paver_prices"
    ADD CONSTRAINT "paver_prices_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pbs_drive_members"
    ADD CONSTRAINT "pbs_drive_members_drive_id_user_id_key" UNIQUE ("drive_id", "user_id");



ALTER TABLE ONLY "public"."pbs_drive_members"
    ADD CONSTRAINT "pbs_drive_members_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pbs_drives"
    ADD CONSTRAINT "pbs_drives_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."plans"
    ADD CONSTRAINT "plans_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."position_courses"
    ADD CONSTRAINT "position_courses_pkey" PRIMARY KEY ("position_id", "course_id");



ALTER TABLE ONLY "public"."positions"
    ADD CONSTRAINT "positions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."price_sheet_imports"
    ADD CONSTRAINT "price_sheet_imports_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."product_type"
    ADD CONSTRAINT "product_type_key_key" UNIQUE ("key");



ALTER TABLE ONLY "public"."product_type"
    ADD CONSTRAINT "product_type_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."projects"
    ADD CONSTRAINT "projects_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."qb_connection"
    ADD CONSTRAINT "qb_connection_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."qb_session"
    ADD CONSTRAINT "qb_session_pkey" PRIMARY KEY ("ticket");



ALTER TABLE ONLY "public"."qb_sync_log"
    ADD CONSTRAINT "qb_sync_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."qb_sync_state"
    ADD CONSTRAINT "qb_sync_state_pkey" PRIMARY KEY ("entity");



ALTER TABLE ONLY "public"."qb_time_tracking"
    ADD CONSTRAINT "qb_time_tracking_pkey" PRIMARY KEY ("txn_id");



ALTER TABLE ONLY "public"."reward_games"
    ADD CONSTRAINT "reward_games_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."reward_rules"
    ADD CONSTRAINT "reward_rules_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."reward_transactions"
    ADD CONSTRAINT "reward_transactions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sales_appointments"
    ADD CONSTRAINT "sales_appointments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sam_counter"
    ADD CONSTRAINT "sam_counter_pkey" PRIMARY KEY ("scope", "key");



ALTER TABLE ONLY "public"."sam_public_usage"
    ADD CONSTRAINT "sam_public_usage_pkey" PRIMARY KEY ("ip", "day");



ALTER TABLE ONLY "public"."schedule_items"
    ADD CONSTRAINT "schedule_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."stat_groups"
    ADD CONSTRAINT "stat_groups_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."stat_import_export_log"
    ADD CONSTRAINT "stat_import_export_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."stat_notes"
    ADD CONSTRAINT "stat_notes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."stat_notes"
    ADD CONSTRAINT "stat_notes_statistic_id_period_date_key" UNIQUE ("statistic_id", "period_date");



ALTER TABLE ONLY "public"."stat_reminder_log"
    ADD CONSTRAINT "stat_reminder_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."stat_reminder_log"
    ADD CONSTRAINT "stat_reminder_log_statistic_id_period_date_key" UNIQUE ("statistic_id", "period_date");



ALTER TABLE ONLY "public"."stat_reminders"
    ADD CONSTRAINT "stat_reminders_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."stat_reminders"
    ADD CONSTRAINT "stat_reminders_statistic_id_key" UNIQUE ("statistic_id");



ALTER TABLE ONLY "public"."stat_sources"
    ADD CONSTRAINT "stat_sources_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."stat_sources"
    ADD CONSTRAINT "stat_sources_tenant_id_key_key" UNIQUE ("tenant_id", "key");



ALTER TABLE ONLY "public"."statistic_shares"
    ADD CONSTRAINT "statistic_shares_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."statistic_shares"
    ADD CONSTRAINT "statistic_shares_statistic_id_user_id_key" UNIQUE ("statistic_id", "user_id");



ALTER TABLE ONLY "public"."statistic_values"
    ADD CONSTRAINT "statistic_values_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."statistic_values"
    ADD CONSTRAINT "statistic_values_statistic_id_period_date_key" UNIQUE ("statistic_id", "period_date");



ALTER TABLE ONLY "public"."statistics"
    ADD CONSTRAINT "statistics_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sub_vendor_contracts"
    ADD CONSTRAINT "sub_vendor_contracts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sub_vendor_quotes"
    ADD CONSTRAINT "sub_vendor_quotes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."subcategory"
    ADD CONSTRAINT "subcategory_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."subcategory"
    ADD CONSTRAINT "subcategory_tenant_id_category_id_code_key" UNIQUE ("tenant_id", "category_id", "code");



ALTER TABLE ONLY "public"."subcontractor_category"
    ADD CONSTRAINT "subcontractor_category_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."subcontractor_category"
    ADD CONSTRAINT "subcontractor_category_tenant_id_code_key" UNIQUE ("tenant_id", "code");



ALTER TABLE ONLY "public"."subcontractor_rates"
    ADD CONSTRAINT "subcontractor_rates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."subcontractor_subcategory"
    ADD CONSTRAINT "subcontractor_subcategory_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."subcontractor_subcategory"
    ADD CONSTRAINT "subcontractor_subcategory_tenant_id_category_id_code_key" UNIQUE ("tenant_id", "category_id", "code");



ALTER TABLE ONLY "public"."subs_vendors"
    ADD CONSTRAINT "subs_vendors_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."task_categories"
    ADD CONSTRAINT "task_categories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."task_descriptions"
    ADD CONSTRAINT "task_descriptions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."template_folders"
    ADD CONSTRAINT "template_folders_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."template_tasks"
    ADD CONSTRAINT "template_tasks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tenant_extensions"
    ADD CONSTRAINT "tenant_extensions_pkey" PRIMARY KEY ("tenant_id", "extension_id");



ALTER TABLE ONLY "public"."tenant_packages"
    ADD CONSTRAINT "tenant_packages_pkey" PRIMARY KEY ("tenant_id", "package_id");



ALTER TABLE ONLY "public"."tenant_payment_connections"
    ADD CONSTRAINT "tenant_payment_connections_pkey" PRIMARY KEY ("tenant_id");



ALTER TABLE ONLY "public"."tenant_payment_connections"
    ADD CONSTRAINT "tenant_payment_connections_registration_ref_key" UNIQUE ("registration_ref");



ALTER TABLE ONLY "public"."tenants"
    ADD CONSTRAINT "tenants_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."time_clock_breaks"
    ADD CONSTRAINT "time_clock_breaks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."time_clock_permissions"
    ADD CONSTRAINT "time_clock_permissions_employee_id_key" UNIQUE ("employee_id");



ALTER TABLE ONLY "public"."time_clock_permissions"
    ADD CONSTRAINT "time_clock_permissions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."time_entries"
    ADD CONSTRAINT "time_entries_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_permissions"
    ADD CONSTRAINT "user_permissions_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."vendor_catalogs"
    ADD CONSTRAINT "vendor_catalogs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."vendor_invoice_lines"
    ADD CONSTRAINT "vendor_invoice_lines_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."vendor_invoices"
    ADD CONSTRAINT "vendor_invoices_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."view_rates_hidden"
    ADD CONSTRAINT "view_rates_hidden_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."view_rates_hidden"
    ADD CONSTRAINT "view_rates_hidden_tenant_id_module_type_hide_key_key" UNIQUE ("tenant_id", "module_type", "hide_key");



ALTER TABLE ONLY "public"."website_leads"
    ADD CONSTRAINT "website_leads_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."website_pages"
    ADD CONSTRAINT "website_pages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."websites"
    ADD CONSTRAINT "websites_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."work_orders"
    ADD CONSTRAINT "work_orders_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."workday_exceptions"
    ADD CONSTRAINT "workday_exceptions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."workflow_types"
    ADD CONSTRAINT "workflow_types_pkey" PRIMARY KEY ("id");



CREATE INDEX "acct_accounts_parent_idx" ON "public"."acct_accounts" USING "btree" ("parent_id") WHERE ("parent_id" IS NOT NULL);



CREATE INDEX "acct_bill_lines_job_id_idx" ON "public"."acct_bill_lines" USING "btree" ("job_id") WHERE ("job_id" IS NOT NULL);



CREATE INDEX "acct_bills_job_idx" ON "public"."acct_bills" USING "btree" ("job_id");



CREATE INDEX "acct_cc_lines_charge_id_idx" ON "public"."acct_credit_card_charge_lines" USING "btree" ("charge_id");



CREATE INDEX "acct_cc_lines_job_id_idx" ON "public"."acct_credit_card_charge_lines" USING "btree" ("job_id") WHERE ("job_id" IS NOT NULL);



CREATE INDEX "acct_check_lines_check_id_idx" ON "public"."acct_check_lines" USING "btree" ("check_id");



CREATE INDEX "acct_check_lines_job_id_idx" ON "public"."acct_check_lines" USING "btree" ("job_id") WHERE ("job_id" IS NOT NULL);



CREATE INDEX "acct_ir_lines_job_id_idx" ON "public"."acct_item_receipt_lines" USING "btree" ("job_id") WHERE ("job_id" IS NOT NULL);



CREATE INDEX "acct_ir_lines_receipt_id_idx" ON "public"."acct_item_receipt_lines" USING "btree" ("receipt_id");



CREATE INDEX "agent_conversations_user_idx" ON "public"."agent_conversations" USING "btree" ("user_id", "updated_at" DESC);



CREATE INDEX "agent_message_attachments_conv_idx" ON "public"."agent_message_attachments" USING "btree" ("conversation_id", "created_at");



CREATE INDEX "agent_message_attachments_msg_idx" ON "public"."agent_message_attachments" USING "btree" ("message_id");



CREATE INDEX "agent_messages_conv_idx" ON "public"."agent_messages" USING "btree" ("conversation_id", "created_at");



CREATE INDEX "agent_tool_calls_conv_idx" ON "public"."agent_tool_calls" USING "btree" ("conversation_id", "created_at");



CREATE INDEX "agent_user_preferences_updated_idx" ON "public"."agent_user_preferences" USING "btree" ("updated_at" DESC);



CREATE INDEX "applicants_status_idx" ON "public"."applicants" USING "btree" ("status");



CREATE UNIQUE INDEX "basic_labor_rates_tenant_id_name_category_idx" ON "public"."basic_labor_rates" USING "btree" ("tenant_id", "name", "category");



CREATE UNIQUE INDEX "basic_labor_rates_tenant_id_ref_key_idx" ON "public"."basic_labor_rates" USING "btree" ("tenant_id", "ref_key");



CREATE UNIQUE INDEX "bids_bt_change_order_id_idx" ON "public"."bids" USING "btree" ("bt_change_order_id") WHERE ("bt_change_order_id" IS NOT NULL);



CREATE INDEX "bids_job_co_idx" ON "public"."bids" USING "btree" ("linked_job_id", "custom_co_id");



CREATE INDEX "bids_linked_job_idx" ON "public"."bids" USING "btree" ("linked_job_id");



CREATE INDEX "bids_record_type_idx" ON "public"."bids" USING "btree" ("record_type");



CREATE INDEX "billing_payments_tenant_idx" ON "public"."billing_payments" USING "btree" ("tenant_id", "occurred_at" DESC);



CREATE INDEX "cad_drawings_project_idx" ON "public"."cad_drawings" USING "btree" ("design_project_id");



CREATE INDEX "cad_drawings_status_idx" ON "public"."cad_drawings" USING "btree" ("status");



CREATE INDEX "cad_drawings_updated_at_idx" ON "public"."cad_drawings" USING "btree" ("updated_at" DESC);



CREATE INDEX "client_payment_methods_client_idx" ON "public"."client_payment_methods" USING "btree" ("client_id");



CREATE INDEX "code_changes_committed_idx" ON "public"."code_changes" USING "btree" ("committed_at" DESC);



CREATE INDEX "coll_fin_week_idx" ON "public"."collection_financial" USING "btree" ("week_id", "section");



CREATE INDEX "coll_pay_week_idx" ON "public"."collection_payables" USING "btree" ("week_id", "category");



CREATE INDEX "coll_rows_week_idx" ON "public"."collection_rows" USING "btree" ("week_id", "section");



CREATE UNIQUE INDEX "collection_weeks_tenant_week_ending_key" ON "public"."collection_weeks" USING "btree" ("tenant_id", "week_ending");



CREATE INDEX "company_communications_company_id_idx" ON "public"."company_communications" USING "btree" ("company_id");



CREATE INDEX "contact_comms_contact_idx" ON "public"."contact_communications" USING "btree" ("contact_id");



CREATE UNIQUE INDEX "contact_communications_ghl_note_id_key" ON "public"."contact_communications" USING "btree" ("ghl_note_id") WHERE ("ghl_note_id" IS NOT NULL);



CREATE INDEX "contacts_contact_type_idx" ON "public"."contacts" USING "btree" ("contact_type");



CREATE UNIQUE INDEX "contacts_ghl_contact_id_key" ON "public"."contacts" USING "btree" ("ghl_contact_id") WHERE ("ghl_contact_id" IS NOT NULL);



CREATE INDEX "contacts_how_did_you_hear_idx" ON "public"."contacts" USING "btree" ("how_did_you_hear");



CREATE INDEX "contacts_last_name_idx" ON "public"."contacts" USING "btree" ("last_name");



CREATE INDEX "contacts_stage_idx" ON "public"."contacts" USING "btree" ("stage");



CREATE UNIQUE INDEX "crew_types_tenant_name_key" ON "public"."crew_types" USING "btree" ("tenant_id", "name");



CREATE UNIQUE INDEX "crews_tenant_label_key" ON "public"."crews" USING "btree" ("tenant_id", "label");



CREATE INDEX "daily_log_photos_log_idx" ON "public"."daily_log_photos" USING "btree" ("log_id");



CREATE UNIQUE INDEX "daily_logs_bt_daily_log_id_idx" ON "public"."daily_logs" USING "btree" ("bt_daily_log_id");



CREATE INDEX "daily_logs_created_by_idx" ON "public"."daily_logs" USING "btree" ("created_by");



CREATE INDEX "daily_logs_date_idx" ON "public"."daily_logs" USING "btree" ("date" DESC);



CREATE INDEX "daily_logs_job_id_idx" ON "public"."daily_logs" USING "btree" ("job_id");



CREATE INDEX "design_annotations_file_idx" ON "public"."design_annotations" USING "btree" ("file_id");



CREATE INDEX "design_annotations_filepage_idx" ON "public"."design_annotations" USING "btree" ("file_id", "page_number");



CREATE INDEX "design_annotations_item_idx" ON "public"."design_annotations" USING "btree" ("item_id");



CREATE INDEX "design_annotations_type_idx" ON "public"."design_annotations" USING "btree" ("type");



CREATE INDEX "design_files_order_idx" ON "public"."design_files" USING "btree" ("project_id", "display_order", "uploaded_at");



CREATE INDEX "design_files_project_idx" ON "public"."design_files" USING "btree" ("project_id");



CREATE INDEX "design_projects_client_idx" ON "public"."design_projects" USING "btree" ("client_id");



CREATE INDEX "design_projects_created_at_idx" ON "public"."design_projects" USING "btree" ("created_at" DESC);



CREATE INDEX "design_projects_status_idx" ON "public"."design_projects" USING "btree" ("status");



CREATE INDEX "design_takeoff_items_file_idx" ON "public"."design_takeoff_items" USING "btree" ("file_id");



CREATE INDEX "design_takeoff_items_filepage_idx" ON "public"."design_takeoff_items" USING "btree" ("file_id", "page_number");



CREATE INDEX "edoc_documents_client_idx" ON "public"."edoc_documents" USING "btree" ("client_id");



CREATE INDEX "edoc_documents_creator_idx" ON "public"."edoc_documents" USING "btree" ("created_by");



CREATE INDEX "edoc_documents_status_idx" ON "public"."edoc_documents" USING "btree" ("status");



CREATE INDEX "edoc_documents_token_idx" ON "public"."edoc_documents" USING "btree" ("access_token");



CREATE INDEX "edoc_workflows_created_idx" ON "public"."edoc_workflows" USING "btree" ("created_at" DESC);



CREATE INDEX "employee_certs_employee_idx" ON "public"."employee_certifications" USING "btree" ("employee_id");



CREATE INDEX "employee_documents_employee_idx" ON "public"."employee_documents" USING "btree" ("employee_id");



CREATE INDEX "employee_files_employee_idx" ON "public"."employee_files" USING "btree" ("employee_id");



CREATE INDEX "employee_files_parent_idx" ON "public"."employee_files" USING "btree" ("parent_id");



CREATE INDEX "employees_status_idx" ON "public"."employees" USING "btree" ("status");



CREATE INDEX "ext_formulas_condition_steps_cond" ON "public"."ext_formulas_condition_steps" USING "btree" ("condition_id");



CREATE UNIQUE INDEX "ext_formulas_conditions_scope_slug" ON "public"."ext_formulas_conditions" USING "btree" (COALESCE("tenant_id", '00000000-0000-0000-0000-000000000000'::"uuid"), "slug");



CREATE INDEX "ext_formulas_formulas_stat" ON "public"."ext_formulas_formulas" USING "btree" ("statistic_id");



CREATE INDEX "ext_formulas_formulas_tenant" ON "public"."ext_formulas_formulas" USING "btree" ("tenant_id");



CREATE INDEX "ext_formulas_steps_formula" ON "public"."ext_formulas_steps" USING "btree" ("formula_id");



CREATE INDEX "feature_request_attachments_fr_idx" ON "public"."feature_request_attachments" USING "btree" ("feature_request_id");



CREATE INDEX "feature_requests_created_idx" ON "public"."feature_requests" USING "btree" ("created_at" DESC);



CREATE INDEX "feature_requests_status_idx" ON "public"."feature_requests" USING "btree" ("status");



CREATE INDEX "feature_requests_user_idx" ON "public"."feature_requests" USING "btree" ("user_id");



CREATE INDEX "funnel_cards_client_idx" ON "public"."funnel_cards" USING "btree" ("client_id");



CREATE INDEX "funnel_cards_funnel_idx" ON "public"."funnel_cards" USING "btree" ("funnel_id");



CREATE INDEX "funnel_cards_stage_idx" ON "public"."funnel_cards" USING "btree" ("stage_id");



CREATE INDEX "funnel_stages_funnel_idx" ON "public"."funnel_stages" USING "btree" ("funnel_id");



CREATE UNIQUE INDEX "ghl_connections_singleton_key" ON "public"."ghl_connections" USING "btree" ("singleton");



CREATE INDEX "ghl_opportunities_contact_id_idx" ON "public"."ghl_opportunities" USING "btree" ("contact_id");



CREATE INDEX "ghl_opportunities_pipeline_stage_idx" ON "public"."ghl_opportunities" USING "btree" ("pipeline_id", "stage_id");



CREATE INDEX "ghl_sync_log_object_type_idx" ON "public"."ghl_sync_log" USING "btree" ("object_type", "ran_at" DESC);



CREATE INDEX "ghl_sync_log_ran_at_idx" ON "public"."ghl_sync_log" USING "btree" ("ran_at" DESC);



CREATE INDEX "help_docs_category_idx" ON "public"."help_docs" USING "btree" ("category_id", "sort_order");



CREATE INDEX "help_videos_category_idx" ON "public"."help_videos" USING "btree" ("category_id", "sort_order");



CREATE INDEX "hr_reviews_employee_idx" ON "public"."hr_reviews" USING "btree" ("employee_id");



CREATE INDEX "idx_acct_je_lines_account" ON "public"."acct_journal_entry_lines" USING "btree" ("account_id");



CREATE INDEX "idx_acct_je_lines_entry" ON "public"."acct_journal_entry_lines" USING "btree" ("entry_id");



CREATE INDEX "idx_acct_je_lines_job" ON "public"."acct_journal_entry_lines" USING "btree" ("job_id") WHERE ("job_id" IS NOT NULL);



CREATE INDEX "idx_acct_journal_entries_date" ON "public"."acct_journal_entries" USING "btree" ("date" DESC);



CREATE INDEX "idx_acct_journal_entries_status" ON "public"."acct_journal_entries" USING "btree" ("status");



CREATE INDEX "idx_client_portals_auth_user" ON "public"."client_portals" USING "btree" ("auth_user_id");



CREATE INDEX "idx_client_portals_token" ON "public"."client_portals" USING "btree" ("invite_token");



CREATE INDEX "idx_clients_consultant_employee" ON "public"."clients" USING "btree" ("consultant_employee_id");



CREATE INDEX "idx_employee_positions_position" ON "public"."employee_positions" USING "btree" ("position_id");



CREATE INDEX "idx_estimates_parent" ON "public"."estimates" USING "btree" ("parent_estimate_id");



CREATE INDEX "idx_general_subcategory_category" ON "public"."general_subcategory" USING "btree" ("category_id");



CREATE INDEX "idx_je_job" ON "public"."job_expenses" USING "btree" ("job_id", "expense_date" DESC);



CREATE INDEX "idx_je_qb" ON "public"."job_expenses" USING "btree" ("qb_sync_status");



CREATE UNIQUE INDEX "idx_jip_bt" ON "public"."job_invoice_payments" USING "btree" ("bt_payment_id") WHERE ("bt_payment_id" IS NOT NULL);



CREATE INDEX "idx_jip_invoice" ON "public"."job_invoice_payments" USING "btree" ("invoice_id");



CREATE INDEX "idx_jip_job" ON "public"."job_invoice_payments" USING "btree" ("job_id");



CREATE INDEX "idx_job_folders_parent_folder_id" ON "public"."job_folders" USING "btree" ("parent_folder_id");



CREATE INDEX "idx_job_invoice_lines_invoice" ON "public"."job_invoice_lines" USING "btree" ("invoice_id");



CREATE INDEX "idx_job_invoice_lines_module" ON "public"."job_invoice_lines" USING "btree" ("module_id");



CREATE UNIQUE INDEX "idx_job_invoices_bt" ON "public"."job_invoices" USING "btree" ("bt_invoice_id") WHERE ("bt_invoice_id" IS NOT NULL);



CREATE INDEX "idx_job_invoices_job" ON "public"."job_invoices" USING "btree" ("job_id");



CREATE INDEX "idx_jobs_responsible_employee" ON "public"."jobs" USING "btree" ("responsible_employee_id");



CREATE INDEX "idx_labor_subcategory_category" ON "public"."labor_subcategory" USING "btree" ("category_id");



CREATE INDEX "idx_material_price_mat" ON "public"."material_price" USING "btree" ("material_id");



CREATE INDEX "idx_material_subcat" ON "public"."material" USING "btree" ("subcategory_id");



CREATE INDEX "idx_psi_vendor" ON "public"."price_sheet_imports" USING "btree" ("vendor_id", "effective_date" DESC);



CREATE INDEX "idx_sub_subcategory_category" ON "public"."subcontractor_subcategory" USING "btree" ("category_id");



CREATE INDEX "idx_subcategory_category" ON "public"."subcategory" USING "btree" ("category_id");



CREATE INDEX "idx_subs_vendors_is_lead" ON "public"."subs_vendors" USING "btree" ("is_lead");



CREATE INDEX "idx_vi_job" ON "public"."vendor_invoices" USING "btree" ("job_id", "invoice_date" DESC);



CREATE INDEX "idx_vil_invoice" ON "public"."vendor_invoice_lines" USING "btree" ("invoice_id");



CREATE INDEX "job_files_bid_idx" ON "public"."job_files" USING "btree" ("bid_id");



CREATE UNIQUE INDEX "job_files_bt_dedup_idx" ON "public"."job_files" USING "btree" ("job_id", "bt_file_id") WHERE ("bt_file_id" IS NOT NULL);



CREATE INDEX "job_files_file_category_idx" ON "public"."job_files" USING "btree" ("file_category");



CREATE INDEX "job_files_folder_id_idx" ON "public"."job_files" USING "btree" ("folder_id");



CREATE INDEX "job_files_invoice_id_idx" ON "public"."job_files" USING "btree" ("invoice_id");



CREATE INDEX "job_files_job_folder_idx" ON "public"."job_files" USING "btree" ("job_id", "folder_path");



CREATE INDEX "job_files_job_id_idx" ON "public"."job_files" USING "btree" ("job_id");



CREATE INDEX "job_files_source_idx" ON "public"."job_files" USING "btree" ("source");



CREATE INDEX "job_folders_job_id_idx" ON "public"."job_folders" USING "btree" ("job_id");



CREATE INDEX "job_folders_source_idx" ON "public"."job_folders" USING "btree" ("source");



CREATE INDEX "job_folders_type_idx" ON "public"."job_folders" USING "btree" ("folder_type");



CREATE INDEX "job_invoice_payments_job_id_idx" ON "public"."job_invoice_payments" USING "btree" ("job_id");



CREATE INDEX "job_invoice_payments_payment_date_idx" ON "public"."job_invoice_payments" USING "btree" ("payment_date" DESC);



CREATE INDEX "job_invoices_created_at_idx" ON "public"."job_invoices" USING "btree" ("created_at" DESC);



CREATE INDEX "job_invoices_job_id_idx" ON "public"."job_invoices" USING "btree" ("job_id");



CREATE INDEX "job_tasks_assignee_idx" ON "public"."job_tasks" USING "btree" ("assignee_id");



CREATE UNIQUE INDEX "job_tasks_bt_todo_id_idx" ON "public"."job_tasks" USING "btree" ("bt_todo_id") WHERE ("bt_todo_id" IS NOT NULL);



CREATE INDEX "job_tasks_category_idx" ON "public"."job_tasks" USING "btree" ("category_id");



CREATE INDEX "job_tasks_due_date_idx" ON "public"."job_tasks" USING "btree" ("due_date");



CREATE INDEX "job_tasks_job_id_idx" ON "public"."job_tasks" USING "btree" ("job_id");



CREATE INDEX "job_templates_auto_trigger_idx" ON "public"."job_templates" USING "btree" ("auto_trigger");



CREATE INDEX "jobs_client_name_trgm" ON "public"."jobs" USING "gin" ("client_name" "public"."gin_trgm_ops");



CREATE INDEX "jobs_geocode_status_idx" ON "public"."jobs" USING "btree" ("geocode_status");



CREATE INDEX "jobs_latlon_idx" ON "public"."jobs" USING "btree" ("lat", "lon") WHERE ("lat" IS NOT NULL);



CREATE INDEX "jobs_source_idx" ON "public"."jobs" USING "btree" ("source");



CREATE UNIQUE INDEX "labor_rates_ref_key_uidx" ON "public"."labor_rates" USING "btree" ("tenant_id", "ref_key");



CREATE UNIQUE INDEX "labor_rates_tenant_name_category_key" ON "public"."labor_rates" USING "btree" ("tenant_id", "name", "category");



CREATE INDEX "lms_assignments_employee_idx" ON "public"."lms_assignments" USING "btree" ("employee_id");



CREATE UNIQUE INDEX "lms_categories_tenant_name_key" ON "public"."lms_categories" USING "btree" ("tenant_id", "name");



CREATE INDEX "lms_quiz_attempts_step_idx" ON "public"."lms_quiz_attempts" USING "btree" ("assignment_id", "step_id");



CREATE INDEX "lms_read_items_category_idx" ON "public"."lms_read_items" USING "btree" ("category");



CREATE INDEX "lms_steps_course_idx" ON "public"."lms_steps" USING "btree" ("course_id");



CREATE INDEX "lms_videos_category_idx" ON "public"."lms_videos" USING "btree" ("category");



CREATE UNIQUE INDEX "material_ref_key_uniq" ON "public"."material" USING "btree" ("ref_key");



CREATE UNIQUE INDEX "misc_rates_ref_key_uniq" ON "public"."misc_rates" USING "btree" ("ref_key");



CREATE INDEX "org_chart_template_subcategories_category_idx" ON "public"."org_chart_template_subcategories" USING "btree" ("category_id");



CREATE INDEX "org_chart_templates_category_idx" ON "public"."org_chart_templates" USING "btree" ("category_id");



CREATE INDEX "org_chart_wizard_feedback_created_idx" ON "public"."org_chart_wizard_feedback" USING "btree" ("created_at" DESC);



CREATE INDEX "org_nodes_employee_idx" ON "public"."org_nodes" USING "btree" ("employee_id") WHERE ("employee_id" IS NOT NULL);



CREATE INDEX "org_nodes_parent_container_idx" ON "public"."org_nodes" USING "btree" ("parent_container_id") WHERE ("parent_container_id" IS NOT NULL);



CREATE INDEX "org_nodes_senior_idx" ON "public"."org_nodes" USING "btree" ("senior_node_id") WHERE ("senior_node_id" IS NOT NULL);



CREATE UNIQUE INDEX "profiles_username_unique" ON "public"."profiles" USING "btree" ("lower"("username")) WHERE ("username" IS NOT NULL);



CREATE INDEX "qb_sync_log_created_idx" ON "public"."qb_sync_log" USING "btree" ("created_at" DESC);



CREATE INDEX "qb_sync_log_ticket_idx" ON "public"."qb_sync_log" USING "btree" ("ticket");



CREATE INDEX "qb_time_tracking_date_idx" ON "public"."qb_time_tracking" USING "btree" ("txn_date");



CREATE INDEX "qb_time_tracking_entity_idx" ON "public"."qb_time_tracking" USING "btree" ("entity_list_id");



CREATE INDEX "reward_transactions_created_idx" ON "public"."reward_transactions" USING "btree" ("created_at");



CREATE INDEX "reward_transactions_employee_idx" ON "public"."reward_transactions" USING "btree" ("employee_id");



CREATE INDEX "reward_transactions_job_idx" ON "public"."reward_transactions" USING "btree" ("job_id");



CREATE INDEX "sales_appointments_client_idx" ON "public"."sales_appointments" USING "btree" ("client_id");



CREATE INDEX "sales_appointments_employee_idx" ON "public"."sales_appointments" USING "btree" ("employee_id");



CREATE INDEX "sales_appointments_tenant_start_idx" ON "public"."sales_appointments" USING "btree" ("tenant_id", "starts_at");



CREATE UNIQUE INDEX "schedule_items_bt_id_idx" ON "public"."schedule_items" USING "btree" ("bt_schedule_id") WHERE ("bt_schedule_id" IS NOT NULL);



CREATE INDEX "schedule_items_end_date_idx" ON "public"."schedule_items" USING "btree" ("end_date");



CREATE UNIQUE INDEX "schedule_items_ghl_appointment_id_key" ON "public"."schedule_items" USING "btree" ("ghl_appointment_id") WHERE ("ghl_appointment_id" IS NOT NULL);



CREATE INDEX "schedule_items_job_id_idx" ON "public"."schedule_items" USING "btree" ("job_id");



CREATE INDEX "schedule_items_start_date_idx" ON "public"."schedule_items" USING "btree" ("start_date");



CREATE INDEX "statistic_shares_stat_idx" ON "public"."statistic_shares" USING "btree" ("statistic_id");



CREATE INDEX "statistic_shares_user_idx" ON "public"."statistic_shares" USING "btree" ("user_id");



CREATE INDEX "sub_vendor_contracts_party_idx" ON "public"."sub_vendor_contracts" USING "btree" ("sub_vendor_id");



CREATE INDEX "sub_vendor_quotes_job_idx" ON "public"."sub_vendor_quotes" USING "btree" ("job_id");



CREATE INDEX "sub_vendor_quotes_vendor_idx" ON "public"."sub_vendor_quotes" USING "btree" ("sub_vendor_id");



CREATE INDEX "subs_vendors_company_name_idx" ON "public"."subs_vendors" USING "btree" ("company_name");



CREATE INDEX "subs_vendors_status_idx" ON "public"."subs_vendors" USING "btree" ("status");



CREATE INDEX "subs_vendors_type_idx" ON "public"."subs_vendors" USING "btree" ("type");



CREATE UNIQUE INDEX "task_categories_tenant_name_key" ON "public"."task_categories" USING "btree" ("tenant_id", "name");



CREATE UNIQUE INDEX "task_descriptions_tenant_name_key" ON "public"."task_descriptions" USING "btree" ("tenant_id", "name");



CREATE INDEX "template_folders_template_idx" ON "public"."template_folders" USING "btree" ("template_id");



CREATE INDEX "template_tasks_template_idx" ON "public"."template_tasks" USING "btree" ("template_id");



CREATE INDEX "time_clock_breaks_entry_idx" ON "public"."time_clock_breaks" USING "btree" ("time_entry_id");



CREATE UNIQUE INDEX "time_entries_bt_timecard_idx" ON "public"."time_entries" USING "btree" ("bt_timecard_item_id");



CREATE INDEX "time_entries_date_idx" ON "public"."time_entries" USING "btree" ("date" DESC);



CREATE INDEX "time_entries_employee_idx" ON "public"."time_entries" USING "btree" ("employee_name");



CREATE INDEX "time_entries_job_id_idx" ON "public"."time_entries" USING "btree" ("job_id");



CREATE INDEX "time_entries_needs_review_idx" ON "public"."time_entries" USING "btree" ("date" DESC, "employee_name") WHERE (("clock_in_on_site" IS FALSE) OR ("clock_out_on_site" IS FALSE) OR ("clock_in_no_gps" IS TRUE) OR ("clock_out_no_gps" IS TRUE) OR ("clock_in_override" IS TRUE) OR ("clock_out_override" IS TRUE));



CREATE UNIQUE INDEX "uq_material_price_open" ON "public"."material_price" USING "btree" ("material_id", "vendor_id") WHERE ("effective_end" IS NULL);



CREATE INDEX "vendor_catalogs_vendor_year_idx" ON "public"."vendor_catalogs" USING "btree" ("vendor_id", "year" DESC);



CREATE INDEX "website_leads_tenant_idx" ON "public"."website_leads" USING "btree" ("tenant_id", "created_at");



CREATE UNIQUE INDEX "website_pages_slug_unique" ON "public"."website_pages" USING "btree" ("website_id", "lower"("slug"));



CREATE INDEX "website_pages_website_idx" ON "public"."website_pages" USING "btree" ("website_id", "sort_order");



CREATE UNIQUE INDEX "websites_slug_unique" ON "public"."websites" USING "btree" ("lower"("slug"));



CREATE INDEX "work_orders_job_id_idx" ON "public"."work_orders" USING "btree" ("job_id");



CREATE INDEX "work_orders_scheduled_crew_idx" ON "public"."work_orders" USING "btree" ("scheduled_crew_id");



CREATE INDEX "work_orders_scheduled_sub_idx" ON "public"."work_orders" USING "btree" ("scheduled_sub_id");



CREATE OR REPLACE TRIGGER "agent_messages_touch_conv" AFTER INSERT ON "public"."agent_messages" FOR EACH ROW EXECUTE FUNCTION "public"."touch_agent_conversation"();



CREATE OR REPLACE TRIGGER "agent_user_preferences_touch" BEFORE UPDATE ON "public"."agent_user_preferences" FOR EACH ROW EXECUTE FUNCTION "public"."touch_agent_user_preferences"();



CREATE OR REPLACE TRIGGER "cad_drawings_touch" BEFORE UPDATE ON "public"."cad_drawings" FOR EACH ROW EXECUTE FUNCTION "public"."cad_drawings_touch_updated_at"();



CREATE OR REPLACE TRIGGER "companies_updated_at" BEFORE UPDATE ON "public"."companies" FOR EACH ROW EXECUTE FUNCTION "public"."touch_companies_updated_at"();



CREATE OR REPLACE TRIGGER "contacts_updated_at" BEFORE UPDATE ON "public"."contacts" FOR EACH ROW EXECUTE FUNCTION "public"."update_contacts_updated_at"();



CREATE OR REPLACE TRIGGER "feature_requests_updated_at" BEFORE UPDATE ON "public"."feature_requests" FOR EACH ROW EXECUTE FUNCTION "public"."feature_requests_set_updated_at"();



CREATE OR REPLACE TRIGGER "ghl_connections_set_updated_at" BEFORE UPDATE ON "public"."ghl_connections" FOR EACH ROW EXECUTE FUNCTION "public"."tg_set_updated_at"();



CREATE OR REPLACE TRIGGER "ghl_opportunities_set_updated_at" BEFORE UPDATE ON "public"."ghl_opportunities" FOR EACH ROW EXECUTE FUNCTION "public"."tg_set_updated_at"();



CREATE OR REPLACE TRIGGER "ghl_sync_state_set_updated_at" BEFORE UPDATE ON "public"."ghl_sync_state" FOR EACH ROW EXECUTE FUNCTION "public"."tg_set_updated_at"();



CREATE OR REPLACE TRIGGER "on_profile_created" AFTER INSERT ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."handle_new_profile"();



CREATE OR REPLACE TRIGGER "set_tenant_id" BEFORE INSERT ON "public"."category" FOR EACH ROW EXECUTE FUNCTION "public"."set_tenant_id"();



CREATE OR REPLACE TRIGGER "set_tenant_id" BEFORE INSERT ON "public"."general_category" FOR EACH ROW EXECUTE FUNCTION "public"."set_tenant_id"();



CREATE OR REPLACE TRIGGER "set_tenant_id" BEFORE INSERT ON "public"."general_subcategory" FOR EACH ROW EXECUTE FUNCTION "public"."set_tenant_id"();



CREATE OR REPLACE TRIGGER "set_tenant_id" BEFORE INSERT ON "public"."job_expenses" FOR EACH ROW EXECUTE FUNCTION "public"."set_tenant_id"();



CREATE OR REPLACE TRIGGER "set_tenant_id" BEFORE INSERT ON "public"."labor_category" FOR EACH ROW EXECUTE FUNCTION "public"."set_tenant_id"();



CREATE OR REPLACE TRIGGER "set_tenant_id" BEFORE INSERT ON "public"."labor_subcategory" FOR EACH ROW EXECUTE FUNCTION "public"."set_tenant_id"();



CREATE OR REPLACE TRIGGER "set_tenant_id" BEFORE INSERT ON "public"."material" FOR EACH ROW EXECUTE FUNCTION "public"."set_tenant_id"();



CREATE OR REPLACE TRIGGER "set_tenant_id" BEFORE INSERT ON "public"."material_categories" FOR EACH ROW EXECUTE FUNCTION "public"."set_tenant_id"();



CREATE OR REPLACE TRIGGER "set_tenant_id" BEFORE INSERT ON "public"."material_price" FOR EACH ROW EXECUTE FUNCTION "public"."set_tenant_id"();



CREATE OR REPLACE TRIGGER "set_tenant_id" BEFORE INSERT ON "public"."misc_rates" FOR EACH ROW EXECUTE FUNCTION "public"."set_tenant_id"();



CREATE OR REPLACE TRIGGER "set_tenant_id" BEFORE INSERT ON "public"."module_category_map" FOR EACH ROW EXECUTE FUNCTION "public"."set_tenant_id"();



CREATE OR REPLACE TRIGGER "set_tenant_id" BEFORE INSERT ON "public"."price_sheet_imports" FOR EACH ROW EXECUTE FUNCTION "public"."set_tenant_id"();



CREATE OR REPLACE TRIGGER "set_tenant_id" BEFORE INSERT ON "public"."stat_sources" FOR EACH ROW EXECUTE FUNCTION "public"."set_tenant_id"();



CREATE OR REPLACE TRIGGER "set_tenant_id" BEFORE INSERT ON "public"."subcategory" FOR EACH ROW EXECUTE FUNCTION "public"."set_tenant_id"();



CREATE OR REPLACE TRIGGER "set_tenant_id" BEFORE INSERT ON "public"."subcontractor_category" FOR EACH ROW EXECUTE FUNCTION "public"."set_tenant_id"();



CREATE OR REPLACE TRIGGER "set_tenant_id" BEFORE INSERT ON "public"."subcontractor_subcategory" FOR EACH ROW EXECUTE FUNCTION "public"."set_tenant_id"();



CREATE OR REPLACE TRIGGER "set_tenant_id" BEFORE INSERT ON "public"."vendor_invoice_lines" FOR EACH ROW EXECUTE FUNCTION "public"."set_tenant_id"();



CREATE OR REPLACE TRIGGER "set_tenant_id" BEFORE INSERT ON "public"."vendor_invoices" FOR EACH ROW EXECUTE FUNCTION "public"."set_tenant_id"();



CREATE OR REPLACE TRIGGER "set_tenant_id" BEFORE INSERT ON "public"."view_rates_hidden" FOR EACH ROW EXECUTE FUNCTION "public"."set_tenant_id"();



CREATE OR REPLACE TRIGGER "statistics_updated_at" BEFORE UPDATE ON "public"."statistics" FOR EACH ROW EXECUTE FUNCTION "public"."touch_updated_at"();



CREATE OR REPLACE TRIGGER "trg_assign_invoice_client_seq" BEFORE INSERT ON "public"."job_invoices" FOR EACH ROW EXECUTE FUNCTION "public"."assign_invoice_client_seq"();



CREATE OR REPLACE TRIGGER "trg_client_portals_updated" BEFORE UPDATE ON "public"."client_portals" FOR EACH ROW EXECUTE FUNCTION "public"."cp_set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_job_invoices_updated" BEFORE UPDATE ON "public"."job_invoices" FOR EACH ROW EXECUTE FUNCTION "public"."cp_set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_misc_set_ref_key" BEFORE INSERT ON "public"."misc_rates" FOR EACH ROW EXECUTE FUNCTION "public"."misc_set_ref_key"();



CREATE OR REPLACE TRIGGER "trg_positions_updated_at" BEFORE UPDATE ON "public"."positions" FOR EACH ROW EXECUTE FUNCTION "public"."update_positions_updated_at"();



CREATE OR REPLACE TRIGGER "trg_set_tenant_id" BEFORE INSERT ON "public"."acct_accounts" FOR EACH ROW EXECUTE FUNCTION "public"."set_tenant_id"();



CREATE OR REPLACE TRIGGER "trg_set_tenant_id" BEFORE INSERT ON "public"."acct_bank_accounts" FOR EACH ROW EXECUTE FUNCTION "public"."set_tenant_id"();



CREATE OR REPLACE TRIGGER "trg_set_tenant_id" BEFORE INSERT ON "public"."acct_bank_transactions" FOR EACH ROW EXECUTE FUNCTION "public"."set_tenant_id"();



CREATE OR REPLACE TRIGGER "trg_set_tenant_id" BEFORE INSERT ON "public"."acct_bill_lines" FOR EACH ROW EXECUTE FUNCTION "public"."set_tenant_id"();



CREATE OR REPLACE TRIGGER "trg_set_tenant_id" BEFORE INSERT ON "public"."acct_bills" FOR EACH ROW EXECUTE FUNCTION "public"."set_tenant_id"();



CREATE OR REPLACE TRIGGER "trg_set_tenant_id" BEFORE INSERT ON "public"."acct_check_lines" FOR EACH ROW EXECUTE FUNCTION "public"."set_tenant_id"();



CREATE OR REPLACE TRIGGER "trg_set_tenant_id" BEFORE INSERT ON "public"."acct_checks" FOR EACH ROW EXECUTE FUNCTION "public"."set_tenant_id"();



CREATE OR REPLACE TRIGGER "trg_set_tenant_id" BEFORE INSERT ON "public"."acct_credit_card_charge_lines" FOR EACH ROW EXECUTE FUNCTION "public"."set_tenant_id"();



CREATE OR REPLACE TRIGGER "trg_set_tenant_id" BEFORE INSERT ON "public"."acct_credit_card_charges" FOR EACH ROW EXECUTE FUNCTION "public"."set_tenant_id"();



CREATE OR REPLACE TRIGGER "trg_set_tenant_id" BEFORE INSERT ON "public"."acct_invoice_lines" FOR EACH ROW EXECUTE FUNCTION "public"."set_tenant_id"();



CREATE OR REPLACE TRIGGER "trg_set_tenant_id" BEFORE INSERT ON "public"."acct_invoices" FOR EACH ROW EXECUTE FUNCTION "public"."set_tenant_id"();



CREATE OR REPLACE TRIGGER "trg_set_tenant_id" BEFORE INSERT ON "public"."acct_item_receipt_lines" FOR EACH ROW EXECUTE FUNCTION "public"."set_tenant_id"();



CREATE OR REPLACE TRIGGER "trg_set_tenant_id" BEFORE INSERT ON "public"."acct_item_receipts" FOR EACH ROW EXECUTE FUNCTION "public"."set_tenant_id"();



CREATE OR REPLACE TRIGGER "trg_set_tenant_id" BEFORE INSERT ON "public"."acct_journal_entries" FOR EACH ROW EXECUTE FUNCTION "public"."set_tenant_id"();



CREATE OR REPLACE TRIGGER "trg_set_tenant_id" BEFORE INSERT ON "public"."acct_journal_entry_lines" FOR EACH ROW EXECUTE FUNCTION "public"."set_tenant_id"();



CREATE OR REPLACE TRIGGER "trg_set_tenant_id" BEFORE INSERT ON "public"."acct_journal_lines" FOR EACH ROW EXECUTE FUNCTION "public"."set_tenant_id"();



CREATE OR REPLACE TRIGGER "trg_set_tenant_id" BEFORE INSERT ON "public"."acct_payments" FOR EACH ROW EXECUTE FUNCTION "public"."set_tenant_id"();



CREATE OR REPLACE TRIGGER "trg_set_tenant_id" BEFORE INSERT ON "public"."actual_entries" FOR EACH ROW EXECUTE FUNCTION "public"."set_tenant_id"();



CREATE OR REPLACE TRIGGER "trg_set_tenant_id" BEFORE INSERT ON "public"."agent_conversations" FOR EACH ROW EXECUTE FUNCTION "public"."set_tenant_id"();



CREATE OR REPLACE TRIGGER "trg_set_tenant_id" BEFORE INSERT ON "public"."agent_message_attachments" FOR EACH ROW EXECUTE FUNCTION "public"."set_tenant_id"();



CREATE OR REPLACE TRIGGER "trg_set_tenant_id" BEFORE INSERT ON "public"."agent_messages" FOR EACH ROW EXECUTE FUNCTION "public"."set_tenant_id"();



CREATE OR REPLACE TRIGGER "trg_set_tenant_id" BEFORE INSERT ON "public"."agent_tool_calls" FOR EACH ROW EXECUTE FUNCTION "public"."set_tenant_id"();



CREATE OR REPLACE TRIGGER "trg_set_tenant_id" BEFORE INSERT ON "public"."agent_user_preferences" FOR EACH ROW EXECUTE FUNCTION "public"."set_tenant_id"();



CREATE OR REPLACE TRIGGER "trg_set_tenant_id" BEFORE INSERT ON "public"."applicants" FOR EACH ROW EXECUTE FUNCTION "public"."set_tenant_id"();



CREATE OR REPLACE TRIGGER "trg_set_tenant_id" BEFORE INSERT ON "public"."bids" FOR EACH ROW EXECUTE FUNCTION "public"."set_tenant_id"();



CREATE OR REPLACE TRIGGER "trg_set_tenant_id" BEFORE INSERT ON "public"."billing_payments" FOR EACH ROW EXECUTE FUNCTION "public"."set_tenant_id"();



CREATE OR REPLACE TRIGGER "trg_set_tenant_id" BEFORE INSERT ON "public"."cancellation_feedback" FOR EACH ROW EXECUTE FUNCTION "public"."set_tenant_id"();



CREATE OR REPLACE TRIGGER "trg_set_tenant_id" BEFORE INSERT ON "public"."change_orders" FOR EACH ROW EXECUTE FUNCTION "public"."set_tenant_id"();



CREATE OR REPLACE TRIGGER "trg_set_tenant_id" BEFORE INSERT ON "public"."client_payment_methods" FOR EACH ROW EXECUTE FUNCTION "public"."set_tenant_id"();



CREATE OR REPLACE TRIGGER "trg_set_tenant_id" BEFORE INSERT ON "public"."client_portals" FOR EACH ROW EXECUTE FUNCTION "public"."set_tenant_id"();



CREATE OR REPLACE TRIGGER "trg_set_tenant_id" BEFORE INSERT ON "public"."clients" FOR EACH ROW EXECUTE FUNCTION "public"."set_tenant_id"();



CREATE OR REPLACE TRIGGER "trg_set_tenant_id" BEFORE INSERT ON "public"."collection_financial" FOR EACH ROW EXECUTE FUNCTION "public"."set_tenant_id"();



CREATE OR REPLACE TRIGGER "trg_set_tenant_id" BEFORE INSERT ON "public"."collection_payables" FOR EACH ROW EXECUTE FUNCTION "public"."set_tenant_id"();



CREATE OR REPLACE TRIGGER "trg_set_tenant_id" BEFORE INSERT ON "public"."collection_rows" FOR EACH ROW EXECUTE FUNCTION "public"."set_tenant_id"();



CREATE OR REPLACE TRIGGER "trg_set_tenant_id" BEFORE INSERT ON "public"."collection_weeks" FOR EACH ROW EXECUTE FUNCTION "public"."set_tenant_id"();



CREATE OR REPLACE TRIGGER "trg_set_tenant_id" BEFORE INSERT ON "public"."collections" FOR EACH ROW EXECUTE FUNCTION "public"."set_tenant_id"();



CREATE OR REPLACE TRIGGER "trg_set_tenant_id" BEFORE INSERT ON "public"."companies" FOR EACH ROW EXECUTE FUNCTION "public"."set_tenant_id"();



CREATE OR REPLACE TRIGGER "trg_set_tenant_id" BEFORE INSERT ON "public"."company_communications" FOR EACH ROW EXECUTE FUNCTION "public"."set_tenant_id"();



CREATE OR REPLACE TRIGGER "trg_set_tenant_id" BEFORE INSERT ON "public"."company_settings" FOR EACH ROW EXECUTE FUNCTION "public"."set_tenant_id"();



CREATE OR REPLACE TRIGGER "trg_set_tenant_id" BEFORE INSERT ON "public"."contact_communications" FOR EACH ROW EXECUTE FUNCTION "public"."set_tenant_id"();



CREATE OR REPLACE TRIGGER "trg_set_tenant_id" BEFORE INSERT ON "public"."contacts" FOR EACH ROW EXECUTE FUNCTION "public"."set_tenant_id"();



CREATE OR REPLACE TRIGGER "trg_set_tenant_id" BEFORE INSERT ON "public"."crew_types" FOR EACH ROW EXECUTE FUNCTION "public"."set_tenant_id"();



CREATE OR REPLACE TRIGGER "trg_set_tenant_id" BEFORE INSERT ON "public"."crews" FOR EACH ROW EXECUTE FUNCTION "public"."set_tenant_id"();



CREATE OR REPLACE TRIGGER "trg_set_tenant_id" BEFORE INSERT ON "public"."daily_log_photos" FOR EACH ROW EXECUTE FUNCTION "public"."set_tenant_id"();



CREATE OR REPLACE TRIGGER "trg_set_tenant_id" BEFORE INSERT ON "public"."daily_logs" FOR EACH ROW EXECUTE FUNCTION "public"."set_tenant_id"();



CREATE OR REPLACE TRIGGER "trg_set_tenant_id" BEFORE INSERT ON "public"."dashboard_preferences" FOR EACH ROW EXECUTE FUNCTION "public"."set_tenant_id"();



CREATE OR REPLACE TRIGGER "trg_set_tenant_id" BEFORE INSERT ON "public"."design_annotations" FOR EACH ROW EXECUTE FUNCTION "public"."set_tenant_id"();



CREATE OR REPLACE TRIGGER "trg_set_tenant_id" BEFORE INSERT ON "public"."design_files" FOR EACH ROW EXECUTE FUNCTION "public"."set_tenant_id"();



CREATE OR REPLACE TRIGGER "trg_set_tenant_id" BEFORE INSERT ON "public"."design_projects" FOR EACH ROW EXECUTE FUNCTION "public"."set_tenant_id"();



CREATE OR REPLACE TRIGGER "trg_set_tenant_id" BEFORE INSERT ON "public"."design_takeoff_items" FOR EACH ROW EXECUTE FUNCTION "public"."set_tenant_id"();



CREATE OR REPLACE TRIGGER "trg_set_tenant_id" BEFORE INSERT ON "public"."edoc_documents" FOR EACH ROW EXECUTE FUNCTION "public"."set_tenant_id"();



CREATE OR REPLACE TRIGGER "trg_set_tenant_id" BEFORE INSERT ON "public"."edoc_templates" FOR EACH ROW EXECUTE FUNCTION "public"."set_tenant_id"();



CREATE OR REPLACE TRIGGER "trg_set_tenant_id" BEFORE INSERT ON "public"."edoc_workflows" FOR EACH ROW EXECUTE FUNCTION "public"."set_tenant_id"();



CREATE OR REPLACE TRIGGER "trg_set_tenant_id" BEFORE INSERT ON "public"."employee_certifications" FOR EACH ROW EXECUTE FUNCTION "public"."set_tenant_id"();



CREATE OR REPLACE TRIGGER "trg_set_tenant_id" BEFORE INSERT ON "public"."employee_documents" FOR EACH ROW EXECUTE FUNCTION "public"."set_tenant_id"();



CREATE OR REPLACE TRIGGER "trg_set_tenant_id" BEFORE INSERT ON "public"."employee_files" FOR EACH ROW EXECUTE FUNCTION "public"."set_tenant_id"();



CREATE OR REPLACE TRIGGER "trg_set_tenant_id" BEFORE INSERT ON "public"."employee_group_members" FOR EACH ROW EXECUTE FUNCTION "public"."set_tenant_id"();



CREATE OR REPLACE TRIGGER "trg_set_tenant_id" BEFORE INSERT ON "public"."employee_groups" FOR EACH ROW EXECUTE FUNCTION "public"."set_tenant_id"();



CREATE OR REPLACE TRIGGER "trg_set_tenant_id" BEFORE INSERT ON "public"."employee_positions" FOR EACH ROW EXECUTE FUNCTION "public"."set_tenant_id"();



CREATE OR REPLACE TRIGGER "trg_set_tenant_id" BEFORE INSERT ON "public"."employees" FOR EACH ROW EXECUTE FUNCTION "public"."set_tenant_id"();



CREATE OR REPLACE TRIGGER "trg_set_tenant_id" BEFORE INSERT ON "public"."estimate_modules" FOR EACH ROW EXECUTE FUNCTION "public"."set_tenant_id"();



CREATE OR REPLACE TRIGGER "trg_set_tenant_id" BEFORE INSERT ON "public"."estimate_projects" FOR EACH ROW EXECUTE FUNCTION "public"."set_tenant_id"();



CREATE OR REPLACE TRIGGER "trg_set_tenant_id" BEFORE INSERT ON "public"."estimates" FOR EACH ROW EXECUTE FUNCTION "public"."set_tenant_id"();



CREATE OR REPLACE TRIGGER "trg_set_tenant_id" BEFORE INSERT ON "public"."ext_formulas_condition_access" FOR EACH ROW EXECUTE FUNCTION "public"."set_tenant_id"();



CREATE OR REPLACE TRIGGER "trg_set_tenant_id" BEFORE INSERT ON "public"."ext_formulas_conditions" FOR EACH ROW EXECUTE FUNCTION "public"."set_tenant_id"();



CREATE OR REPLACE TRIGGER "trg_set_tenant_id" BEFORE INSERT ON "public"."ext_formulas_formulas" FOR EACH ROW EXECUTE FUNCTION "public"."set_tenant_id"();



CREATE OR REPLACE TRIGGER "trg_set_tenant_id" BEFORE INSERT ON "public"."feature_request_attachments" FOR EACH ROW EXECUTE FUNCTION "public"."set_tenant_id"();



CREATE OR REPLACE TRIGGER "trg_set_tenant_id" BEFORE INSERT ON "public"."feature_requests" FOR EACH ROW EXECUTE FUNCTION "public"."set_tenant_id"();



CREATE OR REPLACE TRIGGER "trg_set_tenant_id" BEFORE INSERT ON "public"."funnel_cards" FOR EACH ROW EXECUTE FUNCTION "public"."set_tenant_id"();



CREATE OR REPLACE TRIGGER "trg_set_tenant_id" BEFORE INSERT ON "public"."funnel_stages" FOR EACH ROW EXECUTE FUNCTION "public"."set_tenant_id"();



CREATE OR REPLACE TRIGGER "trg_set_tenant_id" BEFORE INSERT ON "public"."funnels" FOR EACH ROW EXECUTE FUNCTION "public"."set_tenant_id"();



CREATE OR REPLACE TRIGGER "trg_set_tenant_id" BEFORE INSERT ON "public"."ghl_connections" FOR EACH ROW EXECUTE FUNCTION "public"."set_tenant_id"();



CREATE OR REPLACE TRIGGER "trg_set_tenant_id" BEFORE INSERT ON "public"."ghl_opportunities" FOR EACH ROW EXECUTE FUNCTION "public"."set_tenant_id"();



CREATE OR REPLACE TRIGGER "trg_set_tenant_id" BEFORE INSERT ON "public"."ghl_sync_log" FOR EACH ROW EXECUTE FUNCTION "public"."set_tenant_id"();



CREATE OR REPLACE TRIGGER "trg_set_tenant_id" BEFORE INSERT ON "public"."ghl_sync_state" FOR EACH ROW EXECUTE FUNCTION "public"."set_tenant_id"();



CREATE OR REPLACE TRIGGER "trg_set_tenant_id" BEFORE INSERT ON "public"."hr_review_forms" FOR EACH ROW EXECUTE FUNCTION "public"."set_tenant_id"();



CREATE OR REPLACE TRIGGER "trg_set_tenant_id" BEFORE INSERT ON "public"."hr_reviews" FOR EACH ROW EXECUTE FUNCTION "public"."set_tenant_id"();



CREATE OR REPLACE TRIGGER "trg_set_tenant_id" BEFORE INSERT ON "public"."job_files" FOR EACH ROW EXECUTE FUNCTION "public"."set_tenant_id"();



CREATE OR REPLACE TRIGGER "trg_set_tenant_id" BEFORE INSERT ON "public"."job_folders" FOR EACH ROW EXECUTE FUNCTION "public"."set_tenant_id"();



CREATE OR REPLACE TRIGGER "trg_set_tenant_id" BEFORE INSERT ON "public"."job_invoice_lines" FOR EACH ROW EXECUTE FUNCTION "public"."set_tenant_id"();



CREATE OR REPLACE TRIGGER "trg_set_tenant_id" BEFORE INSERT ON "public"."job_invoice_payments" FOR EACH ROW EXECUTE FUNCTION "public"."set_tenant_id"();



CREATE OR REPLACE TRIGGER "trg_set_tenant_id" BEFORE INSERT ON "public"."job_invoices" FOR EACH ROW EXECUTE FUNCTION "public"."set_tenant_id"();



CREATE OR REPLACE TRIGGER "trg_set_tenant_id" BEFORE INSERT ON "public"."job_stages" FOR EACH ROW EXECUTE FUNCTION "public"."set_tenant_id"();



CREATE OR REPLACE TRIGGER "trg_set_tenant_id" BEFORE INSERT ON "public"."job_tasks" FOR EACH ROW EXECUTE FUNCTION "public"."set_tenant_id"();



CREATE OR REPLACE TRIGGER "trg_set_tenant_id" BEFORE INSERT ON "public"."job_templates" FOR EACH ROW EXECUTE FUNCTION "public"."set_tenant_id"();



CREATE OR REPLACE TRIGGER "trg_set_tenant_id" BEFORE INSERT ON "public"."jobs" FOR EACH ROW EXECUTE FUNCTION "public"."set_tenant_id"();



CREATE OR REPLACE TRIGGER "trg_set_tenant_id" BEFORE INSERT ON "public"."labor_rates" FOR EACH ROW EXECUTE FUNCTION "public"."set_tenant_id"();



CREATE OR REPLACE TRIGGER "trg_set_tenant_id" BEFORE INSERT ON "public"."lms_actions" FOR EACH ROW EXECUTE FUNCTION "public"."set_tenant_id"();



CREATE OR REPLACE TRIGGER "trg_set_tenant_id" BEFORE INSERT ON "public"."lms_assignments" FOR EACH ROW EXECUTE FUNCTION "public"."set_tenant_id"();



CREATE OR REPLACE TRIGGER "trg_set_tenant_id" BEFORE INSERT ON "public"."lms_categories" FOR EACH ROW EXECUTE FUNCTION "public"."set_tenant_id"();



CREATE OR REPLACE TRIGGER "trg_set_tenant_id" BEFORE INSERT ON "public"."lms_courses" FOR EACH ROW EXECUTE FUNCTION "public"."set_tenant_id"();



CREATE OR REPLACE TRIGGER "trg_set_tenant_id" BEFORE INSERT ON "public"."lms_learning_drills" FOR EACH ROW EXECUTE FUNCTION "public"."set_tenant_id"();



CREATE OR REPLACE TRIGGER "trg_set_tenant_id" BEFORE INSERT ON "public"."lms_quiz_attempts" FOR EACH ROW EXECUTE FUNCTION "public"."set_tenant_id"();



CREATE OR REPLACE TRIGGER "trg_set_tenant_id" BEFORE INSERT ON "public"."lms_quizzes" FOR EACH ROW EXECUTE FUNCTION "public"."set_tenant_id"();



CREATE OR REPLACE TRIGGER "trg_set_tenant_id" BEFORE INSERT ON "public"."lms_read_items" FOR EACH ROW EXECUTE FUNCTION "public"."set_tenant_id"();



CREATE OR REPLACE TRIGGER "trg_set_tenant_id" BEFORE INSERT ON "public"."lms_step_completions" FOR EACH ROW EXECUTE FUNCTION "public"."set_tenant_id"();



CREATE OR REPLACE TRIGGER "trg_set_tenant_id" BEFORE INSERT ON "public"."lms_steps" FOR EACH ROW EXECUTE FUNCTION "public"."set_tenant_id"();



CREATE OR REPLACE TRIGGER "trg_set_tenant_id" BEFORE INSERT ON "public"."lms_tests" FOR EACH ROW EXECUTE FUNCTION "public"."set_tenant_id"();



CREATE OR REPLACE TRIGGER "trg_set_tenant_id" BEFORE INSERT ON "public"."lms_videos" FOR EACH ROW EXECUTE FUNCTION "public"."set_tenant_id"();



CREATE OR REPLACE TRIGGER "trg_set_tenant_id" BEFORE INSERT ON "public"."master_equipment" FOR EACH ROW EXECUTE FUNCTION "public"."set_tenant_id"();



CREATE OR REPLACE TRIGGER "trg_set_tenant_id" BEFORE INSERT ON "public"."master_sub_crews" FOR EACH ROW EXECUTE FUNCTION "public"."set_tenant_id"();



CREATE OR REPLACE TRIGGER "trg_set_tenant_id" BEFORE INSERT ON "public"."material_categories" FOR EACH ROW EXECUTE FUNCTION "public"."set_tenant_id"();



CREATE OR REPLACE TRIGGER "trg_set_tenant_id" BEFORE INSERT ON "public"."module_equipment_map" FOR EACH ROW EXECUTE FUNCTION "public"."set_tenant_id"();



CREATE OR REPLACE TRIGGER "trg_set_tenant_id" BEFORE INSERT ON "public"."module_field_equipment_map" FOR EACH ROW EXECUTE FUNCTION "public"."set_tenant_id"();



CREATE OR REPLACE TRIGGER "trg_set_tenant_id" BEFORE INSERT ON "public"."modules" FOR EACH ROW EXECUTE FUNCTION "public"."set_tenant_id"();



CREATE OR REPLACE TRIGGER "trg_set_tenant_id" BEFORE INSERT ON "public"."org_charts" FOR EACH ROW EXECUTE FUNCTION "public"."set_tenant_id"();



CREATE OR REPLACE TRIGGER "trg_set_tenant_id" BEFORE INSERT ON "public"."org_edges" FOR EACH ROW EXECUTE FUNCTION "public"."set_tenant_id"();



CREATE OR REPLACE TRIGGER "trg_set_tenant_id" BEFORE INSERT ON "public"."org_node_types" FOR EACH ROW EXECUTE FUNCTION "public"."set_tenant_id"();



CREATE OR REPLACE TRIGGER "trg_set_tenant_id" BEFORE INSERT ON "public"."org_nodes" FOR EACH ROW EXECUTE FUNCTION "public"."set_tenant_id"();



CREATE OR REPLACE TRIGGER "trg_set_tenant_id" BEFORE INSERT ON "public"."package_requests" FOR EACH ROW EXECUTE FUNCTION "public"."set_tenant_id"();



CREATE OR REPLACE TRIGGER "trg_set_tenant_id" BEFORE INSERT ON "public"."paver_prices" FOR EACH ROW EXECUTE FUNCTION "public"."set_tenant_id"();



CREATE OR REPLACE TRIGGER "trg_set_tenant_id" BEFORE INSERT ON "public"."pbs_drive_members" FOR EACH ROW EXECUTE FUNCTION "public"."set_tenant_id"();



CREATE OR REPLACE TRIGGER "trg_set_tenant_id" BEFORE INSERT ON "public"."pbs_drives" FOR EACH ROW EXECUTE FUNCTION "public"."set_tenant_id"();



CREATE OR REPLACE TRIGGER "trg_set_tenant_id" BEFORE INSERT ON "public"."position_courses" FOR EACH ROW EXECUTE FUNCTION "public"."set_tenant_id"();



CREATE OR REPLACE TRIGGER "trg_set_tenant_id" BEFORE INSERT ON "public"."positions" FOR EACH ROW EXECUTE FUNCTION "public"."set_tenant_id"();



CREATE OR REPLACE TRIGGER "trg_set_tenant_id" BEFORE INSERT ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."set_tenant_id"();



CREATE OR REPLACE TRIGGER "trg_set_tenant_id" BEFORE INSERT ON "public"."projects" FOR EACH ROW EXECUTE FUNCTION "public"."set_tenant_id"();



CREATE OR REPLACE TRIGGER "trg_set_tenant_id" BEFORE INSERT ON "public"."qb_connection" FOR EACH ROW EXECUTE FUNCTION "public"."set_tenant_id"();



CREATE OR REPLACE TRIGGER "trg_set_tenant_id" BEFORE INSERT ON "public"."qb_session" FOR EACH ROW EXECUTE FUNCTION "public"."set_tenant_id"();



CREATE OR REPLACE TRIGGER "trg_set_tenant_id" BEFORE INSERT ON "public"."qb_sync_log" FOR EACH ROW EXECUTE FUNCTION "public"."set_tenant_id"();



CREATE OR REPLACE TRIGGER "trg_set_tenant_id" BEFORE INSERT ON "public"."qb_sync_state" FOR EACH ROW EXECUTE FUNCTION "public"."set_tenant_id"();



CREATE OR REPLACE TRIGGER "trg_set_tenant_id" BEFORE INSERT ON "public"."qb_time_tracking" FOR EACH ROW EXECUTE FUNCTION "public"."set_tenant_id"();



CREATE OR REPLACE TRIGGER "trg_set_tenant_id" BEFORE INSERT ON "public"."sales_appointments" FOR EACH ROW EXECUTE FUNCTION "public"."set_tenant_id"();



CREATE OR REPLACE TRIGGER "trg_set_tenant_id" BEFORE INSERT ON "public"."schedule_items" FOR EACH ROW EXECUTE FUNCTION "public"."set_tenant_id"();



CREATE OR REPLACE TRIGGER "trg_set_tenant_id" BEFORE INSERT ON "public"."stat_groups" FOR EACH ROW EXECUTE FUNCTION "public"."set_tenant_id"();



CREATE OR REPLACE TRIGGER "trg_set_tenant_id" BEFORE INSERT ON "public"."stat_import_export_log" FOR EACH ROW EXECUTE FUNCTION "public"."set_tenant_id"();



CREATE OR REPLACE TRIGGER "trg_set_tenant_id" BEFORE INSERT ON "public"."stat_notes" FOR EACH ROW EXECUTE FUNCTION "public"."set_tenant_id"();



CREATE OR REPLACE TRIGGER "trg_set_tenant_id" BEFORE INSERT ON "public"."stat_reminder_log" FOR EACH ROW EXECUTE FUNCTION "public"."set_tenant_id"();



CREATE OR REPLACE TRIGGER "trg_set_tenant_id" BEFORE INSERT ON "public"."stat_reminders" FOR EACH ROW EXECUTE FUNCTION "public"."set_tenant_id"();



CREATE OR REPLACE TRIGGER "trg_set_tenant_id" BEFORE INSERT ON "public"."statistic_shares" FOR EACH ROW EXECUTE FUNCTION "public"."set_tenant_id"();



CREATE OR REPLACE TRIGGER "trg_set_tenant_id" BEFORE INSERT ON "public"."statistic_values" FOR EACH ROW EXECUTE FUNCTION "public"."set_tenant_id"();



CREATE OR REPLACE TRIGGER "trg_set_tenant_id" BEFORE INSERT ON "public"."statistics" FOR EACH ROW EXECUTE FUNCTION "public"."set_tenant_id"();



CREATE OR REPLACE TRIGGER "trg_set_tenant_id" BEFORE INSERT ON "public"."sub_vendor_contracts" FOR EACH ROW EXECUTE FUNCTION "public"."set_tenant_id"();



CREATE OR REPLACE TRIGGER "trg_set_tenant_id" BEFORE INSERT ON "public"."sub_vendor_quotes" FOR EACH ROW EXECUTE FUNCTION "public"."set_tenant_id"();



CREATE OR REPLACE TRIGGER "trg_set_tenant_id" BEFORE INSERT ON "public"."subcontractor_rates" FOR EACH ROW EXECUTE FUNCTION "public"."set_tenant_id"();



CREATE OR REPLACE TRIGGER "trg_set_tenant_id" BEFORE INSERT ON "public"."subs_vendors" FOR EACH ROW EXECUTE FUNCTION "public"."set_tenant_id"();



CREATE OR REPLACE TRIGGER "trg_set_tenant_id" BEFORE INSERT ON "public"."task_categories" FOR EACH ROW EXECUTE FUNCTION "public"."set_tenant_id"();



CREATE OR REPLACE TRIGGER "trg_set_tenant_id" BEFORE INSERT ON "public"."task_descriptions" FOR EACH ROW EXECUTE FUNCTION "public"."set_tenant_id"();



CREATE OR REPLACE TRIGGER "trg_set_tenant_id" BEFORE INSERT ON "public"."template_folders" FOR EACH ROW EXECUTE FUNCTION "public"."set_tenant_id"();



CREATE OR REPLACE TRIGGER "trg_set_tenant_id" BEFORE INSERT ON "public"."template_tasks" FOR EACH ROW EXECUTE FUNCTION "public"."set_tenant_id"();



CREATE OR REPLACE TRIGGER "trg_set_tenant_id" BEFORE INSERT ON "public"."tenant_extensions" FOR EACH ROW EXECUTE FUNCTION "public"."set_tenant_id"();



CREATE OR REPLACE TRIGGER "trg_set_tenant_id" BEFORE INSERT ON "public"."tenant_packages" FOR EACH ROW EXECUTE FUNCTION "public"."set_tenant_id"();



CREATE OR REPLACE TRIGGER "trg_set_tenant_id" BEFORE INSERT ON "public"."tenant_payment_connections" FOR EACH ROW EXECUTE FUNCTION "public"."set_tenant_id"();



CREATE OR REPLACE TRIGGER "trg_set_tenant_id" BEFORE INSERT ON "public"."time_clock_breaks" FOR EACH ROW EXECUTE FUNCTION "public"."set_tenant_id"();



CREATE OR REPLACE TRIGGER "trg_set_tenant_id" BEFORE INSERT ON "public"."time_clock_permissions" FOR EACH ROW EXECUTE FUNCTION "public"."set_tenant_id"();



CREATE OR REPLACE TRIGGER "trg_set_tenant_id" BEFORE INSERT ON "public"."time_entries" FOR EACH ROW EXECUTE FUNCTION "public"."set_tenant_id"();



CREATE OR REPLACE TRIGGER "trg_set_tenant_id" BEFORE INSERT ON "public"."user_permissions" FOR EACH ROW EXECUTE FUNCTION "public"."set_tenant_id"();



CREATE OR REPLACE TRIGGER "trg_set_tenant_id" BEFORE INSERT ON "public"."website_leads" FOR EACH ROW EXECUTE FUNCTION "public"."set_tenant_id"();



CREATE OR REPLACE TRIGGER "trg_set_tenant_id" BEFORE INSERT ON "public"."website_pages" FOR EACH ROW EXECUTE FUNCTION "public"."set_tenant_id"();



CREATE OR REPLACE TRIGGER "trg_set_tenant_id" BEFORE INSERT ON "public"."websites" FOR EACH ROW EXECUTE FUNCTION "public"."set_tenant_id"();



CREATE OR REPLACE TRIGGER "trg_set_tenant_id" BEFORE INSERT ON "public"."work_orders" FOR EACH ROW EXECUTE FUNCTION "public"."set_tenant_id"();



CREATE OR REPLACE TRIGGER "trg_set_tenant_id" BEFORE INSERT ON "public"."workday_exceptions" FOR EACH ROW EXECUTE FUNCTION "public"."set_tenant_id"();



CREATE OR REPLACE TRIGGER "trg_set_tenant_id" BEFORE INSERT ON "public"."workflow_types" FOR EACH ROW EXECUTE FUNCTION "public"."set_tenant_id"();



ALTER TABLE ONLY "public"."acct_accounts"
    ADD CONSTRAINT "acct_accounts_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "public"."acct_accounts"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."acct_accounts"
    ADD CONSTRAINT "acct_accounts_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id");



ALTER TABLE ONLY "public"."acct_bank_accounts"
    ADD CONSTRAINT "acct_bank_accounts_gl_account_id_fkey" FOREIGN KEY ("gl_account_id") REFERENCES "public"."acct_accounts"("id");



ALTER TABLE ONLY "public"."acct_bank_accounts"
    ADD CONSTRAINT "acct_bank_accounts_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id");



ALTER TABLE ONLY "public"."acct_bank_transactions"
    ADD CONSTRAINT "acct_bank_transactions_bank_account_id_fkey" FOREIGN KEY ("bank_account_id") REFERENCES "public"."acct_bank_accounts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."acct_bank_transactions"
    ADD CONSTRAINT "acct_bank_transactions_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."acct_accounts"("id");



ALTER TABLE ONLY "public"."acct_bank_transactions"
    ADD CONSTRAINT "acct_bank_transactions_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "public"."acct_payments"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."acct_bank_transactions"
    ADD CONSTRAINT "acct_bank_transactions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id");



ALTER TABLE ONLY "public"."acct_bill_lines"
    ADD CONSTRAINT "acct_bill_lines_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "public"."acct_accounts"("id");



ALTER TABLE ONLY "public"."acct_bill_lines"
    ADD CONSTRAINT "acct_bill_lines_bill_id_fkey" FOREIGN KEY ("bill_id") REFERENCES "public"."acct_bills"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."acct_bill_lines"
    ADD CONSTRAINT "acct_bill_lines_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."acct_bill_lines"
    ADD CONSTRAINT "acct_bill_lines_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id");



ALTER TABLE ONLY "public"."acct_bills"
    ADD CONSTRAINT "acct_bills_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."acct_bills"
    ADD CONSTRAINT "acct_bills_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id");



ALTER TABLE ONLY "public"."acct_bills"
    ADD CONSTRAINT "acct_bills_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "public"."subs_vendors"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."acct_check_lines"
    ADD CONSTRAINT "acct_check_lines_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "public"."acct_accounts"("id");



ALTER TABLE ONLY "public"."acct_check_lines"
    ADD CONSTRAINT "acct_check_lines_check_id_fkey" FOREIGN KEY ("check_id") REFERENCES "public"."acct_checks"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."acct_check_lines"
    ADD CONSTRAINT "acct_check_lines_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."acct_check_lines"
    ADD CONSTRAINT "acct_check_lines_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id");



ALTER TABLE ONLY "public"."acct_checks"
    ADD CONSTRAINT "acct_checks_bank_account_id_fkey" FOREIGN KEY ("bank_account_id") REFERENCES "public"."acct_bank_accounts"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."acct_checks"
    ADD CONSTRAINT "acct_checks_payee_id_fkey" FOREIGN KEY ("payee_id") REFERENCES "public"."subs_vendors"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."acct_checks"
    ADD CONSTRAINT "acct_checks_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id");



ALTER TABLE ONLY "public"."acct_credit_card_charge_lines"
    ADD CONSTRAINT "acct_credit_card_charge_lines_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "public"."acct_accounts"("id");



ALTER TABLE ONLY "public"."acct_credit_card_charge_lines"
    ADD CONSTRAINT "acct_credit_card_charge_lines_charge_id_fkey" FOREIGN KEY ("charge_id") REFERENCES "public"."acct_credit_card_charges"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."acct_credit_card_charge_lines"
    ADD CONSTRAINT "acct_credit_card_charge_lines_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."acct_credit_card_charge_lines"
    ADD CONSTRAINT "acct_credit_card_charge_lines_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id");



ALTER TABLE ONLY "public"."acct_credit_card_charges"
    ADD CONSTRAINT "acct_credit_card_charges_credit_card_account_id_fkey" FOREIGN KEY ("credit_card_account_id") REFERENCES "public"."acct_bank_accounts"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."acct_credit_card_charges"
    ADD CONSTRAINT "acct_credit_card_charges_payee_id_fkey" FOREIGN KEY ("payee_id") REFERENCES "public"."subs_vendors"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."acct_credit_card_charges"
    ADD CONSTRAINT "acct_credit_card_charges_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id");



ALTER TABLE ONLY "public"."acct_invoice_lines"
    ADD CONSTRAINT "acct_invoice_lines_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "public"."acct_accounts"("id");



ALTER TABLE ONLY "public"."acct_invoice_lines"
    ADD CONSTRAINT "acct_invoice_lines_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "public"."acct_invoices"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."acct_invoice_lines"
    ADD CONSTRAINT "acct_invoice_lines_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id");



ALTER TABLE ONLY "public"."acct_invoices"
    ADD CONSTRAINT "acct_invoices_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."acct_invoices"
    ADD CONSTRAINT "acct_invoices_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."acct_invoices"
    ADD CONSTRAINT "acct_invoices_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id");



ALTER TABLE ONLY "public"."acct_item_receipt_lines"
    ADD CONSTRAINT "acct_item_receipt_lines_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "public"."acct_accounts"("id");



ALTER TABLE ONLY "public"."acct_item_receipt_lines"
    ADD CONSTRAINT "acct_item_receipt_lines_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."acct_item_receipt_lines"
    ADD CONSTRAINT "acct_item_receipt_lines_receipt_id_fkey" FOREIGN KEY ("receipt_id") REFERENCES "public"."acct_item_receipts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."acct_item_receipt_lines"
    ADD CONSTRAINT "acct_item_receipt_lines_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id");



ALTER TABLE ONLY "public"."acct_item_receipts"
    ADD CONSTRAINT "acct_item_receipts_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id");



ALTER TABLE ONLY "public"."acct_item_receipts"
    ADD CONSTRAINT "acct_item_receipts_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "public"."subs_vendors"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."acct_journal_entries"
    ADD CONSTRAINT "acct_journal_entries_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."acct_journal_entries"
    ADD CONSTRAINT "acct_journal_entries_posted_by_fkey" FOREIGN KEY ("posted_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."acct_journal_entries"
    ADD CONSTRAINT "acct_journal_entries_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id");



ALTER TABLE ONLY "public"."acct_journal_entry_lines"
    ADD CONSTRAINT "acct_journal_entry_lines_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "public"."acct_accounts"("id");



ALTER TABLE ONLY "public"."acct_journal_entry_lines"
    ADD CONSTRAINT "acct_journal_entry_lines_entry_id_fkey" FOREIGN KEY ("entry_id") REFERENCES "public"."acct_journal_entries"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."acct_journal_entry_lines"
    ADD CONSTRAINT "acct_journal_entry_lines_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."acct_journal_entry_lines"
    ADD CONSTRAINT "acct_journal_entry_lines_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id");



ALTER TABLE ONLY "public"."acct_journal_lines"
    ADD CONSTRAINT "acct_journal_lines_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "public"."acct_accounts"("id");



ALTER TABLE ONLY "public"."acct_journal_lines"
    ADD CONSTRAINT "acct_journal_lines_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id");



ALTER TABLE ONLY "public"."acct_payments"
    ADD CONSTRAINT "acct_payments_bill_id_fkey" FOREIGN KEY ("bill_id") REFERENCES "public"."acct_bills"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."acct_payments"
    ADD CONSTRAINT "acct_payments_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "public"."acct_invoices"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."acct_payments"
    ADD CONSTRAINT "acct_payments_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id");



ALTER TABLE ONLY "public"."actual_entries"
    ADD CONSTRAINT "actual_entries_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."actual_entries"
    ADD CONSTRAINT "actual_entries_module_id_fkey" FOREIGN KEY ("module_id") REFERENCES "public"."modules"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."actual_entries"
    ADD CONSTRAINT "actual_entries_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id");



ALTER TABLE ONLY "public"."agent_conversations"
    ADD CONSTRAINT "agent_conversations_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id");



ALTER TABLE ONLY "public"."agent_conversations"
    ADD CONSTRAINT "agent_conversations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."agent_message_attachments"
    ADD CONSTRAINT "agent_message_attachments_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "public"."agent_conversations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."agent_message_attachments"
    ADD CONSTRAINT "agent_message_attachments_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "public"."agent_messages"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."agent_message_attachments"
    ADD CONSTRAINT "agent_message_attachments_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id");



ALTER TABLE ONLY "public"."agent_message_attachments"
    ADD CONSTRAINT "agent_message_attachments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."agent_messages"
    ADD CONSTRAINT "agent_messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "public"."agent_conversations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."agent_messages"
    ADD CONSTRAINT "agent_messages_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id");



ALTER TABLE ONLY "public"."agent_tool_calls"
    ADD CONSTRAINT "agent_tool_calls_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "public"."agent_conversations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."agent_tool_calls"
    ADD CONSTRAINT "agent_tool_calls_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "public"."agent_messages"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."agent_tool_calls"
    ADD CONSTRAINT "agent_tool_calls_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id");



ALTER TABLE ONLY "public"."agent_user_preferences"
    ADD CONSTRAINT "agent_user_preferences_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id");



ALTER TABLE ONLY "public"."agent_user_preferences"
    ADD CONSTRAINT "agent_user_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."applicants"
    ADD CONSTRAINT "applicants_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id");



ALTER TABLE ONLY "public"."bids"
    ADD CONSTRAINT "bids_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."bids"
    ADD CONSTRAINT "bids_estimate_id_fkey" FOREIGN KEY ("estimate_id") REFERENCES "public"."estimates"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."bids"
    ADD CONSTRAINT "bids_linked_job_id_fkey" FOREIGN KEY ("linked_job_id") REFERENCES "public"."jobs"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."bids"
    ADD CONSTRAINT "bids_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id");



ALTER TABLE ONLY "public"."billing_payments"
    ADD CONSTRAINT "billing_payments_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."cad_drawings"
    ADD CONSTRAINT "cad_drawings_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."cad_drawings"
    ADD CONSTRAINT "cad_drawings_design_project_id_fkey" FOREIGN KEY ("design_project_id") REFERENCES "public"."design_projects"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."cancellation_feedback"
    ADD CONSTRAINT "cancellation_feedback_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."cancellation_feedback"
    ADD CONSTRAINT "cancellation_feedback_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."category"
    ADD CONSTRAINT "category_default_vendor_id_fkey" FOREIGN KEY ("default_vendor_id") REFERENCES "public"."subs_vendors"("id");



ALTER TABLE ONLY "public"."category"
    ADD CONSTRAINT "category_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."change_orders"
    ADD CONSTRAINT "change_orders_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."change_orders"
    ADD CONSTRAINT "change_orders_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id");



ALTER TABLE ONLY "public"."client_payment_methods"
    ADD CONSTRAINT "client_payment_methods_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."client_payment_methods"
    ADD CONSTRAINT "client_payment_methods_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id");



ALTER TABLE ONLY "public"."client_portals"
    ADD CONSTRAINT "client_portals_auth_user_id_fkey" FOREIGN KEY ("auth_user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."client_portals"
    ADD CONSTRAINT "client_portals_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."client_portals"
    ADD CONSTRAINT "client_portals_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id");



ALTER TABLE ONLY "public"."clients"
    ADD CONSTRAINT "clients_consultant_employee_id_fkey" FOREIGN KEY ("consultant_employee_id") REFERENCES "public"."employees"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."clients"
    ADD CONSTRAINT "clients_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."clients"
    ADD CONSTRAINT "clients_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id");



ALTER TABLE ONLY "public"."collection_financial"
    ADD CONSTRAINT "collection_financial_source_payable_id_fkey" FOREIGN KEY ("source_payable_id") REFERENCES "public"."collection_payables"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."collection_financial"
    ADD CONSTRAINT "collection_financial_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id");



ALTER TABLE ONLY "public"."collection_financial"
    ADD CONSTRAINT "collection_financial_week_id_fkey" FOREIGN KEY ("week_id") REFERENCES "public"."collection_weeks"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."collection_payables"
    ADD CONSTRAINT "collection_payables_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id");



ALTER TABLE ONLY "public"."collection_payables"
    ADD CONSTRAINT "collection_payables_week_id_fkey" FOREIGN KEY ("week_id") REFERENCES "public"."collection_weeks"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."collection_rows"
    ADD CONSTRAINT "collection_rows_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id");



ALTER TABLE ONLY "public"."collection_rows"
    ADD CONSTRAINT "collection_rows_week_id_fkey" FOREIGN KEY ("week_id") REFERENCES "public"."collection_weeks"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."collection_weeks"
    ADD CONSTRAINT "collection_weeks_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id");



ALTER TABLE ONLY "public"."collections"
    ADD CONSTRAINT "collections_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."collections"
    ADD CONSTRAINT "collections_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id");



ALTER TABLE ONLY "public"."companies"
    ADD CONSTRAINT "companies_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id");



ALTER TABLE ONLY "public"."company_communications"
    ADD CONSTRAINT "company_communications_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."company_communications"
    ADD CONSTRAINT "company_communications_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id");



ALTER TABLE ONLY "public"."company_settings"
    ADD CONSTRAINT "company_settings_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id");



ALTER TABLE ONLY "public"."contact_communications"
    ADD CONSTRAINT "contact_communications_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."contact_communications"
    ADD CONSTRAINT "contact_communications_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."contact_communications"
    ADD CONSTRAINT "contact_communications_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id");



ALTER TABLE ONLY "public"."contacts"
    ADD CONSTRAINT "contacts_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."contacts"
    ADD CONSTRAINT "contacts_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."contacts"
    ADD CONSTRAINT "contacts_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id");



ALTER TABLE ONLY "public"."crew_types"
    ADD CONSTRAINT "crew_types_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id");



ALTER TABLE ONLY "public"."crews"
    ADD CONSTRAINT "crews_crew_chief_id_fkey" FOREIGN KEY ("crew_chief_id") REFERENCES "public"."employees"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."crews"
    ADD CONSTRAINT "crews_journeyman_id_fkey" FOREIGN KEY ("journeyman_id") REFERENCES "public"."employees"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."crews"
    ADD CONSTRAINT "crews_laborer_1_id_fkey" FOREIGN KEY ("laborer_1_id") REFERENCES "public"."employees"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."crews"
    ADD CONSTRAINT "crews_laborer_2_id_fkey" FOREIGN KEY ("laborer_2_id") REFERENCES "public"."employees"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."crews"
    ADD CONSTRAINT "crews_laborer_3_id_fkey" FOREIGN KEY ("laborer_3_id") REFERENCES "public"."employees"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."crews"
    ADD CONSTRAINT "crews_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id");



ALTER TABLE ONLY "public"."daily_log_photos"
    ADD CONSTRAINT "daily_log_photos_log_id_fkey" FOREIGN KEY ("log_id") REFERENCES "public"."daily_logs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."daily_log_photos"
    ADD CONSTRAINT "daily_log_photos_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id");



ALTER TABLE ONLY "public"."daily_logs"
    ADD CONSTRAINT "daily_logs_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."daily_logs"
    ADD CONSTRAINT "daily_logs_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."daily_logs"
    ADD CONSTRAINT "daily_logs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id");



ALTER TABLE ONLY "public"."dashboard_appreciations"
    ADD CONSTRAINT "dashboard_appreciations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."dashboard_preferences"
    ADD CONSTRAINT "dashboard_preferences_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id");



ALTER TABLE ONLY "public"."dashboard_preferences"
    ADD CONSTRAINT "dashboard_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."design_annotations"
    ADD CONSTRAINT "design_annotations_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."design_annotations"
    ADD CONSTRAINT "design_annotations_file_id_fkey" FOREIGN KEY ("file_id") REFERENCES "public"."design_files"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."design_annotations"
    ADD CONSTRAINT "design_annotations_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "public"."design_takeoff_items"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."design_annotations"
    ADD CONSTRAINT "design_annotations_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id");



ALTER TABLE ONLY "public"."design_files"
    ADD CONSTRAINT "design_files_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."design_projects"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."design_files"
    ADD CONSTRAINT "design_files_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id");



ALTER TABLE ONLY "public"."design_files"
    ADD CONSTRAINT "design_files_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."design_projects"
    ADD CONSTRAINT "design_projects_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."design_projects"
    ADD CONSTRAINT "design_projects_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."design_projects"
    ADD CONSTRAINT "design_projects_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id");



ALTER TABLE ONLY "public"."design_takeoff_items"
    ADD CONSTRAINT "design_takeoff_items_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."design_takeoff_items"
    ADD CONSTRAINT "design_takeoff_items_file_id_fkey" FOREIGN KEY ("file_id") REFERENCES "public"."design_files"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."design_takeoff_items"
    ADD CONSTRAINT "design_takeoff_items_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id");



ALTER TABLE ONLY "public"."edoc_documents"
    ADD CONSTRAINT "edoc_documents_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."edoc_documents"
    ADD CONSTRAINT "edoc_documents_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."edoc_documents"
    ADD CONSTRAINT "edoc_documents_estimate_id_fkey" FOREIGN KEY ("estimate_id") REFERENCES "public"."estimates"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."edoc_documents"
    ADD CONSTRAINT "edoc_documents_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "public"."edoc_templates"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."edoc_documents"
    ADD CONSTRAINT "edoc_documents_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id");



ALTER TABLE ONLY "public"."edoc_templates"
    ADD CONSTRAINT "edoc_templates_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."edoc_templates"
    ADD CONSTRAINT "edoc_templates_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id");



ALTER TABLE ONLY "public"."edoc_workflows"
    ADD CONSTRAINT "edoc_workflows_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."edoc_workflows"
    ADD CONSTRAINT "edoc_workflows_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id");



ALTER TABLE ONLY "public"."employee_certifications"
    ADD CONSTRAINT "employee_certifications_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."employee_certifications"
    ADD CONSTRAINT "employee_certifications_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id");



ALTER TABLE ONLY "public"."employee_documents"
    ADD CONSTRAINT "employee_documents_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."employee_documents"
    ADD CONSTRAINT "employee_documents_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id");



ALTER TABLE ONLY "public"."employee_files"
    ADD CONSTRAINT "employee_files_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."employee_files"
    ADD CONSTRAINT "employee_files_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "public"."employee_files"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."employee_files"
    ADD CONSTRAINT "employee_files_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id");



ALTER TABLE ONLY "public"."employee_group_members"
    ADD CONSTRAINT "employee_group_members_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."employee_group_members"
    ADD CONSTRAINT "employee_group_members_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "public"."employee_groups"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."employee_group_members"
    ADD CONSTRAINT "employee_group_members_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id");



ALTER TABLE ONLY "public"."employee_groups"
    ADD CONSTRAINT "employee_groups_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id");



ALTER TABLE ONLY "public"."employee_positions"
    ADD CONSTRAINT "employee_positions_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."employee_positions"
    ADD CONSTRAINT "employee_positions_position_id_fkey" FOREIGN KEY ("position_id") REFERENCES "public"."positions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."employee_positions"
    ADD CONSTRAINT "employee_positions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id");



ALTER TABLE ONLY "public"."employees"
    ADD CONSTRAINT "employees_position_id_fkey" FOREIGN KEY ("position_id") REFERENCES "public"."positions"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."employees"
    ADD CONSTRAINT "employees_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id");



ALTER TABLE ONLY "public"."employees"
    ADD CONSTRAINT "employees_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."estimate_modules"
    ADD CONSTRAINT "estimate_modules_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."estimate_projects"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."estimate_modules"
    ADD CONSTRAINT "estimate_modules_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id");



ALTER TABLE ONLY "public"."estimate_projects"
    ADD CONSTRAINT "estimate_projects_estimate_id_fkey" FOREIGN KEY ("estimate_id") REFERENCES "public"."estimates"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."estimate_projects"
    ADD CONSTRAINT "estimate_projects_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id");



ALTER TABLE ONLY "public"."estimates"
    ADD CONSTRAINT "estimates_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."estimates"
    ADD CONSTRAINT "estimates_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."estimates"
    ADD CONSTRAINT "estimates_parent_estimate_id_fkey" FOREIGN KEY ("parent_estimate_id") REFERENCES "public"."estimates"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."estimates"
    ADD CONSTRAINT "estimates_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id");



ALTER TABLE ONLY "public"."ext_formulas_condition_access"
    ADD CONSTRAINT "ext_formulas_condition_access_condition_id_fkey" FOREIGN KEY ("condition_id") REFERENCES "public"."ext_formulas_conditions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ext_formulas_condition_access"
    ADD CONSTRAINT "ext_formulas_condition_access_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ext_formulas_condition_steps"
    ADD CONSTRAINT "ext_formulas_condition_steps_condition_id_fkey" FOREIGN KEY ("condition_id") REFERENCES "public"."ext_formulas_conditions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ext_formulas_condition_steps"
    ADD CONSTRAINT "ext_formulas_condition_steps_sub_condition_id_fkey" FOREIGN KEY ("sub_condition_id") REFERENCES "public"."ext_formulas_sub_conditions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ext_formulas_conditions"
    ADD CONSTRAINT "ext_formulas_conditions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ext_formulas_formulas"
    ADD CONSTRAINT "ext_formulas_formulas_condition_id_fkey" FOREIGN KEY ("condition_id") REFERENCES "public"."ext_formulas_conditions"("id");



ALTER TABLE ONLY "public"."ext_formulas_formulas"
    ADD CONSTRAINT "ext_formulas_formulas_statistic_id_fkey" FOREIGN KEY ("statistic_id") REFERENCES "public"."statistics"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ext_formulas_formulas"
    ADD CONSTRAINT "ext_formulas_formulas_sub_condition_id_fkey" FOREIGN KEY ("sub_condition_id") REFERENCES "public"."ext_formulas_sub_conditions"("id");



ALTER TABLE ONLY "public"."ext_formulas_formulas"
    ADD CONSTRAINT "ext_formulas_formulas_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ext_formulas_steps"
    ADD CONSTRAINT "ext_formulas_steps_condition_step_id_fkey" FOREIGN KEY ("condition_step_id") REFERENCES "public"."ext_formulas_condition_steps"("id");



ALTER TABLE ONLY "public"."ext_formulas_steps"
    ADD CONSTRAINT "ext_formulas_steps_formula_id_fkey" FOREIGN KEY ("formula_id") REFERENCES "public"."ext_formulas_formulas"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ext_formulas_sub_conditions"
    ADD CONSTRAINT "ext_formulas_sub_conditions_condition_id_fkey" FOREIGN KEY ("condition_id") REFERENCES "public"."ext_formulas_conditions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."feature_request_attachments"
    ADD CONSTRAINT "feature_request_attachments_feature_request_id_fkey" FOREIGN KEY ("feature_request_id") REFERENCES "public"."feature_requests"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."feature_request_attachments"
    ADD CONSTRAINT "feature_request_attachments_source_message_attachment_id_fkey" FOREIGN KEY ("source_message_attachment_id") REFERENCES "public"."agent_message_attachments"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."feature_request_attachments"
    ADD CONSTRAINT "feature_request_attachments_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id");



ALTER TABLE ONLY "public"."feature_request_attachments"
    ADD CONSTRAINT "feature_request_attachments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."feature_requests"
    ADD CONSTRAINT "feature_requests_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "public"."agent_conversations"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."feature_requests"
    ADD CONSTRAINT "feature_requests_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id");



ALTER TABLE ONLY "public"."feature_requests"
    ADD CONSTRAINT "feature_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."funnel_cards"
    ADD CONSTRAINT "funnel_cards_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."funnel_cards"
    ADD CONSTRAINT "funnel_cards_funnel_id_fkey" FOREIGN KEY ("funnel_id") REFERENCES "public"."funnels"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."funnel_cards"
    ADD CONSTRAINT "funnel_cards_stage_id_fkey" FOREIGN KEY ("stage_id") REFERENCES "public"."funnel_stages"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."funnel_cards"
    ADD CONSTRAINT "funnel_cards_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id");



ALTER TABLE ONLY "public"."funnel_stages"
    ADD CONSTRAINT "funnel_stages_funnel_id_fkey" FOREIGN KEY ("funnel_id") REFERENCES "public"."funnels"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."funnel_stages"
    ADD CONSTRAINT "funnel_stages_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id");



ALTER TABLE ONLY "public"."funnels"
    ADD CONSTRAINT "funnels_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id");



ALTER TABLE ONLY "public"."general_category"
    ADD CONSTRAINT "general_category_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."general_subcategory"
    ADD CONSTRAINT "general_subcategory_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."general_category"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."general_subcategory"
    ADD CONSTRAINT "general_subcategory_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ghl_connections"
    ADD CONSTRAINT "ghl_connections_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."ghl_connections"
    ADD CONSTRAINT "ghl_connections_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id");



ALTER TABLE ONLY "public"."ghl_opportunities"
    ADD CONSTRAINT "ghl_opportunities_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."ghl_opportunities"
    ADD CONSTRAINT "ghl_opportunities_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id");



ALTER TABLE ONLY "public"."ghl_sync_log"
    ADD CONSTRAINT "ghl_sync_log_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id");



ALTER TABLE ONLY "public"."ghl_sync_state"
    ADD CONSTRAINT "ghl_sync_state_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id");



ALTER TABLE ONLY "public"."help_docs"
    ADD CONSTRAINT "help_docs_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."help_doc_categories"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."help_docs"
    ADD CONSTRAINT "help_docs_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."help_videos"
    ADD CONSTRAINT "help_videos_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."help_video_categories"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."help_videos"
    ADD CONSTRAINT "help_videos_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."hr_review_forms"
    ADD CONSTRAINT "hr_review_forms_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id");



ALTER TABLE ONLY "public"."hr_reviews"
    ADD CONSTRAINT "hr_reviews_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."hr_reviews"
    ADD CONSTRAINT "hr_reviews_review_form_id_fkey" FOREIGN KEY ("review_form_id") REFERENCES "public"."hr_review_forms"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."hr_reviews"
    ADD CONSTRAINT "hr_reviews_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id");



ALTER TABLE ONLY "public"."job_expenses"
    ADD CONSTRAINT "job_expenses_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "public"."vendor_invoices"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."job_expenses"
    ADD CONSTRAINT "job_expenses_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."job_expenses"
    ADD CONSTRAINT "job_expenses_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."job_expenses"
    ADD CONSTRAINT "job_expenses_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "public"."subs_vendors"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."job_files"
    ADD CONSTRAINT "job_files_bid_id_fkey" FOREIGN KEY ("bid_id") REFERENCES "public"."bids"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."job_files"
    ADD CONSTRAINT "job_files_folder_id_fkey" FOREIGN KEY ("folder_id") REFERENCES "public"."job_folders"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."job_files"
    ADD CONSTRAINT "job_files_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "public"."job_invoices"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."job_files"
    ADD CONSTRAINT "job_files_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."job_files"
    ADD CONSTRAINT "job_files_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id");



ALTER TABLE ONLY "public"."job_files"
    ADD CONSTRAINT "job_files_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."job_folders"
    ADD CONSTRAINT "job_folders_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."job_folders"
    ADD CONSTRAINT "job_folders_parent_folder_id_fkey" FOREIGN KEY ("parent_folder_id") REFERENCES "public"."job_folders"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."job_folders"
    ADD CONSTRAINT "job_folders_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "public"."job_templates"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."job_folders"
    ADD CONSTRAINT "job_folders_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id");



ALTER TABLE ONLY "public"."job_invoice_lines"
    ADD CONSTRAINT "job_invoice_lines_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "public"."job_invoices"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."job_invoice_lines"
    ADD CONSTRAINT "job_invoice_lines_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id");



ALTER TABLE ONLY "public"."job_invoice_payments"
    ADD CONSTRAINT "job_invoice_payments_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "public"."job_invoices"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."job_invoice_payments"
    ADD CONSTRAINT "job_invoice_payments_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."job_invoice_payments"
    ADD CONSTRAINT "job_invoice_payments_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id");



ALTER TABLE ONLY "public"."job_invoices"
    ADD CONSTRAINT "job_invoices_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."job_invoices"
    ADD CONSTRAINT "job_invoices_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id");



ALTER TABLE ONLY "public"."job_stages"
    ADD CONSTRAINT "job_stages_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id");



ALTER TABLE ONLY "public"."job_tasks"
    ADD CONSTRAINT "job_tasks_assignee_id_fkey" FOREIGN KEY ("assignee_id") REFERENCES "public"."employees"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."job_tasks"
    ADD CONSTRAINT "job_tasks_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."task_categories"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."job_tasks"
    ADD CONSTRAINT "job_tasks_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."job_tasks"
    ADD CONSTRAINT "job_tasks_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "public"."job_templates"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."job_tasks"
    ADD CONSTRAINT "job_tasks_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id");



ALTER TABLE ONLY "public"."job_templates"
    ADD CONSTRAINT "job_templates_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."job_templates"
    ADD CONSTRAINT "job_templates_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id");



ALTER TABLE ONLY "public"."jobs"
    ADD CONSTRAINT "jobs_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."jobs"
    ADD CONSTRAINT "jobs_estimate_id_fkey" FOREIGN KEY ("estimate_id") REFERENCES "public"."estimates"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."jobs"
    ADD CONSTRAINT "jobs_responsible_employee_id_fkey" FOREIGN KEY ("responsible_employee_id") REFERENCES "public"."employees"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."jobs"
    ADD CONSTRAINT "jobs_stage_id_fkey" FOREIGN KEY ("stage_id") REFERENCES "public"."job_stages"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."jobs"
    ADD CONSTRAINT "jobs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id");



ALTER TABLE ONLY "public"."labor_category"
    ADD CONSTRAINT "labor_category_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."labor_rates"
    ADD CONSTRAINT "labor_rates_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."labor_rates"
    ADD CONSTRAINT "labor_rates_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id");



ALTER TABLE ONLY "public"."labor_subcategory"
    ADD CONSTRAINT "labor_subcategory_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."labor_category"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."labor_subcategory"
    ADD CONSTRAINT "labor_subcategory_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."lms_actions"
    ADD CONSTRAINT "lms_actions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id");



ALTER TABLE ONLY "public"."lms_assignments"
    ADD CONSTRAINT "lms_assignments_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "public"."lms_courses"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."lms_assignments"
    ADD CONSTRAINT "lms_assignments_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."lms_assignments"
    ADD CONSTRAINT "lms_assignments_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id");



ALTER TABLE ONLY "public"."lms_categories"
    ADD CONSTRAINT "lms_categories_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id");



ALTER TABLE ONLY "public"."lms_courses"
    ADD CONSTRAINT "lms_courses_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id");



ALTER TABLE ONLY "public"."lms_learning_drills"
    ADD CONSTRAINT "lms_learning_drills_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id");



ALTER TABLE ONLY "public"."lms_quiz_attempts"
    ADD CONSTRAINT "lms_quiz_attempts_assignment_id_fkey" FOREIGN KEY ("assignment_id") REFERENCES "public"."lms_assignments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."lms_quiz_attempts"
    ADD CONSTRAINT "lms_quiz_attempts_step_id_fkey" FOREIGN KEY ("step_id") REFERENCES "public"."lms_steps"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."lms_quiz_attempts"
    ADD CONSTRAINT "lms_quiz_attempts_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id");



ALTER TABLE ONLY "public"."lms_quizzes"
    ADD CONSTRAINT "lms_quizzes_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id");



ALTER TABLE ONLY "public"."lms_read_items"
    ADD CONSTRAINT "lms_read_items_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id");



ALTER TABLE ONLY "public"."lms_step_completions"
    ADD CONSTRAINT "lms_step_completions_assignment_id_fkey" FOREIGN KEY ("assignment_id") REFERENCES "public"."lms_assignments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."lms_step_completions"
    ADD CONSTRAINT "lms_step_completions_step_id_fkey" FOREIGN KEY ("step_id") REFERENCES "public"."lms_steps"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."lms_step_completions"
    ADD CONSTRAINT "lms_step_completions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id");



ALTER TABLE ONLY "public"."lms_steps"
    ADD CONSTRAINT "lms_steps_action_id_fkey" FOREIGN KEY ("action_id") REFERENCES "public"."lms_actions"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."lms_steps"
    ADD CONSTRAINT "lms_steps_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "public"."lms_courses"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."lms_steps"
    ADD CONSTRAINT "lms_steps_learning_drill_id_fkey" FOREIGN KEY ("learning_drill_id") REFERENCES "public"."lms_learning_drills"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."lms_steps"
    ADD CONSTRAINT "lms_steps_quiz_id_fkey" FOREIGN KEY ("quiz_id") REFERENCES "public"."lms_quizzes"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."lms_steps"
    ADD CONSTRAINT "lms_steps_read_item_id_fkey" FOREIGN KEY ("read_item_id") REFERENCES "public"."lms_read_items"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."lms_steps"
    ADD CONSTRAINT "lms_steps_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id");



ALTER TABLE ONLY "public"."lms_steps"
    ADD CONSTRAINT "lms_steps_test_id_fkey" FOREIGN KEY ("test_id") REFERENCES "public"."lms_tests"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."lms_steps"
    ADD CONSTRAINT "lms_steps_video_id_fkey" FOREIGN KEY ("video_id") REFERENCES "public"."lms_videos"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."lms_tests"
    ADD CONSTRAINT "lms_tests_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id");



ALTER TABLE ONLY "public"."lms_videos"
    ADD CONSTRAINT "lms_videos_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id");



ALTER TABLE ONLY "public"."master_equipment"
    ADD CONSTRAINT "master_equipment_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id");



ALTER TABLE ONLY "public"."master_sub_crews"
    ADD CONSTRAINT "master_sub_crews_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id");



ALTER TABLE ONLY "public"."material"
    ADD CONSTRAINT "material_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."category"("id");



ALTER TABLE ONLY "public"."material_price"
    ADD CONSTRAINT "material_price_material_id_fkey" FOREIGN KEY ("material_id") REFERENCES "public"."material"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."material_price"
    ADD CONSTRAINT "material_price_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."material_price"
    ADD CONSTRAINT "material_price_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "public"."subs_vendors"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."material"
    ADD CONSTRAINT "material_subcategory_id_fkey" FOREIGN KEY ("subcategory_id") REFERENCES "public"."subcategory"("id");



ALTER TABLE ONLY "public"."material"
    ADD CONSTRAINT "material_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."misc_rates"
    ADD CONSTRAINT "misc_rates_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."module_category_map"
    ADD CONSTRAINT "module_category_map_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."module_equipment_map"
    ADD CONSTRAINT "module_equipment_map_equipment_id_fkey" FOREIGN KEY ("equipment_id") REFERENCES "public"."master_equipment"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."module_equipment_map"
    ADD CONSTRAINT "module_equipment_map_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id");



ALTER TABLE ONLY "public"."module_field_equipment_map"
    ADD CONSTRAINT "module_field_equipment_map_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id");



ALTER TABLE ONLY "public"."modules"
    ADD CONSTRAINT "modules_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."modules"
    ADD CONSTRAINT "modules_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id");



ALTER TABLE ONLY "public"."org_chart_template_subcategories"
    ADD CONSTRAINT "org_chart_template_subcategories_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."org_chart_template_categories"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."org_chart_templates"
    ADD CONSTRAINT "org_chart_templates_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."org_chart_template_categories"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."org_chart_templates"
    ADD CONSTRAINT "org_chart_templates_subcategory_id_fkey" FOREIGN KEY ("subcategory_id") REFERENCES "public"."org_chart_template_subcategories"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."org_charts"
    ADD CONSTRAINT "org_charts_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."org_chart_template_categories"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."org_charts"
    ADD CONSTRAINT "org_charts_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."org_charts"
    ADD CONSTRAINT "org_charts_subcategory_id_fkey" FOREIGN KEY ("subcategory_id") REFERENCES "public"."org_chart_template_subcategories"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."org_charts"
    ADD CONSTRAINT "org_charts_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id");



ALTER TABLE ONLY "public"."org_edges"
    ADD CONSTRAINT "org_edges_chart_id_fkey" FOREIGN KEY ("chart_id") REFERENCES "public"."org_charts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."org_edges"
    ADD CONSTRAINT "org_edges_source_id_fkey" FOREIGN KEY ("source_id") REFERENCES "public"."org_nodes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."org_edges"
    ADD CONSTRAINT "org_edges_target_id_fkey" FOREIGN KEY ("target_id") REFERENCES "public"."org_nodes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."org_edges"
    ADD CONSTRAINT "org_edges_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id");



ALTER TABLE ONLY "public"."org_node_types"
    ADD CONSTRAINT "org_node_types_chart_id_fkey" FOREIGN KEY ("chart_id") REFERENCES "public"."org_charts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."org_node_types"
    ADD CONSTRAINT "org_node_types_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id");



ALTER TABLE ONLY "public"."org_nodes"
    ADD CONSTRAINT "org_nodes_attached_to_node_id_fkey" FOREIGN KEY ("attached_to_node_id") REFERENCES "public"."org_nodes"("id");



ALTER TABLE ONLY "public"."org_nodes"
    ADD CONSTRAINT "org_nodes_chart_id_fkey" FOREIGN KEY ("chart_id") REFERENCES "public"."org_charts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."org_nodes"
    ADD CONSTRAINT "org_nodes_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."org_nodes"
    ADD CONSTRAINT "org_nodes_parent_container_id_fkey" FOREIGN KEY ("parent_container_id") REFERENCES "public"."org_nodes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."org_nodes"
    ADD CONSTRAINT "org_nodes_position_id_fkey" FOREIGN KEY ("position_id") REFERENCES "public"."positions"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."org_nodes"
    ADD CONSTRAINT "org_nodes_senior_node_id_fkey" FOREIGN KEY ("senior_node_id") REFERENCES "public"."org_nodes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."org_nodes"
    ADD CONSTRAINT "org_nodes_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id");



ALTER TABLE ONLY "public"."org_nodes"
    ADD CONSTRAINT "org_nodes_type_id_fkey" FOREIGN KEY ("type_id") REFERENCES "public"."org_node_types"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."package_requests"
    ADD CONSTRAINT "package_requests_package_id_fkey" FOREIGN KEY ("package_id") REFERENCES "public"."packages"("id");



ALTER TABLE ONLY "public"."package_requests"
    ADD CONSTRAINT "package_requests_requested_by_fkey" FOREIGN KEY ("requested_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."package_requests"
    ADD CONSTRAINT "package_requests_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."paver_prices"
    ADD CONSTRAINT "paver_prices_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id");



ALTER TABLE ONLY "public"."pbs_drive_members"
    ADD CONSTRAINT "pbs_drive_members_drive_id_fkey" FOREIGN KEY ("drive_id") REFERENCES "public"."pbs_drives"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pbs_drive_members"
    ADD CONSTRAINT "pbs_drive_members_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id");



ALTER TABLE ONLY "public"."pbs_drive_members"
    ADD CONSTRAINT "pbs_drive_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pbs_drives"
    ADD CONSTRAINT "pbs_drives_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."pbs_drives"
    ADD CONSTRAINT "pbs_drives_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id");



ALTER TABLE ONLY "public"."position_courses"
    ADD CONSTRAINT "position_courses_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "public"."lms_courses"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."position_courses"
    ADD CONSTRAINT "position_courses_position_id_fkey" FOREIGN KEY ("position_id") REFERENCES "public"."positions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."position_courses"
    ADD CONSTRAINT "position_courses_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id");



ALTER TABLE ONLY "public"."positions"
    ADD CONSTRAINT "positions_source_chart_id_fkey" FOREIGN KEY ("source_chart_id") REFERENCES "public"."org_charts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."positions"
    ADD CONSTRAINT "positions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id");



ALTER TABLE ONLY "public"."price_sheet_imports"
    ADD CONSTRAINT "price_sheet_imports_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."price_sheet_imports"
    ADD CONSTRAINT "price_sheet_imports_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "public"."subs_vendors"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id");



ALTER TABLE ONLY "public"."projects"
    ADD CONSTRAINT "projects_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id");



ALTER TABLE ONLY "public"."qb_connection"
    ADD CONSTRAINT "qb_connection_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id");



ALTER TABLE ONLY "public"."qb_session"
    ADD CONSTRAINT "qb_session_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id");



ALTER TABLE ONLY "public"."qb_sync_log"
    ADD CONSTRAINT "qb_sync_log_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id");



ALTER TABLE ONLY "public"."qb_sync_state"
    ADD CONSTRAINT "qb_sync_state_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id");



ALTER TABLE ONLY "public"."qb_time_tracking"
    ADD CONSTRAINT "qb_time_tracking_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id");



ALTER TABLE ONLY "public"."reward_transactions"
    ADD CONSTRAINT "reward_transactions_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reward_transactions"
    ADD CONSTRAINT "reward_transactions_game_id_fkey" FOREIGN KEY ("game_id") REFERENCES "public"."reward_games"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."reward_transactions"
    ADD CONSTRAINT "reward_transactions_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."reward_transactions"
    ADD CONSTRAINT "reward_transactions_rule_id_fkey" FOREIGN KEY ("rule_id") REFERENCES "public"."reward_rules"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."sales_appointments"
    ADD CONSTRAINT "sales_appointments_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."sales_appointments"
    ADD CONSTRAINT "sales_appointments_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."sales_appointments"
    ADD CONSTRAINT "sales_appointments_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id");



ALTER TABLE ONLY "public"."schedule_items"
    ADD CONSTRAINT "schedule_items_crew_id_fkey" FOREIGN KEY ("crew_id") REFERENCES "public"."crews"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."schedule_items"
    ADD CONSTRAINT "schedule_items_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."schedule_items"
    ADD CONSTRAINT "schedule_items_sub_id_fkey" FOREIGN KEY ("sub_id") REFERENCES "public"."subs_vendors"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."schedule_items"
    ADD CONSTRAINT "schedule_items_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id");



ALTER TABLE ONLY "public"."stat_groups"
    ADD CONSTRAINT "stat_groups_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."stat_groups"
    ADD CONSTRAINT "stat_groups_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id");



ALTER TABLE ONLY "public"."stat_import_export_log"
    ADD CONSTRAINT "stat_import_export_log_performed_by_fkey" FOREIGN KEY ("performed_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."stat_import_export_log"
    ADD CONSTRAINT "stat_import_export_log_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id");



ALTER TABLE ONLY "public"."stat_notes"
    ADD CONSTRAINT "stat_notes_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."stat_notes"
    ADD CONSTRAINT "stat_notes_statistic_id_fkey" FOREIGN KEY ("statistic_id") REFERENCES "public"."statistics"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."stat_notes"
    ADD CONSTRAINT "stat_notes_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id");



ALTER TABLE ONLY "public"."stat_reminder_log"
    ADD CONSTRAINT "stat_reminder_log_statistic_id_fkey" FOREIGN KEY ("statistic_id") REFERENCES "public"."statistics"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."stat_reminder_log"
    ADD CONSTRAINT "stat_reminder_log_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id");



ALTER TABLE ONLY "public"."stat_reminders"
    ADD CONSTRAINT "stat_reminders_statistic_id_fkey" FOREIGN KEY ("statistic_id") REFERENCES "public"."statistics"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."stat_reminders"
    ADD CONSTRAINT "stat_reminders_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id");



ALTER TABLE ONLY "public"."stat_sources"
    ADD CONSTRAINT "stat_sources_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."statistic_shares"
    ADD CONSTRAINT "statistic_shares_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."statistic_shares"
    ADD CONSTRAINT "statistic_shares_statistic_id_fkey" FOREIGN KEY ("statistic_id") REFERENCES "public"."statistics"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."statistic_shares"
    ADD CONSTRAINT "statistic_shares_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id");



ALTER TABLE ONLY "public"."statistic_shares"
    ADD CONSTRAINT "statistic_shares_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."statistic_values"
    ADD CONSTRAINT "statistic_values_entered_by_fkey" FOREIGN KEY ("entered_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."statistic_values"
    ADD CONSTRAINT "statistic_values_statistic_id_fkey" FOREIGN KEY ("statistic_id") REFERENCES "public"."statistics"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."statistic_values"
    ADD CONSTRAINT "statistic_values_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id");



ALTER TABLE ONLY "public"."statistics"
    ADD CONSTRAINT "statistics_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."statistics"
    ADD CONSTRAINT "statistics_owner_position_id_fkey" FOREIGN KEY ("owner_position_id") REFERENCES "public"."positions"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."statistics"
    ADD CONSTRAINT "statistics_owner_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."statistics"
    ADD CONSTRAINT "statistics_source_stat_id_fkey" FOREIGN KEY ("source_stat_id") REFERENCES "public"."statistics"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."statistics"
    ADD CONSTRAINT "statistics_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id");



ALTER TABLE ONLY "public"."sub_vendor_contracts"
    ADD CONSTRAINT "sub_vendor_contracts_sub_vendor_id_fkey" FOREIGN KEY ("sub_vendor_id") REFERENCES "public"."subs_vendors"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."sub_vendor_contracts"
    ADD CONSTRAINT "sub_vendor_contracts_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id");



ALTER TABLE ONLY "public"."sub_vendor_quotes"
    ADD CONSTRAINT "sub_vendor_quotes_estimate_id_fkey" FOREIGN KEY ("estimate_id") REFERENCES "public"."estimates"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."sub_vendor_quotes"
    ADD CONSTRAINT "sub_vendor_quotes_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."sub_vendor_quotes"
    ADD CONSTRAINT "sub_vendor_quotes_sub_vendor_id_fkey" FOREIGN KEY ("sub_vendor_id") REFERENCES "public"."subs_vendors"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."sub_vendor_quotes"
    ADD CONSTRAINT "sub_vendor_quotes_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id");



ALTER TABLE ONLY "public"."subcategory"
    ADD CONSTRAINT "subcategory_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."category"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."subcategory"
    ADD CONSTRAINT "subcategory_default_vendor_id_fkey" FOREIGN KEY ("default_vendor_id") REFERENCES "public"."subs_vendors"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."subcategory"
    ADD CONSTRAINT "subcategory_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."subcontractor_category"
    ADD CONSTRAINT "subcontractor_category_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."subcontractor_rates"
    ADD CONSTRAINT "subcontractor_rates_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."subcontractor_rates"
    ADD CONSTRAINT "subcontractor_rates_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id");



ALTER TABLE ONLY "public"."subcontractor_rates"
    ADD CONSTRAINT "subcontractor_rates_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "public"."subs_vendors"("id");



ALTER TABLE ONLY "public"."subcontractor_subcategory"
    ADD CONSTRAINT "subcontractor_subcategory_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."subcontractor_category"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."subcontractor_subcategory"
    ADD CONSTRAINT "subcontractor_subcategory_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."subs_vendors"
    ADD CONSTRAINT "subs_vendors_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id");



ALTER TABLE ONLY "public"."task_categories"
    ADD CONSTRAINT "task_categories_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id");



ALTER TABLE ONLY "public"."task_descriptions"
    ADD CONSTRAINT "task_descriptions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id");



ALTER TABLE ONLY "public"."template_folders"
    ADD CONSTRAINT "template_folders_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "public"."job_templates"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."template_folders"
    ADD CONSTRAINT "template_folders_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id");



ALTER TABLE ONLY "public"."template_tasks"
    ADD CONSTRAINT "template_tasks_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "public"."job_templates"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."template_tasks"
    ADD CONSTRAINT "template_tasks_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id");



ALTER TABLE ONLY "public"."tenant_extensions"
    ADD CONSTRAINT "tenant_extensions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tenant_packages"
    ADD CONSTRAINT "tenant_packages_package_id_fkey" FOREIGN KEY ("package_id") REFERENCES "public"."packages"("id");



ALTER TABLE ONLY "public"."tenant_packages"
    ADD CONSTRAINT "tenant_packages_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tenant_payment_connections"
    ADD CONSTRAINT "tenant_payment_connections_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tenants"
    ADD CONSTRAINT "tenants_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "public"."plans"("id");



ALTER TABLE ONLY "public"."time_clock_breaks"
    ADD CONSTRAINT "time_clock_breaks_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id");



ALTER TABLE ONLY "public"."time_clock_breaks"
    ADD CONSTRAINT "time_clock_breaks_time_entry_id_fkey" FOREIGN KEY ("time_entry_id") REFERENCES "public"."time_entries"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."time_clock_permissions"
    ADD CONSTRAINT "time_clock_permissions_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."time_clock_permissions"
    ADD CONSTRAINT "time_clock_permissions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id");



ALTER TABLE ONLY "public"."time_entries"
    ADD CONSTRAINT "time_entries_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."time_entries"
    ADD CONSTRAINT "time_entries_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id");



ALTER TABLE ONLY "public"."time_entries"
    ADD CONSTRAINT "time_entries_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."time_entries"
    ADD CONSTRAINT "time_entries_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id");



ALTER TABLE ONLY "public"."user_permissions"
    ADD CONSTRAINT "user_permissions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id");



ALTER TABLE ONLY "public"."user_permissions"
    ADD CONSTRAINT "user_permissions_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."user_permissions"
    ADD CONSTRAINT "user_permissions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."vendor_catalogs"
    ADD CONSTRAINT "vendor_catalogs_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "public"."subs_vendors"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."vendor_invoice_lines"
    ADD CONSTRAINT "vendor_invoice_lines_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "public"."vendor_invoices"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."vendor_invoice_lines"
    ADD CONSTRAINT "vendor_invoice_lines_material_id_fkey" FOREIGN KEY ("material_id") REFERENCES "public"."material"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."vendor_invoice_lines"
    ADD CONSTRAINT "vendor_invoice_lines_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."vendor_invoices"
    ADD CONSTRAINT "vendor_invoices_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."vendor_invoices"
    ADD CONSTRAINT "vendor_invoices_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."vendor_invoices"
    ADD CONSTRAINT "vendor_invoices_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "public"."subs_vendors"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."view_rates_hidden"
    ADD CONSTRAINT "view_rates_hidden_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."website_leads"
    ADD CONSTRAINT "website_leads_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."website_leads"
    ADD CONSTRAINT "website_leads_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id");



ALTER TABLE ONLY "public"."website_leads"
    ADD CONSTRAINT "website_leads_website_id_fkey" FOREIGN KEY ("website_id") REFERENCES "public"."websites"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."website_pages"
    ADD CONSTRAINT "website_pages_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id");



ALTER TABLE ONLY "public"."website_pages"
    ADD CONSTRAINT "website_pages_website_id_fkey" FOREIGN KEY ("website_id") REFERENCES "public"."websites"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."websites"
    ADD CONSTRAINT "websites_funnel_id_fkey" FOREIGN KEY ("funnel_id") REFERENCES "public"."funnels"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."websites"
    ADD CONSTRAINT "websites_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id");



ALTER TABLE ONLY "public"."work_orders"
    ADD CONSTRAINT "work_orders_estimate_module_id_fkey" FOREIGN KEY ("estimate_module_id") REFERENCES "public"."estimate_modules"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."work_orders"
    ADD CONSTRAINT "work_orders_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."work_orders"
    ADD CONSTRAINT "work_orders_scheduled_crew_id_fkey" FOREIGN KEY ("scheduled_crew_id") REFERENCES "public"."crews"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."work_orders"
    ADD CONSTRAINT "work_orders_scheduled_sub_id_fkey" FOREIGN KEY ("scheduled_sub_id") REFERENCES "public"."subs_vendors"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."work_orders"
    ADD CONSTRAINT "work_orders_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id");



ALTER TABLE ONLY "public"."workday_exceptions"
    ADD CONSTRAINT "workday_exceptions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id");



ALTER TABLE ONLY "public"."workflow_types"
    ADD CONSTRAINT "workflow_types_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id");



CREATE POLICY "Allow all for authenticated" ON "public"."reward_games" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Allow all for authenticated" ON "public"."reward_rules" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Allow all for authenticated" ON "public"."reward_transactions" TO "authenticated" USING (true) WITH CHECK (true);



ALTER TABLE "public"."acct_accounts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."acct_bank_accounts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."acct_bank_transactions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."acct_bill_lines" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."acct_bills" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."acct_check_lines" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."acct_checks" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."acct_credit_card_charge_lines" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."acct_credit_card_charges" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."acct_invoice_lines" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."acct_invoices" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."acct_item_receipt_lines" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."acct_item_receipts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."acct_journal_entries" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."acct_journal_entry_lines" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."acct_journal_lines" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."acct_payments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."actual_entries" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."agent_conversations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."agent_message_attachments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."agent_messages" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."agent_tool_calls" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."agent_user_preferences" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."applicants" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "auth all" ON "public"."org_chart_template_categories" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "auth all" ON "public"."org_chart_template_subcategories" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "auth all" ON "public"."org_chart_templates" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "auth all" ON "public"."org_chart_wizard_feedback" TO "authenticated" USING (true) WITH CHECK (true);



ALTER TABLE "public"."basic_labor_rates" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."bids" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."billing_payments" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "billing_payments_read" ON "public"."billing_payments" FOR SELECT TO "authenticated" USING (("tenant_id" = "public"."auth_tenant_id"()));



ALTER TABLE "public"."cad_drawings" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "cad_drawings_auth_all" ON "public"."cad_drawings" TO "authenticated" USING (true) WITH CHECK (true);



ALTER TABLE "public"."cancellation_feedback" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "cancellation_feedback_read" ON "public"."cancellation_feedback" FOR SELECT TO "authenticated" USING (("tenant_id" = "public"."auth_tenant_id"()));



ALTER TABLE "public"."category" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "category_rw" ON "public"."category" TO "authenticated" USING (("tenant_id" = "public"."auth_tenant_id"())) WITH CHECK (("tenant_id" = "public"."auth_tenant_id"()));



ALTER TABLE "public"."change_orders" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."client_payment_methods" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."client_portals" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."clients" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."code_changes" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "code_changes_read" ON "public"."code_changes" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."collection_financial" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."collection_payables" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."collection_rows" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."collection_weeks" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."collections" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."companies" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."company_communications" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."company_settings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."contact_communications" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."contacts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."crew_types" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."crews" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."daily_log_photos" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."daily_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."dashboard_appreciations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."dashboard_preferences" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."design_annotations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."design_files" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."design_projects" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."design_takeoff_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."edoc_documents" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."edoc_templates" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."edoc_workflows" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."employee_certifications" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."employee_documents" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."employee_files" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."employee_group_members" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."employee_groups" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."employee_positions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."employees" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."estimate_modules" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."estimate_projects" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."estimates" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "ext_formulas_cond_access_rw" ON "public"."ext_formulas_condition_access" TO "authenticated" USING (("public"."has_extension"('formulas'::"text") AND ("tenant_id" = "public"."auth_tenant_id"()))) WITH CHECK (("public"."has_extension"('formulas'::"text") AND ("tenant_id" = "public"."auth_tenant_id"())));



ALTER TABLE "public"."ext_formulas_condition_access" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ext_formulas_condition_steps" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "ext_formulas_condition_steps_rw" ON "public"."ext_formulas_condition_steps" TO "authenticated" USING (("public"."has_extension"('formulas'::"text") AND (EXISTS ( SELECT 1
   FROM "public"."ext_formulas_conditions" "c"
  WHERE (("c"."id" = "ext_formulas_condition_steps"."condition_id") AND (("c"."tenant_id" = "public"."auth_tenant_id"()) OR ("c"."tenant_id" IS NULL))))))) WITH CHECK (("public"."has_extension"('formulas'::"text") AND (EXISTS ( SELECT 1
   FROM "public"."ext_formulas_conditions" "c"
  WHERE (("c"."id" = "ext_formulas_condition_steps"."condition_id") AND ("c"."tenant_id" = "public"."auth_tenant_id"()))))));



ALTER TABLE "public"."ext_formulas_conditions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "ext_formulas_conditions_read" ON "public"."ext_formulas_conditions" FOR SELECT TO "authenticated" USING (("public"."has_extension"('formulas'::"text") AND (("tenant_id" = "public"."auth_tenant_id"()) OR ("tenant_id" IS NULL))));



CREATE POLICY "ext_formulas_conditions_write" ON "public"."ext_formulas_conditions" TO "authenticated" USING (("public"."has_extension"('formulas'::"text") AND ("tenant_id" = "public"."auth_tenant_id"()))) WITH CHECK (("public"."has_extension"('formulas'::"text") AND ("tenant_id" = "public"."auth_tenant_id"())));



ALTER TABLE "public"."ext_formulas_formulas" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "ext_formulas_formulas_rw" ON "public"."ext_formulas_formulas" TO "authenticated" USING (("public"."has_extension"('formulas'::"text") AND ("tenant_id" = "public"."auth_tenant_id"()))) WITH CHECK (("public"."has_extension"('formulas'::"text") AND ("tenant_id" = "public"."auth_tenant_id"())));



ALTER TABLE "public"."ext_formulas_steps" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "ext_formulas_steps_rw" ON "public"."ext_formulas_steps" TO "authenticated" USING (("public"."has_extension"('formulas'::"text") AND (EXISTS ( SELECT 1
   FROM "public"."ext_formulas_formulas" "f"
  WHERE (("f"."id" = "ext_formulas_steps"."formula_id") AND ("f"."tenant_id" = "public"."auth_tenant_id"())))))) WITH CHECK (("public"."has_extension"('formulas'::"text") AND (EXISTS ( SELECT 1
   FROM "public"."ext_formulas_formulas" "f"
  WHERE (("f"."id" = "ext_formulas_steps"."formula_id") AND ("f"."tenant_id" = "public"."auth_tenant_id"()))))));



ALTER TABLE "public"."ext_formulas_sub_conditions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "ext_formulas_sub_conditions_rw" ON "public"."ext_formulas_sub_conditions" TO "authenticated" USING (("public"."has_extension"('formulas'::"text") AND (EXISTS ( SELECT 1
   FROM "public"."ext_formulas_conditions" "c"
  WHERE (("c"."id" = "ext_formulas_sub_conditions"."condition_id") AND (("c"."tenant_id" = "public"."auth_tenant_id"()) OR ("c"."tenant_id" IS NULL))))))) WITH CHECK (("public"."has_extension"('formulas'::"text") AND (EXISTS ( SELECT 1
   FROM "public"."ext_formulas_conditions" "c"
  WHERE (("c"."id" = "ext_formulas_sub_conditions"."condition_id") AND ("c"."tenant_id" = "public"."auth_tenant_id"()))))));



ALTER TABLE "public"."ext_plans" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "ext_plans_read" ON "public"."ext_plans" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."feature_request_attachments" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "feature_request_attachments_support_all" ON "public"."feature_request_attachments" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."profiles" "p"
     JOIN "public"."tenants" "t" ON (("t"."id" = "p"."tenant_id")))
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."role" = ANY (ARRAY['admin'::"text", 'super_admin'::"text"])) AND "t"."is_support_tenant")))) WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."profiles" "p"
     JOIN "public"."tenants" "t" ON (("t"."id" = "p"."tenant_id")))
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."role" = ANY (ARRAY['admin'::"text", 'super_admin'::"text"])) AND "t"."is_support_tenant"))));



ALTER TABLE "public"."feature_requests" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "feature_requests_support_all" ON "public"."feature_requests" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."profiles" "p"
     JOIN "public"."tenants" "t" ON (("t"."id" = "p"."tenant_id")))
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."role" = ANY (ARRAY['admin'::"text", 'super_admin'::"text"])) AND "t"."is_support_tenant")))) WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."profiles" "p"
     JOIN "public"."tenants" "t" ON (("t"."id" = "p"."tenant_id")))
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."role" = ANY (ARRAY['admin'::"text", 'super_admin'::"text"])) AND "t"."is_support_tenant"))));



ALTER TABLE "public"."funnel_cards" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."funnel_stages" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."funnels" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."general_category" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "general_category_rw" ON "public"."general_category" TO "authenticated" USING (("tenant_id" = "public"."auth_tenant_id"())) WITH CHECK (("tenant_id" = "public"."auth_tenant_id"()));



ALTER TABLE "public"."general_subcategory" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "general_subcategory_rw" ON "public"."general_subcategory" TO "authenticated" USING (("tenant_id" = "public"."auth_tenant_id"())) WITH CHECK (("tenant_id" = "public"."auth_tenant_id"()));



ALTER TABLE "public"."ghl_connections" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ghl_opportunities" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ghl_sync_log" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ghl_sync_state" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."help_doc_categories" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "help_doc_categories_admin" ON "public"."help_doc_categories" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."role" = ANY (ARRAY['admin'::"text", 'super_admin'::"text"])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."role" = ANY (ARRAY['admin'::"text", 'super_admin'::"text"]))))));



CREATE POLICY "help_doc_categories_read" ON "public"."help_doc_categories" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."help_docs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "help_docs_admin" ON "public"."help_docs" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."role" = ANY (ARRAY['admin'::"text", 'super_admin'::"text"])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."role" = ANY (ARRAY['admin'::"text", 'super_admin'::"text"]))))));



CREATE POLICY "help_docs_read" ON "public"."help_docs" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."help_video_categories" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "help_video_categories_admin" ON "public"."help_video_categories" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."role" = ANY (ARRAY['admin'::"text", 'super_admin'::"text"])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."role" = ANY (ARRAY['admin'::"text", 'super_admin'::"text"]))))));



CREATE POLICY "help_video_categories_read" ON "public"."help_video_categories" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."help_videos" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "help_videos_admin" ON "public"."help_videos" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."role" = ANY (ARRAY['admin'::"text", 'super_admin'::"text"])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."role" = ANY (ARRAY['admin'::"text", 'super_admin'::"text"]))))));



CREATE POLICY "help_videos_read" ON "public"."help_videos" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."hr_review_forms" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."hr_reviews" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."job_expenses" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "job_expenses_rw" ON "public"."job_expenses" TO "authenticated" USING (("tenant_id" = "public"."auth_tenant_id"())) WITH CHECK (("tenant_id" = "public"."auth_tenant_id"()));



ALTER TABLE "public"."job_files" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."job_folders" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."job_invoice_lines" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."job_invoice_payments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."job_invoices" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."job_stages" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."job_tasks" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."job_templates" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."jobs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."labor_category" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "labor_category_rw" ON "public"."labor_category" TO "authenticated" USING (("tenant_id" = "public"."auth_tenant_id"())) WITH CHECK (("tenant_id" = "public"."auth_tenant_id"()));



ALTER TABLE "public"."labor_rates" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."labor_subcategory" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "labor_subcategory_rw" ON "public"."labor_subcategory" TO "authenticated" USING (("tenant_id" = "public"."auth_tenant_id"())) WITH CHECK (("tenant_id" = "public"."auth_tenant_id"()));



ALTER TABLE "public"."lms_actions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."lms_assignments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."lms_categories" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."lms_courses" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."lms_learning_drills" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."lms_quiz_attempts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."lms_quizzes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."lms_read_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."lms_step_completions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."lms_steps" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."lms_tests" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."lms_videos" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."master_equipment" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."master_sub_crews" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."material" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."material_categories" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "material_categories_rw" ON "public"."material_categories" TO "authenticated" USING (("tenant_id" = "public"."auth_tenant_id"())) WITH CHECK (("tenant_id" = "public"."auth_tenant_id"()));



ALTER TABLE "public"."material_price" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "material_price_rw" ON "public"."material_price" TO "authenticated" USING (("tenant_id" = "public"."auth_tenant_id"())) WITH CHECK (("tenant_id" = "public"."auth_tenant_id"()));



CREATE POLICY "material_rw" ON "public"."material" TO "authenticated" USING (("tenant_id" = "public"."auth_tenant_id"())) WITH CHECK (("tenant_id" = "public"."auth_tenant_id"()));



ALTER TABLE "public"."misc_rates" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "misc_rates_rw" ON "public"."misc_rates" TO "authenticated" USING (("tenant_id" = "public"."auth_tenant_id"())) WITH CHECK (("tenant_id" = "public"."auth_tenant_id"()));



ALTER TABLE "public"."module_category_map" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "module_category_map_rw" ON "public"."module_category_map" TO "authenticated" USING (("tenant_id" = "public"."auth_tenant_id"())) WITH CHECK (("tenant_id" = "public"."auth_tenant_id"()));



ALTER TABLE "public"."module_equipment_map" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."module_field_equipment_map" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."modules" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."org_chart_template_categories" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."org_chart_template_subcategories" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."org_chart_templates" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."org_chart_wizard_feedback" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."org_charts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."org_edges" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."org_node_types" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."org_nodes" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "own appreciations delete" ON "public"."dashboard_appreciations" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "own appreciations insert" ON "public"."dashboard_appreciations" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "own appreciations select" ON "public"."dashboard_appreciations" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "own appreciations update" ON "public"."dashboard_appreciations" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."package_requests" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "package_requests_read" ON "public"."package_requests" FOR SELECT TO "authenticated" USING (("tenant_id" = "public"."auth_tenant_id"()));



ALTER TABLE "public"."paver_prices" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."pbs_drive_members" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."pbs_drives" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."position_courses" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."positions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."price_sheet_imports" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "price_sheet_imports_rw" ON "public"."price_sheet_imports" TO "authenticated" USING (("tenant_id" = "public"."auth_tenant_id"())) WITH CHECK (("tenant_id" = "public"."auth_tenant_id"()));



ALTER TABLE "public"."product_type" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "product_type_read" ON "public"."product_type" FOR SELECT USING (true);



ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."projects" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."qb_connection" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."qb_session" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."qb_sync_log" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."qb_sync_state" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."qb_time_tracking" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."reward_games" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."reward_rules" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."reward_transactions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."sales_appointments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."sam_counter" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."sam_public_usage" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."schedule_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."stat_groups" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."stat_import_export_log" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."stat_notes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."stat_reminder_log" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."stat_reminders" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."stat_sources" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "stat_sources_rw" ON "public"."stat_sources" TO "authenticated" USING (("tenant_id" = "public"."auth_tenant_id"())) WITH CHECK (("tenant_id" = "public"."auth_tenant_id"()));



ALTER TABLE "public"."statistic_shares" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."statistic_values" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."statistics" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."sub_vendor_contracts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."sub_vendor_quotes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."subcategory" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "subcategory_rw" ON "public"."subcategory" TO "authenticated" USING (("tenant_id" = "public"."auth_tenant_id"())) WITH CHECK (("tenant_id" = "public"."auth_tenant_id"()));



ALTER TABLE "public"."subcontractor_category" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "subcontractor_category_rw" ON "public"."subcontractor_category" TO "authenticated" USING (("tenant_id" = "public"."auth_tenant_id"())) WITH CHECK (("tenant_id" = "public"."auth_tenant_id"()));



ALTER TABLE "public"."subcontractor_rates" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."subcontractor_subcategory" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "subcontractor_subcategory_rw" ON "public"."subcontractor_subcategory" TO "authenticated" USING (("tenant_id" = "public"."auth_tenant_id"())) WITH CHECK (("tenant_id" = "public"."auth_tenant_id"()));



ALTER TABLE "public"."subs_vendors" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."task_categories" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."task_descriptions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."template_folders" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."template_tasks" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tenant_extensions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "tenant_extensions_read" ON "public"."tenant_extensions" FOR SELECT TO "authenticated" USING (("tenant_id" = "public"."auth_tenant_id"()));



CREATE POLICY "tenant_isolation" ON "public"."acct_accounts" TO "authenticated" USING (("tenant_id" = "public"."auth_tenant_id"())) WITH CHECK (("tenant_id" = "public"."auth_tenant_id"()));



CREATE POLICY "tenant_isolation" ON "public"."acct_bank_accounts" TO "authenticated" USING (("tenant_id" = "public"."auth_tenant_id"())) WITH CHECK (("tenant_id" = "public"."auth_tenant_id"()));



CREATE POLICY "tenant_isolation" ON "public"."acct_bank_transactions" TO "authenticated" USING (("tenant_id" = "public"."auth_tenant_id"())) WITH CHECK (("tenant_id" = "public"."auth_tenant_id"()));



CREATE POLICY "tenant_isolation" ON "public"."acct_bill_lines" TO "authenticated" USING (("tenant_id" = "public"."auth_tenant_id"())) WITH CHECK (("tenant_id" = "public"."auth_tenant_id"()));



CREATE POLICY "tenant_isolation" ON "public"."acct_bills" TO "authenticated" USING (("tenant_id" = "public"."auth_tenant_id"())) WITH CHECK (("tenant_id" = "public"."auth_tenant_id"()));



CREATE POLICY "tenant_isolation" ON "public"."acct_check_lines" TO "authenticated" USING (("tenant_id" = "public"."auth_tenant_id"())) WITH CHECK (("tenant_id" = "public"."auth_tenant_id"()));



CREATE POLICY "tenant_isolation" ON "public"."acct_checks" TO "authenticated" USING (("tenant_id" = "public"."auth_tenant_id"())) WITH CHECK (("tenant_id" = "public"."auth_tenant_id"()));



CREATE POLICY "tenant_isolation" ON "public"."acct_credit_card_charge_lines" TO "authenticated" USING (("tenant_id" = "public"."auth_tenant_id"())) WITH CHECK (("tenant_id" = "public"."auth_tenant_id"()));



CREATE POLICY "tenant_isolation" ON "public"."acct_credit_card_charges" TO "authenticated" USING (("tenant_id" = "public"."auth_tenant_id"())) WITH CHECK (("tenant_id" = "public"."auth_tenant_id"()));



CREATE POLICY "tenant_isolation" ON "public"."acct_invoice_lines" TO "authenticated" USING (("tenant_id" = "public"."auth_tenant_id"())) WITH CHECK (("tenant_id" = "public"."auth_tenant_id"()));



CREATE POLICY "tenant_isolation" ON "public"."acct_invoices" TO "authenticated" USING (("tenant_id" = "public"."auth_tenant_id"())) WITH CHECK (("tenant_id" = "public"."auth_tenant_id"()));



CREATE POLICY "tenant_isolation" ON "public"."acct_item_receipt_lines" TO "authenticated" USING (("tenant_id" = "public"."auth_tenant_id"())) WITH CHECK (("tenant_id" = "public"."auth_tenant_id"()));



CREATE POLICY "tenant_isolation" ON "public"."acct_item_receipts" TO "authenticated" USING (("tenant_id" = "public"."auth_tenant_id"())) WITH CHECK (("tenant_id" = "public"."auth_tenant_id"()));



CREATE POLICY "tenant_isolation" ON "public"."acct_journal_entries" TO "authenticated" USING (("tenant_id" = "public"."auth_tenant_id"())) WITH CHECK (("tenant_id" = "public"."auth_tenant_id"()));



CREATE POLICY "tenant_isolation" ON "public"."acct_journal_entry_lines" TO "authenticated" USING (("tenant_id" = "public"."auth_tenant_id"())) WITH CHECK (("tenant_id" = "public"."auth_tenant_id"()));



CREATE POLICY "tenant_isolation" ON "public"."acct_journal_lines" TO "authenticated" USING (("tenant_id" = "public"."auth_tenant_id"())) WITH CHECK (("tenant_id" = "public"."auth_tenant_id"()));



CREATE POLICY "tenant_isolation" ON "public"."acct_payments" TO "authenticated" USING (("tenant_id" = "public"."auth_tenant_id"())) WITH CHECK (("tenant_id" = "public"."auth_tenant_id"()));



CREATE POLICY "tenant_isolation" ON "public"."actual_entries" TO "authenticated" USING (("tenant_id" = "public"."auth_tenant_id"())) WITH CHECK (("tenant_id" = "public"."auth_tenant_id"()));



CREATE POLICY "tenant_isolation" ON "public"."agent_conversations" TO "authenticated" USING (("tenant_id" = "public"."auth_tenant_id"())) WITH CHECK (("tenant_id" = "public"."auth_tenant_id"()));



CREATE POLICY "tenant_isolation" ON "public"."agent_message_attachments" TO "authenticated" USING (("tenant_id" = "public"."auth_tenant_id"())) WITH CHECK (("tenant_id" = "public"."auth_tenant_id"()));



CREATE POLICY "tenant_isolation" ON "public"."agent_messages" TO "authenticated" USING (("tenant_id" = "public"."auth_tenant_id"())) WITH CHECK (("tenant_id" = "public"."auth_tenant_id"()));



CREATE POLICY "tenant_isolation" ON "public"."agent_tool_calls" TO "authenticated" USING (("tenant_id" = "public"."auth_tenant_id"())) WITH CHECK (("tenant_id" = "public"."auth_tenant_id"()));



CREATE POLICY "tenant_isolation" ON "public"."agent_user_preferences" TO "authenticated" USING (("tenant_id" = "public"."auth_tenant_id"())) WITH CHECK (("tenant_id" = "public"."auth_tenant_id"()));



CREATE POLICY "tenant_isolation" ON "public"."applicants" TO "authenticated" USING (("tenant_id" = "public"."auth_tenant_id"())) WITH CHECK (("tenant_id" = "public"."auth_tenant_id"()));



CREATE POLICY "tenant_isolation" ON "public"."basic_labor_rates" USING (("tenant_id" = "public"."auth_tenant_id"())) WITH CHECK (("tenant_id" = "public"."auth_tenant_id"()));



CREATE POLICY "tenant_isolation" ON "public"."bids" TO "authenticated" USING (("tenant_id" = "public"."auth_tenant_id"())) WITH CHECK (("tenant_id" = "public"."auth_tenant_id"()));



CREATE POLICY "tenant_isolation" ON "public"."cancellation_feedback" TO "authenticated" USING (("tenant_id" = "public"."auth_tenant_id"())) WITH CHECK (("tenant_id" = "public"."auth_tenant_id"()));



CREATE POLICY "tenant_isolation" ON "public"."change_orders" TO "authenticated" USING (("tenant_id" = "public"."auth_tenant_id"())) WITH CHECK (("tenant_id" = "public"."auth_tenant_id"()));



CREATE POLICY "tenant_isolation" ON "public"."client_payment_methods" TO "authenticated" USING (("tenant_id" = "public"."auth_tenant_id"())) WITH CHECK (("tenant_id" = "public"."auth_tenant_id"()));



CREATE POLICY "tenant_isolation" ON "public"."client_portals" TO "authenticated" USING (("tenant_id" = "public"."auth_tenant_id"())) WITH CHECK (("tenant_id" = "public"."auth_tenant_id"()));



CREATE POLICY "tenant_isolation" ON "public"."clients" TO "authenticated" USING (("tenant_id" = "public"."auth_tenant_id"())) WITH CHECK (("tenant_id" = "public"."auth_tenant_id"()));



CREATE POLICY "tenant_isolation" ON "public"."collection_financial" TO "authenticated" USING (("tenant_id" = "public"."auth_tenant_id"())) WITH CHECK (("tenant_id" = "public"."auth_tenant_id"()));



CREATE POLICY "tenant_isolation" ON "public"."collection_payables" TO "authenticated" USING (("tenant_id" = "public"."auth_tenant_id"())) WITH CHECK (("tenant_id" = "public"."auth_tenant_id"()));



CREATE POLICY "tenant_isolation" ON "public"."collection_rows" TO "authenticated" USING (("tenant_id" = "public"."auth_tenant_id"())) WITH CHECK (("tenant_id" = "public"."auth_tenant_id"()));



CREATE POLICY "tenant_isolation" ON "public"."collection_weeks" TO "authenticated" USING (("tenant_id" = "public"."auth_tenant_id"())) WITH CHECK (("tenant_id" = "public"."auth_tenant_id"()));



CREATE POLICY "tenant_isolation" ON "public"."collections" TO "authenticated" USING (("tenant_id" = "public"."auth_tenant_id"())) WITH CHECK (("tenant_id" = "public"."auth_tenant_id"()));



CREATE POLICY "tenant_isolation" ON "public"."companies" TO "authenticated" USING (("tenant_id" = "public"."auth_tenant_id"())) WITH CHECK (("tenant_id" = "public"."auth_tenant_id"()));



CREATE POLICY "tenant_isolation" ON "public"."company_communications" TO "authenticated" USING (("tenant_id" = "public"."auth_tenant_id"())) WITH CHECK (("tenant_id" = "public"."auth_tenant_id"()));



CREATE POLICY "tenant_isolation" ON "public"."company_settings" TO "authenticated" USING (("tenant_id" = "public"."auth_tenant_id"())) WITH CHECK (("tenant_id" = "public"."auth_tenant_id"()));



CREATE POLICY "tenant_isolation" ON "public"."contact_communications" TO "authenticated" USING (("tenant_id" = "public"."auth_tenant_id"())) WITH CHECK (("tenant_id" = "public"."auth_tenant_id"()));



CREATE POLICY "tenant_isolation" ON "public"."contacts" TO "authenticated" USING (("tenant_id" = "public"."auth_tenant_id"())) WITH CHECK (("tenant_id" = "public"."auth_tenant_id"()));



CREATE POLICY "tenant_isolation" ON "public"."crew_types" TO "authenticated" USING (("tenant_id" = "public"."auth_tenant_id"())) WITH CHECK (("tenant_id" = "public"."auth_tenant_id"()));



CREATE POLICY "tenant_isolation" ON "public"."crews" TO "authenticated" USING (("tenant_id" = "public"."auth_tenant_id"())) WITH CHECK (("tenant_id" = "public"."auth_tenant_id"()));



CREATE POLICY "tenant_isolation" ON "public"."daily_log_photos" TO "authenticated" USING (("tenant_id" = "public"."auth_tenant_id"())) WITH CHECK (("tenant_id" = "public"."auth_tenant_id"()));



CREATE POLICY "tenant_isolation" ON "public"."daily_logs" TO "authenticated" USING (("tenant_id" = "public"."auth_tenant_id"())) WITH CHECK (("tenant_id" = "public"."auth_tenant_id"()));



CREATE POLICY "tenant_isolation" ON "public"."dashboard_preferences" TO "authenticated" USING (("tenant_id" = "public"."auth_tenant_id"())) WITH CHECK (("tenant_id" = "public"."auth_tenant_id"()));



CREATE POLICY "tenant_isolation" ON "public"."design_annotations" TO "authenticated" USING (("tenant_id" = "public"."auth_tenant_id"())) WITH CHECK (("tenant_id" = "public"."auth_tenant_id"()));



CREATE POLICY "tenant_isolation" ON "public"."design_files" TO "authenticated" USING (("tenant_id" = "public"."auth_tenant_id"())) WITH CHECK (("tenant_id" = "public"."auth_tenant_id"()));



CREATE POLICY "tenant_isolation" ON "public"."design_projects" TO "authenticated" USING (("tenant_id" = "public"."auth_tenant_id"())) WITH CHECK (("tenant_id" = "public"."auth_tenant_id"()));



CREATE POLICY "tenant_isolation" ON "public"."design_takeoff_items" TO "authenticated" USING (("tenant_id" = "public"."auth_tenant_id"())) WITH CHECK (("tenant_id" = "public"."auth_tenant_id"()));



CREATE POLICY "tenant_isolation" ON "public"."edoc_documents" TO "authenticated" USING (("tenant_id" = "public"."auth_tenant_id"())) WITH CHECK (("tenant_id" = "public"."auth_tenant_id"()));



CREATE POLICY "tenant_isolation" ON "public"."edoc_templates" TO "authenticated" USING (("tenant_id" = "public"."auth_tenant_id"())) WITH CHECK (("tenant_id" = "public"."auth_tenant_id"()));



CREATE POLICY "tenant_isolation" ON "public"."edoc_workflows" TO "authenticated" USING (("tenant_id" = "public"."auth_tenant_id"())) WITH CHECK (("tenant_id" = "public"."auth_tenant_id"()));



CREATE POLICY "tenant_isolation" ON "public"."employee_certifications" TO "authenticated" USING (("tenant_id" = "public"."auth_tenant_id"())) WITH CHECK (("tenant_id" = "public"."auth_tenant_id"()));



CREATE POLICY "tenant_isolation" ON "public"."employee_documents" TO "authenticated" USING (("tenant_id" = "public"."auth_tenant_id"())) WITH CHECK (("tenant_id" = "public"."auth_tenant_id"()));



CREATE POLICY "tenant_isolation" ON "public"."employee_files" TO "authenticated" USING (("tenant_id" = "public"."auth_tenant_id"())) WITH CHECK (("tenant_id" = "public"."auth_tenant_id"()));



CREATE POLICY "tenant_isolation" ON "public"."employee_group_members" TO "authenticated" USING (("tenant_id" = "public"."auth_tenant_id"())) WITH CHECK (("tenant_id" = "public"."auth_tenant_id"()));



CREATE POLICY "tenant_isolation" ON "public"."employee_groups" TO "authenticated" USING (("tenant_id" = "public"."auth_tenant_id"())) WITH CHECK (("tenant_id" = "public"."auth_tenant_id"()));



CREATE POLICY "tenant_isolation" ON "public"."employee_positions" TO "authenticated" USING (("tenant_id" = "public"."auth_tenant_id"())) WITH CHECK (("tenant_id" = "public"."auth_tenant_id"()));



CREATE POLICY "tenant_isolation" ON "public"."employees" TO "authenticated" USING (("tenant_id" = "public"."auth_tenant_id"())) WITH CHECK (("tenant_id" = "public"."auth_tenant_id"()));



CREATE POLICY "tenant_isolation" ON "public"."estimate_modules" TO "authenticated" USING (("tenant_id" = "public"."auth_tenant_id"())) WITH CHECK (("tenant_id" = "public"."auth_tenant_id"()));



CREATE POLICY "tenant_isolation" ON "public"."estimate_projects" TO "authenticated" USING (("tenant_id" = "public"."auth_tenant_id"())) WITH CHECK (("tenant_id" = "public"."auth_tenant_id"()));



CREATE POLICY "tenant_isolation" ON "public"."estimates" TO "authenticated" USING (("tenant_id" = "public"."auth_tenant_id"())) WITH CHECK (("tenant_id" = "public"."auth_tenant_id"()));



CREATE POLICY "tenant_isolation" ON "public"."feature_request_attachments" TO "authenticated" USING (("tenant_id" = "public"."auth_tenant_id"())) WITH CHECK (("tenant_id" = "public"."auth_tenant_id"()));



CREATE POLICY "tenant_isolation" ON "public"."feature_requests" TO "authenticated" USING (("tenant_id" = "public"."auth_tenant_id"())) WITH CHECK (("tenant_id" = "public"."auth_tenant_id"()));



CREATE POLICY "tenant_isolation" ON "public"."funnel_cards" TO "authenticated" USING (("tenant_id" = "public"."auth_tenant_id"())) WITH CHECK (("tenant_id" = "public"."auth_tenant_id"()));



CREATE POLICY "tenant_isolation" ON "public"."funnel_stages" TO "authenticated" USING (("tenant_id" = "public"."auth_tenant_id"())) WITH CHECK (("tenant_id" = "public"."auth_tenant_id"()));



CREATE POLICY "tenant_isolation" ON "public"."funnels" TO "authenticated" USING (("tenant_id" = "public"."auth_tenant_id"())) WITH CHECK (("tenant_id" = "public"."auth_tenant_id"()));



CREATE POLICY "tenant_isolation" ON "public"."ghl_connections" TO "authenticated" USING (("tenant_id" = "public"."auth_tenant_id"())) WITH CHECK (("tenant_id" = "public"."auth_tenant_id"()));



CREATE POLICY "tenant_isolation" ON "public"."ghl_opportunities" TO "authenticated" USING (("tenant_id" = "public"."auth_tenant_id"())) WITH CHECK (("tenant_id" = "public"."auth_tenant_id"()));



CREATE POLICY "tenant_isolation" ON "public"."ghl_sync_log" TO "authenticated" USING (("tenant_id" = "public"."auth_tenant_id"())) WITH CHECK (("tenant_id" = "public"."auth_tenant_id"()));



CREATE POLICY "tenant_isolation" ON "public"."ghl_sync_state" TO "authenticated" USING (("tenant_id" = "public"."auth_tenant_id"())) WITH CHECK (("tenant_id" = "public"."auth_tenant_id"()));



CREATE POLICY "tenant_isolation" ON "public"."hr_review_forms" TO "authenticated" USING (("tenant_id" = "public"."auth_tenant_id"())) WITH CHECK (("tenant_id" = "public"."auth_tenant_id"()));



CREATE POLICY "tenant_isolation" ON "public"."hr_reviews" TO "authenticated" USING (("tenant_id" = "public"."auth_tenant_id"())) WITH CHECK (("tenant_id" = "public"."auth_tenant_id"()));



CREATE POLICY "tenant_isolation" ON "public"."job_files" TO "authenticated" USING (("tenant_id" = "public"."auth_tenant_id"())) WITH CHECK (("tenant_id" = "public"."auth_tenant_id"()));



CREATE POLICY "tenant_isolation" ON "public"."job_folders" TO "authenticated" USING (("tenant_id" = "public"."auth_tenant_id"())) WITH CHECK (("tenant_id" = "public"."auth_tenant_id"()));



CREATE POLICY "tenant_isolation" ON "public"."job_invoice_lines" TO "authenticated" USING (("tenant_id" = "public"."auth_tenant_id"())) WITH CHECK (("tenant_id" = "public"."auth_tenant_id"()));



CREATE POLICY "tenant_isolation" ON "public"."job_invoice_payments" TO "authenticated" USING (("tenant_id" = "public"."auth_tenant_id"())) WITH CHECK (("tenant_id" = "public"."auth_tenant_id"()));



CREATE POLICY "tenant_isolation" ON "public"."job_invoices" TO "authenticated" USING (("tenant_id" = "public"."auth_tenant_id"())) WITH CHECK (("tenant_id" = "public"."auth_tenant_id"()));



CREATE POLICY "tenant_isolation" ON "public"."job_stages" TO "authenticated" USING (("tenant_id" = "public"."auth_tenant_id"())) WITH CHECK (("tenant_id" = "public"."auth_tenant_id"()));



CREATE POLICY "tenant_isolation" ON "public"."job_tasks" TO "authenticated" USING (("tenant_id" = "public"."auth_tenant_id"())) WITH CHECK (("tenant_id" = "public"."auth_tenant_id"()));



CREATE POLICY "tenant_isolation" ON "public"."job_templates" TO "authenticated" USING (("tenant_id" = "public"."auth_tenant_id"())) WITH CHECK (("tenant_id" = "public"."auth_tenant_id"()));



CREATE POLICY "tenant_isolation" ON "public"."jobs" TO "authenticated" USING (("tenant_id" = "public"."auth_tenant_id"())) WITH CHECK (("tenant_id" = "public"."auth_tenant_id"()));



CREATE POLICY "tenant_isolation" ON "public"."labor_rates" TO "authenticated" USING (("tenant_id" = "public"."auth_tenant_id"())) WITH CHECK (("tenant_id" = "public"."auth_tenant_id"()));



CREATE POLICY "tenant_isolation" ON "public"."lms_actions" TO "authenticated" USING (("tenant_id" = "public"."auth_tenant_id"())) WITH CHECK (("tenant_id" = "public"."auth_tenant_id"()));



CREATE POLICY "tenant_isolation" ON "public"."lms_assignments" TO "authenticated" USING (("tenant_id" = "public"."auth_tenant_id"())) WITH CHECK (("tenant_id" = "public"."auth_tenant_id"()));



CREATE POLICY "tenant_isolation" ON "public"."lms_categories" TO "authenticated" USING (("tenant_id" = "public"."auth_tenant_id"())) WITH CHECK (("tenant_id" = "public"."auth_tenant_id"()));



CREATE POLICY "tenant_isolation" ON "public"."lms_courses" TO "authenticated" USING (("tenant_id" = "public"."auth_tenant_id"())) WITH CHECK (("tenant_id" = "public"."auth_tenant_id"()));



CREATE POLICY "tenant_isolation" ON "public"."lms_learning_drills" TO "authenticated" USING (("tenant_id" = "public"."auth_tenant_id"())) WITH CHECK (("tenant_id" = "public"."auth_tenant_id"()));



CREATE POLICY "tenant_isolation" ON "public"."lms_quiz_attempts" TO "authenticated" USING (("tenant_id" = "public"."auth_tenant_id"())) WITH CHECK (("tenant_id" = "public"."auth_tenant_id"()));



CREATE POLICY "tenant_isolation" ON "public"."lms_quizzes" TO "authenticated" USING (("tenant_id" = "public"."auth_tenant_id"())) WITH CHECK (("tenant_id" = "public"."auth_tenant_id"()));



CREATE POLICY "tenant_isolation" ON "public"."lms_read_items" TO "authenticated" USING (("tenant_id" = "public"."auth_tenant_id"())) WITH CHECK (("tenant_id" = "public"."auth_tenant_id"()));



CREATE POLICY "tenant_isolation" ON "public"."lms_step_completions" TO "authenticated" USING (("tenant_id" = "public"."auth_tenant_id"())) WITH CHECK (("tenant_id" = "public"."auth_tenant_id"()));



CREATE POLICY "tenant_isolation" ON "public"."lms_steps" TO "authenticated" USING (("tenant_id" = "public"."auth_tenant_id"())) WITH CHECK (("tenant_id" = "public"."auth_tenant_id"()));



CREATE POLICY "tenant_isolation" ON "public"."lms_tests" TO "authenticated" USING (("tenant_id" = "public"."auth_tenant_id"())) WITH CHECK (("tenant_id" = "public"."auth_tenant_id"()));



CREATE POLICY "tenant_isolation" ON "public"."lms_videos" TO "authenticated" USING (("tenant_id" = "public"."auth_tenant_id"())) WITH CHECK (("tenant_id" = "public"."auth_tenant_id"()));



CREATE POLICY "tenant_isolation" ON "public"."master_equipment" TO "authenticated" USING (("tenant_id" = "public"."auth_tenant_id"())) WITH CHECK (("tenant_id" = "public"."auth_tenant_id"()));



CREATE POLICY "tenant_isolation" ON "public"."master_sub_crews" TO "authenticated" USING (("tenant_id" = "public"."auth_tenant_id"())) WITH CHECK (("tenant_id" = "public"."auth_tenant_id"()));



CREATE POLICY "tenant_isolation" ON "public"."module_equipment_map" TO "authenticated" USING (("tenant_id" = "public"."auth_tenant_id"())) WITH CHECK (("tenant_id" = "public"."auth_tenant_id"()));



CREATE POLICY "tenant_isolation" ON "public"."module_field_equipment_map" TO "authenticated" USING (("tenant_id" = "public"."auth_tenant_id"())) WITH CHECK (("tenant_id" = "public"."auth_tenant_id"()));



CREATE POLICY "tenant_isolation" ON "public"."modules" TO "authenticated" USING (("tenant_id" = "public"."auth_tenant_id"())) WITH CHECK (("tenant_id" = "public"."auth_tenant_id"()));



CREATE POLICY "tenant_isolation" ON "public"."org_charts" TO "authenticated" USING (("tenant_id" = "public"."auth_tenant_id"())) WITH CHECK (("tenant_id" = "public"."auth_tenant_id"()));



CREATE POLICY "tenant_isolation" ON "public"."org_edges" TO "authenticated" USING (("tenant_id" = "public"."auth_tenant_id"())) WITH CHECK (("tenant_id" = "public"."auth_tenant_id"()));



CREATE POLICY "tenant_isolation" ON "public"."org_node_types" TO "authenticated" USING (("tenant_id" = "public"."auth_tenant_id"())) WITH CHECK (("tenant_id" = "public"."auth_tenant_id"()));



CREATE POLICY "tenant_isolation" ON "public"."org_nodes" TO "authenticated" USING (("tenant_id" = "public"."auth_tenant_id"())) WITH CHECK (("tenant_id" = "public"."auth_tenant_id"()));



CREATE POLICY "tenant_isolation" ON "public"."package_requests" TO "authenticated" USING (("tenant_id" = "public"."auth_tenant_id"())) WITH CHECK (("tenant_id" = "public"."auth_tenant_id"()));



CREATE POLICY "tenant_isolation" ON "public"."paver_prices" TO "authenticated" USING (("tenant_id" = "public"."auth_tenant_id"())) WITH CHECK (("tenant_id" = "public"."auth_tenant_id"()));



CREATE POLICY "tenant_isolation" ON "public"."pbs_drive_members" TO "authenticated" USING (("tenant_id" = "public"."auth_tenant_id"())) WITH CHECK (("tenant_id" = "public"."auth_tenant_id"()));



CREATE POLICY "tenant_isolation" ON "public"."pbs_drives" TO "authenticated" USING (("tenant_id" = "public"."auth_tenant_id"())) WITH CHECK (("tenant_id" = "public"."auth_tenant_id"()));



CREATE POLICY "tenant_isolation" ON "public"."position_courses" TO "authenticated" USING (("tenant_id" = "public"."auth_tenant_id"())) WITH CHECK (("tenant_id" = "public"."auth_tenant_id"()));



CREATE POLICY "tenant_isolation" ON "public"."positions" TO "authenticated" USING (("tenant_id" = "public"."auth_tenant_id"())) WITH CHECK (("tenant_id" = "public"."auth_tenant_id"()));



CREATE POLICY "tenant_isolation" ON "public"."profiles" TO "authenticated" USING (("tenant_id" = "public"."auth_tenant_id"())) WITH CHECK (("tenant_id" = "public"."auth_tenant_id"()));



CREATE POLICY "tenant_isolation" ON "public"."projects" TO "authenticated" USING (("tenant_id" = "public"."auth_tenant_id"())) WITH CHECK (("tenant_id" = "public"."auth_tenant_id"()));



CREATE POLICY "tenant_isolation" ON "public"."qb_connection" TO "authenticated" USING (("tenant_id" = "public"."auth_tenant_id"())) WITH CHECK (("tenant_id" = "public"."auth_tenant_id"()));



CREATE POLICY "tenant_isolation" ON "public"."qb_session" TO "authenticated" USING (("tenant_id" = "public"."auth_tenant_id"())) WITH CHECK (("tenant_id" = "public"."auth_tenant_id"()));



CREATE POLICY "tenant_isolation" ON "public"."qb_sync_log" TO "authenticated" USING (("tenant_id" = "public"."auth_tenant_id"())) WITH CHECK (("tenant_id" = "public"."auth_tenant_id"()));



CREATE POLICY "tenant_isolation" ON "public"."qb_sync_state" TO "authenticated" USING (("tenant_id" = "public"."auth_tenant_id"())) WITH CHECK (("tenant_id" = "public"."auth_tenant_id"()));



CREATE POLICY "tenant_isolation" ON "public"."qb_time_tracking" TO "authenticated" USING (("tenant_id" = "public"."auth_tenant_id"())) WITH CHECK (("tenant_id" = "public"."auth_tenant_id"()));



CREATE POLICY "tenant_isolation" ON "public"."sales_appointments" TO "authenticated" USING (("tenant_id" = "public"."auth_tenant_id"())) WITH CHECK (("tenant_id" = "public"."auth_tenant_id"()));



CREATE POLICY "tenant_isolation" ON "public"."schedule_items" TO "authenticated" USING (("tenant_id" = "public"."auth_tenant_id"())) WITH CHECK (("tenant_id" = "public"."auth_tenant_id"()));



CREATE POLICY "tenant_isolation" ON "public"."stat_groups" TO "authenticated" USING (("tenant_id" = "public"."auth_tenant_id"())) WITH CHECK (("tenant_id" = "public"."auth_tenant_id"()));



CREATE POLICY "tenant_isolation" ON "public"."stat_import_export_log" TO "authenticated" USING (("tenant_id" = "public"."auth_tenant_id"())) WITH CHECK (("tenant_id" = "public"."auth_tenant_id"()));



CREATE POLICY "tenant_isolation" ON "public"."stat_notes" TO "authenticated" USING (("tenant_id" = "public"."auth_tenant_id"())) WITH CHECK (("tenant_id" = "public"."auth_tenant_id"()));



CREATE POLICY "tenant_isolation" ON "public"."stat_reminder_log" TO "authenticated" USING (("tenant_id" = "public"."auth_tenant_id"())) WITH CHECK (("tenant_id" = "public"."auth_tenant_id"()));



CREATE POLICY "tenant_isolation" ON "public"."stat_reminders" TO "authenticated" USING (("tenant_id" = "public"."auth_tenant_id"())) WITH CHECK (("tenant_id" = "public"."auth_tenant_id"()));



CREATE POLICY "tenant_isolation" ON "public"."statistic_shares" TO "authenticated" USING (("tenant_id" = "public"."auth_tenant_id"())) WITH CHECK (("tenant_id" = "public"."auth_tenant_id"()));



CREATE POLICY "tenant_isolation" ON "public"."statistic_values" TO "authenticated" USING (("tenant_id" = "public"."auth_tenant_id"())) WITH CHECK (("tenant_id" = "public"."auth_tenant_id"()));



CREATE POLICY "tenant_isolation" ON "public"."statistics" TO "authenticated" USING (("tenant_id" = "public"."auth_tenant_id"())) WITH CHECK (("tenant_id" = "public"."auth_tenant_id"()));



CREATE POLICY "tenant_isolation" ON "public"."sub_vendor_contracts" TO "authenticated" USING (("tenant_id" = "public"."auth_tenant_id"())) WITH CHECK (("tenant_id" = "public"."auth_tenant_id"()));



CREATE POLICY "tenant_isolation" ON "public"."sub_vendor_quotes" TO "authenticated" USING (("tenant_id" = "public"."auth_tenant_id"())) WITH CHECK (("tenant_id" = "public"."auth_tenant_id"()));



CREATE POLICY "tenant_isolation" ON "public"."subcontractor_rates" TO "authenticated" USING (("tenant_id" = "public"."auth_tenant_id"())) WITH CHECK (("tenant_id" = "public"."auth_tenant_id"()));



CREATE POLICY "tenant_isolation" ON "public"."subs_vendors" TO "authenticated" USING (("tenant_id" = "public"."auth_tenant_id"())) WITH CHECK (("tenant_id" = "public"."auth_tenant_id"()));



CREATE POLICY "tenant_isolation" ON "public"."task_categories" TO "authenticated" USING (("tenant_id" = "public"."auth_tenant_id"())) WITH CHECK (("tenant_id" = "public"."auth_tenant_id"()));



CREATE POLICY "tenant_isolation" ON "public"."task_descriptions" TO "authenticated" USING (("tenant_id" = "public"."auth_tenant_id"())) WITH CHECK (("tenant_id" = "public"."auth_tenant_id"()));



CREATE POLICY "tenant_isolation" ON "public"."template_folders" TO "authenticated" USING (("tenant_id" = "public"."auth_tenant_id"())) WITH CHECK (("tenant_id" = "public"."auth_tenant_id"()));



CREATE POLICY "tenant_isolation" ON "public"."template_tasks" TO "authenticated" USING (("tenant_id" = "public"."auth_tenant_id"())) WITH CHECK (("tenant_id" = "public"."auth_tenant_id"()));



CREATE POLICY "tenant_isolation" ON "public"."tenant_packages" TO "authenticated" USING (("tenant_id" = "public"."auth_tenant_id"())) WITH CHECK (("tenant_id" = "public"."auth_tenant_id"()));



CREATE POLICY "tenant_isolation" ON "public"."tenant_payment_connections" TO "authenticated" USING (("tenant_id" = "public"."auth_tenant_id"())) WITH CHECK (("tenant_id" = "public"."auth_tenant_id"()));



CREATE POLICY "tenant_isolation" ON "public"."time_clock_breaks" TO "authenticated" USING (("tenant_id" = "public"."auth_tenant_id"())) WITH CHECK (("tenant_id" = "public"."auth_tenant_id"()));



CREATE POLICY "tenant_isolation" ON "public"."time_clock_permissions" TO "authenticated" USING (("tenant_id" = "public"."auth_tenant_id"())) WITH CHECK (("tenant_id" = "public"."auth_tenant_id"()));



CREATE POLICY "tenant_isolation" ON "public"."time_entries" TO "authenticated" USING (("tenant_id" = "public"."auth_tenant_id"())) WITH CHECK (("tenant_id" = "public"."auth_tenant_id"()));



CREATE POLICY "tenant_isolation" ON "public"."user_permissions" TO "authenticated" USING (("tenant_id" = "public"."auth_tenant_id"())) WITH CHECK (("tenant_id" = "public"."auth_tenant_id"()));



CREATE POLICY "tenant_isolation" ON "public"."website_leads" TO "authenticated" USING (("tenant_id" = "public"."auth_tenant_id"())) WITH CHECK (("tenant_id" = "public"."auth_tenant_id"()));



CREATE POLICY "tenant_isolation" ON "public"."website_pages" TO "authenticated" USING (("tenant_id" = "public"."auth_tenant_id"())) WITH CHECK (("tenant_id" = "public"."auth_tenant_id"()));



CREATE POLICY "tenant_isolation" ON "public"."websites" TO "authenticated" USING (("tenant_id" = "public"."auth_tenant_id"())) WITH CHECK (("tenant_id" = "public"."auth_tenant_id"()));



CREATE POLICY "tenant_isolation" ON "public"."work_orders" TO "authenticated" USING (("tenant_id" = "public"."auth_tenant_id"())) WITH CHECK (("tenant_id" = "public"."auth_tenant_id"()));



CREATE POLICY "tenant_isolation" ON "public"."workday_exceptions" TO "authenticated" USING (("tenant_id" = "public"."auth_tenant_id"())) WITH CHECK (("tenant_id" = "public"."auth_tenant_id"()));



CREATE POLICY "tenant_isolation" ON "public"."workflow_types" TO "authenticated" USING (("tenant_id" = "public"."auth_tenant_id"())) WITH CHECK (("tenant_id" = "public"."auth_tenant_id"()));



ALTER TABLE "public"."tenant_packages" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "tenant_packages_read" ON "public"."tenant_packages" FOR SELECT TO "authenticated" USING (("tenant_id" = "public"."auth_tenant_id"()));



ALTER TABLE "public"."tenant_payment_connections" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "tenant_self" ON "public"."tenants" FOR SELECT TO "authenticated" USING (("id" = "public"."auth_tenant_id"()));



ALTER TABLE "public"."tenants" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."time_clock_breaks" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."time_clock_permissions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."time_entries" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_permissions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."vendor_catalogs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "vendor_catalogs auth" ON "public"."vendor_catalogs" TO "authenticated" USING (true) WITH CHECK (true);



ALTER TABLE "public"."vendor_invoice_lines" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "vendor_invoice_lines_rw" ON "public"."vendor_invoice_lines" TO "authenticated" USING (("tenant_id" = "public"."auth_tenant_id"())) WITH CHECK (("tenant_id" = "public"."auth_tenant_id"()));



ALTER TABLE "public"."vendor_invoices" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "vendor_invoices_rw" ON "public"."vendor_invoices" TO "authenticated" USING (("tenant_id" = "public"."auth_tenant_id"())) WITH CHECK (("tenant_id" = "public"."auth_tenant_id"()));



ALTER TABLE "public"."view_rates_hidden" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "view_rates_hidden_rw" ON "public"."view_rates_hidden" TO "authenticated" USING (("tenant_id" = "public"."auth_tenant_id"())) WITH CHECK (("tenant_id" = "public"."auth_tenant_id"()));



ALTER TABLE "public"."website_leads" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."website_pages" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."websites" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."work_orders" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."workday_exceptions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."workflow_types" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_in"("cstring") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_in"("cstring") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_in"("cstring") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_in"("cstring") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_out"("public"."gtrgm") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_out"("public"."gtrgm") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_out"("public"."gtrgm") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_out"("public"."gtrgm") TO "service_role";






















































































































































GRANT ALL ON FUNCTION "public"."_billing_admin_tenant"() TO "anon";
GRANT ALL ON FUNCTION "public"."_billing_admin_tenant"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."_billing_admin_tenant"() TO "service_role";



GRANT ALL ON FUNCTION "public"."admin_sync_employee_email"("p_employee_id" "uuid", "p_new_email" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."admin_sync_employee_email"("p_employee_id" "uuid", "p_new_email" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."admin_sync_employee_email"("p_employee_id" "uuid", "p_new_email" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."advance_qb_watermark"("p_entity" "text", "p_modified_at" timestamp with time zone, "p_session_ticket" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."advance_qb_watermark"("p_entity" "text", "p_modified_at" timestamp with time zone, "p_session_ticket" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."advance_qb_watermark"("p_entity" "text", "p_modified_at" timestamp with time zone, "p_session_ticket" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."assign_invoice_client_seq"() TO "anon";
GRANT ALL ON FUNCTION "public"."assign_invoice_client_seq"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."assign_invoice_client_seq"() TO "service_role";



GRANT ALL ON FUNCTION "public"."auth_tenant_id"() TO "anon";
GRANT ALL ON FUNCTION "public"."auth_tenant_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."auth_tenant_id"() TO "service_role";



GRANT ALL ON FUNCTION "public"."cad_drawings_touch_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."cad_drawings_touch_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."cad_drawings_touch_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."can_edit_statistic"("p_stat_id" bigint) TO "anon";
GRANT ALL ON FUNCTION "public"."can_edit_statistic"("p_stat_id" bigint) TO "authenticated";
GRANT ALL ON FUNCTION "public"."can_edit_statistic"("p_stat_id" bigint) TO "service_role";



GRANT ALL ON FUNCTION "public"."can_view_statistic"("p_stat_id" bigint) TO "anon";
GRANT ALL ON FUNCTION "public"."can_view_statistic"("p_stat_id" bigint) TO "authenticated";
GRANT ALL ON FUNCTION "public"."can_view_statistic"("p_stat_id" bigint) TO "service_role";



GRANT ALL ON FUNCTION "public"."cancel_my_subscription"("p_reason" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."cancel_my_subscription"("p_reason" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."cancel_my_subscription"("p_reason" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."cancel_my_trial"("p_comment" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."cancel_my_trial"("p_comment" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."cancel_my_trial"("p_comment" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."clean_desc"("d" "text", "cat" "text", "sub" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."clean_desc"("d" "text", "cat" "text", "sub" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."clean_desc"("d" "text", "cat" "text", "sub" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."cp_set_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."cp_set_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."cp_set_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."create_job_from_bid"("p_estimate_id" "uuid", "p_client_id" "uuid", "p_client_name" "text", "p_name" "text", "p_job_address" "text", "p_sold_date" timestamp with time zone, "p_total_price" numeric, "p_gross_profit" numeric, "p_gpmd" numeric, "p_status" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."create_job_from_bid"("p_estimate_id" "uuid", "p_client_id" "uuid", "p_client_name" "text", "p_name" "text", "p_job_address" "text", "p_sold_date" timestamp with time zone, "p_total_price" numeric, "p_gross_profit" numeric, "p_gpmd" numeric, "p_status" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_job_from_bid"("p_estimate_id" "uuid", "p_client_id" "uuid", "p_client_name" "text", "p_name" "text", "p_job_address" "text", "p_sold_date" timestamp with time zone, "p_total_price" numeric, "p_gross_profit" numeric, "p_gpmd" numeric, "p_status" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."edoc_get_by_token"("p_token" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."edoc_get_by_token"("p_token" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."edoc_get_by_token"("p_token" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."edoc_mark_viewed"("p_token" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."edoc_mark_viewed"("p_token" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."edoc_mark_viewed"("p_token" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."edoc_record_deposit"("p_token" "text", "p_amount" numeric, "p_txn" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."edoc_record_deposit"("p_token" "text", "p_amount" numeric, "p_txn" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."edoc_record_deposit"("p_token" "text", "p_amount" numeric, "p_txn" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."edoc_submit"("p_token" "text", "p_fields" "jsonb", "p_signature" "text", "p_signed_by" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."edoc_submit"("p_token" "text", "p_fields" "jsonb", "p_signature" "text", "p_signed_by" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."edoc_submit"("p_token" "text", "p_fields" "jsonb", "p_signature" "text", "p_signed_by" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."extend_my_trial"("p_comment" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."extend_my_trial"("p_comment" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."extend_my_trial"("p_comment" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."feature_requests_set_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."feature_requests_set_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."feature_requests_set_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."finance_invoice_totals"("p_job_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."finance_invoice_totals"("p_job_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."finance_invoice_totals"("p_job_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."finance_payment_totals"("p_job_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."finance_payment_totals"("p_job_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."finance_payment_totals"("p_job_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."format_phone"("p" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."format_phone"("p" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."format_phone"("p" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_email_by_username"("p_username" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_email_by_username"("p_username" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_email_by_username"("p_username" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_my_extensions"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_my_extensions"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_my_extensions"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_my_modules"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_my_modules"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_my_modules"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_my_subscription"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_my_subscription"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_my_subscription"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_phone_by_email"("p_email" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_phone_by_email"("p_email" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_phone_by_email"("p_email" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_public_site"("p_slug" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_public_site"("p_slug" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_public_site"("p_slug" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_extract_query_trgm"("text", "internal", smallint, "internal", "internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_extract_query_trgm"("text", "internal", smallint, "internal", "internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_extract_query_trgm"("text", "internal", smallint, "internal", "internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_extract_query_trgm"("text", "internal", smallint, "internal", "internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_extract_value_trgm"("text", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_extract_value_trgm"("text", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_extract_value_trgm"("text", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_extract_value_trgm"("text", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_trgm_consistent"("internal", smallint, "text", integer, "internal", "internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_trgm_consistent"("internal", smallint, "text", integer, "internal", "internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_trgm_consistent"("internal", smallint, "text", integer, "internal", "internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_trgm_consistent"("internal", smallint, "text", integer, "internal", "internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_trgm_triconsistent"("internal", smallint, "text", integer, "internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_trgm_triconsistent"("internal", smallint, "text", integer, "internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_trgm_triconsistent"("internal", smallint, "text", integer, "internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_trgm_triconsistent"("internal", smallint, "text", integer, "internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_compress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_compress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_compress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_compress"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_consistent"("internal", "text", smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_consistent"("internal", "text", smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_consistent"("internal", "text", smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_consistent"("internal", "text", smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_decompress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_decompress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_decompress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_decompress"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_distance"("internal", "text", smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_distance"("internal", "text", smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_distance"("internal", "text", smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_distance"("internal", "text", smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_options"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_options"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_options"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_options"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_penalty"("internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_penalty"("internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_penalty"("internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_penalty"("internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_picksplit"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_picksplit"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_picksplit"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_picksplit"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_same"("public"."gtrgm", "public"."gtrgm", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_same"("public"."gtrgm", "public"."gtrgm", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_same"("public"."gtrgm", "public"."gtrgm", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_same"("public"."gtrgm", "public"."gtrgm", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_union"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_union"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_union"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_union"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_profile"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_profile"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_profile"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."has_extension"("p_ext" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."has_extension"("p_ext" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."has_extension"("p_ext" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_admin"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_admin"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_admin"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_admin_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_admin_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_admin_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_staff"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_staff"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_staff"() TO "service_role";



GRANT ALL ON FUNCTION "public"."link_qb_lines_to_jobs"() TO "anon";
GRANT ALL ON FUNCTION "public"."link_qb_lines_to_jobs"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."link_qb_lines_to_jobs"() TO "service_role";



GRANT ALL ON FUNCTION "public"."log_trial_started"("p_tenant" "uuid", "p_when" timestamp with time zone) TO "anon";
GRANT ALL ON FUNCTION "public"."log_trial_started"("p_tenant" "uuid", "p_when" timestamp with time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."log_trial_started"("p_tenant" "uuid", "p_when" timestamp with time zone) TO "service_role";



GRANT ALL ON FUNCTION "public"."match_qb_customer_to_job"("qb_name" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."match_qb_customer_to_job"("qb_name" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."match_qb_customer_to_job"("qb_name" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."material_current_price"("p_material_id" "uuid", "p_vendor_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."material_current_price"("p_material_id" "uuid", "p_vendor_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."material_current_price"("p_material_id" "uuid", "p_vendor_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."material_estimate_usage"("p_id" "text", "p_ref_key" "text", "p_name" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."material_estimate_usage"("p_id" "text", "p_ref_key" "text", "p_name" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."material_estimate_usage"("p_id" "text", "p_ref_key" "text", "p_name" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."material_reference_count"("p_name" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."material_reference_count"("p_name" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."material_reference_count"("p_name" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."merge_material"("p_keep" "uuid", "p_drop" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."merge_material"("p_keep" "uuid", "p_drop" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."merge_material"("p_keep" "uuid", "p_drop" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."misc_set_ref_key"() TO "anon";
GRANT ALL ON FUNCTION "public"."misc_set_ref_key"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."misc_set_ref_key"() TO "service_role";



GRANT ALL ON FUNCTION "public"."my_payment_connection"() TO "anon";
GRANT ALL ON FUNCTION "public"."my_payment_connection"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."my_payment_connection"() TO "service_role";



GRANT ALL ON FUNCTION "public"."my_tenant_id"() TO "anon";
GRANT ALL ON FUNCTION "public"."my_tenant_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."my_tenant_id"() TO "service_role";



GRANT ALL ON FUNCTION "public"."pbs_build_tree"("spec" "jsonb", "parent_ref" "text", "parent_type" "text", "my_tier" integer, "ord" integer, "ref" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."pbs_build_tree"("spec" "jsonb", "parent_ref" "text", "parent_type" "text", "my_tier" integer, "ord" integer, "ref" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."pbs_build_tree"("spec" "jsonb", "parent_ref" "text", "parent_type" "text", "my_tier" integer, "ord" integer, "ref" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."pbs_fmt_phone"("raw" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."pbs_fmt_phone"("raw" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."pbs_fmt_phone"("raw" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."portal_approve_change_order"("p_co_id" "uuid", "p_signed_by" "text", "p_signature" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."portal_approve_change_order"("p_co_id" "uuid", "p_signed_by" "text", "p_signature" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."portal_approve_change_order"("p_co_id" "uuid", "p_signed_by" "text", "p_signature" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."portal_change_orders"("p_client_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."portal_change_orders"("p_client_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."portal_change_orders"("p_client_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."portal_client_id"() TO "anon";
GRANT ALL ON FUNCTION "public"."portal_client_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."portal_client_id"() TO "service_role";



GRANT ALL ON FUNCTION "public"."portal_client_info"() TO "anon";
GRANT ALL ON FUNCTION "public"."portal_client_info"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."portal_client_info"() TO "service_role";



GRANT ALL ON FUNCTION "public"."portal_client_info"("p_client_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."portal_client_info"("p_client_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."portal_client_info"("p_client_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."portal_complete_activation"("p_token" "text", "p_account_name" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."portal_complete_activation"("p_token" "text", "p_account_name" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."portal_complete_activation"("p_token" "text", "p_account_name" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."portal_daily_log_photos"() TO "anon";
GRANT ALL ON FUNCTION "public"."portal_daily_log_photos"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."portal_daily_log_photos"() TO "service_role";



GRANT ALL ON FUNCTION "public"."portal_daily_log_photos"("p_client_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."portal_daily_log_photos"("p_client_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."portal_daily_log_photos"("p_client_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."portal_daily_logs"() TO "anon";
GRANT ALL ON FUNCTION "public"."portal_daily_logs"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."portal_daily_logs"() TO "service_role";



GRANT ALL ON FUNCTION "public"."portal_daily_logs"("p_client_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."portal_daily_logs"("p_client_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."portal_daily_logs"("p_client_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."portal_decline_change_order"("p_co_id" "uuid", "p_reason" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."portal_decline_change_order"("p_co_id" "uuid", "p_reason" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."portal_decline_change_order"("p_co_id" "uuid", "p_reason" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."portal_invoice_attachments"("p_client_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."portal_invoice_attachments"("p_client_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."portal_invoice_attachments"("p_client_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."portal_invoice_lines"("p_invoice_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."portal_invoice_lines"("p_invoice_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."portal_invoice_lines"("p_invoice_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."portal_invoices"() TO "anon";
GRANT ALL ON FUNCTION "public"."portal_invoices"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."portal_invoices"() TO "service_role";



GRANT ALL ON FUNCTION "public"."portal_invoices"("p_client_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."portal_invoices"("p_client_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."portal_invoices"("p_client_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."portal_jobs"() TO "anon";
GRANT ALL ON FUNCTION "public"."portal_jobs"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."portal_jobs"() TO "service_role";



GRANT ALL ON FUNCTION "public"."portal_jobs"("p_client_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."portal_jobs"("p_client_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."portal_jobs"("p_client_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."portal_payments"() TO "anon";
GRANT ALL ON FUNCTION "public"."portal_payments"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."portal_payments"() TO "service_role";



GRANT ALL ON FUNCTION "public"."portal_payments"("p_client_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."portal_payments"("p_client_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."portal_payments"("p_client_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."portal_record_payment"("p_invoice_id" "uuid", "p_amount" numeric, "p_transaction_id" "text", "p_method" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."portal_record_payment"("p_invoice_id" "uuid", "p_amount" numeric, "p_transaction_id" "text", "p_method" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."portal_record_payment"("p_invoice_id" "uuid", "p_amount" numeric, "p_transaction_id" "text", "p_method" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."portal_schedule"() TO "anon";
GRANT ALL ON FUNCTION "public"."portal_schedule"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."portal_schedule"() TO "service_role";



GRANT ALL ON FUNCTION "public"."portal_schedule"("p_client_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."portal_schedule"("p_client_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."portal_schedule"("p_client_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."portal_validate_invite"("p_token" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."portal_validate_invite"("p_token" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."portal_validate_invite"("p_token" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."price_as_of"("p_rate_id" "uuid", "p_date" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."price_as_of"("p_rate_id" "uuid", "p_date" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."price_as_of"("p_rate_id" "uuid", "p_date" "date") TO "service_role";



GRANT ALL ON FUNCTION "public"."price_as_of"("p_material_id" "uuid", "p_vendor_id" "uuid", "p_date" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."price_as_of"("p_material_id" "uuid", "p_vendor_id" "uuid", "p_date" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."price_as_of"("p_material_id" "uuid", "p_vendor_id" "uuid", "p_date" "date") TO "service_role";



GRANT ALL ON FUNCTION "public"."provision_my_tenant"("p_company" "text", "p_plan" "text", "p_packages" "text"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."provision_my_tenant"("p_company" "text", "p_plan" "text", "p_packages" "text"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."provision_my_tenant"("p_company" "text", "p_plan" "text", "p_packages" "text"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."request_package"("p_package_id" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."request_package"("p_package_id" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."request_package"("p_package_id" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."resolve_acct_account_parents"() TO "anon";
GRANT ALL ON FUNCTION "public"."resolve_acct_account_parents"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."resolve_acct_account_parents"() TO "service_role";



GRANT ALL ON FUNCTION "public"."sam_public_gate"("p_ip" "text", "p_daily_cap" integer, "p_burst_cap" integer, "p_global_cap" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."sam_public_gate"("p_ip" "text", "p_daily_cap" integer, "p_burst_cap" integer, "p_global_cap" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."sam_public_gate"("p_ip" "text", "p_daily_cap" integer, "p_burst_cap" integer, "p_global_cap" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."set_beta_card"("p_brand" "text", "p_last4" "text", "p_exp" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."set_beta_card"("p_brand" "text", "p_last4" "text", "p_exp" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_beta_card"("p_brand" "text", "p_last4" "text", "p_exp" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."set_limit"(real) TO "postgres";
GRANT ALL ON FUNCTION "public"."set_limit"(real) TO "anon";
GRANT ALL ON FUNCTION "public"."set_limit"(real) TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_limit"(real) TO "service_role";



GRANT ALL ON FUNCTION "public"."set_my_extension"("p_ext" "text", "p_status" "text", "p_period_end" timestamp with time zone) TO "anon";
GRANT ALL ON FUNCTION "public"."set_my_extension"("p_ext" "text", "p_status" "text", "p_period_end" timestamp with time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_my_extension"("p_ext" "text", "p_status" "text", "p_period_end" timestamp with time zone) TO "service_role";



GRANT ALL ON FUNCTION "public"."set_tenant_id"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_tenant_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_tenant_id"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_username"("p_username" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."set_username"("p_username" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_username"("p_username" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."show_limit"() TO "postgres";
GRANT ALL ON FUNCTION "public"."show_limit"() TO "anon";
GRANT ALL ON FUNCTION "public"."show_limit"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."show_limit"() TO "service_role";



GRANT ALL ON FUNCTION "public"."show_trgm"("text") TO "postgres";
GRANT ALL ON FUNCTION "public"."show_trgm"("text") TO "anon";
GRANT ALL ON FUNCTION "public"."show_trgm"("text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."show_trgm"("text") TO "service_role";



GRANT ALL ON FUNCTION "public"."similarity"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."similarity"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."similarity"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."similarity"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."similarity_dist"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."similarity_dist"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."similarity_dist"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."similarity_dist"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."similarity_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."similarity_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."similarity_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."similarity_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."start_payment_connection"() TO "anon";
GRANT ALL ON FUNCTION "public"."start_payment_connection"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."start_payment_connection"() TO "service_role";



GRANT ALL ON FUNCTION "public"."strict_word_similarity"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."strict_word_similarity"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."strict_word_similarity"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."strict_word_similarity"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."strict_word_similarity_commutator_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_commutator_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_commutator_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_commutator_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_commutator_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_commutator_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_commutator_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_commutator_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."strict_word_similarity_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."tg_set_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."tg_set_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."tg_set_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."touch_agent_conversation"() TO "anon";
GRANT ALL ON FUNCTION "public"."touch_agent_conversation"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."touch_agent_conversation"() TO "service_role";



GRANT ALL ON FUNCTION "public"."touch_agent_user_preferences"() TO "anon";
GRANT ALL ON FUNCTION "public"."touch_agent_user_preferences"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."touch_agent_user_preferences"() TO "service_role";



GRANT ALL ON FUNCTION "public"."touch_companies_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."touch_companies_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."touch_companies_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."touch_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."touch_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."touch_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."trg_auto_link_qb_line_to_job"() TO "anon";
GRANT ALL ON FUNCTION "public"."trg_auto_link_qb_line_to_job"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trg_auto_link_qb_line_to_job"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_contacts_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_contacts_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_contacts_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_positions_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_positions_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_positions_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."word_similarity"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."word_similarity"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."word_similarity"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."word_similarity"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."word_similarity_commutator_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."word_similarity_commutator_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."word_similarity_commutator_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."word_similarity_commutator_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."word_similarity_dist_commutator_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."word_similarity_dist_commutator_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."word_similarity_dist_commutator_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."word_similarity_dist_commutator_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."word_similarity_dist_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."word_similarity_dist_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."word_similarity_dist_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."word_similarity_dist_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."word_similarity_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."word_similarity_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."word_similarity_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."word_similarity_op"("text", "text") TO "service_role";


















GRANT ALL ON TABLE "public"."_bak_finish_labor_retire_20260821" TO "anon";
GRANT ALL ON TABLE "public"."_bak_finish_labor_retire_20260821" TO "authenticated";
GRANT ALL ON TABLE "public"."_bak_finish_labor_retire_20260821" TO "service_role";



GRANT ALL ON TABLE "public"."_bak_finish_material_retire_20260821" TO "anon";
GRANT ALL ON TABLE "public"."_bak_finish_material_retire_20260821" TO "authenticated";
GRANT ALL ON TABLE "public"."_bak_finish_material_retire_20260821" TO "service_role";



GRANT ALL ON TABLE "public"."_bak_finish_misc_retire_20260821" TO "anon";
GRANT ALL ON TABLE "public"."_bak_finish_misc_retire_20260821" TO "authenticated";
GRANT ALL ON TABLE "public"."_bak_finish_misc_retire_20260821" TO "service_role";



GRANT ALL ON TABLE "public"."_bak_import_base_20260821" TO "anon";
GRANT ALL ON TABLE "public"."_bak_import_base_20260821" TO "authenticated";
GRANT ALL ON TABLE "public"."_bak_import_base_20260821" TO "service_role";



GRANT ALL ON TABLE "public"."acct_accounts" TO "anon";
GRANT ALL ON TABLE "public"."acct_accounts" TO "authenticated";
GRANT ALL ON TABLE "public"."acct_accounts" TO "service_role";



GRANT ALL ON TABLE "public"."acct_bank_accounts" TO "anon";
GRANT ALL ON TABLE "public"."acct_bank_accounts" TO "authenticated";
GRANT ALL ON TABLE "public"."acct_bank_accounts" TO "service_role";



GRANT ALL ON TABLE "public"."acct_bank_transactions" TO "anon";
GRANT ALL ON TABLE "public"."acct_bank_transactions" TO "authenticated";
GRANT ALL ON TABLE "public"."acct_bank_transactions" TO "service_role";



GRANT ALL ON TABLE "public"."acct_bill_lines" TO "anon";
GRANT ALL ON TABLE "public"."acct_bill_lines" TO "authenticated";
GRANT ALL ON TABLE "public"."acct_bill_lines" TO "service_role";



GRANT ALL ON TABLE "public"."acct_bills" TO "anon";
GRANT ALL ON TABLE "public"."acct_bills" TO "authenticated";
GRANT ALL ON TABLE "public"."acct_bills" TO "service_role";



GRANT ALL ON TABLE "public"."acct_check_lines" TO "anon";
GRANT ALL ON TABLE "public"."acct_check_lines" TO "authenticated";
GRANT ALL ON TABLE "public"."acct_check_lines" TO "service_role";



GRANT ALL ON TABLE "public"."acct_checks" TO "anon";
GRANT ALL ON TABLE "public"."acct_checks" TO "authenticated";
GRANT ALL ON TABLE "public"."acct_checks" TO "service_role";



GRANT ALL ON TABLE "public"."acct_credit_card_charge_lines" TO "anon";
GRANT ALL ON TABLE "public"."acct_credit_card_charge_lines" TO "authenticated";
GRANT ALL ON TABLE "public"."acct_credit_card_charge_lines" TO "service_role";



GRANT ALL ON TABLE "public"."acct_credit_card_charges" TO "anon";
GRANT ALL ON TABLE "public"."acct_credit_card_charges" TO "authenticated";
GRANT ALL ON TABLE "public"."acct_credit_card_charges" TO "service_role";



GRANT ALL ON TABLE "public"."acct_invoice_lines" TO "anon";
GRANT ALL ON TABLE "public"."acct_invoice_lines" TO "authenticated";
GRANT ALL ON TABLE "public"."acct_invoice_lines" TO "service_role";



GRANT ALL ON TABLE "public"."acct_invoices" TO "anon";
GRANT ALL ON TABLE "public"."acct_invoices" TO "authenticated";
GRANT ALL ON TABLE "public"."acct_invoices" TO "service_role";



GRANT ALL ON TABLE "public"."acct_item_receipt_lines" TO "anon";
GRANT ALL ON TABLE "public"."acct_item_receipt_lines" TO "authenticated";
GRANT ALL ON TABLE "public"."acct_item_receipt_lines" TO "service_role";



GRANT ALL ON TABLE "public"."acct_item_receipts" TO "anon";
GRANT ALL ON TABLE "public"."acct_item_receipts" TO "authenticated";
GRANT ALL ON TABLE "public"."acct_item_receipts" TO "service_role";



GRANT ALL ON TABLE "public"."acct_journal_entries" TO "anon";
GRANT ALL ON TABLE "public"."acct_journal_entries" TO "authenticated";
GRANT ALL ON TABLE "public"."acct_journal_entries" TO "service_role";



GRANT ALL ON TABLE "public"."acct_journal_entry_lines" TO "anon";
GRANT ALL ON TABLE "public"."acct_journal_entry_lines" TO "authenticated";
GRANT ALL ON TABLE "public"."acct_journal_entry_lines" TO "service_role";



GRANT ALL ON TABLE "public"."acct_journal_lines" TO "anon";
GRANT ALL ON TABLE "public"."acct_journal_lines" TO "authenticated";
GRANT ALL ON TABLE "public"."acct_journal_lines" TO "service_role";



GRANT ALL ON TABLE "public"."acct_payments" TO "anon";
GRANT ALL ON TABLE "public"."acct_payments" TO "authenticated";
GRANT ALL ON TABLE "public"."acct_payments" TO "service_role";



GRANT ALL ON TABLE "public"."actual_entries" TO "anon";
GRANT ALL ON TABLE "public"."actual_entries" TO "authenticated";
GRANT ALL ON TABLE "public"."actual_entries" TO "service_role";



GRANT ALL ON TABLE "public"."agent_conversations" TO "anon";
GRANT ALL ON TABLE "public"."agent_conversations" TO "authenticated";
GRANT ALL ON TABLE "public"."agent_conversations" TO "service_role";



GRANT ALL ON TABLE "public"."agent_message_attachments" TO "anon";
GRANT ALL ON TABLE "public"."agent_message_attachments" TO "authenticated";
GRANT ALL ON TABLE "public"."agent_message_attachments" TO "service_role";



GRANT ALL ON TABLE "public"."agent_messages" TO "anon";
GRANT ALL ON TABLE "public"."agent_messages" TO "authenticated";
GRANT ALL ON TABLE "public"."agent_messages" TO "service_role";



GRANT ALL ON TABLE "public"."agent_tool_calls" TO "anon";
GRANT ALL ON TABLE "public"."agent_tool_calls" TO "authenticated";
GRANT ALL ON TABLE "public"."agent_tool_calls" TO "service_role";



GRANT ALL ON TABLE "public"."agent_user_preferences" TO "anon";
GRANT ALL ON TABLE "public"."agent_user_preferences" TO "authenticated";
GRANT ALL ON TABLE "public"."agent_user_preferences" TO "service_role";



GRANT ALL ON TABLE "public"."applicants" TO "anon";
GRANT ALL ON TABLE "public"."applicants" TO "authenticated";
GRANT ALL ON TABLE "public"."applicants" TO "service_role";



GRANT ALL ON TABLE "public"."bak_fp_purge_labor" TO "anon";
GRANT ALL ON TABLE "public"."bak_fp_purge_labor" TO "authenticated";
GRANT ALL ON TABLE "public"."bak_fp_purge_labor" TO "service_role";



GRANT ALL ON TABLE "public"."bak_fp_purge_material" TO "anon";
GRANT ALL ON TABLE "public"."bak_fp_purge_material" TO "authenticated";
GRANT ALL ON TABLE "public"."bak_fp_purge_material" TO "service_role";



GRANT ALL ON TABLE "public"."bak_fp_purge_material_price" TO "anon";
GRANT ALL ON TABLE "public"."bak_fp_purge_material_price" TO "authenticated";
GRANT ALL ON TABLE "public"."bak_fp_purge_material_price" TO "service_role";



GRANT ALL ON TABLE "public"."basic_labor_rates" TO "anon";
GRANT ALL ON TABLE "public"."basic_labor_rates" TO "authenticated";
GRANT ALL ON TABLE "public"."basic_labor_rates" TO "service_role";



GRANT ALL ON TABLE "public"."bids" TO "anon";
GRANT ALL ON TABLE "public"."bids" TO "authenticated";
GRANT ALL ON TABLE "public"."bids" TO "service_role";



GRANT ALL ON TABLE "public"."billing_payments" TO "anon";
GRANT ALL ON TABLE "public"."billing_payments" TO "authenticated";
GRANT ALL ON TABLE "public"."billing_payments" TO "service_role";



GRANT ALL ON TABLE "public"."cad_drawings" TO "anon";
GRANT ALL ON TABLE "public"."cad_drawings" TO "authenticated";
GRANT ALL ON TABLE "public"."cad_drawings" TO "service_role";



GRANT ALL ON TABLE "public"."cancellation_feedback" TO "anon";
GRANT ALL ON TABLE "public"."cancellation_feedback" TO "authenticated";
GRANT ALL ON TABLE "public"."cancellation_feedback" TO "service_role";



GRANT ALL ON TABLE "public"."category" TO "anon";
GRANT ALL ON TABLE "public"."category" TO "authenticated";
GRANT ALL ON TABLE "public"."category" TO "service_role";



GRANT ALL ON TABLE "public"."change_orders" TO "anon";
GRANT ALL ON TABLE "public"."change_orders" TO "authenticated";
GRANT ALL ON TABLE "public"."change_orders" TO "service_role";



GRANT ALL ON TABLE "public"."client_payment_methods" TO "anon";
GRANT ALL ON TABLE "public"."client_payment_methods" TO "authenticated";
GRANT ALL ON TABLE "public"."client_payment_methods" TO "service_role";



GRANT ALL ON TABLE "public"."client_portals" TO "anon";
GRANT ALL ON TABLE "public"."client_portals" TO "authenticated";
GRANT ALL ON TABLE "public"."client_portals" TO "service_role";



GRANT ALL ON TABLE "public"."clients" TO "anon";
GRANT ALL ON TABLE "public"."clients" TO "authenticated";
GRANT ALL ON TABLE "public"."clients" TO "service_role";



GRANT ALL ON TABLE "public"."code_changes" TO "anon";
GRANT ALL ON TABLE "public"."code_changes" TO "authenticated";
GRANT ALL ON TABLE "public"."code_changes" TO "service_role";



GRANT ALL ON TABLE "public"."collection_financial" TO "anon";
GRANT ALL ON TABLE "public"."collection_financial" TO "authenticated";
GRANT ALL ON TABLE "public"."collection_financial" TO "service_role";



GRANT ALL ON TABLE "public"."collection_payables" TO "anon";
GRANT ALL ON TABLE "public"."collection_payables" TO "authenticated";
GRANT ALL ON TABLE "public"."collection_payables" TO "service_role";



GRANT ALL ON TABLE "public"."collection_rows" TO "anon";
GRANT ALL ON TABLE "public"."collection_rows" TO "authenticated";
GRANT ALL ON TABLE "public"."collection_rows" TO "service_role";



GRANT ALL ON TABLE "public"."collection_weeks" TO "anon";
GRANT ALL ON TABLE "public"."collection_weeks" TO "authenticated";
GRANT ALL ON TABLE "public"."collection_weeks" TO "service_role";



GRANT ALL ON TABLE "public"."collections" TO "anon";
GRANT ALL ON TABLE "public"."collections" TO "authenticated";
GRANT ALL ON TABLE "public"."collections" TO "service_role";



GRANT ALL ON TABLE "public"."companies" TO "anon";
GRANT ALL ON TABLE "public"."companies" TO "authenticated";
GRANT ALL ON TABLE "public"."companies" TO "service_role";



GRANT ALL ON TABLE "public"."company_communications" TO "anon";
GRANT ALL ON TABLE "public"."company_communications" TO "authenticated";
GRANT ALL ON TABLE "public"."company_communications" TO "service_role";



GRANT ALL ON TABLE "public"."company_settings" TO "anon";
GRANT ALL ON TABLE "public"."company_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."company_settings" TO "service_role";



GRANT ALL ON TABLE "public"."contact_communications" TO "anon";
GRANT ALL ON TABLE "public"."contact_communications" TO "authenticated";
GRANT ALL ON TABLE "public"."contact_communications" TO "service_role";



GRANT ALL ON TABLE "public"."contacts" TO "anon";
GRANT ALL ON TABLE "public"."contacts" TO "authenticated";
GRANT ALL ON TABLE "public"."contacts" TO "service_role";



GRANT ALL ON TABLE "public"."crew_types" TO "anon";
GRANT ALL ON TABLE "public"."crew_types" TO "authenticated";
GRANT ALL ON TABLE "public"."crew_types" TO "service_role";



GRANT ALL ON TABLE "public"."crews" TO "anon";
GRANT ALL ON TABLE "public"."crews" TO "authenticated";
GRANT ALL ON TABLE "public"."crews" TO "service_role";



GRANT ALL ON TABLE "public"."daily_log_photos" TO "anon";
GRANT ALL ON TABLE "public"."daily_log_photos" TO "authenticated";
GRANT ALL ON TABLE "public"."daily_log_photos" TO "service_role";



GRANT ALL ON TABLE "public"."daily_logs" TO "anon";
GRANT ALL ON TABLE "public"."daily_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."daily_logs" TO "service_role";



GRANT ALL ON TABLE "public"."dashboard_appreciations" TO "anon";
GRANT ALL ON TABLE "public"."dashboard_appreciations" TO "authenticated";
GRANT ALL ON TABLE "public"."dashboard_appreciations" TO "service_role";



GRANT ALL ON TABLE "public"."dashboard_preferences" TO "anon";
GRANT ALL ON TABLE "public"."dashboard_preferences" TO "authenticated";
GRANT ALL ON TABLE "public"."dashboard_preferences" TO "service_role";



GRANT ALL ON TABLE "public"."design_annotations" TO "anon";
GRANT ALL ON TABLE "public"."design_annotations" TO "authenticated";
GRANT ALL ON TABLE "public"."design_annotations" TO "service_role";



GRANT ALL ON TABLE "public"."design_files" TO "anon";
GRANT ALL ON TABLE "public"."design_files" TO "authenticated";
GRANT ALL ON TABLE "public"."design_files" TO "service_role";



GRANT ALL ON TABLE "public"."design_projects" TO "anon";
GRANT ALL ON TABLE "public"."design_projects" TO "authenticated";
GRANT ALL ON TABLE "public"."design_projects" TO "service_role";



GRANT ALL ON TABLE "public"."design_takeoff_items" TO "anon";
GRANT ALL ON TABLE "public"."design_takeoff_items" TO "authenticated";
GRANT ALL ON TABLE "public"."design_takeoff_items" TO "service_role";



GRANT ALL ON TABLE "public"."edoc_documents" TO "anon";
GRANT ALL ON TABLE "public"."edoc_documents" TO "authenticated";
GRANT ALL ON TABLE "public"."edoc_documents" TO "service_role";



GRANT ALL ON TABLE "public"."edoc_templates" TO "anon";
GRANT ALL ON TABLE "public"."edoc_templates" TO "authenticated";
GRANT ALL ON TABLE "public"."edoc_templates" TO "service_role";



GRANT ALL ON TABLE "public"."edoc_workflows" TO "anon";
GRANT ALL ON TABLE "public"."edoc_workflows" TO "authenticated";
GRANT ALL ON TABLE "public"."edoc_workflows" TO "service_role";



GRANT ALL ON TABLE "public"."employee_certifications" TO "anon";
GRANT ALL ON TABLE "public"."employee_certifications" TO "authenticated";
GRANT ALL ON TABLE "public"."employee_certifications" TO "service_role";



GRANT ALL ON TABLE "public"."employee_documents" TO "anon";
GRANT ALL ON TABLE "public"."employee_documents" TO "authenticated";
GRANT ALL ON TABLE "public"."employee_documents" TO "service_role";



GRANT ALL ON TABLE "public"."employee_files" TO "anon";
GRANT ALL ON TABLE "public"."employee_files" TO "authenticated";
GRANT ALL ON TABLE "public"."employee_files" TO "service_role";



GRANT ALL ON TABLE "public"."employee_group_members" TO "anon";
GRANT ALL ON TABLE "public"."employee_group_members" TO "authenticated";
GRANT ALL ON TABLE "public"."employee_group_members" TO "service_role";



GRANT ALL ON TABLE "public"."employee_groups" TO "anon";
GRANT ALL ON TABLE "public"."employee_groups" TO "authenticated";
GRANT ALL ON TABLE "public"."employee_groups" TO "service_role";



GRANT ALL ON TABLE "public"."employee_positions" TO "anon";
GRANT ALL ON TABLE "public"."employee_positions" TO "authenticated";
GRANT ALL ON TABLE "public"."employee_positions" TO "service_role";



GRANT ALL ON TABLE "public"."employees" TO "anon";
GRANT ALL ON TABLE "public"."employees" TO "authenticated";
GRANT ALL ON TABLE "public"."employees" TO "service_role";



GRANT ALL ON TABLE "public"."estimate_modules" TO "anon";
GRANT ALL ON TABLE "public"."estimate_modules" TO "authenticated";
GRANT ALL ON TABLE "public"."estimate_modules" TO "service_role";



GRANT ALL ON TABLE "public"."estimate_modules_bak_house" TO "anon";
GRANT ALL ON TABLE "public"."estimate_modules_bak_house" TO "authenticated";
GRANT ALL ON TABLE "public"."estimate_modules_bak_house" TO "service_role";



GRANT ALL ON TABLE "public"."estimate_projects" TO "anon";
GRANT ALL ON TABLE "public"."estimate_projects" TO "authenticated";
GRANT ALL ON TABLE "public"."estimate_projects" TO "service_role";



GRANT ALL ON TABLE "public"."estimates" TO "anon";
GRANT ALL ON TABLE "public"."estimates" TO "authenticated";
GRANT ALL ON TABLE "public"."estimates" TO "service_role";



GRANT ALL ON TABLE "public"."ext_formulas_condition_access" TO "anon";
GRANT ALL ON TABLE "public"."ext_formulas_condition_access" TO "authenticated";
GRANT ALL ON TABLE "public"."ext_formulas_condition_access" TO "service_role";



GRANT ALL ON TABLE "public"."ext_formulas_condition_steps" TO "anon";
GRANT ALL ON TABLE "public"."ext_formulas_condition_steps" TO "authenticated";
GRANT ALL ON TABLE "public"."ext_formulas_condition_steps" TO "service_role";



GRANT ALL ON TABLE "public"."ext_formulas_conditions" TO "anon";
GRANT ALL ON TABLE "public"."ext_formulas_conditions" TO "authenticated";
GRANT ALL ON TABLE "public"."ext_formulas_conditions" TO "service_role";



GRANT ALL ON TABLE "public"."ext_formulas_formulas" TO "anon";
GRANT ALL ON TABLE "public"."ext_formulas_formulas" TO "authenticated";
GRANT ALL ON TABLE "public"."ext_formulas_formulas" TO "service_role";



GRANT ALL ON TABLE "public"."ext_formulas_steps" TO "anon";
GRANT ALL ON TABLE "public"."ext_formulas_steps" TO "authenticated";
GRANT ALL ON TABLE "public"."ext_formulas_steps" TO "service_role";



GRANT ALL ON TABLE "public"."ext_formulas_sub_conditions" TO "anon";
GRANT ALL ON TABLE "public"."ext_formulas_sub_conditions" TO "authenticated";
GRANT ALL ON TABLE "public"."ext_formulas_sub_conditions" TO "service_role";



GRANT ALL ON TABLE "public"."ext_plans" TO "anon";
GRANT ALL ON TABLE "public"."ext_plans" TO "authenticated";
GRANT ALL ON TABLE "public"."ext_plans" TO "service_role";



GRANT ALL ON TABLE "public"."feature_request_attachments" TO "anon";
GRANT ALL ON TABLE "public"."feature_request_attachments" TO "authenticated";
GRANT ALL ON TABLE "public"."feature_request_attachments" TO "service_role";



GRANT ALL ON TABLE "public"."feature_requests" TO "anon";
GRANT ALL ON TABLE "public"."feature_requests" TO "authenticated";
GRANT ALL ON TABLE "public"."feature_requests" TO "service_role";



GRANT ALL ON TABLE "public"."funnel_cards" TO "anon";
GRANT ALL ON TABLE "public"."funnel_cards" TO "authenticated";
GRANT ALL ON TABLE "public"."funnel_cards" TO "service_role";



GRANT ALL ON TABLE "public"."funnel_stages" TO "anon";
GRANT ALL ON TABLE "public"."funnel_stages" TO "authenticated";
GRANT ALL ON TABLE "public"."funnel_stages" TO "service_role";



GRANT ALL ON TABLE "public"."funnels" TO "anon";
GRANT ALL ON TABLE "public"."funnels" TO "authenticated";
GRANT ALL ON TABLE "public"."funnels" TO "service_role";



GRANT ALL ON TABLE "public"."general_category" TO "anon";
GRANT ALL ON TABLE "public"."general_category" TO "authenticated";
GRANT ALL ON TABLE "public"."general_category" TO "service_role";



GRANT ALL ON TABLE "public"."general_subcategory" TO "anon";
GRANT ALL ON TABLE "public"."general_subcategory" TO "authenticated";
GRANT ALL ON TABLE "public"."general_subcategory" TO "service_role";



GRANT ALL ON TABLE "public"."ghl_connections" TO "anon";
GRANT ALL ON TABLE "public"."ghl_connections" TO "authenticated";
GRANT ALL ON TABLE "public"."ghl_connections" TO "service_role";



GRANT ALL ON TABLE "public"."ghl_opportunities" TO "anon";
GRANT ALL ON TABLE "public"."ghl_opportunities" TO "authenticated";
GRANT ALL ON TABLE "public"."ghl_opportunities" TO "service_role";



GRANT ALL ON TABLE "public"."ghl_sync_log" TO "anon";
GRANT ALL ON TABLE "public"."ghl_sync_log" TO "authenticated";
GRANT ALL ON TABLE "public"."ghl_sync_log" TO "service_role";



GRANT ALL ON SEQUENCE "public"."ghl_sync_log_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."ghl_sync_log_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."ghl_sync_log_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."ghl_sync_state" TO "anon";
GRANT ALL ON TABLE "public"."ghl_sync_state" TO "authenticated";
GRANT ALL ON TABLE "public"."ghl_sync_state" TO "service_role";



GRANT ALL ON TABLE "public"."help_doc_categories" TO "anon";
GRANT ALL ON TABLE "public"."help_doc_categories" TO "authenticated";
GRANT ALL ON TABLE "public"."help_doc_categories" TO "service_role";



GRANT ALL ON TABLE "public"."help_docs" TO "anon";
GRANT ALL ON TABLE "public"."help_docs" TO "authenticated";
GRANT ALL ON TABLE "public"."help_docs" TO "service_role";



GRANT ALL ON TABLE "public"."help_video_categories" TO "anon";
GRANT ALL ON TABLE "public"."help_video_categories" TO "authenticated";
GRANT ALL ON TABLE "public"."help_video_categories" TO "service_role";



GRANT ALL ON TABLE "public"."help_videos" TO "anon";
GRANT ALL ON TABLE "public"."help_videos" TO "authenticated";
GRANT ALL ON TABLE "public"."help_videos" TO "service_role";



GRANT ALL ON TABLE "public"."hr_review_forms" TO "anon";
GRANT ALL ON TABLE "public"."hr_review_forms" TO "authenticated";
GRANT ALL ON TABLE "public"."hr_review_forms" TO "service_role";



GRANT ALL ON TABLE "public"."hr_reviews" TO "anon";
GRANT ALL ON TABLE "public"."hr_reviews" TO "authenticated";
GRANT ALL ON TABLE "public"."hr_reviews" TO "service_role";



GRANT ALL ON TABLE "public"."job_expenses" TO "anon";
GRANT ALL ON TABLE "public"."job_expenses" TO "authenticated";
GRANT ALL ON TABLE "public"."job_expenses" TO "service_role";



GRANT ALL ON TABLE "public"."job_files" TO "anon";
GRANT ALL ON TABLE "public"."job_files" TO "authenticated";
GRANT ALL ON TABLE "public"."job_files" TO "service_role";



GRANT ALL ON TABLE "public"."job_folders" TO "anon";
GRANT ALL ON TABLE "public"."job_folders" TO "authenticated";
GRANT ALL ON TABLE "public"."job_folders" TO "service_role";



GRANT ALL ON TABLE "public"."job_invoice_lines" TO "anon";
GRANT ALL ON TABLE "public"."job_invoice_lines" TO "authenticated";
GRANT ALL ON TABLE "public"."job_invoice_lines" TO "service_role";



GRANT ALL ON TABLE "public"."job_invoice_payments" TO "anon";
GRANT ALL ON TABLE "public"."job_invoice_payments" TO "authenticated";
GRANT ALL ON TABLE "public"."job_invoice_payments" TO "service_role";



GRANT ALL ON TABLE "public"."job_invoices" TO "anon";
GRANT ALL ON TABLE "public"."job_invoices" TO "authenticated";
GRANT ALL ON TABLE "public"."job_invoices" TO "service_role";



GRANT ALL ON TABLE "public"."job_stages" TO "anon";
GRANT ALL ON TABLE "public"."job_stages" TO "authenticated";
GRANT ALL ON TABLE "public"."job_stages" TO "service_role";



GRANT ALL ON TABLE "public"."job_tasks" TO "anon";
GRANT ALL ON TABLE "public"."job_tasks" TO "authenticated";
GRANT ALL ON TABLE "public"."job_tasks" TO "service_role";



GRANT ALL ON TABLE "public"."job_templates" TO "anon";
GRANT ALL ON TABLE "public"."job_templates" TO "authenticated";
GRANT ALL ON TABLE "public"."job_templates" TO "service_role";



GRANT ALL ON TABLE "public"."jobs" TO "anon";
GRANT ALL ON TABLE "public"."jobs" TO "authenticated";
GRANT ALL ON TABLE "public"."jobs" TO "service_role";



GRANT ALL ON TABLE "public"."labor_category" TO "anon";
GRANT ALL ON TABLE "public"."labor_category" TO "authenticated";
GRANT ALL ON TABLE "public"."labor_category" TO "service_role";



GRANT ALL ON TABLE "public"."labor_rates" TO "anon";
GRANT ALL ON TABLE "public"."labor_rates" TO "authenticated";
GRANT ALL ON TABLE "public"."labor_rates" TO "service_role";



GRANT ALL ON TABLE "public"."labor_subcategory" TO "anon";
GRANT ALL ON TABLE "public"."labor_subcategory" TO "authenticated";
GRANT ALL ON TABLE "public"."labor_subcategory" TO "service_role";



GRANT ALL ON TABLE "public"."lms_actions" TO "anon";
GRANT ALL ON TABLE "public"."lms_actions" TO "authenticated";
GRANT ALL ON TABLE "public"."lms_actions" TO "service_role";



GRANT ALL ON TABLE "public"."lms_assignments" TO "anon";
GRANT ALL ON TABLE "public"."lms_assignments" TO "authenticated";
GRANT ALL ON TABLE "public"."lms_assignments" TO "service_role";



GRANT ALL ON TABLE "public"."lms_categories" TO "anon";
GRANT ALL ON TABLE "public"."lms_categories" TO "authenticated";
GRANT ALL ON TABLE "public"."lms_categories" TO "service_role";



GRANT ALL ON TABLE "public"."lms_courses" TO "anon";
GRANT ALL ON TABLE "public"."lms_courses" TO "authenticated";
GRANT ALL ON TABLE "public"."lms_courses" TO "service_role";



GRANT ALL ON TABLE "public"."lms_learning_drills" TO "anon";
GRANT ALL ON TABLE "public"."lms_learning_drills" TO "authenticated";
GRANT ALL ON TABLE "public"."lms_learning_drills" TO "service_role";



GRANT ALL ON TABLE "public"."lms_quiz_attempts" TO "anon";
GRANT ALL ON TABLE "public"."lms_quiz_attempts" TO "authenticated";
GRANT ALL ON TABLE "public"."lms_quiz_attempts" TO "service_role";



GRANT ALL ON TABLE "public"."lms_quizzes" TO "anon";
GRANT ALL ON TABLE "public"."lms_quizzes" TO "authenticated";
GRANT ALL ON TABLE "public"."lms_quizzes" TO "service_role";



GRANT ALL ON TABLE "public"."lms_read_items" TO "anon";
GRANT ALL ON TABLE "public"."lms_read_items" TO "authenticated";
GRANT ALL ON TABLE "public"."lms_read_items" TO "service_role";



GRANT ALL ON TABLE "public"."lms_step_completions" TO "anon";
GRANT ALL ON TABLE "public"."lms_step_completions" TO "authenticated";
GRANT ALL ON TABLE "public"."lms_step_completions" TO "service_role";



GRANT ALL ON TABLE "public"."lms_steps" TO "anon";
GRANT ALL ON TABLE "public"."lms_steps" TO "authenticated";
GRANT ALL ON TABLE "public"."lms_steps" TO "service_role";



GRANT ALL ON TABLE "public"."lms_tests" TO "anon";
GRANT ALL ON TABLE "public"."lms_tests" TO "authenticated";
GRANT ALL ON TABLE "public"."lms_tests" TO "service_role";



GRANT ALL ON TABLE "public"."lms_videos" TO "anon";
GRANT ALL ON TABLE "public"."lms_videos" TO "authenticated";
GRANT ALL ON TABLE "public"."lms_videos" TO "service_role";



GRANT ALL ON TABLE "public"."master_equipment" TO "anon";
GRANT ALL ON TABLE "public"."master_equipment" TO "authenticated";
GRANT ALL ON TABLE "public"."master_equipment" TO "service_role";



GRANT ALL ON TABLE "public"."master_sub_crews" TO "anon";
GRANT ALL ON TABLE "public"."master_sub_crews" TO "authenticated";
GRANT ALL ON TABLE "public"."master_sub_crews" TO "service_role";



GRANT ALL ON TABLE "public"."material" TO "anon";
GRANT ALL ON TABLE "public"."material" TO "authenticated";
GRANT ALL ON TABLE "public"."material" TO "service_role";



GRANT ALL ON TABLE "public"."material_backup_premerge" TO "anon";
GRANT ALL ON TABLE "public"."material_backup_premerge" TO "authenticated";
GRANT ALL ON TABLE "public"."material_backup_premerge" TO "service_role";



GRANT ALL ON TABLE "public"."material_categories" TO "anon";
GRANT ALL ON TABLE "public"."material_categories" TO "authenticated";
GRANT ALL ON TABLE "public"."material_categories" TO "service_role";



GRANT ALL ON TABLE "public"."material_migration_map_backup" TO "anon";
GRANT ALL ON TABLE "public"."material_migration_map_backup" TO "authenticated";
GRANT ALL ON TABLE "public"."material_migration_map_backup" TO "service_role";



GRANT ALL ON TABLE "public"."material_price" TO "anon";
GRANT ALL ON TABLE "public"."material_price" TO "authenticated";
GRANT ALL ON TABLE "public"."material_price" TO "service_role";



GRANT ALL ON TABLE "public"."material_price_backup_prehist" TO "anon";
GRANT ALL ON TABLE "public"."material_price_backup_prehist" TO "authenticated";
GRANT ALL ON TABLE "public"."material_price_backup_prehist" TO "service_role";



GRANT ALL ON TABLE "public"."material_price_backup_premerge" TO "anon";
GRANT ALL ON TABLE "public"."material_price_backup_premerge" TO "authenticated";
GRANT ALL ON TABLE "public"."material_price_backup_premerge" TO "service_role";



GRANT ALL ON TABLE "public"."material_price_history_backup" TO "anon";
GRANT ALL ON TABLE "public"."material_price_history_backup" TO "authenticated";
GRANT ALL ON TABLE "public"."material_price_history_backup" TO "service_role";



GRANT ALL ON TABLE "public"."material_rates_backup_final" TO "anon";
GRANT ALL ON TABLE "public"."material_rates_backup_final" TO "authenticated";
GRANT ALL ON TABLE "public"."material_rates_backup_final" TO "service_role";



GRANT ALL ON TABLE "public"."misc_rates" TO "anon";
GRANT ALL ON TABLE "public"."misc_rates" TO "authenticated";
GRANT ALL ON TABLE "public"."misc_rates" TO "service_role";



GRANT ALL ON TABLE "public"."module_category_map" TO "anon";
GRANT ALL ON TABLE "public"."module_category_map" TO "authenticated";
GRANT ALL ON TABLE "public"."module_category_map" TO "service_role";



GRANT ALL ON TABLE "public"."module_equipment_map" TO "anon";
GRANT ALL ON TABLE "public"."module_equipment_map" TO "authenticated";
GRANT ALL ON TABLE "public"."module_equipment_map" TO "service_role";



GRANT ALL ON TABLE "public"."module_field_equipment_map" TO "anon";
GRANT ALL ON TABLE "public"."module_field_equipment_map" TO "authenticated";
GRANT ALL ON TABLE "public"."module_field_equipment_map" TO "service_role";



GRANT ALL ON TABLE "public"."modules" TO "anon";
GRANT ALL ON TABLE "public"."modules" TO "authenticated";
GRANT ALL ON TABLE "public"."modules" TO "service_role";



GRANT ALL ON TABLE "public"."org_chart_template_categories" TO "anon";
GRANT ALL ON TABLE "public"."org_chart_template_categories" TO "authenticated";
GRANT ALL ON TABLE "public"."org_chart_template_categories" TO "service_role";



GRANT ALL ON SEQUENCE "public"."org_chart_template_categories_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."org_chart_template_categories_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."org_chart_template_categories_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."org_chart_template_subcategories" TO "anon";
GRANT ALL ON TABLE "public"."org_chart_template_subcategories" TO "authenticated";
GRANT ALL ON TABLE "public"."org_chart_template_subcategories" TO "service_role";



GRANT ALL ON SEQUENCE "public"."org_chart_template_subcategories_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."org_chart_template_subcategories_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."org_chart_template_subcategories_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."org_chart_templates" TO "anon";
GRANT ALL ON TABLE "public"."org_chart_templates" TO "authenticated";
GRANT ALL ON TABLE "public"."org_chart_templates" TO "service_role";



GRANT ALL ON SEQUENCE "public"."org_chart_templates_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."org_chart_templates_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."org_chart_templates_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."org_chart_wizard_feedback" TO "anon";
GRANT ALL ON TABLE "public"."org_chart_wizard_feedback" TO "authenticated";
GRANT ALL ON TABLE "public"."org_chart_wizard_feedback" TO "service_role";



GRANT ALL ON SEQUENCE "public"."org_chart_wizard_feedback_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."org_chart_wizard_feedback_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."org_chart_wizard_feedback_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."org_charts" TO "anon";
GRANT ALL ON TABLE "public"."org_charts" TO "authenticated";
GRANT ALL ON TABLE "public"."org_charts" TO "service_role";



GRANT ALL ON TABLE "public"."org_edges" TO "anon";
GRANT ALL ON TABLE "public"."org_edges" TO "authenticated";
GRANT ALL ON TABLE "public"."org_edges" TO "service_role";



GRANT ALL ON TABLE "public"."org_node_types" TO "anon";
GRANT ALL ON TABLE "public"."org_node_types" TO "authenticated";
GRANT ALL ON TABLE "public"."org_node_types" TO "service_role";



GRANT ALL ON TABLE "public"."org_nodes" TO "anon";
GRANT ALL ON TABLE "public"."org_nodes" TO "authenticated";
GRANT ALL ON TABLE "public"."org_nodes" TO "service_role";



GRANT ALL ON TABLE "public"."package_requests" TO "anon";
GRANT ALL ON TABLE "public"."package_requests" TO "authenticated";
GRANT ALL ON TABLE "public"."package_requests" TO "service_role";



GRANT ALL ON TABLE "public"."packages" TO "anon";
GRANT ALL ON TABLE "public"."packages" TO "authenticated";
GRANT ALL ON TABLE "public"."packages" TO "service_role";



GRANT ALL ON TABLE "public"."paver_prices" TO "anon";
GRANT ALL ON TABLE "public"."paver_prices" TO "authenticated";
GRANT ALL ON TABLE "public"."paver_prices" TO "service_role";



GRANT ALL ON TABLE "public"."pbs_drive_members" TO "anon";
GRANT ALL ON TABLE "public"."pbs_drive_members" TO "authenticated";
GRANT ALL ON TABLE "public"."pbs_drive_members" TO "service_role";



GRANT ALL ON TABLE "public"."pbs_drives" TO "anon";
GRANT ALL ON TABLE "public"."pbs_drives" TO "authenticated";
GRANT ALL ON TABLE "public"."pbs_drives" TO "service_role";



GRANT ALL ON TABLE "public"."plans" TO "anon";
GRANT ALL ON TABLE "public"."plans" TO "authenticated";
GRANT ALL ON TABLE "public"."plans" TO "service_role";



GRANT ALL ON TABLE "public"."position_courses" TO "anon";
GRANT ALL ON TABLE "public"."position_courses" TO "authenticated";
GRANT ALL ON TABLE "public"."position_courses" TO "service_role";



GRANT ALL ON TABLE "public"."positions" TO "anon";
GRANT ALL ON TABLE "public"."positions" TO "authenticated";
GRANT ALL ON TABLE "public"."positions" TO "service_role";



GRANT ALL ON SEQUENCE "public"."positions_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."positions_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."positions_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."price_sheet_imports" TO "anon";
GRANT ALL ON TABLE "public"."price_sheet_imports" TO "authenticated";
GRANT ALL ON TABLE "public"."price_sheet_imports" TO "service_role";



GRANT ALL ON TABLE "public"."product_type" TO "anon";
GRANT ALL ON TABLE "public"."product_type" TO "authenticated";
GRANT ALL ON TABLE "public"."product_type" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."projects" TO "anon";
GRANT ALL ON TABLE "public"."projects" TO "authenticated";
GRANT ALL ON TABLE "public"."projects" TO "service_role";



GRANT ALL ON TABLE "public"."qb_connection" TO "anon";
GRANT ALL ON TABLE "public"."qb_connection" TO "authenticated";
GRANT ALL ON TABLE "public"."qb_connection" TO "service_role";



GRANT ALL ON TABLE "public"."qb_session" TO "anon";
GRANT ALL ON TABLE "public"."qb_session" TO "authenticated";
GRANT ALL ON TABLE "public"."qb_session" TO "service_role";



GRANT ALL ON TABLE "public"."qb_sync_log" TO "anon";
GRANT ALL ON TABLE "public"."qb_sync_log" TO "authenticated";
GRANT ALL ON TABLE "public"."qb_sync_log" TO "service_role";



GRANT ALL ON SEQUENCE "public"."qb_sync_log_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."qb_sync_log_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."qb_sync_log_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."qb_sync_state" TO "anon";
GRANT ALL ON TABLE "public"."qb_sync_state" TO "authenticated";
GRANT ALL ON TABLE "public"."qb_sync_state" TO "service_role";



GRANT ALL ON TABLE "public"."qb_time_tracking" TO "anon";
GRANT ALL ON TABLE "public"."qb_time_tracking" TO "authenticated";
GRANT ALL ON TABLE "public"."qb_time_tracking" TO "service_role";



GRANT ALL ON TABLE "public"."reward_games" TO "anon";
GRANT ALL ON TABLE "public"."reward_games" TO "authenticated";
GRANT ALL ON TABLE "public"."reward_games" TO "service_role";



GRANT ALL ON TABLE "public"."reward_rules" TO "anon";
GRANT ALL ON TABLE "public"."reward_rules" TO "authenticated";
GRANT ALL ON TABLE "public"."reward_rules" TO "service_role";



GRANT ALL ON TABLE "public"."reward_transactions" TO "anon";
GRANT ALL ON TABLE "public"."reward_transactions" TO "authenticated";
GRANT ALL ON TABLE "public"."reward_transactions" TO "service_role";



GRANT ALL ON TABLE "public"."sales_appointments" TO "anon";
GRANT ALL ON TABLE "public"."sales_appointments" TO "authenticated";
GRANT ALL ON TABLE "public"."sales_appointments" TO "service_role";



GRANT ALL ON TABLE "public"."sam_counter" TO "anon";
GRANT ALL ON TABLE "public"."sam_counter" TO "authenticated";
GRANT ALL ON TABLE "public"."sam_counter" TO "service_role";



GRANT ALL ON TABLE "public"."sam_public_usage" TO "anon";
GRANT ALL ON TABLE "public"."sam_public_usage" TO "authenticated";
GRANT ALL ON TABLE "public"."sam_public_usage" TO "service_role";



GRANT ALL ON TABLE "public"."schedule_items" TO "anon";
GRANT ALL ON TABLE "public"."schedule_items" TO "authenticated";
GRANT ALL ON TABLE "public"."schedule_items" TO "service_role";



GRANT ALL ON TABLE "public"."schedule_items_crew_backfill_bak" TO "anon";
GRANT ALL ON TABLE "public"."schedule_items_crew_backfill_bak" TO "authenticated";
GRANT ALL ON TABLE "public"."schedule_items_crew_backfill_bak" TO "service_role";



GRANT ALL ON TABLE "public"."schedule_items_sub_strip_bak" TO "anon";
GRANT ALL ON TABLE "public"."schedule_items_sub_strip_bak" TO "authenticated";
GRANT ALL ON TABLE "public"."schedule_items_sub_strip_bak" TO "service_role";



GRANT ALL ON TABLE "public"."schedule_items_title_strip_bak" TO "anon";
GRANT ALL ON TABLE "public"."schedule_items_title_strip_bak" TO "authenticated";
GRANT ALL ON TABLE "public"."schedule_items_title_strip_bak" TO "service_role";



GRANT ALL ON TABLE "public"."selections_backup" TO "anon";
GRANT ALL ON TABLE "public"."selections_backup" TO "authenticated";
GRANT ALL ON TABLE "public"."selections_backup" TO "service_role";



GRANT ALL ON TABLE "public"."stat_groups" TO "anon";
GRANT ALL ON TABLE "public"."stat_groups" TO "authenticated";
GRANT ALL ON TABLE "public"."stat_groups" TO "service_role";



GRANT ALL ON SEQUENCE "public"."stat_groups_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."stat_groups_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."stat_groups_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."stat_import_export_log" TO "anon";
GRANT ALL ON TABLE "public"."stat_import_export_log" TO "authenticated";
GRANT ALL ON TABLE "public"."stat_import_export_log" TO "service_role";



GRANT ALL ON TABLE "public"."stat_notes" TO "anon";
GRANT ALL ON TABLE "public"."stat_notes" TO "authenticated";
GRANT ALL ON TABLE "public"."stat_notes" TO "service_role";



GRANT ALL ON TABLE "public"."stat_reminder_log" TO "anon";
GRANT ALL ON TABLE "public"."stat_reminder_log" TO "authenticated";
GRANT ALL ON TABLE "public"."stat_reminder_log" TO "service_role";



GRANT ALL ON TABLE "public"."stat_reminders" TO "anon";
GRANT ALL ON TABLE "public"."stat_reminders" TO "authenticated";
GRANT ALL ON TABLE "public"."stat_reminders" TO "service_role";



GRANT ALL ON TABLE "public"."stat_sources" TO "anon";
GRANT ALL ON TABLE "public"."stat_sources" TO "authenticated";
GRANT ALL ON TABLE "public"."stat_sources" TO "service_role";



GRANT ALL ON TABLE "public"."statistic_shares" TO "anon";
GRANT ALL ON TABLE "public"."statistic_shares" TO "authenticated";
GRANT ALL ON TABLE "public"."statistic_shares" TO "service_role";



GRANT ALL ON TABLE "public"."statistic_values" TO "anon";
GRANT ALL ON TABLE "public"."statistic_values" TO "authenticated";
GRANT ALL ON TABLE "public"."statistic_values" TO "service_role";



GRANT ALL ON SEQUENCE "public"."statistic_values_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."statistic_values_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."statistic_values_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."statistics" TO "anon";
GRANT ALL ON TABLE "public"."statistics" TO "authenticated";
GRANT ALL ON TABLE "public"."statistics" TO "service_role";



GRANT ALL ON SEQUENCE "public"."statistics_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."statistics_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."statistics_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."sub_vendor_contracts" TO "anon";
GRANT ALL ON TABLE "public"."sub_vendor_contracts" TO "authenticated";
GRANT ALL ON TABLE "public"."sub_vendor_contracts" TO "service_role";



GRANT ALL ON TABLE "public"."sub_vendor_quotes" TO "anon";
GRANT ALL ON TABLE "public"."sub_vendor_quotes" TO "authenticated";
GRANT ALL ON TABLE "public"."sub_vendor_quotes" TO "service_role";



GRANT ALL ON TABLE "public"."subcategory" TO "anon";
GRANT ALL ON TABLE "public"."subcategory" TO "authenticated";
GRANT ALL ON TABLE "public"."subcategory" TO "service_role";



GRANT ALL ON TABLE "public"."subcontractor_category" TO "anon";
GRANT ALL ON TABLE "public"."subcontractor_category" TO "authenticated";
GRANT ALL ON TABLE "public"."subcontractor_category" TO "service_role";



GRANT ALL ON TABLE "public"."subcontractor_rates" TO "anon";
GRANT ALL ON TABLE "public"."subcontractor_rates" TO "authenticated";
GRANT ALL ON TABLE "public"."subcontractor_rates" TO "service_role";



GRANT ALL ON TABLE "public"."subcontractor_rates_backup_20260813" TO "anon";
GRANT ALL ON TABLE "public"."subcontractor_rates_backup_20260813" TO "authenticated";
GRANT ALL ON TABLE "public"."subcontractor_rates_backup_20260813" TO "service_role";



GRANT ALL ON TABLE "public"."subcontractor_rates_backup_dedupe_20260814" TO "anon";
GRANT ALL ON TABLE "public"."subcontractor_rates_backup_dedupe_20260814" TO "authenticated";
GRANT ALL ON TABLE "public"."subcontractor_rates_backup_dedupe_20260814" TO "service_role";



GRANT ALL ON TABLE "public"."subcontractor_rates_backup_itemtidy_20260814" TO "anon";
GRANT ALL ON TABLE "public"."subcontractor_rates_backup_itemtidy_20260814" TO "authenticated";
GRANT ALL ON TABLE "public"."subcontractor_rates_backup_itemtidy_20260814" TO "service_role";



GRANT ALL ON TABLE "public"."subcontractor_rates_backup_parse_20260814" TO "anon";
GRANT ALL ON TABLE "public"."subcontractor_rates_backup_parse_20260814" TO "authenticated";
GRANT ALL ON TABLE "public"."subcontractor_rates_backup_parse_20260814" TO "service_role";



GRANT ALL ON TABLE "public"."subcontractor_subcategory" TO "anon";
GRANT ALL ON TABLE "public"."subcontractor_subcategory" TO "authenticated";
GRANT ALL ON TABLE "public"."subcontractor_subcategory" TO "service_role";



GRANT ALL ON TABLE "public"."subs_vendors" TO "anon";
GRANT ALL ON TABLE "public"."subs_vendors" TO "authenticated";
GRANT ALL ON TABLE "public"."subs_vendors" TO "service_role";



GRANT ALL ON TABLE "public"."task_categories" TO "anon";
GRANT ALL ON TABLE "public"."task_categories" TO "authenticated";
GRANT ALL ON TABLE "public"."task_categories" TO "service_role";



GRANT ALL ON TABLE "public"."task_descriptions" TO "anon";
GRANT ALL ON TABLE "public"."task_descriptions" TO "authenticated";
GRANT ALL ON TABLE "public"."task_descriptions" TO "service_role";



GRANT ALL ON TABLE "public"."template_folders" TO "anon";
GRANT ALL ON TABLE "public"."template_folders" TO "authenticated";
GRANT ALL ON TABLE "public"."template_folders" TO "service_role";



GRANT ALL ON TABLE "public"."template_tasks" TO "anon";
GRANT ALL ON TABLE "public"."template_tasks" TO "authenticated";
GRANT ALL ON TABLE "public"."template_tasks" TO "service_role";



GRANT ALL ON TABLE "public"."tenant_extensions" TO "anon";
GRANT ALL ON TABLE "public"."tenant_extensions" TO "authenticated";
GRANT ALL ON TABLE "public"."tenant_extensions" TO "service_role";



GRANT ALL ON TABLE "public"."tenant_packages" TO "anon";
GRANT ALL ON TABLE "public"."tenant_packages" TO "authenticated";
GRANT ALL ON TABLE "public"."tenant_packages" TO "service_role";



GRANT ALL ON TABLE "public"."tenant_payment_connections" TO "service_role";



GRANT ALL ON TABLE "public"."tenants" TO "anon";
GRANT ALL ON TABLE "public"."tenants" TO "authenticated";
GRANT ALL ON TABLE "public"."tenants" TO "service_role";



GRANT ALL ON TABLE "public"."time_clock_breaks" TO "anon";
GRANT ALL ON TABLE "public"."time_clock_breaks" TO "authenticated";
GRANT ALL ON TABLE "public"."time_clock_breaks" TO "service_role";



GRANT ALL ON TABLE "public"."time_clock_permissions" TO "anon";
GRANT ALL ON TABLE "public"."time_clock_permissions" TO "authenticated";
GRANT ALL ON TABLE "public"."time_clock_permissions" TO "service_role";



GRANT ALL ON TABLE "public"."time_entries" TO "anon";
GRANT ALL ON TABLE "public"."time_entries" TO "authenticated";
GRANT ALL ON TABLE "public"."time_entries" TO "service_role";



GRANT ALL ON TABLE "public"."user_permissions" TO "anon";
GRANT ALL ON TABLE "public"."user_permissions" TO "authenticated";
GRANT ALL ON TABLE "public"."user_permissions" TO "service_role";



GRANT ALL ON TABLE "public"."v_acct_account_register" TO "anon";
GRANT ALL ON TABLE "public"."v_acct_account_register" TO "authenticated";
GRANT ALL ON TABLE "public"."v_acct_account_register" TO "service_role";



GRANT ALL ON TABLE "public"."v_acct_account_txn_counts" TO "anon";
GRANT ALL ON TABLE "public"."v_acct_account_txn_counts" TO "authenticated";
GRANT ALL ON TABLE "public"."v_acct_account_txn_counts" TO "service_role";



GRANT ALL ON TABLE "public"."v_job_material_costs" TO "anon";
GRANT ALL ON TABLE "public"."v_job_material_costs" TO "authenticated";
GRANT ALL ON TABLE "public"."v_job_material_costs" TO "service_role";



GRANT ALL ON TABLE "public"."v_qb_sync_state" TO "anon";
GRANT ALL ON TABLE "public"."v_qb_sync_state" TO "authenticated";
GRANT ALL ON TABLE "public"."v_qb_sync_state" TO "service_role";



GRANT ALL ON TABLE "public"."vendor_catalogs" TO "anon";
GRANT ALL ON TABLE "public"."vendor_catalogs" TO "authenticated";
GRANT ALL ON TABLE "public"."vendor_catalogs" TO "service_role";



GRANT ALL ON TABLE "public"."vendor_invoice_lines" TO "anon";
GRANT ALL ON TABLE "public"."vendor_invoice_lines" TO "authenticated";
GRANT ALL ON TABLE "public"."vendor_invoice_lines" TO "service_role";



GRANT ALL ON TABLE "public"."vendor_invoices" TO "anon";
GRANT ALL ON TABLE "public"."vendor_invoices" TO "authenticated";
GRANT ALL ON TABLE "public"."vendor_invoices" TO "service_role";



GRANT ALL ON TABLE "public"."view_rates_hidden" TO "anon";
GRANT ALL ON TABLE "public"."view_rates_hidden" TO "authenticated";
GRANT ALL ON TABLE "public"."view_rates_hidden" TO "service_role";



GRANT ALL ON TABLE "public"."website_leads" TO "anon";
GRANT ALL ON TABLE "public"."website_leads" TO "authenticated";
GRANT ALL ON TABLE "public"."website_leads" TO "service_role";



GRANT ALL ON TABLE "public"."website_pages" TO "anon";
GRANT ALL ON TABLE "public"."website_pages" TO "authenticated";
GRANT ALL ON TABLE "public"."website_pages" TO "service_role";



GRANT ALL ON TABLE "public"."websites" TO "anon";
GRANT ALL ON TABLE "public"."websites" TO "authenticated";
GRANT ALL ON TABLE "public"."websites" TO "service_role";



GRANT ALL ON TABLE "public"."work_orders" TO "anon";
GRANT ALL ON TABLE "public"."work_orders" TO "authenticated";
GRANT ALL ON TABLE "public"."work_orders" TO "service_role";



GRANT ALL ON TABLE "public"."workday_exceptions" TO "anon";
GRANT ALL ON TABLE "public"."workday_exceptions" TO "authenticated";
GRANT ALL ON TABLE "public"."workday_exceptions" TO "service_role";



GRANT ALL ON TABLE "public"."workflow_types" TO "anon";
GRANT ALL ON TABLE "public"."workflow_types" TO "authenticated";
GRANT ALL ON TABLE "public"."workflow_types" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































