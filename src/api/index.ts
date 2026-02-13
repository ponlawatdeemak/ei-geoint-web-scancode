import 'reflect-metadata'
import um from '@/api/um'
import projects from '@/api/projects'
import tasks from '@/api/tasks'
import image from '@/api/image'
import optical from '@/api/optical'
import auth from '@/api/auth'
import lookup from '@/api/lookup'
import users from '@/api/users'
import organizations from '@/api/organizations'
import subscriptions from '@/api/subscriptions'
import apiKeys from '@/api/api-keys'
import thaicom from '@/api/thaicom'
import weekly from '@/api/weekly'
import importToVisualize from '@/api/import-to-visualize'
import dataManagement from '@/api/data-management'
import apiKey from './api-key'

const service = {
  um,
  projects,
  tasks,
  image,
  optical,
  auth,
  lookup,
  users,
  organizations,
  subscriptions,
  apiKeys,
  thaicom,
  weekly,
  importToVisualize,
  dataManagement,
  apiKey,
}

export default service
