<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>BECMI D&D Character & Session Manager</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link rel="stylesheet" href="css/main.css?t=<?php echo time(); ?>">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
</head>
<body>
    <!-- Loading Screen -->
    <div id="loading-screen" class="loading-screen">
        <div class="loading-spinner">
            <i class="fas fa-dice-d20 fa-spin"></i>
            <p>Loading BECMI Manager...</p>
        </div>
    </div>

    <!-- Main Application Container -->
    <div id="app" class="app-container">
        <!-- Navigation Header -->
        <header class="app-header">
            <div class="header-content">
                <div class="logo">
                    <i class="fas fa-dice-d20"></i>
                    <h1>BECMI Manager</h1>
                </div>
                <nav class="main-nav">
                    <ul>
                        <li><a href="#" data-view="dashboard" class="nav-link active">Dashboard</a></li>
                        <li><a href="#" data-view="characters" class="nav-link">Characters</a></li>
                        <li><a href="#" data-view="equipment" class="nav-link">Equipment</a></li>
                        <li><a href="#" data-view="sessions" class="nav-link">Sessions</a></li>
                        <li><a href="#" data-view="calendar" class="nav-link">Calendar</a></li>
                        <li class="nav-dropdown">
                            <a href="#" class="nav-link">DM Tools <i class="fas fa-chevron-down"></i></a>
                            <ul class="dropdown-menu">
                                <li><a href="#" data-view="campaigns" class="nav-link">Campaigns</a></li>
                                <li><a href="#" data-view="hex-maps" class="nav-link">Hex Maps</a></li>
                            </ul>
                        </li>
                        <li><a href="#" data-view="forum" class="nav-link">Forum</a></li>
                    </ul>
                </nav>
                <div class="user-menu">
                    <div class="user-info">
                        <span id="user-name">Loading...</span>
                        <i class="fas fa-user-circle"></i>
                    </div>
                    <div class="user-dropdown">
                        <a href="#" id="edit-profile-link">
                            <i class="fas fa-user-edit"></i> Edit Profile
                        </a>
                        <a href="#" id="moderation-panel-link" style="display: none;">
                            <i class="fas fa-shield-alt"></i> Moderation Panel
                        </a>
                        <a href="#" id="logout-btn">Logout</a>
                    </div>
                </div>
            </div>
        </header>

        <!-- Main Content Area -->
        <main class="main-content">
            <div id="content-area" class="content-area">
                <!-- Dashboard View -->
                <div id="dashboard-view" class="view active">
                    <div class="view-header">
                        <h2>Dashboard</h2>
                        <p>Welcome to your BECMI Manager</p>
                    </div>
                    <div class="dashboard-content">
                        <div class="dashboard-stats">
                            <div class="stat-card">
                                <h3>Characters</h3>
                                <div class="stat-number" id="character-count">0</div>
                            </div>
                            <div class="stat-card">
                                <h3>Sessions</h3>
                                <div class="stat-number" id="session-count">0</div>
                            </div>
                            <div class="stat-card">
                                <h3>Upcoming</h3>
                                <div class="stat-number" id="upcoming-count">0</div>
                            </div>
                        </div>
                        <div class="dashboard-actions">
                            <button class="btn btn-primary" id="create-character-btn">
                                <i class="fas fa-plus"></i> Create Character
                            </button>
                            <button class="btn btn-secondary" id="create-session-btn">
                                <i class="fas fa-calendar-plus"></i> Create Session
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Characters View -->
                <div id="characters-view" class="view">
                    <div class="view-header">
                        <h2>Characters</h2>
                        <button class="btn btn-primary" id="create-character-btn-2">
                            <i class="fas fa-plus"></i> Create Character
                        </button>
                    </div>
                    <div class="characters-content">
                        <div id="characters-list" class="characters-list">
                            <!-- Characters will be loaded here -->
                        </div>
                    </div>
                </div>

                <!-- Sessions View -->
                <div id="sessions-view" class="view">
                    <div class="view-header">
                        <h2>Sessions</h2>
                        <button class="btn btn-primary" id="create-session-btn-2">
                            <i class="fas fa-calendar-plus"></i> Create Session
                        </button>
                    </div>
                    <div class="sessions-content">
                        <div id="sessions-list" class="sessions-list">
                            <!-- Sessions will be loaded here -->
                        </div>
                    </div>
                </div>

                <!-- Calendar View -->
                <div id="calendar-view" class="view">
                    <div class="view-header">
                        <h2>Calendar</h2>
                    </div>
                    <div class="calendar-content">
                        <div id="calendar" class="calendar">
                            <!-- Calendar will be loaded here -->
                        </div>
                    </div>
                </div>
            </div>
        </main>

        <!-- Footer -->
        <footer class="app-footer">
            <p>&copy; 2026 BECMI Manager. Built for the Basic, Expert, Companion, Master, and Immortal ruleset.</p>
        </footer>
    </div>

    <!-- Login Modal -->
    <div id="login-modal" class="modal">
        <div class="modal-content">
            <div class="modal-header">
                <h2>Welcome to BECMI Manager</h2>
                <p>Please log in to continue</p>
            </div>
            <div class="modal__inner">
                <form id="login-form" class="auth-form">
                    <div class="form-group">
                        <label for="username">Username or Email:</label>
                        <input type="text" id="username" name="username" required>
                    </div>
                    <div class="form-group">
                        <label for="password">Password:</label>
                        <div class="password-input-wrapper">
                            <input type="password" id="password" name="password" required>
                            <button type="button" class="password-toggle-btn" aria-label="Show password">
                                <i class="fas fa-eye"></i>
                            </button>
                        </div>
                    </div>
                    <div class="form-actions">
                        <button type="submit" class="btn btn-primary">Login</button>
                        <button type="button" id="show-register" class="btn btn-secondary">Register</button>
                    </div>
                    <div class="form-footnote">
                        <button type="button" id="show-forgot-password" class="link-button">Forgot password?</button>
                    </div>
                </form>
            </div>
        </div>
    </div>

    <!-- Registration Modal -->
    <div id="register-modal" class="modal">
        <div class="modal-content">
            <div class="modal-header">
                <h2>Create New Account</h2>
                <p>Join the BECMI Manager</p>
            </div>
            <div class="modal__inner">
                <form id="register-form" class="auth-form">
                    <div class="form-group">
                        <label for="reg-username">Username:</label>
                        <input type="text" id="reg-username" name="username" required>
                    </div>
                    <div class="form-group">
                        <label for="reg-email">Email:</label>
                        <input type="email" id="reg-email" name="email" required>
                    </div>
                    <div class="form-group">
                        <label for="reg-password">Password:</label>
                        <div class="password-input-wrapper">
                            <input type="password" id="reg-password" name="password" required>
                            <button type="button" class="password-toggle-btn" aria-label="Show password">
                                <i class="fas fa-eye"></i>
                            </button>
                        </div>
                    </div>
                    <div class="form-group">
                        <label for="reg-confirm-password">Confirm Password:</label>
                        <div class="password-input-wrapper">
                            <input type="password" id="reg-confirm-password" name="confirm_password" required>
                            <button type="button" class="password-toggle-btn" aria-label="Show password">
                                <i class="fas fa-eye"></i>
                            </button>
                        </div>
                    </div>
                    <div class="form-actions">
                        <button type="submit" class="btn btn-primary">Register</button>
                        <button type="button" id="show-login" class="btn btn-secondary">Back to Login</button>
                    </div>
                </form>
            </div>
        </div>
    </div>

    <!-- Forgot Password Modal -->
    <div id="forgot-password-modal" class="modal">
        <div class="modal-content">
            <div class="modal-header">
                <h2>Forgot Your Password?</h2>
                <p>Enter your email and we will send a reset link.</p>
            </div>
            <div class="modal__inner">
                <form id="forgot-password-form" class="auth-form">
                    <div class="form-group">
                        <label for="forgot-email">Email:</label>
                        <input type="email" id="forgot-email" name="email" required>
                    </div>
                    <div class="form-actions">
                        <button type="submit" class="btn btn-primary">Send Reset Link</button>
                        <button type="button" id="back-to-login-from-forgot" class="btn btn-secondary">Back to Login</button>
                    </div>
                </form>
            </div>
        </div>
    </div>

    <!-- Password Reset Modal -->
    <div id="password-reset-modal" class="modal">
        <div class="modal-content">
            <div class="modal-header">
                <h2>Reset Your Password</h2>
                <p>Enter the code from your email along with your new password.</p>
            </div>
            <div class="modal__inner">
                <form id="password-reset-form" class="auth-form">
                    <div class="form-group">
                        <label for="reset-selector">Reset Selector:</label>
                        <input type="text" id="reset-selector" name="selector" required>
                    </div>
                    <div class="form-group">
                        <label for="reset-token">Reset Token:</label>
                        <input type="text" id="reset-token" name="token" required>
                    </div>
                    <div class="form-group">
                        <label for="reset-password">New Password:</label>
                        <input type="password" id="reset-password" name="password" required>
                    </div>
                    <div class="form-group">
                        <label for="reset-confirm-password">Confirm New Password:</label>
                        <input type="password" id="reset-confirm-password" name="confirm_password" required>
                    </div>
                    <div class="form-actions">
                        <button type="submit" class="btn btn-primary">Update Password</button>
                        <button type="button" id="back-to-login-from-reset" class="btn btn-secondary">Back to Login</button>
                    </div>
                </form>
            </div>
        </div>
    </div>
    <!-- Character Creation Modal -->
    <div id="character-creation-modal" class="modal">
        <div class="modal-content character-creation">
            <div class="modal-header">
                <h2>Create New Character</h2>
                <p>Follow the BECMI character creation process</p>
            </div>
            <div id="character-creation-content">
                <!-- Character creation wizard will be loaded here -->
            </div>
        </div>
    </div>

    <!-- Session Creation Modal -->
    <div id="session-creation-modal" class="modal">
        <div class="modal-content session-creation">
            <div class="modal-header">
                <h2>Create New Session</h2>
                <p>Set up a new game session</p>
            </div>
            <div id="session-creation-content">
                <!-- Session creation form will be loaded here -->
            </div>
        </div>
    </div>

    <!-- Character Edit Modal -->
    <div id="character-edit-modal" class="modal">
        <div class="modal-content character-edit">
            <div class="modal-header">
                <h2>Edit Character</h2>
                <p>Update your character's information</p>
            </div>
            <div id="character-edit-content">
                <!-- Character edit form will be loaded here -->
            </div>
        </div>
    </div>

    <!-- Notification Container -->
    <div id="notifications" class="notifications-container"></div>

    <!-- JavaScript Libraries -->
    <script src="https://code.jquery.com/jquery-3.7.1.min.js"></script>
    <!-- BECMI Rules Engine must be loaded before app.js -->
    <script src="js/core/utils.js?t=<?php echo time(); ?>"></script>
    <script src="js/becmi/rules-engine.js?t=<?php echo time(); ?>"></script>
    <script src="js/becmi/calculations.js?t=<?php echo time(); ?>"></script>
    <script src="js/becmi/class-data.js?t=<?php echo time(); ?>"></script>
    <script src="js/core/app.js?t=<?php echo time(); ?>"></script>
    <script src="js/core/api-client.js?t=<?php echo time(); ?>"></script>
    <script src="js/core/state-manager.js?t=<?php echo time(); ?>"></script>
    <script src="js/core/event-bus.js?t=<?php echo time(); ?>"></script>
    <script src="js/core/realtime-client.js?t=<?php echo time(); ?>"></script>
    <script src="js/core/notification-manager.js?t=<?php echo time(); ?>"></script>
    <script src="js/core/error-handler.js?t=<?php echo time(); ?>"></script>
    <script src="js/core/offline-detector.js?t=<?php echo time(); ?>"></script>
    <script src="js/modules/auth.js?t=<?php echo time(); ?>"></script>
    <script src="js/modules/dashboard.js?t=<?php echo time(); ?>"></script>
    <script src="js/modules/character-sheet.js?t=<?php echo time(); ?>"></script>
    <script src="js/modules/character-creation.js?v=2&t=<?php echo time(); ?>"></script>
    <script src="js/modules/character-creation-gold.js?t=<?php echo time(); ?>"></script>
    <script src="js/modules/character-creation-equipment.js?t=<?php echo time(); ?>"></script>
    <script src="js/modules/session-management.js?t=<?php echo time(); ?>"></script>
    <script src="js/modules/dm-dashboard.js?t=<?php echo time(); ?>"></script>
    <script src="js/modules/level-up-wizard.js?t=<?php echo time(); ?>"></script>
    <script src="js/modules/monster-browser.js?t=<?php echo time(); ?>"></script>
    <script src="js/modules/calendar.js?t=<?php echo time(); ?>"></script>
    <script src="js/modules/notifications.js?t=<?php echo time(); ?>"></script>
    <script src="js/modules/equipment.js?t=<?php echo time(); ?>"></script>
    <script src="js/modules/hex-map-editor.js?t=<?php echo time(); ?>"></script>
    <script src="js/modules/hex-map-play.js?t=<?php echo time(); ?>"></script>
    <script src="js/modules/campaign-management.js?t=<?php echo time(); ?>"></script>
    <script src="js/modules/forum.js?t=<?php echo time(); ?>"></script>
    <script src="js/modules/forum-thread.js?t=<?php echo time(); ?>"></script>
    <script src="js/modules/forum-moderation.js?t=<?php echo time(); ?>"></script>
    <script src="js/modules/session-map-scratchpad.js?t=<?php echo time(); ?>"></script>
    <script src="js/modules/audio-manager.js?t=<?php echo time(); ?>"></script>
    <script src="js/main.js?t=<?php echo time(); ?>"></script>
</body>
</html>
