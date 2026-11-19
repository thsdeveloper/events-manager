-- Platform IAM is independent of organization memberships. Existing super-admin profiles remain protected roots.
create table public.platform_permissions(key text primary key check(key ~ '^platform_[a-z_]+\.[a-z_]+$'),module text not null,label text not null);
create table public.platform_roles(id uuid primary key default gen_random_uuid(),key text unique,name text not null check(length(trim(name)) between 2 and 80),description text not null default '',created_by uuid references public.profiles(id),created_at timestamptz not null default now(),updated_at timestamptz not null default now(),check(key is null or key in ('owner','support','finance','content','reader')));
create unique index platform_roles_name_idx on public.platform_roles(lower(name));
create table public.platform_role_permissions(role_id uuid references public.platform_roles(id) on delete cascade,permission text references public.platform_permissions(key),primary key(role_id,permission));
create table public.platform_members(id uuid primary key default gen_random_uuid(),user_id uuid not null unique references public.profiles(id) on delete cascade,status text not null default 'active' check(status in ('active','suspended','removed')),created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create table public.platform_role_assignments(member_id uuid references public.platform_members(id) on delete cascade,role_id uuid references public.platform_roles(id) on delete restrict,granted_by uuid references public.profiles(id),created_at timestamptz not null default now(),primary key(member_id,role_id));
create index platform_role_assignments_role_idx on public.platform_role_assignments(role_id);
create table public.platform_invitations(id uuid primary key default gen_random_uuid(),email text not null check(email=lower(trim(email)) and length(email)<=254),token_hash text not null unique check(token_hash ~ '^[a-f0-9]{64}$'),assignments jsonb not null check(jsonb_typeof(assignments)='array' and jsonb_array_length(assignments) between 1 and 100),invited_by uuid not null references public.profiles(id),accepted_by uuid references public.profiles(id),status text not null default 'pending' check(status in ('pending','accepted','revoked')),expires_at timestamptz not null default now()+interval '7 days',created_at timestamptz not null default now(),accepted_at timestamptz);
create unique index platform_invitations_pending_idx on public.platform_invitations(email) where status='pending';
create index platform_audit_date_idx on public.audit_logs(date_created desc) where action like 'platform_iam.%';
alter table public.platform_permissions enable row level security;
revoke all on public.platform_permissions from public,anon,authenticated;
grant select,insert,update,delete on public.platform_permissions to service_role;
alter table public.platform_roles enable row level security;
revoke all on public.platform_roles from public,anon,authenticated;
grant select,insert,update,delete on public.platform_roles to service_role;
alter table public.platform_role_permissions enable row level security;
revoke all on public.platform_role_permissions from public,anon,authenticated;
grant select,insert,update,delete on public.platform_role_permissions to service_role;
alter table public.platform_members enable row level security;
revoke all on public.platform_members from public,anon,authenticated;
grant select,insert,update,delete on public.platform_members to service_role;
alter table public.platform_role_assignments enable row level security;
revoke all on public.platform_role_assignments from public,anon,authenticated;
grant select,insert,update,delete on public.platform_role_assignments to service_role;
alter table public.platform_invitations enable row level security;
revoke all on public.platform_invitations from public,anon,authenticated;
grant select,insert,update,delete on public.platform_invitations to service_role;
insert into public.platform_permissions(key,module,label) values
('platform_overview.read','Visão geral','Consultar indicadores da plataforma'),
('platform_organizers.read','Organizadores','Consultar organizadores e eventos'),
('platform_organizers.update','Organizadores','Editar cadastro, status e atendimento'),
('platform_finance.read','Financeiro','Consultar transações, saldos e repasses'),
('platform_payouts.execute','Financeiro','Executar, concluir e cancelar repasses'),
('platform_receiving.read','Validação cadastral','Consultar contas de recebimento e documentos'),
('platform_receiving.review','Validação cadastral','Aprovar ou rejeitar dados de recebimento'),
('platform_settings.read','Taxas e gateway','Consultar taxas e gateway'),
('platform_settings.update','Taxas e gateway','Alterar taxas e gateway'),
('platform_branding.read','Identidade visual','Consultar identidade visual'),
('platform_branding.update','Identidade visual','Alterar identidade visual'),
('platform_categories.read','Categorias','Consultar categorias'),
('platform_categories.update','Categorias','Criar, editar e excluir categorias'),
('platform_content.read','Conteúdo','Consultar indicadores de conteúdo'),
('platform_pages.read','Páginas','Consultar páginas e versões'),
('platform_pages.update','Páginas','Criar, editar e excluir páginas'),
('platform_pages.publish','Páginas','Publicar ou despublicar páginas'),
('platform_posts.read','Blog','Consultar posts'),
('platform_posts.update','Blog','Criar, editar e excluir posts'),
('platform_posts.publish','Blog','Publicar ou despublicar posts'),
('platform_navigation.read','Menus','Consultar menus'),
('platform_navigation.update','Menus','Alterar menus'),
('platform_forms.read','Formulários','Consultar formulários e respostas'),
('platform_forms.update','Formulários','Alterar formulários'),
('platform_redirects.read','Redirecionamentos','Consultar redirecionamentos'),
('platform_redirects.update','Redirecionamentos','Alterar redirecionamentos'),
('platform_media.read','Mídia','Consultar biblioteca de mídia'),
('platform_media.update','Mídia','Editar e excluir mídia'),
('platform_site.read','Site e SEO','Consultar configurações do site'),
('platform_site.update','Site e SEO','Alterar configurações do site'),
('platform_users.read','Equipe da plataforma','Consultar membros e convites'),
('platform_users.invite','Equipe da plataforma','Convidar e revogar convites'),
('platform_users.update','Equipe da plataforma','Alterar cargos e suspender acessos'),
('platform_users.remove','Equipe da plataforma','Remover membros'),
('platform_roles.read','Cargos da plataforma','Consultar cargos e permissões'),
('platform_roles.create','Cargos da plataforma','Criar cargos'),
('platform_roles.update','Cargos da plataforma','Editar cargos'),
('platform_roles.delete','Cargos da plataforma','Excluir cargos'),
('platform_audit.read','Auditoria','Consultar auditoria da equipe da plataforma');
insert into public.platform_roles(id,key,name,description) values('10000000-0000-4000-8000-000000000001','owner','Super-admin principal','Responsável protegido da plataforma.');
insert into public.platform_role_permissions(role_id,permission) values ('10000000-0000-4000-8000-000000000001','platform_overview.read'),('10000000-0000-4000-8000-000000000001','platform_organizers.read'),('10000000-0000-4000-8000-000000000001','platform_organizers.update'),('10000000-0000-4000-8000-000000000001','platform_finance.read'),('10000000-0000-4000-8000-000000000001','platform_payouts.execute'),('10000000-0000-4000-8000-000000000001','platform_receiving.read'),('10000000-0000-4000-8000-000000000001','platform_receiving.review'),('10000000-0000-4000-8000-000000000001','platform_settings.read'),('10000000-0000-4000-8000-000000000001','platform_settings.update'),('10000000-0000-4000-8000-000000000001','platform_branding.read'),('10000000-0000-4000-8000-000000000001','platform_branding.update'),('10000000-0000-4000-8000-000000000001','platform_categories.read'),('10000000-0000-4000-8000-000000000001','platform_categories.update'),('10000000-0000-4000-8000-000000000001','platform_content.read'),('10000000-0000-4000-8000-000000000001','platform_pages.read'),('10000000-0000-4000-8000-000000000001','platform_pages.update'),('10000000-0000-4000-8000-000000000001','platform_pages.publish'),('10000000-0000-4000-8000-000000000001','platform_posts.read'),('10000000-0000-4000-8000-000000000001','platform_posts.update'),('10000000-0000-4000-8000-000000000001','platform_posts.publish'),('10000000-0000-4000-8000-000000000001','platform_navigation.read'),('10000000-0000-4000-8000-000000000001','platform_navigation.update'),('10000000-0000-4000-8000-000000000001','platform_forms.read'),('10000000-0000-4000-8000-000000000001','platform_forms.update'),('10000000-0000-4000-8000-000000000001','platform_redirects.read'),('10000000-0000-4000-8000-000000000001','platform_redirects.update'),('10000000-0000-4000-8000-000000000001','platform_media.read'),('10000000-0000-4000-8000-000000000001','platform_media.update'),('10000000-0000-4000-8000-000000000001','platform_site.read'),('10000000-0000-4000-8000-000000000001','platform_site.update'),('10000000-0000-4000-8000-000000000001','platform_users.read'),('10000000-0000-4000-8000-000000000001','platform_users.invite'),('10000000-0000-4000-8000-000000000001','platform_users.update'),('10000000-0000-4000-8000-000000000001','platform_users.remove'),('10000000-0000-4000-8000-000000000001','platform_roles.read'),('10000000-0000-4000-8000-000000000001','platform_roles.create'),('10000000-0000-4000-8000-000000000001','platform_roles.update'),('10000000-0000-4000-8000-000000000001','platform_roles.delete'),('10000000-0000-4000-8000-000000000001','platform_audit.read');
insert into public.platform_roles(id,key,name,description) values('10000000-0000-4000-8000-000000000002','support','Atendimento','Consulta e manutenção de organizadores, sem financeiro nem documentos.');
insert into public.platform_role_permissions(role_id,permission) values ('10000000-0000-4000-8000-000000000002','platform_organizers.read'),('10000000-0000-4000-8000-000000000002','platform_organizers.update');
insert into public.platform_roles(id,key,name,description) values('10000000-0000-4000-8000-000000000003','finance','Financeiro da plataforma','Consulta financeira, sem executar repasses.');
insert into public.platform_role_permissions(role_id,permission) values ('10000000-0000-4000-8000-000000000003','platform_overview.read'),('10000000-0000-4000-8000-000000000003','platform_finance.read'),('10000000-0000-4000-8000-000000000003','platform_organizers.read');
insert into public.platform_roles(id,key,name,description) values('10000000-0000-4000-8000-000000000004','content','Editor de conteúdo','Gestão do CMS e categorias.');
insert into public.platform_role_permissions(role_id,permission) values ('10000000-0000-4000-8000-000000000004','platform_categories.read'),('10000000-0000-4000-8000-000000000004','platform_categories.update'),('10000000-0000-4000-8000-000000000004','platform_content.read'),('10000000-0000-4000-8000-000000000004','platform_pages.read'),('10000000-0000-4000-8000-000000000004','platform_pages.update'),('10000000-0000-4000-8000-000000000004','platform_pages.publish'),('10000000-0000-4000-8000-000000000004','platform_posts.read'),('10000000-0000-4000-8000-000000000004','platform_posts.update'),('10000000-0000-4000-8000-000000000004','platform_posts.publish'),('10000000-0000-4000-8000-000000000004','platform_navigation.read'),('10000000-0000-4000-8000-000000000004','platform_navigation.update'),('10000000-0000-4000-8000-000000000004','platform_forms.read'),('10000000-0000-4000-8000-000000000004','platform_forms.update'),('10000000-0000-4000-8000-000000000004','platform_redirects.read'),('10000000-0000-4000-8000-000000000004','platform_redirects.update'),('10000000-0000-4000-8000-000000000004','platform_media.read'),('10000000-0000-4000-8000-000000000004','platform_media.update'),('10000000-0000-4000-8000-000000000004','platform_site.read'),('10000000-0000-4000-8000-000000000004','platform_site.update');
insert into public.platform_roles(id,key,name,description) values('10000000-0000-4000-8000-000000000005','reader','Consulta da plataforma','Consulta de indicadores e organizadores.');
insert into public.platform_role_permissions(role_id,permission) values ('10000000-0000-4000-8000-000000000005','platform_overview.read'),('10000000-0000-4000-8000-000000000005','platform_finance.read'),('10000000-0000-4000-8000-000000000005','platform_organizers.read');

create function public.platform_has_permission(actor uuid,permission_key text) returns boolean language sql stable security definer set search_path=public,pg_temp as $$
 select exists(select 1 from public.profiles p where p.id=actor and p.status='active' and exists(select 1 from public.platform_permissions where key=permission_key) and
 (p.role='super_admin' or exists(select 1 from public.platform_members m join public.platform_role_assignments a on a.member_id=m.id join public.platform_role_permissions rp on rp.role_id=a.role_id where m.user_id=actor and m.status='active' and rp.permission=permission_key)));
$$;
create function public.platform_access_context(actor uuid) returns jsonb language sql stable security definer set search_path=public,pg_temp as $$
 select jsonb_build_object('userId',actor,'active',exists(select 1 from public.profiles p where p.id=actor and p.status='active' and (p.role='super_admin' or exists(select 1 from public.platform_members m where m.user_id=actor and m.status='active'))),'isRoot',exists(select 1 from public.profiles where id=actor and role='super_admin' and status='active'),'permissions',coalesce((select jsonb_agg(key order by key) from public.platform_permissions where public.platform_has_permission(actor,key)),'[]'::jsonb));
$$;
create function public.platform_assert_permission(actor uuid,permission_key text) returns void language plpgsql security definer set search_path=public,pg_temp as $$
begin if not public.platform_has_permission(actor,permission_key) then raise exception 'IAM_PERMISSION_DENIED';end if;end$$;
create function public.platform_guard_assignment() returns trigger language plpgsql set search_path=public,pg_temp as $$
begin
 if exists(select 1 from public.platform_roles where id=new.role_id and key='owner') then raise exception 'IAM_OWNER_PROTECTED';end if;
 return new;
end$$;
create trigger platform_assignment_guard before insert or update on public.platform_role_assignments for each row execute function public.platform_guard_assignment();
create function public.platform_assert_delegable(actor uuid,assignments jsonb) returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare item jsonb; selected_role uuid; permission_key text;
begin
 if jsonb_typeof(assignments) is distinct from 'array' or jsonb_array_length(assignments) not between 1 and 100 then raise exception 'IAM_INVALID_PERMISSIONS';end if;
 for item in select value from jsonb_array_elements(assignments) loop
  if item->>'eventId' is not null then raise exception 'IAM_EVENT_SCOPE';end if;
  selected_role:=(item->>'roleId')::uuid;
  if not exists(select 1 from public.platform_roles where id=selected_role) then raise exception 'IAM_ROLE_NOT_FOUND';end if;
  if exists(select 1 from public.platform_roles where id=selected_role and key='owner') then raise exception 'IAM_OWNER_PROTECTED';end if;
  for permission_key in select permission from public.platform_role_permissions where platform_role_permissions.role_id=selected_role loop
   if not public.platform_has_permission(actor,permission_key) then raise exception 'IAM_CANNOT_DELEGATE';end if;
  end loop;
 end loop;
end$$;
create function public.platform_manage(actor uuid,operation text,input jsonb) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare required_permission text; result jsonb; before_value jsonb; target_id uuid; role_record public.platform_roles%rowtype; member_record public.platform_members%rowtype; item jsonb; permission_key text; old_assignments jsonb;
begin
 perform pg_advisory_xact_lock(802418110015::bigint);
 required_permission:=case operation when 'roles.create' then 'platform_roles.create' when 'roles.update' then 'platform_roles.update' when 'roles.delete' then 'platform_roles.delete' when 'members.update' then 'platform_users.update' when 'members.remove' then 'platform_users.remove' when 'invitations.create' then 'platform_users.invite' when 'invitations.revoke' then 'platform_users.invite' when 'invitations.resend' then 'platform_users.invite' end;
 if required_permission is null then raise exception 'IAM_INVALID_OPERATION';end if;
 perform public.platform_assert_permission(actor,required_permission);
 if operation like 'roles.%' then
  if operation<>'roles.create' then
   select * into role_record from public.platform_roles where id=(input->>'id')::uuid and key is null for update;
   if not found then raise exception 'IAM_ROLE_NOT_FOUND';end if;
   before_value:=to_jsonb(role_record)||jsonb_build_object('permissions',(select jsonb_agg(permission) from public.platform_role_permissions where role_id=role_record.id));
   for permission_key in select permission from public.platform_role_permissions where role_id=role_record.id loop
    if not public.platform_has_permission(actor,permission_key) then raise exception 'IAM_CANNOT_DELEGATE';end if;
   end loop;
  end if;
  if operation='roles.delete' then
   if exists(select 1 from public.platform_role_assignments where role_id=role_record.id) or exists(select 1 from public.platform_invitations i,jsonb_array_elements(i.assignments) assigned(value) where i.status='pending' and i.expires_at>now() and assigned.value->>'roleId'=role_record.id::text) then raise exception 'IAM_ROLE_IN_USE';end if;
   delete from public.platform_roles where id=role_record.id;
   target_id:=role_record.id;result:=jsonb_build_object('id',target_id);
  else
   if jsonb_typeof(input->'permissions') is distinct from 'array' or jsonb_array_length(input->'permissions') not between 1 and 100 then raise exception 'IAM_INVALID_PERMISSIONS';end if;
   for permission_key in select jsonb_array_elements_text(input->'permissions') loop
    if not public.platform_has_permission(actor,permission_key) then raise exception 'IAM_CANNOT_DELEGATE';end if;
   end loop;
   if operation='roles.create' then
    insert into public.platform_roles(name,description,created_by) values(trim(input->>'name'),coalesce(input->>'description',''),actor) returning id into target_id;
   else
    target_id:=role_record.id;
    update public.platform_roles set name=trim(input->>'name'),description=coalesce(input->>'description',''),updated_at=now() where id=target_id;
    delete from public.platform_role_permissions where role_id=target_id;
   end if;
   insert into public.platform_role_permissions(role_id,permission) select target_id,value from jsonb_array_elements_text(input->'permissions') on conflict do nothing;
   select to_jsonb(r)||jsonb_build_object('permissions',input->'permissions') into result from public.platform_roles r where id=target_id;
  end if;
 elsif operation like 'members.%' then
  if exists(select 1 from public.profiles where id=(input->>'id')::uuid and role='super_admin') then raise exception 'IAM_OWNER_PROTECTED';end if;
  select * into member_record from public.platform_members where id=(input->>'id')::uuid for update;
  if not found then raise exception 'IAM_MEMBER_NOT_FOUND';end if;
  if exists(select 1 from public.profiles where id=member_record.user_id and role='super_admin') then raise exception 'IAM_OWNER_PROTECTED';end if;
  select coalesce(jsonb_agg(jsonb_build_object('roleId',role_id,'eventId',null)),'[]'::jsonb) into old_assignments from public.platform_role_assignments where member_id=member_record.id;
  before_value:=to_jsonb(member_record)||jsonb_build_object('assignments',old_assignments);
  if jsonb_array_length(old_assignments)>0 then perform public.platform_assert_delegable(actor,old_assignments);end if;
  target_id:=member_record.id;
  with revoked as(update public.platform_invitations set status='revoked' where status='pending' and email=(select lower(email) from auth.users where id=member_record.user_id) returning id)
   insert into public.audit_logs(actor_id,action,resource_type,resource_id,metadata) select actor,'platform_iam.invitations.revoke','platform_invitations',id::text,jsonb_build_object('reason','membership_changed') from revoked;
  if operation='members.remove' then
   update public.platform_members set status='removed',updated_at=now() where id=target_id;
   delete from public.platform_role_assignments where member_id=target_id;
  else
   if input->>'status' is null or input->>'status' not in ('active','suspended') then raise exception 'IAM_INVALID_STATUS';end if;
   perform public.platform_assert_delegable(actor,input->'assignments');
   delete from public.platform_role_assignments where member_id=target_id;
   for item in select value from jsonb_array_elements(input->'assignments') loop
    insert into public.platform_role_assignments(member_id,role_id,granted_by) values(target_id,(item->>'roleId')::uuid,actor);
   end loop;
   update public.platform_members set status=input->>'status',updated_at=now() where id=target_id;
  end if;
  result:=jsonb_build_object('id',target_id,'status',case when operation='members.remove' then 'removed' else input->>'status' end,'assignments',case when operation='members.remove' then '[]'::jsonb else input->'assignments' end);
 elsif operation='invitations.create' then
  perform public.platform_assert_delegable(actor,input->'assignments');
  update public.platform_invitations set status='revoked' where email=lower(trim(input->>'email')) and status='pending' and expires_at<=now();
  insert into public.platform_invitations(email,token_hash,assignments,invited_by) values(lower(trim(input->>'email')),input->>'tokenHash',input->'assignments',actor) returning id into target_id;
  select to_jsonb(i)-'token_hash' into result from public.platform_invitations i where id=target_id;
 elsif operation in ('invitations.revoke','invitations.resend') then
  select to_jsonb(i)-'token_hash' into before_value from public.platform_invitations i where id=(input->>'id')::uuid and status='pending' for update;
  if not found then raise exception 'IAM_INVITATION_INVALID';end if;
  perform public.platform_assert_delegable(actor,before_value->'assignments');
  target_id:=(input->>'id')::uuid;
  if operation='invitations.resend' then
   update public.platform_invitations set token_hash=input->>'tokenHash',expires_at=now()+interval '7 days',invited_by=actor where id=target_id;
   select to_jsonb(i)-'token_hash' into result from public.platform_invitations i where id=target_id;
  else
   update public.platform_invitations set status='revoked' where id=target_id;
   result:=jsonb_build_object('id',target_id,'status','revoked');
  end if;
 end if;
 insert into public.audit_logs(actor_id,action,resource_type,resource_id,before_data,after_data) values(actor,'platform_iam.'||operation,'platform_'||split_part(operation,'.',1),target_id::text,before_value,result);
 return result;
end$$;
create function public.platform_accept_invitation(actor uuid,invitation_hash text) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare invite public.platform_invitations%rowtype; member_id uuid; member_status text; item jsonb;
begin
 perform pg_advisory_xact_lock(802418110015::bigint);
 select * into invite from public.platform_invitations where token_hash=invitation_hash for update;
 if not found or invite.status<>'pending' or invite.expires_at<=now() then raise exception 'IAM_INVITATION_INVALID';end if;
 if not exists(select 1 from auth.users u join public.profiles p on p.id=u.id where u.id=actor and lower(u.email)=invite.email and u.email_confirmed_at is not null and p.status='active') then raise exception 'IAM_INVITATION_IDENTITY';end if;
 if exists(select 1 from public.profiles where id=actor and role='super_admin') then raise exception 'IAM_OWNER_PROTECTED';end if;
 perform public.platform_assert_permission(invite.invited_by,'platform_users.invite');
 perform public.platform_assert_delegable(invite.invited_by,invite.assignments);
 select id,status into member_id,member_status from public.platform_members where user_id=actor for update;
 if member_status='suspended' then raise exception 'IAM_MEMBER_SUSPENDED';end if;
 if member_id is null then insert into public.platform_members(user_id) values(actor) returning id into member_id;
 elsif member_status='removed' then update public.platform_members set status='active',updated_at=now() where id=member_id;end if;
 for item in select value from jsonb_array_elements(invite.assignments) loop
  insert into public.platform_role_assignments(member_id,role_id,granted_by) values(member_id,(item->>'roleId')::uuid,invite.invited_by) on conflict do nothing;
 end loop;
 update public.platform_invitations set status='accepted',accepted_by=actor,accepted_at=now() where id=invite.id;
 insert into public.audit_logs(actor_id,action,resource_type,resource_id,after_data) values(actor,'platform_iam.invitations.accept','platform_members',member_id::text,jsonb_build_object('invitationId',invite.id,'assignments',invite.assignments));
 return jsonb_build_object('memberId',member_id);
end$$;
revoke all on function public.platform_has_permission(uuid,text),public.platform_access_context(uuid),public.platform_assert_permission(uuid,text),public.platform_guard_assignment(),public.platform_assert_delegable(uuid,jsonb),public.platform_manage(uuid,text,jsonb),public.platform_accept_invitation(uuid,text) from public,anon,authenticated;
grant execute on function public.platform_has_permission(uuid,text),public.platform_access_context(uuid),public.platform_manage(uuid,text,jsonb),public.platform_accept_invitation(uuid,text) to service_role;

create or replace function public.review_receiving_account(target_organizer uuid,target_request uuid,target_actor uuid,target_decision text,target_reason text) returns jsonb language plpgsql security invoker set search_path='' as $$
declare o public.organizers%rowtype; r public.organizer_receiving_requests%rowtype;
begin
 perform pg_advisory_xact_lock(hashtextextended(target_organizer::text,152400771));
 select * into o from public.organizers where id=target_organizer for update;
 if not found then raise exception 'ORGANIZER_NOT_FOUND'; end if;
 if o.user_id=target_actor or not public.platform_has_permission(target_actor,'platform_receiving.review') then raise exception 'RECEIVING_REVIEW_FORBIDDEN'; end if;
 if o.status='archived' then raise exception 'ORGANIZER_ARCHIVED'; end if;
 select * into r from public.organizer_receiving_requests where id=target_request and organizer_id=target_organizer for update;
 if not found or o.current_receiving_request_id is distinct from target_request or r.status<>'pending' then raise exception 'RECEIVING_REQUEST_CHANGED'; end if;
 if target_decision not in ('approved','rejected') or length(trim(target_reason))<5 then raise exception 'INVALID_REVIEW'; end if;
 update public.organizer_receiving_requests set status=target_decision,reviewed_by=target_actor,reviewed_at=now(),review_reason=trim(target_reason) where id=target_request;
 update public.organizers set payout_status=case when target_decision='approved' then 'enabled' else 'blocked' end,
  production_approved_at=case when target_decision='approved' then coalesce(production_approved_at,now()) else production_approved_at end,
  status=case when target_decision='approved' and status='pending' then 'active' else status end,
  payout_pix_key=case when target_decision='approved' and r.account->>'method'='pix' then r.account->>'pix_key' else null end,
  payout_pix_key_type=case when target_decision='approved' and r.account->>'method'='pix' then r.account->>'pix_key_type' else null end
 where id=target_organizer;
 if target_decision='approved' then update public.profiles set role='organizer' where id=o.user_id and role<>'super_admin'; end if;
 insert into public.audit_logs(actor_id,action,resource_type,resource_id,after_data,metadata) values(target_actor,'receiving.'||target_decision,'organizer',target_organizer::text,jsonb_build_object('request_id',target_request,'version',r.version,'status',target_decision),jsonb_build_object('reason',trim(target_reason)));
 return public.receiving_request_json(target_request);
end; $$;

create or replace function public.finish_manual_payout(target_payout uuid,target_actor uuid,target_receipt uuid,target_reference text,target_cancel_reason text default null)
 returns jsonb language plpgsql security invoker set search_path='' as $$
declare p public.organizer_payouts%rowtype;org uuid;
begin
 select organizer_id into org from public.organizer_payouts where id=target_payout;
 perform pg_advisory_xact_lock(hashtextextended(org::text,152400771));
 select * into p from public.organizer_payouts where id=target_payout for update;
 if not found or p.provider<>'manual' or p.status<>'pending' then raise exception 'MANUAL_PAYOUT_CHANGED'; end if;
 if not public.platform_has_permission(target_actor,'platform_payouts.execute') then raise exception 'RECEIVING_REVIEW_FORBIDDEN'; end if;
 if target_cancel_reason is not null then
  if length(trim(target_cancel_reason))<5 then raise exception 'INVALID_REASON'; end if;
  update public.organizer_payouts set status='cancelled',failure_reason=trim(target_cancel_reason),processed_at=now(),processed_by=target_actor where id=p.id returning * into p;
 else
  if length(trim(coalesce(target_reference,'')))<3 or not exists(select 1 from public.organizer_payout_receipts where id=target_receipt and payout_id=p.id and uploaded_by=target_actor) then raise exception 'RECEIPT_REQUIRED'; end if;
  update public.organizer_payouts set status='completed',receipt_document_id=target_receipt,bank_reference=trim(target_reference),processed_at=now(),processed_by=target_actor where id=p.id returning * into p;
 end if;
 insert into public.audit_logs(actor_id,action,resource_type,resource_id,after_data,metadata) values(target_actor,'payout.manual_'||p.status,'organizer_payout',p.id::text,jsonb_build_object('status',p.status,'receipt_document_id',p.receipt_document_id),jsonb_build_object('reason',coalesce(target_cancel_reason,'Transferência bancária confirmada com comprovante')));
 return to_jsonb(p);
end; $$;
