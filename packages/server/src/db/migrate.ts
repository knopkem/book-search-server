import { loadConfig } from '../config.js';
import { createDatabase } from './client.js';

const config = loadConfig();
const { client } = await createDatabase(config.databasePath);

client.close();
