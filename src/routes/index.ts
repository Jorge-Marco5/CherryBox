import { Router } from "express";
import path from "path";
import { dashboard } from "../controllers/files.controller";
import { requireAdminView, requireAuthView } from "../middlewares/auth.middleware";

//vista dashboard
const router = Router();
router.get("/", requireAuthView, dashboard);

//vista login
router.get("/login", (req, res) => {
  res.sendFile(path.join(__dirname, "../views/login.html"));
});

//vista register
router.get("/register", (req, res) => {
  res.sendFile(path.join(__dirname, "../views/register.html"));
});

//vista error 404
router.get("/error", (req, res) => {
  res.sendFile(path.join(__dirname, "../views/error.html"));
});

router.get("/logs", requireAuthView, requireAdminView, (req, res) => {
  res.sendFile(path.join(__dirname, "../views/logs.html"));
});

router.get("/users", requireAuthView, requireAdminView, (req, res) => {
  res.sendFile(path.join(__dirname, "../views/users.html"));
});

router.get("/settings", requireAuthView, requireAdminView, (req, res) => {
  res.sendFile(path.join(__dirname, "../views/settings.html"));
});

export default router;
