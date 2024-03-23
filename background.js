
function refreshProxySettings() {
  chrome.storage.local.get(['proxySources', 'hostBindings', 'defaultProxyName'], function(result) {
    const proxySources = result.proxySources || [];
    const hostBindings = result.hostBindings || [];
    const defaultProxyName = result.defaultProxyName || "";

    const pacScriptData = generatePacScript(proxySources, hostBindings, defaultProxyName);
    chrome.proxy.settings.set({
        value: { mode: "pac_script", pacScript: { data: pacScriptData }},
        scope: "regular"
    });

  });
}

function generatePacScript(proxySources, hostBindings, defaultProxyName) {
    const defaultProxy = proxySources.find(p => p.proxyName === defaultProxyName);
    const defaultProxyString = defaultProxy ? `PROXY ${defaultProxy.proxyIP}:${defaultProxy.proxyPort}` : "DIRECT";

    let script = `function FindProxyForURL(url, host) {\n`;

    // 为每个代理和直连构建映射
    const proxyMap = new Map([
        ...proxySources.map(p => [p.proxyName, `PROXY ${p.proxyIP}:${p.proxyPort}`]),
        ["DIRECT", "DIRECT"] // 直接处理 "DIRECT"
    ]);

    hostBindings.filter(binding => binding.use).forEach(({ host, selectedProxy }) => {
        const proxyString = proxyMap.get(selectedProxy);
        if (proxyString) {
            script += `  if (shExpMatch(host, "${host}")) return "${proxyString}";\n`;
        }
    });

    script += `  return "${defaultProxyString}";\n}`;
    return script;
}

chrome.storage.onChanged.addListener(function(changes, namespace) {
    if (changes.proxySources || changes.hostBindings || changes.defaultProxyName) {
        refreshProxySettings();
    }
});
