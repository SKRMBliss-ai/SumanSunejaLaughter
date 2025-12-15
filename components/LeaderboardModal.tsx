import React, { useState } from 'react';
import { X, Trophy, Crown, Medal, User, TrendingUp, Flame } from 'lucide-react';
import { useSettings } from '../contexts/SettingsContext';
import { getLevelTitle, getLeaderboardData, LeaderboardUser } from '../services/rewardService';

interface LeaderboardModalProps {
    isOpen: boolean;
    onClose: () => void;
}
// Removed MOCK_LEADERBOARD

export const LeaderboardModal: React.FC<LeaderboardModalProps> = ({ isOpen, onClose }) => {
    const { currentTheme } = useSettings();
    const [period, setPeriod] = useState<'weekly' | 'allTime'>('weekly');
    const [leaderboardData, setLeaderboardData] = useState<LeaderboardUser[]>([]);
    const [loading, setLoading] = useState(true);

    React.useEffect(() => {
        if (isOpen) {
            setLoading(true);
            getLeaderboardData().then(data => {
                setLeaderboardData(data);
                setLoading(false);
            });
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const getRankIcon = (rank: number) => {
        switch (rank) {
            case 1: return <Crown size={20} className="text-yellow-500 fill-yellow-500" />;
            case 2: return <Medal size={20} className="text-gray-400 fill-gray-400" />;
            case 3: return <Medal size={20} className="text-amber-700 fill-amber-700" />;
            default: return <span className="font-bold text-gray-400 w-5 text-center">{rank}</span>;
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/50 backdrop-blur-md animate-in fade-in duration-300">
            <div className={`w-full max-w-sm rounded-[2.5rem] shadow-2xl flex flex-col relative overflow-hidden animate-in zoom-in-95 duration-300 ${currentTheme.BG_GRADIENT_LIGHT} dark:bg-slate-900 dark:bg-none border border-white/40 dark:border-slate-700 max-h-[80vh]`}>

                {/* Header Background Pattern */}
                <div className="absolute top-0 left-0 w-full h-48 bg-white/40 dark:bg-slate-800/50 backdrop-blur-md z-0"
                    style={{ borderBottomLeftRadius: '2.5rem', borderBottomRightRadius: '2.5rem' }}></div>

                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-5 right-5 z-20 p-2 rounded-full bg-white/50 hover:bg-white/80 dark:bg-white/10 dark:hover:bg-white/20 transition-colors shadow-sm"
                >
                    <X size={18} className="text-gray-700 dark:text-gray-200" />
                </button>

                {/* Title */}
                <div className="relative z-10 flex flex-col items-center pt-8 pb-4">
                    <div className="flex items-center gap-2 mb-1">
                        <Trophy className="text-yellow-600 dark:text-yellow-400 fill-yellow-500/20" size={24} />
                        <h2 className={`text-xl font-black text-slate-900 dark:text-white tracking-tight`}>Leaderboard</h2>
                    </div>
                    <p className={`text-xs text-slate-600 dark:text-gray-300 font-bold`}>Top Laughter Champions</p>
                </div>



                {/* List */}
                <div className="flex-1 overflow-y-auto px-4 pb-4 relative z-10 no-scrollbar space-y-4">
                    {loading ? (
                        <div className="space-y-3 pt-2">
                            {[1, 2, 3, 4, 5].map(i => (
                                <div key={i} className="h-16 bg-white/40 dark:bg-slate-800/40 rounded-2xl animate-pulse"></div>
                            ))}
                        </div>
                    ) : (
                        Object.entries(
                            leaderboardData.reduce((groups, user) => {
                                const title = getLevelTitle(user.points);
                                if (!groups[title]) groups[title] = [];
                                groups[title].push(user);
                                return groups;
                            }, {} as Record<string, LeaderboardUser[]>)
                        )
                            // Sort groups by points of the first user to keep high ranks at top
                            .sort(([, usersA], [, usersB]) => usersB[0].points - usersA[0].points)
                            .map(([title, users]: [string, LeaderboardUser[]]) => (
                                <div key={title}>
                                    {/* Category Label */}
                                    <div className="px-2 py-1.5 mb-2 text-xs font-black uppercase tracking-widest text-slate-600 dark:text-slate-400 flex items-center gap-2">
                                        <div className="h-[1px] flex-1 bg-slate-300 dark:bg-slate-700/50"></div>
                                        {title}
                                        <div className="h-[1px] flex-1 bg-slate-300 dark:bg-slate-700/50"></div>
                                    </div>

                                    <div className="space-y-2">
                                        {users.map((user) => (
                                            <div
                                                key={user.rank}
                                                className={`
                                            flex items-center gap-3 p-3 rounded-2xl border transition-transform
                                            ${user.isCurrentUser
                                                        ? 'bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-200 shadow-sm scale-[1.02]'
                                                        : 'bg-white/60 dark:bg-slate-800/60 border-white/40 dark:border-slate-700'
                                                    }
                                        `}
                                            >
                                                <div className="w-8 flex justify-center shrink-0">
                                                    {getRankIcon(user.rank)}
                                                </div>

                                                <div className="relative shrink-0">
                                                    <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-white shadow-sm bg-gray-200 flex items-center justify-center">
                                                        {user.avatar ? <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" /> : <User size={24} className="text-gray-400" />}
                                                    </div>
                                                    {user.rank <= 3 && (
                                                        <div className="absolute -bottom-1 -right-1 bg-yellow-400 text-[8px] font-black text-white px-1 rounded-full border border-white">
                                                            #{user.rank}
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="flex-1 min-w-0">
                                                    <h4 className={`text-sm font-bold truncate ${user.isCurrentUser ? 'text-yellow-800 dark:text-yellow-400' : 'text-slate-900 dark:text-slate-100'}`}>
                                                        {user.name} {user.isCurrentUser && '(You)'}
                                                    </h4>
                                                    <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                                                        <span className="flex items-center gap-0.5"><Flame size={10} className="text-orange-500" /> {user.streak}</span>
                                                    </div>
                                                </div>

                                                <div className="text-right">
                                                    <div className="text-sm font-black text-slate-900 dark:text-white">{user.points}</div>
                                                    <div className="text-[10px] font-bold text-slate-400 uppercase">Pts</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))
                    )}
                </div>

                {/* Self Rank Footer */}
                <div className="p-4 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-t border-white/50 dark:border-slate-700 z-20">
                    <div className="flex justify-between items-center text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                        <span>Your Rank</span>
                        <span className="flex items-center gap-1 text-green-500">
                            <TrendingUp size={12} />
                            {loading ? '...' : (
                                leaderboardData.find(u => u.isCurrentUser)
                                    ? `#${leaderboardData.find(u => u.isCurrentUser)?.rank}`
                                    : 'Unranked'
                            )}
                        </span>
                    </div>
                </div>

            </div>
        </div>
    );
};
