-- Add ENS usernames support
-- Migration: 001_add_ens_usernames

-- Create usernames table
CREATE TABLE IF NOT EXISTS usernames (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_address VARCHAR(42) NOT NULL UNIQUE,
  username VARCHAR(63) NOT NULL UNIQUE,
  ens_name VARCHAR(255) NOT NULL UNIQUE,
  claimed_at TIMESTAMP NOT NULL DEFAULT NOW(),
  first_image_id UUID REFERENCES images(id),
  CONSTRAINT username_format CHECK (username ~ '^[a-z0-9]([a-z0-9-]*[a-z0-9])?$'),
  CONSTRAINT username_length CHECK (char_length(username) >= 3 AND char_length(username) <= 63)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS username_user_address_idx ON usernames(user_address);
CREATE INDEX IF NOT EXISTS username_idx ON usernames(username);
CREATE INDEX IF NOT EXISTS ens_name_idx ON usernames(ens_name);

-- Add photographer_username column to images table
ALTER TABLE images ADD COLUMN IF NOT EXISTS photographer_username VARCHAR(255);

-- Create index on photographer_username for faster lookups
CREATE INDEX IF NOT EXISTS photographer_username_idx ON images(photographer_username);
