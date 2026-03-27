import { Router } from "express";
import { dashboard } from "../controllers/files.controller";
import path from "path";

//vista dashboard
const router = Router();
router.get('/', dashboard);

//vista login
router.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, '../views/login.html'));
});

//vista register
router.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, '../views/register.html'));
});

//vista error 404
router.get('/error', (req, res) => {
    res.sendFile(path.join(__dirname, '../views/error.html'));
});

router.get('/logs', (req, res) => {
    res.sendFile(path.join(__dirname, '../views/logs.html'));
});

router.get('/users', (req, res) => {
    res.sendFile(path.join(__dirname, '../views/users.html'));
});

export default router;
