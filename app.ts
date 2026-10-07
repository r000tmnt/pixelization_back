import express, { type Express, type Request, type Response } from 'express';
import cors from 'cors';
import env from 'dotenv/config'
import pixelRouter from './routes/pixel.ts';
import logger from './utils/logger.ts';

const app: Express = express();

const port = Number(process.env.PORT) || 3030;

app.use(cors());
app.use((req, res, next) => {
  const startedAt = Date.now();
  res.on('finish', () => {
    logger.info('HTTP request completed', {
      method: req.method,
      path: req.originalUrl,
      statusCode: res.statusCode,
      durationMs: Date.now() - startedAt,
    });
  });
  next();
});
app.use('/pixel', pixelRouter);

app.get('/healthCheck', (req: Request, res: Response) => {
  res.send('OK');
  // res.redirect('http://localhost:5173/')
});

app.use((req, res, next) => {
    const err = { code: 404 }
    next(err)
});

app.use((err, req, res, next) => {
    const statusCode = err.code || 500
    logger.error('Request failed', {
      method: req.method,
      path: req.originalUrl,
      statusCode,
      error: {
        name: err.name,
        message: err.message,
        stack: err.stack,
      },
    });
    res.status(statusCode).json({ err: 'SyntaxError', message: 'Something went wrong.' });  
});

app.listen(port, () => {
  logger.info('Server started', { port });
});

// module.exports = app
export default app;
