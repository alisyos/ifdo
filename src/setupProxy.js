const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  app.use(
    '/api',
    createProxyMiddleware({
      target: 'http://ifdo.co.kr',
      changeOrigin: true,
      pathRewrite: {
        '^/api': '', // URL '/api/analytics/JSONAPI.apz' -> 'http://ifdo.co.kr/analytics/JSONAPI.apz'
      },
    })
  );
}; 