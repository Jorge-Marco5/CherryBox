import { Router } from "express";
import {
  createFolder,
  deleteFile,
  downloadFile,
  downloadMultipleFiles,
  getFileContent,
  getFormatsAvailablesController,
  listFiles,
  manualSync,
  renameFile,
  createShareLink,
  getSharedFile,
  searchFiles,
  uploadFiles,
} from "../controllers/files.controller";
import { requireAuth, requireSuperAdmin } from "../middlewares/auth.middleware";
import { upload } from "../utils/multer";

import { uploadCleanupMiddleware } from "../middlewares/cleanup.middleware";
import { checkStorageLimit, checkUploadPermission } from "../middlewares/storage.middleware";
import { system_setting } from '../config/config'



const router = Router();

router.get("/health", (req, res) => {
  res.json({ service: "CherryBox", version: "1.0.0", status: "OK", timeStamp: new Date().toISOString() });
});

router.get("/files", requireAuth, listFiles);

router.get("/search", requireAuth, searchFiles);

router.post("/folder", requireAuth, createFolder);

router.post(
  "/upload",
  requireAuth,
  checkUploadPermission,
  checkStorageLimit,
  uploadCleanupMiddleware,
  upload.array("files"),
  uploadFiles,
);

router.put("/rename", requireAuth, renameFile);

router.post("/share", requireAuth, createShareLink);

router.get("/shared/:token_shared", getSharedFile);

router.delete("/delete", requireAuth, deleteFile);

router.get("/formats", requireAuth, getFormatsAvailablesController);

router.get("/file-content", requireAuth, getFileContent);

router.get("/download", requireAuth, downloadFile);

router.post("/download-multiple", requireAuth, downloadMultipleFiles);

router.post("/sync", requireAuth, requireSuperAdmin, manualSync);

export default router;
