import { Hono } from 'hono';
import { corsMiddleware } from './middlewares/cors';
import { handleProfileIngestion } from './handlers/profileIngestion';
import { handleSearch } from './handlers/search';
import { attachGlobalMiddlewares } from './middlewares/globals';

const app = new Hono<{ Bindings: Cloudflare.Env }>();

app.use('*', corsMiddleware);
app.use('*', attachGlobalMiddlewares);

app.post('/ingest-profile', handleProfileIngestion);
app.get('/search', handleSearch);

export default app;
