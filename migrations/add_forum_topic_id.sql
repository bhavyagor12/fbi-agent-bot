-- Add forum_topic_id column to projects table for forum topic support
ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS forum_topic_id bigint NULL;

-- Create index on forum_topic_id for faster lookups
CREATE INDEX IF NOT EXISTS projects_forum_topic_id_idx 
ON public.projects USING btree (forum_topic_id) TABLESPACE pg_default;

