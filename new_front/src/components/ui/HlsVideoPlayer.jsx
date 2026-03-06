import React, { useEffect, useRef, useState, useCallback } from 'react';
import Hls from 'hls.js';
import {
  Play, Pause, Volume2, VolumeX, Maximize, Minimize,
  Settings, Loader2, SkipForward, SkipBack, AlertCircle,
} from 'lucide-react';

/* ───────── helpers ───────── */
const fmtTime = (s) => {
  if (!s || !isFinite(s)) return '0:00';
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  const mm = h > 0 ? String(m).padStart(2, '0') : m;
  const ss = String(sec).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${m}:${ss}`;
};

const HIDE_DELAY = 3000;
const DOUBLE_TAP_MS = 300;
const SEEK_SECONDS = 10;

export default function HlsVideoPlayer({ src, poster, onPlay, className = '' }) {
  /* refs */
  const containerRef = useRef(null);
  const videoRef = useRef(null);
  const hlsRef = useRef(null);
  const hideTimer = useRef(null);
  const lastTapRef = useRef({ time: 0, x: 0 });
  const seekIndicatorTimer = useRef(null);
  const progressRef = useRef(null);

  /* state */
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [qualities, setQualities] = useState([]);
  const [activeQuality, setActiveQuality] = useState(-1); // -1 = auto
  const [showQualityMenu, setShowQualityMenu] = useState(false);
  const [seekIndicator, setSeekIndicator] = useState(null); // 'forward' | 'backward' | null
  const [isSeeking, setIsSeeking] = useState(false);

  /* ───── auto-hide controls ───── */
  const resetHideTimer = useCallback(() => {
    setShowControls(true);
    clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => {
      if (videoRef.current && !videoRef.current.paused) {
        setShowControls(false);
        setShowQualityMenu(false);
      }
    }, HIDE_DELAY);
  }, []);

  /* ───── HLS setup ───── */
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src) return;

    setError('');
    setLoading(true);
    setQualities([]);
    setActiveQuality(-1);

    let hls;

    if (Hls.isSupported()) {
      hls = new Hls({
        startLevel: -1,
        capLevelToPlayerSize: true,
        maxBufferLength: 30,
        maxMaxBufferLength: 60,
      });

      hls.loadSource(src);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, (_e, data) => {
        const levels = data.levels.map((l, i) => ({
          index: i,
          height: l.height,
          bitrate: l.bitrate,
          label: l.height ? `${l.height}p` : `${Math.round(l.bitrate / 1000)}k`,
        }));
        setQualities(levels);
        setLoading(false);
      });

      hls.on(Hls.Events.LEVEL_SWITCHED, (_e, data) => {
        setActiveQuality(data.level);
      });

      hls.on(Hls.Events.ERROR, (_e, data) => {
        if (data.fatal) {
          if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
            hls.startLoad();
          } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
            hls.recoverMediaError();
          } else {
            setError('Video yüklenirken hata oluştu.');
          }
        }
      });

      hlsRef.current = hls;
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // iOS Safari native HLS
      video.src = src;
      setLoading(false);
    } else {
      setError('Tarayıcınız HLS video formatını desteklemiyor.');
    }

    return () => {
      if (hls) hls.destroy();
      hlsRef.current = null;
    };
  }, [src]);

  /* ───── video event listeners ───── */
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;

    const onTimeUpdate = () => {
      if (!isSeeking) setCurrentTime(v.currentTime);
    };
    const onDurationChange = () => setDuration(v.duration);
    const onProgress = () => {
      if (v.buffered.length > 0) {
        setBuffered(v.buffered.end(v.buffered.length - 1));
      }
    };
    const onPlayEvent = () => { setPlaying(true); setLoading(false); onPlay?.(); };
    const onPauseEvent = () => setPlaying(false);
    const onWaiting = () => setLoading(true);
    const onCanPlay = () => setLoading(false);
    const onEnded = () => { setPlaying(false); setShowControls(true); };
    const onError = () => setError('Video oynatılırken hata oluştu.');

    v.addEventListener('timeupdate', onTimeUpdate);
    v.addEventListener('durationchange', onDurationChange);
    v.addEventListener('progress', onProgress);
    v.addEventListener('play', onPlayEvent);
    v.addEventListener('pause', onPauseEvent);
    v.addEventListener('waiting', onWaiting);
    v.addEventListener('canplay', onCanPlay);
    v.addEventListener('ended', onEnded);
    v.addEventListener('error', onError);

    return () => {
      v.removeEventListener('timeupdate', onTimeUpdate);
      v.removeEventListener('durationchange', onDurationChange);
      v.removeEventListener('progress', onProgress);
      v.removeEventListener('play', onPlayEvent);
      v.removeEventListener('pause', onPauseEvent);
      v.removeEventListener('waiting', onWaiting);
      v.removeEventListener('canplay', onCanPlay);
      v.removeEventListener('ended', onEnded);
      v.removeEventListener('error', onError);
    };
  }, [isSeeking, onPlay]);

  /* ───── fullscreen listener ───── */
  useEffect(() => {
    const onFsChange = () => {
      const el = document.fullscreenElement || document.webkitFullscreenElement;
      setIsFullscreen(!!el);
    };
    document.addEventListener('fullscreenchange', onFsChange);
    document.addEventListener('webkitfullscreenchange', onFsChange);
    return () => {
      document.removeEventListener('fullscreenchange', onFsChange);
      document.removeEventListener('webkitfullscreenchange', onFsChange);
    };
  }, []);

  /* ───── keyboard shortcuts ───── */
  useEffect(() => {
    const onKey = (e) => {
      const v = videoRef.current;
      if (!v) return;
      // Don't capture if typing in input
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      switch (e.key) {
        case ' ':
        case 'k':
          e.preventDefault();
          togglePlay();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          seekBy(-SEEK_SECONDS);
          break;
        case 'ArrowRight':
          e.preventDefault();
          seekBy(SEEK_SECONDS);
          break;
        case 'ArrowUp':
          e.preventDefault();
          setVolume((prev) => { const nv = Math.min(1, prev + 0.1); v.volume = nv; return nv; });
          break;
        case 'ArrowDown':
          e.preventDefault();
          setVolume((prev) => { const nv = Math.max(0, prev - 0.1); v.volume = nv; return nv; });
          break;
        case 'm':
          toggleMute();
          break;
        case 'f':
          toggleFullscreen();
          break;
        default:
          break;
      }
      resetHideTimer();
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [resetHideTimer]);

  /* ───── actions ───── */
  const togglePlay = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      v.play().catch(() => {});
    } else {
      v.pause();
    }
    resetHideTimer();
  }, [resetHideTimer]);

  const seekBy = useCallback((seconds) => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = Math.max(0, Math.min(v.duration || 0, v.currentTime + seconds));
    setCurrentTime(v.currentTime);

    // Show seek indicator
    setSeekIndicator(seconds > 0 ? 'forward' : 'backward');
    clearTimeout(seekIndicatorTimer.current);
    seekIndicatorTimer.current = setTimeout(() => setSeekIndicator(null), 600);
    resetHideTimer();
  }, [resetHideTimer]);

  const seekTo = useCallback((fraction) => {
    const v = videoRef.current;
    if (!v || !v.duration) return;
    v.currentTime = fraction * v.duration;
    setCurrentTime(v.currentTime);
  }, []);

  const toggleMute = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setMuted(v.muted);
  }, []);

  const toggleFullscreen = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;

    if (document.fullscreenElement || document.webkitFullscreenElement) {
      (document.exitFullscreen || document.webkitExitFullscreen)?.call(document);
    } else {
      // Try container fullscreen first (covers custom controls)
      if (el.requestFullscreen) {
        el.requestFullscreen();
      } else if (el.webkitRequestFullscreen) {
        el.webkitRequestFullscreen();
      } else {
        // iOS Safari: use video element native fullscreen as fallback
        const v = videoRef.current;
        if (v?.webkitEnterFullscreen) {
          v.webkitEnterFullscreen();
        }
      }
    }
  }, []);

  const changeQuality = useCallback((levelIndex) => {
    const hls = hlsRef.current;
    if (!hls) return;
    hls.currentLevel = levelIndex; // -1 = auto
    setActiveQuality(levelIndex);
    setShowQualityMenu(false);
    resetHideTimer();
  }, [resetHideTimer]);

  /* ───── progress bar interaction ───── */
  const handleProgressInteraction = useCallback((e, isTouch = false) => {
    const bar = progressRef.current;
    if (!bar) return;
    const rect = bar.getBoundingClientRect();
    const clientX = isTouch ? e.touches[0].clientX : e.clientX;
    const fraction = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    seekTo(fraction);
  }, [seekTo]);

  const onProgressMouseDown = useCallback((e) => {
    e.preventDefault();
    setIsSeeking(true);
    handleProgressInteraction(e);

    const onMove = (ev) => handleProgressInteraction(ev);
    const onUp = () => {
      setIsSeeking(false);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [handleProgressInteraction]);

  const onProgressTouchStart = useCallback((e) => {
    setIsSeeking(true);
    handleProgressInteraction(e, true);

    const onMove = (ev) => { ev.preventDefault(); handleProgressInteraction(ev, true); };
    const onEnd = () => {
      setIsSeeking(false);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onEnd);
    };
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('touchend', onEnd);
  }, [handleProgressInteraction]);

  /* ───── touch gestures (double tap to seek) ───── */
  const handleContainerTap = useCallback((e) => {
    // Don't handle taps on controls
    if (e.target.closest('.vp-controls-bar') || e.target.closest('.vp-quality-menu')) return;

    const now = Date.now();
    const last = lastTapRef.current;
    const timeDiff = now - last.time;

    if (timeDiff < DOUBLE_TAP_MS && timeDiff > 50) {
      // Double tap
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const x = (e.touches ? e.changedTouches[0].clientX : e.clientX) - rect.left;
      const isRight = x > rect.width / 2;
      seekBy(isRight ? SEEK_SECONDS : -SEEK_SECONDS);
      lastTapRef.current = { time: 0, x: 0 };
    } else {
      // Single tap - toggle controls or play/pause after delay
      lastTapRef.current = { time: now, x: 0 };
      setTimeout(() => {
        if (Date.now() - now >= DOUBLE_TAP_MS) {
          // It was indeed a single tap — toggle controls visibility
          setShowControls((prev) => {
            if (!prev) {
              resetHideTimer();
              return true;
            }
            return false;
          });
        }
      }, DOUBLE_TAP_MS + 10);
    }
  }, [seekBy, resetHideTimer]);

  /* ───── progress fraction ───── */
  const progressFraction = duration > 0 ? currentTime / duration : 0;
  const bufferedFraction = duration > 0 ? buffered / duration : 0;

  // Active quality label
  const activeLabel = activeQuality === -1
    ? 'Otomatik'
    : qualities.find((q) => q.index === activeQuality)?.label || 'Otomatik';

  return (
    <div
      ref={containerRef}
      className={`vp-container ${isFullscreen ? 'vp-fullscreen' : ''} ${className}`}
      onMouseMove={resetHideTimer}
      onMouseLeave={() => playing && setShowControls(false)}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* ── Video element ── */}
      <video
        ref={videoRef}
        poster={poster}
        playsInline
        preload="metadata"
        className="vp-video"
        onClick={togglePlay}
        onTouchEnd={handleContainerTap}
      />

      {/* ── Big center play button (when paused & controls visible) ── */}
      {!playing && !loading && !error && showControls && (
        <button className="vp-center-play" onClick={togglePlay} aria-label="Oynat">
          <Play size={48} fill="white" />
        </button>
      )}

      {/* ── Loading spinner ── */}
      {loading && !error && (
        <div className="vp-overlay-center">
          <Loader2 size={48} className="vp-spinner" />
        </div>
      )}

      {/* ── Error ── */}
      {error && (
        <div className="vp-overlay-center vp-error">
          <AlertCircle size={36} />
          <p>{error}</p>
        </div>
      )}

      {/* ── Seek indicator (double tap) ── */}
      {seekIndicator && (
        <div className={`vp-seek-indicator ${seekIndicator === 'forward' ? 'vp-seek-right' : 'vp-seek-left'}`}>
          {seekIndicator === 'forward'
            ? <><SkipForward size={28} /><span>+{SEEK_SECONDS}s</span></>
            : <><SkipBack size={28} /><span>-{SEEK_SECONDS}s</span></>
          }
        </div>
      )}

      {/* ── Controls overlay ── */}
      <div className={`vp-controls ${showControls ? 'vp-controls-visible' : 'vp-controls-hidden'}`}>
        {/* Gradient backdrop */}
        <div className="vp-controls-gradient" />

        <div className="vp-controls-bar">
          {/* ── Progress bar ── */}
          <div
            ref={progressRef}
            className="vp-progress-container"
            onMouseDown={onProgressMouseDown}
            onTouchStart={onProgressTouchStart}
          >
            <div className="vp-progress-track">
              <div className="vp-progress-buffered" style={{ width: `${bufferedFraction * 100}%` }} />
              <div className="vp-progress-filled" style={{ width: `${progressFraction * 100}%` }}>
                <div className="vp-progress-thumb" />
              </div>
            </div>
          </div>

          {/* ── Bottom row ── */}
          <div className="vp-bottom-row">
            {/* Left side */}
            <div className="vp-bottom-left">
              <button className="vp-btn" onClick={togglePlay} aria-label={playing ? 'Duraklat' : 'Oynat'}>
                {playing ? <Pause size={20} /> : <Play size={20} fill="white" />}
              </button>

              {/* Skip buttons (visible on wider screens) */}
              <button className="vp-btn vp-hide-mobile" onClick={() => seekBy(-SEEK_SECONDS)} aria-label="10 saniye geri">
                <SkipBack size={18} />
              </button>
              <button className="vp-btn vp-hide-mobile" onClick={() => seekBy(SEEK_SECONDS)} aria-label="10 saniye ileri">
                <SkipForward size={18} />
              </button>

              {/* Volume */}
              <div className="vp-volume-group">
                <button className="vp-btn" onClick={toggleMute} aria-label={muted ? 'Sesi aç' : 'Sesi kapat'}>
                  {muted || volume === 0 ? <VolumeX size={20} /> : <Volume2 size={20} />}
                </button>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={muted ? 0 : volume}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    setVolume(val);
                    if (videoRef.current) {
                      videoRef.current.volume = val;
                      videoRef.current.muted = val === 0;
                      setMuted(val === 0);
                    }
                  }}
                  className="vp-volume-slider"
                  aria-label="Ses seviyesi"
                />
              </div>

              {/* Time */}
              <span className="vp-time">
                {fmtTime(currentTime)} / {fmtTime(duration)}
              </span>
            </div>

            {/* Right side */}
            <div className="vp-bottom-right">
              {/* Quality selector */}
              {qualities.length > 1 && (
                <div className="vp-quality-wrapper">
                  <button
                    className="vp-btn vp-quality-btn"
                    onClick={() => { setShowQualityMenu((p) => !p); resetHideTimer(); }}
                    aria-label="Kalite seçimi"
                  >
                    <Settings size={18} />
                    <span className="vp-quality-label">{activeLabel}</span>
                  </button>

                  {showQualityMenu && (
                    <div className="vp-quality-menu">
                      <button
                        className={`vp-quality-option ${activeQuality === -1 ? 'active' : ''}`}
                        onClick={() => changeQuality(-1)}
                      >
                        Otomatik
                      </button>
                      {[...qualities].sort((a, b) => b.height - a.height).map((q) => (
                        <button
                          key={q.index}
                          className={`vp-quality-option ${activeQuality === q.index ? 'active' : ''}`}
                          onClick={() => changeQuality(q.index)}
                        >
                          {q.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Fullscreen */}
              <button className="vp-btn" onClick={toggleFullscreen} aria-label={isFullscreen ? 'Tam ekrandan çık' : 'Tam ekran'}>
                {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
