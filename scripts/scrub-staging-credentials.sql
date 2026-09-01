-- Remove LIVE provider credentials that a production data copy drags into staging.
--
-- The app stores per-tenant provider settings in the DATABASE (so each tenant can
-- bring their own Resend/Twilio/Helcim account), which means a data refresh copies
-- working credentials along with the rows. Left in place, staging can send real
-- email and SMS, write to the live CRM, and reference real saved cards.
--
-- STAGING ONLY. Run after every refresh from production.
--   supabase db query --linked -f scripts/scrub-staging-credentials.sql

update public.company_settings
   set email_config = null
 where email_config is not null;

update public.company_settings
   set sms_config = null
 where sms_config is not null;

delete from public.ghl_connections;

update public.client_payment_methods
   set helcim_card_token = null
 where helcim_card_token is not null;

update public.tenant_payment_connections
   set helcim_api_token = null
 where helcim_api_token is not null;
