import {
    calculate_distances,
    calculate_car,
    geoloc_place
} from "./api_caller.js"
import {
    nearby
} from "./nearby.js"

const GOOGLE_FEATURE_FLAG = false
const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
let DEFAULT_ID_PREFIX = "green_place_"

var hover_on = false;
var current_selected_address = null;
var nbAddresses = 0;
var cached_adresses = [];
var check_down = true;

class BaseAddress {
    constructor(address) {
        this.address = address
    }
}
class OriginAddress extends BaseAddress {
    constructor(id, address, parent_link, timestamp) {
        super(address)
        this.id = id
        this.all_footprints = {}
        this.footprint = 1
        this.parent_link = parent_link
        this.timestamp = timestamp
    }
}

class DestinationAddress extends BaseAddress {
    constructor(address, tag, freq) {
        super(address)
        this.freq = freq
        this.tag = tag
    }
}

// () -> Array(Address)
function lookUpAddresses() {
    try {
        document.getElementById("resultItemPanel0").remove() // remove first ad
    } catch {}

    let elems = document.getElementsByClassName("list-item--address")

    var arr = new Array()
    let length = elems.length
    for (var i = 0; i < length; ++i) {
        elems[i].getElementsByClassName("value")[0].id = DEFAULT_ID_PREFIX + i
        let ancestor_link = elems[i].closest("a")
        //console.log(ancestor_link)
        var timestamp = new Date()
        let addr = new OriginAddress(
            elems[i].getElementsByClassName("value")[0].id,
            elems[i].getElementsByClassName("value")[0].innerText.replace(/(?:\r\n|\r|\n)/g, ', '),
            ancestor_link.href, days[timestamp.getDay()])
        arr.push(addr)
    }

    return arr
}

function checkInArray(array, address) {
    console.log("checkInArray")
    for (let a of array) {
        console.log(a.address)
        console.log(address)
        if (a.address === address)
            return true
    }
    return false
}

async function get_gps_all_addresses(all_places) {
    console.log("Starting to localize all addresses")
    var allPromises = new Array()
    for (var place of all_places) {
        let prom = geoloc_place(place)
        // prom.catch(() => {
        // place.found=false
        // })
        // if(place.found){
        allPromises.push(prom);
        // }
    }
    console.log("All gps computation launched:", allPromises)
    let pr = Promise.all(allPromises)
    console.log("inside pr=", pr)
    return pr
}

// Array(Address) -> List(eco-score)
async function computeMetrics(startPlaces, dstPlaces) {
    console.log("Computing metrics")
    //compute GPS localization for all addresses
    const allPlaces = startPlaces.concat(dstPlaces);
    let pr = await get_gps_all_addresses(allPlaces);

    //wait for all geoloc to be over
    await Promise.all(pr)
    console.log("startPlaces was length", startPlaces.length)
    startPlaces = startPlaces.filter((elem) => {
        return elem.found;
    })
    console.log("startPlaces is now", startPlaces.length)

    startPlaces = startPlaces.map(sp => {
        sp.poi = [];
        return sp
    })

    if (GOOGLE_FEATURE_FLAG) {
        startPlaces.map(sp => {
            nearby(sp.lat, sp.lon, "grocery")
                .then(res => {
                    sp.poi.push({
                        tag: "grocery",
                        lat: res.lat,
                        lon: res.lng
                    });
                    return sp
                })
                .catch(e => "poi err" + e)
        })
        startPlaces = await Promise.all(startPlaces)
    } else {
        startPlaces = startPlaces.map(sp => {
            sp.poi.push({
                lat: "47.3723941",
                lon: "8.5423328",
                tag: "grocery"
            });
            return sp
        })
    }

    console.log("startPlaces ", startPlaces)
    //Compute the distance matrix
    let allPromises = new Array()
    const carDistProm = calculate_distances(startPlaces, dstPlaces, 'car')
    const bikeDistProm = calculate_distances(startPlaces, dstPlaces, 'bicycle')
    const carDistances = await carDistProm
    const bikeDistances = await bikeDistProm
    console.log(carDistances, bikeDistances)
    //compute the car carbon footprint for each
    for (let row in carDistances) {
        startPlaces[row].times = {}
        for (let col in carDistances[row]) {
            console.log("Computing carbon for", startPlaces[row].id, dstPlaces[col].tag)
            startPlaces[row].times[dstPlaces[col].tag] = {
                bike: bikeDistances[row][col].routeSummary.travelTimeInSeconds,
                car: carDistances[row][col].routeSummary.travelTimeInSeconds
            }
            let carbonPromise = calculate_car(carDistances[row][col].routeSummary.lengthInMeters / 1000)
            allPromises.push(carbonPromise)
        }
    }
    let allCarbons = await Promise.all(allPromises)
    console.log("Assigning carbon to paths, ", allCarbons)
    let max_carbon = {}
    for (let i in dstPlaces) {
        max_carbon[dstPlaces[i].tag] = 0;
    }
    for (var i = 0; i < allCarbons.length; i++) {
        //determine equivalent to matrix view
        let col = i % dstPlaces.length
        let row = Math.floor(i / dstPlaces.length)

        startPlaces[row].all_footprints[dstPlaces[col].tag] = allCarbons[i]
        if (allCarbons[i] > max_carbon[dstPlaces[col].tag]) {
            max_carbon[dstPlaces[col].tag] = allCarbons[i]
        }
    }

    //update footprint with weighted average
    for (let place of startPlaces) {
        let globalFootprint = 0
        console.log("Computing footprint for", place)
        for (const dstTag in place.all_footprints) {
            const tagFreq = dstPlaces.filter((el) => {
                return el.tag == dstTag
            })[0].freq
            console.log("Corresponding freq is ", tagFreq)
            globalFootprint += place.all_footprints[dstTag] * tagFreq
            console.log("Global footprint is", globalFootprint)
        }
        console.log("Setting footprint:", globalFootprint)
        place.footprint = globalFootprint
    }
    console.log("Sources addresses have become", startPlaces)
    normalize(startPlaces, max_carbon);
}

function normalize(startPlaces, max_carbon) {
    console.log("Normalizing with max_carbon", max_carbon)
    for (var i in startPlaces) {
        for (var target in startPlaces[i].all_footprints) {
            startPlaces[i].all_footprints[target] = startPlaces[i].all_footprints[target] / max_carbon[target];
            startPlaces[i].footprint = startPlaces[i].all_footprints[target];
        }
    }
}

// List(eco-score) -> ()
function updateHTML(addresses, destPlaces) {
    console.log("updateHTML started")

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
    console.log("before")
    console.log(addresses.length)
    for (let i = 0; i < length; ++i) {
        let parent = document.getElementById(addresses[i].id)
        parent.classList.add("address-parent")

        let element = document.getElementById(addresses[i].id).childNodes[0].childNodes[0]
        element.classList.add("address")


        element.addEventListener("mouseover", function (event) {
            var rect = event.target.getBoundingClientRect();

            // Update the properties of the element
            let panel = document.getElementById("panel-id")
            panel.style.opacity = 1
            panel.style.zIndex = 200
            panel.style.position = "fixed"
            panel.style.left = (rect.left - 60) + "px"
            panel.style.top = (rect.top + 40) + "px"

            current_selected_address = addresses[i]

            let percentage = document.getElementById("percentage")
            percentage.textContent = Math.floor(100 * (1 - addresses[i].footprint)) + "%"

            for (var j = 0; j < destPlaces.length; ++j) {
                let tag = destPlaces[j].tag

                let bikeDetails = document.getElementById("bikeDetails_" + tag)
                bikeDetails.textContent = Math.floor(addresses[i].times[tag].bike / 60) + " min"

                let publicTransportDetails = document.getElementById("publicTransportDetails_" + tag)
                publicTransportDetails.textContent = Math.floor(addresses[i].times[tag].car / 60) + " min"
            }

            let pin = document.getElementById("pin")
            console.log(current_selected_address)
            console.log(cached_adresses)
            console.log(typeof pin.classList)

            if (!cached_adresses.includes(current_selected_address)) {
                console.log("cached_adresses does not contains current selected")
            }

            if (checkInArray(cached_adresses, current_selected_address.address) && !pin.classList.contains("pin_selected")) {
                pin.classList.add("pin_selected")
            } else if (!checkInArray(cached_adresses, current_selected_address.address) && pin.classList.contains("pin_selected")) {
                console.log("remove selected")
                pin.classList.remove("pin_selected")
            }

            console.log("after")

            browser.runtime.sendMessage({
                "request": "sendAddresses"
            })

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

        element.addEventListener("mouseout", function (event) {
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
        console.log("score " + score)
        if (score >= 0.8) {
            element.classList.add("greenplace-underline-red")
        } else if (score >= 0.75) {
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
    console.log("updateHTML done")
}

// List(address) -> ()
async function createPanel(addresses, address_places, car_boolean) {
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
    panel.style.addresstransitionDuration = ".15s"
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
    pin.style.zIndex = "300"

    pin.addEventListener("mousedown", function (event) {
        if (!pin.classList.contains("pin_selected")) {
            pin.classList.add("pin_selected")
            browser.runtime.sendMessage({
                "request": "addAddress",
                "address": current_selected_address
            })
            browser.runtime.sendMessage({
                "request": "sendAddresses"
            })
        } else {
            pin.classList.remove("pin_selected")
            browser.runtime.sendMessage({
                "request": "removeAddress",
                "address": current_selected_address
            })
            browser.runtime.sendMessage({
                "request": "sendAddresses"
            })
        }
    });

    let percentage = document.createElement("div")

    panel.id = "panel-id"
    panelContent.id = "panel-content"
    percentage.id = "percentage"
    footprint.classList.add("footprint")
    leaf.classList.add("leaf")
    pin.classList.add("pin")
    percentage.classList.add("percentage")
    panelContent.classList.add("panel-content")
    panelContent.classList.add("overlay")
    panelContent.classList.add("panel")

    leaf.src = "https://cdn2.iconfinder.com/data/icons/love-nature/600/green-Leaves-nature-leaf-tree-garden-environnement-512.png"

    pin.src = "https://cdn3.iconfinder.com/data/icons/pix-glyph-set/50/520769-paper_pin-512.png"

    percentage.textContent = "0%"

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
        bikeDetails.id = "bikeDetails_" + address_places[i].tag
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
        publicTransportDetails.id = "publicTransportDetails_" + address_places[i].tag
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



browser.runtime.onMessage.addListener(updateAddresses);

function updateAddresses(message) {
    cached_adresses = message.Adresses
    nbAddresses = cached_adresses.length
    document.getElementById("checkout").innerHTML = `
        saved (${nbAddresses})
    `
    console.log("updating number addresses done")
}

function createSummary() {
    let summary = document.createElement("div")
    summary.innerHTML = `
    <!-- stylesheets -->
    <link rel="stylesheet" href="style.css" type="text/css" />
    <!-- favicon -->

    <!-- just in case viewer is using Internet Explorer -->
    <!--[if IE]><script src="http://html5shiv.googlecode.com/svn/trunk/html5.js"></script><![endif]-->
<!-- Header-->
<h1 style="text-align: center">Green Palaces in the making ;)</h1>
<br>

<!-- main container -->
<div class="container">
    <section class="Housing Summary">
        <div class="container" id="to_fill">
        </div>
    </section>
</div>
<!-- End Main Container -->

</body>
</html>`
    summary.style.left = "25%";
    summary.style.top = "100%";
    summary.style.opacity = 1;
    summary.style.zIndex = 500;
    summary.style.backgroundColor = "rgba(255, 255, 255, .95)";
    summary.style.height = "75%";
    summary.style.width = "50%";
    summary.style.position = "fixed";
    summary.id = "summary";
    summary.style.overflow = "hidden";

    document.body.prepend(summary)
}

function fillSummary() {
    let summary = document.getElementById("summary")
    let to_fill = document.getElementById("to_fill")
    to_fill.innerHTML = ``;

    for (let a of cached_adresses) {
        let row = document.createElement("div")
        row.classList.add("row")
        row.style.padding = "20px";

        let grid_a = document.createElement("div")
        grid_a.classList.add("grid-4")

        let container_a = document.createElement("div")
        container_a.classList.add("container")

        container_a.innerHTML = `
            ${a.address}
        `

        grid_a.appendChild(container_a)
        row.appendChild(grid_a)

        let grid_b = document.createElement("div")
        grid_b.classList.add("grid-4")

        let container_b = document.createElement("div")
        container_b.classList.add("container")

        container_b.innerHTML = `
            <a href="${a.parent_link}"> ${a.parent_link} </a>
        `

        grid_b.appendChild(container_b)

        let container_c = document.createElement("div")
        container_c.classList.add("container")

        container_c.innerHTML = `
           <strong style="text-align: right"> added on ${a.timestamp} </strong><hr>
        `

        grid_b.appendChild(container_c)
        row.appendChild(grid_b)

        to_fill.appendChild(row)
    }
}

function createCheckout() {
    let checkout = document.createElement("div")
    checkout.innerHTML = `
        saved (${nbAddresses})
    `
    checkout.style.height = "200px";
    checkout.style.width = "200px";
    checkout.style.backgroundColor = "rgba(255, 255, 255, .95)";
    checkout.style.textAlign = "center"
    checkout.style.fontSize = "40px";
    checkout.style.borderRadius = "30px";
    checkout.style.borderTop = "solid 3px gray"

    checkout.style.fontSize = "helvetica"
    checkout.style.zIndex = "400";
    checkout.style.position = "fixed"
    checkout.style.left = "45%";
    checkout.style.top = "90%";
    checkout.id = "checkout"

    checkout.addEventListener("mousedown", function (event) {
        console.log("mousedown")
        if (check_down) {
            let summary = document.getElementById("summary")
            checkout.style.top = "28%";
            checkout.style.transitionProperty = "top";
            checkout.style.transitionDuration = ".6s";
            checkout.innerHTML = `
                fold down
            `

            summary.style.top = "35%";
            summary.style.transitionProperty = "top";
            summary.style.transitionDuration = ".6s";

            check_down = false
            fillSummary()
        } else {
            let summary = document.getElementById("summary")

            checkout.style.top = "90%";
            checkout.style.transitionProperty = "top";
            checkout.style.transitionDuration = ".6s";
            checkout.innerHTML = `
                saved (${nbAddresses})
            `

            summary.style.top = "100%";
            summary.style.transitionProperty = "top";
            summary.style.transitionDuration = ".6s";
            summary.style.borderRadius = "30px";
            summary.style.borderTop = "solid 3px gray"

            check_down = true
        }

    });

    document.body.prepend(checkout)
}

function underlineWaiting(addresses) {
    var style = document.createElement("style")
    style.innerHTML = `
        .greenplace-underline-waiting {
            display: inline-block;
            border-bottom: 6px solid #DDDDDD;
            border-radius: 5px;
        }
    `
    document.getElementsByTagName('head')[0].appendChild(style)

    for (var i = 0; i < addresses.length; ++i) {
        let under = document.getElementById(addresses[i].id).childNodes[0].childNodes[0]
        under.classList.add("greenplace-underline-waiting")
    }
}

// add arguments and stuff, etc
createSummary()
createCheckout()


/*
let addresses = lookUpAddresses()
createPanel(addresses)
computeMetrics(addresses)
console.log("computeMetrics")
updateHTML(addresses)
console.log("UpdateHTML done")
browser.runtime.sendMessage({"request" : "sendAddresses"})
 */

// Main
let startPlaces = lookUpAddresses()
if (startPlaces.length > 0) {

    underlineWaiting(startPlaces)
    browser.runtime.sendMessage({
        "request": "sendAddresses"
    })

    let destPlaces = []
    browser.storage.local.get("address_places")
        .then((result) => {
            destPlaces = result.address_places
            console.log(destPlaces)
            browser.storage.local.get("car_boolean")
                .then((result) => {
                    console.log("About to create panel")
                    createPanel(startPlaces, destPlaces, result.car_boolean)
                })
            if (destPlaces.length > 0) {
                computeMetrics(startPlaces, destPlaces).then(() => {
                    console.log("Updating html")
                    updateHTML(startPlaces, destPlaces)
                })
            }
        })
        .catch(error => console.log("Storage init failure! " + error));
}
