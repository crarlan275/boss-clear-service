-- ============================================================
-- Boss Clear Service — Supabase Schema
-- Ejecuta esto en el SQL Editor de tu proyecto Supabase
-- ============================================================

-- 1. Tabla de perfiles (extiende auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id            uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email         text NOT NULL,
  display_name  text NOT NULL DEFAULT '',
  role          text NOT NULL DEFAULT 'client' CHECK (role IN ('client', 'admin')),
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- 2. Catálogo de bosses
CREATE TABLE IF NOT EXISTS public.bosses (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  difficulty  text NOT NULL CHECK (difficulty IN ('Normal', 'Hard', 'Chaos')),
  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- 3. Posts semanales
CREATE TABLE IF NOT EXISTS public.weekly_posts (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  week_start  date NOT NULL UNIQUE,
  notes       text,
  created_by  uuid NOT NULL REFERENCES public.profiles(id),
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- 4. Bosses por semana
CREATE TABLE IF NOT EXISTS public.weekly_post_bosses (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  weekly_post_id  uuid NOT NULL REFERENCES public.weekly_posts(id) ON DELETE CASCADE,
  boss_id         uuid NOT NULL REFERENCES public.bosses(id),
  UNIQUE(weekly_post_id, boss_id)
);

-- 5. Registros de clears por cliente
CREATE TABLE IF NOT EXISTS public.client_records (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id       uuid NOT NULL REFERENCES public.profiles(id),
  boss_id         uuid NOT NULL REFERENCES public.bosses(id),
  weekly_post_id  uuid REFERENCES public.weekly_posts(id),
  cleared_at      date NOT NULL,
  notes           text,
  added_by        uuid NOT NULL REFERENCES public.profiles(id),
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- Trigger: crear perfil automáticamente al registrarse
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name, role)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    'client'
  );
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- Row Level Security (RLS)
-- ============================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bosses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weekly_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weekly_post_bosses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_records ENABLE ROW LEVEL SECURITY;

-- Helper: check if current user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
  );
$$;

-- PROFILES
CREATE POLICY "Users can read own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id OR public.is_admin());

CREATE POLICY "Admins can update profiles"
  ON public.profiles FOR UPDATE
  USING (public.is_admin());

-- BOSSES (todos los autenticados pueden leer, solo admins modifican)
CREATE POLICY "Authenticated can read bosses"
  ON public.bosses FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Admins manage bosses"
  ON public.bosses FOR ALL
  USING (public.is_admin());

-- WEEKLY POSTS
CREATE POLICY "Authenticated can read weekly posts"
  ON public.weekly_posts FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Admins manage weekly posts"
  ON public.weekly_posts FOR ALL
  USING (public.is_admin());

-- WEEKLY POST BOSSES
CREATE POLICY "Authenticated can read weekly post bosses"
  ON public.weekly_post_bosses FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Admins manage weekly post bosses"
  ON public.weekly_post_bosses FOR ALL
  USING (public.is_admin());

-- CLIENT RECORDS
CREATE POLICY "Clients read own records"
  ON public.client_records FOR SELECT
  USING (client_id = auth.uid() OR public.is_admin());

CREATE POLICY "Admins manage client records"
  ON public.client_records FOR ALL
  USING (public.is_admin());

-- ============================================================
-- Datos iniciales: bosses de MapleStory
-- ============================================================
INSERT INTO public.bosses (name, difficulty) VALUES
  ('Zakum', 'Normal'),
  ('Zakum', 'Chaos'),
  ('Hilla', 'Normal'),
  ('Hilla', 'Hard'),
  ('Magnus', 'Normal'),
  ('Magnus', 'Hard'),
  ('Crimson Queen', 'Normal'),
  ('Crimson Queen', 'Chaos'),
  ('Pierre', 'Normal'),
  ('Pierre', 'Chaos'),
  ('Vellum', 'Normal'),
  ('Vellum', 'Chaos'),
  ('Von Bon', 'Normal'),
  ('Von Bon', 'Chaos'),
  ('Papulatus', 'Normal'),
  ('Papulatus', 'Chaos'),
  ('Arkarium', 'Normal'),
  ('Arkarium', 'Chaos'),
  ('Horntail', 'Normal'),
  ('Horntail', 'Chaos'),
  ('Pink Bean', 'Normal'),
  ('Pink Bean', 'Chaos'),
  ('Cygnus', 'Normal'),
  ('Cygnus', 'Chaos'),
  ('Von Leon', 'Normal'),
  ('Von Leon', 'Hard'),
  ('Lotus', 'Normal'),
  ('Lotus', 'Hard'),
  ('Damien', 'Normal'),
  ('Damien', 'Hard'),
  ('Lucid', 'Normal'),
  ('Lucid', 'Hard'),
  ('Will', 'Normal'),
  ('Will', 'Hard'),
  ('Gloom', 'Normal'),
  ('Gloom', 'Chaos'),
  ('Darknell', 'Normal'),
  ('Darknell', 'Hard'),
  ('Verus Hilla', 'Hard'),
  ('Black Mage', 'Hard'),
  ('Seren', 'Normal'),
  ('Seren', 'Hard'),
  ('Kaling', 'Normal'),
  ('Kaling', 'Hard'),
  ('Limbo', 'Hard')
ON CONFLICT DO NOTHING;
