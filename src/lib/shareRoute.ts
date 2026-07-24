export interface ShareRoute {
  homeId: string | null;
  sessionId: string | null;
}

export function readShareRoute(search = window.location.search): ShareRoute {
  const params = new URLSearchParams(search);
  return {
    homeId: params.get("home"),
    sessionId: params.get("session"),
  };
}

export function buildShareUrl(currentUrl: string, route: ShareRoute): string {
  const url = new URL(currentUrl);

  if (route.homeId) url.searchParams.set("home", route.homeId);
  else url.searchParams.delete("home");

  if (route.sessionId) url.searchParams.set("session", route.sessionId);
  else url.searchParams.delete("session");

  return url.toString();
}

export function replaceShareRoute(route: ShareRoute): void {
  window.history.replaceState(null, "", buildShareUrl(window.location.href, route));
}
