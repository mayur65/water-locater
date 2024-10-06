const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const { OpenAI } = require('openai');
const cors = require('cors');

const app = express();
const PORT = 3001;

app.use(cors());

app.use(bodyParser.json());

const openai = new OpenAI();

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

    const coord = req.body.currentPosition;  // [-1.6713902371696097, 36.843456029456576]
    const message = req.body.message;

    console.log(req.body)
    const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
            { role: "system", content: "You are a helpful assistant." },
            {
                role: "user",
                content: "Based on the above coordinates - " + coord[0] + ", " + coord[1] + ",\n" +
                    "Convert the below sentence to native language - " + message + " Just give me only response sentence, please do not write anything else.",
            },
        ],
    });

    console.log(completion.choices[0].message);

    const translatedMessage = completion.choices[0].message.content; // Extract the translated message

    res.json({ translatedText: translatedMessage });
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});