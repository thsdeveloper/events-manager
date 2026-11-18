-- Additive IAM. Existing owners retain ownership; global roles grant no tenant access.
create table public.permissions (
 key text primary key check (key ~ '^[a-z_]+\.[a-z_]+$'),
 module text not null, label text not null,
 scope text not null check(scope in ('organization','event'))
);
create table public.roles (
 id uuid primary key default gen_random_uuid(),
 organization_id uuid references public.organizers(id) on delete cascade,
 key text unique, name text not null check(length(trim(name)) between 2 and 80),
 description text not null default '', created_by uuid references public.profiles(id) on delete set null,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 check ((organization_id is null and key is not null and key in ('owner','administrator','event_manager','finance','checkin')) or (organization_id is not null and key is null))
);
create unique index roles_name_organization_idx on public.roles(organization_id,lower(name)) nulls not distinct;
create table public.role_permissions (
 role_id uuid not null references public.roles(id) on delete cascade,
 permission text not null references public.permissions(key), primary key(role_id,permission)
);
create table public.organization_members (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizers(id) on delete cascade,
 user_id uuid not null references public.profiles(id) on delete cascade,
 status text not null default 'active' check(status in ('active','suspended','removed')),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(organization_id,user_id), unique(id,organization_id)
);
create index organization_members_user_idx on public.organization_members(user_id,status,organization_id);
create unique index events_id_organizer_iam_idx on public.events(id,organizer_id);
create table public.role_assignments (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizers(id) on delete cascade,
 member_id uuid not null, role_id uuid not null references public.roles(id) on delete restrict, event_id uuid,
 granted_by uuid references public.profiles(id) on delete set null, created_at timestamptz not null default now(),
 foreign key(member_id,organization_id) references public.organization_members(id,organization_id) on delete cascade,
 foreign key(event_id,organization_id) references public.events(id,organizer_id) on delete cascade,
 unique nulls not distinct(member_id,role_id,event_id)
);
create index role_assignments_scope_idx on public.role_assignments(organization_id,event_id,member_id);
create index role_assignments_role_idx on public.role_assignments(role_id);
create table public.user_invitations (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizers(id) on delete cascade,
 email text not null check(email=lower(trim(email)) and length(email)<=254),
 token_hash text not null unique check(token_hash ~ '^[a-f0-9]{64}$'),
 assignments jsonb not null check(jsonb_typeof(assignments)='array' and jsonb_array_length(assignments) between 1 and 100),
 invited_by uuid not null references public.profiles(id), accepted_by uuid references public.profiles(id),
 status text not null default 'pending' check(status in ('pending','accepted','revoked')),
 expires_at timestamptz not null default now()+interval '7 days', created_at timestamptz not null default now(), accepted_at timestamptz
);
create unique index user_invitations_pending_idx on public.user_invitations(organization_id,email) where status='pending';
create index user_invitations_email_idx on public.user_invitations(email,status,expires_at);
alter table public.audit_logs add column organization_id uuid references public.organizers(id) on delete set null;
create index audit_logs_organization_date_idx on public.audit_logs(organization_id,date_created desc);

-- All browser database access remains denied. No permissive policies are added.
alter table public.permissions enable row level security;
alter table public.roles enable row level security;
alter table public.role_permissions enable row level security;
alter table public.organization_members enable row level security;
alter table public.role_assignments enable row level security;
alter table public.user_invitations enable row level security;
revoke all on public.permissions,public.roles,public.role_permissions,public.organization_members,public.role_assignments,public.user_invitations from public,anon,authenticated;
grant select,insert,update,delete on public.permissions,public.roles,public.role_permissions,public.organization_members,public.role_assignments,public.user_invitations to service_role;

insert into public.permissions(key,module,label,scope) values
('dashboard.read','Visão geral','Consultar indicadores','event'),
('events.create','Eventos','Criar eventos e rascunhos','organization'),
('events.read','Eventos','Consultar eventos','event'),
('events.update','Eventos','Editar eventos','event'),
('events.delete','Eventos','Excluir eventos','event'),
('events.publish','Eventos','Publicar eventos','event'),
('tickets.read','Ingressos','Consultar tipos de ingresso','event'),
('tickets.create','Ingressos','Criar tipos e grupos','event'),
('tickets.update','Ingressos','Editar tipos e grupos','event'),
('tickets.delete','Ingressos','Excluir tipos e grupos','event'),
('participants.read','Participantes','Consultar participantes','event'),
('participants.update','Participantes','Editar participantes e reenviar ingressos','event'),
('participants.cancel','Participantes','Cancelar inscrições','event'),
('participants.export','Participantes','Exportar participantes','event'),
('checkin.execute','Check-in','Validar entradas','event'),
('checkin.undo','Check-in','Desfazer check-in','event'),
('coupons.read','Cupons','Consultar cupons','event'),
('coupons.create','Cupons','Criar cupons','event'),
('coupons.update','Cupons','Editar cupons','event'),
('coupons.delete','Cupons','Excluir cupons','event'),
('event_pages.read','Página do evento','Consultar página','event'),
('event_pages.update','Página do evento','Editar página','event'),
('event_pages.publish','Página do evento','Publicar página','event'),
('finance.read','Financeiro','Consultar vendas e receitas','event'),
('finance.export','Financeiro','Exportar financeiro','event'),
('refunds.create','Financeiro','Efetuar reembolsos','event'),
('reports.read','Relatórios','Consultar análises financeiras','event'),
('payouts.read','Financeiro','Consultar saldo e repasses da organização','organization'),
('organization.read','Organização','Consultar configurações','organization'),
('organization.update','Organização','Editar dados da organização','organization'),
('payments.configure','Organização','Configurar meios de pagamento','organization'),
('users.read','Equipe','Consultar membros e convites','organization'),
('users.invite','Equipe','Convidar membros e revogar convites','organization'),
('users.update','Equipe','Alterar atribuições e suspender acessos','organization'),
('users.remove','Equipe','Remover membros','organization'),
('roles.read','Cargos','Consultar cargos e permissões','organization'),
('roles.create','Cargos','Criar cargos personalizados','organization'),
('roles.update','Cargos','Editar cargos personalizados','organization'),
('roles.delete','Cargos','Excluir cargos personalizados','organization'),
('audit.read','Auditoria','Consultar histórico de acessos da equipe','organization');
insert into public.roles(id,key,name,description) values('00000000-0000-4000-8000-000000000001','owner','Proprietário','Responsável pela organização. Vínculo protegido.');
insert into public.role_permissions(role_id,permission) values
('00000000-0000-4000-8000-000000000001','dashboard.read'),
('00000000-0000-4000-8000-000000000001','events.create'),
('00000000-0000-4000-8000-000000000001','events.read'),
('00000000-0000-4000-8000-000000000001','events.update'),
('00000000-0000-4000-8000-000000000001','events.delete'),
('00000000-0000-4000-8000-000000000001','events.publish'),
('00000000-0000-4000-8000-000000000001','tickets.read'),
('00000000-0000-4000-8000-000000000001','tickets.create'),
('00000000-0000-4000-8000-000000000001','tickets.update'),
('00000000-0000-4000-8000-000000000001','tickets.delete'),
('00000000-0000-4000-8000-000000000001','participants.read'),
('00000000-0000-4000-8000-000000000001','participants.update'),
('00000000-0000-4000-8000-000000000001','participants.cancel'),
('00000000-0000-4000-8000-000000000001','participants.export'),
('00000000-0000-4000-8000-000000000001','checkin.execute'),
('00000000-0000-4000-8000-000000000001','checkin.undo'),
('00000000-0000-4000-8000-000000000001','coupons.read'),
('00000000-0000-4000-8000-000000000001','coupons.create'),
('00000000-0000-4000-8000-000000000001','coupons.update'),
('00000000-0000-4000-8000-000000000001','coupons.delete'),
('00000000-0000-4000-8000-000000000001','event_pages.read'),
('00000000-0000-4000-8000-000000000001','event_pages.update'),
('00000000-0000-4000-8000-000000000001','event_pages.publish'),
('00000000-0000-4000-8000-000000000001','finance.read'),
('00000000-0000-4000-8000-000000000001','finance.export'),
('00000000-0000-4000-8000-000000000001','refunds.create'),
('00000000-0000-4000-8000-000000000001','reports.read'),
('00000000-0000-4000-8000-000000000001','payouts.read'),
('00000000-0000-4000-8000-000000000001','organization.read'),
('00000000-0000-4000-8000-000000000001','organization.update'),
('00000000-0000-4000-8000-000000000001','payments.configure'),
('00000000-0000-4000-8000-000000000001','users.read'),
('00000000-0000-4000-8000-000000000001','users.invite'),
('00000000-0000-4000-8000-000000000001','users.update'),
('00000000-0000-4000-8000-000000000001','users.remove'),
('00000000-0000-4000-8000-000000000001','roles.read'),
('00000000-0000-4000-8000-000000000001','roles.create'),
('00000000-0000-4000-8000-000000000001','roles.update'),
('00000000-0000-4000-8000-000000000001','roles.delete'),
('00000000-0000-4000-8000-000000000001','audit.read');
insert into public.roles(id,key,name,description) values('00000000-0000-4000-8000-000000000002','administrator','Administrador','Operação e equipe. Sem ações financeiras por padrão.');
insert into public.role_permissions(role_id,permission) values
('00000000-0000-4000-8000-000000000002','events.create'),
('00000000-0000-4000-8000-000000000002','events.read'),
('00000000-0000-4000-8000-000000000002','events.update'),
('00000000-0000-4000-8000-000000000002','events.delete'),
('00000000-0000-4000-8000-000000000002','events.publish'),
('00000000-0000-4000-8000-000000000002','tickets.read'),
('00000000-0000-4000-8000-000000000002','tickets.create'),
('00000000-0000-4000-8000-000000000002','tickets.update'),
('00000000-0000-4000-8000-000000000002','tickets.delete'),
('00000000-0000-4000-8000-000000000002','participants.read'),
('00000000-0000-4000-8000-000000000002','participants.update'),
('00000000-0000-4000-8000-000000000002','participants.cancel'),
('00000000-0000-4000-8000-000000000002','participants.export'),
('00000000-0000-4000-8000-000000000002','checkin.execute'),
('00000000-0000-4000-8000-000000000002','checkin.undo'),
('00000000-0000-4000-8000-000000000002','coupons.read'),
('00000000-0000-4000-8000-000000000002','coupons.create'),
('00000000-0000-4000-8000-000000000002','coupons.update'),
('00000000-0000-4000-8000-000000000002','coupons.delete'),
('00000000-0000-4000-8000-000000000002','event_pages.read'),
('00000000-0000-4000-8000-000000000002','event_pages.update'),
('00000000-0000-4000-8000-000000000002','event_pages.publish'),
('00000000-0000-4000-8000-000000000002','organization.read'),
('00000000-0000-4000-8000-000000000002','organization.update'),
('00000000-0000-4000-8000-000000000002','users.read'),
('00000000-0000-4000-8000-000000000002','users.invite'),
('00000000-0000-4000-8000-000000000002','users.update'),
('00000000-0000-4000-8000-000000000002','users.remove'),
('00000000-0000-4000-8000-000000000002','roles.read'),
('00000000-0000-4000-8000-000000000002','roles.create'),
('00000000-0000-4000-8000-000000000002','roles.update'),
('00000000-0000-4000-8000-000000000002','roles.delete'),
('00000000-0000-4000-8000-000000000002','audit.read');
insert into public.roles(id,key,name,description) values('00000000-0000-4000-8000-000000000003','event_manager','Gerente de eventos','Gerencia a operação dos eventos atribuídos.');
insert into public.role_permissions(role_id,permission) values
('00000000-0000-4000-8000-000000000003','events.read'),
('00000000-0000-4000-8000-000000000003','events.update'),
('00000000-0000-4000-8000-000000000003','events.publish'),
('00000000-0000-4000-8000-000000000003','tickets.read'),
('00000000-0000-4000-8000-000000000003','tickets.create'),
('00000000-0000-4000-8000-000000000003','tickets.update'),
('00000000-0000-4000-8000-000000000003','tickets.delete'),
('00000000-0000-4000-8000-000000000003','participants.read'),
('00000000-0000-4000-8000-000000000003','participants.update'),
('00000000-0000-4000-8000-000000000003','participants.export'),
('00000000-0000-4000-8000-000000000003','checkin.execute'),
('00000000-0000-4000-8000-000000000003','checkin.undo'),
('00000000-0000-4000-8000-000000000003','coupons.read'),
('00000000-0000-4000-8000-000000000003','coupons.create'),
('00000000-0000-4000-8000-000000000003','coupons.update'),
('00000000-0000-4000-8000-000000000003','coupons.delete'),
('00000000-0000-4000-8000-000000000003','event_pages.read'),
('00000000-0000-4000-8000-000000000003','event_pages.update'),
('00000000-0000-4000-8000-000000000003','event_pages.publish');
insert into public.roles(id,key,name,description) values('00000000-0000-4000-8000-000000000004','finance','Financeiro','Consulta de receitas e relatórios, sem reembolsos ou configuração de pagamentos.');
insert into public.role_permissions(role_id,permission) values
('00000000-0000-4000-8000-000000000004','events.read'),
('00000000-0000-4000-8000-000000000004','tickets.read'),
('00000000-0000-4000-8000-000000000004','finance.read'),
('00000000-0000-4000-8000-000000000004','finance.export'),
('00000000-0000-4000-8000-000000000004','reports.read'),
('00000000-0000-4000-8000-000000000004','dashboard.read'),
('00000000-0000-4000-8000-000000000004','payouts.read');
insert into public.roles(id,key,name,description) values('00000000-0000-4000-8000-000000000005','checkin','Operador de check-in','Consulta participantes e valida entradas dos eventos autorizados.');
insert into public.role_permissions(role_id,permission) values
('00000000-0000-4000-8000-000000000005','events.read'),
('00000000-0000-4000-8000-000000000005','participants.read'),
('00000000-0000-4000-8000-000000000005','checkin.execute');

create function public.iam_guard_assignment() returns trigger language plpgsql set search_path=public,pg_temp as $$
declare r public.roles%rowtype;
begin
 select * into r from public.roles where id=new.role_id;
 if r.organization_id is not null and r.organization_id<>new.organization_id then raise exception 'IAM_ROLE_SCOPE';end if;
 if r.key='owner' and not exists(select 1 from public.organization_members m join public.organizers o on o.id=m.organization_id where m.id=new.member_id and m.user_id=o.user_id and new.event_id is null) then raise exception 'IAM_OWNER_PROTECTED';end if;
 return new;
end $$;
create trigger iam_assignment_scope before insert or update on public.role_assignments for each row execute function public.iam_guard_assignment();

create function public.iam_sync_owner() returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
declare member_id uuid;
begin
 if tg_op='UPDATE' and new.user_id is distinct from old.user_id then raise exception 'IAM_OWNER_TRANSFER_REQUIRED';end if;
 if new.user_id is not null then
  insert into public.organization_members(organization_id,user_id) values(new.id,new.user_id) on conflict(organization_id,user_id) do update set status='active' returning id into member_id;
  insert into public.role_assignments(organization_id,member_id,role_id) select new.id,member_id,id from public.roles where key='owner' on conflict do nothing;
 end if;
 return new;
end $$;
create trigger iam_owner_membership after insert or update of user_id on public.organizers for each row execute function public.iam_sync_owner();
insert into public.organization_members(organization_id,user_id) select id,user_id from public.organizers where user_id is not null;
insert into public.role_assignments(organization_id,member_id,role_id) select m.organization_id,m.id,r.id from public.organization_members m cross join public.roles r where r.key='owner';

create function public.iam_guard_member() returns trigger language plpgsql set search_path=public,pg_temp as $$
begin
 if tg_op='UPDATE' and (new.organization_id<>old.organization_id or new.user_id<>old.user_id) then raise exception 'IAM_MEMBER_IDENTITY';end if;
 if exists(select 1 from public.organizers where id=old.organization_id and user_id=old.user_id) and (tg_op='DELETE' or new.status<>'active') then raise exception 'IAM_OWNER_PROTECTED';end if;
 return case when tg_op='DELETE' then old else new end;
end $$;
create trigger iam_member_identity before update or delete on public.organization_members for each row execute function public.iam_guard_member();

create function public.iam_has_permission(actor uuid,organization uuid,permission_key text,target_event uuid default null) returns boolean
language sql stable security definer set search_path=public,pg_temp as $$
 select exists(
  select 1 from public.organization_members m join public.profiles p on p.id=m.user_id join public.organizers o on o.id=m.organization_id
  join public.permissions permission on permission.key=permission_key
  where m.user_id=actor and m.organization_id=organization and m.status='active' and p.status='active'
  and (o.status='active' or (o.status='pending' and o.user_id=actor))
  and (target_event is null or exists(select 1 from public.events where id=target_event and organizer_id=organization))
  and (o.user_id=actor or exists(
   select 1 from public.role_assignments a join public.role_permissions rp on rp.role_id=a.role_id
   where a.member_id=m.id and a.organization_id=organization and rp.permission=permission_key
   and (a.event_id is null or (a.event_id=target_event and permission.scope='event'))
  ))
 );
$$;
create function public.iam_access_context(actor uuid,organization uuid) returns jsonb
language sql stable security definer set search_path=public,pg_temp as $$
 select jsonb_build_object('userId',actor,'organizationId',organization,
 'active',exists(select 1 from public.organization_members m join public.profiles p on p.id=m.user_id join public.organizers o on o.id=m.organization_id where m.user_id=actor and m.organization_id=organization and m.status='active' and p.status='active' and (o.status='active' or (o.status='pending' and o.user_id=actor))),
 'isOwner',exists(select 1 from public.organizers where id=organization and user_id=actor),
 'permissions',coalesce((select jsonb_agg(key order by key) from public.permissions where public.iam_has_permission(actor,organization,key,null)),'[]'::jsonb),
 'events',coalesce((select jsonb_agg(jsonb_build_object('eventId',e.id,'permissions',(select coalesce(jsonb_agg(key order by key),'[]'::jsonb) from public.permissions where scope='event' and public.iam_has_permission(actor,organization,key,e.id))))
 from public.events e where e.organizer_id=organization and exists(select 1 from public.role_assignments a join public.organization_members m on m.id=a.member_id where m.user_id=actor and m.status='active' and a.event_id=e.id)),'[]'::jsonb));
$$;
create function public.iam_assert_permission(actor uuid,organization uuid,permission_key text,target_event uuid default null) returns void
language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if not public.iam_has_permission(actor,organization,permission_key,target_event) then raise exception 'IAM_PERMISSION_DENIED';end if;
end $$;
create function public.iam_assert_delegable(actor uuid,organization uuid,assignments jsonb) returns void
language plpgsql security definer set search_path=public,pg_temp as $$
declare a jsonb; r public.roles%rowtype; p record; event_id uuid; applicable integer;
begin
 if jsonb_typeof(assignments) is distinct from 'array' or jsonb_array_length(assignments) not between 1 and 100 then raise exception 'IAM_INVALID_ASSIGNMENTS';end if;
 for a in select value from jsonb_array_elements(assignments) loop
  select * into r from public.roles where id=(a->>'roleId')::uuid and (organization_id=organization or organization_id is null);
  if not found then raise exception 'IAM_ROLE_SCOPE';end if;
  if r.key='owner' then raise exception 'IAM_OWNER_PROTECTED';end if;
  event_id:=(a->>'eventId')::uuid;
  if event_id is not null and not exists(select 1 from public.events where id=event_id and organizer_id=organization) then raise exception 'IAM_EVENT_SCOPE';end if;
  applicable:=0;
  for p in select permission,scope from public.role_permissions rp join public.permissions catalog on catalog.key=rp.permission where role_id=r.id loop
   if event_id is null or p.scope='event' then
    applicable:=applicable+1;
    if not public.iam_has_permission(actor,organization,p.permission,event_id) then raise exception 'IAM_CANNOT_DELEGATE';end if;
   end if;
  end loop;
  if applicable=0 then raise exception 'IAM_EVENT_ROLE_EMPTY';end if;
 end loop;
end $$;

create function public.iam_manage(actor uuid,organization uuid,operation text,input jsonb) returns jsonb
language plpgsql security definer set search_path=public,pg_temp as $$
declare required_permission text; result jsonb; before_value jsonb; target_id uuid; role_record public.roles%rowtype; member_record public.organization_members%rowtype; a jsonb; p text; old_assignments jsonb;
begin
 -- Serialize permission mutations within the tenant, including revocations and invite acceptance.
 perform 1 from public.organizers where id=organization for update;
 required_permission:=case operation when 'roles.create' then 'roles.create' when 'roles.update' then 'roles.update' when 'roles.delete' then 'roles.delete'
 when 'members.update' then 'users.update' when 'members.remove' then 'users.remove' when 'invitations.create' then 'users.invite' when 'invitations.revoke' then 'users.invite' when 'invitations.resend' then 'users.invite' end;
 if required_permission is null then raise exception 'IAM_INVALID_OPERATION';end if;
 perform public.iam_assert_permission(actor,organization,required_permission,null);
 if operation like 'roles.%' then
  if operation<>'roles.create' then
   select * into role_record from public.roles where id=(input->>'id')::uuid and organization_id=organization for update;
   if not found then raise exception 'IAM_ROLE_NOT_FOUND';end if;
   before_value:=to_jsonb(role_record)||jsonb_build_object('permissions',(select jsonb_agg(permission) from public.role_permissions where role_id=role_record.id));
   for p in select permission from public.role_permissions where role_id=role_record.id loop
    if not public.iam_has_permission(actor,organization,p,null) then raise exception 'IAM_CANNOT_DELEGATE';end if;
   end loop;
  end if;
  if operation='roles.delete' then
   if exists(select 1 from public.role_assignments where role_id=role_record.id) or exists(select 1 from public.user_invitations i,jsonb_array_elements(i.assignments) assigned(value) where i.organization_id=organization and i.status='pending' and i.expires_at>now() and assigned.value->>'roleId'=role_record.id::text) then raise exception 'IAM_ROLE_IN_USE';end if;
   delete from public.roles where id=role_record.id;
   target_id:=role_record.id; result:=jsonb_build_object('id',target_id);
  else
   if jsonb_typeof(input->'permissions') is distinct from 'array' or jsonb_array_length(input->'permissions') not between 1 and 100 then raise exception 'IAM_INVALID_PERMISSIONS';end if;
   for p in select jsonb_array_elements_text(input->'permissions') loop
    if not public.iam_has_permission(actor,organization,p,null) then raise exception 'IAM_CANNOT_DELEGATE';end if;
   end loop;
   if operation='roles.create' then
    insert into public.roles(organization_id,name,description,created_by) values(organization,trim(input->>'name'),coalesce(input->>'description',''),actor) returning id into target_id;
   else
    target_id:=role_record.id;
    update public.roles set name=trim(input->>'name'),description=coalesce(input->>'description',''),updated_at=now() where id=target_id;
    delete from public.role_permissions where role_id=target_id;
   end if;
   insert into public.role_permissions(role_id,permission) select target_id,value from jsonb_array_elements_text(input->'permissions') on conflict do nothing;
   select to_jsonb(r)||jsonb_build_object('permissions',input->'permissions') into result from public.roles r where id=target_id;
  end if;
 elsif operation like 'members.%' then
  select * into member_record from public.organization_members where id=(input->>'id')::uuid and organization_id=organization for update;
  if not found then raise exception 'IAM_MEMBER_NOT_FOUND';end if;
  if exists(select 1 from public.organizers where id=organization and user_id=member_record.user_id) then raise exception 'IAM_OWNER_PROTECTED';end if;
  select coalesce(jsonb_agg(jsonb_build_object('roleId',role_id,'eventId',event_id)),'[]'::jsonb) into old_assignments from public.role_assignments where member_id=member_record.id;
  before_value:=to_jsonb(member_record)||jsonb_build_object('assignments',old_assignments);
  if jsonb_array_length(old_assignments)>0 then perform public.iam_assert_delegable(actor,organization,old_assignments);end if;
  target_id:=member_record.id;
  -- Superseded pending invitations must not undo a later suspension, removal or role change.
  with revoked as (
   update public.user_invitations set status='revoked'
   where organization_id=organization and status='pending' and email=(select lower(email) from auth.users where id=member_record.user_id)
   returning id
  ) insert into public.audit_logs(actor_id,organization_id,action,resource_type,resource_id,metadata)
    select actor,organization,'iam.invitations.revoke','invitations',id::text,jsonb_build_object('reason','membership_changed') from revoked;
  if operation='members.remove' then
   update public.organization_members set status='removed',updated_at=now() where id=target_id;
   delete from public.role_assignments where member_id=target_id;
  else
   if input->>'status' not in ('active','suspended') then raise exception 'IAM_INVALID_STATUS';end if;
   perform public.iam_assert_delegable(actor,organization,input->'assignments');
   delete from public.role_assignments where member_id=target_id;
   for a in select value from jsonb_array_elements(input->'assignments') loop
    insert into public.role_assignments(organization_id,member_id,role_id,event_id,granted_by) values(organization,target_id,(a->>'roleId')::uuid,(a->>'eventId')::uuid,actor);
   end loop;
   update public.organization_members set status=input->>'status',updated_at=now() where id=target_id;
  end if;
  result:=jsonb_build_object('id',target_id,'status',case when operation='members.remove' then 'removed' else input->>'status' end,'assignments',case when operation='members.remove' then '[]'::jsonb else input->'assignments' end);
 elsif operation='invitations.create' then
  perform public.iam_assert_delegable(actor,organization,input->'assignments');
  -- Only explicitly creating a new invitation revokes an expired predecessor.
  update public.user_invitations set status='revoked' where organization_id=organization and email=lower(trim(input->>'email')) and status='pending' and expires_at<=now();
  insert into public.user_invitations(organization_id,email,token_hash,assignments,invited_by)
   values(organization,lower(trim(input->>'email')),input->>'tokenHash',input->'assignments',actor) returning id into target_id;
  select to_jsonb(i)-'token_hash' into result from public.user_invitations i where id=target_id;
 elsif operation in ('invitations.revoke','invitations.resend') then
  select to_jsonb(i)-'token_hash' into before_value from public.user_invitations i where id=(input->>'id')::uuid and organization_id=organization and status='pending' for update;
  if not found then raise exception 'IAM_INVITATION_INVALID';end if;
  perform public.iam_assert_delegable(actor,organization,before_value->'assignments');
  target_id:=(input->>'id')::uuid;
  if operation='invitations.resend' then
   update public.user_invitations set token_hash=input->>'tokenHash',expires_at=now()+interval '7 days',invited_by=actor where id=target_id;
   select to_jsonb(i)-'token_hash' into result from public.user_invitations i where id=target_id;
  else
   update public.user_invitations set status='revoked' where id=target_id;
   result:=jsonb_build_object('id',target_id,'status','revoked');
  end if;
 end if;
 insert into public.audit_logs(actor_id,organization_id,action,resource_type,resource_id,before_data,after_data)
 values(actor,organization,'iam.'||operation,split_part(operation,'.',1),target_id::text,before_value,result);
 return result;
end $$;

create function public.iam_accept_invitation(actor uuid,invitation_hash text) returns jsonb
language plpgsql security definer set search_path=public,pg_temp as $$
declare invite public.user_invitations%rowtype; member_id uuid; member_status text; a jsonb;
begin
 select * into invite from public.user_invitations where token_hash=invitation_hash;
 if not found then raise exception 'IAM_INVITATION_INVALID';end if;
 perform 1 from public.organizers where id=invite.organization_id for update;
 select * into invite from public.user_invitations where id=invite.id for update;
 if invite.token_hash<>invitation_hash or invite.status<>'pending' or invite.expires_at<=now() then raise exception 'IAM_INVITATION_INVALID';end if;
 if not exists(select 1 from auth.users u join public.profiles p on p.id=u.id where u.id=actor and lower(u.email)=invite.email and u.email_confirmed_at is not null and p.status='active') then raise exception 'IAM_INVITATION_IDENTITY';end if;
 perform public.iam_assert_permission(invite.invited_by,invite.organization_id,'users.invite',null);
 perform public.iam_assert_delegable(invite.invited_by,invite.organization_id,invite.assignments);
 select id,status into member_id,member_status from public.organization_members where organization_id=invite.organization_id and user_id=actor for update;
 if member_status='suspended' then raise exception 'IAM_MEMBER_SUSPENDED';end if;
 if member_id is null then
  insert into public.organization_members(organization_id,user_id) values(invite.organization_id,actor) returning id into member_id;
 elsif member_status='removed' then
  update public.organization_members set status='active',updated_at=now() where id=member_id;
 end if;
 for a in select value from jsonb_array_elements(invite.assignments) loop
  insert into public.role_assignments(organization_id,member_id,role_id,event_id,granted_by)
  values(invite.organization_id,member_id,(a->>'roleId')::uuid,(a->>'eventId')::uuid,invite.invited_by) on conflict do nothing;
 end loop;
 update public.user_invitations set status='accepted',accepted_by=actor,accepted_at=now() where id=invite.id;
 insert into public.audit_logs(actor_id,organization_id,action,resource_type,resource_id,after_data) values(actor,invite.organization_id,'iam.invitations.accept','members',member_id::text,jsonb_build_object('invitationId',invite.id,'assignments',invite.assignments));
 return jsonb_build_object('organizationId',invite.organization_id,'memberId',member_id);
end $$;

-- Defense in depth: these functions accept trusted actor IDs from the API, never from browser RPCs.
revoke all on function public.iam_guard_assignment(),public.iam_sync_owner(),public.iam_guard_member(),public.iam_has_permission(uuid,uuid,text,uuid),public.iam_access_context(uuid,uuid),public.iam_assert_permission(uuid,uuid,text,uuid),public.iam_assert_delegable(uuid,uuid,jsonb),public.iam_manage(uuid,uuid,text,jsonb),public.iam_accept_invitation(uuid,text) from public,anon,authenticated;
grant execute on function public.iam_has_permission(uuid,uuid,text,uuid),public.iam_access_context(uuid,uuid),public.iam_manage(uuid,uuid,text,jsonb),public.iam_accept_invitation(uuid,text) to service_role;

-- Apply the event filter before aggregating every dashboard metric.
create or replace function public.get_iam_dashboard(target_organizer uuid, allowed_events uuid[])
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  with organizer_events as materialized (
    select
      e.id,
      e.title,
      e.slug,
      e.status,
      e.start_date,
      coalesce(
        nullif(e.location_name, ''),
        nullif(e.location_address, ''),
        case when e.event_type = 'online' then 'Online' else 'Local a definir' end
      ) as location
    from public.events e
    where e.organizer_id = target_organizer
      and e.id = any(allowed_events)
  ),
  event_metrics as (
    select
      count(*)::bigint as total_events,
      count(*) filter (where status = 'published')::bigint as published_events,
      count(*) filter (
        where status = 'published'
          and start_date >= pg_catalog.now()
      )::bigint as upcoming_events
    from organizer_events
  ),
  registrations_by_event as (
    select
      r.event_id,
      coalesce(sum(r.quantity) filter (where r.status <> 'cancelled'), 0)::bigint as participants,
      coalesce(sum(r.total_amount) filter (where r.payment_status = 'paid'), 0)::numeric as gross_revenue
    from public.event_registrations r
    join organizer_events e on e.id = r.event_id
    group by r.event_id
  ),
  registration_metrics as (
    select
      coalesce(sum(participants), 0)::bigint as participants,
      coalesce(sum(gross_revenue), 0)::numeric as gross_revenue
    from registrations_by_event
  ),
  tickets_by_event as (
    select
      t.event_id,
      coalesce(sum(t.quantity_sold), 0)::bigint as tickets_sold
    from public.event_tickets t
    join organizer_events e on e.id = t.event_id
    group by t.event_id
  ),
  ticket_metrics as (
    select coalesce(sum(tickets_sold), 0)::bigint as tickets_sold
    from tickets_by_event
  ),
  recent_events as (
    select
      e.id,
      e.title,
      e.slug,
      e.status,
      e.start_date,
      e.location,
      coalesce(r.participants, 0)::bigint as participant_count,
      coalesce(t.tickets_sold, 0)::bigint as tickets_sold
    from organizer_events e
    left join registrations_by_event r on r.event_id = e.id
    left join tickets_by_event t on t.event_id = e.id
    order by e.start_date desc
    limit 5
  )
  select pg_catalog.jsonb_build_object(
    'metrics', pg_catalog.jsonb_build_object(
      'totalEvents', event_metrics.total_events,
      'publishedEvents', event_metrics.published_events,
      'upcomingEvents', event_metrics.upcoming_events,
      'participants', registration_metrics.participants,
      'ticketsSold', ticket_metrics.tickets_sold,
      'grossRevenue', registration_metrics.gross_revenue
    ),
    'recentEvents', coalesce(
      (
        select pg_catalog.jsonb_agg(
          pg_catalog.jsonb_build_object(
            'id', recent_events.id,
            'title', recent_events.title,
            'slug', recent_events.slug,
            'status', recent_events.status,
            'startDate', recent_events.start_date,
            'location', recent_events.location,
            'participantCount', recent_events.participant_count,
            'ticketsSold', recent_events.tickets_sold
          )
          order by recent_events.start_date desc
        )
        from recent_events
      ),
      '[]'::jsonb
    )
  )
  from event_metrics, registration_metrics, ticket_metrics;
$$;


revoke all on function public.get_iam_dashboard(uuid,uuid[]) from public,anon,authenticated;
grant execute on function public.get_iam_dashboard(uuid,uuid[]) to service_role;
