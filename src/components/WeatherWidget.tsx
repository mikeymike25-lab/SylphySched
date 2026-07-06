import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sun, Cloud, CloudRain, CloudLightning, MapPin } from 'lucide-react';
import type { WeatherData } from '../hooks/useWeather';
import type { ThemeConfig } from '../types';

interface WeatherWidgetProps {
  weather: WeatherData;
  themeConfig: ThemeConfig;
}

export const WeatherWidget: React.FC<WeatherWidgetProps> = ({ weather, themeConfig }) => {
  const { temp, condition, description, isSimulated, locationName } = weather;

  // Icon selection
  const WeatherIcon = () => {
    const iconClass = `w-4 h-4 shrink-0 transition-colors duration-500 ${themeConfig.accentTextClass}`;
    switch (condition) {
      case 'Sunny':
        return <Sun className={iconClass} />;
      case 'Cloudy':
        return <Cloud className={iconClass} />;
      case 'Rainy':
        return <CloudRain className={iconClass} />;
      case 'Stormy':
        return <CloudLightning className={iconClass} />;
      default:
        return <Sun className={iconClass} />;
    }
  };

  const isRainyOrStormy = condition === 'Rainy' || condition === 'Stormy';

  return (
    <motion.div
      // Faint ambient pulsing glow if condition is rain or storm (iOS Liquid Glass theme)
      animate={
        isRainyOrStormy
          ? {
              boxShadow: [
                '0 0 10px rgba(0, 229, 255, 0.05), inset 0 1px 1px rgba(255, 255, 255, 0.1)',
                '0 0 20px rgba(0, 229, 255, 0.18), inset 0 1px 1px rgba(255, 255, 255, 0.15)',
                '0 0 10px rgba(0, 229, 255, 0.05), inset 0 1px 1px rgba(255, 255, 255, 0.1)',
              ],
              borderColor: [
                'rgba(255, 255, 255, 0.08)',
                'rgba(0, 229, 255, 0.25)',
                'rgba(255, 255, 255, 0.08)',
              ],
            }
          : {
              boxShadow: 'none',
              borderColor: 'rgba(255, 255, 255, 0.08)',
            }
      }
      transition={{
        repeat: Infinity,
        duration: 3,
        ease: 'easeInOut',
      }}
      className={`flex items-center gap-2.5 px-3 py-1.5 border rounded-full font-mono text-[10px] md:text-xs select-none backdrop-blur-md transition-all duration-500
        ${themeConfig.name === 'dark' 
          ? 'bg-white/[0.03] border-white/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1),0_4px_12px_rgba(0,0,0,0.15)] text-text-muted' 
          : 'bg-slate-900/[0.03] border-slate-900/10 shadow-[inset_0_1px_1.5px_rgba(255,255,255,0.7),0_4px_12px_rgba(0,0,0,0.02)] text-slate-700'
        }
      `}
      title={`${description} in ${locationName}${isSimulated ? ' (Simulated)' : ' (Live)'}`}
    >
      {/* Icon */}
      <WeatherIcon />

      {/* Temp Rolling Counter */}
      <div className="flex items-center overflow-hidden h-[15px] font-bold">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={temp}
            initial={{ y: 15, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -15, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 16 }}
            className={`inline-block ${themeConfig.textBrightClass}`}
          >
            {temp}°C
          </motion.span>
        </AnimatePresence>
      </div>

      <span className={`hidden md:inline opacity-40 font-normal ${themeConfig.textDarkClass}`}>•</span>

      {/* Typographic Weather Status */}
      <span className={`hidden md:inline truncate max-w-[70px] sm:max-w-none capitalize transition-colors duration-500 ${themeConfig.textMutedClass}`}>
        {description}
      </span>

      <span className={`hidden md:inline opacity-40 font-normal ${themeConfig.textDarkClass}`}>•</span>

      {/* Location */}
      <div className="hidden md:flex items-center gap-0.5 opacity-80 shrink-0">
        <MapPin className="w-2.5 h-2.5 opacity-60" />
        <span className="text-[9px] uppercase tracking-wider font-semibold">{locationName}</span>
      </div>
    </motion.div>
  );
};
