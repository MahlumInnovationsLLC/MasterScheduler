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
    <div className="relative w-full h-8 overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-800">
      <style>
        {`
          @font-face {
            font-family: 'PixelFont';
            src: url('data:font/woff2;base64,') format('woff2');
          }
          
          .pixel-text {
            font-family: 'Courier New', monospace;
            font-weight: 600;
            letter-spacing: 1px;
            text-transform: uppercase;
            image-rendering: pixelated;
            -webkit-font-smoothing: none;
            -moz-osx-font-smoothing: grayscale;
          }
          
          .pixel-dot {
            display: inline-block;
            width: 4px;
            height: 4px;
            background-color: #f59e0b;
            margin: 0 6px;
            box-shadow: 0 0 3px #f59e0b;
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
          className="pixel-text text-gray-700 dark:text-gray-300"
          style={{
            fontSize: '12px',
            textShadow: '0 0 2px rgba(245, 158, 11, 0.3)',
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
      <div className="absolute left-0 top-0 h-full w-12 bg-gradient-to-r from-gray-100 dark:from-gray-800 to-transparent pointer-events-none" />
      <div className="absolute right-0 top-0 h-full w-12 bg-gradient-to-l from-gray-100 dark:from-gray-800 to-transparent pointer-events-none" />
    </div>
  );
}