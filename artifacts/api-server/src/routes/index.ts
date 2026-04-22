import { Router, type IRouter } from "express";
import healthRouter from "./health";
import storageRouter from "./storage";
import membersRouter from "./members";
import duosRouter from "./duos";
import producersRouter from "./producers";
import schedulesRouter from "./schedules";
import dashboardRouter from "./dashboard";
import authRouter from "./auth";
import settingsRouter from "./settings";
import usersAdminRouter from "./users-admin";
import dayOverridesRouter from "./dayOverrides";

const router: IRouter = Router();

router.use(healthRouter);
router.use(storageRouter);
router.use(authRouter);
router.use(settingsRouter);
router.use(usersAdminRouter);
router.use(membersRouter);
router.use(duosRouter);
router.use(producersRouter);
router.use(schedulesRouter);
router.use(dayOverridesRouter);
router.use(dashboardRouter);

export default router;
