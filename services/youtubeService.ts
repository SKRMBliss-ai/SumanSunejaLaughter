import axios from 'axios';

const API_KEY = process.env.VITE_YOUTUBE_API_KEY;
const CHANNEL_ID = process.env.VITE_YOUTUBE_CHANNEL_ID || 'UC1SZ2c4NJszdwybZ7gahO5Q'; // Suman Suneja Official

// Fallback data
const FALLBACK_VIDEOS = [
    { id: 'rWUjyNw7X9w', title: 'LAUGH & DANCE IN UZBEKISTAN', category: 'Events', duration: '05:00' },
    { id: '16OrPGE8Iv4', title: 'Corporate Laughter Yoga Session', category: 'Corporate', duration: '04:12' },
    { id: 'CDYLAntNXXs', title: 'Laughter Therapy for Wellness', category: 'Health', duration: '06:45' },
];

export interface VideoItem {
    id: string;
    title: string;
    category: string;
    duration: string;
    thumbnail: string;
    publishedAt: string;
}

export const fetchLatestVideos = async (): Promise<VideoItem[]> => {
    if (!API_KEY) {
        console.warn("YouTube API Key missing. Using fallback data.");
        return FALLBACK_VIDEOS.map(v => ({ ...v, thumbnail: `https://img.youtube.com/vi/${v.id}/mqdefault.jpg`, publishedAt: new Date().toISOString() }));
    }

    try {
        const response = await axios.get('https://www.googleapis.com/youtube/v3/search', {
            params: {
                part: 'snippet',
                channelId: CHANNEL_ID,
                maxResults: 5,
                order: 'date',
                type: 'video',
                key: API_KEY
            }
        });

        return response.data.items.map((item: any) => ({
            id: item.id.videoId,
            title: item.snippet.title,
            category: 'Latest', // API doesn't return category names easily without extra calls
            duration: 'New', // Duration requires 'contentDetails' from 'videos' endpoint
            thumbnail: item.snippet.thumbnails.medium.url,
            publishedAt: item.snippet.publishedAt
        }));

    } catch (error) {
        console.error("Error fetching YouTube videos:", error);
        return FALLBACK_VIDEOS.map(v => ({ ...v, thumbnail: `https://img.youtube.com/vi/${v.id}/mqdefault.jpg`, publishedAt: new Date().toISOString() }));
    }
};
