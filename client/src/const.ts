export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

const buildAuthUrl = (type: "signIn" | "signUp", returnTo?: string) => {
  const oauthPortalUrl = import.meta.env.VITE_OAUTH_PORTAL_URL;
  const appId = import.meta.env.VITE_APP_ID;
  
  if (!oauthPortalUrl || !appId) {
    return "/login";
  }
  
  const redirectUri = `${window.location.origin}/api/oauth/callback`;
  const statePayload = {
    redirectUri,
    returnTo: returnTo || "/app",
  };
  const state = btoa(JSON.stringify(statePayload));

  try {
    const url = new URL(`${oauthPortalUrl}/app-auth`);
    url.searchParams.set("appId", appId);
    url.searchParams.set("redirectUri", redirectUri);
    url.searchParams.set("state", state);
    url.searchParams.set("type", type);

    return url.toString();
  } catch {
    return "/login";
  }
};

export const getLoginUrl = (returnTo?: string) => buildAuthUrl("signIn", returnTo);

export const getSignUpUrl = (returnTo?: string) => buildAuthUrl("signUp", returnTo);

export const sanitizeReturnTo = (returnTo: string | null): string => {
  if (!returnTo) return "/app";
  
  try {
    const decoded = decodeURIComponent(returnTo);
    if (decoded.startsWith("/") && !decoded.startsWith("//")) {
      return decoded;
    }
    return "/app";
  } catch {
    return "/app";
  }
};
