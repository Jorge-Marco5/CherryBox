import { Router } from "express";
import { requireAuth, requireAdmin } from "../middlewares/auth.middleware";
import { getUsersHandler, deleteUserHandler, updateUserHandler, blockUserHandler, changeRoleHandler } from "../controllers/users.controller";
import { registerHandler } from "../controllers/auth.controller";

const router = Router();

router.get("/users", requireAuth, requireAdmin, getUsersHandler);
router.post("/users", requireAuth, requireAdmin, registerHandler);
router.delete("/users/:id", requireAuth, requireAdmin, deleteUserHandler);
router.put("/users/:id", requireAuth, requireAdmin, updateUserHandler);
router.patch("/users/:id/block", requireAuth, requireAdmin, blockUserHandler);
router.patch("/users/:id/role", requireAuth, requireAdmin, changeRoleHandler);

export default router;