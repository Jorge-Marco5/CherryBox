import { Router } from "express";
import { listFiles } from "../controllers/files.controller";
import { searchFiles } from "../controllers/files.controller";
import { createFolder } from "../controllers/files.controller";
import { uploadFiles } from "../controllers/files.controller";
import { renameFile } from "../controllers/files.controller";
import { deleteFile } from "../controllers/files.controller";
import { getFileContent } from "../controllers/files.controller";
import { downloadFile } from "../controllers/files.controller";
import { downloadMultipleFiles } from "../controllers/files.controller";
import { upload } from "../utils/multer";
import { requireAuth } from "../middlewares/auth.middleware";

import { uploadCleanupMiddleware } from "../middlewares/cleanup.middleware"
import dotenv from 'dotenv';

dotenv.config();

const MAX_FILES = (() => {
    const val = process.env.MAX_FILES || '10';
    try {
        const sanitized = val.replace(/[^0-9*+\-/\s()]/g, '');
        // eslint-disable-next-line no-new-func
        return new Function(`return ${sanitized}`)() || 10;
    } catch {
        return 10;
    }
})();

const router = Router();

router.get('/files', requireAuth, listFiles);

router.get('/search', requireAuth, searchFiles);

router.post('/folder', requireAuth, createFolder);

router.post('/upload', requireAuth, uploadCleanupMiddleware, upload.array('files', Number(MAX_FILES)), uploadFiles);

router.put('/rename', requireAuth, renameFile);

router.delete('/delete', requireAuth, deleteFile);

router.get('/file-content', requireAuth, getFileContent);

router.get('/download', requireAuth, downloadFile);

router.post('/download-multiple', requireAuth, downloadMultipleFiles);



export default router;
