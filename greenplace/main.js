document.body.style.border = "5px solid red";

let DEFAULT_ID_PREFIX = "green_place_"

class Address {
    constructor(id, address) {
        this.id = id
        this.address = address
    }
}

// () -> List(Id)
function lookUpAddresses() {
    let elems = document.getElementsByClassName("list-item--address")

    var arr = new Array()
    let length = elems.length
    for (var i = 0; i < length; ++i) {
        elems[i].getElementsByClassName("value")[0].id = DEFAULT_ID_PREFIX + i
        addr = new Address(
            elems[i].getElementsByClassName("value")[0].id,
        elems[i].getElementsByClassName("value")[0].textContent)
        arr.push(addr)
    }

    return arr
}

// List(address) -> List(eco-score)
function computeMetrics() {

}

// List(eco-score) -> ()
function updateHTML() {

}


// add arguments and stuff, etc
lookUpAddresses()
computeMetrics()
updateHTML()
