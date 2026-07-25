import dotenv from "dotenv";
dotenv.config();

import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import path from "path";
import { errorHandler } from "./middlewares/error.middleware";
import authRouter from "./routes/auth.routes";
import filesRouter from "./routes/files.routes";
import indexRouter from "./routes/index";
import permissionsRouter from "./routes/permissions.routes";
import settingsRouter from "./routes/settings.routes";
import usersRouter from "./routes/users.routes";
import { init_basedir } from "./utils/settings";

const app = express();
const PORT = process.env.PORT;
const FRONTEND_URL = process.env.FRONTEND_URL;
const NODE_ENV = process.env.NODE_ENV;
app.use(cookieParser());

app.set("views", path.join(__dirname, "views"));

app.use("/public", express.static(path.join(__dirname, "../public")));
//aplicar favicon para todas las paginas, en todas las rutas, incluida la API
app.use((req, res, next) => {
  if (req.url.startsWith("/api")) {
    res.setHeader("favicon", "/favicon.ico");
  }
  next();
});

// Middleware
app.use(
  cors({
    origin: NODE_ENV === "development" ? "*" : FRONTEND_URL,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "ngrok-skip-browser-warning"],
  }),
);
app.use(express.json());
// Inicialización del servidor y carpetas
Promise.all([init_basedir]).then(() => {
  // Rutas
  NODE_ENV === "development" ? app.use("/", indexRouter) : null;
  app.use("/api", filesRouter);
  app.use("/api", settingsRouter);
  app.use("/api", usersRouter);
  app.use("/api/auth", authRouter);
  app.use("/api/permissions", permissionsRouter);

  // Middleware de manejo de errores global (Debe ir después de las rutas)
  app.use(errorHandler);

  app.listen(PORT, () => {
    console.log(`🍒 CherryBox page en: http://localhost:${PORT}/`);
  });
});
