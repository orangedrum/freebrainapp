-- Migration 48: Add age_verified column to profiles table
-- This column tracks whether a user has completed the age gate during onboarding.
-- It's set to true when the user completes the StepAgeGate component.

-- Add age_verified column with default false
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS age_verified BOOLEAN DEFAULT false;

-- Update existing profiles to set age_verified = true for users who have completed onboarding
-- (They would have gone through the age gate if it was required)
UPDATE profiles SET age_verified = true WHERE onboarding_completed = true;

-- Add comment for clarity
COMMENT ON COLUMN profiles.age_verified IS 'Whether user completed age gate during onboarding. Set to true when StepAgeGate is completed.';
