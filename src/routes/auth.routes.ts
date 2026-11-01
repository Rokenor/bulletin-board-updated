import { Router } from "express";
import {
  register,
  login,
  refresh,
  logout,
  me,
} from "../controllers/auth.controller.ts";
import authenticate from "../middleware/authenticate.ts";
import { validateBody } from "../middleware/validate.ts";
import {
  RegisterSchema,
  LoginSchema,
  RefreshSchema,
} from "../validators/auth.validator.ts";

const router = Router();

router.post("/register", validateBody(RegisterSchema), register);
router.post("/login", validateBody(LoginSchema), login);
router.post("/refresh", validateBody(RefreshSchema), refresh);
router.post("/logout", authenticate, logout);
router.get("/me", authenticate, me);

export default router;
