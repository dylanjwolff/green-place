import {
    update
} from "./update.js"
import {
    calculate_distances,
    calculate_car,
    get_gps_loc
} from "./api_caller.js"
document.body.style.border = "5px solid red";

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
            //panel.style.zIndex = -1


            if (event.target.classList.contains("greenplace-underline-green")) {
                event.target.style.backgroundColor = "rgba(77, 214, 98, 0)"
            } else if (event.target.classList.contains("greenplace-underline-yellow")) {
                event.target.style.backgroundColor = "rgba(253, 229, 77, 0)"
            } else {
                event.target.style.backgroundColor = "rgba(220, 57, 55, 0)"
            }

        })

        // Set appropriate color style
        //TODO don't use scores, use address.footprint
        let score = addresses[i].footprint
        console.log(score)
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
        .panel-content {
            position: relative;
            background-color: white;
            background-clip: content-box;
            border-radius: 30px;
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
            height: 460px;
            box-sizing: padding-box;
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

    percentage.textContent = "74%"

    footprint.appendChild(leaf)
    footprint.appendChild(pin)
    footprint.appendChild(percentage)
    panelContent.appendChild(footprint)

    panel.appendChild(panelContent)

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
computeMetrics(addresses)
updateHTML(addresses)