async function calculate_car(dist) {
    //Takes a distance in KM and computes carbon footprint of a normal car
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
    return await response.json(); //extract JSON from the http response
}
async function calculate_distance(A, B) {
    //Take 2 GPS coordinates, compute shortest distance by car
    const position = A + ':' + B
    const response = await fetch('https://api.tomtom.com/routing/1/calculateRoute/' + position + '/json?key=AXsEsMCVKWN9Svf9spBR4y33MYxzaAXy')
    return await response.json();
}


//EXAMPLE
const pointA = "52.50931,13.42936"
const pointB = "52.50274,13.43872"
calculate_distance(pointA, pointB).then(function (distance) {
    console.log("Distance between A and B in meters: " + distance);
    calculate_car(Math.floor(distance / 1000)).then(function (carbon) {
        console.log("Carbon is " + carbon);
    })
});