-- =====================================================
-- PostgreSQL Schema for RAG Chatbot with pgvector
-- =====================================================

-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Verify extension is enabled
SELECT * FROM pg_extension WHERE extname = 'vector';

-- =====================================================
-- Drop existing tables (if needed for fresh setup)
-- =====================================================

DROP TABLE IF EXISTS chat_messages CASCADE;
DROP TABLE IF EXISTS document_chunks CASCADE;
DROP TABLE IF EXISTS documents CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- =====================================================
-- Create Users Table
-- =====================================================

CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    email VARCHAR(150) UNIQUE,
    enabled BOOLEAN NOT NULL DEFAULT true,
    role VARCHAR(50) NOT NULL DEFAULT 'ROLE_USER',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes on users table
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);

-- =====================================================
-- Create Documents Table
-- =====================================================

CREATE TABLE documents (
    id BIGSERIAL PRIMARY KEY,
    filename VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_type VARCHAR(50) NOT NULL,
    source_url VARCHAR(1000),
    file_size BIGINT NOT NULL,
    content TEXT,
    user_id BIGINT NOT NULL,
    processed BOOLEAN NOT NULL DEFAULT false,
    uploaded_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_documents_user FOREIGN KEY (user_id) 
        REFERENCES users(id) ON DELETE CASCADE
);

-- Create indexes on documents table
CREATE INDEX idx_documents_user_id ON documents(user_id);
CREATE INDEX idx_documents_processed ON documents(processed);
CREATE INDEX idx_documents_file_type ON documents(file_type);

-- =====================================================
-- Create Document Chunks Table with pgvector
-- =====================================================

CREATE TABLE document_chunks (
    id BIGSERIAL PRIMARY KEY,
    document_id BIGINT NOT NULL,
    chunk_index INTEGER NOT NULL,
    content TEXT NOT NULL,
    token_count INTEGER NOT NULL,
    embedding vector(768) NOT NULL,  -- Ollama nomic-embed-text embedding dimension
    embedding_model VARCHAR(50),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_chunks_document FOREIGN KEY (document_id) 
        REFERENCES documents(id) ON DELETE CASCADE
);

-- Create indexes on document_chunks table
CREATE INDEX idx_chunks_document_id ON document_chunks(document_id);
CREATE INDEX idx_chunks_chunk_index ON document_chunks(chunk_index);

-- =====================================================
-- Create pgvector Index using IVFFlat
-- =====================================================

-- IVFFlat index for fast approximate nearest neighbor search
-- lists = sqrt(rows) is a good starting point
-- You may need to adjust 'lists' based on your data size
CREATE INDEX idx_chunks_embedding_ivfflat 
    ON document_chunks 
    USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 100);

-- Alternative: Create index using HNSW (if using PostgreSQL 16+ with pgvector 0.5.0+)
-- HNSW generally provides better query performance than IVFFlat
-- Uncomment the line below if you want to use HNSW instead:
-- CREATE INDEX idx_chunks_embedding_hnsw ON document_chunks USING hnsw (embedding vector_cosine_ops);

-- =====================================================
-- Create Chat Messages Table
-- =====================================================

CREATE TABLE chat_messages (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    session_id VARCHAR(100),
    user_message TEXT NOT NULL,
    assistant_response TEXT NOT NULL,
    context_used TEXT,
    model_used VARCHAR(50),
    tokens_used INTEGER,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_messages_user FOREIGN KEY (user_id) 
        REFERENCES users(id) ON DELETE CASCADE
);

-- Create indexes on chat_messages table
CREATE INDEX idx_messages_user_id ON chat_messages(user_id);
CREATE INDEX idx_messages_session_id ON chat_messages(session_id);
CREATE INDEX idx_messages_created_at ON chat_messages(created_at DESC);

-- =====================================================
-- Create Function for Updated At Timestamp
-- =====================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for users table
CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- Insert Sample Data (Optional)
-- =====================================================

-- Insert a test user (password is 'password123' hashed with BCrypt)
INSERT INTO users (username, email, password, role) 
VALUES (
    'testuser', 
    'test@example.com', 
    '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYKxvuK6YPi', 
    'ROLE_USER'
);

-- =====================================================
-- Useful Queries for pgvector
-- =====================================================

-- Query 1: Find similar chunks using cosine distance
-- Example: Find 5 most similar chunks to a query embedding
/*
SELECT 
    dc.id,
    dc.content,
    dc.embedding <=> '[0.1, 0.2, ..., 0.3]'::vector AS distance,
    d.filename
FROM document_chunks dc
JOIN documents d ON dc.document_id = d.id
WHERE d.user_id = 1
ORDER BY dc.embedding <=> '[0.1, 0.2, ..., 0.3]'::vector
LIMIT 5;
*/

-- Query 2: Find chunks with similarity above threshold
-- Cosine distance ranges from 0 (identical) to 2 (opposite)
-- Similarity = 1 - (cosine_distance / 2)
/*
SELECT 
    dc.id,
    dc.content,
    1 - (dc.embedding <=> '[0.1, 0.2, ..., 0.3]'::vector) AS similarity,
    d.filename
FROM document_chunks dc
JOIN documents d ON dc.document_id = d.id
WHERE d.user_id = 1
    AND 1 - (dc.embedding <=> '[0.1, 0.2, ..., 0.3]'::vector) >= 0.7
ORDER BY similarity DESC
LIMIT 10;
*/

-- Query 3: Get statistics about embeddings
/*
SELECT 
    COUNT(*) as total_chunks,
    AVG(token_count) as avg_tokens,
    COUNT(DISTINCT document_id) as total_documents
FROM document_chunks;
*/

-- =====================================================
-- Database Configuration Recommendations
-- =====================================================

-- Set work_mem for better performance with vector operations
-- Execute as superuser or add to postgresql.conf
-- SET work_mem = '256MB';

-- For better IVFFlat performance, increase maintenance_work_mem during index creation
-- SET maintenance_work_mem = '512MB';

-- Enable parallel query execution for large datasets
-- SET max_parallel_workers_per_gather = 4;

-- =====================================================
-- Backup and Maintenance
-- =====================================================

-- Create a backup (run from command line)
-- pg_dump -U postgres -d ragdb -F c -f ragdb_backup.dump

-- Restore from backup (run from command line)
-- pg_restore -U postgres -d ragdb ragdb_backup.dump

-- Vacuum and analyze for optimal performance
-- VACUUM ANALYZE document_chunks;

-- =====================================================
-- Performance Monitoring
-- =====================================================

-- Check index usage
/*
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan as index_scans,
    idx_tup_read as tuples_read,
    idx_tup_fetch as tuples_fetched
FROM pg_stat_user_indexes
WHERE tablename = 'document_chunks'
ORDER BY idx_scan DESC;
*/

-- Check table size
/*
SELECT 
    pg_size_pretty(pg_total_relation_size('document_chunks')) AS total_size,
    pg_size_pretty(pg_relation_size('document_chunks')) AS table_size,
    pg_size_pretty(pg_total_relation_size('document_chunks') - pg_relation_size('document_chunks')) AS indexes_size;
*/

-- =====================================================
-- Security: Grant Permissions
-- =====================================================

-- Create application user (if not using postgres)
-- CREATE USER ragapp WITH PASSWORD 'your_secure_password';

-- Grant permissions
-- GRANT CONNECT ON DATABASE ragdb TO ragapp;
-- GRANT USAGE ON SCHEMA public TO ragapp;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO ragapp;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO ragapp;

-- Make sure future tables also get permissions
-- ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO ragapp;
-- ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO ragapp;

-- =====================================================
-- End of Schema
-- =====================================================

COMMENT ON TABLE users IS 'Stores user accounts with authentication details';
COMMENT ON TABLE documents IS 'Stores uploaded documents metadata';
COMMENT ON TABLE document_chunks IS 'Stores document chunks with embeddings for RAG';
COMMENT ON TABLE chat_messages IS 'Stores chat history and RAG interactions';
COMMENT ON COLUMN document_chunks.embedding IS 'Vector embedding (dimension 768) for similarity search with Ollama nomic-embed-text';
COMMENT ON INDEX idx_chunks_embedding_ivfflat IS 'IVFFlat index for fast approximate nearest neighbor search';
