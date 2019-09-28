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
var nbAddresses = 0;
var cached_adresses = [];
var check_down = true;

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

function checkInArray(array, address) {
    console.log("checkInArray")
    for (let a of array){
        console.log(a.address)
        console.log(address)
        if (a.address === address)
            return true
    }
    return false
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
    console.log(addresses.length)
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

            current_selected_address = addresses[i]

            let pin = document.getElementById("pin")
            console.log(current_selected_address)
            console.log(cached_adresses)
            console.log(typeof pin.classList)

            if (!cached_adresses.includes(current_selected_address)){
                console.log("cached_adresses does not contains current selected")
            }

            if (checkInArray(cached_adresses, current_selected_address.address) && !pin.classList.contains("pin_selected")) {
                pin.classList.add("pin_selected")
            } else if (!checkInArray(cached_adresses, current_selected_address.address) && pin.classList.contains("pin_selected")) {
                console.log("remove selected")
                pin.classList.remove("pin_selected")
            }

            console.log("after")

            browser.runtime.sendMessage({"request" : "sendAddresses"})

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
        let score = addresses[i].footprint
        console.log(i)
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
    pin.style.zIndex = "300"

    pin.addEventListener("mousedown", function (event) {
        if (!pin.classList.contains("pin_selected")) {
            pin.classList.add("pin_selected")
            browser.runtime.sendMessage({"request" : "addAddress", "address" : current_selected_address})
            browser.runtime.sendMessage({"request" : "sendAddresses"})
        } else {
            pin.classList.remove("pin_selected")
            browser.runtime.sendMessage({"request" : "removeAddress", "address" : current_selected_address})
            browser.runtime.sendMessage({"request" : "sendAddresses"})
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


browser.runtime.onMessage.addListener(updateAddresses);

function updateAddresses(message) {
    console.log("updating number addresses")
    cached_adresses = message.Adresses
    nbAddresses = cached_adresses.length
    document.getElementById("checkout").innerHTML = `
        saved (${nbAddresses})
    `
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
<h1 style="text-align: center">Housing Summary</h1>
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

function fillSummary(){
    let summary = document.getElementById("summary")
    let to_fill = document.getElementById("to_fill")
    to_fill.innerHTML = ``;

    for (let a of cached_adresses) {
        let row = document.createElement("div")
        row.classList.add("row")

        let grid_a = document.createElement("div")
        grid_a.classList.add("grid-4")

        grid_a.innerHTML = `
            ${a.address}
        `
        row.appendChild(grid_a)

        let grid_b = document.createElement("div")
        grid_b.classList.add("grid-4")

        grid_b.innerHTML = `
            <a href=""> link to housing ad </a><hr>
        `
        row.appendChild(grid_b)

        to_fill.appendChild(row)
    }
}

function createCheckout(){
    let checkout = document.createElement("div")
    checkout.innerHTML = `
        saved (${nbAddresses})
    `
    checkout.style.height = "100px";
    checkout.style.width = "200px";
    checkout.style.backgroundColor = "rgba(255, 255, 255, .95)";
    checkout.style.textAlign = "center"
    checkout.style.fontSize = "40px";
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
            checkout.style.top = "30%";
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

            check_down = true
        }

    });

    document.body.prepend(checkout)
}

// add arguments and stuff, etc
createSummary()
createCheckout()

let addresses = lookUpAddresses()
createPanel(addresses)
computeMetrics(addresses)
updateHTML(addresses)

browser.runtime.sendMessage({"request" : "sendAddresses"})