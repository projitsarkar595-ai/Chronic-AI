/* =========================================================
   CIVICAI — OFFLINE RESOURCE CENTER
   ========================================================= */

"use strict";


/* =========================================================
   CONFIG
   ========================================================= */

const RESOURCE_CONFIG = {

    defaultLocation: {
        lat: 22.5726,
        lng: 88.3639
    },

    defaultZoom: 13,

    overpassEndpoints: [
        "https://overpass-api.de/api/interpreter",
        "https://overpass.kumi.systems/api/interpreter"
    ]

};


/* =========================================================
   STATE
   ========================================================= */

let map = null;

let userMarker = null;

let accuracyCircle = null;

let resourceMarkers = [];

let resources = [];

let currentFilter = "all";

let currentRadius = 5;

let userLocation = null;


/* =========================================================
   DOM
   ========================================================= */

const locateBtn =
    document.getElementById("locateBtn");

const refreshBtn =
    document.getElementById("refreshBtn");

const centerMapBtn =
    document.getElementById("centerMapBtn");

const locationStatus =
    document.getElementById("locationStatus");

const mapStatus =
    document.getElementById("mapStatus");

const resourceList =
    document.getElementById("resourceList");

const resourceCount =
    document.getElementById("resourceCount");

const distanceFilter =
    document.getElementById("distanceFilter");

const filterButtons =
    document.querySelectorAll(".filter-btn");


/* =========================================================
   RESOURCE TYPE CONFIG
   ========================================================= */

const TYPE_CONFIG = {

    hospital: {
        label: "Hospital",
        icon: "fa-hospital",
        color: "#4da3ff"
    },

    police: {
        label: "Police Station",
        icon: "fa-shield-halved",
        color: "#8b7cff"
    },

    fire: {
        label: "Fire Station",
        icon: "fa-fire-extinguisher",
        color: "#ff6b5e"
    },

    government: {
        label: "Government Office",
        icon: "fa-building-columns",
        color: "#35d49a"
    },

    relief: {
        label: "Relief Center",
        icon: "fa-hand-holding-heart",
        color: "#ffb14a"
    }

};


/* =========================================================
   INITIALIZE
   ========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        initializeMap();

        bindEvents();

        loadCachedLocation();

    }
);


/* =========================================================
   MAP
   ========================================================= */

function initializeMap() {

    map = L.map(
        "resourceMap",
        {
            zoomControl: true
        }
    ).setView(
        [
            RESOURCE_CONFIG.defaultLocation.lat,
            RESOURCE_CONFIG.defaultLocation.lng
        ],
        RESOURCE_CONFIG.defaultZoom
    );


    L.tileLayer(
        "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        {
            maxZoom: 19,

            attribution:
                '&copy; OpenStreetMap contributors'
        }
    ).addTo(map);


    mapStatus.textContent = "Ready";

}


/* =========================================================
   EVENTS
   ========================================================= */

function bindEvents() {

    locateBtn.addEventListener(
        "click",
        getUserLocation
    );


    refreshBtn.addEventListener(
        "click",
        () => {

            if (!userLocation) {

                getUserLocation();

                return;

            }

            loadNearbyResources();

        }
    );


    centerMapBtn.addEventListener(
        "click",
        centerOnUser
    );


    distanceFilter.addEventListener(
        "change",
        () => {

            currentRadius =
                Number(
                    distanceFilter.value
                );

            if (userLocation) {

                loadNearbyResources();

            }

        }
    );


    filterButtons.forEach(
        button => {

            button.addEventListener(
                "click",
                () => {

                    filterButtons.forEach(
                        item =>
                            item.classList.remove(
                                "active"
                            )
                    );


                    button.classList.add(
                        "active"
                    );


                    currentFilter =
                        button.dataset.type;


                    renderResources();

                }
            );

        }
    );

}


/* =========================================================
   LOCATION
   ========================================================= */

function getUserLocation() {

    if (
        !navigator.geolocation
    ) {

        showLocationError(
            "Your browser does not support location services."
        );

        return;

    }


    setLocationStatus(
        "Requesting your location...",
        "normal"
    );


    locateBtn.disabled = true;


    navigator.geolocation.getCurrentPosition(

        position => {

            const lat =
                position.coords.latitude;

            const lng =
                position.coords.longitude;

            const accuracy =
                position.coords.accuracy;


            userLocation = {
                lat,
                lng,
                accuracy
            };


            saveLocation(
                userLocation
            );


            updateUserMarker(
                lat,
                lng,
                accuracy
            );


            map.setView(
                [lat, lng],
                14,
                {
                    animate: true
                }
            );


            setLocationStatus(
                `Location detected ±${Math.round(accuracy)}m`,
                "success"
            );


            loadNearbyResources();

            locateBtn.disabled = false;

        },

        error => {

            locateBtn.disabled = false;

            let message =
                "Unable to get your location.";


            if (
                error.code ===
                error.PERMISSION_DENIED
            ) {

                message =
                    "Location permission was denied. Please allow location access.";

            }

            else if (
                error.code ===
                error.POSITION_UNAVAILABLE
            ) {

                message =
                    "Your location is currently unavailable.";

            }

            else if (
                error.code ===
                error.TIMEOUT
            ) {

                message =
                    "Location request timed out. Please try again.";

            }


            showLocationError(
                message
            );

        },

        {
            enableHighAccuracy: true,

            timeout: 15000,

            maximumAge: 30000
        }

    );

}


/* =========================================================
   USER MARKER
   ========================================================= */

function updateUserMarker(
    lat,
    lng,
    accuracy
) {

    if (userMarker) {

        map.removeLayer(
            userMarker
        );

    }


    if (accuracyCircle) {

        map.removeLayer(
            accuracyCircle
        );

    }


    const icon =
        L.divIcon({

            className:
                "civic-user-marker",

            html: `
                <div style="
                    width:18px;
                    height:18px;
                    border-radius:50%;
                    background:#4da3ff;
                    border:3px solid white;
                    box-shadow:
                        0 0 0 8px rgba(77,163,255,.18),
                        0 0 25px rgba(77,163,255,.8);
                "></div>
            `,

            iconSize: [18,18],

            iconAnchor: [9,9]

        });


    userMarker =
        L.marker(
            [lat, lng],
            {
                icon
            }
        )
        .addTo(map)
        .bindPopup(
            `
                <div class="popup-title">
                    Your Location
                </div>

                <div class="popup-type">
                    CivicAI detected location
                </div>
            `
        );


    accuracyCircle =
        L.circle(
            [lat, lng],
            {
                radius: accuracy,

                color: "#4da3ff",

                fillColor: "#4da3ff",

                fillOpacity: 0.06,

                weight: 1
            }
        )
        .addTo(map);

}


/* =========================================================
   LOAD NEARBY RESOURCES
   ========================================================= */

async function loadNearbyResources() {

    if (!userLocation) {

        return;

    }


    mapStatus.textContent =
        "Searching...";


    resourceList.innerHTML =
        `
            <div class="empty-state">

                <div class="empty-icon">

                    <i class="fa-solid fa-spinner fa-spin"></i>

                </div>

                <h4>
                    Finding Nearby Resources
                </h4>

                <p>
                    Searching for civic services around you...
                </p>

            </div>
        `;


    try {

        const data =
            await fetchOverpassData(
                userLocation.lat,
                userLocation.lng,
                currentRadius
            );


        resources =
            normalizeResources(
                data
            );


        if (
            resources.length === 0
        ) {

            resources =
                createFallbackResources(
                    userLocation.lat,
                    userLocation.lng
                );

        }

        else {

            saveResourcesToCache(
                resources
            );

        }


        renderMarkers();

        renderResources();


        mapStatus.textContent =
            "Live data";


    }

    catch (error) {

        console.warn(
            "Resource API failed:",
            error
        );


        resources =
            getCachedResources();


        if (
            resources.length === 0
        ) {

            resources =
                createFallbackResources(
                    userLocation.lat,
                    userLocation.lng
                );

        }


        renderMarkers();

        renderResources();


        mapStatus.textContent =
            "Fallback mode";

    }

}


/* =========================================================
   OVERPASS
   ========================================================= */

async function fetchOverpassData(
    lat,
    lng,
    radiusKm
) {

    const radiusMeters =
        radiusKm * 1000;


    const query = `

        [out:json][timeout:20];

        (

            nwr[
                amenity=hospital
            ](
                around:${radiusMeters},
                ${lat},
                ${lng}
            );

            nwr[
                amenity=police
            ](
                around:${radiusMeters},
                ${lat},
                ${lng}
            );

            nwr[
                amenity=fire_station
            ](
                around:${radiusMeters},
                ${lat},
                ${lng}
            );

            nwr[
                office=government
            ](
                around:${radiusMeters},
                ${lat},
                ${lng}
            );

            nwr[
                amenity=social_centre
            ](
                around:${radiusMeters},
                ${lat},
                ${lng}
            );

            nwr[
                amenity=community_centre
            ](
                around:${radiusMeters},
                ${lat},
                ${lng}
            );

        );

        out center tags;

    `;


    let lastError = null;


    for (
        const endpoint
        of RESOURCE_CONFIG.overpassEndpoints
    ) {

        try {

            const response =
                await fetch(
                    endpoint,
                    {
                        method: "POST",

                        headers: {
                            "Content-Type":
                                "application/x-www-form-urlencoded"
                        },

                        body:
                            "data=" +
                            encodeURIComponent(
                                query
                            )
                    }
                );


            if (!response.ok) {

                throw new Error(
                    `Overpass HTTP ${response.status}`
                );

            }


            return await response.json();

        }

        catch (error) {

            lastError = error;

        }

    }


    throw lastError ||
        new Error(
            "Resource API unavailable"
        );

}


/* =========================================================
   NORMALIZE
   ========================================================= */

function normalizeResources(
    data
) {

    if (
        !data ||
        !Array.isArray(data.elements)
    ) {

        return [];

    }


    const result = [];


    data.elements.forEach(
        element => {

            const tags =
                element.tags || {};


            let type =
                null;


            if (
                tags.amenity ===
                "hospital"
            ) {

                type = "hospital";

            }

            else if (
                tags.amenity ===
                "police"
            ) {

                type = "police";

            }

            else if (
                tags.amenity ===
                "fire_station"
            ) {

                type = "fire";

            }

            else if (
                tags.office ===
                "government"
            ) {

                type = "government";

            }

            else if (
                tags.amenity ===
                    "social_centre" ||
                tags.amenity ===
                    "community_centre"
            ) {

                type = "relief";

            }


            if (!type) {

                return;

            }


            const lat =
                element.lat ??
                element.center?.lat;


            const lng =
                element.lon ??
                element.center?.lon;


            if (
                typeof lat !== "number" ||
                typeof lng !== "number"
            ) {

                return;

            }


            const name =
                tags.name ||
                TYPE_CONFIG[type].label;


            const address =
                [
                    tags["addr:housenumber"],
                    tags["addr:street"],
                    tags["addr:suburb"],
                    tags["addr:city"]
                ]
                .filter(Boolean)
                .join(", ");


            result.push({

                id:
                    `${element.type}-${element.id}`,

                name,

                type,

                lat,

                lng,

                address:
                    address ||
                    "Address information unavailable",

                phone:
                    tags.phone ||
                    tags["contact:phone"] ||
                    "",

                website:
                    tags.website ||
                    "",

                distance:
                    calculateDistance(
                        userLocation.lat,
                        userLocation.lng,
                        lat,
                        lng
                    )

            });

        }
    );


    return result
        .sort(
            (a,b) =>
                a.distance -
                b.distance
        );

}


/* =========================================================
   FALLBACK DATA
   ========================================================= */

function createFallbackResources(
    lat,
    lng
) {

    /*
       These are only fallback map markers.
       They are NOT presented as verified real facilities.
    */

    return [

        {
            id: "fallback-hospital",

            name:
                "Nearby Hospital",

            type:
                "hospital",

            lat:
                lat + 0.012,

            lng:
                lng + 0.009,

            address:
                "Live data unavailable",

            phone: "",

            website: "",

            distance:
                calculateDistance(
                    lat,
                    lng,
                    lat + 0.012,
                    lng + 0.009
                )

        },

        {
            id: "fallback-police",

            name:
                "Nearby Police Station",

            type:
                "police",

            lat:
                lat - 0.009,

            lng:
                lng + 0.012,

            address:
                "Live data unavailable",

            phone: "",

            website: "",

            distance:
                calculateDistance(
                    lat,
                    lng,
                    lat - 0.009,
                    lng + 0.012
                )

        },

        {
            id: "fallback-government",

            name:
                "Nearby Government Office",

            type:
                "government",

            lat:
                lat + 0.008,

            lng:
                lng - 0.013,

            address:
                "Live data unavailable",

            phone: "",

            website: "",

            distance:
                calculateDistance(
                    lat,
                    lng,
                    lat + 0.008,
                    lng - 0.013
                )

        }

    ];

}


/* =========================================================
   MARKERS
   ========================================================= */

function renderMarkers() {

    resourceMarkers.forEach(
        marker => {

            map.removeLayer(
                marker
            );

        }
    );


    resourceMarkers = [];


    resources.forEach(
        resource => {

            if (
                currentFilter !==
                    "all" &&
                resource.type !==
                    currentFilter
            ) {

                return;

            }


            if (
                resource.distance >
                currentRadius
            ) {

                return;

            }


            const config =
                TYPE_CONFIG[
                    resource.type
                ];


            const marker =
                L.marker(
                    [
                        resource.lat,
                        resource.lng
                    ]
                );


            const callButton =
                resource.phone
                    ? `
                        <a
                            href="tel:${escapeHtml(
                                resource.phone
                            )}"
                        >
                            Call
                        </a>
                    `
                    : "";


            const directions =
                `
                    <a
                        target="_blank"
                        rel="noopener"
                        href="https://www.google.com/maps/dir/?api=1&destination=${resource.lat},${resource.lng}"
                    >
                        Directions
                    </a>
                `;


            marker.bindPopup(
                `
                    <div class="popup-title">
                        ${escapeHtml(
                            resource.name
                        )}
                    </div>

                    <div class="popup-type">
                        ${escapeHtml(
                            config.label
                        )}
                        •
                        ${formatDistance(
                            resource.distance
                        )}
                    </div>

                    <div class="popup-actions">
                        ${directions}
                        ${callButton}
                    </div>
                `
            );


            marker.addTo(map);


            resourceMarkers.push(
                marker
            );

        }
    );

}


/* =========================================================
   RESOURCE LIST
   ========================================================= */

function renderResources() {

    if (
        !Array.isArray(resources)
    ) {

        return;

    }


    const filtered =
        resources
            .filter(
                resource => {

                    const typeMatch =
                        currentFilter ===
                            "all" ||
                        resource.type ===
                            currentFilter;


                    const distanceMatch =
                        resource.distance <=
                        currentRadius;


                    return (
                        typeMatch &&
                        distanceMatch
                    );

                }
            )
            .sort(
                (a,b) =>
                    a.distance -
                    b.distance
            );


    resourceCount.textContent =
        filtered.length;


    if (
        filtered.length === 0
    ) {

        resourceList.innerHTML =
            `
                <div class="empty-state">

                    <div class="empty-icon">

                        <i class="fa-solid fa-map-location-dot"></i>

                    </div>

                    <h4>
                        No Resources Found
                    </h4>

                    <p>
                        Try increasing the search radius
                        or selecting another category.
                    </p>

                </div>
            `;

        return;

    }


    resourceList.innerHTML =
        filtered
            .map(
                resource =>
                    createResourceCard(
                        resource
                    )
            )
            .join("");

}


/* =========================================================
   RESOURCE CARD
   ========================================================= */

function createResourceCard(
    resource
) {

    const config =
        TYPE_CONFIG[
            resource.type
        ];


    const call =
        resource.phone
            ? `
                <a
                    class="resource-action"
                    href="tel:${escapeHtml(
                        resource.phone
                    )}"
                >
                    <i class="fa-solid fa-phone"></i>
                    Call
                </a>
            `
            : "";


    const website =
        resource.website
            ? `
                <a
                    class="resource-action"
                    href="${escapeHtml(
                        resource.website
                    )}"
                    target="_blank"
                    rel="noopener"
                >
                    <i class="fa-solid fa-globe"></i>
                    Website
                </a>
            `
            : "";


    return `

        <article class="resource-item">

            <div class="resource-item-top">

                <div
                    class="resource-type-icon"
                >
                    <i
                        class="fa-solid ${config.icon}"
                    ></i>
                </div>


                <div>

                    <h4>
                        ${escapeHtml(
                            resource.name
                        )}
                    </h4>

                    <div class="resource-type">
                        ${escapeHtml(
                            config.label
                        )}
                    </div>

                </div>


                <span class="resource-distance">
                    ${formatDistance(
                        resource.distance
                    )}
                </span>

            </div>


            <div class="resource-address">

                <i class="fa-solid fa-location-dot"></i>

                ${escapeHtml(
                    resource.address
                )}

            </div>


            <div class="resource-actions">

                <a
                    class="resource-action primary"
                    href="https://www.google.com/maps/dir/?api=1&destination=${resource.lat},${resource.lng}"
                    target="_blank"
                    rel="noopener"
                >

                    <i class="fa-solid fa-route"></i>

                    Directions

                </a>


                ${call}

                ${website}

            </div>

        </article>

    `;

}


/* =========================================================
   DISTANCE
   ========================================================= */

function calculateDistance(
    lat1,
    lon1,
    lat2,
    lon2
) {

    const R = 6371;


    const dLat =
        toRadians(
            lat2 - lat1
        );


    const dLon =
        toRadians(
            lon2 - lon1
        );


    const a =
        Math.sin(dLat / 2) ** 2 +

        Math.cos(
            toRadians(lat1)
        ) *

        Math.cos(
            toRadians(lat2)
        ) *

        Math.sin(dLon / 2) ** 2;


    const c =
        2 *
        Math.atan2(
            Math.sqrt(a),
            Math.sqrt(1 - a)
        );


    return R * c;

}


function toRadians(
    value
) {

    return (
        value *
        Math.PI /
        180
    );

}


function formatDistance(
    distance
) {

    if (
        distance < 1
    ) {

        return (
            Math.round(
                distance * 1000
            ) +
            " m"
        );

    }


    return (
        distance.toFixed(1) +
        " km"
    );

}


/* =========================================================
   CENTER MAP
   ========================================================= */

function centerOnUser() {

    if (!userLocation) {

        getUserLocation();

        return;

    }


    map.setView(
        [
            userLocation.lat,
            userLocation.lng
        ],
        15,
        {
            animate: true
        }
    );

}


/* =========================================================
   LOCATION UI
   ========================================================= */

function setLocationStatus(
    message,
    type
) {

    locationStatus.textContent =
        message;


    locationStatus.classList.remove(
        "success",
        "error"
    );


    if (
        type === "success"
    ) {

        locationStatus.classList.add(
            "success"
        );

    }


    if (
        type === "error"
    ) {

        locationStatus.classList.add(
            "error"
        );

    }

}


function showLocationError(
    message
) {

    setLocationStatus(
        message,
        "error"
    );

}


/* =========================================================
   LOCAL STORAGE
   ========================================================= */

function saveLocation(
    location
) {

    try {

        localStorage.setItem(
            "civicai_resource_location",
            JSON.stringify(
                location
            )
        );

    }

    catch (error) {

        console.warn(
            "Could not save location:",
            error
        );

    }

}


function loadCachedLocation() {

    try {

        const saved =
            localStorage.getItem(
                "civicai_resource_location"
            );


        if (!saved) {

            return;

        }


        const location =
            JSON.parse(
                saved
            );


        if (
            typeof location.lat !==
                "number" ||
            typeof location.lng !==
                "number"
        ) {

            return;

        }


        userLocation =
            location;


        updateUserMarker(
            location.lat,
            location.lng,
            location.accuracy || 100
        );


        map.setView(
            [
                location.lat,
                location.lng
            ],
            13
        );


        setLocationStatus(
            "Using your last saved location. Tap Use My Location to update.",
            "success"
        );


        /*
           We intentionally do NOT automatically query
           the user's location on page load.
           User explicitly controls live location.
        */

    }

    catch (error) {

        console.warn(
            "Cached location unavailable:",
            error
        );

    }

}


function saveResourcesToCache(
    data
) {

    try {

        localStorage.setItem(
            "civicai_resource_cache",
            JSON.stringify(
                data
            )
        );

    }

    catch (error) {

        console.warn(
            "Resource cache failed:",
            error
        );

    }

}


function getCachedResources() {

    try {

        const saved =
            localStorage.getItem(
                "civicai_resource_cache"
            );


        if (!saved) {

            return [];

        }


        const parsed =
            JSON.parse(
                saved
            );


        return Array.isArray(
            parsed
        )
            ? parsed
            : [];

    }

    catch (error) {

        return [];

    }

}


/* =========================================================
   ESCAPE HTML
   ========================================================= */

function escapeHtml(
    value
) {

    return String(
        value ?? ""
    )
        .replace(
            /&/g,
            "&amp;"
        )
        .replace(
            /</g,
            "&lt;"
        )
        .replace(
            />/g,
            "&gt;"
        )
        .replace(
            /"/g,
            "&quot;"
        )
        .replace(
            /'/g,
            "&#039;"
        );

}