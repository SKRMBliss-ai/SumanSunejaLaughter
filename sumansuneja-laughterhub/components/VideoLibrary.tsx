import React, { useState, useEffect } from 'react';
import { Search, Heart, Download, Play, Pause, Filter, WifiOff, Trash2, Check, Loader2, Youtube, ChevronLeft, ChevronRight, ExternalLink, X } from 'lucide-react';
import { addPoints } from '../services/rewardService';

// Updated with specific requested videos
const SAMPLE_VIDEOS = [
  { id: '16OrPGE8Iv4', title: 'Corporate Laughter Yoga Session', category: 'Corporate', duration: '04:12' },
  { id: 'CDYLAntNXXs', title: 'Laughter Therapy for Wellness', category: 'Health', duration: '06:45' },
  { id: '0eWyBFL-Pkw', title: 'Joyful Laughter Exercises', category: 'Exercises', duration: '05:30' },
  { id: 'Ti8mCOgubi8', title: 'Clap and Laugh Together', category: 'Fun', duration: '03:15' },
  { id: 'BgpIka_yVos', title: 'Morning Laughter Energy Boost', category: 'Morning', duration: '06:50' },
  { id: '2Y_dGlaNRbI', title: 'Deep Laughter Meditation', category: 'Meditation', duration: '08:20' },
  { id: 'AWZCm_QeJEg', title: 'Relieve Stress with Laughter Yoga', category: 'Stress Relief', duration: '15:20' },
  { id: 'zE0MuXYOAIk', title: 'Daily Laughter Yoga Routine', category: 'Daily', duration: '08:15' },
  { id: 'Ogr7pxKp2k4', title: 'Laughter Yoga Exercises for Joy', category: 'Sessions', duration: '12:30' },
  { id: 'Mi9EPD3L52s', title: 'Laughter Yoga for Seniors & Beginners', category: 'Seniors', duration: '10:45' },
];

const ITEMS_PER_PAGE = 5;

export const VideoLibrary: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'ALL' | 'FAV' | 'OFFLINE'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [playingVideoId, setPlayingVideoId] = useState<string | null>(null);
  
  // Persisted State
  const [favorites, setFavorites] = useState<string[]>(() => {
    const saved = localStorage.getItem('suman_fav_videos');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [downloads, setDownloads] = useState<string[]>(() => {
    const saved = localStorage.getItem('suman_dl_videos');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [downloading, setDownloading] = useState<string | null>(null);

  useEffect(() => {
    localStorage.setItem('suman_fav_videos', JSON.stringify(favorites));
  }, [favorites]);

  useEffect(() => {
    localStorage.setItem('suman_dl_videos', JSON.stringify(downloads));
  }, [downloads]);

  // Actions
  const toggleFavorite = (id: string) => {
    if (favorites.includes(id)) {
      setFavorites(prev => prev.filter(vidId => vidId !== id));
    } else {
      setFavorites(prev => [...prev, id]);
    }
  };

  const handleDownload = (id: string) => {
    if (downloads.includes(id)) {
       // Remove
       if (window.confirm("Remove from offline library?")) {
         setDownloads(prev => prev.filter(vidId => vidId !== id));
       }
       return;
    }

    setDownloading(id);
    // Simulate network delay
    setTimeout(() => {
      setDownloads(prev => [...prev, id]);
      setDownloading(null);
      addPoints(10, "Offline Video Saved", 'VIDEO');
    }, 2000);
  };

  const handlePlay = (id: string) => {
    setPlayingVideoId(id);
    addPoints(5, "Video Session Started", 'VIDEO');
  };

  const stopPlayback = () => {
    setPlayingVideoId(null);
  };

  // Filter Logic
  const categories = Array.from(new Set(SAMPLE_VIDEOS.map(v => v.category)));

  const filteredVideos = SAMPLE_VIDEOS.filter(video => {
    const matchesSearch = video.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory ? video.category === selectedCategory : true;
    const matchesTab = 
      activeTab === 'FAV' ? favorites.includes(video.id) :
      activeTab === 'OFFLINE' ? downloads.includes(video.id) : true;

    return matchesSearch && matchesCategory && matchesTab;
  });

  const totalPages = Math.ceil(filteredVideos.length / ITEMS_PER_PAGE);
  const displayedVideos = filteredVideos.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const playingVideo = SAMPLE_VIDEOS.find(v => v.id === playingVideoId);

  return (
    <div className="p-4 pb-28 min-h-screen bg-[#F5F3FA] dark:bg-slate-900 animate-in fade-in duration-500">
      
      {/* Header & Tabs */}
      <div className="sticky top-0 bg-[#F5F3FA] dark:bg-slate-900 z-20 pb-4 pt-2">
        <div className="flex items-center justify-between mb-4">
           <div>
             <h2 className="text-2xl font-fredoka font-bold text-gray-700 dark:text-gray-100 flex items-center gap-2">
               <Youtube className="text-red-500" /> Video Library
             </h2>
             <a href="https://www.youtube.com/@sumansunejaofficial" target="_blank" rel="noopener noreferrer" className="text-xs text-[#AABBCC] font-bold flex items-center gap-1 hover:text-red-500 transition-colors">
                Visit Official Channel <ExternalLink size={10} />
             </a>
           </div>
           <div className="text-xs font-bold text-[#AABBCC] bg-white dark:bg-slate-800 px-3 py-1 rounded-full border border-gray-100 dark:border-slate-700 shadow-sm">
              {filteredVideos.length} Videos
           </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex p-1 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 mb-4">
          <button 
            onClick={() => { setActiveTab('ALL'); setCurrentPage(1); }}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${activeTab === 'ALL' ? 'bg-[#ABCEC9] text-white shadow-md' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'}`}
          >
            All Videos
          </button>
          <button 
            onClick={() => { setActiveTab('FAV'); setCurrentPage(1); }}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1 ${activeTab === 'FAV' ? 'bg-[#C3B8D5] text-white shadow-md' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'}`}
          >
            <Heart size={12} fill={activeTab === 'FAV' ? "currentColor" : "none"} /> Favorites
          </button>
          <button 
            onClick={() => { setActiveTab('OFFLINE'); setCurrentPage(1); }}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1 ${activeTab === 'OFFLINE' ? 'bg-gray-700 text-white shadow-md' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'}`}
          >
             {activeTab === 'OFFLINE' ? <WifiOff size={12} /> : <Download size={12} />} Offline
          </button>
        </div>

        {/* Search & Filter Bar */}
        <div className="space-y-3">
          <div className="relative">
             <input 
               type="text" 
               placeholder="Search videos..." 
               value={searchQuery}
               onChange={(e) => setSearchQuery(e.target.value)}
               className="w-full pl-10 pr-4 py-3 rounded-2xl border-none shadow-sm focus:ring-2 focus:ring-[#ABCEC9] bg-white dark:bg-slate-800 dark:text-white text-sm font-medium placeholder:text-gray-400"
             />
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          </div>

          <div className="flex gap-2 overflow-x-auto pb-2 hide-scrollbar">
             <button 
                onClick={() => setSelectedCategory(null)}
                className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors border ${!selectedCategory ? 'bg-gray-800 text-white border-gray-800' : 'bg-white dark:bg-slate-800 text-gray-500 dark:text-gray-300 border-gray-200 dark:border-slate-700'}`}
             >
                All
             </button>
             {categories.map(cat => (
               <button 
                  key={cat}
                  onClick={() => setSelectedCategory(selectedCategory === cat ? null : cat)}
                  className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors border ${selectedCategory === cat ? 'bg-[#ABCEC9] text-white border-[#ABCEC9]' : 'bg-white dark:bg-slate-800 text-gray-500 dark:text-gray-300 border-gray-200 dark:border-slate-700'}`}
               >
                  {cat}
               </button>
             ))}
          </div>
        </div>
      </div>

      {/* Video List */}
      <div className="space-y-4">
        {displayedVideos.length === 0 ? (
          <div className="text-center py-10 opacity-50">
             <Filter size={48} className="mx-auto mb-2 text-[#C3B8D5]" />
             <p className="font-bold text-gray-400">No videos found</p>
          </div>
        ) : (
          displayedVideos.map(video => (
            <div key={video.id} className="bg-white dark:bg-slate-800 rounded-3xl overflow-hidden shadow-lg border border-gray-100 dark:border-slate-700 group">
              {playingVideoId === video.id ? (
                <div className="relative pt-[56.25%] bg-black">
                   <iframe 
                      className="absolute top-0 left-0 w-full h-full"
                      src={`https://www.youtube.com/embed/${video.id}?autoplay=1`} 
                      title={video.title}
                      frameBorder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                   ></iframe>
                   <button 
                     onClick={stopPlayback}
                     className="absolute top-2 right-2 bg-black/50 text-white p-2 rounded-full hover:bg-black/70 z-10"
                   >
                     <ChevronLeft size={20} />
                   </button>
                </div>
              ) : (
                <div className="relative group cursor-pointer" onClick={() => handlePlay(video.id)}>
                   <img 
                     src={`https://img.youtube.com/vi/${video.id}/mqdefault.jpg`} 
                     alt={video.title}
                     className="w-full h-48 object-cover"
                   />
                   <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex flex-col justify-end p-4">
                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white/30 backdrop-blur-sm p-4 rounded-full group-hover:scale-110 transition-transform">
                          <Play fill="white" className="text-white ml-1" size={24} />
                      </div>
                      <span className="text-white text-xs font-bold bg-black/50 px-2 py-1 rounded w-fit mb-1">{video.duration}</span>
                   </div>
                </div>
              )}

              <div className="p-4">
                 <div className="flex justify-between items-start gap-2 mb-2">
                    <div>
                      <span className="text-[10px] font-bold text-[#ABCEC9] uppercase tracking-wider">{video.category}</span>
                      <h3 className="font-bold text-gray-800 dark:text-gray-100 leading-tight">{video.title}</h3>
                    </div>
                    <button 
                      onClick={() => toggleFavorite(video.id)}
                      className={`p-2 rounded-full transition-all active:scale-95 ${favorites.includes(video.id) ? 'bg-red-50 dark:bg-red-900/30 text-red-500' : 'bg-gray-50 dark:bg-slate-700 text-gray-300 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-600'}`}
                    >
                       <Heart size={20} fill={favorites.includes(video.id) ? "currentColor" : "none"} />
                    </button>
                 </div>

                 <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-50 dark:border-slate-700">
                    <a 
                      href={`https://www.youtube.com/watch?v=${video.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-bold text-gray-400 hover:text-red-500 flex items-center gap-1"
                    >
                       <Youtube size={14} /> Open in App
                    </a>
                    
                    <button 
                      onClick={() => handleDownload(video.id)}
                      disabled={downloading === video.id}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all ${
                        downloads.includes(video.id) 
                          ? 'bg-green-50 dark:bg-green-900/30 text-green-600' 
                          : 'bg-[#EDE8F8] dark:bg-slate-700 text-[#AABBCC] dark:text-gray-400 hover:bg-[#C3B8D5] hover:text-white dark:hover:bg-slate-600'
                      }`}
                    >
                       {downloading === video.id ? (
                         <><Loader2 size={12} className="animate-spin" /> Saving...</>
                       ) : downloads.includes(video.id) ? (
                         <><Check size={12} /> Saved</>
                       ) : (
                         <><Download size={12} /> Save Offline</>
                       )}
                    </button>
                 </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Floating Playback Overlay */}
      {playingVideo && (
        <div className="fixed bottom-20 left-4 right-4 bg-[#1F2937] text-white p-3 rounded-2xl shadow-2xl z-30 flex items-center justify-between animate-in slide-in-from-bottom border border-gray-700">
             <div className="flex items-center gap-3 overflow-hidden">
                <div className="w-10 h-10 rounded-lg bg-gray-800 shrink-0 overflow-hidden relative">
                   <img 
                      src={`https://img.youtube.com/vi/${playingVideo.id}/default.jpg`} 
                      alt="Thumbnail" 
                      className="w-full h-full object-cover opacity-80"
                   />
                   <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-1 h-3 bg-[#ABCEC9] mx-0.5 animate-[bounce_1s_infinite]"></div>
                      <div className="w-1 h-4 bg-[#ABCEC9] mx-0.5 animate-[bounce_1.2s_infinite]"></div>
                      <div className="w-1 h-2 bg-[#ABCEC9] mx-0.5 animate-[bounce_0.8s_infinite]"></div>
                   </div>
                </div>
                <div className="flex-1 min-w-0">
                   <p className="text-[10px] font-bold text-[#ABCEC9] uppercase tracking-wider">Now Playing</p>
                   <p className="text-sm font-bold truncate">{playingVideo.title}</p>
                </div>
             </div>
             
             <div className="flex items-center gap-2 ml-2">
                <button 
                  onClick={stopPlayback}
                  className="p-2.5 bg-white text-black rounded-full hover:scale-105 active:scale-95 transition-all shadow-md"
                  title="Pause / Stop"
                >
                  <Pause size={18} fill="currentColor" />
                </button>
                <button 
                  onClick={stopPlayback}
                  className="p-2 text-gray-400 hover:text-white transition-colors"
                  title="Dismiss"
                >
                   <X size={20} />
                </button>
             </div>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
         <div className="flex justify-center items-center gap-4 mt-8">
            <button 
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-2 rounded-full bg-white dark:bg-slate-800 shadow-md disabled:opacity-30 text-gray-600 dark:text-gray-300 hover:text-[#ABCEC9]"
            >
              <ChevronLeft size={20} />
            </button>
            <span className="text-sm font-bold text-gray-500 dark:text-gray-400">
               Page {currentPage} of {totalPages}
            </span>
            <button 
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-2 rounded-full bg-white dark:bg-slate-800 shadow-md disabled:opacity-30 text-gray-600 dark:text-gray-300 hover:text-[#ABCEC9]"
            >
              <ChevronRight size={20} />
            </button>
         </div>
      )}
    </div>
  );
};