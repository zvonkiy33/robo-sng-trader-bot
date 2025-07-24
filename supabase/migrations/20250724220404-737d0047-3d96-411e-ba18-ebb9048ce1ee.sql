-- Fix function search path security warnings
ALTER FUNCTION public.update_updated_at_column() SET search_path = 'public';
ALTER FUNCTION public.update_task_completed_at() SET search_path = 'public';