'use client';

import { getScoreColor } from './ScoreBadge';

const ROLE_BADGE_STYLES: Record<string, string> = {
  general_manager: 'bg-purple-50 text-purple-600 border-purple-200',
  ceo: 'bg-purple-50 text-purple-600 border-purple-200',
  branch_manager: 'bg-green-50 text-green-600 border-green-200',
  hr: 'bg-blue-50 text-blue-600 border-blue-200',
  chief_accountant: 'bg-teal-50 text-teal-600 border-teal-200',
  accountant: 'bg-teal-50 text-teal-600 border-teal-200',
  recruiter: 'bg-green-50 text-green-600 border-green-200',
  legal_manager: 'bg-indigo-50 text-indigo-600 border-indigo-200',
  reports_manager: 'bg-gray-50 text-gray-600 border-gray-200',
  employee: 'bg-gray-50 text-gray-600 border-gray-200',
};

const ROLE_LABELS: Record<string, string> = {
  general_manager: 'GM',
  ceo: 'CEO',
  branch_manager: 'BM',
  hr: 'HR',
  chief_accountant: 'CA',
  accountant: 'Acct',
  recruiter: 'Rec',
  legal_manager: 'Legal',
  reports_manager: 'Rep',
  employee: 'Emp',
};

const ROLE_AVATAR_STYLES: Record<string, string> = {
  general_manager: 'bg-purple-50 text-purple-600',
  ceo: 'bg-purple-50 text-purple-600',
  branch_manager: 'bg-green-50 text-green-600',
  hr: 'bg-blue-50 text-blue-600',
  chief_accountant: 'bg-teal-50 text-teal-600',
  accountant: 'bg-teal-50 text-teal-600',
  employee: 'bg-gray-50 text-gray-600',
};

interface UserScore {
  userId: string;
  name: string;
  role: string;
  score: number;
  modulesUsed: number;
  modulesAvailable: number;
  totalActions: number;
}

interface TopUsersTableProps {
  users: UserScore[];
  totalCount?: number;
}

function getInitials(name: string): string {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

export function TopUsersTable({ users, totalCount }: TopUsersTableProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2">
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
          </svg>
          <span className="text-base font-semibold text-gray-900">Top Users</span>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr>
              <th className="text-left px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide border-b border-gray-200">#</th>
              <th className="text-left px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide border-b border-gray-200">User</th>
              <th className="text-left px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide border-b border-gray-200">Role</th>
              <th className="text-left px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide border-b border-gray-200">Score</th>
              <th className="text-left px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide border-b border-gray-200">Modules</th>
              <th className="text-left px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide border-b border-gray-200">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user, i) => {
              const { color } = getScoreColor(user.score);
              const rankColor = i === 0 ? 'text-amber-600 font-semibold' :
                i === 1 ? 'text-gray-400 font-semibold' :
                i === 2 ? 'text-orange-600 font-semibold' : 'text-gray-400';
              const avatarStyle = ROLE_AVATAR_STYLES[user.role] || 'bg-gray-50 text-gray-600';
              const badgeStyle = ROLE_BADGE_STYLES[user.role] || 'bg-gray-50 text-gray-600 border-gray-200';

              return (
                <tr key={user.userId} className="border-b border-gray-50 last:border-b-0">
                  <td className={`px-3 py-3 text-sm ${rankColor}`}>{i + 1}</td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0 ${avatarStyle}`}>
                        {getInitials(user.name)}
                      </div>
                      <span className="text-sm font-medium text-gray-900">{user.name}</span>
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium border ${badgeStyle}`}>
                      {ROLE_LABELS[user.role] || user.role}
                    </span>
                  </td>
                  <td className={`px-3 py-3 text-sm font-semibold ${color}`}>{user.score}</td>
                  <td className="px-3 py-3 text-sm text-gray-500">{user.modulesUsed}/{user.modulesAvailable}</td>
                  <td className="px-3 py-3 text-sm text-gray-500">{user.totalActions}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {totalCount && totalCount > users.length && (
        <div className="px-5 py-3 border-t border-gray-200 bg-gray-50 text-center">
          <span className="text-xs text-gray-500">Showing top {users.length} of {totalCount} active users</span>
        </div>
      )}
    </div>
  );
}
