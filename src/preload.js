const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('configs', {
    get: () => ipcRenderer.invoke('get-configs'),
    add: (config) => ipcRenderer.send('add-config', config),
    remove: (config) => ipcRenderer.send('remove-config', config)
})

contextBridge.exposeInMainWorld('gpus', {
    get: () => ipcRenderer.invoke('get-gpus')
})

contextBridge.exposeInMainWorld('miner', {
    start: (config) => ipcRenderer.send('start-miner', config),
    stop: () => ipcRenderer.invoke('stop-miner')
})

contextBridge.exposeInMainWorld('os', {
    get: () => process.platform
})