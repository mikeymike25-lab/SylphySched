-- ==========================================
-- SylphySched Database Schema Initialization
-- ==========================================

-- ------------------------------------------
-- 1. Custom Types / Enums
-- ------------------------------------------

-- Enum for the days of the week
CREATE TYPE day_of_week_enum AS ENUM (
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday'
);

-- Enum for schedule block types
CREATE TYPE block_type_enum AS ENUM (
  'class',
  'study',
  'break',
  'personal',
  'extracurricular'
);

-- ------------------------------------------
-- 2. Tables Definition
-- ------------------------------------------

-- Schedule Table: Holds schedule blocks
CREATE TABLE schedule (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
  subject_name TEXT NOT NULL,
  day_of_week day_of_week_enum NOT NULL,
  start_time TIME WITHOUT TIME ZONE NOT NULL,
  end_time TIME WITHOUT TIME ZONE NOT NULL,
  block_type block_type_enum NOT NULL,
  is_immutable BOOLEAN NOT NULL DEFAULT false,
  
  -- Time Constraint: Ensure start_time is before end_time
  CONSTRAINT check_schedule_times CHECK (start_time < end_time)
);

-- Notes Table: Holds daily notes linked to a specific schedule block
CREATE TABLE notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
  schedule_id UUID NOT NULL REFERENCES schedule(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  content TEXT NOT NULL,
  is_encrypted BOOLEAN NOT NULL DEFAULT false
);

-- ------------------------------------------
-- 3. Indexes for Performance
-- ------------------------------------------

-- Indexes on user_id to speed up user-specific queries (standard Supabase pattern)
CREATE INDEX idx_schedule_user_id ON schedule(user_id);
CREATE INDEX idx_notes_user_id ON notes(user_id);

-- Index on schedule_id to speed up joins between schedule and notes
CREATE INDEX idx_notes_schedule_id ON notes(schedule_id);

-- Index on day_of_week and start_time for quick schedule sorting
CREATE INDEX idx_schedule_day_time ON schedule(day_of_week, start_time);

-- ------------------------------------------
-- 4. Row Level Security (RLS) Configuration
-- ------------------------------------------

-- Enable RLS on both tables
ALTER TABLE schedule ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for the 'schedule' table
CREATE POLICY "Users can select their own schedules"
  ON schedule FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own schedules"
  ON schedule FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own schedules"
  ON schedule FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own schedules"
  ON schedule FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for the 'notes' table
CREATE POLICY "Users can select their own notes"
  ON notes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own notes"
  ON notes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own notes"
  ON notes FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notes"
  ON notes FOR DELETE
  USING (auth.uid() = user_id);
