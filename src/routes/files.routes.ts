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
  searchFiles,
  uploadFiles,
} from "../controllers/files.controller";
import { requireAuth, requireSuperAdmin } from "../middlewares/auth.middleware";
import { upload } from "../utils/multer";

import { uploadCleanupMiddleware } from "../middlewares/cleanup.middleware";
import { checkStorageLimit, checkUploadPermission } from "../middlewares/storage.middleware";

import dotenv from "dotenv";

dotenv.config();

const MAX_FILES = (() => {
  const val = process.env.MAX_FILES || "10";
  try {
    const sanitized = val.replace(/[^0-9*+\-/\s()]/g, "");
    // eslint-disable-next-line no-new-func
    return new Function(`return ${sanitized}`)() || 10;
  } catch {
    return 10;
  }
})();

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
  upload.array("files", Number(MAX_FILES)),
  uploadFiles,
);

router.put("/rename", requireAuth, renameFile);

router.delete("/delete", requireAuth, deleteFile);

router.get("/formats", requireAuth, requireSuperAdmin, getFormatsAvailablesController);

router.get("/file-content", requireAuth, getFileContent);

router.get("/download", requireAuth, downloadFile);

router.post("/download-multiple", requireAuth, downloadMultipleFiles);

router.post("/sync", requireAuth, requireSuperAdmin, manualSync);

export default router;
