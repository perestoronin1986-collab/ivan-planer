-- Права и политики public: сверка облака и своей базы после восстановления (db-restore.sh).
set search_path to public;
select 'fn '||p.proname||'('||pg_get_function_identity_arguments(p.oid)||')' as obj, coalesce(array_to_string(array(select unnest(p.proacl)::text order by 1),' '),'<default>') as acl
from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public'
union all
select 'rel '||c.relname, coalesce(array_to_string(array(select unnest(c.relacl)::text order by 1),' '),'<default>')
from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind in ('r','v','S','m')
order by 1;
select c.relname, c.relrowsecurity, c.relforcerowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r' order by 1;
select tablename, policyname, cmd, roles::text, md5(coalesce(qual,'')||coalesce(with_check,'')) from pg_policies where schemaname in ('public','storage') order by 1,2;
select defaclrole::regrole, defaclnamespace::regnamespace, defaclobjtype, array_to_string(array(select unnest(defaclacl)::text order by 1),' ') from pg_default_acl order by 1,2,3;
