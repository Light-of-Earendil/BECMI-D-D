# Forum Category Management Guide

## How to Create Categories as a Forum Admin

As a forum administrator (moderator), you can create and manage forum categories through the Moderation Panel.

### Step 1: Access the Moderation Panel

1. Click on your **username** in the top-right corner of the screen (next to the user icon)
2. In the dropdown menu, click **"Moderation Panel"** (this option only appears if you're a moderator)
3. Alternatively, you can access it from the Forum view by clicking the "Moderation" button (if visible)

**Note:** Only users with `is_moderator = 1` in the `users` table can access the moderation panel. The "Moderation Panel" link in the user menu will only be visible to moderators.

### Step 2: Create a New Category

1. In the Moderation Panel, find the **"Category Management"** section at the top
2. Click the **"Create Category"** button (green button with plus icon)
3. A modal will open with the category creation form

### Step 3: Fill in Category Details

The category creation form includes:

- **Category Name** (required): The name of the category (max 100 characters)
- **Description**: Optional description of what this category is for
- **Parent Category**: Optional - select a parent category to create a subcategory
- **Display Order**: Number to control the order categories appear (lower numbers appear first)
- **Private Category**: Checkbox - if checked, only moderators can see this category
- **Requires Permission**: Optional permission name (e.g., 'admin', 'dm') - future feature

### Step 4: Save the Category

Click the **"Create Category"** button at the bottom of the modal to save.

The category will immediately appear in the Category Management list and be available in the main forum view.

## Editing Categories

1. In the Moderation Panel, find the category you want to edit in the Category Management section
2. Click the **"Edit"** button next to the category
3. Modify the fields as needed
4. Click **"Update Category"** to save changes

## Deleting Categories

1. In the Moderation Panel, find the category you want to delete
2. Click the **"Delete"** button (red button with trash icon)
3. Confirm the deletion

**Important:** Categories with existing threads cannot be deleted. You must first move or delete all threads in the category.

## Setting Up Moderator Status

To make a user a moderator, update the database:

```sql
UPDATE users SET is_moderator = 1 WHERE user_id = <user_id>;
```

## API Endpoints

The category management uses these API endpoints:

- `GET /api/forum/categories/list.php` - List all categories
- `GET /api/forum/categories/get.php?category_id=X` - Get single category
- `POST /api/forum/categories/create.php` - Create category (moderator only)
- `PUT /api/forum/categories/update.php` - Update category (moderator only)
- `DELETE /api/forum/categories/delete.php?category_id=X` - Delete category (moderator only)

## Features

- **Hierarchical Categories**: Categories can have parent categories to create subcategories
- **Private Categories**: Categories can be marked as private (moderator-only)
- **Display Ordering**: Control the order categories appear using display_order
- **Permission System**: Future support for permission-based category access

## Troubleshooting

**"Access Denied" message:**
- Ensure your user account has `is_moderator = 1` in the database
- Check that you're logged in

**Cannot delete category:**
- The category must have 0 threads
- The category must have 0 child categories
- Move or delete threads first, then try again

**Category not appearing:**
- Check if it's marked as private (only moderators see private categories)
- Verify the category was created successfully (check database)
- Refresh the page