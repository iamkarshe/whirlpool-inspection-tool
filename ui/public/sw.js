self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", () => {
  // Let the browser handle requests normally; this keeps the worker installable without caching surprises.
});

self.addEventListener("push", (event) => {
  let payload = {};

  try {
    if (event.data) {
      payload = event.data.json();
    }
  } catch {
    payload = {
      body: event.data ? event.data.text() : "You have a new update.",
    };
  }

  const notification = payload.notification || payload;
  const title = notification.title || "Whirlpool Insights";
  const options = {
    body: notification.body || "You have a new update.",
    icon: notification.icon || "/assets/icons/icon-192.png",
    badge: notification.badge || "/assets/icons/icon-192.png",
    tag: notification.tag || "whirlpool-insights",
    data: {
      url: notification.url || payload.url || "/",
      ...(notification.data || payload.data || {}),
    },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const targetUrl = new URL(
    event.notification.data?.url || "/",
    self.location.origin,
  ).href;

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if (client.url === targetUrl && "focus" in client) {
            return client.focus();
          }
        }

        for (const client of clientList) {
          if ("navigate" in client && "focus" in client) {
            return client.navigate(targetUrl).then((navigatedClient) => {
              return navigatedClient ? navigatedClient.focus() : client.focus();
            });
          }
        }

        return self.clients.openWindow(targetUrl);
      }),
  );
});
