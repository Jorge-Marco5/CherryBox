import { Router } from "express"
import {
    registerHandler,
    loginHandler,
    logoutHandler
} from "../controllers/auth.controller"
import { requireAuth, requireAdmin } from "../middlewares/auth.middleware"
import { validate } from "../utils/validator"
import { registerSchema, loginSchema } from "../utils/user.validator"

const router = Router()

router.post("/register", validate(registerSchema), requireAuth, requireAdmin, registerHandler)
router.post("/login", validate(loginSchema), loginHandler)
router.post("/logout", requireAuth, logoutHandler)

//cambios de contraseña
/**
 * router.post("/change-password", requireAuth, changePasswordHandler)
 * router.post("/forgot-password", requireAuth, forgotPasswordHandler)
 * router.post("/reset-password", requireAuth, resetPasswordHandler)
 */

export default router