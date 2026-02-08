-- Create a table for global settings
CREATE TABLE IF NOT EXISTS global_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE global_settings ENABLE ROW LEVEL SECURITY;

-- Allow everyone to SELECT (read-only for the app)
CREATE POLICY "Allow public read access" ON global_settings
    FOR SELECT USING (true);

-- Insert Evolution API credentials (Replace these with your actual production values)
INSERT INTO global_settings (key, value)
VALUES 
    ('evolution_base_url', 'https://your-evolution-api-url.com'),
    ('evolution_global_api_key', 'your-global-api-key')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
