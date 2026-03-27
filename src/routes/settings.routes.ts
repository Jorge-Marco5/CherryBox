import { Router } from "express";
import { getStorage, setSettings, getLogs, getErrorLogs } from "../controllers/settings.controller";
import { requireAuth, requireAdmin } from "../middlewares/auth.middleware";

const router = Router();

router.get('/getStorage', requireAuth, getStorage);

router.post('/setSettings', requireAuth, setSettings);

router.get('/getLogs', requireAuth, requireAdmin, getLogs);

router.get('/getErrorLogs', requireAuth, requireAdmin, getErrorLogs);

export default router;