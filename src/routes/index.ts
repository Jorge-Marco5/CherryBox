import { Router } from "express";
import { dashboard } from "../controllers/files.controller";

//vista dashboard
const router = Router();
router.get('/', dashboard);

//vista login
router.get('/login', (req, res) => {
    res.render('login');
});

//vista register
router.get('/register', (req, res) => {
    res.render('register');
});

//vista error 404
router.get('/error', (req, res) => {
    res.render('error');
});

export default router;
