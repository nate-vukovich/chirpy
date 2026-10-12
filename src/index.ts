import express from 'express';

import type { Express, Request, Response, NextFunction } from 'express';

const app: Express = express();
const PORT = process.env.PORT || 8080;

app.use(middlewareLogResponses);
app.use('/app', express.static('./src/app'));

app.get('/healthz', (req: Request, res: Response) => {
  res.set('Content-Type', 'text/plain');
  res.send('OK');
});

app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});

function middlewareLogResponses(
  req: Request,
  res: Response,
  next: NextFunction
) {
  res.on('finish', () => {
    const statusCode = res.statusCode;

    if (statusCode !== 200) {
      console.log(`[NON-OK] ${req.method} ${req.url} - Status: ${statusCode}`);
    }
  });

  next();
}
