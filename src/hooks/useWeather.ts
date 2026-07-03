import { useState, useEffect } from 'react';

export interface WeatherData {
  temp: number;
  condition: 'Sunny' | 'Cloudy' | 'Rainy' | 'Stormy';
  description: string;
  isSimulated: boolean;
}

interface WeatherCache {
  temp: number;
  condition: 'Sunny' | 'Cloudy' | 'Rainy' | 'Stormy';
  description: string;
  timestamp: number;
}

const CACHE_KEY = 'sylphy_weather_cache';
const CACHE_DURATION = 20 * 60 * 1000; // 20 minutes in ms

// Maps OpenWeatherMap codes to our 4 clean conditions
const mapCondition = (id: number): 'Sunny' | 'Cloudy' | 'Rainy' | 'Stormy' => {
  if (id >= 200 && id < 300) return 'Stormy';
  if (id >= 300 && id < 600) return 'Rainy';
  if (id >= 600 && id < 700) return 'Cloudy'; // snow as cloudy in Antipolo
  if (id === 800) return 'Sunny';
  return 'Cloudy';
};

/**
 * Custom hook to get weather for Antipolo, PH.
 * Uses OpenWeatherMap API with a 20-minute client cache.
 * Falls back to high-fidelity simulated weather based on virtual time if offline/no key is found.
 */
export const useWeather = (virtualTime: Date): WeatherData => {
  const [weather, setWeather] = useState<WeatherData>(() => {
    // Attempt to load from cache on initialization
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const data: WeatherCache = JSON.parse(cached);
        if (Date.now() - data.timestamp < CACHE_DURATION) {
          return {
            temp: data.temp,
            condition: data.condition,
            description: data.description,
            isSimulated: false,
          };
        }
      }
    } catch (e) {
      console.warn('Failed to parse weather cache:', e);
    }
    // Return standard fallback initially
    return getSimulatedWeather(virtualTime);
  });

  useEffect(() => {
    const apiKey = import.meta.env.VITE_OPENWEATHER_API_KEY;
    if (!apiKey) {
      // If no key, drive weather dynamically off the virtual time
      setWeather(getSimulatedWeather(virtualTime));
      return;
    }

    const fetchLiveWeather = async () => {
      // Check cache validity first
      try {
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
          const data: WeatherCache = JSON.parse(cached);
          if (Date.now() - data.timestamp < CACHE_DURATION) {
            setWeather({
              temp: data.temp,
              condition: data.condition,
              description: data.description,
              isSimulated: false,
            });
            return;
          }
        }
      } catch (e) {
        // ignore cache check errors
      }

      try {
        // Antipolo, Calabarzon, PH coordinate or city query
        const res = await fetch(
          `https://api.openweathermap.org/data/2.5/weather?q=Antipolo,PH&appid=${apiKey}&units=metric`
        );
        if (!res.ok) throw new Error('Weather API error');
        
        const data = await res.json();
        const rawId = data.weather[0]?.id || 800;
        const temp = Math.round(data.main?.temp ?? 28);
        const condition = mapCondition(rawId);
        const description = data.weather[0]?.description || 'Clear sky';

        const cacheData: WeatherCache = {
          temp,
          condition,
          description,
          timestamp: Date.now(),
        };
        localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));

        setWeather({
          temp,
          condition,
          description,
          isSimulated: false,
        });
      } catch (err) {
        console.warn('Live weather request failed, falling back to simulated weather:', err);
        setWeather(getSimulatedWeather(virtualTime));
      }
    };

    fetchLiveWeather();
    // Refresh weather every 10 minutes (or if time ticks dramatically)
    const interval = setInterval(fetchLiveWeather, 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, [virtualTime]);

  return weather;
};

/**
 * Generates highly realistic, dynamic weather for Antipolo based on the simulated/virtual clock.
 * Drives interactive UI states (warm afternoon sunshine, cool night breezes, afternoon thunderstorms).
 */
const getSimulatedWeather = (time: Date): WeatherData => {
  const hour = time.getHours();
  const day = time.getDay(); // Drives weekly pattern shifts
  
  // Base daily temperature curve: peaks at 2 PM, lowest at 5 AM
  // Math.cos shifted to peak at hour 14 (2 PM)
  const tempOffset = Math.cos(((hour - 14) * Math.PI) / 12); // range -1 to 1
  
  let baseTemp = 28; // Average tropical temperature in Antipolo
  let condition: 'Sunny' | 'Cloudy' | 'Rainy' | 'Stormy' = 'Sunny';
  let description = 'Clear Sky';

  // Weekly weather cycles based on simulated day of week
  // Sunday, Tuesday, Friday: Sunny / Cloudy
  // Monday, Thursday: Cloudy / Light Rain in afternoon
  // Wednesday, Saturday: Higher chance of storms / rain
  if (day === 3 || day === 6) { // Wednesday / Saturday
    if (hour >= 13 && hour <= 18) {
      condition = 'Stormy';
      description = 'Thundershower';
      baseTemp = 25; // Rain cools it down
    } else if (hour >= 8 && hour < 13) {
      condition = 'Cloudy';
      description = 'Overcast Clouds';
      baseTemp = 27;
    } else {
      condition = 'Rainy';
      description = 'Light Rain';
      baseTemp = 24;
    }
  } else if (day === 1 || day === 4) { // Monday / Thursday
    if (hour >= 14 && hour <= 17) {
      condition = 'Rainy';
      description = 'Passing Showers';
      baseTemp = 26;
    } else if (hour >= 10 && hour < 14) {
      condition = 'Cloudy';
      description = 'Scattered Clouds';
      baseTemp = 29;
    } else {
      condition = 'Sunny';
      description = 'Few Clouds';
      baseTemp = 25;
    }
  } else { // Sunday, Tuesday, Friday
    if (hour >= 11 && hour <= 15) {
      condition = 'Sunny';
      description = 'Hot and Sunny';
      baseTemp = 32;
    } else if (hour >= 16 && hour <= 19) {
      condition = 'Cloudy';
      description = 'Partly Cloudy';
      baseTemp = 29;
    } else {
      condition = 'Sunny';
      description = 'Clear Night';
      baseTemp = 24;
    }
  }

  // Calculate final temperature on the diurnal curve
  const finalTemp = Math.round(baseTemp + tempOffset * 2);

  return {
    temp: finalTemp,
    condition,
    description: description.toLowerCase(),
    isSimulated: true,
  };
};
