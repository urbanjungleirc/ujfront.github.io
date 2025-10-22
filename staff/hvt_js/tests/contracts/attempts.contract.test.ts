/**
 * Contract Tests for Attempts API
 *
 * These tests verify that our implementation matches the OpenAPI spec
 * defined in specs/001-project-description-md/contracts/attempts.openapi.yaml
 *
 * Following TDD: These tests are written BEFORE implementation and should FAIL initially.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest'
import { createDatabase } from '../../src/lib/db-abstraction'
import type { IDatabase } from '../../src/lib/db-abstraction'

let db: IDatabase
let testSessionId: string
let testClimberId: string

beforeAll(async () => {
  db = createDatabase()
})

beforeEach(async () => {
  // Create test session and climber for attempts tests
  const session = await db.createSession({
    name: 'Attempts Test Session',
    date: '2025-10-04',
    location: 'Test Gym',
    status: 'active' as const,
  })
  testSessionId = session.data!.id

  const climber = await db.createClimber({
    name: 'Attempts Test Climber',
    class: '6b',
  })
  testClimberId = climber.data!.id

  // Add climber to session
  await db.addClimberToSession(testSessionId, testClimberId)
})

afterEach(async () => {
  // Clean up test session and climber after each test
  if (testSessionId) {
    await db.deleteSession(testSessionId)
  }
  if (testClimberId) {
    await db.deleteClimber(testClimberId)
  }
})

afterAll(async () => {
  // Final cleanup - remove any remaining test data
  const sessions = await db.getSessions()
  if (sessions.data) {
    for (const session of sessions.data) {
      if (session.name.includes('Test')) {
        await db.deleteSession(session.id)
      }
    }
  }

  const climbers = await db.getClimbers()
  if (climbers.data) {
    for (const climber of climbers.data) {
      if (climber.name.includes('Test') || climber.name.includes('Climber')) {
        await db.deleteClimber(climber.id)
      }
    }
  }
})

describe('Attempts API Contract Tests', () => {
  describe('GET /attempts - getAttempts', () => {
    it('should return attempts for a session', async () => {
      const result = await db.getSessionAttempts(testSessionId)

      expect(result.error).toBeNull()
      expect(result.data).toBeInstanceOf(Array)
    })

    it('should filter attempts by climber_id', async () => {
      // Create attempts for two different climbers
      const climber2 = await db.createClimber({
        name: 'Second Climber',
        class: '7a',
      })
      await db.addClimberToSession(testSessionId, climber2.data!.id)

      await db.createAttempt({
        session_id: testSessionId,
        climber_id: testClimberId,
        climb_number: 1,
        grade: '6a',
        status: 'flash',
        points: 1000,
      })

      await db.createAttempt({
        session_id: testSessionId,
        climber_id: climber2.data!.id,
        climb_number: 1,
        grade: '7a',
        status: 'flash',
        points: 1000,
      })

      // Filter by first climber
      const result = await db.getClimberAttempts(testSessionId, testClimberId)

      expect(result.error).toBeNull()
      expect(result.data).toBeDefined()
      expect(result.data?.every(a => a.climber_id === testClimberId)).toBe(true)
      expect(result.data?.some(a => a.climber_id === climber2.data!.id)).toBe(false)
    })

    it('should return attempts with all required fields per schema', async () => {
      await db.createAttempt({
        session_id: testSessionId,
        climber_id: testClimberId,
        climb_number: 1,
        grade: '6b',
        status: 'flash',
        points: 1000,
      })

      const result = await db.getSessionAttempts(testSessionId)

      expect(result.data).toBeDefined()
      if (result.data && result.data.length > 0) {
        const attempt = result.data[0]

        // Required fields from OpenAPI schema
        expect(attempt).toHaveProperty('id')
        expect(attempt).toHaveProperty('session_id')
        expect(attempt).toHaveProperty('climber_id')
        expect(attempt).toHaveProperty('climb_number')
        expect(attempt).toHaveProperty('grade')
        expect(attempt).toHaveProperty('status')
        expect(attempt).toHaveProperty('points')
        expect(attempt).toHaveProperty('created_at')
        expect(attempt).toHaveProperty('updated_at')

        // Validate types
        expect(typeof attempt.id).toBe('string')
        expect(typeof attempt.session_id).toBe('string')
        expect(typeof attempt.climber_id).toBe('string')
        expect(typeof attempt.climb_number).toBe('number')
        expect(typeof attempt.grade).toBe('string')
        expect(['flash', 'top', 'fail']).toContain(attempt.status)
        expect(typeof attempt.points).toBe('number')
      }
    })
  })

  describe('POST /attempts - createAttempt', () => {
    it('should create a new attempt with valid data', async () => {
      const newAttempt = {
        session_id: testSessionId,
        climber_id: testClimberId,
        climb_number: 1,
        grade: '6b',
        status: 'flash' as const,
        points: 1000,
      }

      const result = await db.createAttempt(newAttempt)

      expect(result.error).toBeNull()
      expect(result.data).toBeDefined()
      expect(result.data?.session_id).toBe(testSessionId)
      expect(result.data?.climber_id).toBe(testClimberId)
      expect(result.data?.climb_number).toBe(1)
      expect(result.data?.grade).toBe('6b')
      expect(result.data?.status).toBe('flash')
      expect(result.data?.points).toBe(1000)
      expect(result.data?.id).toBeDefined()
    })

    it('should enforce unique constraint on (session_id, climber_id, climb_number)', async () => {
      const attemptData = {
        session_id: testSessionId,
        climber_id: testClimberId,
        climb_number: 1,
        grade: '6a',
        status: 'flash' as const,
        points: 1000,
      }

      // Create first attempt
      const first = await db.createAttempt(attemptData)
      expect(first.error).toBeNull()

      // Try to create duplicate - should fail
      const duplicate = await db.createAttempt(attemptData)

      expect(duplicate.error).toBeDefined()
      expect(duplicate.error?.message).toMatch(/unique|already exists|constraint/i)
    })

    it('should validate status enum (flash, top, fail)', async () => {
      // @ts-expect-error - testing invalid enum
      const result = await db.createAttempt({
        session_id: testSessionId,
        climber_id: testClimberId,
        climb_number: 2,
        grade: '6a',
        status: 'invalid_status',
        points: 500,
      })

      expect(result.error).toBeDefined()
    })

    it('should validate required fields', async () => {
      // @ts-expect-error - testing missing fields
      const result = await db.createAttempt({
        session_id: testSessionId,
        climber_id: testClimberId,
        // Missing climb_number, grade, status, points
      })

      expect(result.error).toBeDefined()
    })

    it('should enforce foreign key constraint on session_id', async () => {
      const result = await db.createAttempt({
        session_id: '00000000-0000-0000-0000-000000000000',
        climber_id: testClimberId,
        climb_number: 1,
        grade: '6a',
        status: 'flash',
        points: 1000,
      })

      expect(result.error).toBeDefined()
    })

    it('should enforce foreign key constraint on climber_id', async () => {
      const result = await db.createAttempt({
        session_id: testSessionId,
        climber_id: '00000000-0000-0000-0000-000000000000',
        climb_number: 1,
        grade: '6a',
        status: 'flash',
        points: 1000,
      })

      expect(result.error).toBeDefined()
    })

    it('should validate points are non-negative', async () => {
      const result = await db.createAttempt({
        session_id: testSessionId,
        climber_id: testClimberId,
        climb_number: 3,
        grade: '6a',
        status: 'flash',
        points: -100, // Invalid: negative points
      })

      expect(result.error).toBeDefined()
    })
  })

  describe('PATCH /attempts/{id} - updateAttempt', () => {
    it('should update attempt fields', async () => {
      const created = await db.createAttempt({
        session_id: testSessionId,
        climber_id: testClimberId,
        climb_number: 1,
        grade: '6a',
        status: 'fail',
        points: 100,
      })

      const attemptId = created.data!.id

      // Update to flash
      const updated = await db.updateAttempt(attemptId, {
        status: 'flash',
        points: 1000,
      })

      expect(updated.error).toBeNull()
      expect(updated.data?.status).toBe('flash')
      expect(updated.data?.points).toBe(1000)
      expect(updated.data?.grade).toBe('6a') // Unchanged
    })

    it('should return error for non-existent attempt', async () => {
      const result = await db.updateAttempt('00000000-0000-0000-0000-000000000000', {
        points: 500,
      })

      expect(result.error).toBeDefined()
    })

    it('should enforce validation on updated fields', async () => {
      const created = await db.createAttempt({
        session_id: testSessionId,
        climber_id: testClimberId,
        climb_number: 1,
        grade: '6a',
        status: 'flash',
        points: 1000,
      })

      const result = await db.updateAttempt(created.data!.id, {
        points: -500, // Invalid: negative
      })

      expect(result.error).toBeDefined()
    })
  })

  describe('DELETE /attempts/{id} - deleteAttempt', () => {
    it('should delete an attempt', async () => {
      const created = await db.createAttempt({
        session_id: testSessionId,
        climber_id: testClimberId,
        climb_number: 1,
        grade: '6a',
        status: 'flash',
        points: 1000,
      })

      const attemptId = created.data!.id

      const deleted = await db.deleteAttempt(attemptId)

      expect(deleted.error).toBeNull()

      // Verify it's gone
      const attempts = await db.getSessionAttempts(testSessionId)
      expect(attempts.data?.some(a => a.id === attemptId)).toBe(false)
    })

    it('should return error when deleting non-existent attempt', async () => {
      const result = await db.deleteAttempt('00000000-0000-0000-0000-000000000000')

      expect(result.error).toBeDefined()
    })
  })

  describe('Scoring Function - calculateClimberScore (FR-018, FR-019, FR-020, FR-021)', () => {
    it('should calculate total points for a climber (FR-018)', async () => {
      // Create multiple attempts
      await db.createAttempt({
        session_id: testSessionId,
        climber_id: testClimberId,
        climb_number: 1,
        grade: '6a',
        status: 'flash',
        points: 1000,
      })

      await db.createAttempt({
        session_id: testSessionId,
        climber_id: testClimberId,
        climb_number: 2,
        grade: '6b',
        status: 'top',
        points: 800,
      })

      await db.createAttempt({
        session_id: testSessionId,
        climber_id: testClimberId,
        climb_number: 3,
        grade: '7a',
        status: 'fail',
        points: 100,
      })

      // Calculate score
      const result = await db.calculateClimberScore(testSessionId, testClimberId)

      expect(result.error).toBeNull()
      expect(result.data).toBeDefined()
      expect(result.data?.total_points).toBe(1900) // 1000 + 800 + 100
    })

    it('should assign ranks by total points descending (FR-019)', async () => {
      // Create 3 climbers with different scores
      const climber1 = await db.createClimber({ name: 'Climber 1', class: '6a' })
      const climber2 = await db.createClimber({ name: 'Climber 2', class: '6a' })
      const climber3 = await db.createClimber({ name: 'Climber 3', class: '6a' })

      await db.addClimberToSession(testSessionId, climber1.data!.id)
      await db.addClimberToSession(testSessionId, climber2.data!.id)
      await db.addClimberToSession(testSessionId, climber3.data!.id)

      // Climber 1: 3000 points (rank 1)
      await db.createAttempt({
        session_id: testSessionId,
        climber_id: climber1.data!.id,
        climb_number: 1,
        grade: '7a',
        status: 'flash',
        points: 3000,
      })

      // Climber 2: 1500 points (rank 3)
      await db.createAttempt({
        session_id: testSessionId,
        climber_id: climber2.data!.id,
        climb_number: 1,
        grade: '6a',
        status: 'flash',
        points: 1500,
      })

      // Climber 3: 2000 points (rank 2)
      await db.createAttempt({
        session_id: testSessionId,
        climber_id: climber3.data!.id,
        climb_number: 1,
        grade: '6b',
        status: 'flash',
        points: 2000,
      })

      // Calculate scores
      const score1 = await db.calculateClimberScore(testSessionId, climber1.data!.id)
      const score2 = await db.calculateClimberScore(testSessionId, climber2.data!.id)
      const score3 = await db.calculateClimberScore(testSessionId, climber3.data!.id)

      expect(score1.data?.rank).toBe(1)
      expect(score2.data?.rank).toBe(3)
      expect(score3.data?.rank).toBe(2)
    })

    it('should handle ties by sharing rank with gap (FR-020)', async () => {
      const climber1 = await db.createClimber({ name: 'Tie Climber 1', class: '6a' })
      const climber2 = await db.createClimber({ name: 'Tie Climber 2', class: '6a' })
      const climber3 = await db.createClimber({ name: 'Tie Climber 3', class: '6a' })

      await db.addClimberToSession(testSessionId, climber1.data!.id)
      await db.addClimberToSession(testSessionId, climber2.data!.id)
      await db.addClimberToSession(testSessionId, climber3.data!.id)

      // Both climber1 and climber2 get 2000 points (tied for rank 1)
      await db.createAttempt({
        session_id: testSessionId,
        climber_id: climber1.data!.id,
        climb_number: 1,
        grade: '6a',
        status: 'flash',
        points: 2000,
      })

      await db.createAttempt({
        session_id: testSessionId,
        climber_id: climber2.data!.id,
        climb_number: 1,
        grade: '6a',
        status: 'flash',
        points: 2000,
      })

      // Climber3 gets 1000 points (rank 3, not 2 - gap after tie)
      await db.createAttempt({
        session_id: testSessionId,
        climber_id: climber3.data!.id,
        climb_number: 1,
        grade: '6a',
        status: 'flash',
        points: 1000,
      })

      const score1 = await db.calculateClimberScore(testSessionId, climber1.data!.id)
      const score2 = await db.calculateClimberScore(testSessionId, climber2.data!.id)
      const score3 = await db.calculateClimberScore(testSessionId, climber3.data!.id)

      // Both should have rank 1
      expect(score1.data?.rank).toBe(1)
      expect(score2.data?.rank).toBe(1)

      // Next rank should be 3 (gap after tie)
      expect(score3.data?.rank).toBe(3)
    })

    it('should hide climbers with 0 points from leaderboard (FR-021)', async () => {
      const climberWithPoints = await db.createClimber({ name: 'Has Points', class: '6a' })
      const climberNoPoints = await db.createClimber({ name: 'No Points', class: '6a' })

      await db.addClimberToSession(testSessionId, climberWithPoints.data!.id)
      await db.addClimberToSession(testSessionId, climberNoPoints.data!.id)

      // Only climberWithPoints gets attempts
      await db.createAttempt({
        session_id: testSessionId,
        climber_id: climberWithPoints.data!.id,
        climb_number: 1,
        grade: '6a',
        status: 'flash',
        points: 1000,
      })

      // Calculate scores
      const scoreWithPoints = await db.calculateClimberScore(
        testSessionId,
        climberWithPoints.data!.id
      )
      const scoreNoPoints = await db.calculateClimberScore(testSessionId, climberNoPoints.data!.id)

      // Climber with points should have rank
      expect(scoreWithPoints.data?.rank).toBe(1)
      expect(scoreWithPoints.data?.total_points).toBe(1000)

      // Climber without points should have null rank (hidden)
      expect(scoreNoPoints.data?.rank).toBeNull()
      expect(scoreNoPoints.data?.total_points).toBe(0)
    })

    it('should retroactively recalculate scores when scoring config changes (FR-032)', async () => {
      // Create attempt with initial points
      await db.createAttempt({
        session_id: testSessionId,
        climber_id: testClimberId,
        climb_number: 1,
        grade: '6a',
        status: 'flash',
        points: 1000,
      })

      const initialScore = await db.calculateClimberScore(testSessionId, testClimberId)
      expect(initialScore.data?.total_points).toBe(1000)

      // Update the attempt with new points (simulating scoring config change)
      const attempts = await db.getClimberAttempts(testSessionId, testClimberId)
      const attemptId = attempts.data![0].id

      await db.updateAttempt(attemptId, {
        points: 1500, // New scoring config
      })

      // Recalculate - should reflect new points
      const updatedScore = await db.calculateClimberScore(testSessionId, testClimberId)
      expect(updatedScore.data?.total_points).toBe(1500)
    })
  })

  describe('Timestamps', () => {
    it('should automatically set created_at and updated_at on creation', async () => {
      const before = new Date()

      const created = await db.createAttempt({
        session_id: testSessionId,
        climber_id: testClimberId,
        climb_number: 1,
        grade: '6a',
        status: 'flash',
        points: 1000,
      })

      const after = new Date()

      expect(created.data?.created_at).toBeDefined()
      expect(created.data?.updated_at).toBeDefined()

      const createdAt = new Date(created.data!.created_at)
      expect(createdAt.getTime()).toBeGreaterThanOrEqual(before.getTime())
      expect(createdAt.getTime()).toBeLessThanOrEqual(after.getTime())
    })

    it('should update updated_at on modification (for conflict resolution FR-029)', async () => {
      const created = await db.createAttempt({
        session_id: testSessionId,
        climber_id: testClimberId,
        climb_number: 1,
        grade: '6a',
        status: 'fail',
        points: 100,
      })

      const originalUpdatedAt = created.data!.updated_at

      // Wait a bit to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 10))

      const updated = await db.updateAttempt(created.data!.id, {
        status: 'flash',
        points: 1000,
      })

      expect(updated.data?.updated_at).toBeDefined()
      expect(new Date(updated.data!.updated_at).getTime()).toBeGreaterThan(
        new Date(originalUpdatedAt).getTime()
      )
    })
  })

  describe('Cascade Deletion', () => {
    it('should cascade delete attempts when session is deleted', async () => {
      await db.createAttempt({
        session_id: testSessionId,
        climber_id: testClimberId,
        climb_number: 1,
        grade: '6a',
        status: 'flash',
        points: 1000,
      })

      const attemptsBefore = await db.getSessionAttempts(testSessionId)
      expect(attemptsBefore.data?.length).toBeGreaterThan(0)

      // Delete session
      await db.deleteSession(testSessionId)

      // Attempts should be gone
      const attemptsAfter = await db.getSessionAttempts(testSessionId)
      expect(attemptsAfter.data).toEqual([])
    })

    it('should cascade delete attempts when climber is deleted', async () => {
      await db.createAttempt({
        session_id: testSessionId,
        climber_id: testClimberId,
        climb_number: 1,
        grade: '6a',
        status: 'flash',
        points: 1000,
      })

      const attemptsBefore = await db.getClimberAttempts(testSessionId, testClimberId)
      expect(attemptsBefore.data?.length).toBeGreaterThan(0)

      // Delete climber
      await db.deleteClimber(testClimberId)

      // Climber's attempts should be gone
      const attemptsAfter = await db.getClimberAttempts(testSessionId, testClimberId)
      expect(attemptsAfter.data).toEqual([])
    })
  })
})
