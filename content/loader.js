(() => {
  const EXT = globalThis.browser ?? globalThis.chrome;
  if (!EXT?.runtime?.getURL) return;

  const injectorUrl = EXT.runtime.getURL('core/injector.js');

  function sendHeartbeat() {
    try {
      const result = EXT.runtime.sendMessage({ type: 'MICMAX_HEARTBEAT' });
      if (result?.catch) result.catch(() => {});
    } catch (_) {}
  }

  function inject() {
    if (window.__micMaxLoaderBusy) return;
    window.__micMaxLoaderBusy = true;

    const alreadyInjected = document.documentElement?.dataset?.micMaxLoaderInjected === '1';
    if (alreadyInjected) {
      window.__micMaxLoaderBusy = false;
      sendHeartbeat();
      return;
    }

    const script = document.createElement('script');
    script.src = injectorUrl;
    script.async = false;
    script.dataset.omniMessengerLord = 'injector';
    script.onload = () => {
      document.documentElement.dataset.micMaxLoaderInjected = '1';
      window.__micMaxLoaderBusy = false;
      sendHeartbeat();
      script.remove();
    };
    script.onerror = () => {
      window.__micMaxLoaderBusy = false;
      script.remove();
    };
    (document.head || document.documentElement).appendChild(script);
  }

  inject();

  const observer = new MutationObserver(() => {
    if (document.documentElement?.dataset?.micMaxLoaderInjected !== '1') inject();
    else observer.disconnect();
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });

  setInterval(() => {
    if (document.documentElement?.dataset?.micMaxLoaderInjected !== '1') inject();
  }, 2500);
})();
