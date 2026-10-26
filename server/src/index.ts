import 'dotenv/config';
import app from './app';
import { connectDB } from './config/db';

const PORT = parseInt(process.env.PORT ?? '3001', 10);

async function main(): Promise<void> {
  await connectDB();

  app.listen(PORT, () => {
    console.log(`🎬 PIXEL FRAME server running on http://localhost:${PORT}`);
  });
}

main().catch((err) => {
  console.error('Fatal error during startup:', err);
  process.exit(1);
});
