module.exports = {
  apps: [
    {
      name: 'viatechsg-backend',
      script: './dist/server.js',
      instances: 1,
      exec_mode: 'fork', // Fork mode is recommended for local SQLite database access
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production',
        PORT: 3010,
      },
      env_development: {
        NODE_ENV: 'development',
        PORT: 3010,
      },
      // Logging configuration
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      merge_logs: true,
    },
  ],
};
