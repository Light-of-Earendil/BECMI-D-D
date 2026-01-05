/**
 * BECMI D&D Character Manager - Audio Manager Module
 * 
 * Manages synchronized audio playback for sessions.
 * Handles background music and sound effects with real-time synchronization.
 */

class AudioManager {
    constructor(app) {
        this.app = app;
        this.apiClient = app.modules.apiClient;
        this.sessionId = null;
        this.realtimeClient = null;
        
        // Audio instances
        this.musicAudio = null; // Single instance for background music
        this.soundAudios = new Map(); // Multiple instances for sound effects (track_id -> Audio)
        
        // State
        this.currentTrack = null;
        this.currentPlaylist = null;
        this.currentPlaylistTracks = []; // Array of tracks in current playlist
        this.currentPlaylistIndex = 0; // Current track index in playlist
        this.isPlaying = false;
        this.isPaused = false;
        this.isLooping = false;
        this.isPlaylistLooping = false; // Loop entire playlist
        this.isPlaylistShuffled = false; // Shuffle playlist tracks
        
        // Volume levels (0-1)
        this.masterVolume = 0.6; // Default 60%
        this.musicVolume = 0.33; // Default 33%
        this.soundVolume = 1.0;
        
        // Event handlers
        this.eventHandlers = {};
        
        console.log('Audio Manager initialized');
    }
    
    /**
     * Initialize audio manager for a session
     * @param {number} sessionId - Session ID
     * @param {RealtimeClient} realtimeClient - Real-time client instance
     */
    init(sessionId, realtimeClient) {
        this.sessionId = sessionId;
        this.realtimeClient = realtimeClient;
        
        // Register real-time event handlers
        this.setupRealtimeHandlers();
        
        console.log(`Audio Manager initialized for session ${sessionId}`);
    }
    
    /**
     * Setup real-time event handlers
     */
    setupRealtimeHandlers() {
        if (!this.realtimeClient) {
            console.warn('Audio Manager: No realtime client available');
            return;
        }
        
        // Audio control events
        this.realtimeClient.on('audio_play', (data) => {
            this.handlePlayEvent(data);
        });
        
        this.realtimeClient.on('audio_pause', (data) => {
            this.handlePauseEvent(data);
        });
        
        this.realtimeClient.on('audio_stop', (data) => {
            this.handleStopEvent(data);
        });
        
        this.realtimeClient.on('audio_volume', (data) => {
            this.handleVolumeEvent(data);
        });
        
        this.realtimeClient.on('audio_loop', (data) => {
            this.handleLoopEvent(data);
        });
        
        // Soundboard events
        this.realtimeClient.on('soundboard_play', (data) => {
            this.handleSoundboardPlayEvent(data);
        });
    }
    
    /**
     * Handle play event
     */
    handlePlayEvent(data) {
        console.log('Audio Manager: Play event received', data);
        
        if (data.track_id && data.playlist_id && data.playlist_tracks) {
            // Playing from playlist
            this.playPlaylist(
                data.playlist_id,
                data.playlist_tracks,
                0, // Start from first track
                data.is_playlist_looping || false,
                data.is_playlist_shuffled || false
            );
        } else if (data.track_id) {
            // Playing single track
            this.playTrack(data.track_id, data.file_path, data.current_time, data.duration_seconds);
        } else if (data.playlist_id && data.playlist_tracks) {
            // Playing playlist (without track_id, start from first)
            this.playPlaylist(
                data.playlist_id,
                data.playlist_tracks,
                0,
                data.is_playlist_looping || false,
                data.is_playlist_shuffled || false
            );
        }
    }
    
    /**
     * Handle pause event
     */
    handlePauseEvent(data) {
        console.log('Audio Manager: Pause event received');
        this.pause();
    }
    
    /**
     * Handle stop event
     */
    handleStopEvent(data) {
        console.log('Audio Manager: Stop event received');
        this.stop();
    }
    
    /**
     * Handle volume change event
     */
    handleVolumeEvent(data) {
        console.log('Audio Manager: Volume event received', data);
        
        if (data.volume !== undefined) {
            this.setMasterVolume(data.volume);
        }
        if (data.music_volume !== undefined) {
            this.setMusicVolume(data.music_volume);
        }
        if (data.sound_volume !== undefined) {
            this.setSoundVolume(data.sound_volume);
        }
    }
    
    /**
     * Handle loop change event
     */
    handleLoopEvent(data) {
        console.log('Audio Manager: Loop event received', data);
        this.setLoop(data.loop);
    }
    
    /**
     * Handle soundboard play event
     */
    handleSoundboardPlayEvent(data) {
        console.log('Audio Manager: Soundboard play event received', data);
        this.playSoundEffect(data.track_id, data.file_path, data.volume, data.duration_seconds);
    }
    
    /**
     * Play a track
     */
    playTrack(trackId, filePath, currentTime = 0, durationSeconds = null) {
        // Stop current music if playing
        this.stop();
        
        // Ensure file path is absolute (starts with /)
        let finalPath = filePath;
        if (!filePath.startsWith('/') && !filePath.startsWith('http://') && !filePath.startsWith('https://')) {
            finalPath = '/' + filePath;
        }
        
        console.log('Audio Manager: Playing track', { trackId, filePath, finalPath });
        
        // Create new audio instance
        this.musicAudio = new Audio(finalPath);
        this.musicAudio.volume = this.masterVolume * this.musicVolume;
        this.musicAudio.loop = this.isLooping;
        
        // Set current time if provided (for synchronization)
        if (currentTime > 0) {
            this.musicAudio.currentTime = currentTime;
        }
        
        // Update state
        this.currentTrack = {
            track_id: trackId,
            file_path: finalPath,
            duration_seconds: durationSeconds
        };
        this.isPlaying = true;
        this.isPaused = false;
        
        // Setup event handlers
        this.musicAudio.addEventListener('ended', () => {
            if (this.isLooping) {
                // Single track looping - handled by audio.loop
                return;
            }
            
            // Check if we're playing a playlist
            if (this.currentPlaylist && this.currentPlaylistTracks.length > 0) {
                this.handlePlaylistTrackEnded();
            } else {
                this.isPlaying = false;
                this.currentTrack = null;
                this.trigger('track_ended', { track_id: trackId });
            }
        });
        
        this.musicAudio.addEventListener('error', (e) => {
            console.error('Audio Manager: Error playing track', e);
            console.error('Audio Manager: Failed file path:', finalPath);
            console.error('Audio Manager: Audio element error details:', {
                error: this.musicAudio.error,
                networkState: this.musicAudio.networkState,
                readyState: this.musicAudio.readyState,
                src: this.musicAudio.src
            });
            this.trigger('error', { error: 'Failed to play audio', track_id: trackId, file_path: finalPath });
        });
        
        // Play
        this.musicAudio.play().catch(error => {
            console.error('Audio Manager: Play failed', error);
            console.error('Audio Manager: Failed file path:', finalPath);
            // Browser autoplay policy - user interaction required
            this.trigger('autoplay_blocked', { track_id: trackId });
        });
        
        this.trigger('track_started', { track_id: trackId, file_path: finalPath });
    }
    
    /**
     * Play a sound effect (can play multiple simultaneously)
     */
    playSoundEffect(trackId, filePath, volume = 1.0, durationSeconds = null) {
        // Create new audio instance for this sound effect
        const soundAudio = new Audio(filePath);
        const finalVolume = this.masterVolume * this.soundVolume * volume;
        soundAudio.volume = finalVolume;
        
        // Store in map
        this.soundAudios.set(trackId, soundAudio);
        
        // Setup event handlers
        soundAudio.addEventListener('ended', () => {
            // Remove from map when finished
            this.soundAudios.delete(trackId);
            this.trigger('sound_ended', { track_id: trackId });
        });
        
        soundAudio.addEventListener('error', (e) => {
            console.error('Audio Manager: Error playing sound effect', e);
            this.soundAudios.delete(trackId);
            this.trigger('error', { error: 'Failed to play sound effect', track_id: trackId });
        });
        
        // Play
        soundAudio.play().catch(error => {
            console.error('Audio Manager: Sound effect play failed', error);
            this.soundAudios.delete(trackId);
        });
        
        this.trigger('sound_started', { track_id: trackId, file_path: filePath });
    }
    
    /**
     * Pause current music
     */
    pause() {
        if (this.musicAudio && this.isPlaying) {
            this.musicAudio.pause();
            this.isPaused = true;
            this.isPlaying = false;
            this.trigger('paused', {});
        }
    }
    
    /**
     * Resume paused music
     */
    resume() {
        if (this.musicAudio && this.isPaused) {
            this.musicAudio.play().catch(error => {
                console.error('Audio Manager: Resume failed', error);
            });
            this.isPaused = false;
            this.isPlaying = true;
            this.trigger('resumed', {});
        }
    }
    
    /**
     * Stop current music
     */
    stop() {
        if (this.musicAudio) {
            this.musicAudio.pause();
            this.musicAudio.currentTime = 0;
            this.musicAudio = null;
        }
        
        // Stop all sound effects
        this.soundAudios.forEach((audio, trackId) => {
            audio.pause();
            audio.currentTime = 0;
        });
        this.soundAudios.clear();
        
        this.isPlaying = false;
        this.isPaused = false;
        this.currentTrack = null;
        this.currentPlaylist = null;
        this.currentPlaylistTracks = [];
        this.currentPlaylistIndex = 0;
        
        this.trigger('stopped', {});
    }
    
    /**
     * Handle playlist track ended - move to next track
     */
    handlePlaylistTrackEnded() {
        if (!this.currentPlaylist || this.currentPlaylistTracks.length === 0) {
            return;
        }
        
        // Move to next track
        this.currentPlaylistIndex++;
        
        // Check if we've reached the end
        if (this.currentPlaylistIndex >= this.currentPlaylistTracks.length) {
            if (this.isPlaylistLooping) {
                // Loop playlist - start from beginning
                this.currentPlaylistIndex = 0;
            } else {
                // Playlist ended
                this.isPlaying = false;
                this.currentTrack = null;
                const endedPlaylistId = this.currentPlaylist.playlist_id;
                this.currentPlaylist = null;
                this.currentPlaylistTracks = [];
                this.currentPlaylistIndex = 0;
                this.trigger('playlist_ended', { playlist_id: endedPlaylistId });
                return;
            }
        }
        
        // Play next track
        const nextTrack = this.currentPlaylistTracks[this.currentPlaylistIndex];
        if (nextTrack && nextTrack.track) {
            // Don't loop individual tracks when playing playlist
            const wasLooping = this.isLooping;
            this.isLooping = false;
            this.playTrack(
                nextTrack.track.track_id,
                nextTrack.track.file_path,
                0,
                nextTrack.track.duration_seconds
            );
            this.isLooping = wasLooping; // Restore loop setting
            this.trigger('playlist_track_changed', {
                playlist_id: this.currentPlaylist.playlist_id,
                track_index: this.currentPlaylistIndex,
                track: nextTrack.track
            });
        }
    }
    
    /**
     * Shuffle array using Fisher-Yates algorithm
     */
    shuffleArray(array) {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }
    
    /**
     * Play a playlist
     */
    playPlaylist(playlistId, tracks = [], startIndex = 0, isLooping = false, isShuffled = false) {
        if (!tracks || tracks.length === 0) {
            console.warn('Audio Manager: Cannot play playlist - no tracks provided');
            return;
        }
        
        this.currentPlaylist = { playlist_id: playlistId };
        this.isPlaylistLooping = isLooping;
        this.isPlaylistShuffled = isShuffled;
        
        // Shuffle tracks if requested
        if (isShuffled) {
            this.currentPlaylistTracks = this.shuffleArray(tracks);
            this.currentPlaylistIndex = 0; // Always start from beginning when shuffled
        } else {
            this.currentPlaylistTracks = tracks;
            this.currentPlaylistIndex = startIndex;
        }
        
        // Play first track (or track at startIndex)
        const trackToPlay = this.currentPlaylistTracks[this.currentPlaylistIndex];
        if (trackToPlay && trackToPlay.track) {
            // Don't loop individual tracks when playing playlist
            const wasLooping = this.isLooping;
            this.isLooping = false;
            this.playTrack(
                trackToPlay.track.track_id,
                trackToPlay.track.file_path,
                0,
                trackToPlay.track.duration_seconds
            );
            this.isLooping = wasLooping; // Restore loop setting
        }
    }
    
    /**
     * Set master volume
     */
    setMasterVolume(volume) {
        this.masterVolume = Math.max(0, Math.min(1, volume));
        this.updateVolumes();
        this.trigger('volume_changed', { master: this.masterVolume });
    }
    
    /**
     * Set music volume
     */
    setMusicVolume(volume) {
        this.musicVolume = Math.max(0, Math.min(1, volume));
        this.updateVolumes();
        this.trigger('volume_changed', { music: this.musicVolume });
    }
    
    /**
     * Set sound volume
     */
    setSoundVolume(volume) {
        this.soundVolume = Math.max(0, Math.min(1, volume));
        this.updateVolumes();
        this.trigger('volume_changed', { sound: this.soundVolume });
    }
    
    /**
     * Update all audio volumes
     */
    updateVolumes() {
        if (this.musicAudio) {
            this.musicAudio.volume = this.masterVolume * this.musicVolume;
        }
        
        // Update all sound effects
        this.soundAudios.forEach((audio) => {
            // Preserve individual sound volume (would need to track this separately)
            audio.volume = this.masterVolume * this.soundVolume;
        });
    }
    
    /**
     * Set loop
     */
    setLoop(loop) {
        this.isLooping = loop;
        if (this.musicAudio) {
            this.musicAudio.loop = loop;
        }
        this.trigger('loop_changed', { loop: loop });
    }
    
    /**
     * Get current playback state
     */
    getState() {
        return {
            isPlaying: this.isPlaying,
            isPaused: this.isPaused,
            isLooping: this.isLooping,
            currentTrack: this.currentTrack,
            currentPlaylist: this.currentPlaylist,
            masterVolume: this.masterVolume,
            musicVolume: this.musicVolume,
            soundVolume: this.soundVolume,
            currentTime: this.musicAudio ? this.musicAudio.currentTime : 0,
            duration: this.musicAudio ? this.musicAudio.duration : 0
        };
    }
    
    /**
     * Register event handler
     */
    on(eventType, handler) {
        if (!this.eventHandlers[eventType]) {
            this.eventHandlers[eventType] = [];
        }
        this.eventHandlers[eventType].push(handler);
    }
    
    /**
     * Remove event handler
     */
    off(eventType, handler) {
        if (!this.eventHandlers[eventType]) {
            return;
        }
        this.eventHandlers[eventType] = this.eventHandlers[eventType].filter(h => h !== handler);
    }
    
    /**
     * Trigger event
     */
    trigger(eventType, data) {
        if (!this.eventHandlers[eventType]) {
            return;
        }
        this.eventHandlers[eventType].forEach(handler => {
            try {
                handler(data);
            } catch (error) {
                console.error(`Audio Manager: Event handler error for ${eventType}:`, error);
            }
        });
    }
    
    /**
     * Cleanup
     */
    cleanup() {
        this.stop();
        if (this.realtimeClient) {
            // Remove event handlers
            this.realtimeClient.off('audio_play', this.handlePlayEvent);
            this.realtimeClient.off('audio_pause', this.handlePauseEvent);
            this.realtimeClient.off('audio_stop', this.handleStopEvent);
            this.realtimeClient.off('audio_volume', this.handleVolumeEvent);
            this.realtimeClient.off('audio_loop', this.handleLoopEvent);
            this.realtimeClient.off('soundboard_play', this.handleSoundboardPlayEvent);
        }
        this.sessionId = null;
        this.realtimeClient = null;
    }
}

// Export to window
window.AudioManager = AudioManager;
