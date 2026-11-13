import mongoose from 'mongoose';
import { Activity, Team, User, Workout } from '../models/index.js';

function badRequest(message: string) {
  return Object.assign(new Error(message), { status: 400 });
}

export async function listActivities() {
  return Activity.find().lean();
}

export async function createActivity(input: unknown) {
  if (!input || typeof input !== 'object') {
    throw badRequest('Activity input is required');
  }

  const { userId, teamId, type, minutes } = input as Record<string, unknown>;
  if (!userId || !teamId || typeof type !== 'string' || !type.trim() || typeof minutes === 'undefined') {
    throw badRequest('userId, teamId, type, and minutes are required');
  }

  const parsedMinutes = Number(minutes);
  if (!Number.isFinite(parsedMinutes) || parsedMinutes <= 0) {
    throw badRequest('minutes must be a positive number');
  }

  const userIdText = String(userId);
  const teamIdText = String(teamId);
  if (!mongoose.Types.ObjectId.isValid(userIdText) || !mongoose.Types.ObjectId.isValid(teamIdText)) {
    throw badRequest('userId and teamId must be valid Mongo ObjectIds');
  }

  const [user, team] = await Promise.all([
    User.findById(userIdText),
    Team.findById(teamIdText),
  ]);

  if (!user || !team) {
    throw Object.assign(new Error('User or team not found'), { status: 404 });
  }

  const activity = await Activity.create({
    user: user._id,
    team: team._id,
    type: type.trim(),
    minutes: parsedMinutes,
    points: parsedMinutes,
    occurredAt: new Date(),
  });

  return activity.toObject();
}

export async function listTeams() {
  return Team.find().lean();
}

export async function createTeam(input: unknown) {
  if (!input || typeof input !== 'object') {
    throw badRequest('Team input is required');
  }

  const { name, mascot, members } = input as Record<string, unknown>;
  if (typeof name !== 'string' || !name.trim()) {
    throw badRequest('name is required');
  }
  if (typeof mascot !== 'string' || !mascot.trim()) {
    throw badRequest('mascot is required');
  }

  const memberIds: mongoose.Types.ObjectId[] = [];
  if (members !== undefined) {
    if (!Array.isArray(members)) {
      throw badRequest('members must be an array of user ids');
    }

    for (const member of members) {
      const value = String(member);
      if (!mongoose.Types.ObjectId.isValid(value)) {
        throw badRequest('members must contain valid Mongo ObjectIds');
      }
      memberIds.push(new mongoose.Types.ObjectId(value));
    }
  }

  const team = await Team.create({
    name: name.trim(),
    mascot: mascot.trim(),
    members: memberIds,
  });

  return team.toObject();
}

export async function getLeaderboard() {
  const totals = await Activity.aggregate([
    { $group: { _id: '$team', totalPoints: { $sum: '$points' } } },
    { $sort: { totalPoints: -1, _id: 1 } },
    { $lookup: { from: 'teams', localField: '_id', foreignField: '_id', as: 'team' } },
    { $unwind: '$team' },
    { $project: { _id: 0, teamName: '$team.name', totalPoints: 1 } },
  ]);

  return totals.map((entry, index) => ({
    teamName: entry.teamName,
    totalPoints: entry.totalPoints,
    rank: index + 1,
  }));
}

export async function suggestWorkouts(userEmail: string) {
  const normalizedEmail = userEmail.trim().toLowerCase();
  const user = await User.findOne({ email: normalizedEmail }).lean();
  if (!user) {
    throw Object.assign(new Error('User not found'), { status: 404 });
  }

  const recentActivity = await Activity.find({ user: user._id }).sort({ occurredAt: -1 }).lean();
  const activityTypeCounts = recentActivity.reduce<Record<string, number>>((counts, activity) => {
    const type = String(activity.type ?? '').trim();
    if (!type) return counts;
    counts[type] = (counts[type] ?? 0) + 1;
    return counts;
  }, {});
  const topType = Object.entries(activityTypeCounts).sort((a, b) => b[1] - a[1])[0]?.[0];
  const preferredFocus = typeof user.fitnessGoal === 'string' && user.fitnessGoal.trim() ? user.fitnessGoal.trim() : topType ?? '';

  const workouts = await Workout.find().lean();
  const ranked = workouts
    .map((workout) => {
      const focus = String(workout.focus ?? '').trim().toLowerCase();
      const goal = String(preferredFocus ?? '').trim().toLowerCase();
      const recentType = topType ? topType.toLowerCase() : '';
      let score = 0;
      let reason = 'This workout matches your recent activity pattern.';

      if (focus && goal && focus === goal) {
        score += 3;
        reason = `Matches your ${preferredFocus} goal and recent activity pattern.`;
      }
      if (topType && focus === recentType) {
        score += 2;
        reason = `Your recent ${topType} activity suggests this ${workout.focus} workout.`;
      }
      if (focus.includes(goal) || goal.includes(focus)) {
        score += 1;
      }
      if (score === 0) {
        reason = `This workout supports your ${preferredFocus || 'current'} training goals.`;
      }

      return { ...workout, score, reason };
    })
    .sort((a, b) => b.score - a.score || Number(a.minutes) - Number(b.minutes));

  return ranked.map(({ _id, title, focus, minutes, difficulty, reason }) => ({
    _id,
    title,
    focus,
    minutes,
    difficulty,
    reason,
  }));
}

export { User };
