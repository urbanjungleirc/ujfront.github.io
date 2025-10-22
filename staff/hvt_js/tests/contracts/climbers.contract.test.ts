/**
 * Contract Tests for Climbers API
 *
 * These tests verify that our implementation matches the OpenAPI spec
 * defined in specs/001-project-description-md/contracts/class-lists.openapi.yaml
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
  // Clean up all climbers before each test
  const climbers = await db.getClimbers()
  if (climbers.data) {
    for (const climber of climbers.data) {
      // Skip seed data climbers (they have fixed UUIDs)
      if (!climber.id.startsWith('11111111') && !climber.id.startsWith('22222222') &&
          !climber.id.startsWith('33333333') && !climber.id.startsWith('44444444') &&
          !climber.id.startsWith('55555555')) {
        await db.deleteClimber(climber.id)
      }
    }
  }
})

afterAll(async () => {
  // Final cleanup
  const climbers = await db.getClimbers()
  if (climbers.data) {
    for (const climber of climbers.data) {
      if (!climber.id.startsWith('11111111') && !climber.id.startsWith('22222222') &&
          !climber.id.startsWith('33333333') && !climber.id.startsWith('44444444') &&
          !climber.id.startsWith('55555555')) {
        await db.deleteClimber(climber.id)
      }
    }
  }
})

describe('Climbers API Contract Tests', () => {
  describe('GET /climbers - listClimbers', () => {
    it('should return an array of climbers', async () => {
      const result = await db.getClimbers()

      expect(result.error).toBeNull()
      expect(result.data).toBeInstanceOf(Array)
    })

    it('should return climbers with all required fields per schema', async () => {
      const result = await db.getClimbers()

      expect(result.data).toBeDefined()
      if (result.data && result.data.length > 0) {
        const climber = result.data[0]

        // Required fields from OpenAPI schema
        expect(climber).toHaveProperty('id')
        expect(climber).toHaveProperty('name')
        expect(climber).toHaveProperty('class')
        expect(climber).toHaveProperty('created_at')
        expect(climber).toHaveProperty('updated_at')

        // Validate types
        expect(typeof climber.id).toBe('string')
        expect(typeof climber.name).toBe('string')
        expect(typeof climber.class).toBe('string')
      }
    })
  })

  describe('GET /climbers (filter by class) - getClimbersByClass', () => {
    it('should filter climbers by class', async () => {
      // Create climbers in different classes
      await db.createClimber({
        name: 'Alice Class 6a',
        class: '6a',
      })

      await db.createClimber({
        name: 'Bob Class 7a',
        class: '7a',
      })

      // Filter by class
      const result = await db.getClimbersByClass('6a')

      expect(result.error).toBeNull()
      expect(result.data).toBeDefined()

      if (result.data) {
        expect(result.data.every(c => c.class === '6a')).toBe(true)
        expect(result.data.some(c => c.name === 'Alice Class 6a')).toBe(true)
        expect(result.data.some(c => c.name === 'Bob Class 7a')).toBe(false)
      }
    })

    it('should return empty array for class with no climbers', async () => {
      const result = await db.getClimbersByClass('8c')

      expect(result.error).toBeNull()
      expect(result.data).toEqual([])
    })
  })

  describe('POST /climbers - createClimber', () => {
    it('should create a new climber with valid data', async () => {
      const newClimber = {
        name: 'Test Climber 001',
        class: '6b',
      }

      const result = await db.createClimber(newClimber)

      expect(result.error).toBeNull()
      expect(result.data).toBeDefined()
      expect(result.data?.name).toBe(newClimber.name)
      expect(result.data?.class).toBe(newClimber.class)
      expect(result.data?.id).toBeDefined()
    })

    it('should enforce unique climber names', async () => {
      const climberData = {
        name: 'Unique Name Test',
        class: '6a',
      }

      // Create first climber
      const first = await db.createClimber(climberData)
      expect(first.error).toBeNull()

      // Try to create duplicate - should fail
      const duplicate = await db.createClimber(climberData)

      expect(duplicate.error).toBeDefined()
      expect(duplicate.error?.message).toMatch(/unique|already exists/i)
    })

    it('should validate required fields', async () => {
      // @ts-expect-error - testing invalid input
      const result = await db.createClimber({
        // Missing required 'class' field
        name: 'Incomplete Climber',
      })

      expect(result.error).toBeDefined()
    })

    it('should validate climber class is from valid class list', async () => {
      // Get valid classes first
      const classList = await db.getClassLists()

      const invalidClass = await db.createClimber({
        name: 'Invalid Class Climber',
        class: 'INVALID_CLASS_999',
      })

      expect(invalidClass.error).toBeDefined()
    })

    it('should enforce name length constraints (1-100 chars)', async () => {
      const emptyName = await db.createClimber({
        name: '',
        class: '6a',
      })
      expect(emptyName.error).toBeDefined()

      const tooLongName = await db.createClimber({
        name: 'x'.repeat(101),
        class: '6a',
      })
      expect(tooLongName.error).toBeDefined()
    })
  })

  describe('GET /climbers/{id} - getClimber', () => {
    it('should return climber by ID', async () => {
      const created = await db.createClimber({
        name: 'Get Climber Test',
        class: '7a',
      })

      expect(created.data?.id).toBeDefined()
      const climberId = created.data!.id

      const result = await db.getClimber(climberId)

      expect(result.error).toBeNull()
      expect(result.data).toBeDefined()
      expect(result.data?.id).toBe(climberId)
      expect(result.data?.name).toBe('Get Climber Test')
    })

    it('should return error for non-existent climber', async () => {
      const result = await db.getClimber('00000000-0000-0000-0000-000000000000')

      expect(result.error).toBeDefined()
      expect(result.data).toBeNull()
    })
  })

  describe('PATCH /climbers/{id} - updateClimber', () => {
    it('should update climber fields', async () => {
      const created = await db.createClimber({
        name: 'Original Climber Name',
        class: '6a',
      })

      const climberId = created.data!.id

      const updated = await db.updateClimber(climberId, {
        name: 'Updated Climber Name',
        class: '7a',
      })

      expect(updated.error).toBeNull()
      expect(updated.data?.name).toBe('Updated Climber Name')
      expect(updated.data?.class).toBe('7a')
    })

    it('should return error for non-existent climber', async () => {
      const result = await db.updateClimber('00000000-0000-0000-0000-000000000000', {
        name: 'Should Fail',
      })

      expect(result.error).toBeDefined()
    })

    it('should enforce unique name on update', async () => {
      const climber1 = await db.createClimber({
        name: 'Climber One',
        class: '6a',
      })

      const climber2 = await db.createClimber({
        name: 'Climber Two',
        class: '6a',
      })

      // Try to update climber2 to have climber1's name
      const result = await db.updateClimber(climber2.data!.id, {
        name: 'Climber One',
      })

      expect(result.error).toBeDefined()
    })

    it('should validate class on update', async () => {
      const created = await db.createClimber({
        name: 'Valid Climber',
        class: '6a',
      })

      const result = await db.updateClimber(created.data!.id, {
        class: 'INVALID_CLASS',
      })

      expect(result.error).toBeDefined()
    })
  })

  describe('DELETE /climbers/{id} - deleteClimber', () => {
    it('should delete a climber', async () => {
      const created = await db.createClimber({
        name: 'Climber to Delete',
        class: '6a',
      })

      const climberId = created.data!.id

      const deleted = await db.deleteClimber(climberId)

      expect(deleted.error).toBeNull()

      // Verify it's gone
      const fetched = await db.getClimber(climberId)
      expect(fetched.data).toBeNull()
    })

    it('should return error when deleting non-existent climber', async () => {
      const result = await db.deleteClimber('00000000-0000-0000-0000-000000000000')

      expect(result.error).toBeDefined()
    })

    it('should handle cascade deletion of related session_climbers', async () => {
      // Create climber
      const climber = await db.createClimber({
        name: 'Cascade Test Climber',
        class: '6a',
      })

      // Create session
      const session = await db.createSession({
        name: 'Cascade Test Session',
        date: '2025-10-04',
        location: 'Test',
        status: 'completed' as const,
      })

      // Add climber to session
      await db.addClimberToSession(session.data!.id, climber.data!.id)

      // Delete climber - should cascade delete session_climbers
      const deleted = await db.deleteClimber(climber.data!.id)
      expect(deleted.error).toBeNull()

      // Verify session still exists but climber is removed
      const sessionClimbers = await db.getSessionClimbers(session.data!.id)
      expect(sessionClimbers.data?.some(sc => sc.climber_id === climber.data!.id)).toBe(false)
    })
  })

  describe('Timestamps', () => {
    it('should automatically set created_at and updated_at on creation', async () => {
      const before = new Date()

      const created = await db.createClimber({
        name: 'Timestamp Test Climber',
        class: '6a',
      })

      const after = new Date()

      expect(created.data?.created_at).toBeDefined()
      expect(created.data?.updated_at).toBeDefined()

      const createdAt = new Date(created.data!.created_at)
      expect(createdAt.getTime()).toBeGreaterThanOrEqual(before.getTime())
      expect(createdAt.getTime()).toBeLessThanOrEqual(after.getTime())
    })

    it('should update updated_at on modification', async () => {
      const created = await db.createClimber({
        name: 'Update Timestamp Climber',
        class: '6a',
      })

      const originalUpdatedAt = created.data!.updated_at

      // Wait a bit to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 10))

      const updated = await db.updateClimber(created.data!.id, {
        class: '7a',
      })

      expect(updated.data?.updated_at).toBeDefined()
      expect(new Date(updated.data!.updated_at).getTime()).toBeGreaterThan(
        new Date(originalUpdatedAt).getTime()
      )
    })
  })
})

describe('Class Lists API Contract Tests', () => {
  describe('GET /class_lists - listClassLists', () => {
    it('should return an array of class lists', async () => {
      const result = await db.getClassLists()

      expect(result.error).toBeNull()
      expect(result.data).toBeInstanceOf(Array)
    })

    it('should return class lists ordered by display_order', async () => {
      const result = await db.getClassLists()

      expect(result.data).toBeDefined()
      if (result.data && result.data.length > 1) {
        const orders = result.data.map(c => c.display_order)
        for (let i = 0; i < orders.length - 1; i++) {
          expect(orders[i]).toBeLessThanOrEqual(orders[i + 1])
        }
      }
    })

    it('should return class lists with all required fields', async () => {
      const result = await db.getClassLists()

      expect(result.data).toBeDefined()
      if (result.data && result.data.length > 0) {
        const classList = result.data[0]

        expect(classList).toHaveProperty('id')
        expect(classList).toHaveProperty('class_name')
        expect(classList).toHaveProperty('display_order')
        expect(classList).toHaveProperty('created_at')
        expect(classList).toHaveProperty('updated_at')

        expect(typeof classList.id).toBe('string')
        expect(typeof classList.class_name).toBe('string')
        expect(typeof classList.display_order).toBe('number')
      }
    })

    it('should include standard climbing grades (5a-8c)', async () => {
      const result = await db.getClassLists()

      expect(result.data).toBeDefined()

      const classNames = result.data?.map(c => c.class_name) || []

      // Should include common grades
      const commonGrades = ['5a', '6a', '6b', '7a', '7b', '8a']
      commonGrades.forEach(grade => {
        expect(classNames).toContain(grade)
      })
    })
  })
})
