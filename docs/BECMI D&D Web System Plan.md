

# **Project Blueprint: A Web-Based Companion for D\&D BECMI**

## **Executive Summary**

This document outlines a comprehensive technical and strategic plan for the development of a bespoke web-based application designed to facilitate the playing of Dungeons & Dragons, specifically adhering to the Basic, Expert, Companion, Masters, and Immortals (BECMI) ruleset as consolidated in the 1991 Rules Cyclopedia. The primary objective is to create a digital platform where players can create, manage, and dynamically update their characters throughout a campaign, while the Dungeon Master (DM) can oversee the party and utilize integrated tools to streamline gameplay.

The proposed system will be developed using a "vanilla" PHP backend without the use of the Composer dependency manager, coupled with a jQuery-powered front-end for user interactivity. This plan meticulously accounts for all specified core features, including the integration of ten specific optional rule modules from the Rules Cyclopedia, and provides a phased roadmap for future expansion into a full-fledged virtual tabletop (VTT). The architecture emphasizes security, data integrity, and a seamless user experience, providing a robust foundation for a long-term gaming utility.

---

## **I. Foundational Architecture and Technical Stack**

The success of this project hinges on a well-conceived foundational structure. Given the constraint of avoiding modern dependency management tools like Composer, a deliberate and disciplined approach to file organization, database design, and core service implementation is paramount. This architecture is designed for security, maintainability, and scalability.

### **A. Project and File Structure**

A logical file structure is the first line of defense for security and the primary tool for ensuring code maintainability. The core principle is the strict separation of concerns: application logic (PHP), presentation (HTML/CSS), and client-side behavior (JavaScript) will be isolated.1 Furthermore, only files intended for direct browser access will be placed in a public-facing directory.

**Proposed Directory Layout:**

* / (Project Root): This directory will house non-public configuration and project metadata.  
* /config/: Contains sensitive configuration files, most notably database.php, which will store MySQL credentials. Placing this outside the public root prevents web server misconfigurations from exposing credentials.3  
* /src/: This is the heart of the application, containing all PHP classes, functions, and business logic. It will be organized by domain:  
  * /src/Database/: Code for database connectivity and interaction.  
  * /src/Character/: Classes and functions related to character creation, modification, and data retrieval.  
  * /src/Rules/: A critical directory containing individual PHP files for each of the ten specified optional rules (e.g., WeaponMastery.php, Morale.php).  
  * /src/Core/: Core application services like session management and authentication.  
* /includes/ or /templates/: This directory will store reusable HTML fragments such as headers, footers, and navigation bars. This modular approach avoids code duplication and simplifies updates to the site's layout.  
* /public/: The web server's document root. This is the only directory that should be accessible via a web browser.  
  * index.php: The main application entry point, which will act as a router for different pages (login, character sheet, etc.).  
  * /css/: Stylesheets for the application.  
  * /js/: Custom JavaScript files and third-party libraries.  
    * /js/vendor/: Manually downloaded copies of jQuery and jQuery UI will be placed here.4  
  * /images/: Static images for the UI, map backgrounds, and tokens.  
  * ajax\_handler.php: A single, dedicated endpoint for all asynchronous requests from the front-end.5

A central bootstrap.php file will be created within the /src/ directory. Every user-facing script in /public/ will begin by including this file. It will handle critical startup tasks: initializing sessions, establishing the database connection, and including necessary function libraries, thereby creating a consistent and reliable application environment without relying on an autoloader.7

### **B. Database Schema Design**

The database will serve as the digital representation of both the static rules of the game and the dynamic state of the campaign. A crucial architectural decision is to separate these two types of data to ensure efficiency and data integrity. Storing canonical game rules (like a weapon's damage) alongside character-specific data (like a character's current hit points) would lead to massive redundancy and make rule updates nearly impossible. Therefore, the schema is divided into **Rule Tables** (static reference data from the Rules Cyclopedia) and **State Tables** (dynamic character and campaign data).

The following schema is proposed to support all requested features, including the complex optional rules.

**Table 1: Definitive Database Schema**

| Table Name | Column Name | Data Type | Constraints | Description |
| :---- | :---- | :---- | :---- | :---- |
| **users** | user\_id | INT | PK, AI | Unique identifier for each user. |
|  | username | VARCHAR(50) | UNIQUE, NOT NULL | User's login name. |
|  | password\_hash | VARCHAR(255) | NOT NULL | Hashed password for security. |
|  | user\_role | ENUM('player', 'dm') | NOT NULL | Determines user permissions. |
| **characters** | character\_id | INT | PK, AI | Unique identifier for each character. |
|  | user\_id | INT | FK to users.user\_id | Links the character to a player account. |
|  | name | VARCHAR(100) |  | Character's name. |
|  | class\_id | INT | FK to classes.class\_id | Foreign key for character class. |
|  | level | INT | DEFAULT 1 | Character's experience level. |
|  | xp | INT | DEFAULT 0 | Current experience points. |
|  | hp\_max | INT |  | Maximum hit points. |
|  | hp\_current | INT |  | Current hit points. |
|  | hp\_nonlethal | INT | DEFAULT 0 | Tracks nonlethal damage separately. |
|  | ac | INT |  | Calculated Armor Class. |
|  | strength, intelligence, etc. | TINYINT |  | The six ability scores (3-18). |
|  | money\_gp | INT | DEFAULT 0 | Gold pieces. |
|  | alignment | ENUM('Law', 'Neutrality', 'Chaos') |  | Character's alignment. |
|  | current\_movement\_rate | INT |  | Movement rate in feet/turn, adjusted for encumbrance. |
|  | weapon\_choices\_available | INT | DEFAULT 0 | For Weapon Mastery system. |
|  | skill\_slots\_available | INT | DEFAULT 0 | For General Skills system. |
| **items** | item\_id | INT | PK, AI | Unique ID for every piece of equipment. |
|  | name | VARCHAR(100) | UNIQUE | Item name (e.g., "Long Sword"). |
|  | cost\_gp | DECIMAL(10,2) |  | Cost in gold pieces. |
|  | weight\_cn | INT |  | Weight in coin (cn) units. |
|  | damage\_dice | VARCHAR(10) |  | Damage expression (e.g., "1d8"). |
|  | item\_type | ENUM('weapon', 'armor', 'gear') |  | Item category. |
|  | barding\_cost\_mult | DECIMAL(3,1) | DEFAULT 4.0 | Barding cost multiplier. |
|  | barding\_weight\_mult | DECIMAL(3,1) | DEFAULT 2.0 | Barding weight multiplier. |
| **character\_inventory** | inventory\_id | INT | PK, AI | Unique ID for this inventory entry. |
|  | character\_id | INT | FK to characters.character\_id | Links item to a character. |
|  | item\_id | INT | FK to items.item\_id | Links to the specific item. |
|  | quantity | INT | DEFAULT 1 | Number of this item owned. |
| **classes** | class\_id | INT | PK, AI | Unique ID for each class. |
|  | class\_name | VARCHAR(50) | UNIQUE | e.g., "Fighter", "Dwarf". |
|  | hit\_dice | VARCHAR(5) |  | e.g., "1d8". |
|  | prime\_requisite | VARCHAR(20) |  | e.g., "Strength". |
| **skills** | skill\_id | INT | PK, AI | Unique ID for each General Skill. |
|  | skill\_name | VARCHAR(100) | UNIQUE | Name of the skill (e.g., "Hunting"). |
|  | governing\_attribute | VARCHAR(20) |  | e.g., "Wisdom". |
| **character\_skills** | character\_skill\_id | INT | PK, AI |  |
|  | character\_id | INT | FK to characters.character\_id | Links skill to a character. |
|  | skill\_id | INT | FK to skills.skill\_id | Links to the specific skill. |
| **weapon\_mastery\_ranks** | rank\_id | INT | PK, AI |  |
|  | rank\_name | VARCHAR(20) | UNIQUE | "Basic", "Skilled", "Expert", etc. |
| **character\_weapon\_mastery** | cwm\_id | INT | PK, AI |  |
|  | character\_id | INT | FK to characters.character\_id | Links mastery to a character. |
|  | item\_id | INT | FK to items.item\_id | The specific weapon being mastered. |
|  | rank\_id | INT | FK to weapon\_mastery\_ranks.rank\_id | The character's current rank. |
| **map\_tokens** | token\_id | INT | PK, AI | Unique ID for a token on a map. |
|  | map\_id | INT |  | Identifier for a specific map. |
|  | character\_id | INT | FK to characters.character\_id | Links token to a character (or monster). |
|  | x\_pos | INT |  | X-coordinate on the grid. |
|  | y\_pos | INT |  | Y-coordinate on the grid. |

### **C. Core Application Services**

To support the application's logic, a set of core PHP services will be developed.

* **Database Service:** A file, src/Database/Connection.php, will contain a class or function to handle the MySQLi database connection. It will implement the singleton pattern to ensure that only one connection is established per page load, which is crucial for performance and resource management.8 All database credentials will be securely loaded from the /config/ directory, never hard-coded in scripts.9  
* **Session Service:** A src/Core/Session.php file will manage all aspects of user sessions. It will be responsible for starting sessions, setting user data upon login (user ID, role), checking authentication status on protected pages, and handling logout procedures.  
* **AJAX Handler:** A single PHP file, /public/ajax\_handler.php, will serve as the gateway for all client-side AJAX requests. This centralized approach enhances security and simplifies debugging. The script will inspect a $\_POST\['action'\] or $\_GET\['action'\] parameter to determine which function to execute (e.g., 'update\_hp', 'move\_token'). A switch statement will route the request to the appropriate function within the /src/ directory, which will then process the data, interact with the database, and echo a JSON-encoded response back to the client.5

---

## **II. The Character Engine: User Interface and Management**

This module forms the primary user-facing component of the application. It must provide an intuitive interface for players to engage with the complex rules of character creation and management, and a simple, powerful view for the DM.

### **A. User Authentication and Role-Based Dashboards**

The application will feature a secure login system. A login form will submit credentials to a PHP script that validates them against the users table. Upon successful authentication, session variables will be set, and the user will be redirected to a dashboard tailored to their role.

* **Player Dashboard:** This view will display a list of the logged-in player's characters. From here, they can choose to view/edit a character sheet or begin the character creation process.  
* **DM Dashboard:** This view will provide the Dungeon Master with a list of all characters in the campaign, belonging to all players. Clicking on a character will open their sheet in a read-only mode, allowing the DM to quickly reference stats, inventory, and other details during play.

### **B. The Character Creation Gauntlet**

This feature will guide players through the 12-step character creation process outlined in the Rules Cyclopedia.11 It will be implemented as a multi-page web form to avoid overwhelming the user.

1. **Ability Scores:** The user clicks a button, and the PHP backend rolls 3d6 six times, displaying the results.  
2. **Class Selection & Adjustment:** The system displays a list of available character classes, dynamically filtering out classes for which the character does not meet the minimum ability score requirements (e.g., a Dwarf requires a Constitution of 9 or more).11 Once a class is selected, the system identifies the Prime Requisite(s). The UI will then unlock, allowing the player to trade points from non-essential ability scores to their Prime Requisite. jQuery will enforce the rules client-side: a 2-for-1 trade ratio, and no ability score may be lowered below 9\.  
3. **Hit Points & Money:** Further server-side rolls determine starting HP (based on class Hit Dice) and money ( gp), with the system automatically applying any Constitution bonus to the HP roll.11  
4. **Equipment Purchase:** This will be a dynamic "shop" interface. The page will use AJAX to fetch all available items from the items database table and display them in categorized lists (Weapons, Armor, Adventuring Gear). As the player adds items to their virtual cart, jQuery will update a running total of the cost and total weight (in cn). The "Checkout" button will be disabled if the total cost exceeds the player's starting gold. Upon successful purchase, the selected items are inserted into the character\_inventory table.  
5. **Final Details:** Subsequent steps will collect the remaining information: alignment, name, personality, etc. The system will automatically calculate derived stats like Armor Class (from armor, shield, and Dexterity bonus) and THAC0 (based on class and level 1).11

### **C. The Interactive Character Sheet**

The character sheet is the application's centerpiece during gameplay. The user's request to "continuously correct their character sheets while we play" necessitates a dynamic, responsive interface that avoids disruptive full-page reloads. This is achieved through extensive use of jQuery and AJAX.

The character sheet will be a single page (character.php) that displays all character information. Key mutable stats like current HP, spell slots, ammunition counts, and money will be presented in editable input fields or controlled by simple \+ and \- buttons.

jQuery event handlers will be bound to these interactive elements. When a player changes their HP, for instance, the .on('change',...) event for that input field is triggered. This event handler immediately packages the new data (e.g., character\_id, field: 'hp\_current', value: new\_hp) and sends it to the ajax\_handler.php endpoint via a $.ajax() POST request.5 The PHP backend validates the data, updates the corresponding record in the characters table, and returns a JSON object like {"status": "success"}. This ensures that the character's state is always saved to the database in near real-time, providing a seamless experience for the players and an always-up-to-date view for the DM.

---

## **III. The Rules Cyclopedia Engine: Backend Logic**

This is the most intricate component of the project, requiring the precise translation of the BECMI game mechanics, including all ten specified optional rules, into executable PHP code. Each rule will be encapsulated in its own module for clarity and maintainability.

**Table 2: BECMI Rules Implementation Matrix**

| Rule Name | RC Page | Core Mechanic | Affected DB Tables | Key PHP Functions |
| :---- | :---- | :---- | :---- | :---- |
| **Unarmed Combat** | p. 110 | Implement Striking and Wrestling ratings/maneuvers. | characters | calculateWrestlingRating(), resolveStrike() |
| **Two Weapons Combat** | p. 110 | Apply attack roll penalties (e.g., \-4 off-hand) during combat calculations. | character\_inventory | calculateAttackRoll() |
| **Morale** | p. 102 | DM-facing tool to roll 2d6 vs. monster morale score, applying situational modifiers. | monsters (new table) | checkMorale() |
| **Weapon Mastery** | p. 75 | Track weapon choices, manage training, apply significant bonuses to attack/damage. | characters, character\_weapon\_mastery | calculateMasteryBonus(), processTraining() |
| **General Skills** | p. 81 | Manage skill slots and perform skill checks (1d20 vs. ability score). | characters, character\_skills | performSkillCheck() |
| **Nonlethal Combat** | p. 267 | Track 1/4 of damage as "actual" and 3/4 as "nonlethal," triggering unconsciousness. | characters (hp\_nonlethal column) | applyDamage() |
| **Ability Scores & Saving Throws** | p. 266 | Apply ability score modifiers to additional saving throw categories. | characters, classes | calculateSavingThrows() |
| **Keeping Characters Alive** | p. 267 | At 0 HP, character is unconscious and must make periodic saving throws vs. death. | characters | checkDeathSave() |
| **Load (Encumbrance)** | p. 88 | Sum total item weight (cn) and adjust character movement rate based on thresholds. | characters, character\_inventory, items | updateEncumbrance() |
| **Barding Multiplier** | p. 68 | Apply x4 cost and x2 weight multipliers when purchasing armor for mounts. | items, character\_inventory | calculateItemCost() |

A key function, updateEncumbrance(), will be central to the gameplay loop. Every time a character's inventory is modified (adding or dropping items via AJAX), this function will be triggered on the server. It will query the character\_inventory table, join with the items table to sum the weight\_cn of all items, compare this total against the fixed thresholds from the Rules Cyclopedia 11, and update the current\_movement\_rate field in the characters table. The new movement rate will be returned to the client to instantly update the character sheet, ensuring that the strategic consequences of carrying treasure are always visible.

---

## **IV. Phase Two Development: The Virtual Tabletop (VTT)**

Once the core character management and rules engine are stable, development can proceed to the VTT module. This will provide a visual, tactical interface for combat and exploration.

### **A. The Map Canvas and Grid**

A new page, map.php, will serve as the VTT interface. The DM will have a simple form to upload a map image. This image will be set as the CSS background-image of a main container div. A square grid will be overlaid on this map, which can be implemented as a repeating transparent PNG image or by dynamically generating a grid of bordered div elements with PHP.

### **B. Interactive Tokens**

Player and monster tokens will be represented by \<img\> elements positioned absolutely within the map container. Their positions (x and y grid coordinates) will be stored in the map\_tokens database table.

Movement will be handled by the jQuery UI Draggable library.13 Each token element will be initialized as a draggable object with the grid option enabled, which forces the token to snap to the grid's coordinates during and after being dragged. An example initialization would be: $('.token').draggable({ grid: });, assuming a 50x50 pixel grid cell size.15

### **C. Real-Time State Synchronization**

To ensure all players and the DM see the same map state, a simple and robust polling mechanism will be used.

1. **Player Action:** When a player moves their token, the jQuery UI Draggable stop event is triggered.  
2. **Update Server:** The event handler captures the token's new coordinates and sends them to ajax\_handler.php via an AJAX POST request (e.g., with action: 'move\_token'). The PHP script updates the token's position in the map\_tokens table.  
3. **Client Polling:** On every client's machine (all players and the DM), a JavaScript setInterval() function runs every few seconds (e.g., 2-3 seconds).  
4. **Fetch State:** This function sends an AJAX GET request to ajax\_handler.php (e.g., with action: 'get\_map\_state').  
5. **Update Display:** The server responds with a JSON object containing the current coordinates of all tokens on the map. The client-side JavaScript then iterates through this data and updates the CSS top and left properties for any tokens whose positions have changed. This creates a near-real-time shared experience that is reliable and fits within the specified technology stack.

---

## **V. Strategic Development Roadmap**

A phased development approach is recommended to manage the project's complexity and deliver functional milestones incrementally.

* **Phase 1: Foundation & Core Character Management**  
  * **Tasks:** Establish the project structure, design and build the database schema, implement the user authentication system, and build the complete character creation and static character sheet viewing modules.  
  * **Milestone Goal:** Players can successfully create fully compliant BECMI characters, and the DM can log in to view them.  
* **Phase 2: The Rules Engine & Interactivity**  
  * **Tasks:** Implement the AJAX-powered interactive features on the character sheet. Systematically code, integrate, and test the backend logic for all ten specified optional rules, using the Rules Implementation Matrix as a guide.  
  * **Milestone Goal:** The application fully supports and enforces the specified BECMI ruleset during live gameplay, with character sheets updating dynamically.  
* **Phase 3: The Virtual Tabletop**  
  * **Tasks:** Develop the map and grid interface. Integrate the jQuery UI Draggable library for token movement. Build the AJAX polling system for real-time map synchronization.  
  * **Milestone Goal:** The group has a functional, shared, interactive map for resolving tactical encounters.

## **Conclusion**

The plan detailed in this document provides a complete and robust blueprint for developing the requested D\&D BECMI web application. By adhering to a secure and maintainable project structure, implementing a normalized database schema that intelligently separates static rules from dynamic data, and leveraging the power of AJAX for a responsive user experience, the project can successfully meet all specified requirements within the given technological constraints. The phased roadmap ensures a manageable development process, delivering value at each stage and culminating in a powerful, customized tool that will significantly enhance the D\&D BECMI gaming experience.

#### **Works cited**

1. Project Structure | Best Practices | Php Tutorial, accessed on September 19, 2025, [https://www.swiftorial.com/tutorials/web\_development/php/best\_practices/project\_structure](https://www.swiftorial.com/tutorials/web_development/php/best_practices/project_structure)  
2. What are the best practices for building a simple PHP website in this structure?, accessed on September 19, 2025, [https://stackoverflow.com/questions/33831997/what-are-the-best-practices-for-building-a-simple-php-website-in-this-structure](https://stackoverflow.com/questions/33831997/what-are-the-best-practices-for-building-a-simple-php-website-in-this-structure)  
3. How to choose a PHP project directory structure?, accessed on September 19, 2025, [https://docs.php.earth/faq/misc/structure/](https://docs.php.earth/faq/misc/structure/)  
4. Draggable \- jQuery UI, accessed on September 19, 2025, [https://jqueryui.com/draggable/](https://jqueryui.com/draggable/)  
5. jQuery Ajax Call to PHP Script with JSON Return \- Jonathan Suh, accessed on September 19, 2025, [https://jonsuh.com/blog/jquery-ajax-call-to-php-script-with-json-return/](https://jonsuh.com/blog/jquery-ajax-call-to-php-script-with-json-return/)  
6. How to call a php function from ajax? \- Stack Overflow, accessed on September 19, 2025, [https://stackoverflow.com/questions/39341901/how-to-call-a-php-function-from-ajax](https://stackoverflow.com/questions/39341901/how-to-call-a-php-function-from-ajax)  
7. How To Optimize the Code Structure of a Simple PHP Application as Your Project Grows, accessed on September 19, 2025, [https://dev.to/dbazhenov/how-to-optimize-the-code-structure-of-a-simple-php-application-as-your-project-grows-4273](https://dev.to/dbazhenov/how-to-optimize-the-code-structure-of-a-simple-php-application-as-your-project-grows-4273)  
8. How do you efficiently connect to mysql in php without reconnecting on every query, accessed on September 19, 2025, [https://stackoverflow.com/questions/2129162/how-do-you-efficiently-connect-to-mysql-in-php-without-reconnecting-on-every-que](https://stackoverflow.com/questions/2129162/how-do-you-efficiently-connect-to-mysql-in-php-without-reconnecting-on-every-que)  
9. How to Connect MySQL Database to PHP Using MySQLi and PDO? \- Cloudways, accessed on September 19, 2025, [https://www.cloudways.com/blog/connect-mysql-with-php/](https://www.cloudways.com/blog/connect-mysql-with-php/)  
10. PHP and AJAX \- Simplify the Code \- DEV Community, accessed on September 19, 2025, [https://dev.to/supunkavinda/php-and-ajax-the-only-complete-guide-46ee](https://dev.to/supunkavinda/php-and-ajax-the-only-complete-guide-46ee)  
11. Dungeons And Dragons BECMI Rules Cyclopedia.pdf  
12. jQuery Ajax POST example with PHP \- javascript \- Stack Overflow, accessed on September 19, 2025, [https://stackoverflow.com/questions/5004233/jquery-ajax-post-example-with-php](https://stackoverflow.com/questions/5004233/jquery-ajax-post-example-with-php)  
13. jQuery UI Draggable, accessed on September 19, 2025, [https://intranet.music.indiana.edu/itr/jquery-ui/development-bundle/docs/draggable.html](https://intranet.music.indiana.edu/itr/jquery-ui/development-bundle/docs/draggable.html)  
14. Draggable Widget \- jQuery UI API Documentation, accessed on September 19, 2025, [https://api.jqueryui.com/draggable/](https://api.jqueryui.com/draggable/)  
15. Draggable Widget | jQuery UI 1.10 Documentation, accessed on September 19, 2025, [https://api.jqueryui.com/1.10/draggable/](https://api.jqueryui.com/1.10/draggable/)