-- RoadSafe AI initial schema
-- Public reference data is readable by anon + authenticated users.
-- Operational writes go through trusted backend/admin paths.

CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  full_name text CHECK (full_name IS NULL OR char_length(full_name) <= 120),
  role text NOT NULL DEFAULT 'analyst' CHECK (role IN ('admin', 'analyst', 'viewer')),
  organisation text CHECK (organisation IS NULL OR char_length(organisation) <= 160),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.current_user_role() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_user_role() TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.profile ->> 'full_name', NEW.profile ->> 'name', ''),
    CASE WHEN NEW.is_project_admin THEN 'admin' ELSE 'analyst' END
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

INSERT INTO public.profiles (id, email, full_name, role)
SELECT
  id,
  email,
  COALESCE(profile ->> 'full_name', profile ->> 'name', ''),
  CASE WHEN is_project_admin THEN 'admin' ELSE 'analyst' END
FROM auth.users
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.accident_records (
  accident_id text PRIMARY KEY,
  accident_date date NOT NULL,
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  time_of_day text NOT NULL,
  day_of_week text NOT NULL,
  weather text NOT NULL,
  road_condition text NOT NULL,
  road_type text NOT NULL,
  vehicle_type text NOT NULL,
  speed_limit integer NOT NULL,
  lighting_condition text NOT NULL,
  severity text NOT NULL CHECK (severity IN ('Minor', 'Serious', 'Fatal')),
  source_dataset text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS accident_records_severity_idx ON public.accident_records (severity);
CREATE INDEX IF NOT EXISTS accident_records_date_idx ON public.accident_records (accident_date);
CREATE INDEX IF NOT EXISTS accident_records_road_type_idx ON public.accident_records (road_type);
CREATE INDEX IF NOT EXISTS accident_records_weather_idx ON public.accident_records (weather);
CREATE INDEX IF NOT EXISTS accident_records_location_idx ON public.accident_records (latitude, longitude);

CREATE TABLE IF NOT EXISTS public.hotspots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cluster_id integer NOT NULL,
  algorithm text NOT NULL CHECK (algorithm IN ('kmeans', 'dbscan')),
  label text NOT NULL,
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  accident_count integer NOT NULL DEFAULT 0,
  fatal_count integer NOT NULL DEFAULT 0,
  serious_count integer NOT NULL DEFAULT 0,
  minor_count integer NOT NULL DEFAULT 0,
  severity_rate numeric(6,4),
  radius_km numeric(8,2),
  top_road_type text,
  top_weather text,
  risk_score numeric(8,2),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (algorithm, cluster_id)
);

CREATE INDEX IF NOT EXISTS hotspots_algorithm_idx ON public.hotspots (algorithm);
CREATE INDEX IF NOT EXISTS hotspots_risk_idx ON public.hotspots (risk_score DESC);

CREATE TABLE IF NOT EXISTS public.recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  category text NOT NULL CHECK (category IN ('engineering', 'enforcement', 'education', 'emergency', 'data')),
  priority text NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  summary text NOT NULL,
  detail text NOT NULL,
  evidence text,
  impact_estimate text,
  road_type text,
  weather text,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS recommendations_active_idx ON public.recommendations (is_active, sort_order);

CREATE TABLE IF NOT EXISTS public.predictions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id text,
  input jsonb NOT NULL,
  predicted_severity text NOT NULL CHECK (predicted_severity IN ('Minor', 'Serious', 'Fatal')),
  probabilities jsonb NOT NULL,
  model_version text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS predictions_user_idx ON public.predictions (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.dataset_uploads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  uploaded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  file_name text NOT NULL,
  storage_key text,
  storage_url text,
  row_count integer,
  valid_rows integer,
  invalid_rows integer,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'validating', 'validated', 'imported', 'failed')),
  error_message text,
  summary jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS dataset_uploads_created_idx ON public.dataset_uploads (created_at DESC);

CREATE TABLE IF NOT EXISTS public.model_metadata (
  model_key text PRIMARY KEY,
  model_name text NOT NULL,
  model_version text NOT NULL,
  trained_at timestamptz,
  dataset_rows integer,
  metrics jsonb NOT NULL DEFAULT '{}'::jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS profiles_set_updated_at ON public.profiles;
CREATE TRIGGER profiles_set_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS accident_records_set_updated_at ON public.accident_records;
CREATE TRIGGER accident_records_set_updated_at BEFORE UPDATE ON public.accident_records
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS hotspots_set_updated_at ON public.hotspots;
CREATE TRIGGER hotspots_set_updated_at BEFORE UPDATE ON public.hotspots
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS recommendations_set_updated_at ON public.recommendations;
CREATE TRIGGER recommendations_set_updated_at BEFORE UPDATE ON public.recommendations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS dataset_uploads_set_updated_at ON public.dataset_uploads;
CREATE TRIGGER dataset_uploads_set_updated_at BEFORE UPDATE ON public.dataset_uploads
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS model_metadata_set_updated_at ON public.model_metadata;
CREATE TRIGGER model_metadata_set_updated_at BEFORE UPDATE ON public.model_metadata
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accident_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hotspots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dataset_uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.model_metadata ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS profiles_select_own ON public.profiles;
CREATE POLICY profiles_select_own ON public.profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid());

DROP POLICY IF EXISTS profiles_insert_own ON public.profiles;
CREATE POLICY profiles_insert_own ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS profiles_update_own ON public.profiles;
CREATE POLICY profiles_update_own ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid() AND role = public.current_user_role());

DROP POLICY IF EXISTS accident_records_public_read ON public.accident_records;
CREATE POLICY accident_records_public_read ON public.accident_records
  FOR SELECT TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS hotspots_public_read ON public.hotspots;
CREATE POLICY hotspots_public_read ON public.hotspots
  FOR SELECT TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS recommendations_public_read ON public.recommendations;
CREATE POLICY recommendations_public_read ON public.recommendations
  FOR SELECT TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS model_metadata_public_read ON public.model_metadata;
CREATE POLICY model_metadata_public_read ON public.model_metadata
  FOR SELECT TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS predictions_insert_anon ON public.predictions;
CREATE POLICY predictions_insert_anon ON public.predictions
  FOR INSERT TO anon
  WITH CHECK (user_id IS NULL);

DROP POLICY IF EXISTS predictions_insert_own ON public.predictions;
CREATE POLICY predictions_insert_own ON public.predictions
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS predictions_select_own ON public.predictions;
CREATE POLICY predictions_select_own ON public.predictions
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS dataset_uploads_admin_select ON public.dataset_uploads;
CREATE POLICY dataset_uploads_admin_select ON public.dataset_uploads
  FOR SELECT TO authenticated
  USING (public.current_user_role() = 'admin');

DROP POLICY IF EXISTS dataset_uploads_admin_insert ON public.dataset_uploads;
CREATE POLICY dataset_uploads_admin_insert ON public.dataset_uploads
  FOR INSERT TO authenticated
  WITH CHECK (public.current_user_role() = 'admin' AND uploaded_by = auth.uid());

DROP POLICY IF EXISTS dataset_uploads_admin_update ON public.dataset_uploads;
CREATE POLICY dataset_uploads_admin_update ON public.dataset_uploads
  FOR UPDATE TO authenticated
  USING (public.current_user_role() = 'admin')
  WITH CHECK (public.current_user_role() = 'admin');

DROP POLICY IF EXISTS dataset_uploads_admin_delete ON public.dataset_uploads;
CREATE POLICY dataset_uploads_admin_delete ON public.dataset_uploads
  FOR DELETE TO authenticated
  USING (public.current_user_role() = 'admin');

GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON public.accident_records, public.hotspots, public.recommendations, public.model_metadata TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT, INSERT ON public.predictions TO authenticated;
GRANT INSERT ON public.predictions TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.dataset_uploads TO authenticated;

ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS storage_objects_owner_select ON storage.objects;
DROP POLICY IF EXISTS storage_objects_owner_insert ON storage.objects;
DROP POLICY IF EXISTS storage_objects_owner_update ON storage.objects;
DROP POLICY IF EXISTS storage_objects_owner_delete ON storage.objects;

DROP POLICY IF EXISTS storage_objects_roadsafe_select ON storage.objects;
CREATE POLICY storage_objects_roadsafe_select ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket IN ('datasets', 'reports') AND public.current_user_role() = 'admin');

DROP POLICY IF EXISTS storage_objects_roadsafe_insert ON storage.objects;
CREATE POLICY storage_objects_roadsafe_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket IN ('datasets', 'reports')
    AND public.current_user_role() = 'admin'
    AND uploaded_by = (SELECT auth.jwt() ->> 'sub')
  );

DROP POLICY IF EXISTS storage_objects_roadsafe_update ON storage.objects;
CREATE POLICY storage_objects_roadsafe_update ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket IN ('datasets', 'reports') AND public.current_user_role() = 'admin')
  WITH CHECK (bucket IN ('datasets', 'reports') AND public.current_user_role() = 'admin');

DROP POLICY IF EXISTS storage_objects_roadsafe_delete ON storage.objects;
CREATE POLICY storage_objects_roadsafe_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket IN ('datasets', 'reports') AND public.current_user_role() = 'admin');

GRANT USAGE ON SCHEMA storage TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON storage.objects TO authenticated;
