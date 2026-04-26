import { Router } from 'express';
import { authGuard } from '../middleware/authGuard';
import { generatePost, analyzeContent, generateCalendar, getPosts, savePost, savePostsBatch, updatePost, deletePost, uploadAndGeneratePosts, scheduleBatch, generateWeeklyPosts } from '../controllers/contentController';
import { generateCarousel, saveCarousel, listCarousels, updateCarousel, deleteCarousel, publishCarousel, downloadCarouselPdf } from '../controllers/carouselController';
import { generatePostImage, generateImageOptions } from '../controllers/imageController';
import { upload } from '../services/upload';
import { publishPost } from '../controllers/publishController';

const router = Router();
router.use(authGuard);

// Posts existentes
router.post('/generate', generatePost);
router.post('/generate-week', generateWeeklyPosts);
router.post('/analyze', analyzeContent);
router.post('/calendar', generateCalendar);
router.post('/upload-material', upload.single('file'), uploadAndGeneratePosts);
router.post('/generate-image', generatePostImage);
router.post('/generate-image-options', generateImageOptions);
router.get('/posts', getPosts);
router.post('/posts', savePost);
router.post('/posts/batch', savePostsBatch);
router.patch('/posts/:id', updatePost);
router.delete('/posts/:id', deletePost);
router.post('/posts/schedule-batch', scheduleBatch);
router.post('/publish', publishPost);

// Carrossel (novo)
router.post('/generate-carousel', generateCarousel);
router.get('/carousels', listCarousels);
router.post('/carousels', saveCarousel);
router.patch('/carousels/:id', updateCarousel);
router.delete('/carousels/:id', deleteCarousel);
router.post('/carousels/:id/publish', publishCarousel);
router.get('/carousels/:id/pdf', downloadCarouselPdf);

export default router;
