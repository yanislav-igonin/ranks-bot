import { AppConfig } from './app.config';

const DbConfig = {
  url: process.env.DB_URL || 'localhost',
  // logging: AppConfig.env === 'development',
  synchronize: AppConfig.env === 'development',
};

export { DbConfig };
