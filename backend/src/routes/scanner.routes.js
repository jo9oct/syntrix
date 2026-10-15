// STATUS: CREATED

import { Router } from "express";

import { getScanners } from "../controllers/scanner.controller.js";

const router = Router();

router.get("/", getScanners);

export default router;
