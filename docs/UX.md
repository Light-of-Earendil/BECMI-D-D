# BECMI VTT - User Experience Documentation

**Last Updated**: 2026-01-06  
**Version**: 2.1.0-beta

---

## User Flows

### Character Creation Flow

1. **User clicks "Create Character"**
   - Button: Dashboard → "Create Character" button
   - Expected: Character creation wizard opens

2. **Step 1: Basic Information**
   - Inputs: Character name, class, alignment
   - Validation: Name 1-50 chars, class/enum values
   - Next button enabled when valid

3. **Step 2: Ability Scores**
   - Inputs: Strength, Dexterity, Constitution, Intelligence, Wisdom, Charisma
   - Validation: All scores 3-18 range
   - Auto-calculates modifiers

4. **Step 3: Equipment**
   - Selection: Starting equipment from catalog
   - Auto-calculates encumbrance

5. **Step 4: Review & Create**
   - Displays: Complete character summary
   - Action: "Create Character" button
   - Expected: Character created, redirect to character sheet

**States**:
- **Loading**: Spinner shown during API call
- **Success**: Character sheet displayed
- **Error**: Error message shown, user can retry

---

### Session Management Flow (DM)

1. **Create Session**
   - Button: "Create Session" → Opens modal
   - Inputs: Title, description, date/time, duration, max players, campaign
   - Validation: Title required, date in future, duration 30-480 minutes
   - Action: "Create Session" button
   - Expected: Session created, appears in session list

2. **Invite Players**
   - Button: Session → "Invite Players"
   - Search: User search by username/email
   - Action: Click "Invite" on user
   - Expected: Invitation sent, player receives notification

3. **Start Session**
   - Button: Session → "Start Session"
   - Expected: Session status changes to "active", DM dashboard opens

**States**:
- **Scheduled**: Session appears in "Upcoming" list
- **Active**: Session appears in "Active Sessions" with live updates
- **Completed**: Session appears in "Past Sessions"

---

### Combat Flow (DM)

1. **Add to Initiative**
   - Characters: Auto-added when session starts
   - Monsters: DM clicks "Add Monster" → Selects monster → Creates instance
   - Expected: Entity appears in initiative list

2. **Roll Initiative**
   - Button: "Roll Initiative" (BECMI 1d6 system)
   - Expected: All entities get initiative values, list sorted

3. **Next Turn**
   - Button: "Next Turn"
   - Expected: Active turn indicator moves, round counter updates

4. **Update HP**
   - Characters: Click HP → Enter damage/healing → Update
   - Monsters: Click HP → Enter damage/healing → Update
   - Expected: HP updates in real-time for all participants

**States**:
- **No Initiative**: Empty list, "Roll Initiative" button
- **Initiative Set**: Sorted list, "Next Turn" button
- **Combat Active**: Current turn highlighted

---

## States

### Loading States
- **Spinner**: `<div class="loading-spinner">` with dice icon
- **Skeleton**: Placeholder content while loading (future enhancement)
- **Progress**: Progress bar for multi-step processes

### Empty States
- **No Characters**: "Create your first character" message with button
- **No Sessions**: "Create your first session" message with button
- **No Monsters**: "No monsters found" message with filter reset option

### Error States
- **Network Error**: "Connection failed. Please try again." with retry button
- **Validation Error**: Field-specific error messages below inputs
- **Permission Error**: "You don't have permission to perform this action"
- **Not Found**: "Character not found" with back button

### Success States
- **Toast Notification**: Green banner with success message (auto-dismisses after 3 seconds)
- **Confirmation**: Modal confirmation for destructive actions
- **Real-time Update**: Live updates without page refresh

---

## Accessibility

### Keyboard Navigation
- **Tab Order**: Logical flow through form fields and buttons
- **Enter Key**: Submits forms, activates buttons
- **Escape Key**: Closes modals
- **Arrow Keys**: Navigate dropdowns and lists

### Focus Management
- **Focus Trap**: Modals trap focus within modal
- **Focus Return**: Focus returns to trigger element when modal closes
- **Visible Focus**: All interactive elements have visible focus indicators

### Screen Reader Support
- **ARIA Labels**: Added to buttons and form inputs (ongoing improvement)
- **Semantic HTML**: Uses proper heading hierarchy (h1, h2, h3)
- **Alt Text**: All images have alt text
- **Live Regions**: Real-time updates announced to screen readers (future enhancement)

### Color Contrast
- **Text**: Meets WCAG AA standards (4.5:1 contrast ratio)
- **Interactive Elements**: Clear visual distinction for buttons and links

---

## Responsive Design

### Breakpoints
- **Mobile**: < 768px
- **Tablet**: 768px - 1024px
- **Desktop**: > 1024px

### Mobile Optimizations
- **Touch Targets**: Minimum 44x44px for buttons
- **Form Inputs**: Full-width on mobile
- **Navigation**: Collapsible menu on mobile
- **Tables**: Horizontal scroll on mobile

### Tablet Optimizations
- **Sidebar**: Collapsible sidebar
- **Grid Layouts**: 2-column grids on tablet
- **Modals**: Full-screen on mobile, centered on tablet+

---

## Real-Time Updates

### Long-Polling System
- **Endpoint**: `GET /api/realtime/poll.php`
- **Timeout**: 25 seconds
- **Events**: Character HP/XP updates, initiative changes, monster updates

### User Experience
- **Status Indicator**: "Live" / "Offline" indicator in header
- **Auto-Refresh**: DM dashboard auto-refreshes every 5 seconds (toggleable)
- **Manual Refresh**: "Refresh" button available

### Event Types
- `character_hp_updated` - Character HP changed
- `character_xp_updated` - Character XP changed
- `monster_hp_updated` - Monster HP changed
- `initiative_updated` - Initiative order changed
- `audio_control` - Audio playback control

---

## Form Validation

### Client-Side Validation
- **Real-time**: Validation on blur/change
- **Visual Feedback**: Red border on invalid fields
- **Error Messages**: Displayed below input fields

### Server-Side Validation
- **All inputs validated**: No trust in client-side validation
- **Error Response**: JSON with field-specific errors
- **Status Code**: 400 for validation errors

### Validation Rules
- **Character Name**: 1-50 characters, required
- **Ability Scores**: 3-18 range, required
- **Email**: Valid email format
- **Username**: 3-20 characters, alphanumeric + underscore
- **Password**: Minimum 8 characters, complexity requirements

---

## Error Handling

### User-Friendly Messages
- **Network Errors**: "Connection failed. Please check your internet connection."
- **Server Errors**: "Something went wrong. Please try again later."
- **Validation Errors**: Field-specific messages (e.g., "Character name is required")
- **Permission Errors**: "You don't have permission to perform this action"

### Error Recovery
- **Retry Buttons**: Available for failed operations
- **Auto-Retry**: Network requests retry 3 times with exponential backoff
- **State Preservation**: Form data preserved on validation errors

---

## Performance

### Loading Performance
- **Initial Load**: < 2 seconds (target)
- **Module Loading**: Lazy-loaded on demand
- **Image Loading**: Lazy loading for equipment images

### Interaction Performance
- **Button Clicks**: Immediate visual feedback (< 100ms)
- **Form Submissions**: Loading state shown immediately
- **Real-time Updates**: Non-blocking, updates in background

### Optimization
- **Event Delegation**: Used for dynamic content
- **Debouncing**: Search inputs debounced (300ms)
- **Batching**: Multiple updates batched where possible

---

## Browser Compatibility

### Supported Browsers
- **Chrome**: Latest 2 versions
- **Firefox**: Latest 2 versions
- **Edge**: Latest 2 versions
- **Safari**: Latest 2 versions

### Polyfills
- **Not Required**: Modern JavaScript (ES6+) used, no polyfills needed
- **jQuery**: Handles cross-browser compatibility

---

## Future Enhancements

### Planned
- Loading skeletons for all views
- Enhanced accessibility (ARIA labels, keyboard navigation)
- Mobile app (React Native)
- Progressive Web App (PWA) features

### Under Consideration
- Dark mode
- Customizable themes
- Advanced animations
- Voice commands

---

## References

- [Architecture Documentation](ARCHITECTURE.md)
- [API Documentation](API.md)
- [Code Review Report](../CODE_REVIEW_REPORT.md)
