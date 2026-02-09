import { config as loadEnv } from 'dotenv';
import path from 'path';

const envPath = path.resolve(process.cwd(), '..', '.env');
loadEnv({ path: envPath });
