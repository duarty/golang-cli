import { Router } from 'express';
import { MonsterExtendedController } from '../controllers/monster.extended.controller';

const router = Router();
router.get('/', MonsterExtendedController.list);

export default router;
