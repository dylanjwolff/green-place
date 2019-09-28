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
function updateHTML(addresses, scores) {
    let length = addresses.length
    for (var i = 0; i < length; ++i) {
        console.log(addresses[i].id)
        let element = document.getElementById(addresses[i].id).childNodes[0].childNodes[0]
        element.classList.add("address")
        element.style.backgroundColor = colorFromScore(0.7)
        element.outerHTML = element.outerHTML.replace(/p/g, "span")
    }
}

// score -> color
// linear from red (0) to green (1)
function colorFromScore(score) {
    let green = Math.floor(score * 255)
    let red = Math.floor((1 - score) * 255)
    let hex = "#" + rgbToHex(red) + rgbToHex(green) + "00"
    return hex
}

// decimal (0 to 255, and +) -> hex
var rgbToHex = function (rgb) {
  var hex = Number(rgb).toString(16)
  if (hex.length < 2) {
       hex = "0".concat(hex)
  }
  return hex
};


// add arguments and stuff, etc
let addresses = lookUpAddresses()
let scores = computeMetrics(addresses)
updateHTML(addresses, scores)

// Example of how to call function from another file now that webpack is set up
update()
