import { Router } from 'express';
import { searchMovies } from '../controllers/movies.controller';

const router = Router();

// GET /api/movies/search?q=... — search movies by title
router.get('/search', searchMovies);

export default router;
