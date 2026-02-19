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
        this.ambianceAudio = null; // Single instance for ambiance (looping background)
        
        // State
        this.currentTrack = null;
        this.currentPlaylist = null;
        this.currentPlaylistTracks = []; // Array of tracks in current playlist (may be shuffled)
        this.originalPlaylistTracks = []; // Original unshuffled tracks (for reshuffling on loop)
        this.currentPlaylistIndex = 0; // Current track index in playlist
        this.currentAmbianceTrack = null; // Currently playing ambiance track info
        this.isPlaying = false;
        this.isPaused = false;
        this.isLooping = false;
        this.isPlaylistLooping = false; // Loop entire playlist
        this.isPlaylistShuffled = false; // Shuffle playlist tracks
        this.lastDirectPlayTimestamp = 0; // Track when we last played directly (to ignore duplicate real-time events)
        this.lastDirectPlaylistId = null; // Track which playlist we last played directly
        this.lastDirectAmbianceTimestamp = 0; // Track direct ambiance starts to ignore duplicate broadcast echo
        this.lastDirectAmbianceTrackId = null; // Last directly played ambiance track ID
        
        // Volume levels (0-1)
        this.masterVolume = 0.6; // Default 60%
        this.musicVolume = 0.33; // Default 33%
        this.soundVolume = 1.0;
        this.ambianceVolume = 1.0; // Default 100%
        
        // Event handlers
        this.eventHandlers = {};
        this.boundRealtimeHandlers = null;
        this.boundRealtimeClient = null;
        
        console.log('Audio Manager initialized');
    }
    
    /**
     * Initialize audio manager for a session
     * @param {number} sessionId - Session ID
     * @param {RealtimeClient} realtimeClient - Real-time client instance
     */
    async init(sessionId, realtimeClient) {
        this.sessionId = sessionId;
        this.realtimeClient = realtimeClient;
        
        // Register real-time event handlers
        this.setupRealtimeHandlers();
        
        // Load current audio state to synchronize with ongoing playback
        await this.syncWithCurrentState();
        
        console.log(`Audio Manager initialized for session ${sessionId}`);
    }
    
    /**
     * Sync with current audio state (for players joining mid-session)
     */
    async syncWithCurrentState() {
        try {
            console.log('Audio Manager: Syncing with current state for session', this.sessionId);
            const response = await this.apiClient.get(`/api/audio/get-state.php?session_id=${this.sessionId}`);
            
            if (response.status === 'success' && response.data) {
                const state = response.data;
                console.log('Audio Manager: Received state from server', {
                    is_playing: state.is_playing,
                    is_paused: state.is_paused,
                    track_id: state.track_id,
                    playlist_id: state.playlist_id,
                    current_time: state.current_time
                });
                
                // Set volume levels
                if (state.master_volume !== undefined) {
                    this.setMasterVolume(state.master_volume);
                } else if (state.volume !== undefined) {
                    this.setMasterVolume(state.volume);
                }
                if (state.music_volume !== undefined) {
                    this.setMusicVolume(state.music_volume);
                }
                if (state.sound_volume !== undefined) {
                    this.setSoundVolume(state.sound_volume);
                }
                if (state.ambiance_volume !== undefined) {
                    this.setAmbianceVolume(state.ambiance_volume);
                }
                
                // Set loop setting
                if (state.is_looping !== undefined) {
                    this.setLoop(state.is_looping);
                }
                
                // Restore ambiance state if playing
                if (state.ambiance_track_id && state.ambiance_file_path) {
                    this.playAmbiance(
                        state.ambiance_track_id,
                        state.ambiance_file_path,
                        state.ambiance_volume || 1.0,
                        null,
                        false
                    );
                }
                
                // If something is playing, start playback
                if (state.is_playing && !state.is_paused) {
                    console.log('Audio Manager: Syncing to playing state', state);
                    
                    if (state.playlist_id && state.playlist_tracks) {
                        // Playing playlist
                        // Store current_time for later use
                        const syncTime = state.current_time || 0;
                        
                        console.log('Audio Manager: Starting playlist playback for sync', {
                            playlist_id: state.playlist_id,
                            tracks_count: state.playlist_tracks?.length,
                            syncTime,
                            is_looping: state.is_playlist_looping,
                            is_shuffled: state.is_playlist_shuffled
                        });
                        
                        this.playPlaylist(
                            state.playlist_id,
                            state.playlist_tracks,
                            0, // Will be adjusted by current_time after load
                            state.is_playlist_looping || false,
                            state.is_playlist_shuffled || false,
                            false // isDirectPlay = false (this is a sync, not direct play)
                        );
                        
                        // Seek to correct position after audio loads
                        if (syncTime > 0) {
                            console.log('Audio Manager: Will seek to position', syncTime, 'after audio loads');
                            this.seekAfterLoad(syncTime);
                        }
                    } else if (state.track_id && state.file_path) {
                        // Playing single track - playTrack handles currentTime parameter
                        this.playTrack(
                            state.track_id,
                            state.file_path,
                            state.current_time || 0,
                            state.duration_seconds
                        );
                    }
                } else if (state.is_playing && state.is_paused) {
                    // Paused - load track but don't play
                    if (state.playlist_id && state.playlist_tracks) {
                        // Load playlist but don't play
                        this.currentPlaylist = { playlist_id: state.playlist_id };
                        this.currentPlaylistTracks = state.playlist_tracks;
                        this.isPlaylistLooping = state.is_playlist_looping || false;
                        this.isPlaylistShuffled = state.is_playlist_shuffled || false;
                        
                        // Load first track but pause
                        const trackToPlay = this.currentPlaylistTracks[0];
                        if (trackToPlay && trackToPlay.track) {
                            this.musicAudio = new Audio(trackToPlay.track.file_path);
                            this.musicAudio.volume = this.masterVolume * this.musicVolume;
                            this.musicAudio.currentTime = state.current_time || 0;
                            this.isPaused = true;
                            this.currentTrack = {
                                track_id: trackToPlay.track.track_id,
                                file_path: trackToPlay.track.file_path,
                                duration_seconds: trackToPlay.track.duration_seconds
                            };
                        }
                    } else if (state.track_id && state.file_path) {
                        // Load single track but pause
                        this.musicAudio = new Audio(state.file_path);
                        this.musicAudio.volume = this.masterVolume * this.musicVolume;
                        this.musicAudio.currentTime = state.current_time || 0;
                        this.isPaused = true;
                        this.currentTrack = {
                            track_id: state.track_id,
                            file_path: state.file_path,
                            duration_seconds: state.duration_seconds
                        };
                    }
                }
                
                console.log('Audio Manager: Synced with current state', state);
            } else {
                console.log('Audio Manager: No audio state returned from server (no audio currently playing)');
            }
        } catch (error) {
            console.error('Audio Manager: Failed to sync with current state:', error);
            console.error('Audio Manager: Error details:', {
                message: error.message,
                stack: error.stack
            });
            // This is not critical - just means no audio is currently playing or there was an error
        }
    }
    
    /**
     * Seek to position after audio element has loaded
     * @param {number} targetTime - Time in seconds to seek to
     */
    seekAfterLoad(targetTime) {
        if (!this.musicAudio) {
            // Audio not created yet, try again after a short delay
            setTimeout(() => this.seekAfterLoad(targetTime), 100);
            return;
        }
        
        const seekToPosition = () => {
            if (this.musicAudio && this.musicAudio.duration) {
                const seekTime = Math.min(targetTime, this.musicAudio.duration);
                this.musicAudio.currentTime = seekTime;
                console.log('Audio Manager: Synced to position', seekTime, 'of', this.musicAudio.duration);
            } else if (this.musicAudio) {
                // Duration not available yet, try again
                setTimeout(seekToPosition, 100);
            }
        };
        
        if (this.musicAudio.readyState >= 2) {
            // Metadata already loaded
            seekToPosition();
        } else {
            // Wait for metadata
            this.musicAudio.addEventListener('loadedmetadata', seekToPosition, { once: true });
            // Also set a timeout as fallback
            setTimeout(seekToPosition, 1000);
        }
    }
    
    /**
     * Setup real-time event handlers
     */
    setupRealtimeHandlers() {
        if (!this.realtimeClient) {
            console.warn('Audio Manager: No realtime client available');
            return;
        }

        if (!this.boundRealtimeHandlers) {
            this.boundRealtimeHandlers = {
                audio_play: (data) => this.handlePlayEvent(data),
                audio_pause: (data) => this.handlePauseEvent(data),
                audio_stop: (data) => this.handleStopEvent(data),
                audio_volume: (data) => this.handleVolumeEvent(data),
                audio_loop: (data) => this.handleLoopEvent(data),
                audio_playlist_loop: (data) => this.handlePlaylistLoopEvent(data),
                soundboard_play: (data) => this.handleSoundboardPlayEvent(data),
                ambiance_play: (data) => this.handleAmbiancePlayEvent(data),
                ambiance_stop: (data) => this.handleAmbianceStopEvent(data)
            };
        }

        // Rebind handlers only when realtime client changed.
        if (this.boundRealtimeClient && this.boundRealtimeClient !== this.realtimeClient) {
            Object.entries(this.boundRealtimeHandlers).forEach(([eventType, handler]) => {
                this.boundRealtimeClient.off(eventType, handler);
            });
        }

        if (this.boundRealtimeClient === this.realtimeClient) {
            return;
        }

        Object.entries(this.boundRealtimeHandlers).forEach(([eventType, handler]) => {
            this.realtimeClient.on(eventType, handler);
        });

        this.boundRealtimeClient = this.realtimeClient;
    }
    
    /**
     * Handle play event
     */
    handlePlayEvent(data) {
        console.log('Audio Manager: Play event received', data);
        
        // Ignore real-time events if we just started this playlist directly (within last 10 seconds)
        // This prevents duplicate playback when DM clicks play and receives their own broadcast
        if (data.playlist_id) {
            const now = Date.now();
            const timeSinceDirectPlay = now - this.lastDirectPlayTimestamp;
            
            // Check if we're already playing this playlist (either directly or from previous event)
            // Also check if we have a current track playing (even if isPlaying isn't set yet)
            const isAlreadyPlaying = this.currentPlaylist && 
                                   this.currentPlaylist.playlist_id === data.playlist_id &&
                                   (this.isPlaying || this.isPaused || this.currentTrack !== null || this.musicAudio !== null);
            
            // Ignore if we just started this playlist directly (within 10 seconds) OR if we're already playing it
            const justStartedDirectly = this.lastDirectPlaylistId === data.playlist_id && timeSinceDirectPlay < 10000;
            
            if (justStartedDirectly || isAlreadyPlaying) {
                console.log('Audio Manager: Ignoring duplicate real-time event', {
                    justStartedDirectly,
                    isAlreadyPlaying,
                    playlistId: data.playlist_id,
                    timeSinceDirectPlay,
                    lastDirectPlaylistId: this.lastDirectPlaylistId,
                    currentPlaylist: this.currentPlaylist?.playlist_id,
                    isPlaying: this.isPlaying,
                    isPaused: this.isPaused,
                    hasCurrentTrack: this.currentTrack !== null,
                    hasMusicAudio: this.musicAudio !== null
                });
                return;
            }
        }
        
        // Also ignore if we're playing a single track and this is the same track
        if (data.track_id && !data.playlist_id) {
            if (this.currentTrack && this.currentTrack.track_id === data.track_id && (this.isPlaying || this.isPaused)) {
                console.log('Audio Manager: Ignoring duplicate real-time event (we already started this track)');
                return;
            }
        }
        
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
        } else if (data.master !== undefined) {
            this.setMasterVolume(data.master);
        }
        if (data.music_volume !== undefined) {
            this.setMusicVolume(data.music_volume);
        } else if (data.music !== undefined) {
            this.setMusicVolume(data.music);
        }
        if (data.sound_volume !== undefined) {
            this.setSoundVolume(data.sound_volume);
        } else if (data.sound !== undefined) {
            this.setSoundVolume(data.sound);
        }
        if (data.ambiance_volume !== undefined) {
            this.setAmbianceVolume(data.ambiance_volume);
        } else if (data.ambiance !== undefined) {
            this.setAmbianceVolume(data.ambiance);
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
     * Handle playlist loop change event
     */
    handlePlaylistLoopEvent(data) {
        console.log('Audio Manager: Playlist loop event received', data);
        // Update loop state if this is the currently playing playlist
        if (this.currentPlaylist && this.currentPlaylist.playlist_id === data.playlist_id) {
            const oldValue = this.isPlaylistLooping;
            this.isPlaylistLooping = data.is_playlist_looping;
            console.log('Audio Manager: Updated playlist loop state', {
                playlist_id: data.playlist_id,
                old_value: oldValue,
                new_value: this.isPlaylistLooping,
                is_playlist_looping: this.isPlaylistLooping
            });
        } else {
            console.log('Audio Manager: Playlist loop event ignored (not current playlist)', {
                event_playlist_id: data.playlist_id,
                current_playlist_id: this.currentPlaylist?.playlist_id
            });
        }
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
        // Stop current music if playing, but preserve playlist state if we're continuing a playlist
        const wasPlayingPlaylist = this.currentPlaylist !== null;
        const savedPlaylist = wasPlayingPlaylist ? {
            playlist: this.currentPlaylist,
            tracks: this.currentPlaylistTracks,
            originalTracks: this.originalPlaylistTracks,
            index: this.currentPlaylistIndex,
            isLooping: this.isPlaylistLooping,
            isShuffled: this.isPlaylistShuffled
        } : null;
        
        // Stop audio but preserve playlist state
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
        
        // Restore playlist state if we were playing a playlist
        if (savedPlaylist) {
            this.currentPlaylist = savedPlaylist.playlist;
            this.currentPlaylistTracks = savedPlaylist.tracks;
            this.originalPlaylistTracks = savedPlaylist.originalTracks;
            this.currentPlaylistIndex = savedPlaylist.index;
            this.isPlaylistLooping = savedPlaylist.isLooping;
            this.isPlaylistShuffled = savedPlaylist.isShuffled;
        }
        
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
            // IMPORTANT: If we're playing a playlist, handle playlist logic FIRST
            // Single track loop should NOT interfere with playlist playback
            if (this.currentPlaylist && this.currentPlaylistTracks.length > 0) {
                // We're playing a playlist - handle playlist track ended
                // Single track loop is ignored when playing playlist
                this.handlePlaylistTrackEnded();
                return;
            }
            
            // Not playing a playlist - handle single track loop
            if (this.isLooping) {
                // Single track looping - handled by audio.loop
                return;
            }
            
            // Single track ended (not looping, not in playlist)
            this.isPlaying = false;
            this.currentTrack = null;
            this.trigger('track_ended', { track_id: trackId });
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
        this.musicAudio.play().then(() => {
            console.log('Audio Manager: Track started playing successfully', { trackId, finalPath });
        }).catch(error => {
            console.error('Audio Manager: Play failed', error);
            console.error('Audio Manager: Failed file path:', finalPath);
            console.error('Audio Manager: Error details:', {
                name: error.name,
                message: error.message,
                error: error
            });
            
            // Browser autoplay policy - user interaction required
            // For sync scenarios, we might need to wait for user interaction
            this.isPlaying = false;
            this.trigger('autoplay_blocked', { track_id: trackId, file_path: finalPath, error: error.message });
            
            // Log a helpful message
            console.warn('Audio Manager: Autoplay was blocked. User interaction may be required to start playback.');
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
        
        // Note: Do NOT stop ambiance here - ambiance is independent of music/playlists
        // Ambiance should only be stopped explicitly via stopAmbiance()
        
        this.isPlaying = false;
        this.isPaused = false;
        this.currentTrack = null;
        this.currentPlaylist = null;
        this.currentPlaylistTracks = [];
        this.originalPlaylistTracks = [];
        this.currentPlaylistIndex = 0;
        
        this.trigger('stopped', {});
    }
    
    /**
     * Handle playlist track ended - move to next track
     */
    handlePlaylistTrackEnded() {
        if (!this.currentPlaylist || this.currentPlaylistTracks.length === 0) {
            console.log('Audio Manager: handlePlaylistTrackEnded called but no playlist active');
            return;
        }
        
        console.log('Audio Manager: Playlist track ended', {
            playlist_id: this.currentPlaylist.playlist_id,
            current_index: this.currentPlaylistIndex,
            total_tracks: this.currentPlaylistTracks.length,
            is_looping: this.isPlaylistLooping,
            is_shuffled: this.isPlaylistShuffled
        });
        
        // Move to next track
        this.currentPlaylistIndex++;
        
        // Check if we've reached the end
        if (this.currentPlaylistIndex >= this.currentPlaylistTracks.length) {
            console.log('Audio Manager: Reached end of playlist', {
                current_index: this.currentPlaylistIndex,
                tracks_length: this.currentPlaylistTracks.length,
                isPlaylistLooping: this.isPlaylistLooping,
                isPlaylistShuffled: this.isPlaylistShuffled,
                playlist_id: this.currentPlaylist?.playlist_id
            });
            
            if (this.isPlaylistLooping) {
                // Loop playlist - preserve loop and shuffle state
                console.log('Audio Manager: Looping playlist (repeat enabled)');
                if (this.isPlaylistShuffled) {
                    // Reshuffle for next loop - use original tracks to ensure truly random order
                    this.currentPlaylistTracks = this.shuffleArray(this.originalPlaylistTracks);
                    this.currentPlaylistIndex = 0;
                    console.log('Audio Manager: Reshuffled playlist for next loop', {
                        shuffled_tracks_count: this.currentPlaylistTracks.length,
                        original_tracks_count: this.originalPlaylistTracks.length
                    });
                } else {
                    // Just restart from beginning in original order
                    this.currentPlaylistIndex = 0;
                    console.log('Audio Manager: Restarting playlist from beginning (repeat enabled, no shuffle)');
                }
                // Continue to play next track (which is now at index 0)
            } else {
                // Playlist ended
                console.log('Audio Manager: Playlist ended (repeat disabled)');
                this.isPlaying = false;
                this.currentTrack = null;
                const endedPlaylistId = this.currentPlaylist.playlist_id;
                this.currentPlaylist = null;
                this.currentPlaylistTracks = [];
                this.originalPlaylistTracks = [];
                this.currentPlaylistIndex = 0;
                this.trigger('playlist_ended', { playlist_id: endedPlaylistId });
                return;
            }
        }
        
        // Play next track
        const nextTrack = this.currentPlaylistTracks[this.currentPlaylistIndex];
        if (nextTrack && nextTrack.track) {
            console.log('Audio Manager: Playing next track in playlist', {
                track_index: this.currentPlaylistIndex,
                track_id: nextTrack.track.track_id,
                track_name: nextTrack.track.track_name,
                is_looping: this.isPlaylistLooping
            });
            
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
        } else {
            console.error('Audio Manager: No next track found!', {
                current_index: this.currentPlaylistIndex,
                tracks_length: this.currentPlaylistTracks.length,
                nextTrack: nextTrack
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
     * @param {boolean} isDirectPlay - If true, marks this as a direct play (not from real-time event)
     */
    playPlaylist(playlistId, tracks = [], startIndex = 0, isLooping = false, isShuffled = false, isDirectPlay = false) {
        if (!tracks || tracks.length === 0) {
            console.warn('Audio Manager: Cannot play playlist - no tracks provided');
            return;
        }
        
        // If this is NOT a direct play, check if we just started this playlist directly
        // If so, ignore this call (it's a duplicate real-time event)
        if (!isDirectPlay) {
            const now = Date.now();
            const timeSinceDirectPlay = now - this.lastDirectPlayTimestamp;
            
            // Also check if we're already playing this playlist
            const isAlreadyPlaying = this.currentPlaylist && 
                                   this.currentPlaylist.playlist_id === playlistId &&
                                   (this.isPlaying || this.isPaused || this.currentTrack !== null || this.musicAudio !== null);
            
            if ((this.lastDirectPlaylistId === playlistId && timeSinceDirectPlay < 10000) || isAlreadyPlaying) {
                console.log('Audio Manager: Ignoring duplicate playlist play', {
                    playlistId,
                    timeSinceDirectPlay,
                    lastDirectPlaylistId: this.lastDirectPlaylistId,
                    isAlreadyPlaying,
                    currentPlaylist: this.currentPlaylist?.playlist_id,
                    hasCurrentTrack: this.currentTrack !== null,
                    hasMusicAudio: this.musicAudio !== null
                });
                return;
            }
        }
        
        // Stop current music if playing (unless it's the same playlist continuing)
        // Only stop if it's a different playlist or a single track
        if (this.currentPlaylist && this.currentPlaylist.playlist_id !== playlistId) {
            this.stop();
        } else if (!this.currentPlaylist) {
            // No playlist currently playing, stop any single track
            this.stop();
        }
        // If same playlist, don't stop - just update settings and continue
        
        // Track direct plays to ignore duplicate real-time events
        if (isDirectPlay) {
            this.lastDirectPlayTimestamp = Date.now();
            this.lastDirectPlaylistId = playlistId;
            console.log('Audio Manager: Marked as direct play', { playlistId, timestamp: this.lastDirectPlayTimestamp });
        }
        
        this.currentPlaylist = { playlist_id: playlistId };
        this.isPlaylistLooping = isLooping;
        this.isPlaylistShuffled = isShuffled;
        
        console.log('Audio Manager: Setting playlist state', {
            playlist_id: playlistId,
            isPlaylistLooping: this.isPlaylistLooping,
            isPlaylistShuffled: this.isPlaylistShuffled,
            tracks_count: tracks.length
        });
        
        // Store original tracks (for reshuffling on loop)
        this.originalPlaylistTracks = [...tracks];
        
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
            // If we're already playing this exact track in this playlist, don't restart it
            // This prevents duplicate playback when real-time events arrive after direct play
            if (!isDirectPlay && 
                this.currentTrack && 
                this.currentTrack.track_id === trackToPlay.track.track_id &&
                this.currentPlaylist &&
                this.currentPlaylist.playlist_id === playlistId &&
                (this.isPlaying || this.isPaused)) {
                console.log('Audio Manager: Already playing this track in playlist, skipping restart');
                return;
            }
            
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
     * Set ambiance volume
     */
    setAmbianceVolume(volume) {
        this.ambianceVolume = Math.max(0, Math.min(1, volume));
        this.updateVolumes();
        this.trigger('volume_changed', { ambiance: this.ambianceVolume });
    }

    /**
     * Play ambiance track (looped background).
     * @param {boolean} isDirectPlay - True when DM triggers local immediate playback
     */
    playAmbiance(trackId, filePath, volume = 1.0, durationSeconds = null, isDirectPlay = false) {
        if (!trackId || !filePath) {
            return;
        }

        const now = Date.now();
        const normalizedTrackVolume = Math.max(0, Math.min(1, volume));

        // Ignore duplicate broadcast echo right after local direct play.
        if (!isDirectPlay &&
            this.lastDirectAmbianceTrackId === trackId &&
            now - this.lastDirectAmbianceTimestamp < 5000) {
            return;
        }

        // If already playing this track, only refresh volume metadata.
        if (!isDirectPlay &&
            this.currentAmbianceTrack &&
            this.currentAmbianceTrack.track_id === trackId &&
            this.ambianceAudio &&
            !this.ambianceAudio.paused) {
            this.currentAmbianceTrack.volume = normalizedTrackVolume;
            this.updateVolumes();
            return;
        }

        this.stopAmbiance();

        let finalPath = filePath;
        if (!filePath.startsWith('/') && !filePath.startsWith('http://') && !filePath.startsWith('https://')) {
            finalPath = '/' + filePath;
        }

        this.ambianceAudio = new Audio(finalPath);
        this.ambianceAudio.loop = true;
        this.ambianceAudio.volume = this.masterVolume * this.ambianceVolume * normalizedTrackVolume;

        this.currentAmbianceTrack = {
            track_id: trackId,
            file_path: finalPath,
            duration_seconds: durationSeconds,
            volume: normalizedTrackVolume
        };

        if (isDirectPlay) {
            this.lastDirectAmbianceTimestamp = now;
            this.lastDirectAmbianceTrackId = trackId;
        }

        this.ambianceAudio.addEventListener('error', (e) => {
            console.error('Audio Manager: Error playing ambiance', e);
            this.trigger('error', { error: 'Failed to play ambiance', track_id: trackId, file_path: finalPath });
        });

        this.ambianceAudio.play().catch(error => {
            console.error('Audio Manager: Ambiance play failed', error);
            this.trigger('autoplay_blocked', {
                track_id: trackId,
                file_path: finalPath,
                error: error.message,
                channel: 'ambiance'
            });
        });

        this.trigger('ambiance_started', { track_id: trackId, file_path: finalPath });
    }

    /**
     * Stop currently playing ambiance.
     */
    stopAmbiance() {
        const stoppedTrackId = this.currentAmbianceTrack ? this.currentAmbianceTrack.track_id : null;

        if (this.ambianceAudio) {
            this.ambianceAudio.pause();
            this.ambianceAudio.currentTime = 0;
            this.ambianceAudio = null;
        }

        this.currentAmbianceTrack = null;
        this.trigger('ambiance_stopped', { track_id: stoppedTrackId });
    }

    /**
     * Handle ambiance play event
     */
    handleAmbiancePlayEvent(data) {
        if (!data || !data.track_id || !data.file_path) {
            return;
        }
        const volume = data.volume !== undefined ? data.volume : 1.0;
        this.playAmbiance(data.track_id, data.file_path, volume, data.duration_seconds, false);
    }

    /**
     * Handle ambiance stop event
     */
    handleAmbianceStopEvent() {
        this.stopAmbiance();
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
        
        // Update ambiance volume
        if (this.ambianceAudio) {
            const ambianceTrackVolume = this.currentAmbianceTrack?.volume ?? 1.0;
            this.ambianceAudio.volume = this.masterVolume * this.ambianceVolume * Math.max(0, Math.min(1, ambianceTrackVolume));
        }
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
            currentAmbianceTrack: this.currentAmbianceTrack,
            masterVolume: this.masterVolume,
            musicVolume: this.musicVolume,
            soundVolume: this.soundVolume,
            ambianceVolume: this.ambianceVolume,
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
        this.stopAmbiance();

        if (this.boundRealtimeClient && this.boundRealtimeHandlers) {
            Object.entries(this.boundRealtimeHandlers).forEach(([eventType, handler]) => {
                this.boundRealtimeClient.off(eventType, handler);
            });
        }

        this.boundRealtimeClient = null;
        this.sessionId = null;
        this.realtimeClient = null;
    }
}

// Export to window
window.AudioManager = AudioManager;
