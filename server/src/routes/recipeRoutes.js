import { Router } from 'express'
import requireAuth from '../middleware/requireAuth.js'
import { listRecipes } from '../controllers/recipeController.js'

const router = Router()

router.use(requireAuth)
router.get('/', listRecipes)

export default router