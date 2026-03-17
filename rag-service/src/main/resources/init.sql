-- =====================================================
-- Quick Setup Script for PostgreSQL with pgvector
-- =====================================================

-- Step 1: Create Database (run as postgres user)
CREATE DATABASE ragdb;

-- Step 2: Connect to the database
\c ragdb

-- Step 3: Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Verify extension
SELECT * FROM pg_extension WHERE extname = 'vector';

-- Step 4: Run the main schema.sql file
-- \i schema.sql

-- Or execute these commands:

-- =====================================================
-- Minimal Schema (Essential Tables Only)
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

CREATE TABLE documents (
    id BIGSERIAL PRIMARY KEY,
    filename VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_type VARCHAR(50) NOT NULL,
    source_url VARCHAR(1000),
    file_size BIGINT NOT NULL,
    content TEXT,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    processed BOOLEAN NOT NULL DEFAULT false,
    uploaded_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE document_chunks (
    id BIGSERIAL PRIMARY KEY,
    document_id BIGINT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    chunk_index INTEGER NOT NULL,
    content TEXT NOT NULL,
    token_count INTEGER NOT NULL,
    embedding vector(768) NOT NULL,
    embedding_model VARCHAR(50),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE chat_messages (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_id VARCHAR(100),
    user_message TEXT NOT NULL,
    assistant_response TEXT NOT NULL,
    context_used TEXT,
    model_used VARCHAR(50),
    tokens_used INTEGER,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create essential indexes
CREATE INDEX idx_documents_user_id ON documents(user_id);
CREATE INDEX idx_chunks_document_id ON document_chunks(document_id);
CREATE INDEX idx_messages_user_id ON chat_messages(user_id);
CREATE INDEX idx_messages_session_id ON chat_messages(session_id);

-- Create pgvector index (IVFFlat)
CREATE INDEX idx_chunks_embedding_ivfflat 
    ON document_chunks 
    USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 100);

-- Insert test user (password: 'password123')
INSERT INTO users (username, email, password, role) 
VALUES (
    'testuser', 
    'test@example.com', 
    '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYKxvuK6YPi', 
    'ROLE_USER'
);

-- Done! Your database is ready.
