-- MoodMeals Database Schema
-- Run this in your Supabase SQL Editor to set up all tables.

-- User profiles (extends Supabase auth.users)
CREATE TABLE user_profiles (
    id UUID REFERENCES auth.users(id) PRIMARY KEY,
    name TEXT,
    allergies TEXT[] DEFAULT '{}',
    preference TEXT DEFAULT 'veg',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Journal entries scoped to user
CREATE TABLE journal_entries (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    emotion TEXT NOT NULL,
    intensity TEXT NOT NULL,
    message TEXT,
    user_input_text TEXT,
    meal_name TEXT,
    meal_id TEXT,
    reflection_emotion TEXT,
    reflection_note TEXT,
    reflected_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Calendar events scoped to user
CREATE TABLE calendar_events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    title TEXT NOT NULL,
    date DATE NOT NULL,
    time TEXT,
    type TEXT NOT NULL,
    stress_level TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Pantry items scoped to user
CREATE TABLE pantry_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    quantity NUMERIC,
    unit TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Meal calendar scoped to user
CREATE TABLE meal_calendar (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    meal_id TEXT NOT NULL,
    meal_name TEXT NOT NULL,
    meal_type TEXT NOT NULL,
    date DATE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable Row Level Security on all tables
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE pantry_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_calendar ENABLE ROW LEVEL SECURITY;

-- RLS Policies: each user can only access their own data
CREATE POLICY "Users can manage own profile" ON user_profiles FOR ALL USING (auth.uid() = id);
CREATE POLICY "Users can manage own journal" ON journal_entries FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own events" ON calendar_events FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own pantry" ON pantry_items FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own calendar" ON meal_calendar FOR ALL USING (auth.uid() = user_id);
