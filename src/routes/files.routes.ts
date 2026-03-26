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

const router = Router();

// Endpoint: Listar archivos y carpetas
router.get('/files', requireAuth, listFiles);

// Endpoint: Buscar archivos
router.get('/search', requireAuth, searchFiles);

// Endpoint: Crear carpeta
router.post('/folder', requireAuth, createFolder);

router.post('/upload', requireAuth, upload.array('files', 20), uploadFiles);

router.put('/rename', requireAuth, renameFile);

// Endpoint: Eliminar archivo o carpeta
router.delete('/delete', requireAuth, deleteFile);

// Endpoint: Obtener contenido de archivo
router.get('/file-content', requireAuth, getFileContent);

// Endpoint: Descargar archivo
router.get('/download', requireAuth, downloadFile);

export default router;
