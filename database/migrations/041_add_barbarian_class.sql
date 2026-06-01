-- Add Barbarian to the character class enum.
ALTER TABLE characters
MODIFY COLUMN class ENUM('fighter','magic_user','cleric','thief','dwarf','elf','halfling','druid','mystic','barbarian') NOT NULL;

