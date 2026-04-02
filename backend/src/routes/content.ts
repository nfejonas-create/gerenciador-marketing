import { Router } from 'express';
import { authGuard } from '../middleware/authGuard';
import { generatePost, analyzeContent, generateCalendar, getPosts, savePost } from '../controllers/contentController';
import { uploadMaterial } from '../controllers/uploadController';
import { upload } from '../services/upload';
import { publishPost } from '../controllers/publishController';

const router = Router();
router.use(authGuard);
router.post('/generate', generatePost);
router.post('/analyze', analyzeContent);
router.post('/calendar', generateCalendar);
router.post('/upload-material', upload.single('file'), uploadMaterial);
router.get('/posts', getPosts);
router.post('/posts', savePost);
router.post('/publish', publishPost);
export default router;
