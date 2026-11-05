# ADR 0002: Zero-Provisioning Embedded Database with Drizzle ORM

## Status
Confirmed & Accepted

## Context
The application owner explicitly directed:
> *"Database: PostgreSQL is not required for now. Do not add or provision it."*

On a shared Oracle Cloud VPS running Coolify, provisioning an additional PostgreSQL service consumes extra memory (~80 MB), requires separate container orchestration, and risks port collisions or misconfigurations. At the same time, the application must guarantee ACID transactions, concurrency safety, and data persistence for single-business billing.

## Decision
1. **Embedded SQLite with Write-Ahead Logging (WAL)**: The database runs directly embedded inside the application container, storing data at `/app/data/mayur.db` on a persistent Docker volume.
2. **Drizzle ORM**: Used as the database access layer and schema definition engine.
3. **Transaction Safety**: Financial numbering allocation and invoice issuance run within `BEGIN IMMEDIATE` transactions with a 5000ms `busy_timeout`.
4. **Portability**: Schema definitions in Drizzle are kept portable. If the owner ever chooses to provision PostgreSQL in the future, the migration path requires zero changes to core domain logic.

## Consequences
- Zero external database provisioning on Coolify.
- Single container deployment with ultra-low resource footprint (~120 MB total).
- True ACID transactions and zero risk of network latency between application and database.
