# Forum System Documentation

## Overview

The BECMI VTT Forum System provides a complete community discussion platform with categories, threads, posts, advanced moderation features, and user roles. The system is inspired by BBforums with a full feature set including private forums, edit history tracking, search functionality, and comprehensive moderation tools.

## Features

### Core Features
- **Categories**: Organized forum categories with descriptions, privacy settings, and statistics
- **Threads**: Discussion threads with sticky, lock, and private options
- **Posts**: Rich text posts with edit history tracking
- **Search**: Full-text search across threads and posts
- **Subscriptions**: Thread subscription notifications
- **Moderation**: Comprehensive moderation tools for administrators

### User Roles

#### Regular Users
- Create threads and posts
- Edit own posts (with edit history)
- Subscribe to threads
- Search forum content
- View public categories and threads

#### Moderators
- All regular user permissions
- Create, edit, and delete categories
- Lock/unlock threads
- Sticky/unsticky threads
- Move threads between categories
- Merge threads
- Delete any thread or post
- Edit any post
- Ban/unban users
- View moderation queue
- Approve pending posts
- Access private categories and threads

## Database Schema

### Forum Tables

#### `forum_categories`
Stores forum categories with hierarchy support, privacy settings, and statistics.

#### `forum_threads`
Stores discussion threads with metadata (sticky, locked, private), view counts, and post counts.

#### `forum_posts`
Stores individual posts with content, edit tracking, and timestamps.

#### `forum_post_edits`
Tracks complete edit history for posts, including old content and edit reasons.

#### `forum_thread_subscriptions`
Manages user subscriptions to threads for notification purposes.

#### `forum_user_bans`
Tracks user bans with reasons and expiration dates.

#### `forum_post_attachments`
Reserved for future attachment functionality.

### User Extensions

The `users` table has been extended with:
- `is_moderator` - Boolean flag for moderator status
- `is_banned` - Boolean flag for ban status
- `ban_reason` - Text field for ban reason
- `ban_expires_at` - Datetime for temporary bans

## API Endpoints

### Categories (`/api/forum/categories/`)

- **GET `list.php`** - List all categories (respects private forums)
- **GET `get.php`** - Get single category with stats
- **POST `create.php`** - Create category (moderator only)
- **PUT `update.php`** - Update category (moderator only)
- **DELETE `delete.php`** - Delete category (moderator only)

### Threads (`/api/forum/threads/`)

- **GET `list.php`** - List threads in category (with pagination, sorting)
- **GET `get.php`** - Get single thread with posts
- **POST `create.php`** - Create new thread
- **PUT `update.php`** - Update thread (author or moderator)
- **DELETE `delete.php`** - Delete thread (author or moderator)
- **POST `lock.php`** - Lock/unlock thread (moderator only)
- **POST `sticky.php`** - Sticky/unsticky thread (moderator only)
- **POST `move.php`** - Move thread to different category (moderator only)
- **POST `merge.php`** - Merge two threads (moderator only)
- **POST `subscribe.php`** - Subscribe/unsubscribe to thread

### Posts (`/api/forum/posts/`)

- **GET `list.php`** - List posts in thread (with pagination)
- **GET `get.php`** - Get single post
- **POST `create.php`** - Create new post
- **PUT `update.php`** - Update post (author or moderator)
- **DELETE `delete.php`** - Delete post (author or moderator)
- **GET `edit-history.php`** - Get edit history for post

### Moderation (`/api/forum/moderation/`)

- **POST `ban-user.php`** - Ban/unban user (moderator only)
- **GET `queue.php`** - Get moderation queue (moderator only)
- **POST `approve-post.php`** - Approve pending post (moderator only)

### Search (`/api/forum/search/`)

- **GET `search.php`** - Search threads and posts with filters

## Frontend Modules

### Forum Module (`public/js/modules/forum.js`)

Main forum view with:
- Category listing
- Thread listing per category
- Search functionality
- Navigation between categories/threads
- BBforums-inspired layout

**Key Methods:**
- `render()` - Render main forum view
- `renderCategoryList()` - Display categories
- `renderThreadList(categoryId)` - Display threads in category
- `showSearchModal()` - Display search interface
- `handleSearch()` - Execute search query

### Thread View Module (`public/js/modules/forum-thread.js`)

Thread view with:
- Post display with pagination
- Post editor (create/edit)
- Thread actions (subscribe, edit, delete)
- Edit history viewing
- Thread moderation actions

**Key Methods:**
- `loadThread(threadId, page)` - Load thread with posts
- `renderThread()` - Render thread view
- `showCreateThreadModal(categoryId)` - Create new thread
- `showEditThreadModal()` - Edit thread
- `showCreatePostModal()` - Create new post
- `showEditPostModal(postId)` - Edit post
- `showEditHistory(postId)` - View edit history

### Moderation Module (`public/js/modules/forum-moderation.js`)

Moderation tools with:
- Moderation panel
- Category management
- Thread management (lock, sticky, move, merge)
- Post management (delete, edit)
- User ban interface
- Moderation queue

**Key Methods:**
- `renderModerationPanel()` - Display moderation interface
- `renderCategoriesList()` - Manage categories
- `showCreateCategoryModal()` - Create category
- `showEditCategoryModal(categoryId)` - Edit category
- `handleDeleteCategory(categoryId)` - Delete category
- `viewEditHistory(postId)` - View post edit history

## Accessing the Forum

### For Regular Users

1. Click "Forum" in the main navigation
2. Browse categories and threads
3. Click on a category to view threads
4. Click on a thread to view posts
5. Use the search icon to search the forum

### For Moderators

1. Access the **Moderation Panel** via:
   - User profile menu dropdown (top right)
   - "Moderation" button in forum header (when viewing forum)
2. Manage categories, threads, posts, and users
3. View moderation queue
4. Access private categories and threads

## User Profile Management

Users can edit their profile information:
1. Click on username in top right
2. Select "Edit Profile"
3. Update username, email, first name, last name
4. Save changes

## Creating Content

### Creating a Thread

1. Navigate to a category
2. Click "Create Thread" button
3. Enter thread title and first post content
4. (Moderators only) Check "Private Thread" if needed
5. Submit to create thread

### Creating a Post

1. Navigate to a thread
2. Scroll to bottom or click "Reply" button
3. Enter post content
4. Submit to create post

### Editing Posts

1. Click "Edit" button on your own post
2. Modify content
3. (Optional) Add edit reason
4. Save changes

**Note:** All edits are tracked in edit history, which can be viewed by clicking the edit history icon.

## Moderation Features

### Category Management

Moderators can:
- Create new categories
- Edit category name, description, and privacy settings
- Delete categories (with confirmation)

### Thread Management

Moderators can:
- Lock/unlock threads (prevents new posts)
- Sticky threads (pins to top of list)
- Move threads between categories
- Merge two threads together
- Delete any thread
- Edit any thread title

### Post Management

Moderators can:
- Delete any post
- Edit any post
- View complete edit history

### User Management

Moderators can:
- Ban users from the forum
- Set ban reasons
- Set temporary bans with expiration
- Unban users

## Search Functionality

The forum search supports:
- **Text Search**: Search in thread titles and post content
- **Type Filter**: Search all, threads only, or posts only
- **Category Filter**: Limit search to specific category
- **Results Display**: Shows matching threads and posts with previews

## Security

### Authentication
- All forum endpoints require authentication
- Banned users cannot access forum features

### Authorization
- Regular users can only edit/delete their own content
- Moderators have full access to all content
- Private categories are only visible to moderators

### Input Validation
- All user input is validated and sanitized
- CSRF protection on all state-changing operations
- SQL injection prevention via prepared statements

## Styling

The forum uses the BECMI VTT wood/parchment theme with:
- Category cards with icons and statistics
- Thread list with metadata
- Post display with user information
- Modals for forms and actions
- Responsive design for mobile devices

Styles are defined in `public/stylus/_forum.styl` and follow the established design system.

## Future Enhancements

### Planned Features
- **Attachments**: File upload support for posts
- **Rich Text Editor**: Enhanced formatting options
- **Notifications**: Email and push notifications for subscriptions
- **Advanced Search**: Full-text search with operators
- **User Profiles**: Public user profile pages
- **Reputation System**: User reputation and badges
- **Admin Panel**: Web interface for assigning moderator roles

### Technical Improvements
- Full-text search indexing
- Caching for frequently accessed content
- Real-time updates via WebSocket
- Image upload and hosting
- Markdown support

## Troubleshooting

### Common Issues

**Cannot create thread/post:**
- Check if you're logged in
- Verify you're not banned
- Check if thread is locked (moderators can still post)

**Cannot see category:**
- Category may be private (moderators only)
- Check your user permissions

**Edit history not showing:**
- Post may not have been edited yet
- Check permissions (author or moderator can view)

**Moderation panel not visible:**
- Verify you have moderator status (`is_moderator = 1` in database)
- Check browser console for errors

## Support

For issues or questions about the forum system:
1. Check this documentation
2. Review the API endpoint documentation
3. Check browser console for JavaScript errors
4. Review server logs for PHP errors

## Related Documentation

- [Forum Category Management](FORUM_CATEGORY_MANAGEMENT.md) - Detailed guide for managing categories
- [API Documentation](FUNCTION_DOCUMENTATION.md) - Complete API reference
- [Installation Guide](INSTALLATION.md) - System setup instructions
