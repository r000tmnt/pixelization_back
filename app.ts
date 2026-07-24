import express, { type Express, type Request, type Response } from 'express';
import cors from 'cors';
import pixelRouter from './routes/pixel.ts';

const app: Express = express();

const port = Number(process.env.PORT) || 3030;

app.use(cors());
app.use('/pixel', pixelRouter);

app.get('/', (req: Request, res: Response) => {
  // res.send('Hello World!');
  res.redirect('http://localhost:5173/')
});

app.use((req, res, next) => {
    const err = { code: 404 }
    next(err)
});

app.use((err, req, res, next) => {
//   console.error(err);
    const statusCode = err.code || 500
    res.status(statusCode).json({ err: 'SyntaxError', message: 'Something went wrong.' });  
});

app.listen(port, () => {
  console.log(`Server 啟動在 http://localhost:${port}`);
});

// module.exports = app
export default app;