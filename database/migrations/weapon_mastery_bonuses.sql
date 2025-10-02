-- =====================================================
-- WEAPON MASTERY BONUSES REFERENCE TABLE
-- Based on BECMI Rules Cyclopedia
-- =====================================================

CREATE TABLE IF NOT EXISTS weapon_mastery_bonuses (
    mastery_rank ENUM('basic', 'skilled', 'expert', 'master', 'grand_master') PRIMARY KEY,
    to_hit_bonus INT DEFAULT 0,
    damage_bonus INT DEFAULT 0,
    ac_deflection_bonus INT DEFAULT 0,
    description TEXT
);

-- Insert mastery bonuses
INSERT INTO weapon_mastery_bonuses (mastery_rank, to_hit_bonus, damage_bonus, ac_deflection_bonus, description) VALUES
('basic', 0, 0, 0, 'No special bonuses - default proficiency'),
('skilled', 1, 1, 0, '+1 to hit and damage'),
('expert', 2, 2, 1, '+2 to hit and damage, +1 AC deflection vs this weapon'),
('master', 3, 3, 2, '+3 to hit and damage, +2 AC deflection, special maneuver available'),
('grand_master', 4, 4, 3, '+4 to hit and damage, +3 AC deflection, improved special maneuver');

-- =====================================================
-- WEAPON-SPECIFIC MASTERY EFFECTS
-- =====================================================
-- Each weapon has unique mastery special effects at Master/Grand Master level
-- 
-- Examples (to be implemented in rules engine):
-- 
-- SWORD: Parry - Can use AC deflection bonus vs one attack
-- AXE: Disarm - Can attempt to disarm opponent
-- MACE/HAMMER: Stun - Can stun opponent on hit
-- SPEAR: Set vs Charge - Double damage vs charging enemy
-- BOW: Rapid Shot - Can fire twice per round at Master+
-- DAGGER: Conceal - Easier to hide, surprise bonus
-- TWO-HANDED SWORD: Sweep - Can attack multiple adjacent enemies
-- POLE ARM: Multiple Attacks - Extra attacks at higher levels
-- 
-- These are implemented in:
-- - public/js/becmi/weapon-mastery.js
-- - app/core/weapon_mastery.php

