import { Router } from 'express'
import requireAuth from '../middleware/requireAuth.js'
import { getEnergyEstimate } from '../controllers/nutritionController.js'

const router = Router()

router.use(requireAuth)

router.get('/me', getEnergyEstimate)

export default router