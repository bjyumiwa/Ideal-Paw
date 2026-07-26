"use strict";

/*
  IdealPaw Service Worker
  通知の受信・表示・通知タップ時の起動を担当します。
*/

const CACHE_NAME = "idealpaw-cache-20260726-v1";

const APP_FILES = [
  "./",
  "./index.html",
  "./public/assets/manifest.json",
  "./public/assets/icons/icon-192.png",
  "./public/assets/icons/icon-512.png"
];

/*
  Service Workerをインストールします。
*/
self.addEventListener("install", event => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then(cache => cache.addAll(APP_FILES))
      .catch(error => {
        console.warn("Cache installation failed:", error);
      })
  );

  self.skipWaiting();
});

/*
  新しいService Workerをすぐに有効にします。
*/
self.addEventListener("activate", event => {
  event.waitUntil(
    Promise.all([
      caches.keys().then(names => {
        return Promise.all(
          names
            .filter(name => name !== CACHE_NAME)
            .map(name => caches.delete(name))
        );
      }),
      self.clients.claim()
    ])
  );
});

/*
  通信できないときは、保存済みのファイルを使います。
*/
self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then(response => {
        const copy = response.clone();

        caches
          .open(CACHE_NAME)
          .then(cache => cache.put(event.request, copy))
          .catch(() => {});

        return response;
      })
      .catch(() => caches.match(event.request))
  );
});

/*
  サーバーからプッシュ通知を受け取ります。
*/
self.addEventListener("push", event => {
  let data = {};

  try {
    data = event.data ? event.data.json() : {};
  } catch (error) {
    data = {
      title: "IdealPaw",
      body: event.data ? event.data.text() : ""
    };
  }

  const title = data.title || "IdealPaw";

  const options = {
    body: data.body || "相棒が待っているみたい。",
    icon: "./public/assets/icons/icon-192.png",
    badge: "./public/assets/icons/icon-192.png",
    tag: data.tag || "idealpaw-daily",
    renotify: false,
    data: {
      url: data.url || "./"
    }
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

/*
  通知をタップしたらIdealPawを開きます。
  すでに開いている場合は、その画面を前に出します。
*/
self.addEventListener("notificationclick", event => {
  event.notification.close();

  const targetUrl =
    event.notification.data?.url || "./";

  event.waitUntil(
    self.clients
      .matchAll({
        type: "window",
        includeUncontrolled: true
      })
      .then(clientList => {
        for (const client of clientList) {
          if ("focus" in client) {
            client.navigate(targetUrl);
            return client.focus();
          }
        }

        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl);
        }

        return undefined;
      })
  );
});
