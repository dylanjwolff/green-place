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
    console.log("Compute distance")
    var origins = Array()
    for (var addr of src) {
        origins.push({
            point: {
                latitude: addr.lat,
                longitude: addr.lon
            }
        })
    }
    var destinations = Array()
    for (var addr of dst) {
        destinations.push({
            point: {
                latitude: addr.lat,
                longitude: addr.lon
            }
        })
    }
    var req = tomtom.services.matrixRouting({
        key: "AXsEsMCVKWN9Svf9spBR4y33MYxzaAXy",
        origins: origins,
        destinations: destinations,
        travelMode: mode
    })
    return await req.go()
}

/**
 * Take a human-readable address and modifies it to GPS (lat,lon) coordinates.
 * @param {string} address Human-readable address
 */
export async function get_gps_loc(address) {
    // console.log(`Searching GPS loc of ${address}`)
    if (address.indexOf(" ") > -1) {
        address = encodeURI(address)
    }
    const response = await fetch(`https://nominatim.openstreetmap.org/search?q=${address}&format=json`)
    const resp_json = await response.json()
    const first_res = resp_json[0]
    return [first_res.lat, first_res.lon]
}