import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import { verifyRouter } from './routes/verify';
import { settleRouter } from './routes/settle';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Rate limiting configuration
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(cors());
app.use(express.json());
app.use(limiter);

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
