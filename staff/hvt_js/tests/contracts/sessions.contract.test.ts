/**
 * Contract Tests for Sessions API
 *
 * These tests verify that our implementation matches the OpenAPI spec
 * defined in specs/001-project-description-md/contracts/sessions.openapi.yaml
 *
 * Following TDD: These tests are written BEFORE implementation and should FAIL initially.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { createDatabase } from '../../src/lib/db-abstraction'
import type { IDatabase } from '../../src/lib/db-abstraction'

let db: IDatabase

beforeAll(async () => {
  db = createDatabase()
})

beforeEach(async () => {
  // Clean up all sessions before each test to ensure clean state
  const sessions = await db.getSessions()
  if (sessions.data) {
    for (const session of sessions.data) {
      await db.deleteSession(session.id)
    }
  }
})

afterAll(async () => {
  // Final cleanup
  const sessions = await db.getSessions()
  if (sessions.data) {
    for (const session of sessions.data) {
      await db.deleteSession(session.id)
    }
  }
})

describe('Sessions API Contract Tests', () => {
  describe('GET /sessions - listSessions', () => {
    it('should return an array of sessions', async () => {
      const result = await db.getSessions()

      expect(result.error).toBeNull()
      expect(result.data).toBeInstanceOf(Array)
    })

    it('should return sessions ordered by date DESC by default', async () => {
      const result = await db.getSessions()

      expect(result.data).toBeDefined()
      if (result.data && result.data.length > 1) {
        const dates = result.data.map(s => new Date(s.date).getTime())
        for (let i = 0; i < dates.length - 1; i++) {
          expect(dates[i]).toBeGreaterThanOrEqual(dates[i + 1])
        }
      }
    })

    it('should return sessions with all required fields per schema', async () => {
      const result = await db.getSessions()

      expect(result.data).toBeDefined()
      if (result.data && result.data.length > 0) {
        const session = result.data[0]

        // Required fields from OpenAPI schema
        expect(session).toHaveProperty('id')
        expect(session).toHaveProperty('name')
        expect(session).toHaveProperty('date')
        expect(session).toHaveProperty('location')
        expect(session).toHaveProperty('status')
        expect(session).toHaveProperty('created_at')
        expect(session).toHaveProperty('updated_at')

        // Validate types
        expect(typeof session.id).toBe('string')
        expect(typeof session.name).toBe('string')
        expect(typeof session.date).toBe('string')
        expect(typeof session.location).toBe('string')
        expect(['active', 'completed', 'cancelled']).toContain(session.status)
      }
    })
  })

  describe('POST /sessions - createSession', () => {
    it('should create a new session with valid data', async () => {
      const newSession = {
        name: 'Test Session 2025-10-04',
        date: '2025-10-04',
        location: 'Test Gym',
        status: 'active' as const,
      }

      const result = await db.createSession(newSession)

      expect(result.error).toBeNull()
      expect(result.data).toBeDefined()
      expect(result.data?.name).toBe(newSession.name)
      expect(result.data?.date).toBe(newSession.date)
      expect(result.data?.location).toBe(newSession.location)
      expect(result.data?.status).toBe('active')
      expect(result.data?.id).toBeDefined()
    })

    it('should enforce single active session constraint (FR-010)', async () => {
      // Create first active session
      const session1 = await db.createSession({
        name: 'Active Session 1',
        date: '2025-10-04',
        location: 'Gym 1',
        status: 'active' as const,
      })
      expect(session1.error).toBeNull()

      // Try to create second active session - should fail
      const session2 = await db.createSession({
        name: 'Active Session 2',
        date: '2025-10-05',
        location: 'Gym 2',
        status: 'active' as const,
      })

      expect(session2.error).toBeDefined()
      expect(session2.error?.message).toMatch(/active session/i)
    })

    it('should validate required fields', async () => {
      // @ts-expect-error - testing invalid input
      const result = await db.createSession({
        // Missing required fields
        name: 'Incomplete Session',
      })

      expect(result.error).toBeDefined()
    })

    it('should enforce name length constraints (1-100 chars)', async () => {
      const emptyName = await db.createSession({
        name: '',
        date: '2025-10-04',
        location: 'Test',
        status: 'completed' as const,
      })
      expect(emptyName.error).toBeDefined()

      const tooLongName = await db.createSession({
        name: 'x'.repeat(101),
        date: '2025-10-04',
        location: 'Test',
        status: 'completed' as const,
      })
      expect(tooLongName.error).toBeDefined()
    })
  })

  describe('GET /sessions/{id} - getSession', () => {
    it('should return session by ID', async () => {
      // First create a session
      const created = await db.createSession({
        name: 'Test Get Session',
        date: '2025-10-04',
        location: 'Test Gym',
        status: 'completed' as const,
      })

      expect(created.data?.id).toBeDefined()
      const sessionId = created.data!.id

      // Now fetch it
      const result = await db.getSession(sessionId)

      expect(result.error).toBeNull()
      expect(result.data).toBeDefined()
      expect(result.data?.id).toBe(sessionId)
      expect(result.data?.name).toBe('Test Get Session')
    })

    it('should return error for non-existent session', async () => {
      const result = await db.getSession('00000000-0000-0000-0000-000000000000')

      expect(result.error).toBeDefined()
      expect(result.data).toBeNull()
    })
  })

  describe('GET /sessions (active filter) - getActiveSession', () => {
    it('should return the active session if one exists', async () => {
      // Create an active session
      const created = await db.createSession({
        name: 'Active Session Test',
        date: '2025-10-04',
        location: 'Test Gym',
        status: 'active' as const,
      })

      expect(created.error).toBeNull()

      // Get active session
      const result = await db.getActiveSession()

      expect(result.error).toBeNull()
      expect(result.data).toBeDefined()
      expect(result.data?.status).toBe('active')
      expect(result.data?.id).toBe(created.data?.id)
    })

    it('should return null when no active session exists', async () => {
      // Ensure no active sessions (all completed)
      const result = await db.getActiveSession()

      // Should succeed but return null data
      expect(result.error).toBeNull()
      expect(result.data).toBeNull()
    })
  })

  describe('PATCH /sessions/{id} - updateSession', () => {
    it('should update session fields', async () => {
      // Create session
      const created = await db.createSession({
        name: 'Original Name',
        date: '2025-10-04',
        location: 'Original Location',
        status: 'active' as const,
      })

      const sessionId = created.data!.id

      // Update it
      const updated = await db.updateSession(sessionId, {
        name: 'Updated Name',
        location: 'Updated Location',
      })

      expect(updated.error).toBeNull()
      expect(updated.data?.name).toBe('Updated Name')
      expect(updated.data?.location).toBe('Updated Location')
      expect(updated.data?.date).toBe('2025-10-04') // Unchanged
    })

    it('should return error for non-existent session', async () => {
      const result = await db.updateSession('00000000-0000-0000-0000-000000000000', {
        name: 'Should Fail',
      })

      expect(result.error).toBeDefined()
    })

    it('should enforce validation on updated fields', async () => {
      const created = await db.createSession({
        name: 'Test Session',
        date: '2025-10-04',
        location: 'Test',
        status: 'completed' as const,
      })

      const result = await db.updateSession(created.data!.id, {
        name: '', // Invalid: too short
      })

      expect(result.error).toBeDefined()
    })
  })

  describe('DELETE /sessions/{id} - deleteSession', () => {
    it('should delete a completed session', async () => {
      const created = await db.createSession({
        name: 'Session to Delete',
        date: '2025-10-04',
        location: 'Test',
        status: 'completed' as const,
      })

      const sessionId = created.data!.id

      const deleted = await db.deleteSession(sessionId)

      expect(deleted.error).toBeNull()

      // Verify it's gone
      const fetched = await db.getSession(sessionId)
      expect(fetched.data).toBeNull()
    })

    it('should return error when deleting non-existent session', async () => {
      const result = await db.deleteSession('00000000-0000-0000-0000-000000000000')

      expect(result.error).toBeDefined()
    })
  })

  describe('Session status transitions', () => {
    it('should allow transitioning from active to completed', async () => {
      const created = await db.createSession({
        name: 'Status Test',
        date: '2025-10-04',
        location: 'Test',
        status: 'active' as const,
      })

      const updated = await db.updateSession(created.data!.id, {
        status: 'completed',
      })

      expect(updated.error).toBeNull()
      expect(updated.data?.status).toBe('completed')
    })

    it('should allow transitioning from active to cancelled', async () => {
      const created = await db.createSession({
        name: 'Cancel Test',
        date: '2025-10-04',
        location: 'Test',
        status: 'active' as const,
      })

      const updated = await db.updateSession(created.data!.id, {
        status: 'cancelled',
      })

      expect(updated.error).toBeNull()
      expect(updated.data?.status).toBe('cancelled')
    })
  })

  describe('Timestamps', () => {
    it('should automatically set created_at and updated_at on creation', async () => {
      const before = new Date()

      const created = await db.createSession({
        name: 'Timestamp Test',
        date: '2025-10-04',
        location: 'Test',
        status: 'completed' as const,
      })

      const after = new Date()

      expect(created.data?.created_at).toBeDefined()
      expect(created.data?.updated_at).toBeDefined()

      const createdAt = new Date(created.data!.created_at)
      expect(createdAt.getTime()).toBeGreaterThanOrEqual(before.getTime())
      expect(createdAt.getTime()).toBeLessThanOrEqual(after.getTime())
    })

    it('should update updated_at on modification', async () => {
      const created = await db.createSession({
        name: 'Update Timestamp Test',
        date: '2025-10-04',
        location: 'Test',
        status: 'completed' as const,
      })

      const originalUpdatedAt = created.data!.updated_at

      // Wait a bit to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 10))

      const updated = await db.updateSession(created.data!.id, {
        name: 'Modified Name',
      })

      expect(updated.data?.updated_at).toBeDefined()
      expect(new Date(updated.data!.updated_at).getTime()).toBeGreaterThan(
        new Date(originalUpdatedAt).getTime()
      )
    })
  })
})
