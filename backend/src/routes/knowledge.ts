// backend/src/routes/knowledge.ts
import { Router } from 'express';
import { authGuard } from '../middleware/authGuard';
import { upload } from '../services/upload';
import { listKnowledge, uploadToKnowledge, addLinkToKnowledge, deleteKnowledge, getKnowledgeItem } from '../controllers/knowledgeController';

const router = Router();
router.use(authGuard);

router.get('/', listKnowledge);
router.get('/:id', getKnowledgeItem);
router.post('/upload', upload.single('file'), uploadToKnowledge);
router.post('/link', addLinkToKnowledge);
router.delete('/:id', deleteKnowledge);

export default router;
