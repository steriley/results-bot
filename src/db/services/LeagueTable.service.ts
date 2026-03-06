import type { Types } from 'mongoose';
import { User } from '@/db/model/User.model';
import { UserPrediction } from '@/db/model/UserPrediction.model';

// ─── Constants ────────────────────────────────────────────────────────────────

const POINTS = {
  CORRECT_SCORE: 10,
  CORRECT_RESULT: 3,
} as const;

// ─── Public Types ─────────────────────────────────────────────────────────────

export type TimeFilter = 'weekly' | 'monthly' | 'all-time';
export type SortField = 'totalPoints' | 'accuracy' | 'correctScores';

export interface LeagueTableEntry {
  userId: string;
  userName: string;
  played: number;
  correctResults: number;
  correctScores: number;
  accuracy: number;
  totalPoints: number;
}

export interface GetLeagueTableOptions {
  timeFilter: TimeFilter;
  sortBy: SortField;
}

// ─── Internal Types ───────────────────────────────────────────────────────────

interface UserPredictionAggregation {
  _id: Types.ObjectId;
  played: number;
  correctScores: number;
  correctResults: number;
  totalPoints: number;
}

interface LeanUser {
  _id: Types.ObjectId;
  name?: string;
}

// ─── Date Filter ──────────────────────────────────────────────────────────────

function getFromDate(timeFilter: TimeFilter): Date | null {
  if (timeFilter === 'all-time') return null;

  const now = new Date();

  if (timeFilter === 'weekly') {
    const date = new Date(now);
    date.setDate(now.getDate() - 7);
    return date;
  }

  const date = new Date(now);
  date.setMonth(now.getMonth() - 1);
  return date;
}

function buildDateMatch(timeFilter: TimeFilter): Record<string, unknown> {
  const fromDate = getFromDate(timeFilter);
  if (!fromDate) return {};
  return { createdAt: { $gte: fromDate } };
}

// ─── Aggregation ──────────────────────────────────────────────────────────────

async function getPredictionStatsByUser(
  timeFilter: TimeFilter,
): Promise<UserPredictionAggregation[]> {
  const dateMatch = buildDateMatch(timeFilter);

  return UserPrediction.aggregate<UserPredictionAggregation>([
    { $match: dateMatch },
    {
      $group: {
        _id: '$userId',
        played: { $sum: 1 },
        correctScores: {
          $sum: { $cond: [{ $eq: ['$score', POINTS.CORRECT_SCORE] }, 1, 0] },
        },
        correctResults: {
          $sum: { $cond: [{ $eq: ['$score', POINTS.CORRECT_RESULT] }, 1, 0] },
        },
        totalPoints: { $sum: '$score' },
      },
    },
  ]);
}

// ─── User Name Lookup ─────────────────────────────────────────────────────────

async function getUserNameMap(userIds: Types.ObjectId[]): Promise<Map<string, string>> {
  const users = await User.find({ _id: { $in: userIds } })
    .select('_id name')
    .lean<LeanUser[]>();

  return new Map(users.map((u) => [u._id.toString(), u.name ?? 'Unknown']));
}

// ─── Assembly ─────────────────────────────────────────────────────────────────

function calculateAccuracy(played: number, correctScores: number, correctResults: number): number {
  if (played === 0) return 0;
  const totalCorrect = correctScores + correctResults;
  return Math.round((totalCorrect / played) * 1000) / 10;
}

function buildLeagueEntry(
  aggregation: UserPredictionAggregation,
  userName: string,
): LeagueTableEntry {
  const { _id, played, correctScores, correctResults, totalPoints } = aggregation;

  return {
    userId: _id.toString(),
    userName,
    played,
    correctResults,
    correctScores,
    accuracy: calculateAccuracy(played, correctScores, correctResults),
    totalPoints,
  };
}

// ─── Sorting ──────────────────────────────────────────────────────────────────

const SORT_COMPARATORS: Record<SortField, (a: LeagueTableEntry, b: LeagueTableEntry) => number> = {
  totalPoints: (a, b) => b.totalPoints - a.totalPoints,
  accuracy: (a, b) => b.accuracy - a.accuracy,
  correctScores: (a, b) => b.correctScores - a.correctScores,
};

// ─── Main Function ────────────────────────────────────────────────────────────

export async function getLeagueTable(options: GetLeagueTableOptions): Promise<LeagueTableEntry[]> {
  const { timeFilter, sortBy } = options;

  const aggregations = await getPredictionStatsByUser(timeFilter);

  if (aggregations.length === 0) return [];

  const userIds = aggregations.map((a) => a._id);
  const userNameMap = await getUserNameMap(userIds);

  const entries = aggregations.map((aggregation) => {
    const userName = userNameMap.get(aggregation._id.toString()) ?? 'Unknown';
    return buildLeagueEntry(aggregation, userName);
  });

  return entries.sort(SORT_COMPARATORS[sortBy]);
}
