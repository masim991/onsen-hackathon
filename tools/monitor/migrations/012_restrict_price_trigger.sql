-- A trigger function needs no API execute permission. Keep SECURITY DEFINER for
-- the trigger's price_history write, while removing public RPC exposure.
revoke all on function public.onsen_price_history() from public, anon, authenticated;
