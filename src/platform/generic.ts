import { GetServerSidePropsContext, NextApiRequest } from "next";
import { LogEvent, RequestReport } from "../logger";
import { EndpointType } from "../shared";
import type Provider from "./base";
import { isBrowser } from "../config";

// This is the generic config class for all platforms that doesn't have a special
// implementation (e.g: vercel, netlify). All config classes extends this one.
export default class GenericConfig implements Provider {
  proxyPath = '/_axiom';
  shouldSendEdgeReport = false;
  token = process.env.NEXT_PUBLIC_AXIOM_TOKEN || process.env.AXIOM_TOKEN;
  dataset = process.env.NEXT_PUBLIC_AXIOM_DATASET || process.env.AXIOM_DATASET;
  environment: string = process.env.NODE_ENV;
  axiomUrl = process.env.NEXT_PUBLIC_AXIOM_URL || process.env.AXIOM_URL || 'https://api.eu.axiom.co';
  region = process.env.REGION || undefined;

  isEnvVarsSet(): boolean {
    return !!(this.axiomUrl && this.dataset && this.token);
  }

  getIngestURL(_: EndpointType): string {
    return `${this.axiomUrl}/api/v1/datasets/${this.dataset}/ingest`;
  }

  getLogsEndpoint(): string {
    return isBrowser ? `${this.proxyPath}/logs` : this.getIngestURL(EndpointType.logs);
  }

  getWebVitalsEndpoint(): string {
    return isBrowser ? `${this.proxyPath}/web-vitals` : this.getIngestURL(EndpointType.webVitals);
  }

  wrapWebVitalsObject(metrics: any[]): any {
    return metrics.map(m => ({
        webVital: m,
        _time: new Date().getTime(),
        platform: {
          environment: this.environment,
          source: 'web-vital',
        },
    }))
  }

  injectPlatformMetadata(logEvent: LogEvent, source: string) {
    logEvent.platform = {
      environment: this.environment,
      region: this.region,
      source: source + '-log',
    };
  }

  generateRequestMeta(req: NextApiRequest | GetServerSidePropsContext['req']): RequestReport {
    return {
      startTime: new Date().getTime(),
      path: req.url!,
      method: req.method!,
      host: this.getHeaderOrDefault(req, 'host', ''),
      userAgent: this.getHeaderOrDefault(req, 'user-agent', ''),
      scheme: 'https',
      ip: this.getHeaderOrDefault(req, 'x-forwarded-for', ''),
      region: this.region,
    };
  }

  getHeaderOrDefault(req: NextApiRequest | GetServerSidePropsContext['req'], headerName: string, defaultValue: any) {
    return req.headers[headerName] ? req.headers[headerName] : defaultValue;
  }
}
