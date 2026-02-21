// ============================================
// CSN-186: System Adoption — Score Computation
// ============================================

import { supabaseAdmin, isSupabaseAdminConfigured } from './connection';
import {
  ALL_MODULES,
  TOTAL_MODULES,
  MODULE_LABELS,
  ROLE_MODULE_ACCESS,
  ROLE_DAILY_TARGETS,
} from './usage-tracking';

// ============================================
// TYPES
// ============================================

export type AdoptionPeriod = '7d' | '30d' | '90d';

export interface ScoreBreakdown {
  score: number;
  breadth: number;
  depth: number;
  frequency: number;
}

export interface OverviewData extends ScoreBreakdown {
  activeUsers: number;
  totalUsers: number;
  actionsToday: number;
  activeModules: number;
  totalModules: number;
  trend: {
    scoreDelta: number;
    usersDelta: number;
    actionsDeltaPct: number;
  };
  modules: Array<{
    module: string;
    label: string;
    score: number;
    userCount: number;
    actionCount: number;
  }>;
  topUsers: Array<{
    userId: string;
    name: string;
    role: string;
    score: number;
    modulesUsed: number;
    modulesAvailable: number;
    totalActions: number;
  }>;
}

export interface UserScoreData {
  userId: string;
  name: string;
  role: string;
  score: number;
  daysActive: number;
  modulesUsed: number;
  modulesAvailable: number;
  totalActions: number;
}

export interface BranchScoreData {
  branchId: string;
  branchName: string;
  score: number;
  userCount: number;
  actionCount: number;
  breadth: number;
  depth: number;
  frequency: number;
}

// ============================================
// HELPERS
// ============================================

function periodToDays(period: AdoptionPeriod): number {
  return period === '7d' ? 7 : period === '30d' ? 30 : 90;
}

function periodToStartDate(period: AdoptionPeriod): string {
  const days = periodToDays(period);
  const start = new Date();
  start.setUTCDate(start.getUTCDate() - days);
  return start.toISOString();
}

function getWorkdays(period: AdoptionPeriod): number {
  const days = periodToDays(period);
  // Approximate: ~5 workdays per 7 calendar days
  return Math.ceil(days * 5 / 7);
}

/** Score color helper for UI */
export function getScoreColor(score: number): {
  color: string;
  bg: string;
  barColor: string;
  label: string;
} {
  if (score >= 80) return { color: 'text-green-600', bg: 'bg-green-50', barColor: 'bg-green-600', label: 'Excellent' };
  if (score >= 60) return { color: 'text-blue-600', bg: 'bg-blue-50', barColor: 'bg-blue-600', label: 'Good' };
  if (score >= 40) return { color: 'text-amber-600', bg: 'bg-amber-50', barColor: 'bg-amber-600', label: 'Needs Attention' };
  return { color: 'text-red-600', bg: 'bg-red-50', barColor: 'bg-red-600', label: 'Low' };
}

// ============================================
// OVERVIEW SCORE
// ============================================

export async function getOverviewScore(period: AdoptionPeriod): Promise<OverviewData | null> {
  if (!isSupabaseAdminConfigured()) return null;

  const startDate = periodToStartDate(period);
  const workdays = getWorkdays(period);

  try {
    // 1. Get all active employees (total eligible users)
    const { data: employees } = await supabaseAdmin!
      .from('employees')
      .select('id, full_name, system_role, branch_id')
      .in('status', ['active', 'probation']);

    if (!employees || employees.length === 0) {
      return createEmptyOverview();
    }

    const totalUsers = employees.length;
    const employeeMap = new Map(employees.map(e => [e.id, e]));

    // 2. Get usage events in period (excluding kiosk)
    const { data: events } = await supabaseAdmin!
      .from('usage_events')
      .select('user_id, module, action_type, created_at')
      .gte('created_at', startDate)
      .not('user_id', 'like', 'kiosk:%');

    if (!events || events.length === 0) {
      return createEmptyOverview(totalUsers);
    }

    // 3. Compute user-level stats
    const userStats = new Map<string, {
      modules: Set<string>;
      actions: number;
      days: Set<string>;
    }>();

    for (const event of events) {
      let stats = userStats.get(event.user_id);
      if (!stats) {
        stats = { modules: new Set(), actions: 0, days: new Set() };
        userStats.set(event.user_id, stats);
      }
      stats.modules.add(event.module);
      stats.actions++;
      stats.days.add(event.created_at.slice(0, 10)); // YYYY-MM-DD
    }

    const activeUsers = userStats.size;

    // 4. Compute platform score
    const breadth = (activeUsers / totalUsers) * 100;

    let depthSum = 0;
    let frequencySum = 0;
    const userScoreList: OverviewData['topUsers'] = [];

    for (const [userId, stats] of userStats) {
      const emp = employeeMap.get(userId);
      const role = emp?.system_role || 'employee';
      const availableModules = ROLE_MODULE_ACCESS[role]?.length || TOTAL_MODULES;
      const dailyTarget = ROLE_DAILY_TARGETS[role] || 5;

      const userDepth = (stats.modules.size / availableModules) * 100;
      const dailyActions = stats.actions / workdays;
      const userFrequency = Math.min(dailyActions / dailyTarget, 1.0) * 100;

      depthSum += userDepth;
      frequencySum += userFrequency;

      // User-level score: Login(30%) + Coverage(40%) + Volume(30%)
      const loginScore = Math.min(stats.days.size / 5, 1.0) * 100;
      const coverageScore = userDepth;
      const volumeScore = userFrequency;
      const userScore = loginScore * 0.3 + coverageScore * 0.4 + volumeScore * 0.3;

      userScoreList.push({
        userId,
        name: emp?.full_name || 'Unknown',
        role,
        score: Math.round(userScore),
        modulesUsed: stats.modules.size,
        modulesAvailable: availableModules,
        totalActions: stats.actions,
      });
    }

    const depth = activeUsers > 0 ? depthSum / activeUsers : 0;
    const frequency = activeUsers > 0 ? frequencySum / activeUsers : 0;
    const score = breadth * 0.4 + depth * 0.35 + frequency * 0.25;

    // 5. Compute module scores
    const moduleStats = new Map<string, { users: Set<string>; actions: number }>();
    for (const event of events) {
      let ms = moduleStats.get(event.module);
      if (!ms) {
        ms = { users: new Set(), actions: 0 };
        moduleStats.set(event.module, ms);
      }
      ms.users.add(event.user_id);
      ms.actions++;
    }

    const modules = ALL_MODULES.map(mod => {
      const ms = moduleStats.get(mod);
      const userCount = ms?.users.size || 0;
      const actionCount = ms?.actions || 0;

      // Eligible users = those whose role has access to this module
      const eligibleCount = employees.filter(e => {
        const roleModules = ROLE_MODULE_ACCESS[e.system_role || 'employee'] || [];
        return roleModules.includes(mod);
      }).length;

      const modBreadth = eligibleCount > 0 ? (userCount / eligibleCount) * 100 : 0;
      // Simplified module score using breadth + action density
      const modScore = Math.round(modBreadth * 0.6 + Math.min((actionCount / Math.max(userCount, 1)) / 10, 1) * 100 * 0.4);

      return {
        module: mod,
        label: MODULE_LABELS[mod] || mod,
        score: Math.min(modScore, 100),
        userCount,
        actionCount,
      };
    }).sort((a, b) => b.score - a.score);

    // 6. Compute actions today (UTC to match snapshot dates)
    const todayNow = new Date();
    const todayStr = `${todayNow.getUTCFullYear()}-${String(todayNow.getUTCMonth() + 1).padStart(2, '0')}-${String(todayNow.getUTCDate()).padStart(2, '0')}`;
    const actionsToday = events.filter(e => e.created_at.slice(0, 10) === todayStr).length;

    // 7. Compute trend (compare with previous period)
    const prevStartDate = new Date();
    prevStartDate.setDate(prevStartDate.getDate() - periodToDays(period) * 2);
    const prevEndDate = periodToStartDate(period);

    const { data: prevEvents } = await supabaseAdmin!
      .from('usage_events')
      .select('user_id, created_at')
      .gte('created_at', prevStartDate.toISOString())
      .lt('created_at', prevEndDate)
      .not('user_id', 'like', 'kiosk:%');

    const prevActiveUsers = new Set(prevEvents?.map(e => e.user_id) || []).size;
    const prevActionCount = prevEvents?.length || 0;

    // Look up yesterday's snapshot for accurate scoreDelta
    let scoreDelta = 0;
    try {
      const yesterday = new Date();
      yesterday.setUTCDate(yesterday.getUTCDate() - 1);
      const { data: prevSnapshot } = await supabaseAdmin!
        .from('adoption_snapshots')
        .select('score')
        .eq('period', period)
        .eq('snapshot_date', yesterday.toISOString().slice(0, 10))
        .single();

      if (prevSnapshot) {
        scoreDelta = Math.round(score) - prevSnapshot.score;
      }
    } catch {
      // No previous snapshot yet — keep 0
    }

    const trend = {
      scoreDelta,
      usersDelta: activeUsers - prevActiveUsers,
      actionsDeltaPct: prevActionCount > 0
        ? Math.round(((events.length - prevActionCount) / prevActionCount) * 100)
        : 0,
    };

    // Sort top users by score
    userScoreList.sort((a, b) => b.score - a.score);

    return {
      score: Math.round(score),
      breadth: Math.round(breadth),
      depth: Math.round(depth),
      frequency: Math.round(frequency),
      activeUsers,
      totalUsers,
      actionsToday,
      activeModules: moduleStats.size,
      totalModules: TOTAL_MODULES,
      trend,
      modules,
      topUsers: userScoreList.slice(0, 5),
    };
  } catch (error) {
    console.error('[Adoption] Error computing overview:', error);
    return null;
  }
}

// ============================================
// USER SCORES
// ============================================

export async function getUserScores(
  period: AdoptionPeriod,
  options?: { limit?: number; offset?: number; sort?: string; order?: string }
): Promise<{ users: UserScoreData[]; total: number } | null> {
  if (!isSupabaseAdminConfigured()) return null;

  const startDate = periodToStartDate(period);
  const limit = options?.limit || 10;
  const offset = options?.offset || 0;

  try {
    // Get employees
    const { data: employees } = await supabaseAdmin!
      .from('employees')
      .select('id, full_name, system_role, branch_id')
      .in('status', ['active', 'probation']);

    if (!employees) return null;

    const employeeMap = new Map(employees.map(e => [e.id, e]));

    // Get events
    const { data: events } = await supabaseAdmin!
      .from('usage_events')
      .select('user_id, module, action_type, created_at')
      .gte('created_at', startDate)
      .not('user_id', 'like', 'kiosk:%');

    if (!events) return { users: [], total: 0 };

    // Aggregate per user
    const userStats = new Map<string, {
      modules: Set<string>;
      actions: number;
      days: Set<string>;
    }>();

    for (const event of events) {
      let stats = userStats.get(event.user_id);
      if (!stats) {
        stats = { modules: new Set(), actions: 0, days: new Set() };
        userStats.set(event.user_id, stats);
      }
      stats.modules.add(event.module);
      stats.actions++;
      stats.days.add(event.created_at.slice(0, 10));
    }

    // Compute scores
    const users: UserScoreData[] = [];
    for (const [userId, stats] of userStats) {
      const emp = employeeMap.get(userId);
      const role = emp?.system_role || 'employee';
      const availableModules = ROLE_MODULE_ACCESS[role]?.length || TOTAL_MODULES;
      const dailyTarget = ROLE_DAILY_TARGETS[role] || 5;
      const workdays = getWorkdays(period);

      const loginScore = Math.min(stats.days.size / 5, 1.0) * 100;
      const coverageScore = (stats.modules.size / availableModules) * 100;
      const volumeScore = Math.min(stats.actions / (dailyTarget * workdays), 1.0) * 100;
      const score = loginScore * 0.3 + coverageScore * 0.4 + volumeScore * 0.3;

      users.push({
        userId,
        name: emp?.full_name || 'Unknown',
        role,
        score: Math.round(score),
        daysActive: stats.days.size,
        modulesUsed: stats.modules.size,
        modulesAvailable: availableModules,
        totalActions: stats.actions,
      });
    }

    // Sort
    const sortField = options?.sort || 'score';
    const desc = (options?.order || 'desc') === 'desc';
    users.sort((a, b) => {
      const aVal = sortField === 'name' ? a.name : sortField === 'actions' ? a.totalActions : a.score;
      const bVal = sortField === 'name' ? b.name : sortField === 'actions' ? b.totalActions : b.score;
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return desc ? bVal.localeCompare(aVal) : aVal.localeCompare(bVal);
      }
      return desc ? (bVal as number) - (aVal as number) : (aVal as number) - (bVal as number);
    });

    const total = users.length;
    const paginated = users.slice(offset, offset + limit);

    return { users: paginated, total };
  } catch (error) {
    console.error('[Adoption] Error computing user scores:', error);
    return null;
  }
}

// ============================================
// USER DETAIL
// ============================================

export async function getUserDetail(
  userId: string,
  period: AdoptionPeriod
): Promise<UserScoreData & { moduleBreakdown: Array<{ module: string; label: string; actionCount: number }> } | null> {
  if (!isSupabaseAdminConfigured()) return null;

  const startDate = periodToStartDate(period);

  try {
    const { data: emp } = await supabaseAdmin!
      .from('employees')
      .select('id, full_name, system_role, branch_id')
      .eq('id', userId)
      .single();

    if (!emp) return null;

    const { data: events } = await supabaseAdmin!
      .from('usage_events')
      .select('module, action_type, created_at')
      .eq('user_id', userId)
      .gte('created_at', startDate);

    if (!events) return null;

    const role = emp.system_role || 'employee';
    const availableModules = ROLE_MODULE_ACCESS[role]?.length || TOTAL_MODULES;
    const dailyTarget = ROLE_DAILY_TARGETS[role] || 5;
    const workdays = getWorkdays(period);

    const modules = new Set<string>();
    const days = new Set<string>();
    const moduleActions = new Map<string, number>();

    for (const event of events) {
      modules.add(event.module);
      days.add(event.created_at.slice(0, 10));
      moduleActions.set(event.module, (moduleActions.get(event.module) || 0) + 1);
    }

    const loginScore = Math.min(days.size / 5, 1.0) * 100;
    const coverageScore = (modules.size / availableModules) * 100;
    const volumeScore = Math.min(events.length / (dailyTarget * workdays), 1.0) * 100;
    const score = loginScore * 0.3 + coverageScore * 0.4 + volumeScore * 0.3;

    const moduleBreakdown = Array.from(moduleActions.entries())
      .map(([mod, count]) => ({ module: mod, label: MODULE_LABELS[mod] || mod, actionCount: count }))
      .sort((a, b) => b.actionCount - a.actionCount);

    return {
      userId,
      name: emp.full_name,
      role,
      score: Math.round(score),
      daysActive: days.size,
      modulesUsed: modules.size,
      modulesAvailable: availableModules,
      totalActions: events.length,
      moduleBreakdown,
    };
  } catch (error) {
    console.error('[Adoption] Error computing user detail:', error);
    return null;
  }
}

// ============================================
// MODULE DETAIL
// ============================================

export async function getModuleDetail(
  moduleName: string,
  period: AdoptionPeriod
): Promise<{
  module: string;
  label: string;
  score: number;
  userCount: number;
  actionCount: number;
  eligibleUsers: number;
  topUsers: Array<{ userId: string; name: string; actionCount: number }>;
} | null> {
  if (!isSupabaseAdminConfigured()) return null;
  if (!ALL_MODULES.includes(moduleName)) return null;

  const startDate = periodToStartDate(period);

  try {
    const { data: employees } = await supabaseAdmin!
      .from('employees')
      .select('id, full_name, system_role')
      .in('status', ['active', 'probation']);

    if (!employees) return null;

    const employeeMap = new Map(employees.map(e => [e.id, e]));
    const eligibleUsers = employees.filter(e => {
      const roleModules = ROLE_MODULE_ACCESS[e.system_role || 'employee'] || [];
      return roleModules.includes(moduleName);
    }).length;

    const { data: events } = await supabaseAdmin!
      .from('usage_events')
      .select('user_id, action_type, created_at')
      .eq('module', moduleName)
      .gte('created_at', startDate)
      .not('user_id', 'like', 'kiosk:%');

    if (!events) return null;

    const userActions = new Map<string, number>();
    for (const event of events) {
      userActions.set(event.user_id, (userActions.get(event.user_id) || 0) + 1);
    }

    const userCount = userActions.size;
    const actionCount = events.length;
    const modBreadth = eligibleUsers > 0 ? (userCount / eligibleUsers) * 100 : 0;
    const modScore = Math.round(
      modBreadth * 0.6 + Math.min((actionCount / Math.max(userCount, 1)) / 10, 1) * 100 * 0.4
    );

    const topUsers = Array.from(userActions.entries())
      .map(([userId, count]) => ({
        userId,
        name: employeeMap.get(userId)?.full_name || 'Unknown',
        actionCount: count,
      }))
      .sort((a, b) => b.actionCount - a.actionCount)
      .slice(0, 10);

    return {
      module: moduleName,
      label: MODULE_LABELS[moduleName] || moduleName,
      score: Math.min(modScore, 100),
      userCount,
      actionCount,
      eligibleUsers,
      topUsers,
    };
  } catch (error) {
    console.error('[Adoption] Error computing module detail:', error);
    return null;
  }
}

// ============================================
// BRANCH SCORES
// ============================================

export async function getBranchScores(period: AdoptionPeriod): Promise<BranchScoreData[] | null> {
  if (!isSupabaseAdminConfigured()) return null;

  const startDate = periodToStartDate(period);
  const workdays = getWorkdays(period);

  try {
    // Get branches
    const { data: branches } = await supabaseAdmin!
      .from('branches')
      .select('id, name');

    if (!branches) return null;

    const branchMap = new Map(branches.map(b => [b.id, b.name]));

    // Get employees per branch
    const { data: employees } = await supabaseAdmin!
      .from('employees')
      .select('id, system_role, branch_id')
      .in('status', ['active', 'probation'])
      .not('branch_id', 'is', null);

    if (!employees) return null;

    const branchEmployees = new Map<string, typeof employees>();
    for (const emp of employees) {
      if (!emp.branch_id) continue;
      const arr = branchEmployees.get(emp.branch_id) || [];
      arr.push(emp);
      branchEmployees.set(emp.branch_id, arr);
    }

    // Get events with branch_id
    const { data: events } = await supabaseAdmin!
      .from('usage_events')
      .select('user_id, module, action_type, branch_id, created_at')
      .gte('created_at', startDate)
      .not('branch_id', 'is', null);

    if (!events) return [];

    // Group events by branch
    const branchEvents = new Map<string, typeof events>();
    for (const event of events) {
      if (!event.branch_id) continue;
      const arr = branchEvents.get(event.branch_id) || [];
      arr.push(event);
      branchEvents.set(event.branch_id, arr);
    }

    // Compute scores per branch
    const results: BranchScoreData[] = [];

    for (const [branchId, branchName] of branchMap) {
      const emps = branchEmployees.get(branchId) || [];
      const evts = branchEvents.get(branchId) || [];

      if (emps.length === 0) continue;

      const totalBranchUsers = emps.length;
      const activeUserIds = new Set(evts.filter(e => !e.user_id.startsWith('kiosk:')).map(e => e.user_id));
      const activeUsers = activeUserIds.size;

      const breadth = (activeUsers / totalBranchUsers) * 100;

      // Depth: avg modules used per active user
      let depthSum = 0;
      let frequencySum = 0;
      const userModules = new Map<string, Set<string>>();
      const userActions = new Map<string, number>();

      for (const evt of evts) {
        if (evt.user_id.startsWith('kiosk:')) continue;
        if (!userModules.has(evt.user_id)) userModules.set(evt.user_id, new Set());
        userModules.get(evt.user_id)!.add(evt.module);
        userActions.set(evt.user_id, (userActions.get(evt.user_id) || 0) + 1);
      }

      for (const [userId, modules] of userModules) {
        const emp = emps.find(e => e.id === userId);
        const role = emp?.system_role || 'employee';
        const available = ROLE_MODULE_ACCESS[role]?.length || TOTAL_MODULES;
        const target = ROLE_DAILY_TARGETS[role] || 5;

        depthSum += (modules.size / available) * 100;
        const dailyActions = (userActions.get(userId) || 0) / workdays;
        frequencySum += Math.min(dailyActions / target, 1.0) * 100;
      }

      const depth = activeUsers > 0 ? depthSum / activeUsers : 0;
      const frequency = activeUsers > 0 ? frequencySum / activeUsers : 0;
      const score = breadth * 0.4 + depth * 0.35 + frequency * 0.25;

      results.push({
        branchId,
        branchName,
        score: Math.round(score),
        userCount: activeUsers,
        actionCount: evts.length,
        breadth: Math.round(breadth),
        depth: Math.round(depth),
        frequency: Math.round(frequency),
      });
    }

    results.sort((a, b) => b.score - a.score);
    return results;
  } catch (error) {
    console.error('[Adoption] Error computing branch scores:', error);
    return null;
  }
}

// ============================================
// SNAPSHOTS — Daily pre-computed scores
// ============================================

export interface SnapshotPoint {
  date: string;
  score: number;
}

/**
 * Compute adoption scores for all 3 periods and upsert into adoption_snapshots.
 * Called by the daily cron at /api/cron/adoption-snapshot.
 */
export async function computeAndStoreSnapshot(): Promise<{
  success: boolean;
  periods: AdoptionPeriod[];
  error?: string;
}> {
  if (!isSupabaseAdminConfigured()) {
    return { success: false, periods: [], error: 'DB not configured' };
  }

  // Use UTC to ensure consistent snapshot dates regardless of server timezone
  const now = new Date();
  const today = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-${String(now.getUTCDate()).padStart(2, '0')}`;
  const periods: AdoptionPeriod[] = ['7d', '30d', '90d'];
  const stored: AdoptionPeriod[] = [];

  for (const period of periods) {
    try {
      const data = await getOverviewScore(period);
      if (!data) continue;

      await supabaseAdmin!.from('adoption_snapshots').upsert(
        {
          snapshot_date: today,
          period,
          score: data.score,
          breadth: data.breadth,
          depth: data.depth,
          frequency: data.frequency,
          active_users: data.activeUsers,
          total_users: data.totalUsers,
          action_count: data.actionsToday,
          module_scores: data.modules,
        },
        { onConflict: 'snapshot_date,period' }
      );
      stored.push(period);
    } catch (err) {
      console.error(`[Adoption] Snapshot failed for ${period}:`, err);
    }
  }

  return { success: stored.length > 0, periods: stored };
}

/**
 * Fetch recent daily snapshots for a given period — used to power the trend chart.
 * Returns data points ordered ascending by date (oldest first).
 */
export async function getSnapshotTrend(
  period: AdoptionPeriod,
  days?: number
): Promise<SnapshotPoint[]> {
  if (!isSupabaseAdminConfigured()) return [];

  const limit = days || periodToDays(period);

  try {
    const { data } = await supabaseAdmin!
      .from('adoption_snapshots')
      .select('snapshot_date, score')
      .eq('period', period)
      .order('snapshot_date', { ascending: false })
      .limit(limit);

    // Reverse to ascending order (oldest first) for chart rendering
    return (data || []).reverse().map(row => ({
      date: row.snapshot_date,
      score: row.score,
    }));
  } catch (error) {
    console.error('[Adoption] Error fetching snapshot trend:', error);
    return [];
  }
}

// ============================================
// KIOSK USAGE BY BRANCH
// ============================================

export interface KioskBranchUsage {
  branchId: string;
  branchName: string;
  totalActions: number;
  modules: Array<{ module: string; label: string; actionCount: number }>;
  actionTypes: Record<string, number>;
  activeDays: number;
  avgActionsPerDay: number;
}

/**
 * Aggregate kiosk usage events grouped by branch.
 * Branch is extracted from user_id ('kiosk:{slug}'), not branch_id column.
 */
export async function getKioskUsageByBranch(
  period: AdoptionPeriod
): Promise<KioskBranchUsage[] | null> {
  if (!isSupabaseAdminConfigured()) return null;

  try {
    const startDate = periodToStartDate(period);

    // Fetch kiosk events
    const { data: events, error: evtErr } = await supabaseAdmin!
      .from('usage_events')
      .select('user_id, module, action_type, created_at')
      .like('user_id', 'kiosk:%')
      .gte('created_at', startDate);

    if (evtErr) {
      console.error('[Adoption] Kiosk events query error:', evtErr);
      return null;
    }
    if (!events || events.length === 0) return [];

    // Fetch branch names for lookup
    const { data: branchRows } = await supabaseAdmin!
      .from('branches')
      .select('id, name');

    const branchNameMap = new Map<string, string>();
    for (const b of branchRows || []) {
      branchNameMap.set(b.id, b.name);
    }

    // Group events by branch slug (extracted from user_id)
    const grouped = new Map<string, typeof events>();
    for (const evt of events) {
      const slug = evt.user_id.replace('kiosk:', '');
      const arr = grouped.get(slug) || [];
      arr.push(evt);
      grouped.set(slug, arr);
    }

    // Compute metrics per branch
    const results: KioskBranchUsage[] = [];

    for (const [slug, branchEvents] of grouped) {
      // Module breakdown
      const moduleCounts = new Map<string, number>();
      const actionTypeCounts: Record<string, number> = {};
      const activeDateSet = new Set<string>();

      for (const evt of branchEvents) {
        moduleCounts.set(evt.module, (moduleCounts.get(evt.module) || 0) + 1);
        actionTypeCounts[evt.action_type] = (actionTypeCounts[evt.action_type] || 0) + 1;
        activeDateSet.add(evt.created_at.slice(0, 10)); // YYYY-MM-DD
      }

      const modules = Array.from(moduleCounts.entries())
        .map(([mod, count]) => ({
          module: mod,
          label: MODULE_LABELS[mod] || mod,
          actionCount: count,
        }))
        .sort((a, b) => b.actionCount - a.actionCount);

      const activeDays = activeDateSet.size;

      results.push({
        branchId: slug,
        branchName: branchNameMap.get(slug) || slug.charAt(0).toUpperCase() + slug.slice(1),
        totalActions: branchEvents.length,
        modules,
        actionTypes: actionTypeCounts,
        activeDays,
        avgActionsPerDay: activeDays > 0 ? Math.round((branchEvents.length / activeDays) * 10) / 10 : 0,
      });
    }

    results.sort((a, b) => b.totalActions - a.totalActions);
    return results;
  } catch (error) {
    console.error('[Adoption] Error computing kiosk usage:', error);
    return null;
  }
}

// ============================================
// EMPTY STATE HELPER
// ============================================

function createEmptyOverview(totalUsers: number = 0): OverviewData {
  return {
    score: 0,
    breadth: 0,
    depth: 0,
    frequency: 0,
    activeUsers: 0,
    totalUsers,
    actionsToday: 0,
    activeModules: 0,
    totalModules: TOTAL_MODULES,
    trend: { scoreDelta: 0, usersDelta: 0, actionsDeltaPct: 0 },
    modules: ALL_MODULES.map(mod => ({
      module: mod,
      label: MODULE_LABELS[mod] || mod,
      score: 0,
      userCount: 0,
      actionCount: 0,
    })),
    topUsers: [],
  };
}
