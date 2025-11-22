import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { verifyRouter } from './routes/verify';
import { settleRouter } from './routes/settle';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Custom x402 payment protocol routes
app.use('/verify', verifyRouter);
app.use('/settle', settleRouter);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'x402-facilitator' });
});

app.listen(PORT, () => {
  console.log(`x402 Facilitator server running on port ${PORT}`);
});

export default app;
