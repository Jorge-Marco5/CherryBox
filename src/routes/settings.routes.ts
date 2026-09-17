import { Router } from "express";
import { getStorage, getSettings, setSettings, getLogs, getErrorLogs, analyzeFiles } from "../controllers/settings.controller";
import { manualSync } from "../controllers/files.controller";
import { requireAuth, requireAdmin, requireSuperAdmin } from "../middlewares/auth.middleware";

const router = Router();

router.get('/getStorage', requireAuth, requireAdmin, getStorage);
router.get('/getSettings', requireAuth, requireAdmin, getSettings);
router.get('/getLogs', requireAuth, requireAdmin, getLogs);
router.get('/getErrorLogs', requireAuth, requireAdmin, getErrorLogs);

// Rutas críticas que requieren SuperAdmin
router.post('/setSettings', requireAuth, requireSuperAdmin, setSettings);
router.get('/syncFiles', requireAuth, requireSuperAdmin, manualSync);
router.post('/analyzeFiles', requireAuth, requireSuperAdmin, analyzeFiles);

export default router;