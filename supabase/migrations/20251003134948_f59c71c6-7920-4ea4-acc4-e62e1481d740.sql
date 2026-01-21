-- Ensure role permissions sync when new modules or roles are created
-- 1) Helper to insert missing role_permissions for a role across all modules
create or replace function public.sync_role_permissions_for_role(p_role text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.role_permissions (role, module_id, can_access, allowed_actions)
  select p_role, sm.id, false, array[]::uuid[]
  from public.system_modules sm
  where not exists (
    select 1 from public.role_permissions rp where rp.role = p_role and rp.module_id = sm.id
  );
end;
$$;

-- 2) Trigger after inserting a system module → create default permissions for all roles
create or replace function public.after_system_module_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare r record;
begin
  -- Seed for built-in system roles
  perform public.sync_role_permissions_for_role(r)
  from (values
    ('superAdmin'),('admin'),('supervisor'),('qualityAnalyst'),('backOffice'),('agent')
  ) as roles(r);

  -- Seed for all custom roles
  for r in select name from public.custom_roles loop
    perform public.sync_role_permissions_for_role(r.name);
  end loop;

  return new;
end;
$$;

drop trigger if exists trg_after_system_module_insert on public.system_modules;
create trigger trg_after_system_module_insert
after insert on public.system_modules
for each row execute function public.after_system_module_insert();

-- 3) Trigger after inserting a custom role → create default permissions for all modules
create or replace function public.after_custom_role_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.sync_role_permissions_for_role(new.name);
  return new;
end;
$$;

drop trigger if exists trg_after_custom_role_insert on public.custom_roles;
create trigger trg_after_custom_role_insert
after insert on public.custom_roles
for each row execute function public.after_custom_role_insert();

-- 4) RLS for role_permissions: allow ONLY superAdmin to manage/read
alter table public.role_permissions enable row level security;

drop policy if exists "SuperAdmin manage role permissions" on public.role_permissions;
create policy "SuperAdmin manage role permissions"
  on public.role_permissions
  for all
  using (public.is_super_admin())
  with check (public.is_super_admin());

-- 5) Effective permissions RPCs so UI can fetch current permissions easily
create or replace function public.get_effective_permissions_for_user(p_user_id uuid)
returns table (
  module_id uuid,
  module_name text,
  can_access boolean,
  allowed_actions uuid[]
)
language plpgsql
security definer
set search_path = public
as $$
declare v_role text;
begin
  select role into v_role from public.profiles where id = p_user_id;

  return query
  select sm.id,
         sm.name,
         coalesce(up.can_access, rp.can_access, false) as can_access,
         coalesce(up.allowed_actions, rp.allowed_actions, array[]::uuid[]) as allowed_actions
  from public.system_modules sm
  left join public.role_permissions rp on rp.module_id = sm.id and rp.role = v_role
  left join public.user_permissions up on up.module_id = sm.id and up.user_id = p_user_id
  order by sm.order_index, sm.display_name;
end;
$$;

create or replace function public.get_permissions_for_role(p_role text)
returns table (
  module_id uuid,
  module_name text,
  can_access boolean,
  allowed_actions uuid[]
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  select sm.id,
         sm.name,
         coalesce(rp.can_access, false) as can_access,
         coalesce(rp.allowed_actions, array[]::uuid[]) as allowed_actions
  from public.system_modules sm
  left join public.role_permissions rp on rp.module_id = sm.id and rp.role = p_role
  order by sm.order_index, sm.display_name;
end;
$$;