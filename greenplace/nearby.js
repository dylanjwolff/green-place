const API_KEY = "AIzaSyCFoGLx9c9qeCFVor3TqDjlji5hz1UK6lU"
const NEARBY_SEARCH = new URL("https://maps.googleapis.com/maps/api/place/nearbysearch/json")

export function nearby(lat, lng, term) {

        var url = NEARBY_SEARCH

        let location = lat + "," + lng
        var params = {location: location, radius: 1500, keyword: term,  key: API_KEY}

        url.search = new URLSearchParams(params)
        return fetch(url).then( resp => resp.json())
                .then( resp => { 
                    if (resp.status != "OK"){
                           return Promise.reject("Received status from google " + resp.status)
                    } else { return resp }})
                .then( resp => resp.results[0].geometry.location ) // Just return the latitude and longitude of the first result
                .catch( e => "api call err: " + e )

}

// EXAMPLE USAGE
// let lat = 47.3898339
// let lng = 8.5155828
// let term = "grocery"
// nearby(lat, lng, term).then( res => console.log(res) )
