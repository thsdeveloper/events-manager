-- Isolated/reversible IAM integration scenarios. No existing account is modified.
begin;
select '1..8';
do $$
declare owner_id uuid:=gen_random_uuid(); member_user uuid:=gen_random_uuid(); outsider uuid:=gen_random_uuid(); org uuid:=gen_random_uuid(); other_org uuid:=gen_random_uuid(); event_a uuid:=gen_random_uuid(); event_b uuid:=gen_random_uuid(); member_id uuid; role_id uuid; result jsonb; invite_id uuid;
begin
 insert into auth.users(id,email,email_confirmed_at) values(owner_id,owner_id||'@iam.test',now()),(member_user,member_user||'@iam.test',now()),(outsider,outsider||'@iam.test',now());
 insert into public.organizers(id,user_id,name,email,status) values(org,owner_id,'IAM fixture',owner_id||'@iam.test','active'),(other_org,outsider,'Other fixture',outsider||'@iam.test','active');
 insert into public.events(id,organizer_id,title,slug,start_date,end_date) values(event_a,org,'A','iam-'||event_a,now(),now()+interval '1 day'),(event_b,org,'B','iam-'||event_b,now(),now()+interval '1 day');
 assert public.iam_has_permission(owner_id,org,'users.invite',null), 'existing ownership must retain management';
 assert not public.iam_has_permission(outsider,org,'users.invite',null), 'another organization is not accessible';
 select id into role_id from public.roles where key='checkin';
 result:=public.iam_manage(owner_id,org,'invitations.create',jsonb_build_object('email',member_user||'@iam.test','tokenHash',repeat('a',64),'assignments',jsonb_build_array(jsonb_build_object('roleId',role_id,'eventId',event_a))));
 invite_id:=(result->>'id')::uuid;
 begin
  perform public.iam_accept_invitation(outsider,repeat('a',64));
  raise exception 'wrong identity accepted invitation';
 exception when others then if sqlerrm<>'IAM_INVITATION_IDENTITY' then raise;end if;end;
 perform public.iam_accept_invitation(member_user,repeat('a',64));
 assert public.iam_has_permission(member_user,org,'checkin.execute',event_a), 'invitation grants assigned event';
 assert not public.iam_has_permission(member_user,org,'checkin.execute',event_b), 'event grants cannot cross events';
 assert not public.iam_has_permission(member_user,org,'finance.read',event_a), 'operator has no financial access';
 assert not public.iam_has_permission(member_user,org,'checkin.execute',null), 'event grant is not organization-wide';
 begin
  perform public.iam_accept_invitation(member_user,repeat('a',64));raise exception 'token was reused';
 exception when others then if sqlerrm<>'IAM_INVITATION_INVALID' then raise;end if;end;
 select id into member_id from public.organization_members where organization_id=org and user_id=member_user;
 perform public.iam_manage(owner_id,org,'members.update',jsonb_build_object('id',member_id,'status','suspended','assignments',jsonb_build_array(jsonb_build_object('roleId',role_id,'eventId',event_a))));
 assert not public.iam_has_permission(member_user,org,'checkin.execute',event_a), 'suspension takes effect without JWT refresh';
 assert exists(select 1 from public.audit_logs where organization_id=org and actor_id=owner_id and action='iam.members.update' and after_data->'assignments' @> jsonb_build_array(jsonb_build_object('roleId',role_id,'eventId',event_a))), 'new assignments are audited';
end $$;
select 'ok 1 - membership, invitations, event isolation, revocation and audit';

do $$
declare actor uuid:=gen_random_uuid(); limited_user uuid:=gen_random_uuid(); org uuid:=gen_random_uuid(); member_id uuid; custom_role uuid; result jsonb;
begin
 insert into auth.users(id,email,email_confirmed_at) values(actor,actor||'@iam.test',now()),(limited_user,limited_user||'@iam.test',now());
 insert into public.organizers(id,user_id,name,email,status) values(org,actor,'IAM grants',actor||'@iam.test','active');
 result:=public.iam_manage(actor,org,'roles.create','{"name":"Delegator","permissions":["users.invite","roles.create","events.read"]}');custom_role:=(result->>'id')::uuid;
 insert into public.organization_members(organization_id,user_id) values(org,limited_user) returning id into member_id;
 insert into public.role_assignments(organization_id,member_id,role_id) values(org,member_id,custom_role);
 begin perform public.iam_manage(limited_user,org,'roles.create','{"name":"Escalation","permissions":["refunds.create"]}');raise exception 'privilege escalation';exception when others then if sqlerrm<>'IAM_CANNOT_DELEGATE' then raise;end if;end;
 begin perform public.iam_manage(actor,org,'members.remove',jsonb_build_object('id',(select id from public.organization_members where organization_id=org and user_id=actor)));raise exception 'owner removed';exception when others then if sqlerrm<>'IAM_OWNER_PROTECTED' then raise;end if;end;
 update public.profiles set role='super_admin' where id=limited_user;
 assert not public.iam_has_permission(limited_user,org,'refunds.create',null), 'global superadmin does not bypass organization grants';
 update public.profiles set status='suspended' where id=limited_user;
 assert not public.iam_has_permission(limited_user,org,'events.read',null), 'disabled profile loses all team access';
end $$;
select 'ok 2 - delegation limits and owner/global-role boundaries';

do $$
declare t text;
begin
 foreach t in array array['organization_members','roles','permissions','role_permissions','role_assignments','user_invitations'] loop
  assert (select relrowsecurity from pg_class where oid=('public.'||t)::regclass), 'RLS must be enabled';
  assert not has_table_privilege('authenticated','public.'||t,'SELECT,INSERT,UPDATE,DELETE'), 'browser must not bypass API';
  assert not has_table_privilege('anon','public.'||t,'SELECT,INSERT,UPDATE,DELETE'), 'anonymous IAM access';
 end loop;
 assert not has_function_privilege('authenticated','public.iam_manage(uuid,uuid,text,jsonb)','EXECUTE'), 'IAM mutation RPC is server only';
 assert not has_function_privilege('anon','public.iam_accept_invitation(uuid,text)','EXECUTE'), 'anonymous invitation acceptance';
 assert not has_table_privilege('authenticated','public.audit_logs','UPDATE,DELETE'), 'ordinary users cannot alter audit logs';
end $$;
select 'ok 3 - RLS and API-only IAM boundaries';

do $$
declare actor uuid:=gen_random_uuid(); person uuid:=gen_random_uuid(); org_a uuid:=gen_random_uuid(); org_b uuid:=gen_random_uuid(); event_b uuid:=gen_random_uuid(); member_id uuid; role_id uuid;
begin
 insert into auth.users(id,email) values(actor,actor||'@iam.test'),(person,person||'@iam.test');
 insert into public.organizers(id,user_id,name,email,status) values(org_a,actor,'A',actor||'@iam.test','active'),(org_b,person,'B',person||'@iam.test','active');
 insert into public.events(id,organizer_id,title,slug,start_date,end_date) values(event_b,org_b,'B','iam-'||event_b,now(),now()+interval '1 day');
 select id into member_id from public.organization_members where organization_id=org_a and user_id=actor;
 select id into role_id from public.roles where key='checkin';
 begin insert into public.role_assignments(organization_id,member_id,role_id,event_id) values(org_a,member_id,role_id,event_b);raise exception 'cross tenant event assignment accepted';exception when foreign_key_violation then null;end;
end $$;
select 'ok 4 - database constraints reject cross-tenant event assignments';


do $$
declare actor uuid:=gen_random_uuid(); person uuid:=gen_random_uuid(); org uuid:=gen_random_uuid(); result jsonb; invitation uuid; custom_role uuid; checkin_role uuid;
begin
 insert into auth.users(id,email,email_confirmed_at) values(actor,actor||'@iam.test',now()),(person,person||'@iam.test',now());
 insert into public.organizers(id,user_id,name,email,status) values(org,actor,'IAM lifecycle',actor||'@iam.test','active');
 select id into checkin_role from public.roles where key='checkin';
 result:=public.iam_manage(actor,org,'invitations.create',jsonb_build_object('email',person||'@iam.test','tokenHash',repeat('b',64),'assignments',jsonb_build_array(jsonb_build_object('roleId',checkin_role,'eventId',null))));invitation:=(result->>'id')::uuid;
 update public.user_invitations set expires_at=now()-interval '1 second' where id=invitation;
 begin perform public.iam_accept_invitation(person,repeat('b',64));raise exception 'expired invitation accepted';exception when others then if sqlerrm<>'IAM_INVITATION_INVALID' then raise;end if;end;
 perform public.iam_manage(actor,org,'invitations.resend',jsonb_build_object('id',invitation,'tokenHash',repeat('c',64)));
 begin perform public.iam_accept_invitation(person,repeat('b',64));raise exception 'rotated invitation accepted';exception when others then if sqlerrm<>'IAM_INVITATION_INVALID' then raise;end if;end;
 perform public.iam_manage(actor,org,'invitations.revoke',jsonb_build_object('id',invitation));
 begin perform public.iam_accept_invitation(person,repeat('c',64));raise exception 'revoked invitation accepted';exception when others then if sqlerrm<>'IAM_INVITATION_INVALID' then raise;end if;end;
 result:=public.iam_manage(actor,org,'roles.create','{"name":"Custom access","permissions":["events.read","finance.read"]}');custom_role:=(result->>'id')::uuid;
 result:=public.iam_manage(actor,org,'invitations.create',jsonb_build_object('email',person||'@iam.test','tokenHash',repeat('d',64),'assignments',jsonb_build_array(jsonb_build_object('roleId',custom_role,'eventId',null))));
 perform public.iam_accept_invitation(person,repeat('d',64));
 assert public.iam_has_permission(person,org,'finance.read'), 'custom role grants finance explicitly';
 perform public.iam_manage(actor,org,'roles.update',jsonb_build_object('id',custom_role,'name','Custom access','permissions',jsonb_build_array('events.read')));
 assert not public.iam_has_permission(person,org,'finance.read'), 'editing role revokes immediately';
 begin perform public.iam_manage(actor,org,'roles.delete',jsonb_build_object('id',custom_role));raise exception 'assigned role deleted';exception when others then if sqlerrm<>'IAM_ROLE_IN_USE' then raise;end if;end;
 perform public.iam_manage(actor,org,'members.remove',jsonb_build_object('id',(select id from public.organization_members where organization_id=org and user_id=person)));
 assert not public.iam_has_permission(person,org,'events.read'), 'removed membership denies access';
 perform public.iam_manage(actor,org,'roles.delete',jsonb_build_object('id',custom_role));
 assert not exists(select 1 from public.roles where id=custom_role), 'unassigned role deleted';
 assert not exists(select 1 from public.audit_logs where organization_id=org and (before_data::text like '%token_hash%' or after_data::text like '%token_hash%')), 'tokens never appear in audit';
end $$;
select 'ok 5 - custom role lifecycle and invitation expiry, resend, revocation';
do $$
declare owner_id uuid:=gen_random_uuid(); delegate_id uuid:=gen_random_uuid(); recipient uuid:=gen_random_uuid(); org uuid:=gen_random_uuid(); delegation uuid; member_id uuid; result jsonb; checkin_role uuid;
begin
 insert into auth.users(id,email,email_confirmed_at) values(owner_id,owner_id||'@iam.test',now()),(delegate_id,delegate_id||'@iam.test',now()),(recipient,recipient||'@iam.test',now());
 insert into public.organizers(id,user_id,name,email,status) values(org,owner_id,'IAM delegate',owner_id||'@iam.test','active');
 result:=public.iam_manage(owner_id,org,'roles.create','{"name":"Delegator","permissions":["users.invite","events.read","participants.read","checkin.execute"]}');delegation:=(result->>'id')::uuid;
 insert into public.organization_members(organization_id,user_id) values(org,delegate_id) returning id into member_id;
 insert into public.role_assignments(organization_id,member_id,role_id) values(org,member_id,delegation);
 select id into checkin_role from public.roles where key='checkin';
 perform public.iam_manage(delegate_id,org,'invitations.create',jsonb_build_object('email',recipient||'@iam.test','tokenHash',repeat('e',64),'assignments',jsonb_build_array(jsonb_build_object('roleId',checkin_role,'eventId',null))));
 perform public.iam_manage(owner_id,org,'roles.update',jsonb_build_object('id',delegation,'name','Delegator','permissions',jsonb_build_array('users.invite','events.read')));
 begin perform public.iam_accept_invitation(recipient,repeat('e',64));raise exception 'stale inviter privileges used';exception when others then if sqlerrm<>'IAM_CANNOT_DELEGATE' then raise;end if;end;
 assert not exists(select 1 from public.organization_members where user_id=recipient and organization_id=org), 'failed acceptance grants nothing';
end $$;
select 'ok 6 - acceptance rechecks inviter delegation after role changes';
do $$
declare actor uuid:=gen_random_uuid(); org uuid:=gen_random_uuid(); event_a uuid:=gen_random_uuid(); event_b uuid:=gen_random_uuid(); report jsonb;
begin
 begin insert into public.roles(name) values('Invalid global role');raise exception 'unkeyed global role accepted';exception when check_violation then null;end;
 insert into auth.users(id,email) values(actor,actor||'@iam.test');
 insert into public.organizers(id,user_id,name,email,status) values(org,actor,'IAM dashboard',actor||'@iam.test','active');
 insert into public.events(id,organizer_id,title,slug,start_date,end_date) values(event_a,org,'A','iam-'||event_a,now(),now()+interval '1 day'),(event_b,org,'B','iam-'||event_b,now(),now()+interval '1 day');
 report:=public.get_iam_dashboard(org,array[event_a]);
 assert (report#>>'{metrics,totalEvents}')::integer=1, 'metrics filtered before aggregation';
 assert jsonb_array_length(report->'recentEvents')=1 and report#>>'{recentEvents,0,id}'=event_a::text, 'only permitted event appears';
 assert (public.get_iam_dashboard(org,array[]::uuid[])#>>'{metrics,totalEvents}')::integer=0, 'empty allowed event list exposes nothing';
end $$;
select 'ok 7 - role shape constraints and dashboard scope';


do $$
declare actor uuid:=gen_random_uuid(); person uuid:=gen_random_uuid(); org uuid:=gen_random_uuid(); member_id uuid; checkin_role uuid; assignments jsonb;
begin
 insert into auth.users(id,email,email_confirmed_at) values(actor,actor||'@iam.test',now()),(person,person||'@iam.test',now());
 insert into public.organizers(id,user_id,name,email,status) values(org,actor,'IAM removal',actor||'@iam.test','active');
 insert into public.organization_members(organization_id,user_id) values(org,person) returning id into member_id;
 select id into checkin_role from public.roles where key='checkin';
 insert into public.role_assignments(organization_id,member_id,role_id) values(org,member_id,checkin_role);
 assignments:=jsonb_build_array(jsonb_build_object('roleId',checkin_role,'eventId',null));
 perform public.iam_manage(actor,org,'invitations.create',jsonb_build_object('email',person||'@iam.test','tokenHash',repeat('f',64),'assignments',assignments));
 perform public.iam_manage(actor,org,'members.remove',jsonb_build_object('id',member_id));
 begin perform public.iam_accept_invitation(person,repeat('f',64));raise exception 'old pending invite restored a removed membership';exception when others then if sqlerrm<>'IAM_INVITATION_INVALID' then raise;end if;end;
 perform public.iam_manage(actor,org,'invitations.create',jsonb_build_object('email',person||'@iam.test','tokenHash',repeat('1',64),'assignments',assignments));
 perform public.iam_accept_invitation(person,repeat('1',64));
 assert public.iam_has_permission(person,org,'checkin.execute'), 'new explicit invitation may restore membership';
end $$;
select 'ok 8 - removing membership invalidates older pending invitations';
rollback;
