import { Router } from 'express';
import swaggerUi from 'swagger-ui-express';
import helmet from 'helmet';
import spec from './openapi.json' with { type: 'json' };

export const docsRoutes = Router();
docsRoutes.get('/openapi.json', (_req, res) => { res.json(spec); });
// Local assets only. Avoid HTTPS upgrades for the localhost development UI.
docsRoutes.use('/docs', helmet.contentSecurityPolicy({ directives: {
  upgradeInsecureRequests: null,
  scriptSrc: ["'self'"],
  connectSrc: ["'self'"],
} }), swaggerUi.serve, swaggerUi.setup(undefined, {
  customSiteTitle: 'SARH API — Swagger',
  swaggerOptions: {
    url: '/openapi.json', validatorUrl: null, withCredentials: true,
    displayRequestDuration: true, defaultModelsExpandDepth: -1,
    requestInterceptor: function (request: { headers: Record<string, string> }) {
      request.headers['X-SARH-Request'] = '1';
      return request;
    },
  },
}));
