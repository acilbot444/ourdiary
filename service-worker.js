// ========== PUSH NOTIFICATIONS ==========
self.addEventListener('push', (event) => {

  let data = {
    title: 'Our Notes ✉︎',
    body: 'You received a new note 💌'
  };

  if (event.data) {
    try {
      data = {
        ...data,
        ...event.data.json()
      };
    } catch {
      // Keep default notification text
    }
  }

  const options = {
    body: data.body,
    data: {
      url:
        data.url ||
        self.registration.scope
    },

    tag: 'our-notes-new-note',
    renotify: true
  };

  event.waitUntil(
    self.registration.showNotification(
      data.title,
      options
    )
  );
});

// ========== NOTIFICATION CLICK ==========
self.addEventListener(
  'notificationclick',
  (event) => {

    event.notification.close();

    const targetUrl =
      event.notification.data?.url ||
      self.registration.scope;

    event.waitUntil(
      clients
        .matchAll({
          type: 'window',
          includeUncontrolled: true
        })
        .then((windowClients) => {
          // If site already open,
          // focus it instead of opening another tab.
          for (const client of windowClients) {
            if ('focus' in client) {
              return client.focus();
            }
          }

          // Otherwise open the website.
          if (clients.openWindow) {
            return clients.openWindow(
              targetUrl
            );
          }

        })
    );
  }
);