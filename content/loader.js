(() => {
  const EXT = globalThis.browser ?? globalThis.chrome;
  if (!EXT?.runtime?.getURL) return;

  const injectorUrl = EXT.runtime.getURL('core/injector.js');
  let retryTimer = null;

  function sendHeartbeat() {
    try {
      const result = EXT.runtime.sendMessage({ type: 'MICMAX_HEARTBEAT' });
      if (result?.catch) result.catch(() => {});
    } catch (_) {}
  }

  function inject() {
    if (window.__micMaxLoaderBusy || window.__micMaxInjectorReady) {
      sendHeartbeat();
      return;
    }
    window.__micMaxLoaderBusy = true;

    const script = document.createElement('script');
    script.src = injectorUrl;
    script.async = false;
    script.dataset.omniMessengerLord = 'injector';
    script.onload = () => {
      document.documentElement.dataset.micMaxLoaderInjected = '1';
      window.__micMaxLoaderBusy = false;
      sendHeartbeat();
      if (retryTimer) clearInterval(retryTimer);
      script.remove();
    };
    script.onerror = () => {
      window.__micMaxLoaderBusy = false;
      script.remove();
    };
    (document.head || document.documentElement).appendChild(script);
  }

  inject();
  retryTimer = setInterval(() => {
    if (window.__micMaxInjectorReady) {
      clearInterval(retryTimer);
      sendHeartbeat();
      return;
    }
    inject();
  }, 5000);
})();
