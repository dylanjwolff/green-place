const tomtom = require('@tomtom-international/web-sdk-services')
/**
 * Compute the carbon footprint of a car on a given distance.
 * @param {number} dist Rounded distance in kilometers (~integer)
 */
export async function calculate_car(dist) {
    //Takes a distance in KM and computes carbon footprint of a normal car
    if (dist < 1) {
        dist = 1;
    }
    try {
        const response = await fetch('https://climate-api-test.dakar.moccu.net/api/calculate?api-key=2947ee2d-bca1-4bc4-aa81-017ca40cb5b3', {
            method: "POST",
            headers: {
                'Content-Type': "application/json"
            },
            body: JSON.stringify({
                "calculation": {
                    "type": "car-simple-calculation-8",
                    "car_type": "mittel",
                    "kilometers": dist
                }
            })
        })
        const resp_json = await response.json(); //extract JSON from the http response
        return resp_json.result
    } catch (error) {
        return dist / 5
    }
}
/**
 * Compute the matrix of distances/times between origins and destinations locations
 * @param {[Address]} src List of addresses as starting points
 * @param {[Address]} dst List of addresses as destination points
 * @param {String} mode Mean of transportation. Possible values: `car, truck, taxi, bus, van, motorcycle, bicycle, pedestrian`
 */
export async function calculate_distances(src, dst, mode = "car") {
    console.log(`[${mode}]Compute distance`)
    var origins = Array()
    for (var addr of src) {
        origins.push({
            point: {
                latitude: addr.lat,
                longitude: addr.lon
            }
        })
    }
    console.log(`[${mode}]Origins points created`)
    var destinations = Array()
    for (var addr of dst) {
        destinations.push({
            point: {
                latitude: addr.lat,
                longitude: addr.lon
            }
        })
    }
    console.log(`[${mode}]Destination points created`)
    var req = tomtom.services.matrixRouting({
        key: "Tp0r2ThYEIXweY2egqz7wIjGDABSAe8C",
        origins: origins,
        destinations: destinations,
        travelMode: mode,
        traffic: false
    })
    console.log(`[${mode}]Tomtom req`, req)
    let tomtomRes = await req.go()
    console.log(`[${mode}]Tomtom res is `, tomtomRes)
    return tomtomRes
}

/**
 * Take a human-readable address and modifies it to GPS (lat,lon) coordinates.
 * @param {Address} address Human-readable address
 */
export async function geoloc_place(place) {
    // console.log(place)
    let human_address = place.address
    if (human_address.indexOf(" ") > -1) {
        human_address = encodeURI(place.address)
    }
    // console.log(human_address)
    const response = await fetch(`https://nominatim.openstreetmap.org/search?q=${human_address}&format=json`, {
        cache: "force-cache"
    })
    console.log(`[${place.address}]Response:`, response)
    const resp_json = await response.json()
    // console.log(`[${place.address}]Resp_json:`, resp_json)
    if (resp_json.length == 0) {
        console.log("Not found", place)
        place.found = false;
    } else {
        place.found = true;
        const first_res = resp_json[0];
        // console.log(`[${place.address}]First res:`, first_res);
        place.lat = first_res.lat;
        place.lon = first_res.lon;
    }
}