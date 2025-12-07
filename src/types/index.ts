import { Request } from 'express'
import { UserRole, ProjectStatus, TaskStatus, TaskPriority } from '../../generated/prisma/enums.js'

export interface AuthRequest extends Request {
  user?: {
    id: string
    email: string
    role: UserRole
    name: string
  }
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface RegisterData {
  email: string
  password: string
  name: string
  role?: UserRole
  department?: string
  skills?: string[]
}

export interface TokenPayload {
  id: string
  email: string
  role: UserRole
}

export interface CreateProjectData {
  title: string
  client: string
  description?: string
  startDate: string | Date
  endDate: string | Date
  budget?: number
  status?: ProjectStatus
  thumbnail?: string
  managerId?: string
}

export interface UpdateProjectData extends Partial<CreateProjectData> {
  id: string
}

export interface CreateSprintData {
  title: string
  startDate: string | Date
  endDate: string | Date
  description?: string
  projectId: string
}

export interface UpdateSprintData extends Partial<CreateSprintData> {
  id: string
}

export interface CreateTaskData {
  title: string
  description?: string
  estimate?: number
  priority?: TaskPriority
  status?: TaskStatus
  dueDate?: string | Date
  sprintId: string
  assigneeIds?: string[]
  parentTaskId?: string
}

export interface UpdateTaskData extends Partial<CreateTaskData> {
  id: string
}

export interface TaskFilters {
  projectId?: string
  sprintId?: string
  assigneeId?: string
  status?: TaskStatus
  priority?: TaskPriority
  search?: string
}

export interface CreateCommentData {
  content: string
  taskId: string
  parentId?: string
}

export interface CreateTimeLogData {
  hours: number
  description?: string
  date: string | Date
  taskId: string
}

export interface CreateUserData {
  email: string
  password?: string
  name: string
  role: UserRole
  department?: string
  skills?: string[]
}

export interface UpdateUserData extends Partial<CreateUserData> {
  id?: string
  isActive?: boolean
  avatar?: string
}

export interface ProjectProgress {
  projectId: string
  totalTasks: number
  completedTasks: number
  inProgressTasks: number
  progressPercentage: number
  timeLogged: number
  tasksRemaining: number
}

export interface UserTimeSummary {
  userId: string
  totalHours: number
  tasksWorked: number
  projects: Array<{
    projectId: string
    hours: number
  }>
}

export interface ApiResponse<T = any> {
  success: boolean
  message?: string
  data?: T
  error?: string | Array<{ path: string; message: string }>
  requiresActivation?: boolean
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

