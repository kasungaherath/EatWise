import { Router } from 'express'
import requireAuth from '../middleware/requireAuth.js'
import {
  getProfile,
  saveProfile,
} from '../controllers/profileController.js'

const router = Router()

router.use(requireAuth)

router.get('/me', getProfile)
router.put('/me', saveProfile)

export default router