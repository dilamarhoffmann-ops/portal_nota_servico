
-- Migration to apply login_apoio model to profiles table
-- Adds control flags for manual authorization and mandatory password change

-- 1. Add new columns
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS allowed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS requires_password_change BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS area TEXT;

-- 2. Update existing roles to the new naming convention
-- We use a CASE to avoid errors if roles are already updated
UPDATE public.profiles 
SET role = CASE 
    WHEN role = 'admin' THEN 'Gestor'
    WHEN role = 'user' THEN 'Usuario'
    ELSE role 
END;

-- 3. Ensure new users are not allowed by default and have 'Usuario' role
-- This assumes a function handle_new_user already exists
-- If it doesn't, we'd need to create it, but for now we just ensure the defaults
ALTER TABLE public.profiles ALTER COLUMN allowed SET DEFAULT FALSE;
ALTER TABLE public.profiles ALTER COLUMN role SET DEFAULT 'Usuario';

-- 4. Whitelist logic (optional, but good for the model)
-- If the whitelist table doesn't exist, create it
CREATE TABLE IF NOT EXISTS public.whitelist_emails (
    email TEXT PRIMARY KEY,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
