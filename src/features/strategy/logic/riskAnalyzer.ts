import type { TrajectoryPoint, TargetConfig } from './optimizer';

/**
 * Risk severity levels based on trajectory analysis
 */
export type RiskSeverity =
    | 'excellent'   // Comfortably in safe zone, stable trajectory
    | 'good'        // In safe zone, minor fluctuations
    | 'caution'     // Near boundaries, needs attention
    | 'warning'     // Outside safe zone but recoverable
    | 'critical'    // Significantly off-target
    | 'emergency';  // Danger zone, immediate action required

/**
 * Recovery difficulty assessment
 */
export type RecoveryDifficulty =
    | 'easy'        // Plenty of time, small adjustments
    | 'moderate'    // Requires focused effort
    | 'difficult'   // Requires aggressive action
    | 'impossible'; // Cannot reach target with remaining reports

/**
 * Trajectory health metrics
 */
export interface TrajectoryHealth {
    direction: 'improving' | 'stable' | 'degrading';
    velocity: number;        // RSCA change per reporting period
    volatility: number;      // Standard deviation of trajectory
    isStable: boolean;       // Low volatility + in safe zone
}

/**
 * Recovery plan with actionable timeline
 */
export interface RecoveryPlan {
    isRecoverable: boolean;
    reportsNeeded: number;
    requiredMtaRange: {
        min: number;
        max: number;
    };
    difficulty: RecoveryDifficulty;
    estimatedEndRsca: number;
}

/**
 * Actionable recommendations based on current situation
 */
export interface RiskRecommendations {
    primary: string;
    secondary: string[];
    warnings: string[];
}

/**
 * Complete risk analysis result
 */
export interface RiskAnalysis {
    // Basic metrics
    currentRsca: number;
    projectedEndRsca: number;
    minMargin: number;
    maxMargin: number;
    reportsRemaining: number;

    // Classification
    severity: RiskSeverity;

    // Health metrics
    health: TrajectoryHealth;

    // Recovery assessment
    recovery: RecoveryPlan;

    // Actionable guidance
    recommendations: RiskRecommendations;

    // Raw data for visualization
    trajectory: TrajectoryPoint[];
}

/**
 * Calculates trajectory health metrics
 */
export const calculateTrajectoryHealth = (trajectory: TrajectoryPoint[]): TrajectoryHealth => {
    if (trajectory.length < 2) {
        return {
            direction: 'stable',
            velocity: 0,
            volatility: 0,
            isStable: true
        };
    }

    // Sort by date
    const sorted = [...trajectory].sort((a, b) => a.date - b.date);

    // Calculate velocity (trend over time)
    const firstRsca = sorted[0].rsca;
    const lastRsca = sorted[sorted.length - 1].rsca;
    const velocity = (lastRsca - firstRsca) / sorted.length;

    // Determine direction
    let direction: 'improving' | 'stable' | 'degrading';
    if (Math.abs(velocity) < 0.05) {
        direction = 'stable';
    } else {
        // "Improving" means moving toward ideal (4.0)
        const firstDeviation = Math.abs(firstRsca - 4.0);
        const lastDeviation = Math.abs(lastRsca - 4.0);
        direction = lastDeviation < firstDeviation ? 'improving' : 'degrading';
    }

    // Calculate volatility (standard deviation of margins)
    const margins = sorted.map(p => p.margin);
    const avgMargin = margins.reduce((sum, m) => sum + m, 0) / margins.length;
    const variance = margins.reduce((sum, m) => sum + Math.pow(m - avgMargin, 2), 0) / margins.length;
    const volatility = Math.sqrt(variance);

    // Stable if low volatility and in safe zone
    const isStable = volatility < 0.15 && lastRsca >= 3.8 && lastRsca <= 4.2;

    return {
        direction,
        velocity,
        volatility,
        isStable
    };
};

/**
 * Determines risk severity based on current state and trajectory
 */
export const calculateRiskSeverity = (
    currentRsca: number,
    minMargin: number,
    health: TrajectoryHealth,
    reportsRemaining: number
): RiskSeverity => {
    const { direction, isStable } = health;

    // Emergency: Critical margins with degrading trajectory
    if (minMargin < -0.3 || (minMargin < -0.1 && direction === 'degrading')) {
        return 'emergency';
    }

    // Critical: Significantly off-target
    if (minMargin < -0.1 || currentRsca < 3.5 || currentRsca > 4.5) {
        return 'critical';
    }

    // Warning: Outside safe zone
    if (currentRsca < 3.8 || currentRsca > 4.2) {
        // Consider time remaining
        if (reportsRemaining <= 2) {
            return 'critical'; // Elevated to critical if time is short
        }
        return 'warning';
    }

    // Caution: In safe zone but close to edges or unstable
    if (!isStable || Math.abs(currentRsca - 4.0) > 0.15) {
        return 'caution';
    }

    // Good: In safe zone, stable
    if (currentRsca >= 3.9 && currentRsca <= 4.1 && isStable) {
        return 'excellent';
    }

    return 'good';
};

/**
 * Calculates recovery plan with specific MTA recommendations
 */
export const calculateRecoveryPlan = (
    currentRsca: number,
    currentTotalScore: number,
    currentTotalReports: number,
    reportsRemaining: number,
    targetRsca: number = 4.0
): RecoveryPlan => {
    if (reportsRemaining === 0) {
        return {
            isRecoverable: false,
            reportsNeeded: 0,
            requiredMtaRange: { min: 0, max: 0 },
            difficulty: 'impossible',
            estimatedEndRsca: currentRsca
        };
    }

    // Calculate what MTA is needed to reach target
    // (currentScore + requiredMTA * reportsRemaining) / (currentReports + reportsRemaining) = target
    // requiredMTA * reportsRemaining = target * (currentReports + reportsRemaining) - currentScore
    const totalReportsAtEnd = currentTotalReports + reportsRemaining;
    const targetTotalScore = targetRsca * totalReportsAtEnd;
    const requiredTotalScoreFromRemaining = targetTotalScore - currentTotalScore;
    const requiredMta = requiredTotalScoreFromRemaining / reportsRemaining;

    // Check if recoverable (MTA must be between 2.0 and 5.0)
    const isRecoverable = requiredMta >= 2.0 && requiredMta <= 5.0;

    // Estimate end RSCA if using optimal strategy
    const feasibleMta = Math.max(2.0, Math.min(5.0, requiredMta));
    const estimatedTotalScore = currentTotalScore + (feasibleMta * reportsRemaining);
    const estimatedEndRsca = estimatedTotalScore / totalReportsAtEnd;

    // Determine difficulty
    let difficulty: RecoveryDifficulty;
    const deviation = Math.abs(requiredMta - currentRsca);

    if (!isRecoverable) {
        difficulty = 'impossible';
    } else if (deviation < 0.3 && reportsRemaining >= 3) {
        difficulty = 'easy';
    } else if (deviation < 0.5 && reportsRemaining >= 2) {
        difficulty = 'moderate';
    } else {
        difficulty = 'difficult';
    }

    // Calculate MTA range (with some buffer for flexibility)
    const buffer = 0.2;
    const minMta = Math.max(2.0, requiredMta - buffer);
    const maxMta = Math.min(5.0, requiredMta + buffer);

    // Determine reports needed for recovery (simplified)
    let reportsNeeded = reportsRemaining;
    if (difficulty === 'easy') {
        reportsNeeded = Math.ceil(reportsRemaining / 2);
    } else if (difficulty === 'moderate') {
        reportsNeeded = Math.ceil(reportsRemaining * 0.75);
    }

    return {
        isRecoverable,
        reportsNeeded,
        requiredMtaRange: {
            min: Math.round(minMta * 100) / 100,
            max: Math.round(maxMta * 100) / 100
        },
        difficulty,
        estimatedEndRsca: Math.round(estimatedEndRsca * 100) / 100
    };
};

/**
 * Generates actionable recommendations based on analysis
 */
export const generateRecommendations = (
    severity: RiskSeverity,
    currentRsca: number,
    recovery: RecoveryPlan,
    health: TrajectoryHealth,
    reportsRemaining: number
): RiskRecommendations => {
    const recommendations: RiskRecommendations = {
        primary: '',
        secondary: [],
        warnings: []
    };

    // Primary recommendation based on severity
    if (severity === 'emergency' || severity === 'critical') {
        if (currentRsca < 3.8) {
            recommendations.primary = `URGENT: Increase MTAs to ${recovery.requiredMtaRange.min}-${recovery.requiredMtaRange.max} immediately to reach safe zone.`;
        } else {
            recommendations.primary = `URGENT: Reduce MTAs to ${recovery.requiredMtaRange.min}-${recovery.requiredMtaRange.max} to correct high RSCA.`;
        }

        if (!recovery.isRecoverable) {
            recommendations.warnings.push('Target RSCA may not be achievable with remaining reports.');
            recommendations.warnings.push(`Best case scenario: RSCA will reach ${recovery.estimatedEndRsca}`);
        }
    } else if (severity === 'warning') {
        if (currentRsca < 3.8) {
            recommendations.primary = `Gradually increase MTAs to ${recovery.requiredMtaRange.min}-${recovery.requiredMtaRange.max} to enter safe zone.`;
        } else {
            recommendations.primary = `Gradually decrease MTAs to ${recovery.requiredMtaRange.min}-${recovery.requiredMtaRange.max} to enter safe zone.`;
        }
    } else if (severity === 'caution') {
        recommendations.primary = `Maintain steady MTAs around ${recovery.requiredMtaRange.min}-${recovery.requiredMtaRange.max} to stay in safe zone.`;
    } else {
        recommendations.primary = `Continue current strategy. Maintain MTAs around 4.0 to sustain excellent trajectory.`;
    }

    // Secondary recommendations
    if (health.volatility > 0.2) {
        recommendations.secondary.push('Reduce volatility by maintaining more consistent MTA values across reports.');
    }

    if (health.direction === 'degrading' && severity !== 'excellent') {
        recommendations.secondary.push('Trajectory is trending away from target. Consider adjusting strategy soon.');
    }

    if (reportsRemaining <= 2 && recovery.difficulty !== 'easy') {
        recommendations.secondary.push('Limited time remaining. Precise MTA targeting is critical.');
    }

    if (recovery.difficulty === 'difficult') {
        recommendations.secondary.push('Recovery requires aggressive action. Consider locking high-performers to preserve their scores.');
    }

    // Warnings
    if (reportsRemaining === 0) {
        recommendations.warnings.push('No future reports available. Current RSCA is final.');
    }

    if (currentRsca > 4.4) {
        recommendations.warnings.push('RSCA above maximum limit (4.4). Immediate correction required.');
    }

    if (currentRsca < 3.6) {
        recommendations.warnings.push('RSCA below minimum limit (3.6). Immediate boost required.');
    }

    return recommendations;
};

/**
 * Main function: Performs comprehensive risk analysis on a trajectory
 */
export const analyzeTrajectoryRisk = (
    trajectory: TrajectoryPoint[],
    config?: Partial<TargetConfig>
): RiskAnalysis => {
    if (trajectory.length === 0) {
        throw new Error('Cannot analyze empty trajectory');
    }

    // Sort trajectory by date
    const sorted = [...trajectory].sort((a, b) => a.date - b.date);

    // Determine current state (last historical point) and projected state
    const historicalPoints = sorted.filter(p => !p.isProjected);
    const projectedPoints = sorted.filter(p => p.isProjected);

    // Edge case: If no historical points, we can't analyze meaningfully
    if (historicalPoints.length === 0) {
        throw new Error('Cannot analyze trajectory with no historical data. At least one finalized group is required.');
    }

    const lastHistorical = historicalPoints[historicalPoints.length - 1];
    const lastPoint = sorted[sorted.length - 1];

    const currentRsca = lastHistorical.rsca;
    const projectedEndRsca = lastPoint.rsca;
    const reportsRemaining = projectedPoints.length;

    // Calculate margins
    const margins = sorted.map(p => p.margin);
    const minMargin = Math.min(...margins);
    const maxMargin = Math.max(...margins);

    // Health analysis
    const health = calculateTrajectoryHealth(sorted);

    // Severity assessment
    const severity = calculateRiskSeverity(currentRsca, minMargin, health, reportsRemaining);

    // Calculate current totals for recovery plan
    // Need to sum up ALL historical groups to get cumulative count and score
    const currentTotalReports = historicalPoints.reduce((sum, p) => sum + (p.memberCount || 0), 0) || 1;
    const currentTotalScore = currentRsca * currentTotalReports;

    // Recovery plan
    const recovery = calculateRecoveryPlan(
        currentRsca,
        currentTotalScore,
        currentTotalReports,
        reportsRemaining,
        config?.idealTarget || 4.0
    );

    // Generate recommendations
    const recommendations = generateRecommendations(
        severity,
        currentRsca,
        recovery,
        health,
        reportsRemaining
    );

    return {
        currentRsca,
        projectedEndRsca,
        minMargin,
        maxMargin,
        reportsRemaining,
        severity,
        health,
        recovery,
        recommendations,
        trajectory: sorted
    };
};
