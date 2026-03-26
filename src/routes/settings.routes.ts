import { Router } from "express";
import { getStorage, setSettings } from "../controllers/settings.controller";
import { requireAuth } from "../middlewares/auth.middleware";

const router = Router();

router.get('/getStorage', requireAuth, getStorage);

router.post('/setSettings', requireAuth, setSettings);

export default router;