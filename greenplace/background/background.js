browser.runtime.onMessage.addListener(notify);

console.log("background running")

currentAddresses = []

function notify(message) {
    switch (message.request) {
        case "addAddress":
            currentAddresses += message.address
            console.log(currentAddresses)
            break
        case "removeAddress":
            currentAddresses.remove(message.address)
            console.log(currentAddresses)
            break
    }
}