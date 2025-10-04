/**
 * Supabase Database Adapter
 *
 * Implementation of IDatabase interface using Supabase client.
 * This adapter provides all database operations for the HVT application.
 */

import { supabase } from './supabase'
import type {
  IDatabase,
  Session,
  SessionInsert,
  SessionUpdate,
  Climber,
  ClimberInsert,
  ClimberUpdate,
  SessionClimber,
  SessionClimberInsert,
  Attempt,
  AttemptInsert,
  AttemptUpdate,
  ClassList,
  QueryResult,
  QueryResultArray,
} from './db-abstraction'

export class SupabaseDatabase implements IDatabase {
  // Sessions
  async getSessions(): Promise<QueryResultArray<Session>> {
    const { data, error } = await supabase
      .from('sessions')
      .select('*')
      .order('date', { ascending: false })

    return {
      data: data || null,
      error: error ? new Error(error.message) : null,
    }
  }

  async getSession(id: string): Promise<QueryResult<Session>> {
    const { data, error } = await supabase
      .from('sessions')
      .select('*')
      .eq('id', id)
      .single()

    return {
      data: data || null,
      error: error ? new Error(error.message) : null,
    }
  }

  async getActiveSession(): Promise<QueryResult<Session>> {
    const { data, error } = await supabase
      .from('sessions')
      .select('*')
      .eq('status', 'active')
      .single()

    return {
      data: data || null,
      error: error ? new Error(error.message) : null,
    }
  }

  async createSession(session: SessionInsert): Promise<QueryResult<Session>> {
    const { data, error } = await supabase
      .from('sessions')
      .insert(session)
      .select()
      .single()

    return {
      data: data || null,
      error: error ? new Error(error.message) : null,
    }
  }

  async updateSession(id: string, updates: SessionUpdate): Promise<QueryResult<Session>> {
    const { data, error } = await supabase
      .from('sessions')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    return {
      data: data || null,
      error: error ? new Error(error.message) : null,
    }
  }

  async deleteSession(id: string): Promise<QueryResult<void>> {
    const { error } = await supabase.from('sessions').delete().eq('id', id)

    return {
      data: null,
      error: error ? new Error(error.message) : null,
    }
  }

  // Climbers
  async getClimbers(): Promise<QueryResultArray<Climber>> {
    const { data, error } = await supabase
      .from('climbers')
      .select('*')
      .order('name', { ascending: true })

    return {
      data: data || null,
      error: error ? new Error(error.message) : null,
    }
  }

  async getClimber(id: string): Promise<QueryResult<Climber>> {
    const { data, error } = await supabase
      .from('climbers')
      .select('*')
      .eq('id', id)
      .single()

    return {
      data: data || null,
      error: error ? new Error(error.message) : null,
    }
  }

  async getClimbersByClass(className: string): Promise<QueryResultArray<Climber>> {
    const { data, error } = await supabase
      .from('climbers')
      .select('*')
      .eq('class', className)
      .order('name', { ascending: true })

    return {
      data: data || null,
      error: error ? new Error(error.message) : null,
    }
  }

  async createClimber(climber: ClimberInsert): Promise<QueryResult<Climber>> {
    const { data, error } = await supabase
      .from('climbers')
      .insert(climber)
      .select()
      .single()

    return {
      data: data || null,
      error: error ? new Error(error.message) : null,
    }
  }

  async updateClimber(id: string, updates: ClimberUpdate): Promise<QueryResult<Climber>> {
    const { data, error } = await supabase
      .from('climbers')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    return {
      data: data || null,
      error: error ? new Error(error.message) : null,
    }
  }

  async deleteClimber(id: string): Promise<QueryResult<void>> {
    const { error } = await supabase.from('climbers').delete().eq('id', id)

    return {
      data: null,
      error: error ? new Error(error.message) : null,
    }
  }

  // Session Climbers
  async getSessionClimbers(sessionId: string): Promise<QueryResultArray<SessionClimber>> {
    const { data, error } = await supabase
      .from('session_climbers')
      .select('*')
      .eq('session_id', sessionId)
      .order('rank', { ascending: true, nullsFirst: false })

    return {
      data: data || null,
      error: error ? new Error(error.message) : null,
    }
  }

  async addClimberToSession(
    sessionId: string,
    climberId: string
  ): Promise<QueryResult<SessionClimber>> {
    const { data, error } = await supabase
      .from('session_climbers')
      .insert({
        session_id: sessionId,
        climber_id: climberId,
        total_points: 0,
        rank: null,
      })
      .select()
      .single()

    return {
      data: data || null,
      error: error ? new Error(error.message) : null,
    }
  }

  async removeClimberFromSession(
    sessionId: string,
    climberId: string
  ): Promise<QueryResult<void>> {
    const { error } = await supabase
      .from('session_climbers')
      .delete()
      .eq('session_id', sessionId)
      .eq('climber_id', climberId)

    return {
      data: null,
      error: error ? new Error(error.message) : null,
    }
  }

  // Attempts
  async getSessionAttempts(sessionId: string): Promise<QueryResultArray<Attempt>> {
    const { data, error } = await supabase
      .from('attempts')
      .select('*')
      .eq('session_id', sessionId)
      .order('climb_number', { ascending: true })

    return {
      data: data || null,
      error: error ? new Error(error.message) : null,
    }
  }

  async getClimberAttempts(
    sessionId: string,
    climberId: string
  ): Promise<QueryResultArray<Attempt>> {
    const { data, error } = await supabase
      .from('attempts')
      .select('*')
      .eq('session_id', sessionId)
      .eq('climber_id', climberId)
      .order('climb_number', { ascending: true })

    return {
      data: data || null,
      error: error ? new Error(error.message) : null,
    }
  }

  async createAttempt(attempt: AttemptInsert): Promise<QueryResult<Attempt>> {
    const { data, error } = await supabase
      .from('attempts')
      .insert(attempt)
      .select()
      .single()

    return {
      data: data || null,
      error: error ? new Error(error.message) : null,
    }
  }

  async updateAttempt(id: string, updates: AttemptUpdate): Promise<QueryResult<Attempt>> {
    const { data, error } = await supabase
      .from('attempts')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    return {
      data: data || null,
      error: error ? new Error(error.message) : null,
    }
  }

  async deleteAttempt(id: string): Promise<QueryResult<void>> {
    const { error } = await supabase.from('attempts').delete().eq('id', id)

    return {
      data: null,
      error: error ? new Error(error.message) : null,
    }
  }

  // Class Lists
  async getClassLists(): Promise<QueryResultArray<ClassList>> {
    const { data, error } = await supabase
      .from('class_lists')
      .select('*')
      .order('display_order', { ascending: true })

    return {
      data: data || null,
      error: error ? new Error(error.message) : null,
    }
  }

  // Scoring
  async calculateClimberScore(
    sessionId: string,
    climberId: string
  ): Promise<QueryResult<{ total_points: number; rank: number | null }>> {
    const { data, error } = await supabase.rpc('calculate_climber_score', {
      p_session_id: sessionId,
      p_climber_id: climberId,
    })

    return {
      data: data || null,
      error: error ? new Error(error.message) : null,
    }
  }

  // Realtime subscriptions
  subscribeToSession(sessionId: string, callback: (payload: any) => void): () => void {
    const channel = supabase
      .channel(`session:${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sessions',
          filter: `id=eq.${sessionId}`,
        },
        callback
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }

  subscribeToSessionClimbers(sessionId: string, callback: (payload: any) => void): () => void {
    const channel = supabase
      .channel(`session_climbers:${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'session_climbers',
          filter: `session_id=eq.${sessionId}`,
        },
        callback
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }

  subscribeToAttempts(sessionId: string, callback: (payload: any) => void): () => void {
    const channel = supabase
      .channel(`attempts:${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'attempts',
          filter: `session_id=eq.${sessionId}`,
        },
        callback
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }
}
