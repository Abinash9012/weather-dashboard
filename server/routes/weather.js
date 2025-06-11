const express = require('express');
const axios = require('axios');
const router = express.Router();
require('dotenv').config();

const API_KEY = process.env.OPENWEATHER_API_KEY;

router.get('/current', async (req, res) => {
    const { location, units = 'metric' } = req.query;
    if (!location) return res.status(400).json({ error: 'Missing location parameter.' });

    try {
        const response = await axios.get(
            `https://api.openweathermap.org/data/2.5/weather?q=${location}&appid=${API_KEY}&units=${units}`
        );
        res.json(response.data);
    } catch (error) {
        res.status(500).json({ error: error.response?.data?.message || 'Error fetching weather data.' });
    }
});

router.get('/forecast', async (req, res) => {
    const { location, units = 'metric' } = req.query;
    if (!location) return res.status(400).json({ error: 'Missing location parameter.' });

    try {
        const response = await axios.get(
            `https://api.openweathermap.org/data/2.5/forecast?q=${location}&appid=${API_KEY}&units=${units}`
        );
        res.json(response.data);
    } catch (error) {
        res.status(500).json({ error: error.response?.data?.message || 'Error fetching forecast data.' });
    }
});

module.exports = router;