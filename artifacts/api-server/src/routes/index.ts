import { Router, type IRouter } from "express";
import healthRouter from "./health";
import membersRouter from "./members";
import duosRouter from "./duos";
import producersRouter from "./producers";
import schedulesRouter from "./schedules";
import dashboardRouter from "./dashboard";

const router: IRouter = Router();

router.use(healthRouter);
router.use(membersRouter);
router.use(duosRouter);
router.use(producersRouter);
router.use(schedulesRouter);
router.use(dashboardRouter);

export default router;
