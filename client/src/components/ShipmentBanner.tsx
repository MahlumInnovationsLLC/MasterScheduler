import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';

export function ShipmentBanner() {
  const [scrollPosition, setScrollPosition] = useState(0);

  const { data: upcomingShipments } = useQuery({
    queryKey: ['/api/upcoming-shipments'],
    queryFn: async () => {
      const response = await fetch('/api/upcoming-shipments');
      if (!response.ok) throw new Error('Failed to fetch shipments');
      return response.json();
    },
    refetchInterval: 60000, // Refresh every minute
  });

  useEffect(() => {
    const interval = setInterval(() => {
      setScrollPosition(prev => prev - 1);
    }, 30); // Adjust speed of scrolling

    return () => clearInterval(interval);
  }, []);

  if (!upcomingShipments || upcomingShipments.length === 0) {
    return null;
  }

  // Create the scrolling text
  const shipmentText = upcomingShipments
    .map((project: any) => 
      `● ${project.projectNumber} - ${project.name} (Ships: ${new Date(project.shipDate).toLocaleDateString()})`
    )
    .join('    ');

  // Double the text for seamless scrolling
  const fullText = shipmentText + '    ' + shipmentText;

  return (
    <div className="relative w-full h-10 bg-gray-900 dark:bg-gray-950 overflow-hidden border-b border-gray-800 dark:border-gray-700">
      <style>
        {`
          @font-face {
            font-family: 'PixelFont';
            src: url('data:font/woff2;base64,') format('woff2');
          }
          
          .pixel-text {
            font-family: 'Courier New', monospace;
            font-weight: bold;
            letter-spacing: 2px;
            text-transform: uppercase;
            image-rendering: pixelated;
            -webkit-font-smoothing: none;
            -moz-osx-font-smoothing: grayscale;
          }
          
          .pixel-dot {
            display: inline-block;
            width: 6px;
            height: 6px;
            background-color: #f59e0b;
            margin: 0 8px;
            box-shadow: 0 0 4px #f59e0b;
            animation: pulse 2s infinite;
          }
          
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
          }
        `}
      </style>
      
      <div 
        className="absolute whitespace-nowrap h-full flex items-center"
        style={{
          transform: `translateX(${scrollPosition}px)`,
          // Reset position when first text is fully scrolled out
          ...(scrollPosition < -(fullText.length * 10) ? { transform: 'translateX(0)' } : {}),
        }}
      >
        <span 
          className="pixel-text text-amber-500 dark:text-amber-400"
          style={{
            fontSize: '14px',
            textShadow: '0 0 4px currentColor, 2px 2px 0 rgba(0,0,0,0.8)',
          }}
        >
          {shipmentText.split('●').map((text, index) => (
            <React.Fragment key={index}>
              {index > 0 && <span className="pixel-dot" />}
              {text}
            </React.Fragment>
          ))}
          <span style={{ marginLeft: '40px' }}>
            {shipmentText.split('●').map((text, index) => (
              <React.Fragment key={`repeat-${index}`}>
                {index > 0 && <span className="pixel-dot" />}
                {text}
              </React.Fragment>
            ))}
          </span>
        </span>
      </div>
      
      {/* Gradient overlays for fade effect */}
      <div className="absolute left-0 top-0 h-full w-20 bg-gradient-to-r from-gray-900 dark:from-gray-950 to-transparent pointer-events-none" />
      <div className="absolute right-0 top-0 h-full w-20 bg-gradient-to-l from-gray-900 dark:from-gray-950 to-transparent pointer-events-none" />
    </div>
  );
}