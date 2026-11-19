-- A organização pode ser do próprio analista; a autorização depende da permissão ativa na plataforma.
create or replace function public.review_receiving_account(target_organizer uuid,target_request uuid,target_actor uuid,target_decision text,target_reason text) returns jsonb language plpgsql security invoker set search_path='' as $$
declare o public.organizers%rowtype; r public.organizer_receiving_requests%rowtype;
begin
 perform pg_advisory_xact_lock(hashtextextended(target_organizer::text,152400771));
 select * into o from public.organizers where id=target_organizer for update;
 if not found then raise exception 'ORGANIZER_NOT_FOUND'; end if;
 if not public.platform_has_permission(target_actor,'platform_receiving.review') then raise exception 'RECEIVING_REVIEW_FORBIDDEN'; end if;
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

revoke all on function public.review_receiving_account(uuid,uuid,uuid,text,text) from public,anon,authenticated;
grant execute on function public.review_receiving_account(uuid,uuid,uuid,text,text) to service_role;
