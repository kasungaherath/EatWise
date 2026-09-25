import { Router } from 'express'
import requireAuth from '../middleware/requireAuth.js'
import {
  getPreferences,
  savePreferences,
} from '../controllers/preferencesController.js'

const router = Router()

router.use(requireAuth)

router.get('/me', getPreferences)
router.put('/me', savePreferences)

export default router