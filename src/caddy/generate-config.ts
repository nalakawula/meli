import { Sites } from '../entities/sites/site';
import { env } from '../env/env';
import { generateSiteRoutes } from './config/sites/generate-site-routes';
import { getErrorRoutes } from './config/get-error-routes';
import { generateManualCertificatesConfig, generateServerTlsConfig } from './config/ssl';
import { uiRoute } from './config/ui-route';
import { apiRoute } from './config/api-route';
import { URL } from 'url';
import { fallback } from './config/fallback';

const sitesUrl = new URL(env.MELI_SITES_URL);

export async function generateConfig(): Promise<any> {
  const sites = await Sites().find().toArray();

  const sslDisabled = sitesUrl.protocol === 'http:';
  return {
    logging: {
      logs: {
        default: {
          level: 'DEBUG',
        },
      },
    },
    admin: {
      disabled: false,
      listen: '0.0.0.0:2019',
    },
    apps: {
      http: {
        servers: {
          sites: {
            listen: sslDisabled ? [':80'] : [':443'],
            routes: [
              ...(env.MELI_STANDALONE ? [] : [
                apiRoute,
                uiRoute,
              ]),
              ...sites.flatMap(generateSiteRoutes),
              fallback,
            ],
            errors: getErrorRoutes(),
            ...(sslDisabled ? {} : generateServerTlsConfig(sites)),
          },
        },
      },
      tls: sslDisabled ? undefined : {
        automation: {
          policies: [
            ...(!env.MELI_ACME_SERVER ? [] : [{
              issuer: {
                module: 'acme',
                ca: env.MELI_ACME_SERVER,
                trusted_roots_pem_files: env.MELI_ACME_CA_PATH ? [env.MELI_ACME_CA_PATH] : undefined,
              },
              on_demand: true,
            }]),
          ],
        },
        certificates: generateManualCertificatesConfig(sites),
      },
    },
  };
}
