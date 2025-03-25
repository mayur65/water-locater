**Application to locate the nearest water source [NASA Space Apps Challenge 2024]**

The application simply picks up geojson data of water bodies from the static files, identified current location using GPS and then uses Haversine distance to find the closest water source.
An additional step of translating the message to the local language is handled by an OpenAI call.

There are two APIS in the backend service :-

1. /closest-distance - Identified the closest water source, and how far is it from the current location. The current GPS coordinates to provided as input to the API. The water body co-ordinates are picked from static files. Currently, just one file is supported for the water body lookup, but support for multiple files can be introduced by using range queries I believe.

2. /translate - Given the current coordinates, and a message, it makes an OpenAI call to translate the message to the local language of the location.

The frontend is handled using React library. The maps are rendered using leaflet-react package.
