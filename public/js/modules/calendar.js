/**
 * BECMI D&D Character Manager - Calendar Module
 * 
 * Handles calendar view for session scheduling and management.
 */

class CalendarModule {
    constructor(app) {
        this.app = app;
        this.apiClient = app.modules.apiClient;
        this.currentDate = new Date();
        this.eventHandlersSetup = false;
        
        console.log('Calendar Module initialized');
    }
    
    /**
     * Render calendar view
     */
    async render() {
        try {
            const sessions = this.app.state.sessions || [];
            
            return `<div class="calendar-container">
                    <div class="calendar-header">
                        <h1>Session Calendar</h1>
                        <div class="calendar-controls">
                            <button class="btn btn-secondary" id="prev-month">
                                <i class="fas fa-chevron-left"></i>
                            </button>
                            <span id="current-month">${this.getCurrentMonthYear()}</span>
                            <button class="btn btn-secondary" id="next-month">
                                <i class="fas fa-chevron-right"></i>
                            </button>
                            <button class="btn btn-primary" id="today-btn">Today</button>
                        </div>
                    </div>
                    
                    ${this.renderCalendarGrid(sessions)}
                    
                    <div class="calendar-legend">
                        <div class="legend-item">
                            <span class="legend-color scheduled"></span>
                            <span>Scheduled</span>
                        </div>
                        <div class="legend-item">
                            <span class="legend-color active"></span>
                            <span>Active</span>
                        </div>
                        <div class="legend-item">
                            <span class="legend-color completed"></span>
                            <span>Completed</span>
                        </div>
                        <div class="legend-item">
                            <span class="legend-color cancelled"></span>
                            <span>Cancelled</span>
                        </div>
                    </div>
                </div>
            `;
            
        } catch (error) {
            console.error('Calendar render error:', error);
            return '<div class="card"><h2>Error</h2><p>Failed to load calendar.</p></div>';
        }
    }
    
    /**
     * Render calendar grid
     */
    renderCalendarGrid(sessions) {
        const year = this.currentDate.getFullYear();
        const month = this.currentDate.getMonth();
        
        // Get first day of month and number of days
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        // Convert to Monday=0 system (Monday=0, Tuesday=1, ..., Sunday=6)
        let startDayOfWeek = firstDay.getDay();
        startDayOfWeek = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1;
        
        // Calendar header - Monday first (European standard)
        const header = `<div class="calendar-header-row">
                <div class="day-header">Mon</div>
                <div class="day-header">Tue</div>
                <div class="day-header">Wed</div>
                <div class="day-header">Thu</div>
                <div class="day-header">Fri</div>
                <div class="day-header">Sat</div>
                <div class="day-header">Sun</div>
            </div>
        `;
        
        // Calendar body
        let calendarBody = '';
        let currentDay = 1;
        
        // Add empty cells for days before the first day of the month
        for (let i = 0; i < startDayOfWeek; i++) {
            calendarBody += '<div class="calendar-day empty"></div>';
        }
        
        // Add days of the month
        for (let day = 1; day <= daysInMonth; day++) {
            const dayDate = new Date(year, month, day);
            const daySessions = this.getSessionsForDay(sessions, dayDate);
            
            calendarBody += this.renderCalendarDay(day, daySessions, dayDate);
        }
        
        // Add empty cells for days after the last day of the month
        const totalCells = Math.ceil((startDayOfWeek + daysInMonth) / 7) * 7;
        const remainingCells = totalCells - (startDayOfWeek + daysInMonth);
        for (let i = 0; i < remainingCells; i++) {
            calendarBody += '<div class="calendar-day empty"></div>';
        }
        
        return `${header}
                <div class="calendar-grid">
                    ${calendarBody}
                </div>`;
    }
    
    /**
     * Render individual calendar day
     */
    renderCalendarDay(day, sessions, date) {
        const isToday = this.isToday(date);
        const isPast = date < new Date() && !isToday;
        
        let dayClass = 'calendar-day';
        if (isToday) dayClass += ' today';
        if (isPast) dayClass += ' past';
        
        const sessionsHtml = sessions.map(session => `<div class="session-indicator ${session.status}" data-session-id="${session.session_id}" title="${session.session_title}">
                ${session.session_title}
            </div>
        `).join('');
        
        return `<div class="${dayClass}" data-date="${date.toISOString().split('T')[0]}">
                <div class="day-number">${day}</div>
                <div class="day-sessions">
                    ${sessionsHtml}
                </div>
            </div>
        `;
    }
    
    /**
     * Get sessions for a specific day
     */
    getSessionsForDay(sessions, date) {
        const dateStr = date.toISOString().split('T')[0];
        
        return sessions.filter(session => {
            const sessionDate = new Date(session.session_datetime);
            const sessionDateStr = sessionDate.toISOString().split('T')[0];
            return sessionDateStr === dateStr;
        });
    }
    
    /**
     * Check if date is today
     */
    isToday(date) {
        const today = new Date();
        return date.toDateString() === today.toDateString();
    }
    
    /**
     * Get current month and year string
     */
    getCurrentMonthYear() {
        return this.currentDate.toLocaleDateString('en-US', {
            month: 'long',
            year: 'numeric'});
    }
    
    /**
     * Setup event handlers
     */
    setupEventHandlers() {
        // Only setup handlers once - they use event delegation so they persist
        if (this.eventHandlersSetup) {
            return;
        }
        
        // Month navigation - using event delegation with namespaced events
        $(document).on('click.calendar', '#prev-month', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.currentDate.setMonth(this.currentDate.getMonth() - 1);
            this.refreshCalendar();
        });
        
        $(document).on('click.calendar', '#next-month', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.currentDate.setMonth(this.currentDate.getMonth() + 1);
            this.refreshCalendar();
        });
        
        $(document).on('click.calendar', '#today-btn', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.currentDate = new Date();
            this.refreshCalendar();
        });
        
        // Session click handlers
        $(document).on('click.calendar', '.session-indicator', (e) => {
            e.stopPropagation();
            const sessionId = $(e.currentTarget).data('session-id');
            if (this.app.modules.sessionManagement) {
                this.app.modules.sessionManagement.viewSession(sessionId);
            } else {
                this.app.showError('Session management module not available');
            }
        });
        
        // Day click handlers
        $(document).on('click.calendar', '.calendar-day:not(.empty)', (e) => {
            const date = $(e.currentTarget).data('date');
            this.showDayDetails(date);
        });
        
        this.eventHandlersSetup = true;
        console.log('Calendar event handlers setup complete');
    }
    
    /**
     * Refresh calendar display
     */
    async refreshCalendar() {
        try {
            const content = await this.render();
            $('#content-area').html(content);
            
            // Update month display
            $('#current-month').text(this.getCurrentMonthYear());
            
            // Event handlers are set up via event delegation, so they persist
            // through DOM updates. No need to re-setup here.
            
        } catch (error) {
            console.error('Failed to refresh calendar:', error);
            this.app.showError('Failed to refresh calendar');
        }
    }
    
    /**
     * Show day details
     */
    showDayDetails(date) {
        const sessions = this.app.state.sessions || [];
        const daySessions = this.getSessionsForDay(sessions, new Date(date));
        
        if (daySessions.length === 0) {
            this.app.showSuccess(`No sessions scheduled for ${new Date(date).toLocaleDateString()}`);
            return;
        }
        
        const sessionsList = daySessions.map(session => 
            `<li><strong>${session.session_title}</strong> at ${new Date(session.session_datetime).toLocaleTimeString()}</li>`).join('');
        
        const modal = $(`<div class="modal"id="day-details-modal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h2>Sessions for ${new Date(date).toLocaleDateString()}</h2>
                        <button class="modal-close">&times;</button>
                    </div>
                    <div class="modal-body">
                        <ul>${sessionsList}</ul>
                    </div>
                </div>
            </div>
        `);
        
        $('body').append(modal);
        modal.show();
        
        // Close modal handlers
        modal.find('.modal-close').on('click', () => modal.remove());
        modal.on('click', (e) => {
            if (e.target === modal[0]) modal.remove();
        });
    }
    
    /**
     * Initialize calendar module
     */
    init() {
        this.setupEventHandlers();
        console.log('Calendar Module initialized');
    }
}

// Export to window for use in app.js
window.CalendarModule = CalendarModule;
