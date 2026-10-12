import express, { type Express } from 'express';

const app: Express = express();
const PORT = process.env.PORT || 8080;

app.use(express.static('.'));

app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});
