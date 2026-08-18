import { Router } from "express";
import { AtdController } from "./atd.controller.js";

const router = Router();

router.get("/beds", AtdController.listBeds);
router.post("/beds", AtdController.addBed);
router.delete("/beds/:bedNo", AtdController.deleteBed);
router.post("/beds/admit", AtdController.admitPatient);
router.post("/beds/transfer", AtdController.transferPatient);
router.post("/beds/discharge-initiate", AtdController.initiateDischarge);
router.post("/beds/discharge-complete", AtdController.completeDischarge);
router.post("/beds/status-update", AtdController.updateBedStatus);

export default router;
