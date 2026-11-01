import { useSyncExternalStore } from "react";

// Tiny hash router: #/, #/new, #/deck/<id>, #/study/<id>, #/quiz/<id>.
export type Route =
  | { name: "library" }
  | { name: "new" }
  | { name: "deck"; id: string }
  | { name: "study"; id: string }
  | { name: "quiz"; id: string };

export function parseRoute(hash: string): Route {
  const [, page, id] = hash.replace(/^#/, "").split("/");
  if (page === "new") return { name: "new" };
  if ((page === "deck" || page === "study" || page === "quiz") && id) return { name: page, id };
  return { name: "library" };
}

export function href(route: Route): string {
  return route.name === "library" ? "#/" : "id" in route ? `#/${route.name}/${route.id}` : `#/${route.name}`;
}

export function navigate(route: Route) {
  window.location.hash = href(route);
}

function subscribe(cb: () => void) {
  window.addEventListener("hashchange", cb);
  return () => window.removeEventListener("hashchange", cb);
}

export function useRoute(): Route {
  const hash = useSyncExternalStore(subscribe, () => window.location.hash);
  return parseRoute(hash);
}
