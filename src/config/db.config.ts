const DbConfig = {
  url: process.env.DB_URL || 'localhost',
  // logging: AppConfig.env === 'development',
  synchronize: process.env.DB_SYNC === 'true',
};

export { DbConfig };
