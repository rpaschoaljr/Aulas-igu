const target = process.env.BACKEND_URL || 'http://localhost:8080';
const wsTarget = target.replace(/^http/, 'ws');

module.exports = {
  '/api': {
    target: target,
    secure: false,
    changeOrigin: true
  },
  '/ws': {
    target: wsTarget,
    ws: true,
    secure: false
  }
};
