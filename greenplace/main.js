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

        element.addEventListener("mouseover", function(event) {
            var rect = event.target.getBoundingClientRect();
            console.log(rect.top, rect.right, rect.left, rect.bottom)

            let panel = document.getElementById("panel-id")
            panel.style.opacity = 1
            panel.style.zIndex = 200
            panel.style.position = "fixed"
            panel.style.left = (rect.left - 60)+ "px"
            panel.style.top = (rect.top + 60) + "px"

            if (event.target.classList.contains("greenplace-underline-green")) {
                event.target.style.backgroundColor = "rgba(77, 214, 98, 0.3)"
            } else if (event.target.classList.contains("greenplace-underline-yellow")) {
                event.target.style.backgroundColor = "rgba(253, 229, 77, 0.3)"
            } else {
                event.target.style.backgroundColor = "rgba(220, 57, 55, 0.3)"
            }

        })

        element.addEventListener("mouseout", function(event) {
            let panel = document.getElementById("panel-id")
            panel.style.opacity = 0
            panel.style.zIndex = -1
            if (event.target.classList.contains("greenplace-underline-green")) {
                event.target.style.backgroundColor = "rgba(77, 214, 98, 0)"
            } else if (event.target.classList.contains("greenplace-underline-yellow")) {
                event.target.style.backgroundColor = "rgba(253, 229, 77, 0)"
            } else {
                event.target.style.backgroundColor = "rgba(220, 57, 55, 0)"
            }

        })

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
        .overlay {
            opacity: 0;
            z-index:200;
            position:fixed;
            display:block;
        }

        .panel {
            background-color: white;
            width: 250px;
            height: 400px;
            border-radius: 30px;
            box-shadow: 0 4px 8px 0 rgba(0, 0, 0, 0.2), 0 6px 20px 0 rgba(0, 0, 0, 0.19);
        }

        .footprint {
            position: relative;
            width: 100%;
            height: 35%;
            background-color: #8fdb9d;
            border-top-left-radius: 30px;
            border-top-right-radius: 30px;
        }

        .leaf {
            position: absolute;
            width: 70px;
            height: 70px;
            margin-top: 15%;
            margin-left: 17%;
            display: inline-block;
        }

        .pin {
            position: absolute;
            width: 30px;
            height: 30px;
            margin-top: 5%;
            margin-left: 81%;
            display: inline-block;
        }

        .pin_selected {
            box-shadow: 0 1px 18px 3px #7cc489 inset
        }

        .percentage {
            position: absolute;
            display: inline-block;
            font-size: 50px;
            margin-left: 50%;
            margin-top: 20%;
        }
    `;

    document.head.appendChild(style)

    let panel = document.createElement("div")
    let footprint = document.createElement("div")
    let leaf = document.createElement("img")
    let pin = document.createElement("img")
    let percentage = document.createElement("div")

    panel.id = "panel-id"
    panel.classList.add("overlay")
    panel.classList.add("panel")
    footprint.classList.add("footprint")
    leaf.classList.add("leaf")
    pin.classList.add("pin")
    percentage.classList.add("percentage")

    leaf.src = "https://cdn2.iconfinder.com/data/icons/love-nature/600/green-Leaves-nature-leaf-tree-garden-environnement-512.png"

    pin.src = "http://simpleicon.com/wp-content/uploads/pin.png"

    percentage.textContent = "74%"

    footprint.appendChild(leaf)
    footprint.appendChild(pin)
    footprint.appendChild(percentage)
    panel.appendChild(footprint)

    document.body.prepend(panel)

    /*window.onmousemove = function (event) {
        var x = event.clientX,
            y = event.clientY
        panel.style.top = (y + 20) + "px"
        panel.style.left = (x + 20) + "px"
    }*/
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
