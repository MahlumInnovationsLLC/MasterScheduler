import React from 'react';
import { motion } from 'framer-motion';

interface LoadingScreenProps {
  isLoading: boolean;
  stage: 'authentication' | 'priorities' | 'data' | 'complete';
  message?: string;
}

const LoadingScreen: React.FC<LoadingScreenProps> = ({ 
  isLoading, 
  stage, 
  message = 'Loading...' 
}) => {
  if (!isLoading && stage === 'complete') return null;

  const getStageMessage = () => {
    switch (stage) {
      case 'authentication':
        return 'Authenticating user...';
      case 'priorities':
        return 'Checking Priorities Module access...';
      case 'data':
        return 'Loading application data...';
      default:
        return message;
    }
  };

  const getProgressPercentage = () => {
    switch (stage) {
      case 'authentication':
        return 25;
      case 'priorities':
        return 50;
      case 'data':
        return 75;
      case 'complete':
        return 100;
      default:
        return 0;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{
        backdropFilter: 'blur(8px)',
        backgroundColor: 'rgba(0, 0, 0, 0.3)'
      }}
    >
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="bg-white/90 backdrop-blur-md rounded-2xl shadow-2xl p-8 max-w-md mx-4 border border-white/20"
      >
        {/* Logo/Brand Area */}
        <div className="text-center mb-8">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="inline-block w-16 h-16 mb-4"
          >
            <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                className="w-8 h-8 bg-white rounded-full opacity-90"
              />
            </div>
          </motion.div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Manufacturing Hub</h2>
          <p className="text-gray-600 text-sm">Initializing your workspace</p>
        </div>

        {/* Progress Section */}
        <div className="space-y-4">
          {/* Progress Bar */}
          <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${getProgressPercentage()}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="h-full bg-gradient-to-r from-blue-500 to-purple-600 rounded-full"
            />
          </div>

          {/* Stage Message */}
          <motion.div
            key={stage}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="text-center"
          >
            <p className="text-gray-700 font-medium">{getStageMessage()}</p>
            <p className="text-gray-500 text-sm mt-1">{getProgressPercentage()}% complete</p>
          </motion.div>

          {/* Loading Dots Animation */}
          <div className="flex justify-center space-x-1">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                animate={{
                  scale: [1, 1.2, 1],
                  opacity: [0.7, 1, 0.7]
                }}
                transition={{
                  duration: 1,
                  repeat: Infinity,
                  delay: i * 0.2
                }}
                className="w-2 h-2 bg-blue-500 rounded-full"
              />
            ))}
          </div>
        </div>

        {/* Status Indicators */}
        <div className="mt-6 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Authentication</span>
            <div className={`w-3 h-3 rounded-full ${
              ['priorities', 'data', 'complete'].includes(stage) 
                ? 'bg-green-500' 
                : stage === 'authentication' 
                  ? 'bg-blue-500 animate-pulse' 
                  : 'bg-gray-300'
            }`} />
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Module Access</span>
            <div className={`w-3 h-3 rounded-full ${
              ['data', 'complete'].includes(stage) 
                ? 'bg-green-500' 
                : stage === 'priorities' 
                  ? 'bg-blue-500 animate-pulse' 
                  : 'bg-gray-300'
            }`} />
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Data Loading</span>
            <div className={`w-3 h-3 rounded-full ${
              stage === 'complete' 
                ? 'bg-green-500' 
                : stage === 'data' 
                  ? 'bg-blue-500 animate-pulse' 
                  : 'bg-gray-300'
            }`} />
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default LoadingScreen;