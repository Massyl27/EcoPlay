import { useState, useEffect, useCallback } from 'react';

export interface ImpactData {
    fundsRaised: number;
    gamesPlayed: number;
    solarGoal: number;
    currentProgress: number;
    panelsInstalled: number;
}

/**
 * Simulated real-time impact data hook.
 * In production, this would connect to a backend API.
 */
export function useImpactData(): ImpactData {
    const [data, setData] = useState<ImpactData>({
        fundsRaised: 187.50,
        gamesPlayed: 12847,
        solarGoal: 300,
        currentProgress: 187.50,
        panelsInstalled: 3,
    });

    useEffect(() => {
        const interval = setInterval(() => {
            setData((prev) => {
                const increment = Math.random() * 0.5 + 0.1;
                const newProgress = prev.currentProgress + increment;
                const newFunds = prev.fundsRaised + increment;

                // Reset progress when we reach the goal
                if (newProgress >= prev.solarGoal) {
                    return {
                        ...prev,
                        fundsRaised: newFunds,
                        gamesPlayed: prev.gamesPlayed + Math.floor(Math.random() * 3),
                        currentProgress: newProgress - prev.solarGoal,
                        panelsInstalled: prev.panelsInstalled + 1,
                    };
                }

                return {
                    ...prev,
                    fundsRaised: newFunds,
                    gamesPlayed: prev.gamesPlayed + Math.floor(Math.random() * 3),
                    currentProgress: newProgress,
                };
            });
        }, 3000);

        return () => clearInterval(interval);
    }, []);

    const simulateRewardedAd = useCallback(() => {
        setData((prev) => ({
            ...prev,
            fundsRaised: prev.fundsRaised + 2,
            currentProgress: prev.currentProgress + 2,
            gamesPlayed: prev.gamesPlayed + 1,
        }));
    }, []);

    return data;
}
