-- JAWIIL SCHOOL: Role-based security for Supabase
-- Run this in Supabase SQL Editor AFTER the profiles table exists
-- and AFTER you have at least one Admin profile.

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

-- Remove existing policies so the new role rules are not weakened by old open policies.
do $$
declare
  p record;
begin
  for p in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname='public'
      and tablename in ('profiles','students','exams','results','finance')
  loop
    execute format('drop policy if exists %I on %I.%I', p.policyname, p.schemaname, p.tablename);
  end loop;
end $$;

alter table public.profiles enable row level security;
alter table public.students enable row level security;
alter table public.exams enable row level security;
alter table public.results enable row level security;
alter table public.finance enable row level security;

-- PROFILES
create policy profiles_select_own_or_admin on public.profiles
for select to authenticated
using (user_id=auth.uid() or public.my_role()='admin');

create policy profiles_insert_admin on public.profiles
for insert to authenticated
with check (public.my_role()='admin');

create policy profiles_update_admin on public.profiles
for update to authenticated
using (public.my_role()='admin')
with check (public.my_role()='admin');

create policy profiles_delete_admin on public.profiles
for delete to authenticated
using (public.my_role()='admin');

-- STUDENTS
create policy students_select_staff_or_own on public.students
for select to authenticated
using (
  public.my_role() in ('admin','exam_officer','treasurer')
  or (public.my_role()='student' and student_id=public.my_student_id())
);

create policy students_insert_admin on public.students
for insert to authenticated
with check (public.my_role()='admin');

create policy students_update_admin on public.students
for update to authenticated
using (public.my_role()='admin')
with check (public.my_role()='admin');

create policy students_delete_admin on public.students
for delete to authenticated
using (public.my_role()='admin');

-- EXAMS
create policy exams_select_allowed on public.exams
for select to authenticated
using (
  public.my_role() in ('admin','exam_officer')
  or (public.my_role()='student' and student_id=public.my_student_id())
);

create policy exams_insert_exam_staff on public.exams
for insert to authenticated
with check (public.my_role() in ('admin','exam_officer'));

create policy exams_update_exam_staff on public.exams
for update to authenticated
using (public.my_role() in ('admin','exam_officer'))
with check (public.my_role() in ('admin','exam_officer'));

create policy exams_delete_exam_staff on public.exams
for delete to authenticated
using (public.my_role() in ('admin','exam_officer'));

-- RESULTS
create policy results_select_allowed on public.results
for select to authenticated
using (
  public.my_role() in ('admin','exam_officer')
  or (public.my_role()='student' and student_id=public.my_student_id())
);

create policy results_insert_exam_staff on public.results
for insert to authenticated
with check (public.my_role() in ('admin','exam_officer'));

create policy results_update_exam_staff on public.results
for update to authenticated
using (public.my_role() in ('admin','exam_officer'))
with check (public.my_role() in ('admin','exam_officer'));

create policy results_delete_exam_staff on public.results
for delete to authenticated
using (public.my_role() in ('admin','exam_officer'));

-- FINANCE
create policy finance_select_allowed on public.finance
for select to authenticated
using (public.my_role() in ('admin','treasurer'));

create policy finance_insert_allowed on public.finance
for insert to authenticated
with check (public.my_role() in ('admin','treasurer'));

create policy finance_update_allowed on public.finance
for update to authenticated
using (public.my_role() in ('admin','treasurer'))
with check (public.my_role() in ('admin','treasurer'));

create policy finance_delete_allowed on public.finance
for delete to authenticated
using (public.my_role() in ('admin','treasurer'));

-- IMPORTANT:
-- In Supabase Dashboard, Authentication > Providers > Email:
-- turn OFF "Allow new users to sign up" if you want only admins to control accounts.
