import express from 'express';

import type { Express, Request, Response } from 'express';

const app: Express = express();
const PORT = process.env.PORT || 8080;

app.use('/app', express.static('./src/app'));

app.get('/healthz', (req: Request, res: Response) => {
  res.set('Content-Type', 'text/plain');
  res.send('OK');
});

app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});
