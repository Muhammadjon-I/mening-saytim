-- Supabase > SQL Editor ga to'liq qo'yib Run bosing
create table posts (
  id bigint generated always as identity primary key,
  text text,
  image_url text,
  created_at timestamptz default now()
);

alter table posts enable row level security;
create policy "hamma o'qiy oladi" on posts for select using (true);

-- Rasmlar uchun ochiq papka (bucket)
insert into storage.buckets (id, name, public) values ('images', 'images', true);
