// server/controllers/admin-controller.ts
import { Request, Response, NextFunction } from 'express'
import storage from '../storage'    // or wherever you export your MongoDBStorage instance

/**
 * POST /api/admin/students
 */
export const createStudent = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      name,
      phone,
      address,
      dob,
      pathway,
      courseSlug,
      validUntil,
    } = req.body

    const student = await storage.createStudent({
      name,
      phone,
      address,
      dob,
      pathway,
      courseSlug,
      validUntil: new Date(validUntil),
    })

    res.status(201).json(student)
  } catch (err) {
    next(err)
  }
}

/**
 * GET /api/admin/students
 */
export const listStudents = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const students = await storage.getAllStudents()
    res.json(students)
  } catch (err) {
    next(err)
  }
}

/**
 * GET /api/admin/students/:id
 */
export const getStudent = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const student = await storage.getStudent(req.params.id)
    if (!student) return res.status(404).json({ message: 'Student not found' })
    res.json(student)
  } catch (err) {
    next(err)
  }
}

/**
 * PUT /api/admin/students/:id
 */
export const updateStudent = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const updated = await storage.updateStudent(req.params.id, req.body)
    res.json(updated)
  } catch (err) {
    next(err)
  }
}

/**
 * DELETE /api/admin/students/:id
 */
export const deleteStudent = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await storage.deleteStudent(req.params.id)
    res.status(204).end()
  } catch (err) {
    next(err)
  }
}

/**
 * POST /api/admin/live-classes
 */
export const scheduleLiveClass = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      courseSlug,
      teacherId,
      studentIds,
      startsAt,
      durationMin,
    } = req.body

    const liveClass = await storage.createLiveClass({
      courseSlug,
      teacherId,
      studentIds,
      startsAt: new Date(startsAt),
      durationMin,
    })

    res.status(201).json(liveClass)
  } catch (err) {
    next(err)
  }
}

/**
 * GET /api/admin/live-classes
 */
export const listLiveClasses = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const classes = await storage.getLiveClasses()
    res.json(classes)
  } catch (err) {
    next(err)
  }
}