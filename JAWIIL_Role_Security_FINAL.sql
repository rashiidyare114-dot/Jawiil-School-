-- JAWIIL SCHOOL - FINAL ROLE SECURITY
-- Run this AFTER the profiles table exists and the Admin profile exists.

create or replace function public.my_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where user_id = auth.uid()
$$;

create or replace function public.my_student_id()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select student_id from public.profiles where user_id = auth.uid()
$$;

alter table public.profiles enable row level security;
alter table public.students enable row level security;
alter table public.exams enable row level security;
alter table public.results enable row level security;
alter table public.finance enable row level security;

do $$
declare p record;
begin
  for p in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname='public'
      and tablename in ('profiles','students','exams','results','finance')
  loop
    execute format('drop policy if exists %I on %I.%I',p.policyname,p.schemaname,p.tablename);
  end loop;
end $$;

-- PROFILES
create policy profiles_select
on public.profiles for select to authenticated
using (user_id=auth.uid() or public.my_role()='admin');

create policy profiles_admin_insert
on public.profiles for insert to authenticated
with check (public.my_role()='admin');

create policy profiles_admin_update
on public.profiles for update to authenticated
using (public.my_role()='admin')
with check (public.my_role()='admin');

create policy profiles_admin_delete
on public.profiles for delete to authenticated
using (public.my_role()='admin');

-- STUDENTS
create policy students_admin_all
on public.students for all to authenticated
using (public.my_role()='admin')
with check (public.my_role()='admin');

create policy students_exam_officer_read
on public.students for select to authenticated
using (public.my_role()='exam_officer');

create policy students_treasurer_read
on public.students for select to authenticated
using (public.my_role()='treasurer');

create policy students_student_own
on public.students for select to authenticated
using (public.my_role()='student' and student_id=public.my_student_id());

-- EXAMS
create policy exams_admin_all
on public.exams for all to authenticated
using (public.my_role()='admin')
with check (public.my_role()='admin');

create policy exams_exam_officer_all
on public.exams for all to authenticated
using (public.my_role()='exam_officer')
with check (public.my_role()='exam_officer');

create policy exams_student_own
on public.exams for select to authenticated
using (public.my_role()='student' and student_id=public.my_student_id());

-- RESULTS
create policy results_admin_all
on public.results for all to authenticated
using (public.my_role()='admin')
with check (public.my_role()='admin');

create policy results_exam_officer_all
on public.results for all to authenticated
using (public.my_role()='exam_officer')
with check (public.my_role()='exam_officer');

create policy results_student_own
on public.results for select to authenticated
using (public.my_role()='student' and student_id=public.my_student_id());

-- FINANCE
create policy finance_admin_all
on public.finance for all to authenticated
using (public.my_role()='admin')
with check (public.my_role()='admin');

create policy finance_treasurer_all
on public.finance for all to authenticated
using (public.my_role()='treasurer')
with check (public.my_role()='treasurer');

-- IMPORTANT:
-- There are intentionally NO student policies for finance.
-- There are intentionally NO treasurer policies for exams/results.
-- There are intentionally NO exam-officer policies for finance.


-- ============================================================
-- STUDENT ID-ONLY RESULTS LOGIN
-- Students can intentionally view results using only their Student ID.
-- This function exposes ONLY student profile + exam + result data.
-- It does NOT expose finance or other students' records.
-- ============================================================
create or replace function public.get_student_results(p_student_id text)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'student',
      (select to_jsonb(s)
       from public.students s
       where trim(s.student_id) = trim(p_student_id)
       limit 1),
    'exams',
      coalesce(
        (select jsonb_agg(to_jsonb(e) order by e.created_at desc)
         from public.exams e
         where trim(e.student_id) = trim(p_student_id)),
        '[]'::jsonb
      ),
    'results',
      coalesce(
        (select jsonb_agg(to_jsonb(r) order by r.created_at desc)
         from public.results r
         where trim(r.student_id) = trim(p_student_id)),
        '[]'::jsonb
      )
  );
$$;

grant execute on function public.get_student_results(text) to anon, authenticated;
