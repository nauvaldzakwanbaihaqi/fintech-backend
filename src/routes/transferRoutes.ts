import { Router } from 'express';
import { validateIdempotencyKey } from '../middlewares/validateHeader';
import { handleTransfer } from '../controllers/transferController';

const router = Router();

router.post('/transfer', validateIdempotencyKey, handleTransfer);

export default router;