import Stripe from 'stripe';

let connectionSettings: {
  publishable?: string;
  secret?: string;
} | null = null;

async function getCredentials(): Promise<{ publishableKey: string; secretKey: string }> {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY
    ? 'repl ' + process.env.REPL_IDENTITY
    : process.env.WEB_REPL_RENEWAL
      ? 'depl ' + process.env.WEB_REPL_RENEWAL
      : null;

  if (!xReplitToken || !hostname) {
    throw new Error('Stripe connection not available - missing Replit environment variables');
  }

  const connectorName = 'stripe';
  const isProduction = process.env.REPLIT_DEPLOYMENT === '1';
  const targetEnvironment = isProduction ? 'production' : 'development';

  const url = new URL(`https://${hostname}/api/v2/connection`);
  url.searchParams.set('include_secrets', 'true');
  url.searchParams.set('connector_names', connectorName);
  url.searchParams.set('environment', targetEnvironment);

  const response = await fetch(url.toString(), {
    headers: {
      'Accept': 'application/json',
      'X_REPLIT_TOKEN': xReplitToken
    }
  });

  const data = await response.json();
  
  connectionSettings = data.items?.[0]?.settings;

  if (!connectionSettings?.publishable || !connectionSettings?.secret) {
    throw new Error(`Stripe ${targetEnvironment} connection not found`);
  }

  return {
    publishableKey: connectionSettings.publishable,
    secretKey: connectionSettings.secret,
  };
}

let stripeClient: Stripe | null = null;

export async function getStripeClient(): Promise<Stripe> {
  if (!stripeClient) {
    const { secretKey } = await getCredentials();
    stripeClient = new Stripe(secretKey, {
      apiVersion: '2025-03-31.basil' as Stripe.LatestApiVersion,
    });
  }
  return stripeClient;
}

export async function getStripePublishableKey(): Promise<string> {
  const { publishableKey } = await getCredentials();
  return publishableKey;
}

export async function getStripeSecretKey(): Promise<string> {
  const { secretKey } = await getCredentials();
  return secretKey;
}

export async function getWebhookSecret(): Promise<string | null> {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY
    ? 'repl ' + process.env.REPL_IDENTITY
    : process.env.WEB_REPL_RENEWAL
      ? 'depl ' + process.env.WEB_REPL_RENEWAL
      : null;

  if (!xReplitToken || !hostname) {
    return null;
  }

  const connectorName = 'stripe';
  const isProduction = process.env.REPLIT_DEPLOYMENT === '1';
  const targetEnvironment = isProduction ? 'production' : 'development';

  const url = new URL(`https://${hostname}/api/v2/connection`);
  url.searchParams.set('include_secrets', 'true');
  url.searchParams.set('connector_names', connectorName);
  url.searchParams.set('environment', targetEnvironment);

  const response = await fetch(url.toString(), {
    headers: {
      'Accept': 'application/json',
      'X_REPLIT_TOKEN': xReplitToken
    }
  });

  const data = await response.json();
  return data.items?.[0]?.settings?.webhookSecret || null;
}

export type Plan = 'plus' | 'pro';
export type BillingCycle = 'monthly' | 'yearly';

export interface PriceConfig {
  plan: Plan;
  cycle: BillingCycle;
  priceId: string;
  amount: number;
  currency: string;
}

let priceConfigs: PriceConfig[] | null = null;

export async function getPriceConfigs(): Promise<PriceConfig[]> {
  if (priceConfigs) return priceConfigs;
  
  const stripe = await getStripeClient();
  const prices = await stripe.prices.list({ active: true, expand: ['data.product'], limit: 100 });
  
  const configs: PriceConfig[] = [];
  
  for (const price of prices.data) {
    const product = price.product as Stripe.Product;
    if (!product || typeof product === 'string') continue;
    
    const planMeta = product.metadata?.plan as Plan | undefined;
    const cycleMeta = price.recurring?.interval === 'year' ? 'yearly' : 'monthly';
    
    if (planMeta && (planMeta === 'plus' || planMeta === 'pro')) {
      configs.push({
        plan: planMeta,
        cycle: cycleMeta,
        priceId: price.id,
        amount: price.unit_amount || 0,
        currency: price.currency,
      });
    }
  }
  
  priceConfigs = configs;
  return configs;
}

export function getPriceId(plan: Plan, cycle: BillingCycle, configs: PriceConfig[]): string | null {
  const config = configs.find(c => c.plan === plan && c.cycle === cycle);
  return config?.priceId || null;
}
