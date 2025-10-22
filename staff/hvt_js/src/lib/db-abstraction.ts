/**
 * Database Abstraction Layer
 *
 * Provides an interface to abstract database operations for portability.
 * Enables migration from Supabase to self-hosted PostgreSQL/Docker.
 *
 * Current implementation: Supabase client
 * Future implementations: pg client, Drizzle ORM, Prisma, etc.
 */

import type { Database } from './database.types'

export type Tables = Database['public']['Tables']
export type Session = Tables['sessions']['Row']
export type SessionInsert = Tables['sessions']['Insert']
export type SessionUpdate = Tables['sessions']['Update']
export type Climber = Tables['climbers']['Row']
export type ClimberInsert = Tables['climbers']['Insert']
export type ClimberUpdate = Tables['climbers']['Update']
export type SessionClimber = Tables['session_climbers']['Row']
export type SessionClimberInsert = Tables['session_climbers']['Insert']
export type SessionClimberUpdate = Tables['session_climbers']['Update']
export type Attempt = Tables['attempts']['Row']
export type AttemptInsert = Tables['attempts']['Insert']
export type AttemptUpdate = Tables['attempts']['Update']
export type ClassList = Tables['class_lists']['Row']

export interface QueryResult<T> {
  data: T | null
  error: Error | null
}

export interface QueryResultArray<T> {
  data: T[] | null
  error: Error | null
}

/**
 * Database abstraction interface
 * All database operations should go through this interface
 */
export interface IDatabase {
  // Sessions
  getSessions(): Promise<QueryResultArray<Session>>
  getSession(id: string): Promise<QueryResult<Session>>
  getActiveSession(): Promise<QueryResult<Session>>
  createSession(session: SessionInsert): Promise<QueryResult<Session>>
  updateSession(id: string, updates: SessionUpdate): Promise<QueryResult<Session>>
  deleteSession(id: string): Promise<QueryResult<void>>

  // Climbers
  getClimbers(): Promise<QueryResultArray<Climber>>
  getClimber(id: string): Promise<QueryResult<Climber>>
  getClimbersByClass(className: string): Promise<QueryResultArray<Climber>>
  createClimber(climber: ClimberInsert): Promise<QueryResult<Climber>>
  updateClimber(id: string, updates: ClimberUpdate): Promise<QueryResult<Climber>>
  deleteClimber(id: string): Promise<QueryResult<void>>

  // Session Climbers
  getSessionClimbers(sessionId: string): Promise<QueryResultArray<SessionClimber>>
  addClimberToSession(
    sessionId: string,
    climberId: string
  ): Promise<QueryResult<SessionClimber>>
  removeClimberFromSession(
    sessionId: string,
    climberId: string
  ): Promise<QueryResult<void>>

  // Attempts
  getSessionAttempts(sessionId: string): Promise<QueryResultArray<Attempt>>
  getClimberAttempts(
    sessionId: string,
    climberId: string
  ): Promise<QueryResultArray<Attempt>>
  createAttempt(attempt: AttemptInsert): Promise<QueryResult<Attempt>>
  updateAttempt(id: string, updates: AttemptUpdate): Promise<QueryResult<Attempt>>
  deleteAttempt(id: string): Promise<QueryResult<void>>

  // Class Lists
  getClassLists(): Promise<QueryResultArray<ClassList>>

  // Scoring
  calculateClimberScore(
    sessionId: string,
    climberId: string
  ): Promise<QueryResult<{ total_points: number; rank: number | null }>>

  // Realtime subscriptions (optional, Supabase-specific)
  subscribeToSession?(
    sessionId: string,
    callback: (payload: any) => void
  ): () => void
  subscribeToSessionClimbers?(
    sessionId: string,
    callback: (payload: any) => void
  ): () => void
  subscribeToAttempts?(
    sessionId: string,
    callback: (payload: any) => void
  ): () => void
}

/**
 * Database factory
 * Returns the configured database implementation
 */
export function createDatabase(): IDatabase {
  // For now, return Supabase implementation
  // In the future, check environment variable or config to determine which implementation to use
  // e.g., if (process.env.DB_TYPE === 'postgres') return new PostgresDatabase()

  // Lazy import to avoid circular dependencies
  const { SupabaseDatabase } = require('./supabase-db')
  return new SupabaseDatabase()
}
