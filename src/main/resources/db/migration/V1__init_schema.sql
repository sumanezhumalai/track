-- EGS Support schema DDL
-- Run: docker exec -i postgres18 psql -U postgres -d EGS_support < V1__init_schema.sql

CREATE SCHEMA IF NOT EXISTS "EGS";

CREATE TABLE IF NOT EXISTS "EGS"."generalSupport" (
    ae_id        BIGSERIAL PRIMARY KEY,
    ae_name      VARCHAR(100) NOT NULL,
    role         VARCHAR(50)  NOT NULL,
    team         VARCHAR(100),
    created_at   TIMESTAMP DEFAULT NOW(),
    created_by   VARCHAR(100)
);

CREATE TABLE IF NOT EXISTS "EGS"."devSupport" (
    dev_id            BIGSERIAL PRIMARY KEY,
    dev_name          VARCHAR(100) NOT NULL UNIQUE,
    role              VARCHAR(50)  NOT NULL,
    team              VARCHAR(100),
    created_at        TIMESTAMP DEFAULT NOW(),
    created_by        VARCHAR(100),
    type              VARCHAR(10)  NOT NULL CHECK (type IN ('admin','dev')),
    password_hash     VARCHAR(255) NOT NULL,
    password_onboard  BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS "EGS"."team_sessions" (
    session_id          BIGSERIAL PRIMARY KEY,
    dev_name            VARCHAR(100),
    ae_name             VARCHAR(100),
    start_time          TIMESTAMP NOT NULL DEFAULT NOW(),
    end_time            TIMESTAMP,
    created_at          TIMESTAMP DEFAULT NOW(),
    session_description TEXT
);

CREATE TABLE IF NOT EXISTS "EGS"."Audits" (
    id        BIGSERIAL PRIMARY KEY,
    timestamp TIMESTAMP DEFAULT NOW(),
    action    VARCHAR(255),
    username  VARCHAR(100),
    status    VARCHAR(50)
);
