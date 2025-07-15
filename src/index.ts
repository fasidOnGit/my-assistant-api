import { Hono } from 'hono';
import { cors } from './libs/cors';
import { handleProfileIngestion } from './handlers/profileIngestion';
import { handleSearch } from './handlers/search';

const app = new Hono<{ Bindings: Cloudflare.Env }>();

app.use('*', cors);

app.post('/ingest-profile', handleProfileIngestion);
app.get('/search', handleSearch);

export default app;
