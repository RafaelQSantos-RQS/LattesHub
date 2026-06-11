const target = process.env.LATTESHUB_API_PROXY_TARGET || 'http://localhost:8000';

module.exports = {
  '/api': {
    target,
    secure: false,
    changeOrigin: true,
  },
};
