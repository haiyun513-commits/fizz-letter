const CACHE_NAME = 'fizz-letter-v3';

self.addEventListener('install', e => {
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// 推送通知
self.addEventListener('push', event => {
  let data = { title: '泡沫来信', body: '你有新消息', url: '/' };
  try { data = event.data.json(); } catch(e) {}

  // 来电推送：特殊样式
  if (data.type === 'incoming_call') {
    var callIcon = data.callerAvatar ? data.callerAvatar : '/images/apple-touch-icon.png';
    event.waitUntil(
      self.registration.showNotification(data.callerName || data.title, {
        body: (data.callType === 'video' ? '📹 视频通话' : '📞 语音通话') + ' · 来电中...',
        icon: callIcon,
        badge: '/images/favicon-32.png',
        tag: 'incoming-call',
        renotify: true,
        requireInteraction: true,
        data: { url: data.url || '/?incoming=1' },
        vibrate: [500, 200, 500, 200, 500, 200, 500],
        actions: [
          { action: 'answer', title: '📞 接听' },
          { action: 'reject', title: '挂断' }
        ]
      })
    );
    return;
  }

  // 普通推送
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/images/apple-touch-icon.png',
      badge: '/images/favicon-32.png',
      data: { url: data.url },
      vibrate: [200, 100, 200],
    })
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  var url = event.notification.data && event.notification.data.url || '/';

  // 来电操作按钮
  if (event.action === 'reject') {
    // 拒绝 → 不打开页面，静默处理
    return;
  }
  if (event.action === 'answer') {
    url = '/?incoming=1';
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      for (var client of list) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      return clients.openWindow(url);
    })
  );
});
