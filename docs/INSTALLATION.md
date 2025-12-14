# BECMI D&D Character Manager - Installation Guide

## Prerequisites

- XAMPP (Apache, MySQL, PHP 8.x)
- Windows 10/11
- Modern web browser (Chrome, Firefox, Edge)

## Installation Steps

### 1. Download and Install XAMPP

1. Download XAMPP from https://www.apachefriends.org/
2. Install XAMPP to `C:\xampp\`
3. Start Apache and MySQL services from XAMPP Control Panel

### 2. Setup Project Directory

1. Create project directory: `C:\xampp\htdocs\becmi-vtt\`
2. Copy all project files to this directory
3. Ensure the directory structure matches:
   ```
   C:\xampp\htdocs\becmi-vtt\
   ├── public/
   │   ├── index.html
   │   ├── css/
   │   └── js/
   ├── api/
   ├── app/
   ├── database/
   └── config/
   ```

### 3. Configure Virtual Host (Recommended)

1. Open `C:\xampp\apache\conf\httpd.conf`
2. Uncomment the line: `Include conf/extra/httpd-vhosts.conf`
3. Open `C:\xampp\apache\conf\extra\httpd-vhosts.conf`
4. Add the following virtual host configuration:
   ```apache
   <VirtualHost *:80>
       DocumentRoot "C:/xampp/htdocs/becmi-vtt/public"
       ServerName becmi.local
       <Directory "C:/xampp/htdocs/becmi-vtt/public">
           AllowOverride All
           Require all granted
       </Directory>
   </VirtualHost>
   ```
5. Open `C:\Windows\System32\drivers\etc\hosts` as Administrator
6. Add the line: `127.0.0.1 becmi.local`
7. Restart Apache service

### 4. Setup Database

1. Open phpMyAdmin: http://localhost/phpmyadmin
2. Create a new database named `becmi_vtt`
3. Import the database schema:
   - Click "Import" tab
   - Choose file: `database/schema.sql`
   - Click "Go"

### 5. Configure Database Connection

1. Edit `config/database.php` if needed
2. Default XAMPP settings should work:
   - Host: localhost
   - Username: root
   - Password: (empty)
   - Database: becmi_vtt

### 6. Set File Permissions

1. Ensure Apache has read/write access to the project directory
2. Set permissions for uploads directory (if needed):
   - Right-click project folder → Properties → Security
   - Add "Everyone" with "Full control"

### 7. Test Installation

1. Open browser and navigate to:
   - http://localhost/becmi-vtt/public/ (if using document root)
   - http://becmi.local/ (if using virtual host)
2. You should see the BECMI Manager login page
3. Create a test account to verify functionality

## Troubleshooting

### Common Issues

**Apache won't start:**
- Check if port 80 is in use by another application
- Change port in `httpd.conf` if needed

**MySQL connection failed:**
- Ensure MySQL service is running in XAMPP Control Panel
- Check username/password in `config/database.php`
- Verify database `becmi_vtt` exists

**Virtual host not working:**
- Ensure `httpd-vhosts.conf` is included in `httpd.conf`
- Check hosts file has correct entry
- Restart Apache after changes

**JavaScript errors:**
- Check browser console for errors
- Ensure all JS files are loading correctly
- Verify jQuery is loaded before other scripts

**CSS not loading:**
- Check file paths in HTML
- Ensure CSS files exist in correct locations
- Clear browser cache

### Log Files

- Apache error log: `C:\xampp\apache\logs\error.log`
- PHP error log: `C:\xampp\php\logs\php_error_log`
- Application logs: Check browser console and PHP error logs

### Performance Optimization

1. Enable PHP OPcache in `php.ini`:
   ```ini
   opcache.enable=1
   opcache.memory_consumption=128
   opcache.max_accelerated_files=4000
   ```

2. Enable Apache compression in `httpd.conf`:
   ```apache
   LoadModule deflate_module modules/mod_deflate.so
   <Location />
       SetOutputFilter DEFLATE
       SetEnvIfNoCase Request_URI \
           \.(?:gif|jpe?g|png)$ no-gzip dont-vary
       SetEnvIfNoCase Request_URI \
           \.(?:exe|t?gz|zip|bz2|sit|rar)$ no-gzip dont-vary
   </Location>
   ```

## Development Setup

### Using Prepros (Recommended)

1. Install Prepros from https://prepros.io/
2. Add project folder to Prepros
3. Configure compilation:
   - Stylus → CSS compilation
   - JavaScript minification
   - Auto-refresh browser on changes

### Manual Development

1. Edit files directly in the project directory
2. Refresh browser to see changes
3. Use browser developer tools for debugging

## Production Deployment

### Security Considerations

1. Change default database password
2. Set proper file permissions
3. Enable HTTPS in production
4. Configure proper error handling
5. Set up regular database backups

### Backup Strategy

1. Database backup:
   ```bash
   mysqldump -u root -p becmi_vtt > backup_$(date +%Y%m%d).sql
   ```

2. File backup:
   - Copy entire project directory
   - Include uploaded files and customizations

### Monitoring

1. Monitor Apache and MySQL logs
2. Set up error reporting
3. Track application performance
4. Regular security updates

## Support

For issues and questions:
1. Check this documentation
2. Review error logs
3. Check browser console for JavaScript errors
4. Verify all prerequisites are met
5. Test with a fresh XAMPP installation if needed
