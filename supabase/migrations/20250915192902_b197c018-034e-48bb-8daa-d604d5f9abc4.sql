-- Allow everyone to read the global voice setting, but only superAdmins can modify
create policy "Everyone can read global voice setting"
  on public.app_settings
  for select
  to authenticated
  using (key = 'training_global_voice');