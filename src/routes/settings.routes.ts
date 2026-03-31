import { Router } from "express";
import { getStorage, getSettings, setSettings, getLogs, getErrorLogs, syncFiles, analyzeFiles } from "../controllers/settings.controller";
import { requireAuth, requireAdmin, requireSuperAdmin } from "../middlewares/auth.middleware";

const router = Router();

router.get('/getStorage', requireAuth, requireAdmin, getStorage);
router.get('/getSettings', requireAuth, requireAdmin, getSettings);
router.get('/getLogs', requireAuth, requireAdmin, getLogs);
router.get('/getErrorLogs', requireAuth, requireAdmin, getErrorLogs);

// Rutas críticas que requieren SuperAdmin
router.post('/setSettings', requireAuth, requireSuperAdmin, setSettings);
router.post('/syncFiles', requireAuth, requireSuperAdmin, syncFiles);
router.post('/analyzeFiles', requireAuth, requireSuperAdmin, analyzeFiles);

export default router;