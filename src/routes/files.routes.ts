import { Router } from "express";
import { listFiles } from "../controllers/files.controller";
import { searchFiles } from "../controllers/files.controller";
import { createFolder } from "../controllers/files.controller";
import { uploadFiles } from "../controllers/files.controller";
import { renameFile } from "../controllers/files.controller";
import { deleteFile } from "../controllers/files.controller";
import { getFileContent } from "../controllers/files.controller";
import { downloadFile } from "../controllers/files.controller";
import { upload } from "../utils/multer";
import { requireAuth } from "../middlewares/auth.middleware";

import { uploadCleanupMiddleware } from "../middlewares/cleanup.middleware";

const router = Router();

router.get('/files', requireAuth, listFiles);

router.get('/search', requireAuth, searchFiles);

router.post('/folder', requireAuth, createFolder);

router.post('/upload', requireAuth, uploadCleanupMiddleware, upload.array('files', 10), uploadFiles);

router.put('/rename', requireAuth, renameFile);

router.delete('/delete', requireAuth, deleteFile);

router.get('/file-content', requireAuth, getFileContent);

router.get('/download', requireAuth, downloadFile);



export default router;
