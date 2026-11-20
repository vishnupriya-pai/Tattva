'use client';

import React, { useMemo, useState } from 'react';
import {
  Clock,
  Play,
  Sparkles,
} from 'lucide-react';
import type { EngineeringVideo } from '../../types/thinkforge';
import { ENGINEERING_VIDEOS } from '../../data/engineeringVideos';

const YoutubeIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
  </svg>
);

interface EngineeringVideosViewProps {
  onSelectVideo: (video: EngineeringVideo) => void;
  onConvertVideoToInquiry: (video: EngineeringVideo) => void;
  onOpenSourceInStudio?: (sourceId: string) => void;
  initialCategory?: string;
}

export const EngineeringVideosView: React.FC<EngineeringVideosViewProps> = ({
  onSelectVideo,
  onConvertVideoToInquiry: _onConvertVideoToInquiry,
  onOpenSourceInStudio,
  initialCategory = 'All',
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>(initialCategory);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [durationFilter, setDurationFilter] = useState<'all' | 'under-35' | 'over-35'>('all');

  const categories = [
    { id: 'All', label: 'All Lectures' },
    { id: 'AIML', label: 'AI & Machine Learning (AIML)' },
    { id: 'Cybersecurity', label: 'Cybersecurity & Defense' },
    { id: 'AIDS', label: 'AI & Data Science (AIDS)' },
    { id: 'Computer Science', label: 'Computer Science Core' },
  ];

  const filteredVideos = useMemo(() => {
    return ENGINEERING_VIDEOS.filter((vid) => {
      // Category filter
      if (selectedCategory !== 'All' && vid.category !== selectedCategory) {
        return false;
      }

      // Duration filter (All are 25m - 60m)
      if (durationFilter === 'under-35' && vid.durationMinutes > 35) {
        return false;
      }
      if (durationFilter === 'over-35' && vid.durationMinutes <= 35) {
        return false;
      }

      // Search query
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      return (
        vid.title.toLowerCase().includes(q) ||
        vid.subtopic.toLowerCase().includes(q) ||
        vid.description.toLowerCase().includes(q) ||
        vid.keyConcepts.some((c) => c.toLowerCase().includes(q))
      );
    });
  }, [selectedCategory, durationFilter, searchQuery]);

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8 text-fg">
      {/* Header Banner */}
      <div className="rounded-2xl border border-line bg-surface-2 p-6 sm:p-8 shadow-2xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded font-mono text-[10px] font-bold text-gold bg-gold/10 border border-gold/30 uppercase tracking-wider">
              <YoutubeIcon className="w-3.5 h-3.5 text-trap" />
              <span>TATTVA Masterclass Archive · 25m to 1hr Lectures</span>
            </div>
            <h1 className="font-serif-tattva text-2xl sm:text-4xl font-normal text-fg tracking-tight">
              Watch. Master. <span className="text-gold">Inquire.</span>
            </h1>
            <p className="text-xs sm:text-sm text-fg-muted max-w-2xl leading-relaxed font-sans">
              Explore authentic, deep-dive university &amp; industry engineering lectures across AIML,
              Cybersecurity, AIDS, and Computer Science. Launch directly into a dedicated TATTVA Work Studio.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 font-mono">
            <span className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-surface-1 text-gold border border-line">
              {filteredVideos.length} Masterclasses
            </span>
          </div>
        </div>
      </div>

      {/* Filter Pill Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          {categories.map((cat) => {
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`rounded-full px-3.5 py-1 text-xs font-semibold transition cursor-pointer ${
                  isSelected
                    ? 'bg-gold text-gold-ink font-bold shadow-xs'
                    : 'border border-line bg-surface-2 text-fg-muted hover:text-fg hover:border-line-strong'
                }`}
              >
                {cat.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Video Grid */}
      {filteredVideos.length === 0 ? (
        <div className="text-center py-12 bg-surface-2 border border-line rounded-2xl space-y-3 font-mono">
          <p className="text-fg-muted text-sm">No lectures found matching your criteria.</p>
          <button
            type="button"
            onClick={() => {
              setSelectedCategory('All');
              setSearchQuery('');
              setDurationFilter('all');
            }}
            className="px-4 py-2 rounded-xl bg-gold text-gold-ink text-xs font-bold cursor-pointer"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredVideos.map((video) => (
            <div
              key={video.id}
              className="group flex flex-col justify-between overflow-hidden rounded-2xl border border-line bg-surface-2 shadow-xl hover:border-gold/60 transition duration-200"
            >
              <div>
                {/* 16:9 Thumbnail Frame with Video Click */}
                <div
                  className="relative aspect-video w-full overflow-hidden bg-bg cursor-pointer"
                  onClick={() => onSelectVideo(video)}
                  title={`Watch ${video.title}`}
                >
                  <img
                    src={video.thumbnail}
                    alt={video.title}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-102 opacity-90"
                    loading="lazy"
                  />

                  {/* Play overlay hover indicator */}
                  <div className="absolute inset-0 bg-bg/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <div className="w-12 h-12 rounded-full bg-gold text-gold-ink flex items-center justify-center shadow-lg transform scale-95 group-hover:scale-105 transition-transform">
                      <Play className="w-5 h-5 fill-current ml-0.5" />
                    </div>
                  </div>

                  {/* Duration Badge */}
                  <span className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-bg/85 text-fg backdrop-blur-xs flex items-center gap-1 border border-line">
                    <Clock className="w-3 h-3 text-gold" />
                    {video.duration}
                  </span>

                  {/* Category Pill in Top Right */}
                  <span className="absolute top-2 right-2 px-2 py-0.5 rounded font-mono text-[9px] font-bold bg-bg/80 text-gold border border-gold/30">
                    {video.category}
                  </span>
                </div>

                {/* Video Info */}
                <div className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2 font-mono text-[10px] text-fg-muted">
                    <span className="text-gold">{video.channelName}</span>
                    <span>{video.views}</span>
                  </div>

                  <h3
                    onClick={() => onSelectVideo(video)}
                    className="font-serif-tattva text-base font-normal text-fg line-clamp-2 cursor-pointer group-hover:text-gold transition leading-snug"
                  >
                    {video.title}
                  </h3>

                  <p className="text-xs text-fg-muted line-clamp-2 leading-relaxed font-sans">
                    {video.description}
                  </p>

                  {/* Key Concepts Tags */}
                  <div className="flex flex-wrap gap-1 pt-1 font-mono">
                    {video.keyConcepts.slice(0, 3).map((tag, idx) => (
                      <span
                        key={idx}
                        className="text-[9px] px-2 py-0.5 rounded bg-surface-2/5 text-fg-muted border border-line"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Card Footer Actions */}
              <div className="px-4 py-3 border-t border-line bg-surface-1 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => onSelectVideo(video)}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-fg-body hover:text-fg cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5 fill-current text-gold" />
                  <span>Watch Lecture</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const matchedSourceId =
                      video.id === 'vid-aiml-03'
                        ? 'source-transformers'
                        : video.id === 'vid-cs-01'
                        ? 'source-celebrity-problem'
                        : video.id === 'vid-cyber-02'
                        ? 'source-rsa-crypto'
                        : video.id === 'vid-aids-02'
                        ? 'source-pca'
                        : video.id === 'vid-cs-04'
                        ? 'source-os-sync'
                        : video.id === 'vid-cs-02'
                        ? 'source-sliding-window'
                        : 'source-transformers';

                    if (onOpenSourceInStudio) {
                      onOpenSourceInStudio(matchedSourceId);
                    }
                  }}
                  className="inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-bold bg-gold text-gold-ink hover:bg-gold-hover shadow-sm cursor-pointer transition"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Work Studio</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
