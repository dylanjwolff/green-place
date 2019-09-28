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
        }
    }
}

// List(eco-score) -> ()
function updateHTML(addresses) {
    console.log("Updating HTML")
    for (var addr of addresses) {
        // console.log(addresses[i].id)
        let element = document.getElementById(addr.id).childNodes[0].childNodes[0]
        element.classList.add("address")
        element.style.backgroundColor = colorFromScore(addr.footprint)
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
console.log("Before lookup")
let startingAddresses = lookUpAddresses()
console.log("After lookup")

let destinationAddresses = [new Address("WORK", "Röntgenstrasse 22, 8005 Zürich")]
computeMetrics(startingAddresses, destinationAddresses);

// Example of how to call function from another file now that webpack is set up

// update()