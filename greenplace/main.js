import {
    calculate_distances,
    calculate_car,
    get_gps_loc
} from "./api_caller.js"

import { nearby } from "./nearby.js"

let DEFAULT_ID_PREFIX = "green_place_"

var hover_on = false;
var current_selected_address = null;

class Address {
    constructor(id, address) {
        this.id = id
        this.address = address
        this.all_footprints = {}
        this.footprint = 1
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
            elems[i].getElementsByClassName("value")[0].innerText.replace(/(?:\r\n|\r|\n)/g, ', '))
        arr.push(addr)
    }

    return arr
}

// Array(Address) -> List(eco-score)
async function computeMetrics(startingAddresses, destinationAddresses) {
    console.log("Computing metrics")
    let allPromises = Array()
    //compute GPS localization for all addresses
    const all_addresses = startingAddresses.concat(destinationAddresses)
    for (let addr of all_addresses) {
        var loc = get_gps_loc(addr.address)
        loc.then(function (val) {
            addr.lat = val[0];
            addr.lon = val[1];
        });
        allPromises.push(loc);
    }
    Promise.all(allPromises).then(function () {
        console.log(startingAddresses)
        allPromises = Array()
        calculate_distances(startingAddresses, destinationAddresses, 'car').then(function (distances) {
            for (var row in distances) {
                for (var col in distances[row]) {
                    console.log("Computing carbon for", startingAddresses[row].id, destinationAddresses[col].id)
                    let carbonPromise = calculate_car(distances[row][col].routeSummary.lengthInMeters / 1000)
                    allPromises.push(carbonPromise)
                }
            }
        })
        setTimeout(function () {
            Promise.all(allPromises).then(function (all_carbons) {
                let max_carbon = 0;
                console.log("Assigning carbon to paths, ", all_carbons)
                for (var i = 0; i < all_carbons.length; i++) {
                    console.log("Looking at carbon", i, destinationAddresses, destinationAddresses.length)
                    let col = i % destinationAddresses.length
                    let row = Math.floor(i / destinationAddresses.length)
                    console.log(`assigning carbon to [${row},${col}]`)
                    startingAddresses[row].all_footprints[destinationAddresses[col].id] = all_carbons[i]
                    if (all_carbons[i] > max_carbon){
                        max_carbon = all_carbons[i]
                    }
                }
                console.log("Sources addresses have become", startingAddresses)
                normalize(startingAddresses, max_carbon);
                updateHTML(startingAddresses)
            });
        }, 5000);

    }).catch(error => function () {
        console.log("Errors in promises:", error)
    });
}

function normalize(startingAddresses, max_carbon){
    console.log("Normalizing")
    for(var i in startingAddresses){
        for(var target in startingAddresses[i].all_footprints){
            startingAddresses[i].all_footprints[target] = startingAddresses[i].all_footprints[target]/max_carbon;
            startingAddresses[i].footprint = startingAddresses[i].all_footprints[target];
        }
    }
}

// List(eco-score) -> ()
function updateHTML(addresses) {
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
    for (let i = 0; i < length; ++i) {
        let parent = document.getElementById(addresses[i].id)
        parent.classList.add("address-parent")

        let element = document.getElementById(addresses[i].id).childNodes[0].childNodes[0]
        element.classList.add("address")

        element.addEventListener("mouseover", function(event) {
            var rect = event.target.getBoundingClientRect();

            // Update the properties of the element
            let panel = document.getElementById("panel-id")
            panel.style.opacity = 1
            panel.style.zIndex = 200
            panel.style.position = "fixed"
            panel.style.left = (rect.left - 60)+ "px"
            panel.style.top = (rect.top + 40) + "px"

            current_selected_address = i

            if (event.target.classList.contains("greenplace-underline-green")) {
                event.target.style.backgroundColor = "rgba(77, 214, 98, 0.3)"
                panel.childNodes[0].childNodes[0].style.backgroundColor = "rgba(77, 214, 98, .7)"
            } else if (event.target.classList.contains("greenplace-underline-yellow")) {
                event.target.style.backgroundColor = "rgba(253, 229, 77, 0.3)"
                panel.childNodes[0].childNodes[0].style.backgroundColor = "rgba(253, 229, 77, .7)"
            } else {
                event.target.style.backgroundColor = "rgba(220, 57, 55, 0.3)"
                panel.childNodes[0].childNodes[0].style.backgroundColor = "rgba(220, 57, 55, .7)"
            }

            // Update the content according to the address object
            hover_on = true
        })

        element.addEventListener("mouseout", function(event) {
            let panel = document.getElementById("panel-id")
            panel.style.opacity = 0

            if (event.target.classList.contains("greenplace-underline-green")) {
                event.target.style.backgroundColor = "rgba(77, 214, 98, 0)"
            } else if (event.target.classList.contains("greenplace-underline-yellow")) {
                event.target.style.backgroundColor = "rgba(253, 229, 77, 0)"
            } else {
                event.target.style.backgroundColor = "rgba(220, 57, 55, 0)"
            }
        })

        // Set appropriate color style
        let score = addresses[i].footprint
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
function createPanel(addresses, address_places, car_boolean) {
    var style = document.createElement("style")
    style.id = "panel-style"

    style.innerHTML = `
        .panel-content {
            position: relative;
            background-color: white;
            background-clip: content-box;
            border-radius: 30px;
            height: ` + (80 + 130 * address_places.length) + `px;
        }
        #panel-id {
            opacity: 0;
            position : fixed;
        }

        .overlay {
            z-index: 199;
            position:relative;
            display:block;
        }

        .panel {
            padding-top:20px;
            width: 250px;
            box-sizing: padding-box;
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
    let panelContent = document.createElement("div")

    panel.style.transitionProperty = "opacity"
    panel.style.transitionDuration = ".15s"
    panel.isMouseOver = false

    panel.addEventListener("onemouseover", function (event) {
        panel.isMouseOver = true;
    })

    panel.addEventListener("onmouseleave", function (event) {
        panel.isMouseOver = false;
    })

    panel.addEventListener("mouseover", function (event) {
        if (hover_on) {
            panel.style.opacity = 1
            panel.target.style.zIndex = 200
        }
    });

    panel.addEventListener("mouseleave", function (event) {
        hover_on = false
        panel.style.zIndex = -1
        panel.style.opacity = 0
    });

    let footprint = document.createElement("div")
    let leaf = document.createElement("img")
    let pin = document.createElement("img")
    pin.id = "pin"

    pin.addEventListener("onmousedown", function (event) {
        if (!pin.classList.contains("pin_selected")) {
            pin.classList.add("pin_selected")
            browser.runtime.sendMessage({"request": "addAddress", "address" : addresses[current_selected_address]})
        } else {
            pin.classList.remove("pin_selected")
            browser.runtime.sendMessage({"request": "removeAddress", "address" : addresses[current_selected_address]})
        }
    });
    let percentage = document.createElement("div")

    panel.id = "panel-id"
    panelContent.id = "panel-content"
    footprint.classList.add("footprint")
    leaf.classList.add("leaf")
    pin.classList.add("pin")
    percentage.classList.add("percentage")
    panelContent.classList.add("panel-content")
    panelContent.classList.add("overlay")
    panelContent.classList.add("panel")

    leaf.src = "https://cdn2.iconfinder.com/data/icons/love-nature/600/green-Leaves-nature-leaf-tree-garden-environnement-512.png"

    pin.src = "http://simpleicon.com/wp-content/uploads/pin.png"

    // TODO set empty text first, and modify once we have score
    percentage.textContent = "74%"

    footprint.appendChild(leaf)
    footprint.appendChild(pin)
    footprint.appendChild(percentage)
    panelContent.appendChild(footprint)

    panel.appendChild(panelContent)

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
        if (car_boolean) {
            publicTransportIcon.src = "https://static.thenounproject.com/png/72-200.png"
        } else {
            publicTransportIcon.src = "https://cdn4.iconfinder.com/data/icons/aiga-symbol-signs/439/Aiga_bus-512.png"
        }

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

    panelContent.appendChild(details)

    document.body.prepend(panel)
}

// Main
let addresses = lookUpAddresses()
browser.storage.local.get("address_places")
    .then( (result) => {
        let address_places = result.address_places
        browser.storage.local.get("car_boolean")
            .then( (result) => {
                createPanel(addresses, address_places, result.car_boolean)
            })
    })
    .catch( e => console.log("Storage init failure! " + e));
computeMetrics(addresses)
updateHTML(addresses)
