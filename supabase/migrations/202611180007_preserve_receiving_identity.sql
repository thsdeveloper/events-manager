create function public.preserve_receiving_identity() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if old.current_receiving_request_id is not null and old.document is distinct from new.document then raise exception 'VERIFIED_DOCUMENT_IMMUTABLE'; end if;
 return new;
end; $$;
create trigger preserve_receiving_identity before update of document on public.organizers for each row execute function public.preserve_receiving_identity();
-- A submitted version is evidence; a correction always creates a new version.
create function public.preserve_receiving_submission() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if (to_jsonb(old)-array['status','reviewed_by','reviewed_at','review_reason']) is distinct from (to_jsonb(new)-array['status','reviewed_by','reviewed_at','review_reason']) then raise exception 'RECEIVING_SUBMISSION_IMMUTABLE'; end if;
 return new;
end; $$;
create trigger preserve_receiving_submission before update on public.organizer_receiving_requests for each row execute function public.preserve_receiving_submission();
revoke all on function public.preserve_receiving_identity(),public.preserve_receiving_submission() from public,anon,authenticated;
grant execute on function public.preserve_receiving_identity(),public.preserve_receiving_submission() to service_role;
