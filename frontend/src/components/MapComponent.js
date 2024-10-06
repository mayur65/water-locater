import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';

const fetchClosestDistance = async (userPosition) => {
    try {
        const response = await fetch('http://localhost:3001/closest-distance', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ userPosition }), // Send only the user position
        });
        const data = await response.json();
        return {
            closestDistance: data.closestDistance,
            waterSourcePosition: data.waterSourcePosition, // New: position of the closest water source
        };
    } catch (error) {
        console.error('Error fetching distance:', error);
        return { closestDistance: null, waterSourcePosition: null };
    }
};

const fetchTranslation = async (currentPosition, message) => {
    try {
        const response = await fetch('http://localhost:3001/translate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ currentPosition, message }),
        });
        const data = await response.json();
        return data.translatedText; // Return translated text
    } catch (error) {
        console.error('Error fetching translation:', error);
        return message; // If error, return the original message
    }
};

const calculateDirection = (userPos, waterSourcePos) => {
    if (!userPos || !waterSourcePos || !Array.isArray(userPos) || !Array.isArray(waterSourcePos)) {
        return '';
    }

    const latDiff = waterSourcePos[0] - userPos[0];
    const lonDiff = waterSourcePos[1] - userPos[1];

    let latDirection = '';
    let lonDirection = '';

    // Latitude direction
    if (latDiff > 0) {
        latDirection = 'north';
    } else if (latDiff < 0) {
        latDirection = 'south';
    }

    if (lonDiff > 0) {
        lonDirection = 'east';
    } else if (lonDiff < 0) {
        lonDirection = 'west';
    }

    if (latDirection && lonDirection) {
        return `${latDirection}${lonDirection}`;
    }
    return latDirection || lonDirection;
};

const MapComponent = () => {
    const [userPosition, setUserPosition] = useState([0, 0]);
    const [distance, setDistance] = useState(null); // Store calculated closest distance
    const [waterSourcePosition, setWaterSourcePosition] = useState(null); // Store water source position
    const [translatedMessage, setTranslatedMessage] = useState(null); // Translated message

    useEffect(() => {
        navigator.geolocation.getCurrentPosition(async (position) => {
            const currentPosition = [-1.6713902371696097, 36.843456029456576];
            setUserPosition(currentPosition);

            const { closestDistance, waterSourcePosition } = await fetchClosestDistance(currentPosition);
            setDistance(closestDistance);
            setWaterSourcePosition(waterSourcePosition);
        });
    }, []);

    useEffect(() => {
        const translateMessage = async () => {
            if (distance !== null && waterSourcePosition !== null) {
                const direction = calculateDirection(userPosition, waterSourcePosition);
                const message = `Closest water source is ${distance.toFixed(2)} km away to the ${direction}.`;
                const translated = await fetchTranslation(userPosition, message);
                console.log(translated)
                setTranslatedMessage(message + "\n" + translated);
            }
        };
        translateMessage();
    }, [distance, userPosition, waterSourcePosition]); // Trigger only when distance, user position, or water source changes

    return (
        <MapContainer center={[0.0236, 37.9062]} zoom={6} style={{ height: "600px", width: "100%" }}>
            <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution="&copy; OpenStreetMap contributors"
            />

            {/* User's Position */}
            <Marker position={userPosition}>
                <Popup>
                    You are here<br />
                    {translatedMessage || 'Calculating...'}
                </Popup>
            </Marker>
        </MapContainer>
    );
};

export default MapComponent;
