'use client';

import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { useAuth } from './use-auth';
import { getDatabase, ref, get, set } from 'firebase/database';
import { app } from '@/lib/firebase';
const db = getDatabase(app);

interface UsageData {
  worksheetGenerations: number;
  examPaperGenerations: number;
  lastResetDate: string;
  totalGenerations: number;
}

interface UsageContextType {
  usage: UsageData;
  incrementWorksheetGeneration: () => Promise<void>;
  incrementExamPaperGeneration: () => Promise<void>;
  hasReachedLimit: boolean;
  remainingGenerations: number;
  dailyLimit: number;
  usagePercentage: number;
  loading: boolean;
}

const UsageContext = createContext<UsageContextType>({
  usage: { worksheetGenerations: 0, examPaperGenerations: 0, lastResetDate: '', totalGenerations: 0 },
  incrementWorksheetGeneration: async () => {},
  incrementExamPaperGeneration: async () => {},
  hasReachedLimit: false,
  remainingGenerations: 0,
  dailyLimit: 1,
  usagePercentage: 0,
  loading: true
});

export const UsageProvider = ({ children }: { children: ReactNode }) => {
  const DAILY_WORKSHEET_LIMIT = 1; // Set daily limit to 1 worksheet
  
  const [usage, setUsage] = useState<UsageData>({
    worksheetGenerations: 0,
    examPaperGenerations: 0,
    lastResetDate: new Date().toISOString().split('T')[0],
    totalGenerations: 0
  });
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  // Load usage data and check if we need to reset the daily count
  useEffect(() => {
    if (user) {
      const today = new Date().toISOString().split('T')[0];
      
      // If it's a new day, reset the counter
      if (usage.lastResetDate && usage.lastResetDate !== today) {
        const resetUsage = {
          ...usage,
          worksheetGenerations: 0,
          lastResetDate: today
        };
        setUsage(resetUsage);
        saveUsageData(resetUsage);
      } else {
        loadUsageData();
      }
    }
  }, [user]);

  const loadUsageData = async () => {
    try {
      // Load usage data from Firebase
      if (user?.uid) {
        const usageRef = ref(db, `users/${user.uid}/usage`);
        
        const usageSnapshot = await get(usageRef);
        
        let userData = {
          worksheetGenerations: 0,
          examPaperGenerations: 0,
          lastResetDate: new Date().toISOString().split('T')[0],
          totalGenerations: 0
        };
        
        if (usageSnapshot.exists()) {
          userData = { ...userData, ...usageSnapshot.val() };
        }
        
        // Check if we need to reset monthly usage
        const lastReset = new Date(userData.lastResetDate);
        const now = new Date();
        const daysSinceReset = Math.floor((now.getTime() - lastReset.getTime()) / (1000 * 60 * 60 * 24));
        
        if (daysSinceReset >= 30) {
          // Reset monthly usage after 30 days
          userData.worksheetGenerations = 0;
          userData.examPaperGenerations = 0;
          userData.lastResetDate = now.toISOString().split('T')[0];
          
          // Save reset data back to Firebase
          await set(usageRef, userData);
        }
        
        setUsage(userData);
      }
    } catch (error) {
      console.error('Failed to load usage data:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveUsageData = async (newUsage: UsageData) => {
    try {
      if (user?.uid) {
        const usageRef = ref(db, `users/${user.uid}/usage`);
        await set(usageRef, newUsage);
      }
    } catch (error) {
      console.error('Failed to save usage data:', error);
    }
  };

  const incrementWorksheetGeneration = async () => {
    // Check if we've reached the daily limit
    if (usage.worksheetGenerations >= DAILY_WORKSHEET_LIMIT) {
      throw new Error('Daily worksheet generation limit reached');
    }
    
    const newUsage = {
      ...usage,
      worksheetGenerations: usage.worksheetGenerations + 1,
      totalGenerations: usage.totalGenerations + 1
    };
    
    setUsage(newUsage);
    await saveUsageData(newUsage);
  };

  const incrementExamPaperGeneration = async () => {
    const newUsage = {
      ...usage,
      examPaperGenerations: usage.examPaperGenerations + 1,
      totalGenerations: usage.totalGenerations + 1
    };
    
    setUsage(newUsage);
    await saveUsageData(newUsage);
  };

  // Calculate remaining generations based on daily limit
  const remainingGenerations = Math.max(0, DAILY_WORKSHEET_LIMIT - usage.worksheetGenerations);
  const hasReachedLimit = usage.worksheetGenerations >= DAILY_WORKSHEET_LIMIT;
  const usagePercentage = Math.min(100, (usage.worksheetGenerations / DAILY_WORKSHEET_LIMIT) * 100);

  return (
    <UsageContext.Provider value={{
      usage,
      incrementWorksheetGeneration,
      incrementExamPaperGeneration,
      hasReachedLimit,
      dailyLimit: DAILY_WORKSHEET_LIMIT,
      usagePercentage,
      remainingGenerations,
      loading
    }}>
      {children}
    </UsageContext.Provider>
  );
};

export const useUsageTracking = () => useContext(UsageContext);
