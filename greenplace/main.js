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
function createPanel(addresses, address_places) {
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
            height: ` + (80 + 130 * address_places.length) + `px;
            border-radius: 30px;
            box-shadow: 0 4px 8px 0 rgba(0, 0, 0, 0.2), 0 6px 20px 0 rgba(0, 0, 0, 0.19);
        }

        .footprint {
            position: relative;
            width: 100%;
            height: 80px;
            background-color: #8fdb9d;
            border-top-left-radius: 30px;
            border-top-right-radius: 30px;
        }

        .leaf {
            position: absolute;
            width: 50px;
            height: 50px;
            margin-top: 7%;
            margin-left: 10%;
            display: inline-block;
        }

        .pin {
            position: absolute;
            width: 35px;
            height: 35px;
            margin-top: 8%;
            margin-left: 80%;
            display: inline-block;
        }

        .pin_selected {
            box-shadow: 0 1px 18px 3px #7cc489 inset
        }

        .percentage {
            position: absolute;
            display: inline-block;
            font-size: 38px;
            margin-left: 40%;
            margin-top: 4%;
        }

        .details {
            position: relative;
            width: 100%;
            background-color: white;
            border-bottom-left-radius: 30px;
            border-bottom-right-radius: 30px;
            padding-left: 20px;
        }

        .destinationCard {
            position: relative;
            height: 110px;
            width: 89%;
            margin-top: 10px;
            margin-bottom: 10px;
            padding: 5px;
            border-bottom: 2px solid black;
        }

        .destinationName {
            position: absolute;
            height: 40%;
            width: 100%;
            margin-left: 10px;
            font-size: 20px;
            text-transform: capitalize;
        }

        .bikeIcon {
            position: absolute;
            height: 30px;
            width: 30px;
            margin-top: 30px;
            margin-left: 25px;
        }

        .bikeDetails {
            position: absolute;
            height: 30px;
            width: 180px;
            margin-top: 35px;
            text-align: right;
        }

        .publicTransportIcon {
            position: absolute;
            height: 28px;
            width: 28px;
            margin-top: 65px;
            margin-left: 25px;
        }

        .publicTransportDetails {
            position: absolute;
            height: 30px;
            width: 180px;
            margin-top: 69px;
            text-align: right;
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

    // TODO set empty text first, and modify once we have score
    percentage.textContent = "74%"

    footprint.appendChild(leaf)
    footprint.appendChild(pin)
    footprint.appendChild(percentage)
    panel.appendChild(footprint)

    let details = document.createElement("ul")
    details.classList.add("details")

    for (var i = 0; i < address_places.length; ++i) {
        let destinationCard = document.createElement("div")
        destinationCard.classList.add("destinationCard")

        let destinationName = document.createElement("div")
        destinationName.classList.add("destinationName")
        destinationName.textContent = address_places[i].tag

        let bikeIcon = document.createElement("img")
        bikeIcon.classList.add("bikeIcon")
        bikeIcon.src = "https://www.searchpng.com/wp-content/uploads/2019/02/Free-Cycle-Bicycle-Travel-Ride-Bike-Icon-PNG-Image-715x715.png"

        let bikeDetails = document.createElement("div")
        bikeDetails.classList.add("bikeDetails")
        bikeDetails.textContent = "0 min"

        let publicTransportIcon = document.createElement("img")
        publicTransportIcon.classList.add("publicTransportIcon")
        publicTransportIcon.src = "https://cdn4.iconfinder.com/data/icons/aiga-symbol-signs/439/Aiga_bus-512.png"

        let publicTransportDetails = document.createElement("div")
        publicTransportDetails.classList.add("publicTransportDetails")
        publicTransportDetails.textContent = "0 min"

        // remove last bottom border
        if (i == address_places.length - 1) {
            destinationCard.style.borderBottom = "0px"
        }

        destinationCard.appendChild(destinationName)
        destinationCard.appendChild(bikeIcon)
        destinationCard.appendChild(bikeDetails)
        destinationCard.appendChild(publicTransportIcon)
        destinationCard.appendChild(publicTransportDetails)
        details.appendChild(destinationCard)
    }

    panel.appendChild(details)

    document.body.prepend(panel)

    /*window.onmousemove = function (event) {
        var x = event.clientX,
            y = event.clientY
        panel.style.top = (y + 20) + "px"
        panel.style.left = (x + 20) + "px"
    }*/
}

function createDestinationEmptySubPanel() {
    let destinationDiv = document.createElement("div")
    destinationDiv.classList.add("destination")
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

// Main

let addresses = lookUpAddresses()

browser.storage.local.get("address_places")
    .then( (result) => {
        let address_places = result.address_places
        createPanel(addresses, address_places)
    })
    .catch( e => console.log("Storage init failure! " + e));

let scores = computeMetrics(addresses)

//updatePanel(addresses, scores)

scores = Array.from({length: 40}, () => Math.random()) // TODO remove

updateHTML(addresses, scores)
