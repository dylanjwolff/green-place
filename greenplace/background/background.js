browser.runtime.onMessage.addListener(notify);

console.log("background running")

currentAddresses = []

function notify(message) {
    console.log(message)
    switch (message.request) {
        case "addAddress":
            console.log("adding")
            currentAddresses.push(message.address)
            break
        case "removeAddress":
            console.log("removing")
            let idx = currentAddresses.indexOf(message.address)
            currentAddresses.splice(idx, 1)
            break
        case "sendAddresses":
            browser.tabs.query({active: true, currentWindow: true}, function (tabs) {
                console.log(tabs[0].id)
                browser.tabs.sendMessage(tabs[0].id, {"Adresses" : currentAddresses})
            })
            break
        default:
            console.log("bad request")
    }
}
