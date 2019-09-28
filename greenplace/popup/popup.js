function add_row_to_display(tag, address, freq){
            let table = document.getElementById("myTable");
            let row = table.insertRow();
            let tag_cell = row.insertCell(0);
            let address_cell = row.insertCell(1);
            let freq_cell = row.insertCell(2);
            tag_cell.innerHTML = tag
            address_cell.innerHTML = address
            freq_cell.innerHTML = freq
}

function delete_rows(){
        let table = document.getElementById("myTable")
        let num_rows = table.rows.length // first row is header
        for(let i = num_rows - 1; i > 0; i--){ table.deleteRow(i) }
}

function listenForClicks() {
  document.addEventListener("click", (e) => {

        function add_address() {
            let address = document.getElementById("address").value;
            let tag = document.getElementById("tag").value;
            let freq = document.getElementById("freq").value;

            browser.storage.local.get("address_places").then(
                    (result) => {
                            let address_places = result.address_places
                            console.log(JSON.stringify(address_places))
                            address_places.push({address: address, tag: tag, freq: freq})
                            return browser.storage.local.set({address_places: address_places})
                    }
            ).catch( (e) => console.log("Storage add error " + e) )

            add_row_to_display(tag, address, freq)
        }

        function clear_addresses(){
                browser.storage.local.clear().then( () => {
                    return browser.storage.local.set({address_places: []})
                }).catch( (e) => console.log("Storage clear error " + e) )
                delete_rows()

        }

        let event_name = e.target.id
        switch (event_name) {
                case "add_address":
                        add_address(); break;
                case "clear_addresses":
                        clear_addresses(); break;
        }

  })
}

var input = document.getElementById('toggleswitch');
var outputtext = document.getElementById('status');

input.addEventListener('change', function() {
    if (this.checked) {
        browser.storage.local.set({car_boolean: true})
            .catch( (e) => console.log("Storage add error " + e) )
        outputtext.innerHTML = "I have a car"
    } else {
        browser.storage.local.set({car_boolean: false})
            .catch( (e) => console.log("Storage add error " + e) )
        outputtext.innerHTML = "I don't have a car"
    }
});

var inputGrocery = document.getElementById("groceryswitch")

inputGrocery.addEventListener("change", function() {
    if (this.checked) {
        browser.storage.local.set({grocery_boolean: true})
            .catch( (e) => console.log("Storage add error " + e))
    } else {
        browser.storage.local.set({grocery_boolean: false})
            .catch( (e) => console.log("Storage add error " + e))
    }
})

browser.storage.local.get("address_places")
        .then( (result) => {
                let address_places = result.address_places
                address_places.map( (place) => {
                        add_row_to_display(place.tag, place.address, place.freq)
                })
        })
        .catch( () => {
                return browser.storage.local.set({address_places: []}) })
        .then(() => listenForClicks())
        .catch( e => console.log("Storage init failure! " + e));

browser.storage.local.get("car_boolean")
    .then( (result) => {
        let car_boolean = result.car_boolean
        input.checked = car_boolean
        if (car_boolean) {
            outputtext.innerHTML = "I have a car"
        } else {
            outputtext.innerHTML = "I don't have a car"
        }
    })
    .catch ( () => {
        return browser.storage.local.set({car_boolean: false})
    })
    .catch( (e) => console.log("Storage add error " + e) )

browser.storage.local.get("grocery_boolean")
    .then( (result) => {
        inputGrocery.checked = result.grocery_boolean
    })
    .catch ( () => {
        return browser.storage.local.set({grocery_boolean: false})
    })
    .catch( (e) => console.log("Storage add error " + e) )
