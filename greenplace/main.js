import { update } from "./update.js"

document.body.style.border = "5px solid red";

let DEFAULT_ID_PREFIX = "green_place_"

class Address {
    constructor(id, address) {
        this.id = id
        this.address = address
    }
}

// () -> Array(Address)
function lookUpAddresses() {
    let elems = document.getElementsByClassName("list-item--address")

    var arr = new Array()
    let length = elems.length
    for (var i = 0; i < length; ++i) {
        elems[i].getElementsByClassName("value")[0].id = DEFAULT_ID_PREFIX + i
        let addr = new Address(
            elems[i].getElementsByClassName("value")[0].id,
        elems[i].getElementsByClassName("value")[0].textContent)
        arr.push(addr)
    }

    return arr
}

// Array(Address) -> List(eco-score)
function computeMetrics(addresses) {
    return 0.5
}

// List(eco-score) -> ()
function updateHTML(scores) {

}


// add arguments and stuff, etc
let addresses = lookUpAddresses()
let scores = computeMetrics(addresses)
updateHTML(scores)
update()
