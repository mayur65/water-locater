const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const axios = require('axios');  // Axios for making HTTP requests to Ollama API
const cors = require('cors');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(bodyParser.json());

const haversineDistance = (coords1, coords2) => {
    const toRad = (x) => x * Math.PI / 180;

    const lat1 = toRad(coords1[0]);
    const lon1 = toRad(coords1[1]);
    const lat2 = toRad(coords2[0]);
    const lon2 = toRad(coords2[1]);

    const dLat = lat2 - lat1;
    const dLon = lon2 - lon1;

    const R = 6371;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1) * Math.cos(lat2) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
};

const calculateClosestDistance = (userPos, featureCoords) => {
    let minDistance = Infinity;
    let closestWaterSource = null;

    for (let i = 0; i < featureCoords.length; i++) {
        const distance = haversineDistance(userPos, [featureCoords[1], featureCoords[0]]); // [lat, lng]
        if (distance < minDistance) {
            minDistance = distance;
            closestWaterSource = [featureCoords[1], featureCoords[0]]; // Store the closest water source coordinates
        }
    }

    return { minDistance, closestWaterSource };
};

app.post('/closest-distance', (req, res) => {
    const { userPosition } = req.body;
    if (!userPosition || userPosition.length !== 2) {
        return res.status(400).json({ error: 'Invalid GPS coordinates provided.' });
    }

    const geoJsonData = JSON.parse(fs.readFileSync('./river_kenya.geojson', 'utf-8'));

    let closestDistance = Infinity;
    let closestWaterSourcePosition = null;

    geoJsonData.features.forEach(feature => {
        feature.geometry.coordinates.forEach(geo => {
            const { minDistance, closestWaterSource } = calculateClosestDistance(userPosition, geo);
            if (minDistance < closestDistance) {
                closestDistance = minDistance;
                closestWaterSourcePosition = closestWaterSource;
            }
        })
    });
    res.json({ closestDistance, waterSourcePosition: closestWaterSourcePosition });
});

app.post('/translate', async (req, res) => {
    const coord = req.body.currentPosition;  // e.g., [-1.6713902371696097, 36.843456029456576]
    const message = req.body.message;

    try {
        console.log(req.body);

        // Call Ollama API to generate translation
        const response = await axios.post('http://localhost:8888/api/generate', {
            model: 'llama2',  // Use the appropriate LLaMA model
            prompt: `Based on the coordinates - ${coord[0]}, ${coord[1]}, convert the following sentence to the native language: ${message}`,
            stream: false  // Disable streaming for a complete response
        });

        const translatedMessage = response.data.text; // Get the generated text from the Ollama response

        res.json({ translatedText: translatedMessage });
    } catch (error) {
        console.error('Error calling Ollama API:', error);
        res.status(500).json({ error: 'Translation failed' });
    }
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});