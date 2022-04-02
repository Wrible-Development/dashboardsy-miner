(async() => {
    const configs = await window.configs.get()
    if (configs.configs.length == 0) {
        const el = await document.querySelector("#gridforconfigs")
        const h1 = document.createElement("h1")
        el.classList.remove(['grid', 'grid-cols-3'])
        el.classList.add(['flex', 'items-center', 'justify-center'])
        h1.classList.add(["text-center", "text-3xl", "w-full", "m-auto"])
        h1.innerText = "No Configs Found"
        el.appendChild(h1)
        return;
    }
    configs.configs.forEach(async config => {
        const el = await document.querySelector("#gridforconfigs")
        const el2 = await document.createElement("div")
        el2.classList.add("config")
        el2.onclick = (event) => {
            event.preventDefault()
            localStorage.setItem("config", JSON.stringify(config))
            window.location.href = "index.html"
        }
        el2.innerText = config.name
        el.appendChild(el2)
    })
})()