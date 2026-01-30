-- Add default UUID generation for users.id
-- This ensures that OAuth logins can insert user records without explicitly providing an ID.
ALTER TABLE public.users ALTER COLUMN id SET DEFAULT gen_random_uuid()::text;
