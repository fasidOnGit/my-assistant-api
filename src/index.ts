import { Hono } from 'hono';
import { cors } from './libs/cors';
import { handleProfileIngestion } from './handlers/profileIngestion';

const app = new Hono<{ Bindings: Cloudflare.Env }>();

app.use('*', cors);

app.post('/ingest-profile', handleProfileIngestion);

export default app;
