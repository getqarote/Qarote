-- Create the main captured_messages table with partitioning by date
CREATE TABLE captured_messages (
    id BIGSERIAL,
    workspace_id TEXT NOT NULL,
    server_id TEXT NOT NULL,
    queue_name TEXT NOT NULL,
    vhost TEXT NOT NULL DEFAULT '/',
    
    -- Message content
    payload TEXT NOT NULL,
    payload_encoding TEXT DEFAULT 'string', -- 'string', 'base64', 'json'
    payload_size INTEGER NOT NULL,
    
    -- Message properties
    properties JSONB,
    headers JSONB,
    routing_key TEXT,
    exchange_name TEXT,
    delivery_mode INTEGER,
    priority INTEGER,
    correlation_id TEXT,
    reply_to TEXT,
    message_id TEXT,
    app_id TEXT,
    content_type TEXT,
    content_encoding TEXT,
    expiration TEXT,
    
    -- Message state
    redelivered BOOLEAN DEFAULT FALSE,
    delivery_tag BIGINT,
    consumer_tag TEXT,
    
    -- Timestamps
    message_timestamp TIMESTAMPTZ, -- From message properties
    published_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    consumed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    captured_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Partitioning key - must be part of primary key for partitioned table
    partition_date DATE NOT NULL DEFAULT CURRENT_DATE,
    
    CONSTRAINT captured_messages_pkey PRIMARY KEY (id, partition_date)
) PARTITION BY RANGE (partition_date);

-- Create indexes for high-performance querying
-- Note: Indexes must be created on each partition, we'll do this via pg_partman

-- Create template table for partition indexes
CREATE TABLE captured_messages_template (LIKE captured_messages INCLUDING ALL);

-- Workspace + Server + Queue lookup (most common query pattern)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_captured_messages_workspace_server_queue 
ON captured_messages_template (workspace_id, server_id, queue_name, consumed_at DESC);

-- Content search (for full-text search on payload)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_captured_messages_payload_gin 
ON captured_messages_template USING gin(to_tsvector('english', payload));

-- Properties search (for JSON queries)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_captured_messages_properties_gin 
ON captured_messages_template USING gin(properties);

-- Headers search
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_captured_messages_headers_gin 
ON captured_messages_template USING gin(headers);

-- Time-based queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_captured_messages_consumed_at 
ON captured_messages_template (consumed_at DESC);

-- Exchange and routing key lookups
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_captured_messages_exchange_routing 
ON captured_messages_template (exchange_name, routing_key);

-- Message properties lookups
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_captured_messages_correlation_id 
ON captured_messages_template (correlation_id) WHERE correlation_id IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_captured_messages_message_id 
ON captured_messages_template (message_id) WHERE message_id IS NOT NULL;

-- Setup pg_partman for automatic partition management
SELECT partman.create_parent(
    p_parent_table => 'public.captured_messages',
    p_control => 'partition_date',
    p_type => 'range',
    p_interval => 'daily',
    p_premake => 7, -- Create 7 days of future partitions
    p_template_table => 'public.captured_messages_template'
);

-- Configure automatic partition maintenance
UPDATE partman.part_config 
SET 
    retention = '7 days', -- Default retention, will be overridden by workspace policy
    retention_keep_table = FALSE, -- Drop old partitions completely
    retention_keep_index = FALSE,
    automatic_maintenance = 'on'
WHERE parent_table = 'public.captured_messages';

-- Create user retention policies table
CREATE TABLE user_retention_policies (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id TEXT NOT NULL UNIQUE,
    retention_days INTEGER NOT NULL DEFAULT 1,
    max_message_size_mb INTEGER NOT NULL DEFAULT 10, -- Max size per message
    max_storage_gb INTEGER NOT NULL DEFAULT 1, -- Max total storage
    auto_cleanup BOOLEAN NOT NULL DEFAULT TRUE,
    compress_old_messages BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT fk_user_retention_workspace 
        FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
    
    -- Validate retention based on plan limits
    CONSTRAINT valid_retention_days CHECK (retention_days >= 1 AND retention_days <= 365)
);

-- Add retention policy indexes
CREATE INDEX idx_user_retention_workspace ON user_retention_policies(workspace_id);
CREATE INDEX idx_user_retention_cleanup ON user_retention_policies(auto_cleanup, updated_at) 
WHERE auto_cleanup = TRUE;

-- Create message capture configuration table
CREATE TABLE message_capture_config (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id TEXT NOT NULL,
    server_id TEXT NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT FALSE,
    capture_method TEXT NOT NULL DEFAULT 'firehose', -- 'firehose', 'tracing', 'shovel'
    
    -- Filtering options
    queue_patterns TEXT[] DEFAULT ARRAY['*'], -- Queue name patterns to capture
    exclude_queues TEXT[] DEFAULT ARRAY[]::TEXT[], -- Queues to exclude
    min_message_size INTEGER DEFAULT 0,
    max_message_size INTEGER DEFAULT 10485760, -- 10MB default
    
    -- Capture settings
    sample_rate DECIMAL(3,2) DEFAULT 1.0, -- 1.0 = 100%, 0.1 = 10%
    capture_payload BOOLEAN DEFAULT TRUE,
    capture_headers BOOLEAN DEFAULT TRUE,
    capture_properties BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT fk_capture_config_workspace 
        FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
    CONSTRAINT fk_capture_config_server 
        FOREIGN KEY (server_id) REFERENCES rabbitmq_servers(id) ON DELETE CASCADE,
    
    UNIQUE(workspace_id, server_id)
);

-- Create indexes for capture config
CREATE INDEX idx_capture_config_workspace ON message_capture_config(workspace_id);
CREATE INDEX idx_capture_config_server ON message_capture_config(server_id);
CREATE INDEX idx_capture_config_enabled ON message_capture_config(enabled) WHERE enabled = TRUE;

-- Create a function to clean up old messages based on retention policy
CREATE OR REPLACE FUNCTION cleanup_old_messages()
RETURNS INTEGER AS $$
DECLARE
    policy RECORD;
    partition_name TEXT;
    cutoff_date DATE;
    deleted_count INTEGER := 0;
BEGIN
    -- Loop through all retention policies
    FOR policy IN 
        SELECT workspace_id, retention_days 
        FROM user_retention_policies 
        WHERE auto_cleanup = TRUE
    LOOP
        cutoff_date := CURRENT_DATE - INTERVAL '1 day' * policy.retention_days;
        
        -- Find partitions older than cutoff date for this workspace
        FOR partition_name IN
            SELECT schemaname||'.'||tablename as full_name
            FROM pg_tables 
            WHERE tablename LIKE 'captured_messages_p%'
            AND tablename < 'captured_messages_p' || to_char(cutoff_date, 'YYYY_MM_DD')
        LOOP
            -- Delete messages for this workspace from old partitions
            EXECUTE format('DELETE FROM %s WHERE workspace_id = $1', partition_name) 
            USING policy.workspace_id;
            
            GET DIAGNOSTICS deleted_count = ROW_COUNT;
            
            RAISE NOTICE 'Cleaned up % messages for workspace % from partition %', 
                deleted_count, policy.workspace_id, partition_name;
        END LOOP;
    END LOOP;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Create indexes on the main table (will be inherited by partitions)
-- Note: We'll create the actual partition table indexes via the application

COMMENT ON TABLE captured_messages IS 'Stores captured/acked RabbitMQ messages with automatic partitioning by date';
COMMENT ON TABLE user_retention_policies IS 'Per-workspace message retention policies based on subscription plans';
COMMENT ON TABLE message_capture_config IS 'Configuration for message capture per server';
COMMENT ON FUNCTION cleanup_old_messages() IS 'Cleans up old messages based on workspace retention policies';
