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
    var style = document.createElement("style")
    style.innerHTML = `
        .greenplace-underline-green {
            display: inline-block;
            border-bottom: 6px solid #4DD662;
            border-radius: 5px;
        }
        .greenplace-underline-yellow {
            display: inline-block;
            border-bottom: 6px solid #FDE54D;
            border-radius: 5px;
        }
        .greenplace-underline-red {
            display: inline-block;
            border-bottom: 6px solid #DC3937;
            border-radius: 5px;
        }
    `
    document.getElementsByTagName('head')[0].appendChild(style)
    let length = addresses.length
    for (var i = 0; i < length; ++i) {
        let parent = document.getElementById(addresses[i].id)
        parent.classList.add("address-parent")

        let element = document.getElementById(addresses[i].id).childNodes[0].childNodes[0]
        element.classList.add("address")

        // Set appropriate color style
        let score = scores[i]
        if (score >= 0.7) {
            element.classList.add("greenplace-underline-red")
        } else if (score >= 0.4) {
            element.classList.add("greenplace-underline-yellow")
        } else {
            element.classList.add("greenplace-underline-green")
        }

        // Add leaf image to the side of the underline
        var image = document.createElement("img")
        image.src = "https://cdn2.iconfinder.com/data/icons/love-nature/600/green-Leaves-nature-leaf-tree-garden-environnement-512.png"
        image.style.height = "20px"
        image.style.width = "20px"
        image.style.marginTop = "23px"
        image.style.marginRight = "5px"
        document.getElementById(addresses[i].id).childNodes[0].prepend(image)
    }
}

// List(address) -> ()
function createPanel(addresses) {
    var style = document.createElement("style")
    style.id = "panel-style"

    style.innerHTML = `
        .address-parent .panel{
            opacity: .5;
        }
    `;

    document.head.appendChild(style)

    for(var i = 0; i < addresses.length; ++i) {
        let element = document.getElementById(addresses[i].id)
        var panel = document.createElement("div")
        panel.classList.add("panel")
        panel.innerText = "Panel"
        element.appendChild(panel)
    }
}

// score -> color
// linear from red (0) to green (1)
function colorFromScore(score, classList) {
    if (score >= 0.7) {
        return classList.add("greenplace-underline-green")
    } else if (score >= 0.4) {
        return element.classList.add("greenplace-underline-yellow")
    } else {
        return element.classList.add("greenplace-underline-red")
    }
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
createPanel(addresses)
let scores = computeMetrics(addresses)
scores = Array.from({length: 40}, () => Math.random()) // TODO remove
updateHTML(addresses, scores)

// Example of how to call function from another file now that webpack is set up
//update()
