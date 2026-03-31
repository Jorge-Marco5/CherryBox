import { Router } from "express";
import { requireAuth } from "../middlewares/auth.middleware";
import { grantPermissionHandler, revokePermissionHandler, getFilePermissionsHandler } from "../controllers/permissions.controller";

const router = Router();

router.use(requireAuth);

router.post("/grant", grantPermissionHandler);
router.delete("/revoke/:permissionId", revokePermissionHandler);
router.get("/file/:fileId", getFilePermissionsHandler);

export default router;
