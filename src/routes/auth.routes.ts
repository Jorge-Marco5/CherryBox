import { Router } from "express"
import {
    registerHandler,
    loginHandler,
    logoutHandler
} from "../controllers/auth.controller"
import { requireAuth, requireAdmin } from "../middlewares/auth.middleware"

const router = Router()

router.post("/register", requireAuth, requireAdmin, registerHandler)
router.post("/login", loginHandler)
router.post("/logout", requireAuth, logoutHandler)

export default router